import React, { useState, useEffect } from 'react';
import { Search, Filter, UserPlus, MoreVertical, Edit, ShieldAlert } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import PlayerRegistrationModal from '../components/players/PlayerRegistrationModal';
import './Players.css';

const Players: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isRegistrationOpen, setIsRegistrationOpen] = useState(false);
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  useEffect(() => {
    fetchPlayers();

    const channel = supabase
      .channel('public:players')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players' }, payload => {
        if (payload.eventType === 'INSERT') {
          setPlayers(prev => [payload.new, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          setPlayers(prev => prev.map(p => p.id === payload.new.id ? payload.new : p));
        } else if (payload.eventType === 'DELETE') {
          setPlayers(prev => prev.filter(p => p.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchPlayers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (data && !error) {
      setPlayers(data);
    }
    setLoading(false);
  };

  const filteredPlayers = players.filter(p => 
    p.first_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.phone_number.includes(searchQuery)
  );

  return (
    <div className="players-container animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Player Directory</h1>
          <p className="page-subtitle">Manage registrations, check-ins, and player analytics</p>
        </div>
        <button className="btn-primary" onClick={() => setIsRegistrationOpen(true)}>
          <UserPlus size={18} />
          Register New Player
        </button>
      </div>

      <div className="card filters-card">
        <div className="filters-container">
          <div className="search-box">
            <Search size={18} className="search-icon" />
            <input 
              type="text" 
              placeholder="Search by name, phone, or ID..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input-large"
            />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button 
              className={`btn-secondary ${viewMode === 'table' ? 'btn-primary' : ''}`}
              onClick={() => setViewMode('table')}
              style={{ margin: 0 }}
            >
              Table View
            </button>
            <button 
              className={`btn-secondary ${viewMode === 'cards' ? 'btn-primary' : ''}`}
              onClick={() => setViewMode('cards')}
              style={{ margin: 0 }}
            >
              ID Cards
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'table' ? (
      <div className="card table-card animate-slide-up">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Player</th>
                <th>Status / Location</th>
                <th>Tags</th>
                <th>Last Visit</th>
                <th>Loyalty Score</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{textAlign: 'center', padding: '2rem'}}>Loading players...</td></tr>
              ) : filteredPlayers.length === 0 ? (
                <tr><td colSpan={6} style={{textAlign: 'center', padding: '2rem'}}>No players found.</td></tr>
              ) : filteredPlayers.map((player, idx) => (
                <motion.tr 
                  key={player.id} 
                  className="table-row-hover"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <td>
                    <div className="player-cell">
                      <div className="avatar">{player.first_name.charAt(0)}</div>
                      <div>
                        <div className="player-name">{player.first_name} {player.last_name}</div>
                        <div className="player-phone">{player.phone_number}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="text-muted">Offline</span>
                  </td>
                  <td>
                    <div className="tags-cell">
                      <span className={`badge badge-new`}>New</span>
                    </div>
                  </td>
                  <td>{new Date(player.created_at).toLocaleDateString()}</td>
                  <td>
                    <div className="score-cell">
                      <div className="score-bar-bg">
                        <div className="score-bar-fill" style={{ width: `${player.loyaltyScore || 0}%`, backgroundColor: 'var(--accent-primary)' }}></div>
                      </div>
                      <span>{player.loyaltyScore || 0}</span>
                    </div>
                  </td>
                  <td>
                    <div className="actions-cell">
                      <button className="icon-btn" title="Edit Player"><Edit size={16} /></button>
                      <button className="icon-btn" title="Add Alert"><ShieldAlert size={16} /></button>
                      <button className="icon-btn" title="More"><MoreVertical size={16} /></button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      ) : (
      <div className="id-cards-grid animate-fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem', marginTop: '1.5rem' }}>
        {loading ? (
          <div style={{textAlign: 'center', gridColumn: '1/-1', padding: '2rem'}}>Loading players...</div>
        ) : filteredPlayers.length === 0 ? (
          <div style={{textAlign: 'center', gridColumn: '1/-1', padding: '2rem'}}>No players found.</div>
        ) : filteredPlayers.map((player, idx) => (
          <motion.div 
            key={player.id}
            className="id-card glass-panel"
            style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)', borderTop: '4px solid var(--accent-primary)', position: 'relative', overflow: 'hidden' }}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.05 }}
          >
            <div style={{ position: 'absolute', top: '-20px', right: '-20px', opacity: 0.05, pointerEvents: 'none' }}>
              <img src="/logo.png" alt="watermark" style={{ width: '150px' }} />
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              <div>
                <img src="/logo.png" alt="Poker Republic" style={{ height: '30px', marginBottom: '0.5rem' }} />
                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)' }}>Official Member</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>ID Number</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '2px' }}>{player.member_id || 'PENDING'}</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
              {player.profile_image_url ? (
                <img src={player.profile_image_url} alt={player.first_name} style={{ width: '80px', height: '80px', borderRadius: 'var(--radius-md)', objectFit: 'cover', border: '2px solid var(--border-color)' }} />
              ) : (
                <div style={{ width: '80px', height: '80px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', color: 'var(--text-muted)', border: '2px solid var(--border-color)' }}>
                  {player.first_name.charAt(0)}
                </div>
              )}
              
              <div>
                <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.25rem' }}>{player.first_name} {player.last_name}</h3>
                <p style={{ margin: '0 0 0.5rem 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{player.phone_number}</p>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <span className="badge badge-success">Verified</span>
                  {player.loyaltyScore > 100 && <span className="badge badge-vip">VIP</span>}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
      )}
      
      <PlayerRegistrationModal 
        isOpen={isRegistrationOpen} 
        onClose={() => setIsRegistrationOpen(false)} 
      />
    </div>
  );
};

export default Players;
