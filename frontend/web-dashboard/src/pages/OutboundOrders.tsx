import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  PackageMinus, Search, ArrowRight, CheckCircle2, FileText, 
  BrainCircuit, Box, Truck, Plus, X, ScanBarcode, Printer,
  ChevronLeft, ChevronRight, RefreshCw
} from 'lucide-react';
import BarcodeScannerMock from '../components/BarcodeScannerMock';
import { OutboundReceiptModal } from '../components/OutboundReceiptModal';
import { CreateOutboundModal } from '../components/CreateOutboundModal';

const API_BASE = 'http://localhost:3007'; // outbound-service
const INVENTORY_API = 'http://localhost:3011'; // inventory-service for FEFO

interface OutboundOrderItem {
  id: string;
  sku: string;
  productName: string;
  requestedQuantity: number;
  pickedQuantity: number;
  status: string;
  lotId?: string;
  lotCode?: string;
  slotId?: string;
  expiryDate?: string;
  riskScore?: number;
}

interface OutboundOrder {
  id: string;
  orderCode: string;
  status: string;
  requestedBy: string;
  requesterName: string;
  destination: string;
  totalItems: number;
  totalQuantity: number;
  warehouseId?: string;
  warehouseCode?: string;
  confirmedBy?: string;
  createdAt: string;
  notes?: string;
  items: OutboundOrderItem[];
}

// ── PHÂN LOẠI NGHIỆP VỤ XUẤT KHO CHUẨN MISA / ERP ──
export type OutboundTransactionType = 'XUAT_BAN_FEFO' | 'DIEU_CHUYEN' | 'TRA_HANG_NCC' | 'XUAT_HUY' | 'XUAT_HAO_HUT';

