/**
 * ═══════════════════════════════════════════════════════
 * CityMart (SFWMS) - Event Constants
 * Defines all RabbitMQ event names used across services
 * ═══════════════════════════════════════════════════════
 */

// ─── RabbitMQ Exchange Names ───
export const EXCHANGES = {
  PRODUCT: 'product.events',
  INVENTORY: 'inventory.events',
  WAREHOUSE: 'warehouse.events',
  INBOUND: 'inbound.events',
  OUTBOUND: 'outbound.events',
  IOT: 'iot.events',
  ML: 'ml.events',
  TRANSPORT: 'transport.events',
} as const;

// ─── Product Events ───
export const PRODUCT_EVENTS = {
  CREATED: 'product.created',
  UPDATED: 'product.updated',
  DELETED: 'product.deleted',
} as const;

// ─── Inventory Events ───
export const INVENTORY_EVENTS = {
  STOCK_LOW: 'stock.low',
  STOCK_DEPLETED: 'stock.depleted',
  BATCH_EXPIRING: 'batch.expiring',
  LOT_IMPORTED: 'lot.imported',
  LOT_RISK_UPDATED: 'lot.risk.updated',
} as const;

// ─── Warehouse Events ───
export const WAREHOUSE_EVENTS = {
  SLOT_UPDATED: 'slot.updated',
  ZONE_CAPACITY_CHANGED: 'zone.capacity.changed',
} as const;

// ─── Inbound Events ───
export const INBOUND_EVENTS = {
  ORDER_CREATED: 'inbound.order.created',
  QUALITY_CHECK_PASSED: 'inbound.quality.passed',
  QUALITY_CHECK_FAILED: 'inbound.quality.failed',
  COMPLETED: 'inbound.completed',
  BATCH_CREATED: 'batch.created',
} as const;

// ─── Outbound Events ───
export const OUTBOUND_EVENTS = {
  ORDER_CREATED: 'outbound.order.created',
  CONFIRMED: 'outbound.confirmed',
  CANCELLED: 'outbound.cancelled',
} as const;

// ─── IoT Events ───
export const IOT_EVENTS = {
  SENSOR_READING: 'sensor.reading',
  SENSOR_ANOMALY: 'sensor.anomaly',
} as const;

// ─── ML/AI Events ───
export const ML_EVENTS = {
  SPOILAGE_RISK_HIGH: 'spoilage.risk.high',
  DEMAND_FORECAST_READY: 'demand.forecast.ready',
  SLOT_ASSIGNED: 'slot.assigned',
} as const;

// ─── Transport Events ───
export const TRANSPORT_EVENTS = {
  ARRIVED: 'transport.arrived',
  DELAYED: 'transport.delayed',
  ROUTE_OPTIMIZED: 'transport.route.optimized',
} as const;

// ─── Alert Severity Levels ───
export enum AlertSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL',
}

// ─── Alert Types ───
export enum AlertType {
  TEMPERATURE_VIOLATION = 'TEMPERATURE_VIOLATION',
  HUMIDITY_VIOLATION = 'HUMIDITY_VIOLATION',
  SPOILAGE_RISK = 'SPOILAGE_RISK',
  LOW_STOCK = 'LOW_STOCK',
  STOCK_DEPLETED = 'STOCK_DEPLETED',
  BATCH_EXPIRING = 'BATCH_EXPIRING',
  TRANSPORT_DELAYED = 'TRANSPORT_DELAYED',
  COLD_CHAIN_BREACH = 'COLD_CHAIN_BREACH',
}
