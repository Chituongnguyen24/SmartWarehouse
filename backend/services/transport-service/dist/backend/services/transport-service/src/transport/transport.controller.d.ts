import { TransportService } from './transport.service';
export declare class TransportController {
    private transportService;
    constructor(transportService: TransportService);
    suggestZone(sku: string): Promise<any>;
    getInboundSchedule(): any[];
    groupLots(body: any[]): any;
    solveVrp(body: {
        stops: any[];
        capacity?: number;
    }): any;
}
