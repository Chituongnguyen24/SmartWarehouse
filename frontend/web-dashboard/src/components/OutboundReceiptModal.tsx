import React, { useRef } from 'react';
import { Printer, Download, X, FileText, CheckCircle2, ShieldAlert, Truck, RefreshCw } from 'lucide-react';
import { detectSlipClassification } from './PrintOrderSlipModal';

interface OutboundReceiptModalProps {
  order: any;
  onClose: () => void;
}

// Helper: Convert number to Vietnamese words
function numberToVietnameseWords(num: number): string {
  if (!num || isNaN(num) || num === 0) return 'Không đồng';
  
  const defaultUnits = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ', 'triệu tỷ'];
  const digits = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];

  function readThreeDigits(n: number, showZeroHundred: boolean): string {
    let hundred = Math.floor(n / 100);
    let ten = Math.floor((n % 100) / 10);
    let unit = n % 10;
    let res = '';

    if (hundred > 0 || showZeroHundred) {
      res += digits[hundred] + ' trăm ';
    }
    if (ten > 0) {
      if (ten === 1) res += 'mười ';
      else res += digits[ten] + ' mươi ';
    } else if (hundred > 0 && unit > 0) {
      res += 'lẻ ';
    }
    if (unit > 0) {
      if (unit === 1 && ten > 1) res += 'mốt';
      else if (unit === 5 && ten > 0) res += 'lăm';
      else res += digits[unit];
    }
    return res.trim();
  }

  let str = '';
  let n = Math.abs(Math.round(num));
  let unitIndex = 0;

  while (n > 0) {
    let group = n % 1000;
    if (group > 0) {
      let groupStr = readThreeDigits(group, n >= 1000);
      str = groupStr + ' ' + defaultUnits[unitIndex] + ' ' + str;
    }
    n = Math.floor(n / 1000);
    unitIndex++;
  }

  str = str.trim();
  if (!str) return 'Không đồng';
  return str.charAt(0).toUpperCase() + str.slice(1) + ' đồng';
}

