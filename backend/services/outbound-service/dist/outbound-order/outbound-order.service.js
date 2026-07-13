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
exports.OutboundOrderService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const outbound_order_entity_1 = require("./outbound-order.entity");
const outbound_order_item_entity_1 = require("./outbound-order-item.entity");
const amqp = require("amqp-connection-manager");
let OutboundOrderService = class OutboundOrderService {
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
                return channel.assertExchange('outbound.events', 'topic', { durable: true });
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
            console.error('[OUTBOUND SERVICE] Authentication failed with user-service:', err.message);
            throw err;
        }
    }
    async generateOrderCode() {
        const today = new Date();
        const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
        const count = await this.orderRepository.count();
        return `OB-${dateStr}-${String(count + 1).padStart(3, '0')}`;
    }
    async create(dto) {
        const orderCode = await this.generateOrderCode();
        const order = this.orderRepository.create({
            orderCode,
            status: 'PENDING',
            requestedBy: dto.requestedBy,
            requesterName: dto.requesterName,
            destination: dto.destination,
            warehouseId: dto.warehouseId,
            warehouseCode: dto.warehouseCode,
            latitude: dto.latitude,
            longitude: dto.longitude,
            totalItems: dto.items.length,
            totalQuantity: dto.items.reduce((sum, i) => sum + i.requestedQuantity, 0),
            notes: dto.notes,
        });
        const savedOrder = await this.orderRepository.save(order);
        for (const item of dto.items) {
            await this.itemRepository.save(this.itemRepository.create({
                outboundOrderId: savedOrder.id,
                sku: item.sku,
                productName: item.productName,
                requestedQuantity: item.requestedQuantity,
                status: 'PENDING',
            }));
        }
        return this.findOne(savedOrder.id);
    }
    async calculateNearestWarehouse(dto) {
        let warehouses = [];
        try {
            const res = await fetch('http://localhost:3005/warehouses');
            if (res.ok) {
                warehouses = await res.json();
            }
            else {
                throw new Error(`Failed to fetch warehouses: ${res.statusText}`);
            }
        }
        catch (err) {
            console.error('[OUTBOUND SERVICE] Error fetching warehouses:', err.message);
            warehouses = [
                { id: '11111111-1111-1111-1111-111111111111', code: 'WH-001', name: 'Kho Hàng Quận 12 (HCM North)', latitude: 10.8671, longitude: 106.6713, address: '12 Tô Ký, Quận 12' },
                { id: '22222222-2222-2222-2222-222222222222', code: 'WH-002', name: 'Kho Hàng Thủ Đức (HCM East)', latitude: 10.8494, longitude: 106.7725, address: '1 Võ Văn Ngân, Thủ Đức' },
                { id: '33333333-3333-3333-3333-333333333333', code: 'WH-003', name: 'Kho Hàng Bình Chánh (HCM West)', latitude: 10.6868, longitude: 106.5932, address: 'Tỉnh lộ 10, Bình Chánh' },
                { id: '44444444-4444-4444-4444-444444444444', code: 'WH-004', name: 'Kho Hàng Quận 7 (HCM South)', latitude: 10.7324, longitude: 106.7214, address: '1025 Nguyễn Văn Linh, Quận 7' },
            ];
        }
        let warehouseStock = {};
        try {
            const skus = dto.items.map(item => item.sku).join(',');
            const token = await this.getAuthToken();
            const res = await fetch(`http://localhost:3011/inventory/warehouse-stock?skus=${skus}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                warehouseStock = await res.json();
            }
        }
        catch (err) {
            console.error('[OUTBOUND SERVICE] Error fetching warehouse stock:', err.message);
        }
        const getHaversineDistance = (lat1, lon1, lat2, lon2) => {
            const R = 6371;
            const dLat = (lat2 - lat1) * Math.PI / 180;
            const dLon = (lon2 - lon1) * Math.PI / 180;
            const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(lat1 * Math.PI / 180) *
                    Math.cos(lat2 * Math.PI / 180) *
                    Math.sin(dLon / 2) *
                    Math.sin(dLon / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            return R * c;
        };
        const candidates = warehouses.map(wh => {
            const distance = getHaversineDistance(dto.latitude, dto.longitude, wh.latitude, wh.longitude);
            let fulfilledItems = 0;
            const itemDetails = dto.items.map(item => {
                const stockInWh = (warehouseStock[wh.code] && warehouseStock[wh.code][item.sku]) || 0;
                const fulfilled = Math.min(stockInWh, item.requestedQuantity);
                if (fulfilled >= item.requestedQuantity) {
                    fulfilledItems++;
                }
                return {
                    sku: item.sku,
                    requestedQty: item.requestedQuantity,
                    availableQty: stockInWh,
                    fulfillmentPercent: item.requestedQuantity > 0 ? Math.round((fulfilled / item.requestedQuantity) * 100) : 100,
                };
            });
            const fulfillmentRate = dto.items.length > 0 ? Math.round((fulfilledItems / dto.items.length) * 100) : 100;
            return {
                warehouse: {
                    id: wh.id,
                    code: wh.code,
                    name: wh.name,
                    address: wh.address,
                    latitude: wh.latitude,
                    longitude: wh.longitude,
                },
                distanceKm: Math.round(distance * 100) / 100,
                fulfillmentRate,
                items: itemDetails,
            };
        });
        candidates.sort((a, b) => {
            if (b.fulfillmentRate !== a.fulfillmentRate) {
                return b.fulfillmentRate - a.fulfillmentRate;
            }
            return a.distanceKm - b.distanceKm;
        });
        const rankedCandidates = candidates.map((cand, index) => ({
            ...cand,
            isRecommended: index === 0,
        }));
        return {
            destination: {
                latitude: dto.latitude,
                longitude: dto.longitude,
            },
            warehouses: rankedCandidates,
        };
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
            throw new common_1.NotFoundException(`OutboundOrder ${id} not found`);
        return order;
    }
    async applyFefoSuggestions(orderId, suggestions) {
        const order = await this.findOne(orderId);
        for (const suggestion of suggestions) {
            const item = await this.itemRepository.findOneBy({ id: suggestion.itemId });
            if (!item)
                continue;
            item.lotId = suggestion.lotId;
            item.lotCode = suggestion.lotCode;
            item.slotId = suggestion.slotId;
            item.expiryDate = new Date(suggestion.expiryDate);
            item.riskScore = suggestion.riskScore;
            item.priorityScore = suggestion.priorityScore;
            item.pickedQuantity = suggestion.quantity;
            item.status = 'SUGGESTED';
            await this.itemRepository.save(item);
        }
        order.status = 'PICKING';
        return this.orderRepository.save(order);
    }
    async confirmPicking(orderId) {
        const order = await this.findOne(orderId);
        if (order.status !== 'PICKING') {
            throw new common_1.BadRequestException(`Order ${order.orderCode} is not in PICKING status`);
        }
        for (const item of order.items) {
            if (item.status === 'SUGGESTED') {
                item.status = 'PICKED';
                await this.itemRepository.save(item);
            }
        }
        order.status = 'PACKED';
        return this.orderRepository.save(order);
    }
    async confirm(orderId, confirmedBy) {
        const order = await this.findOne(orderId);
        if (order.status !== 'PACKED') {
            throw new common_1.BadRequestException(`Order ${order.orderCode} is not in PACKED status`);
        }
        order.status = 'CONFIRMED';
        order.confirmedBy = confirmedBy;
        order.confirmedAt = new Date();
        const confirmed = await this.orderRepository.save(order);
        console.log(`[OUTBOUND] Order ${order.orderCode} CONFIRMED. Deducting inventory stock...`);
        try {
            const token = await this.getAuthToken();
            for (const item of order.items) {
                if (!item.lotId || item.pickedQuantity <= 0)
                    continue;
                const deductPayload = {
                    lotId: item.lotId,
                    quantity: item.pickedQuantity,
                    reason: `EXPORT_OUTBOUND_ORDER_${order.orderCode}`,
                };
                const res = await fetch('http://localhost:3011/inventory/lots/export', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify(deductPayload),
                });
                if (!res.ok) {
                    console.error(`[OUTBOUND SERVICE] Failed to deduct stock for lot ${item.lotCode} (${item.lotId}): ${res.statusText}`);
                }
                else {
                    console.log(`[OUTBOUND SERVICE] Successfully deducted ${item.pickedQuantity} from lot ${item.lotCode}`);
                }
            }
        }
        catch (err) {
            console.error('[OUTBOUND SERVICE] Error calling inventory stock deduction:', err.message);
        }
        try {
            const eventPayload = {
                orderId: confirmed.id,
                orderCode: confirmed.orderCode,
                confirmedBy: confirmed.confirmedBy,
                confirmedAt: confirmed.confirmedAt.toISOString(),
                destination: confirmed.destination,
                items: confirmed.items.map(i => ({
                    sku: i.sku,
                    lotId: i.lotId,
                    lotCode: i.lotCode,
                    quantity: i.pickedQuantity,
                    slotId: i.slotId,
                })),
            };
            await this.rmqChannel.publish('outbound.events', 'outbound.confirmed', eventPayload);
            console.log(`[OUTBOUND] Event outbound.confirmed published to RabbitMQ`);
        }
        catch (err) {
            console.error('[OUTBOUND SERVICE] Failed to publish RabbitMQ event:', err.message);
        }
        return confirmed;
    }
    async cancel(orderId) {
        const order = await this.findOne(orderId);
        if (order.status === 'CONFIRMED') {
            throw new common_1.BadRequestException(`Cannot cancel a confirmed order`);
        }
        order.status = 'CANCELLED';
        return this.orderRepository.save(order);
    }
    async getStats() {
        const total = await this.orderRepository.count();
        const pending = await this.orderRepository.countBy({ status: 'PENDING' });
        const picking = await this.orderRepository.countBy({ status: 'PICKING' });
        const packed = await this.orderRepository.countBy({ status: 'PACKED' });
        const confirmed = await this.orderRepository.countBy({ status: 'CONFIRMED' });
        const cancelled = await this.orderRepository.countBy({ status: 'CANCELLED' });
        return { total, pending, picking, packed, confirmed, cancelled };
    }
};
exports.OutboundOrderService = OutboundOrderService;
exports.OutboundOrderService = OutboundOrderService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(outbound_order_entity_1.OutboundOrder)),
    __param(1, (0, typeorm_1.InjectRepository)(outbound_order_item_entity_1.OutboundOrderItem)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], OutboundOrderService);
//# sourceMappingURL=outbound-order.service.js.map