import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import './Auth.css';

interface AuthProps {
  type: 'staff' | 'admin';
}

const AuthPage: React.FC<AuthProps> = ({ type }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    // Automatically append domain if user just types 'staff1' or 'admin'
    const loginEmail = email.includes('@') ? email : `${email}@pokerrepublic.com`;
    
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password
    });
    
    if (signInError) {
      toast.error(signInError.message || 'Failed to sign in');
      setError(signInError.message);
      setLoading(false);
      return;
    }
    
    toast.success('Successfully signed in');
    
    // AuthContext will automatically pick up the session change
    setLoading(false);
    navigate('/');
  };

  const isStaff = type === 'staff';

  return (
    <div className={`auth-container ${isStaff ? 'auth-staff-bg' : 'auth-admin-bg'}`}>
      <div className="auth-card glass-panel" style={{ borderTop: `4px solid ${isStaff ? 'var(--accent-success)' : 'var(--accent-vip)'}`}}>
        <div className="auth-header">
          <div className="auth-logo-img-container" style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
            <img src="/logo.png" alt="Poker Republic" style={{ height: '60px', objectFit: 'contain' }} />
          </div>
          <h1 className="auth-title" style={{ fontSize: '1.5rem', marginBottom: '0.2rem' }}>Poker Republic</h1>
          <p className="auth-subtitle">{isStaff ? 'Staff Check-in Portal' : 'Admin Operations'}</p>
        </div>

        {error && <div style={{ color: 'var(--accent-danger)', marginBottom: '1rem', textAlign: 'center', fontSize: '0.9rem' }}>{error}</div>}

        <form onSubmit={handleLogin} className="auth-form">
          <div className="form-group">
            <label className="input-label">Email Address</label>
            <input 
              type="email" 
              className="input-field" 
              placeholder="admin@acespoker.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          
          <div className="form-group">
            <label className="input-label">Password</label>
            <input 
              type="password" 
              className="input-field" 
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn-primary auth-submit" disabled={loading}>
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>
        
        <div className="auth-footer">
          <p>Protected by Supabase</p>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
