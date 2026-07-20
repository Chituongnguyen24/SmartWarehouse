import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  StatusBar,
  Linking,
  Alert,
} from 'react-native';
import { DeliveryTask } from '../types/driver';
import { useDriverTask } from '../context/DriverTaskContext';
import { COLORS } from '../theme/colors';
import {
  ArrowLeft,
  MapPin,
  Phone,
  Navigation,
  Thermometer,
  ShieldCheck,
  Package,
  CheckCircle,
  MessageSquare,
  AlertTriangle,
} from 'lucide-react-native';

interface TaskDetailScreenProps {
  task: DeliveryTask;
  onBack: () => void;
  onOpenPOD: () => void;
}

export const TaskDetailScreen: React.FC<TaskDetailScreenProps> = ({ task, onBack, onOpenPOD }) => {
  const { startDelivery, driverProfile } = useDriverTask();

  const formatPrice = (val: number) => val.toLocaleString('vi-VN') + 'đ';

  const handleCall = () => {
    Linking.openURL(`tel:${task.customerPhone.replace(/\s+/g, '')}`);
  };

  const handleSMS = () => {
    Linking.openURL(`sms:${task.customerPhone.replace(/\s+/g, '')}?body=Chào chị/anh ${task.customerName}, tài xế CityMart đang giao thực phẩm tươi sạch đến địa chỉ ${task.deliveryAddress}.`);
  };

  const handleOpenMap = () => {
    const encodedAddr = encodeURIComponent(task.deliveryAddress);
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodedAddr}`);
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <ArrowLeft size={20} color={COLORS.surface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chi Tiết Đơn #{task.orderCode}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* GPS Map Preview Simulator Box */}
        <View style={styles.mapCard}>
          <View style={styles.mapHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Navigation size={16} color={COLORS.routeBlue} />
              <Text style={styles.mapHeaderTitle}>Dẫn đường GPS (VRP Route)</Text>
            </View>
            <TouchableOpacity style={styles.googleMapBtn} onPress={handleOpenMap}>
              <Text style={styles.googleMapText}>Mở Google Maps ➔</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.routeTimeline}>
            <View style={styles.routePoint}>
              <View style={[styles.pointDot, { backgroundColor: COLORS.primary }]} />
              <Text style={styles.pointLabel}>Điểm xuất phát: <Text style={styles.bold}>Kho CityMart Q.5</Text></Text>
            </View>
            <View style={styles.routeLine} />
            <View style={styles.routePoint}>
              <View style={[styles.pointDot, { backgroundColor: COLORS.danger }]} />
              <Text style={styles.pointLabel}>Đến: <Text style={styles.bold}>{task.deliveryAddress}</Text></Text>
            </View>
          </View>

          <View style={styles.mapFooterRow}>
            <Text style={styles.mapMetaText}>Khoảng cách: <Text style={{ fontWeight: '800', color: COLORS.routeBlue }}>{task.distanceKm} km</Text></Text>
            <Text style={styles.mapMetaText}>Thời gian ước tính: <Text style={{ fontWeight: '800', color: COLORS.routeBlue }}>{task.estimatedTimeMinutes} phút</Text></Text>
          </View>
        </View>

        {/* Cold-Chain Container Temperature Check */}
        <View style={[styles.tempAlertCard, driverProfile.currentTemp <= 4 ? styles.tempGood : styles.tempWarning]}>
          <Thermometer size={20} color={driverProfile.currentTemp <= 4 ? COLORS.primary : COLORS.danger} />
          <View style={{ marginLeft: 10, flex: 1 }}>
            <Text style={styles.tempTitle}>Nhiệt độ bảo quản kho lạnh thùng xe: {driverProfile.currentTemp.toFixed(1)}°C</Text>
            <Text style={styles.tempDesc}>
              {driverProfile.currentTemp <= 4
                ? 'Đảm bảo tiêu chuẩn tươi ngon (0-4°C). Thực phẩm thịt cá & rau củ đạt 100% chất lượng.'
                : 'CẢNH BÁO: Nhiệt độ kho lạnh vượt quá 4°C! Vui lòng kiểm tra lại tủ làm lạnh thùng xe.'}
            </Text>
          </View>
        </View>

        {/* Customer Info Card */}
        <View style={styles.card}>
          <Text style={styles.cardSectionTitle}>Thông tin người nhận</Text>

          <View style={styles.customerHeaderRow}>
            <View>
              <Text style={styles.customerName}>{task.customerName}</Text>
              <Text style={styles.customerPhone}>{task.customerPhone}</Text>
            </View>

            <View style={styles.contactActionGroup}>
              <TouchableOpacity style={styles.iconCircleBtn} onPress={handleCall}>
                <Phone size={18} color={COLORS.surface} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.iconCircleBtn, { backgroundColor: COLORS.routeBlue }]} onPress={handleSMS}>
                <MessageSquare size={18} color={COLORS.surface} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.addressBox}>
            <MapPin size={16} color={COLORS.primary} style={{ marginTop: 2, marginRight: 6 }} />
            <Text style={styles.addressFullText}>{task.deliveryAddress}</Text>
          </View>

          {task.notes && (
            <View style={styles.noteBox}>
              <Text style={styles.noteTitle}>Ghi chú khách hàng:</Text>
              <Text style={styles.noteContent}>{task.notes}</Text>
            </View>
          )}
        </View>

        {/* Items List Card */}
        <View style={styles.card}>
          <Text style={styles.cardSectionTitle}>Danh sách món bàn giao ({task.items.length})</Text>

          {task.items.map((it, idx) => (
            <View key={idx} style={styles.itemRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{it.name}</Text>
                <Text style={styles.itemMeta}>Quy cách: {it.unit}</Text>
              </View>
              <Text style={styles.itemQty}>x{it.quantity}</Text>
            </View>
          ))}

          {/* COD Summary */}
          <View style={styles.codSummaryRow}>
            <Text style={styles.codSummaryLabel}>Tổng tiền thu hộ COD:</Text>
            <Text style={[styles.codSummaryVal, task.codAmount > 0 ? { color: COLORS.danger } : { color: COLORS.primary }]}>
              {task.codAmount > 0 ? formatPrice(task.codAmount) : 'Đã thanh toán (0đ)'}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Sticky Action Bar */}
      <View style={styles.bottomBar}>
        {task.status === 'ASSIGNED' ? (
          <TouchableOpacity
            style={styles.actionBtnPrimary}
            onPress={() => {
              startDelivery(task.id);
              Alert.alert('🚚 Bắt đầu giao hàng', `Đã cập nhật trạng thái đơn #${task.orderCode} sang Đang giao hàng!`);
            }}
          >
            <Text style={styles.actionBtnText}>BẮT ĐẦU GIAO HÀNG</Text>
          </TouchableOpacity>
        ) : task.status === 'IN_TRANSIT' ? (
          <TouchableOpacity style={styles.actionBtnSuccess} onPress={onOpenPOD}>
            <CheckCircle size={20} color={COLORS.surface} style={{ marginRight: 6 }} />
            <Text style={styles.actionBtnText}>XÁC NHẬN GIAO THÀNH CÔNG (POD)</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.completedBadgeBox}>
            <CheckCircle size={20} color={COLORS.primary} />
            <Text style={styles.completedText}>ĐƠN HÀNG ĐÃ GIAO THÀNH CÔNG</Text>
          </View>
        )}
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
  mapCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  mapHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  mapHeaderTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginLeft: 6,
  },
  googleMapBtn: {
    backgroundColor: COLORS.routeBlueLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  googleMapText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.routeBlue,
  },
  routeTimeline: {
    backgroundColor: COLORS.background,
    padding: 12,
    borderRadius: 8,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pointDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  pointLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    flex: 1,
  },
  bold: {
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  routeLine: {
    width: 2,
    height: 14,
    backgroundColor: COLORS.borderDark,
    marginLeft: 4,
    marginVertical: 2,
  },
  mapFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  mapMetaText: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  tempAlertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
  },
  tempGood: {
    backgroundColor: COLORS.successLight,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  tempWarning: {
    backgroundColor: COLORS.dangerLight,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  tempTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  tempDesc: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 10,
  },
  customerHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },
  customerPhone: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  contactActionGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  iconCircleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addressBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.background,
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  addressFullText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textPrimary,
    fontWeight: '600',
    lineHeight: 16,
  },
  noteBox: {
    backgroundColor: '#FEF3C7',
    padding: 10,
    borderRadius: 8,
  },
  noteTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#92400E',
  },
  noteContent: {
    fontSize: 11,
    color: '#78350F',
    marginTop: 2,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  itemName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  itemMeta: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  itemQty: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  codSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
  },
  codSummaryLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  codSummaryVal: {
    fontSize: 16,
    fontWeight: '900',
  },
  bottomBar: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderColor: COLORS.border,
  },
  actionBtnPrimary: {
    backgroundColor: COLORS.routeBlue,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnSuccess: {
    backgroundColor: COLORS.primary,
    height: 44,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnText: {
    color: COLORS.surface,
    fontSize: 14,
    fontWeight: '900',
  },
  completedBadgeBox: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
  },
  completedText: {
    color: COLORS.primary,
    fontWeight: '900',
    fontSize: 14,
    marginLeft: 6,
  },
});
