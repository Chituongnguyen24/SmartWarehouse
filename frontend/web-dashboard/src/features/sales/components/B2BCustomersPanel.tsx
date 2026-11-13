import React, { useState } from 'react';
import {
  Building2,
  Plus,
  Search,
  Filter,
  Phone,
  Mail,
  MapPin,
  FileText,
  DollarSign,
  Percent,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
} from 'lucide-react';
import { CreateB2BCustomerModal } from './CreateB2BCustomerModal';

export interface B2BCustomer {
  id: string;
  code: string;
  name: string;
  companyName?: string;
  type: string;
  phone: string;
  email: string;
  taxCode?: string;
  address: string;
  billingAddress?: string;
  discountRate: number;
  creditLimit: number;
  debtBalance: number;
}

interface B2BCustomersPanelProps {
  customers: B2BCustomer[];
  onSelectCustomerForOrder: (customer: B2BCustomer) => void;
  onRefreshCustomers: () => void;
  token?: string | null;
  showToast: (msg: string) => void;
}

export const B2BCustomersPanel: React.FC<B2BCustomersPanelProps> = ({
  customers,
  onSelectCustomerForOrder,
  onRefreshCustomers,
  token,
  showToast,
}) => {
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const filteredCustomers = customers.filter(c => {
    const q = search.trim().toLowerCase();
    const matchQuery =
      !q ||
      (c.name || '').toLowerCase().includes(q) ||
      (c.companyName || '').toLowerCase().includes(q) ||
      (c.code || '').toLowerCase().includes(q) ||
      (c.phone || '').includes(q) ||
      (c.taxCode || '').toLowerCase().includes(q);

    const matchType = selectedType === 'ALL' || c.type === selectedType;
    return matchQuery && matchType;
  });

  const getTypeName = (type: string) => {
    switch (type) {
      case 'SIEU_THI':
        return 'Chuỗi Siêu Thị';
      case 'NHA_HANG':
        return 'Nhà Hàng & F&B';
      case 'KHACH_SAN':
        return 'Khách Sạn & Resort';
      case 'BEP_AN':
        return 'Bếp Ăn Công Nghiệp';
      case 'DAILY':
      default:
        return 'Đại Lý Phân Phối';
    }
  };

  const getTypeBadgeStyle = (type: string): React.CSSProperties => {
    switch (type) {
      case 'SIEU_THI':
        return { backgroundColor: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' };
      case 'NHA_HANG':
        return { backgroundColor: '#fffbeb', color: '#92400e', border: '1px solid #fde68a' };
      case 'KHACH_SAN':
        return { backgroundColor: '#f0f9ff', color: '#075985', border: '1px solid #bae6fd' };
      case 'BEP_AN':
        return { backgroundColor: '#f5f3ff', color: '#5b21b6', border: '1px solid #ddd6fe' };
      case 'DAILY':
      default:
        return { backgroundColor: '#f8fafc', color: '#334155', border: '1px solid #cbd5e1' };
    }
  };

  const totalCreditAllocated = customers.reduce((sum, c) => sum + (Number(c.creditLimit) || 0), 0);
  const totalDebtActive = customers.reduce((sum, c) => sum + (Number(c.debtBalance) || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* KPI Overview */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <div style={kpiCardStyle}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>TỔNG ĐỐI TÁC DOANH NGHIỆP</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', marginTop: 4 }}>
            {customers.length} <span style={{ fontSize: '0.85rem', fontWeight: 400, color: '#64748b' }}>đối tác</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#166534', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
            <CheckCircle2 size={13} /> 100% tài khoản đã kích hoạt
          </div>
        </div>

        <div style={kpiCardStyle}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>TỔNG HẠN MỨC TÍN DỤNG B2B</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0284c7', marginTop: 4 }}>
            {(totalCreditAllocated / 1000000).toLocaleString('vi-VN')} <span style={{ fontSize: '0.85rem', fontWeight: 400, color: '#64748b' }}>triệu</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 4 }}>
            Bảo lãnh mua hàng trả sau
          </div>
        </div>

        <div style={kpiCardStyle}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>DƯ NỢ CÔNG NỢ ĐANG CHỜ THU</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#d97706', marginTop: 4 }}>
            {(totalDebtActive / 1000000).toLocaleString('vi-VN')} <span style={{ fontSize: '0.85rem', fontWeight: 400, color: '#64748b' }}>triệu</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#92400e', marginTop: 4 }}>
            {((totalDebtActive / (totalCreditAllocated || 1)) * 100).toFixed(1)}% trên tổng hạn mức cấp phép
          </div>
        </div>

        <div style={kpiCardStyle}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>HẠN MỨC KHẢ DỤNG CÒN LẠI</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#166534', marginTop: 4 }}>
            {((totalCreditAllocated - totalDebtActive) / 1000000).toLocaleString('vi-VN')} <span style={{ fontSize: '0.85rem', fontWeight: 400, color: '#64748b' }}>triệu</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#166534', marginTop: 4 }}>
            Sẵn sàng mở thêm đơn đặt hàng
          </div>
        </div>
      </div>

      {/* Control Bar: Search, Filter & Action */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
          backgroundColor: '#ffffff',
          padding: '12px 16px',
          borderRadius: 8,
          border: '1px solid #e2e8f0',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 280 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Tìm kiếm đối tác theo tên, mã B2B, MST, số điện thoại..."
              style={{
                width: '100%',
                padding: '7px 12px 7px 32px',
                borderRadius: 6,
                border: '1px solid #cbd5e1',
                fontSize: '0.85rem',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <select
            value={selectedType}
            onChange={e => setSelectedType(e.target.value)}
            style={{
              padding: '7px 12px',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              fontSize: '0.85rem',
              color: '#334155',
              backgroundColor: '#ffffff',
              outline: 'none',
            }}
          >
            <option value="ALL">Tất Cả Loại Hình Đối Tác</option>
            <option value="SIEU_THI">Chuỗi Siêu Thị</option>
            <option value="NHA_HANG">Nhà Hàng & F&B</option>
            <option value="KHACH_SAN">Khách Sạn & Resort</option>
            <option value="BEP_AN">Bếp Ăn Công Nghiệp</option>
            <option value="DAILY">Đại Lý Phân Phối</option>
          </select>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          style={{
            padding: '7px 16px',
            borderRadius: 6,
            border: 'none',
            backgroundColor: '#0f766e',
            color: '#ffffff',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Plus size={16} /> Thêm Đối Tác B2B Mới
        </button>
      </div>

      {/* Customer Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1rem' }}>
        {filteredCustomers.map(customer => {
          const limit = Number(customer.creditLimit) || 50000000;
          const debt = Number(customer.debtBalance) || 0;
          const available = Math.max(0, limit - debt);
          const debtPercent = Math.min(100, Math.round((debt / limit) * 100));

          return (
            <div
              key={customer.id}
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 10,
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: 12,
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                transition: 'box-shadow 0.2s',
              }}
            >
              <div>
                {/* Header row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: 4,
                          fontFamily: 'monospace',
                          ...getTypeBadgeStyle(customer.type),
                        }}
                      >
                        {customer.code || 'B2B'}
                      </span>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: 4,
                          ...getTypeBadgeStyle(customer.type),
                        }}
                      >
                        {getTypeName(customer.type)}
                      </span>
                    </div>

                    <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', margin: '6px 0 2px 0' }}>
                      {customer.name}
                    </h4>

                    {customer.companyName && customer.companyName !== customer.name && (
                      <div style={{ fontSize: '0.75rem', color: '#64748b', lineClamp: 1 }}>
                        {customer.companyName}
                      </div>
                    )}
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-end',
                      padding: '4px 8px',
                      borderRadius: 6,
                      backgroundColor: '#f0fdf4',
                      border: '1px solid #bbf7d0',
                    }}
                  >
                    <span style={{ fontSize: '0.65rem', color: '#166534', fontWeight: 600 }}>Chiết khấu B2B</span>
                    <span style={{ fontSize: '1rem', fontWeight: 700, color: '#166534' }}>
                      -{customer.discountRate}%
                    </span>
                  </div>
                </div>

                {/* Info Details */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 10, fontSize: '0.8rem', color: '#475569' }}>
                  {customer.taxCode && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <FileText size={13} color="#64748b" />
                      <span>MST: <strong>{customer.taxCode}</strong></span>
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Phone size={13} color="#64748b" />
                    <span>SĐT: {customer.phone || 'Chưa cập nhật'}</span>
                    {customer.email && (
                      <>
                        <span style={{ color: '#cbd5e1' }}>|</span>
                        <Mail size={13} color="#64748b" />
                        <span style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {customer.email}
                        </span>
                      </>
                    )}
                  </div>
                  {(customer.address || customer.billingAddress) && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                      <MapPin size={13} color="#64748b" style={{ flexShrink: 0, marginTop: 2 }} />
                      <span style={{ fontSize: '0.75rem', color: '#64748b', lineClamp: 2 }}>
                        {customer.address || customer.billingAddress}
                      </span>
                    </div>
                  )}
                </div>

                {/* Credit Progress Bar */}
                <div style={{ marginTop: 12, padding: '10px', backgroundColor: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                    <span>Hạn Mức Công Nợ</span>
                    <span style={{ fontFamily: 'monospace' }}>
                      {(limit / 1000000).toLocaleString('vi-VN')} triệu VNĐ
                    </span>
                  </div>

                  <div style={{ width: '100%', height: 6, backgroundColor: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${debtPercent}%`,
                        height: '100%',
                        backgroundColor: debtPercent > 80 ? '#dc2626' : debtPercent > 50 ? '#d97706' : '#059669',
                        borderRadius: 3,
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#64748b', marginTop: 4 }}>
                    <span>Dư nợ: <strong>{(debt / 1000000).toFixed(1)} tr</strong> ({debtPercent}%)</span>
                    <span>Còn lại: <strong style={{ color: available > 0 ? '#166534' : '#dc2626' }}>{(available / 1000000).toFixed(1)} tr</strong></span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 10, display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => onSelectCustomerForOrder(customer)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 6,
                    border: '1px solid #0f766e',
                    backgroundColor: '#f0fdf4',
                    color: '#0f766e',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <Plus size={14} /> Tạo Đơn B2B Cho Đối Tác
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredCustomers.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem', backgroundColor: '#ffffff', borderRadius: 8, border: '1px dashed #cbd5e1' }}>
          <Building2 size={36} color="#94a3b8" style={{ margin: '0 auto 8px auto' }} />
          <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#334155', margin: 0 }}>
            Không tìm thấy đối tác B2B phù hợp
          </h4>
          <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 4 }}>
            Thử thay đổi từ khóa tìm kiếm hoặc bấm nút "Thêm Đối Tác B2B Mới" để thiết lập
          </p>
        </div>
      )}

      {/* Modal create partner */}
      <CreateB2BCustomerModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          onRefreshCustomers();
          showToast('Thêm hồ sơ đối tác B2B thành công vào hệ thống!');
        }}
        token={token}
      />
    </div>
  );
};

const kpiCardStyle: React.CSSProperties = {
  backgroundColor: '#ffffff',
  borderRadius: 8,
  padding: '14px 16px',
  border: '1px solid #e2e8f0',
  boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
};
