import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShoppingCart, CheckCircle, Clock, Search, RefreshCw, 
  Package, MapPin, Truck, CheckCircle2, XCircle, 
  DollarSign, Copy, ChevronLeft, ChevronRight,
  Phone, CreditCard, X
} from 'lucide-react';
import { io } from 'socket.io-client';
import { useAuth } from '../contexts/AuthContext';

const ORDER_API = 'http://localhost:3004/orders';

interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  sku?: string;
}

interface CustomerOrder {
  id: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  deliveryMethod: string;
  paymentMethod: string;
  totalAmount: number;
  status: string;
  createdAt: string;
  updatedAt?: string;
  assignedWarehouseId?: string;
  assignedWarehouseCode?: string;
  assignedWarehouseName?: string;
  assignedDriverId?: string;
  assignedDriverName?: string;
  assignedDriverPhone?: string;
  assignedDriverPlate?: string;
  note?: string;
  items: OrderItem[];
}

export const GOVAP_DRIVERS = [
  {
    id: 'NV-GV05',
    name: 'Võ Minh Trí',
    phone: '0977112233',
    plate: '59-V1 888.99',
    type: '🛵 Xe Máy Thùng Lạnh',
    shift: 'Ca Sáng (06:00 - 14:00)',
    status: 'ACTIVE',
    rating: 4.95,
    activeCount: 1,
    zone: 'Gò Vấp - Bình Thạnh'
  },
  {
    id: 'NV-GV06',
    name: 'Nguyễn Văn Hùng',
    phone: '0909888111',
    plate: '59-G2 688.39',
    type: '🛵 Xe Máy Giao Siêu Tốc',
    shift: 'Ca Sáng (06:00 - 14:00)',
    status: 'ACTIVE',
    rating: 4.90,
    activeCount: 0,
    zone: 'Gò Vấp - Phú Nhuận'
  },
  {
    id: 'NV-GV07',
    name: 'Trần Quốc Bảo',
    phone: '0933445566',
    plate: '59-P1 456.78',
    type: '🛵 Xe Máy Thùng Mát',
    shift: 'Ca Chiều (14:00 - 22:00)',
    status: 'ACTIVE',
    rating: 4.85,
    activeCount: 2,
    zone: 'Gò Vấp - Tân Bình'
  },
  {
    id: 'NV-GV08',
    name: 'Phạm Hoàng Nam',
    phone: '0918776655',
    plate: '59-K1 234.56',
    type: '🛵 Xe Máy Thực Phẩm Tươi',
    shift: 'Ca Chiều (14:00 - 22:00)',
    status: 'ACTIVE',
    rating: 4.80,
    activeCount: 0,
    zone: 'Gò Vấp - Hóc Môn'
  },
  {
    id: 'NV-GV09',
    name: 'Lê Thanh Tùng',
    phone: '0966332211',
    plate: '59-X1 999.11',
    type: '🛵 Xe Máy Thùng Lạnh',
    shift: 'Ca Sáng (06:00 - 14:00)',
    status: 'ACTIVE',
    rating: 4.90,
    activeCount: 1,
    zone: 'Quang Trung - Phan Văn Trị'
  },
  {
    id: 'NV-GV10',
    name: 'Đặng Hữu Phúc',
    phone: '0944778899',
    plate: '59-T2 777.88',
    type: '🛵 Xe Máy Giao Nhanh',
    shift: 'Ca Chiều (14:00 - 22:00)',
    status: 'ACTIVE',
    rating: 4.75,
    activeCount: 0,
    zone: 'Nguyễn Oanh - Lê Đức Thọ'
  }
];

const STATUS_MAP: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode; border: string }> = {
  PENDING: { label: 'Chờ xử lý', color: '#b45309', bg: '#fef3c7', icon: <Clock size={14} />, border: '#fde68a' },
  PROCESSING: { label: 'Đã duyệt', color: '#1d4ed8', bg: '#dbeafe', icon: <CheckCircle size={14} />, border: '#bfdbfe' },
  PICKING: { label: 'Đang gom hàng', color: '#6d28d9', bg: '#ede9fe', icon: <Package size={14} />, border: '#ddd6fe' },
  PACKING: { label: 'Đang đóng gói', color: '#0f766e', bg: '#ccfbf1', icon: <Package size={14} />, border: '#99f6e4' },
  DELIVERING: { label: 'Đang giao hàng', color: '#0369a1', bg: '#e0f2fe', icon: <Truck size={14} />, border: '#bae6fd' },
  COMPLETED: { label: 'Hoàn thành', color: '#15803d', bg: '#dcfce7', icon: <CheckCircle2 size={14} />, border: '#bbf7d0' },
  CANCELLED: { label: 'Đã hủy', color: '#be123c', bg: '#ffe4e6', icon: <XCircle size={14} />, border: '#fecdd3' },
};

