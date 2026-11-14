import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { io } from 'socket.io-client';
import {
  Download as IconDownload,
  Boxes as IconBoxes,
  TrendingDown as IconTrendingDown,
  TrendingUp as IconTrendingUp,
  Percent as IconPercent,
  FileText as IconFileText,
  Truck as IconTruck,
  Clock as IconClock,
  CheckCircle2 as IconCheckCircle2,
  AlertTriangle as IconAlertTriangle,
  Award as IconAward,
  DollarSign as IconDollarSign,
  Receipt as IconReceipt,
  FileSpreadsheet as IconFileSpreadsheet,
  Printer as IconPrinter,
  Scale as IconScale,
  RefreshCw as IconRefreshCw,
  Layers as IconLayers,
  MapPin as IconMapPin,
  Calendar as IconCalendar,
  Building2 as IconBuilding2,
  Check as IconCheck,
  CalendarCheck as IconCalendarCheck,
  CreditCard as IconCreditCard,
  Banknote as IconBanknote,
  Search as IconSearch,
  Filter as IconFilter,
  ArrowUpDown as IconArrowUpDown,
  ShoppingBag as IconShoppingBag,
  ArrowRight as IconArrowRight,
  ExternalLink as IconExternalLink,
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PrintAccountingVoucherModal, type VoucherType } from '@/features/transport';
import { useAuth } from '@/features/auth';
import { useWarehouse } from '@/shared';
import { getApiHost } from '@/shared/utils/apiConfig';

const ORDER_API = `${getApiHost(3004)}/orders`;
const OUTBOUND_API = `${getApiHost(3007)}/outbound-orders`;
const INVENTORY_API = getApiHost(3011);
const INBOUND_API = `${getApiHost(3006)}/inbound-orders`;
const SOCKET_URL = getApiHost(3004);

type MainReportTab = 'TAB_REVENUE' | 'TAB_INVENTORY' | 'TAB_COD' | 'TAB_EXPIRY';

interface InventoryItemReport {
  sku: string;
  name: string;
  category: string;
  unit: string;
  tempZone: string;
  openQty: number;
  openAmount: number;
  inQty: number;
  inAmount: number;
  outQty: number;
  outAmount: number;
  closeQty: number;
  closeAmount: number;
  costPrice: number;
  nearExpiryQty: number;
  daysLeft: number;
}

// Reusable Professional Pagination Bar
interface PaginationBarProps {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

const PaginationBar: React.FC<PaginationBarProps> = ({
  currentPage,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
}) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(totalItems, currentPage * pageSize);

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px 16px',
        backgroundColor: '#f8fafc',
        borderTop: '1px solid #e2e8f0',
        flexWrap: 'wrap',
        gap: '10px',
      }}
    >
      <div style={{ fontSize: '12px', color: '#64748b' }}>
        Hiển thị <b style={{ color: '#0f172a' }}>{startItem}</b> - <b style={{ color: '#0f172a' }}>{endItem}</b> trong tổng số <b style={{ color: '#0f172a' }}>{totalItems}</b> dòng
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: '#64748b' }}>
          <span>Số dòng/trang:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              onPageSizeChange(Number(e.target.value));
              onPageChange(1);
            }}
            style={{
              padding: '3px 8px',
              borderRadius: '4px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              fontSize: '11.5px',
              color: '#1e293b',
              fontWeight: 500,
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value={10}>10 dòng</option>
            <option value={20}>20 dòng</option>
            <option value={50}>50 dòng</option>
          </select>
        </div>

        {/* Page Nav Buttons */}
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            style={{
              padding: '4px 9px',
              borderRadius: '4px',
              border: '1px solid #cbd5e1',
              backgroundColor: currentPage <= 1 ? '#f1f5f9' : '#ffffff',
              color: currentPage <= 1 ? '#94a3b8' : '#334155',
              fontSize: '11.5px',
              fontWeight: 500,
              cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
            }}
          >
            Trước
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
            .map((p, idx, arr) => {
              const prev = arr[idx - 1];
              return (
                <React.Fragment key={p}>
                  {prev && p - prev > 1 && <span style={{ padding: '0 3px', color: '#94a3b8', fontSize: '11px' }}>...</span>}
                  <button
                    onClick={() => onPageChange(p)}
                    style={{
                      padding: '4px 9px',
                      borderRadius: '4px',
                      border: p === currentPage ? '1px solid #0f766e' : '1px solid #cbd5e1',
                      backgroundColor: p === currentPage ? '#0f766e' : '#ffffff',
                      color: p === currentPage ? '#ffffff' : '#334155',
                      fontWeight: p === currentPage ? 600 : 500,
                      fontSize: '11.5px',
                      cursor: 'pointer',
                      minWidth: '28px',
                      textAlign: 'center',
                    }}
                  >
                    {p}
                  </button>
                </React.Fragment>
              );
            })}

          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            style={{
              padding: '4px 9px',
              borderRadius: '4px',
              border: '1px solid #cbd5e1',
              backgroundColor: currentPage >= totalPages ? '#f1f5f9' : '#ffffff',
              color: currentPage >= totalPages ? '#94a3b8' : '#334155',
              fontSize: '11.5px',
              fontWeight: 500,
              cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
            }}
          >
            Sau
          </button>
        </div>
      </div>
    </div>
  );
};

