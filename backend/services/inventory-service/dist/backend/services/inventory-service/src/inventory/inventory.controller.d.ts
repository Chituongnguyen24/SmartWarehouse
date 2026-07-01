import { InventoryService } from './inventory.service';
export declare class InventoryController {
    private inventoryService;
    constructor(inventoryService: InventoryService);
    getSuppliers(): Promise<import("./entities/supplier.entity").Supplier[]>;
    createSupplier(body: any): Promise<import("./entities/supplier.entity").Supplier>;
    getLots(): Promise<import("./entities/lot.entity").Lot[]>;
    importLot(body: any, req: any): Promise<import("./entities/lot.entity").Lot>;
    exportStock(body: any, req: any): Promise<import("./entities/lot.entity").Lot>;
    getFefoSuggestions(sku: string, quantity: string): Promise<any>;
    getMovements(): Promise<import("./entities/stock-movement.entity").StockMovement[]>;
    getExpiryAlert(days: string): Promise<any[]>;
    updateLotRisk(id: string, body: {
        riskScore: number;
        status: string;
    }): Promise<import("./entities/lot.entity").Lot>;
}
