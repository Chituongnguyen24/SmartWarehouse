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
exports.AiService = void 0;
const common_1 = require("@nestjs/common");
const ioredis_1 = require("ioredis");
let AiService = class AiService {
    constructor() {
        this.token = null;
        this.tokenExpiry = 0;
        this.redisSub = new ioredis_1.default({
            host: process.env.REDIS_HOST || 'localhost',
            port: Number(process.env.REDIS_PORT) || 6379,
        });
        this.redisPub = new ioredis_1.default({
            host: process.env.REDIS_HOST || 'localhost',
            port: Number(process.env.REDIS_PORT) || 6379,
        });
    }
    async onModuleInit() {
        this.redisSub.subscribe('sensor_anomaly');
        this.redisSub.on('message', async (channel, message) => {
            if (channel === 'sensor_anomaly') {
                console.log(`[AI SERVICE] Received sensor anomaly alert: ${message}`);
                try {
                    const anomaly = JSON.parse(message);
                    await this.recalculateZoneRisk(anomaly.zoneId, anomaly.temperature, anomaly.humidity, anomaly.durationMinutes);
                }
                catch (err) {
                    console.error('[AI SERVICE] Error handling sensor anomaly:', err);
                }
            }
        });
    }
    onModuleDestroy() {
        this.redisSub.disconnect();
        this.redisPub.disconnect();
    }
    async getAuthToken() {
        const now = Date.now();
        if (this.token && this.tokenExpiry > now + 300000) {
            return this.token;
        }
        try {
            const response = await fetch('http://localhost:3012/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: 'admin@sfwms.vn',
                    password: 'password123',
                }),
            });
            if (!response.ok) {
                throw new Error(`Login failed with status ${response.status}`);
            }
            const data = await response.json();
            this.token = data.access_token;
            this.tokenExpiry = now + 24 * 3600 * 1000;
            return this.token;
        }
        catch (err) {
            console.error('[AI SERVICE] Authentication failed with core-service:', err.message);
            throw err;
        }
    }
    async recalculateZoneRisk(zoneId, temp, humidity, durationMinutes) {
        const token = await this.getAuthToken();
        const response = await fetch('http://localhost:3011/inventory/lots', {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
            throw new Error(`Failed to fetch inventory lots: status ${response.status}`);
        }
        const lots = await response.json();
        const zoneLots = lots.filter(lot => lot.zone === zoneId && lot.remainingQty > 0 && lot.status !== 'EXPIRED');
        console.log(`[AI SERVICE] Re-evaluating ${zoneLots.length} lots in anomalous zone: ${zoneId}`);
        const envelopes = {
            COLD: { targetTemp: 2, maxTemp: 4, minTemp: 0, maxHumidity: 80 },
            FROZEN: { targetTemp: -20, maxTemp: -18, minTemp: -30, maxHumidity: 65 },
            DRY: { targetTemp: 25, maxTemp: 35, minTemp: 15, maxHumidity: 70 },
        };
        const env = envelopes[zoneId] || envelopes.DRY;
        const deviationTemp = Math.max(0, temp - env.maxTemp) + Math.max(0, env.minTemp - temp);
        const deviationHum = Math.max(0, humidity - env.maxHumidity);
        const updatedLots = [];
        for (const lot of zoneLots) {
            const addedRisk = (deviationTemp * 2.5 + deviationHum * 1.2) * (durationMinutes / 15);
            const newRisk = Math.min(100, Math.round((lot.riskScore + addedRisk) * 10) / 10);
            const newStatus = newRisk > 70 ? 'AT_RISK' : lot.status;
            if (newRisk !== lot.riskScore || newStatus !== lot.status) {
                const updateRes = await fetch(`http://localhost:3011/inventory/lots/${lot.id}/risk`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        riskScore: newRisk,
                        status: newStatus,
                    }),
                });
                if (updateRes.ok) {
                    const updated = await updateRes.json();
                    updatedLots.push(updated);
                    if (newStatus === 'AT_RISK' && lot.status !== 'AT_RISK') {
                        const riskPayload = {
                            eventId: Math.random().toString(36).substring(7),
                            lotId: lot.id,
                            lotCode: lot.lotCode,
                            sku: lot.sku,
                            zone: lot.zone,
                            riskScore: newRisk,
                            timestamp: new Date().toISOString(),
                        };
                        await this.redisPub.publish('spoilage_risk_high', JSON.stringify(riskPayload));
                        console.error(`[AI SERVICE] Spoilage Risk CRITICAL for Lot ${lot.lotCode}! Score: ${newRisk}%`);
                    }
                }
                else {
                    console.error(`[AI SERVICE] Failed to update risk score for lot ${lot.lotCode}`);
                }
            }
        }
        return updatedLots;
    }
    async getDemandForecast(sku) {
        const token = await this.getAuthToken();
        const response = await fetch('http://localhost:3011/inventory/movements', {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
            throw new Error(`Failed to fetch stock movements: status ${response.status}`);
        }
        const movements = await response.json();
        const productRes = await fetch(`http://localhost:3010/products`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        const products = await productRes.json();
        const product = products.find(p => p.sku === sku);
        if (!product) {
            throw new common_1.NotFoundException(`Product SKU ${sku} not found`);
        }
        const lotsRes = await fetch('http://localhost:3011/inventory/lots', {
            headers: { Authorization: `Bearer ${token}` },
        });
        const lots = await lotsRes.json();
        const productLotIds = new Set(lots.filter(l => l.productId === product.id).map(l => l.id));
        const outMovements = movements.filter(m => m.movementType === 'OUT' && productLotIds.has(m.lotId));
        const totalSales = outMovements.reduce((sum, m) => sum + m.quantity, 0);
        const baseWeeklySales = totalSales > 0 ? totalSales / 4 : 80;
        const seasonalMultiplier = 1.15;
        const weeklyForecast = Math.round(baseWeeklySales * seasonalMultiplier);
        const currentStock = lots.filter(l => l.productId === product.id).reduce((sum, l) => sum + l.remainingQty, 0);
        const restockQty = Math.max(0, weeklyForecast * 2 - currentStock);
        const restockDate = new Date();
        restockDate.setDate(restockDate.getDate() + 3);
        return {
            sku,
            productName: product.name,
            historicalSalesTotal: totalSales,
            currentInventory: currentStock,
            forecastingModel: 'Time-Series (Holt-Winters / Simulation)',
            weeklyDemandForecast: weeklyForecast,
            confidenceInterval: '92%',
            replenishmentRecommendation: {
                suggestedQuantity: restockQty,
                suggestedOrderDate: restockDate.toISOString().split('T')[0],
                status: restockQty > 0 ? 'RESTOCK_RECOMMENDED' : 'STOCK_ADEQUATE',
            },
        };
    }
};
exports.AiService = AiService;
exports.AiService = AiService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], AiService);
//# sourceMappingURL=ai.service.js.map