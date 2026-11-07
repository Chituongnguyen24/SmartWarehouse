import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import * as Location from 'expo-location';
import { DeliveryTask, DriverProfile, TaskStatus } from '../types/driver';
import { driverApi, TelemetryPayload, DRIVER_SESSION_KEY, setAuthToken, BACKEND_HOST } from '../services/api';
import { io } from 'socket.io-client';
import { resolveProductUnit, calculatePackingBoxes } from '../utils/productUnitHelper';

export type TripStatus = 'WAITING_ACCEPT' | 'IN_TRANSIT' | 'RETURNING_TO_HUB';

export interface DriverLiveLocation {
  lat: number;
  lng: number;
  speedKmh: number;
  updatedAt: number;
}

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
  startDelivery: (taskId: string) => Promise<void>;
  completeDelivery: (taskId: string, proofImageUri?: string) => Promise<void>;
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

export const DRIVER_DB: Record<string, DriverProfile> = {
  '0977112233': {
    id: 'NV-GV05',
    name: 'Võ Minh Trí',
    phone: '0977 112 233',
    licensePlate: '59-V1 888.99',
    vehicleType: 'Xe Máy Thùng Lạnh',
    warehouseCode: 'WH-006',
    warehouseName: 'Kho Gò Vấp (350 Quang Trung)',
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
    vehicleType: 'Xe Máy Thùng Lạnh',
    warehouseCode: 'WH-006',
    warehouseName: 'Kho Gò Vấp (350 Quang Trung)',
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
    vehicleType: 'Xe Máy Giao Siêu Tốc',
    warehouseCode: 'WH-006',
    warehouseName: 'Kho Gò Vấp (350 Quang Trung)',
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
    vehicleType: 'Xe Máy Giao Siêu Tốc',
    warehouseCode: 'WH-006',
    warehouseName: 'Kho Gò Vấp (350 Quang Trung)',
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
    vehicleType: 'Xe Máy Thùng Mát',
    warehouseCode: 'WH-006',
    warehouseName: 'Kho Gò Vấp (350 Quang Trung)',
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
    vehicleType: 'Xe Máy Thùng Mát',
    warehouseCode: 'WH-006',
    warehouseName: 'Kho Gò Vấp (350 Quang Trung)',
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
    vehicleType: 'Xe Máy Thùng Mát',
    warehouseCode: 'WH-006',
    warehouseName: 'Kho Gò Vấp (350 Quang Trung)',
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
    vehicleType: 'Xe Máy Thùng Mát',
    warehouseCode: 'WH-006',
    warehouseName: 'Kho Gò Vấp (350 Quang Trung)',
    isOnline: true,
    currentTemp: 3.1,
    targetTempMin: 0.0,
    targetTempMax: 4.0,
    rating: 4.8,
    completedTasksToday: 9,
    totalEarningsToday: 315000,
  },
  '0988112244': {
    id: 'NV-BT01',
    name: 'Bùi Hoàng Long',
    phone: '0988 112 244',
    licensePlate: '59-S2 555.66',
    vehicleType: 'Xe Máy Thùng Lạnh',
    warehouseCode: 'WH-002',
    warehouseName: 'Kho Bình Thạnh (123 Bạch Đằng)',
    isOnline: true,
    currentTemp: 3.0,
    targetTempMin: 0.0,
    targetTempMax: 4.0,
    rating: 4.9,
    completedTasksToday: 11,
    totalEarningsToday: 385000,
  },
  'NV-BT01': {
    id: 'NV-BT01',
    name: 'Bùi Hoàng Long',
    phone: '0988 112 244',
    licensePlate: '59-S2 555.66',
    vehicleType: 'Xe Máy Thùng Lạnh',
    warehouseCode: 'WH-002',
    warehouseName: 'Kho Bình Thạnh (123 Bạch Đằng)',
    isOnline: true,
    currentTemp: 3.0,
    targetTempMin: 0.0,
    targetTempMax: 4.0,
    rating: 4.9,
    completedTasksToday: 11,
    totalEarningsToday: 385000,
  },
  '0977223344': {
    id: 'NV-TB01',
    name: 'Trương Gia Huy',
    phone: '0977 223 344',
    licensePlate: '59-H1 333.22',
    vehicleType: 'Xe Máy Thùng Lạnh',
    warehouseCode: 'WH-003',
    warehouseName: 'Kho Tân Bình (45 Trường Chinh)',
    isOnline: true,
    currentTemp: 2.7,
    targetTempMin: 0.0,
    targetTempMax: 4.0,
    rating: 4.88,
    completedTasksToday: 10,
    totalEarningsToday: 350000,
  },
  'NV-TB01': {
    id: 'NV-TB01',
    name: 'Trương Gia Huy',
    phone: '0977 223 344',
    licensePlate: '59-H1 333.22',
    vehicleType: 'Xe Máy Thùng Lạnh',
    warehouseCode: 'WH-003',
    warehouseName: 'Kho Tân Bình (45 Trường Chinh)',
    isOnline: true,
    currentTemp: 2.7,
    targetTempMin: 0.0,
    targetTempMax: 4.0,
    rating: 4.88,
    completedTasksToday: 10,
    totalEarningsToday: 350000,
  },

  // ── Đội Xe Tải & Bán Tải (Tiêu Hủy / Chuyển Kho / Đơn Lớn) ──
  'NV-TK01': {
    id: 'NV-TK01',
    name: 'Đặng Hoàng Phúc',
    phone: '0944 778 899',
    licensePlate: '51D-892.45',
    vehicleType: 'Xe Tải Lạnh 2.5 Tấn',
    warehouseCode: 'WH-006',
    warehouseName: 'Kho Gò Vấp (350 Quang Trung)',
    isOnline: true,
    currentTemp: -2.0,
    targetTempMin: -5.0,
    targetTempMax: 4.0,
    rating: 4.98,
    completedTasksToday: 6,
    totalEarningsToday: 750000,
  },
  '0944778899': {
    id: 'NV-TK01',
    name: 'Đặng Hoàng Phúc',
    phone: '0944 778 899',
    licensePlate: '51D-892.45',
    vehicleType: 'Xe Tải Lạnh 2.5 Tấn',
    warehouseCode: 'WH-006',
    warehouseName: 'Kho Gò Vấp (350 Quang Trung)',
    isOnline: true,
    currentTemp: -2.0,
    targetTempMin: -5.0,
    targetTempMax: 4.0,
    rating: 4.98,
    completedTasksToday: 6,
    totalEarningsToday: 750000,
  },
  'truck@sfwms.vn': {
    id: 'NV-TK01',
    name: 'Đặng Hoàng Phúc',
    phone: '0944 778 899',
    licensePlate: '51D-892.45',
    vehicleType: 'Xe Tải Lạnh 2.5 Tấn',
    warehouseCode: 'WH-006',
    warehouseName: 'Kho Gò Vấp (350 Quang Trung)',
    isOnline: true,
    currentTemp: -2.0,
    targetTempMin: -5.0,
    targetTempMax: 4.0,
    rating: 4.98,
    completedTasksToday: 6,
    totalEarningsToday: 750000,
  },
  'phuc.dang@sfwms.vn': {
    id: 'NV-TK01',
    name: 'Đặng Hoàng Phúc',
    phone: '0944 778 899',
    licensePlate: '51D-892.45',
    vehicleType: 'Xe Tải Lạnh 2.5 Tấn',
    warehouseCode: 'WH-006',
    warehouseName: 'Kho Gò Vấp (350 Quang Trung)',
    isOnline: true,
    currentTemp: -2.0,
    targetTempMin: -5.0,
    targetTempMax: 4.0,
    rating: 4.98,
    completedTasksToday: 6,
    totalEarningsToday: 750000,
  },
  'danghoangphuc@sfwms.vn': {
    id: 'NV-TK01',
    name: 'Đặng Hoàng Phúc',
    phone: '0944 778 899',
    licensePlate: '51D-892.45',
    vehicleType: 'Xe Tải Lạnh 2.5 Tấn',
    warehouseCode: 'WH-006',
    warehouseName: 'Kho Gò Vấp (350 Quang Trung)',
    isOnline: true,
    currentTemp: -2.0,
    targetTempMin: -5.0,
    targetTempMax: 4.0,
    rating: 4.98,
    completedTasksToday: 6,
    totalEarningsToday: 750000,
  },
  'danghoangphuc@gmail.com': {
    id: 'NV-TK01',
    name: 'Đặng Hoàng Phúc',
    phone: '0944 778 899',
    licensePlate: '51D-892.45',
    vehicleType: 'Xe Tải Lạnh 2.5 Tấn',
    warehouseCode: 'WH-006',
    warehouseName: 'Kho Gò Vấp (350 Quang Trung)',
    isOnline: true,
    currentTemp: -2.0,
    targetTempMin: -5.0,
    targetTempMax: 4.0,
    rating: 4.98,
    completedTasksToday: 6,
    totalEarningsToday: 750000,
  },
  'phuc.dang@gmail.com': {
    id: 'NV-TK01',
    name: 'Đặng Hoàng Phúc',
    phone: '0944 778 899',
    licensePlate: '51D-892.45',
    vehicleType: 'Xe Tải Lạnh 2.5 Tấn',
    warehouseCode: 'WH-006',
    warehouseName: 'Kho Gò Vấp (350 Quang Trung)',
    isOnline: true,
    currentTemp: -2.0,
    targetTempMin: -5.0,
    targetTempMax: 4.0,
    rating: 4.98,
    completedTasksToday: 6,
    totalEarningsToday: 750000,
  },
  'phuc@sfwms.vn': {
    id: 'NV-TK01',
    name: 'Đặng Hoàng Phúc',
    phone: '0944 778 899',
    licensePlate: '51D-892.45',
    vehicleType: 'Xe Tải Lạnh 2.5 Tấn',
    warehouseCode: 'WH-006',
    warehouseName: 'Kho Gò Vấp (350 Quang Trung)',
    isOnline: true,
    currentTemp: -2.0,
    targetTempMin: -5.0,
    targetTempMax: 4.0,
    rating: 4.98,
    completedTasksToday: 6,
    totalEarningsToday: 750000,
  },
  'NV-VAN01': {
    id: 'NV-VAN01',
    name: 'Phan Hữu Nam',
    phone: '0918 776 655',
    licensePlate: '51C-734.12',
    vehicleType: 'Xe Bán Tải Thùng Kín 1.5 Tấn',
    warehouseCode: 'WH-006',
    warehouseName: 'Kho Gò Vấp (350 Quang Trung)',
    isOnline: true,
    currentTemp: 3.0,
    targetTempMin: 0.0,
    targetTempMax: 4.0,
    rating: 4.90,
    completedTasksToday: 8,
    totalEarningsToday: 550000,
  },
  'van@sfwms.vn': {
    id: 'NV-VAN01',
    name: 'Phan Hữu Nam',
    phone: '0918 776 655',
    licensePlate: '51C-734.12',
    vehicleType: 'Xe Bán Tải Thùng Kín 1.5 Tấn',
    warehouseCode: 'WH-006',
    warehouseName: 'Kho Gò Vấp (350 Quang Trung)',
    isOnline: true,
    currentTemp: 3.0,
    targetTempMin: 0.0,
    targetTempMax: 4.0,
    rating: 4.90,
    completedTasksToday: 8,
    totalEarningsToday: 550000,
  },
  'nam.phan@sfwms.vn': {
    id: 'NV-VAN01',
    name: 'Phan Hữu Nam',
    phone: '0918 776 655',
    licensePlate: '51C-734.12',
    vehicleType: 'Xe Bán Tải Thùng Kín 1.5 Tấn',
    warehouseCode: 'WH-006',
    warehouseName: 'Kho Gò Vấp (350 Quang Trung)',
    isOnline: true,
    currentTemp: 3.0,
    targetTempMin: 0.0,
    targetTempMax: 4.0,
    rating: 4.90,
    completedTasksToday: 8,
    totalEarningsToday: 550000,
  },

  // ── Email Aliases cho Tài Xế Xe Máy ──
  'driver@sfwms.vn': {
    id: 'NV-GV05',
    name: 'Võ Minh Trí',
    phone: '0977 112 233',
    licensePlate: '59-V1 888.99',
    vehicleType: 'Xe Máy Thùng Lạnh',
    warehouseCode: 'WH-006',
    warehouseName: 'Kho Gò Vấp (350 Quang Trung)',
    isOnline: true,
    currentTemp: 3.2,
    targetTempMin: 0.0,
    targetTempMax: 4.0,
    rating: 4.95,
    completedTasksToday: 12,
    totalEarningsToday: 420000,
  },
  'tri.vo@sfwms.vn': {
    id: 'NV-GV05',
    name: 'Võ Minh Trí',
    phone: '0977 112 233',
    licensePlate: '59-V1 888.99',
    vehicleType: 'Xe Máy Thùng Lạnh',
    warehouseCode: 'WH-006',
    warehouseName: 'Kho Gò Vấp (350 Quang Trung)',
    isOnline: true,
    currentTemp: 3.2,
    targetTempMin: 0.0,
    targetTempMax: 4.0,
    rating: 4.95,
    completedTasksToday: 12,
    totalEarningsToday: 420000,
  },
  'hung.nguyen@sfwms.vn': {
    id: 'NV-GV06',
    name: 'Nguyễn Văn Hùng',
    phone: '0909 888 111',
    licensePlate: '59-G2 688.39',
    vehicleType: 'Xe Máy Giao Siêu Tốc',
    warehouseCode: 'WH-006',
    warehouseName: 'Kho Gò Vấp (350 Quang Trung)',
    isOnline: true,
    currentTemp: 2.8,
    targetTempMin: 0.0,
    targetTempMax: 4.0,
    rating: 4.9,
    completedTasksToday: 10,
    totalEarningsToday: 350000,
  },
  'bao.tran@sfwms.vn': {
    id: 'NV-GV07',
    name: 'Trần Quốc Bảo',
    phone: '0933 445 566',
    licensePlate: '59-P1 456.78',
    vehicleType: 'Xe Máy Thùng Mát',
    warehouseCode: 'WH-006',
    warehouseName: 'Kho Gò Vấp (350 Quang Trung)',
    isOnline: true,
    currentTemp: 3.5,
    targetTempMin: 0.0,
    targetTempMax: 4.0,
    rating: 4.85,
    completedTasksToday: 8,
    totalEarningsToday: 280000,
  },
  'long.bui@sfwms.vn': {
    id: 'NV-BT01',
    name: 'Bùi Hoàng Long',
    phone: '0988 112 244',
    licensePlate: '59-S2 555.66',
    vehicleType: 'Xe Máy Thùng Lạnh',
    warehouseCode: 'WH-002',
    warehouseName: 'Kho Bình Thạnh (123 Bạch Đằng)',
    isOnline: true,
    currentTemp: 3.0,
    targetTempMin: 0.0,
    targetTempMax: 4.0,
    rating: 4.9,
    completedTasksToday: 11,
    totalEarningsToday: 385000,
  },
  'huy.truong@sfwms.vn': {
    id: 'NV-TB01',
    name: 'Trương Gia Huy',
    phone: '0977 223 344',
    licensePlate: '59-H1 333.22',
    vehicleType: 'Xe Máy Thùng Lạnh',
    warehouseCode: 'WH-003',
    warehouseName: 'Kho Tân Bình (45 Trường Chinh)',
    isOnline: true,
    currentTemp: 2.7,
    targetTempMin: 0.0,
    targetTempMax: 4.0,
    rating: 4.88,
    completedTasksToday: 10,
    totalEarningsToday: 350000,
  }
};

