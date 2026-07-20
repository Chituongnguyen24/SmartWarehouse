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
  Modal,
} from 'react-native';
import { CartItemRow } from '../components/CartItemRow';
import { useCart } from '../context/CartContext';
import { COLORS } from '../theme/colors';
import { MOCK_VOUCHERS } from '../data/mockData';
import { Voucher } from '../types/cart';
import { ShoppingBag, Ticket, ChevronRight, CheckSquare, Square, ArrowRight, ShieldAlert } from 'lucide-react-native';

interface CartScreenProps {
  onNavigateToCheckout: () => void;
  onNavigateToHome: () => void;
}

export const CartScreen: React.FC<CartScreenProps> = ({
  onNavigateToCheckout,
  onNavigateToHome,
}) => {
  const {
    cartItems,
    updateQuantity,
    removeFromCart,
    toggleSelect,
    toggleSelectAll,
    selectedVoucher,
    applyVoucher,
    subtotalAmount,
    discountAmount,
    shippingFee,
    finalAmount,
  } = useCart();

  const [showVoucherModal, setShowVoucherModal] = useState(false);

  const isAllSelected = cartItems.length > 0 && cartItems.every(i => i.selected);
  const selectedCount = cartItems.filter(i => i.selected).length;

  const formatPrice = (val: number) => val.toLocaleString('vi-VN') + 'đ';

  return (
    <SafeAreaView style={styles.safeContainer}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Giỏ Hàng ({cartItems.length})</Text>
      </View>

      {cartItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <ShoppingBag size={64} color={COLORS.textMuted} />
          <Text style={styles.emptyTitle}>Giỏ hàng của bạn đang trống</Text>
          <Text style={styles.emptyDesc}>Hãy chọn thêm thực phẩm tươi ngon cho bữa ăn gia đình!</Text>
          <TouchableOpacity style={styles.shopNowBtn} onPress={onNavigateToHome}>
            <Text style={styles.shopNowText}>Đi Chợ Ngay</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Select All Bar */}
            <View style={styles.selectAllBar}>
              <TouchableOpacity
                style={styles.selectAllBtn}
                onPress={() => toggleSelectAll(!isAllSelected)}
              >
                {isAllSelected ? (
                  <CheckSquare size={20} color={COLORS.primary} />
                ) : (
                  <Square size={20} color={COLORS.border} />
                )}
                <Text style={styles.selectAllText}>Chọn tất cả ({cartItems.length} sản phẩm)</Text>
              </TouchableOpacity>
            </View>

            {/* Item List */}
            <View style={styles.itemList}>
              {cartItems.map(item => (
                <CartItemRow
                  key={item.product.id}
                  item={item}
                  onUpdateQty={(delta) => updateQuantity(item.product.id, delta)}
                  onToggleSelect={() => toggleSelect(item.product.id)}
                  onRemove={() => removeFromCart(item.product.id)}
                />
              ))}
            </View>

            {/* Voucher Banner */}
            <TouchableOpacity
              style={styles.voucherSection}
              onPress={() => setShowVoucherModal(true)}
              activeOpacity={0.8}
            >
              <View style={styles.voucherLeft}>
                <Ticket size={20} color={COLORS.primary} />
                <Text style={styles.voucherLabel}>Mã giảm giá CityMart</Text>
              </View>

              <View style={styles.voucherRight}>
                <Text style={styles.voucherValueText}>
                  {selectedVoucher ? selectedVoucher.code : 'Chọn hoặc nhập mã'}
                </Text>
                <ChevronRight size={16} color={COLORS.textMuted} />
              </View>
            </TouchableOpacity>

            {/* Price Breakdown */}
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Chi tiết thanh toán</Text>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Tạm tính ({selectedCount} sản phẩm)</Text>
                <Text style={styles.summaryVal}>{formatPrice(subtotalAmount)}</Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Phí giao hàng (Dự kiến 2h)</Text>
                <Text style={styles.summaryVal}>{formatPrice(shippingFee)}</Text>
              </View>

              {discountAmount > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Giảm giá voucher</Text>
                  <Text style={styles.discountVal}>-{formatPrice(discountAmount)}</Text>
                </View>
              )}

              <View style={[styles.summaryRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>Tổng tiền thanh toán</Text>
                <Text style={styles.totalVal}>{formatPrice(finalAmount)}</Text>
              </View>
            </View>
          </ScrollView>

          {/* Bottom Sticky Checkout Bar */}
          <View style={styles.bottomBar}>
            <View style={styles.bottomPriceInfo}>
              <Text style={styles.bottomPriceLabel}>Tổng thanh toán:</Text>
              <Text style={styles.bottomPriceVal}>{formatPrice(finalAmount)}</Text>
            </View>

            <TouchableOpacity
              style={[
                styles.checkoutBtn,
                selectedCount === 0 && styles.checkoutBtnDisabled,
              ]}
              disabled={selectedCount === 0}
              onPress={onNavigateToCheckout}
              activeOpacity={0.85}
            >
              <Text style={styles.checkoutText}>Mua Hàng ({selectedCount})</Text>
              <ArrowRight size={18} color={COLORS.surface} style={{ marginLeft: 4 }} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* VOUCHER MODAL */}
      <Modal visible={showVoucherModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Chọn Mã Giảm Giá CityMart</Text>
            <ScrollView style={{ maxHeight: 300 }}>
              {MOCK_VOUCHERS.map(v => (
                <TouchableOpacity
                  key={v.code}
                  style={[
                    styles.voucherCard,
                    selectedVoucher?.code === v.code && styles.voucherCardSelected,
                  ]}
                  onPress={() => {
                    applyVoucher(selectedVoucher?.code === v.code ? null : v);
                    setShowVoucherModal(false);
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.voucherCardCode}>{v.code}</Text>
                    <Text style={styles.voucherCardTitle}>{v.title}</Text>
                    <Text style={styles.voucherCardSub}>Áp dụng cho đơn từ {formatPrice(v.minOrderValue)}</Text>
                  </View>
                  <Text style={styles.voucherCardAmount}>-{formatPrice(v.discountAmount)}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={styles.closeModalBtn}
              onPress={() => setShowVoucherModal(false)}
            >
              <Text style={styles.closeModalText}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginTop: 16,
  },
  emptyDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 20,
  },
  shopNowBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  shopNowText: {
    color: COLORS.surface,
    fontSize: 14,
    fontWeight: '800',
  },
  scrollContent: {
    padding: 10,
    paddingBottom: 20,
  },
  selectAllBar: {
    backgroundColor: COLORS.surface,
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  selectAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginLeft: 8,
  },
  itemList: {
    marginBottom: 10,
  },
  voucherSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    padding: 14,
    borderRadius: 8,
    marginBottom: 10,
  },
  voucherLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  voucherLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginLeft: 8,
  },
  voucherRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  voucherValueText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
    marginRight: 4,
  },
  summaryCard: {
    backgroundColor: COLORS.surface,
    padding: 14,
    borderRadius: 8,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  summaryVal: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  discountVal: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.discount,
  },
  totalRow: {
    borderTopWidth: 1,
    borderColor: COLORS.border,
    paddingTop: 10,
    marginTop: 6,
    marginBottom: 0,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  totalVal: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.discount,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderColor: COLORS.border,
  },
  bottomPriceInfo: {
    flex: 1,
  },
  bottomPriceLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  bottomPriceVal: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.discount,
  },
  checkoutBtn: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  checkoutBtnDisabled: {
    backgroundColor: COLORS.textMuted,
  },
  checkoutText: {
    color: COLORS.surface,
    fontSize: 14,
    fontWeight: '800',
  },
  // Voucher modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  voucherCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    marginBottom: 8,
  },
  voucherCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  voucherCardCode: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
  voucherCardTitle: {
    fontSize: 12,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  voucherCardSub: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  voucherCardAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.discount,
  },
  closeModalBtn: {
    backgroundColor: COLORS.surfaceSecondary,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 10,
    alignItems: 'center',
  },
  closeModalText: {
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
});
