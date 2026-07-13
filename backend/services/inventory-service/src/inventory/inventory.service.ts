import { Injectable, OnModuleInit, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lot, LotStatus } from './entities/lot.entity';
import { Supplier } from './entities/supplier.entity';
import { StockMovement, MovementType } from './entities/stock-movement.entity';
import { ProductService } from '../product/product.service';
import Redis from 'ioredis';

@Injectable()
export class InventoryService implements OnModuleInit {
  private redisClient: Redis;

  constructor(
    @InjectRepository(Lot)
    private lotRepository: Repository<Lot>,
    @InjectRepository(Supplier)
    private supplierRepository: Repository<Supplier>,
    @InjectRepository(StockMovement)
    private movementRepository: Repository<StockMovement>,
    private productService: ProductService,
  ) {
    // Connect to Redis for publishing events
    this.redisClient = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: Number(process.env.REDIS_PORT) || 6379,
    });
  }

  async onModuleInit() {
    // Seed default suppliers
    const defaultSuppliers = [
      { id: '11111111-1111-1111-1111-111111111111', name: 'Dalat Organic Farms', contact: '0901234567', address: 'Dalat City, Lam Dong' },
      { id: '22222222-2222-2222-2222-222222222222', name: 'Vissan Meat JSC', contact: '0283844438', address: 'Binh Thanh Dist, HCMC' },
      { id: '33333333-3333-3333-3333-333333333333', name: 'Masan Consumer HCMC', contact: '0283827411', address: 'Dist 1, HCMC' },
    ];

    for (const sup of defaultSuppliers) {
      const exists = await this.supplierRepository.findOneBy({ id: sup.id });
      if (!exists) {
        await this.supplierRepository.save(this.supplierRepository.create(sup));
        console.log(`Seeded supplier: ${sup.name}`);
      }
    }

    // Seed some mock lots across the 4 HCMC warehouses to show FEFO & nearest warehouse logic working
    const today = new Date();
    
    // Fetch warehouses from warehouse-service to map their codes to database IDs
    const warehouseIdMap = {};
    try {
      let warehouses = [];
      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          const res = await fetch('http://localhost:3005/warehouses');
          if (res.ok) {
            warehouses = await res.json();
            break;
          }
        } catch (e) {
          // ignore
        }
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
      for (const wh of warehouses) {
        warehouseIdMap[wh.code] = wh.id;
      }
    } catch (err) {
      console.warn('[INVENTORY SERVICE] Failed to fetch warehouses from warehouse-service during seed.', err.message);
    }

    const seedWarehouseLots = [
      // WH-001 (HCM North - District 12)
      { warehouseCode: 'WH-001', sku: 'MILK-DALAT-1L', quantity: 100, lotCode: 'LOT-MILK-WH1', zone: 'COLD', location: 'cold-shelf-A1', daysOffset: 5, riskScore: 0, status: LotStatus.NORMAL },
      { warehouseCode: 'WH-001', sku: 'NOODLE-HAOHAO', quantity: 500, lotCode: 'LOT-NOODLE-WH1', zone: 'DRY', location: 'dry-shelf-A1', daysOffset: 60, riskScore: 0, status: LotStatus.NORMAL },
      { warehouseCode: 'WH-001', sku: 'BEEF-STEAK-US', quantity: 50, lotCode: 'LOT-BEEF-WH1', zone: 'FROZEN', location: 'frozen-shelf-A1', daysOffset: 30, riskScore: 0, status: LotStatus.NORMAL },
      { warehouseCode: 'WH-001', sku: 'TOMATO-DALAT', quantity: 60, lotCode: 'LOT-TOMATO-WH1', zone: 'COLD', location: 'cold-shelf-A3', daysOffset: 4, riskScore: 0, status: LotStatus.NORMAL },

      // WH-002 (HCM East - Thu Duc)
      { warehouseCode: 'WH-002', sku: 'MILK-DALAT-1L', quantity: 150, lotCode: 'LOT-MILK-WH2', zone: 'COLD', location: 'cold-shelf-A2', daysOffset: 10, riskScore: 75, status: LotStatus.AT_RISK },
      { warehouseCode: 'WH-002', sku: 'NOODLE-HAOHAO', quantity: 300, lotCode: 'LOT-NOODLE-WH2', zone: 'DRY', location: 'dry-shelf-A2', daysOffset: 90, riskScore: 0, status: LotStatus.NORMAL },
      { warehouseCode: 'WH-002', sku: 'BEEF-STEAK-US', quantity: 70, lotCode: 'LOT-BEEF-WH2', zone: 'FROZEN', location: 'frozen-shelf-A2', daysOffset: 45, riskScore: 0, status: LotStatus.NORMAL },
      { warehouseCode: 'WH-002', sku: 'TOMATO-DALAT', quantity: 80, lotCode: 'LOT-TOMATO-WH2', zone: 'COLD', location: 'cold-shelf-A4', daysOffset: 6, riskScore: 0, status: LotStatus.NORMAL },

      // WH-003 (HCM West - Binh Chanh)
      { warehouseCode: 'WH-003', sku: 'MILK-DALAT-1L', quantity: 80, lotCode: 'LOT-MILK-WH3', zone: 'COLD', location: 'cold-shelf-A1', daysOffset: 15, riskScore: 0, status: LotStatus.NORMAL },
      { warehouseCode: 'WH-003', sku: 'NOODLE-HAOHAO', quantity: 400, lotCode: 'LOT-NOODLE-WH3', zone: 'DRY', location: 'dry-shelf-A1', daysOffset: 45, riskScore: 0, status: LotStatus.NORMAL },
      { warehouseCode: 'WH-003', sku: 'BEEF-STEAK-US', quantity: 30, lotCode: 'LOT-BEEF-WH3', zone: 'FROZEN', location: 'frozen-shelf-A1', daysOffset: 20, riskScore: 0, status: LotStatus.NORMAL },
      { warehouseCode: 'WH-003', sku: 'TOMATO-DALAT', quantity: 40, lotCode: 'LOT-TOMATO-WH3', zone: 'COLD', location: 'cold-shelf-A1', daysOffset: 3, riskScore: 10, status: LotStatus.NORMAL },

      // WH-004 (HCM South - District 7)
      { warehouseCode: 'WH-004', sku: 'MILK-DALAT-1L', quantity: 200, lotCode: 'LOT-MILK-WH4', zone: 'COLD', location: 'cold-shelf-A3', daysOffset: 8, riskScore: 0, status: LotStatus.NORMAL },
      { warehouseCode: 'WH-004', sku: 'NOODLE-HAOHAO', quantity: 600, lotCode: 'LOT-NOODLE-WH4', zone: 'DRY', location: 'dry-shelf-A3', daysOffset: 120, riskScore: 0, status: LotStatus.NORMAL },
      { warehouseCode: 'WH-004', sku: 'BEEF-STEAK-US', quantity: 100, lotCode: 'LOT-BEEF-WH4', zone: 'FROZEN', location: 'frozen-shelf-A3', daysOffset: 60, riskScore: 0, status: LotStatus.NORMAL },
      { warehouseCode: 'WH-004', sku: 'TOMATO-DALAT', quantity: 120, lotCode: 'LOT-TOMATO-WH4', zone: 'COLD', location: 'cold-shelf-A3', daysOffset: 7, riskScore: 0, status: LotStatus.NORMAL },
    ];

    for (const lotData of seedWarehouseLots) {
      const exists = await this.lotRepository.findOneBy({ lotCode: lotData.lotCode });
      if (!exists) {
        const expiry = new Date();
        expiry.setDate(today.getDate() + lotData.daysOffset);

        await this.importLot({
          lotCode: lotData.lotCode,
          sku: lotData.sku,
          supplierId: defaultSuppliers[0].id,
          expiryDate: expiry,
          quantity: lotData.quantity,
          zone: lotData.zone,
          location: lotData.location,
          riskScore: lotData.riskScore,
          status: lotData.status,
          createdBy: 'admin-id',
          warehouseId: warehouseIdMap[lotData.warehouseCode] || null,
          warehouseCode: lotData.warehouseCode,
        });
        console.log(`[INVENTORY SERVICE] Seeded lot ${lotData.lotCode} for warehouse ${lotData.warehouseCode}`);
      }
    }
  }

  async findAllSuppliers(): Promise<Supplier[]> {
    return this.supplierRepository.find();
  }

  async createSupplier(dto: Partial<Supplier>): Promise<Supplier> {
    return this.supplierRepository.save(this.supplierRepository.create(dto));
  }

  async findAllLots(): Promise<Lot[]> {
    return this.lotRepository.find();
  }

  async findLotsByProduct(productId: string): Promise<Lot[]> {
    return this.lotRepository.findBy({ productId });
  }

  async importLot(dto: {
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
  }): Promise<Lot> {
    const product = await this.productService.findOneBySku(dto.sku);
    if (!product) {
      throw new NotFoundException(`Product with SKU ${dto.sku} not found`);
    }

    const supplier = await this.supplierRepository.findOneBy({ id: dto.supplierId });
    if (!supplier) {
      throw new NotFoundException(`Supplier with ID ${dto.supplierId} not found`);
    }

    // Create lot record
    const lot = this.lotRepository.create({
      lotCode: dto.lotCode,
      productId: product.id,
      supplierId: supplier.id,
      importDate: new Date(),
      expiryDate: new Date(dto.expiryDate),
      quantity: dto.quantity,
      remainingQty: dto.quantity,
      zone: dto.zone,
      location: dto.location,
      riskScore: dto.riskScore || 0,
      status: dto.status || LotStatus.NORMAL,
      createdBy: dto.createdBy,
      warehouseId: dto.warehouseId,
      warehouseCode: dto.warehouseCode,
    });

    const savedLot = await this.lotRepository.save(lot);

    // Save Stock Movement
    const movement = this.movementRepository.create({
      lotId: savedLot.id,
      movementType: MovementType.IN,
      quantity: dto.quantity,
      reason: 'IMPORT',
      performedBy: dto.createdBy,
    });
    await this.movementRepository.save(movement);

    // Publish event to Redis
    const eventPayload = {
      eventId: Math.random().toString(36).substring(7),
      timestamp: new Date().toISOString(),
      lotId: savedLot.id,
      sku: product.sku,
      zone: savedLot.zone,
      quantity: savedLot.quantity,
    };
    await this.redisClient.publish('lot_imported', JSON.stringify(eventPayload));

    return savedLot;
  }

  async exportStock(dto: {
    lotId: string;
    quantity: number;
    reason: string;
    performedBy: string;
  }): Promise<Lot> {
    const lot = await this.lotRepository.findOneBy({ id: dto.lotId });
    if (!lot) {
      throw new NotFoundException(`Lot with ID ${dto.lotId} not found`);
    }

    if (lot.remainingQty < dto.quantity) {
      throw new BadRequestException(`Insufficient stock in lot ${lot.lotCode}. Available: ${lot.remainingQty}, Requested: ${dto.quantity}`);
    }

    lot.remainingQty -= dto.quantity;
    const updatedLot = await this.lotRepository.save(lot);

    // Save Stock Movement
    const movement = this.movementRepository.create({
      lotId: lot.id,
      movementType: MovementType.OUT,
      quantity: dto.quantity,
      reason: dto.reason,
      performedBy: dto.performedBy,
    });
    await this.movementRepository.save(movement);

    // Check low stock
    const product = await this.productService.findOne(lot.productId);
    if (product) {
      const activeLots = await this.lotRepository.findBy({ productId: product.id });
      const totalStock = activeLots.reduce((sum, l) => sum + l.remainingQty, 0);
      
      // Assume a default low stock limit of 50 units
      const minStockThreshold = 50;
      if (totalStock === 0) {
        await this.redisClient.publish('stock_depleted', JSON.stringify({ sku: product.sku, timestamp: new Date().toISOString() }));
      } else if (totalStock < minStockThreshold) {
        await this.redisClient.publish('low_stock', JSON.stringify({ sku: product.sku, currentStock: totalStock, timestamp: new Date().toISOString() }));
      }
    }

    return updatedLot;
  }

  async getSmartFefoSuggestions(sku: string, requiredQty: number, warehouseId?: string): Promise<any> {
    const product = await this.productService.findOneBySku(sku);
    if (!product) {
      throw new NotFoundException(`Product with SKU ${sku} not found`);
    }

    // Get all lots with remaining stock for this product that are not expired
    const qb = this.lotRepository.createQueryBuilder('lot')
      .where('lot.product_id = :productId', { productId: product.id })
      .andWhere('lot.remaining_qty > 0')
      .andWhere('lot.expiry_date > :now', { now: new Date() });

    if (warehouseId) {
      qb.andWhere('(lot.warehouse_id = :warehouseId OR lot.warehouse_code = :warehouseId)', { warehouseId });
    }

    const activeLots = await qb.getMany();

    const today = new Date();

    // Map and score each lot
    // Priority Score = (SpoilageRiskScore * 2) - DaysUntilExpiry
    // Lots with higher Priority Scores will be suggested FIRST.
    const scoredLots = activeLots.map(lot => {
      const daysUntilExpiry = Math.max(0, (new Date(lot.expiryDate).getTime() - today.getTime()) / (1000 * 3600 * 24));
      const priorityScore = (lot.riskScore * 2.0) - daysUntilExpiry;
      return {
        ...lot,
        daysUntilExpiry: Math.round(daysUntilExpiry * 10) / 10,
        priorityScore: Math.round(priorityScore * 10) / 10,
      };
    });

    // Sort descending by priorityScore
    scoredLots.sort((a, b) => b.priorityScore - a.priorityScore);

    // Compute the collection list needed to satisfy the required quantity
    let allocatedQty = 0;
    const suggestionList = [];

    for (const lot of scoredLots) {
      if (allocatedQty >= requiredQty) break;

      const qtyToTake = Math.min(lot.remainingQty, requiredQty - allocatedQty);
      suggestionList.push({
        lotId: lot.id,
        lotCode: lot.lotCode,
        location: lot.location,
        zone: lot.zone,
        remainingQty: lot.remainingQty,
        qtyToTake,
        expiryDate: lot.expiryDate,
        daysUntilExpiry: lot.daysUntilExpiry,
        riskScore: lot.riskScore,
        status: lot.status,
        priorityScore: lot.priorityScore,
      });

      allocatedQty += qtyToTake;
    }

    return {
      sku,
      productName: product.name,
      requiredQty,
      satisfied: allocatedQty >= requiredQty,
      allocatedQty,
      suggestions: suggestionList,
    };
  }

  async getWarehouseStock(skus: string[]): Promise<any> {
    const results = {};

    for (const sku of skus) {
      const product = await this.productService.findOneBySku(sku);
      if (!product) continue;

      const lots = await this.lotRepository.createQueryBuilder('lot')
        .where('lot.product_id = :productId', { productId: product.id })
        .andWhere('lot.remaining_qty > 0')
        .andWhere('lot.expiry_date > :now', { now: new Date() })
        .getMany();

      for (const lot of lots) {
        const whCode = lot.warehouseCode || 'UNKNOWN';
        if (!results[whCode]) {
          results[whCode] = {};
        }
        if (!results[whCode][sku]) {
          results[whCode][sku] = 0;
        }
        results[whCode][sku] += lot.remainingQty;
      }
    }

    return results;
  }

  async getMovementsReport(): Promise<StockMovement[]> {
    return this.movementRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async getExpiryAlertReport(days: number): Promise<any[]> {
    const today = new Date();
    const thresholdDate = new Date();
    thresholdDate.setDate(today.getDate() + days);

    const lots = await this.lotRepository.createQueryBuilder('lot')
      .where('lot.remaining_qty > 0')
      .andWhere('lot.expiry_date BETWEEN :today AND :thresholdDate', { today, thresholdDate })
      .getMany();

    const result = [];
    for (const lot of lots) {
      const product = await this.productService.findOne(lot.productId);
      result.push({
        ...lot,
        productName: product?.name || 'Unknown',
        sku: product?.sku || 'Unknown',
      });
    }

    return result;
  }

  async updateLotRisk(id: string, riskScore: number, status: LotStatus): Promise<Lot> {
    const lot = await this.lotRepository.findOneBy({ id });
    if (!lot) {
      throw new NotFoundException(`Lot with ID ${id} not found`);
    }
    lot.riskScore = riskScore;
    lot.status = status;
    return this.lotRepository.save(lot);
  }
}
