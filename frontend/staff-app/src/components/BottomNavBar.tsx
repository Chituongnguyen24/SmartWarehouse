import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  PackageCheck,
  Download,
  Search,
  Compass,
} from 'lucide-react';
import { fetchOutboundOrders, fetchInboundOrdersApi } from '../services/api';
import { useStaffWebSocket } from '../context/WebSocketContext';

export const BottomNavBar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { lastEvent } = useStaffWebSocket();

  const [packingCount, setPackingCount] = useState<number>(0);
  const [pickingCount, setPickingCount] = useState<number>(0);
  const [inboundCount, setInboundCount] = useState<number>(0);

  const loadBadgeCounts = async () => {
    try {
      const [outbounds, inbounds] = await Promise.all([
        fetchOutboundOrders(),
        fetchInboundOrdersApi(),
      ]);

      if (Array.isArray(outbounds)) {
        const isReadyOrDonePacking = (ord: any) => {
          const s = (ord.status || '').toUpperCase();
          if (['PICKED', 'PACKING', 'PACKED', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'COMPLETED'].includes(s)) return true;
          if (localStorage.getItem(`citymart_order_ready_pack_${ord.id}`) === 'true') return true;
          if (localStorage.getItem(`citymart_order_ready_pack_${ord.orderCode}`) === 'true') return true;
          if (Array.isArray(ord.items) && ord.items.length > 0) {
            const allPicked = ord.items.every((it: any) => Number(it.pickedQuantity || 0) >= Number(it.quantity || it.requestedQuantity || 1) && Number(it.quantity || it.requestedQuantity || 1) > 0);
            if (allPicked) return true;
          }
          return false;
        };

        const isPackingCompleted = (status?: string) => {
          const s = (status || '').toUpperCase();
          return ['PACKED', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'COMPLETED', 'CANCELLED'].includes(s);
        };

        const picking = outbounds.filter(o => 
          (o.status === 'PENDING' || o.status === 'PICKING') && !isReadyOrDonePacking(o)
        ).length;

        const pendingPacking = outbounds.filter(o => 
          isReadyOrDonePacking(o) && !isPackingCompleted(o.status)
        ).length;

        setPickingCount(picking);
        setPackingCount(pendingPacking);
      }

      if (Array.isArray(inbounds)) {
        const pendingInbound = inbounds.filter((i: any) => i.status !== 'STORED').length;
        setInboundCount(pendingInbound);
      }
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    loadBadgeCounts();
  }, []);

  useEffect(() => {
    if (lastEvent) {
      loadBadgeCounts();
    }
  }, [lastEvent]);

  const NAV_ITEMS = [
    { path: '/', label: 'Tổng Quan', icon: <LayoutDashboard size={20} /> },
    {
      path: '/picking',
      label: 'Lấy Hàng',
      icon: <Compass size={20} />,
      badge: pickingCount > 0 ? String(pickingCount) : undefined,
      badgeColor: '#ea580c',
    },
    {
      path: '/packing',
      label: 'Đóng Gói',
      icon: <PackageCheck size={20} />,
      badge: packingCount > 0 ? String(packingCount) : undefined,
      badgeColor: '#9333ea',
    },
    {
      path: '/inbound',
      label: 'Nhập Kho',
      icon: <Download size={20} />,
      badge: inboundCount > 0 ? String(inboundCount) : undefined,
      badgeColor: '#059669',
    },
    { path: '/lookup', label: 'Kiểm Kê', icon: <Search size={20} /> },
  ];

  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.96)',
        backdropFilter: 'blur(12px)',
        borderTop: '1px solid #e2e8f0',
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        padding: '8px 10px 16px 10px',
        zIndex: 5000,
        boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.05)',
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
              padding: '6px 8px',
              borderRadius: '12px',
              color: isActive ? '#008848' : '#64748b',
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
                    right: '-10px',
                    backgroundColor: item.badgeColor || '#0284c7',
                    color: '#ffffff',
                    fontSize: '9.5px',
                    fontWeight: 900,
                    borderRadius: '999px',
                    minWidth: '16px',
                    height: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 4px',
                    boxShadow: '0 0 6px rgba(0, 0, 0, 0.2)',
                  }}
                >
                  {item.badge}
                </span>
              )}
            </div>
            <span
              style={{
                fontSize: '11px',
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

