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
exports.Zone = void 0;
const typeorm_1 = require("typeorm");
const shelf_entity_1 = require("../shelf/shelf.entity");
const warehouse_entity_1 = require("../warehouse/warehouse.entity");
let Zone = class Zone {
};
exports.Zone = Zone;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Zone.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'warehouse_id', nullable: true }),
    __metadata("design:type", String)
], Zone.prototype, "warehouseId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => warehouse_entity_1.Warehouse, (warehouse) => warehouse.zones, { onDelete: 'SET NULL', nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'warehouse_id' }),
    __metadata("design:type", warehouse_entity_1.Warehouse)
], Zone.prototype, "warehouse", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", String)
], Zone.prototype, "code", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Zone.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", String)
], Zone.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], Zone.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'min_temp', type: 'float' }),
    __metadata("design:type", Number)
], Zone.prototype, "minTemp", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'max_temp', type: 'float' }),
    __metadata("design:type", Number)
], Zone.prototype, "maxTemp", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'min_humidity', type: 'float', default: 30 }),
    __metadata("design:type", Number)
], Zone.prototype, "minHumidity", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'max_humidity', type: 'float' }),
    __metadata("design:type", Number)
], Zone.prototype, "maxHumidity", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'max_capacity', type: 'int' }),
    __metadata("design:type", Number)
], Zone.prototype, "maxCapacity", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'current_occupancy', type: 'int', default: 0 }),
    __metadata("design:type", Number)
], Zone.prototype, "currentOccupancy", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_active', default: true }),
    __metadata("design:type", Boolean)
], Zone.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => shelf_entity_1.Shelf, (shelf) => shelf.zone),
    __metadata("design:type", Array)
], Zone.prototype, "shelves", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], Zone.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], Zone.prototype, "updatedAt", void 0);
exports.Zone = Zone = __decorate([
    (0, typeorm_1.Entity)('zones')
], Zone);
//# sourceMappingURL=zone.entity.js.map