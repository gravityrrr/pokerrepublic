import React, { useState, useEffect } from 'react';
import { Search, ShieldAlert, UserPlus, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { motion } from 'framer-motion';
import InviteStaffModal from '../components/staff/InviteStaffModal';
import { toast } from 'sonner';
import { exportToCsv } from '../utils/exportCsv';

const StaffManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'directory' | 'attendance'>('directory');
  const [staff, setStaff] = useState<any[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isInviteOpen, setIsInviteOpen] = useState(false);

  useEffect(() => {
    if (activeTab === 'directory') fetchStaff();
    else fetchAttendance();
  }, [activeTab]);

  const fetchStaff = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('admins')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (error) {
      toast.error("Failed to fetch staff: " + error.message);
    }
      
    if (data && !error) {
      setStaff(data);
    }
    setLoading(false);
  };

  const fetchAttendance = async () => {
    setLoading(true);
    // Ideally we would do a join, but since admin_id is not a strict FK in the SQL definition currently,
    // we might need to fetch both or if we did a join it might fail. 
    // Let's do a join via supabase's implicit joining if it works, or just fetch and map manually.
    const { data: attData, error: attError } = await supabase
      .from('staff_attendance')
      .select('*, admins(full_name, email, role)')
      .order('check_in_time', { ascending: false });

    if (attError) toast.error("Failed to fetch attendance: " + attError.message);
    if (attData) setAttendanceRecords(attData);
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
            placeholder={activeTab === 'directory' ? "Search by name, email, or role..." : "Search attendance records..."} 
            className="search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div style={{ display: 'flex', gap: '1rem' }}>
          {activeTab === 'attendance' && attendanceRecords.length > 0 && (
            <button 
              className="btn-secondary"
              onClick={() => exportToCsv('staff_attendance_report', attendanceRecords.map(r => ({
                Date: r.shift_date,
                Name: r.admins?.full_name || r.admin_id,
                Role: r.admins?.role || 'Staff',
                CheckIn: new Date(r.check_in_time).toLocaleString(),
                CheckOut: r.check_out_time ? new Date(r.check_out_time).toLocaleString() : 'Active'
              })))}
              style={{ margin: 0, borderColor: 'var(--accent-primary)', color: 'var(--accent-primary)' }}
            >
              Export CSV
            </button>
          )}
          <button 
            className={`btn-secondary ${activeTab === 'directory' ? 'btn-primary' : ''}`}
            onClick={() => setActiveTab('directory')}
            style={{ margin: 0 }}
          >
            Directory
          </button>
          <button 
            className={`btn-secondary ${activeTab === 'attendance' ? 'btn-primary' : ''}`}
            onClick={() => setActiveTab('attendance')}
            style={{ margin: 0 }}
          >
            Attendance Reports
          </button>
        </div>
      </div>

      {activeTab === 'directory' ? (
      <div className="table-container glass-panel animate-slide-up">
        <table className="data-table">
          <thead>
            <tr>
              <th>Staff Username</th>
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
                <td data-label="Staff Username">
                  <div className="player-cell">
                    <div className="avatar" style={{backgroundColor: 'var(--accent-vip)'}}>
                      {person.full_name ? person.full_name.charAt(0).toUpperCase() : '?'}
                    </div>
                    <div>
                      <div className="player-name">{person.full_name || 'Pending Name'}</div>
                    </div>
                  </div>
                </td>
                <td data-label="Status">
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
                <td data-label="Joined Date">{new Date(person.created_at).toLocaleDateString()}</td>
                <td data-label="Last Login">
                  <div className="text-muted" style={{display: 'flex', alignItems: 'center'}}>
                    <Clock size={14} className="mr-1" />
                    {person.last_login_at ? new Date(person.last_login_at).toLocaleString() : 'Never'}
                  </div>
                </td>
                <td data-label="Actions">
                  <div className="actions-cell">
                    <button className="icon-btn" title="Suspend/Revoke Access"><ShieldAlert size={16} className="text-danger" /></button>
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
      ) : (
      <div className="table-container glass-panel animate-slide-up">
        <table className="data-table">
          <thead>
            <tr>
              <th>Staff Member</th>
              <th>Role</th>
              <th>Shift Date</th>
              <th>Check In</th>
              <th>Check Out</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{textAlign: 'center', padding: '2rem'}}>Loading attendance records...</td></tr>
            ) : attendanceRecords.length === 0 ? (
              <tr><td colSpan={6} style={{textAlign: 'center', padding: '2rem'}}>No attendance records found.</td></tr>
            ) : attendanceRecords.map((record, idx) => {
              const name = record.admins?.full_name || 'Unknown Staff';
              
              if (searchQuery && !name.toLowerCase().includes(searchQuery.toLowerCase())) {
                return null;
              }

              return (
                <motion.tr 
                  key={record.id} 
                  className="table-row-hover"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <td data-label="Staff Member">
                    <div className="player-cell">
                      <div className="avatar" style={{backgroundColor: 'var(--accent-secondary)'}}>
                        {name.charAt(0)}
                      </div>
                      <div>
                        <div className="player-name">{name}</div>
                      </div>
                    </div>
                  </td>
                  <td data-label="Shift Date">{record.shift_date}</td>
                  <td data-label="Check In">{new Date(record.check_in_time).toLocaleTimeString()}</td>
                  <td data-label="Check Out">{record.check_out_time ? new Date(record.check_out_time).toLocaleTimeString() : '-'}</td>
                  <td data-label="Status">
                    {!record.check_out_time ? (
                      <span className="badge badge-success">On Shift</span>
                    ) : (
                      <span className="badge badge-regular" style={{backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)', borderColor: 'var(--border-color)'}}>Completed</span>
                    )}
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
      )}

      <InviteStaffModal 
        isOpen={isInviteOpen} 
        onClose={() => setIsInviteOpen(false)} 
        onSuccess={fetchStaff}
      />
    </div>
  );
};

export default StaffManagement;
