import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth, ROLE_LABELS, ROLE_COLORS } from '../contexts/AuthContext';
import type { UserRole } from '../contexts/AuthContext';
import { Leaf, Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react';

const DEMO_ACCOUNTS: { email: string; password: string; name: string; role: UserRole }[] = [
  { email: 'admin@sfwms.vn', password: 'password123', name: 'Nguyễn Chi Tường', role: 'ADMIN' },
  { email: 'manager@sfwms.vn', password: 'password123', name: 'Trần Văn Bình', role: 'WAREHOUSE_MANAGER' },
  { email: 'staff@sfwms.vn', password: 'password123', name: 'Lê Thị Hoa', role: 'WAREHOUSE_STAFF' },
  { email: 'sales@sfwms.vn', password: 'password123', name: 'Phạm Minh Đức', role: 'SALES_STAFF' },
  { email: 'driver@sfwms.vn', password: 'password123', name: 'Võ Thanh Tùng', role: 'DRIVER' },
];

const LoginPage: React.FC = () => {
  const { login, isAuthenticated } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Đăng nhập thất bại. Kiểm tra lại email và mật khẩu.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (account: typeof DEMO_ACCOUNTS[0]) => {
    setEmail(account.email);
    setPassword(account.password);
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      {/* Left Panel – Branding */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '3rem',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Animated background circles */}
        <div style={{
          position: 'absolute', width: 400, height: 400, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(16,185,129,0.15) 0%, transparent 70%)',
          top: '10%', left: '10%', animation: 'pulse 4s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute', width: 300, height: 300, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(14,165,233,0.1) 0%, transparent 70%)',
          bottom: '15%', right: '15%', animation: 'pulse 5s ease-in-out infinite 1s',
        }} />

        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: 420 }}>
          <div style={{
            width: 80, height: 80, borderRadius: 20,
            background: 'linear-gradient(135deg, #10b981, #059669)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1.5rem', boxShadow: '0 8px 32px rgba(16,185,129,0.3)',
          }}>
            <Leaf size={40} color="#fff" />
          </div>
          <h1 style={{ color: '#fff', fontSize: '2.5rem', fontWeight: 700, marginBottom: '0.75rem' }}>
            CityMart
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '1.1rem', lineHeight: 1.6 }}>
            Hệ thống quản lý kho thực phẩm thông minh
          </p>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '0.5rem' }}>
            Giám sát IoT · Cảnh báo AI · Tối ưu FEFO · Vận chuyển thông minh
          </p>
        </div>
      </div>

      {/* Right Panel – Login Form */}
      <div style={{
        width: 520,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '3rem',
        background: 'rgba(30,41,59,0.6)',
        backdropFilter: 'blur(20px)',
        borderLeft: '1px solid rgba(148,163,184,0.1)',
      }}>
        <div style={{ maxWidth: 400, margin: '0 auto', width: '100%' }}>
          <h2 style={{ color: '#f1f5f9', fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            Đăng nhập
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '2rem' }}>
            Nhập thông tin tài khoản để truy cập hệ thống
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Email */}
            <div>
              <label style={{ color: '#cbd5e1', fontSize: '0.825rem', fontWeight: 500, display: 'block', marginBottom: '0.5rem' }}>
                Email đăng nhập
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@sfwms.vn"
                required
                style={{
                  width: '100%', padding: '0.75rem 1rem', borderRadius: 8,
                  border: '1px solid rgba(148,163,184,0.2)', background: 'rgba(15,23,42,0.6)',
                  color: '#f1f5f9', fontSize: '0.9rem', outline: 'none',
                  transition: 'border-color 0.2s',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => e.target.style.borderColor = '#10b981'}
                onBlur={(e) => e.target.style.borderColor = 'rgba(148,163,184,0.2)'}
              />
            </div>

            {/* Password */}
            <div>
              <label style={{ color: '#cbd5e1', fontSize: '0.825rem', fontWeight: 500, display: 'block', marginBottom: '0.5rem' }}>
                Mật khẩu
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  style={{
                    width: '100%', padding: '0.75rem 2.5rem 0.75rem 1rem', borderRadius: 8,
                    border: '1px solid rgba(148,163,184,0.2)', background: 'rgba(15,23,42,0.6)',
                    color: '#f1f5f9', fontSize: '0.9rem', outline: 'none',
                    transition: 'border-color 0.2s',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#10b981'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(148,163,184,0.2)'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 0,
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.75rem 1rem', borderRadius: 8,
                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                color: '#fca5a5', fontSize: '0.825rem',
              }}>
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '0.8rem', borderRadius: 8, border: 'none',
                background: loading ? '#475569' : 'linear-gradient(135deg, #10b981, #059669)',
                color: '#fff', fontSize: '0.9rem', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                transition: 'all 0.2s', boxShadow: loading ? 'none' : '0 4px 16px rgba(16,185,129,0.3)',
              }}
            >
              <LogIn size={18} />
              {loading ? 'Đang xác thực...' : 'Đăng nhập'}
            </button>
          </form>

          {/* Demo Accounts */}
          <div style={{ marginTop: '2rem', borderTop: '1px solid rgba(148,163,184,0.1)', paddingTop: '1.5rem' }}>
            <p style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 500, marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Tài khoản thử nghiệm
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => handleQuickLogin(acc)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    padding: '0.6rem 0.75rem', borderRadius: 8,
                    background: email === acc.email ? 'rgba(148,163,184,0.1)' : 'transparent',
                    border: '1px solid',
                    borderColor: email === acc.email ? ROLE_COLORS[acc.role] : 'rgba(148,163,184,0.1)',
                    cursor: 'pointer', transition: 'all 0.2s', width: '100%', textAlign: 'left',
                  }}
                >
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: ROLE_COLORS[acc.role], flexShrink: 0,
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: '#e2e8f0', fontSize: '0.8rem', fontWeight: 500 }}>{acc.name}</div>
                    <div style={{ color: '#64748b', fontSize: '0.7rem' }}>{acc.email}</div>
                  </div>
                  <span style={{
                    fontSize: '0.65rem', padding: '0.15rem 0.4rem', borderRadius: 4,
                    background: `${ROLE_COLORS[acc.role]}20`, color: ROLE_COLORS[acc.role],
                    fontWeight: 500, whiteSpace: 'nowrap',
                  }}>
                    {ROLE_LABELS[acc.role]}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Keyframe animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.1); opacity: 0.8; }
        }
      `}</style>
    </div>
  );
};

export default LoginPage;
