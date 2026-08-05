import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Platform,
  StatusBar,
} from 'react-native';
import { useDriverTask } from '../context/DriverTaskContext';
import { COLORS } from '../theme/colors';
import { Wallet, Award, CheckCircle2 } from 'lucide-react-native';

export const EarningsScreen: React.FC = () => {
  const { driverProfile, deliveredTasks } = useDriverTask();

  const formatPrice = (val: number) => val.toLocaleString('vi-VN') + 'đ';

  return (
    <SafeAreaView style={styles.safeContainer}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Ví Thu Nhập & Hiệu Suất</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Wallet Main Card (Modern slate gradient design) */}
        <View style={styles.walletCard}>
          <View style={styles.walletHeader}>
            <View style={styles.walletIconBox}>
              <Wallet size={18} color={COLORS.accent} />
            </View>
            <Text style={styles.walletTitle}>TỔNG THU NHẬP HÔM NAY</Text>
          </View>
          <Text style={styles.walletAmount}>{formatPrice(driverProfile.totalEarningsToday)}</Text>
          <View style={styles.divider} />
          <Text style={styles.walletSub}>✨ Quyết toán tự động về tài khoản liên kết lúc 22:00 hàng ngày.</Text>
        </View>

        {/* Performance Stats Cards Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <View style={[styles.statIconBox, { backgroundColor: COLORS.successLight }]}>
              <CheckCircle2 size={18} color={COLORS.primary} />
            </View>
            <Text style={styles.statVal}>{driverProfile.completedTasksToday} đơn</Text>
            <Text style={styles.statLabel}>Đã giao thành công</Text>
          </View>

          <View style={styles.statBox}>
            <View style={[styles.statIconBox, { backgroundColor: COLORS.routeBlueLight }]}>
              <Award size={18} color={COLORS.routeBlue} />
            </View>
            <Text style={styles.statVal}>100%</Text>
            <Text style={styles.statLabel}>Đúng giờ quy định</Text>
          </View>
        </View>

        {/* Delivered History List */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Lịch sử giao hàng ({deliveredTasks.length})</Text>

          {deliveredTasks.length === 0 ? (
            <Text style={styles.emptyText}>Chưa có đơn hàng nào được giao hôm nay.</Text>
          ) : (
            deliveredTasks.map(t => (
              <View key={t.id} style={styles.historyRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.historyCode}>#{t.orderCode} - {t.customerName}</Text>
                  <Text style={styles.historyTime}>Hoàn thành: {t.deliveredAt || 'Hôm nay'}</Text>
                </View>
                <Text style={styles.historyFee}>+35.000đ</Text>
              </View>
            ))
          )}
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
    height: 52,
    backgroundColor: COLORS.headerBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: COLORS.surface,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
  },
  walletCard: {
    backgroundColor: COLORS.headerBgLight,
    borderRadius: 20,
    padding: 20,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  walletHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  walletIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletTitle: {
    color: 'rgba(255, 255, 255, 0.65)',
    fontSize: 10,
    fontWeight: '800',
    marginLeft: 8,
    letterSpacing: 0.5,
  },
  walletAmount: {
    color: COLORS.accent,
    fontSize: 34,
    fontWeight: '950',
    marginVertical: 4,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: 12,
  },
  walletSub: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 14,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  statBox: {
    flex: 1,
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  statIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  statVal: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.textPrimary,
    marginTop: 4,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
    fontWeight: '600',
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '850',
    color: COLORS.textPrimary,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
    paddingBottom: 6,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
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
  emptyText: {
    textAlign: 'center',
    color: COLORS.textMuted,
    paddingVertical: 20,
    fontSize: 12,
  },
});
