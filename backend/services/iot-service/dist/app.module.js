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
const sensor_entity_1 = require("./sensor/sensor.entity");
const sensor_service_1 = require("./sensor/sensor.service");
const sensor_controller_1 = require("./sensor/sensor.controller");
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
                    type: 'sqlite',
                    database: 'sfwms_iot.db',
                    entities: [sensor_entity_1.SensorReading],
                    synchronize: true,
                }),
            }),
            typeorm_1.TypeOrmModule.forFeature([sensor_entity_1.SensorReading]),
        ],
        providers: [sensor_service_1.SensorService],
        controllers: [sensor_controller_1.SensorController],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map