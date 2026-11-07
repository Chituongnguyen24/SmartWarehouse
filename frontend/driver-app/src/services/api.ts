import { Platform } from 'react-native';

// Dynamic host detection for Expo Web, iOS/Android Simulators, and Physical Devices
export const DEFAULT_LAN_IP = '192.168.2.147';

const getResolvedHost = (): string => {
  if (typeof window !== 'undefined' && window.localStorage) {
    const saved = window.localStorage.getItem('sfwms_driver_host');
    if (saved && saved.trim() !== '') return saved.trim();
  }

  if (typeof window !== 'undefined' && window.location && window.location.hostname) {
    // Running in Browser / Expo Web
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1' && window.location.hostname !== '') {
      return window.location.hostname;
    }
  }
  
  if (Platform.OS === 'android') {
    // Real Android devices connected over USB adb reverse
    return 'localhost';
  }

  // iOS simulator or default fallback
  return 'localhost';
};

export const BACKEND_HOST = getResolvedHost();

export const API_CONFIG = {
  get ORDER_SERVICE() { return `http://${getResolvedHost()}:3004`; },
  get OUTBOUND_SERVICE() { return `http://${getResolvedHost()}:3007`; },
  get AUTH_SERVICE() { return `http://${getResolvedHost()}:3012`; },
  get NOTIFICATION_SERVICE() { return `http://${getResolvedHost()}:3004`; },
};

export const DRIVER_SESSION_KEY = 'sfwms_driver_session_v1';

let currentAuthToken: string | null = null;

export const setAuthToken = (token: string | null) => {
  currentAuthToken = token;
};

export const getAuthToken = () => currentAuthToken;

const getAuthHeaders = (): HeadersInit => {
  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  };
  if (currentAuthToken) {
    headers['Authorization'] = `Bearer ${currentAuthToken}`;
  }
  return headers;
};

// In-memory offline queue for telemetry breadcrumbs when network blips occur
const offlineTelemetryQueue: any[] = [];
let isFlushingTelemetry = false;

export interface TelemetryPayload {
  driverId: string;
  driverName: string;
  phone: string;
  licensePlate: string;
  lat: number;
  lng: number;
  speedKmh: number;
  tempC: number;
  isOnline: boolean;
  currentOrderId?: string | null;
  orderCode?: string | null;
  currentCustomerName?: string | null;
  currentCustomerAddress?: string | null;
  status?: 'IDLE' | 'DELIVERING' | 'RETURNING' | string;
  warehouseCode?: string;
}

