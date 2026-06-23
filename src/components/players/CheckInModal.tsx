import React, { useState, useEffect } from 'react';
import { X, Search, CheckCircle2, User } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';

interface CheckInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const CheckInModal: React.FC<CheckInModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [players, setPlayers] = useState<any[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<any | null>(null);
  const [tables, setTables] = useState<any[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchTables();
    } else {
      // Reset state on close
      setSearchQuery('');
      setPlayers([]);
      setSelectedPlayer(null);
      setSelectedTable('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (searchQuery.length >= 2) {
      searchPlayers();
    } else {
      setPlayers([]);
    }
  }, [searchQuery]);

  const fetchTables = async () => {
    const { data } = await supabase.from('poker_tables').select('*');
    if (data) setTables(data);
  };

  const searchPlayers = async () => {
    const { data } = await supabase
      .from('players')
      .select('*')
      .or(`first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,phone_number.ilike.%${searchQuery}%,member_id.ilike.%${searchQuery}%`)
      .limit(5);
    
    if (data) setPlayers(data);
  };

  const handleCheckIn = async () => {
    if (!selectedPlayer) return;
    
    setIsSubmitting(true);
    try {
      // 1. Get current admin ID
      const { data: { session } } = await supabase.auth.getSession();
      
      // 2. Check if player already has an active session
      const { data: activeSession } = await supabase
        .from('sessions')
        .select('*')
        .eq('player_id', selectedPlayer.id)
        .eq('status', 'Active')
        .single();
        
      if (activeSession) {
        toast.error(`${selectedPlayer.first_name} is already checked in!`);
        setIsSubmitting(false);
        return;
      }

      // 3. Create session (omitting cash fields since they are removed from UI)
      const { error } = await supabase.from('sessions').insert([{
        player_id: selectedPlayer.id,
        table_id: selectedTable || null,
        checked_in_by: session?.user?.id,
        status: 'Active'
      }]);

      if (error) throw error;

      toast.success(`${selectedPlayer.first_name} checked in successfully!`);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(`Check-in failed: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay animate-fade-in" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div className="modal-content animate-slide-up" style={{ width: '95%', maxWidth: '500px', backgroundColor: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', boxShadow: 'var(--shadow-xl)', border: '1px solid var(--border-color)', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
          <X size={20} />
        </button>

        <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>New Check-In</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>Search for a player to check them into the floor.</p>

        {!selectedPlayer ? (
          <div style={{ marginBottom: '2rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Search Player</label>
            <div style={{ position: 'relative' }}>
              <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Name, Phone, or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)' }}
                autoFocus
              />
            </div>

            {players.length > 0 && (
              <div style={{ marginTop: '0.5rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', overflow: 'hidden', backgroundColor: 'var(--bg-secondary)' }}>
                {players.map(p => (
                  <div 
                    key={p.id} 
                    onClick={() => setSelectedPlayer(p)}
                    style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer', borderBottom: '1px solid var(--border-color)' }}
                    className="table-row-hover"
                  >
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {p.profile_image_url ? (
                        <img src={p.profile_image_url} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                      ) : (
                        <User size={16} color="var(--text-muted)" />
                      )}
                    </div>
                    <div>
                      <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{p.first_name} {p.last_name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{p.member_id || p.phone_number}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {searchQuery.length >= 2 && players.length === 0 && (
              <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                No players found matching "{searchQuery}"
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2rem' }}>
            <div style={{ padding: '1rem', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--accent-primary)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {selectedPlayer.profile_image_url ? (
                    <img src={selectedPlayer.profile_image_url} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <User size={20} color="var(--text-muted)" />
                  )}
                </div>
                <div>
                  <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{selectedPlayer.first_name} {selectedPlayer.last_name}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{selectedPlayer.member_id}</div>
                </div>
              </div>
              <button onClick={() => setSelectedPlayer(null)} style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontSize: '0.85rem', cursor: 'pointer' }}>
                Change
              </button>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Assign Table (Optional)</label>
              <select 
                value={selectedTable} 
                onChange={(e) => setSelectedTable(e.target.value)}
                style={{ width: '100%', padding: '0.75rem 1rem', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)' }}
              >
                <option value="">No specific table (Lobby/Floor)</option>
                {tables.map(t => (
                  <option key={t.id} value={t.id}>{t.name} ({t.stakes})</option>
                ))}
              </select>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button 
            onClick={handleCheckIn} 
            className="btn-primary" 
            disabled={!selectedPlayer || isSubmitting}
            style={{ opacity: (!selectedPlayer || isSubmitting) ? 0.5 : 1 }}
          >
            {isSubmitting ? 'Processing...' : (
              <>
                <CheckCircle2 size={18} />
                Confirm Check-In
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CheckInModal;