const OrderManagement: React.FC = () => {
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  // Toast feedback state
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Advanced Filters
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedWhFilter, setSelectedWhFilter] = useState<string>(
    user?.role === 'WAREHOUSE_MANAGER' && user?.warehouseCode ? user.warehouseCode : 'ALL'
  );
  const [dateRangeFilter, setDateRangeFilter] = useState<string>('ALL');

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 8;

  // Copied alert feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const showToast = useCallback((text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  }, []);

  // Dispatch Driver Modal State
  const [dispatchOrderModal, setDispatchOrderModal] = useState<CustomerOrder | null>(null);

  const handleAssignDriverSubmit = useCallback(async (orderId: string, driver: typeof GOVAP_DRIVERS[0]) => {
    // 1. Instant local optimistic update
    setOrders(prev => prev.map(o => o.id === orderId ? {
      ...o,
      assignedDriverId: driver.id,
      assignedDriverName: driver.name,
      assignedDriverPhone: driver.phone,
      assignedDriverPlate: driver.plate,
      status: o.status === 'PENDING' ? 'PROCESSING' : o.status
    } : o));

    showToast(`🛵 Đã phân công đơn cho shipper ${driver.name} (${driver.plate})!`, 'success');
    setDispatchOrderModal(null);

    try {
      await fetch(`http://localhost:3004/orders/sync-status/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driverId: driver.id,
          driverName: driver.name,
          driverPhone: driver.phone,
          driverPlate: driver.plate,
          status: 'PROCESSING'
        }),
      });
    } catch (e) {
      console.error('Error assigning driver:', e);
    }
  }, [showToast]);

  // Silent fetch without resetting state or flashing spinners
  const fetchOrders = useCallback(async (showSpinner = false) => {
    if (showSpinner) setIsRefreshing(true);
    try {
      const res = await fetch(ORDER_API);
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setInitialLoading(false);
      if (showSpinner) setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders(false);

    // Socket.io connection for smooth real-time updates (no page refresh)
    const socket = io('http://localhost:3004');

    socket.on('connect', () => {
      console.log('Connected to order-service websocket');
    });

    socket.on('new_order', (newOrder: CustomerOrder) => {
      setOrders(prevOrders => {
        const existingIdx = prevOrders.findIndex(o => o.id === newOrder.id);
        if (existingIdx >= 0) {
          const next = [...prevOrders];
          next[existingIdx] = newOrder;
          return next;
        }
        return [newOrder, ...prevOrders];
      });
    });

    socket.on('order_status_updated', (updatedOrder: any) => {
      setOrders(prevOrders => {
        const clean = (updatedOrder.id || '').toLowerCase().replace(/^ecomm-/, '').replace(/^out-/, '').replace(/^ob-/, '');
        const existingIdx = prevOrders.findIndex(o => o.id.toLowerCase() === clean || o.id.toLowerCase().startsWith(clean.slice(0, 8)));
        if (existingIdx >= 0) {
          const next = [...prevOrders];
          next[existingIdx] = { ...next[existingIdx], ...updatedOrder, status: updatedOrder.status };
          return next;
        }
        return prevOrders;
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [fetchOrders]);

  // Optimistic In-Place Status Update (Zero full page refresh)
  const handleUpdateStatus = useCallback(async (orderId: string, newStatus: string) => {
    // 1. Instant local optimistic update
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    
    if (newStatus === 'COMPLETED') {
      showToast('🎉 Đã xác nhận Giao Hàng Thành Công! Đơn hàng hoàn tất & ghi nhận Thực Nhận.', 'success');
    } else {
      showToast(`Đã cập nhật trạng thái đơn hàng: ${STATUS_MAP[newStatus]?.label || newStatus}`, 'info');
    }

    try {
      const res = await fetch(`${ORDER_API}/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        // Also notify outbound-service
        if (newStatus === 'COMPLETED') {
          fetch(`http://localhost:3007/outbound-orders/sync-status/${orderId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'DELIVERED' })
          }).catch(() => {});
        }
      } else {
        fetchOrders(false); // Rollback on error
        showToast('Cập nhật trạng thái thất bại!', 'error');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      fetchOrders(false);
    }
  }, [fetchOrders, showToast]);

  const handleApproveOrder = useCallback(async (targetOrder: CustomerOrder) => {
    if (!targetOrder) return;

    // Optimistic status update
    setOrders(prev => prev.map(o => o.id === targetOrder.id ? { ...o, status: 'PICKING' } : o));
    showToast(`✅ Đã duyệt đơn #${targetOrder.id.slice(0, 8).toUpperCase()} & tạo lệnh xuất kho FEFO!`, 'success');

    try {
      const whCode = (targetOrder as any).assignedWarehouseCode || (targetOrder as any).assignedWarehouseId || (targetOrder.assignedWarehouseName?.includes('Gò Vấp') ? 'WH-006' : 'WH-001');

      await fetch(`http://localhost:3007/outbound-orders`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({
          orderCode: `ECOMM-${targetOrder.id.slice(0, 8).toUpperCase()}`,
          warehouseCode: whCode,
          warehouseId: whCode,
          requestedBy: user?.id || 'mgr-govap',
          requesterName: targetOrder.customerName,
          destination: targetOrder.customerAddress,
          notes: `Đơn hàng Online: KH ${targetOrder.customerName} (${targetOrder.customerPhone}) [ORDER_ID:${targetOrder.id}]`,
          items: targetOrder.items.map(i => ({
            sku: i.sku || i.productId,
            productName: i.productName,
            requestedQuantity: i.quantity,
          })),
        })
      });

      await fetch(`${ORDER_API}/${targetOrder.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'PICKING' }),
      });
    } catch (err) {
      console.error(err);
    }
  }, [token, user, showToast]);

  const handleCancelOrder = useCallback(async (orderId: string) => {
    if (window.confirm('Bạn có chắc chắn muốn hủy đơn hàng này không?')) {
      handleUpdateStatus(orderId, 'CANCELLED');
    }
  }, [handleUpdateStatus]);

  const copyToClipboard = useCallback((text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  // Determine active warehouse target:
  const isManager = user?.role === 'WAREHOUSE_MANAGER';
  const managerWh = user?.warehouseCode || (user?.email?.includes('govap') ? 'WH-006' : null);
  const activeWh = isManager ? (managerWh || 'WH-006') : selectedWhFilter;

  // Memoized KPIs (Zero unnecessary re-renders)
  const kpiStats = useMemo(() => {
    const relevantOrders = orders.filter(o => {
      if (!activeWh || activeWh === 'ALL') return true;
      const isGoVap = activeWh === 'WH-006' || activeWh.toLowerCase().includes('gò vấp');
      return (o as any).assignedWarehouseCode === activeWh ||
             (o as any).assignedWarehouseId === activeWh ||
             (o.assignedWarehouseName && o.assignedWarehouseName.toUpperCase().includes(activeWh.toUpperCase())) ||
             (isGoVap && o.assignedWarehouseName && o.assignedWarehouseName.toLowerCase().includes('gò vấp'));
    });

    const total = relevantOrders.length;
    const pending = relevantOrders.filter(o => o.status === 'PENDING').length;
    const processing = relevantOrders.filter(o => ['PROCESSING', 'PICKING', 'PACKING'].includes(o.status)).length;
    const delivering = relevantOrders.filter(o => o.status === 'DELIVERING').length;
    const completed = relevantOrders.filter(o => o.status === 'COMPLETED').length;
    
    // Total gross revenue vs Realized revenue
    const nonCancelledOrders = relevantOrders.filter(o => o.status !== 'CANCELLED');
    const totalRevenue = nonCancelledOrders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);
    const realizedRevenue = relevantOrders
      .filter(o => o.status === 'COMPLETED')
      .reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);

    return { total, pending, processing, delivering, completed, totalRevenue, realizedRevenue };
  }, [orders, activeWh]);

  // Memoized Filtered Orders
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch = 
        !q ||
        o.id.toLowerCase().includes(q) ||
        o.customerName?.toLowerCase().includes(q) ||
        o.customerPhone?.includes(q) ||
        o.assignedWarehouseName?.toLowerCase().includes(q) ||
        o.customerAddress?.toLowerCase().includes(q) ||
        o.items?.some(i => i.productName?.toLowerCase().includes(q) || i.sku?.toLowerCase().includes(q));

      // Warehouse filter
      let matchWh = true;
      if (activeWh && activeWh !== 'ALL') {
        const isGoVap = activeWh === 'WH-006' || activeWh.toLowerCase().includes('gò vấp');
        matchWh = Boolean(
          (o as any).assignedWarehouseCode === activeWh || 
          (o as any).assignedWarehouseId === activeWh ||
          (o.assignedWarehouseName && o.assignedWarehouseName.toUpperCase().includes(activeWh.toUpperCase())) ||
          (isGoVap && o.assignedWarehouseName && o.assignedWarehouseName.toLowerCase().includes('gò vấp'))
        );
      }

      // Status filter
      let matchStatus = true;
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'IN_PROGRESS') {
          matchStatus = ['PROCESSING', 'PICKING', 'PACKING'].includes(o.status);
        } else {
          matchStatus = o.status === statusFilter;
        }
      }

      // Date Range filter
      let matchDate = true;
      if (dateRangeFilter !== 'ALL' && o.createdAt) {
        const orderDate = new Date(o.createdAt);
        const now = new Date();
        if (dateRangeFilter === 'TODAY') {
          matchDate = orderDate.toDateString() === now.toDateString();
        } else if (dateRangeFilter === 'WEEK') {
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(now.getDate() - 7);
          matchDate = orderDate >= sevenDaysAgo;
        } else if (dateRangeFilter === 'MONTH') {
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(now.getDate() - 30);
          matchDate = orderDate >= thirtyDaysAgo;
        }
      }

      return matchSearch && matchWh && matchStatus && matchDate;
    });
  }, [orders, searchQuery, activeWh, statusFilter, dateRangeFilter]);

  // Selected Order memoization (maintains user selection without resetting)
  const selectedOrder = useMemo(() => {
    if (!filteredOrders.length) return null;
    if (selectedOrderId) {
      const match = filteredOrders.find(o => o.id === selectedOrderId);
      if (match) return match;
    }
    return filteredOrders[0];
  }, [filteredOrders, selectedOrderId]);

  // Pagination slicing
  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / pageSize));
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredOrders.slice(start, start + pageSize);
  }, [filteredOrders, currentPage]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '24px', background: '#f8fafc', minHeight: '100vh', position: 'relative' }}>
      
      {/* Toast Notification Floating Banner */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          zIndex: 9999,
          background: toastMessage.type === 'success' ? '#0f766e' : toastMessage.type === 'error' ? '#be123c' : '#1e293b',
          color: '#fff',
          padding: '12px 20px',
          borderRadius: '12px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '0.9rem',
          fontWeight: 700,
          animation: 'slideIn 0.2s ease-out'
        }}>
          <CheckCircle2 size={18} />
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '20px 24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: '#fff7ed', padding: '10px', borderRadius: '12px', color: '#ea580c' }}>
              <ShoppingCart size={26} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Quản lý Đơn hàng Khách hàng
              </h2>
              <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '2px 0 0 0' }}>
                {isManager
                  ? `📍 Tiếp nhận & phân phối đơn hàng trực tiếp cho ${user?.warehouseCode === 'WH-006' ? 'Kho Hàng Gò Vấp (WH-006)' : user?.warehouseCode}`
                  : 'Tiếp nhận đơn hàng từ Customer Web, duyệt đơn, kích hoạt luồng xuất kho FEFO và theo dõi vận chuyển.'}
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Warehouse Selector for Admin */}
          {!isManager && (
            <select
              value={selectedWhFilter}
              onChange={e => setSelectedWhFilter(e.target.value)}
              style={{
                padding: '9px 14px',
                borderRadius: '10px',
                border: '1px solid #0f766e',
                background: '#f0fdfa',
                color: '#0f766e',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer'
              }}
            >
              <option value="ALL">🏢 Tất cả các Kho ({orders.length} đơn)</option>
              <option value="WH-006">🏢 Kho Gò Vấp (WH-006)</option>
              <option value="WH-001">🏢 Kho Quận 12 (WH-001)</option>
              <option value="WH-002">🏢 Kho Thủ Đức (WH-002)</option>
              <option value="WH-005">🏢 Kho Bình Thạnh (WH-005)</option>
            </select>
          )}

          {/* Date Filter */}
          <select
            value={dateRangeFilter}
            onChange={e => setDateRangeFilter(e.target.value)}
            style={{
              padding: '9px 14px',
              borderRadius: '10px',
              border: '1px solid #cbd5e1',
              background: '#fff',
              color: '#334155',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            <option value="ALL">📅 Toàn thời gian</option>
            <option value="TODAY">📅 Hôm nay</option>
            <option value="WEEK">📅 7 ngày qua</option>
            <option value="MONTH">📅 Tháng này</option>
          </select>

          <button
            onClick={() => fetchOrders(true)}
            style={{ padding: '9px 16px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, fontSize: '0.85rem' }}
          >
            <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} /> Cập nhật
          </button>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '14px' }}>
        <div style={{ background: '#fff', padding: '16px', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '0.8rem', fontWeight: 700 }}>
            <span>TỔNG ĐƠN HÀNG</span>
            <ShoppingCart size={16} color="#3b82f6" />
          </div>
          <p style={{ fontSize: '1.6rem', fontWeight: 800, color: '#1e293b', margin: '8px 0 0 0' }}>{kpiStats.total}</p>
        </div>

        <div style={{ background: '#fffbeb', padding: '16px', borderRadius: '14px', border: '1px solid #fde68a' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#b45309', fontSize: '0.8rem', fontWeight: 700 }}>
            <span>CHỜ TIẾP NHẬN</span>
            <Clock size={16} color="#f59e0b" />
          </div>
          <p style={{ fontSize: '1.6rem', fontWeight: 800, color: '#b45309', margin: '8px 0 0 0' }}>{kpiStats.pending}</p>
        </div>

        <div style={{ background: '#faf5ff', padding: '16px', borderRadius: '14px', border: '1px solid #ddd6fe' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#6d28d9', fontSize: '0.8rem', fontWeight: 700 }}>
            <span>ĐANG GOM & ĐÓNG GÓI</span>
            <Package size={16} color="#8b5cf6" />
          </div>
          <p style={{ fontSize: '1.6rem', fontWeight: 800, color: '#6d28d9', margin: '8px 0 0 0' }}>{kpiStats.processing}</p>
        </div>

        <div style={{ background: '#f0f9ff', padding: '16px', borderRadius: '14px', border: '1px solid #bae6fd' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#0369a1', fontSize: '0.8rem', fontWeight: 700 }}>
            <span>ĐANG GIAO HÀNG</span>
            <Truck size={16} color="#0284c7" />
          </div>
          <p style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0369a1', margin: '8px 0 0 0' }}>{kpiStats.delivering}</p>
        </div>

        <div style={{ background: '#f0fdf4', padding: '16px', borderRadius: '14px', border: '1px solid #bbf7d0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#15803d', fontSize: '0.8rem', fontWeight: 700 }}>
            <span>HOÀN THÀNH</span>
            <CheckCircle2 size={16} color="#22c55e" />
          </div>
          <p style={{ fontSize: '1.6rem', fontWeight: 800, color: '#15803d', margin: '8px 0 0 0' }}>{kpiStats.completed}</p>
        </div>

        {/* Separated Revenue vs Realized Cash Card */}
        <div style={{ background: '#fff7ed', padding: '16px 20px', borderRadius: '14px', border: '1px solid #fed7aa', minWidth: '280px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#c2410c', fontSize: '0.8rem', fontWeight: 800 }}>
            <span>DOANH THU & THỰC NHẬN</span>
            <DollarSign size={18} color="#ea580c" />
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginTop: '8px' }}>
            <div>
              <p style={{ fontSize: '0.72rem', color: '#9a3412', margin: 0, fontWeight: 700, textTransform: 'uppercase' }}>
                Tổng Doanh Thu
              </p>
              <p style={{ fontSize: '1.25rem', fontWeight: 900, color: '#ea580c', margin: '2px 0 0 0' }}>
                {kpiStats.totalRevenue.toLocaleString('vi-VN')} ₫
              </p>
            </div>

            <div style={{ borderLeft: '2px solid #fed7aa', paddingLeft: '14px' }}>
              <p style={{ fontSize: '0.72rem', color: '#15803d', margin: 0, fontWeight: 800, textTransform: 'uppercase' }}>
                💰 Thực Nhận
              </p>
              <p style={{ fontSize: '1.25rem', fontWeight: 900, color: '#16a34a', margin: '2px 0 0 0' }}>
                {kpiStats.realizedRevenue.toLocaleString('vi-VN')} ₫
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1.9fr', gap: '20px', minHeight: '650px' }}>
        
        {/* Left Column: Order List with Tabs & Search */}
        <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          
          {/* Status Tabs */}
          <div style={{ display: 'flex', gap: '4px', padding: '12px 14px', borderBottom: '1px solid #f1f5f9', overflowX: 'auto', background: '#fafafa' }}>
            {[
              { key: 'ALL', label: 'Tất cả' },
              { key: 'PENDING', label: 'Chờ xử lý' },
              { key: 'IN_PROGRESS', label: 'Đang xử lý' },
              { key: 'DELIVERING', label: 'Đang giao' },
              { key: 'COMPLETED', label: 'Hoàn thành' },
              { key: 'CANCELLED', label: 'Đã hủy' }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  background: statusFilter === tab.key ? '#0f766e' : 'transparent',
                  color: statusFilter === tab.key ? '#fff' : '#64748b',
                  transition: 'all 0.15s ease'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Bar */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f1f5f9', padding: '8px 12px', borderRadius: '10px' }}>
              <Search size={16} color="#64748b" />
              <input 
                type="text" 
                placeholder="Tìm mã đơn, tên KH, SĐT, SP, địa chỉ..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '0.85rem' }}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
          
          {/* Order Cards List */}
          <div style={{ flex: 1, overflowY: 'auto', maxHeight: '520px' }}>
            {initialLoading ? (
              <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
                <RefreshCw size={20} className="animate-spin" style={{ margin: '0 auto 8px' }} />
                Đang tải dữ liệu đơn hàng...
              </div>
            ) : filteredOrders.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: '#94a3b8' }}>
                <Package size={36} color="#cbd5e1" style={{ margin: '0 auto 10px' }} />
                <p style={{ margin: 0, fontWeight: 600 }}>Không tìm thấy đơn hàng nào</p>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px' }}>Thử thay đổi từ khóa hoặc bộ lọc trạng thái</p>
              </div>
            ) : (
              paginatedOrders.map(order => {
                const statusCfg = STATUS_MAP[order.status] || STATUS_MAP.PENDING;
                const isSelected = selectedOrder?.id === order.id;
                const isGoVap = order.assignedWarehouseName?.includes('Gò Vấp') || (order as any).assignedWarehouseId === 'WH-006';

                return (
                  <div 
                    key={order.id} 
                    onClick={() => setSelectedOrderId(order.id)}
                    style={{ 
                      padding: '14px 16px', 
                      borderBottom: '1px solid #f1f5f9', 
                      cursor: 'pointer',
                      background: isSelected ? (isGoVap ? '#f0fdfa' : '#fff7ed') : '#fff',
                      borderLeft: isSelected ? `4px solid ${isGoVap ? '#0f766e' : '#f97316'}` : '4px solid transparent',
                      transition: 'background 0.12s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.95rem' }}>{order.customerName}</span>
                        <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>#{order.id.slice(0, 8).toUpperCase()}</span>
                      </div>
                      <span style={{ 
                        fontSize: '0.72rem', padding: '3px 8px', borderRadius: '12px', 
                        background: statusCfg.bg, color: statusCfg.color, fontWeight: 700,
                        border: `1px solid ${statusCfg.border}`, display: 'flex', alignItems: 'center', gap: '3px'
                      }}>
                        {statusCfg.icon}
                        {statusCfg.label}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      📍 {order.customerAddress}
                    </div>

                    <div style={{ fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: isGoVap ? '#0f766e' : '#64748b', fontWeight: isGoVap ? 700 : 500 }}>
                        <Package size={13} color={isGoVap ? '#0f766e' : '#f97316'} />
                        {order.assignedWarehouseName || 'Kho Hàng Gò Vấp (WH-006)'}
                      </span>
                      <span style={{ fontWeight: 800, color: isGoVap ? '#0f766e' : '#ea580c', fontSize: '0.9rem' }}>
                        {Number(order.totalAmount).toLocaleString('vi-VN')} ₫
                      </span>
                    </div>

                    {order.assignedDriverName && (
                      <div style={{ marginTop: '6px', fontSize: '0.72rem', color: '#15803d', background: '#dcfce7', padding: '2px 8px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 700, border: '1px solid #bbf7d0' }}>
                        🛵 Shipper: {order.assignedDriverName} ({order.assignedDriverPlate})
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Pagination Footer */}
          {filteredOrders.length > 0 && (
            <div style={{ padding: '10px 16px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fafafa', fontSize: '0.8rem', color: '#64748b' }}>
              <span>
                Trang {currentPage} / {totalPages} ({filteredOrders.length} đơn)
              </span>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  style={{
                    padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1',
                    background: '#fff', cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
                    opacity: currentPage <= 1 ? 0.5 : 1
                  }}
                >
                  <ChevronLeft size={14} />
                </button>

                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  style={{
                    padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1',
                    background: '#fff', cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
                    opacity: currentPage >= totalPages ? 0.5 : 1
                  }}
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Detailed Order Inspector */}
        <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          {selectedOrder ? (
            <>
              {/* Detail Header Bar */}
              <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                      Đơn hàng #{selectedOrder.id.slice(0, 8).toUpperCase()}
                    </h3>
                    <button
                      onClick={() => copyToClipboard(selectedOrder.id, selectedOrder.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem' }}
                      title="Copy full UUID"
                    >
                      <Copy size={13} /> {copiedId === selectedOrder.id ? 'Đã copy!' : 'Copy ID'}
                    </button>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '4px 0 0 0' }}>
                    Ngày đặt: {new Date(selectedOrder.createdAt).toLocaleString('vi-VN')}
                  </p>
                </div>
                
                {/* Action Buttons based on order status */}
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                  {/* Always show Dispatch/Assign Driver button for active orders */}
                  {selectedOrder.status !== 'CANCELLED' && selectedOrder.status !== 'COMPLETED' && (
                    <button
                      onClick={() => setDispatchOrderModal(selectedOrder)}
                      style={{
                        padding: '9px 16px',
                        background: '#0d9488',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '0.85rem',
                        boxShadow: '0 2px 6px rgba(13,148,136,0.25)'
                      }}
                    >
                      <Truck size={16} /> 🛵 {selectedOrder.assignedDriverName ? 'Đổi Tài Xế' : 'Điều Phối / Phân Công Shipper'}
                    </button>
                  )}

                  {selectedOrder.status === 'PENDING' && (
                    <>
                      <button 
                        onClick={() => handleApproveOrder(selectedOrder)}
                        style={{ padding: '9px 18px', background: '#059669', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', boxShadow: '0 2px 6px rgba(5,150,105,0.25)' }}
                      >
                        <CheckCircle size={16} /> Duyệt đơn & Xuất kho
                      </button>
                      <button 
                        onClick={() => handleCancelOrder(selectedOrder.id)}
                        style={{ padding: '9px 14px', background: '#fff', color: '#be123c', border: '1px solid #fecdd3', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}
                      >
                        Hủy đơn
                      </button>
                    </>
                  )}

                  {(selectedOrder.status === 'PROCESSING' || selectedOrder.status === 'PICKING' || selectedOrder.status === 'PACKING') && (
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <button 
                        onClick={() => navigate('/outbound')}
                        style={{ padding: '9px 16px', background: '#0f766e', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', boxShadow: '0 2px 6px rgba(15,118,110,0.25)' }}
                      >
                        <Truck size={16} /> Đi tới mục Xuất kho (FEFO)
                      </button>
                      <button 
                        onClick={() => handleUpdateStatus(selectedOrder.id, 'COMPLETED')}
                        style={{ padding: '9px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', boxShadow: '0 2px 6px rgba(37,99,235,0.25)' }}
                      >
                        <CheckCircle2 size={16} /> Xác nhận Đã Giao Hàng
                      </button>
                    </div>
                  )}

                  {selectedOrder.status === 'DELIVERING' && (
                    <button 
                      onClick={() => handleUpdateStatus(selectedOrder.id, 'COMPLETED')}
                      style={{ padding: '9px 20px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', boxShadow: '0 4px 10px rgba(22,163,74,0.3)' }}
                    >
                      <CheckCircle2 size={18} /> Xác nhận Đã Giao Hàng Thành Công (Hoàn Tất)
                    </button>
                  )}

                  {selectedOrder.status === 'COMPLETED' && (
                    <span style={{ fontSize: '0.85rem', color: '#15803d', fontWeight: 800, background: '#dcfce7', padding: '6px 14px', borderRadius: '8px', border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <CheckCircle2 size={16} /> Đơn hàng đã hoàn thành & thu tiền
                    </span>
                  )}
                </div>
              </div>

              {/* Detail Content Body */}
              <div style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
                
                {/* Visual Order Progress Stepper */}
                <div style={{ marginBottom: '24px', background: '#fafafa', padding: '16px 20px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative' }}>
                    {[
                      { key: 'PENDING', label: '1. Tiếp nhận' },
                      { key: 'PICKING', label: '2. Gom hàng (FEFO)' },
                      { key: 'PACKING', label: '3. Đóng gói' },
                      { key: 'DELIVERING', label: '4. Vận chuyển' },
                      { key: 'COMPLETED', label: '5. Hoàn thành' }
                    ].map((step, idx) => {
                      const stepOrder = ['PENDING', 'PROCESSING', 'PICKING', 'PACKING', 'DELIVERING', 'COMPLETED'];
                      const currentIdx = stepOrder.indexOf(selectedOrder.status);
                      const stepIdx = stepOrder.indexOf(step.key);
                      const isDone = currentIdx >= stepIdx && selectedOrder.status !== 'CANCELLED';
                      const isCurrent = (step.key === selectedOrder.status) || (selectedOrder.status === 'PROCESSING' && step.key === 'PENDING');

                      return (
                        <div key={step.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2 }}>
                          <div style={{
                            width: '26px', height: '26px', borderRadius: '50%',
                            background: isDone ? '#0f766e' : '#e2e8f0',
                            color: isDone ? '#fff' : '#64748b',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.75rem', fontWeight: 700, marginBottom: '6px',
                            border: isCurrent ? '2px solid #0f766e' : 'none'
                          }}>
                            {isDone ? '✓' : idx + 1}
                          </div>
                          <span style={{ fontSize: '0.75rem', color: isDone ? '#0f766e' : '#94a3b8', fontWeight: isDone ? 700 : 500 }}>
                            {step.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 3 Grid Info Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '22px' }}>
                  <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                    <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0 0 4px 0', textTransform: 'uppercase', fontWeight: 700 }}>
                      Khách Hàng
                    </p>
                    <p style={{ fontWeight: 700, color: '#0f172a', margin: 0, fontSize: '0.95rem' }}>{selectedOrder.customerName}</p>
                    <p style={{ fontSize: '0.85rem', color: '#0f766e', margin: '4px 0 0 0', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                      <Phone size={13} /> {selectedOrder.customerPhone}
                    </p>
                  </div>

                  <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                    <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0 0 4px 0', textTransform: 'uppercase', fontWeight: 700 }}>
                      Địa Chỉ Giao Hàng
                    </p>
                    <p style={{ fontSize: '0.85rem', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'flex-start', gap: '5px' }}>
                      <MapPin size={15} color="#ea580c" style={{ marginTop: '2px', flexShrink: 0 }} />
                      <span>{selectedOrder.customerAddress}</span>
                    </p>
                  </div>

                  <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                    <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0 0 4px 0', textTransform: 'uppercase', fontWeight: 700 }}>
                      Kho Xử Lý & Thanh Toán
                    </p>
                    <p style={{ fontWeight: 700, color: '#0f766e', margin: 0, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Package size={14} /> {selectedOrder.assignedWarehouseName || 'Kho Gò Vấp (WH-006)'}
                    </p>
                    <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '4px 0 0 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <CreditCard size={13} /> {selectedOrder.paymentMethod === 'cod' ? 'Thanh toán COD khi nhận' : 'Chuyển khoản / Đã thanh toán'}
                    </p>
                  </div>

                  {/* 4th Card: Shipper Phân Công */}
                  <div style={{ background: selectedOrder.assignedDriverName ? '#f0fdf4' : '#fffbeb', padding: '14px', borderRadius: '12px', border: `1px solid ${selectedOrder.assignedDriverName ? '#bbf7d0' : '#fde68a'}` }}>
                    <p style={{ fontSize: '0.75rem', color: selectedOrder.assignedDriverName ? '#166534' : '#b45309', margin: '0 0 4px 0', textTransform: 'uppercase', fontWeight: 700, display: 'flex', justifyContent: 'space-between' }}>
                      <span>🛵 Shipper Điều Phối</span>
                      {selectedOrder.assignedDriverName && <span style={{ fontSize: '0.7rem', color: '#16a34a', fontWeight: 800 }}>ĐÃ GÁN</span>}
                    </p>
                    {selectedOrder.assignedDriverName ? (
                      <>
                        <p style={{ fontWeight: 800, color: '#15803d', margin: 0, fontSize: '0.95rem' }}>{selectedOrder.assignedDriverName}</p>
                        <p style={{ fontSize: '0.8rem', color: '#334155', margin: '3px 0 0 0', fontWeight: 600 }}>
                          Biển số: <span style={{ color: '#0f766e', fontWeight: 800 }}>{selectedOrder.assignedDriverPlate}</span>
                        </p>
                        <p style={{ fontSize: '0.8rem', color: '#0369a1', margin: '2px 0 0 0', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                          <Phone size={12} /> {selectedOrder.assignedDriverPhone}
                        </p>
                      </>
                    ) : (
                      <>
                        <p style={{ fontWeight: 600, color: '#b45309', margin: 0, fontSize: '0.85rem' }}>Chưa phân công tài xế</p>
                        <button 
                          onClick={() => setDispatchOrderModal(selectedOrder)}
                          style={{ marginTop: '6px', padding: '4px 10px', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                        >
                          + Phân công ngay
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Items Table */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                    Danh sách Sản phẩm ({selectedOrder.items?.length || 0})
                  </h4>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    Tổng số lượng: <b>{selectedOrder.items?.reduce((s, i) => s + (i.quantity || 1), 0)} món</b>
                  </span>
                </div>

                <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', marginBottom: '20px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                    <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      <tr>
                        <th style={{ padding: '10px 14px', color: '#64748b', fontWeight: 700 }}>Sản phẩm</th>
                        <th style={{ padding: '10px 14px', color: '#64748b', fontWeight: 700 }}>Mã SKU</th>
                        <th style={{ padding: '10px 14px', color: '#64748b', fontWeight: 700, textAlign: 'right' }}>Đơn giá</th>
                        <th style={{ padding: '10px 14px', color: '#64748b', fontWeight: 700, textAlign: 'center' }}>SL</th>
                        <th style={{ padding: '10px 14px', color: '#64748b', fontWeight: 700, textAlign: 'right' }}>Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedOrder.items?.map((item, idx) => (
                        <tr key={idx} style={{ borderTop: idx > 0 ? '1px solid #f1f5f9' : 'none' }}>
                          <td style={{ padding: '12px 14px', fontWeight: 600, color: '#0f172a' }}>
                            {item.productName}
                          </td>
                          <td style={{ padding: '12px 14px', color: '#64748b', fontFamily: 'monospace' }}>
                            {item.sku || 'SKU-01'}
                          </td>
                          <td style={{ padding: '12px 14px', color: '#64748b', textAlign: 'right' }}>
                            {Number(item.price).toLocaleString('vi-VN')} ₫
                          </td>
                          <td style={{ padding: '12px 14px', fontWeight: 700, textAlign: 'center' }}>
                            x{item.quantity}
                          </td>
                          <td style={{ padding: '12px 14px', fontWeight: 800, color: '#ea580c', textAlign: 'right' }}>
                            {Number(item.price * item.quantity).toLocaleString('vi-VN')} ₫
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Total Summary Footer */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff7ed', padding: '16px 20px', borderRadius: '12px', border: '1px solid #ffedd5' }}>
                  <div>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#9a3412', fontWeight: 700 }}>HÌNH THỨC VẬN CHUYỂN</p>
                    <p style={{ margin: '2px 0 0 0', fontSize: '0.85rem', color: '#431407', fontWeight: 600 }}>Giao hàng hỏa tốc nội thành</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '0.8rem', color: '#9a3412', margin: 0, fontWeight: 600 }}>TỔNG THANH TOÁN</p>
                    <p style={{ fontSize: '1.4rem', fontWeight: 900, color: '#ea580c', margin: '2px 0 0 0' }}>
                      {Number(selectedOrder.totalAmount).toLocaleString('vi-VN')} ₫
                    </p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: '#94a3b8', margin: 'auto' }}>
              <ShoppingCart size={48} color="#cbd5e1" style={{ margin: '0 auto 12px' }} />
              <p style={{ fontWeight: 700, fontSize: '1rem', color: '#64748b' }}>Chọn một đơn hàng để xem chi tiết</p>
              <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '4px' }}>Duyệt đơn, kích hoạt luồng xuất kho FEFO và theo dõi vận chuyển</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Phân Công / Điều Phối Tài Xế (Assign Driver Modal) */}
      {dispatchOrderModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: '#fff',
            borderRadius: '16px',
            maxWidth: '680px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
            border: '1px solid #e2e8f0'
          }}>
            {/* Header */}
            <div style={{ padding: '18px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0f766e', color: '#fff', borderRadius: '16px 16px 0 0' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Truck size={20} /> Điều Phối & Phân Công Shipper Giao Hàng
                </h3>
                <p style={{ margin: '3px 0 0 0', fontSize: '0.8rem', opacity: 0.9 }}>
                  Đơn #{dispatchOrderModal.id.slice(0, 8).toUpperCase()} • Kho Gò Vấp (WH-006)
                </p>
              </div>
              <button 
                onClick={() => setDispatchOrderModal(null)}
                style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div style={{ padding: '20px 24px' }}>
              {/* Order summary snippet */}
              <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span><b>Khách hàng:</b> {dispatchOrderModal.customerName} ({dispatchOrderModal.customerPhone})</span>
                  <span style={{ fontWeight: 800, color: '#ea580c' }}>{Number(dispatchOrderModal.totalAmount).toLocaleString('vi-VN')} ₫</span>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>
                  📍 {dispatchOrderModal.customerAddress}
                </div>
              </div>

              <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: '#0f172a', fontWeight: 700 }}>
                Chọn Shipper Xe Máy Thùng Lạnh Phụ Trách:
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {GOVAP_DRIVERS.map(driver => {
                  const isCurrentAssigned = dispatchOrderModal.assignedDriverId === driver.id;

                  return (
                    <div 
                      key={driver.id}
                      style={{
                        border: isCurrentAssigned ? '2px solid #0f766e' : '1px solid #e2e8f0',
                        borderRadius: '12px',
                        padding: '12px 16px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: isCurrentAssigned ? '#f0fdfa' : '#fff',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '50%',
                          background: '#0f766e15',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1.2rem'
                        }}>
                          🛵
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.95rem' }}>{driver.name}</span>
                            <span style={{ fontSize: '0.75rem', background: '#e0f2fe', color: '#0369a1', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>{driver.plate}</span>
                            <span style={{ fontSize: '0.72rem', color: '#eab308', fontWeight: 700 }}>★ {driver.rating}</span>
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                            {driver.type} • {driver.shift} • Tuyến: <b>{driver.zone}</b>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '0.75rem', color: driver.activeCount > 0 ? '#ea580c' : '#16a34a', fontWeight: 600, background: driver.activeCount > 0 ? '#fff7ed' : '#f0fdf4', padding: '3px 8px', borderRadius: '6px', border: `1px solid ${driver.activeCount > 0 ? '#ffedd5' : '#bbf7d0'}` }}>
                          {driver.activeCount > 0 ? `${driver.activeCount} đơn đang giao` : 'Sẵn sàng nhận đơn'}
                        </span>
                        
                        <button
                          onClick={() => handleAssignDriverSubmit(dispatchOrderModal.id, driver)}
                          style={{
                            padding: '7px 14px',
                            background: isCurrentAssigned ? '#0f766e' : '#2563eb',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: 700,
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                          }}
                        >
                          {isCurrentAssigned ? '✓ Đang phân công' : 'Phân công ngay'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderManagement;
