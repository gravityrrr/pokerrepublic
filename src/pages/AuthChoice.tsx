import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Club } from 'lucide-react';

const AuthChoice: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="auth-container" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="auth-card glass-panel" style={{ textAlign: 'center', padding: '3rem' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <img src="/logo.png" alt="Poker Republic" style={{ height: '80px', objectFit: 'contain' }} />
        </div>
        <h1 className="auth-title" style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>Poker Republic</h1>
        <p className="auth-subtitle" style={{ marginBottom: '2.5rem' }}>Select your portal to continue</p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <button 
            onClick={() => navigate('/auth/staff')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '1rem',
              padding: '1.25rem',
              backgroundColor: 'var(--accent-primary)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              fontSize: '1.1rem',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <Club size={24} />
            Staff Check-in Portal
          </button>
          
          <button 
            onClick={() => navigate('/auth/admin')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '1rem',
              padding: '1.25rem',
              backgroundColor: 'var(--accent-danger)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              fontSize: '1.1rem',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <ShieldCheck size={24} />
            Admin Operations
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthChoice;
