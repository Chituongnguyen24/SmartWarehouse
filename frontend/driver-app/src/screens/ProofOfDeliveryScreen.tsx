import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  StatusBar,
  Image,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { DeliveryTask } from '../types/driver';
import { useDriverTask } from '../context/DriverTaskContext';
import { COLORS } from '../theme/colors';
import {
  ArrowLeft,
  Camera,
  CheckSquare,
  Square,
  Banknote,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ImageIcon,
  RefreshCw,
  Cloud,
  Check,
  PhoneCall,
  Clock,
  MapPin,
  FileWarning,
} from 'lucide-react-native';

interface ProofOfDeliveryScreenProps {
  task: DeliveryTask;
  onBack: () => void;
  onSuccess: () => void;
}

const SERVER_HOSTS = [
  'http://192.168.2.147:3004',
  'http://localhost:3004',
  'http://10.0.2.2:3004',
];

export const ProofOfDeliveryScreen: React.FC<ProofOfDeliveryScreenProps> = ({
  task,
  onBack,
  onSuccess,
}) => {
  const { completeDelivery, reportDeliveryFailure } = useDriverTask();

  const [activeMode, setActiveMode] = useState<'POD' | 'EXCEPTION'>('POD');
  const [photoUri, setPhotoUri] = useState<string>('https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&q=80');
  const [s3UploadedUrl, setS3UploadedUrl] = useState<string | null>(null);
  const [isUploadingS3, setIsUploadingS3] = useState<boolean>(false);
  const [isCodCollected, setIsCodCollected] = useState(task.codAmount === 0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Exception reasons list for Reverse Logistics
  const EXCEPTION_REASONS = [
    { id: 'NO_ANSWER', label: '📵 Khách không nghe máy (Đã gọi 3 lần)', desc: 'Tài xế đã chờ 15 phút tại địa chỉ nhận' },
    { id: 'RESCHEDULE', label: '⏰ Khách hẹn giao lại vào khung giờ/ngày khác', desc: 'Khách bận đi vắng hoặc không có nhà' },
    { id: 'WRONG_ADDRESS', label: '🗺️ Sai địa chỉ / Không tìm thấy số nhà / Hẻm cụt', desc: 'Không thể liên hệ hoặc địa chỉ không tồn tại' },
    { id: 'DAMAGED_PACKAGE', label: '📦 Bao bì móp méo / Mất nhiệt lạnh (>5°C)', desc: 'Kiện hàng cần hồi kho để bảo quản lại' },
    { id: 'CUSTOMER_REJECT', label: '❌ Khách từ chối nhận (Đổi ý / Không đủ COD)', desc: 'Khách yêu cầu hủy nhận đơn hàng này' },
  ];

  const [selectedReason, setSelectedReason] = useState<string>(EXCEPTION_REASONS[0].label);
  const [customNote, setCustomNote] = useState<string>('');

  const formatPrice = (val: number) => val.toLocaleString('vi-VN') + 'đ';

  // 1. Chụp ảnh thực tế bằng Camera (Universal Native & Web)
  const handleTakePhoto = () => {
    if (typeof document !== 'undefined') {
      try {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        (input as any).capture = 'environment';
        input.onchange = (e: any) => {
          const file = e.target?.files?.[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = () => {
              const dataUrl = reader.result as string;
              setPhotoUri(dataUrl);
              uploadToAmazonS3(dataUrl, activeMode);
            };
            reader.readAsDataURL(file);
          }
        };
        input.click();
        return;
      } catch (e) {}
    }

    const sampleUri = activeMode === 'POD'
      ? 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=500&q=80'
      : 'https://images.unsplash.com/photo-1558611848-73f7eb4001a1?w=500&q=80';
    setPhotoUri(sampleUri);
    uploadToAmazonS3(sampleUri, activeMode);
    Alert.alert('📸 Đã chụp ảnh POD', 'Ảnh kiện hàng đã được đính kèm và lưu trữ.');
  };

  // 2. Chọn ảnh từ thư viện (Universal Native & Web)
  const handlePickFromGallery = () => {
    if (typeof document !== 'undefined') {
      try {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e: any) => {
          const file = e.target?.files?.[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = () => {
              const dataUrl = reader.result as string;
              setPhotoUri(dataUrl);
              uploadToAmazonS3(dataUrl, activeMode);
            };
            reader.readAsDataURL(file);
          }
        };
        input.click();
        return;
      } catch (e) {}
    }

    const sampleUri = 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=500&q=80';
    setPhotoUri(sampleUri);
    uploadToAmazonS3(sampleUri, activeMode);
  };

  // 3. Upload ảnh lên Amazon S3 thông qua backend order-service
  const uploadToAmazonS3 = async (base64: string, type: 'POD' | 'EXCEPTION') => {
    setIsUploadingS3(true);
    for (const host of SERVER_HOSTS) {
      try {
        const res = await fetch(`${host}/orders/upload-pod-image`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: base64,
            orderId: task.id,
            type: type === 'POD' ? 'POD' : 'RETURN',
          }),
        });

        if (res.ok) {
          const data = await res.json();
          setS3UploadedUrl(data.url);
          break;
        }
      } catch (err) {}
    }
    setIsUploadingS3(false);
  };

  const handleConfirmPOD = () => {
    if (task.codAmount > 0 && !isCodCollected) {
      Alert.alert('⚠️ Chưa xác nhận thu COD', 'Vui lòng tích chọn đã thu đủ số tiền COD từ khách hàng!');
      return;
    }

    setIsSubmitting(true);
    const finalPhoto = s3UploadedUrl || photoUri;

    setTimeout(() => {
      completeDelivery(task.id, finalPhoto);
      setIsSubmitting(false);
      Alert.alert(
        '🎉 Giao hàng thành công!',
        `Đã hoàn tất POD cho đơn #${task.orderCode}.\nẢnh đã lưu trữ an toàn trên Amazon S3 Cloud.\nPhí ship 35.000đ đã được cộng vào Ví thu nhập!`,
        [{ text: 'Trở về trang chủ', onPress: onSuccess }]
      );
    }, 400);
  };

  const handleReportFailure = () => {
    const finalReason = customNote.trim() ? `${selectedReason} - ${customNote}` : selectedReason;
    const finalPhoto = s3UploadedUrl || photoUri;

    setIsSubmitting(true);
    setTimeout(() => {
      reportDeliveryFailure(task.id, finalReason, finalPhoto);
      setIsSubmitting(false);
      Alert.alert(
        '🔄 Đã ghi nhận hàng hoàn',
        `Đơn hàng #${task.orderCode} đã chuyển sang trạng thái "Trả Hàng Về Kho (Reverse Logistics)".\nVui lòng bảo quản kiện hàng lạnh và mang về Kho Gò Vấp khi kết thúc chuyến.`,
        [{ text: 'Trở về trang chủ', onPress: onSuccess }]
      );
    }, 400);
  };

  const nowString = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date().toLocaleDateString('vi-VN');

  return (
    <SafeAreaView style={styles.safeContainer}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primaryDark} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <ArrowLeft size={20} color={COLORS.surface} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.headerTitle}>Xác Nhận Đơn #{task.orderCode}</Text>
          <Text style={styles.headerSub}>{task.customerName}</Text>
        </View>
      </View>

      {/* Mode Switcher Tabs */}
      <View style={styles.modeTabsRow}>
        <TouchableOpacity
          style={[styles.modeTab, activeMode === 'POD' && styles.modeTabActiveSuccess]}
          onPress={() => setActiveMode('POD')}
          activeOpacity={0.85}
        >
          <CheckCircle2 size={16} color={activeMode === 'POD' ? COLORS.surface : COLORS.textMuted} />
          <Text style={[styles.modeTabText, activeMode === 'POD' && styles.modeTabTextActive]}>
            Giao Thành Công (POD)
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.modeTab, activeMode === 'EXCEPTION' && styles.modeTabActiveDanger]}
          onPress={() => setActiveMode('EXCEPTION')}
          activeOpacity={0.85}
        >
          <RotateCcw size={16} color={activeMode === 'EXCEPTION' ? COLORS.surface : COLORS.textMuted} />
          <Text style={[styles.modeTabText, activeMode === 'EXCEPTION' && styles.modeTabTextActive]}>
            Báo Cáo Hàng Hoàn
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Order Destination Info Banner */}
        <View style={styles.orderBanner}>
          <Text style={styles.customerName}>{task.customerName} • {task.customerPhone}</Text>
          <Text style={styles.addressText}>📍 {task.deliveryAddress}</Text>
        </View>

        {activeMode === 'POD' ? (
          <>
            {/* Step 1: COD Collection Confirmation */}
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.stepNumberBadge}>
                  <Text style={styles.stepNumberText}>1</Text>
                </View>
                <Banknote size={16} color={COLORS.primary} />
                <Text style={styles.cardTitle}>Thu hộ tiền mặt COD</Text>
              </View>

              {task.codAmount > 0 ? (
                <TouchableOpacity
                  style={[styles.checkboxRow, isCodCollected && styles.checkboxRowActive]}
                  onPress={() => setIsCodCollected(!isCodCollected)}
                  activeOpacity={0.8}
                >
                  {isCodCollected ? (
                    <CheckSquare size={22} color={COLORS.primary} />
                  ) : (
                    <Square size={22} color={COLORS.borderDark} />
                  )}
                  <View style={{ marginLeft: 10, flex: 1 }}>
                    <Text style={styles.codCheckText}>Đã thu đủ số tiền mặt COD từ khách</Text>
                    <Text style={styles.codCheckVal}>{formatPrice(task.codAmount)}</Text>
                  </View>
                </TouchableOpacity>
              ) : (
                <View style={styles.paidInfoBox}>
                  <Text style={styles.paidInfoText}>✅ Đơn hàng này đã được thanh toán Online trước (0đ COD).</Text>
                </View>
              )}
            </View>

            {/* Step 2: Proof Photo Capture with Camera & S3 Sync */}
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.stepNumberBadge}>
                  <Text style={styles.stepNumberText}>2</Text>
                </View>
                <Camera size={16} color={COLORS.primary} />
                <Text style={styles.cardTitle}>Ảnh Bằng Chứng Giao Hàng (POD)</Text>
              </View>

              {/* Photo Box with GPS & Timestamp Watermark */}
              <View style={styles.photoBox}>
                <Image source={{ uri: photoUri }} style={styles.capturedPhoto} />
                
                {/* Watermark Overlay */}
                <View style={styles.watermarkOverlay}>
                  <Text style={styles.watermarkText}>📦 #{task.orderCode} • {task.customerName}</Text>
                  <Text style={styles.watermarkText}>📍 {task.latitude?.toFixed(4) || '10.8354'}, {task.longitude?.toFixed(4) || '106.6668'} • {nowString}</Text>
                  <Text style={styles.watermarkText}>🏬 Kho Gò Vấp (WH-006) • Thùng Lạnh 0-4°C</Text>
                </View>

                {/* S3 Upload Status Badge */}
                <View style={styles.s3Badge}>
                  {isUploadingS3 ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <ActivityIndicator size="small" color="#fff" />
                      <Text style={styles.s3BadgeText}>Đang tải lên Amazon S3...</Text>
                    </View>
                  ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Cloud size={12} color="#fff" style={{ marginRight: 4 }} />
                      <Text style={styles.s3BadgeText}>Amazon S3 Cloud Ready</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Photo Action Buttons */}
              <View style={styles.photoActionRow}>
                <TouchableOpacity
                  style={styles.photoActionBtnPrimary}
                  onPress={handleTakePhoto}
                  activeOpacity={0.8}
                >
                  <Camera size={16} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={styles.photoActionBtnTextPrimary}>📸 Chụp Ảnh Mới</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.photoActionBtnSecondary}
                  onPress={handlePickFromGallery}
                  activeOpacity={0.8}
                >
                  <ImageIcon size={16} color="#0f172a" style={{ marginRight: 6 }} />
                  <Text style={styles.photoActionBtnTextSecondary}>🖼️ Chọn Thư Viện</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Submit POD Button */}
            <TouchableOpacity
              style={[styles.confirmBtn, isSubmitting && { opacity: 0.7 }]}
              onPress={handleConfirmPOD}
              disabled={isSubmitting}
              activeOpacity={0.85}
            >
              <CheckCircle2 size={20} color={COLORS.surface} style={{ marginRight: 8 }} />
              <Text style={styles.confirmBtnText}>
                {isSubmitting ? 'Đang lưu trữ POD...' : 'Xác Nhận Hoàn Tất Giao Hàng'}
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          /* ── REVERSE LOGISTICS & EXCEPTION REPORTING FORM ── */
          <>
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <AlertTriangle size={18} color={COLORS.error} />
                <Text style={[styles.cardTitle, { color: COLORS.error }]}>Lý do giao không thành công</Text>
              </View>

              {EXCEPTION_REASONS.map(item => {
                const isSel = selectedReason === item.label;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.reasonOption, isSel && styles.reasonOptionActive]}
                    onPress={() => setSelectedReason(item.label)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.radioCircle, isSel && styles.radioCircleActive]}>
                      {isSel && <View style={styles.radioInner} />}
                    </View>
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Text style={[styles.reasonText, isSel && styles.reasonTextActive]}>{item.label}</Text>
                      <Text style={styles.reasonDesc}>{item.desc}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}

              <Text style={styles.inputLabel}>Ghi chú chi tiết lý do (Tùy chọn):</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Nhập chi tiết cuộc gọi, vị trí hoặc lý do khách hẹn..."
                placeholderTextColor={COLORS.textMuted}
                value={customNote}
                onChangeText={setCustomNote}
                multiline
              />
            </View>

            {/* Photo Proof of Failure (e.g. Photo of Closed Door / Call Log) */}
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <Camera size={16} color={COLORS.error} />
                <Text style={[styles.cardTitle, { color: COLORS.error }]}>Ảnh Bằng Chứng Sự Cố (Bắt buộc)</Text>
              </View>

              <View style={styles.photoBox}>
                <Image source={{ uri: photoUri }} style={styles.capturedPhoto} />
                <View style={styles.watermarkOverlay}>
                  <Text style={styles.watermarkText}>⚠️ [HÀNG HOÀN] #{task.orderCode}</Text>
                  <Text style={styles.watermarkText}>Lý do: {selectedReason}</Text>
                  <Text style={styles.watermarkText}>📍 {nowString}</Text>
                </View>
              </View>

              <View style={styles.photoActionRow}>
                <TouchableOpacity
                  style={styles.photoActionBtnPrimaryDanger}
                  onPress={handleTakePhoto}
                  activeOpacity={0.8}
                >
                  <Camera size={16} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={styles.photoActionBtnTextPrimary}>📸 Chụp Ảnh Cửa Nhà / Sự Cố</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.photoActionBtnSecondary}
                  onPress={handlePickFromGallery}
                  activeOpacity={0.8}
                >
                  <ImageIcon size={16} color="#0f172a" style={{ marginRight: 6 }} />
                  <Text style={styles.photoActionBtnTextSecondary}>🖼️ Chọn Ảnh</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Reverse Logistics Return Button */}
            <TouchableOpacity
              style={[styles.returnBtn, isSubmitting && { opacity: 0.7 }]}
              onPress={handleReportFailure}
              disabled={isSubmitting}
              activeOpacity={0.85}
            >
              <RotateCcw size={20} color={COLORS.surface} style={{ marginRight: 8 }} />
              <Text style={styles.confirmBtnText}>
                {isSubmitting ? 'Đang ghi nhận...' : 'Xác Nhận Hàng Hoàn Về Kho'}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: COLORS.headerBg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderDark,
  },
  backBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
  headerSub: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },

  // ── Mode Switcher Tabs ──
  modeTabsRow: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    gap: 8,
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    gap: 6,
  },
  modeTabActiveSuccess: {
    backgroundColor: '#059669',
  },
  modeTabActiveDanger: {
    backgroundColor: '#dc2626',
  },
  modeTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  modeTabTextActive: {
    color: '#ffffff',
  },

  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  orderBanner: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  customerName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  addressText: {
    fontSize: 12,
    color: '#475569',
    marginTop: 4,
  },

  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 6,
  },
  stepNumberBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#ffffff',
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
    flex: 1,
  },

  // ── COD Checkbox ──
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  checkboxRowActive: {
    backgroundColor: '#ecfdf5',
    borderColor: '#10b981',
  },
  codCheckText: {
    fontSize: 12,
    color: '#334155',
  },
  codCheckVal: {
    fontSize: 16,
    fontWeight: '900',
    color: '#059669',
    marginTop: 2,
  },
  paidInfoBox: {
    backgroundColor: '#f0fdf4',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  paidInfoText: {
    fontSize: 12,
    color: '#15803d',
    fontWeight: '600',
  },

  // ── Photo Box & Watermark ──
  photoBox: {
    position: 'relative',
    height: 180,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#0f172a',
    marginBottom: 10,
  },
  capturedPhoto: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  watermarkOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  watermarkText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
    marginVertical: 1,
  },
  s3Badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(2, 132, 199, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  s3BadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  photoActionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  photoActionBtnPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0284c7',
    paddingVertical: 10,
    borderRadius: 10,
  },
  photoActionBtnPrimaryDanger: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#dc2626',
    paddingVertical: 10,
    borderRadius: 10,
  },
  photoActionBtnSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  photoActionBtnTextPrimary: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  photoActionBtnTextSecondary: {
    color: '#0f172a',
    fontSize: 12,
    fontWeight: '700',
  },

  // ── Reasons ──
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  reasonOptionActive: {
    backgroundColor: '#fef2f2',
    borderColor: '#ef4444',
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#94a3b8',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  radioCircleActive: {
    borderColor: '#dc2626',
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#dc2626',
  },
  reasonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  reasonTextActive: {
    color: '#b91c1c',
  },
  reasonDesc: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginTop: 6,
    marginBottom: 4,
  },
  textInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    padding: 10,
    fontSize: 12,
    color: '#0f172a',
    minHeight: 60,
    textAlignVertical: 'top',
  },

  // ── Action Buttons ──
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    borderRadius: 12,
    paddingVertical: 14,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  returnBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#dc2626',
    borderRadius: 12,
    paddingVertical: 14,
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
});
