import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth, ROLE_LABELS, ROLE_COLORS } from '../contexts/AuthContext';
import type { UserRole } from '../contexts/AuthContext';
import { Leaf, Eye, EyeOff, LogIn, AlertCircle, Phone, KeyRound, X, Check, RefreshCw, Lock } from 'lucide-react';

const DEMO_ACCOUNTS: { email: string; password: string; name: string; role: UserRole; tag?: string }[] = [
  { email: '0377019958', password: 'password123', name: 'Lê Công Chung', role: 'ADMIN', tag: 'Master Admin / Toàn quyền (0377019958)' },
  { email: 'admin@sfwms.vn', password: 'password123', name: 'Nguyễn Chi Tường', role: 'ADMIN', tag: 'Admin Tổng (16 kho)' },
  { email: 'govap@sfwms.vn', password: 'password123', name: 'Nguyễn Hoàng Nam', role: 'WAREHOUSE_MANAGER', tag: 'Quản Lý Kho Gò Vấp (WH-006)' },
  { email: 'manager@sfwms.vn', password: 'password123', name: 'Trần Văn Bình', role: 'WAREHOUSE_MANAGER', tag: 'Quản Lý Kho Bình Thạnh (WH-005)' },
  { email: 'staff@sfwms.vn', password: 'password123', name: 'Lê Thị Hoa', role: 'WAREHOUSE_STAFF', tag: 'Nhân Viên Kho Gò Vấp (PDA)' },
  { email: 'driver@sfwms.vn', password: 'password123', name: 'Võ Thanh Tùng', role: 'DRIVER', tag: 'Tài Xế Giao Hàng' },
  { email: 'sales@sfwms.vn', password: 'password123', name: 'Phạm Minh Đức', role: 'SALES_STAFF', tag: 'Kinh Doanh & Đơn Hàng' },
  { email: 'customer@sfwms.vn', password: 'password123', name: 'Khách hàng Thử Nghiệm', role: 'CUSTOMER', tag: 'Sàn Mua Sắm TMĐT' },
];

