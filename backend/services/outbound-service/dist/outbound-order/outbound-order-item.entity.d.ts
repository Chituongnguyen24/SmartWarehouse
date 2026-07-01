import { OutboundOrder } from './outbound-order.entity';
export declare class OutboundOrderItem {
    id: string;
    outboundOrderId: string;
    outboundOrder: OutboundOrder;
    sku: string;
    productName: string;
    requestedQuantity: number;
    pickedQuantity: number;
    lotId: string;
    lotCode: string;
    slotId: string;
    expiryDate: Date;
    riskScore: number;
    priorityScore: number;
    status: string;
    createdAt: Date;
}
