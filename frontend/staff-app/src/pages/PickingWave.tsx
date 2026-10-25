import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Boxes,
  ScanBarcode,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  Snowflake,
  Clock,
  ArrowRight,
  Sparkles,
  Compass,
  Layers,
  ChevronRight,
  TrendingDown,
  ExternalLink,
  RefreshCw,
  PackageCheck,
  Truck,
  Lock,
  Wifi,
  WifiOff,
  Inbox,
  Volume2,
  VolumeX,
  FileSpreadsheet,
  Key,
} from 'lucide-react';
import { PickingItem } from '../types';
import { CameraScannerModal } from '../components/CameraScannerModal';
import { Mobile3DWarehouseView } from '../components/Mobile3DWarehouseView';
import { formatStandardShelfLocation } from '../constants/warehouseRacks';
import { ShiftHandoverModal } from '../components/ShiftHandoverModal';
import { IncidentReportModal } from '../components/IncidentReportModal';
import { optimizePickingRoute } from '../utils/pickingRouteOptimizer';
import { useHardwareScanner } from '../utils/useHardwareScanner';
import { voiceAssistant } from '../utils/voiceAssistant';
import {
  fetchOutboundOrders,
  fetchInventoryLots,
  fetchProducts,
  confirmOutboundOrder,
  confirmPickingApi,
  updateOutboundStatus,
  updatePickedItemsApi,
  ApiOutboundOrder,
  locateShelfIotApi,
  chirpShelfIotApi,
  completeShelfIotApi,
} from '../services/api';
import { useStaffWebSocket } from '../context/WebSocketContext';
import { useAuth } from '../context/AuthContext';

