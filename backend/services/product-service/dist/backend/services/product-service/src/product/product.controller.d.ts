import { ProductService } from './product.service';
export declare class ProductController {
    private productService;
    constructor(productService: ProductService);
    findAll(): Promise<import("./product.entity").Product[]>;
    findOne(id: string): Promise<import("./product.entity").Product>;
    create(body: any): Promise<import("./product.entity").Product>;
    update(id: string, body: any): Promise<import("./product.entity").Product>;
    delete(id: string): Promise<void>;
}
