import { OnModuleInit } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Product } from './product.entity';
export declare class ProductService implements OnModuleInit {
    private productRepository;
    constructor(productRepository: Repository<Product>);
    onModuleInit(): Promise<void>;
    findAll(keyword?: string, category?: string, isFlashSale?: boolean, page?: number, limit?: number): Promise<{
        items: Product[];
        total: number;
        page: number;
        totalPages: number;
    }>;
    findOne(id: string): Promise<Product | null>;
    findOneBySku(sku: string): Promise<Product | null>;
    create(prod: Partial<Product>): Promise<Product>;
    update(id: string, prod: Partial<Product>): Promise<Product>;
    remove(id: string): Promise<void>;
}
