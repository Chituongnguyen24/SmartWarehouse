import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, SafeAreaView, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { LoginScreen } from './src/screens/LoginScreen';
import { ShiftHomeScreen } from './src/screens/ShiftHomeScreen';
import { PickingScreen } from './src/screens/PickingScreen';
import { InboundScreen } from './src/screens/InboundScreen';
import { PackingScreen } from './src/screens/PackingScreen';
import { StockLookupScreen } from './src/screens/StockLookupScreen';
import { COLORS } from './src/theme/colors';
import {
  LayoutDashboard,
  Boxes,
  Download,
  PackageCheck,
  ClipboardList,
} from 'lucide-react-native';

export type TabType = 'HOME' | 'PICKING' | 'INBOUND' | 'PACKING' | 'LOOKUP';

function MainApp() {
  const { isAuthenticated } = useAuth();
  const [currentTab, setCurrentTab] = useState<TabType>('HOME');

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return (
    <SafeAreaView style={styles.outerContainer}>
      <StatusBar style="dark" backgroundColor="#f8fafc" />
      <View style={styles.container}>
        {/* Main Screen Body */}
        <View style={styles.screenContainer}>
          {currentTab === 'HOME' && <ShiftHomeScreen onNavigate={setCurrentTab} />}
          {currentTab === 'PICKING' && <PickingScreen />}
          {currentTab === 'INBOUND' && <InboundScreen />}
          {currentTab === 'PACKING' && <PackingScreen />}
          {currentTab === 'LOOKUP' && <StockLookupScreen />}
        </View>

        {/* Modern Mobile Bottom Navigation */}
        <View style={styles.bottomNav}>
          {/* Tab 1: Tổng Quan */}
          <TouchableOpacity
            style={[styles.navItem, currentTab === 'HOME' && styles.navItemActive]}
            onPress={() => setCurrentTab('HOME')}
            activeOpacity={0.7}
          >
            <LayoutDashboard
              size={20}
              color={currentTab === 'HOME' ? '#059669' : '#64748b'}
            />
            <Text style={[styles.navLabel, currentTab === 'HOME' && styles.navLabelActive]}>
              Tổng Quan
            </Text>
          </TouchableOpacity>

          {/* Tab 2: Soạn Hàng FEFO */}
          <TouchableOpacity
            style={[styles.navItem, currentTab === 'PICKING' && styles.navItemActive]}
            onPress={() => setCurrentTab('PICKING')}
            activeOpacity={0.7}
          >
            <View style={{ position: 'relative' }}>
              <Boxes
                size={20}
                color={currentTab === 'PICKING' ? '#059669' : '#64748b'}
              />
              <View style={styles.badgePill}>
                <Text style={styles.badgePillText}>FEFO</Text>
              </View>
            </View>
            <Text style={[styles.navLabel, currentTab === 'PICKING' && styles.navLabelActive]}>
              Soạn Hàng
            </Text>
          </TouchableOpacity>

          {/* Tab 3: Nhập Kho QC */}
          <TouchableOpacity
            style={[styles.navItem, currentTab === 'INBOUND' && styles.navItemActive]}
            onPress={() => setCurrentTab('INBOUND')}
            activeOpacity={0.7}
          >
            <View style={{ position: 'relative' }}>
              <Download
                size={20}
                color={currentTab === 'INBOUND' ? '#059669' : '#64748b'}
              />
              <View style={[styles.badgePill, { backgroundColor: '#d97706' }]}>
                <Text style={styles.badgePillText}>QC</Text>
              </View>
            </View>
            <Text style={[styles.navLabel, currentTab === 'INBOUND' && styles.navLabelActive]}>
              Nhập Kho
            </Text>
          </TouchableOpacity>

          {/* Tab 4: Đóng Gói */}
          <TouchableOpacity
            style={[styles.navItem, currentTab === 'PACKING' && styles.navItemActive]}
            onPress={() => setCurrentTab('PACKING')}
            activeOpacity={0.7}
          >
            <PackageCheck
              size={20}
              color={currentTab === 'PACKING' ? '#059669' : '#64748b'}
            />
            <Text style={[styles.navLabel, currentTab === 'PACKING' && styles.navLabelActive]}>
              Đóng Gói
            </Text>
          </TouchableOpacity>

          {/* Tab 5: Kiểm Kê Tồn Kho */}
          <TouchableOpacity
            style={[styles.navItem, currentTab === 'LOOKUP' && styles.navItemActive]}
            onPress={() => setCurrentTab('LOOKUP')}
            activeOpacity={0.7}
          >
            <ClipboardList
              size={20}
              color={currentTab === 'LOOKUP' ? '#059669' : '#64748b'}
            />
            <Text style={[styles.navLabel, currentTab === 'LOOKUP' && styles.navLabelActive]}>
              Kiểm Kê
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  container: {
    flex: 1,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
    backgroundColor: '#f8fafc',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
  },
  screenContainer: {
    flex: 1,
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 14,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 10,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  navItemActive: {
    backgroundColor: '#ecfdf5',
  },
  navLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
  },
  navLabelActive: {
    color: '#059669',
    fontWeight: '900',
  },
  badgePill: {
    position: 'absolute',
    top: -5,
    right: -10,
    backgroundColor: '#ef4444',
    borderRadius: 999,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  badgePillText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#ffffff',
  },
});
