import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Users as UsersIcon,
  UserPlus,
  Search,
  Filter,
  CheckCircle2,
  Trash2,
  Shield,
  Lock,
  Unlock,
  KeyRound,
  ChevronDown,
  AlertTriangle,
  RefreshCw,
  Edit,
  Eye,
  Building2,
  Truck,
  Package,
  Layers,
  MapPin,
  Phone,
  Mail,
  Calendar,
  Clock,
  X,
  Copy,
  Check,
  Briefcase,
  Star,
  Award,
} from 'lucide-react';
import { useAuth, ROLE_LABELS, ROLE_COLORS } from '@/features/auth';
import type { UserRole } from '@/features/auth';

const API_BASE = 'http://localhost:3012';

export interface ComprehensiveUser {
  id: string;
  code?: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  warehouseCode?: string;
  assignedZone?: string;
  shift?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE' | string;
  department?: string;
  tasksCompleted?: number;
  rating?: number;
  gender?: string;
  dob?: string;
  lockedAt?: string | null;
  tier?: string;
  points?: number;
  licensePlate?: string;
  vehicleType?: string;
  currentTemp?: number;
  targetTempMin?: number;
  targetTempMax?: number;
  companyName?: string;
  taxCode?: string;
  b2bType?: string;
  creditLimit?: number;
  debtBalance?: number;
  discountRate?: number;
  billingAddress?: string;
  createdAt: string;
}

const WAREHOUSE_OPTIONS = [
  { code: 'ALL', name: 'Tất Cả Các Kho' },
  { code: 'WH-006', name: 'WH-006 - Tổng Kho Gò Vấp (350 Quang Trung)' },
  { code: 'WH-001', name: 'WH-001 - Kho Bình Thạnh (123 Lê Quang Định)' },
  { code: 'WH-002', name: 'WH-002 - Kho Tân Bình (45 Cộng Hòa)' },
  { code: 'WH-003', name: 'WH-003 - Kho Lạnh Cát Lái (Cụm CN Cát Lái)' },
  { code: 'WH-004', name: 'WH-004 - Kho Trung Chuyển Thủ Đức' },
  { code: 'WH-005', name: 'WH-005 - Kho Phân Phối Long An' },
  { code: 'TOAN_HE_THONG', name: 'TOAN_HE_THONG - Toàn Bộ Hệ Thống (HQ)' },
];

const SHIFT_OPTIONS = [
  { value: 'HANH_CHINH', label: 'Hành chính (08:00 - 17:00)' },
  { value: 'CA_SANG', label: 'Ca Sáng (06:00 - 14:00)' },
  { value: 'CA_CHIEU', label: 'Ca Chiều (14:00 - 22:00)' },
  { value: 'CA_DEM', label: 'Ca Đêm (22:00 - 06:00)' },
];

