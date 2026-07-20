export type TaskStatus = 
  | 'ASSIGNED'        // Đã được kho phân công đơn
  | 'PICKING_UP'      // Đang di chuyển đến kho nhận hàng
  | 'IN_TRANSIT'      // Đã lấy hàng & đang vận chuyển tới khách
  | 'DELIVERED'       // Đã giao thành công (Proof of delivery)
  | 'FAILED';         // Giao không thành công

export type StorageType = 'COLD' | 'FROZEN' | 'DRY';

export interface DeliveryItem {
  sku: string;
  name: string;
  quantity: number;
  unit: string;
  storageType: StorageType;
  temperatureNote?: string;
}

export interface DeliveryTask {
  id: string;
  orderCode: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  distanceKm: number;
  estimatedTimeMinutes: number;
  codAmount: number;             // Số tiền cần thu hộ COD (0 nếu đã trả MoMo/ZaloPay)
  isPaid: boolean;
  paymentMethodText: string;
  timeSlotText: string;          // Khung giờ giao: "Giao siêu tốc 2h"
  status: TaskStatus;
  sequenceOrder: number;         // Thứ tự giao hàng tối ưu VRP (1, 2, 3...)
  storageType: StorageType;
  items: DeliveryItem[];
  packageType: string;           // "Thùng xốp bảo quản lạnh 0-4°C + Gel đá"
  notes?: string;
  deliveredAt?: string;
  proofImageUri?: string;
}

export interface DriverProfile {
  id: string;
  name: string;
  phone: string;
  licensePlate: string;
  vehicleType: 'Xe Máy Thùng Lạnh' | 'Xe Tải Lạnh 1.5T' | 'Xe Tải Đông Lạnh';
  isOnline: boolean;
  currentTemp: number;           // Cảm biến nhiệt độ hiện tại (°C)
  targetTempMin: number;
  targetTempMax: number;
  rating: number;
  completedTasksToday: number;
  totalEarningsToday: number;
}
