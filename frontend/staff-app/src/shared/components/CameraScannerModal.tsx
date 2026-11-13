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
  FileText,
  MapPin,
  Package,
  Tag,
  Layers,
} from 'lucide-react';
import {
  BrowserMultiFormatReader,
  BarcodeFormat,
  DecodeHintType,
} from '@zxing/library';

export type ScannerType = 'PICKING' | 'LOOKUP' | 'INBOUND' | 'PACKING';

export interface ScannerMockCode {
  label: string;
  code: string;
  type?: 'LOT' | 'ITEM' | 'DOC' | 'ORDER';
}

const scanHints = new Map<DecodeHintType, any>();
scanHints.set(DecodeHintType.POSSIBLE_FORMATS, [
  BarcodeFormat.QR_CODE,
  BarcodeFormat.EAN_13,
  BarcodeFormat.CODE_128,
  BarcodeFormat.CODE_39,
]);
// Tắt TRY_HARDER để giải phóng CPU cho thiết bị di động cấu hình yếu
scanHints.set(DecodeHintType.TRY_HARDER, false);

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
  unit = 'Món',
  onScanResult,
  mockCodes = [],
  extraInfo,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastScanTimeRef = useRef<number>(0);
  const isScanningActiveRef = useRef<boolean>(true);

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [torchOn, setTorchOn] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{
    isMatch: boolean;
    badge: string;
    message: string;
    code: string;
    type: 'LOT' | 'ITEM' | 'DOC' | 'ORDER';
  } | null>(null);
  const [manualCode, setManualCode] = useState<string>('');
  const [isScanningActive, setIsScanningActive] = useState<boolean>(true);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState<boolean>(false);

  // Scan Mode for PICKING: 'AUTO' = Tự nhận diện thông minh; 'LOT' = Bắt buộc lấy trọn lô; 'ITEM' = Đếm từng món lẻ
  const [scanMode, setScanMode] = useState<'AUTO' | 'LOT' | 'ITEM'>('AUTO');
  const [pickedCount, setPickedCount] = useState<number>(currentPickedQty);

  // Stop camera tracks helper to immediately free CPU & Camera hardware
  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => {
        try {
          t.stop();
        } catch (e) {}
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (readerRef.current) {
      try {
        readerRef.current.reset();
      } catch (e) {}
      readerRef.current = null;
    }
  };

  // Default dynamic titles based on scannerType
  const resolvedTitle = title || (
    scannerType === 'LOOKUP'
      ? 'Tra Cứu Tồn Kho & Kệ Hàng'
      : scannerType === 'INBOUND'
      ? 'Quét Phiếu Giao & Tiếp Nhận'
      : scannerType === 'PACKING'
      ? 'Quét Đơn Hàng & Thùng Đóng Gói'
      : 'Quét Xác Thực Hàng Soạn Đơn'
  );

  // Sync count & listen for Android Back button when opened
  useEffect(() => {
    if (isOpen) {
      setPickedCount(currentPickedQty || 0);
      setFeedback(null);
      isScanningActiveRef.current = true;
      setIsScanningActive(true);
      setScanMode('AUTO');

      const handleHardwareBack = (e: any) => {
        stopCameraStream();
        onClose();
      };
      document.addEventListener('backbutton', handleHardwareBack);
      window.addEventListener('popstate', handleHardwareBack);

      return () => {
        document.removeEventListener('backbutton', handleHardwareBack);
        window.removeEventListener('popstate', handleHardwareBack);
      };
    } else {
      stopCameraStream();
    }
  }, [isOpen, currentPickedQty]);

  // Crisp Audio & Haptic Feedback
  const playBeep = async (isSuccess: boolean) => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = isSuccess ? 'sine' : 'sawtooth';
      osc.frequency.value = isSuccess ? 880 : 220;
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      osc.start();
      osc.stop(audioCtx.currentTime + (isSuccess ? 0.15 : 0.3));

      if (navigator.vibrate) {
        navigator.vibrate(isSuccess ? [50, 30, 50] : [150, 80, 150]);
      }
    } catch (e) {}
  };

  // Toggle Camera Flashlight
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks ? streamRef.current.getVideoTracks()[0] : null;
    if (!track) return;

    try {
      const capabilities: any = track.getCapabilities ? track.getCapabilities() : {};
      if (capabilities.torch) {
        await (track as any).applyConstraints({
          advanced: [{ torch: !torchOn }],
        });
        setTorchOn(!torchOn);
      }
    } catch (err) {}
  };

  // Start ZXing Camera Video Stream with Lightweight Constraints (VGA 640x480 @ 15-20fps)
  useEffect(() => {
    if (!isOpen) {
      stopCameraStream();
      setFeedback(null);
      setTorchOn(false);
      return;
    }

    isScanningActiveRef.current = true;
    setIsScanningActive(true);

    let isSubscribed = true;

    const initScanner = async () => {
      try {
        const reader = new BrowserMultiFormatReader(scanHints);
        readerRef.current = reader;

        if (!videoRef.current) return;

        // Tối ưu hóa cực mạnh cho máy yếu: Giới hạn độ phân giải 640x480 và 15-20fps
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment',
            width: { ideal: 640, max: 800 },
            height: { ideal: 480, max: 600 },
            frameRate: { ideal: 15, max: 20 },
          },
          audio: false,
        });

        if (!isSubscribed) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        streamRef.current = stream;
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});

        await reader.decodeFromStream(
          stream,
          videoRef.current,
          (result) => {
            if (!isSubscribed) return;
            if (result) {
              const now = Date.now();
              // Throttle quét 1.5 giây giữa các lần nhận diện để tránh quá tải CPU
              if (now - lastScanTimeRef.current < 1500) return;
              if (!isScanningActiveRef.current) return;

              const scannedText = result.getText();
              if (scannedText && scannedText.trim()) {
                lastScanTimeRef.current = now;
                handleScanCode(scannedText.trim());
              }
            }
          }
        );

        if (isSubscribed) {
          setHasPermission(true);
        }
      } catch (err) {
        if (isSubscribed) {
          setHasPermission(false);
        }
      }
    };

    initScanner();

    return () => {
      isSubscribed = false;
      stopCameraStream();
    };
  }, [isOpen]);

  // Fallback Camera input via file input
  const handleOpenPhotoCapture = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingPhoto(true);
    try {
      const objectUrl = URL.createObjectURL(file);
      const reader = new BrowserMultiFormatReader(scanHints);
      let detectedText: string | null = null;
      try {
        const result = await reader.decodeFromImageUrl(objectUrl);
        if (result && result.getText && result.getText()) {
          detectedText = result.getText();
        }
      } catch (err) {}

      URL.revokeObjectURL(objectUrl);

      if (detectedText) {
        handleScanCode(detectedText);
        setIsProcessingPhoto(false);
        return;
      }

      playBeep(false);
      setFeedback({
        isMatch: false,
        badge: 'KHÔNG NHẬN DIỆN ĐƯỢC',
        code: 'NO_CODE_DETECTED',
        type: 'ITEM',
        message: 'Không đọc được mã vạch trong ảnh. Vui lòng căn rõ hoặc chọn mã mẫu bên dưới.',
      });
    } catch (err) {
      playBeep(false);
    } finally {
      setIsProcessingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // CORE LOGIC: Auto-Classification between LOT and ITEM
  const handleScanCode = (scannedText: string) => {
    if (!scannedText) return;
    const cleanScanned = scannedText.trim();
    const rawUpper = cleanScanned.toUpperCase();

    // 1. LOOKUP Mode
    if (scannerType === 'LOOKUP') {
      playBeep(true);
      setIsScanningActive(false);
      setFeedback({
        isMatch: true,
        badge: 'TRA CỨU THÀNH CÔNG',
        code: cleanScanned,
        type: 'ITEM',
        message: `Đã tìm thấy dữ liệu tồn kho cho mã: "${cleanScanned}"`,
      });
      onScanResult(cleanScanned, true, 'ITEM', 1);
      setTimeout(() => {
        onClose();
      }, 900);
      return;
    }

    // 2. INBOUND Mode
    if (scannerType === 'INBOUND') {
      playBeep(true);
      setIsScanningActive(false);
      setFeedback({
        isMatch: true,
        badge: 'PHIẾU NHẬP HÀNG',
        code: cleanScanned,
        type: 'DOC',
        message: `Đã tiếp nhận mã phiếu: "${cleanScanned}". Đang tải biên bản QC...`,
      });
      onScanResult(cleanScanned, true, 'LOT', 1);
      setTimeout(() => {
        onClose();
      }, 900);
      return;
    }

    // 3. PACKING Mode
    if (scannerType === 'PACKING') {
      playBeep(true);
      setIsScanningActive(false);
      setFeedback({
        isMatch: true,
        badge: 'XÁC NHẬN ĐÓNG GÓI',
        code: cleanScanned,
        type: 'ORDER',
        message: `Đã xác thực kiện hàng: "${cleanScanned}"`,
      });
      onScanResult(cleanScanned, true, 'LOT', 1);
      setTimeout(() => {
        onClose();
      }, 900);
      return;
    }

    // 4. PICKING Mode: Intelligent LOT vs ITEM Detection
    // Check if scanned text has LOT characteristics
    const isLotPrefix = (
      rawUpper.startsWith('LOT-') ||
      rawUpper.startsWith('LO-') ||
      rawUpper.startsWith('BATCH-') ||
      rawUpper.startsWith('PALLET-') ||
      rawUpper.startsWith('BOX-') ||
      rawUpper.startsWith('THUNG-') ||
      rawUpper.startsWith('BIN-')
    );
    const isExactLotMatch = Boolean(expectedLotCode && (
      cleanScanned.toLowerCase() === expectedLotCode.toLowerCase() ||
      (expectedLotCode.length >= 6 && cleanScanned.toLowerCase().includes(expectedLotCode.toLowerCase()))
    ));

    // Check if scanned text has ITEM/SKU/EAN barcode characteristics
    const isItemPrefix = (
      rawUpper.startsWith('SKU-') ||
      rawUpper.startsWith('SP-') ||
      rawUpper.startsWith('PRD-') ||
      rawUpper.startsWith('EM-') ||
      /^\d{8,14}$/.test(cleanScanned) // Pure numeric retail barcode (EAN-13, EAN-8, UPC)
    );
    const isExactSkuMatch = Boolean(expectedSku && (
      cleanScanned.toLowerCase() === expectedSku.toLowerCase() ||
      (expectedSku.length >= 4 && cleanScanned.toLowerCase().includes(expectedSku.toLowerCase()))
    ));
    const isExactBarcodeMatch = Boolean(expectedBarcode && cleanScanned === expectedBarcode);

    // Determine target action based on scanMode and detection
    let isLotAction = false;
    let isItemAction = false;

    if (scanMode === 'LOT') {
      isLotAction = true;
    } else if (scanMode === 'ITEM') {
      isItemAction = true;
    } else {
      // AUTO MODE (Smart Classifier)
      if (isLotPrefix || isExactLotMatch) {
        isLotAction = true;
      } else if (isItemPrefix || isExactSkuMatch || isExactBarcodeMatch) {
        isItemAction = true;
      } else if (expectedLotCode && cleanScanned.toLowerCase().includes('lot')) {
        isLotAction = true;
      } else {
        isItemAction = true;
      }
    }

    const isMatch = isLotAction
      ? Boolean(!expectedLotCode || isExactLotMatch || isLotPrefix || !expectedSku)
      : Boolean(!expectedSku && !expectedBarcode || isExactSkuMatch || isExactBarcodeMatch || isItemPrefix);

    playBeep(isMatch);
    setIsScanningActive(false);

    if (isMatch) {
      stopCameraStream();
      setPickedCount(expectedQty);
      setFeedback({
        isMatch: true,
        badge: isLotAction ? 'MÃ LÔ HỢP LỆ (LẤY TRỌN KIỆN)' : 'MÃ SẢN PHẨM HỢP LỆ (XÁC THỰC XONG)',
        code: cleanScanned,
        type: isLotAction ? 'LOT' : 'ITEM',
        message: `Xác nhận thành công! Đã lấy đủ ${expectedQty} ${unit}. Đang lưu...`,
      });
      onScanResult(cleanScanned, true, isLotAction ? 'LOT' : 'ITEM', expectedQty);
      setTimeout(() => {
        onClose();
      }, 700);
    } else {
      setFeedback({
        isMatch: false,
        badge: 'CẢNH BÁO SAI MÃ',
        code: cleanScanned,
        type: isLotAction ? 'LOT' : 'ITEM',
        message: `Mã "${cleanScanned}" không khớp với yêu cầu lấy hàng (Cần: ${expectedSku || expectedLotCode}).`,
      });
      setTimeout(() => {
        setIsScanningActive(true);
        isScanningActiveRef.current = true;
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
    stopCameraStream();
    const finalQty = pickedCount > 0 ? pickedCount : expectedQty;
    playBeep(true);
    onScanResult(expectedLotCode || expectedSku || 'MANUAL', true, finalQty >= expectedQty ? 'LOT' : 'ITEM', finalQty);
    onClose();
  };

  const handleTakeAll = () => {
    stopCameraStream();
    setPickedCount(expectedQty);
    playBeep(true);
    onScanResult(expectedLotCode || expectedSku || 'TAKE_ALL', true, 'LOT', expectedQty);
    setFeedback({
      isMatch: true,
      badge: 'LẤY TRỌN TOÀN BỘ',
      code: expectedLotCode || expectedSku || 'ALL',
      type: 'LOT',
      message: `Đã xác nhận lấy toàn bộ ${expectedQty} ${unit}!`,
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
        { label: 'SKU Sữa: EM-20757', code: 'EM-20757', type: 'ITEM' },
        { label: 'Lô Lạnh: LOT-20260905-01', code: 'LOT-20260905-01', type: 'LOT' },
        { label: 'Vị Trí: Kệ B2-01', code: 'Kệ B2-01', type: 'ITEM' },
        { label: 'Barcode: 8934567890001', code: '8934567890001', type: 'ITEM' },
      ];
    }

    if (scannerType === 'INBOUND') {
      return [
        { label: 'Phiếu Nhập: NK-20260905-1', code: 'NK-20260905-1', type: 'DOC' },
        { label: 'Phiếu Giao: NK-20260905-2', code: 'NK-20260905-2', type: 'DOC' },
      ];
    }

    if (scannerType === 'PACKING') {
      return [
        { label: 'Đơn Xuất: XK-20260905-1', code: 'XK-20260905-1', type: 'ORDER' },
        { label: 'Vận Đơn: CM-SHIP-9942', code: 'CM-SHIP-9942', type: 'ORDER' },
      ];
    }

    // PICKING presets
    return [
      { label: `Mã Lô (Thùng): ${expectedLotCode || 'LOT-EM-01'}`, code: expectedLotCode || 'LOT-EM-20757-WH-006-738A3D', type: 'LOT' },
      { label: `Mã SKU (Món): ${expectedSku || 'EM-20757'}`, code: expectedSku || 'EM-20757', type: 'ITEM' },
      { label: `Mã Vạch EAN: ${expectedBarcode || '8934567890001'}`, code: expectedBarcode || '8934567890001', type: 'ITEM' },
    ];
  };

  const currentPresets = getPresets();
  const progressPercent = Math.min(100, Math.round((pickedCount / Math.max(1, expectedQty)) * 100));

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: '#0f172a',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      }}
    >
      {/* 1. TOP HEADER (Flat & Minimalist with Safe Area Insets) */}
      <div
        style={{
          paddingTop: 'max(14px, env(safe-area-inset-top, 24px))',
          paddingBottom: '10px',
          paddingLeft: '14px',
          paddingRight: '14px',
          backgroundColor: '#0f172a',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #1e293b',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {scannerType === 'LOOKUP' ? (
              <Search size={16} color="#38bdf8" />
            ) : scannerType === 'INBOUND' ? (
              <Truck size={16} color="#34d399" />
            ) : scannerType === 'PACKING' ? (
              <PackageCheck size={16} color="#a78bfa" />
            ) : (
              <ScanBarcode size={16} color="#10b981" />
            )}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#f8fafc' }}>
                {resolvedTitle}
              </h3>
              <span
                style={{
                  fontSize: '9px',
                  backgroundColor: '#1e293b',
                  color: '#94a3b8',
                  fontWeight: 600,
                  padding: '1px 5px',
                  borderRadius: '4px',
                  border: '1px solid #334155',
                }}
              >
                {scannerType}
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {hasPermission && (
            <button
              onClick={toggleTorch}
              style={{
                backgroundColor: torchOn ? '#fef3c7' : '#1e293b',
                color: torchOn ? '#b45309' : '#94a3b8',
                border: `1px solid ${torchOn ? '#fcd34d' : '#334155'}`,
                padding: '6px 10px',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '11px',
                fontWeight: 500,
              }}
              title="Bật/Tắt Flash"
            >
              <Zap size={13} />
              <span>Flash</span>
            </button>
          )}

          <button
            onClick={() => {
              stopCameraStream();
              onClose();
            }}
            style={{
              backgroundColor: '#450a0a',
              color: '#fca5a5',
              border: '1px solid #7f1d1d',
              padding: '6px 12px',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '12px',
              fontWeight: 600,
            }}
            title="Đóng máy quét"
          >
            <X size={16} />
            <span>Đóng</span>
          </button>
        </div>
      </div>

      {/* 2. TARGET HUD (Contextual Info Bar for Picking) */}
      {scannerType === 'PICKING' && (
        <div
          style={{
            backgroundColor: '#1e293b',
            borderBottom: '1px solid #334155',
            padding: '8px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {expectedName || 'Sản phẩm lấy hàng'}
            </span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: '#38bdf8',
                backgroundColor: '#0c4a6e',
                border: '1px solid #0369a1',
                padding: '2px 6px',
                borderRadius: '4px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <MapPin size={11} color="#38bdf8" />
              <span>{expectedShelfLocation || 'Kệ Lấy Hàng'}</span>
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8' }}>
            <span>
              Mã Lô: <strong style={{ color: '#fde047' }}>{expectedLotCode || 'Chưa gán'}</strong>
              {' • '}
              SKU: <strong style={{ color: '#cbd5e1' }}>{expectedSku || 'N/A'}</strong>
            </span>
            <span>
              Yêu cầu: <strong style={{ color: '#10b981' }}>{expectedQty} {unit}</strong>
            </span>
          </div>
        </div>
      )}

      {/* 3. MODE SELECTOR PILLS (Auto / Lot / Item) */}
      {scannerType === 'PICKING' && (
        <div
          style={{
            backgroundColor: '#0f172a',
            padding: '6px 14px',
            display: 'flex',
            gap: '6px',
            borderBottom: '1px solid #1e293b',
          }}
        >
          <button
            type="button"
            onClick={() => setScanMode('AUTO')}
            style={{
              flex: 1.2,
              padding: '6px 8px',
              borderRadius: '6px',
              border: `1px solid ${scanMode === 'AUTO' ? '#10b981' : '#334155'}`,
              backgroundColor: scanMode === 'AUTO' ? '#064e3b' : '#1e293b',
              color: scanMode === 'AUTO' ? '#a7f3d0' : '#94a3b8',
              fontSize: '11px',
              fontWeight: scanMode === 'AUTO' ? 600 : 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
            }}
          >
            <Layers size={12} />
            <span>Tự Động (Auto)</span>
          </button>

          <button
            type="button"
            onClick={() => setScanMode('LOT')}
            style={{
              flex: 1,
              padding: '6px 8px',
              borderRadius: '6px',
              border: `1px solid ${scanMode === 'LOT' ? '#f59e0b' : '#334155'}`,
              backgroundColor: scanMode === 'LOT' ? '#78350f' : '#1e293b',
              color: scanMode === 'LOT' ? '#fde68a' : '#94a3b8',
              fontSize: '11px',
              fontWeight: scanMode === 'LOT' ? 600 : 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
            }}
          >
            <Package size={12} />
            <span>Mã Lô (Lấy trọn)</span>
          </button>

          <button
            type="button"
            onClick={() => setScanMode('ITEM')}
            style={{
              flex: 1,
              padding: '6px 8px',
              borderRadius: '6px',
              border: `1px solid ${scanMode === 'ITEM' ? '#38bdf8' : '#334155'}`,
              backgroundColor: scanMode === 'ITEM' ? '#0c4a6e' : '#1e293b',
              color: scanMode === 'ITEM' ? '#bae6fd' : '#94a3b8',
              fontSize: '11px',
              fontWeight: scanMode === 'ITEM' ? 600 : 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
            }}
          >
            <Tag size={12} />
            <span>Sản Phẩm (+1)</span>
          </button>
        </div>
      )}

      {/* 4. CAMERA VIEWFINDER (Industrial Corner Reticle, No Neon Laser) */}
      <div
        style={{
          flex: 1,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#000000',
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

        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: hasPermission === false ? 'none' : 'block',
          }}
        />

        {/* Fallback Camera Trigger when Video Stream Fails */}
        {hasPermission === false && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '20px',
              textAlign: 'center',
              maxWidth: '320px',
              backgroundColor: '#1e293b',
              borderRadius: '10px',
              border: '1px solid #334155',
            }}
          >
            <Camera size={32} color="#10b981" style={{ marginBottom: '10px' }} />
            <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#f8fafc' }}>
              Chưa Mở Được Luồng Video Trực Tiếp
            </h4>
            <p style={{ margin: '6px 0 14px 0', fontSize: '11px', color: '#94a3b8', lineHeight: 1.4 }}>
              Bạn có thể chụp ảnh trực tiếp từ camera điện thoại để máy quét nhận diện mã.
            </p>
            <button
              onClick={handleOpenPhotoCapture}
              disabled={isProcessingPhoto}
              style={{
                backgroundColor: '#008848',
                color: '#ffffff',
                border: 'none',
                padding: '10px 16px',
                borderRadius: '6px',
                fontWeight: 600,
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Camera size={15} />
              <span>{isProcessingPhoto ? 'Đang Nhận Diện...' : 'Mở Máy Ảnh Thiết Bị'}</span>
            </button>
          </div>
        )}

        {/* Minimalist Industrial Corner Reticle (Clean Frame) */}
        {hasPermission !== false && (
          <div
            style={{
              position: 'absolute',
              width: '230px',
              height: '230px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              pointerEvents: 'none',
            }}
          >
            {/* Top Corners */}
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ width: '24px', height: '24px', borderTop: '2.5px solid #10b981', borderLeft: '2.5px solid #10b981', borderTopLeftRadius: '4px' }} />
              <div style={{ width: '24px', height: '24px', borderTop: '2.5px solid #10b981', borderRight: '2.5px solid #10b981', borderTopRightRadius: '4px' }} />
            </div>

            {/* Hint in center */}
            <div style={{ textAlign: 'center', fontSize: '10.5px', color: '#e2e8f0', fontWeight: 500, padding: '0 8px', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
              {scanMode === 'LOT'
                ? 'Căn Mã Lô / Thùng vào khung'
                : scanMode === 'ITEM'
                ? 'Căn Mã Vạch Sản Phẩm vào khung'
                : 'Căn Mã Lô (thùng) hoặc Mã Vạch (sản phẩm)'}
            </div>

            {/* Bottom Corners */}
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ width: '24px', height: '24px', borderBottom: '2.5px solid #10b981', borderLeft: '2.5px solid #10b981', borderBottomLeftRadius: '4px' }} />
              <div style={{ width: '24px', height: '24px', borderBottom: '2.5px solid #10b981', borderRight: '2.5px solid #10b981', borderBottomRightRadius: '4px' }} />
            </div>
          </div>
        )}

        {/* Scan Result Feedback Banner (Clean Semantic Styling) */}
        {feedback && (
          <div
            style={{
              position: 'absolute',
              bottom: '16px',
              left: '14px',
              right: '14px',
              backgroundColor: feedback.isMatch
                ? (feedback.type === 'LOT' ? '#f0fdf4' : '#f0f9ff')
                : '#fef2f2',
              border: `1px solid ${
                feedback.isMatch
                  ? (feedback.type === 'LOT' ? '#bbf7d0' : '#bae6fd')
                  : '#fecaca'
              }`,
              borderRadius: '8px',
              padding: '10px 14px',
              color: feedback.isMatch
                ? (feedback.type === 'LOT' ? '#166534' : '#075985')
                : '#991b1b',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            }}
          >
            {feedback.isMatch ? (
              <CheckCircle2 size={20} color={feedback.type === 'LOT' ? '#166534' : '#0284c7'} style={{ flexShrink: 0 }} />
            ) : (
              <AlertTriangle size={20} color="#dc2626" style={{ flexShrink: 0 }} />
            )}
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '10px', fontWeight: 700, padding: '1px 5px', borderRadius: '4px', backgroundColor: 'rgba(0,0,0,0.06)' }}>
                  {feedback.badge}
                </span>
                <span style={{ fontSize: '11px', opacity: 0.85, fontFamily: 'monospace' }}>
                  {feedback.code}
                </span>
              </div>
              <div style={{ fontSize: '12px', fontWeight: 600, marginTop: '2px' }}>
                {feedback.message}
              </div>
              {!feedback.isMatch && (
                <button
                  type="button"
                  onClick={() => {
                    stopCameraStream();
                    playBeep(true);
                    setPickedCount(expectedQty);
                    onScanResult(feedback.code || expectedLotCode || expectedSku || 'OVERRIDE', true, 'LOT', expectedQty);
                    onClose();
                  }}
                  style={{
                    backgroundColor: '#0f766e',
                    color: '#ffffff',
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    marginTop: '6px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Check size={12} />
                  <span>Chấp Nhận Mã Này & Hoàn Tất Lấy Hàng →</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 5. BOTTOM ACTION DRAWER (Safe Area Padding & Instant Confirmation) */}
      <div
        style={{
          backgroundColor: '#0f172a',
          borderTop: '1px solid #1e293b',
          paddingTop: '10px',
          paddingBottom: 'max(14px, env(safe-area-inset-bottom, 24px))',
          paddingLeft: '14px',
          paddingRight: '14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        {/* Stepper Progress for PICKING */}
        {scannerType === 'PICKING' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                Tiến độ: <strong style={{ color: pickedCount >= expectedQty ? '#10b981' : '#38bdf8', fontSize: '13px' }}>
                  {pickedCount} / {expectedQty} {unit}
                </strong>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => setPickedCount(Math.max(0, pickedCount - 1))}
                  style={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    color: '#f8fafc',
                    width: '26px',
                    height: '26px',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                  title="Giảm 1"
                >
                  <Minus size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => setPickedCount(Math.min(expectedQty, pickedCount + 1))}
                  style={{
                    backgroundColor: '#0284c7',
                    border: 'none',
                    color: '#ffffff',
                    width: '26px',
                    height: '26px',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                  title="Tăng 1"
                >
                  <Plus size={13} />
                </button>
                <button
                  type="button"
                  onClick={handleTakeAll}
                  style={{
                    backgroundColor: '#065f46',
                    border: '1px solid #059669',
                    color: '#a7f3d0',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                  title="Xác nhận lấy toàn bộ số lượng"
                >
                  <Check size={12} />
                  <span>Lấy Hết</span>
                </button>
              </div>
            </div>

            {/* Flat Progress Bar */}
            <div style={{ height: '4px', backgroundColor: '#1e293b', borderRadius: '2px', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${progressPercent}%`,
                  backgroundColor: pickedCount >= expectedQty ? '#10b981' : '#0284c7',
                  transition: 'width 0.2s ease',
                }}
              />
            </div>
          </div>
        )}

        {/* Manual Barcode Input Form */}
        <form onSubmit={handleManualSubmit} style={{ display: 'flex', gap: '6px' }}>
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
                : scanMode === 'ITEM'
                ? 'Nhập mã vạch sản phẩm (893...)...'
                : 'Nhập mã Lô hoặc Mã vạch SP...'
            }
            value={manualCode}
            onChange={e => setManualCode(e.target.value)}
            style={{
              flex: 1,
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '6px',
              padding: '8px 10px',
              color: '#f8fafc',
              fontSize: '12px',
              outline: 'none',
            }}
          />
          <button
            type="submit"
            style={{
              backgroundColor: '#008848',
              color: '#ffffff',
              border: 'none',
              padding: '0 12px',
              borderRadius: '6px',
              fontWeight: 600,
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            Nhập
          </button>
        </form>

        {/* Quick Simulator Preset Pills */}
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {currentPresets.map((m, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleScanCode(m.code)}
              style={{
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                color: '#cbd5e1',
                borderRadius: '6px',
                padding: '4px 8px',
                fontSize: '10.5px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Bottom Confirm Button for PICKING */}
        {scannerType === 'PICKING' && (
          <button
            type="button"
            onClick={handleConfirmCount}
            style={{
              backgroundColor: pickedCount >= expectedQty ? '#008848' : '#0284c7',
              color: '#ffffff',
              border: 'none',
              padding: '11px',
              borderRadius: '6px',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'background-color 0.15s ease',
            }}
          >
            <CheckCircle2 size={16} />
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
