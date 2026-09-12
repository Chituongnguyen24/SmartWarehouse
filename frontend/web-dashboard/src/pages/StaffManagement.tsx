import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Users, UserPlus, Search, Edit, Trash2, 
  Clock, Phone, Mail, MapPin, Building, 
  Truck, Package, X, UserCheck, RefreshCw, Key, Shield, ShieldCheck,
  AlertCircle, CheckCircle2, Lock, Eye, EyeOff
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useWarehouse } from '../contexts/WarehouseContext';

const USER_API = 'http://localhost:3012';

export interface WarehouseStaffMember {
  id: string;
  code?: string;
  name: string;
  email: string;
  phone?: string;
  role: 'WAREHOUSE_STAFF' | 'WAREHOUSE_MANAGER' | 'DRIVER' | 'ADMIN' | 'SALES_STAFF';
  department?: string;
  warehouseCode?: string;
  assignedZone?: string;
  shift?: 'CA_SANG' | 'CA_CHIEU' | 'CA_DEM' | 'HANH_CHINH' | string;
  status: 'ACTIVE' | 'ON_LEAVE' | 'INACTIVE' | 'OFF_DUTY' | string;
  rating?: number;
  tasksCompleted?: number;
  createdAt?: string;
}

export const StaffManagement: React.FC = () => {
  const { user: currentUser, token } = useAuth();
  const { warehouses, selectedWarehouseCode, setSelectedWarehouseCode } = useWarehouse();

  const isAdmin = currentUser?.role === 'ADMIN';
  const isManager = currentUser?.role === 'WAREHOUSE_MANAGER';
  const myWarehouseCode = currentUser?.warehouseCode || 'WH-006';

  const [staffList, setStaffList] = useState<WarehouseStaffMember[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('ALL');
  const [selectedShiftFilter, setSelectedShiftFilter] = useState<string>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');
  const [activeWhFilter, setActiveWhFilter] = useState<string>(() => {
    return isManager ? myWarehouseCode : (selectedWarehouseCode || 'WH-006');
  });

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingStaff, setEditingStaff] = useState<WarehouseStaffMember | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'WAREHOUSE_STAFF' as WarehouseStaffMember['role'],
    warehouseCode: 'WH-006',
    department: 'Vận hành kho',
    assignedZone: 'Khu Khô C & Soạn hàng',
    shift: 'CA_SANG',
    status: 'ACTIVE',
  });

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Fetch Staff list from real user-service DB
  const fetchStaffData = useCallback(async () => {
    setIsLoading(true);
    try {
      let url = `${USER_API}/users/staff?`;
      if (activeWhFilter && activeWhFilter !== 'ALL') {
        url += `warehouseCode=${encodeURIComponent(activeWhFilter)}&`;
      }
      if (selectedRoleFilter && selectedRoleFilter !== 'ALL') {
        url += `role=${encodeURIComponent(selectedRoleFilter)}&`;
      }
      if (selectedStatusFilter && selectedStatusFilter !== 'ALL') {
        url += `status=${encodeURIComponent(selectedStatusFilter)}&`;
      }
      if (searchQuery.trim()) {
        url += `search=${encodeURIComponent(searchQuery.trim())}&`;
      }

      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (res.ok) {
        const data = await res.json();
        setStaffList(Array.isArray(data) ? data : []);
      } else {
        showToast('Không thể tải danh sách nhân viên từ máy chủ', 'error');
      }
    } catch (err: any) {
      console.error('Fetch staff error:', err);
      showToast(`Lỗi kết nối user-service: ${err.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [activeWhFilter, selectedRoleFilter, selectedStatusFilter, searchQuery, token]);

  useEffect(() => {
    fetchStaffData();
  }, [fetchStaffData]);

  // Sync with WarehouseContext
  useEffect(() => {
    if (isManager && myWarehouseCode) {
      setActiveWhFilter(myWarehouseCode);
    } else if (selectedWarehouseCode) {
      setActiveWhFilter(selectedWarehouseCode);
    }
  }, [isManager, myWarehouseCode, selectedWarehouseCode]);

  // Filtered staff list by shift and UI search
  const filteredStaff = useMemo(() => {
    return staffList.filter(s => {
      if (selectedShiftFilter !== 'ALL' && s.shift !== selectedShiftFilter) return false;
      return true;
    });
  }, [staffList, selectedShiftFilter]);

  // Staff KPI Summary
  const stats = useMemo(() => {
    const total = filteredStaff.length;
    const active = filteredStaff.filter(s => s.status === 'ACTIVE').length;
    const onLeave = filteredStaff.filter(s => s.status === 'ON_LEAVE').length;
    const totalTasks = filteredStaff.reduce((sum, s) => sum + (s.tasksCompleted || 0), 0);
    const avgRating = total > 0 
      ? (filteredStaff.reduce((sum, s) => sum + (s.rating || 5), 0) / total).toFixed(1) 
      : '5.0';

    return { total, active, onLeave, totalTasks, avgRating };
  }, [filteredStaff]);

  // Open Modal for Add
  const handleOpenAdd = () => {
    setEditingStaff(null);
    setShowPassword(false);
    setFormData({
      code: `NV-${activeWhFilter.replace('WH-', '') || 'GV'}${Math.floor(10 + Math.random() * 90)}`,
      name: '',
      email: '',
      phone: '',
      password: 'password123',
      role: 'WAREHOUSE_STAFF',
      warehouseCode: activeWhFilter !== 'ALL' ? activeWhFilter : (myWarehouseCode || 'WH-006'),
      department: 'Vận hành kho',
      assignedZone: 'Khu Khô C & Soạn hàng',
      shift: 'CA_SANG',
      status: 'ACTIVE',
    });
    setIsModalOpen(true);
  };

  // Open Modal for Edit
  const handleOpenEdit = (staff: WarehouseStaffMember) => {
    setEditingStaff(staff);
    setShowPassword(false);
    setFormData({
      code: staff.code || '',
      name: staff.name || '',
      email: staff.email || '',
      phone: staff.phone || '',
      password: '', // Blank means keep old password
      role: staff.role || 'WAREHOUSE_STAFF',
      warehouseCode: staff.warehouseCode || 'WH-006',
      department: staff.department || 'Vận hành kho',
      assignedZone: staff.assignedZone || 'Toàn bộ kho',
      shift: staff.shift || 'CA_SANG',
      status: staff.status || 'ACTIVE',
    });
    setIsModalOpen(true);
  };

  // Submit Add / Edit Form
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (editingStaff) {
        // UPDATE API
        const payload: any = {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          role: formData.role,
          warehouseCode: formData.warehouseCode,
          department: formData.department,
          assignedZone: formData.assignedZone,
          shift: formData.shift,
          status: formData.status,
          code: formData.code,
        };
        if (formData.password.trim()) {
          payload.password = formData.password.trim();
        }

        const res = await fetch(`${USER_API}/users/staff/${editingStaff.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          showToast(`✅ Đã cập nhật thông tin nhân viên ${formData.name}!`);
          setIsModalOpen(false);
          fetchStaffData();
        } else {
          const err = await res.json().catch(() => ({}));
          showToast(`Lỗi: ${err.message || 'Cập nhật thất bại'}`, 'error');
        }
      } else {
        // CREATE API
        const payload = {
          name: formData.name,
          email: formData.email,
          password: formData.password || 'password123',
          phone: formData.phone,
          role: formData.role,
          warehouseCode: formData.warehouseCode,
          department: formData.department,
          assignedZone: formData.assignedZone,
          shift: formData.shift,
          status: formData.status,
          code: formData.code,
        };

        const res = await fetch(`${USER_API}/users/staff`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          showToast(`🎉 Cấp tài khoản nhân viên ${formData.name} thành công! Mật khẩu mặc định: ${formData.password || 'password123'}`);
          setIsModalOpen(false);
          fetchStaffData();
        } else {
          const err = await res.json().catch(() => ({}));
          showToast(`Lỗi: ${err.message || 'Không thể tạo nhân viên'}`, 'error');
        }
      }
    } catch (err: any) {
      showToast(`Lỗi kết nối: ${err.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle Staff Status (Quick Action)
  const handleToggleStatus = async (staff: WarehouseStaffMember) => {
    const newStatus = staff.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      const res = await fetch(`${USER_API}/users/staff/${staff.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        showToast(`Đã chuyển trạng thái của ${staff.name} sang ${newStatus === 'ACTIVE' ? 'Hoạt động' : 'Tạm khóa'}`);
        fetchStaffData();
      }
    } catch (err: any) {
      showToast(`Lỗi đổi trạng thái: ${err.message}`, 'error');
    }
  };

  // Delete Staff Member
  const handleDeleteStaff = async (staff: WarehouseStaffMember) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa tài khoản nhân viên "${staff.name}" (${staff.email}) khỏi hệ thống?`)) {
      return;
    }

    try {
      const res = await fetch(`${USER_API}/users/staff/${staff.id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (res.ok) {
        showToast(`Đã xóa tài khoản nhân viên ${staff.name} thành công`);
        fetchStaffData();
      } else {
        showToast('Không thể xóa tài khoản này', 'error');
      }
    } catch (err: any) {
      showToast(`Lỗi xóa: ${err.message}`, 'error');
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'WAREHOUSE_MANAGER':
        return <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 800, backgroundColor: '#fef3c7', color: '#b45309', border: '1px solid #fde68a' }}>👑 Thủ Kho / Quản Lý</span>;
      case 'WAREHOUSE_STAFF':
        return <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 800, backgroundColor: '#ccfbf1', color: '#0f766e', border: '1px solid #99f6e4' }}>📦 Nhân Viên Trực Kho</span>;
      case 'DRIVER':
        return <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 800, backgroundColor: '#e0e7ff', color: '#4338ca', border: '1px solid #c7d2fe' }}>🚚 Tài Xế Giao Hàng</span>;
      case 'ADMIN':
        return <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 800, backgroundColor: '#fee2e2', color: '#b91c1c', border: '1px solid #fecaca' }}>⭐ Quản Trị Viên</span>;
      default:
        return <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 800, backgroundColor: '#f1f5f9', color: '#475569' }}>{role}</span>;
    }
  };

  const getShiftBadge = (shift?: string) => {
    switch (shift) {
      case 'CA_SANG':
        return <span style={{ fontSize: '11px', fontWeight: 700, color: '#0284c7' }}>☀️ Ca Sáng (06:00 - 14:00)</span>;
      case 'CA_CHIEU':
        return <span style={{ fontSize: '11px', fontWeight: 700, color: '#d97706' }}>⛅ Ca Chiều (14:00 - 22:00)</span>;
      case 'CA_DEM':
        return <span style={{ fontSize: '11px', fontWeight: 700, color: '#7c3aed' }}>🌙 Ca Đêm (22:00 - 06:00)</span>;
      default:
        return <span style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>🏢 Hành Chính (08:00 - 17:00)</span>;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '40px' }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: '24px',
            right: '24px',
            zIndex: 99999,
            backgroundColor: toastMessage.type === 'success' ? '#0f766e' : '#dc2626',
            color: '#ffffff',
            padding: '12px 20px',
            borderRadius: '12px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontWeight: 700,
            fontSize: '13px',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          {toastMessage.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '20px 24px', borderRadius: '18px', border: '1px solid #e2e8f0', flexWrap: 'wrap', gap: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'linear-gradient(135deg, #0f766e 0%, #115e59 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 8px 16px rgba(15, 118, 110, 0.25)' }}>
            <Users size={26} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, color: '#0f172a' }}>
              Quản Lý Nhân Viên Trực Kho & Cấp Tài Khoản
            </h2>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>
              Dữ liệu nhân sự thực tế từ cơ sở dữ liệu kho vận — Quản lý phân quyền và ca trực theo chi nhánh
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Warehouse Selector for Admin */}
          {isAdmin ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f8fafc', padding: '6px 12px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
              <Building size={16} color="#0f766e" />
              <select
                value={activeWhFilter}
                onChange={e => {
                  const code = e.target.value;
                  setActiveWhFilter(code);
                  setSelectedWarehouseCode(code);
                }}
                style={{ border: 'none', background: 'transparent', fontWeight: 800, fontSize: '0.85rem', color: '#0f172a', outline: 'none', cursor: 'pointer' }}
              >
                <option value="ALL">🏢 Tất cả kho hàng</option>
                {warehouses.map(w => (
                  <option key={w.code} value={w.code}>
                    📍 {w.name} ({w.code})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f0fdfa', padding: '8px 14px', borderRadius: '12px', border: '1px solid #99f6e4', color: '#0f766e', fontWeight: 800, fontSize: '0.85rem' }}>
              <Building size={16} />
              <span>Kho Trực Thuộc: {warehouses.find(w => w.code === myWarehouseCode)?.name || myWarehouseCode}</span>
            </div>
          )}

          <button
            onClick={() => fetchStaffData()}
            disabled={isLoading}
            style={{
              padding: '10px 14px',
              borderRadius: '12px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#f8fafc',
              color: '#0f172a',
              fontSize: '0.85rem',
              fontWeight: 800,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <RefreshCw size={15} style={{ animation: isLoading ? 'spin 1s linear infinite' : 'none' }} />
          </button>

          <button
            onClick={handleOpenAdd}
            style={{
              padding: '10px 18px',
              borderRadius: '12px',
              border: 'none',
              backgroundColor: '#0f766e',
              color: '#fff',
              fontSize: '0.85rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 14px rgba(15, 118, 110, 0.35)',
            }}
          >
            <UserPlus size={16} />
            <span>Cấp Tài Khoản Nhân Viên Mới</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
        <div style={{ background: '#fff', padding: '16px 20px', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0284c7' }}>
            <Users size={22} />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b' }}>TỔNG NHÂN SỰ TẠI KHO</div>
            <div style={{ fontSize: '20px', fontWeight: 900, color: '#0f172a' }}>{stats.total} nhân viên</div>
          </div>
        </div>

        <div style={{ background: '#fff', padding: '16px 20px', borderRadius: '16px', border: '1px solid #ccfbf1', display: 'flex', alignItems: 'center', gap: '14px', backgroundColor: '#f0fdfa' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#ccfbf1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0f766e' }}>
            <UserCheck size={22} />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#0f766e' }}>ĐANG TRONG CA TRỰC</div>
            <div style={{ fontSize: '20px', fontWeight: 900, color: '#0f766e' }}>{stats.active} nhân sự</div>
          </div>
        </div>

        <div style={{ background: '#fff', padding: '16px 20px', borderRadius: '16px', border: '1px solid #fde68a', display: 'flex', alignItems: 'center', gap: '14px', backgroundColor: '#fffbeb' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d97706' }}>
            <Clock size={22} />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#b45309' }}>NGHỈ PHÉP / TẠM VẮNG</div>
            <div style={{ fontSize: '20px', fontWeight: 900, color: '#b45309' }}>{stats.onLeave} nhân viên</div>
          </div>
        </div>

        <div style={{ background: '#fff', padding: '16px 20px', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#f3e8ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7c3aed' }}>
            <Package size={22} />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#6b21a8' }}>TÁC VỤ HOÀN TẤT</div>
            <div style={{ fontSize: '20px', fontWeight: 900, color: '#6b21a8' }}>{stats.totalTasks.toLocaleString()} đơn/lô</div>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px', background: '#fff', padding: '14px 20px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1 1 300px' }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: '380px' }}>
            <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} size={16} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Tìm theo Tên, Mã NV, Email, SĐT, Phân khu..."
              style={{
                width: '100%',
                padding: '9px 12px 9px 36px',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                fontSize: '0.85rem',
                fontWeight: 600,
                outline: 'none',
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px' }}>
          {/* Role Filter */}
          <select
            value={selectedRoleFilter}
            onChange={e => setSelectedRoleFilter(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontWeight: 700, fontSize: '0.85rem', background: '#f8fafc', outline: 'none', cursor: 'pointer' }}
          >
            <option value="ALL">Tất cả chức vụ</option>
            <option value="WAREHOUSE_STAFF">📦 Nhân viên trực kho</option>
            <option value="WAREHOUSE_MANAGER">👑 Thủ kho / Quản lý</option>
            <option value="DRIVER">🚚 Tài xế giao hàng</option>
            <option value="ADMIN">⭐ Quản trị viên</option>
          </select>

          {/* Shift Filter */}
          <select
            value={selectedShiftFilter}
            onChange={e => setSelectedShiftFilter(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontWeight: 700, fontSize: '0.85rem', background: '#f8fafc', outline: 'none', cursor: 'pointer' }}
          >
            <option value="ALL">Tất cả ca trực</option>
            <option value="CA_SANG">Ca Sáng (06:00 - 14:00)</option>
            <option value="CA_CHIEU">Ca Chiều (14:00 - 22:00)</option>
            <option value="CA_DEM">Ca Đêm (22:00 - 06:00)</option>
            <option value="HANH_CHINH">Hành chính (08:00 - 17:00)</option>
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatusFilter}
            onChange={e => setSelectedStatusFilter(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontWeight: 700, fontSize: '0.85rem', background: '#f8fafc', outline: 'none', cursor: 'pointer' }}
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="ACTIVE">🟢 Đang hoạt động</option>
            <option value="ON_LEAVE">🟡 Nghỉ phép</option>
            <option value="INACTIVE">🔴 Tạm khóa</option>
          </select>
        </div>
      </div>

      {/* Staff Table */}
      <div style={{ background: '#fff', borderRadius: '18px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 800, textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.5px' }}>
              <th style={{ padding: '14px 20px' }}>Mã NV & Họ Tên</th>
              <th style={{ padding: '14px 16px' }}>Chức Vụ & Quyền Hạn</th>
              <th style={{ padding: '14px 16px' }}>Kho Trực Thuộc</th>
              <th style={{ padding: '14px 16px' }}>Phân Khu / Phương Tiện</th>
              <th style={{ padding: '14px 16px' }}>Ca Trực</th>
              <th style={{ padding: '14px 16px' }}>Trạng Thái</th>
              <th style={{ padding: '14px 20px', textAlign: 'right' }}>Thao Tác</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
                  <RefreshCw size={28} style={{ animation: 'spin 1s linear infinite', color: '#0f766e', margin: '0 auto 10px' }} />
                  <div>Đang tải dữ liệu nhân sự từ máy chủ...</div>
                </td>
              </tr>
            ) : filteredStaff.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
                  <Users size={40} style={{ color: '#cbd5e1', margin: '0 auto 10px' }} />
                  <div style={{ fontWeight: 700, color: '#0f172a' }}>Không tìm thấy nhân viên nào</div>
                  <div style={{ fontSize: '12px', marginTop: '4px' }}>Thử thay đổi bộ lọc hoặc cấp tài khoản mới.</div>
                </td>
              </tr>
            ) : (
              filteredStaff.map((staff, idx) => {
                const whName = warehouses.find(w => w.code === staff.warehouseCode)?.name || staff.warehouseCode || 'Kho Tổng';
                const isActive = staff.status === 'ACTIVE';

                return (
                  <tr
                    key={staff.id}
                    style={{
                      borderBottom: idx === filteredStaff.length - 1 ? 'none' : '1px solid #f1f5f9',
                      backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fcfdfd',
                      transition: 'background-color 0.15s ease',
                    }}
                  >
                    {/* Name & Contact */}
                    <td style={{ padding: '14px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#f1f5f9', color: '#0f766e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '13px', border: '1px solid #e2e8f0' }}>
                          {staff.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '13px' }}>{staff.name}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px', fontSize: '11.5px', color: '#64748b' }}>
                            <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0f766e', background: '#f0fdfa', padding: '1px 5px', borderRadius: '4px' }}>
                              {staff.code || `NV-${staff.id.slice(0, 4)}`}
                            </span>
                            <span>{staff.email}</span>
                            {staff.phone && <span>• {staff.phone}</span>}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td style={{ padding: '14px 16px' }}>
                      {getRoleBadge(staff.role)}
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>{staff.department || 'Vận hành'}</div>
                    </td>

                    {/* Warehouse */}
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: 800, color: '#0f172a' }}>{staff.warehouseCode || 'Tất cả kho'}</div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>{whName}</div>
                    </td>

                    {/* Assigned Zone */}
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#f8fafc', padding: '3px 8px', borderRadius: '6px', border: '1px solid #e2e8f0', fontWeight: 700, color: '#334155', fontSize: '11.5px' }}>
                        <MapPin size={12} color="#0f766e" />
                        {staff.assignedZone || 'Toàn bộ kho'}
                      </span>
                    </td>

                    {/* Shift */}
                    <td style={{ padding: '14px 16px' }}>
                      {getShiftBadge(staff.shift)}
                    </td>

                    {/* Status */}
                    <td style={{ padding: '14px 16px' }}>
                      <span
                        onClick={() => handleToggleStatus(staff)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '3px 10px',
                          borderRadius: '20px',
                          fontSize: '11px',
                          fontWeight: 800,
                          cursor: 'pointer',
                          backgroundColor: isActive ? '#ecfdf5' : '#fee2e2',
                          color: isActive ? '#059669' : '#dc2626',
                          border: `1px solid ${isActive ? '#a7f3d0' : '#fecaca'}`,
                        }}
                        title="Bấm để bật/tắt trạng thái hoạt động"
                      >
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: isActive ? '#10b981' : '#ef4444' }} />
                        {isActive ? 'Hoạt động' : staff.status === 'ON_LEAVE' ? 'Nghỉ phép' : 'Tạm khóa'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                        <button
                          onClick={() => handleOpenEdit(staff)}
                          style={{
                            padding: '6px 10px',
                            borderRadius: '8px',
                            border: '1px solid #cbd5e1',
                            background: '#f8fafc',
                            color: '#334155',
                            cursor: 'pointer',
                            fontSize: '11.5px',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                          title="Sửa thông tin / Cấp lại mật khẩu"
                        >
                          <Edit size={13} />
                          <span>Sửa</span>
                        </button>

                        <button
                          onClick={() => handleDeleteStaff(staff)}
                          style={{
                            padding: '6px 8px',
                            borderRadius: '8px',
                            border: '1px solid #fecaca',
                            background: '#fef2f2',
                            color: '#dc2626',
                            cursor: 'pointer',
                            fontSize: '11.5px',
                          }}
                          title="Xóa tài khoản"
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

      {/* ───────────────────────────────────────────────────────── */}
      {/*  MODAL: CREATE & EDIT STAFF / PROVISION ACCOUNT           */}
      {/* ───────────────────────────────────────────────────────── */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: '20px',
              maxWidth: '560px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '14px', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#ccfbf1', color: '#0f766e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {editingStaff ? <Edit size={18} /> : <UserPlus size={18} />}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: '#0f172a' }}>
                    {editingStaff ? 'Cập Nhật Nhân Viên & Cấp Mật Khẩu' : 'Cấp Tài Khoản Nhân Viên Trực Kho'}
                  </h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                    Tài khoản được cấp sẽ dùng để đăng nhập vào Staff App / Driver App
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitForm} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#475569', marginBottom: '4px' }}>
                    Mã Nhân Viên
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={e => setFormData({ ...formData, code: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 700, fontFamily: 'monospace' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#475569', marginBottom: '4px' }}>
                    Họ và Tên Nhân Viên *
                  </label>
                  <input
                    required
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ví dụ: Trần Văn Bình"
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 700 }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#475569', marginBottom: '4px' }}>
                    Email Đăng Nhập (Tài Khoản) *
                  </label>
                  <input
                    required
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    placeholder="binh.tran@sfwms.vn"
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 600 }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#475569', marginBottom: '4px' }}>
                    Số Điện Thoại
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="0912345678"
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#475569', marginBottom: '4px' }}>
                  {editingStaff ? 'Mật Khẩu Mới (Để trống nếu không muốn đổi)' : 'Mật Khẩu Khởi Tạo *'}
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required={!editingStaff}
                    value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                    placeholder={editingStaff ? 'Nhập mật khẩu mới để đổi...' : 'Mặc định: password123'}
                    style={{ width: '100%', padding: '8px 36px 8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 600 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#475569', marginBottom: '4px' }}>
                    Vai Trò Quyền Hạn *
                  </label>
                  <select
                    value={formData.role}
                    onChange={e => {
                      const r = e.target.value as any;
                      const dept = r === 'DRIVER' ? 'Vận chuyển (Fleet)' : r === 'WAREHOUSE_MANAGER' ? 'Quản trị kho' : 'Vận hành kho';
                      setFormData({ ...formData, role: r, department: dept });
                    }}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 700, background: '#fff' }}
                  >
                    <option value="WAREHOUSE_STAFF">📦 Nhân viên trực kho (Đa năng: Soạn/Đóng/Nhập/Kiểm kê)</option>
                    <option value="WAREHOUSE_MANAGER">👑 Thủ kho / Quản lý kho</option>
                    <option value="DRIVER">🚚 Tài xế giao hàng (Driver App)</option>
                    <option value="ADMIN">⭐ Quản trị viên hệ thống</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#475569', marginBottom: '4px' }}>
                    Kho Làm Việc (Khóa Cố Định) *
                  </label>
                  <select
                    value={formData.warehouseCode}
                    onChange={e => setFormData({ ...formData, warehouseCode: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 700, background: '#fff' }}
                  >
                    {warehouses.map(w => (
                      <option key={w.code} value={w.code}>
                        📍 {w.name} ({w.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#475569', marginBottom: '4px' }}>
                    Phân Khu Phụ Trách / Phương Tiện
                  </label>
                  <input
                    type="text"
                    value={formData.assignedZone}
                    onChange={e => setFormData({ ...formData, assignedZone: e.target.value })}
                    placeholder="Ví dụ: Khu Khô C & Soạn hàng"
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#475569', marginBottom: '4px' }}>
                    Ca Trực
                  </label>
                  <select
                    value={formData.shift}
                    onChange={e => setFormData({ ...formData, shift: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 700, background: '#fff' }}
                  >
                    <option value="CA_SANG">Ca Sáng (06:00 - 14:00)</option>
                    <option value="CA_CHIEU">Ca Chiều (14:00 - 22:00)</option>
                    <option value="CA_DEM">Ca Đêm (22:00 - 06:00)</option>
                    <option value="HANH_CHINH">Hành chính (08:00 - 17:00)</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#475569', marginBottom: '4px' }}>
                  Trạng Thái Hoạt Động
                </label>
                <select
                  value={formData.status}
                  onChange={e => setFormData({ ...formData, status: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 700, background: '#fff' }}
                >
                  <option value="ACTIVE">🟢 Đang hoạt động / Đang trong ca trực</option>
                  <option value="ON_LEAVE">🟡 Đang nghỉ phép</option>
                  <option value="INACTIVE">🔴 Tạm khóa tài khoản</option>
                </select>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  style={{ padding: '8px 16px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#fff', fontWeight: 700, cursor: 'pointer' }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    padding: '8px 20px',
                    borderRadius: '10px',
                    border: 'none',
                    background: '#0f766e',
                    color: '#fff',
                    fontWeight: 800,
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 4px 12px rgba(15,118,110,0.3)',
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={16} />
                      <span>{editingStaff ? 'Lưu Thay Đổi' : 'Xác Nhận Cấp Tài Khoản'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffManagement;
