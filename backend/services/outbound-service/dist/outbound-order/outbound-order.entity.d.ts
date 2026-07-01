import { OutboundOrderItem } from './outbound-order-item.entity';
export declare class OutboundOrder {
    id: string;
    orderCode: string;
    status: string;
    requestedBy: string;
    requesterName: string;
    destination: string;
    totalItems: number;
    totalQuantity: number;
    notes: string;
    confirmedBy: string;
    confirmedAt: Date;
    items: OutboundOrderItem[];
    createdAt: Date;
    updatedAt: Date;
}
