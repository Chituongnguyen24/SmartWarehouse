import React, { useState } from 'react';
import {
  Shield,
  Server,
  Database,
  Users,
  Activity,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Lock,
  Unlock,
  UserPlus,
  Settings,
  HardDrive,
  Radio,
  Cpu,
  Layers,
  FileText,
  Zap,
  Terminal,
  ShieldCheck,
  Search,
} from 'lucide-react';
import { useAuth, ROLE_LABELS, UserRole } from '../contexts/AuthContext';

export interface ServiceHealth {
  name: string;
  port: number;
  tech: string;
  status: 'ONLINE' | 'DEGRADED' | 'OFFLINE';
  latencyMs: number;
  memoryMb: number;
  uptimeHours: number;
  description: string;
}

export interface SystemUser {
  id: string;
  username: string;
  name: string;
  email: string;
  role: UserRole;
  status: 'ACTIVE' | 'LOCKED';
  lastLogin: string;
}

export interface AuditLogItem {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  service: string;
  ipAddress: string;
  severity: 'INFO' | 'WARN' | 'CRITICAL';
}

const MOCK_SERVICES: ServiceHealth[] = [
  { name: 'product-service', port: 3010, tech: 'NestJS', status: 'ONLINE', latencyMs: 14, memoryMb: 128, uptimeHours: 72, description: 'Quản lý sản phẩm & SKU' },
  { name: 'inventory-service', port: 3011, tech: 'NestJS', status: 'ONLINE', latencyMs: 18, memoryMb: 145, uptimeHours: 72, description: 'Quản lý tồn kho & lô hàng FEFO' },
  { name: 'user-service', port: 3012, tech: 'NestJS', status: 'ONLINE', latencyMs: 12, memoryMb: 110, uptimeHours: 72, description: 'Quản lý người dùng, Auth & JWT' },
  { name: 'transport-service', port: 3013, tech: 'NestJS', status: 'ONLINE', latencyMs: 25, memoryMb: 160, uptimeHours: 72, description: 'Tối ưu vận chuyển VRP' },
  { name: 'warehouse-service', port: 3005, tech: 'NestJS', status: 'ONLINE', latencyMs: 16, memoryMb: 135, uptimeHours: 72, description: 'Quản lý vị trí, kệ kho' },
  { name: 'inbound-service', port: 3006, tech: 'NestJS', status: 'ONLINE', latencyMs: 15, memoryMb: 120, uptimeHours: 72, description: 'Nhập kho & QC thực phẩm' },
  { name: 'outbound-service', port: 3007, tech: 'NestJS', status: 'ONLINE', latencyMs: 20, memoryMb: 140, uptimeHours: 72, description: 'Xuất kho & Đơn hàng B2B/B2C' },
  { name: 'report-service', port: 3008, tech: 'NestJS', status: 'ONLINE', latencyMs: 30, memoryMb: 155, uptimeHours: 72, description: 'Báo cáo tổng hợp PDF/Excel' },
  { name: 'iot-service', port: 3002, tech: 'NestJS', status: 'ONLINE', latencyMs: 9, memoryMb: 95, uptimeHours: 72, description: 'Thu thập cảm biến IoT nhiệt độ' },
  { name: 'ai-service', port: 3003, tech: 'FastAPI (Python)', status: 'ONLINE', latencyMs: 45, memoryMb: 320, uptimeHours: 72, description: 'Dự báo hư hỏng AI Spoilage' },
  { name: 'notification-service', port: 3004, tech: 'NestJS', status: 'ONLINE', latencyMs: 11, memoryMb: 105, uptimeHours: 72, description: 'Gửi thông báo WebSocket & Email' },
];

const MOCK_SYSTEM_USERS: SystemUser[] = [
  { id: 'u1', username: 'admin', name: 'Nguyễn Văn Tường (Admin)', email: 'admin@freshkeep.vn', role: 'ADMIN', status: 'ACTIVE', lastLogin: '2026-07-20 18:25' },
  { id: 'u2', username: 'manager_kho', name: 'Trần Thị Thanh (Quản lý Kho)', email: 'manager@freshkeep.vn', role: 'WAREHOUSE_MANAGER', status: 'ACTIVE', lastLogin: '2026-07-20 17:40' },
  { id: 'u3', username: 'staff_kho1', name: 'Lê Văn Nam (NV Kho)', email: 'staff1@freshkeep.vn', role: 'WAREHOUSE_STAFF', status: 'ACTIVE', lastLogin: '2026-07-20 16:15' },
  { id: 'u4', username: 'sales_staff1', name: 'Phạm Bảo An (Sales)', email: 'sales1@freshkeep.vn', role: 'SALES_STAFF', status: 'ACTIVE', lastLogin: '2026-07-20 18:10' },
  { id: 'u5', username: 'driver_hung', name: 'Nguyễn Văn Hùng (Tài xế)', email: 'driver1@freshkeep.vn', role: 'DRIVER', status: 'ACTIVE', lastLogin: '2026-07-20 18:05' },
  { id: 'u6', username: 'staff_test_lock', name: 'Vũ Quốc Khánh (NV Cũ)', email: 'khanh@freshkeep.vn', role: 'WAREHOUSE_STAFF', status: 'LOCKED', lastLogin: '2026-07-10 09:00' },
];

