import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS } from '../theme/colors';
import { CategoryType } from '../types/product';
import { useCart } from '../context/CartContext';

interface CategoryGridProps {
  selectedCategory?: string;
  onSelectCategory: (category: CategoryType | 'Tất cả') => void;
}

export const CategoryGrid: React.FC<CategoryGridProps> = ({ selectedCategory = 'Tất cả', onSelectCategory }) => {
  const { categories } = useCart();

  const displayCategories = [
    { id: 'all', name: 'Tất cả', emoji: '🛒', color: '#E8F5E9' },
    ...categories,
  ];

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>Danh mục thực phẩm</Text>
        <Text style={styles.subtitle}>Tươi ngon mỗi ngày</Text>
      </View>
      <View style={styles.grid}>
        {displayCategories.map(cat => {
          const isSelected = selectedCategory === cat.name;
          return (
            <TouchableOpacity
              key={cat.id || cat.name}
              style={styles.item}
              onPress={() => onSelectCategory(cat.name as any)}
              activeOpacity={0.7}
            >
              <View style={[
                styles.iconCircle, 
                { backgroundColor: isSelected ? COLORS.primary : (cat.color || '#F8F9FA') },
                isSelected && styles.iconCircleSelected
              ]}>
                <Text style={{ fontSize: 24 }}>{cat.emoji || '🛒'}</Text>
              </View>
              <Text style={[styles.label, isSelected && styles.labelSelected]} numberOfLines={2}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginTop: 8,
    borderRadius: 12,
    marginHorizontal: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  item: {
    width: '25%',
    alignItems: 'center',
    marginBottom: 14,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  iconCircleSelected: {
    borderWidth: 2,
    borderColor: COLORS.primaryDark,
    transform: [{ scale: 1.05 }],
  },
  label: {
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 2,
    lineHeight: 14,
  },
  labelSelected: {
    color: COLORS.primary,
    fontWeight: '700',
  },
});
