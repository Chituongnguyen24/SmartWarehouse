import React, { useState, useEffect } from 'react';
import { 
  Tag, 
  Search, 
  Plus, 
  Trash2, 
  Edit3, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2, 
  Percent, 
  Gift, 
  Calendar,
  X,
  Copy,
  Clock,
  Layers,
  Check,
  Truck,
  ShoppingBag,
  Filter,
  UserCheck,
  Info
} from 'lucide-react';
import { useAuth } from '@/features/auth';

const API_BASE = 'http://localhost:3010';

export interface Voucher {
  id: string;
  code: string;
  title: string;
  description?: string;
  discountType: 'FIXED' | 'PERCENT' | 'FREESHIP';
  discountValue: number;
  minOrderValue: number;
  maxDiscount?: number;
  usageLimit: number;
  usedCount: number;
  applicableScope: 'ALL' | 'CATEGORY' | 'PRODUCT';
  applicableCategories?: string[];
  applicableProductIds?: string[];
  limitPerUser: number;
  startDate?: string;
  endDate?: string;
  isActive: boolean;
  createdAt?: string;
}

const DEFAULT_CATEGORIES = [
  'Trái cây',
  'Rau củ',
  'Thịt & Hải sản',
  'Trứng & Đậu hũ',
  'Sữa & Bơ phô mai',
  'Gia vị & Đồ khô',
  'Bánh kẹo & Đồ ăn vặt',
  'Đồ uống'
];

