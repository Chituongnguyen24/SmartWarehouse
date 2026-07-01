export declare enum StorageType {
    COLD = "COLD",
    FROZEN = "FROZEN",
    DRY = "DRY"
}
export declare class Product {
    id: string;
    sku: string;
    name: string;
    category: string;
    storageType: StorageType;
    minTemp?: number;
    maxTemp?: number;
    maxHumidity?: number;
    unit: string;
}
export declare class ProductService {
    findOneBySku(sku: string): Promise<Product | null>;
    findOne(id: string): Promise<Product | null>;
}
