/**
 * ═══════════════════════════════════════════════════════
 * CityMart (SFWMS) - Shared DTOs
 * Common interfaces used for inter-service communication
 * ═══════════════════════════════════════════════════════
 */

// ─── Pagination ───
export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ─── Event Payloads ───
export interface BaseEvent {
  eventId: string;
  timestamp: string;
}

export interface ProductEvent extends BaseEvent {
  productId: string;
  sku: string;
  action: 'created' | 'updated' | 'deleted';
}

export interface LotImportedEvent extends BaseEvent {
  lotId: string;
  lotCode: string;
  sku: string;
  zone: string;
  quantity: number;
}

export interface StockLowEvent extends BaseEvent {
  sku: string;
  productName: string;
  currentStock: number;
  minStockThreshold: number;
}

export interface SensorAnomalyEvent extends BaseEvent {
  zoneId: string;
  temperature: number;
  humidity: number;
  durationMinutes: number;
  severity: 'WARNING' | 'CRITICAL';
}

export interface SpoilageRiskEvent extends BaseEvent {
  lotId: string;
  lotCode: string;
  sku: string;
  zone: string;
  riskScore: number;
}

export interface BatchExpiringEvent extends BaseEvent {
  lotId: string;
  lotCode: string;
  sku: string;
  expiryDate: string;
  daysUntilExpiry: number;
}

export interface InboundCompletedEvent extends BaseEvent {
  inboundOrderId: string;
  lotIds: string[];
  supplierId: string;
  totalQuantity: number;
}

export interface OutboundConfirmedEvent extends BaseEvent {
  outboundOrderId: string;
  items: Array<{ sku: string; lotId: string; quantity: number }>;
}

export interface TransportEvent extends BaseEvent {
  vehicleId: string;
  routeId: string;
  status: 'arrived' | 'delayed';
  location?: { lat: number; lng: number };
}

// ─── API Response Wrapper ───
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// ─── Sensor Reading ───
export interface SensorReadingDTO {
  zoneId: string;
  temperature: number;
  humidity: number;
  timestamp: string;
}

// ─── FEFO Suggestion ───
export interface FefoSuggestion {
  lotId: string;
  lotCode: string;
  location: string;
  zone: string;
  remainingQty: number;
  qtyToTake: number;
  expiryDate: string;
  daysUntilExpiry: number;
  riskScore: number;
  status: string;
  priorityScore: number;
}

// ─── Demand Forecast ───
export interface DemandForecastResult {
  sku: string;
  productName: string;
  weeklyDemandForecast: number;
  monthlyDemandForecast: number;
  confidenceInterval: string;
  replenishmentRecommendation: {
    suggestedQuantity: number;
    suggestedOrderDate: string;
    status: 'RESTOCK_RECOMMENDED' | 'STOCK_ADEQUATE' | 'URGENT_RESTOCK';
  };
}

// ─── VRP Route ───
export interface VrpStop {
  id: string;
  name: string;
  lat: number;
  lng: number;
  demand: number;
}

export interface VrpRoute {
  routeId: string;
  vehicleId?: string;
  stops: VrpStop[];
  totalDistance: number;
  totalDemand: number;
  estimatedTime: number; // minutes
}
