import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Platform,
  StatusBar,
  TouchableOpacity,
  Modal,
  Image,
  Alert,
  TextInput,
} from 'react-native';
import { useDriverTask } from '../context/DriverTaskContext';
import { COLORS } from '../theme/colors';
import {
  Coins,
  Receipt,
  CheckCircle2,
  Clock,
  Truck,
  Bike,
  PackageCheck,
  ShieldCheck,
  QrCode,
  Copy,
  Check,
  ChevronRight,
  ChevronLeft,
  Search,
  Calendar,
  Building2,
  Award,
  Filter,
  SlidersHorizontal,
  FileSpreadsheet,
  X,
} from 'lucide-react-native';
import { resolveProductUnit, calculatePackingBoxes } from '../utils/productUnitHelper';

export type DateFilterType = 'TODAY' | 'YESTERDAY' | 'WEEK' | 'MONTH' | 'ALL';

interface HistoricalDeliveryItem {
  id: string;
  orderCode: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  distanceKm: number;
  estimatedTimeMinutes: number;
  codAmount: number;
  isPaid: boolean;
  paymentMethodText: string;
  timeSlotText: string;
  status: 'DELIVERED';
  sequenceOrder: number;
  storageType: 'COLD' | 'FROZEN' | 'DRY';
  items: Array<{ sku: string; name: string; quantity: number; unit: string; storageType: 'COLD' | 'FROZEN' | 'DRY' }>;
  packageType: string;
  dateKey: string; // YYYY-MM-DD
  deliveredAtText: string;
}

