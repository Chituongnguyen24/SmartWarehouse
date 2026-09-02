import React, { useRef } from 'react';
import { Printer, Download, X, Building, CheckCircle2, FileText } from 'lucide-react';

interface InboundReceiptModalProps {
  order: any;
  onClose: () => void;
}

// Convert numbers into Vietnamese currency words
function numberToVietnameseWords(n: number): string {
  if (!n || isNaN(n) || n === 0) return 'Không đồng';

  const defaultUnits = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ', 'triệu tỷ'];
  const numberNames = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];

  function readThreeDigits(num: number, isHead: boolean): string {
    let result = '';
    const hundred = Math.floor(num / 100);
    const remainder = num % 100;
    const ten = Math.floor(remainder / 10);
    const unit = remainder % 10;

    if (hundred > 0 || !isHead) {
      result += numberNames[hundred] + ' trăm ';
    }

    if (ten > 1) {
      result += numberNames[ten] + ' mươi ';
      if (unit === 1) result += 'mốt ';
      else if (unit === 5) result += 'lăm ';
      else if (unit > 0) result += numberNames[unit] + ' ';
    } else if (ten === 1) {
      result += 'mười ';
      if (unit === 5) result += 'lăm ';
      else if (unit > 0) result += numberNames[unit] + ' ';
    } else if (ten === 0 && unit > 0) {
      if (hundred > 0 || !isHead) result += 'lẻ ';
      result += numberNames[unit] + ' ';
    }

    return result;
  }

  let strNumber = Math.floor(Math.abs(n)).toString();
  let groups: number[] = [];
  while (strNumber.length > 0) {
    groups.unshift(parseInt(strNumber.slice(-3), 10));
    strNumber = strNumber.slice(0, -3);
  }

  let words = '';
  for (let i = 0; i < groups.length; i++) {
    const groupVal = groups[i];
    if (groupVal > 0) {
      const isHead = i === 0;
      const groupText = readThreeDigits(groupVal, isHead);
      const unitIndex = groups.length - 1 - i;
      words += groupText + defaultUnits[unitIndex] + ' ';
    }
  }

  words = words.trim();
  words = words.charAt(0).toUpperCase() + words.slice(1) + ' đồng chẵn./.';
  return words;
}

