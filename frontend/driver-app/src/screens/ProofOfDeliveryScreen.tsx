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

  const [hasCapturedPhoto, setHasCapturedPhoto] = useState(true);
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
        `Đã hoàn tất giao đơn #${task.orderCode}. Phí ship 35.000đ đã được cộng vào Ví thu nhập!`,
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
        <Text style={styles.headerTitle}>Xác Nhận Giao Hàng (POD)</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Order Info Banner */}
        <View style={styles.orderBanner}>
          <Text style={styles.orderCode}>Đơn hàng: #{task.orderCode}</Text>
          <Text style={styles.customerName}>Khách hàng: {task.customerName}</Text>
          <Text style={styles.addressText}>{task.deliveryAddress}</Text>
        </View>

        {/* Step 1: COD Collection Confirmation */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Banknote size={20} color={COLORS.primary} />
            <Text style={styles.cardTitle}>1. Thu tiền mặt COD</Text>
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
                <Text style={styles.codCheckText}>Đã thu đủ số tiền COD từ khách</Text>
                <Text style={styles.codCheckVal}>{formatPrice(task.codAmount)}</Text>
              </View>
            </TouchableOpacity>
          ) : (
            <View style={styles.paidBadgeBox}>
              <CheckCircle2 size={16} color={COLORS.primary} />
              <Text style={styles.paidBadgeText}>Đơn hàng đã được thanh toán Online trước (0đ COD)</Text>
            </View>
          )}
        </View>

        {/* Step 2: Quality Inspection Check */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <ShieldCheck size={20} color={COLORS.primary} />
            <Text style={styles.cardTitle}>2. Kiểm tra tình trạng thực phẩm</Text>
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
              Khách hàng đã kiểm tra thực phẩm tươi nguyên vẹn & đúng nhiệt độ kho lạnh
            </Text>
          </TouchableOpacity>
        </View>

        {/* Step 3: Photo Evidence Upload */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Camera size={20} color={COLORS.primary} />
            <Text style={styles.cardTitle}>3. Chụp ảnh xác thực giao hàng</Text>
          </View>

          <View style={styles.photoPreviewBox}>
            <Image source={{ uri: photoUri }} style={styles.photoImage} />
            <TouchableOpacity style={styles.retakeBtn} activeOpacity={0.8}>
              <Camera size={14} color={COLORS.surface} />
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
            {isSubmitting ? 'Đang Xử Lý...' : 'XÁC NHẬN HOÀN TẤT GIAO HÀNG'}
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
    height: 50,
    backgroundColor: COLORS.headerBg,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  backBtn: {
    padding: 6,
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.surface,
  },
  scrollContent: {
    padding: 12,
    paddingBottom: 24,
  },
  orderBanner: {
    backgroundColor: COLORS.headerBg,
    padding: 14,
    borderRadius: 10,
    marginBottom: 12,
  },
  orderCode: {
    color: COLORS.accent,
    fontSize: 13,
    fontWeight: '800',
  },
  customerName: {
    color: COLORS.surface,
    fontSize: 16,
    fontWeight: '900',
    marginTop: 2,
  },
  addressText: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 4,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginLeft: 8,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
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
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.danger,
    marginTop: 2,
  },
  paidBadgeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.successLight,
    padding: 10,
    borderRadius: 8,
  },
  paidBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
    marginLeft: 6,
  },
  freshCheckText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 12,
    color: COLORS.textPrimary,
    fontWeight: '600',
    lineHeight: 16,
  },
  photoPreviewBox: {
    width: '100%',
    height: 160,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  retakeBtn: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
  },
  retakeText: {
    color: COLORS.surface,
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 4,
  },
  bottomBar: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderColor: COLORS.border,
  },
  confirmBtn: {
    backgroundColor: COLORS.primary,
    height: 46,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmBtnText: {
    color: COLORS.surface,
    fontSize: 14,
    fontWeight: '900',
  },
});
