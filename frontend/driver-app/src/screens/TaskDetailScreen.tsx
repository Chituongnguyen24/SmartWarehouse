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
  CheckCircle,
  MessageSquare,
} from 'lucide-react-native';
import { openSingleGoogleMapsNavigation } from '../utils/locationHelper';

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
    openSingleGoogleMapsNavigation(task.deliveryAddress, task.latitude, task.longitude);
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
              <View style={styles.navIconBox}>
                <Navigation size={14} color={COLORS.routeBlue} />
              </View>
              <Text style={styles.mapHeaderTitle}>Dẫn đường GPS (Điểm dừng #{task.sequenceOrder})</Text>
            </View>
            <TouchableOpacity style={styles.googleMapBtn} onPress={handleOpenMap} activeOpacity={0.8}>
              <Text style={styles.googleMapText}>Mở Google Maps ➔</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.routeTimeline}>
            <View style={styles.routePoint}>
              <View style={[styles.pointDot, { backgroundColor: COLORS.primary }]} />
              <Text style={styles.pointLabel}>Điểm xuất phát: <Text style={styles.bold}>Kho Hàng Gò Vấp (350 Quang Trung)</Text></Text>
            </View>
            <View style={styles.routeLine} />
            <View style={styles.routePoint}>
              <View style={[styles.pointDot, { backgroundColor: COLORS.danger }]} />
              <Text style={styles.pointLabel} numberOfLines={2}>Đến: <Text style={styles.bold}>{task.deliveryAddress}</Text></Text>
            </View>
          </View>

          <View style={styles.mapFooterRow}>
            <Text style={styles.mapMetaText}>Khoảng cách: <Text style={{ fontWeight: '800', color: COLORS.routeBlue }}>{task.distanceKm} km</Text></Text>
            <Text style={styles.mapMetaText}>Thời gian ước tính: <Text style={{ fontWeight: '800', color: COLORS.routeBlue }}>{task.estimatedTimeMinutes} phút</Text></Text>
          </View>
        </View>

        {/* Cold-Chain Container Temperature Check */}
        <View style={[styles.tempAlertCard, driverProfile.currentTemp <= 4 ? styles.tempGood : styles.tempWarning]}>
          <View style={styles.tempIconContainer}>
            <Thermometer size={20} color={driverProfile.currentTemp <= 4 ? COLORS.primary : COLORS.danger} />
          </View>
          <View style={{ marginLeft: 10, flex: 1 }}>
            <Text style={styles.tempTitle}>Nhiệt độ IoT thùng xe: {driverProfile.currentTemp.toFixed(1)}°C</Text>
            <Text style={styles.tempDesc}>
              {driverProfile.currentTemp <= 4
                ? 'Tiêu chuẩn tươi mát (0-4°C) an toàn tuyệt đối cho rau quả, thịt cá.'
                : 'CẢNH BÁO: Nhiệt độ vượt ngưỡng! Vui lòng kiểm tra lại thiết bị làm lạnh.'}
            </Text>
          </View>
        </View>

        {/* Customer Info Card */}
        <View style={styles.card}>
          <Text style={styles.cardSectionTitle}>Thông tin người nhận</Text>

          <View style={styles.customerHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.customerName}>{task.customerName}</Text>
              <Text style={styles.customerPhone}>📞 {task.customerPhone}</Text>
            </View>

            <View style={styles.contactActionGroup}>
              <TouchableOpacity style={[styles.iconCircleBtn, { backgroundColor: COLORS.primary }]} onPress={handleCall} activeOpacity={0.8}>
                <Phone size={18} color={COLORS.surface} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.iconCircleBtn, { backgroundColor: COLORS.routeBlue }]} onPress={handleSMS} activeOpacity={0.8}>
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
          <Text style={styles.cardSectionTitle}>Danh sách bàn giao ({task.items.length})</Text>

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
            <Text style={styles.codSummaryLabel}>Thu hộ COD:</Text>
            <Text style={[styles.codSummaryVal, task.codAmount > 0 ? { color: COLORS.danger } : { color: COLORS.primary }]}>
              {task.codAmount > 0 ? formatPrice(task.codAmount) : 'Đã thanh toán Online'}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Sticky Action Bar */}
      <View style={styles.bottomBar}>
        {task.status === 'ASSIGNED' ? (
          <TouchableOpacity
            style={[styles.actionBtnPrimary, { backgroundColor: '#059669', elevation: 4 }]}
            activeOpacity={0.88}
            onPress={() => {
              startDelivery(task.id);
              Alert.alert(
                '🚀 Đã Bắt Đầu Giao Đơn!',
                `Hệ thống trung tâm đã ghi nhận bạn đang đi giao đơn #${task.orderCode} cho khách hàng ${task.customerName}. Bạn có muốn mở Google Maps dẫn đường ngay không?`,
                [
                  { text: 'Để sau', style: 'cancel' },
                  { text: '🧭 Mở Bản Đồ', onPress: handleOpenMap },
                ]
              );
            }}
          >
            <Navigation size={20} color={COLORS.surface} style={{ marginRight: 8 }} />
            <Text style={[styles.actionBtnText, { fontSize: 15, fontWeight: '900' }]}>
              🚀 BẮT ĐẦU GIAO ĐƠN NÀY
            </Text>
          </TouchableOpacity>
        ) : task.status === 'IN_TRANSIT' ? (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity
              style={{
                flex: 1,
                backgroundColor: '#0284c7',
                paddingVertical: 14,
                borderRadius: 12,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onPress={handleOpenMap}
              activeOpacity={0.88}
            >
              <Navigation size={18} color="#fff" style={{ marginRight: 6 }} />
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13 }}>
                Dẫn Đường
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                flex: 1.4,
                backgroundColor: '#059669',
                paddingVertical: 14,
                borderRadius: 12,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: '#059669',
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.3,
                shadowRadius: 5,
                elevation: 3,
              }}
              onPress={onOpenPOD}
              activeOpacity={0.88}
            >
              <CheckCircle size={18} color="#fff" style={{ marginRight: 6 }} />
              <Text style={{ color: '#fff', fontWeight: '900', fontSize: 13 }}>
                GIAO THÀNH CÔNG
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.completedBadgeBox}>
            <ShieldCheck size={22} color={COLORS.primary} />
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
  mapCard: {
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
  navIconBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: 'rgba(37, 99, 235, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
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
    marginLeft: 8,
  },
  googleMapBtn: {
    backgroundColor: COLORS.routeBlueLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  googleMapText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.routeBlue,
  },
  routeTimeline: {
    backgroundColor: COLORS.background,
    padding: 12,
    borderRadius: 10,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pointDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
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
    height: 16,
    backgroundColor: COLORS.borderDark,
    marginLeft: 3,
    marginVertical: 2,
  },
  mapFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  mapMetaText: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  tempAlertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  tempGood: {
    backgroundColor: COLORS.successLight,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  tempWarning: {
    backgroundColor: COLORS.dangerLight,
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  tempIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tempTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  tempDesc: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
    lineHeight: 14,
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
  cardSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
    paddingBottom: 6,
  },
  customerHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  customerName: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },
  customerPhone: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
    fontWeight: '600',
  },
  contactActionGroup: {
    flexDirection: 'row',
    gap: 10,
  },
  iconCircleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 4,
  },
  addressBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.background,
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
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
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  noteTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#92400E',
  },
  noteContent: {
    fontSize: 11,
    color: '#78350F',
    marginTop: 3,
    lineHeight: 14,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
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
    fontWeight: '900',
    color: COLORS.textPrimary,
  },
  codSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
  },
  codSummaryLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  codSummaryVal: {
    fontSize: 18,
    fontWeight: '900',
  },
  bottomBar: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderColor: COLORS.border,
  },
  actionBtnPrimary: {
    backgroundColor: COLORS.routeBlue,
    height: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.routeBlue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  actionBtnSuccess: {
    backgroundColor: COLORS.primary,
    height: 48,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
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
    marginLeft: 8,
  },
});
