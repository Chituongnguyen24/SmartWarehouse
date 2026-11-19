export interface ZoneThreshold {
  minTemp: number;
  maxTemp: number;
  minHumidity: number;
  maxHumidity: number;
}

export interface WarehouseThresholds {
  warehouseCode: string;
  warehouseName: string;
  coolZone: ZoneThreshold;
  frozenZone: ZoneThreshold;
  dryZone: ZoneThreshold;
  violationWindowSeconds: number; // Thời gian vi phạm trước khi hú còi
  tempDeadband: number; // Dung sai nhiệt độ (°C)
  humDeadband: number; // Dung sai độ ẩm (% RH)
  updatedAt: string;
}

const DEFAULT_THRESHOLDS: Record<string, WarehouseThresholds> = {
  'WH-006': {
    warehouseCode: 'WH-006',
    warehouseName: 'Kho Hàng Gò Vấp (Trung Tâm Phân Phối & IoT)',
    coolZone: { minTemp: 0.0, maxTemp: 4.0, minHumidity: 60.0, maxHumidity: 85.0 },
    frozenZone: { minTemp: -22.0, maxTemp: -18.0, minHumidity: 50.0, maxHumidity: 75.0 },
    dryZone: { minTemp: 20.0, maxTemp: 25.0, minHumidity: 45.0, maxHumidity: 65.0 },
    violationWindowSeconds: 30,
    tempDeadband: 0.5,
    humDeadband: 2.0,
    updatedAt: new Date().toISOString(),
  },
  'WH-001': {
    warehouseCode: 'WH-001',
    warehouseName: 'Kho Tân Bình (Trung Chuyển Quốc Tế)',
    coolZone: { minTemp: 0.0, maxTemp: 4.0, minHumidity: 60.0, maxHumidity: 80.0 },
    frozenZone: { minTemp: -22.0, maxTemp: -18.0, minHumidity: 50.0, maxHumidity: 75.0 },
    dryZone: { minTemp: 18.0, maxTemp: 26.0, minHumidity: 40.0, maxHumidity: 65.0 },
    violationWindowSeconds: 30,
    tempDeadband: 0.5,
    humDeadband: 2.0,
    updatedAt: new Date().toISOString(),
  },
  'WH-002': {
    warehouseCode: 'WH-002',
    warehouseName: 'Kho Quận 12 (Trung Tâm Thực Phẩm Đông Lạnh)',
    coolZone: { minTemp: 0.0, maxTemp: 4.0, minHumidity: 60.0, maxHumidity: 85.0 },
    frozenZone: { minTemp: -24.0, maxTemp: -18.0, minHumidity: 50.0, maxHumidity: 75.0 },
    dryZone: { minTemp: 20.0, maxTemp: 25.0, minHumidity: 45.0, maxHumidity: 65.0 },
    violationWindowSeconds: 30,
    tempDeadband: 0.5,
    humDeadband: 2.0,
    updatedAt: new Date().toISOString(),
  },
  'WH-005': {
    warehouseCode: 'WH-005',
    warehouseName: 'Kho Thủ Đức (Kho Bán Buôn & Nông Sản)',
    coolZone: { minTemp: 2.0, maxTemp: 6.0, minHumidity: 65.0, maxHumidity: 90.0 },
    frozenZone: { minTemp: -22.0, maxTemp: -18.0, minHumidity: 50.0, maxHumidity: 75.0 },
    dryZone: { minTemp: 20.0, maxTemp: 26.0, minHumidity: 45.0, maxHumidity: 65.0 },
    violationWindowSeconds: 30,
    tempDeadband: 0.5,
    humDeadband: 2.0,
    updatedAt: new Date().toISOString(),
  },
};

const STORAGE_PREFIX = 'sfwms_climate_thresholds_';

export const getWarehouseThresholds = (whCode: string = 'WH-006'): WarehouseThresholds => {
  const code = (whCode || 'WH-006').toUpperCase().trim();
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${code}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.coolZone && parsed.frozenZone && parsed.dryZone) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to parse saved warehouse climate thresholds:', e);
  }

  // Fallback to default presets
  if (DEFAULT_THRESHOLDS[code]) {
    return DEFAULT_THRESHOLDS[code];
  }

  // Generic fallback
  return {
    warehouseCode: code,
    warehouseName: `Kho Hàng ${code}`,
    coolZone: { minTemp: 0.0, maxTemp: 4.0, minHumidity: 60.0, maxHumidity: 85.0 },
    frozenZone: { minTemp: -22.0, maxTemp: -18.0, minHumidity: 50.0, maxHumidity: 75.0 },
    dryZone: { minTemp: 20.0, maxTemp: 25.0, minHumidity: 45.0, maxHumidity: 65.0 },
    violationWindowSeconds: 30,
    tempDeadband: 0.5,
    humDeadband: 2.0,
    updatedAt: new Date().toISOString(),
  };
};

export const saveWarehouseThresholds = (thresholds: WarehouseThresholds): void => {
  const code = (thresholds.warehouseCode || 'WH-006').toUpperCase().trim();
  const data = {
    ...thresholds,
    warehouseCode: code,
    updatedAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${code}`, JSON.stringify(data));
    window.dispatchEvent(new CustomEvent('sfwms_thresholds_updated', { detail: { warehouseCode: code, thresholds: data } }));
  } catch (e) {
    console.error('Failed to save warehouse climate thresholds to localStorage:', e);
  }
};

export const resetWarehouseThresholds = (whCode: string = 'WH-006'): WarehouseThresholds => {
  const code = (whCode || 'WH-006').toUpperCase().trim();
  try {
    localStorage.removeItem(`${STORAGE_PREFIX}${code}`);
  } catch (e) {}

  const standard = DEFAULT_THRESHOLDS[code] || DEFAULT_THRESHOLDS['WH-006'];
  window.dispatchEvent(new CustomEvent('sfwms_thresholds_updated', { detail: { warehouseCode: code, thresholds: standard } }));
  return standard;
};
