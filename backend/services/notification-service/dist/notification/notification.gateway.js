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
exports.NotificationGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const ioredis_1 = require("ioredis");
let NotificationGateway = class NotificationGateway {
    constructor() {
        this.redisSub = new ioredis_1.default({
            host: process.env.REDIS_HOST || 'localhost',
            port: Number(process.env.REDIS_PORT) || 6379,
        });
    }
    afterInit(server) {
        console.log('WebSocket Gateway Initialized');
        const channels = ['sensor_anomaly', 'spoilage_risk_high', 'low_stock', 'stock_depleted', 'lot_imported'];
        this.redisSub.subscribe(...channels);
        this.redisSub.on('message', (channel, message) => {
            console.log(`[WS GATEWAY] Broadcasting event from channel "${channel}": ${message}`);
            try {
                const parsed = JSON.parse(message);
                this.server.emit(channel, parsed);
                this.server.emit('all_alerts', { channel, data: parsed, timestamp: new Date().toISOString() });
            }
            catch (err) {
                console.error('[WS GATEWAY] Failed to broadcast event:', err);
            }
        });
    }
    handleConnection(client) {
        console.log(`Client connected: ${client.id}`);
        client.emit('connection_status', { connected: true, clientId: client.id });
    }
    handleDisconnect(client) {
        console.log(`Client disconnected: ${client.id}`);
    }
};
exports.NotificationGateway = NotificationGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], NotificationGateway.prototype, "server", void 0);
exports.NotificationGateway = NotificationGateway = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: {
            origin: '*',
        },
    }),
    __metadata("design:paramtypes", [])
], NotificationGateway);
//# sourceMappingURL=notification.gateway.js.map