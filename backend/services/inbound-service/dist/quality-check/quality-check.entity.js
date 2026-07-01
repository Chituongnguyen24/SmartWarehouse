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
exports.QualityCheck = void 0;
const typeorm_1 = require("typeorm");
let QualityCheck = class QualityCheck {
};
exports.QualityCheck = QualityCheck;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], QualityCheck.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'inbound_order_id' }),
    __metadata("design:type", String)
], QualityCheck.prototype, "inboundOrderId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'item_id', nullable: true }),
    __metadata("design:type", String)
], QualityCheck.prototype, "itemId", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], QualityCheck.prototype, "sku", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'product_name' }),
    __metadata("design:type", String)
], QualityCheck.prototype, "productName", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', default: 'PENDING' }),
    __metadata("design:type", String)
], QualityCheck.prototype, "result", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'received_temp', type: 'float', nullable: true }),
    __metadata("design:type", Number)
], QualityCheck.prototype, "receivedTemp", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'temp_acceptable', default: true }),
    __metadata("design:type", Boolean)
], QualityCheck.prototype, "tempAcceptable", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'visual_check_passed', default: true }),
    __metadata("design:type", Boolean)
], QualityCheck.prototype, "visualCheckPassed", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'packaging_intact', default: true }),
    __metadata("design:type", Boolean)
], QualityCheck.prototype, "packagingIntact", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'expiry_valid', default: true }),
    __metadata("design:type", Boolean)
], QualityCheck.prototype, "expiryValid", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], QualityCheck.prototype, "notes", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'checked_by' }),
    __metadata("design:type", String)
], QualityCheck.prototype, "checkedBy", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'checked_at' }),
    __metadata("design:type", Date)
], QualityCheck.prototype, "checkedAt", void 0);
exports.QualityCheck = QualityCheck = __decorate([
    (0, typeorm_1.Entity)('quality_checks')
], QualityCheck);
//# sourceMappingURL=quality-check.entity.js.map