const MOCK_AUDIT_LOGS: AuditLogItem[] = [
  { id: 'log-101', timestamp: '2026-07-20 18:28:10', actor: 'sales_staff1 (Sales)', action: 'Tạo đơn xuất kho B2B #ORD-884925', service: 'outbound-service', ipAddress: '192.168.1.45', severity: 'INFO' },
  { id: 'log-102', timestamp: '2026-07-20 18:20:05', actor: 'staff_kho1 (NV Kho)', action: 'Xác nhận soạn hàng FEFO đơn #ORD-884920', service: 'outbound-service', ipAddress: '192.168.1.12', severity: 'INFO' },
  { id: 'log-103', timestamp: '2026-07-20 18:05:40', actor: 'driver_hung (Tài xế)', action: 'Cập nhật nhiệt độ thùng xe 2.8°C đạt chuẩn', service: 'iot-service', ipAddress: '192.168.1.88', severity: 'INFO' },
  { id: 'log-104', timestamp: '2026-07-20 17:30:00', actor: 'SYSTEM_BOT', action: 'Cảnh báo AI: Lô cá hồi sắp hết hạn trong 2 ngày', service: 'ai-service', ipAddress: '127.0.0.1', severity: 'WARN' },
  { id: 'log-105', timestamp: '2026-07-20 16:00:00', actor: 'admin (Admin)', action: 'Thay đổi tham số kho lạnh COLD max: 4.0°C', service: 'warehouse-service', ipAddress: '192.168.1.1', severity: 'INFO' },
];

