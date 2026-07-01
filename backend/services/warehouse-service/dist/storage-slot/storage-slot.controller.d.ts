import { StorageSlotService } from './storage-slot.service';
export declare class StorageSlotController {
    private slotService;
    constructor(slotService: StorageSlotService);
    findAll(zone?: string): Promise<import("./storage-slot.entity").StorageSlot[]>;
    findEmpty(zone?: string): Promise<import("./storage-slot.entity").StorageSlot[]>;
    suggestSlot(zone: string, priority?: string): Promise<import("./storage-slot.entity").StorageSlot>;
    getSlotMap(zoneCode: string): Promise<any>;
    findOne(id: string): Promise<import("./storage-slot.entity").StorageSlot>;
    assignLot(id: string, body: any): Promise<import("./storage-slot.entity").StorageSlot>;
    releaseLot(id: string): Promise<import("./storage-slot.entity").StorageSlot>;
    setMaintenance(id: string): Promise<import("./storage-slot.entity").StorageSlot>;
}
