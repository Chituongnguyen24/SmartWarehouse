import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDriverTask } from '@/features/delivery';
import { Truck, Thermometer, AlertTriangle, Power, LogOut } from 'lucide-react-native';

export const DriverHeader: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { driverProfile, toggleOnline, logout } = useDriverTask();

  const isTempNormal = driverProfile.currentTemp <= driverProfile.targetTempMax;
  const topPadding = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 20) : 0);

  return (
    <View style={[styles.safeArea, { paddingTop: topPadding }]}>
      <View style={styles.compactBar}>
        {/* Left: Driver Profile (Full Name Display, No Account Switch) */}
        <View style={styles.driverInfo}>
          <View style={styles.avatarWrapper}>
            <View style={styles.avatarCircle}>
              <Truck size={17} color="#38bdf8" />
            </View>
            <View style={[styles.statusDot, driverProfile.isOnline ? styles.dotOnline : styles.dotOffline]} />
          </View>

          <View style={styles.driverTextCol}>
            {/* Full Driver Name without truncation */}
            <Text style={styles.driverName}>
              {driverProfile.name}
            </Text>

            {/* Vehicle, License Plate & Warehouse */}
            <View style={styles.subRow}>
              <View style={styles.plateBadge}>
                <Text style={styles.plateText}>{driverProfile.licensePlate}</Text>
              </View>
              <Text style={styles.vehicleType} numberOfLines={1}>
                {driverProfile.vehicleType} • {driverProfile.warehouseCode || 'WH-006'}
              </Text>
            </View>
          </View>
        </View>

        {/* Right Action Group: Telemetry Pill + Online Toggle + Logout */}
        <View style={styles.rightActionsRow}>
          {/* Telemetry Pill: Compact 0-4°C sensor monitor */}
          <View style={[styles.telemetryPill, isTempNormal ? styles.telemetryNormal : styles.telemetryAlert]}>
            {isTempNormal ? (
              <Thermometer size={12} color="#10b981" style={{ marginRight: 3 }} />
            ) : (
              <AlertTriangle size={12} color="#ef4444" style={{ marginRight: 3 }} />
            )}
            <Text style={[styles.telemetryVal, isTempNormal ? { color: '#10b981' } : { color: '#ef4444' }]}>
              {driverProfile.currentTemp.toFixed(1)}°C
            </Text>
          </View>

          {/* Online Toggle */}
          <TouchableOpacity
            style={[
              styles.onlineBtn,
              driverProfile.isOnline ? styles.onlineBtnActive : styles.onlineBtnOffline,
            ]}
            onPress={toggleOnline}
            activeOpacity={0.85}
          >
            <Power size={11} color="#ffffff" style={{ marginRight: 3 }} />
            <Text style={styles.onlineText}>
              {driverProfile.isOnline ? 'ON' : 'OFF'}
            </Text>
          </TouchableOpacity>

          {/* Logout Button (Dùng khi muốn đổi sang tài khoản tài xế khác) */}
          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={logout}
            activeOpacity={0.7}
            accessibilityLabel="Đăng xuất tài khoản"
          >
            <LogOut size={14} color="#f87171" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Temperature Alert Banner (Only appears if temperature exceeds safe threshold > 4°C) */}
      {!isTempNormal && (
        <View style={styles.tempAlertStrip}>
          <AlertTriangle size={12} color="#ffffff" style={{ marginRight: 5 }} />
          <Text style={styles.tempAlertStripText}>
            CẢNH BÁO: Thùng xe {driverProfile.currentTemp.toFixed(1)}°C vượt ngưỡng an toàn (0-4°C)!
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#0f172a',
    flexShrink: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  compactBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 52,
  },
  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
    marginRight: 8,
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: 8,
  },
  avatarCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusDot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    borderWidth: 1.5,
    borderColor: '#0f172a',
  },
  dotOnline: {
    backgroundColor: '#10b981',
  },
  dotOffline: {
    backgroundColor: '#64748b',
  },
  driverTextCol: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  driverName: {
    color: '#ffffff',
    fontSize: 13.5,
    fontWeight: '700',
    lineHeight: 18,
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  plateBadge: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#334155',
  },
  plateText: {
    color: '#38bdf8',
    fontSize: 9.5,
    fontWeight: '700',
  },
  vehicleType: {
    color: '#94a3b8',
    fontSize: 10.5,
    flexShrink: 1,
  },

  // ── Right Action Controls ──
  rightActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  telemetryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  telemetryNormal: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  telemetryAlert: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  telemetryVal: {
    fontSize: 11,
    fontWeight: '700',
  },
  onlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  onlineBtnActive: {
    backgroundColor: '#059669',
  },
  onlineBtnOffline: {
    backgroundColor: '#334155',
  },
  onlineText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#ffffff',
  },
  logoutBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── High-Priority Temperature Warning Strip ──
  tempAlertStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#dc2626',
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  tempAlertStripText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
});
