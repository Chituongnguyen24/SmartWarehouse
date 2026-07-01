import { Zone } from '../zone/zone.entity';
import { StorageSlot } from '../storage-slot/storage-slot.entity';
export declare class Shelf {
    id: string;
    code: string;
    name: string;
    zoneId: string;
    zone: Zone;
    maxSlots: number;
    currentSlotsUsed: number;
    floor: number;
    isActive: boolean;
    slots: StorageSlot[];
    createdAt: Date;
    updatedAt: Date;
}
