import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  StatusBar,
} from 'react-native';
import { useDriverTask } from '../context/DriverTaskContext';
import { COLORS } from '../theme/colors';
import { Wallet, Award, CheckCircle2, TrendingUp, ChevronRight } from 'lucide-react-native';

export const EarningsScreen: React.FC = () => {
  const { driverProfile, deliveredTasks } = useDriverTask();

  const formatPrice = (val: number) => val.toLocaleString('vi-VN') + 'đ';

  return (
    <SafeAreaView style={styles.safeContainer}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Ví Thu Nhập & Hiệu Suất Tài Xế</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Wallet Main Card */}
        <View style={styles.walletCard}>
          <View style={styles.walletHeader}>
            <Wallet size={20} color={COLORS.accent} />
            <Text style={styles.walletTitle}>Tổng Thu Nhập Hôm Nay</Text>
          </View>
          <Text style={styles.walletAmount}>{formatPrice(driverProfile.totalEarningsToday)}</Text>
          <Text style={styles.walletSub}>Tự động quyết toán vào Ví tài khoản 22:00 hàng ngày</Text>
        </View>

        {/* Performance Stats Cards Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <CheckCircle2 size={22} color={COLORS.primary} />
            <Text style={styles.statVal}>{driverProfile.completedTasksToday} đơn</Text>
            <Text style={styles.statLabel}>Đã giao hôm nay</Text>
          </View>

          <View style={styles.statBox}>
            <Award size={22} color={COLORS.routeBlue} />
            <Text style={styles.statVal}>100%</Text>
            <Text style={styles.statLabel}>Giao đúng giờ 2h</Text>
          </View>
        </View>

        {/* Delivered History List */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Lịch sử đơn đã hoàn tất ({deliveredTasks.length})</Text>

          {deliveredTasks.map(t => (
            <View key={t.id} style={styles.historyRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.historyCode}>#{t.orderCode} - {t.customerName}</Text>
                <Text style={styles.historyTime}>Giao lúc: {t.deliveredAt || '15:20 Hôm nay'}</Text>
              </View>
              <Text style={styles.historyFee}>+35.000đ</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    height: 50,
    backgroundColor: COLORS.headerBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.surface,
  },
  scrollContent: {
    padding: 12,
    paddingBottom: 24,
  },
  walletCard: {
    backgroundColor: COLORS.headerBg,
    borderRadius: 14,
    padding: 18,
    marginBottom: 12,
  },
  walletHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  walletTitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 6,
  },
  walletAmount: {
    color: COLORS.accent,
    fontSize: 32,
    fontWeight: '900',
    marginVertical: 4,
  },
  walletSub: {
    color: COLORS.textMuted,
    fontSize: 10,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: COLORS.surface,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statVal: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.textPrimary,
    marginTop: 6,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 10,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  historyCode: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  historyTime: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  historyFee: {
    fontSize: 14,
    fontWeight: '900',
    color: COLORS.primary,
  },
});
