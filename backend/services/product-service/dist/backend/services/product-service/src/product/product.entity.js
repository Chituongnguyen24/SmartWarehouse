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
exports.Product = exports.StorageType = void 0;
const typeorm_1 = require("typeorm");
var StorageType;
(function (StorageType) {
    StorageType["COLD"] = "COLD";
    StorageType["FROZEN"] = "FROZEN";
    StorageType["DRY"] = "DRY";
})(StorageType || (exports.StorageType = StorageType = {}));
let Product = class Product {
};
exports.Product = Product;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Product.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", String)
], Product.prototype, "sku", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Product.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Product.prototype, "category", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'varchar',
        name: 'storage_type',
        default: StorageType.DRY,
    }),
    __metadata("design:type", String)
], Product.prototype, "storageType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'float', name: 'min_temp', nullable: true }),
    __metadata("design:type", Number)
], Product.prototype, "minTemp", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'float', name: 'max_temp', nullable: true }),
    __metadata("design:type", Number)
], Product.prototype, "maxTemp", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'float', name: 'max_humidity', nullable: true }),
    __metadata("design:type", Number)
], Product.prototype, "maxHumidity", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Product.prototype, "unit", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], Product.prototype, "createdAt", void 0);
exports.Product = Product = __decorate([
    (0, typeorm_1.Entity)('products')
], Product);
//# sourceMappingURL=product.entity.js.map