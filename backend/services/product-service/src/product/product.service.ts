import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './product.entity';
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
      queryBuilder.andWhere('product.name ILIKE :keyword', { keyword: `%${keyword}%` });
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

  async create(prod: Partial<Product>): Promise<Product> {
    const newProd = this.productRepository.create(prod);
    const saved = await this.productRepository.save(newProd);
    this.invalidateProductCache();
    return saved;
  }

  async update(id: string, prod: Partial<Product>): Promise<Product> {
    await this.productRepository.update(id, prod);
    this.invalidateProductCache();
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.productRepository.delete(id);
    this.invalidateProductCache();
  }
}