const DEFAULT_PROFILE = DRIVER_DB['0977112233'];

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
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [driverProfile, setDriverProfile] = useState<DriverProfile>(DEFAULT_PROFILE);
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

  // 1. Session Persistence: Check saved JWT session on initial startup
  useEffect(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const saved = window.localStorage.getItem(DRIVER_SESSION_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.profile) {
            setDriverProfile(parsed.profile);
            if (parsed.token) setAuthToken(parsed.token);
            setIsAuthenticated(true);
          }
        }
        const savedDeparted = window.localStorage.getItem('sfwms_driver_batch_departed');
        if (savedDeparted) setIsBatchDeparted(JSON.parse(savedDeparted));
        const savedLocked = window.localStorage.getItem('sfwms_driver_locked_trip_ids');
        if (savedLocked) setCurrentTripLockedIds(new Set(JSON.parse(savedLocked)));
        const savedTrip = window.localStorage.getItem('sfwms_driver_trip_number');
        if (savedTrip) setCurrentTripNumber(Number(savedTrip));
        const savedInTransit = window.localStorage.getItem('sfwms_driver_intransit_ids');
        if (savedInTransit) setInTransitTaskIds(new Set(JSON.parse(savedInTransit)));
        const savedCompleted = window.localStorage.getItem('sfwms_driver_completed_ids');
        if (savedCompleted) setCompletedTaskIds(new Set(JSON.parse(savedCompleted)));
      } catch (e) {}
    }
  }, []);

  const fetchLiveAssignedOrders = useCallback(async () => {
    try {
      const warehouseCode = driverProfile.warehouseCode || 'WH-006';
      
      // 1. Fetch E-commerce orders (:3004) and Outbound / Disposal orders (:3007) in parallel
      const [dbOrders, obOrders] = await Promise.all([
        driverApi.getOrders(warehouseCode).catch(() => []),
        driverApi.getOutboundOrders(warehouseCode).catch(() => []),
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
        const rawKey = (code || rawId).toUpperCase();
        const primaryKey = rawKey.replace(/^ECOMM-/, '').replace(/^OB-/, '').replace(/[^A-Z0-9]/g, '').slice(0, 8) || rawKey;

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

        const orderObj = {
          ...o,
          id: rawId,
          orderCode: code,
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

        // Match orders strictly assigned to this driver
        const matchedOrders = combinedOrders.filter((o: any) => {
          const oPhone = (o.assignedDriverPhone || '').replace(/\D/g, '');
          const oId = (o.assignedDriverId || '').toUpperCase();
          const oName = (o.assignedDriverName || '').toLowerCase();

          // 1. If this order has an assigned driver that does not match this driver profile -> Exclude!
          const hasAssignedDriver = Boolean(oId || oPhone || oName);
          if (hasAssignedDriver) {
            const isDriverMatch = 
              (cleanProfilePhone && oPhone && (oPhone === cleanProfilePhone || cleanProfilePhone.includes(oPhone) || oPhone.includes(cleanProfilePhone))) ||
              (cleanProfileId && oId && (oId === cleanProfileId || cleanProfileId.includes(oId) || oId.includes(cleanProfileId))) ||
              (profileName && oName && (oName.includes(profileName) || profileName.includes(oName)));

            return isDriverMatch;
          }

          // 2. If unassigned and disposal -> defaults to Truck Driver Đặng Hoàng Phúc
          if (!hasAssignedDriver && isPhucTruckDriver && o.isDisposal) {
            return true;
          }

          // 3. If unassigned and van -> defaults to Van Driver Phan Hữu Nam
          if (!hasAssignedDriver && isNamVanDriver && o.isVan) {
            return true;
          }

          return false;
        });

        if (matchedOrders.length === 0) {
          setTasks([]);
          setNextWaveTasks([]);
          setActiveTask(null);
          setNextBatchQueueCount(0);
          return;
        }

        const currentBatchOrders: any[] = [];
        const nextWaveOrders: any[] = [];

        matchedOrders.forEach((o: any) => {
          const isCurrentTripLocked = currentTripLockedIds.has(o.id) || currentTripLockedIds.has(o.orderCode);
          const isAlreadyDelivered = completedTaskIds.has(o.id) || completedTaskIds.has(o.orderCode) || o.status === 'COMPLETED' || o.status === 'DELIVERED';
          const isAlreadyInTransit = inTransitTaskIds.has(o.id) || inTransitTaskIds.has(o.orderCode) || o.status === 'DELIVERING' || o.status === 'SHIPPED' || o.status === 'IN_TRANSIT';

          // If the driver has departed for the current trip:
          // Any newly dispatched order that wasn't locked in this trip moves to next wave!
          if (isBatchDeparted && !isCurrentTripLocked && !isAlreadyInTransit && !isAlreadyDelivered) {
            nextWaveOrders.push(o);
          } else {
            currentBatchOrders.push(o);
          }
        });

        // ── Helper: Consolidate multi-lot disposal orders into 1 single shipment task ──
        const consolidateOrders = (orderList: any[]) => {
          const regularOrders: any[] = [];
          const disposalOrders: any[] = [];

          orderList.forEach((o) => {
            if (o.isDisposal) {
              disposalOrders.push(o);
            } else {
              regularOrders.push(o);
            }
          });

          const result: any[] = [...regularOrders];

          if (disposalOrders.length > 0) {
            const allItems: any[] = [];
            let totalQty = 0;
            const allIds: string[] = [];

            disposalOrders.forEach((d) => {
              allIds.push(d.id);
              if (Array.isArray(d.items) && d.items.length > 0) {
                d.items.forEach((it: any) => {
                  const pName = it.productName || it.name || `Hàng tiêu hủy #${d.orderCode || d.id}`;
                  const pUnit = resolveProductUnit(pName, it.unit);
                  allItems.push({
                    sku: it.sku || it.productId || 'DISPOSAL-ITEM',
                    name: pName,
                    quantity: Number(it.quantity || it.requestedQuantity || 1),
                    unit: pUnit,
                    storageType: 'FROZEN',
                    temperatureNote: '-2.0°C (Xe Tải Lạnh 2.5T)',
                  });
                  totalQty += Number(it.quantity || it.requestedQuantity || 1);
                });
              } else {
                const pName = d.productName || `Lô hàng tiêu hủy #${d.orderCode}`;
                const pUnit = resolveProductUnit(pName, d.unit);
                allItems.push({
                  sku: d.sku || 'DISPOSAL-LOT',
                  name: pName,
                  quantity: Number(d.totalQuantity || 1),
                  unit: pUnit,
                  storageType: 'FROZEN',
                  temperatureNote: '-2.0°C (Xe Tải Lạnh 2.5T)',
                });
                totalQty += Number(d.totalQuantity || 1);
              }
            });

            const packingBoxes = calculatePackingBoxes(totalQty, disposalOrders[0].packageCount);

            // Single consolidated disposal delivery task
            const mergedDisposal: any = {
              ...disposalOrders[0],
              id: disposalOrders[0].id,
              consolidatedIds: allIds,
              orderCode: disposalOrders.length > 1 ? 'DISPOSAL-BATCH' : disposalOrders[0].orderCode,
              customerName: 'Trạm Xử Lý Môi Trường Đa Phước (QC Tiêu Hủy)',
              customerPhone: '1900 6868',
              customerAddress: 'Khu Liên Hợp Xử Lý Chất Thải Đa Phước, Xã Đa Phước, Bình Chánh, TP.HCM',
              items: allItems,
              totalQuantity: totalQty,
              packageCount: packingBoxes,
              isDisposal: true,
              totalAmount: 0,
              paymentMethod: 'Xuất Tiêu Hủy (COD 0đ)',
              notes: `Chuyến xe gom ${packingBoxes} thùng (${totalQty} sản phẩm) tiêu hủy niêm phong QC`,
            };

            result.push(mergedDisposal);
          }

          return result;
        };

        const finalCurrentOrders = consolidateOrders(currentBatchOrders);
        const finalNextOrders = consolidateOrders(nextWaveOrders);

        // 1. Map Current Batch Tasks (Chuyến hiện tại)
        const mappedCurrentTasks: DeliveryTask[] = finalCurrentOrders.map((o: any, idx: number) => {
          let taskStatus: TaskStatus = 'ASSIGNED';
          if (completedTaskIds.has(o.id) || completedTaskIds.has(o.orderCode) || o.status === 'COMPLETED' || o.status === 'DELIVERED') {
            taskStatus = 'DELIVERED';
          } else if (inTransitTaskIds.has(o.id) || inTransitTaskIds.has(o.orderCode) || o.status === 'DELIVERING' || o.status === 'SHIPPED' || o.status === 'IN_TRANSIT') {
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
          };
        });

        setTasks(mappedCurrentTasks);
        setNextWaveTasks(mappedNextTasks);
        setNextBatchQueueCount(mappedNextTasks.length);

        const currentActive = mappedCurrentTasks.find(t => t.status === 'IN_TRANSIT');
        setActiveTask(currentActive || null);
      } else {
        setTasks([]);
        setNextWaveTasks([]);
        setActiveTask(null);
        setNextBatchQueueCount(0);
      }
    } catch (err) {
      // Handled quietly
    }
  }, [driverProfile, completedTaskIds, inTransitTaskIds, currentTripNumber, isBatchDeparted, currentTripLockedIds]);

  useEffect(() => {
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
  }, [fetchLiveAssignedOrders]);

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
    const token = authResult?.token || `JWT_DRIVER_${Date.now()}`;
    const remoteUser = authResult?.user;

    // 2. Intelligent Driver Directory & Profile Matching
    let matchedProfile: DriverProfile | undefined = 
      DRIVER_DB[cleanInput] || 
      DRIVER_DB[emailOrPhone.replace(/\s+/g, '')];

    if (!matchedProfile) {
      const cleanDigits = cleanInput.replace(/\D/g, '');
      const allProfiles: DriverProfile[] = Object.values(DRIVER_DB);

      matchedProfile = allProfiles.find(p => {
        const pPhone = p.phone.replace(/\D/g, '');
        const pName = p.name.toLowerCase();
        const pId = p.id.toLowerCase();
        const pPlate = p.licensePlate.toLowerCase().replace(/\s+/g, '');

        return (
          (cleanDigits.length >= 8 && pPhone.includes(cleanDigits)) ||
          pId === cleanInput ||
          pPlate === cleanInput.replace(/\s+/g, '') ||
          (cleanInput.includes('phuc') && (pName.includes('phúc') || pId === 'NV-TK01')) ||
          (cleanInput.includes('truck') && p.id === 'NV-TK01') ||
          (cleanInput.includes('van') && p.id === 'NV-VAN01') ||
          (cleanInput.includes('tri') && pName.includes('trí')) ||
          (cleanInput.includes('hung') && pName.includes('hùng')) ||
          (cleanInput.includes('bao') && pName.includes('bảo')) ||
          (cleanInput.includes('nam') && pName.includes('nam')) ||
          (cleanInput.includes('tung') && pName.includes('tùng')) ||
          (cleanInput.includes('long') && pName.includes('long')) ||
          (cleanInput.includes('huy') && pName.includes('huy')) ||
          pName.includes(cleanInput)
        );
      });
    }

    if (!matchedProfile) {
      matchedProfile = DEFAULT_PROFILE;
    }

    const finalProfile: DriverProfile = {
      id: matchedProfile.id,
      name: matchedProfile.name,
      phone: matchedProfile.phone,
      licensePlate: matchedProfile.licensePlate,
      vehicleType: matchedProfile.vehicleType,
      warehouseCode: matchedProfile.warehouseCode,
      warehouseName: matchedProfile.warehouseName,
      isOnline: true,
      currentTemp: matchedProfile.currentTemp,
      targetTempMin: matchedProfile.targetTempMin,
      targetTempMax: matchedProfile.targetTempMax,
      rating: matchedProfile.rating,
      completedTasksToday: matchedProfile.completedTasksToday,
      totalEarningsToday: matchedProfile.totalEarningsToday,
      token,
    };

    setDriverProfile(finalProfile);
    setAuthToken(token);
    setIsAuthenticated(true);
    setCurrentTripNumber(1);
    setTripStatus('IN_TRANSIT');
    setTasks([]);
    setNextWaveTasks([]);
    setActiveTask(null);
    setCompletedTaskIds(new Set());
    setInTransitTaskIds(new Set());
    setIsBatchDeparted(false);
    setCurrentTripLockedIds(new Set());

    // Save session in localStorage
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(DRIVER_SESSION_KEY, JSON.stringify({ token, profile: finalProfile }));
        window.localStorage.removeItem('sfwms_driver_batch_departed');
        window.localStorage.removeItem('sfwms_driver_locked_trip_ids');
        window.localStorage.removeItem('sfwms_driver_trip_number');
        window.localStorage.removeItem('sfwms_driver_intransit_ids');
        window.localStorage.removeItem('sfwms_driver_completed_ids');
      } catch (e) {}
    }

    setTimeout(fetchLiveAssignedOrders, 50);

    return true;
  };

  const logout = () => {
    setIsAuthenticated(false);
    setAuthToken(null);
    setCurrentTripNumber(1);
    setTripStatus('IN_TRANSIT');
    setTasks([]);
    setNextWaveTasks([]);
    setActiveTask(null);
    setCompletedTaskIds(new Set());
    setInTransitTaskIds(new Set());
    setIsBatchDeparted(false);
    setCurrentTripLockedIds(new Set());
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.removeItem(DRIVER_SESSION_KEY);
        window.localStorage.removeItem('sfwms_driver_batch_departed');
        window.localStorage.removeItem('sfwms_driver_locked_trip_ids');
        window.localStorage.removeItem('sfwms_driver_trip_number');
        window.localStorage.removeItem('sfwms_driver_intransit_ids');
        window.localStorage.removeItem('sfwms_driver_completed_ids');
      } catch (e) {}
    }
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

    const target = tasks.find(t => t.id === taskId);
    const newIds = [taskId, target?.orderCode || ''].filter(Boolean);

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
      prev.map(t => (t.id === taskId ? { ...t, status: 'IN_TRANSIT' } : t))
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
    const targetTask = tasks.find(t => t.id === taskId);
    const completedIds = [taskId, targetTask?.id || '', targetTask?.orderCode || ''].filter(Boolean);

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
      // Sync completed status to order-service & outbound-service
      await driverApi.syncOrderStatus(targetTask.id, 'COMPLETED');
      await driverApi.syncOutboundStatus(targetTask.id, 'DELIVERED');
    }
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

    // Call Reverse Logistics endpoint via driverApi
    await driverApi.reportFailure(taskId, reason, photoUrl);
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