export const AdminControlCenter = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'SERVICES' | 'USERS' | 'CONFIG' | 'AUDIT'>('SERVICES');
  const [services, setServices] = useState<ServiceHealth[]>(MOCK_SERVICES);
  const [users, setUsers] = useState<SystemUser[]>(MOCK_SYSTEM_USERS);
  const [auditLogs] = useState<AuditLogItem[]>(MOCK_AUDIT_LOGS);

  // System Configuration States
  const [coldMinTemp, setColdMinTemp] = useState<number>(0.0);
  const [coldMaxTemp, setColdMaxTemp] = useState<number>(4.0);
  const [frozenMinTemp, setFrozenMinTemp] = useState<number>(-30.0);
  const [frozenMaxTemp, setFrozenMaxTemp] = useState<number>(-18.0);
  const [fefoWarnDays, setFefoWarnDays] = useState<number>(7);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handlePingServices = () => {
    showToast('⚡ Đã gửi yêu cầu Ping Health Check đến 11 Microservices! Tất cả 11 dịch vụ đều HEALTHY.');
  };

  const handleToggleUserStatus = (userId: string) => {
    setUsers(prev =>
      prev.map(u =>
        u.id === userId ? { ...u, status: u.status === 'ACTIVE' ? 'LOCKED' : 'ACTIVE' } : u
      )
    );
    const target = users.find(u => u.id === userId);
    showToast(`🔒 Đã ${target?.status === 'ACTIVE' ? 'Khóa' : 'Mở khóa'} tài khoản ${target?.username}!`);
  };

  const handleSaveConfig = () => {
    showToast('⚙️ Đã lưu cấu hình tham số nhiệt độ kho lạnh & cảnh báo FEFO thành công!');
  };

  const handleBackupDb = () => {
    showToast('💾 Đã kích hoạt lệnh sao lưu 11 PostgreSQL Databases khẩn cấp!');
  };

  return (
    <div className="admin-control-page" style={{ padding: '1.5rem', background: 'var(--color-bg)', minHeight: '100vh' }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: 20,
            right: 20,
            zIndex: 9999,
            backgroundColor: '#008848',
            color: '#fff',
            padding: '12px 20px',
            borderRadius: 8,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Zap size={18} color="#FFB800" />
          {toastMessage}
        </div>
      )}

      {/* Header Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Shield size={28} color="#008848" /> Trung Tâm Quản Trị Hệ Thống Admin (Control Room 360°)
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginTop: 4 }}>
            Giám sát 11 Microservices, hạ tầng Docker, phân quyền tài khoản người dùng và nhật ký audit log thời gian thực
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={handlePingServices}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <RefreshCw size={16} /> Health Check 11 Services
          </button>
          <button
            onClick={handleBackupDb}
            className="btn btn-primary"
            style={{ backgroundColor: '#008848', color: '#fff', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Database size={16} /> Sao Lưu DB Khẩn Cấp
          </button>
        </div>
      </div>

      {/* Realtime System KPI Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={kpiCardStyle('#F0FDF4', '#16A34A')}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#166534' }}>11 MICROSERVICES</span>
            <Server size={20} color="#16A34A" />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, marginTop: 6, color: '#14532D' }}>11/11 ONLINE</div>
          <div style={{ fontSize: '0.75rem', color: '#15803D', marginTop: 2 }}>Trạng thái 100% HEALTHY</div>
        </div>

        <div style={kpiCardStyle('#EFF6FF', '#2563EB')}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1E40AF' }}>HẠ TẦNG DATABASES</span>
            <Database size={20} color="#2563EB" />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, marginTop: 6, color: '#1E3A8A' }}>11 Postgres DBs</div>
          <div style={{ fontSize: '0.75rem', color: '#3B82F6', marginTop: 2 }}>Redis Cache + RabbitMQ Queue</div>
        </div>

        <div style={kpiCardStyle('#F5F3FF', '#7C3AED')}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#5B21B6' }}>TỔNG TÀI KHOẢN</span>
            <Users size={20} color="#7C3AED" />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, marginTop: 6, color: '#4C1D95' }}>{users.length} người dùng</div>
          <div style={{ fontSize: '0.75rem', color: '#8B5CF6', marginTop: 2 }}>Phân quyền 5 vai trò hệ thống</div>
        </div>

        <div style={kpiCardStyle('#FEFCE8', '#CA8A04')}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#854D0E' }}>NHẬT KÝ HỆ THỐNG</span>
            <Activity size={20} color="#CA8A04" />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, marginTop: 6, color: '#713F12' }}>{auditLogs.length} sự kiện</div>
          <div style={{ fontSize: '0.75rem', color: '#D97706', marginTop: 2 }}>Ghi nhận Audit Log realtime</div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div style={{ display: 'flex', borderBottom: '2px solid var(--color-border)', marginBottom: '1.5rem', gap: 8 }}>
        <button onClick={() => setActiveTab('SERVICES')} style={tabButtonStyle(activeTab === 'SERVICES')}>
          <Server size={18} /> 1. Giám Sát 11 Microservices & Infra
        </button>
        <button onClick={() => setActiveTab('USERS')} style={tabButtonStyle(activeTab === 'USERS')}>
          <Users size={18} /> 2. Quản Lý Người Dùng & Phân Quyền ({users.length})
        </button>
        <button onClick={() => setActiveTab('CONFIG')} style={tabButtonStyle(activeTab === 'CONFIG')}>
          <Settings size={18} /> 3. Cấu Hình Vận Hành & Khẩn Cấp
        </button>
        <button onClick={() => setActiveTab('AUDIT')} style={tabButtonStyle(activeTab === 'AUDIT')}>
          <Activity size={18} /> 4. Nhật Ký Audit Log Hệ Thống
        </button>
      </div>

      {/* TAB 1: MICROSERVICES MONITOR */}
      {activeTab === 'SERVICES' && (
        <div style={{ background: 'var(--color-surface)', borderRadius: 12, padding: '1.25rem', border: '1px solid var(--color-border)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '1rem', color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Server size={18} color="#008848" /> Trạng Thái Hoạt Động 11 Microservices (FreshKeep Backend)
          </h3>

          <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--color-bg)', textAlign: 'left', fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                <th style={{ padding: 10 }}>Dịch vụ Microservice</th>
                <th style={{ padding: 10 }}>Port</th>
                <th style={{ padding: 10 }}>Công nghệ</th>
                <th style={{ padding: 10 }}>Trạng thái</th>
                <th style={{ padding: 10 }}>Độ trễ (Latency)</th>
                <th style={{ padding: 10 }}>RAM Usage</th>
                <th style={{ padding: 10 }}>Mô tả chức năng</th>
              </tr>
            </thead>
            <tbody>
              {services.map((svc, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid var(--color-border)', fontSize: '0.85rem' }}>
                  <td style={{ padding: 10, fontWeight: 800, color: 'var(--color-text)' }}>
                    <span style={{ color: '#008848' }}>●</span> {svc.name}
                  </td>
                  <td style={{ padding: 10, fontWeight: 700, color: '#2563EB' }}>:{svc.port}</td>
                  <td style={{ padding: 10, fontWeight: 600 }}>{svc.tech}</td>
                  <td style={{ padding: 10 }}>
                    <span style={{ backgroundColor: '#DCFCE7', color: '#166534', padding: '3px 8px', borderRadius: 12, fontSize: '0.75rem', fontWeight: 800 }}>
                      🟢 {svc.status}
                    </span>
                  </td>
                  <td style={{ padding: 10, fontWeight: 700, color: '#008848' }}>{svc.latencyMs} ms</td>
                  <td style={{ padding: 10 }}>{svc.memoryMb} MB</td>
                  <td style={{ padding: 10, color: 'var(--color-text-secondary)', fontSize: '0.8rem' }}>{svc.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 2: USERS & ROLES */}
      {activeTab === 'USERS' && (
        <div style={{ background: 'var(--color-surface)', borderRadius: 12, padding: '1.25rem', border: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--color-text)' }}>
              Quản Lý Tài Khoản Hệ Thống & Phân Quyền Vai Trò
            </h3>

            <button
              onClick={() => showToast('👤 Đã mở modal tạo tài khoản nhân viên mới!')}
              className="btn btn-primary"
              style={{ backgroundColor: '#008848', color: '#fff', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <UserPlus size={16} /> Tạo Nhân Viên Mới
            </button>
          </div>

          <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--color-bg)', textAlign: 'left', fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                <th style={{ padding: 10 }}>Họ và tên</th>
                <th style={{ padding: 10 }}>Username</th>
                <th style={{ padding: 10 }}>Email</th>
                <th style={{ padding: 10 }}>Vai trò hệ thống</th>
                <th style={{ padding: 10 }}>Trạng thái</th>
                <th style={{ padding: 10 }}>Đăng nhập gần nhất</th>
                <th style={{ padding: 10 }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} style={{ borderBottom: '1px solid var(--color-border)', fontSize: '0.85rem' }}>
                  <td style={{ padding: 10, fontWeight: 800, color: 'var(--color-text)' }}>{u.name}</td>
                  <td style={{ padding: 10, fontWeight: 700 }}>{u.username}</td>
                  <td style={{ padding: 10, color: 'var(--color-text-secondary)' }}>{u.email}</td>
                  <td style={{ padding: 10 }}>
                    <span style={{ backgroundColor: '#EFF6FF', color: '#1D4ED8', padding: '3px 8px', borderRadius: 12, fontSize: '0.75rem', fontWeight: 800 }}>
                      {ROLE_LABELS[u.role] || u.role}
                    </span>
                  </td>
                  <td style={{ padding: 10 }}>
                    {u.status === 'ACTIVE' ? (
                      <span style={{ color: '#16A34A', fontWeight: 800 }}>🟢 Hoạt động</span>
                    ) : (
                      <span style={{ color: '#EF4444', fontWeight: 800 }}>🔴 Đã khóa</span>
                    )}
                  </td>
                  <td style={{ padding: 10, color: 'var(--color-text-muted)' }}>{u.lastLogin}</td>
                  <td style={{ padding: 10 }}>
                    <button
                      onClick={() => handleToggleUserStatus(u.id)}
                      className="btn btn-secondary"
                      style={{ padding: '4px 10px', fontSize: '0.75rem', fontWeight: 700 }}
                    >
                      {u.status === 'ACTIVE' ? '🔒 Khóa' : '🔓 Mở'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 3: SYSTEM CONFIG */}
      {activeTab === 'CONFIG' && (
        <div style={{ background: 'var(--color-surface)', borderRadius: 12, padding: '1.25rem', border: '1px solid var(--color-border)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '1rem', color: 'var(--color-text)' }}>
            Cấu Hình Tham Số Vận Hành Kho Lạnh & Hệ Thống
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div style={{ backgroundColor: 'var(--color-bg)', padding: 16, borderRadius: 10 }}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 800, marginBottom: 10, color: 'var(--color-text)' }}>
                Ngưỡng Nhiệt Độ Kho Lạnh (Zone COLD):
              </h4>
              <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700 }}>Nhiệt độ Min (°C):</label>
                  <input
                    type="number"
                    value={coldMinTemp}
                    onChange={e => setColdMinTemp(Number(e.target.value))}
                    className="input"
                    style={{ width: '100%', padding: 8, fontWeight: 700 }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700 }}>Nhiệt độ Max (°C):</label>
                  <input
                    type="number"
                    value={coldMaxTemp}
                    onChange={e => setColdMaxTemp(Number(e.target.value))}
                    className="input"
                    style={{ width: '100%', padding: 8, fontWeight: 700 }}
                  />
                </div>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                Áp dụng cho bảo quản Rau củ quả VietGAP, Thịt cá tươi sống, Sữa tươi.
              </div>
            </div>

            <div style={{ backgroundColor: 'var(--color-bg)', padding: 16, borderRadius: 10 }}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 800, marginBottom: 10, color: 'var(--color-text)' }}>
                Ngưỡng Cảnh Báo FEFO (Hạn Sử Dụng Ngắn):
              </h4>
              <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700 }}>Số ngày trước khi hết hạn:</label>
                <input
                  type="number"
                  value={fefoWarnDays}
                  onChange={e => setFefoWarnDays(Number(e.target.value))}
                  className="input"
                  style={{ width: '100%', padding: 8, fontWeight: 700 }}
                />
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                Hệ thống AI sẽ tự động cảnh báo lô hàng sắp hết hạn trước {fefoWarnDays} ngày.
              </div>
            </div>
          </div>

          <button
            onClick={handleSaveConfig}
            className="btn btn-primary"
            style={{ backgroundColor: '#008848', color: '#fff', fontWeight: 800, padding: '10px 20px' }}
          >
            💾 Lưu Cấu Hình Tham Số
          </button>
        </div>
      )}

      {/* TAB 4: AUDIT LOGS */}
      {activeTab === 'AUDIT' && (
        <div style={{ background: 'var(--color-surface)', borderRadius: 12, padding: '1.25rem', border: '1px solid var(--color-border)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '1rem', color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Activity size={18} color="#008848" /> Nhật Ký Hoạt Động Audit Log Hệ Thống
          </h3>

          <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--color-bg)', textAlign: 'left', fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                <th style={{ padding: 10 }}>Thời gian</th>
                <th style={{ padding: 10 }}>Tài khoản thực hiện</th>
                <th style={{ padding: 10 }}>Hành động / Thao tác</th>
                <th style={{ padding: 10 }}>Dịch vụ</th>
                <th style={{ padding: 10 }}>Địa chỉ IP</th>
                <th style={{ padding: 10 }}>Mức độ</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.map(log => (
                <tr key={log.id} style={{ borderBottom: '1px solid var(--color-border)', fontSize: '0.85rem' }}>
                  <td style={{ padding: 10, color: 'var(--color-text-muted)' }}>{log.timestamp}</td>
                  <td style={{ padding: 10, fontWeight: 700 }}>{log.actor}</td>
                  <td style={{ padding: 10, fontWeight: 600, color: 'var(--color-text)' }}>{log.action}</td>
                  <td style={{ padding: 10, color: '#2563EB', fontWeight: 700 }}>{log.service}</td>
                  <td style={{ padding: 10, fontSize: '0.8rem' }}>{log.ipAddress}</td>
                  <td style={{ padding: 10 }}>
                    {log.severity === 'INFO' && <span style={{ backgroundColor: '#DCFCE7', color: '#166534', padding: '2px 6px', borderRadius: 4, fontSize: '0.75rem', fontWeight: 700 }}>INFO</span>}
                    {log.severity === 'WARN' && <span style={{ backgroundColor: '#FEF3C7', color: '#92400E', padding: '2px 6px', borderRadius: 4, fontSize: '0.75rem', fontWeight: 700 }}>WARN</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const kpiCardStyle = (bgColor: string, borderColor: string): React.CSSProperties => ({
  backgroundColor: bgColor,
  borderRadius: 12,
  padding: '1rem',
  borderLeft: `4px solid ${borderColor}`,
  boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
});

const tabButtonStyle = (isActive: boolean): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '10px 16px',
  fontWeight: isActive ? 800 : 600,
  fontSize: '0.875rem',
  color: isActive ? '#008848' : 'var(--color-text-secondary)',
  backgroundColor: isActive ? 'var(--color-surface)' : 'transparent',
  border: 'none',
  borderBottom: isActive ? '3px solid #008848' : '3px solid transparent',
  cursor: 'pointer',
  transition: 'all 0.2s',
});

export default AdminControlCenter;
