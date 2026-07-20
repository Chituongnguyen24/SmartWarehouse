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
} from 'react-native';
import { useCart } from '../context/CartContext';
import { OrderStatusBadge } from '../components/OrderStatusBadge';
import { COLORS } from '../theme/colors';
import { Order, OrderStatus } from '../types/cart';
import { Clock, MapPin, ChevronRight, Package, Truck, CheckCircle, RefreshCw } from 'lucide-react-native';

interface OrdersScreenProps {
  onNavigateToShop: () => void;
}

export const OrdersScreen: React.FC<OrdersScreenProps> = ({ onNavigateToShop }) => {
  const { ordersList, refreshOrders } = useCart();
  const [activeTab, setActiveTab] = useState<'ALL' | 'PROCESSING' | 'COMPLETED'>('ALL');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(
    ordersList.length > 0 ? ordersList[0].id : null
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshOrders();
    setIsRefreshing(false);
  };

  const filteredOrders = ordersList.filter(o => {
    if (activeTab === 'PROCESSING') return o.status === 'PENDING' || o.status === 'PICKING' || o.status === 'PACKED' || o.status === 'SHIPPED';
    if (activeTab === 'COMPLETED') return o.status === 'CONFIRMED' || o.status === 'CANCELLED';
    return true;
  });

  const formatPrice = (val: number) => val.toLocaleString('vi-VN') + 'đ';

  return (
    <SafeAreaView style={styles.safeContainer}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Lịch Sử & Theo Dõi Đơn Hàng</Text>
        <TouchableOpacity style={styles.refreshBtn} onPress={handleRefresh} disabled={isRefreshing}>
          <RefreshCw size={16} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'ALL' && styles.tabBtnActive]}
          onPress={() => setActiveTab('ALL')}
        >
          <Text style={[styles.tabText, activeTab === 'ALL' && styles.tabTextActive]}>Tất cả ({ordersList.length})</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'PROCESSING' && styles.tabBtnActive]}
          onPress={() => setActiveTab('PROCESSING')}
        >
          <Text style={[styles.tabText, activeTab === 'PROCESSING' && styles.tabTextActive]}>Đang xử lý</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'COMPLETED' && styles.tabBtnActive]}
          onPress={() => setActiveTab('COMPLETED')}
        >
          <Text style={[styles.tabText, activeTab === 'COMPLETED' && styles.tabTextActive]}>Đã hoàn tất</Text>
        </TouchableOpacity>
      </View>

      {filteredOrders.length === 0 ? (
        <View style={styles.emptyBox}>
          <Package size={54} color={COLORS.textMuted} />
          <Text style={styles.emptyTitle}>Chưa có đơn hàng nào</Text>
          <Text style={styles.emptySub}>Thực phẩm tươi ngon đang chờ bạn trong gian hàng CityMart!</Text>
          <TouchableOpacity style={styles.shopBtn} onPress={onNavigateToShop}>
            <Text style={styles.shopBtnText}>Mua Sắm Ngay</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {filteredOrders.map(order => {
            const isExpanded = expandedOrderId === order.id;

            return (
              <View key={order.id} style={styles.orderCard}>
                {/* Header Row */}
                <TouchableOpacity
                  style={styles.orderHeaderRow}
                  onPress={() => setExpandedOrderId(isExpanded ? null : order.id)}
                  activeOpacity={0.8}
                >
                  <View>
                    <Text style={styles.orderIdText}>Mã đơn: #{order.id}</Text>
                    <Text style={styles.orderTimeText}>{order.createdAt}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <OrderStatusBadge status={order.status} />
                  </View>
                </TouchableOpacity>

                {/* Items Summary Preview */}
                <View style={styles.itemsPreview}>
                  {order.items.map((item, idx) => (
                    <View key={idx} style={styles.previewItemRow}>
                      <Image source={{ uri: item.product.imageUrl }} style={styles.previewImage} />
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={styles.previewItemName} numberOfLines={1}>
                          {item.product.name}
                        </Text>
                        <Text style={styles.previewItemUnit}>
                          {item.product.unit} x {item.quantity}
                        </Text>
                      </View>
                      <Text style={styles.previewItemPrice}>
                        {formatPrice(item.product.price * item.quantity)}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Status Timeline Progress */}
                {isExpanded && order.statusHistory && (
                  <View style={styles.timelineBox}>
                    <Text style={styles.timelineTitle}>Tiến trình đơn hàng (CityMart FEFO)</Text>
                    {order.statusHistory.map((hist, hIdx) => (
                      <View key={hIdx} style={styles.timelineRow}>
                        <View style={styles.timelineDotLine}>
                          <View style={styles.timelineDot} />
                          {hIdx < order.statusHistory.length - 1 && <View style={styles.timelineLine} />}
                        </View>
                        <View style={styles.timelineContent}>
                          <Text style={styles.timelineTime}>{hist.time}</Text>
                          <Text style={styles.timelineNote}>{hist.note}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {/* Order Footer */}
                <View style={styles.orderFooterRow}>
                  <View>
                    <Text style={styles.footerLabel}>Tổng tiền thanh toán</Text>
                    <Text style={styles.footerPrice}>{formatPrice(order.finalAmount)}</Text>
                  </View>

                  <TouchableOpacity
                    style={styles.detailExpandBtn}
                    onPress={() => setExpandedOrderId(isExpanded ? null : order.id)}
                  >
                    <Text style={styles.detailExpandText}>
                      {isExpanded ? 'Thu gọn' : 'Xem tiến trình'}
                    </Text>
                    <ChevronRight size={14} color={COLORS.primary} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
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
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderColor: COLORS.border,
    position: 'relative',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  refreshBtn: {
    position: 'absolute',
    right: 14,
    padding: 6,
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabBtnActive: {
    borderBottomWidth: 3,
    borderColor: COLORS.primary,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: COLORS.primaryDark,
    fontWeight: '800',
  },
  scrollContent: {
    padding: 10,
    paddingBottom: 24,
  },
  emptyBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginTop: 14,
  },
  emptySub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  shopBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  shopBtnText: {
    color: COLORS.surface,
    fontWeight: '800',
    fontSize: 13,
  },
  orderCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  orderHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: COLORS.borderLight,
    paddingBottom: 8,
    marginBottom: 8,
  },
  orderIdText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  orderTimeText: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  itemsPreview: {
    marginBottom: 8,
  },
  previewItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  previewImage: {
    width: 36,
    height: 36,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
  },
  previewItemName: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  previewItemUnit: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  previewItemPrice: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  timelineBox: {
    backgroundColor: COLORS.background,
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  timelineTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.primaryDark,
    marginBottom: 8,
  },
  timelineRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  timelineDotLine: {
    alignItems: 'center',
    marginRight: 8,
    width: 14,
  },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    marginTop: 4,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: COLORS.primaryLight,
    marginTop: 2,
  },
  timelineContent: {
    flex: 1,
  },
  timelineTime: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  timelineNote: {
    fontSize: 11,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  orderFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderColor: COLORS.borderLight,
    paddingTop: 8,
    marginTop: 4,
  },
  footerLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  footerPrice: {
    fontSize: 15,
    fontWeight: '900',
    color: COLORS.discount,
  },
  detailExpandBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailExpandText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
    marginRight: 2,
  },
});
