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
  Modal,
  TextInput,
} from 'react-native';
import {
  Boxes,
  ScanBarcode,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  Snowflake,
  Compass,
  ArrowRight,
  Zap,
  Check,
  Camera,
  QrCode,
  Volume2,
  X,
  Sparkles,
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { fetchPickingTasksApi, confirmPickingApi } from '../services/api';
import { PickingItem } from '../types';
import { COLORS } from '../theme/colors';

export const PickingScreen: React.FC = () => {
  const { activeWarehouse } = useAuth();
  const [tasks, setTasks] = useState<PickingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [completedOrders, setCompletedOrders] = useState<string[]>([]);

  // 📷 Barcode Scanner State
  const [scannerOpen, setScannerOpen] = useState(false);
  const [activeScanItem, setActiveScanItem] = useState<PickingItem | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [scanFeedback, setScanFeedback] = useState<{ isMatch: boolean; message: string; code: string } | null>(null);

  const triggerAudioFeedback = (success: boolean) => {
    try {
      if (typeof window !== 'undefined') {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type = success ? 'sine' : 'sawtooth';
        osc.frequency.value = success ? 880 : 220;
        gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
        osc.start();
        osc.stop(audioCtx.currentTime + (success ? 0.18 : 0.35));
      }
    } catch (e) {}
  };

  const handleProcessScan = (codeToTest: string) => {
    const raw = codeToTest.trim().toUpperCase();
    if (!raw) return;

    let matchedItem: PickingItem | undefined;

    if (activeScanItem) {
      // Đang quét cho 1 món cụ thể
      const matches = 
        (activeScanItem.barcode && activeScanItem.barcode.toUpperCase().includes(raw)) ||
        (activeScanItem.sku && activeScanItem.sku.toUpperCase().includes(raw)) ||
        (activeScanItem.lotCode && activeScanItem.lotCode.toUpperCase().includes(raw)) ||
        (activeScanItem.shelfLocation && activeScanItem.shelfLocation.toUpperCase().includes(raw)) ||
        raw.includes(activeScanItem.sku?.toUpperCase() || '') ||
        raw.includes(activeScanItem.lotCode?.toUpperCase() || '');

      if (matches) {
        matchedItem = activeScanItem;
      }
    } else {
      // Quét tự động trong danh sách tất cả các món chờ lấy
      matchedItem = tasks.find(t => 
        t.status !== 'PICKED' && (
          (t.barcode && t.barcode.toUpperCase().includes(raw)) ||
          (t.sku && t.sku.toUpperCase().includes(raw)) ||
          (t.lotCode && t.lotCode.toUpperCase().includes(raw)) ||
          (t.shelfLocation && t.shelfLocation.toUpperCase().includes(raw)) ||
          raw.includes(t.sku?.toUpperCase() || '') ||
          raw.includes(t.lotCode?.toUpperCase() || '')
        )
      );
    }

    if (matchedItem) {
      triggerAudioFeedback(true);
      setTasks(prev => prev.map(t => t.id === matchedItem!.id ? { ...t, status: 'PICKED' } : t));
      setScanFeedback({
        isMatch: true,
        message: `ĐÃ LẤY: ${matchedItem.productName} (Kệ ${matchedItem.shelfLocation})`,
        code: raw
      });
      setTimeout(() => {
        setScanFeedback(null);
        setScannerOpen(false);
        setActiveScanItem(null);
        setManualCode('');
      }, 1300);
    } else {
      triggerAudioFeedback(false);
      setScanFeedback({
        isMatch: false,
        message: `Mã "${raw}" không khớp với món hàng nào trong danh sách cần lấy!`,
        code: raw
      });
    }
  };

  const loadTasks = async () => {
    try {
      const data = await fetchPickingTasksApi(activeWarehouse);
      setTasks(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
    const interval = setInterval(() => {
      loadTasks();
    }, 3000);
    return () => clearInterval(interval);
  }, [activeWarehouse]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTasks();
    setRefreshing(false);
  };

  const handlePickItem = (itemId: string) => {
    setTasks(prev =>
      prev.map(t => (t.id === itemId ? { ...t, status: t.status === 'PICKED' ? 'PENDING' : 'PICKED' } : t))
    );
  };

  const handleConfirmOrder = async (orderId: string) => {
    const success = await confirmPickingApi(orderId);
    if (success) {
      setCompletedOrders(prev => [...prev, orderId]);
      Alert.alert(
        '✅ Hoàn tất lấy hàng!',
        'Đã xác nhận hoàn tất soạn hàng cho đơn này. Đơn đã được chuyển tự động sang tab ĐÓNG GÓI.'
      );
      loadTasks();
    } else {
      Alert.alert('Thông báo', 'Đã cập nhật trạng thái lấy hàng cục bộ.');
      setCompletedOrders(prev => [...prev, orderId]);
      loadTasks();
    }
  };

  const [filterMode, setFilterMode] = useState<'ALL' | 'PENDING' | 'PICKED'>('ALL');

  const totalCount = tasks.length;
  const pickedCount = tasks.filter(t => t.status === 'PICKED').length;
  const pendingCount = totalCount - pickedCount;
  const progressPercent = totalCount > 0 ? Math.round((pickedCount / totalCount) * 100) : 0;

  const handlePickAllInOrder = (orderItems: PickingItem[]) => {
    const itemIds = orderItems.map(i => i.id);
    setTasks(prev => prev.map(t => itemIds.includes(t.id) ? { ...t, status: 'PICKED' } : t));
  };

  const filteredTasks = tasks.filter(t => {
    if (filterMode === 'PENDING') return t.status !== 'PICKED';
    if (filterMode === 'PICKED') return t.status === 'PICKED';
    return true;
  });

  // Group by orderCode
  const orderGroups = filteredTasks.reduce((acc, task) => {
    const key = task.orderCode || 'Đơn xuất kho';
    if (!acc[key]) acc[key] = [];
    acc[key].push(task);
    return acc;
  }, {} as Record<string, PickingItem[]>);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#059669" />}
      >
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Soạn Hàng Xuất Kho (FEFO)</Text>
          <Text style={styles.subtitle}>Chỉ dẫn vị trí kệ • Ưu tiên HSD gần nhất (:3007)</Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <TouchableOpacity
            style={styles.headerScanBtn}
            onPress={() => {
              setActiveScanItem(null);
              setScanFeedback(null);
              setManualCode('');
              setScannerOpen(true);
            }}
            activeOpacity={0.8}
          >
            <ScanBarcode size={15} color="#ffffff" />
            <Text style={styles.headerScanBtnText}>Quét Mã</Text>
          </TouchableOpacity>

          <View style={styles.fefoBadge}>
            <Zap size={13} color="#d97706" />
            <Text style={styles.fefoBadgeText}>FEFO</Text>
          </View>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressCard}>
        <View style={styles.progressTop}>
          <Text style={styles.progressLabel}>Tiến độ lấy hàng</Text>
          <Text style={styles.progressValue}>
            {pickedCount}/{totalCount} món ({progressPercent}%)
          </Text>
        </View>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterTabsRow}>
        <TouchableOpacity
          style={[styles.filterTab, filterMode === 'ALL' && styles.filterTabActive]}
          onPress={() => setFilterMode('ALL')}
        >
          <Text style={[styles.filterTabText, filterMode === 'ALL' && styles.filterTabTextActive]}>
            📦 Tất cả ({totalCount})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filterMode === 'PENDING' && styles.filterTabActive]}
          onPress={() => setFilterMode('PENDING')}
        >
          <Text style={[styles.filterTabText, filterMode === 'PENDING' && styles.filterTabTextActive]}>
            ⏳ Chờ lấy ({pendingCount})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filterMode === 'PICKED' && styles.filterTabActive]}
          onPress={() => setFilterMode('PICKED')}
        >
          <Text style={[styles.filterTabText, filterMode === 'PICKED' && styles.filterTabTextActive]}>
            ✅ Đã lấy ({pickedCount})
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ padding: 40, alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#059669" />
          <Text style={{ color: '#64748b', marginTop: 10, fontSize: 13 }}>Đang tải đợt soạn hàng từ Outbound Service...</Text>
        </View>
      ) : Object.keys(orderGroups).length === 0 ? (
        <View style={styles.emptyCard}>
          <Boxes size={44} color="#94a3b8" />
          <Text style={styles.emptyTitle}>Chưa có đợt sóng lấy hàng mới</Text>
          <Text style={styles.emptyDesc}>
            Khi Quản lý duyệt tiếp nhận đơn trên Web Dashboard, các đơn hàng sẽ tự động xuất hiện tại đây.
          </Text>
        </View>
      ) : (
        Object.entries(orderGroups).map(([orderCode, items]) => {
          const orderId = items[0]?.orderId || '';
          const isAllPicked = items.every(i => i.status === 'PICKED');
          const isDone = completedOrders.includes(orderId);

          return (
            <View key={orderCode} style={[styles.orderCard, isDone && styles.orderCardDone]}>
              <View style={styles.orderHeader}>
                <View>
                  <Text style={styles.orderCodeText}>{orderCode}</Text>
                  <Text style={styles.orderMetaText}>{items.length} mặt hàng cần lấy từ kho</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  {!isDone && !isAllPicked && (
                    <TouchableOpacity
                      style={styles.pickAllBtn}
                      onPress={() => handlePickAllInOrder(items)}
                      activeOpacity={0.7}
                    >
                      <Zap size={12} color="#059669" />
                      <Text style={styles.pickAllBtnText}>Lấy nhanh</Text>
                    </TouchableOpacity>
                  )}
                  {isDone ? (
                    <View style={styles.doneBadge}>
                      <CheckCircle2 size={13} color="#059669" />
                      <Text style={styles.doneBadgeText}>ĐÃ XONG</Text>
                    </View>
                  ) : (
                    <View style={styles.pickingBadge}>
                      <Text style={styles.pickingBadgeText}>ĐANG SOẠN</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Items List */}
              {items.map(item => {
                const isItemPicked = item.status === 'PICKED';

                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.itemRow, isItemPicked && styles.itemRowPicked]}
                    onPress={() => handlePickItem(item.id)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.checkBox, isItemPicked && styles.checkBoxActive]}>
                      {isItemPicked && <Check size={14} color="#ffffff" />}
                    </View>

                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={[styles.itemName, isItemPicked && styles.itemNamePicked]}>
                        {item.productName}
                      </Text>
                      
                      {/* Shelf Coordinate & Lot Details */}
                      <View style={styles.itemTagsRow}>
                        <View style={styles.shelfTag}>
                          <MapPin size={11} color="#0284c7" />
                          <Text style={styles.shelfTagText}>{item.shelfLocation}</Text>
                        </View>

                        <View style={styles.lotTag}>
                          <Text style={styles.lotTagText}>Lô: {item.lotCode}</Text>
                        </View>
                      </View>

                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                        <Text style={styles.expText}>HSD: {item.expiryDate}</Text>
                        <Text style={styles.tempText}>• {item.temperatureRequired}</Text>
                      </View>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <TouchableOpacity
                        style={[styles.itemScanBtn, isItemPicked && styles.itemScanBtnPicked]}
                        onPress={(e: any) => {
                          e.stopPropagation?.();
                          setActiveScanItem(item);
                          setScanFeedback(null);
                          setManualCode('');
                          setScannerOpen(true);
                        }}
                        activeOpacity={0.7}
                      >
                        <ScanBarcode size={16} color={isItemPicked ? '#059669' : '#0284c7'} />
                      </TouchableOpacity>

                      <View style={styles.qtyBox}>
                        <Text style={styles.qtyNum}>{item.quantity}</Text>
                        <Text style={styles.qtyUnit}>{item.unit}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}

              {/* Confirm Order Picking Complete */}
              {!isDone && (
                <TouchableOpacity
                  style={[styles.confirmBtn, !isAllPicked && styles.confirmBtnDisabled]}
                  onPress={() => handleConfirmOrder(orderId)}
                  disabled={!isAllPicked}
                  activeOpacity={0.85}
                >
                  <CheckCircle2 size={16} color="#ffffff" />
                  <Text style={styles.confirmBtnText}>
                    {isAllPicked ? 'HOÀN TẤT LẤY HÀNG (CHUYỂN ĐÓNG GÓI)' : 'HÃY TÍCH CHỌN ĐỦ MẶT HÀNG'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })
      )}
    </ScrollView>

    {/* 📷 Modal Quét Mã Vạch Barcode (Camera Viewfinder + Manual Barcode) */}
    <Modal
      visible={scannerOpen}
      transparent
      animationType="slide"
      onRequestClose={() => setScannerOpen(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.scannerModalContent}>
          {/* Modal Header */}
          <View style={styles.scannerModalHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <ScanBarcode size={22} color="#059669" />
              <View>
                <Text style={styles.scannerModalTitle}>Quét Mã Vạch Hàng Hóa</Text>
                <Text style={styles.scannerModalSubtitle}>
                  {activeScanItem
                    ? `Đang kiểm tra: ${activeScanItem.productName}`
                    : 'Quét tự động trong danh sách đơn cần lấy'}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => setScannerOpen(false)} style={styles.closeBtn}>
              <X size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Simulated Camera Viewfinder */}
            <View style={styles.viewfinderBox}>
              <View style={styles.laserLine} />
              <View style={styles.viewfinderCorners}>
                <View style={[styles.corner, styles.cornerTL]} />
                <View style={[styles.corner, styles.cornerTR]} />
                <View style={[styles.corner, styles.cornerBL]} />
                <View style={[styles.corner, styles.cornerBR]} />
              </View>
              <Camera size={36} color="rgba(255, 255, 255, 0.4)" style={{ position: 'absolute' }} />
              <Text style={styles.viewfinderHint}>Hướng camera về phía mã Barcode / QR trên bao bì hoặc kệ</Text>
            </View>

            {/* Scan Feedback Banner */}
            {scanFeedback && (
              <View style={[styles.feedbackBanner, scanFeedback.isMatch ? styles.feedbackBannerSuccess : styles.feedbackBannerError]}>
                {scanFeedback.isMatch ? (
                  <CheckCircle2 size={20} color="#059669" />
                ) : (
                  <AlertTriangle size={20} color="#dc2626" />
                )}
                <View style={{ flex: 1 }}>
                  <Text style={[styles.feedbackText, scanFeedback.isMatch ? { color: '#065f46' } : { color: '#991b1b' }]}>
                    {scanFeedback.message}
                  </Text>
                  <Text style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>Mã đã quét: {scanFeedback.code}</Text>
                </View>
              </View>
            )}

            {/* Quick Sample Scan Chips for Testing */}
            <Text style={styles.sectionLabel}>HOẶC CHỌN MẪU MÃ VẠCH ĐỂ QUÉT THỬ:</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
              {activeScanItem ? (
                <>
                  <TouchableOpacity
                    style={styles.sampleChip}
                    onPress={() => handleProcessScan(activeScanItem.sku)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.sampleChipText}>🏷️ Mã SKU: {activeScanItem.sku}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.sampleChip}
                    onPress={() => handleProcessScan(activeScanItem.lotCode)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.sampleChipText}>📦 Mã Lô: {activeScanItem.lotCode}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.sampleChip}
                    onPress={() => handleProcessScan(activeScanItem.shelfLocation)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.sampleChipText}>📍 Kệ: {activeScanItem.shelfLocation}</Text>
                  </TouchableOpacity>
                </>
              ) : (
                tasks.filter(t => t.status !== 'PICKED').slice(0, 4).map((t, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.sampleChip}
                    onPress={() => handleProcessScan(t.sku || t.lotCode)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.sampleChipText}>🏷️ {t.productName.slice(0, 18)}... ({t.shelfLocation})</Text>
                  </TouchableOpacity>
                ))
              )}
            </View>

            {/* Manual Barcode / Scanner Gun Input */}
            <Text style={styles.sectionLabel}>NHẬP MÃ BẰNG TAY / DÙNG SÚNG BẮN LASER:</Text>
            <View style={styles.manualInputRow}>
              <TextInput
                style={styles.manualInput}
                value={manualCode}
                onChangeText={setManualCode}
                placeholder="Nhập mã Barcode, SKU, hoặc Mã Lô..."
                placeholderTextColor="#94a3b8"
                autoCapitalize="characters"
                onSubmitEditing={() => handleProcessScan(manualCode)}
              />
              <TouchableOpacity
                style={styles.manualScanSubmitBtn}
                onPress={() => handleProcessScan(manualCode)}
                activeOpacity={0.8}
              >
                <Check size={16} color="#ffffff" />
                <Text style={styles.manualScanSubmitText}>Quét</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
      </Modal>
    </View>
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
    marginBottom: 14,
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
  fefoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffbeb',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fde68a',
    gap: 4,
  },
  fefoBadgeText: {
    color: '#d97706',
    fontSize: 11,
    fontWeight: '800',
  },
  progressCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  progressTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  progressValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#059669',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#059669',
    borderRadius: 4,
  },
  emptyCard: {
    alignItems: 'center',
    padding: 30,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
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
  orderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  orderCardDone: {
    borderColor: '#a7f3d0',
    backgroundColor: '#f0fdf4',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  orderCodeText: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '800',
  },
  orderMetaText: {
    color: '#64748b',
    fontSize: 11.5,
    marginTop: 1,
  },
  pickingBadge: {
    backgroundColor: '#ecfdf5',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  pickingBadgeText: {
    color: '#059669',
    fontSize: 10.5,
    fontWeight: '800',
  },
  doneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ecfdf5',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  doneBadgeText: {
    color: '#059669',
    fontSize: 10.5,
    fontWeight: '800',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  itemRowPicked: {
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
  },
  checkBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  checkBoxActive: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  itemName: {
    color: '#0f172a',
    fontSize: 13.5,
    fontWeight: '700',
  },
  itemNamePicked: {
    color: '#065f46',
  },
  itemTagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  shelfTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#f0f9ff',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  shelfTagText: {
    color: '#0284c7',
    fontSize: 10.5,
    fontWeight: '700',
  },
  lotTag: {
    backgroundColor: '#fffbeb',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  lotTagText: {
    color: '#d97706',
    fontSize: 10.5,
    fontWeight: '700',
  },
  expText: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '600',
  },
  tempText: {
    color: '#0284c7',
    fontSize: 11,
    fontWeight: '600',
  },
  qtyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 8,
  },
  qtyNum: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '900',
  },
  qtyUnit: {
    color: '#64748b',
    fontSize: 10.5,
    fontWeight: '600',
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#059669',
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 10,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  confirmBtnDisabled: {
    backgroundColor: '#94a3b8',
    shadowOpacity: 0,
    elevation: 0,
  },
  confirmBtnText: {
    color: '#ffffff',
    fontSize: 12.5,
    fontWeight: '800',
  },
  filterTabsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterTabActive: {
    backgroundColor: '#ecfdf5',
    borderColor: '#059669',
  },
  filterTabText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  filterTabTextActive: {
    color: '#059669',
    fontWeight: '800',
  },
  pickAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#ecfdf5',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  pickAllBtnText: {
    color: '#059669',
    fontSize: 10.5,
    fontWeight: '800',
  },
  headerScanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#059669',
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: 8,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  headerScanBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  itemScanBtn: {
    padding: 7,
    borderRadius: 8,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemScanBtnPicked: {
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'flex-end',
  },
  scannerModalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '90%',
  },
  scannerModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  scannerModalTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
  },
  scannerModalSubtitle: {
    fontSize: 11.5,
    color: '#64748b',
    marginTop: 1,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  viewfinderBox: {
    height: 160,
    backgroundColor: '#090d16',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 14,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#059669',
  },
  laserLine: {
    position: 'absolute',
    left: 20,
    right: 20,
    height: 2,
    backgroundColor: '#ef4444',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  viewfinderCorners: {
    ...StyleSheet.absoluteFillObject,
    margin: 14,
  },
  corner: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderColor: '#10b981',
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
  },
  viewfinderHint: {
    position: 'absolute',
    bottom: 10,
    color: '#cbd5e1',
    fontSize: 10.5,
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  feedbackBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    marginBottom: 14,
    borderWidth: 1,
  },
  feedbackBannerSuccess: {
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
  },
  feedbackBannerError: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  feedbackText: {
    fontSize: 12.5,
    fontWeight: '800',
    lineHeight: 16,
  },
  sectionLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#475569',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  sampleChip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sampleChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0f172a',
  },
  manualInputRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  manualInput: {
    flex: 1,
    height: 44,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 12,
    fontSize: 12.5,
    color: '#0f172a',
    fontWeight: '700',
  },
  manualScanSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#059669',
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  manualScanSubmitText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
});
