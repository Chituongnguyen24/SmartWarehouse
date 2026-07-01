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
exports.ShelfController = void 0;
const common_1 = require("@nestjs/common");
const shelf_service_1 = require("./shelf.service");
const swagger_1 = require("@nestjs/swagger");
let ShelfController = class ShelfController {
    constructor(shelfService) {
        this.shelfService = shelfService;
    }
    findAll() {
        return this.shelfService.findAll();
    }
    findByZone(zoneId) {
        return this.shelfService.findByZone(zoneId);
    }
    findOne(id) {
        return this.shelfService.findOne(id);
    }
    create(body) {
        return this.shelfService.create(body);
    }
    update(id, body) {
        return this.shelfService.update(id, body);
    }
};
exports.ShelfController = ShelfController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Lấy danh sách tất cả kệ hàng' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ShelfController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('zone/:zoneId'),
    (0, swagger_1.ApiOperation)({ summary: 'Lấy danh sách kệ hàng theo zone' }),
    __param(0, (0, common_1.Param)('zoneId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ShelfController.prototype, "findByZone", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Lấy thông tin kệ hàng theo ID' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ShelfController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Tạo kệ hàng mới' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ShelfController.prototype, "create", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Cập nhật thông tin kệ hàng' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], ShelfController.prototype, "update", null);
exports.ShelfController = ShelfController = __decorate([
    (0, swagger_1.ApiTags)('shelves'),
    (0, common_1.Controller)('shelves'),
    __metadata("design:paramtypes", [shelf_service_1.ShelfService])
], ShelfController);
//# sourceMappingURL=shelf.controller.js.map