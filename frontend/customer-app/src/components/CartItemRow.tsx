import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Minus, Plus, Trash2, CheckSquare, Square } from 'lucide-react-native';
import { CartItem } from '../types/cart';
import { COLORS } from '../theme/colors';

interface CartItemRowProps {
  item: CartItem;
  onUpdateQty: (delta: number) => void;
  onToggleSelect: () => void;
  onRemove: () => void;
}

export const CartItemRow: React.FC<CartItemRowProps> = ({
  item,
  onUpdateQty,
  onToggleSelect,
  onRemove,
}) => {
  const formatPrice = (val: number) => val.toLocaleString('vi-VN') + 'đ';

  return (
    <View style={styles.container}>
      {/* Selection Checkbox */}
      <TouchableOpacity onPress={onToggleSelect} style={styles.checkboxBtn}>
        {item.selected ? (
          <CheckSquare size={20} color={COLORS.primary} fill={COLORS.primaryLight} />
        ) : (
          <Square size={20} color={COLORS.border} />
        )}
      </TouchableOpacity>

      {/* Product Image */}
      <Image source={{ uri: item.product.imageUrl }} style={styles.image} />

      {/* Details */}
      <View style={styles.details}>
        <Text style={styles.name} numberOfLines={2}>
          {item.product.name}
        </Text>
        <Text style={styles.unit}>{item.product.unit}</Text>
        <Text style={styles.price}>{formatPrice(item.product.price)}</Text>
      </View>

      {/* Controls: Quantity Adjust & Remove */}
      <View style={styles.controls}>
        <TouchableOpacity style={styles.removeBtn} onPress={onRemove}>
          <Trash2 size={16} color={COLORS.textMuted} />
        </TouchableOpacity>

        <View style={styles.qtyBox}>
          <TouchableOpacity
            style={styles.qtyBtn}
            onPress={() => onUpdateQty(-1)}
          >
            <Minus size={12} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.qtyText}>{item.quantity}</Text>
          <TouchableOpacity
            style={styles.qtyBtn}
            onPress={() => onUpdateQty(1)}
          >
            <Plus size={12} color={COLORS.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 12,
    marginBottom: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  checkboxBtn: {
    paddingRight: 8,
  },
  image: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  details: {
    flex: 1,
    marginLeft: 10,
    justifyContent: 'center',
  },
  name: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  unit: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  price: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.discount,
  },
  controls: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 60,
  },
  removeBtn: {
    padding: 2,
  },
  qtyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    overflow: 'hidden',
  },
  qtyBtn: {
    width: 26,
    height: 26,
    backgroundColor: COLORS.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyText: {
    width: 28,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
});
