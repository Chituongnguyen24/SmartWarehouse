import React, { useState } from 'react';
import { User, Mail, Shield, Calendar, Activity, Save, Key, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth, ROLE_LABELS, ROLE_COLORS } from '../contexts/AuthContext';

interface ActivityLog {
  id: string;
  time: string;
  action: string;
  module: string;
  status: 'success' | 'warning' | 'info';
}

const mockActivityLogs: ActivityLog[] = [
  { id: '1', time: 'Hôm nay, 14:20', action: 'Hoàn tất đơn nhập kho IB-20260630-002', module: 'Nhập kho', status: 'success' },
  { id: '2', time: 'Hôm nay, 10:15', action: 'Xác nhận xuất kho đơn hàng OB-20260630-001', module: 'Xuất kho', status: 'success' },
  { id: '3', time: 'Hôm qua, 16:45', action: 'Gán vị trí lưu trữ slot cold-shelf-A3 cho lô LOT-MILK-003', module: 'Sơ đồ kho', status: 'info' },
  { id: '4', time: 'Hôm qua, 09:30', action: 'Điều chỉnh nhiệt độ mục tiêu khu COLD lên 4.5°C', module: 'Giám sát IoT', status: 'warning' },
  { id: '5', time: '28 Th06, 11:00', action: 'Tạo tài khoản nhân viên mới cho bộ phận QC', module: 'Hệ thống', status: 'success' },
];

