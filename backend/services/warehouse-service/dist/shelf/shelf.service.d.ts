import { OnModuleInit } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Shelf } from './shelf.entity';
import { ZoneService } from '../zone/zone.service';
export declare class ShelfService implements OnModuleInit {
    private shelfRepository;
    private zoneService;
    constructor(shelfRepository: Repository<Shelf>, zoneService: ZoneService);
    onModuleInit(): Promise<void>;
    findAll(): Promise<Shelf[]>;
    findByZone(zoneId: string): Promise<Shelf[]>;
    findOne(id: string): Promise<Shelf>;
    create(dto: Partial<Shelf>): Promise<Shelf>;
    update(id: string, dto: Partial<Shelf>): Promise<Shelf>;
}
