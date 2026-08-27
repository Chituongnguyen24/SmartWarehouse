import React, { useState, useEffect } from 'react';
import { Users as UsersIcon, UserPlus, CheckCircle, Trash2, Shield, Lock, Unlock, KeyRound, ChevronDown, AlertCircle } from 'lucide-react';
import { useAuth, ROLE_LABELS, ROLE_COLORS } from '../contexts/AuthContext';
import type { UserRole } from '../contexts/AuthContext';

interface SystemUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isLocked: boolean;
  lockedAt: string | null;
  createdAt: string;
}

const API_BASE = 'http://localhost:3012';

const Users = () => {
  const { token } = useAuth();
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [loading, setLoading] = useState(true);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('password123');
  const [role, setRole] = useState<UserRole>('WAREHOUSE_STAFF');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Reset password modal state
  const [resetModal, setResetModal] = useState<{ userId: string; userName: string; newPassword: string } | null>(null);

  // Role change dropdown
  const [roleDropdown, setRoleDropdown] = useState<string | null>(null);

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API_BASE}/users`, { headers });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email) return;
    setErrorMsg('');

    try {
      const res = await fetch(`${API_BASE}/users`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ name: fullName, email, passwordHash: password, role }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Tạo tài khoản thất bại');
      }

      setFullName('');
      setEmail('');
      setPassword('password123');
      setSuccessMsg(`Đã tạo tài khoản thành công cho ${fullName}!`);
      setTimeout(() => setSuccessMsg(''), 4000);
      fetchUsers();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa tài khoản này?')) return;

    try {
      await fetch(`${API_BASE}/users/${id}`, {
        method: 'DELETE',
        headers,
      });
      fetchUsers();
    } catch (err) {
      console.error('Failed to delete user:', err);
    }
  };

  const handleToggleLock = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/users/${id}/toggle-lock`, {
        method: 'PATCH',
        headers,
      });
      if (res.ok) {
        const data = await res.json();
        setSuccessMsg(data.message);
        setTimeout(() => setSuccessMsg(''), 4000);
        fetchUsers();
      }
    } catch (err) {
      console.error('Failed to toggle lock:', err);
    }
  };

  const handleResetPassword = async (id: string, name: string) => {
    if (!confirm(`Bạn có chắc muốn reset mật khẩu cho "${name}"?`)) return;

    try {
      const res = await fetch(`${API_BASE}/users/${id}/reset-password`, {
        method: 'PATCH',
        headers,
      });
      if (res.ok) {
        const data = await res.json();
        setResetModal({ userId: id, userName: name, newPassword: data.newPassword });
      }
    } catch (err) {
      console.error('Failed to reset password:', err);
    }
  };

  const handleUpdateRole = async (id: string, newRole: UserRole) => {
    try {
      const res = await fetch(`${API_BASE}/users/${id}/role`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        setSuccessMsg(`Đã cập nhật vai trò thành công!`);
        setTimeout(() => setSuccessMsg(''), 4000);
        setRoleDropdown(null);
        fetchUsers();
      }
    } catch (err) {
      console.error('Failed to update role:', err);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-6)' }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.25rem' }}>Quản lý người dùng</h2>
        <p className="text-muted" style={{ fontSize: '0.875rem' }}>
          Tạo và quản lý tài khoản nhân viên trong hệ thống. Hỗ trợ khóa/mở khóa, reset mật khẩu và phân quyền vai trò.
        </p>
      </div>

      {/* Role Legend */}
      <div className="card" style={{ padding: 'var(--spacing-4)', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginRight: '0.5rem' }}>
          <Shield size={16} className="text-primary" />
          <span style={{ fontSize: '0.825rem', fontWeight: 600 }}>Bảng vai trò & màu sắc:</span>
        </div>
        {(Object.keys(ROLE_LABELS) as UserRole[]).map(r => (
          <div key={r} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: ROLE_COLORS[r] }} />
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{ROLE_LABELS[r]}</span>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 'var(--spacing-6)', alignItems: 'start' }}>
        
        {/* Left Side: Users List */}
        <div className="card" style={{ padding: 'var(--spacing-6)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--spacing-4)' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <UsersIcon size={18} className="text-primary" />
              <span>Danh sách tài khoản hệ thống</span>
            </h3>
            <span className="text-muted" style={{ fontSize: '0.825rem' }}>Tổng số: {users.length} tài khoản</span>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Đang tải...</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Họ và tên</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Email</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Vai trò</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Trạng thái</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} style={{ borderBottom: '1px solid var(--border)', fontSize: '0.875rem' }}>
                      <td style={{ padding: '0.75rem 0.5rem', fontWeight: 500 }}>{u.name}</td>
                      <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-muted)' }}>{u.email}</td>
                      <td style={{ padding: '0.75rem 0.5rem', position: 'relative' }}>
                        <button
                          onClick={() => setRoleDropdown(roleDropdown === u.id ? null : u.id)}
                          style={{
                            padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem',
                            backgroundColor: `${ROLE_COLORS[u.role]}15`,
                            color: ROLE_COLORS[u.role],
                            fontWeight: 500,
                            border: `1px solid ${ROLE_COLORS[u.role]}30`,
                            cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '0.25rem',
                          }}
                        >
                          {ROLE_LABELS[u.role] || u.role}
                          <ChevronDown size={12} />
                        </button>
                        {roleDropdown === u.id && (
                          <div style={{
                            position: 'absolute', top: '100%', left: '0.5rem', zIndex: 10,
                            backgroundColor: 'var(--bg-card, #fff)', border: '1px solid var(--border)',
                            borderRadius: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                            overflow: 'hidden', minWidth: '180px',
                          }}>
                            {(Object.keys(ROLE_LABELS) as UserRole[]).filter(r => r !== 'CUSTOMER').map(r => (
                              <button
                                key={r}
                                onClick={() => handleUpdateRole(u.id, r)}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                                  width: '100%', padding: '0.5rem 0.75rem', border: 'none',
                                  background: u.role === r ? `${ROLE_COLORS[r]}15` : 'transparent',
                                  cursor: 'pointer', fontSize: '0.8rem', textAlign: 'left',
                                  color: u.role === r ? ROLE_COLORS[r] : 'inherit',
                                  fontWeight: u.role === r ? 600 : 400,
                                }}
                              >
                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: ROLE_COLORS[r] }} />
                                {ROLE_LABELS[r]}
                              </button>
                            ))}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        {u.isLocked ? (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                            padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem',
                            backgroundColor: '#fef2f2', color: '#dc2626', fontWeight: 600,
                            border: '1px solid #fecaca',
                          }}>
                            <Lock size={12} /> Đã khóa
                          </span>
                        ) : (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                            padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem',
                            backgroundColor: '#f0fdf4', color: '#16a34a', fontWeight: 600,
                            border: '1px solid #bbf7d0',
                          }}>
                            <Unlock size={12} /> Hoạt động
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            onClick={() => handleToggleLock(u.id)}
                            title={u.isLocked ? 'Mở khóa' : 'Khóa tài khoản'}
                            className="btn btn-outline"
                            style={{
                              padding: '0.25rem 0.5rem', fontSize: '0.7rem',
                              display: 'flex', alignItems: 'center', gap: '0.2rem',
                              borderColor: u.isLocked ? '#16a34a' : '#f59e0b',
                              color: u.isLocked ? '#16a34a' : '#f59e0b',
                            }}
                          >
                            {u.isLocked ? <><Unlock size={12} /> Mở</> : <><Lock size={12} /> Khóa</>}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleResetPassword(u.id, u.name)}
                            title="Reset mật khẩu"
                            className="btn btn-outline"
                            style={{
                              padding: '0.25rem 0.5rem', fontSize: '0.7rem',
                              display: 'flex', alignItems: 'center', gap: '0.2rem',
                              borderColor: '#6366f1', color: '#6366f1',
                            }}
                          >
                            <KeyRound size={12} /> Reset MK
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(u.id)}
                            className="btn btn-outline"
                            style={{
                              padding: '0.25rem 0.5rem', fontSize: '0.7rem',
                              display: 'flex', alignItems: 'center', gap: '0.2rem',
                              borderColor: 'var(--color-danger-500)', color: 'var(--color-danger-500)',
                            }}
                          >
                            <Trash2 size={12} /> Xóa
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Side: Create User Form */}
        <div className="card" style={{ padding: 'var(--spacing-6)' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: 'var(--spacing-4)' }}>
            <UserPlus size={18} className="text-primary" />
            <span>Tạo tài khoản mới</span>
          </h3>

          <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Họ và tên</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nhập tên nhân viên..."
                required
                className="input"
                style={{ padding: '0.5rem', width: '100%', backgroundColor: 'var(--bg-light)', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--text)', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Email đăng nhập</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nhanvien@sfwms.vn"
                required
                className="input"
                style={{ padding: '0.5rem', width: '100%', backgroundColor: 'var(--bg-light)', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--text)', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Mật khẩu</label>
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                style={{ padding: '0.5rem', width: '100%', backgroundColor: 'var(--bg-light)', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--text)', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Vai trò</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="input"
                style={{ padding: '0.5rem', width: '100%', backgroundColor: 'var(--bg-light)', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--text)', outline: 'none', boxSizing: 'border-box' }}
              >
                <option value="ADMIN">Quản trị viên (Emerald Green)</option>
                <option value="WAREHOUSE_MANAGER">Quản lý kho (Teal)</option>
                <option value="WAREHOUSE_STAFF">Nhân viên kho (Ocean Blue)</option>
                <option value="SALES_STAFF">Nhân viên bán hàng (Amber)</option>
                <option value="DRIVER">Tài xế (Violet)</option>
              </select>
            </div>

            {successMsg && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#10b981', fontSize: '0.825rem' }}>
                <CheckCircle size={16} />
                <span>{successMsg}</span>
              </div>
            )}

            {errorMsg && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ef4444', fontSize: '0.825rem' }}>
                <span>{errorMsg}</span>
              </div>
            )}

            <button type="submit" className="btn btn-primary" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
              <UserPlus size={16} /> Lưu tài khoản
            </button>
          </form>
        </div>

      </div>

      {/* Reset Password Modal */}
      {resetModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div className="card" style={{ width: '420px', maxWidth: '90%', padding: '1.5rem', textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <KeyRound size={24} style={{ color: '#6366f1' }} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Mật khẩu đã được reset</h3>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Mật khẩu mới của <strong>{resetModal.userName}</strong>:
            </p>
            <div style={{
              padding: '0.75rem 1rem', borderRadius: '8px', fontSize: '1.25rem',
              fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.15em',
              backgroundColor: '#f0fdf4', border: '2px dashed #86efac', color: '#16a34a',
              marginBottom: '1rem', userSelect: 'all',
            }}>
              {resetModal.newPassword}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center', marginBottom: '1rem' }}>
              <AlertCircle size={14} style={{ color: '#f59e0b' }} />
              <span style={{ fontSize: '0.75rem', color: '#f59e0b' }}>Hãy sao chép và gửi mật khẩu cho người dùng. Sau khi đóng sẽ không thể xem lại.</span>
            </div>
            <button
              onClick={() => setResetModal(null)}
              className="btn btn-primary"
              style={{ width: '100%' }}
            >
              Đã hiểu, đóng lại
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
