import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Inbox,
  PackageCheck,
  Truck,
  CheckCircle2,
  Clock,
  MapPin,
  Search,
  RefreshCw,
  AlertTriangle,
  X,
  Boxes,
  RotateCcw,
  Sparkles,
  Camera,
  Cloud,
  Compass,
  Check,
  Eye,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  LayoutGrid,
  List,
  Printer,
} from 'lucide-react';
import { io } from 'socket.io-client';
import { useAuth } from '../contexts/AuthContext';
import { GOVAP_DRIVERS } from './OrderManagement';
import { ControlTowerMap } from '../components/ControlTowerMap';
import { PrintOrderSlipModal } from '../components/PrintOrderSlipModal';

const ORDER_API = 'http://localhost:3004/orders';
const OUTBOUND_API = 'http://localhost:3007';
const WAREHOUSE_API = 'http://localhost:3005';
const INVENTORY_API = 'http://localhost:3011';

interface OrderItem {
  sku: string;
  productId?: string;
  productName: string;
  requestedQuantity: number;
  quantity?: number;
  unit?: string;
  price?: number;
}

interface UnifiedOrder {
  id: string;
  orderCode: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  totalAmount: number;
  paymentMethod: string;
  deliveryMethod?: string;
  status: string;
  createdAt: string;
  items: OrderItem[];
  warehouseId?: string;
  warehouseCode?: string;
  assignedWarehouseName?: string;
  assignedDriverId?: string;
  assignedDriverName?: string;
  assignedDriverPhone?: string;
  assignedDriverPlate?: string;
  tripNumber?: number;
  failureReason?: string;
  failurePhotoUrl?: string;
  podPhotoUrl?: string;
  podSignature?: string;
  note?: string;
  isEcommerce?: boolean;
}

interface Warehouse {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  latitude?: number;
  longitude?: number;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: React.ReactNode }> = {
  PENDING:             { label: 'Chờ tiếp nhận', color: '#b45309', bg: '#fef3c7', border: '#fde68a', icon: <Clock size={12} /> },
  PROCESSING:          { label: 'Đang soạn hàng', color: '#1d4ed8', bg: '#dbeafe', border: '#bfdbfe', icon: <Boxes size={12} /> },
  PICKING:             { label: 'Đang nhặt FEFO', color: '#6d28d9', bg: '#ede9fe', border: '#ddd6fe', icon: <Boxes size={12} /> },
  PACKED:              { label: 'Đã đóng gói', color: '#0f766e', bg: '#ccfbf1', border: '#99f6e4', icon: <PackageCheck size={12} /> },
  CONFIRMED:           { label: 'Đã xuất kho', color: '#c2410c', bg: '#ffedd5', border: '#fed7aa', icon: <PackageCheck size={12} /> },
  READY_FOR_DELIVERY:  { label: 'Chờ nhận chuyến', color: '#c2410c', bg: '#fff7ed', border: '#fed7aa', icon: <Clock size={12} /> },
  SHIPPED:             { label: 'Đang giao hàng', color: '#0284c7', bg: '#e0f2fe', border: '#bae6fd', icon: <Truck size={12} /> },
  DELIVERING:          { label: 'Đang giao hàng', color: '#0284c7', bg: '#e0f2fe', border: '#bae6fd', icon: <Truck size={12} /> },
  COMPLETED:           { label: 'Giao thành công', color: '#15803d', bg: '#dcfce7', border: '#bbf7d0', icon: <CheckCircle2 size={12} /> },
  DELIVERED:           { label: 'Giao thành công', color: '#15803d', bg: '#dcfce7', border: '#bbf7d0', icon: <CheckCircle2 size={12} /> },
  FAILED_DELIVERY:     { label: 'Giao thất bại', color: '#be123c', bg: '#ffe4e6', border: '#fecdd3', icon: <AlertTriangle size={12} /> },
  RETURN_TO_WAREHOUSE: { label: 'Đang hoàn về kho', color: '#c2410c', bg: '#ffedd5', border: '#fed7aa', icon: <RotateCcw size={12} /> },
  CANCELLED:           { label: 'Đã hủy đơn', color: '#64748b', bg: '#f1f5f9', border: '#cbd5e1', icon: <X size={12} /> },
};

