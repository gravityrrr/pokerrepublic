import React, { useContext, useEffect, useState } from 'react';
import { Menu, Bell, UserCircle, Sun, Moon } from 'lucide-react';
import { AuthContext } from '../../App';

interface HeaderProps {
  toggleSidebar: () => void;
}

const Header: React.FC<HeaderProps> = ({ toggleSidebar }) => {
  const { session, role } = useContext(AuthContext);
  const [isLightMode, setIsLightMode] = useState(false);

  useEffect(() => {
    // Check local storage for theme
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
      document.body.classList.add('theme-light');
      setIsLightMode(true);
    }
  }, []);

  const toggleTheme = () => {
    if (isLightMode) {
      document.body.classList.remove('theme-light');
      localStorage.setItem('theme', 'dark');
      setIsLightMode(false);
    } else {
      document.body.classList.add('theme-light');
      localStorage.setItem('theme', 'light');
      setIsLightMode(true);
    }
  };

  return (
    <header className="header glass-panel">
      <div className="header-left">
        <button className="menu-btn" onClick={toggleSidebar}>
          <Menu size={24} />
        </button>
      </div>
      
      <div className="header-right">
        <button className="icon-btn" onClick={toggleTheme} title="Toggle Theme">
          {isLightMode ? <Moon size={20} /> : <Sun size={20} />}
        </button>
        <button className="icon-btn notification-btn">
          <Bell size={20} />
          <span className="notification-dot"></span>
        </button>
        <div className="user-profile">
          <div className="user-info">
            <span className="user-name">{session?.user?.user_metadata?.full_name || session?.user?.email || 'User'}</span>
            <span className="user-role">{role || 'Loading...'}</span>
          </div>
          <UserCircle size={32} className="user-avatar-icon" />
        </div>
      </div>
    </header>
  );
};

export default Header;
