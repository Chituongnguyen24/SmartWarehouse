export declare class QualityCheck {
    id: string;
    inboundOrderId: string;
    itemId: string;
    sku: string;
    productName: string;
    result: string;
    receivedTemp: number;
    tempAcceptable: boolean;
    visualCheckPassed: boolean;
    packagingIntact: boolean;
    expiryValid: boolean;
    notes: string;
    checkedBy: string;
    checkedAt: Date;
}
