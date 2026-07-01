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
exports.InboundOrder = void 0;
const typeorm_1 = require("typeorm");
const inbound_order_item_entity_1 = require("./inbound-order-item.entity");
let InboundOrder = class InboundOrder {
};
exports.InboundOrder = InboundOrder;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], InboundOrder.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'order_code', unique: true }),
    __metadata("design:type", String)
], InboundOrder.prototype, "orderCode", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'supplier_id' }),
    __metadata("design:type", String)
], InboundOrder.prototype, "supplierId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'supplier_name' }),
    __metadata("design:type", String)
], InboundOrder.prototype, "supplierName", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', default: 'PENDING' }),
    __metadata("design:type", String)
], InboundOrder.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'expected_date', type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], InboundOrder.prototype, "expectedDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'received_date', type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], InboundOrder.prototype, "receivedDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'total_items', type: 'int', default: 0 }),
    __metadata("design:type", Number)
], InboundOrder.prototype, "totalItems", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'total_quantity', type: 'int', default: 0 }),
    __metadata("design:type", Number)
], InboundOrder.prototype, "totalQuantity", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'quality_check_passed', default: false }),
    __metadata("design:type", Boolean)
], InboundOrder.prototype, "qualityCheckPassed", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], InboundOrder.prototype, "notes", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'created_by' }),
    __metadata("design:type", String)
], InboundOrder.prototype, "createdBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'transport_id', nullable: true }),
    __metadata("design:type", String)
], InboundOrder.prototype, "transportId", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => inbound_order_item_entity_1.InboundOrderItem, (item) => item.inboundOrder),
    __metadata("design:type", Array)
], InboundOrder.prototype, "items", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], InboundOrder.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], InboundOrder.prototype, "updatedAt", void 0);
exports.InboundOrder = InboundOrder = __decorate([
    (0, typeorm_1.Entity)('inbound_orders')
], InboundOrder);
//# sourceMappingURL=inbound-order.entity.js.map