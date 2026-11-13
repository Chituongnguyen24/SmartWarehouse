import { Injectable } from '@nestjs/common';

export enum StorageType {
  COLD = 'COLD',
  FROZEN = 'FROZEN',
  DRY = 'DRY',
}

export class Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  storageType: StorageType;
  minTemp?: number;
  maxTemp?: number;
  maxHumidity?: number;
  unit: string;
}

const mockProducts: Product[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    sku: 'EM-89553',
    name: 'Sữa Tươi Tiệt Trùng Nutimilk Tươi Sạch Không Đường 1L',
    category: 'Sữa Nước',
    storageType: StorageType.COLD,
    minTemp: 0,
    maxTemp: 4,
    maxHumidity: 80,
    unit: 'Hộp',
  },
  {
    id: '11111111-1111-1111-1111-111111111111',
    sku: 'MILK-DALAT-1L',
    name: 'Dalat Milk Fresh Milk 1L',
    category: 'Dairy',
    storageType: StorageType.COLD,
    minTemp: 0,
    maxTemp: 4,
    maxHumidity: 80,
    unit: 'box',
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    sku: 'BEEF-STEAK-US',
    name: 'US Beef Ribeye Steak 500g',
    category: 'Meat & Seafood',
    storageType: StorageType.FROZEN,
    minTemp: -25,
    maxTemp: -18,
    maxHumidity: 65,
    unit: 'pack',
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    sku: 'NOODLE-HAOHAO',
    name: 'Hao Hao Sour & Spicy Shrimp Noodles',
    category: 'Dry Goods',
    storageType: StorageType.DRY,
    minTemp: 15,
    maxTemp: 35,
    maxHumidity: 70,
    unit: 'box',
  },
  {
    id: '44444444-4444-4444-4444-444444444444',
    sku: 'EM-11473',
    name: 'Cà Chua Cherry DALATGAP 300G',
    category: 'THỰC PHẨM BẢO QUẢN MÁT',
    storageType: StorageType.COLD,
    minTemp: 0,
    maxTemp: 4,
    maxHumidity: 85,
    unit: 'Hộp',
  },
  {
    id: '44444444-4444-4444-4444-444444444444',
    sku: 'TOMATO-DALAT',
    name: 'Dalat Organic Tomatoes 1kg',
    category: 'Produce',
    storageType: StorageType.COLD,
    minTemp: 4,
    maxTemp: 10,
    maxHumidity: 90,
    unit: 'pack',
  },
];

@Injectable()
export class ProductService {
  private cache = new Map<string, { product: Product; expires: number }>();

  async findOneBySku(sku: string): Promise<Product | null> {
    return this.findOne(sku);
  }

  async findOne(idOrSku: string): Promise<Product | null> {
    if (!idOrSku) return null;
    const now = Date.now();
    const cached = this.cache.get(idOrSku);
    if (cached && cached.expires > now) {
      return cached.product;
    }

    try {
      const res = await fetch(`http://localhost:3010/products/${encodeURIComponent(idOrSku)}`);
      if (res.ok) {
        const data = await res.json();
        if (data && (data.id || data.sku)) {
          const product: Product = {
            id: data.id,
            sku: data.sku,
            name: data.name,
            category: data.category,
            storageType: data.storageType,
            minTemp: data.minTemp,
            maxTemp: data.maxTemp,
            maxHumidity: data.maxHumidity,
            unit: data.unit || 'Cái',
          };
          this.cache.set(data.id, { product, expires: now + 60000 });
          this.cache.set(data.sku, { product, expires: now + 60000 });
          return product;
        }
      }
    } catch (e) {}

    // Dự phòng tìm trong danh sách mẫu nếu product-service chưa sẵn sàng
    const mock = mockProducts.find(p => p.id === idOrSku || p.sku === idOrSku);
    return mock || null;
  }
}
