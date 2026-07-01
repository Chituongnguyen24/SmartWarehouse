import { ConfigService } from '@nestjs/config';
export declare class ReportService {
    private config;
    private productServiceUrl;
    private inventoryServiceUrl;
    constructor(config: ConfigService);
    private fetchFromService;
    getInventorySummaryReport(token?: string): Promise<any>;
    getExpiryReport(days?: number, token?: string): Promise<any>;
    getWarehousePerformanceReport(token?: string): Promise<any>;
}
