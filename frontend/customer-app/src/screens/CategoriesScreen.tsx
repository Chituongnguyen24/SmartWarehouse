import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  StatusBar,
  Modal,
  Image,
  ActivityIndicator,
} from 'react-native';
import { ProductCard } from '../components/ProductCard';
import { CategoryType, Product } from '../types/product';
import { COLORS } from '../theme/colors';
import { useCart } from '../context/CartContext';
import { ArrowUpDown, ShoppingCart, X, Plus, ShieldCheck, Zap } from 'lucide-react-native';

interface CategoriesScreenProps {
  initialCategory?: CategoryType | string;
  onNavigateToCart: () => void;
}

export const CategoriesScreen: React.FC<CategoriesScreenProps> = ({
  initialCategory = 'Tất cả',
  onNavigateToCart,
}) => {
  const { addToCart, products, categories, totalProductsCount, getProductsByCategory, totalItemsCount } = useCart();
  const [activeCategory, setActiveCategory] = useState<string>(initialCategory || 'Tất cả');
  const [categoryProducts, setCategoryProducts] = useState<Product[]>(products);
  const [isLoadingCategory, setIsLoadingCategory] = useState(false);
  const [sortOrder, setSortOrder] = useState<'POPULAR' | 'PRICE_ASC' | 'PRICE_DESC'>('POPULAR');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [detailQty, setDetailQty] = useState(1);

  // Load products when activeCategory changes
  useEffect(() => {
    let isMounted = true;
    async function loadCategory() {
      if (activeCategory === 'Tất cả') {
        setCategoryProducts(products);
        return;
      }
      setIsLoadingCategory(true);
      const prods = await getProductsByCategory(activeCategory);
      if (isMounted) {
        setCategoryProducts(prods);
        setIsLoadingCategory(false);
      }
    }
    loadCategory();
    return () => {
      isMounted = false;
    };
  }, [activeCategory, products]);

  const allCategoryOptions = [
    { id: 'all', name: 'Tất cả', count: totalProductsCount || products.length, emoji: '🛒' },
    ...categories,
  ];

  let displayList = [...categoryProducts];
  if (sortOrder === 'PRICE_ASC') {
    displayList.sort((a, b) => a.price - b.price);
  } else if (sortOrder === 'PRICE_DESC') {
    displayList.sort((a, b) => b.price - a.price);
  } else {
    displayList.sort((a, b) => b.soldCount - a.soldCount);
  }

  const handleOpenDetail = (product: Product) => {
    setSelectedProduct(product);
    setDetailQty(1);
  };

  const handleAddToCartDetail = () => {
    if (selectedProduct) {
      addToCart(selectedProduct, detailQty);
      setSelectedProduct(null);
    }
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Danh Mục Sản Phẩm</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.sortBtn}
            onPress={() => {
              if (sortOrder === 'POPULAR') setSortOrder('PRICE_ASC');
              else if (sortOrder === 'PRICE_ASC') setSortOrder('PRICE_DESC');
              else setSortOrder('POPULAR');
            }}
          >
            <ArrowUpDown size={14} color={COLORS.primary} style={{ marginRight: 4 }} />
            <Text style={styles.sortText}>
              {sortOrder === 'POPULAR' ? 'Phổ biến' : sortOrder === 'PRICE_ASC' ? 'Giá tăng' : 'Giá giảm'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cartIconBtn} onPress={onNavigateToCart}>
            <ShoppingCart size={20} color={COLORS.textPrimary} />
            {totalItemsCount > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{totalItemsCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.body}>
        {/* Left Sidebar Categories */}
        <ScrollView style={styles.sidebar} showsVerticalScrollIndicator={false}>
          {allCategoryOptions.map(cat => {
            const isActive = activeCategory === cat.name;

            return (
              <TouchableOpacity
                key={cat.id || cat.name}
                style={[styles.sidebarItem, isActive && styles.sidebarItemActive]}
                onPress={() => setActiveCategory(cat.name)}
                activeOpacity={0.8}
              >
                <Text style={styles.sidebarEmoji}>{cat.emoji}</Text>
                <Text
                  style={[styles.sidebarText, isActive && styles.sidebarTextActive]}
                  numberOfLines={2}
                >
                  {cat.name}
                </Text>
                <View style={[styles.countBadge, isActive && styles.countBadgeActive]}>
                  <Text style={[styles.countText, isActive && styles.countTextActive]}>
                    {cat.count}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Right Product Grid */}
        <ScrollView
          style={styles.productArea}
          contentContainerStyle={styles.productGridContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.categoryHeadingRow}>
            <Text style={styles.categoryHeading}>{activeCategory}</Text>
            <Text style={styles.categoryCount}>({displayList.length} sản phẩm)</Text>
          </View>

          {isLoadingCategory ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={styles.loadingText}>Đang tải sản phẩm từ kho...</Text>
            </View>
          ) : displayList.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={{ fontSize: 36 }}>🛒</Text>
              <Text style={styles.emptyText}>Chưa có sản phẩm trong danh mục này</Text>
            </View>
          ) : (
            <View style={styles.grid}>
              {displayList.map(product => (
                <View key={`cat-${product.id}`} style={styles.productCardWrapper}>
                  <ProductCard
                    product={product}
                    onPress={() => handleOpenDetail(product)}
                    onAddToCart={() => addToCart(product, 1)}
                  />
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </View>

      {/* PRODUCT DETAIL MODAL */}
      <Modal
        visible={!!selectedProduct}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedProduct(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedProduct && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle} numberOfLines={1}>
                    Thông tin sản phẩm
                  </Text>
                  <TouchableOpacity
                    onPress={() => setSelectedProduct(null)}
                    style={styles.closeBtn}
                  >
                    <X size={20} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} style={styles.modalBody}>
                  <Image
                    source={{ uri: selectedProduct.imageUrl }}
                    style={styles.modalImage}
                    resizeMode="cover"
                  />

                  {selectedProduct.isFlashSale && (
                    <View style={styles.flashBadge}>
                      <Zap size={12} color={COLORS.surface} fill={COLORS.surface} />
                      <Text style={styles.flashBadgeText}>
                        FLASH SALE GIẢM {selectedProduct.discountPercent || 15}%
                      </Text>
                    </View>
                  )}

                  <Text style={styles.modalProductName}>{selectedProduct.name}</Text>
                  <Text style={styles.modalCategoryText}>
                    Danh mục: {selectedProduct.category} | ĐVT: {selectedProduct.unit}
                  </Text>

                  <View style={styles.priceRow}>
                    <Text style={styles.modalPrice}>
                      {selectedProduct.price.toLocaleString('vi-VN')} đ
                    </Text>
                    {selectedProduct.originalPrice && selectedProduct.originalPrice > selectedProduct.price && (
                      <Text style={styles.modalOldPrice}>
                        {selectedProduct.originalPrice.toLocaleString('vi-VN')} đ
                      </Text>
                    )}
                  </View>

                  {/* Attributes */}
                  <View style={styles.infoBox}>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Xuất xứ:</Text>
                      <Text style={styles.infoValue}>{selectedProduct.origin || 'Việt Nam'}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Bảo quản:</Text>
                      <Text style={styles.infoValue}>
                        {selectedProduct.preservation || 'Kho mát'}
                      </Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Tồn kho:</Text>
                      <Text style={styles.infoValue}>{selectedProduct.stock} {selectedProduct.unit}</Text>
                    </View>
                  </View>

                  {/* Description */}
                  <Text style={styles.descHeading}>Mô tả sản phẩm</Text>
                  <Text style={styles.descText}>{selectedProduct.description}</Text>

                  <View style={styles.guaranteeBox}>
                    <ShieldCheck size={16} color={COLORS.primary} />
                    <Text style={styles.guaranteeText}>
                      Cam kết hàng tươi mới trong ngày, bao đổi trả nếu hư hỏng.
                    </Text>
                  </View>
                </ScrollView>

                {/* Bottom Add to Cart Action */}
                <View style={styles.modalFooter}>
                  <View style={styles.qtyControl}>
                    <TouchableOpacity
                      style={styles.qtyBtn}
                      onPress={() => setDetailQty(Math.max(1, detailQty - 1))}
                    >
                      <Text style={styles.qtyBtnText}>-</Text>
                    </TouchableOpacity>
                    <Text style={styles.qtyNumber}>{detailQty}</Text>
                    <TouchableOpacity
                      style={styles.qtyBtn}
                      onPress={() => setDetailQty(detailQty + 1)}
                    >
                      <Text style={styles.qtyBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    style={styles.addToCartBtn}
                    onPress={handleAddToCartDetail}
                    activeOpacity={0.8}
                  >
                    <ShoppingCart size={18} color={COLORS.surface} style={{ marginRight: 6 }} />
                    <Text style={styles.addToCartText}>
                      Thêm {(selectedProduct.price * detailQty).toLocaleString('vi-VN')} đ
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
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
    height: 52,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  sortText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  cartIconBtn: {
    position: 'relative',
    padding: 6,
  },
  cartBadge: {
    position: 'absolute',
    top: 2,
    right: 0,
    backgroundColor: COLORS.discount,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  cartBadgeText: {
    color: COLORS.surface,
    fontSize: 9,
    fontWeight: '800',
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
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: COLORS.borderLight,
  },
  sidebarItemActive: {
    backgroundColor: COLORS.surface,
    borderLeftWidth: 4,
    borderColor: COLORS.primary,
  },
  sidebarEmoji: {
    fontSize: 20,
    marginBottom: 4,
  },
  sidebarText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '600',
    textAlign: 'center',
  },
  sidebarTextActive: {
    color: COLORS.primaryDark,
    fontWeight: '800',
  },
  countBadge: {
    backgroundColor: '#E0E0E0',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginTop: 4,
  },
  countBadgeActive: {
    backgroundColor: COLORS.primaryLight,
  },
  countText: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  countTextActive: {
    color: COLORS.primaryDark,
  },
  productArea: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 8,
  },
  productGridContent: {
    paddingBottom: 40,
  },
  categoryHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  categoryHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  categoryCount: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textMuted,
    marginLeft: 6,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
  },
  loadingText: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  productCardWrapper: {
    width: '49%',
    marginBottom: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    minHeight: '60%',
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: COLORS.borderLight,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  closeBtn: {
    padding: 4,
  },
  modalBody: {
    padding: 16,
  },
  modalImage: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    marginBottom: 12,
  },
  flashBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: COLORS.accent,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 8,
    gap: 4,
  },
  flashBadgeText: {
    color: COLORS.surface,
    fontSize: 10,
    fontWeight: '800',
  },
  modalProductName: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  modalCategoryText: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  modalPrice: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.primaryDark,
    marginRight: 10,
  },
  modalOldPrice: {
    fontSize: 14,
    color: COLORS.textMuted,
    textDecorationLine: 'line-through',
  },
  infoBox: {
    backgroundColor: '#F8F9FA',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  infoLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  infoValue: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  descHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  descText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 18,
    marginBottom: 12,
  },
  guaranteeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    padding: 10,
    borderRadius: 8,
    gap: 8,
    marginBottom: 16,
  },
  guaranteeText: {
    fontSize: 11,
    color: COLORS.primaryDark,
    fontWeight: '600',
    flex: 1,
  },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderColor: COLORS.borderLight,
    gap: 12,
  },
  qtyControl: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
  },
  qtyBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  qtyBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  qtyNumber: {
    fontSize: 14,
    fontWeight: '700',
    paddingHorizontal: 8,
  },
  addToCartBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    paddingVertical: 10,
  },
  addToCartText: {
    color: COLORS.surface,
    fontSize: 14,
    fontWeight: '800',
  },
});