export const InboundReceiptModal: React.FC<InboundReceiptModalProps> = ({ order, onClose }) => {
  const receiptRef = useRef<HTMLDivElement>(null);

  if (!order) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadFile = () => {
    if (!receiptRef.current) return;
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Phiếu Nhập Kho - ${order.orderCode || order.id}</title>
  <style>
    body { font-family: "Times New Roman", Times, serif; padding: 25px; color: #000; }
    table { width: 100%; border-collapse: collapse; margin-top: 15px; }
    th, td { border: 1px solid #000; padding: 6px 8px; text-align: left; font-size: 13px; }
    th { text-align: center; background-color: #f2f2f2; font-weight: bold; }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .bold { font-weight: bold; }
    .signatures { display: flex; justify-content: space-between; margin-top: 30px; text-align: center; }
    .signature-block { width: 18%; }
  </style>
</head>
<body>
  ${receiptRef.current.innerHTML}
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Phieu_Nhap_Kho_${order.orderCode || '01-VT'}.html`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const today = new Date(order.createdAt || Date.now());
  const day = String(today.getDate()).padStart(2, '0');
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const year = today.getFullYear();

  const isGoVap = !order.warehouseCode || order.warehouseCode === 'WH-006' || (order.warehouseName && order.warehouseName.includes('Gò Vấp'));
  const warehouseTitle = isGoVap 
    ? 'Kho Tổng Gò Vấp (WH-006) - 350 Quang Trung, P.10, Gò Vấp, TP.HCM'
    : (order.warehouseName || 'Kho Phân Phối Hàng Hóa - TP.HCM');

  const supplier = order.supplierName || 'CÔNG TY TNHH THỰC PHẨM & NÔNG SẢN VIỆT';
  const invoiceNum = order.invoiceNumber || 'HĐ-8921/2026';

  const items = order.items || [
    { sku: 'MILK-DALAT-1L', productName: 'Sữa tươi Đà Lạt True Milk 1L', expectedQuantity: 100, receivedQuantity: 100, unit: 'Hộp', unitPrice: 38000 },
    { sku: 'BEV-KNOR-500ML', productName: 'Nước mắm Knorr chai 500ml', expectedQuantity: 50, receivedQuantity: 50, unit: 'Chai', unitPrice: 27500 }
  ];

  const totalQuantityExpected = items.reduce((sum: number, it: any) => sum + (Number(it.expectedQuantity) || Number(it.requestedQuantity) || 1), 0);
  const totalQuantityReceived = items.reduce((sum: number, it: any) => sum + (Number(it.receivedQuantity) || Number(it.pickedQuantity) || Number(it.expectedQuantity) || 1), 0);
  
  const totalPrice = items.reduce((sum: number, it: any) => {
    const qty = Number(it.receivedQuantity) || Number(it.expectedQuantity) || 1;
    const price = Number(it.unitPrice) || (it.sku?.includes('TULIP') ? 115200 : it.sku?.includes('KNOR') ? 27500 : it.sku?.includes('MILK') ? 38000 : 45000);
    return sum + (qty * price);
  }, 0);

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 3000,
      padding: '16px'
    }}>
      <div style={{
        background: '#fff',
        borderRadius: '16px',
        maxWidth: '900px',
        width: '100%',
        maxHeight: '94vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        overflow: 'hidden'
      }}>
        
        {/* Top Control Bar */}
        <div style={{
          padding: '14px 24px',
          background: '#0f766e',
          color: '#fff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={20} />
            <span style={{ fontWeight: 800, fontSize: '1rem' }}>
              PHIẾU NHẬP KHO (MẪU SỐ 01 - VT - THÔNG TƯ 200/2014/TT-BTC)
            </span>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={handlePrint}
              style={{
                padding: '7px 14px', borderRadius: '8px', border: 'none',
                background: '#fff', color: '#0f766e', fontWeight: 800,
                fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
            >
              <Printer size={16} /> In Phiếu (A4)
            </button>

            <button
              onClick={handleDownloadFile}
              style={{
                padding: '7px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.4)',
                background: 'transparent', color: '#fff', fontWeight: 700,
                fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
              }}
            >
              <Download size={16} /> Tải file HTML/PDF
            </button>

            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '4px' }}
            >
              <X size={22} />
            </button>
          </div>
        </div>

        {/* Printable Paper Area (A4 Standard) */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '30px 40px', background: '#f8fafc' }}>
          <div
            ref={receiptRef}
            id="printable-receipt"
            style={{
              background: '#fff',
              padding: '30px 35px',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
              fontFamily: '"Times New Roman", Times, serif',
              color: '#000',
              lineHeight: 1.45,
              fontSize: '14px'
            }}
          >
            {/* Header: Company & Circular Template Code */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
              <div style={{ width: '58%' }}>
                <p style={{ margin: 0, fontWeight: 'bold', fontSize: '13px', textTransform: 'uppercase' }}>
                  CÔNG TY CỔ PHẦN ĐẦU TƯ VÀ CÔNG NGHỆ SMART LOGISTICS
                </p>
                <p style={{ margin: '3px 0 0 0', fontSize: '12px' }}>
                  Địa chỉ: Tòa nhà Innovation, Công viên Phần mềm Quang Trung, Q.12, TP.HCM
                </p>
                <p style={{ margin: '2px 0 0 0', fontSize: '12px' }}>
                  Mã số thuế: 0317894562 - Bộ phận: Quản trị Cung ứng & Kho vận
                </p>
              </div>

              <div style={{ width: '40%', textAlign: 'center' }}>
                <p style={{ margin: 0, fontWeight: 'bold', fontSize: '13px' }}>
                  Mẫu số: 01 - VT
                </p>
                <p style={{ margin: '2px 0 0 0', fontSize: '11.5px', fontStyle: 'italic' }}>
                  (Ban hành theo Thông tư số 200/2014/TT-BTC<br />ngày 22/12/2014 của Bộ Tài chính)
                </p>
              </div>
            </div>

            {/* Document Title */}
            <div style={{ textAlign: 'center', margin: '20px 0 16px 0' }}>
              <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 'bold', letterSpacing: '1px' }}>
                PHIẾU NHẬP KHO
              </h2>
              <p style={{ margin: '4px 0 0 0', fontStyle: 'italic', fontSize: '13.5px' }}>
                Ngày {day} tháng {month} năm {year}
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '380px', margin: '6px auto 0' }}>
                <span>Số: <b>{order.orderCode || order.id?.slice(0, 10).toUpperCase()}</b></span>
                <span>Nợ: <b>1561</b></span>
                <span>Có: <b>331</b></span>
              </div>
            </div>

            {/* Inbound Metadata Fields */}
            <div style={{ marginBottom: '16px', fontSize: '13.5px' }}>
              <p style={{ margin: '4px 0' }}>
                - Họ và tên người giao: <b>{order.delivererName || order.requestedBy || 'Nguyễn Văn Giao (Đại diện NCC)'}</b> - Đơn vị: <b>{supplier}</b>
              </p>
              <p style={{ margin: '4px 0' }}>
                - Theo hóa đơn số: <b>{invoiceNum}</b> ngày {day}/{month}/{year} của <b>{supplier}</b>
              </p>
              <p style={{ margin: '4px 0' }}>
                - Nhập tại kho: <b>{warehouseTitle}</b>
              </p>
              <p style={{ margin: '4px 0' }}>
                - Lý do nhập kho: <b>{order.notes || 'Nhập mua hàng hóa lưu kho phục vụ bán lẻ & E-Commerce'}</b>
              </p>
            </div>

            {/* Items Table (Standard BTC 01-VT) */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '12px' }}>
              <thead>
                <tr style={{ textAlign: 'center', backgroundColor: '#f5f5f5' }}>
                  <th rowSpan={2} style={{ border: '1px solid #000', padding: '6px 4px', width: '35px' }}>STT</th>
                  <th rowSpan={2} style={{ border: '1px solid #000', padding: '6px 6px', width: '240px' }}>
                    Tên, nhãn hiệu, quy cách, phẩm chất vật tư, sản phẩm, hàng hóa
                  </th>
                  <th rowSpan={2} style={{ border: '1px solid #000', padding: '6px 4px', width: '110px' }}>Mã số (SKU)</th>
                  <th rowSpan={2} style={{ border: '1px solid #000', padding: '6px 4px', width: '55px' }}>ĐVT</th>
                  <th colSpan={2} style={{ border: '1px solid #000', padding: '4px 4px' }}>Số lượng</th>
                  <th rowSpan={2} style={{ border: '1px solid #000', padding: '6px 4px', width: '90px' }}>Đơn giá (₫)</th>
                  <th rowSpan={2} style={{ border: '1px solid #000', padding: '6px 4px', width: '110px' }}>Thành tiền (₫)</th>
                </tr>
                <tr style={{ textAlign: 'center', backgroundColor: '#f5f5f5' }}>
                  <th style={{ border: '1px solid #000', padding: '4px 4px', width: '65px' }}>Theo CT</th>
                  <th style={{ border: '1px solid #000', padding: '4px 4px', width: '65px' }}>Thực nhập</th>
                </tr>
                <tr style={{ textAlign: 'center', fontSize: '11px', backgroundColor: '#fafafa', fontStyle: 'italic' }}>
                  <td style={{ border: '1px solid #000' }}>A</td>
                  <td style={{ border: '1px solid #000' }}>B</td>
                  <td style={{ border: '1px solid #000' }}>C</td>
                  <td style={{ border: '1px solid #000' }}>D</td>
                  <td style={{ border: '1px solid #000' }}>1</td>
                  <td style={{ border: '1px solid #000' }}>2</td>
                  <td style={{ border: '1px solid #000' }}>3</td>
                  <td style={{ border: '1px solid #000' }}>4 = 2 x 3</td>
                </tr>
              </thead>
              <tbody>
                {items.map((item: any, idx: number) => {
                  const qtyExpected = Number(item.expectedQuantity) || Number(item.requestedQuantity) || 1;
                  const qtyReceived = Number(item.receivedQuantity) || Number(item.pickedQuantity) || qtyExpected;
                  const price = Number(item.unitPrice) || (item.sku?.includes('TULIP') ? 115200 : item.sku?.includes('KNOR') ? 27500 : item.sku?.includes('MILK') ? 38000 : 45000);
                  const lineTotal = qtyReceived * price;

                  return (
                    <tr key={idx}>
                      <td style={{ border: '1px solid #000', padding: '6px 4px', textAlign: 'center' }}>{idx + 1}</td>
                      <td style={{ border: '1px solid #000', padding: '6px 8px', fontWeight: 'bold' }}>
                        {item.productName || item.name || 'Sản phẩm ' + item.sku}
                        {item.lotCode && (
                          <div style={{ fontSize: '11px', fontWeight: 'normal', color: '#0f766e' }}>
                            Lô: {item.lotCode} {item.assignedSlotId ? `(Vị trí: ${item.assignedSlotId})` : ''}
                          </div>
                        )}
                      </td>
                      <td style={{ border: '1px solid #000', padding: '6px 4px', textAlign: 'center', fontFamily: 'monospace' }}>
                        {item.sku || 'SKU-01'}
                      </td>
                      <td style={{ border: '1px solid #000', padding: '6px 4px', textAlign: 'center' }}>
                        {item.unit || 'Cái'}
                      </td>
                      <td style={{ border: '1px solid #000', padding: '6px 4px', textAlign: 'center' }}>
                        {qtyExpected}
                      </td>
                      <td style={{ border: '1px solid #000', padding: '6px 4px', textAlign: 'center', fontWeight: 'bold' }}>
                        {qtyReceived}
                      </td>
                      <td style={{ border: '1px solid #000', padding: '6px 6px', textAlign: 'right' }}>
                        {price.toLocaleString('vi-VN')}
                      </td>
                      <td style={{ border: '1px solid #000', padding: '6px 6px', textAlign: 'right', fontWeight: 'bold' }}>
                        {lineTotal.toLocaleString('vi-VN')}
                      </td>
                    </tr>
                  );
                })}

                {/* Total Row */}
                <tr style={{ fontWeight: 'bold', backgroundColor: '#fcfcfc' }}>
                  <td colSpan={4} style={{ border: '1px solid #000', padding: '8px 10px', textAlign: 'center' }}>
                    CỘNG TỔNG CỘNG
                  </td>
                  <td style={{ border: '1px solid #000', padding: '8px 4px', textAlign: 'center' }}>
                    {totalQuantityExpected}
                  </td>
                  <td style={{ border: '1px solid #000', padding: '8px 4px', textAlign: 'center', color: '#0f766e' }}>
                    {totalQuantityReceived}
                  </td>
                  <td style={{ border: '1px solid #000', padding: '8px 4px', textAlign: 'center' }}>x</td>
                  <td style={{ border: '1px solid #000', padding: '8px 6px', textAlign: 'right', color: '#ea580c', fontSize: '14.5px' }}>
                    {totalPrice.toLocaleString('vi-VN')} ₫
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Money in Words */}
            <div style={{ marginTop: '14px', fontSize: '13.5px' }}>
              <p style={{ margin: '4px 0' }}>
                - Tổng số tiền (Viết bằng chữ): <b style={{ fontStyle: 'italic' }}>{numberToVietnameseWords(totalPrice)}</b>
              </p>
              <p style={{ margin: '4px 0' }}>
                - Số chứng từ gốc kèm theo: <b>01 Hóa đơn GTGT, 01 Biên bản kiểm định chất lượng (QC Passed).</b>
              </p>
            </div>

            {/* 5 Legal Signatures Box */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '28px', textAlign: 'center', fontSize: '13px' }}>
              <div style={{ width: '18%' }}>
                <p style={{ margin: 0, fontWeight: 'bold' }}>Người lập phiếu</p>
                <p style={{ margin: '2px 0 0 0', fontSize: '11.5px', fontStyle: 'italic' }}>(Ký, họ tên)</p>
                <div style={{ height: '65px' }}></div>
                <p style={{ margin: 0, fontWeight: 'bold' }}>{order.requestedBy || 'Nguyễn Hoàng Nam'}</p>
              </div>

              <div style={{ width: '18%' }}>
                <p style={{ margin: 0, fontWeight: 'bold' }}>Người giao hàng</p>
                <p style={{ margin: '2px 0 0 0', fontSize: '11.5px', fontStyle: 'italic' }}>(Ký, họ tên)</p>
                <div style={{ height: '65px' }}></div>
                <p style={{ margin: 0, fontWeight: 'bold' }}>{order.delivererName || 'Nguyễn Văn Giao'}</p>
              </div>

              <div style={{ width: '18%' }}>
                <p style={{ margin: 0, fontWeight: 'bold' }}>Thủ kho</p>
                <p style={{ margin: '2px 0 0 0', fontSize: '11.5px', fontStyle: 'italic' }}>(Ký, họ tên)</p>
                <div style={{ height: '65px' }}></div>
                <p style={{ margin: 0, fontWeight: 'bold' }}>Lê Văn Kho</p>
              </div>

              <div style={{ width: '22%' }}>
                <p style={{ margin: 0, fontWeight: 'bold' }}>Kế toán trưởng</p>
                <p style={{ margin: '2px 0 0 0', fontSize: '11.5px', fontStyle: 'italic' }}>(Hoặc bộ phận có nhu cầu)</p>
                <div style={{ height: '65px' }}></div>
                <p style={{ margin: 0, fontWeight: 'bold' }}>Trần Thị Thu</p>
              </div>

              <div style={{ width: '18%' }}>
                <p style={{ margin: 0, fontWeight: 'bold' }}>Giám đốc</p>
                <p style={{ margin: '2px 0 0 0', fontSize: '11.5px', fontStyle: 'italic' }}>(Ký, họ tên, đóng dấu)</p>
                <div style={{ height: '65px' }}></div>
                <p style={{ margin: 0, fontWeight: 'bold' }}>Lê Công Chung</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
