import React, { useState, useEffect } from 'react';
import { Package, AlertCircle, Plus, Edit, Trash2, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const API_BASE = 'http://localhost:3010';

interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  storageType: string;
  minTemp: number;
  maxTemp: number;
  maxHumidity: number;
  unit: string;
}

const Products = () => {
  const { token, user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    sku: '', name: '', category: '', storageType: 'DRY',
    minTemp: 0, maxTemp: 0, maxHumidity: 0, unit: 'kg'
  });

  const canManage = user?.role === 'ADMIN' || user?.role === 'WAREHOUSE_MANAGER';

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/products`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (product?: Product) => {
    if (product) {
      setFormData({
        sku: product.sku, name: product.name, category: product.category,
        storageType: product.storageType, minTemp: product.minTemp,
        maxTemp: product.maxTemp, maxHumidity: product.maxHumidity, unit: product.unit
      });
      setEditingId(product.id);
    } else {
      setFormData({
        sku: '', name: '', category: '', storageType: 'DRY',
        minTemp: 0, maxTemp: 0, maxHumidity: 0, unit: 'kg'
      });
      setEditingId(null);
    }
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingId ? `${API_BASE}/products/${editingId}` : `${API_BASE}/products`;
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      
      if (res.ok) {
        setShowModal(false);
        fetchProducts();
      } else {
        const err = await res.json();
        alert(`Lỗi: ${err.message || 'Không thể lưu sản phẩm'}`);
      }
    } catch (error) {
      console.error('Failed to save product:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xoá sản phẩm này?')) return;
    try {
      const res = await fetch(`${API_BASE}/products/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchProducts();
      } else {
        const err = await res.json();
        alert(`Lỗi: ${err.message || 'Không thể xoá sản phẩm'}`);
      }
    } catch (error) {
      console.error('Failed to delete product:', error);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-6)' }}>
      <div className="flex items-center justify-between">
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.25rem' }}>Danh mục Sản phẩm (SKU)</h2>
          <p className="text-muted" style={{ fontSize: '0.875rem' }}>Quản lý danh sách các mặt hàng (Master Data), mã SKU, và điều kiện bảo quản vật lý.</p>
        </div>
        <div>
          {canManage && (
            <button className="btn btn-primary" onClick={() => handleOpenModal()} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <Plus size={18} /> Thêm sản phẩm
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--spacing-4)' }}>
        <div className="card">
          <div className="card-header">
            <div className="card-title">Tổng SKU</div>
            <div className="card-icon primary"><Package size={18} /></div>
          </div>
          <div className="card-value">{products.length}</div>
          <div className="card-desc">sản phẩm trong hệ thống</div>
        </div>
        <div className="card">
          <div className="card-header">
            <div className="card-title">Cần kiểm tra</div>
            <div className="card-icon warning" style={{ backgroundColor: 'var(--color-warning-100)', color: 'var(--color-warning-500)' }}><AlertCircle size={18} /></div>
          </div>
          <div className="card-value">0</div>
          <div className="card-desc">SKU lỗi thông tin</div>
        </div>
      </div>

      {/* Table Section */}
      <div className="card" style={{ padding: '0' }}>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Mã SKU</th>
                <th>Tên Sản phẩm</th>
                <th>Phân loại</th>
                <th>Loại kho</th>
                <th>Nhiệt độ (°C)</th>
                <th>ĐVT</th>
                {canManage && <th>Thao tác</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>Đang tải dữ liệu...</td></tr>
              ) : products.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>Không có sản phẩm nào.</td></tr>
              ) : (
                products.map((p) => (
                  <tr key={p.id}>
                    <td className="font-medium text-muted">{p.sku}</td>
                    <td className="font-semibold">{p.name}</td>
                    <td>{p.category}</td>
                    <td>
                      <span className="badge badge-neutral" style={{
                        backgroundColor: p.storageType === 'COLD' ? '#e0f2fe' : p.storageType === 'FROZEN' ? '#cffafe' : '#fef3c7',
                        color: p.storageType === 'COLD' ? '#0369a1' : p.storageType === 'FROZEN' ? '#0891b2' : '#d97706',
                        border: 'none'
                      }}>
                        {p.storageType === 'COLD' ? 'Kho Mát' : p.storageType === 'FROZEN' ? 'Kho Đông' : 'Kho Khô'}
                      </span>
                    </td>
                    <td>{p.minTemp} ~ {p.maxTemp}</td>
                    <td>{p.unit}</td>
                    {canManage && (
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button onClick={() => handleOpenModal(p)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-neutral-500)' }} title="Sửa"><Edit size={16} /></button>
                          {user?.role === 'ADMIN' && (
                            <button onClick={() => handleDelete(p.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-danger-500)' }} title="Xoá"><Trash2 size={16} /></button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Form */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '500px', maxWidth: '90%', padding: '1.5rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>{editingId ? 'Sửa thông tin sản phẩm' : 'Thêm sản phẩm mới'}</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Mã SKU</label>
                  <input required type="text" value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)' }} />
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Đơn vị tính (Unit)</label>
                  <input required type="text" value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)' }} />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Tên sản phẩm</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)' }} />
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Ngành hàng (Category)</label>
                  <input required type="text" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)' }} />
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Loại kho (Storage Type)</label>
                  <select value={formData.storageType} onChange={e => setFormData({...formData, storageType: e.target.value})} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)' }}>
                    <option value="COLD">Kho Mát</option>
                    <option value="FROZEN">Kho Đông Lạnh</option>
                    <option value="DRY">Kho Khô</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Nhiệt độ tối thiểu (°C)</label>
                  <input required type="number" step="0.1" value={formData.minTemp} onChange={e => setFormData({...formData, minTemp: parseFloat(e.target.value)})} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)' }} />
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Nhiệt độ tối đa (°C)</label>
                  <input required type="number" step="0.1" value={formData.maxTemp} onChange={e => setFormData({...formData, maxTemp: parseFloat(e.target.value)})} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)' }} />
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Độ ẩm tối đa (%)</label>
                  <input required type="number" step="1" value={formData.maxHumidity} onChange={e => setFormData({...formData, maxHumidity: parseFloat(e.target.value)})} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)' }} />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ padding: '0.5rem 1rem', borderRadius: '4px', border: '1px solid var(--border)', backgroundColor: 'transparent', cursor: 'pointer' }}>Huỷ</button>
                <button type="submit" className="btn btn-primary" style={{ border: 'none', cursor: 'pointer' }}>{editingId ? 'Cập nhật' : 'Thêm mới'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;
