import React, { useState } from 'react';
import { Club } from 'lucide-react';
import { supabase } from '../lib/supabase';
import './Auth.css';

const AuthPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }
    
    // AuthContext will automatically pick up the session change
    setLoading(false);
  };

  return (
    <div className="auth-container">
      <div className="auth-card card animate-slide-up">
        <div className="auth-header">
          <div className="auth-logo">
            <Club size={48} className="text-primary" />
          </div>
          <h1 className="auth-title">Aces Admin Portal</h1>
          <p className="auth-subtitle">Authorized personnel only</p>
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
