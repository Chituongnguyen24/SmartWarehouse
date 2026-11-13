import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
  Info,
  Server,
  Check,
  CheckSquare,
  Square,
  Phone,
  KeyRound,
  X,
} from 'lucide-react';
import { useAuth } from '@/features/auth';
import { getBackendHost, setBackendHost } from '@/shared';
import { sendOtpApi, forgotPasswordConfirmApi } from '@/shared';

export const Login: React.FC = () => {
  const { login, rememberedAccount } = useAuth();
  const navigate = useNavigate();

  const [account, setAccount] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [currentHost, setCurrentHost] = useState<string>(() => getBackendHost());
  const [showServerModal, setShowServerModal] = useState<boolean>(false);
  const [customHostInput, setCustomHostInput] = useState<string>('');

  // Forgot Password SMS OTP Modal State
  const [showForgotModal, setShowForgotModal] = useState<boolean>(false);
  const [forgotPhone, setForgotPhone] = useState<string>('');
  const [forgotDigits, setForgotDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [forgotNewPass, setForgotNewPass] = useState<string>('');
  const [forgotConfirmPass, setForgotConfirmPass] = useState<string>('');
  const [showForgotNewPass, setShowForgotNewPass] = useState<boolean>(false);
  const [forgotCooldown, setForgotCooldown] = useState<number>(0);
  const [forgotLoading, setForgotLoading] = useState<boolean>(false);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null);
  const [otpSent, setOtpSent] = useState<boolean>(false);

  const handleForgotDigitChange = (index: number, val: string) => {
    const char = val.replace(/\D/g, '').slice(-1);
    const next = [...forgotDigits];
    next[index] = char;
    setForgotDigits(next);
    if (forgotError) setForgotError(null);
    if (char && index < 5) {
      const nextInput = document.getElementById(`staff-forgot-digit-${index + 1}`) as HTMLInputElement | null;
      if (nextInput) nextInput.focus();
    }
  };

  const handleForgotDigitKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !forgotDigits[index] && index > 0) {
      const prevInput = document.getElementById(`staff-forgot-digit-${index - 1}`) as HTMLInputElement | null;
      if (prevInput) {
        prevInput.focus();
        const next = [...forgotDigits];
        next[index - 1] = '';
        setForgotDigits(next);
      }
    }
  };

  const handleForgotPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasteText = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasteText) {
      const next = [...forgotDigits];
      for (let i = 0; i < 6; i++) {
        next[i] = pasteText[i] || '';
      }
      setForgotDigits(next);
      const targetIdx = Math.min(pasteText.length, 5);
      const targetInput = document.getElementById(`staff-forgot-digit-${targetIdx}`) as HTMLInputElement | null;
      if (targetInput) targetInput.focus();
    }
  };

  // 60-second cooldown timer for SMS OTP
  useEffect(() => {
    if (forgotCooldown > 0) {
      const timer = setTimeout(() => setForgotCooldown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [forgotCooldown]);

  const handleSendForgotOtp = async () => {
    const cleanPhone = forgotPhone.trim();
    if (!cleanPhone || cleanPhone.length < 9) {
      setForgotError('Vui lòng nhập số điện thoại hợp lệ (10 chữ số)');
      return;
    }
    setForgotLoading(true);
    setForgotError(null);
    setForgotSuccess(null);
    try {
      const res = await sendOtpApi(cleanPhone, 'RESET_PASSWORD');
      setOtpSent(true);
      setForgotCooldown(res.cooldownSeconds || 60);
      setForgotSuccess(`Mã xác thực đã được gửi qua SMS đến số điện thoại của bạn!${res.otpCode ? ` (Mã: ${res.otpCode})` : ''}`);
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
    setForgotError(null);
    try {
      await forgotPasswordConfirmApi(cleanPhone, cleanOtp, cleanPass);
      setForgotSuccess('Đổi mật khẩu thành công! Bạn có thể đăng nhập ngay.');
      setPassword(cleanPass);
      if (account !== cleanPhone) setAccount(cleanPhone);
      setTimeout(() => {
        setShowForgotModal(false);
        setForgotPhone('');
        setForgotDigits(['', '', '', '', '', '']);
        setForgotNewPass('');
        setForgotConfirmPass('');
        setOtpSent(false);
        setForgotSuccess(null);
      }, 1500);
    } catch (err: any) {
      setForgotError(err.message || 'Lỗi khi đặt lại mật khẩu');
    } finally {
      setForgotLoading(false);
    }
  };

  // Auto-fill remembered account on mount
  useEffect(() => {
    if (rememberedAccount) {
      setAccount(rememberedAccount);
    }
  }, [rememberedAccount]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanAccount = account.trim();
    const cleanPassword = password.trim();

    if (!cleanAccount && !cleanPassword) {
      setErrorMsg('Vui lòng nhập tài khoản nhân viên và mật khẩu');
      return;
    }
    if (!cleanAccount) {
      setErrorMsg('Vui lòng nhập tài khoản (Số điện thoại, Email hoặc Mã nhân viên)');
      return;
    }
    if (!cleanPassword) {
      setErrorMsg('Vui lòng nhập mật khẩu đăng nhập');
      return;
    }

    setErrorMsg(null);
    setIsSubmitting(true);

    const result = await login(cleanAccount, cleanPassword, rememberMe);
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
        padding: '24px 16px',
        backgroundColor: '#f8fafc',
        color: '#0f172a',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '10px',
          padding: '28px 24px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.03)',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
        }}
      >
        {/* Brand Header */}
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="56" height="56" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="100" height="100" rx="16" fill="#008848" />
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
                fill="#fbbf24"
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <span style={{ fontSize: '20px', fontWeight: 700, color: '#008848', letterSpacing: '-0.3px' }}>
                City<span style={{ color: '#d97706' }}>Mart</span> SFWMS
              </span>
              <span
                style={{
                  fontSize: '10px',
                  backgroundColor: '#f0fdf4',
                  color: '#166534',
                  padding: '2px 6px',
                  borderRadius: '6px',
                  fontWeight: 600,
                  border: '1px solid #bbf7d0',
                }}
              >
                STAFF APP
              </span>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b', fontWeight: 400 }}>
              Hệ thống Quản lý Vận hành & Xuất Nhập Kho Thực phẩm
            </p>
          </div>
        </div>

        {/* Semantic Error Alert Banner */}
        {errorMsg && (
          <div
            style={{
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#991b1b',
              padding: '10px 12px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0, color: '#dc2626' }} />
            <div style={{ lineHeight: 1.4 }}>{errorMsg}</div>
          </div>
        )}

        {/* Enterprise Login Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 500,
                color: '#334155',
                marginBottom: '6px',
              }}
            >
              Tài khoản nhân viên
            </label>
            <div style={{ position: 'relative' }}>
              <User
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#64748b',
                }}
                size={16}
              />
              <input
                type="text"
                required
                value={account}
                onChange={e => {
                  setAccount(e.target.value);
                  if (errorMsg) setErrorMsg(null);
                }}
                placeholder="Số điện thoại, Email hoặc Mã nhân viên (VD: NV-GV02)"
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 38px',
                  backgroundColor: '#f8fafc',
                  border: errorMsg ? '1px solid #ef4444' : '1px solid #cbd5e1',
                  borderRadius: '6px',
                  color: '#0f172a',
                  fontSize: '13px',
                  fontWeight: 500,
                  outline: 'none',
                  transition: 'border-color 0.15s ease',
                  boxSizing: 'border-box',
                }}
                onFocus={e => (e.target.style.borderColor = '#008848')}
                onBlur={e => (e.target.style.borderColor = errorMsg ? '#ef4444' : '#cbd5e1')}
              />
            </div>
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 500,
                color: '#334155',
                marginBottom: '6px',
              }}
            >
              Mật khẩu đăng nhập
            </label>
            <div style={{ position: 'relative' }}>
              <Lock
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#64748b',
                }}
                size={16}
              />
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
                  padding: '10px 38px 10px 38px',
                  backgroundColor: '#f8fafc',
                  border: errorMsg ? '1px solid #ef4444' : '1px solid #cbd5e1',
                  borderRadius: '6px',
                  color: '#0f172a',
                  fontSize: '13px',
                  fontWeight: 500,
                  outline: 'none',
                  transition: 'border-color 0.15s ease',
                  boxSizing: 'border-box',
                }}
                onFocus={e => (e.target.style.borderColor = '#008848')}
                onBlur={e => (e.target.style.borderColor = errorMsg ? '#ef4444' : '#cbd5e1')}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '4px',
                }}
                title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Remember Account & Forgot Password Option */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                userSelect: 'none',
              }}
              onClick={() => setRememberMe(!rememberMe)}
            >
              {rememberMe ? (
                <CheckSquare size={16} color="#008848" />
              ) : (
                <Square size={16} color="#94a3b8" />
              )}
              <span style={{ fontSize: '12px', color: '#475569', fontWeight: 500 }}>
                Ghi nhớ tài khoản
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                setForgotPhone(account.replace(/\D/g, '').length === 10 ? account : '');
                setShowForgotModal(true);
                setForgotError(null);
                setForgotSuccess(null);
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#0284c7',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                padding: '4px',
              }}
            >
              Quên mật khẩu?
            </button>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              padding: '11px',
              backgroundColor: isSubmitting ? '#94a3b8' : '#008848',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              marginTop: '4px',
              transition: 'background-color 0.15s ease',
            }}
            onMouseEnter={e => {
              if (!isSubmitting) (e.currentTarget.style.backgroundColor = '#00733d');
            }}
            onMouseLeave={e => {
              if (!isSubmitting) (e.currentTarget.style.backgroundColor = '#008848');
            }}
          >
            {isSubmitting ? (
              <>
                <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />
                <span>Đang xác thực thông tin...</span>
              </>
            ) : (
              <>
                <span>Đăng Nhập Vào Ca Làm Việc</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Helpful Note for Staff */}
        <div
          style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            padding: '10px 12px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px',
            fontSize: '11px',
            color: '#64748b',
            lineHeight: 1.45,
          }}
        >
          <Info size={14} color="#008848" style={{ flexShrink: 0, marginTop: '2px' }} />
          <span>
            Tài khoản nhân viên được cấp và phân quyền từ Web Quản trị. Hệ thống hỗ trợ tự đặt lại mật khẩu nhanh chóng qua mã xác thực bảo mật.
          </span>
        </div>

        {/* Security & Server Connection Config Switcher */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '11px', color: '#64748b', fontWeight: 500 }}>
            <ShieldCheck size={14} color="#008848" />
            <span>Bảo mật JWT chuẩn phiên 24h & Khóa kho vận hành</span>
          </div>

          <button
            type="button"
            onClick={() => setShowServerModal(true)}
            style={{
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              padding: '5px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11px',
              color: '#334155',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            <Server size={13} color="#008848" />
            <span>Máy chủ kết nối: <strong style={{ color: '#008848' }}>{currentHost}</strong></span>
          </button>
        </div>

        {/* Server IP Config Modal */}
        {showServerModal && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px',
              zIndex: 9999,
            }}
          >
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                padding: '20px',
                width: '100%',
                maxWidth: '380px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Server size={18} color="#008848" />
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#0f172a' }}>
                  Cấu Hình Máy Chủ Kết Nối
                </h3>
              </div>

              <p style={{ margin: 0, fontSize: '12px', color: '#64748b', lineHeight: 1.4 }}>
                Chọn địa chỉ máy chủ phù hợp với hạ tầng mạng kho:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {[
                  { label: 'Máy Thật qua Wi-Fi LAN', host: '192.168.2.147', desc: 'Điện thoại thật cùng Wi-Fi với máy chủ' },
                  { label: 'Localhost / Cáp USB', host: 'localhost', desc: 'Cắm cáp USB và đã chạy adb reverse' },
                  { label: 'Android Máy Ảo (Emulator)', host: '10.0.2.2', desc: 'Dùng cho Android Studio Emulator' },
                ].map(opt => (
                  <button
                    key={opt.host}
                    type="button"
                    onClick={() => {
                      setBackendHost(opt.host);
                      setCurrentHost(opt.host);
                      setShowServerModal(false);
                      window.location.reload();
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: currentHost === opt.host ? '1px solid #008848' : '1px solid #e2e8f0',
                      backgroundColor: currentHost === opt.host ? '#f0fdf4' : '#f8fafc',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: currentHost === opt.host ? '#166534' : '#0f172a' }}>
                        {opt.label}
                      </div>
                      <div style={{ fontSize: '10px', color: '#64748b' }}>
                        {opt.host} • {opt.desc}
                      </div>
                    </div>
                    {currentHost === opt.host && <Check size={16} color="#008848" />}
                  </button>
                ))}
              </div>

              {/* Custom IP Input */}
              <div style={{ display: 'flex', gap: '6px', marginTop: '2px' }}>
                <input
                  type="text"
                  placeholder="Nhập IP tùy chỉnh (VD: 192.168.1.50)"
                  value={customHostInput}
                  onChange={e => setCustomHostInput(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '12px',
                    outline: 'none',
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    if (customHostInput.trim()) {
                      setBackendHost(customHostInput.trim());
                      setCurrentHost(customHostInput.trim());
                      setShowServerModal(false);
                      window.location.reload();
                    }
                  }}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    backgroundColor: '#008848',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 600,
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  Lưu
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowServerModal(false)}
                style={{
                  padding: '8px',
                  borderRadius: '6px',
                  backgroundColor: '#f1f5f9',
                  border: '1px solid #e2e8f0',
                  color: '#475569',
                  fontSize: '12px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Đóng
              </button>
            </div>
          </div>
        )}

        {/* Forgot Password SMS OTP Modal */}
        {showForgotModal && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.6)',
              backdropFilter: 'blur(3px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px',
              zIndex: 9999,
            }}
          >
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                padding: '24px',
                width: '100%',
                maxWidth: '400px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
              }}
            >
              {/* Modal Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#f0f9ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <KeyRound size={18} color="#0284c7" />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
                      Khôi Phục Mật Khẩu
                    </h3>
                    <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>
                      Nhập số điện thoại để nhận mã xác thực bảo mật
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Alert Feedback Messages */}
              {forgotError && (
                <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertCircle size={15} color="#991b1b" />
                  <span style={{ fontSize: '12px', color: '#991b1b', fontWeight: 500 }}>{forgotError}</span>
                </div>
              )}

              {forgotSuccess && (
                <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Check size={15} color="#166534" />
                  <span style={{ fontSize: '12px', color: '#166534', fontWeight: 500 }}>{forgotSuccess}</span>
                </div>
              )}

              <form onSubmit={handleConfirmResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* 1. Phone Input Row with Send OTP Button */}
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Số điện thoại nhân viên
                  </label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                      <Phone size={15} color="#64748b" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                      <input
                        type="tel"
                        required
                        placeholder="Nhập 10 số (VD: 0908123456)..."
                        value={forgotPhone}
                        onChange={e => {
                          setForgotPhone(e.target.value);
                          if (forgotError) setForgotError(null);
                        }}
                        style={{
                          width: '100%',
                          padding: '9px 10px 9px 32px',
                          backgroundColor: '#f8fafc',
                          border: '1px solid #cbd5e1',
                          borderRadius: '6px',
                          fontSize: '12.5px',
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
                        padding: '9px 12px',
                        backgroundColor: forgotCooldown > 0 ? '#f1f5f9' : '#0284c7',
                        color: forgotCooldown > 0 ? '#64748b' : '#ffffff',
                        border: '1px solid',
                        borderColor: forgotCooldown > 0 ? '#cbd5e1' : '#0284c7',
                        borderRadius: '6px',
                        fontSize: '11.5px',
                        fontWeight: 600,
                        cursor: forgotCooldown > 0 || forgotLoading ? 'not-allowed' : 'pointer',
                        whiteSpace: 'nowrap',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {forgotCooldown > 0 ? `Gửi lại (${forgotCooldown}s)` : 'Nhận mã'}
                    </button>
                  </div>
                </div>

                {/* 2. Segmented 6-digit PIN Box Input */}
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Mã xác thực
                  </label>
                  <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                    {forgotDigits.map((digit, idx) => (
                      <input
                        key={idx}
                        id={`staff-forgot-digit-${idx}`}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={e => handleForgotDigitChange(idx, e.target.value)}
                        onKeyDown={e => handleForgotDigitKeyDown(idx, e)}
                        onPaste={handleForgotPaste}
                        style={{
                          width: '42px',
                          height: '46px',
                          textAlign: 'center',
                          fontSize: '18px',
                          fontWeight: 700,
                          color: '#0284c7',
                          backgroundColor: '#ffffff',
                          border: digit ? '1.5px solid #0284c7' : '1px solid #cbd5e1',
                          borderRadius: '6px',
                          outline: 'none',
                          boxSizing: 'border-box',
                          transition: 'border-color 0.15s',
                        }}
                        onFocus={e => (e.target.style.borderColor = '#0284c7')}
                        onBlur={e => (e.target.style.borderColor = digit ? '#0284c7' : '#cbd5e1')}
                      />
                    ))}
                  </div>
                </div>

                {/* 3. New Password Input */}
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Mật khẩu mới (tối thiểu 6 ký tự)
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={15} color="#64748b" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      type={showForgotNewPass ? 'text' : 'password'}
                      required
                      placeholder="Nhập mật khẩu mới..."
                      value={forgotNewPass}
                      onChange={e => {
                        setForgotNewPass(e.target.value);
                        if (forgotError) setForgotError(null);
                      }}
                      style={{
                        width: '100%',
                        padding: '9px 36px 9px 32px',
                        backgroundColor: '#f8fafc',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        fontSize: '12.5px',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowForgotNewPass(!showForgotNewPass)}
                      style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 0 }}
                    >
                      {showForgotNewPass ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                {/* 4. Confirm New Password */}
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Xác nhận lại mật khẩu mới
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={15} color="#64748b" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      type={showForgotNewPass ? 'text' : 'password'}
                      required
                      placeholder="Nhập lại mật khẩu mới..."
                      value={forgotConfirmPass}
                      onChange={e => {
                        setForgotConfirmPass(e.target.value);
                        if (forgotError) setForgotError(null);
                      }}
                      style={{
                        width: '100%',
                        padding: '9px 12px 9px 32px',
                        backgroundColor: '#f8fafc',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        fontSize: '12.5px',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    style={{
                      flex: 1,
                      padding: '10px',
                      backgroundColor: '#f8fafc',
                      color: '#475569',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      fontSize: '12.5px',
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
                      padding: '10px',
                      backgroundColor: forgotLoading ? '#94a3b8' : '#008848',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      cursor: forgotLoading ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    {forgotLoading ? (
                      <>
                        <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />
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
      </div>
    </div>
  );
};
