import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
  Info,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() && !password.trim()) {
      setErrorMsg('Vui lòng nhập đầy đủ Email tài khoản và Mật khẩu!');
      return;
    }
    if (!email.trim()) {
      setErrorMsg('Vui lòng nhập Email tài khoản nhân viên!');
      return;
    }
    if (!password.trim()) {
      setErrorMsg('Vui lòng nhập Mật khẩu!');
      return;
    }

    setErrorMsg(null);
    setIsSubmitting(true);

    const result = await login(email, password);
    setIsSubmitting(false);

    if (result.success) {
      navigate('/');
    } else {
      setErrorMsg(
        result.message || 'Tài khoản hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại!'
      );
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '24px 18px',
        backgroundColor: '#f1f5f9',
        color: '#0f172a',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '24px',
          padding: '36px 24px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 20px 45px -10px rgba(0, 0, 0, 0.08), 0 10px 20px -5px rgba(0, 0, 0, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
        }}
      >
        {/* CityMart Official Brand Logo & Header */}
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="72" height="72" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="100" height="100" rx="22" fill="url(#citymartGrad)" />
              <defs>
                <linearGradient id="citymartGrad" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#008848" />
                  <stop offset="1" stopColor="#059669" />
                </linearGradient>
                <linearGradient id="leafGrad" x1="50" y1="20" x2="75" y2="45" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#f59e0b" />
                  <stop offset="1" stopColor="#fbbf24" />
                </linearGradient>
              </defs>
              {/* Shopping Cart Body */}
              <path
                d="M24 30H32L39 58H70L78 38H36"
                stroke="#ffffff"
                strokeWidth="4.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="43" cy="69" r="5" fill="#ffffff" />
              <circle cx="66" cy="69" r="5" fill="#ffffff" />
              {/* Fresh Food Leaf Symbol */}
              <path
                d="M52 22C64 22 72 30 72 40C60 40 52 30 52 22Z"
                fill="url(#leafGrad)"
              />
              <path
                d="M52 40C52 32 60 26 70 24"
                stroke="#ffffff"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <span style={{ fontSize: '24px', fontWeight: 900, color: '#008848', letterSpacing: '-0.5px' }}>
                City<span style={{ color: '#f59e0b' }}>Mart</span>
              </span>
              <span style={{ fontSize: '11px', backgroundColor: '#ecfdf5', color: '#059669', padding: '3px 8px', borderRadius: '8px', fontWeight: 800, border: '1px solid #a7f3d0' }}>
                STAFF APP
              </span>
            </div>
            <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: '#64748b', fontWeight: 600 }}>
              Hệ Thống Quản Lý Kho & Vận Hành Thực Phẩm
            </p>
          </div>
        </div>

        {/* Prominent Error Alert Banner */}
        {errorMsg && (
          <div
            style={{
              backgroundColor: '#fef2f2',
              border: '1.5px solid #fecaca',
              color: '#b91c1c',
              padding: '13px 16px',
              borderRadius: '14px',
              fontSize: '12.5px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              boxShadow: '0 4px 12px rgba(239, 68, 68, 0.08)',
              animation: 'fadeIn 0.2s ease-in-out',
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0, color: '#dc2626' }} />
            <div style={{ lineHeight: 1.4 }}>{errorMsg}</div>
          </div>
        )}

        {/* Light Theme Login Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#334155', marginBottom: '7px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
              Email Tài Khoản Nhân Viên
            </label>
            <div style={{ position: 'relative' }}>
              <Mail style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} size={18} />
              <input
                type="email"
                required
                value={email}
                onChange={e => {
                  setEmail(e.target.value);
                  if (errorMsg) setErrorMsg(null);
                }}
                placeholder="VD: staff@sfwms.vn hoặc nv.kho@sfwms.vn"
                style={{
                  width: '100%',
                  padding: '13px 14px 13px 44px',
                  backgroundColor: '#f8fafc',
                  border: errorMsg ? '1.5px solid #f87171' : '1.5px solid #cbd5e1',
                  borderRadius: '14px',
                  color: '#0f172a',
                  fontSize: '14px',
                  fontWeight: 600,
                  outline: 'none',
                  transition: 'all 0.2s ease',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#008848')}
                onBlur={(e) => (e.target.style.borderColor = errorMsg ? '#f87171' : '#cbd5e1')}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#334155', marginBottom: '7px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
              Mật Khẩu Đăng Nhập
            </label>
            <div style={{ position: 'relative' }}>
              <Lock style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} size={18} />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={e => {
                  setPassword(e.target.value);
                  if (errorMsg) setErrorMsg(null);
                }}
                placeholder="Nhập mật khẩu..."
                style={{
                  width: '100%',
                  padding: '13px 44px 13px 44px',
                  backgroundColor: '#f8fafc',
                  border: errorMsg ? '1.5px solid #f87171' : '1.5px solid #cbd5e1',
                  borderRadius: '14px',
                  color: '#0f172a',
                  fontSize: '14px',
                  fontWeight: 600,
                  outline: 'none',
                  transition: 'all 0.2s ease',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#008848')}
                onBlur={(e) => (e.target.style.borderColor = errorMsg ? '#f87171' : '#cbd5e1')}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              padding: '15px',
              background: 'linear-gradient(135deg, #008848 0%, #059669 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '14px',
              fontSize: '15px',
              fontWeight: 800,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              boxShadow: '0 8px 20px rgba(0, 136, 72, 0.35)',
              marginTop: '8px',
              transition: 'all 0.2s ease',
            }}
          >
            {isSubmitting ? (
              <>
                <RefreshCw size={19} style={{ animation: 'spin 1s linear infinite' }} />
                <span>Đang kiểm tra tài khoản...</span>
              </>
            ) : (
              <>
                <span>Đăng Nhập Vào Kho Trực Thuộc</span>
                <ArrowRight size={19} />
              </>
            )}
          </button>
        </form>

        {/* Helpful note for staff */}
        <div
          style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '14px',
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px',
            fontSize: '11.5px',
            color: '#64748b',
            lineHeight: 1.45,
          }}
        >
          <Info size={16} color="#059669" style={{ flexShrink: 0, marginTop: '2px' }} />
          <span>
            Tài khoản nhân viên trực kho do Quản lý kho cấp từ Web Dashboard. Nếu quên mật khẩu, vui lòng liên hệ Trưởng ca trực.
          </span>
        </div>

        {/* Security Footer Notice */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '11.5px', color: '#94a3b8', fontWeight: 600 }}>
          <ShieldCheck size={15} color="#008848" />
          <span>Bảo mật JWT 24h & Khóa kho độc quyền</span>
        </div>
      </div>
    </div>
  );
};