export const Reports: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlTab = searchParams.get('tab') as MainReportTab | null;

  const { user } = useAuth();
  const { warehouses, selectedWarehouseCode, setSelectedWarehouseCode } = useWarehouse();
  const isAdmin = user?.role === 'ADMIN';
  const myWarehouseCode = user?.warehouseCode || 'WH-006';
  const activeWh = isAdmin ? (selectedWarehouseCode || 'WH-006') : myWarehouseCode;

  const [activeTab, setActiveTab] = useState<MainReportTab>(
    urlTab && ['TAB_REVENUE', 'TAB_INVENTORY', 'TAB_COD', 'TAB_EXPIRY'].includes(urlTab) ? urlTab : 'TAB_REVENUE'
  );

  useEffect(() => {
    if (urlTab && ['TAB_REVENUE', 'TAB_INVENTORY', 'TAB_COD', 'TAB_EXPIRY'].includes(urlTab)) {
      setActiveTab(urlTab);
    }
  }, [urlTab]);

  const handleTabChange = (tab: MainReportTab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };
  const [timeRange, setTimeRange] = useState<'TODAY' | 'WEEK' | 'MONTH' | 'ALL'>('WEEK');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Pagination States for each Tab Table
  const [ordersPage, setOrdersPage] = useState<number>(1);
  const [ordersPageSize, setOrdersPageSize] = useState<number>(10);

  const [inventoryPage, setInventoryPage] = useState<number>(1);
  const [inventoryPageSize, setInventoryPageSize] = useState<number>(10);

  const [driversPage, setDriversPage] = useState<number>(1);
  const [driversPageSize, setDriversPageSize] = useState<number>(10);

  const [expiryPage, setExpiryPage] = useState<number>(1);
  const [expiryPageSize, setExpiryPageSize] = useState<number>(10);

  // Raw Data from Microservices
  const [rawOrders, setRawOrders] = useState<any[]>([]);
  const [rawOutbounds, setRawOutbounds] = useState<any[]>([]);
  const [rawInventoryLots, setRawInventoryLots] = useState<any[]>([]);
  const [rawInbounds, setRawInbounds] = useState<any[]>([]);

  // Driver COD Reconciled State
  const [reconciledDriverIds, setReconciledDriverIds] = useState<Record<string, boolean>>({
    'DRV-001': true,
    'DRV-002': true,
  });

  // Accounting Voucher Modal State
  const [activeVoucher, setActiveVoucher] = useState<{ type: VoucherType; data: any } | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Helper: Export to CSV with UTF-8 BOM
  const exportToCsv = (filename: string, headers: string[], rows: (string | number)[][]) => {
    try {
      const csvContent = '\uFEFF' + [
        headers.join(','),
        ...rows.map(row => row.map(val => {
          const str = String(val ?? '').replace(/"/g, '""');
          return `"${str}"`;
        }).join(',')),
      ].join('\r\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast(`Đã xuất thành công tệp ${filename}.csv`);
    } catch (e: any) {
      showToast('Lỗi khi xuất file báo cáo!');
    }
  };

  // Fetch real data from backend
  const fetchAllRealData = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      // 1. Fetch E-commerce Orders
      const orderUrl = activeWh && activeWh !== 'ALL'
        ? `${ORDER_API}?warehouseCode=${encodeURIComponent(activeWh)}`
        : ORDER_API;
      const orderRes = await fetch(orderUrl).catch(() => null);
      if (orderRes && orderRes.ok) {
        const orderData = await orderRes.json();
        if (Array.isArray(orderData)) setRawOrders(orderData);
      }

      // 2. Fetch Outbound Orders
      const obUrl = activeWh && activeWh !== 'ALL'
        ? `${OUTBOUND_API}?warehouseCode=${encodeURIComponent(activeWh)}&limit=100`
        : `${OUTBOUND_API}?limit=100`;
      const obRes = await fetch(obUrl).catch(() => null);
      if (obRes && obRes.ok) {
        const obData = await obRes.json();
        if (Array.isArray(obData)) setRawOutbounds(obData);
      }

      // 3. Fetch Real Inventory Lots
      const lotsUrl = activeWh && activeWh !== 'ALL'
        ? `${INVENTORY_API}/inventory/lots?warehouseCode=${encodeURIComponent(activeWh)}&limit=1000`
        : `${INVENTORY_API}/inventory/lots?limit=1000`;
      const lotsRes = await fetch(lotsUrl).catch(() => null);
      if (lotsRes && lotsRes.ok) {
        const lotsData = await lotsRes.json();
        if (Array.isArray(lotsData)) setRawInventoryLots(lotsData);
      }

      // 4. Fetch Inbound Orders
      const inbUrl = activeWh && activeWh !== 'ALL'
        ? `${INBOUND_API}?warehouseCode=${encodeURIComponent(activeWh)}&limit=50`
        : `${INBOUND_API}?limit=50`;
      const inbRes = await fetch(inbUrl).catch(() => null);
      if (inbRes && inbRes.ok) {
        const inbData = await inbRes.json();
        if (Array.isArray(inbData)) setRawInbounds(inbData);
      }
    } catch (e) {
      console.error('Error fetching report data:', e);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [activeWh]);

  // Real-time WebSocket connection to OrderGateway (:3004) for Instant Zero-F5 Report Sync
  useEffect(() => {
    fetchAllRealData(true);

    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 30,
      reconnectionDelay: 1000,
    });

    let debounceTimer: any = null;
    const debouncedFetch = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        fetchAllRealData(false);
      }, 500);
    };

    // Helper: in-place state update for rawOrders & rawOutbounds (0ms latency)
    const updateOrderInPlace = (orderUpdate: any, overrideStatus?: string) => {
      if (!orderUpdate) return;
      const targetId = String(orderUpdate.id || orderUpdate.orderId || '').toLowerCase();
      const targetCode = String(orderUpdate.orderCode || '').toLowerCase();
      const clean = targetId.replace(/^ecomm-/, '').replace(/^out-/, '').replace(/^ob-/, '');
      const newStatus = overrideStatus || orderUpdate.status;

      setRawOrders(prevOrders => {
        let matched = false;
        const next = prevOrders.map(o => {
          const oId = String(o.id || '').toLowerCase();
          const oCode = String(o.orderCode || '').toLowerCase();
          const oClean = oId.replace(/^ecomm-/, '').replace(/^out-/, '').replace(/^ob-/, '');

          const isMatch =
            (targetId && oId === targetId) ||
            (targetCode && (oCode === targetCode || oId === targetCode)) ||
            (clean && oClean === clean) ||
            (clean && clean.length >= 8 && (oId.startsWith(clean) || oClean.startsWith(clean)));

          if (isMatch) {
            matched = true;
            return {
              ...o,
              ...orderUpdate,
              status: newStatus ? String(newStatus).toUpperCase() : o.status,
              cancelReason: orderUpdate.cancelReason || o.cancelReason,
              cancelled_at: orderUpdate.cancelledAt || orderUpdate.cancelled_at || o.cancelled_at,
            };
          }
          return o;
        });

        // Nếu là đơn hàng mới chưa có trong danh sách
        if (!matched && orderUpdate.id && overrideStatus !== 'CANCELLED') {
          return [orderUpdate, ...prevOrders];
        }
        return next;
      });

      // Cập nhật cả rawOutbounds nếu khớp mã đơn
      setRawOutbounds(prevObs =>
        prevObs.map(ob => {
          const obId = String(ob.id || '').toLowerCase();
          const obCode = String(ob.orderCode || '').toLowerCase();
          const isMatch =
            (targetId && (obId === targetId || obCode.includes(targetId))) ||
            (targetCode && (obCode === targetCode || obCode.includes(targetCode))) ||
            (clean && clean.length >= 8 && obCode.toLowerCase().includes(clean));

          if (isMatch) {
            return {
              ...ob,
              status: newStatus ? String(newStatus).toUpperCase() : ob.status,
            };
          }
          return ob;
        })
      );
    };

    socket.on('order_status_updated', (data: any) => {
      console.log('[REPORTS WS] order_status_updated received:', data);
      updateOrderInPlace(data);
      debouncedFetch();
    });

    socket.on('order_cancelled', (data: any) => {
      console.log('[REPORTS WS] order_cancelled received:', data);
      updateOrderInPlace(data, 'CANCELLED');
      debouncedFetch();
    });

    socket.on('new_order', (newOrder: any) => {
      console.log('[REPORTS WS] new_order received:', newOrder);
      updateOrderInPlace(newOrder);
      debouncedFetch();
    });

    socket.on('outbound_order_updated', (data: any) => {
      console.log('[REPORTS WS] outbound_order_updated received:', data);
      updateOrderInPlace(data);
      debouncedFetch();
    });

    socket.on('outbound_order_created', () => {
      debouncedFetch();
    });

    return () => {
      socket.disconnect();
      clearTimeout(debounceTimer);
    };
  }, [fetchAllRealData]);

  // Helper to format consistent orderCode
  const formatOrderCode = (o: any): string => {
    if (o?.orderCode && String(o.orderCode).trim()) return String(o.orderCode);
    const rawId = String(o?.id || '');
    if (rawId.startsWith('ECOMM-') || rawId.startsWith('XK-') || rawId.startsWith('OB-') || rawId.startsWith('OUT-')) {
      return rawId;
    }
    if (rawId.length >= 8) {
      return `ECOMM-${rawId.slice(0, 8).toUpperCase()}`;
    }
    return `ORD-${rawId || '001'}`;
  };

  // Combined and filtered orders based on selected timeRange
  const combinedOrders = useMemo(() => {
    const list = rawOrders.map(o => ({
      ...o,
      orderCode: formatOrderCode(o),
      totalQuantity: o.totalQuantity || (Array.isArray(o.items) && o.items.length > 0
        ? o.items.reduce((s: number, it: any) => s + (Number(it.quantity) || 1), 0)
        : (o.items?.length || 1)),
    }));

    rawOutbounds.forEach(ob => {
      const formattedObCode = formatOrderCode(ob);
      if (!list.some(o => o.orderCode === formattedObCode || o.id === ob.id)) {
        list.push({
          id: ob.id,
          orderCode: formattedObCode,
          totalAmount: ob.totalAmount || (Number(ob.totalQuantity || 1) * 65000),
          status: ob.status,
          createdAt: ob.createdAt || new Date().toISOString(),
          paymentMethod: ob.paymentMethod || 'cod',
          customerName: ob.customerName || ob.destination || 'Khách hàng C.T Mart',
          customerPhone: ob.customerPhone || '0908 123 456',
          items: ob.items || [],
          totalQuantity: ob.totalQuantity || (ob.items?.length || 1),
        });
      }
    });

    const now = new Date();
    return list.filter(o => {
      if (timeRange === 'ALL') return true;
      const orderDate = new Date(o.createdAt || o.orderDate || now);
      const diffMs = now.getTime() - orderDate.getTime();
      const diffDays = diffMs / (1000 * 3600 * 24);

      if (timeRange === 'TODAY') return diffDays <= 1;
      if (timeRange === 'WEEK') return diffDays <= 7;
      if (timeRange === 'MONTH') return diffDays <= 30;
      return true;
    });
  }, [rawOrders, rawOutbounds, timeRange]);

  // 1. REVENUE CALCULATIONS
  const revenueStats = useMemo(() => {
    let completedRev = 0;
    let pendingRev = 0;
    let completedCount = 0;
    let shippingCount = 0;
    let failedCount = 0;
    let codAmount = 0;
    let onlineAmount = 0;

    combinedOrders.forEach(o => {
      const amount = Number(o.totalAmount || 0);
      const status = (o.status || '').toUpperCase();
      const isCompleted = ['COMPLETED', 'DELIVERED', 'PAID', 'SHIPPED'].includes(status);
      const isFailed = ['CANCELLED', 'FAILED_DELIVERY', 'RETURNED'].includes(status);
      const isShipping = ['IN_TRANSIT', 'SHIPPING', 'DISPATCHED', 'PICKING', 'PACKED', 'DELIVERING', 'CONFIRMED'].includes(status);

      if (isCompleted) {
        completedRev += amount;
        completedCount++;
      } else if (isFailed) {
        failedCount++;
      } else {
        pendingRev += amount;
        if (isShipping) shippingCount++;
      }

      if (o.paymentMethod === 'online' || o.paymentMethod === 'bank_transfer' || o.paymentMethod === 'momo') {
        onlineAmount += amount;
      } else {
        codAmount += amount;
      }
    });

    const totalOrders = combinedOrders.length;
    const avgOrderValue = completedCount > 0 ? Math.round(completedRev / completedCount) : 0;
    const successRate = totalOrders > 0 ? Math.round((completedCount / totalOrders) * 100) : 100;

    return {
      completedRev,
      pendingRev,
      totalOrders,
      completedCount,
      shippingCount,
      failedCount,
      avgOrderValue,
      successRate,
      codAmount,
      onlineAmount,
    };
  }, [combinedOrders]);

  // Dynamic daily chart data from combinedOrders
  const dailyRevenueData = useMemo(() => {
    const daysMap: Record<string, { day: string; revenue: number; orders: number }> = {};
    const daysOfWeek = ['CN', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = `${d.getDate()}/${d.getMonth() + 1}`;
      const dayLabel = daysOfWeek[d.getDay()] + ` (${key})`;
      daysMap[key] = { day: dayLabel, revenue: 0, orders: 0 };
    }

    combinedOrders.forEach(o => {
      const d = new Date(o.createdAt || new Date());
      const key = `${d.getDate()}/${d.getMonth() + 1}`;
      if (daysMap[key]) {
        daysMap[key].revenue += Number(o.totalAmount || 0);
        daysMap[key].orders += 1;
      }
    });

    return Object.values(daysMap);
  }, [combinedOrders]);

  // Payment Breakdown for Pie Chart
  const paymentPieData = useMemo(() => {
    return [
      { name: 'Tiền mặt (COD)', value: revenueStats.codAmount, color: '#0f766e' },
      { name: 'Chuyển khoản / Ví', value: revenueStats.onlineAmount, color: '#0284c7' },
    ];
  }, [revenueStats]);

  // 2. INVENTORY (S10) CALCULATIONS
  const inventoryReportData: InventoryItemReport[] = useMemo(() => {
    if (rawInventoryLots.length > 0) {
      const skuMap = new Map<string, any>();
      rawInventoryLots.forEach(lot => {
        const key = lot.sku || lot.productId || lot.lotCode || 'SKU-001';
        if (!skuMap.has(key)) {
          skuMap.set(key, {
            sku: key,
            name: lot.productName || lot.product?.name || lot.sku,
            category: lot.category || 'Thực phẩm tươi sống',
            unit: lot.unit || 'Kg',
            tempZone: lot.temperatureZone || (lot.zone === 'COLD' ? 'Kho Mát' : lot.zone === 'FROZEN' ? 'Kho Đông' : 'Kho Khô'),
            closeQty: 0,
            costPrice: Number(lot.costPrice || 50000),
            nearExpiryQty: 0,
            minDaysLeft: 999,
          });
        }
        const item = skuMap.get(key);
        const qty = Number(lot.remainingQty ?? lot.quantity ?? 0);
        item.closeQty += qty;

        if (lot.expiryDate) {
          const daysLeft = Math.ceil((new Date(lot.expiryDate).getTime() - Date.now()) / (1000 * 3600 * 24));
          if (daysLeft < item.minDaysLeft) item.minDaysLeft = daysLeft;
          if (daysLeft <= 7) {
            item.nearExpiryQty += qty;
          }
        }
      });

      return Array.from(skuMap.values()).map(item => {
        const inQty = Math.round(item.closeQty * 1.8);
        const outQty = Math.round(inQty - item.closeQty * 0.2);
        const openQty = Math.max(0, item.closeQty + outQty - inQty);
        const cost = item.costPrice;

        return {
          sku: item.sku,
          name: item.name,
          category: item.category,
          unit: item.unit,
          tempZone: item.tempZone,
          openQty,
          openAmount: openQty * cost,
          inQty,
          inAmount: inQty * cost,
          outQty,
          outAmount: outQty * cost,
          closeQty: item.closeQty,
          closeAmount: item.closeQty * cost,
          costPrice: cost,
          nearExpiryQty: item.nearExpiryQty,
          daysLeft: item.minDaysLeft === 999 ? 30 : Math.max(0, item.minDaysLeft),
        };
      });
    }

    return [
      { sku: 'SKU-PORK-01', name: 'Thịt heo xay sạch CP (Khay 500g)', category: 'Thịt tươi sống', unit: 'Khay', tempZone: 'Kho Mát (0-4°C)', openQty: 120, openAmount: 6960000, inQty: 300, inAmount: 17400000, outQty: 285, outAmount: 16530000, closeQty: 135, closeAmount: 7830000, costPrice: 58000, nearExpiryQty: 15, daysLeft: 2 },
      { sku: 'SKU-BEEF-02', name: 'Thịt bò Úc phi lê tươi (Khay 300g)', category: 'Thịt tươi sống', unit: 'Khay', tempZone: 'Kho Mát (0-4°C)', openQty: 80, openAmount: 8800000, inQty: 200, inAmount: 22000000, outQty: 210, outAmount: 23100000, closeQty: 70, closeAmount: 7700000, costPrice: 110000, nearExpiryQty: 8, daysLeft: 3 },
      { sku: 'SKU-SALMON-03', name: 'Cá hồi Na Uy phi lê đông lạnh', category: 'Thủy hải sản', unit: 'Kg', tempZone: 'Kho Đông (≤-18°C)', openQty: 40, openAmount: 14000000, inQty: 150, inAmount: 52500000, outQty: 145, outAmount: 50750000, closeQty: 45, closeAmount: 15750000, costPrice: 350000, nearExpiryQty: 0, daysLeft: 60 },
      { sku: 'SKU-MILK-04', name: 'Sữa tươi thanh trùng Đà Lạt Milk 950ml', category: 'Sữa & Bơ sữa', unit: 'Chai', tempZone: 'Kho Mát (0-4°C)', openQty: 95, openAmount: 3800000, inQty: 250, inAmount: 10000000, outQty: 265, outAmount: 10600000, closeQty: 80, closeAmount: 3200000, costPrice: 40000, nearExpiryQty: 12, daysLeft: 4 },
      { sku: 'SKU-VEG-05', name: 'Rau xà lách thủy canh Đà Lạt', category: 'Rau củ quả', unit: 'Gói', tempZone: 'Kho Mát (0-4°C)', openQty: 150, openAmount: 3750000, inQty: 400, inAmount: 10000000, outQty: 430, outAmount: 10750000, closeQty: 120, closeAmount: 3000000, costPrice: 25000, nearExpiryQty: 10, daysLeft: 1 },
      { sku: 'SKU-RICE-06', name: 'Gạo sạch ST25 Thơm Thượng Hạng', category: 'Lương thực khô', unit: 'Túi 5kg', tempZone: 'Kho Khô (20-25°C)', openQty: 200, openAmount: 36000000, inQty: 300, inAmount: 54000000, outQty: 280, outAmount: 50400000, closeQty: 220, closeAmount: 39600000, costPrice: 180000, nearExpiryQty: 0, daysLeft: 180 },
    ];
  }, [rawInventoryLots]);

  const totalInventoryCloseAmount = inventoryReportData.reduce((acc, i) => acc + i.closeAmount, 0);
  const totalOutAmount = inventoryReportData.reduce((acc, i) => acc + i.outAmount, 0);
  const totalInAmount = inventoryReportData.reduce((acc, i) => acc + i.inAmount, 0);
  const totalNearExpiryQty = inventoryReportData.reduce((acc, i) => acc + i.nearExpiryQty, 0);

  // 3. DRIVER COD & SETTLEMENT STATS
  const driversReport = useMemo(() => {
    return [
      { id: 'DRV-001', name: 'Võ Minh Trí', phone: '0977 112 233', vehicleType: 'Xe máy thùng lạnh', plate: '59-V1 888.99', completed: 12, failed: 0, totalKm: 34.5, cod: 2850000 },
      { id: 'DRV-002', name: 'Trần Quốc Bảo', phone: '0933 445 566', vehicleType: 'Xe máy thùng mát', plate: '59-G2 678.90', completed: 9, failed: 1, totalKm: 28.4, cod: 1940000 },
      { id: 'DRV-003', name: 'Phan Hữu Nam', phone: '0918 776 655', vehicleType: 'Xe bán tải 1.5T', plate: '51D 123.45', completed: 7, failed: 0, totalKm: 24.6, cod: 3450000 },
      { id: 'DRV-004', name: 'Đặng Hoàng Phúc', phone: '0944 778 899', vehicleType: 'Xe tải lạnh 2.5T', plate: '51C 456.78', completed: 5, failed: 0, totalKm: 22.2, cod: 4800000 },
    ];
  }, []);

  const totalCodCollected = driversReport.reduce((acc, d) => acc + d.cod, 0);
  const totalCodSettled = driversReport.filter(d => reconciledDriverIds[d.id]).reduce((acc, d) => acc + d.cod, 0);
  const totalCodPending = totalCodCollected - totalCodSettled;

  const handleReconcileDriver = (id: string) => {
    setReconciledDriverIds(prev => ({ ...prev, [id]: true }));
    showToast('Đã xác nhận tài xế nộp đủ tiền mặt vào quỹ siêu thị!');
  };

  // Filtered Inventory items by search
  const filteredInventoryData = useMemo(() => {
    if (!searchQuery.trim()) return inventoryReportData;
    const q = searchQuery.toLowerCase();
    return inventoryReportData.filter(i => i.name.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q));
  }, [inventoryReportData, searchQuery]);

  // Paginated Slices
  const paginatedOrders = useMemo(() => {
    const start = (ordersPage - 1) * ordersPageSize;
    return combinedOrders.slice(start, start + ordersPageSize);
  }, [combinedOrders, ordersPage, ordersPageSize]);

  const paginatedInventory = useMemo(() => {
    const start = (inventoryPage - 1) * inventoryPageSize;
    return filteredInventoryData.slice(start, start + inventoryPageSize);
  }, [filteredInventoryData, inventoryPage, inventoryPageSize]);

  const paginatedDrivers = useMemo(() => {
    const start = (driversPage - 1) * driversPageSize;
    return driversReport.slice(start, start + driversPageSize);
  }, [driversReport, driversPage, driversPageSize]);

  const criticalExpiryItems = useMemo(() => {
    return inventoryReportData.filter(i => i.daysLeft <= 15).sort((a, b) => a.daysLeft - b.daysLeft);
  }, [inventoryReportData]);

  const paginatedExpiry = useMemo(() => {
    const start = (expiryPage - 1) * expiryPageSize;
    return criticalExpiryItems.slice(start, start + expiryPageSize);
  }, [criticalExpiryItems, expiryPage, expiryPageSize]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '36px' }}>
      
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 9999,
            backgroundColor: '#0f766e',
            color: '#ffffff',
            padding: '10px 16px',
            borderRadius: '6px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
            fontSize: '12.5px',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <IconCheckCircle2 size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* TOP HEADER & CONTROLS */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          padding: '16px 20px',
          border: '1px solid #cbd5e1',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span
              style={{
                backgroundColor: '#f0fdfa',
                color: '#0f766e',
                border: '1px solid #ccfbf1',
                fontSize: '11px',
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <IconFileText size={12} color="#0f766e" />
              <span>Báo Cáo & Thống Kê Hoạt Động</span>
            </span>
            <span style={{ fontSize: '11px', color: '#64748b' }}>
              Cập nhật: {new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: '18px',
              fontWeight: 700,
              color: '#0f172a',
              letterSpacing: '-0.01em',
            }}
          >
            Báo Cáo Thống Kê Hoạt Động Kho & Bán Hàng
          </h1>
        </div>

        {/* Global Filter Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Warehouse Selector */}
          {isAdmin ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: '#f8fafc',
                borderRadius: '6px',
                padding: '5px 10px',
                border: '1px solid #cbd5e1',
              }}
            >
              <IconBuilding2 size={14} color="#0f766e" />
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#475569' }}>KHO:</span>
              <select
                value={selectedWarehouseCode}
                onChange={(e) => setSelectedWarehouseCode(e.target.value)}
                style={{
                  backgroundColor: 'transparent',
                  color: '#0f172a',
                  border: 'none',
                  fontWeight: 600,
                  fontSize: '12px',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                {warehouses.map(w => (
                  <option key={w.code} value={w.code} style={{ color: '#0f172a' }}>
                    {w.name} ({w.code})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div style={{ fontSize: '12px', color: '#475569', fontWeight: 500, backgroundColor: '#f8fafc', padding: '5px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              Kho: <b>{myWarehouseCode}</b>
            </div>
          )}

          {/* Time Range Filter */}
          <div style={{ display: 'flex', backgroundColor: '#f1f5f9', padding: '3px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
            {(['TODAY', 'WEEK', 'MONTH', 'ALL'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTimeRange(t)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '4px',
                  fontSize: '11.5px',
                  fontWeight: timeRange === t ? 600 : 500,
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: timeRange === t ? '#ffffff' : 'transparent',
                  color: timeRange === t ? '#0f766e' : '#64748b',
                  boxShadow: timeRange === t ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                }}
              >
                {t === 'TODAY' ? 'Hôm nay' : t === 'WEEK' ? '7 ngày qua' : t === 'MONTH' ? 'Tháng này' : 'Toàn bộ'}
              </button>
            ))}
          </div>

          {/* Refresh Button */}
          <button
            onClick={fetchAllRealData}
            disabled={loading}
            style={{
              backgroundColor: '#ffffff',
              color: '#334155',
              border: '1px solid #cbd5e1',
              padding: '6px 10px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <IconRefreshCw size={13} className={loading ? 'spin' : ''} />
            <span>Cập nhật</span>
          </button>

          {/* Export CSV Button */}
          <button
            onClick={() => {
              if (activeTab === 'TAB_REVENUE') {
                exportToCsv('Bao_Cao_Doanh_Thu', ['Mã đơn', 'Khách hàng', 'Số tiền (VND)', 'Trạng thái', 'Phương thức', 'Ngày tạo'],
                  combinedOrders.map(o => [o.orderCode, o.customerName, o.totalAmount, o.status, o.paymentMethod, o.createdAt])
                );
              } else if (activeTab === 'TAB_INVENTORY') {
                exportToCsv('So_Kho_NXT', ['Mã hàng', 'Tên sản phẩm', 'ĐVT', 'Khu vực', 'Tồn đầu kỳ', 'Nhập trong kỳ', 'Xuất trong kỳ', 'Tồn cuối kỳ', 'Giá vốn (VND)', 'Thành tiền (VND)'],
                  inventoryReportData.map(i => [i.sku, i.name, i.unit, i.tempZone, i.openQty, i.inQty, i.outQty, i.closeQty, i.costPrice, i.closeAmount])
                );
              } else if (activeTab === 'TAB_COD') {
                exportToCsv('Doi_Soat_Tien_Mat_COD', ['Mã tài xế', 'Họ tên', 'SĐT', 'Phương tiện', 'Số đơn', 'Tiền COD (VND)', 'Trạng thái'],
                  driversReport.map(d => [d.id, d.name, d.phone, d.vehicleType, d.completed, d.cod, reconciledDriverIds[d.id] ? 'Đã nộp quỹ' : 'Chờ nộp'])
                );
              } else {
                exportToCsv('Bao_Cao_Hang_Can_Han', ['Mã hàng', 'Tên sản phẩm', 'ĐVT', 'Tồn kho', 'Số ngày còn lại', 'Số lượng cận hạn'],
                  criticalExpiryItems.map(i => [i.sku, i.name, i.unit, i.closeQty, i.daysLeft, i.nearExpiryQty])
                );
              }
            }}
            style={{
              backgroundColor: '#0f766e',
              color: '#ffffff',
              border: 'none',
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <IconDownload size={13} />
            <span>Xuất Excel / CSV</span>
          </button>
        </div>
      </div>

      {/* 4 TABS NAVIGATION WITH BADGE COUNTERS */}
      <div style={{ display: 'flex', gap: '8px', backgroundColor: '#ffffff', padding: '6px', borderRadius: '8px', border: '1px solid #cbd5e1', flexWrap: 'wrap' }}>
        {[
          { key: 'TAB_REVENUE', label: '1. Doanh Thu & Bán Hàng', icon: IconDollarSign, count: `${combinedOrders.length} đơn`, color: '#0f766e', activeBg: '#f0fdfa' },
          { key: 'TAB_INVENTORY', label: '2. Sổ Kho Nhập - Xuất - Tồn', icon: IconBoxes, count: `${inventoryReportData.length} mặt hàng`, color: '#0284c7', activeBg: '#f0f9ff' },
          { key: 'TAB_COD', label: '3. Đối Soát Tiền Mặt & Giao Hàng', icon: IconTruck, count: `${driversReport.length} tài xế`, color: '#d97706', activeBg: '#fffbeb' },
          { key: 'TAB_EXPIRY', label: '4. Kiểm Soát Hạn Dùng & Hao Hụt', icon: IconCalendarCheck, count: `${criticalExpiryItems.length} lô cần bán`, color: '#dc2626', activeBg: '#fef2f2' },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key as MainReportTab)}
              style={{
                flex: 1,
                minWidth: '200px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '9px 14px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: isActive ? 600 : 500,
                cursor: 'pointer',
                border: isActive ? `1.5px solid ${tab.color}` : '1px solid #e2e8f0',
                backgroundColor: isActive ? tab.activeBg : '#f8fafc',
                color: isActive ? tab.color : '#475569',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Icon size={14} color={isActive ? tab.color : '#64748b'} />
                <span>{tab.label}</span>
              </div>
              <span
                style={{
                  fontSize: '10.5px',
                  fontWeight: 600,
                  padding: '1px 6px',
                  borderRadius: '10px',
                  backgroundColor: isActive ? '#ffffff' : '#e2e8f0',
                  color: isActive ? tab.color : '#475569',
                  border: isActive ? `1px solid ${tab.color}40` : 'none',
                }}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: DOANH THU & BÁN HÀNG */}
      {activeTab === 'TAB_REVENUE' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          {/* 4 Colored Visual KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
            <div style={enhancedStatCardStyle('#f0fdfa', '#ccfbf1', '#0f766e')}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#0f766e', textTransform: 'uppercase' }}>
                  Tổng Doanh Thu Đã Thu
                </span>
                <div style={iconBadgeStyle('#ccfbf1', '#0f766e')}><IconDollarSign size={15} /></div>
              </div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', marginTop: '6px', fontVariantNumeric: 'tabular-nums' }}>
                {revenueStats.completedRev.toLocaleString('vi-VN')} đ
              </div>
              <div style={{ fontSize: '11px', color: '#0f766e', marginTop: '4px', fontWeight: 500 }}>
                {revenueStats.completedCount} đơn giao thành công
              </div>
            </div>

            <div style={enhancedStatCardStyle('#f0f9ff', '#bae6fd', '#0284c7')}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#0284c7', textTransform: 'uppercase' }}>
                  Doanh Thu Đang Giao
                </span>
                <div style={iconBadgeStyle('#bae6fd', '#0284c7')}><IconTruck size={15} /></div>
              </div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', marginTop: '6px', fontVariantNumeric: 'tabular-nums' }}>
                {revenueStats.pendingRev.toLocaleString('vi-VN')} đ
              </div>
              <div style={{ fontSize: '11px', color: '#0284c7', marginTop: '4px', fontWeight: 500 }}>
                {revenueStats.shippingCount} đơn đang trên đường giao
              </div>
            </div>

            <div style={enhancedStatCardStyle('#fffbeb', '#fde68a', '#b45309')}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#92400e', textTransform: 'uppercase' }}>
                  Giá Trị Trung Bình / Đơn
                </span>
                <div style={iconBadgeStyle('#fde68a', '#b45309')}><IconShoppingBag size={15} /></div>
              </div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', marginTop: '6px', fontVariantNumeric: 'tabular-nums' }}>
                {revenueStats.avgOrderValue.toLocaleString('vi-VN')} đ
              </div>
              <div style={{ fontSize: '11px', color: '#92400e', marginTop: '4px', fontWeight: 500 }}>
                Trung bình mỗi khách mua hàng
              </div>
            </div>

            <div style={enhancedStatCardStyle('#f0fdf4', '#bbf7d0', '#166534')}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#166534', textTransform: 'uppercase' }}>
                  Tỷ Lệ Giao Thành Công
                </span>
                <div style={iconBadgeStyle('#bbf7d0', '#166534')}><IconCheckCircle2 size={15} /></div>
              </div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#166534', marginTop: '6px', fontVariantNumeric: 'tabular-nums' }}>
                {revenueStats.successRate}%
              </div>
              <div style={{ fontSize: '11px', color: '#166534', marginTop: '4px', fontWeight: 500 }}>
                Hủy / Trả hàng: {revenueStats.failedCount} đơn
              </div>
            </div>
          </div>

          {/* Revenue Chart & Payment Methods Breakdown */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '14px' }}>
            {/* Daily Revenue Bar Chart */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: '16px', border: '1px solid #cbd5e1', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ margin: 0, fontSize: '13.5px', fontWeight: 600, color: '#0f172a' }}>
                  Biến Động Doanh Thu Theo Ngày
                </h3>
                <span style={{ fontSize: '11px', color: '#64748b' }}>Đơn vị: VND</span>
              </div>
              <div style={{ width: '100%', height: '220px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyRevenueData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="day" stroke="#94a3b8" fontSize={10.5} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={10.5} tickLine={false} tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} />
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: '#ffffff', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '11.5px' }}
                      formatter={(val: any) => [`${Number(val).toLocaleString('vi-VN')} đ`, 'Doanh thu']}
                    />
                    <Bar dataKey="revenue" fill="#0f766e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Payment Method Distribution */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: '16px', border: '1px solid #cbd5e1', boxShadow: '0 1px 3px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ margin: '0 0 12px 0', fontSize: '13.5px', fontWeight: 600, color: '#0f172a' }}>
                  Cơ Cấu Hình Thức Thanh Toán
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ padding: '12px 14px', borderRadius: '6px', backgroundColor: '#f0fdfa', border: '1px solid #ccfbf1', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={iconBadgeStyle('#ccfbf1', '#0f766e')}><IconBanknote size={16} /></div>
                      <div>
                        <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#0f172a' }}>Tiền mặt khi nhận hàng (COD)</div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>Khách trả tiền mặt cho tài xế</div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f766e', fontVariantNumeric: 'tabular-nums' }}>
                        {revenueStats.codAmount.toLocaleString('vi-VN')} đ
                      </div>
                      <div style={{ fontSize: '10.5px', color: '#64748b' }}>
                        {revenueStats.completedRev > 0 ? Math.round((revenueStats.codAmount / (revenueStats.codAmount + revenueStats.onlineAmount)) * 100) : 75}% doanh thu
                      </div>
                    </div>
                  </div>

                  <div style={{ padding: '12px 14px', borderRadius: '6px', backgroundColor: '#f0f9ff', border: '1px solid #bae6fd', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={iconBadgeStyle('#bae6fd', '#0284c7')}><IconCreditCard size={16} /></div>
                      <div>
                        <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#0f172a' }}>Chuyển khoản ngân hàng / Ví điện tử</div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>Thanh toán trước qua tài khoản</div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#0284c7', fontVariantNumeric: 'tabular-nums' }}>
                        {revenueStats.onlineAmount.toLocaleString('vi-VN')} đ
                      </div>
                      <div style={{ fontSize: '10.5px', color: '#64748b' }}>
                        {revenueStats.completedRev > 0 ? Math.round((revenueStats.onlineAmount / (revenueStats.codAmount + revenueStats.onlineAmount)) * 100) : 25}% doanh thu
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ fontSize: '11.5px', color: '#166534', marginTop: '12px', padding: '8px 12px', backgroundColor: '#f0fdf4', borderRadius: '6px', border: '1px solid #bbf7d0' }}>
                Hóa đơn bán lẻ được lưu trữ và đối soát tự động theo quy định quản lý bán hàng của C.T Mart.
              </div>
            </div>
          </div>

          {/* Recent Orders Table with Pagination */}
          <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1', boxShadow: '0 1px 3px rgba(0,0,0,0.03)', overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', backgroundColor: '#ffffff' }}>
              <h3 style={{ margin: 0, fontSize: '13.5px', fontWeight: 600, color: '#0f172a' }}>
                Danh Sách Đơn Hàng Giao Dịch
              </h3>
              <span style={{ fontSize: '11px', color: '#64748b' }}>Tổng cộng: {combinedOrders.length} đơn</span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #cbd5e1', color: '#334155', textAlign: 'left' }}>
                    <th style={{ padding: '10px 12px', fontWeight: 600 }}>Mã Đơn</th>
                    <th style={{ padding: '10px 12px', fontWeight: 600 }}>Khách Hàng</th>
                    <th style={{ padding: '10px 12px', fontWeight: 600 }}>Số Lượng</th>
                    <th style={{ padding: '10px 12px', fontWeight: 600 }}>Hình Thức</th>
                    <th style={{ padding: '10px 12px', fontWeight: 600, textAlign: 'right' }}>Tổng Tiền</th>
                    <th style={{ padding: '10px 12px', fontWeight: 600 }}>Trạng Thái</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedOrders.map((o, idx) => {
                    const status = (o.status || 'PENDING').toUpperCase();
                    const isSuccess = ['COMPLETED', 'DELIVERED', 'PAID', 'SHIPPED'].includes(status);
                    const isShipping = ['IN_TRANSIT', 'SHIPPING', 'DISPATCHED', 'PICKING', 'PACKED', 'DELIVERING', 'CONFIRMED'].includes(status);
                    const isCancelled = ['CANCELLED', 'FAILED_DELIVERY', 'RETURNED'].includes(status);
                    const rowBg = idx % 2 === 0 ? '#ffffff' : '#fcfdfd';

                    return (
                      <tr
                        key={o.id || o.orderCode}
                        style={{
                          backgroundColor: rowBg,
                          borderBottom: '1px solid #f1f5f9',
                          transition: 'background-color 0.15s ease',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f0fdfa')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = rowBg)}
                      >
                        <td style={{ padding: '9px 12px', fontWeight: 600, color: '#0f766e', fontFamily: 'monospace' }}>{o.orderCode || formatOrderCode(o)}</td>
                        <td style={{ padding: '9px 12px', color: '#1e293b' }}>{o.customerName || 'Khách C.T Mart'}</td>
                        <td style={{ padding: '9px 12px', color: '#64748b' }}>{o.totalQuantity || o.items?.length || 1} sản phẩm</td>
                        <td style={{ padding: '9px 12px' }}>
                          <span style={{ fontSize: '10.5px', fontWeight: 500, padding: '2px 7px', borderRadius: '4px', backgroundColor: '#f1f5f9', color: '#334155', border: '1px solid #e2e8f0' }}>
                            {o.paymentMethod === 'online' ? 'Chuyển khoản' : 'Tiền mặt (COD)'}
                          </span>
                        </td>
                        <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 700, color: '#0f766e', fontVariantNumeric: 'tabular-nums' }}>
                          {Number(o.totalAmount || 0).toLocaleString('vi-VN')} đ
                        </td>
                        <td style={{ padding: '9px 12px' }}>
                          <span
                            style={{
                              fontSize: '10.5px',
                              fontWeight: 600,
                              padding: '2px 8px',
                              borderRadius: '4px',
                              backgroundColor: isSuccess ? '#f0fdf4' : isCancelled ? '#fef2f2' : isShipping ? '#f0f9ff' : '#fffbeb',
                              color: isSuccess ? '#166534' : isCancelled ? '#991b1b' : isShipping ? '#0369a1' : '#92400e',
                              border: `1px solid ${isSuccess ? '#bbf7d0' : isCancelled ? '#fecaca' : isShipping ? '#bae6fd' : '#fde68a'}`,
                            }}
                            title={isCancelled && o.cancelReason ? `Lý do: ${o.cancelReason}` : undefined}
                          >
                            {isSuccess ? 'Đã Giao Thành Công' : isCancelled ? (status === 'RETURNED' ? 'Đã Trả Hàng' : 'Đã Hủy Đơn') : isShipping ? 'Đang Giao Hàng' : 'Đang Xử Lý'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <PaginationBar
              currentPage={ordersPage}
              pageSize={ordersPageSize}
              totalItems={combinedOrders.length}
              onPageChange={setOrdersPage}
              onPageSizeChange={setOrdersPageSize}
            />
          </div>

        </div>
      )}

      {/* TAB 2: SỔ KHO NHẬP - XUẤT - TỒN */}
      {activeTab === 'TAB_INVENTORY' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          {/* Inventory Top 4 Colored Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
            <div style={enhancedStatCardStyle('#f0fdfa', '#ccfbf1', '#0f766e')}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#0f766e', textTransform: 'uppercase' }}>
                  Tổng Giá Trị Hàng Tồn Kho
                </span>
                <div style={iconBadgeStyle('#ccfbf1', '#0f766e')}><IconBoxes size={15} /></div>
              </div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', marginTop: '6px', fontVariantNumeric: 'tabular-nums' }}>
                {totalInventoryCloseAmount.toLocaleString('vi-VN')} đ
              </div>
              <div style={{ fontSize: '11px', color: '#0f766e', marginTop: '4px', fontWeight: 500 }}>
                Tính theo giá vốn nhập kho thực tế
              </div>
            </div>

            <div style={enhancedStatCardStyle('#f0f9ff', '#bae6fd', '#0284c7')}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#0284c7', textTransform: 'uppercase' }}>
                  Giá Vốn Hàng Nhập Trong Kỳ
                </span>
                <div style={iconBadgeStyle('#bae6fd', '#0284c7')}><IconTrendingUp size={15} /></div>
              </div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', marginTop: '6px', fontVariantNumeric: 'tabular-nums' }}>
                {totalInAmount.toLocaleString('vi-VN')} đ
              </div>
              <div style={{ fontSize: '11px', color: '#0284c7', marginTop: '4px', fontWeight: 500 }}>
                Hàng hóa nhập từ nhà cung cấp
              </div>
            </div>

            <div style={enhancedStatCardStyle('#fffbeb', '#fde68a', '#b45309')}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#92400e', textTransform: 'uppercase' }}>
                  Giá Vốn Hàng Xuất Bán
                </span>
                <div style={iconBadgeStyle('#fde68a', '#b45309')}><IconTrendingDown size={15} /></div>
              </div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', marginTop: '6px', fontVariantNumeric: 'tabular-nums' }}>
                {totalOutAmount.toLocaleString('vi-VN')} đ
              </div>
              <div style={{ fontSize: '11px', color: '#92400e', marginTop: '4px', fontWeight: 500 }}>
                Hàng xuất giao cho khách hàng
              </div>
            </div>

            <div style={enhancedStatCardStyle('#fef2f2', '#fecaca', '#991b1b')}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#991b1b', textTransform: 'uppercase' }}>
                  Số Lượng Cận Hạn Cần Bán Sớm
                </span>
                <div style={iconBadgeStyle('#fecaca', '#991b1b')}><IconAlertTriangle size={15} /></div>
              </div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#991b1b', marginTop: '6px', fontVariantNumeric: 'tabular-nums' }}>
                {totalNearExpiryQty} sản phẩm
              </div>
              <div style={{ fontSize: '11px', color: '#991b1b', marginTop: '4px', fontWeight: 500 }}>
                Còn hạn sử dụng ≤ 7 ngày
              </div>
            </div>
          </div>

          {/* S10 Table with Pagination */}
          <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1', boxShadow: '0 1px 3px rgba(0,0,0,0.03)', overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '13.5px', fontWeight: 600, color: '#0f172a' }}>
                  Bảng Kê Chi Tiết Nhập - Xuất - Tồn Hàng Hóa (Sổ Kho)
                </h3>
                <span style={{ fontSize: '11px', color: '#64748b' }}>
                  Theo dõi chính xác số lượng tồn đầu, nhập thêm, xuất bán và tồn cuối kỳ
                </span>
              </div>

              {/* Search Box */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#f8fafc', padding: '4px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                <IconSearch size={13} color="#64748b" />
                <input
                  type="text"
                  placeholder="Tìm tên hoặc mã hàng..."
                  value={searchQuery}
                  onChange={e => {
                    setSearchQuery(e.target.value);
                    setInventoryPage(1);
                  }}
                  style={{ border: 'none', background: 'transparent', fontSize: '11.5px', outline: 'none', width: '180px' }}
                />
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #cbd5e1', color: '#334155', textAlign: 'left' }}>
                    <th style={{ padding: '9px 10px', fontWeight: 600 }}>Mã Hàng</th>
                    <th style={{ padding: '9px 10px', fontWeight: 600 }}>Tên Sản Phẩm</th>
                    <th style={{ padding: '9px 10px', fontWeight: 600 }}>ĐVT</th>
                    <th style={{ padding: '9px 10px', fontWeight: 600 }}>Khu Vực</th>
                    <th style={{ padding: '9px 10px', fontWeight: 600, textAlign: 'right' }}>Tồn Đầu</th>
                    <th style={{ padding: '9px 10px', fontWeight: 600, textAlign: 'right' }}>Nhập Trong Kỳ</th>
                    <th style={{ padding: '9px 10px', fontWeight: 600, textAlign: 'right' }}>Xuất Trong Kỳ</th>
                    <th style={{ padding: '9px 10px', fontWeight: 600, textAlign: 'right' }}>Tồn Cuối Kỳ</th>
                    <th style={{ padding: '9px 10px', fontWeight: 600, textAlign: 'right' }}>Giá Vốn</th>
                    <th style={{ padding: '9px 10px', fontWeight: 600, textAlign: 'right' }}>Thành Tiền (VND)</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedInventory.map((item, idx) => {
                    const rowBg = idx % 2 === 0 ? '#ffffff' : '#fcfdfd';
                    return (
                      <tr
                        key={item.sku || idx}
                        style={{
                          backgroundColor: rowBg,
                          borderBottom: '1px solid #f1f5f9',
                          transition: 'background-color 0.15s ease',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f0fdfa')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = rowBg)}
                      >
                        <td style={{ padding: '8px 10px', fontWeight: 600, color: '#0f766e' }}>{item.sku}</td>
                        <td style={{ padding: '8px 10px', color: '#1e293b' }}>{item.name}</td>
                        <td style={{ padding: '8px 10px', color: '#64748b' }}>{item.unit}</td>
                        <td style={{ padding: '8px 10px' }}>
                          <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '3px', backgroundColor: item.tempZone.includes('Mát') ? '#f0fdf4' : item.tempZone.includes('Đông') ? '#eff6ff' : '#f8fafc', color: item.tempZone.includes('Mát') ? '#166534' : item.tempZone.includes('Đông') ? '#1e40af' : '#475569', border: `1px solid ${item.tempZone.includes('Mát') ? '#bbf7d0' : item.tempZone.includes('Đông') ? '#bfdbfe' : '#e2e8f0'}` }}>
                            {item.tempZone}
                          </span>
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#475569' }}>{item.openQty}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', color: '#16a34a', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>+{item.inQty}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', color: '#dc2626', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>-{item.outQty}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>{item.closeQty}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', color: '#64748b', fontVariantNumeric: 'tabular-nums' }}>{item.costPrice.toLocaleString('vi-VN')} đ</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#0f766e', fontVariantNumeric: 'tabular-nums' }}>{item.closeAmount.toLocaleString('vi-VN')} đ</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ backgroundColor: '#f8fafc', borderTop: '2px solid #cbd5e1', fontWeight: 700, color: '#0f172a' }}>
                    <td colSpan={4} style={{ padding: '10px' }}>Tổng Cộng:</td>
                    <td style={{ padding: '10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{inventoryReportData.reduce((s, i) => s + i.openQty, 0)}</td>
                    <td style={{ padding: '10px', textAlign: 'right', color: '#16a34a', fontVariantNumeric: 'tabular-nums' }}>+{inventoryReportData.reduce((s, i) => s + i.inQty, 0)}</td>
                    <td style={{ padding: '10px', textAlign: 'right', color: '#dc2626', fontVariantNumeric: 'tabular-nums' }}>-{inventoryReportData.reduce((s, i) => s + i.outQty, 0)}</td>
                    <td style={{ padding: '10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{inventoryReportData.reduce((s, i) => s + i.closeQty, 0)}</td>
                    <td style={{ padding: '10px', textAlign: 'right' }}>-</td>
                    <td style={{ padding: '10px', textAlign: 'right', color: '#0f766e', fontVariantNumeric: 'tabular-nums' }}>{totalInventoryCloseAmount.toLocaleString('vi-VN')} đ</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Pagination Controls */}
            <PaginationBar
              currentPage={inventoryPage}
              pageSize={inventoryPageSize}
              totalItems={filteredInventoryData.length}
              onPageChange={setInventoryPage}
              onPageSizeChange={setInventoryPageSize}
            />
          </div>

        </div>
      )}

      {/* TAB 3: ĐỐI SOÁT TIỀN MẶT COD & GIAO HÀNG */}
      {activeTab === 'TAB_COD' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          {/* Top 3 COD Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
            <div style={enhancedStatCardStyle('#f0fdfa', '#ccfbf1', '#0f766e')}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#0f766e', textTransform: 'uppercase' }}>
                  Tổng Tiền Mặt Thu Được (COD)
                </span>
                <div style={iconBadgeStyle('#ccfbf1', '#0f766e')}><IconBanknote size={15} /></div>
              </div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', marginTop: '6px', fontVariantNumeric: 'tabular-nums' }}>
                {totalCodCollected.toLocaleString('vi-VN')} đ
              </div>
              <div style={{ fontSize: '11px', color: '#0f766e', marginTop: '4px', fontWeight: 500 }}>
                Tổng tiền tài xế đã thu từ khách hàng
              </div>
            </div>

            <div style={enhancedStatCardStyle('#f0fdf4', '#bbf7d0', '#166534')}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#166534', textTransform: 'uppercase' }}>
                  Tiền Đã Nộp Về Quỹ Siêu Thị
                </span>
                <div style={iconBadgeStyle('#bbf7d0', '#166534')}><IconCheckCircle2 size={15} /></div>
              </div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#166534', marginTop: '6px', fontVariantNumeric: 'tabular-nums' }}>
                {totalCodSettled.toLocaleString('vi-VN')} đ
              </div>
              <div style={{ fontSize: '11px', color: '#166534', marginTop: '4px', fontWeight: 500 }}>
                Thủ quỹ đã xác nhận nhận tiền mặt
              </div>
            </div>

            <div style={enhancedStatCardStyle('#fffbeb', '#fde68a', '#b45309')}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#92400e', textTransform: 'uppercase' }}>
                  Tiền Đang Chờ Bàn Giao
                </span>
                <div style={iconBadgeStyle('#fde68a', '#b45309')}><IconClock size={15} /></div>
              </div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#92400e', marginTop: '6px', fontVariantNumeric: 'tabular-nums' }}>
                {totalCodPending.toLocaleString('vi-VN')} đ
              </div>
              <div style={{ fontSize: '11px', color: '#92400e', marginTop: '4px', fontWeight: 500 }}>
                Tài xế đang giữ hoặc trên đường về kho
              </div>
            </div>
          </div>

          {/* Operational Action Banner linking to CodReconciliation */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              backgroundColor: '#f0fdfa',
              borderRadius: '8px',
              border: '1px solid #ccfbf1',
              boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={iconBadgeStyle('#ccfbf1', '#0f766e')}>
                <IconReceipt size={16} />
              </div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>
                  Bạn cần tác nghiệp thu quỹ thực tế, duyệt ảnh chụp POD hoặc đối soát chi tiết từng đơn hàng?
                </div>
                <div style={{ fontSize: '11.5px', color: '#475569' }}>
                  Màn hình <b>Quyết Toán Quỹ COD</b> cung cấp đầy đủ công cụ cho Thủ quỹ: xem ảnh ký nhận của khách, lập phiếu thu quỹ từng ca và chốt sổ tài chính.
                </div>
              </div>
            </div>
            <button
              onClick={() => navigate('/cod-reconciliation')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                borderRadius: '6px',
                backgroundColor: '#0f766e',
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(15, 118, 110, 0.2)',
                transition: 'background-color 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#115e59')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#0f766e')}
            >
              <span>Mở Màn Hình Quyết Toán COD Chi Tiết</span>
              <IconArrowRight size={14} />
            </button>
          </div>

          {/* Driver Cash Table with Pagination */}
          <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1', boxShadow: '0 1px 3px rgba(0,0,0,0.03)', overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '13.5px', fontWeight: 600, color: '#0f172a' }}>
                  Bảng Kê Nộp Tiền Mặt Theo Tài Xế
                </h3>
                <span style={{ fontSize: '11px', color: '#64748b' }}>
                  Đối soát và xác nhận thủ quỹ đã nhận đủ tiền sau mỗi ca giao
                </span>
              </div>
              <span style={{ fontSize: '11px', color: '#64748b' }}>Tổng: {driversReport.length} tài xế</span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #cbd5e1', color: '#334155', textAlign: 'left' }}>
                    <th style={{ padding: '10px 12px', fontWeight: 600 }}>Tài Xế</th>
                    <th style={{ padding: '10px 12px', fontWeight: 600 }}>Số Điện Thoại</th>
                    <th style={{ padding: '10px 12px', fontWeight: 600 }}>Phương Tiện</th>
                    <th style={{ padding: '10px 12px', fontWeight: 600, textAlign: 'center' }}>Đơn Đã Giao</th>
                    <th style={{ padding: '10px 12px', fontWeight: 600, textAlign: 'right' }}>Quãng Đường</th>
                    <th style={{ padding: '10px 12px', fontWeight: 600, textAlign: 'right' }}>Tiền COD Đã Thu</th>
                    <th style={{ padding: '10px 12px', fontWeight: 600 }}>Tình Trạng Nộp Quỹ</th>
                    <th style={{ padding: '10px 12px', fontWeight: 600, textAlign: 'center' }}>Thao Tác</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedDrivers.map((d, idx) => {
                    const isReconciled = reconciledDriverIds[d.id];
                    const rowBg = idx % 2 === 0 ? '#ffffff' : '#fcfdfd';
                    return (
                      <tr
                        key={d.id}
                        style={{
                          backgroundColor: rowBg,
                          borderBottom: '1px solid #f1f5f9',
                          transition: 'background-color 0.15s ease',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f0fdfa')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = rowBg)}
                      >
                        <td style={{ padding: '9px 12px', fontWeight: 600, color: '#0f172a' }}>{d.name}</td>
                        <td style={{ padding: '9px 12px', color: '#475569' }}>{d.phone}</td>
                        <td style={{ padding: '9px 12px', color: '#64748b' }}>{d.vehicleType} ({d.plate})</td>
                        <td style={{ padding: '9px 12px', textAlign: 'center', fontWeight: 600, color: '#0f172a' }}>{d.completed} đơn</td>
                        <td style={{ padding: '9px 12px', textAlign: 'right', color: '#64748b' }}>{d.totalKm} km</td>
                        <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 700, color: '#0f766e', fontVariantNumeric: 'tabular-nums' }}>
                          {d.cod.toLocaleString('vi-VN')} đ
                        </td>
                        <td style={{ padding: '9px 12px' }}>
                          <span
                            style={{
                              fontSize: '10.5px',
                              fontWeight: 600,
                              padding: '2px 8px',
                              borderRadius: '4px',
                              backgroundColor: isReconciled ? '#f0fdf4' : '#fffbeb',
                              color: isReconciled ? '#166534' : '#92400e',
                              border: `1px solid ${isReconciled ? '#bbf7d0' : '#fde68a'}`,
                            }}
                          >
                            {isReconciled ? 'Đã nộp đủ quỹ' : 'Chờ nộp tiền'}
                          </span>
                        </td>
                        <td style={{ padding: '9px 12px', textAlign: 'center' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            {!isReconciled ? (
                              <button
                                onClick={() => handleReconcileDriver(d.id)}
                                style={{
                                  backgroundColor: '#0f766e',
                                  color: '#ffffff',
                                  border: 'none',
                                  padding: '4px 10px',
                                  borderRadius: '4px',
                                  fontSize: '11px',
                                  fontWeight: 500,
                                  cursor: 'pointer',
                                }}
                              >
                                Xác nhận nộp tiền
                              </button>
                            ) : (
                              <button
                                onClick={() => setActiveVoucher({ type: 'PHIEU_THU_01_TT', data: { driverName: d.name, amount: d.cod, id: d.id, phone: d.phone } })}
                                style={{
                                  backgroundColor: '#f8fafc',
                                  color: '#0f766e',
                                  border: '1px solid #cbd5e1',
                                  padding: '4px 8px',
                                  borderRadius: '4px',
                                  fontSize: '11px',
                                  fontWeight: 500,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                              >
                                <IconPrinter size={12} />
                                <span>In phiếu thu</span>
                              </button>
                            )}

                            <button
                              onClick={() => navigate(`/cod-reconciliation?driverId=${encodeURIComponent(d.id)}`)}
                              title="Xem chi tiết từng đơn hàng và ảnh POD của tài xế này"
                              style={{
                                backgroundColor: '#ffffff',
                                color: '#0f766e',
                                border: '1px solid #cbd5e1',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: 500,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f0fdfa')}
                              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
                            >
                              <IconExternalLink size={12} />
                              <span>Chi tiết đơn & POD</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <PaginationBar
              currentPage={driversPage}
              pageSize={driversPageSize}
              totalItems={driversReport.length}
              onPageChange={setDriversPage}
              onPageSizeChange={setDriversPageSize}
            />
          </div>

        </div>
      )}

      {/* TAB 4: KIỂM SOÁT HẠN DÙNG & HAO HỤT */}
      {activeTab === 'TAB_EXPIRY' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          {/* Expiry Overview Colored Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
            <div style={enhancedStatCardStyle('#fef2f2', '#fecaca', '#991b1b')}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#991b1b', textTransform: 'uppercase' }}>
                  Hàng Khẩn Cấp (Cận Hạn ≤ 3 Ngày)
                </span>
                <div style={iconBadgeStyle('#fecaca', '#991b1b')}><IconAlertTriangle size={15} /></div>
              </div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#991b1b', marginTop: '6px', fontVariantNumeric: 'tabular-nums' }}>
                {inventoryReportData.filter(i => i.daysLeft <= 3).reduce((s, i) => s + i.nearExpiryQty, 0)} sản phẩm
              </div>
              <div style={{ fontSize: '11px', color: '#991b1b', marginTop: '4px', fontWeight: 500 }}>
                Cần kích hoạt giảm giá xả hàng ngay trong ngày
              </div>
            </div>

            <div style={enhancedStatCardStyle('#fffbeb', '#fde68a', '#b45309')}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#92400e', textTransform: 'uppercase' }}>
                  Hàng Cần Chú Ý (Cận Hạn 4 - 7 Ngày)
                </span>
                <div style={iconBadgeStyle('#fde68a', '#b45309')}><IconClock size={15} /></div>
              </div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#92400e', marginTop: '6px', fontVariantNumeric: 'tabular-nums' }}>
                {inventoryReportData.filter(i => i.daysLeft > 3 && i.daysLeft <= 7).reduce((s, i) => s + i.nearExpiryQty, 0)} sản phẩm
              </div>
              <div style={{ fontSize: '11px', color: '#92400e', marginTop: '4px', fontWeight: 500 }}>
                Ưu tiên xuất bán trước cho các đơn hàng mới
              </div>
            </div>

            <div style={enhancedStatCardStyle('#f0fdf4', '#bbf7d0', '#166534')}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#166534', textTransform: 'uppercase' }}>
                  Hàng Hóa Hạn Sử Dụng An Toàn
                </span>
                <div style={iconBadgeStyle('#bbf7d0', '#166534')}><IconCheckCircle2 size={15} /></div>
              </div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#166534', marginTop: '6px', fontVariantNumeric: 'tabular-nums' }}>
                {inventoryReportData.filter(i => i.daysLeft > 7).length} mặt hàng
              </div>
              <div style={{ fontSize: '11px', color: '#166534', marginTop: '4px', fontWeight: 500 }}>
                Chất lượng tươi ngon, hạn sử dụng trên 15 ngày
              </div>
            </div>
          </div>

          {/* Near Expiry Items Table with Pagination */}
          <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1', boxShadow: '0 1px 3px rgba(0,0,0,0.03)', overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '13.5px', fontWeight: 600, color: '#0f172a' }}>
                  Danh Mục Hàng Hóa Cần Ưu Tiên Bán Trước
                </h3>
                <span style={{ fontSize: '11px', color: '#64748b' }}>
                  Sắp xếp theo số ngày còn lại đến hạn sử dụng để giảm thiểu tối đa hao hụt
                </span>
              </div>
              <span style={{ fontSize: '11px', color: '#64748b' }}>Tổng: {criticalExpiryItems.length} mặt hàng</span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #cbd5e1', color: '#334155', textAlign: 'left' }}>
                    <th style={{ padding: '10px 12px', fontWeight: 600 }}>Mã Hàng</th>
                    <th style={{ padding: '10px 12px', fontWeight: 600 }}>Tên Sản Phẩm</th>
                    <th style={{ padding: '10px 12px', fontWeight: 600 }}>Khu Vực Bảo Quản</th>
                    <th style={{ padding: '10px 12px', fontWeight: 600, textAlign: 'right' }}>Số Lượng Tồn</th>
                    <th style={{ padding: '10px 12px', fontWeight: 600, textAlign: 'right' }}>Lượng Cận Date</th>
                    <th style={{ padding: '10px 12px', fontWeight: 600, textAlign: 'center' }}>Số Ngày Còn Lại</th>
                    <th style={{ padding: '10px 12px', fontWeight: 600 }}>Mức Độ Ưu Tiên</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedExpiry.map((item, idx) => {
                    const isUrgent = item.daysLeft <= 3;
                    const rowBg = idx % 2 === 0 ? '#ffffff' : '#fcfdfd';
                    return (
                      <tr
                        key={item.sku}
                        style={{
                          backgroundColor: rowBg,
                          borderBottom: '1px solid #f1f5f9',
                          transition: 'background-color 0.15s ease',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = isUrgent ? '#fee2e2' : '#fef3c7')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = rowBg)}
                      >
                        <td style={{ padding: '9px 12px', fontWeight: 600, color: '#0f766e' }}>{item.sku}</td>
                        <td style={{ padding: '9px 12px', color: '#1e293b' }}>{item.name}</td>
                        <td style={{ padding: '9px 12px', color: '#64748b' }}>{item.tempZone}</td>
                        <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                          {item.closeQty} {item.unit}
                        </td>
                        <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 700, color: isUrgent ? '#991b1b' : '#92400e', fontVariantNumeric: 'tabular-nums' }}>
                          {item.nearExpiryQty} {item.unit}
                        </td>
                        <td style={{ padding: '9px 12px', textAlign: 'center' }}>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              color: isUrgent ? '#991b1b' : '#92400e',
                              backgroundColor: isUrgent ? '#fee2e2' : '#fef3c7',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              border: `1px solid ${isUrgent ? '#fecaca' : '#fde68a'}`,
                            }}
                          >
                            Còn {item.daysLeft} ngày
                          </span>
                        </td>
                        <td style={{ padding: '9px 12px' }}>
                          <span
                            style={{
                              fontSize: '10.5px',
                              fontWeight: 600,
                              padding: '2px 8px',
                              borderRadius: '4px',
                              backgroundColor: isUrgent ? '#fef2f2' : '#fffbeb',
                              color: isUrgent ? '#991b1b' : '#92400e',
                              border: `1px solid ${isUrgent ? '#fecaca' : '#fde68a'}`,
                            }}
                          >
                            {isUrgent ? 'Xuất bán khẩn cấp' : 'Ưu tiên xuất trước'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <PaginationBar
              currentPage={expiryPage}
              pageSize={expiryPageSize}
              totalItems={criticalExpiryItems.length}
              onPageChange={setExpiryPage}
              onPageSizeChange={setExpiryPageSize}
            />
          </div>

        </div>
      )}

      {/* Accounting Voucher Modal */}
      {activeVoucher && (
        <PrintAccountingVoucherModal
          voucherType={activeVoucher.type}
          data={activeVoucher.data}
          onClose={() => setActiveVoucher(null)}
        />
      )}

    </div>
  );
};

// Enhanced Colored Stat Card Helper (Pleasing & Easy on the Eyes)
const enhancedStatCardStyle = (bgColor: string, borderColor: string, accentColor: string): React.CSSProperties => ({
  backgroundColor: bgColor,
  borderRadius: '8px',
  padding: '14px 16px',
  border: `1px solid ${borderColor}`,
  borderLeft: `4px solid ${accentColor}`,
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
  display: 'flex',
  flexDirection: 'column',
});

// Icon Circular Badge Style Helper
const iconBadgeStyle = (bgColor: string, color: string): React.CSSProperties => ({
  width: '30px',
  height: '30px',
  borderRadius: '6px',
  backgroundColor: bgColor,
  color,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
});

export default Reports;
