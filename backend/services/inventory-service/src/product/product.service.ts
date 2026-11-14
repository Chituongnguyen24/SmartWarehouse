import { Injectable, Logger } from '@nestjs/common';

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
  price?: number;
  originalPrice?: number;
  imageUrl?: string;
  isFlashSale?: boolean;
  discountPercent?: number;
}

@Injectable()
export class ProductService {
  private readonly logger = new Logger(ProductService.name);
  private cache = new Map<string, { product: Product; expires: number }>();
  private readonly productServiceUrl = process.env.PRODUCT_SERVICE_URL || 'http://localhost:3010';

  clearCache(idOrSku?: string) {
    if (idOrSku) {
      this.cache.delete(idOrSku.trim());
    } else {
      this.cache.clear();
    }
  }

  async findOneBySku(sku: string, forceFresh = false): Promise<Product | null> {
    return this.findOne(sku, forceFresh);
  }

  async findOne(idOrSku: string, forceFresh = false): Promise<Product | null> {
    if (!idOrSku) return null;
    const clean = idOrSku.trim();
    const now = Date.now();
    if (!forceFresh) {
      const cached = this.cache.get(clean);
      if (cached && cached.expires > now) {
        return cached.product;
      }
    }

    try {
      const res = await fetch(`${this.productServiceUrl}/products/${encodeURIComponent(clean)}`);
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
            price: Number(data.price || 0),
            originalPrice: Number(data.originalPrice || data.price || 0),
            imageUrl: data.imageUrl,
            isFlashSale: Boolean(data.isFlashSale),
            discountPercent: Number(data.discountPercent || 0),
          };
          this.cache.set(data.id, { product, expires: now + 60000 });
          this.cache.set(data.sku, { product, expires: now + 60000 });
          return product;
        }
      }

      // If not found by direct ID, search by SKU
      const searchRes = await fetch(`${this.productServiceUrl}/products?search=${encodeURIComponent(clean)}&limit=1`);
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        const items = Array.isArray(searchData) ? searchData : (searchData.items || []);
        const found = items.find((p: any) => p.sku === clean || p.id === clean || (p.sku && p.sku.toLowerCase() === clean.toLowerCase()));
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
            price: Number(found.price || 0),
            originalPrice: Number(found.originalPrice || found.price || 0),
            imageUrl: found.imageUrl,
            isFlashSale: Boolean(found.isFlashSale),
            discountPercent: Number(found.discountPercent || 0),
          };
          this.cache.set(found.id, { product, expires: now + 60000 });
          this.cache.set(found.sku, { product, expires: now + 60000 });
          return product;
        }
      }
    } catch (e: any) {
      this.logger.warn(`Could not reach product-service (${this.productServiceUrl}) for ${clean}: ${e?.message}`);
    }

    return null;
  }
}
