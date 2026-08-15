import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Upload, PackageMinus, Search, ArrowRight, CheckCircle2, FileText, BrainCircuit, Box, Truck, Plus, X, ScanBarcode } from 'lucide-react';
import BarcodeScannerMock from '../components/BarcodeScannerMock';

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
  confirmedBy?: string;
  createdAt: string;
  items: OutboundOrderItem[];
}

const STEPS = [
  { key: 'PENDING', label: 'Tạo yêu cầu', icon: <FileText size={16} /> },
  { key: 'PICKING', label: 'Chờ lấy hàng (FEFO)', icon: <BrainCircuit size={16} /> },
  { key: 'PACKED', label: 'Đã đóng gói', icon: <Box size={16} /> },
  { key: 'CONFIRMED', label: 'Đã xuất kho', icon: <Truck size={16} /> }
];

const OutboundOrders = () => {
  const { token, user } = useAuth();
  const [orders, setOrders] = useState<OutboundOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OutboundOrder | null>(null);
  
  // Create form
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [createForm, setCreateForm] = useState({ destination: 'Cửa hàng Quận 1', notes: '' });

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/outbound-orders`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (error) {
      console.error('Failed to fetch outbound orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrderDetails = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/outbound-orders/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedOrder(data);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/outbound-orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          requestedBy: user?.id || 'USR-01',
          requesterName: user?.name || 'Sales Agent',
          destination: createForm.destination,
          notes: createForm.notes,
          items: [
            { sku: 'MILK-D-1L', productName: 'Sữa tươi Đà Lạt 1L', requestedQuantity: 50 }
          ] // Hardcoded for demo
        })
      });
      if (res.ok) {
        setShowCreateModal(false);
        fetchOrders();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const runFefoAndApply = async (orderId: string) => {
    if (!selectedOrder) return;
    try {
      let allSuggestions: any[] = [];
      
      // Lặp qua từng item để gọi FEFO suggestions
      for (const item of selectedOrder.items) {
        const res = await fetch(`${INVENTORY_API}/inventory/fefo?sku=${item.sku}&quantity=${item.requestedQuantity}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const suggestions = await res.json();
          // Map to match outbound payload
          suggestions.forEach((s: any) => {
            allSuggestions.push({
              itemId: item.id,
              lotId: s.lotId,
              lotCode: s.lotCode,
              slotId: s.location,
              expiryDate: s.expiryDate,
              riskScore: s.riskScore,
              priorityScore: s.priorityScore,
              quantity: s.suggestedQuantity
            });
          });
        }
      }

      if (allSuggestions.length === 0) {
        alert('Cảnh báo: Không đủ hàng trong kho hoặc không tìm thấy lô phù hợp!');
        return;
      }

      // Apply to order
      const applyRes = await fetch(`${API_BASE}/outbound-orders/${orderId}/fefo-suggestions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ suggestions: allSuggestions })
      });

      if (applyRes.ok) {
        fetchOrderDetails(orderId);
        fetchOrders();
      }
    } catch (error) {
      console.error('FEFO error:', error);
    }
  };

  const handleScan = (scannedCode: string) => {
    setShowScanner(false);
    if (!selectedOrder) return;
    
    // Auto-confirm picking for the first item as demo
    alert(`Đã quét mã: ${scannedCode}. Xác nhận đã nhặt xong hàng cho yêu cầu này.`);
    advanceState(selectedOrder.id, 'confirm-picking');
  };

  const advanceState = async (orderId: string, action: string, body?: any) => {
    try {
      const res = await fetch(`${API_BASE}/outbound-orders/${orderId}/${action}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: body ? JSON.stringify(body) : undefined
      });
      if (res.ok) {
        fetchOrderDetails(orderId);
        fetchOrders();
      } else {
        const err = await res.json();
        alert(`Lỗi: ${err.message}`);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const renderStepper = (status: string) => {
    // Treat SHIPPED as CONFIRMED for UI simplicity
    const uiStatus = status === 'SHIPPED' ? 'CONFIRMED' : status;
    const currentIndex = STEPS.findIndex(s => s.key === uiStatus);
    
    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', margin: '2rem 0', position: 'relative' }}>
        <div style={{ position: 'absolute', top: '15px', left: '12%', right: '12%', height: '2px', background: 'var(--border)', zIndex: 1 }}>
          <div style={{ height: '100%', background: 'var(--primary)', width: `${Math.max(0, currentIndex) * 33}%`, transition: 'width 0.3s ease' }}></div>
        </div>
        {STEPS.map((step, idx) => {
          const isCompleted = idx < currentIndex;
          const isCurrent = idx === currentIndex;
          return (
            <div key={step.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2, width: '25%' }}>
              <div style={{ 
                width: '32px', height: '32px', borderRadius: '50%', 
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: isCompleted ? 'var(--primary)' : isCurrent ? '#fff' : 'var(--bg-card)',
                border: `2px solid ${isCompleted || isCurrent ? 'var(--primary)' : 'var(--border)'}`,
                color: isCompleted ? '#fff' : isCurrent ? 'var(--primary)' : 'var(--text-muted)',
                marginBottom: '0.5rem'
              }}>
                {isCompleted ? <CheckCircle2 size={18} /> : step.icon}
              </div>
              <span style={{ fontSize: '0.75rem', fontWeight: isCurrent ? 600 : 400, color: isCurrent ? 'var(--text)' : 'var(--text-muted)' }}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-6)' }}>
      <div className="flex items-center justify-between">
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.25rem' }}>Quản lý Xuất Kho (Outbound)</h2>
          <p className="text-muted" style={{ fontSize: '0.875rem' }}>Tích hợp thuật toán thông minh FEFO tối ưu lấy hàng cận date.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
          <Plus size={16} style={{ marginRight: 4 }} /> Tạo Yêu Cầu Xuất
        </button>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <table className="table">
          <thead>
            <tr>
              <th>Mã Phiếu</th>
              <th>Điểm Đến</th>
              <th>Người Yêu Cầu</th>
              <th>Tổng Món</th>
              <th>Trạng Thái</th>
              <th>Thao Tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>Đang tải...</td></tr> : 
              orders.map(o => (
              <tr key={o.id}>
                <td className="font-semibold">{o.orderCode}</td>
                <td>{o.destination}</td>
                <td>{o.requesterName}</td>
                <td>{o.totalItems}</td>
                <td>
                  <span className={`badge badge-${o.status === 'CONFIRMED' ? 'success' : o.status === 'CANCELLED' ? 'danger' : 'warning'}`}>{o.status}</span>
                </td>
                <td>
                  <button className="btn btn-outline" style={{ padding: '4px 8px', fontSize: '0.75rem' }} onClick={() => { setSelectedOrder(o); fetchOrderDetails(o.id); }}>
                    Chi tiết & Xử lý
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedOrder && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '800px', maxWidth: '90%', maxHeight: '90vh', overflowY: 'auto', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Chi tiết phiếu xuất: {selectedOrder.orderCode}</h3>
                <p className="text-muted text-sm">Điểm đến: {selectedOrder.destination}</p>
              </div>
              <button onClick={() => setSelectedOrder(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            {renderStepper(selectedOrder.status)}

            <div style={{ marginTop: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h4 style={{ fontWeight: 600 }}>Chi tiết lấy hàng (Picking List)</h4>
                {selectedOrder.status === 'PENDING' && (
                  <button className="btn btn-primary" style={{ backgroundColor: 'var(--color-primary-600)' }} onClick={() => runFefoAndApply(selectedOrder.id)}>
                    <BrainCircuit size={16} style={{ marginRight: 6 }} /> Chạy Thuật Toán FEFO
                  </button>
                )}
              </div>
              <table className="table">
                <thead>
                  <tr>
                    <th>SKU / Tên SP</th>
                    <th>SL Yêu cầu</th>
                    <th>Lô Đề Xuất (FEFO)</th>
                    <th>Vị Trí Kệ</th>
                    <th>HSD Lô Hàng</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedOrder.items?.map(item => (
                    <tr key={item.id} style={{ backgroundColor: item.lotCode ? 'rgba(59, 130, 246, 0.05)' : 'transparent' }}>
                      <td>
                        <div className="font-medium">{item.sku}</div>
                        <div className="text-muted" style={{ fontSize: '0.75rem' }}>{item.productName}</div>
                      </td>
                      <td className="font-semibold">{item.requestedQuantity}</td>
                      <td>
                        {item.lotCode ? (
                          <span className="badge badge-success" style={{ backgroundColor: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0' }}>
                            {item.lotCode} ({item.pickedQuantity} sp)
                          </span>
                        ) : (
                          <span className="text-muted italic" style={{ fontSize: '0.75rem' }}>Chưa cấp lô</span>
                        )}
                      </td>
                      <td className="font-medium">{item.slotId || '-'}</td>
                      <td>{item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
              {selectedOrder.status === 'PICKING' && (
                <div className="w-full flex flex-col md:flex-row gap-4">
                  <button 
                    className="flex-1 bg-primary text-primary-on px-6 py-4 rounded-xl flex items-center justify-center gap-2 font-bold text-lg active:scale-95 transition-transform" 
                    onClick={() => setShowScanner(true)}
                  >
                    <ScanBarcode size={24} /> Quét mã để lấy hàng
                  </button>
                  <button 
                    className="flex-1 bg-amber-500 text-white px-6 py-4 rounded-xl flex items-center justify-center gap-2 font-bold text-lg active:scale-95 transition-transform" 
                    onClick={() => advanceState(selectedOrder.id, 'confirm-picking')}
                  >
                    Bỏ qua quét & Xác nhận lấy đủ <ArrowRight size={20} />
                  </button>
                </div>
              )}
              {selectedOrder.status === 'PACKED' && (
                <button className="btn btn-success" style={{ backgroundColor: 'var(--color-success-500)', color: '#fff' }} onClick={() => advanceState(selectedOrder.id, 'confirm', { confirmedBy: user?.id || 'USR-01' })}>
                  Chốt Đơn Xuất Kho <CheckCircle2 size={16} />
                </button>
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

      {/* Create Modal */}
      {showCreateModal && (
         <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
         <div className="card" style={{ width: '500px', maxWidth: '90%', padding: '2rem' }}>
           <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>Tạo Yêu Cầu Xuất Kho</h3>
           <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
             <div>
               <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.875rem', fontWeight: 500 }}>Điểm đến (Destination)</label>
               <input required type="text" value={createForm.destination} onChange={e => setCreateForm({...createForm, destination: e.target.value})} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)' }} />
             </div>
             <div>
               <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.875rem', fontWeight: 500 }}>Ghi chú (Notes)</label>
               <textarea value={createForm.notes} onChange={e => setCreateForm({...createForm, notes: e.target.value})} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)', minHeight: '80px' }} />
             </div>
             <p className="text-muted text-sm mt-2">Ghi chú: Yêu cầu này sẽ tự động đính kèm 1 mặt hàng (Sữa tươi Đà Lạt 1L - 50sp) để demo lấy hàng bằng FEFO.</p>
             <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-outline">Huỷ</button>
                <button type="submit" className="btn btn-primary">Tạo Yêu Cầu</button>
             </div>
           </form>
         </div>
       </div>
      )}
    </div>
  );
};

export default OutboundOrders;
