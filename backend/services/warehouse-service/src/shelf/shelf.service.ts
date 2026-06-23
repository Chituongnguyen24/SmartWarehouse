import { Injectable, OnModuleInit, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Shelf } from './shelf.entity';
import { ZoneService } from '../zone/zone.service';

@Injectable()
export class ShelfService implements OnModuleInit {
  constructor(
    @InjectRepository(Shelf)
    private shelfRepository: Repository<Shelf>,
    private zoneService: ZoneService,
  ) {}

  async onModuleInit() {
    // Auto-seed shelves for each zone
    const zones = await this.zoneService.findAll();
    const shelfSeeds = {
      COLD: [
        { code: 'CL-A', name: 'Kệ A - Kho lạnh', maxSlots: 20, floor: 1 },
        { code: 'CL-B', name: 'Kệ B - Kho lạnh', maxSlots: 20, floor: 1 },
        { code: 'CL-C', name: 'Kệ C - Kho lạnh', maxSlots: 20, floor: 2 },
      ],
      FROZEN: [
        { code: 'FR-A', name: 'Kệ A - Kho đông', maxSlots: 16, floor: 1 },
        { code: 'FR-B', name: 'Kệ B - Kho đông', maxSlots: 16, floor: 1 },
      ],
      DRY: [
        { code: 'DR-A', name: 'Kệ A - Kho khô', maxSlots: 30, floor: 1 },
        { code: 'DR-B', name: 'Kệ B - Kho khô', maxSlots: 30, floor: 1 },
        { code: 'DR-C', name: 'Kệ C - Kho khô', maxSlots: 20, floor: 2 },
      ],
    };

    for (const zone of zones) {
      const seeds = shelfSeeds[zone.code];
      if (!seeds) continue;

      for (const seed of seeds) {
        const exists = await this.shelfRepository.findOneBy({ code: seed.code });
        if (!exists) {
          await this.shelfRepository.save(this.shelfRepository.create({
            ...seed,
            zoneId: zone.id,
          }));
          console.log(`Seeded shelf: ${seed.code} in zone ${zone.code}`);
        }
      }
    }
  }

  async findAll(): Promise<Shelf[]> {
    return this.shelfRepository.find({ relations: ['zone', 'slots'] });
  }

  async findByZone(zoneId: string): Promise<Shelf[]> {
    return this.shelfRepository.find({ where: { zoneId }, relations: ['slots'] });
  }

  async findOne(id: string): Promise<Shelf> {
    const shelf = await this.shelfRepository.findOne({ where: { id }, relations: ['zone', 'slots'] });
    if (!shelf) throw new NotFoundException(`Shelf with ID ${id} not found`);
    return shelf;
  }

  async create(dto: Partial<Shelf>): Promise<Shelf> {
    return this.shelfRepository.save(this.shelfRepository.create(dto));
  }

  async update(id: string, dto: Partial<Shelf>): Promise<Shelf> {
    await this.shelfRepository.update(id, dto);
    return this.findOne(id);
  }
}
