import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as Location from 'expo-location';
import { DeliveryTask, DriverProfile, TaskStatus } from '../types/driver';

export type TripStatus = 'WAITING_ACCEPT' | 'IN_TRANSIT' | 'RETURNING_TO_HUB';

interface DriverTaskContextType {
  driverProfile: DriverProfile;
  isAuthenticated: boolean;
  login: (phoneOrCode: string, password?: string) => Promise<boolean>;
  logout: () => void;
  toggleOnline: () => void;
  updateContainerTemp: (temp: number) => void;
  tasks: DeliveryTask[];
  activeTask: DeliveryTask | null;
  setActiveTask: (task: DeliveryTask | null) => void;
  startDelivery: (taskId: string) => void;
  completeDelivery: (taskId: string, proofImageUri?: string) => void;
  reportDeliveryFailure: (taskId: string, reason: string, photoUrl?: string) => void;
  assignedTasks: DeliveryTask[];
  inTransitTasks: DeliveryTask[];
  deliveredTasks: DeliveryTask[];
  refreshTasks: () => Promise<void>;

  // ── Closed-Loop Batch Wave Lifecycle ──
  currentTripNumber: number;
  tripStatus: TripStatus;
  acceptBatchTrip: () => void;
  arrivedAtHubAndStartNextBatch: () => void;
  nextBatchQueueCount: number;
  totalCodCollectedCurrentTrip: number;
}

const SERVER_HOSTS = [
  'http://192.168.2.147:3004',
  'http://localhost:3004',
  'http://10.0.2.2:3004',
];

const OUTBOUND_HOSTS = [
  'http://192.168.2.147:3007',
  'http://localhost:3007',
  'http://10.0.2.2:3007',
];

