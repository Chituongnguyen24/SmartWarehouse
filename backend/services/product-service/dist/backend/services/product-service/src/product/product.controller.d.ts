import { ProductService } from './product.service';
export declare class ProductController {
    private productService;
    constructor(productService: ProductService);
    findAll(keyword?: string, category?: string, isFlashSale?: string, page?: number, limit?: number): Promise<{
        items: import("./product.entity").Product[];
        total: number;
        page: number;
        totalPages: number;
    }>;
    findOne(id: string): Promise<import("./product.entity").Product>;
    create(body: any): Promise<import("./product.entity").Product>;
    update(id: string, body: any): Promise<import("./product.entity").Product>;
    delete(id: string): Promise<void>;
}
