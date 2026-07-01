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
Object.defineProperty(exports, "__esModule", { value: true });
exports.InboundOrderItem = void 0;
const typeorm_1 = require("typeorm");
const inbound_order_entity_1 = require("./inbound-order.entity");
let InboundOrderItem = class InboundOrderItem {
};
exports.InboundOrderItem = InboundOrderItem;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], InboundOrderItem.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'inbound_order_id' }),
    __metadata("design:type", String)
], InboundOrderItem.prototype, "inboundOrderId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => inbound_order_entity_1.InboundOrder, (order) => order.items),
    (0, typeorm_1.JoinColumn)({ name: 'inbound_order_id' }),
    __metadata("design:type", inbound_order_entity_1.InboundOrder)
], InboundOrderItem.prototype, "inboundOrder", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], InboundOrderItem.prototype, "sku", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'product_name' }),
    __metadata("design:type", String)
], InboundOrderItem.prototype, "productName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'expected_quantity', type: 'int' }),
    __metadata("design:type", Number)
], InboundOrderItem.prototype, "expectedQuantity", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'received_quantity', type: 'int', default: 0 }),
    __metadata("design:type", Number)
], InboundOrderItem.prototype, "receivedQuantity", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'production_date', type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], InboundOrderItem.prototype, "productionDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'expiry_date', type: 'timestamp' }),
    __metadata("design:type", Date)
], InboundOrderItem.prototype, "expiryDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'lot_code', nullable: true }),
    __metadata("design:type", String)
], InboundOrderItem.prototype, "lotCode", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'assigned_zone', nullable: true }),
    __metadata("design:type", String)
], InboundOrderItem.prototype, "assignedZone", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'assigned_slot_id', nullable: true }),
    __metadata("design:type", String)
], InboundOrderItem.prototype, "assignedSlotId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', default: 'PENDING' }),
    __metadata("design:type", String)
], InboundOrderItem.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], InboundOrderItem.prototype, "notes", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], InboundOrderItem.prototype, "createdAt", void 0);
exports.InboundOrderItem = InboundOrderItem = __decorate([
    (0, typeorm_1.Entity)('inbound_order_items')
], InboundOrderItem);
//# sourceMappingURL=inbound-order-item.entity.js.map