import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  Search, 
  Plus, 
  Trash2, 
  Edit3, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2, 
  Tag, 
  TrendingDown, 
  Layers, 
  Calendar,
  X,
  ExternalLink,
  ShieldCheck,
  PackageCheck,
  ChevronLeft,
  ChevronRight,
  Check
} from 'lucide-react';
import { useAuth } from '@/features/auth';

const API_BASE = 'http://localhost:3010';
const INVENTORY_API = 'http://localhost:3011';

interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  storageType: string;
  unit: string;
  price: number;
  originalPrice?: number;
  imageUrl?: string;
  isFlashSale?: boolean;
  discountPercent?: number;
  soldCount?: number;
  stock?: number;
}

export default function FlashSaleManagement() {
  const { token } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    productId: '',
    discountPercent: 20,
    flashSalePrice: 0,
    quota: 50,
  });
  const [modalSearchTerm, setModalSearchTerm] = useState('');
  const [isChangingProduct, setIsChangingProduct] = useState(false);

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showNotify = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const loadData = async () => {
    setLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      // 1. Tải tất cả sản phẩm (lấy tối đa 500 mặt hàng để bao quát toàn bộ danh mục)
      const res = await fetch(`${API_BASE}/products?limit=500`, { headers });
      if (res.ok) {
        const data = await res.json();
        const list: Product[] = data.items || data.data || (Array.isArray(data) ? data : []);
        setAllProducts(list);
        // Lọc sản phẩm đang có Flash Sale
        const flashList = list.filter((p: Product) => p.isFlashSale);
        setProducts(flashList);
      }
    } catch (err) {
      console.error('Lỗi nạp dữ liệu Flash Sale:', err);
      showNotify('error', 'Không thể kết nối đến máy chủ quản lý sản phẩm.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter products in Flash Sale list
  const filteredProducts = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        p.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCat = categoryFilter === 'ALL' || p.category === categoryFilter;
    return matchSearch && matchCat;
  });

  // Reset page when search or category filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, categoryFilter]);

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage) || 1;
  const paginatedProducts = filteredProducts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Unique categories
  const categories = Array.from(new Set(allProducts.map(p => p.category).filter(Boolean)));

  // Xử lý chọn sản phẩm thêm vào Flash Sale
  const handleSelectProductToSale = (prodId: string) => {
    const prod = allProducts.find(p => p.id === prodId);
    if (prod) {
      const orig = prod.originalPrice || prod.price;
      const disc = 20;
      const salePrice = Math.round(orig * (1 - disc / 100));
      setFormData({
        productId: prod.id,
        discountPercent: disc,
        flashSalePrice: salePrice,
        quota: 50,
      });
    }
  };

  const handleDiscountChange = (disc: number) => {
    const prod = allProducts.find(p => p.id === formData.productId) || selectedProduct;
    if (prod) {
      const orig = prod.originalPrice || prod.price;
      const salePrice = Math.round(orig * (1 - disc / 100));
      setFormData(prev => ({
        ...prev,
        discountPercent: disc,
        flashSalePrice: salePrice,
      }));
    }
  };

  const handlePriceChange = (price: number) => {
    const prod = allProducts.find(p => p.id === formData.productId) || selectedProduct;
    if (prod) {
      const orig = prod.originalPrice || prod.price;
      const disc = orig > 0 ? Math.round(((orig - price) / orig) * 100) : 0;
      setFormData(prev => ({
        ...prev,
        discountPercent: disc,
        flashSalePrice: price,
      }));
    }
  };

  // Kích hoạt Flash Sale cho sản phẩm
  const handleSaveFlashSale = async (e: React.FormEvent) => {
    e.preventDefault();
    const prod = allProducts.find(p => p.id === formData.productId) || selectedProduct;
    if (!prod) {
      showNotify('error', 'Vui lòng chọn sản phẩm áp dụng Flash Sale!');
      return;
    }

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const origPrice = prod.originalPrice || prod.price;
      const payload = {
        isFlashSale: true,
        originalPrice: origPrice,
        price: formData.flashSalePrice,
        discountPercent: formData.discountPercent,
      };

      const res = await fetch(`${API_BASE}/products/${prod.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        showNotify('success', `Đã kích hoạt Flash Sale cho sản phẩm "${prod.name}" thành công!`);
        setShowAddModal(false);
        setShowEditModal(false);
        loadData();
      } else {
        const err = await res.json().catch(() => ({}));
        showNotify('error', err.message || 'Không thể lưu chương trình Flash Sale.');
      }
    } catch (err) {
      showNotify('error', 'Lỗi khi gửi yêu cầu lên máy chủ.');
    }
  };

  // Gỡ sản phẩm khỏi Flash Sale
  const handleRemoveFlashSale = async (product: Product) => {
    if (!window.confirm(`Xác nhận dừng Flash Sale cho sản phẩm "${product.name}"? Giá bán sẽ được khôi phục về giá gốc tiêu chuẩn.`)) {
      return;
    }

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const origPrice = product.originalPrice || product.price;
      const payload = {
        isFlashSale: false,
        price: origPrice,
        discountPercent: 0,
      };

      const res = await fetch(`${API_BASE}/products/${product.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        showNotify('success', `Đã kết thúc Flash Sale cho "${product.name}". Giá đã phục hồi về giá gốc.`);
        loadData();
      } else {
        showNotify('error', 'Không thể cập nhật trạng thái sản phẩm.');
      }
    } catch (err) {
      showNotify('error', 'Lỗi kết nối khi gỡ Flash Sale.');
    }
  };

  // Mở modal sửa Flash Sale
  const handleOpenEdit = (prod: Product) => {
    setSelectedProduct(prod);
    setFormData({
      productId: prod.id,
      discountPercent: prod.discountPercent || 0,
      flashSalePrice: prod.price,
      quota: 50,
    });
    setShowEditModal(true);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div 
          className={`p-4 rounded-lg flex items-center justify-between border shadow-sm transition-all ${
            notification.type === 'success' 
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2 text-sm font-medium">
            {notification.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-slate-600">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-md bg-amber-100 text-amber-700">
              <Zap size={20} />
            </span>
            <h1 className="text-xl font-bold text-slate-900">Quản Lý Chương Trình Flash Sale</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Thiết lập giờ vàng giá sốc, hạn mức suất bán và đồng bộ giá ưu đãi theo thời gian thực lên ứng dụng khách hàng.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            Làm mới
          </button>

          <button
            onClick={() => {
              setFormData({ productId: '', discountPercent: 20, flashSalePrice: 0, quota: 50 });
              setModalSearchTerm('');
              setIsChangingProduct(false);
              setShowAddModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-md shadow-sm transition-colors"
          >
            <Plus size={16} />
            Thêm Sản Phẩm Flash Sale
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Đang Mở Bán Flash Sale</span>
            <span className="p-1.5 rounded-md bg-amber-50 text-amber-600">
              <Zap size={16} />
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {products.length}
          </div>
          <p className="text-xs text-slate-500 mt-1">Sản phẩm đang áp dụng giá sốc</p>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Mức Giảm Bình Quân</span>
            <span className="p-1.5 rounded-md bg-emerald-50 text-emerald-600">
              <TrendingDown size={16} />
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-700" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {products.length > 0 
              ? Math.round(products.reduce((acc, p) => acc + (p.discountPercent || 0), 0) / products.length)
              : 0}%
          </div>
          <p className="text-xs text-slate-500 mt-1">Tỷ lệ ưu đãi trung bình</p>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Đã Tiêu Thụ Trong Đợt</span>
            <span className="p-1.5 rounded-md bg-sky-50 text-sky-600">
              <PackageCheck size={16} />
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {products.reduce((acc, p) => acc + (p.soldCount || 0), 0)}
          </div>
          <p className="text-xs text-slate-500 mt-1">Đơn vị sản phẩm bán ra</p>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Tổng Mặt Hàng Toàn Kho</span>
            <span className="p-1.5 rounded-md bg-slate-100 text-slate-600">
              <Layers size={16} />
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {allProducts.length}
          </div>
          <p className="text-xs text-slate-500 mt-1">Sản phẩm có thể đưa vào sale</p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo tên sản phẩm hoặc mã SKU..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="w-full md:w-48 px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white"
          >
            <option value="ALL">Tất cả ngành hàng</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-4 py-3">Sản Phẩm & Mã SKU</th>
                <th className="px-4 py-3">Ngành Hàng</th>
                <th className="px-4 py-3 text-right">Giá Gốc Tiêu Chuẩn</th>
                <th className="px-4 py-3 text-right">Giá Bán Flash Sale</th>
                <th className="px-4 py-3 text-center">% Giảm Giá</th>
                <th className="px-4 py-3 text-center">Tiến Độ Bán</th>
                <th className="px-4 py-3 text-center">Trạng Thái</th>
                <th className="px-4 py-3 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                    <RefreshCw size={20} className="animate-spin inline-block mr-2" />
                    Đang nạp danh sách sản phẩm Flash Sale...
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                    <Zap size={32} className="mx-auto text-slate-300 mb-2" />
                    <p className="font-medium text-slate-700">Chưa có sản phẩm nào trong chương trình Flash Sale</p>
                    <p className="text-xs text-slate-400 mt-1">Nhấn "Thêm Sản Phẩm Flash Sale" để tạo ưu đãi giá sốc giờ vàng</p>
                  </td>
                </tr>
              ) : (
                paginatedProducts.map(product => {
                  const origPrice = product.originalPrice || (product.discountPercent ? Math.round(product.price / (1 - product.discountPercent / 100)) : product.price);
                  const salePrice = product.price;
                  const sold = product.soldCount || 0;
                  const stock = product.stock || 100;

                  return (
                    <tr key={product.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={product.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=120'}
                            alt={product.name}
                            className="w-10 h-10 object-cover rounded border border-slate-200 shrink-0"
                          />
                          <div>
                            <div className="font-medium text-slate-900">{product.name}</div>
                            <div className="text-xs text-slate-500 font-mono">SKU: {product.sku}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        <span className="px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-700 font-medium">
                          {product.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-400 line-through" style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {origPrice.toLocaleString('vi-VN')}đ
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-amber-700" style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {salePrice.toLocaleString('vi-VN')}đ
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          -{product.discountPercent || 0}%
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="w-28 mx-auto">
                          <div className="flex justify-between text-xs text-slate-500 mb-1">
                            <span>Đã bán {sold}</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div 
                              className="bg-amber-500 h-1.5 rounded-full" 
                              style={{ width: `${Math.min(100, Math.round((sold / Math.max(1, sold + stock)) * 100))}%` }} 
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 size={12} />
                          Đang Mở Bán
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenEdit(product)}
                            className="p-1.5 text-slate-600 hover:text-amber-700 hover:bg-amber-50 rounded transition-colors"
                            title="Điều chỉnh giá / % giảm"
                          >
                            <Edit3 size={15} />
                          </button>
                          <button
                            onClick={() => handleRemoveFlashSale(product)}
                            className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                            title="Gỡ khỏi Flash Sale"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-600">
            <div>
              Hiển thị <strong>{(currentPage - 1) * itemsPerPage + 1}</strong> - <strong>{Math.min(currentPage * itemsPerPage, filteredProducts.length)}</strong> trên tổng số <strong>{filteredProducts.length}</strong> sản phẩm Flash Sale
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Trang trước"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="px-2 font-medium">
                Trang {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Trang sau"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL: Thêm Sản Phẩm Vào Flash Sale */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-xl w-full overflow-hidden border border-slate-200 animate-in fade-in duration-150">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded bg-amber-100 text-amber-700">
                  <Zap size={16} />
                </span>
                <h3 className="text-base font-semibold text-slate-900">Thiết Lập Sản Phẩm Flash Sale</h3>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveFlashSale} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Chọn Sản Phẩm Bán Lẻ (Tìm Kiếm Theo SKU Hoặc Tên)
                </label>

                {formData.productId && !isChangingProduct ? (
                  (() => {
                    const selected = allProducts.find(p => p.id === formData.productId);
                    if (!selected) return null;
                    const orig = selected.originalPrice || selected.price;
                    return (
                      <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-lg flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={selected.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=120'}
                            alt={selected.name}
                            className="w-12 h-12 rounded object-cover border border-amber-200 shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-900 truncate text-sm">{selected.name}</div>
                            <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-600">
                              <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200 font-bold text-slate-700">
                                SKU: {selected.sku}
                              </span>
                              <span>•</span>
                              <span>Giá gốc: <strong className="text-slate-900">{orig.toLocaleString('vi-VN')}đ</strong></span>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setIsChangingProduct(true);
                            setModalSearchTerm('');
                          }}
                          className="px-2.5 py-1.5 text-xs font-semibold text-amber-800 hover:text-amber-900 hover:bg-amber-100 rounded border border-amber-300 transition-colors shrink-0"
                        >
                          Đổi Sản Phẩm Khác
                        </button>
                      </div>
                    );
                  })()
                ) : (
                  <div className="space-y-2">
                    <div className="relative">
                      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Nhập tên sản phẩm hoặc mã SKU (ví dụ: CP-250, Cải, Nước tương...)"
                        value={modalSearchTerm}
                        onChange={e => setModalSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-8 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white"
                        autoFocus
                      />
                      {modalSearchTerm && (
                        <button
                          type="button"
                          onClick={() => setModalSearchTerm('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>

                    <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-md bg-white shadow-inner">
                      {(() => {
                        const filtered = allProducts.filter(p => {
                          if (!modalSearchTerm.trim()) return true;
                          const q = modalSearchTerm.toLowerCase().trim();
                          return p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
                        });

                        if (filtered.length === 0) {
                          return (
                            <div className="p-4 text-center text-xs text-slate-500">
                              Không tìm thấy sản phẩm nào khớp với từ khóa "{modalSearchTerm}"
                            </div>
                          );
                        }

                        return filtered.slice(0, 30).map(p => {
                          const orig = p.originalPrice || p.price;
                          const isSelected = formData.productId === p.id;

                          return (
                            <div
                              key={p.id}
                              onClick={() => {
                                handleSelectProductToSale(p.id);
                                setIsChangingProduct(false);
                              }}
                              className={`p-2.5 flex items-center justify-between gap-3 cursor-pointer hover:bg-amber-50/60 transition-colors ${
                                isSelected ? 'bg-amber-50 border-l-4 border-amber-600' : ''
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <img
                                  src={p.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=120'}
                                  alt={p.name}
                                  className="w-9 h-9 rounded object-cover border border-slate-200 shrink-0"
                                />
                                <div className="min-w-0">
                                  <div className="font-medium text-slate-900 truncate text-xs">{p.name}</div>
                                  <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                                    <span className="font-mono font-semibold text-slate-700 bg-slate-100 px-1 rounded">
                                      {p.sku}
                                    </span>
                                    <span>{p.category}</span>
                                    <span>•</span>
                                    <span>Giá: <strong className="text-slate-800">{orig.toLocaleString('vi-VN')}đ</strong></span>
                                  </div>
                                </div>
                              </div>

                              <div className="shrink-0 flex items-center gap-2">
                                {p.isFlashSale && (
                                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                    Đang Sale
                                  </span>
                                )}
                                <span className="text-xs font-semibold text-amber-700 hover:text-amber-900">
                                  {isSelected ? <Check size={16} /> : 'Chọn'}
                                </span>
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                )}
              </div>

              {formData.productId && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                        Tỷ Lệ Giảm Giá (%)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="90"
                        value={formData.discountPercent}
                        onChange={e => handleDiscountChange(Number(e.target.value))}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                        Giá Bán Sau Ưu Đãi (VNĐ)
                      </label>
                      <input
                        type="number"
                        min="100"
                        step="any"
                        value={formData.flashSalePrice}
                        onChange={e => handlePriceChange(Number(e.target.value))}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-amber-500 font-bold text-amber-700"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Giới Hạn Suất Bán Ưu Đãi (Khóa Chống Bán Khống)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.quota}
                      onChange={e => setFormData(prev => ({ ...prev, quota: Number(e.target.value) }))}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Hệ thống tự động khóa giữ tồn kho (Pessimistic Lock) khi nhiều khách mua cùng lúc.
                    </p>
                  </div>
                </>
              )}

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={!formData.productId}
                  className="px-4 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-md shadow-sm transition-colors disabled:opacity-50"
                >
                  Xác Nhận Kích Hoạt Flash Sale
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Chỉnh Sửa Flash Sale */}
      {showEditModal && selectedProduct && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in duration-150">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded bg-amber-100 text-amber-700">
                  <Edit3 size={16} />
                </span>
                <h3 className="text-base font-semibold text-slate-900">Điều Chỉnh Ưu Đãi Flash Sale</h3>
              </div>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveFlashSale} className="p-6 space-y-4">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div className="font-semibold text-slate-900">{selectedProduct.name}</div>
                <div className="text-xs text-slate-500">
                  SKU: {selectedProduct.sku} | Giá gốc: {(selectedProduct.originalPrice || selectedProduct.price).toLocaleString('vi-VN')}đ
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Tỷ Lệ Giảm Giá (%)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="90"
                    value={formData.discountPercent}
                    onChange={e => handleDiscountChange(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Giá Bán Mới (VNĐ)
                  </label>
                  <input
                    type="number"
                    min="100"
                    step="any"
                    value={formData.flashSalePrice}
                    onChange={e => handlePriceChange(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-amber-500 font-bold text-amber-700"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-md shadow-sm transition-colors"
                >
                  Cập Nhật Giá Mới
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