export const DRIVER_DB: Record<string, DriverProfile> = {
  '0977112233': {
    id: 'NV-GV05',
    name: 'Võ Minh Trí',
    phone: '0977 112 233',
    licensePlate: '59-V1 888.99',
    vehicleType: '🛵 Xe Máy Thùng Lạnh',
    isOnline: true,
    currentTemp: 3.2,
    targetTempMin: 0.0,
    targetTempMax: 4.0,
    rating: 4.95,
    completedTasksToday: 12,
    totalEarningsToday: 420000,
  },
  'NV-GV05': {
    id: 'NV-GV05',
    name: 'Võ Minh Trí',
    phone: '0977 112 233',
    licensePlate: '59-V1 888.99',
    vehicleType: '🛵 Xe Máy Thùng Lạnh',
    isOnline: true,
    currentTemp: 3.2,
    targetTempMin: 0.0,
    targetTempMax: 4.0,
    rating: 4.95,
    completedTasksToday: 12,
    totalEarningsToday: 420000,
  },
  '0909888111': {
    id: 'NV-GV06',
    name: 'Nguyễn Văn Hùng',
    phone: '0909 888 111',
    licensePlate: '59-G2 688.39',
    vehicleType: '🛵 Xe Máy Giao Siêu Tốc',
    isOnline: true,
    currentTemp: 2.8,
    targetTempMin: 0.0,
    targetTempMax: 4.0,
    rating: 4.9,
    completedTasksToday: 10,
    totalEarningsToday: 350000,
  },
  'NV-GV06': {
    id: 'NV-GV06',
    name: 'Nguyễn Văn Hùng',
    phone: '0909 888 111',
    licensePlate: '59-G2 688.39',
    vehicleType: '🛵 Xe Máy Giao Siêu Tốc',
    isOnline: true,
    currentTemp: 2.8,
    targetTempMin: 0.0,
    targetTempMax: 4.0,
    rating: 4.9,
    completedTasksToday: 10,
    totalEarningsToday: 350000,
  },
  '0933445566': {
    id: 'NV-GV07',
    name: 'Trần Quốc Bảo',
    phone: '0933 445 566',
    licensePlate: '59-P1 456.78',
    vehicleType: '🛵 Xe Máy Thùng Mát',
    isOnline: true,
    currentTemp: 3.5,
    targetTempMin: 0.0,
    targetTempMax: 4.0,
    rating: 4.85,
    completedTasksToday: 8,
    totalEarningsToday: 280000,
  },
  'NV-GV07': {
    id: 'NV-GV07',
    name: 'Trần Quốc Bảo',
    phone: '0933 445 566',
    licensePlate: '59-P1 456.78',
    vehicleType: '🛵 Xe Máy Thùng Mát',
    isOnline: true,
    currentTemp: 3.5,
    targetTempMin: 0.0,
    targetTempMax: 4.0,
    rating: 4.85,
    completedTasksToday: 8,
    totalEarningsToday: 280000,
  },
  '0918776655': {
    id: 'NV-GV08',
    name: 'Phạm Hoàng Nam',
    phone: '0918 776 655',
    licensePlate: '59-K1 234.56',
    vehicleType: '🛵 Xe Máy Thùng Mát',
    isOnline: true,
    currentTemp: 3.1,
    targetTempMin: 0.0,
    targetTempMax: 4.0,
    rating: 4.8,
    completedTasksToday: 9,
    totalEarningsToday: 315000,
  },
  'NV-GV08': {
    id: 'NV-GV08',
    name: 'Phạm Hoàng Nam',
    phone: '0918 776 655',
    licensePlate: '59-K1 234.56',
    vehicleType: '🛵 Xe Máy Thùng Mát',
    isOnline: true,
    currentTemp: 3.1,
    targetTempMin: 0.0,
    targetTempMax: 4.0,
    rating: 4.8,
    completedTasksToday: 9,
    totalEarningsToday: 315000,
  },
  '0966332211': {
    id: 'NV-GV09',
    name: 'Lê Thanh Tùng',
    phone: '0966 332 211',
    licensePlate: '59-X1 999.11',
    vehicleType: '🛵 Xe Máy Thùng Lạnh',
    isOnline: true,
    currentTemp: 2.5,
    targetTempMin: 0.0,
    targetTempMax: 4.0,
    rating: 4.92,
    completedTasksToday: 14,
    totalEarningsToday: 490000,
  },
  'NV-GV09': {
    id: 'NV-GV09',
    name: 'Lê Thanh Tùng',
    phone: '0966 332 211',
    licensePlate: '59-X1 999.11',
    vehicleType: '🛵 Xe Máy Thùng Lạnh',
    isOnline: true,
    currentTemp: 2.5,
    targetTempMin: 0.0,
    targetTempMax: 4.0,
    rating: 4.92,
    completedTasksToday: 14,
    totalEarningsToday: 490000,
  },
  '0944778899': {
    id: 'NV-GV10',
    name: 'Đặng Hữu Phúc',
    phone: '0944 778 899',
    licensePlate: '59-T2 777.88',
    vehicleType: '🛵 Xe Máy Giao Hỏa Tốc',
    isOnline: true,
    currentTemp: 3.0,
    targetTempMin: 0.0,
    targetTempMax: 4.0,
    rating: 4.88,
    completedTasksToday: 11,
    totalEarningsToday: 385000,
  },
  'NV-GV10': {
    id: 'NV-GV10',
    name: 'Đặng Hữu Phúc',
    phone: '0944 778 899',
    licensePlate: '59-T2 777.88',
    vehicleType: '🛵 Xe Máy Giao Hỏa Tốc',
    isOnline: true,
    currentTemp: 3.0,
    targetTempMin: 0.0,
    targetTempMax: 4.0,
    rating: 4.88,
    completedTasksToday: 11,
    totalEarningsToday: 385000,
  },
};

const DEFAULT_PROFILE = DRIVER_DB['0977112233'];