export const PickingWave: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const targetOrderId = searchParams.get('orderId');

  const { user, activeWarehouse } = useAuth();
  const effectiveWhCode = user?.warehouseCode || activeWarehouse || 'WH-006';
  const { isConnected, activeLocks, lockOrder, unlockOrder, lastEvent } = useStaffWebSocket();

  const [activeTab, setActiveTab] = useState<'3D_MAP' | 'ITEMS_LIST'>('3D_MAP');
  const [itemFilterTab, setItemFilterTab] = useState<'ALL' | 'PENDING' | 'PICKED'>('ALL');
  const [items, setItems] = useState<PickingItem[]>([]);
  const [allWaveItems, setAllWaveItems] = useState<PickingItem[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string>('ALL');
  const [availableOrders, setAvailableOrders] = useState<ApiOutboundOrder[]>([]);
  const [liveLots, setLiveLots] = useState<any[]>([]);
  const [liveProducts, setLiveProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeScanItem, setActiveScanItem] = useState<PickingItem | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'SUCCESS' | 'ERROR'; text: string } | null>(null);
  const [isConfirmingOutbound, setIsConfirmingOutbound] = useState<boolean>(false);

  // Enterprise Modals & Voice Guidance States
  const [isVoiceEnabled, setIsVoiceEnabled] = useState<boolean>(true);
  const [isShiftModalOpen, setIsShiftModalOpen] = useState<boolean>(false);
  const [isIncidentModalOpen, setIsIncidentModalOpen] = useState<boolean>(false);
  const [activeLocatingShelf, setActiveLocatingShelf] = useState<string | null>(null);
  const [smartkeyPingingShelf, setSmartkeyPingingShelf] = useState<string | null>(null);

  const handleLocateShelf = async (item: PickingItem) => {
    if (activeLocatingShelf === item.shelfLocation) {
      setActiveLocatingShelf(null);
      await completeShelfIotApi({
        warehouseCode: effectiveWhCode || 'GV',
        shelfCode: item.shelfLocation,
      });
      return;
    }

    setActiveLocatingShelf(item.shelfLocation);
    // Play radar sonar ping sound effect on mobile (default: visual LED blink on IoT)
    voiceAssistant.playTone('LOCATE');

    await locateShelfIotApi({
      warehouseCode: effectiveWhCode || 'GV',
      shelfCode: item.shelfLocation,
      productName: item.productName,
      qty: item.quantity,
    });
  };

  // Smartkey Horn Chirp (Bóp còi tìm kệ như Smartkey ô tô / xe máy)
  const handleSmartkeyChirp = async (item: PickingItem) => {
    setSmartkeyPingingShelf(item.shelfLocation);
    // Play realistic car/motorbike key-fob double chirp sound ("Pip-Pip!")
    voiceAssistant.playTone('SMARTKEY');

    // Trigger IoT Smartkey horn chirp on hardware node
    await chirpShelfIotApi({
      warehouseCode: effectiveWhCode || 'GV',
      shelfCode: item.shelfLocation,
    });

    setTimeout(() => {
      setSmartkeyPingingShelf(null);
    }, 1200);
  };

  // Helper to format shelf location from DB lot location
  const formatShelfLocation = (rawLoc?: string, zone?: string, fallbackIdx: number = 1): string => {
    return formatStandardShelfLocation(rawLoc, zone, fallbackIdx);
  };

  // Helper to map an order's items
  const mapOrderItems = useCallback(
    (ord: ApiOutboundOrder, lotMap: Map<string, any>, prodMap: Map<string, any>, skuLotsMap: Map<string, any[]>): PickingItem[] => {
      if (!ord.items || ord.items.length === 0) return [];
      return ord.items.map((it, idx) => {
        const matchingLots = it.sku ? (skuLotsMap.get(it.sku) || []) : [];
        const dbLot = (it.lotCode ? lotMap.get(it.lotCode) : null) || matchingLots[0] || (it.productId ? lotMap.get(it.productId) : null);
        const dbProd = (it.sku ? prodMap.get(it.sku) : null) || (dbLot?.productId ? prodMap.get(dbLot.productId) : null);

        const z = (dbLot?.zone || it.zone || 'DRY').toUpperCase() as 'DRY' | 'COOL' | 'FROZEN';
        const loc = formatShelfLocation(dbLot?.location || it.slotId || it.location || it.shelfLocation, z, idx + 1);

        const exactQty = Number(
          (it as any).requestedQuantity !== undefined
            ? (it as any).requestedQuantity
            : it.quantity !== undefined
            ? it.quantity
            : ord.totalQuantity !== undefined && ord.items && ord.items.length === 1
            ? ord.totalQuantity
            : (dbLot?.remainingQty !== undefined ? dbLot.remainingQty : dbLot?.quantity || 1)
        );

        // Retrieve persisted picked progress from localStorage or backend
        const cachedPicked = localStorage.getItem(`citymart_picked_qty_${it.id}`) || localStorage.getItem(`citymart_picked_qty_${ord.orderCode}_${it.sku}`);
        const currentPicked = Number(it.pickedQuantity > 0 ? it.pickedQuantity : (cachedPicked ? Number(cachedPicked) : 0));
        const isItemPicked = (currentPicked >= exactQty && exactQty > 0) || it.status === 'PICKED';

        return {
          id: it.id || `pk-${ord.id || ord.orderCode}-${idx + 1}`,
          orderId: ord.id,
          orderCode: ord.orderCode,
          sku: it.sku || dbLot?.sku || `EM-${idx + 100}`,
          productName: it.productName || dbProd?.name || 'Sản phẩm xuất kho',
          quantity: exactQty,
          pickedQuantity: currentPicked,
          unit: it.unit || dbProd?.unit || 'Khay',
          lotCode: dbLot?.lotCode || it.lotCode || `LOT-EM-${idx + 100}`,
          expiryDate: it.expiryDate || dbLot?.expiryDate ? new Date(it.expiryDate || dbLot?.expiryDate).toLocaleDateString('vi-VN') : '15/09/2026',
          shelfLocation: loc,
          location: loc,
          zone: z,
          barcode: it.barcode || dbProd?.barcode || `893456789${idx + 1000}`,
          status: isItemPicked ? 'PICKED' : 'PENDING',
          temperatureRequired: z === 'COOL' ? '0-4°C' : z === 'FROZEN' ? '-18°C' : '+25°C',
          imageUrl: dbProd?.imageUrl,
        };
      });
    },
    []
  );

  const lotsCacheRef = React.useRef<any[]>([]);
  const productsCacheRef = React.useRef<any[]>([]);

  // Sync Live Data from Backend Microservices
  const loadLiveData = useCallback(async (isSilent: boolean = false) => {
    if (!isSilent) {
      setIsLoading(true);
    }
    try {
      const needStaticData = lotsCacheRef.current.length === 0 || productsCacheRef.current.length === 0;

      const [orders, lots, products] = await Promise.all([
        fetchOutboundOrders(effectiveWhCode),
        needStaticData ? fetchInventoryLots({ warehouseCode: effectiveWhCode, limit: 10000 }) : Promise.resolve(lotsCacheRef.current),
        needStaticData ? fetchProducts() : Promise.resolve(productsCacheRef.current),
      ]);

      if (Array.isArray(lots) && lots.length > 0) {
        lotsCacheRef.current = lots;
        setLiveLots(lots);
      }
      if (Array.isArray(products) && products.length > 0) {
        productsCacheRef.current = products;
        setLiveProducts(products);
      }

      const activeLots = lotsCacheRef.current;
      const activeProducts = productsCacheRef.current;

      const prodMap = new Map<string, any>();
      activeProducts.forEach((p: any) => {
        prodMap.set(p.sku, p);
        prodMap.set(p.id, p);
      });

      const lotMap = new Map<string, any>();
      const skuLotsMap = new Map<string, any[]>();
      activeLots.forEach((l: any) => {
        lotMap.set(l.lotCode, l);
        lotMap.set(l.id, l);
        if (l.sku) {
          if (!skuLotsMap.has(l.sku)) skuLotsMap.set(l.sku, []);
          skuLotsMap.get(l.sku)!.push(l);
        }
        if (l.productId) {
          const prod = prodMap.get(l.productId);
          if (prod?.sku) {
            if (!skuLotsMap.has(prod.sku)) skuLotsMap.set(prod.sku, []);
            skuLotsMap.get(prod.sku)!.push(l);
          }
        }
      });

      // Filter Pending or Picking orders
      const pendingOrders = orders.filter(o => o.status === 'PENDING' || o.status === 'PICKING');
      setAvailableOrders(pendingOrders);

      // Aggregate ALL items across all pending orders
      const aggregatedItems: PickingItem[] = [];
      pendingOrders.forEach(ord => {
        const mapped = mapOrderItems(ord, lotMap, prodMap, skuLotsMap);
        aggregatedItems.push(...mapped);
      });

      setAllWaveItems(aggregatedItems);

      // Preserve current filter or apply targetOrderId
      setSelectedOrderId(prevFilter => {
        const activeFilterId = (targetOrderId && pendingOrders.some(o => o.id === targetOrderId || o.orderCode === targetOrderId))
          ? targetOrderId
          : (prevFilter !== 'ALL' && pendingOrders.some(o => o.id === prevFilter || o.orderCode === prevFilter))
          ? prevFilter
          : 'ALL';

        if (activeFilterId === 'ALL') {
          setItems(aggregatedItems);
        } else {
          const filtered = aggregatedItems.filter(i => i.orderId === activeFilterId || i.orderCode === activeFilterId);
          setItems(filtered);
        }
        return activeFilterId;
      });
    } catch (e) {
      console.warn('Live picking load error:', e);
      if (!isSilent) {
        setAllWaveItems([]);
        setItems([]);
      }
    } finally {
      if (!isSilent) {
        setIsLoading(false);
      }
    }
  }, [targetOrderId, effectiveWhCode, mapOrderItems]);

  // When selected filter changes
  const handleSelectOrderFilter = (ordId: string) => {
    setSelectedOrderId(ordId);
    if (ordId === 'ALL') {
      setSearchParams({});
      setItems(allWaveItems);
    } else {
      setSearchParams({ orderId: ordId });
      setItems(allWaveItems.filter(i => i.orderId === ordId || i.orderCode === ordId));
    }
  };

  // Initial load and silent high-speed polling every 3 seconds
  useEffect(() => {
    loadLiveData(false);
    const interval = setInterval(() => {
      loadLiveData(true);
    }, 3000);
    return () => clearInterval(interval);
  }, [loadLiveData]);

  // Realtime WebSocket trigger immediate silent reload when new orders arrive
  useEffect(() => {
    if (lastEvent) {
      if (['outbound_order_created', 'new_order', 'order_created', 'outbound_order_updated', 'order_status_updated', 'all_alerts'].includes(lastEvent.type)) {
        loadLiveData(true);
      }
    }
  }, [lastEvent, loadLiveData]);

  const currentSelectedOrder = useMemo(() => {
    if (selectedOrderId === 'ALL') return null;
    return availableOrders.find(o => o.id === selectedOrderId || o.orderCode === selectedOrderId) || null;
  }, [selectedOrderId, availableOrders]);

  // Lock Checking: Is the currently active order or scan item locked by someone else?
  const currentLock = useMemo(() => {
    if (activeScanItem?.orderId && activeLocks[activeScanItem.orderId]) {
      return activeLocks[activeScanItem.orderId];
    }
    if (selectedOrderId !== 'ALL' && activeLocks[selectedOrderId]) {
      return activeLocks[selectedOrderId];
    }
    return null;
  }, [activeScanItem, selectedOrderId, activeLocks]);

  const isLockedByOther = Boolean(currentLock && currentLock.userId !== (user?.id || 'usr-staff'));

  // Compute Optimal Picking Route (S-Shape + Cold Chain Priority)
  const routeResult = useMemo(() => {
    return optimizePickingRoute(items);
  }, [items]);

  const orderedItems = routeResult.orderedItems;
  const waypoints = routeResult.waypoints;

  // Find index of the first pending item's waypoint
  const currentPendingItem = orderedItems.find(it => it.status === 'PENDING');
  const currentWaypointIndex = useMemo(() => {
    if (!currentPendingItem) return Math.max(0, waypoints.length - 1);
    const idx = waypoints.findIndex(wp => wp.shelf === currentPendingItem.shelfLocation);
    return idx >= 0 ? idx : 0;
  }, [waypoints, currentPendingItem]);

  const pickedCount = items.filter(it => it.status === 'PICKED').length;
  const isAllPicked = items.length > 0 && pickedCount === items.length;
  const totalUnits = items.reduce((s, i) => s + i.quantity, 0);
  const pickedUnits = items.reduce((s, i) => s + (i.status === 'PICKED' ? i.quantity : i.pickedQuantity), 0);
  const progressPercent = Math.round((pickedUnits / Math.max(1, totalUnits)) * 100);

  // Trigger Barcode/QR Scanning with Mutex Lock Acquisition
  const handleStartScan = async (item: PickingItem) => {
    const itemLock = item.orderId ? activeLocks[item.orderId] : null;
    if (itemLock && itemLock.userId !== (user?.id || 'usr-staff')) {
      alert(`🔒 Đơn hàng ${item.orderCode} đang được thao tác bởi ${itemLock.userName}. Bạn không thể thao tác cùng lúc!`);
      return;
    }

    if (item.orderId) {
      // Immediately notify backend that picking is in progress -> status turns to PICKING (Đang gom hàng) on Web instantly
      updateOutboundStatus(item.orderId, 'PICKING').catch(() => {});

      const lockSuccess = await lockOrder(item.orderId, {
        userId: user?.id || 'usr-staff',
        userName: user?.name || 'Nhân viên kho',
        role: user?.role || 'WAREHOUSE_STAFF',
      });
      if (!lockSuccess) return;
    }

    setActiveScanItem(item);
    setIsScannerOpen(true);
  };

  // Handle Scan Success / Match (LOT vs ITEM mode)
  const handleScanResult = (scannedCode: string, isSuccess: boolean, mode: 'LOT' | 'ITEM' = 'ITEM', pickedQty?: number) => {
    if (!activeScanItem || !isSuccess) return;

    const calcCount = (it: PickingItem) => {
      if (pickedQty !== undefined) return Math.min(it.quantity, Math.max(0, pickedQty));
      if (mode === 'LOT') return it.quantity;
      return Math.min(it.quantity, (it.pickedQuantity || 0) + 1);
    };

    setItems(prev =>
      prev.map(it => {
        if (it.id === activeScanItem.id || (it.lotCode === activeScanItem.lotCode && it.orderId === activeScanItem.orderId)) {
          const count = calcCount(it);
          return {
            ...it,
            pickedQuantity: count,
            status: count >= it.quantity ? 'PICKED' : 'PENDING',
          };
        }
        return it;
      })
    );

    setAllWaveItems(prev =>
      prev.map(it => {
        if (it.id === activeScanItem.id || (it.lotCode === activeScanItem.lotCode && it.orderId === activeScanItem.orderId)) {
          const count = calcCount(it);
          return {
            ...it,
            pickedQuantity: count,
            status: count >= it.quantity ? 'PICKED' : 'PENDING',
          };
        }
        return it;
      })
    );

    const newPickedCount = calcCount(activeScanItem);

    // Save to localStorage so progress is never lost even if user navigates away or reloads
    localStorage.setItem(`citymart_picked_qty_${activeScanItem.id}`, String(newPickedCount));
    if (activeScanItem.orderCode && activeScanItem.sku) {
      localStorage.setItem(`citymart_picked_qty_${activeScanItem.orderCode}_${activeScanItem.sku}`, String(newPickedCount));
    }

    // Persist to backend database in background
    if (activeScanItem.orderId) {
      updatePickedItemsApi(activeScanItem.orderId, [
        {
          id: activeScanItem.id,
          pickedQuantity: newPickedCount,
          status: newPickedCount >= activeScanItem.quantity ? 'PICKED' : 'PENDING',
          lotCode: activeScanItem.lotCode,
        },
      ]).catch(err => console.warn('Sync picked item error:', err));
    }

    if (mode === 'LOT' || (pickedQty && pickedQty >= activeScanItem.quantity) || newPickedCount >= activeScanItem.quantity) {
      setToastMessage({
        type: 'SUCCESS',
        text: `📦 Đã gom đủ: ${activeScanItem.productName} (${activeScanItem.quantity} ${activeScanItem.unit})`,
      });

      // 💡 IoT: Quét xong sản phẩm -> Tự động gửi lệnh tắt đèn kệ!
      completeShelfIotApi({
        warehouseCode: effectiveWhCode || 'GV',
        shelfCode: activeScanItem.shelfLocation,
      });
      if (activeLocatingShelf === activeScanItem.shelfLocation) {
        setActiveLocatingShelf(null);
      }
    } else {
      setToastMessage({
        type: 'SUCCESS',
        text: `🏷️ Đã quét: ${activeScanItem.productName} (${newPickedCount}/${activeScanItem.quantity} ${activeScanItem.unit})`,
      });
    }

    // Immediately notify backend that picking is in progress -> Web dashboard flips to PICKING without F5
    if (activeScanItem.orderId) {
      updateOutboundStatus(activeScanItem.orderId, 'PICKING').catch(err => {
        console.warn('Live backend picking status sync error:', err);
      });
    }

    setTimeout(() => setToastMessage(null), 3000);
  };

  // Hardware PDA Barcode Gun listener (Zebra / Honeywell DataWedge)
  const handleHardwareBarcodeScan = useCallback((scannedCode: string) => {
    const clean = scannedCode.trim().toLowerCase();

    // Find first pending item matching barcode, sku or lotCode
    const matchItem = items.find(it =>
      (it.barcode && it.barcode.toLowerCase() === clean) ||
      (it.sku && it.sku.toLowerCase() === clean) ||
      (it.lotCode && it.lotCode.toLowerCase() === clean) ||
      it.productName.toLowerCase().includes(clean)
    );

    if (matchItem) {
      if (matchItem.status === 'PICKED') {
        voiceAssistant.playTone('ALERT');
        return;
      }

      const newPickedCount = Math.min(matchItem.quantity, (matchItem.pickedQuantity || 0) + 1);
      const isDone = newPickedCount >= matchItem.quantity;

      // Play success tone for completion, or crisp scanner beep for single increment
      voiceAssistant.playTone(isDone ? 'SUCCESS' : 'BEEP');

      setActiveScanItem(matchItem);
      handleScanResult(scannedCode, true, 'ITEM', newPickedCount);
    } else {
      voiceAssistant.playTone('ERROR');
      setToastMessage({
        type: 'ERROR',
        text: `⚠️ Mã quét "${scannedCode}" không khớp với bất kỳ mặt hàng nào trong đợt sóng!`,
      });
      setTimeout(() => setToastMessage(null), 3000);
    }
  }, [items, isVoiceEnabled, handleScanResult]);

  useHardwareScanner({
    onScan: handleHardwareBarcodeScan,
    enabled: true,
  });

  // Transfer Order(s) to Packing Station (Khâu Đóng Gói)
  const handleTransferToPacking = async () => {
    const orderIdsToUnlock = Array.from(new Set(items.map(it => it.orderId)));
    for (const ordId of orderIdsToUnlock) {
      try {
        await updateOutboundStatus(ordId, 'PICKED').catch(() => {});
        localStorage.setItem(`citymart_order_ready_pack_${ordId}`, 'true');
        const foundOrder = availableOrders.find(o => o.id === ordId);
        if (foundOrder?.orderCode) {
          localStorage.setItem(`citymart_order_ready_pack_${foundOrder.orderCode}`, 'true');
        }
        await unlockOrder(ordId, user?.id || 'usr-staff');
      } catch (e) {
        console.warn('Unlock/update order error:', e);
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('staff_badge_refresh'));
    }

    const firstOrd = availableOrders.find(o => orderIdsToUnlock.includes(o.id)) || availableOrders[0];

    navigate(selectedOrderId !== 'ALL' ? `/packing?orderId=${selectedOrderId}` : '/packing', {
      state: {
        order: firstOrd || null,
        items: items,
      },
    });
  };

  // Confirm Complete Outbound Shipping (Direct)
  const handleConfirmOutbound = async () => {
    const orderIdsToConfirm = Array.from(new Set(items.map(it => it.orderId)));
    if (orderIdsToConfirm.length === 0) return;

    setIsConfirmingOutbound(true);
    try {
      for (const ordId of orderIdsToConfirm) {
        await confirmOutboundOrder(ordId);
        localStorage.setItem(`citymart_order_packed_${ordId}`, 'true');
        const foundOrder = availableOrders.find(o => o.id === ordId);
        if (foundOrder?.orderCode) {
          localStorage.setItem(`citymart_order_packed_${foundOrder.orderCode}`, 'true');
        }
        await unlockOrder(ordId, user?.id || 'usr-staff');
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('staff_badge_refresh'));
      }
      setToastMessage({
        type: 'SUCCESS',
        text: `✅ Xuất kho thành công ${orderIdsToConfirm.length} đơn hàng! Đã tự động trừ tồn DB.`,
      });
      setTimeout(() => {
        loadLiveData();
      }, 1500);
    } catch (err: any) {
      alert(`Lỗi xác nhận xuất kho: ${err.message || 'Không thể kết nối'}`);
    } finally {
      setIsConfirmingOutbound(false);
    }
  };

  return (
    <div style={{ padding: '16px', paddingBottom: '90px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

      {/* Available Pending Orders Filter Selector */}
      {availableOrders.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
            <span>ĐỢT SÓNG GOM HÀNG ({availableOrders.length} đơn chờ):</span>
            <span style={{ color: '#0284c7' }}>{selectedOrderId === 'ALL' ? 'Hiển thị gộp tất cả món' : 'Đang lọc 1 đơn'}</span>
          </div>
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
            {/* Filter: All items in batch */}
            <button
              onClick={() => handleSelectOrderFilter('ALL')}
              style={{
                backgroundColor: selectedOrderId === 'ALL' ? '#0284c7' : '#ffffff',
                border: `1.5px solid ${selectedOrderId === 'ALL' ? '#0284c7' : '#e2e8f0'}`,
                borderRadius: '12px',
                padding: '8px 12px',
                color: selectedOrderId === 'ALL' ? '#ffffff' : '#334155',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                whiteSpace: 'nowrap',
                fontSize: '11.5px',
                fontWeight: 800,
                boxShadow: selectedOrderId === 'ALL' ? '0 2px 8px rgba(2, 132, 199, 0.25)' : 'none',
              }}
            >
              <Sparkles size={14} color={selectedOrderId === 'ALL' ? '#ffffff' : '#0284c7'} />
              <span>Toàn Bộ Danh Sách ({allWaveItems.length} món • {availableOrders.length} đơn)</span>
            </button>

            {availableOrders.map(ord => {
              const isSelected = selectedOrderId === ord.id || selectedOrderId === ord.orderCode;
              const ordItemsCount = allWaveItems.filter(i => i.orderId === ord.id || i.orderCode === ord.orderCode).length;
              const lockInfo = activeLocks[ord.id];
              const isOrdLocked = Boolean(lockInfo && lockInfo.userId !== (user?.id || 'usr-staff'));

              return (
                <button
                  key={ord.id}
                  onClick={() => handleSelectOrderFilter(ord.id)}
                  style={{
                    backgroundColor: isSelected ? '#0284c7' : '#ffffff',
                    border: `1.5px solid ${isSelected ? '#0284c7' : isOrdLocked ? '#ef4444' : '#e2e8f0'}`,
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
                    boxShadow: isSelected ? '0 2px 8px rgba(2, 132, 199, 0.25)' : 'none',
                  }}
                >
                  <Boxes size={14} color={isSelected ? '#ffffff' : '#0284c7'} />
                  <span>{ord.orderCode}</span>
                  <span style={{ fontSize: '10px', opacity: 0.8 }}>({ordItemsCount} món)</span>
                  {isOrdLocked && <Lock size={12} color="#dc2626" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Top Header Card with Wave Progress */}
      <div
        style={{
          backgroundColor: '#ffffff',
          padding: '16px',
          borderRadius: '20px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.04)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '10.5px', color: '#0284c7', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                ĐỢT SÓNG GOM HÀNG FEFO (DATABASE LIVE)
              </span>
              <span style={{ fontSize: '9px', backgroundColor: '#e0f2fe', color: '#0369a1', padding: '1px 6px', borderRadius: '4px', fontWeight: 800 }}>
                {selectedOrderId === 'ALL' ? `TỔNG HỢP ${availableOrders.length} ĐƠN` : currentSelectedOrder?.orderCode}
              </span>
            </div>
            <h2 style={{ margin: '3px 0 0 0', fontSize: '16px', fontWeight: 900, color: '#0f172a' }}>
              {selectedOrderId === 'ALL' ? 'Danh Sách Lấy Hàng Gộp (Wave Picking)' : `Soạn Đơn Xuất Kho: ${currentSelectedOrder?.orderCode}`}
            </h2>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
              {selectedOrderId === 'ALL'
                ? `Lộ trình tối ưu qua các kệ cho toàn bộ ${items.length} món hàng`
                : `Điểm đến: ${currentSelectedOrder?.destination || 'Siêu Thị Emart'}`}
            </div>
          </div>

          {/* Action Tools & Concurrency Lock Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {/* Voice Guidance Toggle */}
            <button
              onClick={() => {
                const next = !isVoiceEnabled;
                setIsVoiceEnabled(next);
                voiceAssistant.setEnabled(next);
                if (next) voiceAssistant.playTone('ALERT');
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '5px 10px',
                borderRadius: '8px',
                fontSize: '11px',
                fontWeight: 800,
                border: `1.5px solid ${isVoiceEnabled ? '#059669' : '#cbd5e1'}`,
                backgroundColor: isVoiceEnabled ? '#ecfdf5' : '#f8fafc',
                color: isVoiceEnabled ? '#047857' : '#64748b',
                cursor: 'pointer',
              }}
              title={isVoiceEnabled ? 'Tắt âm thanh hiệu ứng' : 'Bật âm thanh hiệu ứng'}
            >
              {isVoiceEnabled ? <Volume2 size={14} color="#059669" /> : <VolumeX size={14} color="#94a3b8" />}
              <span>{isVoiceEnabled ? 'Sound ON' : 'Sound OFF'}</span>
            </button>

            {/* Handover Shift Button */}
            <button
              onClick={() => setIsShiftModalOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '5px 10px',
                borderRadius: '8px',
                fontSize: '11px',
                fontWeight: 800,
                border: '1.5px solid #0284c7',
                backgroundColor: '#f0f9ff',
                color: '#0369a1',
                cursor: 'pointer',
              }}
              title="Tổng kết ca & bàn giao"
            >
              <FileSpreadsheet size={13} color="#0284c7" />
              <span>Giao Ca</span>
            </button>

            {/* Incident Alert Button */}
            <button
              onClick={() => setIsIncidentModalOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '5px 10px',
                borderRadius: '8px',
                fontSize: '11px',
                fontWeight: 800,
                border: '1.5px solid #fecaca',
                backgroundColor: '#fef2f2',
                color: '#dc2626',
                cursor: 'pointer',
              }}
              title="Báo cáo sự cố rách bao bì, hỏng kệ"
            >
              <AlertTriangle size={13} color="#dc2626" />
              <span>Báo Sự Cố</span>
            </button>

            {isLockedByOther ? (
              <span style={{ fontSize: '10.5px', backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '4px 8px', borderRadius: '8px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Lock size={12} /> Khóa bởi {currentLock?.userName}
              </span>
            ) : (
              <span style={{ fontSize: '10.5px', backgroundColor: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', padding: '4px 8px', borderRadius: '8px', fontWeight: 800 }}>
                Sẵn sàng lấy
              </span>
            )}
          </div>
        </div>

        {/* 🔊 Active IoT Shelf Finding Banner */}
        {activeLocatingShelf && (
          <div
            style={{
              marginTop: '12px',
              backgroundColor: '#fef3c7',
              border: '1.5px solid #fde68a',
              borderRadius: '12px',
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#92400e', fontWeight: 700 }}>
              <Volume2 size={18} color="#d97706" />
              <span>
                Đang phát tín hiệu tới <strong style={{ color: '#b45309', textDecoration: 'underline' }}>{activeLocatingShelf}</strong> (Còi kêu & Nháy đèn). Hãy tới nơi và ấn Check-in!
              </span>
            </div>
            <button
              onClick={() => setActiveLocatingShelf(null)}
              style={{ background: 'none', border: 'none', color: '#b45309', cursor: 'pointer', fontWeight: 900, fontSize: '14px', padding: '2px 6px' }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Progress Bar (Only when items exist) */}
        {items.length > 0 && (
          <div style={{ marginTop: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 800, color: '#64748b', marginBottom: '4px' }}>
              <span>Tiến độ đợt gom:</span>
              <span style={{ color: '#0284c7' }}>{pickedUnits}/{totalUnits} sản phẩm ({progressPercent}%)</span>
            </div>
            <div style={{ height: '8px', backgroundColor: '#f1f5f9', borderRadius: '999px', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${progressPercent}%`,
                  backgroundColor: isAllPicked ? '#059669' : '#0284c7',
                  transition: 'width 0.3s ease',
                  borderRadius: '999px',
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            backgroundColor: toastMessage.type === 'SUCCESS' ? '#ecfdf5' : '#fef2f2',
            border: `1.5px solid ${toastMessage.type === 'SUCCESS' ? '#059669' : '#dc2626'}`,
            borderRadius: '12px',
            padding: '12px 16px',
            color: toastMessage.type === 'SUCCESS' ? '#065f46' : '#991b1b',
            fontSize: '12px',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            animation: 'slideUp 0.3s ease-out',
          }}
        >
          {toastMessage.type === 'SUCCESS' ? <CheckCircle2 size={18} color="#059669" /> : <AlertTriangle size={18} color="#dc2626" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* EMPTY STATE: When no pending orders in database */}
      {items.length === 0 && !isLoading && (
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
              backgroundColor: '#f0f9ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Inbox size={32} color="#0284c7" />
          </div>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 900, color: '#0f172a' }}>
            Chưa có đợt lấy hàng nào đang chờ
          </h3>
          <p style={{ margin: 0, fontSize: '12px', color: '#64748b', maxWidth: '300px', lineHeight: 1.5 }}>
            Hệ thống đang kết nối 100% vào Database thực và lắng nghe đơn xuất kho mới qua Socket thời gian thực.
          </p>
          <button
            onClick={loadLiveData}
            style={{
              backgroundColor: '#0284c7',
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
            <RefreshCw size={14} /> Kiểm Tra Đơn Mới Từ DB
          </button>
        </div>
      )}

      {/* View Switcher Tabs */}
      {items.length > 0 && (
        <div style={{ display: 'flex', backgroundColor: '#f1f5f9', borderRadius: '12px', padding: '4px', border: '1px solid #e2e8f0' }}>
          <button
            type="button"
            onClick={() => setActiveTab('3D_MAP')}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '12px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              backgroundColor: activeTab === '3D_MAP' ? '#ffffff' : 'transparent',
              color: activeTab === '3D_MAP' ? '#0284c7' : '#64748b',
              boxShadow: activeTab === '3D_MAP' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
            }}
          >
            <Compass size={16} /> 3D Lộ Trình S-Shape
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ITEMS_LIST')}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '12px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              backgroundColor: activeTab === 'ITEMS_LIST' ? '#ffffff' : 'transparent',
              color: activeTab === 'ITEMS_LIST' ? '#0284c7' : '#64748b',
              boxShadow: activeTab === 'ITEMS_LIST' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
            }}
          >
            <Layers size={16} /> Danh Sách Món ({pickedCount}/{items.length})
          </button>
        </div>
      )}

      {/* 3D MAP TAB */}
      {items.length > 0 && activeTab === '3D_MAP' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ borderRadius: '18px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
            <Mobile3DWarehouseView
              waypoints={waypoints}
              currentWaypointIndex={currentWaypointIndex}
              items={orderedItems}
              activeItem={currentPendingItem}
              warehouseCode={effectiveWhCode}
              lots={liveLots}
              products={liveProducts}
            />
          </div>

          {/* Current Target Shelf Beacon Banner */}
          {currentPendingItem ? (
            <div
              style={{
                backgroundColor: '#ffffff',
                padding: '14px',
                borderRadius: '16px',
                border: '1.5px solid #0284c7',
                boxShadow: '0 2px 8px rgba(2, 132, 199, 0.08)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ fontSize: '10.5px', color: '#0284c7', fontWeight: 800 }}>VỊ TRÍ KỆ TIẾP THEO:</div>
                <div style={{ fontSize: '14px', fontWeight: 900, color: '#0f172a', marginTop: '2px' }}>
                  {currentPendingItem.shelfLocation}
                </div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>
                  {currentPendingItem.productName} (Cần: <b>{currentPendingItem.quantity} {currentPendingItem.unit}</b>)
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  onClick={() => handleLocateShelf(currentPendingItem)}
                  style={{
                    backgroundColor: activeLocatingShelf === currentPendingItem.shelfLocation ? '#d97706' : '#fffbeb',
                    color: activeLocatingShelf === currentPendingItem.shelfLocation ? '#ffffff' : '#b45309',
                    border: '1.5px solid #fde68a',
                    padding: '10px 12px',
                    borderRadius: '12px',
                    fontWeight: 900,
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: activeLocatingShelf === currentPendingItem.shelfLocation ? '0 0 10px rgba(217, 119, 6, 0.4)' : 'none',
                  }}
                  title="Kích hoạt còi & đèn LED trên kệ hàng"
                >
                  <Volume2 size={16} />
                  <span>{activeLocatingShelf === currentPendingItem.shelfLocation ? 'Đang kêu còi...' : '🔔 Định Vị Kệ'}</span>
                </button>

                <button
                  disabled={isLockedByOther}
                  onClick={() => handleStartScan(currentPendingItem)}
                  style={{
                    backgroundColor: isLockedByOther ? '#94a3b8' : '#0284c7',
                    color: '#ffffff',
                    border: 'none',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    fontWeight: 900,
                    fontSize: '12px',
                    cursor: isLockedByOther ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 6px rgba(2, 132, 199, 0.25)',
                  }}
                >
                  <ScanBarcode size={16} /> {isLockedByOther ? 'Bị Khóa' : 'Quét'}
                </button>
              </div>
            </div>
          ) : (
            <div style={{ backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '16px', padding: '14px', textAlign: 'center' }}>
              <div style={{ fontSize: '13px', fontWeight: 900, color: '#059669' }}>
                🎉 ĐÃ HOÀN TẤT LẤY TẤT CẢ CÁC MÓN TRÊN KỆ!
              </div>
            </div>
          )}
        </div>
      )}

      {/* ITEMS LIST TAB */}
      {items.length > 0 && activeTab === 'ITEMS_LIST' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* Item Status Filter Chips */}
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            {[
              { id: 'ALL', label: `Tất cả (${orderedItems.length})` },
              { id: 'PENDING', label: `⏳ Cần lấy (${orderedItems.filter(i => i.status !== 'PICKED').length})` },
              { id: 'PICKED', label: `✅ Đã lấy xong (${orderedItems.filter(i => i.status === 'PICKED').length})` },
            ].map(chip => (
              <button
                key={chip.id}
                type="button"
                onClick={() => setItemFilterTab(chip.id as any)}
                style={{
                  backgroundColor: itemFilterTab === chip.id ? '#0284c7' : '#ffffff',
                  color: itemFilterTab === chip.id ? '#ffffff' : '#475569',
                  border: `1px solid ${itemFilterTab === chip.id ? '#0284c7' : '#e2e8f0'}`,
                  borderRadius: '8px',
                  padding: '5px 10px',
                  fontSize: '11px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {chip.label}
              </button>
            ))}
          </div>

          {orderedItems
            .filter(item => {
              if (itemFilterTab === 'PENDING') return item.status !== 'PICKED';
              if (itemFilterTab === 'PICKED') return item.status === 'PICKED';
              return true;
            })
            .map((item, idx) => {
              const isPicked = item.status === 'PICKED';
              const isNext = !isPicked && item.id === currentPendingItem?.id;

              return (
                <div
                  key={item.id}
                  style={{
                    backgroundColor: isPicked ? '#ecfdf5' : isNext ? '#f0f9ff' : '#ffffff',
                    borderRadius: '16px',
                    border: `1.5px solid ${isPicked ? '#a7f3d0' : isNext ? '#38bdf8' : '#e2e8f0'}`,
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                  }}
                >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <div
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '6px',
                        backgroundColor: isPicked ? '#059669' : isNext ? '#0284c7' : '#cbd5e1',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '11px',
                        fontWeight: 900,
                      }}
                    >
                      {idx + 1}
                    </div>

                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: '6px',
                        backgroundColor: item.zone === 'COOL' ? '#d1fae5' : item.zone === 'FROZEN' ? '#e0f2fe' : '#fef3c7',
                        color: item.zone === 'COOL' ? '#047857' : item.zone === 'FROZEN' ? '#0369a1' : '#b45309',
                      }}
                    >
                      {item.zone === 'COOL' ? '🧊 0-4°C' : item.zone === 'FROZEN' ? '❄️ -18°C' : '🌾 Kho Khô'}
                    </span>

                    {item.orderCode && (
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 800,
                          padding: '2px 7px',
                          borderRadius: '6px',
                          backgroundColor: '#f5f3ff',
                          color: '#6d28d9',
                          border: '1px solid #ddd6fe',
                        }}
                      >
                        📦 {item.orderCode}
                      </span>
                    )}
                  </div>

                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 900,
                      color: isPicked ? '#059669' : '#64748b',
                      backgroundColor: isPicked ? '#ecfdf5' : '#f1f5f9',
                      border: `1px solid ${isPicked ? '#a7f3d0' : '#e2e8f0'}`,
                      padding: '2px 8px',
                      borderRadius: '6px',
                    }}
                  >
                    {isPicked ? '✅ Đã Lấy' : '⏳ Chờ Quét'}
                  </span>
                </div>

                <div>
                  <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 900, color: '#0f172a' }}>
                    {item.productName}
                  </h4>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '3px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    <span>SKU: <strong style={{ color: '#0f172a' }}>{item.sku}</strong></span>
                    <span>• Lô: <strong style={{ color: '#0284c7' }}>{item.lotCode}</strong></span>
                    <span>• HSD: <strong style={{ color: '#d97706' }}>{item.expiryDate}</strong></span>
                  </div>
                </div>

                {/* Location & Quantity Row */}
                <div
                  style={{
                    backgroundColor: isPicked ? '#f0fdf4' : '#f8fafc',
                    borderRadius: '10px',
                    padding: '10px 12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <MapPin size={14} color="#0284c7" />
                        <span style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a' }}>{item.shelfLocation}</span>
                      </div>

                      {!isPicked && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {/* 💡 Nút Nháy đèn định vị */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleLocateShelf(item);
                            }}
                            style={{
                              backgroundColor: activeLocatingShelf === item.shelfLocation ? '#0284c7' : '#f0f9ff',
                              color: activeLocatingShelf === item.shelfLocation ? '#ffffff' : '#0369a1',
                              border: '1px solid #bae6fd',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: 800,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              cursor: 'pointer',
                            }}
                            title="Mặc định: Bật/tắt nháy đèn LED định vị kệ (hoàn toàn không kêu còi)"
                          >
                            <Sparkles size={12} />
                            <span>{activeLocatingShelf === item.shelfLocation ? 'Đang nháy' : 'Nháy đèn'}</span>
                          </button>

                          {/* 🔊 Nút Phát còi định vị kệ */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSmartkeyChirp(item);
                            }}
                            style={{
                              backgroundColor: smartkeyPingingShelf === item.shelfLocation ? '#d97706' : '#fffbeb',
                              color: smartkeyPingingShelf === item.shelfLocation ? '#ffffff' : '#b45309',
                              border: '1px solid #fde68a',
                              padding: '3px 9px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: 800,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              cursor: 'pointer',
                              boxShadow: smartkeyPingingShelf === item.shelfLocation ? '0 0 10px rgba(217,119,6,0.4)' : 'none',
                              transform: smartkeyPingingShelf === item.shelfLocation ? 'scale(1.04)' : 'scale(1)',
                              transition: 'all 0.15s ease',
                            }}
                            title="Bấm để kệ phát tiếng còi bíp bíp tìm vị trí"
                          >
                            <Volume2 size={12} />
                            <span>{smartkeyPingingShelf === item.shelfLocation ? 'Đang kêu...' : 'Bấm còi'}</span>
                          </button>
                        </div>
                      )}
                    </div>

                    <div style={{ fontSize: '12.5px', fontWeight: 900, color: isPicked ? '#059669' : '#0284c7' }}>
                      Đã lấy: <b style={{ fontSize: '14px' }}>{item.pickedQuantity || (isPicked ? item.quantity : 0)}</b> / {item.quantity} {item.unit}
                    </div>
                  </div>

                  {/* Partial Progress Bar */}
                  {!isPicked && (item.pickedQuantity || 0) > 0 && (
                    <div style={{ height: '4px', backgroundColor: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${Math.min(100, Math.round(((item.pickedQuantity || 0) / item.quantity) * 100))}%`,
                          backgroundColor: '#0284c7',
                          borderRadius: '999px',
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* Scan Button Action */}
                {!isPicked && (
                  <button
                    disabled={isLockedByOther}
                    onClick={() => handleStartScan(item)}
                    style={{
                      backgroundColor: isLockedByOther ? '#cbd5e1' : isNext ? '#0284c7' : '#f1f5f9',
                      color: isLockedByOther ? '#64748b' : isNext ? '#ffffff' : '#334155',
                      border: isNext ? 'none' : '1px solid #cbd5e1',
                      padding: '10px',
                      borderRadius: '10px',
                      fontWeight: 800,
                      fontSize: '12.5px',
                      cursor: isLockedByOther ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                    }}
                  >
                    {isLockedByOther ? <Lock size={16} /> : <ScanBarcode size={16} />}
                    <span>
                      {isLockedByOther
                        ? `Bị khóa bởi ${currentLock?.userName}`
                        : (item.pickedQuantity || 0) > 0
                        ? `Quét Tiếp Tục (${item.pickedQuantity}/${item.quantity})`
                        : 'Quét Barcode / Mã Lô'}
                    </span>
                  </button>
                )}
              </div>
            );
          })}

          {/* Full Wave Completion Card */}
          {isAllPicked && (
            <div
              style={{
                marginTop: '10px',
                backgroundColor: '#ffffff',
                border: '2px solid #059669',
                borderRadius: '18px',
                padding: '18px',
                boxShadow: '0 4px 16px rgba(5, 150, 105, 0.15)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    backgroundColor: '#ecfdf5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <CheckCircle2 size={22} color="#059669" />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 900, color: '#0f172a' }}>
                    ĐÃ GOM ĐỦ 100% SẢN PHẨM!
                  </h4>
                  <p style={{ margin: '2px 0 0 0', fontSize: '11.5px', color: '#64748b' }}>
                    Tất cả các món đã được lấy chính xác theo hạn FEFO.
                  </p>
                </div>
              </div>

              {/* Primary Action: Chuyển Sang Khâu Đóng Gói (Packing) */}
              <button
                disabled={isLockedByOther}
                onClick={handleTransferToPacking}
                style={{
                  width: '100%',
                  backgroundColor: isLockedByOther ? '#cbd5e1' : '#7c3aed',
                  color: '#ffffff',
                  border: 'none',
                  padding: '14px',
                  borderRadius: '12px',
                  fontWeight: 900,
                  fontSize: '14px',
                  cursor: isLockedByOther ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(124, 58, 237, 0.3)',
                }}
              >
                <PackageCheck size={18} />
                <span>Chuyển Sang Khâu Đóng Gói (Packing) ➔</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Barcode & QR Camera Scanner Modal */}
      <CameraScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        scannerType="PICKING"
        title="Quét Xác Thực Hàng Soạn Đơn"
        expectedSku={activeScanItem?.sku}
        expectedName={activeScanItem?.productName}
        expectedLotCode={activeScanItem?.lotCode}
        expectedBarcode={activeScanItem?.barcode}
        expectedShelfLocation={activeScanItem?.shelfLocation}
        expectedQty={activeScanItem?.quantity}
        currentPickedQty={activeScanItem?.pickedQuantity}
        unit={activeScanItem?.unit}
        onScanResult={handleScanResult}
      />

      {/* Enterprise Shift Handover Modal */}
      <ShiftHandoverModal
        isOpen={isShiftModalOpen}
        onClose={() => setIsShiftModalOpen(false)}
        shiftStats={{
          pickedOrdersCount: pickedCount > 0 ? 1 : 0,
          totalUnitsPicked: pickedUnits,
          packedOrdersCount: availableOrders.filter(o => o.status === 'PACKED').length,
          auditedLotsCount: 14,
        }}
      />

      {/* Enterprise Incident Escalation Modal */}
      <IncidentReportModal
        isOpen={isIncidentModalOpen}
        onClose={() => setIsIncidentModalOpen(false)}
        defaultLocation={activeScanItem?.shelfLocation || currentPendingItem?.shelfLocation || 'Kệ Khô D-02'}
        defaultSku={activeScanItem?.sku || currentPendingItem?.sku || ''}
      />
    </div>
  );
};
