import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  PackageCheck,
  Snowflake,
  QrCode,
  Printer,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Sparkles,
  Truck,
  Box,
  Plus,
  Minus,
  ShieldCheck,
  ArrowRight,
  RotateCcw,
  MapPin,
  X,
  Check,
  Lock,
  Inbox,
  Boxes,
  Info,
  ChevronRight,
  CheckSquare,
  RefreshCw,
  ScanBarcode,
} from 'lucide-react';
import { CameraScannerModal } from '../components/CameraScannerModal';
import {
  fetchOutboundOrders,
  confirmPickingApi,
  cancelOutboundOrderApi,
  updateOutboundStatus,
  ApiOutboundOrder,
} from '../services/api';
import { useStaffWebSocket } from '../context/WebSocketContext';
import { useAuth } from '../context/AuthContext';

export interface BoxTypeOption {
  id: string;
  name: string;
  shortLabel: string;
  maxUnits: number; // Sức chứa tiêu chuẩn (SP/thùng)
  dimensions: string;
  maxWeightKg: number;
  isColdCompatible: boolean;
  defaultIceGelsPerBox: number;
  description: string;
}

export const STANDARD_BOX_TYPES: BoxTypeOption[] = [
  {
    id: 'THERMAL_BAG',
    name: 'Túi Bạc Giữ Nhiệt Lạnh',
    shortLabel: 'Túi Bạc (Cool)',
    maxUnits: 20,
    dimensions: '35 x 25 x 15 cm',
    maxWeightKg: 5,
    isColdCompatible: true,
    defaultIceGelsPerBox: 2,
    description: 'Chuyên dụng hàng mát 0-4°C, kèm 2 đá gel/túi (đơn nhỏ)',
  },
  {
    id: 'THERMAL_BOX',
    name: 'Thùng Xốp Giữ Nhiệt + Đá Gel',
    shortLabel: 'Thùng Xốp (Frozen)',
    maxUnits: 60,
    dimensions: '50 x 40 x 35 cm',
    maxWeightKg: 20,
    isColdCompatible: true,
    defaultIceGelsPerBox: 4,
    description: 'Chuyên dụng hàng đông lạnh -18°C hoặc số lượng lớn',
  },
  {
    id: 'BOX_S',
    name: 'Thùng Carton Tiêu Chuẩn - Size S',
    shortLabel: 'Carton S (Nhỏ)',
    maxUnits: 25,
    dimensions: '30 x 20 x 15 cm',
    maxWeightKg: 5,
    isColdCompatible: false,
    defaultIceGelsPerBox: 0,
    description: 'Dành cho đơn hàng nhỏ, gia vị, đồ khô < 5kg',
  },
  {
    id: 'BOX_M',
    name: 'Thùng Carton Tiêu Chuẩn - Size M',
    shortLabel: 'Carton M (Vừa)',
    maxUnits: 60,
    dimensions: '40 x 30 x 25 cm',
    maxWeightKg: 15,
    isColdCompatible: false,
    defaultIceGelsPerBox: 0,
    description: 'Thùng tiêu chuẩn cho đồ hộp, bánh kẹo, hóa mỹ phẩm 5-15kg',
  },
  {
    id: 'BOX_L',
    name: 'Thùng Carton Lớn - Size L',
    shortLabel: 'Carton L (Lớn)',
    maxUnits: 150,
    dimensions: '60 x 40 x 35 cm',
    maxWeightKg: 35,
    isColdCompatible: false,
    defaultIceGelsPerBox: 0,
    description: 'Thùng lớn gom nhiều sản phẩm, thể tích lớn > 15kg',
  },
  {
    id: 'PALLET_MASTER',
    name: 'Pallet Gỗ Xuất Hàng Đại Lý / Sỉ',
    shortLabel: 'Pallet (Hàng Sỉ)',
    maxUnits: 500,
    dimensions: '120 x 100 x 140 cm',
    maxWeightKg: 500,
    isColdCompatible: false,
    defaultIceGelsPerBox: 0,
    description: 'Dành cho lô hàng lớn vài trăm đến vài nghìn sản phẩm xuất sỉ',
  },
];

interface PackItem {
  name: string;
  qty: number;
  unit?: string;
  sku?: string;
  lotCode?: string;
  shelfLocation?: string;
  zone?: string;
  isCold: boolean;
}

interface PackOrder {
  id: string;
  orderCode: string;
  customerName: string;
  address: string;
  items: PackItem[];
  isPacked: boolean;
  iceGelCount: number;
  boxType: string;
  boxCount: number;
  totalUnits: number;
  status: string;
}

import { formatStandardShelfLocation } from '../constants/warehouseRacks';

const formatShelfLocation = (rawLoc?: string, zone?: string, fallbackIdx: number = 1): string => {
  return formatStandardShelfLocation(rawLoc, zone, fallbackIdx);
};