export const OutboundReceiptModal: React.FC<OutboundReceiptModalProps> = ({ order, onClose }) => {
  const printRef = useRef<HTMLDivElement>(null);

  if (!order) return null;

  const classification = detectSlipClassification(order);

  const orderDate = order.createdAt ? new Date(order.createdAt) : new Date();
  const day = String(orderDate.getDate()).padStart(2, '0');
  const month = String(orderDate.getMonth() + 1).padStart(2, '0');
  const year = orderDate.getFullYear();

  const items = order.items || [];
  const defaultUnitPrice = classification === 'DISPOSAL' ? 0 : 27500;

  const totalAmount = items.reduce((sum: number, it: any) => {
    const qty = it.pickedQuantity > 0 ? it.pickedQuantity : (it.requestedQuantity || it.quantity || 1);
    const price = classification === 'DISPOSAL' ? 0 : (it.unitPrice ?? it.price ?? defaultUnitPrice);
    return sum + (qty * price);
  }, 0);

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    if (!printRef.current) return;
    const printContents = printRef.current.innerHTML;
    const fullHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Phieu_Xuat_Kho_${order.orderCode}</title>
          <style>
            body { font-family: "Times New Roman", Times, serif; color: #000; background: #fff; padding: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th, td { border: 1px solid #000; padding: 6px 8px; font-size: 13px; }
            th { text-align: center; font-weight: bold; background: #fafafa; }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .bold { font-weight: bold; }
            .italic { font-style: italic; }
          </style>
        </head>
        <body>
          ${printContents}
        </body>
      </html>
    `;
    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Phieu_Xuat_Kho_${order.orderCode}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Receipt Classification Config
  const receiptConfig = {
    SALE: {
      typeTitle: 'PHIẾU XUẤT KHO BÁN HÀNG',
      badge: 'Xuất Bán Hàng Thương Mại',
      badgeBg: '#e0f2fe',
      badgeColor: '#0369a1',
      debitTk: '632 (Giá vốn hàng bán)',
      creditTk: '1561 (Hàng hóa kho)',
      receiverName: order.customerName || order.requesterName || 'Khách hàng C.T Mart',
      receiverDept: order.destination || order.customerAddress || '18 Quang Trung, Phường 10, Quận Gò Vấp, TP.HCM',
      reason: `Xuất bán hàng thương mại điện tử / Bán lẻ cho khách hàng (Mã đơn: ${order.orderCode})`,
      docAttached: `01 Đơn đặt hàng E-Commerce #${order.orderCode}`,
      sig1: { role: 'Người lập phiếu', name: order.requestedBy || 'Lê Chung' },
      sig2: { role: 'Người nhận hàng', name: order.customerName || order.requesterName || 'Lê Chung' },
      sig3: { role: 'Thủ kho xuất', name: 'Nguyễn Hoàng Nam' },
      sig4: { role: 'Kế toán trưởng', name: 'Trần Thu Thảo' },
      sig5: { role: 'Giám đốc / QL Kho', name: 'Lê Công Chung' },
    },
    DISPOSAL: {
      typeTitle: 'PHIẾU XUẤT KHO TIÊU HỦY THỰC PHẨM & CHẤT THẢI',
      badge: 'Xuất Tiêu Hủy Môi Trường (Đa Phước)',
      badgeBg: '#faf5ff',
      badgeColor: '#7c3aed',
      debitTk: '811 / 632 (Chi phí hủy hàng)',
      creditTk: '1561 (Hàng hóa kho)',
      receiverName: 'Đại diện Ban Quản Lý Khu Liên Hợp Xử Lý Môi Trường Đa Phước',
      receiverDept: 'Khu Liên Hợp Xử Lý Chất Thải Đa Phước, Xã Đa Phước, Huyện Bình Chánh, TP.HCM',
      reason: `Xuất tiêu hủy thực phẩm hết hạn sử dụng / hư hỏng theo Biên bản giám định QC (Mã lệnh: ${order.orderCode})`,
      docAttached: `01 Biên bản kiểm định chất lượng ATVSTP & Quyết định tiêu hủy số QC-${order.orderCode?.slice(-4) || '2026'}`,
      sig1: { role: 'Người lập phiếu', name: 'Cán bộ Kho Tiếp Nhận' },
      sig2: { role: 'Giám định viên QC', name: 'Trưởng Ban Kiểm Soát CL' },
      sig3: { role: 'Thủ kho xuất', name: 'Nguyễn Hoàng Nam' },
      sig4: { role: 'Kế toán trưởng', name: 'Trần Thu Thảo' },
      sig5: { role: 'Đại diện Trạm Đa Phước', name: 'Khu Xử Lý Rác Đa Phước' },
    },
    RETURN: {
      typeTitle: 'PHIẾU XUẤT TRẢ HÀNG NHÀ CUNG CẤP / HÀNG HOÀN',
      badge: 'Xuất Trả Hàng Nhà Cung Cấp',
      badgeBg: '#fef2f2',
      badgeColor: '#b91c1c',
      debitTk: '331 (Phải trả người bán)',
      creditTk: '1561 (Hàng hóa kho)',
      receiverName: order.customerName || order.requesterName || 'Đại diện Nhà Cung Cấp Thực Phẩm Sạch Sài Gòn',
      receiverDept: order.destination || 'Tổng Kho Nhà Cung Cấp - KCN Tân Bình, TP.HCM',
      reason: `Xuất trả hàng lỗi kỹ thuật / không đạt tiêu chuẩn bao bì / hàng hoàn giao không thành công (Lệnh: ${order.orderCode})`,
      docAttached: `01 Biên bản đối soát hàng hoàn / trả NCC số RT-${order.orderCode?.slice(-4) || '01'}`,
      sig1: { role: 'Người lập phiếu', name: 'Nhân viên Tiếp Nhận Hoàn' },
      sig2: { role: 'Đại diện NCC / Nhận hàng', name: 'Đại diện Đối tác NCC' },
      sig3: { role: 'Thủ kho xuất', name: 'Nguyễn Hoàng Nam' },
      sig4: { role: 'Kế toán trưởng', name: 'Trần Thu Thảo' },
      sig5: { role: 'Giám đốc / QL Kho', name: 'Lê Công Chung' },
    },
    TRANSFER: {
      typeTitle: 'PHIẾU XUẤT KHO ĐIỀU CHUYỂN NỘI BỘ LIÊN HUB',
      badge: 'Điều Chuyển Liên Chi Nhánh',
      badgeBg: '#f0fdf4',
      badgeColor: '#15803d',
      debitTk: '1561 (Kho Tiếp Nhận Đích)',
      creditTk: '1561 (Kho Xuất Gò Vấp)',
      receiverName: order.customerName || order.destination || 'Thủ kho Chi Nhánh Tiếp Nhận (Kho Bình Thạnh WH-002)',
      receiverDept: order.destination || 'Kho Chi Nhánh C.T Mart - TP.HCM',
      reason: `Xuất điều chuyển cân đối tồn kho chuỗi siêu thị giữa các Hub phân phối (Lệnh: ${order.orderCode})`,
      docAttached: `01 Lệnh điều động luân chuyển nội bộ số TF-${order.orderCode?.slice(-4) || '88'}`,
      sig1: { role: 'Người lập lệnh', name: 'Điều phối viên Hub' },
      sig2: { role: 'Lái xe vận chuyển', name: order.assignedDriverName || 'Tài xế Xe Tải Liên Hub' },
      sig3: { role: 'Thủ kho xuất (Gò Vấp)', name: 'Nguyễn Hoàng Nam' },
      sig4: { role: 'Kế toán trưởng', name: 'Trần Thu Thảo' },
      sig5: { role: 'Thủ kho đích tiếp nhận', name: 'Thủ kho Chi Nhánh Đích' },
    }
  }[classification];

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '20px'
    }}>
      {/* Modal Container */}
      <div style={{
        background: '#f8fafc',
        borderRadius: '16px',
        maxWidth: '920px',
        width: '100%',
        maxHeight: '94vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        border: '1px solid #e2e8f0',
        overflow: 'hidden'
      }}>
        {/* Modal Action Bar (Hidden in Print) */}
        <div className="no-print" style={{
          padding: '16px 24px',
          background: '#fff',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileText size={20} color="#0f766e" />
            <div>
              <span style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0f172a' }}>
                Phiếu Xuất Kho Kế Toán Chuẩn (Mẫu số 02 - VT)
              </span>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '2px' }}>
                <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', background: receiptConfig.badgeBg, color: receiptConfig.badgeColor, fontWeight: 700 }}>
                  {receiptConfig.badge}
                </span>
                <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', background: '#e0f2fe', color: '#0369a1', fontWeight: 700 }}>
                  TT 99/2025/TT-BTC
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={handlePrint}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '8px 16px', borderRadius: '8px',
                background: '#0f766e', color: '#fff',
                border: 'none', fontWeight: 700, fontSize: '0.85rem',
                cursor: 'pointer', boxShadow: '0 2px 4px rgba(15,118,110,0.2)'
              }}
            >
              <Printer size={16} /> In Phiếu (A4)
            </button>

            <button
              onClick={handleDownload}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '8px 16px', borderRadius: '8px',
                background: '#3b82f6', color: '#fff',
                border: 'none', fontWeight: 700, fontSize: '0.85rem',
                cursor: 'pointer', boxShadow: '0 2px 4px rgba(59,130,246,0.2)'
              }}
            >
              <Download size={16} /> Tải file Phiếu
            </button>

            <button
              onClick={onClose}
              style={{
                padding: '8px', borderRadius: '8px',
                background: '#f1f5f9', color: '#64748b',
                border: '1px solid #cbd5e1', cursor: 'pointer'
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Printable Paper Canvas */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', background: '#64748b20' }}>
          <div 
            ref={printRef}
            id="receipt-paper"
            style={{
              background: '#fff',
              maxWidth: '820px',
              margin: '0 auto',
              padding: '36px 44px',
              color: '#000',
              fontFamily: '"Times New Roman", Times, serif',
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              lineHeight: 1.45,
              fontSize: '13.5px'
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
              <div>
                <p style={{ margin: 0, fontWeight: 'bold', fontSize: '14px' }}>Đơn vị: C.T Mart - C.T Group</p>
                <p style={{ margin: '2px 0 0 0', fontWeight: 'bold', fontSize: '13px' }}>
                  Bộ phận: {order.warehouseCode === 'WH-006' ? 'Kho Hàng Gò Vấp (WH-006)' : order.warehouseCode ? `Kho Hàng (${order.warehouseCode})` : 'Kho Trung Tâm'}
                </p>
              </div>

              <div style={{ textAlign: 'center', maxWidth: '320px' }}>
                <p style={{ margin: 0, fontWeight: 'bold', fontSize: '13px' }}>Mẫu số 02 - VT</p>
                <p style={{ margin: '2px 0 0 0', fontStyle: 'italic', fontSize: '11.5px', color: '#222' }}>
                  (Kèm theo Thông tư số 99/2025/TT-BTC ngày 27 tháng 10 năm 2025 của Bộ trưởng Bộ Tài chính)
                </p>
              </div>
            </div>

            {/* Title */}
            <div style={{ textAlign: 'center', margin: '20px 0 16px 0' }}>
              <h1 style={{ margin: 0, fontSize: '19px', fontWeight: 'bold', letterSpacing: '0.5px' }}>
                {receiptConfig.typeTitle}
              </h1>
              <p style={{ margin: '4px 0 0 0', fontStyle: 'italic', fontSize: '13px' }}>
                Ngày {day} tháng {month} năm {year}
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '30px', marginTop: '6px', fontSize: '12.5px' }}>
                <span>Số: <b>{order.orderCode}</b></span>
                <span>Nợ: <b>{receiptConfig.debitTk}</b></span>
                <span>Có: <b>{receiptConfig.creditTk}</b></span>
              </div>
            </div>

            {/* Main Info */}
            <div style={{ marginBottom: '16px', fontSize: '13.5px' }}>
              <p style={{ margin: '4px 0' }}>
                - Họ và tên người nhận hàng / Đơn vị tiếp nhận: <b>{receiptConfig.receiverName}</b>
              </p>
              <p style={{ margin: '4px 0' }}>
                - Địa chỉ (bộ phận): <span>{receiptConfig.receiverDept}</span>
              </p>
              <p style={{ margin: '4px 0' }}>
                - Lý do xuất kho: <span>{receiptConfig.reason}</span>
              </p>
              <p style={{ margin: '4px 0' }}>
                - Xuất tại kho (ngăn lô): <b>{order.warehouseCode || 'WH-006'}{items[0]?.slotId ? ` - Kệ: ${items[0]?.slotId}` : ''}{items[0]?.lotCode ? ` (Lô: ${items[0]?.lotCode})` : ''}</b> &nbsp;&nbsp;&nbsp;&nbsp; 
                Địa điểm: <span>{order.warehouseCode === 'WH-006' ? '350 Quang Trung, Gò Vấp, TP. Hồ Chí Minh' : 'Hồ Chí Minh'}</span>
              </p>
            </div>

            {/* Product Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '14px' }}>
              <thead>
                <tr>
                  <th rowSpan={2} style={{ border: '1px solid #000', padding: '6px 4px', width: '36px', textAlign: 'center' }}>STT</th>
                  <th rowSpan={2} style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'center' }}>
                    Tên, nhãn hiệu, quy cách, phẩm chất vật tư, dụng cụ, sản phẩm, hàng hoá
                  </th>
                  <th rowSpan={2} style={{ border: '1px solid #000', padding: '6px 6px', width: '85px', textAlign: 'center' }}>Mã số</th>
                  <th rowSpan={2} style={{ border: '1px solid #000', padding: '6px 6px', width: '55px', textAlign: 'center' }}>Đơn vị</th>
                  <th colSpan={2} style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>Số lượng</th>
                  <th rowSpan={2} style={{ border: '1px solid #000', padding: '6px 8px', width: '85px', textAlign: 'center' }}>Đơn giá</th>
                  <th rowSpan={2} style={{ border: '1px solid #000', padding: '6px 8px', width: '100px', textAlign: 'center' }}>Thành tiền</th>
                </tr>
                <tr>
                  <th style={{ border: '1px solid #000', padding: '4px', width: '50px', textAlign: 'center', fontSize: '12px' }}>Yêu cầu</th>
                  <th style={{ border: '1px solid #000', padding: '4px', width: '50px', textAlign: 'center', fontSize: '12px' }}>Thực xuất</th>
                </tr>
                <tr style={{ background: '#f8fafc', fontStyle: 'italic', fontSize: '11px', textAlign: 'center' }}>
                  <th style={{ border: '1px solid #000', padding: '2px' }}>A</th>
                  <th style={{ border: '1px solid #000', padding: '2px' }}>B</th>
                  <th style={{ border: '1px solid #000', padding: '2px' }}>C</th>
                  <th style={{ border: '1px solid #000', padding: '2px' }}>D</th>
                  <th style={{ border: '1px solid #000', padding: '2px' }}>1</th>
                  <th style={{ border: '1px solid #000', padding: '2px' }}>2</th>
                  <th style={{ border: '1px solid #000', padding: '2px' }}>3</th>
                  <th style={{ border: '1px solid #000', padding: '2px' }}>4</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it: any, idx: number) => {
                  const reqQty = it.requestedQuantity || it.quantity || 1;
                  const actQty = it.pickedQuantity > 0 ? it.pickedQuantity : reqQty;
                  const price = classification === 'DISPOSAL' ? 0 : (it.unitPrice ?? it.price ?? defaultUnitPrice);
                  const itemTotal = actQty * price;

                  return (
                    <tr key={idx}>
                      <td style={{ border: '1px solid #000', padding: '6px 4px', textAlign: 'center' }}>{idx + 1}</td>
                      <td style={{ border: '1px solid #000', padding: '6px 8px' }}>
                        <b>{it.productName || 'Sản phẩm'}</b>
                        {it.lotCode && (
                          <div style={{ fontSize: '11.5px', color: '#444', fontStyle: 'italic' }}>
                            Lô: {it.lotCode} {it.slotId ? `- Vị trí: ${it.slotId}` : ''}
                          </div>
                        )}
                        {classification === 'DISPOSAL' && (
                          <div style={{ fontSize: '11px', color: '#b91c1c', fontStyle: 'italic' }}>
                            (Hàng phế phẩm / quá hạn sử dụng hủy theo biên bản QC)
                          </div>
                        )}
                      </td>
                      <td style={{ border: '1px solid #000', padding: '6px 6px', textAlign: 'center', fontSize: '12px' }}>{it.sku || 'SKU-01'}</td>
                      <td style={{ border: '1px solid #000', padding: '6px 6px', textAlign: 'center' }}>{it.unit || 'Kg / Kiện'}</td>
                      <td style={{ border: '1px solid #000', padding: '6px 4px', textAlign: 'center' }}>{reqQty}</td>
                      <td style={{ border: '1px solid #000', padding: '6px 4px', textAlign: 'center', fontWeight: 'bold' }}>{actQty}</td>
                      <td style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'right' }}>
                        {classification === 'DISPOSAL' ? '0' : Number(price).toLocaleString('vi-VN')}
                      </td>
                      <td style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'right', fontWeight: 'bold' }}>
                        {classification === 'DISPOSAL' ? '0' : Number(itemTotal).toLocaleString('vi-VN')}
                      </td>
                    </tr>
                  );
                })}

                {/* Empty rows if items < 2 */}
                {Array.from({ length: Math.max(0, 2 - items.length) }).map((_, i) => (
                  <tr key={`empty-${i}`}>
                    <td style={{ border: '1px solid #000', padding: '8px 4px', textAlign: 'center' }}>{items.length + i + 1}</td>
                    <td style={{ border: '1px solid #000', padding: '8px' }}></td>
                    <td style={{ border: '1px solid #000', padding: '8px' }}></td>
                    <td style={{ border: '1px solid #000', padding: '8px' }}></td>
                    <td style={{ border: '1px solid #000', padding: '8px' }}></td>
                    <td style={{ border: '1px solid #000', padding: '8px' }}></td>
                    <td style={{ border: '1px solid #000', padding: '8px' }}></td>
                    <td style={{ border: '1px solid #000', padding: '8px' }}></td>
                  </tr>
                ))}

                {/* Total Row */}
                <tr>
                  <td colSpan={4} style={{ border: '1px solid #000', padding: '7px 10px', fontWeight: 'bold', textAlign: 'center' }}>Cộng</td>
                  <td style={{ border: '1px solid #000', padding: '7px 4px', textAlign: 'center', fontWeight: 'bold' }}>x</td>
                  <td style={{ border: '1px solid #000', padding: '7px 4px', textAlign: 'center', fontWeight: 'bold' }}>
                    {items.reduce((s: number, i: any) => s + (i.pickedQuantity > 0 ? i.pickedQuantity : (i.requestedQuantity || i.quantity || 1)), 0)}
                  </td>
                  <td style={{ border: '1px solid #000', padding: '7px 4px', textAlign: 'center', fontWeight: 'bold' }}>x</td>
                  <td style={{ border: '1px solid #000', padding: '7px 8px', textAlign: 'right', fontWeight: 'bold', color: '#b91c1c' }}>
                    {classification === 'DISPOSAL' ? '0 ₫' : `${Number(totalAmount).toLocaleString('vi-VN')} ₫`}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Total In Words & Vouchers */}
            <div style={{ marginBottom: '20px', fontSize: '13.5px' }}>
              <p style={{ margin: '4px 0' }}>
                - Tổng số tiền (viết bằng chữ): <b style={{ fontStyle: 'italic' }}>{classification === 'DISPOSAL' ? 'Không đồng (Xuất hủy theo biên bản môi trường)' : numberToVietnameseWords(totalAmount)}</b>
              </p>
              <p style={{ margin: '4px 0' }}>
                - Số chứng từ gốc kèm theo: <span>{receiptConfig.docAttached}</span>
              </p>
            </div>

            {/* Signatures */}
            <div style={{ textAlign: 'right', fontStyle: 'italic', marginBottom: '10px', fontSize: '13px' }}>
              Ngày {day} tháng {month} năm {year}
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 1fr)',
              textAlign: 'center',
              fontSize: '12.5px',
              gap: '6px'
            }}>
              <div>
                <p style={{ margin: 0, fontWeight: 'bold' }}>{receiptConfig.sig1.role}</p>
                <p style={{ margin: '2px 0 0 0', fontStyle: 'italic', fontSize: '11px' }}>(Ký, họ tên)</p>
                <div style={{ height: '52px' }}></div>
                <p style={{ margin: 0, fontWeight: 'bold' }}>{receiptConfig.sig1.name}</p>
              </div>

              <div>
                <p style={{ margin: 0, fontWeight: 'bold' }}>{receiptConfig.sig2.role}</p>
                <p style={{ margin: '2px 0 0 0', fontStyle: 'italic', fontSize: '11px' }}>(Ký, họ tên)</p>
                <div style={{ height: '52px' }}></div>
                <p style={{ margin: 0, fontWeight: 'bold' }}>{receiptConfig.sig2.name}</p>
              </div>

              <div>
                <p style={{ margin: 0, fontWeight: 'bold' }}>{receiptConfig.sig3.role}</p>
                <p style={{ margin: '2px 0 0 0', fontStyle: 'italic', fontSize: '11px' }}>(Ký, họ tên)</p>
                <div style={{ height: '52px' }}></div>
                <p style={{ margin: 0, fontWeight: 'bold' }}>{receiptConfig.sig3.name}</p>
              </div>

              <div>
                <p style={{ margin: 0, fontWeight: 'bold' }}>{receiptConfig.sig4.role}</p>
                <p style={{ margin: '2px 0 0 0', fontStyle: 'italic', fontSize: '11px' }}>(Ký, họ tên)</p>
                <div style={{ height: '52px' }}></div>
                <p style={{ margin: 0, fontWeight: 'bold' }}>{receiptConfig.sig4.name}</p>
              </div>

              <div>
                <p style={{ margin: 0, fontWeight: 'bold' }}>{receiptConfig.sig5.role}</p>
                <p style={{ margin: '2px 0 0 0', fontStyle: 'italic', fontSize: '11px' }}>(Ký, họ tên)</p>
                <div style={{ height: '52px' }}></div>
                <p style={{ margin: 0, fontWeight: 'bold' }}>{receiptConfig.sig5.name}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Global CSS for Print Media */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .no-print {
            display: none !important;
          }
          #receipt-paper, #receipt-paper * {
            visibility: visible;
          }
          #receipt-paper {
            position: fixed;
            left: 0;
            top: 0;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 20mm !important;
            box-shadow: none !important;
          }
        }
      `}</style>
    </div>
  );
};
