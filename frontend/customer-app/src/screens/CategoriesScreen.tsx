import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Platform, StatusBar } from 'react-native';
import { ProductCard } from '../components/ProductCard';
import { MOCK_PRODUCTS, MOCK_CATEGORIES } from '../data/mockData';
import { CategoryType, Product } from '../types/product';
import { COLORS } from '../theme/colors';
import { useCart } from '../context/CartContext';
import { Filter, ArrowUpDown } from 'lucide-react-native';

interface CategoriesScreenProps {
  initialCategory?: CategoryType;
  onNavigateToCart: () => void;
}

export const CategoriesScreen: React.FC<CategoriesScreenProps> = ({
  initialCategory = 'Rau củ quả',
  onNavigateToCart,
}) => {
  const { addToCart, products } = useCart();
  const [activeCategory, setActiveCategory] = useState<string>(initialCategory);
  const [sortOrder, setSortOrder] = useState<'POPULAR' | 'PRICE_ASC' | 'PRICE_DESC'>('POPULAR');

  let filteredProducts = products.filter(p => p.category === activeCategory);

  if (sortOrder === 'PRICE_ASC') {
    filteredProducts = [...filteredProducts].sort((a, b) => a.price - b.price);
  } else if (sortOrder === 'PRICE_DESC') {
    filteredProducts = [...filteredProducts].sort((a, b) => b.price - a.price);
  }

  return (
    <SafeAreaView style={styles.safeContainer}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Danh Mục Sản Phẩm</Text>
        <TouchableOpacity style={styles.sortBtn} onPress={() => {
          if (sortOrder === 'POPULAR') setSortOrder('PRICE_ASC');
          else if (sortOrder === 'PRICE_ASC') setSortOrder('PRICE_DESC');
          else setSortOrder('POPULAR');
        }}>
          <ArrowUpDown size={14} color={COLORS.primary} style={{ marginRight: 4 }} />
          <Text style={styles.sortText}>
            {sortOrder === 'POPULAR' ? 'Phổ biến' : sortOrder === 'PRICE_ASC' ? 'Giá tăng dần' : 'Giá giảm dần'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.body}>
        {/* Left Sidebar Categories */}
        <ScrollView style={styles.sidebar} showsVerticalScrollIndicator={false}>
          {MOCK_CATEGORIES.map(cat => {
            const isActive = activeCategory === cat.name;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[styles.sidebarItem, isActive && styles.sidebarItemActive]}
                onPress={() => setActiveCategory(cat.name)}
                activeOpacity={0.8}
              >
                <Text style={[styles.sidebarText, isActive && styles.sidebarTextActive]}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Right Product Grid */}
        <ScrollView style={styles.productArea} contentContainerStyle={styles.productGridContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.categoryHeading}>{activeCategory} ({filteredProducts.length})</Text>
          <View style={styles.grid}>
            {filteredProducts.map(product => (
              <ProductCard
                key={`cat-${product.id}`}
                product={product}
                onPress={() => {}}
                onAddToCart={() => addToCart(product, 1)}
              />
            ))}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: COLORS.surface,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    height: 50,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  sortText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  body: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    width: 105,
    backgroundColor: '#F8F9FA',
    borderRightWidth: 1,
    borderColor: COLORS.border,
  },
  sidebarItem: {
    paddingVertical: 16,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderColor: COLORS.borderLight,
  },
  sidebarItemActive: {
    backgroundColor: COLORS.surface,
    borderLeftWidth: 4,
    borderColor: COLORS.primary,
  },
  sidebarText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  sidebarTextActive: {
    color: COLORS.primaryDark,
    fontWeight: '800',
  },
  productArea: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 10,
  },
  productGridContent: {
    paddingBottom: 30,
  },
  categoryHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 10,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
});
