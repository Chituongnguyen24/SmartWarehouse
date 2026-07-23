import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Phone, MapPin, Award, ShoppingBag, LogOut, Plus, Trash2, CheckCircle, ShieldCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useWebCart, type CustomerAddress } from '../contexts/WebCartContext';

const CustomerProfile: React.FC = () => {
  const { user, logout } = useAuth();
  const { addresses, addAddress, setSelectedAddress, selectedAddress } = useWebCart();
  const navigate = useNavigate();

  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newAddressText, setNewAddressText] = useState('');
  const [isDefault, setIsDefault] = useState(false);

  const handleAddAddress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newPhone || !newAddressText) {
      alert('Vui lòng điền đầy đủ thông tin!');
      return;
    }
    addAddress({
      name: newName,
      phone: newPhone,
      address: newAddressText,
      isDefault: isDefault
    });
    setNewName('');
    setNewPhone('');
    setNewAddressText('');
    setIsDefault(false);
    setShowAddModal(false);
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#1e293b', marginBottom: '2rem' }}>
        Hồ sơ cá nhân
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '2rem' }}>
        {/* LEFT COLUMN: USER CARD */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* USER INFO CARD */}
          <div style={{
            backgroundColor: 'white', padding: '2rem 1.5rem', borderRadius: '16px',
            border: '1px solid #e2e8f0', textAlign: 'center', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)'
          }}>
            <div style={{
              width: '90px', height: '90px', borderRadius: '50%', backgroundColor: '#ecfdf5',
              color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1.25rem auto', fontSize: '2.5rem', fontWeight: 800, border: '3px solid #10b981'
            }}>
              {user?.name ? user.name.charAt(0).toUpperCase() : 'C'}
            </div>

            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', margin: '0 0 4px 0' }}>
              {user?.name || 'Khách hàng CityMart'}
            </h3>
            <div style={{
              display: 'inline-block', backgroundColor: '#f0fdf4', color: '#10b981',
              padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700,
              marginBottom: '1.5rem'
            }}>
              Thành viên Vàng CityMart
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'left', borderTop: '1px solid #f1f5f9', paddingTop: '1.25rem', fontSize: '0.9rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#64748b' }}>
                <Mail size={18} color="#10b981" />
                <span>{user?.email || 'customer@sfwms.vn'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#64748b' }}>
                <Phone size={18} color="#10b981" />
                <span>0909 888 999</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#64748b' }}>
                <ShieldCheck size={18} color="#10b981" />
                <span>Tài khoản đã xác thực</span>
              </div>
            </div>

            <button
              onClick={() => { logout(); navigate('/login'); }}
              style={{
                marginTop: '1.5rem', width: '100%', padding: '12px', borderRadius: '8px',
                backgroundColor: '#fef2f2', color: '#ef4444', border: '1px solid #fee2e2',
                fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center',
                justifyContent: 'center', gap: '8px'
              }}
            >
              <LogOut size={18} /> Đăng xuất
            </button>
          </div>

          {/* LOYALTY CARD */}
          <div style={{
            backgroundColor: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            background: '#10b981', color: 'white', padding: '1.5rem', borderRadius: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
              <Award size={28} />
              <div>
                <div style={{ fontSize: '0.8rem', opacity: 0.9 }}>Tích điểm thưởng</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>1.250 Điểm</div>
              </div>
            </div>
            <div style={{ fontSize: '0.85rem', opacity: 0.9, lineHeight: '1.4' }}>
              Đổi ngay voucher giảm 50.000đ cho đơn hàng thực phẩm tiếp theo!
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: ADDRESS MANAGEMENT & QUICK STATS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* QUICK NAV BUTTONS */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div
              onClick={() => navigate('/my-orders')}
              style={{
                backgroundColor: 'white', padding: '1.25rem', borderRadius: '12px',
                border: '1px solid #e2e8f0', cursor: 'pointer', display: 'flex',
                alignItems: 'center', gap: '1rem'
              }}
            >
              <div style={{ backgroundColor: '#f0fdf4', padding: '12px', borderRadius: '10px', color: '#10b981' }}>
                <ShoppingBag size={24} />
              </div>
              <div>
                <h4 style={{ margin: '0 0 4px 0', fontSize: '1rem', fontWeight: 700, color: '#1e293b' }}>Lịch sử đơn hàng</h4>
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Xem và theo dõi đơn</span>
              </div>
            </div>

            <div
              onClick={() => navigate('/store')}
              style={{
                backgroundColor: 'white', padding: '1.25rem', borderRadius: '12px',
                border: '1px solid #e2e8f0', cursor: 'pointer', display: 'flex',
                alignItems: 'center', gap: '1rem'
              }}
            >
              <div style={{ backgroundColor: '#eff6ff', padding: '12px', borderRadius: '10px', color: '#3b82f6' }}>
                <Award size={24} />
              </div>
              <div>
                <h4 style={{ margin: '0 0 4px 0', fontSize: '1rem', fontWeight: 700, color: '#1e293b' }}>Ưu đãi của tôi</h4>
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Voucher & quà tặng</span>
              </div>
            </div>
          </div>

          {/* ADDRESS BOOK SECTION */}
          <div style={{ backgroundColor: 'white', padding: '1.75rem', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1e293b', margin: '0 0 4px 0' }}>
                  Sổ địa chỉ nhận hàng
                </h3>
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Quản lý địa chỉ giao hàng của bạn</span>
              </div>
              <button
                onClick={() => setShowAddModal(true)}
                style={{
                  backgroundColor: '#10b981', color: 'white', border: 'none',
                  padding: '8px 16px', borderRadius: '8px', fontWeight: 700,
                  fontSize: '0.85rem', cursor: 'pointer', display: 'flex',
                  alignItems: 'center', gap: '6px'
                }}
              >
                <Plus size={16} /> Thêm địa chỉ
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {addresses.map(addr => {
                const isSelected = selectedAddress?.id === addr.id;
                return (
                  <div
                    key={addr.id}
                    style={{
                      padding: '1.25rem', borderRadius: '12px',
                      border: isSelected ? '2px solid #10b981' : '1px solid #cbd5e1',
                      backgroundColor: isSelected ? '#f0fdf4' : 'white',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                        <span style={{ fontWeight: 700, fontSize: '1rem', color: '#1e293b' }}>{addr.name}</span>
                        <span style={{ color: '#64748b', fontSize: '0.9rem' }}>({addr.phone})</span>
                        {addr.isDefault && (
                          <span style={{ backgroundColor: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>
                            Mặc định
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.9rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <MapPin size={16} color="#64748b" />
                        {addr.address}
                      </div>
                    </div>

                    <button
                      onClick={() => setSelectedAddress(addr)}
                      style={{
                        background: 'none', border: isSelected ? 'none' : '1px solid #cbd5e1',
                        padding: '6px 12px', borderRadius: '6px', fontSize: '0.85rem',
                        fontWeight: 600, color: isSelected ? '#10b981' : '#64748b', cursor: 'pointer'
                      }}
                    >
                      {isSelected ? 'Đang chọn' : 'Chọn làm địa chỉ chính'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ADD ADDRESS MODAL */}
      {showAddModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '2rem', width: '480px', maxWidth: '90%' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 1.5rem 0', color: '#1e293b' }}>
              Thêm địa chỉ giao hàng mới
            </h3>
            <form onSubmit={handleAddAddress}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Họ và tên người nhận</label>
                  <input
                    type="text"
                    placeholder="Ví dụ: Nguyễn Văn A"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Số điện thoại</label>
                  <input
                    type="tel"
                    placeholder="Ví dụ: 0908 123 456"
                    value={newPhone}
                    onChange={e => setNewPhone(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Địa chỉ giao hàng</label>
                  <textarea
                    placeholder="Ví dụ: 227 Nguyễn Văn Cừ, Phường 4, Quận 5, TP.HCM"
                    value={newAddressText}
                    onChange={e => setNewAddressText(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', height: '80px' }}
                    required
                  />
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', color: '#475569', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={isDefault}
                    onChange={e => setIsDefault(e.target.checked)}
                  />
                  Đặt làm địa chỉ mặc định
                </label>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{ flex: 1, padding: '12px', border: '1px solid #cbd5e1', background: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  style={{ flex: 1, padding: '12px', border: 'none', backgroundColor: '#10b981', color: 'white', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Lưu địa chỉ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerProfile;
