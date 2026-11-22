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
  Route,
  Camera,
  Cloud,
  Compass,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  LayoutGrid,
  List,
  Printer,
  FileText,
  Phone,
  ExternalLink,
  Lock,
  Eye,
  User,
  AlertCircle,
  DollarSign,
  Radio,
  Lightbulb,
  Volume2,
} from 'lucide-react';
import { io } from 'socket.io-client';
import { useAuth } from '@/features/auth';
import { useWarehouse } from '@/shared';
import { getApiHost } from '@/shared/utils/apiConfig';
import { GOVAP_DRIVERS } from '@/features/sales/pages/OrderManagement';
import { ControlTowerMap } from '../components/ControlTowerMap';
import { PrintOrderSlipModal, detectSlipClassification } from '@/features/outbound';
import { OutboundReceiptModal } from '@/features/outbound';

const ORDER_API = `${getApiHost(3004)}/orders`;
const OUTBOUND_API = getApiHost(3007);
const WAREHOUSE_API = getApiHost(3005);
const INBOUND_API = getApiHost(3006);
const IOT_API = getApiHost(3002);

export { DEFAULT_VERIFIED_POD_PHOTO, resolvePodUrl } from '@/shared/utils/podUtils';
import { DEFAULT_VERIFIED_POD_PHOTO, resolvePodUrl } from '@/shared/utils/podUtils';

interface OrderItem {
  id?: string;
  sku: string;
  productId?: string;
  productName: string;
  requestedQuantity: number;
  quantity?: number;
  pickedQuantity?: number;
  slotId?: string;
  unit?: string;
  price?: number;
}

const DEMO_IOT_SHELVES = ['A1', 'A2', 'A3'] as const;
type DemoIotShelfCode = (typeof DEMO_IOT_SHELVES)[number];
type DemoRackLetter = 'A' | 'B' | 'C';
type DemoTierNumber = 1 | 2;

interface ShelfTierLocation {
  rack: DemoRackLetter;
  rackLabel: string;      // "Kệ A" | "Kệ B" | "Kệ C"
  tier: DemoTierNumber;
  tierLabel: string;      // "Tầng 1" | "Tầng 2"
  fullLabel: string;      // "Kệ A - Tầng 1"
  shortCode: string;      // "A-T1"
  hwShelfCode: DemoIotShelfCode; // Kệ A -> A1, Kệ B -> A2, Kệ C -> A3
}

function cleanProductDisplayName(name: string): string {
  return String(name || '').replace(/\s*\[[A-C][123]?-\d+\]/gi, '').trim();
}

function resolveOrderItemShelfTier(item: OrderItem, idx = 0): ShelfTierLocation {
  const rawCombined = `${item.slotId || ''} ${item.productName || ''} ${item.sku || ''}`.toUpperCase();

  let rack: DemoRackLetter | null = null;
  let tier: DemoTierNumber | null = null;

  // 1. Check explicit A-T1, B-T2, C-T1 or [A1-01], [A2-02], [A3-02], [B1-01]
  const tierMatch = rawCombined.match(/(?:^|[^A-Z0-9])([ABC])[-_ ]*T([12])(?=$|[^0-9])/);
  if (tierMatch) {
    rack = tierMatch[1] as DemoRackLetter;
    tier = Number(tierMatch[2]) as DemoTierNumber;
  }

  if (!rack) {
    const legacyHyphen = rawCombined.match(/(?:^|[^A-Z0-9])(A1|A2|A3)[-_ ]+0?([123])(?=$|[^0-9])/);
    if (legacyHyphen) {
      const token = legacyHyphen[1];
      const subNum = Number(legacyHyphen[2]);
      if (token === 'A1') rack = 'A';
      else if (token === 'A2') rack = 'B';
      else rack = 'C';
      tier = subNum === 2 ? 2 : 1;
    } else {
      const directMatch = rawCombined.match(/(?:^|[^A-Z0-9])([ABC])([12])(?=$|[^0-9])/);
      if (directMatch) {
        rack = directMatch[1] as DemoRackLetter;
        tier = Number(directMatch[2]) as DemoTierNumber;
      }
    }
  }

  // 2. Fallback by product keywords
  if (!rack) {
    const text = `${item.productName || ''} ${item.sku || ''}`.toLowerCase();
    if (/thịt|heo|bò|gà|cá|tôm|hải sản|xúc xích|chả/.test(text)) {
      rack = 'A';
    } else if (/sữa|trứng|phô mai|bơ|yogurt|sữa chua|nước/.test(text)) {
      rack = 'B';
    } else if (/rau|củ|cà|xà lách|táo|cam|nấm|trái|dưa|bắp/.test(text)) {
      rack = 'C';
    } else {
      const racks: DemoRackLetter[] = ['A', 'B', 'C'];
      rack = racks[idx % 3];
    }
  }

  if (!tier) {
    tier = ((idx % 2) + 1) as DemoTierNumber;
  }

  const hwMap: Record<DemoRackLetter, DemoIotShelfCode> = {
    A: 'A1',
    B: 'A2',
    C: 'A3',
  };

  return {
    rack,
    rackLabel: `Kệ ${rack}`,
    tier,
    tierLabel: `${rack}${tier}`,
    fullLabel: `${rack}${tier}`,
    shortCode: `${rack}${tier}`,
    hwShelfCode: hwMap[rack],
  };
}

function getOrderUniqueLocations(items: OrderItem[] = []): ShelfTierLocation[] {
  const seen = new Set<string>();
  const list: ShelfTierLocation[] = [];
  items.forEach((item, idx) => {
    const loc = resolveOrderItemShelfTier(item, idx);
    if (!seen.has(loc.shortCode)) {
      seen.add(loc.shortCode);
      list.push(loc);
    }
  });
  return list;
}

interface ActiveOrderPickGuide {
  orderId: string;
  orderCode: string;
  itemIdx: number;
  itemId?: string;
  productName: string;
  sku: string;
  quantity: number;
  shelfCode: DemoIotShelfCode;
  rackLabel: string;
  tierLabel: string;
  fullLocationLabel: string;
  step: number;
  totalSteps: number;
  status: 'LOCATING' | 'WAITING_STOP' | 'STOP_CONFIRMED' | 'COMPLETED';
  baselineStopSeq: number;
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
  rawCreatedAt?: string;
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
  WAITING_TRANSFER:    { label: 'Chờ nhập điều chuyển', color: '#c2410c', bg: '#fff7ed', border: '#fed7aa', icon: <RotateCcw size={12} /> },
  PROCESSING:          { label: 'Đang soạn hàng', color: '#1d4ed8', bg: '#dbeafe', border: '#bfdbfe', icon: <Boxes size={12} /> },
  PICKING:             { label: 'Đang soạn hàng', color: '#6d28d9', bg: '#ede9fe', border: '#ddd6fe', icon: <Boxes size={12} /> },
  PACKING:             { label: 'Đang đóng gói', color: '#0f766e', bg: '#ccfbf1', border: '#99f6e4', icon: <PackageCheck size={12} /> },
  PICKED:              { label: 'Đang đóng gói', color: '#0f766e', bg: '#ccfbf1', border: '#99f6e4', icon: <PackageCheck size={12} /> },
  PACKED:              { label: 'Đã đóng gói', color: '#0f766e', bg: '#ccfbf1', border: '#99f6e4', icon: <PackageCheck size={12} /> },
  CONFIRMED:           { label: 'Đã xuất kho', color: '#c2410c', bg: '#ffedd5', border: '#fed7aa', icon: <PackageCheck size={12} /> },
  READY_FOR_DELIVERY:  { label: 'Chờ phân tuyến', color: '#c2410c', bg: '#fff7ed', border: '#fed7aa', icon: <Clock size={12} /> },
  SHIPPED:             { label: 'Đang giao hàng', color: '#0284c7', bg: '#e0f2fe', border: '#bae6fd', icon: <Truck size={12} /> },
  DELIVERING:          { label: 'Đang giao hàng', color: '#0284c7', bg: '#e0f2fe', border: '#bae6fd', icon: <Truck size={12} /> },
  COMPLETED:           { label: 'Giao thành công', color: '#15803d', bg: '#dcfce7', border: '#bbf7d0', icon: <CheckCircle2 size={12} /> },
  DELIVERED:           { label: 'Giao thành công', color: '#15803d', bg: '#dcfce7', border: '#bbf7d0', icon: <CheckCircle2 size={12} /> },
  FAILED_DELIVERY:     { label: 'Giao thất bại', color: '#be123c', bg: '#ffe4e6', border: '#fecdd3', icon: <AlertTriangle size={12} /> },
  RETURN_TO_WAREHOUSE: { label: 'Đang hoàn về kho', color: '#c2410c', bg: '#ffedd5', border: '#fed7aa', icon: <RotateCcw size={12} /> },
  CANCELLED:           { label: 'Đã hủy đơn', color: '#64748b', bg: '#f1f5f9', border: '#cbd5e1', icon: <X size={12} /> },
};

const getOrderStatusConfig = (status: string, assignedDriverName?: string) => {
  if ((status === 'READY_FOR_DELIVERY' || status === 'CONFIRMED') && assignedDriverName) {
    return {
      label: 'Đã gán xe',
      color: '#075985',
      bg: '#f0f9ff',
      border: '#bae6fd',
      icon: <Truck size={12} />,
    };
  }
  return STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;
};

