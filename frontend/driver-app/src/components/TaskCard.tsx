import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MapPin, Phone, Navigation } from 'lucide-react-native';
import { DeliveryTask } from '../types/driver';
import { COLORS } from '../theme/colors';

interface TaskCardProps {
  task: DeliveryTask;
  onPress: () => void;
  onCallCustomer: () => void;
  onStartDelivery?: () => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onPress,
  onCallCustomer,
}) => {
  const formatPrice = (amount: number) => amount.toLocaleString('vi-VN') + 'đ';

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.88}>
      {/* Header Row */}
      <View style={styles.headerRow}>
        <View style={styles.seqBadge}>
          <Text style={styles.seqText}>Điểm #{task.sequenceOrder}</Text>
        </View>

        <Text style={styles.orderCode}>#{task.orderCode}</Text>

        <View style={styles.statusBadge}>
          {task.status === 'IN_TRANSIT' && (
            <Text style={[styles.statusText, { color: COLORS.routeBlue }]}>🚚 Đang giao</Text>
          )}
          {task.status === 'ASSIGNED' && (
            <Text style={[styles.statusText, { color: COLORS.warning }]}>⏳ Chờ nhận</Text>
          )}
          {task.status === 'DELIVERED' && (
            <Text style={[styles.statusText, { color: COLORS.primary }]}>✅ Đã giao</Text>
          )}
        </View>
      </View>

      {/* Customer Info */}
      <View style={styles.customerRow}>
        <Text style={styles.customerName}>{task.customerName}</Text>
        <TouchableOpacity style={styles.callBtn} onPress={onCallCustomer} activeOpacity={0.7}>
          <Phone size={12} color={COLORS.primary} style={{ marginRight: 3 }} />
          <Text style={styles.callText}>Gọi ngay</Text>
        </TouchableOpacity>
      </View>

      {/* Address */}
      <View style={styles.addressRow}>
        <View style={styles.pinWrapper}>
          <MapPin size={14} color={COLORS.primary} />
        </View>
        <Text style={styles.addressText} numberOfLines={2}>
          {task.deliveryAddress}
        </Text>
      </View>

      {/* Items Summary & Package Note */}
      <View style={styles.packageTagRow}>
        <Text style={styles.packageTagText}>📦 {task.packageType}</Text>
        <View style={styles.timeTag}>
          <Text style={styles.timeSlotTag}>{task.timeSlotText}</Text>
        </View>
      </View>

      {/* Footer Meta Row */}
      <View style={styles.footerRow}>
        <View style={styles.metaBox}>
          <Navigation size={12} color={COLORS.routeBlue} />
          <Text style={styles.metaText}>{task.distanceKm} km ({task.estimatedTimeMinutes} phút)</Text>
        </View>

        <View style={styles.codBox}>
          <Text style={styles.codLabel}>Thu hộ (COD): </Text>
          <Text style={[styles.codValue, task.codAmount > 0 ? { color: COLORS.danger } : { color: COLORS.primary }]}>
            {task.codAmount > 0 ? formatPrice(task.codAmount) : 'Đã thanh toán (0đ)'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  seqBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  seqText: {
    color: COLORS.surface,
    fontSize: 10,
    fontWeight: '800',
  },
  orderCode: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textSecondary,
  },
  statusBadge: {
    backgroundColor: COLORS.background,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.successLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  callText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.primary,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  pinWrapper: {
    marginTop: 2,
    marginRight: 6,
    width: 20,
    height: 20,
    borderRadius: 6,
    backgroundColor: COLORS.successLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 16,
    fontWeight: '500',
  },
  packageTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.background,
    padding: 8,
    borderRadius: 8,
    marginBottom: 10,
  },
  packageTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
    flex: 1,
    marginRight: 4,
  },
  timeTag: {
    backgroundColor: COLORS.successLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  timeSlotTag: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.primary,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderColor: COLORS.border,
    paddingTop: 10,
  },
  metaBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.routeBlue,
    marginLeft: 4,
  },
  codBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  codLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  codValue: {
    fontSize: 12,
    fontWeight: '800',
  },
});
