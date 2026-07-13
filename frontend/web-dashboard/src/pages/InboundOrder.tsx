import { useState, useEffect } from 'react';
import { 
  ClipboardCheck, 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  Plus, 
  Trash2, 
  RefreshCcw, 
  PlusCircle,
  Truck
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const INBOUND_API = 'http://localhost:3006'; // inbound-service
const PRODUCT_API = 'http://localhost:3010'; // product-service
const INVENTORY_API = 'http://localhost:3011'; // inventory-service

interface InboundOrderItem {
  id: string;
  sku: string;
  productName: string;
  expectedQuantity: number;
  receivedQuantity: number;
  productionDate?: string;
  expiryDate: string;
  lotCode?: string;
  assignedZone?: string;
  assignedSlotId?: string;
  status: string;
  notes?: string;
}

interface InboundOrder {
  id: string;
  orderCode: string;
  supplierId: string;
  supplierName: string;
  status: string; // PENDING | RECEIVING | QUALITY_CHECK | STORING | COMPLETED | REJECTED
  expectedDate?: string;
  receivedDate?: string;
  totalItems: number;
  totalQuantity: number;
  qualityCheckPassed: boolean;
  notes?: string;
  createdBy: string;
  items: InboundOrderItem[];
  createdAt: string;
}

interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
}

interface Supplier {
  id: string;
  name: string;
}