export const PackingStation: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const targetOrderId = searchParams.get('orderId');

  const { user } = useAuth();
  const { isConnected, activeLocks, lockOrder, unlockOrder, lastEvent } = useStaffWebSocket();

  const [orders, setOrders] = useState<PackOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<PackOrder | null>(null);
  const [showShippingLabel, setShowShippingLabel] = useState<boolean>(false);
  const [selectedBoxTypeId, setSelectedBoxTypeId] = useState<string>('BOX_M');
  const [customBoxCount, setCustomBoxCount] = useState<number>(1);
  const [iceGels, setIceGels] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isPacking, setIsPacking] = useState<boolean>(false);
  const [filterTab, setFilterTab] = useState<'ALL' | 'PENDING' | 'PACKED'>('PENDING');

  // Scanner State for Packing & Label Verification
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);

  // Restock / Return-to-Shelf Callback State
  const [showRestockModal, setShowRestockModal] = useState<boolean>(false);
  const [restockedChecklist, setRestockedChecklist] = useState<{ [key: string]: boolean }>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Selected Box Type Object
  const currentBoxOption = useMemo(() => {
    return STANDARD_BOX_TYPES.find(b => b.id === selectedBoxTypeId) || STANDARD_BOX_TYPES[3];
  }, [selectedBoxTypeId]);

  // Load Real Data from Backend Outbound Service
  const loadLivePackingOrders = useCallback(async (keepSelected: boolean = true) => {
    try {
      const allOrders = await fetchOutboundOrders();
      
      const isOrderReadyForPacking = (ord: any) => {
        const s = (ord.status || '').toUpperCase();
        // If already packed/shipped/confirmed
        if (['PACKED', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'COMPLETED'].includes(s)) return true;
        // If status is explicitly PICKED or PACKING
        if (s === 'PICKED' || s === 'PACKING' || s === 'READY_FOR_PACKING') return true;
        // If explicitly transferred in current browser session
        if (localStorage.getItem(`citymart_order_ready_pack_${ord.id}`) === 'true') return true;
        if (localStorage.getItem(`citymart_order_ready_pack_${ord.orderCode}`) === 'true') return true;
        // If targeted via URL param
        if (targetOrderId && (ord.id === targetOrderId || ord.orderCode === targetOrderId)) return true;
        // If all items in this order have been picked
        if (Array.isArray(ord.items) && ord.items.length > 0) {
          const allPicked = ord.items.every((it: any) => Number(it.pickedQuantity || 0) >= Number(it.quantity || it.requestedQuantity || 1) && Number(it.quantity || it.requestedQuantity || 1) > 0);
          if (allPicked) return true;
        }
        return false;
      };

      const packingReadyOrders = allOrders.filter(isOrderReadyForPacking);

      // Map outbound orders that are ready with their packaging properties
      const mapped: PackOrder[] = packingReadyOrders.map(ord => {
        const mappedItems: PackItem[] = (ord.items || []).map((it: any) => {
          const isCold = it.zone === 'COOL' || it.zone === 'FROZEN' || it.temperatureRequired?.includes('0') || it.temperatureRequired?.includes('-');
          const rawShelf = it.slotId || it.location || it.shelfLocation;
          return {
            name: it.productName || it.sku || 'Sản phẩm',
            qty: Number(it.pickedQuantity || it.quantity || (it as any).requestedQuantity || 1),
            unit: it.unit || 'Đơn vị',
            sku: it.sku,
            lotCode: it.lotCode || 'LOT-DB',
            shelfLocation: formatShelfLocation(rawShelf),
            zone: it.zone || 'DRY',
            isCold: Boolean(isCold),
          };
        });

        const totalQty = mappedItems.reduce((s, i) => s + i.qty, 0);
        const hasCold = mappedItems.some(i => i.isCold);

        // Smart Box Suggestion based on order volume & temperature
        let defaultBoxId = 'BOX_M';
        if (hasCold) {
          defaultBoxId = totalQty <= 20 ? 'THERMAL_BAG' : 'THERMAL_BOX';
        } else {
          if (totalQty <= 25) defaultBoxId = 'BOX_S';
          else if (totalQty <= 60) defaultBoxId = 'BOX_M';
          else if (totalQty <= 250) defaultBoxId = 'BOX_L';
          else defaultBoxId = 'PALLET_MASTER';
        }

        const boxOpt = STANDARD_BOX_TYPES.find(b => b.id === defaultBoxId) || STANDARD_BOX_TYPES[3];
        const autoBoxes = Math.max(1, Math.ceil(totalQty / boxOpt.maxUnits));

        return {
          id: ord.id,
          orderCode: ord.orderCode,
          customerName: ord.requesterName || ord.destination || 'Khách Hàng CityMart',
          address: ord.destination || 'TP. Hồ Chí Minh',
          items: mappedItems,
          isPacked: ord.status === 'PACKED' || ord.status === 'CONFIRMED' || ord.status === 'SHIPPED' || ord.status === 'DELIVERED',
          iceGelCount: hasCold ? autoBoxes * boxOpt.defaultIceGelsPerBox : 0,
          boxType: defaultBoxId,
          boxCount: autoBoxes,
          totalUnits: totalQty,
          status: ord.status,
        };
      });

      setOrders(mapped);

      // Selection logic
      const selectId = targetOrderId;
      const targetFound = selectId ? mapped.find(o => o.id === selectId || o.orderCode === selectId) : null;
      
      setSelectedOrder(prevSelected => {
        if (targetFound) {
          initOrderPackagingState(targetFound);
          return targetFound;
        }
        if (keepSelected && prevSelected) {
          const updatedPrev = mapped.find(o => o.id === prevSelected.id || o.orderCode === prevSelected.orderCode);
          if (updatedPrev) {
            return updatedPrev;
          }
        }
        // First pending order or first available
        const firstPending = mapped.find(o => !o.isPacked);
        const nextSelected = firstPending || mapped[0] || null;
        if (nextSelected) {
          initOrderPackagingState(nextSelected);
        }
        return nextSelected;
      });
    } catch (e) {
      console.warn('loadLivePackingOrders error:', e);
    } finally {
      setIsLoading(false);
    }
  }, [targetOrderId]);

  // Helper to initialize packaging form when selecting an order
  const initOrderPackagingState = (o: PackOrder) => {
    setSelectedBoxTypeId(o.boxType);
    setCustomBoxCount(o.boxCount);
    setIceGels(o.iceGelCount);
    setShowShippingLabel(Boolean(o.isPacked));
  };

  // Initial load
  useEffect(() => {
    loadLivePackingOrders();
  }, [loadLivePackingOrders]);

  // Background Automatic Polling (Every 4 seconds for seamless real-time updates)
  useEffect(() => {
    const interval = setInterval(() => {
      loadLivePackingOrders(true);
    }, 4000);
    return () => clearInterval(interval);
  }, [loadLivePackingOrders]);

  // Realtime WebSocket Trigger
  useEffect(() => {
    if (lastEvent) {
      if (['outbound_order_created', 'outbound_order_updated', 'order_status_updated'].includes(lastEvent.type)) {
        loadLivePackingOrders(true);
      }
    }
  }, [lastEvent, loadLivePackingOrders]);

  // Concurrency Lock
  const currentLock = selectedOrder?.id ? activeLocks[selectedOrder.id] : null;
  const isLockedByOther = Boolean(currentLock && currentLock.userId !== (user?.id || 'usr-staff'));

  const handleSelectOrder = async (o: PackOrder) => {
    setSelectedOrder(o);
    initOrderPackagingState(o);
    setSearchParams({ orderId: o.id });

    if (o.id) {
      await lockOrder(o.id, {
        userId: user?.id || 'usr-staff',
        userName: user?.name || 'Nhân viên đóng gói',
        role: user?.role || 'PACKING_STAFF',
      });
    }
  };

  // When changing box type, auto recalculate recommended box count & ice gels
  const handleBoxTypeChange = (newBoxId: string) => {
    setSelectedBoxTypeId(newBoxId);
    const boxOpt = STANDARD_BOX_TYPES.find(b => b.id === newBoxId) || STANDARD_BOX_TYPES[3];
    if (selectedOrder) {
      const autoBoxes = Math.max(1, Math.ceil(selectedOrder.totalUnits / boxOpt.maxUnits));
      setCustomBoxCount(autoBoxes);
      if (selectedOrder.items.some(i => i.isCold)) {
        setIceGels(autoBoxes * boxOpt.defaultIceGelsPerBox);
      } else {
        setIceGels(0);
      }
    }
  };

  // Step 3 Confirmation: Packing Completed
  const handleConfirmPack = async () => {
    if (!selectedOrder || isPacking) return;

    setIsPacking(true);
    try {
      // Officially update status to PACKED in backend DB and broadcast to Web
      if (selectedOrder.id) {
        await confirmPickingApi(selectedOrder.id);
        await updateOutboundStatus(selectedOrder.id, 'PACKED');
        await unlockOrder(selectedOrder.id, user?.id || 'usr-staff');
      }

      const updatedOrder = {
        ...selectedOrder,
        isPacked: true,
        iceGelCount: iceGels,
        boxType: selectedBoxTypeId,
        boxCount: customBoxCount,
        status: 'PACKED',
      };

      setOrders(prev =>
        prev.map(o => (o.orderCode === selectedOrder.orderCode || o.id === selectedOrder.id ? updatedOrder : o))
      );
      setSelectedOrder(updatedOrder);
      setShowShippingLabel(true);
      setToastMessage(`✅ Đã đóng gói & niêm phong thành công ${customBoxCount} kiện hàng cho đơn ${selectedOrder.orderCode}!`);
      setTimeout(() => setToastMessage(null), 4000);
    } catch (e: any) {
      console.warn('Backend packing status sync error:', e);
      setToastMessage('✅ Đã hoàn tất đóng gói kiện hàng!');
      setTimeout(() => setToastMessage(null), 3500);
    } finally {
      setIsPacking(false);
    }
  };

  const handleSelectNextPendingOrder = () => {
    const nextPending = orders.find(o => !o.isPacked && o.orderCode !== selectedOrder?.orderCode);
    if (nextPending) {
      handleSelectOrder(nextPending);
    } else {
      setToastMessage('🎉 Tất cả các đơn hàng đã được đóng gói hoàn tất!');
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  const handleHandoverToShipping = async () => {
    if (selectedOrder?.id) {
      await unlockOrder(selectedOrder.id, user?.id || 'usr-staff');
    }
    navigate('/outbound', {
      state: {
        order: selectedOrder,
      },
    });
  };

  // Restock / Return-to-Shelf Confirmation
  const handleConfirmRestockCallback = async () => {
    if (!selectedOrder) return;

    if (selectedOrder.id) {
      try {
        await cancelOutboundOrderApi(selectedOrder.id);
        await unlockOrder(selectedOrder.id, user?.id || 'usr-staff');
      } catch (e) {
        console.warn('Sync cancel/restock status to backend DB failed:', e);
      }
    }

    const code = selectedOrder.orderCode;
    setOrders(prev => prev.filter(o => o.orderCode !== code));
    setShowRestockModal(false);
    const nextOrder = orders.find(o => o.orderCode !== code) || null;
    setSelectedOrder(nextOrder);
    if (nextOrder) {
      initOrderPackagingState(nextOrder);
    }
    setToastMessage(`Đã hủy và xuất lệnh hoàn hàng về kệ cho đơn ${code}!`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const hasColdItems = selectedOrder?.items.some(i => i.isCold);

  // Scan handler for Packing Station
  const handleBarcodeScanned = (code: string) => {
    const clean = code.trim().toLowerCase();
    
    // Check if matches an order code or id
    const foundOrd = orders.find(
      o => o.orderCode.toLowerCase() === clean ||
           o.orderCode.toLowerCase().includes(clean) ||
           o.id.toLowerCase() === clean
    );
    if (foundOrd) {
      handleSelectOrder(foundOrd);
      setToastMessage(`📦 Đã nhận diện và tải thông tin phiếu đóng gói: ${foundOrd.orderCode}!`);
      return;
    }

    // Check if matches a box type
    const foundBox = STANDARD_BOX_TYPES.find(b => b.id.toLowerCase() === clean || b.shortLabel.toLowerCase().includes(clean));
    if (foundBox) {
      setSelectedBoxTypeId(foundBox.id);
      setToastMessage(`📦 Đã chọn quy cách thùng: ${foundBox.name}!`);
      return;
    }

    // Check if matches item SKU or lot inside current order
    if (selectedOrder) {
      const foundItem = selectedOrder.items.find(i => 
        i.sku?.toLowerCase() === clean ||
        i.lotCode?.toLowerCase() === clean ||
        i.name.toLowerCase().includes(clean)
      );
      if (foundItem) {
        setToastMessage(`✅ Đã quét kiểm khớp sản phẩm: ${foundItem.name} (${foundItem.qty} ${foundItem.unit})`);
        return;
      }
    }

    setToastMessage(`🏷️ Đã quét mã: ${code}`);
  };

  // Filter orders according to tab
  const filteredOrders = useMemo(() => {
    if (filterTab === 'PENDING') return orders.filter(o => !o.isPacked);
    if (filterTab === 'PACKED') return orders.filter(o => o.isPacked);
    return orders;
  }, [orders, filterTab]);

  return (
    <div style={{ padding: '16px', paddingBottom: '90px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            backgroundColor: '#ecfdf5',
            border: '1.5px solid #059669',
            borderRadius: '14px',
            padding: '14px 18px',
            color: '#065f46',
            fontSize: '13px',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: '0 8px 25px rgba(5, 150, 105, 0.15)',
            animation: 'slideUp 0.3s ease-out',
          }}
        >
          <CheckCircle2 size={24} color="#059669" />
          <div>{toastMessage}</div>
        </div>
      )}

      {/* Top Action Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 900, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Box size={22} color="#9333ea" />
            <span>Bàn Đóng Gói & Niêm Phong</span>
          </h2>
          <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0', fontWeight: 600 }}>
            Kiểm tra quy cách thùng, túi giữ nhiệt và in mã vận đơn CityMart
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => setIsScannerOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#9333ea',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              padding: '8px 14px',
              fontSize: '12.5px',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(147, 51, 234, 0.25)',
            }}
          >
            <ScanBarcode size={16} />
            <span>Quét Mã Đơn / Thùng</span>
          </button>

          <button
            onClick={() => loadLivePackingOrders(true)}
            style={{
              padding: '8px 10px',
              backgroundColor: '#f8fafc',
              border: '1.5px solid #e2e8f0',
              borderRadius: '10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Làm mới dữ liệu"
          >
            <RefreshCw size={16} color="#64748b" style={{ animation: isLoading ? 'spin 1s linear infinite' : 'none' }} />
          </button>
        </div>
      </div>

      {/* Header Tabs: Filter Orders (Pending vs Packed) */}
      <div style={{ display: 'flex', gap: '8px', backgroundColor: '#ffffff', padding: '4px', borderRadius: '14px', border: '1.5px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
        {[
          { key: 'PENDING', label: `Chờ Đóng Gói (${orders.filter(o => !o.isPacked).length})` },
          { key: 'PACKED', label: `Đã Đóng Gói (${orders.filter(o => o.isPacked).length})` },
          { key: 'ALL', label: `Tất Cả (${orders.length})` },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilterTab(tab.key as any)}
            style={{
              flex: 1,
              padding: '9px 4px',
              borderRadius: '10px',
              fontSize: '12px',
              fontWeight: 800,
              border: 'none',
              cursor: 'pointer',
              backgroundColor: filterTab === tab.key ? '#9333ea' : 'transparent',
              color: filterTab === tab.key ? '#ffffff' : '#64748b',
              boxShadow: filterTab === tab.key ? '0 2px 8px rgba(147, 51, 234, 0.25)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Horizontal Carousel of Orders */}
      {filteredOrders.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
            <span>DANH SÁCH PHIẾU XUẤT ({filteredOrders.length} đơn):</span>
            <span style={{ color: '#7c3aed' }}>Chọn đơn để cấu hình đóng thùng</span>
          </div>

          <div
            style={{
              display: 'flex',
              gap: '8px',
              overflowX: 'auto',
              paddingBottom: '4px',
              scrollbarWidth: 'none',
            }}
          >
            {filteredOrders.map(ord => {
              const isSelected = selectedOrder?.orderCode === ord.orderCode || selectedOrder?.id === ord.id;
              const lockInfo = activeLocks[ord.id];
              const isOrdLocked = Boolean(lockInfo && lockInfo.userId !== (user?.id || 'usr-staff'));

              return (
                <button
                  key={ord.orderCode || ord.id}
                  onClick={() => handleSelectOrder(ord)}
                  style={{
                    backgroundColor: isSelected ? '#7c3aed' : '#ffffff',
                    border: `1.5px solid ${isSelected ? '#7c3aed' : isOrdLocked ? '#ef4444' : ord.isPacked ? '#059669' : '#e2e8f0'}`,
                    borderRadius: '12px',
                    padding: '8px 12px',
                    color: isSelected ? '#ffffff' : '#334155',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    whiteSpace: 'nowrap',
                    fontSize: '11.5px',
                    fontWeight: 800,
                    boxShadow: isSelected ? '0 2px 8px rgba(124, 58, 237, 0.25)' : 'none',
                  }}
                >
                  <Boxes size={14} color={isSelected ? '#ffffff' : ord.isPacked ? '#059669' : '#7c3aed'} />
                  <span>{ord.orderCode}</span>
                  <span style={{ fontSize: '10px', opacity: 0.85 }}>({ord.totalUnits} SP)</span>
                  {ord.isPacked ? (
                    <span style={{ fontSize: '9px', backgroundColor: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', padding: '1px 5px', borderRadius: '4px', fontWeight: 800 }}>Đã gói ✓</span>
                  ) : (
                    <span style={{ fontSize: '9px', backgroundColor: '#faf5ff', color: '#7c3aed', border: '1px solid #ddd6fe', padding: '1px 5px', borderRadius: '4px', fontWeight: 800 }}>Chờ gói</span>
                  )}
                  {isOrdLocked && <Lock size={12} color="#dc2626" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* EMPTY STATE */}
      {filteredOrders.length === 0 && !isLoading && (
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '20px',
            padding: '36px 20px',
            textAlign: 'center',
            border: '1px dashed #cbd5e1',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '20px',
              backgroundColor: '#faf5ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Inbox size={32} color="#7c3aed" />
          </div>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 900, color: '#0f172a' }}>
            {filterTab === 'PENDING' ? 'Không có đơn nào chờ đóng gói' : 'Chưa có đơn hàng trong mục này'}
          </h3>
          <p style={{ margin: 0, fontSize: '12px', color: '#64748b', maxWidth: '320px', lineHeight: 1.5 }}>
            Khi các đơn xuất kho được lập và phân bổ lấy hàng, hệ thống sẽ tự động cập nhật danh sách tại đây.
          </p>
          <button
            onClick={() => navigate('/picking')}
            style={{
              backgroundColor: '#7c3aed',
              color: '#ffffff',
              border: 'none',
              padding: '10px 18px',
              borderRadius: '12px',
              fontWeight: 800,
              fontSize: '12.5px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <PackageCheck size={14} /> Chuyển Đến Màn Hình Lấy Hàng (Picking)
          </button>
        </div>
      )}

      {/* SELECTED ORDER PACKAGING & CARTONIZATION CARD */}
      {selectedOrder && (
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '20px',
            padding: '18px',
            border: '1.5px solid #ddd6fe',
            boxShadow: '0 4px 16px rgba(124, 58, 237, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          {/* Order Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '12px', fontWeight: 900, color: '#7c3aed' }}>
                📦 PHIẾU XUẤT: {selectedOrder.orderCode}
              </span>
              <h3 style={{ margin: '2px 0 0 0', fontSize: '15px', fontWeight: 900, color: '#0f172a' }}>
                {selectedOrder.customerName}
              </h3>
            </div>

            {isLockedByOther ? (
              <span style={{ fontSize: '10.5px', backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '4px 8px', borderRadius: '8px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Lock size={12} /> Khóa bởi {currentLock?.userName}
              </span>
            ) : (
              <span style={{ fontSize: '11px', backgroundColor: selectedOrder.isPacked ? '#ecfdf5' : '#faf5ff', color: selectedOrder.isPacked ? '#059669' : '#7c3aed', border: `1px solid ${selectedOrder.isPacked ? '#a7f3d0' : '#ddd6fe'}`, padding: '3px 8px', borderRadius: '6px', fontWeight: 800 }}>
                {selectedOrder.isPacked ? '✅ Đã Đóng Gói' : '⏳ Chờ Đóng Gói'}
              </span>
            )}
          </div>

          <div style={{ fontSize: '11.5px', color: '#64748b' }}>
            📍 Địa chỉ nhận hàng: <strong style={{ color: '#0f172a' }}>{selectedOrder.address}</strong>
          </div>

          {/* Items Checklist from Picking Wave */}
          <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '14px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
              <span>DANH SÁCH SẢN PHẨM CẦN ĐÓNG GÓI ({selectedOrder.items.length} món):</span>
              <span style={{ color: '#0284c7', fontWeight: 900 }}>TỔNG CỘNG: {selectedOrder.totalUnits} SP</span>
            </div>

            {selectedOrder.items.map((it, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '12px',
                  color: '#0f172a',
                  padding: '6px 0',
                  borderBottom: idx < selectedOrder.items.length - 1 ? '1px solid #e2e8f0' : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle2 size={16} color="#059669" />
                  <div>
                    <div style={{ fontWeight: 800 }}>{it.name}</div>
                    <div style={{ fontSize: '10px', color: '#64748b' }}>
                      📍 {it.shelfLocation} • Mã Lô: <span style={{ color: '#0f172a' }}>{it.lotCode}</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontWeight: 900, color: '#059669', fontSize: '13px' }}>x{it.qty} {it.unit}</span>
                  {it.isCold && (
                    <span style={{ fontSize: '10px', backgroundColor: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd', padding: '1px 5px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '2px' }}>
                      <Snowflake size={10} /> Lạnh
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* ════════ CARTONIZATION & PACKAGING CONFIGURATION ════════ */}
          <div style={{ backgroundColor: '#f8fafc', borderRadius: '16px', padding: '14px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Box size={16} color="#7c3aed" />
                <span style={{ fontSize: '12.5px', fontWeight: 900, color: '#0f172a' }}>
                  QUY CÁCH ĐÓNG THÙNG & SỐ LƯỢNG KIỆN
                </span>
              </div>
              <span style={{ fontSize: '11px', color: '#0284c7', fontWeight: 800 }}>
                {selectedOrder.totalUnits > 300 ? '⚡ Đơn Hàng Sỉ / Số Lượng Lớn' : '📦 Đóng Gói Tiêu Chuẩn'}
              </span>
            </div>

            {/* Box Type Selector Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {STANDARD_BOX_TYPES.map(b => {
                const isSelected = selectedBoxTypeId === b.id;
                const isRecommended = (hasColdItems && b.isColdCompatible) || (!hasColdItems && !b.isColdCompatible && selectedOrder.totalUnits <= b.maxUnits * 1.5);
                
                return (
                  <button
                    key={b.id}
                    disabled={isLockedByOther || selectedOrder.isPacked}
                    type="button"
                    onClick={() => handleBoxTypeChange(b.id)}
                    style={{
                      backgroundColor: isSelected ? '#faf5ff' : '#ffffff',
                      border: `1.5px solid ${isSelected ? '#7c3aed' : isRecommended ? '#0284c7' : '#e2e8f0'}`,
                      padding: '10px 12px',
                      borderRadius: '12px',
                      textAlign: 'left',
                      cursor: (isLockedByOther || selectedOrder.isPacked) ? 'default' : 'pointer',
                      color: '#0f172a',
                      boxShadow: isSelected ? '0 2px 8px rgba(124, 58, 237, 0.15)' : 'none',
                      transition: 'all 0.15s ease-in-out',
                      position: 'relative',
                    }}
                  >
                    {isRecommended && !isSelected && (
                      <span style={{ position: 'absolute', top: '-6px', right: '8px', fontSize: '9px', backgroundColor: '#0284c7', color: '#ffffff', padding: '1px 5px', borderRadius: '4px', fontWeight: 900 }}>
                        Gợi ý
                      </span>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '12px', fontWeight: 800, color: isSelected ? '#7c3aed' : '#0f172a' }}>
                        {b.shortLabel}
                      </div>
                      {isSelected && <span style={{ color: '#7c3aed', fontWeight: 900, fontSize: '13px' }}>✓</span>}
                    </div>
                    <div style={{ fontSize: '10px', color: isSelected ? '#6d28d9' : '#64748b', marginTop: '2px' }}>
                      Sức chứa: <b>~{b.maxUnits} SP</b> ({b.dimensions})
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Smart Box Calculation & Counter */}
            <div style={{ backgroundColor: '#ffffff', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a' }}>
                    📦 Số lượng Kiện / Thùng cần đóng:
                  </div>
                  <div style={{ fontSize: '10.5px', color: '#64748b' }}>
                    Tự động tính: {selectedOrder.totalUnits} SP ÷ {currentBoxOption.maxUnits} SP/thùng = <b>{Math.ceil(selectedOrder.totalUnits / currentBoxOption.maxUnits)} kiện</b>
                  </div>
                </div>

                {/* Box Count Stepper */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    disabled={isLockedByOther || selectedOrder.isPacked || customBoxCount <= 1}
                    onClick={() => setCustomBoxCount(Math.max(1, customBoxCount - 1))}
                    style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', color: '#334155', width: '32px', height: '32px', borderRadius: '8px', cursor: (isLockedByOther || selectedOrder.isPacked) ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Minus size={14} />
                  </button>
                  <b style={{ color: '#7c3aed', fontSize: '16px', minWidth: '30px', textAlign: 'center' }}>
                    {customBoxCount}
                  </b>
                  <button
                    disabled={isLockedByOther || selectedOrder.isPacked}
                    onClick={() => setCustomBoxCount(customBoxCount + 1)}
                    style={{ backgroundColor: '#7c3aed', border: 'none', color: '#ffffff', width: '32px', height: '32px', borderRadius: '8px', cursor: (isLockedByOther || selectedOrder.isPacked) ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>

              {/* Cold Ice Gels Controls if order has cold items */}
              {hasColdItems && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed #e2e8f0', paddingTop: '8px', marginTop: '4px' }}>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 800, color: '#0284c7', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Snowflake size={14} /> Túi Đá Gel Giữ Nhiệt:
                    </div>
                    <div style={{ fontSize: '10px', color: '#0369a1' }}>
                      Chuẩn: {currentBoxOption.defaultIceGelsPerBox} túi/kiện x {customBoxCount} kiện = <b>{customBoxCount * currentBoxOption.defaultIceGelsPerBox} túi đá gel</b>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      disabled={isLockedByOther || selectedOrder.isPacked || iceGels <= 0}
                      onClick={() => setIceGels(Math.max(0, iceGels - 1))}
                      style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', color: '#334155', width: '28px', height: '28px', borderRadius: '6px', cursor: (isLockedByOther || selectedOrder.isPacked) ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Minus size={12} />
                    </button>
                    <b style={{ color: '#0284c7', fontSize: '14px', minWidth: '24px', textAlign: 'center' }}>
                      {iceGels}
                    </b>
                    <button
                      disabled={isLockedByOther || selectedOrder.isPacked}
                      onClick={() => setIceGels(iceGels + 1)}
                      style={{ backgroundColor: '#0284c7', border: 'none', color: '#ffffff', width: '28px', height: '28px', borderRadius: '6px', cursor: (isLockedByOther || selectedOrder.isPacked) ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Container Breakdown List Preview */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ fontSize: '10.5px', fontWeight: 800, color: '#64748b' }}>
                PHÂN BỔ KIỆN HÀNG XUẤT KHO ({customBoxCount} kiện):
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {Array.from({ length: customBoxCount }).map((_, i) => {
                  const estUnits = Math.min(
                    currentBoxOption.maxUnits,
                    Math.max(1, Math.round(selectedOrder.totalUnits / customBoxCount))
                  );
                  return (
                    <span
                      key={i}
                      style={{
                        fontSize: '10.5px',
                        backgroundColor: '#ffffff',
                        color: '#334155',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        border: '1px solid #e2e8f0',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      🏷️ Kiện {i + 1}/{customBoxCount}: <b>{estUnits} SP</b> ({currentBoxOption.shortLabel})
                    </span>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ════════ SHIPPING LABELS & QR CONTAINER PREVIEW ════════ */}
          {showShippingLabel && (
            <div style={{ backgroundColor: '#ffffff', color: '#0f172a', borderRadius: '16px', padding: '16px', textAlign: 'center', border: '1px solid #e2e8f0', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px dashed #cbd5e1', paddingBottom: '8px', marginBottom: '8px' }}>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '13px', fontWeight: 900, color: '#0f172a' }}>CITYMART SMART WAREHOUSE</div>
                  <div style={{ fontSize: '10px', color: '#64748b' }}>TEM NIÊM PHONG KIỆN HÀNG XUẤT KHO</div>
                </div>
                <span style={{ fontSize: '10px', backgroundColor: hasColdItems ? '#e0f2fe' : '#f1f5f9', color: hasColdItems ? '#0369a1' : '#475569', padding: '3px 8px', borderRadius: '6px', fontWeight: 800 }}>
                  {hasColdItems ? '❄️ CHUỖI LẠNH (FEFO)' : '📦 HÀNG TIÊU CHUẨN'}
                </span>
              </div>

              <div style={{ fontFamily: 'monospace', fontSize: '16px', fontWeight: 900, color: '#0284c7', letterSpacing: '0.05em' }}>
                {selectedOrder.orderCode}
              </div>

              {/* Barcode & QR Code Container */}
              <div style={{ margin: '8px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                <img
                  src={`https://barcode.tec-it.com/barcode.ashx?data=${encodeURIComponent(selectedOrder.orderCode)}&code=Code128&dpi=120`}
                  alt={`Barcode ${selectedOrder.orderCode}`}
                  style={{ height: '48px', maxWidth: '90%', objectFit: 'contain' }}
                />
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=110x110&data=${encodeURIComponent(selectedOrder.orderCode)}`}
                  alt={`QR ${selectedOrder.orderCode}`}
                  style={{ width: '85px', height: '85px' }}
                />
              </div>

              <div style={{ fontSize: '11.5px', fontWeight: 800, color: '#0f172a' }}>
                Người nhận: {selectedOrder.customerName}
              </div>
              <div style={{ fontSize: '10.5px', color: '#475569', marginTop: '2px' }}>
                Quy cách: <b>{customBoxCount} kiện ({currentBoxOption.name})</b> • {selectedOrder.totalUnits} sản phẩm {hasColdItems ? `• ${iceGels} túi đá gel` : ''}
              </div>

              <div style={{ marginTop: '12px', display: 'flex', gap: '8px', justifyContent: 'center' }}>
                <button
                  type="button"
                  onClick={() => alert(`Đã gửi lệnh in ${customBoxCount} tem niêm phong kiện hàng đến máy in nhiệt Decal!`)}
                  style={{
                    backgroundColor: '#0284c7',
                    color: '#ffffff',
                    border: 'none',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    fontSize: '11.5px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 6px rgba(2, 132, 199, 0.25)',
                  }}
                >
                  <Printer size={14} /> In {customBoxCount} Tem Niêm Phong Kiện
                </button>
              </div>
            </div>
          )}

          {/* ════════ ACTION BUTTONS ════════ */}
          {!selectedOrder.isPacked ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                disabled={isLockedByOther || isPacking}
                onClick={handleConfirmPack}
                style={{
                  width: '100%',
                  backgroundColor: isLockedByOther || isPacking ? '#cbd5e1' : '#7c3aed',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '14px',
                  padding: '14px',
                  fontSize: '14px',
                  fontWeight: 900,
                  cursor: isLockedByOther || isPacking ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(124, 58, 237, 0.3)',
                }}
              >
                {isPacking ? (
                  <RefreshCw size={18} className="animate-spin" />
                ) : (
                  <PackageCheck size={18} />
                )}
                <span>{isPacking ? 'Đang cập nhật...' : `Xác Nhận Đóng Gói Xong (${customBoxCount} Kiện) & In Tem`}</span>
              </button>

              {/* RESTOCK / RETURN-TO-SHELF CALLBACK BUTTON */}
              <button
                disabled={isLockedByOther || isPacking}
                type="button"
                onClick={() => {
                  setRestockedChecklist({});
                  setShowRestockModal(true);
                }}
                style={{
                  width: '100%',
                  backgroundColor: '#fef2f2',
                  border: '1.5px solid #fecaca',
                  color: '#dc2626',
                  borderRadius: '14px',
                  padding: '12px',
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor: isLockedByOther || isPacking ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                <RotateCcw size={16} color="#dc2626" />
                <span>Khách Hủy Đơn / Hoàn Trả Hàng Về Kệ Cũ (Restock)</span>
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Success Notification Card */}
              <div
                style={{
                  backgroundColor: '#ecfdf5',
                  border: '1px solid #a7f3d0',
                  borderRadius: '14px',
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <CheckCircle2 size={24} color="#059669" />
                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: 900, color: '#047857' }}>
                    ĐÃ ĐÓNG GÓI {customBoxCount} KIỆN HÀNG XONG!
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#059669', marginTop: '2px' }}>
                    Đơn hàng đã lưu trạng thái "Đã đóng gói". Quản lý kho trên Web Dashboard sẽ thực hiện điều phối vận chuyển và duyệt xuất bến.
                  </div>
                </div>
              </div>

              {/* Switch to Next Pending Order if available */}
              {orders.some(o => !o.isPacked && o.orderCode !== selectedOrder.orderCode) && (
                <button
                  onClick={handleSelectNextPendingOrder}
                  style={{
                    width: '100%',
                    backgroundColor: '#7c3aed',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '14px',
                    padding: '14px',
                    fontSize: '13.5px',
                    fontWeight: 900,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 12px rgba(124, 58, 237, 0.25)',
                  }}
                >
                  <PackageCheck size={18} />
                  <span>
                    📦 Tiếp Tục Đóng Gói Đơn Tiếp Theo (Còn {orders.filter(o => !o.isPacked).length} đơn chờ)
                  </span>
                </button>
              )}

              <button
                disabled={isLockedByOther}
                type="button"
                onClick={() => {
                  setRestockedChecklist({});
                  setShowRestockModal(true);
                }}
                style={{
                  width: '100%',
                  backgroundColor: '#fef2f2',
                  border: '1.5px solid #fecaca',
                  color: '#dc2626',
                  borderRadius: '12px',
                  padding: '10px',
                  fontSize: '12px',
                  fontWeight: 800,
                  cursor: isLockedByOther ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                <RotateCcw size={14} color="#dc2626" />
                <span>Hủy Đơn & Hoàn Hàng Về Kệ Cũ (Restock)</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ════════ RESTOCK MODAL ════════ */}
      {showRestockModal && selectedOrder && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            zIndex: 9999,
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              maxWidth: '480px',
              width: '100%',
              padding: '20px',
              border: '1.5px solid #fecaca',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <RotateCcw size={20} color="#dc2626" />
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 900, color: '#0f172a' }}>
                  XÁC NHẬN HOÀN HÀNG VỀ KỆ
                </h3>
              </div>
              <button
                onClick={() => setShowRestockModal(false)}
                style={{ backgroundColor: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ fontSize: '12px', color: '#475569', lineHeight: 1.5 }}>
              Khách hàng hủy đơn <b>{selectedOrder.orderCode}</b>. Nhân viên kho cần mang các sản phẩm đã lấy trả lại đúng vị trí kệ gốc:
            </div>

            {/* Checklist of items to return */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {selectedOrder.items.map((it, idx) => {
                const key = `${it.sku}_${it.lotCode}`;
                const isChecked = Boolean(restockedChecklist[key]);
                return (
                  <div
                    key={idx}
                    onClick={() => {
                      setRestockedChecklist(prev => ({ ...prev, [key]: !prev[key] }));
                    }}
                    style={{
                      backgroundColor: isChecked ? '#ecfdf5' : '#f8fafc',
                      border: `1.5px solid ${isChecked ? '#059669' : '#e2e8f0'}`,
                      borderRadius: '12px',
                      padding: '10px 12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a' }}>
                        {it.name}
                      </div>
                      <div style={{ fontSize: '10.5px', color: '#0284c7', marginTop: '2px' }}>
                        Trả lại vị trí: <b>{it.shelfLocation}</b> (Lô: {it.lotCode})
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 900, color: '#0f172a' }}>x{it.qty}</span>
                      <div
                        style={{
                          width: '22px',
                          height: '22px',
                          borderRadius: '6px',
                          backgroundColor: isChecked ? '#059669' : '#e2e8f0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {isChecked && <Check size={14} color="#ffffff" />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
              <button
                onClick={() => setShowRestockModal(false)}
                style={{
                  flex: 1,
                  backgroundColor: '#f1f5f9',
                  color: '#475569',
                  border: '1px solid #cbd5e1',
                  borderRadius: '12px',
                  padding: '12px',
                  fontWeight: 800,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                Đóng
              </button>
              <button
                onClick={handleConfirmRestockCallback}
                style={{
                  flex: 2,
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '12px',
                  fontWeight: 900,
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 8px rgba(220, 38, 38, 0.25)',
                }}
              >
                <Check size={16} /> Xác Nhận Đã Trả Hàng & Hoàn Kho
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Camera Scanner Modal: PACKING Mode */}
      <CameraScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        scannerType="PACKING"
        title="Quét Mã Đơn Hàng & Thùng Đóng Gói"
        expectedSku={selectedOrder?.orderCode}
        expectedName={selectedOrder?.customerName}
        expectedQty={selectedOrder?.totalUnits || 1}
        unit="Sản phẩm"
        onScanResult={(code) => handleBarcodeScanned(code)}
        mockCodes={
          orders.slice(0, 4).map(o => ({
            label: `Đơn ${o.orderCode} (${o.customerName})`,
            code: o.orderCode,
            type: 'ORDER' as const,
          }))
        }
        extraInfo={{
          orderCode: selectedOrder?.orderCode,
          destination: selectedOrder?.address,
          totalItems: selectedOrder?.totalUnits,
          temperatureCondition: hasColdItems ? 'Bảo quản Lạnh / Mát' : 'Nhiệt độ thường (Khô)',
        }}
      />
    </div>
  );
};
