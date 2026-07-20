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
  Alert,
} from 'react-native';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../theme/colors';
import { PaymentMethod, DeliverySlot } from '../types/cart';
import { MOCK_DELIVERY_SLOTS } from '../data/mockData';
import {
  MapPin,
  Clock,
  CreditCard,
  Check,
  ShieldCheck,
  ChevronRight,
  ArrowLeft,
  Banknote,
  Smartphone,
} from 'lucide-react-native';

interface CheckoutScreenProps {
  onBack: () => void;
  onOrderSuccess: (orderId: string) => void;
}

export const CheckoutScreen: React.FC<CheckoutScreenProps> = ({ onBack, onOrderSuccess }) => {
  const {
    cartItems,
    selectedSlot,
    setDeliverySlot,
    selectedVoucher,
    subtotalAmount,
    discountAmount,
    shippingFee,
    finalAmount,
    placeOrder,
  } = useCart();

  const { selectedAddress } = useAuth();

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('COD');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedItems = cartItems.filter(i => i.selected);

  const formatPrice = (val: number) => val.toLocaleString('vi-VN') + 'đ';

  const handleConfirmOrder = () => {
    setIsSubmitting(true);

    setTimeout(() => {
      const order = placeOrder(paymentMethod, selectedAddress);
      setIsSubmitting(false);
      Alert.alert(
        '🎉 Đặt hàng thành công!',
        `Mã đơn hàng của bạn là #${order.id}. Hệ thống FreshKeep đang tự động phân bổ soạn hàng theo tiêu chuẩn FEFO!`,
        [
          {
            text: 'Theo dõi đơn hàng',
            onPress: () => onOrderSuccess(order.id),
          },
        ]
      );
    }, 600);
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <ArrowLeft size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Xác Nhận & Thanh Toán</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Delivery Address Box */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionTitleRow}>
            <MapPin size={18} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Địa chỉ nhận hàng</Text>
          </View>

          <View style={styles.addressBody}>
            <Text style={styles.addressName}>
              {selectedAddress.name} <Text style={styles.addressPhone}>({selectedAddress.phone})</Text>
            </Text>
            <Text style={styles.addressFull}>{selectedAddress.fullAddress}</Text>
          </View>
        </View>

        {/* Delivery Slot Selection */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionTitleRow}>
            <Clock size={18} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Thời gian giao hàng</Text>
          </View>

          <View style={styles.slotsList}>
            {MOCK_DELIVERY_SLOTS.map(slot => {
              const isSelected = selectedSlot.id === slot.id;
              return (
                <TouchableOpacity
                  key={slot.id}
                  style={[styles.slotItem, isSelected && styles.slotItemSelected]}
                  onPress={() => setDeliverySlot(slot)}
                  activeOpacity={0.8}
                >
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={styles.slotTitle}>{slot.title}</Text>
                      {slot.isFast && <Text style={styles.fastTag}>⚡ Siêu Tốc</Text>}
                    </View>
                    <Text style={styles.slotTime}>{slot.time}</Text>
                  </View>
                  <Text style={styles.slotFee}>{formatPrice(slot.fee)}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Items Summary list preview */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Danh sách thực phẩm ({selectedItems.length})</Text>
          {selectedItems.map(item => (
            <View key={item.product.id} style={styles.itemRow}>
              <Text style={styles.itemName} numberOfLines={1}>
                {item.product.name} ({item.product.unit})
              </Text>
              <Text style={styles.itemQty}>x{item.quantity}</Text>
              <Text style={styles.itemPrice}>
                {formatPrice(item.product.price * item.quantity)}
              </Text>
            </View>
          ))}
        </View>

        {/* Payment Methods */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionTitleRow}>
            <CreditCard size={18} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Phương thức thanh toán</Text>
          </View>

          <TouchableOpacity
            style={[styles.payMethodItem, paymentMethod === 'COD' && styles.payMethodSelected]}
            onPress={() => setPaymentMethod('COD')}
          >
            <Banknote size={20} color={COLORS.primary} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.payTitle}>Tiền mặt khi nhận hàng (COD)</Text>
              <Text style={styles.paySub}>Thanh toán cho shipper khi kiểm tra đủ hàng</Text>
            </View>
            {paymentMethod === 'COD' && <Check size={18} color={COLORS.primary} />}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.payMethodItem, paymentMethod === 'MOMO' && styles.payMethodSelected]}
            onPress={() => setPaymentMethod('MOMO')}
          >
            <Smartphone size={20} color="#D82D8B" />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.payTitle}>Ví Ví MoMo</Text>
              <Text style={styles.paySub}>Thanh toán qua ví điện tử MoMo</Text>
            </View>
            {paymentMethod === 'MOMO' && <Check size={18} color={COLORS.primary} />}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.payMethodItem, paymentMethod === 'ZALOPAY' && styles.payMethodSelected]}
            onPress={() => setPaymentMethod('ZALOPAY')}
          >
            <Smartphone size={20} color="#0088FF" />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.payTitle}>Ví ZaloPay / VNPay QR</Text>
              <Text style={styles.paySub}>Quét mã QR qua tất cả ứng dụng Ngân hàng</Text>
            </View>
            {paymentMethod === 'ZALOPAY' && <Check size={18} color={COLORS.primary} />}
          </TouchableOpacity>
        </View>

        {/* Total Summary Breakdown */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Tổng kết đơn hàng</Text>
          <View style={styles.calcRow}>
            <Text style={styles.calcLabel}>Tạm tính</Text>
            <Text style={styles.calcVal}>{formatPrice(subtotalAmount)}</Text>
          </View>
          <View style={styles.calcRow}>
            <Text style={styles.calcLabel}>Phí giao hàng</Text>
            <Text style={styles.calcVal}>{formatPrice(shippingFee)}</Text>
          </View>
          {discountAmount > 0 && (
            <View style={styles.calcRow}>
              <Text style={styles.calcLabel}>Giảm giá Voucher</Text>
              <Text style={[styles.calcVal, { color: COLORS.discount }]}>-{formatPrice(discountAmount)}</Text>
            </View>
          )}
          <View style={[styles.calcRow, styles.finalCalcRow]}>
            <Text style={styles.finalLabel}>Tổng tiền:</Text>
            <Text style={styles.finalVal}>{formatPrice(finalAmount)}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Action Button */}
      <View style={styles.bottomBar}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 11, color: COLORS.textMuted }}>Tổng thanh toán</Text>
          <Text style={{ fontSize: 18, fontWeight: '900', color: COLORS.discount }}>
            {formatPrice(finalAmount)}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.confirmBtn}
          onPress={handleConfirmOrder}
          disabled={isSubmitting}
          activeOpacity={0.88}
        >
          <Text style={styles.confirmText}>
            {isSubmitting ? 'Đang Đặt Hàng...' : 'XÁC NHẬN ĐẶT HÀNG'}
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
    backgroundColor: COLORS.surface,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  backBtn: {
    padding: 6,
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  scrollContent: {
    padding: 10,
    paddingBottom: 24,
  },
  sectionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginLeft: 6,
  },
  addressBody: {
    backgroundColor: COLORS.background,
    padding: 10,
    borderRadius: 8,
  },
  addressName: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  addressPhone: {
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  addressFull: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },
  slotsList: {
    marginTop: 4,
  },
  slotItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 6,
  },
  slotItemSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  slotTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  fastTag: {
    backgroundColor: COLORS.accent,
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.primaryDark,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    marginLeft: 6,
  },
  slotTime: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  slotFee: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderColor: COLORS.borderLight,
  },
  itemName: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textPrimary,
    marginRight: 6,
  },
  itemQty: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginRight: 10,
  },
  itemPrice: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  payMethodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    marginBottom: 8,
  },
  payMethodSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  payTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  paySub: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  calcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  calcLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  calcVal: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  finalCalcRow: {
    borderTopWidth: 1,
    borderColor: COLORS.border,
    paddingTop: 8,
    marginTop: 4,
  },
  finalLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  finalVal: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.discount,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderColor: COLORS.border,
  },
  confirmBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  confirmText: {
    color: COLORS.surface,
    fontSize: 14,
    fontWeight: '800',
  },
});
