import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  StatusBar,
  TouchableOpacity,
  Modal,
  Image,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDriverTask } from '@/features/delivery';
import { COLORS } from '@/shared';
import {
  Coins,
  Receipt,
  CheckCircle2,
  Clock,
  PackageCheck,
  ShieldCheck,
  QrCode,
  Copy,
  Check,
  ArrowRight,
  Building2,
  RefreshCw,
  Wallet,
  HandCoins,
  ArrowUpRight,
  FileCheck,
  X,
  CreditCard,
  User,
} from 'lucide-react-native';
import { driverApi } from '@/shared';

export const EarningsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const {
    driverProfile,
    tasks,
    deliveredTasks,
    currentTripNumber,
    totalCodCollectedCurrentTrip,
  } = useDriverTask();

  const topPadding = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0);
  const bottomPadding = Math.max(insets.bottom, Platform.OS === 'android' ? 24 : 16) + 20;

  // ── Server Summary State ──
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSettling, setIsSettling] = useState<boolean>(false);
  const [serverSummary, setServerSummary] = useState<any>(null);

  // ── Modal State ──
  const [showQrModal, setShowQrModal] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);

  const formatPrice = (val: number) => (val || 0).toLocaleString('vi-VN') + 'đ';

  // ── Date Filter State ──
  const [selectedDateFilter, setSelectedDateFilter] = useState<'TODAY' | 'YESTERDAY' | 'LAST_7_DAYS'>('TODAY');

  const todayStr = useMemo(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  }, []);

  const targetDateStr = useMemo(() => {
    const d = new Date();
    if (selectedDateFilter === 'YESTERDAY') {
      d.setDate(d.getDate() - 1);
    } else if (selectedDateFilter === 'LAST_7_DAYS') {
      d.setDate(d.getDate() - 7);
    }
    return d.toISOString().split('T')[0];
  }, [selectedDateFilter]);

  const targetDateDisplay = useMemo(() => {
    const d = new Date();
    if (selectedDateFilter === 'YESTERDAY') {
      d.setDate(d.getDate() - 1);
    } else if (selectedDateFilter === 'LAST_7_DAYS') {
      return '7 ngày gần nhất';
    }
    return d.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
  }, [selectedDateFilter]);

  // Fetch summary from backend
  const loadSummary = async () => {
    if (!driverProfile?.id) return;
    setIsLoading(true);
    try {
      const data = await driverApi.getDriverCodSummary(driverProfile.id, targetDateStr);
      if (data) {
        setServerSummary(data);
      }
    } catch (e) {
      console.warn('Error loading COD summary:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSummary();
  }, [driverProfile?.id, selectedDateFilter]);

  // Fallback calculations if offline or no backend records yet
  const totalCollected = useMemo(() => {
    if (serverSummary && typeof serverSummary.totalCodCollected === 'number') {
      return serverSummary.totalCodCollected;
    }
    return (deliveredTasks || []).reduce((sum, t) => sum + (t.codAmount || 0), 0) + totalCodCollectedCurrentTrip;
  }, [serverSummary, deliveredTasks, totalCodCollectedCurrentTrip]);

  const totalSettled = useMemo(() => {
    if (serverSummary && typeof serverSummary.totalSettled === 'number') {
      return serverSummary.totalSettled;
    }
    return 0;
  }, [serverSummary]);

  const remainingCod = useMemo(() => {
    if (serverSummary && typeof serverSummary.remainingCod === 'number') {
      return serverSummary.remainingCod;
    }
    return Math.max(0, totalCollected - totalSettled);
  }, [serverSummary, totalCollected, totalSettled]);

  const settlementsList: any[] = useMemo(() => {
    if (serverSummary && Array.isArray(serverSummary.settlements)) {
      return serverSummary.settlements;
    }
    return [];
  }, [serverSummary]);

  const ordersList: any[] = useMemo(() => {
    if (serverSummary && Array.isArray(serverSummary.orders) && serverSummary.orders.length > 0) {
      return serverSummary.orders.map((o: any) => {
        const isCodMethod = (o.paymentMethod || '').toLowerCase() === 'cod';
        const codVal = isCodMethod ? Number(o.codCollectedAmount || o.totalAmount || 0) : 0;
        return {
          ...o,
          orderId: o.id,
          orderCode: o.orderCode || `ECOMM-${(o.id || '').slice(0, 8).toUpperCase()}`,
          customerName: o.customerName || 'Khách Hàng',
          deliveryAddress: o.customerAddress || '',
          codAmount: codVal,
          paymentMethod: isCodMethod ? 'COD' : 'ONLINE',
          isCodSettled: o.codSettledStatus === 'SETTLED' || (totalSettled >= totalCollected && totalCollected > 0),
          deliveredAt: o.completedAt ? 'Hôm nay' : 'Đang xử lý',
        };
      });
    }
    return (deliveredTasks || []).map(t => ({
      orderId: t.id,
      orderCode: t.orderCode,
      customerName: t.customerName,
      deliveryAddress: t.deliveryAddress,
      codAmount: t.codAmount || 0,
      paymentMethod: t.paymentMethodText || (t.codAmount > 0 ? 'COD' : 'ONLINE'),
      status: 'DELIVERED',
      isCodSettled: totalSettled >= totalCollected && totalCollected > 0,
      deliveredAt: t.deliveredAt || 'Hôm nay',
    }));
  }, [serverSummary, deliveredTasks, totalSettled, totalCollected]);

  // Handler: Settle COD via Cash
  const handleCashHandover = async () => {
    if (remainingCod <= 0) {
      Alert.alert('Thông báo', 'Bạn hiện không có khoản tiền COD nào cần nộp.');
      return;
    }

    Alert.alert(
      'Nộp tiền mặt tại thủ quỹ kho',
      `Xác nhận nộp số tiền ${formatPrice(remainingCod)} cho thủ quỹ Kho Trung Tâm (WH-006)?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xác nhận nộp',
          onPress: async () => {
            setIsSettling(true);
            try {
              const res = await driverApi.settleDriverCod({
                driverId: driverProfile.id,
                driverName: driverProfile.name,
                amount: remainingCod,
                paymentMethod: 'CASH',
                warehouseCode: 'WH-006',
                notes: 'Bàn giao tiền mặt tại quầy thủ quỹ',
                shiftDate: todayStr,
              });

              if (res.success) {
                Alert.alert('Thành công', `Đã lập phiếu nộp tiền #${res.settlement?.settlementCode || ''}. Số tiền ${formatPrice(remainingCod)} đã được ghi nhận vào hệ thống.`);
                await loadSummary();
              } else {
                Alert.alert('Lỗi', res.error || 'Không thể lập biên bản nộp tiền.');
              }
            } finally {
              setIsSettling(false);
            }
          },
        },
      ]
    );
  };

  // Handler: Settle COD via Bank Transfer / VietQR
  const handleBankTransferConfirm = async () => {
    setIsSettling(true);
    try {
      const res = await driverApi.settleDriverCod({
        driverId: driverProfile.id,
        driverName: driverProfile.name,
        amount: remainingCod,
        paymentMethod: 'BANK_TRANSFER',
        warehouseCode: 'WH-006',
        notes: `Chuyển khoản VietQR ${driverProfile.id}`,
        shiftDate: todayStr,
      });

      setShowQrModal(false);

      if (res.success) {
        Alert.alert('Thành công', `Đã ghi nhận nộp tiền COD qua chuyển khoản. Mã phiếu: #${res.settlement?.settlementCode || ''}.`);
        await loadSummary();
      } else {
        Alert.alert('Thông báo', res.error || 'Giao dịch chuyển khoản đang được kế toán đối soát.');
        await loadSummary();
      }
    } finally {
      setIsSettling(false);
    }
  };

  const codTransferContent = `NOP COD ${driverProfile?.id || 'TX01'} ${todayStr}`;
  const dynamicVietQrUrl = `https://img.vietqr.io/image/MB-0901234567-compact2.png?amount=${remainingCod}&addInfo=${encodeURIComponent(codTransferContent)}&accountName=KHO%20TRUNG%20TAM%20SFWMS`;

  return (
    <View style={styles.safeContainer}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPadding, height: topPadding + 52 }]}>
        <Text style={styles.headerTitle}>Đối Soát Doanh Thu & Tiền Thu Hộ (COD)</Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Driver Session Profile Strip */}
        <View style={styles.sessionStrip}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <View style={styles.sessionAvatarBox}>
              <User size={16} color="#0f766e" />
            </View>
            <View style={{ marginLeft: 8, flex: 1 }}>
              <Text style={styles.sessionDriverName} numberOfLines={1}>
                {driverProfile?.name || 'Tài xế C.T Mart'} ({driverProfile?.id || 'TX-01'})
              </Text>
              <Text style={styles.sessionDateText}>{targetDateDisplay}</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.refreshIconBtn} onPress={loadSummary} activeOpacity={0.7}>
            <RefreshCw size={14} color="#0284c7" style={[isLoading && { transform: [{ rotate: '45deg' }] }]} />
          </TouchableOpacity>
        </View>

        {/* Date Filter Segmented Bar */}
        <View style={styles.dateSegmentBar}>
          <TouchableOpacity
            style={[styles.dateSegmentBtn, selectedDateFilter === 'TODAY' && styles.dateSegmentBtnActive]}
            onPress={() => setSelectedDateFilter('TODAY')}
            activeOpacity={0.8}
          >
            <Text style={[styles.dateSegmentText, selectedDateFilter === 'TODAY' && styles.dateSegmentTextActive]}>
              Hôm nay
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.dateSegmentBtn, selectedDateFilter === 'YESTERDAY' && styles.dateSegmentBtnActive]}
            onPress={() => setSelectedDateFilter('YESTERDAY')}
            activeOpacity={0.8}
          >
            <Text style={[styles.dateSegmentText, selectedDateFilter === 'YESTERDAY' && styles.dateSegmentTextActive]}>
              Hôm qua
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.dateSegmentBtn, selectedDateFilter === 'LAST_7_DAYS' && styles.dateSegmentBtnActive]}
            onPress={() => setSelectedDateFilter('LAST_7_DAYS')}
            activeOpacity={0.8}
          >
            <Text style={[styles.dateSegmentText, selectedDateFilter === 'LAST_7_DAYS' && styles.dateSegmentTextActive]}>
              7 ngày qua
            </Text>
          </TouchableOpacity>
        </View>

        {/* Shift COD Summary KPI Cards */}
        <View style={styles.kpiContainer}>
          {/* Card 1: Tổng COD Đã Thu */}
          <View style={styles.kpiCard}>
            <View style={styles.kpiHeaderRow}>
              <Text style={styles.kpiLabel}>COD đã thu trong ca</Text>
              <Coins size={14} color="#0284c7" />
            </View>
            <Text style={[styles.kpiVal, { color: '#0f172a' }]}>{formatPrice(totalCollected)}</Text>
            <Text style={styles.kpiSubText}>{ordersList.length} đơn hoàn thành</Text>
          </View>

          {/* Card 2: Đã Nộp Kho */}
          <View style={styles.kpiCard}>
            <View style={styles.kpiHeaderRow}>
              <Text style={styles.kpiLabel}>Đã nộp thủ quỹ</Text>
              <CheckCircle2 size={14} color="#166534" />
            </View>
            <Text style={[styles.kpiVal, { color: '#166534' }]}>{formatPrice(totalSettled)}</Text>
            <Text style={styles.kpiSubText}>{settlementsList.length} phiếu đã duyệt</Text>
          </View>
        </View>

        {/* Handover Balance Card (Còn giữ chờ nộp) */}
        <View style={[styles.balanceCard, remainingCod > 0 ? styles.balanceCardDue : styles.balanceCardClear]}>
          <View style={styles.balanceHeaderRow}>
            <View style={styles.balanceIconBox}>
              <Wallet size={18} color={remainingCod > 0 ? '#991b1b' : '#166534'} />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.balanceTitle}>Tiền COD đang giữ (Chờ nộp kho)</Text>
              <Text style={styles.balanceSub}>
                {remainingCod > 0
                  ? 'Vui lòng nộp lại cho thủ quỹ hoặc quét VietQR sau khi hết ca'
                  : 'Đã hoàn tất đối soát tiền COD của ca làm việc'}
              </Text>
            </View>
          </View>

          <View style={styles.balanceAmountRow}>
            <Text style={[styles.balanceAmountText, { color: remainingCod > 0 ? '#991b1b' : '#166534' }]}>
              {formatPrice(remainingCod)}
            </Text>
            <View style={[styles.balanceBadge, remainingCod > 0 ? styles.balanceBadgeDue : styles.balanceBadgeClear]}>
              <Text style={[styles.balanceBadgeText, { color: remainingCod > 0 ? '#991b1b' : '#166534' }]}>
                {remainingCod > 0 ? 'Cần nộp' : 'Đã nộp đủ'}
              </Text>
            </View>
          </View>

          {/* Action Handover CTA Buttons */}
          {remainingCod > 0 && (
            <View style={styles.handoverActionGroup}>
              <TouchableOpacity
                style={styles.cashHandoverBtn}
                onPress={handleCashHandover}
                disabled={isSettling}
                activeOpacity={0.85}
              >
                <HandCoins size={15} color="#ffffff" style={{ marginRight: 6 }} />
                <Text style={styles.cashHandoverBtnText}>
                  {isSettling ? 'Đang ghi nhận...' : 'Nộp tiền mặt tại thủ quỹ kho'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.vietQrHandoverBtn}
                onPress={() => setShowQrModal(true)}
                activeOpacity={0.85}
              >
                <QrCode size={15} color="#ffffff" style={{ marginRight: 6 }} />
                <Text style={styles.vietQrHandoverBtnText}>Nộp qua VietQR Napas247</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Settlement Receipts History Section */}
        {settlementsList.length > 0 && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <FileCheck size={16} color="#0f766e" />
              <Text style={styles.sectionTitle}>Phiếu nộp tiền đã ghi nhận vào hệ thống</Text>
            </View>

            <View style={styles.settlementList}>
              {settlementsList.map((st, idx) => (
                <View key={st.id || idx} style={styles.settlementCard}>
                  <View style={styles.settlementTopRow}>
                    <Text style={styles.settlementCodeText}>#{st.settlementCode}</Text>
                    <View style={styles.settlementStatusBadge}>
                      <CheckCircle2 size={11} color="#166534" style={{ marginRight: 3 }} />
                      <Text style={styles.settlementStatusText}>{st.status === 'CONFIRMED' ? 'Đã duyệt' : st.status}</Text>
                    </View>
                  </View>

                  <View style={styles.settlementDetailRow}>
                    <Text style={styles.settlementAmountText}>
                      {formatPrice(parseFloat(st.settledAmount || st.totalCodAmount || 0))}
                    </Text>
                    <Text style={styles.settlementMethodText}>
                      {st.paymentMethod === 'CASH' ? 'Tiền mặt tại kho' : 'Chuyển khoản VietQR'}
                    </Text>
                  </View>

                  <Text style={styles.settlementTimeText}>
                    Thời gian: {st.createdAt ? new Date(st.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : 'Hôm nay'} • {st.notes || 'Bàn giao ca'}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Orders Breakdown Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <Receipt size={16} color="#0f766e" />
            <Text style={styles.sectionTitle}>Chi tiết đơn hàng trong ca ({ordersList.length} đơn)</Text>
          </View>

          {ordersList.length === 0 ? (
            <View style={styles.emptyOrdersCard}>
              <PackageCheck size={36} color="#94a3b8" />
              <Text style={styles.emptyOrdersTitle}>Chưa có đơn hàng hoàn thành</Text>
              <Text style={styles.emptyOrdersSub}>Các đơn giao thành công sẽ hiển thị đối soát tại đây.</Text>
            </View>
          ) : (
            <View style={styles.ordersList}>
              {ordersList.map((ord, idx) => {
                const codNum = Number(ord.codAmount || 0);
                const isZeroCod = codNum === 0;
                return (
                  <View key={ord.orderId || idx} style={styles.orderItemCard}>
                    <View style={styles.orderItemTopRow}>
                      <Text style={styles.orderItemCode}>#{ord.orderCode}</Text>
                      <View
                        style={[
                          styles.orderSettledBadge,
                          isZeroCod || ord.isCodSettled ? styles.badgeSettled : styles.badgePending,
                        ]}
                      >
                        <Text
                          style={[
                            styles.orderSettledText,
                            isZeroCod || ord.isCodSettled ? styles.textSettled : styles.textPending,
                          ]}
                        >
                          {isZeroCod ? 'Thanh toán online' : ord.isCodSettled ? 'Đã nộp kho' : 'Chờ nộp kho'}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.orderCustomerName} numberOfLines={1}>
                      {ord.customerName}
                    </Text>
                    <Text style={styles.orderAddress} numberOfLines={1}>
                      {ord.deliveryAddress}
                    </Text>

                    <View style={styles.orderFooterRow}>
                      <Text style={styles.orderTimeText}>{ord.deliveredAt}</Text>
                      <Text style={[styles.orderCodAmount, { color: codNum > 0 ? '#991b1b' : '#166534' }]}>
                        COD: {codNum > 0 ? formatPrice(codNum) : '0đ'}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* ── VIETQR MODAL ── */}
      <Modal
        visible={showQrModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowQrModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={styles.qrHeaderIconBox}>
                  <QrCode size={18} color="#ffffff" />
                </View>
                <View style={{ marginLeft: 8 }}>
                  <Text style={styles.modalTitle}>Nộp Tiền COD Qua VietQR</Text>
                  <Text style={styles.modalSub}>Chuyển khoản liên ngân hàng Napas247</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowQrModal(false)}>
                <X size={18} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* QR Image Box */}
            <View style={styles.qrImageContainer}>
              <Image
                source={{ uri: dynamicVietQrUrl }}
                style={styles.qrImage}
                resizeMode="contain"
              />
              <Text style={styles.qrScanHint}>
                Mở app ngân hàng bất kỳ (MB, Vietcombank, Techcombank...) để quét mã
              </Text>
            </View>

            {/* Bank Info Table */}
            <View style={styles.bankInfoBox}>
              <View style={styles.bankInfoRow}>
                <Text style={styles.bankInfoLabel}>Ngân hàng thụ hưởng:</Text>
                <Text style={styles.bankInfoVal}>MB Bank (Quân Đội)</Text>
              </View>
              <View style={styles.bankInfoRow}>
                <Text style={styles.bankInfoLabel}>Số tài khoản:</Text>
                <Text style={styles.bankInfoValBold}>0901234567</Text>
              </View>
              <View style={styles.bankInfoRow}>
                <Text style={styles.bankInfoLabel}>Chủ tài khoản:</Text>
                <Text style={styles.bankInfoVal}>KHO TRUNG TAM SFWMS</Text>
              </View>
              <View style={styles.bankInfoRow}>
                <Text style={styles.bankInfoLabel}>Số tiền nộp COD:</Text>
                <Text style={styles.bankInfoValAmount}>{formatPrice(remainingCod)}</Text>
              </View>
              <View style={[styles.bankInfoRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.bankInfoLabel}>Nội dung chuyển khoản:</Text>
                <Text style={styles.bankInfoValContent} numberOfLines={1}>{codTransferContent}</Text>
              </View>
            </View>

            {/* Modal CTA Buttons */}
            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={styles.modalCopyBtn}
                onPress={() => {
                  setIsCopied(true);
                  setTimeout(() => setIsCopied(false), 2500);
                  if (typeof navigator !== 'undefined' && navigator.clipboard) {
                    navigator.clipboard.writeText(`0901234567 - ${codTransferContent} - ${remainingCod}`);
                  }
                  Alert.alert('Đã sao chép', 'Thông tin số tài khoản và nội dung đã được sao chép.');
                }}
                activeOpacity={0.8}
              >
                {isCopied ? <Check size={15} color="#166534" /> : <Copy size={15} color="#0284c7" />}
                <Text style={[styles.modalCopyBtnText, isCopied && { color: '#166534' }]}>
                  {isCopied ? 'Đã sao chép' : 'Sao chép STK'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalDoneBtn}
                onPress={handleBankTransferConfirm}
                disabled={isSettling}
                activeOpacity={0.85}
              >
                <CheckCircle2 size={16} color="#ffffff" style={{ marginRight: 6 }} />
                <Text style={styles.modalDoneBtnText}>
                  {isSettling ? 'Đang xác nhận...' : 'Tôi đã chuyển khoản'}
                </Text>
              </TouchableOpacity>
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
    backgroundColor: '#f8fafc',
  },
  header: {
    height: 50,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#ffffff',
  },
  scrollContent: {
    padding: 12,
  },

  // ── SESSION STRIP ──
  sessionStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  sessionAvatarBox: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionDriverName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  sessionDateText: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  dateSegmentBar: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 3,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 4,
  },
  dateSegmentBtn: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
  dateSegmentBtnActive: {
    backgroundColor: '#0f766e',
  },
  dateSegmentText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  dateSegmentTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  refreshIconBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#bae6fd',
  },

  // ── KPI CARDS ──
  kpiContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  kpiHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  kpiLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  kpiVal: {
    fontSize: 16,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  kpiSubText: {
    fontSize: 10.5,
    color: '#94a3b8',
    marginTop: 4,
  },

  // ── BALANCE CARD ──
  balanceCard: {
    borderRadius: 8,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  balanceCardDue: {
    backgroundColor: '#fff7ed',
    borderColor: '#fed7aa',
  },
  balanceCardClear: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  balanceHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  balanceIconBox: {
    width: 34,
    height: 34,
    borderRadius: 6,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  balanceSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  balanceAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.06)',
  },
  balanceAmountText: {
    fontSize: 24,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  balanceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
  },
  balanceBadgeDue: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  balanceBadgeClear: {
    backgroundColor: '#ffffff',
    borderColor: '#bbf7d0',
  },
  balanceBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  handoverActionGroup: {
    marginTop: 10,
    gap: 8,
  },
  cashHandoverBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f766e',
    borderRadius: 6,
    paddingVertical: 10,
  },
  cashHandoverBtnText: {
    color: '#ffffff',
    fontSize: 12.5,
    fontWeight: '600',
  },
  vietQrHandoverBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0284c7',
    borderRadius: 6,
    paddingVertical: 10,
  },
  vietQrHandoverBtnText: {
    color: '#ffffff',
    fontSize: 12.5,
    fontWeight: '600',
  },

  // ── SECTION STYLES ──
  sectionContainer: {
    marginBottom: 14,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },

  // ── SETTLEMENT RECEIPTS ──
  settlementList: {
    gap: 8,
  },
  settlementCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  settlementTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  settlementCodeText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0f766e',
  },
  settlementStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  settlementStatusText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#166534',
  },
  settlementDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  settlementAmountText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    fontVariant: ['tabular-nums'],
  },
  settlementMethodText: {
    fontSize: 11.5,
    color: '#475569',
    fontWeight: '500',
  },
  settlementTimeText: {
    fontSize: 10.5,
    color: '#64748b',
  },

  // ── ORDERS LIST ──
  ordersList: {
    gap: 8,
  },
  orderItemCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  orderItemTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  orderItemCode: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0f172a',
  },
  orderSettledBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  badgeSettled: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  badgePending: {
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
  },
  orderSettledText: {
    fontSize: 10,
    fontWeight: '600',
  },
  textSettled: {
    color: '#166534',
  },
  textPending: {
    color: '#92400e',
  },
  orderCustomerName: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#0f172a',
    marginTop: 2,
  },
  orderAddress: {
    fontSize: 11,
    color: '#475569',
    marginTop: 1,
  },
  orderFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  orderTimeText: {
    fontSize: 10.5,
    color: '#94a3b8',
  },
  orderCodAmount: {
    fontSize: 12.5,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  emptyOrdersCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  emptyOrdersTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 8,
  },
  emptyOrdersSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },

  // ── VIETQR MODAL ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  qrHeaderIconBox: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#0284c7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  modalSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  modalCloseBtn: {
    padding: 4,
    borderRadius: 4,
    backgroundColor: '#f1f5f9',
  },
  qrImageContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
  },
  qrImage: {
    width: 220,
    height: 220,
  },
  qrScanHint: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 6,
    textAlign: 'center',
  },
  bankInfoBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
  },
  bankInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  bankInfoLabel: {
    fontSize: 11.5,
    color: '#64748b',
  },
  bankInfoVal: {
    fontSize: 11.5,
    color: '#1e293b',
    fontWeight: '600',
  },
  bankInfoValBold: {
    fontSize: 12.5,
    color: '#0f172a',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  bankInfoValAmount: {
    fontSize: 13.5,
    color: '#991b1b',
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  bankInfoValContent: {
    fontSize: 11,
    color: '#0284c7',
    fontWeight: '600',
    maxWidth: 180,
  },
  modalActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  modalCopyBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#bae6fd',
    borderRadius: 6,
    paddingVertical: 9,
  },
  modalCopyBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0284c7',
    marginLeft: 4,
  },
  modalDoneBtn: {
    flex: 1.4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f766e',
    borderRadius: 6,
    paddingVertical: 9,
  },
  modalDoneBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
});
