import { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  RefreshCcw, 
  Zap, 
  Play, 
  PackageCheck,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const OUTBOUND_API = 'http://localhost:3007'; // outbound-service
const PRODUCT_API = 'http://localhost:3010'; // product-service
const INVENTORY_API = 'http://localhost:3011'; // inventory-service

interface OutboundOrderItem {
  id: string;
  sku: string;
  productName: string;
  requestedQuantity: number;
  pickedQuantity: number;
  lotId?: string;
  lotCode?: string;
  slotId?: string;
  expiryDate?: string;
  riskScore: number;
  priorityScore: number;
  status: string;
}

interface OutboundOrder {
  id: string;
  orderCode: string;
  status: string; // PENDING | PICKING | PACKED | SHIPPED | CONFIRMED | CANCELLED
  requestedBy: string;
  requesterName?: string;
  destination?: string;
  warehouseId?: string;
  warehouseCode?: string;
  latitude?: number;
  longitude?: number;
  totalItems: number;
  totalQuantity: number;
  notes?: string;
  confirmedBy?: string;
  confirmedAt?: string;
  items: OutboundOrderItem[];
  createdAt: string;
}

interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
}

interface Lot {
  id: string;
  lotCode: string;
  productId: string;
  quantity: number;
  remainingQty: number;
  expiryDate: string;
  zone: string;
  location: string;
  riskScore: number;
  status: string;
  productName?: string;
  sku?: string;
  daysLeft?: number;
  fefoScore?: number;
}

