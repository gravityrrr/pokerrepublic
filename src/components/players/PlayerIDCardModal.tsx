import React from 'react';
import { X, Award, Shield, User } from 'lucide-react';

interface PlayerIDCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: any | null;
}

const PlayerIDCardModal: React.FC<PlayerIDCardModalProps> = ({ isOpen, onClose, player }) => {
  if (!isOpen || !player) return null;

  const isVIP = player.loyaltyScore > 100;
  const cardGradient = isVIP 
    ? 'linear-gradient(135deg, #1a1500 0%, #3d3100 50%, #1a1500 100%)' 
    : 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)';
    
  const borderGradient = isVIP
    ? 'linear-gradient(135deg, #ffd700, #b8860b)'
    : 'linear-gradient(135deg, var(--accent-primary), #3b82f6)';

  return (
    <div className="modal-overlay animate-fade-in" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      {/* Invisible backdrop to click to close */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} onClick={onClose}></div>
      
      <div 
        className="premium-card-container animate-slide-up"
        style={{
          position: 'relative',
          width: '400px',
          height: '600px',
          background: borderGradient,
          padding: '2px', // This creates the gradient border
          borderRadius: '24px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.75)'
        }}
      >
        <button 
          onClick={onClose}
          style={{ 
            position: 'absolute', top: '-15px', right: '-15px', zIndex: 10,
            background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', 
            color: 'white', borderRadius: '50%', width: '36px', height: '36px', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            boxShadow: 'var(--shadow-md)'
          }}
        >
          <X size={20} />
        </button>

        <div 
          style={{
            background: cardGradient,
            width: '100%',
            height: '100%',
            borderRadius: '22px',
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {/* Subtle watermark logo in background */}
          <img 
            src="/logo.png" 
            alt="" 
            style={{ 
              position: 'absolute', 
              top: '50%', 
              left: '50%', 
              transform: 'translate(-50%, -50%)', 
              opacity: 0.03, 
              width: '120%', 
              pointerEvents: 'none' 
            }} 
          />

          {/* Header */}
          <div style={{ padding: '2rem 2rem 1rem 2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <img src="/logo.png" alt="Poker Republic" style={{ height: '55px', marginBottom: '0.75rem' }} />
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '2px', color: isVIP ? '#ffd700' : 'var(--text-muted)' }}>
              {isVIP ? 'VIP Member' : 'Official Member'}
            </div>
            {isVIP && <Award size={24} color="#ffd700" style={{ marginTop: '0.5rem' }} />}
          </div>

          {/* Photo & Identity */}
          <div style={{ padding: '2rem', flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.5rem' }}>
            <div 
              style={{
                width: '180px',
                height: '180px',
                borderRadius: '50%',
                background: borderGradient,
                padding: '5px',
                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)'
              }}
            >
              {player.profile_image_url ? (
                <img 
                  src={player.profile_image_url} 
                  alt={player.first_name} 
                  style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} 
                />
              ) : (
                <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <User size={80} color="var(--text-muted)" />
                </div>
              )}
            </div>

            <div style={{ textAlign: 'center' }}>
              <h2 style={{ fontSize: '1.6rem', margin: '0 0 0.5rem 0', color: 'white', textTransform: 'uppercase', letterSpacing: '1px' }}>
                {player.first_name} {player.last_name}
              </h2>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.1)', padding: '0.5rem 1rem', borderRadius: '20px' }}>
                <Shield size={16} color={isVIP ? '#ffd700' : 'var(--text-muted)'} />
                <span style={{ fontSize: '1rem', color: 'white', letterSpacing: '2px', fontFamily: 'monospace' }}>
                  {player.member_id || 'PENDING'}
                </span>
              </div>
            </div>
          </div>

          {/* Footer Metadata */}
          <div style={{ padding: '2rem', background: 'rgba(0,0,0,0.3)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.25rem' }}>Member Since</div>
              <div style={{ color: 'white', fontSize: '0.9rem' }}>{new Date(player.created_at).getFullYear()}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.25rem' }}>Loyalty Level</div>
              <div style={{ color: isVIP ? '#ffd700' : 'white', fontSize: '0.9rem', fontWeight: 'bold' }}>{player.loyaltyScore > 100 ? 'GOLD' : 'STANDARD'}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayerIDCardModal;
