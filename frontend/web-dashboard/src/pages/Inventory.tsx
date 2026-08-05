import React, { useState, useEffect } from 'react';
import { Boxes, Clock, PackageCheck, MapPin, Plus, Minus, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const API_BASE = 'http://localhost:3011'; // inventory-service

interface Lot {
  id: string;
  lotCode: string;
  productId: string;
  supplierId: string;
  importDate: string;
  expiryDate: string;
  quantity: number;
  remainingQty: number;
  zone: string;
  location: string;
  riskScore: number;
  status: string;
}

const Inventory = () => {
  const { token, user } = useAuth();
  const [lots, setLots] = useState<Lot[]>([]);
  const [loading, setLoading] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  // Form states
  const [importForm, setImportForm] = useState({
    lotCode: '', productId: '', supplierId: 'SUP-01', expiryDate: '',
    quantity: 0, zone: 'COLD', location: ''
  });
  const [exportForm, setExportForm] = useState({
    lotCode: '', quantity: 0, reason: 'Xuất hàng bán'
  });

  const canManage = user?.role === 'ADMIN' || user?.role === 'WAREHOUSE_MANAGER' || user?.role === 'WAREHOUSE_STAFF';

  useEffect(() => {
    fetchLots();
  }, []);

  const fetchLots = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/inventory/lots`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLots(data);
      }
    } catch (error) {
      console.error('Failed to fetch lots:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/inventory/lots/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(importForm)
      });
      if (res.ok) {
        setShowImportModal(false);
        fetchLots();
      } else {
        const err = await res.json();
        alert(`Lỗi: ${err.message || 'Không thể nhập kho'}`);
      }
    } catch (error) {
      console.error('Failed to import:', error);
    }
  };

  const handleExport = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/inventory/lots/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ ...exportForm, referenceType: 'MANUAL_ADJUST' })
      });
      if (res.ok) {
        setShowExportModal(false);
        fetchLots();
      } else {
        const err = await res.json();
        alert(`Lỗi: ${err.message || 'Không thể xuất kho'}`);
      }
    } catch (error) {
      console.error('Failed to export:', error);
    }
  };

  // Tính toán KPI
  const totalLots = lots.length;
  const expiringLots = lots.filter(l => l.status === 'AT_RISK' || l.status === 'EXPIRED').length;
  const totalUnits = lots.reduce((sum, l) => sum + l.remainingQty, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-6)' }}>
      <div className="flex items-center justify-between">
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.25rem' }}>Kho hàng & Lô hàng</h2>
          <p className="text-muted" style={{ fontSize: '0.875rem' }}>Theo dõi lô hàng theo vị trí lưu trữ, ngày nhập, hạn sử dụng và tình trạng bảo quản.</p>
        </div>
        <div className="flex items-center" style={{ gap: 'var(--spacing-3)' }}>
          {canManage && (
            <>
              <button className="btn btn-outline" onClick={() => setShowExportModal(true)}>
                <Minus size={16} style={{ marginRight: 4 }} /> Xuất kho (Export)
              </button>
              <button className="btn btn-primary" onClick={() => setShowImportModal(true)}>
                <Plus size={16} style={{ marginRight: 4 }} /> Nhập kho (Import)
              </button>
            </>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--spacing-4)' }}>
        <div className="card">
          <div className="card-header">
            <div className="card-title">Tổng lô hàng</div>
            <div className="card-icon primary"><Boxes size={18} /></div>
          </div>
          <div className="card-value">{totalLots}</div>
          <div className="card-desc">đang lưu trữ</div>
        </div>
        
        <div className="card">
          <div className="card-header">
            <div className="card-title">Cảnh báo HSD</div>
            <div className="card-icon warning" style={{ backgroundColor: 'var(--color-warning-100)', color: 'var(--color-warning-500)' }}><Clock size={18} /></div>
          </div>
          <div className="card-value">{expiringLots}</div>
          <div className="card-desc">cần xử lý gấp</div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">Tổng đơn vị hàng</div>
            <div className="card-icon primary"><PackageCheck size={18} /></div>
          </div>
          <div className="card-value">{totalUnits}</div>
          <div className="card-desc">số lượng hiện tại</div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">Khu vực kho</div>
            <div className="card-icon primary"><MapPin size={18} /></div>
          </div>
          <div className="card-value">3</div>
          <div className="card-desc">Lạnh - Đông - Khô</div>
        </div>
      </div>

      <div className="card" style={{ padding: '0' }}>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Mã Lô Hàng</th>
                <th>Sản Phẩm (ID)</th>
                <th>Khu Vực</th>
                <th>Vị Trí (Slot)</th>
                <th>Số Lượng Còn</th>
                <th>Hạn Sử Dụng</th>
                <th>Trạng Thái</th>
                <th>Rủi Ro</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2rem' }}>Đang tải dữ liệu...</td></tr>
              ) : lots.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2rem' }}>Chưa có lô hàng nào trong kho.</td></tr>
              ) : (
                lots.map((l) => (
                  <tr key={l.id}>
                    <td className="font-semibold">{l.lotCode}</td>
                    <td className="text-muted">{l.productId}</td>
                    <td>
                      <span className="badge badge-neutral" style={{
                        backgroundColor: l.zone === 'COLD' ? '#e0f2fe' : l.zone === 'FROZEN' ? '#cffafe' : '#fef3c7',
                        color: l.zone === 'COLD' ? '#0369a1' : l.zone === 'FROZEN' ? '#0891b2' : '#d97706',
                        border: 'none'
                      }}>
                        {l.zone}
                      </span>
                    </td>
                    <td className="font-medium">{l.location}</td>
                    <td><span style={{ fontWeight: 600, color: 'var(--primary)' }}>{l.remainingQty}</span> / {l.quantity}</td>
                    <td>{new Date(l.expiryDate).toLocaleDateString('vi-VN')}</td>
                    <td>
                      <span className={`badge badge-${l.status === 'NORMAL' ? 'success' : l.status === 'AT_RISK' ? 'warning' : 'danger'}`}>
                        {l.status}
                      </span>
                    </td>
                    <td>
                      <div className="progress-bar-bg" style={{ height: '6px', width: '60px', marginTop: '6px' }}>
                        <div className={`progress-bar-fill ${l.riskScore > 70 ? 'danger' : l.riskScore > 30 ? 'warning' : 'success'}`} style={{ width: `${l.riskScore}%` }}></div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Import */}
      {showImportModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '500px', maxWidth: '90%', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Nhập Lô Hàng Mới</h3>
              <button onClick={() => setShowImportModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            
            <form onSubmit={handleImport} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Mã Lô (Lot Code)</label>
                  <input required type="text" placeholder="VD: LOT-001" value={importForm.lotCode} onChange={e => setImportForm({...importForm, lotCode: e.target.value})} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)' }} />
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Mã Sản Phẩm (Product ID)</label>
                  <input required type="text" placeholder="UUID của sản phẩm" value={importForm.productId} onChange={e => setImportForm({...importForm, productId: e.target.value})} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)' }} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Số lượng</label>
                  <input required type="number" min="1" value={importForm.quantity || ''} onChange={e => setImportForm({...importForm, quantity: parseInt(e.target.value)})} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)' }} />
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Hạn sử dụng</label>
                  <input required type="date" value={importForm.expiryDate} onChange={e => setImportForm({...importForm, expiryDate: e.target.value})} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)' }} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Khu vực kho</label>
                  <select value={importForm.zone} onChange={e => setImportForm({...importForm, zone: e.target.value})} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)' }}>
                    <option value="COLD">Kho Mát</option>
                    <option value="FROZEN">Kho Đông Lạnh</option>
                    <option value="DRY">Kho Khô</option>
                  </select>
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Vị trí (Location/Slot)</label>
                  <input required type="text" placeholder="VD: CL-A1-01" value={importForm.location} onChange={e => setImportForm({...importForm, location: e.target.value})} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)' }} />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowImportModal(false)} style={{ padding: '0.5rem 1rem', borderRadius: '4px', border: '1px solid var(--border)', backgroundColor: 'transparent', cursor: 'pointer' }}>Huỷ</button>
                <button type="submit" className="btn btn-primary" style={{ border: 'none', cursor: 'pointer' }}>Tạo Phiếu Nhập</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Export */}
      {showExportModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '400px', maxWidth: '90%', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Xuất Kho (Trừ Tồn)</h3>
              <button onClick={() => setShowExportModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            
            <form onSubmit={handleExport} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Mã Lô Hàng (Lot Code)</label>
                <select required value={exportForm.lotCode} onChange={e => setExportForm({...exportForm, lotCode: e.target.value})} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)' }}>
                  <option value="">-- Chọn lô hàng cần xuất --</option>
                  {lots.filter(l => l.remainingQty > 0).map(l => (
                    <option key={l.id} value={l.lotCode}>{l.lotCode} (Tồn: {l.remainingQty})</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Số lượng xuất</label>
                <input required type="number" min="1" value={exportForm.quantity || ''} onChange={e => setExportForm({...exportForm, quantity: parseInt(e.target.value)})} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)' }} />
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowExportModal(false)} style={{ padding: '0.5rem 1rem', borderRadius: '4px', border: '1px solid var(--border)', backgroundColor: 'transparent', cursor: 'pointer' }}>Huỷ</button>
                <button type="submit" className="btn btn-primary" style={{ border: 'none', cursor: 'pointer' }}>Tiến hành Xuất</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
