import { InboundOrderItem } from './inbound-order-item.entity';
export declare class InboundOrder {
    id: string;
    orderCode: string;
    supplierId: string;
    supplierName: string;
    status: string;
    expectedDate: Date;
    receivedDate: Date;
    totalItems: number;
    totalQuantity: number;
    qualityCheckPassed: boolean;
    notes: string;
    createdBy: string;
    transportId: string;
    items: InboundOrderItem[];
    createdAt: Date;
    updatedAt: Date;
}
