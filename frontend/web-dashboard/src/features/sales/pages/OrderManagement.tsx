import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShoppingCart, CheckCircle, Clock, Search, RefreshCw, 
  Package, PackageCheck, MapPin, Truck, CheckCircle2, XCircle, 
  DollarSign, Copy, ChevronLeft, ChevronRight,
  Phone, CreditCard, X, Printer, FileText, Check,
  Camera, ExternalLink
} from 'lucide-react';
import { io } from 'socket.io-client';
import { useAuth } from '@/features/auth';
import { getApiHost } from '@/shared';
import { PrintOrderSlipModal, detectSlipClassification } from '@/features/outbound';
import { OutboundReceiptModal } from '@/features/outbound';

const ORDER_API = `${getApiHost(3004)}/orders`;

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
  podPhotoUrl?: string;
  failurePhotoUrl?: string;
  failureReason?: string;
  note?: string;
  items: OrderItem[];
}

export const GOVAP_DRIVERS = [
  // ── 1. Đội Xe Tải & Bán Tải (Chuyên đơn sỉ, cồng kềnh, chuyển kho, xuất tiêu hủy môi trường) ──
  {
    id: 'NV-TK01',
    name: 'Đặng Hoàng Phúc (Tài xế Xe Tải)',
    phone: '0944778899',
    plate: '51D-892.45',
    type: 'Xe Tải Lạnh 2.5 Tấn (Hàng Sỉ / Tiêu Hủy / Chuyển Kho)',
    vehicleCategory: 'TRUCK',
    maxCapacityKg: 2500,
    warehouseCode: 'WH-006',
    warehouseName: 'Kho Gò Vấp',
    shift: 'Toàn ca (07:00 - 19:00)',
    status: 'ACTIVE',
    rating: 4.98,
    activeCount: 1,
    zone: 'Toàn TP.HCM & Trạm Tiêu Hủy Môi Trường'
  },
  {
    id: 'NV-VAN01',
    name: 'Phan Hữu Nam (Tài xế Bán Tải)',
    phone: '0918776655',
    plate: '51C-734.12',
    type: 'Xe Bán Tải Thùng Kín 1.5 Tấn (Đơn Lớn > 30kg)',
    vehicleCategory: 'VAN',
    maxCapacityKg: 1500,
    warehouseCode: 'WH-006',
    warehouseName: 'Kho Gò Vấp',
    shift: 'Ca Sáng (06:00 - 14:00)',
    status: 'ACTIVE',
    rating: 4.90,
    activeCount: 0,
    zone: 'Gò Vấp - Quận 12 - Tân Bình'
  },

  // ── 2. Đội Xe Máy Thùng Lạnh & Giao Nhanh (Đơn E-commerce khách hàng lẻ < 20kg) ──
  {
    id: 'NV-GV05',
    name: 'Võ Minh Trí',
    phone: '0977112233',
    plate: '59-V1 888.99',
    type: 'Xe Máy Thùng Lạnh (0-4°C)',
    vehicleCategory: 'MOTORBIKE',
    maxCapacityKg: 30,
    warehouseCode: 'WH-006',
    warehouseName: 'Kho Gò Vấp',
    shift: 'Ca Sáng (06:00 - 14:00)',
    status: 'ACTIVE',
    rating: 4.95,
    activeCount: 2,
    zone: 'Gò Vấp - Bình Thạnh'
  },
  {
    id: 'NV-GV06',
    name: 'Nguyễn Văn Hùng',
    phone: '0909888111',
    plate: '59-G2 688.39',
    type: 'Xe Máy Giao Siêu Tốc',
    vehicleCategory: 'MOTORBIKE',
    maxCapacityKg: 25,
    warehouseCode: 'WH-006',
    warehouseName: 'Kho Gò Vấp',
    shift: 'Ca Sáng (06:00 - 14:00)',
    status: 'ACTIVE',
    rating: 4.90,
    activeCount: 1,
    zone: 'Gò Vấp - Phú Nhuận'
  },
  {
    id: 'NV-GV07',
    name: 'Trần Quốc Bảo',
    phone: '0933445566',
    plate: '59-P1 456.78',
    type: 'Xe Máy Thùng Mát (2-8°C)',
    vehicleCategory: 'MOTORBIKE',
    maxCapacityKg: 25,
    warehouseCode: 'WH-006',
    warehouseName: 'Kho Gò Vấp',
    shift: 'Ca Chiều (14:00 - 22:00)',
    status: 'ACTIVE',
    rating: 4.85,
    activeCount: 1,
    zone: 'Gò Vấp - Tân Bình'
  },
  {
    id: 'NV-GV09',
    name: 'Lê Thanh Tùng',
    phone: '0966332211',
    plate: '59-X1 999.11',
    type: 'Xe Máy Thùng Lạnh',
    vehicleCategory: 'MOTORBIKE',
    maxCapacityKg: 30,
    warehouseCode: 'WH-006',
    warehouseName: 'Kho Gò Vấp',
    shift: 'Ca Sáng (06:00 - 14:00)',
    status: 'ACTIVE',
    rating: 4.90,
    activeCount: 1,
    zone: 'Quang Trung - Phan Văn Trị'
  },

  // ── 3. Đội Xe Liên Kho (Inter-Hub Fleet Sharing - Hỗ trợ tuyến gần và hồi chuyến) ──
  {
    id: 'NV-BT01',
    name: 'Bùi Hoàng Long (Tài xế Bình Thạnh)',
    phone: '0988112244',
    plate: '59-S2 555.66',
    type: 'Xe Máy Thùng Lạnh (Liên Kho BT-GV)',
    vehicleCategory: 'MOTORBIKE',
    maxCapacityKg: 30,
    warehouseCode: 'WH-002',
    warehouseName: 'Kho Bình Thạnh',
    shift: 'Ca Sáng (06:00 - 14:00)',
    status: 'ACTIVE',
    rating: 4.90,
    activeCount: 0,
    zone: 'Bình Thạnh - Giáp ranh Gò Vấp'
  },
  {
    id: 'NV-TB01',
    name: 'Trương Gia Huy (Tài xế Tân Bình)',
    phone: '0977223344',
    plate: '59-H1 333.22',
    type: 'Xe Máy Thùng Lạnh (Liên Kho TB-GV)',
    vehicleCategory: 'MOTORBIKE',
    maxCapacityKg: 30,
    warehouseCode: 'WH-003',
    warehouseName: 'Kho Tân Bình',
    shift: 'Ca Chiều (14:00 - 22:00)',
    status: 'ACTIVE',
    rating: 4.88,
    activeCount: 0,
    zone: 'Tân Bình - Giáp ranh Gò Vấp'
  },
];

