import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { OrderStatus } from '../types/cart';
import { COLORS } from '../theme/colors';
import { Clock, PackageCheck, Truck, CheckCircle2, XCircle, Box } from 'lucide-react-native';

interface OrderStatusBadgeProps {
  status: OrderStatus;
}

export const OrderStatusBadge: React.FC<OrderStatusBadgeProps> = ({ status }) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'PENDING':
        return {
          label: 'Chờ xác nhận',
          color: COLORS.statusPending,
          bg: '#FFF3E0',
          icon: <Clock size={12} color={COLORS.statusPending} />,
        };
      case 'PICKING':
        return {
          label: 'Đang soạn hàng (FEFO)',
          color: COLORS.statusPicking,
          bg: '#E3F2FD',
          icon: <Box size={12} color={COLORS.statusPicking} />,
        };
      case 'PACKED':
        return {
          label: 'Đã đóng thùng',
          color: COLORS.primary,
          bg: COLORS.primaryLight,
          icon: <PackageCheck size={12} color={COLORS.primary} />,
        };
      case 'SHIPPED':
        return {
          label: 'Đang giao tận nơi',
          color: COLORS.statusShipping,
          bg: '#E0F7FA',
          icon: <Truck size={12} color={COLORS.statusShipping} />,
        };
      case 'CONFIRMED':
        return {
          label: 'Đã hoàn tất',
          color: COLORS.statusCompleted,
          bg: '#E8F5E9',
          icon: <CheckCircle2 size={12} color={COLORS.statusCompleted} />,
        };
      case 'CANCELLED':
        return {
          label: 'Đã hủy',
          color: COLORS.statusCancelled,
          bg: '#FFEBEE',
          icon: <XCircle size={12} color={COLORS.statusCancelled} />,
        };
      default:
        return {
          label: status,
          color: COLORS.textMuted,
          bg: COLORS.surfaceSecondary,
          icon: null,
        };
    }
  };

  const config = getStatusConfig();

  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      {config.icon}
      <Text style={[styles.text, { color: config.color }]}>{config.label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 4,
  },
});
