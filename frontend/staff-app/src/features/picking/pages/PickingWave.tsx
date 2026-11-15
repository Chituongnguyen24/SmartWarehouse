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
} from 'lucide-react';
import { PickingItem } from '@/types';
import { CameraScannerModal } from '@/shared';
import { Mobile3DWarehouseView } from '@/features/picking';
import { formatStandardShelfLocation } from '@/features/picking';
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
  API_URLS,
} from '@/shared';
import { useStaffWebSocket } from '@/features/dashboard';
import { useAuth } from '@/features/auth';

export const PickingWave: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const targetOrderId = searchParams.get('orderId');

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
  const [smartkeyPingingShelf, setSmartkeyPingingShelf] = useState<string | null>(null);

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
    const newLoc = formatStandardShelfLocation(altLot.location, altLot.zone);
    const newLotCode = altLot.lotCode;
    const newZone = (altLot.zone || shortageItem.zone || 'DRY').toUpperCase() as 'DRY' | 'COOL' | 'FROZEN';

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
        const dbLot = (it.lotCode ? lotMap.get(it.lotCode) : null) || matchingLots[0] || ((it as any).productId ? lotMap.get((it as any).productId) : null);
        const dbProd = (it.sku ? prodMap.get(it.sku) : null) || (dbLot?.productId ? prodMap.get(dbLot.productId) : null);

        const z = (dbLot?.zone || it.zone || 'DRY').toUpperCase() as 'DRY' | 'COOL' | 'FROZEN';
        const loc = formatShelfLocation(dbLot?.location || it.slotId || it.location || (it as any).shelfLocation, z, idx + 1);

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

      // IoT: Quét xong sản phẩm -> Tự động gửi lệnh tắt đèn kệ
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
                  { id: 'COOL', label: 'Mát' },
                  { id: 'FROZEN', label: 'Đông' },
                  { id: 'DRY', label: 'Khô' },
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

      {/* Active IoT Shelf Finding Banner */}
      {activeLocatingShelf && (
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
            <Volume2 size={15} color="#d97706" />
            <span>Đang định vị kệ: <b>{activeLocatingShelf}</b></span>
          </div>
          <button
            onClick={() => setActiveLocatingShelf(null)}
            style={{ background: 'none', border: 'none', color: '#92400e', cursor: 'pointer', padding: '2px 4px' }}
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
                    backgroundColor: activeLocatingShelf === currentPendingItem.shelfLocation ? '#d97706' : '#fffbeb',
                    color: activeLocatingShelf === currentPendingItem.shelfLocation ? '#ffffff' : '#b45309',
                    border: '1px solid #fde68a',
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
                  <Volume2 size={14} />
                  <span>{activeLocatingShelf === currentPendingItem.shelfLocation ? 'Đang kêu' : 'Định Vị'}</span>
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

              return (
                <div
                  key={item.id}
                  style={{
                    backgroundColor: isPicked ? '#f0fdf4' : '#ffffff',
                    borderRadius: '8px',
                    border: `1px solid ${isPicked ? '#bbf7d0' : isNext ? '#0f766e' : '#e2e8f0'}`,
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                  }}
                >
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
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 600,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          backgroundColor: item.zone === 'COOL' ? '#f0fdf4' : item.zone === 'FROZEN' ? '#f0f9ff' : '#f8fafc',
                          color: item.zone === 'COOL' ? '#166534' : item.zone === 'FROZEN' ? '#075985' : '#475569',
                          border: `1px solid ${item.zone === 'COOL' ? '#bbf7d0' : item.zone === 'FROZEN' ? '#bae6fd' : '#e2e8f0'}`,
                        }}
                      >
                        {item.zone === 'COOL' ? '0-4°C' : item.zone === 'FROZEN' ? '-18°C' : 'Khô'}
                      </span>
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

                      {/* IoT LED button */}
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          handleLocateShelf(item);
                        }}
                        style={{
                          width: '38px',
                          height: '38px',
                          borderRadius: '6px',
                          border: `1px solid ${activeLocatingShelf === item.shelfLocation ? '#0284c7' : '#cbd5e1'}`,
                          backgroundColor: activeLocatingShelf === item.shelfLocation ? '#0284c7' : '#f8fafc',
                          color: activeLocatingShelf === item.shelfLocation ? '#ffffff' : '#475569',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          flexShrink: 0,
                        }}
                        title="Nháy đèn LED định vị kệ"
                      >
                        <Radio size={16} />
                      </button>

                      {/* Smartkey Horn Chirp button */}
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          handleSmartkeyChirp(item);
                        }}
                        style={{
                          width: '38px',
                          height: '38px',
                          borderRadius: '6px',
                          border: `1px solid ${smartkeyPingingShelf === item.shelfLocation ? '#d97706' : '#cbd5e1'}`,
                          backgroundColor: smartkeyPingingShelf === item.shelfLocation ? '#fef3c7' : '#f8fafc',
                          color: smartkeyPingingShelf === item.shelfLocation ? '#b45309' : '#475569',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          flexShrink: 0,
                        }}
                        title="Bấm còi tìm kệ"
                      >
                        <Volume2 size={16} />
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
