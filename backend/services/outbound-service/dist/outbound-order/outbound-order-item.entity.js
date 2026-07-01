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
exports.OutboundOrderItem = void 0;
const typeorm_1 = require("typeorm");
const outbound_order_entity_1 = require("./outbound-order.entity");
let OutboundOrderItem = class OutboundOrderItem {
};
exports.OutboundOrderItem = OutboundOrderItem;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], OutboundOrderItem.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'outbound_order_id' }),
    __metadata("design:type", String)
], OutboundOrderItem.prototype, "outboundOrderId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => outbound_order_entity_1.OutboundOrder, (order) => order.items),
    (0, typeorm_1.JoinColumn)({ name: 'outbound_order_id' }),
    __metadata("design:type", outbound_order_entity_1.OutboundOrder)
], OutboundOrderItem.prototype, "outboundOrder", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], OutboundOrderItem.prototype, "sku", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'product_name' }),
    __metadata("design:type", String)
], OutboundOrderItem.prototype, "productName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'requested_quantity', type: 'int' }),
    __metadata("design:type", Number)
], OutboundOrderItem.prototype, "requestedQuantity", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'picked_quantity', type: 'int', default: 0 }),
    __metadata("design:type", Number)
], OutboundOrderItem.prototype, "pickedQuantity", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'lot_id', nullable: true }),
    __metadata("design:type", String)
], OutboundOrderItem.prototype, "lotId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'lot_code', nullable: true }),
    __metadata("design:type", String)
], OutboundOrderItem.prototype, "lotCode", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'slot_id', nullable: true }),
    __metadata("design:type", String)
], OutboundOrderItem.prototype, "slotId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'expiry_date', type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], OutboundOrderItem.prototype, "expiryDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'risk_score', type: 'float', default: 0 }),
    __metadata("design:type", Number)
], OutboundOrderItem.prototype, "riskScore", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'priority_score', type: 'float', default: 0 }),
    __metadata("design:type", Number)
], OutboundOrderItem.prototype, "priorityScore", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', default: 'PENDING' }),
    __metadata("design:type", String)
], OutboundOrderItem.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], OutboundOrderItem.prototype, "createdAt", void 0);
exports.OutboundOrderItem = OutboundOrderItem = __decorate([
    (0, typeorm_1.Entity)('outbound_order_items')
], OutboundOrderItem);
//# sourceMappingURL=outbound-order-item.entity.js.map