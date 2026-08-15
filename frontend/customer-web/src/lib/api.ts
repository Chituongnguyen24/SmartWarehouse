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
  
  if (category === 'Rau củ' || category === 'Trái cây' || category === 'Thịt heo') return 'Kg';
  if (category === 'Nước mắm' || lowerName.includes('nước') || lowerName.includes('bia')) return 'Chai';
  if (category === 'Gạo') return 'Bao/Túi';
  if (lowerName.includes('mì') || lowerName.includes('bánh') || lowerName.includes('kẹo')) return 'Gói';
  
  return 'Sản phẩm';
};

// Map the backend DB entity to the frontend Product structure
const mapToFrontendProduct = (dbProduct: any): Product => {
  const price = Number(dbProduct.price) || 0;
  const discountPercent = Number(dbProduct.discountPercent) || 0;
  
  // If no discount, oldPrice is the same or undefined. If discount, calculate oldPrice
  let oldPrice = price;
  if (discountPercent > 0) {
    oldPrice = Math.round(price / (1 - discountPercent / 100));
  } else {
    // Generate a small fake discount for display if we want to match mock data vibe
    // But since this is real data, we just use the real discount
  }

  // Use smart unit if DB unit is default 'Cái', otherwise use DB unit
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
    imageUrl: dbProduct.imageUrl || '/categories/trai_cay.png',
    category: dbProduct.category || 'unknown',
    rating: Number(dbProduct.rating) || 4.5,
    brand: dbProduct.origin || 'Việt Nam',
    description: dbProduct.description,
    origin: dbProduct.origin || 'Việt Nam',
    preservation: dbProduct.preservation || 'Bảo quản nơi khô ráo, thoáng mát',
    unit: finalUnit,
  };
};

export async function getProducts(params?: {
  keyword?: string;
  category?: string;
  isFlashSale?: boolean;
  page?: number;
  limit?: number;
}) {
  const query = new URLSearchParams();
  if (params?.keyword) query.append('keyword', params.keyword);
  if (params?.category) query.append('category', params.category);
  if (params?.isFlashSale !== undefined) query.append('isFlashSale', String(params.isFlashSale));
  if (params?.page) query.append('page', String(params.page));
  if (params?.limit) query.append('limit', String(params.limit));

  try {
    const res = await fetch(`${API_URL}/products?${query.toString()}`, {
      cache: 'no-store'
    });
    
    if (!res.ok) {
      console.error('Failed to fetch products', res.status);
      return { items: [], total: 0, page: 1, totalPages: 1 };
    }
    
    const data = await res.json();
    
    // Check if data is array (old format) or object with items (new format)
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
      // Fallback for old URLs containing SKU instead of UUID
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
