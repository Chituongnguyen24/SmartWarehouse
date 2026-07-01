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
exports.StorageSlotController = void 0;
const common_1 = require("@nestjs/common");
const storage_slot_service_1 = require("./storage-slot.service");
const swagger_1 = require("@nestjs/swagger");
let StorageSlotController = class StorageSlotController {
    constructor(slotService) {
        this.slotService = slotService;
    }
    findAll(zone) {
        return this.slotService.findAll(zone);
    }
    findEmpty(zone) {
        return this.slotService.findEmpty(zone);
    }
    suggestSlot(zone, priority) {
        return this.slotService.suggestSlot(zone, priority === 'true');
    }
    getSlotMap(zoneCode) {
        return this.slotService.getSlotMap(zoneCode);
    }
    findOne(id) {
        return this.slotService.findOne(id);
    }
    assignLot(id, body) {
        return this.slotService.assignLot(id, body);
    }
    releaseLot(id) {
        return this.slotService.releaseLot(id);
    }
    setMaintenance(id) {
        return this.slotService.setMaintenance(id);
    }
};
exports.StorageSlotController = StorageSlotController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Lấy danh sách tất cả ô chứa hàng' }),
    (0, swagger_1.ApiQuery)({ name: 'zone', required: false, example: 'COLD' }),
    __param(0, (0, common_1.Query)('zone')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], StorageSlotController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('empty'),
    (0, swagger_1.ApiOperation)({ summary: 'Lấy danh sách ô chứa trống' }),
    (0, swagger_1.ApiQuery)({ name: 'zone', required: false, example: 'COLD' }),
    __param(0, (0, common_1.Query)('zone')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], StorageSlotController.prototype, "findEmpty", null);
__decorate([
    (0, common_1.Get)('suggest'),
    (0, swagger_1.ApiOperation)({ summary: 'Gợi ý ô chứa phù hợp cho sản phẩm' }),
    (0, swagger_1.ApiQuery)({ name: 'zone', required: true, example: 'COLD' }),
    (0, swagger_1.ApiQuery)({ name: 'priority', required: false, example: 'true' }),
    __param(0, (0, common_1.Query)('zone')),
    __param(1, (0, common_1.Query)('priority')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], StorageSlotController.prototype, "suggestSlot", null);
__decorate([
    (0, common_1.Get)('map/:zoneCode'),
    (0, swagger_1.ApiOperation)({ summary: 'Xem sơ đồ vị trí kho theo zone' }),
    __param(0, (0, common_1.Param)('zoneCode')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], StorageSlotController.prototype, "getSlotMap", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Lấy thông tin ô chứa theo ID' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], StorageSlotController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(':id/assign'),
    (0, swagger_1.ApiOperation)({ summary: 'Gán lô hàng vào ô chứa' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], StorageSlotController.prototype, "assignLot", null);
__decorate([
    (0, common_1.Post)(':id/release'),
    (0, swagger_1.ApiOperation)({ summary: 'Giải phóng ô chứa (xuất hết lô hàng)' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], StorageSlotController.prototype, "releaseLot", null);
__decorate([
    (0, common_1.Put)(':id/maintenance'),
    (0, swagger_1.ApiOperation)({ summary: 'Đặt ô chứa vào trạng thái bảo trì' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], StorageSlotController.prototype, "setMaintenance", null);
exports.StorageSlotController = StorageSlotController = __decorate([
    (0, swagger_1.ApiTags)('storage-slots'),
    (0, common_1.Controller)('storage-slots'),
    __metadata("design:paramtypes", [storage_slot_service_1.StorageSlotService])
], StorageSlotController);
//# sourceMappingURL=storage-slot.controller.js.map