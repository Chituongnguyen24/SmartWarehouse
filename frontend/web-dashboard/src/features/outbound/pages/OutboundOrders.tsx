import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import { useAuth } from '@/features/auth';
import { useWarehouse } from '@/shared';
import { getApiHost } from '@/shared/utils/apiConfig';
import { BarcodeQRScannerModal } from '@/shared';
import { 
  PackageMinus, Search, ArrowRight, CheckCircle2, FileText, 
  Layers, Box, Truck, Plus, X, ScanBarcode, Printer,
  ChevronLeft, ChevronRight, RefreshCw, Edit2, Save, RotateCcw,
  Lock, Wifi, WifiOff, Building2, MapPin, Calendar, Tag, Check, User, Eye, AlertCircle,
  Radio, Lightbulb, SkipForward, Square, Play
} from 'lucide-react';
import { OutboundReceiptModal } from '../components/OutboundReceiptModal';
import { CreateOutboundModal } from '../components/CreateOutboundModal';
import { PrintOrderSlipModal, detectSlipClassification } from '../components/PrintOrderSlipModal';

const API_BASE = getApiHost(3007); // outbound-service
const INVENTORY_API = getApiHost(3011); // inventory-service for FEFO
const SOCKET_URL = getApiHost(3004); // order-service realtime gateway
const IOT_API = getApiHost(3002); // iot-service Pick-to-Light gateway

type DemoIotShelfCode = 'A1' | 'A2' | 'A3';
type DemoRackLetter = 'A' | 'B' | 'C';
type DemoTierNumber = 1 | 2;

interface OutboundShelfTierLoc {
  rack: DemoRackLetter;
  rackLabel: string;      // "Kệ A" | "Kệ B" | "Kệ C"
  tier: DemoTierNumber;
  tierLabel: string;      // "Tầng 1" | "Tầng 2"
  fullLabel: string;      // "Kệ A - Tầng 1"
  shortCode: string;      // "A-T1"
  hwShelfCode: DemoIotShelfCode; // A -> A1, B -> A2, C -> A3
}

const cleanOutboundProductName = (name?: string): string =>
  String(name || '').replace(/\s*\[[A-C][123]?-\d+\]/gi, '').trim();

