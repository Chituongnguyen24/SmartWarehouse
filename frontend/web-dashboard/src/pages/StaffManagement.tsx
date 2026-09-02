import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, UserPlus, Search, Edit, Trash2, 
  Clock, Phone, Mail, MapPin, Building, 
  Truck, Package, X, UserCheck
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface WarehouseStaffMember {
  id: string;
  code: string; // NV-001
  name: string;
  email: string;
  phone: string;
  roleTitle: 'Thủ kho' | 'Nhân viên Soạn hàng' | 'Nhân viên Đóng gói' | 'Nhân viên Kiểm định (QC)' | 'Tài xế giao hàng' | 'Nhân viên Bốc xếp';
  department: 'Quản trị kho' | 'Soạn hàng (Picking)' | 'Đóng gói (Packing)' | 'Kiểm định chất lượng' | 'Vận chuyển (Fleet)' | 'Bốc xếp & Nhập hàng';
  warehouseCode: string;
  assignedZone: string; // Khu Mát A, Khu Đông B, Khu Khô C, Bãi xuất hàng...
  shift: 'CA_SANG' | 'CA_CHIEU' | 'CA_DEM' | 'HANH_CHINH';
  status: 'ACTIVE' | 'ON_LEAVE' | 'OFF_DUTY';
  rating: number; // 4.8 / 5
  joinedDate: string;
  tasksCompleted: number;
}

