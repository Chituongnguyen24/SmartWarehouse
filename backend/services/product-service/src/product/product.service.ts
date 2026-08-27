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
    // Delete legacy initial mock items
    try {
      await this.productRepository.createQueryBuilder()
        .delete()
        .where("category IN (:...cats)", { cats: ['Dairy', 'Meat & Seafood', 'Dry Goods', 'Produce'] })
        .execute();
    } catch (e) {
      console.log('No legacy categories to delete');
    }

    // Auto-seed large default supermarket dataset
    for (const item of LARGE_SEED_PRODUCTS) {
      const exists = await this.productRepository.findOneBy({ sku: item.sku });
      if (exists) {
        // Update existing record with new e-commerce fields
        await this.productRepository.save({ ...exists, ...item });
      } else {
        const prod = this.productRepository.create(item);
        await this.productRepository.save(prod);
        console.log(`Seeded product SKU: ${item.sku}`);
      }
    }
  }

  async findAll(): Promise<Product[]> {
    return this.productRepository.find();
  }

  async findOne(id: string): Promise<Product | null> {
    return this.productRepository.findOneBy({ id });
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
