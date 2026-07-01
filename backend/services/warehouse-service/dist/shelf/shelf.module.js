"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShelfModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const shelf_entity_1 = require("./shelf.entity");
const shelf_service_1 = require("./shelf.service");
const shelf_controller_1 = require("./shelf.controller");
const zone_module_1 = require("../zone/zone.module");
let ShelfModule = class ShelfModule {
};
exports.ShelfModule = ShelfModule;
exports.ShelfModule = ShelfModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([shelf_entity_1.Shelf]), zone_module_1.ZoneModule],
        providers: [shelf_service_1.ShelfService],
        controllers: [shelf_controller_1.ShelfController],
        exports: [shelf_service_1.ShelfService],
    })
], ShelfModule);
//# sourceMappingURL=shelf.module.js.map