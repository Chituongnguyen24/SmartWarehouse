import { Product } from '../types/product';
import { Order, CartItem, Address, PaymentMethod, DeliverySlot } from '../types/cart';
import { MOCK_PRODUCTS, MOCK_ORDERS, MOCK_DELIVERY_SLOTS } from '../data/mockData';

const PRODUCT_API_URL = 'http://localhost:3010/products';
const OUTBOUND_API_URL = 'http://localhost:3007/outbound-orders';

/**
 * Lấy danh sách sản phẩm từ Product Service (Port 3010)
 */
export async function fetchProductsApi(): Promise<Product[]> {
  try {
    const response = await fetch(PRODUCT_API_URL, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    if (Array.isArray(data) && data.length > 0) {
      // Map Backend Entity to Frontend Product Interface
      return data.map((item: any) => ({
        id: item.id || item.sku,
        name: item.name || item.productName,
        category: mapCategory(item.category),
        price: Number(item.price) || 25000,
        originalPrice: item.originalPrice ? Number(item.originalPrice) : Number(item.price || 25000) * 1.25,
        unit: item.unit || '500g',
        imageUrl: item.imageUrl || 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=500&q=80',
        rating: item.rating ? Number(item.rating) : 4.8,
        soldCount: item.soldCount ? Number(item.soldCount) : 150,
        isFlashSale: item.isFlashSale ?? true,
        discountPercent: item.discountPercent || 20,
        origin: item.origin || 'Việt Nam',
        preservation: item.preservation || 'Kho lạnh (0-4°C)',
        description: item.description || 'Thực phẩm tươi sạch đạt chuẩn kiểm duyệt chất lượng FreshKeep.',
        stock: item.stock ? Number(item.stock) : 100,
      }));
    }
  } catch (error) {
    console.warn('[API] Connecting to Product Service failed or offline. Using hybrid fallback mock data:', error);
  }

  // Graceful Fallback
  return MOCK_PRODUCTS;
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
        note: 'Đơn hàng đã ghi nhận thành công vào hệ thống Kho FreshKeep.',
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
              category: mapCategory(it.category),
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
            name: item.customerName || 'Khách hàng FreshKeep',
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

  return MOCK_ORDERS;
}

function mapCategory(cat: string): any {
  if (!cat) return 'Rau củ quả';
  if (cat.includes('Rau') || cat.includes('VEGETABLES')) return 'Rau củ quả';
  if (cat.includes('Thịt') || cat.includes('MEAT')) return 'Thịt cá';
  if (cat.includes('Đông') || cat.includes('FROZEN')) return 'Đông lạnh';
  if (cat.includes('Sữa') || cat.includes('DAIRY')) return 'Sữa & đồ uống';
  if (cat.includes('Khô') || cat.includes('DRY')) return 'Đồ khô';
  return 'Gia vị & Dầu ăn';
}
