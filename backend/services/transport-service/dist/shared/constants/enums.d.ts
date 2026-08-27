export declare enum ZoneType {
    COLD = "COLD",
    FROZEN = "FROZEN",
    DRY = "DRY"
}
export declare enum SlotStatus {
    EMPTY = "EMPTY",
    OCCUPIED = "OCCUPIED",
    FULL = "FULL",
    MAINTENANCE = "MAINTENANCE"
}
export declare enum LotStatus {
    NORMAL = "NORMAL",
    AT_RISK = "AT_RISK",
    EXPIRED = "EXPIRED",
    QUARANTINE = "QUARANTINE",
    DISCARDED = "DISCARDED"
}
export declare enum MovementType {
    IN = "IN",
    OUT = "OUT",
    ADJUSTMENT = "ADJUSTMENT",
    TRANSFER = "TRANSFER",
    SPOILAGE_DISCARD = "SPOILAGE_DISCARD"
}
export declare enum QualityCheckStatus {
    PENDING = "PENDING",
    PASSED = "PASSED",
    FAILED = "FAILED",
    PARTIAL = "PARTIAL"
}
export declare enum InboundOrderStatus {
    PENDING = "PENDING",
    RECEIVING = "RECEIVING",
    QUALITY_CHECK = "QUALITY_CHECK",
    STORING = "STORING",
    COMPLETED = "COMPLETED",
    REJECTED = "REJECTED"
}
export declare enum OutboundOrderStatus {
    PENDING = "PENDING",
    PICKING = "PICKING",
    PACKED = "PACKED",
    SHIPPED = "SHIPPED",
    CONFIRMED = "CONFIRMED",
    CANCELLED = "CANCELLED"
}
export declare enum UserRole {
    WAREHOUSE_STAFF = "WAREHOUSE_STAFF",
    WAREHOUSE_MANAGER = "WAREHOUSE_MANAGER",
    SALES_STAFF = "SALES_STAFF",
    DRIVER = "DRIVER",
    ADMIN = "ADMIN"
}
export declare enum VehicleType {
    NORMAL = "NORMAL",
    REFRIGERATED = "REFRIGERATED",
    FROZEN = "FROZEN"
}
export declare enum VehicleStatus {
    AVAILABLE = "AVAILABLE",
    IN_TRANSIT = "IN_TRANSIT",
    LOADING = "LOADING",
    MAINTENANCE = "MAINTENANCE"
}
export declare enum TransportStatus {
    SCHEDULED = "SCHEDULED",
    IN_PROGRESS = "IN_PROGRESS",
    ARRIVED = "ARRIVED",
    DELAYED = "DELAYED",
    COMPLETED = "COMPLETED"
}
export declare enum ProductCategory {
    VEGETABLES = "Rau c\u1EE7 qu\u1EA3",
    MEAT_SEAFOOD = "Th\u1ECBt c\u00E1",
    FROZEN = "\u0110\u00F4ng l\u1EA1nh",
    DAIRY_BEVERAGE = "S\u1EEFa & \u0111\u1ED3 u\u1ED1ng",
    DRY_GOODS = "\u0110\u1ED3 kh\u00F4"
}
export declare const SAFETY_ENVELOPES: {
    readonly COLD: {
        readonly minTemp: 0;
        readonly maxTemp: 4;
        readonly minHumidity: 60;
        readonly maxHumidity: 80;
        readonly label: "Kho lạnh";
        readonly description: "Rau củ, sữa, thực phẩm tươi sống";
    };
    readonly FROZEN: {
        readonly minTemp: -30;
        readonly maxTemp: -18;
        readonly minHumidity: 40;
        readonly maxHumidity: 65;
        readonly label: "Kho đông lạnh";
        readonly description: "Thịt, cá, hải sản đông lạnh";
    };
    readonly DRY: {
        readonly minTemp: 15;
        readonly maxTemp: 35;
        readonly minHumidity: 30;
        readonly maxHumidity: 70;
        readonly label: "Kho khô";
        readonly description: "Đồ hộp, mì gói, nước uống, gia vị";
    };
};
