import { Injectable, OnModuleInit, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Zone } from './zone.entity';

@Injectable()
export class ZoneService implements OnModuleInit {
  constructor(
    @InjectRepository(Zone)
    private zoneRepository: Repository<Zone>,
  ) {}

  async onModuleInit() {
    // Auto-seed default warehouse zones
    const defaultZones = [
      {
        code: 'COLD',
        name: 'Kho lạnh',
        type: 'COLD',
        description: 'Rau củ, sữa, thực phẩm tươi sống cần duy trì nhiệt độ thấp (0-4°C)',
        minTemp: 0,
        maxTemp: 4,
        minHumidity: 60,
        maxHumidity: 80,
        maxCapacity: 1200,
        currentOccupancy: 864,
      },
      {
        code: 'FROZEN',
        name: 'Kho đông lạnh',
        type: 'FROZEN',
        description: 'Thịt, cá, hải sản đông lạnh và các sản phẩm yêu cầu nhiệt độ âm (-22 đến -16°C)',
        minTemp: -22,
        maxTemp: -16,
        minHumidity: 40,
        maxHumidity: 65,
        maxCapacity: 800,
        currentOccupancy: 712,
      },
      {
        code: 'DRY',
        name: 'Kho khô',
        type: 'DRY',
        description: 'Đồ hộp, mì gói, nước uống, gia vị và các mặt hàng không yêu cầu điều kiện bảo quản đặc biệt (18-28°C)',
        minTemp: 18,
        maxTemp: 28,
        minHumidity: 30,
        maxHumidity: 60,
        maxCapacity: 2400,
        currentOccupancy: 1320,
      },
    ];

    for (const zoneData of defaultZones) {
      const exists = await this.zoneRepository.findOneBy({ code: zoneData.code });
      if (!exists) {
        await this.zoneRepository.save(this.zoneRepository.create(zoneData));
        console.log(`Seeded zone: ${zoneData.name} (${zoneData.code})`);
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
    const zone = await this.zoneRepository.findOne({ where: { code }, relations: ['shelves'] });
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
