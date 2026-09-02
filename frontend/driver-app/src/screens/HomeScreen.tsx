import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';
import { DriverHeader } from '../components/DriverHeader';
import { TaskCard } from '../components/TaskCard';
import { useDriverTask } from '../context/DriverTaskContext';
import { COLORS } from '../theme/colors';
import { DeliveryTask } from '../types/driver';
import {
  Navigation,
  CheckCircle2,
  MapPin,
  ExternalLink,
  Route,
  Compass,
  RotateCcw,
  PackageCheck,
  Building2,
  Coins,
  Sparkles,
  ArrowRight,
  Store,
  Layers,
  Clock,
  Send,
  CheckCheck,
} from 'lucide-react-native';
import { openMultiStopGoogleMapsRoute, openSingleGoogleMapsNavigation } from '../utils/locationHelper';

interface HomeScreenProps {
  onSelectTask: (task: DeliveryTask) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onSelectTask }) => {
  const {
    tasks,
    assignedTasks,
    inTransitTasks,
    deliveredTasks,
    startDelivery,
    currentTripNumber,
    tripStatus,
    acceptBatchTrip,
    arrivedAtHubAndStartNextBatch,
    nextBatchQueueCount,
    totalCodCollectedCurrentTrip,
  } = useDriverTask();

  // Mặc định: nếu có đơn đang giao thì ưu tiên tab Đang Giao, ngược lại chọn Chờ Nhận
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'PENDING' | 'DONE'>(
    inTransitTasks.length > 0 ? 'ACTIVE' : 'PENDING'
  );

  const handleCallCustomer = (phone: string, name: string) => {
    Alert.alert(
      `📞 Gọi điện cho khách hàng`,
      `Liên hệ ${name} qua số ${phone}?`,
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Gọi ngay', onPress: () => Linking.openURL(`tel:${phone.replace(/\s+/g, '')}`) },
      ]
    );
  };

  const getFilteredTasks = () => {
    if (activeTab === 'ACTIVE') return tasks.filter(t => t.status === 'IN_TRANSIT');
    if (activeTab === 'PENDING') return tasks.filter(t => t.status === 'ASSIGNED');
    if (activeTab === 'DONE') return tasks.filter(t => t.status === 'DELIVERED');
    return tasks.filter(t => t.status !== 'DELIVERED');
  };

  const currentTasks = getFilteredTasks();

  // Handler: Mở Google Maps điều hướng toàn bộ chuỗi điểm dừng tối ưu VRP từ vị trí hiện tại
  const handleOpenMasterGoogleMapsRoute = () => {
    const activeStops = tasks.filter(t => t.status === 'IN_TRANSIT' || t.status === 'ASSIGNED');
    if (activeStops.length === 0) {
      Alert.alert('Thông báo', 'Hiện không có điểm dừng nào cần điều hướng.');
      return;
    }

    openMultiStopGoogleMapsRoute(
      activeStops.map(s => ({
        address: s.deliveryAddress,
        lat: s.latitude,
        lng: s.longitude,
        customerName: s.customerName,
      }))
    );
  };

  // Handler: Dẫn đường quay về Kho Gò Vấp
  const handleNavigateToHub = () => {
    openSingleGoogleMapsNavigation(
      'Kho Hàng Gò Vấp (350 Quang Trung, P.10, Gò Vấp)',
      10.8354,
      106.6668
    );
  };

  return (
    <View style={styles.container}>
      <DriverHeader />

      <ScrollView contentContainerStyle={styles.mainScroll} showsVerticalScrollIndicator={false}>

        {/* ── CASE 1: RETURNING TO HUB (GIAO XONG ĐỢT -> QUAY VỀ KHO NHẬN ĐỢT MỚI) ── */}
        {tripStatus === 'RETURNING_TO_HUB' && (
          <View style={styles.returnHubCard}>
            <View style={styles.returnHeaderRow}>
              <View style={styles.returnIconBox}>
                <RotateCcw size={22} color="#fff" />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.returnTitle}>🎉 ĐÃ HOÀN TẤT CHUYẾN #{currentTripNumber}!</Text>
                <Text style={styles.returnSub}>Hệ thống điều hướng tài xế quay về kho</Text>
              </View>
              <View style={styles.tripBadgeSuccess}>
                <Text style={styles.tripBadgeSuccessText}>100% Đạt</Text>
              </View>
            </View>

            {/* Destination Warehouse Box */}
            <View style={styles.hubDestinationBox}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Store size={18} color="#059669" />
                <Text style={styles.hubNameText}>Kho Trung Tâm Gò Vấp (WH-006)</Text>
              </View>
              <Text style={styles.hubAddressText}>📍 350 Quang Trung, Phường 10, Quận Gò Vấp</Text>

              {/* COD & Gel Ice Status */}
              <View style={styles.returnMetricsRow}>
                <View style={styles.returnMetricItem}>
                  <Text style={styles.returnMetricLabel}>💰 Tiền COD đã thu:</Text>
                  <Text style={styles.returnMetricVal}>{totalCodCollectedCurrentTrip.toLocaleString('vi-VN')}đ</Text>
                </View>
                <View style={styles.returnMetricItem}>
                  <Text style={styles.returnMetricLabel}>📦 Đợt tiếp theo (Chuyến #{currentTripNumber + 1}):</Text>
                  <Text style={styles.returnMetricValGreen}>{nextBatchQueueCount} đơn đang chờ sẵn</Text>
                </View>
              </View>
            </View>

            {/* Action Buttons: Navigate to Hub & Confirm Arrival */}
            <TouchableOpacity
              style={styles.navigateHubBtn}
              onPress={handleNavigateToHub}
              activeOpacity={0.85}
            >
              <Compass size={18} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.navigateHubBtnText}>🗺️ Dẫn Đường Quay Về Kho Gò Vấp (Google Maps)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.confirmArrivedBtn}
              onPress={() => {
                Alert.alert(
                  '🏬 Xác nhận đã về tới kho',
                  `Bàn giao tiền COD (${totalCodCollectedCurrentTrip.toLocaleString('vi-VN')}đ), đổi túi gel đá và nhận danh sách Chuyến #${currentTripNumber + 1}?`,
                  [
                    { text: 'Chưa', style: 'cancel' },
                    { text: 'Xác Nhận & Nhận Chuyến Mới', onPress: arrivedAtHubAndStartNextBatch },
                  ]
                );
              }}
              activeOpacity={0.85}
            >
              <PackageCheck size={18} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.confirmArrivedBtnText}>✅ TÔI ĐÃ VỀ TỚI KHO (Nhận Chuyến #{currentTripNumber + 1})</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── CASE 2: WAITING BATCH ACCEPTANCE (TẠI KHO - NHẬN TOÀN BỘ DANH SÁCH ĐỢT MỚI) ── */}
        {tripStatus === 'WAITING_ACCEPT' && (
          <View style={styles.waitingAcceptCard}>
            <View style={styles.waitingHeaderRow}>
              <View style={styles.waitingIconBox}>
                <Sparkles size={20} color="#fff" />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.waitingTitle}>📦 ĐỢT PHÂN BỔ MỚI: CHUYẾN #{currentTripNumber}</Text>
                <Text style={styles.waitingSub}>Thuật toán AI đã gom xong toàn bộ {tasks.length} đơn hàng</Text>
              </View>
            </View>

            <View style={styles.waitingSummaryBox}>
              <Text style={styles.waitingSummaryText}>
                📍 Xuất phát: <Text style={{ fontWeight: 'bold', color: '#0f172a' }}>Kho Gò Vấp (WH-006)</Text>
              </Text>
              <Text style={styles.waitingSummaryText}>
                🛵 Tổng điểm dừng: <Text style={{ fontWeight: 'bold', color: '#0f172a' }}>{tasks.length} địa chỉ</Text> • Ước tính: <Text style={{ fontWeight: 'bold', color: '#0284c7' }}>~35 phút</Text>
              </Text>
            </View>

            <TouchableOpacity
              style={styles.acceptBatchBtn}
              onPress={() => {
                Alert.alert(
                  `📦 Nhận Chuyến #${currentTripNumber}`,
                  `Xác nhận nhận trọn bộ ${tasks.length} đơn hàng đã xếp vào thùng lạnh và xuất phát?`,
                  [
                    { text: 'Kiểm lại hàng', style: 'cancel' },
                    { text: 'Xuất Phát Ngay', onPress: acceptBatchTrip },
                  ]
                );
              }}
              activeOpacity={0.85}
            >
              <PackageCheck size={18} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.acceptBatchBtnText}>
                🚀 NHẬN TRỌN BỘ {tasks.length} ĐƠN & XUẤT PHÁT
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── VRP OPTIMIZED MULTI-STOP ROUTE MASTER CARD ── */}
        <View style={styles.vrpMasterCard}>
          <View style={styles.vrpTitleRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={styles.vrpIconBox}>
                <Route size={18} color="#fff" />
              </View>
              <View style={{ marginLeft: 8 }}>
                <Text style={styles.vrpMainTitle}>Lộ Trình Đa Điểm Dừng VRP (Chuyến #{currentTripNumber})</Text>
                <Text style={styles.vrpSubCorridor}>Trục Tuyến Đường Tối Ưu Xe Máy Thùng Lạnh</Text>
              </View>
            </View>
            <View style={styles.vrpBadge}>
              <Text style={styles.vrpBadgeText}>-35% Quãng đường</Text>
            </View>
          </View>

          {/* Stepper Điểm Dừng Thực Tế */}
          <View style={styles.stepperContainer}>
            <View style={styles.originRow}>
              <View style={styles.originDot} />
              <Text style={styles.originText}>
                Xuất phát: <Text style={{ fontWeight: '800', color: '#0f172a' }}>Kho Hàng Gò Vấp (350 Quang Trung)</Text>
              </Text>
            </View>

            {tasks.filter(t => t.status === 'IN_TRANSIT' || t.status === 'ASSIGNED').length > 0 ? (
              <View style={styles.stopsSummaryList}>
                {tasks
                  .filter(t => t.status === 'IN_TRANSIT' || t.status === 'ASSIGNED')
                  .slice(0, 4)
                  .map((task, idx) => (
                    <View key={task.id} style={styles.stopSummaryItem}>
                      <View style={styles.stopNumberBadge}>
                        <Text style={styles.stopNumberText}>{idx + 1}</Text>
                      </View>
                      <Text style={styles.stopAddressShort} numberOfLines={1}>
                        {task.customerName} - {task.deliveryAddress.split(',')[0]}
                      </Text>
                    </View>
                  ))}
                {tasks.filter(t => t.status === 'IN_TRANSIT' || t.status === 'ASSIGNED').length > 4 && (
                  <Text style={styles.moreStopsText}>
                    + {tasks.filter(t => t.status === 'IN_TRANSIT' || t.status === 'ASSIGNED').length - 4} điểm dừng tiếp theo...
                  </Text>
                )}
              </View>
            ) : (
              <Text style={styles.noActiveRouteText}>
                🎉 Toàn bộ đơn hàng của Chuyến #{currentTripNumber} đã giao xong!
              </Text>
            )}
          </View>

          {/* Google Maps Master Action Button */}
          <TouchableOpacity
            style={styles.openGoogleMapsMasterBtn}
            onPress={handleOpenMasterGoogleMapsRoute}
            activeOpacity={0.85}
          >
            <Compass size={18} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.openGoogleMapsMasterText}>
              🗺️ Mở Toàn Bộ Tuyến Đường Trên Google Maps
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── 3 HIGH-PROMINENCE STATUS FILTER CARDS (ĐÃ BỎ TAB TẤT CẢ) ── */}
        <View style={styles.prominentTabsContainer}>
          
          {/* TAB 1: ĐANG GIAO (MÀU XANH LỤC PHÁT SÁNG NỔI BẬT) */}
          <TouchableOpacity
            style={[
              styles.prominentTabBtn,
              activeTab === 'ACTIVE' && styles.prominentTabBtnActiveEmerald,
            ]}
            onPress={() => setActiveTab('ACTIVE')}
            activeOpacity={0.85}
          >
            <View style={styles.tabBadgeRow}>
              <View style={[
                styles.largeCountBadge,
                inTransitTasks.length > 0 ? styles.countBadgeEmerald : styles.countBadgeMuted,
              ]}>
                <Text style={styles.largeCountText}>{inTransitTasks.length}</Text>
              </View>
              {inTransitTasks.length > 0 && (
                <View style={styles.livePulseDot} />
              )}
            </View>
            <Text style={[
              styles.prominentTabTitle,
              activeTab === 'ACTIVE' ? styles.tabTitleActiveEmerald : styles.tabTitleMuted,
            ]}>
              ĐANG GIAO
            </Text>
            <Text style={styles.tabSubText}>Tiến trình live</Text>
          </TouchableOpacity>

          {/* TAB 2: CHỜ NHẬN / CHỜ GIAO (MÀU CAM NỔI BẬT) */}
          <TouchableOpacity
            style={[
              styles.prominentTabBtn,
              activeTab === 'PENDING' && styles.prominentTabBtnActiveAmber,
            ]}
            onPress={() => setActiveTab('PENDING')}
            activeOpacity={0.85}
          >
            <View style={styles.tabBadgeRow}>
              <View style={[
                styles.largeCountBadge,
                assignedTasks.length > 0 ? styles.countBadgeAmber : styles.countBadgeMuted,
              ]}>
                <Text style={styles.largeCountText}>{assignedTasks.length}</Text>
              </View>
            </View>
            <Text style={[
              styles.prominentTabTitle,
              activeTab === 'PENDING' ? styles.tabTitleActiveAmber : styles.tabTitleMuted,
            ]}>
              CHỜ NHẬN
            </Text>
            <Text style={styles.tabSubText}>Chờ xuất phát</Text>
          </TouchableOpacity>

          {/* TAB 3: ĐÃ GIAO (MÀU XANH DƯƠNG / SLATE) */}
          <TouchableOpacity
            style={[
              styles.prominentTabBtn,
              activeTab === 'DONE' && styles.prominentTabBtnActiveBlue,
            ]}
            onPress={() => setActiveTab('DONE')}
            activeOpacity={0.85}
          >
            <View style={styles.tabBadgeRow}>
              <View style={[
                styles.largeCountBadge,
                deliveredTasks.length > 0 ? styles.countBadgeBlue : styles.countBadgeMuted,
              ]}>
                <Text style={styles.largeCountText}>{deliveredTasks.length}</Text>
              </View>
            </View>
            <Text style={[
              styles.prominentTabTitle,
              activeTab === 'DONE' ? styles.tabTitleActiveBlue : styles.tabTitleMuted,
            ]}>
              ĐÃ GIAO
            </Text>
            <Text style={styles.tabSubText}>Hoàn tất POD</Text>
          </TouchableOpacity>

        </View>

        {/* TASK LIST */}
        <View style={styles.taskListContainer}>
          {currentTasks.length === 0 ? (
            <View style={styles.emptyContainer}>
              <CheckCircle2 size={48} color={COLORS.textMuted} />
              <Text style={styles.emptyTitle}>
                {activeTab === 'ACTIVE'
                  ? 'Chưa có đơn hàng đang giao'
                  : activeTab === 'PENDING'
                  ? 'Không còn đơn chờ nhận'
                  : 'Chưa có đơn hoàn thành trong chuyến này'}
              </Text>
              <Text style={styles.emptySub}>
                {activeTab === 'ACTIVE'
                  ? 'Hãy chọn một đơn trong mục "Chờ Nhận" và bấm "Bắt Đầu Giao".'
                  : 'Vui lòng kiểm tra lại lộ trình hoặc đợi đợt phân bổ tiếp theo.'}
              </Text>
            </View>
          ) : (
            currentTasks.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                onPress={() => onSelectTask(task)}
                onCallCustomer={() => handleCallCustomer(task.customerPhone, task.customerName)}
                onStartDelivery={() => {
                  startDelivery(task.id);
                  onSelectTask({ ...task, status: 'IN_TRANSIT' });
                }}
              />
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  mainScroll: {
    padding: 16,
    paddingBottom: 40,
  },

  // ── RETURN TO HUB CARD ──
  returnHubCard: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#38bdf8',
    shadowColor: '#0284c7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  returnHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  returnIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0284c7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  returnTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#fff',
  },
  returnSub: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  tripBadgeSuccess: {
    backgroundColor: '#059669',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tripBadgeSuccessText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
  },
  hubDestinationBox: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  hubNameText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#34d399',
    marginLeft: 6,
  },
  hubAddressText: {
    fontSize: 12,
    color: '#cbd5e1',
    marginTop: 4,
  },
  returnMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  returnMetricItem: {
    flex: 1,
  },
  returnMetricLabel: {
    fontSize: 11,
    color: '#94a3b8',
  },
  returnMetricVal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#fbbf24',
    marginTop: 2,
  },
  returnMetricValGreen: {
    fontSize: 13,
    fontWeight: '800',
    color: '#34d399',
    marginTop: 2,
  },
  navigateHubBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0284c7',
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: 8,
  },
  navigateHubBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  confirmArrivedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    borderRadius: 12,
    paddingVertical: 12,
  },
  confirmArrivedBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },

  // ── WAITING ACCEPT CARD ──
  waitingAcceptCard: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#10b981',
  },
  waitingHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  waitingIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
  },
  waitingTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#fff',
  },
  waitingSub: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  waitingSummaryBox: {
    backgroundColor: '#1e293b',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  waitingSummaryText: {
    fontSize: 12,
    color: '#cbd5e1',
    marginVertical: 2,
  },
  acceptBatchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    borderRadius: 12,
    paddingVertical: 13,
  },
  acceptBatchBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '900',
  },

  // ── VRP MASTER CARD ──
  vrpMasterCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  vrpTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  vrpIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#0284c7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vrpMainTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  vrpSubCorridor: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  vrpBadge: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  vrpBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
  },
  stepperContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  originRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  originDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#059669',
    marginRight: 8,
  },
  originText: {
    fontSize: 12,
    color: '#475569',
  },
  stopsSummaryList: {
    marginLeft: 4,
    paddingLeft: 8,
    borderLeftWidth: 2,
    borderLeftColor: '#cbd5e1',
    gap: 6,
  },
  stopSummaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stopNumberBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#0284c7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  stopNumberText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#ffffff',
  },
  stopAddressShort: {
    fontSize: 12,
    color: '#334155',
    flex: 1,
  },
  moreStopsText: {
    fontSize: 11,
    color: '#64748b',
    fontStyle: 'italic',
    marginTop: 2,
  },
  noActiveRouteText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
    textAlign: 'center',
    paddingVertical: 6,
  },
  openGoogleMapsMasterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 12,
    paddingVertical: 12,
  },
  openGoogleMapsMasterText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },

  // ── 3 HIGH-PROMINENCE STATUS FILTER CARDS ──
  prominentTabsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  prominentTabBtn: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  prominentTabBtnActiveEmerald: {
    backgroundColor: '#ecfdf5',
    borderColor: '#10b981',
    shadowColor: '#10b981',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  prominentTabBtnActiveAmber: {
    backgroundColor: '#fffbeb',
    borderColor: '#f59e0b',
    shadowColor: '#f59e0b',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  prominentTabBtnActiveBlue: {
    backgroundColor: '#f0f9ff',
    borderColor: '#0284c7',
    shadowColor: '#0284c7',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  tabBadgeRow: {
    position: 'relative',
    marginBottom: 4,
  },
  largeCountBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  countBadgeEmerald: {
    backgroundColor: '#059669',
  },
  countBadgeAmber: {
    backgroundColor: '#d97706',
  },
  countBadgeBlue: {
    backgroundColor: '#0284c7',
  },
  countBadgeMuted: {
    backgroundColor: '#94a3b8',
  },
  largeCountText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
  },
  livePulseDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#22c55e',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  prominentTabTitle: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.3,
    marginTop: 2,
  },
  tabTitleActiveEmerald: {
    color: '#059669',
  },
  tabTitleActiveAmber: {
    color: '#b45309',
  },
  tabTitleActiveBlue: {
    color: '#0284c7',
  },
  tabTitleMuted: {
    color: '#475569',
  },
  tabSubText: {
    fontSize: 9.5,
    color: '#94a3b8',
    marginTop: 1,
  },

  // ── TASK LIST ──
  taskListContainer: {
    gap: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 12,
  },
  emptySub: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
});
