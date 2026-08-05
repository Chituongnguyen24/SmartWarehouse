import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  Boxes, 
  Wifi, 
  AlertTriangle, 
  ArrowUpRight, 
  ArrowDownLeft,
  TrendingUp, 
  Truck, 
  Layers, 
  BarChart3, 
  Users,
  Settings,
  Leaf,
  LogOut,
  Send,
  Shield
} from 'lucide-react';
import { useAuth, ROLE_LABELS } from '../../contexts/AuthContext';
import type { UserRole } from '../../contexts/AuthContext';

interface MenuItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  section: string;
  allowedRoles: UserRole[];
  badge?: string;
}

const menuItems: MenuItem[] = [
  // VẬN HÀNH
  { path: '/', label: 'Quản lý Kho hàng', icon: <Boxes size={18} />, section: 'VẬN HÀNH', allowedRoles: ['ADMIN', 'WAREHOUSE_MANAGER', 'WAREHOUSE_STAFF'] },
  { path: '/staff', label: 'Nhân viên Trực kho', icon: <Users size={18} />, section: 'VẬN HÀNH', allowedRoles: ['ADMIN', 'WAREHOUSE_MANAGER'] },
  { path: '/orders', label: 'Điều phối Đơn hàng', icon: <Send size={18} />, section: 'VẬN HÀNH', allowedRoles: ['ADMIN', 'WAREHOUSE_MANAGER', 'WAREHOUSE_STAFF'] },
];

const Sidebar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const currentRole = user?.role || 'ADMIN';

  // Filter items by role and customize them dynamically
  const visibleItems = menuItems
    .filter(item => item.allowedRoles.includes(currentRole))
    .map(item => {
      if (currentRole === 'DRIVER' && item.path === '/transport') {
        return {
          ...item,
          label: 'Đơn hàng của tôi',
          section: 'TÀI XẾ'
        };
      }
      return item;
    });

  // Group by section
  const sections = visibleItems.reduce<Record<string, MenuItem[]>>((acc, item) => {
    if (!acc[item.section]) acc[item.section] = [];
    acc[item.section].push(item);
    return acc;
  }, {});

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="brand-icon">
          <Leaf size={20} />
        </div>
        <div className="brand-info">
          <h1>CityMart</h1>
          <p>Kho thực phẩm thông minh</p>
        </div>
      </div>

      {Object.entries(sections).map(([section, items]) => (
        <div className="nav-section" key={section}>
          <div className="nav-section-title">{section}</div>
          {items.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              {item.icon}
              <span>{item.label}</span>
              {item.badge && <span className="nav-badge">{item.badge}</span>}
            </NavLink>
          ))}
        </div>
      ))}

      <div className="sidebar-footer">

        {/* User info & Logout */}
        <div style={{
          marginTop: '0.75rem',
          padding: '0.75rem',
          borderRadius: 8,
          background: 'rgba(255,255,255,0.05)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'var(--color-primary-600)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: '0.75rem', fontWeight: 600, flexShrink: 0,
          }}>
            {user?.name?.split(' ').pop()?.charAt(0) || 'U'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: '#fff', fontSize: '0.75rem', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.name || 'User'}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.65rem' }}>
              {ROLE_LABELS[currentRole]}
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Đăng xuất"
            style={{
              background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)',
              cursor: 'pointer', padding: 4, borderRadius: 4,
              transition: 'color 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
