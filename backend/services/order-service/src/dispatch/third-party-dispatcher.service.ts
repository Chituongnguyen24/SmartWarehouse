import { Injectable, Logger } from '@nestjs/common';

export enum CircuitState {
  CLOSED = 'CLOSED',       // Bình thường, cho phép gọi 3PL API
  OPEN = 'OPEN',           // Đang có lỗi/quá tải, tự động Fallback về đội xe nội bộ
  HALF_OPEN = 'HALF_OPEN', // Thử nghiệm thăm dò lại đối tác
}

export interface DispatchResult {
  success: boolean;
  provider: 'AHAMOVE' | 'GHN' | 'INTERNAL_FLEET_FALLBACK';
  trackingCode?: string;
  assignedDriverName?: string;
  estimatedFee: number;
  message: string;
}

@Injectable()
export class ThirdPartyDispatcherService {
  private readonly logger = new Logger(ThirdPartyDispatcherService.name);

  private circuitState: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private lastFailureTime = 0;
  private readonly FAILURE_THRESHOLD = 3;
  private readonly RESET_TIMEOUT_MS = 30000; // 30s thử lại

  /**
   * Đẩy đơn sang đối tác 3PL với cơ chế Circuit Breaker & Tự Động Fallback
   */
  async dispatchToPartner(
    order: any,
    preferredPartner: 'AHAMOVE' | 'GHN' = 'AHAMOVE',
  ): Promise<DispatchResult> {
    const now = Date.now();

    // 1. Kiểm tra Circuit Breaker State
    if (this.circuitState === CircuitState.OPEN) {
      if (now - this.lastFailureTime > this.RESET_TIMEOUT_MS) {
        this.circuitState = CircuitState.HALF_OPEN;
        this.logger.log(`[CircuitBreaker] Chuyển trạng thái sang HALF_OPEN để thăm dò đối tác 3PL`);
      } else {
        this.logger.warn(`[CircuitBreaker] Circuit đang OPEN. Tự động Fallback sang Đội Xe Máy Nội Bộ Kho Gò Vấp!`);
        return this.fallbackToInternalFleet(order, '3PL API đang quá tải (Circuit OPEN)');
      }
    }

    // 2. Thử gọi API 3PL (Mô phỏng gọi API đối tác với timeout 3s)
    try {
      const response = await this.call3plApiWithTimeout(preferredPartner, order, 2500);

      // Thành công -> Đóng Circuit
      this.circuitState = CircuitState.CLOSED;
      this.failureCount = 0;

      return {
        success: true,
        provider: preferredPartner,
        trackingCode: response.trackingCode,
        assignedDriverName: response.driverName,
        estimatedFee: response.fee,
        message: `Đã kết nối thành công dịch vụ vận chuyển ${preferredPartner}`,
      };
    } catch (error: any) {
      this.failureCount++;
      this.lastFailureTime = now;

      this.logger.error(
        `[ThirdPartyDispatcher] Lỗi kết nối ${preferredPartner}: ${error.message} (Lỗi lần ${this.failureCount}/${this.FAILURE_THRESHOLD})`,
      );

      if (this.failureCount >= this.FAILURE_THRESHOLD) {
        this.circuitState = CircuitState.OPEN;
        this.logger.error(`[CircuitBreaker] Đã kích hoạt ngắt mạch (Circuit OPEN). Các đơn tiếp theo sẽ tự động chuyển hướng nội bộ!`);
      }

      // Tự động Fallback
      return this.fallbackToInternalFleet(order, `Lỗi kết nối ${preferredPartner}: ${error.message}`);
    }
  }

  private async call3plApiWithTimeout(partner: string, order: any, timeoutMs: number): Promise<any> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Timeout ${timeoutMs}ms khi kết nối tới Gateway ${partner}`));
      }, timeoutMs);

      // Mô phỏng API response của Ahamove/GHN
      setTimeout(() => {
        clearTimeout(timer);
        const shouldSimulateFailure = Math.random() < 0.05; // 5% cơ hội lỗi mạng ngẫu nhiên
        if (shouldSimulateFailure) {
          reject(new Error(`Partner Server 503 Service Unavailable`));
        } else {
          resolve({
            trackingCode: `${partner}-${Date.now().toString().slice(-6)}`,
            driverName: `${partner} Express Courier`,
            fee: 28000,
          });
        }
      }, 300);
    });
  }

  private fallbackToInternalFleet(order: any, reason: string): DispatchResult {
    return {
      success: true,
      provider: 'INTERNAL_FLEET_FALLBACK',
      assignedDriverName: 'Võ Minh Trí (Tài xế nội bộ thùng lạnh)',
      estimatedFee: 15000,
      message: `Đã tự động chuyển hướng về đội xe nội bộ Kho Gò Vấp do: ${reason}`,
    };
  }
}
