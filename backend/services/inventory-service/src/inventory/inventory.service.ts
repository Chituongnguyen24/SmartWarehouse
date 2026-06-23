import { Injectable, OnModuleInit, NotFoundException, BadRequestException } from '@nestjs/core';
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

    // Seed some mock lots for Dalat Milk & Hao Hao noodles to show FEFO logic working
    const milkProduct = await this.productService.findOneBySku('MILK-DALAT-1L');
    if (milkProduct) {
      const lotsCount = await this.lotRepository.countBy({ productId: milkProduct.id });
      if (lotsCount === 0) {
        const today = new Date();
        const expiry1 = new Date();
        expiry1.setDate(today.getDate() + 5); // Expires in 5 days
        const expiry2 = new Date();
        expiry2.setDate(today.getDate() + 10); // Expires in 10 days, but is AT_RISK

        // Lot 1: Expires in 5 days, Normal risk (0)
        await this.importLot({
          lotCode: 'LOT-MILK-001',
          sku: 'MILK-DALAT-1L',
          supplierId: defaultSuppliers[0].id,
          expiryDate: expiry1,
          quantity: 100,
          zone: 'COLD',
          location: 'cold-shelf-A1',
          riskScore: 0,
          status: LotStatus.NORMAL,
          createdBy: 'admin-id',
        });

        // Lot 2: Expires in 10 days, High risk (75) due to temp violation (At-Risk)
        await this.importLot({
          lotCode: 'LOT-MILK-002',
          sku: 'MILK-DALAT-1L',
          supplierId: defaultSuppliers[0].id,
          expiryDate: expiry2,
          quantity: 150,
          zone: 'COLD',
          location: 'cold-shelf-A2',
          riskScore: 75,
          status: LotStatus.AT_RISK,
          createdBy: 'admin-id',
        });

        console.log('Seeded initial inventory lots for MILK-DALAT-1L');
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

  async getSmartFefoSuggestions(sku: string, requiredQty: number): Promise<any[]> {
    const product = await this.productService.findOneBySku(sku);
    if (!product) {
      throw new NotFoundException(`Product with SKU ${sku} not found`);
    }

    // Get all lots with remaining stock for this product that are not expired
    const activeLots = await this.lotRepository.createQueryBuilder('lot')
      .where('lot.product_id = :productId', { productId: product.id })
      .andWhere('lot.remaining_qty > 0')
      .andWhere('lot.expiry_date > :now', { now: new Date() })
      .getMany();

    const today = new Date();

    // Map and score each lot
    // Priority Score = (SpoilageRiskScore * 2) - DaysUntilExpiry
    // Lots with higher Priority Scores will be suggested FIRST.
    // - E.g. a lot with risk 80 expiring in 10 days gets: 160 - 10 = 150.
    // - E.g. a lot with risk 0 expiring in 3 days gets: 0 - 3 = -3.
    // The degraded lot will correctly be outputted FIRST to consume it before it spoils completely.
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
