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
} from 'react-native';
import { DeliveryTask } from '../types/driver';
import { useDriverTask } from '../context/DriverTaskContext';
import { COLORS } from '../theme/colors';
import { ArrowLeft, Camera, CheckSquare, Square, Banknote, ShieldCheck, CheckCircle2 } from 'lucide-react-native';

interface ProofOfDeliveryScreenProps {
  task: DeliveryTask;
  onBack: () => void;
  onSuccess: () => void;
}

export const ProofOfDeliveryScreen: React.FC<ProofOfDeliveryScreenProps> = ({
  task,
  onBack,
  onSuccess,
}) => {
  const { completeDelivery } = useDriverTask();

  const [hasCapturedPhoto] = useState(true);
  const [photoUri] = useState('https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&q=80');
  const [isCodCollected, setIsCodCollected] = useState(task.codAmount === 0);
  const [isFreshVerified, setIsFreshVerified] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatPrice = (val: number) => val.toLocaleString('vi-VN') + 'đ';

  const handleConfirmPOD = () => {
    if (task.codAmount > 0 && !isCodCollected) {
      Alert.alert('⚠️ Chưa xác nhận thu COD', 'Vui lòng tích chọn đã thu đủ số tiền COD từ khách hàng!');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      completeDelivery(task.id, photoUri);
      setIsSubmitting(false);
      Alert.alert(
        '🎉 Giao hàng thành công!',
        `Đã hoàn tất giao đơn #${task.orderCode}. Phí ship 35.000đ đã được cộng vào Ví thu nhập của bạn!`,
        [{ text: 'Trở về trang chủ', onPress: onSuccess }]
      );
    }, 500);
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <ArrowLeft size={20} color={COLORS.surface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Xác Nhận Bàn Giao (POD)</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Order Info Banner */}
        <View style={styles.orderBanner}>
          <Text style={styles.orderCode}>MÃ ĐƠN HÀNG: #{task.orderCode}</Text>
          <Text style={styles.customerName}>{task.customerName}</Text>
          <Text style={styles.addressText}>📍 {task.deliveryAddress}</Text>
        </View>

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
            <View style={styles.paidBadgeBox}>
              <CheckCircle2 size={16} color={COLORS.primary} />
              <Text style={styles.paidBadgeText}>Đơn đã thanh toán trực tuyến (0đ COD)</Text>
            </View>
          )}
        </View>

        {/* Step 2: Quality Inspection Check */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.stepNumberBadge}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <ShieldCheck size={16} color={COLORS.primary} />
            <Text style={styles.cardTitle}>Tình trạng hàng hóa bàn giao</Text>
          </View>

          <TouchableOpacity
            style={[styles.checkboxRow, isFreshVerified && styles.checkboxRowActive]}
            onPress={() => setIsFreshVerified(!isFreshVerified)}
            activeOpacity={0.8}
          >
            {isFreshVerified ? (
              <CheckSquare size={22} color={COLORS.primary} />
            ) : (
              <Square size={22} color={COLORS.borderDark} />
            )}
            <Text style={styles.freshCheckText}>
              Đã kiểm tra thực phẩm đầy đủ quy cách, tươi sạch nguyên vẹn & mát lạnh.
            </Text>
          </TouchableOpacity>
        </View>

        {/* Step 3: Photo Evidence Upload */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.stepNumberBadge}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <Camera size={16} color={COLORS.primary} />
            <Text style={styles.cardTitle}>Chụp hình giao hàng thành công</Text>
          </View>

          <View style={styles.photoPreviewBox}>
            <Image source={{ uri: photoUri }} style={styles.photoImage} />
            <TouchableOpacity style={styles.retakeBtn} activeOpacity={0.8}>
              <Camera size={12} color={COLORS.surface} style={{ marginRight: 4 }} />
              <Text style={styles.retakeText}>Chụp lại ảnh</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Confirm Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.confirmBtn}
          onPress={handleConfirmPOD}
          disabled={isSubmitting}
          activeOpacity={0.88}
        >
          <Text style={styles.confirmBtnText}>
            {isSubmitting ? 'ĐANG XỬ LÝ...' : 'XÁC NHẬN HOÀN TẤT GIAO HÀNG'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    height: 52,
    backgroundColor: COLORS.headerBg,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  backBtn: {
    padding: 6,
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.surface,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
  },
  orderBanner: {
    backgroundColor: COLORS.headerBgLight,
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  orderCode: {
    color: COLORS.accent,
    fontSize: 11,
    fontWeight: '850',
    letterSpacing: 0.5,
  },
  customerName: {
    color: COLORS.surface,
    fontSize: 20,
    fontWeight: '900',
    marginTop: 4,
  },
  addressText: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 6,
    lineHeight: 16,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stepNumberBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  stepNumberText: {
    color: COLORS.surface,
    fontSize: 10,
    fontWeight: '900',
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '850',
    color: COLORS.textPrimary,
    marginLeft: 6,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  checkboxRowActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.successLight,
  },
  codCheckText: {
    fontSize: 12,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  codCheckVal: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.danger,
    marginTop: 2,
  },
  paidBadgeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.successLight,
    padding: 12,
    borderRadius: 10,
  },
  paidBadgeText: {
    fontSize: 12,
    fontWeight: '750',
    color: COLORS.primary,
    marginLeft: 6,
  },
  freshCheckText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 12,
    color: COLORS.textPrimary,
    fontWeight: '600',
    lineHeight: 16,
  },
  photoPreviewBox: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  retakeBtn: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  retakeText: {
    color: COLORS.surface,
    fontSize: 11,
    fontWeight: '800',
  },
  bottomBar: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderColor: COLORS.border,
  },
  confirmBtn: {
    backgroundColor: COLORS.primary,
    height: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmBtnText: {
    color: COLORS.surface,
    fontSize: 14,
    fontWeight: '950',
  },
});
