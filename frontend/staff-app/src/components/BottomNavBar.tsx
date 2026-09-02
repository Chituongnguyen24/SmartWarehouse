import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Boxes,
  Download,
  PackageCheck,
  Search,
} from 'lucide-react';

export const BottomNavBar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const NAV_ITEMS = [
    { path: '/', label: 'Tổng Quan', icon: <LayoutDashboard size={20} /> },
    { path: '/picking', label: 'Soạn Hàng', icon: <Boxes size={20} />, badge: '5' },
    { path: '/inbound', label: 'Nhập Kho', icon: <Download size={20} />, badge: '2' },
    { path: '/packing', label: 'Đóng Gói', icon: <PackageCheck size={20} /> },
    { path: '/lookup', label: 'Tra Cứu', icon: <Search size={20} /> },
  ];

  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        backdropFilter: 'blur(12px)',
        borderTop: '1px solid #1e293b',
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        padding: '8px 12px 16px 12px',
        zIndex: 5000,
        boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.4)',
      }}
    >
      {NAV_ITEMS.map(item => {
        const isActive = location.pathname === item.path;

        return (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            style={{
              background: 'none',
              border: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              padding: '6px 12px',
              borderRadius: '12px',
              color: isActive ? '#38bdf8' : '#94a3b8',
              cursor: 'pointer',
              position: 'relative',
              transition: 'all 0.15s ease',
            }}
          >
            <div
              style={{
                position: 'relative',
                transform: isActive ? 'scale(1.1)' : 'scale(1)',
                transition: 'transform 0.15s ease',
              }}
            >
              {item.icon}
              {item.badge && (
                <span
                  style={{
                    position: 'absolute',
                    top: '-6px',
                    right: '-8px',
                    backgroundColor: '#ef4444',
                    color: '#ffffff',
                    fontSize: '10px',
                    fontWeight: 900,
                    borderRadius: '999px',
                    padding: '1px 5px',
                    boxShadow: '0 0 6px rgba(239, 68, 68, 0.6)',
                  }}
                >
                  {item.badge}
                </span>
              )}
            </div>
            <span
              style={{
                fontSize: '10px',
                fontWeight: isActive ? 800 : 600,
                letterSpacing: '-0.1px',
              }}
            >
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
