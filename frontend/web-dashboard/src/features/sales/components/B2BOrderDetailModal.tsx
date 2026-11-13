import React from 'react';
import { X, Printer, Building2, Phone, MapPin, Calendar, CheckCircle2, Clock, Truck, PackageCheck, AlertCircle } from 'lucide-react';

interface B2BOrderDetailModalProps {
  order: any | null;
  onClose: () => void;
}

export const B2BOrderDetailModal: React.FC<B2BOrderDetailModalProps> = ({ order, onClose }) => {
  if (!order) return null;

  const handlePrint = () => {
    window.print();
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'DELIVERED':
      case 'CONFIRMED':
        return (
          <span style={{ padding: '3px 10px', borderRadius: 4, fontSize: '0.75rem', fontWeight: 600, backgroundColor: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <CheckCircle2 size={13} /> Đã Giao Hàng Thành Công
          </span>
        );
      case 'SHIPPED':
        return (
          <span style={{ padding: '3px 10px', borderRadius: 4, fontSize: '0.75rem', fontWeight: 600, backgroundColor: '#f0f9ff', color: '#075985', border: '1px solid #bae6fd', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <Truck size={13} /> Đang Vận Chuyển Lạnh
          </span>
        );
      case 'PACKED':
        return (
          <span style={{ padding: '3px 10px', borderRadius: 4, fontSize: '0.75rem', fontWeight: 600, backgroundColor: '#f5f3ff', color: '#5b21b6', border: '1px solid #ddd6fe', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <PackageCheck size={13} /> Đã Đóng Gói (Chờ Xuất)
          </span>
        );
      case 'PICKING':
        return (
          <span style={{ padding: '3px 10px', borderRadius: 4, fontSize: '0.75rem', fontWeight: 600, backgroundColor: '#fffbeb', color: '#92400e', border: '1px solid #fde68a', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <Clock size={13} /> Đang Nhặt Hàng Pick-to-Light
          </span>
        );
      case 'CANCELLED':
        return (
          <span style={{ padding: '3px 10px', borderRadius: 4, fontSize: '0.75rem', fontWeight: 600, backgroundColor: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <AlertCircle size={13} /> Đã Hủy
          </span>
        );
      case 'PENDING':
      default:
        return (
          <span style={{ padding: '3px 10px', borderRadius: 4, fontSize: '0.75rem', fontWeight: 600, backgroundColor: '#f8fafc', color: '#334155', border: '1px solid #cbd5e1', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <Clock size={13} /> Chờ Kho Xử Lý
          </span>
        );
    }
  };

  const items = order.items || [];
  const totalAmount = order.totalAmount || order.finalAmount || 0;

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
          maxWidth: 720,
          width: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
        }}
      >
        {/* Modal Header */}
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
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                  Chi Tiết Đơn Hàng B2B: {order.orderCode}
                </h3>
                {renderStatusBadge(order.status)}
              </div>
              <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0, marginTop: 2 }}>
                Ngày tạo đơn: {order.createdAt || new Date().toLocaleString('vi-VN')}
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
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Partner & Logistics Info */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, backgroundColor: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: 4 }}>
                KHÁCH HÀNG DOANH NGHIỆP
              </div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>
                {order.customerName || order.requesterName}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Phone size={13} color="#64748b" />
                <span>{order.customerPhone || 'Chưa cập nhật'}</span>
              </div>
              <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: 2, display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                <MapPin size={13} color="#64748b" style={{ flexShrink: 0, marginTop: 2 }} />
                <span>{order.destination || order.address || 'Hồ Chí Minh'}</span>
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: 4 }}>
                ĐIỀU PHỐI XUẤT KHO
              </div>
              <div style={{ fontSize: '0.825rem', color: '#334155' }}>
                Kho xuất hàng: <strong>{order.warehouseCode || 'WH-006 (Tổng Kho Gò Vấp)'}</strong>
              </div>
              <div style={{ fontSize: '0.825rem', color: '#334155', marginTop: 3 }}>
                Nhân viên phụ trách: <strong>{order.salesPerson || 'Sales Admin'}</strong>
              </div>
              <div style={{ fontSize: '0.825rem', color: '#334155', marginTop: 3 }}>
                Ghi chú giao nhận: <em>{order.notes || order.deliveryNotes || 'Giao hàng tiêu chuẩn'}</em>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>
              Danh Sách Mặt Hàng Xuất Kho ({items.length})
            </h4>

            <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.825rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', textAlign: 'left' }}>
                    <th style={{ padding: '8px 12px', width: 40 }}>STT</th>
                    <th style={{ padding: '8px 12px' }}>Tên Sản Phẩm</th>
                    <th style={{ padding: '8px 12px', width: 120 }}>Mã SKU</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right', width: 80 }}>Số Lượng</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right', width: 100 }}>Đơn Giá</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right', width: 120 }}>Thành Tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '1.5rem', textAlign: 'center', color: '#94a3b8' }}>
                        Không có chi tiết mặt hàng
                      </td>
                    </tr>
                  ) : (
                    items.map((it: any, idx: number) => {
                      const qty = it.requestedQuantity || it.quantity || 1;
                      const price = it.unitPrice || it.price || 35000;
                      const sub = qty * price;

                      return (
                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '8px 12px', color: '#64748b' }}>{idx + 1}</td>
                          <td style={{ padding: '8px 12px', fontWeight: 600, color: '#0f172a' }}>
                            {it.productName || it.name}
                          </td>
                          <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: '#475569' }}>
                            {it.sku}
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600 }}>
                            {qty} {it.unit || 'Kg'}
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'right', color: '#475569' }}>
                            {price.toLocaleString('vi-VN')}đ
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: '#0f766e' }}>
                            {sub.toLocaleString('vi-VN')}đ
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Financial summary */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{ width: 280, display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.825rem', color: '#334155' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Tổng giá trị đơn hàng:</span>
                <strong style={{ fontSize: '1.05rem', color: '#0f766e' }}>
                  {totalAmount.toLocaleString('vi-VN')}đ
                </strong>
              </div>
              <div style={{ fontSize: '0.725rem', color: '#64748b', textAlign: 'right' }}>
                Đã bao gồm thuế GTGT và chiết khấu B2B
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#f8fafc',
          }}
        >
          <button
            type="button"
            onClick={handlePrint}
            style={{
              padding: '7px 14px',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#334155',
              fontSize: '0.85rem',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Printer size={15} /> In Phiếu Xuất Giao Nhận B2B
          </button>

          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '7px 18px',
              borderRadius: 6,
              border: 'none',
              backgroundColor: '#0f766e',
              color: '#ffffff',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
