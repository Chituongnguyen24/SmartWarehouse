import { OnModuleInit } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Lot, LotStatus } from './entities/lot.entity';
import { Supplier } from './entities/supplier.entity';
import { StockMovement } from './entities/stock-movement.entity';
import { ProductService } from '../product/product.service';
export declare class InventoryService implements OnModuleInit {
    private lotRepository;
    private supplierRepository;
    private movementRepository;
    private productService;
    private redisClient;
    constructor(lotRepository: Repository<Lot>, supplierRepository: Repository<Supplier>, movementRepository: Repository<StockMovement>, productService: ProductService);
    onModuleInit(): Promise<void>;
    findAllSuppliers(): Promise<Supplier[]>;
    createSupplier(dto: Partial<Supplier>): Promise<Supplier>;
    findAllLots(): Promise<Lot[]>;
    findLotsByProduct(productId: string): Promise<Lot[]>;
    importLot(dto: {
        lotCode: string;
        sku: string;
        supplierId: string;
        expiryDate: Date | string;
        quantity: number;
        zone: string;
        location: string;
        riskScore?: number;
        status?: LotStatus;
        createdBy: string;
        warehouseId?: string;
        warehouseCode?: string;
    }): Promise<Lot>;
    exportStock(dto: {
        lotId: string;
        quantity: number;
        reason: string;
        performedBy: string;
    }): Promise<Lot>;
    getSmartFefoSuggestions(sku: string, requiredQty: number, warehouseId?: string): Promise<any>;
    getWarehouseStock(skus: string[]): Promise<any>;
    getMovementsReport(): Promise<StockMovement[]>;
    getExpiryAlertReport(days: number): Promise<any[]>;
    updateLotRisk(id: string, riskScore: number, status: LotStatus): Promise<Lot>;
}
