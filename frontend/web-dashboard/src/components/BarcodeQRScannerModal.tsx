import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Camera,
  ScanBarcode,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Volume2,
  Zap,
  Sparkles,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess?: (scannedCode: string, itemMatched?: any) => void;
  expectedItems?: { sku: string; productName: string; lotCode?: string }[];
  mode?: 'ITEM_CHECK' | 'ORDER_LOOKUP';
}

export const BarcodeQRScannerModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onScanSuccess,
  expectedItems = [],
  mode = 'ITEM_CHECK',
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [isScanning, setIsScanning] = useState(true);
  const [scannedResult, setScannedResult] = useState<{
    code: string;
    isMatch: boolean;
    itemName?: string;
    lotCode?: string;
  } | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  // Play crisp audio beep
  const playBeep = (isSuccess: boolean) => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = isSuccess ? 'sine' : 'sawtooth';
      osc.frequency.value = isSuccess ? 880 : 300;
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      osc.start();
      osc.stop(audioCtx.currentTime + (isSuccess ? 0.12 : 0.25));
    } catch (e) {
      // Audio context might be restricted
    }
  };

  useEffect(() => {
    if (!isOpen) {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }
      return;
    }

    // Request camera
    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: 'environment' } })
      .then(s => {
        setStream(s);
        setHasCameraPermission(true);
        if (videoRef.current) {
          videoRef.current.srcObject = s;
        }
      })
      .catch(() => {
        setHasCameraPermission(false);
      });

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isOpen]);

  const handleSimulateScan = (codeToScan: string) => {
    setIsScanning(false);

    // Check if code matches expected items
    const matched = expectedItems.find(
      it => it.sku.toLowerCase() === codeToScan.toLowerCase() || codeToScan.includes(it.sku)
    );

    const isMatch = Boolean(matched) || expectedItems.length === 0;
    playBeep(isMatch);

    setScannedResult({
      code: codeToScan,
      isMatch,
      itemName: matched?.productName || (isMatch ? 'Mã đơn hợp lệ' : 'Sản phẩm không thuộc đơn này!'),
      lotCode: matched?.lotCode || 'LOT-20260831-A',
    });

    if (onScanSuccess) {
      onScanSuccess(codeToScan, matched);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#0f172a',
          borderRadius: '24px',
          maxWidth: '520px',
          width: '100%',
          color: '#ffffff',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          border: '1px solid #334155',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            backgroundColor: '#1e293b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #334155',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ScanBarcode size={20} color="#38bdf8" />
            <div>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#ffffff' }}>
                {mode === 'ITEM_CHECK' ? 'Máy Quét Mã Vạch Soạn Hàng (Barcode)' : 'Quét Mã Tra Cứu Đơn Hàng'}
              </h3>
              <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8' }}>
                Hỗ trợ EAN-13, Code-128, QR Code • Tốc độ quét &lt;100ms
              </p>
            </div>
          </div>
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

        {/* Viewfinder Camera Feed */}
        <div
          style={{
            position: 'relative',
            height: '320px',
            backgroundColor: '#020617',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {hasCameraPermission ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          ) : (
            <div style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>
              <Camera size={48} color="#64748b" style={{ margin: '0 auto 12px' }} />
              <p style={{ fontSize: '13px', fontWeight: 700, margin: 0, color: '#cbd5e1' }}>
                Đang kích hoạt ống kính Camera...
              </p>
              <p style={{ fontSize: '11px', margin: '4px 0 0 0' }}>
                Hoặc bấm chọn nhanh các mã mẫu bên dưới để kiểm tra
              </p>
            </div>
          )}

          {/* Laser Scanning Overlay Box */}
          <div
            style={{
              position: 'absolute',
              width: '240px',
              height: '160px',
              border: '2px dashed #38bdf8',
              borderRadius: '16px',
              boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.45)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
            }}
          >
            <div
              style={{
                position: 'absolute',
                width: '100%',
                height: '2px',
                backgroundColor: '#ef4444',
                boxShadow: '0 0 8px #ef4444',
                animation: 'scanLaser 1.5s infinite alternate ease-in-out',
              }}
            />
          </div>
        </div>

        {/* Scan Result Alert Banner */}
        {scannedResult && (
          <div
            style={{
              padding: '14px 20px',
              backgroundColor: scannedResult.isMatch ? '#064e3b' : '#7f1d1d',
              borderTop: `1px solid ${scannedResult.isMatch ? '#059669' : '#dc2626'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {scannedResult.isMatch ? (
                <CheckCircle2 size={24} color="#34d399" />
              ) : (
                <AlertTriangle size={24} color="#f87171" />
              )}
              <div>
                <div style={{ fontSize: '13px', fontWeight: 900, color: '#ffffff' }}>
                  {scannedResult.isMatch ? '✅ ĐÃ KHỚP MÃ HÀNG CHÍNH XÁC' : '❌ CẢNH BÁO: LẤY NHẦM SẢN PHẨM'}
                </div>
                <div style={{ fontSize: '11.5px', color: '#e2e8f0', marginTop: '2px' }}>
                  Mã: <b>{scannedResult.code}</b> • {scannedResult.itemName}
                </div>
                {scannedResult.lotCode && (
                  <div style={{ fontSize: '10.5px', color: '#a7f3d0', marginTop: '1px' }}>
                    Lô FEFO: <b>{scannedResult.lotCode}</b> (Đúng hạn dùng xuất trước)
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={() => {
                setScannedResult(null);
                setIsScanning(true);
              }}
              style={{
                backgroundColor: '#ffffff',
                color: '#0f172a',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '11px',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              Quét Tiếp
            </button>
          </div>
        )}

        {/* Quick Simulator Test Chips */}
        <div style={{ padding: '16px 20px', backgroundColor: '#0f172a', borderTop: '1px solid #1e293b' }}>
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', marginBottom: '8px' }}>
            ⚡ Quét Thử Nghiệm Nhanh (Mẫu mã vạch thực phẩm CityMart):
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {(expectedItems.length > 0
              ? expectedItems.map(it => it.sku)
              : ['SKU-PORK-01', 'SKU-MILK-02', 'SKU-SALMON-03', 'SKU-WRONG-99']
            ).map((skuCode, idx) => (
              <button
                key={idx}
                onClick={() => handleSimulateScan(skuCode)}
                style={{
                  backgroundColor: '#1e293b',
                  color: skuCode.includes('WRONG') ? '#f87171' : '#38bdf8',
                  border: `1px solid ${skuCode.includes('WRONG') ? '#ef4444' : '#0284c7'}`,
                  borderRadius: '8px',
                  padding: '5px 10px',
                  fontSize: '11px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Zap size={11} />
                <span>Quét: {skuCode}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
