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
  async findOneBySku(sku: string): Promise<Product | null> {
    return mockProducts.find(p => p.sku === sku) || null;
  }

  async findOne(id: string): Promise<Product | null> {
    return mockProducts.find(p => p.id === id) || null;
  }
}
