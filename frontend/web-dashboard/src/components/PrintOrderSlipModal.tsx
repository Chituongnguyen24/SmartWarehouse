import React from 'react';
import { X, Printer, CheckCircle2, MapPin, Phone, User, Truck, ShieldCheck, QrCode, AlertTriangle, RefreshCcw, Building2, Flame } from 'lucide-react';

export type SlipClassification = 'SALE' | 'DISPOSAL' | 'RETURN' | 'TRANSFER';

export interface OrderItem {
  sku: string;
  productName: string;
  requestedQuantity: number;
  quantity?: number;
  unit?: string;
  price?: number;
  unitPrice?: number;
  lotNumber?: string;
  lotCode?: string;
  expiryDate?: string;
  slotId?: string;
}

export interface PrintableOrder {
  id: string;
  orderCode: string;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  requesterName?: string;
  destination?: string;
  totalAmount?: number;
  paymentMethod?: string;
  status: string;
  assignedDriverName?: string;
  assignedDriverPhone?: string;
  assignedDriverPlate?: string;
  tripNumber?: number;
  createdAt: string;
  notes?: string;
  note?: string;
  orderType?: string;
  warehouseCode?: string;
  assignedWarehouseName?: string;
  items?: OrderItem[];
}

interface Props {
  order: PrintableOrder | null;
  onClose: () => void;
}

export function detectSlipClassification(order: PrintableOrder | null): SlipClassification {
  if (!order) return 'SALE';

  const typeStr = (order.orderType || '').toUpperCase();
  if (typeStr.includes('HUY') || typeStr.includes('DISPOSAL') || typeStr.includes('WASTE')) return 'DISPOSAL';
  if (typeStr.includes('TRA') || typeStr.includes('RETURN') || typeStr.includes('HOAN')) return 'RETURN';
  if (typeStr.includes('CHUYEN') || typeStr.includes('TRANSFER') || typeStr.includes('DIEU_CHUYEN')) return 'TRANSFER';
  if (typeStr.includes('BAN') || typeStr.includes('SALE') || typeStr.includes('ECOMMERCE')) return 'SALE';

  const text = `${order.orderCode || ''} ${order.notes || ''} ${order.note || ''} ${order.customerName || ''} ${order.requesterName || ''} ${order.destination || ''} ${order.customerAddress || ''}`.toLowerCase();

  if (text.includes('tiêu hủy') || text.includes('hết hạn') || text.includes('đa phước') || text.includes('disposal') || text.includes('xuất hủy') || text.includes('chất thải') || text.includes('hỏng mốc')) {
    return 'DISPOSAL';
  }
  if (text.includes('trả hàng') || text.includes('hàng hoàn') || text.includes('ncc') || text.includes('hoàn trả') || text.includes('reverse') || text.includes('lỗi kỹ thuật') || text.includes('trả ncc') || text.includes('nhà cung cấp')) {
    return 'RETURN';
  }
  if (text.includes('điều chuyển') || text.includes('chuyển kho') || text.includes('transfer') || text.includes('inter-hub') || text.includes('chi nhánh') || text.includes('kho bình thạnh') || text.includes('kho thủ đức') || text.includes('kho tân bình') || text.includes('wh-001') || text.includes('wh-002') || text.includes('wh-003') || text.includes('wh-004') || text.includes('wh-005')) {
    return 'TRANSFER';
  }

  return 'SALE';
}

