import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, SafeAreaView, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { DriverTaskProvider, useDriverTask } from './src/context/DriverTaskContext';
import { HomeScreen } from './src/screens/HomeScreen';
import { TaskDetailScreen } from './src/screens/TaskDetailScreen';
import { ProofOfDeliveryScreen } from './src/screens/ProofOfDeliveryScreen';
import { ColdChainScreen } from './src/screens/ColdChainScreen';
import { EarningsScreen } from './src/screens/EarningsScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { COLORS } from './src/theme/colors';
import { DeliveryTask } from './src/types/driver';
import { Navigation, Thermometer, Wallet, Receipt } from 'lucide-react-native';

type ActiveTab = 'ROUTE' | 'COLD_CHAIN' | 'EARNINGS';

const DriverMainAppContent: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<ActiveTab>('ROUTE');
  const [selectedTask, setSelectedTask] = useState<DeliveryTask | null>(null);
  const [inPOD, setInPOD] = useState(false);

  const { inTransitTasks, assignedTasks } = useDriverTask();
  const totalActiveTasks = inTransitTasks.length + assignedTasks.length;

  return (
    <View style={styles.container}>
      <StatusBar style="light" backgroundColor={COLORS.headerBg} />

      {/* Main Screen Body */}
      <View style={styles.screenContainer}>
        {inPOD && selectedTask ? (
          <ProofOfDeliveryScreen
            task={selectedTask}
            onBack={() => setInPOD(false)}
            onSuccess={() => {
              setInPOD(false);
              setSelectedTask(null);
              setCurrentTab('ROUTE');
            }}
          />
        ) : selectedTask ? (
          <TaskDetailScreen
            task={selectedTask}
            onBack={() => setSelectedTask(null)}
            onOpenPOD={() => setInPOD(true)}
          />
        ) : (
          <>
            {currentTab === 'ROUTE' && (
              <HomeScreen onSelectTask={(task) => setSelectedTask(task)} />
            )}
            {currentTab === 'COLD_CHAIN' && <ColdChainScreen />}
            {currentTab === 'EARNINGS' && <EarningsScreen />}
          </>
        )}
      </View>

      {/* Bottom Nav Bar (Only when not in detail/POD view) */}
      {!selectedTask && !inPOD && (
        <View style={styles.bottomNavContainer}>
          <View style={styles.tabBar}>
            <TouchableOpacity
              style={styles.tabItem}
              onPress={() => setCurrentTab('ROUTE')}
              activeOpacity={0.8}
            >
              <View style={[styles.iconWrapper, currentTab === 'ROUTE' && styles.iconWrapperActive]}>
                <Navigation
                  size={20}
                  color={currentTab === 'ROUTE' ? COLORS.primary : COLORS.textMuted}
                />
                {totalActiveTasks > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{totalActiveTasks}</Text>
                  </View>
                )}
              </View>
              <Text
                style={[
                  styles.tabLabel,
                  currentTab === 'ROUTE' && styles.tabLabelActive,
                ]}
              >
                Lộ trình giao
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.tabItem}
              onPress={() => setCurrentTab('COLD_CHAIN')}
              activeOpacity={0.8}
            >
              <View style={[styles.iconWrapper, currentTab === 'COLD_CHAIN' && styles.iconWrapperActive]}>
                <Thermometer
                  size={20}
                  color={currentTab === 'COLD_CHAIN' ? COLORS.primary : COLORS.textMuted}
                />
              </View>
              <Text
                style={[
                  styles.tabLabel,
                  currentTab === 'COLD_CHAIN' && styles.tabLabelActive,
                ]}
              >
                Kho lạnh IoT
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.tabItem}
              onPress={() => setCurrentTab('EARNINGS')}
              activeOpacity={0.8}
            >
              <View style={[styles.iconWrapper, currentTab === 'EARNINGS' && styles.iconWrapperActive]}>
                <Receipt
                  size={20}
                  color={currentTab === 'EARNINGS' ? COLORS.primary : COLORS.textMuted}
                />
              </View>
              <Text
                style={[
                  styles.tabLabel,
                  currentTab === 'EARNINGS' && styles.tabLabelActive,
                ]}
              >
                Đối soát & COD
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

const DriverAppRoot: React.FC = () => {
  const { isAuthenticated } = useDriverTask();

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return <DriverMainAppContent />;
};

export default function App() {
  return (
    <DriverTaskProvider>
      <DriverAppRoot />
    </DriverTaskProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  screenContainer: {
    flex: 1,
  },
  bottomNavContainer: {
    backgroundColor: COLORS.headerBg,
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    flexShrink: 0,
    paddingBottom: Platform.OS === 'android' ? 26 : 8,
  },
  tabBar: {
    flexDirection: 'row',
    height: 56,
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: COLORS.headerBg,
    paddingBottom: 0,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  iconWrapperActive: {
    backgroundColor: 'rgba(0, 136, 72, 0.15)',
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  tabLabelActive: {
    color: COLORS.primary,
    fontWeight: '800',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: COLORS.danger,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: COLORS.surface,
    fontSize: 9,
    fontWeight: '800',
  },
});
