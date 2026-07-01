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
exports.TransportController = void 0;
const common_1 = require("@nestjs/common");
const transport_service_1 = require("./transport.service");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const roles_guard_1 = require("../auth/roles.guard");
const roles_decorator_1 = require("../auth/roles.decorator");
const enums_1 = require("../../../../../shared/constants/enums");
const swagger_1 = require("@nestjs/swagger");
let TransportController = class TransportController {
    constructor(transportService) {
        this.transportService = transportService;
    }
    suggestZone(sku) {
        if (!sku) {
            throw new common_1.BadRequestException('sku is required');
        }
        return this.transportService.suggestZonePlacement(sku);
    }
    getInboundSchedule() {
        return this.transportService.getInboundSchedule();
    }
    groupLots(body) {
        return this.transportService.groupOutboundLots(body);
    }
    solveVrp(body) {
        if (!body.stops || !Array.isArray(body.stops)) {
            throw new common_1.BadRequestException('stops array is required');
        }
        return this.transportService.solveVrp(body.stops, body.capacity || 200);
    }
};
exports.TransportController = TransportController;
__decorate([
    (0, common_1.Get)('zone-suggest'),
    (0, swagger_1.ApiOperation)({ summary: 'Suggest warehouse placement zone and shelf location' }),
    (0, swagger_1.ApiQuery)({ name: 'sku', type: String, example: 'MILK-DALAT-1L' }),
    __param(0, (0, common_1.Query)('sku')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], TransportController.prototype, "suggestZone", null);
__decorate([
    (0, common_1.Get)('inbound-schedule'),
    (0, swagger_1.ApiOperation)({ summary: 'Get optimized dock schedule resolving time overlaps' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], TransportController.prototype, "getInboundSchedule", null);
__decorate([
    (0, common_1.Post)('outbound-group'),
    (0, roles_decorator_1.Roles)(enums_1.UserRole.WAREHOUSE_STAFF, enums_1.UserRole.WAREHOUSE_MANAGER, enums_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Group lots by supermarket floor section' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Array]),
    __metadata("design:returntype", void 0)
], TransportController.prototype, "groupLots", null);
__decorate([
    (0, common_1.Post)('vrp-solve'),
    (0, roles_decorator_1.Roles)(enums_1.UserRole.WAREHOUSE_MANAGER, enums_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Solve Vehicle Routing Problem (VRP) for customer multi-stop deliveries' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], TransportController.prototype, "solveVrp", null);
exports.TransportController = TransportController = __decorate([
    (0, swagger_1.ApiTags)('transport'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, common_1.Controller)('transport'),
    __metadata("design:paramtypes", [transport_service_1.TransportService])
], TransportController);
//# sourceMappingURL=transport.controller.js.map