import { WarehouseService } from './warehouse.service';
export declare class WarehouseController {
    private warehouseService;
    constructor(warehouseService: WarehouseService);
    findAll(): Promise<import("./warehouse.entity").Warehouse[]>;
    findOne(id: string): Promise<import("./warehouse.entity").Warehouse>;
    findByCode(code: string): Promise<import("./warehouse.entity").Warehouse>;
    create(body: any): Promise<import("./warehouse.entity").Warehouse>;
    update(id: string, body: any): Promise<import("./warehouse.entity").Warehouse>;
    remove(id: string): Promise<void>;
}
