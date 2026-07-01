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
exports.InboundOrderController = void 0;
const common_1 = require("@nestjs/common");
const inbound_order_service_1 = require("./inbound-order.service");
const swagger_1 = require("@nestjs/swagger");
let InboundOrderController = class InboundOrderController {
    constructor(service) {
        this.service = service;
    }
    create(body) {
        return this.service.create({ ...body, createdBy: body.createdBy || 'system' });
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
    startReceiving(id) {
        return this.service.startReceiving(id);
    }
    updateQuantity(itemId, body) {
        return this.service.updateReceivedQuantity(itemId, body.receivedQuantity);
    }
    startQualityCheck(id) {
        return this.service.startQualityCheck(id);
    }
    startStoring(id, body) {
        return this.service.startStoring(id, body.qualityPassed);
    }
    assignStorage(itemId, body) {
        return this.service.assignStorage(itemId, body);
    }
    complete(id) {
        return this.service.complete(id);
    }
};
exports.InboundOrderController = InboundOrderController;
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Tạo đơn nhập kho mới' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], InboundOrderController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Lấy danh sách đơn nhập kho' }),
    (0, swagger_1.ApiQuery)({ name: 'status', required: false }),
    __param(0, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], InboundOrderController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('stats'),
    (0, swagger_1.ApiOperation)({ summary: 'Thống kê đơn nhập kho' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], InboundOrderController.prototype, "getStats", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Lấy chi tiết đơn nhập kho' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], InboundOrderController.prototype, "findOne", null);
__decorate([
    (0, common_1.Put)(':id/receive'),
    (0, swagger_1.ApiOperation)({ summary: 'Bước 2: Bắt đầu tiếp nhận hàng' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], InboundOrderController.prototype, "startReceiving", null);
__decorate([
    (0, common_1.Put)('items/:itemId/quantity'),
    (0, swagger_1.ApiOperation)({ summary: 'Cập nhật số lượng thực nhận' }),
    __param(0, (0, common_1.Param)('itemId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], InboundOrderController.prototype, "updateQuantity", null);
__decorate([
    (0, common_1.Put)(':id/quality-check'),
    (0, swagger_1.ApiOperation)({ summary: 'Bước 3: Chuyển sang kiểm tra chất lượng' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], InboundOrderController.prototype, "startQualityCheck", null);
__decorate([
    (0, common_1.Put)(':id/store'),
    (0, swagger_1.ApiOperation)({ summary: 'Bước 4: Hoàn tất QC, bắt đầu lưu kho' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], InboundOrderController.prototype, "startStoring", null);
__decorate([
    (0, common_1.Put)('items/:itemId/assign'),
    (0, swagger_1.ApiOperation)({ summary: 'Bước 5: Gán zone/slot/lotCode cho item' }),
    __param(0, (0, common_1.Param)('itemId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], InboundOrderController.prototype, "assignStorage", null);
__decorate([
    (0, common_1.Put)(':id/complete'),
    (0, swagger_1.ApiOperation)({ summary: 'Bước 6: Hoàn tất đơn nhập kho' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], InboundOrderController.prototype, "complete", null);
exports.InboundOrderController = InboundOrderController = __decorate([
    (0, swagger_1.ApiTags)('inbound-orders'),
    (0, common_1.Controller)('inbound-orders'),
    __metadata("design:paramtypes", [inbound_order_service_1.InboundOrderService])
], InboundOrderController);
//# sourceMappingURL=inbound-order.controller.js.map