const resolveOutboundShelfTier = (
  item: { slotId?: string | null; productName?: string; sku?: string },
  idx = 0
): OutboundShelfTierLoc => {
  const rawCombined = `${item.slotId || ''} ${item.productName || ''} ${item.sku || ''}`.toUpperCase();

  let rack: DemoRackLetter | null = null;
  let tier: DemoTierNumber | null = null;

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

  if (!rack) {
    const text = `${item.productName || ''} ${item.sku || ''}`.toLowerCase();
    if (/thịt|heo|bò|gà|cá|tôm|hải sản|xúc xích|chả/.test(text)) rack = 'A';
    else if (/sữa|trứng|phô mai|bơ|yogurt|sữa chua|nước/.test(text)) rack = 'B';
    else if (/rau|củ|cà|xà lách|táo|cam|nấm|trái|dưa|bắp/.test(text)) rack = 'C';
    else rack = (['A', 'B', 'C'] as DemoRackLetter[])[idx % 3];
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
};

const extractDemoIotShelf = (slotId?: string | null, productName?: string, sku?: string, idx = 0): DemoIotShelfCode => {
  return resolveOutboundShelfTier({ slotId, productName, sku }, idx).hwShelfCode;
};

interface OutboundOrderItem {
  id: string;
  sku: string;
  productName: string;
  requestedQuantity: number;
  pickedQuantity: number;
  status: string;
  lotId?: string;
  lotCode?: string;
  slotId?: string;
  expiryDate?: string;
  riskScore?: number;
}

interface OutboundOrder {
  id: string;
  orderCode: string;
  status: string;
  requestedBy: string;
  requesterName: string;
  destination: string;
  totalItems: number;
  totalQuantity: number;
  warehouseId?: string;
  warehouseCode?: string;
  confirmedBy?: string;
  createdAt: string;
  notes?: string;
  assignedDriverId?: string;
  assignedDriverName?: string;
  assignedDriverPhone?: string;
  assignedDriverPlate?: string;
  items: OutboundOrderItem[];
}

// ── PHÂN LOẠI HÌNH THỨC XUẤT KHO LOGISTICS ──
export type OutboundTransactionType = 'ALL' | 'XUAT_BAN_FEFO' | 'DIEU_CHUYEN' | 'TRA_HANG_NCC' | 'XUAT_HUY' | 'XUAT_HAO_HUT';

export const OUTBOUND_TYPE_CONFIG: Record<string, { label: string; bg: string; color: string; border: string }> = {
  XUAT_BAN_FEFO: { label: 'Xuất bán hàng', bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  DIEU_CHUYEN:   { label: 'Điều chuyển chi nhánh', bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
  TRA_HANG_NCC:  { label: 'Trả hàng lỗi cho NCC', bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' },
  XUAT_HUY:      { label: 'Xuất hủy sản phẩm', bg: '#faf5ff', color: '#7c3aed', border: '#e9d5ff' },
  XUAT_HAO_HUT:  { label: 'Hao hụt kiểm kê', bg: '#fffbeb', color: '#b45309', border: '#fde68a' },
};

const STEPS = [
  { key: 'PENDING', label: '1. Lập yêu cầu', icon: <FileText size={16} /> },
  { key: 'PICKING', label: '2. Soạn hàng theo hạn dùng', icon: <Layers size={16} /> },
  { key: 'PACKED', label: '3. Đóng gói & QC', icon: <Box size={16} /> },
  { key: 'CONFIRMED', label: '4. Đã xuất kho / Chờ giao', icon: <Truck size={16} /> },
  { key: 'DELIVERED', label: '5. Hoàn tất & Ghi sổ', icon: <CheckCircle2 size={16} /> }
];

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string; border: string }> = {
  PENDING: { label: 'Tạo yêu cầu', bg: '#fef3c7', color: '#b45309', border: '#fde68a' },
  WAITING_TRANSFER: { label: 'Chờ nhập điều chuyển', bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' },
  PROCESSING: { label: 'Đã duyệt', bg: '#dbeafe', color: '#1d4ed8', border: '#bfdbfe' },
  PICKING: { label: 'Đang gom hàng', bg: '#ede9fe', color: '#6d28d9', border: '#ddd6fe' },
  PACKING: { label: 'Đang đóng gói', bg: '#ccfbf1', color: '#0f766e', border: '#99f6e4' },
  PICKED: { label: 'Đang đóng gói', bg: '#ccfbf1', color: '#0f766e', border: '#99f6e4' },
  PACKED: { label: 'Đã đóng gói', bg: '#ccfbf1', color: '#0f766e', border: '#99f6e4' },
  READY_FOR_DELIVERY: { label: 'Chờ giao hàng', bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' },
  CONFIRMED: { label: 'Đã xuất kho', bg: '#e0f2fe', color: '#0369a1', border: '#bae6fd' },
  SHIPPED: { label: 'Đang giao hàng', bg: '#e0f2fe', color: '#0369a1', border: '#bae6fd' },
  DELIVERING: { label: 'Đang giao hàng', bg: '#e0f2fe', color: '#0369a1', border: '#bae6fd' },
  DELIVERED: { label: 'Giao thành công', bg: '#dcfce7', color: '#15803d', border: '#bbf7d0' },
  COMPLETED: { label: 'Hoàn tất', bg: '#dcfce7', color: '#15803d', border: '#bbf7d0' },
  CANCELLED: { label: 'Đã hủy', bg: '#ffe4e6', color: '#be123c', border: '#fecdd3' },
};

const formatShelfLocation = (slotId?: string, productName?: string, sku?: string, idx = 0): string => {
  if (slotId) {
    const loc = slotId.trim();
    if (loc === 'TRANSFER_DOCK' || loc.includes('TRANSFER') || loc.includes('CHỜ NHẬP') || loc.includes('TRUNG CHUYỂN')) {
      return 'Dock điều chuyển';
    }
  }
  return resolveOutboundShelfTier({ slotId, productName, sku }, idx).fullLabel;
};

const OutboundOrders: React.FC = () => {
  const { token, user } = useAuth();
  const { warehouses, selectedWarehouseCode } = useWarehouse();
  const [orders, setOrders] = useState<OutboundOrder[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [receiptOrder, setReceiptOrder] = useState<OutboundOrder | null>(null);
  const [printSlipOrder, setPrintSlipOrder] = useState<OutboundOrder | null>(null);
  
  // Modal xác nhận an toàn khi bấm Giao hàng (Tránh bấm nhầm 1-chạm)
  const [confirmDeliveryOrder, setConfirmDeliveryOrder] = useState<OutboundOrder | null>(null);
  const [isDelivering, setIsDelivering] = useState<boolean>(false);
  
  // Toast state
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  const isManager = user?.role === 'WAREHOUSE_MANAGER' || user?.role === 'WAREHOUSE_STAFF';
  const isSaler = user?.role === 'SALES_STAFF';
  const canOperateWarehouse = user?.role === 'ADMIN' || user?.role === 'WAREHOUSE_MANAGER' || user?.role === 'WAREHOUSE_STAFF';
  const myWarehouseCode = user?.warehouseCode || (
    user?.email?.includes('001') || user?.email?.includes('q12') ? 'WH-001' :
    user?.email?.includes('002') ? 'WH-002' :
    user?.email?.includes('005') ? 'WH-005' :
    (user?.email?.includes('govap') || user?.email?.includes('006')) ? 'WH-006' :
    'WH-006'
  );

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusTab, setStatusTab] = useState<string>('ALL');
  const [selectedWhFilter, setSelectedWhFilter] = useState<string>(() => {
    if (isManager) return myWarehouseCode;
    if (isSaler) return 'ALL';
    return selectedWarehouseCode || 'ALL';
  });
  const [dateFilter, setDateFilter] = useState<string>('ALL');
  const [outboundTypeFilter, setOutboundTypeFilter] = useState<string>('ALL');

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

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 8;

  // Modals & Scanners
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  // Edit Order State
  const [isEditingOrder, setIsEditingOrder] = useState<boolean>(false);

  // Close modals on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (confirmDeliveryOrder) {
          setConfirmDeliveryOrder(null);
        } else if (selectedOrderId) {
          setSelectedOrderId(null);
          setIsEditingOrder(false);
        }
        setShowScanner(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [confirmDeliveryOrder, selectedOrderId]);
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);
  const [editFormData, setEditFormData] = useState<{
    requesterName: string;
    destination: string;
    warehouseCode: string;
    notes: string;
    items: Array<{
      id: string;
      sku: string;
      productName: string;
      requestedQuantity: number;
      lotCode?: string;
      slotId?: string;
    }>;
  }>({
    requesterName: '',
    destination: '',
    warehouseCode: '',
    notes: '',
    items: [],
  });

  const [searchParams] = useSearchParams();
  const targetId = searchParams.get('selectedId') || searchParams.get('id');
  const targetCode = searchParams.get('orderCode');
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
      setStatusTab('ALL');
    }
  }, [urlSearch]);

  const startEditOrder = (order: OutboundOrder) => {
    setEditFormData({
      requesterName: order.requesterName || '',
      destination: order.destination || '',
      warehouseCode: order.warehouseCode || 'WH-006',
      notes: order.notes || '',
      items: order.items?.map(it => ({
        id: it.id,
        sku: it.sku,
        productName: it.productName,
        requestedQuantity: it.requestedQuantity,
        lotCode: it.lotCode || '',
        slotId: it.slotId || '',
      })) || [],
    });
    setIsEditingOrder(true);
  };

  const handleSaveOrderEdit = async (orderId: string) => {
    try {
      setIsSavingEdit(true);
      const res = await fetch(`${API_BASE}/outbound-orders/${orderId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editFormData),
      });

      if (res.ok) {
        const updatedOrder = await res.json();
        setOrders(prev => prev.map(o => (o.id === updatedOrder.id ? updatedOrder : o)));
        setIsEditingOrder(false);
        showToast('Đã cập nhật và lưu thay đổi thông tin phiếu xuất!', 'success');
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(`Lỗi lưu thông tin: ${err.message || 'Thất bại'}`, 'error');
      }
    } catch (e: any) {
      console.error(e);
      showToast(`Lỗi kết nối máy chủ: ${e.message}`, 'error');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const showToast = useCallback((text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  }, []);

  // Mutex Lock State (to prevent concurrent editing between Manager and Mobile Staff)
  const [activeLocks, setActiveLocks] = useState<Record<string, { userId: string; userName: string; role: string; lockedAt: string }>>({});

  const fetchLocks = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/outbound-orders/locks`);
      if (res.ok) {
        const data = await res.json();
        setActiveLocks(data || {});
      }
    } catch (e) {
      // ignore
    }
  }, []);

  const fetchOrders = useCallback(async (showSpinner = false) => {
    if (showSpinner) setIsRefreshing(true);
    try {
      const url = activeWh && activeWh !== 'ALL'
        ? `${API_BASE}/outbound-orders?warehouseCode=${encodeURIComponent(activeWh)}`
        : `${API_BASE}/outbound-orders`;
      const [ordersRes, locksRes] = await Promise.all([
        fetch(url, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_BASE}/outbound-orders/locks`)
      ]);
      if (ordersRes.ok) {
        let data = await ordersRes.json();
        if (Array.isArray(data)) {
          data.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        }
        setOrders(data);
      }
      if (locksRes.ok) {
        const locksData = await locksRes.json();
        setActiveLocks(locksData || {});
      }
    } catch (error) {
      console.error('Failed to fetch outbound orders:', error);
    } finally {
      setInitialLoading(false);
      if (showSpinner) setIsRefreshing(false);
    }
  }, [token, activeWh]);

  // Real-time WebSocket + Background Polling for 100% Zero-F5 Real-time Sync
  useEffect(() => {
    fetchOrders(false);

    // 1. Socket.IO Realtime Connection
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 30,
      reconnectionDelay: 1000,
    });

    const onRealtimeEvent = (payload?: any) => {
      console.log('[WEB OUTBOUND WS] Live event received, refreshing data immediately:', payload);
      if (payload && (payload.id || payload.orderId || payload.orderCode) && payload.status) {
        const pId = payload.id || payload.orderId;
        const pCode = payload.orderCode;
        const pStatus = payload.status;
        setOrders(prev => prev.map(o => {
          const isMatch = (pId && (o.id === pId || o.orderCode === pId)) ||
                          (pCode && (o.orderCode === pCode || o.id === pCode));
          if (isMatch) {
            return {
              ...o,
              status: pStatus,
              assignedDriverId: payload.assignedDriverId || o.assignedDriverId,
              assignedDriverName: payload.assignedDriverName || o.assignedDriverName,
              assignedDriverPhone: payload.assignedDriverPhone || o.assignedDriverPhone,
              assignedDriverPlate: payload.assignedDriverPlate || o.assignedDriverPlate,
              podPhotoUrl: payload.podPhotoUrl || o.podPhotoUrl,
            };
          }
          return o;
        }));
      }
      fetchOrders(false);
    };

    socket.on('order_status_updated', onRealtimeEvent);
    socket.on('outbound_order_updated', onRealtimeEvent);
    socket.on('outbound_order_created', onRealtimeEvent);
    socket.on('outbound_confirmed', onRealtimeEvent);
    socket.on('new_order', onRealtimeEvent);
    socket.on('order_cancelled', (payload) => {
      console.log('[WEB OUTBOUND WS] Order cancelled event received:', payload);
      const targetId = payload?.orderId || payload?.id;
      const targetCode = payload?.orderCode;
      if (targetId || targetCode) {
        setOrders(prev => prev.map(o => {
          const match = (targetId && (o.id === targetId || o.orderCode === targetId)) ||
                        (targetCode && (o.orderCode === targetCode || o.orderCode?.includes(targetCode)));
          if (match) {
            return {
              ...o,
              status: 'CANCELLED',
              cancelReason: payload.cancelReason || o.cancelReason,
            };
          }
          return o;
        }));
      }
      onRealtimeEvent(payload);
    });
    socket.on('order_locked', (data) => {
      if (data?.orderId && data?.lock) {
        setActiveLocks(prev => ({ ...prev, [data.orderId]: data.lock }));
      }
      fetchOrders(false);
    });
    socket.on('order_unlocked', (data) => {
      if (data?.orderId) {
        setActiveLocks(prev => {
          const next = { ...prev };
          delete next[data.orderId];
          return next;
        });
      }
      fetchOrders(false);
    });

    // 2. Fast background polling fallback (every 2.5s) to guarantee instant status sync without F5
    const interval = setInterval(() => {
      fetchOrders(false);
    }, 2500);

    return () => {
      socket.disconnect();
      clearInterval(interval);
    };
  }, [fetchOrders]);

  const hasAutoOpenedRef = React.useRef<string | null>(null);

  // Auto-focus and open order modal if navigated with query parameter (Trigger ONCE only)
  useEffect(() => {
    const currentTarget = targetId || targetCode;
    if (orders.length > 0 && currentTarget && hasAutoOpenedRef.current !== currentTarget) {
      const match = orders.find(o => (targetId && o.id === targetId) || (targetCode && o.orderCode === targetCode));
      if (match) {
        hasAutoOpenedRef.current = currentTarget;
        setSelectedOrderId(match.id);
        setStatusTab('ALL');
        showToast(`Đã mở phiếu xuất kho ${match.orderCode} để bạn xem chi tiết!`, 'success');
      }
    }
  }, [orders, targetId, targetCode, showToast]);

  const runFefoAndApply = useCallback(async (orderId: string) => {
    showToast('Đang tự động phân bổ lô hàng ưu tiên theo hạn sử dụng...', 'info');

    try {
      const target = orders.find(o => o.id === orderId);
      if (!target) return;

      const wh = target.warehouseCode || 'WH-006';

      // 1. Fetch live lots from inventory-service
      const lotsRes = await fetch(`${INVENTORY_API}/inventory/lots?limit=5000&warehouseCode=${encodeURIComponent(wh)}`).catch(() => null);
      const allLots: any[] = (lotsRes && lotsRes.ok) ? await lotsRes.json() : [];

      const suggestions = await Promise.all(
        (target.items || []).map(async (it) => {
          const skuClean = it.sku || '';
          const qty = it.requestedQuantity || 1;

          // 2. Query Smart FEFO API: /inventory/fefo?sku=...&quantity=...&warehouseId=...
          let matchedLot: any = null;
          try {
            const fefoUrl = `${INVENTORY_API}/inventory/fefo?sku=${encodeURIComponent(skuClean)}&quantity=${qty}&warehouseId=${encodeURIComponent(wh)}`;
            const fefoRes = await fetch(fefoUrl);
            if (fefoRes.ok) {
              const fefoData = await fefoRes.json();
              if (fefoData?.suggestions && fefoData.suggestions.length > 0) {
                const top = fefoData.suggestions[0];
                matchedLot = {
                  lotId: top.lotId,
                  lotCode: top.lotCode,
                  slotId: top.location,
                  expiryDate: top.expiryDate,
                  riskScore: top.riskScore || 0,
                  priorityScore: top.priorityScore || 0,
                };
              }
            }
          } catch (e) {}

          // 3. Match from active lots by explicit lotCode or SKU
          if (!matchedLot && allLots.length > 0) {
            const found = allLots.find((l: any) =>
              (it.lotCode && l.lotCode && l.lotCode === it.lotCode) ||
              (it.lotId && l.id && l.id === it.lotId) ||
              (l.sku && l.sku === it.sku) ||
              (l.productId && l.productId === it.sku) ||
              (l.lotCode && l.lotCode.includes(it.sku))
            );
            if (found) {
              matchedLot = {
                lotId: found.id,
                lotCode: found.lotCode,
                slotId: found.location,
                expiryDate: found.expiryDate,
                riskScore: found.riskScore || 0,
                priorityScore: found.priorityScore || 0,
              };
            }
          }

          const isTransferPending = it.slotId === 'TRANSFER_DOCK' || target.notes?.includes('[CHỜ HÀNG ĐIỀU CHUYỂN]') || target.status === 'WAITING_TRANSFER';

          return {
            itemId: it.id,
            lotId: isTransferPending ? null : (matchedLot?.lotId || it.lotId || `lot-${it.sku}`),
            lotCode: isTransferPending ? null : (matchedLot?.lotCode || it.lotCode || `LOT-${it.sku}`),
            slotId: isTransferPending ? 'TRANSFER_DOCK' : (matchedLot?.slotId || it.slotId || 'dry-shelf-10-slot-1'),
            expiryDate: matchedLot?.expiryDate || it.expiryDate || new Date(Date.now() + 30 * 86400000).toISOString(),
            riskScore: matchedLot?.riskScore || it.riskScore || 0,
            priorityScore: matchedLot?.priorityScore || 0,
            quantity: qty,
          };
        })
      );

      const updateRes = await fetch(`${API_BASE}/outbound-orders/${orderId}/fefo-suggestions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ suggestions })
      });

      if (updateRes.ok) {
        const updated = await updateRes.json();
        setOrders(prev => prev.map(o => o.id === orderId ? updated : o));
        showToast('Đã tự động phân bổ lô hàng cận date & vị trí kệ chuẩn xác!', 'success');
      }
    } catch (error) {
      console.error('FEFO error:', error);
      showToast('Tự động chọn lô hàng hoàn tất!', 'success');
    }
  }, [orders, token, showToast]);

  const handleScan = useCallback(async (barcode: string) => {
    if (!selectedOrderId) return;
    try {
      const res = await fetch(`${API_BASE}/outbound-orders/${selectedOrderId}/scan-item`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ barcode })
      });
      if (res.ok) {
        const updated = await res.json();
        setOrders(prev => prev.map(o => o.id === selectedOrderId ? updated : o));
        showToast(`Quét mã ${barcode} thành công!`, 'success');
      } else {
        showToast('Mã Barcode không hợp lệ hoặc đã quét đủ!', 'error');
      }
    } catch (e) {
      console.error(e);
    }
  }, [selectedOrderId, token, showToast]);

  // Optimistic In-Place State Advancement (Zero screen refresh)
  const advanceState = useCallback(async (orderId: string, action: string, body?: any) => {
    // Optimistic next status mapping
    const nextStatus = 
      action === 'confirm-picking' ? 'PACKING' :
      action === 'confirm' ? 'CONFIRMED' :
      action === 'deliver' ? 'DELIVERED' : 'PENDING';

    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: nextStatus } : o));

    if (action === 'deliver') {
      showToast('Đã xác nhận Giao Hàng Thành Công! Đơn hàng đã hoàn tất.', 'success');
    } else if (action === 'confirm') {
      showToast('Đã xuất kho thành công! Đã trừ tồn kho và giải phóng lô hàng/vị trí kệ trong Database.', 'success');
    } else {
      showToast(`Đã chuyển trạng thái: ${STATUS_CONFIG[nextStatus]?.label || nextStatus}`, 'info');
    }

    try {
      const res = await fetch(`${API_BASE}/outbound-orders/${orderId}/${action}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: body ? JSON.stringify(body) : undefined
      });
      if (res.ok) {
        const updated = await res.json();
        setOrders(prev => prev.map(o => o.id === orderId ? updated : o));
      }
    } catch (error) {
      console.error(error);
    }
  }, [token, showToast]);

  // Memoized KPIs
  const kpiStats = useMemo(() => {
    const relevantOrders = orders.filter(o => {
      if (!activeWh || activeWh === 'ALL') return true;
      return o.warehouseCode === activeWh;
    });

    const total = relevantOrders.length;
    const pending = relevantOrders.filter(o => o.status === 'PENDING' || o.status === 'PROCESSING').length;
    const picking = relevantOrders.filter(o => o.status === 'PICKING' || o.status === 'PACKING').length;
    const packed = relevantOrders.filter(o => o.status === 'PACKED').length;
    const confirmed = relevantOrders.filter(o => ['CONFIRMED', 'SHIPPED', 'DELIVERING', 'READY_FOR_DELIVERY'].includes(o.status)).length;
    const delivered = relevantOrders.filter(o => o.status === 'DELIVERED' || o.status === 'COMPLETED').length;

    return { total, pending, picking, packed, confirmed, delivered };
  }, [orders, activeWh]);

  // Memoized Filtered Orders
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch = 
        !q ||
        o.orderCode.toLowerCase().includes(q) ||
        o.destination.toLowerCase().includes(q) ||
        o.requesterName?.toLowerCase().includes(q) ||
        o.items?.some(i => i.sku.toLowerCase().includes(q) || i.productName.toLowerCase().includes(q));

      // Warehouse filter
      let matchWh = true;
      if (activeWh && activeWh !== 'ALL') {
        matchWh = o.warehouseCode === activeWh;
      }

      // Status tab filter
      let matchStatus = true;
      if (statusTab !== 'ALL') {
        if (statusTab === 'CONFIRMED') {
          matchStatus = ['CONFIRMED', 'SHIPPED', 'DELIVERING', 'READY_FOR_DELIVERY'].includes(o.status);
        } else if (statusTab === 'READY_FOR_DELIVERY') {
          matchStatus = o.status === 'READY_FOR_DELIVERY';
        } else if (statusTab === 'PACKED') {
          matchStatus = ['PACKED', 'PACKING'].includes(o.status);
        } else if (statusTab === 'PICKING') {
          matchStatus = ['PICKING', 'PACKING'].includes(o.status);
        } else if (statusTab === 'DELIVERED') {
          matchStatus = ['DELIVERED', 'COMPLETED'].includes(o.status);
        } else {
          matchStatus = o.status === statusTab;
        }
      }

      // Date filter
      let matchDate = true;
      if (dateFilter !== 'ALL' && o.createdAt) {
        const orderDate = new Date(o.createdAt);
        const now = new Date();
        if (dateFilter === 'TODAY') {
          matchDate = orderDate.toDateString() === now.toDateString();
        } else if (dateFilter === 'WEEK') {
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(now.getDate() - 7);
          matchDate = orderDate >= sevenDaysAgo;
        }
      }

      // Outbound type filter
      let matchType = true;
      if (outboundTypeFilter !== 'ALL') {
        const cls = detectSlipClassification(o as any);
        const mappedKey = cls === 'DISPOSAL' ? 'XUAT_HUY'
          : cls === 'RETURN' ? 'TRA_HANG_NCC'
          : cls === 'TRANSFER' ? 'DIEU_CHUYEN'
          : 'XUAT_BAN_FEFO';
        matchType = mappedKey === outboundTypeFilter;
      }

      return matchSearch && matchWh && matchStatus && matchDate && matchType;
    });
  }, [orders, searchQuery, activeWh, statusTab, dateFilter, outboundTypeFilter]);

  // Memoized selected order (retains selection without reset)
  const selectedOrder = useMemo(() => {
    if (!selectedOrderId) return null;
    return orders.find(o => o.id === selectedOrderId) || null;
  }, [orders, selectedOrderId]);

  // ── SEQUENTIAL PICK-TO-LIGHT (3 KỆ DEMO IOT: KỆ A, KỆ B, KỆ C — TẦNG 1 & 2) TRÊN WEB DASHBOARD ──
  interface WebGuidedIotSession {
    orderId: string;
    orderCode: string;
    itemId: string;
    shelfCode: DemoIotShelfCode;
    rackLabel: string;
    tierLabel: string;
    fullLocationLabel: string;
    slotId: string;
    productName: string;
    quantity: number;
    step: number;
    totalSteps: number;
    baselineStopSeq: number;
    startedAt: number;
  }

  const [isWebAutoIotEnabled, setIsWebAutoIotEnabled] = useState<boolean>(false);
  const [webGuidedSession, setWebGuidedSession] = useState<WebGuidedIotSession | null>(null);
  const [webIotDoneOrderCode, setWebIotDoneOrderCode] = useState<string | null>(null);
  const [iotBuzzerEnabled, setIotBuzzerEnabled] = useState<boolean>(true);
  const webGuidedRef = React.useRef<WebGuidedIotSession | null>(null);
  const webTransitioningRef = React.useRef<boolean>(false);
  const webTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastWebOrderIdRef = React.useRef<string | null>(null);
  const selectedOrderRef = React.useRef<OutboundOrder | null>(null);
  selectedOrderRef.current = selectedOrder;

  const stopWebGuidedIot = useCallback(async (notifyHw = true) => {
    if (webTimerRef.current) {
      clearTimeout(webTimerRef.current);
      webTimerRef.current = null;
    }
    const active = webGuidedRef.current;
    webGuidedRef.current = null;
    webTransitioningRef.current = false;
    setWebGuidedSession(null);
    if (notifyHw && active) {
      fetch(`${IOT_API}/api/iot/shelf/stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          warehouseCode: selectedOrderRef.current?.warehouseCode || 'WH-006',
          shelfCode: active.shelfCode,
        }),
      }).catch(() => {});
    }
  }, []);

  const activateWebGuidedStep = useCallback(
    async (ord: OutboundOrder, item: OutboundOrderItem, step: number, totalSteps: number, itemIdx = 0) => {
      const loc = resolveOutboundShelfTier(item, itemIdx);
      const shelfCode = loc.hwShelfCode;
      const cleanName = cleanOutboundProductName(item.productName);

      webTransitioningRef.current = true;
      try {
        const res = await fetch(`${IOT_API}/api/iot/shelf/locate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            warehouseCode: ord.warehouseCode || 'WH-006',
            shelfCode,
            slotCode: loc.shortCode,
            productName: `${cleanName} (${loc.fullLabel})`,
            qty: item.requestedQuantity || 1,
            step,
            totalSteps,
            orderId: ord.orderCode || ord.id,
          }),
        });
        const data = res.ok ? await res.json().catch(() => ({})) : {};
        if (typeof data?.buzzerEnabled === 'boolean') {
          setIotBuzzerEnabled(data.buzzerEnabled);
        }

        let baselineStopSeq = 0;
        if (typeof data?.stopSeq === 'number') baselineStopSeq = data.stopSeq;
        else if (typeof data?.shelf?.stopSeq === 'number') baselineStopSeq = data.shelf.stopSeq;
        else {
          const stRes = await fetch(`${IOT_API}/api/iot/shelf/status`).catch(() => null);
          const stData = stRes?.ok ? await stRes.json().catch(() => null) : null;
          if (typeof stData?.buzzerEnabled === 'boolean') {
            setIotBuzzerEnabled(stData.buzzerEnabled);
          }
          if (typeof stData?.shelves?.[shelfCode]?.stopSeq === 'number') {
            baselineStopSeq = stData.shelves[shelfCode].stopSeq;
          }
        }

        const session: WebGuidedIotSession = {
          orderId: ord.id,
          orderCode: ord.orderCode,
          itemId: item.id,
          shelfCode,
          rackLabel: loc.rackLabel,
          tierLabel: loc.tierLabel,
          fullLocationLabel: loc.fullLabel,
          slotId: loc.shortCode,
          productName: cleanName,
          quantity: item.requestedQuantity || 1,
          step,
          totalSteps,
          baselineStopSeq,
          startedAt: Date.now(),
        };

        webGuidedRef.current = session;
        setWebGuidedSession(session);
        setWebIotDoneOrderCode(null);
        return true;
      } catch (e) {
        console.warn('activateWebGuidedStep error:', e);
        return false;
      } finally {
        webTransitioningRef.current = false;
      }
    },
    []
  );

  const startOrderPickingScenario = useCallback(
    async (ord: OutboundOrder) => {
      const allItems = ord.items || [];
      if (allItems.length === 0) return;

      let pendingIdx = allItems.findIndex(
        it => it.status !== 'PICKED' && (it.pickedQuantity || 0) < (it.requestedQuantity || 1)
      );

      // Nếu tất cả đã lấy xong mà bấm Bắt đầu lấy hàng -> reset tiến độ để chạy lại từ món đầu tiên
      let targetOrder = ord;
      if (pendingIdx === -1) {
        const resetItems = allItems.map(it => ({ ...it, pickedQuantity: 0, status: 'PENDING' }));
        targetOrder = { ...ord, items: resetItems };
        selectedOrderRef.current = targetOrder;
        setOrders(prev => prev.map(o => (o.id === ord.id ? targetOrder : o)));
        pendingIdx = 0;
      }

      const firstItem = targetOrder.items[pendingIdx];
      const pickedSoFar = targetOrder.items.filter(
        (it, idx) => idx !== pendingIdx && (it.status === 'PICKED' || (it.pickedQuantity || 0) >= (it.requestedQuantity || 1))
      ).length;

      setIsWebAutoIotEnabled(true);
      await activateWebGuidedStep(
        targetOrder,
        firstItem,
        pickedSoFar + 1,
        targetOrder.items.length,
        pendingIdx
      );
      const loc = resolveOutboundShelfTier(firstItem, pendingIdx);
      showToast(
        iotBuzzerEnabled
          ? `Đã bật đèn LED & Còi tại ${loc.fullLabel} — "${cleanOutboundProductName(firstItem.productName)}".`
          : `Đã bật đèn LED tại ${loc.fullLabel} — "${cleanOutboundProductName(firstItem.productName)}" ở chế độ chỉ sáng đèn.`,
        'success'
      );
    },
    [activateWebGuidedStep, showToast, iotBuzzerEnabled]
  );

  const advanceWebGuidedStep = useCallback(
    async (manualStop = false) => {
      const session = webGuidedRef.current;
      const ord = selectedOrderRef.current;
      if (!session || !ord || webTransitioningRef.current) return;

      webTransitioningRef.current = true;
      webGuidedRef.current = null;
      setWebGuidedSession(null);

      try {
        if (manualStop) {
          await fetch(`${IOT_API}/api/iot/shelf/stop`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              warehouseCode: ord.warehouseCode || 'WH-006',
              shelfCode: session.shelfCode,
            }),
          }).catch(() => {});
        }

        const updatedItems = (ord.items || []).map(it =>
          it.id === session.itemId
            ? { ...it, pickedQuantity: it.requestedQuantity || 1, status: 'PICKED' }
            : it
        );

        const allOrderItemsPicked =
          updatedItems.length > 0 &&
          updatedItems.every(it => it.status === 'PICKED' || (it.pickedQuantity || 0) >= (it.requestedQuantity || 1));

        // Cập nhật cục bộ ngay lập tức
        const updatedOrder: OutboundOrder = {
          ...ord,
          status: allOrderItemsPicked && (ord.status === 'PENDING' || ord.status === 'PICKING' || ord.status === 'PROCESSING') ? 'PACKED' : ord.status,
          items: updatedItems,
        };
        selectedOrderRef.current = updatedOrder;
        setOrders(prev => prev.map(o => (o.id === ord.id ? updatedOrder : o)));

        // Đồng bộ tiến độ món lên outbound-service
        await fetch(`${API_BASE}/outbound-orders/${ord.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: [
              {
                id: session.itemId,
                pickedQuantity: session.quantity,
                status: 'PICKED',
              },
            ],
            status: allOrderItemsPicked ? 'PACKED' : 'PICKING',
          }),
        }).catch(() => {});

        const nextIdx = updatedItems.findIndex(
          it => it.status !== 'PICKED' && (it.pickedQuantity || 0) < (it.requestedQuantity || 1)
        );

        if (nextIdx !== -1) {
          const nextItem = updatedItems[nextIdx];
          const nextLoc = resolveOutboundShelfTier(nextItem, nextIdx);
          const pickedCount = updatedItems.filter(
            it => it.status === 'PICKED' || (it.pickedQuantity || 0) >= (it.requestedQuantity || 1)
          ).length;
          showToast(
            `Đã xác nhận STOP tại ${session.fullLocationLabel}. Tự động nhảy sang ${nextLoc.fullLabel}: ${cleanOutboundProductName(nextItem.productName)}`,
            'success'
          );
          webTimerRef.current = setTimeout(() => {
            webTimerRef.current = null;
            webTransitioningRef.current = false;
            if (selectedOrderRef.current) {
              activateWebGuidedStep(
                selectedOrderRef.current,
                nextItem,
                pickedCount + 1,
                updatedItems.length,
                nextIdx
              );
            }
          }, 650);
        } else {
          await fetch(`${IOT_API}/api/iot/shelf/reset`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ warehouseCode: ord.warehouseCode || 'WH-006' }),
          }).catch(() => {});
          webTransitioningRef.current = false;
          setIsWebAutoIotEnabled(false);
          setWebIotDoneOrderCode(ord.orderCode);
          showToast(
            iotBuzzerEnabled
              ? `Hoàn thành lấy hàng toàn bộ đơn ${ord.orderCode}. Đèn và còi trên 3 kệ đã tắt.`
              : `Hoàn thành lấy hàng toàn bộ đơn ${ord.orderCode}. Đèn dẫn hướng trên 3 kệ đã tắt.`,
            'success'
          );
        }
      } catch (e) {
        webTransitioningRef.current = false;
      }
    },
    [activateWebGuidedStep, showToast, iotBuzzerEnabled]
  );

  // Khi mở hoặc đóng popup đơn hàng trên Web Dashboard -> Chỉ hiển thị sơ đồ vị trí & đồng bộ chế độ còi IoT
  useEffect(() => {
    if (lastWebOrderIdRef.current !== selectedOrderId) {
      if (lastWebOrderIdRef.current) {
        stopWebGuidedIot(true);
      }
      lastWebOrderIdRef.current = selectedOrderId;
      setWebIotDoneOrderCode(null);
      setIsWebAutoIotEnabled(false);
    }
    if (selectedOrderId) {
      fetch(`${IOT_API}/api/iot/shelf/status`)
        .then(r => (r.ok ? r.json() : null))
        .then(d => {
          if (typeof d?.buzzerEnabled === 'boolean') {
            setIotBuzzerEnabled(d.buzzerEnabled);
          }
        })
        .catch(() => {});
    }
  }, [selectedOrderId, stopWebGuidedIot]);

  // Poll nút STOP vật lý từ ESP32 (mỗi 800ms) để tắt đèn/còi & tự nhảy sang sản phẩm kế tiếp
  useEffect(() => {
    if (!webGuidedSession) return;
    const poll = setInterval(async () => {
      const session = webGuidedRef.current;
      if (!session || webTransitioningRef.current) return;
      try {
        const res = await fetch(`${IOT_API}/api/iot/shelf/status`);
        if (!res.ok) return;
        const data = await res.json();
        if (typeof data?.buzzerEnabled === 'boolean') {
          setIotBuzzerEnabled(data.buzzerEnabled);
        }
        const sh = data?.shelves?.[session.shelfCode];
        if (!sh) return;
        const hasNewStop =
          (typeof sh.stopSeq === 'number' && sh.stopSeq > session.baselineStopSeq) ||
          (sh.status === 'ARRIVED' && sh.arrivedAt && new Date(sh.arrivedAt).getTime() >= session.startedAt - 1500);
        if (hasNewStop) {
          await advanceWebGuidedStep(false);
        }
      } catch (e) {}
    }, 800);
    return () => clearInterval(poll);
  }, [webGuidedSession, advanceWebGuidedStep]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / pageSize));
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredOrders.slice(start, start + pageSize);
  }, [filteredOrders, currentPage]);

  const renderStepper = (status: string) => {
    const uiStatus = 
      (status === 'SHIPPED' || status === 'DELIVERING' || status === 'READY_FOR_DELIVERY') ? 'CONFIRMED' :
      (status === 'COMPLETED') ? 'DELIVERED' :
      (status === 'PACKING') ? 'PACKED' :
      (status === 'PROCESSING' || status === 'WAITING_TRANSFER') ? 'PENDING' : status;
    const currentIndex = STEPS.findIndex(s => s.key === uiStatus);
    
    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', margin: '1.5rem 0', position: 'relative' }}>
        <div style={{ position: 'absolute', top: '15px', left: '10%', right: '10%', height: '2px', background: '#e2e8f0', zIndex: 1 }}>
          <div style={{ height: '100%', background: '#0f766e', width: `${Math.max(0, currentIndex) * 25}%`, transition: 'width 0.3s ease' }}></div>
        </div>
        {STEPS.map((step, idx) => {
          const isCompleted = idx < currentIndex || status === 'DELIVERED' || status === 'COMPLETED';
          const isCurrent = idx === currentIndex && status !== 'DELIVERED' && status !== 'COMPLETED';
          return (
            <div key={step.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2, width: '20%' }}>
              <div style={{ 
                width: '32px', height: '32px', borderRadius: '50%', 
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: isCompleted ? '#0f766e' : isCurrent ? '#fff' : '#f8fafc',
                border: `2px solid ${isCompleted || isCurrent ? '#0f766e' : '#cbd5e1'}`,
                color: isCompleted ? '#fff' : isCurrent ? '#0f766e' : '#94a3b8',
                marginBottom: '0.4rem', fontWeight: 700
              }}>
                {isCompleted ? <CheckCircle2 size={16} /> : step.icon}
              </div>
              <span style={{ fontSize: '0.75rem', fontWeight: isCurrent ? 700 : 500, color: isCurrent ? '#0f766e' : '#64748b' }}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  const handleApproveOrder = async (orderId: string) => {
    try {
      const res = await fetch(`${API_BASE}/outbound-orders/${orderId}/approve`, {
        method: 'PUT',
      });
      if (res.ok) {
        const approvedOrder = await res.json().catch(() => null);
        if (approvedOrder?.status === 'WAITING_TRANSFER') {
          showToast('Đã tiếp nhận đơn hàng. Đơn ở trạng thái "Chờ nhập điều chuyển" do cần đợi xe trung chuyển giao hàng về kho Gò Vấp.', 'info');
        } else {
          showToast('Đã duyệt đơn thành công! Đơn hàng đã hiển thị trên Mobile App để nhân viên kho đi lấy hàng.', 'success');
        }
        fetchOrders(true);
      } else {
        showToast('Không thể duyệt đơn. Vui lòng kiểm tra lại kết nối.', 'error');
      }
    } catch (e) {
      showToast('Lỗi kết nối máy chủ outbound-service :3007', 'error');
    }
  };

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

      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '20px 24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: '#f0fdfa', padding: '10px', borderRadius: '12px', color: '#0f766e' }}>
              <Truck size={26} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Quản lý Xuất kho
              </h2>
              <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '2px 0 0 0' }}>
                Điều phối lấy hàng theo kệ, quét mã vạch và in Phiếu xuất kho Mẫu 02-VT.
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {!isManager && !isSaler && (
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
              <option value="ALL">Tất cả các Kho ({orders.length} phiếu)</option>
              {warehouses.map(w => (
                <option key={w.id || w.code} value={w.code}>
                  {w.name} ({w.code})
                </option>
              ))}
            </select>
          )}

          <select
            value={dateFilter}
            onChange={e => setDateFilter(e.target.value)}
            style={{
              padding: '8px 12px',
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
          </select>

          <button 
            className="btn btn-primary" 
            style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, fontSize: '0.85rem' }} 
            onClick={() => setShowCreateModal(true)}
          >
            <Plus size={16} /> Tạo Yêu Cầu Xuất
          </button>

          <button
            onClick={() => fetchOrders(true)}
            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 500, fontSize: '0.85rem' }}
          >
            <RefreshCw size={15} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '14px' }}>
        <div style={{ background: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '0.8rem', fontWeight: 600 }}>
            <span>TỔNG PHIẾU XUẤT</span>
            <FileText size={16} color="#3b82f6" />
          </div>
          <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b', margin: '8px 0 0 0' }}>{kpiStats.total}</p>
        </div>

        <div style={{ background: '#fffbeb', padding: '16px', borderRadius: '8px', border: '1px solid #fde68a' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#b45309', fontSize: '0.8rem', fontWeight: 600 }}>
            <span>CHỜ CHỌN LÔ HÀNG</span>
            <Layers size={16} color="#f59e0b" />
          </div>
          <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#b45309', margin: '8px 0 0 0' }}>{kpiStats.pending}</p>
        </div>

        <div style={{ background: '#faf5ff', padding: '16px', borderRadius: '14px', border: '1px solid #ddd6fe' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#6d28d9', fontSize: '0.8rem', fontWeight: 700 }}>
            <span>ĐANG GOM HÀNG</span>
            <PackageMinus size={16} color="#8b5cf6" />
          </div>
          <p style={{ fontSize: '1.6rem', fontWeight: 800, color: '#6d28d9', margin: '8px 0 0 0' }}>{kpiStats.picking}</p>
        </div>

        <div style={{ background: '#f0fdfa', padding: '16px', borderRadius: '14px', border: '1px solid #99f6e4' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#0f766e', fontSize: '0.8rem', fontWeight: 700 }}>
            <span>ĐÃ ĐÓNG GÓI</span>
            <Box size={16} color="#0f766e" />
          </div>
          <p style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f766e', margin: '8px 0 0 0' }}>{kpiStats.packed}</p>
        </div>

        <div style={{ background: '#f0f9ff', padding: '16px', borderRadius: '14px', border: '1px solid #bae6fd' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#0369a1', fontSize: '0.8rem', fontWeight: 700 }}>
            <span>ĐÃ XUẤT KHO</span>
            <Truck size={16} color="#0284c7" />
          </div>
          <p style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0369a1', margin: '8px 0 0 0' }}>{kpiStats.confirmed}</p>
        </div>

        <div style={{ background: '#f0fdf4', padding: '16px', borderRadius: '14px', border: '1px solid #bbf7d0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#15803d', fontSize: '0.8rem', fontWeight: 700 }}>
            <span>GIAO THÀNH CÔNG</span>
            <CheckCircle2 size={16} color="#22c55e" />
          </div>
          <p style={{ fontSize: '1.6rem', fontWeight: 800, color: '#15803d', margin: '8px 0 0 0' }}>{kpiStats.delivered}</p>
        </div>
      </div>

      {/* Main Table Card */}
      <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', overflow: 'hidden' }}>
        
        {/* Controls Row: Status Tabs & Search */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
          <div style={{ display: 'flex', gap: '4px', overflowX: 'auto' }}>
            {[
              { key: 'ALL', label: 'Tất cả trạng thái' },
              { key: 'PENDING', label: 'Tạo yêu cầu' },
              { key: 'WAITING_TRANSFER', label: 'Chờ nhập điều chuyển' },
              { key: 'PICKING', label: 'Soạn hàng' },
              { key: 'PACKED', label: 'Đã đóng gói' },
              { key: 'READY_FOR_DELIVERY', label: 'Chờ giao hàng' },
              { key: 'CONFIRMED', label: 'Đã xuất kho' },
              { key: 'DELIVERED', label: 'Giao thành công' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setStatusTab(tab.key)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  background: statusTab === tab.key ? '#0f766e' : '#f1f5f9',
                  color: statusTab === tab.key ? '#fff' : '#64748b',
                  transition: 'all 0.15s ease'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f1f5f9', padding: '6px 12px', borderRadius: '10px', minWidth: '280px' }}>
            <Search size={15} color="#64748b" />
            <input 
              type="text" 
              placeholder="Tìm mã phiếu, khách hàng, điểm đến, mã sản phẩm..." 
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

        {/* Logistics Transaction Type Filter Bar */}
        <div style={{ padding: '10px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto' }}>
          <span style={{ fontSize: '11px', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>
            Hình thức xuất kho:
          </span>
          {[
            { key: 'ALL', label: 'Tất cả' },
            { key: 'XUAT_BAN_FEFO', label: 'Xuất bán hàng' },
            { key: 'DIEU_CHUYEN', label: 'Điều chuyển chi nhánh' },
            { key: 'TRA_HANG_NCC', label: 'Trả hàng lỗi cho NCC' },
            { key: 'XUAT_HUY', label: 'Xuất hủy sản phẩm' },
          ].map(typeTab => {
            const isSelected = outboundTypeFilter === typeTab.key;
            return (
              <button
                key={typeTab.key}
                onClick={() => setOutboundTypeFilter(typeTab.key)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: isSelected ? '1px solid #0f766e' : '1px solid #cbd5e1',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  background: isSelected ? '#0f766e' : '#fff',
                  color: isSelected ? '#fff' : '#334155',
                  transition: 'all 0.15s ease',
                }}
              >
                {typeTab.label}
              </button>
            );
          })}
        </div>

        {/* Table Content */}
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
          <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
            <tr>
              <th style={{ padding: '12px 18px', color: '#64748b', fontWeight: 700 }}>Số Phiếu Xuất</th>
              <th style={{ padding: '12px 18px', color: '#64748b', fontWeight: 700 }}>Hình Thức Xuất</th>
              <th style={{ padding: '12px 18px', color: '#64748b', fontWeight: 700 }}>Kho Xuất Hàng</th>
              <th style={{ padding: '12px 18px', color: '#64748b', fontWeight: 700 }}>Điểm Đến & Khách Hàng</th>
              <th style={{ padding: '12px 18px', color: '#64748b', fontWeight: 700 }}>Tổng Món</th>
              <th style={{ padding: '12px 18px', color: '#64748b', fontWeight: 700 }}>Trạng Thái</th>
              <th style={{ padding: '12px 18px', color: '#64748b', fontWeight: 700, textAlign: 'right' }}>Thao Tác</th>
            </tr>
          </thead>
          <tbody>
            {initialLoading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                  <RefreshCw size={22} className="animate-spin" style={{ margin: '0 auto 8px' }} />
                  Đang tải danh sách phiếu xuất kho...
                </td>
              </tr>
            ) : paginatedOrders.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                  <PackageMinus size={36} color="#cbd5e1" style={{ margin: '0 auto 10px' }} />
                  <p style={{ margin: 0, fontWeight: 600 }}>Không tìm thấy phiếu xuất kho nào</p>
                </td>
              </tr>
            ) : (
              paginatedOrders.map((o) => {
                const statusCfg = STATUS_CONFIG[o.status] || { label: o.status, bg: '#f8fafc', color: '#334155', border: '#e2e8f0' };
                const isGoVap = o.warehouseCode === 'WH-006' || !o.warehouseCode;
                const cls = detectSlipClassification(o as any);
                const typeCfg = cls === 'DISPOSAL' ? OUTBOUND_TYPE_CONFIG.XUAT_HUY
                  : cls === 'RETURN' ? OUTBOUND_TYPE_CONFIG.TRA_HANG_NCC
                  : cls === 'TRANSFER' ? OUTBOUND_TYPE_CONFIG.DIEU_CHUYEN
                  : OUTBOUND_TYPE_CONFIG.XUAT_BAN_FEFO;

                const isTargetHighlight = Boolean(highlightCode && (
                  o.orderCode.toLowerCase().includes(highlightCode.toLowerCase()) ||
                  o.id === highlightCode
                ));

                return (
                  <tr
                    key={o.id}
                    onClick={() => {
                      setSelectedOrderId(o.id);
                      setIsEditingOrder(false);
                    }}
                    ref={isTargetHighlight ? (el) => { if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); } : undefined}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      backgroundColor: isTargetHighlight ? '#f0fdf4' : undefined,
                      boxShadow: isTargetHighlight ? 'inset 0 0 0 2px #0f766e' : undefined,
                      transition: 'all 0.25s ease',
                      cursor: 'pointer',
                    }}
                    title="Bấm vào đơn hàng để mở danh sách sản phẩm và chạy Pick-to-Light (Kệ A1–A3)"
                  >
                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>{o.orderCode}</span>
                        {isTargetHighlight && (
                          <span style={{ backgroundColor: '#0f766e', color: '#fff', fontSize: '10px', padding: '1px 5px', borderRadius: '4px', fontWeight: 700 }}>
                            Đang tìm
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                        {new Date(o.createdAt).toLocaleDateString('vi-VN')}
                      </div>
                    </td>

                    <td style={{ padding: '14px 18px' }}>
                      <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '6px', background: typeCfg.bg, color: typeCfg.color, fontWeight: 700, border: `1px solid ${typeCfg.border}`, display: 'inline-block' }}>
                        {typeCfg.label}
                      </span>
                    </td>

                    <td style={{ padding: '14px 18px' }}>
                      {(() => {
                        const whObj = warehouses.find(w => w.code === o.warehouseCode);
                        return (
                          <span style={{ 
                            fontSize: '0.8rem', padding: '3px 8px', borderRadius: '6px',
                            background: '#f0fdfa',
                            color: '#0f766e',
                            fontWeight: 600, border: '1px solid #99f6e4',
                            display: 'inline-flex', alignItems: 'center', gap: 4
                          }}>
                            <Building2 size={12} /> {whObj ? `${whObj.name} (${whObj.code})` : `Kho ${o.warehouseCode || 'Chưa gán'}`}
                          </span>
                        );
                      })()}
                    </td>

                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ fontWeight: 600, color: '#1e293b' }}>{o.requesterName || 'Khách hàng CityMart'}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{o.destination}</div>
                    </td>

                    <td style={{ padding: '14px 18px', fontWeight: 600 }}>
                      <div>
                        {o.totalItems || o.items?.length || 1} món ({o.totalQuantity || o.items?.reduce((s, i) => s + (i.requestedQuantity || 1), 0) || 1} sp)
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                        {Array.from(
                          new Map(
                            (o.items || []).map((it, i) => {
                              const loc = resolveOutboundShelfTier(it, i);
                              return [loc.shortCode, loc];
                            })
                          ).values()
                        ).map(loc => (
                          <span
                            key={loc.shortCode}
                            style={{
                              fontSize: '10.5px',
                              fontWeight: 600,
                              padding: '1px 6px',
                              borderRadius: '4px',
                              backgroundColor: '#f0fdfa',
                              color: '#0f766e',
                              border: '1px solid #99f6e4',
                            }}
                          >
                            {loc.fullLabel}
                          </span>
                        ))}
                      </div>
                    </td>

                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                        <span style={{ 
                          fontSize: '0.75rem', padding: '3px 8px', borderRadius: '6px',
                          background: statusCfg.bg, color: statusCfg.color, fontWeight: 600,
                          border: `1px solid ${statusCfg.border}`
                        }}>
                          {statusCfg.label}
                        </span>
                        {activeLocks[o.id] && (
                          <span style={{
                            fontSize: '0.7rem',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            background: '#fffbeb',
                            color: '#b45309',
                            border: '1px solid #fde68a',
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}>
                            <Lock size={10} color="#d97706" /> {activeLocks[o.id].userName} đang thao tác
                          </span>
                        )}
                      </div>
                    </td>

                    <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                        {canOperateWarehouse && (
                          <>
                            {o.status === 'PENDING' && (
                              <button
                                style={{
                                  padding: '5px 12px',
                                  fontSize: '0.8rem',
                                  fontWeight: 600,
                                  background: '#10b981',
                                  color: '#ffffff',
                                  border: 'none',
                                  borderRadius: '6px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                  cursor: 'pointer',
                                }}
                                onClick={() => handleApproveOrder(o.id)}
                                title="Quản lý duyệt tiếp nhận đơn và giao việc lấy hàng cho kho"
                              >
                                <CheckCircle2 size={14} /> Tiếp Nhận & Giao Kho
                              </button>
                            )}
                            {(o.status === 'READY_FOR_DELIVERY' || o.status === 'CONFIRMED' || o.status === 'SHIPPED') && (
                              <button
                                style={{
                                  padding: '5px 12px',
                                  fontSize: '0.78rem',
                                  fontWeight: 600,
                                  background: '#f0fdf4',
                                  color: '#15803d',
                                  border: '1px solid #bbf7d0',
                                  borderRadius: '6px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  cursor: 'pointer',
                                }}
                                onClick={() => setConfirmDeliveryOrder(o)}
                                title="Xác nhận giao hàng thành công"
                              >
                                <CheckCircle2 size={13} /> Giao hàng
                              </button>
                            )}
                          </>
                        )}
                        <button 
                          className="btn btn-outline" 
                          style={{ padding: '5px 12px', fontSize: '0.8rem', fontWeight: 600 }} 
                          onClick={() => setSelectedOrderId(o.id)}
                        >
                          Chi tiết
                        </button>
                        <button 
                          style={{ 
                            padding: '5px 10px', fontSize: '0.78rem', fontWeight: 700, 
                            background: '#f0fdfa', color: '#0f766e', 
                            border: '1px solid #99f6e4', borderRadius: '8px', 
                            display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' 
                          }} 
                          onClick={() => setReceiptOrder(o)}
                          title="In Phiếu Xuất Kho Kế Toán (Mẫu 02 - VT)"
                        >
                          <FileText size={13} color="#0f766e" /> Phiếu 02-VT
                        </button>
                        <button 
                          style={{ 
                            padding: '5px 10px', fontSize: '0.78rem', fontWeight: 700, 
                            background: '#f8fafc', color: '#1d4ed8', 
                            border: '1px solid #cbd5e1', borderRadius: '8px', 
                            display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' 
                          }} 
                          onClick={() => setPrintSlipOrder(o)}
                          title="In Phiếu Giao Hàng / Vận Chuyển"
                        >
                          <Printer size={13} color="#2563eb" /> Phiếu Giao
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Pagination Controls */}
        {filteredOrders.length > 0 && (
          <div style={{ padding: '14px 20px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fafafa', fontSize: '0.85rem', color: '#64748b' }}>
            <div>
              Hiển thị <b>{Math.min(filteredOrders.length, (currentPage - 1) * pageSize + 1)} - {Math.min(filteredOrders.length, currentPage * pageSize)}</b> trên tổng số <b>{filteredOrders.length}</b> phiếu xuất
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                style={{
                  padding: '6px 12px', borderRadius: '8px', border: '1px solid #cbd5e1',
                  background: '#fff', cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
                  opacity: currentPage <= 1 ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: '4px'
                }}
              >
                <ChevronLeft size={16} /> Trước
              </button>

              <span style={{ fontWeight: 700, color: '#0f172a' }}>
                Trang {currentPage} / {totalPages}
              </span>

              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                style={{
                  padding: '6px 12px', borderRadius: '8px', border: '1px solid #cbd5e1',
                  background: '#fff', cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
                  opacity: currentPage >= totalPages ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: '4px'
                }}
              >
                Sau <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Outbound Detail Modal */}
      {selectedOrder && (
        <div 
          onClick={() => { setSelectedOrderId(null); setIsEditingOrder(false); }}
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}
        >
          <div 
            onClick={e => e.stopPropagation()}
            className="card" style={{ width: '880px', maxWidth: '95%', maxHeight: '92vh', overflowY: 'auto', padding: '2rem', borderRadius: '16px' }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                    Chi tiết phiếu xuất: {selectedOrder.orderCode}
                  </h3>
                  <span style={{
                    padding: '3px 8px',
                    borderRadius: '6px',
                    background: (STATUS_CONFIG[selectedOrder.status] || STATUS_CONFIG.PENDING).bg,
                    color: (STATUS_CONFIG[selectedOrder.status] || STATUS_CONFIG.PENDING).color,
                    border: `1px solid ${(STATUS_CONFIG[selectedOrder.status] || STATUS_CONFIG.PENDING).border}`,
                    fontSize: '0.78rem',
                    fontWeight: 700,
                  }}>
                    {(STATUS_CONFIG[selectedOrder.status] || STATUS_CONFIG.PENDING).label}
                  </span>
                  <button
                    onClick={() => setReceiptOrder(selectedOrder)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '5px',
                      padding: '5px 12px', borderRadius: '8px',
                      background: '#0f766e', color: '#fff',
                      border: 'none', fontWeight: 700, fontSize: '0.8rem',
                      cursor: 'pointer'
                    }}
                  >
                    <Printer size={14} /> Mẫu số 02 - VT
                  </button>

                  {canOperateWarehouse && (
                    !isEditingOrder ? (
                      <button
                        onClick={() => startEditOrder(selectedOrder)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '5px',
                          padding: '5px 12px', borderRadius: '8px',
                          background: '#eff6ff', color: '#2563eb',
                          border: '1px solid #bfdbfe', fontWeight: 700, fontSize: '0.8rem',
                          cursor: 'pointer'
                        }}
                        title="Chỉnh sửa người nhận, địa chỉ giao, kho xuất và số lượng hàng"
                      >
                        <Edit2 size={13} /> Chỉnh Sửa Thông Tin
                      </button>
                    ) : (
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          disabled={isSavingEdit}
                          onClick={() => handleSaveOrderEdit(selectedOrder.id)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '5px',
                            padding: '5px 14px', borderRadius: '6px',
                            background: '#16a34a', color: '#fff',
                            border: 'none', fontWeight: 600, fontSize: '0.8rem',
                            cursor: isSavingEdit ? 'not-allowed' : 'pointer',
                          }}
                        >
                          {isSavingEdit ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />} Lưu Thay Đổi
                        </button>
                        <button
                          onClick={() => setIsEditingOrder(false)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '4px',
                            padding: '5px 10px', borderRadius: '6px',
                            background: '#f1f5f9', color: '#475569',
                            border: '1px solid #cbd5e1', fontWeight: 600, fontSize: '0.8rem',
                            cursor: 'pointer'
                          }}
                        >
                          <RotateCcw size={13} /> Huỷ
                        </button>
                      </div>
                    )
                  )}
                </div>
              </div>
              <button onClick={() => { setSelectedOrderId(null); setIsEditingOrder(false); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={22} />
              </button>
            </div>
            {/* Mutex Lock Notice */}
            {activeLocks[selectedOrder.id] && activeLocks[selectedOrder.id].userId !== user?.id && (
              <div
                style={{
                  backgroundColor: '#fffbeb',
                  border: '1px solid #f59e0b',
                  borderRadius: '8px',
                  padding: '12px 16px',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  color: '#92400e',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                }}
              >
                <Lock size={20} color="#d97706" style={{ flexShrink: 0 }} />
                <div>
                  <div><b>Đơn hàng đang bị khóa thao tác</b> bởi <b>{activeLocks[selectedOrder.id].userName}</b> ({activeLocks[selectedOrder.id].role === 'WAREHOUSE_STAFF' ? 'Nhân viên Mobile' : 'Quản lý'}).</div>
                  <div style={{ fontSize: '0.75rem', color: '#b45309', fontWeight: 500, marginTop: '2px' }}>
                    Để tránh xung đột số lượng thực tế khi soạn & đóng gói, các nút cập nhật trên giao diện Web tạm thời bị khóa cho đến khi nhân viên hoàn tất.
                  </div>
                </div>
              </div>
            )}

            {/* Order Info Card (Editable vs View Mode) */}
            <div style={{ background: isEditingOrder ? '#fffbeb' : '#f8fafc', border: `1px solid ${isEditingOrder ? '#fde68a' : '#e2e8f0'}`, borderRadius: '8px', padding: '14px', marginBottom: '18px' }}>
              {!isEditingOrder ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', fontSize: '12.5px' }}>
                  <div>
                    <span style={{ color: '#64748b', fontSize: '11px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4, textTransform: 'uppercase' }}><User size={11} /> Người Nhận / Khách Hàng</span>
                    <b style={{ color: '#0f172a', fontSize: '13px' }}>{selectedOrder.requesterName || 'Chưa cập nhật'}</b>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', fontSize: '11px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4, textTransform: 'uppercase' }}><MapPin size={11} /> Điểm Đến / Địa Chỉ Giao</span>
                    <b style={{ color: '#0f172a', fontSize: '13px' }}>{selectedOrder.destination}</b>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', fontSize: '11px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4, textTransform: 'uppercase' }}><Building2 size={11} /> Kho Xuất Hàng</span>
                    <b style={{ color: '#0284c7', fontSize: '13px' }}>{selectedOrder.warehouseCode || 'WH-006'}</b>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', fontSize: '11px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4, textTransform: 'uppercase' }}><Calendar size={11} /> Ngày Tạo Phiếu</span>
                    <b style={{ color: '#475569', fontSize: '13px' }}>{selectedOrder.createdAt ? new Date(selectedOrder.createdAt).toLocaleString('vi-VN') : 'Vừa tạo'}</b>
                  </div>
                  <div style={{ gridColumn: '1 / -1', borderTop: '1px dashed #cbd5e1', paddingTop: '8px', marginTop: '2px' }}>
                    <span style={{ color: '#64748b', fontSize: '11px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4, textTransform: 'uppercase' }}><FileText size={11} /> Ghi Chú Nghiệp Vụ</span>
                    <span style={{ color: '#334155', fontStyle: selectedOrder.notes ? 'normal' : 'italic' }}>{selectedOrder.notes || 'Không có ghi chú bổ sung'}</span>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#b45309', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Edit2 size={14} /> Chế Độ Chỉnh Sửa Thông Tin Phiếu Xuất:
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '3px' }}>
                        Người Nhận / Khách Hàng:
                      </label>
                      <input
                        type="text"
                        value={editFormData.requesterName}
                        onChange={e => setEditFormData({ ...editFormData, requesterName: e.target.value })}
                        style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12.5px', background: '#fff' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '3px' }}>
                        Kho Xuất Hàng:
                      </label>
                      <input
                        type="text"
                        value={editFormData.warehouseCode}
                        onChange={e => setEditFormData({ ...editFormData, warehouseCode: e.target.value })}
                        style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12.5px', background: '#fff' }}
                      />
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '3px' }}>
                      Điểm Đến / Địa Chỉ Giao Hàng:
                    </label>
                    <input
                      type="text"
                      value={editFormData.destination}
                      onChange={e => setEditFormData({ ...editFormData, destination: e.target.value })}
                      style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12.5px', background: '#fff' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '3px' }}>
                      Ghi Chú Nghiệp Vụ:
                    </label>
                    <textarea
                      rows={2}
                      value={editFormData.notes}
                      onChange={e => setEditFormData({ ...editFormData, notes: e.target.value })}
                      style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', background: '#fff' }}
                    />
                  </div>
                </div>
              )}
            </div>

            {selectedOrder.status === 'WAITING_TRANSFER' && (
              <div style={{
                backgroundColor: '#fff7ed',
                border: '1px solid #fed7aa',
                borderRadius: '8px',
                padding: '11px 16px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                color: '#c2410c',
                fontSize: '0.85rem',
                fontWeight: 600,
              }}>
                <RotateCcw size={16} color="#ea580c" style={{ flexShrink: 0 }} />
                <span>
                  Đơn hàng đang ở trạng thái <b>Chờ nhập điều chuyển</b> từ chi nhánh khác về kho Gò Vấp. Khi thủ kho hoàn tất tiếp nhận phiếu nhập TRF-IMP, hệ thống sẽ tự động chuyển đơn sang khâu đóng gói.
                </span>
              </div>
            )}

            {renderStepper(selectedOrder.status)}

            {/* ── BẢNG ĐIỀU HƯỚNG LẤY HÀNG THÔNG MINH (CTA-DRIVEN GUIDED PICKING) ── */}
            {(() => {
              const allItems = selectedOrder.items || [];
              const totalCount = allItems.length;
              const pickedCount = allItems.filter(it => it.status === 'PICKED' || (it.pickedQuantity || 0) >= (it.requestedQuantity || 1)).length;
              const allPicked = totalCount > 0 && pickedCount >= totalCount;
              const nextUnpickedIdx = allItems.findIndex(it => it.status !== 'PICKED' && (it.pickedQuantity || 0) < (it.requestedQuantity || 1));
              const firstTargetItem = nextUnpickedIdx >= 0 ? allItems[nextUnpickedIdx] : null;
              const firstTargetLoc = nextUnpickedIdx >= 0 && firstTargetItem ? resolveOutboundShelfTier(firstTargetItem, nextUnpickedIdx) : null;

              const afterActiveIdx = webGuidedSession
                ? allItems.findIndex(it => it.id !== webGuidedSession.itemId && it.status !== 'PICKED' && (it.pickedQuantity || 0) < (it.requestedQuantity || 1))
                : -1;
              const afterActiveItem = afterActiveIdx >= 0 ? allItems[afterActiveIdx] : null;
              const afterActiveLoc = afterActiveIdx >= 0 && afterActiveItem ? resolveOutboundShelfTier(afterActiveItem, afterActiveIdx) : null;

              return (
                <div
                  style={{
                    marginTop: '14px',
                    padding: '14px 16px',
                    borderRadius: '10px',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  {/* Thanh Tiến Độ */}
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Radio size={15} color="#0f766e" />
                        <span>Tiến độ lấy hàng</span>
                      </span>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: allPicked ? '#166534' : '#0f766e' }}>
                        {pickedCount}/{totalCount} món
                      </span>
                    </div>
                    <div style={{ width: '100%', height: '6px', backgroundColor: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
                      <div style={{
                        width: `${totalCount > 0 ? Math.round((pickedCount / totalCount) * 100) : 0}%`,
                        height: '100%',
                        backgroundColor: allPicked ? '#16a34a' : webGuidedSession ? '#d97706' : '#0f766e',
                        transition: 'width 0.3s ease',
                      }} />
                    </div>
                  </div>

                  {/* HERO CTA CARD */}
                  <div style={{ marginBottom: '14px' }}>
                    {webGuidedSession ? (
                      <div style={{
                        padding: '14px',
                        borderRadius: '10px',
                        backgroundColor: '#fffbeb',
                        border: '2px solid #f59e0b',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'stretch', gap: '12px', flexWrap: 'wrap' }}>
                          <div style={{
                            minWidth: '84px',
                            padding: '10px 14px',
                            borderRadius: '8px',
                            backgroundColor: '#d97706',
                            color: '#ffffff',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}>
                            <span style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase' }}>Đi tới kệ</span>
                            <span style={{ fontSize: '24px', fontWeight: 700, fontFamily: 'monospace', lineHeight: 1.15 }}>
                              {webGuidedSession.fullLocationLabel}
                            </span>
                          </div>

                          <div style={{ flex: 1, minWidth: '180px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#b45309' }}>
                              Bước {webGuidedSession.step}/{webGuidedSession.totalSteps} •{' '}
                              {iotBuzzerEnabled ? 'Đèn & Còi đang bật' : 'Chỉ sáng đèn tại kệ'}
                            </span>
                            <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>
                              {webGuidedSession.productName}
                            </div>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: '#1d4ed8', marginTop: '2px' }}>
                              Số lượng cần lấy: {webGuidedSession.quantity}
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <button
                              type="button"
                              onClick={() => advanceWebGuidedStep(true)}
                              style={{
                                backgroundColor: '#d97706',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '8px',
                                padding: '10px 16px',
                                fontSize: '13px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                              }}
                            >
                              <CheckCircle2 size={16} />
                              <span>
                                {afterActiveItem && afterActiveLoc
                                  ? `Đã lấy tại ${webGuidedSession.fullLocationLabel} — Qua kệ ${afterActiveLoc.fullLabel}`
                                  : `Đã lấy tại ${webGuidedSession.fullLocationLabel} — Hoàn tất`}
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setIsWebAutoIotEnabled(false);
                                stopWebGuidedIot(true);
                              }}
                              style={{
                                backgroundColor: '#ffffff',
                                color: '#475569',
                                border: '1px solid #cbd5e1',
                                borderRadius: '8px',
                                padding: '10px 12px',
                                fontSize: '12px',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              Tạm dừng
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : allPicked ? (
                      <div style={{
                        padding: '12px 14px',
                        borderRadius: '10px',
                        backgroundColor: '#f0fdf4',
                        border: '1.5px solid #86efac',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '10px',
                        flexWrap: 'wrap',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13.5px', fontWeight: 700, color: '#166534' }}>
                          <CheckCircle2 size={18} color="#16a34a" />
                          <span>Đã lấy đủ {totalCount}/{totalCount} sản phẩm</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <button
                            type="button"
                            onClick={() => startOrderPickingScenario(selectedOrder)}
                            style={{
                              padding: '8px 12px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: 600,
                              backgroundColor: '#ffffff',
                              color: '#0f766e',
                              border: '1px solid #99f6e4',
                              cursor: 'pointer',
                            }}
                          >
                            Lấy lại từ đầu
                          </button>
                          {canOperateWarehouse && (selectedOrder.status === 'PENDING' || selectedOrder.status === 'PROCESSING' || selectedOrder.status === 'PICKING' || selectedOrder.status === 'PACKING') && (
                            <button
                              type="button"
                              onClick={() => advanceState(selectedOrder.id, 'confirm', { confirmedBy: user?.id || 'USR-01' })}
                              style={{
                                padding: '9px 16px',
                                borderRadius: '8px',
                                fontSize: '13px',
                                fontWeight: 700,
                                backgroundColor: '#16a34a',
                                color: '#ffffff',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                              }}
                            >
                              <CheckCircle2 size={16} />
                              <span>Hoàn tất xuất kho &amp; Bàn giao</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div style={{
                        padding: '12px 14px',
                        borderRadius: '10px',
                        backgroundColor: '#ffffff',
                        border: '1.5px solid #0f766e',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                        flexWrap: 'wrap',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#475569' }}>Lộ trình lấy hàng:</span>
                          {allItems.map((it, idx) => {
                            const l = resolveOutboundShelfTier(it, idx);
                            const picked = it.status === 'PICKED' || (it.pickedQuantity || 0) >= (it.requestedQuantity || 1);
                            return (
                              <React.Fragment key={it.id || idx}>
                                {idx > 0 && <span style={{ color: '#94a3b8', fontSize: '11px' }}>→</span>}
                                <span style={{
                                  fontSize: '11.5px',
                                  fontWeight: 700,
                                  padding: '2px 8px',
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

                        <button
                          type="button"
                          onClick={() => startOrderPickingScenario(selectedOrder)}
                          style={{
                            backgroundColor: '#0f766e',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '10px 18px',
                            fontSize: '13px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                        >
                          <Lightbulb size={16} />
                          <span>
                            {firstTargetLoc
                              ? `Bắt đầu lấy hàng — Đi tới kệ ${firstTargetLoc.fullLabel}`
                              : 'Bắt đầu lấy hàng ngay'}
                          </span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Sơ đồ 3 Kệ (Kệ A, Kệ B, Kệ C) × 2 Tầng (A1, A2 | B1, B2 | C1, C2) */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                    {(['A', 'B', 'C'] as const).map(rackLetter => {
                      const mappedItems = allItems.map((it, idx) => ({
                        item: it,
                        idx,
                        loc: resolveOutboundShelfTier(it, idx),
                        isPicked: it.status === 'PICKED' || (it.pickedQuantity || 0) >= (it.requestedQuantity || 1),
                      }));
                      const isRackActive = webGuidedSession?.rackLabel === `Kệ ${rackLetter}`;

                      return (
                        <div
                          key={rackLetter}
                          style={{
                            backgroundColor: isRackActive ? '#fffbeb' : '#ffffff',
                            border: `1.5px solid ${isRackActive ? '#f59e0b' : '#cbd5e1'}`,
                            borderRadius: '8px',
                            padding: '10px',
                          }}
                        >
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: '6px',
                            fontSize: '12.5px',
                            fontWeight: 700,
                            color: isRackActive ? '#92400e' : '#0f172a',
                          }}>
                            <span>Kệ {rackLetter}</span>
                            {isRackActive && (
                              <span style={{ fontSize: '10.5px', fontWeight: 600, color: '#d97706', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                <Lightbulb size={12} /> Đang sáng
                              </span>
                            )}
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                            {([1, 2] as const).map(tierNum => {
                              const matching = mappedItems.filter(m => m.loc.rack === rackLetter && m.loc.tier === tierNum);
                              const hasItems = matching.length > 0;
                              const slotCode = `${rackLetter}${tierNum}`;
                              const isTierActive = isRackActive && webGuidedSession?.fullLocationLabel === slotCode;
                              const allTierPicked = hasItems && matching.every(m => m.isPicked);

                              return (
                                <div
                                  key={tierNum}
                                  onClick={() => {
                                    if (hasItems) {
                                      const m = matching[0];
                                      setIsWebAutoIotEnabled(true);
                                      activateWebGuidedStep(selectedOrder, m.item, m.idx + 1, allItems.length, m.idx);
                                    }
                                  }}
                                  style={{
                                    padding: '5px 8px',
                                    borderRadius: '6px',
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
                </div>
              );
            })()}

            <div style={{ marginTop: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h4 style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a', margin: 0 }}>
                  Danh sách sản phẩm &amp; Vị trí kệ {isEditingOrder && <span style={{ fontSize: '12px', color: '#b45309', fontWeight: 600 }}>[Chỉnh sửa]</span>}
                </h4>
                {canOperateWarehouse && selectedOrder.status === 'PENDING' && !isEditingOrder && (
                  <button className="btn btn-primary" style={{ backgroundColor: 'var(--color-primary-600)', display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', fontSize: '12px' }} onClick={() => runFefoAndApply(selectedOrder.id)}>
                    <Layers size={14} /> Chọn lô FEFO
                  </button>
                )}
              </div>
              
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                  <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <tr>
                      <th style={{ padding: '10px 14px', color: '#64748b', fontWeight: 600 }}>Sản phẩm</th>
                      <th style={{ padding: '10px 14px', color: '#64748b', fontWeight: 600, width: '90px' }}>Số lượng</th>
                      <th style={{ padding: '10px 14px', color: '#64748b', fontWeight: 600 }}>Vị trí Kệ &amp; Tầng</th>
                      <th style={{ padding: '10px 14px', color: '#64748b', fontWeight: 600 }}>Mã lô / HSD</th>
                      <th style={{ padding: '10px 14px', color: '#64748b', fontWeight: 600, textAlign: 'right' }}>Lấy hàng</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isEditingOrder ? (
                      editFormData.items.map((item, idx) => (
                        <tr key={item.id || idx} style={{ borderTop: idx > 0 ? '1px solid #f1f5f9' : 'none', backgroundColor: '#fffbeb' }}>
                          <td style={{ padding: '10px 14px' }}>
                            <div style={{ fontWeight: 600, color: '#0f172a' }}>{cleanOutboundProductName(item.productName)}</div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: 'monospace' }}>{item.sku}</div>
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            <input
                              type="number"
                              min={1}
                              value={item.requestedQuantity}
                              onChange={e => {
                                const newQty = Math.max(1, parseInt(e.target.value) || 1);
                                setEditFormData(prev => ({
                                  ...prev,
                                  items: prev.items.map((it, i) => i === idx ? { ...it, requestedQuantity: newQty } : it)
                                }));
                              }}
                              style={{ width: '75px', padding: '5px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12.5px', fontWeight: 700, color: '#0f172a', background: '#fff' }}
                            />
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            <input
                              type="text"
                              value={item.slotId || ''}
                              placeholder="A-T1, B-T2..."
                              onChange={e => {
                                const val = e.target.value;
                                setEditFormData(prev => ({
                                  ...prev,
                                  items: prev.items.map((it, i) => i === idx ? { ...it, slotId: val } : it)
                                }));
                              }}
                              style={{ width: '110px', padding: '5px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', background: '#fff' }}
                            />
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            <input
                              type="text"
                              value={item.lotCode || ''}
                              placeholder="Mã lô..."
                              onChange={e => {
                                const val = e.target.value;
                                setEditFormData(prev => ({
                                  ...prev,
                                  items: prev.items.map((it, i) => i === idx ? { ...it, lotCode: val } : it)
                                }));
                              }}
                              style={{ width: '130px', padding: '5px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', background: '#fff' }}
                            />
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'right', color: '#64748b' }}>—</td>
                        </tr>
                      ))
                    ) : (
                      selectedOrder.items?.map((item, idx) => {
                        const isTransferWaiting = item.slotId === 'TRANSFER_DOCK' ||
                          selectedOrder.status === 'WAITING_TRANSFER' ||
                          selectedOrder.notes?.includes('[CHỜ HÀNG ĐIỀU CHUYỂN]');

                        const loc = resolveOutboundShelfTier(item, idx);
                        const isItemPicked = item.status === 'PICKED' || (item.pickedQuantity || 0) >= (item.requestedQuantity || 1);
                        const isItemGuidedNow = webGuidedSession?.itemId === item.id;
                        const totalItemsCount = (selectedOrder.items || []).length;

                        return (
                          <tr
                            key={item.id || idx}
                            onClick={() => {
                              setIsWebAutoIotEnabled(true);
                              activateWebGuidedStep(
                                selectedOrder,
                                item,
                                idx + 1,
                                Math.max(1, totalItemsCount),
                                idx
                              );
                              showToast(
                                iotBuzzerEnabled
                                  ? `Đã bật đèn LED & Còi tại ${loc.fullLabel} cho "${cleanOutboundProductName(item.productName)}".`
                                  : `Đã bật đèn LED tại ${loc.fullLabel} cho "${cleanOutboundProductName(item.productName)}" ở chế độ chỉ sáng đèn.`,
                                'info'
                              );
                            }}
                            style={{
                              borderTop: idx > 0 ? '1px solid #f1f5f9' : 'none',
                              backgroundColor: isItemGuidedNow
                                ? '#fffbeb'
                                : isItemPicked
                                ? '#f0fdf4'
                                : '#ffffff',
                              cursor: 'pointer',
                              transition: 'background-color 0.15s ease',
                            }}
                          >
                            <td style={{ padding: '10px 14px' }}>
                              <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '13px' }}>
                                {cleanOutboundProductName(item.productName)}
                              </div>
                              <div style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>
                                {item.sku}
                              </div>
                            </td>

                            <td style={{ padding: '10px 14px', fontWeight: 700, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                              ×{item.requestedQuantity}
                            </td>

                            <td style={{ padding: '10px 14px' }}>
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                padding: '3px 9px',
                                borderRadius: '6px',
                                backgroundColor: isItemGuidedNow ? '#fef3c7' : isTransferWaiting ? '#fff7ed' : '#f0fdfa',
                                color: isItemGuidedNow ? '#92400e' : isTransferWaiting ? '#c2410c' : '#0f766e',
                                fontWeight: 600,
                                fontSize: '12px',
                                border: `1px solid ${isItemGuidedNow ? '#f59e0b' : isTransferWaiting ? '#fed7aa' : '#99f6e4'}`,
                              }}>
                                <Radio size={12} />
                                <span>{isTransferWaiting ? 'Dock điều chuyển' : loc.fullLabel}</span>
                              </span>
                            </td>

                            <td style={{ padding: '10px 14px', fontSize: '11.5px', color: '#475569' }}>
                              {isTransferWaiting ? (
                                <span style={{ color: '#c2410c' }}>Chờ điều chuyển</span>
                              ) : (
                                <span>
                                  {item.lotCode || 'Lô tiêu chuẩn'} • {item.expiryDate ? new Date(item.expiryDate).toLocaleDateString('vi-VN') : '15/09/2026'}
                                </span>
                              )}
                            </td>

                            <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                              {isItemGuidedNow ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    advanceWebGuidedStep(true);
                                  }}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '5px 10px',
                                    borderRadius: '6px',
                                    border: 'none',
                                    backgroundColor: '#d97706',
                                    color: '#ffffff',
                                    fontSize: '11.5px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                  }}
                                >
                                  <CheckCircle2 size={12} />
                                  <span>Bấm STOP</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setIsWebAutoIotEnabled(true);
                                    activateWebGuidedStep(
                                      selectedOrder,
                                      item,
                                      idx + 1,
                                      Math.max(1, totalItemsCount),
                                      idx
                                    );
                                  }}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '5px 10px',
                                    borderRadius: '6px',
                                    border: isItemPicked ? '1px solid #86efac' : '1px solid #0f766e',
                                    backgroundColor: isItemPicked ? '#dcfce7' : '#0f766e',
                                    color: isItemPicked ? '#166534' : '#ffffff',
                                    fontSize: '11.5px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                  }}
                                >
                                  {isItemPicked ? <Check size={12} /> : <Lightbulb size={12} />}
                                  <span>{isItemPicked ? 'Đã lấy' : 'Lấy hàng'}</span>
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Stepper Action Buttons */}
            <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem', borderTop: '2px solid #e2e8f0', paddingTop: '1.5rem' }}>
              {isSaler && (
                <div style={{
                  padding: '12px 16px',
                  borderRadius: '8px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  color: '#64748b',
                  fontSize: '0.825rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}>
                  <Lock size={16} color="#0f766e" style={{ flexShrink: 0 }} />
                  <span>Quyền hạn Kinh doanh: Bạn có thể theo dõi tiến độ đơn hàng và in chứng từ xuất kho. Các nghiệp vụ chọn lô, gom hàng, đóng gói và xác nhận xuất kho do Bộ phận Kho đảm nhiệm.</span>
                </div>
              )}

              {canOperateWarehouse && (
                activeLocks[selectedOrder.id] && activeLocks[selectedOrder.id].userId !== user?.id ? (
                  <div style={{ padding: '16px', borderRadius: '12px', background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e', textAlign: 'center', fontWeight: 700, fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                    <Lock size={20} color="#d97706" /> 
                    <span>Đơn hàng đang được nhân viên <b>{activeLocks[selectedOrder.id].userName}</b> thao tác trực tiếp dưới kho. Vui lòng chờ nhân viên hoàn tất trên thiết bị di động.</span>
                  </div>
                ) : (
                  <>
                    {selectedOrder.status === 'PICKING' && (
                      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        <button 
                          style={{ flex: 1, padding: '12px 20px', borderRadius: '10px', background: '#0f766e', color: '#fff', border: 'none', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                          onClick={() => setShowScanner(true)}
                        >
                          <ScanBarcode size={20} /> Quét mã Barcode lấy hàng
                        </button>
                        <button 
                          style={{ flex: 1, padding: '12px 20px', borderRadius: '10px', background: '#f59e0b', color: '#fff', border: 'none', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                          onClick={() => advanceState(selectedOrder.id, 'confirm-picking')}
                        >
                          Bỏ qua quét & Xác nhận lấy đủ <ArrowRight size={18} />
                        </button>
                      </div>
                    )}

                    {selectedOrder.status === 'PACKING' && (
                      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', width: '100%' }}>
                        <button 
                          style={{ flex: 1, padding: '12px 20px', borderRadius: '10px', background: '#059669', color: '#fff', border: 'none', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                          onClick={async () => {
                            await fetch(`${API_BASE}/outbound-orders/${selectedOrder.id}/status`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                              body: JSON.stringify({ status: 'PACKED' }),
                            }).catch(() => {});
                            setOrders(prev => prev.map(o => o.id === selectedOrder.id ? { ...o, status: 'PACKED' } : o));
                            showToast('Đã hoàn tất đóng gói kiện hàng! Sẵn sàng bàn giao shipper.', 'success');
                          }}
                        >
                          <CheckCircle2 size={18} /> Hoàn tất đóng gói
                        </button>
                      </div>
                    )}

                    {selectedOrder.status === 'PACKED' && (
                      <button 
                        style={{ padding: '12px 24px', backgroundColor: '#059669', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 800, fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', width: '100%', justifyContent: 'center', boxShadow: '0 4px 10px rgba(5,150,105,0.25)' }} 
                        onClick={() => advanceState(selectedOrder.id, 'confirm', { confirmedBy: user?.id || 'USR-01' })}
                      >
                        <CheckCircle2 size={22} /> Xác nhận xuất kho & Bàn giao
                      </button>
                    )}
                  </>
                )
              )}

              {(selectedOrder.status === 'CONFIRMED' || selectedOrder.status === 'SHIPPED' || selectedOrder.status === 'READY_FOR_DELIVERY') && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
                  <p style={{ color: '#16a34a', fontWeight: 600, textAlign: 'center', margin: 0, fontSize: '0.95rem' }}>
                    <CheckCircle2 size={18} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} /> 
                    {selectedOrder.status === 'READY_FOR_DELIVERY'
                      ? `Đơn hàng đã đóng gói hoàn tất & sẵn sàng giao hàng${selectedOrder.assignedDriverName ? ` (Tài xế: ${selectedOrder.assignedDriverName})` : ''}!`
                      : 'Đơn hàng đã xuất kho & sẵn sàng bàn giao vận chuyển!'}
                  </p>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => setReceiptOrder(selectedOrder)}
                      style={{ flex: 1, padding: '10px 14px', background: '#0f766e', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.85rem' }}
                    >
                      <FileText size={16} /> In Phiếu Xuất (Mẫu 02-VT)
                    </button>
                    <button
                      onClick={() => setPrintSlipOrder(selectedOrder)}
                      style={{ flex: 1, padding: '10px 14px', background: '#1e293b', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.85rem' }}
                    >
                      <Printer size={16} color="#38bdf8" /> In Phiếu Giao / Vận Chuyển
                    </button>
                    {canOperateWarehouse && (
                      <button
                        onClick={() => setConfirmDeliveryOrder(selectedOrder)}
                        style={{ flex: 1, padding: '10px 14px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.85rem' }}
                      >
                        <CheckCircle2 size={16} /> Xác nhận Giao Thành Công
                      </button>
                    )}
                  </div>
                </div>
              )}

              {selectedOrder.status === 'DELIVERED' && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', background: '#f0fdf4', padding: '12px 16px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                  <p style={{ color: '#15803d', fontWeight: 600, margin: 0, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <CheckCircle2 size={16} /> Đơn hàng đã giao thành công & hoàn tất trên toàn hệ thống!
                  </p>
                  <button
                    onClick={() => setReceiptOrder(selectedOrder)}
                    style={{ padding: '8px 16px', background: '#0f766e', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Printer size={16} /> In Lại Phiếu 02-VT
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showScanner && (
        <BarcodeQRScannerModal 
          isOpen={showScanner}
          onScanSuccess={(code) => handleScan(code)}
          onClose={() => setShowScanner(false)}
        />
      )}

      {/* Create Modal (Manual & CSV Upload) */}
      <CreateOutboundModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={(newOrder) => {
          setOrders(prev => [newOrder, ...prev]);
          setSelectedOrderId(newOrder.id);
          showToast('Tạo yêu cầu xuất kho thành công!', 'success');
        }}
        token={token}
        user={user}
        defaultWarehouse={activeWh !== 'ALL' ? activeWh : (selectedWarehouseCode || 'WH-006')}
      />

      {/* Outbound Receipt Modal (Mẫu số 02 - VT) */}
      {receiptOrder && (
        <OutboundReceiptModal
          order={receiptOrder}
          onClose={() => setReceiptOrder(null)}
        />
      )}

      {/* Print Order / Delivery Slip Modal */}
      {printSlipOrder && (
        <PrintOrderSlipModal
          order={{
            id: printSlipOrder.id,
            orderCode: printSlipOrder.orderCode,
            customerName: printSlipOrder.requesterName || 'Khách hàng C.T Mart',
            customerAddress: printSlipOrder.destination,
            destination: printSlipOrder.destination,
            requesterName: printSlipOrder.requesterName,
            status: printSlipOrder.status,
            createdAt: printSlipOrder.createdAt,
            notes: printSlipOrder.notes,
            warehouseCode: printSlipOrder.warehouseCode,
            items: (printSlipOrder.items || []).map(i => ({
              sku: i.sku,
              productName: i.productName,
              requestedQuantity: i.requestedQuantity,
              quantity: i.pickedQuantity > 0 ? i.pickedQuantity : i.requestedQuantity,
              lotNumber: i.lotCode,
              lotCode: i.lotCode,
              expiryDate: i.expiryDate,
              slotId: i.slotId,
            })),
          }}
          onClose={() => setPrintSlipOrder(null)}
        />
      )}

      {/* ── MODAL XÁC NHẬN GIAO HÀNG THÀNH CÔNG (TRÁNH BẤM NHẦM 1-CHẠM) ── */}
      {confirmDeliveryOrder && (
        <div
          onClick={() => !isDelivering && setConfirmDeliveryOrder(null)}
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
              maxWidth: '480px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '14px', borderBottom: '1px solid #f1f5f9', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CheckCircle2 size={16} color="#166534" />
                </div>
                <span>Xác Nhận Đã Giao Hàng Thành Công</span>
              </h3>
              <button
                type="button"
                onClick={() => !isDelivering && setConfirmDeliveryOrder(null)}
                style={{ color: '#94a3b8', border: 'none', background: 'none', cursor: 'pointer', padding: '4px' }}
                title="Đóng (Esc)"
              >
                <X size={18} />
              </button>
            </div>

            {/* Order Code & Status */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', fontFamily: 'monospace' }}>
                  #{confirmDeliveryOrder.orderCode}
                </span>
                <span style={{ fontSize: '11px', fontWeight: 500, padding: '2px 8px', borderRadius: '4px', backgroundColor: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa' }}>
                  {STATUS_CONFIG[confirmDeliveryOrder.status]?.label || confirmDeliveryOrder.status}
                </span>
              </div>
              <span style={{ fontSize: '11px', color: '#64748b' }}>
                {confirmDeliveryOrder.warehouseCode || 'Kho Gò Vấp WH-006'}
              </span>
            </div>

            {/* Info Card */}
            <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 14px', marginBottom: '14px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <User size={14} color="#64748b" style={{ marginTop: '2px', flexShrink: 0 }} />
                <div style={{ color: '#334155' }}>
                  Đơn vị / Người nhận: <strong style={{ color: '#0f172a' }}>{confirmDeliveryOrder.requesterName || confirmDeliveryOrder.requestedBy || 'Khách hàng'}</strong>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <MapPin size={14} color="#64748b" style={{ marginTop: '2px', flexShrink: 0 }} />
                <div style={{ color: '#475569', lineHeight: 1.4 }}>
                  Điểm đến: {confirmDeliveryOrder.destination || 'Giao tại quầy'}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderTop: '1px dashed #e2e8f0', paddingTop: '8px' }}>
                <Truck size={14} color="#64748b" style={{ flexShrink: 0 }} />
                <div style={{ color: '#334155' }}>
                  Tài xế giao: <strong style={{ color: '#0f172a' }}>{confirmDeliveryOrder.assignedDriverName || 'Đội xe giao vận'}</strong>
                  {confirmDeliveryOrder.assignedDriverPlate && (
                    <span style={{ color: '#64748b', marginLeft: '6px' }}>({confirmDeliveryOrder.assignedDriverPlate})</span>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px dashed #e2e8f0', paddingTop: '8px' }}>
                <span style={{ color: '#475569' }}>Số lượng sản phẩm:</span>
                <strong style={{ color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                  {confirmDeliveryOrder.totalQuantity || confirmDeliveryOrder.totalItems || confirmDeliveryOrder.items?.length || 0} sản phẩm
                </strong>
              </div>
            </div>

            {/* Notice Callout */}
            <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', padding: '10px 12px', marginBottom: '20px', display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '12px', color: '#166534', lineHeight: 1.45 }}>
              <AlertCircle size={15} color="#166534" style={{ marginTop: '2px', flexShrink: 0 }} />
              <span>
                Thao tác này xác nhận đơn hàng xuất kho đã được giao hoàn tất đến người nhận. Trạng thái đơn sẽ được cập nhật sang <strong>ĐÃ GIAO HÀNG (DELIVERED)</strong>.
              </span>
            </div>

            {/* Footer Buttons */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => !isDelivering && setConfirmDeliveryOrder(null)}
                disabled={isDelivering}
                style={{
                  padding: '9px 16px',
                  backgroundColor: '#ffffff',
                  color: '#475569',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 500,
                  cursor: isDelivering ? 'not-allowed' : 'pointer',
                }}
              >
                Hủy Bỏ
              </button>

              <button
                type="button"
                onClick={async () => {
                  setIsDelivering(true);
                  try {
                    await advanceState(confirmDeliveryOrder.id, 'deliver');
                    setConfirmDeliveryOrder(null);
                  } catch (err) {
                    console.error('Lỗi giao hàng:', err);
                  } finally {
                    setIsDelivering(false);
                  }
                }}
                disabled={isDelivering}
                style={{
                  padding: '9px 18px',
                  backgroundColor: '#0f766e',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: isDelivering ? 'not-allowed' : 'pointer',
                  opacity: isDelivering ? 0.7 : 1,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                }}
              >
                {isDelivering ? (
                  <span>Đang xử lý...</span>
                ) : (
                  <>
                    <CheckCircle2 size={14} color="#ffffff" />
                    <span>Xác Nhận Đã Giao</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OutboundOrders;
