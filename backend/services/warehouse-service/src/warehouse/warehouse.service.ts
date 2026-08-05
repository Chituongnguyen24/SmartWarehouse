import { Injectable, OnModuleInit, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Warehouse } from './warehouse.entity';

@Injectable()
export class WarehouseService implements OnModuleInit {
  constructor(
    @InjectRepository(Warehouse)
    private warehouseRepository: Repository<Warehouse>,
  ) {}

  async onModuleInit() {
    // Seed default warehouses in Ho Chi Minh City if not exist
    const defaultWarehouses = [
      {
        code: 'WH-001',
        name: 'Kho Hàng Quận 12 (HCM North)',
        address: '12 Tô Ký, Tân Chánh Hiệp, Quận 12, TP. Hồ Chí Minh',
        latitude: 10.8671,
        longitude: 106.6713,
        isActive: true,
      },
      {
        code: 'WH-002',
        name: 'Kho Hàng Thủ Đức (HCM East)',
        address: '1 Võ Văn Ngân, Linh Chiểu, Thủ Đức, TP. Hồ Chí Minh',
        latitude: 10.8494,
        longitude: 106.7725,
        isActive: true,
      },
      {
        code: 'WH-003',
        name: 'Kho Hàng Bình Chánh (HCM West)',
        address: 'Tỉnh lộ 10, Tân Tạo, Bình Chánh, TP. Hồ Chí Minh',
        latitude: 10.6868,
        longitude: 106.5932,
        isActive: true,
      },
      {
        code: 'WH-004',
        name: 'Kho Hàng Quận 7 (HCM South)',
        address: '1025 Nguyễn Văn Linh, Tân Phong, Quận 7, TP. Hồ Chí Minh',
        latitude: 10.7324,
        longitude: 106.7214,
        isActive: true,
      },
      {
        code: 'WH-005',
        name: 'Kho Hàng Bình Thạnh (HCM Center-East)',
        address: '150 Điện Biên Phủ, Phường 25, Bình Thạnh, TP. Hồ Chí Minh',
        latitude: 10.8016,
        longitude: 106.7135,
        isActive: true,
      },
      {
        code: 'WH-006',
        name: 'Kho Hàng Gò Vấp (HCM Northwest)',
        address: '350 Quang Trung, Phường 10, Gò Vấp, TP. Hồ Chí Minh',
        latitude: 10.8252,
        longitude: 106.6631,
        isActive: true,
      },
    ];

    for (const wh of defaultWarehouses) {
      const exists = await this.warehouseRepository.findOneBy({ code: wh.code });
      if (!exists) {
        await this.warehouseRepository.save(this.warehouseRepository.create(wh));
        console.log(`[WAREHOUSE SERVICE] Seeded warehouse: ${wh.name} (${wh.code})`);
      }
    }
  }

  async findAll(): Promise<Warehouse[]> {
    return this.warehouseRepository.find({ relations: ['zones'] });
  }

  async findOne(id: string): Promise<Warehouse> {
    const wh = await this.warehouseRepository.findOne({ where: { id }, relations: ['zones'] });
    if (!wh) throw new NotFoundException(`Warehouse with ID ${id} not found`);
    return wh;
  }

  async findByCode(code: string): Promise<Warehouse> {
    const wh = await this.warehouseRepository.findOne({ where: { code }, relations: ['zones'] });
    if (!wh) throw new NotFoundException(`Warehouse with code ${code} not found`);
    return wh;
  }

  async create(dto: Partial<Warehouse>): Promise<Warehouse> {
    return this.warehouseRepository.save(this.warehouseRepository.create(dto));
  }

  async update(id: string, dto: Partial<Warehouse>): Promise<Warehouse> {
    await this.warehouseRepository.update(id, dto);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const wh = await this.findOne(id);
    await this.warehouseRepository.remove(wh);
  }
}
