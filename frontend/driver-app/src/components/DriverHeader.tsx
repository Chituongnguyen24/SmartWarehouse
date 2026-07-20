import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, SafeAreaView, Platform, StatusBar } from 'react-native';
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
              <Truck size={22} color={COLORS.primary} />
            </View>
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.driverName}>{driverProfile.name}</Text>
                <View style={styles.plateBadge}>
                  <Text style={styles.plateText}>{driverProfile.licensePlate}</Text>
                </View>
              </View>
              <Text style={styles.vehicleType}>{driverProfile.vehicleType}</Text>
            </View>
          </View>

          {/* Online Toggle Switch */}
          <TouchableOpacity
            style={[styles.onlineBtn, driverProfile.isOnline ? styles.onlineBtnActive : styles.onlineBtnOffline]}
            onPress={toggleOnline}
            activeOpacity={0.8}
          >
            <Power size={14} color={driverProfile.isOnline ? COLORS.surface : COLORS.textMuted} />
            <Text style={[styles.onlineText, driverProfile.isOnline ? styles.onlineTextActive : styles.onlineTextOffline]}>
              {driverProfile.isOnline ? 'ONLINE' : 'OFFLINE'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Cold-Chain IoT Sensor Status Bar */}
        <View style={[styles.sensorBar, isTempNormal ? styles.sensorNormal : styles.sensorAlert]}>
          <View style={styles.sensorLeft}>
            <Thermometer size={18} color={isTempNormal ? COLORS.primary : COLORS.danger} />
            <Text style={styles.sensorTitle}>Nhiệt độ thùng xe (IoT BLE):</Text>
            <Text style={[styles.tempValue, { color: isTempNormal ? COLORS.primary : COLORS.danger }]}>
              {driverProfile.currentTemp.toFixed(1)}°C
            </Text>
          </View>

          <View style={styles.sensorRight}>
            {isTempNormal ? (
              <View style={styles.statusNormalBadge}>
                <ShieldCheck size={12} color={COLORS.primary} />
                <Text style={styles.statusNormalText}>Đạt Chuẩn 0-4°C</Text>
              </View>
            ) : (
              <View style={styles.statusAlertBadge}>
                <AlertTriangle size={12} color={COLORS.surface} />
                <Text style={styles.statusAlertText}>CẢNH BÁO TĂNG NHIỆT</Text>
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
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.headerBgLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  driverName: {
    color: COLORS.surface,
    fontSize: 15,
    fontWeight: '800',
    marginRight: 6,
  },
  plateBadge: {
    backgroundColor: COLORS.routeBlue,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  plateText: {
    color: COLORS.surface,
    fontSize: 10,
    fontWeight: '800',
  },
  vehicleType: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  onlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  onlineBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primaryDark,
  },
  onlineBtnOffline: {
    backgroundColor: COLORS.headerBgLight,
    borderColor: COLORS.borderDark,
  },
  onlineText: {
    fontSize: 11,
    fontWeight: '900',
    marginLeft: 4,
  },
  onlineTextActive: {
    color: COLORS.surface,
  },
  onlineTextOffline: {
    color: COLORS.textMuted,
  },
  sensorBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 6,
    borderWidth: 1,
  },
  sensorNormal: {
    backgroundColor: 'rgba(0, 136, 72, 0.15)',
    borderColor: 'rgba(0, 136, 72, 0.4)',
  },
  sensorAlert: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  sensorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sensorTitle: {
    color: COLORS.surface,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  tempValue: {
    fontSize: 14,
    fontWeight: '900',
    marginLeft: 6,
  },
  sensorRight: {},
  statusNormalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
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
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusAlertText: {
    color: COLORS.surface,
    fontSize: 10,
    fontWeight: '800',
    marginLeft: 3,
  },
});
