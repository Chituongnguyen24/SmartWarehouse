"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InboundOrderModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const inbound_order_entity_1 = require("./inbound-order.entity");
const inbound_order_item_entity_1 = require("./inbound-order-item.entity");
const inbound_order_service_1 = require("./inbound-order.service");
const inbound_order_controller_1 = require("./inbound-order.controller");
let InboundOrderModule = class InboundOrderModule {
};
exports.InboundOrderModule = InboundOrderModule;
exports.InboundOrderModule = InboundOrderModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([inbound_order_entity_1.InboundOrder, inbound_order_item_entity_1.InboundOrderItem])],
        providers: [inbound_order_service_1.InboundOrderService],
        controllers: [inbound_order_controller_1.InboundOrderController],
        exports: [inbound_order_service_1.InboundOrderService],
    })
], InboundOrderModule);
//# sourceMappingURL=inbound-order.module.js.map