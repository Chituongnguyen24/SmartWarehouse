import { OnModuleInit } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Warehouse } from './warehouse.entity';
export declare class WarehouseService implements OnModuleInit {
    private warehouseRepository;
    constructor(warehouseRepository: Repository<Warehouse>);
    onModuleInit(): Promise<void>;
    findAll(): Promise<Warehouse[]>;
    findOne(id: string): Promise<Warehouse>;
    findByCode(code: string): Promise<Warehouse>;
    create(dto: Partial<Warehouse>): Promise<Warehouse>;
    update(id: string, dto: Partial<Warehouse>): Promise<Warehouse>;
    remove(id: string): Promise<void>;
}
