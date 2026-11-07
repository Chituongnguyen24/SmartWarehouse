import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Alert } from 'react-native';
import { MapPin, Phone, Navigation, ExternalLink, MessageSquare } from 'lucide-react-native';
import { DeliveryTask } from '../types/driver';
import { COLORS } from '../theme/colors';

import { openSingleGoogleMapsNavigation } from '../utils/locationHelper';
import { resolveProductUnit, calculatePackingBoxes } from '../utils/productUnitHelper';

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

  const totalQty = (task.items || []).reduce((s, it) => s + (it.quantity || 1), 0);
  const boxCount = task.packageCount || calculatePackingBoxes(totalQty);

  const handleOpenSingleGoogleMap = () => {
    openSingleGoogleMapsNavigation(task.deliveryAddress, task.latitude, task.longitude);
  };

  const handleQuickSms = () => {
    const cleanPhone = (task.customerPhone || '0901234567').replace(/\D/g, '');
    const msg = `Chào bạn, tài xế C.T Mart đang giao đơn hàng #${task.orderCode} tới ${task.deliveryAddress}. Dự kiến đến trong 5-10 phút nữa. Vui lòng chuẩn bị nhận hàng nhé!`;
    Linking.openURL(`sms:${cleanPhone}?body=${encodeURIComponent(msg)}`).catch(() => {
      Alert.alert('Tin nhắn', msg);
    });
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.88}>
      {/* Header Row */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View style={styles.seqBadge}>
            <Text style={styles.seqText}>Điểm #{task.sequenceOrder}</Text>
          </View>
          <Text style={styles.orderCode} numberOfLines={1}>
            #{task.orderCode}
          </Text>
        </View>

        <View style={styles.statusBadge}>
          {task.status === 'IN_TRANSIT' && (
            <Text style={[styles.statusText, { color: COLORS.routeBlue }]}>Đang giao</Text>
          )}
          {task.status === 'ASSIGNED' && (
            <Text style={[styles.statusText, { color: COLORS.warning }]}>Chờ nhận</Text>
          )}
          {task.status === 'DELIVERED' && (
            <Text style={[styles.statusText, { color: COLORS.primary }]}>Đã giao</Text>
          )}
        </View>
      </View>

      {/* Customer Header & Quick Action Buttons */}
      <View style={styles.customerSection}>
        <Text style={styles.customerName}>{task.customerName}</Text>
        <View style={styles.quickActionsRow}>
          <TouchableOpacity style={styles.smsSmallBtn} onPress={handleQuickSms} activeOpacity={0.7}>
            <MessageSquare size={12} color="#059669" style={{ marginRight: 3 }} />
            <Text style={styles.smsSmallText}>Báo 5p</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.mapSmallBtn} onPress={handleOpenSingleGoogleMap} activeOpacity={0.7}>
            <ExternalLink size={12} color="#0284c7" style={{ marginRight: 3 }} />
            <Text style={styles.mapSmallText}>Maps</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.callBtn} onPress={onCallCustomer} activeOpacity={0.7}>
            <Phone size={12} color={COLORS.primary} style={{ marginRight: 3 }} />
            <Text style={styles.callText}>Gọi điện</Text>
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
        <Text style={styles.packageTagText}>
          <Text style={{ fontWeight: '800', color: '#0f172a' }}>{boxCount} Thùng đóng gói</Text> • {totalQty} sản phẩm
        </Text>
        <View style={styles.timeTag}>
          <Text style={styles.timeSlotTag}>{task.timeSlotText}</Text>
        </View>
      </View>

      {/* Package Items Preview */}
      {task.items && task.items.length > 0 && (
        <View style={styles.itemsPreviewBox}>
          <Text style={styles.itemsPreviewText} numberOfLines={3}>
            {task.items.map(it => `• ${it.name} (x${it.quantity} ${resolveProductUnit(it.name, it.unit)})`).join('   ')}
          </Text>
        </View>
      )}

      {/* Footer Info Grid: GPS Distance on Left, COD on Right (Separated & Stackable) */}
      <View style={styles.footerContainer}>
        <View style={styles.metaBox}>
          <Navigation size={12} color={COLORS.routeBlue} />
          <Text style={styles.metaText}>
            {task.distanceKm} km (~{task.estimatedTimeMinutes} phút)
          </Text>
        </View>

        <View style={[styles.codBox, task.codAmount > 0 ? styles.codBoxDue : styles.codBoxPaid]}>
          <Text style={styles.codLabel}>Thu hộ (COD): </Text>
          <Text style={[styles.codValue, task.codAmount > 0 ? styles.codValueDue : styles.codValuePaid]}>
            {task.codAmount > 0 ? formatPrice(task.codAmount) : 'Đã thanh toán (0đ)'}
          </Text>
        </View>
      </View>

      {/* Action CTA Button */}
      <View style={styles.ctaWrapper}>
        {task.status === 'ASSIGNED' ? (
          <TouchableOpacity
            style={styles.startBtn}
            onPress={() => {
              if (onStartDelivery) onStartDelivery();
              else onPress();
            }}
            activeOpacity={0.85}
          >
            <Navigation size={15} color="#fff" style={{ marginRight: 6 }} />
            <Text style={styles.startBtnText}>
              Bắt Đầu Giao Đơn Này
            </Text>
          </TouchableOpacity>
        ) : task.status === 'IN_TRANSIT' ? (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              style={styles.inTransitMapBtn}
              onPress={handleOpenSingleGoogleMap}
              activeOpacity={0.8}
            >
              <Navigation size={14} color="#fff" style={{ marginRight: 4 }} />
              <Text style={styles.inTransitMapBtnText}>
                Mở Google Maps
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.inTransitPodBtn}
              onPress={onPress}
              activeOpacity={0.8}
            >
              <Text style={styles.inTransitPodBtnText}>
                Bàn Giao & POD
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.deliveredInfoBox}>
            <Text style={styles.deliveredInfoText}>
              Đã giao thành công lúc {task.deliveredAt || 'Hôm nay'}
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
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 6,
  },
  seqBadge: {
    backgroundColor: '#0f766e',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  seqText: {
    color: '#fff',
    fontSize: 10.5,
    fontWeight: '800',
  },
  orderCode: {
    fontSize: 12.5,
    fontWeight: '800',
    color: COLORS.textPrimary,
    flexShrink: 1,
  },
  statusBadge: {
    backgroundColor: '#f8fafc',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  customerSection: {
    marginBottom: 8,
  },
  customerName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    lineHeight: 19,
    marginBottom: 6,
  },
  quickActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
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
  smsSmallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  smsSmallText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
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
    marginBottom: 8,
  },
  pinWrapper: {
    marginTop: 2,
    marginRight: 6,
  },
  addressText: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 17,
    fontWeight: '500',
    flex: 1,
  },
  packageTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 6,
    gap: 6,
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
  itemsPreviewBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 6,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  itemsPreviewText: {
    fontSize: 10.5,
    color: '#334155',
    lineHeight: 16,
    fontWeight: '500',
  },
  footerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 6,
    paddingTop: 4,
  },
  metaBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 10.5,
    color: '#64748b',
    fontWeight: '600',
    marginLeft: 4,
  },
  codBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  codBoxDue: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  codBoxPaid: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  codLabel: {
    fontSize: 10.5,
    color: '#475569',
    fontWeight: '500',
  },
  codValue: {
    fontSize: 11,
    fontWeight: '800',
  },
  codValueDue: {
    color: '#dc2626',
  },
  codValuePaid: {
    color: '#16a34a',
  },
  ctaWrapper: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  startBtn: {
    backgroundColor: '#059669',
    paddingVertical: 10,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  startBtnText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 13,
  },
  inTransitMapBtn: {
    flex: 1,
    backgroundColor: '#0284c7',
    paddingVertical: 10,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inTransitMapBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 12,
  },
  inTransitPodBtn: {
    flex: 1.2,
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inTransitPodBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 12,
  },
  deliveredInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  deliveredInfoText: {
    color: '#16a34a',
    fontWeight: '700',
    fontSize: 12,
  },
});
