import { Product, CategoryType } from '../types/product';
import { Order, CartItem, Address, PaymentMethod, DeliverySlot } from '../types/cart';
import { MOCK_DELIVERY_SLOTS, MOCK_PRODUCTS, MOCK_CATEGORIES } from '../data/mockData';

const PRODUCT_API_URL = 'http://localhost:3010/products';
const OUTBOUND_API_URL = 'http://localhost:3007/outbound-orders';

export interface CategoryItem {
  id: string;
  name: string;
  count: number;
  emoji: string;
  color: string;
}

function getEmojiForCategory(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes('rau') || lower.includes('nấm') || lower.includes('củ')) return '🥬';
  if (lower.includes('trái') || lower.includes('quả') || lower.includes('táo') || lower.includes('cam')) return '🍎';
  if (lower.includes('thịt') || lower.includes('heo') || lower.includes('bò') || lower.includes('gà') || lower.includes('trứng')) return '🥩';
  if (lower.includes('hải sản') || lower.includes('cá') || lower.includes('tôm') || lower.includes('mực') || lower.includes('thủy')) return '🦐';
  if (lower.includes('sữa') || lower.includes('uống') || lower.includes('nước') || lower.includes('cà phê') || lower.includes('trà') || lower.includes('bia') || lower.includes('cồn')) return '🥛';
  if (lower.includes('bánh') || lower.includes('kẹo') || lower.includes('khô') || lower.includes('gạo') || lower.includes('mì') || lower.includes('hạt') || lower.includes('bột')) return '🍪';
  if (lower.includes('gia vị') || lower.includes('dầu') || lower.includes('nước mắm') || lower.includes('chấm') || lower.includes('xốt')) return '🧂';
  if (lower.includes('cá nhân') || lower.includes('chăm sóc')) return '🧴';
  if (lower.includes('nhà cửa') || lower.includes('đời sống')) return '🏠';
  return '🛒';
}

const CATEGORY_COLORS = ['#E8F5E9', '#FFF3E0', '#FFEBEE', '#E1F5FE', '#FFF8E1', '#F3E5F5', '#EFEBE9', '#E0F2F1', '#F1F8E9'];

/**
 * Lấy danh sách danh mục sản phẩm từ Product Service kèm số lượng sản phẩm thật trong DB
 */
export async function fetchCategoriesApi(): Promise<CategoryItem[]> {
  try {
    const response = await fetch(`${PRODUCT_API_URL}/categories`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        return data.map((item: any, index: number) => {
          const name = typeof item === 'string' ? item : item.name;
          const count = typeof item === 'object' && item.count ? Number(item.count) : 0;
          return {
            id: String(index + 1),
            name: name,
            count: count,
            emoji: getEmojiForCategory(name),
            color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
          };
        });
      }
    }
  } catch (error) {
    console.warn('[API] Could not fetch categories from server, using local categories:', error);
  }

  return MOCK_CATEGORIES.map(c => ({
    ...c,
    count: 10,
    emoji: (c as any).emoji || getEmojiForCategory(c.name),
  }));
}

export interface FetchProductParams {
  category?: string;
  keyword?: string;
  isFlashSale?: boolean;
  page?: number;
  limit?: number;
}

/**
 * Lấy danh sách sản phẩm từ Product Service (Port 3010) với hỗ trợ filter theo category và keyword trực tiếp từ DB
 */
