import { Injectable, Logger } from '@nestjs/common';
import { OrderGateway } from '../order/order.gateway';

export interface ColdChainTelemetry {
  driverId: string;
  driverName: string;
  orderId?: string;
  currentOrderId?: string;
  orderCode?: string;
  currentCustomerName?: string;
  currentCustomerAddress?: string;
  temperatureCelsius?: number;
  tempC?: number;
  latitude?: number;
  longitude?: number;
  lat?: number;
  lng?: number;
  speedKmh?: number;
  phone?: string;
  licensePlate?: string;
  isOnline?: boolean;
  timestamp?: string;
}

export interface ColdChainAlert {
  alertId: string;
  driverId: string;
  driverName: string;
  currentTemp: number;
  durationMinutes: number;
  severity: 'WARNING' | 'CRITICAL';
  recommendedWarehouseId: string;
  recommendedWarehouseName: string;
  message: string;
  timestamp: string;
}

@Injectable()
export class ColdChainMonitorService {
  private readonly logger = new Logger(ColdChainMonitorService.name);

  // Lưu trữ lịch sử nhiệt độ gần đây của các tài xế (in-memory sliding window)
  private tempHistory: Map<string, { temp: number; time: number }[]> = new Map();

  // Lưu trữ vị trí GPS & cảm biến mới nhất của các tài xế
  private latestLiveDrivers: Map<string, any> = new Map();

  constructor(private readonly orderGateway: OrderGateway) {}

  /**
   * Xử lý gói tin IoT Telemetry từ điện thoại tài xế
   */
  processTelemetry(data: ColdChainTelemetry): {
    isBreach: boolean;
    alert?: ColdChainAlert;
  } {
    const now = Date.now();
    const lat = Number(data.latitude ?? data.lat);
    const lng = Number(data.longitude ?? data.lng);
    const temp = Number(data.temperatureCelsius ?? data.tempC ?? 3.2);
    const speed = Number(data.speedKmh ?? (data as any).speed ?? 0);

    if (data.driverId && !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
      const activeOrderId = data.currentOrderId || data.orderId || (data as any).taskId || null;
      const orderCode = data.orderCode || (activeOrderId ? activeOrderId.slice(0, 8).toUpperCase() : null);
      const customerName = data.currentCustomerName || (data as any).customerName || null;
      const customerAddress = data.currentCustomerAddress || (data as any).customerAddress || (data as any).destination || null;

      const liveRecord = {
        id: data.driverId,
        name: data.driverName || 'Tài Xế',
        phone: data.phone || (data as any).phone || '',
        plate: data.licensePlate || (data as any).plate || '59-K1 888.99',
        lat,
        lng,
        speed,
        temperature: temp,
        status: activeOrderId ? 'DELIVERING' : (data.isOnline ?? true) ? 'READY_FOR_DELIVERY' : 'IDLE',
        currentOrderId: activeOrderId,
        orderCode: orderCode,
        currentCustomerName: customerName,
        currentCustomerAddress: customerAddress,
        updatedAt: new Date().toISOString(),
      };

      this.latestLiveDrivers.set(data.driverId, liveRecord);

      try {
        if (this.orderGateway?.server) {
          this.orderGateway.server.emit('telemetry_update', liveRecord);
        }
      } catch (e) {}
    }

    const history = this.tempHistory.get(data.driverId) || [];
    const updated = [...history.filter(h => now - h.time <= 10 * 60 * 1000), { temp, time: now }];
    this.tempHistory.set(data.driverId, updated);

    // Kiểm tra số lần nhiệt độ > 5°C
    const highTempSamples = updated.filter(h => h.temp > 5.0);

    // Nếu nhiệt độ > 5.0°C liên tục hoặc có từ 3 mẫu trở lên (> 3-5 phút)
    if (temp > 5.0 && highTempSamples.length >= 3) {
      const alert: ColdChainAlert = {
        alertId: `ALERT-TEMP-${Date.now().toString().slice(-6)}`,
        driverId: data.driverId,
        driverName: data.driverName,
        currentTemp: temp,
        durationMinutes: Math.round(highTempSamples.length * 1.0),
        severity: temp > 7.0 ? 'CRITICAL' : 'WARNING',
        recommendedWarehouseId: 'WH-006',
        recommendedWarehouseName: 'Kho Hàng Gò Vấp (Trung Tâm)',
        message: `🚨 CẢNH BÁO LẠNH: Nhiệt độ thùng xe tài xế ${data.driverName} đã lên ${temp}°C (Vượt ngưỡng an toàn 5°C). Yêu cầu tài xế ghé Kho Gò Vấp đổi gel đá / lô hàng tươi mới!`,
        timestamp: new Date().toISOString(),
      };

      this.logger.warn(`[ColdChainMonitor] ${alert.message}`);

      try {
        if (this.orderGateway?.server) {
          this.orderGateway.server.emit('cold_chain_alert', alert);
        }
      } catch (e) {}

      return { isBreach: true, alert };
    }

    return { isBreach: false };
  }

  getAllLiveDrivers(): any[] {
    return Array.from(this.latestLiveDrivers.values());
  }
}
