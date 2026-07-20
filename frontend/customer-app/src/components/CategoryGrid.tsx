import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { COLORS } from '../theme/colors';
import { CategoryType } from '../types/product';

interface CategoryGridProps {
  selectedCategory?: string;
  onSelectCategory: (category: CategoryType | 'Tất cả') => void;
}

const CATEGORIES = [
  { name: 'Tất cả', icon: '🛒', color: '#E8F5E9' },
  { name: 'Rau củ quả', icon: '🥬', color: '#E8F5E9' },
  { name: 'Thịt cá', icon: '🥩', color: '#FFEBEE' },
  { name: 'Đông lạnh', icon: '🧊', color: '#E3F2FD' },
  { name: 'Sữa & đồ uống', icon: '🥛', color: '#FFF8E1' },
  { name: 'Đồ khô', icon: '🌾', color: '#F3E5F5' },
  { name: 'Gia vị & Dầu ăn', icon: '🧴', color: '#EFEBE9' },
];

export const CategoryGrid: React.FC<CategoryGridProps> = ({ selectedCategory = 'Tất cả', onSelectCategory }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Danh mục thực phẩm</Text>
      <View style={styles.grid}>
        {CATEGORIES.map(cat => {
          const isSelected = selectedCategory === cat.name;
          return (
            <TouchableOpacity
              key={cat.name}
              style={styles.item}
              onPress={() => onSelectCategory(cat.name as any)}
              activeOpacity={0.7}
            >
              <View style={[styles.iconCircle, { backgroundColor: isSelected ? COLORS.primary : cat.color }]}>
                <Text style={{ fontSize: 24 }}>{cat.icon}</Text>
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
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  item: {
    width: '25%',
    alignItems: 'center',
    marginBottom: 12,
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
  label: {
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 2,
  },
  labelSelected: {
    color: COLORS.primary,
    fontWeight: '700',
  },
});
