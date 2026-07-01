import { Shelf } from '../shelf/shelf.entity';
export declare class StorageSlot {
    id: string;
    code: string;
    shelfId: string;
    shelf: Shelf;
    status: string;
    lotId: string;
    lotCode: string;
    productSku: string;
    maxWeightKg: number;
    currentWeightKg: number;
    row: number;
    position: number;
    isPriority: boolean;
    createdAt: Date;
    updatedAt: Date;
}
