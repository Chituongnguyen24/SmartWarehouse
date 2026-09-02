import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  ScanBarcode,
  Camera,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Volume2,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  expectedSku?: string;
  expectedName?: string;
  onScanResult: (code: string, isSuccess: boolean) => void;
  mockCodes?: string[];
}

export const CameraScannerModal: React.FC<Props> = ({
  isOpen,
  onClose,
  title = 'Quét Mã Vạch Hàng Hóa',
  expectedSku,
  expectedName,
  onScanResult,
  mockCodes = ['8934567890123', 'LOT-20260831-A', 'SKU-PORK-01', 'SKU-MILK-02'],
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [feedback, setFeedback] = useState<{ isMatch: boolean; message: string; code: string } | null>(null);

  const playBeep = (isSuccess: boolean) => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = isSuccess ? 'sine' : 'sawtooth';
      osc.frequency.value = isSuccess ? 920 : 250;
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      osc.start();
      osc.stop(audioCtx.currentTime + (isSuccess ? 0.15 : 0.3));

      // Haptic Vibration if supported on mobile
      if (navigator.vibrate) {
        navigator.vibrate(isSuccess ? [50, 50, 50] : [200, 100, 200]);
      }
    } catch (e) {}
  };

  useEffect(() => {
    if (!isOpen) {
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
        setStream(null);
      }
      setFeedback(null);
      return;
    }

    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: 'environment' } })
      .then(s => {
        setStream(s);
        setHasPermission(true);
        if (videoRef.current) {
          videoRef.current.srcObject = s;
        }
      })
      .catch(() => {
        setHasPermission(false);
      });

    return () => {
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
    };
  }, [isOpen]);

  const handleScanCode = (scannedCode: string) => {
    const isMatch = !expectedSku || scannedCode.toLowerCase().includes(expectedSku.toLowerCase()) || expectedSku.toLowerCase().includes(scannedCode.toLowerCase());
    playBeep(isMatch);

    setFeedback({
      isMatch,
      code: scannedCode,
      message: isMatch
        ? `Đã khớp sản phẩm: ${expectedName || scannedCode}`
        : `Cảnh báo: Mã quét (${scannedCode}) không khớp với mặt hàng yêu cầu!`,
    });

    onScanResult(scannedCode, isMatch);

    if (isMatch) {
      setTimeout(() => {
        onClose();
      }, 900);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: '#020617',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '16px 20px',
          backgroundColor: '#0f172a',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #1e293b',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <ScanBarcode size={22} color="#38bdf8" />
          <div>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#ffffff' }}>{title}</h3>
            {expectedName && (
              <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#94a3b8' }}>
                Đang tìm: <b style={{ color: '#38bdf8' }}>{expectedName}</b>
              </p>
            )}
          </div>
        </div>

        <button
          onClick={onClose}
          style={{
            backgroundColor: '#1e293b',
            color: '#94a3b8',
            border: 'none',
            padding: '8px',
            borderRadius: '10px',
            cursor: 'pointer',
          }}
        >
          <X size={20} />
        </button>
      </div>

      {/* Camera Viewfinder */}
      <div
        style={{
          flex: 1,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          backgroundColor: '#000000',
        }}
      >
        {hasPermission ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
            <Camera size={44} style={{ margin: '0 auto 10px' }} />
            <p style={{ fontSize: '13px', fontWeight: 700, color: '#cbd5e1' }}>Đang mở ống kính Camera PDA...</p>
            <p style={{ fontSize: '11px' }}>Hoặc chạm các mã mẫu bên dưới để kiểm tra</p>
          </div>
        )}

        {/* Viewfinder Target Reticle */}
        <div
          style={{
            position: 'absolute',
            width: '260px',
            height: '180px',
            border: '2px dashed #38bdf8',
            borderRadius: '20px',
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.55)',
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              position: 'absolute',
              width: '90%',
              height: '2px',
              backgroundColor: '#ef4444',
              boxShadow: '0 0 10px #ef4444',
              animation: 'laserScan 1.6s infinite alternate ease-in-out',
            }}
          />
        </div>
      </div>

      {/* Instant Feedback Alert */}
      {feedback && (
        <div
          style={{
            padding: '16px 20px',
            backgroundColor: feedback.isMatch ? '#064e3b' : '#7f1d1d',
            borderTop: `2px solid ${feedback.isMatch ? '#10b981' : '#ef4444'}`,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          {feedback.isMatch ? (
            <CheckCircle2 size={26} color="#34d399" />
          ) : (
            <AlertTriangle size={26} color="#f87171" />
          )}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '13px', fontWeight: 900, color: '#ffffff' }}>
              {feedback.isMatch ? '✅ ĐÃ KHỚP MÃ THÀNH CÔNG' : '❌ SAI MÃ SẢN PHẨM'}
            </div>
            <div style={{ fontSize: '11.5px', color: '#e2e8f0', marginTop: '2px' }}>
              {feedback.message}
            </div>
          </div>
        </div>
      )}

      {/* Touch Barcode Simulators */}
      <div
        style={{
          padding: '16px 20px',
          backgroundColor: '#0f172a',
          borderTop: '1px solid #1e293b',
        }}
      >
        <div style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', marginBottom: '8px' }}>
          ⚡ Chạm Nhanh Mã Vạch Soạn Hàng:
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {[expectedSku || 'SKU-PORK-01', ...mockCodes.filter(c => c !== expectedSku)].map((code, idx) => (
            <button
              key={idx}
              onClick={() => handleScanCode(code)}
              style={{
                backgroundColor: code === expectedSku ? '#0369a1' : '#1e293b',
                color: '#ffffff',
                border: `1px solid ${code === expectedSku ? '#38bdf8' : '#334155'}`,
                borderRadius: '10px',
                padding: '8px 12px',
                fontSize: '11.5px',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Zap size={12} color="#38bdf8" />
              <span>{code}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
