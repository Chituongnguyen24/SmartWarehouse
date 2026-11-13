import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Receipt,
  Calendar,
  Filter,
  Download,
  RefreshCw,
  Printer,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Truck,
  Wallet,
  DollarSign,
  Search,
  ArrowUpDown,
  User,
  MapPin,
  Camera,
  Check,
  X,
  CreditCard,
  FileText,
  Building2,
  Percent,
  CheckSquare,
  Square,
  ChevronRight,
  ExternalLink,
  ArrowLeft,
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/features/auth';
import { useWarehouse } from '@/shared';
import { PrintAccountingVoucherModal } from '../components/PrintAccountingVoucherModal';

const ORDER_API = 'http://localhost:3004/orders';

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
        Hiển thị <b style={{ color: '#0f172a' }}>{startItem}</b> - <b style={{ color: '#0f172a' }}>{endItem}</b> trong tổng số <b style={{ color: '#0f172a' }}>{totalItems}</b> đơn hàng
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: '#64748b' }}>
          <span>Số đơn/trang:</span>
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
            <option value={10}>10 đơn</option>
            <option value={20}>20 đơn</option>
            <option value={50}>50 đơn</option>
          </select>
        </div>

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

export interface DriverCodSummary {
  id: string;
  name: string;
  phone: string;
  plate: string;
  vehicleType: string;
  warehouseCode: string;
  warehouseName: string;
  totalOrdersCount: number;
  completedOrdersCount: number;
  failedOrdersCount: number;
  codCollected: number;
  codSettled: number;
  remainingCod: number;
  status: 'SETTLED' | 'PENDING';
  lastSettlementDate: string | null;
}

export interface DetailedCodOrder {
  id: string;
  orderCode: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  assignedDriverId: string;
  assignedDriverName: string;
  assignedDriverPhone: string;
  assignedWarehouseCode: string;
  totalAmount: number;
  codAmount: number;
  paymentMethod: string;
  orderStatus: string;
  codSettledStatus: string;
  codSettledAt: string | null;
  podPhotoUrl: string | null;
  completedAt: string;
  createdAt: string;
}

