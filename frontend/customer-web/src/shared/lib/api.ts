const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010';

export interface Product {
  id: string;
  sku: string;
  name: string;
  price: number;
  oldPrice?: number;
  discount: number;
  soldCount: number;
  totalStock: number;
  imageUrl: string;
  category: string;
  rating: number;
  brand: string;
  description?: string;
  origin?: string;
  preservation?: string;
  unit?: string;
}

export interface CategoryData {
  id: string;
  name: string;
  slug: string;
  count: number;
  emoji: string;
  imageUrl: string;
}

export function slugify(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

export function getCategoryEmoji(name: string): string {
  const lower = (name || '').toLowerCase();
  if (lower.includes('bé') || lower.includes('be')) return '🍼';
  if (lower.includes('cá nhân') || lower.includes('chăm sóc')) return '🧴';
  if (lower.includes('nhà cửa') || lower.includes('đời sống')) return '🏠';
  if (lower.includes('đóng hộp')) return '🥫';
  if (lower.includes('đông') || lower.includes('mát')) return '❄️';
  if (lower.includes('rau') || lower.includes('nấm') || lower.includes('củ')) return '🥬';
  if (lower.includes('trái') || lower.includes('quả') || lower.includes('táo') || lower.includes('cam')) return '🍎';
  if (lower.includes('thịt') || lower.includes('heo') || lower.includes('bò') || lower.includes('gà') || lower.includes('trứng')) return '🥩';
  if (lower.includes('hải sản') || lower.includes('cá') || lower.includes('tôm') || lower.includes('mực') || lower.includes('thủy')) return '🦐';
  if (lower.includes('sữa')) return '🥛';
  if (lower.includes('uống') || lower.includes('nước') || lower.includes('cà phê') || lower.includes('trà')) return '🥤';
  if (lower.includes('bánh') || lower.includes('kẹo') || lower.includes('snack')) return '🍪';
  if (lower.includes('gia vị') || lower.includes('gạo') || lower.includes('khô') || lower.includes('mì')) return '🍚';
  return '🛒';
}

export const CATEGORY_IMAGES: Record<string, string> = {
  // 12 danh mục nghiệp vụ chuẩn theo ảnh thiết kế
  'rau-cu-trai-cay': '/icons/rau-cu-qua.png',
  'thit-trung-hai-san': '/icons/thit-tung-hai-san.png',
  'thuc-an-che-bien-bun-tuoi': '/icons/thuc-pham-an-lien.png',
  'thuc-pham-dong-mat': '/icons/thuc-pham-dong-lanh.png',
  'sua-san-pham-tu-sua': '/icons/sua.png',
  'thuc-uong': '/icons/nuoc-ngot.png',
  'banh-keo-snack': '/icons/banh-keo.png',
  'gia-vi-gao-thuc-pham-kho': '/icons/gao-dokho.png',
  'san-pham-cho-be': '/icons/san-pham-cho-be.png',
  'cham-soc-ca-nhan': '/icons/cham-soc-ca-nhan.png',
  'nha-cua-va-doi-song': '/icons/nha-cua-doi-song.png',
  'shop-noi-bat': '/icons/shop-noi-bat.svg',

  // Aliases & legacy slugs
  'rau-cu-qua': '/icons/rau-cu-qua.png',
  'rau-cu': '/icons/rau-cu-qua.png',
  'trai-cay': '/icons/rau-cu-qua.png',
  'thit-tuoi': '/icons/thit-tung-hai-san.png',
  'hai-san': '/icons/thit-tung-hai-san.png',
  'sua-do-uong': '/icons/sua.png',
  'sua': '/icons/sua.png',
  'do-uong': '/icons/nuoc-ngot.png',
  'banh-keo': '/icons/banh-keo.png',
  'gao-dokho': '/icons/gao-dokho.png',
  'gao': '/icons/gao-dokho.png',
  'gia-vi': '/icons/gao-dokho.png',
  'thuc-pham-dong-lanh': '/icons/thuc-pham-dong-lanh.png',
  'thuc-pham-an-lien': '/icons/thuc-pham-an-lien.png',
  'nha-cua-doi-song': '/icons/nha-cua-doi-song.png',
};

export const TARGET_CATEGORY_ORDER = [
  'Rau củ, trái cây',
  'Thịt, trứng, hải sản',
  'Thức ăn chế biến, bún tươi',
  'Thực phẩm đông, mát',
  'Sữa, sản phẩm từ sữa',
  'Thức uống',
  'Bánh, kẹo, snack',
  'Gia vị, gạo, thực phẩm khô',
  'Sản phẩm cho bé',
  'Chăm sóc cá nhân',
  'Nhà cửa và đời sống',
  'Shop nổi bật',
];

export function getCategoryIconUrl(nameOrSlug: string): string {
  if (!nameOrSlug) return '/icons/rau-cu-qua.png';
  const slug = slugify(nameOrSlug);
  if (CATEGORY_IMAGES[slug]) return CATEGORY_IMAGES[slug];
  
  const lower = nameOrSlug.toLowerCase();
  if (lower.includes('shop') || lower.includes('nổi bật')) return '/icons/shop-noi-bat.svg';
  if (lower.includes('bé') || lower.includes('be')) return '/icons/san-pham-cho-be.png';
  if (lower.includes('cá nhân') || lower.includes('cham-soc')) return '/icons/cham-soc-ca-nhan.png';
  if (lower.includes('nhà cửa') || lower.includes('đời sống') || lower.includes('nha-cua')) return '/icons/nha-cua-doi-song.png';
  if (lower.includes('bánh') || lower.includes('kẹo') || lower.includes('snack') || lower.includes('banh-keo')) return '/icons/banh-keo.png';
  if (lower.includes('uống') || lower.includes('nuoc-ngot') || lower.includes('thuc-uong')) return '/icons/nuoc-ngot.png';
  if (lower.includes('sữa') || lower.includes('sua')) return '/icons/sua.png';
  if (lower.includes('đông') || lower.includes('mát') || lower.includes('dong-mat') || lower.includes('dong-lanh')) return '/icons/thuc-pham-dong-lanh.png';
  if (lower.includes('chế biến') || lower.includes('bún tươi') || lower.includes('an-lien')) return '/icons/thuc-pham-an-lien.png';
  if (lower.includes('thịt') || lower.includes('trứng') || lower.includes('hải sản') || lower.includes('thit-trung')) return '/icons/thit-tung-hai-san.png';
  if (lower.includes('rau') || lower.includes('củ') || lower.includes('trái cây') || lower.includes('rau-cu')) return '/icons/rau-cu-qua.png';
  if (lower.includes('gia vị') || lower.includes('gạo') || lower.includes('thực phẩm khô') || lower.includes('gao-dokho')) return '/icons/gao-dokho.png';
  
  return '/icons/rau-cu-qua.png';
}

// Smart unit inference from name or category
const guessUnit = (name: string, category: string): string => {
  const lowerName = name.toLowerCase();
  
  if (lowerName.includes('thùng')) return 'Thùng';
  if (lowerName.includes('lốc')) return 'Lốc';
  if (lowerName.includes('combo')) return 'Combo';
  
  // Check for common volume/weight at the end or separated by space
  const match = lowerName.match(/(\d+(?:\.\d+)?)\s*(kg|g|l|ml|lít)(?:\b|$)/i);
  if (match) {
    return `Sản phẩm (${match[0].trim()})`;
  }
  
  if (category === 'Rau củ' || category === 'Trái cây' || category === 'Thịt heo' || category === 'Thịt tươi') return 'Kg';
  if (category === 'Nước mắm' || lowerName.includes('nước') || lowerName.includes('bia')) return 'Chai';
  if (category === 'Gạo') return 'Bao/Túi';
  if (lowerName.includes('mì') || lowerName.includes('bánh') || lowerName.includes('kẹo')) return 'Gói';
  
  return 'Sản phẩm';
};

// Map the backend DB entity to the frontend Product structure
const mapToFrontendProduct = (dbProduct: any): Product => {
  const price = Number(dbProduct.price) || 0;
  const discountPercent = Number(dbProduct.discountPercent) || 0;
  
  let oldPrice = price;
  if (discountPercent > 0) {
    oldPrice = Math.round(price / (1 - discountPercent / 100));
  }

  const finalUnit = (dbProduct.unit && dbProduct.unit !== 'Cái') 
    ? dbProduct.unit 
    : guessUnit(dbProduct.name || '', dbProduct.category || '');

  return {
    id: dbProduct.id,
    sku: dbProduct.sku || dbProduct.id,
    name: dbProduct.name,
    price: price,
    oldPrice: oldPrice > price ? oldPrice : undefined,
    discount: discountPercent,
    soldCount: dbProduct.soldCount || 0,
    totalStock: dbProduct.stock !== undefined && dbProduct.stock !== null ? Number(dbProduct.stock) : 0,
    imageUrl: dbProduct.imageUrl || '',
    category: dbProduct.category || 'Khác',
    rating: Number(dbProduct.rating) || 4.8,
    brand: dbProduct.origin || 'Việt Nam',
    description: dbProduct.description,
    origin: dbProduct.origin || 'Việt Nam',
    preservation: dbProduct.preservation || 'Bảo quản nơi khô ráo, thoáng mát',
    unit: finalUnit,
  };
};

/**
 * Lấy danh sách toàn bộ danh mục thực tế từ Database kèm số lượng sản phẩm
 */
export async function getCategories(): Promise<CategoryData[]> {
  try {
    const res = await fetch(`${API_URL}/products/categories`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(3000)
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const slugMap = new Map<string, CategoryData>();

        data.forEach((item: any, idx: number) => {
          const name = typeof item === 'string' ? item : item.name;
          const count = typeof item === 'object' && item.count ? Number(item.count) : 0;
          const slug = slugify(name);
          if (!slug) return;

          if (!slugMap.has(slug)) {
            const imageUrl = CATEGORY_IMAGES[slug] || getCategoryIconUrl(name);
            slugMap.set(slug, {
              id: String(idx + 1),
              name,
              slug,
              count,
              emoji: getCategoryEmoji(name),
              imageUrl,
            });
          } else {
            const existing = slugMap.get(slug)!;
            existing.count += count;
            // Ưu tiên hiển thị chữ viết hoa thường (Title Case) thay vì ALL CAPS
            if (name !== name.toUpperCase() && existing.name === existing.name.toUpperCase()) {
              existing.name = name;
            }
          }
        });

        if (!slugMap.has('shop-noi-bat')) {
          slugMap.set('shop-noi-bat', {
            id: '12',
            name: 'Shop nổi bật',
            slug: 'shop-noi-bat',
            count: 0,
            emoji: '⭐',
            imageUrl: '/icons/shop-noi-bat.svg',
          });
        }

        return Array.from(slugMap.values()).sort((a, b) => {
          const idxA = TARGET_CATEGORY_ORDER.indexOf(a.name);
          const idxB = TARGET_CATEGORY_ORDER.indexOf(b.name);
          if (idxA !== -1 && idxB !== -1) return idxA - idxB;
          if (idxA !== -1) return -1;
          if (idxB !== -1) return 1;
          return b.count - a.count;
        });
      }
    }
  } catch (error: any) {
    console.warn('[getCategories] Backend service offline or unreachable, using fallback categories:', error.message);
  }

  // Fallback defaults if backend is offline (12 danh mục nghiệp vụ chuẩn)
  return [
    { id: '1', name: 'Rau củ, trái cây', slug: 'rau-cu-trai-cay', count: 16, emoji: '🥬', imageUrl: '/icons/rau-cu-qua.png' },
    { id: '2', name: 'Thịt, trứng, hải sản', slug: 'thit-trung-hai-san', count: 5, emoji: '🥩', imageUrl: '/icons/thit-tung-hai-san.png' },
    { id: '3', name: 'Thức ăn chế biến, bún tươi', slug: 'thuc-an-che-bien-bun-tuoi', count: 16, emoji: '🍜', imageUrl: '/icons/thuc-pham-an-lien.png' },
    { id: '4', name: 'Thực phẩm đông, mát', slug: 'thuc-pham-dong-mat', count: 41, emoji: '❄️', imageUrl: '/icons/thuc-pham-dong-lanh.png' },
    { id: '5', name: 'Sữa, sản phẩm từ sữa', slug: 'sua-san-pham-tu-sua', count: 33, emoji: '🥛', imageUrl: '/icons/sua.png' },
    { id: '6', name: 'Thức uống', slug: 'thuc-uong', count: 6, emoji: '🥤', imageUrl: '/icons/nuoc-ngot.png' },
    { id: '7', name: 'Bánh, kẹo, snack', slug: 'banh-keo-snack', count: 4, emoji: '🍪', imageUrl: '/icons/banh-keo.png' },
    { id: '8', name: 'Gia vị, gạo, thực phẩm khô', slug: 'gia-vi-gao-thuc-pham-kho', count: 28, emoji: '🍚', imageUrl: '/icons/gao-dokho.png' },
    { id: '9', name: 'Sản phẩm cho bé', slug: 'san-pham-cho-be', count: 6, emoji: '🍼', imageUrl: '/icons/san-pham-cho-be.png' },
    { id: '10', name: 'Chăm sóc cá nhân', slug: 'cham-soc-ca-nhan', count: 5, emoji: '🧴', imageUrl: '/icons/cham-soc-ca-nhan.png' },
    { id: '11', name: 'Nhà cửa và đời sống', slug: 'nha-cua-va-doi-song', count: 5, emoji: '🏠', imageUrl: '/icons/nha-cua-doi-song.png' },
    { id: '12', name: 'Shop nổi bật', slug: 'shop-noi-bat', count: 0, emoji: '⭐', imageUrl: '/icons/shop-noi-bat.svg' },
  ];
}

