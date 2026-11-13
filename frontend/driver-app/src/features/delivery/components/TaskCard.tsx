import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Alert } from 'react-native';
import { MapPin, Phone, Navigation, ExternalLink, MessageSquare, CheckCircle, Package } from 'lucide-react-native';
import { DeliveryTask } from '@/types/driver';
import { COLORS } from '@/shared';

import { openSingleGoogleMapsNavigation } from '@/features/delivery';
import { resolveProductUnit, calculatePackingBoxes } from '@/shared';

interface TaskCardProps {
  task: DeliveryTask;
  onPress: () => void;
  onCallCustomer: () => void;
  onOpenSms?: () => void;
  onStartDelivery?: () => void;
  onOpenPOD?: (task: DeliveryTask) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onPress,
  onCallCustomer,
  onOpenSms,
  onStartDelivery,
  onOpenPOD,
}) => {
  const formatPrice = (amount: number) => (amount || 0).toLocaleString('vi-VN') + 'đ';

  const totalQty = (task.items || []).reduce((s, it) => s + (it.quantity || 1), 0);
  const boxCount = task.packageCount || calculatePackingBoxes(totalQty);

  const isDisposal = Boolean(task.isDisposal || task.orderCode?.includes('DISPOSAL') || task.orderCode?.includes('HUY'));

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
      {/* Header Row: Phân biệt rõ Đơn Hàng & Thứ Tự Điểm Giao */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View style={styles.seqBadge}>
            <Text style={styles.seqText}>Điểm #{task.sequenceOrder}</Text>
          </View>
          <View style={styles.orderBadgeWrapper}>
            <Text style={styles.orderLabelBadge}>ĐƠN HÀNG</Text>
            <Text style={styles.orderCode} numberOfLines={1}>
              #{task.orderCode}
            </Text>
          </View>
        </View>

        <View style={styles.statusBadge}>
          {task.status === 'IN_TRANSIT' && (
            <Text style={[styles.statusText, { color: '#0284c7' }]}>Đang giao</Text>
          )}
          {task.status === 'ASSIGNED' && (
            <Text style={[styles.statusText, { color: '#92400e' }]}>Chờ nhận</Text>
          )}
          {task.status === 'DELIVERED' && (
            <Text style={[styles.statusText, { color: '#166534' }]}>Đã giao</Text>
          )}
        </View>
      </View>

      {/* Customer Header & Quick Action Buttons */}
      <View style={styles.customerSection}>
        <Text style={styles.customerName} numberOfLines={1}>
          {task.customerName}
        </Text>
        <View style={styles.quickActionsRow}>
          <TouchableOpacity 
            style={styles.smsSmallBtn} 
            onPress={onOpenSms ? onOpenSms : handleQuickSms} 
            activeOpacity={0.7}
          >
            <MessageSquare size={13} color="#059669" style={{ marginRight: 4 }} />
            <Text style={styles.smsSmallText}>Nhắn tin</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.mapSmallBtn} onPress={handleOpenSingleGoogleMap} activeOpacity={0.7}>
            <ExternalLink size={13} color="#0284c7" style={{ marginRight: 4 }} />
            <Text style={styles.mapSmallText}>Bản đồ</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.callBtn} onPress={onCallCustomer} activeOpacity={0.7}>
            <Phone size={13} color="#0f766e" style={{ marginRight: 4 }} />
            <Text style={styles.callText}>Gọi điện</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Address */}
      <View style={styles.addressRow}>
        <View style={styles.pinWrapper}>
          <MapPin size={14} color="#0f766e" />
        </View>
        <Text style={styles.addressText} numberOfLines={2}>
          {task.deliveryAddress}
        </Text>
      </View>

      {/* Package Specification Highlight: Phân định rõ số lượng kiện hàng của đơn */}
      <View style={styles.packageCardHighlight}>
        <View style={styles.packageCardHeader}>
          <View style={styles.packageBadge}>
            <Package size={13} color="#047857" style={{ marginRight: 4 }} />
            <Text style={styles.packageBadgeText}>
              {boxCount} Kiện Hàng {task.isDisposal ? '(Thùng Tiêu Hủy)' : '(Thùng Đóng Gói)'}
            </Text>
          </View>
          <View style={styles.timeTag}>
            <Text style={styles.timeSlotTag}>{task.timeSlotText}</Text>
          </View>
        </View>

        <View style={styles.packageContentRow}>
          <Text style={styles.packageSubText}>
            Kiện gồm: <Text style={{ fontWeight: '700', color: '#0f172a' }}>{task.items?.length || 1} mặt hàng</Text> ({totalQty} sản phẩm)
          </Text>
        </View>

        {/* Package Items Preview */}
        {task.items && task.items.length > 0 && (
          <View style={styles.itemsPreviewBox}>
            <Text style={styles.itemsPreviewText} numberOfLines={2}>
              {task.items.map(it => `• ${it.name} (x${it.quantity} ${resolveProductUnit(it.name, it.unit)})`).join('   ')}
            </Text>
          </View>
        )}
      </View>

      {/* Footer Info Grid: Distance & COD */}
      <View style={styles.footerContainer}>
        <View style={styles.metaBox}>
          <Navigation size={13} color="#0284c7" />
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
          <View style={styles.inTransitBtnGroup}>
            <TouchableOpacity
              style={styles.inTransitMapBtn}
              onPress={() => {
                if (onStartDelivery) onStartDelivery();
                else onPress();
              }}
              activeOpacity={0.85}
            >
              <Navigation size={14} color="#0284c7" style={{ marginRight: 5 }} />
              <Text style={styles.inTransitMapBtnText}>
                Bắt đầu giao
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.inTransitPodBtn}
              onPress={() => {
                if (onStartDelivery) onStartDelivery();
                if (onOpenPOD) onOpenPOD(task);
                else onPress();
              }}
              activeOpacity={0.8}
            >
              <CheckCircle size={14} color="#ffffff" style={{ marginRight: 5 }} />
              <Text style={styles.inTransitPodBtnText}>
                Bàn giao ngay
              </Text>
            </TouchableOpacity>
          </View>
        ) : task.status === 'IN_TRANSIT' ? (
          <View style={styles.inTransitBtnGroup}>
            <TouchableOpacity
              style={styles.inTransitMapBtn}
              onPress={handleOpenSingleGoogleMap}
              activeOpacity={0.8}
            >
              <Navigation size={14} color="#0284c7" style={{ marginRight: 5 }} />
              <Text style={styles.inTransitMapBtnText}>
                Google Maps
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.inTransitPodBtn}
              onPress={() => {
                if (onOpenPOD) onOpenPOD(task);
                else onPress();
              }}
              activeOpacity={0.8}
            >
              <CheckCircle size={14} color="#ffffff" style={{ marginRight: 5 }} />
              <Text style={styles.inTransitPodBtnText}>
                Xác nhận bàn giao
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.deliveredInfoBox}>
            <CheckCircle size={14} color="#166534" style={{ marginRight: 5 }} />
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
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
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
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  seqText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  orderBadgeWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 1,
  },
  orderLabelBadge: {
    fontSize: 9,
    fontWeight: '800',
    color: '#0f766e',
    backgroundColor: '#ccfbf1',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 3,
    borderWidth: 0.5,
    borderColor: '#99f6e4',
  },
  orderCode: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    flexShrink: 1,
  },
  statusBadge: {
    backgroundColor: '#f8fafc',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  customerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    flexWrap: 'wrap',
    gap: 6,
  },
  customerName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0f172a',
    flex: 1,
    minWidth: 110,
  },
  quickActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 4,
  },
  callText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0f766e',
  },
  smsSmallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 4,
  },
  smsSmallText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#059669',
  },
  mapSmallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#bae6fd',
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 4,
  },
  mapSmallText: {
    fontSize: 11,
    fontWeight: '600',
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
    fontWeight: '400',
    flex: 1,
  },
  packageCardHighlight: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  packageCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  packageBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  packageBadgeText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#047857',
  },
  packageContentRow: {
    marginBottom: 5,
  },
  packageSubText: {
    fontSize: 11,
    color: '#475569',
  },
  timeTag: {
    backgroundColor: '#fffbeb',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  timeSlotTag: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#92400e',
  },
  itemsPreviewBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  itemsPreviewText: {
    fontSize: 11,
    color: '#475569',
    lineHeight: 16,
    fontWeight: '400',
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
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
    marginLeft: 4,
  },
  codBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
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
    fontSize: 11,
    color: '#475569',
    fontWeight: '500',
  },
  codValue: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  codValueDue: {
    color: '#991b1b',
  },
  codValuePaid: {
    color: '#166534',
  },
  ctaWrapper: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  startBtn: {
    backgroundColor: '#0f766e',
    paddingVertical: 9,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  startBtnText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 13,
  },
  inTransitBtnGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  inTransitMapBtn: {
    flex: 1,
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#bae6fd',
    paddingVertical: 8,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inTransitMapBtnText: {
    color: '#0284c7',
    fontWeight: '600',
    fontSize: 12,
  },
  inTransitPodBtn: {
    flex: 1.3,
    backgroundColor: '#0f766e',
    paddingVertical: 8,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inTransitPodBtnText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 12,
  },
  deliveredInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    backgroundColor: '#f0fdf4',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  deliveredInfoText: {
    color: '#166534',
    fontWeight: '600',
    fontSize: 11.5,
  },
});
