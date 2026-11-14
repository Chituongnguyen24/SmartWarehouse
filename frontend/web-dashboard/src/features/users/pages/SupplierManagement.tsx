import React, { useState, useEffect, useMemo } from 'react';
import {
  Building2,
  Plus,
  Search,
  Filter,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Star,
  Clock,
  ShieldCheck,
  Edit3,
  Trash2,
  Eye,
  RefreshCw,
  X,
  CreditCard,
  Truck,
  Layers,
  FileText,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Package,
} from 'lucide-react';
import { useAuth } from '@/features/auth';
import { getApiHost } from '@/shared/utils/apiConfig';

const API_BASE = getApiHost(3011);

export interface Supplier {
  id: string;
  code: string;
  name: string;
  shortName?: string;
  contact: string;
  address: string;
  phone?: string;
  email?: string;
  taxCode?: string;
  status: 'ACTIVE' | 'INACTIVE';
  category?: string;
  paymentTerms?: string;
  rating?: number | string;
  leadTimeDays?: number;
  certifications?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
  stats?: {
    activeLotsCount: number;
    totalLotsCount: number;
  };
}

export const CATEGORY_MAP: Record<string, { label: string; bg: string; color: string; border: string }> = {
  RAU_CU_QUA: {
    label: 'Rau Củ & Nông Sản',
    bg: '#f0fdf4',
    color: '#166534',
    border: '#bbf7d0',
  },
  THIT_CA_TUOI: {
    label: 'Thịt, Cá & Thủy Sản',
    bg: '#fff1f2',
    color: '#9f1239',
    border: '#fecdd3',
  },
  DO_DONG_LANH: {
    label: 'Thực Phẩm Đông Lạnh',
    bg: '#eff6ff',
    color: '#1e40af',
    border: '#bfdbfe',
  },
  SUA_BO_TRUNG: {
    label: 'Sữa & Chế Phẩm',
    bg: '#faf5ff',
    color: '#6b21a8',
    border: '#e9d5ff',
  },
  KHO_GIA_VI: {
    label: 'Hàng Khô & Gia Vị',
    bg: '#fffbeb',
    color: '#92400e',
    border: '#fde68a',
  },
  DONG_GOI_BAO_BI: {
    label: 'Bao Bì & Đóng Gói',
    bg: '#f8fafc',
    color: '#334155',
    border: '#cbd5e1',
  },
};

const PAYMENT_TERMS_OPTIONS = [
  'Công nợ 15 ngày (Net 15)',
  'Công nợ 30 ngày (Net 30)',
  'Công nợ 45 ngày (Net 45)',
  'Công nợ 60 ngày (Net 60)',
  'Thanh toán ngay khi giao (COD)',
  'Chuyển khoản trước khi giao',
  'Thanh toán cuối tháng (EOM)',
];

