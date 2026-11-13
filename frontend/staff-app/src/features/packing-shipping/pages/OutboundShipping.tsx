import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Truck,
  Package,
  CheckCircle2,
  Clock,
  MapPin,
  ArrowRight,
  RefreshCw,
  Search,
  Compass,
  Boxes,
  ExternalLink,
  Lock,
} from 'lucide-react';
import { fetchOutboundOrders, ApiOutboundOrder } from '@/shared';
import { useWebSocketContext } from '@/features/dashboard';
import { useAuth } from '@/features/auth';

export const OutboundShipping: React.FC = () => {
  const [orders, setOrders] = useState<ApiOutboundOrder[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'PICKING' | 'PACKED' | 'CONFIRMED'>('ALL');
  const navigate = useNavigate();
  const { lastEvent, isLockedByOther } = useWebSocketContext();
  const { user } = useAuth();
  const currentUserId = user?.id || 'staff_mobile_user';

  const loadOrders = async () => {
    setIsLoading(true);
    try {
      const data = await fetchOutboundOrders();
      setOrders(data);
    } catch (err) {
      console.warn('Failed to load outbound orders:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  useEffect(() => {
    if (lastEvent) {
      loadOrders();
    }
  }, [lastEvent]);

  const filteredOrders = orders
    .filter(o => (statusFilter === 'ALL' ? true : o.status === statusFilter))
    .filter(o => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        o.orderCode.toLowerCase().includes(q) ||
        (o.destination && o.destination.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
      case 'DELIVERED':
      case 'SHIPPED':
        return { label: 'Đã Xuất Kho', bg: '#dcfce7', color: '#059669', border: '#86efac' };
      case 'PACKED':
        return { label: 'Chờ Đóng Gói', bg: '#f3e8ff', color: '#9333ea', border: '#d8b4fe' };
      case 'PICKING':
        return { label: 'Đang Lấy Hàng', bg: '#e0f2fe', color: '#0284c7', border: '#7dd3fc' };
      case 'PENDING':
      default:
        return { label: 'Chờ Gom Hàng', bg: '#fef3c7', color: '#b45309', border: '#fcd34d' };
    }
  };

  return (
    <div style={{ padding: '16px', paddingBottom: '90px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      
      {/* Header */}
      <div
        style={{
          backgroundColor: '#ffffff',
          padding: '18px 20px',
          borderRadius: '20px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <div style={{ fontSize: '11px', color: '#0284c7', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
            QUẢN LÝ XUẤT KHO DI ĐỘNG
          </div>
          <h2 style={{ margin: '3px 0 0 0', fontSize: '17px', fontWeight: 900, color: '#0f172a' }}>
            Phiếu Xuất Hàng & Soạn Đơn
          </h2>
        </div>

        <button
          onClick={loadOrders}
          style={{
            backgroundColor: '#f1f5f9',
            border: '1px solid #e2e8f0',
            color: '#475569',
            padding: '8px',
            borderRadius: '10px',
            cursor: 'pointer',
          }}
        >
          <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Search & Filter */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ position: 'relative' }}>
          <Search size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '12px' }} />
          <input
            type="text"
            placeholder="Tìm theo mã phiếu, điểm đến..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '14px',
              padding: '10px 14px 10px 38px',
              color: '#0f172a',
              fontSize: '13px',
              fontWeight: 600,
              boxSizing: 'border-box',
              boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
            }}
          />
        </div>

        {/* Filter Pills */}
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
          {[
            { key: 'ALL', label: 'Tất cả' },
            { key: 'PENDING', label: 'Chờ gom hàng' },
            { key: 'PICKING', label: 'Đang gom hàng' },
            { key: 'PACKED', label: 'Chờ đóng gói' },
            { key: 'CONFIRMED', label: 'Đã xuất kho' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key as any)}
              style={{
                backgroundColor: statusFilter === f.key ? '#0284c7' : '#ffffff',
                color: statusFilter === f.key ? '#ffffff' : '#64748b',
                border: `1.5px solid ${statusFilter === f.key ? '#0284c7' : '#e2e8f0'}`,
                padding: '6px 12px',
                borderRadius: '10px',
                fontSize: '11.5px',
                fontWeight: 800,
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                boxShadow: statusFilter === f.key ? '0 2px 6px rgba(2, 132, 199, 0.25)' : 'none',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Orders List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {filteredOrders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
            <Boxes size={40} style={{ margin: '0 auto 8px auto', opacity: 0.5 }} />
            <div style={{ fontSize: '14px', fontWeight: 700 }}>Không tìm thấy đơn xuất kho nào</div>
          </div>
        ) : (
          filteredOrders.map(order => {
            const badge = getStatusBadge(order.status);
            const isPickingStage = order.status === 'PENDING' || order.status === 'PICKING';
            const isPackedStage = order.status === 'PACKED';

            return (
              <div
                key={order.id}
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '18px',
                  border: '1.5px solid #e2e8f0',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
                }}
              >
                {/* Header Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        backgroundColor: '#e0f2fe',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Truck size={20} color="#0284c7" />
                    </div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 900, color: '#0f172a' }}>
                        {order.orderCode}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>
                        {new Date(order.createdAt || Date.now()).toLocaleString('vi-VN')}
                      </div>
                    </div>
                  </div>

                  <span
                    style={{
                      fontSize: '10.5px',
                      fontWeight: 800,
                      backgroundColor: badge.bg,
                      color: badge.color,
                      border: `1px solid ${badge.border}`,
                      padding: '3px 9px',
                      borderRadius: '6px',
                    }}
                  >
                    {badge.label}
                  </span>
                </div>

                {/* Details */}
                <div
                  style={{
                    backgroundColor: '#f8fafc',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    padding: '10px 14px',
                    fontSize: '12.5px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Điểm đến:</span>
                    <strong style={{ color: '#0f172a' }}>{order.destination || 'Emart Store'}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Số lượng sản phẩm:</span>
                    <strong style={{ color: '#0284c7' }}>{order.totalQuantity || order.items?.length || 0} sản phẩm</strong>
                  </div>
                </div>

                {/* Action */}
                {(() => {
                  const lockInfo = isLockedByOther(order.id, currentUserId);
                  if (lockInfo) {
                    return (
                      <div
                        style={{
                          backgroundColor: '#fef3c7',
                          border: '1px solid #fcd34d',
                          borderRadius: '10px',
                          padding: '10px 12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          color: '#b45309',
                          fontSize: '11.5px',
                          fontWeight: 700,
                        }}
                      >
                        <Lock size={15} color="#d97706" />
                        <span>Đang được thao tác bởi <b>{lockInfo.lockedByName}</b> ({lockInfo.lockedByRole === 'WAREHOUSE_STAFF' ? 'Nhân viên Mobile' : 'Quản lý Web'})</span>
                      </div>
                    );
                  }

                  if (isPickingStage) {
                    return (
                      <button
                        onClick={() => navigate(`/picking?orderId=${order.id}`)}
                        style={{
                          backgroundColor: '#0284c7',
                          color: '#ffffff',
                          border: 'none',
                          padding: '11px',
                          borderRadius: '12px',
                          fontWeight: 800,
                          fontSize: '12.5px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)',
                        }}
                      >
                        <Compass size={16} /> Bắt Đầu Lộ Trình 3D Gom Hàng <ArrowRight size={15} />
                      </button>
                    );
                  }

                  if (isPackedStage) {
                    return (
                      <button
                        onClick={() => navigate(`/packing?orderId=${order.id}`)}
                        style={{
                          backgroundColor: '#9333ea',
                          color: '#ffffff',
                          border: 'none',
                          padding: '11px',
                          borderRadius: '12px',
                          fontWeight: 800,
                          fontSize: '12.5px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          boxShadow: '0 4px 12px rgba(147, 51, 234, 0.25)',
                        }}
                      >
                        <Package size={16} /> Bàn Đóng Gói & Dán Nhãn Tem <ArrowRight size={15} />
                      </button>
                    );
                  }

                  return (
                    <div style={{ fontSize: '12px', color: '#059669', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 0' }}>
                      <CheckCircle2 size={16} /> Đã hoàn tất trừ tồn kho vật lý
                    </div>
                  );
                })()}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
