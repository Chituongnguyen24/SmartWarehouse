"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InventoryService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const lot_entity_1 = require("./entities/lot.entity");
const supplier_entity_1 = require("./entities/supplier.entity");
const stock_movement_entity_1 = require("./entities/stock-movement.entity");
const product_service_1 = require("../product/product.service");
const ioredis_1 = require("ioredis");
let InventoryService = class InventoryService {
    constructor(lotRepository, supplierRepository, movementRepository, productService) {
        this.lotRepository = lotRepository;
        this.supplierRepository = supplierRepository;
        this.movementRepository = movementRepository;
        this.productService = productService;
        this.redisClient = new ioredis_1.default({
            host: process.env.REDIS_HOST || 'localhost',
            port: Number(process.env.REDIS_PORT) || 6379,
        });
    }
    async onModuleInit() {
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
        const milkProduct = await this.productService.findOneBySku('MILK-DALAT-1L');
        if (milkProduct) {
            const lotsCount = await this.lotRepository.countBy({ productId: milkProduct.id });
            if (lotsCount === 0) {
                const today = new Date();
                const expiry1 = new Date();
                expiry1.setDate(today.getDate() + 5);
                const expiry2 = new Date();
                expiry2.setDate(today.getDate() + 10);
                await this.importLot({
                    lotCode: 'LOT-MILK-001',
                    sku: 'MILK-DALAT-1L',
                    supplierId: defaultSuppliers[0].id,
                    expiryDate: expiry1,
                    quantity: 100,
                    zone: 'COLD',
                    location: 'cold-shelf-A1',
                    riskScore: 0,
                    status: lot_entity_1.LotStatus.NORMAL,
                    createdBy: 'admin-id',
                });
                await this.importLot({
                    lotCode: 'LOT-MILK-002',
                    sku: 'MILK-DALAT-1L',
                    supplierId: defaultSuppliers[0].id,
                    expiryDate: expiry2,
                    quantity: 150,
                    zone: 'COLD',
                    location: 'cold-shelf-A2',
                    riskScore: 75,
                    status: lot_entity_1.LotStatus.AT_RISK,
                    createdBy: 'admin-id',
                });
                console.log('Seeded initial inventory lots for MILK-DALAT-1L');
            }
        }
    }
    async findAllSuppliers() {
        return this.supplierRepository.find();
    }
    async createSupplier(dto) {
        return this.supplierRepository.save(this.supplierRepository.create(dto));
    }
    async findAllLots() {
        return this.lotRepository.find();
    }
    async findLotsByProduct(productId) {
        return this.lotRepository.findBy({ productId });
    }
    async importLot(dto) {
        const product = await this.productService.findOneBySku(dto.sku);
        if (!product) {
            throw new common_1.NotFoundException(`Product with SKU ${dto.sku} not found`);
        }
        const supplier = await this.supplierRepository.findOneBy({ id: dto.supplierId });
        if (!supplier) {
            throw new common_1.NotFoundException(`Supplier with ID ${dto.supplierId} not found`);
        }
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
            status: dto.status || lot_entity_1.LotStatus.NORMAL,
            createdBy: dto.createdBy,
        });
        const savedLot = await this.lotRepository.save(lot);
        const movement = this.movementRepository.create({
            lotId: savedLot.id,
            movementType: stock_movement_entity_1.MovementType.IN,
            quantity: dto.quantity,
            reason: 'IMPORT',
            performedBy: dto.createdBy,
        });
        await this.movementRepository.save(movement);
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
    async exportStock(dto) {
        const lot = await this.lotRepository.findOneBy({ id: dto.lotId });
        if (!lot) {
            throw new common_1.NotFoundException(`Lot with ID ${dto.lotId} not found`);
        }
        if (lot.remainingQty < dto.quantity) {
            throw new common_1.BadRequestException(`Insufficient stock in lot ${lot.lotCode}. Available: ${lot.remainingQty}, Requested: ${dto.quantity}`);
        }
        lot.remainingQty -= dto.quantity;
        const updatedLot = await this.lotRepository.save(lot);
        const movement = this.movementRepository.create({
            lotId: lot.id,
            movementType: stock_movement_entity_1.MovementType.OUT,
            quantity: dto.quantity,
            reason: dto.reason,
            performedBy: dto.performedBy,
        });
        await this.movementRepository.save(movement);
        const product = await this.productService.findOne(lot.productId);
        if (product) {
            const activeLots = await this.lotRepository.findBy({ productId: product.id });
            const totalStock = activeLots.reduce((sum, l) => sum + l.remainingQty, 0);
            const minStockThreshold = 50;
            if (totalStock === 0) {
                await this.redisClient.publish('stock_depleted', JSON.stringify({ sku: product.sku, timestamp: new Date().toISOString() }));
            }
            else if (totalStock < minStockThreshold) {
                await this.redisClient.publish('low_stock', JSON.stringify({ sku: product.sku, currentStock: totalStock, timestamp: new Date().toISOString() }));
            }
        }
        return updatedLot;
    }
    async getSmartFefoSuggestions(sku, requiredQty) {
        const product = await this.productService.findOneBySku(sku);
        if (!product) {
            throw new common_1.NotFoundException(`Product with SKU ${sku} not found`);
        }
        const activeLots = await this.lotRepository.createQueryBuilder('lot')
            .where('lot.product_id = :productId', { productId: product.id })
            .andWhere('lot.remaining_qty > 0')
            .andWhere('lot.expiry_date > :now', { now: new Date() })
            .getMany();
        const today = new Date();
        const scoredLots = activeLots.map(lot => {
            const daysUntilExpiry = Math.max(0, (new Date(lot.expiryDate).getTime() - today.getTime()) / (1000 * 3600 * 24));
            const priorityScore = (lot.riskScore * 2.0) - daysUntilExpiry;
            return {
                ...lot,
                daysUntilExpiry: Math.round(daysUntilExpiry * 10) / 10,
                priorityScore: Math.round(priorityScore * 10) / 10,
            };
        });
        scoredLots.sort((a, b) => b.priorityScore - a.priorityScore);
        let allocatedQty = 0;
        const suggestionList = [];
        for (const lot of scoredLots) {
            if (allocatedQty >= requiredQty)
                break;
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
    async getMovementsReport() {
        return this.movementRepository.find({
            order: { createdAt: 'DESC' },
        });
    }
    async getExpiryAlertReport(days) {
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
    async updateLotRisk(id, riskScore, status) {
        const lot = await this.lotRepository.findOneBy({ id });
        if (!lot) {
            throw new common_1.NotFoundException(`Lot with ID ${id} not found`);
        }
        lot.riskScore = riskScore;
        lot.status = status;
        return this.lotRepository.save(lot);
    }
};
exports.InventoryService = InventoryService;
exports.InventoryService = InventoryService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(lot_entity_1.Lot)),
    __param(1, (0, typeorm_1.InjectRepository)(supplier_entity_1.Supplier)),
    __param(2, (0, typeorm_1.InjectRepository)(stock_movement_entity_1.StockMovement)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        product_service_1.ProductService])
], InventoryService);
//# sourceMappingURL=inventory.service.js.map