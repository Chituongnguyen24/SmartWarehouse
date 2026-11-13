import React, { useState, useEffect, useRef } from 'react';
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
  Modal,
} from 'react-native';
import { useDriverTask } from '@/features/delivery';
import { storageHelper } from '@/shared';
import { Lock, Mail, Phone, LogIn, AlertCircle, Eye, EyeOff, CheckSquare, Square, Headphones, KeyRound, X, Check } from 'lucide-react-native';
import { driverApi } from '@/shared';

const REMEMBER_ACCOUNT_KEY = 'sfwms_driver_remembered_account';

export const LoginScreen: React.FC = () => {
  const { login } = useDriverTask();
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Forgot Password SMS OTP Modal State
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotPhone, setForgotPhone] = useState('');
  const [forgotDigits, setForgotDigits] = useState(['', '', '', '', '', '']);
  const digitRefs = useRef<Array<TextInput | null>>([]);
  const [forgotNewPass, setForgotNewPass] = useState('');
  const [forgotConfirmPass, setForgotConfirmPass] = useState('');
  const [showForgotNewPass, setShowForgotNewPass] = useState(false);
  const [forgotCooldown, setForgotCooldown] = useState(0);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null);

  const handleForgotDigitChange = (val: string, idx: number) => {
    const char = val.replace(/\D/g, '').slice(-1);
    const next = [...forgotDigits];
    next[idx] = char;
    setForgotDigits(next);
    if (forgotError) setForgotError(null);
    if (char && idx < 5) {
      digitRefs.current[idx + 1]?.focus();
    }
  };

  const handleForgotKeyPress = (e: any, idx: number) => {
    if (e.nativeEvent.key === 'Backspace' && !forgotDigits[idx] && idx > 0) {
      digitRefs.current[idx - 1]?.focus();
      const next = [...forgotDigits];
      next[idx - 1] = '';
      setForgotDigits(next);
    }
  };

  useEffect(() => {
    if (forgotCooldown > 0) {
      const timer = setTimeout(() => setForgotCooldown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [forgotCooldown]);

  const handleSendForgotOtp = async () => {
    const cleanPhone = forgotPhone.trim();
    if (!cleanPhone || cleanPhone.length < 9) {
      setForgotError('Vui lòng nhập số điện thoại hợp lệ (10 chữ số)');
      return;
    }
    setForgotLoading(true);
    setForgotError(null);
    setForgotSuccess(null);
    try {
      const res = await driverApi.sendOtp(cleanPhone, 'RESET_PASSWORD');
      setForgotCooldown(res.cooldownSeconds || 60);
      setForgotSuccess(`Mã xác thực đã được gửi đến số điện thoại qua tin nhắn!${res.otpCode ? ` (Mã: ${res.otpCode})` : ''}`);
    } catch (err: any) {
      setForgotError(err.message || 'Lỗi khi gửi mã xác thực');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleConfirmResetPassword = async () => {
    const cleanPhone = forgotPhone.trim();
    const cleanOtp = forgotDigits.join('');
    const cleanPass = forgotNewPass.trim();

    if (!cleanOtp || cleanOtp.length < 6) {
      setForgotError('Vui lòng nhập đủ 6 chữ số mã xác thực');
      return;
    }
    if (!cleanPass || cleanPass.length < 6) {
      setForgotError('Mật khẩu mới phải có tối thiểu 6 ký tự');
      return;
    }
    if (cleanPass !== forgotConfirmPass.trim()) {
      setForgotError('Xác nhận mật khẩu mới không khớp');
      return;
    }

    setForgotLoading(true);
    setForgotError(null);
    try {
      await driverApi.forgotPasswordConfirm(cleanPhone, cleanOtp, cleanPass);
      setForgotSuccess('Đổi mật khẩu thành công! Bạn có thể đăng nhập ngay.');
      setPassword(cleanPass);
      if (!account || account.includes('@')) {
        setAccount(cleanPhone);
      }
      setTimeout(() => {
        setShowForgotModal(false);
        setForgotPhone('');
        setForgotDigits(['', '', '', '', '', '']);
        setForgotNewPass('');
        setForgotConfirmPass('');
        setForgotSuccess(null);
      }, 1500);
    } catch (err: any) {
      setForgotError(err.message || 'Lỗi khi đặt lại mật khẩu');
    } finally {
      setForgotLoading(false);
    }
  };

  // Restore remembered account on mount
  useEffect(() => {
    let isMounted = true;
    storageHelper.getItem(REMEMBER_ACCOUNT_KEY).then((saved) => {
      if (isMounted && saved) {
        setAccount(saved);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleLogin = async () => {
    const trimmedAccount = account.trim();
    const trimmedPassword = password.trim();

    if (!trimmedAccount) {
      setErrorMessage('Vui lòng nhập số điện thoại hoặc email tài xế');
      return;
    }
    if (!trimmedPassword) {
      setErrorMessage('Vui lòng nhập mật khẩu');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const success = await login(trimmedAccount, trimmedPassword);
      if (!success) {
        setErrorMessage('Số điện thoại hoặc tài khoản tài xế không tồn tại trên hệ thống, hoặc mật khẩu không chính xác.');
      } else {
        // Save or remove remembered account
        if (rememberMe) {
          await storageHelper.saveItem(REMEMBER_ACCOUNT_KEY, trimmedAccount);
        } else {
          await storageHelper.removeItem(REMEMBER_ACCOUNT_KEY);
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại kết nối mạng.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Brand Header with Official CT Mart Logo */}
        <View style={styles.header}>
          <Image
            source={require('../../../../assets/logos/logo_full.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <View style={styles.badge}>
            <Text style={styles.badgeText}>ỨNG DỤNG GIAO HÀNG</Text>
          </View>
          <Text style={styles.title}>Đăng nhập tài xế</Text>
          <Text style={styles.subtitle}>
            Hệ thống tiếp nhận và giao nhận đơn hàng C.T Mart
          </Text>
        </View>

        {/* Login Form Card */}
        <View style={styles.card}>
          {errorMessage && (
            <View style={styles.errorBox}>
              <AlertCircle size={16} color="#991b1b" style={{ flexShrink: 0 }} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          {/* Account Field */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Số điện thoại hoặc Email</Text>
            <View style={styles.inputWrap}>
              {account.includes('@') ? (
                <Mail size={18} color="#64748b" style={styles.inputIcon} />
              ) : (
                <Phone size={18} color="#64748b" style={styles.inputIcon} />
              )}
              <TextInput
                style={styles.input}
                placeholder="0377 019 958, 0977 112 233 hoặc email..."
                placeholderTextColor="#94a3b8"
                value={account}
                onChangeText={(text) => {
                  setAccount(text);
                  if (errorMessage) setErrorMessage(null);
                }}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
              />
            </View>
          </View>

          {/* Password Field */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Mật khẩu</Text>
            <View style={styles.inputWrap}>
              <Lock size={18} color="#64748b" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Nhập mật khẩu của bạn"
                placeholderTextColor="#94a3b8"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (errorMessage) setErrorMessage(null);
                }}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeBtn}
                activeOpacity={0.7}
                accessibilityLabel="Ẩn hoặc hiện mật khẩu"
              >
                {showPassword ? (
                  <EyeOff size={18} color="#64748b" />
                ) : (
                  <Eye size={18} color="#64748b" />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Remember Me & Forgot Password Option */}
          <View style={styles.optionsRow}>
            <TouchableOpacity
              style={styles.rememberWrap}
              onPress={() => setRememberMe(!rememberMe)}
              activeOpacity={0.7}
            >
              {rememberMe ? (
                <CheckSquare size={16} color="#059669" />
              ) : (
                <Square size={16} color="#94a3b8" />
              )}
              <Text style={styles.rememberText}>Ghi nhớ tài khoản</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setForgotPhone(account.replace(/\D/g, '').length === 10 ? account : '');
                setShowForgotModal(true);
                setForgotError(null);
                setForgotSuccess(null);
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.forgotLinkText}>Quên mật khẩu?</Text>
            </TouchableOpacity>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <View style={styles.btnContent}>
                <LogIn size={18} color="#ffffff" style={{ marginRight: 8 }} />
                <Text style={styles.loginBtnText}>Đăng nhập vào ca</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Support & Hotline Footer */}
        <View style={styles.footer}>
          <View style={styles.footerRow}>
            <Headphones size={15} color="#475569" style={{ marginRight: 6 }} />
            <Text style={styles.footerHotline}>
              Hỗ trợ tài xế: <Text style={styles.hotlineNumber}>1900 8888</Text> (Miễn phí)
            </Text>
          </View>
          <Text style={styles.footerSub}>
            Hỗ trợ kỹ thuật ứng dụng tài xế 24/7. Lấy lại mật khẩu nhanh qua tin nhắn SMS OTP.
          </Text>
        </View>
      </ScrollView>

      {/* SMS OTP Forgot Password Modal */}
      <Modal
        visible={showForgotModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowForgotModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={styles.modalIconWrap}>
                  <KeyRound size={18} color="#0284c7" />
                </View>
                <View>
                  <Text style={styles.modalTitle}>Khôi Phục Mật Khẩu</Text>
                  <Text style={styles.modalSubtitle}>Nhập số điện thoại để nhận mã xác thực bảo mật</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setShowForgotModal(false)} style={{ padding: 4 }}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            {forgotError && (
              <View style={styles.modalErrorBox}>
                <AlertCircle size={15} color="#991b1b" style={{ marginRight: 6 }} />
                <Text style={styles.modalErrorText}>{forgotError}</Text>
              </View>
            )}

            {forgotSuccess && (
              <View style={styles.modalSuccessBox}>
                <Check size={15} color="#166534" style={{ marginRight: 6 }} />
                <Text style={styles.modalSuccessText}>{forgotSuccess}</Text>
              </View>
            )}

            {/* Phone Input with Send OTP Button */}
            <View style={{ marginBottom: 12 }}>
              <Text style={styles.modalLabel}>Số điện thoại tài xế</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={[styles.modalInputWrap, { flex: 1 }]}>
                  <Phone size={16} color="#64748b" style={{ marginRight: 8 }} />
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Nhập 10 số di động..."
                    placeholderTextColor="#94a3b8"
                    keyboardType="phone-pad"
                    value={forgotPhone}
                    onChangeText={text => {
                      setForgotPhone(text);
                      if (forgotError) setForgotError(null);
                    }}
                  />
                </View>
                <TouchableOpacity
                  style={[styles.otpBtn, forgotCooldown > 0 && styles.otpBtnDisabled]}
                  onPress={handleSendForgotOtp}
                  disabled={forgotLoading || forgotCooldown > 0}
                >
                  <Text style={[styles.otpBtnText, forgotCooldown > 0 && styles.otpBtnTextDisabled]}>
                    {forgotCooldown > 0 ? `Lại (${forgotCooldown}s)` : 'Nhận mã'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 6-digit Segmented PIN Box Input */}
            <View style={{ marginBottom: 12 }}>
              <Text style={styles.modalLabel}>Mã xác thực</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
                {forgotDigits.map((digit, idx) => (
                  <TextInput
                    key={idx}
                    ref={ref => {
                      digitRefs.current[idx] = ref;
                    }}
                    style={{
                      width: 42,
                      height: 46,
                      backgroundColor: '#f8fafc',
                      borderWidth: digit ? 1.5 : 1,
                      borderColor: digit ? '#0284c7' : '#cbd5e1',
                      borderRadius: 6,
                      textAlign: 'center',
                      fontSize: 18,
                      fontWeight: '700',
                      color: '#0284c7',
                    }}
                    keyboardType="numeric"
                    maxLength={1}
                    value={digit}
                    onChangeText={val => handleForgotDigitChange(val, idx)}
                    onKeyPress={e => handleForgotKeyPress(e, idx)}
                  />
                ))}
              </View>
            </View>

            {/* New Password */}
            <View style={{ marginBottom: 12 }}>
              <Text style={styles.modalLabel}>Mật khẩu mới (tối thiểu 6 ký tự)</Text>
              <View style={styles.modalInputWrap}>
                <Lock size={16} color="#64748b" style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.modalInput}
                  placeholder="Nhập mật khẩu mới..."
                  placeholderTextColor="#94a3b8"
                  secureTextEntry={!showForgotNewPass}
                  value={forgotNewPass}
                  onChangeText={text => {
                    setForgotNewPass(text);
                    if (forgotError) setForgotError(null);
                  }}
                />
                <TouchableOpacity onPress={() => setShowForgotNewPass(!showForgotNewPass)} style={{ padding: 4 }}>
                  {showForgotNewPass ? <EyeOff size={16} color="#64748b" /> : <Eye size={16} color="#64748b" />}
                </TouchableOpacity>
              </View>
            </View>

            {/* Confirm Password */}
            <View style={{ marginBottom: 16 }}>
              <Text style={styles.modalLabel}>Xác nhận mật khẩu mới</Text>
              <View style={styles.modalInputWrap}>
                <Lock size={16} color="#64748b" style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.modalInput}
                  placeholder="Nhập lại mật khẩu mới..."
                  placeholderTextColor="#94a3b8"
                  secureTextEntry={!showForgotNewPass}
                  value={forgotConfirmPass}
                  onChangeText={text => {
                    setForgotConfirmPass(text);
                    if (forgotError) setForgotError(null);
                  }}
                />
              </View>
            </View>

            {/* Buttons */}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowForgotModal(false)}
              >
                <Text style={styles.modalCancelText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSubmitBtn, forgotLoading && { opacity: 0.7 }]}
                onPress={handleConfirmResetPassword}
                disabled={forgotLoading}
              >
                {forgotLoading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.modalSubmitText}>Đổi Mật Khẩu</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 32,
    flexGrow: 1,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoImage: {
    width: 210,
    height: 56,
    marginBottom: 12,
  },
  badge: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 8,
  },
  badgeText: {
    color: '#166534',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 18,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 6,
    marginBottom: 16,
  },
  errorText: {
    color: '#991b1b',
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
    lineHeight: 18,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: '#334155',
    marginBottom: 6,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 12,
    height: 46,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '400',
    height: '100%',
  },
  eyeBtn: {
    padding: 6,
  },
  optionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    marginTop: -2,
  },
  rememberWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rememberText: {
    fontSize: 12.5,
    color: '#475569',
    fontWeight: '400',
  },
  loginBtn: {
    backgroundColor: '#059669',
    borderRadius: 8,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginBtnDisabled: {
    opacity: 0.65,
  },
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  footer: {
    marginTop: 28,
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  footerHotline: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '500',
  },
  hotlineNumber: {
    color: '#059669',
    fontWeight: '700',
  },
  footerSub: {
    fontSize: 11.5,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 16,
  },
  forgotLinkText: {
    fontSize: 12.5,
    color: '#0284c7',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    padding: 18,
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#f0f9ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  modalSubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  modalErrorBox: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 6,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalErrorText: {
    fontSize: 12,
    color: '#991b1b',
    fontWeight: '500',
    flex: 1,
  },
  modalSuccessBox: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 6,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalSuccessText: {
    fontSize: 12,
    color: '#166534',
    fontWeight: '500',
    flex: 1,
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 4,
  },
  modalInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 10,
    height: 42,
  },
  modalInput: {
    flex: 1,
    fontSize: 13,
    color: '#0f172a',
    height: '100%',
  },
  otpBtn: {
    backgroundColor: '#0284c7',
    borderRadius: 6,
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
    height: 42,
  },
  otpBtnDisabled: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  otpBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  otpBtnTextDisabled: {
    color: '#64748b',
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  modalSubmitBtn: {
    flex: 2,
    backgroundColor: '#059669',
    borderRadius: 6,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSubmitText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
});
