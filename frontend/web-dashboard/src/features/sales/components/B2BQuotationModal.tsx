import React from 'react';
import {
  X,
  Printer,
  Building2,
  Phone,
  Mail,
  MapPin,
  Calendar,
  CheckCircle2,
  ShieldCheck,
  FileText,
  CreditCard,
  Truck,
} from 'lucide-react';
import type { B2BCustomer, OrderCartItem } from '../index';

interface B2BQuotationModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: B2BCustomer | null;
  cartItems: OrderCartItem[];
  warehouseCode: string;
  paymentTerms: string;
  deliveryDate: string;
  deliveryNotes: string;
  rawSubtotal: number;
  discountRate: number;
  discountAmount: number;
  vatRate: number;
  vatAmount: number;
  shippingFee: number;
  finalTotal: number;
}

export const B2BQuotationModal: React.FC<B2BQuotationModalProps> = ({
  isOpen,
  onClose,
  customer,
  cartItems,
  warehouseCode,
  paymentTerms,
  deliveryDate,
  deliveryNotes,
  rawSubtotal,
  discountRate,
  discountAmount,
  vatRate,
  vatAmount,
  shippingFee,
  finalTotal,
}) => {
  if (!isOpen || !customer) return null;

  const quoteCode = `QUO-B2B-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
  const quoteDate = new Date().toLocaleDateString('vi-VN');
  const validUntilDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('vi-VN');

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        padding: '1rem',
      }}
    >
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #b2b-quotation-print-area, #b2b-quotation-print-area * {
            visibility: visible !important;
          }
          #b2b-quotation-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            padding: 20mm !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div
        onClick={e => e.stopPropagation()}
        style={{
          backgroundColor: '#ffffff',
          borderRadius: 12,
          maxWidth: 820,
          width: '100%',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid #cbd5e1',
          overflow: 'hidden',
        }}
      >
        {/* Top Action Bar (No Print) */}
        <div
          className="no-print"
          style={{
            padding: '12px 20px',
            backgroundColor: '#0f172a',
            color: '#ffffff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText size={18} color="#38bdf8" />
            <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Xem Trước Bản Báo Giá Doanh Nghiệp (B2B Quotation)</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              type="button"
              onClick={handlePrint}
              style={{
                backgroundColor: '#0f766e',
                color: '#ffffff',
                border: 'none',
                borderRadius: 6,
                padding: '6px 14px',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Printer size={15} /> In Báo Giá / Xuất PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: 4,
                borderRadius: 4,
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Printable Quotation Content */}
        <div
          id="b2b-quotation-print-area"
          style={{
            padding: '30px 36px',
            overflowY: 'auto',
            color: '#0f172a',
            fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          }}
        >
          {/* Header Section */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #0f766e', paddingBottom: 16 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: 6, backgroundColor: '#0f766e', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', fontWeight: 800, fontSize: '0.95rem' }}>
                  CT
                </div>
                <div>
                  <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: '#0f766e' }}>
                    C.T MART LOGISTICS & WHOLESALE
                  </h2>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Hệ Thống Phân Phối Chuỗi Cung Ứng Thực Phẩm Thông Minh</div>
                </div>
              </div>

              <div style={{ fontSize: '0.775rem', color: '#475569', marginTop: 10, lineHeight: 1.45 }}>
                <div><strong>Đơn vị:</strong> Công ty Cổ phần Thương mại & Dịch vụ C.T Mart</div>
                <div><strong>MST:</strong> 0315998822 | <strong>Hotline:</strong> 1900 6868 | <strong>Email:</strong> b2b@ctmart.vn</div>
                <div><strong>Tổng kho xuất hàng:</strong> {warehouseCode}</div>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', letterSpacing: '0.5px' }}>
                BẢNG BÁO GIÁ
              </div>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#0f766e', fontFamily: 'monospace', marginTop: 2 }}>
                {quoteCode}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 6 }}>
                <div>Ngày lập: <strong>{quoteDate}</strong></div>
                <div>Hiệu lực đến: <strong>{validUntilDate}</strong> (07 ngày)</div>
              </div>
            </div>
          </div>

          {/* Customer / Partner Info */}
          <div style={{ marginTop: 16, padding: '12px 16px', backgroundColor: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0f766e', textTransform: 'uppercase', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Building2 size={14} /> Thông Tin Đối Tác Nhận Báo Giá (Bên Mua)
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '8px 16px', fontSize: '0.8rem', color: '#334155' }}>
              <div>
                <strong>Tên đối tác:</strong> {customer.name}
              </div>
              <div>
                <strong>Số điện thoại:</strong> {customer.phone || 'Chưa cập nhật'}
              </div>
              <div>
                <strong>Tên doanh nghiệp / Pháp nhân:</strong> {customer.companyName || customer.name}
              </div>
              <div>
                <strong>Mã số thuế (MST):</strong> {customer.taxCode || 'Theo hợp đồng'}
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <strong>Địa chỉ giao hàng:</strong> {customer.address || customer.billingAddress || 'Hồ Chí Minh'}
              </div>
              <div>
                <strong>Điều khoản thanh toán:</strong> {paymentTerms}
              </div>
              <div>
                <strong>Hẹn ngày giao hàng:</strong> {deliveryDate || 'Theo thỏa thuận'}
              </div>
              {deliveryNotes && (
                <div style={{ gridColumn: 'span 2' }}>
                  <strong>Yêu cầu vận chuyển / ghi chú:</strong> {deliveryNotes}
                </div>
              )}
            </div>
          </div>

          {/* Product Items Table */}
          <div style={{ marginTop: 18 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9', borderTop: '1px solid #cbd5e1', borderBottom: '1px solid #cbd5e1', color: '#1e293b', textAlign: 'left' }}>
                  <th style={{ padding: '8px 10px', width: 40, textAlign: 'center' }}>STT</th>
                  <th style={{ padding: '8px 10px', width: 100 }}>Mã SKU</th>
                  <th style={{ padding: '8px 10px' }}>Tên Sản Phẩm / Quy Cách</th>
                  <th style={{ padding: '8px 10px', width: 60, textAlign: 'center' }}>ĐVT</th>
                  <th style={{ padding: '8px 10px', width: 70, textAlign: 'right' }}>Số Lượng</th>
                  <th style={{ padding: '8px 10px', width: 90, textAlign: 'right' }}>Đơn Giá Niêm Yết</th>
                  <th style={{ padding: '8px 10px', width: 100, textAlign: 'right' }}>Thành Tiền</th>
                </tr>
              </thead>
              <tbody>
                {cartItems.map((item, idx) => {
                  const lineTotal = item.unitPrice * item.quantity;
                  return (
                    <tr key={item.product.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '8px 10px', textAlign: 'center', color: '#64748b' }}>{idx + 1}</td>
                      <td style={{ padding: '8px 10px', fontFamily: 'monospace', fontWeight: 600, color: '#0f766e' }}>
                        {item.product.sku}
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>{item.product.name}</div>
                        {item.lotCode && (
                          <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                            Lô FEFO: {item.lotCode} | HSD: {item.expiryDate ? new Date(item.expiryDate).toLocaleDateString('vi-VN') : 'Chuẩn'}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'center', color: '#475569' }}>{item.product.unit}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600, color: '#0f172a' }}>
                        {item.quantity.toLocaleString('vi-VN')}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', color: '#475569' }}>
                        {item.unitPrice.toLocaleString('vi-VN')}đ
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                        {lineTotal.toLocaleString('vi-VN')}đ
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Financial Calculation Breakdown */}
          <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{ width: 340, fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: 5 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                <span>Tổng tiền hàng niêm yết:</span>
                <span style={{ fontWeight: 600 }}>{rawSubtotal.toLocaleString('vi-VN')}đ</span>
              </div>

              {discountRate > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#166534' }}>
                  <span>Chiết khấu đối tác ({discountRate}%):</span>
                  <span style={{ fontWeight: 600 }}>-{discountAmount.toLocaleString('vi-VN')}đ</span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                <span>Thuế giá trị gia tăng (VAT {vatRate}%):</span>
                <span style={{ fontWeight: 600 }}>+{vatAmount.toLocaleString('vi-VN')}đ</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                <span>Phí vận chuyển chuyên dụng (xe tải lạnh):</span>
                <span style={{ fontWeight: 600 }}>
                  {shippingFee === 0 ? 'Miễn phí (Đơn >= 5 triệu)' : `+${shippingFee.toLocaleString('vi-VN')}đ`}
                </span>
              </div>

              <div
                style={{
                  marginTop: 6,
                  paddingTop: 8,
                  borderTop: '2px solid #0f766e',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                }}
              >
                <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a' }}>TỔNG THANH TOÁN:</span>
                <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f766e' }}>
                  {finalTotal.toLocaleString('vi-VN')} VNĐ
                </span>
              </div>
            </div>
          </div>

          {/* Terms, Assurance & Signatures */}
          <div style={{ marginTop: 24, paddingTop: 14, borderTop: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.725rem', color: '#64748b', lineHeight: 1.5 }}>
              <div><strong>Cam kết dịch vụ:</strong> Toàn bộ hàng hóa đạt tiêu chuẩn kiểm nghiệm ATTP và chứng chỉ VietGAP/GlobalGAP tương ứng. Chuỗi lạnh được bảo đảm liên tục từ kho đến điểm giao.</div>
              <div><strong>Phương thức thanh toán:</strong> {paymentTerms}. Hạn mức công nợ kiểm soát tự động theo chính sách khách hàng doanh nghiệp C.T Mart.</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 28, textAlign: 'center' }}>
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a' }}>ĐẠI DIỆN BÊN MUA</div>
                <div style={{ fontSize: '0.725rem', color: '#64748b', fontStyle: 'italic', marginTop: 2 }}>(Ký, ghi rõ họ tên & đóng dấu)</div>
                <div style={{ height: 60 }}></div>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>{customer.name}</div>
              </div>

              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a' }}>ĐẠI DIỆN C.T MART LOGISTICS</div>
                <div style={{ fontSize: '0.725rem', color: '#64748b', fontStyle: 'italic', marginTop: 2 }}>(Ký, ghi rõ họ tên & đóng dấu)</div>
                <div style={{ height: 60 }}></div>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#0f766e' }}>Phòng Điều Phối Kinh Doanh B2B</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

