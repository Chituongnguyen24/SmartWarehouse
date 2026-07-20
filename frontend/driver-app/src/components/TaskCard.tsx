import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MapPin, Phone, Clock, Navigation, CheckCircle2, AlertCircle } from 'lucide-react-native';
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
  onStartDelivery,
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
        <TouchableOpacity style={styles.callBtn} onPress={onCallCustomer}>
          <Phone size={14} color={COLORS.primary} />
          <Text style={styles.callText}>Gọi ngay</Text>
        </TouchableOpacity>
      </View>

      {/* Address */}
      <View style={styles.addressRow}>
        <MapPin size={16} color={COLORS.primary} style={styles.iconFix} />
        <Text style={styles.addressText} numberOfLines={2}>
          {task.deliveryAddress}
        </Text>
      </View>

      {/* Items Summary & Package Note */}
      <View style={styles.packageTagRow}>
        <Text style={styles.packageTagText}>📦 {task.packageType}</Text>
        <Text style={styles.timeSlotTag}>{task.timeSlotText}</Text>
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
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  seqBadge: {
    backgroundColor: COLORS.routeBlue,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  seqText: {
    color: COLORS.surface,
    fontSize: 11,
    fontWeight: '800',
  },
  orderCode: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  statusBadge: {
    backgroundColor: COLORS.background,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  customerName: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.successLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
  },
  callText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
    marginLeft: 4,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  iconFix: {
    marginTop: 2,
    marginRight: 6,
  },
  addressText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },
  packageTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.background,
    padding: 8,
    borderRadius: 6,
    marginBottom: 8,
  },
  packageTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
    flex: 1,
    marginRight: 4,
  },
  timeSlotTag: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.primary,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderColor: COLORS.border,
    paddingTop: 8,
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