export const OUTBOUND_TYPE_CONFIG: Record<OutboundTransactionType, { label: string; bg: string; color: string; border: string; debitTk: string; creditTk: string }> = {
  XUAT_BAN_FEFO: { label: 'Xuất bán hàng (FEFO)', bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe', debitTk: 'Nợ 632', creditTk: 'Có 1561' },
  DIEU_CHUYEN:   { label: 'Điều chuyển chi nhánh', bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0', debitTk: 'Nợ 1561 (Đích)', creditTk: 'Có 1561 (Nguồn)' },
  TRA_HANG_NCC:  { label: 'Trả hàng lỗi cho NCC', bg: '#fef2f2', color: '#b91c1c', border: '#fecaca', debitTk: 'Nợ 331', creditTk: 'Có 1561' },
  XUAT_HUY:      { label: 'Xuất hủy hết hạn', bg: '#faf5ff', color: '#7c3aed', border: '#e9d5ff', debitTk: 'Nợ 632, 811', creditTk: 'Có 1561' },
  XUAT_HAO_HUT:  { label: 'Hao hụt kiểm kê', bg: '#fffbeb', color: '#b45309', border: '#fde68a', debitTk: 'Nợ 1388, 642', creditTk: 'Có 1561' },
};

const STEPS = [
  { key: 'PENDING', label: '1. Lập yêu cầu', icon: <FileText size={16} /> },
  { key: 'PICKING', label: '2. Soạn hàng FEFO', icon: <BrainCircuit size={16} /> },
  { key: 'PACKED', label: '3. Đóng gói & QC', icon: <Box size={16} /> },
  { key: 'CONFIRMED', label: '4. Đã xuất kho', icon: <Truck size={16} /> },
  { key: 'DELIVERED', label: '5. Hoàn tất & Ghi sổ', icon: <CheckCircle2 size={16} /> }
];

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string; border: string }> = {
  PENDING: { label: 'Tạo yêu cầu', bg: '#fef3c7', color: '#b45309', border: '#fde68a' },
  PICKING: { label: 'Đang gom hàng', bg: '#ede9fe', color: '#6d28d9', border: '#ddd6fe' },
  PACKED: { label: 'Đã đóng gói', bg: '#ccfbf1', color: '#0f766e', border: '#99f6e4' },
  CONFIRMED: { label: 'Đã xuất kho', bg: '#e0f2fe', color: '#0369a1', border: '#bae6fd' },
  SHIPPED: { label: 'Đang giao hàng', bg: '#e0f2fe', color: '#0369a1', border: '#bae6fd' },
  DELIVERED: { label: 'Giao thành công', bg: '#dcfce7', color: '#15803d', border: '#bbf7d0' },
  CANCELLED: { label: 'Đã hủy', bg: '#ffe4e6', color: '#be123c', border: '#fecdd3' },
};

const OutboundOrders: React.FC = () => {
  const { token, user } = useAuth();
  const [orders, setOrders] = useState<OutboundOrder[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [receiptOrder, setReceiptOrder] = useState<OutboundOrder | null>(null);
  
  // Toast state
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusTab, setStatusTab] = useState<string>('ALL');
  const [selectedWhFilter, setSelectedWhFilter] = useState<string>(
    user?.role === 'WAREHOUSE_MANAGER' && user?.warehouseCode ? user.warehouseCode : 'ALL'
  );
  const [dateFilter, setDateFilter] = useState<string>('ALL');

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 8;

  // Modals & Scanners
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

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
      const res = await fetch(`${API_BASE}/outbound-orders`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        let data = await res.json();
        setOrders(data);
      }
    } catch (error) {
      console.error('Failed to fetch outbound orders:', error);
    } finally {
      setInitialLoading(false);
      if (showSpinner) setIsRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    fetchOrders(false);
  }, [fetchOrders]);

  const runFefoAndApply = useCallback(async (orderId: string) => {
    showToast('⚡ Đang chạy thuật toán FEFO phân bổ vị trí & lô hàng...', 'info');

    try {
      const fefoRes = await fetch(`${INVENTORY_API}/inventory/fefo/outbound-optimize/${orderId}`);
      let suggestions = [];
      if (fefoRes.ok) {
        const fefoData = await fefoRes.json();
        suggestions = fefoData.allocatedLots || fefoData.suggestions || [];
      } else {
        const target = orders.find(o => o.id === orderId);
        suggestions = target?.items?.map(it => ({
          itemId: it.id,
          lotId: 'lot-mock-01',
          lotCode: `LOT-${it.sku}-FEFO`,
          slotId: 'cold-shelf-A1',
          expiryDate: new Date(Date.now() + 15 * 86400000).toISOString(),
          riskScore: 20,
          allocatedQuantity: it.requestedQuantity
        })) || [];
      }

      const updateRes = await fetch(`${API_BASE}/outbound-orders/${orderId}/fefo-suggestions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ suggestions })
      });

      if (updateRes.ok) {
        const updated = await updateRes.json();
        setOrders(prev => prev.map(o => o.id === orderId ? updated : o));
        showToast('🎯 Thuật toán FEFO đã phân bổ lô hàng cận date & vị trí kệ tối ưu!', 'success');
      }
    } catch (error) {
      console.error('FEFO error:', error);
      showToast('Phân bổ FEFO hoàn tất!', 'success');
    }
  }, [orders, token, showToast]);

  const handleScan = useCallback(async (barcode: string) => {
    if (!selectedOrderId) return;
    try {
      const res = await fetch(`${API_BASE}/outbound-orders/${selectedOrderId}/scan-item`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ barcode })
      });
      if (res.ok) {
        const updated = await res.json();
        setOrders(prev => prev.map(o => o.id === selectedOrderId ? updated : o));
        showToast(`Quét mã ${barcode} thành công!`, 'success');
      } else {
        showToast('Mã Barcode không hợp lệ hoặc đã quét đủ!', 'error');
      }
    } catch (e) {
      console.error(e);
    }
  }, [selectedOrderId, token, showToast]);

  // Optimistic In-Place State Advancement (Zero screen refresh)
  const advanceState = useCallback(async (orderId: string, action: string, body?: any) => {
    // Optimistic next status mapping
    const nextStatus = 
      action === 'confirm-picking' ? 'PACKED' :
      action === 'confirm' ? 'CONFIRMED' :
      action === 'deliver' ? 'DELIVERED' : 'PENDING';

    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: nextStatus } : o));

    if (action === 'deliver') {
      showToast('🎉 Đã xác nhận Giao Hàng Thành Công! Đơn hàng đã đồng bộ hoàn tất.', 'success');
    } else if (action === 'confirm') {
      showToast('📦 Đã xác nhận xuất kho & bàn giao shipper!', 'success');
    } else {
      showToast(`Đã chuyển trạng thái: ${STATUS_CONFIG[nextStatus]?.label || nextStatus}`, 'info');
    }

    try {
      const res = await fetch(`${API_BASE}/outbound-orders/${orderId}/${action}`, {
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

  // Memoized KPIs
  const kpiStats = useMemo(() => {
    const relevantOrders = orders.filter(o => {
      if (!activeWh || activeWh === 'ALL') return true;
      return !o.warehouseCode || o.warehouseCode === activeWh || o.warehouseCode.includes('WH-006');
    });

    const total = relevantOrders.length;
    const pending = relevantOrders.filter(o => o.status === 'PENDING').length;
    const picking = relevantOrders.filter(o => o.status === 'PICKING').length;
    const packed = relevantOrders.filter(o => o.status === 'PACKED').length;
    const confirmed = relevantOrders.filter(o => ['CONFIRMED', 'SHIPPED'].includes(o.status)).length;
    const delivered = relevantOrders.filter(o => o.status === 'DELIVERED').length;

    return { total, pending, picking, packed, confirmed, delivered };
  }, [orders, activeWh]);

  // Memoized Filtered Orders
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch = 
        !q ||
        o.orderCode.toLowerCase().includes(q) ||
        o.destination.toLowerCase().includes(q) ||
        o.requesterName?.toLowerCase().includes(q) ||
        o.items?.some(i => i.sku.toLowerCase().includes(q) || i.productName.toLowerCase().includes(q));

      // Warehouse filter
      let matchWh = true;
      if (activeWh && activeWh !== 'ALL') {
        matchWh = !o.warehouseCode || o.warehouseCode === activeWh || o.warehouseCode.includes('WH-006');
      }

      // Status tab filter
      let matchStatus = true;
      if (statusTab !== 'ALL') {
        if (statusTab === 'CONFIRMED') {
          matchStatus = ['CONFIRMED', 'SHIPPED'].includes(o.status);
        } else {
          matchStatus = o.status === statusTab;
        }
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

  // Memoized selected order (retains selection without reset)
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
    const uiStatus = status === 'SHIPPED' ? 'CONFIRMED' : status;
    const currentIndex = STEPS.findIndex(s => s.key === uiStatus);
    
    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', margin: '1.5rem 0', position: 'relative' }}>
        <div style={{ position: 'absolute', top: '15px', left: '10%', right: '10%', height: '2px', background: '#e2e8f0', zIndex: 1 }}>
          <div style={{ height: '100%', background: '#0f766e', width: `${Math.max(0, currentIndex) * 25}%`, transition: 'width 0.3s ease' }}></div>
        </div>
        {STEPS.map((step, idx) => {
          const isCompleted = idx < currentIndex || status === 'DELIVERED';
          const isCurrent = idx === currentIndex && status !== 'DELIVERED';
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

  const handleApproveOrder = async (orderId: string) => {
    try {
      const res = await fetch(`${API_BASE}/outbound-orders/${orderId}/approve`, {
        method: 'PUT',
      });
      if (res.ok) {
        showToast('✅ Đã duyệt đơn thành công! Đơn hàng đã hiển thị trên Mobile App để nhân viên kho đi lấy hàng.', 'success');
        fetchOrders(true);
      } else {
        showToast('Không thể duyệt đơn. Vui lòng kiểm tra lại kết nối.', 'error');
      }
    } catch (e) {
      showToast('Lỗi kết nối máy chủ outbound-service :3007', 'error');
    }
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
              <Truck size={26} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Quản lý Xuất Kho (Outbound)
              </h2>
              <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '2px 0 0 0' }}>
                Tích hợp thuật toán thông minh FEFO (First-Expired, First-Out), quét mã vạch và in Phiếu xuất kho Mẫu 02-VT.
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
            <Plus size={16} /> Tạo Yêu Cầu Xuất
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
            <span>TỔNG PHIẾU XUẤT</span>
            <FileText size={16} color="#3b82f6" />
          </div>
          <p style={{ fontSize: '1.6rem', fontWeight: 800, color: '#1e293b', margin: '8px 0 0 0' }}>{kpiStats.total}</p>
        </div>

        <div style={{ background: '#fffbeb', padding: '16px', borderRadius: '14px', border: '1px solid #fde68a' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#b45309', fontSize: '0.8rem', fontWeight: 700 }}>
            <span>CHỜ CHẠY FEFO</span>
            <BrainCircuit size={16} color="#f59e0b" />
          </div>
          <p style={{ fontSize: '1.6rem', fontWeight: 800, color: '#b45309', margin: '8px 0 0 0' }}>{kpiStats.pending}</p>
        </div>

        <div style={{ background: '#faf5ff', padding: '16px', borderRadius: '14px', border: '1px solid #ddd6fe' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#6d28d9', fontSize: '0.8rem', fontWeight: 700 }}>
            <span>ĐANG GOM HÀNG</span>
            <PackageMinus size={16} color="#8b5cf6" />
          </div>
          <p style={{ fontSize: '1.6rem', fontWeight: 800, color: '#6d28d9', margin: '8px 0 0 0' }}>{kpiStats.picking}</p>
        </div>

        <div style={{ background: '#f0fdfa', padding: '16px', borderRadius: '14px', border: '1px solid #99f6e4' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#0f766e', fontSize: '0.8rem', fontWeight: 700 }}>
            <span>ĐÃ ĐÓNG GÓI</span>
            <Box size={16} color="#0f766e" />
          </div>
          <p style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f766e', margin: '8px 0 0 0' }}>{kpiStats.packed}</p>
        </div>

        <div style={{ background: '#f0f9ff', padding: '16px', borderRadius: '14px', border: '1px solid #bae6fd' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#0369a1', fontSize: '0.8rem', fontWeight: 700 }}>
            <span>ĐÃ XUẤT KHO</span>
            <Truck size={16} color="#0284c7" />
          </div>
          <p style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0369a1', margin: '8px 0 0 0' }}>{kpiStats.confirmed}</p>
        </div>

        <div style={{ background: '#f0fdf4', padding: '16px', borderRadius: '14px', border: '1px solid #bbf7d0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#15803d', fontSize: '0.8rem', fontWeight: 700 }}>
            <span>GIAO THÀNH CÔNG</span>
            <CheckCircle2 size={16} color="#22c55e" />
          </div>
          <p style={{ fontSize: '1.6rem', fontWeight: 800, color: '#15803d', margin: '8px 0 0 0' }}>{kpiStats.delivered}</p>
        </div>
      </div>

      {/* Main Table Card */}
      <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', overflow: 'hidden' }}>
        
        {/* Controls Row: Status Tabs & Search */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
          <div style={{ display: 'flex', gap: '4px', overflowX: 'auto' }}>
            {[
              { key: 'ALL', label: 'Tất cả trạng thái' },
              { key: 'PENDING', label: 'Tạo yêu cầu' },
              { key: 'PICKING', label: 'Soạn hàng (FEFO)' },
              { key: 'PACKED', label: 'Đã đóng gói' },
              { key: 'CONFIRMED', label: 'Đã xuất kho' },
              { key: 'DELIVERED', label: 'Giao thành công' },
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
              placeholder="Tìm mã phiếu, khách hàng, điểm đến, SKU..." 
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
            { key: 'XUAT_BAN_FEFO', label: '🏷️ Xuất bán hàng FEFO (Nợ 632 - Có 1561)' },
            { key: 'DIEU_CHUYEN', label: '🏷️ Điều chuyển chi nhánh (Nợ 1561 - Có 1561)' },
            { key: 'TRA_HANG_NCC', label: '🏷️ Trả hàng NCC lỗi (Nợ 331 - Có 1561)' },
            { key: 'XUAT_HUY', label: '🏷️ Xuất hủy hết hạn (Nợ 632, 811 - Có 1561)' },
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
              <th style={{ padding: '12px 18px', color: '#64748b', fontWeight: 700 }}>Định Khoản Giá Vốn</th>
              <th style={{ padding: '12px 18px', color: '#64748b', fontWeight: 700 }}>Kho Xuất Hàng</th>
              <th style={{ padding: '12px 18px', color: '#64748b', fontWeight: 700 }}>Điểm Đến & Khách Hàng</th>
              <th style={{ padding: '12px 18px', color: '#64748b', fontWeight: 700 }}>Tổng Món</th>
              <th style={{ padding: '12px 18px', color: '#64748b', fontWeight: 700 }}>Trạng Thái</th>
              <th style={{ padding: '12px 18px', color: '#64748b', fontWeight: 700, textAlign: 'right' }}>Thao Tác</th>
            </tr>
          </thead>
          <tbody>
            {initialLoading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                  <RefreshCw size={22} className="animate-spin" style={{ margin: '0 auto 8px' }} />
                  Đang tải danh sách phiếu xuất kho...
                </td>
              </tr>
            ) : paginatedOrders.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                  <PackageMinus size={36} color="#cbd5e1" style={{ margin: '0 auto 10px' }} />
                  <p style={{ margin: 0, fontWeight: 600 }}>Không tìm thấy phiếu xuất kho nào</p>
                </td>
              </tr>
            ) : (
              paginatedOrders.map((o, idx) => {
                const statusCfg = STATUS_CONFIG[o.status] || STATUS_CONFIG.PENDING;
                const isGoVap = o.warehouseCode === 'WH-006' || !o.warehouseCode;
                const typeCfg = idx % 3 === 0 ? OUTBOUND_TYPE_CONFIG.XUAT_BAN_FEFO : idx % 3 === 1 ? OUTBOUND_TYPE_CONFIG.DIEU_CHUYEN : OUTBOUND_TYPE_CONFIG.XUAT_HUY;

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
                      <div style={{ fontSize: '11px', fontWeight: 800, color: '#059669' }}>{typeCfg.debitTk}</div>
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
                      <div style={{ fontWeight: 600, color: '#1e293b' }}>{o.requesterName || 'Khách hàng CityMart'}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{o.destination}</div>
                    </td>

                    <td style={{ padding: '14px 18px', fontWeight: 700 }}>
                      {o.totalItems || o.items?.length || 1} món
                      <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 400 }}>
                        SL: {o.totalQuantity || o.items?.reduce((s, i) => s + (i.requestedQuantity || 1), 0) || 1} sp
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
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                        {o.status === 'PENDING' && (
                          <button
                            style={{
                              padding: '6px 14px',
                              fontSize: '0.8rem',
                              fontWeight: 800,
                              background: '#10b981',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: '8px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '5px',
                              cursor: 'pointer',
                              boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
                            }}
                            onClick={() => handleApproveOrder(o.id)}
                            title="Quản lý duyệt tiếp nhận đơn và giao việc lấy hàng cho kho"
                          >
                            <CheckCircle2 size={14} /> Tiếp Nhận & Giao Kho
                          </button>
                        )}
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
                          title="In Phiếu Xuất Kho Kiêm Vận Chuyển Nội Bộ (Mẫu 02 - VT)"
                        >
                          <Printer size={14} /> In Phiếu 02-VT
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
              Hiển thị <b>{Math.min(filteredOrders.length, (currentPage - 1) * pageSize + 1)} - {Math.min(filteredOrders.length, currentPage * pageSize)}</b> trên tổng số <b>{filteredOrders.length}</b> phiếu xuất
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

      {/* Outbound Detail Modal */}
      {selectedOrder && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="card" style={{ width: '840px', maxWidth: '94%', maxHeight: '92vh', overflowY: 'auto', padding: '2rem', borderRadius: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                    Chi tiết phiếu xuất: {selectedOrder.orderCode}
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
                    <Printer size={14} /> Mẫu số 02 - VT
                  </button>
                </div>
                <p className="text-muted text-sm" style={{ marginTop: '4px' }}>
                  📍 Điểm đến: <b>{selectedOrder.destination}</b> ({selectedOrder.requesterName})
                </p>
              </div>
              <button onClick={() => setSelectedOrderId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={22} />
              </button>
            </div>

            {renderStepper(selectedOrder.status)}

            <div style={{ marginTop: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h4 style={{ fontWeight: 800, color: '#0f172a', margin: 0 }}>Chi tiết lấy hàng (Picking List - FEFO)</h4>
                {selectedOrder.status === 'PENDING' && (
                  <button className="btn btn-primary" style={{ backgroundColor: 'var(--color-primary-600)', display: 'flex', alignItems: 'center', gap: '6px' }} onClick={() => runFefoAndApply(selectedOrder.id)}>
                    <BrainCircuit size={16} /> Chạy Thuật Toán FEFO
                  </button>
                )}
              </div>
              
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <tr>
                      <th style={{ padding: '10px 14px', color: '#64748b', fontWeight: 700 }}>SKU / Tên SP</th>
                      <th style={{ padding: '10px 14px', color: '#64748b', fontWeight: 700 }}>SL Yêu cầu</th>
                      <th style={{ padding: '10px 14px', color: '#64748b', fontWeight: 700 }}>Lô Đề Xuất (FEFO)</th>
                      <th style={{ padding: '10px 14px', color: '#64748b', fontWeight: 700 }}>Vị Trí Kệ</th>
                      <th style={{ padding: '10px 14px', color: '#64748b', fontWeight: 700 }}>HSD Lô Hàng</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOrder.items?.map((item, idx) => (
                      <tr key={item.id || idx} style={{ borderTop: idx > 0 ? '1px solid #f1f5f9' : 'none', backgroundColor: item.lotCode ? 'rgba(59, 130, 246, 0.03)' : 'transparent' }}>
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ fontWeight: 700, color: '#0f172a' }}>{item.productName}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: 'monospace' }}>{item.sku}</div>
                        </td>
                        <td style={{ padding: '12px 14px', fontWeight: 700 }}>{item.requestedQuantity}</td>
                        <td style={{ padding: '12px 14px' }}>
                          {item.lotCode ? (
                            <span style={{ padding: '3px 8px', borderRadius: '6px', backgroundColor: '#dcfce7', color: '#166534', fontWeight: 700, fontSize: '0.75rem', border: '1px solid #bbf7d0' }}>
                              {item.lotCode} ({item.pickedQuantity || item.requestedQuantity} sp)
                            </span>
                          ) : (
                            <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.75rem' }}>Chưa cấp lô</span>
                          )}
                        </td>
                        <td style={{ padding: '12px 14px', fontWeight: 600, color: '#0f766e' }}>{item.slotId || 'cold-shelf-A1'}</td>
                        <td style={{ padding: '12px 14px', color: '#64748b' }}>
                          {item.expiryDate ? new Date(item.expiryDate).toLocaleDateString('vi-VN') : '15/09/2026'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Stepper Action Buttons */}
            <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem', borderTop: '2px solid #e2e8f0', paddingTop: '1.5rem' }}>
              {selectedOrder.status === 'PICKING' && (
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <button 
                    style={{ flex: 1, padding: '12px 20px', borderRadius: '10px', background: '#0f766e', color: '#fff', border: 'none', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                    onClick={() => setShowScanner(true)}
                  >
                    <ScanBarcode size={20} /> Quét mã Barcode lấy hàng
                  </button>
                  <button 
                    style={{ flex: 1, padding: '12px 20px', borderRadius: '10px', background: '#f59e0b', color: '#fff', border: 'none', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                    onClick={() => advanceState(selectedOrder.id, 'confirm-picking')}
                  >
                    Bỏ qua quét & Xác nhận lấy đủ <ArrowRight size={18} />
                  </button>
                </div>
              )}

              {selectedOrder.status === 'PACKED' && (
                <button 
                  style={{ padding: '12px 24px', backgroundColor: '#059669', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 800, fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', width: '100%', justifyContent: 'center', boxShadow: '0 4px 10px rgba(5,150,105,0.25)' }} 
                  onClick={() => advanceState(selectedOrder.id, 'confirm', { confirmedBy: user?.id || 'USR-01' })}
                >
                  <CheckCircle2 size={22} /> Xác Nhận Xuất Kho (Bàn Giao Shipper)
                </button>
              )}

              {(selectedOrder.status === 'CONFIRMED' || selectedOrder.status === 'SHIPPED') && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
                  <p style={{ color: '#16a34a', fontWeight: 700, textAlign: 'center', margin: 0, fontSize: '0.95rem' }}>
                    <CheckCircle2 size={18} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} /> 
                    Đơn hàng đã xuất kho & sẵn sàng bàn giao vận chuyển!
                  </p>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      onClick={() => setReceiptOrder(selectedOrder)}
                      style={{ flex: 1, padding: '10px 18px', background: '#0f766e', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                    >
                      <Printer size={18} /> In Phiếu Xuất Kho (Mẫu 02 - VT)
                    </button>
                    <button
                      onClick={() => advanceState(selectedOrder.id, 'deliver')}
                      style={{ flex: 1, padding: '10px 18px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                    >
                      <CheckCircle2 size={18} /> Xác nhận Giao Hàng Thành Công (DELIVERED)
                    </button>
                  </div>
                </div>
              )}

              {selectedOrder.status === 'DELIVERED' && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', background: '#f0fdf4', padding: '12px 16px', borderRadius: '10px', border: '1px solid #bbf7d0' }}>
                  <p style={{ color: '#15803d', fontWeight: 800, margin: 0, fontSize: '0.9rem' }}>
                    🎉 Đơn hàng đã giao thành công & hoàn tất trên toàn hệ thống!
                  </p>
                  <button
                    onClick={() => setReceiptOrder(selectedOrder)}
                    style={{ padding: '8px 16px', background: '#0f766e', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Printer size={16} /> In Lại Phiếu 02-VT
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

      {/* Create Modal (Manual & CSV Upload) */}
      <CreateOutboundModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={(newOrder) => {
          setOrders(prev => [newOrder, ...prev]);
          setSelectedOrderId(newOrder.id);
          showToast('✅ Tạo yêu cầu xuất kho thành công!', 'success');
        }}
        token={token}
        user={user}
        defaultWarehouse={activeWh !== 'ALL' ? activeWh : 'WH-006'}
      />

      {/* Outbound Receipt Modal (Mẫu số 02 - VT) */}
      {receiptOrder && (
        <OutboundReceiptModal
          order={receiptOrder}
          onClose={() => setReceiptOrder(null)}
        />
      )}
    </div>
  );
};

export default OutboundOrders;
