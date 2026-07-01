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
exports.ReportController = void 0;
const common_1 = require("@nestjs/common");
const report_service_1 = require("./report.service");
const excel_export_service_1 = require("./excel-export.service");
const swagger_1 = require("@nestjs/swagger");
let ReportController = class ReportController {
    constructor(reportService, excelService) {
        this.reportService = reportService;
        this.excelService = excelService;
    }
    getInventorySummary() {
        return this.reportService.getInventorySummaryReport();
    }
    getExpiryAlert(days) {
        return this.reportService.getExpiryReport(days ? parseInt(days) : 7);
    }
    getPerformance() {
        return this.reportService.getWarehousePerformanceReport();
    }
    async exportInventoryExcel(res) {
        const report = await this.reportService.getInventorySummaryReport();
        const buffer = await this.excelService.generateInventoryExcel(report);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=inventory_report_${new Date().toISOString().slice(0, 10)}.xlsx`);
        res.send(buffer);
    }
    async exportExpiryExcel(days, res) {
        const report = await this.reportService.getExpiryReport(days ? parseInt(days) : 7);
        const buffer = await this.excelService.generateExpiryExcel(report);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=expiry_report_${new Date().toISOString().slice(0, 10)}.xlsx`);
        res.send(buffer);
    }
};
exports.ReportController = ReportController;
__decorate([
    (0, common_1.Get)('inventory-summary'),
    (0, swagger_1.ApiOperation)({ summary: 'Báo cáo tổng hợp nhập xuất tồn kho' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ReportController.prototype, "getInventorySummary", null);
__decorate([
    (0, common_1.Get)('expiry-alert'),
    (0, swagger_1.ApiOperation)({ summary: 'Báo cáo hàng sắp hết hạn' }),
    (0, swagger_1.ApiQuery)({ name: 'days', required: false, example: 7 }),
    __param(0, (0, common_1.Query)('days')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ReportController.prototype, "getExpiryAlert", null);
__decorate([
    (0, common_1.Get)('warehouse-performance'),
    (0, swagger_1.ApiOperation)({ summary: 'Báo cáo hiệu suất kho' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ReportController.prototype, "getPerformance", null);
__decorate([
    (0, common_1.Get)('export/inventory-excel'),
    (0, swagger_1.ApiOperation)({ summary: 'Xuất báo cáo tồn kho dạng Excel' }),
    __param(0, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ReportController.prototype, "exportInventoryExcel", null);
__decorate([
    (0, common_1.Get)('export/expiry-excel'),
    (0, swagger_1.ApiOperation)({ summary: 'Xuất báo cáo hàng sắp hết hạn dạng Excel' }),
    (0, swagger_1.ApiQuery)({ name: 'days', required: false, example: 7 }),
    __param(0, (0, common_1.Query)('days')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ReportController.prototype, "exportExpiryExcel", null);
exports.ReportController = ReportController = __decorate([
    (0, swagger_1.ApiTags)('reports'),
    (0, common_1.Controller)('reports'),
    __metadata("design:paramtypes", [report_service_1.ReportService,
        excel_export_service_1.ExcelExportService])
], ReportController);
//# sourceMappingURL=report.controller.js.map