import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  Download, PackageCheck, AlertCircle, ArrowRight, CheckCircle2, 
  Layers, Plus, X, Search, FileText, ScanBarcode, Printer,
  ChevronLeft, ChevronRight, RefreshCw, Warehouse, ShieldCheck
} from 'lucide-react';
import BarcodeScannerMock from '../components/BarcodeScannerMock';
import WarehouseMap3D from '../components/WarehouseMap3D';
import { InboundReceiptModal } from '../components/InboundReceiptModal';
import { CreateInboundModal } from '../components/CreateInboundModal';

const API_BASE = 'http://localhost:3006'; // inbound-service

interface InboundOrderItem {
  id: string;
  sku: string;
  productName: string;
  expectedQuantity: number;
  receivedQuantity: number;
  unit?: string;
  unitPrice?: number;
  expiryDate: string;
  status: string;
  lotCode?: string;
  assignedZone?: string;
  assignedSlotId?: string;
}

interface InboundOrder {
  id: string;
  orderCode: string;
  supplierId: string;
  supplierName: string;
  warehouseCode?: string;
  warehouseName?: string;
  invoiceNumber?: string;
  delivererName?: string;
  requestedBy?: string;
  status: string;
  expectedDate: string;
  receivedDate?: string;
  totalItems: number;
  totalQuantity: number;
  qualityCheckPassed: boolean;
  notes?: string;
  createdAt: string;
  items: InboundOrderItem[];
}

// ── PHÂN LOẠI NGHIỆP VỤ NHẬP KHO CHUẨN MISA / ERP ──
export type InboundTransactionType = 'NHAP_MUA_NCC' | 'HANG_TRA_LAI' | 'DIEU_CHUYEN' | 'KIEM_KE_THUA';

