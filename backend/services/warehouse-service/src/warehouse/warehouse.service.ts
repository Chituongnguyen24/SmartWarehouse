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
      {
        code: 'WH-007',
        name: 'Kho Hàng Quận 1 (HCM Center)',
        address: '85 Lê Lợi, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh',
        latitude: 10.7769,
        longitude: 106.7009,
        isActive: true,
      },
      {
        code: 'WH-008',
        name: 'Kho Hàng Quận 5 (HCM South-West)',
        address: '105 An Dương Vương, Phường 9, Quận 5, TP. Hồ Chí Minh',
        latitude: 10.7574,
        longitude: 106.6635,
        isActive: true,
      },
      {
        code: 'WH-009',
        name: 'Kho Hàng Tân Bình (HCM West-Center)',
        address: '20 Trường Chinh, Phường 15, Tân Bình, TP. Hồ Chí Minh',
        latitude: 10.7938,
        longitude: 106.6509,
        isActive: true,
      },
      {
        code: 'WH-010',
        name: 'Kho Hàng Bình Tân (HCM Deep-West)',
        address: '88 Kinh Dương Vương, An Lạc, Bình Tân, TP. Hồ Chí Minh',
        latitude: 10.7492,
        longitude: 106.6025,
        isActive: true,
      },
      {
        code: 'WH-011',
        name: 'Kho Hàng Hóc Môn (HCM Far-North)',
        address: '14 Nguyễn Ảnh Thủ, Bà Điểm, Hóc Môn, TP. Hồ Chí Minh',
        latitude: 10.8833,
        longitude: 106.5931,
        isActive: true,
      },
      {
        code: 'WH-012',
        name: 'Kho Hàng Nhà Bè (HCM Far-South)',
        address: '500 Huỳnh Tấn Phát, Phú Xuân, Nhà Bè, TP. Hồ Chí Minh',
        latitude: 10.6953,
        longitude: 106.7231,
        isActive: true,
      },
      {
        code: 'WH-013',
        name: 'Kho Hàng Phú Nhuận (HCM Mid-Center)',
        address: '18 Phan Xích Long, Phường 2, Phú Nhuận, TP. Hồ Chí Minh',
        latitude: 10.7992,
        longitude: 106.6803,
        isActive: true,
      },
      {
        code: 'WH-014',
        name: 'Kho Hàng Quận 8 (HCM South-West-Line)',
        address: '1020 Phạm Thế Hiển, Phường 5, Quận 8, TP. Hồ Chí Minh',
        latitude: 10.7239,
        longitude: 106.6342,
        isActive: true,
      },
      {
        code: 'WH-015',
        name: 'Kho Hàng Củ Chi (HCM Northwest-Zone)',
        address: '450 Quốc lộ 22, Tân Thông Hội, Củ Chi, TP. Hồ Chí Minh',
        latitude: 10.9625,
        longitude: 106.4981,
        isActive: true,
      },
      {
        code: 'WH-016',
        name: 'Kho Hàng Quận 10 (HCM Center-West)',
        address: '123 Đường 3 Tháng 2, Phường 11, Quận 10, TP. Hồ Chí Minh',
        latitude: 10.7719,
        longitude: 106.6669,
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
    return this.warehouseRepository.find();
  }

  async findOne(id: string): Promise<Warehouse> {
    const wh = await this.warehouseRepository.findOne({ where: { id } });
    if (!wh) throw new NotFoundException(`Warehouse with ID ${id} not found`);
    return wh;
  }

  async findByCode(code: string): Promise<Warehouse> {
    const wh = await this.warehouseRepository.findOne({ where: { code } });
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
