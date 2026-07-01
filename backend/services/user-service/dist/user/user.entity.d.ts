export declare enum UserRole {
    ADMIN = "ADMIN",
    WAREHOUSE_MANAGER = "WAREHOUSE_MANAGER",
    WAREHOUSE_STAFF = "WAREHOUSE_STAFF",
    SALES_STAFF = "SALES_STAFF",
    DRIVER = "DRIVER"
}
export declare class User {
    id: string;
    name: string;
    email: string;
    passwordHash: string;
    role: UserRole;
    createdAt: Date;
}
