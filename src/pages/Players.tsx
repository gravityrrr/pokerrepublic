import React, { useState, useEffect } from 'react';
import { Search, UserPlus, MoreVertical, Edit, Info } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import PlayerRegistrationModal from '../components/players/PlayerRegistrationModal';
import PlayerIDCardModal from '../components/players/PlayerIDCardModal';
import { toast } from 'sonner';
import './Players.css';

const Players: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isRegistrationOpen, setIsRegistrationOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<any | null>(null);
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
      
    if (error) {
      toast.error("Failed to fetch players: " + error.message);
    }
      
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
                  onClick={() => setSelectedPlayer(player)}
                  style={{ cursor: 'pointer' }}
                >
                  <td data-label="Player">
                    <div className="player-cell">
                      {player.profile_image_url ? (
                        <img src={player.profile_image_url} alt={player.first_name} style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} />
                      ) : (
                        <div className="avatar">
                          {player.first_name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <div className="player-name">{player.first_name} {player.last_name}</div>
                        <div className="player-phone text-muted">{player.phone_number}</div>
                      </div>
                    </div>
                  </td>
                  <td data-label="ID Number">
                    <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      {player.member_id || 'PENDING'}
                    </span>
                  </td>
                  <td data-label="Status">
                    <div className="status-cell">
                      <span className="status-indicator status-active"></span>
                      <span>Verified</span>
                    </div>
                  </td>
                  <td data-label="Loyalty">
                    <span className={`badge ${player.loyaltyScore > 100 ? 'badge-vip' : 'badge-regular'}`}>
                      {player.loyaltyScore > 100 ? 'VIP Member' : 'Standard'}
                    </span>
                  </td>
                  <td data-label="Joined">
                    <div className="text-muted">
                      {new Date(player.created_at).toLocaleDateString()}
                    </div>
                  </td>
                  <td data-label="Actions">
                    <div className="actions-cell">
                      <button className="icon-btn" title="View Details"><Info size={16} /></button>
                      <button className="icon-btn" title="Edit Player"><Edit size={16} /></button>
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

      <PlayerIDCardModal
        isOpen={!!selectedPlayer}
        onClose={() => setSelectedPlayer(null)}
        player={selectedPlayer}
      />
    </div>
  );
};

export default Players;
