import React from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, SafeAreaView, Platform, StatusBar } from 'react-native';
import { MapPin, Search, ShoppingBag, ChevronDown, Bell } from 'lucide-react-native';
import { COLORS } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

interface HeaderBarProps {
  onPressCart?: () => void;
  onSearchChange?: (text: string) => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({ onPressCart, onSearchChange }) => {
  const { selectedAddress } = useAuth();
  const { totalItemsCount } = useCart();

  return (
    <SafeAreaView style={styles.safeContainer}>
      <View style={styles.container}>
        {/* Top Location Row */}
        <View style={styles.locationRow}>
          <TouchableOpacity style={styles.locationPicker} activeOpacity={0.8}>
            <MapPin size={16} color={COLORS.accent} style={styles.locationIcon} />
            <Text style={styles.locationLabel}>Giao đến: </Text>
            <Text style={styles.locationText} numberOfLines={1}>
              {selectedAddress ? selectedAddress.fullAddress : 'Chọn địa chỉ giao hàng'}
            </Text>
            <ChevronDown size={14} color={COLORS.surface} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.iconBtn}>
            <Bell size={20} color={COLORS.surface} />
          </TouchableOpacity>
        </View>

        {/* Search Bar & Cart Row */}
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Search size={18} color={COLORS.textMuted} style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm thịt tươi, rau sạch, gia vị..."
              placeholderTextColor={COLORS.textMuted}
              onChangeText={onSearchChange}
            />
          </View>

          <TouchableOpacity style={styles.cartBtn} onPress={onPressCart} activeOpacity={0.85}>
            <ShoppingBag size={22} color={COLORS.primary} />
            {totalItemsCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{totalItemsCount > 99 ? '99+' : totalItemsCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeContainer: {
    backgroundColor: COLORS.primary,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    marginTop: 6,
  },
  locationPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  locationIcon: {
    marginRight: 4,
  },
  locationLabel: {
    color: COLORS.accent,
    fontSize: 12,
    fontWeight: '700',
  },
  locationText: {
    color: COLORS.surface,
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
    marginRight: 4,
  },
  iconBtn: {
    padding: 6,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    height: 40,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginRight: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textPrimary,
  },
  cartBtn: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: COLORS.discount,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: COLORS.surface,
  },
  badgeText: {
    color: COLORS.surface,
    fontSize: 10,
    fontWeight: '800',
  },
});