const LoginPage: React.FC = () => {
  const { login, isAuthenticated, user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Forgot Password Modal State
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotPhone, setForgotPhone] = useState('');
  const [forgotDigits, setForgotDigits] = useState(['', '', '', '', '', '']);
  const [forgotNewPass, setForgotNewPass] = useState('');
  const [forgotConfirmPass, setForgotConfirmPass] = useState('');
  const [showForgotNewPass, setShowForgotNewPass] = useState(false);
  const [forgotCooldown, setForgotCooldown] = useState(0);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');

  React.useEffect(() => {
    if (forgotCooldown > 0) {
      const timer = setTimeout(() => setForgotCooldown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [forgotCooldown]);

  const handleForgotDigitChange = (index: number, val: string) => {
    const clean = val.replace(/\D/g, '');
    if (!clean) {
      const next = [...forgotDigits];
      next[index] = '';
      setForgotDigits(next);
      return;
    }
    const next = [...forgotDigits];
    next[index] = clean.slice(-1);
    setForgotDigits(next);
    if (forgotError) setForgotError('');
    if (index < 5) {
      document.getElementById(`web-forgot-digit-${index + 1}`)?.focus();
    }
  };

  const handleForgotDigitKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !forgotDigits[index] && index > 0) {
      document.getElementById(`web-forgot-digit-${index - 1}`)?.focus();
    }
  };

  const handleForgotPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length > 0) {
      const next = ['', '', '', '', '', ''];
      for (let i = 0; i < pasted.length; i++) {
        next[i] = pasted[i];
      }
      setForgotDigits(next);
      if (forgotError) setForgotError('');
      const targetIdx = Math.min(5, pasted.length);
      document.getElementById(`web-forgot-digit-${targetIdx}`)?.focus();
    }
  };

  const handleSendForgotOtp = async () => {
    const cleanPhone = forgotPhone.trim();
    if (!cleanPhone || cleanPhone.length < 9) {
      setForgotError('Vui lòng nhập số điện thoại hợp lệ (10 chữ số)');
      return;
    }
    setForgotLoading(true);
    setForgotError('');
    setForgotSuccess('');
    try {
      const res = await fetch('http://localhost:3012/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone, actionType: 'RESET_PASSWORD' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Lỗi khi gửi mã xác thực!');
      setForgotCooldown(data.cooldownSeconds || 60);
      setForgotSuccess(`Mã xác thực 6 chữ số đã được gửi qua tin nhắn SMS.${data.otpCode ? ` (Mã: ${data.otpCode})` : ''}`);
    } catch (err: any) {
      setForgotError(err.message || 'Lỗi khi gửi mã xác thực');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleConfirmResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = forgotPhone.trim();
    const cleanOtp = forgotDigits.join('');
    const cleanPass = forgotNewPass.trim();

    if (!cleanOtp || cleanOtp.length < 6) {
      setForgotError('Vui lòng nhập đủ 6 chữ số mã xác thực');
      return;
    }
    if (!cleanPass || cleanPass.length < 6) {
      setForgotError('Mật khẩu mới phải có tối thiểu 6 ký tự');
      return;
    }
    if (cleanPass !== forgotConfirmPass.trim()) {
      setForgotError('Xác nhận mật khẩu mới không khớp');
      return;
    }

    setForgotLoading(true);
    setForgotError('');
    try {
      const res = await fetch('http://localhost:3012/auth/forgot-password/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone, otpCode: cleanOtp, newPassword: cleanPass }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Lỗi khi đặt lại mật khẩu');
      setForgotSuccess('Đổi mật khẩu thành công! Bạn có thể đăng nhập ngay.');
      setPassword(cleanPass);
      setTimeout(() => {
        setShowForgotModal(false);
        setForgotPhone('');
        setForgotDigits(['', '', '', '', '', '']);
        setForgotNewPass('');
        setForgotConfirmPass('');
        setForgotSuccess('');
      }, 1500);
    } catch (err: any) {
      setForgotError(err.message || 'Lỗi khi đặt lại mật khẩu');
    } finally {
      setForgotLoading(false);
    }
  };

  if (isAuthenticated) {
    if (user?.role === 'CUSTOMER') {
      return <Navigate to="/store" replace />;
    }
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
            padding: '16px 24px', borderRadius: 20,
            background: '#ffffff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1.5rem', boxShadow: '0 12px 36px rgba(0,0,0,0.25)',
          }}>
            <img src="/logos/logo_full.png" alt="C.T Mart Logo" style={{ height: '56px', width: 'auto', objectFit: 'contain' }} />
          </div>
          <h1 style={{ color: '#fff', fontSize: '2.2rem', fontWeight: 800, marginBottom: '0.75rem', letterSpacing: '-0.02em' }}>
            Hệ Thống Kho Thông Minh
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '1.05rem', lineHeight: 1.6 }}>
            Nền tảng quản trị chuỗi cung ứng & logistics C.T Mart
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <label style={{ color: '#cbd5e1', fontSize: '0.825rem', fontWeight: 500 }}>
                  Mật khẩu
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotModal(true);
                    setForgotError('');
                    setForgotSuccess('');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#38bdf8',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  Quên mật khẩu?
                </button>
              </div>
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ color: '#e2e8f0', fontSize: '0.8rem', fontWeight: 600 }}>{acc.name}</span>
                      {acc.tag && (
                        <span style={{ fontSize: '0.65rem', padding: '1px 6px', borderRadius: 4, background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', fontWeight: 700 }}>
                          {acc.tag}
                        </span>
                      )}
                    </div>
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

      {/* SMS OTP Forgot Password Modal */}
      {showForgotModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            zIndex: 9999,
          }}
        >
          <div
            style={{
              background: '#1e293b',
              border: '1px solid rgba(148, 163, 184, 0.2)',
              borderRadius: 12,
              padding: '1.5rem',
              width: '100%',
              maxWidth: 420,
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(2, 132, 199, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <KeyRound size={20} color="#38bdf8" />
                </div>
                <div>
                  <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '1rem', fontWeight: 700 }}>
                    Khôi Phục Mật Khẩu
                  </h3>
                  <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.75rem' }}>
                    Nhập số điện thoại để nhận mã xác thực bảo mật
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 4 }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Error & Success Feedback */}
            {forgotError && (
              <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 8, padding: '0.6rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fca5a5', fontSize: '0.8rem' }}>
                <AlertCircle size={15} />
                <span>{forgotError}</span>
              </div>
            )}

            {forgotSuccess && (
              <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 8, padding: '0.6rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#6ee7b7', fontSize: '0.8rem' }}>
                <Check size={15} />
                <span>{forgotSuccess}</span>
              </div>
            )}

            <form onSubmit={handleConfirmResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {/* Phone Input Row */}
              <div>
                <label style={{ color: '#cbd5e1', fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                  Số điện thoại tài khoản
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <Phone size={15} color="#64748b" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      type="tel"
                      required
                      placeholder="VD: 0908123456..."
                      value={forgotPhone}
                      onChange={e => {
                        setForgotPhone(e.target.value);
                        if (forgotError) setForgotError('');
                      }}
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.75rem 0.65rem 2rem',
                        background: 'rgba(15, 23, 42, 0.6)',
                        border: '1px solid rgba(148, 163, 184, 0.2)',
                        borderRadius: 8,
                        color: '#f8fafc',
                        fontSize: '0.85rem',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    disabled={forgotLoading || forgotCooldown > 0}
                    onClick={handleSendForgotOtp}
                    style={{
                      padding: '0.65rem 0.9rem',
                      background: forgotCooldown > 0 ? '#334155' : '#0284c7',
                      color: forgotCooldown > 0 ? '#94a3b8' : '#ffffff',
                      border: 'none',
                      borderRadius: 8,
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: forgotCooldown > 0 || forgotLoading ? 'not-allowed' : 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {forgotCooldown > 0 ? `Gửi lại (${forgotCooldown}s)` : 'Nhận mã'}
                  </button>
                </div>
              </div>

              {/* Segmented 6-digit PIN Box Input */}
              <div>
                <label style={{ color: '#cbd5e1', fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                  Mã xác thực
                </label>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                  {forgotDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      id={`web-forgot-digit-${idx}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={e => handleForgotDigitChange(idx, e.target.value)}
                      onKeyDown={e => handleForgotDigitKeyDown(idx, e)}
                      onPaste={handleForgotPaste}
                      style={{
                        width: '44px',
                        height: '46px',
                        textAlign: 'center',
                        fontSize: '1.25rem',
                        fontWeight: 700,
                        color: '#38bdf8',
                        background: 'rgba(15, 23, 42, 0.7)',
                        border: digit ? '1.5px solid #0284c7' : '1px solid rgba(148, 163, 184, 0.25)',
                        borderRadius: 8,
                        outline: 'none',
                        boxSizing: 'border-box',
                        transition: 'border-color 0.15s',
                      }}
                      onFocus={e => (e.target.style.borderColor = '#38bdf8')}
                      onBlur={e => (e.target.style.borderColor = digit ? '#0284c7' : 'rgba(148, 163, 184, 0.25)')}
                    />
                  ))}
                </div>
              </div>

              {/* New Password */}
              <div>
                <label style={{ color: '#cbd5e1', fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                  Mật khẩu mới (tối thiểu 6 ký tự)
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={15} color="#64748b" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type={showForgotNewPass ? 'text' : 'password'}
                    required
                    placeholder="Nhập mật khẩu mới..."
                    value={forgotNewPass}
                    onChange={e => {
                      setForgotNewPass(e.target.value);
                      if (forgotError) setForgotError('');
                    }}
                    style={{
                      width: '100%',
                      padding: '0.65rem 2.2rem 0.65rem 2rem',
                      background: 'rgba(15, 23, 42, 0.6)',
                      border: '1px solid rgba(148, 163, 184, 0.2)',
                      borderRadius: 8,
                      color: '#f8fafc',
                      fontSize: '0.85rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowForgotNewPass(!showForgotNewPass)}
                    style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 0 }}
                  >
                    {showForgotNewPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label style={{ color: '#cbd5e1', fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                  Xác nhận lại mật khẩu mới
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={15} color="#64748b" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type={showForgotNewPass ? 'text' : 'password'}
                    required
                    placeholder="Nhập lại mật khẩu mới..."
                    value={forgotConfirmPass}
                    onChange={e => {
                      setForgotConfirmPass(e.target.value);
                      if (forgotError) setForgotError('');
                    }}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.75rem 0.65rem 2rem',
                      background: 'rgba(15, 23, 42, 0.6)',
                      border: '1px solid rgba(148, 163, 184, 0.2)',
                      borderRadius: 8,
                      color: '#f8fafc',
                      fontSize: '0.85rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  style={{
                    flex: 1,
                    padding: '0.7rem',
                    background: '#334155',
                    color: '#cbd5e1',
                    border: 'none',
                    borderRadius: 8,
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  disabled={forgotLoading}
                  style={{
                    flex: 2,
                    padding: '0.7rem',
                    background: forgotLoading ? '#475569' : '#10b981',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 8,
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: forgotLoading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                  }}
                >
                  {forgotLoading ? (
                    <>
                      <RefreshCw size={15} style={{ animation: 'spin 1s linear infinite' }} />
                      <span>Đang cập nhật...</span>
                    </>
                  ) : (
                    <span>Đổi Mật Khẩu Ngay</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
