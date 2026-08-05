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
exports.InventoryController = void 0;
const common_1 = require("@nestjs/common");
const inventory_service_1 = require("./inventory.service");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const roles_guard_1 = require("../auth/roles.guard");
const roles_decorator_1 = require("../auth/roles.decorator");
const enums_1 = require("../../../../../shared/constants/enums");
const swagger_1 = require("@nestjs/swagger");
let InventoryController = class InventoryController {
    constructor(inventoryService) {
        this.inventoryService = inventoryService;
    }
    getSuppliers() {
        return this.inventoryService.findAllSuppliers();
    }
    createSupplier(body) {
        return this.inventoryService.createSupplier(body);
    }
    getLots() {
        return this.inventoryService.findAllLots();
    }
    importLot(body, req) {
        return this.inventoryService.importLot({
            ...body,
            createdBy: req.user.id,
        });
    }
    exportStock(body, req) {
        return this.inventoryService.exportStock({
            ...body,
            performedBy: req.user.id,
        });
    }
    getFefoSuggestions(sku, quantity, warehouseId) {
        if (!sku || !quantity) {
            throw new common_1.BadRequestException('sku and quantity parameters are required');
        }
        return this.inventoryService.getSmartFefoSuggestions(sku, parseInt(quantity), warehouseId);
    }
    getWarehouseStock(skus) {
        if (!skus) {
            throw new common_1.BadRequestException('skus parameter is required (comma-separated)');
        }
        const skuList = skus.split(',').map(s => s.trim());
        return this.inventoryService.getWarehouseStock(skuList);
    }
    getMovements() {
        return this.inventoryService.getMovementsReport();
    }
    getExpiryAlert(days) {
        const filterDays = days ? parseInt(days) : 7;
        return this.inventoryService.getExpiryAlertReport(filterDays);
    }
    updateLotRisk(id, body) {
        return this.inventoryService.updateLotRisk(id, body.riskScore, body.status);
    }
};
exports.InventoryController = InventoryController;
__decorate([
    (0, common_1.Get)('suppliers'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all suppliers' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "getSuppliers", null);
__decorate([
    (0, common_1.Post)('suppliers'),
    (0, roles_decorator_1.Roles)(enums_1.UserRole.WAREHOUSE_MANAGER, enums_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Register a new supplier' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "createSupplier", null);
__decorate([
    (0, common_1.Get)('lots'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all active warehouse lots' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "getLots", null);
__decorate([
    (0, common_1.Post)('lots/import'),
    (0, roles_decorator_1.Roles)(enums_1.UserRole.WAREHOUSE_STAFF, enums_1.UserRole.WAREHOUSE_MANAGER, enums_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Import a new food lot' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "importLot", null);
__decorate([
    (0, common_1.Post)('lots/export'),
    (0, roles_decorator_1.Roles)(enums_1.UserRole.WAREHOUSE_STAFF, enums_1.UserRole.WAREHOUSE_MANAGER, enums_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Export/consume stock from a lot' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "exportStock", null);
__decorate([
    (0, common_1.Get)('fefo'),
    (0, swagger_1.ApiOperation)({ summary: 'Get smart FEFO extraction suggestions for a product' }),
    (0, swagger_1.ApiQuery)({ name: 'sku', type: String, example: 'MILK-DALAT-1L' }),
    (0, swagger_1.ApiQuery)({ name: 'quantity', type: Number, example: 50 }),
    (0, swagger_1.ApiQuery)({ name: 'warehouseId', type: String, required: false, example: 'WH-001' }),
    __param(0, (0, common_1.Query)('sku')),
    __param(1, (0, common_1.Query)('quantity')),
    __param(2, (0, common_1.Query)('warehouseId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "getFefoSuggestions", null);
__decorate([
    (0, common_1.Get)('warehouse-stock'),
    (0, swagger_1.ApiOperation)({ summary: 'Get available stock of products grouped by warehouse' }),
    (0, swagger_1.ApiQuery)({ name: 'skus', type: String, example: 'MILK-DALAT-1L,NOODLE-HAOHAO' }),
    __param(0, (0, common_1.Query)('skus')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "getWarehouseStock", null);
__decorate([
    (0, common_1.Get)('movements'),
    (0, swagger_1.ApiOperation)({ summary: 'Get audit logs of all stock movements' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "getMovements", null);
__decorate([
    (0, common_1.Get)('expiry-alert'),
    (0, swagger_1.ApiOperation)({ summary: 'Get expiry alert report' }),
    (0, swagger_1.ApiQuery)({ name: 'days', type: Number, required: false, example: 7 }),
    __param(0, (0, common_1.Query)('days')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "getExpiryAlert", null);
__decorate([
    (0, common_1.Put)('lots/:id/risk'),
    (0, roles_decorator_1.Roles)(enums_1.UserRole.WAREHOUSE_MANAGER, enums_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Update a lot\'s risk score and status (called by AI service)' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "updateLotRisk", null);
exports.InventoryController = InventoryController = __decorate([
    (0, swagger_1.ApiTags)('inventory'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, common_1.Controller)('inventory'),
    __metadata("design:paramtypes", [inventory_service_1.InventoryService])
], InventoryController);
//# sourceMappingURL=inventory.controller.js.map