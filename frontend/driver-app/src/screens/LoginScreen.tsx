import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useDriverTask } from '../context/DriverTaskContext';
import { Lock, Mail, LogIn, AlertCircle, Eye, EyeOff, Truck, Bike, ShieldCheck } from 'lucide-react-native';

export const LoginScreen: React.FC = () => {
  const { login } = useDriverTask();
  const [email, setEmail] = useState('driver@sfwms.vn');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setErrorMessage('Vui lòng nhập đầy đủ Email/Gmail được cấp và Mật khẩu');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const success = await login(email.trim(), password);
      if (!success) {
        setErrorMessage('Email hoặc Mật khẩu không chính xác. Vui lòng thử lại!');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại kết nối mạng.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Brand Header */}
        <View style={styles.header}>
          <View style={styles.brandLogoRow}>
            <View style={styles.brandIconBox}>
              <Truck size={28} color="#ffffff" />
            </View>
            <View style={{ marginLeft: 10 }}>
              <Text style={styles.brandTitle}>C.T MART</Text>
              <Text style={styles.brandSubtitle}>SMART FOOD LOGISTICS</Text>
            </View>
          </View>

          <View style={styles.subBadge}>
            <Text style={styles.subBadgeText}>ỨNG DỤNG TÀI XẾ GIAO HÀNG • LOGISTICS</Text>
          </View>
          <Text style={styles.welcomeText}>Đăng Nhập Ca Giao Hàng</Text>
          <Text style={styles.headerDesc}>
            Hệ thống tối ưu lộ trình & giám sát chuỗi lạnh 0-4°C thời gian thực
          </Text>
        </View>

        {/* Form Card */}
        <View style={styles.card}>
          {errorMessage && (
            <View style={styles.errorBox}>
              <AlertCircle size={16} color="#dc2626" />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          {/* Email Field */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>TÀI KHOẢN GMAIL / EMAIL ĐƯỢC CẤP</Text>
            <View style={styles.inputWrap}>
              <Mail size={18} color="#64748b" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Nhập email tài xế (ví dụ: driver@sfwms.vn)..."
                placeholderTextColor="#94a3b8"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>
          </View>

          {/* Password Field */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>MẬT KHẨU</Text>
            <View style={styles.inputWrap}>
              <Lock size={18} color="#64748b" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Nhập mật khẩu..."
                placeholderTextColor="#94a3b8"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={{ padding: 6 }}
                activeOpacity={0.7}
              >
                {showPassword ? (
                  <EyeOff size={18} color="#94a3b8" />
                ) : (
                  <Eye size={18} color="#94a3b8" />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Quick Switch Driver Accounts */}
          <View style={styles.quickDriverSection}>
            <Text style={styles.quickDriverLabel}>CHỌN NHANH TÀI XẾ THỬ NGHIỆM:</Text>
            <View style={styles.quickDriverGrid}>
              <TouchableOpacity
                style={[
                  styles.quickDriverCard,
                  email.includes('phuc') || email.includes('0944778899') ? styles.quickDriverCardActive : null
                ]}
                onPress={() => {
                  setEmail('phuc.dang@sfwms.vn');
                  setPassword('password123');
                }}
                activeOpacity={0.8}
              >
                <Truck size={20} color="#0284c7" style={{ marginRight: 10 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.quickDriverName}>Đặng Hoàng Phúc</Text>
                  <Text style={styles.quickDriverRole}>Xe Tải Lạnh 2.5T • Tiêu Hủy (NV-TK01)</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.quickDriverCard,
                  email.includes('driver') || email.includes('tri') || email.includes('0977112233') ? styles.quickDriverCardActive : null
                ]}
                onPress={() => {
                  setEmail('driver@sfwms.vn');
                  setPassword('password123');
                }}
                activeOpacity={0.8}
              >
                <Bike size={20} color="#059669" style={{ marginRight: 10 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.quickDriverName}>Võ Minh Trí</Text>
                  <Text style={styles.quickDriverRole}>Xe Máy Thùng Lạnh (NV-GV05)</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.quickDriverCard,
                  email.includes('van') || email.includes('nam') || email.includes('0918776655') ? styles.quickDriverCardActive : null
                ]}
                onPress={() => {
                  setEmail('van@sfwms.vn');
                  setPassword('password123');
                }}
                activeOpacity={0.8}
              >
                <Truck size={20} color="#d97706" style={{ marginRight: 10 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.quickDriverName}>Phan Hữu Nam</Text>
                  <Text style={styles.quickDriverRole}>Xe Bán Tải 1.5T (NV-VAN01)</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* Security Notice */}
          <View style={styles.securityNotice}>
            <ShieldCheck size={14} color="#059669" />
            <Text style={styles.securityNoticeText}>
              Tài khoản được phân quyền và tự động đồng bộ đơn hàng tức thời qua WebSocket.
            </Text>
          </View>

          {/* Login Button */}
          <TouchableOpacity
            style={[styles.loginBtn, loading && { opacity: 0.7 }]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <View style={styles.btnContent}>
                <LogIn size={18} color="#ffffff" style={{ marginRight: 8 }} />
                <Text style={styles.loginBtnText}>ĐĂNG NHẬP VÀO CA GIAO HÀNG</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Support Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Cần hỗ trợ phân quyền kho hoặc cấp tài khoản? Liên hệ Điều phối viên Hub: <Text style={{ color: '#059669', fontWeight: '700' }}>1900 8888</Text>
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
    flexGrow: 1,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  brandLogoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  brandIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#059669',
    letterSpacing: 1,
  },
  brandSubtitle: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.8,
  },
  subBadge: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  subBadgeText: {
    color: '#059669',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  welcomeText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 12,
  },
  headerDesc: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 20,
    lineHeight: 18,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fef2f2',
    padding: 12,
    borderRadius: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorText: {
    color: '#dc2626',
    fontSize: 12,
    flex: 1,
    fontWeight: '600',
  },
  fieldGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 14,
    height: 48,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '600',
  },
  quickDriverSection: {
    marginBottom: 16,
    backgroundColor: '#f1f5f9',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  quickDriverLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#334155',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  quickDriverGrid: {
    gap: 6,
  },
  quickDriverCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  quickDriverCardActive: {
    borderColor: '#059669',
    backgroundColor: '#ecfdf5',
  },
  quickDriverEmoji: {
    fontSize: 20,
    marginRight: 8,
  },
  quickDriverName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  quickDriverRole: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 1,
  },
  securityNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 16,
    gap: 6,
  },
  securityNoticeText: {
    color: '#059669',
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
  loginBtn: {
    backgroundColor: '#059669',
    borderRadius: 12,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
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
  footer: {
    marginTop: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 11.5,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 16,
  },
});
