"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OutboundOrderModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const outbound_order_entity_1 = require("./outbound-order.entity");
const outbound_order_item_entity_1 = require("./outbound-order-item.entity");
const outbound_order_service_1 = require("./outbound-order.service");
const outbound_order_controller_1 = require("./outbound-order.controller");
let OutboundOrderModule = class OutboundOrderModule {
};
exports.OutboundOrderModule = OutboundOrderModule;
exports.OutboundOrderModule = OutboundOrderModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([outbound_order_entity_1.OutboundOrder, outbound_order_item_entity_1.OutboundOrderItem])],
        providers: [outbound_order_service_1.OutboundOrderService],
        controllers: [outbound_order_controller_1.OutboundOrderController],
        exports: [outbound_order_service_1.OutboundOrderService],
    })
], OutboundOrderModule);
//# sourceMappingURL=outbound-order.module.js.map