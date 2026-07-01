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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
let ReportService = class ReportService {
    constructor(config) {
        this.config = config;
        this.productServiceUrl = config.get('PRODUCT_SERVICE_URL', 'http://localhost:3010');
        this.inventoryServiceUrl = config.get('INVENTORY_SERVICE_URL', 'http://localhost:3011');
    }
    async fetchFromService(serviceUrl, path, token) {
        const headers = { 'Content-Type': 'application/json' };
        if (token)
            headers.Authorization = `Bearer ${token}`;
        const res = await fetch(`${serviceUrl}${path}`, { headers });
        if (!res.ok)
            throw new Error(`Failed to fetch ${path} from ${serviceUrl}: ${res.status}`);
        return res.json();
    }
    async getInventorySummaryReport(token) {
        const [products, lots, movements] = await Promise.all([
            this.fetchFromService(this.productServiceUrl, '/products', token),
            this.fetchFromService(this.inventoryServiceUrl, '/inventory/lots', token),
            this.fetchFromService(this.inventoryServiceUrl, '/inventory/movements', token),
        ]);
        const summary = products.map((product) => {
            const productLots = lots.filter((l) => l.productId === product.id);
            const totalStock = productLots.reduce((sum, l) => sum + l.remainingQty, 0);
            const productMovements = movements.filter((m) => productLots.some((l) => l.id === m.lotId));
            const totalIn = productMovements
                .filter((m) => m.movementType === 'IN')
                .reduce((sum, m) => sum + m.quantity, 0);
            const totalOut = productMovements
                .filter((m) => m.movementType === 'OUT')
                .reduce((sum, m) => sum + m.quantity, 0);
            return {
                sku: product.sku,
                productName: product.name,
                category: product.category,
                storageType: product.storageType,
                unit: product.unit,
                totalLots: productLots.length,
                currentStock: totalStock,
                totalImported: totalIn,
                totalExported: totalOut,
                activeLots: productLots.filter((l) => l.remainingQty > 0).length,
            };
        });
        return {
            reportType: 'INVENTORY_SUMMARY',
            generatedAt: new Date().toISOString(),
            totalProducts: products.length,
            totalLots: lots.length,
            data: summary,
        };
    }
    async getExpiryReport(days = 7, token) {
        const expiryAlerts = await this.fetchFromService(this.inventoryServiceUrl, `/inventory/expiry-alert?days=${days}`, token);
        return {
            reportType: 'EXPIRY_ALERT',
            generatedAt: new Date().toISOString(),
            thresholdDays: days,
            totalAlerts: expiryAlerts.length,
            data: expiryAlerts.map((lot) => ({
                lotCode: lot.lotCode,
                productName: lot.productName,
                sku: lot.sku,
                zone: lot.zone,
                location: lot.location,
                remainingQty: lot.remainingQty,
                expiryDate: lot.expiryDate,
                daysUntilExpiry: Math.ceil((new Date(lot.expiryDate).getTime() - Date.now()) / (1000 * 3600 * 24)),
                riskScore: lot.riskScore,
                status: lot.status,
            })),
        };
    }
    async getWarehousePerformanceReport(token) {
        const [lots, movements] = await Promise.all([
            this.fetchFromService(this.inventoryServiceUrl, '/inventory/lots', token),
            this.fetchFromService(this.inventoryServiceUrl, '/inventory/movements', token),
        ]);
        const totalLots = lots.length;
        const activeLots = lots.filter((l) => l.remainingQty > 0).length;
        const expiredLots = lots.filter((l) => new Date(l.expiryDate) < new Date()).length;
        const atRiskLots = lots.filter((l) => l.status === 'AT_RISK').length;
        const totalIn = movements
            .filter((m) => m.movementType === 'IN')
            .reduce((sum, m) => sum + m.quantity, 0);
        const totalOut = movements
            .filter((m) => m.movementType === 'OUT')
            .reduce((sum, m) => sum + m.quantity, 0);
        const spoilageRate = totalLots > 0 ? ((expiredLots + atRiskLots) / totalLots) * 100 : 0;
        return {
            reportType: 'WAREHOUSE_PERFORMANCE',
            generatedAt: new Date().toISOString(),
            metrics: {
                totalLots,
                activeLots,
                expiredLots,
                atRiskLots,
                totalImported: totalIn,
                totalExported: totalOut,
                turnoverRate: totalIn > 0 ? ((totalOut / totalIn) * 100).toFixed(1) + '%' : '0%',
                spoilageRate: spoilageRate.toFixed(1) + '%',
                wasteReduction: (100 - spoilageRate).toFixed(1) + '%',
            },
            zoneBreakdown: {
                COLD: {
                    lots: lots.filter((l) => l.zone === 'COLD').length,
                    stock: lots.filter((l) => l.zone === 'COLD').reduce((s, l) => s + l.remainingQty, 0),
                },
                FROZEN: {
                    lots: lots.filter((l) => l.zone === 'FROZEN').length,
                    stock: lots.filter((l) => l.zone === 'FROZEN').reduce((s, l) => s + l.remainingQty, 0),
                },
                DRY: {
                    lots: lots.filter((l) => l.zone === 'DRY').length,
                    stock: lots.filter((l) => l.zone === 'DRY').reduce((s, l) => s + l.remainingQty, 0),
                },
            },
        };
    }
};
exports.ReportService = ReportService;
exports.ReportService = ReportService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], ReportService);
//# sourceMappingURL=report.service.js.map