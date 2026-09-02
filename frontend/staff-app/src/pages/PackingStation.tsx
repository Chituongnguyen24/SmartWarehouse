import React, { useState } from 'react';
import {
  PackageCheck,
  Snowflake,
  QrCode,
  Printer,
  CheckCircle2,
  AlertTriangle,
  Camera,
  Layers,
  Sparkles,
} from 'lucide-react';

interface PackOrder {
  orderCode: string;
  customerName: string;
  address: string;
  items: { name: string; qty: number; isCold: boolean }[];
  isPacked: boolean;
  iceGelCount: number;
}

export const PackingStation: React.FC = () => {
  const [orders, setOrders] = useState<PackOrder[]>([
    {
      orderCode: 'DH-20260831-01',
      customerName: 'Chị Mai Lan',
      address: '18 Quang Trung, Phường 10, Gò Vấp',
      items: [
        { name: 'Thịt heo xay sạch CP 400g', qty: 2, isCold: true },
        { name: 'Sữa tươi Đà Lạt Milk 1L', qty: 1, isCold: true },
      ],
      isPacked: false,
      iceGelCount: 2,
    },
    {
      orderCode: 'DH-20260831-02',
      customerName: 'Anh Trần Hùng',
      address: '12 Tô Ký, Phường Trung Mỹ Tây, Quận 12',
      items: [
        { name: 'Gạo ST25 Ông Cua Túi 5kg', qty: 1, isCold: false },
        { name: 'Dầu ăn Simply 1L', qty: 2, isCold: false },
      ],
      isPacked: false,
      iceGelCount: 0,
    },
  ]);

  const [selectedOrder, setSelectedOrder] = useState<PackOrder | null>(orders[0]);
  const [showShippingLabel, setShowShippingLabel] = useState(false);

  const handleConfirmPack = () => {
    if (!selectedOrder) return;

    setOrders(prev =>
      prev.map(o => (o.orderCode === selectedOrder.orderCode ? { ...o, isPacked: true } : o))
    );
    setShowShippingLabel(true);
  };

  return (
    <div style={{ padding: '16px', paddingBottom: '90px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#0f172a',
          padding: '16px 18px',
          borderRadius: '20px',
          border: '1px solid #1e293b',
        }}
      >
        <div>
          <div style={{ fontSize: '11px', color: '#c084fc', fontWeight: 800 }}>BÀN ĐÓNG GÓI DI ĐỘNG</div>
          <h2 style={{ margin: '2px 0 0 0', fontSize: '16px', fontWeight: 900, color: '#ffffff' }}>
            Đóng Gói Chuỗi Lạnh & Dán Nhãn
          </h2>
        </div>
        <span style={{ fontSize: '11px', backgroundColor: '#0369a1', color: '#ffffff', padding: '4px 10px', borderRadius: '999px', fontWeight: 800 }}>
          Khu Vực Staging
        </span>
      </div>

      {/* Selected Order Packing Checklist */}
      {selectedOrder && (
        <div
          style={{
            backgroundColor: '#0f172a',
            borderRadius: '20px',
            padding: '18px',
            border: '2px solid #8b5cf6',
            boxShadow: '0 10px 25px -5px rgba(139, 92, 246, 0.25)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 900, color: '#c084fc' }}>
              📦 ĐƠN: {selectedOrder.orderCode}
            </span>
            <span style={{ fontSize: '11px', color: '#cbd5e1', fontWeight: 700 }}>
              {selectedOrder.customerName}
            </span>
          </div>

          <p style={{ margin: '0 0 12px 0', fontSize: '11px', color: '#94a3b8' }}>
            📍 Giao đến: {selectedOrder.address}
          </p>

          {/* Items Checklist */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: '#020617', padding: '12px', borderRadius: '12px', border: '1px solid #1e293b' }}>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8' }}>DANH SÁCH MÓN ĐÃ GOM:</div>
            {selectedOrder.items.map((it, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#ffffff' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle2 size={14} color="#34d399" />
                  <span>{it.name}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <b>x{it.qty}</b>
                  {it.isCold && (
                    <span style={{ fontSize: '10px', backgroundColor: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8', padding: '1px 5px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '2px' }}>
                      <Snowflake size={10} /> Lạnh
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Cold Chain Packaging Requirement Warning */}
          {selectedOrder.items.some(i => i.isCold) && (
            <div style={{ backgroundColor: 'rgba(56, 189, 248, 0.15)', border: '1px solid #38bdf8', borderRadius: '12px', padding: '12px', margin: '12px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Snowflake size={24} color="#38bdf8" style={{ flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: '12px', fontWeight: 900, color: '#ffffff' }}>
                  YÊU CẦU ĐÓNG GÓI BẢO QUẢN LẠNH:
                </div>
                <div style={{ fontSize: '11px', color: '#e0f2fe', marginTop: '2px' }}>
                  Bắt buộc cho <b>02 túi Đá Gel</b> + Sử dụng <b>Túi Bạc Giữ Nhiệt CityMart</b>.
                </div>
              </div>
            </div>
          )}

          {/* Shipping QR Code Modal / Preview */}
          {showShippingLabel && (
            <div style={{ backgroundColor: '#ffffff', color: '#000000', borderRadius: '14px', padding: '16px', margin: '14px 0', textAlign: 'center' }}>
              <div style={{ fontSize: '13px', fontWeight: 900, color: '#0f172a' }}>
                🏷️ NHÃN KIỆN HÀNG (SHIPPING LABEL)
              </div>
              <div style={{ fontSize: '15px', fontWeight: 900, color: '#0284c7', margin: '4px 0' }}>
                {selectedOrder.orderCode}
              </div>
              <div style={{ width: '120px', height: '120px', backgroundColor: '#0f172a', margin: '10px auto', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px' }}>
                <QrCode size={80} color="#ffffff" />
              </div>
              <div style={{ fontSize: '11px', fontWeight: 700 }}>
                KH: {selectedOrder.customerName} • Đã niêm phong
              </div>
              <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
                Chuyển sang Khu Vực Chờ Tài Xế (Staging Bay #03)
              </div>
            </div>
          )}

          {/* Actions */}
          {!showShippingLabel ? (
            <button
              onClick={handleConfirmPack}
              style={{
                width: '100%',
                backgroundColor: '#7c3aed',
                color: '#ffffff',
                border: 'none',
                borderRadius: '14px',
                padding: '14px',
                fontSize: '13.5px',
                fontWeight: 900,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(124, 58, 237, 0.4)',
                marginTop: '12px',
              }}
            >
              <PackageCheck size={18} />
              <span>Hoàn Tất Đóng Gói & Sinh Nhãn Shipping QR</span>
            </button>
          ) : (
            <button
              onClick={() => {
                setShowShippingLabel(false);
                setSelectedOrder(orders.find(o => !o.isPacked) || null);
              }}
              style={{
                width: '100%',
                backgroundColor: '#059669',
                color: '#ffffff',
                border: 'none',
                borderRadius: '14px',
                padding: '12px',
                fontSize: '13px',
                fontWeight: 900,
                cursor: 'pointer',
                marginTop: '12px',
              }}
            >
              Đã Chuyển Vào Khu Vực Staging (Tiếp Tục Đơn Khác)
            </button>
          )}
        </div>
      )}

      {/* Orders List */}
      <div>
        <div style={{ fontSize: '12px', fontWeight: 800, color: '#94a3b8', marginBottom: '8px' }}>
          DANH SÁCH ĐƠN CHỜ ĐÓNG GÓI:
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {orders.map(o => (
            <div
              key={o.orderCode}
              onClick={() => {
                setSelectedOrder(o);
                setShowShippingLabel(o.isPacked);
              }}
              style={{
                backgroundColor: '#0f172a',
                borderRadius: '14px',
                padding: '14px',
                border: `1px solid ${o.isPacked ? '#059669' : '#1e293b'}`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'pointer',
              }}
            >
              <div>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#ffffff' }}>
                  {o.orderCode} • {o.customerName}
                </div>
                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                  {o.items.length} món • {o.items.some(i => i.isCold) ? '❄️ Chuỗi lạnh' : 'Khô thông thường'}
                </div>
              </div>
              <span style={{ fontSize: '11px', backgroundColor: o.isPacked ? '#064e3b' : '#1e293b', color: o.isPacked ? '#34d399' : '#f59e0b', padding: '3px 8px', borderRadius: '6px', fontWeight: 800 }}>
                {o.isPacked ? 'Đã Niêm Phong' : 'Chờ Đóng'}
              </span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
