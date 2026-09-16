import React, { useState, useEffect } from 'react';
import { Building2, Plus, Edit, Trash2, X, CheckCircle, Phone, Mail, MapPin } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const API_BASE = 'http://localhost:3011';

interface Supplier {
  id: string;
  name: string;
  contact: string;
  address: string;
  phone: string;
  email: string;
  taxCode: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
}

const SupplierManagement = () => {
  const { token } = useAuth();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState('');

  const [formData, setFormData] = useState({
    name: '', contact: '', address: '', phone: '', email: '', taxCode: '', status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
  });

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };

  const fetchSuppliers = async () => {
    try {
      const res = await fetch(`${API_BASE}/inventory/suppliers`, { headers });
      if (res.ok) {
        const data = await res.json();
        setSuppliers(data);
      }
    } catch (err) {
      console.error('Failed to fetch suppliers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const handleOpenModal = (sup?: Supplier) => {
    if (sup) {
      setFormData({
        name: sup.name, contact: sup.contact, address: sup.address,
        phone: sup.phone || '', email: sup.email || '',
        taxCode: sup.taxCode || '', status: sup.status || 'ACTIVE',
      });
      setEditingId(sup.id);
    } else {
      setFormData({ name: '', contact: '', address: '', phone: '', email: '', taxCode: '', status: 'ACTIVE' });
      setEditingId(null);
    }
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingId ? `${API_BASE}/inventory/suppliers/${editingId}` : `${API_BASE}/inventory/suppliers`;
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setShowModal(false);
        setSuccessMsg(editingId ? 'Đã cập nhật nhà cung cấp thành công!' : 'Đã thêm nhà cung cấp mới thành công!');
        setTimeout(() => setSuccessMsg(''), 4000);
        fetchSuppliers();
      } else {
        const err = await res.json();
        alert(`Lỗi: ${err.message || 'Không thể lưu nhà cung cấp'}`);
      }
    } catch (error) {
      console.error('Failed to save supplier:', error);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa nhà cung cấp "${name}"?`)) return;
    try {
      const res = await fetch(`${API_BASE}/inventory/suppliers/${id}`, {
        method: 'DELETE',
        headers,
      });
      if (res.ok) {
        setSuccessMsg('Đã xóa nhà cung cấp thành công!');
        setTimeout(() => setSuccessMsg(''), 4000);
        fetchSuppliers();
      } else {
        const err = await res.json();
        alert(`Lỗi: ${err.message || 'Không thể xóa nhà cung cấp'}`);
      }
    } catch (error) {
      console.error('Failed to delete supplier:', error);
    }
  };

  const activeCount = suppliers.filter(s => s.status === 'ACTIVE').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-6)' }}>
      <div className="flex items-center justify-between">
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.25rem' }}>Quản lý Nhà cung cấp</h2>
          <p className="text-muted" style={{ fontSize: '0.875rem' }}>
            Thêm, sửa, xóa và theo dõi thông tin các nhà cung cấp thực phẩm cho hệ thống kho.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => handleOpenModal()} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <Plus size={18} /> Thêm NCC
        </button>
      </div>

      {successMsg && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem',
          borderRadius: 'var(--radius-md)', backgroundColor: '#f0fdf4',
          border: '1px solid #bbf7d0', color: '#16a34a', fontSize: '0.875rem',
        }}>
          <CheckCircle size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--spacing-4)' }}>
        <div className="card">
          <div className="card-header">
            <div className="card-title">Tổng NCC</div>
            <div className="card-icon primary"><Building2 size={18} /></div>
          </div>
          <div className="card-value">{suppliers.length}</div>
          <div className="card-desc">nhà cung cấp trong hệ thống</div>
        </div>
        <div className="card">
          <div className="card-header">
            <div className="card-title">Đang hoạt động</div>
            <div className="card-icon primary" style={{ backgroundColor: '#f0fdf4', color: '#16a34a' }}><CheckCircle size={18} /></div>
          </div>
          <div className="card-value" style={{ color: '#16a34a' }}>{activeCount}</div>
          <div className="card-desc">NCC đang cung cấp hàng</div>
        </div>
        <div className="card">
          <div className="card-header">
            <div className="card-title">Ngừng hợp tác</div>
            <div className="card-icon primary" style={{ backgroundColor: '#fef2f2', color: '#ef4444' }}><Building2 size={18} /></div>
          </div>
          <div className="card-value" style={{ color: '#ef4444' }}>{suppliers.length - activeCount}</div>
          <div className="card-desc">NCC đã ngừng cung cấp</div>
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: '0' }}>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}>#</th>
                <th>Tên nhà cung cấp</th>
                <th>Người liên hệ</th>
                <th>Liên lạc</th>
                <th>Địa chỉ</th>
                <th>MST</th>
                <th>Trạng thái</th>
                <th style={{ width: '100px' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2rem' }}>Đang tải dữ liệu...</td></tr>
              ) : suppliers.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2rem' }}>Không có nhà cung cấp nào.</td></tr>
              ) : (
                suppliers.map((sup, idx) => (
                  <tr key={sup.id}>
                    <td className="text-muted">{idx + 1}</td>
                    <td className="font-semibold">{sup.name}</td>
                    <td>{sup.contact}</td>
                    <td style={{ fontSize: '0.8rem' }}>
                      {sup.phone && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--text-muted)' }}>
                          <Phone size={12} /> {sup.phone}
                        </div>
                      )}
                      {sup.email && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--text-muted)' }}>
                          <Mail size={12} /> {sup.email}
                        </div>
                      )}
                    </td>
                    <td style={{ fontSize: '0.8rem', maxWidth: '200px' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.25rem', color: 'var(--text-muted)' }}>
                        <MapPin size={12} style={{ flexShrink: 0, marginTop: 2 }} /> {sup.address}
                      </div>
                    </td>
                    <td className="text-muted" style={{ fontSize: '0.8rem' }}>{sup.taxCode || '—'}</td>
                    <td>
                      <span style={{
                        padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600,
                        backgroundColor: sup.status === 'ACTIVE' ? '#f0fdf4' : '#fef2f2',
                        color: sup.status === 'ACTIVE' ? '#16a34a' : '#ef4444',
                        border: `1px solid ${sup.status === 'ACTIVE' ? '#bbf7d0' : '#fecaca'}`,
                      }}>
                        {sup.status === 'ACTIVE' ? 'Hoạt động' : 'Ngừng'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={() => handleOpenModal(sup)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-neutral-500)' }} title="Sửa">
                          <Edit size={16} />
                        </button>
                        <button onClick={() => handleDelete(sup.id, sup.name)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-danger-500)' }} title="Xóa">
                          <Trash2 size={16} />
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

      {/* Modal */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '560px', maxWidth: '90%', padding: '1.5rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 600 }}>{editingId ? 'Sửa nhà cung cấp' : 'Thêm nhà cung cấp mới'}</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Tên nhà cung cấp *</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="VD: Dalat Organic Farms" style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)' }} />
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Người liên hệ *</label>
                  <input required type="text" value={formData.contact} onChange={e => setFormData({ ...formData, contact: e.target.value })}
                    placeholder="Họ tên người phụ trách" style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)' }} />
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Số điện thoại</label>
                  <input type="text" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="0901 234 567" style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)' }} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Email</label>
                  <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })}
                    placeholder="ncc@company.vn" style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)' }} />
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Mã số thuế</label>
                  <input type="text" value={formData.taxCode} onChange={e => setFormData({ ...formData, taxCode: e.target.value })}
                    placeholder="0123456789" style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)' }} />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Địa chỉ *</label>
                <input required type="text" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Số, đường, quận, thành phố" style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)' }} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Trạng thái</label>
                <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value as 'ACTIVE' | 'INACTIVE' })}
                  style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)' }}>
                  <option value="ACTIVE">Đang hoạt động</option>
                  <option value="INACTIVE">Ngừng hợp tác</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ padding: '0.5rem 1rem', borderRadius: '4px', border: '1px solid var(--border)', backgroundColor: 'transparent', cursor: 'pointer' }}>Hủy</button>
                <button type="submit" className="btn btn-primary" style={{ border: 'none', cursor: 'pointer' }}>{editingId ? 'Cập nhật' : 'Thêm mới'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupplierManagement;
