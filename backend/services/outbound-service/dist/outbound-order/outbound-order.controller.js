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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OutboundOrderController = void 0;
const common_1 = require("@nestjs/common");
const outbound_order_service_1 = require("./outbound-order.service");
const swagger_1 = require("@nestjs/swagger");
let OutboundOrderController = class OutboundOrderController {
    constructor(service) {
        this.service = service;
    }
    create(body) {
        return this.service.create(body);
    }
    findAll(status) {
        return this.service.findAll(status);
    }
    getStats() {
        return this.service.getStats();
    }
    findOne(id) {
        return this.service.findOne(id);
    }
    applyFefo(id, body) {
        return this.service.applyFefoSuggestions(id, body.suggestions);
    }
    confirmPicking(id) {
        return this.service.confirmPicking(id);
    }
    confirm(id, body) {
        return this.service.confirm(id, body.confirmedBy);
    }
    cancel(id) {
        return this.service.cancel(id);
    }
};
exports.OutboundOrderController = OutboundOrderController;
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Bước 1: Tạo yêu cầu xuất kho' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], OutboundOrderController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Lấy danh sách đơn xuất kho' }),
    (0, swagger_1.ApiQuery)({ name: 'status', required: false }),
    __param(0, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], OutboundOrderController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('stats'),
    (0, swagger_1.ApiOperation)({ summary: 'Thống kê đơn xuất kho' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], OutboundOrderController.prototype, "getStats", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Lấy chi tiết đơn xuất kho' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], OutboundOrderController.prototype, "findOne", null);
__decorate([
    (0, common_1.Put)(':id/fefo-suggestions'),
    (0, swagger_1.ApiOperation)({ summary: 'Bước 2-3: Áp dụng gợi ý FEFO cho đơn xuất' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], OutboundOrderController.prototype, "applyFefo", null);
__decorate([
    (0, common_1.Put)(':id/confirm-picking'),
    (0, swagger_1.ApiOperation)({ summary: 'Bước 4: Xác nhận đã lấy hàng' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], OutboundOrderController.prototype, "confirmPicking", null);
__decorate([
    (0, common_1.Put)(':id/confirm'),
    (0, swagger_1.ApiOperation)({ summary: 'Bước 5: Xác nhận xuất kho' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], OutboundOrderController.prototype, "confirm", null);
__decorate([
    (0, common_1.Put)(':id/cancel'),
    (0, swagger_1.ApiOperation)({ summary: 'Hủy đơn xuất kho' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], OutboundOrderController.prototype, "cancel", null);
exports.OutboundOrderController = OutboundOrderController = __decorate([
    (0, swagger_1.ApiTags)('outbound-orders'),
    (0, common_1.Controller)('outbound-orders'),
    __metadata("design:paramtypes", [outbound_order_service_1.OutboundOrderService])
], OutboundOrderController);
//# sourceMappingURL=outbound-order.controller.js.map