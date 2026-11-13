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
  Platform,
} from 'react-native';
import { DriverHeader } from '@/shared';
import { TaskCard } from '@/features/delivery';
import { GoongDriverLiveMap } from '@/features/delivery';
import { useDriverTask } from '@/features/delivery';
import { COLORS } from '@/shared';
import { DeliveryTask } from '@/types/driver';
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
  Phone,
  MessageSquare,
  ChevronDown,
  ChevronUp,
} from 'lucide-react-native';
import { openMultiStopGoogleMapsRoute, openSingleGoogleMapsNavigation } from '@/features/delivery';

interface HomeScreenProps {
  onSelectTask: (task: DeliveryTask) => void;
  onOpenPOD?: (task: DeliveryTask) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onSelectTask, onOpenPOD }) => {
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

  // Map View Mode (Collapsible for maximizing task card visibility)
  const [isMapExpanded, setIsMapExpanded] = useState<boolean>(false);

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

  const handleCallCustomer = (phone: string, name: string) => {
    const cleanPhone = phone.replace(/\s+/g, '');
    if (Platform.OS !== 'web') {
      Linking.openURL(`tel:${cleanPhone}`).catch(() => {
        setContactModal({
          visible: true,
          type: 'CALL',
          customerName: name,
          phone,
        });
      });
      return;
    }
    setContactModal({
      visible: true,
      type: 'CALL',
      customerName: name,
      phone,
    });
  };

  const handleSmsCustomer = (task: DeliveryTask) => {
    const cleanPhone = task.customerPhone.replace(/\s+/g, '');
    const msg = `Chào bạn, tài xế C.T Mart đang giao đơn hàng #${task.orderCode} đến ${task.deliveryAddress}. Dự kiến đến nơi sau 5-10 phút. Vui lòng chuẩn bị nhận hàng nhé!`;
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

  const copyToClipboard = (text: string, label: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text);
    }
    setContactCopiedToast(`Đã sao chép ${label}!`);
    setTimeout(() => setContactCopiedToast(null), 2500);
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
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert('Lộ trình trống: Hiện không có điểm dừng nào cần điều hướng.');
      } else {
        Alert.alert('Thông báo', 'Hiện không có điểm dừng nào cần điều hướng.');
      }
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

  // Group pending/in-transit orders that share the exact same location (e.g. 5 orders at Đa Phước)
  const pendingOrActiveTasks = tasks.filter(t => t.status !== 'DELIVERED');
  const clusterMap: Record<string, DeliveryTask[]> = {};
  pendingOrActiveTasks.forEach(t => {
    const rawDest = ((t as any).customerAddress || t.deliveryAddress || t.customerName || '').toLowerCase().trim();
    const clusterKey = rawDest.includes('đa phước') ? 'Khu Liên Hợp Xử Lý Đa Phước' : (t.customerName || t.deliveryAddress || 'Điểm Giao');
    clusterMap[clusterKey] = clusterMap[clusterKey] || [];
    clusterMap[clusterKey].push(t);
  });
  const sameDestinationClusters = Object.entries(clusterMap).filter(([_, list]) => list.length > 1);

  return (
    <View style={styles.container}>
      <DriverHeader />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.mainScroll} showsVerticalScrollIndicator={false}>

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
                  Đợt giao hàng: {tasks.length} đơn ({totalTripBoxes} thùng đóng gói • {totalTripItems} sản phẩm)
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
                NHẬN {tasks.length} ĐƠN HÀNG ({totalTripBoxes} KIỆN HÀNG) & XUẤT PHÁT
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── 1. ROUTE CORRIDOR BAR & MAP EXPAND TOGGLE ── */}
        <View style={styles.corridorBar}>
          <View style={styles.corridorLeft}>
            <Route size={14} color="#0284c7" style={{ marginRight: 6 }} />
            <Text style={styles.corridorText} numberOfLines={1}>
              Kho Gò Vấp • {tasks.length} Đơn hàng • Tổng {totalTripBoxes} Kiện ({totalTripItems} sản phẩm • {totalCurrentTripWeightKg} kg)
            </Text>
          </View>
          <View style={styles.corridorActions}>
            <TouchableOpacity
              style={[styles.corridorPillBtn, isMapExpanded && styles.corridorPillBtnActive]}
              onPress={() => setIsMapExpanded(!isMapExpanded)}
              activeOpacity={0.8}
            >
              <MapPin size={11} color={isMapExpanded ? '#ffffff' : '#0284c7'} style={{ marginRight: 3 }} />
              <Text style={[styles.corridorPillText, isMapExpanded && styles.corridorPillTextActive]}>
                {isMapExpanded ? 'Đóng map' : 'Bản đồ'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.corridorPillBtn}
              onPress={handleOpenMasterGoogleMapsRoute}
              activeOpacity={0.8}
            >
              <Compass size={11} color="#0284c7" style={{ marginRight: 3 }} />
              <Text style={styles.corridorPillText}>Google Maps</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── 2. EXPANDABLE LIVE GOONG MAP ── */}
        {isMapExpanded && (
          <View style={styles.mapExpandWrapper}>
            <GoongDriverLiveMap
              driverLocation={currentDriverLocation}
              tasks={tasks}
              currentTask={tasks.find(t => t.status === 'IN_TRANSIT') || null}
              driverName={driverProfile?.name || 'Tài xế'}
              vehicleType={(driverProfile?.vehicleType as any) || 'TRUCK'}
              isBatchDeparted={tripStatus === 'IN_TRANSIT'}
            />
          </View>
        )}

        {/* ── 3. MODERN SEGMENTED WAVE CONTROLLER ── */}
        <View style={styles.waveSegmentBar}>
          <TouchableOpacity
            style={[styles.waveSegmentBtn, waveMode === 'CURRENT_BATCH' && styles.waveSegmentBtnActive]}
            onPress={() => setWaveMode('CURRENT_BATCH')}
            activeOpacity={0.85}
          >
            <Layers size={13} color={waveMode === 'CURRENT_BATCH' ? '#0f766e' : '#64748b'} style={{ marginRight: 5 }} />
            <Text style={[styles.waveSegmentText, waveMode === 'CURRENT_BATCH' && styles.waveSegmentTextActive]}>
              Chuyến #{currentTripNumber}: {tasks.length} Đơn ({totalTripBoxes} Kiện)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.waveSegmentBtn, waveMode === 'NEXT_WAVE' && styles.waveSegmentBtnActivePurple]}
            onPress={() => setWaveMode('NEXT_WAVE')}
            activeOpacity={0.85}
          >
            <Clock size={13} color={waveMode === 'NEXT_WAVE' ? '#7c3aed' : '#64748b'} style={{ marginRight: 5 }} />
            <Text style={[styles.waveSegmentText, waveMode === 'NEXT_WAVE' && styles.waveSegmentTextActivePurple]}>
              Chuyến #{currentTripNumber + 1}: {nextWaveTasks.length} Đơn ({nextTripBoxes} Kiện)
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── 4. COMPACT LOADING / DEPARTURE ACTION BAR ── */}
        {waveMode === 'CURRENT_BATCH' && assignedTasks.length > 0 && (
          <View style={styles.loadingBanner}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.loadingBannerTitle}>
                Kiểm đếm xe: {tasks.length} Đơn hàng ({totalTripBoxes} Kiện hàng)
              </Text>
              <Text style={styles.loadingBannerSub} numberOfLines={1}>
                {assignedTasks.length} đơn chờ nhận • Tổng {totalTripItems} sản phẩm ({totalCurrentTripWeightKg} kg)
              </Text>
            </View>
            <TouchableOpacity
              style={styles.loadingBannerBtn}
              onPress={async () => {
                confirmLoadOntoVehicle();
                await startBatchDelivery();
                setActiveTab('ACTIVE');
              }}
              activeOpacity={0.85}
            >
              <CheckCheck size={14} color="#ffffff" style={{ marginRight: 4 }} />
              <Text style={styles.loadingBannerBtnText}>ĐÃ XẾP LÊN XE</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── 5. NEXT WAVE INFO ── */}
        {waveMode === 'NEXT_WAVE' && (
          <View style={styles.nextWaveBanner}>
            <Clock size={15} color="#7c3aed" style={{ marginRight: 6 }} />
            <Text style={styles.nextWaveBannerTitle}>
              Chuyến #{currentTripNumber + 1}: {nextWaveTasks.length} đơn đang soạn hàng tại Kho Gò Vấp (14:00 - 16:00)
            </Text>
          </View>
        )}

        {/* ── 6. SAME-DESTINATION CLUSTER BATCH HANDOVER ── */}
        {sameDestinationClusters.length > 0 && (
          <View style={styles.clusterBannerBox}>
            {sameDestinationClusters.map(([locName, clusterTasks]) => {
              const clusterTotalCod = clusterTasks.reduce((s, t) => s + (t.codAmount || 0), 0);
              const clusterTotalBoxes = clusterTasks.reduce((s, t) => s + (t.packageCount || 1), 0);

              return (
                <View key={locName} style={styles.clusterRow}>
                  <Layers size={15} color="#0284c7" style={{ marginRight: 8 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.clusterTitle} numberOfLines={1}>
                      Cụm {clusterTasks.length} đơn cùng điểm: {clusterTasks[0].customerName} ({clusterTotalBoxes} kiện)
                    </Text>
                    <Text style={styles.clusterDesc} numberOfLines={1}>
                      {clusterTasks.map(t => `#${t.orderCode} (${t.codAmount > 0 ? (t.codAmount).toLocaleString('vi-VN') + 'đ' : '0đ COD'})`).join(' • ')}
                    </Text>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: clusterTotalCod > 0 ? '#b91c1c' : '#047857', marginTop: 2 }}>
                      {clusterTotalCod > 0 ? `Tổng thu hộ COD cả cụm: ${clusterTotalCod.toLocaleString('vi-VN')}đ` : 'Đã thanh toán Online (0đ COD)'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.clusterBtn}
                    onPress={() => {
                      if (onOpenPOD) onOpenPOD(clusterTasks[0]);
                      else onSelectTask(clusterTasks[0]);
                    }}
                    activeOpacity={0.85}
                  >
                    <CheckCheck size={13} color="#ffffff" style={{ marginRight: 4 }} />
                    <Text style={styles.clusterBtnText}>Bàn giao cả cụm</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}

        {/* ── 7. SLEEK STATUS FILTER TABS (UBER/GRAB SEGMENTED BAR) ── */}
        <View style={styles.statusTabsRow}>
          <TouchableOpacity
            style={[styles.statusTabItem, activeTab === 'ACTIVE' && styles.statusTabItemActiveEmerald]}
            onPress={() => setActiveTab('ACTIVE')}
            activeOpacity={0.85}
          >
            <Text style={[styles.statusTabTitle, activeTab === 'ACTIVE' && styles.statusTabTitleActiveEmerald]}>
              Đang giao
            </Text>
            <View style={[styles.statusBadge, activeTab === 'ACTIVE' ? styles.statusBadgeActiveEmerald : styles.statusBadgeMuted]}>
              <Text style={[styles.statusBadgeText, activeTab === 'ACTIVE' && styles.statusBadgeTextActiveEmerald]}>
                {inTransitTasks.length}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statusTabItem, activeTab === 'PENDING' && styles.statusTabItemActiveAmber]}
            onPress={() => setActiveTab('PENDING')}
            activeOpacity={0.85}
          >
            <Text style={[styles.statusTabTitle, activeTab === 'PENDING' && styles.statusTabTitleActiveAmber]}>
              Chờ nhận
            </Text>
            <View style={[styles.statusBadge, activeTab === 'PENDING' ? styles.statusBadgeActiveAmber : styles.statusBadgeMuted]}>
              <Text style={[styles.statusBadgeText, activeTab === 'PENDING' && styles.statusBadgeTextActiveAmber]}>
                {assignedTasks.length}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statusTabItem, activeTab === 'DONE' && styles.statusTabItemActiveBlue]}
            onPress={() => setActiveTab('DONE')}
            activeOpacity={0.85}
          >
            <Text style={[styles.statusTabTitle, activeTab === 'DONE' && styles.statusTabTitleActiveBlue]}>
              Đã giao
            </Text>
            <View style={[styles.statusBadge, activeTab === 'DONE' ? styles.statusBadgeActiveBlue : styles.statusBadgeMuted]}>
              <Text style={[styles.statusBadgeText, activeTab === 'DONE' && styles.statusBadgeTextActiveBlue]}>
                {deliveredTasks.length}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* TASK LIST */}
        <View style={styles.taskListContainer}>
          {waveMode === 'NEXT_WAVE' ? (
            nextWaveTasks.length === 0 ? (
              <View style={styles.emptyContainer}>
                <CheckCircle2 size={44} color={COLORS.textMuted} />
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
                  onOpenSms={() => handleSmsCustomer(task)}
                />
              ))
            )
          ) : currentTasks.length === 0 ? (
            <View style={styles.emptyContainer}>
              <CheckCircle2 size={44} color={COLORS.textMuted} />
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
                onOpenPOD={(t) => {
                  if (onOpenPOD) onOpenPOD(t);
                  else onSelectTask(t);
                }}
                onCallCustomer={() => handleCallCustomer(task.customerPhone, task.customerName)}
                onOpenSms={() => handleSmsCustomer(task)}
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
                  {`Chào bạn, tài xế C.T Mart đang giao đơn hàng #${contactModal.orderCode || ''} tới ${contactModal.address || ''}. Dự kiến đến nơi sau ít phút. Vui lòng chuẩn bị nhận hàng nhé!`}
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
                      const clean = contactModal.phone.replace(/\D/g, '');
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
                      const msg = `Chào bạn, tài xế C.T Mart đang giao đơn hàng #${contactModal?.orderCode || ''} tới ${contactModal?.address || ''}. Dự kiến đến nơi sau ít phút. Vui lòng chuẩn bị nhận hàng nhé!`;
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
                      const msg = `Chào bạn, tài xế C.T Mart đang giao đơn hàng #${contactModal?.orderCode || ''} tới ${contactModal?.address || ''}. Dự kiến đến nơi sau ít phút. Vui lòng chuẩn bị nhận hàng nhé!`;
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
    borderRadius: 10,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#0284c7',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
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

  // ── 1. CORRIDOR BAR & MAP TOGGLE ──
  corridorBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  corridorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 6,
  },
  corridorText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0f172a',
    flex: 1,
  },
  corridorActions: {
    flexDirection: 'row',
    gap: 5,
  },
  corridorPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#bae6fd',
    paddingHorizontal: 7,
    paddingVertical: 3.5,
    borderRadius: 5,
  },
  corridorPillBtnActive: {
    backgroundColor: '#0284c7',
    borderColor: '#0284c7',
  },
  corridorPillText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#0284c7',
  },
  corridorPillTextActive: {
    color: '#ffffff',
  },
  mapExpandWrapper: {
    marginBottom: 8,
    borderRadius: 8,
    overflow: 'hidden',
  },

  // ── 2. MODERN SEGMENTED WAVE CONTROLLER ──
  waveSegmentBar: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    padding: 3,
    marginBottom: 8,
  },
  waveSegmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: 6,
  },
  waveSegmentBtnActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  waveSegmentBtnActivePurple: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  waveSegmentText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748b',
  },
  waveSegmentTextActive: {
    color: '#0f766e',
    fontWeight: '700',
  },
  waveSegmentTextActivePurple: {
    color: '#7c3aed',
    fontWeight: '700',
  },

  // ── 3. COMPACT LOADING / DEPARTURE ACTION BAR ──
  loadingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 8,
  },
  loadingBannerTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#065f46',
  },
  loadingBannerSub: {
    fontSize: 10.5,
    color: '#047857',
    marginTop: 1,
  },
  loadingBannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    borderRadius: 6,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  loadingBannerBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },

  // ── 4. NEXT WAVE BANNER ──
  nextWaveBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#faf5ff',
    borderWidth: 1,
    borderColor: '#e9d5ff',
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
  },
  nextWaveBannerTitle: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#6b21a8',
    flex: 1,
  },

  // ── 5. SAME-DESTINATION CLUSTER BANNER ──
  clusterBannerBox: {
    marginBottom: 8,
    gap: 6,
  },
  clusterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#bae6fd',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  clusterTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0369a1',
  },
  clusterDesc: {
    fontSize: 10.5,
    color: '#64748b',
    marginTop: 1,
  },
  clusterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0284c7',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 5,
    marginLeft: 6,
  },
  clusterBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },

  // ── 6. SLEEK STATUS FILTER TABS (UBER/GRAB SEGMENTED BAR) ──
  statusTabsRow: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 3,
    marginBottom: 10,
    gap: 4,
  },
  statusTabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: 6,
    gap: 5,
  },
  statusTabItemActiveEmerald: {
    backgroundColor: '#f0fdf4',
  },
  statusTabItemActiveAmber: {
    backgroundColor: '#fffbeb',
  },
  statusTabItemActiveBlue: {
    backgroundColor: '#f0f9ff',
  },
  statusTabTitle: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748b',
  },
  statusTabTitleActiveEmerald: {
    color: '#0f766e',
    fontWeight: '700',
  },
  statusTabTitleActiveAmber: {
    color: '#92400e',
    fontWeight: '700',
  },
  statusTabTitleActiveBlue: {
    color: '#0284c7',
    fontWeight: '700',
  },
  statusBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  statusBadgeActiveEmerald: {
    backgroundColor: '#dcfce7',
  },
  statusBadgeActiveAmber: {
    backgroundColor: '#fef3c7',
  },
  statusBadgeActiveBlue: {
    backgroundColor: '#e0f2fe',
  },
  statusBadgeMuted: {
    backgroundColor: '#f1f5f9',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
  },
  statusBadgeTextActiveEmerald: {
    color: '#166534',
  },
  statusBadgeTextActiveAmber: {
    color: '#92400e',
  },
  statusBadgeTextActiveBlue: {
    color: '#0369a1',
  },

  // ── 7. TASK LIST ──
  taskListContainer: {
    gap: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 10,
  },
  emptySub: {
    fontSize: 11.5,
    color: COLORS.textMuted,
    marginTop: 3,
    textAlign: 'center',
  },

  // ── 8. CUSTOMER CONTACT MODAL (CALL & SMS) ──
  contactModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  contactModalBox: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    width: '100%',
    maxWidth: 380,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  contactModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 8,
  },
  contactModalTitle: {
    fontSize: 14,
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
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    marginBottom: 10,
  },
  contactToastText: {
    fontSize: 11,
    color: '#166534',
    fontWeight: '600',
  },
  contactCustomerCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    marginBottom: 10,
  },
  contactCustName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  contactCustPhone: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f766e',
    marginTop: 3,
  },
  contactCustOrder: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  smsPreviewBox: {
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    padding: 10,
    marginBottom: 12,
  },
  smsPreviewLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#166534',
    marginBottom: 4,
  },
  smsPreviewContent: {
    fontSize: 11.5,
    color: '#1e293b',
    lineHeight: 16,
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
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingVertical: 10,
  },
  contactSecondaryBtnText: {
    fontSize: 12,
    fontWeight: '700',
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
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
});
