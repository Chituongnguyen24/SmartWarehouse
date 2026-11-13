import React, { useState, useEffect, useMemo } from 'react';
import { 
  FolderTree, 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Layers, 
  Package, 
  Check, 
  ExternalLink 
} from 'lucide-react';
import { useAuth } from '@/features/auth';
import { globalDataCache } from '@/shared';

const API_BASE = 'http://localhost:3010';
const CACHE_KEY_CATEGORIES = 'cache:web-dashboard:categories:list';

export interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  isActive: boolean;
  productCount: number;
  createdAt?: string;
}

export const Categories: React.FC = () => {
  const { token, user } = useAuth();
  const [categories, setCategories] = useState<CategoryItem[]>(() => {
    // Tận dụng In-Memory Cache ngay khi khởi tạo để hiển thị 0ms không phải load lại
    return globalDataCache.get<CategoryItem[]>(CACHE_KEY_CATEGORIES) || [];
  });
  const [loading, setLoading] = useState<boolean>(() => {
    return !globalDataCache.get<CategoryItem[]>(CACHE_KEY_CATEGORIES);
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    imageUrl: '',
    isActive: true,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Tải danh sách danh mục (có hỗ trợ bộ nhớ đệm client không tải lại khi chuyển tab)
  const fetchCategories = async (forceRefresh: boolean = false) => {
    if (!forceRefresh) {
      const cached = globalDataCache.get<CategoryItem[]>(CACHE_KEY_CATEGORIES);
      if (cached && cached.length > 0) {
        setCategories(cached);
        setLoading(false);
        return;
      }
    }

    try {
      if (forceRefresh) setIsRefreshing(true);
      else if (categories.length === 0) setLoading(true);

      const res = await fetch(`${API_BASE}/categories`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        const list: CategoryItem[] = Array.isArray(data) ? data : [];
        setCategories(list);
        // Lưu vào cache 5 phút
        globalDataCache.set(CACHE_KEY_CATEGORIES, list, 5 * 60 * 1000);
      }
    } catch (err) {
      console.error('Lỗi khi tải danh mục:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCategories(false);
  }, [token]);

  // Lọc danh mục theo tìm kiếm
  const filteredCategories = useMemo(() => {
    if (!searchTerm.trim()) return categories;
    const term = searchTerm.toLowerCase().trim();
    return categories.filter(c => 
      c.name.toLowerCase().includes(term) || 
      (c.slug && c.slug.toLowerCase().includes(term)) ||
      (c.description && c.description.toLowerCase().includes(term))
    );
  }, [categories, searchTerm]);

  // Thống kê
  const stats = useMemo(() => {
    const total = categories.length;
    const active = categories.filter(c => c.isActive).length;
    const totalProducts = categories.reduce((sum, c) => sum + (c.productCount || 0), 0);
    return { total, active, totalProducts };
  }, [categories]);

  // Mở modal thêm mới hoặc sửa
  const handleOpenModal = (cat?: CategoryItem) => {
    setFormError(null);
    if (cat) {
      setEditingCategory(cat);
      setFormData({
        name: cat.name,
        slug: cat.slug || '',
        description: cat.description || '',
        imageUrl: cat.imageUrl || '',
        isActive: cat.isActive !== undefined ? cat.isActive : true,
      });
    } else {
      setEditingCategory(null);
      setFormData({
        name: '',
        slug: '',
        description: '',
        imageUrl: '/icons/rau-cu-qua.png',
        isActive: true,
      });
    }
    setShowModal(true);
  };

  // Lưu danh mục (Tạo mới hoặc Cập nhật)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      const url = editingCategory ? `${API_BASE}/categories/${editingCategory.id}` : `${API_BASE}/categories`;
      const method = editingCategory ? 'PUT' : 'POST';

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
        // Xóa cache để cập nhật danh mục mới nhất
        globalDataCache.invalidate('categories');
        globalDataCache.invalidate('products');
        fetchCategories(true);
      } else {
        const errData = await res.json();
        setFormError(errData.message || 'Không thể lưu danh mục');
      }
    } catch (err: any) {
      setFormError('Lỗi kết nối máy chủ');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Xóa danh mục
  const handleDelete = async (cat: CategoryItem) => {
    if (cat.productCount > 0) {
      alert(`Không thể xóa danh mục "${cat.name}" vì hiện đang có ${cat.productCount} sản phẩm liên kết.`);
      return;
    }

    if (!window.confirm(`Bạn có chắc chắn muốn xóa ngành hàng "${cat.name}"?`)) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/categories/${cat.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        globalDataCache.invalidate('categories');
        fetchCategories(true);
      } else {
        const err = await res.json();
        alert(`Lỗi: ${err.message || 'Không thể xóa danh mục'}`);
      }
    } catch (err) {
      alert('Lỗi kết nối máy chủ khi xóa danh mục');
    }
  };

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Tiêu đề & Nút thao tác chính */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FolderTree size={24} style={{ color: '#0f766e' }} />
            Quản lý Danh mục Ngành hàng
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.25rem', marginBottom: 0 }}>
            Hệ thống 12 ngành hàng chuẩn hóa đồng bộ trực tiếp với Website Khách hàng (CityMart)
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={() => fetchCategories(true)}
            disabled={isRefreshing}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.5rem 0.85rem',
              backgroundColor: '#fff',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              fontSize: '0.85rem',
              fontWeight: 500,
              color: '#475569',
              cursor: 'pointer'
            }}
            title="Làm mới dữ liệu từ cơ sở dữ liệu"
          >
            <RefreshCw size={15} className={isRefreshing ? 'animate-spin' : ''} />
            Làm mới
          </button>
          {(user?.role === 'ADMIN' || user?.role === 'SALES_STAFF') && (
            <button
              onClick={() => handleOpenModal()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.5rem 1rem',
                backgroundColor: '#0f766e',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.85rem',
                fontWeight: 600,
                color: '#fff',
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
              }}
            >
              <Plus size={16} />
              Thêm ngành hàng
            </button>
          )}
        </div>
      </div>

      {/* Thẻ Thống kê KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ backgroundColor: '#fff', padding: '1rem 1.25rem', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 500, marginBottom: '0.25rem' }}>Tổng số danh mục</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
            {stats.total} <span style={{ fontSize: '0.85rem', fontWeight: 400, color: '#64748b' }}>ngành hàng</span>
          </div>
        </div>
        <div style={{ backgroundColor: '#fff', padding: '1rem 1.25rem', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 500, marginBottom: '0.25rem' }}>Đang gắn trên Website</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#166534', fontVariantNumeric: 'tabular-nums' }}>
            {stats.active} <span style={{ fontSize: '0.85rem', fontWeight: 400, color: '#64748b' }}>hoạt động</span>
          </div>
        </div>
        <div style={{ backgroundColor: '#fff', padding: '1rem 1.25rem', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 500, marginBottom: '0.25rem' }}>Tổng sản phẩm liên kết</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0284c7', fontVariantNumeric: 'tabular-nums' }}>
            {stats.totalProducts} <span style={{ fontSize: '0.85rem', fontWeight: 400, color: '#64748b' }}>mặt hàng SKU</span>
          </div>
        </div>
      </div>

      {/* Thanh Tìm kiếm */}
      <div style={{ backgroundColor: '#fff', padding: '0.85rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: '450px' }}>
          <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Tìm theo tên danh mục, slug, hoặc mô tả..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '0.45rem 0.75rem 0.45rem 2.25rem',
              fontSize: '0.85rem',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              outline: 'none'
            }}
          />
        </div>
        <span style={{ fontSize: '0.8rem', color: '#64748b', marginLeft: 'auto' }}>
          Hiển thị <strong>{filteredCategories.length}</strong> / {categories.length} ngành hàng
        </span>
      </div>

      {/* Bảng Danh mục Ngành hàng */}
      <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 600 }}>
              <th style={{ padding: '10px 14px', width: '60px', textAlign: 'center' }}>STT</th>
              <th style={{ padding: '10px 14px', width: '70px', textAlign: 'center' }}>Biểu tượng</th>
              <th style={{ padding: '10px 14px', width: '240px' }}>Tên ngành hàng</th>
              <th style={{ padding: '10px 14px', width: '200px' }}>Mã định danh (Slug)</th>
              <th style={{ padding: '10px 14px' }}>Mô tả nghiệp vụ</th>
              <th style={{ padding: '10px 14px', width: '130px', textAlign: 'right' }}>Số sản phẩm</th>
              <th style={{ padding: '10px 14px', width: '120px', textAlign: 'center' }}>Trạng thái</th>
              <th style={{ padding: '10px 14px', width: '110px', textAlign: 'center' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading && categories.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                  Đang tải danh mục ngành hàng...
                </td>
              </tr>
            ) : filteredCategories.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: '2.5rem', textAlign: 'center', color: '#64748b' }}>
                  Không tìm thấy danh mục phù hợp với từ khóa tìm kiếm.
                </td>
              </tr>
            ) : (
              filteredCategories.map((cat, idx) => (
                <tr 
                  key={cat.id || idx} 
                  style={{ 
                    borderBottom: '1px solid #f1f5f9', 
                    transition: 'background-color 0.15s ease' 
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <td style={{ padding: '10px 14px', textAlign: 'center', color: '#94a3b8', fontVariantNumeric: 'tabular-nums' }}>
                    {idx + 1}
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                    {cat.imageUrl ? (
                      <img 
                        src={cat.imageUrl} 
                        alt={cat.name} 
                        style={{ width: '32px', height: '32px', objectFit: 'contain', margin: '0 auto', display: 'block' }} 
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div style={{ width: '32px', height: '32px', backgroundColor: '#f1f5f9', borderRadius: '6px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                        <Layers size={16} />
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '10px 14px', fontWeight: 600, color: '#0f172a' }}>
                    {cat.name}
                  </td>
                  <td style={{ padding: '10px 14px', color: '#0284c7', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                    {cat.slug}
                  </td>
                  <td style={{ padding: '10px 14px', color: '#64748b', fontSize: '0.8rem', lineHeight: '1.4' }}>
                    {cat.description || 'Chưa có mô tả'}
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: cat.productCount > 0 ? '#0f766e' : '#94a3b8' }}>
                    {cat.productCount} <span style={{ fontSize: '0.75rem', fontWeight: 400, color: '#64748b' }}>SKU</span>
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                    {cat.isActive ? (
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '2px 8px', borderRadius: '4px', backgroundColor: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' }}>
                        Hoạt động
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '2px 8px', borderRadius: '4px', backgroundColor: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0' }}>
                        Tạm dừng
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '0.35rem' }}>
                      <button
                        onClick={() => handleOpenModal(cat)}
                        style={{
                          background: 'none',
                          border: '1px solid #cbd5e1',
                          borderRadius: '4px',
                          padding: '4px 6px',
                          cursor: 'pointer',
                          color: '#475569'
                        }}
                        title="Chỉnh sửa danh mục"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(cat)}
                        style={{
                          background: 'none',
                          border: '1px solid #fecaca',
                          borderRadius: '4px',
                          padding: '4px 6px',
                          cursor: cat.productCount > 0 ? 'not-allowed' : 'pointer',
                          color: cat.productCount > 0 ? '#cbd5e1' : '#dc2626',
                          opacity: cat.productCount > 0 ? 0.5 : 1
                        }}
                        title={cat.productCount > 0 ? 'Không thể xóa danh mục đang có sản phẩm' : 'Xóa danh mục'}
                        disabled={cat.productCount > 0}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Thêm mới / Sửa Danh mục */}
      {showModal && (
        <div 
          onClick={() => setShowModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#fff',
              borderRadius: '10px',
              width: '540px',
              maxWidth: '92%',
              padding: '1.5rem',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
              border: '1px solid #e2e8f0'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                {editingCategory ? 'Chỉnh sửa ngành hàng' : 'Thêm ngành hàng mới'}
              </h3>
              <button 
                onClick={() => setShowModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div style={{ padding: '0.65rem 0.85rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', color: '#991b1b', fontSize: '0.8rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <AlertCircle size={15} />
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155' }}>Tên ngành hàng *</label>
                <input
                  required
                  type="text"
                  placeholder="VD: Rau củ, trái cây"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155' }}>
                  Mã định danh (Slug)
                  <span style={{ fontSize: '0.75rem', fontWeight: 400, color: '#64748b', marginLeft: '6px' }}>
                    (Tự động tạo nếu để trống)
                  </span>
                </label>
                <input
                  type="text"
                  placeholder="VD: rau-cu-trai-cay"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontFamily: 'monospace' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155' }}>Đường dẫn Biểu tượng (Icon / Image URL)</label>
                <input
                  type="text"
                  placeholder="VD: /icons/rau-cu-qua.png"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155' }}>Mô tả ngắn</label>
                <textarea
                  rows={2}
                  placeholder="Mô tả tiêu chuẩn chất lượng hoặc loại hàng hóa thuộc ngành này..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                <input
                  type="checkbox"
                  id="categoryIsActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: '#0f766e' }}
                />
                <label htmlFor="categoryIsActive" style={{ fontSize: '0.85rem', color: '#334155', cursor: 'pointer', fontWeight: 500 }}>
                  Kích hoạt hiển thị ngành hàng này trên Website
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#fff', color: '#475569', fontSize: '0.85rem', cursor: 'pointer' }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{ padding: '0.5rem 1.25rem', borderRadius: '6px', border: 'none', backgroundColor: '#0f766e', color: '#fff', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  {isSubmitting ? 'Đang lưu...' : (editingCategory ? 'Cập nhật' : 'Thêm mới')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default Categories;

