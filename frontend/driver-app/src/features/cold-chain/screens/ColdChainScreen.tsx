import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDriverTask } from '@/features/delivery';
import { COLORS } from '@/shared';
import {
  Thermometer,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Cpu,
  Fan,
  Clock,
  CheckCircle2,
  FileText,
} from 'lucide-react-native';

export const ColdChainScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { driverProfile, updateContainerTemp } = useDriverTask();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const isTempGood = driverProfile.currentTemp <= driverProfile.targetTempMax;
  const topPadding = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0);

  // Operational temperature readings log
  const temperatureLogs = [
    { time: '10 phút trước', temp: (driverProfile.currentTemp - 0.1).toFixed(1), status: 'Đạt chuẩn' },
    { time: '25 phút trước', temp: (driverProfile.currentTemp + 0.1).toFixed(1), status: 'Đạt chuẩn' },
    { time: '40 phút trước', temp: driverProfile.currentTemp.toFixed(1), status: 'Đạt chuẩn' },
    { time: '55 phút trước', temp: (driverProfile.currentTemp - 0.2).toFixed(1), status: 'Đạt chuẩn' },
  ];

  const handleSyncSensor = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 800);
  };

  return (
    <View style={styles.safeContainer}>
      <View style={[styles.header, { paddingTop: topPadding, height: topPadding + 52 }]}>
        <Text style={styles.headerTitle}>Kiểm Soát Nhiệt Độ Thùng Xe</Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Main Temperature Gauge Card */}
        <View style={[styles.gaugeCard, isTempGood ? styles.gaugeGood : styles.gaugeWarning]}>
          <View style={styles.gaugeHeader}>
            <Cpu size={16} color={isTempGood ? '#0f766e' : '#dc2626'} />
            <Text style={styles.gaugeSensorId}>Đầu dò nhiệt độ thùng lạnh #{driverProfile.licensePlate || '59-S2'}</Text>
          </View>

          <View style={styles.tempDisplayRow}>
            <Thermometer size={44} color={isTempGood ? '#0f766e' : '#dc2626'} />
            <Text style={[styles.tempNumber, { color: isTempGood ? '#0f766e' : '#dc2626' }]}>
              {driverProfile.currentTemp.toFixed(1)}°C
            </Text>
          </View>

          <View style={styles.statusBadgeRow}>
            {isTempGood ? (
              <View style={styles.goodBadge}>
                <ShieldCheck size={14} color="#166534" style={{ marginRight: 5 }} />
                <Text style={styles.goodBadgeText}>ĐẠT CHUẨN KHO LẠNH ({driverProfile.targetTempMin} - {driverProfile.targetTempMax}°C)</Text>
              </View>
            ) : (
              <View style={styles.alertBadge}>
                <AlertTriangle size={14} color="#991b1b" style={{ marginRight: 5 }} />
                <Text style={styles.alertBadgeText}>CẢNH BÁO: VƯỢT QUÁ {driverProfile.targetTempMax}°C</Text>
              </View>
            )}
          </View>
        </View>

        {/* Cooler Unit Status Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Trạng thái Hệ thống Làm lạnh</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Loại thùng xe bảo quản:</Text>
            <Text style={styles.infoVal}>{driverProfile.vehicleType || 'Thùng giữ nhiệt lạnh'}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Máy nén làm lạnh:</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Fan size={13} color="#0f766e" style={{ marginRight: 4 }} />
              <Text style={[styles.infoVal, { color: '#0f766e' }]}>Đang hoạt động</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Dải nhiệt độ an toàn:</Text>
            <Text style={styles.infoVal}>{driverProfile.targetTempMin}°C đến {driverProfile.targetTempMax}°C</Text>
          </View>

          <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.infoLabel}>Nguồn pin thiết bị cảm biến:</Text>
            <Text style={[styles.infoVal, { color: '#166534' }]}>98% (Tốt)</Text>
          </View>
        </View>

        {/* Periodic Temperature Readings Log */}
        <View style={styles.card}>
          <View style={styles.cardHeaderWithAction}>
            <Text style={styles.cardTitle}>Nhật ký kiểm soát hành trình</Text>
            <TouchableOpacity style={styles.refreshBtn} onPress={handleSyncSensor} activeOpacity={0.7}>
              <RefreshCw size={13} color="#0284c7" style={[isRefreshing && { transform: [{ rotate: '45deg' }] }, { marginRight: 4 }]} />
              <Text style={styles.refreshBtnText}>{isRefreshing ? 'Đang đọc...' : 'Đồng bộ'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.logList}>
            {temperatureLogs.map((log, index) => (
              <View key={index} style={[styles.logRow, index === temperatureLogs.length - 1 && { borderBottomWidth: 0 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Clock size={13} color="#64748b" style={{ marginRight: 6 }} />
                  <Text style={styles.logTime}>{log.time}</Text>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={styles.logTemp}>{log.temp}°C</Text>
                  <View style={styles.logStatusBadge}>
                    <CheckCircle2 size={11} color="#166534" style={{ marginRight: 3 }} />
                    <Text style={styles.logStatusText}>{log.status}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Storage Standards Guide */}
        <View style={styles.guideCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
            <FileText size={15} color="#0f766e" style={{ marginRight: 6 }} />
            <Text style={styles.guideTitle}>Quy chuẩn an toàn thực phẩm chuỗi lạnh</Text>
          </View>
          <Text style={styles.guideText}>
            Hàng hóa bảo quản lạnh (thịt, cá tươi sống, sữa, rau củ sơ chế) cần duy trì liên tục ở nhiệt độ 0°C - 4°C trong suốt thời gian vận chuyển từ kho đến tay khách hàng.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    height: 50,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  scrollContent: {
    padding: 12,
    paddingBottom: 24,
  },
  gaugeCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  gaugeGood: {
    borderColor: '#bbf7d0',
    backgroundColor: '#f0fdf4',
  },
  gaugeWarning: {
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
  },
  gaugeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  gaugeSensorId: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginLeft: 6,
  },
  tempDisplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  tempNumber: {
    fontSize: 38,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    marginLeft: 8,
  },
  statusBadgeRow: {
    marginTop: 10,
  },
  goodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  goodBadgeText: {
    color: '#166534',
    fontSize: 11.5,
    fontWeight: '700',
  },
  alertBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#fecaca',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  alertBadgeText: {
    color: '#991b1b',
    fontSize: 11.5,
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 10,
  },
  cardHeaderWithAction: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#bae6fd',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  refreshBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0284c7',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  infoLabel: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '400',
  },
  infoVal: {
    fontSize: 12,
    color: '#0f172a',
    fontWeight: '600',
  },
  logList: {
    backgroundColor: '#f8fafc',
    borderRadius: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  logRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  logTime: {
    fontSize: 11.5,
    color: '#64748b',
    fontWeight: '500',
  },
  logTemp: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0f172a',
    fontVariant: ['tabular-nums'],
  },
  logStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  logStatusText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#166534',
  },
  guideCard: {
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  guideTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0f766e',
  },
  guideText: {
    fontSize: 11.5,
    color: '#334155',
    lineHeight: 17,
  },
});
