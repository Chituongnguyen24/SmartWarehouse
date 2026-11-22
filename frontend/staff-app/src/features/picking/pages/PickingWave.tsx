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
  Radio,
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
  X,
  MoreVertical,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Play,
  Square,
  SkipForward,
} from 'lucide-react';
import { PickingItem } from '@/types';
import { CameraScannerModal } from '@/shared';
import { Mobile3DWarehouseView } from '@/features/picking';
import { formatStandardShelfLocation, resolveStorageZone } from '@/features/picking';
import { ShiftHandoverModal } from '@/features/dashboard';
import { IncidentReportModal } from '@/features/dashboard';
import { optimizePickingRoute } from '@/features/picking';
import { useHardwareScanner } from '@/features/picking';
import { voiceAssistant } from '@/features/picking';
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
  stopShelfIotApi,
  getIotShelvesStatusApi,
  extractDemoIotShelf,
  DemoIotShelfCode,
  API_URLS,
} from '@/shared';
import { useStaffWebSocket } from '@/features/dashboard';
import { useAuth } from '@/features/auth';

export const PickingWave: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const targetOrderId = searchParams.get('orderId');
  const targetItemId = searchParams.get('itemId');

  const { user, activeWarehouse } = useAuth();
  const effectiveWhCode = user?.warehouseCode || activeWarehouse || 'WH-006';
  const { isConnected, activeLocks, lockOrder, unlockOrder, lastEvent } = useStaffWebSocket();

  const [activeTab, setActiveTab] = useState<'3D_MAP' | 'ITEMS_LIST'>('ITEMS_LIST');
  const [itemFilterTab, setItemFilterTab] = useState<'ALL' | 'PENDING' | 'PICKED'>('PENDING');
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
  const [isToolsMenuOpen, setIsToolsMenuOpen] = useState<boolean>(false);
  const [expandedPickedIds, setExpandedPickedIds] = useState<Record<string, boolean>>({});
  const [activeLocatingShelf, setActiveLocatingShelf] = useState<string | null>(null);
  const [arrivedShelf, setArrivedShelf] = useState<string | null>(null);
  const [smartkeyPingingShelf, setSmartkeyPingingShelf] = useState<string | null>(null);

  // Sequential Pick-to-Light Guided Mode (Chỉ kích hoạt LED & còi trên 3 kệ demo IoT: A1, A2, A3)
  interface GuidedIotSession {
    orderId: string;
    orderCode: string;
    itemId: string;
    shelfCode: DemoIotShelfCode;
    shelfLocation: string;
    productName: string;
    quantity: number;
    unit: string;
    step: number;
    totalSteps: number;
    baselineStopSeq: number;
    startedAt: number;
  }

  const [isAutoIotEnabled, setIsAutoIotEnabled] = useState<boolean>(true);
  const [guidedIotSession, setGuidedIotSession] = useState<GuidedIotSession | null>(null);
  const [iotCompletedOrderCode, setIotCompletedOrderCode] = useState<string | null>(null);

  const guidedSessionRef = React.useRef<GuidedIotSession | null>(null);
  const isTransitioningIotRef = React.useRef<boolean>(false);
  const iotTransitionTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const itemsRef = React.useRef<PickingItem[]>([]);
  const orderedItemsRef = React.useRef<PickingItem[]>([]);
  const lastSelectedOrderRef = React.useRef<string>('ALL');

  const toggleExpandPicked = (id: string) => {
    setExpandedPickedIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Zone Filter State
  const [zoneFilter, setZoneFilter] = useState<'ALL' | 'DRY' | 'COOL' | 'FROZEN'>('ALL');

  // Shortage Exception Handling State
  const [shortageItem, setShortageItem] = useState<PickingItem | null>(null);
  const [shortageActualQty, setShortageActualQty] = useState<number>(0);
  const [shortageReason, setShortageReason] = useState<'OUT_OF_STOCK' | 'DAMAGED' | 'EXPIRED'>('OUT_OF_STOCK');
  const [suggestedAlternativeLots, setSuggestedAlternativeLots] = useState<any[]>([]);

  const handleOpenShortage = (item: PickingItem) => {
    setShortageItem(item);
    setShortageActualQty(item.pickedQuantity || 0);
    setShortageReason('OUT_OF_STOCK');

    // Find alternative lots for same SKU in same warehouse
    const alt = liveLots.filter((l: any) => {
      const matchSku = l.sku === item.sku || l.productId === item.sku;
      const isDiff = l.lotCode !== item.lotCode;
      const hasStock = Number(l.quantity || 0) > 0;
      return matchSku && isDiff && hasStock;
    });
    setSuggestedAlternativeLots(alt);
  };

  const handleSwitchToAlternativeLot = (altLot: any) => {
    if (!shortageItem) return;
    const resolved = resolveStorageZone({
      zone: altLot.zone,
      shelfLocation: altLot.location,
      productName: shortageItem.productName,
      sku: shortageItem.sku,
    });
    const newLoc = formatStandardShelfLocation(altLot.location, resolved.zone);
    const newLotCode = altLot.lotCode;
    const newZone = resolved.zone;

    setItems(prev =>
      prev.map(it => {
        if (it.id === shortageItem.id) {
          return {
            ...it,
            lotCode: newLotCode,
            shelfLocation: newLoc,
            zone: newZone,
          };
        }
        return it;
      })
    );

    setToastMessage({
      type: 'SUCCESS',
      text: `Đã đổi sang Lô dự phòng: ${newLotCode} tại ${newLoc}`,
    });
    setShortageItem(null);
  };

  const handleConfirmShortage = () => {
    if (!shortageItem) return;

    const actual = Math.max(0, Number(shortageActualQty));

    // Update item picked quantity
    setItems(prev =>
      prev.map(it => {
        if (it.id === shortageItem.id) {
          return {
            ...it,
            pickedQuantity: actual,
            status: 'PICKED',
          };
        }
        return it;
      })
    );

    try {
      localStorage.setItem(`citymart_picked_qty_${shortageItem.id}`, String(actual));
      if (shortageItem.orderCode) {
        localStorage.setItem(`citymart_picked_qty_${shortageItem.orderCode}_${shortageItem.sku}`, String(actual));
      }
    } catch (e) {}

    setToastMessage({
      type: 'SUCCESS',
      text: `Đã ghi nhận ngoại lệ: Lô ${shortageItem.lotCode} (${actual}/${shortageItem.quantity})`,
    });
    setShortageItem(null);
  };

  const handleLocateShelf = async (item: PickingItem) => {
    const demoShelf = extractDemoIotShelf(item.shelfLocation);
    if (!demoShelf) {
      setActiveLocatingShelf(null);
      setToastMessage({
        type: 'ERROR',
        text: `Kệ ${item.shelfLocation} không thuộc 3 kệ demo IoT (hệ thống chỉ bật đèn và còi cho Kệ A1, A2, A3).`,
      });
      voiceAssistant.playTone('ERROR');
      return;
    }

    if (activeLocatingShelf === item.shelfLocation) {
      setActiveLocatingShelf(null);
      if (guidedSessionRef.current?.itemId === item.id) {
        guidedSessionRef.current = null;
        setGuidedIotSession(null);
      }
      await stopShelfIotApi({
        warehouseCode: effectiveWhCode || 'WH-006',
        shelfCode: demoShelf,
      });
      return;
    }

    setArrivedShelf(null);

    const res = await locateShelfIotApi({
      warehouseCode: effectiveWhCode || 'WH-006',
      shelfCode: demoShelf,
      slotCode: item.shelfLocation,
      productName: item.productName,
      qty: item.quantity,
      orderId: item.orderCode || item.orderId || 'WAVE-PICK',
    });

    if (res && res.success === false) {
      setActiveLocatingShelf(null);
      setToastMessage({
        type: 'ERROR',
        text: res.message || `Kệ ${item.shelfLocation} không thuộc phạm vi IoT (chỉ hỗ trợ Kệ A1, A2, A3).`,
      });
      voiceAssistant.playTone('ERROR');
      return;
    }

    setActiveLocatingShelf(item.shelfLocation);
    voiceAssistant.playTone('LOCATE');
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
        const dbLot = (it.lotCode ? lotMap.get(it.lotCode) : null) || matchingLots[0] || ((it as any).productId ? lotMap.get((it as any).productId) : null);
        const dbProd = (it.sku ? prodMap.get(it.sku) : null) || (dbLot?.productId ? prodMap.get(dbLot.productId) : null);

        const rawLoc = dbLot?.location || it.slotId || it.location || (it as any).shelfLocation;

        const zoneMeta = resolveStorageZone({
          zone: dbLot?.zone || it.zone,
          storageType: dbProd?.storageType || (dbProd as any)?.storage_type,
          storageCondition: (dbProd as any)?.storageCondition || (it as any)?.storageCondition,
          temperatureRequired: (it as any)?.temperatureRequired,
          shelfLocation: rawLoc,
          sku: it.sku || dbLot?.sku,
          productName: it.productName || dbProd?.name,
          category: dbProd?.category,
        });

        const z = zoneMeta.zone;
        const loc = formatShelfLocation(rawLoc, z, idx + 1);

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
        const currentPicked = Number((it.pickedQuantity || 0) > 0 ? it.pickedQuantity : (cachedPicked ? Number(cachedPicked) : 0));
        const isItemPicked = (currentPicked >= exactQty && exactQty > 0) || (it as any).status === 'PICKED';

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
          temperatureRequired: zoneMeta.tempRange,
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

      // Quy tắc vận hành chuẩn WMS: Chỉ hiển thị các đơn đã được Quản lý xuất kho duyệt "Tiếp Nhận & Giao Kho" (PICKING hoặc PROCESSING)
      // Đơn mới tạo ở trạng thái PENDING phải chờ Quản lý kho duyệt tiếp nhận rồi mới được lấy hàng
      const pendingOrders = orders
        .filter(o => o.status === 'PICKING' || o.status === 'PROCESSING')
        .sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
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

  // Initial load and gentle background polling every 8 seconds (save CPU / network for low-end devices)
  useEffect(() => {
    loadLiveData(false);
    const interval = setInterval(() => {
      loadLiveData(true);
    }, 8000);
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

  // Keep refs synchronized for async Sequential Pick-to-Light callbacks
  itemsRef.current = items;
  orderedItemsRef.current = orderedItems;

  // Danh sách các sản phẩm thuộc đúng 3 kệ Demo IoT (A1, A2, A3) trong đơn đang mở
  const orderDemoIotItems = useMemo(() => {
    if (selectedOrderId === 'ALL') return [];
    return orderedItems.filter(
      it =>
        (it.orderId === selectedOrderId || it.orderCode === selectedOrderId) &&
        extractDemoIotShelf(it.shelfLocation) !== null
    );
  }, [selectedOrderId, orderedItems]);

  const pendingDemoIotItems = useMemo(
    () => orderDemoIotItems.filter(it => it.status !== 'PICKED'),
    [orderDemoIotItems]
  );

  // Tắt đèn & còi kệ hiện tại khi tạm dừng / đổi đơn / rời trang
  const stopGuidedIotSession = useCallback(
    async (sendStopToHardware: boolean = true) => {
      if (iotTransitionTimerRef.current) {
        clearTimeout(iotTransitionTimerRef.current);
        iotTransitionTimerRef.current = null;
      }
      const active = guidedSessionRef.current;
      guidedSessionRef.current = null;
      isTransitioningIotRef.current = false;
      setGuidedIotSession(null);
      setActiveLocatingShelf(null);

      if (sendStopToHardware && active) {
        await stopShelfIotApi({
          warehouseCode: effectiveWhCode || 'WH-006',
          shelfCode: active.shelfCode,
        }).catch(() => {});
      }
    },
    [effectiveWhCode]
  );

  // Đánh dấu 1 sản phẩm đã lấy khi bấm STOP vật lý (hoặc xác nhận thủ công) & đồng bộ backend
  const markItemPickedByIot = useCallback(async (targetItem: PickingItem) => {
    const fullQty = targetItem.quantity || 1;

    const currentItemsSnapshot = itemsRef.current;
    const currentOrderedSnapshot = orderedItemsRef.current;

    const updatedItems = currentItemsSnapshot.map(it =>
      it.id === targetItem.id
        ? { ...it, pickedQuantity: fullQty, status: 'PICKED' as const }
        : it
    );
    itemsRef.current = updatedItems;
    setItems(updatedItems);

    const updatedOrdered = currentOrderedSnapshot.map(it =>
      it.id === targetItem.id
        ? { ...it, pickedQuantity: fullQty, status: 'PICKED' as const }
        : it
    );
    orderedItemsRef.current = updatedOrdered;

    setAllWaveItems(prev =>
      prev.map(it =>
        it.id === targetItem.id
          ? { ...it, pickedQuantity: fullQty, status: 'PICKED' as const }
          : it
      )
    );

    try {
      localStorage.setItem(`citymart_picked_qty_${targetItem.id}`, String(fullQty));
      if (targetItem.orderCode && targetItem.sku) {
        localStorage.setItem(`citymart_picked_qty_${targetItem.orderCode}_${targetItem.sku}`, String(fullQty));
      }
    } catch (e) {}

    if (targetItem.orderId) {
      updatePickedItemsApi(targetItem.orderId, [
        {
          id: targetItem.id,
          sku: targetItem.sku,
          pickedQuantity: fullQty,
          status: 'PICKED',
          lotCode: targetItem.lotCode,
        },
      ]).catch(err => console.warn('Sync picked item error (IoT STOP):', err));
    }

    const sameOrderItems = updatedOrdered.filter(
      it => it.orderId === targetItem.orderId || it.orderCode === targetItem.orderCode
    );
    const isOrderFullyPicked =
      sameOrderItems.length > 0 && sameOrderItems.every(it => it.status === 'PICKED');

    const sameOrderIotItems = sameOrderItems.filter(it => extractDemoIotShelf(it.shelfLocation) !== null);
    const remainingIotItems = sameOrderIotItems.filter(it => it.status !== 'PICKED');

    if (targetItem.orderId) {
      const targetStatus = isOrderFullyPicked ? 'PACKING' : 'PICKING';
      updateOutboundStatus(targetItem.orderId, targetStatus).catch(() => {});

      if (isOrderFullyPicked) {
        try {
          localStorage.setItem(`citymart_order_just_transferred_${targetItem.orderId}`, 'true');
          localStorage.setItem(`citymart_order_ready_pack_${targetItem.orderId}`, 'true');
          if (targetItem.orderCode) {
            localStorage.setItem(`citymart_order_just_transferred_${targetItem.orderCode}`, 'true');
            localStorage.setItem(`citymart_order_ready_pack_${targetItem.orderCode}`, 'true');
          }
        } catch (e) {}

        const cleanId = targetItem.orderId.replace(/^ECOMM-/, '').replace(/^OB-/, '');
        fetch(`${API_URLS.ORDER}/orders/sync-status/${cleanId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'PACKING' }),
        }).catch(() => {});

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('staff_badge_refresh'));
        }
        setIotCompletedOrderCode(targetItem.orderCode || targetItem.orderId);
      }
    }

    return {
      isOrderFullyPicked,
      remainingIotItems,
      totalIotCount: sameOrderIotItems.length,
    };
  }, []);

  // Bật đèn LED + còi cho 1 sản phẩm trên đúng 1 trong 3 kệ A1, A2, A3
  const activateGuidedIotForItem = useCallback(
    async (targetItem: PickingItem, step: number, totalSteps: number) => {
      const shelfCode = extractDemoIotShelf(targetItem.shelfLocation);
      if (!shelfCode) return false;

      isTransitioningIotRef.current = true;
      try {
        // Đọc baseline stopSeq trước hoặc từ response locate để bắt chính xác lần bấm STOP mới
        let preStopSeq = 0;
        const res = await locateShelfIotApi({
          warehouseCode: effectiveWhCode || 'WH-006',
          shelfCode,
          slotCode: targetItem.shelfLocation,
          productName: targetItem.productName,
          qty: targetItem.quantity,
          step,
          totalSteps,
          orderId: targetItem.orderCode || targetItem.orderId,
        });

        if (res && res.success === false) {
          setToastMessage({
            type: 'ERROR',
            text: res.message || `Không thể kích hoạt Kệ ${shelfCode}.`,
          });
          isTransitioningIotRef.current = false;
          return false;
        }

        if (typeof res?.stopSeq === 'number') {
          preStopSeq = res.stopSeq;
        } else if (typeof res?.shelf?.stopSeq === 'number') {
          preStopSeq = res.shelf.stopSeq;
        } else {
          const statusRes = await getIotShelvesStatusApi();
          const sh = statusRes?.shelves?.[shelfCode];
          if (typeof sh?.stopSeq === 'number') preStopSeq = sh.stopSeq;
        }

        const session: GuidedIotSession = {
          orderId: targetItem.orderId,
          orderCode: targetItem.orderCode || targetItem.orderId,
          itemId: targetItem.id,
          shelfCode,
          shelfLocation: targetItem.shelfLocation,
          productName: targetItem.productName,
          quantity: targetItem.quantity,
          unit: targetItem.unit,
          step,
          totalSteps,
          baselineStopSeq: preStopSeq,
          startedAt: Date.now(),
        };

        guidedSessionRef.current = session;
        setGuidedIotSession(session);
        setActiveLocatingShelf(targetItem.shelfLocation);
        setArrivedShelf(null);
        setIotCompletedOrderCode(null);

        if (targetItem.orderId) {
          updateOutboundStatus(targetItem.orderId, 'PICKING').catch(() => {});
        }

        voiceAssistant.playTone('LOCATE');
        return true;
      } catch (err) {
        console.warn('activateGuidedIotForItem error:', err);
        return false;
      } finally {
        isTransitioningIotRef.current = false;
      }
    },
    [effectiveWhCode]
  );

  // Khi nhân viên bấm STOP (vật lý trên kệ hoặc nút xác nhận trên app): tắt đèn/còi -> đánh dấu đã lấy -> tự nhảy món tiếp theo
  const completeCurrentGuidedStepAndAdvance = useCallback(
    async (triggeredBy: 'HARDWARE_STOP' | 'MANUAL_STOP') => {
      const session = guidedSessionRef.current;
      if (!session || isTransitioningIotRef.current) return;

      isTransitioningIotRef.current = true;
      guidedSessionRef.current = null;
      setGuidedIotSession(null);
      setActiveLocatingShelf(null);

      try {
        if (triggeredBy === 'MANUAL_STOP') {
          await stopShelfIotApi({
            warehouseCode: effectiveWhCode || 'WH-006',
            shelfCode: session.shelfCode,
          }).catch(() => {});
        }

        const currentItem = orderedItemsRef.current.find(it => it.id === session.itemId);
        voiceAssistant.playTone('SUCCESS');

        if (!currentItem) {
          isTransitioningIotRef.current = false;
          return;
        }

        const { isOrderFullyPicked, remainingIotItems, totalIotCount } = await markItemPickedByIot(currentItem);

        if (remainingIotItems.length > 0) {
          const nextItem = remainingIotItems[0];
          const nextShelf = extractDemoIotShelf(nextItem.shelfLocation);
          const nextStep = totalIotCount - remainingIotItems.length + 1;

          setToastMessage({
            type: 'SUCCESS',
            text: `Đã xác nhận lấy hàng tại Kệ ${session.shelfCode} (${session.productName}). Chuyển sang Kệ ${nextShelf}: ${nextItem.productName}.`,
          });

          iotTransitionTimerRef.current = setTimeout(() => {
            iotTransitionTimerRef.current = null;
            isTransitioningIotRef.current = false;
            activateGuidedIotForItem(nextItem, nextStep, totalIotCount);
          }, 650);
        } else {
          isTransitioningIotRef.current = false;
          if (isOrderFullyPicked) {
            setToastMessage({
              type: 'SUCCESS',
              text: `Hoàn thành lấy toàn bộ sản phẩm đơn ${session.orderCode}. Đơn đã sẵn sàng chuyển sang Đóng gói.`,
            });
          } else {
            setToastMessage({
              type: 'SUCCESS',
              text: `Đã lấy xong toàn bộ sản phẩm trên 3 kệ IoT (A1–A3) của đơn ${session.orderCode}.`,
            });
          }
          setTimeout(() => setToastMessage(null), 4500);
        }
      } catch (err) {
        console.warn('completeCurrentGuidedStepAndAdvance error:', err);
        isTransitioningIotRef.current = false;
      }
    },
    [effectiveWhCode, markItemPickedByIot, activateGuidedIotForItem]
  );

  // Reset trạng thái dẫn đường khi chuyển sang đơn hàng khác hoặc về chế độ ALL
  useEffect(() => {
    if (lastSelectedOrderRef.current !== selectedOrderId) {
      const prevOrder = lastSelectedOrderRef.current;
      lastSelectedOrderRef.current = selectedOrderId;
      if (prevOrder !== 'ALL') {
        stopGuidedIotSession(true);
      }
      setIotCompletedOrderCode(null);
      if (selectedOrderId !== 'ALL') {
        setIsAutoIotEnabled(true);
      }
    }
  }, [selectedOrderId, stopGuidedIotSession]);

  // Tự động kiểm tra kệ (A1, A2, A3) và bật LED + Còi cho sản phẩm đầu tiên khi nhân viên bấm vào đơn hàng
  useEffect(() => {
    if (selectedOrderId === 'ALL') return;
    if (!isAutoIotEnabled) return;
    if (isLoading) return;
    if (isTransitioningIotRef.current) return;
    if (guidedSessionRef.current) return;
    if (pendingDemoIotItems.length === 0) return;

    let nextItem = pendingDemoIotItems[0];
    if (targetItemId) {
      const clickedTarget = pendingDemoIotItems.find(
        it => it.id === targetItemId || it.sku === targetItemId
      );
      if (clickedTarget) {
        nextItem = clickedTarget;
      }
    }
    const stepIdx = orderDemoIotItems.findIndex(it => it.id === nextItem.id);
    const currentStep = stepIdx >= 0 ? stepIdx + 1 : orderDemoIotItems.length - pendingDemoIotItems.length + 1;
    activateGuidedIotForItem(nextItem, currentStep, orderDemoIotItems.length);
  }, [
    selectedOrderId,
    targetItemId,
    isAutoIotEnabled,
    isLoading,
    orderDemoIotItems,
    pendingDemoIotItems,
    activateGuidedIotForItem,
  ]);

  // Lắng nghe nút STOP vật lý từ ESP32 qua iot-service (polling nhanh 800ms) để tự tắt & nhảy sang sản phẩm kế tiếp
  useEffect(() => {
    if (!guidedIotSession && !activeLocatingShelf) return;

    const pollIotStop = async () => {
      try {
        const res = await getIotShelvesStatusApi();
        if (!res?.shelves) return;

        const session = guidedSessionRef.current;
        if (session && !isTransitioningIotRef.current) {
          const sh = res.shelves[session.shelfCode];
          if (!sh) return;

          const hasNewStopSeq =
            typeof sh.stopSeq === 'number' && sh.stopSeq > session.baselineStopSeq;
          const hasArrivedAfterStart =
            sh.status === 'ARRIVED' &&
            Boolean(sh.arrivedAt) &&
            new Date(sh.arrivedAt).getTime() >= session.startedAt - 1500;

          if (hasNewStopSeq || hasArrivedAfterStart) {
            await completeCurrentGuidedStepAndAdvance('HARDWARE_STOP');
          }
          return;
        }

        // Chế độ định vị lẻ thủ công khi xem ALL
        if (activeLocatingShelf) {
          const demoShelf = extractDemoIotShelf(activeLocatingShelf);
          if (demoShelf && res.shelves[demoShelf]?.status === 'ARRIVED') {
            setArrivedShelf(activeLocatingShelf);
            setActiveLocatingShelf(null);
            voiceAssistant.playTone('SUCCESS');
          }
        }
      } catch (e) {
        // silent pass
      }
    };

    const interval = setInterval(pollIotStop, 800);
    return () => clearInterval(interval);
  }, [guidedIotSession, activeLocatingShelf, completeCurrentGuidedStepAndAdvance]);

  // Dọn dẹp đèn/còi & timer khi nhân viên rời khỏi màn hình Soạn hàng
  useEffect(() => {
    return () => {
      if (iotTransitionTimerRef.current) {
        clearTimeout(iotTransitionTimerRef.current);
      }
      const active = guidedSessionRef.current;
      if (active) {
        stopShelfIotApi({
          warehouseCode: effectiveWhCode || 'WH-006',
          shelfCode: active.shelfCode,
        }).catch(() => {});
      }
    };
  }, [effectiveWhCode]);

  // Trigger Barcode/QR Scanning with Mutex Lock Acquisition
  const handleStartScan = async (item: PickingItem) => {
    const itemLock = item.orderId ? activeLocks[item.orderId] : null;
    if (itemLock && itemLock.userId !== (user?.id || 'usr-staff')) {
      alert(`Đơn hàng ${item.orderCode} đang được thao tác bởi ${itemLock.userName}. Bạn không thể thao tác cùng lúc.`);
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
          sku: activeScanItem.sku,
          pickedQuantity: newPickedCount,
          status: newPickedCount >= activeScanItem.quantity ? 'PICKED' : 'PENDING',
          lotCode: activeScanItem.lotCode,
        },
      ]).catch(err => console.warn('Sync picked item error:', err));
    }

    if (mode === 'LOT' || (pickedQty && pickedQty >= activeScanItem.quantity) || newPickedCount >= activeScanItem.quantity) {
      setToastMessage({
        type: 'SUCCESS',
        text: `Đã gom đủ: ${activeScanItem.productName} (${activeScanItem.quantity} ${activeScanItem.unit})`,
      });

      // IoT: Quét xong sản phẩm -> Tự động gửi lệnh hoàn tất và tắt đèn kệ
      const scannedDemoShelf = extractDemoIotShelf(activeScanItem.shelfLocation);
      if (scannedDemoShelf) {
        completeShelfIotApi({
          warehouseCode: effectiveWhCode || 'WH-006',
          shelfCode: scannedDemoShelf,
          orderId: activeScanItem.orderCode || activeScanItem.orderId,
        });
      }
      if (guidedSessionRef.current?.itemId === activeScanItem.id) {
        guidedSessionRef.current = null;
        setGuidedIotSession(null);
      }
      if (activeLocatingShelf === activeScanItem.shelfLocation) {
        setActiveLocatingShelf(null);
      }
      if (arrivedShelf === activeScanItem.shelfLocation) {
        setArrivedShelf(null);
      }
    } else {
      setToastMessage({
        type: 'SUCCESS',
        text: `Đã quét: ${activeScanItem.productName} (${newPickedCount}/${activeScanItem.quantity} ${activeScanItem.unit})`,
      });
    }

    // Check if all items in this order are now fully picked
    const updatedOrderItems = items
      .filter(it => it.orderId === activeScanItem.orderId)
      .map(it => it.id === activeScanItem.id ? { ...it, pickedQuantity: newPickedCount } : it);
    const isOrderFullyPicked = updatedOrderItems.length > 0 && updatedOrderItems.every(it => (it.pickedQuantity || 0) >= it.quantity);

    // Immediately notify backend -> If fully picked: status transitions to PACKING (Đang đóng gói)
    // If partially picked: status transitions to PICKING (Đang gom hàng)
    if (activeScanItem.orderId) {
      const targetStatus = isOrderFullyPicked ? 'PACKING' : 'PICKING';
      updateOutboundStatus(activeScanItem.orderId, targetStatus).catch(err => {
        console.warn('Live backend picking status sync error:', err);
      });

      if (isOrderFullyPicked) {
        localStorage.setItem(`citymart_order_just_transferred_${activeScanItem.orderId}`, 'true');
        localStorage.setItem(`citymart_order_ready_pack_${activeScanItem.orderId}`, 'true');
        if (activeScanItem.orderCode) {
          localStorage.setItem(`citymart_order_just_transferred_${activeScanItem.orderCode}`, 'true');
          localStorage.setItem(`citymart_order_ready_pack_${activeScanItem.orderCode}`, 'true');
        }

        const cleanId = activeScanItem.orderId.replace(/^ECOMM-/, '').replace(/^OB-/, '');
        fetch(`${API_URLS.ORDER}/orders/sync-status/${cleanId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'PACKING' }),
        }).catch(() => {});

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('staff_badge_refresh'));
        }
      }
    }

    setTimeout(() => setToastMessage(null), 3000);
  };

  // Hardware PDA Barcode Gun listener (Zebra / Honeywell DataWedge)
  const handleHardwareBarcodeScan = useCallback((scannedCode: string) => {
    const clean = scannedCode.trim().toLowerCase();
    const rawUpper = scannedCode.trim().toUpperCase();

    // Check if this scanned code is a LOT code
    const isLotCode = rawUpper.startsWith('LOT-') || rawUpper.startsWith('LO-') || rawUpper.startsWith('BATCH-') || rawUpper.startsWith('BOX-') || rawUpper.startsWith('THUNG-');

    // Find first pending item matching barcode, sku or lotCode
    const matchItem = items.find(it =>
      (it.lotCode && it.lotCode.toLowerCase() === clean) ||
      (it.barcode && it.barcode.toLowerCase() === clean) ||
      (it.sku && it.sku.toLowerCase() === clean) ||
      it.productName.toLowerCase().includes(clean)
    );

    if (matchItem) {
      if (matchItem.status === 'PICKED') {
        voiceAssistant.playTone('ALERT');
        return;
      }

      // If scanned code is LOT code or matches lotCode specifically: Full pick!
      const isLotMatch = isLotCode || (matchItem.lotCode && matchItem.lotCode.toLowerCase() === clean);

      if (isLotMatch) {
        voiceAssistant.playTone('SUCCESS');
        setActiveScanItem(matchItem);
        handleScanResult(scannedCode, true, 'LOT', matchItem.quantity);
        setToastMessage({
          type: 'SUCCESS',
          text: `Đã quét Mã Lô: Lấy trọn ${matchItem.quantity} ${matchItem.unit} ${matchItem.productName}`,
        });
      } else {
        const newPickedCount = Math.min(matchItem.quantity, (matchItem.pickedQuantity || 0) + 1);
        const isDone = newPickedCount >= matchItem.quantity;
        voiceAssistant.playTone(isDone ? 'SUCCESS' : 'BEEP');
        setActiveScanItem(matchItem);
        handleScanResult(scannedCode, true, 'ITEM', newPickedCount);
        setToastMessage({
          type: 'SUCCESS',
          text: `Đã quét +1 sản phẩm: ${matchItem.productName} (${newPickedCount}/${matchItem.quantity} ${matchItem.unit})`,
        });
      }
      setTimeout(() => setToastMessage(null), 3000);
    } else {
      voiceAssistant.playTone('ERROR');
      setToastMessage({
        type: 'ERROR',
        text: `Mã quét "${scannedCode}" không khớp với bất kỳ mặt hàng nào trong danh sách.`,
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
        await updateOutboundStatus(ordId, 'PACKING').catch(() => {});
        const cleanId = ordId.replace(/^ECOMM-/, '').replace(/^OB-/, '');
        fetch(`${API_URLS.ORDER}/orders/sync-status/${cleanId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'PACKING' }),
        }).catch(() => {});

        localStorage.setItem(`citymart_order_just_transferred_${ordId}`, 'true');
        localStorage.setItem(`citymart_order_ready_pack_${ordId}`, 'true');
        const foundOrder = availableOrders.find(o => o.id === ordId);
        if (foundOrder?.orderCode) {
          localStorage.setItem(`citymart_order_just_transferred_${foundOrder.orderCode}`, 'true');
          localStorage.setItem(`citymart_order_ready_pack_${foundOrder.orderCode}`, 'true');
          const cleanCode = foundOrder.orderCode.replace(/^ECOMM-/, '').replace(/^OB-/, '');
          fetch(`${API_URLS.ORDER}/orders/sync-status/${cleanCode}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'PACKING' }),
          }).catch(() => {});
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
        text: `Xuất kho thành công ${orderIdsToConfirm.length} đơn hàng. Đã tự động trừ tồn kho hệ thống.`,
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
    <div style={{ padding: '12px', paddingBottom: '90px', display: 'flex', flexDirection: 'column', gap: '10px' }}>

      {/* COMPACT UNIFIED HEADER */}
      <div
        style={{
          backgroundColor: '#ffffff',
          padding: '12px 14px',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        {/* Row 1: Order selector + Progress Counter + Menu button */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, minWidth: 0 }}>
            <Boxes size={16} color="#0f766e" style={{ flexShrink: 0 }} />
            {availableOrders.length > 0 ? (
              <select
                value={selectedOrderId}
                onChange={e => handleSelectOrderFilter(e.target.value)}
                style={{
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  padding: '4px 8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#0f172a',
                  backgroundColor: '#f8fafc',
                  maxWidth: '100%',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value="ALL">
                  Toàn bộ ({allWaveItems.length} món • {availableOrders.length} đơn)
                </option>
                {availableOrders.map(ord => {
                  const ordCount = allWaveItems.filter(i => i.orderId === ord.id || i.orderCode === ord.orderCode).length;
                  return (
                    <option key={ord.id} value={ord.id}>
                      {ord.orderCode} ({ordCount} món)
                    </option>
                  );
                })}
              </select>
            ) : (
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>Danh Sách Soạn Hàng</span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            {items.length > 0 && (
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: isAllPicked ? '#166534' : '#0f766e',
                  backgroundColor: isAllPicked ? '#f0fdf4' : '#f0fdfa',
                  border: `1px solid ${isAllPicked ? '#bbf7d0' : '#ccfbf1'}`,
                  padding: '2px 8px',
                  borderRadius: '6px',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {pickedUnits}/{totalUnits} sp ({progressPercent}%)
              </span>
            )}

            <button
              type="button"
              onClick={() => setIsToolsMenuOpen(true)}
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                padding: '5px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#475569',
              }}
              title="Menu tiện ích"
            >
              <MoreVertical size={16} />
            </button>
          </div>
        </div>

        {/* Thin Progress Bar */}
        {items.length > 0 && (
          <div style={{ height: '4px', backgroundColor: '#f1f5f9', borderRadius: '9999px', overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: `${progressPercent}%`,
                backgroundColor: isAllPicked ? '#166534' : '#0f766e',
                transition: 'width 0.3s ease',
                borderRadius: '9999px',
              }}
            />
          </div>
        )}

        {/* View Switcher & Filter Chips */}
        {items.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '2px' }}>
            {/* View Switcher: Danh Sách vs Sơ Đồ 3D */}
            <div style={{ display: 'flex', backgroundColor: '#f1f5f9', borderRadius: '6px', padding: '2px', border: '1px solid #e2e8f0' }}>
              <button
                type="button"
                onClick={() => setActiveTab('ITEMS_LIST')}
                style={{
                  flex: 1,
                  padding: '6px 10px',
                  borderRadius: '4px',
                  border: 'none',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  backgroundColor: activeTab === 'ITEMS_LIST' ? '#ffffff' : 'transparent',
                  color: activeTab === 'ITEMS_LIST' ? '#0f766e' : '#64748b',
                  boxShadow: activeTab === 'ITEMS_LIST' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                }}
              >
                <Layers size={13} />
                <span>Danh Sách ({pickedCount}/{items.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('3D_MAP')}
                style={{
                  flex: 1,
                  padding: '6px 10px',
                  borderRadius: '4px',
                  border: 'none',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  backgroundColor: activeTab === '3D_MAP' ? '#ffffff' : 'transparent',
                  color: activeTab === '3D_MAP' ? '#0f766e' : '#64748b',
                  boxShadow: activeTab === '3D_MAP' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                }}
              >
                <Compass size={13} />
                <span>Sơ Đồ Kệ 3D</span>
              </button>
            </div>

            {/* Filter Chips: Single Horizontal Row */}
            {activeTab === 'ITEMS_LIST' && (
              <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', paddingBottom: '2px' }}>
                {[
                  { id: 'PENDING', label: `Chưa lấy (${orderedItems.filter(i => i.status !== 'PICKED').length})` },
                  { id: 'PICKED', label: `Đã xong (${orderedItems.filter(i => i.status === 'PICKED').length})` },
                  { id: 'ALL', label: `Tất cả (${orderedItems.length})` },
                ].map(chip => (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => setItemFilterTab(chip.id as any)}
                    style={{
                      backgroundColor: itemFilterTab === chip.id ? '#0f766e' : '#ffffff',
                      color: itemFilterTab === chip.id ? '#ffffff' : '#475569',
                      border: `1px solid ${itemFilterTab === chip.id ? '#0f766e' : '#cbd5e1'}`,
                      borderRadius: '6px',
                      padding: '3px 8px',
                      fontSize: '10.5px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {chip.label}
                  </button>
                ))}

                <div style={{ width: '1px', backgroundColor: '#e2e8f0', margin: '0 2px' }} />

                {[
                  { id: 'ALL', label: 'Tất cả khu' },
                  { id: 'COOL', label: 'Kho Lạnh' },
                  { id: 'FROZEN', label: 'Kho Đông' },
                  { id: 'DRY', label: 'Kho Khô' },
                ].map(z => (
                  <button
                    key={z.id}
                    type="button"
                    onClick={() => setZoneFilter(z.id as any)}
                    style={{
                      backgroundColor: zoneFilter === z.id ? '#0f172a' : '#f8fafc',
                      color: zoneFilter === z.id ? '#ffffff' : '#64748b',
                      border: `1px solid ${zoneFilter === z.id ? '#0f172a' : '#e2e8f0'}`,
                      borderRadius: '6px',
                      padding: '3px 7px',
                      fontSize: '10.5px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {z.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Interactive Orders & Products Panel when viewing ALL orders -> click Order OR Product inside Order to start Sequential IoT Pick-to-Light */}
      {selectedOrderId === 'ALL' && availableOrders.length > 0 && (
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: 700, color: '#0f172a' }}>
              <Lightbulb size={16} color="#0f766e" />
              <span>Danh Sách Đơn Hàng &amp; Sản Phẩm Cần Lấy (Pick-to-Light Kệ A1–A3)</span>
            </div>
            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>
              Bấm vào đơn hoặc từng sản phẩm để bật đèn &amp; còi
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {availableOrders.map(ord => {
              const ordItems = allWaveItems.filter(i => i.orderId === ord.id || i.orderCode === ord.orderCode);
              const iotPendingCount = ordItems.filter(i => extractDemoIotShelf(i.shelfLocation) !== null && i.status !== 'PICKED').length;
              return (
                <div
                  key={ord.id}
                  style={{
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    backgroundColor: '#f8fafc',
                    padding: '10px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  {/* Clickable Order Header */}
                  <div
                    onClick={() => handleSelectOrderFilter(ord.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          backgroundColor: '#0f766e',
                          color: '#ffffff',
                          fontSize: '11.5px',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <Play size={11} />
                        {ord.orderCode}
                      </span>
                      <span style={{ fontSize: '11.5px', color: '#475569', fontWeight: 500 }}>
                        {ord.destination || 'Kho Gò Vấp'}
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        color: iotPendingCount > 0 ? '#075985' : '#166534',
                        backgroundColor: iotPendingCount > 0 ? '#f0f9ff' : '#f0fdf4',
                        border: `1px solid ${iotPendingCount > 0 ? '#bae6fd' : '#bbf7d0'}`,
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {iotPendingCount > 0 ? `Bấm đơn để chạy (${iotPendingCount} kệ IoT)` : 'Đã lấy xong'}
                    </span>
                  </div>

                  {/* Clickable Products inside this Order */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    {ordItems.map((it, idx) => {
                      const shelfCode = extractDemoIotShelf(it.shelfLocation);
                      const isDone = it.status === 'PICKED';
                      return (
                        <div
                          key={it.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedOrderId(ord.id);
                            setSearchParams({ orderId: ord.id, itemId: it.id });
                            setItems(allWaveItems.filter(i => i.orderId === ord.id || i.orderCode === ord.orderCode));
                            if (shelfCode) {
                              setIsAutoIotEnabled(true);
                              const ordIotItems = ordItems.filter(x => extractDemoIotShelf(x.shelfLocation) !== null);
                              const stepIndex = ordIotItems.findIndex(x => x.id === it.id);
                              activateGuidedIotForItem(
                                it,
                                stepIndex >= 0 ? stepIndex + 1 : 1,
                                Math.max(1, ordIotItems.length)
                              );
                            }
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '8px',
                            padding: '7px 10px',
                            borderRadius: '6px',
                            backgroundColor: isDone ? '#f0fdf4' : '#ffffff',
                            border: `1px solid ${isDone ? '#bbf7d0' : '#e2e8f0'}`,
                            cursor: 'pointer',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 700,
                                padding: '2px 6px',
                                borderRadius: '4px',
                                backgroundColor: shelfCode ? '#0f766e' : '#64748b',
                                color: '#ffffff',
                                flexShrink: 0,
                              }}
                            >
                              {shelfCode ? `Kệ ${shelfCode}` : it.shelfLocation}
                            </span>
                            <span
                              style={{
                                fontSize: '12px',
                                fontWeight: 600,
                                color: isDone ? '#166534' : '#0f172a',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {idx + 1}. {it.productName}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                            <span style={{ fontSize: '11px', fontWeight: 600, color: '#475569', fontVariantNumeric: 'tabular-nums' }}>
                              x{it.quantity} {it.unit}
                            </span>
                            <span
                              style={{
                                fontSize: '10.5px',
                                fontWeight: 600,
                                padding: '2px 6px',
                                borderRadius: '4px',
                                backgroundColor: isDone ? '#dcfce7' : shelfCode ? '#fffbeb' : '#f1f5f9',
                                color: isDone ? '#166534' : shelfCode ? '#92400e' : '#64748b',
                                border: `1px solid ${isDone ? '#bbf7d0' : shelfCode ? '#fde68a' : '#cbd5e1'}`,
                              }}
                            >
                              {isDone ? 'Đã lấy' : shelfCode ? 'Bấm bật đèn' : 'Ngoài IoT'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Sequential Pick-to-Light Active Guided Banner (Kệ A1, A2, A3) */}
      {guidedIotSession && (
        <div
          style={{
            backgroundColor: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: '8px',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Radio size={16} color="#92400e" />
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#92400e' }}>
                Pick-to-Light • Bước {guidedIotSession.step}/{guidedIotSession.totalSteps}
              </span>
            </div>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                backgroundColor: '#0f766e',
                color: '#ffffff',
                padding: '2px 8px',
                borderRadius: '6px',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              Kệ {guidedIotSession.shelfCode} ({guidedIotSession.shelfLocation})
            </span>
          </div>

          <div style={{ fontSize: '12.5px', color: '#0f172a', fontWeight: 600, lineHeight: 1.35 }}>
            {guidedIotSession.productName}{' '}
            <span style={{ color: '#0f766e', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
              (x{guidedIotSession.quantity} {guidedIotSession.unit})
            </span>
          </div>

          <div style={{ fontSize: '11.5px', color: '#92400e' }}>
            Đèn LED và còi tại Kệ {guidedIotSession.shelfCode} đang bật. Tới kệ lấy hàng và bấm nút STOP vật lý để tắt và tự chuyển sản phẩm kế tiếp.
          </div>

          <div style={{ display: 'flex', gap: '6px', marginTop: '2px' }}>
            <button
              type="button"
              onClick={() => completeCurrentGuidedStepAndAdvance('MANUAL_STOP')}
              style={{
                flex: 1,
                backgroundColor: '#0f766e',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                padding: '7px 10px',
                fontSize: '11.5px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
              }}
            >
              <SkipForward size={14} />
              <span>Xác nhận STOP &amp; Qua món kế</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setIsAutoIotEnabled(false);
                stopGuidedIotSession(true);
              }}
              style={{
                backgroundColor: '#ffffff',
                color: '#334155',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                padding: '7px 10px',
                fontSize: '11.5px',
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <Square size={12} />
              <span>Tạm dừng</span>
            </button>
          </div>
        </div>
      )}

      {/* Resume Sequential Pick-to-Light Banner when paused on a specific order */}
      {selectedOrderId !== 'ALL' && !guidedIotSession && !isAutoIotEnabled && pendingDemoIotItems.length > 0 && (
        <div
          style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            padding: '8px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
          }}
        >
          <span style={{ fontSize: '11.5px', color: '#475569', fontWeight: 500 }}>
            Đang tạm dừng dẫn đường Pick-to-Light (còn {pendingDemoIotItems.length} món trên kệ A1–A3).
          </span>
          <button
            type="button"
            onClick={() => setIsAutoIotEnabled(true)}
            style={{
              backgroundColor: '#0f766e',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              padding: '5px 10px',
              fontSize: '11.5px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              whiteSpace: 'nowrap',
            }}
          >
            <Play size={12} />
            <span>Tiếp tục IoT</span>
          </button>
        </div>
      )}

      {/* Order has no items on the 3 Demo IoT shelves (A1, A2, A3) */}
      {selectedOrderId !== 'ALL' && !isLoading && items.length > 0 && orderDemoIotItems.length === 0 && (
        <div
          style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '8px 12px',
            fontSize: '11.5px',
            color: '#475569',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Lightbulb size={14} color="#64748b" />
          <span>Đơn hàng này không có sản phẩm nằm trên 3 kệ demo IoT (A1, A2, A3). Đèn và còi không kích hoạt.</span>
        </div>
      )}

      {/* IoT Sequential Completion Banner */}
      {iotCompletedOrderCode && (
        <div
          style={{
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '8px',
            padding: '10px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#166534', fontWeight: 600 }}>
            <CheckCircle2 size={16} color="#166534" />
            <span>Đã hoàn thành lấy hàng đơn {iotCompletedOrderCode} qua Pick-to-Light.</span>
          </div>
          <button
            type="button"
            onClick={() => setIotCompletedOrderCode(null)}
            style={{ background: 'none', border: 'none', color: '#166534', cursor: 'pointer', padding: '2px' }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Active IoT Shelf Finding Banner (Manual single-shelf LOCATING when not in guided session) */}
      {activeLocatingShelf && !guidedIotSession && (
        <div
          style={{
            backgroundColor: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: '8px',
            padding: '8px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: '#92400e', fontWeight: 600 }}>
            <Radio size={15} color="#d97706" />
            <span>Đang định vị kệ: <b>{activeLocatingShelf}</b> (Đèn và còi đang bật. Bấm nút STOP khi đến nơi)</span>
          </div>
          <button
            onClick={() => {
              if (activeLocatingShelf) {
                stopShelfIotApi({ warehouseCode: effectiveWhCode || 'WH-006', shelfCode: activeLocatingShelf });
              }
              setActiveLocatingShelf(null);
            }}
            style={{ background: 'none', border: 'none', color: '#92400e', cursor: 'pointer', padding: '2px 4px' }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* IoT Shelf Arrived Banner (ARRIVED - Staff pressed STOP button on hardware) */}
      {arrivedShelf && (
        <div
          style={{
            backgroundColor: '#f0f9ff',
            border: '1px solid #bae6fd',
            borderRadius: '8px',
            padding: '8px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: '#075985', fontWeight: 600 }}>
            <CheckCircle2 size={15} color="#0284c7" />
            <span>Đã đến kệ: <b>{arrivedShelf}</b> (Đã bấm nút STOP). Vui lòng quét mã sản phẩm để hoàn tất!</span>
          </div>
          <button
            onClick={() => setArrivedShelf(null)}
            style={{ background: 'none', border: 'none', color: '#075985', cursor: 'pointer', padding: '2px 4px' }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            backgroundColor: toastMessage.type === 'SUCCESS' ? '#f0fdf4' : '#fef2f2',
            border: `1px solid ${toastMessage.type === 'SUCCESS' ? '#bbf7d0' : '#fecaca'}`,
            borderRadius: '8px',
            padding: '10px 14px',
            color: toastMessage.type === 'SUCCESS' ? '#166534' : '#991b1b',
            fontSize: '11.5px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          {toastMessage.type === 'SUCCESS' ? <CheckCircle2 size={16} color="#166534" /> : <AlertTriangle size={16} color="#991b1b" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* EMPTY STATE */}
      {items.length === 0 && !isLoading && (
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '10px',
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
              width: '56px',
              height: '56px',
              borderRadius: '12px',
              backgroundColor: '#f0fdfa',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Inbox size={28} color="#0f766e" />
          </div>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#0f172a' }}>
            Chưa có đợt lấy hàng nào đang chờ
          </h3>
          <p style={{ margin: 0, fontSize: '12px', color: '#64748b', maxWidth: '300px', lineHeight: 1.4 }}>
            Hệ thống đang kết nối và chờ đơn xuất kho mới được tiếp nhận.
          </p>
          <button
            onClick={() => loadLiveData()}
            style={{
              backgroundColor: '#0f766e',
              color: '#ffffff',
              border: 'none',
              padding: '9px 16px',
              borderRadius: '6px',
              fontWeight: 600,
              fontSize: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <RefreshCw size={14} /> Kiểm Tra Đơn Mới
          </button>
        </div>
      )}

      {/* 3D MAP TAB */}
      {items.length > 0 && activeTab === '3D_MAP' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ borderRadius: '10px', overflow: 'hidden', border: '1px solid #e2e8f0', minHeight: '260px', backgroundColor: '#0f172a' }}>
            {!isScannerOpen ? (
              <Mobile3DWarehouseView
                waypoints={waypoints}
                currentWaypointIndex={currentWaypointIndex}
                items={orderedItems}
                activeItem={currentPendingItem}
                warehouseCode={effectiveWhCode}
                lots={liveLots}
                products={liveProducts}
              />
            ) : (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: '#94a3b8', fontSize: '12.5px' }}>
                Đang tạm dừng đồ họa 3D để tối ưu hóa hiệu năng quét Camera...
              </div>
            )}
          </div>

          {currentPendingItem ? (
            <div
              style={{
                backgroundColor: '#ffffff',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #0f766e',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ fontSize: '10px', color: '#0f766e', fontWeight: 600 }}>KỆ TIẾP THEO:</div>
                <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0f172a' }}>
                  {currentPendingItem.shelfLocation}
                </div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>
                  {currentPendingItem.productName} (Cần: <b>{currentPendingItem.quantity} {currentPendingItem.unit}</b>)
                </div>
              </div>

              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <button
                  onClick={() => handleLocateShelf(currentPendingItem)}
                  style={{
                    backgroundColor: arrivedShelf === currentPendingItem.shelfLocation
                      ? '#0284c7'
                      : activeLocatingShelf === currentPendingItem.shelfLocation
                      ? '#d97706'
                      : '#fffbeb',
                    color: arrivedShelf === currentPendingItem.shelfLocation || activeLocatingShelf === currentPendingItem.shelfLocation
                      ? '#ffffff'
                      : '#b45309',
                    border: arrivedShelf === currentPendingItem.shelfLocation
                      ? '1px solid #0284c7'
                      : '1px solid #fde68a',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    fontWeight: 600,
                    fontSize: '11.5px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  {arrivedShelf === currentPendingItem.shelfLocation ? (
                    <>
                      <CheckCircle2 size={14} />
                      <span>Đã đến kệ</span>
                    </>
                  ) : (
                    <>
                      <Radio size={14} />
                      <span>{activeLocatingShelf === currentPendingItem.shelfLocation ? 'Đang nháy' : 'Định Vị'}</span>
                    </>
                  )}
                </button>

                <button
                  disabled={isLockedByOther}
                  onClick={() => handleStartScan(currentPendingItem)}
                  style={{
                    backgroundColor: isLockedByOther ? '#94a3b8' : '#0f766e',
                    color: '#ffffff',
                    border: 'none',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    fontWeight: 600,
                    fontSize: '11.5px',
                    cursor: isLockedByOther ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <ScanBarcode size={14} /> {isLockedByOther ? 'Khóa' : 'Quét'}
                </button>
              </div>
            </div>
          ) : (
            <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '14px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#166534', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <CheckCircle2 size={16} color="#166534" />
                ĐÃ HOÀN TẤT LẤY TOÀN BỘ SẢN PHẨM TRÊN KỆ
              </div>
              <button
                disabled={isLockedByOther}
                onClick={handleTransferToPacking}
                style={{
                  width: '100%',
                  backgroundColor: isLockedByOther ? '#cbd5e1' : '#0f766e',
                  color: '#ffffff',
                  border: 'none',
                  padding: '10px 14px',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: isLockedByOther ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <PackageCheck size={16} />
                <span>Chuyển Sang Khâu Đóng Gói →</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ITEMS LIST TAB */}
      {items.length > 0 && activeTab === 'ITEMS_LIST' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {orderedItems
            .filter(item => {
              if (itemFilterTab === 'PENDING' && item.status === 'PICKED') return false;
              if (itemFilterTab === 'PICKED' && item.status !== 'PICKED') return false;
              if (zoneFilter !== 'ALL' && item.zone !== zoneFilter) return false;
              return true;
            })
            .map((item, idx) => {
              const isPicked = item.status === 'PICKED';
              const isExpanded = Boolean(expandedPickedIds[item.id]);

              // COLLAPSED PICKED ITEM ROW
              if (isPicked && !isExpanded) {
                return (
                  <div
                    key={item.id}
                    onClick={() => toggleExpandPicked(item.id)}
                    style={{
                      backgroundColor: '#f0fdf4',
                      border: '1px solid #bbf7d0',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                      <CheckCircle2 size={16} color="#166534" style={{ flexShrink: 0 }} />
                      <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#166534', flexShrink: 0 }}>
                        {item.shelfLocation}
                      </span>
                      <span style={{ fontSize: '12px', color: '#166534', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.productName}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: '#166534', fontVariantNumeric: 'tabular-nums' }}>
                        {item.quantity} {item.unit}
                      </span>
                      <ChevronDown size={14} color="#166534" />
                    </div>
                  </div>
                );
              }

              // FULL ACTIVE ITEM CARD (OR EXPANDED PICKED)
              const isNext = !isPicked && item.id === currentPendingItem?.id;
              const isGuidedNow = !isPicked && guidedIotSession?.itemId === item.id;

              return (
                <div
                  key={item.id}
                  onClick={() => {
                    if (selectedOrderId === 'ALL' && item.orderId) {
                      handleSelectOrderFilter(item.orderId);
                    }
                    const demoShelf = extractDemoIotShelf(item.shelfLocation);
                    if (demoShelf) {
                      setIsAutoIotEnabled(true);
                      const sameOrderIot = orderedItems.filter(
                        it =>
                          (it.orderId === item.orderId || it.orderCode === item.orderCode) &&
                          extractDemoIotShelf(it.shelfLocation) !== null
                      );
                      const stepIdx = sameOrderIot.findIndex(it => it.id === item.id);
                      activateGuidedIotForItem(
                        item,
                        stepIdx >= 0 ? stepIdx + 1 : 1,
                        Math.max(1, sameOrderIot.length)
                      );
                    } else {
                      handleLocateShelf(item);
                    }
                  }}
                  style={{
                    backgroundColor: isPicked ? '#f0fdf4' : isGuidedNow ? '#fffbeb' : '#ffffff',
                    borderRadius: '8px',
                    border: `1px solid ${isPicked ? '#bbf7d0' : isGuidedNow ? '#d97706' : isNext ? '#0f766e' : '#e2e8f0'}`,
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                    cursor: 'pointer',
                  }}
                  title="Bấm vào sản phẩm để bật đèn LED & Còi tại kệ của sản phẩm này"
                >
                  {isGuidedNow && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        backgroundColor: '#fef3c7',
                        border: '1px solid #fde68a',
                        borderRadius: '6px',
                        padding: '4px 8px',
                        fontSize: '11px',
                        fontWeight: 600,
                        color: '#92400e',
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Radio size={13} color="#92400e" />
                        LED &amp; Còi đang bật tại Kệ {guidedIotSession?.shelfCode} — Chờ bấm nút STOP
                      </span>
                      <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {guidedIotSession?.step}/{guidedIotSession?.totalSteps}
                      </span>
                    </div>
                  )}
                  {/* Top Row: Shelf Location & Zone + Target Quantity */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          backgroundColor: isNext ? '#0f766e' : '#0f172a',
                          color: '#ffffff',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '11.5px',
                          fontWeight: 700,
                        }}
                      >
                        <MapPin size={12} />
                        <span>{item.shelfLocation}</span>
                      </div>
                      {(() => {
                        const zm = resolveStorageZone({
                          zone: item.zone,
                          shelfLocation: item.shelfLocation,
                          productName: item.productName,
                          sku: item.sku,
                          temperatureRequired: item.temperatureRequired,
                        });
                        return (
                          <span
                            title={`${zm.label} (${zm.tempRange})`}
                            style={{
                              fontSize: '10px',
                              fontWeight: 600,
                              padding: '2px 6px',
                              borderRadius: '4px',
                              backgroundColor: zm.badgeStyle.backgroundColor,
                              color: zm.badgeStyle.color,
                              border: zm.badgeStyle.border,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {zm.label}
                          </span>
                        );
                      })()}
                      {item.orderCode && (
                        <span style={{ fontSize: '10px', fontWeight: 500, color: '#64748b' }}>
                          #{item.orderCode.slice(-6)}
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: '12px', fontWeight: 700, color: isPicked ? '#166534' : '#0f766e', fontVariantNumeric: 'tabular-nums' }}>
                      {isPicked
                        ? `Đủ: ${item.quantity} ${item.unit}`
                        : (item.pickedQuantity || 0) > 0
                        ? `Lấy: ${item.pickedQuantity}/${item.quantity} ${item.unit}`
                        : `Cần: ${item.quantity} ${item.unit}`}
                    </div>
                  </div>

                  {/* Product Name & SKU / Lot */}
                  <div>
                    <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#0f172a', lineHeight: 1.3 }}>
                      {item.productName}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      <span>SKU: <strong style={{ color: '#0f172a' }}>{item.sku}</strong></span>
                      <span>•</span>
                      <span>Lô: <strong style={{ color: '#0284c7' }}>{item.lotCode}</strong></span>
                      <span>•</span>
                      <span>HSD: <strong style={{ color: '#92400e' }}>{item.expiryDate}</strong></span>
                    </div>
                  </div>

                  {/* Partial Progress if started */}
                  {!isPicked && (item.pickedQuantity || 0) > 0 && (
                    <div style={{ height: '3px', backgroundColor: '#e2e8f0', borderRadius: '9999px', overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${Math.min(100, Math.round(((item.pickedQuantity || 0) / item.quantity) * 100))}%`,
                          backgroundColor: '#0f766e',
                        }}
                      />
                    </div>
                  )}

                  {/* Action Buttons Row */}
                  {!isPicked ? (
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      {/* Main Scan Button */}
                      <button
                        disabled={isLockedByOther}
                        onClick={() => handleStartScan(item)}
                        style={{
                          flex: 1,
                          height: '38px',
                          backgroundColor: isLockedByOther ? '#cbd5e1' : isNext ? '#0f766e' : '#0284c7',
                          color: isLockedByOther ? '#64748b' : '#ffffff',
                          border: 'none',
                          borderRadius: '6px',
                          fontWeight: 600,
                          fontSize: '12.5px',
                          cursor: isLockedByOther ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                        }}
                      >
                        {isLockedByOther ? <Lock size={15} /> : <ScanBarcode size={15} />}
                        <span>
                          {isLockedByOther
                            ? `Khóa bởi ${currentLock?.userName}`
                            : (item.pickedQuantity || 0) > 0
                            ? `Quét tiếp (${item.pickedQuantity}/${item.quantity})`
                            : 'Quét lấy hàng'}
                        </span>
                      </button>

                      {/* IoT LED locate button */}
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          handleLocateShelf(item);
                        }}
                        style={{
                          height: '38px',
                          padding: '0 8px',
                          borderRadius: '6px',
                          border: `1px solid ${
                            arrivedShelf === item.shelfLocation
                              ? '#bbf7d0'
                              : activeLocatingShelf === item.shelfLocation
                              ? '#0284c7'
                              : '#cbd5e1'
                          }`,
                          backgroundColor:
                            arrivedShelf === item.shelfLocation
                              ? '#f0fdf4'
                              : activeLocatingShelf === item.shelfLocation
                              ? '#0284c7'
                              : '#f8fafc',
                          color:
                            arrivedShelf === item.shelfLocation
                              ? '#166534'
                              : activeLocatingShelf === item.shelfLocation
                              ? '#ffffff'
                              : '#334155',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px',
                          cursor: 'pointer',
                          flexShrink: 0,
                          fontSize: '11px',
                          fontWeight: 600,
                        }}
                        title={
                          arrivedShelf === item.shelfLocation
                            ? 'Đã đến kệ (Đã bấm STOP)'
                            : activeLocatingShelf === item.shelfLocation
                            ? 'Đang nhấp nháy định vị kệ'
                            : 'Nháy đèn LED định vị kệ'
                        }
                      >
                        {arrivedShelf === item.shelfLocation ? (
                          <>
                            <CheckCircle2 size={13} color="#166534" />
                            <span>Đã đến</span>
                          </>
                        ) : activeLocatingShelf === item.shelfLocation ? (
                          <>
                            <Radio size={13} color="#ffffff" />
                            <span>Đang nháy</span>
                          </>
                        ) : (
                          <>
                            <Radio size={13} color="#475569" />
                            <span>Định vị</span>
                          </>
                        )}
                      </button>

                      {/* Shortage Exception button */}
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          handleOpenShortage(item);
                        }}
                        style={{
                          width: '38px',
                          height: '38px',
                          borderRadius: '6px',
                          border: '1px solid #fde68a',
                          backgroundColor: '#fffbeb',
                          color: '#92400e',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          flexShrink: 0,
                        }}
                        title="Báo thiếu hàng / Đổi lô"
                      >
                        <AlertTriangle size={16} />
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '4px', borderTop: '1px dashed #bbf7d0' }}>
                      <span style={{ fontSize: '11px', color: '#166534', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <CheckCircle2 size={13} color="#166534" /> Đã gom đủ sản phẩm
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleExpandPicked(item.id)}
                        style={{ background: 'none', border: 'none', color: '#166534', fontSize: '11px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px' }}
                      >
                        Thu gọn <ChevronUp size={13} />
                      </button>
                    </div>
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
                border: '1px solid #bbf7d0',
                borderRadius: '8px',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={20} color="#166534" />
                <div>
                  <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                    ĐÃ GOM ĐỦ 100% SẢN PHẨM!
                  </h4>
                  <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#64748b' }}>
                    Tất cả các món đã gom đủ. Bấm nút dưới để chuyển sang khâu đóng gói.
                  </p>
                </div>
              </div>

              <button
                disabled={isLockedByOther}
                onClick={handleTransferToPacking}
                style={{
                  width: '100%',
                  backgroundColor: isLockedByOther ? '#cbd5e1' : '#0f766e',
                  color: '#ffffff',
                  border: 'none',
                  padding: '11px',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '13.5px',
                  cursor: isLockedByOther ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <PackageCheck size={16} />
                <span>Chuyển Sang Khâu Đóng Gói →</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tools Menu Bottom Sheet / Modal */}
      {isToolsMenuOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.5)',
            zIndex: 9990,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
          }}
          onClick={() => setIsToolsMenuOpen(false)}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderTopLeftRadius: '14px',
              borderTopRightRadius: '14px',
              width: '100%',
              maxWidth: '460px',
              padding: '16px',
              boxShadow: '0 -4px 16px rgba(0,0,0,0.15)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#0f172a' }}>
                Tiện Ích & Báo Cáo
              </span>
              <button
                onClick={() => setIsToolsMenuOpen(false)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {/* Voice toggle */}
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
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  color: '#0f172a',
                  fontSize: '12.5px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {isVoiceEnabled ? <Volume2 size={16} color="#059669" /> : <VolumeX size={16} color="#94a3b8" />}
                  <span>Âm thanh phản hồi</span>
                </div>
                <span style={{ fontSize: '11px', fontWeight: 600, color: isVoiceEnabled ? '#059669' : '#94a3b8' }}>
                  {isVoiceEnabled ? 'ĐANG BẬT' : 'ĐANG TẮT'}
                </span>
              </button>

              {/* Handover shift */}
              <button
                onClick={() => {
                  setIsToolsMenuOpen(false);
                  setIsShiftModalOpen(true);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  color: '#0f172a',
                  fontSize: '12.5px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <FileSpreadsheet size={16} color="#0284c7" />
                <span>Tổng Kết & Bàn Giao Ca</span>
              </button>

              {/* Incident report */}
              <button
                onClick={() => {
                  setIsToolsMenuOpen(false);
                  setIsIncidentModalOpen(true);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#991b1b',
                  fontSize: '12.5px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <AlertTriangle size={16} color="#dc2626" />
                <span>Báo Cáo Sự Cố Kho / Hỏng Kệ</span>
              </button>

              {/* Refresh data */}
              <button
                onClick={() => {
                  setIsToolsMenuOpen(false);
                  loadLiveData(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  color: '#0f172a',
                  fontSize: '12.5px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <RefreshCw size={16} color="#0f766e" />
                <span>Làm Mới Danh Sách Soạn Hàng</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Bar when 100% picked across the entire wave */}
      {isAllPicked && (
        <div
          style={{
            position: 'fixed',
            bottom: '72px',
            left: '12px',
            right: '12px',
            zIndex: 40,
            backgroundColor: '#ffffff',
            border: '1px solid #bbf7d0',
            borderRadius: '10px',
            padding: '10px 14px',
            boxShadow: '0 4px 14px rgba(15, 23, 42, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
            <CheckCircle2 size={18} color="#166534" style={{ flexShrink: 0 }} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                Đã gom đủ 100% sản phẩm
              </div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>
                {pickedCount}/{items.length} món đã hoàn tất
              </div>
            </div>
          </div>
          <button
            disabled={isLockedByOther}
            onClick={handleTransferToPacking}
            style={{
              backgroundColor: isLockedByOther ? '#cbd5e1' : '#0f766e',
              color: '#ffffff',
              border: 'none',
              padding: '9px 14px',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '12.5px',
              cursor: isLockedByOther ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            <PackageCheck size={16} />
            <span>Đóng Gói →</span>
          </button>
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
      />

      {/* Enterprise Incident Escalation Modal */}
      <IncidentReportModal
        isOpen={isIncidentModalOpen}
        onClose={() => setIsIncidentModalOpen(false)}
        defaultLocation={activeScanItem?.shelfLocation || currentPendingItem?.shelfLocation || 'Kệ Khô D-02'}
        defaultSku={activeScanItem?.sku || currentPendingItem?.sku || ''}
      />

      {/* Shortage & Exception Modal */}
      {shortageItem && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px',
          }}
          onClick={() => setShortageItem(null)}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              maxWidth: '460px',
              width: '100%',
              padding: '18px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '6px', backgroundColor: '#fffbeb', border: '1px solid #fde68a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AlertTriangle size={16} color="#92400e" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
                    Xử Lý Thiếu Hàng / Đổi Lô
                  </h3>
                  <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>
                    Ghi nhận sai lệch tồn kho hoặc tìm lô hàng dự phòng
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShortageItem(null)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Current Item Overview */}
            <div style={{ backgroundColor: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}>
              <div style={{ fontWeight: 700, color: '#0f172a' }}>{shortageItem.productName}</div>
              <div style={{ color: '#475569', marginTop: '3px' }}>
                Mã SP: <b>{shortageItem.sku}</b> • Lô hiện tại: <b style={{ color: '#0284c7' }}>{shortageItem.lotCode}</b>
              </div>
              <div style={{ color: '#475569', marginTop: '2px' }}>
                Vị trí kệ: <b>{shortageItem.shelfLocation}</b> • Cần lấy: <b>{shortageItem.quantity} {shortageItem.unit}</b>
              </div>
            </div>

            {/* Exception Reason Selector */}
            <div>
              <label style={{ fontSize: '11.5px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>
                Lý Do Phát Sinh Ngoại Lệ:
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                {[
                  { id: 'OUT_OF_STOCK', label: 'Hết hàng trên kệ' },
                  { id: 'DAMAGED', label: 'Bao bì hỏng / vỡ' },
                  { id: 'EXPIRED', label: 'Hết hạn sử dụng' },
                ].map(r => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setShortageReason(r.id as any)}
                    style={{
                      padding: '8px 4px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 600,
                      border: `1px solid ${shortageReason === r.id ? '#92400e' : '#cbd5e1'}`,
                      backgroundColor: shortageReason === r.id ? '#fffbeb' : '#ffffff',
                      color: shortageReason === r.id ? '#92400e' : '#475569',
                      cursor: 'pointer',
                      textAlign: 'center',
                    }}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Actual Quantity Found */}
            <div>
              <label style={{ fontSize: '11.5px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                Số Lượng Thực Tế Tìm Thấy Trên Kệ ({shortageItem.unit}):
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="number"
                  min="0"
                  max={shortageItem.quantity}
                  value={shortageActualQty}
                  onChange={e => setShortageActualQty(Math.min(shortageItem.quantity, Math.max(0, Number(e.target.value))))}
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    fontSize: '14px',
                    fontWeight: 700,
                    width: '90px',
                    textAlign: 'center',
                    color: '#0f172a',
                  }}
                />
                <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                  Thiếu: <strong style={{ color: '#dc2626' }}>{Math.max(0, shortageItem.quantity - Number(shortageActualQty))} {shortageItem.unit}</strong>
                </span>
              </div>
            </div>

            {/* Alternative Lots Suggestion */}
            <div>
              <div style={{ fontSize: '11.5px', fontWeight: 600, color: '#0f172a', marginBottom: '6px' }}>
                GỢI Ý LÔ DỰ PHÒNG THAY THẾ ({suggestedAlternativeLots.length}):
              </div>

              {suggestedAlternativeLots.length === 0 ? (
                <div style={{ padding: '10px 12px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '11.5px', color: '#64748b' }}>
                  Không còn lô dự phòng nào khác cùng mã SKU trong kho.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '140px', overflowY: 'auto' }}>
                  {suggestedAlternativeLots.map(alt => (
                    <div
                      key={alt.id || alt.lotCode}
                      style={{
                        padding: '8px 10px',
                        backgroundColor: '#f0fdf4',
                        border: '1px solid #bbf7d0',
                        borderRadius: '6px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#166534' }}>
                          Lô: {alt.lotCode}
                        </div>
                        <div style={{ fontSize: '10.5px', color: '#475569' }}>
                          Kệ: <b>{formatStandardShelfLocation(alt.location, alt.zone)}</b> • Tồn: <b>{alt.quantity} {shortageItem.unit}</b>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSwitchToAlternativeLot(alt)}
                        style={{
                          backgroundColor: '#166534',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '5px 10px',
                          fontSize: '11px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Đổi sang lô này
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
              <button
                type="button"
                onClick={() => setShortageItem(null)}
                style={{
                  flex: 1,
                  backgroundColor: '#ffffff',
                  color: '#475569',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  padding: '9px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmShortage}
                style={{
                  flex: 2,
                  backgroundColor: '#92400e',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '9px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Xác Nhận Thiếu & Tiếp Tục
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