const UserProfile = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'info' | 'activity' | 'security'>('info');
  const [fullName, setFullName] = useState(user?.name || '');
  const [phone, setPhone] = useState('+84 987 654 321');
  const [bio, setBio] = useState(
    'Tham gia vận hành hệ thống kho thông minh CityMart. Chịu trách nhiệm giám sát chuỗi cung ứng lạnh, tối ưu hóa quy trình nhập xuất và vận dụng phân tích AI dự báo.'
  );
  const [isSaved, setIsSaved] = useState(false);

  const currentRole = user?.role || 'ADMIN';
  const roleColor = ROLE_COLORS[currentRole];
  const roleLabel = ROLE_LABELS[currentRole];

  const initials = user?.name
    ? user.name.split(' ').map(w => w.charAt(0)).slice(-2).join('')
    : 'U';

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  // Permission cards per role
  const getPermissionCards = () => {
    switch (currentRole) {
      case 'ADMIN':
        return [
          { title: 'Hành chính & Quản trị', items: ['Quản lý danh sách nhân sự vận hành', 'Cấp phát thẻ API Key và thiết lập thiết bị IoT', 'Cấu hình thông số cảnh báo AI cho toàn kho'] },
          { title: 'Hàng hóa & Cung ứng', items: ['Khởi tạo đơn nhập kho và xuất kho', 'Phê duyệt danh mục sản phẩm và nhà cung cấp', 'Áp dụng thuật toán FEFO điều phối lô hàng'] },
        ];
      case 'WAREHOUSE_MANAGER':
        return [
          { title: 'Quản lý Kho hàng', items: ['Quản lý khu vực, kệ hàng và ô chứa', 'Phê duyệt nhập kho / xuất kho', 'Xem báo cáo tồn kho chi tiết'] },
          { title: 'Giám sát & Cảnh báo', items: ['Theo dõi nhiệt độ / độ ẩm IoT', 'Xem cảnh báo rủi ro AI', 'Quản lý dự báo nhu cầu'] },
        ];
      case 'WAREHOUSE_STAFF':
        return [
          { title: 'Nghiệp vụ Kho', items: ['Quét mã SKU tiếp nhận hàng nhập', 'Cập nhật số lượng tồn kho thực tế', 'Lấy hàng xuất kho theo đề xuất FEFO'] },
          { title: 'Vị trí & Di chuyển', items: ['Xem vị trí ô chứa kệ hàng', 'Di chuyển lô hàng giữa các vị trí', 'Kiểm kê tồn kho định kỳ'] },
        ];
      case 'SALES_STAFF':
        return [
          { title: 'Đơn hàng & Bán hàng', items: ['Tạo đơn yêu cầu xuất kho', 'Xem tồn kho thực tế theo SKU', 'Nhận đề xuất đặt hàng từ AI'] },
          { title: 'Báo cáo', items: ['Xem dự báo nhu cầu', 'Theo dõi hàng sắp hết hạn', 'Xem báo cáo bán hàng / tồn kho'] },
        ];
      case 'DRIVER':
        return [
          { title: 'Vận chuyển', items: ['Xem danh sách đơn giao nhận', 'Xem tuyến đường tối ưu VRP', 'Cập nhật trạng thái giao hàng GPS'] },
          { title: 'Thông báo', items: ['Nhận thông báo lịch giao hàng', 'Cập nhật tình trạng đơn hàng', 'Xác nhận giao hàng hoàn tất'] },
        ];
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-6)' }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.25rem' }}>Thông tin tài khoản</h2>
        <p className="text-muted" style={{ fontSize: '0.875rem' }}>Xem và cập nhật thông tin cá nhân, kiểm tra lịch sử hoạt động và phân quyền trên hệ thống.</p>
      </div>

      {/* Main Container */}
      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 'var(--spacing-6)', alignItems: 'start' }}>
        
        {/* Left Side: Avatar Card */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: 'var(--spacing-6)' }}>
          <div style={{
            width: '100px', height: '100px', borderRadius: '50%',
            background: `linear-gradient(135deg, ${roleColor}, ${roleColor}aa)`,
            color: '#ffffff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '2.5rem', fontWeight: 700,
            marginBottom: 'var(--spacing-4)',
            boxShadow: `0 8px 16px ${roleColor}33`
          }}>
            {initials}
          </div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '0.25rem' }}>{user?.name || 'User'}</h3>
          <p className="text-muted" style={{ fontSize: '0.875rem', marginBottom: 'var(--spacing-4)' }}>
            {roleLabel}
          </p>
          
          <div style={{ width: '100%', height: '1px', backgroundColor: 'var(--border)', margin: 'var(--spacing-4) 0' }}></div>
          
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)', textAlign: 'left' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', fontSize: '0.875rem' }}>
              <Shield size={16} style={{ color: roleColor }} />
              <span>Quyền: <strong>{roleLabel}</strong></span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', fontSize: '0.875rem' }}>
              <Mail size={16} className="text-muted" />
              <span>{user?.email}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', fontSize: '0.875rem' }}>
              <Calendar size={16} className="text-muted" />
              <span>Tham gia: <strong>30/06/2026</strong></span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', fontSize: '0.875rem' }}>
              <CheckCircle size={16} style={{ color: '#10b981' }} />
              <span>Trạng thái: <strong style={{ color: '#10b981' }}>Đang hoạt động</strong></span>
            </div>
          </div>
        </div>

        {/* Right Side: Detail Tabs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
          {/* Tab Selector */}
          <div className="flex" style={{ borderBottom: '1px solid var(--border)', gap: 'var(--spacing-4)', paddingBottom: '0.5rem' }}>
            <button 
              type="button"
              className={`btn ${activeTab === 'info' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setActiveTab('info')}
              style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
            >
              <User size={16} style={{ marginRight: '0.5rem' }} /> Thông tin cá nhân
            </button>
            <button 
              type="button"
              className={`btn ${activeTab === 'activity' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setActiveTab('activity')}
              style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
            >
              <Activity size={16} style={{ marginRight: '0.5rem' }} /> Nhật ký hoạt động
            </button>
            <button 
              type="button"
              className={`btn ${activeTab === 'security' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setActiveTab('security')}
              style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
            >
              <Key size={16} style={{ marginRight: '0.5rem' }} /> Phân quyền hệ thống
            </button>
          </div>

          {/* Tab Content */}
          <div className="card" style={{ padding: 'var(--spacing-6)' }}>
            
            {/* TAB 1: Profile Info */}
            {activeTab === 'info' && (
              <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-4)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)' }}>
                    <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Họ và tên</label>
                    <input 
                      type="text" 
                      value={fullName} 
                      onChange={(e) => setFullName(e.target.value)}
                      className="input"
                      style={{ padding: '0.5rem', width: '100%', backgroundColor: 'var(--bg-light)', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--text)', boxSizing: 'border-box' }} 
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)' }}>
                    <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Số điện thoại</label>
                    <input 
                      type="text" 
                      value={phone} 
                      onChange={(e) => setPhone(e.target.value)}
                      className="input"
                      style={{ padding: '0.5rem', width: '100%', backgroundColor: 'var(--bg-light)', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--text)', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-4)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)' }}>
                    <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Địa chỉ Email (Hệ thống)</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', padding: '0.5rem', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--text-muted)' }}>
                      <Mail size={16} />
                      <span>{user?.email}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)' }}>
                    <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Vai trò hiện tại</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', padding: '0.5rem', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: '4px' }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: roleColor }} />
                      <span style={{ color: roleColor, fontWeight: 500, fontSize: '0.875rem' }}>{roleLabel}</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)' }}>
                  <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Giới thiệu / Bio</label>
                  <textarea 
                    value={bio} 
                    onChange={(e) => setBio(e.target.value)}
                    rows={4}
                    className="input"
                    style={{ padding: '0.5rem', width: '100%', backgroundColor: 'var(--bg-light)', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--text)', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }}
                  />
                </div>

                <div className="flex items-center justify-between" style={{ marginTop: 'var(--spacing-2)' }}>
                  {isSaved ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', color: '#10b981', fontSize: '0.875rem' }}>
                      <CheckCircle size={16} />
                      <span>Đã cập nhật thông tin thành công!</span>
                    </div>
                  ) : <div></div>}
                  <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Save size={16} /> Lưu thay đổi
                  </button>
                </div>
              </form>
            )}

            {/* TAB 2: Activity Logs */}
            {activeTab === 'activity' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>Nhật ký hoạt động gần đây</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
                  {mockActivityLogs.map((log) => (
                    <div key={log.id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: 'var(--spacing-3)',
                      backgroundColor: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid var(--border)', borderRadius: '8px', gap: 'var(--spacing-4)'
                    }}>
                      <div style={{
                        width: '36px', height: '36px', borderRadius: '50%',
                        backgroundColor: log.status === 'success' ? 'rgba(16, 185, 129, 0.1)' : log.status === 'warning' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                        color: log.status === 'success' ? '#10b981' : log.status === 'warning' ? '#f59e0b' : '#3b82f6',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                      }}>
                        <Activity size={18} />
                      </div>
                      <div style={{ flexGrow: 1 }}>
                        <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text)' }}>{log.action}</div>
                        <div style={{ display: 'flex', gap: 'var(--spacing-3)', marginTop: '0.25rem', fontSize: '0.75rem' }}>
                          <span className="text-muted">{log.time}</span>
                          <span style={{ color: 'var(--primary)' }}>• {log.module}</span>
                        </div>
                      </div>
                      <span className="badge" style={{
                        padding: '0.25rem 0.5rem', fontSize: '0.75rem', borderRadius: '4px',
                        backgroundColor: log.status === 'success' ? 'rgba(16, 185, 129, 0.1)' : log.status === 'warning' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                        color: log.status === 'success' ? '#10b981' : log.status === 'warning' ? '#f59e0b' : '#3b82f6'
                      }}>
                        {log.status === 'success' ? 'Thành công' : log.status === 'warning' ? 'Cảnh báo' : 'Thông tin'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 3: Security & System Permissions */}
            {activeTab === 'security' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>Quyền hạn kiểm soát tài khoản</h4>
                <p className="text-muted" style={{ fontSize: '0.875rem', marginBottom: 'var(--spacing-2)' }}>
                  Tài khoản của bạn được gán vai trò <strong style={{ color: roleColor }}>{roleLabel}</strong> với các quyền hạn sau:
                </p>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-4)' }}>
                  {getPermissionCards()?.map((card, idx) => (
                    <div key={idx} style={{ padding: 'var(--spacing-4)', border: '1px solid var(--border)', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.01)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, color: 'var(--text)', marginBottom: '0.5rem' }}>
                        <CheckCircle size={16} style={{ color: roleColor }} />
                        <span>{card.title}</span>
                      </div>
                      <ul style={{ fontSize: '0.825rem', paddingLeft: '1.25rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                        {card.items.map((item, i) => <li key={i}>{item}</li>)}
                      </ul>
                    </div>
                  ))}
                </div>

                <div style={{
                  display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)',
                  padding: 'var(--spacing-4)',
                  backgroundColor: 'rgba(245, 158, 11, 0.05)',
                  border: '1px solid rgba(245, 158, 11, 0.2)',
                  borderRadius: '8px', marginTop: 'var(--spacing-2)'
                }}>
                  <AlertCircle size={20} style={{ color: '#f59e0b', flexShrink: 0 }} />
                  <span style={{ fontSize: '0.825rem', color: '#f59e0b' }}>
                    <strong>Lưu ý bảo mật:</strong> Vui lòng không chia sẻ mã token JWT hoặc thông tin đăng nhập với người khác để bảo vệ an toàn vận hành của kho thực phẩm thông minh.
                  </span>
                </div>
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
};

export default UserProfile;
