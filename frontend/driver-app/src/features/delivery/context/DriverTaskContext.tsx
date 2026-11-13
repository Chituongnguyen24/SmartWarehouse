import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import * as Location from 'expo-location';
import { DeliveryTask, DriverProfile, TaskStatus } from '@/types/driver';
import { driverApi, TelemetryPayload, DRIVER_SESSION_KEY, setAuthToken, BACKEND_HOST } from '@/shared';
import { storageHelper } from '@/shared';
import { io } from 'socket.io-client';
import { resolveProductUnit, calculatePackingBoxes } from '@/shared';

export type TripStatus = 'WAITING_ACCEPT' | 'IN_TRANSIT' | 'RETURNING_TO_HUB';

export interface DriverLiveLocation {
  lat: number;
  lng: number;
  speedKmh: number;
  updatedAt: number;
}

interface DriverTaskContextType {
  driverProfile: DriverProfile;
  availableDrivers: DriverProfile[];
  switchDriverProfile: (driverIdOrPhone: string) => Promise<boolean>;
  isAuthenticated: boolean;
  isSessionChecking: boolean;
  login: (phoneOrCode: string, password?: string) => Promise<boolean>;
  logout: () => void;
  toggleOnline: () => void;
  updateContainerTemp: (temp: number) => void;
  tasks: DeliveryTask[];
  activeTask: DeliveryTask | null;
  setActiveTask: (task: DeliveryTask | null) => void;
  startDelivery: (taskId: string) => Promise<void>;
  completeDelivery: (taskId: string, proofImageUri?: string) => Promise<void>;
  completeBatchDelivery: (taskIds: string[], proofImageUri?: string) => Promise<void>;
  reportDeliveryFailure: (taskId: string, reason: string, photoUrl?: string) => Promise<void>;
  assignedTasks: DeliveryTask[];
  inTransitTasks: DeliveryTask[];
  deliveredTasks: DeliveryTask[];
  refreshTasks: () => Promise<void>;

  // ── Live GPS from Driver's Device ──
  currentDriverLocation: DriverLiveLocation;

  // ── Closed-Loop Batch Wave Lifecycle ──
  currentTripNumber: number;
  tripStatus: TripStatus;
  isLoadedOnVehicle: boolean;
  confirmLoadOntoVehicle: () => void;
  startBatchDelivery: () => Promise<void>;
  acceptBatchTrip: () => void;
  arrivedAtHubAndStartNextBatch: () => void;
  nextWaveTasks: DeliveryTask[];
  nextBatchQueueCount: number;
  totalCodCollectedCurrentTrip: number;
  totalCurrentTripWeightKg: number;
}

export const DEFAULT_PROFILE: DriverProfile = {
  id: 'NV-GV05',
  name: 'Võ Minh Trí',
  phone: '0977 112 233',
  licensePlate: '59-V1 888.99',
  vehicleType: 'Xe Máy Thùng Lạnh Tiêu Chuẩn',
  warehouseCode: 'WH-006',
  warehouseName: 'Tổng Kho Gò Vấp (350 Quang Trung)',
  isOnline: true,
  currentTemp: 3.5,
  targetTempMin: 0.0,
  targetTempMax: 4.0,
  rating: 4.95,
  completedTasksToday: 0,
  totalEarningsToday: 0,
};

// Dynamic registries (backed by user-service database)
export const DRIVER_DB: Record<string, DriverProfile> = {};
export const SELECTABLE_DRIVERS: DriverProfile[] = [];


const DriverTaskContext = createContext<DriverTaskContextType | undefined>(undefined);

