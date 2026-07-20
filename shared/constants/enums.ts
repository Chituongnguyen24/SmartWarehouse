/**
 * ═══════════════════════════════════════════════════════
 * CityMart (SFWMS) - Shared Enums
 * Common enums used across all microservices
 * ═══════════════════════════════════════════════════════
 */

// ─── Storage Zone Types ───
export enum ZoneType {
  COLD = 'COLD',         // 0-4°C - Rau củ, sữa, thực phẩm tươi sống
  FROZEN = 'FROZEN',     // -30 to -18°C - Thịt, cá, hải sản đông lạnh
  DRY = 'DRY',           // 15-35°C - Đồ hộp, mì gói, nước uống
}

// ─── Storage Slot Status ───
export enum SlotStatus {
  EMPTY = 'EMPTY',
  OCCUPIED = 'OCCUPIED',
  FULL = 'FULL',
  MAINTENANCE = 'MAINTENANCE',
}

// ─── Lot Status ───
export enum LotStatus {
  NORMAL = 'NORMAL',
  AT_RISK = 'AT_RISK',
  EXPIRED = 'EXPIRED',
  QUARANTINE = 'QUARANTINE',
  DISCARDED = 'DISCARDED',
}

// ─── Stock Movement Types ───
export enum MovementType {
  IN = 'IN',
  OUT = 'OUT',
  ADJUSTMENT = 'ADJUSTMENT',
  TRANSFER = 'TRANSFER',
  SPOILAGE_DISCARD = 'SPOILAGE_DISCARD',
}

// ─── Quality Check Status ───
export enum QualityCheckStatus {
  PENDING = 'PENDING',
  PASSED = 'PASSED',
  FAILED = 'FAILED',
  PARTIAL = 'PARTIAL',
}

// ─── Inbound Order Status ───
export enum InboundOrderStatus {
  PENDING = 'PENDING',
  RECEIVING = 'RECEIVING',
  QUALITY_CHECK = 'QUALITY_CHECK',
  STORING = 'STORING',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED',
}

// ─── Outbound Order Status ───
export enum OutboundOrderStatus {
  PENDING = 'PENDING',
  PICKING = 'PICKING',
  PACKED = 'PACKED',
  SHIPPED = 'SHIPPED',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
}

// ─── User Roles ───
export enum UserRole {
  WAREHOUSE_STAFF = 'WAREHOUSE_STAFF',
  WAREHOUSE_MANAGER = 'WAREHOUSE_MANAGER',
  SALES_STAFF = 'SALES_STAFF',
  DRIVER = 'DRIVER',
  ADMIN = 'ADMIN',
}

// ─── Vehicle Types ───
export enum VehicleType {
  NORMAL = 'NORMAL',       // Xe thường
  REFRIGERATED = 'REFRIGERATED', // Xe lạnh
  FROZEN = 'FROZEN',       // Xe đông lạnh
}

// ─── Vehicle Status ───
export enum VehicleStatus {
  AVAILABLE = 'AVAILABLE',
  IN_TRANSIT = 'IN_TRANSIT',
  LOADING = 'LOADING',
  MAINTENANCE = 'MAINTENANCE',
}

// ─── Transport Status ───
export enum TransportStatus {
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  ARRIVED = 'ARRIVED',
  DELAYED = 'DELAYED',
  COMPLETED = 'COMPLETED',
}

// ─── Product Categories ───
export enum ProductCategory {
  VEGETABLES = 'Rau củ quả',
  MEAT_SEAFOOD = 'Thịt cá',
  FROZEN = 'Đông lạnh',
  DAIRY_BEVERAGE = 'Sữa & đồ uống',
  DRY_GOODS = 'Đồ khô',
}

// ─── Safety Envelopes (Temperature/Humidity ranges) ───
export const SAFETY_ENVELOPES = {
  [ZoneType.COLD]: {
    minTemp: 0,
    maxTemp: 4,
    minHumidity: 60,
    maxHumidity: 80,
    label: 'Kho lạnh',
    description: 'Rau củ, sữa, thực phẩm tươi sống',
  },
  [ZoneType.FROZEN]: {
    minTemp: -30,
    maxTemp: -18,
    minHumidity: 40,
    maxHumidity: 65,
    label: 'Kho đông lạnh',
    description: 'Thịt, cá, hải sản đông lạnh',
  },
  [ZoneType.DRY]: {
    minTemp: 15,
    maxTemp: 35,
    minHumidity: 30,
    maxHumidity: 70,
    label: 'Kho khô',
    description: 'Đồ hộp, mì gói, nước uống, gia vị',
  },
} as const;
