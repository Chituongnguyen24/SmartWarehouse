import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Download, PackageCheck, AlertCircle, ArrowRight, CheckCircle2, Factory, Layers, ListTodo, Plus, X, Search, FileText, ScanBarcode, Upload } from 'lucide-react';
import BarcodeScannerMock from '../components/BarcodeScannerMock';
import WarehouseMap3D from '../components/WarehouseMap3D';

const API_BASE = 'http://localhost:3006'; // inbound-service
const INVENTORY_API = 'http://localhost:3011'; // For lot creation if needed (backend handles it)

interface InboundOrderItem {
  id: string;
  sku: string;
  productName: string;
  expectedQuantity: number;
  receivedQuantity: number;
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
  status: string;
  expectedDate: string;
  receivedDate?: string;
  totalItems: number;
  totalQuantity: number;
  qualityCheckPassed: boolean;
  createdAt: string;
  items: InboundOrderItem[];
}

const STEPS = [
  { key: 'PENDING', label: 'Tạo đơn', icon: <FileText size={16} /> },
  { key: 'RECEIVING', label: 'Nhận hàng', icon: <Download size={16} /> },
  { key: 'QUALITY_CHECK', label: 'Kiểm định (QC)', icon: <AlertCircle size={16} /> },
  { key: 'STORING', label: 'Lưu kho', icon: <Layers size={16} /> },
  { key: 'COMPLETED', label: 'Hoàn tất', icon: <CheckCircle2 size={16} /> }
];

const InboundOrders = () => {
  const { token } = useAuth();
  const [orders, setOrders] = useState<InboundOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<InboundOrder | null>(null);
  
  // Forms
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showMapModal, setShowMapModal] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState<{supplierId: string; supplierName: string; expectedDate: string; parsedItems?: InboundOrderItem[]}>({ supplierId: 'SUP-01', supplierName: 'Vinamilk', expectedDate: '' });
  
  // Item specific forms (for storing)
  const [storeForm, setStoreForm] = useState<{ [itemId: string]: { zone: string, slotId: string, lotCode: string } }>({});

  useEffect(() => {
    fetchOrders();
  }, []);