const STATUS_MAP: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode; border: string }> = {
  PENDING: { label: 'Chờ xử lý', color: '#b45309', bg: '#fef3c7', icon: <Clock size={14} />, border: '#fde68a' },
  PROCESSING: { label: 'Đã duyệt', color: '#1d4ed8', bg: '#dbeafe', icon: <CheckCircle size={14} />, border: '#bfdbfe' },
  PICKING: { label: 'Đang gom hàng', color: '#6d28d9', bg: '#ede9fe', icon: <Package size={14} />, border: '#ddd6fe' },
  PACKING: { label: 'Đang đóng gói', color: '#0f766e', bg: '#ccfbf1', icon: <Package size={14} />, border: '#99f6e4' },
  PACKED: { label: 'Đã đóng gói', color: '#0f766e', bg: '#ecfdf5', icon: <PackageCheck size={14} />, border: '#a7f3d0' },
  CONFIRMED: { label: 'Đã xuất kho', color: '#0284c7', bg: '#f0f9ff', icon: <CheckCircle2 size={14} />, border: '#bae6fd' },
  READY_FOR_DELIVERY: { label: 'Chờ giao hàng', color: '#c2410c', bg: '#fff7ed', icon: <Truck size={14} />, border: '#fed7aa' },
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
  const [classificationFilter, setClassificationFilter] = useState<'ALL' | 'SALE' | 'DISPOSAL' | 'RETURN' | 'TRANSFER'>('ALL');
  const [printSlipOrder, setPrintSlipOrder] = useState<any | null>(null);
  const [receiptSlipOrder, setReceiptSlipOrder] = useState<any | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 8;

  // Copied alert feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // POD Photo Preview Modal
  const [podPreviewPhoto, setPodPreviewPhoto] = useState<{
    url: string;
    title: string;
    orderCode: string;
    driverName?: string;
    address?: string;
  } | null>(null);

  const showToast = useCallback((text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  }, []);

  // Dispatch Driver Modal State
  const [dispatchOrderModal, setDispatchOrderModal] = useState<CustomerOrder | null>(null);

  // Close modals on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (dispatchOrderModal) setDispatchOrderModal(null);
        if (podPreviewPhoto) setPodPreviewPhoto(null);
        if (printSlipOrder) setPrintSlipOrder(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dispatchOrderModal, podPreviewPhoto, printSlipOrder]);

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

    socket.on('order_cancelled', (data: any) => {
      const targetId = (data?.orderId || data?.id || '').toLowerCase().replace(/^ecomm-/, '').replace(/^out-/, '').replace(/^ob-/, '');
      setOrders(prevOrders => {
        const existingIdx = prevOrders.findIndex(o => 
          o.id.toLowerCase() === targetId || 
          o.id.toLowerCase().startsWith(targetId.slice(0, 8)) ||
          (targetId.length >= 8 && o.id.toLowerCase().slice(0, 8) === targetId.slice(0, 8))
        );
        if (existingIdx >= 0) {
          const next = [...prevOrders];
          next[existingIdx] = { 
            ...next[existingIdx], 
            status: 'CANCELLED',
            cancelReason: data.cancelReason || next[existingIdx].cancelReason,
          };
          return next;
        }
        return prevOrders;
      });
      fetchOrders(false);
    });

    socket.on('outbound_order_updated', () => {
      fetchOrders(false);
    });

    // 2. Fast background polling fallback (every 2.5s) to guarantee instant status sync without F5
    const interval = setInterval(() => {
      fetchOrders(false);
    }, 2500);

    const onStorageChange = () => {
      fetchOrders(false);
    };
    window.addEventListener('storage', onStorageChange);

    return () => {
      socket.disconnect();
      clearInterval(interval);
      window.removeEventListener('storage', onStorageChange);
    };
  }, [fetchOrders]);

  // Optimistic In-Place Status Update (Zero full page refresh)
  const handleUpdateStatus = useCallback(async (orderId: string, newStatus: string) => {
    // 1. Instant local optimistic update
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    
    if (newStatus === 'COMPLETED') {
      showToast('Đã xác nhận giao hàng thành công. Đơn hàng hoàn tất & ghi nhận thực nhận.', 'success');
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
    showToast(`Đã duyệt đơn #${targetOrder.id.slice(0, 8).toUpperCase()} & tạo lệnh xuất kho ưu tiên hạn dùng.`, 'success');

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
    const target = orders.find(o => o.id === orderId);
    if (target?.status === 'DELIVERING') {
      showToast('Đơn hàng đang trong trạng thái đang giao hàng, không thể hủy đơn lúc này.', 'warning');
      return;
    }
    const reason = window.prompt('Nhập lý do hủy đơn hàng:', 'Khách hàng liên hệ yêu cầu hủy');
    if (reason === null) return;

    try {
      const res = await fetch(`${ORDER_API}/${orderId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason || 'Nhân viên hủy đơn', cancelledBy: 'STAFF' }),
      });
      if (res.ok) {
        showToast('Đã hủy đơn hàng thành công và giải phóng hoàn tồn kho.', 'success');
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'CANCELLED' } : o));
        setSelectedOrder(prev => prev && prev.id === orderId ? { ...prev, status: 'CANCELLED' } : prev);
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.message || 'Không thể hủy đơn hàng.', 'error');
      }
    } catch (e) {
      showToast('Lỗi kết nối khi gửi yêu cầu hủy đơn.', 'error');
    }
  }, [orders, showToast]);

  const handleAssignDriverSubmit = useCallback(async (orderId: string, driver: any) => {
    try {
      // 1. Optimistic local update
      setOrders(prev => prev.map(o => o.id === orderId ? {
        ...o,
        assignedDriverId: driver.id,
        assignedDriverName: driver.name,
        assignedDriverPhone: driver.phone,
        assignedDriverPlate: driver.plate,
        status: o.status === 'PENDING' ? 'READY_FOR_DELIVERY' : o.status,
      } : o));

      // 2. Save to localStorage for instant cross-tab sync with Driver App
      try {
        const stored = localStorage.getItem('sfwms_driver_assignments') || '{}';
        const parsed = JSON.parse(stored);
        parsed[orderId] = driver;
        parsed[orderId.slice(0, 8)] = driver;
        parsed[`ECOMM-${orderId.slice(0, 8).toUpperCase()}`] = driver;
        localStorage.setItem('sfwms_driver_assignments', JSON.stringify(parsed));
      } catch (e) {}

      // 3. Send PUT request to backend order-service :3004
      await fetch(`${ORDER_API}/${orderId}/assign-driver`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driverId: driver.id,
          driverName: driver.name,
          driverPhone: driver.phone,
          driverPlate: driver.plate,
          status: 'READY_FOR_DELIVERY',
        }),
      }).catch(() => {});

      await fetch(`${ORDER_API}/sync-status/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driverId: driver.id,
          driverName: driver.name,
          driverPhone: driver.phone,
          driverPlate: driver.plate,
          status: 'READY_FOR_DELIVERY',
        }),
      }).catch(() => {});

      showToast(`Đã phân công tài xế ${driver.name} (${driver.plate}) cho đơn #${orderId.slice(0, 8).toUpperCase()}.`, 'success');
      setDispatchOrderModal(null);
      fetchOrders(false);
    } catch (err) {
      showToast('Có lỗi khi phân công tài xế', 'error');
    }
  }, [fetchOrders, showToast]);

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
          matchStatus = ['PROCESSING', 'PICKING', 'PACKING', 'PACKED', 'CONFIRMED', 'READY_FOR_DELIVERY'].includes(o.status);
        } else if (statusFilter === 'PACKED') {
          matchStatus = ['PACKED', 'CONFIRMED', 'READY_FOR_DELIVERY'].includes(o.status);
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

      // Classification filter
      if (classificationFilter !== 'ALL') {
        const cls = detectSlipClassification(o as any);
        if (cls !== classificationFilter) return false;
      }

      return matchSearch && matchWh && matchStatus && matchDate;
    });
  }, [orders, searchQuery, activeWh, statusFilter, classificationFilter, dateRangeFilter]);

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
                  ? `Tiếp nhận & phân phối đơn hàng trực tiếp cho ${user?.warehouseCode === 'WH-006' ? 'Kho Hàng Gò Vấp (WH-006)' : user?.warehouseCode}`
                  : 'Tiếp nhận đơn hàng từ Khách hàng, duyệt đơn, kích hoạt xuất kho tự động và theo dõi vận chuyển.'}
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
                borderRadius: '8px',
                border: '1px solid #0f766e',
                background: '#f0fdfa',
                color: '#0f766e',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer'
              }}
            >
              <option value="ALL">Tất cả các Kho ({orders.length} đơn)</option>
              <option value="WH-006">Kho Gò Vấp (WH-006)</option>
              <option value="WH-001">Kho Quận 12 (WH-001)</option>
              <option value="WH-002">Kho Thủ Đức (WH-002)</option>
              <option value="WH-005">Kho Bình Thạnh (WH-005)</option>
            </select>
          )}

          {/* Date Filter */}
          <select
            value={dateRangeFilter}
            onChange={e => setDateRangeFilter(e.target.value)}
            style={{
              padding: '9px 14px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: '#fff',
              color: '#334155',
              fontWeight: 500,
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            <option value="ALL">Toàn thời gian</option>
            <option value="TODAY">Hôm nay</option>
            <option value="WEEK">7 ngày qua</option>
            <option value="MONTH">Tháng này</option>
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
              <p style={{ fontSize: '0.72rem', color: '#15803d', margin: 0, fontWeight: 700, textTransform: 'uppercase' }}>
                Thực Nhận
              </p>
              <p style={{ fontSize: '1.25rem', fontWeight: 700, color: '#16a34a', margin: '2px 0 0 0' }}>
                {kpiStats.realizedRevenue.toLocaleString('vi-VN')} ₫
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1.9fr', gap: '20px', minHeight: '650px' }}>
        
        {/* Left Column: Order List with Tabs & Search */}
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          
          {/* Status Tabs */}
          <div style={{ display: 'flex', gap: '4px', padding: '12px 14px', borderBottom: '1px solid #f1f5f9', overflowX: 'auto', background: '#fafafa' }}>
            {[
              { key: 'ALL', label: 'Tất cả' },
              { key: 'PENDING', label: 'Chờ xử lý' },
              { key: 'IN_PROGRESS', label: 'Đang xử lý' },
              { key: 'PACKED', label: 'Đã đóng gói' },
              { key: 'DELIVERING', label: 'Đang giao' },
              { key: 'COMPLETED', label: 'Hoàn thành' },
              { key: 'CANCELLED', label: 'Đã hủy' }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '0.8rem',
                  fontWeight: 600,
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

          {/* Classification Filter Chips */}
          <div style={{ display: 'flex', gap: '4px', padding: '8px 14px', borderBottom: '1px solid #f1f5f9', overflowX: 'auto', background: '#fff' }}>
            {[
              { key: 'ALL', label: 'Tất cả loại', color: '#0f172a' },
              { key: 'SALE', label: 'Mua bán lẻ', color: '#1d4ed8' },
              { key: 'DISPOSAL', label: 'Tiêu hủy', color: '#7c3aed' },
              { key: 'RETURN', label: 'Hoàn/Trả', color: '#b91c1c' },
              { key: 'TRANSFER', label: 'Điều chuyển', color: '#15803d' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setClassificationFilter(tab.key as any)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: classificationFilter === tab.key ? 'none' : '1px solid #e2e8f0',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  background: classificationFilter === tab.key ? tab.color : '#f8fafc',
                  color: classificationFilter === tab.key ? '#fff' : '#64748b',
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', gap: '4px', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.95rem' }}>{order.customerName}</span>
                        <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>#{order.id.slice(0, 8).toUpperCase()}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {(() => {
                          const cls = detectSlipClassification(order as any);
                          const b = {
                            SALE: { text: 'Bán Lẻ', bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
                            DISPOSAL: { text: 'Tiêu Hủy', bg: '#faf5ff', color: '#7c3aed', border: '#e9d5ff' },
                            RETURN: { text: 'Hoàn/Trả', bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' },
                            TRANSFER: { text: 'Điều Chuyển', bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
                          }[cls];
                          return (
                            <span style={{ fontSize: '0.68rem', padding: '2px 5px', borderRadius: '4px', background: b.bg, color: b.color, fontWeight: 600, border: `1px solid ${b.border}` }}>
                              {b.text}
                            </span>
                          );
                        })()}
                        <span style={{ 
                          fontSize: '0.72rem', padding: '3px 8px', borderRadius: '4px', 
                          background: statusCfg.bg, color: statusCfg.color, fontWeight: 600,
                          border: `1px solid ${statusCfg.border}`, display: 'flex', alignItems: 'center', gap: '3px'
                        }}>
                          {statusCfg.icon}
                          {statusCfg.label}
                        </span>
                        {order.podPhotoUrl && (
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              setPodPreviewPhoto({
                                url: order.podPhotoUrl!,
                                title: `Bằng chứng giao hàng #${order.id.slice(0, 8).toUpperCase()}`,
                                orderCode: order.id.slice(0, 8).toUpperCase(),
                                driverName: order.assignedDriverName,
                                address: order.customerAddress,
                              });
                            }}
                            title="Xem ảnh bàn giao POD từ tài xế"
                            style={{
                              fontSize: '0.68rem',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: '#f0fdf4',
                              color: '#166534',
                              fontWeight: 700,
                              border: '1px solid #bbf7d0',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              cursor: 'pointer',
                            }}
                          >
                            <Camera size={11} color="#166534" />
                            <span>POD</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {order.customerAddress}
                    </div>

                    <div style={{ fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: isGoVap ? '#0f766e' : '#64748b', fontWeight: isGoVap ? 600 : 500 }}>
                        <Package size={13} color={isGoVap ? '#0f766e' : '#f97316'} />
                        {order.assignedWarehouseName || 'Kho Hàng Gò Vấp (WH-006)'}
                      </span>
                      <span style={{ fontWeight: 700, color: isGoVap ? '#0f766e' : '#ea580c', fontSize: '0.9rem' }}>
                        {Number(order.totalAmount).toLocaleString('vi-VN')} ₫
                      </span>
                    </div>

                    {order.assignedDriverName && (
                      <div style={{ marginTop: '6px', fontSize: '0.72rem', color: '#15803d', background: '#dcfce7', padding: '2px 8px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600, border: '1px solid #bbf7d0' }}>
                        Tài xế: {order.assignedDriverName} ({order.assignedDriverPlate})
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
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  {/* Print Buttons */}
                  <button
                    onClick={() => setPrintSlipOrder(selectedOrder)}
                    style={{
                      padding: '8px 12px',
                      background: '#1e293b',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      fontSize: '0.8rem',
                    }}
                  >
                    <Printer size={14} color="#38bdf8" /> In Phiếu Giao
                  </button>

                  <button
                    onClick={() => setReceiptSlipOrder(selectedOrder)}
                    style={{
                      padding: '8px 12px',
                      background: '#0f766e',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      fontSize: '0.8rem',
                    }}
                  >
                    <FileText size={14} color="#99f6e4" /> In Phiếu 02-VT
                  </button>

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
                      <Truck size={16} /> {selectedOrder.assignedDriverName ? 'Đổi Tài Xế' : 'Phân Công Tài Xế'}
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

                  {(selectedOrder.status === 'PROCESSING' || selectedOrder.status === 'PICKING' || selectedOrder.status === 'PACKING' || selectedOrder.status === 'PACKED' || selectedOrder.status === 'CONFIRMED' || selectedOrder.status === 'READY_FOR_DELIVERY') && (
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <button 
                        onClick={() => navigate('/outbound')}
                        style={{ padding: '9px 16px', background: '#0f766e', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', boxShadow: '0 2px 6px rgba(15,118,110,0.25)' }}
                      >
                        <Truck size={16} /> Quản lý Xuất kho
                      </button>
                      {(selectedOrder.status === 'PACKED' || selectedOrder.status === 'CONFIRMED' || selectedOrder.status === 'READY_FOR_DELIVERY') && (
                        <button 
                          onClick={() => setDispatchOrderModal(selectedOrder)}
                          style={{ padding: '9px 16px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}
                        >
                          <Truck size={16} /> Điều phối Tài xế
                        </button>
                      )}
                      <button 
                        onClick={() => handleUpdateStatus(selectedOrder.id, 'COMPLETED')}
                        style={{ padding: '9px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', boxShadow: '0 2px 6px rgba(37,99,235,0.25)' }}
                      >
                        <CheckCircle2 size={16} /> Xác nhận Đã Giao Hàng
                      </button>
                      <button 
                        onClick={() => handleCancelOrder(selectedOrder.id)}
                        style={{ padding: '9px 14px', background: '#fff', color: '#be123c', border: '1px solid #fecdd3', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}
                      >
                        Hủy đơn
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
                      { key: 'PICKING', label: '2. Soạn hàng' },
                      { key: 'PACKED', label: '3. Đã đóng gói' },
                      { key: 'DELIVERING', label: '4. Vận chuyển' },
                      { key: 'COMPLETED', label: '5. Hoàn thành' }
                    ].map((step, idx) => {
                      const stepOrder = ['PENDING', 'PROCESSING', 'PICKING', 'PACKING', 'PACKED', 'CONFIRMED', 'READY_FOR_DELIVERY', 'DELIVERING', 'COMPLETED'];
                      const currentIdx = stepOrder.indexOf(selectedOrder.status);
                      const stepIdx = stepOrder.indexOf(step.key);
                      const isDone = currentIdx >= stepIdx && selectedOrder.status !== 'CANCELLED';
                      const isCurrent = (step.key === selectedOrder.status) || 
                        (selectedOrder.status === 'PROCESSING' && step.key === 'PENDING') ||
                        ((selectedOrder.status === 'PACKING' || selectedOrder.status === 'CONFIRMED' || selectedOrder.status === 'READY_FOR_DELIVERY') && step.key === 'PACKED');

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
                            {isDone ? <Check size={13} /> : idx + 1}
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
                  <div style={{ background: selectedOrder.assignedDriverName ? '#f0fdf4' : '#fffbeb', padding: '14px', borderRadius: '8px', border: `1px solid ${selectedOrder.assignedDriverName ? '#bbf7d0' : '#fde68a'}` }}>
                    <p style={{ fontSize: '0.75rem', color: selectedOrder.assignedDriverName ? '#166534' : '#b45309', margin: '0 0 4px 0', textTransform: 'uppercase', fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
                      <span>Tài Xế Điều Phối</span>
                      {selectedOrder.assignedDriverName && <span style={{ fontSize: '0.7rem', color: '#16a34a', fontWeight: 600 }}>ĐÃ GÁN</span>}
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

                {/* Proof of Delivery (POD) Box */}
                {(selectedOrder.podPhotoUrl || selectedOrder.failurePhotoUrl || selectedOrder.status === 'COMPLETED' || selectedOrder.status === 'DELIVERED') && (
                  <div style={{ marginBottom: '22px', background: '#f8fafc', padding: '16px 20px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Camera size={16} color="#059669" />
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>
                          BẰNG CHỨNG GIAO HÀNG (PROOF OF DELIVERY)
                        </span>
                      </div>
                      {selectedOrder.podPhotoUrl ? (
                        <span style={{ fontSize: '0.75rem', color: '#166534', background: '#dcfce7', padding: '3px 10px', borderRadius: '6px', fontWeight: 600, border: '1px solid #bbf7d0' }}>
                          Ảnh xác nhận từ tài xế (S3)
                        </span>
                      ) : selectedOrder.failurePhotoUrl ? (
                        <span style={{ fontSize: '0.75rem', color: '#991b1b', background: '#fef2f2', padding: '3px 10px', borderRadius: '6px', fontWeight: 600, border: '1px solid #fecaca' }}>
                          Ảnh sự cố giao hàng
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: '#92400e', background: '#fef3c7', padding: '3px 10px', borderRadius: '6px', fontWeight: 500, border: '1px solid #fde68a' }}>
                          Chờ tài xế chụp ảnh
                        </span>
                      )}
                    </div>

                    {selectedOrder.podPhotoUrl ? (
                      <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                        <div
                          onClick={() => setPodPreviewPhoto({
                            url: selectedOrder.podPhotoUrl!,
                            title: `Bằng chứng giao hàng #${selectedOrder.id.slice(0, 8).toUpperCase()}`,
                            orderCode: selectedOrder.id.slice(0, 8).toUpperCase(),
                            driverName: selectedOrder.assignedDriverName,
                            address: selectedOrder.customerAddress,
                          })}
                          style={{
                            width: '200px',
                            height: '140px',
                            borderRadius: '8px',
                            overflow: 'hidden',
                            border: '1px solid #cbd5e1',
                            cursor: 'pointer',
                            backgroundColor: '#0f172a',
                            position: 'relative',
                            flexShrink: 0,
                          }}
                          title="Click để phóng to ảnh POD"
                        >
                          <img
                            src={selectedOrder.podPhotoUrl}
                            alt="Ảnh bàn giao"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                          <div style={{
                            position: 'absolute',
                            bottom: 0,
                            insetInline: 0,
                            backgroundColor: 'rgba(15, 23, 42, 0.75)',
                            padding: '4px 8px',
                            color: '#fff',
                            fontSize: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}>
                            <span>Phóng to</span>
                            <Camera size={11} color="#38bdf8" />
                          </div>
                        </div>

                        <div style={{ flex: 1, minWidth: '220px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <p style={{ margin: 0, fontSize: '0.8rem', color: '#475569' }}>
                            <b>Tài xế giao nhận:</b> {selectedOrder.assignedDriverName || 'Đội xe điều phối'} ({selectedOrder.assignedDriverPlate || 'N/A'})
                          </p>
                          <p style={{ margin: 0, fontSize: '0.8rem', color: '#475569' }}>
                            <b>Địa chỉ nhận:</b> {selectedOrder.customerAddress}
                          </p>
                          <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>
                            Ảnh đã được lưu trữ an toàn trên dịch vụ Amazon S3 Cloud Storage.
                          </p>
                          <div style={{ marginTop: '6px', display: 'flex', gap: '8px' }}>
                            <a
                              href={selectedOrder.podPhotoUrl}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                padding: '6px 12px',
                                background: '#0f766e',
                                color: '#ffffff',
                                borderRadius: '6px',
                                fontSize: '0.78rem',
                                fontWeight: 600,
                                textDecoration: 'none',
                              }}
                            >
                              <ExternalLink size={13} />
                              <span>Mở ảnh gốc HD</span>
                            </a>
                          </div>
                        </div>
                      </div>
                    ) : selectedOrder.failurePhotoUrl ? (
                      <div>
                        <div
                          onClick={() => setPodPreviewPhoto({
                            url: selectedOrder.failurePhotoUrl!,
                            title: `Ảnh sự cố giao hàng #${selectedOrder.id.slice(0, 8).toUpperCase()}`,
                            orderCode: selectedOrder.id.slice(0, 8).toUpperCase(),
                            driverName: selectedOrder.assignedDriverName,
                            address: selectedOrder.customerAddress,
                          })}
                          style={{
                            width: '200px',
                            height: '140px',
                            borderRadius: '8px',
                            overflow: 'hidden',
                            border: '1px solid #fecaca',
                            cursor: 'pointer',
                            backgroundColor: '#450a0a',
                          }}
                        >
                          <img
                            src={selectedOrder.failurePhotoUrl}
                            alt="Ảnh sự cố"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        </div>
                        {selectedOrder.failureReason && (
                          <p style={{ marginTop: '8px', fontSize: '0.8rem', color: '#b91c1c' }}>
                            <b>Lý do sự cố:</b> {selectedOrder.failureReason}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div style={{ padding: '12px', textAlign: 'center', color: '#64748b', fontSize: '0.8rem', background: '#fff', borderRadius: '6px', border: '1px dashed #cbd5e1' }}>
                        Tài xế đang trên đường giao hàng. Ảnh xác nhận (POD) sẽ tự động hiển thị tại đây ngay khi tài xế chụp ảnh hoàn tất.
                      </div>
                    )}
                  </div>
                )}

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
                        <th style={{ padding: '10px 14px', color: '#64748b', fontWeight: 700 }}>Mã Sản Phẩm</th>
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
              <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '4px' }}>Duyệt đơn, kích hoạt xuất kho tự động và theo dõi vận chuyển</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Phân Công / Điều Phối Tài Xế (Assign Driver Modal) */}
      {dispatchOrderModal && (
        <div 
          onClick={() => setDispatchOrderModal(null)}
          style={{
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
          }}
        >
          <div 
            onClick={e => e.stopPropagation()}
            style={{
              background: '#fff',
              borderRadius: '16px',
              maxWidth: '680px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
              border: '1px solid #e2e8f0'
            }}
          >
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
                  {dispatchOrderModal.customerAddress}
                </div>
              </div>

              <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: '#0f172a', fontWeight: 700 }}>
                Chọn tài xế phụ trách:
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {GOVAP_DRIVERS.map(driver => {
                  const isCurrentAssigned = dispatchOrderModal.assignedDriverId === driver.id;

                  return (
                    <div 
                      key={driver.id}
                      style={{
                        border: isCurrentAssigned ? '2px solid #0f766e' : '1px solid #e2e8f0',
                        borderRadius: '8px',
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
                          width: '40px',
                          height: '40px',
                          borderRadius: '8px',
                          background: '#0f766e15',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#0f766e'
                        }}>
                          <Truck size={18} color="#0f766e" />
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.95rem' }}>{driver.name}</span>
                            <span style={{ fontSize: '0.75rem', background: '#e0f2fe', color: '#0369a1', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>{driver.plate}</span>
                            <span style={{ fontSize: '0.72rem', color: '#b45309', fontWeight: 600 }}>{driver.rating} / 5</span>
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
                            borderRadius: '6px',
                            fontWeight: 600,
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                          }}
                        >
                          {isCurrentAssigned ? 'Đang phân công' : 'Phân công ngay'}
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

      {/* ── MODAL: IN PHIẾU GIAO HÀNG & SOẠN HÀNG SIÊU THỊ ── */}
      {printSlipOrder && (
        <PrintOrderSlipModal
          order={{
            id: printSlipOrder.id,
            orderCode: printSlipOrder.id.startsWith('ECOMM-') ? printSlipOrder.id : `ECOMM-${printSlipOrder.id.slice(0, 8).toUpperCase()}`,
            customerName: printSlipOrder.customerName,
            customerPhone: printSlipOrder.customerPhone,
            customerAddress: printSlipOrder.customerAddress,
            totalAmount: printSlipOrder.totalAmount,
            paymentMethod: printSlipOrder.paymentMethod,
            status: printSlipOrder.status,
            assignedDriverName: printSlipOrder.assignedDriverName,
            assignedDriverPhone: printSlipOrder.assignedDriverPhone,
            assignedDriverPlate: printSlipOrder.assignedDriverPlate,
            createdAt: printSlipOrder.createdAt,
            notes: printSlipOrder.note,
            items: printSlipOrder.items.map((i: any) => ({
              sku: i.sku || i.productId || 'SKU-01',
              productName: i.productName,
              requestedQuantity: i.quantity,
              quantity: i.quantity,
              price: i.price,
            })),
          }}
          onClose={() => setPrintSlipOrder(null)}
        />
      )}

      {/* ── MODAL: XEM BẰNG CHỨNG GIAO HÀNG POD AMAZON S3 ── */}
      {podPreviewPhoto && (
        <div 
          onClick={() => setPodPreviewPhoto(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 3000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(15, 23, 42, 0.5)',
            backdropFilter: 'blur(3px)',
            padding: '16px',
          }}
        >
          <div 
            onClick={e => e.stopPropagation()}
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              maxWidth: '460px',
              width: '100%',
              padding: '20px',
              boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '14px', borderBottom: '1px solid #f1f5f9', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#065f46', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <CheckCircle2 size={18} color="#059669" />
                {podPreviewPhoto.title}
              </h3>
              <button onClick={() => setPodPreviewPhoto(null)} style={{ color: '#94a3b8', border: 'none', background: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ minHeight: '220px', maxHeight: '380px', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#0f172a', border: '1px solid #cbd5e1', marginBottom: '18px', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img
                src={podPreviewPhoto.url}
                alt="Ảnh bằng chứng giao hàng"
                style={{ width: '100%', maxHeight: '380px', objectFit: 'contain', display: 'block' }}
              />
              <div style={{ position: 'absolute', bottom: 0, insetInline: 0, backgroundColor: 'rgba(15, 23, 42, 0.88)', padding: '8px 12px', color: '#ffffff', fontSize: '11px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: 600 }}>Tài xế: {podPreviewPhoto.driverName || 'Đội xe điều phối'}</div>
                  <span style={{ color: '#38bdf8', fontFamily: 'monospace', fontSize: '10px' }}>AWS S3 SECURED</span>
                </div>
                {podPreviewPhoto.address && (
                  <div style={{ color: '#cbd5e1', fontSize: '10px', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    Địa chỉ: {podPreviewPhoto.address}
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <a
                href={podPreviewPhoto.url}
                target="_blank"
                rel="noreferrer"
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  backgroundColor: '#0f766e',
                  color: '#ffffff',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  textDecoration: 'none',
                  textAlign: 'center',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <ExternalLink size={14} />
                <span>Mở Ảnh Gốc HD</span>
              </a>
              <button
                onClick={() => setPodPreviewPhoto(null)}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  backgroundColor: '#f1f5f9',
                  color: '#475569',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: IN PHIẾU XUẤT KHO 02 - VT (BỘ TÀI CHÍNH) ── */}
      {receiptSlipOrder && (
        <OutboundReceiptModal
          order={{
            id: receiptSlipOrder.id,
            orderCode: receiptSlipOrder.id.startsWith('ECOMM-') ? receiptSlipOrder.id : `ECOMM-${receiptSlipOrder.id.slice(0, 8).toUpperCase()}`,
            requesterName: receiptSlipOrder.customerName,
            customerName: receiptSlipOrder.customerName,
            destination: receiptSlipOrder.customerAddress,
            warehouseCode: receiptSlipOrder.assignedWarehouseCode || 'WH-006',
            createdAt: receiptSlipOrder.createdAt,
            notes: receiptSlipOrder.note,
            items: receiptSlipOrder.items.map((i: any) => ({
              sku: i.sku || i.productId || 'SKU-01',
              productName: i.productName,
              requestedQuantity: i.quantity,
              pickedQuantity: i.quantity,
              unitPrice: i.price,
            })),
          }}
          onClose={() => setReceiptSlipOrder(null)}
        />
      )}
    </div>
  );
};

export default OrderManagement;
