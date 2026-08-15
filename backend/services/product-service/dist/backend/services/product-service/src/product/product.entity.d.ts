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
    minTemp: number;
    maxTemp: number;
    maxHumidity: number;
    unit: string;
    price: number;
    imageUrl: string;
    description: string;
    origin: string;
    preservation: string;
    isFlashSale: boolean;
    discountPercent: number;
    rating: number;
    soldCount: number;
    stock: number;
    createdAt: Date;
}
