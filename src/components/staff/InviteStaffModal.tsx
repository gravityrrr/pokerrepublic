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
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Check-in Staff');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleInvite = async () => {
    if (!name || !email) {
      toast.error("Please fill out Name and Email.");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Call the secure RPC function created in supabase_rbac_updates.sql
      const { error } = await supabase.rpc('create_staff_user', {
        staff_email: email.trim(),
        staff_password: '123456', // Default temporary password
        staff_name: name.trim(),
        staff_role: role
      });

      if (error) throw error;
      
      toast.success(`Successfully created account for ${name}`);
      
      // Reset form
      setName('');
      setEmail('');
      setRole('Check-in Staff');
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
            <label className="input-label">Full Name</label>
            <input 
              type="text" 
              className="input-field" 
              placeholder="Sarah Staff" 
              value={name} 
              onChange={e => setName(e.target.value)} 
            />
          </div>
          
          <div className="form-group mb-4">
            <label className="input-label">Email Address</label>
            <input 
              type="email" 
              className="input-field" 
              placeholder="sarah@acespoker.com" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
            />
          </div>

          <div className="form-group mb-6">
            <label className="input-label">Assign Role</label>
            <select 
              className="input-field" 
              value={role} 
              onChange={e => setRole(e.target.value)}
            >
              <option value="Check-in Staff">Check-in Staff (Restricted)</option>
              <option value="Analyst">Analyst (Read Only Data)</option>
              <option value="Floor Admin">Floor Admin (Operations)</option>
              <option value="Manager">Manager (Operations & Settings)</option>
              <option value="Super Admin">Super Admin (Full Access)</option>
            </select>
          </div>
          
          <div className="alert-box" style={{ backgroundColor: 'var(--bg-tertiary)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem' }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              <strong>Note:</strong> The user will be assigned a default password of <code style={{color: 'var(--text-primary)'}}>123456</code>. 
              They should be advised to log in and change their password immediately.
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
