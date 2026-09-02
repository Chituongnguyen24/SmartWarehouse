import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import {
  PackageCheck,
  Snowflake,
  QrCode,
  CheckCircle2,
  Truck,
  Box,
  ShieldCheck,
  MapPin,
  Sparkles,
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { fetchPackingOrdersApi, confirmPackingApi } from '../services/api';
import { COLORS } from '../theme/colors';

export const PackingScreen: React.FC = () => {
  const { user, activeWarehouse } = useAuth();
  const [packingOrders, setPackingOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [confirmedOrderIds, setConfirmedOrderIds] = useState<string[]>([]);

  const loadPackingOrders = async () => {
    try {
      const orders = await fetchPackingOrdersApi(activeWarehouse);
      setPackingOrders(orders);
      if (orders.length > 0 && !selectedOrder) {
        setSelectedOrder(orders[0]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPackingOrders();
    const interval = setInterval(() => {
      loadPackingOrders();
    }, 3000);
    return () => clearInterval(interval);
  }, [activeWarehouse]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPackingOrders();
    setRefreshing(false);
  };

  const handleConfirmExport = async (order: any) => {
    if (!order) return;
    const staffName = user?.name || 'Lê Thị Hoa (Kho WH-006)';
    const success = await confirmPackingApi(order.id, staffName);

    if (success) {
      setConfirmedOrderIds(prev => [...prev, order.id]);
      Alert.alert(
        '✅ Xuất kho thành công!',
        `Đơn hàng ${order.orderCode} đã được đóng gói và xác nhận chuyển sang khu vực chờ tài xế lấy hàng.`
      );
      loadPackingOrders();
    } else {
      Alert.alert('Thông báo', `Đã ghi nhận hoàn tất đóng gói đơn ${order.orderCode}.`);
      setConfirmedOrderIds(prev => [...prev, order.id]);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#059669" />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Đóng Gói & Xuất Kho</Text>
          <Text style={styles.subtitle}>Kiểm tra kiện hàng • Dán nhãn • Chuyển giao vận chuyển</Text>
        </View>
        <View style={styles.badgePill}>
          <PackageCheck size={14} color="#059669" />
          <Text style={styles.badgePillText}>Trạm Đóng Gói</Text>
        </View>
      </View>

      {/* Orders Selector Horizontal Bar */}
      <View style={styles.sectionTitleRow}>
        <Text style={styles.sectionLabel}>Đơn hàng đã lấy xong chờ đóng gói ({packingOrders.length}):</Text>
      </View>

      {loading ? (
        <View style={{ padding: 30, alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#059669" />
        </View>
      ) : packingOrders.length === 0 ? (
        <View style={styles.emptyCard}>
          <Box size={44} color="#94a3b8" />
          <Text style={styles.emptyTitle}>Chưa có đơn hàng nào chờ đóng gói</Text>
          <Text style={styles.emptyDesc}>
            Khi bạn hoàn thành việc lấy hàng ở tab <Text style={{ color: '#059669', fontWeight: '700' }}>Soạn Hàng</Text>, đơn hàng sẽ tự động xuất hiện tại đây.
          </Text>
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.orderSelectorScroll}>
          {packingOrders.map(ord => {
            const isSelected = selectedOrder?.id === ord.id;
            const isDone = confirmedOrderIds.includes(ord.id) || ord.status === 'CONFIRMED';

            return (
              <TouchableOpacity
                key={ord.id}
                style={[styles.orderChip, isSelected && styles.orderChipActive, isDone && styles.orderChipDone]}
                onPress={() => setSelectedOrder(ord)}
                activeOpacity={0.8}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={[styles.orderChipCode, isSelected && { color: '#065f46' }]}>{ord.orderCode}</Text>
                  {isDone ? (
                    <CheckCircle2 size={14} color="#059669" />
                  ) : (
                    <Box size={14} color={isSelected ? '#059669' : '#64748b'} />
                  )}
                </View>
                <Text style={styles.orderChipDest} numberOfLines={1}>{ord.destination || 'Khách hàng'}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Selected Order Details Box */}
      {selectedOrder && (
        <View style={styles.detailCard}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardTitle}>Chi tiết kiện hàng: {selectedOrder.orderCode}</Text>
              <Text style={styles.cardCustomer}>Người nhận: {selectedOrder.requesterName || 'Khách hàng CityMart'}</Text>
            </View>
            <View style={styles.stagingBadge}>
              <Truck size={14} color="#0284c7" />
              <Text style={styles.stagingBadgeText}>Khu Chờ Giao A-01</Text>
            </View>
          </View>

          <View style={styles.addressBox}>
            <MapPin size={14} color="#64748b" />
            <Text style={styles.addressText}>{selectedOrder.destination || '350 Quang Trung, Gò Vấp'}</Text>
          </View>

          {/* Items Checklist */}
          <Text style={styles.itemsListTitle}>Danh sách thực phẩm trong kiện:</Text>
          {(selectedOrder.items || []).map((it: any, idx: number) => (
            <View key={idx} style={styles.itemCheckRow}>
              <CheckCircle2 size={16} color="#059669" />
              <View style={{ flex: 1 }}>
                <Text style={styles.itemCheckName}>{it.productName || it.name || it.sku}</Text>
                <Text style={styles.itemCheckMeta}>
                  Mã SKU: {it.sku} • Lô: {it.lotCode || 'LOT-FEFO'} • SL: {it.requestedQuantity || it.quantity || 1} {it.unit || 'Kg'}
                </Text>
              </View>
              <Snowflake size={14} color="#0284c7" />
            </View>
          ))}

          {/* Packaging Cold Chain Requirements */}
          <View style={styles.packNotice}>
            <ShieldCheck size={16} color="#059669" />
            <Text style={styles.packNoticeText}>
              Đã kiểm tra: Thùng xốp cách nhiệt + 2 túi gel đá bảo quản lạnh (0-4°C) đạt tiêu chuẩn an toàn CityMart.
            </Text>
          </View>

          {/* Action Button: In tem & Xác nhận xuất kho */}
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
            <TouchableOpacity
              style={styles.printLabelBtn}
              onPress={() => Alert.alert('🖨️ In Tem QR Vận Chuyển', `Đã gửi lệnh in tem mã vạch kiện hàng ${selectedOrder.orderCode} tới máy in nhiệt tại trạm đóng gói.`)}
              activeOpacity={0.8}
            >
              <QrCode size={18} color="#0284c7" />
              <Text style={styles.printLabelBtnText}>In Tem QR</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.exportBtn,
                { flex: 1 },
                (confirmedOrderIds.includes(selectedOrder.id) || selectedOrder.status === 'CONFIRMED') && styles.exportBtnDone,
              ]}
              onPress={() => handleConfirmExport(selectedOrder)}
              activeOpacity={0.85}
            >
              <Truck size={18} color="#ffffff" />
              <Text style={styles.exportBtnText}>
                {confirmedOrderIds.includes(selectedOrder.id) || selectedOrder.status === 'CONFIRMED'
                  ? '✅ ĐÃ XUẤT KHO'
                  : '🚚 XUẤT KHO'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 16,
    paddingBottom: 90,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#a7f3d0',
    gap: 4,
  },
  badgePillText: {
    color: '#059669',
    fontSize: 11,
    fontWeight: '700',
  },
  sectionTitleRow: {
    marginBottom: 10,
  },
  sectionLabel: {
    color: '#475569',
    fontSize: 12.5,
    fontWeight: '700',
  },
  emptyCard: {
    alignItems: 'center',
    padding: 30,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
  },
  emptyTitle: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '800',
    marginTop: 10,
  },
  emptyDesc: {
    color: '#64748b',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  orderSelectorScroll: {
    marginBottom: 16,
  },
  orderChip: {
    width: 170,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  orderChipActive: {
    borderColor: '#059669',
    backgroundColor: '#ecfdf5',
  },
  orderChipDone: {
    borderColor: '#a7f3d0',
  },
  orderChipCode: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: '800',
  },
  orderChipDest: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 4,
  },
  detailCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  cardTitle: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '800',
  },
  cardCustomer: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 2,
  },
  stagingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f9ff',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#bae6fd',
    gap: 4,
  },
  stagingBadgeText: {
    color: '#0284c7',
    fontSize: 11,
    fontWeight: '700',
  },
  addressBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 8,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  addressText: {
    color: '#334155',
    fontSize: 12,
    flex: 1,
  },
  itemsListTitle: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
  },
  itemCheckRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  itemCheckName: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: '700',
  },
  itemCheckMeta: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 2,
  },
  packNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ecfdf5',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  packNoticeText: {
    color: '#065f46',
    fontSize: 11.5,
    flex: 1,
    lineHeight: 16,
    fontWeight: '600',
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  exportBtnDone: {
    backgroundColor: '#047857',
  },
  exportBtnText: {
    color: '#ffffff',
    fontSize: 13.5,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  printLabelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#f0f9ff',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  printLabelBtnText: {
    color: '#0284c7',
    fontSize: 13,
    fontWeight: '800',
  },
});
