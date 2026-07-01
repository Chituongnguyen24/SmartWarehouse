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
exports.Shelf = void 0;
const typeorm_1 = require("typeorm");
const zone_entity_1 = require("../zone/zone.entity");
const storage_slot_entity_1 = require("../storage-slot/storage-slot.entity");
let Shelf = class Shelf {
};
exports.Shelf = Shelf;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Shelf.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", String)
], Shelf.prototype, "code", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Shelf.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'zone_id' }),
    __metadata("design:type", String)
], Shelf.prototype, "zoneId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => zone_entity_1.Zone, (zone) => zone.shelves),
    (0, typeorm_1.JoinColumn)({ name: 'zone_id' }),
    __metadata("design:type", zone_entity_1.Zone)
], Shelf.prototype, "zone", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'max_slots', type: 'int' }),
    __metadata("design:type", Number)
], Shelf.prototype, "maxSlots", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'current_slots_used', type: 'int', default: 0 }),
    __metadata("design:type", Number)
], Shelf.prototype, "currentSlotsUsed", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 1 }),
    __metadata("design:type", Number)
], Shelf.prototype, "floor", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_active', default: true }),
    __metadata("design:type", Boolean)
], Shelf.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => storage_slot_entity_1.StorageSlot, (slot) => slot.shelf),
    __metadata("design:type", Array)
], Shelf.prototype, "slots", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], Shelf.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], Shelf.prototype, "updatedAt", void 0);
exports.Shelf = Shelf = __decorate([
    (0, typeorm_1.Entity)('shelves')
], Shelf);
//# sourceMappingURL=shelf.entity.js.map