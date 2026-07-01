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
exports.InboundOrderService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const inbound_order_entity_1 = require("./inbound-order.entity");
const inbound_order_item_entity_1 = require("./inbound-order-item.entity");
const amqp = require("amqp-connection-manager");
let InboundOrderService = class InboundOrderService {
    constructor(orderRepository, itemRepository) {
        this.orderRepository = orderRepository;
        this.itemRepository = itemRepository;
    }
    onModuleInit() {
        const rabbitUrl = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
        this.rmqConnection = amqp.connect([rabbitUrl]);
        this.rmqChannel = this.rmqConnection.createChannel({
            json: true,
            setup: (channel) => {
                return channel.assertExchange('inbound.events', 'topic', { durable: true });
            },
        });
    }
    onModuleDestroy() {
        if (this.rmqConnection) {
            this.rmqConnection.close();
        }
    }
    async getAuthToken() {
        try {
            const response = await fetch('http://localhost:3012/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: 'admin@sfwms.vn',
                    password: 'password123',
                }),
            });
            if (!response.ok) {
                throw new Error(`Login failed with status ${response.status}`);
            }
            const data = await response.json();
            return data.access_token;
        }
        catch (err) {
            console.error('[INBOUND SERVICE] Authentication failed with user-service:', err.message);
            throw err;
        }
    }
    async generateOrderCode() {
        const today = new Date();
        const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
        const count = await this.orderRepository.count();
        return `IB-${dateStr}-${String(count + 1).padStart(3, '0')}`;
    }
    async create(dto) {
        const orderCode = await this.generateOrderCode();
        const order = this.orderRepository.create({
            orderCode,
            supplierId: dto.supplierId,
            supplierName: dto.supplierName,
            status: 'PENDING',
            expectedDate: dto.expectedDate ? new Date(dto.expectedDate) : null,
            totalItems: dto.items.length,
            totalQuantity: dto.items.reduce((sum, i) => sum + i.expectedQuantity, 0),
            notes: dto.notes,
            createdBy: dto.createdBy,
        });
        const savedOrder = await this.orderRepository.save(order);
        for (const item of dto.items) {
            const orderItem = this.itemRepository.create({
                inboundOrderId: savedOrder.id,
                sku: item.sku,
                productName: item.productName,
                expectedQuantity: item.expectedQuantity,
                expiryDate: new Date(item.expiryDate),
                productionDate: item.productionDate ? new Date(item.productionDate) : null,
                status: 'PENDING',
            });
            await this.itemRepository.save(orderItem);
        }
        return this.findOne(savedOrder.id);
    }
    async findAll(status) {
        const where = status ? { status } : {};
        return this.orderRepository.find({
            where,
            relations: ['items'],
            order: { createdAt: 'DESC' },
        });
    }
    async findOne(id) {
        const order = await this.orderRepository.findOne({
            where: { id },
            relations: ['items'],
        });
        if (!order)
            throw new common_1.NotFoundException(`InboundOrder ${id} not found`);
        return order;
    }
    async startReceiving(id) {
        const order = await this.findOne(id);
        if (order.status !== 'PENDING') {
            throw new common_1.BadRequestException(`Order ${order.orderCode} is not in PENDING status`);
        }
        order.status = 'RECEIVING';
        order.receivedDate = new Date();
        return this.orderRepository.save(order);
    }
    async updateReceivedQuantity(itemId, receivedQuantity) {
        const item = await this.itemRepository.findOneBy({ id: itemId });
        if (!item)
            throw new common_1.NotFoundException(`Item ${itemId} not found`);
        item.receivedQuantity = receivedQuantity;
        return this.itemRepository.save(item);
    }
    async startQualityCheck(id) {
        const order = await this.findOne(id);
        if (order.status !== 'RECEIVING') {
            throw new common_1.BadRequestException(`Order ${order.orderCode} is not in RECEIVING status`);
        }
        order.status = 'QUALITY_CHECK';
        return this.orderRepository.save(order);
    }
    async startStoring(id, qualityPassed) {
        const order = await this.findOne(id);
        if (order.status !== 'QUALITY_CHECK') {
            throw new common_1.BadRequestException(`Order ${order.orderCode} is not in QUALITY_CHECK status`);
        }
        order.qualityCheckPassed = qualityPassed;
        if (!qualityPassed) {
            order.status = 'REJECTED';
            for (const item of order.items) {
                item.status = 'REJECTED';
                await this.itemRepository.save(item);
            }
        }
        else {
            order.status = 'STORING';
            for (const item of order.items) {
                item.status = 'CHECKED';
                await this.itemRepository.save(item);
            }
        }
        return this.orderRepository.save(order);
    }
    async assignStorage(itemId, dto) {
        const item = await this.itemRepository.findOneBy({ id: itemId });
        if (!item)
            throw new common_1.NotFoundException(`Item ${itemId} not found`);
        item.assignedZone = dto.zone;
        item.assignedSlotId = dto.slotId;
        item.lotCode = dto.lotCode;
        item.status = 'STORED';
        return this.itemRepository.save(item);
    }
    async complete(id) {
        const order = await this.findOne(id);
        if (order.status !== 'STORING') {
            throw new common_1.BadRequestException(`Order ${order.orderCode} is not in STORING status`);
        }
        const unstored = order.items.filter((i) => i.status !== 'STORED' && i.status !== 'REJECTED');
        if (unstored.length > 0) {
            throw new common_1.BadRequestException(`${unstored.length} items are not yet stored`);
        }
        order.status = 'COMPLETED';
        const completed = await this.orderRepository.save(order);
        console.log(`[INBOUND] Order ${order.orderCode} COMPLETED. Importing lots to inventory...`);
        try {
            const token = await this.getAuthToken();
            for (const item of order.items) {
                if (item.status !== 'STORED')
                    continue;
                const lotPayload = {
                    lotCode: item.lotCode,
                    sku: item.sku,
                    supplierId: order.supplierId,
                    expiryDate: item.expiryDate.toISOString(),
                    quantity: item.receivedQuantity,
                    zone: item.assignedZone,
                    location: item.assignedSlotId,
                };
                const res = await fetch('http://localhost:3011/inventory/lots/import', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify(lotPayload),
                });
                if (!res.ok) {
                    console.error(`[INBOUND SERVICE] Failed to import lot ${item.lotCode} to inventory: ${res.statusText}`);
                }
                else {
                    console.log(`[INBOUND SERVICE] Successfully imported lot ${item.lotCode} to inventory`);
                }
            }
        }
        catch (err) {
            console.error('[INBOUND SERVICE] Error importing lots to inventory:', err.message);
        }
        try {
            const eventPayload = {
                orderId: completed.id,
                orderCode: completed.orderCode,
                supplierId: completed.supplierId,
                supplierName: completed.supplierName,
                completedAt: new Date().toISOString(),
                items: completed.items.map(i => ({
                    sku: i.sku,
                    lotCode: i.lotCode,
                    quantity: i.receivedQuantity,
                    zone: i.assignedZone,
                    slotId: i.assignedSlotId,
                })),
            };
            await this.rmqChannel.publish('inbound.events', 'inbound.completed', eventPayload);
            console.log(`[INBOUND] Event inbound.completed published to RabbitMQ`);
        }
        catch (err) {
            console.error('[INBOUND SERVICE] Failed to publish RabbitMQ event:', err.message);
        }
        return completed;
    }
    async getStats() {
        const total = await this.orderRepository.count();
        const pending = await this.orderRepository.countBy({ status: 'PENDING' });
        const receiving = await this.orderRepository.countBy({ status: 'RECEIVING' });
        const qualityCheck = await this.orderRepository.countBy({ status: 'QUALITY_CHECK' });
        const storing = await this.orderRepository.countBy({ status: 'STORING' });
        const completed = await this.orderRepository.countBy({ status: 'COMPLETED' });
        const rejected = await this.orderRepository.countBy({ status: 'REJECTED' });
        return { total, pending, receiving, qualityCheck, storing, completed, rejected };
    }
};
exports.InboundOrderService = InboundOrderService;
exports.InboundOrderService = InboundOrderService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(inbound_order_entity_1.InboundOrder)),
    __param(1, (0, typeorm_1.InjectRepository)(inbound_order_item_entity_1.InboundOrderItem)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], InboundOrderService);
//# sourceMappingURL=inbound-order.service.js.map