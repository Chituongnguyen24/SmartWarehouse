import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Repository } from 'typeorm';
import { SensorReading } from './sensor.entity';
export declare class SensorService implements OnModuleInit, OnModuleDestroy {
    private readingRepository;
    private mqttBroker;
    private tcpServer;
    private mqttClient;
    private redisClient;
    private lastMetrics;
    private activeViolations;
    private readonly ANOMALY_TIME_LIMIT_MS;
    private readonly SAFETY_ENVELOPE;
    constructor(readingRepository: Repository<SensorReading>);
    onModuleInit(): Promise<void>;
    onModuleDestroy(): void;
    private startMqttBroker;
    private connectMqttClient;
    private handleMqttMessage;
    private checkAnomaly;
    getHistory(zoneId?: string, limit?: number): Promise<SensorReading[]>;
    getActiveViolations(): any[];
}
