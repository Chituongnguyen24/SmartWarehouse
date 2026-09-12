import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  ScanBarcode,
  Camera,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Plus,
  Minus,
  Check,
  Search,
  Truck,
  PackageCheck,
  Compass,
  FileText,
  MapPin,
  Snowflake,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';

export type ScannerType = 'PICKING' | 'LOOKUP' | 'INBOUND' | 'PACKING';

export interface ScannerMockCode {
  label: string;
  code: string;
  type?: 'LOT' | 'ITEM' | 'DOC' | 'ORDER';
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  scannerType?: ScannerType;
  title?: string;
  expectedSku?: string;
  expectedName?: string;
  expectedLotCode?: string;
  expectedBarcode?: string;
  expectedShelfLocation?: string;
  expectedQty?: number;
  currentPickedQty?: number;
  unit?: string;
  onScanResult: (code: string, isSuccess: boolean, mode: 'LOT' | 'ITEM', pickedQty?: number) => void;
  mockCodes?: ScannerMockCode[];
  extraInfo?: {
    supplierName?: string;
    orderCode?: string;
    temperatureCondition?: string;
    destination?: string;
    totalItems?: number;
  };
}

export const CameraScannerModal: React.FC<Props> = ({
  isOpen,
  onClose,
  scannerType = 'PICKING',
  title,
  expectedSku,
  expectedName,
  expectedLotCode,
  expectedBarcode,
  expectedShelfLocation,
  expectedQty = 1,
  currentPickedQty = 0,
  unit = 'Sản phẩm',
  onScanResult,
  mockCodes = [],
  extraInfo,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [torchOn, setTorchOn] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ isMatch: boolean; message: string; code: string; type: 'LOT' | 'ITEM' | 'DOC' | 'ORDER' } | null>(null);
  const [manualCode, setManualCode] = useState<string>('');
  const [isScanningActive, setIsScanningActive] = useState<boolean>(true);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState<boolean>(false);

  // Scan Mode for PICKING: 'LOT' = Quét toàn bộ lô/thùng; 'ITEM' = Quét từng sản phẩm
  const [scanMode, setScanMode] = useState<'LOT' | 'ITEM'>('ITEM');
  const [pickedCount, setPickedCount] = useState<number>(currentPickedQty);

  // Default dynamic titles based on scannerType
  const resolvedTitle = title || (
    scannerType === 'LOOKUP'
      ? 'Tra Cứu Tồn Kho & Kệ Hàng'
      : scannerType === 'INBOUND'
      ? 'Quét Phiếu Giao Hàng & Xe Nhập Kho'
      : scannerType === 'PACKING'
      ? 'Quét Mã Đơn Hàng & Thùng Đóng Gói'
      : 'Quét Xác Thực Hàng Soạn Đơn'
  );

  // Sync count when opened
  useEffect(() => {
    if (isOpen) {
      setPickedCount(currentPickedQty || 0);
      setFeedback(null);
      setIsScanningActive(true);
      if (expectedQty > 20) {
        setScanMode('LOT');
      } else {
        setScanMode('ITEM');
      }
    }
  }, [isOpen, currentPickedQty, expectedQty]);

  // Play Beep Sound (Web Audio API)
  const playBeep = (isSuccess: boolean) => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = isSuccess ? 'sine' : 'sawtooth';
      osc.frequency.value = isSuccess ? 950 : 220;
      gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
      osc.start();
      osc.stop(audioCtx.currentTime + (isSuccess ? 0.18 : 0.35));

      // Haptic Vibration if supported on mobile
      if (navigator.vibrate) {
        navigator.vibrate(isSuccess ? [60, 40, 60] : [200, 100, 200]);
      }
    } catch (e) {
      console.warn('Audio/Haptic not supported in this context', e);
    }
  };

  // Toggle Camera Flashlight
  const toggleTorch = async () => {
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    if (!track) return;

    try {
      const capabilities: any = track.getCapabilities ? track.getCapabilities() : {};
      if (capabilities.torch) {
        await (track as any).applyConstraints({
          advanced: [{ torch: !torchOn }],
        });
        setTorchOn(!torchOn);
      } else {
        alert('Thiết bị này không hỗ trợ điều khiển đèn Flash từ trình duyệt.');
      }
    } catch (err) {
      console.warn('Torch toggle error:', err);
    }
  };

  // Start Live Camera Video Stream
  useEffect(() => {
    if (!isOpen) {
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
        setStream(null);
      }
      setFeedback(null);
      setTorchOn(false);
      return;
    }

    setIsScanningActive(true);

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({
          video: {
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        })
        .then(s => {
          setStream(s);
          setHasPermission(true);
          if (videoRef.current) {
            videoRef.current.srcObject = s;
          }
        })
        .catch(err => {
          console.warn('Live WebRTC camera stream blocked (HTTP/iOS):', err);
          setHasPermission(false);
        });
    } else {
      setHasPermission(false);
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
    };
  }, [isOpen]);

  // Real-time Barcode Detection Loop
  useEffect(() => {
    if (!isOpen || !stream || !isScanningActive) return;

    let intervalId: any;
    const detector = (window as any).BarcodeDetector
      ? new (window as any).BarcodeDetector({
          formats: ['qr_code', 'ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e'],
        })
      : null;

    if (detector) {
      intervalId = setInterval(async () => {
        if (!videoRef.current || videoRef.current.readyState < 2) return;
        try {
          const barcodes = await detector.detect(videoRef.current);
          if (barcodes && barcodes.length > 0) {
            const rawValue = barcodes[0].rawValue;
            if (rawValue) {
              handleScanCode(rawValue);
            }
          }
        } catch (e) {
          // Frame detection pass
        }
      }, 400);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isOpen, stream, isScanningActive, pickedCount, scanMode, scannerType]);

  // Handle Photo Capture from Native Phone Camera
  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingPhoto(true);
    setFeedback(null);

    try {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      await new Promise(resolve => {
        img.onload = resolve;
      });

      // 1. Try native BarcodeDetector API if available
      if ((window as any).BarcodeDetector) {
        try {
          const detector = new (window as any).BarcodeDetector({
            formats: ['qr_code', 'ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e'],
          });
          const barcodes = await detector.detect(img);
          if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
            handleScanCode(barcodes[0].rawValue);
            setIsProcessingPhoto(false);
            return;
          }
        } catch (e) {
          console.warn('BarcodeDetector pass error, trying ZXing:', e);
        }
      }

      // 2. Try ZXing Multi-Format Reader
      if ((window as any).ZXing) {
        try {
          const reader = new (window as any).ZXing.BrowserMultiFormatReader();
          const result = await reader.decodeFromImageElement(img);
          if (result && result.getText && result.getText()) {
            handleScanCode(result.getText());
            setIsProcessingPhoto(false);
            return;
          }
        } catch (zxingErr) {
          // ZXing pass
        }
      }

      // 3. Try jsQR
      if ((window as any).jsQR) {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || img.width || 600;
          canvas.height = img.naturalHeight || img.height || 600;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const qrCode = (window as any).jsQR(imgData.data, imgData.width, imgData.height);
            if (qrCode && qrCode.data) {
              handleScanCode(qrCode.data);
              setIsProcessingPhoto(false);
              return;
            }
          }
        } catch (jsqrErr) {
          // jsQR pass
        }
      }

      // If no barcode was decoded from the image
      playBeep(false);
      setFeedback({
        isMatch: false,
        code: 'NO_CODE_DETECTED',
        type: 'ITEM',
        message: '⚠️ Không nhận diện được mã Barcode/QR trong ảnh chụp! Vui lòng chụp rõ nét hoặc chọn mã mẫu bên dưới.',
      });
    } catch (err) {
      console.warn('Photo barcode detection error:', err);
      playBeep(false);
      setFeedback({
        isMatch: false,
        code: 'SCAN_ERROR',
        type: 'ITEM',
        message: '⚠️ Lỗi xử lý ảnh chụp mã vạch! Hãy thử lại.',
      });
    } finally {
      setIsProcessingPhoto(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Process code scanning with polymorphic logic
  const handleScanCode = (scannedCode: string) => {
    if (!scannedCode || !scannedCode.trim()) return;
    const cleanScanned = scannedCode.trim();

    if (scannerType === 'LOOKUP') {
      playBeep(true);
      setIsScanningActive(false);
      setFeedback({
        isMatch: true,
        code: cleanScanned,
        type: 'ITEM',
        message: `🔍 Đã tìm thấy thông tin tồn kho cho mã: "${cleanScanned}"!`,
      });
      onScanResult(cleanScanned, true, 'ITEM', 1);
      setTimeout(() => {
        onClose();
      }, 1000);
      return;
    }

    if (scannerType === 'INBOUND') {
      playBeep(true);
      setIsScanningActive(false);
      setFeedback({
        isMatch: true,
        code: cleanScanned,
        type: 'DOC',
        message: `🚚 Đã quét mã phiếu giao hàng: "${cleanScanned}"! Đang tải biên bản QC...`,
      });
      onScanResult(cleanScanned, true, 'LOT', 1);
      setTimeout(() => {
        onClose();
      }, 1100);
      return;
    }

    if (scannerType === 'PACKING') {
      playBeep(true);
      setIsScanningActive(false);
      setFeedback({
        isMatch: true,
        code: cleanScanned,
        type: 'ORDER',
        message: `📦 Đã xác thực kiện hàng: "${cleanScanned}"!`,
      });
      onScanResult(cleanScanned, true, 'LOT', 1);
      setTimeout(() => {
        onClose();
      }, 1000);
      return;
    }

    // Default: PICKING mode
    const isLotMatch = Boolean(expectedLotCode && (
      cleanScanned.toLowerCase() === expectedLotCode.toLowerCase() ||
      cleanScanned.toLowerCase().includes(expectedLotCode.toLowerCase()) ||
      expectedLotCode.toLowerCase().includes(cleanScanned.toLowerCase())
    ));

    const isSkuMatch = Boolean(expectedSku && (
      cleanScanned.toLowerCase() === expectedSku.toLowerCase() ||
      cleanScanned.toLowerCase().includes(expectedSku.toLowerCase()) ||
      expectedSku.toLowerCase().includes(cleanScanned.toLowerCase())
    ));

    const isBarcodeMatch = Boolean(expectedBarcode && cleanScanned === expectedBarcode);
    const isMatch = Boolean(!expectedSku && !expectedLotCode && !expectedBarcode) || Boolean(isLotMatch || isSkuMatch || isBarcodeMatch);

    playBeep(isMatch);
    setIsScanningActive(false);

    if (isMatch) {
      const isFullLotAction = isLotMatch || scanMode === 'LOT' || cleanScanned.toUpperCase().startsWith('LOT-') || cleanScanned.toUpperCase().startsWith('BOX-');

      if (isFullLotAction) {
        setPickedCount(expectedQty);
        setFeedback({
          isMatch: true,
          code: cleanScanned,
          type: 'LOT',
          message: `📦 Đã quét đúng MÃ LÔ / THÙNG: Lấy trọn ${expectedQty} ${unit}!`,
        });
        onScanResult(cleanScanned, true, 'LOT', expectedQty);
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        const newCount = Math.min(expectedQty, pickedCount + 1);
        setPickedCount(newCount);
        const isFullyPicked = newCount >= expectedQty;
        setFeedback({
          isMatch: true,
          code: cleanScanned,
          type: 'ITEM',
          message: isFullyPicked
            ? `🎉 Đã quét đủ ${expectedQty}/${expectedQty} ${unit}!`
            : `🏷️ Đã quét +1 sản phẩm (${newCount}/${expectedQty} ${unit})`,
        });
        onScanResult(cleanScanned, true, 'ITEM', newCount);
        if (isFullyPicked) {
          setTimeout(() => {
            onClose();
          }, 1000);
        } else {
          setTimeout(() => {
            setIsScanningActive(true);
          }, 800);
        }
      }
    } else {
      setFeedback({
        isMatch: false,
        code: cleanScanned,
        type: 'ITEM',
        message: `⚠️ Cảnh báo: Mã quét (${cleanScanned}) KHÔNG khớp với sản phẩm cần lấy (Kỳ vọng: ${expectedSku || expectedLotCode})!`,
      });
      setTimeout(() => {
        setIsScanningActive(true);
      }, 2500);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      handleScanCode(manualCode.trim());
      setManualCode('');
    }
  };

  const handleConfirmCount = () => {
    const finalQty = pickedCount > 0 ? pickedCount : expectedQty;
    playBeep(true);
    onScanResult(expectedLotCode || expectedSku || 'MANUAL', true, finalQty >= expectedQty ? 'LOT' : 'ITEM', finalQty);
    onClose();
  };

  const handleTakeAll = () => {
    setPickedCount(expectedQty);
    playBeep(true);
    onScanResult(expectedLotCode || expectedSku || 'TAKE_ALL', true, 'LOT', expectedQty);
    setFeedback({
      isMatch: true,
      code: expectedLotCode || 'LOT_ALL',
      type: 'LOT',
      message: `📦 Đã lấy toàn bộ ${expectedQty} ${unit}!`,
    });
    setTimeout(() => {
      onClose();
    }, 600);
  };

  if (!isOpen) return null;

  // Polymorphic Fallback Mock Presets
  const getPresets = (): ScannerMockCode[] => {
    if (mockCodes && mockCodes.length > 0) return mockCodes;

    if (scannerType === 'LOOKUP') {
      return [
        { label: '🏷️ SKU Sữa Tươi: EM-20757', code: 'EM-20757', type: 'ITEM' },
        { label: '📦 Lô Kho Lạnh: LOT-20260905-01', code: 'LOT-20260905-01', type: 'LOT' },
        { label: '📍 Vị Trí: Kệ B2-01', code: 'Kệ B2-01', type: 'ITEM' },
        { label: '📊 Barcode: 8934567890001', code: '8934567890001', type: 'ITEM' },
      ];
    }

    if (scannerType === 'INBOUND') {
      return [
        { label: '🚚 Phiếu Nhập Emart: NK-20260905-1', code: 'NK-20260905-1', type: 'DOC' },
        { label: '📋 Phiếu Giao Vinamilk: NK-20260905-2', code: 'NK-20260905-2', type: 'DOC' },
        { label: '🔒 Seal Xe Lạnh: SEAL-EM-8821', code: 'SEAL-EM-8821', type: 'DOC' },
      ];
    }

    if (scannerType === 'PACKING') {
      return [
        { label: '📦 Đơn Xuất: XK-20260905-1', code: 'XK-20260905-1', type: 'ORDER' },
        { label: '🏷️ Tem Vận Đơn: CM-SHIP-9942', code: 'CM-SHIP-9942', type: 'ORDER' },
      ];
    }

    // PICKING presets
    return [
      { label: `📦 Mã Lô: ${expectedLotCode || 'LOT-EM-01'}`, code: expectedLotCode || 'LOT-EM-20757-WH-006-738A3D', type: 'LOT' },
      { label: `🏷️ Mã SKU: ${expectedSku || 'EM-20757'}`, code: expectedSku || 'EM-20757', type: 'ITEM' },
      { label: `📊 Barcode: ${expectedBarcode || '8934567890001'}`, code: expectedBarcode || '8934567890001', type: 'ITEM' },
    ];
  };

  const currentPresets = getPresets();
  const progressPercent = Math.min(100, Math.round((pickedCount / Math.max(1, expectedQty)) * 100));

  // Dynamic Theme Colors based on Scanner Type
  const theme = {
    headerGradient:
      scannerType === 'LOOKUP'
        ? 'linear-gradient(135deg, #4f46e5 0%, #0284c7 100%)'
        : scannerType === 'INBOUND'
        ? 'linear-gradient(135deg, #059669 0%, #0d9488 100%)'
        : scannerType === 'PACKING'
        ? 'linear-gradient(135deg, #9333ea 0%, #7c3aed 100%)'
        : 'linear-gradient(135deg, #008848 0%, #0284c7 100%)',
    icon:
      scannerType === 'LOOKUP' ? (
        <Search size={22} color="#ffffff" />
      ) : scannerType === 'INBOUND' ? (
        <Truck size={22} color="#ffffff" />
      ) : scannerType === 'PACKING' ? (
        <PackageCheck size={22} color="#ffffff" />
      ) : (
        <Compass size={22} color="#ffffff" />
      ),
    badgeColor:
      scannerType === 'LOOKUP'
        ? '#4f46e5'
        : scannerType === 'INBOUND'
        ? '#059669'
        : scannerType === 'PACKING'
        ? '#9333ea'
        : '#0284c7',
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: '#f8fafc',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* 1. TOP HEADER (Customized per Type) */}
      <div
        style={{
          padding: '14px 18px',
          backgroundColor: '#ffffff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #e2e8f0',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: theme.headerGradient,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            }}
          >
            {theme.icon}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 900, color: '#0f172a' }}>
                {resolvedTitle}
              </h3>
              <span
                style={{
                  fontSize: '9.5px',
                  backgroundColor: '#f1f5f9',
                  color: theme.badgeColor,
                  fontWeight: 900,
                  padding: '2px 6px',
                  borderRadius: '6px',
                  border: '1px solid #e2e8f0',
                }}
              >
                {scannerType}
              </span>
            </div>
            {expectedName && (
              <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                Món: <b style={{ color: theme.badgeColor }}>{expectedName}</b>
              </p>
            )}
            {extraInfo?.supplierName && (
              <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                Nhà cung cấp: <b style={{ color: '#059669' }}>{extraInfo.supplierName}</b>
              </p>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {hasPermission && (
            <button
              onClick={toggleTorch}
              style={{
                backgroundColor: torchOn ? '#fef3c7' : '#f1f5f9',
                color: torchOn ? '#b45309' : '#334155',
                border: `1px solid ${torchOn ? '#fcd34d' : '#e2e8f0'}`,
                padding: '8px 12px',
                borderRadius: '10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '11.5px',
                fontWeight: 800,
              }}
            >
              <Zap size={14} /> Flash
            </button>
          )}

          <button
            onClick={onClose}
            style={{
              backgroundColor: '#f1f5f9',
              color: '#64748b',
              border: '1px solid #e2e8f0',
              padding: '8px',
              borderRadius: '10px',
              cursor: 'pointer',
            }}
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* 2. CONTEXTUAL WORKFLOW BAR */}
      {/* 2A: PICKING SPECIFIC CONTROLS */}
      {scannerType === 'PICKING' && (
        <>
          {/* Target Shelf & Product Quick Hint */}
          <div
            style={{
              backgroundColor: '#eff6ff',
              padding: '8px 16px',
              borderBottom: '1px solid #bfdbfe',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#0369a1', fontWeight: 800 }}>
              <MapPin size={14} color="#0284c7" />
              <span>{expectedShelfLocation || 'Kệ Lấy Hàng'}</span>
            </div>
            <div style={{ color: '#64748b', fontSize: '11px' }}>
              SKU: <b style={{ color: '#0f172a' }}>{expectedSku || 'EM-01'}</b> • Lô: <b style={{ color: '#d97706' }}>{expectedLotCode || 'LOT-01'}</b>
            </div>
          </div>

          {/* Mode Switcher */}
          <div
            style={{
              backgroundColor: '#f8fafc',
              padding: '8px 16px',
              display: 'flex',
              gap: '8px',
              borderBottom: '1px solid #e2e8f0',
            }}
          >
            <button
              type="button"
              onClick={() => setScanMode('ITEM')}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '10px',
                border: `1.5px solid ${scanMode === 'ITEM' ? '#0284c7' : '#e2e8f0'}`,
                fontSize: '12px',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                backgroundColor: scanMode === 'ITEM' ? '#0284c7' : '#ffffff',
                color: scanMode === 'ITEM' ? '#ffffff' : '#475569',
                boxShadow: scanMode === 'ITEM' ? '0 2px 8px rgba(2, 132, 199, 0.25)' : 'none',
              }}
            >
              🏷️ Quét Từng Món (+1)
            </button>

            <button
              type="button"
              onClick={() => setScanMode('LOT')}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '10px',
                border: `1.5px solid ${scanMode === 'LOT' ? '#9333ea' : '#e2e8f0'}`,
                fontSize: '12px',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                backgroundColor: scanMode === 'LOT' ? '#9333ea' : '#ffffff',
                color: scanMode === 'LOT' ? '#ffffff' : '#475569',
                boxShadow: scanMode === 'LOT' ? '0 2px 8px rgba(147, 51, 234, 0.25)' : 'none',
              }}
            >
              📦 Quét Trọn Lô/Thùng
            </button>
          </div>

          {/* Stepper and Progress Bar */}
          <div
            style={{
              backgroundColor: '#ffffff',
              padding: '10px 18px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '12.5px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>Đã gom:</span>
                <b style={{ fontSize: '15px', color: pickedCount >= expectedQty ? '#059669' : '#0284c7' }}>
                  {pickedCount} / {expectedQty} {unit}
                </b>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  onClick={() => setPickedCount(Math.max(0, pickedCount - 1))}
                  style={{
                    backgroundColor: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    color: '#334155',
                    width: '28px',
                    height: '28px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontWeight: 900,
                  }}
                >
                  <Minus size={14} />
                </button>
                <button
                  onClick={() => setPickedCount(Math.min(expectedQty, pickedCount + 1))}
                  style={{
                    backgroundColor: '#0284c7',
                    border: 'none',
                    color: '#ffffff',
                    width: '28px',
                    height: '28px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontWeight: 900,
                  }}
                >
                  <Plus size={14} />
                </button>
                <button
                  onClick={handleTakeAll}
                  style={{
                    backgroundColor: '#059669',
                    color: '#ffffff',
                    border: 'none',
                    padding: '4px 8px',
                    borderRadius: '8px',
                    fontSize: '11px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Check size={12} /> Lấy Hết
                </button>
              </div>
            </div>

            <div style={{ height: '6px', backgroundColor: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${progressPercent}%`,
                  backgroundColor: pickedCount >= expectedQty ? '#059669' : '#0284c7',
                  transition: 'width 0.3s ease',
                  borderRadius: '999px',
                }}
              />
            </div>
          </div>
        </>
      )}

      {/* 2B: LOOKUP SPECIFIC BANNER */}
      {scannerType === 'LOOKUP' && (
        <div
          style={{
            backgroundColor: '#eef2ff',
            padding: '10px 16px',
            borderBottom: '1px solid #c7d2fe',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12px',
            color: '#3730a3',
            fontWeight: 700,
          }}
        >
          <Search size={16} color="#4f46e5" />
          <span>Hướng camera vào Mã Barcode (EAN-13), Mã SKU, Mã Lô (LOT) hoặc Mã Vị Trí Kệ.</span>
        </div>
      )}

      {/* 2C: INBOUND SPECIFIC BANNER */}
      {scannerType === 'INBOUND' && (
        <div
          style={{
            backgroundColor: '#ecfdf5',
            padding: '10px 16px',
            borderBottom: '1px solid #a7f3d0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#065f46', fontWeight: 800 }}>
            <FileText size={16} color="#059669" />
            <span>Quét Mã Phiếu Nhập Kho (NK-xxx) hoặc Seal Thùng Xe Tải</span>
          </div>
          <span style={{ fontSize: '10.5px', backgroundColor: '#dcfce7', color: '#059669', padding: '2px 8px', borderRadius: '6px', fontWeight: 800, border: '1px solid #86efac' }}>
            QC Kiểm Định
          </span>
        </div>
      )}

      {/* 2D: PACKING SPECIFIC BANNER */}
      {scannerType === 'PACKING' && (
        <div
          style={{
            backgroundColor: '#f3e8ff',
            padding: '10px 16px',
            borderBottom: '1px solid #d8b4fe',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6b21a8', fontWeight: 800 }}>
            <PackageCheck size={16} color="#9333ea" />
            <span>Quét Mã Đơn Xuất Hàng (XK-xxx) hoặc Mã Tem Thùng Carton</span>
          </div>
          <span style={{ fontSize: '10.5px', backgroundColor: '#faf5ff', color: '#9333ea', padding: '2px 8px', borderRadius: '6px', fontWeight: 800, border: '1px solid #d8b4fe' }}>
            Niêm Phong & Dán Tem
          </span>
        </div>
      )}

      {/* 3. CAMERA VIEWFINDER AREA (Reticle styled per Type) */}
      <div
        style={{
          flex: 1,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0f172a',
          overflow: 'hidden',
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handlePhotoCapture}
          style={{ display: 'none' }}
        />

        {hasPermission ? (
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
          /* Native Phone Camera Launcher Card */
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '24px',
              textAlign: 'center',
              maxWidth: '340px',
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
            }}
          >
            <div
              style={{
                width: '68px',
                height: '68px',
                borderRadius: '18px',
                backgroundColor: '#f1f5f9',
                border: `2px dashed ${theme.badgeColor}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '14px',
              }}
            >
              <Camera size={34} color={theme.badgeColor} />
            </div>

            <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 900, color: '#0f172a' }}>
              {resolvedTitle}
            </h4>
            <p style={{ margin: '6px 0 18px 0', fontSize: '12px', color: '#64748b', lineHeight: 1.5 }}>
              {scannerType === 'LOOKUP'
                ? 'Chụp ảnh nhãn sản phẩm hoặc tem kệ để tra cứu thông tin chi tiết.'
                : scannerType === 'INBOUND'
                ? 'Chụp ảnh phiếu giao hàng của nhà cung cấp để mở biên bản kiểm định QC.'
                : scannerType === 'PACKING'
                ? 'Chụp ảnh mã kiện hàng để hoàn tất đóng gói và in tem vận chuyển.'
                : `Chụp ảnh mã Lô (${expectedLotCode || 'LOT-xxx'}) hoặc SKU (${expectedSku || 'EM-xxx'}) để xác nhận.`}
            </p>

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessingPhoto}
              style={{
                background: theme.headerGradient,
                color: '#ffffff',
                border: 'none',
                padding: '13px 22px',
                borderRadius: '12px',
                fontWeight: 900,
                fontSize: '13.5px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.2)',
              }}
            >
              <Camera size={18} /> {isProcessingPhoto ? 'Đang Nhận Diện...' : 'Mở Camera Điện Thoại'}
            </button>
          </div>
        )}

        {/* Viewfinder Target Reticles Customized Per Type */}
        {hasPermission && (
          <div
            style={{
              position: 'absolute',
              width: scannerType === 'INBOUND' ? '300px' : '260px',
              height: scannerType === 'INBOUND' ? '180px' : '260px',
              border: `2px solid ${theme.badgeColor}`,
              borderRadius: scannerType === 'INBOUND' ? '16px' : '24px',
              boxShadow: '0 0 0 4000px rgba(0, 0, 0, 0.55)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              padding: '12px',
              pointerEvents: 'none',
            }}
          >
            <div
              style={{
                width: '100%',
                height: '2px',
                backgroundColor: theme.badgeColor,
                boxShadow: `0 0 12px ${theme.badgeColor}, 0 0 24px ${theme.badgeColor}`,
                animation: 'laserScan 1.8s infinite alternate ease-in-out',
              }}
            />
            <div style={{ textAlign: 'center', fontSize: '11px', color: '#cbd5e1', fontWeight: 700 }}>
              {scannerType === 'LOOKUP'
                ? '🔍 Căn Mã Vạch hoặc Mã Kệ vào khung'
                : scannerType === 'INBOUND'
                ? '📄 Căn Phiếu Giao Hàng vào khung quét'
                : scannerType === 'PACKING'
                ? '📦 Căn Mã Kiện Hàng vào khung'
                : scanMode === 'LOT'
                ? '📦 Căn Mã Lô Hàng vào khung'
                : '🏷️ Căn Mã Vạch Sản Phẩm vào khung'}
            </div>
          </div>
        )}

        {/* Scan Result Feedback Banner */}
        {feedback && (
          <div
            style={{
              position: 'absolute',
              bottom: '20px',
              left: '16px',
              right: '16px',
              backgroundColor: feedback.isMatch ? '#ecfdf5' : '#fee2e2',
              border: `2px solid ${feedback.isMatch ? '#059669' : '#dc2626'}`,
              borderRadius: '16px',
              padding: '14px 18px',
              color: feedback.isMatch ? '#065f46' : '#991b1b',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
              animation: 'slideUp 0.3s ease-out',
            }}
          >
            {feedback.isMatch ? <CheckCircle2 size={28} color="#059669" /> : <AlertTriangle size={28} color="#dc2626" />}
            <div>
              <div style={{ fontSize: '13px', fontWeight: 900 }}>{feedback.message}</div>
              <div style={{ fontSize: '11px', opacity: 0.85, marginTop: '2px' }}>Mã đã quét: {feedback.code}</div>
            </div>
          </div>
        )}
      </div>

      {/* 4. BOTTOM ACTION DRAWER */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderTop: '1px solid #e2e8f0',
          padding: '14px 18px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          boxShadow: '0 -4px 16px rgba(0,0,0,0.03)',
        }}
      >
        {/* Toggle Manual Input Bar */}
        <form onSubmit={handleManualSubmit} style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            placeholder={
              scannerType === 'LOOKUP'
                ? 'Nhập mã SKU, Barcode hoặc vị trí kệ...'
                : scannerType === 'INBOUND'
                ? 'Nhập mã phiếu nhập (NK-xxx)...'
                : scannerType === 'PACKING'
                ? 'Nhập mã đơn hàng (XK-xxx)...'
                : scanMode === 'LOT'
                ? 'Nhập mã Lô (LOT-xxx)...'
                : 'Nhập mã Barcode SKU...'
            }
            value={manualCode}
            onChange={e => setManualCode(e.target.value)}
            style={{
              flex: 1,
              backgroundColor: '#f8fafc',
              border: '1.5px solid #cbd5e1',
              borderRadius: '10px',
              padding: '10px 14px',
              color: '#0f172a',
              fontSize: '13px',
              fontWeight: 700,
            }}
          />
          <button
            type="submit"
            style={{
              backgroundColor: theme.badgeColor,
              color: '#ffffff',
              border: 'none',
              padding: '0 16px',
              borderRadius: '10px',
              fontWeight: 800,
              fontSize: '12.5px',
              cursor: 'pointer',
            }}
          >
            Xác Nhận
          </button>
        </form>

        {/* Quick Simulator Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>
            Mã mẫu thử nghiệm nhanh:
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {currentPresets.map((m, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleScanCode(m.code)}
                style={{
                  backgroundColor: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  color: '#334155',
                  borderRadius: '8px',
                  padding: '5px 10px',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Action Button for PICKING */}
        {scannerType === 'PICKING' && (
          <button
            type="button"
            onClick={handleConfirmCount}
            style={{
              backgroundColor: pickedCount >= expectedQty ? '#059669' : '#0284c7',
              color: '#ffffff',
              border: 'none',
              padding: '13px 16px',
              borderRadius: '12px',
              fontWeight: 900,
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: pickedCount >= expectedQty ? '0 4px 16px rgba(5, 150, 105, 0.3)' : '0 4px 16px rgba(2, 132, 199, 0.3)',
            }}
          >
            <CheckCircle2 size={18} />
            <span>
              {pickedCount > 0
                ? `Lưu Số Lượng Đã Lấy (${pickedCount}/${expectedQty} ${unit}) & Đóng`
                : `Xác Nhận Đã Lấy Đủ (${expectedQty} ${unit}) & Đóng`}
            </span>
          </button>
        )}
      </div>
    </div>
  );
};
