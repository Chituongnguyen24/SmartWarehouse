import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Image,
} from 'react-native';
import {
  Boxes,
  Download,
  PackageCheck,
  Search,
  ScanBarcode,
  Sparkles,
  MapPin,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Snowflake,
  ShieldCheck,
  LogOut,
  Building2,
  Truck,
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { fetchShiftMetricsApi } from '../services/api';
import { TabType } from '../../App';
import { COLORS } from '../theme/colors';

interface ShiftHomeScreenProps {
  onNavigate: (tab: TabType) => void;
}

export const ShiftHomeScreen: React.FC<ShiftHomeScreenProps> = ({ onNavigate }) => {
  const { user, activeWarehouse, switchWarehouse, logout } = useAuth();
  const [metrics, setMetrics] = useState({
    pendingInbound: 0,
    pendingPicking: 0,
    readyToPack: 0,
    nearExpiryLots: 0,
    totalLots: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadMetrics = async () => {
    try {
      const data = await fetchShiftMetricsApi(activeWarehouse);
      setMetrics(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMetrics();
  }, [activeWarehouse]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMetrics();
    setRefreshing(false);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#059669" />}
    >
      {/* City Mart Header & Staff Profile */}
      <View style={styles.profileCard}>
        <View style={styles.profileTop}>
          <Image
            source={require('../../assets/logos/logo_icon.png')}
            style={styles.logoIcon}
            resizeMode="contain"
          />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.brandTag}>CITY MART • KHO VẬN HÀNH</Text>
            <Text style={styles.userName}>{user?.name || 'Nhân Viên Kho'}</Text>
            <Text style={styles.userRole}>
              {user?.role === 'WAREHOUSE_MANAGER' ? 'Quản Lý Kho' : 'Nhân Viên Trực Ca'}
            </Text>
          </View>
          <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.8}>
            <LogOut size={16} color="#ef4444" />
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        {/* Warehouse Selector & Shift Details */}
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Clock size={13} color="#64748b" />
            <Text style={styles.metaText}>{user?.shift || 'Ca Sáng (06:00 - 14:00)'}</Text>
          </View>
          <TouchableOpacity
            style={styles.warehousePill}
            onPress={() => switchWarehouse(activeWarehouse === 'WH-006' ? 'WH-005' : 'WH-006')}
          >
            <Building2 size={13} color="#059669" />
            <Text style={styles.warehousePillText}>
              {activeWarehouse === 'WH-006' ? 'Kho Gò Vấp' : 'Kho Tân Bình'} ⇄
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* KPI Operations Grid */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Nhiệm Vụ Trong Ca</Text>
        <Text style={styles.sectionSub}>Tổng hợp việc cần xử lý theo thời gian thực</Text>
      </View>

      <View style={styles.kpiGrid}>
        {/* KPI 1: Soạn hàng */}
        <TouchableOpacity
          style={[styles.kpiCard, { backgroundColor: '#ecfdf5', borderColor: '#a7f3d0' }]}
          onPress={() => onNavigate('PICKING')}
          activeOpacity={0.8}
        >
          <View style={styles.kpiCardTop}>
            <View style={[styles.kpiIconWrap, { backgroundColor: '#059669' }]}>
              <Boxes size={18} color="#ffffff" />
            </View>
            <View style={[styles.kpiBadge, { backgroundColor: '#d1fae5' }]}>
              <Text style={[styles.kpiBadgeText, { color: '#047857' }]}>Cần lấy</Text>
            </View>
          </View>
          <Text style={[styles.kpiValue, { color: '#065f46' }]}>{metrics.pendingPicking}</Text>
          <Text style={styles.kpiLabel}>Đơn chờ lấy hàng</Text>
        </TouchableOpacity>

        {/* KPI 2: Nhập kho */}
        <TouchableOpacity
          style={[styles.kpiCard, { backgroundColor: '#fffbeb', borderColor: '#fde68a' }]}
          onPress={() => onNavigate('INBOUND')}
          activeOpacity={0.8}
        >
          <View style={styles.kpiCardTop}>
            <View style={[styles.kpiIconWrap, { backgroundColor: '#d97706' }]}>
              <Download size={18} color="#ffffff" />
            </View>
            <View style={[styles.kpiBadge, { backgroundColor: '#fef3c7' }]}>
              <Text style={[styles.kpiBadgeText, { color: '#b45309' }]}>Kiểm định</Text>
            </View>
          </View>
          <Text style={[styles.kpiValue, { color: '#92400e' }]}>{metrics.pendingInbound}</Text>
          <Text style={styles.kpiLabel}>Phiếu nhập chờ xử lý</Text>
        </TouchableOpacity>

        {/* KPI 3: Đóng gói */}
        <TouchableOpacity
          style={[styles.kpiCard, { backgroundColor: '#f0f9ff', borderColor: '#bae6fd' }]}
          onPress={() => onNavigate('PACKING')}
          activeOpacity={0.8}
        >
          <View style={styles.kpiCardTop}>
            <View style={[styles.kpiIconWrap, { backgroundColor: '#0284c7' }]}>
              <PackageCheck size={18} color="#ffffff" />
            </View>
            <View style={[styles.kpiBadge, { backgroundColor: '#e0f2fe' }]}>
              <Text style={[styles.kpiBadgeText, { color: '#0369a1' }]}>Xuất hàng</Text>
            </View>
          </View>
          <Text style={[styles.kpiValue, { color: '#075985' }]}>{metrics.readyToPack}</Text>
          <Text style={styles.kpiLabel}>Kiện chờ đóng gói</Text>
        </TouchableOpacity>

        {/* KPI 4: Lô gần hết hạn */}
        <TouchableOpacity
          style={[styles.kpiCard, { backgroundColor: '#fef2f2', borderColor: '#fecaca' }]}
          onPress={() => onNavigate('LOOKUP')}
          activeOpacity={0.8}
        >
          <View style={styles.kpiCardTop}>
            <View style={[styles.kpiIconWrap, { backgroundColor: '#dc2626' }]}>
              <AlertTriangle size={18} color="#ffffff" />
            </View>
            <View style={[styles.kpiBadge, { backgroundColor: '#fee2e2' }]}>
              <Text style={[styles.kpiBadgeText, { color: '#b91c1c' }]}>HSD gần</Text>
            </View>
          </View>
          <Text style={[styles.kpiValue, { color: '#991b1b' }]}>{metrics.nearExpiryLots}</Text>
          <Text style={styles.kpiLabel}>Lô cận hạn (≤ 7 ngày)</Text>
        </TouchableOpacity>
      </View>

      {/* Quick Action Hub */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Thao Tác Nhanh</Text>
      </View>

      <TouchableOpacity
        style={styles.actionCard}
        onPress={() => onNavigate('PICKING')}
        activeOpacity={0.8}
      >
        <View style={[styles.actionIconCircle, { backgroundColor: '#ecfdf5' }]}>
          <Boxes size={22} color="#059669" />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.actionTitle}>Soạn Hàng (Ưu Tiên HSD)</Text>
          <Text style={styles.actionDesc}>Lấy hàng theo vị trí kệ và ưu tiên hạn dùng gần nhất</Text>
        </View>
        <ChevronRight size={20} color="#94a3b8" />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.actionCard}
        onPress={() => onNavigate('PACKING')}
        activeOpacity={0.8}
      >
        <View style={[styles.actionIconCircle, { backgroundColor: '#f0f9ff' }]}>
          <PackageCheck size={22} color="#0284c7" />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.actionTitle}>Đóng Gói & Xuất Kho</Text>
          <Text style={styles.actionDesc}>Đóng thùng xốp gel đá, dán nhãn và chuyển khu tập kết</Text>
        </View>
        <ChevronRight size={20} color="#94a3b8" />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.actionCard}
        onPress={() => onNavigate('INBOUND')}
        activeOpacity={0.8}
      >
        <View style={[styles.actionIconCircle, { backgroundColor: '#fffbeb' }]}>
          <Download size={22} color="#d97706" />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.actionTitle}>Nhập Hàng & Đo Nhiệt Độ</Text>
          <Text style={styles.actionDesc}>Tiếp nhận đơn nhập từ nhà cung cấp, kiểm tra chất lượng</Text>
        </View>
        <ChevronRight size={20} color="#94a3b8" />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.actionCard}
        onPress={() => onNavigate('LOOKUP')}
        activeOpacity={0.8}
      >
        <View style={[styles.actionIconCircle, { backgroundColor: '#faf5ff' }]}>
          <Search size={22} color="#7c3aed" />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.actionTitle}>Tra Cứu Tồn Kho & Hạn Dùng</Text>
          <Text style={styles.actionDesc}>Tìm kiếm sản phẩm, xem hạn sử dụng và vị trí kệ hàng</Text>
        </View>
        <ChevronRight size={20} color="#94a3b8" />
      </TouchableOpacity>
    </ScrollView>
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
  profileCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  profileTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoIcon: {
    width: 44,
    height: 44,
  },
  brandTag: {
    color: '#059669',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  userName: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '800',
    marginTop: 2,
  },
  userRole: {
    color: '#64748b',
    fontSize: 11.5,
    marginTop: 1,
  },
  logoutBtn: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 12,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    color: '#475569',
    fontSize: 11.5,
    fontWeight: '600',
  },
  warehousePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#ecfdf5',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  warehousePillText: {
    color: '#059669',
    fontSize: 11,
    fontWeight: '700',
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  sectionSub: {
    fontSize: 11.5,
    color: '#64748b',
    marginTop: 2,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 22,
  },
  kpiCard: {
    width: '48%',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  kpiCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  kpiIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  kpiBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
  },
  kpiValue: {
    fontSize: 24,
    fontWeight: '900',
    marginVertical: 2,
  },
  kpiLabel: {
    color: '#475569',
    fontSize: 11.5,
    fontWeight: '600',
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
  },
  actionIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTitle: {
    color: '#0f172a',
    fontSize: 13.5,
    fontWeight: '800',
  },
  actionDesc: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 2,
  },
});
