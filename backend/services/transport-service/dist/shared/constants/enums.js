"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SAFETY_ENVELOPES = exports.ProductCategory = exports.TransportStatus = exports.VehicleStatus = exports.VehicleType = exports.UserRole = exports.OutboundOrderStatus = exports.InboundOrderStatus = exports.QualityCheckStatus = exports.MovementType = exports.LotStatus = exports.SlotStatus = exports.ZoneType = void 0;
var ZoneType;
(function (ZoneType) {
    ZoneType["COLD"] = "COLD";
    ZoneType["FROZEN"] = "FROZEN";
    ZoneType["DRY"] = "DRY";
})(ZoneType || (exports.ZoneType = ZoneType = {}));
var SlotStatus;
(function (SlotStatus) {
    SlotStatus["EMPTY"] = "EMPTY";
    SlotStatus["OCCUPIED"] = "OCCUPIED";
    SlotStatus["FULL"] = "FULL";
    SlotStatus["MAINTENANCE"] = "MAINTENANCE";
})(SlotStatus || (exports.SlotStatus = SlotStatus = {}));
var LotStatus;
(function (LotStatus) {
    LotStatus["NORMAL"] = "NORMAL";
    LotStatus["AT_RISK"] = "AT_RISK";
    LotStatus["EXPIRED"] = "EXPIRED";
    LotStatus["QUARANTINE"] = "QUARANTINE";
    LotStatus["DISCARDED"] = "DISCARDED";
})(LotStatus || (exports.LotStatus = LotStatus = {}));
var MovementType;
(function (MovementType) {
    MovementType["IN"] = "IN";
    MovementType["OUT"] = "OUT";
    MovementType["ADJUSTMENT"] = "ADJUSTMENT";
    MovementType["TRANSFER"] = "TRANSFER";
    MovementType["SPOILAGE_DISCARD"] = "SPOILAGE_DISCARD";
})(MovementType || (exports.MovementType = MovementType = {}));
var QualityCheckStatus;
(function (QualityCheckStatus) {
    QualityCheckStatus["PENDING"] = "PENDING";
    QualityCheckStatus["PASSED"] = "PASSED";
    QualityCheckStatus["FAILED"] = "FAILED";
    QualityCheckStatus["PARTIAL"] = "PARTIAL";
})(QualityCheckStatus || (exports.QualityCheckStatus = QualityCheckStatus = {}));
var InboundOrderStatus;
(function (InboundOrderStatus) {
    InboundOrderStatus["PENDING"] = "PENDING";
    InboundOrderStatus["RECEIVING"] = "RECEIVING";
    InboundOrderStatus["QUALITY_CHECK"] = "QUALITY_CHECK";
    InboundOrderStatus["STORING"] = "STORING";
    InboundOrderStatus["COMPLETED"] = "COMPLETED";
    InboundOrderStatus["REJECTED"] = "REJECTED";
})(InboundOrderStatus || (exports.InboundOrderStatus = InboundOrderStatus = {}));
var OutboundOrderStatus;
(function (OutboundOrderStatus) {
    OutboundOrderStatus["PENDING"] = "PENDING";
    OutboundOrderStatus["PICKING"] = "PICKING";
    OutboundOrderStatus["PACKED"] = "PACKED";
    OutboundOrderStatus["SHIPPED"] = "SHIPPED";
    OutboundOrderStatus["CONFIRMED"] = "CONFIRMED";
    OutboundOrderStatus["CANCELLED"] = "CANCELLED";
})(OutboundOrderStatus || (exports.OutboundOrderStatus = OutboundOrderStatus = {}));
var UserRole;
(function (UserRole) {
    UserRole["WAREHOUSE_STAFF"] = "WAREHOUSE_STAFF";
    UserRole["WAREHOUSE_MANAGER"] = "WAREHOUSE_MANAGER";
    UserRole["SALES_STAFF"] = "SALES_STAFF";
    UserRole["DRIVER"] = "DRIVER";
    UserRole["ADMIN"] = "ADMIN";
})(UserRole || (exports.UserRole = UserRole = {}));
var VehicleType;
(function (VehicleType) {
    VehicleType["NORMAL"] = "NORMAL";
    VehicleType["REFRIGERATED"] = "REFRIGERATED";
    VehicleType["FROZEN"] = "FROZEN";
})(VehicleType || (exports.VehicleType = VehicleType = {}));
var VehicleStatus;
(function (VehicleStatus) {
    VehicleStatus["AVAILABLE"] = "AVAILABLE";
    VehicleStatus["IN_TRANSIT"] = "IN_TRANSIT";
    VehicleStatus["LOADING"] = "LOADING";
    VehicleStatus["MAINTENANCE"] = "MAINTENANCE";
})(VehicleStatus || (exports.VehicleStatus = VehicleStatus = {}));
var TransportStatus;
(function (TransportStatus) {
    TransportStatus["SCHEDULED"] = "SCHEDULED";
    TransportStatus["IN_PROGRESS"] = "IN_PROGRESS";
    TransportStatus["ARRIVED"] = "ARRIVED";
    TransportStatus["DELAYED"] = "DELAYED";
    TransportStatus["COMPLETED"] = "COMPLETED";
})(TransportStatus || (exports.TransportStatus = TransportStatus = {}));
var ProductCategory;
(function (ProductCategory) {
    ProductCategory["VEGETABLES"] = "Rau c\u1EE7 qu\u1EA3";
    ProductCategory["MEAT_SEAFOOD"] = "Th\u1ECBt c\u00E1";
    ProductCategory["FROZEN"] = "\u0110\u00F4ng l\u1EA1nh";
    ProductCategory["DAIRY_BEVERAGE"] = "S\u1EEFa & \u0111\u1ED3 u\u1ED1ng";
    ProductCategory["DRY_GOODS"] = "\u0110\u1ED3 kh\u00F4";
})(ProductCategory || (exports.ProductCategory = ProductCategory = {}));
exports.SAFETY_ENVELOPES = {
    [ZoneType.COLD]: {
        minTemp: 0,
        maxTemp: 4,
        minHumidity: 60,
        maxHumidity: 80,
        label: 'Kho lạnh',
        description: 'Rau củ, sữa, thực phẩm tươi sống',
    },
    [ZoneType.FROZEN]: {
        minTemp: -30,
        maxTemp: -18,
        minHumidity: 40,
        maxHumidity: 65,
        label: 'Kho đông lạnh',
        description: 'Thịt, cá, hải sản đông lạnh',
    },
    [ZoneType.DRY]: {
        minTemp: 15,
        maxTemp: 35,
        minHumidity: 30,
        maxHumidity: 70,
        label: 'Kho khô',
        description: 'Đồ hộp, mì gói, nước uống, gia vị',
    },
};
//# sourceMappingURL=enums.js.map