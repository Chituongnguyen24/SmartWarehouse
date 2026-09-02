import { Platform } from 'react-native';
import { StaffUser, PickingItem, InboundReceipt, StockInfo } from '../types';

// Danh sách các IP kết nối Backend
const getCandidateHosts = (): string[] => {
  const hosts: string[] = [];

  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location.hostname) {
    hosts.push(window.location.hostname);
  }

  // IP mạng LAN của máy tính phát triển
  hosts.push('192.168.2.147');

  if (Platform.OS === 'android') {
    hosts.push('10.0.2.2');
  }

  hosts.push('localhost');
  hosts.push('127.0.0.1');

  return Array.from(new Set(hosts));
};

let cachedWorkingHost: string | null = null;
let authToken: string | null = null;

export const setAuthToken = (token: string | null) => {
  authToken = token;
};

const getHeaders = () => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  return headers;
};

/**
 * Hàm fetch an toàn tự động kết nối máy chủ Backend thực tế
 */
async function fetchService(port: number, path: string, options: RequestInit = {}): Promise<Response> {
  const hosts = cachedWorkingHost ? [cachedWorkingHost, ...getCandidateHosts().filter(h => h !== cachedWorkingHost)] : getCandidateHosts();

  let lastError: any = null;

  for (const host of hosts) {
    const url = `http://${host}:${port}${path}`;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(url, {
        ...options,
        headers: {
          ...getHeaders(),
          ...(options.headers || {}),
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      cachedWorkingHost = host;
      return res;
    } catch (err: any) {
      lastError = err;
    }
  }

  throw lastError || new Error(`Không thể kết nối máy chủ port :${port}`);
}

/**
 * 1. Đăng nhập nhân viên kho vào User Service (:3012)
 */
export async function loginStaffApi(email: string, pass: string): Promise<{ user: StaffUser; token: string }> {
  const res = await fetchService(3012, '/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password: pass }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Đăng nhập thất bại' }));
    throw new Error(err.message || 'Sai thông tin email hoặc mật khẩu');
  }

  const data = await res.json();
  const u = data.user;
  const staffUser: StaffUser = {
    id: u.id,
    name: u.name || 'Lê Thị Hoa',
    role: u.role || 'WAREHOUSE_STAFF',
    warehouseCode: u.warehouseCode || 'WH-006',
    warehouseName: u.warehouseCode === 'WH-005' ? 'Kho Tân Bình (WH-005)' : 'Kho Gò Vấp (WH-006)',
    shift: 'Ca Sáng (06:00 - 14:00)',
  };

  setAuthToken(data.access_token);
  return { user: staffUser, token: data.access_token };
}

/**
 * 2. Lấy dữ liệu KPI tổng quan ca trực THẬT từ Inbound (:3006), Outbound (:3007), Inventory (:3011)
 */
export async function fetchShiftMetricsApi(warehouseCode: string = 'WH-006') {
  try {
    const [inboundRes, outboundRes, lotsRes] = await Promise.all([
      fetchService(3006, `/inbound-orders`).catch(() => null),
      fetchService(3007, `/outbound-orders`).catch(() => null),
      fetchService(3011, `/inventory/lots?limit=200`).catch(() => null),
    ]);

    const inbounds = inboundRes && inboundRes.ok ? await inboundRes.json() : [];
    const outbounds = outboundRes && outboundRes.ok ? await outboundRes.json() : [];
    const lots = lotsRes && lotsRes.ok ? await lotsRes.json() : [];

    const pendingInbound = inbounds.filter((o: any) => {
      const matchWh = !warehouseCode || !o.warehouseCode || o.warehouseCode === warehouseCode;
      return matchWh && (o.status === 'PENDING' || o.status === 'RECEIVING' || o.status === 'QUALITY_CHECK');
    }).length;

    const pendingPicking = outbounds.filter((o: any) => {
      const matchWh = !warehouseCode || !o.warehouseCode || o.warehouseCode === warehouseCode;
      return matchWh && (o.status === 'PICKING' || o.status === 'PENDING');
    }).length;

    const readyToPack = outbounds.filter((o: any) => {
      const matchWh = !warehouseCode || !o.warehouseCode || o.warehouseCode === warehouseCode;
      return matchWh && o.status === 'PACKED';
    }).length;

    const nearExpiryLots = lots.filter((l: any) => {
      if (!l.expiryDate) return false;
      const days = Math.ceil((new Date(l.expiryDate).getTime() - Date.now()) / (1000 * 3600 * 24));
      return days <= 7;
    }).length;

    return {
      pendingInbound,
      pendingPicking,
      readyToPack,
      nearExpiryLots,
      totalLots: lots.length,
    };
  } catch (e) {
    console.error('Error loading live shift metrics:', e);
    return { pendingInbound: 0, pendingPicking: 0, readyToPack: 0, nearExpiryLots: 0, totalLots: 0 };
  }
}

