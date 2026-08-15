import React, { useState, useEffect } from 'react';
import { Boxes, MapPin, Plus, Edit2, Trash2, RefreshCw, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const WAREHOUSE_API = 'http://localhost:3005'; // warehouse-service

interface Warehouse {
  id: string;
  code: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  isActive: boolean;
}

const Inventory = () => {
  const { token } = useAuth();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(false);
  const [showWhModal, setShowWhModal] = useState(false);
  const [editingWh, setEditingWh] = useState<Warehouse | null>(null);

  // Warehouse form state
  const [whForm, setWhForm] = useState({
    code: '',
    name: '',
    address: '',
    latitude: 10.8,
    longitude: 106.6,
    isActive: true
  });

  useEffect(() => {
    fetchWarehouses();
  }, []);

  const fetchWarehouses = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${WAREHOUSE_API}/warehouses`);
      if (res.ok) {
        const data = await res.json();
        setWarehouses(data);
      }
    } catch (error) {
      console.error('Failed to fetch warehouses:', error);
    } finally {
      setLoading(false);
    }
  };

  // CREATE / UPDATE WAREHOUSE
  const handleSaveWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!whForm.code || !whForm.name || !whForm.address) {
      alert('Vui lòng điền đầy đủ mã kho, tên kho và địa chỉ!');
      return;
    }

    try {
      const url = editingWh
        ? `${WAREHOUSE_API}/warehouses/${editingWh.id}`
        : `${WAREHOUSE_API}/warehouses`;
      const method = editingWh ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(whForm)
      });

      if (res.ok) {
        setShowWhModal(false);
        setEditingWh(null);
        setWhForm({ code: '', name: '', address: '', latitude: 10.8, longitude: 106.6, isActive: true });
        fetchWarehouses();
      } else {
        const err = await res.json();
        alert(`Lỗi: ${err.message || 'Không thể lưu kho hàng'}`);
      }
    } catch (error) {
      console.error('Failed to save warehouse:', error);
    }
  };

  // DELETE WAREHOUSE
  const handleDeleteWarehouse = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa kho hàng này khỏi hệ thống?')) return;
    try {
      const res = await fetch(`${WAREHOUSE_API}/warehouses/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchWarehouses();
      } else {
        alert('Không thể xóa kho hàng');
      }
    } catch (error) {
      console.error('Failed to delete warehouse:', error);
    }
  };

  // TOGGLE ACTIVE STATUS
  const handleToggleActive = async (wh: Warehouse) => {
    try {
      const res = await fetch(`${WAREHOUSE_API}/warehouses/${wh.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...wh, isActive: !wh.isActive })
      });
      if (res.ok) {
        fetchWarehouses();
      }
    } catch (error) {
      console.error('Failed to toggle warehouse active status:', error);
    }
  };

  const handleEditClick = (wh: Warehouse) => {
    setEditingWh(wh);
    setWhForm({
      code: wh.code,
      name: wh.name,
      address: wh.address,
      latitude: wh.latitude,
      longitude: wh.longitude,
      isActive: wh.isActive
    });
    setShowWhModal(true);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', background: '#f8fafc', padding: '1.5rem', minHeight: '100vh' }}>
      
      {/* Title Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff', padding: '1.25rem 1.5rem', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.04)' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
            🏢 Quản Lý Danh Sách Kho Hàng
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '4px' }}>
            Thiết lập danh sách các kho hàng vệ tinh, vị trí định vị địa lý GPS và trạng thái hoạt động trên toàn TP.HCM.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={fetchWarehouses}
            className="btn btn-outline"
            style={{ borderRadius: '10px', fontWeight: 600, padding: '10px 16px', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '6px', border: '1px solid #cbd5e1', cursor: 'pointer', backgroundColor: '#fff' }}
          >
            <RefreshCw size={16} /> Làm mới
          </button>
          <button
            onClick={() => {
              setEditingWh(null);
              setWhForm({ code: '', name: '', address: '', latitude: 10.8282, longitude: 106.6802, isActive: true });
              setShowWhModal(true);
            }}
            className="btn btn-primary"
            style={{ borderRadius: '10px', fontWeight: 600, padding: '10px 16px', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: '#0f766e', color: '#fff', border: 'none', cursor: 'pointer', boxShadow: '0 4px 12px rgba(15,118,110,0.25)' }}
          >
            <Plus size={16} /> Thêm kho hàng mới
          </button>
        </div>
      </div>

      {/* Warehouses Table Grid */}
      <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #cbd5e1', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.03)', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '0.98rem', fontWeight: 800, color: '#1e293b' }}>
            📋 Danh sách các kho ({warehouses.length} kho)
          </h3>
        </div>
        <div className="table-container" style={{ margin: '0' }}>
          <table className="table" style={{ fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc' }}>
                <th>Mã Kho</th>
                <th>Tên Kho Hàng</th>
                <th>Địa Chỉ Đăng Ký</th>
                <th>Tọa Độ Vị Trí (Lat, Lng)</th>
                <th>Trạng Thái</th>
                <th style={{ textAlign: 'center' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '3rem' }}>Đang tải danh sách kho hàng...</td></tr>
              ) : warehouses.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>Chưa có kho hàng nào được đăng ký trong hệ thống.</td></tr>
              ) : (
                warehouses.map((wh) => (
                  <tr key={wh.id}>
                    <td className="font-semibold" style={{ color: '#0f766e' }}>{wh.code}</td>
                    <td className="font-medium" style={{ color: '#1e293b' }}>{wh.name}</td>
                    <td style={{ color: '#475569' }}>
                      <span style={{ display: 'flex', alignItems: 'start', gap: '4px' }}>
                        <MapPin size={14} style={{ color: '#0f766e', flexShrink: 0, marginTop: '2px' }} />
                        {wh.address}
                      </span>
                    </td>
                    <td style={{ color: '#64748b' }}>{wh.latitude.toFixed(4)}, {wh.longitude.toFixed(4)}</td>
                    <td>
                      <button
                        onClick={() => handleToggleActive(wh)}
                        style={{
                          border: 'none',
                          background: 'none',
                          cursor: 'pointer',
                          padding: '2px 8px',
                          borderRadius: '20px',
                          backgroundColor: wh.isActive ? '#ecfdf5' : '#fef2f2',
                          color: wh.isActive ? '#065f46' : '#991b1b',
                          fontSize: '0.68rem',
                          fontWeight: 800
                        }}
                      >
                        {wh.isActive ? '🟢 Đang hoạt động' : '🔴 Tạm dừng'}
                      </button>
                    </td>
                    <td>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                        <button
                          onClick={() => handleEditClick(wh)}
                          style={{
                            border: '1px solid #cbd5e1',
                            backgroundColor: '#fff',
                            color: '#475569',
                            width: '28px',
                            height: '28px',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer'
                          }}
                          title="Sửa kho"
                        >
                          <Edit2 size={12} />
                        </button>
                        <button
                          onClick={() => handleDeleteWarehouse(wh.id)}
                          style={{
                            border: '1px solid #fee2e2',
                            backgroundColor: '#fff',
                            color: '#ef4444',
                            width: '28px',
                            height: '28px',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer'
                          }}
                          title="Xóa kho"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add/Edit Warehouse */}
      {showWhModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '480px', maxWidth: '90%', padding: '1.5rem', borderRadius: '16px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.25rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1e293b' }}>
                {editingWh ? 'Cập Nhật Kho Hàng' : 'Đăng Ký Kho Hàng Mới'}
              </h3>
              <button onClick={() => setShowWhModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={20} /></button>
            </div>
            
            <form onSubmit={handleSaveWarehouse} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569' }}>Mã kho (Warehouse Code) *</label>
                  <input
                    required
                    disabled={!!editingWh}
                    type="text"
                    placeholder="VD: WH-017"
                    value={whForm.code}
                    onChange={e => setWhForm({...whForm, code: e.target.value})}
                    style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', backgroundColor: editingWh ? '#f1f5f9' : '#fff' }}
                  />
                </div>
                <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569' }}>Tên kho hàng *</label>
                  <input required type="text" placeholder="VD: Kho Hàng Bình Tân" value={whForm.name} onChange={e => setWhForm({...whForm, name: e.target.value})} style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }} />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569' }}>Địa chỉ kho hàng *</label>
                <input required type="text" placeholder="Số nhà, tên đường, Phường, Quận, TP.HCM" value={whForm.address} onChange={e => setWhForm({...whForm, address: e.target.value})} style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }} />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569' }}>Vĩ độ (Latitude) *</label>
                  <input required type="number" step="0.000001" placeholder="VD: 10.7719" value={whForm.latitude} onChange={e => setWhForm({...whForm, latitude: parseFloat(e.target.value) || 0})} style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }} />
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569' }}>Kinh độ (Longitude) *</label>
                  <input required type="number" step="0.000001" placeholder="VD: 106.6669" value={whForm.longitude} onChange={e => setWhForm({...whForm, longitude: parseFloat(e.target.value) || 0})} style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }} />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                <input type="checkbox" id="isActiveWh" checked={whForm.isActive} onChange={e => setWhForm({...whForm, isActive: e.target.checked})} style={{ cursor: 'pointer' }} />
                <label htmlFor="isActiveWh" style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', cursor: 'pointer' }}>Kích hoạt hoạt động lập tức</label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
                <button type="button" onClick={() => setShowWhModal(false)} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: 'transparent', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700 }}>Huỷ</button>
                <button type="submit" className="btn btn-primary" style={{ border: 'none', cursor: 'pointer', borderRadius: '8px', padding: '8px 16px', fontSize: '0.82rem', fontWeight: 700, backgroundColor: '#0f766e', color: '#fff' }}>Lưu thông tin</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
