import React from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, TouchableOpacity } from 'react-native';
import { COLORS } from '../theme/colors';
import { MOCK_BANNERS } from '../data/mockData';
import { Sparkles, Zap, Truck } from 'lucide-react-native';

const { width } = Dimensions.get('window');

export const BannerSlider: React.FC = () => {
  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {MOCK_BANNERS.map(banner => (
          <TouchableOpacity
            key={banner.id}
            style={[styles.bannerCard, { backgroundColor: banner.bg }]}
            activeOpacity={0.9}
          >
            <View style={styles.badgeContainer}>
              {banner.id === 'b1' && <Sparkles size={12} color={COLORS.primary} />}
              {banner.id === 'b2' && <Zap size={12} color={COLORS.primary} />}
              {banner.id === 'b3' && <Truck size={12} color={COLORS.primary} />}
              <Text style={styles.badgeText}>{banner.badge}</Text>
            </View>
            <Text style={styles.bannerTitle}>{banner.title}</Text>
            <Text style={styles.bannerSubtitle}>{banner.subtitle}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 10,
    marginHorizontal: 10,
  },
  scrollContent: {
    paddingRight: 10,
  },
  bannerCard: {
    width: width - 36,
    borderRadius: 12,
    padding: 16,
    marginRight: 10,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  badgeContainer: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accent,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginBottom: 8,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.primaryDark,
    marginLeft: 4,
  },
  bannerTitle: {
    color: COLORS.surface,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  bannerSubtitle: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 12,
    fontWeight: '500',
  },
});
