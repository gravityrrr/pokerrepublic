import React, { useState, useEffect } from 'react';
import { Search, UserPlus, MoreVertical, Edit, Info, Download } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import PlayerRegistrationModal from '../components/players/PlayerRegistrationModal';
import PlayerIDCardModal from '../components/players/PlayerIDCardModal';
import { toast } from 'sonner';
import { exportToCsv } from '../utils/exportCsv';
import { AuthContext } from '../App';
import './Players.css';

const Players: React.FC = () => {
  const { role } = React.useContext(AuthContext);
  const [searchQuery, setSearchQuery] = useState('');
  const [isRegistrationOpen, setIsRegistrationOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<any | null>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [activeSessions, setActiveSessions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlayers();
    fetchActiveSessions();

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

    const sessionChannel = supabase
      .channel('public:sessions_players')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, () => {
        fetchActiveSessions();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(sessionChannel);
    };
  }, []);

  const fetchActiveSessions = async () => {
    const { data } = await supabase.from('sessions').select('player_id').eq('status', 'Active');
    if (data) {
      setActiveSessions(new Set(data.map(s => s.player_id)));
    }
  };

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

  const handleExportPlayerHistory = async (playerId: string, playerName: string) => {
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select('*, poker_tables(name)')
        .eq('player_id', playerId)
        .order('check_in_time', { ascending: false });

      if (error) throw error;
      
      if (!data || data.length === 0) {
        toast.info(`No session history found for ${playerName}`);
        return;
      }

      const formattedData = data.map(session => ({
        'Player Name': playerName,
        'Table Name': session.poker_tables?.name || 'Unknown Table',
        'Check In': new Date(session.check_in_time).toLocaleString(),
        'Check Out': session.check_out_time ? new Date(session.check_out_time).toLocaleString() : 'Active',
        'Duration (Mins)': session.duration_minutes || '-',
        'Status': session.status
      }));

      exportToCsv(`${playerName.replace(/\s+/g, '_')}_Session_History`, formattedData);
      toast.success(`Exported session history for ${playerName}`);
    } catch (err: any) {
      toast.error(`Failed to export history: ${err.message}`);
    }
  };

  const filteredPlayers = players.filter(p => {
    const fullName = `${p.first_name} ${p.last_name}`.toLowerCase();
    const query = searchQuery.toLowerCase();
    return fullName.includes(query) || 
           p.phone_number.includes(searchQuery) ||
           (p.member_id && p.member_id.toLowerCase().includes(query));
  });

  return (
    <div className="players-container animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Player Directory</h1>
          <p className="page-subtitle">Manage registrations, check-ins, and player analytics</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          {role === 'Super Admin' && players.length > 0 && (
            <button 
              className="btn-secondary"
              onClick={() => exportToCsv('players_directory_export', players)}
            >
              Export CSV
            </button>
          )}
          <button className="btn-primary" onClick={() => setIsRegistrationOpen(true)}>
            <UserPlus size={18} />
            Register New Player
          </button>
        </div>
      </div>

      <div className="toolbar glass-panel">
        <div className="search-bar" style={{ position: 'relative' }}>
          <Search size={18} className="search-icon" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
          <input 
            type="text" 
            placeholder="Search by name, phone, or ID..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field"
            style={{ paddingLeft: '2.75rem', width: '100%' }}
          />
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
                      <span className={`status-indicator ${activeSessions.has(player.id) ? 'status-active' : 'status-offline'}`} style={{ backgroundColor: activeSessions.has(player.id) ? 'var(--accent-success)' : 'var(--text-muted)' }}></span>
                      <span>{activeSessions.has(player.id) ? 'Currently Playing' : 'Offline'}</span>
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
                      {role === 'Super Admin' && (
                        <button 
                          className="icon-btn" 
                          title="Export Session History"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleExportPlayerHistory(player.id, `${player.first_name} ${player.last_name}`);
                          }}
                        >
                          <Download size={16} />
                        </button>
                      )}
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
