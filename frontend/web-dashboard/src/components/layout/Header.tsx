import React from 'react';
import { Search, Bell } from 'lucide-react';

interface HeaderProps {
  title: string;
}

const Header: React.FC<HeaderProps> = ({ title }) => {
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
        
        <div className="user-profile">
          <div className="avatar">NT</div>
          <div className="user-info">
            <span className="user-name">Chi Tường</span>
            <span className="user-role">Quản lý</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
