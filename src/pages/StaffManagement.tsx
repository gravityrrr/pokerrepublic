import React, { useState, useEffect } from 'react';
import { Search, ShieldAlert, UserPlus, Shield, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { motion } from 'framer-motion';
import InviteStaffModal from '../components/staff/InviteStaffModal';

const StaffManagement: React.FC = () => {
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isInviteOpen, setIsInviteOpen] = useState(false);

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('admins')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (data && !error) {
      setStaff(data);
    }
    setLoading(false);
  };

  const filteredStaff = staff.filter(s => 
    s.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.role?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="players-container animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Staff Directory</h1>
          <p className="page-subtitle">Manage administrative access and roles</p>
        </div>
        <button className="btn-primary" onClick={() => setIsInviteOpen(true)}>
          <UserPlus size={18} className="mr-2" />
          Invite Staff
        </button>
      </div>

      <div className="toolbar glass-panel">
        <div className="search-bar">
          <Search size={18} className="text-muted" />
          <input 
            type="text" 
            placeholder="Search by name, email, or role..." 
            className="search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="table-container glass-panel">
        <table className="data-table">
          <thead>
            <tr>
              <th>Staff Member</th>
              <th>Role</th>
              <th>Status</th>
              <th>Joined Date</th>
              <th>Last Login</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{textAlign: 'center', padding: '2rem'}}>Loading staff directory...</td></tr>
            ) : filteredStaff.length === 0 ? (
              <tr><td colSpan={6} style={{textAlign: 'center', padding: '2rem'}}>No staff found.</td></tr>
            ) : filteredStaff.map((person, idx) => (
              <motion.tr 
                key={person.id} 
                className="table-row-hover"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <td>
                  <div className="player-cell">
                    <div className="avatar" style={{backgroundColor: 'var(--accent-vip)'}}>
                      {person.full_name ? person.full_name.charAt(0) : person.email.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="player-name">{person.full_name || 'Pending Name'}</div>
                      <div className="player-phone text-muted">{person.email}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <span className={`badge ${person.role === 'Super Admin' ? 'badge-vip' : 'badge-regular'}`}>
                    <Shield size={12} className="mr-1 inline" />
                    {person.role}
                  </span>
                </td>
                <td>
                  {person.is_active ? (
                    <div className="status-cell">
                      <span className="status-indicator status-active"></span>
                      <span>Active</span>
                    </div>
                  ) : (
                    <div className="status-cell text-muted">
                      <span className="status-indicator status-offline"></span>
                      <span>Disabled</span>
                    </div>
                  )}
                </td>
                <td>{new Date(person.created_at).toLocaleDateString()}</td>
                <td>
                  <div className="text-muted" style={{display: 'flex', alignItems: 'center'}}>
                    <Clock size={14} className="mr-1" />
                    {person.last_login_at ? new Date(person.last_login_at).toLocaleString() : 'Never'}
                  </div>
                </td>
                <td>
                  <div className="actions-cell">
                    <button className="icon-btn" title="Suspend/Revoke Access"><ShieldAlert size={16} className="text-danger" /></button>
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      <InviteStaffModal 
        isOpen={isInviteOpen} 
        onClose={() => setIsInviteOpen(false)} 
        onSuccess={fetchStaff}
      />
    </div>
  );
};

export default StaffManagement;