const Users: React.FC = () => {
  const { token, user: currentAuthUser } = useAuth();
  const [users, setUsers] = useState<ComprehensiveUser[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState('ALL');
  const [selectedWarehouse, setSelectedWarehouse] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  // Modals & Panels
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<ComprehensiveUser | null>(null);
  const [viewingUser, setViewingUser] = useState<ComprehensiveUser | null>(null);
  const [resetPasswordModal, setResetPasswordModal] = useState<{
    user: ComprehensiveUser;
    mode: 'CUSTOM' | 'RANDOM';
    customPassword: string;
    generatedResult: string | null;
  } | null>(null);

  // Notifications
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedText, setCopiedText] = useState(false);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3500);
  };

  const getActiveToken = useCallback(() => {
    return token || (typeof window !== 'undefined' ? localStorage.getItem('auth-token') : null);
  }, [token]);

  const getHeaders = useCallback(() => {
    const activeToken = getActiveToken();
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (activeToken) h['Authorization'] = `Bearer ${activeToken}`;
    return h;
  }, [getActiveToken]);

  // Fetch Users from user-service
  const fetchUsers = useCallback(async () => {
    const activeToken = getActiveToken();
    if (!activeToken) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedRole !== 'ALL') params.append('role', selectedRole);
      if (selectedWarehouse !== 'ALL') params.append('warehouseCode', selectedWarehouse);
      if (selectedStatus !== 'ALL') params.append('status', selectedStatus);
      if (search.trim()) params.append('search', search.trim());

      const url = `${API_BASE}/users${params.toString() ? `?${params.toString()}` : ''}`;
      const res = await fetch(url, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setUsers(Array.isArray(data) ? data : []);
      } else {
        showToast('Không thể tải danh sách người dùng', 'error');
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
      showToast('Lỗi kết nối tới máy chủ', 'error');
    } finally {
      setLoading(false);
    }
  }, [getActiveToken, getHeaders, selectedRole, selectedWarehouse, selectedStatus, search]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Action: Toggle Lock
  const handleToggleLock = async (u: ComprehensiveUser) => {
    const actionName = u.status === 'INACTIVE' || u.lockedAt ? 'mở khóa' : 'khóa';
    if (!confirm(`Bạn có chắc muốn ${actionName} tài khoản "${u.name}" (${u.code || u.email})?`)) return;

    try {
      const res = await fetch(`${API_BASE}/users/${u.id}/toggle-lock`, {
        method: 'PATCH',
        headers: getHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        showToast(data.message || `Đã ${actionName} tài khoản thành công!`);
        fetchUsers();
      } else {
        showToast(`Không thể ${actionName} tài khoản`, 'error');
      }
    } catch (err) {
      showToast('Lỗi khi thao tác khóa tài khoản', 'error');
    }
  };

  // Action: Delete User
  const handleDeleteUser = async (u: ComprehensiveUser) => {
    if (!confirm(`CẢNH BÁO: Bạn có chắc chắn muốn xóa vĩnh viễn tài khoản "${u.name}" (${u.email})? Thao tác này không thể hoàn tác.`)) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/users/${u.id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      if (res.ok) {
        showToast(`Đã xóa tài khoản ${u.name} thành công!`);
        fetchUsers();
      } else {
        showToast('Không thể xóa tài khoản này', 'error');
      }
    } catch (err) {
      showToast('Lỗi kết nối máy chủ khi xóa người dùng', 'error');
    }
  };

  // Action: Reset Password Execution
  const handleExecuteResetPassword = async () => {
    if (!resetPasswordModal) return;
    const { user, mode, customPassword } = resetPasswordModal;

    if (mode === 'CUSTOM' && (!customPassword || customPassword.length < 6)) {
      showToast('Mật khẩu tự chọn phải có ít nhất 6 ký tự', 'error');
      return;
    }

    try {
      const body = mode === 'CUSTOM' ? { password: customPassword } : {};
      const res = await fetch(`${API_BASE}/users/${user.id}/reset-password`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data = await res.json();
        setResetPasswordModal({
          ...resetPasswordModal,
          generatedResult: data.newPassword,
        });
        showToast('Đặt lại mật khẩu thành công!');
      } else {
        showToast('Lỗi khi đặt lại mật khẩu', 'error');
      }
    } catch (err) {
      showToast('Không thể kết nối máy chủ', 'error');
    }
  };

  // Copy to clipboard
  const handleCopyPassword = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  // Filter & KPI Stats Calculations
  const stats = useMemo(() => {
    const total = users.length;
    const adminsAndManagers = users.filter(u => u.role === 'ADMIN' || u.role === 'WAREHOUSE_MANAGER').length;
    const warehouseStaff = users.filter(u => u.role === 'WAREHOUSE_STAFF').length;
    const drivers = users.filter(u => u.role === 'DRIVER').length;
    const salesAndCustomers = users.filter(u => u.role === 'SALES_STAFF' || u.role === 'CUSTOMER').length;
    const activeCount = users.filter(u => u.status === 'ACTIVE' && !u.lockedAt).length;
    const lockedCount = users.filter(u => u.status === 'INACTIVE' || !!u.lockedAt).length;

    return { total, adminsAndManagers, warehouseStaff, drivers, salesAndCustomers, activeCount, lockedCount };
  }, [users]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingBottom: '2rem' }}>
      {/* Toast Notification */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: 20,
            right: 20,
            zIndex: 9999,
            backgroundColor: toast.type === 'success' ? '#0f766e' : '#dc2626',
            color: '#ffffff',
            padding: '10px 16px',
            borderRadius: 6,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: '0.85rem',
            fontWeight: 600,
          }}
        >
          {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          <span>{toast.text}</span>
        </div>
      )}

      {/* HEADER SECTION */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <UsersIcon size={22} color="#0f766e" />
            Quản Trị Người Dùng & Phân Quyền Toàn Hệ Thống
          </h2>
          <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0, marginTop: 4 }}>
            Quản lý tài khoản toàn diện cho mọi vai trò (Admin, Quản lý kho, Nhân viên kho, Kinh doanh, Tài xế, Khách hàng B2B)
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={fetchUsers}
            style={{
              padding: '8px 12px',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#475569',
              fontSize: '0.825rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <RefreshCw size={14} /> Làm Mới
          </button>
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            style={{
              padding: '8px 16px',
              borderRadius: 6,
              border: 'none',
              backgroundColor: '#0f766e',
              color: '#ffffff',
              fontSize: '0.825rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            }}
          >
            <UserPlus size={15} /> + Thêm Người Dùng Mới
          </button>
        </div>
      </div>

      {/* KPI STATS CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
        <div style={kpiCardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#64748b', fontSize: '0.75rem', fontWeight: 600 }}>
            <span>Tổng Người Dùng</span>
            <UsersIcon size={16} color="#0f766e" />
          </div>
          <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0f172a', marginTop: 4 }}>
            {stats.total}
          </div>
          <div style={{ fontSize: '0.7rem', color: '#166534', marginTop: 2 }}>
            {stats.activeCount} đang hoạt động
          </div>
        </div>

        <div style={kpiCardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#64748b', fontSize: '0.75rem', fontWeight: 600 }}>
            <span>Ban Quản Trị & Quản Lý</span>
            <Shield size={16} color="#0284c7" />
          </div>
          <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0f172a', marginTop: 4 }}>
            {stats.adminsAndManagers}
          </div>
          <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: 2 }}>
            Admin & Quản lý 6 kho
          </div>
        </div>

        <div style={kpiCardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#64748b', fontSize: '0.75rem', fontWeight: 600 }}>
            <span>Nhân Viên Trực Kho</span>
            <Package size={16} color="#166534" />
          </div>
          <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0f172a', marginTop: 4 }}>
            {stats.warehouseStaff}
          </div>
          <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: 2 }}>
            Soạn hàng, PTL & xếp kệ
          </div>
        </div>

        <div style={kpiCardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#64748b', fontSize: '0.75rem', fontWeight: 600 }}>
            <span>Đội Xe Vận Chuyển</span>
            <Truck size={16} color="#7c3aed" />
          </div>
          <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0f172a', marginTop: 4 }}>
            {stats.drivers}
          </div>
          <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: 2 }}>
            Xe tải lạnh & giao hàng
          </div>
        </div>

        <div style={kpiCardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#64748b', fontSize: '0.75rem', fontWeight: 600 }}>
            <span>Khách Hàng & Doanh Nghiệp</span>
            <Building2 size={16} color="#d97706" />
          </div>
          <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0f172a', marginTop: 4 }}>
            {stats.salesAndCustomers}
          </div>
          <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: 2 }}>
            8 Doanh nghiệp B2B + Khách lẻ
          </div>
        </div>

        <div style={kpiCardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#64748b', fontSize: '0.75rem', fontWeight: 600 }}>
            <span>Tài Khoản Bị Khóa</span>
            <Lock size={16} color="#dc2626" />
          </div>
          <div style={{ fontSize: '1.35rem', fontWeight: 700, color: stats.lockedCount > 0 ? '#dc2626' : '#166534', marginTop: 4 }}>
            {stats.lockedCount}
          </div>
          <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: 2 }}>
            {stats.lockedCount === 0 ? 'Toàn bộ an toàn' : 'Cần kiểm tra quyền'}
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: 8,
          padding: '12px 14px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          display: 'flex',
          gap: 10,
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
          <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Tìm theo tên, email, SĐT, mã nhân viên, công ty..."
            style={{
              width: '100%',
              padding: '7px 10px 7px 32px',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              fontSize: '0.825rem',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Role Filter */}
        <select
          value={selectedRole}
          onChange={e => setSelectedRole(e.target.value)}
          style={filterSelectStyle}
        >
          <option value="ALL">Tất Cả Vai Trò</option>
          <option value="ADMIN">Quản Trị Viên (Admin)</option>
          <option value="WAREHOUSE_MANAGER">Quản Lý Kho</option>
          <option value="WAREHOUSE_STAFF">Nhân Viên Trực Kho</option>
          <option value="SALES_STAFF">Nhân Viên Kinh Doanh (Sales)</option>
          <option value="DRIVER">Tài Xế Giao Hàng</option>
          <option value="CUSTOMER">Khách Hàng (B2B & Khách lẻ)</option>
        </select>

        {/* Warehouse Filter */}
        <select
          value={selectedWarehouse}
          onChange={e => setSelectedWarehouse(e.target.value)}
          style={filterSelectStyle}
        >
          {WAREHOUSE_OPTIONS.map(w => (
            <option key={w.code} value={w.code}>{w.name}</option>
          ))}
        </select>

        {/* Status Filter */}
        <select
          value={selectedStatus}
          onChange={e => setSelectedStatus(e.target.value)}
          style={filterSelectStyle}
        >
          <option value="ALL">Tất Cả Trạng Thái</option>
          <option value="ACTIVE">Đang Hoạt Động (Active)</option>
          <option value="ON_LEAVE">Tạm Nghỉ Phép (On Leave)</option>
          <option value="INACTIVE">Ngừng Hoạt Động (Inactive)</option>
          <option value="LOCKED">Đã Bị Khóa (Locked)</option>
        </select>
      </div>

      {/* USERS DATA TABLE */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: 8,
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          overflow: 'hidden',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.825rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 600 }}>
                <th style={{ padding: '10px 14px' }}>Mã & Họ Tên</th>
                <th style={{ padding: '10px 14px' }}>Email & Liên Hệ</th>
                <th style={{ padding: '10px 14px' }}>Vai Trò Hệ Thống</th>
                <th style={{ padding: '10px 14px' }}>Đơn Vị & Kho Trực Thuộc</th>
                <th style={{ padding: '10px 14px' }}>Ca Làm Việc & Phòng Ban</th>
                <th style={{ padding: '10px 14px', textAlign: 'center' }}>Trạng Thái</th>
                <th style={{ padding: '10px 14px', textAlign: 'center' }}>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '2.5rem', color: '#94a3b8' }}>
                    Đang tải danh sách người dùng...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '2.5rem', color: '#94a3b8' }}>
                    Không tìm thấy người dùng nào phù hợp với bộ lọc tìm kiếm
                  </td>
                </tr>
              ) : (
                users.map(u => {
                  const isLocked = u.status === 'INACTIVE' || !!u.lockedAt;
                  const roleColor = ROLE_COLORS[u.role] || '#475569';
                  const roleLabel = ROLE_LABELS[u.role] || u.role;

                  return (
                    <tr
                      key={u.id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        transition: 'background-color 150ms',
                        backgroundColor: isLocked ? '#fef2f208' : 'transparent',
                      }}
                    >
                      {/* Code & Name */}
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: '50%',
                              backgroundColor: `${roleColor}15`,
                              color: roleColor,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.8rem',
                              fontWeight: 700,
                              flexShrink: 0,
                            }}
                          >
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: '#0f172a' }}>
                              {u.name}
                            </div>
                            <div style={{ fontSize: '0.725rem', fontFamily: 'monospace', color: '#0f766e', fontWeight: 600 }}>
                              {u.code || 'CHƯA_CÓ_MÃ'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Email & Phone */}
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ color: u.email ? '#334155' : '#94a3b8', fontStyle: u.email ? 'normal' : 'italic' }}>
                          {u.email || (u.role === 'CUSTOMER' ? '(Chỉ dùng SĐT)' : 'Chưa có email')}
                        </div>
                        <div style={{ fontSize: '0.725rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                          <Phone size={11} /> {u.phone || 'Chưa cập nhật'}
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td style={{ padding: '10px 14px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            padding: '3px 8px',
                            borderRadius: 4,
                            fontSize: '0.725rem',
                            fontWeight: 600,
                            backgroundColor: `${roleColor}12`,
                            color: roleColor,
                            border: `1px solid ${roleColor}30`,
                          }}
                        >
                          <Shield size={12} />
                          {roleLabel}
                        </span>
                      </td>

                      {/* Warehouse & Zone */}
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>
                          {u.warehouseCode === 'TOAN_HE_THONG' ? 'Toàn Hệ Thống (HQ)' : u.warehouseCode || 'Chưa phân kho'}
                        </div>
                        <div style={{ fontSize: '0.725rem', color: '#64748b', marginTop: 2 }}>
                          {u.assignedZone || (u.companyName ? `ĐV: ${u.companyName}` : 'Khu vực chung')}
                        </div>
                      </td>

                      {/* Shift & Department */}
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ color: '#334155' }}>
                          {u.shift === 'CA_SANG' && 'Ca Sáng (06h - 14h)'}
                          {u.shift === 'CA_CHIEU' && 'Ca Chiều (14h - 22h)'}
                          {u.shift === 'CA_DEM' && 'Ca Đêm (22h - 06h)'}
                          {(!u.shift || u.shift === 'HANH_CHINH') && 'Hành Chính (08h - 17h)'}
                        </div>
                        <div style={{ fontSize: '0.725rem', color: '#64748b', marginTop: 2 }}>
                          {u.department || 'Vận hành kho C.T Mart'}
                        </div>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        {isLocked ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              padding: '2px 8px',
                              borderRadius: 4,
                              fontSize: '0.7rem',
                              fontWeight: 600,
                              backgroundColor: '#fef2f2',
                              color: '#991b1b',
                              border: '1px solid #fecaca',
                            }}
                          >
                            <Lock size={11} /> Bị Khóa
                          </span>
                        ) : u.status === 'ON_LEAVE' ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              padding: '2px 8px',
                              borderRadius: 4,
                              fontSize: '0.7rem',
                              fontWeight: 600,
                              backgroundColor: '#fffbeb',
                              color: '#92400e',
                              border: '1px solid #fde68a',
                            }}
                          >
                            <Clock size={11} /> Nghỉ Phép
                          </span>
                        ) : (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              padding: '2px 8px',
                              borderRadius: 4,
                              fontSize: '0.7rem',
                              fontWeight: 600,
                              backgroundColor: '#f0fdf4',
                              color: '#166534',
                              border: '1px solid #bbf7d0',
                            }}
                          >
                            <CheckCircle2 size={11} /> Hoạt Động
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                          <button
                            type="button"
                            onClick={() => setViewingUser(u)}
                            title="Xem chi tiết hồ sơ"
                            style={tableActionBtnStyle}
                          >
                            <Eye size={13} color="#0f766e" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingUser(u)}
                            title="Chỉnh sửa thông tin"
                            style={tableActionBtnStyle}
                          >
                            <Edit size={13} color="#0284c7" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setResetPasswordModal({
                                user: u,
                                mode: 'RANDOM',
                                customPassword: '',
                                generatedResult: null,
                              })
                            }
                            title="Đặt lại mật khẩu"
                            style={tableActionBtnStyle}
                          >
                            <KeyRound size={13} color="#d97706" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleLock(u)}
                            title={isLocked ? 'Mở khóa tài khoản' : 'Khóa tài khoản'}
                            style={{ ...tableActionBtnStyle, color: isLocked ? '#166534' : '#d97706' }}
                          >
                            {isLocked ? <Unlock size={13} /> : <Lock size={13} />}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(u)}
                            title="Xóa tài khoản"
                            style={{ ...tableActionBtnStyle, color: '#dc2626' }}
                          >
                            <Trash2 size={13} />
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

      {/* ─────────────────────────────────────────────────────────────
          MODAL 1: TẠO MỚI NGƯỜI DÙNG (CREATE USER MODAL)
      ───────────────────────────────────────────────────────────── */}
      {isCreateModalOpen && (
        <CreateUserModal
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={() => {
            setIsCreateModalOpen(false);
            showToast('Đã tạo tài khoản người dùng mới thành công!');
            fetchUsers();
          }}
          getHeaders={getHeaders}
          showToast={showToast}
        />
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL 2: CHỈNH SỬA NGƯỜI DÙNG (EDIT USER MODAL)
      ───────────────────────────────────────────────────────────── */}
      {editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSuccess={() => {
            setEditingUser(null);
            showToast('Đã cập nhật thông tin người dùng thành công!');
            fetchUsers();
          }}
          getHeaders={getHeaders}
          showToast={showToast}
        />
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL 3: XEM CHI TIẾT HỒ SƠ NGƯỜI DÙNG (VIEW PROFILE MODAL)
      ───────────────────────────────────────────────────────────── */}
      {viewingUser && (
        <UserDetailModal
          user={viewingUser}
          onClose={() => setViewingUser(null)}
          onEdit={() => {
            const u = viewingUser;
            setViewingUser(null);
            setEditingUser(u);
          }}
        />
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL 4: RESET MẬT KHẨU (PASSWORD RESET MODAL)
      ───────────────────────────────────────────────────────────── */}
      {resetPasswordModal && (
        <div
          onClick={() => setResetPasswordModal(null)}
          style={modalBackdropStyle}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ ...modalContainerStyle, width: 440 }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                <KeyRound size={18} color="#0f766e" /> Đặt Lại Mật Khẩu
              </h3>
              <button
                type="button"
                onClick={() => setResetPasswordModal(null)}
                style={closeBtnStyle}
              >
                <X size={16} />
              </button>
            </div>

            <p style={{ fontSize: '0.8rem', color: '#475569', margin: 0, marginBottom: 12 }}>
              Đặt lại mật khẩu truy cập cho tài khoản: <strong>{resetPasswordModal.user.name}</strong> ({resetPasswordModal.user.email})
            </p>

            {!resetPasswordModal.generatedResult ? (
              <div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                  <button
                    type="button"
                    onClick={() => setResetPasswordModal({ ...resetPasswordModal, mode: 'RANDOM' })}
                    style={{
                      flex: 1,
                      padding: '8px',
                      borderRadius: 6,
                      fontSize: '0.775rem',
                      fontWeight: 600,
                      border: resetPasswordModal.mode === 'RANDOM' ? '1px solid #0f766e' : '1px solid #cbd5e1',
                      backgroundColor: resetPasswordModal.mode === 'RANDOM' ? '#f0fdf4' : '#ffffff',
                      color: resetPasswordModal.mode === 'RANDOM' ? '#0f766e' : '#475569',
                      cursor: 'pointer',
                    }}
                  >
                    Mật Khẩu Ngẫu Nhiên
                  </button>
                  <button
                    type="button"
                    onClick={() => setResetPasswordModal({ ...resetPasswordModal, mode: 'CUSTOM' })}
                    style={{
                      flex: 1,
                      padding: '8px',
                      borderRadius: 6,
                      fontSize: '0.775rem',
                      fontWeight: 600,
                      border: resetPasswordModal.mode === 'CUSTOM' ? '1px solid #0f766e' : '1px solid #cbd5e1',
                      backgroundColor: resetPasswordModal.mode === 'CUSTOM' ? '#f0fdf4' : '#ffffff',
                      color: resetPasswordModal.mode === 'CUSTOM' ? '#0f766e' : '#475569',
                      cursor: 'pointer',
                    }}
                  >
                    Admin Tự Nhập Mật Khẩu
                  </button>
                </div>

                {resetPasswordModal.mode === 'CUSTOM' && (
                  <div style={{ marginBottom: 14 }}>
                    <label style={modalLabelStyle}>Mật khẩu mới (Tối thiểu 6 ký tự) *</label>
                    <input
                      type="text"
                      value={resetPasswordModal.customPassword}
                      onChange={e => setResetPasswordModal({ ...resetPasswordModal, customPassword: e.target.value })}
                      placeholder="Nhập mật khẩu mới..."
                      style={modalInputStyle}
                    />
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                  <button
                    type="button"
                    onClick={() => setResetPasswordModal(null)}
                    style={modalSecondaryBtnStyle}
                  >
                    Hủy Bỏ
                  </button>
                  <button
                    type="button"
                    onClick={handleExecuteResetPassword}
                    style={modalPrimaryBtnStyle}
                  >
                    Xác Nhận Đổi Mật Khẩu
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div
                  style={{
                    backgroundColor: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    borderRadius: 6,
                    padding: '12px',
                    textAlign: 'center',
                    marginBottom: 12,
                  }}
                >
                  <div style={{ fontSize: '0.75rem', color: '#166534', fontWeight: 600 }}>
                    Mật khẩu mới đã được cập nhật thành công:
                  </div>
                  <div
                    style={{
                      fontSize: '1.25rem',
                      fontFamily: 'monospace',
                      fontWeight: 700,
                      color: '#0f766e',
                      letterSpacing: '0.1em',
                      marginTop: 6,
                      userSelect: 'all',
                    }}
                  >
                    {resetPasswordModal.generatedResult}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => handleCopyPassword(resetPasswordModal.generatedResult!)}
                    style={{ ...modalSecondaryBtnStyle, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                  >
                    {copiedText ? <Check size={14} color="#166534" /> : <Copy size={14} />}
                    {copiedText ? 'Đã sao chép!' : 'Sao chép mật khẩu'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setResetPasswordModal(null)}
                    style={{ ...modalPrimaryBtnStyle, flex: 1 }}
                  >
                    Hoàn Tất & Đóng
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// SUB-COMPONENT: CREATE USER MODAL
// ─────────────────────────────────────────────────────────────
const CreateUserModal: React.FC<{
  onClose: () => void;
  onSuccess: () => void;
  getHeaders: () => Record<string, string>;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}> = ({ onClose, onSuccess, getHeaders, showToast }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('password123');
  const [role, setRole] = useState<UserRole>('WAREHOUSE_STAFF');
  const [warehouseCode, setWarehouseCode] = useState('WH-006');
  const [assignedZone, setAssignedZone] = useState('Khu Khô C & Soạn Hàng');
  const [shift, setShift] = useState('HANH_CHINH');
  const [department, setDepartment] = useState('Bộ Phận Vận Hành & Soạn Hàng Kho');

  // Driver fields
  const [licensePlate, setLicensePlate] = useState('59C-999.88');
  const [vehicleType, setVehicleType] = useState('Xe tải lạnh 1.5 tấn (Carrier)');

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      showToast('Vui lòng nhập họ tên và email nhân sự', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const payload: any = {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        passwordHash: password,
        role,
        warehouseCode,
        assignedZone: assignedZone.trim(),
        shift,
        department: department.trim(),
        status: 'ACTIVE',
      };

      if (role === 'DRIVER') {
        payload.licensePlate = licensePlate.trim();
        payload.vehicleType = vehicleType.trim();
      }

      const res = await fetch(`${API_BASE}/users`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        onSuccess();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.message || 'Lỗi khi tạo người dùng', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Lỗi kết nối máy chủ', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div onClick={onClose} style={modalBackdropStyle}>
      <div onClick={e => e.stopPropagation()} style={{ ...modalContainerStyle, width: 620, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
            <UserPlus size={18} color="#0f766e" /> Thêm Mới Người Dùng Hệ Thống
          </h3>
          <button type="button" onClick={onClose} style={closeBtnStyle}><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 10 }}>
            <div>
              <label style={modalLabelStyle}>Họ và tên *</label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="VD: Nguyễn Văn An"
                style={modalInputStyle}
              />
            </div>
            <div>
              <label style={modalLabelStyle}>Vai trò hệ thống *</label>
              <select
                value={role}
                onChange={e => {
                  const newRole = e.target.value as UserRole;
                  setRole(newRole);
                  if (newRole === 'ADMIN') {
                    setWarehouseCode('TOAN_HE_THONG');
                    setDepartment('Ban Quản Trị Hệ Thống (HQ)');
                  } else if (newRole === 'SALES_STAFF') {
                    setWarehouseCode('TOAN_HE_THONG');
                    setDepartment('Bộ Phận Kinh Doanh & Chăm Sóc Khách Hàng B2B');
                  } else if (newRole === 'DRIVER') {
                    setDepartment('Đội Xe Vận Chuyển Giao Nhận Lạnh (Fleet)');
                  } else if (newRole === 'WAREHOUSE_STAFF') {
                    setDepartment('Bộ Phận Vận Hành & Soạn Hàng Kho');
                  } else if (newRole === 'WAREHOUSE_MANAGER') {
                    setDepartment('Ban Quản Lý Vận Hành Kho');
                  }
                }}
                style={modalInputStyle}
              >
                <option value="WAREHOUSE_STAFF">Nhân Viên Trực Kho (Staff)</option>
                <option value="WAREHOUSE_MANAGER">Quản Lý Kho (Manager)</option>
                <option value="SALES_STAFF">Nhân Viên Kinh Doanh (Sales)</option>
                <option value="DRIVER">Tài Xế Vận Chuyển (Driver)</option>
                <option value="ADMIN">Quản Trị Viên (Admin)</option>
              </select>
              <span style={{ fontSize: '0.675rem', color: '#64748b', display: 'block', marginTop: 2 }}>
                * Khách hàng tự đăng ký qua SĐT trên app hoặc qua hợp đồng B2B (không tạo thủ công).
              </span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 10 }}>
            <div>
              <label style={modalLabelStyle}>Email đăng nhập *</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="user@sfwms.vn"
                style={modalInputStyle}
              />
            </div>
            <div>
              <label style={modalLabelStyle}>Số điện thoại *</label>
              <input
                type="text"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="0903 xxx xxx"
                style={modalInputStyle}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={modalLabelStyle}>Kho trực thuộc</label>
              <select
                value={warehouseCode}
                onChange={e => setWarehouseCode(e.target.value)}
                style={modalInputStyle}
              >
                {WAREHOUSE_OPTIONS.filter(w => w.code !== 'ALL').map(w => (
                  <option key={w.code} value={w.code}>{w.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={modalLabelStyle}>Ca làm việc</label>
              <select
                value={shift}
                onChange={e => setShift(e.target.value)}
                style={modalInputStyle}
              >
                {SHIFT_OPTIONS.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={modalLabelStyle}>Khu vực phân công / Phụ trách</label>
              <input
                type="text"
                value={assignedZone}
                onChange={e => setAssignedZone(e.target.value)}
                placeholder="VD: Khu Mát A, Tuyến Quận 1..."
                style={modalInputStyle}
              />
            </div>
            <div>
              <label style={modalLabelStyle}>Phòng ban / Đơn vị</label>
              <input
                type="text"
                value={department}
                onChange={e => setDepartment(e.target.value)}
                placeholder="VD: Vận hành kho, Giao vận..."
                style={modalInputStyle}
              />
            </div>
          </div>

          {/* Conditional: Driver Fields */}
          {role === 'DRIVER' && (
            <div style={{ backgroundColor: '#f8fafc', padding: 10, borderRadius: 6, border: '1px solid #cbd5e1', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={modalLabelStyle}>Biển số xe tải lạnh *</label>
                <input
                  type="text"
                  value={licensePlate}
                  onChange={e => setLicensePlate(e.target.value)}
                  placeholder="59C-xxx.xx"
                  style={modalInputStyle}
                />
              </div>
              <div>
                <label style={modalLabelStyle}>Loại phương tiện / Tải trọng</label>
                <input
                  type="text"
                  value={vehicleType}
                  onChange={e => setVehicleType(e.target.value)}
                  placeholder="VD: Xe tải lạnh 1.5 tấn"
                  style={modalInputStyle}
                />
              </div>
            </div>
          )}


          <div>
            <label style={modalLabelStyle}>Mật khẩu khởi tạo</label>
            <input
              type="text"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={modalInputStyle}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
            <button type="button" onClick={onClose} style={modalSecondaryBtnStyle}>
              Hủy Bỏ
            </button>
            <button type="submit" disabled={submitting} style={modalPrimaryBtnStyle}>
              {submitting ? 'Đang lưu...' : 'Lưu Người Dùng'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// SUB-COMPONENT: EDIT USER MODAL
// ─────────────────────────────────────────────────────────────
const EditUserModal: React.FC<{
  user: ComprehensiveUser;
  onClose: () => void;
  onSuccess: () => void;
  getHeaders: () => Record<string, string>;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}> = ({ user, onClose, onSuccess, getHeaders, showToast }) => {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [phone, setPhone] = useState(user.phone || '');
  const [role, setRole] = useState<UserRole>(user.role);
  const [warehouseCode, setWarehouseCode] = useState(user.warehouseCode || 'WH-006');
  const [assignedZone, setAssignedZone] = useState(user.assignedZone || '');
  const [shift, setShift] = useState(user.shift || 'HANH_CHINH');
  const [status, setStatus] = useState(user.status || 'ACTIVE');
  const [department, setDepartment] = useState(user.department || '');

  // Driver fields
  const [licensePlate, setLicensePlate] = useState(user.licensePlate || '');
  const [vehicleType, setVehicleType] = useState(user.vehicleType || '');

  // B2B fields
  const [companyName, setCompanyName] = useState(user.companyName || '');
  const [taxCode, setTaxCode] = useState(user.taxCode || '');
  const [creditLimit, setCreditLimit] = useState(user.creditLimit || 50000000);
  const [discountRate, setDiscountRate] = useState(user.discountRate || 0);
  const [billingAddress, setBillingAddress] = useState(user.billingAddress || '');

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const isCustomer = role === 'CUSTOMER';
    const isB2B = isCustomer && (!!companyName.trim() || !!taxCode.trim() || !!user.companyName || !!user.taxCode);

    if (isCustomer && !isB2B) {
      if (!phone.trim()) {
        showToast('Khách hàng mua sắm cá nhân bắt buộc phải có số điện thoại', 'error');
        return;
      }
    } else if (isB2B) {
      if (!email?.trim()) {
        showToast('Khách hàng doanh nghiệp B2B bắt buộc phải có email ký kết', 'error');
        return;
      }
      if (!phone.trim()) {
        showToast('Khách hàng doanh nghiệp B2B bắt buộc phải có số điện thoại', 'error');
        return;
      }
    } else {
      if (!name.trim() || !email?.trim()) {
        showToast('Vui lòng nhập họ tên và email nhân sự', 'error');
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload: any = {
        name: name.trim(),
        email: email?.trim() || null,
        phone: phone.trim() || null,
        role,
        warehouseCode,
        assignedZone: assignedZone.trim(),
        shift,
        status,
        department: department.trim(),
      };

      if (role === 'DRIVER') {
        payload.licensePlate = licensePlate.trim();
        payload.vehicleType = vehicleType.trim();
      }

      if (role === 'CUSTOMER') {
        payload.companyName = companyName.trim() || (isB2B ? name.trim() : null);
        payload.taxCode = taxCode.trim() || null;
        payload.creditLimit = Number(creditLimit) || 50000000;
        payload.discountRate = Number(discountRate) || 0;
        payload.billingAddress = billingAddress.trim() || null;
      }

      const res = await fetch(`${API_BASE}/users/${user.id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        onSuccess();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.message || 'Lỗi khi cập nhật người dùng', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Lỗi kết nối máy chủ', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const isCustomer = role === 'CUSTOMER';
  const isB2B = isCustomer && (!!companyName.trim() || !!taxCode.trim() || !!user.companyName || !!user.taxCode);

  return (
    <div onClick={onClose} style={modalBackdropStyle}>
      <div onClick={e => e.stopPropagation()} style={{ ...modalContainerStyle, width: 620, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Edit size={18} color="#0f766e" /> Cập Nhật Hồ Sơ Người Dùng ({user.code || user.name})
          </h3>
          <button type="button" onClick={onClose} style={closeBtnStyle}><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 10 }}>
            <div>
              <label style={modalLabelStyle}>Họ và tên *</label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                style={modalInputStyle}
              />
            </div>
            <div>
              <label style={modalLabelStyle}>Vai trò hệ thống *</label>
              <select
                value={role}
                onChange={e => setRole(e.target.value as UserRole)}
                style={modalInputStyle}
              >
                <option value="ADMIN">Quản Trị Viên (Admin)</option>
                <option value="WAREHOUSE_MANAGER">Quản Lý Kho (Manager)</option>
                <option value="WAREHOUSE_STAFF">Nhân Viên Trực Kho (Staff)</option>
                <option value="SALES_STAFF">Nhân Viên Kinh Doanh (Sales)</option>
                <option value="DRIVER">Tài Xế Vận Chuyển (Driver)</option>
                <option value="CUSTOMER">Khách Hàng (Customer / B2B)</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 10 }}>
            <div>
              <label style={modalLabelStyle}>
                {isCustomer && !isB2B ? 'Email (Tùy chọn - không bắt buộc với khách lẻ)' : 'Email đăng nhập *'}
              </label>
              <input
                type="email"
                required={!isCustomer || isB2B}
                value={email || ''}
                onChange={e => setEmail(e.target.value)}
                placeholder={isCustomer && !isB2B ? 'Không bắt buộc đối với khách mua lẻ' : 'user@sfwms.vn'}
                style={modalInputStyle}
              />
              {isCustomer && !isB2B && (
                <span style={{ fontSize: '0.675rem', color: '#64748b', display: 'block', marginTop: 2 }}>
                  * Khách cá nhân chỉ cần số điện thoại. Email là tùy chọn.
                </span>
              )}
            </div>
            <div>
              <label style={modalLabelStyle}>Số điện thoại *</label>
              <input
                type="text"
                required
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="0903 xxx xxx"
                style={modalInputStyle}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={modalLabelStyle}>Kho trực thuộc</label>
              <select
                value={warehouseCode}
                onChange={e => setWarehouseCode(e.target.value)}
                style={modalInputStyle}
              >
                {WAREHOUSE_OPTIONS.filter(w => w.code !== 'ALL').map(w => (
                  <option key={w.code} value={w.code}>{w.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={modalLabelStyle}>Trạng thái hoạt động</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value)}
                style={modalInputStyle}
              >
                <option value="ACTIVE">Hoạt Động (Active)</option>
                <option value="ON_LEAVE">Tạm Nghỉ Phép (On Leave)</option>
                <option value="INACTIVE">Ngừng Hoạt Động (Inactive / Khóa)</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={modalLabelStyle}>Ca làm việc</label>
              <select
                value={shift}
                onChange={e => setShift(e.target.value)}
                style={modalInputStyle}
              >
                {SHIFT_OPTIONS.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={modalLabelStyle}>Phòng ban / Đơn vị</label>
              <input
                type="text"
                value={department}
                onChange={e => setDepartment(e.target.value)}
                style={modalInputStyle}
              />
            </div>
          </div>

          <div>
            <label style={modalLabelStyle}>Khu vực phân công / Phụ trách</label>
            <input
              type="text"
              value={assignedZone}
              onChange={e => setAssignedZone(e.target.value)}
              style={modalInputStyle}
            />
          </div>

          {/* Conditional: Driver Fields */}
          {role === 'DRIVER' && (
            <div style={{ backgroundColor: '#f8fafc', padding: 10, borderRadius: 6, border: '1px solid #cbd5e1', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={modalLabelStyle}>Biển số xe tải lạnh</label>
                <input
                  type="text"
                  value={licensePlate}
                  onChange={e => setLicensePlate(e.target.value)}
                  style={modalInputStyle}
                />
              </div>
              <div>
                <label style={modalLabelStyle}>Loại phương tiện</label>
                <input
                  type="text"
                  value={vehicleType}
                  onChange={e => setVehicleType(e.target.value)}
                  style={modalInputStyle}
                />
              </div>
            </div>
          )}

          {/* Conditional: B2B Customer Fields */}
          {role === 'CUSTOMER' && (
            <div style={{ backgroundColor: '#f8fafc', padding: 10, borderRadius: 6, border: '1px solid #cbd5e1', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 10 }}>
                <div>
                  <label style={modalLabelStyle}>Tên công ty pháp nhân</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={e => setCompanyName(e.target.value)}
                    style={modalInputStyle}
                  />
                </div>
                <div>
                  <label style={modalLabelStyle}>Mã số thuế (MST)</label>
                  <input
                    type="text"
                    value={taxCode}
                    onChange={e => setTaxCode(e.target.value)}
                    style={modalInputStyle}
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={modalLabelStyle}>Chiết khấu đối tác (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={discountRate}
                    onChange={e => setDiscountRate(Number(e.target.value) || 0)}
                    style={modalInputStyle}
                  />
                </div>
                <div>
                  <label style={modalLabelStyle}>Hạn mức công nợ (VNĐ)</label>
                  <input
                    type="number"
                    min="0"
                    step="10000000"
                    value={creditLimit}
                    onChange={e => setCreditLimit(Number(e.target.value) || 0)}
                    style={modalInputStyle}
                  />
                </div>
              </div>
              <div>
                <label style={modalLabelStyle}>Địa chỉ xuất hóa đơn</label>
                <input
                  type="text"
                  value={billingAddress}
                  onChange={e => setBillingAddress(e.target.value)}
                  style={modalInputStyle}
                />
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
            <button type="button" onClick={onClose} style={modalSecondaryBtnStyle}>
              Hủy Bỏ
            </button>
            <button type="submit" disabled={submitting} style={modalPrimaryBtnStyle}>
              {submitting ? 'Đang lưu...' : 'Lưu Thay Đổi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// SUB-COMPONENT: USER DETAIL MODAL
// ─────────────────────────────────────────────────────────────
const UserDetailModal: React.FC<{
  user: ComprehensiveUser;
  onClose: () => void;
  onEdit: () => void;
}> = ({ user, onClose, onEdit }) => {
  const roleColor = ROLE_COLORS[user.role] || '#475569';
  const roleLabel = ROLE_LABELS[user.role] || user.role;

  return (
    <div onClick={onClose} style={modalBackdropStyle}>
      <div onClick={e => e.stopPropagation()} style={{ ...modalContainerStyle, width: 560, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Briefcase size={18} color="#0f766e" /> Hồ Sơ Chi Tiết Người Dùng
          </h3>
          <button type="button" onClick={onClose} style={closeBtnStyle}><X size={16} /></button>
        </div>

        {/* User Card Header */}
        <div style={{ backgroundColor: '#f8fafc', borderRadius: 8, padding: 14, border: '1px solid #e2e8f0', display: 'flex', gap: 14, alignItems: 'center' }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              backgroundColor: `${roleColor}15`,
              color: roleColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.35rem',
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>{user.name}</span>
              <span
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  padding: '2px 6px',
                  borderRadius: 4,
                  backgroundColor: `${roleColor}15`,
                  color: roleColor,
                  border: `1px solid ${roleColor}30`,
                }}
              >
                {roleLabel}
              </span>
            </div>
            <div style={{ fontSize: '0.775rem', color: '#0f766e', fontWeight: 700, fontFamily: 'monospace', marginTop: 2 }}>
              Mã: {user.code || 'CHƯA_CÓ_MÃ'}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 2 }}>
              {user.email} | SĐT: {user.phone || 'Chưa cập nhật'}
            </div>
          </div>
        </div>

        {/* Info Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 14, fontSize: '0.8rem' }}>
          <div style={detailItemStyle}>
            <span style={{ color: '#64748b' }}>Kho Trực Thuộc:</span>
            <strong>{user.warehouseCode === 'TOAN_HE_THONG' ? 'Toàn Hệ Thống (HQ)' : user.warehouseCode || 'Chưa gán'}</strong>
          </div>
          <div style={detailItemStyle}>
            <span style={{ color: '#64748b' }}>Khu Vực Phân Công:</span>
            <strong>{user.assignedZone || 'Khu vực chung'}</strong>
          </div>
          <div style={detailItemStyle}>
            <span style={{ color: '#64748b' }}>Ca Làm Việc:</span>
            <strong>
              {user.shift === 'CA_SANG' && 'Ca Sáng (06h - 14h)'}
              {user.shift === 'CA_CHIEU' && 'Ca Chiều (14h - 22h)'}
              {user.shift === 'CA_DEM' && 'Ca Đêm (22h - 06h)'}
              {(!user.shift || user.shift === 'HANH_CHINH') && 'Hành Chính (08h - 17h)'}
            </strong>
          </div>
          <div style={detailItemStyle}>
            <span style={{ color: '#64748b' }}>Phòng Ban:</span>
            <strong>{user.department || 'Vận hành kho C.T Mart'}</strong>
          </div>
          <div style={detailItemStyle}>
            <span style={{ color: '#64748b' }}>Trạng Thái:</span>
            <strong style={{ color: user.status === 'ACTIVE' ? '#166534' : '#dc2626' }}>
              {user.status === 'ACTIVE' ? 'Đang Hoạt Động' : 'Tạm Nghỉ / Bị Khóa'}
            </strong>
          </div>
          <div style={detailItemStyle}>
            <span style={{ color: '#64748b' }}>Ngày Tham Gia:</span>
            <strong>{new Date(user.createdAt).toLocaleDateString('vi-VN')}</strong>
          </div>
        </div>

        {/* Driver Extra Stats */}
        {user.role === 'DRIVER' && (
          <div style={{ marginTop: 12, padding: 10, borderRadius: 6, backgroundColor: '#f5f3ff', border: '1px solid #ddd6fe', fontSize: '0.8rem' }}>
            <div style={{ fontWeight: 700, color: '#6d28d9', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Truck size={14} /> Hồ Sơ Phương Tiện Vận Chuyển Lạnh
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 4 }}>
              <div>Biển số xe: <strong>{user.licensePlate || '59C-xxx.xx'}</strong></div>
              <div>Loại xe: <strong>{user.vehicleType || 'Xe tải lạnh'}</strong></div>
              <div>Nhiệt độ hiện tại: <strong style={{ color: '#0f766e' }}>{user.currentTemp ?? 3.2}°C</strong></div>
              <div>Nhiệt độ mục tiêu: <strong>{user.targetTempMin ?? 0}°C ~ {user.targetTempMax ?? 4}°C</strong></div>
            </div>
          </div>
        )}

        {/* B2B Customer Extra Info */}
        {user.role === 'CUSTOMER' && (
          <div style={{ marginTop: 12, padding: 10, borderRadius: 6, backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', fontSize: '0.8rem' }}>
            <div style={{ fontWeight: 700, color: '#166534', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Building2 size={14} /> Thông Tin Doanh Nghiệp Đối Tác B2B
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 4 }}>
              <div>Tên pháp nhân: <strong>{user.companyName || user.name}</strong></div>
              <div>Mã số thuế: <strong>{user.taxCode || 'Chưa đăng ký'}</strong></div>
              <div>Chiết khấu thỏa thuận: <strong style={{ color: '#166534' }}>-{user.discountRate || 0}%</strong></div>
              <div>Hạn mức công nợ: <strong>{((user.creditLimit || 50000000) / 1000000).toFixed(0)} triệu VNĐ</strong></div>
              <div style={{ gridColumn: 'span 2' }}>Địa chỉ hóa đơn: <strong>{user.billingAddress || 'Hồ Chí Minh'}</strong></div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <button type="button" onClick={onClose} style={modalSecondaryBtnStyle}>
            Đóng
          </button>
          <button type="button" onClick={onEdit} style={modalPrimaryBtnStyle}>
            <Edit size={14} /> Chỉnh Sửa Người Dùng
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────
const kpiCardStyle: React.CSSProperties = {
  backgroundColor: '#ffffff',
  borderRadius: 8,
  padding: '12px 14px',
  border: '1px solid #e2e8f0',
  boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
};

const filterSelectStyle: React.CSSProperties = {
  padding: '7px 10px',
  borderRadius: 6,
  border: '1px solid #cbd5e1',
  fontSize: '0.825rem',
  color: '#0f172a',
  backgroundColor: '#ffffff',
  outline: 'none',
};

const tableActionBtnStyle: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 4,
  border: '1px solid #cbd5e1',
  backgroundColor: '#ffffff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  padding: 0,
};

const modalBackdropStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(15, 23, 42, 0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 9999,
  padding: '1rem',
};

const modalContainerStyle: React.CSSProperties = {
  backgroundColor: '#ffffff',
  borderRadius: 10,
  padding: '18px 20px',
  boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
  border: '1px solid #e2e8f0',
  boxSizing: 'border-box',
};

const modalLabelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.75rem',
  fontWeight: 600,
  color: '#334155',
  marginBottom: 3,
};

const modalInputStyle: React.CSSProperties = {
  width: '100%',
  padding: '7px 10px',
  borderRadius: 6,
  border: '1px solid #cbd5e1',
  fontSize: '0.825rem',
  color: '#0f172a',
  backgroundColor: '#ffffff',
  outline: 'none',
  boxSizing: 'border-box',
};

const modalPrimaryBtnStyle: React.CSSProperties = {
  padding: '8px 16px',
  borderRadius: 6,
  border: 'none',
  backgroundColor: '#0f766e',
  color: '#ffffff',
  fontSize: '0.825rem',
  fontWeight: 600,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: 6,
};

const modalSecondaryBtnStyle: React.CSSProperties = {
  padding: '8px 14px',
  borderRadius: 6,
  border: '1px solid #cbd5e1',
  backgroundColor: '#ffffff',
  color: '#475569',
  fontSize: '0.825rem',
  fontWeight: 600,
  cursor: 'pointer',
};

const closeBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#64748b',
  cursor: 'pointer',
  padding: 4,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const detailItemStyle: React.CSSProperties = {
  backgroundColor: '#ffffff',
  padding: '8px 10px',
  borderRadius: 6,
  border: '1px solid #e2e8f0',
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
};

export default Users;
