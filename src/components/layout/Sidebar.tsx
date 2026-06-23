import React, { useContext } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  MonitorPlay, 
  BarChart3, 
  Settings,
  Bell,
  LogOut,
  Shield,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';
import { AuthContext } from '../../App';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, toggleSidebar }) => {
  const { session, role } = useContext(AuthContext);

  const navItems = [
    { name: 'Dashboard', path: '/', icon: <LayoutDashboard size={20} /> },
    { name: 'Players', path: '/players', icon: <Users size={20} /> },
    { name: 'Tables', path: '/tables', icon: <MonitorPlay size={20} /> },
    { name: 'Analytics', path: '/analytics', icon: <BarChart3 size={20} />, hideFor: ['Staff'] },
    { name: 'Staff Directory', path: '/staff', icon: <Shield size={20} />, hideFor: ['Staff'] },
  ];

  const bottomItems = [
    { name: 'Alerts', path: '/alerts', icon: <Bell size={20} /> },
    { name: 'Settings', path: '/settings', icon: <Settings size={20} />, hideFor: ['Staff'] },
  ];

  const handleLogout = async () => {
    try {
      const { data: attendance } = await supabase
        .from('staff_attendance')
        .select('id')
        .eq('admin_id', session?.user?.id)
        .is('check_out_time', null)
        .order('check_in_time', { ascending: false })
        .limit(1)
        .single();

      if (attendance) {
        await supabase
          .from('staff_attendance')
          .update({ check_out_time: new Date().toISOString() })
          .eq('id', attendance.id);
      }
      
      const { error } = await supabase.auth.signOut();
      if (error) toast.error("Error signing out: " + error.message);
    } catch (e: any) {
      console.error("Failed to checkout", e);
      toast.error("Failed to sign out properly.");
    }
  };

  return (
    <aside className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
      {/* Logo + Toggle Row */}
      <div className="sidebar-header">
        <img 
          src="/logo.png" 
          alt="Poker Republic" 
          className="sidebar-logo"
        />
        <button className="sidebar-toggle-btn" onClick={toggleSidebar} title={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}>
          {isOpen ? <PanelLeftClose size={20} /> : <PanelLeftOpen size={20} />}
        </button>
      </div>

      <nav className="sidebar-nav">
        <ul className="nav-list">
          {navItems.filter(item => !(item.hideFor || []).includes(role || '')).map((item) => (
            <li key={item.path} className="nav-item">
              <NavLink 
                to={item.path} 
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                title={!isOpen ? item.name : undefined}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-text">{item.name}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="sidebar-bottom">
        <ul className="nav-list">
          {bottomItems.filter(item => !(item.hideFor || []).includes(role || '')).map((item) => (
            <li key={item.path} className="nav-item">
              <NavLink 
                to={item.path} 
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                title={!isOpen ? item.name : undefined}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-text">{item.name}</span>
              </NavLink>
            </li>
          ))}
          <li className="nav-item">
            <button className="nav-link logout-btn" title={!isOpen ? "Logout" : undefined} onClick={handleLogout}>
              <span className="nav-icon"><LogOut size={20} /></span>
              <span className="nav-text">Logout</span>
            </button>
          </li>
        </ul>
      </div>
    </aside>
  );
};

export default Sidebar;