let MOCK_ORDERS: InboundOrder[] = [
  {
    id: 'IO-001',
    orderCode: 'INB-2023-001',
    supplierId: 'SUP-01',
    supplierName: 'Vinamilk',
    status: 'PENDING',
    expectedDate: '2026-07-20T00:00:00Z',
    totalItems: 1,
    totalQuantity: 100,
    qualityCheckPassed: false,
    createdAt: new Date().toISOString(),
    items: [
      {
        id: 'ITEM-001',
        sku: 'MILK-D-1L',
        productName: 'Sữa tươi Đà Lạt 1L',
        expectedQuantity: 100,
        receivedQuantity: 0,
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'PENDING'
      }
    ]
  },
  {
    id: 'IO-002',
    orderCode: 'INB-2023-002',
    supplierId: 'SUP-02',
    supplierName: 'TH True Milk',
    status: 'RECEIVING',
    expectedDate: '2026-07-15T00:00:00Z',
    totalItems: 1,
    totalQuantity: 200,
    qualityCheckPassed: false,
    createdAt: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
    items: [
      {
        id: 'ITEM-002',
        sku: 'MILK-TH-1L',
        productName: 'Sữa tươi TH 1L',
        expectedQuantity: 200,
        receivedQuantity: 0,
        expiryDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'PENDING'
      }
    ]
  }
];

  const fetchOrders = async () => {
    setLoading(true);
    setTimeout(() => {
      setOrders([...MOCK_ORDERS]);
      setLoading(false);
    }, 500);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim());
        if (lines.length > 1) { // Skip header
          const parsed = lines.slice(1).map((line, idx) => {
            const cols = line.split(',');
            return {
              id: 'ITEM-CSV-' + Math.floor(Math.random() * 10000) + idx,
              sku: cols[0]?.trim() || 'UNKNOWN-SKU',
              productName: 'SP (từ CSV)', // Real app would lookup by SKU
              expectedQuantity: parseInt(cols[1]) || 1,
              receivedQuantity: 0,
              expiryDate: cols[2]?.trim() ? new Date(cols[2].trim()).toISOString() : new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
              status: 'PENDING'
            };
          });
          setCreateForm({...createForm, parsedItems: parsed});
        }
      };
      reader.readAsText(file);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const newOrder: InboundOrder = {
      id: 'IO-' + Math.floor(Math.random() * 10000),
      orderCode: 'INB-NEW-' + Math.floor(Math.random() * 10000),
      supplierId: createForm.supplierId,
      supplierName: createForm.supplierName,
      status: 'PENDING',
      expectedDate: createForm.expectedDate,
      totalItems: createForm.parsedItems?.length || 1,
      totalQuantity: createForm.parsedItems?.reduce((sum, item) => sum + item.expectedQuantity, 0) || 100,
      qualityCheckPassed: false,
      createdAt: new Date().toISOString(),
      items: createForm.parsedItems || [
        {
          id: 'ITEM-' + Math.floor(Math.random() * 10000),
          sku: 'MILK-D-1L',
          productName: 'Sữa tươi Đà Lạt 1L',
          expectedQuantity: 100,
          receivedQuantity: 0,
          expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'PENDING'
        }
      ]
    };
    MOCK_ORDERS.push(newOrder);
    setShowCreateModal(false);
    fetchOrders();
  };

  const advanceState = async (orderId: string, action: string, body?: any) => {
    const order = MOCK_ORDERS.find(o => o.id === orderId);
    if (!order) return;
    
    if (action === 'receive') order.status = 'RECEIVING';
    else if (action === 'qc') {
      order.status = 'QUALITY_CHECK';
      order.qualityCheckPassed = body?.passed || false;
    }
    else if (action === 'store') order.status = 'STORING';
    else if (action === 'complete') order.status = 'COMPLETED';

    fetchOrderDetails(orderId);
    fetchOrders();
  };

  const fetchOrderDetails = async (id: string) => {
    const order = MOCK_ORDERS.find(o => o.id === id);
    if (order) {
      setSelectedOrder({ ...order }); // Clone to trigger re-render
    }
  };

  const updateReceivedQuantity = async (itemId: string, qty: number) => {
    if (!selectedOrder) return;
    const order = MOCK_ORDERS.find(o => o.id === selectedOrder.id);
    if (order) {
      const item = order.items.find(i => i.id === itemId);
      if (item) {
        item.receivedQuantity = qty;
        if (item.receivedQuantity >= item.expectedQuantity) {
          item.status = 'RECEIVED';
        }
      }
      fetchOrderDetails(order.id);
    }
  };

  const handleScan = (scannedCode: string) => {
    setShowScanner(false);
    if (!selectedOrder) return;
    
    const order = MOCK_ORDERS.find(o => o.id === selectedOrder.id);
    if (order && order.items[0]) {
      updateReceivedQuantity(order.items[0].id, order.items[0].expectedQuantity);
      alert(`Đã quét mã: ${scannedCode}. Tự động cập nhật số lượng nhận cho ${order.items[0].productName}.`);
    }
  };

  const assignStorage = async (itemId: string) => {
    if (!selectedOrder) return;
    const order = MOCK_ORDERS.find(o => o.id === selectedOrder.id);
    if (order) {
      const item = order.items.find(i => i.id === itemId);
      if (item) {
        const data = storeForm[itemId] || { zone: 'COLD', slotId: 'CL-A1', lotCode: 'LOT-' + Math.floor(Math.random() * 10000) };
        item.assignedZone = data.zone;
        item.assignedSlotId = data.slotId;
        item.lotCode = data.lotCode;
        item.status = 'STORED';
      }
      fetchOrderDetails(order.id);
    }
  };

  const renderStepper = (status: string) => {
    const currentIndex = STEPS.findIndex(s => s.key === status);
    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', margin: '2rem 0', position: 'relative' }}>
        <div style={{ position: 'absolute', top: '15px', left: '10%', right: '10%', height: '2px', background: 'var(--border)', zIndex: 1 }}>
          <div style={{ height: '100%', background: 'var(--primary)', width: `${Math.max(0, currentIndex) * 25}%`, transition: 'width 0.3s ease' }}></div>
        </div>
        {STEPS.map((step, idx) => {
          const isCompleted = idx < currentIndex;
          const isCurrent = idx === currentIndex;
          return (
            <div key={step.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2, width: '20%' }}>
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
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.25rem' }}>Quản lý Nhập Kho (Inbound)</h2>
          <p className="text-muted" style={{ fontSize: '0.875rem' }}>Quy trình 6 bước từ nhà cung cấp lên kệ kho.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
          <Plus size={16} style={{ marginRight: 4 }} /> Tạo Phiếu Nhập
        </button>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <table className="table">
          <thead>
            <tr>
              <th>Mã Phiếu</th>
              <th>Nhà Cung Cấp</th>
              <th>Tổng Món</th>
              <th>Ngày Dự Kiến</th>
              <th>Trạng Thái</th>
              <th>Thao Tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>Đang tải...</td></tr> : 
              orders.map(o => (
              <tr key={o.id}>
                <td className="font-semibold">{o.orderCode}</td>
                <td>{o.supplierName}</td>
                <td>{o.totalItems}</td>
                <td>{new Date(o.expectedDate).toLocaleDateString()}</td>
                <td>
                  <span className={`badge badge-${o.status === 'COMPLETED' ? 'success' : 'warning'}`}>{o.status}</span>
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
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Chi tiết phiếu: {selectedOrder.orderCode}</h3>
                <p className="text-muted text-sm">{selectedOrder.supplierName}</p>
              </div>
              <button onClick={() => setSelectedOrder(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            {renderStepper(selectedOrder.status)}

            {selectedOrder.status === 'RECEIVING' && (
              <button 
                onClick={() => setShowScanner(true)}
                className="w-full bg-primary text-primary-on rounded-xl h-14 flex items-center justify-center gap-2 text-lg font-bold shadow-lg active:scale-95 transition-transform my-6"
              >
                <ScanBarcode size={24} />
                Quét mã Barcode Hàng Hóa
              </button>
            )}

            <div style={{ marginTop: '2rem' }}>
              <h4 style={{ fontWeight: 600, marginBottom: '1rem' }}>Danh sách sản phẩm</h4>
              <table className="table">
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Tên SP</th>
                    <th>SL Dự Kiến</th>
                    <th>SL Thực Nhận</th>
                    {selectedOrder.status === 'STORING' && <th>Gán Vị Trí</th>}
                  </tr>
                </thead>
                <tbody>
                  {selectedOrder.items?.map(item => (
                    <tr key={item.id}>
                      <td className="font-medium">{item.sku}</td>
                      <td>{item.productName}</td>
                      <td>{item.expectedQuantity}</td>
                      <td>
                        {selectedOrder.status === 'RECEIVING' ? (
                          <input type="number" defaultValue={item.expectedQuantity} onBlur={(e) => updateReceivedQuantity(item.id, parseInt(e.target.value))} style={{ width: '80px', padding: '4px' }} />
                        ) : (
                          <span style={{ color: item.receivedQuantity === item.expectedQuantity ? 'var(--success)' : 'var(--warning)', fontWeight: 600 }}>{item.receivedQuantity}</span>
                        )}
                      </td>
                      {selectedOrder.status === 'STORING' && (
                        <td>
                          {item.assignedSlotId ? (
                            <span className="badge badge-success">{item.assignedZone} - {item.assignedSlotId} ({item.lotCode})</span>
                          ) : (
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              {storeForm[item.id]?.slotId ? (
                                <span style={{ fontWeight: 'bold' }}>{storeForm[item.id].zone} - {storeForm[item.id].slotId}</span>
                              ) : (
                                <span className="text-muted text-sm">Chưa chọn</span>
                              )}
                              <button className="btn btn-outline" style={{ padding: '4px 8px', fontSize: '0.75rem' }} onClick={() => setShowMapModal(item.id)}>
                                🌍 Chọn Sa Bàn 3D
                              </button>
                              {storeForm[item.id]?.slotId && (
                                <button className="btn btn-primary" style={{ padding: '4px 8px', fontSize: '0.75rem' }} onClick={() => assignStorage(item.id)}>Lưu</button>
                              )}
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
              {selectedOrder.status === 'PENDING' && (
                <button className="bg-primary text-primary-on px-6 py-3 rounded-lg flex items-center gap-2 font-medium" onClick={() => advanceState(selectedOrder.id, 'receive')}>Bắt đầu Nhận Hàng <ArrowRight size={16} /></button>
              )}
              {selectedOrder.status === 'RECEIVING' && (
                <button className="bg-amber-500 text-white px-6 py-3 rounded-lg flex items-center gap-2 font-medium" onClick={() => advanceState(selectedOrder.id, 'quality-check')}>Chuyển sang QC <ArrowRight size={16} /></button>
              )}
              {selectedOrder.status === 'QUALITY_CHECK' && (
                <button className="btn btn-success" style={{ backgroundColor: 'var(--color-success-500)', color: '#fff' }} onClick={() => advanceState(selectedOrder.id, 'store', { qualityPassed: true })}>Pass QC & Lưu Kho <ArrowRight size={16} /></button>
              )}
              {selectedOrder.status === 'STORING' && selectedOrder.items?.every(i => i.assignedSlotId) && (
                <button className="btn btn-primary" onClick={() => advanceState(selectedOrder.id, 'complete')}>Hoàn tất Nhập Kho <CheckCircle2 size={16} /></button>
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
           <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>Tạo Phiếu Nhập Kho</h3>
           <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
             <div>
               <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.875rem', fontWeight: 500 }}>Nhà cung cấp</label>
               <input required type="text" value={createForm.supplierName} onChange={e => setCreateForm({...createForm, supplierName: e.target.value})} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)' }} />
             </div>
             <div>
               <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.875rem', fontWeight: 500 }}>Ngày dự kiến</label>
               <input required type="date" value={createForm.expectedDate} onChange={e => setCreateForm({...createForm, expectedDate: e.target.value})} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)' }} />
             </div>
             <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.02)', border: '1px dashed var(--border)', borderRadius: '8px', marginBottom: '1rem' }}>
               <h4 style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '4px' }}><Upload size={16} /> Nhập hàng loạt từ Excel/CSV</h4>
               <input type="file" accept=".csv" onChange={handleFileUpload} style={{ fontSize: '0.875rem' }} />
               {createForm.parsedItems && (
                 <p style={{ color: 'var(--primary)', fontWeight: 600, fontSize: '0.875rem', marginTop: '0.5rem' }}>
                   ✅ Đã trích xuất thành công {createForm.parsedItems.length} mặt hàng.
                 </p>
               )}
               {!createForm.parsedItems && <p className="text-muted text-sm mt-2">Ghi chú: Nếu không upload, Phiếu nhập mặc định 1 mặt hàng (Sữa tươi Đà Lạt 1L) để test.</p>}
             </div>
             
             <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-outline">Huỷ</button>
                <button type="submit" className="btn btn-primary">Tạo Phiếu</button>
             </div>
           </form>
         </div>
       </div>
      )}

      {/* Warehouse Map 3D Modal */}
      {showMapModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
          <div className="card" style={{ padding: '3rem', position: 'relative', width: '900px', maxWidth: '95%' }}>
            <button onClick={() => setShowMapModal(null)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)' }}><X size={32} /></button>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '2rem', textAlign: 'center' }}>Sơ Đồ Kệ Hàng (Visual Warehouse)</h3>
            
            <WarehouseMap3D 
              selectedSlot={storeForm[showMapModal]?.slotId}
              onSelectSlot={(zone, slotId) => {
                setStoreForm({ 
                  ...storeForm, 
                  [showMapModal]: { ...storeForm[showMapModal], zone, slotId, lotCode: 'LOT-' + Math.floor(Math.random() * 10000) } 
                });
                setShowMapModal(null);
              }}
            />
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '2rem' }}>
              * Click trực tiếp vào một khối (Kệ hàng) để lưu hàng hoá vào vị trí tương ứng.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default InboundOrders;
