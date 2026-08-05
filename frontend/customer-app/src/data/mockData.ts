import { Product } from '../types/product';
import { DeliverySlot, Voucher, Address, Order } from '../types/cart';

export const MOCK_CATEGORIES = [
  { id: '1', name: 'Rau củ quả', icon: 'carrot', color: '#E8F5E9' },
  { id: '2', name: 'Thịt cá', icon: 'drumstick-bite', color: '#FFEBEE' },
  { id: '3', name: 'Đông lạnh', icon: 'snowflake', color: '#E3F2FD' },
  { id: '4', name: 'Sữa & đồ uống', icon: 'glass-whiskey', color: '#FFF8E1' },
  { id: '5', name: 'Đồ khô', icon: 'box', color: '#F3E5F5' },
  { id: '6', name: 'Gia vị & Dầu ăn', icon: 'bottle-droplet', color: '#EFEBE9' },
];

export const MOCK_BANNERS = [
  {
    id: 'b1',
    title: 'RAU TƯƠI MỖI NGÀY - GIẢM ĐẾN 40%',
    subtitle: 'Nông sản Đà Lạt chuẩn VietGAP giao siêu tốc 2h',
    badge: 'ƯU ĐÃI HOT',
    bg: '#008848',
  },
  {
    id: 'b2',
    title: 'THỊT CÁ TƯƠI SỐNG - ĐẢM BẢO AN TOÀN',
    subtitle: 'Nhập mới mỗi sáng, bảo quản chuẩn FEFO kho lạnh',
    badge: 'GIÁ SỐC',
    bg: '#006837',
  },
  {
    id: 'b3',
    title: 'MIỄN PHÍ VẬN CHUYỂN ĐƠN TỪ 149K',
    subtitle: 'Áp dụng cho khách hàng đặt hàng qua ứng dụng',
    badge: 'FREESHIP',
    bg: '#FFB800',
  },
];

export const MOCK_PRODUCTS: Product[] = [];

export const MOCK_DELIVERY_SLOTS: DeliverySlot[] = [
  { id: 'ds1', title: 'Giao siêu tốc 2 giờ', time: 'Nhận hàng trong 2h', fee: 15000, isFast: true },
  { id: 'ds2', title: 'Khung giờ chiều nay', time: '14:00 - 16:00 Hôm nay', fee: 10000 },
  { id: 'ds3', title: 'Khung giờ tối nay', time: '18:00 - 20:00 Hôm nay', fee: 10000 },
  { id: 'ds4', title: 'Khung giờ sáng mai', time: '08:00 - 10:00 Sáng mai', fee: 10000 },
];

export const MOCK_VOUCHERS: Voucher[] = [
  { code: 'CITYMARTFREESHIP', title: 'Miễn phí vận chuyển 15K', discountAmount: 15000, minOrderValue: 149000 },
  { code: 'CITYMART30K', title: 'Giảm 30.000đ cho đơn thực phẩm tươi', discountAmount: 30000, minOrderValue: 299000 },
  { code: 'CITYMART10', title: 'Giảm 10% tối đa 20.000đ', discountAmount: 20000, minOrderValue: 100000 },
];

export const MOCK_ADDRESSES: Address[] = [
  {
    id: 'addr1',
    name: 'Nguyễn Văn Tường',
    phone: '0908 123 456',
    fullAddress: '227 Nguyễn Văn Cừ, Phường 4, Quận 5, TP. Hồ Chí Minh',
    isDefault: true,
  },
  {
    id: 'addr2',
    name: 'Nguyễn Văn Tường (Văn phòng)',
    phone: '0908 123 456',
    fullAddress: '135 Nam Kỳ Khởi Nghĩa, Quận 1, TP. Hồ Chí Minh',
    isDefault: false,
  }
];

export const MOCK_ORDERS: Order[] = [];
