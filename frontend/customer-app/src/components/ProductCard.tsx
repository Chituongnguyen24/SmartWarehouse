import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Plus, Star, ShieldCheck } from 'lucide-react-native';
import { Product } from '../types/product';
import { COLORS } from '../theme/colors';

interface ProductCardProps {
  product: Product;
  onPress: () => void;
  onAddToCart: () => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onPress, onAddToCart }) => {
  const formatPrice = (amount: number) => {
    return amount.toLocaleString('vi-VN') + 'đ';
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.88}>
      {/* Discount Badge */}
      {product.discountPercent && (
        <View style={styles.discountBadge}>
          <Text style={styles.discountText}>-{product.discountPercent}%</Text>
        </View>
      )}

      {/* Image Container */}
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: product.imageUrl }}
          style={styles.image}
          resizeMode="cover"
        />
        {product.origin && (
          <View style={styles.originTag}>
            <ShieldCheck size={10} color={COLORS.primary} />
            <Text style={styles.originText}>{product.origin}</Text>
          </View>
        )}
      </View>

      {/* Content Container */}
      <View style={styles.content}>
        <Text style={styles.unitText}>{product.unit}</Text>
        <Text style={styles.productName} numberOfLines={2}>
          {product.name}
        </Text>

        {/* Rating & Sold count */}
        <View style={styles.ratingRow}>
          <Star size={11} color={COLORS.accent} fill={COLORS.accent} />
          <Text style={styles.ratingText}>{product.rating}</Text>
          <Text style={styles.soldText}>| Đã bán {product.soldCount}</Text>
        </View>

        {/* Price & Add button row */}
        <View style={styles.footerRow}>
          <View style={styles.priceContainer}>
            <Text style={styles.price}>{formatPrice(product.price)}</Text>
            {product.originalPrice && (
              <Text style={styles.originalPrice}>{formatPrice(product.originalPrice)}</Text>
            )}
          </View>

          <TouchableOpacity
            style={styles.addBtn}
            onPress={(e) => {
              e.stopPropagation();
              onAddToCart();
            }}
            activeOpacity={0.7}
          >
            <Plus size={18} color={COLORS.surface} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    width: '48%',
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
    position: 'relative',
  },
  discountBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: COLORS.discount,
    borderBottomLeftRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    zIndex: 10,
  },
  discountText: {
    color: COLORS.surface,
    fontSize: 10,
    fontWeight: '800',
  },
  imageContainer: {
    width: '100%',
    height: 125,
    backgroundColor: '#F9FAFB',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  originTag: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  originText: {
    fontSize: 9,
    fontWeight: '600',
    color: COLORS.primaryDark,
    marginLeft: 2,
  },
  content: {
    padding: 8,
    flex: 1,
    justifyContent: 'space-between',
  },
  unitText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
    alignSelf: 'flex-start',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
    marginBottom: 4,
  },
  productName: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textPrimary,
    lineHeight: 16,
    marginBottom: 4,
    height: 32,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  ratingText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginLeft: 3,
  },
  soldText: {
    fontSize: 9,
    color: COLORS.textMuted,
    marginLeft: 4,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  priceContainer: {
    flex: 1,
  },
  price: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.discount,
  },
  originalPrice: {
    fontSize: 10,
    color: COLORS.textMuted,
    textDecorationLine: 'line-through',
  },
  addBtn: {
    backgroundColor: COLORS.primary,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
