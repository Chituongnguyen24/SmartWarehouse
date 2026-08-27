import { Injectable, OnModuleInit, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StorageSlot } from './storage-slot.entity';
import { ShelfService } from '../shelf/shelf.service';
import { ZoneService } from '../zone/zone.service';

@Injectable()
export class StorageSlotService implements OnModuleInit {
  constructor(
    @InjectRepository(StorageSlot)
    private slotRepository: Repository<StorageSlot>,
    private shelfService: ShelfService,
    private zoneService: ZoneService,
  ) {}

  async onModuleInit() {
    // Auto-seed storage slots for each shelf
    const shelves = await this.shelfService.findAll();

    for (const shelf of shelves) {
      const existingCount = await this.slotRepository.countBy({ shelfId: shelf.id });
      if (existingCount > 0) continue;

      for (let i = 1; i <= shelf.maxSlots; i++) {
        const slotCode = `${shelf.code}-${String(i).padStart(2, '0')}`;
        const row = Math.ceil(i / 5);
        const position = ((i - 1) % 5) + 1;

        await this.slotRepository.save(this.slotRepository.create({
          code: slotCode,
          shelfId: shelf.id,
          status: 'EMPTY',
          maxWeightKg: shelf.zone?.type === 'FROZEN' ? 300 : 500,
          row,
          position,
          isPriority: position <= 2, // First 2 positions are priority (easy access) for FEFO
        }));
      }
      console.log(`Seeded ${shelf.maxSlots} slots for shelf ${shelf.code}`);
    }
  }

  async findAll(zoneCode?: string): Promise<StorageSlot[]> {
    if (zoneCode) {
      const zone = await this.zoneService.findByCode(zoneCode);
      const shelves = await this.shelfService.findByZone(zone.id);
      const shelfIds = shelves.map((s) => s.id);
      if (shelfIds.length === 0) return [];
      return this.slotRepository.createQueryBuilder('slot')
        .leftJoinAndSelect('slot.shelf', 'shelf')
        .where('slot.shelf_id IN (:...shelfIds)', { shelfIds })
        .orderBy('slot.code', 'ASC')
        .getMany();
    }
    return this.slotRepository.find({ relations: ['shelf'], order: { code: 'ASC' } });
  }

  async findOne(id: string): Promise<StorageSlot> {
    const slot = await this.slotRepository.findOne({ where: { id }, relations: ['shelf'] });
    if (!slot) throw new NotFoundException(`StorageSlot with ID ${id} not found`);
    return slot;
  }

  async findEmpty(zoneCode?: string): Promise<StorageSlot[]> {
    const qb = this.slotRepository.createQueryBuilder('slot')
      .leftJoinAndSelect('slot.shelf', 'shelf')
      .leftJoinAndSelect('shelf.zone', 'zone')
      .where('slot.status = :status', { status: 'EMPTY' });

    if (zoneCode) {
      qb.andWhere('zone.code = :zoneCode', { zoneCode });
    }

    return qb.orderBy('slot.isPriority', 'DESC').addOrderBy('slot.code', 'ASC').getMany();
  }

  async assignLot(slotId: string, dto: { lotId: string; lotCode: string; productSku: string; weightKg?: number }): Promise<StorageSlot> {
    const slot = await this.findOne(slotId);
    if (slot.status !== 'EMPTY') {
      throw new BadRequestException(`Slot ${slot.code} is not empty (current status: ${slot.status})`);
    }

    slot.status = 'OCCUPIED';
    slot.lotId = dto.lotId;
    slot.lotCode = dto.lotCode;
    slot.productSku = dto.productSku;
    slot.currentWeightKg = dto.weightKg || 0;

    const updated = await this.slotRepository.save(slot);

    // Update shelf occupancy
    const shelf = await this.shelfService.findOne(slot.shelfId);
    shelf.currentSlotsUsed += 1;
    await this.shelfService.update(shelf.id, { currentSlotsUsed: shelf.currentSlotsUsed });

    return updated;
  }

  async releaseLot(slotId: string): Promise<StorageSlot> {
    const slot = await this.findOne(slotId);
    if (slot.status === 'EMPTY') {
      throw new BadRequestException(`Slot ${slot.code} is already empty`);
    }

    const previousLot = slot.lotCode;
    slot.status = 'EMPTY';
    slot.lotId = null;
    slot.lotCode = null;
    slot.productSku = null;
    slot.currentWeightKg = 0;

    const updated = await this.slotRepository.save(slot);

    // Update shelf occupancy
    const shelf = await this.shelfService.findOne(slot.shelfId);
    shelf.currentSlotsUsed = Math.max(0, shelf.currentSlotsUsed - 1);
    await this.shelfService.update(shelf.id, { currentSlotsUsed: shelf.currentSlotsUsed });

    console.log(`Released lot ${previousLot} from slot ${slot.code}`);
    return updated;
  }

  async setMaintenance(slotId: string): Promise<StorageSlot> {
    const slot = await this.findOne(slotId);
    slot.status = 'MAINTENANCE';
    return this.slotRepository.save(slot);
  }

  async suggestSlot(zoneCode: string, isPriority = false): Promise<StorageSlot | null> {
    const qb = this.slotRepository.createQueryBuilder('slot')
      .leftJoinAndSelect('slot.shelf', 'shelf')
      .leftJoinAndSelect('shelf.zone', 'zone')
      .where('slot.status = :status', { status: 'EMPTY' })
      .andWhere('zone.code = :zoneCode', { zoneCode });

    if (isPriority) {
      qb.andWhere('slot.isPriority = true');
    }

    qb.orderBy('slot.isPriority', 'DESC').addOrderBy('slot.code', 'ASC').take(1);
    return qb.getOne();
  }

  async getSlotMap(zoneCode: string): Promise<any> {
    const zone = await this.zoneService.findByCode(zoneCode);
    const shelves = await this.shelfService.findByZone(zone.id);

    const map = [];
    for (const shelf of shelves) {
      const slots = await this.slotRepository.find({
        where: { shelfId: shelf.id },
        order: { row: 'ASC', position: 'ASC' },
      });
      map.push({
        shelfCode: shelf.code,
        shelfName: shelf.name,
        floor: shelf.floor,
        maxSlots: shelf.maxSlots,
        usedSlots: shelf.currentSlotsUsed,
        slots: slots.map((s) => ({
          id: s.id,
          code: s.code,
          status: s.status,
          lotCode: s.lotCode,
          productSku: s.productSku,
          row: s.row,
          position: s.position,
          isPriority: s.isPriority,
        })),
      });
    }

    return {
      zone: { id: zone.id, code: zone.code, name: zone.name, type: zone.type },
      shelves: map,
      summary: {
        totalSlots: map.reduce((sum, s) => sum + s.maxSlots, 0),
        usedSlots: map.reduce((sum, s) => sum + s.usedSlots, 0),
        emptySlots: map.reduce((sum, s) => sum + (s.maxSlots - s.usedSlots), 0),
      },
    };
  }
}
