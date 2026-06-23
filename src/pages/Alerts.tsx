import React from 'react';
import { Bell, AlertTriangle, Info, CheckCircle2 } from 'lucide-react';

const Alerts: React.FC = () => {
  // In a real implementation, these would be fetched from Supabase
  const alerts = [
    { id: 1, type: 'warning', title: 'High Table Wait Time', message: 'Table 4 (NLH 2/5) has 8 players waiting.', time: '10 mins ago' },
    { id: 2, type: 'info', title: 'Staff Shift Change', message: 'Floor Admin Sarah is logging off.', time: '25 mins ago' },
    { id: 3, type: 'success', title: 'System Maintenance', message: 'Database backup completed successfully.', time: '2 hours ago' },
  ];

  const getIcon = (type: string) => {
    switch (type) {
      case 'warning': return <AlertTriangle size={24} className="text-warning" style={{ color: 'var(--accent-warning)' }} />;
      case 'success': return <CheckCircle2 size={24} className="text-success" style={{ color: 'var(--accent-success)' }} />;
      default: return <Info size={24} className="text-primary" style={{ color: 'var(--accent-primary)' }} />;
    }
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
                borderLeft: `4px solid var(--accent-${alert.type === 'warning' ? 'warning' : alert.type === 'success' ? 'success' : 'primary'})`
              }}>
                <div style={{ flexShrink: 0 }}>
                  {getIcon(alert.type)}
                </div>
                <div style={{ flexGrow: 1 }}>
                  <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1rem', color: 'var(--text-primary)' }}>{alert.title}</h3>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{alert.message}</p>
                </div>
                <div style={{ flexShrink: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {alert.time}
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
