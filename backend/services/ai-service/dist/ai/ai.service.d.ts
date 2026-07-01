import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
export declare class AiService implements OnModuleInit, OnModuleDestroy {
    private redisSub;
    private redisPub;
    private token;
    private tokenExpiry;
    constructor();
    onModuleInit(): Promise<void>;
    onModuleDestroy(): void;
    private getAuthToken;
    recalculateZoneRisk(zoneId: string, temp: number, humidity: number, durationMinutes: number): Promise<any[]>;
    getDemandForecast(sku: string): Promise<any>;
}