const OutboundOrder = () => {
  const { token, user } = useAuth();
  const [orders, setOrders] = useState<OutboundOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<OutboundOrder | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [activeTab, setActiveTab] = useState<'list' | 'create' | 'quick-fefo'>('list');
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Form states for creating outbound order
  const [destination, setDestination] = useState('');
  const [notes, setNotes] = useState('');
  const [orderItems, setOrderItems] = useState<Array<{
    sku: string;
    productName: string;
    requestedQuantity: number;
  }>>([]);

  const [latitude, setLatitude] = useState<number | ''>('');
  const [longitude, setLongitude] = useState<number | ''>('');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');
  const [selectedWarehouseCode, setSelectedWarehouseCode] = useState<string>('');
  const [calculatedWarehouses, setCalculatedWarehouses] = useState<any[]>([]);
  const [calculating, setCalculating] = useState(false);

  const sampleDestinations = [
    { name: 'Siêu thị Go! Gò Vấp', lat: 10.8286, lng: 106.6802 },
    { name: 'Co.opmart Bình Thạnh', lat: 10.8016, lng: 106.6984 },
    { name: 'Lotte Mart Quận 7', lat: 10.7415, lng: 106.7012 },
    { name: 'Aeon Mall Tân Phú', lat: 10.7915, lng: 106.6125 },
    { name: 'Tự nhập tọa độ...', lat: '', lng: '' }
  ];

  const handleSelectSampleDest = (index: number) => {
    if (isNaN(index)) {
      setDestination('');
      setLatitude('');
      setLongitude('');
      return;
    }
    const dest = sampleDestinations[index];
    if (dest && dest.lat !== '') {
      setDestination(dest.name);
      setLatitude(dest.lat as number);
      setLongitude(dest.lng as number);
    } else {
      setDestination('');
      setLatitude('');
      setLongitude('');
    }
  };

  useEffect(() => {
    if (latitude !== '' && longitude !== '' && orderItems.length > 0) {
      calculateNearestWarehouse();
    } else {
      setCalculatedWarehouses([]);
    }
  }, [latitude, longitude, orderItems]);

  const calculateNearestWarehouse = async () => {
    setCalculating(true);
    try {
      const res = await fetch(`${OUTBOUND_API}/outbound-orders/calculate-nearest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          latitude: Number(latitude),
          longitude: Number(longitude),
          items: orderItems.map(i => ({ sku: i.sku, requestedQuantity: i.requestedQuantity }))
        })
      });

      if (res.ok) {
        const data = await res.json();
        setCalculatedWarehouses(data.warehouses || []);
        
        // Find recommended and auto select it
        const recommended = data.warehouses.find((w: any) => w.isRecommended);
        if (recommended) {
          setSelectedWarehouseId(recommended.warehouse.id);
          setSelectedWarehouseCode(recommended.warehouse.code);
        }
      }
    } catch (error) {
      console.error('Failed to calculate nearest warehouse:', error);
    } finally {
      setCalculating(false);
    }
  };

  // Form states for adding single item to request
  const [itemSku, setItemSku] = useState('');
  const [itemQty, setItemQty] = useState(1);

  // FEFO suggestions state for selected order
  const [fefoSuggestions, setFefoSuggestions] = useState<Record<string, any[]>>({});
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  // Quick FEFO Export states (from original FEFOExport.tsx)
  const [quickFefoLots, setQuickFefoLots] = useState<Lot[]>([]);
  const [quickFefoLoading, setQuickFefoLoading] = useState(false);

  useEffect(() => {
    fetchOrders();
    fetchProducts();
    if (activeTab === 'quick-fefo') {
      fetchQuickFefoData();
    }
  }, [statusFilter, activeTab]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const url = statusFilter 
        ? `${OUTBOUND_API}/outbound-orders?status=${statusFilter}`
        : `${OUTBOUND_API}/outbound-orders`;
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
        if (selectedOrder) {
          const updated = data.find((o: OutboundOrder) => o.id === selectedOrder.id);
          if (updated) setSelectedOrder(updated);
        }
      }
    } catch (error) {
      console.error('Failed to fetch outbound orders:', error);
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

  // Quick FEFO Export logic (from FEFOExport)
  const fetchQuickFefoData = async () => {
    setQuickFefoLoading(true);
    try {
      const resLots = await fetch(`${INVENTORY_API}/inventory/lots`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      let lots: Lot[] = await resLots.json();
      lots = lots.filter(l => l.remainingQty > 0);

      const resProducts = await fetch(`${PRODUCT_API}/products`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const prods = await resProducts.json();
      const productMap = new Map<string, any>(prods.map((p: any) => [p.id, p]));

      const today = new Date().getTime();
      const enrichedLots = lots.map(lot => {
        const expTime = new Date(lot.expiryDate).getTime();
        const daysLeft = Math.max(0, (expTime - today) / (1000 * 3600 * 24));
        
        let expiryScore = 0;
        if (daysLeft <= 0) expiryScore = 100;
        else if (daysLeft <= 3) expiryScore = 90;
        else if (daysLeft <= 7) expiryScore = 70;
        else if (daysLeft <= 14) expiryScore = 50;
        else if (daysLeft <= 30) expiryScore = 30;
        else expiryScore = 10;

        const fefoScore = Math.round((lot.riskScore * 0.6) + (expiryScore * 0.4));

        return {
          ...lot,
          productName: productMap.get(lot.productId)?.name || 'Unknown',
          sku: productMap.get(lot.productId)?.sku || 'Unknown',
          fefoScore,
          daysLeft: Math.round(daysLeft)
        };
      });

      enrichedLots.sort((a, b) => (b.fefoScore || 0) - (a.fefoScore || 0));
      setQuickFefoLots(enrichedLots);
    } catch (error) {
      console.error('Failed to fetch quick FEFO data:', error);
    } finally {
      setQuickFefoLoading(false);
    }
  };

  const handleQuickExport = async (lot: Lot) => {
    const qty = prompt(`Nhập số lượng muốn xuất từ lô ${lot.lotCode} (Tồn: ${lot.remainingQty}):`, lot.remainingQty.toString());
    if (!qty) return;
    const exportQty = parseInt(qty);
    if (isNaN(exportQty) || exportQty <= 0 || exportQty > lot.remainingQty) {
      alert('Số lượng xuất không hợp lệ!');
      return;
    }

    try {
      const res = await fetch(`${INVENTORY_API}/inventory/lots/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ lotCode: lot.lotCode, quantity: exportQty, reason: 'Xuất lẻ theo đề xuất FEFO' })
      });

      if (res.ok) {
        alert('Xuất kho thành công!');
        fetchQuickFefoData();
      } else {
        const err = await res.json();
        alert(`Lỗi: ${err.message}`);
      }
    } catch (error) {
      console.error('Lỗi khi xuất kho', error);
    }
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (orderItems.length === 0) {
      alert('Vui lòng thêm ít nhất một sản phẩm');
      return;
    }

    const payload = {
      requestedBy: user?.id || 'sales-id',
      requesterName: user?.name || 'Sales Staff',
      destination,
      warehouseId: selectedWarehouseId || null,
      warehouseCode: selectedWarehouseCode || null,
      latitude: latitude !== '' ? Number(latitude) : null,
      longitude: longitude !== '' ? Number(longitude) : null,
      notes,
      items: orderItems
    };

    try {
      const res = await fetch(`${OUTBOUND_API}/outbound-orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        alert('Tạo yêu cầu xuất kho thành công!');
        setDestination('');
        setNotes('');
        setOrderItems([]);
        setLatitude('');
        setLongitude('');
        setSelectedWarehouseId('');
        setSelectedWarehouseCode('');
        setCalculatedWarehouses([]);
        setActiveTab('list');
        fetchOrders();
      } else {
        const err = await res.json();
        alert(`Lỗi: ${err.message || 'Không thể tạo đơn hàng'}`);
      }
    } catch (error) {
      console.error('Failed to create outbound order:', error);
      alert('Lỗi kết nối đến dịch vụ xuất kho');
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

    const product = products.find(p => p.sku === itemSku);
    if (!product) return;

    if (orderItems.some(i => i.sku === itemSku)) {
      alert('Sản phẩm đã có trong danh sách. Vui lòng xoá và thêm lại nếu muốn chỉnh sửa.');
      return;
    }

    setOrderItems([
      ...orderItems,
      {
        sku: itemSku,
        productName: product.name,
        requestedQuantity: itemQty
      }
    ]);

    setItemSku('');
    setItemQty(1);
  };

  const removeRequestItem = (sku: string) => {
    setOrderItems(orderItems.filter(i => i.sku !== sku));
  };

  // Đơn xuất kho logic
  const getFefoSuggestionsForOrder = async (order: OutboundOrder) => {
    setSuggestionsLoading(true);
    const suggestionsMap: Record<string, any[]> = {};
    try {
      for (const item of order.items) {
        const res = await fetch(`${INVENTORY_API}/inventory/fefo?sku=${item.sku}&quantity=${item.requestedQuantity}&warehouseId=${order.warehouseId || ''}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const fefoData = await res.json();
          suggestionsMap[item.id] = fefoData.suggestions || [];
        }
      }
      setFefoSuggestions(suggestionsMap);
    } catch (error) {
      console.error('Failed to fetch FEFO suggestions:', error);
      alert('Không thể tải gợi ý FEFO từ hệ thống tồn kho');
    } finally {
      setSuggestionsLoading(false);
    }
  };

  const applyFefoSuggestions = async (orderId: string) => {
    // Collect all suggestions in the required format
    const suggestionsPayload: any[] = [];
    let unsatisfied = false;

    selectedOrder?.items.forEach(item => {
      const itemsList = fefoSuggestions[item.id] || [];
      const totalQtyAllocated = itemsList.reduce((sum, s) => sum + s.qtyToTake, 0);

      if (totalQtyAllocated < item.requestedQuantity) {
        unsatisfied = true;
      }

      itemsList.forEach(s => {
        suggestionsPayload.push({
          itemId: item.id,
          lotId: s.lotId,
          lotCode: s.lotCode,
          slotId: s.location,
          expiryDate: s.expiryDate,
          riskScore: s.riskScore,
          priorityScore: s.priorityScore,
          quantity: s.qtyToTake
        });
      });
    });

    if (unsatisfied) {
      const ok = window.confirm('Chú ý: Tồn kho hiện tại không đủ đáp ứng đủ số lượng của một số mặt hàng. Bạn vẫn muốn tiếp tục xuất số lượng hiện có?');
      if (!ok) return;
    }

    if (suggestionsPayload.length === 0) {
      alert('Không có đề xuất nào để áp dụng. Tồn kho có thể đang trống.');
      return;
    }

    try {
      const res = await fetch(`${OUTBOUND_API}/outbound-orders/${orderId}/fefo-suggestions`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ suggestions: suggestionsPayload })
      });

      if (res.ok) {
        alert('Đã áp dụng đề xuất xuất kho FEFO. Trạng thái chuyển sang PICKING.');
        fetchOrders();
      } else {
        const err = await res.json();
        alert(`Lỗi: ${err.message}`);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const confirmPicking = async (orderId: string) => {
    try {
      const res = await fetch(`${OUTBOUND_API}/outbound-orders/${orderId}/confirm-picking`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        alert('Đã xác nhận lấy hàng thành công. Đơn hàng chuyển sang trạng thái PACKED.');
        fetchOrders();
      } else {
        const err = await res.json();
        alert(`Lỗi: ${err.message}`);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const confirmExport = async (orderId: string) => {
    try {
      const res = await fetch(`${OUTBOUND_API}/outbound-orders/${orderId}/confirm`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ confirmedBy: user?.name || 'admin' })
      });
      if (res.ok) {
        alert('Xác nhận xuất kho thành công! Số lượng tồn kho đã được cập nhật.');
        fetchOrders();
      } else {
        const err = await res.json();
        alert(`Lỗi: ${err.message}`);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const cancelOrder = async (orderId: string) => {
    const ok = window.confirm('Bạn có chắc chắn muốn hủy yêu cầu xuất kho này?');
    if (!ok) return;

    try {
      const res = await fetch(`${OUTBOUND_API}/outbound-orders/${orderId}/cancel`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        alert('Đã hủy đơn xuất kho.');
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
      case 'PICKING': return 'badge-warning';
      case 'PACKED': return 'badge-warning';
      case 'CONFIRMED': return 'badge-success';
      case 'CANCELLED': return 'badge-danger';
      default: return 'badge-neutral';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PENDING': return 'Chờ duyệt gợi ý';
      case 'PICKING': return 'Đang lấy hàng';
      case 'PACKED': return 'Đã đóng gói';
      case 'CONFIRMED': return 'Hoàn tất xuất';
      case 'CANCELLED': return 'Đã huỷ';
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
            Đơn Xuất Kho
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
            <Plus size={16} style={{ marginRight: 4, display: 'inline' }} /> Tạo Yêu Cầu Xuất
          </button>
          <button 
            onClick={() => setActiveTab('quick-fefo')}
            style={{
              padding: '0.75rem 1rem',
              fontWeight: 600,
              fontSize: '0.875rem',
              borderBottom: activeTab === 'quick-fefo' ? '2px solid var(--color-primary-600)' : 'none',
              color: activeTab === 'quick-fefo' ? 'var(--color-primary-600)' : 'var(--color-neutral-500)',
            }}
          >
            <Zap size={16} style={{ marginRight: 4, display: 'inline' }} /> Đề xuất FEFO Nhanh
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
              <option value="PENDING">Chờ duyệt gợi ý (PENDING)</option>
              <option value="PICKING">Đang lấy hàng (PICKING)</option>
              <option value="PACKED">Đã đóng gói (PACKED)</option>
              <option value="CONFIRMED">Hoàn tất (CONFIRMED)</option>
              <option value="CANCELLED">Đã huỷ (CANCELLED)</option>
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
            <div style={{ padding: 'var(--spacing-4) var(--spacing-5)', borderBottom: '1px solid var(--color-neutral-200)' }}>
              <h3 className="font-semibold" style={{ fontSize: '1rem' }}>Danh sách đơn xuất kho</h3>
            </div>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Mã Đơn</th>
                    <th>Nơi Nhận</th>
                    <th>Số SKU</th>
                    <th>Tổng SL</th>
                    <th>Trạng Thế</th>
                    <th>Ngày Tạo</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>Đang tải dữ liệu đơn xuất...</td></tr>
                  ) : orders.length === 0 ? (
                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>Không tìm thấy đơn xuất kho nào.</td></tr>
                  ) : (
                    orders.map((o) => (
                      <tr 
                        key={o.id} 
                        onClick={() => {
                          setSelectedOrder(o);
                          setFefoSuggestions({}); // clear previous
                          if (o.status === 'PENDING') {
                            getFefoSuggestionsForOrder(o);
                          }
                        }}
                        style={{ cursor: 'pointer', backgroundColor: selectedOrder?.id === o.id ? 'var(--color-primary-50)' : 'transparent' }}
                      >
                        <td className="font-semibold">{o.orderCode}</td>
                        <td>
                          <div className="font-semibold">{o.destination || 'N/A'}</div>
                          {o.warehouseCode && (
                            <div className="text-primary font-semibold" style={{ fontSize: '0.75rem' }}>
                              Kho xuất: {o.warehouseCode}
                            </div>
                          )}
                          <div className="text-muted" style={{ fontSize: '0.75rem' }}>Yêu cầu bởi: {o.requesterName}</div>
                        </td>
                        <td>{o.totalItems}</td>
                        <td>{o.totalQuantity}</td>
                        <td><span className={`badge ${getStatusBadgeClass(o.status)}`}>{getStatusLabel(o.status)}</span></td>
                        <td>{new Date(o.createdAt).toLocaleDateString('vi-VN')}</td>
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
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Chi tiết đơn xuất: {selectedOrder.orderCode}</h3>
                </div>
                <button onClick={() => setSelectedOrder(null)} style={{ color: 'var(--color-neutral-400)', fontWeight: 'bold' }}> đóng </button>
              </div>

              {/* General info */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-3)', fontSize: '0.875rem' }}>
                <div>
                  <p className="text-muted">Nơi nhận hàng:</p>
                  <p className="font-semibold">{selectedOrder.destination || 'Không xác định'}</p>
                  {selectedOrder.latitude && selectedOrder.longitude && (
                    <p className="text-muted" style={{ fontSize: '0.75rem' }}>Tọa độ: {selectedOrder.latitude}, {selectedOrder.longitude}</p>
                  )}
                </div>
                <div>
                  <p className="text-muted">Nhân viên yêu cầu:</p>
                  <p className="font-semibold">{selectedOrder.requesterName} (ID: {selectedOrder.requestedBy.slice(0,8)})</p>
                </div>
                <div>
                  <p className="text-muted">Kho xuất hàng:</p>
                  <p className="font-semibold text-primary">{selectedOrder.warehouseCode ? selectedOrder.warehouseCode : 'Chưa chỉ định'}</p>
                </div>
                <div>
                  <p className="text-muted">Thời gian tạo:</p>
                  <p>{new Date(selectedOrder.createdAt).toLocaleString('vi-VN')}</p>
                </div>
                <div>
                  <p className="text-muted">Người xác nhận xuất:</p>
                  <p className="font-semibold">{selectedOrder.confirmedBy || 'Chưa xác nhận'}</p>
                </div>
                {selectedOrder.confirmedAt && (
                  <div>
                    <p className="text-muted">Thời gian xác nhận:</p>
                    <p>{new Date(selectedOrder.confirmedAt).toLocaleString('vi-VN')}</p>
                  </div>
                )}
                {selectedOrder.notes && (
                  <div style={{ gridColumn: 'span 2' }}>
                    <p className="text-muted">Ghi chú:</p>
                    <p style={{ fontStyle: 'italic' }}>{selectedOrder.notes}</p>
                  </div>
                )}
              </div>

              {/* Action Buttons depending on status */}
              <div style={{ borderTop: '1px solid var(--color-neutral-100)', paddingTop: '1rem' }}>
                {selectedOrder.status === 'PENDING' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button 
                        className="btn btn-primary" 
                        onClick={() => applyFefoSuggestions(selectedOrder.id)} 
                        style={{ flex: 1.5, justifyContent: 'center' }}
                        disabled={suggestionsLoading}
                      >
                        <Play size={16} /> Duyệt gợi ý FEFO & Bắt đầu lấy hàng
                      </button>
                      <button 
                        className="btn btn-outline" 
                        onClick={() => cancelOrder(selectedOrder.id)} 
                        style={{ flex: 1, color: 'var(--color-danger-500)', borderColor: 'var(--color-danger-500)', justifyContent: 'center' }}
                      >
                        Hủy đơn
                      </button>
                    </div>
                  </div>
                )}

                {selectedOrder.status === 'PICKING' && (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-primary" onClick={() => confirmPicking(selectedOrder.id)} style={{ flex: 1.5, justifyContent: 'center' }}>
                      <PackageCheck size={18} /> Xác nhận đã lấy hàng (Confirm Picking)
                    </button>
                    <button 
                      className="btn btn-outline" 
                      onClick={() => cancelOrder(selectedOrder.id)} 
                      style={{ flex: 1, color: 'var(--color-danger-500)', borderColor: 'var(--color-danger-500)', justifyContent: 'center' }}
                    >
                      Hủy đơn
                    </button>
                  </div>
                )}

                {selectedOrder.status === 'PACKED' && (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-primary" onClick={() => confirmExport(selectedOrder.id)} style={{ flex: 1.5, justifyContent: 'center' }}>
                      <CheckCircle2 size={18} /> Xác nhận xuất kho (Trừ tồn kho)
                    </button>
                    <button 
                      className="btn btn-outline" 
                      onClick={() => cancelOrder(selectedOrder.id)} 
                      style={{ flex: 1, color: 'var(--color-danger-500)', borderColor: 'var(--color-danger-500)', justifyContent: 'center' }}
                    >
                      Hủy đơn
                    </button>
                  </div>
                )}
              </div>

              {/* Items List / Picking Instructions */}
              <div>
                <h4 className="font-semibold" style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>Danh sách sản phẩm xuất</h4>
                
                {selectedOrder.status === 'PENDING' ? (
                  <div>
                    <p className="text-warning font-semibold" style={{ fontSize: '0.75rem', marginBottom: '0.5rem' }}>
                      * Đang tự động phân tích Hạn sử dụng và Điểm rủi ro AI để xếp hạng lấy hàng...
                    </p>
                    {suggestionsLoading ? (
                      <p style={{ fontSize: '0.875rem', color: 'var(--color-neutral-500)' }}>Đang tạo đề xuất FEFO...</p>
                    ) : (
                      selectedOrder.items.map(item => {
                        const suggestions = fefoSuggestions[item.id] || [];
                        const sumTaken = suggestions.reduce((sum, s) => sum + s.qtyToTake, 0);
                        return (
                          <div key={item.id} style={{ border: '1px solid var(--color-neutral-200)', borderRadius: 'var(--radius-md)', padding: '0.75rem', marginBottom: '0.75rem' }}>
                            <div className="flex justify-between items-center" style={{ marginBottom: '0.375rem' }}>
                              <span className="font-bold" style={{ fontSize: '0.875rem' }}>{item.productName} (SKU: {item.sku})</span>
                              <span className="font-semibold" style={{ fontSize: '0.875rem' }}>Yêu cầu: {item.requestedQuantity}</span>
                            </div>
                            
                            {suggestions.length === 0 ? (
                              <div className="text-danger" style={{ fontSize: '0.75rem', fontWeight: 600 }}>Không tìm thấy lô hàng khả dụng nào trong kho!</div>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                {suggestions.map((s, idx) => (
                                  <div key={idx} style={{ display: 'flex', justifyContent: 'between', fontSize: '0.75rem', backgroundColor: idx % 2 === 0 ? 'var(--color-neutral-100)' : 'transparent', padding: '0.25rem' }}>
                                    <span>Lô: <strong>{s.lotCode}</strong> (HSD còn: {s.daysUntilExpiry} ngày)</span>
                                    <span>Vị trí: <strong>{s.location}</strong></span>
                                    <span>Lấy: <strong style={{ color: 'var(--color-primary-600)' }}>{s.qtyToTake}</strong> / Tồn: {s.remainingQty}</span>
                                  </div>
                                ))}
                                {sumTaken < item.requestedQuantity && (
                                  <div className="text-danger font-semibold" style={{ fontSize: '0.75rem' }}>
                                    Thiếu hụt {item.requestedQuantity - sumTaken} đơn vị hàng!
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                ) : (
                  /* Display Picking Sheets or Assigned lots */
                  <div style={{ border: '1px solid var(--color-neutral-200)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                    <table className="table" style={{ fontSize: '0.875rem' }}>
                      <thead>
                        <tr style={{ backgroundColor: 'var(--color-neutral-50)' }}>
                          <th>Sản phẩm / SKU</th>
                          <th>Yêu cầu</th>
                          <th>Chỉ định lấy (FEFO)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedOrder.items.map(item => (
                          <tr key={item.id}>
                            <td>
                              <div className="font-semibold">{item.productName}</div>
                              <div className="text-muted" style={{ fontSize: '0.75rem' }}>SKU: {item.sku}</div>
                            </td>
                            <td>{item.requestedQuantity}</td>
                            <td>
                              {item.lotCode ? (
                                <div>
                                  <div className="font-semibold" style={{ color: 'var(--color-primary-700)' }}>Lô: {item.lotCode}</div>
                                  <div style={{ fontSize: '0.75rem', color: 'var(--color-neutral-600)' }}>Kệ/Vị trí: <strong>{item.slotId || 'Không rõ'}</strong></div>
                                  <div style={{ fontSize: '0.75rem', color: 'var(--color-neutral-500)' }}>Số lượng: <strong>{item.pickedQuantity}</strong></div>
                                  {item.expiryDate && (
                                    <div style={{ fontSize: '0.7rem', color: 'var(--color-neutral-500)' }}>HSD: {new Date(item.expiryDate).toLocaleDateString('vi-VN')}</div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-danger">Không có chỉ định lô</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : activeTab === 'create' ? (
        /* Create Outbound Order Form */
        <div className="card" style={{ maxWidth: '600px', margin: '0 auto', gap: 'var(--spacing-5)' }}>
          <h3 className="font-semibold" style={{ fontSize: '1.25rem', borderBottom: '1px solid var(--color-neutral-200)', paddingBottom: '0.75rem' }}>Tạo yêu cầu xuất kho</h3>
          
          <form onSubmit={handleCreateOrder} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>Địa điểm giao hàng mẫu (hoặc tự nhập bên dưới)</label>
              <select 
                onChange={e => handleSelectSampleDest(parseInt(e.target.value))}
                style={{ padding: '0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-neutral-300)', fontSize: '0.875rem' }}
              >
                <option value="">-- Chọn một siêu thị / chi nhánh tại HCM --</option>
                {sampleDestinations.map((d, idx) => (
                  <option key={idx} value={idx}>{d.name} {d.lat && `(${d.lat}, ${d.lng})`}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>Tên địa điểm nhận hàng *</label>
              <input 
                required
                type="text"
                placeholder="VD: Siêu thị Go! Gò Vấp, hoặc Khách hàng VIP"
                value={destination}
                onChange={e => setDestination(e.target.value)}
                style={{ padding: '0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-neutral-300)' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Vĩ độ (Latitude) *</label>
                <input 
                  required
                  type="number"
                  step="0.000001"
                  placeholder="VD: 10.8286"
                  value={latitude}
                  onChange={e => setLatitude(e.target.value !== '' ? Number(e.target.value) : '')}
                  style={{ padding: '0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-neutral-300)', fontSize: '0.875rem' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Kinh độ (Longitude) *</label>
                <input 
                  required
                  type="number"
                  step="0.000001"
                  placeholder="VD: 106.6802"
                  value={longitude}
                  onChange={e => setLongitude(e.target.value !== '' ? Number(e.target.value) : '')}
                  style={{ padding: '0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-neutral-300)', fontSize: '0.875rem' }}
                />
              </div>
            </div>

            {/* Nearest Warehouse calculation results */}
            {calculatedWarehouses.length > 0 && (
              <div style={{ border: '1px solid var(--color-neutral-200)', borderRadius: 'var(--radius-lg)', padding: '1rem', backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'between', alignItems: 'center' }}>
                  <h4 style={{ fontSize: '0.875rem', fontWeight: 'bold', color: 'var(--color-neutral-800)' }}>
                    📊 Đề xuất Kho Hàng Tối Ưu (Thuật toán Haversine)
                  </h4>
                  {calculating && <span style={{ fontSize: '0.75rem', color: 'var(--color-neutral-500)' }}>Đang tính...</span>}
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {calculatedWarehouses.map((whInfo) => (
                    <div 
                      key={whInfo.warehouse.id}
                      onClick={() => {
                        setSelectedWarehouseId(whInfo.warehouse.id);
                        setSelectedWarehouseCode(whInfo.warehouse.code);
                      }}
                      style={{
                        padding: '0.75rem',
                        borderRadius: 'var(--radius-md)',
                        border: selectedWarehouseId === whInfo.warehouse.id ? '2px solid var(--color-primary-500)' : '1px solid var(--color-neutral-200)',
                        backgroundColor: selectedWarehouseId === whInfo.warehouse.id ? 'var(--color-primary-50)' : '#ffffff',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.25rem'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                        <div>
                          <span style={{ fontWeight: 'bold', fontSize: '0.875rem' }}>{whInfo.warehouse.name}</span>
                          <span className="badge badge-neutral" style={{ marginLeft: 6, fontSize: '0.65rem' }}>{whInfo.warehouse.code}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'end' }}>
                          <span style={{ fontWeight: 'bold', color: 'var(--color-primary-600)', fontSize: '0.875rem' }}>{whInfo.distanceKm} km</span>
                          <span className={`badge ${whInfo.fulfillmentRate === 100 ? 'badge-success' : whInfo.fulfillmentRate > 0 ? 'badge-warning' : 'badge-danger'}`} style={{ fontSize: '0.65rem', marginTop: 2 }}>
                            Độ đáp ứng: {whInfo.fulfillmentRate}%
                          </span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--color-neutral-500)', marginTop: 4 }}>
                        <span>📍 {whInfo.warehouse.address}</span>
                        {whInfo.isRecommended && (
                          <span className="badge badge-success" style={{ backgroundColor: '#d1fae5', color: '#065f46', border: 'none', fontWeight: 'bold' }}>
                            ✓ Khuyên dùng (Gần nhất + Đủ hàng)
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>Ghi chú xuất kho</label>
              <textarea 
                placeholder="Lý do xuất hoặc ghi chú bảo quản trong quá trình vận chuyển"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={2}
                style={{ padding: '0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-neutral-300)', fontFamily: 'inherit' }}
              />
            </div>

            {/* Add Item section */}
            <div style={{ border: '1px solid var(--color-neutral-200)', borderRadius: 'var(--radius-lg)', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem', backgroundColor: 'var(--color-neutral-50)' }}>
              <h4 className="font-semibold" style={{ fontSize: '0.875rem' }}>Thêm sản phẩm cần xuất</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.75rem', alignItems: 'end' }}>
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
              </div>
              
              <button 
                type="button" 
                onClick={addItemToRequest}
                className="btn btn-outline" 
                style={{ width: '100%', justifyContent: 'center', backgroundColor: '#fff' }}
              >
                <Plus size={16} /> Thêm sản phẩm
              </button>
            </div>

            {/* Added Items table */}
            {orderItems.length > 0 && (
              <div>
                <h4 className="font-semibold" style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>Danh sách sản phẩm xuất ({orderItems.length})</h4>
                <div style={{ border: '1px solid var(--color-neutral-200)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                  <table className="table" style={{ fontSize: '0.875rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: 'var(--color-neutral-50)' }}>
                        <th>Sản phẩm / SKU</th>
                        <th>Số lượng yêu cầu</th>
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
                          <td className="font-medium">{item.requestedQuantity}</td>
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
                Tạo yêu cầu xuất kho
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* Quick FEFO Export Tab (Direct lot export, from old FEFOExport.tsx) */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-6)' }}>
          <div className="flex items-center justify-between">
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Xuất lẻ lô hàng theo xếp hạng FEFO</h3>
              <p className="text-muted" style={{ fontSize: '0.875rem' }}>Xếp hạng lô hàng cần xuất trước dựa trên hạn sử dụng và điểm rủi ro AI (Learning to Rank).</p>
            </div>
            <button className="btn btn-outline" onClick={fetchQuickFefoData}>
              <RefreshCcw size={16} /> Làm mới
            </button>
          </div>

          <div className="card" style={{ padding: '0' }}>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Hạng</th>
                    <th>Mã Lô</th>
                    <th>Sản phẩm</th>
                    <th>Khu vực</th>
                    <th>Số lượng</th>
                    <th>Hạn sử dụng</th>
                    <th>Rủi ro AI</th>
                    <th>Vị trí lấy</th>
                    <th>Điểm FEFO</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {quickFefoLoading ? (
                    <tr><td colSpan={10} style={{ textAlign: 'center', padding: '2rem' }}>Đang tải dữ liệu xếp hạng FEFO...</td></tr>
                  ) : quickFefoLots.length === 0 ? (
                    <tr><td colSpan={10} style={{ textAlign: 'center', padding: '2rem' }}>Không có lô hàng khả dụng nào.</td></tr>
                  ) : (
                    quickFefoLots.map((lot, index) => (
                      <tr key={lot.id} style={{ backgroundColor: (lot.fefoScore || 0) >= 80 ? '#fef2f2' : (lot.fefoScore || 0) >= 60 ? '#fffbeb' : 'transparent' }}>
                        <td className={`font-bold text-center ${(lot.fefoScore || 0) >= 80 ? 'text-danger' : (lot.fefoScore || 0) >= 60 ? 'text-warning' : 'text-muted'}`}>{index + 1}</td>
                        <td><div className="font-semibold">{lot.lotCode}</div></td>
                        <td>
                          <div className="font-semibold">{lot.productName}</div>
                          <div className="text-muted" style={{ fontSize: '0.75rem' }}>{lot.sku}</div>
                        </td>
                        <td>
                          <span className="badge badge-neutral" style={{
                            backgroundColor: lot.zone === 'COLD' ? '#e0f2fe' : lot.zone === 'FROZEN' ? '#cffafe' : '#fef3c7',
                            color: lot.zone === 'COLD' ? '#0369a1' : lot.zone === 'FROZEN' ? '#0891b2' : '#d97706',
                            border: 'none'
                          }}>
                            {lot.zone}
                          </span>
                        </td>
                        <td className="font-medium">{lot.remainingQty}</td>
                        <td className={(lot.daysLeft || 0) <= 3 ? 'text-danger font-medium' : 'text-muted'}>Còn {lot.daysLeft} ngày</td>
                        <td><span className={`badge badge-${lot.riskScore > 70 ? 'danger' : lot.riskScore > 30 ? 'warning' : 'success'}`}>{lot.riskScore}%</span></td>
                        <td className="font-medium text-muted">{lot.location}</td>
                        <td>
                          <div className="flex items-center gap-2">
                            <div style={{ height: 6, width: `${(lot.fefoScore || 0) / 2}px`, backgroundColor: (lot.fefoScore || 0) >= 80 ? 'var(--color-danger-500)' : (lot.fefoScore || 0) >= 60 ? 'var(--color-warning-500)' : 'var(--color-success-500)', borderRadius: 3 }}></div>
                            <span className={`font-bold ${(lot.fefoScore || 0) >= 80 ? 'text-danger' : (lot.fefoScore || 0) >= 60 ? 'text-warning' : 'text-success'}`}>{lot.fefoScore}</span>
                          </div>
                        </td>
                        <td>
                          <button className="btn btn-primary" style={{ padding: '0.25rem 0.75rem' }} onClick={() => handleQuickExport(lot)}>
                            Xuất lẻ
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OutboundOrder;
