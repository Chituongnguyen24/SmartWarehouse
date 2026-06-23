import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product, StorageType } from './product.entity';

@Injectable()
export class ProductService implements OnModuleInit {
  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
  ) {}

  async onModuleInit() {
    // Auto-seed default products
    const seedProducts = [
      {
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

    for (const item of seedProducts) {
      const exists = await this.productRepository.findOneBy({ sku: item.sku });
      if (!exists) {
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
