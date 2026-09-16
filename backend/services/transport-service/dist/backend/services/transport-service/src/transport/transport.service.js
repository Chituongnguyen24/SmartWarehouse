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
exports.TransportService = void 0;
const common_1 = require("@nestjs/common");
const product_service_1 = require("../product/product.service");
let TransportService = class TransportService {
    constructor(productService) {
        this.productService = productService;
    }
    async suggestZonePlacement(sku) {
        const product = await this.productService.findOneBySku(sku);
        if (!product) {
            throw new common_1.NotFoundException(`Product with SKU ${sku} not found`);
        }
        let zone = 'DRY';
        let suggestedLocation = 'dry-row-1';
        let instructions = 'Store at room temperature in a dry, ventilated area.';
        if (product.storageType === 'COLD') {
            zone = 'COLD';
            suggestedLocation = `cold-shelf-${Math.floor(Math.random() * 5) + 1}`;
            instructions = `Maintain temperature between ${product.minTemp || 0}°C and ${product.maxTemp || 4}°C. Keep humidity under ${product.maxHumidity || 80}%.`;
        }
        else if (product.storageType === 'FROZEN') {
            zone = 'FROZEN';
            suggestedLocation = `frozen-bin-${Math.floor(Math.random() * 5) + 1}`;
            instructions = `Keep frozen below ${product.maxTemp || -18}°C. Ensure no moisture exposure.`;
        }
        return {
            sku,
            productName: product.name,
            recommendedZone: zone,
            suggestedLocation,
            environmentalRequirements: {
                minTemp: product.minTemp,
                maxTemp: product.maxTemp,
                maxHumidity: product.maxHumidity,
            },
            instructions,
        };
    }
    getInboundSchedule() {
        const bookings = [
            { id: '1', supplier: 'Dalat Organic Farms', time: '08:00', durationMin: 60, status: 'Scheduled', dock: 1 },
            { id: '2', supplier: 'Vissan Meat JSC', time: '08:30', durationMin: 90, status: 'Scheduled', dock: 1 },
            { id: '3', supplier: 'Masan Consumer', time: '10:00', durationMin: 45, status: 'Scheduled', dock: 2 },
            { id: '4', supplier: 'CP Poultry Vietnam', time: '10:30', durationMin: 60, status: 'Scheduled', dock: 2 },
        ];
        const resolved = [];
        const dockAvailability = { 1: 8 * 60, 2: 8 * 60 };
        for (const b of bookings) {
            const [hours, minutes] = b.time.split(':').map(Number);
            let requestedStart = hours * 60 + minutes;
            if (requestedStart < dockAvailability[b.dock]) {
                requestedStart = dockAvailability[b.dock];
            }
            const end = requestedStart + b.durationMin;
            dockAvailability[b.dock] = end;
            const formatTime = (min) => {
                const h = Math.floor(min / 60).toString().padStart(2, '0');
                const m = (min % 60).toString().padStart(2, '0');
                return `${h}:${m}`;
            };
            resolved.push({
                ...b,
                originalTime: b.time,
                optimizedTime: formatTime(requestedStart),
                endTime: formatTime(end),
                conflictResolved: requestedStart !== hours * 60 + minutes,
            });
        }
        return resolved;
    }
    groupOutboundLots(lots) {
        const grouped = {
            DairySection: [],
            MeatSection: [],
            ProduceSection: [],
            DryGoodsSection: [],
            Unknown: [],
        };
        for (const lot of lots) {
            const category = lot.category?.toLowerCase() || '';
            if (category.includes('dairy') || category.includes('milk')) {
                grouped.DairySection.push(lot);
            }
            else if (category.includes('meat') || category.includes('sea') || category.includes('poultry')) {
                grouped.MeatSection.push(lot);
            }
            else if (category.includes('produce') || category.includes('veg') || category.includes('fruit')) {
                grouped.ProduceSection.push(lot);
            }
            else if (category.includes('dry') || category.includes('noodle') || category.includes('canned')) {
                grouped.DryGoodsSection.push(lot);
            }
            else {
                grouped.Unknown.push(lot);
            }
        }
        return grouped;
    }
    solveVrp(stops, truckCapacity = 200) {
        const depot = { id: 'depot', name: 'SFWMS Depot (HCMC Central)', lat: 10.8286, lng: 106.6802, demand: 0 };
        const getDistance = (p1, p2) => {
            const dx = p1.lat - p2.lat;
            const dy = p1.lng - p2.lng;
            return Math.sqrt(dx * dx + dy * dy) * 111.32;
        };
        let unvisited = [...stops];
        const routes = [];
        let currentRouteIndex = 1;
        while (unvisited.length > 0) {
            const route = {
                routeId: `Route-${currentRouteIndex++}`,
                stops: [depot],
                totalDistance: 0,
                totalDemand: 0,
            };
            let currentPoint = depot;
            let capacityRemaining = truckCapacity;
            while (unvisited.length > 0) {
                let nearestStopIndex = -1;
                let minDistance = Infinity;
                for (let i = 0; i < unvisited.length; i++) {
                    const stop = unvisited[i];
                    if (stop.demand <= capacityRemaining) {
                        const dist = getDistance(currentPoint, stop);
                        if (dist < minDistance) {
                            minDistance = dist;
                            nearestStopIndex = i;
                        }
                    }
                }
                if (nearestStopIndex === -1) {
                    break;
                }
                const nextStop = unvisited[nearestStopIndex];
                route.stops.push(nextStop);
                route.totalDistance += minDistance;
                route.totalDemand += nextStop.demand;
                capacityRemaining -= nextStop.demand;
                currentPoint = nextStop;
                unvisited.splice(nearestStopIndex, 1);
            }
            route.totalDistance += getDistance(currentPoint, depot);
            route.stops.push(depot);
            routes.push(route);
        }
        return {
            depot,
            totalRoutes: routes.length,
            truckCapacity,
            routes,
            totalDistance: Math.round(routes.reduce((sum, r) => sum + r.totalDistance, 0) * 100) / 100,
        };
    }
};
exports.TransportService = TransportService;
exports.TransportService = TransportService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [product_service_1.ProductService])
], TransportService);
//# sourceMappingURL=transport.service.js.map