// Batch Queue for Subsequent Waves (Chuyến #2, Chuyến #3)
const TRIP_WAVES_PRELOAD: Record<number, any[]> = {
  2: [
    {
      id: 'ord-w2-01',
      orderCode: 'ECOMM-W2A01',
      customerName: 'Lê Thị Thu Cúc',
      customerPhone: '0938112233',
      deliveryAddress: '215 Phạm Văn Chiêu, Phường 14, Gò Vấp',
      latitude: 10.8492,
      longitude: 106.6543,
      distanceKm: 2.1,
      estimatedTimeMinutes: 12,
      codAmount: 250000,
      isPaid: false,
      paymentMethodText: 'Thu hộ COD',
      timeSlotText: 'Chuyến 2 (14:00 - 16:00)',
      status: 'ASSIGNED',
      sequenceOrder: 1,
      storageType: 'COLD',
      items: [{ name: 'Sữa tươi thanh trùng 1L', quantity: 2, unit: 'Chai' }],
      packageType: 'Thùng Lạnh 0-4°C',
    },
    {
      id: 'ord-w2-02',
      orderCode: 'ECOMM-W2A02',
      customerName: 'Vũ Đức Thịnh',
      customerPhone: '0912445566',
      deliveryAddress: '540 Lê Văn Thọ, Phường 16, Gò Vấp',
      latitude: 10.8465,
      longitude: 106.6521,
      distanceKm: 3.4,
      estimatedTimeMinutes: 18,
      codAmount: 0,
      isPaid: true,
      paymentMethodText: 'Đã thanh toán VNPay',
      timeSlotText: 'Chuyến 2 (14:00 - 16:00)',
      status: 'ASSIGNED',
      sequenceOrder: 2,
      storageType: 'COLD',
      items: [{ name: 'Cá hồi Na Uy phi lê 500g', quantity: 1, unit: 'Khay' }],
      packageType: 'Thùng Lạnh 0-4°C',
    },
    {
      id: 'ord-w2-03',
      orderCode: 'ECOMM-W2A03',
      customerName: 'Nguyễn Thị Hồng Hạnh',
      customerPhone: '0903889900',
      deliveryAddress: '88 Phan Huy Ích, Phường 12, Gò Vấp',
      latitude: 10.8315,
      longitude: 106.6345,
      distanceKm: 4.2,
      estimatedTimeMinutes: 22,
      codAmount: 430000,
      isPaid: false,
      paymentMethodText: 'Thu hộ COD',
      timeSlotText: 'Chuyến 2 (14:00 - 16:00)',
      status: 'ASSIGNED',
      sequenceOrder: 3,
      storageType: 'COLD',
      items: [{ name: 'Ba chỉ bò Mỹ đông lạnh 1kg', quantity: 1, unit: 'Gói' }],
      packageType: 'Thùng Lạnh 0-4°C',
    },
  ],
  3: [
    {
      id: 'ord-w3-01',
      orderCode: 'ECOMM-W3B01',
      customerName: 'Phan Anh Dũng',
      customerPhone: '0988776655',
      deliveryAddress: '310 Phan Văn Trị, Phường 10, Gò Vấp',
      latitude: 10.8285,
      longitude: 106.6852,
      distanceKm: 2.5,
      estimatedTimeMinutes: 15,
      codAmount: 180000,
      isPaid: false,
      paymentMethodText: 'Thu hộ COD',
      timeSlotText: 'Chuyến 3 (16:30 - 18:30)',
      status: 'ASSIGNED',
      sequenceOrder: 1,
      storageType: 'COLD',
      items: [{ name: 'Rau củ hữu cơ Đà Lạt', quantity: 3, unit: 'Túi' }],
      packageType: 'Thùng Lạnh 0-4°C',
    },
  ],
};

const DriverTaskContext = createContext<DriverTaskContextType | undefined>(undefined);

