import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Image,
  Alert,
} from 'react-native';
import { HeaderBar } from '../components/HeaderBar';
import { BannerSlider } from '../components/BannerSlider';
import { CategoryGrid } from '../components/CategoryGrid';
import { ProductCard } from '../components/ProductCard';
import { MOCK_PRODUCTS } from '../data/mockData';
import { Product, CategoryType } from '../types/product';
import { COLORS } from '../theme/colors';
import { useCart } from '../context/CartContext';
import { Zap, Clock, ShieldCheck, X, Plus, ShoppingCart, Award } from 'lucide-react-native';

interface HomeScreenProps {
  onNavigateToCart: () => void;
  onNavigateToCategories: (category?: CategoryType) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onNavigateToCart,
  onNavigateToCategories,
}) => {
  const { addToCart, products, isLoadingProducts } = useCart();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Tất cả');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [detailQty, setDetailQty] = useState(1);

  // Filter products from Real API state
  const filteredProducts = products.filter(p => {
    const matchesCat = selectedCategory === 'Tất cả' || p.category === selectedCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const flashSaleProducts = products.filter(p => p.isFlashSale);

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
    <View style={styles.container}>
      <HeaderBar onPressCart={onNavigateToCart} onSearchChange={setSearchQuery} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Banner Carousel */}
        <BannerSlider />

        {/* Category Icons */}
        <CategoryGrid
          selectedCategory={selectedCategory}
          onSelectCategory={(cat) => {
            setSelectedCategory(cat);
            if (cat !== 'Tất cả') {
              onNavigateToCategories(cat as CategoryType);
            }
          }}
        />

        {/* FLASH SALE BLOCK */}
        <View style={styles.flashSaleContainer}>
          <View style={styles.flashSaleHeader}>
            <View style={styles.flashSaleTitleBox}>
              <Zap size={20} color={COLORS.accent} fill={COLORS.accent} />
              <Text style={styles.flashSaleTitle}>GIÁ SỐC HÔM NAY</Text>
            </View>
            <View style={styles.timerBox}>
              <Clock size={12} color={COLORS.surface} />
              <Text style={styles.timerText}>Kết thúc: 04:32:15</Text>
            </View>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.flashSaleScroll}>
            {flashSaleProducts.map(product => (
              <View key={`fs-${product.id}`} style={styles.flashSaleItemWrapper}>
                <ProductCard
                  product={product}
                  onPress={() => handleOpenDetail(product)}
                  onAddToCart={() => addToCart(product, 1)}
                />
              </View>
            ))}
          </ScrollView>
        </View>

        {/* PRODUCT GRID SECTION */}
        <View style={styles.productsSection}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleRow}>
              <Award size={18} color={COLORS.primary} />
              <Text style={styles.sectionTitleText}>Tươi Ngon Mỗi Ngày</Text>
            </View>
            <TouchableOpacity onPress={() => onNavigateToCategories()}>
              <Text style={styles.seeAllText}>Xem tất cả ({filteredProducts.length})</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.productGrid}>
            {filteredProducts.map(product => (
              <ProductCard
                key={product.id}
                product={product}
                onPress={() => handleOpenDetail(product)}
                onAddToCart={() => addToCart(product, 1)}
              />
            ))}
          </View>
        </View>

        {/* FOOTER GUARANTEE BANNER */}
        <View style={styles.guaranteeBanner}>
          <ShieldCheck size={28} color={COLORS.primary} />
          <View style={styles.guaranteeTextContainer}>
            <Text style={styles.guaranteeTitle}>Cam kết Thực Phẩm Tươi Sạch CityMart</Text>
            <Text style={styles.guaranteeDesc}>
              100% Thực phẩm tươi sạch • Soạn hàng chuẩn FEFO • Giao đúng hẹn 2h
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* PRODUCT DETAIL MODAL */}
      {selectedProduct && (
        <Modal visible={true} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setSelectedProduct(null)}>
                <X size={20} color={COLORS.textPrimary} />
              </TouchableOpacity>

              <Image source={{ uri: selectedProduct.imageUrl }} style={styles.detailImage} />

              <View style={styles.detailBody}>
                <View style={styles.detailHeaderRow}>
                  <Text style={styles.detailUnitTag}>{selectedProduct.unit}</Text>
                  {selectedProduct.discountPercent && (
                    <Text style={styles.detailDiscountTag}>-{selectedProduct.discountPercent}%</Text>
                  )}
                </View>

                <Text style={styles.detailTitle}>{selectedProduct.name}</Text>

                <View style={styles.detailPriceRow}>
                  <Text style={styles.detailPrice}>
                    {selectedProduct.price.toLocaleString('vi-VN')}đ
                  </Text>
                  {selectedProduct.originalPrice && (
                    <Text style={styles.detailOriginalPrice}>
                      {selectedProduct.originalPrice.toLocaleString('vi-VN')}đ
                    </Text>
                  )}
                </View>

                <View style={styles.infoBox}>
                  <Text style={styles.infoLine}>📍 Xuất xứ: <Text style={styles.infoVal}>{selectedProduct.origin}</Text></Text>
                  <Text style={styles.infoLine}>❄️ Bảo quản: <Text style={styles.infoVal}>{selectedProduct.preservation}</Text></Text>
                  <Text style={styles.infoDesc}>{selectedProduct.description}</Text>
                </View>

                {/* Quantity selector & Add to cart */}
                <View style={styles.detailActionRow}>
                  <View style={styles.modalQtyBox}>
                    <TouchableOpacity
                      style={styles.modalQtyBtn}
                      onPress={() => setDetailQty(Math.max(1, detailQty - 1))}
                    >
                      <Text style={styles.modalQtyBtnText}>-</Text>
                    </TouchableOpacity>
                    <Text style={styles.modalQtyText}>{detailQty}</Text>
                    <TouchableOpacity
                      style={styles.modalQtyBtn}
                      onPress={() => setDetailQty(detailQty + 1)}
                    >
                      <Text style={styles.modalQtyBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    style={styles.modalAddBtn}
                    onPress={handleAddToCartDetail}
                    activeOpacity={0.8}
                  >
                    <ShoppingCart size={18} color={COLORS.surface} style={{ marginRight: 6 }} />
                    <Text style={styles.modalAddBtnText}>
                      Thêm vào giỏ ({(selectedProduct.price * detailQty).toLocaleString('vi-VN')}đ)
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  flashSaleContainer: {
    backgroundColor: COLORS.primaryDark,
    marginTop: 12,
    paddingVertical: 12,
  },
  flashSaleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  flashSaleTitleBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  flashSaleTitle: {
    color: COLORS.accent,
    fontSize: 16,
    fontWeight: '900',
    marginLeft: 6,
    letterSpacing: 0.5,
  },
  timerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  timerText: {
    color: COLORS.surface,
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 4,
  },
  flashSaleScroll: {
    paddingLeft: 12,
    paddingRight: 6,
  },
  flashSaleItemWrapper: {
    width: 165,
    marginRight: 10,
  },
  productsSection: {
    marginTop: 14,
    paddingHorizontal: 10,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitleText: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginLeft: 6,
  },
  seeAllText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600',
  },
  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  guaranteeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    marginHorizontal: 10,
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 136, 72, 0.2)',
  },
  guaranteeTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  guaranteeTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.primaryDark,
    marginBottom: 2,
  },
  guaranteeDesc: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  // Modal styles
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
    overflow: 'hidden',
  },
  closeBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 20,
    backgroundColor: COLORS.surfaceSecondary,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailImage: {
    width: '100%',
    height: 220,
    backgroundColor: '#F3F4F6',
  },
  detailBody: {
    padding: 16,
  },
  detailHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailUnitTag: {
    backgroundColor: COLORS.primaryLight,
    color: COLORS.primary,
    fontWeight: '700',
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  detailDiscountTag: {
    backgroundColor: COLORS.discount,
    color: COLORS.surface,
    fontWeight: '800',
    fontSize: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  detailPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  detailPrice: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.discount,
    marginRight: 10,
  },
  detailOriginalPrice: {
    fontSize: 14,
    color: COLORS.textMuted,
    textDecorationLine: 'line-through',
  },
  infoBox: {
    backgroundColor: COLORS.background,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  infoLine: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  infoVal: {
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  infoDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 6,
    lineHeight: 18,
  },
  detailActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalQtyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    marginRight: 12,
  },
  modalQtyBtn: {
    width: 36,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceSecondary,
  },
  modalQtyBtnText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  modalQtyText: {
    width: 40,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  modalAddBtn: {
    flex: 1,
    height: 44,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalAddBtnText: {
    color: COLORS.surface,
    fontSize: 14,
    fontWeight: '800',
  },
});
