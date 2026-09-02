import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './product.entity';
import { LARGE_SEED_PRODUCTS } from './product.seed-data';

@Injectable()
export class ProductService implements OnModuleInit {
  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
  ) {}

  async onModuleInit() {
    // Tắt auto-seed để sử dụng hoàn toàn dữ liệu thật từ DB của người dùng
    console.log('[ProductService] Initialized with real database data.');
  }

  async findAll(
    keyword?: string,
    category?: string,
    isFlashSale?: boolean,
    page: number = 1,
    limit: number = 20
  ): Promise<{ items: Product[], total: number, page: number, totalPages: number }> {
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

    return {
      items,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit)
    };
  }

  async getCategories(): Promise<{ name: string; count: number }[]> {
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

    return Array.from(categoryMap.values()).sort((a, b) => b.count - a.count);
  }

  async findOne(id: string): Promise<Product | null> {
    const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id);
    if (isUuid) {
      return this.productRepository.findOneBy({ id });
    }
    return this.productRepository.findOneBy({ sku: id });
  }

  async findOneBySku(sku: string): Promise<Product | null> {
    return this.productRepository.findOneBy({ sku });
  }

  async create(prod: Partial<Product>): Promise<Product> {
    const newProd = this.productRepository.create(prod);
    return this.productRepository.save(newProd);
  }

  async update(id: string, prod: Partial<Product>): Promise<Product> {
    await this.productRepository.update(id, prod);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.productRepository.delete(id);
  }
}
