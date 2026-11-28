import { Platform } from 'react-native';

// Dynamic host detection for Expo Web, iOS/Android Simulators, and Physical Devices
export const DEPLOYED_HOST = 'smartwarehouse-kltn.duckdns.org';
export const DEFAULT_LAN_IP = DEPLOYED_HOST;

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
  
  return DEPLOYED_HOST;
};

export const getDriverServiceUrl = (port: number): string => {
  const host = getResolvedHost();
  if (host.includes('duckdns.org') || host.includes('amazonaws.com') || host.includes('.com') || host.includes('.vn')) {
    const clean = host.replace(/^https?:\/\//, '').replace(/\/$/, '');
    return `https://${clean}`;
  }
  const cleanHost = host.replace(/^https?:\/\//, '').replace(/\/$/, '');
  return `http://${cleanHost}:${port}`;
};

export const BACKEND_HOST = getResolvedHost();

export const API_CONFIG = {
  get ORDER_SERVICE() { return getDriverServiceUrl(3004); },
  get OUTBOUND_SERVICE() { return getDriverServiceUrl(3007); },
  get AUTH_SERVICE() { return getDriverServiceUrl(3012); },
  get NOTIFICATION_SERVICE() { return getDriverServiceUrl(3004); },
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
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const url = warehouseCode && warehouseCode !== 'ALL'
        ? `${API_CONFIG.ORDER_SERVICE}/orders?warehouseCode=${encodeURIComponent(warehouseCode)}`
        : `${API_CONFIG.ORDER_SERVICE}/orders`;
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
      const timeoutId = setTimeout(() => controller.abort(), 10000);

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
      return response ? response.ok : true;
    } catch (error) {
      return false;
    }
  },

  /**
   * Đồng bộ trạng thái với Outbound Service (:3007)
   */
  async syncOutboundStatus(orderId: string, status: string, extraPayload: any = {}): Promise<boolean> {
    try {
      const rawId = (orderId || '').trim();
      const cleanId = rawId.replace(/^ECOMM-/, '').replace(/^OB-/, '').replace(/^OUT-/, '');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const targetStatus = status === 'IN_TRANSIT' || status === 'DELIVERING' ? 'SHIPPED' : status;

      // 1. Call PATCH /outbound-orders/:id/status (try rawId first, then cleanId)
      let response = await fetch(`${API_CONFIG.OUTBOUND_SERVICE}/outbound-orders/${encodeURIComponent(rawId)}/status`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status: targetStatus, ...extraPayload }),
        signal: controller.signal,
      }).catch(() => null);

      if (!response || !response.ok) {
        response = await fetch(`${API_CONFIG.OUTBOUND_SERVICE}/outbound-orders/${encodeURIComponent(cleanId)}/status`, {
          method: 'PATCH',
          headers: getAuthHeaders(),
          body: JSON.stringify({ status: targetStatus, ...extraPayload }),
        }).catch(() => null);
      }

      // 2. If transitioning to SHIPPED or DELIVERED, trigger dedicated endpoint
      if (targetStatus === 'SHIPPED') {
        fetch(`${API_CONFIG.OUTBOUND_SERVICE}/outbound-orders/${encodeURIComponent(rawId)}/ship`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify(extraPayload),
        }).catch(() => {});
      } else if (targetStatus === 'DELIVERED') {
        const deliverBody = JSON.stringify({ status: 'DELIVERED', ...extraPayload });
        fetch(`${API_CONFIG.OUTBOUND_SERVICE}/outbound-orders/${encodeURIComponent(rawId)}/deliver`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: deliverBody,
        }).catch(() => {
          fetch(`${API_CONFIG.OUTBOUND_SERVICE}/outbound-orders/${encodeURIComponent(cleanId)}/deliver`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: deliverBody,
          }).catch(() => {});
        });
      }

      // 3. Save to localStorage for instant cross-tab sync if on web
      if (typeof window !== 'undefined' && window.localStorage && extraPayload?.podPhotoUrl) {
        try {
          const raw = window.localStorage.getItem('sfwms_pod_photos') || '{}';
          const podMap = JSON.parse(raw);
          podMap[rawId] = extraPayload.podPhotoUrl;
          podMap[cleanId] = extraPayload.podPhotoUrl;
          podMap[`OB-${cleanId}`] = extraPayload.podPhotoUrl;
          podMap[`ECOMM-${cleanId}`] = extraPayload.podPhotoUrl;
          window.localStorage.setItem('sfwms_pod_photos', JSON.stringify(podMap));
        } catch (e) {}
      }

      // 5. Broadcast to Order Gateway Socket (:3004) so Web Dashboard hears it immediately
      fetch(`${API_CONFIG.ORDER_SERVICE}/orders/broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'order_status_updated',
          payload: {
            id: orderId,
            orderCode: rawId,
            cleanId,
            status: targetStatus,
            podPhotoUrl: extraPayload?.podPhotoUrl,
            failureReason: extraPayload?.failureReason,
            failurePhotoUrl: extraPayload?.failurePhotoUrl,
            assignedDriverId: extraPayload?.driverId,
            assignedDriverName: extraPayload?.driverName,
            assignedDriverPhone: extraPayload?.driverPhone,
            assignedDriverPlate: extraPayload?.driverPlate,
          },
        }),
      }).catch(() => {});

      clearTimeout(timeoutId);
      return response ? response.ok : true;
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
      return response ? response.ok : true;
    } catch (error) {
      return false;
    }
  },

  /**
   * Upload ảnh POD lên kho lưu trữ đám mây Amazon S3
   */
  async uploadPodImage(orderId: string, imageBase64: string, type: 'POD' | 'RETURN' = 'POD'): Promise<{ success: boolean; url?: string }> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

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
      console.warn('Upload POD error:', error);
    }

    return {
      success: false,
    };
  },

  /**
   * Lấy báo cáo thống kê đối soát COD ca làm việc của tài xế theo ngày
   */
  async getDriverCodSummary(driverId: string, date?: string): Promise<{
    driverId: string;
    shiftDate: string;
    totalOrders: number;
    deliveredCount: number;
    pendingCount: number;
    failedCount: number;
    totalCodCollected: number;
    totalCodSettled: number;
    pendingCodAmount: number;
    orders: Array<{
      orderId: string;
      orderCode: string;
      customerName: string;
      deliveryAddress: string;
      codAmount: number;
      paymentMethod: string;
      status: string;
      isCodSettled: boolean;
      deliveredAt?: string;
    }>;
  } | null> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const q = new URLSearchParams({ driverId });
      if (date) q.append('date', date);

      const response = await fetch(`${API_CONFIG.ORDER_SERVICE}/orders/driver-cod/summary?${q.toString()}`, {
        method: 'GET',
        headers: getAuthHeaders(),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.warn('getDriverCodSummary error:', error);
    }
    return null;
  },

  /**
   * Nộp tiền mặt hoặc xác nhận chuyển khoản nộp COD về thủ quỹ / kế toán kho
   */
  async settleDriverCod(payload: {
    driverId: string;
    driverName?: string;
    amount: number;
    paymentMethod?: string;
    warehouseCode?: string;
    notes?: string;
    shiftDate?: string;
  }): Promise<{ success: boolean; settlement?: any; error?: string }> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${API_CONFIG.ORDER_SERVICE}/orders/driver-cod/settle`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (response.ok) {
        return await response.json();
      }
      const err = await response.json().catch(() => ({}));
      return { success: false, error: err.message || 'Lỗi khi nộp tiền COD' };
    } catch (error: any) {
      return { success: false, error: error.message || 'Không kết nối được server' };
    }
  },

  /**
   * Lấy danh sách toàn bộ tài xế từ User Service (:3012)
   */
  async getAllDrivers(): Promise<any[]> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      const response = await fetch(`${API_CONFIG.AUTH_SERVICE}/users/drivers`, {
        method: 'GET',
        headers: getAuthHeaders(),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (response.ok) {
        return await response.json();
      }
      return [];
    } catch (e) {
      return [];
    }
  },

  /**
   * Đăng nhập tài xế chuẩn JWT qua Auth Service (:3012) - Chỉ cho phép vai trò DRIVER
   */
  async login(
    emailOrPhone: string,
    password: string = ''
  ): Promise<{ success: boolean; token?: string; user?: any; error?: string }> {
    const roleLabels: Record<string, string> = {
      ADMIN: 'Quản trị viên',
      WAREHOUSE_MANAGER: 'Quản lý kho',
      WAREHOUSE_STAFF: 'Nhân viên kho',
      SALES_STAFF: 'Nhân viên kinh doanh',
      CUSTOMER: 'Khách hàng',
      DRIVER: 'Tài xế giao nhận',
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const rawInput = emailOrPhone.trim();
      const cleanDigits = rawInput.replace(/\D/g, '');
      const isPhoneLike = !rawInput.includes('@') && cleanDigits.length >= 9 && /^[+\d\s.()-]+$/.test(rawInput);
      const identifier = isPhoneLike ? cleanDigits : rawInput;

      const response = await fetch(`${API_CONFIG.AUTH_SERVICE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: identifier,
          phone: isPhoneLike ? cleanDigits : undefined,
          account: rawInput,
          password,
          clientApp: 'DRIVER_APP',
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        if (response.status === 401) {
          return {
            success: false,
            error: errBody.message || 'Số điện thoại/Email hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại!',
          };
        }
        if (response.status === 403) {
          return {
            success: false,
            error: errBody.message || 'Tài khoản không có quyền truy cập Ứng dụng Tài xế!',
          };
        }
        return {
          success: false,
          error: errBody.message || 'Đăng nhập không thành công. Vui lòng kiểm tra lại thông tin tài khoản!',
        };
      }

      const data = await response.json();
      const token = data.access_token || data.token;
      const user = data.user || data;

      if (!token || !user) {
        return {
          success: false,
          error: 'Máy chủ xác thực không trả về phiên làm việc hợp lệ.',
        };
      }

      const statusUpper = String(user.status || 'ACTIVE').toUpperCase();
      if (statusUpper === 'INACTIVE' || statusUpper === 'LOCKED' || user.lockedAt) {
        setAuthToken(null);
        return {
          success: false,
          error: 'Tài khoản tài xế này đã bị khóa hoặc tạm ngừng hoạt động. Vui lòng liên hệ Quản lý kho!',
        };
      }

      const userRole = String(user.role || '').toUpperCase();
      if (userRole !== 'DRIVER') {
        setAuthToken(null);
        const roleName = roleLabels[userRole] || userRole || 'Khác';
        return {
          success: false,
          error: `Tài khoản thuộc vai trò "${roleName}" không được phép đăng nhập vào Ứng dụng Tài xế. Vui lòng sử dụng tài khoản Tài xế giao nhận!`,
        };
      }

      setAuthToken(token);
      return { success: true, token, user };
    } catch (error: any) {
      const isTimeout = error?.name === 'AbortError';
      return {
        success: false,
        error: isTimeout
          ? 'Quá thời gian kết nối máy chủ xác thực. Vui lòng kiểm tra mạng Wi-Fi/4G và thử lại.'
          : 'Không thể kết nối đến máy chủ xác thực. Vui lòng kiểm tra kết nối mạng.',
      };
    }
  },

  /**
   * Gửi OTP qua SMS eSMS.vn
   */
  async sendOtp(phone: string, actionType: 'REGISTER' | 'RESET_PASSWORD' | 'LOGIN_OTP' = 'RESET_PASSWORD'): Promise<{ success: boolean; cooldownSeconds?: number; otpCode?: string; message?: string }> {
    const response = await fetch(`${API_CONFIG.AUTH_SERVICE}/auth/otp/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, actionType }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.message || 'Lỗi khi gửi mã SMS OTP!');
    }
    return data;
  },

  /**
   * Đặt lại mật khẩu bằng mã OTP SMS
   */
  async forgotPasswordConfirm(phone: string, otpCode: string, newPassword: string): Promise<{ success: boolean; message?: string }> {
    const response = await fetch(`${API_CONFIG.AUTH_SERVICE}/auth/forgot-password/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, otpCode, newPassword }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.message || 'Lỗi khi đặt lại mật khẩu!');
    }
    return data;
  },
};
