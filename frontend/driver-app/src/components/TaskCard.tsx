import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { MapPin, Phone, Navigation, ExternalLink } from 'lucide-react-native';
import { DeliveryTask } from '../types/driver';
import { COLORS } from '../theme/colors';

import { openSingleGoogleMapsNavigation } from '../utils/locationHelper';

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
  const formatPrice = (amount: number) => (amount || 0).toLocaleString('vi-VN') + 'đ';

  const handleOpenSingleGoogleMap = () => {
    openSingleGoogleMapsNavigation(task.deliveryAddress, task.latitude, task.longitude);
  };

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
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <TouchableOpacity style={styles.mapSmallBtn} onPress={handleOpenSingleGoogleMap} activeOpacity={0.7}>
            <ExternalLink size={12} color="#0284c7" style={{ marginRight: 3 }} />
            <Text style={styles.mapSmallText}>Maps</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.callBtn} onPress={onCallCustomer} activeOpacity={0.7}>
            <Phone size={12} color={COLORS.primary} style={{ marginRight: 3 }} />
            <Text style={styles.callText}>Gọi ngay</Text>
          </TouchableOpacity>
        </View>
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

      {/* Action CTA Button */}
      <View style={{ marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9' }}>
        {task.status === 'ASSIGNED' ? (
          <TouchableOpacity
            style={{
              backgroundColor: '#059669',
              paddingVertical: 11,
              borderRadius: 12,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#059669',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 4,
              elevation: 2,
            }}
            onPress={() => {
              if (onStartDelivery) onStartDelivery();
              else onPress();
            }}
            activeOpacity={0.8}
          >
            <Navigation size={15} color="#fff" style={{ marginRight: 6 }} />
            <Text style={{ color: '#fff', fontWeight: '900', fontSize: 13 }}>
              🚀 Bắt Đầu Giao Đơn Này
            </Text>
          </TouchableOpacity>
        ) : task.status === 'IN_TRANSIT' ? (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              style={{
                flex: 1,
                backgroundColor: '#0284c7',
                paddingVertical: 10,
                borderRadius: 10,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onPress={handleOpenSingleGoogleMap}
              activeOpacity={0.8}
            >
              <Navigation size={14} color="#fff" style={{ marginRight: 4 }} />
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 12 }}>
                Mở Google Maps
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                flex: 1.2,
                backgroundColor: COLORS.primary,
                paddingVertical: 10,
                borderRadius: 10,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onPress={onPress}
              activeOpacity={0.8}
            >
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 12 }}>
                Bàn Giao & POD ➔
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 4 }}>
            <Text style={{ color: '#16a34a', fontWeight: '700', fontSize: 12 }}>
              ✅ Đã giao thành công lúc {task.deliveredAt || 'Hôm nay'}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
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
    marginBottom: 10,
  },
  seqBadge: {
    backgroundColor: '#0f766e',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  seqText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
  },
  orderCode: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  statusBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  customerName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    flex: 1,
  },
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  callText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
  },
  mapSmallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  mapSmallText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284c7',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  pinWrapper: {
    marginTop: 2,
    marginRight: 6,
  },
  addressText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
    fontWeight: '500',
    flex: 1,
  },
  packageTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    padding: 8,
    borderRadius: 8,
    marginBottom: 10,
  },
  packageTagText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
    flex: 1,
  },
  timeTag: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  timeSlotTag: {
    fontSize: 10,
    fontWeight: '700',
    color: '#b45309',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metaBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
    marginLeft: 4,
  },
  codBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  codLabel: {
    fontSize: 11,
    color: '#64748b',
  },
  codValue: {
    fontSize: 12,
    fontWeight: '800',
  },
});
