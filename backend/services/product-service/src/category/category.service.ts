import { Injectable, OnModuleInit, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './category.entity';

@Injectable()
export class CategoryService implements OnModuleInit {
  constructor(
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
  ) {}

  async onModuleInit() {
    const count = await this.categoryRepository.count();
    if (count === 0) {
      const defaultCategories = [
        { name: 'Thịt tươi sống', description: 'Thịt heo, bò, gà, vịt tươi sống các loại' },
        { name: 'Hải sản', description: 'Cá, tôm, mực, nghêu, sò và các loại hải sản tươi sống' },
        { name: 'Rau củ quả', description: 'Rau xanh, củ, quả tươi VietGAP và hữu cơ' },
        { name: 'Trái cây', description: 'Trái cây tươi trong nước và nhập khẩu' },
        { name: 'Sữa & Chế phẩm sữa', description: 'Sữa tươi, sữa chua, phô mai, bơ' },
        { name: 'Đồ đông lạnh', description: 'Thực phẩm đông lạnh, kem, thực phẩm chế biến sẵn' },
        { name: 'Đồ khô & Gia vị', description: 'Mì gói, gia vị, dầu ăn, nước mắm, đường, muối' },
        { name: 'Đồ uống', description: 'Nước ngọt, nước suối, trà, cà phê, nước ép' },
        { name: 'Bánh kẹo', description: 'Bánh, kẹo, snack các loại' },
        { name: 'Đồ hộp', description: 'Thực phẩm đóng hộp, đồ hộp nhập khẩu' },
      ];

      for (const cat of defaultCategories) {
        await this.categoryRepository.save(this.categoryRepository.create(cat));
      }
      console.log(`Seeded ${defaultCategories.length} product categories`);
    }
  }

  async findAll(): Promise<Category[]> {
    return this.categoryRepository.find({ order: { name: 'ASC' } });
  }

  async findOne(id: string): Promise<Category> {
    const category = await this.categoryRepository.findOneBy({ id });
    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }
    return category;
  }

  async create(dto: Partial<Category>): Promise<Category> {
    return this.categoryRepository.save(this.categoryRepository.create(dto));
  }

  async update(id: string, dto: Partial<Category>): Promise<Category> {
    const category = await this.findOne(id);
    Object.assign(category, dto);
    return this.categoryRepository.save(category);
  }

  async remove(id: string): Promise<void> {
    const category = await this.findOne(id);
    await this.categoryRepository.remove(category);
  }
}
