import { OnModuleInit } from '@nestjs/common';
import { Repository } from 'typeorm';
import { StorageSlot } from './storage-slot.entity';
import { ShelfService } from '../shelf/shelf.service';
import { ZoneService } from '../zone/zone.service';
export declare class StorageSlotService implements OnModuleInit {
    private slotRepository;
    private shelfService;
    private zoneService;
    constructor(slotRepository: Repository<StorageSlot>, shelfService: ShelfService, zoneService: ZoneService);
    onModuleInit(): Promise<void>;
    findAll(zoneCode?: string): Promise<StorageSlot[]>;
    findOne(id: string): Promise<StorageSlot>;
    findEmpty(zoneCode?: string): Promise<StorageSlot[]>;
    assignLot(slotId: string, dto: {
        lotId: string;
        lotCode: string;
        productSku: string;
        weightKg?: number;
    }): Promise<StorageSlot>;
    releaseLot(slotId: string): Promise<StorageSlot>;
    setMaintenance(slotId: string): Promise<StorageSlot>;
    suggestSlot(zoneCode: string, isPriority?: boolean): Promise<StorageSlot | null>;
    getSlotMap(zoneCode: string): Promise<any>;
}