/**
 * 3. Lấy danh sách nhiệm vụ Soạn hàng THẬT từ Outbound Service (:3007) và E-commerce Orders (:3004)
 */
export async function fetchPickingTasksApi(warehouseCode: string = 'WH-006'): Promise<PickingItem[]> {
  try {
    const [obRes, ecomRes] = await Promise.all([
      fetchService(3007, `/outbound-orders`).catch(() => null),
      fetchService(3004, `/orders`).catch(() => null),
    ]);

    const obOrders = obRes && obRes.ok ? await obRes.json() : [];
    const ecomOrders = ecomRes && ecomRes.ok ? await ecomRes.json() : [];

    const tasks: PickingItem[] = [];
    const seenOrderCodes = new Set<string>();

    // 1. Process Outbound orders (3007)
    if (Array.isArray(obOrders)) {
      const relevantOb = obOrders.filter((ord: any) => {
        const matchWh = !warehouseCode || !ord.warehouseCode || ord.warehouseCode === warehouseCode;
        return matchWh && (ord.status === 'PICKING' || ord.status === 'PENDING' || ord.status === 'PROCESSING');
      });

      relevantOb.forEach((ord: any) => {
        seenOrderCodes.add(ord.orderCode);
        const items = ord.items || [];
        items.forEach((it: any, idx: number) => {
          tasks.push({
            id: it.id || `${ord.id}-item-${idx}`,
            orderId: ord.id,
            orderCode: ord.orderCode || `ORD-${ord.id.slice(0, 6)}`,
            sku: it.sku || 'SKU-01',
            productName: it.productName || it.name || 'Thực phẩm CityMart',
            quantity: Number(it.requestedQuantity) || Number(it.quantity) || 1,
            pickedQuantity: Number(it.pickedQuantity) || (it.status === 'PICKED' ? Number(it.requestedQuantity || 1) : 0),
            unit: it.unit || 'Kg',
            lotCode: it.lotCode || 'LÔ-FEFO-01',
            expiryDate: it.expiryDate ? new Date(it.expiryDate).toLocaleDateString('vi-VN') : 'Trong HSD',
            shelfLocation: it.slotId || it.shelfLocation || `Kệ K-${idx + 1}-0${(idx % 3) + 1}`,
            zone: (it.zone || 'COLD') === 'COLD' ? 'COOL' : it.zone === 'FROZEN' ? 'FROZEN' : 'DRY',
            barcode: it.barcode || `893000${idx}8921`,
            status: it.status === 'PICKED' ? 'PICKED' : 'PENDING',
            imageUrl: it.imageUrl,
            temperatureRequired: it.temperatureRequired || '0-4°C',
          });
        });
      });
    }

    // 2. Process E-commerce orders (3004) that are in PROCESSING / PICKING status
    if (Array.isArray(ecomOrders)) {
      const relevantEcom = ecomOrders.filter((ord: any) => {
        const matchWh = !warehouseCode || !ord.assignedWarehouseCode || ord.assignedWarehouseCode === warehouseCode;
        const code = `ECOMM-${ord.id.slice(0, 8).toUpperCase()}`;
        return matchWh && !seenOrderCodes.has(code) && (ord.status === 'PROCESSING' || ord.status === 'PICKING');
      });

      relevantEcom.forEach((ord: any) => {
        const orderCode = `ECOMM-${ord.id.slice(0, 8).toUpperCase()}`;
        const items = ord.items || [];
        items.forEach((it: any, idx: number) => {
          tasks.push({
            id: it.id || `${ord.id}-item-${idx}`,
            orderId: ord.id,
            orderCode: orderCode,
            sku: it.sku || it.productId || 'SKU-01',
            productName: it.productName || 'Thực phẩm CityMart',
            quantity: Number(it.quantity) || 1,
            pickedQuantity: 0,
            unit: it.unit || 'Món',
            lotCode: it.lotCode || `LOT-FEFO-${ord.id.slice(0, 4)}`,
            expiryDate: 'Trong HSD',
            shelfLocation: it.shelfLocation || `Kệ A-${idx + 1}-0${(idx % 3) + 1}`,
            zone: 'COOL',
            barcode: it.sku || `893000${idx}8921`,
            status: 'PENDING',
            temperatureRequired: '0-4°C (Bảo quản mát)',
          });
        });
      });
    }

    return tasks;
  } catch (e) {
    console.error('Error fetching real picking tasks:', e);
    return [];
  }
}

/**
 * 4. Xác nhận hoàn tất soạn hàng THẬT cho đơn (:3007 & :3004) -> Chuyển sang Đóng Gói (PACKED)
 */
