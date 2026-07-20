import { Product } from './product';

export interface CartItem {
  product: Product;
  quantity: number;
  selected: boolean;
}

export interface DeliverySlot {
  id: string;
  title: string;           // Ví dụ: "Giao siêu tốc 2 giờ", "Hôm nay 14:00 - 16:00"
  time: string;
  fee: number;
  isFast?: boolean;
}

export interface Voucher {
  code: string;
  title: string;
  discountAmount: number;
  minOrderValue: number;
}

export interface Address {
  id: string;
  name: string;
  phone: string;
  fullAddress: string;
  isDefault: boolean;
}

export type PaymentMethod = 'COD' | 'MOMO' | 'ZALOPAY' | 'VNPAY' | 'BANK';

export type OrderStatus = 'PENDING' | 'PICKING' | 'PACKED' | 'SHIPPED' | 'CONFIRMED' | 'CANCELLED';

export interface Order {
  id: string;
  createdAt: string;
  items: CartItem[];
  totalAmount: number;
  discountAmount: number;
  shippingFee: number;
  finalAmount: number;
  deliverySlot: DeliverySlot;
  address: Address;
  paymentMethod: PaymentMethod;
  status: OrderStatus;
  statusHistory: { status: OrderStatus; time: string; note: string }[];
}