export async function getProducts(params?: {
  keyword?: string;
  category?: string;
  isFlashSale?: boolean;
  page?: number;
  limit?: number;
}) {
  const query = new URLSearchParams();
  if (params?.keyword) query.append('keyword', params.keyword);
  if (params?.category && params.category !== 'tat-ca-danh-muc' && params.category !== 'Tất cả danh mục') {
    query.append('category', params.category);
  }
  if (params?.isFlashSale !== undefined) query.append('isFlashSale', String(params.isFlashSale));
  if (params?.page) query.append('page', String(params.page));
  query.append('limit', String(params?.limit || 50));

  try {
    const res = await fetch(`${API_URL}/products?${query.toString()}`, {
      cache: 'no-store'
    });
    
    if (!res.ok) {
      console.error('Failed to fetch products', res.status);
      return { items: [], total: 0, page: 1, totalPages: 1 };
    }
    
    const data = await res.json();
    
    const rawItems = Array.isArray(data) ? data : (data.items || []);
    const validItems = rawItems
      .map(mapToFrontendProduct)
      .filter((p: Product) => p.imageUrl && p.imageUrl.trim() !== '' && !p.imageUrl.includes('placeholder'));

    return {
      ...(Array.isArray(data) ? {} : data),
      items: validItems,
      total: validItems.length,
      page: (data && data.page) || 1,
      totalPages: (data && data.totalPages) || 1
    };
  } catch (error: any) {
    console.warn('[getProducts] Backend unreachable, returning empty list:', error.message);
    return { items: [], total: 0, page: 1, totalPages: 1 };
  }
}

