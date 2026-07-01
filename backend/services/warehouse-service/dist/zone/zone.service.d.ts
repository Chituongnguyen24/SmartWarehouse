import { OnModuleInit } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Zone } from './zone.entity';
export declare class ZoneService implements OnModuleInit {
    private zoneRepository;
    constructor(zoneRepository: Repository<Zone>);
    onModuleInit(): Promise<void>;
    findAll(): Promise<Zone[]>;
    findOne(id: string): Promise<Zone>;
    findByCode(code: string): Promise<Zone>;
    create(dto: Partial<Zone>): Promise<Zone>;
    update(id: string, dto: Partial<Zone>): Promise<Zone>;
    updateOccupancy(id: string, delta: number): Promise<Zone>;
    getCapacitySummary(): Promise<any[]>;
}
