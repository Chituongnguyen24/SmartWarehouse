import React from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
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
  Shield,
  Inbox,
  Clock,
  Search,
  Grid3X3,
  ShoppingCart
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
  // QUẢN LÝ KHO (ADMIN + WAREHOUSE_MANAGER)
  { path: '/', label: 'Dashboard Tổng quan', icon: <LayoutDashboard size={18} />, section: 'QUẢN LÝ KHO', allowedRoles: ['ADMIN', 'WAREHOUSE_MANAGER'] },
  { path: '/inventory', label: 'Sản phẩm & Tồn kho', icon: <Layers size={18} />, section: 'QUẢN LÝ KHO', allowedRoles: ['ADMIN', 'WAREHOUSE_MANAGER'] },
  { path: '/inbound', label: 'Nhập kho', icon: <ArrowDownLeft size={18} />, section: 'QUẢN LÝ KHO', allowedRoles: ['ADMIN', 'WAREHOUSE_MANAGER'] },
  { path: '/outbound', label: 'Xuất kho', icon: <ArrowUpRight size={18} />, section: 'QUẢN LÝ KHO', allowedRoles: ['ADMIN', 'WAREHOUSE_MANAGER'] },
  { path: '/fefo', label: 'Cảnh báo Hạn dùng', icon: <AlertTriangle size={18} />, section: 'QUẢN LÝ KHO', allowedRoles: ['ADMIN', 'WAREHOUSE_MANAGER'] },
  { path: '/staff', label: 'Nhân viên Trực kho', icon: <Users size={18} />, section: 'QUẢN LÝ KHO', allowedRoles: ['ADMIN', 'WAREHOUSE_MANAGER'] },
  { path: '/orders', label: 'Tiếp nhận & Điều phối Đơn', icon: <Send size={18} />, section: 'QUẢN LÝ KHO', allowedRoles: ['ADMIN', 'WAREHOUSE_MANAGER', 'SALES_STAFF'] },
  { path: '/reports', label: 'Báo cáo Thống kê', icon: <BarChart3 size={18} />, section: 'BÁO CÁO', allowedRoles: ['ADMIN', 'WAREHOUSE_MANAGER'] },

  // NHÂN VIÊN KHO - các tab chức năng chi tiết
  { path: '/orders?tab=packing', label: 'Đơn hàng chờ đóng gói', icon: <Boxes size={18} />, section: 'NHÂN VIÊN KHO', allowedRoles: ['WAREHOUSE_STAFF'] },
  { path: '/orders?tab=map', label: 'Vị trí sản phẩm (Sơ đồ)', icon: <Grid3X3 size={18} />, section: 'NHÂN VIÊN KHO', allowedRoles: ['WAREHOUSE_STAFF'] },
  { path: '/orders?tab=delivery', label: 'Bàn giao cho tài xế', icon: <Truck size={18} />, section: 'NHÂN VIÊN KHO', allowedRoles: ['WAREHOUSE_STAFF'] },

  // TÀI XẾ
  { path: '/transport', label: 'Tối ưu vận chuyển', icon: <Truck size={18} />, section: 'VẬN HÀNH KHO', allowedRoles: ['DRIVER'] },
];

const Sidebar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const currentRole = user?.role || 'ADMIN';

  // Filter items by role — each role sees only its own section
  const visibleItems = menuItems.filter(item => item.allowedRoles.includes(currentRole));

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

  const isItemActive = (itemPath: string) => {
    if (itemPath.includes('?')) {
      const url = new URL(itemPath, window.location.origin);
      const itemTab = url.searchParams.get('tab');
      const currentParams = new URLSearchParams(location.search);
      const currentTab = currentParams.get('tab') || 'tasks';
      return location.pathname === url.pathname && currentTab === itemTab;
    }
    return location.pathname === itemPath;
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ background: '#fff', borderRadius: '10px', padding: '4px 6px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.08)' }}>
          <img src="/logos/logo_icon.png" alt="C.T Mart Logo" style={{ height: '32px', width: 'auto', objectFit: 'contain' }} />
        </div>
        <div className="brand-info">
          <h1 style={{ fontSize: '1.15rem', fontWeight: 900, color: '#fff', letterSpacing: '-0.02em', margin: 0, lineHeight: 1.2 }}>C.T Mart</h1>
          <p style={{ fontSize: '0.72rem', color: '#99f6e4', margin: '2px 0 0 0', fontWeight: 600 }}>Kho Thực Phẩm Thông Minh</p>
        </div>
      </div>

      {Object.entries(sections).map(([section, items]) => (
        <div className="nav-section" key={section}>
          <div className="nav-section-title">{section}</div>
          {items.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={() => `nav-item ${isItemActive(item.path) ? 'active' : ''}`}
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
