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
          <button className="btn-secondary filter-btn">
            <Filter size={18} />
            Filters
          </button>
        </div>
      </div>

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
      
      <PlayerRegistrationModal 
        isOpen={isRegistrationOpen} 
        onClose={() => setIsRegistrationOpen(false)} 
      />
    </div>
  );
};

export default Players;
