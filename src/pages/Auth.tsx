import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { User, ArrowLeft, Mail } from 'lucide-react';
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
    
    // Automatically convert username to fake email if they didn't provide an @ symbol
    const loginEmail = email.includes('@') ? email : `${email.toLowerCase().replace(/\s+/g, '')}@poker.local`;
    
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password
    });
    
    if (signInError) {
      let errorMsg = signInError.message || 'Failed to sign in';
      // Sometimes Supabase returns an empty JSON object string "{}" for certain failures
      if (errorMsg === '{}' || errorMsg === '[object Object]') {
        errorMsg = 'Invalid login credentials or user does not exist.';
      }
      
      toast.error(errorMsg);
      setError(errorMsg);
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
      <div className="auth-card glass-panel" style={{ position: 'relative', borderTop: `4px solid ${isStaff ? 'var(--accent-primary)' : 'var(--accent-danger)'}`}}>
        <button 
          onClick={() => navigate('/auth')}
          style={{ position: 'absolute', top: '1rem', left: '1rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.5rem', borderRadius: 'var(--radius-full)' }}
          className="icon-btn"
          title="Back to Selection"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="auth-header">
          <div className="auth-logo-img-container" style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
            <img src="/logo.png" alt="Poker Republic" style={{ height: '60px', objectFit: 'contain' }} />
          </div>
          <h1 className="auth-title" style={{ fontSize: '1.5rem', marginBottom: '0.2rem' }}>Poker Republic</h1>
          <p className="auth-subtitle">{isStaff ? 'Staff Check-in Portal' : 'Admin Operations'}</p>
        </div>

        {error && <div style={{ color: 'var(--accent-danger)', marginBottom: '1rem', textAlign: 'center', fontSize: '0.9rem' }}>{error}</div>}

        <form onSubmit={handleLogin} className="auth-form">
          <div className="form-group mb-4">
            <label className="input-label">Username</label>
            <div style={{ position: 'relative' }}>
              <User size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                className="input-field" 
                placeholder={isStaff ? "e.g. staff1" : "e.g. admin1"} 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ paddingLeft: '2.75rem' }}
                required
              />
            </div>
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
