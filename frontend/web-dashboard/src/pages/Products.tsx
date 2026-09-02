import React, { useState, useEffect } from 'react';
import { Package, AlertCircle, Plus, Edit, Trash2, X, Eye, MapPin, Upload, Download, Barcode } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const API_BASE = 'http://localhost:3010';
const WAREHOUSE_API = 'http://localhost:3005';
const INVENTORY_API = 'http://localhost:3011';

interface Warehouse {
  code: string;
  name: string;
}

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
  price?: number;
  imageUrl?: string;
}

const Products = () => {
  const { token, user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Pagination & Filters State
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState('');

  // Stock View State
  const [showStockModal, setShowStockModal] = useState(false);
  const [viewingProduct, setViewingProduct] = useState<{sku: string, name: string} | null>(null);
  const [stockData, setStockData] = useState<Record<string, number>>({});
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);

  // Import State
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);

  // Barcode Modal
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const [viewingBarcodeProduct, setViewingBarcodeProduct] = useState<{sku: string, name: string} | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    sku: '', name: '', category: '', storageType: 'DRY',
    minTemp: 0, maxTemp: 0, maxHumidity: 0, unit: 'kg', price: 0
  });

  const canManage = user?.role === 'ADMIN';

  useEffect(() => {
    fetchProducts();
  }, [page, keyword, category]);

  useEffect(() => {
    fetchWarehouses();
  }, []);

  const fetchWarehouses = async () => {
    try {
      const res = await fetch(`${WAREHOUSE_API}/warehouses`);
      if (res.ok) {
        const data = await res.json();
        setWarehouses(data);
      }
    } catch (e) { console.error(e); }
  };

  // Warehouse stock cache for filtering
  const [warehouseSkus, setWarehouseSkus] = useState<Set<string> | null>(null);

  // Fetch active SKUs in user's warehouse for WAREHOUSE_MANAGER role
  useEffect(() => {
    if (user?.role === 'WAREHOUSE_MANAGER' && user?.warehouseCode) {
      fetchWarehouseSkus(user.warehouseCode);
    }
  }, [user]);

  const fetchWarehouseSkus = async (whCode: string) => {
    try {
      const res = await fetch(`${INVENTORY_API}/inventory/lots`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const lots = await res.json();
        // Filter lots matching manager's warehouse code with positive stock
        const skusInWh = new Set<string>(
          lots
            .filter((l: any) => l.warehouseCode === whCode && ((l.remainingQty ?? l.quantity ?? 1) > 0))
            .map((l: any) => l.productId || l.sku)
            .filter(Boolean)
        );
        setWarehouseSkus(skusInWh);
      }
    } catch (e) {
      console.error('Failed to fetch warehouse SKUs:', e);
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const url = new URL(`${API_BASE}/products`);
      url.searchParams.append('page', '1');
      url.searchParams.append('limit', '500'); // Fetch enough items for scoping
      if (keyword) url.searchParams.append('keyword', keyword);
      if (category) url.searchParams.append('category', category);

      const res = await fetch(url.toString(), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setProducts(data.items || []);
        setTotalPages(data.totalPages || 1);
        setTotalItems(data.total || 0);
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setLoading(false);
    }
  };

  // Memoized filtered products based on warehouse scope
  const displayedProducts = React.useMemo(() => {
    if (user?.role === 'WAREHOUSE_MANAGER' && user?.warehouseCode) {
      if (!warehouseSkus) return [];
      return products.filter(p => warehouseSkus.has(p.sku));
    }
    return products;
  }, [products, warehouseSkus, user]);

  const handleOpenModal = (product?: Product) => {
    if (product) {
      setFormData({
        sku: product.sku, name: product.name, category: product.category,
        storageType: product.storageType, minTemp: product.minTemp,
        maxTemp: product.maxTemp, maxHumidity: product.maxHumidity, unit: product.unit,
        price: product.price || 0
      });
      setEditingId(product.id);
    } else {
      setFormData({
        sku: '', name: '', category: '', storageType: 'DRY',
        minTemp: 0, maxTemp: 0, maxHumidity: 0, unit: 'kg', price: 0
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

  const downloadTemplate = () => {
    const csvContent = "data:text/csv;charset=utf-8,sku,name,category,storageType,unit,price\nBEEF-AUS,Thit bo Uc,Thit tuoi,FROZEN,Kg,250000\nAPPLE-NZ,Tao New Zealand,Trai cay,COOL,Kg,150000";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "product_import_template.csv");
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleImport = async () => {
    if (!importFile) return;
    setImporting(true);
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter(l => l.trim().length > 0);
        let successCount = 0;
        
        // Bỏ qua dòng tiêu đề (index 0)
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',');
          if (cols.length >= 6) {
            const storageType = cols[3].trim().toUpperCase();
            let minTemp = 15, maxTemp = 35;
            if (storageType === 'FROZEN') { minTemp = -20; maxTemp = -5; }
            else if (storageType === 'COOL') { minTemp = 2; maxTemp = 8; }

            const payload = {
              sku: cols[0].trim(),
              name: cols[1].trim(),
              category: cols[2].trim(),
              storageType: storageType,
              unit: cols[4].trim(),
              price: parseFloat(cols[5].trim()) || 0,
              minTemp,
              maxTemp,
              maxHumidity: 70
            };
            
            await fetch(`${API_BASE}/products`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify(payload)
            });
            successCount++;
          }
        }
        alert(`Đã nhập thành công ${successCount} sản phẩm!`);
        setShowImportModal(false);
        setImportFile(null);
        fetchProducts();
      } catch (err) {
        console.error(err);
        alert('Có lỗi xảy ra khi nhập file!');
      } finally {
        setImporting(false);
      }
    };
    reader.readAsText(importFile);
  };

  const handleViewStock = async (product: Product) => {
    setViewingProduct({ sku: product.sku, name: product.name });
    setShowStockModal(true);
    setStockData({});
    try {
      const res = await fetch(`${INVENTORY_API}/inventory/warehouse-stock?skus=${product.sku}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const parsedStock: Record<string, number> = {};
        Object.keys(data).forEach(whCode => {
          parsedStock[whCode] = data[whCode][product.sku] || 0;
        });
        setStockData(parsedStock);
      }
    } catch (error) {
      console.error('Failed to fetch stock:', error);
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
      <div className="page-header">
        <div>
          <h1 className="page-title">
            {user?.role === 'WAREHOUSE_MANAGER' && user?.warehouseCode 
              ? `Quản lý Sản phẩm (Kho ${user.warehouseCode})` 
              : 'Quản lý Sản phẩm'}
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '4px' }}>
            {user?.role === 'WAREHOUSE_MANAGER' && user?.warehouseCode 
              ? `Danh mục các mặt hàng thực tế đang được lưu trữ và quản lý tại kho ${user.warehouseCode}.` 
              : 'Danh mục tất cả các mặt hàng trong toàn bộ hệ thống.'}
          </p>
        </div>
        {canManage && (
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="btn btn-outline" onClick={() => setShowImportModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#fff', border: '1px solid var(--border)' }}>
              <Upload size={18} />
              Nhập Excel / CSV
            </button>
            <button className="btn btn-primary" onClick={() => {
              setEditingId(null);
              setFormData({ sku: '', name: '', category: '', storageType: 'DRY', minTemp: 15, maxTemp: 35, maxHumidity: 70, unit: 'Thùng' });
              setShowModal(true);
            }}>
              <Plus size={20} />
              Thêm sản phẩm
            </button>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--spacing-4)' }}>
        <div className="card">
          <div className="card-header">
            <div className="card-title">Tổng SKU tại kho</div>
            <div className="card-icon primary"><Package size={18} /></div>
          </div>
          <div className="card-value">
            {user?.role === 'WAREHOUSE_MANAGER' && user?.warehouseCode ? displayedProducts.length : totalItems}
          </div>
          <div className="card-desc">
            {user?.role === 'WAREHOUSE_MANAGER' && user?.warehouseCode ? `sản phẩm có tại kho ${user.warehouseCode}` : 'sản phẩm trong hệ thống'}
          </div>
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

      {/* Search and Filters */}
      <div className="card" style={{ padding: '1rem 1.5rem' }}>
        <div style={{ display: 'flex', flexDirection: 'row', gap: '1rem', alignItems: 'center', width: '100%' }}>
          <div style={{ display: 'flex', flex: 1, gap: '0.5rem' }}>
            <input 
              type="text" 
              placeholder="Tìm kiếm theo mã SKU hoặc tên..." 
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  setKeyword(searchInput);
                  setPage(1);
                }
              }}
              style={{ flex: 1, padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--border)' }}
            />
            <button className="btn btn-primary" onClick={() => { setKeyword(searchInput); setPage(1); }} style={{ padding: '0.5rem 1.5rem', whiteSpace: 'nowrap' }}>Tìm kiếm</button>
          </div>
          <select 
            value={category} 
            onChange={e => { setCategory(e.target.value); setPage(1); }}
            style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--border)', minWidth: '220px', cursor: 'pointer' }}
          >
          <option value="">Tất cả danh mục</option>
          <option value="Trái cây">Trái cây</option>
          <option value="Thịt tươi">Thịt tươi</option>
          <option value="Rau củ">Rau củ</option>
          <option value="Hải sản">Hải sản</option>
          <option value="Sữa & Đồ uống">Sữa & Đồ uống</option>
          <option value="Bánh kẹo & Đồ khô">Bánh kẹo & Đồ khô</option>
          <option value="Gia vị">Gia vị</option>
        </select>
        </div>
      </div>

      {/* Table Section */}
      <div className="card" style={{ padding: '0' }}>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: '60px', textAlign: 'center' }}>Ảnh</th>
                <th>Mã SKU</th>
                <th>Tên Sản phẩm</th>
                <th>Phân loại</th>
                <th>Loại kho</th>
                <th>Nhiệt độ (°C)</th>
                <th>Đơn giá (VNĐ)</th>
                <th>ĐVT</th>
                {canManage && <th>Thao tác</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: '2rem' }}>Đang tải dữ liệu...</td></tr>
              ) : displayedProducts.length === 0 ? (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: '2rem' }}>Không có sản phẩm nào thuộc kho này.</td></tr>
              ) : (
                displayedProducts.map((p) => (
                  <tr key={p.id}>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '6px', overflow: 'hidden', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)', margin: '0 auto' }}>
                        {p.imageUrl ? (
                          <img src={p.imageUrl} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <Package size={20} color="#94a3b8" />
                        )}
                      </div>
                    </td>
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
                    <td style={{ color: p.storageType === 'FROZEN' ? 'var(--color-primary-600)' : p.storageType === 'COOL' ? 'var(--color-success-600)' : 'var(--color-warning-600)' }}>
                      {p.minTemp} ~ {p.maxTemp}
                    </td>
                    <td style={{ fontWeight: 600 }}>{p.price?.toLocaleString('vi-VN')} đ</td>
                    <td>{p.unit}</td>
                    {canManage && (
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button onClick={() => { setViewingBarcodeProduct({sku: p.sku, name: p.name}); setShowBarcodeModal(true); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#334155' }} title="In mã vạch"><Barcode size={16} /></button>
                          <button onClick={() => handleViewStock(p)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-primary-600)' }} title="Xem tồn kho"><Eye size={16} /></button>
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
        <div style={{ padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)' }}>
          <span style={{ fontSize: '0.875rem', color: 'var(--color-neutral-500)' }}>
            {user?.role === 'WAREHOUSE_MANAGER' && user?.warehouseCode 
              ? `Hiển thị ${displayedProducts.length} sản phẩm thực tế tại kho ${user.warehouseCode}`
              : `Hiển thị trang ${page} / ${totalPages} (Tổng: ${totalItems} sản phẩm)`}
          </span>
          {(!user?.role || user?.role !== 'WAREHOUSE_MANAGER') && (
            <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
              <button 
                className="btn btn-outline" 
                disabled={page <= 1} 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }}
              >
                &lt;
              </button>
              
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                .map((p, i, arr) => (
                  <React.Fragment key={p}>
                    {i > 0 && arr[i - 1] !== p - 1 && <span style={{ padding: '0 0.25rem', color: '#64748b' }}>...</span>}
                    <button 
                      className={`btn ${page === p ? 'btn-primary' : 'btn-outline'}`} 
                      onClick={() => setPage(p)}
                      style={{ padding: '0.25rem 0.6rem', fontSize: '0.875rem', minWidth: '32px' }}
                    >
                      {p}
                    </button>
                  </React.Fragment>
                ))}

              <button 
                className="btn btn-outline" 
                disabled={page >= totalPages} 
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }}
              >
                &gt;
              </button>
            </div>
          )}
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
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Giá bán (VNĐ)</label>
                  <input required type="number" min="0" value={formData.price} onChange={e => setFormData({...formData, price: parseFloat(e.target.value) || 0})} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)' }} />
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

      {/* Stock View Modal */}
      {showStockModal && viewingProduct && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '700px', maxWidth: '90%', padding: '1.5rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Tồn kho: {viewingProduct.name}</h3>
                <p className="text-muted" style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>Mã SKU: {viewingProduct.sku}</p>
              </div>
              <button onClick={() => setShowStockModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
              {warehouses.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-neutral-500)', gridColumn: '1 / -1' }}>Đang tải danh sách kho...</div>
              ) : (
                warehouses.map(wh => {
                  const qty = stockData[wh.code] || 0;
                  return (
                    <div key={wh.code} style={{ padding: '1rem', border: '1px solid var(--border)', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '0.5rem', backgroundColor: qty > 0 ? '#ecfdf5' : '#f8fafc' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 600, color: 'var(--color-neutral-900)' }}>{wh.name}</span>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', backgroundColor: qty > 0 ? '#059669' : '#94a3b8', color: '#fff' }}>
                          {wh.code}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '0.5rem' }}>
                        <span style={{ fontSize: '0.875rem', color: 'var(--color-neutral-500)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <MapPin size={14} /> Số lượng tồn:
                        </span>
                        <span style={{ fontSize: '1.25rem', fontWeight: 800, color: qty > 0 ? '#059669' : 'var(--color-neutral-400)' }}>
                          {qty}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
              <button className="btn btn-primary" onClick={() => setShowStockModal(false)}>Đóng</button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '500px', maxWidth: '90%', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Nhập Sản phẩm từ Excel (CSV)</h3>
              <button onClick={() => setShowImportModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-neutral-600)', marginBottom: '1rem' }}>
                Vui lòng chuẩn bị file danh sách sản phẩm định dạng .CSV theo đúng cấu trúc mẫu.
              </p>
              
              <button 
                type="button" 
                onClick={downloadTemplate}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-primary-600)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 500, marginBottom: '1.5rem' }}
              >
                <Download size={16} />
                Tải file mẫu (Template.csv)
              </button>

              <div style={{ border: '2px dashed var(--border)', padding: '2rem', textAlign: 'center', borderRadius: '8px', backgroundColor: '#f8fafc' }}>
                <input 
                  type="file" 
                  accept=".csv" 
                  onChange={(e) => setImportFile(e.target.files ? e.target.files[0] : null)}
                  style={{ display: 'block', width: '100%' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
              <button type="button" onClick={() => setShowImportModal(false)} className="btn btn-outline" disabled={importing}>Huỷ</button>
              <button type="button" onClick={handleImport} className="btn btn-primary" disabled={!importFile || importing}>
                {importing ? 'Đang xử lý...' : 'Xác nhận Nhập'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Barcode Modal */}
      {showBarcodeModal && viewingBarcodeProduct && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '400px', maxWidth: '90%', padding: '2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>Mã vạch Sản phẩm</h3>
            <div style={{ border: '1px solid var(--border)', padding: '1.5rem', borderRadius: '8px', backgroundColor: '#fff', width: '100%' }}>
              <img 
                src={`https://barcode.tec-it.com/barcode.ashx?data=${viewingBarcodeProduct.sku}&code=Code128`} 
                alt={`Barcode for ${viewingBarcodeProduct.sku}`}
                style={{ maxWidth: '100%', height: '80px' }}
              />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontWeight: 700, fontSize: '1.2rem', color: '#0f172a' }}>{viewingBarcodeProduct.sku}</div>
              <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '4px' }}>{viewingBarcodeProduct.name}</div>
            </div>
            
            <div style={{ display: 'flex', gap: '1rem', width: '100%', marginTop: '0.5rem' }}>
              <button type="button" onClick={() => setShowBarcodeModal(false)} className="btn btn-outline" style={{ flex: 1 }}>Đóng</button>
              <button type="button" onClick={() => { alert('Đã gửi lệnh in đến máy in mã vạch!'); setShowBarcodeModal(false); }} className="btn btn-primary" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <Barcode size={16} /> In mã vạch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;
