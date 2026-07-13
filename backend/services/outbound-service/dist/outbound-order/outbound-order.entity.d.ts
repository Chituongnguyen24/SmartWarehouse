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
    warehouseId: string;
    warehouseCode: string;
    latitude: number;
    longitude: number;
    notes: string;
    confirmedBy: string;
    confirmedAt: Date;
    items: OutboundOrderItem[];
    createdAt: Date;
    updatedAt: Date;
}
