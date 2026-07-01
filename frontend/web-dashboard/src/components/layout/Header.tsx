import React from 'react';
import { Search, Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth, ROLE_LABELS } from '../../contexts/AuthContext';

interface HeaderProps {
  title: string;
}

const Header: React.FC<HeaderProps> = ({ title }) => {
  const { user } = useAuth();

  const initials = user?.name
    ? user.name.split(' ').map(w => w.charAt(0)).slice(-2).join('')
    : 'U';

  return (
    <header className="top-header">
      <div className="page-title">{title}</div>
      
      <div className="header-actions">
        <div className="search-bar">
          <Search size={18} className="text-muted" />
          <input type="text" placeholder="Tìm SKU, lô hàng..." />
        </div>
        
        <button className="icon-btn">
          <Bell size={20} />
          <span className="notification-badge"></span>
        </button>
        
        <Link to="/profile" className="user-profile" style={{ textDecoration: 'none', color: 'inherit', cursor: 'pointer' }}>
          <div className="avatar">{initials}</div>
          <div className="user-info">
            <span className="user-name">{user?.name || 'User'}</span>
            <span className="user-role">{user ? ROLE_LABELS[user.role] : ''}</span>
          </div>
        </Link>
      </div>
    </header>
  );
};

export default Header;