export default function VoucherManagement() {
  const { token } = useAuth();
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [scopeFilter, setScopeFilter] = useState('ALL');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState<Voucher | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Danh mục & Sản phẩm hỗ trợ chọn
  const [availableCategories, setAvailableCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [availableProducts, setAvailableProducts] = useState<any[]>([]);
  const [productSearchInput, setProductSearchInput] = useState('');
  const [searchedProducts, setSearchedProducts] = useState<any[]>([]);
  const [isSearchingProduct, setIsSearchingProduct] = useState(false);
  const [productMetaMap, setProductMetaMap] = useState<Record<string, any>>({});

  // Form State
  const initialFormData: Partial<Voucher> = {
    code: '',
    title: '',
    description: '',
    discountType: 'FIXED',
    discountValue: 20000,
    minOrderValue: 200000,
    maxDiscount: 50000,
    usageLimit: 500,
    applicableScope: 'ALL',
    applicableCategories: [],
    applicableProductIds: [],
    limitPerUser: 1,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    isActive: true,
  };

  const [formData, setFormData] = useState<Partial<Voucher>>(initialFormData);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showNotify = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadVouchers = async () => {
    setLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE}/vouchers`, { headers });
      if (res.ok) {
        const data = await res.json();
        setVouchers(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Lỗi nạp vouchers:', err);
      showNotify('error', 'Không thể kết nối đến máy chủ quản lý mã giảm giá.');
    } finally {
      setLoading(false);
    }
  };

  const loadCategoriesAndProducts = async () => {
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const catRes = await fetch(`${API_BASE}/products/categories`, { headers });
      if (catRes.ok) {
        const cats = await catRes.json();
        if (Array.isArray(cats) && cats.length > 0) {
          const merged = Array.from(new Set([...cats, ...DEFAULT_CATEGORIES]));
          setAvailableCategories(merged);
        }
      }
    } catch (e) {
      // Dùng default
    }

    try {
      const prodRes = await fetch(`${API_BASE}/products?limit=300`, { headers });
      if (prodRes.ok) {
        const prodData = await prodRes.json();
        const list = Array.isArray(prodData) ? prodData : (prodData?.items || []);
        setAvailableProducts(list);
        
        // Cache metadata sản phẩm
        const map: Record<string, any> = {};
        list.forEach((p: any) => {
          if (p.sku) map[p.sku] = p;
          if (p.id) map[p.id] = p;
        });
        setProductMetaMap(prev => ({ ...prev, ...map }));
      }
    } catch (e) {
      // Bỏ qua
    }
  };

  useEffect(() => {
    loadVouchers();
    loadCategoriesAndProducts();
  }, [token]);

  // Tìm kiếm sản phẩm server-side với debounce 250ms
  useEffect(() => {
    const term = productSearchInput.trim();
    if (!term) {
      setSearchedProducts([]);
      setIsSearchingProduct(false);
      return;
    }

    setIsSearchingProduct(true);
    const timer = setTimeout(async () => {
      try {
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(`${API_BASE}/products?keyword=${encodeURIComponent(term)}&limit=50`, { headers });
        if (res.ok) {
          const data = await res.json();
          const items = Array.isArray(data) ? data : (data?.items || []);
          setSearchedProducts(items);

          // Cập nhật metadata cache
          const map: Record<string, any> = {};
          items.forEach((p: any) => {
            if (p.sku) map[p.sku] = p;
            if (p.id) map[p.id] = p;
          });
          setProductMetaMap(prev => ({ ...prev, ...map }));
        }
      } catch (err) {
        console.error('Lỗi tìm kiếm sản phẩm:', err);
      } finally {
        setIsSearchingProduct(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [productSearchInput, token]);

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Lọc voucher
  const filteredVouchers = vouchers.filter(v => {
    const matchSearch = v.code.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        v.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (v.description && v.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchType = typeFilter === 'ALL' || v.discountType === typeFilter;
    const matchScope = scopeFilter === 'ALL' || v.applicableScope === scopeFilter;
    return matchSearch && matchType && matchScope;
  });

  // Toggle trạng thái kích hoạt
  const handleToggleActive = async (voucher: Voucher) => {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE}/vouchers/${voucher.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ isActive: !voucher.isActive }),
      });

      if (res.ok) {
        showNotify('success', `Đã ${voucher.isActive ? 'tạm dừng' : 'kích hoạt lại'} mã "${voucher.code}"`);
        loadVouchers();
      } else {
        showNotify('error', 'Không thể cập nhật trạng thái mã.');
      }
    } catch (err) {
      showNotify('error', 'Lỗi kết nối khi cập nhật.');
    }
  };

  // Xóa voucher
  const handleDeleteVoucher = async (voucher: Voucher) => {
    if (!window.confirm(`Xác nhận xóa mã giảm giá "${voucher.code}"?`)) return;

    try {
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE}/vouchers/${voucher.id}`, {
        method: 'DELETE',
        headers,
      });

      if (res.ok) {
        showNotify('success', `Đã xóa mã voucher "${voucher.code}" khỏi hệ thống.`);
        loadVouchers();
      } else {
        showNotify('error', 'Không thể xóa mã voucher.');
      }
    } catch (err) {
      showNotify('error', 'Lỗi khi xóa voucher.');
    }
  };

  // Submit tạo mới / sửa
  const handleSaveVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code || !formData.title) {
      showNotify('error', 'Vui lòng nhập đầy đủ mã và tên voucher.');
      return;
    }

    if (formData.applicableScope === 'CATEGORY' && (!formData.applicableCategories || formData.applicableCategories.length === 0)) {
      showNotify('error', 'Vui lòng chọn ít nhất 1 danh mục áp dụng.');
      return;
    }

    if (formData.applicableScope === 'PRODUCT' && (!formData.applicableProductIds || formData.applicableProductIds.length === 0)) {
      showNotify('error', 'Vui lòng chọn ít nhất 1 sản phẩm áp dụng.');
      return;
    }

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const isEdit = !!editingVoucher;
      const url = isEdit ? `${API_BASE}/vouchers/${editingVoucher.id}` : `${API_BASE}/vouchers`;
      const method = isEdit ? 'PUT' : 'POST';

      const payload = {
        ...formData,
        code: formData.code?.trim().toUpperCase(),
        discountValue: Number(formData.discountValue || 0),
        minOrderValue: Number(formData.minOrderValue || 0),
        maxDiscount: formData.maxDiscount ? Number(formData.maxDiscount) : null,
        usageLimit: Number(formData.usageLimit || 1000),
        limitPerUser: Number(formData.limitPerUser || 1),
        applicableScope: formData.applicableScope || 'ALL',
        applicableCategories: formData.applicableScope === 'CATEGORY' ? (formData.applicableCategories || []) : [],
        applicableProductIds: formData.applicableScope === 'PRODUCT' ? (formData.applicableProductIds || []) : [],
        startDate: formData.startDate ? new Date(formData.startDate).toISOString() : null,
        endDate: formData.endDate ? new Date(formData.endDate).toISOString() : null,
      };

      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        showNotify('success', `${isEdit ? 'Cập nhật' : 'Tạo mới'} mã voucher thành công!`);
        setShowAddModal(false);
        setShowEditModal(false);
        setEditingVoucher(null);
        loadVouchers();
      } else {
        const err = await res.json().catch(() => ({}));
        showNotify('error', err.message || 'Không thể lưu voucher.');
      }
    } catch (err) {
      showNotify('error', 'Lỗi kết nối máy chủ.');
    }
  };

  // Mở modal sửa
  const handleOpenEdit = (v: Voucher) => {
    setEditingVoucher(v);
    setFormData({
      code: v.code,
      title: v.title,
      description: v.description || '',
      discountType: v.discountType,
      discountValue: v.discountValue,
      minOrderValue: v.minOrderValue,
      maxDiscount: v.maxDiscount,
      usageLimit: v.usageLimit,
      applicableScope: v.applicableScope || 'ALL',
      applicableCategories: Array.isArray(v.applicableCategories) ? v.applicableCategories : [],
      applicableProductIds: Array.isArray(v.applicableProductIds) ? v.applicableProductIds : [],
      limitPerUser: v.limitPerUser || 1,
      startDate: v.startDate ? new Date(v.startDate).toISOString().split('T')[0] : '',
      endDate: v.endDate ? new Date(v.endDate).toISOString().split('T')[0] : '',
      isActive: v.isActive,
    });
    setShowEditModal(true);
  };

  // Helper toggle Category trong formData
  const toggleCategory = (cat: string) => {
    setFormData(prev => {
      const current = prev.applicableCategories || [];
      const next = current.includes(cat) ? current.filter(c => c !== cat) : [...current, cat];
      return { ...prev, applicableCategories: next };
    });
  };

  // Helper toggle Product trong formData
  const toggleProduct = (identifier: string) => {
    setFormData(prev => {
      const current = prev.applicableProductIds || [];
      const next = current.includes(identifier) ? current.filter(id => id !== identifier) : [...current, identifier];
      return { ...prev, applicableProductIds: next };
    });
  };

  const isExpired = (endDate?: string) => {
    if (!endDate) return false;
    return new Date(endDate) < new Date();
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
            <span className="p-1.5 rounded-md bg-teal-100 text-teal-800">
              <Tag size={20} />
            </span>
            <h1 className="text-xl font-bold text-slate-900">Quản Lý Mã Giảm Giá & Voucher Khuyến Mãi</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Hệ thống voucher chuẩn siêu thị: Hỗ trợ giảm tiền, % theo đơn, Freeship, áp dụng cho toàn bộ giỏ hàng, theo từng danh mục hoặc sản phẩm cụ thể.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadVouchers}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            Làm mới
          </button>

          <button
            onClick={() => {
              setFormData(initialFormData);
              setShowAddModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-md shadow-sm transition-colors"
          >
            <Plus size={16} />
            Tạo Mã Voucher Mới
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Mã Đang Hoạt Động</span>
            <span className="p-1.5 rounded-md bg-emerald-50 text-emerald-600">
              <CheckCircle2 size={16} />
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {vouchers.filter(v => v.isActive && !isExpired(v.endDate)).length}
          </div>
          <p className="text-xs text-slate-500 mt-1">Sẵn sàng áp dụng cho khách hàng</p>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Voucher Theo Danh Mục</span>
            <span className="p-1.5 rounded-md bg-purple-50 text-purple-600">
              <Layers size={16} />
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {vouchers.filter(v => v.applicableScope === 'CATEGORY').length}
          </div>
          <p className="text-xs text-slate-500 mt-1">Khuyến mãi ngành hàng</p>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Voucher Theo Sản Phẩm</span>
            <span className="p-1.5 rounded-md bg-amber-50 text-amber-600">
              <ShoppingBag size={16} />
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {vouchers.filter(v => v.applicableScope === 'PRODUCT').length}
          </div>
          <p className="text-xs text-slate-500 mt-1">Sản phẩm thúc đẩy doanh số</p>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Tổng Lượt Đã Sử Dụng</span>
            <span className="p-1.5 rounded-md bg-blue-50 text-blue-600">
              <Gift size={16} />
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {vouchers.reduce((sum, v) => sum + (v.usedCount || 0), 0)}
          </div>
          <p className="text-xs text-slate-500 mt-1">Đã khấu trừ trên đơn hàng</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-96">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo mã voucher hoặc tên chương trình..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-teal-600"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Filter size={15} />
            <span>Phạm vi:</span>
          </div>
          <select
            value={scopeFilter}
            onChange={e => setScopeFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-teal-600 bg-white"
          >
            <option value="ALL">Tất cả phạm vi</option>
            <option value="CATEGORY">Theo danh mục</option>
            <option value="PRODUCT">Theo sản phẩm</option>
          </select>

          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-teal-600 bg-white"
          >
            <option value="ALL">Tất cả hình thức</option>
            <option value="FIXED">Trừ tiền cố định</option>
            <option value="PERCENT">Giảm phần trăm (%)</option>
            <option value="FREESHIP">Miễn phí vận chuyển</option>
          </select>
        </div>
      </div>

      {/* Bảng danh sách Voucher */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Mã Voucher</th>
                <th className="px-4 py-3">Chương Trình & Điều Kiện</th>
                <th className="px-4 py-3">Phạm Vi Áp Dụng</th>
                <th className="px-4 py-3 text-right">Mức Giảm</th>
                <th className="px-4 py-3 text-right">Đơn Tối Thiểu</th>
                <th className="px-4 py-3 text-center">Thời Hạn</th>
                <th className="px-4 py-3 text-center">Tiến Độ Sử Dụng</th>
                <th className="px-4 py-3 text-center">Trạng Thái</th>
                <th className="px-4 py-3 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                    <RefreshCw size={20} className="animate-spin inline-block mr-2" />
                    Đang nạp dữ liệu mã giảm giá...
                  </td>
                </tr>
              ) : filteredVouchers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                    Không tìm thấy mã giảm giá nào phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                filteredVouchers.map(v => {
                  const expired = isExpired(v.endDate);
                  return (
                    <tr key={v.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-slate-900">
                        <div className="flex items-center gap-1.5">
                          <span>{v.code}</span>
                          <button
                            onClick={() => handleCopy(v.code)}
                            className="text-slate-400 hover:text-slate-600 p-1 rounded"
                            title="Sao chép mã"
                          >
                            {copiedCode === v.code ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                          </button>
                        </div>
                        <div className="text-[11px] font-normal text-slate-500">
                          {v.limitPerUser ? `${v.limitPerUser} lượt/khách` : '1 lượt/khách'}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">{v.title}</div>
                        {v.description && (
                          <div className="text-xs text-slate-500 line-clamp-1">{v.description}</div>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        {v.applicableScope === 'CATEGORY' ? (
                          <div>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
                              <Layers size={12} />
                              Danh mục ({v.applicableCategories?.length || 0})
                            </span>
                            <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                              {v.applicableCategories?.join(', ')}
                            </div>
                          </div>
                        ) : v.applicableScope === 'PRODUCT' ? (
                          <div>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
                              <ShoppingBag size={12} />
                              Sản phẩm ({v.applicableProductIds?.length || 0})
                            </span>
                            <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-1 font-mono">
                              {v.applicableProductIds?.join(', ')}
                            </div>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                            Toàn bộ giỏ hàng
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-right font-semibold text-slate-900" style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {v.discountType === 'PERCENT' ? (
                          <div>
                            <span className="text-emerald-700">-{v.discountValue}%</span>
                            {v.maxDiscount && (
                              <div className="text-[11px] text-slate-400 font-normal">
                                Tối đa {v.maxDiscount.toLocaleString('vi-VN')}đ
                              </div>
                            )}
                          </div>
                        ) : v.discountType === 'FREESHIP' ? (
                          <span className="text-teal-700 font-medium">Miễn phí ship</span>
                        ) : (
                          <span className="text-teal-800">-{v.discountValue.toLocaleString('vi-VN')}đ</span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-right text-slate-600" style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {v.minOrderValue > 0 ? `${v.minOrderValue.toLocaleString('vi-VN')}đ` : 'Không giới hạn'}
                      </td>

                      <td className="px-4 py-3 text-center text-xs">
                        {v.endDate ? (
                          <div>
                            <div className={`font-medium ${expired ? 'text-rose-600 line-through' : 'text-slate-700'}`}>
                              {new Date(v.endDate).toLocaleDateString('vi-VN')}
                            </div>
                            {expired ? (
                              <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[10px] bg-rose-50 text-rose-700 border border-rose-200">
                                Đã hết hạn
                              </span>
                            ) : (
                              <div className="text-[11px] text-slate-400">
                                {v.startDate ? `Từ ${new Date(v.startDate).toLocaleDateString('vi-VN')}` : 'Đang hiệu lực'}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">Vô thời hạn</span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <div className="w-24 mx-auto">
                          <div className="flex justify-between text-xs text-slate-500 mb-1">
                            <span>{v.usedCount || 0} / {v.usageLimit || 1000}</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div 
                              className="bg-teal-600 h-1.5 rounded-full" 
                              style={{ width: `${Math.min(100, Math.round(((v.usedCount || 0) / Math.max(1, v.usageLimit || 1000)) * 100))}%` }} 
                            />
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleToggleActive(v)}
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors ${
                            v.isActive && !expired
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100' 
                              : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${v.isActive && !expired ? 'bg-emerald-600' : 'bg-slate-400'}`} />
                          {v.isActive && !expired ? 'Đang chạy' : expired ? 'Hết hạn' : 'Tạm dừng'}
                        </button>
                      </td>

                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenEdit(v)}
                            className="p-1.5 text-slate-600 hover:text-teal-700 hover:bg-teal-50 rounded transition-colors"
                            title="Chỉnh sửa voucher"
                          >
                            <Edit3 size={15} />
                          </button>
                          <button
                            onClick={() => handleDeleteVoucher(v)}
                            className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                            title="Xóa voucher"
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
      </div>

      {/* MODAL: Tạo mới hoặc Chỉnh sửa Voucher */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded bg-teal-100 text-teal-800">
                  <Tag size={16} />
                </span>
                <h3 className="text-base font-semibold text-slate-900">
                  {showEditModal ? 'Chỉnh Sửa Mã Giảm Giá' : 'Tạo Mã Giảm Giá Mới (Chuẩn Siêu Thị)'}
                </h3>
              </div>
              <button 
                onClick={() => { setShowAddModal(false); setShowEditModal(false); }} 
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveVoucher} className="p-6 space-y-5 overflow-y-auto">
              {/* Nhóm 1: Thông tin cơ bản */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-100 pb-1 flex items-center gap-1.5">
                  <Tag size={14} className="text-teal-700" />
                  Thông tin định danh & Khuyến mãi
                </h4>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Mã Giảm Giá (Code) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="VD: CTMART50, RAUCU15"
                      value={formData.code || ''}
                      onChange={e => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-teal-600 uppercase font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Hình Thức Khuyến Mãi <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={formData.discountType}
                      onChange={e => setFormData(prev => ({ ...prev, discountType: e.target.value as any }))}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-teal-600 bg-white"
                    >
                      <option value="FIXED">Trừ tiền cố định (VNĐ)</option>
                      <option value="PERCENT">Giảm theo tỷ lệ phần trăm (%)</option>
                      <option value="FREESHIP">Miễn phí vận chuyển (Freeship)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Tên Chương Trình Khuyến Mãi <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Ưu đãi 15% cho danh mục Rau củ quả sạch"
                    value={formData.title || ''}
                    onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-teal-600"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      {formData.discountType === 'PERCENT' ? 'Tỷ Lệ Giảm (%)' : 'Số Tiền Giảm (VNĐ)'} <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={formData.discountValue || 0}
                      onChange={e => setFormData(prev => ({ ...prev, discountValue: Number(e.target.value) }))}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-teal-600 font-bold text-teal-800"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Đơn Hàng Tối Thiểu (VNĐ)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="0đ = Không giới hạn"
                      value={formData.minOrderValue || 0}
                      onChange={e => setFormData(prev => ({ ...prev, minOrderValue: Number(e.target.value) }))}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-teal-600"
                    />
                  </div>
                </div>

                {formData.discountType === 'PERCENT' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Mức Giảm Tối Đa (VNĐ)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="Không bắt buộc (VD: 50.000đ)"
                      value={formData.maxDiscount || ''}
                      onChange={e => setFormData(prev => ({ ...prev, maxDiscount: e.target.value ? Number(e.target.value) : undefined }))}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-teal-600"
                    />
                  </div>
                )}
              </div>

              {/* Nhóm 2: Phạm vi áp dụng (Core Feature) */}
              <div className="space-y-3 pt-3 border-t border-slate-200">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers size={14} className="text-purple-700" />
                  Phạm Vi Áp Dụng (Target Scope)
                </h4>

                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, applicableScope: 'ALL' }))}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      formData.applicableScope === 'ALL'
                        ? 'bg-teal-50/70 border-teal-600 text-teal-900 font-medium ring-1 ring-teal-600'
                        : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="text-xs font-semibold">Toàn bộ giỏ hàng</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">Áp dụng cho mọi sản phẩm</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, applicableScope: 'CATEGORY' }))}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      formData.applicableScope === 'CATEGORY'
                        ? 'bg-purple-50/70 border-purple-600 text-purple-900 font-medium ring-1 ring-purple-600'
                        : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="text-xs font-semibold">Theo danh mục</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">Rau củ, Thịt cá, Sữa...</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, applicableScope: 'PRODUCT' }))}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      formData.applicableScope === 'PRODUCT'
                        ? 'bg-amber-50/70 border-amber-600 text-amber-900 font-medium ring-1 ring-amber-600'
                        : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="text-xs font-semibold">Theo sản phẩm</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">Chỉ định từng mặt hàng</div>
                  </button>
                </div>

                {/* Sub-UI: Chọn danh mục */}
                {formData.applicableScope === 'CATEGORY' && (
                  <div className="p-3.5 bg-purple-50/40 rounded-lg border border-purple-200/80 space-y-2">
                    <div className="text-xs font-medium text-purple-950 flex items-center justify-between">
                      <span>Chọn danh mục áp dụng ({formData.applicableCategories?.length || 0} đã chọn):</span>
                      <span className="text-[11px] text-purple-700">Khách phải có ít nhất 1 sản phẩm thuộc nhóm này</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1">
                      {availableCategories.map(cat => {
                        const isSelected = (formData.applicableCategories || []).includes(cat);
                        return (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => toggleCategory(cat)}
                            className={`px-2.5 py-1 text-xs rounded-md border transition-all flex items-center gap-1.5 ${
                              isSelected
                                ? 'bg-purple-700 text-white border-purple-700 font-medium shadow-sm'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-purple-100/50'
                            }`}
                          >
                            {isSelected && <Check size={12} />}
                            <span>{cat}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Sub-UI: Chọn sản phẩm cụ thể */}
                {formData.applicableScope === 'PRODUCT' && (
                  <div className="p-3.5 bg-amber-50/40 rounded-lg border border-amber-200/80 space-y-3">
                    <div className="text-xs font-medium text-amber-950 flex items-center justify-between">
                      <span>Sản phẩm áp dụng khuyến mãi ({formData.applicableProductIds?.length || 0} đã chọn):</span>
                      <span className="text-[11px] text-amber-800">Chỉ giảm giá trên các sản phẩm này</span>
                    </div>

                    {/* Tag các sản phẩm đã chọn */}
                    {formData.applicableProductIds && formData.applicableProductIds.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1 bg-white rounded border border-amber-200">
                        {formData.applicableProductIds.map(id => {
                          const prod = productMetaMap[id] || availableProducts.find(p => p.sku === id || p.id === id);
                          return (
                            <span 
                              key={id} 
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-amber-100 text-amber-900 border border-amber-300"
                            >
                              <span className="font-mono font-semibold">{id}</span>
                              {prod && <span className="text-[11px] text-amber-800 max-w-[140px] truncate">({prod.name})</span>}
                              <button 
                                type="button" 
                                onClick={() => toggleProduct(id)}
                                className="text-amber-700 hover:text-amber-950 ml-0.5"
                              >
                                <X size={12} />
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    )}

                    {/* Ô tìm kiếm và chọn sản phẩm */}
                    <div className="space-y-1.5">
                      <div className="relative">
                        {isSearchingProduct ? (
                          <RefreshCw size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-amber-600 animate-spin" />
                        ) : (
                          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        )}
                        <input
                          type="text"
                          placeholder="Gõ mã SKU hoặc tên sản phẩm (VD: Dưa hấu, CT-11260277...)"
                          value={productSearchInput}
                          onChange={e => setProductSearchInput(e.target.value)}
                          className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-amber-600 bg-white"
                        />
                      </div>

                      <div className="max-h-44 overflow-y-auto divide-y divide-slate-100 bg-white rounded border border-slate-200 text-xs">
                        {isSearchingProduct ? (
                          <div className="p-3 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                            <RefreshCw size={13} className="animate-spin" />
                            Đang tra cứu cơ sở dữ liệu sản phẩm...
                          </div>
                        ) : (productSearchInput.trim() ? searchedProducts : availableProducts.slice(0, 10)).length === 0 ? (
                          <div className="p-3 text-center text-slate-400 text-xs">
                            {productSearchInput.trim() ? `Không tìm thấy sản phẩm nào khớp với "${productSearchInput}"` : 'Chưa có sản phẩm nào.'}
                          </div>
                        ) : (
                          (productSearchInput.trim() ? searchedProducts : availableProducts.slice(0, 10)).map(p => {
                            const targetKey = p.sku || p.id;
                            const isSelected = (formData.applicableProductIds || []).includes(targetKey);
                            return (
                              <div 
                                key={p.id} 
                                onClick={() => toggleProduct(targetKey)}
                                className={`p-2 flex items-center justify-between cursor-pointer hover:bg-amber-50/60 transition-colors ${
                                  isSelected ? 'bg-amber-50 text-amber-900 font-medium' : 'text-slate-700'
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="font-mono font-semibold text-slate-900 text-[11px] bg-slate-100 px-1 py-0.5 rounded shrink-0">
                                    {p.sku || p.id}
                                  </span>
                                  <span className="truncate max-w-[280px]">{p.name}</span>
                                  {p.category && (
                                    <span className="text-[10px] text-slate-400 shrink-0 hidden sm:inline">
                                      ({p.category})
                                    </span>
                                  )}
                                </div>
                                <span className={`text-[11px] px-2 py-0.5 rounded shrink-0 ${isSelected ? 'bg-amber-700 text-white' : 'bg-slate-100 text-slate-600'}`}>
                                  {isSelected ? 'Đã chọn' : '+ Thêm'}
                                </span>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Nhóm 3: Thời hạn & Giới hạn sử dụng */}
              <div className="space-y-3 pt-3 border-t border-slate-200">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar size={14} className="text-teal-700" />
                  Thời Hạn & Giới Hạn Sử Dụng
                </h4>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Ngày Bắt Đầu Hiệu Lực
                    </label>
                    <input
                      type="date"
                      value={formData.startDate || ''}
                      onChange={e => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-teal-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Ngày Hết Hạn
                    </label>
                    <input
                      type="date"
                      value={formData.endDate || ''}
                      onChange={e => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-teal-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Tổng Suất Phát Hành
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.usageLimit || 1000}
                      onChange={e => setFormData(prev => ({ ...prev, usageLimit: Number(e.target.value) }))}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-teal-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Giới Hạn Lượt Dùng / Khách Hàng
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.limitPerUser || 1}
                      onChange={e => setFormData(prev => ({ ...prev, limitPerUser: Number(e.target.value) }))}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-teal-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Mô Tả Hiển Thị Cho Khách Hàng Thấy
                  </label>
                  <input
                    type="text"
                    placeholder="VD: Áp dụng cho đơn hàng từ 200.000đ, chỉ áp dụng cho nhóm Rau củ quả sạch"
                    value={formData.description || ''}
                    onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-teal-600"
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3 sticky bottom-0 bg-white">
                <button
                  type="button"
                  onClick={() => { setShowAddModal(false); setShowEditModal(false); }}
                  className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-md shadow-sm transition-colors"
                >
                  {showEditModal ? 'Cập Nhật Voucher' : 'Phát Hành Voucher'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