const SupplierManagement: React.FC = () => {
  const { token, user } = useAuth();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [sortBy, setSortBy] = useState<'CODE' | 'RATING' | 'LEAD_TIME' | 'NAME'>('CODE');

  // Modals & Panels
  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [detailSupplier, setDetailSupplier] = useState<Supplier | null>(null);
  const [deleteConfirmSup, setDeleteConfirmSup] = useState<Supplier | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Toast Notification
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4500);
  };

  const headers = useMemo(() => ({
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }), [token]);

  // Form State
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    shortName: '',
    contact: '',
    phone: '',
    email: '',
    taxCode: '',
    address: '',
    category: 'RAU_CU_QUA',
    paymentTerms: 'Công nợ 30 ngày (Net 30)',
    rating: 4.8,
    leadTimeDays: 2,
    certifications: 'HACCP, ISO 22000',
    notes: '',
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
  });

  const fetchSuppliers = async () => {
    try {
      setRefreshing(true);
      const res = await fetch(`${API_BASE}/inventory/suppliers`, { headers });
      if (res.ok) {
        const data = await res.json();
        setSuppliers(Array.isArray(data) ? data : []);
      } else {
        showToast('Không thể tải danh sách nhà cung cấp từ máy chủ.', 'error');
      }
    } catch (err) {
      console.error('Failed to fetch suppliers:', err);
      showToast('Lỗi kết nối tới máy chủ kho (inventory-service).', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, [token]);

  // View Details with Live Stats
  const handleViewDetail = async (sup: Supplier) => {
    try {
      const res = await fetch(`${API_BASE}/inventory/suppliers/${sup.id}`, { headers });
      if (res.ok) {
        const detailed = await res.json();
        setDetailSupplier(detailed);
      } else {
        setDetailSupplier(sup);
      }
    } catch (e) {
      setDetailSupplier(sup);
    }
  };

  const handleOpenCreate = () => {
    const nextNum = suppliers.length + 1;
    const autoCode = `SUP-${String(nextNum).padStart(3, '0')}`;
    setFormData({
      code: autoCode,
      name: '',
      shortName: '',
      contact: '',
      phone: '',
      email: '',
      taxCode: '',
      address: '',
      category: 'RAU_CU_QUA',
      paymentTerms: 'Công nợ 30 ngày (Net 30)',
      rating: 4.8,
      leadTimeDays: 2,
      certifications: 'VietGAP, HACCP, ISO 22000',
      notes: '',
      status: 'ACTIVE',
    });
    setEditingSupplier(null);
    setShowModal(true);
  };

  const handleOpenEdit = (sup: Supplier) => {
    setFormData({
      code: sup.code || '',
      name: sup.name || '',
      shortName: sup.shortName || '',
      contact: sup.contact || '',
      phone: sup.phone || '',
      email: sup.email || '',
      taxCode: sup.taxCode || '',
      address: sup.address || '',
      category: sup.category || 'RAU_CU_QUA',
      paymentTerms: sup.paymentTerms || 'Công nợ 30 ngày (Net 30)',
      rating: sup.rating ? Number(sup.rating) : 4.8,
      leadTimeDays: sup.leadTimeDays || 2,
      certifications: sup.certifications || '',
      notes: sup.notes || '',
      status: sup.status || 'ACTIVE',
    });
    setEditingSupplier(sup);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast('Vui lòng nhập tên nhà cung cấp!', 'error');
      return;
    }
    if (!formData.contact.trim()) {
      showToast('Vui lòng nhập thông tin người liên hệ!', 'error');
      return;
    }
    if (!formData.address.trim()) {
      showToast('Vui lòng nhập địa chỉ nhà cung cấp!', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      const url = editingSupplier
        ? `${API_BASE}/inventory/suppliers/${editingSupplier.id}`
        : `${API_BASE}/inventory/suppliers`;
      const method = editingSupplier ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setShowModal(false);
        showToast(
          editingSupplier
            ? `Cập nhật hồ sơ nhà cung cấp [${formData.code}] thành công!`
            : `Đã tạo mới nhà cung cấp [${formData.code}] thành công!`,
          'success'
        );
        fetchSuppliers();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(`Lỗi: ${err.message || 'Không thể lưu hồ sơ nhà cung cấp'}`, 'error');
      }
    } catch (error) {
      console.error('Failed to save supplier:', error);
      showToast('Lỗi máy chủ khi lưu nhà cung cấp.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmSup) return;
    try {
      setIsDeleting(true);
      const res = await fetch(`${API_BASE}/inventory/suppliers/${deleteConfirmSup.id}`, {
        method: 'DELETE',
        headers,
      });

      if (res.ok) {
        const data = await res.json();
        showToast(data.message || 'Đã xử lý xóa/tạm ngưng nhà cung cấp!', 'success');
        setDeleteConfirmSup(null);
        if (detailSupplier?.id === deleteConfirmSup.id) setDetailSupplier(null);
        fetchSuppliers();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(`Lỗi: ${err.message || 'Không thể xóa nhà cung cấp'}`, 'error');
      }
    } catch (error) {
      console.error('Failed to delete supplier:', error);
      showToast('Lỗi kết nối khi xóa nhà cung cấp.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter & Sort
  const filteredSuppliers = useMemo(() => {
    let result = suppliers.filter(sup => {
      const q = search.trim().toLowerCase();
      const matchSearch =
        !q ||
        (sup.name || '').toLowerCase().includes(q) ||
        (sup.shortName || '').toLowerCase().includes(q) ||
        (sup.code || '').toLowerCase().includes(q) ||
        (sup.taxCode || '').toLowerCase().includes(q) ||
        (sup.contact || '').toLowerCase().includes(q) ||
        (sup.phone || '').includes(q);

      const matchCategory = selectedCategory === 'ALL' || sup.category === selectedCategory;
      const matchStatus = selectedStatus === 'ALL' || sup.status === selectedStatus;

      return matchSearch && matchCategory && matchStatus;
    });

    result.sort((a, b) => {
      if (sortBy === 'CODE') {
        return (a.code || '').localeCompare(b.code || '');
      }
      if (sortBy === 'RATING') {
        return Number(b.rating || 0) - Number(a.rating || 0);
      }
      if (sortBy === 'LEAD_TIME') {
        return Number(a.leadTimeDays || 99) - Number(b.leadTimeDays || 99);
      }
      return (a.name || '').localeCompare(b.name || '');
    });

    return result;
  }, [suppliers, search, selectedCategory, selectedStatus, sortBy]);

  // KPIs
  const activeCount = suppliers.filter(s => s.status === 'ACTIVE').length;
  const highRatedCount = suppliers.filter(s => Number(s.rating || 0) >= 4.8).length;
  const certifiedCount = suppliers.filter(s => (s.certifications || '').toLowerCase().includes('haccp') || (s.certifications || '').toLowerCase().includes('vietgap')).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', paddingBottom: '2rem' }}>
      {/* Toast Notification */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: '1.5rem',
            right: '1.5rem',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '12px 18px',
            borderRadius: 8,
            backgroundColor: toast.type === 'error' ? '#fef2f2' : toast.type === 'info' ? '#eff6ff' : '#f0fdf4',
            color: toast.type === 'error' ? '#991b1b' : toast.type === 'info' ? '#1e40af' : '#166534',
            border: `1px solid ${toast.type === 'error' ? '#fecaca' : toast.type === 'info' ? '#bfdbfe' : '#bbf7d0'}`,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
            fontSize: '0.875rem',
            fontWeight: 500,
          }}
        >
          {toast.type === 'error' ? (
            <AlertTriangle size={18} color="#991b1b" />
          ) : (
            <CheckCircle2 size={18} color="#166534" />
          )}
          <span>{toast.msg}</span>
          <button
            onClick={() => setToast(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginLeft: 8 }}
          >
            <X size={14} color="#64748b" />
          </button>
        </div>
      )}

      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Building2 size={24} color="#0f766e" />
            <h1 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
              Quản Lý Nhà Cung Cấp
            </h1>
          </div>
          <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '4px 0 0 0' }}>
            Hồ sơ năng lực, điều khoản thương mại và kiểm soát chất lượng chuỗi cung ứng thực phẩm & kho lạnh WMS.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={fetchSuppliers}
            disabled={refreshing}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#334155',
              fontSize: '0.85rem',
              fontWeight: 500,
              cursor: refreshing ? 'not-allowed' : 'pointer',
            }}
          >
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
            Làm mới
          </button>

          <button
            type="button"
            onClick={handleOpenCreate}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 16px',
              borderRadius: 6,
              border: 'none',
              backgroundColor: '#0f766e',
              color: '#ffffff',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
            }}
          >
            <Plus size={16} /> Thêm Nhà Cung Cấp
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <div style={kpiCardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
              Tổng Nhà Cung Cấp
            </span>
            <div style={kpiIconStyle('#f0fdf4', '#0f766e')}>
              <Building2 size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 700, color: '#0f172a', marginTop: 8, fontVariantNumeric: 'tabular-nums' }}>
            {suppliers.length}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 4 }}>
            Đối tác cung ứng trên toàn hệ thống
          </div>
        </div>

        <div style={kpiCardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
              Đang Hợp Tác Cung Ứng
            </span>
            <div style={kpiIconStyle('#f0fdf4', '#166534')}>
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 700, color: '#166534', marginTop: 8, fontVariantNumeric: 'tabular-nums' }}>
            {activeCount}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 4 }}>
            Hợp đồng cung ứng đang có hiệu lực ({suppliers.length > 0 ? Math.round((activeCount / suppliers.length) * 100) : 0}%)
          </div>
        </div>

        <div style={kpiCardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
              Chất Lượng Xuất Sắc (≥ 4.8★)
            </span>
            <div style={kpiIconStyle('#fffbeb', '#b45309')}>
              <Star size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 700, color: '#b45309', marginTop: 8, fontVariantNumeric: 'tabular-nums' }}>
            {highRatedCount}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 4 }}>
            Độ tươi sống và đúng hạn cao
          </div>
        </div>

        <div style={kpiCardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
              Chuẩn An Toàn Thực Phẩm
            </span>
            <div style={kpiIconStyle('#eff6ff', '#1d4ed8')}>
              <ShieldCheck size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 700, color: '#1d4ed8', marginTop: 8, fontVariantNumeric: 'tabular-nums' }}>
            {certifiedCount}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 4 }}>
            Có chứng chỉ HACCP / VietGAP / ISO
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 10,
          alignItems: 'center',
          backgroundColor: '#ffffff',
          padding: '12px 16px',
          borderRadius: 8,
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
        }}
      >
        {/* Search */}
        <div style={{ flex: '1 1 280px', position: 'relative' }}>
          <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Tìm theo mã SUP, tên NCC, người liên hệ, MST, SĐT..."
            style={{
              width: '100%',
              padding: '8px 10px 8px 34px',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              fontSize: '0.85rem',
              color: '#0f172a',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              style={{
                position: 'absolute',
                right: 8,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#94a3b8',
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Category Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 500 }}>Ngành hàng:</span>
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            style={selectControlStyle}
          >
            <option value="ALL">Tất cả ngành hàng</option>
            <option value="RAU_CU_QUA">Rau Củ & Nông Sản</option>
            <option value="THIT_CA_TUOI">Thịt, Cá & Thủy Sản</option>
            <option value="DO_DONG_LANH">Thực Phẩm Đông Lạnh</option>
            <option value="SUA_BO_TRUNG">Sữa & Chế Phẩm</option>
            <option value="KHO_GIA_VI">Hàng Khô & Gia Vị</option>
            <option value="DONG_GOI_BAO_BI">Bao Bì & Đóng Gói</option>
          </select>
        </div>

        {/* Status Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 500 }}>Trạng thái:</span>
          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            style={selectControlStyle}
          >
            <option value="ALL">Tất cả</option>
            <option value="ACTIVE">Đang hoạt động</option>
            <option value="INACTIVE">Tạm ngưng hợp tác</option>
          </select>
        </div>

        {/* Sort By */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 500 }}>Sắp xếp:</span>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as any)}
            style={selectControlStyle}
          >
            <option value="CODE">Mã NCC (A-Z)</option>
            <option value="RATING">Đánh giá sao (Cao nhất)</option>
            <option value="LEAD_TIME">Thời gian giao (Nhanh nhất)</option>
            <option value="NAME">Tên nhà cung cấp (A-Z)</option>
          </select>
        </div>
      </div>

      {/* Main Table Container */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: 8,
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
          overflow: 'hidden',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 600, fontSize: '0.78rem', textTransform: 'uppercase' }}>
                <th style={{ padding: '10px 14px', width: '110px' }}>Mã NCC</th>
                <th style={{ padding: '10px 14px' }}>Nhà Cung Cấp</th>
                <th style={{ padding: '10px 14px' }}>Ngành Hàng</th>
                <th style={{ padding: '10px 14px' }}>Đầu Mối Liên Hệ</th>
                <th style={{ padding: '10px 14px' }}>Mã Số Thuế & Trụ Sở</th>
                <th style={{ padding: '10px 14px', width: '130px' }}>Giao Hàng & Công Nợ</th>
                <th style={{ padding: '10px 14px', width: '110px' }}>Đánh Giá</th>
                <th style={{ padding: '10px 14px', width: '110px' }}>Trạng Thái</th>
                <th style={{ padding: '10px 14px', width: '100px', textAlign: 'center' }}>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                      <RefreshCw size={24} className="animate-spin" color="#0f766e" />
                      <span>Đang tải danh sách nhà cung cấp...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                    <Building2 size={36} color="#cbd5e1" style={{ margin: '0 auto 8px' }} />
                    <p style={{ margin: 0, fontWeight: 500 }}>Không tìm thấy nhà cung cấp nào phù hợp.</p>
                    <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Thử đổi bộ lọc hoặc tạo mới nhà cung cấp.</span>
                  </td>
                </tr>
              ) : (
                filteredSuppliers.map((sup, idx) => {
                  const cat = sup.category && CATEGORY_MAP[sup.category] ? CATEGORY_MAP[sup.category] : CATEGORY_MAP.RAU_CU_QUA;
                  return (
                    <tr
                      key={sup.id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fafafa',
                        transition: 'background-color 0.15s ease',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = idx % 2 === 0 ? '#ffffff' : '#fafafa')}
                    >
                      {/* Code */}
                      <td style={{ padding: '10px 14px' }}>
                        <span
                          style={{
                            padding: '3px 7px',
                            borderRadius: 4,
                            backgroundColor: '#f1f5f9',
                            color: '#0f172a',
                            fontWeight: 700,
                            fontSize: '0.78rem',
                            fontFamily: 'monospace',
                            border: '1px solid #e2e8f0',
                            display: 'inline-block',
                          }}
                        >
                          {sup.code || `SUP-${idx + 1}`}
                        </span>
                      </td>

                      {/* Name & Short Name */}
                      <td style={{ padding: '10px 14px', maxWidth: '240px' }}>
                        <div
                          onClick={() => handleViewDetail(sup)}
                          style={{ fontWeight: 600, color: '#0f172a', cursor: 'pointer', lineHeight: '1.3' }}
                          title={sup.name}
                        >
                          {sup.shortName || sup.name}
                        </div>
                        {sup.shortName && sup.shortName !== sup.name && (
                          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={sup.name}>
                            {sup.name}
                          </div>
                        )}
                      </td>

                      {/* Category */}
                      <td style={{ padding: '10px 14px' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: 4,
                            fontSize: '0.725rem',
                            fontWeight: 600,
                            backgroundColor: cat.bg,
                            color: cat.color,
                            border: `1px solid ${cat.border}`,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {cat.label}
                        </span>
                      </td>

                      {/* Contact */}
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ fontWeight: 500, color: '#0f172a' }}>{sup.contact}</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 3 }}>
                          {sup.phone && (
                            <a
                              href={`tel:${sup.phone}`}
                              style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: '#0284c7', textDecoration: 'none' }}
                            >
                              <Phone size={11} /> {sup.phone}
                            </a>
                          )}
                          {sup.email && (
                            <a
                              href={`mailto:${sup.email}`}
                              style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.725rem', color: '#64748b', textDecoration: 'none' }}
                              title={sup.email}
                            >
                              <Mail size={11} /> {sup.email}
                            </a>
                          )}
                        </div>
                      </td>

                      {/* Tax Code & Address */}
                      <td style={{ padding: '10px 14px', maxWidth: '220px' }}>
                        <div style={{ fontSize: '0.75rem', color: '#0f172a', fontWeight: 600 }}>
                          MST: <span style={{ fontFamily: 'monospace' }}>{sup.taxCode || '—'}</span>
                        </div>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 4,
                            fontSize: '0.75rem',
                            color: '#64748b',
                            marginTop: 3,
                            lineHeight: '1.25',
                          }}
                          title={sup.address}
                        >
                          <MapPin size={11} style={{ flexShrink: 0, marginTop: 2 }} />
                          <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {sup.address}
                          </span>
                        </div>
                      </td>

                      {/* Lead Time & Payment */}
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: '#0f172a', fontWeight: 600 }}>
                          <Clock size={12} color="#0f766e" />
                          <span>Giao trong: {sup.leadTimeDays || 2} ngày</span>
                        </div>
                        <div style={{ fontSize: '0.725rem', color: '#64748b', marginTop: 2 }}>
                          {sup.paymentTerms || 'Công nợ 30 ngày'}
                        </div>
                      </td>

                      {/* Rating & Certifications */}
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                          <Star size={13} fill="#f59e0b" color="#f59e0b" />
                          <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.85rem' }}>
                            {sup.rating ? Number(sup.rating).toFixed(1) : '4.8'}
                          </span>
                        </div>
                        {sup.certifications && (
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 3,
                              fontSize: '0.7rem',
                              color: '#166534',
                              marginTop: 2,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              maxWidth: '100px',
                            }}
                            title={sup.certifications}
                          >
                            <ShieldCheck size={11} />
                            <span>{sup.certifications.split(',')[0]}</span>
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '10px 14px' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: 4,
                            fontSize: '0.725rem',
                            fontWeight: 600,
                            backgroundColor: sup.status === 'ACTIVE' ? '#f0fdf4' : '#fef2f2',
                            color: sup.status === 'ACTIVE' ? '#166534' : '#991b1b',
                            border: `1px solid ${sup.status === 'ACTIVE' ? '#bbf7d0' : '#fecaca'}`,
                            display: 'inline-block',
                          }}
                        >
                          {sup.status === 'ACTIVE' ? 'Đang hợp tác' : 'Tạm ngưng'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6 }}>
                          <button
                            type="button"
                            onClick={() => handleViewDetail(sup)}
                            style={actionButtonStyle}
                            title="Xem chi tiết hồ sơ"
                          >
                            <Eye size={15} color="#0f766e" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(sup)}
                            style={actionButtonStyle}
                            title="Sửa thông tin"
                          >
                            <Edit3 size={15} color="#0284c7" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmSup(sup)}
                            style={{ ...actionButtonStyle, borderColor: '#fecaca' }}
                            title="Xóa hoặc ngừng hợp tác"
                          >
                            <Trash2 size={15} color="#dc2626" />
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

        {/* Table Footer */}
        <div
          style={{
            padding: '10px 16px',
            backgroundColor: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.8rem',
            color: '#64748b',
          }}
        >
          <span>
            Hiển thị <strong>{filteredSuppliers.length}</strong> / <strong>{suppliers.length}</strong> nhà cung cấp
          </span>
          <span>Dữ liệu thời gian thực từ cơ sở dữ liệu WMS</span>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          MODAL: THÊM HOẶC CHỈNH SỬA NHÀ CUNG CẤP
      ───────────────────────────────────────────────────────────── */}
      {showModal && (
        <div
          onClick={() => setShowModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9998,
            padding: '1rem',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 12,
              width: '740px',
              maxWidth: '95%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              border: '1px solid #cbd5e1',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px 20px',
                borderBottom: '1px solid #e2e8f0',
                backgroundColor: '#f8fafc',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Building2 size={20} color="#0f766e" />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                  {editingSupplier ? `Chỉnh Sửa Hồ Sơ NCC [${editingSupplier.code || editingSupplier.shortName}]` : 'Thêm Nhà Cung Cấp Mới'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSave} style={{ padding: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Row 1: Code & Category */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={formLabelStyle}>Mã nhà cung cấp *</label>
                    <input
                      type="text"
                      required
                      value={formData.code}
                      onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      placeholder="VD: SUP-011"
                      style={formInputStyle}
                    />
                  </div>
                  <div>
                    <label style={formLabelStyle}>Nhóm ngành hàng *</label>
                    <select
                      value={formData.category}
                      onChange={e => setFormData({ ...formData, category: e.target.value })}
                      style={formInputStyle}
                    >
                      <option value="RAU_CU_QUA">Rau Củ & Nông Sản</option>
                      <option value="THIT_CA_TUOI">Thịt, Cá & Thủy Sản</option>
                      <option value="DO_DONG_LANH">Thực Phẩm Đông Lạnh</option>
                      <option value="SUA_BO_TRUNG">Sữa & Chế Phẩm</option>
                      <option value="KHO_GIA_VI">Hàng Khô & Gia Vị</option>
                      <option value="DONG_GOI_BAO_BI">Bao Bì & Đóng Gói</option>
                    </select>
                  </div>
                </div>

                {/* Row 2: Full Legal Name & Short Name */}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
                  <div>
                    <label style={formLabelStyle}>Tên đầy đủ công ty / Pháp nhân *</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      placeholder="VD: Công ty Cổ phần Sữa Việt Nam (Vinamilk)"
                      style={formInputStyle}
                    />
                  </div>
                  <div>
                    <label style={formLabelStyle}>Tên thương hiệu viết tắt</label>
                    <input
                      type="text"
                      value={formData.shortName}
                      onChange={e => setFormData({ ...formData, shortName: e.target.value })}
                      placeholder="VD: Vinamilk"
                      style={formInputStyle}
                    />
                  </div>
                </div>

                {/* Row 3: Contact Person & Tax Code */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={formLabelStyle}>Người liên hệ đại diện *</label>
                    <input
                      type="text"
                      required
                      value={formData.contact}
                      onChange={e => setFormData({ ...formData, contact: e.target.value })}
                      placeholder="Họ tên người phụ trách kinh doanh"
                      style={formInputStyle}
                    />
                  </div>
                  <div>
                    <label style={formLabelStyle}>Mã số thuế (MST)</label>
                    <input
                      type="text"
                      value={formData.taxCode}
                      onChange={e => setFormData({ ...formData, taxCode: e.target.value })}
                      placeholder="VD: 0300588569"
                      style={formInputStyle}
                    />
                  </div>
                </div>

                {/* Row 4: Phone & Email */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={formLabelStyle}>Số điện thoại liên hệ</label>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="028 1234 5678 hoặc 090..."
                      style={formInputStyle}
                    />
                  </div>
                  <div>
                    <label style={formLabelStyle}>Email nhận đơn / Hóa đơn điện tử</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      placeholder="sales@company.com.vn"
                      style={formInputStyle}
                    />
                  </div>
                </div>

                {/* Row 5: Address */}
                <div>
                  <label style={formLabelStyle}>Địa chỉ trụ sở / Kho xuất hàng *</label>
                  <input
                    type="text"
                    required
                    value={formData.address}
                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Số nhà, tên đường, KCN, quận/huyện, tỉnh/thành phố"
                    style={formInputStyle}
                  />
                </div>

                {/* Row 6: Payment Terms & Lead Time */}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
                  <div>
                    <label style={formLabelStyle}>Điều khoản thanh toán & công nợ</label>
                    <select
                      value={formData.paymentTerms}
                      onChange={e => setFormData({ ...formData, paymentTerms: e.target.value })}
                      style={formInputStyle}
                    >
                      {PAYMENT_TERMS_OPTIONS.map(opt => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={formLabelStyle}>Thời gian giao hàng (Ngày)</label>
                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={formData.leadTimeDays}
                      onChange={e => setFormData({ ...formData, leadTimeDays: Number(e.target.value) })}
                      style={formInputStyle}
                    />
                  </div>
                </div>

                {/* Row 7: Rating & Certifications */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
                  <div>
                    <label style={formLabelStyle}>Đánh giá chất lượng (1.0 - 5.0)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="1.0"
                      max="5.0"
                      value={formData.rating}
                      onChange={e => setFormData({ ...formData, rating: parseFloat(e.target.value) || 4.8 })}
                      style={formInputStyle}
                    />
                  </div>
                  <div>
                    <label style={formLabelStyle}>Chứng chỉ ATVSTP (HACCP, ISO, VietGAP...)</label>
                    <input
                      type="text"
                      value={formData.certifications}
                      onChange={e => setFormData({ ...formData, certifications: e.target.value })}
                      placeholder="VD: VietGAP, GlobalGAP, HACCP, ISO 22000"
                      style={formInputStyle}
                    />
                  </div>
                </div>

                {/* Row 8: Notes */}
                <div>
                  <label style={formLabelStyle}>Yêu cầu kỹ thuật bảo quản & Ghi chú logistics</label>
                  <textarea
                    rows={2}
                    value={formData.notes}
                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="VD: Xe tải lạnh 2-4°C, cam kết giao lúc 04:00 sáng, thùng carton đạt chuẩn xuất khẩu..."
                    style={{ ...formInputStyle, resize: 'vertical' }}
                  />
                </div>

                {/* Row 9: Status */}
                <div>
                  <label style={formLabelStyle}>Trạng thái hợp tác</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                    style={formInputStyle}
                  >
                    <option value="ACTIVE">Đang hợp tác cung ứng (Active)</option>
                    <option value="INACTIVE">Tạm ngưng hợp tác (Inactive)</option>
                  </select>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20, borderTop: '1px solid #e2e8f0', paddingTop: 14 }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#475569',
                    fontSize: '0.85rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    padding: '8px 20px',
                    borderRadius: 6,
                    border: 'none',
                    backgroundColor: '#0f766e',
                    color: '#ffffff',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" /> Đang lưu...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} /> {editingSupplier ? 'Lưu Cập Nhật' : 'Tạo Nhà Cung Cấp'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL: CHI TIẾT HỒ SƠ NĂNG LỰC NHÀ CUNG CẤP (DETAIL DRAWER)
      ───────────────────────────────────────────────────────────── */}
      {detailSupplier && (
        <div
          onClick={() => setDetailSupplier(null)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9998,
            padding: '1rem',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 12,
              width: '640px',
              maxWidth: '95%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              border: '1px solid #cbd5e1',
            }}
          >
            {/* Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                padding: '16px 20px',
                borderBottom: '1px solid #e2e8f0',
                backgroundColor: '#f8fafc',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: 4,
                      backgroundColor: '#0f766e',
                      color: '#ffffff',
                      fontWeight: 700,
                      fontSize: '0.75rem',
                      fontFamily: 'monospace',
                    }}
                  >
                    {detailSupplier.code}
                  </span>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                    {detailSupplier.shortName || detailSupplier.name}
                  </h3>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 4 }}>
                  {detailSupplier.name}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDetailSupplier(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Stats overview */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 10,
                  backgroundColor: '#f8fafc',
                  padding: 12,
                  borderRadius: 8,
                  border: '1px solid #e2e8f0',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.725rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
                    Đánh Giá Chất Lượng
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                    <Star size={16} fill="#f59e0b" color="#f59e0b" />
                    <span style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a' }}>
                      {detailSupplier.rating ? Number(detailSupplier.rating).toFixed(1) : '4.8'}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>/ 5.0</span>
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.725rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
                    Lô Hàng Đang Lưu Kho
                  </div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f766e', marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>
                    {detailSupplier.stats?.activeLotsCount ?? '—'} lô
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.725rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
                    Tổng Lô Đã Nhập Kho
                  </div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#334155', marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>
                    {detailSupplier.stats?.totalLotsCount ?? '—'} lô
                  </div>
                </div>
              </div>

              {/* Information Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, fontSize: '0.85rem' }}>
                <div>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>Mã Số Thuế</span>
                  <strong style={{ color: '#0f172a', fontFamily: 'monospace' }}>{detailSupplier.taxCode || '—'}</strong>
                </div>

                <div>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>Ngành Hàng Cung Ứng</span>
                  <strong>{detailSupplier.category ? (CATEGORY_MAP[detailSupplier.category]?.label || detailSupplier.category) : 'Rau Củ Quả'}</strong>
                </div>

                <div>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>Người Đại Diện Liên Hệ</span>
                  <strong style={{ color: '#0f172a' }}>{detailSupplier.contact}</strong>
                </div>

                <div>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>Số Điện Thoại</span>
                  <strong style={{ color: '#0284c7' }}>{detailSupplier.phone || '—'}</strong>
                </div>

                <div>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>Email Đặt Hàng</span>
                  <strong style={{ color: '#334155' }}>{detailSupplier.email || '—'}</strong>
                </div>

                <div>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>Thời Gian Giao (Lead Time)</span>
                  <strong style={{ color: '#0f766e' }}>{detailSupplier.leadTimeDays || 2} ngày</strong>
                </div>

                <div style={{ gridColumn: 'span 2' }}>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>Địa Chỉ Kho Xuất Hàng</span>
                  <strong style={{ color: '#0f172a' }}>{detailSupplier.address}</strong>
                </div>

                <div style={{ gridColumn: 'span 2' }}>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>Điều Khoản Thanh Toán & Công Nợ</span>
                  <strong style={{ color: '#0f172a' }}>{detailSupplier.paymentTerms || 'Công nợ 30 ngày (Net 30)'}</strong>
                </div>

                {detailSupplier.certifications && (
                  <div style={{ gridColumn: 'span 2' }}>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>Chứng Chỉ An Toàn Vệ Sinh Thực Phẩm</span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                      {detailSupplier.certifications.split(',').map((cert, i) => (
                        <span
                          key={i}
                          style={{
                            padding: '3px 8px',
                            borderRadius: 4,
                            backgroundColor: '#f0fdf4',
                            color: '#166534',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            border: '1px solid #bbf7d0',
                          }}
                        >
                          ✓ {cert.trim()}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {detailSupplier.notes && (
                  <div style={{ gridColumn: 'span 2', backgroundColor: '#f8fafc', padding: 10, borderRadius: 6, border: '1px solid #e2e8f0' }}>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.725rem', fontWeight: 600, textTransform: 'uppercase' }}>
                      Yêu Cầu Bảo Quản & Logistics
                    </span>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#334155' }}>
                      {detailSupplier.notes}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 20px',
                borderTop: '1px solid #e2e8f0',
                backgroundColor: '#f8fafc',
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setDetailSupplier(null);
                  handleOpenEdit(detailSupplier);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '7px 14px',
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#0284c7',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <Edit3 size={14} /> Chỉnh sửa hồ sơ
              </button>

              <button
                type="button"
                onClick={() => setDetailSupplier(null)}
                style={{
                  padding: '7px 16px',
                  borderRadius: 6,
                  border: 'none',
                  backgroundColor: '#0f172a',
                  color: '#ffffff',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL: XÁC NHẬN XÓA / TẠM NGƯNG HỢP TÁC
      ───────────────────────────────────────────────────────────── */}
      {deleteConfirmSup && (
        <div
          onClick={() => {
            if (!isDeleting) setDeleteConfirmSup(null);
          }}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 12,
              maxWidth: '460px',
              width: '100%',
              padding: '20px',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
              border: '1px solid #e2e8f0',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  backgroundColor: '#fee2e2',
                  color: '#b91c1c',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Trash2 size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                  Xác nhận xóa nhà cung cấp
                </h3>
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                  Kiểm soát an toàn dữ liệu xuất nhập kho
                </span>
              </div>
            </div>

            <p style={{ fontSize: '0.875rem', color: '#334155', lineHeight: '1.5', margin: '0 0 16px 0' }}>
              Bạn có chắc chắn muốn xóa hồ sơ đối tác{' '}
              <strong>[{deleteConfirmSup.code}] {deleteConfirmSup.name}</strong>?
              <br />
              <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', marginTop: 6 }}>
                * Lưu ý: Nếu nhà cung cấp đã có lịch sử lô hàng nhập kho, hệ thống sẽ tự động chuyển sang trạng thái <strong>"Tạm ngưng hợp tác"</strong> để bảo toàn lịch sử truy xuất nguồn gốc (Traceability).
              </span>
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeleteConfirmSup(null)}
                style={{
                  padding: '8px 14px',
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#475569',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                }}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteConfirm}
                style={{
                  padding: '8px 16px',
                  borderRadius: 6,
                  border: 'none',
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {isDeleting ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" /> Đang xử lý...
                  </>
                ) : (
                  <>
                    <Trash2 size={15} /> Xác nhận xóa
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Styles
const kpiCardStyle: React.CSSProperties = {
  backgroundColor: '#ffffff',
  borderRadius: 8,
  padding: '16px',
  border: '1px solid #e2e8f0',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.03)',
};

const kpiIconStyle = (bg: string, color: string): React.CSSProperties => ({
  width: 32,
  height: 32,
  borderRadius: 6,
  backgroundColor: bg,
  color: color,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
});

const selectControlStyle: React.CSSProperties = {
  padding: '7px 10px',
  borderRadius: 6,
  border: '1px solid #cbd5e1',
  fontSize: '0.825rem',
  color: '#0f172a',
  backgroundColor: '#ffffff',
  outline: 'none',
  cursor: 'pointer',
};

const actionButtonStyle: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 5,
  border: '1px solid #e2e8f0',
  backgroundColor: '#ffffff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  padding: 0,
};

const formLabelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.8rem',
  fontWeight: 600,
  color: '#334155',
  marginBottom: 4,
};

const formInputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  borderRadius: 6,
  border: '1px solid #cbd5e1',
  fontSize: '0.85rem',
  color: '#0f172a',
  backgroundColor: '#ffffff',
  outline: 'none',
  boxSizing: 'border-box',
};

export default SupplierManagement;