export default function OrderDispatch() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [orders, setOrders] = useState<UnifiedOrder[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedWarehouseCode, setSelectedWarehouseCode] = useState<string>('WH-006');
  const [selectedOrder, setSelectedOrder] = useState<UnifiedOrder | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Pipeline Step filter
  const [activePipelineStep, setActivePipelineStep] = useState<
    'ALL' | 'STEP_1_PICKING' | 'STEP_2_DISPATCH' | 'STEP_3_DELIVERING' | 'STEP_EXCEPTION' | 'STEP_COMPLETED'
  >('ALL');

  // Control Tower Map Collapse
  const [showMap, setShowMap] = useState<boolean>(true);

  // Modals & Action States
  const [manualDriverModalOrder, setManualDriverModalOrder] = useState<UnifiedOrder | null>(null);
  const [selectedDriverForAssign, setSelectedDriverForAssign] = useState<typeof GOVAP_DRIVERS[0] | null>(null);
  const [reverseLogisticsModalOrder, setReverseLogisticsModalOrder] = useState<UnifiedOrder | null>(null);
  const [podPreviewModalOrder, setPodPreviewModalOrder] = useState<UnifiedOrder | null>(null);
  const [printModalOrder, setPrintModalOrder] = useState<UnifiedOrder | null>(null);
  const [autoPickingLoading, setAutoPickingLoading] = useState(false);
  const [autoDispatchLoading, setAutoDispatchLoading] = useState(false);
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = useCallback((text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const LOCAL_DRIVER_KEY = 'sfwms_assigned_drivers_map';

  const getSavedDriverMap = (): Record<string, typeof GOVAP_DRIVERS[0]> => {
    try {
      return JSON.parse(localStorage.getItem(LOCAL_DRIVER_KEY) || '{}');
    } catch (e) {
      return {};
    }
  };

  const saveDriverAssignmentToStorage = (orderId: string, driver: typeof GOVAP_DRIVERS[0]) => {
    try {
      const cur = getSavedDriverMap();
      cur[orderId] = driver;
      cur[orderId.replace(/^ECOMM-/, '').replace(/^OB-/, '')] = driver;
      localStorage.setItem(LOCAL_DRIVER_KEY, JSON.stringify(cur));
    } catch (e) {}
  };

  // Fetch all orders & data
  const fetchAllData = useCallback(async (showSpinner = false) => {
    if (showSpinner) setIsRefreshing(true);
    const savedDriverMap = getSavedDriverMap();

    try {
      // 1. Fetch E-commerce orders (3004)
      const ecomRes = await fetch(ORDER_API).catch(() => null);
      let ecomOrders: UnifiedOrder[] = [];
      if (ecomRes && ecomRes.ok) {
        const ecomData = await ecomRes.json();
        if (Array.isArray(ecomData)) {
          ecomOrders = ecomData.map((o: any, idx: number) => {
            const savedDriver = savedDriverMap[o.id] || savedDriverMap[o.id?.slice(0, 8)] || savedDriverMap[`ECOMM-${o.id?.slice(0, 8).toUpperCase()}`];
            const driverName = o.assignedDriverName || savedDriver?.name;
            const driverPhone = o.assignedDriverPhone || savedDriver?.phone;
            const driverPlate = o.assignedDriverPlate || savedDriver?.plate;
            const driverId = o.assignedDriverId || savedDriver?.id;

            return {
              id: o.id,
              orderCode: `ECOMM-${o.id.slice(0, 8).toUpperCase()}`,
              customerName: o.customerName || 'Khách hàng C.T Mart',
              customerPhone: o.customerPhone || '0901234567',
              customerAddress: o.customerAddress || 'Gò Vấp, TP.HCM',
              totalAmount: Number(o.totalAmount || 0),
              paymentMethod: o.paymentMethod || 'cod',
              deliveryMethod: o.deliveryMethod || 'Hỏa tốc 1-2h',
              status: o.status || 'PENDING',
              createdAt: new Date(o.createdAt || Date.now()).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }),
              items: (o.items || []).map((i: any) => ({
                sku: i.sku || i.productId || 'SKU-01',
                productName: i.productName || 'Sản phẩm tươi sạch',
                requestedQuantity: i.quantity || 1,
                quantity: i.quantity || 1,
                price: Number(i.price || 45000),
                unit: 'Món',
              })),
              warehouseCode: o.assignedWarehouseCode || 'WH-006',
              assignedWarehouseName: o.assignedWarehouseName || 'Kho Gò Vấp (WH-006)',
              assignedDriverId: driverId,
              assignedDriverName: driverName,
              assignedDriverPhone: driverPhone,
              assignedDriverPlate: driverPlate,
              tripNumber: (idx % 2) + 1,
              podPhotoUrl: o.podPhotoUrl || (o.status === 'COMPLETED' ? 'https://citymart-coldchain-pod.s3.ap-southeast-1.amazonaws.com/proof-of-delivery/sample.jpg' : undefined),
              failureReason: o.failureReason || (o.status === 'FAILED_DELIVERY' || o.status === 'RETURN_TO_WAREHOUSE' ? 'Khách không nghe máy (Đã gọi 3 lần)' : undefined),
              failurePhotoUrl: o.failurePhotoUrl,
              note: o.note,
              isEcommerce: true,
            };
          });
        }
      }

      // 2. Fetch Outbound orders (3007)
      const obRes = await fetch(`${OUTBOUND_API}/outbound-orders`).catch(() => null);
      let obOrders: UnifiedOrder[] = [];
      if (obRes && obRes.ok) {
        const obData = await obRes.json();
        if (Array.isArray(obData)) {
          obOrders = obData.map((o: any) => {
            const savedDriver = savedDriverMap[o.id] || savedDriverMap[o.orderCode];
            const driverName = o.assignedDriverName || savedDriver?.name;
            const driverPhone = o.assignedDriverPhone || savedDriver?.phone;
            const driverPlate = o.assignedDriverPlate || savedDriver?.plate;
            const driverId = o.assignedDriverId || savedDriver?.id;

            return {
              id: o.id,
              orderCode: o.orderCode || `OB-${o.id.slice(0, 8).toUpperCase()}`,
              customerName: o.requesterName || o.customerName || 'Chi nhánh / Khách mua sắm',
              customerPhone: o.customerPhone || '0977112233',
              customerAddress: o.destination || o.deliveryAddress || 'Kho Gò Vấp, TP.HCM',
              totalAmount: Number(o.totalAmount || 180000),
              paymentMethod: o.paymentMethod || 'Chuyển khoản kho',
              status: o.status === 'SHIPPED' ? 'READY_FOR_DELIVERY' : o.status,
              createdAt: new Date(o.createdAt || Date.now()).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }),
              items: (o.items || []).map((i: any) => ({
                sku: i.sku || 'SKU-01',
                productName: i.productName || 'Hàng xuất kho',
                requestedQuantity: i.requestedQuantity || i.quantity || 1,
                quantity: i.requestedQuantity || 1,
                price: Number(i.price || 50000),
                unit: i.unit || 'Kg',
              })),
              warehouseCode: o.warehouseCode || 'WH-006',
              assignedWarehouseName: 'Kho Gò Vấp (WH-006)',
              assignedDriverId: driverId,
              assignedDriverName: driverName,
              assignedDriverPhone: driverPhone,
              assignedDriverPlate: driverPlate,
              tripNumber: 1,
              note: o.notes,
              isEcommerce: false,
            };
          });
        }
      }

      const combinedMap = new Map<string, UnifiedOrder>();
      ecomOrders.forEach(o => combinedMap.set(o.id.toLowerCase(), o));
      obOrders.forEach(o => {
        if (!combinedMap.has(o.id.toLowerCase())) {
          combinedMap.set(o.id.toLowerCase(), o);
        }
      });

      setOrders(Array.from(combinedMap.values()));

      // Fetch warehouses
      const whRes = await fetch(`${WAREHOUSE_API}/warehouses`).catch(() => null);
      if (whRes && whRes.ok) {
        const whData = await whRes.json();
        setWarehouses(Array.isArray(whData) ? whData : []);
      }
    } catch (err) {
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
    const interval = setInterval(() => fetchAllData(false), 4000);
    return () => clearInterval(interval);
  }, [fetchAllData]);

  // WebSocket Live Updates (Instant in-place state update + fetchAllData)
  useEffect(() => {
    const socket = io('http://localhost:3004');

    socket.on('order_status_updated', (updated: any) => {
      const clean = (updated?.id || '').toLowerCase().replace(/^ecomm-/, '').replace(/^out-/, '').replace(/^ob-/, '');
      setOrders(prev =>
        prev.map(o => {
          const oClean = o.id.toLowerCase().replace(/^ecomm-/, '').replace(/^out-/, '').replace(/^ob-/, '');
          if (oClean === clean || (clean && oClean.startsWith(clean.slice(0, 8)))) {
            return {
              ...o,
              status: updated.status || o.status,
              assignedDriverId: updated.assignedDriverId || o.assignedDriverId,
              assignedDriverName: updated.assignedDriverName || o.assignedDriverName,
              assignedDriverPhone: updated.assignedDriverPhone || o.assignedDriverPhone,
              assignedDriverPlate: updated.assignedDriverPlate || o.assignedDriverPlate,
            };
          }
          return o;
        })
      );
      fetchAllData(false);
    });

    socket.on('new_order', () => fetchAllData(false));

    return () => {
      socket.disconnect();
    };
  }, [fetchAllData]);

  // 1. Tiếp nhận đơn và chuyển sang trạng thái Đang Soạn Hàng (PROCESSING / PICKING)
  const handleReceiveAndStartPicking = async (order: UnifiedOrder) => {
    try {
      // 1. Cập nhật status order-service sang PROCESSING (Đang soạn hàng)
      await fetch(`${ORDER_API}/sync-status/${order.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'PROCESSING' }),
      }).catch(() => {});

      // 2. Đồng bộ lệnh xuất kho sang outbound-service (:3007) để nhân viên app mobile thấy và đi lấy hàng
      const whCode = order.warehouseCode || 'WH-006';
      await fetch(`http://localhost:3007/outbound-orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderCode: order.orderCode.startsWith('ECOMM-') ? order.orderCode : `ECOMM-${order.orderCode}`,
          warehouseCode: whCode,
          warehouseId: whCode,
          requestedBy: user?.id || 'mgr-govap',
          requesterName: order.customerName,
          destination: order.customerAddress,
          notes: `Đơn hàng Online: KH ${order.customerName} (${order.customerPhone}) [ID:${order.id}]`,
          items: order.items.map(i => ({
            sku: i.sku,
            productName: i.productName,
            requestedQuantity: i.requestedQuantity || i.quantity || 1,
          })),
        })
      }).catch(() => {});

      showToast(`✅ Đã tiếp nhận đơn #${order.orderCode}. Đã chuyển sang trạng thái ĐANG SOẠN HÀNG!`, 'success');
      await fetchAllData(true);
    } catch (e) {
      showToast('Có lỗi khi tiếp nhận đơn', 'error');
    }
  };

  // Hoàn tất soạn hàng và chuyển sang Chờ Nhận Chuyến (READY_FOR_DELIVERY / PACKED)
  const handleCompletePicking = async (order: UnifiedOrder) => {
    try {
      await fetch(`${ORDER_API}/sync-status/${order.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'READY_FOR_DELIVERY' }),
      }).catch(() => {});

      showToast(`📦 Đã hoàn tất soạn & đóng gói đơn #${order.orderCode}. Đã chuyển sang Chờ nhận chuyến!`, 'success');
      await fetchAllData(true);
    } catch (e) {
      showToast('Có lỗi khi cập nhật', 'error');
    }
  };

  // 1. SMART AUTOMATION: 1-Chạm Tiếp Nhận & Soạn Hàng Loạt (Auto-FEFO Picking)
  const handleAutoFEFOPicking = async () => {
    const pendingOrders = orders.filter(o => o.status === 'PENDING');
    const pickingOrders = orders.filter(o => o.status === 'PROCESSING' || o.status === 'PICKING');

    if (pendingOrders.length === 0 && pickingOrders.length === 0) {
      showToast('Hiện không có đơn hàng mới nào cần tiếp nhận hoặc soạn kho.', 'info');
      return;
    }

    setAutoPickingLoading(true);
    try {
      if (pendingOrders.length > 0) {
        // Tiếp nhận tất cả đơn PENDING -> PROCESSING và giao việc lấy hàng
        for (const ord of pendingOrders) {
          await handleReceiveAndStartPicking(ord);
        }
        showToast(`⚡ Đã tiếp nhận & giao kho soạn FEFO ${pendingOrders.length} đơn hàng mới!`, 'success');
      } else {
        // Hoàn tất soạn các đơn đang PROCESSING -> READY_FOR_DELIVERY
        for (const ord of pickingOrders) {
          await handleCompletePicking(ord);
        }
        showToast(`📦 Đã xác nhận đóng gói xong ${pickingOrders.length} đơn. Sẵn sàng gom chuyến!`, 'success');
      }
      await fetchAllData(true);
    } finally {
      setAutoPickingLoading(false);
    }
  };

  // 2. SMART AUTOMATION: 1-Chạm AI Gom Chuyến & Điều Phối VRP (Auto-Dispatch)
  const handleAIAutoDispatch = async () => {
    const unassignedOrders = orders.filter(
      o => (o.status === 'READY_FOR_DELIVERY' || o.status === 'PACKED') && !o.assignedDriverName
    );

    if (unassignedOrders.length === 0) {
      showToast('Tất cả các đơn đã đóng gói đều đã được phân bổ cho tài xế.', 'info');
      return;
    }

    setAutoDispatchLoading(true);
    try {
      const res = await fetch(`${ORDER_API}/auto-dispatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ warehouseCode: selectedWarehouseCode }),
      });

      if (res.ok) {
        const data = await res.json();
        showToast(`🤖 AI VRP đã tối ưu xong ${data.totalDispatched || unassignedOrders.length} đơn vào các chuyến xe!`, 'success');
      } else {
        let driverIdx = 0;
        for (const ord of unassignedOrders) {
          const drv = GOVAP_DRIVERS[driverIdx % GOVAP_DRIVERS.length];
          driverIdx++;
          saveDriverAssignmentToStorage(ord.id, drv);
          await fetch(`${ORDER_API}/assign-driver/${ord.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              driverId: drv.id,
              driverName: drv.name,
              driverPhone: drv.phone,
              driverPlate: drv.plate,
              status: 'READY_FOR_DELIVERY',
            }),
          }).catch(() => {});
        }
        showToast(`🚀 Đã phân bổ ${unassignedOrders.length} đơn cho Đội xe Gò Vấp!`, 'success');
      }
      await fetchAllData(true);
    } finally {
      setAutoDispatchLoading(false);
    }
  };

  // 3. Manual Single Driver Assign
  const handleAssignSingleDriver = async () => {
    if (!manualDriverModalOrder || !selectedDriverForAssign) return;
    saveDriverAssignmentToStorage(manualDriverModalOrder.id, selectedDriverForAssign);

    await fetch(`${ORDER_API}/assign-driver/${manualDriverModalOrder.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        driverId: selectedDriverForAssign.id,
        driverName: selectedDriverForAssign.name,
        driverPhone: selectedDriverForAssign.phone,
        driverPlate: selectedDriverForAssign.plate,
        status: 'READY_FOR_DELIVERY',
      }),
    }).catch(() => {});

    showToast(`Đã gán tài xế ${selectedDriverForAssign.name} cho đơn #${manualDriverModalOrder.orderCode}`, 'success');
    setManualDriverModalOrder(null);
    fetchAllData();
  };

  // 4. Reverse Logistics Actions: Restock / Redispatch
  const handleRestockOrder = async (orderId: string) => {
    await fetch(`${ORDER_API}/sync-status/${orderId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'CANCELLED', note: 'Hàng đã hoàn nhập kho lạnh' }),
    }).catch(() => {});

    showToast('📦 Đã xác nhận nhập lại hàng vào kho lạnh Gò Vấp.', 'success');
    setReverseLogisticsModalOrder(null);
    fetchAllData();
  };

  const handleRedispatchOrder = async (orderId: string) => {
    await fetch(`${ORDER_API}/sync-status/${orderId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'READY_FOR_DELIVERY', note: 'Đã xếp vào hàng đợi giao lại lần 2' }),
    }).catch(() => {});

    showToast('🔁 Đã đưa đơn hàng vào hàng đợi Chuyến tiếp theo!', 'success');
    setReverseLogisticsModalOrder(null);
    fetchAllData();
  };

  // Pipeline Counts
  const step1Count = useMemo(() => orders.filter(o => o.status === 'PENDING' || o.status === 'PROCESSING' || o.status === 'PICKING').length, [orders]);
  const step2Count = useMemo(() => orders.filter(o => (o.status === 'PACKED' || o.status === 'READY_FOR_DELIVERY') && o.status !== 'DELIVERING').length, [orders]);
  const step3Count = useMemo(() => orders.filter(o => o.status === 'DELIVERING' || o.status === 'SHIPPED').length, [orders]);
  const stepExceptionCount = useMemo(() => orders.filter(o => o.status === 'FAILED_DELIVERY' || o.status === 'RETURN_TO_WAREHOUSE').length, [orders]);
  const completedCount = useMemo(() => orders.filter(o => o.status === 'COMPLETED' || o.status === 'DELIVERED').length, [orders]);

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const matchSearch =
        o.orderCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.customerPhone.includes(searchQuery) ||
        o.customerAddress.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (o.assignedDriverName && o.assignedDriverName.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchSearch) return false;

      if (activePipelineStep === 'STEP_1_PICKING') {
        return o.status === 'PENDING' || o.status === 'PROCESSING' || o.status === 'PICKING';
      }
      if (activePipelineStep === 'STEP_2_DISPATCH') {
        return o.status === 'PACKED' || o.status === 'READY_FOR_DELIVERY';
      }
      if (activePipelineStep === 'STEP_3_DELIVERING') {
        return o.status === 'DELIVERING' || o.status === 'SHIPPED';
      }
      if (activePipelineStep === 'STEP_EXCEPTION') {
        return o.status === 'FAILED_DELIVERY' || o.status === 'RETURN_TO_WAREHOUSE';
      }
      if (activePipelineStep === 'STEP_COMPLETED') {
        return o.status === 'COMPLETED' || o.status === 'DELIVERED';
      }

      return true;
    });
  }, [orders, searchQuery, activePipelineStep]);

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(9);
  const [viewMode, setViewMode] = useState<'CARD' | 'LIST'>('LIST');

  // Reset page when filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activePipelineStep, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / pageSize));

  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredOrders.slice(start, start + pageSize);
  }, [filteredOrders, currentPage, pageSize]);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f1f5f9', color: '#0f172a', padding: '24px' }}>
      
      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          zIndex: 9999,
          padding: '14px 20px',
          borderRadius: '14px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
          fontSize: '13px',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          backgroundColor: toast.type === 'success' ? '#ecfdf5' : '#fef2f2',
          color: toast.type === 'success' ? '#065f46' : '#991b1b',
          border: `1px solid ${toast.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
        }}>
          {toast.type === 'success' ? <CheckCircle2 size={18} color="#059669" /> : <AlertTriangle size={18} color="#dc2626" />}
          <span>{toast.text}</span>
        </div>
      )}

      {/* ── Top Executive Header ── */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '20px',
        padding: '20px 24px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
        marginBottom: '20px',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '14px',
            backgroundColor: '#eff6ff',
            border: '1px solid #bfdbfe',
            color: '#2563eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '22px',
          }}>
            🚚
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                fontSize: '10px',
                fontWeight: 900,
                textTransform: 'uppercase',
                padding: '2px 8px',
                borderRadius: '999px',
                backgroundColor: '#dbeafe',
                color: '#1e40af',
                letterSpacing: '0.5px',
              }}>
                TMS CONTROL TOWER
              </span>
              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Kho Gò Vấp (WH-006)</span>
            </div>
            <h1 style={{ fontSize: '20px', fontWeight: 900, color: '#0f172a', margin: '3px 0 0 0' }}>
              Trung Tâm Điều Phối Đơn Hàng & Giám Sát Đội Xe
            </h1>
            <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
              Tự động hóa xuất kho FEFO • AI VRP gom chuyến khép kín • Định vị GPS trực tiếp
            </p>
          </div>
        </div>

        {/* Quick Action Control Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* 1-Chạm Soạn Hàng Loạt FEFO */}
          <button
            onClick={handleAutoFEFOPicking}
            disabled={autoPickingLoading}
            style={{
              backgroundColor: '#2563eb',
              color: '#ffffff',
              padding: '10px 18px',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              border: 'none',
              boxShadow: '0 4px 12px rgba(37,99,235,0.25)',
              opacity: autoPickingLoading ? 0.6 : 1,
            }}
          >
            <Boxes size={16} />
            <span>{autoPickingLoading ? 'Đang xuất kho...' : '⚡ 1-Chạm Soạn Hàng FEFO'}</span>
          </button>

          {/* 1-Chạm AI Gom Tuyến VRP */}
          <button
            onClick={handleAIAutoDispatch}
            disabled={autoDispatchLoading}
            style={{
              backgroundColor: '#059669',
              color: '#ffffff',
              padding: '10px 18px',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              border: 'none',
              boxShadow: '0 4px 12px rgba(5,150,105,0.25)',
              opacity: autoDispatchLoading ? 0.6 : 1,
            }}
          >
            <Sparkles size={16} />
            <span>{autoDispatchLoading ? 'AI Đang tối ưu...' : '🤖 1-Chạm AI Gom Tuyến VRP'}</span>
          </button>

          {/* Map Toggle Button */}
          <button
            onClick={() => setShowMap(!showMap)}
            style={{
              backgroundColor: showMap ? '#f8fafc' : '#ffffff',
              color: '#334155',
              padding: '10px 16px',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              border: '1px solid #cbd5e1',
            }}
          >
            <Compass size={16} color="#2563eb" />
            <span>{showMap ? 'Thu Gọn Bản Đồ' : 'Mở Bản Đồ TMS'}</span>
          </button>

          {/* Refresh Data */}
          <button
            onClick={() => fetchAllData(true)}
            disabled={isRefreshing}
            style={{
              backgroundColor: '#ffffff',
              color: '#475569',
              padding: '10px',
              borderRadius: '12px',
              border: '1px solid #cbd5e1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Làm mới dữ liệu"
          >
            <RefreshCw size={16} color="#2563eb" className={isRefreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ── Control Tower GIS Map Section (Collapsible) ── */}
      {showMap && (
        <div style={{
          marginBottom: '20px',
          borderRadius: '20px',
          overflow: 'hidden',
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
        }}>
          <ControlTowerMap />
        </div>
      )}

      {/* ── 5 PIPELINE WORKFLOW TABS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '20px' }}>
        
        {/* 1. SOẠN KHO FEFO */}
        <div
          onClick={() => setActivePipelineStep(activePipelineStep === 'STEP_1_PICKING' ? 'ALL' : 'STEP_1_PICKING')}
          style={{
            backgroundColor: activePipelineStep === 'STEP_1_PICKING' ? '#eff6ff' : '#ffffff',
            border: `1.5px solid ${activePipelineStep === 'STEP_1_PICKING' ? '#3b82f6' : '#e2e8f0'}`,
            borderRadius: '16px',
            padding: '14px 16px',
            cursor: 'pointer',
            boxShadow: activePipelineStep === 'STEP_1_PICKING' ? '0 4px 12px rgba(59,130,246,0.15)' : '0 2px 6px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#1d4ed8', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Boxes size={14} /> 1. SOẠN KHO FEFO
            </span>
            <span style={{ fontSize: '13px', fontWeight: 900, padding: '2px 8px', borderRadius: '999px', backgroundColor: '#dbeafe', color: '#1e40af' }}>
              {step1Count}
            </span>
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Đơn mới chờ duyệt & soạn hàng</div>
        </div>

        {/* 2. GOM CHUYẾN VRP */}
        <div
          onClick={() => setActivePipelineStep(activePipelineStep === 'STEP_2_DISPATCH' ? 'ALL' : 'STEP_2_DISPATCH')}
          style={{
            backgroundColor: activePipelineStep === 'STEP_2_DISPATCH' ? '#fffbeb' : '#ffffff',
            border: `1.5px solid ${activePipelineStep === 'STEP_2_DISPATCH' ? '#f59e0b' : '#e2e8f0'}`,
            borderRadius: '16px',
            padding: '14px 16px',
            cursor: 'pointer',
            boxShadow: activePipelineStep === 'STEP_2_DISPATCH' ? '0 4px 12px rgba(245,158,11,0.15)' : '0 2px 6px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#b45309', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <PackageCheck size={14} /> 2. GOM CHUYẾN VRP
            </span>
            <span style={{ fontSize: '13px', fontWeight: 900, padding: '2px 8px', borderRadius: '999px', backgroundColor: '#fef3c7', color: '#92400e' }}>
              {step2Count}
            </span>
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Đã đóng gói, sẵn sàng gán xe</div>
        </div>

        {/* 3. ĐANG VẬN CHUYỂN */}
        <div
          onClick={() => setActivePipelineStep(activePipelineStep === 'STEP_3_DELIVERING' ? 'ALL' : 'STEP_3_DELIVERING')}
          style={{
            backgroundColor: activePipelineStep === 'STEP_3_DELIVERING' ? '#f0f9ff' : '#ffffff',
            border: `1.5px solid ${activePipelineStep === 'STEP_3_DELIVERING' ? '#0ea5e9' : '#e2e8f0'}`,
            borderRadius: '16px',
            padding: '14px 16px',
            cursor: 'pointer',
            boxShadow: activePipelineStep === 'STEP_3_DELIVERING' ? '0 4px 12px rgba(14,165,233,0.15)' : '0 2px 6px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#0369a1', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Truck size={14} /> 3. ĐANG VẬN CHUYỂN
            </span>
            <span style={{ fontSize: '13px', fontWeight: 900, padding: '2px 8px', borderRadius: '999px', backgroundColor: '#e0f2fe', color: '#075985' }}>
              {step3Count}
            </span>
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Đang di chuyển tới nhà khách</div>
        </div>

        {/* 4. ĐÃ HOÀN TẤT POD */}
        <div
          onClick={() => setActivePipelineStep(activePipelineStep === 'STEP_COMPLETED' ? 'ALL' : 'STEP_COMPLETED')}
          style={{
            backgroundColor: activePipelineStep === 'STEP_COMPLETED' ? '#f0fdf4' : '#ffffff',
            border: `1.5px solid ${activePipelineStep === 'STEP_COMPLETED' ? '#10b981' : '#e2e8f0'}`,
            borderRadius: '16px',
            padding: '14px 16px',
            cursor: 'pointer',
            boxShadow: activePipelineStep === 'STEP_COMPLETED' ? '0 4px 12px rgba(16,185,129,0.15)' : '0 2px 6px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#047857', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle2 size={14} /> 4. ĐÃ HOÀN TẤT POD
            </span>
            <span style={{ fontSize: '13px', fontWeight: 900, padding: '2px 8px', borderRadius: '999px', backgroundColor: '#dcfce7', color: '#166534' }}>
              {completedCount}
            </span>
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Đã giao tận tay & chụp ảnh S3</div>
        </div>

        {/* 5. SỰ CỐ & HÀNG HOÀN */}
        <div
          onClick={() => setActivePipelineStep(activePipelineStep === 'STEP_EXCEPTION' ? 'ALL' : 'STEP_EXCEPTION')}
          style={{
            backgroundColor: activePipelineStep === 'STEP_EXCEPTION' ? '#fef2f2' : '#ffffff',
            border: `1.5px solid ${activePipelineStep === 'STEP_EXCEPTION' ? '#ef4444' : '#e2e8f0'}`,
            borderRadius: '16px',
            padding: '14px 16px',
            cursor: 'pointer',
            boxShadow: activePipelineStep === 'STEP_EXCEPTION' ? '0 4px 12px rgba(239,68,68,0.15)' : '0 2px 6px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#b91c1c', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <RotateCcw size={14} /> SỰ CỐ & HÀNG HOÀN
            </span>
            <span style={{ fontSize: '13px', fontWeight: 900, padding: '2px 8px', borderRadius: '999px', backgroundColor: stepExceptionCount > 0 ? '#ef4444' : '#f1f5f9', color: stepExceptionCount > 0 ? '#ffffff' : '#64748b' }}>
              {stepExceptionCount}
            </span>
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Cần xử lý nhập kho / giao lại</div>
        </div>

      </div>

      {/* ── Search & Filter Toolbar ── */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        padding: '14px 18px',
        border: '1px solid #e2e8f0',
        marginBottom: '16px',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, maxWidth: '420px', position: 'relative' }}>
          <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '10px' }} />
          <input
            type="text"
            placeholder="Tìm kiếm theo mã đơn, khách hàng, số điện thoại, địa chỉ, tài xế..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 14px 8px 36px',
              backgroundColor: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: '10px',
              fontSize: '12px',
              color: '#0f172a',
              outline: 'none',
              fontWeight: 600,
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* View Mode Toggle: List vs Card */}
          <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#f1f5f9', padding: '3px', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
            <button
              onClick={() => setViewMode('LIST')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '5px 10px',
                borderRadius: '8px',
                fontSize: '11px',
                fontWeight: 800,
                backgroundColor: viewMode === 'LIST' ? '#ffffff' : 'transparent',
                color: viewMode === 'LIST' ? '#2563eb' : '#64748b',
                border: 'none',
                boxShadow: viewMode === 'LIST' ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
                cursor: 'pointer',
              }}
            >
              <List size={14} />
              <span>Dạng Danh Sách</span>
            </button>
            <button
              onClick={() => setViewMode('CARD')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '5px 10px',
                borderRadius: '8px',
                fontSize: '11px',
                fontWeight: 800,
                backgroundColor: viewMode === 'CARD' ? '#ffffff' : 'transparent',
                color: viewMode === 'CARD' ? '#2563eb' : '#64748b',
                border: 'none',
                boxShadow: viewMode === 'CARD' ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
                cursor: 'pointer',
              }}
            >
              <LayoutGrid size={14} />
              <span>Dạng Thẻ Card</span>
            </button>
          </div>

          <button
            onClick={() => setActivePipelineStep('ALL')}
            style={{
              padding: '6px 14px',
              borderRadius: '10px',
              fontSize: '12px',
              fontWeight: 800,
              backgroundColor: activePipelineStep === 'ALL' ? '#0f172a' : '#f1f5f9',
              color: activePipelineStep === 'ALL' ? '#ffffff' : '#475569',
              border: 'none',
            }}
          >
            Tất Cả ({orders.length})
          </button>
          <span style={{ fontSize: '12px', color: '#cbd5e1' }}>|</span>
          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
            Đang hiển thị: <b style={{ color: '#2563eb', fontWeight: 900 }}>{filteredOrders.length}</b> đơn hàng
          </span>
        </div>
      </div>

      {/* ── MINIMALIST & CLEAN ORDER LIST / CARDS ── */}
      {filteredOrders.length === 0 ? (
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '20px',
          border: '1px solid #e2e8f0',
          padding: '60px 20px',
          textAlign: 'center',
          boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
        }}>
          <Inbox size={48} color="#cbd5e1" style={{ margin: '0 auto 12px auto' }} />
          <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#475569', margin: '0 0 4px 0' }}>Không có đơn hàng nào</h3>
          <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>Không tìm thấy đơn hàng nào phù hợp với bộ lọc hiện tại</p>
        </div>
      ) : (
        <>
          {viewMode === 'LIST' ? (
            /* ── DẠNG DANH SÁCH HÀNG NGANG GỌN GÀNG ── */
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
              marginBottom: '20px',
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontWeight: 800, fontSize: '11px', textTransform: 'uppercase' }}>
                    <th style={{ padding: '12px 16px' }}>Mã Đơn</th>
                    <th style={{ padding: '12px 16px' }}>Khách Hàng & Địa Chỉ</th>
                    <th style={{ padding: '12px 16px' }}>Tài Xế & Chuyến</th>
                    <th style={{ padding: '12px 16px' }}>Thu Hộ COD</th>
                    <th style={{ padding: '12px 16px' }}>Trạng Thái</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Thao Tác Nhanh</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedOrders.map((order, idx) => {
                    const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.PENDING;
                    return (
                      <tr
                        key={order.id}
                        onClick={() => setSelectedOrder(order)}
                        style={{
                          borderBottom: idx !== paginatedOrders.length - 1 ? '1px solid #f1f5f9' : 'none',
                          cursor: 'pointer',
                          backgroundColor: '#ffffff',
                          transition: 'background-color 0.15s ease',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#ffffff')}
                      >
                        {/* Order Code */}
                        <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontWeight: 800, color: '#1d4ed8', whiteSpace: 'nowrap' }}>
                          #{order.orderCode}
                        </td>

                        {/* Customer & Address */}
                        <td style={{ padding: '12px 16px', maxWidth: '300px' }}>
                          <div style={{ fontWeight: 800, color: '#0f172a' }}>{order.customerName}</div>
                          <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            <MapPin size={11} color="#ef4444" style={{ flexShrink: 0 }} />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{order.customerAddress}</span>
                          </div>
                        </td>

                        {/* Driver & Trip */}
                        <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                          {order.assignedDriverName ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Truck size={13} color="#059669" />
                              <span style={{ fontWeight: 700, color: '#0f172a' }}>{order.assignedDriverName}</span>
                              <span style={{ fontSize: '10px', color: '#047857', backgroundColor: '#dcfce7', padding: '1px 6px', borderRadius: '999px', fontWeight: 800, fontFamily: 'monospace' }}>
                                Chuyến #{order.tripNumber || 1}
                              </span>
                            </div>
                          ) : (
                            <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '11px' }}>Chưa gán xe</span>
                          )}
                        </td>

                        {/* Total COD */}
                        <td style={{ padding: '12px 16px', fontWeight: 900, color: '#0f172a', whiteSpace: 'nowrap' }}>
                          {order.totalAmount.toLocaleString('vi-VN')}đ
                          <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600 }}>{order.paymentMethod === 'cod' ? 'COD' : 'VNPay'}</div>
                        </td>

                        {/* Status */}
                        <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 8px',
                            borderRadius: '999px',
                            fontSize: '11px',
                            fontWeight: 800,
                            color: cfg.color,
                            backgroundColor: cfg.bg,
                            border: `1px solid ${cfg.border}`,
                          }}>
                            {cfg.icon}
                            <span>{cfg.label}</span>
                          </span>
                        </td>

                        {/* Actions */}
                        <td style={{ padding: '12px 16px', textAlign: 'right', whiteSpace: 'nowrap' }} onClick={e => e.stopPropagation()}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            {order.status === 'PENDING' && (
                              <button
                                onClick={() => handleReceiveAndStartPicking(order)}
                                style={{
                                  backgroundColor: '#2563eb',
                                  color: '#ffffff',
                                  padding: '5px 10px',
                                  borderRadius: '8px',
                                  fontSize: '11px',
                                  fontWeight: 800,
                                  border: 'none',
                                }}
                              >
                                📥 Tiếp Nhận
                              </button>
                            )}

                            {(order.status === 'PROCESSING' || order.status === 'PICKING') && (
                              <button
                                onClick={() => handleCompletePicking(order)}
                                style={{
                                  backgroundColor: '#059669',
                                  color: '#ffffff',
                                  padding: '5px 10px',
                                  borderRadius: '8px',
                                  fontSize: '11px',
                                  fontWeight: 800,
                                  border: 'none',
                                }}
                              >
                                📦 Đã Soạn Xong
                              </button>
                            )}

                            {(order.status === 'PACKED' || order.status === 'READY_FOR_DELIVERY') && (
                              <button
                                onClick={() => {
                                  setManualDriverModalOrder(order);
                                  setSelectedDriverForAssign(GOVAP_DRIVERS[0]);
                                }}
                                style={{
                                  backgroundColor: '#d97706',
                                  color: '#ffffff',
                                  padding: '5px 10px',
                                  borderRadius: '8px',
                                  fontSize: '11px',
                                  fontWeight: 800,
                                  border: 'none',
                                }}
                              >
                                🛵 Gán Xe
                              </button>
                            )}

                            {(order.status === 'COMPLETED' || order.status === 'DELIVERED') && (
                              <button
                                onClick={() => setPodPreviewModalOrder(order)}
                                style={{
                                  backgroundColor: '#059669',
                                  color: '#ffffff',
                                  padding: '5px 10px',
                                  borderRadius: '8px',
                                  fontSize: '11px',
                                  fontWeight: 800,
                                  border: 'none',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                              >
                                <Camera size={11} color="#ffffff" />
                                <span>Ảnh POD</span>
                              </button>
                            )}

                            {(order.status === 'FAILED_DELIVERY' || order.status === 'RETURN_TO_WAREHOUSE') && (
                              <button
                                onClick={() => setReverseLogisticsModalOrder(order)}
                                style={{
                                  backgroundColor: '#dc2626',
                                  color: '#ffffff',
                                  padding: '5px 10px',
                                  borderRadius: '8px',
                                  fontSize: '11px',
                                  fontWeight: 800,
                                  border: 'none',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                              >
                                <RotateCcw size={11} color="#ffffff" />
                                <span>Xử Lý</span>
                              </button>
                            )}

                            <button
                              onClick={() => setPrintModalOrder(order)}
                              title="In phiếu giao hàng siêu thị"
                              style={{
                                backgroundColor: '#f8fafc',
                                color: '#0f172a',
                                padding: '5px 8px',
                                borderRadius: '8px',
                                fontSize: '11px',
                                fontWeight: 700,
                                border: '1px solid #cbd5e1',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px',
                              }}
                            >
                              <Printer size={11} />
                              <span>In</span>
                            </button>

                            <button
                              onClick={() => setSelectedOrder(order)}
                              style={{
                                backgroundColor: '#f1f5f9',
                                color: '#334155',
                                padding: '5px 8px',
                                borderRadius: '8px',
                                fontSize: '11px',
                                fontWeight: 700,
                                border: '1px solid #cbd5e1',
                              }}
                            >
                              Chi Tiết
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            /* ── DẠNG LƯỚI THẺ CARD ── */
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px', marginBottom: '20px' }}>
              {paginatedOrders.map(order => {
                const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.PENDING;
                return (
                  <div
                    key={order.id}
                    onClick={() => setSelectedOrder(order)}
                    style={{
                      backgroundColor: '#ffffff',
                      borderRadius: '16px',
                      border: '1px solid #e2e8f0',
                      padding: '16px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div>
                      {/* Card Top: Code + Status Badge */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <span style={{
                          fontSize: '11px',
                          fontFamily: 'monospace',
                          fontWeight: 800,
                          color: '#1d4ed8',
                          backgroundColor: '#eff6ff',
                          padding: '4px 8px',
                          borderRadius: '8px',
                          border: '1px solid #dbeafe',
                        }}>
                          #{order.orderCode}
                        </span>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '3px 8px',
                          borderRadius: '999px',
                          fontSize: '11px',
                          fontWeight: 800,
                          color: cfg.color,
                          backgroundColor: cfg.bg,
                          border: `1px solid ${cfg.border}`,
                        }}>
                          {cfg.icon}
                          <span>{cfg.label}</span>
                        </span>
                      </div>

                      {/* Customer Name */}
                      <h4 style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {order.customerName}
                      </h4>

                      {/* Address Summary */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '12px',
                        color: '#475569',
                        marginBottom: '10px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}>
                        <MapPin size={13} color="#ef4444" style={{ flexShrink: 0 }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{order.customerAddress}</span>
                      </div>

                      {/* Driver / Trip Assigned Box */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '12px',
                        color: '#1e293b',
                        marginBottom: '12px',
                        backgroundColor: '#f8fafc',
                        padding: '8px 10px',
                        borderRadius: '10px',
                        border: '1px solid #e2e8f0',
                      }}>
                        <Truck size={14} color={order.assignedDriverName ? '#059669' : '#94a3b8'} />
                        {order.assignedDriverName ? (
                          <span style={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {order.assignedDriverName} <b style={{ color: '#047857', fontFamily: 'monospace', fontSize: '11px' }}>(Chuyến #{order.tripNumber || 1})</b>
                          </span>
                        ) : (
                          <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Chưa gán tài xế</span>
                        )}
                      </div>
                    </div>

                    {/* Card Bottom: Total Amount & Action Button */}
                    <div
                      style={{
                        paddingTop: '12px',
                        borderTop: '1px solid #f1f5f9',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px',
                      }}
                      onClick={e => e.stopPropagation()}
                    >
                      <div>
                        <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>
                          {order.paymentMethod === 'cod' ? 'Thu hộ COD' : 'VNPay'}
                        </div>
                        <div style={{ fontSize: '14px', fontWeight: 900, color: '#0f172a' }}>
                          {order.totalAmount.toLocaleString('vi-VN')}đ
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {order.status === 'PENDING' && (
                          <button
                            onClick={() => handleReceiveAndStartPicking(order)}
                            style={{
                              backgroundColor: '#2563eb',
                              color: '#ffffff',
                              padding: '6px 12px',
                              borderRadius: '8px',
                              fontSize: '11px',
                              fontWeight: 800,
                              border: 'none',
                              boxShadow: '0 2px 6px rgba(37,99,235,0.25)',
                            }}
                          >
                            📥 Tiếp Nhận & Soạn Hàng
                          </button>
                        )}

                        {(order.status === 'PROCESSING' || order.status === 'PICKING') && (
                          <button
                            onClick={() => handleCompletePicking(order)}
                            style={{
                              backgroundColor: '#059669',
                              color: '#ffffff',
                              padding: '6px 12px',
                              borderRadius: '8px',
                              fontSize: '11px',
                              fontWeight: 800,
                              border: 'none',
                              boxShadow: '0 2px 6px rgba(5,150,105,0.25)',
                            }}
                          >
                            📦 Đã Soạn Xong (Chuyển Giao)
                          </button>
                        )}

                        {(order.status === 'PACKED' || order.status === 'READY_FOR_DELIVERY') && (
                          <button
                            onClick={() => {
                              setManualDriverModalOrder(order);
                              setSelectedDriverForAssign(GOVAP_DRIVERS[0]);
                            }}
                            style={{
                              backgroundColor: '#d97706',
                              color: '#ffffff',
                              padding: '6px 12px',
                              borderRadius: '8px',
                              fontSize: '11px',
                              fontWeight: 800,
                              border: 'none',
                              boxShadow: '0 2px 6px rgba(217,119,6,0.25)',
                            }}
                          >
                            🛵 Gán Xe
                          </button>
                        )}

                        {(order.status === 'COMPLETED' || order.status === 'DELIVERED') && (
                          <button
                            onClick={() => setPodPreviewModalOrder(order)}
                            style={{
                              backgroundColor: '#059669',
                              color: '#ffffff',
                              padding: '6px 12px',
                              borderRadius: '8px',
                              fontSize: '11px',
                              fontWeight: 800,
                              border: 'none',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              boxShadow: '0 2px 6px rgba(5,150,105,0.25)',
                            }}
                          >
                            <Camera size={12} color="#ffffff" />
                            <span>Ảnh POD</span>
                          </button>
                        )}

                        {(order.status === 'FAILED_DELIVERY' || order.status === 'RETURN_TO_WAREHOUSE') && (
                          <button
                            onClick={() => setReverseLogisticsModalOrder(order)}
                            style={{
                              backgroundColor: '#dc2626',
                              color: '#ffffff',
                              padding: '6px 12px',
                              borderRadius: '8px',
                              fontSize: '11px',
                              fontWeight: 800,
                              border: 'none',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              boxShadow: '0 2px 6px rgba(220,38,38,0.25)',
                            }}
                          >
                            <RotateCcw size={12} color="#ffffff" />
                            <span>Xử Lý Hoàn</span>
                          </button>
                        )}

                        <button
                          onClick={() => setPrintModalOrder(order)}
                          title="In phiếu giao hàng siêu thị"
                          style={{
                            backgroundColor: '#f8fafc',
                            color: '#0f172a',
                            padding: '6px 10px',
                            borderRadius: '8px',
                            fontSize: '11px',
                            fontWeight: 700,
                            border: '1px solid #cbd5e1',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <Printer size={12} />
                          <span>In</span>
                        </button>

                        <button
                          onClick={() => setSelectedOrder(order)}
                          style={{
                            backgroundColor: '#f1f5f9',
                            color: '#334155',
                            padding: '6px 10px',
                            borderRadius: '8px',
                            fontSize: '11px',
                            fontWeight: 700,
                            border: '1px solid #cbd5e1',
                          }}
                        >
                          Chi Tiết
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── PAGINATION CONTROLS ── */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            padding: '14px 20px',
            border: '1px solid #e2e8f0',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
            marginBottom: '30px',
          }}>
            {/* Left: Summary Info */}
            <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>
              Hiển thị <b style={{ color: '#0f172a' }}>{filteredOrders.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}</b> - <b style={{ color: '#0f172a' }}>{Math.min(currentPage * pageSize, filteredOrders.length)}</b> trong tổng số <b style={{ color: '#2563eb' }}>{filteredOrders.length}</b> đơn hàng
            </div>

            {/* Center: Items per page selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 700 }}>Số đơn/trang:</span>
              {[6, 9, 12, 18, 36].map(num => (
                <button
                  key={num}
                  onClick={() => setPageSize(num)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 800,
                    backgroundColor: pageSize === num ? '#2563eb' : '#f1f5f9',
                    color: pageSize === num ? '#ffffff' : '#475569',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {num}
                </button>
              ))}
            </div>

            {/* Right: Navigation Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {/* First Page */}
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                style={{
                  padding: '6px 10px',
                  borderRadius: '8px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  color: currentPage === 1 ? '#cbd5e1' : '#334155',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title="Trang đầu"
              >
                <ChevronsLeft size={16} />
              </button>

              {/* Prev Page */}
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  color: currentPage === 1 ? '#cbd5e1' : '#334155',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '12px',
                  fontWeight: 700,
                }}
              >
                <ChevronLeft size={16} />
                <span>Trước</span>
              </button>

              {/* Page Number Chips */}
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || (p >= currentPage - 2 && p <= currentPage + 2))
                .map((p, idx, arr) => {
                  const prev = arr[idx - 1];
                  const showEllipsis = prev && p - prev > 1;
                  return (
                    <React.Fragment key={p}>
                      {showEllipsis && <span style={{ padding: '0 4px', color: '#94a3b8' }}>...</span>}
                      <button
                        onClick={() => setCurrentPage(p)}
                        style={{
                          minWidth: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: 800,
                          backgroundColor: currentPage === p ? '#2563eb' : '#ffffff',
                          color: currentPage === p ? '#ffffff' : '#334155',
                          border: `1px solid ${currentPage === p ? '#2563eb' : '#cbd5e1'}`,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {p}
                      </button>
                    </React.Fragment>
                  );
                })}

              {/* Next Page */}
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  color: currentPage === totalPages ? '#cbd5e1' : '#334155',
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '12px',
                  fontWeight: 700,
                }}
              >
                <span>Sau</span>
                <ChevronRight size={16} />
              </button>

              {/* Last Page */}
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                style={{
                  padding: '6px 10px',
                  borderRadius: '8px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  color: currentPage === totalPages ? '#cbd5e1' : '#334155',
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title="Trang cuối"
              >
                <ChevronsRight size={16} />
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── SLIDE-OVER DRAWER FOR ORDER DETAILS ── */}
      {selectedOrder && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 2000,
          display: 'flex',
          justifyContent: 'flex-end',
          backgroundColor: 'rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(3px)',
        }}>
          <div style={{
            width: '100%',
            maxWidth: '480px',
            backgroundColor: '#ffffff',
            borderLeft: '1px solid #e2e8f0',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            overflowY: 'auto',
            boxShadow: '-10px 0 30px rgba(0,0,0,0.1)',
          }}>
            <div>
              {/* Top Drawer Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '16px', borderBottom: '1px solid #f1f5f9', marginBottom: '18px' }}>
                <div>
                  <span style={{ fontSize: '11px', fontFamily: 'monospace', fontWeight: 800, color: '#2563eb' }}>#{selectedOrder.orderCode}</span>
                  <h3 style={{ fontSize: '17px', fontWeight: 900, color: '#0f172a', margin: '2px 0 0 0' }}>{selectedOrder.customerName}</h3>
                </div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  style={{ padding: '6px', borderRadius: '8px', backgroundColor: '#f1f5f9', color: '#64748b', border: 'none' }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Status Banner */}
              <div style={{ padding: '12px 14px', borderRadius: '12px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 700 }}>Trạng thái đơn:</span>
                <span
                  style={{
                    padding: '3px 10px',
                    borderRadius: '999px',
                    fontSize: '11px',
                    fontWeight: 800,
                    color: STATUS_CONFIG[selectedOrder.status]?.color || '#333',
                    backgroundColor: STATUS_CONFIG[selectedOrder.status]?.bg || '#eee',
                    border: `1px solid ${STATUS_CONFIG[selectedOrder.status]?.border || '#ccc'}`,
                  }}
                >
                  {STATUS_CONFIG[selectedOrder.status]?.label || selectedOrder.status}
                </span>
              </div>

              {/* Destination Address Card */}
              <div style={{ padding: '14px', borderRadius: '12px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', marginBottom: '16px', fontSize: '12px' }}>
                <div style={{ fontWeight: 800, color: '#334155', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <MapPin size={14} color="#ef4444" />
                  <span>Địa chỉ nhận hàng:</span>
                </div>
                <div style={{ color: '#0f172a', fontWeight: 700, paddingLeft: '20px' }}>{selectedOrder.customerAddress}</div>
                <div style={{ color: '#64748b', paddingLeft: '20px', marginTop: '4px' }}>📞 {selectedOrder.customerPhone}</div>
              </div>

              {/* Items List */}
              <div style={{ padding: '14px', borderRadius: '12px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', marginBottom: '16px', fontSize: '12px' }}>
                <div style={{ fontWeight: 800, color: '#334155', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                  <Boxes size={14} color="#2563eb" />
                  <span>Mặt hàng chuỗi lạnh (FEFO):</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {selectedOrder.items.map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px', borderRadius: '10px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0' }}>
                      <div>
                        <div style={{ fontWeight: 800, color: '#0f172a' }}>{item.productName}</div>
                        <div style={{ fontSize: '10px', color: '#94a3b8', fontFamily: 'monospace' }}>SKU: {item.sku} • 0°C - 4°C</div>
                      </div>
                      <div style={{ fontWeight: 900, color: '#2563eb' }}>x{item.quantity || 1} {item.unit || 'món'}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Assigned Driver Box */}
              <div style={{ padding: '14px', borderRadius: '12px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', marginBottom: '16px', fontSize: '12px' }}>
                <div style={{ fontWeight: 800, color: '#334155', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                  <Truck size={14} color="#059669" />
                  <span>Tài xế phụ trách:</span>
                </div>
                {selectedOrder.assignedDriverName ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingLeft: '20px' }}>
                    <div>
                      <div style={{ fontWeight: 800, color: '#0f172a' }}>{selectedOrder.assignedDriverName}</div>
                      <div style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>{selectedOrder.assignedDriverPhone} • {selectedOrder.assignedDriverPlate}</div>
                    </div>
                    <span style={{ fontSize: '10px', backgroundColor: '#dcfce7', color: '#166534', padding: '3px 8px', borderRadius: '999px', fontFamily: 'monospace', fontWeight: 800 }}>
                      Chuyến #{selectedOrder.tripNumber || 1}
                    </span>
                  </div>
                ) : (
                  <div style={{ paddingLeft: '20px', color: '#94a3b8' }}>Chưa được gán tài xế</div>
                )}
              </div>
            </div>

            {/* Bottom Actions inside Drawer */}
            <div style={{ paddingTop: '16px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setPrintModalOrder(selectedOrder)}
                style={{
                  padding: '12px 14px',
                  backgroundColor: '#0f172a',
                  color: '#ffffff',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: 800,
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                }}
              >
                <Printer size={15} color="#38bdf8" />
                <span>In Phiếu</span>
              </button>

              <button
                onClick={() => {
                  setManualDriverModalOrder(selectedOrder);
                  setSelectedDriverForAssign(GOVAP_DRIVERS[0]);
                  setSelectedOrder(null);
                }}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: 800,
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                🛵 Gán Xe
              </button>
              <button
                onClick={() => setSelectedOrder(null)}
                style={{
                  padding: '12px 16px',
                  backgroundColor: '#f1f5f9',
                  color: '#475569',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: 800,
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

      {/* ── MODAL: GÁN TÀI XẾ THỦ CÔNG ── */}
      {manualDriverModalOrder && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 3000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(3px)',
          padding: '16px',
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '20px',
            maxWidth: '440px',
            width: '100%',
            padding: '24px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '14px', borderBottom: '1px solid #f1f5f9', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <Truck size={18} color="#2563eb" />
                Gán Tài Xế Cho Đơn #{manualDriverModalOrder.orderCode}
              </h3>
              <button onClick={() => setManualDriverModalOrder(null)} style={{ color: '#94a3b8', border: 'none', background: 'none' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ maxHeight: '250px', overflowY: 'auto', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {GOVAP_DRIVERS.map(driver => {
                const isSelected = selectedDriverForAssign?.id === driver.id;
                return (
                  <div
                    key={driver.id}
                    onClick={() => setSelectedDriverForAssign(driver)}
                    style={{
                      padding: '12px',
                      borderRadius: '12px',
                      border: `1.5px solid ${isSelected ? '#3b82f6' : '#e2e8f0'}`,
                      backgroundColor: isSelected ? '#eff6ff' : '#f8fafc',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        backgroundColor: '#2563eb',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '14px',
                      }}>
                        🛵
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>{driver.name}</div>
                        <div style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>{driver.phone} • {driver.plate}</div>
                      </div>
                    </div>
                    {isSelected && <Check size={18} color="#2563eb" />}
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={handleAssignSingleDriver}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: '#059669',
                  color: '#ffffff',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: 800,
                  border: 'none',
                }}
              >
                Xác Nhận Gán Xe
              </button>
              <button
                onClick={() => setManualDriverModalOrder(null)}
                style={{
                  padding: '12px 18px',
                  backgroundColor: '#f1f5f9',
                  color: '#475569',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: 800,
                  border: 'none',
                }}
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: XỬ LÝ HÀNG HOÀN (REVERSE LOGISTICS) ── */}
      {reverseLogisticsModalOrder && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 3000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(3px)',
          padding: '16px',
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            border: '1px solid #fecaca',
            borderRadius: '20px',
            maxWidth: '440px',
            width: '100%',
            padding: '24px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '14px', borderBottom: '1px solid #fef2f2', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 900, color: '#b91c1c', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <AlertTriangle size={18} color="#dc2626" />
                Xử Lý Hàng Hoàn #{reverseLogisticsModalOrder.orderCode}
              </h3>
              <button onClick={() => setReverseLogisticsModalOrder(null)} style={{ color: '#94a3b8', border: 'none', background: 'none' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '12px', borderRadius: '12px', backgroundColor: '#fef2f2', border: '1px solid #fee2e2', fontSize: '12px', marginBottom: '16px' }}>
              <div style={{ fontWeight: 800, color: '#991b1b', marginBottom: '4px' }}>Lý do giao không thành công:</div>
              <div style={{ color: '#7f1d1d' }}>{reverseLogisticsModalOrder.failureReason || 'Khách hàng không nghe máy (Đã gọi 3 lần)'}</div>
            </div>

            {/* Photo Proof */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 700, marginBottom: '6px' }}>Ảnh bằng chứng sự cố:</div>
              <div style={{ height: '160px', borderRadius: '12px', overflow: 'hidden', backgroundColor: '#f1f5f9', border: '1px solid #e2e8f0' }}>
                <img
                  src="https://images.unsplash.com/photo-1558611848-73f7eb4001a1?w=500&q=80"
                  alt="Ảnh sự cố"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                onClick={() => handleRestockOrder(reverseLogisticsModalOrder.id)}
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: 800,
                  border: 'none',
                }}
              >
                📦 Nhập Lại Tồn Kho Lạnh (Restock)
              </button>
              <button
                onClick={() => handleRedispatchOrder(reverseLogisticsModalOrder.id)}
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: '#d97706',
                  color: '#ffffff',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: 800,
                  border: 'none',
                }}
              >
                🔁 Lên Lịch Giao Lại Chuyến Sau
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: XEM BẰNG CHỨNG GIAO HÀNG POD AMAZON S3 ── */}
      {podPreviewModalOrder && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 3000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(3px)',
          padding: '16px',
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            border: '1px solid #a7f3d0',
            borderRadius: '20px',
            maxWidth: '440px',
            width: '100%',
            padding: '24px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '14px', borderBottom: '1px solid #f0fdf4', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 900, color: '#065f46', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <CheckCircle2 size={18} color="#059669" />
                Bằng Chứng Giao Hàng POD #{podPreviewModalOrder.orderCode}
              </h3>
              <button onClick={() => setPodPreviewModalOrder(null)} style={{ color: '#94a3b8', border: 'none', background: 'none' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '12px', borderRadius: '12px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', fontSize: '12px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 800, color: '#0f172a' }}>{podPreviewModalOrder.customerName}</div>
                <div style={{ color: '#64748b' }}>{podPreviewModalOrder.customerAddress}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#2563eb', fontWeight: 800, backgroundColor: '#eff6ff', padding: '3px 8px', borderRadius: '999px' }}>
                <Cloud size={14} />
                <span>Amazon S3</span>
              </div>
            </div>

            {/* S3 Photo Preview */}
            <div style={{ height: '200px', borderRadius: '12px', overflow: 'hidden', backgroundColor: '#f1f5f9', border: '1px solid #e2e8f0', marginBottom: '18px', position: 'relative' }}>
              <img
                src="https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&q=80"
                alt="Ảnh POD"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <div style={{ position: 'absolute', bottom: 0, insetInline: 0, backgroundColor: 'rgba(15, 23, 42, 0.8)', padding: '8px 12px', color: '#ffffff', fontSize: '11px' }}>
                <div style={{ fontWeight: 700 }}>📍 GPS: 10.8354, 106.6668 • Geotagged</div>
                <div style={{ color: '#cbd5e1', fontSize: '10px' }}>🏬 Kho Gò Vấp (WH-006) • Thùng Lạnh Xe Máy 0-4°C</div>
              </div>
            </div>

            <button
              onClick={() => setPodPreviewModalOrder(null)}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#f1f5f9',
                color: '#475569',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: 800,
                border: 'none',
              }}
            >
              Đóng Bằng Chứng
            </button>
          </div>
        </div>
      )}

      {/* ── MODAL: IN PHIẾU GIAO HÀNG & SOẠN HÀNG SIÊU THỊ ── */}
      {printModalOrder && (
        <PrintOrderSlipModal
          order={printModalOrder}
          onClose={() => setPrintModalOrder(null)}
        />
      )}

    </div>
  );
}