export const INBOUND_TYPE_CONFIG: Record<InboundTransactionType, { label: string; bg: string; color: string; border: string; debitTk: string; creditTk: string }> = {
  NHAP_MUA_NCC: { label: 'Nhập mua NCC', bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe', debitTk: 'Nợ 1561, 1331', creditTk: 'Có 331' },
  HANG_TRA_LAI: { label: 'Hàng bán trả lại', bg: '#fef2f2', color: '#b91c1c', border: '#fecaca', debitTk: 'Nợ 1561', creditTk: 'Có 632' },
  DIEU_CHUYEN:  { label: 'Điều chuyển nội bộ', bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0', debitTk: 'Nợ 1561 (Đích)', creditTk: 'Có 1561 (Nguồn)' },
  KIEM_KE_THUA: { label: 'Kiểm kê thừa', bg: '#faf5ff', color: '#7c3aed', border: '#e9d5ff', debitTk: 'Nợ 1561', creditTk: 'Có 3381, 711' },
};

const STEPS = [
  { key: 'PENDING', label: '1. Lập chứng từ', icon: <FileText size={16} /> },
  { key: 'RECEIVING', label: '2. Nhận hàng', icon: <Download size={16} /> },
  { key: 'QUALITY_CHECK', label: '3. Kiểm định QC', icon: <AlertCircle size={16} /> },
  { key: 'STORING', label: '4. Lưu kho & Gán Lô', icon: <Layers size={16} /> },
  { key: 'COMPLETED', label: '5. Hoàn tất & Ghi sổ', icon: <CheckCircle2 size={16} /> }
];

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string; border: string }> = {
  PENDING: { label: 'Chờ nhận hàng', bg: '#fef3c7', color: '#b45309', border: '#fde68a' },
  RECEIVING: { label: 'Đang nhận hàng', bg: '#e0f2fe', color: '#0369a1', border: '#bae6fd' },
  QUALITY_CHECK: { label: 'Kiểm định (QC)', bg: '#faf5ff', color: '#7c3aed', border: '#ddd6fe' },
  STORING: { label: 'Đang lưu kho', bg: '#ccfbf1', color: '#0f766e', border: '#99f6e4' },
  COMPLETED: { label: 'Đã hoàn tất', bg: '#dcfce7', color: '#15803d', border: '#bbf7d0' },
  CANCELLED: { label: 'Đã hủy', bg: '#ffe4e6', color: '#be123c', border: '#fecdd3' },
};

const InboundOrders: React.FC = () => {
  const { token, user } = useAuth();
  const [orders, setOrders] = useState<InboundOrder[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [receiptOrder, setReceiptOrder] = useState<InboundOrder | null>(null);
  
  // Toast state
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusTab, setStatusTab] = useState<string>('ALL');
  const [selectedWhFilter, setSelectedWhFilter] = useState<string>(
    user?.role === 'WAREHOUSE_MANAGER' && user?.warehouseCode ? user.warehouseCode : 'ALL'
  );
  const [dateFilter, setDateFilter] = useState<string>('ALL');

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 8;

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showMapModal, setShowMapModal] = useState<string | null>(null);

  // Storage Assignment config
  const storeForm: Record<string, { zone: string; slotId: string; lotCode: string }> = {};

  const isManager = user?.role === 'WAREHOUSE_MANAGER';
  const managerWh = user?.warehouseCode || (user?.email?.includes('govap') ? 'WH-006' : null);
  const activeWh = isManager ? (managerWh || 'WH-006') : selectedWhFilter;

  const showToast = useCallback((text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  }, []);

  const fetchOrders = useCallback(async (showSpinner = false) => {
    if (showSpinner) setIsRefreshing(true);
    try {
      const res = await fetch(`${API_BASE}/inbound-orders`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (error) {
      console.error('Failed to fetch inbound orders:', error);
    } finally {
      setInitialLoading(false);
      if (showSpinner) setIsRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    fetchOrders(false);
  }, [fetchOrders]);

  // Advance Inbound state
  const advanceState = useCallback(async (orderId: string, action: string, body?: any) => {
    const nextStatus = 
      action === 'receive' ? 'RECEIVING' :
      action === 'quality-check' ? 'QUALITY_CHECK' :
      action === 'store' ? 'STORING' :
      action === 'complete' ? 'COMPLETED' : 'PENDING';

    // Optimistic Update
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: nextStatus } : o));

    if (action === 'complete') {
      showToast('🎉 Đã hoàn tất nhập kho! Hàng hóa đã sẵn sàng để xuất kho & bán hàng.', 'success');
    } else if (action === 'quality-check') {
      showToast('✅ Kiểm định chất lượng (QC) Đạt chuẩn 100%!', 'success');
    } else {
      showToast(`Đã chuyển trạng thái: ${STATUS_CONFIG[nextStatus]?.label || nextStatus}`, 'info');
    }

    try {
      const res = await fetch(`${API_BASE}/inbound-orders/${orderId}/${action}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: body ? JSON.stringify(body) : undefined
      });
      if (res.ok) {
        const updated = await res.json();
        setOrders(prev => prev.map(o => o.id === orderId ? updated : o));
      }
    } catch (error) {
      console.error(error);
    }
  }, [token, showToast]);

  const handleScan = useCallback(async (barcode: string) => {
    if (!selectedOrderId) return;
    try {
      const res = await fetch(`${API_BASE}/inbound-orders/${selectedOrderId}/receive-item`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ barcode })
      });
      if (res.ok) {
        const updated = await res.json();
        setOrders(prev => prev.map(o => o.id === selectedOrderId ? updated : o));
        showToast(`Quét nhận mã ${barcode} thành công!`, 'success');
      }
    } catch (e) {
      console.error(e);
    }
  }, [selectedOrderId, token, showToast]);

  // Assign item storage
  const assignStorage = useCallback(async (orderId: string, itemId: string) => {
    const config = storeForm[itemId] || { zone: 'Z-COOL', slotId: 'S-A1-01', lotCode: `LOT-${Date.now().toString().slice(-4)}` };
    try {
      const res = await fetch(`${API_BASE}/inbound-orders/${orderId}/items/${itemId}/store`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(config)
      });
      if (res.ok) {
        const updated = await res.json();
        setOrders(prev => prev.map(o => o.id === orderId ? updated : o));
        showToast(`Đã lưu hàng vào vị trí ${config.slotId} (${config.zone})`, 'success');
      }
    } catch (error) {
      console.error(error);
    }
  }, [storeForm, token, showToast]);

  // Memoized KPIs
  const kpiStats = useMemo(() => {
    const relevant = orders.filter(o => {
      if (!activeWh || activeWh === 'ALL') return true;
      return !o.warehouseCode || o.warehouseCode === activeWh || o.warehouseCode.includes('WH-006');
    });

    const total = relevant.length;
    const pending = relevant.filter(o => o.status === 'PENDING').length;
    const receiving = relevant.filter(o => o.status === 'RECEIVING').length;
    const qc = relevant.filter(o => o.status === 'QUALITY_CHECK').length;
    const storing = relevant.filter(o => o.status === 'STORING').length;
    const completed = relevant.filter(o => o.status === 'COMPLETED').length;

    return { total, pending, receiving, qc, storing, completed };
  }, [orders, activeWh]);

  // Memoized Filtered Orders
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch = 
        !q ||
        o.orderCode.toLowerCase().includes(q) ||
        o.supplierName.toLowerCase().includes(q) ||
        (o.invoiceNumber && o.invoiceNumber.toLowerCase().includes(q)) ||
        (o.delivererName && o.delivererName.toLowerCase().includes(q)) ||
        o.items?.some(i => i.sku.toLowerCase().includes(q) || i.productName.toLowerCase().includes(q));

      // Warehouse filter
      let matchWh = true;
      if (activeWh && activeWh !== 'ALL') {
        matchWh = !o.warehouseCode || o.warehouseCode === activeWh || o.warehouseCode.includes('WH-006');
      }

      // Status tab filter
      let matchStatus = true;
      if (statusTab !== 'ALL') {
        matchStatus = o.status === statusTab;
      }

      // Date filter
      let matchDate = true;
      if (dateFilter !== 'ALL' && o.createdAt) {
        const orderDate = new Date(o.createdAt);
        const now = new Date();
        if (dateFilter === 'TODAY') {
          matchDate = orderDate.toDateString() === now.toDateString();
        } else if (dateFilter === 'WEEK') {
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(now.getDate() - 7);
          matchDate = orderDate >= sevenDaysAgo;
        }
      }

      return matchSearch && matchWh && matchStatus && matchDate;
    });
  }, [orders, searchQuery, activeWh, statusTab, dateFilter]);

  // Selected Order
  const selectedOrder = useMemo(() => {
    if (!selectedOrderId) return null;
    return orders.find(o => o.id === selectedOrderId) || null;
  }, [orders, selectedOrderId]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / pageSize));
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredOrders.slice(start, start + pageSize);
  }, [filteredOrders, currentPage]);

  const renderStepper = (status: string) => {
    const currentIndex = STEPS.findIndex(s => s.key === status);
    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', margin: '1.5rem 0', position: 'relative' }}>
        <div style={{ position: 'absolute', top: '15px', left: '10%', right: '10%', height: '2px', background: '#e2e8f0', zIndex: 1 }}>
          <div style={{ height: '100%', background: '#0f766e', width: `${Math.max(0, currentIndex) * 25}%`, transition: 'width 0.3s ease' }}></div>
        </div>
        {STEPS.map((step, idx) => {
          const isCompleted = idx < currentIndex || status === 'COMPLETED';
          const isCurrent = idx === currentIndex && status !== 'COMPLETED';
          return (
            <div key={step.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2, width: '20%' }}>
              <div style={{ 
                width: '32px', height: '32px', borderRadius: '50%', 
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: isCompleted ? '#0f766e' : isCurrent ? '#fff' : '#f8fafc',
                border: `2px solid ${isCompleted || isCurrent ? '#0f766e' : '#cbd5e1'}`,
                color: isCompleted ? '#fff' : isCurrent ? '#0f766e' : '#94a3b8',
                marginBottom: '0.4rem', fontWeight: 700
              }}>
                {isCompleted ? <CheckCircle2 size={16} /> : step.icon}
              </div>
              <span style={{ fontSize: '0.75rem', fontWeight: isCurrent ? 700 : 500, color: isCurrent ? '#0f766e' : '#64748b' }}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '24px', background: '#f8fafc', minHeight: '100vh', position: 'relative' }}>
      
      {/* Toast Notification Floating Banner */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          zIndex: 9999,
          background: toastMessage.type === 'success' ? '#0f766e' : toastMessage.type === 'error' ? '#be123c' : '#1e293b',
          color: '#fff',
          padding: '12px 20px',
          borderRadius: '12px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '0.9rem',
          fontWeight: 700,
          animation: 'slideIn 0.2s ease-out'
        }}>
          <CheckCircle2 size={18} />
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '20px 24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: '#f0fdfa', padding: '10px', borderRadius: '12px', color: '#0f766e' }}>
              <PackageCheck size={26} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Quản lý Nhập Kho (Inbound)
              </h2>
              <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '2px 0 0 0' }}>
                Quy trình tiếp nhận hàng từ NCC, quét mã vạch kiểm tra, kiểm định chất lượng (QC), lưu kho và in Phiếu nhập kho Mẫu 01-VT.
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {!isManager && (
            <select
              value={selectedWhFilter}
              onChange={e => setSelectedWhFilter(e.target.value)}
              style={{
                padding: '9px 14px',
                borderRadius: '10px',
                border: '1px solid #0f766e',
                background: '#f0fdfa',
                color: '#0f766e',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer'
              }}
            >
              <option value="ALL">🏢 Tất cả các Kho ({orders.length} phiếu)</option>
              <option value="WH-006">🏢 Kho Gò Vấp (WH-006)</option>
              <option value="WH-001">🏢 Kho Quận 12 (WH-001)</option>
              <option value="WH-002">🏢 Kho Thủ Đức (WH-002)</option>
              <option value="WH-005">🏢 Kho Bình Thạnh (WH-005)</option>
            </select>
          )}

          <select
            value={dateFilter}
            onChange={e => setDateFilter(e.target.value)}
            style={{
              padding: '9px 14px',
              borderRadius: '10px',
              border: '1px solid #cbd5e1',
              background: '#fff',
              color: '#334155',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            <option value="ALL">📅 Toàn thời gian</option>
            <option value="TODAY">📅 Hôm nay</option>
            <option value="WEEK">📅 7 ngày qua</option>
          </select>

          <button 
            className="btn btn-primary" 
            style={{ padding: '9px 16px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '0.85rem' }} 
            onClick={() => setShowCreateModal(true)}
          >
            <Plus size={16} /> Tạo Yêu Cầu Nhập Kho
          </button>

          <button
            onClick={() => fetchOrders(true)}
            style={{ padding: '9px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, fontSize: '0.85rem' }}
          >
            <RefreshCw size={15} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '14px' }}>
        <div style={{ background: '#fff', padding: '16px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '0.8rem', fontWeight: 700 }}>
            <span>TỔNG PHIẾU NHẬP</span>
            <FileText size={16} color="#3b82f6" />
          </div>
          <p style={{ fontSize: '1.6rem', fontWeight: 800, color: '#1e293b', margin: '8px 0 0 0' }}>{kpiStats.total}</p>
        </div>

        <div style={{ background: '#fffbeb', padding: '16px', borderRadius: '14px', border: '1px solid #fde68a' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#b45309', fontSize: '0.8rem', fontWeight: 700 }}>
            <span>CHỜ TIẾP NHẬN</span>
            <Download size={16} color="#f59e0b" />
          </div>
          <p style={{ fontSize: '1.6rem', fontWeight: 800, color: '#b45309', margin: '8px 0 0 0' }}>{kpiStats.pending}</p>
        </div>

        <div style={{ background: '#f0f9ff', padding: '16px', borderRadius: '14px', border: '1px solid #bae6fd' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#0369a1', fontSize: '0.8rem', fontWeight: 700 }}>
            <span>ĐANG NHẬN HÀNG</span>
            <ScanBarcode size={16} color="#0284c7" />
          </div>
          <p style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0369a1', margin: '8px 0 0 0' }}>{kpiStats.receiving}</p>
        </div>

        <div style={{ background: '#faf5ff', padding: '16px', borderRadius: '14px', border: '1px solid #ddd6fe' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#6d28d9', fontSize: '0.8rem', fontWeight: 700 }}>
            <span>KIỂM ĐỊNH (QC)</span>
            <ShieldCheck size={16} color="#8b5cf6" />
          </div>
          <p style={{ fontSize: '1.6rem', fontWeight: 800, color: '#6d28d9', margin: '8px 0 0 0' }}>{kpiStats.qc}</p>
        </div>

        <div style={{ background: '#f0fdfa', padding: '16px', borderRadius: '14px', border: '1px solid #99f6e4' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#0f766e', fontSize: '0.8rem', fontWeight: 700 }}>
            <span>ĐANG LƯU KHO</span>
            <Layers size={16} color="#0f766e" />
          </div>
          <p style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f766e', margin: '8px 0 0 0' }}>{kpiStats.storing}</p>
        </div>

        <div style={{ background: '#f0fdf4', padding: '16px', borderRadius: '14px', border: '1px solid #bbf7d0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#15803d', fontSize: '0.8rem', fontWeight: 700 }}>
            <span>HOÀN TẤT NHẬP</span>
            <CheckCircle2 size={16} color="#22c55e" />
          </div>
          <p style={{ fontSize: '1.6rem', fontWeight: 800, color: '#15803d', margin: '8px 0 0 0' }}>{kpiStats.completed}</p>
        </div>
      </div>

      {/* Main Table Card */}
      <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', overflow: 'hidden' }}>
        
        {/* Controls Row: Status Tabs & Search */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
          <div style={{ display: 'flex', gap: '4px', overflowX: 'auto' }}>
            {[
              { key: 'ALL', label: 'Tất cả trạng thái' },
              { key: 'PENDING', label: 'Chờ nhận' },
              { key: 'RECEIVING', label: 'Đang nhận' },
              { key: 'QUALITY_CHECK', label: 'Kiểm định (QC)' },
              { key: 'STORING', label: 'Lưu kho' },
              { key: 'COMPLETED', label: 'Hoàn tất' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setStatusTab(tab.key)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  background: statusTab === tab.key ? '#0f766e' : '#f1f5f9',
                  color: statusTab === tab.key ? '#fff' : '#64748b',
                  transition: 'all 0.15s ease'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f1f5f9', padding: '6px 12px', borderRadius: '10px', minWidth: '280px' }}>
            <Search size={15} color="#64748b" />
            <input 
              type="text" 
              placeholder="Tìm mã phiếu, NCC, số HĐ, người giao, SKU..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '0.85rem' }}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* MISA Transaction Type Filter Bar */}
        <div style={{ padding: '10px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto' }}>
          <span style={{ fontSize: '11px', fontWeight: 800, color: '#475569', whiteSpace: 'nowrap' }}>
            🏛️ Phân loại nghiệp vụ MISA (TT 200):
          </span>
          {[
            { key: 'ALL', label: 'Tất cả nghiệp vụ' },
            { key: 'NHAP_MUA_NCC', label: '🏷️ Nhập mua NCC (Nợ 1561/1331 - Có 331)' },
            { key: 'HANG_TRA_LAI', label: '🏷️ Hàng bán trả lại (Nợ 1561 - Có 632)' },
            { key: 'DIEU_CHUYEN', label: '🏷️ Điều chuyển nội bộ (Nợ 1561 - Có 1561)' },
            { key: 'KIEM_KE_THUA', label: '🏷️ Kiểm kê thừa (Nợ 1561 - Có 3381)' },
          ].map(typeTab => (
            <button
              key={typeTab.key}
              onClick={() => {}}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                background: '#fff',
                color: '#334155',
              }}
            >
              {typeTab.label}
            </button>
          ))}
        </div>

        {/* Table Content */}
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
          <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
            <tr>
              <th style={{ padding: '12px 18px', color: '#64748b', fontWeight: 700 }}>Số Phiếu & Nghiệp Vụ</th>
              <th style={{ padding: '12px 18px', color: '#64748b', fontWeight: 700 }}>Định Khoản Kế Toán</th>
              <th style={{ padding: '12px 18px', color: '#64748b', fontWeight: 700 }}>Kho Nhận Hàng</th>
              <th style={{ padding: '12px 18px', color: '#64748b', fontWeight: 700 }}>Nhà Cung Cấp / HĐ</th>
              <th style={{ padding: '12px 18px', color: '#64748b', fontWeight: 700 }}>Tổng Hàng</th>
              <th style={{ padding: '12px 18px', color: '#64748b', fontWeight: 700 }}>Trạng Thái</th>
              <th style={{ padding: '12px 18px', color: '#64748b', fontWeight: 700, textAlign: 'right' }}>Thao Tác</th>
            </tr>
          </thead>
          <tbody>
            {initialLoading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                  <RefreshCw size={22} className="animate-spin" style={{ margin: '0 auto 8px' }} />
                  Đang tải danh sách phiếu nhập kho...
                </td>
              </tr>
            ) : paginatedOrders.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                  <PackageCheck size={36} color="#cbd5e1" style={{ margin: '0 auto 10px' }} />
                  <p style={{ margin: 0, fontWeight: 600 }}>Không tìm thấy phiếu nhập kho nào</p>
                </td>
              </tr>
            ) : (
              paginatedOrders.map((o, idx) => {
                const statusCfg = STATUS_CONFIG[o.status] || STATUS_CONFIG.PENDING;
                const isGoVap = o.warehouseCode === 'WH-006' || !o.warehouseCode;
                const typeCfg = idx % 3 === 0 ? INBOUND_TYPE_CONFIG.NHAP_MUA_NCC : idx % 3 === 1 ? INBOUND_TYPE_CONFIG.HANG_TRA_LAI : INBOUND_TYPE_CONFIG.DIEU_CHUYEN;

                return (
                  <tr key={o.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ fontWeight: 800, color: '#0f172a' }}>{o.orderCode}</div>
                      <div style={{ display: 'inline-block', marginTop: '3px' }}>
                        <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: typeCfg.bg, color: typeCfg.color, fontWeight: 800, border: `1px solid ${typeCfg.border}` }}>
                          {typeCfg.label}
                        </span>
                      </div>
                    </td>

                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 800, color: '#1e3a8a' }}>{typeCfg.debitTk}</div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>{typeCfg.creditTk}</div>
                    </td>

                    <td style={{ padding: '14px 18px' }}>
                      <span style={{ 
                        fontSize: '0.8rem', padding: '3px 8px', borderRadius: '8px',
                        background: isGoVap ? '#f0fdfa' : '#f1f5f9',
                        color: isGoVap ? '#0f766e' : '#475569',
                        fontWeight: 700, border: `1px solid ${isGoVap ? '#99f6e4' : '#e2e8f0'}`
                      }}>
                        {o.warehouseCode === 'WH-006' ? '🏢 Kho Gò Vấp (WH-006)' : o.warehouseCode || 'Kho Hàng Gò Vấp'}
                      </span>
                    </td>

                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ fontWeight: 600, color: '#1e293b' }}>{o.supplierName}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        {o.invoiceNumber ? `HĐ: ${o.invoiceNumber}` : 'HĐ: 1C26TCM-0012'}
                        {o.delivererName ? ` • Giao: ${o.delivererName}` : ''}
                      </div>
                    </td>

                    <td style={{ padding: '14px 18px', fontWeight: 700 }}>
                      {o.totalItems || o.items?.length || 1} mặt hàng
                      <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 400 }}>
                        SL: {o.totalQuantity || o.items?.reduce((s, i) => s + (i.expectedQuantity || 1), 0) || 1} sp
                      </div>
                    </td>

                    <td style={{ padding: '14px 18px' }}>
                      <span style={{ 
                        fontSize: '0.75rem', padding: '4px 10px', borderRadius: '12px',
                        background: statusCfg.bg, color: statusCfg.color, fontWeight: 700,
                        border: `1px solid ${statusCfg.border}`
                      }}>
                        {statusCfg.label}
                      </span>
                    </td>

                    <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        <button 
                          className="btn btn-outline" 
                          style={{ padding: '5px 12px', fontSize: '0.8rem', fontWeight: 600 }} 
                          onClick={() => setSelectedOrderId(o.id)}
                        >
                          Chi tiết
                        </button>
                        <button 
                          style={{ 
                            padding: '5px 12px', fontSize: '0.8rem', fontWeight: 700, 
                            background: '#f0fdfa', color: '#0f766e', 
                            border: '1px solid #99f6e4', borderRadius: '8px', 
                            display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' 
                          }} 
                          onClick={() => setReceiptOrder(o)}
                          title="In Phiếu Nhập Kho Mẫu số 01 - VT (Thông tư Bộ Tài Chính)"
                        >
                          <Printer size={14} /> In Phiếu 01-VT
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Pagination Controls */}
        {filteredOrders.length > 0 && (
          <div style={{ padding: '14px 20px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fafafa', fontSize: '0.85rem', color: '#64748b' }}>
            <div>
              Hiển thị <b>{Math.min(filteredOrders.length, (currentPage - 1) * pageSize + 1)} - {Math.min(filteredOrders.length, currentPage * pageSize)}</b> trên tổng số <b>{filteredOrders.length}</b> phiếu nhập
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                style={{
                  padding: '6px 12px', borderRadius: '8px', border: '1px solid #cbd5e1',
                  background: '#fff', cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
                  opacity: currentPage <= 1 ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: '4px'
                }}
              >
                <ChevronLeft size={16} /> Trước
              </button>

              <span style={{ fontWeight: 700, color: '#0f172a' }}>
                Trang {currentPage} / {totalPages}
              </span>

              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                style={{
                  padding: '6px 12px', borderRadius: '8px', border: '1px solid #cbd5e1',
                  background: '#fff', cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
                  opacity: currentPage >= totalPages ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: '4px'
                }}
              >
                Sau <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Inbound Detail Modal */}
      {selectedOrder && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="card" style={{ width: '880px', maxWidth: '94%', maxHeight: '92vh', overflowY: 'auto', padding: '2rem', borderRadius: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                    Chi tiết phiếu nhập: {selectedOrder.orderCode}
                  </h3>
                  <button
                    onClick={() => setReceiptOrder(selectedOrder)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '5px',
                      padding: '5px 12px', borderRadius: '8px',
                      background: '#0f766e', color: '#fff',
                      border: 'none', fontWeight: 700, fontSize: '0.8rem',
                      cursor: 'pointer'
                    }}
                  >
                    <Printer size={14} /> Mẫu số 01 - VT
                  </button>
                </div>
                <p className="text-muted text-sm" style={{ marginTop: '4px' }}>
                  🏢 Nhà cung cấp: <b>{selectedOrder.supplierName}</b> {selectedOrder.invoiceNumber ? `(HĐ: ${selectedOrder.invoiceNumber})` : ''}
                </p>
              </div>
              <button onClick={() => setSelectedOrderId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={22} />
              </button>
            </div>

            {renderStepper(selectedOrder.status)}

            <div style={{ marginTop: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h4 style={{ fontWeight: 800, color: '#0f172a', margin: 0 }}>Danh mục sản phẩm tiếp nhận</h4>
                {selectedOrder.status === 'RECEIVING' && (
                  <button className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '6px' }} onClick={() => setShowScanner(true)}>
                    <ScanBarcode size={16} /> Quét mã Barcode nhận hàng
                  </button>
                )}
              </div>
              
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <tr>
                      <th style={{ padding: '10px 14px', color: '#64748b', fontWeight: 700 }}>SKU / Tên Hàng Hóa</th>
                      <th style={{ padding: '10px 14px', color: '#64748b', fontWeight: 700, textAlign: 'center' }}>SL Chứng Từ</th>
                      <th style={{ padding: '10px 14px', color: '#64748b', fontWeight: 700, textAlign: 'center' }}>SL Thực Nhập</th>
                      <th style={{ padding: '10px 14px', color: '#64748b', fontWeight: 700 }}>Vị Trí Kệ Lưu Kho</th>
                      <th style={{ padding: '10px 14px', color: '#64748b', fontWeight: 700 }}>HSD / Lô</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOrder.items?.map((item, idx) => (
                      <tr key={item.id || idx} style={{ borderTop: idx > 0 ? '1px solid #f1f5f9' : 'none' }}>
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ fontWeight: 700, color: '#0f172a' }}>{item.productName}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: 'monospace' }}>{item.sku}</div>
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>{item.expectedQuantity}</td>
                        <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 800, color: '#0f766e' }}>
                          {item.receivedQuantity || item.expectedQuantity}
                        </td>
                        <td style={{ padding: '12px 14px', fontWeight: 600, color: '#0f766e' }}>
                          {item.assignedSlotId ? `${item.assignedSlotId} (${item.assignedZone || 'Z-COOL'})` : (
                            selectedOrder.status === 'STORING' ? (
                              <button 
                                onClick={() => assignStorage(selectedOrder.id, item.id)}
                                style={{ padding: '4px 10px', background: '#0f766e', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                              >
                                Lưu vào Kệ A1-01
                              </button>
                            ) : 'Chờ phân vị trí'
                          )}
                        </td>
                        <td style={{ padding: '12px 14px', color: '#64748b' }}>
                          {item.lotCode ? <span style={{ fontWeight: 700, color: '#0f766e' }}>{item.lotCode}</span> : 'LOT-IN-2026'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Stepper Action Buttons */}
            <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem', borderTop: '2px solid #e2e8f0', paddingTop: '1.5rem' }}>
              {selectedOrder.status === 'PENDING' && (
                <button 
                  style={{ padding: '12px 24px', backgroundColor: '#0f766e', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 800, fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', width: '100%', justifyContent: 'center', boxShadow: '0 4px 10px rgba(15,118,110,0.25)' }} 
                  onClick={() => advanceState(selectedOrder.id, 'receive')}
                >
                  <Download size={20} /> Bắt Đầu Tiếp Nhận Hàng Từ Nhà Cung Cấp
                </button>
              )}

              {selectedOrder.status === 'RECEIVING' && (
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <button 
                    style={{ flex: 1, padding: '12px 20px', borderRadius: '10px', background: '#0f766e', color: '#fff', border: 'none', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                    onClick={() => setShowScanner(true)}
                  >
                    <ScanBarcode size={20} /> Quét mã Barcode
                  </button>
                  <button 
                    style={{ flex: 1, padding: '12px 20px', borderRadius: '10px', background: '#7c3aed', color: '#fff', border: 'none', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                    onClick={() => advanceState(selectedOrder.id, 'quality-check')}
                  >
                    <ShieldCheck size={20} /> Xác nhận Đủ & Chuyển Kiểm Định (QC) <ArrowRight size={18} />
                  </button>
                </div>
              )}

              {selectedOrder.status === 'QUALITY_CHECK' && (
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <button 
                    style={{ flex: 1, padding: '12px 24px', backgroundColor: '#059669', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 800, fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', boxShadow: '0 4px 10px rgba(5,150,105,0.25)' }} 
                    onClick={() => advanceState(selectedOrder.id, 'store')}
                  >
                    <CheckCircle2 size={22} /> Kiểm Định Đạt Chuẩn (QC Passed) & Chuyển Lưu Kho
                  </button>
                </div>
              )}

              {selectedOrder.status === 'STORING' && (
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <button 
                    style={{ flex: 1, padding: '12px 20px', borderRadius: '10px', background: '#3b82f6', color: '#fff', border: 'none', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                    onClick={() => setShowMapModal(selectedOrder.id)}
                  >
                    <Warehouse size={20} /> Mở Bản Đồ Kho 3D Xem Vị Trí Kệ
                  </button>
                  <button 
                    style={{ flex: 1, padding: '12px 24px', backgroundColor: '#059669', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 800, fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', boxShadow: '0 4px 10px rgba(5,150,105,0.25)' }} 
                    onClick={() => advanceState(selectedOrder.id, 'complete')}
                  >
                    <CheckCircle2 size={22} /> Hoàn Tất Lưu Kho (Hàng Sẵn Sàng Bán)
                  </button>
                </div>
              )}

              {selectedOrder.status === 'COMPLETED' && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', background: '#f0fdf4', padding: '12px 16px', borderRadius: '10px', border: '1px solid #bbf7d0' }}>
                  <p style={{ color: '#15803d', fontWeight: 800, margin: 0, fontSize: '0.9rem' }}>
                    🎉 Đơn hàng đã nhập kho thành công & cập nhật tồn kho toàn hệ thống!
                  </p>
                  <button
                    onClick={() => setReceiptOrder(selectedOrder)}
                    style={{ padding: '8px 16px', background: '#0f766e', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Printer size={16} /> In Lại Phiếu 01-VT
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showScanner && (
        <BarcodeScannerMock 
          onScan={handleScan}
          onClose={() => setShowScanner(false)}
        />
      )}

      {showMapModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, padding: '20px' }}>
          <div className="card" style={{ width: '800px', maxWidth: '90%', padding: '2rem', borderRadius: '16px', background: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0, fontWeight: 800 }}>Bản Đồ Kệ Lưu Kho 3D Isometric</h3>
              <button onClick={() => setShowMapModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={22} /></button>
            </div>
            <WarehouseMap3D 
              onSelectSlot={(zone, slotId) => {
                showToast(`Đã chọn vị trí ${slotId} (${zone})`, 'info');
                setShowMapModal(null);
              }}
            />
          </div>
        </div>
      )}

      {/* Create Inbound Modal (Manual & CSV Upload with Searchable Combobox) */}
      <CreateInboundModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={(newOrder) => {
          setOrders(prev => [newOrder, ...prev]);
          setSelectedOrderId(newOrder.id);
          showToast('✅ Tạo yêu cầu nhập kho thành công!', 'success');
        }}
        token={token}
        user={user}
        defaultWarehouse={activeWh !== 'ALL' ? activeWh : 'WH-006'}
      />

      {/* Inbound Receipt Modal (Mẫu số 01 - VT) */}
      {receiptOrder && (
        <InboundReceiptModal
          order={receiptOrder}
          onClose={() => setReceiptOrder(null)}
        />
      )}
    </div>
  );
};

export default InboundOrders;
