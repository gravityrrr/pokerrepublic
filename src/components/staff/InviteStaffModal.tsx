import React, { useState } from 'react';
import { X, Save, Shield } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const InviteStaffModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'Staff' | 'Admin'>('Staff');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleInvite = async () => {
    if (!username || !password) {
      toast.error("Please fill out Username and Password.");
      return;
    }
    
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Create a fake email behind the scenes for Supabase Auth
      const fakeEmail = `${username.toLowerCase().replace(/\s+/g, '')}@poker.local`;

      // We bypass the RPC and use the native Supabase REST API to sign up the user.
      // This guarantees the password hash and metadata are 100% perfect for GoTrue,
      // without logging the current Admin out of their session.
      const { data: sessionData } = await supabase.auth.getSession();
      
      // Get the Supabase URL and Anon Key from the client instance
      // @ts-ignore
      const supabaseUrl = supabase.supabaseUrl;
      // @ts-ignore
      const supabaseKey = supabase.supabaseKey;

      const response = await fetch(`${supabaseUrl}/auth/v1/signup`, {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: fakeEmail,
          password: password,
          data: {
            full_name: username,
            role: role
          }
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.msg || errData.message || 'Failed to create staff account');
      }
      
      toast.success(`Successfully created account for ${username}`);
      
      // Reset form
      setUsername('');
      setPassword('');
      onSuccess();
      onClose();
      
    } catch (err: any) {
      toast.error(err.message || 'Failed to create staff account');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay animate-fade-in" style={{ zIndex: 100 }}>
      <div className="modal-content animate-slide-up" style={{ maxWidth: '500px' }}>
        <div className="modal-header">
          <h2><Shield size={20} className="mr-2 inline text-accent" /> Invite Staff Member</h2>
          <button className="icon-btn" onClick={onClose}><X size={20} /></button>
        </div>
        
        <div className="modal-body">
          <div className="form-group mb-4">
            <label className="input-label">Staff Username</label>
            <input 
              type="text" 
              className="input-field" 
              placeholder="e.g. staff1" 
              value={username} 
              onChange={e => setUsername(e.target.value)} 
            />
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>They will use this username to log in.</p>
          </div>

          <div className="form-group mb-4">
            <label className="input-label">Password</label>
            <input 
              type="text" 
              className="input-field" 
              placeholder="Enter a secure password..." 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
            />
          </div>

          <div className="form-group mb-4">
            <label className="input-label">Account Role</label>
            <select 
              className="input-field" 
              value={role} 
              onChange={e => setRole(e.target.value as 'Staff' | 'Admin')}
              style={{ padding: '0.75rem', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', cursor: 'pointer' }}
            >
              <option value="Staff">Staff</option>
              <option value="Admin">Admin</option>
            </select>
          </div>
          
          <div className="alert-box" style={{ backgroundColor: 'var(--bg-tertiary)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem' }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              <strong>Note:</strong> Make sure to communicate this password to the staff member so they can log in.
            </p>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose} disabled={isSubmitting}>Cancel</button>
          <button className="btn-primary" onClick={handleInvite} disabled={isSubmitting}>
            <Save size={18} className="mr-2" />
            {isSubmitting ? 'Creating...' : 'Create Account'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default InviteStaffModal;
