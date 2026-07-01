export declare enum MovementType {
    IN = "IN",
    OUT = "OUT"
}
export declare class StockMovement {
    id: string;
    lotId: string;
    movementType: MovementType;
    quantity: number;
    reason: string;
    performedBy: string;
    createdAt: Date;
}
