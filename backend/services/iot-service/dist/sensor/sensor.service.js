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
exports.SensorService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const sensor_entity_1 = require("./sensor.entity");
const aedes = require("aedes");
const net = require("net");
const mqtt = require("mqtt");
const ioredis_1 = require("ioredis");
let SensorService = class SensorService {
    constructor(readingRepository) {
        this.readingRepository = readingRepository;
        this.lastMetrics = {};
        this.activeViolations = {};
        this.ANOMALY_TIME_LIMIT_MS = process.env.ANOMALY_TIME_LIMIT_MS
            ? parseInt(process.env.ANOMALY_TIME_LIMIT_MS)
            : 1 * 60 * 1000;
        this.SAFETY_ENVELOPE = {
            COLD: { minTemp: 0, maxTemp: 4, maxHumidity: 80 },
            FROZEN: { minTemp: -30, maxTemp: -18, maxHumidity: 65 },
            DRY: { minTemp: 15, maxTemp: 35, maxHumidity: 70 },
        };
        this.redisClient = new ioredis_1.default({
            host: process.env.REDIS_HOST || 'localhost',
            port: Number(process.env.REDIS_PORT) || 6379,
        });
    }
    async onModuleInit() {
        await this.startMqttBroker();
        this.connectMqttClient();
    }
    onModuleDestroy() {
        if (this.mqttClient)
            this.mqttClient.end();
        if (this.tcpServer)
            this.tcpServer.close();
        if (this.mqttBroker)
            this.mqttBroker.close();
    }
    async startMqttBroker() {
        const brokerInstance = aedes.default || aedes;
        this.mqttBroker = new brokerInstance();
        this.tcpServer = net.createServer(this.mqttBroker.handle);
        const mqttPort = 1883;
        return new Promise((resolve) => {
            this.tcpServer.listen(mqttPort, '0.0.0.0', () => {
                console.log(`Self-contained MQTT Broker is running on port ${mqttPort}`);
                resolve();
            });
        });
    }
    connectMqttClient() {
        this.mqttClient = mqtt.connect('mqtt://localhost:1883');
        this.mqttClient.on('connect', () => {
            console.log('IoT Service internal MQTT Client connected to broker');
            this.mqttClient.subscribe('warehouse/+/temperature');
            this.mqttClient.subscribe('warehouse/+/humidity');
        });
        this.mqttClient.on('message', async (topic, message) => {
            await this.handleMqttMessage(topic, message.toString());
        });
    }
    async handleMqttMessage(topic, payload) {
        const parts = topic.split('/');
        if (parts.length < 3)
            return;
        const zoneId = parts[1];
        const metricType = parts[2];
        const value = parseFloat(payload);
        if (isNaN(value))
            return;
        if (!this.lastMetrics[zoneId]) {
            this.lastMetrics[zoneId] = { timestamp: new Date() };
        }
        const currentZoneData = this.lastMetrics[zoneId];
        currentZoneData.timestamp = new Date();
        if (metricType === 'temperature') {
            currentZoneData.temperature = value;
        }
        else if (metricType === 'humidity') {
            currentZoneData.humidity = value;
        }
        if (currentZoneData.temperature !== undefined && currentZoneData.humidity !== undefined) {
            const temp = currentZoneData.temperature;
            const hum = currentZoneData.humidity;
            currentZoneData.temperature = undefined;
            currentZoneData.humidity = undefined;
            const reading = this.readingRepository.create({
                zoneId,
                temperature: temp,
                humidity: hum,
            });
            const savedReading = await this.readingRepository.save(reading);
            await this.checkAnomaly(zoneId, temp, hum);
        }
    }
    async checkAnomaly(zoneId, temp, humidity) {
        const envelope = this.SAFETY_ENVELOPE[zoneId];
        if (!envelope)
            return;
        const isViolating = temp < envelope.minTemp ||
            temp > envelope.maxTemp ||
            humidity > envelope.maxHumidity;
        const now = new Date();
        if (isViolating) {
            if (!this.activeViolations[zoneId]) {
                this.activeViolations[zoneId] = now;
                console.warn(`[VIOLATION DETECTED] Zone: ${zoneId} is outside safe limits! Temp: ${temp}°C, Humidity: ${humidity}%`);
            }
            else {
                const violationStart = this.activeViolations[zoneId];
                const elapsedMs = now.getTime() - violationStart.getTime();
                console.warn(`[VIOLATION ONGOING] Zone: ${zoneId} for ${Math.round(elapsedMs / 1000)}s. Temp: ${temp}°C, Humidity: ${humidity}%`);
                if (elapsedMs >= this.ANOMALY_TIME_LIMIT_MS) {
                    const durationMinutes = Math.round((elapsedMs / (1000 * 60)) * 10) / 10;
                    console.error(`[ANOMALY CRITICAL] Zone: ${zoneId} has violated safe limits for ${durationMinutes} minutes! Emitting SensorAnomaly event.`);
                    const eventPayload = {
                        eventId: Math.random().toString(36).substring(7),
                        zoneId,
                        temperature: temp,
                        humidity,
                        durationMinutes,
                        timestamp: now.toISOString(),
                    };
                    await this.redisClient.publish('sensor_anomaly', JSON.stringify(eventPayload));
                    this.activeViolations[zoneId] = now;
                }
            }
        }
        else {
            if (this.activeViolations[zoneId]) {
                console.log(`[VIOLATION RESOLVED] Zone: ${zoneId} returned to safe limits. Temp: ${temp}°C, Humidity: ${humidity}%`);
                delete this.activeViolations[zoneId];
            }
        }
    }
    async getHistory(zoneId, limit = 50) {
        return this.readingRepository.find({
            where: zoneId ? { zoneId } : {},
            order: { timestamp: 'DESC' },
            take: limit,
        });
    }
    getActiveViolations() {
        const list = [];
        const now = new Date();
        for (const zoneId in this.activeViolations) {
            const start = this.activeViolations[zoneId];
            const elapsedSeconds = Math.round((now.getTime() - start.getTime()) / 1000);
            list.push({
                zoneId,
                violatedAt: start,
                elapsedSeconds,
                thresholdSeconds: this.ANOMALY_TIME_LIMIT_MS / 1000,
            });
        }
        return list;
    }
};
exports.SensorService = SensorService;
exports.SensorService = SensorService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(sensor_entity_1.SensorReading)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], SensorService);
//# sourceMappingURL=sensor.service.js.map