export const DriverTaskProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [driverProfile, setDriverProfile] = useState<DriverProfile>(DEFAULT_PROFILE);
  const [tasks, setTasks] = useState<DeliveryTask[]>([]);
  const [activeTask, setActiveTask] = useState<DeliveryTask | null>(null);
  const [completedTaskIds, setCompletedTaskIds] = useState<Set<string>>(new Set());

  // Batch Wave Lifecycle state
  const [currentTripNumber, setCurrentTripNumber] = useState<number>(1);
  const [tripStatus, setTripStatus] = useState<TripStatus>('IN_TRANSIT');
  const [nextBatchQueueCount, setNextBatchQueueCount] = useState<number>(3);

  const fetchLiveAssignedOrders = useCallback(async () => {
    let dbOrders: any[] | null = null;

    // Fetch from backend
    for (const host of SERVER_HOSTS) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        const res = await fetch(`${host}/orders`, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (res.ok) {
          dbOrders = await res.json();
          break;
        }
      } catch (err) {}
    }

    if (Array.isArray(dbOrders) && dbOrders.length > 0) {
      const cleanProfilePhone = (driverProfile.phone || '').replace(/\D/g, '');
      const cleanProfileId = (driverProfile.id || '').toUpperCase();
      const profileName = (driverProfile.name || '').toLowerCase();

      // 1. First priority: Orders explicitly assigned to this driver
      let matchedOrders = dbOrders.filter((o: any) => {
        const oPhone = (o.assignedDriverPhone || '').replace(/\D/g, '');
        const oId = (o.assignedDriverId || '').toUpperCase();
        const oName = (o.assignedDriverName || '').toLowerCase();

        return (
          (cleanProfilePhone && oPhone && (oPhone === cleanProfilePhone || cleanProfilePhone.includes(oPhone) || oPhone.includes(cleanProfilePhone))) ||
          (cleanProfileId && oId && (oId === cleanProfileId || cleanProfileId.includes(oId) || oId.includes(cleanProfileId))) ||
          (profileName && oName && (oName.includes(profileName) || profileName.includes(oName)))
        );
      });

      // 2. If no orders specifically assigned, show active Kho Gò Vấp orders
      if (matchedOrders.length === 0) {
        matchedOrders = dbOrders.filter((o: any) => {
          const isGovap = (o.assignedWarehouseName || '').includes('Gò Vấp') || (o.assignedWarehouseId === 'WH-006') || (o.customerAddress || '').includes('Gò Vấp');
          const isActive = o.status !== 'CANCELLED';
          return isGovap && isActive;
        });
      }

      if (matchedOrders.length > 0) {
        const mappedTasks: DeliveryTask[] = matchedOrders.map((o: any, idx: number) => {
          let taskStatus: TaskStatus = 'ASSIGNED';
          if (completedTaskIds.has(o.id) || completedTaskIds.has(`ECOMM-${o.id.slice(0, 8).toUpperCase()}`) || o.status === 'COMPLETED' || o.status === 'DELIVERED') {
            taskStatus = 'DELIVERED';
          } else if (o.status === 'DELIVERING' || o.status === 'SHIPPED') {
            taskStatus = 'IN_TRANSIT';
          }

          const addr = (o.customerAddress || '').toLowerCase();
          let lat = Number(o.shippingLat);
          let lng = Number(o.shippingLng);

          if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
            if (addr.includes('quang trung')) { lat = 10.8398; lng = 106.6582; }
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

          return {
            id: o.id,
            orderCode: `ECOMM-${o.id.slice(0, 8).toUpperCase()}`,
            customerName: o.customerName || 'Khách hàng C.T Mart',
            customerPhone: o.customerPhone || '0901234567',
            deliveryAddress: o.customerAddress || '29, Phạm Văn Chiêu, Gò Vấp',
            latitude: lat,
            longitude: lng,
            distanceKm: Number((1.8 + idx * 0.7).toFixed(1)),
            estimatedTimeMinutes: 10 + idx * 5,
            codAmount: o.paymentMethod === 'cod' ? Number(o.totalAmount || 0) : 0,
            isPaid: o.paymentMethod !== 'cod',
            paymentMethodText: o.paymentMethod === 'cod' ? 'Thu hộ tiền mặt (COD)' : 'Đã thanh toán Online',
            timeSlotText: `Chuyến #${currentTripNumber}`,
            status: taskStatus,
            sequenceOrder: idx + 1,
            storageType: 'COLD',
            items: (o.items || []).map((item: any) => ({
              sku: item.sku || item.productId || 'SKU-01',
              name: item.productName || 'Thực phẩm tươi sạch',
              quantity: item.quantity || 1,
              unit: 'Món',
              storageType: 'COLD',
              temperatureNote: '0 - 4°C (Thùng Lạnh Xe Máy)'
            })),
            packageType: 'Thùng xốp bảo quản lạnh 0-4°C + Gel đá C.T Mart',
            notes: o.note || 'Giao hàng tận tay khách',
          };
        });

        setTasks(mappedTasks);

        // Check if all tasks completed in this trip
        const remaining = mappedTasks.filter(t => t.status !== 'DELIVERED');
        if (mappedTasks.length > 0 && remaining.length === 0 && tripStatus !== 'RETURNING_TO_HUB') {
          setTripStatus('RETURNING_TO_HUB');
        }

        const currentActive = mappedTasks.find(t => t.status === 'IN_TRANSIT');
        setActiveTask(currentActive || null);
      }
    }
  }, [driverProfile, completedTaskIds, currentTripNumber, tripStatus]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchLiveAssignedOrders();
      const interval = setInterval(fetchLiveAssignedOrders, 3000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, fetchLiveAssignedOrders]);

  // Real-time Phone GPS Hardware Tracking
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
          SERVER_HOSTS.forEach(host => {
            fetch(`${host}/orders/telemetry`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
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
              }),
            }).catch(() => {});
          });
        }

        locationSub = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 3000,
            distanceInterval: 10,
          },
          (loc) => {
            if (!isMounted || !loc.coords) return;
            SERVER_HOSTS.forEach(host => {
              fetch(`${host}/orders/telemetry`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
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
                }),
              }).catch(() => {});
            });
          }
        );
      } catch (err) {}
    }

    if (isAuthenticated && driverProfile.isOnline) {
      startLocationTracking();
    }

    return () => {
      isMounted = false;
      if (locationSub) locationSub.remove();
    };
  }, [isAuthenticated, driverProfile.isOnline, activeTask, tripStatus]);

  const login = async (phoneOrCode: string, pass: string = 'password123'): Promise<boolean> => {
    // 1. Thử xác thực với User Service (:3012)
    try {
      const email = phoneOrCode.includes('@') ? phoneOrCode : 'driver@sfwms.vn';
      const res = await fetch('http://localhost:3012/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass }),
      });

      if (res.ok) {
        const data = await res.json();
        const u = data.user;
        const onlineProfile: DriverProfile = {
          id: u.id || 'NV-GV05',
          name: u.name || 'Võ Thanh Tùng (Tài xế)',
          phone: u.phone || '0977 112 233',
          licensePlate: '59-V1 888.99',
          vehicleType: '🛵 Xe Máy Thùng Lạnh (0-4°C)',
          isOnline: true,
          currentTemp: 3.2,
          targetTempMin: 0.0,
          targetTempMax: 4.0,
          rating: 4.95,
          completedTasksToday: 12,
          totalEarningsToday: 420000,
        };
        setDriverProfile(onlineProfile);
        setIsAuthenticated(true);
        return true;
      }
    } catch (e) {
      console.warn('[Driver Auth] User service offline, falling back to local driver DB:', e);
    }

    // 2. Fallback sang DRIVER_DB cục bộ
    const clean = phoneOrCode.replace(/\s+/g, '');
    const found = DRIVER_DB[clean] || DRIVER_DB[phoneOrCode] || DRIVER_DB['0977112233'];
    if (found) {
      setDriverProfile(found);
      setIsAuthenticated(true);
      return true;
    }
    return false;
  };

  const logout = () => {
    setIsAuthenticated(false);
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
    if (tasks.length > 0) {
      // Start the first stop
      const firstTask = tasks.find(t => t.status !== 'DELIVERED') || tasks[0];
      startDelivery(firstTask.id);
    }
  };

  // 2. Về tới kho -> Nộp COD & Nhận Chuyến tiếp theo
  const arrivedAtHubAndStartNextBatch = () => {
    const nextTrip = currentTripNumber + 1;
    setCurrentTripNumber(nextTrip);
    setTripStatus('WAITING_ACCEPT');

    const preloaded = TRIP_WAVES_PRELOAD[nextTrip] || [
      {
        id: `ord-w${nextTrip}-01`,
        orderCode: `ECOMM-W${nextTrip}01`,
        customerName: 'Khách Hàng Đợt Mới',
        customerPhone: '0909112233',
        deliveryAddress: '350 Quang Trung, P.10, Gò Vấp',
        latitude: 10.8398,
        longitude: 106.6582,
        distanceKm: 2.0,
        estimatedTimeMinutes: 15,
        codAmount: 150000,
        isPaid: false,
        paymentMethodText: 'Thu hộ COD',
        timeSlotText: `Chuyến #${nextTrip}`,
        status: 'ASSIGNED',
        sequenceOrder: 1,
        storageType: 'COLD',
        items: [{ name: 'Hàng tươi lạnh C.T Mart', quantity: 2, unit: 'Gói' }],
        packageType: 'Thùng Lạnh 0-4°C',
      },
    ];

    setTasks(preloaded);
    setActiveTask(null);
    setNextBatchQueueCount(Math.max(1, nextBatchQueueCount - 1));
  };

  const startDelivery = (taskId: string) => {
    setTasks(prev =>
      prev.map(t => (t.id === taskId ? { ...t, status: 'IN_TRANSIT' } : t))
    );
    const target = tasks.find(t => t.id === taskId);
    if (target) {
      setActiveTask({ ...target, status: 'IN_TRANSIT' });

      // Sync DELIVERING status to order-service
      const orderCode = target.orderCode || target.id || taskId;
      const cleanId = orderCode.replace(/^ECOMM-/, '').replace(/^OB-/, '');

      SERVER_HOSTS.forEach(host => {
        fetch(`${host}/orders/sync-status/${taskId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'DELIVERING',
            destination: target.deliveryAddress,
            customerName: target.customerName,
          }),
        }).catch(() => {});

        fetch(`${host}/orders/sync-status/${cleanId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'DELIVERING',
            destination: target.deliveryAddress,
            customerName: target.customerName,
          }),
        }).catch(() => {});
      });

      // Immediate telemetry broadcast
      SERVER_HOSTS.forEach(host => {
        fetch(`${host}/orders/telemetry`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
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
          }),
        }).catch(() => {});
      });
    }
  };

  const completeDelivery = (taskId: string, proofImageUri?: string) => {
    const timeNow = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' Hôm nay';
    const targetTask = tasks.find(t => t.id === taskId);

    // Track completed ID locally
    setCompletedTaskIds(prev => new Set([...prev, taskId, targetTask?.id || '', targetTask?.orderCode || '']));

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
    SERVER_HOSTS.forEach(host => {
      fetch(`${host}/orders/telemetry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driverId: driverProfile.id,
          driverName: driverProfile.name,
          phone: driverProfile.phone,
          licensePlate: driverProfile.licensePlate,
          speedKmh: 0,
          tempC: driverProfile.currentTemp,
          isOnline: true,
          currentOrderId: null,
          orderCode: null,
          currentCustomerName: null,
          currentCustomerAddress: null,
          status: remainingAfterThis.length === 0 ? 'RETURNING' : 'DELIVERING',
        }),
      }).catch(() => {});
    });

    const orderCode = targetTask?.orderCode || targetTask?.id || taskId;
    const cleanId = orderCode.replace(/^ECOMM-/, '').replace(/^OB-/, '');

    SERVER_HOSTS.forEach(host => {
      fetch(`${host}/orders/sync-status/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'COMPLETED' }),
      }).catch(() => {});

      fetch(`${host}/orders/sync-status/${cleanId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'COMPLETED' }),
      }).catch(() => {});
    });

    OUTBOUND_HOSTS.forEach(host => {
      fetch(`${host}/outbound/sync-status/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'DELIVERED' }),
      }).catch(() => {});
    });
  };

  const reportDeliveryFailure = (taskId: string, reason: string, photoUrl?: string) => {
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

    SERVER_HOSTS.forEach(host => {
      fetch(`${host}/orders/sync-status/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'RETURNED_TO_WAREHOUSE',
          failedReason: reason,
          photoUrl,
        }),
      }).catch(() => {});
    });
  };

  const assignedTasks = tasks.filter(t => t.status === 'ASSIGNED');
  const inTransitTasks = tasks.filter(t => t.status === 'IN_TRANSIT');
  const deliveredTasks = tasks.filter(t => t.status === 'DELIVERED');

  const totalCodCollectedCurrentTrip = deliveredTasks.reduce((sum, t) => sum + (t.codAmount || 0), 0);

  return (
    <DriverTaskContext.Provider
      value={{
        driverProfile,
        isAuthenticated,
        login,
        logout,
        toggleOnline,
        updateContainerTemp,
        tasks,
        activeTask,
        setActiveTask,
        startDelivery,
        completeDelivery,
        reportDeliveryFailure,
        assignedTasks,
        inTransitTasks,
        deliveredTasks,
        refreshTasks: fetchLiveAssignedOrders,

        // Closed-loop batch lifecycle
        currentTripNumber,
        tripStatus,
        acceptBatchTrip,
        arrivedAtHubAndStartNextBatch,
        nextBatchQueueCount,
        totalCodCollectedCurrentTrip,
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
