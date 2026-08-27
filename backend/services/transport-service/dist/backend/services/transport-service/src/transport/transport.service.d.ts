import { ProductService } from '../product/product.service';
interface Stop {
    id: string;
    name: string;
    lat: number;
    lng: number;
    demand: number;
}
export declare class TransportService {
    private productService;
    constructor(productService: ProductService);
    suggestZonePlacement(sku: string): Promise<any>;
    getInboundSchedule(): any[];
    groupOutboundLots(lots: any[]): any;
    solveVrp(stops: Stop[], truckCapacity?: number): any;
}
export {};
