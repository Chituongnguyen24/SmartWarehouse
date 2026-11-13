import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
  Linking,
  Alert,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DeliveryTask } from '@/types/driver';
import { useDriverTask } from '@/features/delivery';
import { COLORS } from '@/shared';
import {
  ArrowLeft,
  MapPin,
  Phone,
  Navigation,
  Thermometer,
  ShieldCheck,
  CheckCircle,
  MessageSquare,
  Layers,
  Copy,
  Check,
  X,
} from 'lucide-react-native';
import { openSingleGoogleMapsNavigation } from '@/features/delivery';
import { resolveProductUnit, calculatePackingBoxes } from '@/shared';

interface TaskDetailScreenProps {
  task: DeliveryTask;
  onBack: () => void;
  onOpenPOD: () => void;
}

export const TaskDetailScreen: React.FC<TaskDetailScreenProps> = ({ task: initialTask, onBack, onOpenPOD }) => {
  const insets = useSafeAreaInsets();
  const { startDelivery, driverProfile, tasks } = useDriverTask();
  const task = tasks.find(t => 
    t.id === initialTask.id || 
    t.id?.toLowerCase() === initialTask.id?.toLowerCase() || 
    (t.orderCode && t.orderCode === initialTask.orderCode)
  ) || initialTask;

  const topPadding = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0);
  const bottomPadding = insets.bottom > 0 ? insets.bottom + 6 : (Platform.OS === 'android' ? 20 : 14);

  const formatPrice = (val: number) => val.toLocaleString('vi-VN') + 'đ';

  // Find same-destination peer tasks
  const isSameLocation = (a: DeliveryTask, b: DeliveryTask) => {
    if (a.id === b.id) return false;
    if (b.status === 'DELIVERED') return false;

    const addrA = (a.deliveryAddress || (a as any).customerAddress || '').trim().toLowerCase();
    const addrB = (b.deliveryAddress || (b as any).customerAddress || '').trim().toLowerCase();
    if (addrA && addrB && (addrA === addrB || addrA.includes(addrB) || addrB.includes(addrA))) return true;

    const nameA = (a.customerName || '').trim().toLowerCase();
    const nameB = (b.customerName || '').trim().toLowerCase();
    if (nameA && nameB && nameA === nameB) return true;

    if (
      (nameA.includes('đa phước') || addrA.includes('đa phước')) &&
      (nameB.includes('đa phước') || addrB.includes('đa phước'))
    ) {
      return true;
    }

    return false;
  };

  const sameLocationTasks = tasks.filter(t => isSameLocation(task, t));

  // Customer Contact Modal State (Phone & SMS)
  const [contactModal, setContactModal] = useState<{
    visible: boolean;
    type: 'CALL' | 'SMS';
    customerName: string;
    phone: string;
    orderCode?: string;
    address?: string;
  } | null>(null);
  const [contactCopiedToast, setContactCopiedToast] = useState<string | null>(null);

  const copyToClipboard = (text: string, label: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text);
    }
    setContactCopiedToast(`Đã sao chép ${label}!`);
    setTimeout(() => setContactCopiedToast(null), 2500);
  };

  const handleCall = () => {
    const cleanPhone = (task.customerPhone || '').replace(/\s+/g, '');
    if (Platform.OS !== 'web') {
      Linking.openURL(`tel:${cleanPhone}`).catch(() => {
        setContactModal({
          visible: true,
          type: 'CALL',
          customerName: task.customerName,
          phone: task.customerPhone,
          orderCode: task.orderCode,
        });
      });
      return;
    }
    setContactModal({
      visible: true,
      type: 'CALL',
      customerName: task.customerName,
      phone: task.customerPhone,
      orderCode: task.orderCode,
    });
  };

  const handleSMS = () => {
    const cleanPhone = (task.customerPhone || '').replace(/\s+/g, '');
    const msg = `Chào chị/anh ${task.customerName}, tài xế CityMart đang giao thực phẩm tươi sạch đến địa chỉ ${task.deliveryAddress}.`;
    if (Platform.OS !== 'web') {
      Linking.openURL(`sms:${cleanPhone}?body=${encodeURIComponent(msg)}`).catch(() => {
        setContactModal({
          visible: true,
          type: 'SMS',
          customerName: task.customerName,
          phone: task.customerPhone,
          orderCode: task.orderCode,
          address: task.deliveryAddress,
        });
      });
      return;
    }
    setContactModal({
      visible: true,
      type: 'SMS',
      customerName: task.customerName,
      phone: task.customerPhone,
      orderCode: task.orderCode,
      address: task.deliveryAddress,
    });
  };

  const handleOpenMap = () => {
    openSingleGoogleMapsNavigation(task.deliveryAddress, task.latitude, task.longitude);
  };

  return (
    <View style={[styles.safeContainer, { paddingTop: topPadding }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <ArrowLeft size={20} color={COLORS.surface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chi Tiết Đơn #{task.orderCode}</Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* GPS Navigation Map Card */}
        <View style={styles.mapCard}>
          <View style={styles.mapHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={styles.navIconBox}>
                <Navigation size={14} color="#0284c7" />
              </View>
              <Text style={styles.mapHeaderTitle}>Dẫn đường giao hàng (Điểm dừng #{task.sequenceOrder})</Text>
            </View>
            <TouchableOpacity style={styles.googleMapBtn} onPress={handleOpenMap} activeOpacity={0.8}>
              <Text style={styles.googleMapText}>Mở Google Maps</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.routeTimeline}>
            <View style={styles.routePoint}>
              <View style={[styles.pointDot, { backgroundColor: '#0f766e' }]} />
              <Text style={styles.pointLabel}>Điểm xuất phát: <Text style={styles.bold}>Kho Hàng Gò Vấp (350 Quang Trung)</Text></Text>
            </View>
            <View style={styles.routeLine} />
            <View style={styles.routePoint}>
              <View style={[styles.pointDot, { backgroundColor: '#dc2626' }]} />
              <Text style={styles.pointLabel} numberOfLines={2}>Đến: <Text style={styles.bold}>{task.deliveryAddress}</Text></Text>
            </View>
          </View>

          <View style={styles.mapFooterRow}>
            <Text style={styles.mapMetaText}>Khoảng cách: <Text style={{ fontWeight: '700', color: '#0284c7' }}>{task.distanceKm} km</Text></Text>
            <Text style={styles.mapMetaText}>Thời gian ước tính: <Text style={{ fontWeight: '700', color: '#0284c7' }}>{task.estimatedTimeMinutes} phút</Text></Text>
          </View>
        </View>

        {/* Cold-Chain Container Temperature Check */}
        <View style={[styles.tempAlertCard, driverProfile.currentTemp <= 4 ? styles.tempGood : styles.tempWarning]}>
          <View style={styles.tempIconContainer}>
            <Thermometer size={18} color={driverProfile.currentTemp <= 4 ? '#0f766e' : '#dc2626'} />
          </View>
          <View style={{ marginLeft: 10, flex: 1 }}>
            <Text style={styles.tempTitle}>Nhiệt độ thùng bảo quản: {driverProfile.currentTemp.toFixed(1)}°C</Text>
            <Text style={styles.tempDesc}>
              {driverProfile.currentTemp <= 4
                ? 'Tiêu chuẩn tươi mát (0-4°C) an toàn cho thực phẩm tươi sống.'
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
              <Text style={styles.customerPhone}>{task.customerPhone}</Text>
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
        {(() => {
          const totalQty = (task.items || []).reduce((s, it) => s + (it.quantity || 1), 0);
          const boxCount = task.packageCount || calculatePackingBoxes(totalQty);

          return (
            <View style={styles.card}>
              {/* Prominent Package Specification Banner: Phân định rõ Đơn hàng & Số lượng Kiện hàng */}
              <View style={{ backgroundColor: '#ecfdf5', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#a7f3d0', marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#047857' }}>
                    SỐ LƯỢNG KIỆN HÀNG CẦN GIAO
                  </Text>
                  <View style={{ backgroundColor: '#0f766e', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 }}>
                    <Text style={{ fontSize: 12.5, fontWeight: '900', color: '#ffffff' }}>
                      {boxCount} KIỆN HÀNG
                    </Text>
                  </View>
                </View>
                <Text style={{ fontSize: 11.5, color: '#065f46', lineHeight: 17 }}>
                  Đơn hàng <Text style={{ fontWeight: '800', color: '#0f172a' }}>#{task.orderCode}</Text> gồm đúng <Text style={{ fontWeight: '800', color: '#0f172a' }}>{boxCount} kiện (thùng)</Text>. Tài xế vui lòng kiểm đếm đủ {boxCount} kiện khi lấy khỏi xe và bàn giao cho khách.
                </Text>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, borderBottomWidth: 1, borderColor: COLORS.border, paddingBottom: 6 }}>
                <Text style={[styles.cardSectionTitle, { marginBottom: 0, borderBottomWidth: 0, paddingBottom: 0 }]}>
                  Chi tiết mặt hàng trong {boxCount} kiện ({task.items.length} loại hàng)
                </Text>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#475569' }}>
                  Tổng {totalQty} sản phẩm
                </Text>
              </View>

              {task.items.map((it, idx) => {
                const unitName = resolveProductUnit(it.name, it.unit);
                return (
                  <View key={idx} style={styles.itemRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemName}>{it.name}</Text>
                      <Text style={styles.itemMeta}>Đơn vị tính: {unitName} • Bảo quản: {it.temperatureNote || 'Lạnh 0-4°C'}</Text>
                    </View>
                    <Text style={styles.itemQty}>x{it.quantity} {unitName}</Text>
                  </View>
                );
              })}

              {/* COD Summary */}
              <View style={styles.codSummaryRow}>
                <Text style={styles.codSummaryLabel}>Thu hộ COD:</Text>
                <Text style={[styles.codSummaryVal, task.codAmount > 0 ? { color: COLORS.danger } : { color: COLORS.primary }]}>
                  {task.codAmount > 0 ? formatPrice(task.codAmount) : 'Đã thanh toán Online (0đ)'}
                </Text>
              </View>

              {/* Same-Destination Multi-Order Quick Batch Banner */}
              {sameLocationTasks.length > 0 && (() => {
                const batchTotalCod = (task.codAmount || 0) + sameLocationTasks.reduce((s, t) => s + (t.codAmount || 0), 0);
                const batchTotalBoxes = boxCount + sameLocationTasks.reduce((s, t) => s + (t.packageCount || 1), 0);

                return (
                  <View style={styles.sameLocationBanner}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Layers size={16} color="#0284c7" />
                      <Text style={styles.sameLocationBannerTitle}>
                        Cụm giao gộp ({sameLocationTasks.length + 1} đơn cùng địa chỉ nhận)
                      </Text>
                    </View>
                    <Text style={styles.sameLocationBannerDesc}>
                      Điểm giao "{task.customerName}" có tổng cộng {sameLocationTasks.length + 1} đơn hàng cần giao cùng lúc. Vui lòng kiểm tra thu hộ COD của tất cả các đơn:
                    </Text>

                    {/* Bảng kê COD & Kiện hàng chi tiết của cả 2/các đơn gộp */}
                    <View style={{ backgroundColor: '#ffffff', borderRadius: 8, padding: 10, marginVertical: 8, borderWidth: 1, borderColor: '#bae6fd' }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                        <Text style={{ fontSize: 11.5, color: '#0f172a', fontWeight: '700' }}>
                          • Đơn #{task.orderCode} (Hiện tại):
                        </Text>
                        <Text style={{ fontSize: 11.5, fontWeight: '800', color: task.codAmount > 0 ? '#dc2626' : '#15803d' }}>
                          {task.packageCount || 1} Kiện • {task.codAmount > 0 ? formatPrice(task.codAmount) : '0đ (Đã thanh toán)'}
                        </Text>
                      </View>

                      {sameLocationTasks.map(peer => (
                        <View key={peer.id} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                          <Text style={{ fontSize: 11.5, color: '#334155' }}>
                            • Đơn #{peer.orderCode} (Giao kèm):
                          </Text>
                          <Text style={{ fontSize: 11.5, fontWeight: '800', color: peer.codAmount > 0 ? '#dc2626' : '#15803d' }}>
                            {peer.packageCount || 1} Kiện • {peer.codAmount > 0 ? formatPrice(peer.codAmount) : '0đ (Đã thanh toán)'}
                          </Text>
                        </View>
                      ))}

                      <View style={{ borderTopWidth: 1, borderColor: '#e2e8f0', paddingTop: 6, marginTop: 4, flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ fontSize: 12, fontWeight: '800', color: '#0369a1' }}>
                          TỔNG THU HỘ ({sameLocationTasks.length + 1} ĐƠN • {batchTotalBoxes} KIỆN):
                        </Text>
                        <Text style={{ fontSize: 13, fontWeight: '900', color: batchTotalCod > 0 ? '#dc2626' : '#15803d' }}>
                          {batchTotalCod > 0 ? formatPrice(batchTotalCod) : '0đ COD'}
                        </Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={styles.sameLocationBannerBtn}
                      onPress={async () => {
                        if (task.status === 'ASSIGNED') {
                          await startDelivery(task.id);
                        }
                        onOpenPOD();
                      }}
                      activeOpacity={0.85}
                    >
                      <CheckCircle size={15} color="#ffffff" style={{ marginRight: 6 }} />
                      <Text style={styles.sameLocationBannerBtnText}>
                        Bàn giao nhanh cả {sameLocationTasks.length + 1} đơn ({batchTotalBoxes} kiện)
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })()}
            </View>
          );
        })()}
      </ScrollView>

      {/* Bottom Sticky Action Bar */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(bottomPadding, 24) }]}>
        {task.status === 'ASSIGNED' ? (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity
              style={[styles.actionBtnPrimary, { flex: 1 }]}
              activeOpacity={0.88}
              onPress={() => {
                startDelivery(task.id);
              }}
            >
              <Navigation size={15} color="#ffffff" style={{ marginRight: 6 }} />
              <Text style={styles.actionBtnText}>
                Bắt đầu giao
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtnSuccess, { flex: 1.3 }]}
              onPress={async () => {
                await startDelivery(task.id);
                onOpenPOD();
              }}
              activeOpacity={0.88}
            >
              <CheckCircle size={16} color="#ffffff" style={{ marginRight: 6 }} />
              <Text style={styles.actionBtnText}>
                Xác nhận bàn giao
              </Text>
            </TouchableOpacity>
          </View>
        ) : task.status === 'IN_TRANSIT' ? (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity
              style={styles.actionBtnSecondary}
              onPress={handleOpenMap}
              activeOpacity={0.88}
            >
              <Navigation size={15} color="#0284c7" style={{ marginRight: 6 }} />
              <Text style={styles.actionBtnSecondaryText}>
                Dẫn đường
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionBtnSuccess}
              onPress={onOpenPOD}
              activeOpacity={0.88}
            >
              <CheckCircle size={16} color="#ffffff" style={{ marginRight: 6 }} />
              <Text style={styles.actionBtnText}>
                Xác nhận bàn giao
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.completedBadgeBox}>
            <ShieldCheck size={18} color="#166534" style={{ marginRight: 6 }} />
            <Text style={styles.completedText}>Đơn hàng đã giao thành công</Text>
          </View>
        )}
      </View>
      {/* ── INTERACTIVE CUSTOMER CONTACT MODAL (CALL & SMS) ── */}
      <Modal
        visible={!!contactModal?.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setContactModal(null)}
      >
        <View style={styles.contactModalOverlay}>
          <View style={styles.contactModalBox}>
            <View style={styles.contactModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {contactModal?.type === 'CALL' ? (
                  <Phone size={18} color="#0f766e" style={{ marginRight: 8 }} />
                ) : (
                  <MessageSquare size={18} color="#0284c7" style={{ marginRight: 8 }} />
                )}
                <Text style={styles.contactModalTitle}>
                  {contactModal?.type === 'CALL' ? 'Liên Hệ Khách Hàng' : 'Soạn Tin Nhắn Giao Hàng'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setContactModal(null)} style={styles.contactModalCloseBtn}>
                <X size={18} color="#64748b" />
              </TouchableOpacity>
            </View>

            {contactCopiedToast && (
              <View style={styles.contactToast}>
                <Check size={14} color="#166534" style={{ marginRight: 5 }} />
                <Text style={styles.contactToastText}>{contactCopiedToast}</Text>
              </View>
            )}

            <View style={styles.contactCustomerCard}>
              <Text style={styles.contactCustName}>{contactModal?.customerName}</Text>
              <Text style={styles.contactCustPhone}>{contactModal?.phone}</Text>
              {contactModal?.orderCode && (
                <Text style={styles.contactCustOrder}>Mã đơn hàng: #{contactModal.orderCode}</Text>
              )}
            </View>

            {contactModal?.type === 'SMS' && (
              <View style={styles.smsPreviewBox}>
                <Text style={styles.smsPreviewLabel}>Nội dung tin nhắn mẫu:</Text>
                <Text style={styles.smsPreviewContent}>
                  {`Chào chị/anh ${contactModal.customerName || ''}, tài xế CityMart đang giao thực phẩm tươi sạch đến địa chỉ ${contactModal.address || ''}.`}
                </Text>
              </View>
            )}

            <View style={styles.contactActionButtonsRow}>
              {contactModal?.type === 'CALL' ? (
                <>
                  <TouchableOpacity
                    style={styles.contactSecondaryBtn}
                    onPress={() => copyToClipboard(contactModal.phone, 'số điện thoại')}
                    activeOpacity={0.8}
                  >
                    <Copy size={15} color="#0f172a" style={{ marginRight: 6 }} />
                    <Text style={styles.contactSecondaryBtnText}>Sao chép số</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.contactPrimaryBtn}
                    onPress={() => {
                      const clean = (contactModal.phone || '').replace(/\D/g, '');
                      Linking.openURL(`tel:${clean}`);
                    }}
                    activeOpacity={0.8}
                  >
                    <Phone size={15} color="#ffffff" style={{ marginRight: 6 }} />
                    <Text style={styles.contactPrimaryBtnText}>Gọi điện ngay</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity
                    style={styles.contactSecondaryBtn}
                    onPress={() => {
                      const msg = `Chào chị/anh ${contactModal?.customerName || ''}, tài xế CityMart đang giao thực phẩm tươi sạch đến địa chỉ ${contactModal?.address || ''}.`;
                      copyToClipboard(msg, 'tin nhắn mẫu');
                    }}
                    activeOpacity={0.8}
                  >
                    <Copy size={15} color="#0f172a" style={{ marginRight: 6 }} />
                    <Text style={styles.contactSecondaryBtnText}>Sao chép tin</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.contactPrimaryBtn}
                    onPress={() => {
                      const clean = (contactModal?.phone || '').replace(/\D/g, '');
                      const msg = `Chào chị/anh ${contactModal?.customerName || ''}, tài xế CityMart đang giao thực phẩm tươi sạch đến địa chỉ ${contactModal?.address || ''}.`;
                      Linking.openURL(`sms:${clean}?body=${encodeURIComponent(msg)}`);
                    }}
                    activeOpacity={0.8}
                  >
                    <MessageSquare size={15} color="#ffffff" style={{ marginRight: 6 }} />
                    <Text style={styles.contactPrimaryBtnText}>Mở app SMS</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
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
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: '#e2e8f0',
    flexShrink: 0,
  },
  actionBtnPrimary: {
    backgroundColor: '#0f766e',
    height: 46,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnSecondary: {
    flex: 1,
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#bae6fd',
    height: 46,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnSecondaryText: {
    color: '#0284c7',
    fontSize: 13.5,
    fontWeight: '600',
  },
  actionBtnSuccess: {
    flex: 1.3,
    backgroundColor: '#0f766e',
    height: 46,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  completedBadgeBox: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  completedText: {
    color: '#166534',
    fontWeight: '600',
    fontSize: 13.5,
  },
  sameLocationBanner: {
    marginTop: 12,
    backgroundColor: '#f0f9ff',
    borderWidth: 1.5,
    borderColor: '#bae6fd',
    borderRadius: 8,
    padding: 12,
  },
  sameLocationBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0369a1',
    marginLeft: 6,
  },
  sameLocationBannerDesc: {
    fontSize: 11.5,
    color: '#475569',
    marginTop: 4,
    lineHeight: 16,
  },
  sameLocationBannerBtn: {
    marginTop: 10,
    backgroundColor: '#0284c7',
    borderRadius: 6,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sameLocationBannerBtnText: {
    color: '#ffffff',
    fontSize: 12.5,
    fontWeight: '700',
  },
  contactModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  contactModalBox: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  contactModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  contactModalTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  contactModalCloseBtn: {
    padding: 4,
  },
  contactToast: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 10,
  },
  contactToastText: {
    fontSize: 12,
    color: '#166534',
    fontWeight: '600',
  },
  contactCustomerCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    marginBottom: 12,
  },
  contactCustName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  contactCustPhone: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f766e',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  contactCustOrder: {
    fontSize: 11.5,
    color: '#64748b',
    marginTop: 4,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  smsPreviewBox: {
    backgroundColor: '#f0f9ff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bae6fd',
    padding: 10,
    marginBottom: 14,
  },
  smsPreviewLabel: {
    fontSize: 11,
    color: '#0369a1',
    fontWeight: '700',
    marginBottom: 4,
  },
  smsPreviewContent: {
    fontSize: 12,
    color: '#0c4a6e',
    lineHeight: 17,
  },
  contactActionButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  contactSecondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingVertical: 10,
  },
  contactSecondaryBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
  },
  contactPrimaryBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f766e',
    borderRadius: 8,
    paddingVertical: 10,
  },
  contactPrimaryBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
});
