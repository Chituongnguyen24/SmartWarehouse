import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { COLORS } from '../theme/colors';
import { useDriverTask } from '../context/DriverTaskContext';
import { 
  Lock, Phone, Eye, EyeOff, LogIn, 
  ShieldCheck, Truck, CheckCircle2, MapPin
} from 'lucide-react-native';

const DEMO_ACCOUNTS = [
  {
    code: 'NV-GV05',
    name: 'Võ Minh Trí',
    phone: '0977112233',
    plate: '59-V1 888.99',
    type: '🛵 Xe Máy Thùng Lạnh',
    warehouse: 'Kho Gò Vấp (WH-006)'
  },
  {
    code: 'NV-GV06',
    name: 'Nguyễn Văn Hùng',
    phone: '0909888111',
    plate: '59-G2 688.39',
    type: '🛵 Xe Máy Giao Siêu Tốc',
    warehouse: 'Kho Gò Vấp (WH-006)'
  },
  {
    code: 'NV-GV07',
    name: 'Trần Quốc Bảo',
    phone: '0933445566',
    plate: '59-P1 456.78',
    type: '🛵 Xe Máy Thùng Mát',
    warehouse: 'Kho Gò Vấp (WH-006)'
  }
];

export const LoginScreen: React.FC = () => {
  const { login } = useDriverTask();

  const [phoneOrCode, setPhoneOrCode] = useState('0977112233');
  const [password, setPassword] = useState('123456');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!phoneOrCode.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập Số điện thoại hoặc Mã nhân viên!');
      return;
    }
    if (!password.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập Mật khẩu!');
      return;
    }

    setLoading(true);
    const success = await login(phoneOrCode.trim(), password);
    setLoading(false);

    if (!success) {
      Alert.alert('Đăng nhập thất bại', 'Số điện thoại hoặc Mật khẩu không chính xác!');
    }
  };

  const handleSelectDemo = (acc: typeof DEMO_ACCOUNTS[0]) => {
    setPhoneOrCode(acc.phone);
    setPassword('123456');
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          {/* Brand Header */}
          <View style={styles.brandHeader}>
            <View style={styles.logoBadge}>
              <Truck size={32} color="#10b981" />
            </View>
            <Text style={styles.brandName}>C.T MART</Text>
            <View style={styles.appTypeBadge}>
              <Text style={styles.appTypeText}>DRIVER PARTNER • LOGISTICS</Text>
            </View>
            <Text style={styles.welcomeTitle}>Đăng Nhập Tài Xế</Text>
            <Text style={styles.welcomeSub}>
              Hệ thống điều phối giao nhận thực phẩm tươi sạch & chuỗi cung ứng lạnh
            </Text>
          </View>

          {/* Form Card */}
          <View style={styles.card}>
            {/* Phone/Code Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>SỐ ĐIỆN THOẠI / MÃ NHÂN VIÊN</Text>
              <View style={styles.inputWrapper}>
                <Phone size={18} color={COLORS.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Ví dụ: 0977112233 hoặc NV-GV05"
                  placeholderTextColor="#64748b"
                  value={phoneOrCode}
                  onChangeText={setPhoneOrCode}
                  autoCapitalize="none"
                />
              </View>
            </View>

            {/* Password Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>MẬT KHẨU</Text>
              <View style={styles.inputWrapper}>
                <Lock size={18} color={COLORS.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Nhập mật khẩu..."
                  placeholderTextColor="#64748b"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeBtn}
                  activeOpacity={0.7}
                >
                  {showPassword ? (
                    <EyeOff size={18} color={COLORS.textMuted} />
                  ) : (
                    <Eye size={18} color={COLORS.textMuted} />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Options Row */}
            <View style={styles.optionsRow}>
              <TouchableOpacity
                style={styles.rememberRow}
                onPress={() => setRememberMe(!rememberMe)}
                activeOpacity={0.8}
              >
                <View style={[styles.checkbox, rememberMe && styles.checkboxActive]}>
                  {rememberMe && <CheckCircle2 size={12} color="#fff" />}
                </View>
                <Text style={styles.rememberText}>Ghi nhớ đăng nhập</Text>
              </TouchableOpacity>

              <TouchableOpacity activeOpacity={0.8}>
                <Text style={styles.forgotText}>Quên mật khẩu?</Text>
              </TouchableOpacity>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.loginBtn, loading && { opacity: 0.7 }]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <View style={styles.btnContent}>
                  <LogIn size={18} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.loginBtnText}>ĐĂNG NHẬP VÀO CA TRỰC</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Security Badge */}
            <View style={styles.securityRow}>
              <ShieldCheck size={14} color="#10b981" />
              <Text style={styles.securityText}>Bảo mật tiêu chuẩn Chuỗi Cung Ứng C.T Mart</Text>
            </View>
          </View>

          {/* Quick Demo Accounts Selection */}
          <View style={styles.demoSection}>
            <Text style={styles.demoTitle}>TÀI KHOẢN TÀI XẾ TEST NHANH (KHO GÒ VẤP WH-006):</Text>
            
            {DEMO_ACCOUNTS.map((acc) => {
              const isSelected = phoneOrCode === acc.phone;
              return (
                <TouchableOpacity
                  key={acc.code}
                  style={[styles.demoCard, isSelected && styles.demoCardActive]}
                  onPress={() => handleSelectDemo(acc)}
                  activeOpacity={0.8}
                >
                  <View style={styles.demoHeader}>
                    <View style={styles.demoAvatar}>
                      <Text style={styles.demoAvatarText}>{acc.name.slice(0, 2).toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text style={styles.demoName}>{acc.name} ({acc.code})</Text>
                        <View style={styles.demoPlateBadge}>
                          <Text style={styles.demoPlateText}>{acc.plate}</Text>
                        </View>
                      </View>
                      <Text style={styles.demoType}>{acc.type}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                        <MapPin size={10} color="#94a3b8" />
                        <Text style={styles.demoWh}>{acc.warehouse}</Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#090d16',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  brandHeader: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 24,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  brandName: {
    fontSize: 24,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 1.5,
  },
  appTypeBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  appTypeText: {
    color: '#10b981',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#f8fafc',
    marginTop: 16,
  },
  welcomeSub: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 20,
    lineHeight: 18,
  },
  card: {
    backgroundColor: '#111827',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94a3b8',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1f2937',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#374151',
    paddingHorizontal: 14,
    height: 50,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  eyeBtn: {
    padding: 6,
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 4,
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#64748b',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  checkboxActive: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  rememberText: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '600',
  },
  forgotText: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '700',
  },
  loginBtn: {
    backgroundColor: '#059669',
    borderRadius: 14,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  securityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    gap: 6,
  },
  securityText: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '600',
  },
  demoSection: {
    marginTop: 24,
  },
  demoTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94a3b8',
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  demoCard: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  demoCardActive: {
    borderColor: '#10b981',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
  },
  demoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  demoAvatar: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#065f46',
    alignItems: 'center',
    justifyContent: 'center',
  },
  demoAvatarText: {
    color: '#a7f3d0',
    fontWeight: '900',
    fontSize: 13,
  },
  demoName: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '800',
  },
  demoPlateBadge: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#334155',
  },
  demoPlateText: {
    color: '#38bdf8',
    fontSize: 10,
    fontWeight: '800',
  },
  demoType: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 1,
  },
  demoWh: {
    color: '#64748b',
    fontSize: 10,
    marginLeft: 3,
  },
});
