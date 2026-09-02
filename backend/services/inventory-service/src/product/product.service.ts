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

@Injectable()
export class ProductService {
  private async getAuthToken(): Promise<string> {
    try {
      const response = await fetch('http://localhost:3012/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'admin@sfwms.vn',
          password: 'password123',
        }),
      });
      if (!response.ok) throw new Error(`Auth failed with status ${response.status}`);
      const data = await response.json();
      return data.access_token;
    } catch (err) {
      console.error('[INVENTORY PRODUCT SERVICE] Authentication failed:', err.message);
      return '';
    }
  }

  async findOneBySku(sku: string): Promise<Product | null> {
    try {
      const token = await this.getAuthToken();
      const res = await fetch(`http://localhost:3010/products/sku/${sku}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.error(`[INVENTORY PRODUCT SERVICE] Failed to fetch product by SKU ${sku}:`, e.message);
    }

    // Fallback: guess category and storage type from SKU prefixes
    const category = sku.startsWith('VEG-') || sku.startsWith('FRUIT-') ? 'Produce'
                   : sku.startsWith('MEAT-') || sku.startsWith('SEAFOOD-') ? 'Meat & Seafood'
                   : 'Dry Goods';
    const storageType = sku.startsWith('MEAT-') || sku.startsWith('SEAFOOD-') ? StorageType.FROZEN
                      : sku.startsWith('VEG-') || sku.startsWith('FRUIT-') || sku.startsWith('MILK-') ? StorageType.COLD
                      : StorageType.DRY;
    return {
      id: sku,
      sku,
      name: sku.replace(/-/g, ' '),
      category,
      storageType,
      unit: 'Cái',
    };
  }

  async findOne(id: string): Promise<Product | null> {
    try {
      const token = await this.getAuthToken();
      const res = await fetch(`http://localhost:3010/products/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.error(`[INVENTORY PRODUCT SERVICE] Failed to fetch product by ID ${id}:`, e.message);
    }
    return this.findOneBySku(id);
  }
}
}
