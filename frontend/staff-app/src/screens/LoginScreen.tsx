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
  Image,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { loginStaffApi } from '../services/api';
import { COLORS } from '../theme/colors';
import { Lock, Mail, LogIn, AlertCircle, CheckCircle2 } from 'lucide-react-native';

export const LoginScreen: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('staff@sfwms.vn');
  const [password, setPassword] = useState('password123');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email || !password) {
      setErrorMessage('Vui lòng nhập đầy đủ Email và Mật khẩu');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const { user, token } = await loginStaffApi(email, password);
      login(user, token);
    } catch (err: any) {
      setErrorMessage(err.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickSelect = (accEmail: string) => {
    setEmail(accEmail);
    setPassword('password123');
    setErrorMessage(null);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Brand Header with Real City Mart Logo */}
        <View style={styles.header}>
          <Image
            source={require('../../assets/logos/logo_full.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <View style={styles.subBadge}>
            <Text style={styles.subBadgeText}>ỨNG DỤNG NHÂN VIÊN KHO</Text>
          </View>
          <Text style={styles.welcomeText}>Đăng Nhập Ca Trực</Text>
          <Text style={styles.headerDesc}>
            Hệ thống quản lý xuất nhập kho và bảo quản thực phẩm tươi sạch
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
            <Text style={styles.label}>TÀI KHOẢN EMAIL</Text>
            <View style={styles.inputWrap}>
              <Mail size={18} color="#64748b" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Nhập email nhân viên..."
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
                secureTextEntry
              />
            </View>
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
                <Text style={styles.loginBtnText}>BẮT ĐẦU VÀO CA TRỰC</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Quick Demo Role Selector */}
        <View style={styles.quickSection}>
          <Text style={styles.quickTitle}>CHỌN NHANH TÀI KHOẢN:</Text>
          
          <TouchableOpacity
            style={[styles.quickCard, email === 'staff@sfwms.vn' && styles.quickCardActive]}
            onPress={() => handleQuickSelect('staff@sfwms.vn')}
            activeOpacity={0.8}
          >
            <View style={styles.avatarPill}>
              <Text style={styles.avatarText}>LH</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.quickName}>Lê Thị Hoa</Text>
                <View style={styles.roleTag}>
                  <Text style={styles.roleTagText}>Kho Gò Vấp</Text>
                </View>
              </View>
              <Text style={styles.quickRole}>Nhân viên soạn hàng & đóng gói</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickCard, email === 'manager@sfwms.vn' && styles.quickCardActive]}
            onPress={() => handleQuickSelect('manager@sfwms.vn')}
            activeOpacity={0.8}
          >
            <View style={[styles.avatarPill, { backgroundColor: '#0284c7' }]}>
              <Text style={styles.avatarText}>TB</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.quickName}>Trần Văn Bình</Text>
                <View style={[styles.roleTag, { backgroundColor: '#e0f2fe', borderColor: '#bae6fd' }]}>
                  <Text style={[styles.roleTagText, { color: '#0284c7' }]}>Quản lý Kho</Text>
                </View>
              </View>
              <Text style={styles.quickRole}>Duyệt đơn xuất nhập & điều phối ca</Text>
            </View>
          </TouchableOpacity>
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
  },
  header: {
    alignItems: 'center',
    marginTop: 14,
    marginBottom: 20,
  },
  logoImage: {
    width: 200,
    height: 60,
    marginBottom: 10,
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
  loginBtn: {
    backgroundColor: '#059669',
    borderRadius: 12,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
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
  quickSection: {
    marginTop: 22,
  },
  quickTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748b',
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  quickCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  quickCardActive: {
    borderColor: '#059669',
    backgroundColor: '#ecfdf5',
  },
  avatarPill: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontWeight: '900',
    fontSize: 13,
  },
  quickName: {
    color: '#0f172a',
    fontSize: 13.5,
    fontWeight: '800',
  },
  quickRole: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 2,
  },
  roleTag: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  roleTagText: {
    color: '#059669',
    fontSize: 10.5,
    fontWeight: '700',
  },
});
