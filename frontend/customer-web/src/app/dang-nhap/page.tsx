"use client";

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { ArrowLeft, Phone, ShieldCheck, Lock, RefreshCw, KeyRound, AlertCircle, Check, ShoppingCart, UserPlus } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { MapPicker } from '@/features/checkout';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/tai-khoan';

  const { isAuthenticated, token, login } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && isAuthenticated && token) {
      router.push(redirectUrl);
    }
  }, [mounted, isAuthenticated, token, router, redirectUrl]);

  const [step, setStep] = useState<'phone' | 'otp' | 'update_info'>('phone');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [currentUserData, setCurrentUserData] = useState<any>(null);
  const [currentAccessToken, setCurrentAccessToken] = useState<string>('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [devOtp, setDevOtp] = useState<string>('');
  const [timeLeft, setTimeLeft] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (timeLeft > 0) {
      const timerId = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timerId);
    }
  }, [timeLeft]);

  // Gửi OTP qua Backend (:3012) -> eSMS.vn
  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = phone.trim().replace(/\D/g, '');
    if (cleanPhone.length < 9) {
      setErrorMsg('Vui lòng nhập số điện thoại hợp lệ (10 chữ số)');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('http://localhost:3012/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone, actionType: 'LOGIN_OTP' }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || 'Lỗi khi gửi mã xác thực SMS!');
      }

      setStep('otp');
      setTimeLeft(data.cooldownSeconds || 60);
      if (data.otpCode) {
        setDevOtp(data.otpCode);
        setSuccessMsg(`Mã xác thực đã được gửi! (Mã OTP trên Terminal: ${data.otpCode})`);
      } else {
        setSuccessMsg('Mã xác thực đã được gửi đến số điện thoại của bạn!');
      }
    } catch (error: any) {
      setErrorMsg(error.message || 'Lỗi khi gửi mã xác thực SMS');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (timeLeft > 0 || isLoading) return;
    const cleanPhone = phone.trim().replace(/\D/g, '');
    setIsLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('http://localhost:3012/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone, actionType: 'LOGIN_OTP' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Lỗi gửi lại mã OTP');
      setTimeLeft(data.cooldownSeconds || 60);
      if (data.otpCode) {
        setDevOtp(data.otpCode);
        setSuccessMsg(`Đã tạo mã xác thực mới: ${data.otpCode}`);
      } else {
        setSuccessMsg('Đã gửi lại mã xác thực thành công!');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Không thể gửi lại mã lúc này');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    const char = value.replace(/\D/g, '').slice(-1);
    const newOtp = [...otp];
    newOtp[index] = char;
    setOtp(newOtp);

    if (char !== '' && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && otp[index] === '' && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted) {
      const newOtp = [...otp];
      for (let i = 0; i < 6; i++) {
        newOtp[i] = pasted[i] || '';
      }
      setOtp(newOtp);
      const targetIdx = Math.min(pasted.length, 5);
      const nextInput = document.getElementById(`otp-${targetIdx}`);
      nextInput?.focus();
    }
  };

  // Xác thực OTP và đăng nhập vào tài khoản Khách hàng
  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpString = otp.join('');
    if (otpString.length < 6) {
      setErrorMsg('Vui lòng nhập đủ 6 chữ số mã OTP');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const cleanPhone = phone.trim().replace(/\D/g, '');
      const response = await fetch('http://localhost:3012/auth/login-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: cleanPhone,
          otpCode: otpString,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || 'Mã xác thực không chính xác hoặc đã hết hạn!');
      }

      const { access_token, user } = data;
      setCurrentAccessToken(access_token);
      setCurrentUserData(user);

      // Lưu trạng thái đăng nhập ngay lập tức
      login({
        id: user.id,
        name: user.name || `Khách Hàng ${cleanPhone.slice(-4)}`,
        phone: user.phone || cleanPhone,
        email: user.email,
        addresses: user.addresses || [],
        tier: user.tier || 'Thành viên mới',
        points: user.points || 0,
      }, access_token);

      // Nếu khách hàng đã có tên (không phải tên tạm Khách Hàng xxxx), cho vào thẳng trang hồ sơ hoặc trang mua hàng
      if (user && user.name && !user.name.startsWith('Khách Hàng ')) {
        router.push(redirectUrl);
      } else {
        // Là khách hàng mới, chuyển sang bước nhập tên và địa chỉ giao hàng
        setStep('update_info');
      }
    } catch (error: any) {
      setErrorMsg(error.message || 'Mã OTP không đúng. Vui lòng thử lại!');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Vui lòng nhập họ và tên của bạn');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    try {
      // Cập nhật profile & địa chỉ vào Backend CSDL (:3012/users/profile)
      const response = await fetch('http://localhost:3012/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentAccessToken}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          phone: currentUserData?.phone || phone,
          addressStr: address.trim(),
          lat: position?.lat,
          lng: position?.lng,
        }),
      });

      const updatedUser = await response.json().catch(() => currentUserData);

      login({
        id: updatedUser.id || currentUserData?.id,
        name: name.trim(),
        phone: updatedUser.phone || phone,
        email: updatedUser.email || currentUserData?.email,
        addresses: updatedUser.addresses || [
          {
            streetAddress: address.trim(),
            latitude: position?.lat,
            longitude: position?.lng,
            isDefault: true,
          }
        ],
        tier: updatedUser.tier || 'Thành viên mới',
        points: updatedUser.points || 0,
      }, currentAccessToken);

      router.push(redirectUrl);
    } catch (error: any) {
      setErrorMsg('Không thể lưu thông tin. Vui lòng thử lại!');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <Link href="/">
            <img src="/logos/logo_full.png" alt="C.T Mart" className="h-16 object-contain" />
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          {step === 'phone' ? (
            <div className="p-8">
              {redirectUrl && redirectUrl !== '/tai-khoan' && (
                <div className="mb-5 p-3.5 bg-amber-50 text-amber-900 border border-amber-200 rounded-xl text-xs flex items-center gap-2.5 shadow-2xs">
                  <ShoppingCart size={18} className="text-amber-600 shrink-0" />
                  <span>Vui lòng <strong>đăng nhập</strong> hoặc <strong>đăng ký</strong> tài khoản để tiếp tục thêm sản phẩm vào giỏ hàng.</span>
                </div>
              )}

              <h1 className="text-2xl font-bold text-gray-800 mb-1.5">Đăng nhập / Đăng ký</h1>
              <p className="text-gray-500 mb-6 text-sm leading-relaxed">
                Nhập số điện thoại để tiếp tục. Nếu bạn chưa có tài khoản, hệ thống sẽ tự động đăng ký tài khoản mới miễn phí cho bạn qua mã OTP.
              </p>

              {errorMsg && (
                <div className="mb-4 p-3 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm flex items-center gap-2">
                  <AlertCircle size={16} />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handlePhoneSubmit}>
                <div className="mb-6 relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                    <Phone className="text-gray-400" size={20} />
                  </div>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      if (errorMsg) setErrorMsg('');
                    }}
                    placeholder="VD: 0912345678"
                    className="w-full pl-12 pr-4 py-4 border-2 border-gray-100 rounded-xl focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-medium"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={phone.length < 9 || isLoading}
                  className={`w-full text-white font-bold py-4 px-4 rounded-xl transition-all shadow-md shadow-primary/20 flex items-center justify-center gap-2 ${
                    phone.length < 9 || isLoading ? 'bg-gray-300 cursor-not-allowed' : 'bg-primary hover:bg-primary/90'
                  }`}
                >
                  {isLoading ? (
                    <>
                      <RefreshCw size={18} className="animate-spin" />
                      <span>ĐANG GỬI MÃ...</span>
                    </>
                  ) : (
                    'Tiếp tục nhận mã'
                  )}
                </button>
              </form>

              <div className="mt-8 text-center text-sm text-gray-500">
                Bằng việc tiếp tục, bạn đã đồng ý với <Link href="#" className="text-primary hover:underline">Điều khoản sử dụng</Link> của C.T Mart
              </div>
            </div>
          ) : step === 'otp' ? (
            <div className="p-8">
              <button
                onClick={() => setStep('phone')}
                className="flex items-center gap-2 text-gray-500 hover:text-primary transition-colors mb-6 text-sm font-medium"
              >
                <ArrowLeft size={16} /> Đổi số điện thoại khác
              </button>

              <h1 className="text-2xl font-bold text-gray-800 mb-2">Nhập mã xác thực</h1>
              <p className="text-gray-500 mb-6">Mã xác thực gồm 6 chữ số đã được gửi đến số <strong className="text-gray-800">{phone}</strong></p>

              {errorMsg && (
                <div className="mb-4 p-3 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm flex items-center gap-2">
                  <AlertCircle size={16} />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="mb-4 p-3 bg-green-50 text-green-700 border border-green-200 rounded-lg text-sm flex items-center gap-2">
                  <Check size={16} />
                  <span>{successMsg}</span>
                </div>
              )}

              {devOtp && (
                <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-900 shadow-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0 font-bold">
                      <KeyRound size={17} />
                    </div>
                    <div>
                      <div className="font-semibold text-emerald-800">Mã OTP (Terminal / Dev):</div>
                      <span className="text-base font-black tracking-widest text-primary font-mono">{devOtp}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const digits = devOtp.split('').slice(0, 6);
                      setOtp(digits);
                    }}
                    className="px-3 py-1.5 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 transition-colors shadow-xs text-xs"
                  >
                    Tự động điền
                  </button>
                </div>
              )}

              <form onSubmit={handleOtpSubmit}>
                <div className="flex justify-between gap-2 mb-8">
                  {otp.map((digit, idx) => (
                    <input
                      key={idx}
                      id={`otp-${idx}`}
                      type="text"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      onPaste={handleOtpPaste}
                      className="w-12 h-14 md:w-14 md:h-16 text-center text-2xl font-bold border-2 border-gray-100 rounded-xl focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all bg-gray-50 focus:bg-white"
                    />
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={otp.join('').length < 6 || isLoading}
                  className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 px-4 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-primary/20 mb-6 flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw size={18} className="animate-spin" />
                      <span>ĐANG XÁC THỰC...</span>
                    </>
                  ) : (
                    'Xác nhận đăng nhập'
                  )}
                </button>
              </form>

              <div className="text-center text-sm">
                {timeLeft > 0 ? (
                  <span className="text-gray-500">Gửi lại mã sau <strong className="text-primary font-bold">{timeLeft}s</strong></span>
                ) : (
                  <button className="text-primary font-bold hover:underline" onClick={handleResendOtp}>
                    Gửi lại mã xác thực
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="p-8">
              <h1 className="text-2xl font-bold text-gray-800 mb-2">Thông tin tài khoản</h1>
              <p className="text-gray-500 mb-6">Chào mừng bạn mới! Vui lòng cho chúng tôi biết tên và địa chỉ nhận hàng của bạn.</p>

              {errorMsg && (
                <div className="mb-4 p-3 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm flex items-center gap-2">
                  <AlertCircle size={16} />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleUpdateInfoSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Họ và tên
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Nguyễn Văn A"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      setErrorMsg('');
                    }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Địa chỉ giao hàng mặc định
                  </label>
                  <input
                    type="text"
                    placeholder="Số nhà, tên đường..."
                    className="w-full px-4 py-3 mb-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                    value={address}
                    onChange={(e) => {
                      setAddress(e.target.value);
                      setErrorMsg('');
                    }}
                  />
                  <MapPicker
                    position={position}
                    setPosition={(pos) => {
                      setPosition(pos);
                      setErrorMsg('');
                    }}
                    onAddressSelect={(addr) => {
                      setAddress(addr);
                      setErrorMsg('');
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-primary hover:bg-primary/90 text-white py-3 rounded-lg font-medium transition-colors flex items-center justify-center disabled:opacity-70 mt-4 shadow-md shadow-primary/20"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    'Hoàn tất và mua sắm ngay'
                  )}
                </button>
              </form>
            </div>
          )}
        </div>

        <div className="mt-8 flex items-center justify-center gap-2 text-gray-400 text-sm">
          <ShieldCheck size={16} />
          Bảo mật xác thực an toàn qua mã bảo mật OTP Gateway
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-500">Đang tải...</div>}>
      <LoginForm />
    </Suspense>
  );
}
