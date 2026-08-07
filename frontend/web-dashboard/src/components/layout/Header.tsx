import React, { useState, useEffect } from 'react';
import { Search, Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth, ROLE_LABELS } from '../../contexts/AuthContext';

interface HeaderProps {
  title: string;
}

const Header: React.FC<HeaderProps> = ({ title }) => {
  const { user } = useAuth();
  const [warehouseName, setWarehouseName] = useState<string>('');

  const initials = user?.name
    ? user.name.split(' ').map(w => w.charAt(0)).slice(-2).join('')
    : 'U';

  const isStaff = user?.role === 'WAREHOUSE_STAFF' || user?.role === 'WAREHOUSE_MANAGER';

  useEffect(() => {
    if (isStaff && user?.id) {
      const fetchWarehouseInfo = async () => {
        try {
          const saved = localStorage.getItem('warehouse-staff-assignments');
          if (saved) {
            const assignments = JSON.parse(saved);
            const code = assignments[user.id] || '';
            if (code) {
              const res = await fetch('http://localhost:3005/warehouses');
              if (res.ok) {
                const warehouses = await res.json();
                const matched = warehouses.find((w: any) => w.code === code);
                if (matched) {
                  setWarehouseName(matched.name);
                } else {
                  setWarehouseName(`Kho ${code}`);
                }
              }
            }
          }
        } catch (e) {
          console.error('Error fetching warehouse info in header:', e);
        }
      };
      fetchWarehouseInfo();
    } else {
      setWarehouseName('');
    }
  }, [isStaff, user]);

  return (
    <header className="top-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div className="page-title">{title}</div>
        {warehouseName && (
          <span style={{
            fontSize: '0.8rem',
            fontWeight: 700,
            padding: '0.25rem 0.75rem',
            borderRadius: '20px',
            backgroundColor: '#0f766e',
            color: '#ffffff',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem',
            boxShadow: '0 2px 4px rgba(15,118,110,0.15)'
          }}>
            📍 {warehouseName}
          </span>
        )}
      </div>
      
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
