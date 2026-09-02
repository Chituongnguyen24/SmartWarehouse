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

const CATEGORY_IMAGES: Record<string, string> = {
  'rau-cu-qua': '/categories/rau_cu_new.png',
  'rau-cu': '/categories/rau_cu_new.png',
  'trai-cay': '/categories/rau_cu_new.png',
  'thit-tuoi': '/categories/thit_hai_san_new.png',
  'thit-heo': '/categories/thit_hai_san_new.png',
  'hai-san': '/categories/thit_hai_san_new.png',
  'sua-do-uong': '/categories/sua_new.png',
  'sua': '/categories/sua_new.png',
  'do-uong': '/categories/sua_new.png',
  'banh-keo-do-kho': '/categories/banh_keo_new.png',
  'banh-keo': '/categories/banh_keo_new.png',
  'thuc-pham-kho': '/categories/thuc_an_che_bien_new.png',
  'gao': '/categories/gia_vi_new.png',
  'gia-vi-xot': '/categories/gia_vi_new.png',
  'cham-soc-ca-nhan': '/categories/ca_nhan.png',
  'nha-cua-doi-song': '/categories/nha_cua.png',
};

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
    totalStock: dbProduct.stock || 100,
    imageUrl: dbProduct.imageUrl || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&q=80',
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
      cache: 'no-store'
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
            const imageUrl = CATEGORY_IMAGES[slug] || '/categories/thuc_an_che_bien_new.png';
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

        return Array.from(slugMap.values()).sort((a, b) => b.count - a.count);
      }
    }
  } catch (error) {
    console.error('Error fetching categories from backend:', error);
  }

  // Fallback defaults if backend is offline
  return [
    { id: '1', name: 'Thực Phẩm Ăn Liền', slug: 'thuc-pham-an-lien', count: 200, emoji: '🍜', imageUrl: '/categories/thuc_an_che_bien_new.png' },
    { id: '2', name: 'Bách Hóa', slug: 'bach-hoa', count: 200, emoji: '🛒', imageUrl: '/categories/banh_keo_new.png' },
    { id: '3', name: 'Thực Phẩm Tươi Sống', slug: 'thuc-pham-tuoi-song', count: 200, emoji: '🥬', imageUrl: '/categories/rau_cu_new.png' },
    { id: '4', name: 'Sữa & Đồ uống', slug: 'sua-do-uong', count: 190, emoji: '🥛', imageUrl: '/categories/sua_new.png' },
    { id: '5', name: 'Gia Vị - Xốt', slug: 'gia-vi-xot', count: 180, emoji: '🧂', imageUrl: '/categories/gia_vi_new.png' },
    { id: '6', name: 'Bánh Kẹo', slug: 'banh-keo', count: 180, emoji: '🍪', imageUrl: '/categories/banh_keo_new.png' },
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
    
    if (Array.isArray(data)) {
      return {
        items: data.map(mapToFrontendProduct),
        total: data.length,
        page: 1,
        totalPages: 1
      };
    }
    
    return {
      ...data,
      items: (data.items || []).map(mapToFrontendProduct)
    };
  } catch (error) {
    console.error('Error fetching products:', error);
    return { items: [], total: 0, page: 1, totalPages: 1 };
  }
}

export async function getProductById(id: string) {
  try {
    const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id);
    
    if (isUuid) {
      const res = await fetch(`${API_URL}/products/${id}`, {
        cache: 'no-store'
      });
      if (!res.ok) return null;
      const dbProduct = await res.json();
      if (!dbProduct) return null;
      return mapToFrontendProduct(dbProduct);
    } else {
      const res = await fetch(`${API_URL}/products?limit=100`, {
        cache: 'no-store'
      });
      if (!res.ok) return null;
      const data = await res.json();
      const items = Array.isArray(data) ? data : (data.items || []);
      const dbProduct = items.find((p: any) => p.sku === id);
      if (!dbProduct) return null;
      return mapToFrontendProduct(dbProduct);
    }
  } catch (error) {
    console.error(`Error fetching product ${id}:`, error);
    return null;
  }
}