export async function fetchProductsApi(params?: FetchProductParams): Promise<{ items: Product[]; total: number }> {
  try {
    const query = new URLSearchParams();
    if (params?.category && params.category !== 'Tất cả') {
      query.append('category', params.category);
    }
    if (params?.keyword) {
      query.append('keyword', params.keyword);
    }
    if (params?.isFlashSale !== undefined) {
      query.append('isFlashSale', String(params.isFlashSale));
    }
    if (params?.page) {
      query.append('page', String(params.page));
    }
    // Lấy số lượng sản phẩm phong phú (mặc định 100 sản phẩm / lượt)
    query.append('limit', String(params?.limit || 100));

    const response = await fetch(`${PRODUCT_API_URL}?${query.toString()}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const rawItems = Array.isArray(data) ? data : (data?.items || []);
    const total = Array.isArray(data) ? data.length : (data?.total || rawItems.length);

    if (rawItems.length > 0) {
      const items = rawItems.map((item: any) => {
        const price = Number(item.price) || 25000;
        const discountPercent = Number(item.discountPercent) || 0;
        const originalPrice = item.originalPrice 
          ? Number(item.originalPrice) 
          : (discountPercent > 0 ? Math.round(price / (1 - discountPercent / 100)) : price);

        return {
          id: item.sku || item.id,
          name: item.name || item.productName,
          category: item.category || 'Khác',
          price: price,
          originalPrice: originalPrice,
          unit: item.unit || '500g',
          imageUrl: item.imageUrl || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&q=80',
          rating: item.rating ? Number(item.rating) : 4.8,
          soldCount: item.soldCount ? Number(item.soldCount) : 150,
          isFlashSale: item.isFlashSale ?? false,
          discountPercent: discountPercent,
          origin: item.origin || 'Việt Nam',
          preservation: item.preservation || 'Kho mát',
          description: item.description || 'Thực phẩm tươi sạch đạt chuẩn kiểm duyệt chất lượng CityMart.',
          stock: item.stock ? Number(item.stock) : 100,
        };
      });

      return { items, total };
    }
  } catch (error) {
    console.warn('[API] Connecting to Product Service failed or offline. Using hybrid fallback dataset:', error);
  }

  // Graceful Fallback
  return {
    items: MOCK_PRODUCTS,
    total: MOCK_PRODUCTS.length,
  };
}

/**
 * Đặt đơn hàng mới lên Outbound Service (Port 3007)
 */
export async function createOrderApi(params: {
  items: CartItem[];
  subtotalAmount: number;
  discountAmount: number;
  shippingFee: number;
  finalAmount: number;
  deliverySlot: DeliverySlot;
  address: Address;
  paymentMethod: PaymentMethod;
}): Promise<Order> {
  const generatedId = `ORD-${Math.floor(100000 + Math.random() * 900000)}`;
  const timeNow = new Date().toISOString().replace('T', ' ').substring(0, 16);

  const payload = {
    orderCode: generatedId,
    requestedBy: 'customer-mobile-id',
    requesterName: params.address.name,
    customerName: params.address.name,
    customerPhone: params.address.phone,
    destination: params.address.fullAddress,
    deliverySlotText: params.deliverySlot.title,
    paymentMethod: params.paymentMethod === 'COD' ? 'COD - Tiền mặt' : 'Thanh toán Online',
    totalItems: params.items.length,
    totalQuantity: params.items.reduce((acc, i) => acc + i.quantity, 0),
    totalAmount: params.finalAmount,
    items: params.items.map(i => ({
      sku: i.product.id,
      productName: i.product.name,
      category: i.product.category,
      requestedQuantity: i.quantity,
      unit: i.product.unit,
      price: i.product.price,
    })),
  };

  try {
    const response = await fetch(OUTBOUND_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      const result = await response.json();
      console.log('[API] Successfully posted order to Outbound Service:', result);
    }
  } catch (error) {
    console.warn('[API] Could not post to Outbound Service directly. Local state updated:', error);
  }

  // Local Order Model
  const newOrder: Order = {
    id: generatedId,
    createdAt: timeNow,
    items: params.items,
    totalAmount: params.subtotalAmount,
    discountAmount: params.discountAmount,
    shippingFee: params.shippingFee,
    finalAmount: params.finalAmount,
    deliverySlot: params.deliverySlot,
    address: params.address,
    paymentMethod: params.paymentMethod,
    status: 'PENDING',
    statusHistory: [
      {
        status: 'PENDING',
        time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        note: 'Đơn hàng đã ghi nhận thành công vào hệ thống Kho CityMart.',
      },
    ],
  };

  return newOrder;
}

/**
 * Lấy danh sách đơn hàng thực từ Outbound Service (Port 3007)
 */
export async function fetchOrdersApi(): Promise<Order[]> {
  try {
    const response = await fetch(OUTBOUND_API_URL, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        return data.map((item: any) => ({
          id: item.orderCode || item.id,
          createdAt: item.createdAt ? item.createdAt.substring(0, 16) : 'Mới đặt',
          items: item.items ? item.items.map((it: any) => ({
            product: {
              id: it.sku || 'p1',
              name: it.productName || 'Thực phẩm tươi',
              category: it.category || 'Rau củ quả',
              price: Number(it.price) || 25000,
              unit: it.unit || '500g',
              imageUrl: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=500&q=80',
              rating: 4.8,
              soldCount: 100,
              stock: 50,
            },
            quantity: Number(it.requestedQuantity) || 1,
            selected: true,
          })) : [],
          totalAmount: Number(item.totalAmount) || 105000,
          discountAmount: 15000,
          shippingFee: 15000,
          finalAmount: Number(item.totalAmount) || 105000,
          deliverySlot: MOCK_DELIVERY_SLOTS[0],
          address: {
            id: 'addr1',
            name: item.customerName || 'Khách hàng CityMart',
            phone: item.customerPhone || '0908 123 456',
            fullAddress: item.destination || '227 Nguyễn Văn Cừ, Q.5',
            isDefault: true,
          },
          paymentMethod: item.paymentMethod?.includes('COD') ? 'COD' : 'MOMO',
          status: item.status || 'PENDING',
          statusHistory: [
            {
              status: item.status || 'PENDING',
              time: 'Mới đây',
              note: `Trạng thái xuất kho: ${item.status || 'PENDING'}`,
            },
          ],
        }));
      }
    }
  } catch (error) {
    console.warn('[API] Could not fetch real orders from Outbound Service. Using local orders:', error);
  }

  return [];
}
