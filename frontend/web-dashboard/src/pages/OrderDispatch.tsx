import React, { useState, useEffect } from 'react';
import {
  Inbox,
  PackageCheck,
  Truck,
  CheckCircle2,
  Clock,
  MapPin,
  Search,
  RefreshCw,
  ChevronRight,
  AlertTriangle,
  X,
  Send,
  Phone
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const OUTBOUND_API = 'http://localhost:3007';
const WAREHOUSE_API = 'http://localhost:3005';

interface OrderItem {
  sku: string;
  productName: string;
  requestedQuantity: number;
  unit: string;
}

interface DispatchOrder {
  id: string;
  orderCode: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  totalAmount: number;
  status: string;
  createdAt: string;
  items: OrderItem[];
  warehouseId?: string;
  warehouseCode?: string;
}

interface Warehouse {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  PENDING:             { label: 'Chờ xử lý',       color: '#92400e', bg: '#fef3c7', icon: <Clock size={12} /> },
  PICKING:             { label: 'Đang nhặt hàng',   color: '#1e40af', bg: '#dbeafe', icon: <PackageCheck size={12} /> },
  PACKED:              { label: 'Đã đóng gói',      color: '#5b21b6', bg: '#ede9fe', icon: <PackageCheck size={12} /> },
  READY_FOR_DELIVERY:  { label: 'Sẵn sàng giao',    color: '#065f46', bg: '#d1fae5', icon: <Truck size={12} /> },
  SHIPPED:             { label: 'Đang vận chuyển',  color: '#0369a1', bg: '#e0f2fe', icon: <Truck size={12} /> },
  CONFIRMED:           { label: 'Đã giao thành công', color: '#166534', bg: '#dcfce7', icon: <CheckCircle2 size={12} /> },
};

const OrderDispatch = () => {
  const { token } = useAuth();
  const [orders, setOrders] = useState<DispatchOrder[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedWarehouseCode, setSelectedWarehouseCode] = useState<string>('');
  const [selectedOrder, setSelectedOrder] = useState<DispatchOrder | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    fetchWarehouses();
    fetchOrders();
  }, []);

  const fetchWarehouses = async () => {
    try {
      const res = await fetch(`${WAREHOUSE_API}/warehouses`);
      if (res.ok) setWarehouses(await res.json());
    } catch (e) { console.error(e); }
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${OUTBOUND_API}/outbound-orders`);
      if (res.ok) {
        const data = await res.json();
        const mapped: DispatchOrder[] = (Array.isArray(data) ? data : []).map((o: any) => ({
          id: o.id,
          orderCode: o.orderCode,
          customerName: o.requesterName || o.customerName || 'Khách hàng',
          customerPhone: o.customerPhone || '—',
          deliveryAddress: o.destination || o.deliveryAddress || '—',
          totalAmount: o.totalAmount || 0,
          status: o.status || 'PENDING',
          createdAt: o.createdAt ? new Date(o.createdAt).toLocaleString('vi-VN') : '—',
          items: (o.items || []).map((i: any) => ({
            sku: i.sku,
            productName: i.productName || i.sku,
            requestedQuantity: i.requestedQuantity || 1,
            unit: i.unit || 'Cái',
          })),
          warehouseId: o.warehouseId || '',
          warehouseCode: o.warehouseCode || 'WH-001',
        }));
        setOrders(mapped);
        if (mapped.length > 0) setSelectedOrder(mapped[0]);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  // Advance order status flow
  const NEXT_STATUS: Record<string, string> = {
    PENDING: 'PICKING',
    PICKING: 'PACKED',
    PACKED: 'READY_FOR_DELIVERY',
    READY_FOR_DELIVERY: 'SHIPPED',
  };

  const handleAdvanceStatus = async (order: DispatchOrder) => {
    const next = NEXT_STATUS[order.status];
    if (!next) return;
    setUpdatingId(order.id);
    try {
      const res = await fetch(`${OUTBOUND_API}/outbound-orders/${order.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: next }),
      });
      if (res.ok) {
        await fetchOrders();
      } else {
        alert('Không thể cập nhật trạng thái đơn hàng');
      }
    } catch (e) { console.error(e); }
    finally { setUpdatingId(null); }
  };

  // Filter orders
  const filteredOrders = orders.filter(o => {
    const matchWarehouse = selectedWarehouseCode ? (o.warehouseCode === selectedWarehouseCode) : true;
    const q = searchQuery.toLowerCase();
    const matchSearch = !q || o.orderCode.toLowerCase().includes(q) || o.customerName.toLowerCase().includes(q);
    return matchWarehouse && matchSearch;
  });

  // Count by status for KPI
  const countByStatus = (s: string) => filteredOrders.filter(o => o.status === s).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', background: '#f8fafc', padding: '1.5rem', minHeight: '100vh' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '1.25rem 1.5rem', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.04)' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Send size={22} color="#0f766e" /> Điều Phối Đơn Hàng Theo Kho
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '4px' }}>
            Xem và cập nhật trạng thái xử lý đơn hàng theo từng kho vệ tinh — Nhặt hàng → Đóng gói → Sẵn sàng giao.
          </p>
        </div>
        <button
          onClick={fetchOrders}
          style={{ borderRadius: '10px', fontWeight: 600, padding: '10px 16px', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '6px', border: '1px solid #cbd5e1', cursor: 'pointer', backgroundColor: '#fff' }}
        >
          <RefreshCw size={16} /> Làm mới
        </button>
      </div>

      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
        {[
          { label: 'Chờ xử lý', status: 'PENDING', color: '#f59e0b', icon: <Clock size={18} /> },
          { label: 'Đang nhặt / Đóng gói', status: 'PICKING', color: '#3b82f6', icon: <PackageCheck size={18} /> },
          { label: 'Sẵn sàng giao', status: 'READY_FOR_DELIVERY', color: '#0f766e', icon: <Truck size={18} /> },
          { label: 'Đã giao thành công', status: 'CONFIRMED', color: '#16a34a', icon: <CheckCircle2 size={18} /> },
        ].map(({ label, status, color, icon }) => (
          <div key={status} style={{ background: '#fff', padding: '1.1rem 1.25rem', borderRadius: '14px', border: '1px solid #e2e8f0', borderTop: `4px solid ${color}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: 700, color, textTransform: 'uppercase' }}>
              {icon} {label}
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: '#0f172a', marginTop: '6px' }}>
              {countByStatus(status) + (status === 'PICKING' ? countByStatus('PACKED') : 0)}
            </div>
          </div>
        ))}
      </div>

      {/* Warehouse Filter + Search Bar */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', background: '#fff', padding: '12px 16px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', whiteSpace: 'nowrap' }}>Lọc theo kho:</div>
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', flex: 1 }}>
          <button
            onClick={() => setSelectedWarehouseCode('')}
            style={{ padding: '6px 14px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', border: 'none', backgroundColor: !selectedWarehouseCode ? '#0f766e' : '#f1f5f9', color: !selectedWarehouseCode ? '#fff' : '#475569', whiteSpace: 'nowrap' }}
          >
            🌐 Tất cả
          </button>
          {warehouses.map(wh => (
            <button
              key={wh.code}
              onClick={() => setSelectedWarehouseCode(wh.code)}
              style={{ padding: '6px 14px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', border: 'none', backgroundColor: selectedWarehouseCode === wh.code ? '#0f766e' : '#f1f5f9', color: selectedWarehouseCode === wh.code ? '#fff' : '#475569', whiteSpace: 'nowrap' }}
            >
              {wh.code}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '6px 12px', background: '#f8fafc', minWidth: '200px' }}>
          <Search size={14} color="#94a3b8" />
          <input
            placeholder="Tìm mã đơn, tên KH..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: '0.82rem', width: '100%' }}
          />
        </div>
      </div>

      {/* Main 2-column layout: Order list + Detail panel */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '1.25rem', minHeight: '420px' }}>

        {/* Left: Order list */}
        <div style={{ background: '#fff', borderRadius: '14px', border: '1px solid #e2e8f0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', fontSize: '0.88rem', fontWeight: 800, color: '#1e293b' }}>
            📋 {filteredOrders.length} đơn hàng
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {loading ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>Đang tải đơn hàng...</div>
            ) : filteredOrders.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>Không có đơn hàng nào phù hợp.</div>
            ) : (
              filteredOrders.map(order => {
                const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG['PENDING'];
                const isSelected = selectedOrder?.id === order.id;
                return (
                  <div
                    key={order.id}
                    onClick={() => setSelectedOrder(order)}
                    style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid #f1f5f9',
                      cursor: 'pointer',
                      backgroundColor: isSelected ? '#f0fdf4' : '#fff',
                      borderLeft: isSelected ? '3px solid #0f766e' : '3px solid transparent',
                      transition: 'all 0.1s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f766e' }}>{order.orderCode}</div>
                      <span style={{ fontSize: '0.65rem', fontWeight: 800, padding: '2px 7px', borderRadius: '10px', backgroundColor: cfg.bg, color: cfg.color, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                        {cfg.icon} {cfg.label}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: '4px' }}>{order.customerName}</div>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px', display: 'flex', gap: '8px' }}>
                      <span>🏢 {order.warehouseCode || 'WH-001'}</span>
                      <span>{order.items.length} sản phẩm</span>
                      <span>{Number(order.totalAmount).toLocaleString('vi-VN')}₫</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Detail panel */}
        <div style={{ background: '#fff', borderRadius: '14px', border: '1px solid #e2e8f0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {!selectedOrder ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8', flexDirection: 'column', gap: '8px' }}>
              <Inbox size={48} />
              <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>Chọn một đơn hàng để xem chi tiết</div>
            </div>
          ) : (
            <>
              {/* Detail Header */}
              <div style={{ padding: '14px 18px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f766e' }}>{selectedOrder.orderCode}</div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Tạo lúc: {selectedOrder.createdAt}</div>
                </div>
                {(() => {
                  const cfg = STATUS_CONFIG[selectedOrder.status] || STATUS_CONFIG['PENDING'];
                  return (
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '4px 10px', borderRadius: '12px', backgroundColor: cfg.bg, color: cfg.color, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      {cfg.icon} {cfg.label}
                    </span>
                  );
                })()}
              </div>

              <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', flex: 1 }}>
                
                {/* Customer info */}
                <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '10px 14px', display: 'flex', gap: '20px' }}>
                  <div>
                    <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Khách hàng</div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1e293b', marginTop: '2px' }}>{selectedOrder.customerName}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Điện thoại</div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1e293b', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Phone size={12} /> {selectedOrder.customerPhone}
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Địa chỉ giao hàng</div>
                    <div style={{ fontSize: '0.82rem', color: '#475569', marginTop: '2px', display: 'flex', gap: '4px', alignItems: 'start' }}>
                      <MapPin size={12} style={{ marginTop: '2px', flexShrink: 0 }} /> {selectedOrder.deliveryAddress}
                    </div>
                  </div>
                </div>

                {/* Items list */}
                <div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#475569', marginBottom: '8px', textTransform: 'uppercase' }}>📦 Danh sách sản phẩm ({selectedOrder.items.length})</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {selectedOrder.items.length === 0 ? (
                      <div style={{ color: '#94a3b8', fontSize: '0.82rem' }}>Không có sản phẩm nào</div>
                    ) : selectedOrder.items.map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#f8fafc', borderRadius: '8px' }}>
                        <div>
                          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e293b' }}>{item.productName}</div>
                          <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>SKU: {item.sku}</div>
                        </div>
                        <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f766e' }}>×{item.requestedQuantity} {item.unit}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Total */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '8px 0', borderTop: '1px solid #f1f5f9' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Tổng đơn hàng</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f766e' }}>{Number(selectedOrder.totalAmount).toLocaleString('vi-VN')}₫</div>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              {NEXT_STATUS[selectedOrder.status] && (
                <div style={{ padding: '12px 18px', borderTop: '1px solid #f1f5f9' }}>
                  <button
                    onClick={() => handleAdvanceStatus(selectedOrder)}
                    disabled={updatingId === selectedOrder.id}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '10px',
                      border: 'none',
                      backgroundColor: updatingId === selectedOrder.id ? '#cbd5e1' : '#0f766e',
                      color: '#fff',
                      fontWeight: 800,
                      fontSize: '0.88rem',
                      cursor: updatingId === selectedOrder.id ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 12px rgba(15,118,110,0.25)',
                    }}
                  >
                    <ChevronRight size={16} />
                    {updatingId === selectedOrder.id
                      ? 'Đang cập nhật...'
                      : `Chuyển sang: ${STATUS_CONFIG[NEXT_STATUS[selectedOrder.status]]?.label || NEXT_STATUS[selectedOrder.status]}`}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderDispatch;
