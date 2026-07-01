import React, { useState, useEffect } from 'react';
import { Users as UsersIcon, UserPlus, CheckCircle, Trash2, Shield } from 'lucide-react';
import { useAuth, ROLE_LABELS, ROLE_COLORS } from '../contexts/AuthContext';
import type { UserRole } from '../contexts/AuthContext';

interface SystemUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-6)' }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.25rem' }}>Quản lý người dùng</h2>
        <p className="text-muted" style={{ fontSize: '0.875rem' }}>
          Tạo và quản lý tài khoản nhân viên trong hệ thống. Mỗi vai trò có giao diện màu sắc và quyền hạn riêng.
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
                    <th style={{ padding: '0.75rem 0.5rem' }}>Chủ đề màu</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} style={{ borderBottom: '1px solid var(--border)', fontSize: '0.875rem' }}>
                      <td style={{ padding: '0.75rem 0.5rem', fontWeight: 500 }}>{u.name}</td>
                      <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-muted)' }}>{u.email}</td>
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        <span style={{
                          padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem',
                          backgroundColor: `${ROLE_COLORS[u.role]}15`,
                          color: ROLE_COLORS[u.role],
                          fontWeight: 500,
                        }}>
                          {ROLE_LABELS[u.role] || u.role}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: ROLE_COLORS[u.role] }} />
                          <span style={{ fontSize: '0.825rem' }}>
                            {u.role === 'ADMIN' ? 'Xanh Emerald' :
                             u.role === 'WAREHOUSE_MANAGER' ? 'Xanh Teal' :
                             u.role === 'WAREHOUSE_STAFF' ? 'Xanh Ocean' :
                             u.role === 'SALES_STAFF' ? 'Amber Vàng đồng' : 'Tím Violet'}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        <button
                          type="button"
                          onClick={() => handleDeleteUser(u.id)}
                          className="btn btn-outline"
                          style={{ padding: '0.25rem 0.5rem', borderColor: 'var(--color-danger-500)', color: 'var(--color-danger-500)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                        >
                          <Trash2 size={12} /> Xóa
                        </button>
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
    </div>
  );
};

export default Users;