const InboundOrder = () => {
  const { token, user } = useAuth();
  const [orders, setOrders] = useState<InboundOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<InboundOrder | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [activeTab, setActiveTab] = useState<'list' | 'create'>('list');
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Form states for creating order
  const [supplierId, setSupplierId] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [notes, setNotes] = useState('');
  const [orderItems, setOrderItems] = useState<Array<{
    sku: string;
    productName: string;
    expectedQuantity: number;
    expiryDate: string;
    productionDate?: string;
  }>>([]);

  // Form states for adding single item to request
  const [itemSku, setItemSku] = useState('');
  const [itemQty, setItemQty] = useState(1);
  const [itemExpiry, setItemExpiry] = useState('');
  const [itemProduction, setItemProduction] = useState('');

  // Allocation state for storing step
  const [allocations, setAllocations] = useState<Record<string, { zone: string; slotId: string; lotCode: string }>>({});

  // Received quantity states
  const [receivedQtys, setReceivedQtys] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchOrders();
    fetchProducts();
    fetchSuppliers();
  }, [statusFilter]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const url = statusFilter 
        ? `${INBOUND_API}/inbound-orders?status=${statusFilter}`
        : `${INBOUND_API}/inbound-orders`;
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
        // Refresh selected order if open
        if (selectedOrder) {
          const updated = data.find((o: InboundOrder) => o.id === selectedOrder.id);
          if (updated) setSelectedOrder(updated);
        }
      }
    } catch (error) {
      console.error('Failed to fetch inbound orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch(`${PRODUCT_API}/products`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const res = await fetch(`${INVENTORY_API}/inventory/suppliers`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSuppliers(data);
      }
    } catch (error) {
      console.error('Failed to fetch suppliers:', error);
    }
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId) {
      alert('Vui lòng chọn nhà cung cấp');
      return;
    }
    if (orderItems.length === 0) {
      alert('Vui lòng thêm ít nhất một sản phẩm vào đơn hàng');
      return;
    }

    const supplier = suppliers.find(s => s.id === supplierId);

    const payload = {
      supplierId,
      supplierName: supplier?.name || 'Unknown Supplier',
      expectedDate,
      notes,
      items: orderItems,
      createdBy: user?.name || 'admin'
    };

    try {
      const res = await fetch(`${INBOUND_API}/inbound-orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        alert('Tạo đơn nhập kho thành công!');
        setSupplierId('');
        setExpectedDate('');
        setNotes('');
        setOrderItems([]);
        setActiveTab('list');
        fetchOrders();
      } else {
        const err = await res.json();
        alert(`Lỗi: ${err.message || 'Không thể tạo đơn hàng'}`);
      }
    } catch (error) {
      console.error('Failed to create inbound order:', error);
      alert('Lỗi kết nối đến dịch vụ nhập kho');
    }
  };

  const addItemToRequest = () => {
    if (!itemSku) {
      alert('Vui lòng chọn sản phẩm');
      return;
    }
    if (itemQty <= 0) {
      alert('Số lượng phải lớn hơn 0');
      return;
    }
    if (!itemExpiry) {
      alert('Vui lòng chọn hạn sử dụng');
      return;
    }

    const product = products.find(p => p.sku === itemSku);
    if (!product) return;

    // Check if duplicate SKU
    if (orderItems.some(i => i.sku === itemSku)) {
      alert('Sản phẩm đã có trong danh sách yêu cầu. Hãy xoá đi và thêm lại nếu muốn đổi số lượng.');
      return;
    }

    setOrderItems([
      ...orderItems,
      {
        sku: itemSku,
        productName: product.name,
        expectedQuantity: itemQty,
        expiryDate: itemExpiry,
        productionDate: itemProduction || undefined
      }
    ]);

    setItemSku('');
    setItemQty(1);
    setItemExpiry('');
    setItemProduction('');
  };

  const removeRequestItem = (sku: string) => {
    setOrderItems(orderItems.filter(i => i.sku !== sku));
  };

  // Vòng đời đơn nhập kho
  const startReceiving = async (id: string) => {
    try {
      const res = await fetch(`${INBOUND_API}/inbound-orders/${id}/receive`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        alert('Bắt đầu tiếp nhận đơn hàng. Vui lòng kiểm đếm số lượng thực nhận.');
        fetchOrders();
      } else {
        const err = await res.json();
        alert(`Lỗi: ${err.message}`);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const updateReceivedQty = async (itemId: string) => {
    const qty = receivedQtys[itemId];
    if (qty === undefined || qty < 0) {
      alert('Số lượng không hợp lệ');
      return;
    }
    try {
      const res = await fetch(`${INBOUND_API}/inbound-orders/items/${itemId}/quantity`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ receivedQuantity: qty })
      });
      if (res.ok) {
        alert('Đã cập nhật số lượng nhận sản phẩm.');
        fetchOrders();
      } else {
        const err = await res.json();
        alert(`Lỗi: ${err.message}`);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const sendToQualityCheck = async (id: string) => {
    try {
      const res = await fetch(`${INBOUND_API}/inbound-orders/${id}/quality-check`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        alert('Đơn hàng đã được chuyển sang bộ phận QC để kiểm tra chất lượng vệ sinh ATTP.');
        fetchOrders();
      } else {
        const err = await res.json();
        alert(`Lỗi: ${err.message}`);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const submitQCResult = async (id: string, qualityPassed: boolean) => {
    try {
      const res = await fetch(`${INBOUND_API}/inbound-orders/${id}/store`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ qualityPassed })
      });
      if (res.ok) {
        if (qualityPassed) {
          alert('QC xác nhận đạt chất lượng. Vui lòng phân bổ vị trí lưu trữ (Shelves/Slots).');
        } else {
          alert('QC xác nhận không đạt chất lượng. Đơn hàng đã bị từ chối nhập kho.');
        }
        fetchOrders();
      } else {
        const err = await res.json();
        alert(`Lỗi: ${err.message}`);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const submitAllocation = async (itemId: string) => {
    const alloc = allocations[itemId];
    if (!alloc || !alloc.zone || !alloc.slotId || !alloc.lotCode) {
      alert('Vui lòng điền đầy đủ Khu vực, Vị trí và Số lô');
      return;
    }
    try {
      const res = await fetch(`${INBOUND_API}/inbound-orders/items/${itemId}/assign`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(alloc)
      });
      if (res.ok) {
        alert('Đã gán vị trí lưu kho cho sản phẩm.');
        fetchOrders();
      } else {
        const err = await res.json();
        alert(`Lỗi: ${err.message}`);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const completeOrder = async (id: string) => {
    try {
      const res = await fetch(`${INBOUND_API}/inbound-orders/${id}/complete`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        alert('Đơn nhập kho hoàn tất! Các lô hàng đã được tự động thêm vào Tồn kho chính.');
        fetchOrders();
      } else {
        const err = await res.json();
        alert(`Lỗi: ${err.message}`);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'PENDING': return 'badge-neutral';
      case 'RECEIVING': return 'badge-warning';
      case 'QUALITY_CHECK': return 'badge-warning';
      case 'STORING': return 'badge-warning';
      case 'COMPLETED': return 'badge-success';
      case 'REJECTED': return 'badge-danger';
      default: return 'badge-neutral';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PENDING': return 'Chờ tiếp nhận';
      case 'RECEIVING': return 'Đang đếm hàng';
      case 'QUALITY_CHECK': return 'Kiểm tra QC';
      case 'STORING': return 'Đang xếp kệ';
      case 'COMPLETED': return 'Hoàn tất';
      case 'REJECTED': return 'Đã từ chối';
      default: return status;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-6)' }}>
      {/* Tabs */}
      <div className="flex items-center justify-between" style={{ borderBottom: '1px solid var(--color-neutral-200)', paddingBottom: '1px' }}>
        <div className="flex" style={{ gap: '1rem' }}>
          <button 
            onClick={() => { setActiveTab('list'); setSelectedOrder(null); }}
            style={{
              padding: '0.75rem 1rem',
              fontWeight: 600,
              fontSize: '0.875rem',
              borderBottom: activeTab === 'list' ? '2px solid var(--color-primary-600)' : 'none',
              color: activeTab === 'list' ? 'var(--color-primary-600)' : 'var(--color-neutral-500)',
            }}
          >
            Đơn Nhập Kho
          </button>
          <button 
            onClick={() => setActiveTab('create')}
            style={{
              padding: '0.75rem 1rem',
              fontWeight: 600,
              fontSize: '0.875rem',
              borderBottom: activeTab === 'create' ? '2px solid var(--color-primary-600)' : 'none',
              color: activeTab === 'create' ? 'var(--color-primary-600)' : 'var(--color-neutral-500)',
            }}
          >
            <Plus size={16} style={{ marginRight: 4, display: 'inline' }} /> Tạo Đơn Mới
          </button>
        </div>

        {activeTab === 'list' && (
          <div className="flex items-center gap-2">
            <select 
              value={statusFilter} 
              onChange={e => setStatusFilter(e.target.value)}
              style={{ padding: '0.375rem 0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-neutral-300)', fontSize: '0.875rem' }}
            >
              <option value="">-- Tất cả trạng thái --</option>
              <option value="PENDING">Chờ tiếp nhận (PENDING)</option>
              <option value="RECEIVING">Đang đếm hàng (RECEIVING)</option>
              <option value="QUALITY_CHECK">Kiểm tra QC (QUALITY_CHECK)</option>
              <option value="STORING">Đang xếp kệ (STORING)</option>
              <option value="COMPLETED">Hoàn tất (COMPLETED)</option>
              <option value="REJECTED">Đã từ chối (REJECTED)</option>
            </select>
            <button className="btn btn-outline" onClick={fetchOrders} style={{ padding: '0.375rem' }}>
              <RefreshCcw size={16} />
            </button>
          </div>
        )}
      </div>

      {activeTab === 'list' ? (
        <div style={{ display: 'grid', gridTemplateColumns: selectedOrder ? '1fr 1.2fr' : '1fr', gap: 'var(--spacing-5)', alignItems: 'start' }}>
          {/* List panel */}
          <div className="card" style={{ padding: 0 }}>
            <div style={{ padding: 'var(--spacing-4) var(--spacing-5)', borderBottom: '1px solid var(--color-neutral-200)', display: 'flex', justifyContent: 'between' }}>
              <h3 className="font-semibold" style={{ fontSize: '1rem' }}>Danh sách đơn hàng</h3>
            </div>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Mã Đơn</th>
                    <th>Nhà Cung Cấp</th>
                    <th>Số SKU</th>
                    <th>Tổng SL</th>
                    <th>Trạng Thái</th>
                    <th>Ngày Dự Kiến</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>Đang tải dữ liệu đơn nhập...</td></tr>
                  ) : orders.length === 0 ? (
                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>Không tìm thấy đơn nhập kho nào.</td></tr>
                  ) : (
                    orders.map((o) => (
                      <tr 
                        key={o.id} 
                        onClick={() => {
                          setSelectedOrder(o);
                          // Initialize received quantity states
                          const qtys: Record<string, number> = {};
                          o.items.forEach(i => {
                            qtys[i.id] = i.receivedQuantity || i.expectedQuantity;
                          });
                          setReceivedQtys(qtys);
                        }}
                        style={{ cursor: 'pointer', backgroundColor: selectedOrder?.id === o.id ? 'var(--color-primary-50)' : 'transparent' }}
                      >
                        <td className="font-semibold">{o.orderCode}</td>
                        <td>
                          <div className="font-medium">{o.supplierName}</div>
                          <div className="text-muted" style={{ fontSize: '0.75rem' }}>ID: {o.supplierId.slice(0, 8)}...</div>
                        </td>
                        <td>{o.totalItems}</td>
                        <td>{o.totalQuantity}</td>
                        <td><span className={`badge ${getStatusBadgeClass(o.status)}`}>{getStatusLabel(o.status)}</span></td>
                        <td>{o.expectedDate ? new Date(o.expectedDate).toLocaleDateString('vi-VN') : 'N/A'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Details panel */}
          {selectedOrder && (
            <div className="card" style={{ gap: 'var(--spacing-4)' }}>
              <div className="flex justify-between items-center" style={{ borderBottom: '1px solid var(--color-neutral-200)', paddingBottom: 'var(--spacing-3)' }}>
                <div>
                  <span className={`badge ${getStatusBadgeClass(selectedOrder.status)}`} style={{ marginBottom: 4 }}>
                    {getStatusLabel(selectedOrder.status)}
                  </span>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Chi tiết đơn: {selectedOrder.orderCode}</h3>
                </div>
                <button onClick={() => setSelectedOrder(null)} style={{ color: 'var(--color-neutral-400)', fontWeight: 'bold' }}> đóng </button>
              </div>

              {/* Progress Stepper */}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0.5rem', backgroundColor: 'var(--color-neutral-100)', borderRadius: 'var(--radius-lg)', fontSize: '0.75rem', fontWeight: 600 }}>
                <span style={{ color: selectedOrder.status === 'PENDING' ? 'var(--color-primary-600)' : 'var(--color-neutral-400)' }}>1. Chờ duyệt</span>
                <span style={{ color: selectedOrder.status === 'RECEIVING' ? 'var(--color-primary-600)' : 'var(--color-neutral-400)' }}>2. Đếm số lượng</span>
                <span style={{ color: selectedOrder.status === 'QUALITY_CHECK' ? 'var(--color-primary-600)' : 'var(--color-neutral-400)' }}>3. Kiểm QC</span>
                <span style={{ color: selectedOrder.status === 'STORING' ? 'var(--color-primary-600)' : 'var(--color-neutral-400)' }}>4. Xếp kệ</span>
                <span style={{ color: selectedOrder.status === 'COMPLETED' ? 'var(--color-primary-600)' : selectedOrder.status === 'REJECTED' ? 'var(--color-danger-500)' : 'var(--color-neutral-400)' }}>5. Kết thúc</span>
              </div>

              {/* General info */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-3)', fontSize: '0.875rem' }}>
                <div>
                  <p className="text-muted">Nhà cung cấp:</p>
                  <p className="font-semibold">{selectedOrder.supplierName}</p>
                </div>
                <div>
                  <p className="text-muted">Người tạo đơn:</p>
                  <p className="font-semibold">{selectedOrder.createdBy}</p>
                </div>
                <div>
                  <p className="text-muted">Ngày tạo:</p>
                  <p>{new Date(selectedOrder.createdAt).toLocaleString('vi-VN')}</p>
                </div>
                <div>
                  <p className="text-muted">Ngày nhận hàng:</p>
                  <p>{selectedOrder.receivedDate ? new Date(selectedOrder.receivedDate).toLocaleString('vi-VN') : 'Chưa tiếp nhận'}</p>
                </div>
                {selectedOrder.notes && (
                  <div style={{ gridColumn: 'span 2' }}>
                    <p className="text-muted">Ghi chú:</p>
                    <p style={{ fontStyle: 'italic' }}>{selectedOrder.notes}</p>
                  </div>
                )}
              </div>

              {/* Action Buttons depending on Status */}
              <div style={{ padding: '0.5rem 0' }}>
                {selectedOrder.status === 'PENDING' && (
                  <button className="btn btn-primary" onClick={() => startReceiving(selectedOrder.id)} style={{ width: '100%', justifyContent: 'center' }}>
                    <Truck size={18} /> Bắt đầu tiếp nhận hàng & Đếm số lượng
                  </button>
                )}

                {selectedOrder.status === 'RECEIVING' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div className="text-warning font-semibold" style={{ fontSize: '0.875rem' }}>
                      * Hãy nhập số lượng thực nhận của từng mặt hàng dưới đây trước khi bấm chuyển QC.
                    </div>
                    <button className="btn btn-primary" onClick={() => sendToQualityCheck(selectedOrder.id)} style={{ width: '100%', justifyContent: 'center' }}>
                      <ClipboardCheck size={18} /> Hoàn tất đếm hàng, Chuyển sang kiểm QC
                    </button>
                  </div>
                )}

                {selectedOrder.status === 'QUALITY_CHECK' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div className="font-semibold" style={{ fontSize: '0.875rem' }}>
                      Xác nhận chất lượng toàn bộ lô hàng từ QC:
                    </div>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                      <button className="btn btn-primary" onClick={() => submitQCResult(selectedOrder.id, true)} style={{ flex: 1, backgroundColor: 'var(--color-primary-600)', justifyContent: 'center' }}>
                        <ShieldCheck size={18} /> ĐẠT CHẤT LƯỢNG (Lưu kho)
                      </button>
                      <button className="btn btn-outline" onClick={() => submitQCResult(selectedOrder.id, false)} style={{ flex: 1, color: 'var(--color-danger-500)', borderColor: 'var(--color-danger-500)', justifyContent: 'center' }}>
                        <XCircle size={18} /> KHÔNG ĐẠT QC (Từ chối)
                      </button>
                    </div>
                  </div>
                )}

                {selectedOrder.status === 'STORING' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div className="text-success font-semibold" style={{ fontSize: '0.875rem' }}>
                      * Gán vị trí ô lưu kho (Slot ID) và Mã lô cho từng sản phẩm.
                    </div>
                    <button 
                      className="btn btn-primary" 
                      onClick={() => completeOrder(selectedOrder.id)} 
                      style={{ width: '100%', justifyContent: 'center' }}
                      disabled={selectedOrder.items.some(i => i.status !== 'STORED' && i.status !== 'REJECTED')}
                    >
                      <CheckCircle2 size={18} /> Hoàn tất Đơn nhập kho
                    </button>
                  </div>
                )}
              </div>

              {/* Items Table */}
              <div style={{ marginTop: '0.5rem' }}>
                <h4 className="font-semibold" style={{ marginBottom: '0.5rem', fontSize: '0.875rem' }}>Sản phẩm thuộc đơn hàng</h4>
                <div style={{ border: '1px solid var(--color-neutral-200)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                  <table className="table" style={{ fontSize: '0.875rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: 'var(--color-neutral-50)' }}>
                        <th>Tên sản phẩm / SKU</th>
                        <th>Yêu cầu</th>
                        <th>Thực nhận</th>
                        {selectedOrder.status === 'STORING' && <th>Lưu kho</th>}
                        {selectedOrder.status === 'COMPLETED' && <th>Vị trí đã lưu</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {selectedOrder.items.map((item) => (
                        <tr key={item.id}>
                          <td>
                            <div className="font-semibold">{item.productName}</div>
                            <div className="text-muted" style={{ fontSize: '0.75rem' }}>SKU: {item.sku}</div>
                            <div className="text-muted" style={{ fontSize: '0.75rem' }}>HSD: {new Date(item.expiryDate).toLocaleDateString('vi-VN')}</div>
                          </td>
                          <td>{item.expectedQuantity}</td>
                          <td>
                            {selectedOrder.status === 'RECEIVING' ? (
                              <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                                <input 
                                  type="number" 
                                  min="0"
                                  value={receivedQtys[item.id] !== undefined ? receivedQtys[item.id] : item.receivedQuantity}
                                  onChange={e => setReceivedQtys({ ...receivedQtys, [item.id]: parseInt(e.target.value) || 0 })}
                                  style={{ width: '60px', padding: '0.25rem', borderRadius: '4px', border: '1px solid var(--border)' }}
                                />
                                <button onClick={() => updateReceivedQty(item.id)} style={{ color: 'var(--color-primary-600)', padding: '0.25rem', fontSize: '0.75rem', fontWeight: 600 }}>Lưu</button>
                              </div>
                            ) : (
                              <span>{item.receivedQuantity}</span>
                            )}
                          </td>

                          {/* Allocation workflow in STORING state */}
                          {selectedOrder.status === 'STORING' && (
                            <td>
                              {item.status === 'STORED' ? (
                                <div>
                                  <span className="badge badge-success">Đã lưu</span>
                                  <div style={{ fontSize: '0.75rem', color: 'var(--color-neutral-600)', fontWeight: 500 }}>Lô: {item.lotCode}</div>
                                  <div style={{ fontSize: '0.75rem', color: 'var(--color-neutral-500)' }}>Vị trí: {item.assignedSlotId} ({item.assignedZone})</div>
                                </div>
                              ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', padding: '0.5rem 0' }}>
                                  <input 
                                    placeholder="Mã Lô (VD: LOT-MILK-101)" 
                                    value={allocations[item.id]?.lotCode || ''}
                                    onChange={e => setAllocations({ ...allocations, [item.id]: { ...(allocations[item.id] || { zone: 'COLD', slotId: '' }), lotCode: e.target.value } })}
                                    style={{ padding: '0.25rem', borderRadius: '4px', border: '1px solid var(--border)', fontSize: '0.75rem' }}
                                  />
                                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                                    <select
                                      value={allocations[item.id]?.zone || 'COLD'}
                                      onChange={e => setAllocations({ ...allocations, [item.id]: { ...(allocations[item.id] || { lotCode: '', slotId: '' }), zone: e.target.value } })}
                                      style={{ padding: '0.25rem', borderRadius: '4px', border: '1px solid var(--border)', fontSize: '0.75rem', flex: 1 }}
                                    >
                                      <option value="COLD">Mát (COLD)</option>
                                      <option value="FROZEN">Đông (FROZEN)</option>
                                      <option value="DRY">Khô (DRY)</option>
                                    </select>
                                    <input 
                                      placeholder="Vị trí (VD: CL-A1-03)" 
                                      value={allocations[item.id]?.slotId || ''}
                                      onChange={e => setAllocations({ ...allocations, [item.id]: { ...(allocations[item.id] || { lotCode: '', zone: 'COLD' }), slotId: e.target.value } })}
                                      style={{ padding: '0.25rem', borderRadius: '4px', border: '1px solid var(--border)', fontSize: '0.75rem', flex: 1.5 }}
                                    />
                                  </div>
                                  <button onClick={() => submitAllocation(item.id)} className="btn btn-primary" style={{ padding: '0.25rem', fontSize: '0.75rem', justifyContent: 'center' }}>
                                    Xác nhận vị trí
                                  </button>
                                </div>
                              )}
                            </td>
                          )}

                          {/* Final stored details */}
                          {selectedOrder.status === 'COMPLETED' && (
                            <td>
                              {item.status === 'STORED' ? (
                                <div style={{ fontSize: '0.75rem' }}>
                                  <div className="font-semibold">{item.lotCode}</div>
                                  <div className="text-muted">{item.assignedSlotId} ({item.assignedZone})</div>
                                </div>
                              ) : (
                                <span className="text-danger">Không nhập</span>
                              )}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Create Inbound Order Form */
        <div className="card" style={{ maxWidth: '800px', margin: '0 auto', gap: 'var(--spacing-5)' }}>
          <h3 className="font-semibold" style={{ fontSize: '1.25rem', borderBottom: '1px solid var(--color-neutral-200)', paddingBottom: '0.75rem' }}>Tạo yêu cầu nhập kho mới</h3>
          
          <form onSubmit={handleCreateOrder} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>Nhà cung cấp *</label>
                <select 
                  required
                  value={supplierId}
                  onChange={e => setSupplierId(e.target.value)}
                  style={{ padding: '0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-neutral-300)' }}
                >
                  <option value="">-- Chọn nhà cung cấp --</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>Ngày dự kiến giao hàng *</label>
                <input 
                  required
                  type="date"
                  value={expectedDate}
                  onChange={e => setExpectedDate(e.target.value)}
                  style={{ padding: '0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-neutral-300)' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>Ghi chú đơn hàng</label>
              <textarea 
                placeholder="Nhập ghi chú hoặc yêu cầu đặc biệt khi vận chuyển (nếu có)"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={2}
                style={{ padding: '0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-neutral-300)', fontFamily: 'inherit' }}
              />
            </div>

            {/* Add Item section */}
            <div style={{ border: '1px solid var(--color-neutral-200)', borderRadius: 'var(--radius-lg)', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem', backgroundColor: 'var(--color-neutral-50)' }}>
              <h4 className="font-semibold" style={{ fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><PlusCircle size={16} /> Thêm sản phẩm vào đơn</h4>
              
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '0.75rem', alignItems: 'end' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Chọn SKU *</label>
                  <select 
                    value={itemSku}
                    onChange={e => setItemSku(e.target.value)}
                    style={{ padding: '0.375rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-neutral-300)', fontSize: '0.875rem' }}
                  >
                    <option value="">-- Chọn sản phẩm --</option>
                    {products.map(p => (
                      <option key={p.id} value={p.sku}>{p.sku} - {p.name}</option>
                    ))}
                  </select>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Số lượng *</label>
                  <input 
                    type="number" 
                    min="1"
                    value={itemQty}
                    onChange={e => setItemQty(parseInt(e.target.value) || 0)}
                    style={{ padding: '0.375rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-neutral-300)', fontSize: '0.875rem' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Hạn sử dụng *</label>
                  <input 
                    type="date"
                    value={itemExpiry}
                    onChange={e => setItemExpiry(e.target.value)}
                    style={{ padding: '0.375rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-neutral-300)', fontSize: '0.875rem' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Ngày SX</label>
                  <input 
                    type="date"
                    value={itemProduction}
                    onChange={e => setItemProduction(e.target.value)}
                    style={{ padding: '0.375rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-neutral-300)', fontSize: '0.875rem' }}
                  />
                </div>
              </div>
              
              <button 
                type="button" 
                onClick={addItemToRequest}
                className="btn btn-outline animate-fade-in" 
                style={{ width: '100%', justifyContent: 'center', backgroundColor: '#fff' }}
              >
                <Plus size={16} /> Thêm vào danh sách đơn
              </button>
            </div>

            {/* Selected Items Table */}
            {orderItems.length > 0 && (
              <div>
                <h4 className="font-semibold" style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>Danh sách sản phẩm đã thêm ({orderItems.length})</h4>
                <div style={{ border: '1px solid var(--color-neutral-200)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                  <table className="table" style={{ fontSize: '0.875rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: 'var(--color-neutral-50)' }}>
                        <th>Sản phẩm / SKU</th>
                        <th>Số lượng yêu cầu</th>
                        <th>Hạn sử dụng</th>
                        <th>Ngày sản xuất</th>
                        <th>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orderItems.map((item) => (
                        <tr key={item.sku}>
                          <td>
                            <div className="font-semibold">{item.productName}</div>
                            <div className="text-muted" style={{ fontSize: '0.75rem' }}>SKU: {item.sku}</div>
                          </td>
                          <td className="font-medium">{item.expectedQuantity}</td>
                          <td>{new Date(item.expiryDate).toLocaleDateString('vi-VN')}</td>
                          <td>{item.productionDate ? new Date(item.productionDate).toLocaleDateString('vi-VN') : 'N/A'}</td>
                          <td>
                            <button 
                              type="button"
                              onClick={() => removeRequestItem(item.sku)}
                              style={{ color: 'var(--color-danger-500)', display: 'flex', alignItems: 'center' }}
                            >
                              <Trash2 size={16} /> Xoá
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem', borderTop: '1px solid var(--color-neutral-200)', paddingTop: '1.25rem' }}>
              <button 
                type="button" 
                onClick={() => setActiveTab('list')}
                className="btn btn-outline"
              >
                Hủy bỏ
              </button>
              <button 
                type="submit" 
                className="btn btn-primary"
              >
                Gửi yêu cầu nhập kho
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default InboundOrder;