const INITIAL_STAFF_GOVAP: WarehouseStaffMember[] = [
  {
    id: 'stf-001',
    code: 'NV-GV01',
    name: 'Nguyễn Hoàng Nam',
    email: 'nam.nguyen@ctmart.vn',
    phone: '0908123456',
    roleTitle: 'Thủ kho',
    department: 'Quản trị kho',
    warehouseCode: 'WH-006',
    assignedZone: 'Toàn bộ Kho Gò Vấp',
    shift: 'HANH_CHINH',
    status: 'ACTIVE',
    rating: 4.9,
    joinedDate: '15/01/2023',
    tasksCompleted: 1420
  },
  {
    id: 'stf-002',
    code: 'NV-GV02',
    name: 'Trần Văn Bình',
    email: 'binh.tran@ctmart.vn',
    phone: '0912345678',
    roleTitle: 'Nhân viên Soạn hàng',
    department: 'Soạn hàng (Picking)',
    warehouseCode: 'WH-006',
    assignedZone: 'Khu Khô C (Dry-C1 -> C3)',
    shift: 'CA_SANG',
    status: 'ACTIVE',
    rating: 4.8,
    joinedDate: '10/05/2023',
    tasksCompleted: 860
  },
  {
    id: 'stf-003',
    code: 'NV-GV03',
    name: 'Lê Văn Kho',
    email: 'kho.le@ctmart.vn',
    phone: '0933987654',
    roleTitle: 'Nhân viên Đóng gói',
    department: 'Đóng gói (Packing)',
    warehouseCode: 'WH-006',
    assignedZone: 'Bàn Đóng Gói Pack-01',
    shift: 'CA_SANG',
    status: 'ACTIVE',
    rating: 4.7,
    joinedDate: '01/08/2023',
    tasksCompleted: 920
  },
  {
    id: 'stf-004',
    code: 'NV-GV04',
    name: 'Phạm Thị Thúy',
    email: 'thuy.pham@ctmart.vn',
    phone: '0987654321',
    roleTitle: 'Nhân viên Kiểm định (QC)',
    department: 'Kiểm định chất lượng',
    warehouseCode: 'WH-006',
    assignedZone: 'Cửa Tiếp Nhận & Trạm QC-01',
    shift: 'CA_CHIEU',
    status: 'ACTIVE',
    rating: 4.9,
    joinedDate: '12/11/2023',
    tasksCompleted: 640
  },
  {
    id: 'stf-005',
    code: 'NV-GV05',
    name: 'Võ Minh Trí',
    email: 'tri.vo@ctmart.vn',
    phone: '0977112233',
    roleTitle: 'Tài xế giao hàng',
    department: 'Vận chuyển (Fleet)',
    warehouseCode: 'WH-006',
    assignedZone: '🛵 Xe Máy Thùng Lạnh (59-V1 888.99)',
    shift: 'CA_SANG',
    status: 'ACTIVE',
    rating: 4.95,
    joinedDate: '05/02/2024',
    tasksCompleted: 520
  },
  {
    id: 'stf-006',
    code: 'NV-GV06',
    name: 'Nguyễn Văn Hùng',
    email: 'hung.nguyen@ctmart.vn',
    phone: '0909888111',
    roleTitle: 'Tài xế giao hàng',
    department: 'Vận chuyển (Fleet)',
    warehouseCode: 'WH-006',
    assignedZone: '🛵 Xe Máy Giao Siêu Tốc (59-G2 688.39)',
    shift: 'CA_SANG',
    status: 'ACTIVE',
    rating: 4.9,
    joinedDate: '15/03/2024',
    tasksCompleted: 430
  },
  {
    id: 'stf-007',
    code: 'NV-GV07',
    name: 'Trần Quốc Bảo',
    email: 'bao.tran@ctmart.vn',
    phone: '0933445566',
    roleTitle: 'Tài xế giao hàng',
    department: 'Vận chuyển (Fleet)',
    warehouseCode: 'WH-006',
    assignedZone: '🛵 Xe Máy Thùng Mát (59-P1 456.78)',
    shift: 'CA_CHIEU',
    status: 'ACTIVE',
    rating: 4.85,
    joinedDate: '10/04/2024',
    tasksCompleted: 380
  },
  {
    id: 'stf-008',
    code: 'NV-GV08',
    name: 'Phạm Hoàng Nam',
    email: 'nam.pham@ctmart.vn',
    phone: '0918776655',
    roleTitle: 'Tài xế giao hàng',
    department: 'Vận chuyển (Fleet)',
    warehouseCode: 'WH-006',
    assignedZone: '🛵 Xe Máy Thực Phẩm Tươi (59-K1 234.56)',
    shift: 'CA_CHIEU',
    status: 'ACTIVE',
    rating: 4.8,
    joinedDate: '22/04/2024',
    tasksCompleted: 310
  },
  {
    id: 'stf-009',
    code: 'NV-GV09',
    name: 'Lê Thanh Tùng',
    email: 'tung.le@ctmart.vn',
    phone: '0966332211',
    roleTitle: 'Tài xế giao hàng',
    department: 'Vận chuyển (Fleet)',
    warehouseCode: 'WH-006',
    assignedZone: '🛵 Xe Máy Thùng Lạnh (59-X1 999.11)',
    shift: 'CA_SANG',
    status: 'ON_LEAVE',
    rating: 4.9,
    joinedDate: '01/05/2024',
    tasksCompleted: 275
  },
  {
    id: 'stf-010',
    code: 'NV-GV10',
    name: 'Đặng Hữu Phúc',
    email: 'phuc.dang@ctmart.vn',
    phone: '0944778899',
    roleTitle: 'Tài xế giao hàng',
    department: 'Vận chuyển (Fleet)',
    warehouseCode: 'WH-006',
    assignedZone: '🛵 Xe Máy Giao Nhanh (59-T2 777.88)',
    shift: 'CA_CHIEU',
    status: 'ACTIVE',
    rating: 4.75,
    joinedDate: '15/05/2024',
    tasksCompleted: 190
  },
  {
    id: 'stf-011',
    code: 'NV-GV11',
    name: 'Đặng Quốc Huy',
    email: 'huy.dang@ctmart.vn',
    phone: '0944556677',
    roleTitle: 'Nhân viên Bốc xếp',
    department: 'Bốc xếp & Nhập hàng',
    warehouseCode: 'WH-006',
    assignedZone: 'Khu Đông B (Frozen-B1 -> B3)',
    shift: 'CA_DEM',
    status: 'OFF_DUTY',
    rating: 4.6,
    joinedDate: '20/03/2024',
    tasksCompleted: 350
  },
  {
    id: 'stf-012',
    code: 'NV-GV12',
    name: 'Lê Minh Quân',
    email: 'quan.le@ctmart.vn',
    phone: '0911223344',
    roleTitle: 'Nhân viên Soạn hàng',
    department: 'Soạn hàng (Picking)',
    warehouseCode: 'WH-006',
    assignedZone: 'Khu Mát A (Cold-A1 -> A3)',
    shift: 'CA_SANG',
    status: 'ACTIVE',
    rating: 4.8,
    joinedDate: '01/06/2024',
    tasksCompleted: 210
  }
];

