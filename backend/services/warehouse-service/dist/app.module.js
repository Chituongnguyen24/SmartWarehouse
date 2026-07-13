"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const config_1 = require("@nestjs/config");
const zone_module_1 = require("./zone/zone.module");
const shelf_module_1 = require("./shelf/shelf.module");
const storage_slot_module_1 = require("./storage-slot/storage-slot.module");
const warehouse_module_1 = require("./warehouse/warehouse.module");
const zone_entity_1 = require("./zone/zone.entity");
const shelf_entity_1 = require("./shelf/shelf.entity");
const storage_slot_entity_1 = require("./storage-slot/storage-slot.entity");
const warehouse_entity_1 = require("./warehouse/warehouse.entity");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true }),
            typeorm_1.TypeOrmModule.forRootAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: (config) => ({
                    type: 'postgres',
                    host: config.get('DB_HOST', 'localhost'),
                    port: config.get('DB_PORT', 5432),
                    username: config.get('DB_USER', 'postgres'),
                    password: config.get('DB_PASSWORD', 'postgres'),
                    database: config.get('DB_NAME', 'sfwms_warehouse'),
                    entities: [zone_entity_1.Zone, shelf_entity_1.Shelf, storage_slot_entity_1.StorageSlot, warehouse_entity_1.Warehouse],
                    synchronize: true,
                }),
            }),
            warehouse_module_1.WarehouseModule,
            zone_module_1.ZoneModule,
            shelf_module_1.ShelfModule,
            storage_slot_module_1.StorageSlotModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map