export async function confirmPickingApi(orderId: string): Promise<boolean> {
  let success = false;
  try {
    const res = await fetchService(3007, `/outbound-orders/${orderId}/confirm-picking`, {
      method: 'PUT',
    });
    if (res.ok) success = true;
  } catch (e) {}

  try {
    const cleanId = orderId.replace(/^ECOMM-/, '').replace(/^OB-/, '');
    const ecomRes = await fetchService(3004, `/orders/sync-status/${cleanId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'PACKED' }),
    });
    if (ecomRes.ok) success = true;
  } catch (e) {}

  return success;
}

/**
 * 5. Lấy danh sách phiếu nhập kho THẬT từ Inbound Service (:3006)
 */
export async function fetchInboundOrdersApi(warehouseCode: string = 'WH-006'): Promise<InboundReceipt[]> {
  try {
    const res = await fetchService(3006, `/inbound-orders`);
    if (!res.ok) throw new Error('Cannot fetch inbound orders');
    const orders = await res.json();

    if (Array.isArray(orders)) {
      const filtered = orders.filter((o: any) => !warehouseCode || !o.warehouseCode || o.warehouseCode === warehouseCode);
      return filtered.map((o: any) => ({
        id: o.id,
        orderCode: o.orderCode || `PO-${o.id.slice(0, 6)}`,
        supplierName: o.supplierName || 'Nhà Cung Cấp',
        expectedDate: o.expectedDate ? new Date(o.expectedDate).toLocaleDateString('vi-VN') : 'Trong ngày',
        status: o.status || 'PENDING',
        itemsCount: (o.items && o.items.length) || Number(o.totalItems) || 1,
        totalQuantity: (o.items && o.items.reduce((sum: number, it: any) => sum + (Number(it.expectedQuantity) || Number(it.quantity) || 0), 0)) || Number(o.totalQuantity) || 1,
        temperatureRequired: o.temperatureRequired || '0-4°C (Kho Mát)',
        qcPassed: o.qualityCheckPassed ?? (o.status === 'COMPLETED'),
        notes: o.notes || 'Hàng thực phẩm tươi',
      }));
    }
    return [];
  } catch (e) {
    console.error('Error fetching real inbound orders:', e);
    return [];
  }
}

/**
 * 6. Cập nhật trạng thái phiếu nhập THẬT & Kết quả QC (:3006)
 */
export async function updateInboundStatusApi(orderId: string, status: string, qualityCheckPassed: boolean = true) {
  try {
    const res = await fetchService(3006, `/inbound-orders/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, qualityCheckPassed }),
    });
    return res.ok;
  } catch (e) {
    console.error('Error updating inbound status:', e);
    return false;
  }
}

/**
 * 7. Lấy danh sách đơn đóng gói THẬT từ Outbound Service (:3007) và Order Service (:3004)
 */
export async function fetchPackingOrdersApi(warehouseCode: string = 'WH-006') {
  try {
    const [obRes, ecomRes] = await Promise.all([
      fetchService(3007, `/outbound-orders`).catch(() => null),
      fetchService(3004, `/orders`).catch(() => null),
    ]);

    const obOrders = obRes && obRes.ok ? await obRes.json() : [];
    const ecomOrders = ecomRes && ecomRes.ok ? await ecomRes.json() : [];

    const packedList: any[] = [];
    const seenCodes = new Set<string>();

    if (Array.isArray(obOrders)) {
      obOrders.filter((o: any) => {
        const matchWh = !warehouseCode || !o.warehouseCode || o.warehouseCode === warehouseCode;
        return matchWh && (o.status === 'PACKED' || o.status === 'PICKED');
      }).forEach((o: any) => {
        seenCodes.add(o.orderCode);
        packedList.push(o);
      });
    }

    if (Array.isArray(ecomOrders)) {
      ecomOrders.filter((o: any) => {
        const matchWh = !warehouseCode || !o.assignedWarehouseCode || o.assignedWarehouseCode === warehouseCode;
        const code = `ECOMM-${o.id.slice(0, 8).toUpperCase()}`;
        return matchWh && !seenCodes.has(code) && (o.status === 'PACKED' || o.status === 'PACKING' || o.status === 'READY_FOR_DELIVERY');
      }).forEach((o: any) => {
        packedList.push({
          id: o.id,
          orderCode: `ECOMM-${o.id.slice(0, 8).toUpperCase()}`,
          customerName: o.customerName || 'Khách hàng C.T Mart',
          destination: o.customerAddress || 'Gò Vấp, TP.HCM',
          status: o.status,
          items: (o.items || []).map((it: any) => ({
            sku: it.sku || it.productId,
            productName: it.productName || 'Thực phẩm CityMart',
            requestedQuantity: it.quantity || 1,
            unit: 'Món',
            lotCode: 'LOT-FEFO-COLD',
          })),
        });
      });
    }

    return packedList;
  } catch (e) {
    console.error('Error fetching real packing orders:', e);
    return [];
  }
}