/**
 * Mã hóa định danh sản phẩm (SKU hoặc UUID) thành mã token bảo mật URL (dạng sp-XXXX)
 * Giúp che giấu hoàn toàn UUID nội bộ CSDL và cấu trúc mã kho khỏi URL thanh địa chỉ
 */
export function encodeProductSlug(rawIdOrSku: string): string {
  if (!rawIdOrSku) return '';
  const raw = String(rawIdOrSku).trim();
  const key = 0x5a;
  const hex = Array.from(raw).map(c => (c.charCodeAt(0) ^ key).toString(16).padStart(2, '0')).join('');
  return `sp-${hex}`;
}

/**
 * Giải mã token URL bảo mật trở lại thành SKU hoặc UUID gốc của sản phẩm
 * Hỗ trợ tương thích ngược với UUID thuần, SKU thuần, và slug cũ
 */
export function decodeProductIdentifier(tokenOrSlug: string): string {
  if (!tokenOrSlug) return '';
  const decodedStr = decodeURIComponent(tokenOrSlug).trim();

  // 1. Trường hợp là token bảo mật sp-XXXX
  if (decodedStr.includes('sp-')) {
    const hex = decodedStr.split('sp-').pop() || '';
    if (hex && /^[0-9a-fA-F]+$/.test(hex) && hex.length % 2 === 0) {
      let raw = '';
      for (let i = 0; i < hex.length; i += 2) {
        raw += String.fromCharCode(parseInt(hex.substr(i, 2), 16) ^ 0x5a);
      }
      if (raw) return raw;
    }
  }

  // 2. Trường hợp là slug cũ dạng ten-san-pham-CT-xxxx hoặc ten-san-pham-uuid
  const ctMatch = decodedStr.match(/(CT-[A-Za-z0-9-]+)$/i);
  if (ctMatch && ctMatch[1]) {
    return ctMatch[1];
  }

  const uuidMatch = decodedStr.match(/([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/i);
  if (uuidMatch && uuidMatch[1]) {
    return uuidMatch[1];
  }

  return decodedStr;
}

export async function getProductById(idOrSlug: string): Promise<Product | null> {
  try {
    const targetKey = decodeProductIdentifier(idOrSlug);
    if (!targetKey) return null;

    const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(targetKey);
    
    // 1. Nếu là UUID chuẩn -> gọi trực tiếp endpoint GET /products/:id
    if (isUuid) {
      try {
        const res = await fetch(`${API_URL}/products/${targetKey}`, {
          cache: 'no-store',
          signal: AbortSignal.timeout(3500),
        });
        if (res.ok) {
          const dbProduct = await res.json();
          if (dbProduct) return mapToFrontendProduct(dbProduct);
        }
      } catch (e) {}
    }

    // 2. Thử tìm qua endpoint SKU chuyên dụng: GET /products/sku/:sku
    try {
      const skuRes = await fetch(`${API_URL}/products/sku/${encodeURIComponent(targetKey)}`, {
        cache: 'no-store',
        signal: AbortSignal.timeout(3500),
      });
      if (skuRes.ok) {
        const dbProduct = await skuRes.json();
        if (dbProduct) return mapToFrontendProduct(dbProduct);
      }
    } catch (e) {}

    // 3. Fallback: tìm qua danh sách sản phẩm hoặc từ khóa
    try {
      const searchRes = await fetch(`${API_URL}/products?keyword=${encodeURIComponent(targetKey)}&limit=10`, {
        cache: 'no-store',
        signal: AbortSignal.timeout(3500),
      });
      if (searchRes.ok) {
        const data = await searchRes.json();
        const items = Array.isArray(data) ? data : (data.items || []);
        const matched = items.find((p: any) => p.sku === targetKey || p.id === targetKey) || items[0];
        if (matched) return mapToFrontendProduct(matched);
      }
    } catch (e) {}

    return null;
  } catch (error) {
    console.warn(`[getProductById] Không thể tải sản phẩm (${idOrSlug}):`, error);
    return null;
  }
}

export interface VoucherItem {
  id: string;
  code: string;
  title: string;
  description?: string;
  discountType: 'FIXED' | 'PERCENT' | 'FREESHIP';
  discountValue: number;
  minOrderValue: number;
  maxDiscount?: number;
  usageLimit: number;
  usedCount: number;
  applicableScope?: 'ALL' | 'CATEGORY' | 'PRODUCT';
  applicableCategories?: string[];
  applicableProductIds?: string[];
  limitPerUser?: number;
  startDate?: string;
  endDate?: string;
  isActive: boolean;
}

export const FALLBACK_VOUCHERS: VoucherItem[] = [
  {
    id: 'fbe8dae5-c702-4979-a760-d7cd1d65fcdc',
    code: 'FREESHIP',
    title: 'Miễn phí vận chuyển 15.000đ',
    description: 'Áp dụng cho mọi đơn hàng từ 150.000đ tại TP.HCM',
    discountType: 'FREESHIP',
    discountValue: 15000,
    minOrderValue: 150000,
    usageLimit: 500,
    usedCount: 0,
    applicableScope: 'ALL',
    limitPerUser: 1,
    isActive: true,
  },
  {
    id: '8ecbfc01-735c-494d-9d08-30fd7ddf6bb2',
    code: 'CTMART20',
    title: 'Giảm 20.000đ Đơn Đầu Tiên',
    description: 'Dành riêng cho khách hàng mua sắm đơn từ 200.000đ',
    discountType: 'FIXED',
    discountValue: 20000,
    minOrderValue: 200000,
    usageLimit: 1000,
    usedCount: 0,
    applicableScope: 'ALL',
    limitPerUser: 1,
    isActive: true,
  },
  {
    id: '637fa369-74e1-45bc-8e22-b89daee5ce66',
    code: 'GIAM50K',
    title: 'Đại Tiệc Giảm 50.000đ',
    description: 'Áp dụng cho đơn hàng thực phẩm từ 500.000đ',
    discountType: 'FIXED',
    discountValue: 50000,
    minOrderValue: 500000,
    usageLimit: 200,
    usedCount: 0,
    applicableScope: 'ALL',
    limitPerUser: 1,
    isActive: true,
  },
  {
    id: '164c69df-7323-4af5-a260-85e3476ac45d',
    code: 'SALE10',
    title: 'Ưu Đãi Thành Viên 10%',
    description: 'Giảm ngay 10% tối đa 40.000đ cho đơn hàng tươi sống từ 250.000đ',
    discountType: 'PERCENT',
    discountValue: 10,
    minOrderValue: 250000,
    maxDiscount: 40000,
    usageLimit: 300,
    usedCount: 0,
    applicableScope: 'ALL',
    limitPerUser: 1,
    isActive: true,
  },
];

export async function getVouchers(): Promise<VoucherItem[]> {
  try {
    const res = await fetch(`${API_URL}/vouchers?activeOnly=true`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data;
      }
    }
  } catch (err: any) {
    console.warn('[getVouchers] Backend offline or unreachable, using fallback vouchers:', err?.message || err);
  }
  return FALLBACK_VOUCHERS;
}

export async function validateVoucherCode(
  code: string, 
  orderAmount: number, 
  items?: any[], 
  customerId?: string
): Promise<{ valid: boolean; discountAmount?: number; voucher?: VoucherItem; message?: string }> {
  try {
    const res = await fetch(`${API_URL}/vouchers/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: code.trim().toUpperCase(),
        orderAmount,
        items,
        customerId
      }),
      cache: 'no-store',
      signal: AbortSignal.timeout(4000),
    });
    const data = await res.json();
    if (!res.ok) {
      return { valid: false, message: data.message || 'Mã giảm giá không hợp lệ hoặc không đủ điều kiện.' };
    }
    return { valid: true, discountAmount: data.discountAmount, voucher: data.voucher, message: data.message };
  } catch (err) {
    // Dự phòng fallback nếu backend chưa kết nối kịp
    const fallback = FALLBACK_VOUCHERS.find(v => v.code.toUpperCase() === code.trim().toUpperCase());
    if (fallback) {
      if (orderAmount < fallback.minOrderValue) {
        return {
          valid: false,
          message: `Đơn hàng tối thiểu ${fallback.minOrderValue.toLocaleString('vi-VN')}đ để áp dụng mã này.`
        };
      }
      let discountAmount = 0;
      if (fallback.discountType === 'PERCENT') {
        discountAmount = (orderAmount * fallback.discountValue) / 100;
        if (fallback.maxDiscount && discountAmount > fallback.maxDiscount) {
          discountAmount = fallback.maxDiscount;
        }
      } else {
        discountAmount = fallback.discountValue;
      }
      return {
        valid: true,
        discountAmount,
        voucher: fallback,
        message: 'Áp dụng mã giảm giá thành công.'
      };
    }
    return { valid: false, message: 'Lỗi kết nối khi kiểm tra mã giảm giá.' };
  }
}
