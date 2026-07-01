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
exports.OutboundOrder = void 0;
const typeorm_1 = require("typeorm");
const outbound_order_item_entity_1 = require("./outbound-order-item.entity");
let OutboundOrder = class OutboundOrder {
};
exports.OutboundOrder = OutboundOrder;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], OutboundOrder.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'order_code', unique: true }),
    __metadata("design:type", String)
], OutboundOrder.prototype, "orderCode", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', default: 'PENDING' }),
    __metadata("design:type", String)
], OutboundOrder.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'requested_by' }),
    __metadata("design:type", String)
], OutboundOrder.prototype, "requestedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'requester_name', nullable: true }),
    __metadata("design:type", String)
], OutboundOrder.prototype, "requesterName", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], OutboundOrder.prototype, "destination", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'total_items', type: 'int', default: 0 }),
    __metadata("design:type", Number)
], OutboundOrder.prototype, "totalItems", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'total_quantity', type: 'int', default: 0 }),
    __metadata("design:type", Number)
], OutboundOrder.prototype, "totalQuantity", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], OutboundOrder.prototype, "notes", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'confirmed_by', nullable: true }),
    __metadata("design:type", String)
], OutboundOrder.prototype, "confirmedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'confirmed_at', type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], OutboundOrder.prototype, "confirmedAt", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => outbound_order_item_entity_1.OutboundOrderItem, (item) => item.outboundOrder),
    __metadata("design:type", Array)
], OutboundOrder.prototype, "items", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], OutboundOrder.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], OutboundOrder.prototype, "updatedAt", void 0);
exports.OutboundOrder = OutboundOrder = __decorate([
    (0, typeorm_1.Entity)('outbound_orders')
], OutboundOrder);
//# sourceMappingURL=outbound-order.entity.js.map