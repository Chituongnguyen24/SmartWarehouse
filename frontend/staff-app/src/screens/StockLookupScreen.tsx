import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Modal,
  Alert,
  RefreshControl,
  Switch,
} from 'react-native';
import {
  Search,
  Boxes,
  MapPin,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Snowflake,
  ShieldAlert,
  ClipboardList,
  Edit3,
  X,
  Check,
  RotateCcw,
  Sparkles,
  Calendar,
  Layers,
  Thermometer,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  User,
  FileCheck2,
  Flame,
  CheckCheck,
  Archive,
  Eye,
  EyeOff,
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { lookupStockApi, adjustStockAuditApi } from '../services/api';
import { StockInfo } from '../types';
import { COLORS } from '../theme/colors';

export interface FlatLotItem {
  id?: string;
  lotCode: string;
  sku: string;
  productName: string;
  unit: string;
  shelfLocation: string;
  zone: string;
  category: string;
  systemQuantity: number;
  expiryDate: string;
  daysRemaining: number;
  riskScore: number;
  riskLevel: 'SAFE' | 'WARNING' | 'DANGER';
  riskReason: string;
  riskRecommendation: string;
  lastAuditedAt?: string;
  lastAuditedBy?: string;
  lastAuditActualQty?: number;
  lastAuditDiff?: number;
  lastAuditReason?: string;
}

export interface AuditRecord {
  lotId: string;
  lotCode: string;
  auditedAt: string;
  auditorName: string;
  systemQty: number;
  actualQty: number;
  diff: number;
  reason: string;
  note?: string;
}

const ITEMS_PER_PAGE = 15;

/**
 * 🤖 Thuật toán Đánh giá Nguy cơ Thực phẩm (Đồng bộ chuẩn 100% với Web Dashboard)
 */
function evaluateAIRisk(lot: any, productName: string, sku: string, daysLeft: number, zone: string) {
  const name = (productName || '').toLowerCase();
  const code = (sku || lot.lotCode || '').toUpperCase();

  let catKey = 'DRY';
  let catLabel = 'Hàng khô';
  let catIcon = '🌾';
  let decayRate = 1.0;

  if (/cá|tôm|mực|hải sản|cua|ghẹ|sò|ốc/.test(name) || /SEAFOOD|FISH|SHRIMP|SQUID/.test(code)) {
    catKey = 'SEAFOOD'; catLabel = 'Hải sản'; catIcon = '🐟'; decayRate = 2.8;
  } else if (/thịt|bò|heo|gà|vịt|trứng/.test(name) || /BEEF|PORK|CHICKEN|MEAT|DUCK|EGG/.test(code)) {
    catKey = 'MEAT'; catLabel = 'Thịt & Trứng'; catIcon = '🥩'; decayRate = 2.2;
  } else if (/sữa|phô mai|yaourt|yogurt|kem|bơ/.test(name) || /MILK|DAIRY|CHEESE|YOGURT/.test(code)) {
    catKey = 'DAIRY'; catLabel = 'Sữa & Dairy'; catIcon = '🥛'; decayRate = 1.6;
  } else if (/rau|cải|súp lơ|dưa|cà|đậu|hành|ngò|cần/.test(name) || /VEG|BROCCOLI|TOMATO|LETTUCE|SPINACH/.test(code)) {
    catKey = 'VEGETABLE'; catLabel = 'Rau củ quả'; catIcon = '🥬'; decayRate = 2.0;
  } else if (/táo|cam|xoài|dứa|ổi|chuối|trái cây/.test(name) || /FRUIT|APPLE|MANGO|ORANGE/.test(code)) {
    catKey = 'FRUIT'; catLabel = 'Trái cây'; catIcon = '🍎'; decayRate = 1.7;
  }

  const dangerDays = catKey === 'SEAFOOD' ? 3 : catKey === 'MEAT' ? 3 : catKey === 'DAIRY' ? 5 : catKey === 'VEGETABLE' ? 4 : catKey === 'FRUIT' ? 5 : 7;
  const warningDays = catKey === 'SEAFOOD' ? 7 : catKey === 'MEAT' ? 7 : catKey === 'DAIRY' ? 14 : catKey === 'VEGETABLE' ? 10 : catKey === 'FRUIT' ? 10 : 30;

  if (daysLeft <= 0) {
    return {
      level: 'DANGER' as const,
      reason: `⚠️ ${catIcon} Đã hết hạn sử dụng`,
      recommendation: 'Cần kiểm kê đối soát và lập biên bản xuất hủy ngay',
    };
  }

  if (daysLeft <= dangerDays) {
    return {
      level: 'DANGER' as const,
      reason: `🔴 ${catIcon} Còn ${daysLeft} ngày — Ngưỡng nguy cơ cao của ${catLabel}`,
      recommendation: 'Cần ưu tiên kiểm kê gấp & xuất kho ngay lập tức',
    };
  }

  if (daysLeft <= warningDays) {
    return {
      level: 'WARNING' as const,
      reason: `🟡 ${catIcon} Còn ${daysLeft} ngày — Cận hạn sử dụng (${catLabel})`,
      recommendation: 'Lên kế hoạch xuất trước theo chuẩn FEFO',
    };
  }

  return {
    level: 'SAFE' as const,
    reason: `🟢 ${catIcon} Đạt chuẩn tươi sạch (Còn ${daysLeft} ngày)`,
    recommendation: 'Bảo quản đạt chuẩn nhiệt độ kho',
  };
}

export const StockLookupScreen: React.FC = () => {
  const { user, activeWarehouse } = useAuth();
  const [activeTab, setActiveTab] = useState<'LOTS_AUDIT' | 'PRODUCTS'>('LOTS_AUDIT');
  
  // 4 Tabs rủi ro + Tab Đã kiểm kê + Tab Đã hết hàng
  const [selectedRiskFilter, setSelectedRiskFilter] = useState<'ALL' | 'SAFE' | 'WARNING' | 'DANGER' | 'AUDITED' | 'DEPLETED'>('ALL');
  const [hideZeroStock, setHideZeroStock] = useState<boolean>(true); // Mặc định tự động ẩn các lô đã hết (0 tồn kho)
  const [keyword, setKeyword] = useState('');
  const [stockList, setStockList] = useState<StockInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Pagination State (15 mục / trang)
  const [currentPage, setCurrentPage] = useState(1);

  // Map lưu trạng thái các lô đã kiểm kê trong phiên làm việc
  const [auditedLots, setAuditedLots] = useState<Record<string, AuditRecord>>({});

  // Modal Kiểm Kê State
  const [auditModalVisible, setAuditModalVisible] = useState(false);
  const [selectedLot, setSelectedLot] = useState<FlatLotItem | null>(null);
  const [actualQtyInput, setActualQtyInput] = useState('');
  const [auditReason, setAuditReason] = useState('Kiểm kê định kỳ hàng tháng');
  const [auditNote, setAuditNote] = useState('');
  const [submittingAudit, setSubmittingAudit] = useState(false);

  const loadData = async (term: string = '') => {
    setLoading(true);
    try {
      const data = await lookupStockApi(term, activeWarehouse);
      setStockList(data);
    } catch (e) {
      console.error('Error loading stock lookup:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
    loadData(keyword);
  }, [activeWarehouse]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData(keyword);
    setRefreshing(false);
  };

  // Làm phẳng danh sách các lô hàng kèm đánh giá AI Risk và trạng thái kiểm kê
  const allLots: FlatLotItem[] = useMemo(() => {
    const list: FlatLotItem[] = [];
    stockList.forEach(stock => {
      (stock.lots || []).forEach((lot: any) => {
        const riskEval = evaluateAIRisk(lot, stock.productName, stock.sku, lot.daysRemaining, stock.zone);

        list.push({
          id: lot.id,
          lotCode: lot.lotCode,
          sku: stock.sku,
          productName: stock.productName,
          unit: stock.unit,
          shelfLocation: stock.shelfLocation,
          zone: stock.zone,
          category: stock.category || 'Thực phẩm',
          systemQuantity: lot.quantity,
          expiryDate: lot.expiryDate,
          daysRemaining: lot.daysRemaining,
          riskScore: 0,
          riskLevel: riskEval.level,
          riskReason: riskEval.reason,
          riskRecommendation: riskEval.recommendation,
          lastAuditedAt: lot.lastAuditedAt,
          lastAuditedBy: lot.lastAuditedBy,
          lastAuditActualQty: lot.lastAuditActualQty,
          lastAuditDiff: lot.lastAuditDiff,
          lastAuditReason: lot.lastAuditReason,
        });
      });
    });
    return list;
  }, [stockList]);

  // Thống kê số lượng theo từng phân loại (phân tách lô còn tồn kho và lô đã hết hàng)
  const riskStats = useMemo(() => {
    const total = allLots.length;
    const activeLots = allLots.filter(l => l.systemQuantity > 0);
    const depletedCount = allLots.filter(l => l.systemQuantity === 0).length;
    const safeCount = activeLots.filter(l => l.riskLevel === 'SAFE').length;
    const warningCount = activeLots.filter(l => l.riskLevel === 'WARNING').length;
    const dangerCount = activeLots.filter(l => l.riskLevel === 'DANGER').length;
    const auditedCount = allLots.filter(l => !!l.lastAuditedAt || !!auditedLots[l.id || l.lotCode]).length;

    return { total, activeCount: activeLots.length, safeCount, warningCount, dangerCount, auditedCount, depletedCount };
  }, [allLots, auditedLots]);

  // Lọc theo Tab rủi ro + Ẩn/Hiện lô 0 tồn kho + Từ khóa tìm kiếm
  const filteredLots = useMemo(() => {
    return allLots.filter(item => {
      const isAudited = !!item.lastAuditedAt || !!auditedLots[item.id || item.lotCode];
      const isDepleted = item.systemQuantity === 0;

      // Nếu đang xem tab "Đã hết hàng"
      if (selectedRiskFilter === 'DEPLETED') {
        if (!isDepleted) return false;
      } else {
        // Nếu bật chế độ ẩn lô 0 tồn kho thì tự động loại bỏ lô đã hết hàng khỏi danh sách hoạt động
        if (hideZeroStock && isDepleted) {
          return false;
        }

        if (selectedRiskFilter === 'SAFE' && item.riskLevel !== 'SAFE') return false;
        if (selectedRiskFilter === 'WARNING' && item.riskLevel !== 'WARNING') return false;
        if (selectedRiskFilter === 'DANGER' && item.riskLevel !== 'DANGER') return false;
        if (selectedRiskFilter === 'AUDITED' && !isAudited) return false;
      }

      // Keyword Search Filter
      const matchKeyword = !keyword ||
        item.productName.toLowerCase().includes(keyword.toLowerCase()) ||
        item.lotCode.toLowerCase().includes(keyword.toLowerCase()) ||
        item.sku.toLowerCase().includes(keyword.toLowerCase()) ||
        item.shelfLocation.toLowerCase().includes(keyword.toLowerCase());

      return matchKeyword;
    });
  }, [allLots, selectedRiskFilter, hideZeroStock, keyword, auditedLots]);

  // Phân trang danh sách (15 items / trang)
  const totalPages = Math.max(1, Math.ceil(filteredLots.length / ITEMS_PER_PAGE));
  const paginatedLots = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredLots.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredLots, currentPage]);

  const openAuditModal = (lot: FlatLotItem) => {
    setSelectedLot(lot);
    const existingAudit = auditedLots[lot.id || lot.lotCode];
    const initialQty = existingAudit
      ? existingAudit.actualQty
      : lot.lastAuditActualQty !== undefined
      ? lot.lastAuditActualQty
      : lot.systemQuantity;

    setActualQtyInput(String(initialQty));
    setAuditReason(
      existingAudit
        ? existingAudit.reason
        : lot.lastAuditReason ||
          (lot.riskLevel === 'DANGER'
            ? 'Hàng quá hạn sử dụng cần hủy bỏ'
            : lot.riskLevel === 'WARNING'
            ? 'Hàng dập nát / Hư hỏng trong quá trình bảo quản'
            : 'Kiểm kê định kỳ hàng tháng')
    );
    setAuditNote(existingAudit?.note || '');
    setAuditModalVisible(true);
  };

  /**
   * ⚡ CẬP NHẬT KIỂM KÊ TỨC THÌ (Zero-Lag Optimistic UI)
   */
  const handleSaveAudit = async () => {
    if (!selectedLot) return;
    const actualQty = parseInt(actualQtyInput, 10);
    if (isNaN(actualQty) || actualQty < 0) {
      Alert.alert('Lỗi nhập liệu', 'Vui lòng nhập số lượng kiểm kê thực tế hợp lệ (≥ 0)');
      return;
    }

    setSubmittingAudit(true);
    const lotKey = selectedLot.id || selectedLot.lotCode;
    const staffName = user?.name || 'Nhân viên trực ca';
    const diff = actualQty - selectedLot.systemQuantity;
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')} - ${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;

    try {
      // 1. Gửi ngầm tới backend API
      adjustStockAuditApi(
        lotKey,
        actualQty,
        `${auditReason}${auditNote ? ` - ${auditNote}` : ''}`,
        staffName
      );

      // 2. Cập nhật tức thì vào bộ nhớ local (0ms lag, không reload trang, không xoay spinner)
      const newAuditRecord: AuditRecord = {
        lotId: lotKey,
        lotCode: selectedLot.lotCode,
        auditedAt: timeStr,
        auditorName: staffName,
        systemQty: selectedLot.systemQuantity,
        actualQty,
        diff,
        reason: auditReason,
        note: auditNote,
      };

      setAuditedLots(prev => ({
        ...prev,
        [lotKey]: newAuditRecord,
      }));

      if (actualQty <= 0) {
        // Xóa hoàn toàn lô hàng khỏi danh sách và giải phóng vị trí kệ kho
        setStockList(prev =>
          prev.map(stock => {
            const remainingLots = stock.lots?.filter((l: any) => l.id !== lotKey && l.lotCode !== lotKey) || [];
            const newTotal = remainingLots.reduce((sum: number, l: any) => sum + (l.quantity || 0), 0);
            return {
              ...stock,
              totalStock: newTotal,
              availableStock: Math.max(0, newTotal),
              lots: remainingLots,
            };
          })
        );
      } else {
        setStockList(prev =>
          prev.map(stock => ({
            ...stock,
            lots: stock.lots?.map((l: any) =>
              l.id === lotKey || l.lotCode === lotKey
                ? {
                    ...l,
                    quantity: actualQty,
                    lastAuditedAt: now.toISOString(),
                    lastAuditedBy: staffName,
                    lastAuditActualQty: actualQty,
                    lastAuditDiff: diff,
                    lastAuditReason: auditReason,
                  }
                : l
            ),
          }))
        );
      }

      const diffText =
        diff > 0
          ? `Thừa +${diff} ${selectedLot.unit}`
          : diff < 0
          ? `Thiếu ${diff} ${selectedLot.unit}`
          : 'Khớp 100%';

      if (actualQty <= 0) {
        Alert.alert(
          '✅ Đã Xóa Lô & Giải Phóng Kệ Kho!',
          `Lô ${selectedLot.lotCode} đã hết hàng (0 ${selectedLot.unit}) và được xóa khỏi danh sách.\n• Vị trí kệ ${selectedLot.shelfLocation} đã được làm trống để nhập hàng mới!\n• Người thực hiện: ${staffName}`
        );
      } else {
        Alert.alert(
          '✅ Đã Lưu Kết Quả Kiểm Kê!',
          `Phiếu kiểm kê lô ${selectedLot.lotCode} đã được ghi nhận:\n• Thực đếm: ${actualQty} ${selectedLot.unit}\n• Đối soát: ${diffText}\n• Người kiểm: ${staffName}`
        );
      }
      setAuditModalVisible(false);
    } catch (e) {
      Alert.alert('Lỗi', 'Không thể cập nhật kiểm kê.');
    } finally {
      setSubmittingAudit(false);
    }
  };

  const actualNum = parseInt(actualQtyInput || '0', 10);
  const diffCount = selectedLot ? actualNum - selectedLot.systemQuantity : 0;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#059669" />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Quản Lý Lô Hàng & Kiểm Kê</Text>
            <Text style={styles.subtitle}>
              Trạng thái chất lượng • Tự động ẩn lô 0 tồn • Kho: {activeWarehouse === 'WH-006' ? 'Gò Vấp (WH-006)' : 'Tân Bình (WH-005)'}
            </Text>
          </View>
        </View>

        {/* 6 Interactive Risk & Audit Filter Tabs */}
        <View style={styles.riskTabsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.riskTabsScroll}>
            {/* Tab 1: Tất cả còn hàng */}
            <TouchableOpacity
              style={[styles.riskTabBtn, styles.riskTabAll, selectedRiskFilter === 'ALL' && styles.riskTabAllActive]}
              onPress={() => { setSelectedRiskFilter('ALL'); setCurrentPage(1); }}
              activeOpacity={0.8}
            >
              <Text style={styles.riskTabIcon}>📦</Text>
              <Text style={[styles.riskTabLabel, selectedRiskFilter === 'ALL' && styles.riskTabLabelActive]}>
                Còn hàng ({riskStats.activeCount})
              </Text>
            </TouchableOpacity>

            {/* Tab 2: Bình thường */}
            <TouchableOpacity
              style={[styles.riskTabBtn, styles.riskTabSafe, selectedRiskFilter === 'SAFE' && styles.riskTabSafeActive]}
              onPress={() => { setSelectedRiskFilter('SAFE'); setCurrentPage(1); }}
              activeOpacity={0.8}
            >
              <View style={[styles.statusDot, { backgroundColor: '#16a34a' }]} />
              <Text style={[styles.riskTabLabel, { color: selectedRiskFilter === 'SAFE' ? '#166534' : '#15803d' }]}>
                Bình thường ({riskStats.safeCount})
              </Text>
            </TouchableOpacity>

            {/* Tab 3: Có nguy cơ */}
            <TouchableOpacity
              style={[styles.riskTabBtn, styles.riskTabWarning, selectedRiskFilter === 'WARNING' && styles.riskTabWarningActive]}
              onPress={() => { setSelectedRiskFilter('WARNING'); setCurrentPage(1); }}
              activeOpacity={0.8}
            >
              <View style={[styles.statusDot, { backgroundColor: '#eab308' }]} />
              <Text style={[styles.riskTabLabel, { color: selectedRiskFilter === 'WARNING' ? '#854d0e' : '#a16207' }]}>
                Có nguy cơ ({riskStats.warningCount})
              </Text>
            </TouchableOpacity>

            {/* Tab 4: Báo động đỏ */}
            <TouchableOpacity
              style={[styles.riskTabBtn, styles.riskTabDanger, selectedRiskFilter === 'DANGER' && styles.riskTabDangerActive]}
              onPress={() => { setSelectedRiskFilter('DANGER'); setCurrentPage(1); }}
              activeOpacity={0.8}
            >
              <View style={[styles.statusDot, { backgroundColor: '#dc2626' }]} />
              <Text style={[styles.riskTabLabel, { color: selectedRiskFilter === 'DANGER' ? '#ffffff' : '#991b1b' }]}>
                Báo động đỏ ({riskStats.dangerCount})
              </Text>
            </TouchableOpacity>

            {/* Tab 5: Đã kiểm kê */}
            <TouchableOpacity
              style={[styles.riskTabBtn, styles.riskTabAudited, selectedRiskFilter === 'AUDITED' && styles.riskTabAuditedActive]}
              onPress={() => { setSelectedRiskFilter('AUDITED'); setCurrentPage(1); }}
              activeOpacity={0.8}
            >
              <CheckCheck size={14} color={selectedRiskFilter === 'AUDITED' ? '#ffffff' : '#0f766e'} />
              <Text style={[styles.riskTabLabel, { color: selectedRiskFilter === 'AUDITED' ? '#ffffff' : '#0f766e' }]}>
                Đã kiểm ({riskStats.auditedCount})
              </Text>
            </TouchableOpacity>

            {/* Tab 6: Lô Đã Hết Hàng (0 SP) */}
            <TouchableOpacity
              style={[styles.riskTabBtn, styles.riskTabDepleted, selectedRiskFilter === 'DEPLETED' && styles.riskTabDepletedActive]}
              onPress={() => { setSelectedRiskFilter('DEPLETED'); setCurrentPage(1); }}
              activeOpacity={0.8}
            >
              <Archive size={13} color={selectedRiskFilter === 'DEPLETED' ? '#ffffff' : '#64748b'} />
              <Text style={[styles.riskTabLabel, { color: selectedRiskFilter === 'DEPLETED' ? '#ffffff' : '#64748b' }]}>
                Đã hết (0 SP: {riskStats.depletedCount})
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Smart Toggle Banner: Ẩn/Hiện Lô 0 Tồn Kho */}
        <View style={styles.toggleBar}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
            {hideZeroStock ? <EyeOff size={15} color="#0f766e" /> : <Eye size={15} color="#64748b Pratt" />}
            <Text style={styles.toggleBarText}>
              {hideZeroStock ? 'Đang tự động ẩn các lô đã hết hàng (0 SP)' : 'Đang hiển thị tất cả bao gồm lô 0 tồn'}
            </Text>
          </View>
          <Switch
            value={hideZeroStock}
            onValueChange={val => {
              setHideZeroStock(val);
              setCurrentPage(1);
            }}
            trackColor={{ false: '#cbd5e1', true: '#a7f3d0' }}
            thumbColor={hideZeroStock ? '#059669' : '#f8fafc'}
          />
        </View>

        {/* View Mode Switcher */}
        <View style={styles.tabSwitcher}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'LOTS_AUDIT' && styles.tabBtnActive]}
            onPress={() => setActiveTab('LOTS_AUDIT')}
            activeOpacity={0.8}
          >
            <ClipboardList size={16} color={activeTab === 'LOTS_AUDIT' ? '#059669' : '#64748b'} />
            <Text style={[styles.tabBtnText, activeTab === 'LOTS_AUDIT' && styles.tabBtnTextActive]}>
              Chi Tiết Lô Hàng ({filteredLots.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'PRODUCTS' && styles.tabBtnActive]}
            onPress={() => setActiveTab('PRODUCTS')}
            activeOpacity={0.8}
          >
            <Boxes size={16} color={activeTab === 'PRODUCTS' ? '#059669' : '#64748b'} />
            <Text style={[styles.tabBtnText, activeTab === 'PRODUCTS' && styles.tabBtnTextActive]}>
              Danh Mục Sản Phẩm ({stockList.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search Input Bar */}
        <View style={styles.searchBar}>
          <Search size={18} color="#64748b" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm mã Lô (LOT-...), tên thực phẩm, kệ..."
            placeholderTextColor="#94a3b8"
            value={keyword}
            onChangeText={text => {
              setKeyword(text);
              setCurrentPage(1);
              loadData(text);
            }}
          />
          {keyword.length > 0 && (
            <TouchableOpacity onPress={() => { setKeyword(''); setCurrentPage(1); loadData(''); }}>
              <Text style={{ color: '#64748b', fontSize: 13, fontWeight: '700' }}>Xóa</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Pagination Navigation Bar (Top) */}
        {activeTab === 'LOTS_AUDIT' && filteredLots.length > 0 && (
          <View style={styles.paginationBar}>
            <Text style={styles.paginationInfo}>
              Hiển thị <Text style={{ fontWeight: '800', color: '#0f172a' }}>{(currentPage - 1) * ITEMS_PER_PAGE + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredLots.length)}</Text> / {filteredLots.length} lô
            </Text>

            <View style={styles.paginationControls}>
              <TouchableOpacity
                style={[styles.pageBtn, currentPage === 1 && styles.pageBtnDisabled]}
                onPress={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft size={16} color={currentPage === 1 ? '#cbd5e1' : '#059669'} />
              </TouchableOpacity>

              <Text style={styles.pageIndicatorText}>Trang {currentPage}/{totalPages}</Text>

              <TouchableOpacity
                style={[styles.pageBtn, currentPage === totalPages && styles.pageBtnDisabled]}
                onPress={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight size={16} color={currentPage === totalPages ? '#cbd5e1' : '#059669'} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {loading ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#059669" />
            <Text style={{ color: '#64748b', marginTop: 10, fontSize: 13 }}>Đang tải dữ liệu lô hàng...</Text>
          </View>
        ) : activeTab === 'LOTS_AUDIT' ? (
          /* TAB 1: DANH SÁCH LÔ HÀNG CÓ PHÂN TRANG & TỰ ĐỘNG ẨN LÔ HẾT HÀNG */
          paginatedLots.length === 0 ? (
            <View style={styles.emptyCard}>
              <ClipboardList size={44} color="#94a3b8" />
              <Text style={styles.emptyTitle}>Không có lô hàng nào trong danh mục này</Text>
              {selectedRiskFilter !== 'DEPLETED' && riskStats.depletedCount > 0 && (
                <TouchableOpacity
                  style={{ marginTop: 10, paddingVertical: 6, paddingHorizontal: 12, backgroundColor: '#f1f5f9', borderRadius: 8 }}
                  onPress={() => setSelectedRiskFilter('DEPLETED')}
                >
                  <Text style={{ fontSize: 12, color: '#0f766e', fontWeight: '800' }}>
                    👉 Xem {riskStats.depletedCount} lô hàng đã hết tồn kho (0 SP)
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            paginatedLots.map((lot, idx) => {
              const auditRec = auditedLots[lot.id || lot.lotCode];
              const isAudited = !!auditRec || !!lot.lastAuditedAt;
              const isDepleted = lot.systemQuantity === 0;
              const auditorName = auditRec?.auditorName || lot.lastAuditedBy || 'Nhân viên trực ca';
              const auditedAt = auditRec?.auditedAt || (lot.lastAuditedAt ? new Date(lot.lastAuditedAt).toLocaleDateString('vi-VN') : '');
              const actualCount = auditRec ? auditRec.actualQty : (lot.lastAuditActualQty !== undefined ? lot.lastAuditActualQty : lot.systemQuantity);
              const diffVal = auditRec ? auditRec.diff : (lot.lastAuditDiff !== undefined ? lot.lastAuditDiff : 0);
              const hasDiff = isAudited && diffVal !== 0;

              const isDanger = lot.riskLevel === 'DANGER';
              const isWarning = lot.riskLevel === 'WARNING';

              return (
                <View
                  key={lot.id || idx}
                  style={[
                    styles.lotCard,
                    isDepleted
                      ? styles.lotCardDepleted
                      : isAudited
                      ? styles.lotCardAudited
                      : isDanger
                      ? styles.lotCardDanger
                      : isWarning
                      ? styles.lotCardWarning
                      : styles.lotCardSafe,
                  ]}
                >
                  {/* Card Top: Lot Code & Status Badges */}
                  <View style={styles.lotCardTop}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={[styles.lotCodeMain, isDepleted && { color: '#64748b' }]}>{lot.lotCode}</Text>
                        <View style={styles.categoryBadge}>
                          <Text style={styles.categoryBadgeText}>{lot.category}</Text>
                        </View>
                      </View>
                      <Text style={[styles.lotProductName, isDepleted && { color: '#64748b' }]}>{lot.productName}</Text>
                      <Text style={styles.lotSkuText}>SKU: {lot.sku}</Text>
                    </View>

                    {/* Status Badge: Hết hàng / Đã kiểm / Báo động đỏ / Có nguy cơ / Bình thường */}
                    {isDepleted ? (
                      <View style={styles.badgeDepleted}>
                        <Archive size={11} color="#64748b" />
                        <Text style={styles.badgeDepletedText}>ĐÃ HẾT HÀNG (0 TỒN)</Text>
                      </View>
                    ) : isAudited ? (
                      <View style={styles.badgeAudited}>
                        <CheckCircle2 size={12} color="#0f766e" />
                        <Text style={styles.badgeAuditedText}>ĐÃ KIỂM KÊ</Text>
                      </View>
                    ) : isDanger ? (
                      <View style={styles.badgeDanger}>
                        <View style={[styles.statusDot, { backgroundColor: '#ffffff' }]} />
                        <Text style={styles.badgeDangerText}>BÁO ĐỘNG ĐỎ</Text>
                      </View>
                    ) : isWarning ? (
                      <View style={styles.badgeWarning}>
                        <View style={[styles.statusDot, { backgroundColor: '#eab308' }]} />
                        <Text style={styles.badgeWarningText}>CÓ NGUY CƠ</Text>
                      </View>
                    ) : (
                      <View style={styles.badgeSafe}>
                        <View style={[styles.statusDot, { backgroundColor: '#16a34a' }]} />
                        <Text style={styles.badgeSafeText}>BÌNH THƯỜNG</Text>
                      </View>
                    )}
                  </View>

                  {/* Lot Metadata Grid */}
                  <View style={styles.lotMetaGrid}>
                    <View style={styles.metaCol}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <MapPin size={13} color="#0284c7" />
                        <Text style={styles.metaColLabel}>Vị trí Kệ:</Text>
                      </View>
                      <Text style={styles.metaColVal}>{lot.shelfLocation}</Text>
                    </View>

                    <View style={styles.metaCol}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Calendar size={13} color="#64748b" />
                        <Text style={styles.metaColLabel}>Hạn dùng (HSD):</Text>
                      </View>
                      <Text style={styles.metaColVal}>{lot.expiryDate}</Text>
                    </View>

                    <View style={styles.metaCol}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Boxes size={13} color={isDepleted ? '#64748b' : '#059669'} />
                        <Text style={styles.metaColLabel}>Tồn hệ thống:</Text>
                      </View>
                      <Text style={[styles.metaColVal, { color: isDepleted ? '#64748b' : '#059669', fontWeight: '900' }]}>
                        {lot.systemQuantity} {lot.unit}
                      </Text>
                    </View>
                  </View>

                  {/* AI Risk Reason Note */}
                  {!isDepleted && (
                    <View style={[styles.riskNoteBox, isDanger ? styles.riskNoteBoxDanger : isWarning ? styles.riskNoteBoxWarning : styles.riskNoteBoxSafe]}>
                      <Text style={[styles.riskNoteText, isDanger ? { color: '#991b1b' } : isWarning ? { color: '#854d0e' } : { color: '#166534' }]}>
                        {lot.riskReason}
                      </Text>
                    </View>
                  )}

                  {/* Audit History Snapshot if Audited */}
                  {isAudited && (
                    <View style={styles.auditHistoryBox}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={styles.auditHistoryText}>
                          👤 Đã kiểm: <Text style={{ fontWeight: '700', color: '#0f172a' }}>{auditorName}</Text> {auditedAt ? `(${auditedAt})` : ''}
                        </Text>
                        <Text style={[styles.auditHistoryDiff, hasDiff ? { color: '#dc2626' } : { color: '#0f766e' }]}>
                          Thực đếm: {actualCount} {lot.unit} ({hasDiff ? (diffVal > 0 ? `+${diffVal}` : diffVal) : 'Khớp 100%'})
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* Action Button Row */}
                  <View style={styles.lotActionRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.recommendText}>
                        {isDepleted
                          ? '📦 Lô hàng đã xuất/hủy hết tồn kho. Lưu vết kiểm kê trong hệ thống.'
                          : isAudited
                          ? hasDiff
                            ? '⚠️ Đã ghi nhận chênh lệch kiểm kê.'
                            : '✅ Số lượng thực tế khớp 100% với hệ thống.'
                          : lot.riskRecommendation}
                      </Text>
                    </View>

                    {/* Nút Kiểm Kê / Kiểm Kê Lại */}
                    <TouchableOpacity
                      style={[
                        styles.auditActionBtn,
                        isDepleted
                          ? styles.auditActionBtnDepleted
                          : isAudited
                          ? styles.auditActionBtnAudited
                          : isDanger
                          ? styles.auditActionBtnDanger
                          : styles.auditActionBtnNormal,
                      ]}
                      onPress={() => openAuditModal(lot)}
                      activeOpacity={0.8}
                    >
                      <Edit3 size={14} color="#ffffff" />
                      <Text style={styles.auditActionBtnText}>
                        {isAudited ? 'Kiểm Kê Lại' : isDanger ? 'Kiểm Kê Ngay' : 'Kiểm Kê Lô'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )
        ) : (
          /* TAB 2: DANH MỤC TỔNG TỒN SẢN PHẨM */
          stockList.map(stock => (
            <View key={stock.sku} style={styles.productCard}>
              <View style={styles.stockTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.productName}>{stock.productName}</Text>
                  <Text style={styles.skuText}>Mã SKU: {stock.sku}</Text>
                </View>
                <View style={styles.zoneTag}>
                  <Snowflake size={12} color="#0284c7" />
                  <Text style={styles.zoneTagText}>{stock.zone}</Text>
                </View>
              </View>

              <View style={styles.qtyBox}>
                <View style={styles.qtyCol}>
                  <Text style={styles.qtyLabel}>Tồn thực tế</Text>
                  <Text style={styles.qtyValue}>{stock.totalStock} {stock.unit}</Text>
                </View>
                <View style={styles.qtyDivider} />
                <View style={styles.qtyCol}>
                  <Text style={styles.qtyLabel}>Khả dụng xuất</Text>
                  <Text style={[styles.qtyValue, { color: '#059669' }]}>{stock.availableStock} {stock.unit}</Text>
                </View>
                <View style={styles.qtyDivider} />
                <View style={styles.qtyCol}>
                  <Text style={styles.qtyLabel}>Vị trí kệ</Text>
                  <Text style={[styles.qtyValue, { color: '#0284c7', fontSize: 13 }]}>{stock.shelfLocation}</Text>
                </View>
              </View>

              <Text style={styles.lotsTitle}>Gồm {stock.lots?.length || 0} lô hàng chi tiết:</Text>
              {stock.lots?.map((l, lIdx) => (
                <View key={lIdx} style={styles.miniLotRow}>
                  <Text style={styles.miniLotCode}>{l.lotCode}</Text>
                  <Text style={styles.miniLotExp}>HSD: {l.expiryDate} ({l.daysRemaining} ngày)</Text>
                  <Text style={styles.miniLotQty}>{l.quantity} {stock.unit}</Text>
                </View>
              ))}
            </View>
          ))
        )}

        {/* Bottom Pagination Controls */}
        {activeTab === 'LOTS_AUDIT' && totalPages > 1 && (
          <View style={[styles.paginationBar, { marginTop: 12 }]}>
            <TouchableOpacity
              style={[styles.pageBtnWide, currentPage === 1 && styles.pageBtnDisabled]}
              onPress={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft size={16} color={currentPage === 1 ? '#cbd5e1' : '#059669'} />
              <Text style={[styles.pageBtnWideText, currentPage === 1 && { color: '#cbd5e1' }]}>Trang trước</Text>
            </TouchableOpacity>

            <Text style={styles.pageIndicatorText}>Trang {currentPage} / {totalPages}</Text>

            <TouchableOpacity
              style={[styles.pageBtnWide, currentPage === totalPages && styles.pageBtnDisabled]}
              onPress={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              <Text style={[styles.pageBtnWideText, currentPage === totalPages && { color: '#cbd5e1' }]}>Trang sau</Text>
              <ChevronRight size={16} color={currentPage === totalPages ? '#cbd5e1' : '#059669'} />
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Modal Đối Soát & Kiểm Kê Lô Hàng */}
      <Modal
        visible={auditModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAuditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <ClipboardList size={22} color="#059669" />
                <Text style={styles.modalTitle}>Phiếu Đối Soát & Kiểm Kê Lô Hàng</Text>
              </View>
              <TouchableOpacity onPress={() => setAuditModalVisible(false)}>
                <X size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            {selectedLot && (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Product & Lot Meta */}
                <View style={styles.modalInfoBox}>
                  <Text style={styles.modalProductName}>{selectedLot.productName}</Text>
                  <Text style={styles.modalMetaText}>Mã SKU: {selectedLot.sku} • Vị trí Kệ: {selectedLot.shelfLocation}</Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                    <Text style={{ fontSize: 13, color: '#065f46', fontWeight: '900' }}>
                      Mã Lô: {selectedLot.lotCode}
                    </Text>
                    <Text style={{ fontSize: 12, color: '#64748b', fontWeight: '600' }}>
                      HSD: {selectedLot.expiryDate}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                    <User size={12} color="#64748b" />
                    <Text style={{ fontSize: 11.5, color: '#475569', fontWeight: '600' }}>
                      Người kiểm kê: {user?.name || 'Nhân viên trực ca'} ({user?.shift || 'Ca trực hiện tại'})
                    </Text>
                  </View>
                </View>

                {/* System vs Actual Comparison */}
                <View style={styles.compareRow}>
                  <View style={styles.compareCol}>
                    <Text style={styles.compareLabel}>Tồn sổ sách hệ thống</Text>
                    <Text style={styles.compareValue}>{selectedLot.systemQuantity} {selectedLot.unit}</Text>
                  </View>
                  <View style={styles.compareDivider} />
                  <View style={styles.compareCol}>
                    <Text style={styles.compareLabel}>Chênh lệch đối soát</Text>
                    <Text style={[
                      styles.compareValue,
                      { color: diffCount > 0 ? '#059669' : diffCount < 0 ? '#dc2626' : '#64748b' }
                    ]}>
                      {diffCount > 0 ? `Thừa +${diffCount}` : diffCount < 0 ? `Thiếu ${diffCount}` : 'Khớp 100%'}
                    </Text>
                  </View>
                </View>

                {/* Actual Count Input */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>SỐ LƯỢNG THỰC TẾ ĐẾM ĐƯỢC TRÊN KỆ:</Text>
                  <View style={styles.inputWrap}>
                    <TextInput
                      style={styles.actualInput}
                      value={actualQtyInput}
                      onChangeText={setActualQtyInput}
                      keyboardType="number-pad"
                      placeholder="Nhập số lượng thực đếm..."
                      placeholderTextColor="#94a3b8"
                    />
                    <Text style={styles.inputUnit}>{selectedLot.unit}</Text>
                  </View>

                  {/* Quick Counter Shortcut Buttons */}
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                    <TouchableOpacity
                      style={styles.quickCountBtn}
                      onPress={() => setActualQtyInput(String(selectedLot.systemQuantity))}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.quickCountBtnText}>🎯 Khớp 100% ({selectedLot.systemQuantity})</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.quickCountBtn, { backgroundColor: '#fee2e2', borderColor: '#fca5a5' }]}
                      onPress={() => setActualQtyInput('0')}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.quickCountBtnText, { color: '#dc2626' }]}>🗑️ Hết hàng (0)</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.quickCountBtn}
                      onPress={() => {
                        const cur = parseInt(actualQtyInput || '0', 10);
                        setActualQtyInput(String(Math.max(0, cur - 1)));
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.quickCountBtnText}>-1</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.quickCountBtn}
                      onPress={() => {
                        const cur = parseInt(actualQtyInput || '0', 10);
                        setActualQtyInput(String(cur + 1));
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.quickCountBtnText}>+1</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.quickCountBtn}
                      onPress={() => {
                        const cur = parseInt(actualQtyInput || '0', 10);
                        setActualQtyInput(String(Math.max(0, cur - 5)));
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.quickCountBtnText}>-5</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.quickCountBtn}
                      onPress={() => {
                        const cur = parseInt(actualQtyInput || '0', 10);
                        setActualQtyInput(String(cur + 5));
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.quickCountBtnText}>+5</Text>
                    </TouchableOpacity>
                  </View>

                  {actualQtyInput === '0' && (
                    <Text style={{ fontSize: 11, color: '#dc2626', marginTop: 6, fontWeight: '700' }}>
                      ⚠️ Nhập 0 sẽ xóa lô hàng khỏi hệ thống và giải phóng hoàn toàn vị trí kệ kho.
                    </Text>
                  )}
                </View>

                {/* Audit Reason Selector */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>LÝ DO KIỂM KÊ / ĐIỀU CHỈNH:</Text>
                  {[
                    'Kiểm kê định kỳ hàng tháng',
                    'Hàng dập nát / Hư hỏng trong quá trình bảo quản',
                    'Kiểm kê đột xuất phát hiện thừa/thiếu',
                    'Hàng quá hạn sử dụng cần hủy bỏ',
                  ].map((r, rIdx) => (
                    <TouchableOpacity
                      key={rIdx}
                      style={[styles.reasonChip, auditReason === r && styles.reasonChipActive]}
                      onPress={() => setAuditReason(r)}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.reasonRadio, auditReason === r && styles.reasonRadioActive]}>
                        {auditReason === r && <View style={styles.reasonRadioInner} />}
                      </View>
                      <Text style={[styles.reasonText, auditReason === r && styles.reasonTextActive]}>
                        {r}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Audit Note */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>GHI CHÚ KIỂM KÊ (TÙY CHỌN):</Text>
                  <TextInput
                    style={styles.noteInput}
                    value={auditNote}
                    onChangeText={setAuditNote}
                    placeholder="Nhập ghi chú hoặc tình trạng bao bì nếu có..."
                    placeholderTextColor="#94a3b8"
                  />
                </View>

                {/* Submit Action Button */}
                <TouchableOpacity
                  style={[styles.modalSubmitBtn, submittingAudit && { opacity: 0.7 }]}
                  onPress={handleSaveAudit}
                  disabled={submittingAudit}
                  activeOpacity={0.85}
                >
                  {submittingAudit ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Check size={18} color="#ffffff" />
                      <Text style={styles.modalSubmitText}>XÁC NHẬN CẬP NHẬT KIỂM KÊ</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </ScrollView>
            )}
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
    marginBottom: 10,
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
    lineHeight: 16,
  },
  riskTabsContainer: {
    marginBottom: 8,
  },
  riskTabsScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  riskTabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  riskTabAll: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
  },
  riskTabAllActive: {
    borderColor: '#059669',
    backgroundColor: '#ecfdf5',
  },
  riskTabSafe: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  riskTabSafeActive: {
    backgroundColor: '#dcfce7',
    borderColor: '#16a34a',
  },
  riskTabWarning: {
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
  },
  riskTabWarningActive: {
    backgroundColor: '#fef3c7',
    borderColor: '#eab308',
  },
  riskTabDanger: {
    backgroundColor: '#dc2626',
    borderColor: '#dc2626',
  },
  riskTabDangerActive: {
    backgroundColor: '#b91c1c',
    borderColor: '#991b1b',
  },
  riskTabAudited: {
    backgroundColor: '#f0fdfa',
    borderColor: '#99f6e4',
  },
  riskTabAuditedActive: {
    backgroundColor: '#0f766e',
    borderColor: '#0f766e',
  },
  riskTabDepleted: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
  },
  riskTabDepletedActive: {
    backgroundColor: '#475569',
    borderColor: '#334155',
  },
  riskTabIcon: {
    fontSize: 14,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  riskTabLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
  },
  riskTabLabelActive: {
    color: '#059669',
  },
  toggleBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 10,
  },
  toggleBarText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#334155',
  },
  tabSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#e2e8f0',
    borderRadius: 12,
    padding: 3,
    marginBottom: 10,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 10,
  },
  tabBtnActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tabBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#64748b',
  },
  tabBtnTextActive: {
    color: '#059669',
    fontWeight: '800',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#0f172a',
    height: 42,
    fontSize: 13,
    fontWeight: '600',
  },
  paginationBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 10,
  },
  paginationInfo: {
    fontSize: 11.5,
    color: '#64748b',
  },
  paginationControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pageBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  pageBtnDisabled: {
    backgroundColor: '#f1f5f9',
    borderColor: '#e2e8f0',
  },
  pageBtnWide: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ecfdf5',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  pageBtnWideText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#059669',
  },
  pageIndicatorText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#0f172a',
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
    fontSize: 14,
    fontWeight: '800',
    marginTop: 8,
  },
  lotCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  lotCardSafe: {
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  lotCardWarning: {
    borderColor: '#fde68a',
    backgroundColor: '#fffdf5',
  },
  lotCardDanger: {
    borderColor: '#fecaca',
    backgroundColor: '#fffafa',
  },
  lotCardAudited: {
    borderColor: '#99f6e4',
    backgroundColor: '#fafffd',
  },
  lotCardDepleted: {
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    opacity: 0.85,
  },
  lotCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  lotCodeMain: {
    color: '#0f172a',
    fontSize: 13.5,
    fontWeight: '900',
  },
  categoryBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  categoryBadgeText: {
    color: '#475569',
    fontSize: 9.5,
    fontWeight: '600',
  },
  lotProductName: {
    color: '#1e293b',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  lotSkuText: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 1,
  },
  badgeSafe: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#f0fdf4',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  badgeSafeText: {
    color: '#15803d',
    fontSize: 9.5,
    fontWeight: '900',
  },
  badgeWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#fffbeb',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  badgeWarningText: {
    color: '#a16207',
    fontSize: 9.5,
    fontWeight: '900',
  },
  badgeDanger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#dc2626',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  badgeDangerText: {
    color: '#ffffff',
    fontSize: 9.5,
    fontWeight: '900',
  },
  badgeAudited: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f0fdfa',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#99f6e4',
  },
  badgeAuditedText: {
    color: '#0f766e',
    fontSize: 9.5,
    fontWeight: '900',
  },
  badgeDepleted: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f1f5f9',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  badgeDepletedText: {
    color: '#475569',
    fontSize: 9,
    fontWeight: '800',
  },
  lotMetaGrid: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  metaCol: {
    flex: 1,
  },
  metaColLabel: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
  },
  metaColVal: {
    fontSize: 12,
    color: '#0f172a',
    fontWeight: '800',
    marginTop: 1,
  },
  riskNoteBox: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginBottom: 8,
    borderWidth: 1,
  },
  riskNoteBoxSafe: {
    backgroundColor: '#f0fdf4',
    borderColor: '#dcfce7',
  },
  riskNoteBoxWarning: {
    backgroundColor: '#fffbeb',
    borderColor: '#fef3c7',
  },
  riskNoteBoxDanger: {
    backgroundColor: '#fef2f2',
    borderColor: '#fee2e2',
  },
  riskNoteText: {
    fontSize: 11,
    fontWeight: '700',
  },
  auditHistoryBox: {
    backgroundColor: '#f0fdfa',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#99f6e4',
    marginBottom: 8,
  },
  auditHistoryText: {
    fontSize: 11,
    color: '#334155',
  },
  auditHistoryDiff: {
    fontSize: 11.5,
    fontWeight: '800',
  },
  lotActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    gap: 8,
  },
  recommendText: {
    fontSize: 10.5,
    color: '#64748b',
    fontWeight: '600',
    lineHeight: 14,
  },
  auditActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  auditActionBtnNormal: {
    backgroundColor: '#059669',
  },
  auditActionBtnDanger: {
    backgroundColor: '#dc2626',
  },
  auditActionBtnAudited: {
    backgroundColor: '#0f766e',
  },
  auditActionBtnDepleted: {
    backgroundColor: '#64748b',
  },
  auditActionBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  productCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
  },
  stockTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  productName: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '800',
  },
  skuText: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 2,
  },
  zoneTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f0f9ff',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  zoneTagText: {
    color: '#0284c7',
    fontSize: 10.5,
    fontWeight: '700',
  },
  qtyBox: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  qtyCol: {
    flex: 1,
    alignItems: 'center',
  },
  qtyDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#e2e8f0',
  },
  qtyLabel: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 2,
  },
  qtyValue: {
    color: '#0f172a',
    fontSize: 13.5,
    fontWeight: '800',
  },
  lotsTitle: {
    color: '#334155',
    fontSize: 11.5,
    fontWeight: '700',
    marginBottom: 6,
  },
  miniLotRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  miniLotCode: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0f172a',
  },
  miniLotExp: {
    fontSize: 10.5,
    color: '#64748b',
  },
  miniLotQty: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#059669',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '88%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
  },
  modalInfoBox: {
    backgroundColor: '#f8fafc',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 14,
  },
  modalProductName: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0f172a',
  },
  modalMetaText: {
    fontSize: 11.5,
    color: '#64748b',
    marginTop: 2,
  },
  compareRow: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 14,
  },
  compareCol: {
    flex: 1,
    alignItems: 'center',
  },
  compareDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#e2e8f0',
  },
  compareLabel: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 2,
  },
  compareValue: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0f172a',
  },
  formGroup: {
    marginBottom: 14,
  },
  formLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#475569',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#059669',
    paddingHorizontal: 14,
    height: 48,
  },
  actualInput: {
    flex: 1,
    fontSize: 17,
    fontWeight: '900',
    color: '#0f172a',
  },
  inputUnit: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#64748b',
  },
  noteInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 12,
    height: 42,
    fontSize: 12.5,
    color: '#0f172a',
  },
  reasonChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  reasonChipActive: {
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
  },
  reasonRadio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  reasonRadioActive: {
    borderColor: '#059669',
  },
  reasonRadioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#059669',
  },
  reasonText: {
    fontSize: 11.5,
    color: '#334155',
    fontWeight: '600',
  },
  reasonTextActive: {
    color: '#065f46',
    fontWeight: '700',
  },
  modalSubmitBtn: {
    backgroundColor: '#059669',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    marginBottom: 20,
  },
  modalSubmitText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  quickCountBtn: {
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  quickCountBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
});
