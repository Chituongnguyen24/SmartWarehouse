"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageSlotModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const storage_slot_entity_1 = require("./storage-slot.entity");
const storage_slot_service_1 = require("./storage-slot.service");
const storage_slot_controller_1 = require("./storage-slot.controller");
const shelf_module_1 = require("../shelf/shelf.module");
const zone_module_1 = require("../zone/zone.module");
let StorageSlotModule = class StorageSlotModule {
};
exports.StorageSlotModule = StorageSlotModule;
exports.StorageSlotModule = StorageSlotModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([storage_slot_entity_1.StorageSlot]), shelf_module_1.ShelfModule, zone_module_1.ZoneModule],
        providers: [storage_slot_service_1.StorageSlotService],
        controllers: [storage_slot_controller_1.StorageSlotController],
        exports: [storage_slot_service_1.StorageSlotService],
    })
], StorageSlotModule);
//# sourceMappingURL=storage-slot.module.js.map