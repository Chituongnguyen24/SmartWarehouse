import { ZoneService } from './zone.service';
export declare class ZoneController {
    private zoneService;
    constructor(zoneService: ZoneService);
    findAll(): Promise<import("./zone.entity").Zone[]>;
    getCapacity(): Promise<any[]>;
    findOne(id: string): Promise<import("./zone.entity").Zone>;
    findByCode(code: string): Promise<import("./zone.entity").Zone>;
    create(body: any): Promise<import("./zone.entity").Zone>;
    update(id: string, body: any): Promise<import("./zone.entity").Zone>;
}
