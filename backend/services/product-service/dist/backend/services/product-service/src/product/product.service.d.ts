import { OnModuleInit } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Product } from './product.entity';
export declare class ProductService implements OnModuleInit {
    private productRepository;
    constructor(productRepository: Repository<Product>);
    onModuleInit(): Promise<void>;
    findAll(): Promise<Product[]>;
    findOne(id: string): Promise<Product | null>;
    findOneBySku(sku: string): Promise<Product | null>;
    create(prod: Partial<Product>): Promise<Product>;
    update(id: string, prod: Partial<Product>): Promise<Product>;
    remove(id: string): Promise<void>;
}
