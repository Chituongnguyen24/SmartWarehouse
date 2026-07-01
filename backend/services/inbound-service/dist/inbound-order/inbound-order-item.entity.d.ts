import { InboundOrder } from './inbound-order.entity';
export declare class InboundOrderItem {
    id: string;
    inboundOrderId: string;
    inboundOrder: InboundOrder;
    sku: string;
    productName: string;
    expectedQuantity: number;
    receivedQuantity: number;
    productionDate: Date;
    expiryDate: Date;
    lotCode: string;
    assignedZone: string;
    assignedSlotId: string;
    status: string;
    notes: string;
    createdAt: Date;
}
