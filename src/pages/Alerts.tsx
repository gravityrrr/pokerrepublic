import React, { useState, useEffect } from 'react';
import { Bell, AlertTriangle, Info, CheckCircle2 } from 'lucide-react';

import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

const Alerts: React.FC = () => {
  const [alerts, setAlerts] = useState<any[]>([]);

  useEffect(() => {
    fetchAlerts();

    const channel = supabase
      .channel('public:alerts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'alerts' }, payload => {
        setAlerts(prev => [payload.new, ...prev]);
        toast(payload.new.title, { description: payload.new.description });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'alerts' }, payload => {
        setAlerts(prev => prev.map(a => a.id === payload.new.id ? payload.new : a));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchAlerts = async () => {
    const { data, error } = await supabase
      .from('alerts')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Failed to fetch alerts:', error);
    } else if (data) {
      setAlerts(data);
    }
  };

  const getIcon = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'warning': return <AlertTriangle size={24} className="text-warning" style={{ color: 'var(--accent-warning)' }} />;
      case 'critical': return <AlertTriangle size={24} className="text-warning" style={{ color: '#ef4444' }} />;
      case 'success': return <CheckCircle2 size={24} className="text-success" style={{ color: 'var(--accent-success)' }} />;
      default: return <Info size={24} className="text-primary" style={{ color: 'var(--accent-primary)' }} />;
    }
  };

  const markResolved = async (id: string) => {
    await supabase.from('alerts').update({ is_resolved: true, resolved_at: new Date().toISOString() }).eq('id', id);
  };

  return (
    <div className="alerts-container page-container">
      <div className="page-header">
        <h1 className="page-title">System Alerts</h1>
        <p className="text-muted">Recent notifications and warnings from the floor.</p>
      </div>

      <div className="glass-panel" style={{ padding: '2rem' }}>
        {alerts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
            <Bell size={48} style={{ opacity: 0.5, marginBottom: '1rem' }} />
            <p>No new alerts.</p>
          </div>
        ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {alerts.map(alert => (
                <div key={alert.id} style={{ 
                  display: 'flex', 
                  gap: '1rem', 
                  padding: '1rem', 
                  backgroundColor: 'var(--bg-secondary)', 
                  borderRadius: 'var(--radius-md)',
                  borderLeft: `4px solid var(--accent-${alert.severity?.toLowerCase() === 'warning' || alert.severity?.toLowerCase() === 'critical' ? 'warning' : 'primary'})`,
                  opacity: alert.is_resolved ? 0.6 : 1
                }}>
                  <div style={{ flexShrink: 0 }}>
                    {getIcon(alert.severity)}
                  </div>
                  <div style={{ flexGrow: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1rem', color: 'var(--text-primary)' }}>
                        {alert.title} 
                        {alert.is_resolved && <span style={{ marginLeft: '0.5rem', fontSize: '0.7rem', backgroundColor: 'var(--bg-tertiary)', padding: '2px 6px', borderRadius: '4px' }}>Resolved</span>}
                      </h3>
                      {!alert.is_resolved && (
                        <button 
                          onClick={() => markResolved(alert.id)}
                          style={{ background: 'none', border: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.75rem', padding: '0.25rem 0.5rem', borderRadius: '4px', cursor: 'pointer' }}
                        >
                          Mark Resolved
                        </button>
                      )}
                    </div>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{alert.description}</p>
                  </div>
                  <div style={{ flexShrink: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))}
            </div>
        )}
      </div>
    </div>
  );
};

export default Alerts;
