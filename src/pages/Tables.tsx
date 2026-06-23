import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { Search, LogIn, LogOut, Clock, User, Shield } from 'lucide-react';
import './Dashboard.css';

const Tables: React.FC = () => {
  const [players, setPlayers] = useState<any[]>([]);
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    fetchData();

    // Timer to update durations every minute
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);

    // Realtime subscriptions
    const sessionChannel = supabase
      .channel('tables_sessions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      clearInterval(timer);
      supabase.removeChannel(sessionChannel);
    };
  }, []);

  const fetchData = async () => {
    setLoading(true);
    
    const [playersRes, sessionsRes] = await Promise.all([
      supabase.from('players').select('*').order('first_name', { ascending: true }),
      supabase.from('sessions').select('*').eq('status', 'Active')
    ]);

    if (playersRes.error) toast.error('Failed to fetch players');
    if (sessionsRes.error) toast.error('Failed to fetch sessions');

    if (playersRes.data) setPlayers(playersRes.data);
    if (sessionsRes.data) setActiveSessions(sessionsRes.data);
    
    setLoading(false);
  };

  const handleCheckIn = async (playerId: string, playerName: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    const { error } = await supabase.from('sessions').insert([{
      player_id: playerId,
      checked_in_by: session?.user?.id,
      status: 'Active'
    }]);

    if (error) {
      toast.error('Failed to check in: ' + error.message);
    } else {
      toast.success(`${playerName} checked in successfully!`);
      // Local state update for immediate feedback
      fetchData();
    }
  };

  const handleCheckOut = async (sessionId: string, checkInTime: string, playerName: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    const durationMins = Math.round((new Date().getTime() - new Date(checkInTime).getTime()) / 60000);
    
    const { error } = await supabase.from('sessions').update({
      status: 'Completed',
      check_out_time: new Date().toISOString(),
      checked_out_by: session?.user?.id,
      duration_minutes: durationMins
    }).eq('id', sessionId);

    if (error) {
      toast.error('Failed to check out: ' + error.message);
    } else {
      toast.info(`${playerName} checked out. Duration: ${durationMins} mins.`);
      fetchData();
    }
  };

  // Compute derived state
  const activePlayerIds = new Set(activeSessions.map(s => s.player_id));
  
  const playingMembers = players
    .filter(p => activePlayerIds.has(p.id))
    .map(p => {
      const session = activeSessions.find(s => s.player_id === p.id);
      return { ...p, session };
    })
    .sort((a, b) => new Date(b.session.check_in_time).getTime() - new Date(a.session.check_in_time).getTime());

  const availableMembers = players
    .filter(p => !activePlayerIds.has(p.id))
    .filter(p => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      const fullName = `${p.first_name} ${p.last_name}`.toLowerCase();
      return fullName.includes(q) || (p.member_id && p.member_id.toLowerCase().includes(q)) || p.phone_number.includes(q);
    });

  const getDurationString = (checkInIso: string) => {
    const diffMins = Math.max(0, Math.round((currentTime.getTime() - new Date(checkInIso).getTime()) / 60000));
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Table & Floor Operations</h1>
          <p className="page-subtitle">Manage active players and fast check-ins</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem', marginTop: '1rem' }}>
        
        {/* Active Members Column */}
        <div className="card animate-slide-up" style={{ animationDelay: '0.1s', display: 'flex', flexDirection: 'column' }}>
          <div className="section-header" style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
            <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="status-indicator status-active"></span>
              Currently Playing ({playingMembers.length})
            </h3>
          </div>
          
          <div style={{ flexGrow: 1, overflowY: 'auto', maxHeight: 'calc(100vh - 250px)', paddingRight: '0.5rem' }}>
            {loading ? (
              <p className="text-muted text-center py-4">Loading active sessions...</p>
            ) : playingMembers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
                <Clock size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                <p>The floor is empty.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {playingMembers.map(player => (
                  <div key={player.id} style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    padding: '1rem', 
                    backgroundColor: 'var(--bg-secondary)', 
                    borderRadius: 'var(--radius-md)',
                    borderLeft: '4px solid var(--accent-success)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--bg-tertiary)', overflow: 'hidden', flexShrink: 0 }}>
                        {player.profile_image_url ? (
                          <img src={player.profile_image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <User size={20} color="var(--text-muted)" />
                          </div>
                        )}
                      </div>
                      <div>
                        <h4 style={{ margin: '0 0 0.25rem 0', color: 'var(--text-primary)' }}>{player.first_name} {player.last_name}</h4>
                        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Shield size={12} /> {player.member_id || 'PENDING'}</span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--accent-success)' }}><Clock size={12} /> {getDurationString(player.session.check_in_time)}</span>
                        </div>
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => handleCheckOut(player.session.id, player.session.check_in_time, player.first_name)}
                      className="btn-secondary"
                      style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#fca5a5', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                    >
                      <LogOut size={16} /> Check Out
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Rapid Check-in Column */}
        <div className="card animate-slide-up" style={{ animationDelay: '0.2s', display: 'flex', flexDirection: 'column' }}>
          <div className="section-header" style={{ marginBottom: '1rem' }}>
            <h3 className="section-title">Available Players ({availableMembers.length})</h3>
          </div>
          
          <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
            <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search by Name, Phone, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)' }}
            />
          </div>

          <div style={{ flexGrow: 1, overflowY: 'auto', maxHeight: 'calc(100vh - 320px)', paddingRight: '0.5rem' }}>
            {loading ? (
              <p className="text-muted text-center py-4">Loading players...</p>
            ) : availableMembers.length === 0 ? (
              <p className="text-muted text-center py-4">No matching players found.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {availableMembers.map(player => (
                  <div key={player.id} className="table-row-hover" style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    padding: '0.75rem 1rem', 
                    backgroundColor: 'var(--bg-secondary)', 
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid transparent'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--bg-tertiary)', overflow: 'hidden', flexShrink: 0 }}>
                        {player.profile_image_url ? (
                          <img src={player.profile_image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <User size={16} color="var(--text-muted)" />
                          </div>
                        )}
                      </div>
                      <div>
                        <h4 style={{ margin: '0 0 0.25rem 0', color: 'var(--text-primary)', fontSize: '0.95rem' }}>{player.first_name} {player.last_name}</h4>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {player.member_id || player.phone_number}
                        </div>
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => handleCheckIn(player.id, player.first_name)}
                      className="btn-primary"
                      style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
                    >
                      <LogIn size={14} /> Check In
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Tables;
