import { Shelf } from '../shelf/shelf.entity';
import { Warehouse } from '../warehouse/warehouse.entity';
export declare class Zone {
    id: string;
    warehouseId: string;
    warehouse: Warehouse;
    code: string;
    name: string;
    type: string;
    description: string;
    minTemp: number;
    maxTemp: number;
    minHumidity: number;
    maxHumidity: number;
    maxCapacity: number;
    currentOccupancy: number;
    isActive: boolean;
    shelves: Shelf[];
    createdAt: Date;
    updatedAt: Date;
}
