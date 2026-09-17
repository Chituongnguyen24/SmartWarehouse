import { Injectable, OnModuleInit, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { Lot, LotStatus } from './entities/lot.entity';
import { Supplier } from './entities/supplier.entity';
import { StockMovement, MovementType } from './entities/stock-movement.entity';
import { ProductService } from '../product/product.service';
import { MLSpoilageService, MLPredictionResult } from './ml-spoilage.service';
import Redis from 'ioredis';

import { InventoryOutboxService } from '../outbox/outbox.service';

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
    private mlSpoilageService: MLSpoilageService,
    private outboxService: InventoryOutboxService,
  ) {
    // Connect to Redis for publishing events with safe error handling
    this.redisClient = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: Number(process.env.REDIS_PORT) || 6379,
      maxRetriesPerRequest: null,
      enableOfflineQueue: false,
      retryStrategy: (times) => Math.min(times * 100, 3000),
    });

    this.redisClient.on('error', (err) => {
      console.warn(`[InventoryService] Redis connection warning: ${err.message}`);
    });
  }

  async onModuleInit() {
    console.log('[INVENTORY SERVICE] onModuleInit starting (async non-blocking)...');
    this.initializeData().catch((err) => {
      console.warn('[INVENTORY SERVICE] Background initialization warning:', err.message);
    });
  }

  private async initializeData() {
    // Tự động giải phóng vị trí kệ kho và xóa sạch các lô có tồn kho <= 0
    try {
      await this.lotRepository.delete({ remainingQty: LessThanOrEqual(0) });
    } catch (e) {
      console.warn('[INVENTORY SERVICE] Failed to delete empty lots:', e);
    }
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
    let warehouses: any[] = [];
    try {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const res = await fetch('http://localhost:3007/warehouses');
          if (res.ok) {
            warehouses = await res.json();
            break;
          }
        } catch (e) {
          // ignore
        }
        await new Promise((resolve) => setTimeout(resolve, 300));
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

      // WH-005 (HCM Center-East - Binh Thạnh)
      { warehouseCode: 'WH-005', sku: 'MILK-DALAT-1L', quantity: 120, lotCode: 'LOT-MILK-WH5', zone: 'COLD', location: 'cold-shelf-A1', daysOffset: 6, riskScore: 0, status: LotStatus.NORMAL },
      { warehouseCode: 'WH-005', sku: 'NOODLE-HAOHAO', quantity: 450, lotCode: 'LOT-NOODLE-WH5', zone: 'DRY', location: 'dry-shelf-A1', daysOffset: 50, riskScore: 0, status: LotStatus.NORMAL },
      { warehouseCode: 'WH-005', sku: 'BEEF-STEAK-US', quantity: 40, lotCode: 'LOT-BEEF-WH5', zone: 'FROZEN', location: 'frozen-shelf-A1', daysOffset: 25, riskScore: 0, status: LotStatus.NORMAL },
      { warehouseCode: 'WH-005', sku: 'TOMATO-DALAT', quantity: 70, lotCode: 'LOT-TOMATO-WH5', zone: 'COLD', location: 'cold-shelf-A1', daysOffset: 5, riskScore: 0, status: LotStatus.NORMAL },

      // WH-006 (HCM Northwest - Go Vap)
      { warehouseCode: 'WH-006', sku: 'MILK-DALAT-1L', quantity: 90, lotCode: 'LOT-MILK-WH6', zone: 'COLD', location: 'cold-shelf-A1', daysOffset: 4, riskScore: 0, status: LotStatus.NORMAL },
      { warehouseCode: 'WH-006', sku: 'NOODLE-HAOHAO', quantity: 250, lotCode: 'LOT-NOODLE-WH6', zone: 'DRY', location: 'dry-shelf-A1', daysOffset: 35, riskScore: 0, status: LotStatus.NORMAL },
      { warehouseCode: 'WH-006', sku: 'BEEF-STEAK-US', quantity: 60, lotCode: 'LOT-BEEF-WH6', zone: 'FROZEN', location: 'frozen-shelf-A1', daysOffset: 15, riskScore: 0, status: LotStatus.NORMAL },
      { warehouseCode: 'WH-006', sku: 'TOMATO-DALAT', quantity: 50, lotCode: 'LOT-TOMATO-WH6', zone: 'COLD', location: 'cold-shelf-A1', daysOffset: 3, riskScore: 0, status: LotStatus.NORMAL },
    ];

    for (const lotData of seedWarehouseLots) {
      try {
        const exists = await this.lotRepository.findOneBy({ lotCode: lotData.lotCode });
        if (!exists) {
          const product = await this.productService.findOneBySku(lotData.sku);
          if (!product) {
            continue; // Bỏ qua nếu SKU không có trong DB
          }
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
      } catch (err) {
        // Safe catch to ensure bootstrap never fails
      }
    }
    console.log('[INVENTORY SERVICE] onModuleInit finished successfully!');
  }

  async findMovements(limit = 100): Promise<StockMovement[]> {
    return this.movementRepository.find({
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async findAllSuppliers(): Promise<Supplier[]> {
    return this.supplierRepository.find({ order: { name: 'ASC' } });
  }

  async createSupplier(dto: Partial<Supplier>): Promise<Supplier> {
    return this.supplierRepository.save(this.supplierRepository.create(dto));
  }

  async updateSupplier(id: string, dto: Partial<Supplier>): Promise<Supplier> {
    await this.supplierRepository.update(id, dto);
    return this.supplierRepository.findOneByOrFail({ id });
  }

  async deleteSupplier(id: string): Promise<void> {
    await this.supplierRepository.delete(id);
  }

  private async invalidateLotsCache() {
    try {
      if (this.redisClient && this.redisClient.status === 'ready') {
        const keys = await this.redisClient.keys('cache:lots:*');
        if (keys.length > 0) {
          await this.redisClient.del(...keys);
          console.log(`[INVENTORY REDIS CACHE] 🧹 Invalidated ${keys.length} lots cache keys`);
        }
      }
    } catch (e) {
      console.warn('[INVENTORY REDIS CACHE] Failed to invalidate cache:', e.message);
    }
  }

  async findAllLots(options?: { warehouseCode?: string; zone?: string; limit?: number; search?: string }): Promise<Lot[]> {
    const cacheKey = `cache:lots:${options?.warehouseCode || 'ALL'}:${options?.zone || 'ALL'}:${options?.limit || 5000}:${options?.search || ''}`;

    // 1. Check Redis Cache
    try {
      if (this.redisClient && this.redisClient.status === 'ready') {
        const cached = await this.redisClient.get(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }
      }
    } catch (e) {
      // Fallback directly to DB
    }

    const query = this.lotRepository.createQueryBuilder('lot')
      .where('lot.remainingQty > :minQty', { minQty: 0 });

    if (options?.warehouseCode) {
      query.andWhere('(lot.warehouseCode = :wh OR lot.warehouseId = :wh)', { wh: options.warehouseCode });
    }

    if (options?.zone) {
      query.andWhere('lot.zone = :zone', { zone: options.zone.toUpperCase() });
    }

    if (options?.search) {
      const searchPattern = `%${options.search}%`;
      query.andWhere('(lot.lotCode ILIKE :search OR lot.location ILIKE :search OR lot.productId ILIKE :search)', { search: searchPattern });
    }

    query.orderBy('lot.expiryDate', 'ASC');

    if (options?.limit && options.limit > 0) {
      query.take(options.limit);
    } else if (options?.warehouseCode) {
      query.take(5000);
    } else {
      query.take(5000);
    }

    const results = await query.getMany();

    // 2. Store in Redis with TTL 60 seconds
    try {
      if (this.redisClient && this.redisClient.status === 'ready') {
        await this.redisClient.set(cacheKey, JSON.stringify(results), 'EX', 60);
      }
    } catch (e) {
      // Ignore cache write error
    }

    return results;
  }

  async findLotsByProduct(productId: string): Promise<Lot[]> {
    return this.lotRepository.findBy({ productId });
  }

  async importLot(dto: {
    lotCode: string;
    sku: string;
    supplierId?: string;
    expiryDate?: Date | string;
    quantity: number;
    zone?: string;
    location?: string;
    riskScore?: number;
    status?: LotStatus;
    createdBy?: string;
    warehouseId?: string;
    warehouseCode?: string;
  }): Promise<Lot> {
    let canonicalSku = dto.sku;
    try {
      const product = await this.productService.findOneBySku(dto.sku);
      if (product?.sku) canonicalSku = product.sku;
    } catch (e) {
      // Keep dto.sku if lookup throws
    }

    let supplierId = dto.supplierId || 'SUP-001';
    if (dto.supplierId) {
      try {
        const supplier = await this.supplierRepository.findOneBy({ id: dto.supplierId });
        if (supplier?.id) supplierId = supplier.id;
      } catch (e) {
        // Safe fallback
      }
    }

    // Check if lot with this lotCode already exists -> Update instead of duplicate key error
    let existingLot = await this.lotRepository.findOneBy({ lotCode: dto.lotCode });
    if (existingLot) {
      existingLot.remainingQty += dto.quantity;
      existingLot.quantity += dto.quantity;
      if (dto.location) existingLot.location = dto.location;
      if (dto.zone) existingLot.zone = dto.zone;
      if (dto.warehouseCode) existingLot.warehouseCode = dto.warehouseCode;
      return this.lotRepository.save(existingLot);
    }

    // Default expiry 90 days if missing
    const expDate = dto.expiryDate ? new Date(dto.expiryDate) : new Date(Date.now() + 90 * 86400000);

    // Create lot record
    const lot = this.lotRepository.create({
      lotCode: dto.lotCode,
      productId: canonicalSku,
      supplierId: supplierId,
      importDate: new Date(),
      expiryDate: expDate,
      quantity: dto.quantity,
      remainingQty: dto.quantity,
      zone: dto.zone || 'DRY',
      location: dto.location || 'shelf-C1',
      riskScore: dto.riskScore || 0,
      status: dto.status || LotStatus.NORMAL,
      createdBy: dto.createdBy || 'system-staff',
      warehouseId: dto.warehouseId,
      warehouseCode: dto.warehouseCode || 'WH-006',
    });

    const savedLot = await this.lotRepository.save(lot);

    // Save Stock Movement
    const movement = this.movementRepository.create({
      lotId: savedLot.id,
      movementType: MovementType.IN,
      quantity: dto.quantity,
      reason: 'IMPORT',
      performedBy: dto.createdBy || 'system-staff',
    });
    await this.movementRepository.save(movement);

    // Publish event to Redis
    const eventPayload = {
      eventId: Math.random().toString(36).substring(7),
      timestamp: new Date().toISOString(),
      lotId: savedLot.id,
      sku: canonicalSku,
      zone: savedLot.zone,
      quantity: savedLot.quantity,
    };
    try {
      if (this.redisClient && this.redisClient.status === 'ready') {
        await this.redisClient.publish('lot_imported', JSON.stringify(eventPayload));
      }
    } catch (e) {
      console.warn('[INVENTORY SERVICE] Failed to publish lot_imported event:', e.message);
    }

    // Save to Transactional Outbox
    await this.outboxService.recordEvent('INVENTORY_LOT', savedLot.id, 'lot_imported', eventPayload);

    this.invalidateLotsCache();

    return savedLot;
  }

  async exportStock(dto: {
    lotId?: string;
    lotCode?: string;
    quantity: number;
    reason?: string;
    performedBy?: string;
  }): Promise<Lot | null> {
    let lot: Lot | null = null;
    if (dto.lotId) {
      if (dto.lotId.startsWith('LOT-')) {
        lot = await this.lotRepository.findOneBy({ lotCode: dto.lotId });
      } else {
        lot = await this.lotRepository.findOneBy({ id: dto.lotId });
      }
    }
    if (!lot && dto.lotCode) {
      lot = await this.lotRepository.findOneBy({ lotCode: dto.lotCode });
    }
    if (!lot) {
      throw new NotFoundException(`Lot with ID/Code '${dto.lotId || dto.lotCode}' not found in database`);
    }

    const requestedQty = Math.max(1, Number(dto.quantity) || 1);
    const exportQty = Math.min(requestedQty, lot.remainingQty);

    const initialLotId = lot.id;
    const initialLotCode = lot.lotCode;
    const initialProductId = lot.productId;
    const initialLocation = lot.location;

    lot.remainingQty -= exportQty;
    let isDeleted = false;

    if (lot.remainingQty <= 0) {
      // Khi xuất hết toàn bộ số lượng: Xóa hoàn toàn lô hàng khỏi database và giải phóng kệ
      await this.lotRepository.delete(initialLotId);
      isDeleted = true;
      console.log(`[INVENTORY SERVICE] 🗑️ Lot ${initialLotCode} (ID: ${initialLotId}, Shelf: ${initialLocation}) completely exported (remainingQty <= 0). Deleted from database.`);
    } else {
      await this.lotRepository.save(lot);
      console.log(`[INVENTORY SERVICE] 📦 Lot ${initialLotCode} remainingQty updated to ${lot.remainingQty}`);
    }

    // Save Stock Movement record
    try {
      const movement = this.movementRepository.create({
        lotId: initialLotId,
        movementType: MovementType.OUT,
        quantity: exportQty,
        reason: dto.reason || 'EXPORT_OUTBOUND',
        performedBy: dto.performedBy || 'system-staff',
      });
      await this.movementRepository.save(movement);
    } catch (e) {
      console.warn('[INVENTORY SERVICE] Warning saving stock movement:', e.message);
    }

    // Check low stock & publish redis events
    try {
      const product = await this.productService.findOne(initialProductId);
      if (product) {
        const activeLots = await this.lotRepository.findBy({ productId: product.id });
        const totalStock = activeLots.reduce((sum, l) => sum + l.remainingQty, 0);
        
        const minStockThreshold = 50;
        if (this.redisClient && this.redisClient.status === 'ready') {
          if (totalStock === 0) {
            await this.redisClient.publish('stock_depleted', JSON.stringify({ sku: product.sku, timestamp: new Date().toISOString() }));
          } else if (totalStock < minStockThreshold) {
            await this.redisClient.publish('low_stock', JSON.stringify({ sku: product.sku, currentStock: totalStock, timestamp: new Date().toISOString() }));
          }
          const exportPayload = {
            lotId: initialLotId,
            lotCode: initialLotCode,
            quantity: exportQty,
            remainingQty: isDeleted ? 0 : lot.remainingQty,
            isDeleted,
            shelfLocation: initialLocation,
            timestamp: new Date().toISOString()
          };
          await this.redisClient.publish('lot_exported', JSON.stringify(exportPayload));
          await this.outboxService.recordEvent('INVENTORY_LOT', initialLotId, 'lot_exported', exportPayload);
        }
      }
    } catch (e) {
      console.warn('[INVENTORY SERVICE] Failed to publish stock alert event:', e.message);
    }

    this.invalidateLotsCache();

    return {
      success: true,
      deleted: isDeleted,
      remainingQty: isDeleted ? 0 : lot.remainingQty,
      lotCode: initialLotCode,
      location: initialLocation,
      lot: isDeleted ? null : lot,
    } as any;
  }

  async deleteLot(idOrCode: string): Promise<{ success: boolean; message: string }> {
    let lot: Lot | null = null;
    if (idOrCode.startsWith('LOT-')) {
      lot = await this.lotRepository.findOneBy({ lotCode: idOrCode });
    } else {
      lot = await this.lotRepository.findOneBy({ id: idOrCode });
    }
    if (!lot) {
      throw new NotFoundException(`Lot with ID/Code '${idOrCode}' not found`);
    }

    const lotCode = lot.lotCode;
    const location = lot.location;
    await this.lotRepository.delete(lot.id);
    console.log(`[INVENTORY SERVICE] 🗑️ Manually deleted lot ${lotCode} from location ${location}`);
    this.invalidateLotsCache();
    return { success: true, message: `Đã xóa lô hàng ${lotCode} và giải phóng vị trí ${location}` };
  }

  async adjustLotQuantity(dto: {
    lotId: string;
    actualQuantity: number;
    reason: string;
    performedBy: string;
  }): Promise<Lot> {
    let lot: Lot | null = null;

    // 1. Tìm theo lotCode trước nếu là mã LOT-
    if (dto.lotId && dto.lotId.startsWith('LOT-')) {
      lot = await this.lotRepository.findOneBy({ lotCode: dto.lotId });
    }

    // 2. Tìm theo UUID ID
    if (!lot && dto.lotId) {
      try {
        lot = await this.lotRepository.findOneBy({ id: dto.lotId });
      } catch (err) {
        // Tránh lỗi invalid UUID format từ postgres
      }
    }

    // 3. Tìm theo lotCode nếu chưa thấy
    if (!lot && dto.lotId) {
      lot = await this.lotRepository.findOneBy({ lotCode: dto.lotId });
    }

    if (!lot) {
      throw new NotFoundException(`Không tìm thấy lô hàng với mã/ID ${dto.lotId}`);
    }

    const difference = dto.actualQuantity - lot.remainingQty;

    // Save Stock Movement if quantity changed
    if (difference !== 0) {
      const movement = this.movementRepository.create({
        lotId: lot.id,
        movementType: difference > 0 ? MovementType.IN : MovementType.OUT,
        quantity: Math.abs(difference),
        reason: dto.actualQuantity <= 0 ? `[XUẤT HẾT / HỦY BỎ - GIẢI PHÓNG VỊ TRÍ KỆ ${lot.location || ''}] ${dto.reason}` : `[KIỂM KÊ] ${dto.reason}`,
        performedBy: dto.performedBy,
      });
      await this.movementRepository.save(movement);
    }

    // Nếu số lượng về 0: Xóa lô hàng khỏi bảng để giải phóng vị trí kệ kho hoàn toàn
    if (dto.actualQuantity <= 0) {
      await this.lotRepository.delete(lot.id);
      this.invalidateLotsCache();
      return {
        ...lot,
        remainingQty: 0,
      } as any;
    }

    lot.remainingQty = dto.actualQuantity;
    lot.lastAuditedAt = new Date();
    lot.lastAuditedBy = dto.performedBy || 'Nhân viên trực ca';
    lot.lastAuditDiff = difference;
    lot.lastAuditReason = dto.reason;
    lot.lastAuditActualQty = dto.actualQuantity;
    const updatedLot = await this.lotRepository.save(lot);

    this.invalidateLotsCache();
    return updatedLot;
  }

  async reserveInventory(items: { sku: string; quantity: number }[], warehouseId?: string): Promise<boolean> {
    const queryRunner = this.lotRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (const item of items) {
        let product: any = null;
        try {
          product = await this.productService.findOneBySku(item.sku);
        } catch (e) {}

        if (!product) {
          try {
            product = await this.productService.findOne(item.sku);
          } catch (e) {}
        }

        const targetIds = [item.sku];
        if (product?.id) targetIds.push(product.id);
        if (product?.sku) targetIds.push(product.sku);

        // Lock rows for this product to prevent concurrent reservations
        const qb = queryRunner.manager
          .createQueryBuilder(Lot, 'lot')
          .setLock('pessimistic_write')
          .where('(lot.product_id IN (:...targetIds) OR lot.lot_code ILIKE :lotPrefix)', {
            targetIds,
            lotPrefix: `%${item.sku}%`,
          })
          .andWhere('lot.remaining_qty > 0');

        if (warehouseId && warehouseId !== 'ALL') {
          qb.andWhere('(lot.warehouse_id = :warehouseId OR lot.warehouse_code = :warehouseId)', { warehouseId });
        }

        const lots = await qb.orderBy('lot.expiry_date', 'ASC').getMany();

        const totalAvailable = lots.reduce((sum, lot) => sum + lot.remainingQty, 0);

        if (totalAvailable < item.quantity) {
          throw new BadRequestException(`Out of stock for SKU ${item.sku}. Requested: ${item.quantity}, Available: ${totalAvailable}`);
        }

        let qtyToFulfill = item.quantity;
        for (const lot of lots) {
          if (qtyToFulfill <= 0) break;

          const deduction = Math.min(lot.remainingQty, qtyToFulfill);
          lot.remainingQty -= deduction;
          qtyToFulfill -= deduction;

          // Lưu vết đối soát kế toán: Không bao giờ thất thoát (Liên kết mã lô, SKU, số lượng, lý do)
          const movement = queryRunner.manager.create(StockMovement, {
            lotId: lot.id,
            movementType: MovementType.OUT,
            quantity: deduction,
            reason: `[XUẤT BÁN ĐƠN HÀNG] SKU: ${item.sku} - Mã Lô: ${lot.lotCode} (Vị trí kệ: ${lot.location || 'Khu vực chung'})`,
            performedBy: 'HỆ THỐNG XUẤT BÁN TỰ ĐỘNG (FEFO)',
          });
          await queryRunner.manager.save(StockMovement, movement);

          // Nếu lô đã xuất hết toàn bộ số lượng -> Xóa khỏi bảng tồn kho để giải phóng vị trí kệ kho
          if (lot.remainingQty <= 0) {
            await queryRunner.manager.delete(Lot, lot.id);
          } else {
            await queryRunner.manager.save(Lot, lot);
          }
        }
      }

      await queryRunner.commitTransaction();
      this.invalidateLotsCache();
      return true;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
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

    for (const rawSku of skus) {
      const sku = (rawSku || '').trim();
      if (!sku) continue;

      let product = await this.productService.findOneBySku(sku);
      if (!product) {
        try {
          product = await this.productService.findOne(sku);
        } catch (e) {}
      }
      if (!product) continue;

      const targetIds = [sku];
      if (product?.id) targetIds.push(product.id);
      if (product?.sku) targetIds.push(product.sku);

      const lots = await this.lotRepository.createQueryBuilder('lot')
        .where('(lot.product_id IN (:...targetIds) OR lot.lot_code ILIKE :lotPrefix)', {
          targetIds,
          lotPrefix: `%${sku}%`,
        })
        .andWhere('lot.remaining_qty > 0')
        .andWhere('lot.expiry_date > :now', { now: new Date() })
        .getMany();

      for (const lot of lots) {
        const whCode = lot.warehouseCode || 'UNKNOWN';
        if (!results[whCode]) {
          results[whCode] = {};
        }
        
        // Key under raw requested identifier, canonical SKU, product ID, and lot productId
        const keys = Array.from(new Set([sku, product?.sku, product?.id, lot.productId])).filter(Boolean);
        for (const k of keys) {
          if (!results[whCode][k]) {
            results[whCode][k] = 0;
          }
          results[whCode][k] += lot.remainingQty;
        }
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

  // ─────────────────────────────────────────────────────────
  //  🤖 MACHINE LEARNING SPOILAGE PREDICTION PIPELINE
  // ─────────────────────────────────────────────────────────

  /**
   * Run batch ML risk prediction across all active lots in a warehouse
   */
  async getMLBatchAssessment(warehouseCode?: string): Promise<{
    timestamp: string;
    model: string;
    warehouseCode: string;
    totalLotsEvaluated: number;
    dangerCount: number;
    warningCount: number;
    safeCount: number;
    averageRiskScore: number;
    predictions: MLPredictionResult[];
  }> {
    const qb = this.lotRepository.createQueryBuilder('lot')
      .where('lot.remaining_qty > 0');

    if (warehouseCode && warehouseCode !== 'ALL') {
      qb.andWhere('(lot.warehouse_code = :warehouseCode OR lot.warehouse_id = :warehouseCode)', { warehouseCode });
    }

    const lots = await qb.getMany();
    const predictions: MLPredictionResult[] = [];

    let dangerCount = 0;
    let warningCount = 0;
    let safeCount = 0;
    let scoreSum = 0;

    for (const lot of lots) {
      let product: any = null;
      try {
        if (lot.productId) {
          product = await this.productService.findOne(lot.productId);
        }
      } catch (e) {
        // ignore product lookup failure
      }

      const prediction = this.mlSpoilageService.predictLotRisk(lot, {
        productName: product?.name,
        sku: product?.sku || lot.productId,
      });

      if (prediction.riskLevel === 'DANGER') dangerCount++;
      else if (prediction.riskLevel === 'WARNING') warningCount++;
      else safeCount++;

      scoreSum += prediction.mlRiskScore;
      predictions.push(prediction);
    }

    // Sort predictions: highest risk first
    predictions.sort((a, b) => b.mlRiskScore - a.mlRiskScore);

    return {
      timestamp: new Date().toISOString(),
      model: 'Ensemble Arrhenius Gradient-Boosted Spoilage Estimator v2.1',
      warehouseCode: warehouseCode || 'ALL',
      totalLotsEvaluated: lots.length,
      dangerCount,
      warningCount,
      safeCount,
      averageRiskScore: lots.length > 0 ? Math.round((scoreSum / lots.length) * 10) / 10 : 0,
      predictions,
    };
  }

  /**
   * Predict degradation & risk for a single lot
   */
  async predictSingleLotML(lotId: string): Promise<MLPredictionResult> {
    const lot = await this.lotRepository.findOneBy({ id: lotId });
    if (!lot) {
      throw new NotFoundException(`Lot with ID ${lotId} not found`);
    }

    let product: any = null;
    try {
      if (lot.productId) {
        product = await this.productService.findOne(lot.productId);
      }
    } catch (e) {}

    return this.mlSpoilageService.predictLotRisk(lot, {
      productName: product?.name,
      sku: product?.sku || lot.productId,
    });
  }

  /**
   * Run ML model across all lots and sync predicted risk scores back to DB
   */
  async syncMLRiskScores(warehouseCode?: string): Promise<{
    syncedCount: number;
    updatedToDanger: number;
    updatedToWarning: number;
    message: string;
  }> {
    const qb = this.lotRepository.createQueryBuilder('lot')
      .where('lot.remaining_qty > 0');

    if (warehouseCode && warehouseCode !== 'ALL') {
      qb.andWhere('(lot.warehouse_code = :warehouseCode OR lot.warehouse_id = :warehouseCode)', { warehouseCode });
    }

    const lots = await qb.getMany();
    let updatedToDanger = 0;
    let updatedToWarning = 0;

    for (const lot of lots) {
      let product: any = null;
      try {
        if (lot.productId) product = await this.productService.findOne(lot.productId);
      } catch (e) {}

      const prediction = this.mlSpoilageService.predictLotRisk(lot, {
        productName: product?.name,
        sku: product?.sku || lot.productId,
      });

      lot.riskScore = prediction.mlRiskScore;
      if (prediction.riskLevel === 'DANGER' && lot.status !== LotStatus.EXPIRED) {
        lot.status = LotStatus.AT_RISK;
        updatedToDanger++;
      } else if (prediction.riskLevel === 'WARNING') {
        lot.status = LotStatus.AT_RISK;
        updatedToWarning++;
      }

      await this.lotRepository.save(lot);
    }

    return {
      syncedCount: lots.length,
      updatedToDanger,
      updatedToWarning,
      message: `Successfully synchronized ML Spoilage Risk Scores for ${lots.length} active lots.`,
    };
  }
}
