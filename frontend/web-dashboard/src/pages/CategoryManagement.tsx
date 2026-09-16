import React, { useState, useEffect } from 'react';
import { FolderTree, Plus, Edit, Trash2, X, CheckCircle, Package } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const API_BASE = 'http://localhost:3010';

interface Category {
  id: string;
  name: string;
  description: string;
  productCount: number;
  createdAt: string;
}

const CategoryManagement = () => {
  const { token } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState('');

  const [formData, setFormData] = useState({ name: '', description: '' });

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch(`${API_BASE}/categories`, { headers });
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleOpenModal = (cat?: Category) => {
    if (cat) {
      setFormData({ name: cat.name, description: cat.description || '' });
      setEditingId(cat.id);
    } else {
      setFormData({ name: '', description: '' });
      setEditingId(null);
    }
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingId ? `${API_BASE}/categories/${editingId}` : `${API_BASE}/categories`;
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setShowModal(false);
        setSuccessMsg(editingId ? 'Đã cập nhật danh mục thành công!' : 'Đã thêm danh mục mới thành công!');
        setTimeout(() => setSuccessMsg(''), 4000);
        fetchCategories();
      } else {
        const err = await res.json();
        alert(`Lỗi: ${err.message || 'Không thể lưu danh mục'}`);
      }
    } catch (error) {
      console.error('Failed to save category:', error);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa danh mục "${name}"?`)) return;
    try {
      const res = await fetch(`${API_BASE}/categories/${id}`, {
        method: 'DELETE',
        headers,
      });
      if (res.ok) {
        setSuccessMsg('Đã xóa danh mục thành công!');
        setTimeout(() => setSuccessMsg(''), 4000);
        fetchCategories();
      } else {
        const err = await res.json();
        alert(`Lỗi: ${err.message || 'Không thể xóa danh mục'}`);
      }
    } catch (error) {
      console.error('Failed to delete category:', error);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-6)' }}>
      <div className="flex items-center justify-between">
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.25rem' }}>Quản lý Danh mục Sản phẩm</h2>
          <p className="text-muted" style={{ fontSize: '0.875rem' }}>
            Tạo và quản lý các ngành hàng / danh mục phân loại sản phẩm trong hệ thống kho.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => handleOpenModal()} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <Plus size={18} /> Thêm danh mục
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

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--spacing-4)' }}>
        <div className="card">
          <div className="card-header">
            <div className="card-title">Tổng danh mục</div>
            <div className="card-icon primary"><FolderTree size={18} /></div>
          </div>
          <div className="card-value">{categories.length}</div>
          <div className="card-desc">ngành hàng đang hoạt động</div>
        </div>
        <div className="card">
          <div className="card-header">
            <div className="card-title">Tổng SKU liên kết</div>
            <div className="card-icon primary"><Package size={18} /></div>
          </div>
          <div className="card-value">{categories.reduce((sum, c) => sum + c.productCount, 0)}</div>
          <div className="card-desc">sản phẩm đã gắn danh mục</div>
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: '0' }}>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}>#</th>
                <th>Tên danh mục</th>
                <th>Mô tả</th>
                <th>Số SP</th>
                <th>Ngày tạo</th>
                <th style={{ width: '120px' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>Đang tải dữ liệu...</td></tr>
              ) : categories.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>Không có danh mục nào.</td></tr>
              ) : (
                categories.map((cat, idx) => (
                  <tr key={cat.id}>
                    <td className="text-muted">{idx + 1}</td>
                    <td className="font-semibold">{cat.name}</td>
                    <td className="text-muted" style={{ fontSize: '0.825rem', maxWidth: '300px' }}>{cat.description || '—'}</td>
                    <td>
                      <span style={{
                        padding: '0.15rem 0.4rem', borderRadius: '4px', fontSize: '0.75rem',
                        backgroundColor: '#eff6ff', color: '#2563eb', fontWeight: 600,
                      }}>
                        {cat.productCount}
                      </span>
                    </td>
                    <td className="text-muted" style={{ fontSize: '0.825rem' }}>
                      {new Date(cat.createdAt).toLocaleDateString('vi-VN')}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={() => handleOpenModal(cat)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-neutral-500)' }} title="Sửa">
                          <Edit size={16} />
                        </button>
                        <button onClick={() => handleDelete(cat.id, cat.name)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-danger-500)' }} title="Xóa">
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
          <div className="card" style={{ width: '480px', maxWidth: '90%', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 600 }}>{editingId ? 'Sửa danh mục' : 'Thêm danh mục mới'}</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Tên danh mục *</label>
                <input
                  required type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="VD: Thịt tươi sống"
                  style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Mô tả</label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Mô tả chi tiết danh mục..."
                  rows={3}
                  style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)', resize: 'vertical' }}
                />
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

export default CategoryManagement;
