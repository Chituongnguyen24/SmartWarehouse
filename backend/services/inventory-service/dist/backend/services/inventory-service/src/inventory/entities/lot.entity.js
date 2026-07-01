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
exports.Lot = exports.LotStatus = void 0;
const typeorm_1 = require("typeorm");
var LotStatus;
(function (LotStatus) {
    LotStatus["NORMAL"] = "NORMAL";
    LotStatus["AT_RISK"] = "AT_RISK";
    LotStatus["EXPIRED"] = "EXPIRED";
})(LotStatus || (exports.LotStatus = LotStatus = {}));
let Lot = class Lot {
};
exports.Lot = Lot;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Lot.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'lot_code', unique: true }),
    __metadata("design:type", String)
], Lot.prototype, "lotCode", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'product_id' }),
    __metadata("design:type", String)
], Lot.prototype, "productId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'supplier_id' }),
    __metadata("design:type", String)
], Lot.prototype, "supplierId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'import_date', type: 'timestamp' }),
    __metadata("design:type", Date)
], Lot.prototype, "importDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'expiry_date', type: 'timestamp' }),
    __metadata("design:type", Date)
], Lot.prototype, "expiryDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int' }),
    __metadata("design:type", Number)
], Lot.prototype, "quantity", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'remaining_qty', type: 'int' }),
    __metadata("design:type", Number)
], Lot.prototype, "remainingQty", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Lot.prototype, "zone", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Lot.prototype, "location", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'risk_score', type: 'float', default: 0 }),
    __metadata("design:type", Number)
], Lot.prototype, "riskScore", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'varchar',
        default: LotStatus.NORMAL,
    }),
    __metadata("design:type", String)
], Lot.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'created_by' }),
    __metadata("design:type", String)
], Lot.prototype, "createdBy", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], Lot.prototype, "createdAt", void 0);
exports.Lot = Lot = __decorate([
    (0, typeorm_1.Entity)('lots')
], Lot);
//# sourceMappingURL=lot.entity.js.map