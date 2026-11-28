import { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useAuth } from '@/features/auth';
import { useNotifications } from '@/shared';
import { AICoPilotAssistant } from '@/features/reports';
import { ShoppingBag, Truck, MessageSquare, AlertTriangle, Info, X } from 'lucide-react';

const GlobalRealtimeToast = () => {
  const { recentToast, dismissToast, markAsRead } = useNotifications();
  const navigate = useNavigate();

  if (!recentToast) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: '70px',
        right: '24px',
        zIndex: 9999,
        backgroundColor: '#ffffff',
        borderRadius: '8px',
        border: '1px solid #cbd5e1',
        boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15), 0 8px 10px -6px rgba(0,0,0,0.1)',
        padding: '12px 16px',
        maxWidth: '360px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        cursor: 'pointer',
      }}
      onClick={() => {
        markAsRead(recentToast.id);
        if (recentToast.link) navigate(recentToast.link);
        dismissToast();
      }}
    >
      <div
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '6px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          backgroundColor:
            recentToast.type === 'ORDER' ? '#eff6ff'
            : recentToast.type === 'OUTBOUND' ? '#f0fdfa'
            : recentToast.type === 'CHAT' ? '#faf5ff'
            : recentToast.type === 'IOT_ALERT' ? '#fef2f2'
            : '#f8fafc',
          border: `1px solid ${
            recentToast.type === 'ORDER' ? '#bfdbfe'
            : recentToast.type === 'OUTBOUND' ? '#ccfbf1'
            : recentToast.type === 'CHAT' ? '#e9d5ff'
            : recentToast.type === 'IOT_ALERT' ? '#fecaca'
            : '#e2e8f0'
          }`,
        }}
      >
        {recentToast.type === 'ORDER' ? <ShoppingBag size={16} color="#2563eb" />
          : recentToast.type === 'OUTBOUND' ? <Truck size={16} color="#0f766e" />
          : recentToast.type === 'CHAT' ? <MessageSquare size={16} color="#9333ea" />
          : recentToast.type === 'IOT_ALERT' ? <AlertTriangle size={16} color="#dc2626" />
          : <Info size={16} color="#64748b" />}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#0f172a' }}>
          {recentToast.title}
        </div>
        <div style={{ fontSize: '11.5px', color: '#475569', marginTop: '2px', lineHeight: 1.35 }}>
          {recentToast.message}
        </div>
        <div style={{ fontSize: '10.5px', color: '#0f766e', fontWeight: 600, marginTop: '4px' }}>
          Nhấp để xem chi tiết →
        </div>
      </div>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          dismissToast();
        }}
        style={{
          border: 'none',
          background: 'transparent',
          color: '#94a3b8',
          cursor: 'pointer',
          padding: '2px',
          borderRadius: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        title="Đóng thông báo"
      >
        <X size={15} />
      </button>
    </div>
  );
};

const getPageTitle = (pathname: string) => {
  switch (pathname) {
    case '/': return 'Quản lý Kho hàng';
    case '/dispatch': return 'Tiếp nhận & Phân phối đơn';
    case '/sales': return 'Quản lý Bán hàng & Chat Hỗ trợ';
    case '/products': return 'Danh mục Sản phẩm';
    case '/inventory': return 'Quản lý Kho hàng';
    case '/staff': return 'Nhân viên Trực kho';
    case '/orders': return 'Điều phối Đơn hàng theo Kho';
    case '/ai-alerts': return 'Cảnh báo Giám sát';
    case '/inbound': return 'Quản lý Nhập kho';
    case '/outbound': return 'Quản lý Xuất kho & Pick-to-Light';
    case '/iot-controller': return 'Điều khiển Kệ IoT & Nhiệt ẩm';
    case '/demand-forecast': return 'Dự báo nhu cầu';
    case '/transport': return 'Tối ưu vận chuyển';
    case '/reports': return 'Báo cáo & Phân tích';
    case '/cod-reconciliation': return 'Đối soát Quỹ COD & Quyết toán Thu ngân';
    case '/profile': return 'Thông tin tài khoản';
    case '/users': return 'Quản lý người dùng';
    default: return 'Tiếp nhận & Phân phối đơn';
  }
};

const MainLayout = () => {
  const location = useLocation();
  const { user } = useAuth();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  let title = getPageTitle(location.pathname);

  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [location.pathname, location.search]);

  if (user?.role === 'DRIVER' && location.pathname === '/transport') {
    title = 'Đơn hàng của tôi';
  }

  return (
    <div className="app-container">
      <div
        className={`sidebar-backdrop ${isMobileSidebarOpen ? 'open' : ''}`}
        onClick={() => setIsMobileSidebarOpen(false)}
      />
      <Sidebar
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
      />
      <main className="main-wrapper">
        <Header
          title={title}
          onToggleMobileMenu={() => setIsMobileSidebarOpen(prev => !prev)}
        />
        <div className="page-content animate-fade-in">
          <Outlet />
        </div>
      </main>

      {/* Floating AI Operations Co-Pilot Assistant */}
      <AICoPilotAssistant />

      {/* Global Realtime Operational Toast */}
      <GlobalRealtimeToast />
    </div>
  );
};

export default MainLayout;
