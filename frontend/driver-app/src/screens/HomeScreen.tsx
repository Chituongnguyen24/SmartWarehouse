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
import { Map, Navigation, CheckCircle2, Clock, Zap, MapPin } from 'lucide-react-native';

interface HomeScreenProps {
  onSelectTask: (task: DeliveryTask) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onSelectTask }) => {
  const { tasks, assignedTasks, inTransitTasks, deliveredTasks, driverProfile } = useDriverTask();
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
            <Navigation size={18} color={COLORS.routeBlue} />
            <Text style={styles.vrpTitleText}>Tuyến Đường Tối Ưu VRP</Text>
          </View>
          <View style={styles.vrpBadge}>
            <Text style={styles.vrpBadgeText}>Tiết kiệm 3.2 km</Text>
          </View>
        </View>

        <Text style={styles.vrpSubText}>
          Xuất phát từ **Kho FreshKeep Q.5** ➔ {inTransitTasks.length + assignedTasks.length} điểm giao tận nhà
        </Text>
      </View>

      {/* TABS */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'ACTIVE' && styles.tabBtnActive]}
          onPress={() => setActiveTab('ACTIVE')}
        >
          <Text style={[styles.tabText, activeTab === 'ACTIVE' && styles.tabTextActive]}>
            Đang Giao ({inTransitTasks.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'PENDING' && styles.tabBtnActive]}
          onPress={() => setActiveTab('PENDING')}
        >
          <Text style={[styles.tabText, activeTab === 'PENDING' && styles.tabTextActive]}>
            Chờ Nhận ({assignedTasks.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'DONE' && styles.tabBtnActive]}
          onPress={() => setActiveTab('DONE')}
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
    backgroundColor: COLORS.surface,
    marginHorizontal: 12,
    marginTop: 10,
    marginBottom: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.2)',
  },
  vrpTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  vrpTitleText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginLeft: 6,
  },
  vrpBadge: {
    backgroundColor: COLORS.routeBlueLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  vrpBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.routeBlue,
  },
  vrpSubText: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabBtnActive: {
    borderBottomWidth: 3,
    borderColor: COLORS.routeBlue,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  tabTextActive: {
    color: COLORS.routeBlue,
    fontWeight: '800',
  },
  scrollContent: {
    padding: 12,
    paddingBottom: 24,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
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
  },
});