export function calculateLiveDistance(
  driverLat: number,
  driverLng: number,
  targetLat: number,
  targetLng: number
): { distanceKm: number; estimatedTimeMinutes: number } {
  if (!driverLat || !driverLng || !targetLat || !targetLng) {
    return { distanceKm: 2.1, estimatedTimeMinutes: 10 };
  }

  const R = 6371; // Bán kính trái đất (km)
  const dLat = ((targetLat - driverLat) * Math.PI) / 180;
  const dLng = ((targetLng - driverLng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((driverLat * Math.PI) / 180) *
      Math.cos((targetLat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const straightKm = R * c;

  // Hệ số đường bộ mạng lưới giao thông đô thị TP.HCM (~1.35x)
  const roadKm = Number((straightKm * 1.35).toFixed(1));
  const finalKm = Math.max(0.2, roadKm);
  // Vận tốc trung bình trong nội thành ~25km/h + 3 phút thời gian đỗ xe/bàn giao
  const estMinutes = Math.max(2, Math.round((finalKm / 25) * 60 + 3));

  return { distanceKm: finalKm, estimatedTimeMinutes: estMinutes };
}

export const DriverTaskProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isSessionChecking, setIsSessionChecking] = useState<boolean>(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [driverProfile, setDriverProfile] = useState<DriverProfile>(DEFAULT_PROFILE);
  const [availableDrivers, setAvailableDrivers] = useState<DriverProfile[]>([]);

  useEffect(() => {
    driverApi.getAllDrivers().then(list => {
      if (Array.isArray(list) && list.length > 0) {
        const mapped: DriverProfile[] = list.map((d: any) => {
          const wCode = d.warehouseCode || 'WH-006';
          const wName = wCode === 'WH-001'
            ? 'Kho Bình Thạnh (123 Lê Quang Định)'
            : wCode === 'WH-002'
            ? 'Kho Tân Bình (45 Cộng Hòa)'
            : 'Tổng Kho Gò Vấp (350 Quang Trung)';
          return {
            id: d.code || String(d.id),
            name: d.fullName || d.name,
            phone: d.phone || '',
            licensePlate: d.licensePlate || '59-X1 999.99',
            vehicleType: d.vehicleType || 'Xe Giao Hàng',
            warehouseCode: wCode,
            warehouseName: wName,
            isOnline: true,
            currentTemp: d.currentTemp !== undefined ? Number(d.currentTemp) : 3.2,
            targetTempMin: d.targetTempMin !== undefined ? Number(d.targetTempMin) : 0.0,
            targetTempMax: d.targetTempMax !== undefined ? Number(d.targetTempMax) : 4.0,
            rating: 5.0,
            completedTasksToday: 0,
            totalEarningsToday: d.totalEarningsToday ? Number(d.totalEarningsToday) : 0,
          };
        });
        setAvailableDrivers(mapped);
      }
    }).catch(() => {});
  }, []);
  const [tasks, setTasks] = useState<DeliveryTask[]>([]);
  const [nextWaveTasks, setNextWaveTasks] = useState<DeliveryTask[]>([]);
  const [activeTask, setActiveTask] = useState<DeliveryTask | null>(null);
  const [completedTaskIds, setCompletedTaskIds] = useState<Set<string>>(new Set());
  const [inTransitTaskIds, setInTransitTaskIds] = useState<Set<string>>(new Set());
  const [isBatchDeparted, setIsBatchDeparted] = useState<boolean>(false);
  const [currentTripLockedIds, setCurrentTripLockedIds] = useState<Set<string>>(new Set());

  // Live GPS from driver device (Default: Kho Gò Vấp 10.8354, 106.6668)
  const [currentDriverLocation, setCurrentDriverLocation] = useState<DriverLiveLocation>({
    lat: 10.8354,
    lng: 106.6668,
    speedKmh: 0,
    updatedAt: Date.now(),
  });

  const driverLocationRef = useRef<DriverLiveLocation>({
    lat: 10.8354,
    lng: 106.6668,
    speedKmh: 0,
    updatedAt: Date.now(),
  });

  useEffect(() => {
    driverLocationRef.current = currentDriverLocation;
  }, [currentDriverLocation]);

  // Batch Wave Lifecycle state
  const [currentTripNumber, setCurrentTripNumber] = useState<number>(1);
  const [tripStatus, setTripStatus] = useState<TripStatus>('IN_TRANSIT');
  const [isLoadedOnVehicle, setIsLoadedOnVehicle] = useState<boolean>(true);
  const [nextBatchQueueCount, setNextBatchQueueCount] = useState<number>(0);

  const confirmLoadOntoVehicle = () => {
    setIsLoadedOnVehicle(true);
  };

  // Throttle ref for GPS telemetry
  const lastTelemetryTime = useRef<number>(0);

  // 1. Session Persistence: Check saved session on initial startup
  useEffect(() => {
    let isMounted = true;
    const restoreSession = async () => {
      try {
        const saved = await storageHelper.getItem(DRIVER_SESSION_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.profile) {
            setDriverProfile(parsed.profile);
            if (parsed.token) setAuthToken(parsed.token);
            setIsAuthenticated(true);

            // Scope storage by driver id so session state never leaks across drivers
            const dId = parsed.profile.id || '';
            const savedDeparted = await storageHelper.getItem(`sfwms_driver_batch_departed_${dId}`);
            if (savedDeparted) setIsBatchDeparted(JSON.parse(savedDeparted));
            const savedLocked = await storageHelper.getItem(`sfwms_driver_locked_trip_ids_${dId}`);
            if (savedLocked) setCurrentTripLockedIds(new Set(JSON.parse(savedLocked)));
            const savedTrip = await storageHelper.getItem(`sfwms_driver_trip_number_${dId}`);
            if (savedTrip) setCurrentTripNumber(Number(savedTrip));
            const savedInTransit = await storageHelper.getItem(`sfwms_driver_intransit_ids_${dId}`);
            if (savedInTransit) setInTransitTaskIds(new Set(JSON.parse(savedInTransit)));
            const savedCompleted = await storageHelper.getItem(`sfwms_driver_completed_ids_${dId}`);
            if (savedCompleted) setCompletedTaskIds(new Set(JSON.parse(savedCompleted)));
          } else {
            setIsAuthenticated(false);
          }
        } else {
          setIsAuthenticated(false);
        }
      } catch (e) {
        setIsAuthenticated(false);
      } finally {
        if (isMounted) {
          setIsSessionChecking(false);
        }
      }
    };

    restoreSession();
    return () => {
      isMounted = false;
    };
  }, []);

  const fetchLiveAssignedOrders = useCallback(async () => {
    // Chỉ tải lộ trình khi đã xác thực tài xế thành công để tránh nhấp nháy / tải nhầm đơn người khác
    if (!isAuthenticated || !driverProfile?.id) {
      setTasks([]);
      setNextWaveTasks([]);
      setActiveTask(null);
      setNextBatchQueueCount(0);
      return;
    }

    try {
      const warehouseCode = driverProfile.warehouseCode || 'WH-006';
      
      // 1. Fetch E-commerce orders (:3004) and Outbound / Disposal orders (:3007) in parallel
      // Fetch across warehouses so fleet/truck drivers receive all assigned orders
      const [dbOrders, obOrders] = await Promise.all([
        driverApi.getOrders('ALL').catch(() => []),
        driverApi.getOutboundOrders('ALL').catch(() => []),
      ]);

      // 2. Read local storage assignments from Web Dashboard (cross-tab sync)
      let savedDriverMap: Record<string, any> = {};
      if (typeof window !== 'undefined' && window.localStorage) {
        try {
          const raw1 = window.localStorage.getItem('sfwms_driver_assignments');
          const raw2 = window.localStorage.getItem('sfwms_assigned_drivers_map');
          if (raw1) Object.assign(savedDriverMap, JSON.parse(raw1));
          if (raw2) Object.assign(savedDriverMap, JSON.parse(raw2));
        } catch (e) {}
      }

      // 3. Normalize & Deduplicate all orders into a unified map
      const orderMap = new Map<string, any>();

      const addOrder = (o: any, isOb: boolean) => {
        if (!o) return;
        const code = (o.orderCode || (isOb ? `OB-${(o.id || '').slice(0, 8).toUpperCase()}` : `ECOMM-${(o.id || '').slice(0, 8).toUpperCase()}`)).trim();
        const rawId = String(o.id || code).trim();
        // Unique key: Preserve each individual order by its unique ID or orderCode
        const primaryKey = String(o.id || code).toLowerCase().trim();

        const saved = savedDriverMap[rawId] || savedDriverMap[code] || savedDriverMap[rawId.slice(0, 8)];
        const rawCode = (code || '').toUpperCase();
        const rawNote = (o.notes || o.note || '').toLowerCase();
        const rawDest = (o.destination || o.deliveryAddress || o.customerAddress || '').toLowerCase();
        const rawType = (o.orderType || o.type || '').toUpperCase();
        const isDisposal = 
          rawCode.includes('DISPOSAL') || 
          rawCode.includes('HUY') || 
          rawType === 'DISPOSAL' || 
          rawNote.includes('tiêu hủy') || 
          rawNote.includes('hết hạn') || 
          rawDest.includes('tiêu hủy') || 
          rawDest.includes('đa phước');

        const driverId = o.assignedDriverId || saved?.id || saved?.driverId;
        const driverName = o.assignedDriverName || saved?.name || saved?.driverName;
        const driverPhone = o.assignedDriverPhone || saved?.phone || saved?.driverPhone;
        const driverPlate = o.assignedDriverPlate || saved?.plate || saved?.driverPlate;

        const isOutboundOrder = isOb || Boolean(
          o.isOutbound ||
          rawCode.startsWith('OB-') ||
          rawCode.startsWith('XK-') ||
          rawCode.startsWith('OUT-') ||
          rawId.startsWith('XK-') ||
          rawId.startsWith('OB-')
        );

        const orderObj = {
          ...o,
          id: rawId,
          orderCode: code,
          isOutbound: isOutboundOrder,
          customerName: isDisposal 
            ? 'Trạm Xử Lý Môi Trường Đa Phước (QC Tiêu Hủy)' 
            : (o.requesterName || o.customerName || 'Khách Hàng C.T Mart'),
          customerPhone: isDisposal ? '1900 6868' : (o.customerPhone || '0901234567'),
          customerAddress: isDisposal 
            ? 'Khu Liên Hợp Xử Lý Chất Thải Đa Phước, Xã Đa Phước, Bình Chánh, TP.HCM'
            : (o.destination || o.deliveryAddress || o.customerAddress || 'Gò Vấp, TP.HCM'),
          assignedDriverId: driverId,
          assignedDriverName: driverName,
          assignedDriverPhone: driverPhone,
          assignedDriverPlate: driverPlate,
          totalAmount: isDisposal ? 0 : Number(o.totalAmount || 0),
          paymentMethod: isDisposal ? 'Xuất Tiêu Hủy (COD 0đ)' : (o.paymentMethod || 'cod'),
          isDisposal,
          shippingLat: isDisposal ? 10.6850 : Number(o.shippingLat || o.latitude || 0),
          shippingLng: isDisposal ? 106.6200 : Number(o.shippingLng || o.longitude || 0),
        };

        // Key by code and rawId
        orderMap.set(primaryKey, orderObj);
      };

      if (Array.isArray(obOrders)) {
        obOrders.forEach(o => addOrder(o, true));
      }
      if (Array.isArray(dbOrders)) {
        dbOrders.forEach(o => addOrder(o, false));
      }

      const combinedOrders = Array.from(orderMap.values());

      if (combinedOrders.length > 0) {
        const cleanProfilePhone = (driverProfile.phone || '').replace(/\D/g, '');
        const cleanProfileId = (driverProfile.id || '').toUpperCase();
        const profileName = (driverProfile.name || '').toLowerCase();
        const isPhucTruckDriver = cleanProfileId === 'NV-TK01' || profileName.includes('phúc') || cleanProfilePhone.includes('0944778899');
        const isNamVanDriver = cleanProfileId === 'NV-VAN01' || profileName.includes('nam') || cleanProfilePhone.includes('0918776655');
        const isTriBikeDriver = cleanProfileId === 'NV-GV05' || profileName.includes('trí') || cleanProfilePhone.includes('0977112233');

        // Match orders strictly assigned to this driver
        let matchedOrders = combinedOrders.filter((o: any) => {
          const oPhone = (o.assignedDriverPhone || '').replace(/\D/g, '');
          const oId = (o.assignedDriverId || '').toUpperCase().trim();
          const oName = (o.assignedDriverName || '').toLowerCase().trim();

          // 1. If this order has an assigned driver
          const hasAssignedDriver = Boolean(oId || oPhone || oName);
          if (hasAssignedDriver) {
            // Strict ID match
            const isIdMatch = Boolean(cleanProfileId && oId && (oId === cleanProfileId));

            // Strict Phone match
            const isPhoneMatch = Boolean(cleanProfilePhone && oPhone && (
              oPhone === cleanProfilePhone ||
              (cleanProfilePhone.length >= 9 && oPhone.includes(cleanProfilePhone)) ||
              (oPhone.length >= 9 && cleanProfilePhone.includes(oPhone))
            ));

            // Strict Driver Name match (1-to-1 without blanket startsWith)
            let isNameMatch = false;
            if (profileName && oName) {
              if (profileName.includes('phúc') && oName.includes('phúc')) isNameMatch = true;
              else if (profileName.includes('trí') && oName.includes('trí')) isNameMatch = true;
              else if (profileName.includes('hùng') && oName.includes('hùng')) isNameMatch = true;
              else if (profileName.includes('bảo') && oName.includes('bảo')) isNameMatch = true;
              else if (profileName.includes('tùng') && oName.includes('tùng')) isNameMatch = true;
              else if (profileName.includes('long') && oName.includes('long')) isNameMatch = true;
              else if (profileName.includes('huy') && oName.includes('huy')) isNameMatch = true;
              else if (profileName.includes('nam') && oName.includes('nam') && !oName.includes('hoàng nam')) isNameMatch = true;
            }

            return isIdMatch || isPhoneMatch || isNameMatch;
          }

          // Không tự ý gán đơn chưa được phân công: Chỉ nhận đơn khi Quản lý kho đã phân công tài xế chính thức
          return false;
        });

        if (matchedOrders.length === 0) {
          // If no orders specifically assigned to this driver, show empty tasks cleanly
          // (NEVER capture other drivers' orders or dump the whole warehouse)
          setTasks([]);
          setNextWaveTasks([]);
          setActiveTask(null);
          setNextBatchQueueCount(0);
          return;
        }

        const currentBatchOrders: any[] = [];
        const nextWaveOrders: any[] = [];

        // Check if there are any active deliveries actually running right now
        const hasActiveDeliveriesRunning = matchedOrders.some((o: any) => {
          const isServerInTransit = o.status === 'DELIVERING' || o.status === 'SHIPPED' || o.status === 'IN_TRANSIT';
          const isClientInTransit = inTransitTaskIds.has(o.id) || inTransitTaskIds.has(o.orderCode);
          return isServerInTransit || isClientInTransit;
        });

        // If driver has in-transit deliveries OR has confirmed departure, current batch is strictly locked in flight
        let effectiveBatchDeparted = (isBatchDeparted || hasActiveDeliveriesRunning);
        if (!hasActiveDeliveriesRunning && isBatchDeparted && matchedOrders.every(o => o.status === 'COMPLETED' || o.status === 'DELIVERED')) {
          // All orders in current trip have completed -> prompt return to hub
          effectiveBatchDeparted = true;
        }

        matchedOrders.forEach((o: any) => {
          const isServerDelivered = o.status === 'COMPLETED' || o.status === 'DELIVERED';
          const isServerInTransit = o.status === 'DELIVERING' || o.status === 'SHIPPED' || o.status === 'IN_TRANSIT';
          const isServerAssigned = o.status === 'READY_FOR_DELIVERY' || o.status === 'CONFIRMED' || o.status === 'PROCESSING' || o.status === 'ASSIGNED' || o.status === 'PENDING';

          const isCurrentTripLocked = currentTripLockedIds.has(o.id) || currentTripLockedIds.has(o.orderCode);
          // Backend DB status is the authoritative source of truth for real-time synchronization
          const isAlreadyDelivered = isServerDelivered || (!isServerAssigned && (completedTaskIds.has(o.id) || completedTaskIds.has(o.orderCode)));
          const isAlreadyInTransit = isServerInTransit || (!isServerDelivered && !isServerAssigned && (inTransitTaskIds.has(o.id) || inTransitTaskIds.has(o.orderCode)));

          // QUY TẮC PHÂN CHUYẾN CHUẨN TMS:
          // Nếu chuyến hiện tại đã xuất bến/đang lăn bánh giao hàng (effectiveBatchDeparted):
          // Bất kỳ đơn hàng mới nào được phân bổ (chưa xuất bến, chưa giao, không thuộc locked ban đầu)
          // -> BẮT BUỘC CHUYỂN VÀO CHUYẾN KẾ TIẾP (nextWaveOrders) để không làm xáo trộn lộ trình đang giao!
          if (effectiveBatchDeparted && !isAlreadyInTransit && !isAlreadyDelivered && (!isCurrentTripLocked || nextWaveOrders.length > 0)) {
            nextWaveOrders.push(o);
          } else {
            currentBatchOrders.push(o);
          }
        });

        // Display each dispatched order individually as a distinct delivery task
        const finalCurrentOrders = currentBatchOrders;
        const finalNextOrders = nextWaveOrders;

        // 1. Map Current Batch Tasks (Chuyến hiện tại)
        const mappedCurrentTasks: DeliveryTask[] = finalCurrentOrders.map((o: any, idx: number) => {
          let taskStatus: TaskStatus = 'ASSIGNED';
          if (o.status === 'COMPLETED' || o.status === 'DELIVERED') {
            taskStatus = 'DELIVERED';
          } else if (o.status === 'DELIVERING' || o.status === 'SHIPPED' || o.status === 'IN_TRANSIT') {
            taskStatus = 'IN_TRANSIT';
          } else if (o.status === 'READY_FOR_DELIVERY' || o.status === 'CONFIRMED' || o.status === 'PROCESSING' || o.status === 'ASSIGNED' || o.status === 'PENDING') {
            taskStatus = 'ASSIGNED';
          } else if (completedTaskIds.has(o.id) || completedTaskIds.has(o.orderCode)) {
            taskStatus = 'DELIVERED';
          } else if (inTransitTaskIds.has(o.id) || inTransitTaskIds.has(o.orderCode)) {
            taskStatus = 'IN_TRANSIT';
          }

          const addr = (o.customerAddress || '').toLowerCase();
          let lat = Number(o.shippingLat);
          let lng = Number(o.shippingLng);

          if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
            if (o.isDisposal || addr.includes('đa phước')) { lat = 10.6850; lng = 106.6200; }
            else if (addr.includes('quang trung')) { lat = 10.8398; lng = 106.6582; }
            else if (addr.includes('phạm văn chiêu')) { lat = 10.8492; lng = 106.6543; }
            else if (addr.includes('phan huy ích')) { lat = 10.8315; lng = 106.6345; }
            else if (addr.includes('lê văn thọ')) { lat = 10.8465; lng = 106.6521; }
            else if (addr.includes('cây trâm') || addr.includes('nguyễn văn khối')) { lat = 10.8432; lng = 106.6567; }
            else if (addr.includes('nguyễn oanh')) { lat = 10.8420; lng = 106.6780; }
            else if (addr.includes('lê đức thọ')) { lat = 10.8520; lng = 106.6710; }
            else if (addr.includes('thống nhất')) { lat = 10.8465; lng = 106.6690; }
            else if (addr.includes('phan văn trị')) { lat = 10.8285; lng = 106.6852; }
            else if (addr.includes('dương quảng hàm')) { lat = 10.8362; lng = 106.6895; }
            else { lat = 10.8385 + idx * 0.003; lng = 106.6650 + idx * 0.002; }
          }

          let orderItems = (o.items || []).map((item: any) => {
            const pName = item.productName || item.name || 'Thực phẩm tươi sạch';
            const pUnit = resolveProductUnit(pName, item.unit);
            return {
              sku: item.sku || item.productId || 'SKU-01',
              name: pName,
              quantity: Number(item.quantity || item.requestedQuantity || 1),
              unit: pUnit,
              storageType: o.isDisposal ? ('FROZEN' as const) : ('COLD' as const),
              temperatureNote: o.isDisposal ? '-2.0°C (Xe Tải Lạnh 2.5T)' : '0 - 4°C (Thùng Lạnh)',
            };
          });

          if (orderItems.length === 0 && o.isDisposal) {
            orderItems = [{
              sku: o.orderCode || 'DISPOSAL-LOT',
              name: o.notes || 'Lô hàng thực phẩm xuất tiêu hủy môi trường',
              quantity: Number(o.totalQuantity || 1),
              unit: 'Thùng',
              storageType: 'FROZEN' as const,
              temperatureNote: '-2.0°C (Xe Tải Lạnh 2.5T)',
            }];
          }

          const totalQty = orderItems.reduce((s: number, i: any) => s + (i.quantity || 1), 0);
          const packingBoxes = calculatePackingBoxes(totalQty, o.packageCount || o.boxCount);

          const curLoc = driverLocationRef.current || { lat: 10.8354, lng: 106.6668 };
          const liveNav = calculateLiveDistance(curLoc.lat, curLoc.lng, lat, lng);

          return {
            id: o.id,
            orderCode: o.orderCode || `ECOMM-${(o.id || '').slice(0, 8).toUpperCase()}`,
            customerName: o.customerName || 'Khách hàng C.T Mart',
            customerPhone: o.customerPhone || '0901234567',
            deliveryAddress: o.customerAddress || '29, Phạm Văn Chiêu, Gò Vấp',
            latitude: lat,
            longitude: lng,
            distanceKm: liveNav.distanceKm,
            estimatedTimeMinutes: liveNav.estimatedTimeMinutes,
            codAmount: (o.isDisposal || o.paymentMethod !== 'cod') ? 0 : Number(o.totalAmount || 0),
            isPaid: o.isDisposal || o.paymentMethod !== 'cod',
            paymentMethodText: o.isDisposal 
              ? 'Xuất Tiêu Hủy (Không thu tiền)' 
              : (o.paymentMethod === 'cod' ? 'Thu hộ tiền mặt (COD)' : 'Đã thanh toán Online'),
            timeSlotText: o.isDisposal ? 'Lệnh Xuất Hủy Môi Trường' : `Chuyến #${currentTripNumber}`,
            status: taskStatus,
            sequenceOrder: idx + 1,
            storageType: o.isDisposal ? 'FROZEN' : 'COLD',
            items: orderItems,
            packageCount: packingBoxes,
            packageType: o.isDisposal 
              ? `${packingBoxes} Thùng Tiêu Hủy (Niêm phong QC)` 
              : `${packingBoxes} Thùng đóng gói (${totalQty} món • Khâu QC đóng gói)`,
            notes: o.notes || o.note || (o.isDisposal ? 'Vận chuyển tiêu hủy tại Khu xử lý chất thải Đa Phước' : 'Giao hàng tận tay khách'),
            isOutbound: o.isOutbound,
          };
        });

        // 2. Map Next Wave Tasks (Chuyến tiếp theo)
        const mappedNextTasks: DeliveryTask[] = finalNextOrders.map((o: any, idx: number) => {
          const addr = (o.customerAddress || '').toLowerCase();
          let lat = Number(o.shippingLat);
          let lng = Number(o.shippingLng);

          if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
            if (o.isDisposal || addr.includes('đa phước')) { lat = 10.6850; lng = 106.6200; }
            else { lat = 10.8400 + idx * 0.003; lng = 106.6600 + idx * 0.002; }
          }

          const orderItems = (o.items || []).map((item: any) => {
            const pName = item.productName || item.name || 'Thực phẩm tươi sạch';
            const pUnit = resolveProductUnit(pName, item.unit);
            return {
              sku: item.sku || item.productId || 'SKU-01',
              name: pName,
              quantity: Number(item.quantity || item.requestedQuantity || 1),
              unit: pUnit,
              storageType: o.isDisposal ? ('FROZEN' as const) : ('COLD' as const),
              temperatureNote: o.isDisposal ? '-2.0°C (Xe Tải Lạnh 2.5T)' : '0 - 4°C (Thùng Lạnh)',
            };
          });

          const totalQty = orderItems.reduce((s: number, i: any) => s + (i.quantity || 1), 0);
          const packingBoxes = calculatePackingBoxes(totalQty, o.packageCount || o.boxCount);

          const curLoc = driverLocationRef.current || { lat: 10.8354, lng: 106.6668 };
          const liveNav = calculateLiveDistance(curLoc.lat, curLoc.lng, lat, lng);

          return {
            id: o.id,
            orderCode: o.orderCode || `ECOMM-${(o.id || '').slice(0, 8).toUpperCase()}`,
            customerName: o.customerName || 'Khách hàng C.T Mart',
            customerPhone: o.customerPhone || '0901234567',
            deliveryAddress: o.customerAddress || '29, Phạm Văn Chiêu, Gò Vấp',
            latitude: lat,
            longitude: lng,
            distanceKm: liveNav.distanceKm,
            estimatedTimeMinutes: liveNav.estimatedTimeMinutes,
            codAmount: (o.isDisposal || o.paymentMethod !== 'cod') ? 0 : Number(o.totalAmount || 0),
            isPaid: o.isDisposal || o.paymentMethod !== 'cod',
            paymentMethodText: o.isDisposal 
              ? 'Xuất Tiêu Hủy (Không thu tiền)' 
              : (o.paymentMethod === 'cod' ? 'Thu hộ tiền mặt (COD)' : 'Đã thanh toán Online'),
            timeSlotText: `Chuyến #${currentTripNumber + 1}`,
            status: 'ASSIGNED',
            sequenceOrder: idx + 1,
            storageType: o.isDisposal ? 'FROZEN' : 'COLD',
            items: orderItems,
            packageCount: packingBoxes,
            packageType: o.isDisposal 
              ? `${packingBoxes} Thùng Tiêu Hủy (Niêm phong QC)` 
              : `${packingBoxes} Thùng đóng gói (${totalQty} món • Khâu QC đóng gói)`,
            notes: o.notes || o.note || 'Đang chờ gom hàng tại kho cho chuyến tiếp theo',
            isOutbound: o.isOutbound,
          };
        });

        setTasks(mappedCurrentTasks);
        setNextWaveTasks(mappedNextTasks);
        setNextBatchQueueCount(mappedNextTasks.length);

        const currentActive = mappedCurrentTasks.find(t => t.status === 'IN_TRANSIT');
        setActiveTask(currentActive || null);
      } else {
        // Tài xế chưa được phân bổ đơn: hiển thị danh sách trống sạch sẽ, tuyệt đối không chèn đơn giả / đơn người khác
        setTasks([]);
        setNextWaveTasks([]);
        setActiveTask(null);
        setNextBatchQueueCount(0);
      }
    } catch (err) {
      console.warn('[DriverTaskContext] Lỗi tải danh sách đơn hàng:', err);
      setTasks([]);
      setNextWaveTasks([]);
      setActiveTask(null);
      setNextBatchQueueCount(0);
    }
  }, [isAuthenticated, driverProfile, completedTaskIds, inTransitTaskIds, currentTripNumber, isBatchDeparted, currentTripLockedIds]);

  useEffect(() => {
    // Không chạy sync hay socket khi chưa đăng nhập hoặc đang kiểm tra phiên
    if (!isAuthenticated || isSessionChecking) {
      return;
    }

    // 1. Initial fetch immediately
    fetchLiveAssignedOrders();

    // 2. Real-time WebSocket connection to Order Gateway (:3004)
    let socket: any = null;
    try {
      socket = io(`http://${BACKEND_HOST}:3004`, {
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 15,
        reconnectionDelay: 1000,
      });

      socket.on('connect', () => {
        fetchLiveAssignedOrders();
      });

      socket.on('order_status_updated', () => {
        fetchLiveAssignedOrders();
      });

      socket.on('new_order', () => {
        fetchLiveAssignedOrders();
      });

      socket.on('all_alerts', () => {
        fetchLiveAssignedOrders();
      });
    } catch (e) {
      // Socket fallback
    }

    // 3. Fallback polling
    const interval = setInterval(fetchLiveAssignedOrders, 4000);

    return () => {
      clearInterval(interval);
      if (socket) {
        try {
          socket.disconnect();
        } catch (err) {}
      }
    };
  }, [isAuthenticated, isSessionChecking, fetchLiveAssignedOrders]);

  // Real-time Phone GPS Hardware Tracking with Telemetry Throttle & Safe Polyfill Cleanup
  useEffect(() => {
    let locationSub: any = null;
    let isMounted = true;

    async function startLocationTracking() {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;

        const currentPos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        if (isMounted && currentPos && currentPos.coords) {
          setCurrentDriverLocation({
            lat: currentPos.coords.latitude,
            lng: currentPos.coords.longitude,
            speedKmh: Math.round((currentPos.coords.speed || 0) * 3.6),
            updatedAt: Date.now(),
          });

          const telemetry: TelemetryPayload = {
            driverId: driverProfile.id,
            driverName: driverProfile.name,
            phone: driverProfile.phone,
            licensePlate: driverProfile.licensePlate,
            lat: currentPos.coords.latitude,
            lng: currentPos.coords.longitude,
            speedKmh: Math.round((currentPos.coords.speed || 0) * 3.6),
            tempC: driverProfile.currentTemp,
            isOnline: driverProfile.isOnline,
            currentOrderId: activeTask?.id || null,
            orderCode: activeTask?.orderCode || null,
            currentCustomerName: activeTask?.customerName || null,
            currentCustomerAddress: activeTask?.deliveryAddress || null,
            status: tripStatus === 'RETURNING_TO_HUB' ? 'RETURNING' : activeTask ? 'DELIVERING' : 'IDLE',
            warehouseCode: driverProfile.warehouseCode,
          };
          driverApi.sendTelemetry(telemetry);
        }

        locationSub = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 4000,
            distanceInterval: 10,
          },
          (loc) => {
            if (!isMounted || !loc.coords) return;
            
            setCurrentDriverLocation({
              lat: loc.coords.latitude,
              lng: loc.coords.longitude,
              speedKmh: Math.round((loc.coords.speed || 0) * 3.6),
              updatedAt: Date.now(),
            });

            const now = Date.now();
            if (now - lastTelemetryTime.current < 2500) return; // Throttle to max once per 2.5s
            lastTelemetryTime.current = now;

            const telemetry: TelemetryPayload = {
              driverId: driverProfile.id,
              driverName: driverProfile.name,
              phone: driverProfile.phone,
              licensePlate: driverProfile.licensePlate,
              lat: loc.coords.latitude,
              lng: loc.coords.longitude,
              speedKmh: Math.round((loc.coords.speed || 0) * 3.6),
              tempC: driverProfile.currentTemp,
              isOnline: driverProfile.isOnline,
              currentOrderId: activeTask?.id || null,
              orderCode: activeTask?.orderCode || null,
              currentCustomerName: activeTask?.customerName || null,
              currentCustomerAddress: activeTask?.deliveryAddress || null,
              status: tripStatus === 'RETURNING_TO_HUB' ? 'RETURNING' : activeTask ? 'DELIVERING' : 'IDLE',
              warehouseCode: driverProfile.warehouseCode,
            };
            driverApi.sendTelemetry(telemetry);
          }
        );
      } catch (err) {
        // Location permission or simulation fallback
      }
    }

    if (isAuthenticated && driverProfile.isOnline) {
      startLocationTracking();
    }

    return () => {
      isMounted = false;
      if (locationSub) {
        try {
          if (typeof locationSub.remove === 'function') {
            locationSub.remove();
          }
        } catch (e) {
          // Safe catch for Expo Web LocationEventEmitter polyfill differences
        }
      }
    };
  }, [isAuthenticated, driverProfile.isOnline, activeTask, tripStatus, driverProfile.currentTemp, driverProfile.warehouseCode]);

  const login = async (emailOrPhone: string, pass: string = 'password123'): Promise<boolean> => {
    const cleanInput = emailOrPhone.trim().toLowerCase();

    // 1. Authenticate with User Service to obtain JWT
    const authResult = await driverApi.login(cleanInput, pass);
    if (!authResult || !authResult.token) {
      console.warn(`[DriverAuth] Đăng nhập thất bại: thông tin xác thực chưa hợp lệ cho "${emailOrPhone}"`);
      return false;
    }
    const token = authResult.token;
    const remoteUser = authResult.user;

    const warehouseCode = remoteUser?.warehouseCode || 'WH-006';
    const warehouseName = warehouseCode === 'WH-001'
      ? 'Kho Bình Thạnh (123 Lê Quang Định)'
      : warehouseCode === 'WH-002'
      ? 'Kho Tân Bình (45 Cộng Hòa)'
      : 'Tổng Kho Gò Vấp (350 Quang Trung)';

    const finalProfile: DriverProfile = {
      id: remoteUser?.code || String(remoteUser?.id || 'DRV-001'),
      name: remoteUser?.fullName || remoteUser?.name || 'Tài xế SmartWarehouse',
      phone: remoteUser?.phone || emailOrPhone,
      licensePlate: remoteUser?.licensePlate || '59-X1 999.99',
      vehicleType: remoteUser?.vehicleType || 'Xe Giao Hàng Tiêu Chuẩn',
      warehouseCode,
      warehouseName,
      isOnline: true,
      currentTemp: remoteUser?.currentTemp !== undefined ? Number(remoteUser.currentTemp) : 3.2,
      targetTempMin: remoteUser?.targetTempMin !== undefined ? Number(remoteUser.targetTempMin) : 0.0,
      targetTempMax: remoteUser?.targetTempMax !== undefined ? Number(remoteUser.targetTempMax) : 4.0,
      rating: 5.0,
      completedTasksToday: 0,
      totalEarningsToday: remoteUser?.totalEarningsToday ? Number(remoteUser.totalEarningsToday) : 0,
      token,
    };

    // Dọn dẹp dữ liệu chuyến cũ
    setTasks([]);
    setNextWaveTasks([]);
    setActiveTask(null);
    setCompletedTaskIds(new Set());
    setInTransitTaskIds(new Set());
    setIsBatchDeparted(false);
    setCurrentTripLockedIds(new Set());

    // Thiết lập phiên đăng nhập
    setDriverProfile(finalProfile);
    setIsAuthenticated(true);
    setAuthToken(token);

    try {
      const dId = finalProfile.id || '';
      await storageHelper.saveItem(DRIVER_SESSION_KEY, JSON.stringify({ token, profile: finalProfile }));
      await storageHelper.removeItem(`sfwms_driver_batch_departed_${dId}`);
      await storageHelper.removeItem(`sfwms_driver_locked_trip_ids_${dId}`);
      await storageHelper.removeItem(`sfwms_driver_trip_number_${dId}`);
      await storageHelper.removeItem(`sfwms_driver_intransit_ids_${dId}`);
    } catch (e) {
      console.warn('Lỗi lưu phiên đăng nhập:', e);
    }

    setTimeout(fetchLiveAssignedOrders, 100);
    return true;
  };

  const logout = () => {
    setIsAuthenticated(false);
    setAuthToken(null);
    setDriverProfile(DEFAULT_PROFILE);
    setTasks([]);
    setNextWaveTasks([]);
    setActiveTask(null);
    setCompletedTaskIds(new Set());
    setInTransitTaskIds(new Set());
    setIsBatchDeparted(false);
    setCurrentTripLockedIds(new Set());
    try {
      const dId = driverProfile.id || '';
      storageHelper.removeItem(DRIVER_SESSION_KEY);
      storageHelper.removeItem(`sfwms_driver_batch_departed_${dId}`);
      storageHelper.removeItem(`sfwms_driver_locked_trip_ids_${dId}`);
      storageHelper.removeItem(`sfwms_driver_trip_number_${dId}`);
      storageHelper.removeItem(`sfwms_driver_intransit_ids_${dId}`);
    } catch (e) {}
  };

  const switchDriverProfile = async (driverIdOrPhone: string): Promise<boolean> => {
    const clean = driverIdOrPhone.trim().toLowerCase();
    const cleanDigits = driverIdOrPhone.replace(/\D/g, '');
    const target = availableDrivers.find(d => {
      const pPhone = d.phone.replace(/\D/g, '');
      const pId = d.id.toLowerCase();
      return pId === clean || (cleanDigits.length >= 8 && pPhone.includes(cleanDigits));
    });

    if (target) {
      setDriverProfile(target);
      setIsBatchDeparted(false);
      setCurrentTripLockedIds(new Set());
      setTasks([]);
      setNextWaveTasks([]);
      setActiveTask(null);
      setCompletedTaskIds(new Set());
      setInTransitTaskIds(new Set());
      try {
        await storageHelper.saveItem(DRIVER_SESSION_KEY, JSON.stringify({ token: `JWT_DRIVER_${target.id}`, profile: target }));
        await storageHelper.removeItem('sfwms_driver_batch_departed');
        await storageHelper.removeItem('sfwms_driver_locked_trip_ids');
      } catch (e) {}
      setTimeout(fetchLiveAssignedOrders, 50);
      return true;
    }
    return false;
  };

  const toggleOnline = () => {
    setDriverProfile(prev => ({ ...prev, isOnline: !prev.isOnline }));
  };

  const updateContainerTemp = (temp: number) => {
    setDriverProfile(prev => ({ ...prev, currentTemp: temp }));
  };

  // 1. Nhận trọn bộ danh sách đơn hàng của đợt phân bổ
  const acceptBatchTrip = () => {
    setTripStatus('IN_TRANSIT');
  };

  // 2. Về tới kho -> Nộp COD & Nhận Chuyến tiếp theo
  const arrivedAtHubAndStartNextBatch = () => {
    const nextTrip = currentTripNumber + 1;
    setCurrentTripNumber(nextTrip);
    setTripStatus('IN_TRANSIT');
    setIsLoadedOnVehicle(true);
    setIsBatchDeparted(false);
    setActiveTask(null);

    // Promote next wave tasks into active current trip tasks
    const newLocked = new Set(nextWaveTasks.flatMap(t => [t.id, t.orderCode]).filter(Boolean));
    setCurrentTripLockedIds(newLocked);
    setTasks(nextWaveTasks);
    setNextWaveTasks([]);
    setNextBatchQueueCount(0);
    setInTransitTaskIds(new Set());
    setCompletedTaskIds(new Set());

    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem('sfwms_driver_trip_number', String(nextTrip));
        window.localStorage.setItem('sfwms_driver_batch_departed', JSON.stringify(false));
        window.localStorage.setItem('sfwms_driver_locked_trip_ids', JSON.stringify(Array.from(newLocked)));
        window.localStorage.removeItem('sfwms_driver_intransit_ids');
        window.localStorage.removeItem('sfwms_driver_completed_ids');
      } catch (e) {}
    }

    setTimeout(fetchLiveAssignedOrders, 100);
  };

  const startBatchDelivery = async () => {
    setIsLoadedOnVehicle(true);
    setIsBatchDeparted(true);

    const toStart = tasks.filter(t => t.status === 'ASSIGNED');
    const newIds = toStart.flatMap(t => [t.id, t.orderCode]).filter(Boolean);

    // Lock all current tasks into this trip so subsequent orders roll over to next wave
    const allCurrentIds = new Set(tasks.flatMap(t => [t.id, t.orderCode]).filter(Boolean));
    setCurrentTripLockedIds(allCurrentIds);

    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem('sfwms_driver_batch_departed', JSON.stringify(true));
        window.localStorage.setItem('sfwms_driver_locked_trip_ids', JSON.stringify(Array.from(allCurrentIds)));
      } catch (e) {}
    }

    setInTransitTaskIds(prev => {
      const updated = new Set([...prev, ...newIds]);
      if (typeof window !== 'undefined' && window.localStorage) {
        try {
          window.localStorage.setItem('sfwms_driver_intransit_ids', JSON.stringify(Array.from(updated)));
        } catch (e) {}
      }
      return updated;
    });

    setTasks(prev => prev.map(t => (t.status === 'ASSIGNED' ? { ...t, status: 'IN_TRANSIT' } : t)));
    
    // Sync with backend for all assigned orders
    if (toStart.length > 0) {
      setActiveTask({ ...toStart[0], status: 'IN_TRANSIT' });
      for (const t of toStart) {
        driverApi.syncOrderStatus(t.id, 'DELIVERING', {
          destination: t.deliveryAddress,
          customerName: t.customerName,
        }).catch(() => {});
        driverApi.syncOutboundStatus(t.id, 'IN_TRANSIT').catch(() => {});
      }
    }
  };

  const startDelivery = async (taskId: string) => {
    setIsBatchDeparted(true);

    const cleanTargetId = (taskId || '').toLowerCase();
    const target = tasks.find(t => 
      t.id === taskId || 
      t.id?.toLowerCase() === cleanTargetId || 
      (t.orderCode && t.orderCode.toLowerCase().includes(cleanTargetId))
    );
    const newIds = [taskId, cleanTargetId, target?.id || '', target?.orderCode || ''].filter(Boolean);

    // Lock all current tasks into this trip
    const allCurrentIds = new Set(tasks.flatMap(t => [t.id, t.orderCode]).filter(Boolean));
    setCurrentTripLockedIds(allCurrentIds);

    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem('sfwms_driver_batch_departed', JSON.stringify(true));
        window.localStorage.setItem('sfwms_driver_locked_trip_ids', JSON.stringify(Array.from(allCurrentIds)));
      } catch (e) {}
    }

    setInTransitTaskIds(prev => {
      const updated = new Set([...prev, ...newIds]);
      if (typeof window !== 'undefined' && window.localStorage) {
        try {
          window.localStorage.setItem('sfwms_driver_intransit_ids', JSON.stringify(Array.from(updated)));
        } catch (e) {}
      }
      return updated;
    });

    // If the task has matching destination orders, start them all together or start this task
    setTasks(prev =>
      prev.map(t => (
        t.id === taskId || 
        t.id?.toLowerCase() === cleanTargetId || 
        (target?.orderCode && t.orderCode === target.orderCode)
          ? { ...t, status: 'IN_TRANSIT' } 
          : t
      ))
    );
    if (target) {
      setActiveTask({ ...target, status: 'IN_TRANSIT' });

      // Sync DELIVERING status to order-service via driverApi
      await driverApi.syncOrderStatus(target.id, 'DELIVERING', {
        destination: target.deliveryAddress,
        customerName: target.customerName,
      }).catch(() => {});
      await driverApi.syncOutboundStatus(target.id, 'IN_TRANSIT').catch(() => {});

      // Immediate telemetry broadcast
      await driverApi.sendTelemetry({
        driverId: driverProfile.id,
        driverName: driverProfile.name,
        phone: driverProfile.phone,
        licensePlate: driverProfile.licensePlate,
        lat: target.latitude || 10.8492,
        lng: target.longitude || 106.6543,
        speedKmh: 28,
        tempC: driverProfile.currentTemp,
        isOnline: true,
        currentOrderId: target.id,
        orderCode: target.orderCode,
        currentCustomerName: target.customerName,
        currentCustomerAddress: target.deliveryAddress,
        status: 'DELIVERING',
        warehouseCode: driverProfile.warehouseCode,
      }).catch(() => {});
    }
  };

  const completeDelivery = async (taskId: string, proofImageUri?: string) => {
    const timeNow = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' Hôm nay';
    const targetTask = tasks.find(t => t.id === taskId || t.orderCode === taskId);
    const rawKeys = [taskId, targetTask?.id || '', targetTask?.orderCode || ''].filter(Boolean);
    const completedIds: string[] = [];
    rawKeys.forEach(k => {
      completedIds.push(k);
      const cleanK = k.replace(/^ECOMM-/, '').replace(/^OB-/, '');
      if (cleanK) completedIds.push(cleanK);
    });

    // Track completed ID locally
    setCompletedTaskIds(prev => {
      const updated = new Set([...prev, ...completedIds]);
      if (typeof window !== 'undefined' && window.localStorage) {
        try {
          window.localStorage.setItem('sfwms_driver_completed_ids', JSON.stringify(Array.from(updated)));
        } catch (e) {}
      }
      return updated;
    });

    // Remove from inTransitTaskIds
    setInTransitTaskIds(prev => {
      const updated = new Set(prev);
      completedIds.forEach(id => updated.delete(id));
      if (typeof window !== 'undefined' && window.localStorage) {
        try {
          window.localStorage.setItem('sfwms_driver_intransit_ids', JSON.stringify(Array.from(updated)));
        } catch (e) {}
      }
      return updated;
    });

    // Clear active task if matching
    if (activeTask?.id === taskId) {
      setActiveTask(null);
    }

    const updatedTasks = tasks.map(t =>
      t.id === taskId
        ? { ...t, status: 'DELIVERED' as TaskStatus, deliveredAt: timeNow, proofImageUri }
        : t
    );
    setTasks(updatedTasks);

    setDriverProfile(prev => ({
      ...prev,
      completedTasksToday: prev.completedTasksToday + 1,
      totalEarningsToday: prev.totalEarningsToday + 35000,
    }));

    // Check if that was the last delivery in current batch -> Trigger Return-to-Hub
    const remainingAfterThis = updatedTasks.filter(t => t.status !== 'DELIVERED');
    if (remainingAfterThis.length === 0) {
      setTripStatus('RETURNING_TO_HUB');
    }

    // Telemetry update
    driverApi.sendTelemetry({
      driverId: driverProfile.id,
      driverName: driverProfile.name,
      phone: driverProfile.phone,
      licensePlate: driverProfile.licensePlate,
      lat: targetTask?.latitude || 10.8492,
      lng: targetTask?.longitude || 106.6543,
      speedKmh: 0,
      tempC: driverProfile.currentTemp,
      isOnline: true,
      currentOrderId: null,
      orderCode: null,
      currentCustomerName: null,
      currentCustomerAddress: null,
      status: remainingAfterThis.length === 0 ? 'RETURNING' : 'DELIVERING',
      warehouseCode: driverProfile.warehouseCode,
    });

    if (targetTask) {
      const isOutbound = Boolean(
        targetTask.isOutbound ||
        targetTask.orderCode?.startsWith('OB-') ||
        targetTask.orderCode?.startsWith('XK-') ||
        targetTask.orderCode?.startsWith('OUT-') ||
        targetTask.id?.startsWith('XK-') ||
        targetTask.id?.startsWith('OB-') ||
        (targetTask as any).isOutbound
      );
      const driverPayload = {
        podPhotoUrl: proofImageUri,
        isPaid: true,
        codCollectedAmount: targetTask.codAmount || 0,
        driverId: driverProfile.id,
        driverName: driverProfile.name,
        driverPhone: driverProfile.phone,
        driverPlate: driverProfile.licensePlate,
      };

      // Save POD photo to localStorage for instant local/cross-tab display
      if (typeof window !== 'undefined' && window.localStorage && proofImageUri) {
        try {
          const raw = window.localStorage.getItem('sfwms_pod_photos') || '{}';
          const podMap = JSON.parse(raw);
          completedIds.forEach(k => {
            podMap[k] = proofImageUri;
          });
          window.localStorage.setItem('sfwms_pod_photos', JSON.stringify(podMap));
        } catch (e) {}
      }

      // Comprehensive dual-service sync with all identifier variants
      const syncPayload = { ...driverPayload, orderCode: targetTask.orderCode };
      await Promise.all([
        driverApi.syncOutboundStatus(targetTask.id, 'DELIVERED', syncPayload),
        targetTask.orderCode && targetTask.orderCode !== targetTask.id
          ? driverApi.syncOutboundStatus(targetTask.orderCode, 'DELIVERED', syncPayload)
          : Promise.resolve(true),
        driverApi.syncOrderStatus(targetTask.id, 'COMPLETED', syncPayload),
        targetTask.orderCode && targetTask.orderCode !== targetTask.id
          ? driverApi.syncOrderStatus(targetTask.orderCode, 'COMPLETED', syncPayload)
          : Promise.resolve(true),
      ]).catch(() => {});
    }
  };

  const completeBatchDelivery = async (taskIds: string[], proofImageUri?: string) => {
    if (!taskIds || taskIds.length === 0) return;
    const timeNow = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' Hôm nay';
    
    // Find all target tasks
    const targetTasks = tasks.filter(t => taskIds.includes(t.id) || (t.orderCode && taskIds.includes(t.orderCode)));
    const allCompletedKeys: string[] = [];
    targetTasks.forEach(t => {
      allCompletedKeys.push(t.id);
      if (t.orderCode) allCompletedKeys.push(t.orderCode);
      const cleanTId = t.id.replace(/^ECOMM-/, '').replace(/^OB-/, '');
      if (cleanTId) allCompletedKeys.push(cleanTId);
      if (t.orderCode) {
        const cleanTCode = t.orderCode.replace(/^ECOMM-/, '').replace(/^OB-/, '');
        if (cleanTCode) allCompletedKeys.push(cleanTCode);
      }
    });
    taskIds.forEach(id => {
      allCompletedKeys.push(id);
      const cleanId = id.replace(/^ECOMM-/, '').replace(/^OB-/, '');
      if (cleanId) allCompletedKeys.push(cleanId);
    });

    // Track completed IDs locally
    setCompletedTaskIds(prev => {
      const updated = new Set([...prev, ...allCompletedKeys]);
      if (typeof window !== 'undefined' && window.localStorage) {
        try {
          window.localStorage.setItem('sfwms_driver_completed_ids', JSON.stringify(Array.from(updated)));
        } catch (e) {}
      }
      return updated;
    });

    // Remove from inTransitTaskIds
    setInTransitTaskIds(prev => {
      const updated = new Set(prev);
      allCompletedKeys.forEach(id => updated.delete(id));
      if (typeof window !== 'undefined' && window.localStorage) {
        try {
          window.localStorage.setItem('sfwms_driver_intransit_ids', JSON.stringify(Array.from(updated)));
        } catch (e) {}
      }
      return updated;
    });

    if (activeTask && allCompletedKeys.includes(activeTask.id)) {
      setActiveTask(null);
    }

    const updatedTasks = tasks.map(t => {
      if (allCompletedKeys.includes(t.id) || (t.orderCode && allCompletedKeys.includes(t.orderCode))) {
        return { ...t, status: 'DELIVERED' as TaskStatus, deliveredAt: timeNow, proofImageUri };
      }
      return t;
    });
    setTasks(updatedTasks);

    setDriverProfile(prev => ({
      ...prev,
      completedTasksToday: prev.completedTasksToday + targetTasks.length,
      totalEarningsToday: prev.totalEarningsToday + (35000 * targetTasks.length),
    }));

    const remainingAfterThis = updatedTasks.filter(t => t.status !== 'DELIVERED');
    if (remainingAfterThis.length === 0) {
      setTripStatus('RETURNING_TO_HUB');
    }

    // Update localStorage pod photos for all completed tasks
    if (typeof window !== 'undefined' && window.localStorage && proofImageUri) {
      try {
        const raw = window.localStorage.getItem('sfwms_pod_photos') || '{}';
        const podMap = JSON.parse(raw);
        allCompletedKeys.forEach(k => {
          podMap[k] = proofImageUri;
        });
        window.localStorage.setItem('sfwms_pod_photos', JSON.stringify(podMap));
      } catch (e) {}
    }

    // Sync with backend services for each task in parallel
    await Promise.all(
      targetTasks.map(async (task) => {
        const isOutbound = Boolean(
          task.isOutbound ||
          task.orderCode?.startsWith('OB-') ||
          task.orderCode?.startsWith('XK-') ||
          task.orderCode?.startsWith('OUT-') ||
          task.id?.startsWith('XK-') ||
          task.id?.startsWith('OB-') ||
          (task as any).isOutbound
        );
        const driverPayload = {
          podPhotoUrl: proofImageUri,
          isPaid: true,
          codCollectedAmount: task.codAmount || 0,
          driverId: driverProfile.id,
          driverName: driverProfile.name,
          driverPhone: driverProfile.phone,
          driverPlate: driverProfile.licensePlate,
        };

        const syncPayload = { ...driverPayload, orderCode: task.orderCode };
        await Promise.all([
          driverApi.syncOutboundStatus(task.id, 'DELIVERED', syncPayload),
          task.orderCode && task.orderCode !== task.id
            ? driverApi.syncOutboundStatus(task.orderCode, 'DELIVERED', syncPayload)
            : Promise.resolve(true),
          driverApi.syncOrderStatus(task.id, 'COMPLETED', syncPayload),
          task.orderCode && task.orderCode !== task.id
            ? driverApi.syncOrderStatus(task.orderCode, 'COMPLETED', syncPayload)
            : Promise.resolve(true),
        ]).catch(() => {});
      })
    );

    // Telemetry update
    const firstTask = targetTasks[0];
    driverApi.sendTelemetry({
      driverId: driverProfile.id,
      driverName: driverProfile.name,
      phone: driverProfile.phone,
      licensePlate: driverProfile.licensePlate,
      lat: firstTask?.latitude || 10.8492,
      lng: firstTask?.longitude || 106.6543,
      speedKmh: 0,
      tempC: driverProfile.currentTemp,
      isOnline: true,
      currentOrderId: null,
      orderCode: null,
      currentCustomerName: null,
      currentCustomerAddress: null,
      status: remainingAfterThis.length === 0 ? 'RETURNING' : 'DELIVERING',
      warehouseCode: driverProfile.warehouseCode,
    });
  };

  const reportDeliveryFailure = async (taskId: string, reason: string, photoUrl?: string) => {
    setTasks(prev =>
      prev.map(t =>
        t.id === taskId
          ? { ...t, status: 'FAILED' as TaskStatus, notes: `[HÀNG HOÀN] ${reason}` }
          : t
      )
    );

    if (activeTask?.id === taskId) {
      setActiveTask(null);
    }

    const targetTask = tasks.find(t => t.id === taskId);
    const isOutbound = targetTask?.orderCode?.startsWith('OB-') || (targetTask as any)?.isOutbound;
    const failurePayload = {
      failureReason: reason,
      failurePhotoUrl: photoUrl,
      driverId: driverProfile.id,
      driverName: driverProfile.name,
      driverPhone: driverProfile.phone,
      driverPlate: driverProfile.licensePlate,
    };

    if (isOutbound && targetTask) {
      await driverApi.syncOutboundStatus(targetTask.id, 'CANCELLED', failurePayload);
    } else {
      await driverApi.reportFailure(taskId, reason, photoUrl);
    }
  };

  const assignedTasks = tasks.filter(t => t.status === 'ASSIGNED');
  const inTransitTasks = tasks.filter(t => t.status === 'IN_TRANSIT');
  const deliveredTasks = tasks.filter(t => t.status === 'DELIVERED');

  const totalCodCollectedCurrentTrip = deliveredTasks.reduce((sum, t) => sum + (t.codAmount || 0), 0);

  const totalCurrentTripWeightKg = tasks.reduce((sum, t) => {
    const itemsCount = (t.items || []).reduce((qSum, i) => qSum + (i.quantity || 1), 0);
    return sum + Math.max(1.5, itemsCount * 1.2);
  }, 0);

  return (
    <DriverTaskContext.Provider
      value={{
        driverProfile,
        availableDrivers,
        switchDriverProfile,
        isAuthenticated,
        isSessionChecking,
        login,
        logout,
        toggleOnline,
        updateContainerTemp,
        tasks,
        activeTask,
        setActiveTask,
        startDelivery,
        completeDelivery,
        completeBatchDelivery,
        reportDeliveryFailure,
        assignedTasks,
        inTransitTasks,
        deliveredTasks,
        refreshTasks: fetchLiveAssignedOrders,

        // Live GPS
        currentDriverLocation,

        // Closed-loop batch lifecycle & Loading state
        currentTripNumber,
        tripStatus,
        isLoadedOnVehicle,
        confirmLoadOntoVehicle,
        startBatchDelivery,
        acceptBatchTrip,
        arrivedAtHubAndStartNextBatch,
        nextWaveTasks,
        nextBatchQueueCount,
        totalCodCollectedCurrentTrip,
        totalCurrentTripWeightKg: Number(totalCurrentTripWeightKg.toFixed(1)),
      }}
    >
      {children}
    </DriverTaskContext.Provider>
  );
};

export const useDriverTask = () => {
  const context = useContext(DriverTaskContext);
  if (!context) throw new Error('useDriverTask must be used within DriverTaskProvider');
  return context;
};