export default function OrderDispatch() {
  const { user } = useAuth();
  const { warehouses, selectedWarehouseCode } = useWarehouse();

  const [orders, setOrders] = useState<UnifiedOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<UnifiedOrder | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // URL Search & Highlight synchronization from GlobalSearch
  const [searchParams] = useSearchParams();
  const urlSearch = searchParams.get('search') || '';
  const urlHighlight = searchParams.get('highlight') || '';

  const [highlightCode, setHighlightCode] = useState<string>(urlHighlight);

  useEffect(() => {
    if (urlHighlight) {
      setHighlightCode(urlHighlight);
      const timer = setTimeout(() => setHighlightCode(''), 7000);
      return () => clearTimeout(timer);
    }
  }, [urlHighlight]);

  useEffect(() => {
    if (urlSearch) {
      setSearchQuery(urlSearch);
      setActivePipelineStep('ALL');
      setClassificationFilter('ALL');
    }
  }, [urlSearch]);

  const isManager = user?.role === 'WAREHOUSE_MANAGER' || user?.role === 'WAREHOUSE_STAFF';
  const isSaler = user?.role === 'SALES_STAFF';
  const canOperateWarehouse = user?.role === 'ADMIN' || user?.role === 'WAREHOUSE_MANAGER' || user?.role === 'WAREHOUSE_STAFF';
  const myWarehouseCode = user?.warehouseCode || (user?.email?.includes('govap') ? 'WH-006' : 'WH-006');

  const [selectedWhFilter, setSelectedWhFilter] = useState<string>(() => {
    if (isManager) return myWarehouseCode;
    if (isSaler) return 'ALL';
    return selectedWarehouseCode || 'ALL';
  });

  useEffect(() => {
    if (isManager) {
      setSelectedWhFilter(myWarehouseCode);
    } else if (isSaler) {
      setSelectedWhFilter('ALL');
    } else if (selectedWarehouseCode) {
      setSelectedWhFilter(selectedWarehouseCode);
    }
  }, [isManager, isSaler, myWarehouseCode, selectedWarehouseCode]);

  const activeWh = isManager ? myWarehouseCode : (isSaler ? 'ALL' : selectedWhFilter);

  // Pipeline Step filter
  const [activePipelineStep, setActivePipelineStep] = useState<
    'ALL' | 'STEP_1_PICKING' | 'STEP_2_DISPATCH' | 'STEP_3_DELIVERING' | 'STEP_EXCEPTION' | 'STEP_COMPLETED'
  >('ALL');

  // Control Tower Map Collapse (default hidden on mobile or packing tab so orders are immediately visible)
  const [showMap, setShowMap] = useState<boolean>(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'map') return true;
    if (tabParam === 'packing' || tabParam === 'delivery') return false;
    if (typeof window !== 'undefined' && window.innerWidth < 1024) return false;
    if (user?.role === 'WAREHOUSE_STAFF') return false;
    return true;
  });

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'map') {
      setShowMap(true);
    } else if (tabParam === 'packing') {
      setShowMap(false);
    }
  }, [searchParams]);

  // Sequential Pick-to-Light (Kệ IoT A1, A2, A3) state
  const [pickedOrderItems, setPickedOrderItems] = useState<Record<string, Record<number, boolean>>>({});
  const [activePickGuide, setActivePickGuide] = useState<ActiveOrderPickGuide | null>(null);
  const autoAdvanceTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Modals & Action States
  const [manualDriverModalOrder, setManualDriverModalOrder] = useState<UnifiedOrder | null>(null);
  const [selectedDriverForAssign, setSelectedDriverForAssign] = useState<typeof GOVAP_DRIVERS[0] | null>(null);
  const [reverseLogisticsModalOrder, setReverseLogisticsModalOrder] = useState<UnifiedOrder | null>(null);
  const [podPreviewModalOrder, setPodPreviewModalOrder] = useState<UnifiedOrder | null>(null);
  const [printModalOrder, setPrintModalOrder] = useState<UnifiedOrder | null>(null);
  const [receiptModalOrder, setReceiptModalOrder] = useState<UnifiedOrder | null>(null);
  const [classificationFilter, setClassificationFilter] = useState<'ALL' | 'SALE' | 'DISPOSAL' | 'RETURN' | 'TRANSFER'>('ALL');
  const [autoPickingLoading, setAutoPickingLoading] = useState(false);
  const [autoDispatchLoading, setAutoDispatchLoading] = useState(false);
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Modal xác nhận thao tác xuất bến / giao hàng (Tránh bấm nhầm 1-chạm)
  const [confirmDispatchModal, setConfirmDispatchModal] = useState<{
    type: 'CONFIRM_DELIVERY' | 'HANDOVER_SINGLE' | 'HANDOVER_BATCH' | 'AUTO_DISPATCH';
    order?: UnifiedOrder;
    orders?: UnifiedOrder[];
  } | null>(null);
  const [confirmActionLoading, setConfirmActionLoading] = useState(false);

  const showToast = useCallback((text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // Close active drawer or modal when pressing Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (confirmDispatchModal) setConfirmDispatchModal(null);
        if (selectedOrder) setSelectedOrder(null);
        if (manualDriverModalOrder) setManualDriverModalOrder(null);
        if (reverseLogisticsModalOrder) setReverseLogisticsModalOrder(null);
        if (podPreviewModalOrder) setPodPreviewModalOrder(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [confirmDispatchModal, selectedOrder, manualDriverModalOrder, reverseLogisticsModalOrder, podPreviewModalOrder]);

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

    const inTransitIds = new Set<string>();
    const completedIds = new Set<string>();
    let savedPodPhotos: Record<string, string> = {};
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const rawInTransit = window.localStorage.getItem('sfwms_driver_intransit_ids');
        if (rawInTransit) JSON.parse(rawInTransit).forEach((id: string) => inTransitIds.add(id.toLowerCase()));
        const rawCompleted = window.localStorage.getItem('sfwms_driver_completed_ids');
        if (rawCompleted) JSON.parse(rawCompleted).forEach((id: string) => completedIds.add(id.toLowerCase()));
        const rawPods = window.localStorage.getItem('sfwms_pod_photos');
        if (rawPods) savedPodPhotos = JSON.parse(rawPods);
      } catch (e) {}
    }

    try {
      // 1. Fetch E-commerce orders (3004)
      const ecomUrl = activeWh && activeWh !== 'ALL'
        ? `${ORDER_API}?warehouseCode=${encodeURIComponent(activeWh)}`
        : ORDER_API;
      const ecomRes = await fetch(ecomUrl).catch(() => null);
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

            const cleanId = (o.id || '').toLowerCase();
            const cleanCode = (o.orderCode || `ECOMM-${(o.id || '').slice(0, 8).toUpperCase()}`).toLowerCase();
            const isIntransit = inTransitIds.has(cleanId) || inTransitIds.has(cleanCode) || Array.from(inTransitIds).some(id => (id.length >= 6 && cleanId.includes(id)) || (id.length >= 6 && cleanCode.includes(id)));
            const isDelivered = completedIds.has(cleanId) || completedIds.has(cleanCode) || o.status === 'COMPLETED' || o.status === 'DELIVERED';

            let finalStatus = o.status || 'PENDING';
            if (isDelivered) {
              finalStatus = 'COMPLETED';
            } else if (isIntransit || o.status === 'DELIVERING' || o.status === 'SHIPPED' || o.status === 'IN_TRANSIT') {
              finalStatus = 'DELIVERING';
            }

            const whCode = o.assignedWarehouseCode || o.assignedWarehouseId || 'WH-006';
            const whObj = warehouses.find(w => w.code === whCode);

            const resolvedOrderCode = o.orderCode || (
              o.id.startsWith('ECOMM-') ? o.id :
              o.id.startsWith('XK-') || o.id.startsWith('OB-') || o.id.startsWith('OUT-') ? o.id :
              o.id.length > 15 ? `ECOMM-${o.id.slice(0, 8).toUpperCase()}` : o.id
            );

            return {
              id: o.id,
              orderCode: resolvedOrderCode,
              customerName: o.customerName || 'Khách hàng C.T Mart',
              customerPhone: o.customerPhone || '0901234567',
              customerAddress: o.customerAddress || 'Gò Vấp, TP.HCM',
              totalAmount: Number(o.totalAmount || 0),
              paymentMethod: o.paymentMethod || 'cod',
              deliveryMethod: o.deliveryMethod || 'Hỏa tốc 1-2h',
              status: finalStatus,
              createdAt: new Date(o.createdAt || Date.now()).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }),
              rawCreatedAt: o.createdAt || new Date().toISOString(),
              items: (o.items || []).map((i: any) => ({
                sku: i.sku || i.productId || 'SKU-01',
                productName: i.productName || 'Sản phẩm tươi sạch',
                requestedQuantity: i.quantity || 1,
                quantity: i.quantity || 1,
                price: Number(i.price || 45000),
                unit: 'Món',
              })),
              warehouseCode: whCode,
              assignedWarehouseName: o.assignedWarehouseName || (whObj ? whObj.name : `Kho ${whCode}`),
              assignedDriverId: driverId,
              assignedDriverName: driverName,
              assignedDriverPhone: driverPhone,
              assignedDriverPlate: driverPlate,
              tripNumber: 1,
              podPhotoUrl: o.podPhotoUrl || savedPodPhotos[o.id] || savedPodPhotos[resolvedOrderCode] || (resolvedOrderCode ? savedPodPhotos[resolvedOrderCode.replace(/^ECOMM-/, '')] : undefined) || undefined,
              failureReason: o.failureReason || undefined,
              failurePhotoUrl: o.failurePhotoUrl || undefined,
              note: o.note,
              isEcommerce: true,
            };
          });
        }
      }

      // 2. Fetch Outbound orders (3007)
      const obUrl = activeWh && activeWh !== 'ALL'
        ? `${OUTBOUND_API}/outbound-orders?warehouseCode=${encodeURIComponent(activeWh)}`
        : `${OUTBOUND_API}/outbound-orders`;
      const obRes = await fetch(obUrl).catch(() => null);
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

            const rawCode = (o.orderCode || o.id || '').toUpperCase();
            const rawNote = (o.notes || o.note || '').toLowerCase();
            const rawDest = (o.destination || o.deliveryAddress || '').toLowerCase();
            const rawType = (o.orderType || o.type || '').toUpperCase();
            const isDisposal = 
              rawCode.includes('DISPOSAL') || 
              rawCode.includes('HUY') || 
              rawType === 'DISPOSAL' || 
              rawNote.includes('tiêu hủy') || 
              rawNote.includes('hủy') || 
              rawNote.includes('hết hạn') || 
              rawDest.includes('tiêu hủy') || 
              rawDest.includes('đa phước');

            const finalCustomerName = isDisposal 
              ? 'Khu Liên Hợp Xử Lý Môi Trường Đa Phước (Trạm QC Tiêu Hủy)' 
              : (o.requesterName || o.customerName || 'Chi nhánh / Khách mua sắm');

            const finalAddress = isDisposal
              ? 'Khu Liên Hợp Xử Lý Chất Thải Đa Phước, Xã Đa Phước, Huyện Bình Chánh, TP.HCM'
              : (o.destination || o.deliveryAddress || 'Kho Gò Vấp, TP.HCM');

            const finalAmount = isDisposal ? 0 : Number(o.totalAmount || 0);
            const finalPaymentMethod = isDisposal ? 'Xuất Hủy Xử Lý Chất Thải (COD 0đ)' : (o.paymentMethod || 'Chuyển khoản kho');

            const cleanId = (o.id || '').toLowerCase();
            const cleanCode = (o.orderCode || `OB-${o.id.slice(0, 8).toUpperCase()}`).toLowerCase();
            const isIntransit = inTransitIds.has(cleanId) || inTransitIds.has(cleanCode) || Array.from(inTransitIds).some(id => (id.length >= 6 && cleanId.includes(id)) || (id.length >= 6 && cleanCode.includes(id)));
            const isDelivered = completedIds.has(cleanId) || completedIds.has(cleanCode) || o.status === 'COMPLETED' || o.status === 'DELIVERED';

            let finalStatus = o.status;
            if (isDelivered) {
              finalStatus = 'DELIVERED';
            } else if (isIntransit || o.status === 'SHIPPED' || o.status === 'DELIVERING' || o.status === 'IN_TRANSIT') {
              finalStatus = 'SHIPPED';
            }

            const whCode = o.warehouseCode || 'WH-006';
            const whObj = warehouses.find(w => w.code === whCode);

            return {
              id: o.id,
              orderCode: o.orderCode || `OB-${o.id.slice(0, 8).toUpperCase()}`,
              customerName: finalCustomerName,
              customerPhone: isDisposal ? '1900 6868' : (o.customerPhone || '0977112233'),
              customerAddress: finalAddress,
              totalAmount: finalAmount,
              paymentMethod: finalPaymentMethod,
              status: finalStatus,
              createdAt: new Date(o.createdAt || Date.now()).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }),
              rawCreatedAt: o.createdAt || new Date().toISOString(),
              items: (o.items || []).map((i: any) => ({
                id: i.id,
                sku: i.sku || 'SKU-01',
                productName: i.productName || 'Hàng xuất kho',
                requestedQuantity: i.requestedQuantity || i.quantity || 1,
                quantity: i.requestedQuantity || i.quantity || 1,
                pickedQuantity: i.pickedQuantity || 0,
                slotId: i.slotId || undefined,
                price: isDisposal ? 0 : Number(i.price || 50000),
                unit: i.unit || 'Kg',
              })),
              warehouseCode: whCode,
              assignedWarehouseName: (whObj ? whObj.name : `Kho ${whCode}`),
              assignedDriverId: driverId,
              assignedDriverName: driverName,
              assignedDriverPhone: driverPhone,
              assignedDriverPlate: driverPlate,
              tripNumber: 1,
              podPhotoUrl: o.podPhotoUrl || (o as any).pod_photo_url || savedPodPhotos[o.id] || savedPodPhotos[o.orderCode] || undefined,
              failureReason: o.failureReason || undefined,
              failurePhotoUrl: o.failurePhotoUrl || undefined,
              note: isDisposal ? `[BIÊN BẢN TIÊU HỦY MÔI TRƯỜNG] ${o.notes || 'Thực phẩm hết hạn/hư hỏng chuyển trạm xử lý Đa Phước'}` : o.notes,
              isEcommerce: false,
            };
          });
        }
      }

      const statusRanks: Record<string, number> = {
        PENDING: 1,
        PROCESSING: 2,
        PICKING: 3,
        PACKING: 3.5,
        PICKED: 3.5,
        PACKED: 4,
        CONFIRMED: 5,
        READY_FOR_DELIVERY: 6,
        SHIPPED: 7,
        DELIVERING: 8,
        DELIVERED: 9,
        COMPLETED: 10,
      };

      const finalMap = new Map<string, UnifiedOrder>();

      // 1. Process E-commerce orders indexed by their canonical shortId
      ecomOrders.forEach(o => {
        const fullId = (o.id || '').toLowerCase().trim();
        const shortId = fullId.length >= 8 ? fullId.slice(0, 8).toUpperCase() : fullId.toUpperCase();
        const canonicalKey = shortId || fullId;

        finalMap.set(canonicalKey, o);
      });

      // 2. Process Outbound orders and merge into corresponding E-commerce order if same
      obOrders.forEach(o => {
        const rawCode = (o.orderCode || '').toUpperCase().trim();
        const rawId = (o.id || '').toLowerCase().trim();
        const shortId = rawId.length >= 8 ? rawId.slice(0, 8).toUpperCase() : rawId.toUpperCase();

        // Check if this outbound slip links to an existing ecom order via notes [ORDER_ID:uuid] or code ECOMM-xxxx
        let ecomShortKey: string | null = null;
        const match = `${o.notes || ''} ${o.note || ''}`.match(/\[(?:ORDER_)?ID:([^\]]+)\]/i);
        if (match) {
          const extractedUuid = match[1].toLowerCase().trim().replace(/-/g, '');
          const extractedShort = extractedUuid.slice(0, 8).toUpperCase();
          if (finalMap.has(extractedShort)) {
            ecomShortKey = extractedShort;
          }
        }

        if (!ecomShortKey && rawCode.startsWith('ECOMM-')) {
          const extracted = rawCode.replace('ECOMM-', '').slice(0, 8).toUpperCase();
          if (finalMap.has(extracted)) {
            ecomShortKey = extracted;
          }
        }

        const isDeliveredThis = 
          o.status === 'DELIVERED' || o.status === 'COMPLETED' ||
          completedIds.has(rawId) ||
          completedIds.has(rawCode.toLowerCase());

        if (ecomShortKey && finalMap.has(ecomShortKey)) {
          const existing = finalMap.get(ecomShortKey)!;
          const isDeliveredMerged = isDeliveredThis || existing.status === 'DELIVERED' || existing.status === 'COMPLETED';
          const isMoreAdvanced = (statusRanks[o.status] || 0) > (statusRanks[existing.status] || 0);

          const finalMergedStatus = isDeliveredMerged
            ? 'COMPLETED'
            : isMoreAdvanced ? (o.status === 'DELIVERED' ? 'COMPLETED' : o.status) : existing.status;

          finalMap.set(ecomShortKey, {
            ...existing,
            status: finalMergedStatus,
            assignedDriverId: o.assignedDriverId || existing.assignedDriverId,
            assignedDriverName: o.assignedDriverName || existing.assignedDriverName,
            assignedDriverPhone: o.assignedDriverPhone || existing.assignedDriverPhone,
            assignedDriverPlate: o.assignedDriverPlate || existing.assignedDriverPlate,
            podPhotoUrl: o.podPhotoUrl || existing.podPhotoUrl,
            failureReason: o.failureReason || existing.failureReason,
            failurePhotoUrl: o.failurePhotoUrl || existing.failurePhotoUrl,
          });
        } else {
          // Distinct Outbound order (e.g. RTV, DISPOSAL, Transfer)
          const baseCode = rawCode.replace(/^ECOMM-/, '').replace(/^OB-/, '').trim() || shortId;
          const canonicalKey = baseCode || rawCode || rawId;

          if (finalMap.has(canonicalKey)) {
            const existing = finalMap.get(canonicalKey)!;
            const isDelivered = isDeliveredThis || existing.status === 'DELIVERED' || existing.status === 'COMPLETED';
            const isMoreAdvanced = (statusRanks[o.status] || 0) > (statusRanks[existing.status] || 0);

            finalMap.set(canonicalKey, {
              ...existing,
              status: isDelivered ? 'COMPLETED' : (isMoreAdvanced ? o.status : existing.status),
              assignedDriverId: o.assignedDriverId || existing.assignedDriverId,
              assignedDriverName: o.assignedDriverName || existing.assignedDriverName,
              assignedDriverPhone: o.assignedDriverPhone || existing.assignedDriverPhone,
              assignedDriverPlate: o.assignedDriverPlate || existing.assignedDriverPlate,
              podPhotoUrl: o.podPhotoUrl || existing.podPhotoUrl,
              failureReason: o.failureReason || existing.failureReason,
              failurePhotoUrl: o.failurePhotoUrl || existing.failurePhotoUrl,
            });
          } else {
            finalMap.set(canonicalKey, {
              ...o,
              status: isDeliveredThis ? 'DELIVERED' : o.status,
            });
          }
        }
      });

      setOrders(Array.from(finalMap.values()));
    } catch (err) {
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [activeWh, warehouses]);

  useEffect(() => {
    fetchAllData();
    const interval = setInterval(() => fetchAllData(false), 2500);
    const onStorage = () => fetchAllData(false);
    window.addEventListener('storage', onStorage);
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', onStorage);
    };
  }, [fetchAllData]);

  // WebSocket Live Updates (Instant in-place state update + fetchAllData)
  useEffect(() => {
    const socket = io(getApiHost(3004));

    socket.on('order_status_updated', (updated: any) => {
      const targetId = (updated?.id || '').toLowerCase();
      const targetCode = (updated?.orderCode || '').toLowerCase();
      const clean = targetId.replace(/^ecomm-/, '').replace(/^out-/, '').replace(/^ob-/, '');

      setOrders(prev =>
        prev.map(o => {
          const oId = (o.id || '').toLowerCase();
          const oCode = (o.orderCode || '').toLowerCase();
          const oClean = oId.replace(/^ecomm-/, '').replace(/^out-/, '').replace(/^ob-/, '');

          const isMatch =
            (targetId && oId === targetId) ||
            (targetCode && (oCode === targetCode || oId === targetCode)) ||
            (clean && oClean === clean) ||
            (clean && clean.length >= 12 && (oId.startsWith(clean) || oClean.startsWith(clean)));

          if (isMatch) {
            return {
              ...o,
              status: updated.status || o.status,
              assignedDriverId: updated.assignedDriverId || o.assignedDriverId,
              assignedDriverName: updated.assignedDriverName || o.assignedDriverName,
              assignedDriverPhone: updated.assignedDriverPhone || o.assignedDriverPhone,
              assignedDriverPlate: updated.assignedDriverPlate || o.assignedDriverPlate,
              podPhotoUrl: updated.podPhotoUrl !== undefined ? updated.podPhotoUrl : o.podPhotoUrl,
              failurePhotoUrl: updated.failurePhotoUrl !== undefined ? updated.failurePhotoUrl : o.failurePhotoUrl,
              failureReason: updated.failureReason !== undefined ? updated.failureReason : o.failureReason,
            };
          }
          return o;
        })
      );

      // Cập nhật tức thì đơn hàng đang mở trong ngăn chi tiết (Drawer)
      setSelectedOrder(current => {
        if (!current) return null;
        const oId = (current.id || '').toLowerCase();
        const oCode = (current.orderCode || '').toLowerCase();
        const oClean = oId.replace(/^ecomm-/, '').replace(/^out-/, '').replace(/^ob-/, '');

        const isMatch =
          (targetId && oId === targetId) ||
          (targetCode && (oCode === targetCode || oId === targetCode)) ||
          (clean && oClean === clean) ||
          (clean && clean.length >= 12 && (oId.startsWith(clean) || oClean.startsWith(clean)));

        if (isMatch) {
          return {
            ...current,
            status: updated.status || current.status,
            assignedDriverId: updated.assignedDriverId || current.assignedDriverId,
            assignedDriverName: updated.assignedDriverName || current.assignedDriverName,
            assignedDriverPhone: updated.assignedDriverPhone || current.assignedDriverPhone,
            assignedDriverPlate: updated.assignedDriverPlate || current.assignedDriverPlate,
            podPhotoUrl: updated.podPhotoUrl !== undefined ? updated.podPhotoUrl : current.podPhotoUrl,
            failurePhotoUrl: updated.failurePhotoUrl !== undefined ? updated.failurePhotoUrl : current.failurePhotoUrl,
            failureReason: updated.failureReason !== undefined ? updated.failureReason : current.failureReason,
          };
        }
        return current;
      });

      fetchAllData(false);
    });

    socket.on('new_order', () => fetchAllData(false));

    socket.on('order_cancelled', (payload: any) => {
      const targetId = (payload?.orderId || payload?.id || '').toLowerCase();
      const targetCode = (payload?.orderCode || '').toLowerCase();
      const clean = targetId.replace(/^ecomm-/, '').replace(/^out-/, '').replace(/^ob-/, '');

      setOrders(prev =>
        prev.map(o => {
          const oId = (o.id || '').toLowerCase();
          const oCode = (o.orderCode || '').toLowerCase();
          const oClean = oId.replace(/^ecomm-/, '').replace(/^out-/, '').replace(/^ob-/, '');

          const isMatch =
            (targetId && oId === targetId) ||
            (targetCode && (oCode === targetCode || oId === targetCode)) ||
            (clean && oClean === clean) ||
            (clean && clean.length >= 8 && (oId.startsWith(clean) || oClean.startsWith(clean)));

          if (isMatch) {
            return {
              ...o,
              status: 'CANCELLED',
              cancelReason: payload.cancelReason || o.cancelReason,
            };
          }
          return o;
        })
      );

      setSelectedOrder(current => {
        if (!current) return null;
        const oId = (current.id || '').toLowerCase();
        const oCode = (current.orderCode || '').toLowerCase();
        const oClean = oId.replace(/^ecomm-/, '').replace(/^out-/, '').replace(/^ob-/, '');

        const isMatch =
          (targetId && oId === targetId) ||
          (targetCode && (oCode === targetCode || oId === targetCode)) ||
          (clean && oClean === clean) ||
          (clean && clean.length >= 8 && (oId.startsWith(clean) || oClean.startsWith(clean)));

        if (isMatch) {
          return {
            ...current,
            status: 'CANCELLED',
            cancelReason: payload.cancelReason || current.cancelReason,
          };
        }
        return current;
      });

      fetchAllData(false);
    });

    return () => {
      socket.disconnect();
    };
  }, [fetchAllData]);

  // 1. Tiếp nhận đơn và chuyển sang trạng thái Đang Soạn Hàng (PROCESSING / PICKING) hoặc Chờ Điều Chuyển (WAITING_TRANSFER)
  const handleReceiveAndStartPicking = async (order: UnifiedOrder) => {
    try {
      const isTransferOrder = (order.note || '').includes('[CHỜ HÀNG ĐIỀU CHUYỂN]') || 
                              (order.notes || '').includes('[CHỜ HÀNG ĐIỀU CHUYỂN]') ||
                              (order.deliveryNotes || '').includes('điều chuyển');
      const targetStatus = isTransferOrder ? 'WAITING_TRANSFER' : 'PROCESSING';

      // Cập nhật lạc quan ngay lập tức trên UI để tránh bị treo giao diện
      setOrders(prev => prev.map(o => (o.id === order.id || o.orderCode === order.orderCode) ? { ...o, status: targetStatus } : o));
      setSelectedOrder(prev => (prev && (prev.id === order.id || prev.orderCode === order.orderCode)) ? { ...prev, status: targetStatus } : prev);

      const isOutbound = order.orderCode?.startsWith('OB-') ||
                         order.orderCode?.startsWith('RTV-') ||
                         order.orderCode?.startsWith('DISP-') ||
                         !order.isEcommerce;

      if (isOutbound) {
        // Đơn hàng xuất kho (RTV, Tiêu hủy QC, Điều chuyển/Xuất nội bộ) vốn đã tồn tại trong outbound-service (:3007)
        // Duyệt đơn xuất kho để chuyển trạng thái sang PICKING / WAITING_TRANSFER
        const cleanId = order.id.replace(/^ECOMM-/, '').replace(/^OB-/, '');
        const targetId = order.id.startsWith('ECOMM-') ? cleanId : order.id;

        const approveRes = await fetch(`${OUTBOUND_API}/outbound-orders/${targetId}/approve`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
        }).catch(() => null);

        if (!approveRes || !approveRes.ok) {
          await fetch(`${OUTBOUND_API}/outbound-orders/${targetId}/approve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          }).catch(async () => {
            await fetch(`${OUTBOUND_API}/outbound-orders/${targetId}/status`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: isTransferOrder ? 'WAITING_TRANSFER' : 'PICKING' }),
            }).catch(() => {});
          });
        }
      } else {
        // Đơn hàng thương mại điện tử từ order-service (:3004)
        const cleanId = order.id.replace(/^ECOMM-/, '').replace(/^OB-/, '');

        // 1. Cập nhật status order-service sang targetStatus (WAITING_TRANSFER hoặc PROCESSING)
        await fetch(`${ORDER_API}/sync-status/${order.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: targetStatus }),
        }).catch(() => {});

        if (cleanId && cleanId !== order.id) {
          await fetch(`${ORDER_API}/sync-status/${cleanId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: targetStatus }),
          }).catch(() => {});
        }

        // 2. Đồng bộ lệnh xuất kho sang outbound-service (:3007) để quản lý kho tiếp nhận & giao việc
        const whCode = order.warehouseCode || 'WH-006';
        const resolvedObCode = order.orderCode.startsWith('ECOMM-') ? order.orderCode : `ECOMM-${order.orderCode}`;
        await fetch(`${OUTBOUND_API}/outbound-orders`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderCode: resolvedObCode,
            warehouseCode: whCode,
            warehouseId: whCode,
            requestedBy: user?.id || 'mgr-govap',
            requesterName: order.customerName,
            destination: order.customerAddress,
            status: targetStatus,
            notes: (order.note || order.notes || '') + (isTransferOrder ? ' [CHỜ HÀNG ĐIỀU CHUYỂN]' : ''),
            items: order.items.map(i => ({
              sku: i.sku,
              productName: i.productName,
              requestedQuantity: i.requestedQuantity || i.quantity || 1,
            })),
          })
        }).catch(() => {});
      }

      // 3. Phóng WebSocket broadcast sang Order Gateway (:3004) để cập nhật tức thì
      await fetch(`${ORDER_API}/broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'order_status_updated',
          payload: {
            id: order.id,
            orderCode: order.orderCode,
            status: isTransferOrder ? 'WAITING_TRANSFER' : (isOutbound ? 'PICKING' : targetStatus),
          },
        }),
      }).catch(() => {});

      if (isTransferOrder) {
        showToast(`Đã tiếp nhận đơn #${order.orderCode}. Đơn ở trạng thái 'Chờ nhập điều chuyển' do cần đợi xe trung chuyển giao hàng về kho Gò Vấp.`, 'success');
      } else {
        showToast(`Đã tiếp nhận đơn #${order.orderCode}. Đơn đã chuyển sang trạng thái Đang Soạn Hàng.`, 'success');
      }
      await fetchAllData(false);
    } catch (e) {
      showToast('Có lỗi khi tiếp nhận đơn', 'error');
    }
  };

  // Chuyển đơn sang trạng thái ĐANG ĐÓNG GÓI (PACKING)
  const handleMoveToPacking = async (order: UnifiedOrder) => {
    try {
      const isOutbound = order.orderCode?.startsWith('OB-') || !order.isEcommerce;
      const cleanId = order.id.replace(/^ECOMM-/, '').replace(/^OB-/, '');

      // 1. Sync outbound service
      await fetch(`${OUTBOUND_API}/outbound-orders/${order.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'PACKING' }),
      }).catch(() => {});

      // 2. Sync order service
      await fetch(`${ORDER_API}/sync-status/${cleanId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'PACKING' }),
      }).catch(() => {});
      await fetch(`${ORDER_API}/sync-status/${order.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'PACKING' }),
      }).catch(() => {});

      // 3. Broadcast WebSocket
      await fetch(`${ORDER_API}/broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'order_status_updated',
          payload: {
            id: order.id,
            orderCode: order.orderCode,
            status: 'PACKING',
            warehouseCode: order.warehouseCode || 'WH-006',
          },
        }),
      }).catch(() => {});

      showToast(`Đã chuyển đơn #${order.orderCode} sang trạng thái Đang đóng gói.`, 'success');
      await fetchAllData(true);
    } catch (e) {
      showToast('Có lỗi khi chuyển đơn sang đóng gói', 'error');
    }
  };

  // Hoàn tất soạn hàng và chuyển sang trạng thái ĐÃ ĐÓNG GÓI (PACKED)
  const handleCompletePicking = async (order: UnifiedOrder) => {
    try {
      const isOutbound = order.orderCode?.startsWith('OB-') || !order.isEcommerce;
      const cleanId = order.id.replace(/^ECOMM-/, '').replace(/^OB-/, '');

      await fetch(`${OUTBOUND_API}/outbound-orders/${order.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'PACKED' }),
      }).catch(() => {});

      await fetch(`${ORDER_API}/sync-status/${cleanId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'PACKED' }),
      }).catch(() => {});

      await fetch(`${ORDER_API}/sync-status/${order.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'PACKED' }),
      }).catch(() => {});

      // Broadcast WebSocket
      await fetch(`${ORDER_API}/broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'order_status_updated',
          payload: {
            id: order.id,
            orderCode: order.orderCode,
            status: 'PACKED',
            warehouseCode: order.warehouseCode || 'WH-006',
          },
        }),
      }).catch(() => {});

      showToast(`Đã đóng gói thành công đơn #${order.orderCode}. Vui lòng bấm "Bàn Giao Shipper" để sẵn sàng phân tuyến.`, 'success');
      await fetchAllData(true);
    } catch (e) {
      showToast('Có lỗi khi cập nhật đóng gói đơn hàng', 'error');
    }
  };

  // Quản lý kho ấn "Bàn Giao Cho Shipper" -> Chuyển sang READY_FOR_DELIVERY để cho phép phân tuyến VRP gán xe
  const [handoverLoadingId, setHandoverLoadingId] = useState<string | null>(null);

  const handleHandoverToShipper = async (order: UnifiedOrder) => {
    setHandoverLoadingId(order.id);
    try {
      const cleanId = order.id.replace(/^ECOMM-/, '').replace(/^OB-/, '');
      const rawCode = order.orderCode;

      // Lưu danh sách các đơn đã được bấm bàn giao vào localStorage
      const savedList: string[] = JSON.parse(localStorage.getItem('sfwms_handover_approved_orders') || '[]');
      const handoverSet = new Set(savedList);
      handoverSet.add(order.id);
      handoverSet.add(cleanId);
      handoverSet.add(rawCode);
      localStorage.setItem('sfwms_handover_approved_orders', JSON.stringify(Array.from(handoverSet)));

      // Cập nhật trạng thái ngay lập tức trên UI
      setOrders(prev => prev.map(o => {
        if (o.id === order.id || o.orderCode === order.orderCode) {
          return { ...o, status: 'READY_FOR_DELIVERY' };
        }
        return o;
      }));

      const isOutbound = order.orderCode?.startsWith('OB-') || !order.isEcommerce;
      const targetEndpoint = isOutbound
        ? `${OUTBOUND_API}/outbound-orders/${order.id}/advance-status`
        : `${ORDER_API}/sync-status/${order.id}`;

      await fetch(targetEndpoint, {
        method: isOutbound ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'READY_FOR_DELIVERY',
          confirmedBy: user?.id || 'MANAGER-01',
          handoverAt: new Date().toISOString(),
        }),
      }).catch(() => {});

      await fetch(`${ORDER_API}/sync-status/${order.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'READY_FOR_DELIVERY' }),
      }).catch(() => {});

      // Broadcast WebSocket sự kiện bàn giao shipper
      await fetch(`${ORDER_API}/broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'order_status_updated',
          payload: {
            id: order.id,
            orderCode: order.orderCode,
            status: 'READY_FOR_DELIVERY',
            warehouseCode: order.warehouseCode || 'WH-006',
          },
        }),
      }).catch(() => {});

      showToast(`Đã bàn giao đơn #${order.orderCode} cho shipper! Sẵn sàng bấm "Tự Động Phân Tuyến" để gán tài xế.`, 'success');
      await fetchAllData(true);
    } catch (e) {
      showToast('Có lỗi khi xác nhận bàn giao cho shipper', 'error');
    } finally {
      setHandoverLoadingId(null);
    }
  };

  // Bàn giao hàng loạt toàn bộ đơn PACKED cho shipper
  const handleBatchHandoverToShipper = async () => {
    const packedOrders = whScopedOrders.filter(o => o.status === 'PACKED');
    if (packedOrders.length === 0) {
      showToast('Không có đơn hàng nào đang ở trạng thái Đã đóng gói (PACKED) để bàn giao.', 'info');
      return;
    }

    try {
      const savedList: string[] = JSON.parse(localStorage.getItem('sfwms_handover_approved_orders') || '[]');
      const handoverSet = new Set(savedList);

      for (const ord of packedOrders) {
        const cleanId = ord.id.replace(/^ECOMM-/, '').replace(/^OB-/, '');
        handoverSet.add(ord.id);
        handoverSet.add(cleanId);
        handoverSet.add(ord.orderCode);

        const isOutbound = ord.orderCode?.startsWith('OB-') || !ord.isEcommerce;
        const targetEndpoint = isOutbound
          ? `${OUTBOUND_API}/outbound-orders/${ord.id}/advance-status`
          : `${ORDER_API}/sync-status/${ord.id}`;

        await fetch(targetEndpoint, {
          method: isOutbound ? 'POST' : 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'READY_FOR_DELIVERY', confirmedBy: user?.id || 'MANAGER-01' }),
        }).catch(() => {});

        await fetch(`${ORDER_API}/sync-status/${ord.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'READY_FOR_DELIVERY' }),
        }).catch(() => {});
      }

      localStorage.setItem('sfwms_handover_approved_orders', JSON.stringify(Array.from(handoverSet)));

      showToast(`Đã bàn giao thành công ${packedOrders.length} đơn hàng cho shipper! Sẵn sàng phân tuyến.`, 'success');
      await fetchAllData(true);
    } catch (e) {
      showToast('Có lỗi khi bàn giao hàng loạt', 'error');
    }
  };

  // Xác nhận giao hàng thành công trực tiếp từ Web Dashboard (Admin / Điều phối viên)
  const handleConfirmDelivered = async (order: UnifiedOrder) => {
    try {
      const cleanId = order.id.replace(/^ECOMM-/, '').replace(/^OB-/, '');
      const rawCode = order.orderCode;
      const cleanCode = rawCode.replace(/^ECOMM-/, '').replace(/^OB-/, '');

      // Cập nhật trạng thái tại chỗ tức thì (Zero-latency UI Update)
      setOrders(prev => prev.map(o => {
        const oId = (o.id || '').toLowerCase();
        const oCode = (o.orderCode || '').toLowerCase();
        const match =
          oId === cleanId.toLowerCase() ||
          oCode === rawCode.toLowerCase() ||
          oCode === cleanCode.toLowerCase() ||
          (cleanCode && oCode.includes(cleanCode.toLowerCase()));
        return match ? { ...o, status: 'COMPLETED' } : o;
      }));

      setSelectedOrder(cur => {
        if (!cur) return null;
        const curCode = (cur.orderCode || '').toLowerCase();
        const curId = (cur.id || '').toLowerCase();
        if (
          curId === cleanId.toLowerCase() ||
          curCode === rawCode.toLowerCase() ||
          curCode === cleanCode.toLowerCase()
        ) {
          return { ...cur, status: 'COMPLETED' };
        }
        return cur;
      });

      // 1. Cập nhật Order Service (:3004)
      await fetch(`${ORDER_API}/sync-status/${encodeURIComponent(cleanId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'COMPLETED', isPaid: true, orderCode: rawCode }),
      }).catch(() => {});

      if (cleanCode && cleanCode !== cleanId) {
        await fetch(`${ORDER_API}/sync-status/${encodeURIComponent(cleanCode)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'COMPLETED', isPaid: true, orderCode: rawCode }),
        }).catch(() => {});
      }

      // 2. Cập nhật Outbound Service (:3007)
      const deliverBody = JSON.stringify({ status: 'DELIVERED' });
      await Promise.all([
        fetch(`${OUTBOUND_API}/outbound-orders/${encodeURIComponent(order.id)}/deliver`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: deliverBody,
        }).catch(() => null),
        fetch(`${OUTBOUND_API}/outbound-orders/${encodeURIComponent(cleanCode)}/deliver`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: deliverBody,
        }).catch(() => null),
        fetch(`${OUTBOUND_API}/outbound-orders/${encodeURIComponent(rawCode)}/deliver`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: deliverBody,
        }).catch(() => null),
        fetch(`${OUTBOUND_API}/outbound-orders/${encodeURIComponent(cleanCode)}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: deliverBody,
        }).catch(() => null),
      ]);

      // 3. Broadcast WebSocket to Order Gateway (:3004)
      fetch(`${ORDER_API}/broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'order_status_updated',
          payload: {
            id: order.id,
            orderCode: order.orderCode,
            status: 'COMPLETED',
          },
        }),
      }).catch(() => {});

      // 4. Lưu vào localStorage để Web & App đồng bộ tức thì
      if (typeof window !== 'undefined' && window.localStorage) {
        try {
          const rawCompleted = window.localStorage.getItem('sfwms_driver_completed_ids') || '[]';
          const completedSet = new Set(JSON.parse(rawCompleted));
          [order.id, rawCode, cleanId, cleanCode].forEach(k => { if (k) completedSet.add(k.toLowerCase()); });
          window.localStorage.setItem('sfwms_driver_completed_ids', JSON.stringify(Array.from(completedSet)));

          const rawInTransit = window.localStorage.getItem('sfwms_driver_intransit_ids') || '[]';
          const inTransitSet = new Set(JSON.parse(rawInTransit));
          [order.id, rawCode, cleanId, cleanCode].forEach(k => { if (k) inTransitSet.delete(k.toLowerCase()); });
          window.localStorage.setItem('sfwms_driver_intransit_ids', JSON.stringify(Array.from(inTransitSet)));
        } catch (e) {}
      }

      showToast(`Đã xác nhận hoàn tất giao hàng cho đơn #${order.orderCode}.`, 'success');
      await fetchAllData(false);
    } catch (e) {
      showToast('Có lỗi khi xác nhận giao hàng', 'error');
    }
  };

  // Thực thi thao tác xuất bến / giao hàng sau khi người dùng bấm xác nhận trên Modal
  const handleExecuteConfirmModal = async () => {
    if (!confirmDispatchModal) return;
    setConfirmActionLoading(true);
    try {
      if (confirmDispatchModal.type === 'CONFIRM_DELIVERY' && confirmDispatchModal.order) {
        await handleConfirmDelivered(confirmDispatchModal.order);
        setConfirmDispatchModal(null);
      } else if (confirmDispatchModal.type === 'HANDOVER_SINGLE' && confirmDispatchModal.order) {
        const targetOrd = confirmDispatchModal.order;
        await handleHandoverToShipper(targetOrd);
        if (selectedOrder && (selectedOrder.id === targetOrd.id || selectedOrder.orderCode === targetOrd.orderCode)) {
          setSelectedOrder(prev => prev ? { ...prev, status: 'READY_FOR_DELIVERY' } : null);
        }
        setConfirmDispatchModal(null);
      } else if (confirmDispatchModal.type === 'HANDOVER_BATCH') {
        await handleBatchHandoverToShipper();
        setConfirmDispatchModal(null);
      } else if (confirmDispatchModal.type === 'AUTO_DISPATCH') {
        setConfirmDispatchModal(null);
        await handleAIAutoDispatch();
      }
    } catch (err) {
      console.error('Lỗi khi thực hiện thao tác:', err);
      showToast('Có lỗi xảy ra khi xử lý thao tác', 'error');
    } finally {
      setConfirmActionLoading(false);
    }
  };

  // 1. SMART AUTOMATION: Tiếp Nhận & Soạn Hàng Loạt (Auto-FEFO Picking)
  const handleAutoFEFOPicking = async () => {
    const pendingOrders = whScopedOrders.filter(o => o.status === 'PENDING');
    const pickingOrders = whScopedOrders.filter(o => o.status === 'PROCESSING' || o.status === 'PICKING');

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
        showToast(`Đã tiếp nhận và giao kho soạn FEFO ${pendingOrders.length} đơn hàng mới.`, 'success');
      } else {
        // Hoàn tất soạn các đơn đang PROCESSING -> READY_FOR_DELIVERY
        for (const ord of pickingOrders) {
          await handleCompletePicking(ord);
        }
        showToast(`Đã xác nhận đóng gói xong ${pickingOrders.length} đơn. Sẵn sàng gom chuyến.`, 'success');
      }
      await fetchAllData(true);
    } finally {
      setAutoPickingLoading(false);
    }
  };

  // 2. Tự Động Gom Chuyến & Điều Phối VRP Đa Phương Tiện
  const handleAIAutoDispatch = async () => {
    // CHỈ gán cho đơn nào ĐÃ ĐƯỢC QUẢN LÝ ẤN BÀN GIAO CHO SHIPPER (status === 'READY_FOR_DELIVERY' hoặc có trong handoverApprovedSet)
    // VÀ CHƯA ĐƯỢC GÁN TÀI XẾ
    const savedList: string[] = JSON.parse(localStorage.getItem('sfwms_handover_approved_orders') || '[]');
    const handoverSet = new Set(savedList);

    const candidateOrders = whScopedOrders.filter(o => {
      const cleanId = (o.id || '').replace(/^ECOMM-/, '').replace(/^OB-/, '');
      const isHandoverApproved = o.status === 'READY_FOR_DELIVERY' || handoverSet.has(o.id) || handoverSet.has(cleanId) || handoverSet.has(o.orderCode);
      const isNotYetAssigned = !o.assignedDriverId;
      // Tuyệt đối không phân tuyến các đơn đang soạn (PROCESSING, PICKING) hoặc mới chỉ PACKED mà chưa ấn bàn giao
      const isNotPickingOrRawPacked = o.status !== 'PENDING' && o.status !== 'PROCESSING' && o.status !== 'PICKING' && (o.status !== 'PACKED' || isHandoverApproved);
      const isNotDelivered = o.status !== 'COMPLETED' && o.status !== 'DELIVERED';
      return isHandoverApproved && isNotYetAssigned && isNotPickingOrRawPacked && isNotDelivered;
    });

    if (candidateOrders.length === 0) {
      const unapprovedPacked = whScopedOrders.filter(o => o.status === 'PACKED' && !handoverSet.has(o.id) && !handoverSet.has(o.orderCode));
      if (unapprovedPacked.length > 0) {
        showToast(
          `Hiện có ${unapprovedPacked.length} đơn hàng đã đóng gói nhưng chưa được Quản lý ấn "Bàn Giao Shipper". Vui lòng bấm "Bàn Giao Shipper" trước khi phân tuyến.`,
          'warning'
        );
      } else {
        showToast('Không có đơn hàng nào đã bàn giao cho shipper sẵn sàng để gán xe.', 'info');
      }
      return;
    }

    setAutoDispatchLoading(true);
    try {
      // 1. Gọi backend AI VRP clustering
      await fetch(`${ORDER_API}/auto-dispatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ warehouseCode: activeWh !== 'ALL' ? activeWh : (selectedWarehouseCode || 'WH-006') }),
      }).catch(() => {});

      // 2. Lọc các nhóm tài xế theo loại phương tiện
      const truckDrivers = GOVAP_DRIVERS.filter(d => (d as any).vehicleCategory === 'TRUCK' || (d as any).vehicleCategory === 'VAN');
      const bikeDrivers = GOVAP_DRIVERS.filter(d => (d as any).vehicleCategory === 'MOTORBIKE' && ((d as any).warehouseCode === 'WH-006' || !(d as any).warehouseCode));
      const crossHubDrivers = GOVAP_DRIVERS.filter(d => (d as any).warehouseCode && (d as any).warehouseCode !== 'WH-006');

      let truckIdx = 0;
      let bikeIdx = 0;
      let crossIdx = 0;

      let truckCount = 0;
      let bikeCount = 0;
      let crossHubCount = 0;

      // 3. Gom cụm các đơn cùng Số điện thoại / cùng Địa chỉ khách hàng
      const clusterMap = new Map<string, UnifiedOrder[]>();
      candidateOrders.forEach(ord => {
        const phone = (ord.customerPhone || '').replace(/\D/g, '');
        const rawAddr = (ord.customerAddress || '').toLowerCase().trim();
        const rawName = (ord.customerName || '').toLowerCase().trim();

        let clusterKey = '';
        if (phone && phone.length >= 8) {
          clusterKey = `PHONE_${phone}`;
        } else if (rawAddr.includes('đa phước') || rawName.includes('đa phước')) {
          clusterKey = 'LOC_DA_PHUOC';
        } else {
          const normAddr = rawAddr.replace(/[,\.\-\/\(\)]/g, ' ').replace(/\s+/g, ' ').trim();
          if (normAddr.length > 6) {
            clusterKey = `ADDR_${normAddr}`;
          } else {
            clusterKey = `NAME_${rawName}_${ord.id}`;
          }
        }

        if (!clusterMap.has(clusterKey)) {
          clusterMap.set(clusterKey, []);
        }
        clusterMap.get(clusterKey)!.push(ord);
      });

      // 4. Phân bổ tài xế theo từng CỤM: Tất cả các đơn trong cùng 1 cụm sẽ giao cho CÙNG 1 TÀI XẾ!
      for (const [_, clusterOrders] of clusterMap.entries()) {
        const firstOrd = clusterOrders[0];
        const rawCode = clusterOrders.map(o => (o.orderCode || o.id || '').toUpperCase()).join(' ');
        const rawNote = clusterOrders.map(o => (o.note || '').toLowerCase()).join(' ');
        const rawAddr = (firstOrd.customerAddress || '').toLowerCase();

        const isDisposal = 
          rawCode.includes('DISPOSAL') || 
          rawCode.includes('HUY') || 
          rawNote.includes('tiêu hủy') || 
          rawNote.includes('hết hạn') || 
          rawAddr.includes('tiêu hủy') || 
          rawAddr.includes('đa phước');

        // Tính tổng trọng lượng ước tính của cả cụm đơn
        let totalClusterWeightKg = isDisposal ? 150 : 0;
        let totalClusterItems = 0;
        if (!isDisposal) {
          clusterOrders.forEach(ord => {
            (ord.items || []).forEach(item => {
              const qty = item.requestedQuantity || item.quantity || 1;
              totalClusterItems += qty;
              const unit = (item.unit || '').toLowerCase();
              if (unit.includes('kg') || unit.includes('kí')) totalClusterWeightKg += qty;
              else if (unit.includes('thùng') || unit.includes('két')) totalClusterWeightKg += qty * 10;
              else if (unit.includes('bao') || unit.includes('gói lớn')) totalClusterWeightKg += qty * 5;
              else totalClusterWeightKg += qty * 0.6;
            });
          });
          totalClusterWeightKg = Math.max(2.0, Number(totalClusterWeightKg.toFixed(1)));
        }

        const isHeavyOrBulk = isDisposal || totalClusterWeightKg >= 25 || totalClusterItems >= 8;
        const isCrossZone = rawAddr.includes('bình thạnh') || rawAddr.includes('tân bình') || rawAddr.includes('phú nhuận') || rawAddr.includes('thủ đức');

        let assignedDrv = bikeDrivers[0] || GOVAP_DRIVERS[0];

        if (isHeavyOrBulk && truckDrivers.length > 0) {
          // Gán Xe Tải Lạnh 2.5 Tấn / Xe Bán Tải 1.5 Tấn
          assignedDrv = truckDrivers[truckIdx % truckDrivers.length];
          truckIdx++;
          truckCount += clusterOrders.length;
        } else if (bikeDrivers.length > 0) {
          // Ưu tiên gán Xe Máy Thùng Lạnh tiêu chuẩn (Võ Minh Trí NV-GV05)
          assignedDrv = bikeDrivers[bikeIdx % bikeDrivers.length];
          bikeIdx++;
          bikeCount += clusterOrders.length;
        } else if (isCrossZone && crossHubDrivers.length > 0) {
          // Gán Tài xế Liên Kho lân cận hỗ trợ tuyến giáp ranh
          assignedDrv = crossHubDrivers[crossIdx % crossHubDrivers.length];
          crossIdx++;
          crossHubCount += clusterOrders.length;
        }

        // Gán TÀI XẾ NÀY cho TOÀN BỘ đơn trong cụm (đảm bảo cùng khách / cùng địa chỉ đi chung 1 xe)
        for (const ord of clusterOrders) {
          saveDriverAssignmentToStorage(ord.id, assignedDrv);
          saveDriverAssignmentToStorage(ord.orderCode, assignedDrv);

          const newStatus = 'READY_FOR_DELIVERY';

          const isOutbound = ord.orderCode?.startsWith('OB-') || !ord.isEcommerce;
          const targetEndpoint = isOutbound 
            ? `${OUTBOUND_API}/outbound-orders/${ord.id}/assign-driver` 
            : `${ORDER_API}/assign-driver/${ord.id}`;

          await fetch(targetEndpoint, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              driverId: assignedDrv.id,
              driverName: assignedDrv.name,
              driverPhone: assignedDrv.phone,
              driverPlate: assignedDrv.plate,
              status: newStatus,
            }),
          }).catch(() => {});

          if (!isOutbound && ord.orderCode) {
            await fetch(`${OUTBOUND_API}/outbound-orders/${ord.orderCode}/assign-driver`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                driverId: assignedDrv.id,
                driverName: assignedDrv.name,
                driverPhone: assignedDrv.phone,
                driverPlate: assignedDrv.plate,
                status: newStatus,
              }),
            }).catch(() => {});
          }

          await fetch(`${ORDER_API}/sync-status/${ord.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              driverId: assignedDrv.id,
              driverName: assignedDrv.name,
              driverPhone: assignedDrv.phone,
              driverPlate: assignedDrv.plate,
              status: newStatus,
            }),
          }).catch(() => {});

          // Phát sóng sự kiện WebSocket trực tiếp tới Order Gateway (:3004) để App Tài xế nhận đơn ngay lập tức
          await fetch(`${ORDER_API}/broadcast`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              event: 'order_status_updated',
              payload: {
                id: ord.id,
                orderCode: ord.orderCode,
                status: newStatus,
                assignedDriverId: assignedDrv.id,
                assignedDriverName: assignedDrv.name,
                assignedDriverPhone: assignedDrv.phone,
                assignedDriverPlate: assignedDrv.plate,
                warehouseCode: ord.warehouseCode || 'WH-006',
              },
            }),
          }).catch(() => {});
        }
      }

      showToast(
        `Đã tự động phân bổ ${candidateOrders.length} đơn hàng: ${truckCount} đơn xe tải, ${bikeCount} đơn xe máy, ${crossHubCount} đơn liên kho.`,
        'success'
      );
      await fetchAllData(true);
    } catch (e) {
      showToast('Có lỗi trong quá trình tự động phân bổ tài xế', 'error');
    } finally {
      setAutoDispatchLoading(false);
    }
  };

  const getInitialDriverForOrder = (ord: UnifiedOrder) => {
    if (ord.assignedDriverId) {
      const existing = GOVAP_DRIVERS.find(d => d.id === ord.assignedDriverId);
      if (existing) return existing;
    }
    const rawCode = (ord.orderCode || ord.id || '').toUpperCase();
    const rawNote = ((ord as any).note || '').toLowerCase();
    const rawAddr = (ord.customerAddress || '').toLowerCase();
    const isDisposal = rawCode.includes('DISPOSAL') || rawCode.includes('HUY') || rawNote.includes('tiêu hủy') || rawAddr.includes('đa phước');
    if (isDisposal) {
      return GOVAP_DRIVERS.find(d => d.id === 'NV-TK01') || GOVAP_DRIVERS[0];
    }
    return GOVAP_DRIVERS.find(d => d.id === 'NV-GV05') || GOVAP_DRIVERS[0];
  };

  // 3. Manual Single Driver Assign
  const handleAssignSingleDriver = async () => {
    if (!manualDriverModalOrder || !selectedDriverForAssign) return;
    const curStatus = (manualDriverModalOrder.status || '').toUpperCase();
    if (['DELIVERING', 'SHIPPED', 'IN_TRANSIT', 'COMPLETED', 'DELIVERED'].includes(curStatus)) {
      showToast(`Đơn hàng #${manualDriverModalOrder.orderCode || manualDriverModalOrder.id} đang ở trạng thái ${curStatus} (đang trên đường giao hoặc đã hoàn tất), đã khóa không thể thay đổi tài xế!`, 'warning');
      setManualDriverModalOrder(null);
      return;
    }

    saveDriverAssignmentToStorage(manualDriverModalOrder.id, selectedDriverForAssign);
    if (manualDriverModalOrder.orderCode) {
      saveDriverAssignmentToStorage(manualDriverModalOrder.orderCode, selectedDriverForAssign);
    }

    const isOutbound = manualDriverModalOrder.orderCode?.startsWith('OB-') || !manualDriverModalOrder.isEcommerce;
    const targetEndpoint = isOutbound
      ? `${OUTBOUND_API}/outbound-orders/${manualDriverModalOrder.id}/assign-driver`
      : `${ORDER_API}/assign-driver/${manualDriverModalOrder.id}`;

    await fetch(targetEndpoint, {
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

    if (!isOutbound && manualDriverModalOrder.orderCode) {
      await fetch(`${OUTBOUND_API}/outbound-orders/${manualDriverModalOrder.orderCode}/assign-driver`, {
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
    }

    // Broadcast websocket event to Order Gateway (:3004) so Driver App updates immediately
    await fetch(`${ORDER_API}/broadcast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'order_status_updated',
        payload: {
          id: manualDriverModalOrder.id,
          orderCode: manualDriverModalOrder.orderCode,
          status: 'READY_FOR_DELIVERY',
          assignedDriverId: selectedDriverForAssign.id,
          assignedDriverName: selectedDriverForAssign.name,
          assignedDriverPhone: selectedDriverForAssign.phone,
          assignedDriverPlate: selectedDriverForAssign.plate,
          warehouseCode: manualDriverModalOrder.warehouseCode || 'WH-006',
        },
      }),
    }).catch(() => {});

    showToast(`Đã gán tài xế ${selectedDriverForAssign.name} cho đơn #${manualDriverModalOrder.orderCode}`, 'success');
    setManualDriverModalOrder(null);
    fetchAllData();
  };

  // 4. Reverse Logistics Actions: Restock / Redispatch
  const handleRestockOrder = async (orderId: string) => {
    try {
      const cleanId = orderId.replace(/^ECOMM-/, '').replace(/^OB-/, '');
      const order = reverseLogisticsModalOrder || allOrders.find(o => o.id === orderId);

      // 1. Tự động tạo phiếu nhập hồi hàng hoàn trong inbound-service (:3006)
      if (order) {
        const orderCode = order.orderCode || `OB-${cleanId}`;
        const returnOrderCode = `RET-${orderCode.replace(/^RET-/, '')}`;
        await fetch(`${INBOUND_API}/inbound-orders`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderCode: returnOrderCode,
            supplierId: 'CUSTOMER_RETURN',
            supplierName: `Khách hàng trả lại (${order.customerName || (order as any).requesterName || 'Khách hàng'})`,
            invoiceNumber: orderCode,
            delivererName: order.assignedDriverName || 'Tài xế giao hàng',
            warehouseCode: order.warehouseCode || activeWh || 'WH-006',
            status: 'PENDING',
            packingNote: `[HÀNG HOÀN] Lý do: ${order.failureReason || 'Khách không nhận - Chờ nhập lại kho lạnh'}`,
            destinationStation: 'STORAGE_SHELF',
            items: order.items?.map(it => ({
              sku: it.sku,
              productName: it.productName || it.sku,
              expectedQuantity: Number(it.quantity) || Number((it as any).requestedQuantity) || 1,
              unit: 'Cái',
              unitPrice: 0,
            })) || []
          })
        }).catch(err => console.warn('Could not auto-create inbound return order:', err));
      }

      await Promise.all([
        fetch(`${ORDER_API}/sync-status/${cleanId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'CANCELLED', cancelledBy: 'STAFF', note: 'Hàng đã hoàn nhập kho lạnh (Restock)' }),
        }).catch(() => {}),
        fetch(`${OUTBOUND_API}/outbound-orders/${cleanId}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'CANCELLED', notes: 'Hàng đã hoàn nhập kho lạnh (Restock)' }),
        }).catch(() => {}),
      ]);
      showToast('Đã xác nhận nhập lại hàng & Tạo phiếu nhập kho hoàn (RET-...) thành công.', 'success');
    } catch (err) {
      showToast('Không thể cập nhật trạng thái đơn hoàn!', 'error');
    }
    setReverseLogisticsModalOrder(null);
    fetchAllData();
  };

  const handleRedispatchOrder = async (orderId: string) => {
    try {
      const cleanId = orderId.replace(/^ECOMM-/, '').replace(/^OB-/, '');
      await Promise.all([
        fetch(`${ORDER_API}/sync-status/${cleanId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'READY_FOR_DELIVERY', note: 'Đã xếp vào hàng đợi giao lại lần 2', failureReason: null, failurePhotoUrl: null }),
        }).catch(() => {}),
        fetch(`${OUTBOUND_API}/outbound-orders/${cleanId}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'READY_FOR_DELIVERY', notes: 'Đã xếp vào hàng đợi giao lại lần 2', failureReason: null, failurePhotoUrl: null }),
        }).catch(() => {}),
      ]);
      showToast('Đã đưa đơn hàng vào hàng đợi chuyến tiếp theo.', 'success');
    } catch (err) {
      showToast('Không thể xếp lại chuyến đơn hàng!', 'error');
    }
    setReverseLogisticsModalOrder(null);
    fetchAllData();
  };

  // Scope orders strictly by warehouse
  const whScopedOrders = useMemo(() => {
    if (!activeWh || activeWh === 'ALL') return orders;
    return orders.filter(o => {
      const code = (o.warehouseCode || (o as any).assignedWarehouseId || (o as any).assignedWarehouseCode || '').toUpperCase();
      const name = (o.assignedWarehouseName || '').toLowerCase();
      const isGoVapMatch = (activeWh === 'WH-006' || activeWh.toLowerCase().includes('gò vấp')) &&
        (code === 'WH-006' || code === 'GV' || name.includes('gò vấp') || !code);
      return code === activeWh.toUpperCase() || isGoVapMatch;
    });
  }, [orders, activeWh]);

  // Pipeline Criteria Definitions (100% Mutually Exclusive)
  const isStepException = (o: UnifiedOrder) => {
    if (o.status === 'FAILED_DELIVERY' || o.status === 'RETURN_TO_WAREHOUSE' || o.status === 'CANCELLED') {
      return true;
    }
    if (['READY_FOR_DELIVERY', 'CONFIRMED', 'DELIVERING', 'SHIPPED', 'COMPLETED', 'DELIVERED'].includes(o.status)) {
      return false;
    }
    return Boolean(o.failureReason);
  };

  const isStep1 = (o: UnifiedOrder) =>
    !isStepException(o) && (
      o.status === 'PENDING' ||
      o.status === 'WAITING_TRANSFER' ||
      o.status === 'PROCESSING' ||
      o.status === 'PICKING'
    );

  const isStep2 = (o: UnifiedOrder) =>
    !isStepException(o) && (
      o.status === 'PACKING' ||
      o.status === 'PICKED' ||
      o.status === 'PACKED'
    );

  const isStep3 = (o: UnifiedOrder) =>
    !isStepException(o) && (
      o.status === 'READY_FOR_DELIVERY' ||
      o.status === 'CONFIRMED' ||
      o.status === 'DELIVERING' ||
      o.status === 'SHIPPED'
    );

  const isStep4 = (o: UnifiedOrder) =>
    !isStepException(o) && (
      o.status === 'COMPLETED' ||
      o.status === 'DELIVERED'
    );

  // Pipeline Counts based on scoped orders
  const step1Count = useMemo(() => whScopedOrders.filter(isStep1).length, [whScopedOrders]);
  const step2Count = useMemo(() => whScopedOrders.filter(isStep2).length, [whScopedOrders]);
  const step3Count = useMemo(() => whScopedOrders.filter(isStep3).length, [whScopedOrders]);
  const completedCount = useMemo(() => whScopedOrders.filter(isStep4).length, [whScopedOrders]);
  const stepExceptionCount = useMemo(() => whScopedOrders.filter(isStepException).length, [whScopedOrders]);

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return whScopedOrders.filter(o => {
      const matchSearch =
        o.orderCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.customerPhone.includes(searchQuery) ||
        o.customerAddress.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (o.assignedDriverName && o.assignedDriverName.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchSearch) return false;

      if (classificationFilter !== 'ALL') {
        const cls = detectSlipClassification(o as any);
        if (cls !== classificationFilter) return false;
      }

      if (activePipelineStep === 'STEP_1_PICKING') {
        return isStep1(o);
      }
      if (activePipelineStep === 'STEP_2_DISPATCH') {
        return isStep2(o);
      }
      if (activePipelineStep === 'STEP_3_DELIVERING') {
        return isStep3(o);
      }
      if (activePipelineStep === 'STEP_EXCEPTION') {
        return isStepException(o);
      }
      if (activePipelineStep === 'STEP_COMPLETED') {
        return isStep4(o);
      }

      return true;
    }).sort((a, b) => {
      // 0. Ưu tiên đơn demo IoT Pick-to-Light (XK-IOT-DEMO-...) lên đầu danh sách để nhân viên kho thao tác ngay
      const isIotA = a.orderCode.toUpperCase().includes('IOT-DEMO') ? 1 : 0;
      const isIotB = b.orderCode.toUpperCase().includes('IOT-DEMO') ? 1 : 0;
      if (isIotA !== isIotB) return isIotB - isIotA;

      // 1. Luôn đưa đơn hàng mới nhất lên trên đầu
      const timeA = new Date(a.rawCreatedAt || 0).getTime();
      const timeB = new Date(b.rawCreatedAt || 0).getTime();
      if (timeB !== timeA) return timeB - timeA;

      const priority: Record<string, number> = {
        PENDING: 1,
        WAITING_TRANSFER: 1.5,
        PROCESSING: 2,
        PICKING: 3,
        PACKING: 3.5,
        PICKED: 3.5,
        PACKED: 4,
        READY_FOR_DELIVERY: 5,
        CONFIRMED: 6,
        DELIVERING: 7,
        SHIPPED: 8,
        FAILED_DELIVERY: 9,
        RETURN_TO_WAREHOUSE: 10,
        DELIVERED: 11,
        COMPLETED: 12,
        CANCELLED: 13,
      };
      const pA = priority[a.status] || 99;
      const pB = priority[b.status] || 99;
      if (pA !== pB) return pA - pB;
      return (b.id > a.id ? 1 : -1);
    });
  }, [whScopedOrders, searchQuery, classificationFilter, activePipelineStep]);

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(9);
  const [viewMode, setViewMode] = useState<'CARD' | 'LIST'>(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) return 'CARD';
    if (user?.role === 'WAREHOUSE_STAFF') return 'CARD';
    return 'CARD';
  });

  const isOrderItemPicked = useCallback((order: UnifiedOrder, idx: number, overrideMap?: Record<number, boolean>) => {
    const orderMap = overrideMap || pickedOrderItems[order.id] || {};
    if (orderMap[idx]) return true;
    const item = order.items?.[idx];
    if (!item) return false;
    const req = item.requestedQuantity || item.quantity || 1;
    if ((item.pickedQuantity || 0) >= req) return true;
    if (['PACKED', 'READY_FOR_DELIVERY', 'CONFIRMED', 'SHIPPED', 'DELIVERING', 'COMPLETED', 'DELIVERED'].includes(order.status)) {
      return true;
    }
    return false;
  }, [pickedOrderItems]);

  const handleStopAllIotShelves = useCallback(async () => {
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
    await fetch(`${IOT_API}/api/iot/shelf/reset`, { method: 'POST' }).catch(() => null);
    setActivePickGuide(null);
    showToast('Đã tắt toàn bộ đèn LED và còi trên 3 kệ IoT (A1, A2, A3).', 'info');
  }, [showToast]);

  const activateOrderProductShelf = useCallback(async (
    order: UnifiedOrder,
    targetItemIdx?: number,
    pickedOverride?: Record<number, boolean>
  ) => {
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }

    const items = order.items || [];
    if (items.length === 0) {
      showToast(`Đơn #${order.orderCode} không có sản phẩm nào.`, 'info');
      return;
    }

    let chosenIdx = typeof targetItemIdx === 'number' ? targetItemIdx : -1;
    if (chosenIdx < 0 || chosenIdx >= items.length) {
      chosenIdx = items.findIndex((_, idx) => !isOrderItemPicked(order, idx, pickedOverride));
    }

    // Nếu tất cả sản phẩm đã lấy xong mà nhân viên bấm vào cả đơn -> reset để lấy lại từ sản phẩm đầu tiên
    let effectivePickedMap = pickedOverride || pickedOrderItems[order.id] || {};
    if (chosenIdx === -1) {
      if (typeof targetItemIdx === 'number') {
        chosenIdx = targetItemIdx;
      } else {
        effectivePickedMap = {};
        setPickedOrderItems(prev => ({ ...prev, [order.id]: {} }));
        chosenIdx = 0;
      }
    }

    const item = items[chosenIdx];
    const loc = resolveOrderItemShelfTier(item, chosenIdx);
    const shelfCode = loc.hwShelfCode;
    const cleanName = cleanProductDisplayName(item.productName);
    const totalSteps = items.length;
    const pickedCount = items.filter((_, idx) => idx !== chosenIdx && Boolean(effectivePickedMap[idx])).length;
    const step = Math.min(totalSteps, pickedCount + 1);
    const qty = item.requestedQuantity || item.quantity || 1;

    // 1. Lấy baseline stopSeq hiện tại từ IoT Service (:3002)
    let baselineStopSeq = 0;
    try {
      const statusRes = await fetch(`${IOT_API}/api/iot/shelf/status`).catch(() => null);
      if (statusRes && statusRes.ok) {
        const statusData = await statusRes.json();
        const shelvesMap = statusData?.shelves;
        const shelfObj = Array.isArray(shelvesMap)
          ? shelvesMap.find((s: any) => (s.code || s.shelfCode) === shelfCode)
          : shelvesMap?.[shelfCode];
        if (shelfObj && typeof shelfObj.stopSeq === 'number') {
          baselineStopSeq = shelfObj.stopSeq;
        }
      }
    } catch (e) {}

    setActivePickGuide({
      orderId: order.id,
      orderCode: order.orderCode,
      itemIdx: chosenIdx,
      itemId: item.id,
      productName: cleanName,
      sku: item.sku,
      quantity: qty,
      shelfCode,
      rackLabel: loc.rackLabel,
      tierLabel: loc.tierLabel,
      fullLocationLabel: loc.fullLabel,
      step,
      totalSteps,
      status: 'LOCATING',
      baselineStopSeq,
    });

    // 2. Gửi lệnh bật LED + Còi xuống ESP32 qua IoT Service (:3002)
    try {
      await fetch(`${IOT_API}/api/iot/shelf/locate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shelfCode,
          slotCode: loc.shortCode,
          orderId: order.orderCode,
          sku: item.sku,
          productName: `${cleanName} (${loc.fullLabel})`,
          qty,
          quantity: qty,
          step,
          totalSteps,
        }),
      });

      if (item.id && !order.isEcommerce) {
        fetch(`${OUTBOUND_API}/outbound-orders/${order.id}/items/${item.id}/locate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ step, totalSteps }),
        }).catch(() => null);
      }

      setActivePickGuide(prev => prev ? { ...prev, status: 'WAITING_STOP' } : null);
      showToast(
        `Đã bật Đèn LED & Còi tại ${loc.fullLabel} — Sản phẩm "${cleanName}" (Bước ${step}/${totalSteps}). Tới kệ bấm nút STOP để lấy hàng!`,
        'success'
      );
    } catch (err) {
      showToast(`Không thể kết nối IoT Service để bật ${loc.fullLabel}`, 'error');
    }
  }, [isOrderItemPicked, pickedOrderItems, showToast]);

  const handleSelectAndLocateOrder = useCallback((order: UnifiedOrder, itemIdx?: number) => {
    setSelectedOrder(order);
    activateOrderProductShelf(order, itemIdx);
  }, [activateOrderProductShelf]);

  const confirmCurrentGuideStepAndAdvance = useCallback(async (guide: ActiveOrderPickGuide) => {
    const targetOrder = orders.find(o => o.id === guide.orderId || o.orderCode === guide.orderCode) || selectedOrder;
    if (!targetOrder) return;

    const currentMap = pickedOrderItems[targetOrder.id] || {};
    const nextMap: Record<number, boolean> = { ...currentMap, [guide.itemIdx]: true };
    setPickedOrderItems(prev => ({
      ...prev,
      [targetOrder.id]: nextMap,
    }));

    // Đồng bộ trạng thái đã lấy sản phẩm lên outbound-service (:3007) nếu có itemId
    if (guide.itemId && !targetOrder.isEcommerce) {
      fetch(`${OUTBOUND_API}/outbound-orders/${targetOrder.id}/items/${guide.itemId}/pick`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pickedQuantity: guide.quantity, pickerId: user?.id || 'staff-govap' }),
      }).catch(() => null);
    }

    const items = targetOrder.items || [];
    const nextUnpickedIdx = items.findIndex((_, idx) => !nextMap[idx]);

    if (nextUnpickedIdx !== -1) {
      setActivePickGuide(prev => prev ? { ...prev, status: 'STOP_CONFIRMED' } : null);
      const nextItem = items[nextUnpickedIdx];
      const nextLoc = resolveOrderItemShelfTier(nextItem, nextUnpickedIdx);
      showToast(
        `Đã bấm STOP tắt đèn & còi ${guide.fullLocationLabel}! Tự động nhảy sang sản phẩm tiếp theo tại ${nextLoc.fullLabel}...`,
        'success'
      );
      autoAdvanceTimerRef.current = setTimeout(() => {
        activateOrderProductShelf(targetOrder, nextUnpickedIdx, nextMap);
      }, 650);
    } else {
      await fetch(`${IOT_API}/api/iot/shelf/reset`, { method: 'POST' }).catch(() => null);
      setActivePickGuide(prev => prev ? { ...prev, status: 'COMPLETED' } : null);
      showToast(
        `Hoàn thành lấy đủ ${items.length}/${items.length} sản phẩm của đơn #${targetOrder.orderCode}! Đèn và còi trên 3 kệ A, B, C đã tắt.`,
        'success'
      );
    }
  }, [orders, selectedOrder, pickedOrderItems, user?.id, showToast, activateOrderProductShelf]);

  const handleSimulatePhysicalStop = useCallback(async (guide: ActiveOrderPickGuide) => {
    await fetch(`${IOT_API}/api/iot/shelf/stop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shelfCode: guide.shelfCode }),
    }).catch(() => null);
    await confirmCurrentGuideStepAndAdvance(guide);
  }, [confirmCurrentGuideStepAndAdvance]);

  // Poll trạng thái nút bấm vật lý STOP từ ESP32 (mỗi 800ms khi đang WAITING_STOP)
  useEffect(() => {
    if (!activePickGuide || activePickGuide.status !== 'WAITING_STOP') return;
    let cancelled = false;

    const timer = setInterval(async () => {
      try {
        const res = await fetch(`${IOT_API}/api/iot/shelf/status`);
        if (!res.ok || cancelled) return;
        const data = await res.json();
        const shelvesMap = data?.shelves;
        const shelfObj = Array.isArray(shelvesMap)
          ? shelvesMap.find((s: any) => (s.code || s.shelfCode) === activePickGuide.shelfCode)
          : shelvesMap?.[activePickGuide.shelfCode];
        if (!shelfObj) return;

        const currentStopSeq = typeof shelfObj.stopSeq === 'number' ? shelfObj.stopSeq : 0;
        const ledOff = shelfObj.ledOn === false || shelfObj.led === false;
        const buzzerOff = shelfObj.buzzerOn === false || shelfObj.buzzer === false;
        const wasStopped =
          currentStopSeq > activePickGuide.baselineStopSeq ||
          (ledOff && buzzerOff && shelfObj.status === 'ARRIVED' && Boolean(shelfObj.arrivedAt));

        if (wasStopped && !cancelled) {
          cancelled = true;
          clearInterval(timer);
          confirmCurrentGuideStepAndAdvance(activePickGuide);
        }
      } catch (e) {}
    }, 800);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [activePickGuide, confirmCurrentGuideStepAndAdvance]);

  // Reset page when filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activePipelineStep, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / pageSize));

  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredOrders.slice(start, start + pageSize);
  }, [filteredOrders, currentPage, pageSize]);

  // ── Column Resizing State & Logic ──
  type ColKey = 'code' | 'customer' | 'driver' | 'cod' | 'status' | 'actions';

  const DEFAULT_COL_WIDTHS: Record<ColKey, number> = useMemo(() => ({
    code: 160,
    customer: 280,
    driver: 180,
    cod: 130,
    status: 170,
    actions: canOperateWarehouse ? 360 : 280,
  }), [canOperateWarehouse]);

  const MIN_COL_WIDTHS: Record<ColKey, number> = {
    code: 120,
    customer: 160,
    driver: 130,
    cod: 90,
    status: 130,
    actions: 220,
  };

  const [colWidths, setColWidths] = useState<Record<ColKey, number>>(() => {
    const saved = localStorage.getItem('sfwms_order_dispatch_col_widths');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed.code === 'number') {
          return {
            code: parsed.code || 160,
            customer: parsed.customer || 280,
            driver: parsed.driver || 180,
            cod: parsed.cod || 130,
            status: parsed.status || 170,
            actions: parsed.actions || (canOperateWarehouse ? 360 : 280),
          };
        }
      } catch (e) {}
    }
    return {
      code: 160,
      customer: 280,
      driver: 180,
      cod: 130,
      status: 170,
      actions: canOperateWarehouse ? 360 : 280,
    };
  });

  const resizingColRef = React.useRef<{
    col: ColKey;
    startX: number;
    startWidth: number;
  } | null>(null);

  const [activeResizingCol, setActiveResizingCol] = useState<ColKey | null>(null);

  const handleMouseDownResize = (col: ColKey, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    resizingColRef.current = {
      col,
      startX: e.clientX,
      startWidth: colWidths[col],
    };
    setActiveResizingCol(col);

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!resizingColRef.current) return;
      const deltaX = moveEvent.clientX - resizingColRef.current.startX;
      const minW = MIN_COL_WIDTHS[resizingColRef.current.col];
      const newWidth = Math.max(minW, resizingColRef.current.startWidth + deltaX);
      setColWidths(prev => ({
        ...prev,
        [resizingColRef.current!.col]: newWidth,
      }));
    };

    const onMouseUp = () => {
      if (resizingColRef.current) {
        setColWidths(latest => {
          try {
            localStorage.setItem('sfwms_order_dispatch_col_widths', JSON.stringify(latest));
          } catch (e) {}
          return latest;
        });
        resizingColRef.current = null;
      }
      setActiveResizingCol(null);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleDoubleClickResize = (col: ColKey, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const defaultWidth = DEFAULT_COL_WIDTHS[col];
    setColWidths(prev => {
      const next = { ...prev, [col]: defaultWidth };
      try {
        localStorage.setItem('sfwms_order_dispatch_col_widths', JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  };

  const handleResetAllColWidths = () => {
    setColWidths(DEFAULT_COL_WIDTHS);
    try {
      localStorage.setItem('sfwms_order_dispatch_col_widths', JSON.stringify(DEFAULT_COL_WIDTHS));
    } catch (e) {}
  };

  const renderColResizer = (col: ColKey) => (
    <div
      onMouseDown={(e) => handleMouseDownResize(col, e)}
      onDoubleClick={(e) => handleDoubleClickResize(col, e)}
      title="Kéo sang trái/phải để điều chỉnh độ rộng cột (Nhấn đúp để khôi phục mặc định)"
      style={{
        position: 'absolute',
        right: 0,
        top: 0,
        bottom: 0,
        width: '10px',
        cursor: 'col-resize',
        userSelect: 'none',
        zIndex: 10,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        style={{
          width: activeResizingCol === col ? '2.5px' : '1.5px',
          height: activeResizingCol === col ? '100%' : '50%',
          backgroundColor: activeResizingCol === col ? '#0284c7' : '#cbd5e1',
          borderRadius: '1px',
          transition: 'all 0.15s ease',
        }}
      />
    </div>
  );

  return (
    <div style={{ minHeight: '100%', color: '#0f172a', padding: '0 0 24px 0' }}>
      
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

      {/* ── Top Executive Header (Compact Enterprise WMS Bar) ── */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '10px',
        padding: '12px 16px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
        marginBottom: '12px',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            backgroundColor: '#f0fdfa',
            border: '1px solid #99f6e4',
            color: '#0f766e',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Boxes size={18} color="#0f766e" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                Điều phối & Soạn hàng
              </h1>
              <span style={{ fontSize: '11.5px', color: '#0f766e', fontWeight: 600, backgroundColor: '#f0fdfa', padding: '2px 8px', borderRadius: '6px', border: '1px solid #ccfbf1' }}>
                {(() => {
                  const curWh = warehouses.find(w => w.code === activeWh);
                  return activeWh === 'ALL' ? 'Tất cả kho' : (curWh ? `${curWh.name} (${curWh.code})` : `Kho ${activeWh}`);
                })()}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Action Control Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {!isManager && !isSaler && (
            <select
              value={selectedWhFilter}
              onChange={e => setSelectedWhFilter(e.target.value)}
              style={{
                padding: '7px 12px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#0f172a',
                fontWeight: 600,
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              <option value="ALL">Tất cả kho ({orders.length})</option>
              {warehouses.map(w => (
                <option key={w.id || w.code} value={w.code}>
                  {w.name} ({w.code})
                </option>
              ))}
            </select>
          )}

          {canOperateWarehouse ? (
            <>
              <button
                onClick={handleAutoFEFOPicking}
                disabled={autoPickingLoading}
                style={{
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  padding: '7px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  border: 'none',
                  cursor: 'pointer',
                  opacity: autoPickingLoading ? 0.6 : 1,
                }}
              >
                <Boxes size={14} />
                <span>{autoPickingLoading ? 'Đang xử lý...' : 'Soạn nhanh FEFO'}</span>
              </button>

              {whScopedOrders.filter(o => o.status === 'PACKED').length > 0 && (
                <button
                  onClick={() => {
                    const packedOrders = whScopedOrders.filter(o => o.status === 'PACKED');
                    if (packedOrders.length === 0) return;
                    setConfirmDispatchModal({
                      type: 'HANDOVER_BATCH',
                      orders: packedOrders,
                    });
                  }}
                  style={{
                    backgroundColor: '#0f766e',
                    color: '#ffffff',
                    padding: '7px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <PackageCheck size={14} />
                  <span>Bàn giao ({whScopedOrders.filter(o => o.status === 'PACKED').length})</span>
                </button>
              )}

              <button
                onClick={() => {
                  const candidateOrders = whScopedOrders.filter(o => {
                    const isWaitingOrReady = o.status === 'WAITING_DISPATCH' || o.status === 'READY_FOR_DELIVERY' || o.status === 'PACKED';
                    return isWaitingOrReady && !o.assignedDriverId;
                  });
                  if (candidateOrders.length === 0) {
                    showToast('Không có đơn chờ gán xe.', 'info');
                    return;
                  }
                  setConfirmDispatchModal({
                    type: 'AUTO_DISPATCH',
                    orders: candidateOrders,
                  });
                }}
                disabled={autoDispatchLoading}
                style={{
                  backgroundColor: '#059669',
                  color: '#ffffff',
                  padding: '7px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  border: 'none',
                  cursor: 'pointer',
                  opacity: autoDispatchLoading ? 0.6 : 1,
                }}
              >
                <Route size={14} />
                <span>{autoDispatchLoading ? 'Đang phân tuyến...' : 'Phân tuyến'}</span>
              </button>
            </>
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 10px',
                borderRadius: '6px',
                backgroundColor: '#f0f9ff',
                border: '1px solid #bae6fd',
                color: '#0369a1',
                fontSize: '11.5px',
                fontWeight: 600,
              }}
            >
              <Eye size={14} color="#0284c7" />
              <span>Chỉ xem</span>
            </div>
          )}

          <button
            onClick={() => setShowMap(!showMap)}
            style={{
              backgroundColor: showMap ? '#eff6ff' : '#ffffff',
              color: showMap ? '#1d4ed8' : '#334155',
              padding: '7px 12px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              border: `1px solid ${showMap ? '#bfdbfe' : '#cbd5e1'}`,
              cursor: 'pointer',
            }}
          >
            <Compass size={14} />
            <span>Bản đồ</span>
          </button>

          <button
            onClick={() => fetchAllData(true)}
            disabled={isRefreshing}
            style={{
              backgroundColor: '#ffffff',
              color: '#475569',
              padding: '7px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
            title="Làm mới"
          >
            <RefreshCw size={14} color="#2563eb" className={isRefreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ── Control Tower GIS Map Section (Collapsible) ── */}
      {showMap && (
        <div style={{
          marginBottom: '16px',
          borderRadius: '10px',
          overflow: 'hidden',
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}>
          <ControlTowerMap />
        </div>
      )}

      {/* ── COMPACT PICK-TO-LIGHT LIVE BAR (ONLY VISIBLE WHEN ACTIVE) ── */}
      {activePickGuide && (
        <div style={{
          backgroundColor: activePickGuide.status === 'COMPLETED' ? '#f0fdf4' : '#fffbeb',
          border: `1.5px solid ${activePickGuide.status === 'COMPLETED' ? '#86efac' : '#f59e0b'}`,
          borderRadius: '8px',
          padding: '10px 14px',
          marginBottom: '12px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{
              fontSize: '11px',
              fontWeight: 700,
              padding: '3px 8px',
              borderRadius: '6px',
              backgroundColor: activePickGuide.status === 'COMPLETED' ? '#16a34a' : '#d97706',
              color: '#ffffff',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
            }}>
              <Radio size={13} />
              <span>
                {activePickGuide.status === 'COMPLETED'
                  ? `Hoàn tất #${activePickGuide.orderCode}`
                  : `${activePickGuide.fullLocationLabel} • Bước ${activePickGuide.step}/${activePickGuide.totalSteps}`}
              </span>
            </span>
            {activePickGuide.status !== 'COMPLETED' && (
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>
                {activePickGuide.productName} <b style={{ color: '#2563eb' }}>×{activePickGuide.quantity}</b>
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {activePickGuide.status === 'WAITING_STOP' && (
              <button
                type="button"
                onClick={() => handleSimulatePhysicalStop(activePickGuide)}
                style={{
                  backgroundColor: '#d97706',
                  color: '#ffffff',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                <CheckCircle2 size={14} />
                <span>Xác nhận STOP</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleStopAllIotShelves}
              style={{
                backgroundColor: '#ffffff',
                color: '#475569',
                padding: '6px 10px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                border: '1px solid #cbd5e1',
                cursor: 'pointer',
              }}
            >
              Đóng
            </button>
          </div>
        </div>
      )}

      {/* ── COMPACT PIPELINE FILTER TABS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '8px', marginBottom: '12px' }}>
        {[
          { key: 'STEP_1_PICKING', label: '1. Soạn hàng', count: step1Count, color: '#1d4ed8', bg: '#eff6ff', border: '#3b82f6', badgeBg: '#dbeafe', icon: <Boxes size={14} /> },
          { key: 'STEP_2_DISPATCH', label: '2. Đóng gói', count: step2Count, color: '#b45309', bg: '#fffbeb', border: '#f59e0b', badgeBg: '#fef3c7', icon: <PackageCheck size={14} /> },
          { key: 'STEP_3_DELIVERING', label: '3. Đang giao', count: step3Count, color: '#0369a1', bg: '#f0f9ff', border: '#0ea5e9', badgeBg: '#e0f2fe', icon: <Truck size={14} /> },
          { key: 'STEP_COMPLETED', label: '4. Hoàn tất', count: completedCount, color: '#047857', bg: '#f0fdf4', border: '#10b981', badgeBg: '#dcfce7', icon: <CheckCircle2 size={14} /> },
          { key: 'STEP_EXCEPTION', label: '5. Sự cố / Hoàn', count: stepExceptionCount, color: '#b91c1c', bg: '#fef2f2', border: '#ef4444', badgeBg: '#fee2e2', icon: <RotateCcw size={14} /> },
        ].map(tab => {
          const isActive = activePipelineStep === tab.key;
          return (
            <div
              key={tab.key}
              onClick={() => setActivePipelineStep(isActive ? 'ALL' : (tab.key as any))}
              style={{
                backgroundColor: isActive ? tab.bg : '#ffffff',
                border: `1.5px solid ${isActive ? tab.border : '#e2e8f0'}`,
                borderRadius: '8px',
                padding: '10px 12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
              }}
            >
              <span style={{ fontSize: '12px', fontWeight: 600, color: isActive ? tab.color : '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                {tab.icon}
                <span>{tab.label}</span>
              </span>
              <span style={{
                fontSize: '12px',
                fontWeight: 700,
                padding: '1px 8px',
                borderRadius: '999px',
                backgroundColor: tab.badgeBg,
                color: tab.color,
                fontVariantNumeric: 'tabular-nums',
              }}>
                {tab.count}
              </span>
            </div>
          );
        })}
      </div>

      {/* ── Search & Filter Toolbar ── */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '10px',
        padding: '10px 14px',
        border: '1px solid #e2e8f0',
        marginBottom: '12px',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '10px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: '220px', maxWidth: '360px', position: 'relative' }}>
          <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: '10px' }} />
          <input
            type="text"
            placeholder="Tìm mã đơn, khách hàng, SĐT..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '7px 12px 7px 32px',
              backgroundColor: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              fontSize: '12px',
              color: '#0f172a',
              outline: 'none',
              fontWeight: 500,
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#f1f5f9', padding: '2px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
            <button
              onClick={() => setViewMode('CARD')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 600,
                backgroundColor: viewMode === 'CARD' ? '#ffffff' : 'transparent',
                color: viewMode === 'CARD' ? '#0f172a' : '#64748b',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <LayoutGrid size={13} />
              <span>Thẻ</span>
            </button>
            <button
              onClick={() => setViewMode('LIST')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 600,
                backgroundColor: viewMode === 'LIST' ? '#ffffff' : 'transparent',
                color: viewMode === 'LIST' ? '#0f172a' : '#64748b',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <List size={13} />
              <span>Bảng</span>
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
            {[
              { key: 'ALL', label: 'Tất cả' },
              { key: 'SALE', label: 'Bán lẻ' },
              { key: 'DISPOSAL', label: 'Tiêu hủy' },
              { key: 'RETURN', label: 'Hoàn trả' },
              { key: 'TRANSFER', label: 'Điều chuyển' },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setClassificationFilter(f.key as any)}
                style={{
                  padding: '5px 10px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 600,
                  backgroundColor: classificationFilter === f.key ? '#0f172a' : '#f8fafc',
                  color: classificationFilter === f.key ? '#ffffff' : '#475569',
                  border: `1px solid ${classificationFilter === f.key ? '#0f172a' : '#e2e8f0'}`,
                  cursor: 'pointer',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
            <b style={{ color: '#0f172a' }}>{filteredOrders.length}</b> đơn
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
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              overflowX: 'auto',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              marginBottom: '20px',
              width: '100%',
            }}>
              <table style={{
                width: `${Math.max(
                  canOperateWarehouse ? 1280 : 1120,
                  colWidths.code + colWidths.customer + colWidths.driver + colWidths.cod + colWidths.status + colWidths.actions
                )}px`,
                minWidth: '100%',
                borderCollapse: 'collapse',
                textAlign: 'left',
                fontSize: '12px',
                tableLayout: 'fixed',
              }}>
                <colgroup>
                  <col style={{ width: `${colWidths.code}px` }} />
                  <col style={{ width: `${colWidths.customer}px` }} />
                  <col style={{ width: `${colWidths.driver}px` }} />
                  <col style={{ width: `${colWidths.cod}px` }} />
                  <col style={{ width: `${colWidths.status}px` }} />
                  <col style={{ width: `${colWidths.actions}px` }} />
                </colgroup>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                    <th style={{ padding: '12px 16px', position: 'relative', width: `${colWidths.code}px`, userSelect: 'none' }}>
                      <span>Mã Đơn & Kho</span>
                      {renderColResizer('code')}
                    </th>
                    <th style={{ padding: '12px 16px', position: 'relative', width: `${colWidths.customer}px`, userSelect: 'none' }}>
                      <span>Khách Hàng & Địa Chỉ</span>
                      {renderColResizer('customer')}
                    </th>
                    <th style={{ padding: '12px 16px', position: 'relative', width: `${colWidths.driver}px`, userSelect: 'none' }}>
                      <span>Tài Xế & Chuyến</span>
                      {renderColResizer('driver')}
                    </th>
                    <th style={{ padding: '12px 16px', position: 'relative', width: `${colWidths.cod}px`, textAlign: 'right', userSelect: 'none' }}>
                      <span>Thu Hộ COD</span>
                      {renderColResizer('cod')}
                    </th>
                    <th style={{ padding: '12px 16px', position: 'relative', width: `${colWidths.status}px`, userSelect: 'none' }}>
                      <span>Trạng Thái</span>
                      {renderColResizer('status')}
                    </th>
                    <th style={{
                      padding: '12px 20px',
                      textAlign: 'right',
                      position: 'sticky',
                      right: 0,
                      width: `${colWidths.actions}px`,
                      backgroundColor: '#f8fafc',
                      zIndex: 2,
                      boxShadow: '-4px 0 8px rgba(0,0,0,0.03)',
                      userSelect: 'none',
                    }}>
                      <span>Thao Tác Nhanh</span>
                      {renderColResizer('actions')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedOrders.map((order, idx) => {
                    const cfg = getOrderStatusConfig(order.status, order.assignedDriverName);
                    const isTargetHighlight = Boolean(highlightCode && (
                      order.orderCode.toLowerCase().includes(highlightCode.toLowerCase()) ||
                      order.id === highlightCode
                    ));
                    return (
                      <tr
                        key={order.id}
                        ref={isTargetHighlight ? (el) => { if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); } : undefined}
                        onClick={() => setSelectedOrder(order)}
                        style={{
                          borderBottom: idx !== paginatedOrders.length - 1 ? '1px solid #f1f5f9' : 'none',
                          cursor: 'pointer',
                          backgroundColor: isTargetHighlight ? '#f0fdf4' : '#ffffff',
                          boxShadow: isTargetHighlight ? 'inset 0 0 0 2px #0f766e' : undefined,
                          transition: 'all 0.25s ease',
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.backgroundColor = isTargetHighlight ? '#ecfdf5' : '#f8fafc';
                          const stickyTd = e.currentTarget.querySelector('.sticky-action-col') as HTMLElement;
                          if (stickyTd) stickyTd.style.backgroundColor = isTargetHighlight ? '#ecfdf5' : '#f8fafc';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.backgroundColor = isTargetHighlight ? '#f0fdf4' : '#ffffff';
                          const stickyTd = e.currentTarget.querySelector('.sticky-action-col') as HTMLElement;
                          if (stickyTd) stickyTd.style.backgroundColor = isTargetHighlight ? '#f0fdf4' : '#ffffff';
                        }}
                      >
                        {/* Order Code & Warehouse */}
                        <td style={{ padding: '12px 16px', verticalAlign: 'middle', whiteSpace: 'nowrap', width: `${colWidths.code}px`, overflow: 'hidden' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1d4ed8', fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              #{order.orderCode}
                              {isTargetHighlight && (
                                <span style={{ backgroundColor: '#0f766e', color: '#fff', fontSize: '10px', padding: '1px 5px', borderRadius: '4px', fontWeight: 700 }}>
                                  Đang tìm
                                </span>
                              )}
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span style={{
                                fontSize: '10px',
                                backgroundColor: '#f1f5f9',
                                color: '#475569',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                border: '1px solid #e2e8f0',
                                fontWeight: 600,
                              }}>
                                {order.warehouseCode || 'WH-006'}
                              </span>
                              {(() => {
                                if (order.orderClassification === 'B2B') {
                                  return (
                                    <span style={{
                                      fontSize: '10px',
                                      backgroundColor: '#eff6ff',
                                      color: '#1d4ed8',
                                      padding: '1px 5px',
                                      borderRadius: '4px',
                                      border: '1px solid #bfdbfe',
                                      fontWeight: 600,
                                    }}>
                                      B2B
                                    </span>
                                  );
                                }
                                const cls = detectSlipClassification(order as any);
                                const badgeConfig = {
                                  DISPOSAL: { text: 'Tiêu hủy', bg: '#faf5ff', color: '#7c3aed', border: '#e9d5ff' },
                                  RETURN: { text: 'Trả NCC', bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' },
                                  TRANSFER: { text: 'Điều chuyển', bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
                                  SALE: { text: 'Bán lẻ', bg: '#f8fafc', color: '#475569', border: '#e2e8f0' },
                                }[cls] || { text: 'Bán lẻ', bg: '#f8fafc', color: '#475569', border: '#e2e8f0' };

                                return (
                                  <span style={{
                                    fontSize: '10px',
                                    backgroundColor: badgeConfig.bg,
                                    color: badgeConfig.color,
                                    padding: '1px 5px',
                                    borderRadius: '4px',
                                    border: `1px solid ${badgeConfig.border}`,
                                    fontWeight: 600,
                                  }}>
                                    {badgeConfig.text}
                                  </span>
                                );
                              })()}
                            </div>
                          </div>
                        </td>

                        {/* Customer & Address + Clickable Products in Order */}
                        <td style={{ padding: '12px 16px', verticalAlign: 'middle', width: `${colWidths.customer}px`, overflow: 'hidden' }}>
                          <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '13px', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {order.customerName}
                          </div>
                          <div
                            title={order.customerAddress}
                            style={{
                              fontSize: '11px',
                              color: '#64748b',
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: '4px',
                              marginTop: '3px',
                              lineHeight: 1.3,
                            }}
                          >
                            <MapPin size={11} color="#ef4444" style={{ flexShrink: 0, marginTop: '2px' }} />
                            <span style={{
                              display: '-webkit-box',
                              WebkitLineClamp: 1,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              wordBreak: 'break-word',
                            }}>
                              {order.customerAddress}
                            </span>
                          </div>
                          {/* Vị trí Kệ (A, B, C) & Tầng (1, 2) của đơn hàng — Compact Pills */}
                          {order.items && order.items.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '4px', marginTop: '5px' }}>
                              {getOrderUniqueLocations(order.items).map((loc) => (
                                <span
                                  key={loc.shortCode}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                    padding: '1px 6px',
                                    borderRadius: '4px',
                                    fontSize: '10.5px',
                                    fontWeight: 600,
                                    backgroundColor: '#f0fdfa',
                                    color: '#0f766e',
                                    border: '1px solid #99f6e4',
                                  }}
                                >
                                  <Radio size={9} />
                                  <span>{loc.fullLabel}</span>
                                </span>
                              ))}
                              <span style={{ fontSize: '10.5px', color: '#64748b', fontWeight: 500 }}>
                                • {order.items.length} SP
                              </span>
                            </div>
                          )}
                        </td>

                        {/* Driver & Trip */}
                        <td style={{ padding: '12px 16px', whiteSpace: 'nowrap', verticalAlign: 'middle', width: `${colWidths.driver}px`, overflow: 'hidden' }}>
                          {order.assignedDriverName ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Truck size={13} color="#059669" />
                              <span style={{ fontWeight: 600, color: '#0f172a' }}>{order.assignedDriverName}</span>
                              <span style={{ fontSize: '10px', color: '#047857', backgroundColor: '#dcfce7', padding: '1px 6px', borderRadius: '999px', fontWeight: 600, fontFamily: 'monospace' }}>
                                Chuyến #{order.tripNumber || 1}
                              </span>
                            </div>
                          ) : (
                            <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '11px' }}>Chưa gán xe</span>
                          )}
                        </td>

                        {/* Total COD */}
                        <td style={{ padding: '12px 16px', textAlign: 'right', whiteSpace: 'nowrap', verticalAlign: 'middle', width: `${colWidths.cod}px`, overflow: 'hidden' }}>
                          <div style={{ fontWeight: 700, color: '#0f172a', fontVariantNumeric: 'tabular-nums', fontSize: '13px' }}>
                            {order.totalAmount.toLocaleString('vi-VN')}đ
                          </div>
                          <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 500 }}>
                            {order.paymentMethod === 'cod' ? 'COD' : 'VNPay'}
                          </div>
                        </td>

                        {/* Status */}
                        <td style={{ padding: '12px 16px', whiteSpace: 'nowrap', verticalAlign: 'middle', width: `${colWidths.status}px`, overflow: 'hidden' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '3px 8px',
                              borderRadius: '999px',
                              fontSize: '11px',
                              fontWeight: 600,
                              color: cfg.color,
                              backgroundColor: cfg.bg,
                              border: `1px solid ${cfg.border}`,
                            }}>
                              {cfg.icon}
                              <span>{cfg.label}</span>
                            </span>
                            {(order.podPhotoUrl || order.status === 'COMPLETED' || order.status === 'DELIVERED') && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPodPreviewModalOrder(order);
                                }}
                                title="Xem ảnh bàn giao POD từ tài xế"
                                style={{
                                  border: '1px solid #bbf7d0',
                                  backgroundColor: '#f0fdf4',
                                  color: '#166534',
                                  borderRadius: '6px',
                                  padding: '2px 6px',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  fontSize: '10px',
                                  fontWeight: 600,
                                }}
                              >
                                <Camera size={11} color="#166534" />
                                <span>Ảnh POD</span>
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Actions */}
                        <td
                          className="sticky-action-col"
                          style={{
                            padding: '12px 20px',
                            textAlign: 'right',
                            whiteSpace: 'nowrap',
                            verticalAlign: 'middle',
                            position: 'sticky',
                            right: 0,
                            width: `${colWidths.actions}px`,
                            backgroundColor: '#ffffff',
                            zIndex: 1,
                            boxShadow: '-4px 0 8px rgba(0,0,0,0.03)',
                            transition: 'background-color 0.15s ease',
                          }}
                          onClick={e => e.stopPropagation()}
                        >
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            {canOperateWarehouse && (
                              <>
                                {order.status === 'PENDING' && (
                                  <button
                                    onClick={() => handleReceiveAndStartPicking(order)}
                                    style={{
                                      backgroundColor: '#2563eb',
                                      color: '#ffffff',
                                      padding: '5px 10px',
                                      borderRadius: '6px',
                                      fontSize: '11px',
                                      fontWeight: 600,
                                      border: 'none',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    Tiếp Nhận
                                  </button>
                                )}

                                {(order.status === 'PROCESSING' || order.status === 'PICKING') && (
                                  <button
                                    onClick={() => handleCompletePicking(order)}
                                    style={{
                                      backgroundColor: '#059669',
                                      color: '#ffffff',
                                      padding: '5px 10px',
                                      borderRadius: '6px',
                                      fontSize: '11px',
                                      fontWeight: 600,
                                      border: 'none',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    Đã Soạn Xong
                                  </button>
                                )}

                                {order.status === 'PACKED' && (
                                  <button
                                    onClick={() => setConfirmDispatchModal({ type: 'HANDOVER_SINGLE', order })}
                                    disabled={handoverLoadingId === order.id}
                                    style={{
                                      backgroundColor: '#0f766e',
                                      color: '#ffffff',
                                      padding: '5px 10px',
                                      borderRadius: '6px',
                                      fontSize: '11px',
                                      fontWeight: 600,
                                      border: 'none',
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      opacity: handoverLoadingId === order.id ? 0.7 : 1,
                                    }}
                                    title="Quản lý ấn xác nhận bàn giao cho shipper để sẵn sàng phân tuyến"
                                  >
                                    <PackageCheck size={12} color="#ffffff" />
                                    <span>{handoverLoadingId === order.id ? 'Đang bàn giao...' : 'Bàn Giao Shipper'}</span>
                                  </button>
                                )}

                                {(order.status === 'READY_FOR_DELIVERY' || order.status === 'CONFIRMED') && (
                                  <button
                                    onClick={() => {
                                      setManualDriverModalOrder(order);
                                      setSelectedDriverForAssign(getInitialDriverForOrder(order));
                                    }}
                                    style={{
                                      backgroundColor: order.assignedDriverName ? '#475569' : '#d97706',
                                      color: '#ffffff',
                                      padding: '5px 10px',
                                      borderRadius: '6px',
                                      fontSize: '11px',
                                      fontWeight: 600,
                                      border: 'none',
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                    }}
                                    title={order.assignedDriverName ? `Đổi tài xế (Hiện tại: ${order.assignedDriverName})` : 'Gán tài xế thủ công hoặc dùng nút Tự Động Phân Tuyến'}
                                  >
                                    <Truck size={12} color="#ffffff" />
                                    <span>{order.assignedDriverName ? 'Đổi Tài Xế' : 'Gán Xe'}</span>
                                  </button>
                                )}

                                {(order.status === 'SHIPPED' || order.status === 'DELIVERING' || order.status === 'IN_TRANSIT') && (
                                  <button
                                    onClick={() => setConfirmDispatchModal({ type: 'CONFIRM_DELIVERY', order })}
                                    style={{
                                      backgroundColor: '#0f766e',
                                      color: '#ffffff',
                                      padding: '5px 10px',
                                      borderRadius: '6px',
                                      fontSize: '11px',
                                      fontWeight: 600,
                                      border: 'none',
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                    }}
                                    title="Xác nhận đơn đã hoàn thành giao hàng"
                                  >
                                    <CheckCircle2 size={12} color="#ffffff" />
                                    <span>Xác Nhận Đã Giao</span>
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
                              </>
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
                                <span>Ảnh Giao Hàng</span>
                              </button>
                            )}

                            <button
                              onClick={() => setPrintModalOrder(order)}
                              title="In phiếu giao hàng / vận chuyển"
                              style={{
                                backgroundColor: '#f8fafc',
                                color: '#0f172a',
                                padding: '5px 8px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: 600,
                                border: '1px solid #cbd5e1',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px',
                                cursor: 'pointer',
                              }}
                            >
                              <Printer size={11} color="#2563eb" />
                              <span>Phiếu Giao</span>
                            </button>

                            <button
                              onClick={() => setReceiptModalOrder(order)}
                              title="In phiếu xuất kho chuẩn Mẫu 02 - VT (Bộ Tài Chính)"
                              style={{
                                backgroundColor: '#f0fdfa',
                                color: '#0f766e',
                                padding: '5px 8px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: 600,
                                border: '1px solid #99f6e4',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px',
                                cursor: 'pointer',
                              }}
                            >
                              <FileText size={11} color="#0f766e" />
                              <span>Phiếu 02-VT</span>
                            </button>

                            <button
                              onClick={() => setSelectedOrder(order)}
                              style={{
                                backgroundColor: '#f1f5f9',
                                color: '#334155',
                                padding: '5px 8px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: 600,
                                border: '1px solid #cbd5e1',
                                cursor: 'pointer',
                              }}
                            >
                              Chi tiết
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px', marginBottom: '20px' }}>
              {paginatedOrders.map(order => {
                const cfg = getOrderStatusConfig(order.status, order.assignedDriverName);
                const isTargetHighlight = Boolean(highlightCode && (
                  order.orderCode.toLowerCase().includes(highlightCode.toLowerCase()) ||
                  order.id === highlightCode
                ));
                const isOrderGuiding = activePickGuide?.orderId === order.id && activePickGuide?.status !== 'COMPLETED';
                const orderLocations = getOrderUniqueLocations(order.items);
                return (
                  <div
                    key={order.id}
                    ref={isTargetHighlight ? (el) => { if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); } : undefined}
                    onClick={() => setSelectedOrder(order)}
                    style={{
                      backgroundColor: isOrderGuiding ? '#fffdf5' : isTargetHighlight ? '#f0fdf4' : '#ffffff',
                      borderRadius: '10px',
                      border: isOrderGuiding
                        ? '2px solid #f59e0b'
                        : isTargetHighlight
                        ? '2px solid #0f766e'
                        : '1px solid #e2e8f0',
                      padding: '14px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div>
                      {/* Card Top: Code + Classification + Status Badge */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', gap: '6px', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{
                            fontSize: '11px',
                            fontFamily: 'monospace',
                            fontWeight: 800,
                            color: '#1d4ed8',
                            backgroundColor: '#eff6ff',
                            padding: '3px 7px',
                            borderRadius: '6px',
                            border: '1px solid #dbeafe',
                          }}>
                            #{order.orderCode}
                          </span>
                          {(() => {
                            const cls = detectSlipClassification(order as any);
                            const badge = {
                              SALE: { text: 'Bán Lẻ', bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
                              DISPOSAL: { text: 'Tiêu Hủy', bg: '#faf5ff', color: '#7c3aed', border: '#e9d5ff' },
                              RETURN: { text: 'Hoàn/Trả', bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' },
                              TRANSFER: { text: 'Điều Chuyển', bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
                            }[cls];
                            return (
                              <span style={{
                                fontSize: '10px',
                                fontWeight: 600,
                                padding: '2px 6px',
                                borderRadius: '4px',
                                backgroundColor: badge.bg,
                                color: badge.color,
                                border: `1px solid ${badge.border}`,
                              }}>
                                {badge.text}
                              </span>
                            );
                          })()}
                        </div>
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

                      {/* ── VỊ TRÍ KỆ (A, B, C • TẦNG 1, 2) & TÀI XẾ GỌN GÀNG ── */}
                      <div
                        style={{
                          marginBottom: '12px',
                          padding: '8px 10px',
                          borderRadius: '8px',
                          backgroundColor: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                        }}
                      >
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '6px',
                          flexWrap: 'wrap',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                            {orderLocations.map(loc => (
                              <span
                                key={loc.shortCode}
                                style={{
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  padding: '2px 7px',
                                  borderRadius: '4px',
                                  backgroundColor: '#f0fdfa',
                                  color: '#0f766e',
                                  border: '1px solid #99f6e4',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                              >
                                <Radio size={10} />
                                <span>{loc.fullLabel}</span>
                              </span>
                            ))}
                          </div>
                          <span style={{ fontSize: '11px', fontWeight: 600, color: '#475569' }}>
                            {order.items?.length || 0} sản phẩm
                          </span>
                        </div>

                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontSize: '11.5px',
                          color: '#475569',
                          paddingTop: '6px',
                          borderTop: '1px dashed #e2e8f0',
                        }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '5px', minWidth: 0 }}>
                            <Truck size={13} color={order.assignedDriverName ? '#059669' : '#94a3b8'} />
                            {order.assignedDriverName ? (
                              <span style={{ fontWeight: 600, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {order.assignedDriverName}
                              </span>
                            ) : (
                              <span style={{ color: '#94a3b8' }}>Chưa gán xe</span>
                            )}
                          </span>
                          {order.assignedDriverName && (
                            <span style={{ fontSize: '10.5px', color: '#047857', fontWeight: 600 }}>
                              Chuyến #{order.tripNumber || 1}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Card Bottom: Total Amount & Clean Action Buttons */}
                    <div
                      style={{
                        paddingTop: '10px',
                        borderTop: '1px solid #f1f5f9',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px',
                      }}
                      onClick={e => e.stopPropagation()}
                    >
                      <div>
                        <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                          {order.totalAmount.toLocaleString('vi-VN')}đ
                        </div>
                        <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 500 }}>
                          {order.paymentMethod === 'cod' ? 'COD' : 'VNPay'}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => handleSelectAndLocateOrder(order)}
                          style={{
                            backgroundColor: '#0f766e',
                            color: '#ffffff',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            fontSize: '11.5px',
                            fontWeight: 600,
                            border: 'none',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                          }}
                        >
                          <Lightbulb size={13} />
                          <span>Lấy hàng</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelectedOrder(order)}
                          style={{
                            backgroundColor: '#f8fafc',
                            color: '#334155',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            fontSize: '11.5px',
                            fontWeight: 600,
                            border: '1px solid #cbd5e1',
                            cursor: 'pointer',
                          }}
                        >
                          Chi tiết
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
        <div
          onClick={() => setSelectedOrder(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 2000,
            display: 'flex',
            justifyContent: 'flex-end',
            backgroundColor: 'rgba(15, 23, 42, 0.45)',
            backdropFilter: 'blur(3px)',
            cursor: 'pointer',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              cursor: 'default',
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
            }}
          >
            <div>
              {/* Top Drawer Header (Compact with Status & Address) */}
              <div style={{ paddingBottom: '14px', borderBottom: '1px solid #e2e8f0', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '12px', fontFamily: 'monospace', fontWeight: 700, color: '#1d4ed8', backgroundColor: '#eff6ff', padding: '2px 8px', borderRadius: '6px', border: '1px solid #dbeafe' }}>
                      #{selectedOrder.orderCode}
                    </span>
                    {(() => {
                      const detailCfg = getOrderStatusConfig(selectedOrder.status, selectedOrder.assignedDriverName);
                      return (
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: '999px',
                            fontSize: '11px',
                            fontWeight: 600,
                            color: detailCfg.color,
                            backgroundColor: detailCfg.bg,
                            border: `1px solid ${detailCfg.border}`,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          {detailCfg.icon}
                          <span>{detailCfg.label}</span>
                        </span>
                      );
                    })()}
                  </div>
                  <button
                    onClick={() => setSelectedOrder(null)}
                    style={{ padding: '6px', borderRadius: '6px', backgroundColor: '#f1f5f9', color: '#64748b', border: 'none', cursor: 'pointer' }}
                  >
                    <X size={16} />
                  </button>
                </div>

                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: '0 0 6px 0' }}>
                  {selectedOrder.customerName}
                </h3>

                <div style={{ fontSize: '12px', color: '#475569', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <MapPin size={13} color="#ef4444" style={{ flexShrink: 0 }} />
                    <span>{selectedOrder.customerAddress}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b' }}>
                    <Phone size={12} color="#64748b" style={{ flexShrink: 0 }} />
                    <span>{selectedOrder.customerPhone}</span>
                  </div>
                </div>
              </div>

              {/* ── GIAO DIỆN ĐỊNH HƯỚNG LẤY HÀNG THÔNG MINH (STEP-BY-STEP GUIDED PICKING CTA) ── */}
              {(() => {
                const allOrderItems = selectedOrder.items || [];
                const totalCount = allOrderItems.length;
                const pickedCount = allOrderItems.filter((_, idx) => isOrderItemPicked(selectedOrder, idx)).length;
                const allPicked = totalCount > 0 && pickedCount >= totalCount;
                const isGuidingThis = activePickGuide?.orderId === selectedOrder.id && activePickGuide?.status === 'WAITING_STOP';
                const nextUnpickedIdx = allOrderItems.findIndex((_, idx) => !isOrderItemPicked(selectedOrder, idx));
                const firstTargetLoc = nextUnpickedIdx >= 0 ? resolveOrderItemShelfTier(allOrderItems[nextUnpickedIdx], nextUnpickedIdx) : null;
                const firstTargetItem = nextUnpickedIdx >= 0 ? allOrderItems[nextUnpickedIdx] : null;

                // Tìm món kế tiếp sau món đang lấy
                const afterActiveIdx = isGuidingThis
                  ? allOrderItems.findIndex((_, idx) => idx !== activePickGuide.itemIdx && !isOrderItemPicked(selectedOrder, idx))
                  : -1;
                const afterActiveItem = afterActiveIdx >= 0 ? allOrderItems[afterActiveIdx] : null;
                const afterActiveLoc = afterActiveIdx >= 0 && afterActiveItem ? resolveOrderItemShelfTier(afterActiveItem, afterActiveIdx) : null;

                return (
                  <div style={{
                    padding: '14px',
                    borderRadius: '10px',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    marginBottom: '14px',
                    fontSize: '12px',
                  }}>
                    {/* Thanh Tiến Độ Lấy Hàng */}
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Radio size={14} color="#0f766e" />
                          <span>Tiến độ lấy hàng</span>
                        </span>
                        <span style={{
                          fontSize: '11.5px',
                          fontWeight: 700,
                          color: allPicked ? '#166534' : '#0f766e',
                          fontVariantNumeric: 'tabular-nums',
                        }}>
                          {pickedCount}/{totalCount} món
                        </span>
                      </div>
                      <div style={{ width: '100%', height: '6px', backgroundColor: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
                        <div style={{
                          width: `${totalCount > 0 ? Math.round((pickedCount / totalCount) * 100) : 0}%`,
                          height: '100%',
                          backgroundColor: allPicked ? '#16a34a' : isGuidingThis ? '#d97706' : '#0f766e',
                          transition: 'width 0.3s ease',
                        }} />
                      </div>
                    </div>

                    {/* HERO ACTION CARD (ĐỊNH HƯỚNG HÀNH ĐỘNG CHÍNH CHO NHÂN VIÊN) */}
                    <div style={{ marginBottom: '14px' }}>
                      {isGuidingThis && activePickGuide ? (
                        /* TRẠNG THÁI 2: ĐANG DẪN ĐƯỜNG LẤY HÀNG TẠI KỆ */
                        <div style={{
                          padding: '12px',
                          borderRadius: '10px',
                          backgroundColor: '#fffbeb',
                          border: '2px solid #f59e0b',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'stretch', gap: '10px' }}>
                            {/* Ô Vị Trí Kệ Đích Lớn */}
                            <div style={{
                              minWidth: '72px',
                              padding: '8px 10px',
                              borderRadius: '8px',
                              backgroundColor: '#d97706',
                              color: '#ffffff',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}>
                              <span style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', opacity: 0.9 }}>
                                Đi tới kệ
                              </span>
                              <span style={{ fontSize: '22px', fontWeight: 700, lineHeight: 1.15, marginTop: '2px', fontFamily: 'monospace' }}>
                                {activePickGuide.fullLocationLabel}
                              </span>
                            </div>

                            {/* Thông Tin Sản Phẩm Đang Lấy */}
                            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                                <span style={{ fontSize: '11px', fontWeight: 700, color: '#b45309', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                  <Volume2 size={13} />
                                  <span>Bước {activePickGuide.step}/{activePickGuide.totalSteps} • Đèn & Còi đang bật</span>
                                </span>
                              </div>
                              <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginTop: '3px', lineHeight: 1.3 }}>
                                {activePickGuide.productName}
                              </div>
                              <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#1d4ed8', marginTop: '2px' }}>
                                Số lượng cần lấy: {activePickGuide.quantity}
                              </div>
                            </div>
                          </div>

                          {afterActiveItem && afterActiveLoc && (
                            <div style={{
                              fontSize: '11px',
                              color: '#78350f',
                              backgroundColor: '#fef3c7',
                              padding: '5px 8px',
                              borderRadius: '6px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                            }}>
                              <span>Món kế tiếp: <b>{cleanProductDisplayName(afterActiveItem.productName)}</b></span>
                              <span style={{ fontWeight: 700 }}>Kệ {afterActiveLoc.fullLabel}</span>
                            </div>
                          )}

                          {/* Primary CTA để hoàn tất bước hiện tại */}
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              type="button"
                              onClick={() => handleSimulatePhysicalStop(activePickGuide)}
                              style={{
                                flex: 1,
                                padding: '10px 14px',
                                borderRadius: '8px',
                                fontSize: '13px',
                                fontWeight: 700,
                                backgroundColor: '#d97706',
                                color: '#ffffff',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                              }}
                            >
                              <CheckCircle2 size={16} />
                              <span>
                                {afterActiveItem
                                  ? `Đã lấy xong tại ${activePickGuide.fullLocationLabel} — Qua món kế tiếp`
                                  : `Đã lấy xong tại ${activePickGuide.fullLocationLabel} — Hoàn tất lấy hàng`}
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={handleStopAllIotShelves}
                              style={{
                                padding: '10px 12px',
                                borderRadius: '8px',
                                fontSize: '12px',
                                fontWeight: 600,
                                backgroundColor: '#ffffff',
                                color: '#475569',
                                border: '1px solid #cbd5e1',
                                cursor: 'pointer',
                              }}
                            >
                              Tạm dừng
                            </button>
                          </div>
                        </div>
                      ) : allPicked ? (
                        /* TRẠNG THÁI 3: ĐÃ LẤY ĐỦ 100% -> ĐỊNH HƯỚNG CTA CHUYỂN BƯỚC TIẾP THEO */
                        <div style={{
                          padding: '12px',
                          borderRadius: '10px',
                          backgroundColor: '#f0fdf4',
                          border: '1.5px solid #86efac',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#166534', fontWeight: 700, fontSize: '13px' }}>
                              <CheckCircle2 size={18} color="#16a34a" />
                              <span>Đã lấy đủ {totalCount}/{totalCount} sản phẩm trong đơn</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => activateOrderProductShelf(selectedOrder)}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#0f766e',
                                fontSize: '11px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                textDecoration: 'underline',
                              }}
                            >
                              Lấy lại từ đầu
                            </button>
                          </div>

                          {canOperateWarehouse && (selectedOrder.status === 'PENDING' || selectedOrder.status === 'PROCESSING' || selectedOrder.status === 'PICKING' || selectedOrder.status === 'PACKING') && (
                            <button
                              type="button"
                              onClick={() => handleCompletePicking(selectedOrder)}
                              style={{
                                width: '100%',
                                padding: '11px 16px',
                                borderRadius: '8px',
                                fontSize: '13px',
                                fontWeight: 700,
                                backgroundColor: '#16a34a',
                                color: '#ffffff',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                              }}
                            >
                              <PackageCheck size={16} />
                              <span>Hoàn tất đóng gói & Chuyển bàn giao</span>
                            </button>
                          )}
                        </div>
                      ) : (
                        /* TRẠNG THÁI 1: CHƯA BẮT ĐẦU -> ĐỊNH HƯỚNG LỘ TRÌNH & NÚT BẮT ĐẦU */
                        <div style={{
                          padding: '12px',
                          borderRadius: '10px',
                          backgroundColor: '#ffffff',
                          border: '1.5px solid #0f766e',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>
                              Lộ trình kệ cần tới:
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                              {allOrderItems.map((it, idx) => {
                                const l = resolveOrderItemShelfTier(it, idx);
                                const picked = isOrderItemPicked(selectedOrder, idx);
                                return (
                                  <React.Fragment key={idx}>
                                    {idx > 0 && <span style={{ color: '#94a3b8', fontSize: '11px' }}>→</span>}
                                    <span style={{
                                      fontSize: '11px',
                                      fontWeight: 700,
                                      padding: '2px 7px',
                                      borderRadius: '4px',
                                      backgroundColor: picked ? '#dcfce7' : idx === nextUnpickedIdx ? '#0f766e' : '#f1f5f9',
                                      color: picked ? '#166534' : idx === nextUnpickedIdx ? '#ffffff' : '#334155',
                                    }}>
                                      {l.fullLabel}
                                    </span>
                                  </React.Fragment>
                                );
                              })}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => activateOrderProductShelf(selectedOrder)}
                            style={{
                              width: '100%',
                              padding: '11px 16px',
                              borderRadius: '8px',
                              fontSize: '13.5px',
                              fontWeight: 700,
                              backgroundColor: '#0f766e',
                              color: '#ffffff',
                              border: 'none',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '8px',
                            }}
                          >
                            <Lightbulb size={16} />
                            <span>
                              {firstTargetLoc && firstTargetItem
                                ? `Bắt đầu lấy hàng — Đi tới kệ ${firstTargetLoc.fullLabel}`
                                : 'Bắt đầu lấy hàng ngay'}
                            </span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Sơ đồ 3 Kệ (A, B, C) x 2 Tầng (A1, A2 | B1, B2 | C1, C2) */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: '8px',
                      marginBottom: '12px',
                    }}>
                      {(['A', 'B', 'C'] as const).map(rackLetter => {
                        const hwCodeMap: Record<'A' | 'B' | 'C', DemoIotShelfCode> = { A: 'A1', B: 'A2', C: 'A3' };
                        const orderItemLocs = allOrderItems.map((it, idx) => ({
                          item: it,
                          idx,
                          loc: resolveOrderItemShelfTier(it, idx),
                          isPicked: isOrderItemPicked(selectedOrder, idx),
                        }));
                        const isRackActive =
                          isGuidingThis &&
                          activePickGuide?.rackLabel === `Kệ ${rackLetter}`;

                        return (
                          <div
                            key={rackLetter}
                            style={{
                              backgroundColor: isRackActive ? '#fffbeb' : '#ffffff',
                              border: `1.5px solid ${isRackActive ? '#f59e0b' : '#cbd5e1'}`,
                              borderRadius: '8px',
                              padding: '8px',
                            }}
                          >
                            <div
                              onClick={() => {
                                fetch(`${IOT_API}/api/iot/shelf/locate`, {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    shelfCode: hwCodeMap[rackLetter],
                                    slotCode: `${rackLetter}1`,
                                    orderId: selectedOrder.orderCode,
                                    productName: `Kiểm tra đèn Kệ ${rackLetter}`,
                                    qty: 1,
                                    step: 1,
                                    totalSteps: 1,
                                  }),
                                }).catch(() => null);
                                showToast(`Đã bật đèn Kệ ${rackLetter}`, 'info');
                              }}
                              title={`Bấm để bật thử đèn Kệ ${rackLetter}`}
                              style={{
                                fontSize: '12px',
                                fontWeight: 700,
                                color: isRackActive ? '#92400e' : '#0f172a',
                                marginBottom: '6px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                cursor: 'pointer',
                              }}
                            >
                              <span>Kệ {rackLetter}</span>
                              <Lightbulb size={13} color={isRackActive ? '#d97706' : '#94a3b8'} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              {([1, 2] as const).map(tierNum => {
                                const matching = orderItemLocs.filter(x => x.loc.rack === rackLetter && x.loc.tier === tierNum);
                                const hasItems = matching.length > 0;
                                const slotCode = `${rackLetter}${tierNum}`;
                                const isTierActive =
                                  isRackActive &&
                                  activePickGuide?.fullLocationLabel === slotCode;
                                const allTierPicked = hasItems && matching.every(m => m.isPicked);

                                return (
                                  <div
                                    key={tierNum}
                                    onClick={() => {
                                      if (hasItems) {
                                        activateOrderProductShelf(selectedOrder, matching[0].idx);
                                      }
                                    }}
                                    style={{
                                      padding: '4px 6px',
                                      borderRadius: '4px',
                                      fontSize: '11px',
                                      fontWeight: hasItems ? 700 : 500,
                                      cursor: hasItems ? 'pointer' : 'default',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      backgroundColor: isTierActive
                                        ? '#fef3c7'
                                        : allTierPicked
                                        ? '#f0fdf4'
                                        : hasItems
                                        ? '#f0fdfa'
                                        : '#f8fafc',
                                      color: isTierActive
                                        ? '#92400e'
                                        : allTierPicked
                                        ? '#166534'
                                        : hasItems
                                        ? '#0f766e'
                                        : '#94a3b8',
                                      border: `1px solid ${
                                        isTierActive
                                          ? '#f59e0b'
                                          : allTierPicked
                                          ? '#bbf7d0'
                                          : hasItems
                                          ? '#99f6e4'
                                          : '#e2e8f0'
                                      }`,
                                    }}
                                  >
                                    <span>{slotCode}</span>
                                    <span>{hasItems ? `${matching.length} SP` : '—'}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Danh sách từng bước sản phẩm */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {allOrderItems.map((item, i) => {
                        const loc = resolveOrderItemShelfTier(item, i);
                        const cleanName = cleanProductDisplayName(item.productName);
                        const isActiveItem =
                          isGuidingThis &&
                          activePickGuide?.itemIdx === i;
                        const isPicked = isOrderItemPicked(selectedOrder, i);
                        const qty = item.requestedQuantity || item.quantity || 1;

                        return (
                          <div
                            key={i}
                            onClick={() => activateOrderProductShelf(selectedOrder, i)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '8px',
                              padding: '8px 10px',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              backgroundColor: isActiveItem
                                ? '#fffbeb'
                                : isPicked
                                ? '#f0fdf4'
                                : '#ffffff',
                              border: `1.5px solid ${
                                isActiveItem
                                  ? '#f59e0b'
                                  : isPicked
                                  ? '#86efac'
                                  : '#e2e8f0'
                              }`,
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                              <div style={{
                                width: '24px',
                                height: '24px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                                backgroundColor: isActiveItem
                                  ? '#d97706'
                                  : isPicked
                                  ? '#16a34a'
                                  : '#0f766e',
                                color: '#ffffff',
                                fontFamily: 'monospace',
                              }}>
                                {isPicked ? <Check size={13} /> : loc.fullLabel}
                              </div>

                              <div style={{ minWidth: 0, flex: 1 }}>
                                <div style={{
                                  fontWeight: 600,
                                  color: isPicked ? '#64748b' : '#0f172a',
                                  textDecoration: isPicked ? 'line-through' : 'none',
                                  fontSize: '12.5px',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}>
                                  {cleanName}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#0f766e' }}>
                                    Kệ {loc.fullLabel}
                                  </span>
                                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#475569', fontVariantNumeric: 'tabular-nums' }}>
                                    • Số lượng: {qty} {item.unit || 'món'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {isActiveItem ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (activePickGuide) handleSimulatePhysicalStop(activePickGuide);
                                }}
                                style={{
                                  padding: '5px 10px',
                                  borderRadius: '6px',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  backgroundColor: '#d97706',
                                  color: '#ffffff',
                                  border: 'none',
                                  cursor: 'pointer',
                                  flexShrink: 0,
                                }}
                              >
                                Xác nhận lấy
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  activateOrderProductShelf(selectedOrder, i);
                                }}
                                style={{
                                  padding: '5px 10px',
                                  borderRadius: '6px',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  backgroundColor: isPicked ? '#dcfce7' : '#f0fdfa',
                                  color: isPicked ? '#166534' : '#0f766e',
                                  border: `1px solid ${isPicked ? '#86efac' : '#99f6e4'}`,
                                  cursor: 'pointer',
                                  flexShrink: 0,
                                }}
                              >
                                {isPicked ? 'Đã lấy' : `Bật kệ ${loc.fullLabel}`}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

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

              {/* Proof of Delivery (POD) / Failure Photo Box */}
              {(selectedOrder.podPhotoUrl || selectedOrder.failurePhotoUrl || selectedOrder.status === 'COMPLETED' || selectedOrder.status === 'DELIVERED' || selectedOrder.status === 'FAILED_DELIVERY' || selectedOrder.status === 'RETURN_TO_WAREHOUSE') && (
                <div style={{ padding: '14px', borderRadius: '10px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', marginBottom: '16px', fontSize: '12px' }}>
                  <div style={{ fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Camera size={14} color="#059669" />
                      <span>Bằng chứng giao nhận (POD):</span>
                    </div>
                    {(selectedOrder.podPhotoUrl || selectedOrder.status === 'COMPLETED' || selectedOrder.status === 'DELIVERED') ? (
                      <span style={{ fontSize: '10px', backgroundColor: '#f0fdf4', color: '#166534', padding: '2px 8px', borderRadius: '6px', fontWeight: 600, border: '1px solid #bbf7d0' }}>
                        Ảnh bàn giao hợp lệ
                      </span>
                    ) : selectedOrder.failurePhotoUrl ? (
                      <span style={{ fontSize: '10px', backgroundColor: '#fef2f2', color: '#991b1b', padding: '2px 8px', borderRadius: '6px', fontWeight: 600, border: '1px solid #fecaca' }}>
                        Ảnh sự cố giao hàng
                      </span>
                    ) : (
                      <span style={{ fontSize: '10px', backgroundColor: '#fffbeb', color: '#92400e', padding: '2px 8px', borderRadius: '6px', fontWeight: 500, border: '1px solid #fde68a' }}>
                        Chờ tài xế chụp ảnh
                      </span>
                    )}
                  </div>

                  {(selectedOrder.podPhotoUrl || selectedOrder.status === 'COMPLETED' || selectedOrder.status === 'DELIVERED') ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div
                        onClick={() => setPodPreviewModalOrder(selectedOrder)}
                        style={{
                          position: 'relative',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          border: '1px solid #cbd5e1',
                          cursor: 'pointer',
                          backgroundColor: '#0f172a',
                        }}
                        title="Click để phóng to ảnh POD"
                      >
                        <img
                          src={resolvePodUrl(selectedOrder.podPhotoUrl)}
                          alt="Bằng chứng giao hàng"
                          onError={(e) => {
                            const target = e.currentTarget;
                            if (!target.src.includes('unsplash.com')) {
                              target.src = DEFAULT_VERIFIED_POD_PHOTO;
                            }
                          }}
                          style={{ width: '100%', height: '180px', objectFit: 'cover', display: 'block' }}
                        />
                        <div style={{
                          position: 'absolute',
                          bottom: 0,
                          insetInline: 0,
                          backgroundColor: 'rgba(15, 23, 42, 0.75)',
                          padding: '6px 10px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          color: '#ffffff',
                          fontSize: '11px',
                        }}>
                          <span>Xem toàn màn hình</span>
                          <Camera size={13} color="#38bdf8" />
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => setPodPreviewModalOrder(selectedOrder)}
                          style={{
                            flex: 1,
                            padding: '7px 10px',
                            backgroundColor: '#059669',
                            color: '#ffffff',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 600,
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '5px',
                          }}
                        >
                          <Camera size={13} />
                          <span>Chi Tiết Biên Bản</span>
                        </button>
                        <a
                          href={resolvePodUrl(selectedOrder.podPhotoUrl)}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            padding: '7px 10px',
                            backgroundColor: '#ffffff',
                            color: '#0f172a',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 600,
                            border: '1px solid #cbd5e1',
                            textDecoration: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                          }}
                        >
                          <ExternalLink size={12} />
                          <span>Ảnh Gốc</span>
                        </a>
                      </div>
                    </div>
                  ) : selectedOrder.failurePhotoUrl ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div
                        onClick={() => setPodPreviewModalOrder(selectedOrder)}
                        style={{
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
                          style={{ width: '100%', height: '160px', objectFit: 'cover', display: 'block' }}
                        />
                      </div>
                      {selectedOrder.failureReason && (
                        <div style={{ color: '#991b1b', fontSize: '11px', backgroundColor: '#fef2f2', padding: '6px 10px', borderRadius: '6px', border: '1px solid #fecaca' }}>
                          Lý do: {selectedOrder.failureReason}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ padding: '12px', textAlign: 'center', color: '#64748b', backgroundColor: '#ffffff', borderRadius: '6px', border: '1px dashed #cbd5e1', fontSize: '11px' }}>
                      Đang chờ tài xế hoàn tất quy trình và gửi ảnh xác nhận giao hàng.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Bottom Actions inside Drawer */}
            <div style={{ paddingTop: '16px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                onClick={() => setPrintModalOrder(selectedOrder)}
                style={{
                  padding: '11px 14px',
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
                <span>Phiếu Giao Nhận</span>
              </button>

              <button
                onClick={() => setReceiptModalOrder(selectedOrder)}
                style={{
                  padding: '11px 14px',
                  backgroundColor: '#0f766e',
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
                <FileText size={15} color="#99f6e4" />
                <span>Phiếu Xuất 02-VT</span>
              </button>

              {canOperateWarehouse && (
                <>
                  {(selectedOrder.status === 'SHIPPED' || selectedOrder.status === 'DELIVERING' || selectedOrder.status === 'IN_TRANSIT') && (
                    <button
                      onClick={() => setConfirmDispatchModal({ type: 'CONFIRM_DELIVERY', order: selectedOrder })}
                      style={{
                        padding: '11px 14px',
                        backgroundColor: '#0f766e',
                        color: '#ffffff',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: 600,
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                      }}
                      title="Xác nhận đơn đã hoàn thành giao hàng"
                    >
                      <CheckCircle2 size={15} color="#ffffff" />
                      <span>Xác Nhận Đã Giao</span>
                    </button>
                  )}

                  {selectedOrder.status === 'PACKED' && (
                    <button
                      onClick={() => setConfirmDispatchModal({ type: 'HANDOVER_SINGLE', order: selectedOrder })}
                      disabled={handoverLoadingId === selectedOrder.id}
                      style={{
                        flex: 1,
                        padding: '10px 14px',
                        backgroundColor: '#0f766e',
                        color: '#ffffff',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: 600,
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        opacity: handoverLoadingId === selectedOrder.id ? 0.7 : 1,
                      }}
                      title="Quản lý ấn xác nhận bàn giao cho shipper"
                    >
                      <PackageCheck size={14} />
                      <span>{handoverLoadingId === selectedOrder.id ? 'Đang bàn giao...' : 'Bàn Giao Shipper'}</span>
                    </button>
                  )}

                  {(selectedOrder.status === 'READY_FOR_DELIVERY' || selectedOrder.status === 'CONFIRMED') && (
                    <button
                      onClick={() => {
                        setManualDriverModalOrder(selectedOrder);
                        setSelectedDriverForAssign(getInitialDriverForOrder(selectedOrder));
                        setSelectedOrder(null);
                      }}
                      style={{
                        flex: 1,
                        padding: '10px 14px',
                        backgroundColor: selectedOrder.assignedDriverName ? '#475569' : '#d97706',
                        color: '#ffffff',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: 600,
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                      }}
                      title={selectedOrder.assignedDriverName ? `Đổi tài xế (Hiện tại: ${selectedOrder.assignedDriverName})` : 'Gán tài xế cho đơn hàng'}
                    >
                      <Truck size={14} />
                      <span>{selectedOrder.assignedDriverName ? 'Đổi Tài Xế' : 'Gán Xe'}</span>
                    </button>
                  )}

                  {(selectedOrder.status === 'DELIVERING' || selectedOrder.status === 'SHIPPED' || selectedOrder.status === 'IN_TRANSIT') && (
                    <div
                      title="Đơn hàng đang trên đường giao, đã khóa không thể đổi tài xế"
                      style={{
                        padding: '10px 14px',
                        backgroundColor: '#f1f5f9',
                        color: '#64748b',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: 600,
                        border: '1px solid #cbd5e1',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        cursor: 'not-allowed',
                      }}
                    >
                      <Lock size={14} color="#64748b" />
                      <span>Đang Giao Hàng (Đã Khóa Xe)</span>
                    </div>
                  )}
                </>
              )}

              {isSaler && (
                <div
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    fontSize: '11px',
                    color: '#64748b',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <Lock size={14} color="#0f766e" style={{ flexShrink: 0 }} />
                  <span>Quyền hạn Kinh doanh: Bạn có thể xem toàn bộ tiến độ, hành trình và in chứng từ đơn hàng. Nghiệp vụ tiếp nhận, soạn hàng và điều phối xe do Bộ phận Kho đảm nhiệm.</span>
                </div>
              )}
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
        <div
          onClick={() => setManualDriverModalOrder(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 3000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(15, 23, 42, 0.45)',
            backdropFilter: 'blur(3px)',
            padding: '16px',
            cursor: 'pointer',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              cursor: 'default',
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '20px',
              maxWidth: '440px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
            }}
          >
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
                        width: '34px',
                        height: '34px',
                        borderRadius: '6px',
                        backgroundColor: '#eff6ff',
                        border: '1px solid #bfdbfe',
                        color: '#2563eb',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        <Truck size={16} color="#2563eb" />
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
        <div
          onClick={() => setReverseLogisticsModalOrder(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 3000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(15, 23, 42, 0.45)',
            backdropFilter: 'blur(3px)',
            padding: '16px',
            cursor: 'pointer',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              cursor: 'default',
              backgroundColor: '#ffffff',
              border: '1px solid #fecaca',
              borderRadius: '14px',
              maxWidth: '440px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '14px', borderBottom: '1px solid #fef2f2', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#b91c1c', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <AlertTriangle size={18} color="#dc2626" />
                Xử Lý Hàng Hoàn #{reverseLogisticsModalOrder.orderCode}
              </h3>
              <button onClick={() => setReverseLogisticsModalOrder(null)} style={{ color: '#94a3b8', border: 'none', background: 'none' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: '#fef2f2', border: '1px solid #fee2e2', fontSize: '12px', marginBottom: '16px' }}>
              <div style={{ fontWeight: 600, color: '#991b1b', marginBottom: '4px' }}>Lý do giao không thành công:</div>
              <div style={{ color: '#7f1d1d' }}>{reverseLogisticsModalOrder.failureReason || 'Khách hàng không nghe máy (Đã gọi 3 lần)'}</div>
            </div>

            {/* Photo Proof */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, marginBottom: '6px' }}>Ảnh bằng chứng sự cố:</div>
              <div
                onClick={() => setPodPreviewModalOrder(reverseLogisticsModalOrder)}
                style={{
                  height: '160px',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  backgroundColor: '#f1f5f9',
                  border: '1px solid #e2e8f0',
                  cursor: 'pointer',
                  position: 'relative',
                }}
                title="Bấm để xem ảnh kích thước lớn"
              >
                <img
                  src={resolvePodUrl(reverseLogisticsModalOrder.failurePhotoUrl || reverseLogisticsModalOrder.podPhotoUrl)}
                  alt="Ảnh sự cố"
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (!target.src.includes('unsplash.com')) {
                      target.src = DEFAULT_VERIFIED_POD_PHOTO;
                    }
                  }}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <div style={{
                  position: 'absolute',
                  bottom: 0,
                  insetInline: 0,
                  backgroundColor: 'rgba(15, 23, 42, 0.75)',
                  padding: '4px 8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  color: '#ffffff',
                  fontSize: '11px',
                  fontWeight: 600,
                }}>
                  <Eye size={13} /> Bấm để xem ảnh kích thước lớn
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                onClick={() => handleRestockOrder(reverseLogisticsModalOrder.id)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  backgroundColor: '#0f766e',
                  color: '#ffffff',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                Nhập Lại Tồn Kho Lạnh & Lập Phiếu Hàng Hoàn (Restock)
              </button>
              <button
                onClick={() => handleRedispatchOrder(reverseLogisticsModalOrder.id)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  backgroundColor: '#d97706',
                  color: '#ffffff',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Lên Lịch Giao Lại Chuyến Sau
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: XEM BẰNG CHỨNG GIAO HÀNG POD AMAZON S3 ── */}
      {podPreviewModalOrder && (
        <div
          onClick={() => setPodPreviewModalOrder(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 3000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(15, 23, 42, 0.45)',
            backdropFilter: 'blur(3px)',
            padding: '16px',
            cursor: 'pointer',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              cursor: 'default',
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              maxWidth: '440px',
              width: '100%',
              padding: '20px',
              boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '14px', borderBottom: '1px solid #f1f5f9', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#065f46', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <CheckCircle2 size={18} color="#059669" />
                Biên Bản & Ảnh Giao Hàng #{podPreviewModalOrder.orderCode}
              </h3>
              <button onClick={() => setPodPreviewModalOrder(null)} style={{ color: '#94a3b8', border: 'none', background: 'none' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', fontSize: '12px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 600, color: '#0f172a' }}>{podPreviewModalOrder.customerName}</div>
                <div style={{ color: '#64748b' }}>{podPreviewModalOrder.customerAddress}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#2563eb', fontWeight: 600, backgroundColor: '#eff6ff', padding: '3px 8px', borderRadius: '999px' }}>
                <Cloud size={14} />
                <span>Lưu Trữ Điện Tử</span>
              </div>
            </div>

            {/* S3 Photo Preview */}
            <div style={{ minHeight: '220px', maxHeight: '380px', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#0f172a', border: '1px solid #cbd5e1', marginBottom: '18px', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {(podPreviewModalOrder.podPhotoUrl || podPreviewModalOrder.failurePhotoUrl || podPreviewModalOrder.status === 'COMPLETED' || podPreviewModalOrder.status === 'DELIVERED') ? (
                <img
                  src={resolvePodUrl(podPreviewModalOrder.podPhotoUrl || podPreviewModalOrder.failurePhotoUrl)}
                  alt="Ảnh bằng chứng giao hàng"
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (!target.src.includes('unsplash.com')) {
                      target.src = DEFAULT_VERIFIED_POD_PHOTO;
                    }
                  }}
                  style={{ width: '100%', maxHeight: '380px', objectFit: 'contain', display: 'block' }}
                />
              ) : (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>
                  Chưa có ảnh bàn giao từ tài xế
                </div>
              )}
              <div style={{ position: 'absolute', bottom: 0, insetInline: 0, backgroundColor: 'rgba(15, 23, 42, 0.88)', padding: '8px 12px', color: '#ffffff', fontSize: '11px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: 600 }}>Tài xế: {podPreviewModalOrder.assignedDriverName || 'Đội xe điều phối'} ({podPreviewModalOrder.assignedDriverPlate || 'N/A'})</div>
                  <span style={{ color: '#38bdf8', fontFamily: 'monospace', fontSize: '10px' }}>AWS S3 SECURED</span>
                </div>
                <div style={{ color: '#cbd5e1', fontSize: '10px', marginTop: '2px' }}>Kho Gò Vấp (WH-006) • Chuỗi cung ứng lạnh 0°C - 4°C</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              {(podPreviewModalOrder.podPhotoUrl || podPreviewModalOrder.failurePhotoUrl || podPreviewModalOrder.status === 'COMPLETED' || podPreviewModalOrder.status === 'DELIVERED') && (
                <a
                  href={resolvePodUrl(podPreviewModalOrder.podPhotoUrl || podPreviewModalOrder.failurePhotoUrl)}
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
              )}
              <button
                onClick={() => setPodPreviewModalOrder(null)}
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

      {/* ── MODAL: IN PHIẾU GIAO HÀNG & SOẠN HÀNG SIÊU THỊ ── */}
      {printModalOrder && (
        <PrintOrderSlipModal
          order={printModalOrder}
          onClose={() => setPrintModalOrder(null)}
        />
      )}

      {/* ── MODAL: IN PHIẾU XUẤT KHO 02 - VT (BỘ TÀI CHÍNH) ── */}
      {receiptModalOrder && (
        <OutboundReceiptModal
          order={receiptModalOrder}
          onClose={() => setReceiptModalOrder(null)}
        />
      )}

      {/* ── MODAL XÁC NHẬN THAO TÁC XUẤT BẾN & GIAO HÀNG (TRÁNH BẤM NHẦM 1-CHẠM) ── */}
      {confirmDispatchModal && (
        <div
          onClick={() => !confirmActionLoading && setConfirmDispatchModal(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 3500,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(15, 23, 42, 0.45)',
            backdropFilter: 'blur(3px)',
            padding: '16px',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              cursor: 'default',
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '14px',
              maxWidth: '500px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '14px', borderBottom: '1px solid #f1f5f9', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                {confirmDispatchModal.type === 'CONFIRM_DELIVERY' && (
                  <>
                    <div style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <CheckCircle2 size={16} color="#166534" />
                    </div>
                    <span>Xác Nhận Đã Giao Thành Công</span>
                  </>
                )}
                {confirmDispatchModal.type === 'HANDOVER_SINGLE' && (
                  <>
                    <div style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: '#f0f9ff', border: '1px solid #bae6fd', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <PackageCheck size={16} color="#0369a1" />
                    </div>
                    <span>Xác Nhận Bàn Giao Cho Shipper</span>
                  </>
                )}
                {confirmDispatchModal.type === 'HANDOVER_BATCH' && (
                  <>
                    <div style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <PackageCheck size={16} color="#0f766e" />
                    </div>
                    <span>Xác Nhận Bàn Giao Hàng Loạt</span>
                  </>
                )}
                {confirmDispatchModal.type === 'AUTO_DISPATCH' && (
                  <>
                    <div style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Route size={16} color="#059669" />
                    </div>
                    <span>Tự Động Phân Tuyến & Gán Xe (AI VRP)</span>
                  </>
                )}
              </h3>
              <button
                type="button"
                onClick={() => !confirmActionLoading && setConfirmDispatchModal(null)}
                style={{ color: '#94a3b8', border: 'none', background: 'none', cursor: 'pointer', padding: '4px' }}
                title="Đóng (Esc)"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content Details */}
            {confirmDispatchModal.type === 'CONFIRM_DELIVERY' && confirmDispatchModal.order && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', fontFamily: 'monospace' }}>
                      #{confirmDispatchModal.order.orderCode}
                    </span>
                    <span style={{ fontSize: '11px', fontWeight: 500, padding: '2px 8px', borderRadius: '4px', backgroundColor: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' }}>
                      Chờ hoàn tất
                    </span>
                  </div>
                  <span style={{ fontSize: '11px', color: '#64748b', fontVariantNumeric: 'tabular-nums' }}>
                    {confirmDispatchModal.order.warehouseCode || 'Kho Gò Vấp'}
                  </span>
                </div>

                <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 14px', marginBottom: '14px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                    <User size={14} color="#64748b" style={{ marginTop: '2px', flexShrink: 0 }} />
                    <div style={{ color: '#334155' }}>
                      <strong style={{ color: '#0f172a' }}>{confirmDispatchModal.order.customerName || 'Khách vãng lai'}</strong>
                      {confirmDispatchModal.order.customerPhone && (
                        <span style={{ color: '#64748b', marginLeft: '6px' }}>• {confirmDispatchModal.order.customerPhone}</span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                    <MapPin size={14} color="#64748b" style={{ marginTop: '2px', flexShrink: 0 }} />
                    <div style={{ color: '#475569', lineHeight: 1.4 }}>
                      {confirmDispatchModal.order.customerAddress || 'Giao tại quầy'}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderTop: '1px dashed #e2e8f0', paddingTop: '8px' }}>
                    <Truck size={14} color="#64748b" style={{ flexShrink: 0 }} />
                    <div style={{ color: '#334155' }}>
                      Tài xế giao: <strong style={{ color: '#0f172a' }}>{confirmDispatchModal.order.assignedDriverName || 'Đội xe điều phối'}</strong>
                      {confirmDispatchModal.order.assignedDriverPlate && (
                        <span style={{ color: '#64748b', marginLeft: '6px' }}>({confirmDispatchModal.order.assignedDriverPlate})</span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px dashed #e2e8f0', paddingTop: '8px' }}>
                    <span style={{ color: '#475569', fontWeight: 500 }}>Tiền thu hộ COD:</span>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                        {((confirmDispatchModal.order.paymentMethod === 'COD' || confirmDispatchModal.order.paymentMethod === 'TIỀN MẶT')
                          ? (confirmDispatchModal.order.totalAmount || confirmDispatchModal.order.codAmount || 0)
                          : 0
                        ).toLocaleString('vi-VN')} đ
                      </span>
                      <div style={{ fontSize: '10px', color: confirmDispatchModal.order.paymentMethod === 'VNPAY' || confirmDispatchModal.order.paymentMethod === 'ONLINE' ? '#0284c7' : '#92400e', fontWeight: 600 }}>
                        {confirmDispatchModal.order.paymentMethod === 'VNPAY' || confirmDispatchModal.order.paymentMethod === 'ONLINE'
                          ? 'Đã thanh toán qua VNPay'
                          : 'Thu tiền mặt khi nhận hàng'}
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', padding: '10px 12px', marginBottom: '20px', display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '12px', color: '#166534', lineHeight: 1.45 }}>
                  <AlertCircle size={15} color="#166534" style={{ marginTop: '2px', flexShrink: 0 }} />
                  <span>
                    Xác nhận đơn hàng đã giao tận tay người mua thành công và đã hoàn tất thu tiền COD (nếu có). Trạng thái đơn sẽ được cập nhật sang <strong>HOÀN TẤT</strong>.
                  </span>
                </div>
              </div>
            )}

            {confirmDispatchModal.type === 'HANDOVER_SINGLE' && confirmDispatchModal.order && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', fontFamily: 'monospace' }}>
                    #{confirmDispatchModal.order.orderCode}
                  </span>
                  <span style={{ fontSize: '11px', fontWeight: 500, padding: '2px 8px', borderRadius: '4px', backgroundColor: '#f0f9ff', color: '#0369a1', border: '1px solid #bae6fd' }}>
                    Đã đóng gói (PACKED)
                  </span>
                </div>

                <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 14px', marginBottom: '14px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                    <User size={14} color="#64748b" style={{ marginTop: '2px', flexShrink: 0 }} />
                    <div style={{ color: '#334155' }}>
                      <strong style={{ color: '#0f172a' }}>{confirmDispatchModal.order.customerName || 'Khách lẻ'}</strong>
                      {confirmDispatchModal.order.customerPhone && (
                        <span style={{ color: '#64748b', marginLeft: '6px' }}>• {confirmDispatchModal.order.customerPhone}</span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                    <MapPin size={14} color="#64748b" style={{ marginTop: '2px', flexShrink: 0 }} />
                    <div style={{ color: '#475569', lineHeight: 1.4 }}>
                      {confirmDispatchModal.order.customerAddress || 'Giao tại quầy'}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px dashed #e2e8f0', paddingTop: '8px' }}>
                    <span style={{ color: '#475569' }}>Số mặt hàng:</span>
                    <strong style={{ color: '#0f172a' }}>{confirmDispatchModal.order.items?.length || 1} sản phẩm</strong>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ color: '#475569' }}>Tổng giá trị:</span>
                    <strong style={{ color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                      {(confirmDispatchModal.order.totalAmount || 0).toLocaleString('vi-VN')} đ
                    </strong>
                  </div>
                </div>

                <div style={{ backgroundColor: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '6px', padding: '10px 12px', marginBottom: '20px', display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '12px', color: '#0369a1', lineHeight: 1.45 }}>
                  <AlertCircle size={15} color="#0369a1" style={{ marginTop: '2px', flexShrink: 0 }} />
                  <span>
                    Xác nhận kiện hàng đã kiểm tra đầy đủ và bàn giao cho shipper tại cửa xuất bến. Đơn hàng sẽ chuyển sang trạng thái <strong>CHỜ XUẤT BẾN & GÁN XE</strong>.
                  </span>
                </div>
              </div>
            )}

            {confirmDispatchModal.type === 'HANDOVER_BATCH' && (
              <div>
                <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 14px', marginBottom: '14px', fontSize: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ color: '#475569', fontWeight: 500 }}>Số lượng đơn bàn giao:</span>
                    <strong style={{ color: '#0f766e', fontSize: '13px', fontVariantNumeric: 'tabular-nums' }}>
                      {confirmDispatchModal.orders?.length || 0} đơn hàng
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <span style={{ color: '#475569', fontWeight: 500 }}>Kho xuất hàng:</span>
                    <span style={{ color: '#0f172a', fontWeight: 600 }}>
                      {activeWh !== 'ALL' ? activeWh : 'Kho Gò Vấp (WH-006)'}
                    </span>
                  </div>

                  <div style={{ color: '#64748b', fontSize: '11px', marginBottom: '4px' }}>Danh sách mã đơn:</div>
                  <div style={{ maxHeight: '90px', overflowY: 'auto', display: 'flex', flexWrap: 'wrap', gap: '4px', padding: '6px', backgroundColor: '#ffffff', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    {confirmDispatchModal.orders?.map(o => (
                      <span key={o.id} style={{ fontSize: '11px', fontWeight: 600, backgroundColor: '#f1f5f9', color: '#0f172a', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace' }}>
                        #{o.orderCode}
                      </span>
                    ))}
                  </div>
                </div>

                <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '6px', padding: '10px 12px', marginBottom: '20px', display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '12px', color: '#92400e', lineHeight: 1.45 }}>
                  <AlertCircle size={15} color="#92400e" style={{ marginTop: '2px', flexShrink: 0 }} />
                  <span>
                    Toàn bộ {confirmDispatchModal.orders?.length || 0} đơn hàng đã đóng gói (PACKED) sẽ được chuyển đồng loạt sang trạng thái <strong>CHỜ XUẤT BẾN & GÁN XE</strong> để sẵn sàng phân tuyến.
                  </span>
                </div>
              </div>
            )}

            {confirmDispatchModal.type === 'AUTO_DISPATCH' && (
              <div>
                <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 14px', marginBottom: '14px', fontSize: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ color: '#475569', fontWeight: 500 }}>Đơn hàng chờ gán xe:</span>
                    <strong style={{ color: '#059669', fontSize: '13px', fontVariantNumeric: 'tabular-nums' }}>
                      {confirmDispatchModal.orders?.length || 0} đơn hàng
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ color: '#475569', fontWeight: 500 }}>Đội ngũ tài xế khả dụng:</span>
                    <strong style={{ color: '#0f172a' }}>{GOVAP_DRIVERS.length} tài xế (Xe máy & Xe tải)</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#475569', fontWeight: 500 }}>Cơ chế tối ưu:</span>
                    <span style={{ color: '#0f172a', fontWeight: 500 }}>Gom cụm tọa độ + Tối ưu lộ trình VRP</span>
                  </div>
                </div>

                <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', padding: '10px 12px', marginBottom: '20px', display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '12px', color: '#166534', lineHeight: 1.45 }}>
                  <AlertCircle size={15} color="#166534" style={{ marginTop: '2px', flexShrink: 0 }} />
                  <span>
                    Hệ thống sẽ chạy thuật toán AI phân bổ tuyến đường tối ưu và tự động gán tài xế phù hợp cho các đơn hàng đã bàn giao. Bạn có muốn bắt đầu không?
                  </span>
                </div>
              </div>
            )}

            {/* Footer Buttons */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => !confirmActionLoading && setConfirmDispatchModal(null)}
                disabled={confirmActionLoading}
                style={{
                  padding: '9px 16px',
                  backgroundColor: '#ffffff',
                  color: '#475569',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 500,
                  cursor: confirmActionLoading ? 'not-allowed' : 'pointer',
                }}
              >
                Hủy Bỏ
              </button>

              <button
                type="button"
                onClick={handleExecuteConfirmModal}
                disabled={confirmActionLoading}
                style={{
                  padding: '9px 18px',
                  backgroundColor:
                    confirmDispatchModal.type === 'CONFIRM_DELIVERY' ? '#0f766e' :
                    confirmDispatchModal.type === 'HANDOVER_SINGLE' ? '#0284c7' :
                    confirmDispatchModal.type === 'HANDOVER_BATCH' ? '#0f766e' : '#059669',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: confirmActionLoading ? 'not-allowed' : 'pointer',
                  opacity: confirmActionLoading ? 0.7 : 1,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                }}
              >
                {confirmActionLoading ? (
                  <span>Đang xử lý...</span>
                ) : (
                  <>
                    {confirmDispatchModal.type === 'CONFIRM_DELIVERY' && (
                      <>
                        <CheckCircle2 size={14} color="#ffffff" />
                        <span>Xác Nhận Đã Giao</span>
                      </>
                    )}
                    {confirmDispatchModal.type === 'HANDOVER_SINGLE' && (
                      <>
                        <Truck size={14} color="#ffffff" />
                        <span>Xác Nhận Bàn Giao</span>
                      </>
                    )}
                    {confirmDispatchModal.type === 'HANDOVER_BATCH' && (
                      <>
                        <PackageCheck size={14} color="#ffffff" />
                        <span>Bàn Giao Tất Cả ({confirmDispatchModal.orders?.length || 0})</span>
                      </>
                    )}
                    {confirmDispatchModal.type === 'AUTO_DISPATCH' && (
                      <>
                        <Route size={14} color="#ffffff" />
                        <span>Bắt Đầu Phân Tuyến</span>
                      </>
                    )}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
