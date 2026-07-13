import { Injectable, OnModuleInit, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Zone } from './zone.entity';
import { Warehouse } from '../warehouse/warehouse.entity';

@Injectable()
export class ZoneService implements OnModuleInit {
  constructor(
    @InjectRepository(Zone)
    private zoneRepository: Repository<Zone>,
    @InjectRepository(Warehouse)
    private warehouseRepository: Repository<Warehouse>,
  ) {}

  async onModuleInit() {
    // Wait up to 5 seconds for warehouses to seed
    let warehouses = [];
    for (let attempt = 0; attempt < 10; attempt++) {
      warehouses = await this.warehouseRepository.find();
      if (warehouses.length > 0) break;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    if (warehouses.length === 0) {
      console.warn('[ZONE SERVICE] No warehouses found during seeding.');
      return;
    }

    // Auto-seed default warehouse zones for each warehouse
    const defaultZones = [
      {
        type: 'COLD',
        name: 'Kho lạnh',
        description: 'Rau củ, sữa, thực phẩm tươi sống cần duy trì nhiệt độ thấp (0-4°C)',
        minTemp: 0,
        maxTemp: 4,
        minHumidity: 60,
        maxHumidity: 80,
        maxCapacity: 1200,
        currentOccupancy: 864,
      },
      {
        type: 'FROZEN',
        name: 'Kho đông lạnh',
        description: 'Thịt, cá, hải sản đông lạnh và các sản phẩm yêu cầu nhiệt độ âm (-22 đến -16°C)',
        minTemp: -22,
        maxTemp: -16,
        minHumidity: 40,
        maxHumidity: 65,
        maxCapacity: 800,
        currentOccupancy: 712,
      },
      {
        type: 'DRY',
        name: 'Kho khô',
        description: 'Đồ hộp, mì gói, nước uống, gia vị và các mặt hàng không yêu cầu điều kiện bảo quản đặc biệt (18-28°C)',
        minTemp: 18,
        maxTemp: 28,
        minHumidity: 30,
        maxHumidity: 60,
        maxCapacity: 2400,
        currentOccupancy: 1320,
      },
    ];

    for (const wh of warehouses) {
      for (const zoneData of defaultZones) {
        const zoneCode = `${wh.code}_${zoneData.type}`;
        const exists = await this.zoneRepository.findOneBy({ code: zoneCode });
        if (!exists) {
          await this.zoneRepository.save(
            this.zoneRepository.create({
              ...zoneData,
              code: zoneCode,
              warehouseId: wh.id,
              name: `${zoneData.name} - ${wh.name}`,
            }),
          );
          console.log(`[ZONE SERVICE] Seeded zone: ${zoneData.name} (${zoneCode}) for warehouse ${wh.code}`);
        }
      }
    }
  }

  async findAll(): Promise<Zone[]> {
    return this.zoneRepository.find({ relations: ['shelves'] });
  }

  async findOne(id: string): Promise<Zone> {
    const zone = await this.zoneRepository.findOne({ where: { id }, relations: ['shelves'] });
    if (!zone) throw new NotFoundException(`Zone with ID ${id} not found`);
    return zone;
  }

  async findByCode(code: string): Promise<Zone> {
    let zone = await this.zoneRepository.findOne({ where: { code }, relations: ['shelves'] });
    if (!zone) {
      // Fallback for backward compatibility if code is e.g., "COLD"
      zone = await this.zoneRepository.createQueryBuilder('zone')
        .leftJoinAndSelect('zone.shelves', 'shelves')
        .where('zone.code LIKE :pattern', { pattern: `%_${code}` })
        .getOne();
    }
    if (!zone) throw new NotFoundException(`Zone with code ${code} not found`);
    return zone;
  }

  async create(dto: Partial<Zone>): Promise<Zone> {
    return this.zoneRepository.save(this.zoneRepository.create(dto));
  }

  async update(id: string, dto: Partial<Zone>): Promise<Zone> {
    await this.zoneRepository.update(id, dto);
    return this.findOne(id);
  }

  async updateOccupancy(id: string, delta: number): Promise<Zone> {
    const zone = await this.findOne(id);
    zone.currentOccupancy = Math.max(0, zone.currentOccupancy + delta);
    return this.zoneRepository.save(zone);
  }

  async getCapacitySummary(): Promise<any[]> {
    const zones = await this.findAll();
    return zones.map((z) => ({
      id: z.id,
      code: z.code,
      name: z.name,
      type: z.type,
      maxCapacity: z.maxCapacity,
      currentOccupancy: z.currentOccupancy,
      usagePercent: Math.round((z.currentOccupancy / z.maxCapacity) * 100),
      availableSlots: z.maxCapacity - z.currentOccupancy,
      tempRange: `${z.minTemp}°C ~ ${z.maxTemp}°C`,
      humidityRange: `${z.minHumidity}% ~ ${z.maxHumidity}%`,
    }));
  }
}
