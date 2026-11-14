import React, { useState, useEffect } from 'react';
import {
  User,
  Mail,
  Shield,
  ShieldCheck,
  Calendar,
  Activity,
  Save,
  Key,
  CheckCircle,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Eye,
  EyeOff,
  Lock,
  Phone,
  MapPin,
  Building2,
  Clock,
  Smartphone,
  RefreshCw,
  X,
  Send,
  Terminal,
} from 'lucide-react';
import { useAuth, ROLE_LABELS, ROLE_COLORS } from '@/features/auth';
import { getApiHost } from '@/shared/utils/apiConfig';

interface ActivityLog {
  id: string;
  time: string;
  action: string;
  module: string;
  status: 'success' | 'warning' | 'info';
}

const USER_API = getApiHost(3012);

const UserProfile = () => {
  const { user, token, updateProfile, refreshProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<'info' | 'password' | 'permissions' | 'activity'>('info');

  // Profile Form States (Editable fields only)
  const [fullName, setFullName] = useState(user?.name || '');
  const [address, setAddress] = useState(user?.address || '');
  const [gender, setGender] = useState(user?.gender || 'MALE');
  const [dob, setDob] = useState(user?.dob ? new Date(user.dob).toISOString().slice(0, 10) : '');
  const [bio, setBio] = useState(
    user?.bio ||
      'Tham gia vận hành hệ thống kho thông minh SmartWarehouse. Chịu trách nhiệm giám sát chuỗi cung ứng lạnh, tối ưu hóa quy trình nhập xuất và vận dụng phân tích AI dự báo.'
  );

  // Profile Update Status
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Phone Update with OTP States
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [phoneOtpMessage, setPhoneOtpMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Password Change States
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Password Change OTP States
  const [passwordOtpCode, setPasswordOtpCode] = useState('');
  const [passwordOtpSent, setPasswordOtpSent] = useState(false);
  const [passwordOtpCountdown, setPasswordOtpCountdown] = useState(0);
  const [isSendingPasswordOtp, setIsSendingPasswordOtp] = useState(false);
  const [passwordOtpInfo, setPasswordOtpInfo] = useState<{ type: 'info' | 'error' | 'success'; text: string } | null>(null);

  // Activity logs from audit-log API
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Sync user state
  useEffect(() => {
    if (user) {
      setFullName(user.name || '');
      setAddress(user.address || '');
      setGender(user.gender || 'MALE');
      if (user.dob) setDob(new Date(user.dob).toISOString().slice(0, 10));
      if (user.bio) setBio(user.bio);
    }
  }, [user]);

  // OTP Countdown timer for phone update
  useEffect(() => {
    if (otpCountdown > 0) {
      const timer = setTimeout(() => setOtpCountdown(otpCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpCountdown]);

  // OTP Countdown timer for password change
  useEffect(() => {
    if (passwordOtpCountdown > 0) {
      const timer = setTimeout(() => setPasswordOtpCountdown(passwordOtpCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [passwordOtpCountdown]);

  // Fetch activity logs from audit-log API
  useEffect(() => {
    if (!token) return;
    const fetchLogs = async () => {
      setLoadingLogs(true);
      try {
        const res = await fetch(`${USER_API}/audit-logs?limit=10`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          const logsList = Array.isArray(data) ? data : data.data || [];
          const mapped: ActivityLog[] = logsList.map((log: any) => ({
            id: log.id,
            time: new Date(log.createdAt || log.timestamp).toLocaleString('vi-VN', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            }),
            action: log.action || log.actionCode || 'Thao tác nghiệp vụ',
            module: log.serviceName || 'Hệ thống',
            status:
              log.severity === 'CRITICAL'
                ? ('warning' as const)
                : log.severity === 'WARN'
                ? ('warning' as const)
                : log.severity === 'INFO'
                ? ('success' as const)
                : ('info' as const),
          }));
          setActivityLogs(mapped);
        }
      } catch (err) {
        console.error('Error fetching activity logs:', err);
      } finally {
        setLoadingLogs(false);
      }
    };
    fetchLogs();
  }, [token]);

  const currentRole = user?.role || 'ADMIN';
  const isCustomer = currentRole === 'CUSTOMER';
  const roleColor = ROLE_COLORS[currentRole] || '#0f766e';
  const roleLabel = ROLE_LABELS[currentRole] || currentRole;

  const initials = user?.name
    ? user.name
        .split(' ')
        .map(w => w.charAt(0))
        .slice(-2)
        .join('')
    : 'U';

  // ─────────────────────────────────────────────────────────────
  // 1. HANDLE PROFILE SAVE (Only editable fields)
  // ─────────────────────────────────────────────────────────────
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setProfileMessage({ type: 'error', text: 'Họ và tên không được để trống!' });
      return;
    }

    setIsUpdatingProfile(true);
    setProfileMessage(null);

    try {
      const res = await fetch(`${USER_API}/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: fullName.trim(),
          address: address.trim(),
          gender,
          dob: dob || null,
          bio: bio.trim(),
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Cập nhật thông tin thất bại');
      }

      await refreshProfile();
      setProfileMessage({ type: 'success', text: 'Cập nhật thông tin cá nhân thành công!' });
      setTimeout(() => setProfileMessage(null), 4000);
    } catch (err: any) {
      setProfileMessage({ type: 'error', text: err.message || 'Lỗi kết nối máy chủ' });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 2. HANDLE PHONE OTP VERIFICATION
  // ─────────────────────────────────────────────────────────────
  const handleSendPhoneOtp = async () => {
    const cleanPhone = newPhone.trim();
    if (!cleanPhone) {
      setPhoneOtpMessage({ type: 'error', text: 'Vui lòng nhập số điện thoại mới!' });
      return;
    }
    if (!/^0(3|5|7|8|9)[0-9]{8}$/.test(cleanPhone)) {
      setPhoneOtpMessage({ type: 'error', text: 'Số điện thoại không hợp lệ (10 chữ số bắt đầu bằng 03, 05, 07, 08, 09)!' });
      return;
    }

    setIsSendingOtp(true);
    setPhoneOtpMessage(null);

    try {
      const res = await fetch(`${USER_API}/auth/phone/send-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ phone: cleanPhone }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Không thể gửi mã xác thực OTP');
      }

      setOtpSent(true);
      setOtpCountdown(60);
      setPhoneOtpMessage({
        type: 'info',
        text: 'Mã OTP 6 chữ số đã được gửi đến số điện thoại mới. Trong môi trường kiểm thử, mã OTP được ghi nhận tự động tại Terminal của máy chủ.',
      });
    } catch (err: any) {
      setPhoneOtpMessage({ type: 'error', text: err.message || 'Lỗi gửi mã OTP' });
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyPhoneOtp = async () => {
    if (!newPhone.trim() || !otpCode.trim()) {
      setPhoneOtpMessage({ type: 'error', text: 'Vui lòng nhập số điện thoại mới và mã OTP 6 chữ số!' });
      return;
    }

    setIsVerifyingOtp(true);
    setPhoneOtpMessage(null);

    try {
      const res = await fetch(`${USER_API}/auth/phone/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          phone: newPhone.trim(),
          otpCode: otpCode.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Mã xác thực OTP không chính xác hoặc đã hết hạn');
      }

      await refreshProfile();
      setPhoneOtpMessage({ type: 'success', text: 'Xác thực OTP thành công! Số điện thoại đã được cập nhật.' });

      setTimeout(() => {
        setIsPhoneModalOpen(false);
        setOtpSent(false);
        setOtpCode('');
        setNewPhone('');
        setPhoneOtpMessage(null);
      }, 2000);
    } catch (err: any) {
      setPhoneOtpMessage({ type: 'error', text: err.message || 'Xác thực OTP thất bại' });
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 3. HANDLE CHANGE PASSWORD WITH OTP
  // ─────────────────────────────────────────────────────────────
  const handleSendPasswordOtp = async () => {
    if (!user?.phone) {
      setPasswordOtpInfo({
        type: 'error',
        text: 'Tài khoản chưa có số điện thoại để nhận mã OTP. Vui lòng chuyển sang tab "Thông tin cá nhân" để cập nhật số điện thoại trước!',
      });
      return;
    }

    setIsSendingPasswordOtp(true);
    setPasswordOtpInfo(null);

    try {
      const res = await fetch(`${USER_API}/auth/change-password/send-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Không thể gửi mã OTP xác thực');
      }

      setPasswordOtpSent(true);
      setPasswordOtpCountdown(60);
      setPasswordOtpInfo({
        type: 'info',
        text: 'Mã xác thực OTP đã được gửi đến số điện thoại. Bạn có thể kiểm tra trực tiếp mã tại Terminal máy chủ & Terminal giao diện.',
      });
    } catch (err: any) {
      setPasswordOtpInfo({ type: 'error', text: err.message || 'Lỗi gửi mã OTP xác thực' });
    } finally {
      setIsSendingPasswordOtp(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword) {
      setPasswordMessage({ type: 'error', text: 'Vui lòng nhập mật khẩu hiện tại!' });
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setPasswordMessage({ type: 'error', text: 'Mật khẩu mới phải có tối thiểu 6 ký tự!' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'Mật khẩu xác nhận không trùng khớp!' });
      return;
    }
    if (oldPassword === newPassword) {
      setPasswordMessage({ type: 'error', text: 'Mật khẩu mới không được trùng với mật khẩu hiện tại!' });
      return;
    }
    if (!passwordOtpCode.trim() || passwordOtpCode.trim().length < 6) {
      setPasswordMessage({ type: 'error', text: 'Vui lòng nhấn "Gửi mã OTP" và nhập đủ 6 chữ số để xác thực đổi mật khẩu!' });
      return;
    }

    setIsChangingPassword(true);
    setPasswordMessage(null);

    try {
      const res = await fetch(`${USER_API}/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          oldPassword,
          newPassword,
          otpCode: passwordOtpCode.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Đổi mật khẩu thất bại. Vui lòng kiểm tra lại mật khẩu hiện tại hoặc mã OTP.');
      }

      setPasswordMessage({ type: 'success', text: 'Đổi mật khẩu thành công! Mật khẩu mới đã được cập nhật an toàn vào hệ thống.' });
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordOtpCode('');
      setPasswordOtpSent(false);
      setPasswordOtpCountdown(0);
      setPasswordOtpInfo(null);
      setTimeout(() => setPasswordMessage(null), 5000);
    } catch (err: any) {
      setPasswordMessage({ type: 'error', text: err.message || 'Có lỗi xảy ra khi đổi mật khẩu' });
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Password strength calculation
  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { score: 0, label: '', color: '#cbd5e1' };
    let score = 0;
    if (pwd.length >= 6) score += 1;
    if (pwd.length >= 8) score += 1;
    if (/[A-Z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;

    if (score <= 2) return { score: 1, label: 'Yếu (Nên thêm số và chữ hoa)', color: '#dc2626' };
    if (score <= 4) return { score: 2, label: 'Trung bình', color: '#d97706' };
    return { score: 3, label: 'Mạnh & An toàn', color: '#166534' };
  };

  const pwdStrength = getPasswordStrength(newPassword);

  // Permission cards by role
  const getPermissionCards = () => {
    switch (currentRole) {
      case 'ADMIN':
        return [
          { title: 'Quản trị hệ thống & Phân quyền', items: ['Quản lý toàn bộ người dùng và vai trò', 'Cấu hình thông số kỹ thuật và kho hàng', 'Xem nhật ký kiểm toán hệ thống (Audit Log)'] },
          { title: 'Quản lý chuỗi cung ứng', items: ['Phê duyệt danh mục hàng hóa & Nhà cung cấp', 'Giám sát điều phối nhập - xuất toàn diện', 'Quản trị kho lạnh và phân vùng nhiệt độ'] },
        ];
      case 'WAREHOUSE_MANAGER':
        return [
          { title: 'Điều hành kho hàng', items: ['Quản lý vị trí ô kệ kho lạnh / kho mát / kho khô', 'Duyệt lệnh nhập kho và xuất kho phân phối', 'Giám sát chỉ số an toàn tồn kho & FEFO'] },
          { title: 'Cảnh báo & Thiết bị IoT', items: ['Theo dõi biểu đồ nhiệt ẩm thời gian thực', 'Phân tích nguy cơ hư hỏng và hao hụt', 'Điều động nhân viên kho lấy hàng Pick-to-Light'] },
        ];
      case 'WAREHOUSE_STAFF':
        return [
          { title: 'Vận hành kho tại chỗ', items: ['Quét mã vạch tiếp nhận kiện hàng nhập', 'Nhặt hàng theo đèn chỉ báo Pick-to-Light (PTL)', 'Kiểm kê định kỳ và đối soát số lượng tồn'] },
          { title: 'Bảo quản & Điều chuyển', items: ['Xếp dỡ hàng hóa đúng vùng nhiệt độ', 'Cập nhật trạng thái đóng gói đơn hàng', 'Báo cáo sai lệch tồn kho lên cấp quản lý'] },
        ];
      case 'SALES_STAFF':
        return [
          { title: 'Kinh doanh & Bán sỉ B2B', items: ['Lập đơn hàng B2B xuất kho và duyệt gửi kho', 'Quản lý hồ sơ đối tác doanh nghiệp và hạn mức công nợ', 'Khai thác hàng cận hạn đẩy bán (FEFO Clearance)'] },
          { title: 'Tư vấn trực tuyến', items: ['Hỗ trợ khách hàng qua Chatbot và Live Chat', 'In bảng báo giá chuyên nghiệp cho đối tác', 'Theo dõi trạng thái đơn hàng đã xuất kho'] },
        ];
      case 'DRIVER':
        return [
          { title: 'Giao nhận chuỗi lạnh', items: ['Nhận phân công tuyến đường giao hàng thông minh', 'Theo dõi nhiệt độ thùng xe tải lạnh liên tục', 'Chụp ảnh xác thực biên bản giao nhận (e-POD)'] },
          { title: 'Điều phối vận tải', items: ['Báo cáo tiến độ vận chuyển thời gian thực', 'Xác nhận hoàn tất đơn hàng giao tận nơi', 'Quản lý lịch trình xe và nhật ký chạy xe'] },
        ];
      default:
        return [
          { title: 'Người dùng hệ thống', items: ['Truy cập các tính năng cơ bản được cấp quyền'] },
        ];
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Page Header */}
      <div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <User size={20} color="#0f766e" />
          Hồ Sơ Cá Nhân & Cài Đặt Bảo Mật
        </h2>
        <p style={{ fontSize: '0.825rem', color: '#64748b', margin: '4px 0 0 0' }}>
          Quản lý thông tin tài khoản, cập nhật số điện thoại qua xác thực OTP, đổi mật khẩu và xem phân quyền vận hành hệ thống.
        </p>
      </div>

      {/* Main Grid: Left Avatar Card + Right Tabs Container */}
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '1.25rem', alignItems: 'start' }}>
        
        {/* LEFT COLUMN: IDENTITY CARD */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: 10,
            padding: '20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
          }}
        >
          {/* Avatar Circle */}
          <div
            style={{
              width: 90,
              height: 90,
              borderRadius: '50%',
              backgroundColor: '#0f766e',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2rem',
              fontWeight: 800,
              marginBottom: 12,
              border: '3px solid #ccfbf1',
            }}
          >
            {initials}
          </div>

          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', margin: '0 0 4px 0' }}>
            {user?.name || 'Tài khoản người dùng'}
          </h3>

          {/* Role Badge */}
          <span
            style={{
              padding: '3px 10px',
              borderRadius: 4,
              fontSize: '0.75rem',
              fontWeight: 600,
              backgroundColor: isCustomer ? '#f0fdf4' : '#f0f9ff',
              color: isCustomer ? '#166534' : '#075985',
              border: isCustomer ? '1px solid #bbf7d0' : '1px solid #bae6fd',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              marginBottom: 16,
            }}
          >
            <Shield size={12} /> {roleLabel}
          </span>

          <div style={{ width: '100%', height: 1, backgroundColor: '#e2e8f0', marginBottom: 16 }}></div>

          {/* Read-Only System Identity Details */}
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10, textAlign: 'left', fontSize: '0.8rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: 5 }}>
                <Key size={13} /> Mã nhân sự:
              </span>
              <strong style={{ fontFamily: 'monospace', color: '#0f766e', backgroundColor: '#f0fdf4', padding: '1px 6px', borderRadius: 4, border: '1px solid #bbf7d0' }}>
                {user?.code || 'NV-SYSTEM'}
              </strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: 5 }}>
                <Mail size={13} /> Email đăng nhập:
              </span>
              <span style={{ fontWeight: 600, color: '#0f172a' }}>{user?.email || 'Chưa cập nhật'}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: 5 }}>
                <Phone size={13} /> Số điện thoại:
              </span>
              <span style={{ fontWeight: 600, color: '#0f172a' }}>{user?.phone || 'Chưa liên kết'}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: 5 }}>
                <Building2 size={13} /> Kho trực thuộc:
              </span>
              <span style={{ fontWeight: 600, color: '#0f172a' }}>{user?.warehouseCode || 'WH-006 (Tổng Kho Gò Vấp)'}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: 5 }}>
                <Clock size={13} /> Ca làm việc:
              </span>
              <span style={{ fontWeight: 600, color: '#0f172a' }}>{user?.shift === 'CA_DEM' ? 'Ca Đêm' : user?.shift === 'CA_CHIEU' ? 'Ca Chiều' : 'Ca Hành Chính'}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed #e2e8f0', paddingTop: 10, marginTop: 4 }}>
              <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: 5 }}>
                <CheckCircle2 size={13} color="#166534" /> Trạng thái:
              </span>
              <span style={{ fontWeight: 600, color: '#166534', backgroundColor: '#f0fdf4', padding: '1px 8px', borderRadius: 4, border: '1px solid #bbf7d0' }}>
                Đang hoạt động
              </span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: 4 ENTERPRISE TABS */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: 10,
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Tab Navigation Bar */}
          <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc', padding: '0 8px' }}>
            <button
              type="button"
              onClick={() => setActiveTab('info')}
              style={tabHeaderStyle(activeTab === 'info')}
            >
              <User size={15} /> 1. Thông Tin Cá Nhân
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('password')}
              style={tabHeaderStyle(activeTab === 'password')}
            >
              <Key size={15} /> 2. Đổi Mật Khẩu
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('permissions')}
              style={tabHeaderStyle(activeTab === 'permissions')}
            >
              <Shield size={15} /> 3. Phân Quyền Vai Trò
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('activity')}
              style={tabHeaderStyle(activeTab === 'activity')}
            >
              <Activity size={15} /> 4. Lịch Sử Hoạt Động ({activityLogs.length})
            </button>
          </div>

          {/* TAB CONTENT AREA */}
          <div style={{ padding: '20px' }}>

            {/* ══════════════════════════════════════════════════════════════
                TAB 1: THÔNG TIN CÁ NHÂN (CHỈ ĐƯỢC ĐỔI NHỮNG GÌ CHO PHÉP)
            ══════════════════════════════════════════════════════════════ */}
            {activeTab === 'info' && (
              <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                
                {profileMessage && (
                  <div
                    style={{
                      padding: '10px 14px',
                      borderRadius: 6,
                      fontSize: '0.825rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      backgroundColor: profileMessage.type === 'success' ? '#f0fdf4' : '#fef2f2',
                      color: profileMessage.type === 'success' ? '#166534' : '#991b1b',
                      border: profileMessage.type === 'success' ? '1px solid #bbf7d0' : '1px solid #fecaca',
                    }}
                  >
                    {profileMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                    <span>{profileMessage.text}</span>
                  </div>
                )}

                {/* Section A: Allowed Editable Fields */}
                <div>
                  <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a', margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <User size={15} color="#0f766e" /> Thông Tin Được Phép Chỉnh Sửa
                  </h4>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={labelStyle}>Họ và tên *</label>
                      <input
                        type="text"
                        value={fullName}
                        onChange={e => setFullName(e.target.value)}
                        placeholder="Nhập họ và tên đầy đủ..."
                        style={inputStyle}
                        required
                      />
                    </div>

                    <div>
                      <label style={labelStyle}>Số điện thoại liên hệ (Xác thực qua OTP)</label>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <div style={{ ...inputStyle, flex: 1, backgroundColor: '#f8fafc', color: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span>{user?.phone || 'Chưa liên kết SĐT'}</span>
                          <span style={{ fontSize: '0.7rem', color: '#166534', backgroundColor: '#f0fdf4', padding: '1px 6px', borderRadius: 4, border: '1px solid #bbf7d0', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                            <CheckCircle2 size={11} /> Đã bảo vệ
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setNewPhone('');
                            setOtpCode('');
                            setOtpSent(false);
                            setPhoneOtpMessage(null);
                            setIsPhoneModalOpen(true);
                          }}
                          style={{
                            padding: '6px 12px',
                            borderRadius: 6,
                            border: '1px solid #0f766e',
                            backgroundColor: '#f0fdf4',
                            color: '#0f766e',
                            fontSize: '0.775rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          <Smartphone size={13} /> Đổi SĐT
                        </button>
                      </div>
                    </div>

                    <div>
                      <label style={labelStyle}>Địa chỉ liên lạc cá nhân</label>
                      <input
                        type="text"
                        value={address}
                        onChange={e => setAddress(e.target.value)}
                        placeholder="Số nhà, tên đường, phường/xã, quận/huyện..."
                        style={inputStyle}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <div>
                        <label style={labelStyle}>Giới tính</label>
                        <select
                          value={gender}
                          onChange={e => setGender(e.target.value)}
                          style={inputStyle}
                        >
                          <option value="MALE">Nam</option>
                          <option value="FEMALE">Nữ</option>
                          <option value="OTHER">Khác</option>
                        </select>
                      </div>

                      <div>
                        <label style={labelStyle}>Ngày sinh</label>
                        <input
                          type="date"
                          value={dob}
                          onChange={e => setDob(e.target.value)}
                          style={inputStyle}
                        />
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: 12 }}>
                    <label style={labelStyle}>Giới thiệu bản thân & Ghi chú công tác</label>
                    <textarea
                      rows={3}
                      value={bio}
                      onChange={e => setBio(e.target.value)}
                      placeholder="Mô tả kinh nghiệm, phụ trách chuyên môn hoặc thông tin liên lạc khẩn cấp..."
                      style={{ ...inputStyle, width: '100%', resize: 'vertical' }}
                    />
                  </div>
                </div>

                {/* Section B: Locked / Read-Only Fields */}
                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 14 }}>
                  <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#475569', margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Lock size={15} color="#94a3b8" /> Thông Tin Cố Định Được Phân Bổ (Chỉ Xem)
                  </h4>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
                    <div style={lockedFieldStyle}>
                      <span style={{ fontSize: '0.725rem', color: '#64748b' }}>Email định danh:</span>
                      <strong style={{ fontSize: '0.825rem', color: '#0f172a' }}>{user?.email}</strong>
                      <span style={lockedBadgeStyle}><Lock size={10} /> Không thể đổi</span>
                    </div>

                    <div style={lockedFieldStyle}>
                      <span style={{ fontSize: '0.725rem', color: '#64748b' }}>Mã nhân sự:</span>
                      <strong style={{ fontSize: '0.825rem', color: '#0f766e', fontFamily: 'monospace' }}>{user?.code || 'NV-SYSTEM'}</strong>
                      <span style={lockedBadgeStyle}><Lock size={10} /> Do Quản trị viên cấp</span>
                    </div>

                    <div style={lockedFieldStyle}>
                      <span style={{ fontSize: '0.725rem', color: '#64748b' }}>Vai trò kiểm soát:</span>
                      <strong style={{ fontSize: '0.825rem', color: '#075985' }}>{roleLabel}</strong>
                      <span style={lockedBadgeStyle}><Lock size={10} /> Theo quyết định bổ nhiệm</span>
                    </div>

                    <div style={lockedFieldStyle}>
                      <span style={{ fontSize: '0.725rem', color: '#64748b' }}>Kho trực thuộc:</span>
                      <strong style={{ fontSize: '0.825rem', color: '#0f172a' }}>{user?.warehouseCode || 'WH-006 (Tổng Kho Gò Vấp)'}</strong>
                      <span style={lockedBadgeStyle}><Lock size={10} /> Điều động theo ca</span>
                    </div>

                    <div style={lockedFieldStyle}>
                      <span style={{ fontSize: '0.725rem', color: '#64748b' }}>Phòng ban chuyên trách:</span>
                      <strong style={{ fontSize: '0.825rem', color: '#0f172a' }}>{user?.department || 'Kho Vận & Quản Trị Chuỗi Cung Ứng'}</strong>
                      <span style={lockedBadgeStyle}><Lock size={10} /> Cố định tổ chức</span>
                    </div>

                    <div style={lockedFieldStyle}>
                      <span style={{ fontSize: '0.725rem', color: '#64748b' }}>Ca làm việc quy định:</span>
                      <strong style={{ fontSize: '0.825rem', color: '#0f172a' }}>{user?.shift === 'CA_DEM' ? 'Ca Đêm (22:00 - 06:00)' : user?.shift === 'CA_CHIEU' ? 'Ca Chiều (14:00 - 22:00)' : 'Ca Hành Chính (08:00 - 17:00)'}</strong>
                      <span style={lockedBadgeStyle}><Lock size={10} /> Lịch vận hành kho</span>
                    </div>
                  </div>
                </div>

                {/* Submit Action */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                  <button
                    type="submit"
                    disabled={isUpdatingProfile}
                    style={{
                      padding: '8px 20px',
                      borderRadius: 6,
                      border: 'none',
                      backgroundColor: '#0f766e',
                      color: '#ffffff',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      cursor: isUpdatingProfile ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    {isUpdatingProfile ? <RefreshCw size={14} className="animate-spin" /> : <Save size={15} />}
                    Lưu Thay Đổi Thông Tin Cá Nhân
                  </button>
                </div>
              </form>
            )}

            {/* ══════════════════════════════════════════════════════════════
                TAB 2: ĐỔI MẬT KHẨU (NGOẠI TRỪ CUSTOMER)
            ══════════════════════════════════════════════════════════════ */}
            {activeTab === 'password' && (
              <div>
                {isCustomer ? (
                  <div
                    style={{
                      padding: '24px',
                      borderRadius: 8,
                      backgroundColor: '#f0fdf4',
                      border: '1px solid #bbf7d0',
                      textAlign: 'center',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 10,
                    }}
                  >
                    <div style={{ width: 48, height: 48, borderRadius: '50%', backgroundColor: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#166534' }}>
                      <Smartphone size={24} />
                    </div>
                    <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#166534', margin: 0 }}>
                      Tài Khoản Khách Hàng Xác Thực Qua Mã OTP Di Động
                    </h4>
                    <p style={{ fontSize: '0.825rem', color: '#15803d', maxWidth: 460, margin: 0, lineHeight: 1.5 }}>
                      Tài khoản của bạn đăng nhập tự động và an toàn thông qua số điện thoại di động và mã OTP 6 chữ số gửi về điện thoại mỗi lần truy cập, do đó không áp dụng hình thức mật khẩu tĩnh.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleChangePassword} style={{ maxWidth: 520, display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', margin: '0 0 4px 0' }}>
                        Cập Nhật Mật Khẩu Đăng Nhập
                      </h4>
                      <p style={{ fontSize: '0.775rem', color: '#64748b', margin: 0 }}>
                        Mật khẩu mới yêu cầu tối thiểu 6 ký tự. Hãy kết hợp chữ hoa, chữ số để đảm bảo an toàn truy cập phần mềm kho.
                      </p>
                    </div>

                    {passwordMessage && (
                      <div
                        style={{
                          padding: '10px 14px',
                          borderRadius: 6,
                          fontSize: '0.825rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          backgroundColor: passwordMessage.type === 'success' ? '#f0fdf4' : '#fef2f2',
                          color: passwordMessage.type === 'success' ? '#166534' : '#991b1b',
                          border: passwordMessage.type === 'success' ? '1px solid #bbf7d0' : '1px solid #fecaca',
                        }}
                      >
                        {passwordMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                        <span>{passwordMessage.text}</span>
                      </div>
                    )}

                    {/* Old Password */}
                    <div>
                      <label style={labelStyle}>Mật khẩu hiện tại *</label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type={showOldPassword ? 'text' : 'password'}
                          value={oldPassword}
                          onChange={e => setOldPassword(e.target.value)}
                          placeholder="Nhập mật khẩu đang sử dụng..."
                          style={{ ...inputStyle, width: '100%', paddingRight: 36 }}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowOldPassword(!showOldPassword)}
                          style={eyeBtnStyle}
                        >
                          {showOldPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                    </div>

                    {/* New Password */}
                    <div>
                      <label style={labelStyle}>Mật khẩu mới (tối thiểu 6 ký tự) *</label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          value={newPassword}
                          onChange={e => setNewPassword(e.target.value)}
                          placeholder="Nhập mật khẩu mới..."
                          style={{ ...inputStyle, width: '100%', paddingRight: 36 }}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          style={eyeBtnStyle}
                        >
                          {showNewPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>

                      {/* Password strength indicator */}
                      {newPassword && (
                        <div style={{ marginTop: 6 }}>
                          <div style={{ display: 'flex', gap: 4, height: 4, marginBottom: 4 }}>
                            <div style={{ flex: 1, backgroundColor: pwdStrength.score >= 1 ? pwdStrength.color : '#e2e8f0', borderRadius: 2 }}></div>
                            <div style={{ flex: 1, backgroundColor: pwdStrength.score >= 2 ? pwdStrength.color : '#e2e8f0', borderRadius: 2 }}></div>
                            <div style={{ flex: 1, backgroundColor: pwdStrength.score >= 3 ? pwdStrength.color : '#e2e8f0', borderRadius: 2 }}></div>
                          </div>
                          <span style={{ fontSize: '0.725rem', color: pwdStrength.color, fontWeight: 600 }}>
                            Độ mạnh: {pwdStrength.label}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Confirm Password */}
                    <div>
                      <label style={labelStyle}>Xác nhận mật khẩu mới *</label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={e => setConfirmPassword(e.target.value)}
                          placeholder="Nhập lại mật khẩu mới..."
                          style={{ ...inputStyle, width: '100%', paddingRight: 36 }}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          style={eyeBtnStyle}
                        >
                          {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>

                      {confirmPassword && (
                        <div style={{ marginTop: 4, fontSize: '0.725rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                          {newPassword === confirmPassword ? (
                            <span style={{ color: '#166534', display: 'flex', alignItems: 'center', gap: 4 }}>
                              <CheckCircle2 size={13} /> Mật khẩu xác nhận hoàn toàn trùng khớp
                            </span>
                          ) : (
                            <span style={{ color: '#dc2626', display: 'flex', alignItems: 'center', gap: 4 }}>
                              <AlertTriangle size={13} /> Mật khẩu xác nhận chưa trùng khớp
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* OTP Security Verification Step */}
                    <div
                      style={{
                        marginTop: 4,
                        padding: '14px',
                        borderRadius: 8,
                        backgroundColor: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 10,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <label style={{ ...labelStyle, marginBottom: 0, display: 'flex', alignItems: 'center', gap: 6, color: '#0f172a' }}>
                          <ShieldCheck size={16} color="#0f766e" /> Mã xác thực OTP (Bắt buộc) *
                        </label>
                        {user?.phone ? (
                          <span style={{ fontSize: '0.725rem', color: '#475569', backgroundColor: '#e2e8f0', padding: '2px 8px', borderRadius: 4, fontFamily: 'monospace', fontWeight: 600 }}>
                            SĐT nhận: {user.phone.length >= 7 ? user.phone.slice(0, 3) + '****' + user.phone.slice(-3) : user.phone}
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.725rem', color: '#dc2626', fontWeight: 600 }}>
                            Chưa có số điện thoại
                          </span>
                        )}
                      </div>

                      {!user?.phone ? (
                        <div
                          style={{
                            padding: '10px 12px',
                            borderRadius: 6,
                            backgroundColor: '#fef2f2',
                            border: '1px solid #fecaca',
                            fontSize: '0.775rem',
                            color: '#991b1b',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                          }}
                        >
                          <AlertTriangle size={15} style={{ flexShrink: 0 }} />
                          <span>
                            Tài khoản của bạn chưa đăng ký số điện thoại. Vui lòng chuyển sang Tab <strong>"Thông tin cá nhân"</strong> để cập nhật số điện thoại trước khi đổi mật khẩu!
                          </span>
                        </div>
                      ) : (
                        <>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <input
                              type="text"
                              value={passwordOtpCode}
                              onChange={e => setPasswordOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                              placeholder="Nhập mã OTP 6 số..."
                              maxLength={6}
                              style={{
                                ...inputStyle,
                                flex: 1,
                                letterSpacing: '4px',
                                fontSize: '1rem',
                                fontWeight: 700,
                                textAlign: 'center',
                                fontFamily: 'monospace',
                              }}
                            />
                            <button
                              type="button"
                              onClick={handleSendPasswordOtp}
                              disabled={isSendingPasswordOtp || (passwordOtpSent && passwordOtpCountdown > 0)}
                              style={{
                                padding: '8px 16px',
                                borderRadius: 6,
                                border: 'none',
                                backgroundColor: passwordOtpSent && passwordOtpCountdown > 0 ? '#f1f5f9' : '#0f766e',
                                color: passwordOtpSent && passwordOtpCountdown > 0 ? '#94a3b8' : '#ffffff',
                                fontSize: '0.775rem',
                                fontWeight: 600,
                                cursor: passwordOtpSent && passwordOtpCountdown > 0 ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {isSendingPasswordOtp ? (
                                <RefreshCw size={14} className="animate-spin" />
                              ) : passwordOtpSent && passwordOtpCountdown > 0 ? (
                                `Gửi lại (${passwordOtpCountdown}s)`
                              ) : (
                                <>
                                  <Send size={14} /> Gửi mã OTP
                                </>
                              )}
                            </button>
                          </div>

                          {passwordOtpInfo && (
                            <div
                              style={{
                                padding: '8px 12px',
                                borderRadius: 6,
                                fontSize: '0.75rem',
                                backgroundColor: passwordOtpInfo.type === 'error' ? '#fef2f2' : '#f0f9ff',
                                color: passwordOtpInfo.type === 'error' ? '#991b1b' : '#075985',
                                border: passwordOtpInfo.type === 'error' ? '1px solid #fecaca' : '1px solid #bae6fd',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                              }}
                            >
                              {passwordOtpInfo.type === 'error' ? <AlertTriangle size={14} /> : <CheckCircle2 size={14} />}
                              <span>{passwordOtpInfo.text}</span>
                            </div>
                          )}

                          <div style={{ fontSize: '0.7rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Terminal size={13} color="#0f766e" />
                            <span>Mã OTP được đồng bộ tự động về Terminal giao diện (Vite) & Terminal máy chủ</span>
                          </div>
                        </>
                      )}
                    </div>

                    <div style={{ marginTop: 6 }}>
                      <button
                        type="submit"
                        disabled={
                          isChangingPassword ||
                          !oldPassword ||
                          !newPassword ||
                          newPassword !== confirmPassword ||
                          !passwordOtpCode ||
                          passwordOtpCode.length < 6 ||
                          !user?.phone
                        }
                        style={{
                          padding: '9px 20px',
                          borderRadius: 6,
                          border: 'none',
                          backgroundColor: '#0f766e',
                          color: '#ffffff',
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          cursor:
                            isChangingPassword ||
                            !oldPassword ||
                            !newPassword ||
                            newPassword !== confirmPassword ||
                            !passwordOtpCode ||
                            passwordOtpCode.length < 6 ||
                            !user?.phone
                              ? 'not-allowed'
                              : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          opacity:
                            isChangingPassword ||
                            !oldPassword ||
                            !newPassword ||
                            newPassword !== confirmPassword ||
                            !passwordOtpCode ||
                            passwordOtpCode.length < 6 ||
                            !user?.phone
                              ? 0.6
                              : 1,
                        }}
                      >
                        {isChangingPassword ? <RefreshCw size={14} className="animate-spin" /> : <Key size={15} />}
                        Xác Nhận Đổi Mật Khẩu
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════
                TAB 3: PHÂN QUYỀN VAI TRÒ HỆ THỐNG
            ══════════════════════════════════════════════════════════════ */}
            {activeTab === 'permissions' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', margin: '0 0 4px 0' }}>
                    Quyền Hạn Nghiệp Vụ Theo Vai Trò [{roleLabel}]
                  </h4>
                  <p style={{ fontSize: '0.775rem', color: '#64748b', margin: 0 }}>
                    Hệ thống SmartWarehouse phân quyền tự động theo chuẩn Role-Based Access Control (RBAC). Dưới đây là các tác vụ tài khoản của bạn được phép thực thi:
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
                  {getPermissionCards().map((card, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '14px 16px',
                        border: '1px solid #e2e8f0',
                        borderRadius: 8,
                        backgroundColor: '#f8fafc',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: '#0f766e', fontSize: '0.85rem', marginBottom: 8 }}>
                        <CheckCircle2 size={16} />
                        <span>{card.title}</span>
                      </div>
                      <ul style={{ margin: 0, paddingLeft: 18, fontSize: '0.8rem', color: '#334155', lineHeight: 1.6 }}>
                        {card.items.map((it, i) => (
                          <li key={i}>{it}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>

                <div
                  style={{
                    padding: '12px 16px',
                    borderRadius: 8,
                    backgroundColor: '#fffbeb',
                    border: '1px solid #fde68a',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    fontSize: '0.8rem',
                    color: '#92400e',
                  }}
                >
                  <AlertCircle size={18} style={{ flexShrink: 0 }} />
                  <span>
                    <strong>Nguyên tắc bảo mật:</strong> Nếu bạn cần bổ sung quyền điều phối kho hoặc thay đổi khu vực công tác, vui lòng liên hệ Bộ phận Quản trị viên (Admin) để cập nhật hồ sơ chức vụ.
                  </span>
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════
                TAB 4: NHẬT KÝ HOẠT ĐỘNG
            ══════════════════════════════════════════════════════════════ */}
            {activeTab === 'activity' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                    Nhật Ký Thao Tác Gần Đây
                  </h4>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    Trích xuất tự động từ Hệ thống Audit Log (:3012)
                  </span>
                </div>

                {loadingLogs ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
                    Đang tải lịch sử hoạt động...
                  </div>
                ) : activityLogs.length === 0 ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                    Chưa có nhật ký hoạt động nào được ghi nhận.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {activityLogs.map(log => (
                      <div
                        key={log.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 14px',
                          border: '1px solid #e2e8f0',
                          borderRadius: 6,
                          backgroundColor: '#f8fafc',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: '50%',
                              backgroundColor: log.status === 'success' ? '#f0fdf4' : '#fffbeb',
                              color: log.status === 'success' ? '#166534' : '#92400e',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Activity size={16} />
                          </div>
                          <div>
                            <div style={{ fontSize: '0.825rem', fontWeight: 600, color: '#0f172a' }}>{log.action}</div>
                            <div style={{ fontSize: '0.725rem', color: '#64748b', marginTop: 1 }}>
                              <span>{log.time}</span> • <span style={{ color: '#0f766e' }}>{log.module}</span>
                            </div>
                          </div>
                        </div>

                        <span
                          style={{
                            fontSize: '0.725rem',
                            fontWeight: 600,
                            padding: '2px 8px',
                            borderRadius: 4,
                            backgroundColor: log.status === 'success' ? '#f0fdf4' : '#fffbeb',
                            color: log.status === 'success' ? '#166534' : '#92400e',
                            border: log.status === 'success' ? '1px solid #bbf7d0' : '1px solid #fde68a',
                          }}
                        >
                          {log.status === 'success' ? 'Thành công' : 'Cảnh báo'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          MODAL: XÁC THỰC OTP CẬP NHẬT SỐ ĐIỆN THOẠI
          (Lưu ý: Mã OTP CHỈ in ra terminal máy chủ, không hiển thị UI)
      ══════════════════════════════════════════════════════════════ */}
      {isPhoneModalOpen && (
        <div
          onClick={() => setIsPhoneModalOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 10,
              maxWidth: 440,
              width: '100%',
              padding: '20px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Smartphone size={18} color="#0f766e" />
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                  Xác Thực Cập Nhật Số Điện Thoại
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPhoneModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 4 }}
              >
                <X size={18} />
              </button>
            </div>

            {phoneOtpMessage && (
              <div
                style={{
                  padding: '8px 12px',
                  borderRadius: 6,
                  fontSize: '0.775rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 8,
                  backgroundColor: phoneOtpMessage.type === 'success' ? '#f0fdf4' : phoneOtpMessage.type === 'info' ? '#f0f9ff' : '#fef2f2',
                  color: phoneOtpMessage.type === 'success' ? '#166534' : phoneOtpMessage.type === 'info' ? '#075985' : '#991b1b',
                  border: phoneOtpMessage.type === 'success' ? '1px solid #bbf7d0' : phoneOtpMessage.type === 'info' ? '1px solid #bae6fd' : '1px solid #fecaca',
                }}
              >
                {phoneOtpMessage.type === 'success' ? <CheckCircle2 size={15} style={{ flexShrink: 0, marginTop: 2 }} /> : <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 2 }} />}
                <span>{phoneOtpMessage.text}</span>
              </div>
            )}

            {/* Step 1: Input New Phone Number & Request OTP */}
            <div>
              <label style={labelStyle}>Số điện thoại mới cần liên kết *</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  value={newPhone}
                  onChange={e => setNewPhone(e.target.value)}
                  placeholder="09xx xxx xxx"
                  disabled={otpSent && otpCountdown > 0}
                  style={{ ...inputStyle, flex: 1 }}
                />
                <button
                  type="button"
                  onClick={handleSendPhoneOtp}
                  disabled={isSendingOtp || (otpSent && otpCountdown > 0)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 6,
                    border: 'none',
                    backgroundColor: otpSent && otpCountdown > 0 ? '#f1f5f9' : '#0f766e',
                    color: otpSent && otpCountdown > 0 ? '#94a3b8' : '#ffffff',
                    fontSize: '0.775rem',
                    fontWeight: 600,
                    cursor: otpSent && otpCountdown > 0 ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {isSendingOtp ? (
                    <RefreshCw size={13} className="animate-spin" />
                  ) : otpSent && otpCountdown > 0 ? (
                    `Gửi lại (${otpCountdown}s)`
                  ) : (
                    <>
                      <Send size={13} /> Gửi OTP
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Step 2: Input 6-digit OTP code */}
            {otpSent && (
              <div>
                <label style={labelStyle}>Mã xác thực OTP (6 chữ số) *</label>
                <input
                  type="text"
                  maxLength={6}
                  value={otpCode}
                  onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="Nhập mã 6 số..."
                  style={{ ...inputStyle, width: '100%', letterSpacing: '4px', textAlign: 'center', fontSize: '1.1rem', fontWeight: 700 }}
                />
                <p style={{ fontSize: '0.7rem', color: '#64748b', margin: '4px 0 0 0' }}>
                  * Mã OTP xác thực có hiệu lực trong vòng 5 phút.
                </p>
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
              <button
                type="button"
                onClick={() => setIsPhoneModalOpen(false)}
                style={{
                  padding: '7px 14px',
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#475569',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Hủy
              </button>

              {otpSent && (
                <button
                  type="button"
                  onClick={handleVerifyPhoneOtp}
                  disabled={isVerifyingOtp || otpCode.length !== 6}
                  style={{
                    padding: '7px 16px',
                    borderRadius: 6,
                    border: 'none',
                    backgroundColor: '#0f766e',
                    color: '#ffffff',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: isVerifyingOtp || otpCode.length !== 6 ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    opacity: isVerifyingOtp || otpCode.length !== 6 ? 0.6 : 1,
                  }}
                >
                  {isVerifyingOtp ? <RefreshCw size={13} className="animate-spin" /> : <CheckCircle2 size={14} />}
                  Xác Nhận Đổi SĐT
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Styles following GEMINI.md Enterprise Tokens
const tabHeaderStyle = (isActive: boolean): React.CSSProperties => ({
  padding: '10px 16px',
  border: 'none',
  borderBottom: isActive ? '2px solid #0f766e' : '2px solid transparent',
  backgroundColor: 'transparent',
  color: isActive ? '#0f766e' : '#64748b',
  fontWeight: isActive ? 700 : 500,
  fontSize: '0.825rem',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  marginBottom: -1,
});

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.75rem',
  fontWeight: 600,
  color: '#334155',
  marginBottom: 4,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '7px 10px',
  borderRadius: 6,
  border: '1px solid #cbd5e1',
  fontSize: '0.825rem',
  color: '#0f172a',
  backgroundColor: '#ffffff',
  outline: 'none',
  boxSizing: 'border-box',
};

const eyeBtnStyle: React.CSSProperties = {
  position: 'absolute',
  right: 8,
  top: '50%',
  transform: 'translateY(-50%)',
  background: 'none',
  border: 'none',
  color: '#94a3b8',
  cursor: 'pointer',
  padding: 4,
};

const lockedFieldStyle: React.CSSProperties = {
  backgroundColor: '#f8fafc',
  padding: '8px 10px',
  borderRadius: 6,
  border: '1px solid #e2e8f0',
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  position: 'relative',
};

const lockedBadgeStyle: React.CSSProperties = {
  fontSize: '0.675rem',
  color: '#64748b',
  display: 'flex',
  alignItems: 'center',
  gap: 3,
  marginTop: 2,
};

export default UserProfile;
