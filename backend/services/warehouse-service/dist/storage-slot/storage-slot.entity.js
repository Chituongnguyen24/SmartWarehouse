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
exports.StorageSlot = void 0;
const typeorm_1 = require("typeorm");
const shelf_entity_1 = require("../shelf/shelf.entity");
let StorageSlot = class StorageSlot {
};
exports.StorageSlot = StorageSlot;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], StorageSlot.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", String)
], StorageSlot.prototype, "code", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'shelf_id' }),
    __metadata("design:type", String)
], StorageSlot.prototype, "shelfId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => shelf_entity_1.Shelf, (shelf) => shelf.slots),
    (0, typeorm_1.JoinColumn)({ name: 'shelf_id' }),
    __metadata("design:type", shelf_entity_1.Shelf)
], StorageSlot.prototype, "shelf", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', default: 'EMPTY' }),
    __metadata("design:type", String)
], StorageSlot.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'lot_id', nullable: true }),
    __metadata("design:type", String)
], StorageSlot.prototype, "lotId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'lot_code', nullable: true }),
    __metadata("design:type", String)
], StorageSlot.prototype, "lotCode", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'product_sku', nullable: true }),
    __metadata("design:type", String)
], StorageSlot.prototype, "productSku", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'max_weight_kg', type: 'float', default: 500 }),
    __metadata("design:type", Number)
], StorageSlot.prototype, "maxWeightKg", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'current_weight_kg', type: 'float', default: 0 }),
    __metadata("design:type", Number)
], StorageSlot.prototype, "currentWeightKg", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 1 }),
    __metadata("design:type", Number)
], StorageSlot.prototype, "row", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 1 }),
    __metadata("design:type", Number)
], StorageSlot.prototype, "position", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_priority', default: false }),
    __metadata("design:type", Boolean)
], StorageSlot.prototype, "isPriority", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], StorageSlot.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], StorageSlot.prototype, "updatedAt", void 0);
exports.StorageSlot = StorageSlot = __decorate([
    (0, typeorm_1.Entity)('storage_slots')
], StorageSlot);
//# sourceMappingURL=storage-slot.entity.js.map