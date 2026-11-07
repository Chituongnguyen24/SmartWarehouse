import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  Modal,
  Image,
} from 'react-native';
import { DriverHeader } from '../components/DriverHeader';
import { TaskCard } from '../components/TaskCard';
import { GoongDriverLiveMap } from '../components/GoongDriverLiveMap';
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
  ArrowRight,
  Store,
  Layers,
  Clock,
  Send,
  CheckCheck,
  QrCode,
  Copy,
  Check,
  X,
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
    isLoadedOnVehicle,
    confirmLoadOntoVehicle,
    startBatchDelivery,
    acceptBatchTrip,
    arrivedAtHubAndStartNextBatch,
    nextWaveTasks,
    nextBatchQueueCount,
    totalCodCollectedCurrentTrip,
    totalCurrentTripWeightKg,
    currentDriverLocation,
    driverProfile,
  } = useDriverTask();

  // Chế độ xem: Đợt đang chất lên xe (Chuyến hiện tại) HOẶC Đợt tiếp theo (Chuyến kế tiếp)
  const [waveMode, setWaveMode] = useState<'CURRENT_BATCH' | 'NEXT_WAVE'>('CURRENT_BATCH');

  // Mặc định: nếu có đơn đang giao thì ưu tiên tab Đang Giao, ngược lại chọn Chờ Nhận
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'PENDING' | 'DONE'>(
    inTransitTasks.length > 0 ? 'ACTIVE' : 'PENDING'
  );

  // VietQR Dynamic Modal State
  const [showVietQrModal, setShowVietQrModal] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);

  const handleCallCustomer = (phone: string, name: string) => {
    Alert.alert(
      'Gọi điện cho khách hàng',
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

  const codTransferContent = `NOP COD ${driverProfile?.id || 'TX01'} CHUYEN ${currentTripNumber}`;
  const dynamicVietQrUrl = `https://img.vietqr.io/image/MB-0901234567-compact2.png?amount=${totalCodCollectedCurrentTrip}&addInfo=${encodeURIComponent(codTransferContent)}&accountName=KHO%20TRUNG%20TAM%20SFWMS`;

  const totalTripBoxes = tasks.reduce((sum, t) => sum + (t.packageCount || 1), 0);
  const totalTripItems = tasks.reduce((sum, t) => sum + (t.items?.reduce((s, it) => s + (it.quantity || 1), 0) || 1), 0);
  const nextTripBoxes = nextWaveTasks.reduce((sum, t) => sum + (t.packageCount || 1), 0);
  const nextTripItems = nextWaveTasks.reduce((sum, t) => sum + (t.items?.reduce((s, it) => s + (it.quantity || 1), 0) || 1), 0);

  return (
    <View style={styles.container}>
      <DriverHeader />

      <ScrollView contentContainerStyle={styles.mainScroll} showsVerticalScrollIndicator={false}>

        {/* ── CASE 1: RETURNING TO HUB (GIAO XONG ĐỢT -> QUAY VỀ KHO NHẬN ĐỢT MỚI) ── */}
        {tripStatus === 'RETURNING_TO_HUB' && (
          <View style={styles.returnHubCard}>
            <View style={styles.returnHeaderRow}>
              <View style={styles.returnIconBox}>
                <RotateCcw size={20} color="#fff" />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.returnTitle}>ĐÃ HOÀN TẤT CHUYẾN #{currentTripNumber}</Text>
                <Text style={styles.returnSub}>Vui lòng quay về Kho nhận đợt hàng tiếp theo & nộp COD</Text>
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
              <Text style={styles.hubAddressText}>350 Quang Trung, Phường 10, Quận Gò Vấp</Text>

              {/* COD & Gel Ice Status */}
              <View style={styles.returnMetricsRow}>
                <View style={styles.returnMetricItem}>
                  <Text style={styles.returnMetricLabel}>Tiền COD đã thu:</Text>
                  <Text style={styles.returnMetricVal}>{totalCodCollectedCurrentTrip.toLocaleString('vi-VN')}đ</Text>
                </View>
                <View style={styles.returnMetricItem}>
                  <Text style={styles.returnMetricLabel}>Đợt tiếp theo (Chuyến #{currentTripNumber + 1}):</Text>
                  <Text style={styles.returnMetricValGreen}>
                    {nextWaveTasks.length > 0 ? `${nextWaveTasks.length} đơn (${nextTripBoxes} thùng đóng gói)` : 'Chưa có đơn mới (Chờ kho phân bổ)'}
                  </Text>
                </View>
              </View>
            </View>

            {/* VietQR COD Settlement CTA Button */}
            {totalCodCollectedCurrentTrip > 0 && (
              <TouchableOpacity
                style={styles.vietQrPayBtn}
                onPress={() => setShowVietQrModal(true)}
                activeOpacity={0.85}
              >
                <QrCode size={18} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.vietQrPayBtnText}>
                  Nộp Tiền COD Bằng VietQR ({totalCodCollectedCurrentTrip.toLocaleString('vi-VN')}đ)
                </Text>
              </TouchableOpacity>
            )}

            {/* Action Buttons: Navigate to Hub & Confirm Arrival */}
            <TouchableOpacity
              style={styles.navigateHubBtn}
              onPress={handleNavigateToHub}
              activeOpacity={0.85}
            >
              <Compass size={18} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.navigateHubBtnText}>Dẫn Đường Quay Về Kho Gò Vấp (Google Maps)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.confirmArrivedBtn}
              onPress={() => {
                arrivedAtHubAndStartNextBatch();
              }}
              activeOpacity={0.85}
            >
              <PackageCheck size={18} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.confirmArrivedBtnText}>TÔI ĐÃ VỀ TỚI KHO (Nhận Chuyến #{currentTripNumber + 1})</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── CASE 2: WAITING BATCH ACCEPTANCE (TẠI KHO - NHẬN TOÀN BỘ DANH SÁCH ĐỢT MỚI) ── */}
        {tripStatus === 'WAITING_ACCEPT' && (
          <View style={styles.waitingAcceptCard}>
            <View style={styles.waitingHeaderRow}>
              <View style={styles.waitingIconBox}>
                <Route size={20} color="#fff" />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.waitingTitle}>ĐỢT PHÂN BỔ MỚI: CHUYẾN #{currentTripNumber}</Text>
                <Text style={styles.waitingSub}>
                  Thuật toán gom: {tasks.length} đơn ({totalTripBoxes} thùng đóng gói • {totalTripItems} sản phẩm)
                </Text>
              </View>
            </View>

            <View style={styles.waitingSummaryBox}>
              <Text style={styles.waitingSummaryText}>
                Xuất phát: <Text style={{ fontWeight: 'bold', color: '#0f172a' }}>Kho Gò Vấp (WH-006)</Text>
              </Text>
              <Text style={styles.waitingSummaryText}>
                Điểm dừng giao: <Text style={{ fontWeight: 'bold', color: '#0f172a' }}>{tasks.length} đơn hàng</Text> • Quy cách: <Text style={{ fontWeight: 'bold', color: '#059669' }}>{totalTripBoxes} Thùng đóng gói ({totalTripItems} món • {totalCurrentTripWeightKg} kg)</Text>
              </Text>
            </View>

            <TouchableOpacity
              style={styles.acceptBatchBtn}
              onPress={() => {
                acceptBatchTrip();
              }}
              activeOpacity={0.85}
            >
              <PackageCheck size={18} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.acceptBatchBtnText}>
                NHẬN {tasks.length} ĐƠN ({totalTripBoxes} THÙNG ĐÓNG GÓI) & XUẤT PHÁT
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── GOONG MAPS INTERACTIVE LIVE ROUTE & GPS TRACKING ── */}
        <GoongDriverLiveMap
          driverLocation={currentDriverLocation}
          tasks={tasks}
          currentTask={tasks.find(t => t.status === 'IN_TRANSIT') || null}
          driverName={driverProfile?.name || 'Tài xế'}
          vehicleType={(driverProfile?.vehicleType as any) || 'TRUCK'}
          isBatchDeparted={tripStatus === 'IN_TRANSIT'}
        />

        {/* ── TRIP WAVE SELECTOR (ĐỢT CHẤT LÊN XE vs ĐỢT TIẾP THEO) ── */}
        <View style={styles.waveSelectorContainer}>
          <TouchableOpacity
            style={[
              styles.waveSelectorBtn,
              waveMode === 'CURRENT_BATCH' && styles.waveSelectorBtnActive,
            ]}
            onPress={() => setWaveMode('CURRENT_BATCH')}
            activeOpacity={0.85}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
              <Layers size={16} color={waveMode === 'CURRENT_BATCH' ? '#ffffff' : '#94a3b8'} style={{ marginRight: 6 }} />
              <Text style={[
                styles.waveSelectorBtnText,
                waveMode === 'CURRENT_BATCH' && styles.waveSelectorBtnTextActive,
              ]}>
                CHUYẾN #{currentTripNumber} (ĐỢT HIỆN TẠI)
              </Text>
            </View>
            <Text style={[
              styles.waveSelectorSubText,
              waveMode === 'CURRENT_BATCH' && { color: '#a7f3d0' },
            ]}>
              {tasks.length} đơn • {totalTripBoxes} Thùng đóng gói ({totalTripItems} món • {totalCurrentTripWeightKg} kg)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.waveSelectorBtn,
              waveMode === 'NEXT_WAVE' && styles.waveSelectorBtnActivePurple,
            ]}
            onPress={() => setWaveMode('NEXT_WAVE')}
            activeOpacity={0.85}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={16} color={waveMode === 'NEXT_WAVE' ? '#ffffff' : '#94a3b8'} style={{ marginRight: 6 }} />
              <Text style={[
                styles.waveSelectorBtnText,
                waveMode === 'NEXT_WAVE' && styles.waveSelectorBtnTextActive,
              ]}>
                CHUYẾN #{currentTripNumber + 1} (ĐỢT KẾ TIẾP)
              </Text>
            </View>
            <Text style={[
              styles.waveSelectorSubText,
              waveMode === 'NEXT_WAVE' && { color: '#e9d5ff' },
            ]}>
              {nextWaveTasks.length} đơn • {nextTripBoxes} Thùng đóng gói (Đang đóng gói tại kho)
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── HUB LOADING MANIFEST CHECKLIST (KHI Ở ĐỢT HIỆN TẠI) ── */}
        {waveMode === 'CURRENT_BATCH' && assignedTasks.length > 0 && (
          <View style={styles.hubManifestCard}>
            <View style={styles.hubManifestHeader}>
              <View style={styles.hubManifestIconBox}>
                <PackageCheck size={20} color="#ffffff" />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.hubManifestTitle}>KIỂM ĐẾM GOM HÀNG CHUYẾN #{currentTripNumber}</Text>
                <Text style={styles.hubManifestSub}>Xác nhận đã bốc đủ hàng từ kho vào thùng lạnh</Text>
              </View>
              <View style={styles.hubManifestBadge}>
                <Text style={styles.hubManifestBadgeText}>{totalCurrentTripWeightKg} kg</Text>
              </View>
            </View>

            <View style={styles.hubManifestBody}>
              <View style={styles.hubManifestInfoRow}>
                <Text style={styles.hubManifestLabel}>Điểm xuất phát gom hàng:</Text>
                <Text style={styles.hubManifestVal}>Kho Trung Tâm Gò Vấp (WH-006)</Text>
              </View>
              <View style={styles.hubManifestInfoRow}>
                <Text style={styles.hubManifestLabel}>Tổng số kiện / đơn chất xe:</Text>
                <Text style={styles.hubManifestValBold}>{tasks.length} đơn hàng ({assignedTasks.length} đơn chờ nhận)</Text>
              </View>
              <View style={styles.hubManifestInfoRow}>
                <Text style={styles.hubManifestLabel}>Yêu cầu bảo quản lạnh:</Text>
                <Text style={styles.hubManifestValGreen}>Chuẩn 0 - 4°C (Thùng Xe Lạnh + Gel đá)</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.confirmLoadVehicleBtn}
              onPress={async () => {
                confirmLoadOntoVehicle();
                await startBatchDelivery();
                setActiveTab('ACTIVE');
              }}
              activeOpacity={0.85}
            >
              <CheckCheck size={18} color="#ffffff" style={{ marginRight: 8 }} />
              <Text style={styles.confirmLoadVehicleBtnText}>
                ĐÃ XẾP ĐỦ {tasks.length} ĐƠN LÊN XE • BẮT ĐẦU XUẤT PHÁT
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── NEXT WAVE EXPLANATION BANNER (KHI XEM ĐỢT TIẾP THEO) ── */}
        {waveMode === 'NEXT_WAVE' && (
          <View style={styles.nextWaveBanner}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
              <Clock size={18} color="#a855f7" style={{ marginRight: 6 }} />
              <Text style={styles.nextWaveBannerTitle}>
                DANH SÁCH ĐỢT TIẾP THEO (CHUYẾN #{currentTripNumber + 1})
              </Text>
            </View>
            <Text style={styles.nextWaveBannerDesc}>
              Các đơn hàng dưới đây đang được nhân viên kho soạn hàng tại <Text style={{ fontWeight: 'bold', color: '#0f172a' }}>Kho Gò Vấp (WH-006)</Text>. Tài xế sẽ quay về kho nhận đợt này sau khi hoàn tất Chuyến #{currentTripNumber}.
            </Text>
            <View style={styles.nextWaveBadgeRow}>
              <View style={styles.nextWaveInfoBadge}>
                <Text style={styles.nextWaveInfoBadgeText}>{nextWaveTasks.length} Đơn hàng dự kiến</Text>
              </View>
              <View style={styles.nextWaveInfoBadge}>
                <Text style={styles.nextWaveInfoBadgeText}>Khung giờ 14:00 - 16:00</Text>
              </View>
            </View>
          </View>
        )}

        {/* ── VRP OPTIMIZED MULTI-STOP ROUTE MASTER CARD ── */}
        <View style={styles.vrpMasterCard}>
          <View style={styles.vrpTitleRow}>
            <View style={styles.vrpTitleLeft}>
              <View style={styles.vrpIconBox}>
                <Route size={16} color="#fff" />
              </View>
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.vrpMainTitle} numberOfLines={1}>
                  Lộ Trình VRP ({waveMode === 'CURRENT_BATCH' ? `Chuyến #${currentTripNumber}` : `Chuyến #${currentTripNumber + 1}`})
                </Text>
                <Text style={styles.vrpSubCorridor} numberOfLines={1}>
                  {driverProfile?.vehicleType || 'Tuyến Giao Tối Ưu'}
                </Text>
              </View>
            </View>
            <View style={styles.vrpBadge}>
              <Text style={styles.vrpBadgeText}>-35% km</Text>
            </View>
          </View>

          {/* Stepper Điểm Dừng Thực Tế */}
          <View style={styles.stepperContainer}>
            <View style={styles.originRow}>
              <View style={styles.originDot} />
              <Text style={styles.originText} numberOfLines={1}>
                Xuất phát: <Text style={{ fontWeight: '800', color: '#0f172a' }}>Kho Gò Vấp (350 Quang Trung)</Text>
              </Text>
            </View>

            {(waveMode === 'CURRENT_BATCH' ? tasks : nextWaveTasks).filter(t => t.status === 'IN_TRANSIT' || t.status === 'ASSIGNED').length > 0 ? (
              <View style={styles.stopsSummaryList}>
                {(waveMode === 'CURRENT_BATCH' ? tasks : nextWaveTasks)
                  .filter(t => t.status === 'IN_TRANSIT' || t.status === 'ASSIGNED')
                  .slice(0, 4)
                  .map((task, idx) => (
                    <View key={task.id} style={styles.stopSummaryItem}>
                      <View style={styles.stopNumberBadge}>
                        <Text style={styles.stopNumberText}>{idx + 1}</Text>
                      </View>
                      <Text style={styles.stopAddressShort} numberOfLines={1}>
                        {task.customerName} - {task.deliveryAddress.split(',')[0]} ({task.distanceKm} km)
                      </Text>
                    </View>
                  ))}
                {(waveMode === 'CURRENT_BATCH' ? tasks : nextWaveTasks).filter(t => t.status === 'IN_TRANSIT' || t.status === 'ASSIGNED').length > 4 && (
                  <Text style={styles.moreStopsText}>
                    + {(waveMode === 'CURRENT_BATCH' ? tasks : nextWaveTasks).filter(t => t.status === 'IN_TRANSIT' || t.status === 'ASSIGNED').length - 4} điểm dừng tiếp theo...
                  </Text>
                )}
              </View>
            ) : (
              <Text style={styles.noActiveRouteText}>
                {tasks.length === 0
                  ? 'Chưa có đơn hàng nào được phân bổ cho chuyến này.'
                  : `Toàn bộ đơn hàng của Chuyến #${currentTripNumber} đã giao xong!`}
              </Text>
            )}
          </View>

          {/* Google Maps Master Action Button */}
          <TouchableOpacity
            style={styles.openGoogleMapsMasterBtn}
            onPress={handleOpenMasterGoogleMapsRoute}
            activeOpacity={0.85}
          >
            <Compass size={16} color="#fff" style={{ marginRight: 6 }} />
            <Text style={styles.openGoogleMapsMasterText} numberOfLines={1}>
              Mở Toàn Tuyến Trên Google Maps
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
          {waveMode === 'NEXT_WAVE' ? (
            nextWaveTasks.length === 0 ? (
              <View style={styles.emptyContainer}>
                <CheckCircle2 size={48} color={COLORS.textMuted} />
                <Text style={styles.emptyTitle}>Chưa có đơn hàng trong đợt tiếp theo</Text>
                <Text style={styles.emptySub}>Kho sẽ tiếp tục gom đơn khi có đợt phát sinh mới.</Text>
              </View>
            ) : (
              nextWaveTasks.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onPress={() => onSelectTask(task)}
                  onCallCustomer={() => handleCallCustomer(task.customerPhone, task.customerName)}
                />
              ))
            )
          ) : currentTasks.length === 0 ? (
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
                  setActiveTab('ACTIVE');
                }}
              />
            ))
          )}
        </View>
      </ScrollView>

      {/* ── VIETQR COD SETTLEMENT MODAL ── */}
      <Modal
        visible={showVietQrModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowVietQrModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={styles.qrHeaderIconBox}>
                  <QrCode size={20} color="#fff" />
                </View>
                <View style={{ marginLeft: 10 }}>
                  <Text style={styles.modalTitle}>Nộp Tiền COD Chuyến #{currentTripNumber}</Text>
                  <Text style={styles.modalSub}>Chuyển khoản Napas247 (VietQR)</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setShowVietQrModal(false)}
              >
                <X size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* QR Image Container */}
            <View style={styles.qrImageContainer}>
              <Image
                source={{ uri: dynamicVietQrUrl }}
                style={styles.qrImage}
                resizeMode="contain"
              />
              <Text style={styles.qrScanHint}>
                Mở app ngân hàng bất kỳ (MB, VCB, Techcombank...) để quét mã
              </Text>
            </View>

            {/* Bank Info Details Box */}
            <View style={styles.bankInfoBox}>
              <View style={styles.bankInfoRow}>
                <Text style={styles.bankInfoLabel}>Ngân hàng:</Text>
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
                <Text style={styles.bankInfoLabel}>Số tiền COD:</Text>
                <Text style={styles.bankInfoValAmount}>
                  {totalCodCollectedCurrentTrip.toLocaleString('vi-VN')}đ
                </Text>
              </View>
              <View style={[styles.bankInfoRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.bankInfoLabel}>Nội dung CK:</Text>
                <Text style={styles.bankInfoValContent} numberOfLines={1}>
                  {codTransferContent}
                </Text>
              </View>
            </View>

            {/* Modal Actions */}
            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={styles.modalCopyBtn}
                onPress={() => {
                  setIsCopied(true);
                  setTimeout(() => setIsCopied(false), 2500);
                  if (typeof navigator !== 'undefined' && navigator.clipboard) {
                    navigator.clipboard.writeText(`0901234567 - ${codTransferContent} - ${totalCodCollectedCurrentTrip}`);
                  }
                  Alert.alert('Đã sao chép', 'Thông tin chuyển khoản đã được sao chép.');
                }}
                activeOpacity={0.8}
              >
                {isCopied ? <Check size={16} color="#059669" /> : <Copy size={16} color="#0284c7" />}
                <Text style={[styles.modalCopyBtnText, isCopied && { color: '#059669' }]}>
                  {isCopied ? 'Đã sao chép' : 'Sao chép STK'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalDoneBtn}
                onPress={() => {
                  setShowVietQrModal(false);
                  Alert.alert('Xác nhận nộp COD', 'Hệ thống đã ghi nhận yêu cầu đối soát tiền COD cho chuyến này.');
                }}
                activeOpacity={0.85}
              >
                <CheckCircle2 size={16} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.modalDoneBtnText}>Tôi Đã Chuyển Khoản</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  vietQrPayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366f1',
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#818cf8',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  vietQrPayBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
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

  // ── VIETQR MODAL STYLES ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  qrHeaderIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  modalSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  modalCloseBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  qrImageContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 14,
  },
  qrImage: {
    width: 240,
    height: 240,
  },
  qrScanHint: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '500',
  },
  bankInfoBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
  },
  bankInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  bankInfoLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  bankInfoVal: {
    fontSize: 12,
    color: '#1e293b',
    fontWeight: '600',
  },
  bankInfoValBold: {
    fontSize: 13,
    color: '#0f172a',
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  bankInfoValAmount: {
    fontSize: 14,
    color: '#d97706',
    fontWeight: '900',
  },
  bankInfoValContent: {
    fontSize: 11,
    color: '#0284c7',
    fontWeight: '700',
    maxWidth: 200,
  },
  modalActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modalCopyBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#bae6fd',
    borderRadius: 12,
    paddingVertical: 11,
  },
  modalCopyBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284c7',
    marginLeft: 6,
  },
  modalDoneBtn: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    borderRadius: 12,
    paddingVertical: 11,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  modalDoneBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ffffff',
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

  // ── LIVE GPS HARDWARE STATUS STRIP ──
  liveGpsStrip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#0f172a',
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: '#0284c7',
  },
  liveGpsDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#22c55e',
    marginTop: 4,
    marginRight: 10,
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  liveGpsTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#38bdf8',
    letterSpacing: 0.5,
  },
  liveGpsCoords: {
    fontSize: 11.5,
    color: '#e2e8f0',
    marginTop: 2,
  },
  liveGpsSub: {
    fontSize: 10.5,
    color: '#94a3b8',
    marginTop: 3,
    fontStyle: 'italic',
  },

  // ── TRIP WAVE SELECTOR ──
  waveSelectorContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  waveSelectorBtn: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  waveSelectorBtnActive: {
    backgroundColor: '#065f46',
    borderColor: '#059669',
  },
  waveSelectorBtnActivePurple: {
    backgroundColor: '#581c87',
    borderColor: '#7e22ce',
  },
  waveSelectorBtnText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#64748b',
  },
  waveSelectorBtnTextActive: {
    color: '#ffffff',
  },
  waveSelectorSubText: {
    fontSize: 9.5,
    color: '#94a3b8',
    marginTop: 2,
    fontWeight: '600',
    textAlign: 'center',
  },

  // ── HUB LOADING MANIFEST CARD ──
  hubManifestCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: '#10b981',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  hubManifestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  hubManifestIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hubManifestTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0f172a',
  },
  hubManifestSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  hubManifestBadge: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  hubManifestBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#059669',
  },
  hubManifestBody: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 10,
    gap: 6,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  hubManifestInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  hubManifestLabel: {
    fontSize: 11.5,
    color: '#64748b',
  },
  hubManifestVal: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0f172a',
  },
  hubManifestValBold: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#0284c7',
  },
  hubManifestValGreen: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#059669',
  },
  confirmLoadVehicleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    borderRadius: 12,
    paddingVertical: 12,
  },
  confirmLoadVehicleBtnText: {
    color: '#ffffff',
    fontSize: 12.5,
    fontWeight: '900',
  },

  // ── NEXT WAVE BANNER ──
  nextWaveBanner: {
    backgroundColor: '#faf5ff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: '#d8b4fe',
  },
  nextWaveBannerTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#6b21a8',
  },
  nextWaveBannerDesc: {
    fontSize: 11.5,
    color: '#475569',
    lineHeight: 17,
  },
  nextWaveBadgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  nextWaveInfoBadge: {
    backgroundColor: '#f3e8ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  nextWaveInfoBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7e22ce',
  },

  // ── VRP MASTER CARD ──
  vrpMasterCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  vrpTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 6,
  },
  vrpTitleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  vrpIconBox: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#0284c7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vrpMainTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  vrpSubCorridor: {
    fontSize: 10.5,
    color: '#64748b',
    marginTop: 1,
  },
  vrpBadge: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#a7f3d0',
    flexShrink: 0,
  },
  vrpBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
  },
  stepperContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  originRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  originDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#059669',
    marginRight: 6,
  },
  originText: {
    fontSize: 11.5,
    color: '#475569',
    flex: 1,
  },
  stopsSummaryList: {
    marginLeft: 3,
    paddingLeft: 7,
    borderLeftWidth: 2,
    borderLeftColor: '#cbd5e1',
    gap: 4,
  },
  stopSummaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stopNumberBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#0284c7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  stopNumberText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#ffffff',
  },
  stopAddressShort: {
    fontSize: 11,
    color: '#334155',
    flex: 1,
  },
  moreStopsText: {
    fontSize: 10.5,
    color: '#64748b',
    fontStyle: 'italic',
    marginTop: 2,
  },
  noActiveRouteText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#059669',
    textAlign: 'center',
    paddingVertical: 4,
    lineHeight: 16,
  },
  openGoogleMapsMasterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  openGoogleMapsMasterText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },

  // ── 3 HIGH-PROMINENCE STATUS FILTER CARDS ──
  prominentTabsContainer: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 14,
  },
  prominentTabBtn: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  prominentTabBtnActiveEmerald: {
    backgroundColor: '#ecfdf5',
    borderColor: '#10b981',
    shadowColor: '#10b981',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  prominentTabBtnActiveAmber: {
    backgroundColor: '#fffbeb',
    borderColor: '#f59e0b',
    shadowColor: '#f59e0b',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  prominentTabBtnActiveBlue: {
    backgroundColor: '#f0f9ff',
    borderColor: '#0284c7',
    shadowColor: '#0284c7',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  tabBadgeRow: {
    position: 'relative',
    marginBottom: 3,
  },
  largeCountBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 1,
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
