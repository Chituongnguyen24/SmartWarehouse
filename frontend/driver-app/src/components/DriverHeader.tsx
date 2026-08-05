import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Platform, StatusBar } from 'react-native';
import { useDriverTask } from '../context/DriverTaskContext';
import { COLORS } from '../theme/colors';
import { Truck, Thermometer, ShieldCheck, AlertTriangle, Power } from 'lucide-react-native';

export const DriverHeader: React.FC = () => {
  const { driverProfile, toggleOnline } = useDriverTask();

  const isTempNormal = driverProfile.currentTemp <= driverProfile.targetTempMax;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Top Profile & Online Toggle */}
        <View style={styles.topRow}>
          <View style={styles.driverInfo}>
            <View style={styles.avatarCircle}>
              <Truck size={24} color={COLORS.primary} />
            </View>
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.driverName}>{driverProfile.name}</Text>
                <View style={styles.plateBadge}>
                  <Text style={styles.plateText}>{driverProfile.licensePlate}</Text>
                </View>
              </View>
              <Text style={styles.vehicleType}>🚚 {driverProfile.vehicleType}</Text>
            </View>
          </View>

          {/* Online Toggle Switch with Glow effect */}
          <TouchableOpacity
            style={[
              styles.onlineBtn,
              driverProfile.isOnline ? styles.onlineBtnActive : styles.onlineBtnOffline,
              driverProfile.isOnline && styles.activeGlow
            ]}
            onPress={toggleOnline}
            activeOpacity={0.85}
          >
            <Power size={13} color={COLORS.surface} style={{ marginRight: 4 }} />
            <Text style={styles.onlineText}>
              {driverProfile.isOnline ? 'ONLINE' : 'OFFLINE'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Cold-Chain IoT Sensor Status Bar */}
        <View style={[styles.sensorBar, isTempNormal ? styles.sensorNormal : styles.sensorAlert]}>
          <View style={styles.sensorLeft}>
            <View style={[styles.iconContainer, { backgroundColor: isTempNormal ? 'rgba(0, 136, 72, 0.2)' : 'rgba(239, 68, 68, 0.2)' }]}>
              <Thermometer size={18} color={isTempNormal ? COLORS.primary : COLORS.danger} />
            </View>
            <View style={{ marginLeft: 8 }}>
              <Text style={styles.sensorTitle}>Nhiệt độ thùng xe (IoT BLE)</Text>
              <Text style={[styles.tempValue, { color: isTempNormal ? COLORS.primary : COLORS.danger }]}>
                {driverProfile.currentTemp.toFixed(1)}°C
              </Text>
            </View>
          </View>

          <View style={styles.sensorRight}>
            {isTempNormal ? (
              <View style={styles.statusNormalBadge}>
                <ShieldCheck size={12} color={COLORS.surface} />
                <Text style={styles.statusNormalText}>An Toàn (0-4°C)</Text>
              </View>
            ) : (
              <View style={styles.statusAlertBadge}>
                <AlertTriangle size={12} color={COLORS.surface} />
                <Text style={styles.statusAlertText}>VƯỢT NGƯỠNG AN TOÀN</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: COLORS.headerBg,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    backgroundColor: COLORS.headerBg,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  driverName: {
    color: COLORS.surface,
    fontSize: 16,
    fontWeight: '900',
    marginRight: 8,
  },
  plateBadge: {
    backgroundColor: COLORS.routeBlue,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  plateText: {
    color: COLORS.surface,
    fontSize: 10,
    fontWeight: '800',
  },
  vehicleType: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 3,
  },
  onlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  onlineBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primaryDark,
  },
  onlineBtnOffline: {
    backgroundColor: '#334155',
    borderColor: '#475569',
  },
  activeGlow: {
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 4,
  },
  onlineText: {
    fontSize: 11,
    fontWeight: '900',
    color: COLORS.surface,
  },
  sensorBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    marginTop: 10,
    borderWidth: 1,
  },
  sensorNormal: {
    backgroundColor: 'rgba(0, 136, 72, 0.12)',
    borderColor: 'rgba(0, 136, 72, 0.3)',
  },
  sensorAlert: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  sensorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sensorTitle: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  tempValue: {
    fontSize: 16,
    fontWeight: '900',
    marginTop: 1,
  },
  sensorRight: {},
  statusNormalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusNormalText: {
    color: COLORS.surface,
    fontSize: 10,
    fontWeight: '800',
    marginLeft: 3,
  },
  statusAlertBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.danger,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    shadowColor: COLORS.danger,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 3,
  },
  statusAlertText: {
    color: COLORS.surface,
    fontSize: 9,
    fontWeight: '900',
    marginLeft: 3,
  },
});
