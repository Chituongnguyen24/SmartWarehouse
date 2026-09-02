import React, { useState } from 'react';
import {
  Download,
  ScanBarcode,
  CheckCircle2,
  AlertTriangle,
  Building,
  Thermometer,
  Camera,
  ShieldCheck,
  MapPin,
  FileText,
} from 'lucide-react';
import { InboundReceipt } from '../types';
import { CameraScannerModal } from '../components/CameraScannerModal';

const MOCK_INBOUND_LIST: InboundReceipt[] = [
  {
    id: 'inb-01',
    orderCode: 'NK-20260831-01',
    supplierName: 'CÔNG TY CP CHĂN NUÔI C.P. VIỆT NAM',
    expectedDate: '31/08/2026',
    status: 'PENDING',
    itemsCount: 4,
    totalQuantity: 120,
    temperatureRequired: '0-4°C (Xe chuyên dụng)',
  },
  {
    id: 'inb-02',
    orderCode: 'NK-20260831-02',
    supplierName: 'CÔNG TY CP SỮA ĐÀ LẠT (DALATMILK)',
    expectedDate: '31/08/2026',
    status: 'PENDING',
    itemsCount: 2,
    totalQuantity: 80,
    temperatureRequired: '2-6°C',
  },
];

export const InboundReceiving: React.FC = () => {
  const [inbounds, setInbounds] = useState<InboundReceipt[]>(MOCK_INBOUND_LIST);
  const [selectedInbound, setSelectedInbound] = useState<InboundReceipt | null>(null);
  const [measuredTemp, setMeasuredTemp] = useState('2.8');
  const [isPackagingIntact, setIsPackagingIntact] = useState(true);
  const [isExpiryValid, setIsExpiryValid] = useState(true);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  const handleOpenQC = (inb: InboundReceipt) => {
    setSelectedInbound(inb);
    setIsCompleted(false);
  };

  const handleFinishReceiving = () => {
    if (!selectedInbound) return;

    setInbounds(prev =>
      prev.map(it => {
        if (it.id === selectedInbound.id) {
          return { ...it, status: 'STORED', qcPassed: true };
        }
        return it;
      })
    );

    setIsCompleted(true);
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
          <div style={{ fontSize: '11px', color: '#34d399', fontWeight: 800 }}>TIẾP NHẬN HÀNG NCC</div>
          <h2 style={{ margin: '2px 0 0 0', fontSize: '16px', fontWeight: 900, color: '#ffffff' }}>
            Nhập Kho & Kiểm Định QC
          </h2>
        </div>

        <button
          onClick={() => setIsScannerOpen(true)}
          style={{
            backgroundColor: '#0369a1',
            color: '#ffffff',
            border: 'none',
            borderRadius: '10px',
            padding: '8px 12px',
            fontSize: '11.5px',
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <ScanBarcode size={16} />
          <span>Quét Phiếu</span>
        </button>
      </div>

      {/* QC Detail Form Modal/View */}
      {selectedInbound && !isCompleted && (
        <div
          style={{
            backgroundColor: '#0f172a',
            borderRadius: '20px',
            padding: '18px',
            border: '2px solid #059669',
            boxShadow: '0 10px 25px -5px rgba(5, 150, 105, 0.3)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '10px', backgroundColor: '#064e3b', color: '#34d399', padding: '3px 8px', borderRadius: '6px', fontWeight: 900 }}>
              📋 BIÊN BẢN QC: {selectedInbound.orderCode}
            </span>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>Mẫu 01-VT MISA</span>
          </div>

          <h3 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: 900, color: '#ffffff' }}>
            {selectedInbound.supplierName}
          </h3>
          <p style={{ margin: '0 0 14px 0', fontSize: '11px', color: '#94a3b8' }}>
            Yêu cầu nhiệt độ: <b style={{ color: '#38bdf8' }}>{selectedInbound.temperatureRequired}</b>
          </p>

          {/* QC Inspection Form */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', backgroundColor: '#020617', padding: '14px', borderRadius: '14px', border: '1px solid #1e293b' }}>
            
            {/* Field 1: Measured Temp */}
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#cbd5e1', marginBottom: '4px' }}>
                🌡️ Nhiệt Độ Thùng Lạnh Thực Đo (°C) *
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="text"
                  value={measuredTemp}
                  onChange={e => setMeasuredTemp(e.target.value)}
                  style={{
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    color: '#ffffff',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 800,
                    width: '90px',
                  }}
                />
                <span style={{ fontSize: '11px', color: '#34d399', fontWeight: 700 }}>
                  ✅ Đạt tiêu chuẩn bảo quản chuỗi lạnh
                </span>
              </div>
            </div>

            {/* Field 2: Packaging intact */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid #1e293b' }}>
              <span style={{ fontSize: '12px', color: '#cbd5e1', fontWeight: 700 }}>
                📦 Bao bì & Niêm phong nguyên vẹn
              </span>
              <button
                type="button"
                onClick={() => setIsPackagingIntact(!isPackagingIntact)}
                style={{
                  backgroundColor: isPackagingIntact ? '#064e3b' : '#7f1d1d',
                  color: '#ffffff',
                  border: 'none',
                  padding: '4px 10px',
                  borderRadius: '8px',
                  fontSize: '11px',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                {isPackagingIntact ? 'Đạt QC' : 'Không Đạt'}
              </button>
            </div>

            {/* Field 3: Expiry Check */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid #1e293b' }}>
              <span style={{ fontSize: '12px', color: '#cbd5e1', fontWeight: 700 }}>
                🥦 Hạn dùng còn &gt; 80% thời hạn
              </span>
              <button
                type="button"
                onClick={() => setIsExpiryValid(!isExpiryValid)}
                style={{
                  backgroundColor: isExpiryValid ? '#064e3b' : '#7f1d1d',
                  color: '#ffffff',
                  border: 'none',
                  padding: '4px 10px',
                  borderRadius: '8px',
                  fontSize: '11px',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                {isExpiryValid ? 'Đạt Chuẩn' : 'Cận Date'}
              </button>
            </div>

          </div>

          {/* Shelf Placement Recommendation */}
          <div style={{ backgroundColor: 'rgba(56, 189, 248, 0.1)', border: '1px solid #0284c7', borderRadius: '12px', padding: '10px 14px', margin: '14px 0' }}>
            <div style={{ fontSize: '11px', color: '#38bdf8', fontWeight: 800 }}>
              💡 GỢI Ý VỊ TRÍ LƯU KHO & SINH MÃ LÔ:
            </div>
            <div style={{ fontSize: '12px', color: '#ffffff', fontWeight: 800, marginTop: '2px' }}>
              Chuyển vào <b>Kệ B2-01 (Kho Lạnh B)</b> • Sinh Lô: <b style={{ color: '#f59e0b' }}>LOT-20260831-CP01</b>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setSelectedInbound(null)}
              style={{
                flex: 1,
                backgroundColor: '#1e293b',
                color: '#94a3b8',
                border: 'none',
                padding: '12px',
                borderRadius: '12px',
                fontSize: '13px',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              Hủy
            </button>
            <button
              onClick={handleFinishReceiving}
              style={{
                flex: 2,
                backgroundColor: '#059669',
                color: '#ffffff',
                border: 'none',
                padding: '12px',
                borderRadius: '12px',
                fontSize: '13px',
                fontWeight: 900,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <ShieldCheck size={18} />
              <span>Xác Nhận Đạt QC & Lưu Kho</span>
            </button>
          </div>
        </div>
      )}

      {/* Completion Banner */}
      {isCompleted && (
        <div
          style={{
            backgroundColor: '#064e3b',
            borderRadius: '16px',
            padding: '16px',
            border: '1px solid #10b981',
            textAlign: 'center',
          }}
        >
          <CheckCircle2 size={32} color="#34d399" style={{ margin: '0 auto 8px' }} />
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 900, color: '#ffffff' }}>
            Đã Lưu Kho & Ghi Sổ Nhập Kho Thành Công!
          </h3>
          <p style={{ margin: '4px 0 12px 0', fontSize: '11px', color: '#a7f3d0' }}>
            Định khoản tự động Nợ TK 1561, 1331 / Có TK 331 (Mẫu 01-VT)
          </p>
          <button
            onClick={() => setSelectedInbound(null)}
            style={{
              backgroundColor: '#ffffff',
              color: '#064e3b',
              border: 'none',
              borderRadius: '8px',
              padding: '6px 14px',
              fontSize: '11px',
              fontWeight: 900,
              cursor: 'pointer',
            }}
          >
            Đóng
          </button>
        </div>
      )}

      {/* Inbound List */}
      <div>
        <div style={{ fontSize: '12px', fontWeight: 800, color: '#94a3b8', marginBottom: '8px' }}>
          DANH SÁCH CHUYẾN XE ĐẾN KHO HÔM NAY:
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {inbounds.map(it => {
            const isDone = it.status === 'STORED';

            return (
              <div
                key={it.id}
                style={{
                  backgroundColor: '#0f172a',
                  borderRadius: '16px',
                  padding: '16px',
                  border: `1px solid ${isDone ? '#059669' : '#1e293b'}`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 900, color: '#38bdf8' }}>{it.orderCode}</span>
                    <span style={{ fontSize: '10px', backgroundColor: isDone ? '#064e3b' : '#1e293b', color: isDone ? '#34d399' : '#f59e0b', padding: '1px 6px', borderRadius: '4px', fontWeight: 800 }}>
                      {isDone ? 'Đã Lưu Kho' : 'Chờ Nhận Hàng'}
                    </span>
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#ffffff' }}>
                    {it.supplierName}
                  </div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                    SL: <b>{it.totalQuantity} sp</b> ({it.itemsCount} mặt hàng)
                  </div>
                </div>

                {!isDone && (
                  <button
                    onClick={() => handleOpenQC(it)}
                    style={{
                      backgroundColor: '#059669',
                      color: '#ffffff',
                      border: 'none',
                      padding: '8px 12px',
                      borderRadius: '10px',
                      fontSize: '11.5px',
                      fontWeight: 800,
                      cursor: 'pointer',
                    }}
                  >
                    Kiểm QC
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Camera Scanner Modal */}
      <CameraScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        title="Quét Mã Phiếu Giao Hàng Nhà Cung Cấp"
        onScanResult={(code) => {
          const match = inbounds.find(i => i.orderCode.includes(code) || code.includes('NK'));
          if (match) {
            handleOpenQC(match);
          }
        }}
        mockCodes={['NK-20260831-01', 'NK-20260831-02']}
      />

    </div>
  );
};
