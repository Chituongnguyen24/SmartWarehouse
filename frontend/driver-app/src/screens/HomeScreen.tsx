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
import { Navigation, CheckCircle2 } from 'lucide-react-native';

interface HomeScreenProps {
  onSelectTask: (task: DeliveryTask) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onSelectTask }) => {
  const { tasks, assignedTasks, inTransitTasks, deliveredTasks } = useDriverTask();
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'PENDING' | 'DONE'>('ACTIVE');

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
    return tasks;
  };

  const currentTasks = getFilteredTasks();

  return (
    <View style={styles.container}>
      <DriverHeader />

      {/* VRP OPTIMIZED ROUTE BANNER */}
      <View style={styles.vrpBanner}>
        <View style={styles.vrpTitleRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={styles.vrpIconBox}>
              <Navigation size={16} color={COLORS.routeBlue} />
            </View>
            <Text style={styles.vrpTitleText}>Tuyến Đường Tối Ưu VRP</Text>
          </View>
          <View style={styles.vrpBadge}>
            <Text style={styles.vrpBadgeText}>Tiết kiệm 3.2 km</Text>
          </View>
        </View>

        <Text style={styles.vrpSubText}>
          Xuất phát từ <Text style={styles.boldText}>Kho CityMart Q.5</Text> ➔ Phân bổ <Text style={styles.boldText}>{inTransitTasks.length + assignedTasks.length} điểm dừng</Text>
        </Text>
      </View>

      {/* TABS (PILL STYLE) */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'ACTIVE' && styles.tabBtnActive]}
          onPress={() => setActiveTab('ACTIVE')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === 'ACTIVE' && styles.tabTextActive]}>
            Đang Giao ({inTransitTasks.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'PENDING' && styles.tabBtnActive]}
          onPress={() => setActiveTab('PENDING')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === 'PENDING' && styles.tabTextActive]}>
            Chờ Nhận ({assignedTasks.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'DONE' && styles.tabBtnActive]}
          onPress={() => setActiveTab('DONE')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === 'DONE' && styles.tabTextActive]}>
            Đã Giao ({deliveredTasks.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* TASK LIST */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {currentTasks.length === 0 ? (
          <View style={styles.emptyContainer}>
            <CheckCircle2 size={48} color={COLORS.textMuted} />
            <Text style={styles.emptyTitle}>Không có đơn hàng nào</Text>
            <Text style={styles.emptySub}>Danh sách đơn trong danh mục này đang trống.</Text>
          </View>
        ) : (
          currentTasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              onPress={() => onSelectTask(task)}
              onCallCustomer={() => handleCallCustomer(task.customerPhone, task.customerName)}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  vrpBanner: {
    backgroundColor: COLORS.routeBlueLight,
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 10,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.15)',
    shadowColor: COLORS.routeBlue,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  vrpIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(37, 99, 235, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vrpTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  vrpTitleText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.routeBlue,
    marginLeft: 8,
  },
  vrpBadge: {
    backgroundColor: COLORS.routeBlue,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  vrpBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.surface,
  },
  vrpSubText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  boldText: {
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(226, 232, 240, 0.4)',
    marginHorizontal: 16,
    padding: 4,
    borderRadius: 12,
    marginBottom: 6,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabBtnActive: {
    backgroundColor: COLORS.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: COLORS.primary,
    fontWeight: '800',
  },
  scrollContent: {
    padding: 16,
    paddingTop: 8,
    paddingBottom: 24,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
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
