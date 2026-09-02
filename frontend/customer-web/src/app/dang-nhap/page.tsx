"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Phone, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { auth } from '@/lib/firebase';
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';
import dynamic from 'next/dynamic';

const MapPicker = dynamic(() => import('@/components/ui/MapPicker'), { ssr: false });

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  
  const [step, setStep] = useState<'phone' | 'otp' | 'update_info'>('phone');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [tempUser, setTempUser] = useState<any>(null);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timeLeft, setTimeLeft] = useState(60);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

  useEffect(() => {
    if (timeLeft > 0 && step === 'otp') {
      const timerId = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timerId);
    }
  }, [timeLeft, step]);

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length < 9) return;
    
    setIsLoading(true);
    try {
      /* GIỮ LẠI CODE FIREBASE SAU NÀY DÙNG:
      if (!window.recaptchaVerifier) {
        window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          size: 'invisible',
        });
      }

      const formattedPhone = phone.startsWith('0') ? `+84${phone.substring(1)}` : phone;
      const appVerifier = window.recaptchaVerifier;
      
      const result = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
      setConfirmationResult(result);
      */

      // --- BYPASS OTP CHO KHÓA LUẬN (MOCK OTP) ---
      // Trực tiếp cho qua màn hình OTP mà không gọi SMS Firebase
      setTimeout(() => {
        setStep('otp');
        setTimeLeft(60);
        setErrorMsg('');
        setIsLoading(false);
      }, 500); // Đợi nửa giây cho giống thật
      // ---------------------------------------------
    } catch (error: any) {
      console.error(error);
      setErrorMsg(error.message || 'Lỗi khi gửi mã xác nhận SMS');
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.render().then((widgetId: any) => {
          window.grecaptcha.reset(widgetId);
        });
      }
      setIsLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) return; // Only 1 digit
    
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value !== '' && index < 5) {
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

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpString = otp.join('');
    if (otpString.length < 6) return;
    
    setIsLoading(true);
    
    try {
      /* GIỮ LẠI CODE FIREBASE SAU NÀY DÙNG:
      if (!confirmationResult) {
        throw new Error('Phiên đăng nhập không hợp lệ hoặc đã hết hạn.');
      }
      
      const result = await confirmationResult.confirm(otpString);
      const fbUser = result.user;
      */

      // --- BYPASS OTP CHO KHÓA LUẬN (MOCK OTP) ---
      if (otpString !== '123456') {
        throw new Error('Mock OTP: Vui lòng nhập 123456');
      }

      // Giả lập đối tượng user của Firebase (dùng sđt làm UID để nhất quán)
      const formattedPhone = phone.startsWith('0') ? `+84${phone.substring(1)}` : phone;
      const fbUser = {
        uid: 'mock-uid-' + formattedPhone,
        phoneNumber: formattedPhone,
      };
      // ---------------------------------------------
      
      // Thử gọi login xem tài khoản đã tồn tại trong DB chưa
      const response = await fetch('http://localhost:3012/auth/firebase-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firebaseUid: fbUser.uid,
          phone: fbUser.phoneNumber,
          name: '', // Cố tình truyền rỗng, backend sẽ không ghi đè name nếu đã có
        }),
      });

      if (response.ok) {
        const { access_token, user } = await response.json();
        
        // Nếu user đã có name (tức là đã đk từ trước), cho login luôn
        if (user.name && user.name.trim() !== '') {
          login({
            id: user.id,
            name: user.name,
            phone: user.phone,
            tier: user.tier || 'Thành viên mới',
            points: user.points || 0
          }, access_token);
          router.push('/');
        } else {
          // Là user mới tinh, hoặc chưa có tên
          setTempUser(fbUser);
          setStep('update_info');
        }
      } else {
        // Lỗi backend
        setTempUser(fbUser);
        setStep('update_info');
      }
    } catch (error: any) {
      console.error(error);
      setErrorMsg(error.message === 'Mock OTP: Vui lòng nhập 123456' ? 'Mã OTP để test phải là 123456' : 'Mã OTP không đúng. Vui lòng thử lại!');
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
    if (!address.trim() || !position) {
      setErrorMsg('Vui lòng chọn địa chỉ giao hàng trên bản đồ');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await fetch('http://localhost:3012/auth/firebase-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firebaseUid: tempUser.uid,
          phone: tempUser.phoneNumber || phone,
          name: name.trim(),
          address: address.trim(),
          lat: position.lat,
          lng: position.lng
        }),
      });

      if (!response.ok) {
        throw new Error('Lỗi khi lưu thông tin vào server');
      }

      const { access_token, user } = await response.json();

      login({
        id: user.id,
        name: user.name,
        phone: user.phone,
        tier: user.tier || 'Thành viên mới',
        points: user.points || 0
      }, access_token);
      
      router.push('/');
    } catch (error) {
      console.error(error);
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
              <h1 className="text-2xl font-bold text-gray-800 mb-2">Xin chào,</h1>
              <p className="text-gray-500 mb-8">Vui lòng nhập số điện thoại để đăng nhập hoặc tạo tài khoản mới</p>

              <form onSubmit={handlePhoneSubmit}>
                <div className="mb-6 relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                    <Phone className="text-gray-400" size={20} />
                  </div>
                  <input 
                    type="tel" 
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="VD: 0912345678" 
                    className="w-full pl-12 pr-4 py-4 border-2 border-gray-100 rounded-xl focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-medium"
                    required
                  />
                </div>
                <button 
                  type="submit"
                  disabled={phone.length < 9 || isLoading}
                  className={`w-full text-white font-bold py-4 px-4 rounded-xl transition-all shadow-md shadow-primary/20 ${
                    phone.length < 9 || isLoading ? 'bg-gray-300 cursor-not-allowed' : 'bg-primary hover:bg-primary/90'
                  }`}
                >
                  {isLoading ? 'ĐANG GỬI...' : 'Tiếp tục'}
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
                <ArrowLeft size={16} /> Quay lại
              </button>

              <h1 className="text-2xl font-bold text-gray-800 mb-2">Nhập mã xác nhận</h1>
              <p className="text-gray-500 mb-8">Mã OTP đã được gửi đến số <strong className="text-gray-800">{phone}</strong></p>

              {errorMsg && (
                <div className="mb-6 p-3 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm text-center font-medium">
                  {errorMsg}
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
                      className="w-12 h-14 md:w-14 md:h-16 text-center text-2xl font-bold border-2 border-gray-100 rounded-xl focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all bg-gray-50 focus:bg-white"
                    />
                  ))}
                </div>

                <button 
                  type="submit"
                  disabled={otp.join('').length < 6 || isLoading}
                  className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 px-4 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-primary/20 mb-6"
                >
                  {isLoading ? 'ĐANG XÁC THỰC...' : 'Xác nhận'}
                </button>
              </form>

              <div className="text-center text-sm">
                {timeLeft > 0 ? (
                  <span className="text-gray-500">Gửi lại mã sau <strong className="text-primary">{timeLeft}s</strong></span>
                ) : (
                  <button className="text-primary font-bold hover:underline" onClick={() => setTimeLeft(60)}>
                    Gửi lại mã OTP
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="p-8">
              <h1 className="text-2xl font-bold text-gray-800 mb-2">Thông tin tài khoản</h1>
              <p className="text-gray-500 mb-8">Chào mừng bạn mới, vui lòng cho chúng tôi biết tên và địa chỉ của bạn.</p>
              
              <form onSubmit={handleUpdateInfoSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Họ và tên
                  </label>
                  <input
                    type="text"
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
                
                {errorMsg && (
                  <p className="text-red-500 text-sm mt-1">{errorMsg}</p>
                )}
                
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-primary hover:bg-primary/90 text-white py-3 rounded-lg font-medium transition-colors flex items-center justify-center disabled:opacity-70 mt-4 shadow-md shadow-primary/20"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    'Hoàn tất đăng ký'
                  )}
                </button>
              </form>
            </div>
          )}
          
        </div>
        
        <div className="mt-8 flex items-center justify-center gap-2 text-gray-400 text-sm">
          <ShieldCheck size={16} />
          Thông tin của bạn được bảo mật tuyệt đối
        </div>
        
        <div id="recaptcha-container"></div>
      </div>
      
    </div>
  );
}