export const CodReconciliation: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const driverIdParam = searchParams.get('driverId');

  const { user } = useAuth();
  const { warehouses, selectedWarehouseCode } = useWarehouse();

  // ── 1. Filter States ──
  const [datePreset, setDatePreset] = useState<'TODAY' | 'YESTERDAY' | 'LAST_7_DAYS' | 'THIS_MONTH' | 'ALL' | 'CUSTOM'>('TODAY');
  
  const getTodayStr = () => new Date().toISOString().slice(0, 10);
  const getYesterdayStr = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  };
  const getDaysAgoStr = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().slice(0, 10);
  };
  const getFirstDayOfMonthStr = () => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
  };

  const [startDate, setStartDate] = useState<string>(getTodayStr());
  const [endDate, setEndDate] = useState<string>(getTodayStr());

  const isManager = user?.role === 'WAREHOUSE_MANAGER' || user?.role === 'WAREHOUSE_STAFF';
  const myWarehouseCode = user?.warehouseCode || 'WH-006';

  const [selectedWarehouse, setSelectedWarehouse] = useState<string>(() => {
    if (isManager) return myWarehouseCode;
    return selectedWarehouseCode || 'ALL';
  });

  const [selectedDriver, setSelectedDriver] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<'ALL' | 'PENDING' | 'SETTLED'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // ── 2. Data States ──
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [reportData, setReportData] = useState<{
    summary: {
      totalCodCollected: number;
      totalSettled: number;
      totalRemaining: number;
      totalCodOrders: number;
      settledOrdersCount: number;
      pendingOrdersCount: number;
      settlementRate: number;
    };
    drivers: DriverCodSummary[];
    orders: DetailedCodOrder[];
    settlements: any[];
  }>({
    summary: {
      totalCodCollected: 0,
      totalSettled: 0,
      totalRemaining: 0,
      totalCodOrders: 0,
      settledOrdersCount: 0,
      pendingOrdersCount: 0,
      settlementRate: 100,
    },
    drivers: [],
    orders: [],
    settlements: [],
  });

  // Selected driver for drill-down table
  const [activeDriverFilter, setActiveDriverFilter] = useState<string | null>(driverIdParam || null);

  useEffect(() => {
    if (driverIdParam) {
      setActiveDriverFilter(driverIdParam);
    }
  }, [driverIdParam]);

  // Pagination for Detailed Orders Table
  const [orderPage, setOrderPage] = useState<number>(1);
  const [orderPageSize, setOrderPageSize] = useState<number>(10);

  // Modal States
  const [activeVoucher, setActiveVoucher] = useState<{ type: 'PHIEU_THU_01_TT'; data: any } | null>(null);
  const [settleModalDriver, setSettleModalDriver] = useState<DriverCodSummary | null>(null);
  const [settleAmountInput, setSettleAmountInput] = useState<string>('');
  const [settleMethodInput, setSettleMethodInput] = useState<'CASH_TO_TREASURER' | 'VIETQR_TRANSFER'>('CASH_TO_TREASURER');
  const [settleNotesInput, setSettleNotesInput] = useState<string>('');
  const [isSubmittingSettle, setIsSubmittingSettle] = useState<boolean>(false);
  const [podPhotoModalUrl, setPodPhotoModalUrl] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // ── 3. Handle Date Presets ──
  const handleSelectDatePreset = (preset: typeof datePreset) => {
    setDatePreset(preset);
    const today = getTodayStr();

    switch (preset) {
      case 'TODAY':
        setStartDate(today);
        setEndDate(today);
        break;
      case 'YESTERDAY': {
        const yest = getYesterdayStr();
        setStartDate(yest);
        setEndDate(yest);
        break;
      }
      case 'LAST_7_DAYS':
        setStartDate(getDaysAgoStr(7));
        setEndDate(today);
        break;
      case 'THIS_MONTH':
        setStartDate(getFirstDayOfMonthStr());
        setEndDate(today);
        break;
      case 'ALL':
        setStartDate('');
        setEndDate('');
        break;
      case 'CUSTOM':
        // Keep current custom inputs
        break;
    }
  };

  // ── 4. Fetch COD Report Data from API ──
  const fetchReportData = useCallback(async (showSpinner = false) => {
    if (showSpinner) setIsRefreshing(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (selectedWarehouse && selectedWarehouse !== 'ALL') params.append('warehouseCode', selectedWarehouse);
      if (selectedDriver && selectedDriver !== 'ALL') params.append('driverId', selectedDriver);
      if (selectedStatus && selectedStatus !== 'ALL') params.append('status', selectedStatus);

      const url = `${ORDER_API}/cod-reconciliation?${params.toString()}`;
      const res = await fetch(url).catch(() => null);

      if (res && res.ok) {
        const data = await res.json();
        if (Array.isArray(data.orders)) {
          data.orders = data.orders.map((o: any) => ({
            ...o,
            orderCode: o.orderCode || (o.id && o.id.length > 15 ? `ECOMM-${o.id.slice(0, 8).toUpperCase()}` : (o.id || 'ORD-01')),
          }));
        }
        setReportData(data);
      } else {
        // Fallback to driver-cod/summary if reconciliation endpoint fails
        const fallbackRes = await fetch(`${ORDER_API}/driver-cod/summary?driverId=NV-GV05&date=${startDate || getTodayStr()}`).catch(() => null);
        if (fallbackRes && fallbackRes.ok) {
          const fb = await fallbackRes.json();
          setReportData({
            summary: {
              totalCodCollected: fb.totalCodCollected || 0,
              totalSettled: fb.totalSettled || 0,
              totalRemaining: fb.remainingCod || 0,
              totalCodOrders: fb.orders?.length || 0,
              settledOrdersCount: fb.orders?.filter((o: any) => o.codSettledStatus === 'SETTLED')?.length || 0,
              pendingOrdersCount: fb.orders?.filter((o: any) => o.codSettledStatus !== 'SETTLED')?.length || 0,
              settlementRate: fb.totalCodCollected > 0 ? Number(((fb.totalSettled / fb.totalCodCollected) * 100).toFixed(1)) : 100,
            },
            drivers: [
              {
                id: 'NV-GV05',
                name: 'Võ Minh Trí',
                phone: '0977 112 233',
                plate: '59-V1 888.99',
                vehicleType: 'Xe Máy Thùng Lạnh',
                warehouseCode: 'WH-006',
                warehouseName: 'Kho Gò Vấp',
                totalOrdersCount: fb.totalAssignedOrders || 0,
                completedOrdersCount: fb.completedOrdersCount || 0,
                failedOrdersCount: fb.failedOrdersCount || 0,
                codCollected: fb.totalCodCollected || 0,
                codSettled: fb.totalSettled || 0,
                remainingCod: fb.remainingCod || 0,
                status: (fb.remainingCod || 0) <= 0 ? 'SETTLED' : 'PENDING',
                lastSettlementDate: null,
              },
              {
                id: 'NV-TK01',
                name: 'Đặng Hoàng Phúc',
                phone: '0944 778 899',
                plate: '51D-892.45',
                vehicleType: 'Xe Tải Lạnh 2.5 Tấn',
                warehouseCode: 'WH-006',
                warehouseName: 'Kho Gò Vấp',
                totalOrdersCount: 6,
                completedOrdersCount: 6,
                failedOrdersCount: 0,
                codCollected: 0,
                codSettled: 0,
                remainingCod: 0,
                status: 'SETTLED',
                lastSettlementDate: null,
              },
              {
                id: 'NV-VAN01',
                name: 'Phan Hữu Nam',
                phone: '0918 776 655',
                plate: '51C-734.12',
                vehicleType: 'Xe Bán Tải 1.5 Tấn',
                warehouseCode: 'WH-006',
                warehouseName: 'Kho Gò Vấp',
                totalOrdersCount: 8,
                completedOrdersCount: 8,
                failedOrdersCount: 0,
                codCollected: 1250000,
                codSettled: 1250000,
                remainingCod: 0,
                status: 'SETTLED',
                lastSettlementDate: null,
              },
            ],
            orders: fb.orders || [],
            settlements: fb.settlements || [],
          });
        }
      }
    } catch (err) {
      console.warn('Failed to fetch COD reconciliation report:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [startDate, endDate, selectedWarehouse, selectedDriver, selectedStatus]);

  useEffect(() => {
    fetchReportData(true);
  }, [fetchReportData]);

  // Periodic polling every 10s for real-time cashier sync
  useEffect(() => {
    const timer = setInterval(() => {
      fetchReportData(false);
    }, 10000);
    return () => clearInterval(timer);
  }, [fetchReportData]);

  // ── 5. Filtering Detailed Orders ──
  const filteredOrders = useMemo(() => {
    let list = reportData.orders || [];

    if (activeDriverFilter) {
      list = list.filter(o => o.assignedDriverId === activeDriverFilter || o.assignedDriverName?.includes(activeDriverFilter));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(o =>
        o.orderCode.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.customerPhone.includes(q) ||
        o.customerAddress.toLowerCase().includes(q) ||
        o.assignedDriverName.toLowerCase().includes(q)
      );
    }

    return list;
  }, [reportData.orders, activeDriverFilter, searchQuery]);

  const paginatedOrders = useMemo(() => {
    const start = (orderPage - 1) * orderPageSize;
    return filteredOrders.slice(start, start + orderPageSize);
  }, [filteredOrders, orderPage, orderPageSize]);

  // ── 6. Handle Cashier Settlement Confirmation ──
  const handleOpenSettleModal = (driver: DriverCodSummary) => {
    setSettleModalDriver(driver);
    setSettleAmountInput(driver.remainingCod.toString());
    setSettleMethodInput('CASH_TO_TREASURER');
    setSettleNotesInput(`Thu tiền mặt nộp quỹ thu ngân ca ngày ${startDate || getTodayStr()}`);
  };

  const handleConfirmCashierSettlement = async () => {
    if (!settleModalDriver) return;
    const amount = Number(settleAmountInput);
    if (isNaN(amount) || amount <= 0) {
      alert('Vui lòng nhập số tiền nộp quỹ hợp lệ lớn hơn 0đ.');
      return;
    }

    setIsSubmittingSettle(true);
    try {
      const res = await fetch(`${ORDER_API}/driver-cod/settle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driverId: settleModalDriver.id,
          driverName: settleModalDriver.name,
          warehouseCode: settleModalDriver.warehouseCode,
          shiftDate: startDate || getTodayStr(),
          amount,
          paymentMethod: settleMethodInput,
          notes: settleNotesInput || 'Xác nhận thu ngân nộp quỹ tiền mặt COD',
        }),
      });

      if (res.ok) {
        showToast(`Đã ghi nhận nộp quỹ ${amount.toLocaleString('vi-VN')}đ cho tài xế ${settleModalDriver.name}`);
        setSettleModalDriver(null);
        fetchReportData(false);
      } else {
        alert('Lỗi máy chủ khi ghi nhận nộp quỹ. Vui lòng kiểm tra lại.');
      }
    } catch (e) {
      alert('Không thể kết nối đến máy chủ.');
    } finally {
      setIsSubmittingSettle(false);
    }
  };

  // ── 7. Export to CSV ──
  const handleExportCSV = () => {
    const headers = [
      'Mã Đơn Hàng',
      'Ngày Hoàn Tất',
      'Khách Hàng',
      'Số Điện Thoại',
      'Địa Chỉ Giao Hàng',
      'Tài Xế Phụ Trách',
      'Mã Tài Xế',
      'Kho Xuất Phát',
      'Số Tiền COD (VNĐ)',
      'Phương Thức',
      'Trạng Thái Nộp Quỹ',
    ];

    const rows = filteredOrders.map(o => [
      `"${o.orderCode}"`,
      `"${new Date(o.completedAt || o.createdAt).toLocaleString('vi-VN')}"`,
      `"${o.customerName}"`,
      `"${o.customerPhone}"`,
      `"${o.customerAddress.replace(/"/g, '""')}"`,
      `"${o.assignedDriverName}"`,
      `"${o.assignedDriverId}"`,
      `"${o.assignedWarehouseCode}"`,
      o.codAmount,
      `"${o.paymentMethod}"`,
      `"${o.codSettledStatus === 'SETTLED' ? 'Đã Nộp Quỹ' : 'Chờ Nộp Quỹ'}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Bang_Ke_Doi_Soat_COD_${startDate || 'Toan_Bo'}_den_${endDate || 'Hien_Tai'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ padding: '24px 32px', backgroundColor: '#f8fafc', minHeight: '100vh', color: '#0f172a' }}>
      {/* ── Toast Notification ── */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '24px',
          zIndex: 10000,
          backgroundColor: '#0f766e',
          color: '#ffffff',
          padding: '12px 20px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '13px',
          fontWeight: 600,
        }}>
          <CheckCircle2 size={16} color="#ffffff" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ── Return Navigation to Reports & Active Filter Alert ── */}
      <div style={{ marginBottom: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        <button
          onClick={() => navigate('/reports?tab=TAB_COD')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            borderRadius: '6px',
            backgroundColor: '#ffffff',
            border: '1px solid #cbd5e1',
            color: '#334155',
            fontSize: '12px',
            fontWeight: 500,
            cursor: 'pointer',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#f1f5f9';
            e.currentTarget.style.color = '#0f172a';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#ffffff';
            e.currentTarget.style.color = '#334155';
          }}
        >
          <ArrowLeft size={14} />
          <span>Quay lại Báo Cáo Tổng Hợp</span>
        </button>

        {activeDriverFilter && (
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '4px 12px',
            backgroundColor: '#f0fdfa',
            border: '1px solid #ccfbf1',
            borderRadius: '6px',
            fontSize: '12px',
            color: '#0f766e',
          }}>
            <span>Đang tác nghiệp cho tài xế: <b>{reportData.drivers.find(d => d.id === activeDriverFilter)?.name || activeDriverFilter}</b></span>
            <button
              onClick={() => setActiveDriverFilter(null)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#dc2626',
                cursor: 'pointer',
                fontSize: '11.5px',
                fontWeight: 600,
                textDecoration: 'underline',
                padding: 0,
              }}
            >
              Xem tất cả
            </button>
          </div>
        )}
      </div>

      {/* ── Header ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '8px',
              backgroundColor: '#eff6ff',
              border: '1px solid #bfdbfe',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Receipt size={20} color="#1d4ed8" />
            </div>
            <div>
              <h1 style={{ fontSize: '20px', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                Đối Soát & Quyết Toán Quỹ Thu Hộ (COD)
              </h1>
              <p style={{ fontSize: '12.5px', color: '#64748b', margin: '2px 0 0 0' }}>
                Thống kê theo ngày/kỳ kế toán, đối chiếu tiền mặt thu hộ theo tài xế và lập Phiếu Thu Mẫu 01-TT nộp quỹ thu ngân
              </p>
            </div>
          </div>
        </div>

        {/* Global Header Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => fetchReportData(true)}
            disabled={isRefreshing}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              backgroundColor: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 500,
              color: '#334155',
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={14} color="#64748b" className={isRefreshing ? 'animate-spin' : ''} />
            <span>{isRefreshing ? 'Đang cập nhật...' : 'Làm mới'}</span>
          </button>

          <button
            onClick={handleExportCSV}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              backgroundColor: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 600,
              color: '#0f172a',
              cursor: 'pointer',
            }}
          >
            <Download size={14} color="#0f766e" />
            <span>Xuất Excel (CSV)</span>
          </button>
        </div>
      </div>

      {/* ── Multi-Dimensional Filter Bar ── */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
        padding: '16px 20px',
        marginBottom: '20px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}>
        {/* Row 1: Date Range Presets & Custom Pickers */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px', borderBottom: '1px solid #f1f5f9', paddingBottom: '14px', marginBottom: '14px' }}>
          {/* Preset Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569', marginRight: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Calendar size={14} color="#64748b" />
              <span>Thời gian:</span>
            </span>
            {[
              { id: 'TODAY', label: 'Hôm nay' },
              { id: 'YESTERDAY', label: 'Hôm qua' },
              { id: 'LAST_7_DAYS', label: '7 ngày qua' },
              { id: 'THIS_MONTH', label: 'Tháng này' },
              { id: 'ALL', label: 'Toàn bộ kỳ' },
            ].map(p => {
              const active = datePreset === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => handleSelectDatePreset(p.id as any)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '6px',
                    fontSize: '11.5px',
                    fontWeight: active ? 600 : 500,
                    border: active ? '1px solid #0f766e' : '1px solid #e2e8f0',
                    backgroundColor: active ? '#f0fdf4' : '#ffffff',
                    color: active ? '#0f766e' : '#475569',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          {/* Custom Date Inputs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '11.5px', color: '#64748b' }}>Từ ngày:</span>
              <input
                type="date"
                value={startDate}
                onChange={e => {
                  setDatePreset('CUSTOM');
                  setStartDate(e.target.value);
                }}
                style={{
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  padding: '4px 8px',
                  fontSize: '12px',
                  color: '#0f172a',
                  backgroundColor: '#ffffff',
                }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '11.5px', color: '#64748b' }}>Đến ngày:</span>
              <input
                type="date"
                value={endDate}
                onChange={e => {
                  setDatePreset('CUSTOM');
                  setEndDate(e.target.value);
                }}
                style={{
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  padding: '4px 8px',
                  fontSize: '12px',
                  color: '#0f172a',
                  backgroundColor: '#ffffff',
                }}
              />
            </div>
          </div>
        </div>

        {/* Row 2: Warehouse, Driver, Status & Search Filters */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', alignItems: 'center' }}>
          {/* Warehouse Filter */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>
              Kho xuất phát
            </label>
            <select
              value={selectedWarehouse}
              onChange={e => setSelectedWarehouse(e.target.value)}
              disabled={isManager}
              style={{
                width: '100%',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                padding: '6px 10px',
                fontSize: '12px',
                color: '#0f172a',
                backgroundColor: isManager ? '#f8fafc' : '#ffffff',
              }}
            >
              <option value="ALL">Tất cả các kho trung tâm</option>
              {warehouses.map(w => (
                <option key={w.id} value={w.code}>
                  {w.name} ({w.code})
                </option>
              ))}
            </select>
          </div>

          {/* Driver Filter */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>
              Tài xế giao hàng
            </label>
            <select
              value={selectedDriver}
              onChange={e => setSelectedDriver(e.target.value)}
              style={{
                width: '100%',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                padding: '6px 10px',
                fontSize: '12px',
                color: '#0f172a',
                backgroundColor: '#ffffff',
              }}
            >
              <option value="ALL">Tất cả tài xế trong đội xe</option>
              <option value="NV-GV05">Võ Minh Trí (Xe Máy Thùng Lạnh - WH-006)</option>
              <option value="NV-TK01">Đặng Hoàng Phúc (Xe Tải Lạnh 2.5T - WH-006)</option>
              <option value="NV-VAN01">Phan Hữu Nam (Xe Bán Tải 1.5T - WH-006)</option>
              <option value="NV-GV06">Nguyễn Văn Hùng (Xe Máy Siêu Tốc - WH-006)</option>
              <option value="NV-BT01">Bùi Hoàng Long (Tài xế Liên Kho Bình Thạnh)</option>
              <option value="NV-TB01">Trương Gia Huy (Tài xế Liên Kho Tân Bình)</option>
            </select>
          </div>

          {/* Settlement Status Filter */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>
              Trạng thái nộp quỹ
            </label>
            <select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value as any)}
              style={{
                width: '100%',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                padding: '6px 10px',
                fontSize: '12px',
                color: '#0f172a',
                backgroundColor: '#ffffff',
              }}
            >
              <option value="ALL">Tất cả trạng thái đối soát</option>
              <option value="PENDING">Chờ nộp quỹ / Còn tồn ngoài ca</option>
              <option value="SETTLED">Đã nộp quỹ / Đã khớp thu ngân</option>
            </select>
          </div>

          {/* Search Input */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>
              Tìm kiếm đơn / khách hàng
            </label>
            <div style={{ position: 'relative' }}>
              <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '9px' }} />
              <input
                type="text"
                placeholder="Mã đơn, SĐT, tên khách..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  padding: '6px 10px 6px 30px',
                  fontSize: '12px',
                  color: '#0f172a',
                  backgroundColor: '#ffffff',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── 5 Prominent KPI Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '14px', marginBottom: '24px' }}>
        {/* Total COD */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: '16px 18px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
            Tổng COD Thu Hộ Thực Tế
          </div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#1d4ed8', fontVariantNumeric: 'tabular-nums', marginBottom: '2px' }}>
            {reportData.summary.totalCodCollected.toLocaleString('vi-VN')}đ
          </div>
          <div style={{ fontSize: '11.5px', color: '#059669', fontWeight: 500 }}>
            Từ {reportData.summary.totalCodOrders} đơn hàng giao hoàn tất
          </div>
        </div>

        {/* Settled COD */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: '16px 18px', border: '1px solid #bbf7d0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#166534', textTransform: 'uppercase', marginBottom: '4px' }}>
            Đã Nộp Về Quỹ Thu Ngân
          </div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#15803d', fontVariantNumeric: 'tabular-nums', marginBottom: '2px' }}>
            {reportData.summary.totalSettled.toLocaleString('vi-VN')}đ
          </div>
          <div style={{ fontSize: '11.5px', color: '#166534', fontWeight: 500 }}>
            {reportData.summary.settledOrdersCount} đơn đã lập Phiếu Thu 01-TT
          </div>
        </div>

        {/* Pending Settlement */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: '16px 18px', border: '1px solid #fde68a', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#92400e', textTransform: 'uppercase', marginBottom: '4px' }}>
            Tiền COD Chờ Quyết Toán
          </div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#b45309', fontVariantNumeric: 'tabular-nums', marginBottom: '2px' }}>
            {reportData.summary.totalRemaining.toLocaleString('vi-VN')}đ
          </div>
          <div style={{ fontSize: '11.5px', color: '#b45309', fontWeight: 500 }}>
            {reportData.summary.pendingOrdersCount} đơn tài xế đang giữ nộp cuối ca
          </div>
        </div>

        {/* Settlement Rate */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: '16px 18px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
            Tỷ Lệ Quyết Toán Khớp Quỹ
          </div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#0f766e', fontVariantNumeric: 'tabular-nums', marginBottom: '2px' }}>
            {reportData.summary.settlementRate}%
          </div>
          {/* Progress bar */}
          <div style={{ width: '100%', height: '5px', backgroundColor: '#e2e8f0', borderRadius: '999px', marginTop: '6px', overflow: 'hidden' }}>
            <div style={{ width: `${reportData.summary.settlementRate}%`, height: '100%', backgroundColor: '#0f766e' }} />
          </div>
        </div>

        {/* Total Orders with COD */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: '16px 18px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
            Tổng Đơn Hàng COD Trong Kỳ
          </div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#0f172a', fontVariantNumeric: 'tabular-nums', marginBottom: '2px' }}>
            {reportData.summary.totalCodOrders} đơn
          </div>
          <div style={{ fontSize: '11.5px', color: '#64748b' }}>
            Kỳ đối soát: {startDate || 'Tất cả'} đến {endDate || 'Hôm nay'}
          </div>
        </div>
      </div>

      {/* ── Section 1: Driver Summary Table (Bảng Kê Đối Soát Từng Tài Xế) ── */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
        padding: '20px',
        marginBottom: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
      }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
          <div>
            <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: '0 0 2px 0' }}>
              Bảng Kê Đối Soát Tiền Thu Hộ COD Theo Từng Tài Xế (Mẫu 01-TT)
            </h2>
            <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
              Đối chiếu số tiền thu hộ thực tế ngoài ca của từng tài xế, xác nhận thu quỹ và in Phiếu Thu Mẫu 01-TT
            </p>
          </div>

          {activeDriverFilter && (
            <button
              onClick={() => setActiveDriverFilter(null)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 8px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#f1f5f9',
                fontSize: '11px',
                fontWeight: 600,
                color: '#334155',
                cursor: 'pointer',
              }}
            >
              <X size={12} />
              <span>Xóa lọc tài xế ({activeDriverFilter})</span>
            </button>
          )}
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12.5px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>
                <th style={{ padding: '10px 14px' }}>Mã / Tài Xế</th>
                <th style={{ padding: '10px 14px' }}>Phương Tiện & Biển Số</th>
                <th style={{ padding: '10px 14px' }}>Kho Trực Thuộc</th>
                <th style={{ padding: '10px 14px', textAlign: 'center' }}>Đơn Hoàn Tất</th>
                <th style={{ padding: '10px 14px', textAlign: 'right' }}>COD Phải Thu</th>
                <th style={{ padding: '10px 14px', textAlign: 'right' }}>Đã Nộp Quỹ</th>
                <th style={{ padding: '10px 14px', textAlign: 'right' }}>Còn Tồn Chưa Nộp</th>
                <th style={{ padding: '10px 14px', textAlign: 'center' }}>Trạng Thái Quỹ</th>
                <th style={{ padding: '10px 14px', textAlign: 'right' }}>Thao Tác Kế Toán</th>
              </tr>
            </thead>
            <tbody>
              {reportData.drivers.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '28px', color: '#94a3b8' }}>
                    Không có dữ liệu đối soát tài xế nào trong khoảng thời gian đã chọn.
                  </td>
                </tr>
              ) : (
                reportData.drivers.map((d, idx) => {
                  const isSettled = d.remainingCod <= 0;
                  const isRowActive = activeDriverFilter === d.id;
                  return (
                    <tr
                      key={d.id}
                      style={{
                        borderBottom: idx !== reportData.drivers.length - 1 ? '1px solid #f1f5f9' : 'none',
                        backgroundColor: isRowActive ? '#f0fdf4' : '#ffffff',
                        transition: 'background-color 0.15s ease',
                      }}
                    >
                      {/* Driver */}
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>{d.name}</div>
                        <div style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>
                          {d.phone} • {d.id}
                        </div>
                      </td>

                      {/* Vehicle */}
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ color: '#334155', fontWeight: 500 }}>{d.vehicleType}</div>
                        <div style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>
                          {d.plate}
                        </div>
                      </td>

                      {/* Warehouse */}
                      <td style={{ padding: '10px 14px', color: '#475569' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Building2 size={12} color="#64748b" />
                          <span>{d.warehouseName}</span>
                        </span>
                      </td>

                      {/* Orders */}
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        <span style={{ fontWeight: 700, color: '#166534' }}>{d.completedOrdersCount} đơn</span>
                        {d.failedOrdersCount > 0 && (
                          <span style={{ fontSize: '10.5px', color: '#b91c1c', marginLeft: '4px' }}>
                            ({d.failedOrdersCount} hoàn)
                          </span>
                        )}
                      </td>

                      {/* COD Collected */}
                      <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                        {d.codCollected.toLocaleString('vi-VN')}đ
                      </td>

                      {/* Settled */}
                      <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600, color: '#15803d', fontVariantNumeric: 'tabular-nums' }}>
                        {d.codSettled.toLocaleString('vi-VN')}đ
                      </td>

                      {/* Remaining */}
                      <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: d.remainingCod > 0 ? '#b45309' : '#64748b', fontVariantNumeric: 'tabular-nums' }}>
                        {d.remainingCod.toLocaleString('vi-VN')}đ
                      </td>

                      {/* Status */}
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        {isSettled ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 600,
                            backgroundColor: '#f0fdf4',
                            color: '#166534',
                            border: '1px solid #bbf7d0',
                          }}>
                            <CheckCircle2 size={12} />
                            <span>Đã Khớp Quỹ</span>
                          </span>
                        ) : (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 600,
                            backgroundColor: '#fffbeb',
                            color: '#92400e',
                            border: '1px solid #fde68a',
                          }}>
                            <Clock size={12} />
                            <span>Chờ Thu Ngân</span>
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          {/* Settle Button */}
                          {d.remainingCod > 0 ? (
                            <button
                              onClick={() => handleOpenSettleModal(d)}
                              style={{
                                backgroundColor: '#0f766e',
                                color: '#ffffff',
                                border: 'none',
                                padding: '5px 10px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              Thu Quỹ
                            </button>
                          ) : (
                            <span style={{ fontSize: '11px', color: '#166534', fontWeight: 500, marginRight: '4px' }}>
                              Đã nộp đủ
                            </span>
                          )}

                          {/* Print Voucher */}
                          <button
                            onClick={() => setActiveVoucher({ type: 'PHIEU_THU_01_TT', data: d })}
                            title="In Phiếu Thu Mẫu 01-TT"
                            style={{
                              backgroundColor: '#ffffff',
                              color: '#0f172a',
                              border: '1px solid #cbd5e1',
                              padding: '5px 8px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                            }}
                          >
                            <Printer size={12} />
                            <span>Phiếu Thu</span>
                          </button>

                          {/* Filter Orders */}
                          <button
                            onClick={() => setActiveDriverFilter(activeDriverFilter === d.id ? null : d.id)}
                            title="Lọc bảng chi tiết theo tài xế này"
                            style={{
                              backgroundColor: isRowActive ? '#e2e8f0' : '#f8fafc',
                              color: '#475569',
                              border: '1px solid #cbd5e1',
                              padding: '5px 8px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: 500,
                              cursor: 'pointer',
                            }}
                          >
                            {isRowActive ? 'Bỏ Lọc' : 'Xem Đơn'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Section 2: Detailed Orders Table (Bảng Kê Chi Tiết Từng Đơn Hàng COD) ── */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
        padding: '20px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
      }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
          <div>
            <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: '0 0 2px 0' }}>
              Danh Sách Chi Tiết Từng Đơn Hàng Có Thu Hộ COD
              {activeDriverFilter && (
                <span style={{ fontSize: '13px', color: '#0f766e', fontWeight: 600, marginLeft: '6px' }}>
                  (Tài xế: {reportData.drivers.find(d => d.id === activeDriverFilter)?.name || activeDriverFilter})
                </span>
              )}
            </h2>
            <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
              Hiển thị {filteredOrders.length} đơn hàng hoàn tất đối soát trong kỳ
            </p>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12.5px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>
                <th style={{ padding: '10px 14px' }}>Mã Đơn</th>
                <th style={{ padding: '10px 14px' }}>Thời Gian Hoàn Tất</th>
                <th style={{ padding: '10px 14px' }}>Khách Hàng & Địa Chỉ</th>
                <th style={{ padding: '10px 14px' }}>Tài Xế Phụ Trách</th>
                <th style={{ padding: '10px 14px', textAlign: 'right' }}>Tiền COD Thu Hộ</th>
                <th style={{ padding: '10px 14px', textAlign: 'center' }}>Phương Thức</th>
                <th style={{ padding: '10px 14px', textAlign: 'center' }}>Trạng Thái Nộp Quỹ</th>
                <th style={{ padding: '10px 14px', textAlign: 'center' }}>Biên Bản POD</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '28px', color: '#94a3b8' }}>
                    Không có đơn hàng nào khớp với bộ lọc hiện tại.
                  </td>
                </tr>
              ) : (
                paginatedOrders.map((ord, idx) => {
                  const isSettled = ord.codSettledStatus === 'SETTLED';
                  return (
                    <tr
                      key={ord.id}
                      style={{
                        borderBottom: idx !== filteredOrders.length - 1 ? '1px solid #f1f5f9' : 'none',
                        backgroundColor: '#ffffff',
                      }}
                    >
                      {/* Order Code */}
                      <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontWeight: 700, color: '#0f766e' }}>
                        #{ord.orderCode || (ord.id ? (ord.id.length > 15 ? `ECOMM-${ord.id.slice(0, 8).toUpperCase()}` : ord.id) : 'ORD-01')}
                      </td>

                      {/* Completed Time */}
                      <td style={{ padding: '10px 14px', color: '#475569', fontSize: '12px' }}>
                        {new Date(ord.completedAt || ord.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}{' '}
                        <span style={{ color: '#94a3b8' }}>
                          {new Date(ord.completedAt || ord.createdAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                        </span>
                      </td>

                      {/* Customer & Address */}
                      <td style={{ padding: '10px 14px', maxWidth: '280px' }}>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>{ord.customerName}</div>
                        <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '3px', marginTop: '2px' }}>
                          <MapPin size={11} color="#ef4444" style={{ flexShrink: 0 }} />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {ord.customerAddress}
                          </span>
                        </div>
                      </td>

                      {/* Driver */}
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ fontWeight: 600, color: '#334155' }}>{ord.assignedDriverName}</div>
                        <div style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>
                          {ord.assignedDriverPhone}
                        </div>
                      </td>

                      {/* COD Amount */}
                      <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: ord.codAmount > 0 ? '#0f172a' : '#64748b', fontVariantNumeric: 'tabular-nums' }}>
                        {ord.codAmount > 0 ? `${ord.codAmount.toLocaleString('vi-VN')}đ` : '0đ (Online)'}
                      </td>

                      {/* Payment Method */}
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 600,
                          backgroundColor: ord.codAmount > 0 ? '#fff7ed' : '#f0fdf4',
                          color: ord.codAmount > 0 ? '#c2410c' : '#166534',
                          border: `1px solid ${ord.codAmount > 0 ? '#fed7aa' : '#bbf7d0'}`,
                        }}>
                          {ord.codAmount > 0 ? 'Tiền mặt COD' : 'VNPay / Online'}
                        </span>
                      </td>

                      {/* Settlement Status */}
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        {isSettled ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 600,
                            backgroundColor: '#f0fdf4',
                            color: '#166534',
                            border: '1px solid #bbf7d0',
                          }}>
                            <CheckCircle2 size={11} />
                            <span>Đã Nộp Quỹ</span>
                          </span>
                        ) : (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 600,
                            backgroundColor: '#fffbeb',
                            color: '#92400e',
                            border: '1px solid #fde68a',
                          }}>
                            <Clock size={11} />
                            <span>Chờ Nộp Quỹ</span>
                          </span>
                        )}
                      </td>

                      {/* POD Photo Button */}
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        {ord.podPhotoUrl ? (
                          <button
                            onClick={() => setPodPhotoModalUrl(ord.podPhotoUrl)}
                            title="Xem ảnh bằng chứng bàn giao"
                            style={{
                              backgroundColor: '#f0fdf4',
                              color: '#166534',
                              border: '1px solid #bbf7d0',
                              padding: '3px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <Camera size={12} />
                            <span>Ảnh POD</span>
                          </button>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '11px' }}>-</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls for Detailed Orders */}
        <PaginationBar
          currentPage={orderPage}
          pageSize={orderPageSize}
          totalItems={filteredOrders.length}
          onPageChange={setOrderPage}
          onPageSizeChange={setOrderPageSize}
        />
      </div>

      {/* ── Modal: Cashier Settle Confirmation (Thủ Quỹ Thu Tiền Mặt) ── */}
      {settleModalDriver && (
        <div 
          onClick={() => setSettleModalDriver(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div 
            onClick={e => e.stopPropagation()}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '500px',
            padding: '24px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e2e8f0',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Wallet size={18} color="#0f766e" />
                <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                  Xác Nhận Nộp Quỹ COD - Thủ Quỹ Thu Ngân
                </h3>
              </div>
              <button
                onClick={() => setSettleModalDriver(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
              >
                <X size={18} color="#64748b" />
              </button>
            </div>

            <div style={{ backgroundColor: '#f8fafc', borderRadius: '8px', padding: '12px', marginBottom: '16px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>
                Tài xế nộp tiền: {settleModalDriver.name} ({settleModalDriver.id})
              </div>
              <div style={{ fontSize: '12px', color: '#475569', marginTop: '2px' }}>
                Số điện thoại: {settleModalDriver.phone} • Biển số: {settleModalDriver.plate}
              </div>
              <div style={{ fontSize: '12px', color: '#b45309', fontWeight: 600, marginTop: '4px' }}>
                Số tiền COD còn tồn cần nộp: {settleModalDriver.remainingCod.toLocaleString('vi-VN')}đ
              </div>
            </div>

            {/* Form Fields */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                Số tiền thực nhận nộp quỹ (VNĐ)
              </label>
              <input
                type="number"
                value={settleAmountInput}
                onChange={e => setSettleAmountInput(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '14px',
                  fontWeight: 700,
                  color: '#0f766e',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                Hình thức nộp tiền
              </label>
              <select
                value={settleMethodInput}
                onChange={e => setSettleMethodInput(e.target.value as any)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  color: '#0f172a',
                  boxSizing: 'border-box',
                }}
              >
                <option value="CASH_TO_TREASURER">Tiền mặt tại bàn thu ngân siêu thị</option>
                <option value="VIETQR_TRANSFER">Chuyển khoản VietQR Napas247</option>
              </select>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                Ghi chú phiếu thu (Tùy chọn)
              </label>
              <input
                type="text"
                value={settleNotesInput}
                onChange={e => setSettleNotesInput(e.target.value)}
                placeholder="Nhập ghi chú hoặc mã tham chiếu giao dịch..."
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '12.5px',
                  color: '#0f172a',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setSettleModalDriver(null)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#475569',
                  cursor: 'pointer',
                }}
              >
                Hủy
              </button>
              <button
                onClick={handleConfirmCashierSettlement}
                disabled={isSubmittingSettle}
                style={{
                  padding: '8px 18px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#0f766e',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#ffffff',
                  cursor: 'pointer',
                }}
              >
                {isSubmittingSettle ? 'Đang lưu trữ...' : 'Xác Nhận Nộp Quỹ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: POD Photo Viewer ── */}
      {podPhotoModalUrl && (
        <div
          onClick={() => setPodPhotoModalUrl(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            backgroundColor: 'rgba(15, 23, 42, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              maxWidth: '650px',
              width: '100%',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderBottom: '1px solid #e2e8f0' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                Ảnh Bằng Chứng Bàn Giao Hàng (POD)
              </h3>
              <button onClick={() => setPodPhotoModalUrl(null)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>
                <X size={18} color="#64748b" />
              </button>
            </div>
            <div style={{ padding: '16px', display: 'flex', justifyContent: 'center', backgroundColor: '#0f172a' }}>
              <img
                src={podPhotoModalUrl}
                alt="POD Evidence"
                style={{ maxWidth: '100%', maxHeight: '70vh', borderRadius: '6px', objectFit: 'contain' }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Print Accounting Voucher (Mẫu 01-TT) ── */}
      {activeVoucher && (
        <PrintAccountingVoucherModal
          voucherType={activeVoucher.type}
          data={{
            id: activeVoucher.data.id || 'NV-GV05',
            name: activeVoucher.data.name || 'Tài xế giao hàng',
            phone: activeVoucher.data.phone || '0901234567',
            vehicleType: activeVoucher.data.vehicleType || 'Xe Máy Thùng Lạnh',
            plate: activeVoucher.data.plate || '59-V1 888.99',
            completedOrders: activeVoucher.data.completedOrdersCount || activeVoucher.data.completed || 12,
            codCollected: activeVoucher.data.codCollected || activeVoucher.data.cod || 0,
            dateStr: startDate || getTodayStr(),
          }}
          onClose={() => setActiveVoucher(null)}
        />
      )}
    </div>
  );
};

export default CodReconciliation;

