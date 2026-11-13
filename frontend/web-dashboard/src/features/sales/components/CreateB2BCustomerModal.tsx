import React, { useState } from 'react';
import { X, Building2, Phone, Mail, FileText, MapPin, DollarSign, Percent, CheckCircle2 } from 'lucide-react';

interface CreateB2BCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newCustomer: any) => void;
  token?: string | null;
}

const B2B_TYPES = [
  { value: 'SIEU_THI', label: 'Chuỗi Siêu Thị / Cửa Hàng Tiện Lợi' },
  { value: 'NHA_HANG', label: 'Chuỗi Nhà Hàng & F&B' },
  { value: 'KHACH_SAN', label: 'Khách Sạn & Resort' },
  { value: 'BEP_AN', label: 'Bếp Ăn Công Nghiệp / Học Đường' },
  { value: 'DAILY', label: 'Đại Lý Phân Phối / Bán Sỉ' },
];

export const CreateB2BCustomerModal: React.FC<CreateB2BCustomerModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  token,
}) => {
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [taxCode, setTaxCode] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [b2bType, setB2bType] = useState('DAILY');
  const [creditLimit, setCreditLimit] = useState(100000000);
  const [discountRate, setDiscountRate] = useState(10);
  const [billingAddress, setBillingAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Vui lòng nhập tên đối tác / thương hiệu');
      return;
    }
    if (!phone.trim()) {
      setError('Vui lòng nhập số điện thoại liên hệ');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('http://localhost:3012/users/b2b-customers', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: name.trim(),
          companyName: (companyName.trim() || name.trim()),
          taxCode: taxCode.trim(),
          phone: phone.trim(),
          email: email.trim(),
          b2bType,
          creditLimit: Number(creditLimit) || 50000000,
          discountRate: Number(discountRate) || 0,
          billingAddress: billingAddress.trim(),
        }),
      });

      if (res.ok) {
        const created = await res.json();
        onSuccess(created);
        onClose();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.message || 'Không thể tạo hồ sơ đối tác. Vui lòng thử lại.');
      }
    } catch (err: any) {
      setError(err?.message || 'Lỗi kết nối tới máy chủ');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      onClick={onClose}
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
          borderRadius: 12,
          maxWidth: 620,
          width: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#f8fafc',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                backgroundColor: '#f0fdf4',
                color: '#166534',
                border: '1px solid #bbf7d0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Building2 size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                Thêm Hồ Sơ Đối Tác B2B Mới
              </h3>
              <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0, marginTop: 2 }}>
                Thiết lập thông tin pháp nhân, hạn mức công nợ và chiết khấu phân phối
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#94a3b8',
              padding: 4,
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} style={{ overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {error && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 8,
                backgroundColor: '#fef2f2',
                color: '#991b1b',
                border: '1px solid #fecaca',
                fontSize: '0.85rem',
              }}
            >
              {error}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                Tên Đối Tác / Chuỗi Thương Hiệu *
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="VD: Siêu thị WinMart+ (Gò Vấp)"
                required
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                Phân Loại Đối Tác B2B
              </label>
              <select
                value={b2bType}
                onChange={e => setB2bType(e.target.value)}
                style={inputStyle}
              >
                {B2B_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: 4 }}>
              Tên Công Ty Pháp Nhân (Xuất Hóa Đơn)
            </label>
            <input
              type="text"
              value={companyName}
              onChange={e => setCompanyName(e.target.value)}
              placeholder="VD: Công ty Cổ phần Thương mại Dịch vụ Tổng hợp..."
              style={inputStyle}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                Mã Số Thuế (MST)
              </label>
              <input
                type="text"
                value={taxCode}
                onChange={e => setTaxCode(e.target.value)}
                placeholder="VD: 0301412589"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                Số Điện Thoại Liên Hệ *
              </label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="VD: 0903 112 233"
                required
                style={inputStyle}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: 4 }}>
              Email Kế Toán / Đặt Hàng
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="VD: purchasing@partner-domain.vn"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: 4 }}>
              Địa Chỉ Giao Hàng & Trụ Sở Doanh Nghiệp
            </label>
            <input
              type="text"
              value={billingAddress}
              onChange={e => setBillingAddress(e.target.value)}
              placeholder="VD: 350 Lê Đức Thọ, Phường 6, Quận Gò Vấp, TP.HCM"
              style={inputStyle}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 12, backgroundColor: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                Hạn Mức Công Nợ (VNĐ)
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="number"
                  step="5000000"
                  value={creditLimit}
                  onChange={e => setCreditLimit(Number(e.target.value))}
                  style={{ ...inputStyle, paddingRight: 45 }}
                />
                <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: '0.75rem', color: '#64748b' }}>
                  VNĐ
                </span>
              </div>
              <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                Hạn mức mua trước trả sau ({(creditLimit / 1000000).toLocaleString('vi-VN')} triệu)
              </span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                Chiết Khấu Mặc Định (%)
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={discountRate}
                  onChange={e => setDiscountRate(Number(e.target.value))}
                  style={{ ...inputStyle, paddingRight: 35 }}
                />
                <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: '0.85rem', fontWeight: 700, color: '#64748b' }}>
                  %
                </span>
              </div>
              <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                Tự áp dụng vào đơn B2B
              </span>
            </div>
          </div>

          {/* Footer Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                padding: '8px 16px',
                borderRadius: 6,
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#334155',
                fontSize: '0.875rem',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Hủy Bỏ
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                padding: '8px 20px',
                borderRadius: 6,
                border: 'none',
                backgroundColor: '#0f766e',
                color: '#ffffff',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                opacity: isSubmitting ? 0.7 : 1,
              }}
            >
              {isSubmitting ? (
                <>Đang lưu...</>
              ) : (
                <>
                  <CheckCircle2 size={16} /> Lưu Hồ Sơ Đối Tác
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  borderRadius: 6,
  border: '1px solid #cbd5e1',
  fontSize: '0.875rem',
  color: '#0f172a',
  backgroundColor: '#ffffff',
  outline: 'none',
  boxSizing: 'border-box',
};
