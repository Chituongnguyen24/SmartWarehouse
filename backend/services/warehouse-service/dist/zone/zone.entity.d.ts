import { Shelf } from '../shelf/shelf.entity';
export declare class Zone {
    id: string;
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
