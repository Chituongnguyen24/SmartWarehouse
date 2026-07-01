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
exports.AiController = void 0;
const common_1 = require("@nestjs/common");
const ai_service_1 = require("./ai.service");
const swagger_1 = require("@nestjs/swagger");
let AiController = class AiController {
    constructor(aiService) {
        this.aiService = aiService;
    }
    predictSpoilage(body) {
        if (!body.zoneId || body.temperature === undefined || body.humidity === undefined || body.durationMinutes === undefined) {
            throw new common_1.BadRequestException('zoneId, temperature, humidity, and durationMinutes are required');
        }
        return this.aiService.recalculateZoneRisk(body.zoneId, body.temperature, body.humidity, body.durationMinutes);
    }
    getForecast(sku) {
        if (!sku) {
            throw new common_1.BadRequestException('sku is required');
        }
        return this.aiService.getDemandForecast(sku);
    }
};
exports.AiController = AiController;
__decorate([
    (0, common_1.Post)('predict-spoilage'),
    (0, swagger_1.ApiOperation)({ summary: 'Manually trigger spoilage risk recalculation for a zone' }),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            properties: {
                zoneId: { type: 'string', example: 'COLD' },
                temperature: { type: 'number', example: 8.5 },
                humidity: { type: 'number', example: 85 },
                durationMinutes: { type: 'number', example: 20 },
            },
            required: ['zoneId', 'temperature', 'humidity', 'durationMinutes'],
        },
    }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AiController.prototype, "predictSpoilage", null);
__decorate([
    (0, common_1.Get)('forecast/:sku'),
    (0, swagger_1.ApiOperation)({ summary: 'Get AI demand forecasting and restock recommendations for a product' }),
    __param(0, (0, common_1.Param)('sku')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AiController.prototype, "getForecast", null);
exports.AiController = AiController = __decorate([
    (0, swagger_1.ApiTags)('ai'),
    (0, common_1.Controller)('ai'),
    __metadata("design:paramtypes", [ai_service_1.AiService])
], AiController);
//# sourceMappingURL=ai.controller.js.map