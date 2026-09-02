import React from 'react';
import { X, Printer, ShieldCheck, CheckCircle2, FileText } from 'lucide-react';

export type VoucherType = 'PHIEU_THU_01_TT' | 'PHIEU_XUAT_02_VT' | 'BIEN_BAN_KIEM_KE_08_VT' | 'SO_NXT_S10_DN';

interface Props {
  voucherType: VoucherType;
  data: any;
  onClose: () => void;
}

export const PrintAccountingVoucherModal: React.FC<Props> = ({ voucherType, data, onClose }) => {
  const handlePrint = () => {
    window.print();
  };

  const currentDateStr = new Date().toLocaleDateString('vi-VN', {
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
          maxWidth: '780px',
          width: '100%',
          maxHeight: '94vh',
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
            <FileText size={20} color="#38bdf8" />
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 800, margin: 0 }}>
                Chứng Từ Kế Toán Chuẩn Bộ Tài Chính (Thông tư 200/2014/TT-BTC)
              </h3>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                Hệ Thống Quản Lý Kho & Siêu Thị CityMart • MST: 0314892716
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={handlePrint}
              style={{
                backgroundColor: '#2563eb',
                color: '#ffffff',
                border: 'none',
                padding: '8px 18px',
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
              <span>In Chứng Từ Ngay</span>
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
          id="printable-accounting-voucher"
          style={{
            padding: '36px',
            overflowY: 'auto',
            color: '#0f172a',
            fontFamily: '"Times New Roman", Times, serif',
            fontSize: '13.5px',
            lineHeight: 1.45,
          }}
        >
          {/* Top National Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
            <div>
              <div style={{ fontWeight: 'bold', fontSize: '13px' }}>Đơn vị: CÔNG TY CỔ PHẦN SIÊU THỊ CITYMART</div>
              <div style={{ fontSize: '12px' }}>Địa chỉ: 364 Phan Văn Trị, Phường 5, Quận Gò Vấp, TP.HCM</div>
              <div style={{ fontSize: '12px' }}>Mã số thuế: 0314892716</div>
            </div>

            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 'bold', fontSize: '12px' }}>
                {voucherType === 'PHIEU_THU_01_TT' && 'Mẫu số 01 - TT'}
                {voucherType === 'PHIEU_XUAT_02_VT' && 'Mẫu số 02 - VT'}
                {voucherType === 'BIEN_BAN_KIEM_KE_08_VT' && 'Mẫu số 08 - VT'}
                {voucherType === 'SO_NXT_S10_DN' && 'Mẫu số S10 - DN'}
              </div>
              <div style={{ fontSize: '11px', fontStyle: 'italic' }}>
                (Ban hành theo Thông tư số 200/2014/TT-BTC<br />ngày 22/12/2014 của Bộ Tài chính)
              </div>
            </div>
          </div>

          {/* VOUCHER TYPE 1: PHIẾU THU TIỀN MẶT COD (MẪU 01-TT) */}
          {voucherType === 'PHIEU_THU_01_TT' && (
            <div>
              <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 'bold', margin: '0 0 4px 0', textTransform: 'uppercase' }}>
                  PHIẾU THU TIỀN MẶT COD
                </h2>
                <div style={{ fontStyle: 'italic', fontSize: '12.5px' }}>
                  Ngày {new Date().getDate()} tháng {new Date().getMonth() + 1} năm {new Date().getFullYear()}
                </div>
                <div style={{ fontSize: '13px', marginTop: '2px' }}>
                  Số: <b style={{ fontFamily: 'monospace' }}>PT-COD-{data?.id || '2026-001'}</b>
                </div>
              </div>

              {/* Định khoản Nợ / Có */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '20px', marginBottom: '14px', fontSize: '13px' }}>
                <div>Nợ TK: <b style={{ textDecoration: 'underline' }}>1111</b> (Tiền mặt VND)</div>
                <div>Có TK: <b style={{ textDecoration: 'underline' }}>131 / 1388</b> (Thu hộ COD)</div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <div style={{ marginBottom: '6px' }}>
                  Họ và tên người nộp tiền: <b>{data?.name || 'Tài xế giao hàng siêu thị'}</b> ({data?.phone || '0901 234 567'})
                </div>
                <div style={{ marginBottom: '6px' }}>
                  Địa chỉ/Đội xe: <b>Đội Giao Vận Hỏa Tốc Siêu Thị CityMart Gò Vấp</b> ({data?.vehicleType || 'Xe máy'}) - Biển số: <b>{data?.plate || '59-V1 888.99'}</b>
                </div>
                <div style={{ marginBottom: '6px' }}>
                  Lý do nộp: <b>Nộp tiền mặt thu hộ (COD) sau khi hoàn tất {data?.completedOrders || 18} đơn hàng trong ca làm việc ({data?.totalTrips || 3} chuyến VRP)</b>
                </div>
                <div style={{ marginBottom: '6px' }}>
                  Số tiền nộp: <b style={{ fontSize: '15px', color: '#1e3a8a' }}>{(data?.codCollected || 4850000).toLocaleString('vi-VN')} VNĐ</b>
                </div>
                <div style={{ marginBottom: '6px', fontStyle: 'italic' }}>
                  (Viết bằng chữ: <b>Bốn triệu tám trăm năm mươi nghìn đồng chẵn</b>)
                </div>
                <div style={{ marginBottom: '6px' }}>
                  Kèm theo: <b>Bảng kê chi tiết {data?.completedOrders || 18} đơn hàng đã giao thành công có chữ ký/POD</b>
                </div>
              </div>

              {/* Signatures */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', textAlign: 'center', marginTop: '30px', fontSize: '12px' }}>
                <div>
                  <div style={{ fontWeight: 'bold' }}>Giám đốc</div>
                  <div style={{ fontStyle: 'italic', fontSize: '11px' }}>(Ký, họ tên, đóng dấu)</div>
                  <div style={{ height: '55px' }}></div>
                  <div style={{ fontWeight: 'bold' }}>Nguyễn Văn An</div>
                </div>
                <div>
                  <div style={{ fontWeight: 'bold' }}>Kế toán trưởng</div>
                  <div style={{ fontStyle: 'italic', fontSize: '11px' }}>(Ký, họ tên)</div>
                  <div style={{ height: '55px' }}></div>
                  <div style={{ fontWeight: 'bold' }}>Trần Thị Mai</div>
                </div>
                <div>
                  <div style={{ fontWeight: 'bold' }}>Người lập phiếu</div>
                  <div style={{ fontStyle: 'italic', fontSize: '11px' }}>(Ký, họ tên)</div>
                  <div style={{ height: '55px' }}></div>
                  <div style={{ fontWeight: 'bold' }}>Lê Thu Thảo</div>
                </div>
                <div>
                  <div style={{ fontWeight: 'bold' }}>Người nộp tiền</div>
                  <div style={{ fontStyle: 'italic', fontSize: '11px' }}>(Ký, họ tên)</div>
                  <div style={{ height: '55px' }}></div>
                  <div style={{ fontWeight: 'bold' }}>{data?.name || 'Võ Minh Trí'}</div>
                </div>
                <div>
                  <div style={{ fontWeight: 'bold' }}>Thủ quỹ</div>
                  <div style={{ fontStyle: 'italic', fontSize: '11px' }}>(Ký, họ tên)</div>
                  <div style={{ height: '55px' }}></div>
                  <div style={{ fontWeight: 'bold' }}>Phạm Ngọc Lan</div>
                </div>
              </div>
            </div>
          )}

          {/* VOUCHER TYPE 2: PHIẾU XUẤT KHO (MẪU 02-VT) */}
          {voucherType === 'PHIEU_XUAT_02_VT' && (
            <div>
              <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 'bold', margin: '0 0 4px 0', textTransform: 'uppercase' }}>
                  PHIẾU XUẤT KHO THỰC PHẨM
                </h2>
                <div style={{ fontStyle: 'italic', fontSize: '12.5px' }}>
                  (Xuất bán lẻ & Giao hàng theo chuẩn FEFO)
                </div>
                <div style={{ fontSize: '13px', marginTop: '2px' }}>
                  Ngày {currentDateStr} • Số: <b style={{ fontFamily: 'monospace' }}>PXK-2026-FEFO-089</b>
                </div>
              </div>

              {/* Định khoản Nợ / Có */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '20px', marginBottom: '14px', fontSize: '13px' }}>
                <div>Nợ TK: <b style={{ textDecoration: 'underline' }}>632</b> (Giá vốn hàng bán)</div>
                <div>Có TK: <b style={{ textDecoration: 'underline' }}>1561</b> (Hàng hóa kho lạnh)</div>
              </div>

              <div style={{ marginBottom: '14px', fontSize: '13px' }}>
                <div>Họ tên người nhận hàng: <b>Đội Giao Hàng Siêu Thị CityMart</b> • Địa chỉ kho xuất: <b>Kho Gò Vấp WH-006</b></div>
                <div>Lý do xuất kho: <b>Xuất kho giao hàng theo đơn đặt hàng TMĐT (Tối ưu lô cận date FEFO)</b></div>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left', marginBottom: '20px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9', border: '1px solid #000' }}>
                    <th style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'center', width: '30px' }}>STT</th>
                    <th style={{ border: '1px solid #000', padding: '6px 8px' }}>Tên Hàng Hóa / Quy Cách</th>
                    <th style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'center' }}>Mã SKU</th>
                    <th style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'center' }}>Lô FEFO</th>
                    <th style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'center' }}>ĐVT</th>
                    <th style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'center' }}>SL Yêu Cầu</th>
                    <th style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'center' }}>SL Thực Xuất</th>
                    <th style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'right' }}>Đơn Giá Vốn</th>
                    <th style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'right' }}>Thành Tiền</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ border: '1px solid #000' }}>
                    <td style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'center' }}>1</td>
                    <td style={{ border: '1px solid #000', padding: '6px 8px' }}>Thịt heo xay hữu cơ CP (Khay 500g)</td>
                    <td style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'center' }}>SKU-PORK-01</td>
                    <td style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'center' }}>LOT-0828-C</td>
                    <td style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'center' }}>Khay</td>
                    <td style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'center' }}>20</td>
                    <td style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'center' }}>20</td>
                    <td style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'right' }}>58.000đ</td>
                    <td style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'right' }}>1.160.000đ</td>
                  </tr>
                  <tr style={{ border: '1px solid #000' }}>
                    <td style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'center' }}>2</td>
                    <td style={{ border: '1px solid #000', padding: '6px 8px' }}>Sữa tươi tiệt trùng TH True Milk 1L</td>
                    <td style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'center' }}>SKU-MILK-02</td>
                    <td style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'center' }}>LOT-0820-A</td>
                    <td style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'center' }}>Hộp</td>
                    <td style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'center' }}>35</td>
                    <td style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'center' }}>35</td>
                    <td style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'right' }}>32.000đ</td>
                    <td style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'right' }}>1.120.000đ</td>
                  </tr>
                  <tr style={{ border: '1px solid #000', fontWeight: 'bold', backgroundColor: '#f8fafc' }}>
                    <td colSpan={6} style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'center' }}>CỘNG GIÁ VỐN XUẤT KHO</td>
                    <td style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'center' }}>55</td>
                    <td style={{ border: '1px solid #000', padding: '6px 8px' }}></td>
                    <td style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'right' }}>2.280.000đ</td>
                  </tr>
                </tbody>
              </table>

              {/* Signatures */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', textAlign: 'center', marginTop: '30px', fontSize: '12px' }}>
                <div>
                  <div style={{ fontWeight: 'bold' }}>Người lập phiếu</div>
                  <div style={{ fontStyle: 'italic', fontSize: '11px' }}>(Ký, họ tên)</div>
                  <div style={{ height: '55px' }}></div>
                  <div style={{ fontWeight: 'bold' }}>Lê Thu Thảo</div>
                </div>
                <div>
                  <div style={{ fontWeight: 'bold' }}>Người nhận hàng</div>
                  <div style={{ fontStyle: 'italic', fontSize: '11px' }}>(Ký, họ tên)</div>
                  <div style={{ height: '55px' }}></div>
                  <div style={{ fontWeight: 'bold' }}>Võ Minh Trí</div>
                </div>
                <div>
                  <div style={{ fontWeight: 'bold' }}>Thủ kho</div>
                  <div style={{ fontStyle: 'italic', fontSize: '11px' }}>(Ký, họ tên)</div>
                  <div style={{ height: '55px' }}></div>
                  <div style={{ fontWeight: 'bold' }}>Hoàng Minh Tuấn</div>
                </div>
                <div>
                  <div style={{ fontWeight: 'bold' }}>Kế toán trưởng</div>
                  <div style={{ fontStyle: 'italic', fontSize: '11px' }}>(Ký, họ tên)</div>
                  <div style={{ height: '55px' }}></div>
                  <div style={{ fontWeight: 'bold' }}>Trần Thị Mai</div>
                </div>
              </div>
            </div>
          )}

          {/* VOUCHER TYPE 3: BIÊN BẢN KIỂM KÊ (MẪU 08-VT) */}
          {voucherType === 'BIEN_BAN_KIEM_KE_08_VT' && (
            <div>
              <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 4px 0', textTransform: 'uppercase' }}>
                  BIÊN BẢN KIỂM KÊ VẬT TƯ, CÔNG CỤ, SẢN PHẨM, HÀNG HÓA
                </h2>
                <div style={{ fontStyle: 'italic', fontSize: '12px' }}>
                  Thời điểm kiểm kê: 17 giờ 00 ngày {currentDateStr} tại Kho Lạnh Gò Vấp (WH-006)
                </div>
              </div>

              <div style={{ fontSize: '12.5px', marginBottom: '12px' }}>
                Ban kiểm kê gồm có:
                <br />1. Ông/Bà: <b>Nguyễn Văn An</b> - Chức vụ: Trưởng Ban Giám Đốc (Trưởng ban)
                <br />2. Ông/Bà: <b>Trần Thị Mai</b> - Chức vụ: Kế toán trưởng (Ủy viên)
                <br />3. Ông/Bà: <b>Hoàng Minh Tuấn</b> - Chức vụ: Thủ kho bảo quản (Ủy viên)
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px', textAlign: 'left', marginBottom: '16px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9', border: '1px solid #000' }}>
                    <th rowSpan={2} style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>STT</th>
                    <th rowSpan={2} style={{ border: '1px solid #000', padding: '4px' }}>Tên Hàng Hóa</th>
                    <th rowSpan={2} style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>ĐVT</th>
                    <th colSpan={2} style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>Theo Sổ Sách</th>
                    <th colSpan={2} style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>Theo Thực Tế</th>
                    <th colSpan={2} style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>Chênh Lệch</th>
                    <th rowSpan={2} style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>Kiến Nghị Xử Lý</th>
                  </tr>
                  <tr style={{ backgroundColor: '#f8fafc' }}>
                    <th style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>SL</th>
                    <th style={{ border: '1px solid #000', padding: '4px', textAlign: 'right' }}>Thành Tiền</th>
                    <th style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>SL</th>
                    <th style={{ border: '1px solid #000', padding: '4px', textAlign: 'right' }}>Thành Tiền</th>
                    <th style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>Thừa</th>
                    <th style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>Thiếu</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ border: '1px solid #000' }}>
                    <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>1</td>
                    <td style={{ border: '1px solid #000', padding: '4px' }}>Cá hồi Na Uy phi lê đông lạnh</td>
                    <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>Kg</td>
                    <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>45</td>
                    <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'right' }}>15.750.000đ</td>
                    <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>45</td>
                    <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'right' }}>15.750.000đ</td>
                    <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>-</td>
                    <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>-</td>
                    <td style={{ border: '1px solid #000', padding: '4px', fontSize: '10px' }}>Đủ tiêu chuẩn nhiệt độ -18°C</td>
                  </tr>
                  <tr style={{ border: '1px solid #000' }}>
                    <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>2</td>
                    <td style={{ border: '1px solid #000', padding: '4px' }}>Rau xà lách thủy canh Đà Lạt</td>
                    <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>Gói</td>
                    <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>60</td>
                    <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'right' }}>1.500.000đ</td>
                    <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>58</td>
                    <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'right' }}>1.450.000đ</td>
                    <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>-</td>
                    <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center', color: 'red' }}>2</td>
                    <td style={{ border: '1px solid #000', padding: '4px', fontSize: '10px' }}>Hao hụt tự nhiên, ghi nhận Nợ 632</td>
                  </tr>
                </tbody>
              </table>

              {/* Signatures */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', textAlign: 'center', marginTop: '25px', fontSize: '12px' }}>
                <div>
                  <div style={{ fontWeight: 'bold' }}>Trưởng Ban Kiểm Kê</div>
                  <div style={{ height: '50px' }}></div>
                  <div style={{ fontWeight: 'bold' }}>Nguyễn Văn An</div>
                </div>
                <div>
                  <div style={{ fontWeight: 'bold' }}>Kế Toán Viên</div>
                  <div style={{ height: '50px' }}></div>
                  <div style={{ fontWeight: 'bold' }}>Trần Thị Mai</div>
                </div>
                <div>
                  <div style={{ fontWeight: 'bold' }}>Thủ Kho</div>
                  <div style={{ height: '50px' }}></div>
                  <div style={{ fontWeight: 'bold' }}>Hoàng Minh Tuấn</div>
                </div>
              </div>
            </div>
          )}

          {/* VOUCHER TYPE 4: SỔ NHẬP XUẤT TỒN S10-DN */}
          {voucherType === 'SO_NXT_S10_DN' && (
            <div>
              <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 4px 0', textTransform: 'uppercase' }}>
                  SỔ CHI TIẾT VẬT TƯ, DỤNG CỤ, SẢN PHẨM, HÀNG HÓA
                </h2>
                <div style={{ fontStyle: 'italic', fontSize: '12px' }}>
                  (Sổ Báo Cáo Nhập - Xuất - Tồn Kho Tổng Hợp Mẫu S10-DN)
                </div>
                <div style={{ fontSize: '12.5px', marginTop: '2px' }}>
                  Tài khoản theo dõi: <b>1561 - Hàng hóa kho siêu thị</b> • Năm tài chính: <b>2026</b>
                </div>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'left', marginBottom: '16px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9', border: '1px solid #000' }}>
                    <th rowSpan={2} style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>Mã SKU</th>
                    <th rowSpan={2} style={{ border: '1px solid #000', padding: '4px' }}>Tên Sản Phẩm</th>
                    <th rowSpan={2} style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>ĐVT</th>
                    <th colSpan={2} style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>Tồn Đầu Kỳ</th>
                    <th colSpan={2} style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>Nhập Trong Kỳ</th>
                    <th colSpan={2} style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>Xuất Trong Kỳ</th>
                    <th colSpan={2} style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>Tồn Cuối Kỳ</th>
                  </tr>
                  <tr style={{ backgroundColor: '#f8fafc' }}>
                    <th style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>SL</th>
                    <th style={{ border: '1px solid #000', padding: '4px', textAlign: 'right' }}>Tiền (VNĐ)</th>
                    <th style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>SL</th>
                    <th style={{ border: '1px solid #000', padding: '4px', textAlign: 'right' }}>Tiền (VNĐ)</th>
                    <th style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>SL</th>
                    <th style={{ border: '1px solid #000', padding: '4px', textAlign: 'right' }}>Tiền (VNĐ)</th>
                    <th style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>SL</th>
                    <th style={{ border: '1px solid #000', padding: '4px', textAlign: 'right' }}>Tiền (VNĐ)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ border: '1px solid #000' }}>
                    <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>SKU-PORK-01</td>
                    <td style={{ border: '1px solid #000', padding: '4px' }}>Thịt heo xay sạch CP (Khay 500g)</td>
                    <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>Khay</td>
                    <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>120</td>
                    <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'right' }}>6.960.000</td>
                    <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>300</td>
                    <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'right' }}>17.400.000</td>
                    <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>285</td>
                    <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'right' }}>16.530.000</td>
                    <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center', fontWeight: 'bold' }}>135</td>
                    <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'right', fontWeight: 'bold' }}>7.830.000</td>
                  </tr>
                  <tr style={{ border: '1px solid #000' }}>
                    <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>SKU-SALMON-03</td>
                    <td style={{ border: '1px solid #000', padding: '4px' }}>Cá hồi Na Uy phi lê tươi</td>
                    <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>Kg</td>
                    <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>40</td>
                    <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'right' }}>14.000.000</td>
                    <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>150</td>
                    <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'right' }}>52.500.000</td>
                    <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>145</td>
                    <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'right' }}>50.750.000</td>
                    <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center', fontWeight: 'bold' }}>45</td>
                    <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'right', fontWeight: 'bold' }}>15.750.000</td>
                  </tr>
                  <tr style={{ border: '1px solid #000', fontWeight: 'bold', backgroundColor: '#f1f5f9' }}>
                    <td colSpan={3} style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>TỔNG CỘNG TOÀN KHO</td>
                    <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>160</td>
                    <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'right' }}>20.960.000</td>
                    <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>450</td>
                    <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'right' }}>69.900.000</td>
                    <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>430</td>
                    <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'right' }}>67.280.000</td>
                    <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>180</td>
                    <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'right', color: '#1e3a8a' }}>23.580.000</td>
                  </tr>
                </tbody>
              </table>

              {/* Signatures */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', textAlign: 'center', marginTop: '25px', fontSize: '12px' }}>
                <div>
                  <div style={{ fontWeight: 'bold' }}>Người Lập Sổ</div>
                  <div style={{ height: '50px' }}></div>
                  <div style={{ fontWeight: 'bold' }}>Lê Thu Thảo</div>
                </div>
                <div>
                  <div style={{ fontWeight: 'bold' }}>Kế Toán Trưởng</div>
                  <div style={{ height: '50px' }}></div>
                  <div style={{ fontWeight: 'bold' }}>Trần Thị Mai</div>
                </div>
                <div>
                  <div style={{ fontWeight: 'bold' }}>Giám Đốc</div>
                  <div style={{ height: '50px' }}></div>
                  <div style={{ fontWeight: 'bold' }}>Nguyễn Văn An</div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
