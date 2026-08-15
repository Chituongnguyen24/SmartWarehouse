import React, { useState, useEffect } from 'react';
import { Users, Shield, RefreshCw, MapPin } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const WAREHOUSE_API = 'http://localhost:3005'; // warehouse-service
const USER_API = 'http://localhost:3012'; // user-service

interface Warehouse {
  id: string;
  code: string;
  name: string;
}

interface SystemUser {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'WAREHOUSE_MANAGER' | 'WAREHOUSE_STAFF' | 'SALES_STAFF' | 'DRIVER' | 'CUSTOMER';
  phone?: string;
  createdAt: string;
}

const StaffManagement = () => {
  const { token } = useAuth();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [staffList, setStaffList] = useState<SystemUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [assignments, setAssignments] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchWarehouses();
    fetchStaff();
    loadAssignments();
  }, []);

  const loadAssignments = () => {
    try {
      const saved = localStorage.getItem('warehouse-staff-assignments');
      if (saved) {
        setAssignments(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Failed to load assignments:', e);
    }
  };

  const fetchWarehouses = async () => {
    try {
      const res = await fetch(`${WAREHOUSE_API}/warehouses`);
      if (res.ok) {
        const data = await res.json();
        setWarehouses(data);
      }
    } catch (error) {
      console.error('Failed to fetch warehouses:', error);
    }
  };

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${USER_API}/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data: SystemUser[] = await res.json();
        // Filter only WAREHOUSE_STAFF and WAREHOUSE_MANAGER roles
        const warehouseStaff = data.filter(
          u => u.role === 'WAREHOUSE_STAFF' || u.role === 'WAREHOUSE_MANAGER'
        );
        setStaffList(warehouseStaff);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignWarehouse = (userId: string, warehouseCode: string) => {
    const updated = { ...assignments, [userId]: warehouseCode };
    setAssignments(updated);
    localStorage.setItem('warehouse-staff-assignments', JSON.stringify(updated));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', background: '#f8fafc', padding: '1.5rem', minHeight: '100vh' }}>
      
      {/* Header section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff', padding: '1.25rem 1.5rem', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.04)' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
            👥 Quản Lý Nhân Viên & Phân Trực Kho
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '4px' }}>
            Xem danh sách quản lý kho và nhân viên kỹ thuật trực kho, phân công khu vực công tác tại 16 kho hàng của CityMart.
          </p>
        </div>
        <button
          onClick={fetchStaff}
          className="btn btn-outline"
          style={{ borderRadius: '10px', fontWeight: 600, padding: '10px 16px', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '6px', border: '1px solid #cbd5e1', cursor: 'pointer', backgroundColor: '#fff' }}
        >
          <RefreshCw size={16} /> Đồng bộ danh sách
        </button>
      </div>

      {/* Staff Table Card */}
      <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #cbd5e1', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.03)', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0' }}>
          <h3 style={{ fontSize: '0.98rem', fontWeight: 800, color: '#1e293b' }}>
            📋 Danh sách nhân sự vận hành kho ({staffList.length} nhân viên)
          </h3>
        </div>
        <div className="table-container" style={{ margin: '0' }}>
          <table className="table" style={{ fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc' }}>
                <th>Họ Tên</th>
                <th>Email Tài Khoản</th>
                <th>Số Điện Thoại</th>
                <th>Vai Trò Quyền Hạn</th>
                <th>Kho Hàng Phân Công</th>
                <th>Đổi Kho Phân Công</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '3rem' }}>Đang tải danh sách nhân sự...</td></tr>
              ) : staffList.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>Chưa có tài khoản nhân viên kho nào trong cơ sở dữ liệu.</td></tr>
              ) : (
                staffList.map((user) => {
                  const assignedCode = assignments[user.id] || '';
                  const warehouseName = warehouses.find(w => w.code === assignedCode)?.name || 'Chưa phân công kho';
                  
                  return (
                    <tr key={user.id}>
                      <td className="font-semibold" style={{ color: '#1e293b' }}>{user.name}</td>
                      <td style={{ color: '#475569' }}>{user.email}</td>
                      <td style={{ color: '#64748b' }}>{user.phone || 'Chưa cập nhật'}</td>
                      <td>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '2px 8px',
                          borderRadius: '20px',
                          backgroundColor: user.role === 'WAREHOUSE_MANAGER' ? '#e0f2fe' : '#f1f5f9',
                          color: user.role === 'WAREHOUSE_MANAGER' ? '#0369a1' : '#475569',
                          fontSize: '0.68rem',
                          fontWeight: 800
                        }}>
                          <Shield size={10} />
                          {user.role === 'WAREHOUSE_MANAGER' ? 'Quản lý kho' : 'Nhân viên kho'}
                        </span>
                      </td>
                      <td>
                        <strong style={{ color: assignedCode ? '#0f766e' : '#94a3b8', fontSize: '0.8rem' }}>
                          {assignedCode ? `🏢 [${assignedCode}] ${warehouseName}` : '⚠️ Chưa phân công'}
                        </strong>
                      </td>
                      <td>
                        <select
                          value={assignedCode}
                          onChange={(e) => handleAssignWarehouse(user.id, e.target.value)}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            fontSize: '0.78rem',
                            color: '#334155',
                            backgroundColor: '#fff',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          <option value="">-- Chọn kho làm việc --</option>
                          {warehouses.map(wh => (
                            <option key={wh.id} value={wh.code}>{wh.code} - {wh.name}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default StaffManagement;
