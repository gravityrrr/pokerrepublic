import React, { useState, useEffect, useContext } from 'react';
import { Key, Save, Upload, User } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { AuthContext } from '../App';

const Settings: React.FC = () => {
  const { session } = useContext(AuthContext);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profilePic, setProfilePic] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (session?.user?.id) {
      fetchProfile();
    }
  }, [session]);

  const fetchProfile = async () => {
    const { data } = await supabase.from('admins').select('avatar_url').eq('id', session.user.id).single();
    if (data?.avatar_url) {
      setProfilePic(data.avatar_url);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !session) return;
    
    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `staff-profiles/${session.user.id}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('player-profiles') // reusing bucket for simplicity or create a new one
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from('player-profiles').getPublicUrl(filePath);
      
      const { error: updateError } = await supabase
        .from('admins')
        .update({ avatar_url: publicUrlData.publicUrl })
        .eq('id', session.user.id);

      if (updateError) throw updateError;

      setProfilePic(publicUrlData.publicUrl);
      toast.success("Profile picture updated!");
    } catch (err: any) {
      toast.error("Failed to upload photo: " + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters long.");
      return;
    }

    setIsSubmitting(true);
    
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) {
      toast.error(error.message || "Failed to update password.");
    } else {
      toast.success("Password successfully updated!");
      setNewPassword('');
      setConfirmPassword('');
    }
    
    setIsSubmitting(false);
  };

  return (
    <div className="settings-container page-container animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Account Settings</h1>
        <p className="text-muted">Manage your personal account preferences and security.</p>
      </div>

      <div className="card glass-panel" style={{ maxWidth: '600px', padding: '2rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem', gap: '0.75rem' }}>
          <User className="text-accent" size={24} />
          <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Profile Picture</h2>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: 'var(--bg-tertiary)', border: '2px solid var(--border-color)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {profilePic ? (
              <img src={profilePic} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <User size={40} color="var(--text-muted)" />
            )}
          </div>
          <div>
            <button 
              className="btn-secondary" 
              onClick={() => document.getElementById('avatar-upload')?.click()}
              disabled={isUploading}
            >
              <Upload size={18} className="mr-2" />
              {isUploading ? 'Uploading...' : 'Upload New Photo'}
            </button>
            <input 
              id="avatar-upload" 
              type="file" 
              accept="image/*" 
              style={{ display: 'none' }} 
              onChange={handlePhotoUpload} 
            />
            <p className="text-muted mt-2" style={{ fontSize: '0.8rem' }}>JPG, GIF or PNG. Max size of 2MB.</p>
          </div>
        </div>
      </div>

      <div className="card glass-panel" style={{ maxWidth: '600px', padding: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem', gap: '0.75rem' }}>
          <Key className="text-accent" size={24} />
          <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Change Password</h2>
        </div>
        
        <p className="text-muted" style={{ marginBottom: '2rem' }}>
          Update your password here. If you were given a temporary default password by an Admin, it is highly recommended to change it immediately.
        </p>

        <form onSubmit={handleUpdatePassword}>
          <div className="form-group mb-4">
            <label className="input-label">New Password</label>
            <input 
              type="password" 
              className="input-field" 
              placeholder="Enter new password" 
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              required
            />
          </div>

          <div className="form-group mb-6">
            <label className="input-label">Confirm New Password</label>
            <input 
              type="password" 
              className="input-field" 
              placeholder="Confirm your new password" 
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn-primary" disabled={isSubmitting}>
            <Save size={18} className="mr-2" />
            {isSubmitting ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Settings;
