import { Injectable, OnModuleInit, ConflictException, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product, StorageType } from './product.entity';
import Redis from 'ioredis';

@Injectable()
export class ProductService implements OnModuleInit {
  private redisClient: Redis;

  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
  ) {
    this.redisClient = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: Number(process.env.REDIS_PORT) || 6379,
      maxRetriesPerRequest: null,
      enableOfflineQueue: false,
      retryStrategy: (times) => Math.min(times * 100, 3000),
    });

    this.redisClient.on('error', (err) => {
      console.warn(`[ProductService] Redis warning: ${err.message}`);
    });
  }

  async onModuleInit() {
    console.log('[ProductService] Initialized with real database data & Redis Caching.');
  }

  private async invalidateProductCache() {
    try {
      if (this.redisClient && this.redisClient.status === 'ready') {
        const keys = await this.redisClient.keys('cache:product:*');
        const catKeys = await this.redisClient.keys('cache:categories:*');
        const allKeys = [...keys, ...catKeys];
        if (allKeys.length > 0) {
          await this.redisClient.del(...allKeys);
          console.log(`[PRODUCT REDIS CACHE] 🧹 Invalidated ${allKeys.length} product cache keys`);
        }
      }
    } catch (e) {
      console.warn('[PRODUCT REDIS CACHE] Failed to invalidate cache:', e.message);
    }
  }

  async findAll(
    keyword?: string,
    category?: string,
    isFlashSale?: boolean,
    page: number = 1,
    limit: number = 20
  ): Promise<{ items: Product[], total: number, page: number, totalPages: number }> {
    const cacheKey = `cache:product:list:${keyword || ''}:${category || ''}:${isFlashSale ?? ''}:${page}:${limit}`;

    // 1. Check Redis Cache
    try {
      if (this.redisClient && this.redisClient.status === 'ready') {
        const cached = await this.redisClient.get(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }
      }
    } catch (e) {}

    const queryBuilder = this.productRepository.createQueryBuilder('product');

    if (keyword) {
      const cleanKeyword = keyword.trim();
      const noHyphen = cleanKeyword.replace(/-/g, '');
      queryBuilder.andWhere(
        '(product.name ILIKE :keyword OR product.sku ILIKE :keyword OR REPLACE(product.sku, \'-\', \'\') ILIKE :noHyphen)',
        { keyword: `%${cleanKeyword}%`, noHyphen: `%${noHyphen}%` }
      );
    }
    
    if (category) {
      queryBuilder.andWhere('LOWER(TRIM(product.category)) = LOWER(TRIM(:category))', { category });
    }

    if (isFlashSale !== undefined) {
      queryBuilder.andWhere('product.isFlashSale = :isFlashSale', { isFlashSale });
    }

    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);
    
    // Sort by latest created first or highest sold count
    queryBuilder.orderBy('product.soldCount', 'DESC');

    const [items, total] = await queryBuilder.getManyAndCount();

    const result = {
      items,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit)
    };

    // 2. Store in Redis with TTL 300 seconds
    try {
      if (this.redisClient && this.redisClient.status === 'ready') {
        await this.redisClient.set(cacheKey, JSON.stringify(result), 'EX', 300);
      }
    } catch (e) {}

    return result;
  }

  async getCategories(): Promise<{ name: string; count: number }[]> {
    const cacheKey = 'cache:categories:all';
    try {
      if (this.redisClient && this.redisClient.status === 'ready') {
        const cached = await this.redisClient.get(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }
      }
    } catch (e) {}

    const rawResults = await this.productRepository
      .createQueryBuilder('product')
      .select('TRIM(product.category)', 'name')
      .addSelect('COUNT(product.id)', 'count')
      .where("product.category IS NOT NULL AND TRIM(product.category) != ''")
      .groupBy('TRIM(product.category)')
      .orderBy('COUNT(product.id)', 'DESC')
      .getRawMany();

    const categoryMap = new Map<string, { name: string; count: number }>();
    for (const r of rawResults) {
      const trimmedName = (r.name || '').trim();
      const lowerKey = trimmedName.toLowerCase();
      const count = Number(r.count) || 0;

      if (!categoryMap.has(lowerKey)) {
        categoryMap.set(lowerKey, { name: trimmedName, count });
      } else {
        const existing = categoryMap.get(lowerKey)!;
        existing.count += count;
        // Ưu tiên tên có viết hoa viết thường (Title Case) thay vì ALL CAPS
        if (trimmedName !== trimmedName.toUpperCase() && existing.name === existing.name.toUpperCase()) {
          existing.name = trimmedName;
        }
      }
    }

    const categories = Array.from(categoryMap.values()).sort((a, b) => b.count - a.count);

    try {
      if (this.redisClient && this.redisClient.status === 'ready') {
        await this.redisClient.set(cacheKey, JSON.stringify(categories), 'EX', 600);
      }
    } catch (e) {}

    return categories;
  }

  async findOne(id: string): Promise<Product | null> {
    const cacheKey = `cache:product:item:${id}`;
    try {
      if (this.redisClient && this.redisClient.status === 'ready') {
        const cached = await this.redisClient.get(cacheKey);
        if (cached) return JSON.parse(cached);
      }
    } catch (e) {}

    const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id);
    const prod = isUuid
      ? await this.productRepository.findOneBy({ id })
      : await this.productRepository.findOneBy({ sku: id });

    if (prod) {
      try {
        if (this.redisClient && this.redisClient.status === 'ready') {
          await this.redisClient.set(cacheKey, JSON.stringify(prod), 'EX', 300);
        }
      } catch (e) {}
    }

    return prod;
  }

  async findOneBySku(sku: string): Promise<Product | null> {
    const cacheKey = `cache:product:sku:${sku}`;
    try {
      if (this.redisClient && this.redisClient.status === 'ready') {
        const cached = await this.redisClient.get(cacheKey);
        if (cached) return JSON.parse(cached);
      }
    } catch (e) {}

    const prod = await this.productRepository.findOneBy({ sku });
    if (prod) {
      try {
        if (this.redisClient && this.redisClient.status === 'ready') {
          await this.redisClient.set(cacheKey, JSON.stringify(prod), 'EX', 300);
        }
      } catch (e) {}
    }
    return prod;
  }

  private sanitizeProductData(data: any): Partial<Product> {
    const allowedKeys: (keyof Product)[] = [
      'sku', 'name', 'category', 'storageType', 'minTemp', 'maxTemp', 'maxHumidity',
      'unit', 'price', 'originalPrice', 'imageUrl', 'description', 'origin', 'preservation',
      'isFlashSale', 'discountPercent', 'rating', 'soldCount', 'stock'
    ];
    const sanitized: any = {};
    for (const key of allowedKeys) {
      if (data[key] !== undefined) {
        sanitized[key] = data[key];
      }
    }
    // Chuẩn hóa kho mát (COOL -> COLD)
    if (sanitized.storageType === 'COOL') {
      sanitized.storageType = StorageType.COLD;
    }
    return sanitized;
  }

  private broadcastProductEvent(event: string, payload: any) {
    try {
      fetch('http://localhost:3004/orders/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event, payload }),
      }).catch(() => {});
    } catch (e) {}
  }

  async generateNextSku(): Promise<string> {
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yy = String(now.getFullYear()).slice(-2);
    const prefix = `CT-${mm}${yy}`;

    const productsWithPrefix = await this.productRepository
      .createQueryBuilder('product')
      .select('product.sku')
      .where('product.sku LIKE :prefix', { prefix: `${prefix}%` })
      .getMany();

    let maxSeq = 0;
    for (const p of productsWithPrefix) {
      const match = p.sku.match(/^CT-\d{4}(\d{4})$/);
      if (match && match[1]) {
        const seq = parseInt(match[1], 10);
        if (!isNaN(seq) && seq > maxSeq) {
          maxSeq = seq;
        }
      }
    }

    if (maxSeq === 0) {
      const totalCount = await this.productRepository.count();
      maxSeq = totalCount;
    }

    const nextSeq = maxSeq + 1;
    const seqStr = String(nextSeq).padStart(4, '0');
    return `${prefix}${seqStr}`;
  }

  async create(prod: Partial<Product>): Promise<Product> {
    const sanitized = this.sanitizeProductData(prod);

    // Tự động sinh mã SKU theo chuẩn CT-MMYYxxxx nếu để trống
    if (!sanitized.sku || !sanitized.sku.trim()) {
      sanitized.sku = await this.generateNextSku();
    } else {
      sanitized.sku = sanitized.sku.trim().toUpperCase();
    }

    // Kiểm tra trùng mã SKU
    const existing = await this.productRepository.findOneBy({ sku: sanitized.sku });
    if (existing) {
      throw new ConflictException(`Mã sản phẩm (SKU) "${sanitized.sku}" đã tồn tại trên hệ thống. Vui lòng nhập mã khác hoặc để hệ thống tự động sinh mã.`);
    }

    // QUY TẮC BẮT BUỘC NGHIỆP VỤ KHO:
    // Sản phẩm mới khởi tạo trên danh mục chưa hề có lô hàng (lot) nào trong các kho thực tế.
    // Tồn kho khởi tạo BẮT BUỘC là 0. Chỉ khi nhập kho (Inbound) và cất kệ thành công thì tồn kho mới tăng.
    sanitized.stock = 0;

    const newProd = this.productRepository.create(sanitized);
    const saved = await this.productRepository.save(newProd);
    await this.invalidateProductCache();
    this.broadcastProductEvent('product_created', saved);
    return saved;
  }

  async update(id: string, prod: Partial<Product>): Promise<Product> {
    const existing = await this.productRepository.findOneBy({ id });
    if (!existing) {
      throw new NotFoundException('Không tìm thấy sản phẩm cần cập nhật');
    }

    const sanitized = this.sanitizeProductData(prod);

    // QUY TẮC BẮT BUỘC: Khi đã có mã sản phẩm (SKU) thì KHÔNG ĐƯỢC PHÉP SỬA
    if (sanitized.sku && sanitized.sku.trim().toUpperCase() !== existing.sku) {
      throw new BadRequestException(`Mã sản phẩm (SKU) là định danh cố định không thể thay đổi sau khi tạo (Mã hiện tại: ${existing.sku}).`);
    }

    // Luôn giữ nguyên SKU gốc, không cho phép update trường sku
    delete sanitized.sku;

    await this.productRepository.update(id, sanitized);
    await this.invalidateProductCache();
    const updated = await this.findOne(id);
    this.broadcastProductEvent('product_updated', updated);
    return updated;
  }

  async remove(id: string): Promise<void> {
    const existing = await this.findOne(id);
    await this.productRepository.delete(id);
    await this.invalidateProductCache();
    this.broadcastProductEvent('product_deleted', { id, sku: existing?.sku });
  }

  async syncStock(skuOrId: string, directStock?: number): Promise<Product | null> {
    if (!skuOrId) return null;
    const target = await this.productRepository.findOne({
      where: [{ sku: skuOrId }, { id: skuOrId }]
    });
    if (!target) return null;

    let newStock = directStock;
    if (newStock === undefined) {
      try {
        const res = await fetch('http://localhost:3011/inventory/lots?limit=10000');
        if (res.ok) {
          const lots = await res.json();
          newStock = lots
            .filter((l: any) => (l.productId === target.sku || l.productId === target.id) && Number(l.remainingQty) > 0)
            .reduce((sum: number, l: any) => sum + Number(l.remainingQty), 0);
        }
      } catch (e: any) {
        console.warn(`[ProductService] Failed to query lots for stock sync: ${e.message}`);
      }
    }

    if (newStock !== undefined) {
      target.stock = Math.max(0, Number(newStock) || 0);
      await this.productRepository.save(target);
      await this.invalidateProductCache();
      this.broadcastProductEvent('product_updated', target);
      console.log(`[ProductService] 🔄 Synced stock for ${target.sku} (${target.name}): ${target.stock}`);
    }

    return target;
  }

  async syncAllStock(): Promise<{ updated: number; zero: number }> {
    try {
      const res = await fetch('http://localhost:3011/inventory/lots?limit=10000');
      if (!res.ok) return { updated: 0, zero: 0 };
      const lots = await res.json();
      const stockMap = new Map<string, number>();
      for (const l of lots) {
        if (l.productId && Number(l.remainingQty) > 0) {
          stockMap.set(l.productId, (stockMap.get(l.productId) || 0) + Number(l.remainingQty));
        }
      }

      const allProds = await this.productRepository.find();
      let updatedCount = 0;
      let zeroCount = 0;
      for (const p of allProds) {
        const qty = stockMap.get(p.id) || stockMap.get(p.sku) || 0;
        if (p.stock !== qty) {
          p.stock = qty;
          await this.productRepository.save(p);
          this.broadcastProductEvent('product_updated', p);
          updatedCount++;
        }
        if (qty === 0) zeroCount++;
      }
      await this.invalidateProductCache();
      console.log(`[ProductService] 🔄 Synced all stock: ${updatedCount} products updated (${zeroCount} out of stock).`);
      return { updated: updatedCount, zero: zeroCount };
    } catch (e: any) {
      console.warn(`[ProductService] syncAllStock error: ${e.message}`);
      return { updated: 0, zero: 0 };
    }
  }
}
