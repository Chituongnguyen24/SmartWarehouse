import { OutboundOrderService } from './outbound-order.service';
export declare class OutboundOrderController {
    private service;
    constructor(service: OutboundOrderService);
    create(body: any): Promise<import("./outbound-order.entity").OutboundOrder>;
    calculateNearest(body: {
        latitude: number;
        longitude: number;
        items: any[];
    }): Promise<any>;
    findAll(status?: string): Promise<import("./outbound-order.entity").OutboundOrder[]>;
    getStats(): Promise<any>;
    findOne(id: string): Promise<import("./outbound-order.entity").OutboundOrder>;
    applyFefo(id: string, body: {
        suggestions: any[];
    }): Promise<import("./outbound-order.entity").OutboundOrder>;
    confirmPicking(id: string): Promise<import("./outbound-order.entity").OutboundOrder>;
    confirm(id: string, body: {
        confirmedBy: string;
    }): Promise<import("./outbound-order.entity").OutboundOrder>;
    cancel(id: string): Promise<import("./outbound-order.entity").OutboundOrder>;
}