const SHIFT_MAP = {
  CA_SANG: { label: 'Ca Sáng (06:00 - 14:00)', color: '#0284c7', bg: '#e0f2fe' },
  CA_CHIEU: { label: 'Ca Chiều (14:00 - 22:00)', color: '#d97706', bg: '#fef3c7' },
  CA_DEM: { label: 'Ca Đêm (22:00 - 06:00)', color: '#7c3aed', bg: '#ede9fe' },
  HANH_CHINH: { label: 'Hành Chính (08:00 - 17:00)', color: '#0f766e', bg: '#ccfbf1' },
};

const STATUS_MAP = {
  ACTIVE: { label: 'Đang Trong Ca', color: '#16a34a', bg: '#dcfce7', icon: '🟢' },
  ON_LEAVE: { label: 'Nghỉ Phép', color: '#d97706', bg: '#fef3c7', icon: '🟡' },
  OFF_DUTY: { label: 'Đã Tan Ca', color: '#64748b', bg: '#f1f5f9', icon: '⚪' },
};

export const StaffManagement = () => {
  const { user } = useAuth();
  
  // Warehouse selector (Locked to WH-006 if manager)
  const isManager = user?.role === 'WAREHOUSE_MANAGER';
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>(
    user?.warehouseCode || (user?.email?.includes('govap') ? 'WH-006' : 'WH-006')
  );

  // Staff State with Local Storage persistence
  const [staffList, setStaffList] = useState<WarehouseStaffMember[]>(() => {
    try {
      const saved = localStorage.getItem(`staff_list_${selectedWarehouse}`);
      return saved ? JSON.parse(saved) : INITIAL_STAFF_GOVAP;
    } catch {
      return INITIAL_STAFF_GOVAP;
    }
  });

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [shiftFilter, setShiftFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modal State (Create / Edit)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<WarehouseStaffMember | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<WarehouseStaffMember>>({
    code: '',
    name: '',
    email: '',
    phone: '',
    roleTitle: 'Nhân viên Soạn hàng',
    department: 'Soạn hàng (Picking)',
    assignedZone: 'Khu Mát A (Cold-A1)',
    shift: 'CA_SANG',
    status: 'ACTIVE',
  });

  // Save to LocalStorage whenever staffList changes
  useEffect(() => {
    try {
      localStorage.setItem(`staff_list_${selectedWarehouse}`, JSON.stringify(staffList));
    } catch (e) {
      console.error(e);
    }
  }, [staffList, selectedWarehouse]);

  // KPIs
  const kpis = useMemo(() => {
    const total = staffList.length;
    const active = staffList.filter(s => s.status === 'ACTIVE').length;
    const onLeave = staffList.filter(s => s.status === 'ON_LEAVE').length;
    const pickers = staffList.filter(s => s.roleTitle.includes('Soạn') || s.roleTitle.includes('Đóng gói')).length;
    const drivers = staffList.filter(s => s.roleTitle.includes('Tài xế')).length;
    return { total, active, onLeave, pickers, drivers };
  }, [staffList]);

  // Filtered List
  const filteredStaff = useMemo(() => {
    return staffList.filter(s => {
      const matchWh = s.warehouseCode === selectedWarehouse;
      const matchSearch = searchQuery.trim() === '' || 
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.phone.includes(searchQuery) ||
        s.email.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchRole = roleFilter === 'ALL' || s.roleTitle === roleFilter;
      const matchShift = shiftFilter === 'ALL' || s.shift === shiftFilter;
      const matchStatus = statusFilter === 'ALL' || s.status === statusFilter;

      return matchWh && matchSearch && matchRole && matchShift && matchStatus;
    });
  }, [staffList, selectedWarehouse, searchQuery, roleFilter, shiftFilter, statusFilter]);

  // Open Create Modal
  const handleOpenCreate = () => {
    const nextCode = `NV-GV0${staffList.length + 1}`;
    setEditingStaff(null);
    setFormData({
      code: nextCode,
      name: '',
      email: '',
      phone: '',
      roleTitle: 'Nhân viên Soạn hàng',
      department: 'Soạn hàng (Picking)',
      assignedZone: 'Khu Mát A (Cold-A1)',
      shift: 'CA_SANG',
      status: 'ACTIVE',
    });
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (staff: WarehouseStaffMember) => {
    setEditingStaff(staff);
    setFormData({ ...staff });
    setIsModalOpen(true);
  };

  // Save (Create / Update)
  const handleSaveStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) {
      alert('Vui lòng nhập đầy đủ họ tên và số điện thoại nhân viên!');
      return;
    }

    if (editingStaff) {
      // Update
      setStaffList(prev => prev.map(s => s.id === editingStaff.id ? { ...s, ...formData } as WarehouseStaffMember : s));
    } else {
      // Create
      const newMember: WarehouseStaffMember = {
        id: `stf-${Date.now()}`,
        code: formData.code || `NV-GV0${staffList.length + 1}`,
        name: formData.name!,
        email: formData.email || `${formData.name?.toLowerCase().replace(/\s+/g, '')}@ctmart.vn`,
        phone: formData.phone!,
        roleTitle: formData.roleTitle as any || 'Nhân viên Soạn hàng',
        department: formData.department as any || 'Soạn hàng (Picking)',
        warehouseCode: selectedWarehouse,
        assignedZone: formData.assignedZone || 'Khu Mát A',
        shift: formData.shift as any || 'CA_SANG',
        status: formData.status as any || 'ACTIVE',
        rating: 5.0,
        joinedDate: new Date().toLocaleDateString('vi-VN'),
        tasksCompleted: 0
      };
      setStaffList(prev => [newMember, ...prev]);
    }
    setIsModalOpen(false);
  };

  // Delete Staff Member
  const handleDeleteStaff = (id: string, name: string) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa nhân viên "${name}" khỏi danh sách nhân sự kho?`)) {
      setStaffList(prev => prev.filter(s => s.id !== id));
    }
  };

  // Quick Status Toggle
  const handleToggleStatus = (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'ACTIVE' ? 'OFF_DUTY' : currentStatus === 'OFF_DUTY' ? 'ON_LEAVE' : 'ACTIVE';
    setStaffList(prev => prev.map(s => s.id === id ? { ...s, status: nextStatus as any } : s));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', background: '#f8fafc', padding: '1.5rem', minHeight: '100vh' }}>

      {/* Header section */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: '#ffffff',
        padding: '1.25rem 1.5rem',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 20px -2px rgba(0,0,0,0.04)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ background: '#0f766e', color: '#fff', padding: '12px', borderRadius: '14px', display: 'flex' }}>
            <Building size={28} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              Quản Lý Nhân Sự & Ca Trực Kho Hàng
              <span style={{ fontSize: '0.8rem', background: '#ccfbf1', color: '#0f766e', padding: '3px 10px', borderRadius: '20px', fontWeight: 800 }}>
                {selectedWarehouse === 'WH-006' ? '🏢 Kho Gò Vấp (WH-006)' : selectedWarehouse}
              </span>
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.875rem', margin: '4px 0 0 0' }}>
              Quản lý danh sách thủ kho, nhân viên soạn hàng, đóng gói, kiểm định và đội ngũ tài xế trực tiếp tại kho.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {/* Warehouse Selector for Admin */}
          {!isManager && (
            <select
              value={selectedWarehouse}
              onChange={e => setSelectedWarehouse(e.target.value)}
              style={{
                padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1',
                fontWeight: 700, fontSize: '0.85rem', background: '#fff', color: '#0f766e'
              }}
            >
              <option value="WH-006">🏢 Kho Gò Vấp (WH-006)</option>
              <option value="WH-001">🏢 Kho Quận 12 (WH-001)</option>
              <option value="WH-002">🏢 Kho Thủ Đức (WH-002)</option>
              <option value="WH-005">🏢 Kho Bình Thạnh (WH-005)</option>
            </select>
          )}

          <button
            onClick={handleOpenCreate}
            style={{
              padding: '10px 18px',
              borderRadius: '10px',
              border: 'none',
              backgroundColor: '#0f766e',
              color: '#fff',
              fontWeight: 800,
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(15,118,110,0.25)'
            }}
          >
            <UserPlus size={18} /> + Thêm Nhân Viên Mới
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div style={{ background: '#fff', padding: '16px 20px', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '0.82rem', fontWeight: 700 }}>
            <span>TỔNG NHÂN SỰ KHO</span>
            <Users size={18} color="#0f766e" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#0f766e', marginTop: '6px' }}>
            {kpis.total} <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>nhân sự</span>
          </div>
        </div>

        <div style={{ background: '#fff', padding: '16px 20px', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '0.82rem', fontWeight: 700 }}>
            <span>ĐANG TRONG CA TRỰC</span>
            <UserCheck size={18} color="#16a34a" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#16a34a', marginTop: '6px' }}>
            {kpis.active} <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#16a34a' }}>đang làm việc</span>
          </div>
        </div>

        <div style={{ background: '#fff', padding: '16px 20px', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '0.82rem', fontWeight: 700 }}>
            <span>ĐỘI SOẠN & ĐÓNG GÓI</span>
            <Package size={18} color="#0284c7" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#0284c7', marginTop: '6px' }}>
            {kpis.pickers} <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>nhân sự</span>
          </div>
        </div>

        <div style={{ background: '#fff', padding: '16px 20px', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '0.82rem', fontWeight: 700 }}>
            <span>ĐỘI TÀI XẾ GIAO HÀNG</span>
            <Truck size={18} color="#d97706" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#d97706', marginTop: '6px' }}>
            {kpis.drivers} <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>tài xế</span>
          </div>
        </div>

        <div style={{ background: '#fff', padding: '16px 20px', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '0.82rem', fontWeight: 700 }}>
            <span>NGHỈ PHÉP / VẮNG MẶT</span>
            <Clock size={18} color="#94a3b8" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#64748b', marginTop: '6px' }}>
            {kpis.onLeave} <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>vắng mặt</span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div style={{
        background: '#ffffff',
        padding: '14px 18px',
        borderRadius: '14px',
        border: '1px solid #e2e8f0',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '12px',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', gap: '10px', flex: 1, minWidth: '280px', maxWidth: '400px', position: 'relative' }}>
          <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '10px' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tên, mã NV, SĐT, email..."
            style={{
              width: '100%',
              padding: '8px 12px 8px 38px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.85rem',
              outline: 'none'
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', background: '#fff' }}
          >
            <option value="ALL">Tất cả Vị trí / Chức vụ</option>
            <option value="Thủ kho">Thủ kho</option>
            <option value="Nhân viên Soạn hàng">Nhân viên Soạn hàng</option>
            <option value="Nhân viên Đóng gói">Nhân viên Đóng gói</option>
            <option value="Nhân viên Kiểm định (QC)">Nhân viên Kiểm định (QC)</option>
            <option value="Tài xế giao hàng">Tài xế giao hàng</option>
            <option value="Nhân viên Bốc xếp">Nhân viên Bốc xếp</option>
          </select>

          <select
            value={shiftFilter}
            onChange={e => setShiftFilter(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', background: '#fff' }}
          >
            <option value="ALL">Tất cả Ca trực</option>
            <option value="CA_SANG">Ca Sáng (06:00 - 14:00)</option>
            <option value="CA_CHIEU">Ca Chiều (14:00 - 22:00)</option>
            <option value="CA_DEM">Ca Đêm (22:00 - 06:00)</option>
            <option value="HANH_CHINH">Hành chính (08:00 - 17:00)</option>
          </select>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', background: '#fff' }}
          >
            <option value="ALL">Tất cả Trạng thái</option>
            <option value="ACTIVE">🟢 Đang trong ca</option>
            <option value="ON_LEAVE">🟡 Nghỉ phép</option>
            <option value="OFF_DUTY">⚪ Đã tan ca</option>
          </select>
        </div>
      </div>

      {/* Main Staff Table */}
      <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.03)', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
            📋 Danh Sách Nhân Sự Vận Hành Kho ({filteredStaff.length} nhân viên)
          </h3>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
            Hiển thị nhân sự trực thuộc <b>{selectedWarehouse === 'WH-006' ? 'Kho Gò Vấp' : selectedWarehouse}</b>
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
              <tr>
                <th style={{ padding: '12px 14px', width: '85px' }}>Mã NV</th>
                <th style={{ padding: '12px 14px' }}>Họ và Tên</th>
                <th style={{ padding: '12px 14px' }}>Vị Trí / Chức Vụ</th>
                <th style={{ padding: '12px 14px' }}>Khu Vực / Kệ Phụ Trách</th>
                <th style={{ padding: '12px 14px' }}>Ca Trực</th>
                <th style={{ padding: '12px 14px' }}>Liên Hệ</th>
                <th style={{ padding: '12px 14px', textAlign: 'center' }}>Trạng Thái</th>
                <th style={{ padding: '12px 14px', textAlign: 'center', width: '110px' }}>Hành Động</th>
              </tr>
            </thead>
            <tbody>
              {filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                    Không tìm thấy nhân viên nào phù hợp với bộ lọc tìm kiếm.
                  </td>
                </tr>
              ) : (
                filteredStaff.map((stf) => {
                  const shiftConfig = SHIFT_MAP[stf.shift];
                  const statusConfig = STATUS_MAP[stf.status];

                  return (
                    <tr key={stf.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 14px', fontWeight: 800, color: '#0f766e', fontFamily: 'monospace' }}>
                        {stf.code}
                      </td>

                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{stf.name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                          Ngày vào: {stf.joinedDate} • ⭐ {stf.rating}/5
                        </div>
                      </td>

                      <td style={{ padding: '12px 14px' }}>
                        <span style={{
                          fontWeight: 700,
                          fontSize: '0.8rem',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background: stf.roleTitle === 'Thủ kho' ? '#fef3c7' : '#f1f5f9',
                          color: stf.roleTitle === 'Thủ kho' ? '#b45309' : '#334155',
                          display: 'inline-block'
                        }}>
                          {stf.roleTitle}
                        </span>
                        <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '3px' }}>
                          {stf.department}
                        </div>
                      </td>

                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#0f172a', fontWeight: 600 }}>
                          <MapPin size={13} color="#0f766e" />
                          <span>{stf.assignedZone}</span>
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#059669', marginTop: '2px' }}>
                          Hoàn thành: {stf.tasksCompleted} lượt tác vụ
                        </div>
                      </td>

                      <td style={{ padding: '12px 14px' }}>
                        <span style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background: shiftConfig.bg,
                          color: shiftConfig.color
                        }}>
                          {shiftConfig.label}
                        </span>
                      </td>

                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#334155' }}>
                          <Phone size={12} color="#64748b" />
                          <span style={{ fontFamily: 'monospace' }}>{stf.phone}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#64748b', fontSize: '0.75rem', marginTop: '2px' }}>
                          <Mail size={11} />
                          <span>{stf.email}</span>
                        </div>
                      </td>

                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(stf.id, stf.status)}
                          title="Bấm để đổi trạng thái nhanh"
                          style={{
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            padding: '4px 10px',
                            borderRadius: '20px',
                            background: statusConfig.bg,
                            color: statusConfig.color,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <span>{statusConfig.icon}</span> {statusConfig.label}
                        </button>
                      </td>

                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(stf)}
                            style={{
                              background: '#f0fdfa',
                              border: '1px solid #99f6e4',
                              color: '#0f766e',
                              borderRadius: '6px',
                              padding: '5px 8px',
                              cursor: 'pointer'
                            }}
                            title="Chỉnh sửa thông tin"
                          >
                            <Edit size={14} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteStaff(stf.id, stf.name)}
                            style={{
                              background: '#fff1f2',
                              border: '1px solid #fecdd3',
                              color: '#e11d48',
                              borderRadius: '6px',
                              padding: '5px 8px',
                              cursor: 'pointer'
                            }}
                            title="Xóa nhân viên"
                          >
                            <Trash2 size={14} />
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

      {/* Create / Edit Staff Modal */}
      {isModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          padding: '20px'
        }}>
          <div style={{
            background: '#fff',
            borderRadius: '16px',
            maxWidth: '600px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{
              padding: '16px 20px',
              background: '#0f766e',
              color: '#fff',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderRadius: '16px 16px 0 0'
            }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={20} /> {editingStaff ? 'Cập Nhật Thông Tin Nhân Viên' : 'Thêm Nhân Viên Kho Mới'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveStaff} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Mã Nhân Viên *
                  </label>
                  <input
                    required
                    type="text"
                    value={formData.code}
                    onChange={e => setFormData({ ...formData, code: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontFamily: 'monospace', fontWeight: 700 }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Họ và Tên Nhân Viên *
                  </label>
                  <input
                    required
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ví dụ: Nguyễn Văn An"
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 600 }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Số Điện Thoại *
                  </label>
                  <input
                    required
                    type="text"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="0908xxxxxx"
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Email Tài Khoản
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    placeholder="ten.nguyen@smartlogistics.vn"
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Vị Trí / Chức Vụ *
                  </label>
                  <select
                    value={formData.roleTitle}
                    onChange={e => {
                      const role = e.target.value as any;
                      const dept = 
                        role === 'Thủ kho' ? 'Quản trị kho' :
                        role === 'Nhân viên Soạn hàng' ? 'Soạn hàng (Picking)' :
                        role === 'Nhân viên Đóng gói' ? 'Đóng gói (Packing)' :
                        role === 'Nhân viên Kiểm định (QC)' ? 'Kiểm định chất lượng' :
                        role === 'Tài xế giao hàng' ? 'Vận chuyển (Fleet)' : 'Bốc xếp & Nhập hàng';
                      setFormData({ ...formData, roleTitle: role, department: dept as any });
                    }}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 600, background: '#fff' }}
                  >
                    <option value="Thủ kho">Thủ kho</option>
                    <option value="Nhân viên Soạn hàng">Nhân viên Soạn hàng (Picker)</option>
                    <option value="Nhân viên Đóng gói">Nhân viên Đóng gói (Packer)</option>
                    <option value="Nhân viên Kiểm định (QC)">Nhân viên Kiểm định (QC)</option>
                    <option value="Tài xế giao hàng">Tài xế giao hàng (Driver)</option>
                    <option value="Nhân viên Bốc xếp">Nhân viên Bốc xếp (Loader)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Ca Trực Phân Công *
                  </label>
                  <select
                    value={formData.shift}
                    onChange={e => setFormData({ ...formData, shift: e.target.value as any })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 600, background: '#fff' }}
                  >
                    <option value="CA_SANG">Ca Sáng (06:00 - 14:00)</option>
                    <option value="CA_CHIEU">Ca Chiều (14:00 - 22:00)</option>
                    <option value="CA_DEM">Ca Đêm (22:00 - 06:00)</option>
                    <option value="HANH_CHINH">Hành chính (08:00 - 17:00)</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Khu Vực Kệ / Phương Tiện Phân Công Phụ Trách
                </label>
                <input
                  type="text"
                  value={formData.assignedZone}
                  onChange={e => setFormData({ ...formData, assignedZone: e.target.value })}
                  placeholder="Ví dụ: Khu Mát A (Cold-A1 -> A3) hoặc Xe tải 59C-888.99"
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Trạng Thái Làm Việc
                </label>
                <select
                  value={formData.status}
                  onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 700, background: '#fff' }}
                >
                  <option value="ACTIVE">🟢 Đang trong ca làm việc</option>
                  <option value="ON_LEAVE">🟡 Đang nghỉ phép</option>
                  <option value="OFF_DUTY">⚪ Đã tan ca / Chờ ca</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #f1f5f9' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', fontWeight: 700 }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '8px 20px', borderRadius: '8px', border: 'none',
                    background: '#0f766e', color: '#fff', cursor: 'pointer', fontWeight: 800
                  }}
                >
                  {editingStaff ? 'Lưu Thay Đổi' : 'Thêm Nhân Viên'}
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
