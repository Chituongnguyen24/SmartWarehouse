import { SensorService } from './sensor.service';
export declare class SensorController {
    private sensorService;
    constructor(sensorService: SensorService);
    getHistory(zoneId?: string, limit?: string): Promise<import("./sensor.entity").SensorReading[]>;
    getActiveViolations(): any[];
}
