import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  StatusBar,
  Image,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../theme/colors';
import {
  User,
  MapPin,
  Ticket,
  Headphones,
  Award,
  ChevronRight,
  Shield,
  LogOut,
  Bell,
} from 'lucide-react-native';

export const ProfileScreen: React.FC = () => {
  const { user, addresses, selectedAddress } = useAuth();

  return (
    <SafeAreaView style={styles.safeContainer}>
      {/* Header Bar */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Tài Khoản Khách Hàng</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* User Card */}
        <View style={styles.userCard}>
          <Image source={{ uri: user.avatar }} style={styles.avatar} />
          <View style={styles.userInfo}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.userName}>{user.name}</Text>
              <View style={styles.tierBadge}>
                <Award size={10} color={COLORS.primaryDark} />
                <Text style={styles.tierText}>Thành viên {user.memberTier}</Text>
              </View>
            </View>
            <Text style={styles.userPhone}>{user.phone}</Text>
            <Text style={styles.userEmail}>{user.email}</Text>
          </View>
        </View>

        {/* Member Points Banner */}
        <View style={styles.pointsCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.pointsTitle}>Điểm tích lũy FreshKeep Mart</Text>
            <Text style={styles.pointsVal}>{user.points.toLocaleString()} điểm</Text>
            <Text style={styles.pointsSub}>Đổi điểm lấy mã giảm giá cho đơn tiếp theo</Text>
          </View>
          <TouchableOpacity style={styles.redeemBtn}>
            <Text style={styles.redeemText}>Đổi quà</Text>
          </TouchableOpacity>
        </View>

        {/* Menu Section */}
        <View style={styles.menuSection}>
          <TouchableOpacity style={styles.menuItem} activeOpacity={0.7}>
            <MapPin size={20} color={COLORS.primary} />
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>Sổ địa chỉ giao hàng</Text>
              <Text style={styles.menuSub} numberOfLines={1}>
                Mặc định: {selectedAddress.fullAddress}
              </Text>
            </View>
            <ChevronRight size={18} color={COLORS.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} activeOpacity={0.7}>
            <Ticket size={20} color={COLORS.accentDark} />
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>Kho Voucher & Ưu đãi của tôi</Text>
              <Text style={styles.menuSub}>Đang có 3 voucher có thể sử dụng</Text>
            </View>
            <ChevronRight size={18} color={COLORS.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} activeOpacity={0.7}>
            <Bell size={20} color="#2196F3" />
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>Thông báo đơn hàng & Khuyến mãi</Text>
              <Text style={styles.menuSub}>Bật nhận tin nhắn giao hàng nhanh</Text>
            </View>
            <ChevronRight size={18} color={COLORS.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} activeOpacity={0.7}>
            <Headphones size={20} color="#9C27B0" />
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>Trung tâm hỗ trợ khách hàng</Text>
              <Text style={styles.menuSub}>Hotline: 1900 1908 (8:00 - 21:00)</Text>
            </View>
            <ChevronRight size={18} color={COLORS.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} activeOpacity={0.7}>
            <Shield size={20} color={COLORS.primary} />
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>Chính sách bảo vệ thông tin & Đổi trả</Text>
              <Text style={styles.menuSub}>Đổi trả trong 24h nếu thực phẩm không tươi</Text>
            </View>
            <ChevronRight size={18} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn}>
          <LogOut size={18} color={COLORS.discount} />
          <Text style={styles.logoutText}>Đăng xuất tài khoản</Text>
        </TouchableOpacity>
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
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  scrollContent: {
    padding: 10,
    paddingBottom: 24,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F3F4F6',
  },
  userInfo: {
    marginLeft: 12,
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginRight: 6,
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accent,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  tierText: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.primaryDark,
    marginLeft: 2,
  },
  userPhone: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  userEmail: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  pointsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryDark,
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
  },
  pointsTitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 11,
    fontWeight: '600',
  },
  pointsVal: {
    color: COLORS.accent,
    fontSize: 20,
    fontWeight: '900',
    marginVertical: 2,
  },
  pointsSub: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 10,
  },
  redeemBtn: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  redeemText: {
    color: COLORS.primaryDark,
    fontSize: 12,
    fontWeight: '800',
  },
  menuSection: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: COLORS.borderLight,
  },
  menuTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  menuTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  menuSub: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    paddingVertical: 14,
    borderRadius: 12,
  },
  logoutText: {
    color: COLORS.discount,
    fontSize: 13,
    fontWeight: '800',
    marginLeft: 6,
  },
});