export const PrintOrderSlipModal: React.FC<Props> = ({ order, onClose }) => {
  if (!order) return null;

  const classification = detectSlipClassification(order);

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

  // Calculate items total
  const items = order.items || [];
  const totalQty = items.reduce((sum, item) => sum + (item.quantity || item.requestedQuantity || 1), 0);
  const calculatedTotal = items.reduce((sum, item) => {
    const qty = item.quantity || item.requestedQuantity || 1;
    const price = item.price ?? item.unitPrice ?? 0;
    return sum + (qty * price);
  }, 0);

  const displayTotal = (classification === 'DISPOSAL' || classification === 'RETURN' || classification === 'TRANSFER')
    ? 0
    : (order.totalAmount || calculatedTotal || 0);

  // Classification specific contents
  const config = {
    SALE: {
      tag: '🛒 ĐƠN HÀNG BÁN LẺ E-COMMERCE',
      tagBg: '#eff6ff',
      tagColor: '#1d4ed8',
      tagBorder: '#bfdbfe',
      title: 'PHIẾU GIAO HÀNG & THU TIỀN',
      subTitle: 'DELIVERY & CASH-ON-DELIVERY SLIP (BÁN HÀNG SIÊU THỊ)',
      receiverHeader: 'Thông Tin Người Nhận Hàng (Khách Hàng)',
      receiverName: order.customerName || order.requesterName || 'Khách hàng C.T Mart',
      receiverPhone: order.customerPhone || '0901234567',
      receiverAddress: order.customerAddress || order.destination || 'Gò Vấp, TP.HCM',
      carrierHeader: 'Đơn Vị Vận Chuyển Siêu Thị',
      carrierName: order.assignedDriverName || 'Đội xe Hỏa tốc Siêu thị CityMart',
      carrierPlate: order.assignedDriverPlate,
      paymentLabel: order.paymentMethod === 'cod' ? 'Thu hộ tiền mặt (COD)' : 'Đã thanh toán (VNPay / Online)',
      paymentColor: order.paymentMethod === 'cod' ? '#dc2626' : '#2563eb',
      codText: order.paymentMethod === 'cod' ? `${displayTotal.toLocaleString('vi-VN')}đ` : '0đ (Đã TT)',
      noticeIcon: <ShieldCheck size={16} color="#059669" />,
      noticeText: 'Bảo đảm chuỗi lạnh tiêu chuẩn 0 - 4°C. Quý khách vui lòng kiểm tra kỹ số lượng & chất lượng thực phẩm trước khi nhận hàng.',
      sigCol1: { role: 'Người Soạn Hàng (Kho)', note: '(Ký & ghi rõ họ tên)', name: 'Nhân viên Kho Gò Vấp' },
      sigCol2: { role: 'Nhân Viên Giao Hàng', note: '(Ký nhận đơn hàng)', name: order.assignedDriverName || 'Shipper C.T Mart' },
      sigCol3: { role: 'Người Nhận Hàng', note: '(Ký & xác nhận đủ hàng)', name: order.customerName || 'Khách hàng' },
    },
    DISPOSAL: {
      tag: '☣️ LỆNH XUẤT TIÊU HỦY & XỬ LÝ CHẤT THẢI MÔI TRƯỜNG',
      tagBg: '#faf5ff',
      tagColor: '#7c3aed',
      tagBorder: '#e9d5ff',
      title: 'PHIẾU XUẤT TIÊU HỦY & BIÊN BẢN BÀN GIAO CHẤT THẢI',
      subTitle: 'FOOD WASTE DISPOSAL & ENVIRONMENTAL SAFETY PROTOCOL',
      receiverHeader: 'Đơn Vị Tiếp Nhận & Tiêu Hủy Chất Thải',
      receiverName: 'Khu Liên Hợp Xử Lý Môi Trường Đa Phước (Trạm Tiếp Nhận Chất Thải Hữu Cơ)',
      receiverPhone: 'Hotline Môi Trường: 1900 6868 - Ext: 104',
      receiverAddress: 'Khu Liên Hợp Xử Lý Chất Thải Đa Phước, Xã Đa Phước, Huyện Bình Chánh, TP.HCM',
      carrierHeader: 'Đội Xe Tải Chuyên Dụng Xử Lý Rác',
      carrierName: order.assignedDriverName || 'Đặng Hoàng Phúc (Tài xế Xe Tải Lạnh 2.5T)',
      carrierPlate: order.assignedDriverPlate || '51D-892.45',
      paymentLabel: 'Lệnh Tiêu Hủy (Không Thu Tiền - COD: 0đ)',
      paymentColor: '#7c3aed',
      codText: '0đ (Lệnh Tiêu Hủy)',
      noticeIcon: <Flame size={16} color="#dc2626" />,
      noticeText: 'CẢNH BÁO TIÊU HỦY: Hàng hóa hư hỏng/hết hạn kiểm định QC. Nghiêm cấm tuồn ra thị trường. Phải đưa vào lò hủy/bể ủ phân compost Đa Phước.',
      sigCol1: { role: 'Giám Định Viên QC & ATVSTP', note: '(Ký & đóng dấu kiểm định)', name: 'Trưởng Bộ Phận QC An Toàn' },
      sigCol2: { role: 'Tài Xế Vận Chuyển Chất Thải', note: '(Ký nhận bàn giao xe tải)', name: order.assignedDriverName || 'Đặng Hoàng Phúc' },
      sigCol3: { role: 'Đại Diện BQL Trạm Đa Phước', note: '(Ký & xác nhận tiêu hủy)', name: 'Đại diện Trạm Đa Phước' },
    },
    RETURN: {
      tag: '↩️ PHIẾU XUẤT TRẢ HÀNG NHÀ CUNG CẤP / HOÀN KHO',
      tagBg: '#fef2f2',
      tagColor: '#b91c1c',
      tagBorder: '#fecaca',
      title: 'PHIẾU XUẤT TRẢ HÀNG & THU HỒI (REVERSE LOGISTICS)',
      subTitle: 'RETURN TO VENDOR / GOODS RETURN VOUCHER',
      receiverHeader: 'Đại Diện Nhà Cung Cấp / Đối Tác Tiếp Nhận',
      receiverName: order.customerName || order.requesterName || 'Công Ty Cổ Phần Cung Ứng Thực Phẩm Sạch Sài Gòn',
      receiverPhone: order.customerPhone || '028 3822 9999',
      receiverAddress: order.customerAddress || order.destination || 'Tổng Kho Nhà Cung Cấp - KCN Tân Bình, TP.HCM',
      carrierHeader: 'Đội Xe Vận Chuyển Hàng Hoàn',
      carrierName: order.assignedDriverName || 'Đội Xe Hàng Hoàn & Thu Hồi CityMart',
      carrierPlate: order.assignedDriverPlate,
      paymentLabel: 'Hàng Xuất Hoàn Trả (COD: 0đ)',
      paymentColor: '#b91c1c',
      codText: '0đ (Hàng Trả)',
      noticeIcon: <RefreshCcw size={16} color="#b91c1c" />,
      noticeText: 'BIÊN BẢN HÀNG HOÀN: Hàng hóa xuất trả do lỗi bao bì/chất lượng hoặc giao thất bại. Đề nghị đối chiếu nguyên seal và cấn trừ công nợ.',
      sigCol1: { role: 'Thủ Kho Xuất Trả', note: '(Ký & ghi rõ họ tên)', name: 'Thủ kho C.T Mart Gò Vấp' },
      sigCol2: { role: 'Tài Xế Hoàn Hàng', note: '(Ký nhận vận chuyển)', name: order.assignedDriverName || 'Shipper Hoàn Hàng' },
      sigCol3: { role: 'Đại Diện Nhà Cung Cấp', note: '(Ký & đóng dấu nhận hàng)', name: 'Đại diện NCC / Đối tác' },
    },
    TRANSFER: {
      tag: '🔄 LỆNH ĐIỀU CHUYỂN HÀNG HÓA NỘI BỘ LIÊN HUB',
      tagBg: '#f0fdf4',
      tagColor: '#15803d',
      tagBorder: '#bbf7d0',
      title: 'PHIẾU ĐIỀU ĐỘNG & VẬN CHUYỂN LIÊN KHO',
      subTitle: 'INTER-HUB STOCK TRANSFER & TRANSPORT MANIFEST',
      receiverHeader: 'Kho / Chi Nhánh Tiếp Nhận Điều Chuyển',
      receiverName: order.customerName || order.destination || 'Kho C.T Mart Chi Nhánh Bình Thạnh (WH-002)',
      receiverPhone: 'Hotline Hub Tiếp Nhận: 028 3511 8888',
      receiverAddress: order.customerAddress || order.destination || 'Kho Hàng Bình Thạnh, 120 Phan Đăng Lưu, TP.HCM',
      carrierHeader: 'Đội Xe Tải Trung Chuyển Liên Chi Nhánh',
      carrierName: order.assignedDriverName || 'Đội Xe Tải Liên Hub CityMart',
      carrierPlate: order.assignedDriverPlate || '51C-734.12',
      paymentLabel: 'Luân Chuyển Nội Bộ (COD: 0đ)',
      paymentColor: '#15803d',
      codText: '0đ (Điều Chuyển Nội Bộ)',
      noticeIcon: <Building2 size={16} color="#15803d" />,
      noticeText: 'ĐIỀU CHUYỂN NỘI BỘ: Duy trì dải nhiệt độ chuẩn 0 - 4°C trong suốt quá trình trung chuyển. Thủ kho đích có trách nhiệm quét mã kiểm đếm nhập kho.',
      sigCol1: { role: 'Thủ Kho Xuất (Gò Vấp)', note: '(Ký & bàn giao)', name: 'Thủ kho WH-006' },
      sigCol2: { role: 'Tài Xế Trung Chuyển', note: '(Ký nhận lộ trình)', name: order.assignedDriverName || 'Tài xế Liên Hub' },
      sigCol3: { role: 'Thủ Kho Đích Tiếp Nhận', note: '(Ký xác nhận nhập kho)', name: 'Thủ kho Chi Nhánh Tiếp Nhận' },
    }
  }[classification];

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
          maxWidth: '720px',
          width: '100%',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header Toolbar (Hidden when printing) */}
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
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 800, margin: 0 }}>
                Xem Trước & In Phiếu Giao Nhận / Xuất Kho
              </h3>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                Phân loại: <b style={{ color: config.tagColor }}>{config.tag}</b>
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
            padding: '30px 36px',
            overflowY: 'auto',
            color: '#0f172a',
            fontFamily: 'Inter, -apple-system, sans-serif',
            fontSize: '13px',
            backgroundColor: '#ffffff',
          }}
        >
          {/* Top Classification Badge */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <span
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 800,
                backgroundColor: config.tagBg,
                color: config.tagColor,
                border: `1px solid ${config.tagBorder}`,
                letterSpacing: '0.3px',
              }}
            >
              {config.tag}
            </span>
            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
              Hệ thống SmartWarehouse 4.0 • Chuỗi lạnh chuẩn ISO 22000
            </span>
          </div>

          {/* Slip Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #0f172a', paddingBottom: '14px', marginBottom: '16px' }}>
            <div>
              <div style={{ fontSize: '18px', fontWeight: 900, color: '#1e3a8a', letterSpacing: '-0.5px' }}>
                C.T MART SUPERMARKET & LOGISTICS
              </div>
              <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>
                Kho xuất phát: <b>Kho Trung Tâm Gò Vấp (WH-006)</b> - 350 Quang Trung, Gò Vấp, TP.HCM
              </div>
              <div style={{ fontSize: '11px', color: '#475569' }}>
                Hotline Điều Vận: 1900 6868 | Website: ctmart.vn
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '15px', fontWeight: 900, color: '#0f172a' }}>
                {config.title}
              </div>
              <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 700 }}>
                {config.subTitle}
              </div>
              <div style={{ fontSize: '14px', fontFamily: 'monospace', fontWeight: 900, color: '#2563eb', marginTop: '4px' }}>
                #{order.orderCode}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>
                Thời gian: {formattedDate}
              </div>
            </div>
          </div>

          {/* Customer / Receiver & Shipper Details Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '14px', backgroundColor: '#f8fafc', padding: '12px 14px', borderRadius: '12px', marginBottom: '16px', border: '1px solid #e2e8f0' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>
                {config.receiverHeader}
              </div>
              <div style={{ fontWeight: 800, fontSize: '13.5px', color: '#0f172a', display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                <User size={14} color="#2563eb" style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>{config.receiverName}</span>
              </div>
              <div style={{ fontSize: '12px', color: '#334155', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                <Phone size={13} color="#059669" style={{ flexShrink: 0 }} />
                <span>{config.receiverPhone}</span>
              </div>
              <div style={{ fontSize: '12px', color: '#334155', display: 'flex', alignItems: 'flex-start', gap: '6px', marginTop: '4px' }}>
                <MapPin size={13} color="#ef4444" style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>{config.receiverAddress}</span>
              </div>
            </div>

            <div>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>
                {config.carrierHeader}
              </div>
              <div style={{ fontWeight: 800, fontSize: '13.5px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Truck size={14} color="#d97706" />
                <span>{config.carrierName}</span>
              </div>
              {config.carrierPlate && (
                <div style={{ fontSize: '11.5px', color: '#047857', fontWeight: 700, marginTop: '3px' }}>
                  Biển số xe: <b>{config.carrierPlate}</b>
                </div>
              )}
              {order.tripNumber && (
                <div style={{ fontSize: '11.5px', color: '#0284c7', fontWeight: 700, marginTop: '2px' }}>
                  Chuyến giao hàng: <b>Chuyến #{order.tripNumber} (Lộ trình VRP)</b>
                </div>
              )}
              <div style={{ fontSize: '11.5px', color: '#475569', marginTop: '3px' }}>
                Phương thức: <b style={{ color: config.paymentColor }}>{config.paymentLabel}</b>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <div style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase' }}>
                Danh Sách Hàng Hóa Thực Phẩm (Chuẩn Xuất FEFO)
              </div>
              <span style={{ fontSize: '11px', color: '#64748b' }}>
                Tổng số lượng: <b>{totalQty} {classification === 'DISPOSAL' ? 'món / kiện phế phẩm' : 'món'}</b>
              </span>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                  <th style={{ padding: '7px 8px', width: '28px', textAlign: 'center' }}>STT</th>
                  <th style={{ padding: '7px 8px' }}>Tên Sản Phẩm / Mã SKU</th>
                  <th style={{ padding: '7px 8px' }}>Lô FEFO / Vị Trí Kệ</th>
                  <th style={{ padding: '7px 8px', textAlign: 'center', width: '45px' }}>SL</th>
                  <th style={{ padding: '7px 8px', textAlign: 'right', width: '85px' }}>Đơn Giá</th>
                  <th style={{ padding: '7px 8px', textAlign: 'right', width: '95px' }}>Thành Tiền</th>
                </tr>
              </thead>
              <tbody>
                {(items.length > 0) ? (
                  items.map((item, idx) => {
                    const qty = item.quantity || item.requestedQuantity || 1;
                    const price = item.price ?? item.unitPrice ?? 0;
                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '7px 8px', color: '#64748b', textAlign: 'center' }}>{idx + 1}</td>
                        <td style={{ padding: '7px 8px' }}>
                          <div style={{ fontWeight: 700, color: '#0f172a' }}>{item.productName}</div>
                          <div style={{ fontSize: '10.5px', color: '#64748b', fontFamily: 'monospace' }}>SKU: {item.sku}</div>
                        </td>
                        <td style={{ padding: '7px 8px' }}>
                          <span style={{ fontSize: '10.5px', backgroundColor: classification === 'DISPOSAL' ? '#fef2f2' : '#ecfdf5', color: classification === 'DISPOSAL' ? '#b91c1c' : '#047857', padding: '2px 5px', borderRadius: '4px', fontWeight: 700 }}>
                            {item.lotNumber || item.lotCode || (classification === 'DISPOSAL' ? 'LOT-EXPIRED-QC' : 'LOT-2026-FEFO')}
                          </span>
                          {item.expiryDate && (
                            <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
                              HSD: {new Date(item.expiryDate).toLocaleDateString('vi-VN')}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '7px 8px', textAlign: 'center', fontWeight: 800 }}>{qty}</td>
                        <td style={{ padding: '7px 8px', textAlign: 'right', color: '#475569' }}>
                          {classification === 'DISPOSAL' ? '0đ (Hủy)' : (price > 0 ? price.toLocaleString('vi-VN') + 'đ' : '—')}
                        </td>
                        <td style={{ padding: '7px 8px', textAlign: 'right', fontWeight: 800, color: '#0f172a' }}>
                          {classification === 'DISPOSAL' ? '0đ' : (price > 0 ? (price * qty).toLocaleString('vi-VN') + 'đ' : '—')}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '7px 8px', color: '#64748b', textAlign: 'center' }}>1</td>
                    <td style={{ padding: '7px 8px', fontWeight: 700 }}>Thực phẩm tươi sống đóng gói tiêu chuẩn CityMart</td>
                    <td style={{ padding: '7px 8px' }}>
                      <span style={{ fontSize: '10.5px', backgroundColor: '#ecfdf5', color: '#047857', padding: '2px 5px', borderRadius: '4px', fontWeight: 700 }}>
                        LOT-FEFO-COLD
                      </span>
                    </td>
                    <td style={{ padding: '7px 8px', textAlign: 'center', fontWeight: 800 }}>1</td>
                    <td style={{ padding: '7px 8px', textAlign: 'right' }}>{displayTotal.toLocaleString('vi-VN')}đ</td>
                    <td style={{ padding: '7px 8px', textAlign: 'right', fontWeight: 800 }}>{displayTotal.toLocaleString('vi-VN')}đ</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Total Calculation & Safety Notice */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderTop: '2px solid #e2e8f0', paddingTop: '12px', marginBottom: '20px' }}>
            <div style={{ maxWidth: '340px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#0f172a', fontWeight: 700, fontSize: '11.5px' }}>
                {config.noticeIcon}
                <span>Quy chuẩn kiểm soát & An toàn thực phẩm</span>
              </div>
              <p style={{ fontSize: '10.5px', color: '#64748b', margin: '4px 0 0 0', lineHeight: 1.4 }}>
                {config.noticeText}
              </p>
            </div>

            <div style={{ textAlign: 'right', minWidth: '220px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: '#64748b', marginBottom: '3px' }}>
                <span>Giá trị hàng hóa:</span>
                <span>{displayTotal.toLocaleString('vi-VN')}đ</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: '#64748b', marginBottom: '4px' }}>
                <span>Phí vận chuyển:</span>
                <span style={{ color: '#059669', fontWeight: 700 }}>Miễn phí (Hệ thống)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 900, color: '#0f172a', borderTop: '1px solid #cbd5e1', paddingTop: '5px' }}>
                <span>TỔNG THU {order.paymentMethod === 'cod' && classification === 'SALE' ? 'COD' : ''}:</span>
                <span style={{ color: config.paymentColor }}>
                  {config.codText}
                </span>
              </div>
            </div>
          </div>

          {/* Dynamic Signatures Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', textAlign: 'center', marginTop: '24px', paddingTop: '8px', borderTop: '1px dashed #cbd5e1' }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: '11.5px', color: '#0f172a' }}>{config.sigCol1.role}</div>
              <div style={{ fontSize: '10.5px', color: '#94a3b8', marginTop: '2px' }}>{config.sigCol1.note}</div>
              <div style={{ height: '44px' }}></div>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>{config.sigCol1.name}</div>
            </div>

            <div>
              <div style={{ fontWeight: 800, fontSize: '11.5px', color: '#0f172a' }}>{config.sigCol2.role}</div>
              <div style={{ fontSize: '10.5px', color: '#94a3b8', marginTop: '2px' }}>{config.sigCol2.note}</div>
              <div style={{ height: '44px' }}></div>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>{config.sigCol2.name}</div>
            </div>

            <div>
              <div style={{ fontWeight: 800, fontSize: '11.5px', color: '#0f172a' }}>{config.sigCol3.role}</div>
              <div style={{ fontSize: '10.5px', color: '#94a3b8', marginTop: '2px' }}>{config.sigCol3.note}</div>
              <div style={{ height: '44px' }}></div>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>{config.sigCol3.name}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