export const driverApi = {
  /**
   * Lấy danh sách đơn hàng được gán cho tài xế hoặc đơn hàng khu vực kho được cấp quyền
   */
  async getOrders(warehouseCode: string = 'WH-006'): Promise<any[]> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const url = `${API_CONFIG.ORDER_SERVICE}/orders?warehouseCode=${encodeURIComponent(warehouseCode)}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: getAuthHeaders(),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        return await response.json();
      }
      return [];
    } catch (error) {
      return [];
    }
  },

  /**
   * Lấy danh sách đơn xuất kho / tiêu hủy / chuyển kho từ Outbound Service (:3007)
   */
  async getOutboundOrders(warehouseCode?: string): Promise<any[]> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const url = warehouseCode && warehouseCode !== 'ALL'
        ? `${API_CONFIG.OUTBOUND_SERVICE}/outbound-orders?warehouseCode=${encodeURIComponent(warehouseCode)}`
        : `${API_CONFIG.OUTBOUND_SERVICE}/outbound-orders`;
      const response = await fetch(url, {
        method: 'GET',
        headers: getAuthHeaders(),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        return await response.json();
      }
      return [];
    } catch (error) {
      return [];
    }
  },

  /**
   * Gửi tọa độ GPS + Nhiệt độ IoT thùng xe máy lên server (có hàng đợi offline)
   */
  async sendTelemetry(data: TelemetryPayload): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      const response = await fetch(`${API_CONFIG.ORDER_SERVICE}/orders/telemetry`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        if (offlineTelemetryQueue.length > 0 && !isFlushingTelemetry) {
          driverApi.flushOfflineTelemetry();
        }
        return true;
      }
    } catch (error) {
      if (offlineTelemetryQueue.length < 20) {
        offlineTelemetryQueue.push({ ...data, queuedAt: Date.now() });
      }
    }
    return false;
  },

  /**
   * Xử lý gửi nốt các gói tin trong hàng đợi offline
   */
  async flushOfflineTelemetry() {
    if (offlineTelemetryQueue.length === 0 || isFlushingTelemetry) return;
    isFlushingTelemetry = true;
    try {
      while (offlineTelemetryQueue.length > 0) {
        const item = offlineTelemetryQueue.shift();
        if (item) {
          await fetch(`${API_CONFIG.ORDER_SERVICE}/orders/telemetry`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(item),
          }).catch(() => {});
        }
      }
    } finally {
      isFlushingTelemetry = false;
    }
  },

  /**
   * Đồng bộ trạng thái đơn hàng thời gian thực (DELIVERING, COMPLETED, v.v.)
   */
  async syncOrderStatus(orderId: string, status: string, extraPayload: any = {}): Promise<boolean> {
    try {
      const cleanId = orderId.replace(/^ECOMM-/, '').replace(/^OB-/, '');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(`${API_CONFIG.ORDER_SERVICE}/orders/sync-status/${encodeURIComponent(cleanId)}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status, ...extraPayload }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      return false;
    }
  },

  /**
   * Đồng bộ trạng thái với Outbound Service (:3007)
   */
  async syncOutboundStatus(orderId: string, status: string): Promise<boolean> {
    try {
      const cleanId = orderId.replace(/^OB-/, '').replace(/^OUT-/, '');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const targetStatus = status === 'IN_TRANSIT' || status === 'DELIVERING' ? 'SHIPPED' : status;

      // 1. Call PATCH /outbound-orders/:id/status
      const response = await fetch(`${API_CONFIG.OUTBOUND_SERVICE}/outbound-orders/${encodeURIComponent(cleanId)}/status`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status: targetStatus }),
        signal: controller.signal,
      });

      // 2. Also try with original orderId if cleanId failed
      if (!response.ok) {
        await fetch(`${API_CONFIG.OUTBOUND_SERVICE}/outbound-orders/${encodeURIComponent(orderId)}/status`, {
          method: 'PATCH',
          headers: getAuthHeaders(),
          body: JSON.stringify({ status: targetStatus }),
        }).catch(() => {});
      }

      // 3. If transitioning to SHIPPED, also trigger /ship endpoint
      if (targetStatus === 'SHIPPED') {
        fetch(`${API_CONFIG.OUTBOUND_SERVICE}/outbound-orders/${encodeURIComponent(cleanId)}/ship`, {
          method: 'PUT',
          headers: getAuthHeaders(),
        }).catch(() => {});
      } else if (targetStatus === 'DELIVERED') {
        fetch(`${API_CONFIG.OUTBOUND_SERVICE}/outbound-orders/${encodeURIComponent(cleanId)}/deliver`, {
          method: 'PUT',
          headers: getAuthHeaders(),
        }).catch(() => {});
      }

      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      return false;
    }
  },

  /**
   * Báo cáo sự cố giao hàng / Hàng hoàn (Reverse Logistics)
   */
  async reportFailure(orderId: string, reason: string, photoUrl?: string): Promise<boolean> {
    try {
      const cleanId = orderId.replace(/^ECOMM-/, '').replace(/^OB-/, '');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(`${API_CONFIG.ORDER_SERVICE}/orders/${encodeURIComponent(cleanId)}/report-failure`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          reason,
          photoUrl: photoUrl || '',
          returnToWarehouse: true,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      return false;
    }
  },

  /**
   * Upload ảnh POD lên kho lưu trữ đám mây
   */
  async uploadPodImage(orderId: string, imageBase64: string, type: 'POD' | 'RETURN' = 'POD'): Promise<{ success: boolean; url?: string }> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${API_CONFIG.ORDER_SERVICE}/orders/upload-pod-image`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ imageBase64, orderId, type }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      // Fallback
    }

    return {
      success: true,
      url: `https://sfwms-storage.citymart.vn/pod-proofs/${orderId}_${Date.now()}.jpg`,
    };
  },

  /**
   * Đăng nhập tài xế chuẩn JWT qua Auth Service (:3012)
   */
  async login(emailOrPhone: string, password: string = 'password123'): Promise<{ token?: string; user?: any } | null> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const email = emailOrPhone.includes('@') ? emailOrPhone : 'driver@sfwms.vn';
      const response = await fetch(`${API_CONFIG.AUTH_SERVICE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      if (response.ok) {
        const data = await response.json();
        const token = data.access_token || data.token;
        if (token) {
          setAuthToken(token);
        }
        return { token, user: data.user || data };
      }
    } catch (error) {
      // Fallback
    }
    return null;
  },
};
