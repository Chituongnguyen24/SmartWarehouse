import { InboundOrderService } from './inbound-order.service';
export declare class InboundOrderController {
    private service;
    constructor(service: InboundOrderService);
    create(body: any): Promise<import("./inbound-order.entity").InboundOrder>;
    findAll(status?: string): Promise<import("./inbound-order.entity").InboundOrder[]>;
    getStats(): Promise<any>;
    findOne(id: string): Promise<import("./inbound-order.entity").InboundOrder>;
    startReceiving(id: string): Promise<import("./inbound-order.entity").InboundOrder>;
    updateQuantity(itemId: string, body: {
        receivedQuantity: number;
    }): Promise<import("./inbound-order-item.entity").InboundOrderItem>;
    startQualityCheck(id: string): Promise<import("./inbound-order.entity").InboundOrder>;
    startStoring(id: string, body: {
        qualityPassed: boolean;
    }): Promise<import("./inbound-order.entity").InboundOrder>;
    assignStorage(itemId: string, body: any): Promise<import("./inbound-order-item.entity").InboundOrderItem>;
    complete(id: string): Promise<import("./inbound-order.entity").InboundOrder>;
}
