import React, { useState } from 'react';
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
import { Thermometer, ShieldCheck, AlertTriangle, RefreshCw, Cpu, Fan } from 'lucide-react-native';

export const ColdChainScreen: React.FC = () => {
  const { driverProfile, updateContainerTemp } = useDriverTask();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const isTempGood = driverProfile.currentTemp <= driverProfile.targetTempMax;

  const handleSimulateTemp = (newTemp: number) => {
    updateContainerTemp(newTemp);
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Giám Sát Nhiệt Độ Thùng Xe (IoT Cold-Chain)</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Sensor Main Gauge Card */}
        <View style={[styles.gaugeCard, isTempGood ? styles.gaugeGood : styles.gaugeWarning]}>
          <View style={styles.gaugeHeader}>
            <Cpu size={18} color={isTempGood ? COLORS.primary : COLORS.danger} />
            <Text style={styles.gaugeSensorId}>Cảm biến BLE Sensor #TH-8891</Text>
          </View>

          <View style={styles.tempDisplayRow}>
            <Thermometer size={48} color={isTempGood ? COLORS.primary : COLORS.danger} />
            <Text style={[styles.tempNumber, { color: isTempGood ? COLORS.primary : COLORS.danger }]}>
              {driverProfile.currentTemp.toFixed(1)}°C
            </Text>
          </View>

          <View style={styles.statusBadgeRow}>
            {isTempGood ? (
              <View style={styles.goodBadge}>
                <ShieldCheck size={14} color={COLORS.surface} />
                <Text style={styles.goodBadgeText}>ĐẠT CHUẨN KHO LẠNH (0 - 4°C)</Text>
              </View>
            ) : (
              <View style={styles.alertBadge}>
                <AlertTriangle size={14} color={COLORS.surface} />
                <Text style={styles.alertBadgeText}>CẢNH BÁO: KHO LẠNH VƯỢT QUÁ 4°C</Text>
              </View>
            )}
          </View>
        </View>

        {/* Cooler Unit Status Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Trạng thái Hệ thống Làm lạnh Thùng Xe</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Loại thùng xe bảo quản:</Text>
            <Text style={styles.infoVal}>{driverProfile.vehicleType}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Máy nén làm lạnh (Compressor):</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Fan size={14} color={COLORS.primary} style={{ marginRight: 4 }} />
              <Text style={[styles.infoVal, { color: COLORS.primary }]}>Đang hoạt động (Auto)</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Ngưỡng an toàn thực phẩm:</Text>
            <Text style={styles.infoVal}>{driverProfile.targetTempMin}°C đến {driverProfile.targetTempMax}°C</Text>
          </View>
        </View>

        {/* Test Temperature Simulator Control */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Mô phỏng cảm biến IoT (Dành cho thử nghiệm)</Text>
          <Text style={styles.simSubText}>Bấm nút để mô phỏng sự thay đổi nhiệt độ cảm biến thùng xe:</Text>

          <View style={styles.simBtnGroup}>
            <TouchableOpacity
              style={[styles.simBtn, { backgroundColor: COLORS.successLight }]}
              onPress={() => handleSimulateTemp(2.2)}
            >
              <Text style={{ fontWeight: '800', color: COLORS.primary }}>2.2°C (Mát chuẩn)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.simBtn, { backgroundColor: COLORS.warningLight }]}
              onPress={() => handleSimulateTemp(4.5)}
            >
              <Text style={{ fontWeight: '800', color: COLORS.warning }}>4.5°C (Chớm tăng)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.simBtn, { backgroundColor: COLORS.dangerLight }]}
              onPress={() => handleSimulateTemp(6.8)}
            >
              <Text style={{ fontWeight: '800', color: COLORS.danger }}>6.8°C (Cảnh báo nóng)</Text>
            </TouchableOpacity>
          </View>
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
  gaugeCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 18,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 2,
  },
  gaugeGood: {
    borderColor: COLORS.primary,
  },
  gaugeWarning: {
    borderColor: COLORS.danger,
  },
  gaugeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  gaugeSensorId: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginLeft: 6,
  },
  tempDisplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
  },
  tempNumber: {
    fontSize: 44,
    fontWeight: '900',
    marginLeft: 10,
  },
  statusBadgeRow: {
    marginTop: 10,
  },
  goodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  goodBadgeText: {
    color: COLORS.surface,
    fontSize: 11,
    fontWeight: '900',
    marginLeft: 4,
  },
  alertBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.danger,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  alertBadgeText: {
    color: COLORS.surface,
    fontSize: 11,
    fontWeight: '900',
    marginLeft: 4,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  infoLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  infoVal: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  simSubText: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginBottom: 10,
  },
  simBtnGroup: {
    gap: 8,
  },
  simBtn: {
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
});
