import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import {
  Download,
  ScanBarcode,
  CheckCircle2,
  AlertTriangle,
  Building,
  Thermometer,
  ShieldCheck,
  ChevronRight,
  Check,
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { fetchInboundOrdersApi, updateInboundStatusApi } from '../services/api';
import { InboundReceipt } from '../types';
import { COLORS } from '../theme/colors';

export const InboundScreen: React.FC = () => {
  const { activeWarehouse } = useAuth();
  const [inbounds, setInbounds] = useState<InboundReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<InboundReceipt | null>(null);
  const [tempInput, setTempInput] = useState('3.2');
  const [isPackagingPass, setIsPackagingPass] = useState(true);
  const [isExpiryPass, setIsExpiryPass] = useState(true);

  const loadInbounds = async () => {
    try {
      const data = await fetchInboundOrdersApi(activeWarehouse);
      setInbounds(data);
      if (data.length > 0 && !selectedOrder) {
        setSelectedOrder(data[0]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInbounds();
  }, [activeWarehouse]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadInbounds();
    setRefreshing(false);
  };

  const handleFinishQC = async () => {
    if (!selectedOrder) return;

    const temp = parseFloat(tempInput);
    if (isNaN(temp)) {
      Alert.alert('Lỗi nhập liệu', 'Vui lòng nhập nhiệt độ hợp lệ (Ví dụ: 3.5)');
      return;
    }

    const qcPassed = isPackagingPass && isExpiryPass && temp <= 4.0;
    const nextStatus = qcPassed ? 'COMPLETED' : 'REJECTED';

    await updateInboundStatusApi(selectedOrder.id, nextStatus, qcPassed);

    if (qcPassed) {
      Alert.alert(
        '✅ QC Đạt Chuẩn - Đã Đưa Hàng Lên Kệ!',
        `Phiếu PO ${selectedOrder.orderCode} đã kiểm định đạt chuẩn nhiệt độ ${temp}°C. Lô hàng đã được ghi nhận vào tồn kho!`
      );
    } else {
      Alert.alert(
        '⚠️ Lô Hàng Bị Từ Chối',
        `Nhiệt độ đo được ${temp}°C hoặc tiêu chuẩn bao bì không đạt. Đã lập biên bản gửi Nhà cung cấp.`
      );
    }

    loadInbounds();
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#059669" />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Tiếp Nhận & Đo QC Nhập Kho</Text>
          <Text style={styles.subtitle}>Kiểm định nhiệt độ • Kiểm tra bao bì & Đưa hàng lên kệ</Text>
        </View>
        <View style={styles.badgePill}>
          <ShieldCheck size={14} color="#059669" />
          <Text style={styles.badgePillText}>QC Pass</Text>
        </View>
      </View>

      {/* PO Orders Horizontal Selector */}
      <View style={styles.sectionTitleRow}>
        <Text style={styles.sectionLabel}>Phiếu nhập PO từ Nhà cung cấp ({inbounds.length}):</Text>
      </View>

      {loading ? (
        <View style={{ padding: 30, alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#059669" />
        </View>
      ) : inbounds.length === 0 ? (
        <View style={styles.emptyCard}>
          <Download size={44} color="#94a3b8" />
          <Text style={styles.emptyTitle}>Không có đơn nhập PO nào cần xử lý</Text>
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.poScroll}>
          {inbounds.map(po => {
            const isSelected = selectedOrder?.id === po.id;
            const isCompleted = po.status === 'COMPLETED';

            return (
              <TouchableOpacity
                key={po.id}
                style={[styles.poChip, isSelected && styles.poChipActive]}
                onPress={() => setSelectedOrder(po)}
                activeOpacity={0.8}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={[styles.poCode, isSelected && { color: '#065f46' }]}>{po.orderCode}</Text>
                  {isCompleted ? (
                    <CheckCircle2 size={14} color="#059669" />
                  ) : (
                    <View style={styles.pendingDot} />
                  )}
                </View>
                <Text style={styles.poSupplier} numberOfLines={1}>{po.supplierName}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Selected PO Details & QC Station Form */}
      {selectedOrder && (
        <View style={styles.qcCard}>
          <View style={styles.qcTop}>
            <View>
              <Text style={styles.qcTitle}>{selectedOrder.orderCode}</Text>
              <Text style={styles.qcSupplier}>{selectedOrder.supplierName}</Text>
            </View>
            <View style={styles.tempReqTag}>
              <Thermometer size={13} color="#0284c7" />
              <Text style={styles.tempReqText}>{selectedOrder.temperatureRequired}</Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Tổng mặt hàng: <Text style={{ color: '#0f172a', fontWeight: '800' }}>{selectedOrder.itemsCount} loại</Text></Text>
            <Text style={styles.metaLabel}>Tổng số lượng: <Text style={{ color: '#059669', fontWeight: '800' }}>{selectedOrder.totalQuantity} đơn vị</Text></Text>
          </View>

          <View style={styles.divider} />

          {/* Temperature Measurement Input */}
          <Text style={styles.formSectionTitle}>1. Đo nhiệt độ cảm biến dỡ hàng (Súng hồng ngoại):</Text>
          <View style={styles.tempInputRow}>
            <View style={styles.tempIconCircle}>
              <Thermometer size={22} color="#0284c7" />
            </View>
            <TextInput
              style={styles.tempInput}
              value={tempInput}
              onChangeText={setTempInput}
              keyboardType="decimal-pad"
              placeholder="3.2"
              placeholderTextColor="#94a3b8"
            />
            <Text style={styles.tempUnit}>°C</Text>
            <View style={styles.tempStatusBadge}>
              <Text style={styles.tempStatusText}>
                {parseFloat(tempInput) <= 4.0 ? '🟢 Đạt Chuẩn Lạnh' : '🔴 Quá Nhiệt'}
              </Text>
            </View>
          </View>

          {/* Quick Temperature Presets */}
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
            <TouchableOpacity
              style={[styles.tempPresetBtn, tempInput === '2.5' && styles.tempPresetBtnActive]}
              onPress={() => setTempInput('2.5')}
            >
              <Text style={[styles.tempPresetBtnText, tempInput === '2.5' && styles.tempPresetBtnTextActive]}>
                ❄️ +2.5°C (Kho Lạnh)
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tempPresetBtn, tempInput === '-18.0' && styles.tempPresetBtnActive]}
              onPress={() => setTempInput('-18.0')}
            >
              <Text style={[styles.tempPresetBtnText, tempInput === '-18.0' && styles.tempPresetBtnTextActive]}>
                🧊 -18°C (Kho Đông)
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tempPresetBtn, tempInput === '24.0' && styles.tempPresetBtnActive]}
              onPress={() => setTempInput('24.0')}
            >
              <Text style={[styles.tempPresetBtnText, tempInput === '24.0' && styles.tempPresetBtnTextActive]}>
                📦 +24°C (Khô)
              </Text>
            </TouchableOpacity>
          </View>

          {/* QC Checklist */}
          <Text style={styles.formSectionTitle}>2. Kiểm tra chất lượng & Tiêu chuẩn bao bì:</Text>

          <TouchableOpacity
            style={styles.checkItemRow}
            onPress={() => setIsPackagingPass(!isPackagingPass)}
            activeOpacity={0.8}
          >
            <View style={[styles.checkBox, isPackagingPass && styles.checkBoxActive]}>
              {isPackagingPass && <Check size={14} color="#ffffff" />}
            </View>
            <Text style={styles.checkItemText}>Bao bì nguyên vẹn, hút chân không đạt chuẩn, không rách rò rỉ</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.checkItemRow}
            onPress={() => setIsExpiryPass(!isExpiryPass)}
            activeOpacity={0.8}
          >
            <View style={[styles.checkBox, isExpiryPass && styles.checkBoxActive]}>
              {isExpiryPass && <Check size={14} color="#ffffff" />}
            </View>
            <Text style={styles.checkItemText}>Hạn sử dụng còn ít nhất 85% thời lượng theo quy định CityMart</Text>
          </TouchableOpacity>

          {/* Submit Action */}
          <TouchableOpacity
            style={[
              styles.qcSubmitBtn,
              selectedOrder.status === 'COMPLETED' && styles.qcSubmitBtnDone,
            ]}
            onPress={handleFinishQC}
            activeOpacity={0.85}
          >
            <ShieldCheck size={18} color="#ffffff" />
            <Text style={styles.qcSubmitBtnText}>
              {selectedOrder.status === 'COMPLETED'
                ? '✅ ĐÃ DUYỆT QC & LÊN KỆ THÀNH CÔNG'
                : 'DUYỆT QC & XÁC NHẬN LÊN KỆ KHO'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 16,
    paddingBottom: 90,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#a7f3d0',
    gap: 4,
  },
  badgePillText: {
    color: '#059669',
    fontSize: 11,
    fontWeight: '700',
  },
  sectionTitleRow: {
    marginBottom: 10,
  },
  sectionLabel: {
    color: '#475569',
    fontSize: 12.5,
    fontWeight: '700',
  },
  emptyCard: {
    alignItems: 'center',
    padding: 30,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  emptyTitle: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '800',
    marginTop: 10,
  },
  poScroll: {
    marginBottom: 16,
  },
  poChip: {
    width: 180,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  poChipActive: {
    borderColor: '#059669',
    backgroundColor: '#ecfdf5',
  },
  poCode: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: '800',
  },
  poSupplier: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 4,
  },
  pendingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#f59e0b',
  },
  qcCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  qcTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  qcTitle: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '800',
  },
  qcSupplier: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 2,
  },
  tempReqTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f0f9ff',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  tempReqText: {
    color: '#0284c7',
    fontSize: 11,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  metaLabel: {
    color: '#64748b',
    fontSize: 12,
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 14,
  },
  formSectionTitle: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
  },
  tempInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
  },
  tempIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#e0f2fe',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  tempInput: {
    flex: 1,
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '800',
  },
  tempUnit: {
    color: '#64748b',
    fontSize: 16,
    fontWeight: '700',
    marginRight: 12,
  },
  tempStatusBadge: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  tempStatusText: {
    color: '#059669',
    fontSize: 11,
    fontWeight: '700',
  },
  checkItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  checkBox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    backgroundColor: '#ffffff',
  },
  checkBoxActive: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  checkItemText: {
    color: '#334155',
    fontSize: 12,
    flex: 1,
    lineHeight: 16,
  },
  qcSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#059669',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 14,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  qcSubmitBtnDone: {
    backgroundColor: '#047857',
  },
  qcSubmitBtnText: {
    color: '#ffffff',
    fontSize: 13.5,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  tempPresetBtn: {
    flex: 1,
    paddingVertical: 7,
    paddingHorizontal: 6,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tempPresetBtnActive: {
    backgroundColor: '#ecfdf5',
    borderColor: '#059669',
  },
  tempPresetBtnText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#64748b',
  },
  tempPresetBtnTextActive: {
    color: '#059669',
    fontWeight: '800',
  },
});
