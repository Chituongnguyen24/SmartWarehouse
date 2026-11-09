import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, initialWindowMetrics, useSafeAreaInsets } from 'react-native-safe-area-context';
import { DriverTaskProvider, useDriverTask } from './src/context/DriverTaskContext';
import { HomeScreen } from './src/screens/HomeScreen';
import { TaskDetailScreen } from './src/screens/TaskDetailScreen';
import { ProofOfDeliveryScreen } from './src/screens/ProofOfDeliveryScreen';
import { ColdChainScreen } from './src/screens/ColdChainScreen';
import { EarningsScreen } from './src/screens/EarningsScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { COLORS } from './src/theme/colors';
import { DeliveryTask } from './src/types/driver';
import { Navigation, Thermometer, Receipt } from 'lucide-react-native';

type ActiveTab = 'ROUTE' | 'COLD_CHAIN' | 'EARNINGS';

const DriverMainAppContent: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [currentTab, setCurrentTab] = useState<ActiveTab>('ROUTE');
  const [selectedTask, setSelectedTask] = useState<DeliveryTask | null>(null);
  const [inPOD, setInPOD] = useState(false);

  const { inTransitTasks, assignedTasks } = useDriverTask();
  const totalActiveTasks = inTransitTasks.length + assignedTasks.length;

  // Dynamic safe area bottom padding to protect tab bar from 3-button or gesture nav bar
  const bottomNavPadding = insets.bottom > 0 ? insets.bottom + 2 : (Platform.OS === 'android' ? 16 : 8);

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
        <View style={[styles.bottomNavContainer, { paddingBottom: bottomNavPadding }]}>
          <View style={styles.tabBar}>
            <TouchableOpacity
              style={styles.tabItem}
              onPress={() => setCurrentTab('ROUTE')}
              activeOpacity={0.8}
            >
              <View style={[styles.iconWrapper, currentTab === 'ROUTE' && styles.iconWrapperActive]}>
                <Navigation
                  size={20}
                  color={currentTab === 'ROUTE' ? '#38bdf8' : '#94a3b8'}
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
                  color={currentTab === 'COLD_CHAIN' ? '#38bdf8' : '#94a3b8'}
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
                  color={currentTab === 'EARNINGS' ? '#38bdf8' : '#94a3b8'}
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
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <DriverTaskProvider>
        <DriverAppRoot />
      </DriverTaskProvider>
    </SafeAreaProvider>
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
    borderColor: '#1e293b',
    flexShrink: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 8,
  },
  tabBar: {
    flexDirection: 'row',
    height: 52,
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: 'transparent',
    paddingTop: 4,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  iconWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 3,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  iconWrapperActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
  },
  tabLabel: {
    fontSize: 10.5,
    fontWeight: '500',
    color: '#94a3b8',
    letterSpacing: 0.2,
  },
  tabLabelActive: {
    color: '#38bdf8',
    fontWeight: '700',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -6,
    backgroundColor: '#ef4444',
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '700',
  },
});
