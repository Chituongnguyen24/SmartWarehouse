import React from 'react';
import { X, Printer, CheckCircle2, MapPin, Phone, User, Truck, ShieldCheck, QrCode } from 'lucide-react';

interface OrderItem {
  sku: string;
  productName: string;
  requestedQuantity: number;
  quantity?: number;
  unit?: string;
  price?: number;
  lotNumber?: string;
  expiryDate?: string;
}

interface Order {
  id: string;
  orderCode: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  totalAmount: number;
  paymentMethod: string;
  status: string;
  assignedDriverName?: string;
  assignedDriverPhone?: string;
  tripNumber?: number;
  createdAt: string;
  items?: OrderItem[];
}

interface Props {
  order: Order | null;
  onClose: () => void;
}

export const PrintOrderSlipModal: React.FC<Props> = ({ order, onClose }) => {
  if (!order) return null;

  const handlePrint = () => {
    window.print();
  };

  const formattedDate = new Date(order.createdAt || Date.now()).toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '20px',
          maxWidth: '680px',
          width: '100%',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header Toolbar (Ẩn khi in) */}
        <div
          className="no-print"
          style={{
            padding: '16px 24px',
            backgroundColor: '#0f172a',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Printer size={20} color="#38bdf8" />
            <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>
              Xem Trước Phiếu Giao Hàng & Soạn Hàng Siêu Thị
            </h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={handlePrint}
              style={{
                backgroundColor: '#2563eb',
                color: '#ffffff',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 8px rgba(37,99,235,0.4)',
              }}
            >
              <Printer size={15} />
              <span>In Phiếu Ngay</span>
            </button>
            <button
              onClick={onClose}
              style={{
                backgroundColor: '#334155',
                color: '#94a3b8',
                border: 'none',
                padding: '6px',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div
          id="printable-order-slip"
          style={{
            padding: '32px',
            overflowY: 'auto',
            color: '#0f172a',
            fontFamily: 'Inter, -apple-system, sans-serif',
            fontSize: '13px',
          }}
        >
          {/* Slip Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #0f172a', paddingBottom: '16px', marginBottom: '20px' }}>
            <div>
              <div style={{ fontSize: '20px', fontWeight: 900, color: '#1e3a8a', letterSpacing: '-0.5px' }}>
                CITYMART SUPERMARKET
              </div>
              <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>
                Chi nhánh Trung tâm: Siêu thị & Kho Gò Vấp (WH-006)
              </div>
              <div style={{ fontSize: '11px', color: '#475569' }}>
                Hotline: 1900 6868 | Website: citymart.vn
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '16px', fontWeight: 900, color: '#0f172a' }}>
                PHIẾU GIAO HÀNG KIÊM SOẠN HÀNG
              </div>
              <div style={{ fontSize: '13px', fontFamily: 'monospace', fontWeight: 900, color: '#2563eb', marginTop: '4px' }}>
                #{order.orderCode}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>
                Thời gian: {formattedDate}
              </div>
            </div>
          </div>

          {/* Customer & Shipper Details Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', backgroundColor: '#f8fafc', padding: '14px', borderRadius: '12px', marginBottom: '20px', border: '1px solid #e2e8f0' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>
                Thông Tin Người Nhận
              </div>
              <div style={{ fontWeight: 800, fontSize: '14px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <User size={14} color="#2563eb" />
                <span>{order.customerName}</span>
              </div>
              <div style={{ fontSize: '12px', color: '#334155', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                <Phone size={13} color="#059669" />
                <span>{order.customerPhone}</span>
              </div>
              <div style={{ fontSize: '12px', color: '#334155', display: 'flex', alignItems: 'flex-start', gap: '6px', marginTop: '4px' }}>
                <MapPin size={13} color="#ef4444" style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>{order.customerAddress}</span>
              </div>
            </div>

            <div>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>
                Đơn Vị Vận Chuyển Siêu Thị
              </div>
              <div style={{ fontWeight: 800, fontSize: '14px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Truck size={14} color="#d97706" />
                <span>{order.assignedDriverName || 'Đội xe Hỏa tốc Siêu thị CityMart'}</span>
              </div>
              {order.tripNumber && (
                <div style={{ fontSize: '12px', color: '#047857', fontWeight: 700, marginTop: '4px' }}>
                  Chuyến giao hàng: <b>Chuyến #{order.tripNumber} (Lộ trình VRP)</b>
                </div>
              )}
              <div style={{ fontSize: '12px', color: '#475569', marginTop: '4px' }}>
                Hình thức thanh toán: <b style={{ color: order.paymentMethod === 'cod' ? '#dc2626' : '#2563eb' }}>{order.paymentMethod === 'cod' ? 'Thu hộ tiền mặt (COD)' : 'Đã thanh toán (VNPay Online)'}</b>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', marginBottom: '8px' }}>
              Danh Sách Hàng Hóa Thực Phẩm (Chuẩn Xuất FEFO)
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                  <th style={{ padding: '8px 10px', width: '30px' }}>STT</th>
                  <th style={{ padding: '8px 10px' }}>Tên Sản Phẩm / Mã SKU</th>
                  <th style={{ padding: '8px 10px' }}>Lô FEFO / Hạn Dùng</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center' }}>SL</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right' }}>Đơn Giá</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right' }}>Thành Tiền</th>
                </tr>
              </thead>
              <tbody>
                {(order.items && order.items.length > 0) ? (
                  order.items.map((item, idx) => {
                    const qty = item.quantity || item.requestedQuantity || 1;
                    const price = item.price || 0;
                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '8px 10px', color: '#64748b' }}>{idx + 1}</td>
                        <td style={{ padding: '8px 10px' }}>
                          <div style={{ fontWeight: 700, color: '#0f172a' }}>{item.productName}</div>
                          <div style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>SKU: {item.sku}</div>
                        </td>
                        <td style={{ padding: '8px 10px' }}>
                          <span style={{ fontSize: '11px', backgroundColor: '#ecfdf5', color: '#047857', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                            {item.lotNumber || 'LOT-2026-FEFO'}
                          </span>
                          {item.expiryDate && (
                            <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
                              HSD: {new Date(item.expiryDate).toLocaleDateString('vi-VN')}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 800 }}>{qty}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', color: '#475569' }}>
                          {price > 0 ? price.toLocaleString('vi-VN') + 'đ' : '—'}
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800, color: '#0f172a' }}>
                          {price > 0 ? (price * qty).toLocaleString('vi-VN') + 'đ' : '—'}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '8px 10px', color: '#64748b' }}>1</td>
                    <td style={{ padding: '8px 10px', fontWeight: 700 }}>Thực phẩm tươi sống đóng gói tiêu chuẩn CityMart</td>
                    <td style={{ padding: '8px 10px' }}>
                      <span style={{ fontSize: '11px', backgroundColor: '#ecfdf5', color: '#047857', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                        LOT-FEFO-COLD
                      </span>
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 800 }}>1</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right' }}>{order.totalAmount.toLocaleString('vi-VN')}đ</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800 }}>{order.totalAmount.toLocaleString('vi-VN')}đ</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Total Calculation & Signature */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderTop: '2px solid #e2e8f0', paddingTop: '14px', marginBottom: '24px' }}>
            <div style={{ maxWidth: '300px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#047857', fontWeight: 700, fontSize: '12px' }}>
                <ShieldCheck size={16} />
                <span>Bảo đảm chuỗi lạnh tiêu chuẩn 0 - 4°C</span>
              </div>
              <p style={{ fontSize: '11px', color: '#64748b', margin: '4px 0 0 0', lineHeight: 1.4 }}>
                Quý khách vui lòng kiểm tra kỹ số lượng & chất lượng thực phẩm trước khi nhận hàng.
              </p>
            </div>

            <div style={{ textAlign: 'right', minWidth: '220px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>
                <span>Tổng tiền hàng:</span>
                <span>{order.totalAmount.toLocaleString('vi-VN')}đ</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748b', marginBottom: '6px' }}>
                <span>Phí giao hàng:</span>
                <span style={{ color: '#059669', fontWeight: 700 }}>Miễn phí (Siêu thị)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', fontWeight: 900, color: '#0f172a', borderTop: '1px solid #cbd5e1', paddingTop: '6px' }}>
                <span>TỔNG THU {order.paymentMethod === 'cod' ? 'COD' : ''}:</span>
                <span style={{ color: '#2563eb' }}>
                  {order.paymentMethod === 'cod' ? order.totalAmount.toLocaleString('vi-VN') + 'đ' : '0đ (Đã TT)'}
                </span>
              </div>
            </div>
          </div>

          {/* Signatures */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', textAlign: 'center', marginTop: '30px', paddingTop: '10px' }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: '12px', color: '#0f172a' }}>Người Soạn Hàng (Kho)</div>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>(Ký & ghi rõ họ tên)</div>
              <div style={{ height: '50px' }}></div>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>Nhân viên Kho Gò Vấp</div>
            </div>

            <div>
              <div style={{ fontWeight: 800, fontSize: '12px', color: '#0f172a' }}>Nhân Viên Giao Hàng</div>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>(Ký nhận đơn hàng)</div>
              <div style={{ height: '50px' }}></div>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>{order.assignedDriverName || 'Shipper'}</div>
            </div>

            <div>
              <div style={{ fontWeight: 800, fontSize: '12px', color: '#0f172a' }}>Người Nhận Hàng</div>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>(Ký & xác nhận đủ hàng)</div>
              <div style={{ height: '50px' }}></div>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>{order.customerName}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