/**
 * 8. Xác nhận đóng gói & Xuất kho THẬT (:3007)
 */
export async function confirmPackingApi(orderId: string, staffName: string) {
  try {
    const res = await fetchService(3007, `/outbound-orders/${orderId}/confirm`, {
      method: 'PUT',
      body: JSON.stringify({ confirmedBy: staffName }),
    });
    return res.ok;
  } catch (e) {
    console.error('Error confirming packing export:', e);
    return false;
  }
}

/**
 * 9. Tra cứu tồn kho & Lô hàng THẬT từ Inventory Service (:3011) & Product Service (:3010)
 */
export async function lookupStockApi(keyword: string = '', warehouseCode?: string): Promise<StockInfo[]> {
  try {
    const whQuery = warehouseCode ? `&warehouseCode=${warehouseCode}` : '&warehouseCode=WH-006';
    const [lotsRes, prodRes] = await Promise.all([
      fetchService(3011, `/inventory/lots?limit=5000${whQuery}`).catch(() => null),
      fetchService(3010, `/products?limit=3000`).catch(() => null),
    ]);

    const lotsData = lotsRes && lotsRes.ok ? await lotsRes.json() : [];
    const prodData = prodRes && prodRes.ok ? await prodRes.json() : [];

    const lots = Array.isArray(lotsData) ? lotsData : (lotsData.items || []);
    const prodList = Array.isArray(prodData) ? prodData : (prodData.items || []);

    const result: StockInfo[] = [];

    prodList.forEach((p: any) => {
      const prodLots = lots.filter((l: any) => l.sku === p.sku || l.productId === p.id || l.productName === p.name);
      const totalStock = prodLots.reduce((acc: number, l: any) => acc + (l.remainingQty !== undefined ? Number(l.remainingQty) : Number(l.quantity) || 0), 0);

      const isMatch = !keyword || 
        (p.name && p.name.toLowerCase().includes(keyword.toLowerCase())) || 
        (p.sku && p.sku.toLowerCase().includes(keyword.toLowerCase()));

      if (isMatch) {
        result.push({
          sku: p.sku || 'SKU-001',
          productName: p.name || 'Sản phẩm CityMart',
          unit: p.unit || 'Kg',
          category: p.category || 'Thực phẩm',
          totalStock: totalStock,
          availableStock: Math.max(0, totalStock),
          shelfLocation: prodLots[0]?.location || prodLots[0]?.slotId || 'Kệ A-01',
          zone: p.category?.includes('Lạnh') || p.storageType === 'COLD' ? 'Kho Lạnh (0-4°C)' : 'Kho Mát',
          lots: prodLots.map((l: any) => {
            const exp = l.expiryDate ? new Date(l.expiryDate) : new Date(Date.now() + 86400000 * 5);
            const days = Math.ceil((exp.getTime() - Date.now()) / (1000 * 3600 * 24));
            const qty = l.remainingQty !== undefined ? Number(l.remainingQty) : Number(l.quantity) || 0;
            return {
              id: l.id,
              lotCode: l.lotCode || 'LÔ-FEFO',
              quantity: qty,
              expiryDate: exp.toLocaleDateString('vi-VN'),
              daysRemaining: days,
              status: days <= 3 ? 'NEAR_EXPIRY' : days < 0 ? 'EXPIRED' : 'FRESH',
              lastAuditedAt: l.lastAuditedAt,
              lastAuditedBy: l.lastAuditedBy,
              lastAuditActualQty: l.lastAuditActualQty !== undefined ? Number(l.lastAuditActualQty) : undefined,
              lastAuditDiff: l.lastAuditDiff !== undefined ? Number(l.lastAuditDiff) : undefined,
              lastAuditReason: l.lastAuditReason,
            };
          }),
        });
      }
    });

    return result;
  } catch (e) {
    console.error('Error fetching real stock data:', e);
    return [];
  }
}

/**
 * 10. Cập nhật kết quả kiểm kê thực tế cho Lô hàng (:3011)
 */
export async function adjustStockAuditApi(lotId: string, actualQuantity: number, reason: string = 'Kiểm kê định kỳ hàng tháng', performedBy: string = 'Nhân viên kho') {
  try {
    const res = await fetchService(3011, `/inventory/lots/${lotId}/adjust`, {
      method: 'POST',
      body: JSON.stringify({ actualQuantity, reason, performedBy }),
    });
    return res.ok;
  } catch (e) {
    console.error('Error adjusting stock lot audit:', e);
    return false;
  }
}

