import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

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
  private readonly logger = new Logger(ProductService.name);
  private productServiceUrl: string;
  private cache = new Map<string, { product: Product; expires: number }>();

  constructor(private readonly config: ConfigService) {
    this.productServiceUrl = this.config.get<string>(
      'PRODUCT_SERVICE_URL',
      'http://localhost:3010',
    );
  }

  async findOneBySku(sku: string): Promise<Product | null> {
    return this.findProductByIdOrSku(sku);
  }

  async findOne(id: string): Promise<Product | null> {
    return this.findProductByIdOrSku(id);
  }

  async findProductByIdOrSku(idOrSku: string): Promise<Product | null> {
    if (!idOrSku) return null;

    const clean = idOrSku.trim();
    const now = Date.now();
    const cached = this.cache.get(clean);
    if (cached && cached.expires > now) {
      return cached.product;
    }

    try {
      const res = await fetch(
        `${this.productServiceUrl}/products/${encodeURIComponent(clean)}`,
      );
      if (res.ok) {
        const data = await res.json();
        if (data && (data.id || data.sku)) {
          const product: Product = {
            id: data.id,
            sku: data.sku,
            name: data.name,
            category: data.category,
            storageType: data.storageType || StorageType.DRY,
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

      // If not directly by ID, search by SKU
      const searchRes = await fetch(
        `${this.productServiceUrl}/products?search=${encodeURIComponent(clean)}&limit=1`,
      );
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        const items = Array.isArray(searchData)
          ? searchData
          : searchData.items || [];
        const found = items.find(
          (p: any) =>
            p.sku === clean ||
            p.id === clean ||
            (p.sku && p.sku.toLowerCase() === clean.toLowerCase()),
        );
        if (found) {
          const product: Product = {
            id: found.id,
            sku: found.sku,
            name: found.name,
            category: found.category,
            storageType: found.storageType || StorageType.DRY,
            minTemp: found.minTemp,
            maxTemp: found.maxTemp,
            maxHumidity: found.maxHumidity,
            unit: found.unit || 'Cái',
          };
          this.cache.set(found.id, { product, expires: now + 60000 });
          this.cache.set(found.sku, { product, expires: now + 60000 });
          return product;
        }
      }
    } catch (err: any) {
      this.logger.warn(
        `Failed to query Product Service (${this.productServiceUrl}) for ${clean}: ${err?.message}`,
      );
    }

    return null;
  }
}
