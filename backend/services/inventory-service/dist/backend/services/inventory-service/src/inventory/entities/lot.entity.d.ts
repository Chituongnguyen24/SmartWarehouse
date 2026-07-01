export declare enum LotStatus {
    NORMAL = "NORMAL",
    AT_RISK = "AT_RISK",
    EXPIRED = "EXPIRED"
}
export declare class Lot {
    id: string;
    lotCode: string;
    productId: string;
    supplierId: string;
    importDate: Date;
    expiryDate: Date;
    quantity: number;
    remainingQty: number;
    zone: string;
    location: string;
    riskScore: number;
    status: LotStatus;
    createdBy: string;
    createdAt: Date;
}