export const EarningsScreen: React.FC = () => {
  const {
    driverProfile,
    deliveredTasks,
    currentTripNumber,
    totalCodCollectedCurrentTrip,
    totalCurrentTripWeightKg,
  } = useDriverTask();

  // ── States ──
  const [selectedDateFilter, setSelectedDateFilter] = useState<DateFilterType>('TODAY');
  const [activePaymentFilter, setActivePaymentFilter] = useState<'ALL' | 'COD' | 'PAID' | 'DISPOSAL'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(5);
  const [showQrModal, setShowQrModal] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);

  const formatPrice = (val: number) => (val || 0).toLocaleString('vi-VN') + 'đ';

  // ── Multi-date Realistic Historical Dataset for Driver ──
  const masterDataset: HistoricalDeliveryItem[] = useMemo(() => {
    const isTruck = driverProfile?.id === 'NV-TK01' || (driverProfile?.vehicleType || '').includes('Tải');

    // 1. Live delivered tasks from current runtime session (Date: 2026-09-12)
    const liveTasksMapped: HistoricalDeliveryItem[] = (deliveredTasks || []).map((t, idx) => ({
      id: t.id || `live-${idx}`,
      orderCode: t.orderCode,
      customerName: t.customerName,
      customerPhone: t.customerPhone,
      deliveryAddress: t.deliveryAddress,
      distanceKm: t.distanceKm || 4.5,
      estimatedTimeMinutes: t.estimatedTimeMinutes || 15,
      codAmount: t.codAmount || 0,
      isPaid: t.isPaid,
      paymentMethodText: t.paymentMethodText,
      timeSlotText: t.timeSlotText || `Chuyến #${currentTripNumber}`,
      status: 'DELIVERED',
      sequenceOrder: t.sequenceOrder || idx + 1,
      storageType: t.storageType || 'COLD',
      items: (t.items || []).map(it => ({
        sku: it.sku,
        name: it.name,
        quantity: it.quantity,
        unit: it.unit,
        storageType: it.storageType || 'COLD',
      })),
      packageType: t.packageType || 'Thùng bảo quản chuyên dụng',
      dateKey: '2026-09-12',
      deliveredAtText: t.deliveredAt || '11:45 Hôm nay (12/09/2026)',
    }));

    // 2. Comprehensive Historical Logs for Truck Driver (Đặng Hoàng Phúc) or Bike Driver
    const historicalLogs: HistoricalDeliveryItem[] = isTruck
      ? [
          // ── Hôm nay (12/09/2026) ──
          {
            id: 'tk-today-01',
            orderCode: 'OB-20260912-054',
            customerName: 'Khu Xử Lý Chất Thải Đa Phước',
            customerPhone: '1900 6868',
            deliveryAddress: 'Xã Đa Phước, Huyện Bình Chánh, TP.HCM',
            distanceKm: 18.5,
            estimatedTimeMinutes: 45,
            codAmount: 0,
            isPaid: true,
            paymentMethodText: 'Xuất Tiêu Hủy (COD 0đ)',
            timeSlotText: 'Chuyến #1',
            status: 'DELIVERED',
            sequenceOrder: 1,
            storageType: 'FROZEN',
            items: [
              { sku: 'LOT-DISP-01', name: 'Thịt bò Úc đông lạnh hết hạn', quantity: 18, unit: 'Thùng', storageType: 'FROZEN' },
              { sku: 'LOT-DISP-02', name: 'Thịt heo tươi cận date', quantity: 24, unit: 'Thùng', storageType: 'FROZEN' },
            ],
            packageType: '42 Thùng Tiêu Hủy (Niêm phong QC)',
            dateKey: '2026-09-12',
            deliveredAtText: '09:20 12/09/2026',
          },
          {
            id: 'tk-today-02',
            orderCode: 'OB-20260912-053',
            customerName: 'Kho Phân Phối Gò Vấp (WH-006)',
            customerPhone: '0908 112 233',
            deliveryAddress: '350 Quang Trung, Phường 10, Gò Vấp',
            distanceKm: 8.2,
            estimatedTimeMinutes: 20,
            codAmount: 0,
            isPaid: true,
            paymentMethodText: 'Chuyển Kho Nội Bộ',
            timeSlotText: 'Chuyến #2',
            status: 'DELIVERED',
            sequenceOrder: 2,
            storageType: 'COLD',
            items: [
              { sku: 'TRSF-MK-01', name: 'Sữa tươi thanh trùng Dalat Milk', quantity: 30, unit: 'Thùng', storageType: 'COLD' },
              { sku: 'TRSF-MK-02', name: 'Sữa chua men sống tự nhiên', quantity: 20, unit: 'Khay', storageType: 'COLD' },
            ],
            packageType: '50 Kiện Lạnh Trung Chuyển',
            dateKey: '2026-09-12',
            deliveredAtText: '11:15 12/09/2026',
          },
          // ── Hôm qua (11/09/2026) ──
          {
            id: 'tk-yest-01',
            orderCode: 'OB-20260911-042',
            customerName: 'Khu Xử Lý Chất Thải Đa Phước',
            customerPhone: '1900 6868',
            deliveryAddress: 'Xã Đa Phước, Bình Chánh, TP.HCM',
            distanceKm: 19.0,
            estimatedTimeMinutes: 48,
            codAmount: 0,
            isPaid: true,
            paymentMethodText: 'Xuất Tiêu Hủy (COD 0đ)',
            timeSlotText: 'Chuyến #1',
            status: 'DELIVERED',
            sequenceOrder: 1,
            storageType: 'FROZEN',
            items: [
              { sku: 'DISP-VEG-01', name: 'Rau củ organic hư hỏng', quantity: 35, unit: 'Sọt', storageType: 'COLD' },
            ],
            packageType: '35 Sọt Tiêu Hủy Nông Sản',
            dateKey: '2026-09-11',
            deliveredAtText: '08:50 11/09/2026',
          },
          {
            id: 'tk-yest-02',
            orderCode: 'OB-20260911-043',
            customerName: 'Đại lý Bán Sỉ Thực Phẩm An Phú',
            customerPhone: '0938 999 111',
            deliveryAddress: '15, Song Hành, An Phú, Quận 2',
            distanceKm: 14.5,
            estimatedTimeMinutes: 35,
            codAmount: 1850000,
            isPaid: false,
            paymentMethodText: 'Thu hộ tiền mặt (COD)',
            timeSlotText: 'Chuyến #2',
            status: 'DELIVERED',
            sequenceOrder: 2,
            storageType: 'COLD',
            items: [
              { sku: 'B2B-BEEF-01', name: 'Thịt bò tơ Củ Chi nguyên khối', quantity: 5, unit: 'Thùng', storageType: 'COLD' },
            ],
            packageType: '5 Thùng Giữ Nhiệt Lạnh Chuyên Dụng (120kg)',
            dateKey: '2026-09-11',
            deliveredAtText: '14:20 11/09/2026',
          },
          // ── Các ngày trước trong tuần (08 - 10/09/2026) ──
          {
            id: 'tk-past-01',
            orderCode: 'OB-20260910-038',
            customerName: 'Kho Trung Tâm Tân Bình (WH-003)',
            customerPhone: '0977 223 344',
            deliveryAddress: '45 Trường Chinh, Tân Bình',
            distanceKm: 6.8,
            estimatedTimeMinutes: 18,
            codAmount: 0,
            isPaid: true,
            paymentMethodText: 'Điều Chuyển Kho Sân Bay',
            timeSlotText: 'Chuyến #1',
            status: 'DELIVERED',
            sequenceOrder: 1,
            storageType: 'COLD',
            items: [
              { sku: 'TRSF-FRUIT-01', name: 'Cherry Mỹ nhập khẩu cao cấp', quantity: 40, unit: 'Hộp', storageType: 'COLD' },
            ],
            packageType: '40 Hộp Trái Cây Lạnh',
            dateKey: '2026-09-10',
            deliveredAtText: '09:10 10/09/2026',
          },
          {
            id: 'tk-past-02',
            orderCode: 'OB-20260909-031',
            customerName: 'Khu Xử Lý Chất Thải Đa Phước',
            customerPhone: '1900 6868',
            deliveryAddress: 'Xã Đa Phước, Bình Chánh, TP.HCM',
            distanceKm: 18.2,
            estimatedTimeMinutes: 44,
            codAmount: 0,
            isPaid: true,
            paymentMethodText: 'Xuất Tiêu Hủy (COD 0đ)',
            timeSlotText: 'Chuyến #1',
            status: 'DELIVERED',
            sequenceOrder: 1,
            storageType: 'FROZEN',
            items: [
              { sku: 'DISP-MEAT-08', name: 'Gà tươi thả vườn quá hạn bảo quản', quantity: 22, unit: 'Thùng', storageType: 'FROZEN' },
            ],
            packageType: '22 Thùng Tiêu Hủy',
            dateKey: '2026-09-09',
            deliveredAtText: '08:40 09/09/2026',
          },
        ]
      : [
          // ── Xe máy: Hôm nay (12/09/2026) ──
          {
            id: 'mb-today-01',
            orderCode: 'ECOMM-20260912-101',
            customerName: 'Nguyễn Thị Bích Thủy',
            customerPhone: '0903 456 789',
            deliveryAddress: '45, Nguyễn Oanh, Phường 10, Gò Vấp',
            distanceKm: 2.1,
            estimatedTimeMinutes: 10,
            codAmount: 385000,
            isPaid: false,
            paymentMethodText: 'Thu hộ tiền mặt (COD)',
            timeSlotText: 'Chuyến #1',
            status: 'DELIVERED',
            sequenceOrder: 1,
            storageType: 'COLD',
            items: [
              { sku: 'PRD-SALMON', name: 'Cá hồi Na Uy phi lê tươi', quantity: 2, unit: 'Khay', storageType: 'COLD' },
              { sku: 'PRD-SALAD', name: 'Rau xà lách Romaine thủy canh', quantity: 1, unit: 'Gói', storageType: 'COLD' },
            ],
            packageType: '1 Thùng xốp bảo quản lạnh 0-4°C',
            dateKey: '2026-09-12',
            deliveredAtText: '09:15 12/09/2026',
          },
          {
            id: 'mb-today-02',
            orderCode: 'ECOMM-20260912-102',
            customerName: 'Trần Văn Hoàng',
            customerPhone: '0912 888 999',
            deliveryAddress: '182, Lê Đức Thọ, Phường 15, Gò Vấp',
            distanceKm: 3.4,
            estimatedTimeMinutes: 15,
            codAmount: 0,
            isPaid: true,
            paymentMethodText: 'Đã thanh toán MoMo',
            timeSlotText: 'Chuyến #1',
            status: 'DELIVERED',
            sequenceOrder: 2,
            storageType: 'COLD',
            items: [
              { sku: 'PRD-PORK', name: 'Thịt ba rọi heo thảo mộc', quantity: 3, unit: 'Khay', storageType: 'COLD' },
            ],
            packageType: '1 Thùng giữ nhiệt + Gel đá',
            dateKey: '2026-09-12',
            deliveredAtText: '09:45 12/09/2026',
          },
          {
            id: 'mb-today-03',
            orderCode: 'ECOMM-20260912-103',
            customerName: 'Lê Hoàng Hải',
            customerPhone: '0988 776 655',
            deliveryAddress: '29, Phạm Văn Chiêu, Phường 14, Gò Vấp',
            distanceKm: 2.8,
            estimatedTimeMinutes: 12,
            codAmount: 540000,
            isPaid: false,
            paymentMethodText: 'Thu hộ tiền mặt (COD)',
            timeSlotText: 'Chuyến #2',
            status: 'DELIVERED',
            sequenceOrder: 3,
            storageType: 'COLD',
            items: [
              { sku: 'PRD-BEEF', name: 'Thăn bò Úc nướng sốt tiêu', quantity: 2, unit: 'Khay', storageType: 'COLD' },
              { sku: 'PRD-MILK', name: 'Sữa tươi tiệt trùng nguyên chất', quantity: 2, unit: 'Lốc', storageType: 'COLD' },
            ],
            packageType: '2 Túi giữ nhiệt lạnh',
            dateKey: '2026-09-12',
            deliveredAtText: '11:30 12/09/2026',
          },
          // ── Hôm qua (11/09/2026) ──
          {
            id: 'mb-yest-01',
            orderCode: 'ECOMM-20260911-088',
            customerName: 'Phạm Hồng Nhung',
            customerPhone: '0909 111 222',
            deliveryAddress: '68, Thống Nhất, Phường 11, Gò Vấp',
            distanceKm: 3.1,
            estimatedTimeMinutes: 14,
            codAmount: 420000,
            isPaid: false,
            paymentMethodText: 'Thu hộ tiền mặt (COD)',
            timeSlotText: 'Chuyến #1',
            status: 'DELIVERED',
            sequenceOrder: 1,
            storageType: 'COLD',
            items: [
              { sku: 'PRD-FRUIT', name: 'Nho xanh Autumn Crisp Mỹ', quantity: 2, unit: 'Hộp', storageType: 'COLD' },
            ],
            packageType: '1 Hộp bảo quản mát',
            dateKey: '2026-09-11',
            deliveredAtText: '10:05 11/09/2026',
          },
          {
            id: 'mb-yest-02',
            orderCode: 'ECOMM-20260911-090',
            customerName: 'Hoàng Minh Quân',
            customerPhone: '0918 333 444',
            deliveryAddress: '120, Phan Văn Trị, Phường 5, Gò Vấp',
            distanceKm: 4.2,
            estimatedTimeMinutes: 16,
            codAmount: 0,
            isPaid: true,
            paymentMethodText: 'Đã thanh toán ZaloPay',
            timeSlotText: 'Chuyến #2',
            status: 'DELIVERED',
            sequenceOrder: 2,
            storageType: 'COLD',
            items: [
              { sku: 'PRD-YOGURT', name: 'Sữa chua uống Probi Men sống', quantity: 4, unit: 'Lốc', storageType: 'COLD' },
            ],
            packageType: '1 Thùng giữ lạnh 2h',
            dateKey: '2026-09-11',
            deliveredAtText: '14:40 11/09/2026',
          },
          // ── Các ngày trước trong tuần (08 - 10/09/2026) ──
          {
            id: 'mb-past-01',
            orderCode: 'ECOMM-20260910-072',
            customerName: 'Vũ Thị Thanh',
            customerPhone: '0933 667 889',
            deliveryAddress: '15, Dương Quảng Hàm, Gò Vấp',
            distanceKm: 2.5,
            estimatedTimeMinutes: 11,
            codAmount: 310000,
            isPaid: false,
            paymentMethodText: 'Thu hộ tiền mặt (COD)',
            timeSlotText: 'Chuyến #1',
            status: 'DELIVERED',
            sequenceOrder: 1,
            storageType: 'COLD',
            items: [
              { sku: 'PRD-VEG', name: 'Cà chua bi & Dưa leo baby', quantity: 3, unit: 'Hộp', storageType: 'COLD' },
            ],
            packageType: '1 Túi cách nhiệt C.T Mart',
            dateKey: '2026-09-10',
            deliveredAtText: '09:30 10/09/2026',
          },
        ];

    // Combine live and historical deduplicated by orderCode
    const combined = [...liveTasksMapped];
    const seenCodes = new Set(liveTasksMapped.map(x => x.orderCode));

    historicalLogs.forEach(h => {
      if (!seenCodes.has(h.orderCode)) {
        combined.push(h);
        seenCodes.add(h.orderCode);
      }
    });

    return combined;
  }, [deliveredTasks, driverProfile, currentTripNumber]);

  // ── 3. Date Filtering Engine ──
  const dateFilteredList = useMemo(() => {
    const todayStr = '2026-09-12';
    const yesterdayStr = '2026-09-11';

    return masterDataset.filter(item => {
      if (selectedDateFilter === 'TODAY') return item.dateKey === todayStr;
      if (selectedDateFilter === 'YESTERDAY') return item.dateKey === yesterdayStr;
      if (selectedDateFilter === 'WEEK') {
        // Between 2026-09-06 and 2026-09-12
        return item.dateKey >= '2026-09-06' && item.dateKey <= '2026-09-12';
      }
      if (selectedDateFilter === 'MONTH') {
        // Month 09/2026
        return item.dateKey.startsWith('2026-09');
      }
      return true; // ALL
    });
  }, [masterDataset, selectedDateFilter]);

  // ── 4. Metric Calculations for Selected Date Range ──
  const totalCodCollectedRange = dateFilteredList.reduce((acc, t) => acc + (t.codAmount || 0), 0);
  const totalOrdersCountRange = dateFilteredList.length;
  const totalItemsCountRange = dateFilteredList.reduce(
    (acc, t) => acc + (t.items || []).reduce((s, it) => s + (it.quantity || 1), 0),
    0
  );
  const totalBoxesCountRange = dateFilteredList.reduce((acc, t) => {
    const totalQty = (t.items || []).reduce((s, it) => s + (it.quantity || 1), 0);
    return acc + calculatePackingBoxes(totalQty);
  }, 0);
  const totalCodOrdersCount = dateFilteredList.filter(t => t.codAmount > 0).length;
  const totalOnlinePaidOrdersCount = dateFilteredList.filter(t => t.isPaid && t.codAmount === 0 && !t.orderCode.includes('OB')).length;
  const totalDisposalCount = dateFilteredList.filter(t => t.orderCode.includes('OB') || t.paymentMethodText.includes('Tiêu Hủy')).length;
  const totalKmRange = Number(
    dateFilteredList.reduce((acc, t) => acc + (t.distanceKm || 0), 0).toFixed(1)
  );

  // ── 5. Payment & Search Filtering ──
  const finalFilteredList = useMemo(() => {
    return dateFilteredList.filter(item => {
      // Payment type filter
      if (activePaymentFilter === 'COD' && item.codAmount <= 0) return false;
      if (activePaymentFilter === 'PAID' && (item.codAmount > 0 || item.orderCode.includes('OB'))) return false;
      if (activePaymentFilter === 'DISPOSAL' && !item.orderCode.includes('OB') && !item.paymentMethodText.includes('Tiêu Hủy')) return false;

      // Search Query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const code = item.orderCode.toLowerCase();
        const name = item.customerName.toLowerCase();
        const addr = item.deliveryAddress.toLowerCase();
        return code.includes(q) || name.includes(q) || addr.includes(q);
      }

      return true;
    });
  }, [dateFilteredList, activePaymentFilter, searchQuery]);

  // ── 6. Pagination Calculations ──
  const totalPages = Math.max(1, Math.ceil(finalFilteredList.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedList = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * pageSize;
    return finalFilteredList.slice(startIndex, startIndex + pageSize);
  }, [finalFilteredList, safeCurrentPage, pageSize]);

  // Handlers for Pagination
  const handleNextPage = () => {
    if (safeCurrentPage < totalPages) setCurrentPage(safeCurrentPage + 1);
  };
  const handlePrevPage = () => {
    if (safeCurrentPage > 1) setCurrentPage(safeCurrentPage - 1);
  };
  const handleSelectDateFilter = (filter: DateFilterType) => {
    setSelectedDateFilter(filter);
    setCurrentPage(1);
  };

  const getDateFilterTitle = () => {
    if (selectedDateFilter === 'TODAY') return 'Hôm nay (12/09/2026)';
    if (selectedDateFilter === 'YESTERDAY') return 'Hôm qua (11/09/2026)';
    if (selectedDateFilter === 'WEEK') return '7 ngày qua (06/09 - 12/09/2026)';
    if (selectedDateFilter === 'MONTH') return 'Tháng này (Tháng 09/2026)';
    return 'Toàn bộ thời gian';
  };

  const codTransferInfo = `NOP COD ${driverProfile?.id || 'TX01'} ${selectedDateFilter}`;
  const vietQrUrl = `https://img.vietqr.io/image/MB-0901234567-compact2.png?amount=${totalCodCollectedRange}&addInfo=${encodeURIComponent(codTransferInfo)}&accountName=KHO%20TRUNG%20TAM%20SFWMS`;

  return (
    <SafeAreaView style={styles.safeContainer}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Báo Cáo Ca Chạy & Đối Soát COD</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* ── DRIVER PROFILE CARD ── */}
        <View style={styles.driverProfileCard}>
          <View style={styles.driverAvatarPill}>
            <Text style={styles.driverAvatarText}>
              {(driverProfile?.name || 'TX').slice(0, 2).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={styles.driverNameText}>{driverProfile?.name || 'Tài xế nội bộ'}</Text>
              <View style={styles.internalTag}>
                <Text style={styles.internalTagText}>ĐỘI XE NỘI BỘ</Text>
              </View>
            </View>
            <Text style={styles.driverSubText}>
              Mã NV: <Text style={{ fontWeight: '800', color: '#0f172a' }}>{driverProfile?.id}</Text> • Biển số:{' '}
              <Text style={{ fontWeight: '800', color: '#0284c7' }}>{driverProfile?.licensePlate}</Text>
            </Text>
            <Text style={styles.driverWarehouseText}>
              {driverProfile?.warehouseName || 'Kho Gò Vấp (WH-006)'}
            </Text>
          </View>
        </View>

        {/* ── DATE RANGE PICKER FILTER BAR (BỘ LỌC THEO NGÀY) ── */}
        <View style={styles.dateSelectorContainer}>
          <View style={styles.dateSelectorHeader}>
            <Calendar size={15} color="#059669" />
            <Text style={styles.dateSelectorTitle}>CHỌN KỲ BÁO CÁO & ĐỐI SOÁT:</Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.datePillsScroll}>
            <TouchableOpacity
              style={[styles.datePillBtn, selectedDateFilter === 'TODAY' && styles.datePillBtnActive]}
              onPress={() => handleSelectDateFilter('TODAY')}
              activeOpacity={0.8}
            >
              <Text style={[styles.datePillText, selectedDateFilter === 'TODAY' && styles.datePillTextActive]}>
                Hôm nay (12/09)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.datePillBtn, selectedDateFilter === 'YESTERDAY' && styles.datePillBtnActive]}
              onPress={() => handleSelectDateFilter('YESTERDAY')}
              activeOpacity={0.8}
            >
              <Text style={[styles.datePillText, selectedDateFilter === 'YESTERDAY' && styles.datePillTextActive]}>
                Hôm qua (11/09)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.datePillBtn, selectedDateFilter === 'WEEK' && styles.datePillBtnActive]}
              onPress={() => handleSelectDateFilter('WEEK')}
              activeOpacity={0.8}
            >
              <Text style={[styles.datePillText, selectedDateFilter === 'WEEK' && styles.datePillTextActive]}>
                7 ngày qua
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.datePillBtn, selectedDateFilter === 'MONTH' && styles.datePillBtnActive]}
              onPress={() => handleSelectDateFilter('MONTH')}
              activeOpacity={0.8}
            >
              <Text style={[styles.datePillText, selectedDateFilter === 'MONTH' && styles.datePillTextActive]}>
                Tháng 09/2026
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.datePillBtn, selectedDateFilter === 'ALL' && styles.datePillBtnActive]}
              onPress={() => handleSelectDateFilter('ALL')}
              activeOpacity={0.8}
            >
              <Text style={[styles.datePillText, selectedDateFilter === 'ALL' && styles.datePillTextActive]}>
                Tất cả
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* ── CASH & COD RECONCILIATION CARD ── */}
        <View style={styles.codMainCard}>
          <View style={styles.codCardHeader}>
            <View style={styles.codIconBox}>
              <Coins size={20} color="#fbbf24" />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.codCardSub}>ĐỐI SOÁT TIỀN MẶT COD ({getDateFilterTitle().toUpperCase()})</Text>
              <Text style={styles.codCardMainVal}>{formatPrice(totalCodCollectedRange)}</Text>
            </View>
            <View style={styles.statusBadge}>
              <Text style={styles.statusBadgeText}>
                {totalCodCollectedRange > 0 ? 'CẦN BÀN GIAO' : 'ĐÃ ĐỐI SOÁT'}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Breakdown Rows */}
          <View style={styles.codBreakdownGrid}>
            <View style={styles.breakdownItem}>
              <Text style={styles.breakdownLabel}>Tiền mặt thu tại nhà ({totalCodOrdersCount} đơn)</Text>
              <Text style={styles.breakdownValGreen}>{formatPrice(totalCodCollectedRange)}</Text>
            </View>
            <View style={styles.breakdownItem}>
              <Text style={styles.breakdownLabel}>Online / Trả trước ({totalOnlinePaidOrdersCount} đơn)</Text>
              <Text style={styles.breakdownValBlue}>0đ (Về quỹ)</Text>
            </View>
          </View>

          {/* Quick VietQR COD Settlement CTA */}
          {totalCodCollectedRange > 0 && (
            <TouchableOpacity
              style={styles.settleBtn}
              onPress={() => setShowQrModal(true)}
              activeOpacity={0.85}
            >
              <QrCode size={16} color="#ffffff" style={{ marginRight: 6 }} />
              <Text style={styles.settleBtnText}>
                QUÉT VIETQR NỘP QUỸ THỦ KHO ({formatPrice(totalCodCollectedRange)})
              </Text>
            </TouchableOpacity>
          )}

          <Text style={styles.codNoteText}>
            ℹ️ Tiền mặt COD được tài xế nộp lại cho Thủ quỹ kho hoặc chuyển khoản VietQR khi kết thúc ca làm việc.
          </Text>
        </View>

        {/* ── OPERATIONAL KPIS GRID ── */}
        <Text style={styles.sectionHeaderTitle}>CHỈ SỐ VẬN HÀNH ({getDateFilterTitle().toUpperCase()})</Text>
        <View style={styles.kpiGrid}>
          {/* KPI 1: Đơn Hàng Hoàn Tất */}
          <View style={styles.kpiCard}>
            <View style={[styles.kpiIconBox, { backgroundColor: '#ecfdf5' }]}>
              <CheckCircle2 size={18} color="#059669" />
            </View>
            <Text style={styles.kpiVal}>{totalOrdersCountRange} Đơn</Text>
            <Text style={styles.kpiLabel}>Đơn hàng đã giao</Text>
          </View>

          {/* KPI 2: Thùng Hàng Đóng Gói */}
          <View style={styles.kpiCard}>
            <View style={[styles.kpiIconBox, { backgroundColor: '#eff6ff' }]}>
              <PackageCheck size={18} color="#0284c7" />
            </View>
            <Text style={styles.kpiVal}>{totalBoxesCountRange} Thùng</Text>
            <Text style={styles.kpiLabel}>{totalItemsCountRange} sản phẩm đóng gói</Text>
          </View>

          {/* KPI 3: Quãng Đường */}
          <View style={styles.kpiCard}>
            <View style={[styles.kpiIconBox, { backgroundColor: '#fef3c7' }]}>
              <Truck size={18} color="#d97706" />
            </View>
            <Text style={styles.kpiVal}>{totalKmRange} km</Text>
            <Text style={styles.kpiLabel}>Lộ trình di chuyển</Text>
          </View>

          {/* KPI 4: Chuẩn Nhiệt Độ Cold-Chain */}
          <View style={styles.kpiCard}>
            <View style={[styles.kpiIconBox, { backgroundColor: '#f0fdf4' }]}>
              <ShieldCheck size={18} color="#16a34a" />
            </View>
            <Text style={styles.kpiVal}>100%</Text>
            <Text style={styles.kpiLabel}>Chuẩn Cold-Chain</Text>
          </View>
        </View>

        {/* ── COMPANY ALLOWANCE & WORK SHIFT POLICY ── */}
        <View style={styles.allowanceCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <Award size={18} color="#059669" />
            <Text style={styles.allowanceTitle}>CHẾ ĐỘ ĐÃI NGỘ & PHỤ CẤP CA CÔNG TY</Text>
          </View>
          <View style={styles.allowanceRow}>
            <Text style={styles.allowanceLabel}>• Lương định ngạch tài xế:</Text>
            <Text style={styles.allowanceVal}>Hợp đồng nhân viên chính thức</Text>
          </View>
          <View style={styles.allowanceRow}>
            <Text style={styles.allowanceLabel}>• Phụ cấp hao mòn & xăng xe:</Text>
            <Text style={styles.allowanceVal}>Theo định mức GPS thực tế</Text>
          </View>
          <View style={styles.allowanceRow}>
            <Text style={styles.allowanceLabel}>• Phụ cấp bảo quản lạnh IoT:</Text>
            <Text style={[styles.allowanceVal, { color: '#059669', fontWeight: '800' }]}>Đạt KPI Hạng A (+100%)</Text>
          </View>
        </View>

        {/* ── DETAILED DELIVERY LOGS WITH SEARCH, FILTERS & PAGINATION ── */}
        <View style={styles.historySection}>
          <View style={styles.historyHeaderRow}>
            <Text style={styles.historySectionTitle}>
              NHẬT KÝ GIAO HÀNG ({finalFilteredList.length} ĐƠN)
            </Text>
            <Text style={styles.periodText}>{getDateFilterTitle()}</Text>
          </View>

          {/* Search Input Field */}
          <View style={styles.searchBar}>
            <Search size={16} color="#64748b" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm theo mã đơn #OB, tên khách, địa chỉ..."
              placeholderTextColor="#94a3b8"
              value={searchQuery}
              onChangeText={(text) => {
                setSearchQuery(text);
                setCurrentPage(1);
              }}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: 4 }}>
                <X size={13} color="#94a3b8" />
              </TouchableOpacity>
            )}
          </View>

          {/* Secondary Type Filter Pills */}
          <View style={styles.filterPillRow}>
            <TouchableOpacity
              style={[styles.filterPill, activePaymentFilter === 'ALL' && styles.filterPillActive]}
              onPress={() => {
                setActivePaymentFilter('ALL');
                setCurrentPage(1);
              }}
            >
              <Text style={[styles.filterPillText, activePaymentFilter === 'ALL' && styles.filterPillTextActive]}>
                Tất cả ({dateFilteredList.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterPill, activePaymentFilter === 'COD' && styles.filterPillActive]}
              onPress={() => {
                setActivePaymentFilter('COD');
                setCurrentPage(1);
              }}
            >
              <Text style={[styles.filterPillText, activePaymentFilter === 'COD' && styles.filterPillTextActive]}>
                Có COD ({totalCodOrdersCount})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterPill, activePaymentFilter === 'PAID' && styles.filterPillActive]}
              onPress={() => {
                setActivePaymentFilter('PAID');
                setCurrentPage(1);
              }}
            >
              <Text style={[styles.filterPillText, activePaymentFilter === 'PAID' && styles.filterPillTextActive]}>
                Online ({totalOnlinePaidOrdersCount})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterPill, activePaymentFilter === 'DISPOSAL' && styles.filterPillActive]}
              onPress={() => {
                setActivePaymentFilter('DISPOSAL');
                setCurrentPage(1);
              }}
            >
              <Text style={[styles.filterPillText, activePaymentFilter === 'DISPOSAL' && styles.filterPillTextActive]}>
                Tiêu hủy / Hub ({totalDisposalCount})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Delivery Log Items (Paginated) */}
          {paginatedList.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>Không có đơn hàng nào trong khoảng thời gian hoặc điều kiện lọc này.</Text>
            </View>
          ) : (
            paginatedList.map((item, idx) => {
              const totalItemsQty = (item.items || []).reduce((s, it) => s + (it.quantity || 1), 0);
              const itemBoxes = calculatePackingBoxes(totalItemsQty);

              return (
                <View key={item.id || idx} style={styles.logCard}>
                  {/* Card Top: Code & Time */}
                  <View style={styles.logCardTop}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.logOrderCode}>#{item.orderCode}</Text>
                      <View style={styles.tagPill}>
                        <Text style={styles.tagPillText}>{item.timeSlotText || `Chuyến #${idx + 1}`}</Text>
                      </View>
                    </View>
                    <Text style={styles.logTimeText}>{item.deliveredAtText}</Text>
                  </View>

                  {/* Customer & Address */}
                  <Text style={styles.logCustomerName}>{item.customerName}</Text>
                  <Text style={styles.logAddress} numberOfLines={2}>
                    {item.deliveryAddress}
                  </Text>

                  {/* Packages / Items Breakdown Box */}
                  <View style={styles.packageSummaryBox}>
                    <Text style={styles.packageSummaryText}>
                      Quy cách: <Text style={{ fontWeight: '800' }}>{itemBoxes} Thùng đóng gói</Text> ({totalItemsQty} món):{' '}
                      {(item.items || []).map(i => `${i.name} (x${i.quantity} ${resolveProductUnit(i.name, i.unit)})`).join(', ') || item.packageType}
                    </Text>
                  </View>

                  {/* Card Footer: COD vs Payment */}
                  <View style={styles.logCardFooter}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <CheckCircle2 size={13} color="#059669" />
                      <Text style={styles.podText}>Đã có ảnh xác nhận POD</Text>
                    </View>

                    <View style={styles.codTagWrap}>
                      {item.codAmount > 0 ? (
                        <Text style={styles.codTagValue}>Thu COD: {formatPrice(item.codAmount)}</Text>
                      ) : (
                        <Text style={styles.codTagZero}>
                          {item.orderCode.includes('OB') ? 'Tiêu hủy / Chuyển kho' : 'Đã thanh toán (0đ)'}
                        </Text>
                      )}
                    </View>
                  </View>
                </View>
              );
            })
          )}

          {/* ── PAGINATION CONTROLS BAR ── */}
          {finalFilteredList.length > pageSize && (
            <View style={styles.paginationContainer}>
              <View style={styles.paginationInfo}>
                <Text style={styles.paginationText}>
                  Hiển thị {(safeCurrentPage - 1) * pageSize + 1} -{' '}
                  {Math.min(safeCurrentPage * pageSize, finalFilteredList.length)} / {finalFilteredList.length} đơn
                </Text>
              </View>

              <View style={styles.paginationButtons}>
                {/* Prev Button */}
                <TouchableOpacity
                  style={[styles.pageNavBtn, safeCurrentPage === 1 && styles.pageNavBtnDisabled]}
                  onPress={handlePrevPage}
                  disabled={safeCurrentPage === 1}
                  activeOpacity={0.8}
                >
                  <ChevronLeft size={16} color={safeCurrentPage === 1 ? '#94a3b8' : '#0f172a'} />
                  <Text style={[styles.pageNavBtnText, safeCurrentPage === 1 && { color: '#94a3b8' }]}>
                    Trước
                  </Text>
                </TouchableOpacity>

                {/* Page Number Indicators */}
                <View style={styles.pagePillsWrap}>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                    <TouchableOpacity
                      key={pageNum}
                      style={[styles.pageNumBtn, safeCurrentPage === pageNum && styles.pageNumBtnActive]}
                      onPress={() => setCurrentPage(pageNum)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.pageNumText, safeCurrentPage === pageNum && styles.pageNumTextActive]}>
                        {pageNum}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Next Button */}
                <TouchableOpacity
                  style={[styles.pageNavBtn, safeCurrentPage === totalPages && styles.pageNavBtnDisabled]}
                  onPress={handleNextPage}
                  disabled={safeCurrentPage === totalPages}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.pageNavBtnText, safeCurrentPage === totalPages && { color: '#94a3b8' }]}>
                    Sau
                  </Text>
                  <ChevronRight size={16} color={safeCurrentPage === totalPages ? '#94a3b8' : '#0f172a'} />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* ── VIETQR MODAL FOR COD SETTLEMENT ── */}
      <Modal visible={showQrModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nộp Tiền Mặt COD Về Kho</Text>
              <TouchableOpacity onPress={() => setShowQrModal(false)} style={styles.closeBtn}>
                <X size={16} color="#64748b" />
              </TouchableOpacity>
            </View>

            <View style={styles.qrImageBox}>
              <Image source={{ uri: vietQrUrl }} style={styles.qrImage} resizeMode="contain" />
            </View>

            <View style={styles.qrDetailsBox}>
              <Text style={styles.qrAmountText}>{formatPrice(totalCodCollectedRange)}</Text>
              <Text style={styles.qrAccountName}>THỦ QUỸ KHO TRUNG TÂM SFWMS</Text>
              <Text style={styles.qrBankName}>Ngân hàng Quân Đội (MB Bank) - 0901234567</Text>
              <Text style={styles.qrContentNote}>Nội dung: {codTransferInfo}</Text>
            </View>

            <TouchableOpacity
              style={styles.copyBtn}
              onPress={() => {
                setIsCopied(true);
                setTimeout(() => setIsCopied(false), 2500);
                Alert.alert('Đã sao chép', `Nội dung chuyển khoản: ${codTransferInfo}`);
              }}
            >
              {isCopied ? <Check size={16} color="#059669" /> : <Copy size={16} color="#0284c7" />}
              <Text style={styles.copyBtnText}>
                {isCopied ? 'ĐÃ SAO CHÉP NỘI DUNG' : 'SAO CHÉP NỘI DUNG CHUYỂN KHOẢN'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.doneBtn}
              onPress={() => {
                setShowQrModal(false);
                Alert.alert('Thành công', 'Biên nhận nộp COD đã được ghi nhận vào hệ thống kho!');
              }}
            >
              <Text style={styles.doneBtnText}>TÔI ĐÃ NỘP TIỀN XONG</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    height: 52,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#f8fafc',
    letterSpacing: 0.5,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  driverProfileCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  driverAvatarPill: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverAvatarText: {
    color: '#38bdf8',
    fontWeight: '900',
    fontSize: 16,
  },
  driverNameText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0f172a',
  },
  internalTag: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  internalTagText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#059669',
    letterSpacing: 0.5,
  },
  driverSubText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  driverWarehouseText: {
    fontSize: 11,
    color: '#475569',
    marginTop: 2,
    fontWeight: '600',
  },
  dateSelectorContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  dateSelectorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  dateSelectorTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: 0.5,
  },
  datePillsScroll: {
    flexDirection: 'row',
    gap: 8,
  },
  datePillBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  datePillBtnActive: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  datePillText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#475569',
  },
  datePillTextActive: {
    color: '#ffffff',
  },
  codMainCard: {
    backgroundColor: '#0f172a',
    borderRadius: 20,
    padding: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#1e293b',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  codCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  codIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  codCardSub: {
    color: 'rgba(255, 255, 255, 0.65)',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  codCardMainVal: {
    color: '#fbbf24',
    fontSize: 30,
    fontWeight: '900',
    marginTop: 2,
  },
  statusBadge: {
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.3)',
  },
  statusBadgeText: {
    color: '#fbbf24',
    fontSize: 9.5,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  divider: {
    height: 1,
    backgroundColor: '#1e293b',
    marginVertical: 14,
  },
  codBreakdownGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  breakdownItem: {
    flex: 1,
  },
  breakdownLabel: {
    color: '#94a3b8',
    fontSize: 10.5,
    fontWeight: '600',
    marginBottom: 3,
  },
  breakdownValGreen: {
    color: '#4ade80',
    fontSize: 14,
    fontWeight: '900',
  },
  breakdownValBlue: {
    color: '#38bdf8',
    fontSize: 14,
    fontWeight: '900',
  },
  settleBtn: {
    backgroundColor: '#059669',
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    marginBottom: 8,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  settleBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  codNoteText: {
    color: '#64748b',
    fontSize: 10,
    lineHeight: 14,
  },
  sectionHeaderTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#475569',
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 18,
  },
  kpiCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  kpiIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  kpiVal: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
  },
  kpiLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
    marginTop: 2,
  },
  allowanceCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  allowanceTitle: {
    fontSize: 11.5,
    fontWeight: '900',
    color: '#0f172a',
    marginLeft: 6,
    letterSpacing: 0.5,
  },
  allowanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  allowanceLabel: {
    fontSize: 11.5,
    color: '#64748b',
    fontWeight: '600',
  },
  allowanceVal: {
    fontSize: 11.5,
    color: '#0f172a',
    fontWeight: '700',
  },
  historySection: {
    marginBottom: 20,
  },
  historyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  historySectionTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#475569',
    letterSpacing: 0.5,
  },
  periodText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 12,
    height: 42,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 12.5,
    color: '#0f172a',
    fontWeight: '600',
  },
  filterPillRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  filterPill: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  filterPillActive: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  filterPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  filterPillTextActive: {
    color: '#ffffff',
  },
  logCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  logCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  logOrderCode: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0f172a',
  },
  tagPill: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagPillText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#475569',
  },
  logTimeText: {
    fontSize: 10.5,
    color: '#64748b',
    fontWeight: '600',
  },
  logCustomerName: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 2,
  },
  logAddress: {
    fontSize: 11,
    color: '#64748b',
    lineHeight: 15,
    marginBottom: 6,
  },
  packageSummaryBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 8,
  },
  packageSummaryText: {
    fontSize: 10.5,
    color: '#475569',
    lineHeight: 15,
  },
  logCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  podText: {
    fontSize: 10.5,
    color: '#059669',
    fontWeight: '700',
  },
  codTagWrap: {},
  codTagValue: {
    fontSize: 12.5,
    fontWeight: '900',
    color: '#dc2626',
  },
  codTagZero: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  emptyText: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600',
    textAlign: 'center',
  },
  paginationContainer: {
    marginTop: 12,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    gap: 10,
  },
  paginationInfo: {},
  paginationText: {
    fontSize: 11.5,
    color: '#64748b',
    fontWeight: '700',
  },
  paginationButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pageNavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  pageNavBtnDisabled: {
    opacity: 0.5,
    backgroundColor: '#f8fafc',
  },
  pageNavBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0f172a',
  },
  pagePillsWrap: {
    flexDirection: 'row',
    gap: 6,
  },
  pageNumBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageNumBtnActive: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  pageNumText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#475569',
  },
  pageNumTextActive: {
    color: '#ffffff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0f172a',
  },
  closeBtn: {
    padding: 4,
  },
  closeBtnText: {
    fontSize: 16,
    color: '#94a3b8',
    fontWeight: '900',
  },
  qrImageBox: {
    width: 200,
    height: 200,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  qrImage: {
    width: 190,
    height: 190,
  },
  qrDetailsBox: {
    alignItems: 'center',
    marginBottom: 14,
  },
  qrAmountText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#059669',
  },
  qrAccountName: {
    fontSize: 12,
    fontWeight: '900',
    color: '#0f172a',
    marginTop: 4,
  },
  qrBankName: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  qrContentNote: {
    fontSize: 11,
    color: '#0284c7',
    fontWeight: '700',
    marginTop: 4,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#f1f5f9',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    width: '100%',
    marginBottom: 10,
  },
  copyBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0284c7',
  },
  doneBtn: {
    backgroundColor: '#059669',
    paddingVertical: 12,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
  },
  doneBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
  },
});
