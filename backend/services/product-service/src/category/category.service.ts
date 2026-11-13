import { Injectable, OnModuleInit, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './category.entity';
import { Product } from '../product/product.entity';

export function slugify(text: string): string {
  if (!text) return '';
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-');
}

export const STANDARD_CATEGORIES = [
  { name: 'Rau củ, trái cây', slug: 'rau-cu-trai-cay', imageUrl: '/icons/rau-cu-qua.png', description: 'Rau sạch, củ quả và trái cây tươi theo chuẩn VietGAP' },
  { name: 'Thịt, trứng, hải sản', slug: 'thit-trung-hai-san', imageUrl: '/icons/thit-tung-hai-san.png', description: 'Thịt tươi ngon, trứng gia cầm và hải sản tươi sống được kiểm dịch' },
  { name: 'Thức ăn chế biến, bún tươi', slug: 'thuc-an-che-bien-bun-tuoi', imageUrl: '/icons/thuc-pham-an-lien.png', description: 'Bún tươi, món ăn chế biến sẵn hợp vệ sinh an toàn thực phẩm' },
  { name: 'Thực phẩm đông, mát', slug: 'thuc-pham-dong-mat', imageUrl: '/icons/thuc-pham-dong-lanh.png', description: 'Thực phẩm bảo quản kho mát và kho cấp đông tiêu chuẩn' },
  { name: 'Sữa, sản phẩm từ sữa', slug: 'sua-san-pham-tu-sua', imageUrl: '/icons/sua.png', description: 'Sữa tươi, sữa chua, phô mai và các chế phẩm từ sữa dinh dưỡng' },
  { name: 'Thức uống', slug: 'thuc-uong', imageUrl: '/icons/nuoc-ngot.png', description: 'Nước khoáng, nước ép trái cây, trà, cà phê và đồ uống giải khát' },
  { name: 'Bánh, kẹo, snack', slug: 'banh-keo-snack', imageUrl: '/icons/banh-keo.png', description: 'Bánh ngọt, kẹo, snack giòn rụm và món ăn vặt phong phú' },
  { name: 'Gia vị, gạo, thực phẩm khô', slug: 'gia-vi-gao-thuc-pham-kho', imageUrl: '/icons/gao-dokho.png', description: 'Gạo ST25, dầu ăn, nước mắm, gia vị nhà bếp và lương thực khô' },
  { name: 'Sản phẩm cho bé', slug: 'san-pham-cho-be', imageUrl: '/icons/san-pham-cho-be.png', description: 'Sữa công thức, bột ăn dặm, tã bỉm và đồ dùng an toàn cho bé' },
  { name: 'Chăm sóc cá nhân', slug: 'cham-soc-ca-nhan', imageUrl: '/icons/cham-soc-ca-nhan.png', description: 'Dầu gội, sữa tắm, kem đánh răng và sản phẩm vệ sinh cá nhân' },
  { name: 'Nhà cửa và đời sống', slug: 'nha-cua-va-doi-song', imageUrl: '/icons/nha-cua-doi-song.png', description: 'Nước giặt, nước rửa chén, chất tẩy rửa và vật dụng gia đình' },
  { name: 'Shop nổi bật', slug: 'shop-noi-bat', imageUrl: '/icons/shop-noi-bat.svg', description: 'Gian hàng đặc sắc và thương hiệu đối tác tiêu biểu' },
];

@Injectable()
export class CategoryService implements OnModuleInit {
  constructor(
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
  ) {}

  async onModuleInit() {
    await this.syncStandardCategories();
  }

  async syncStandardCategories() {
    for (const item of STANDARD_CATEGORIES) {
      let existing = await this.categoryRepository.findOneBy({ name: item.name });
      if (!existing) {
        existing = await this.categoryRepository.findOneBy({ slug: item.slug });
      }

      if (!existing) {
        await this.categoryRepository.save(this.categoryRepository.create({
          name: item.name,
          slug: item.slug,
          imageUrl: item.imageUrl,
          description: item.description,
          isActive: true,
        }));
      } else {
        existing.slug = item.slug;
        if (!existing.imageUrl) existing.imageUrl = item.imageUrl;
        if (!existing.description) existing.description = item.description;
        await this.categoryRepository.save(existing);
      }
    }
  }

  async findAll(): Promise<Category[]> {
    // 1. Lấy danh sách số lượng sản phẩm thực tế theo danh mục
    const countsRaw = await this.productRepository
      .createQueryBuilder('p')
      .select('TRIM(p.category)', 'catName')
      .addSelect('COUNT(p.id)', 'count')
      .where("p.category IS NOT NULL AND TRIM(p.category) != ''")
      .groupBy('TRIM(p.category)')
      .getRawMany();

    const countMap = new Map<string, number>();
    for (const r of countsRaw) {
      countMap.set((r.catName || '').toLowerCase(), Number(r.count) || 0);
    }

    const categories = await this.categoryRepository.find({ order: { createdAt: 'ASC' } });

    // Gán số lượng sản phẩm thực tế vào danh mục
    return categories.map(cat => ({
      ...cat,
      productCount: countMap.get(cat.name.trim().toLowerCase()) || 0,
    }));
  }

  async findOne(id: string): Promise<Category> {
    const category = await this.categoryRepository.findOneBy({ id });
    if (!category) {
      throw new NotFoundException(`Không tìm thấy danh mục với mã ${id}`);
    }
    const count = await this.productRepository.count({ where: { category: category.name } });
    category.productCount = count;
    return category;
  }

  async create(dto: Partial<Category>): Promise<Category> {
    if (!dto.name || !dto.name.trim()) {
      throw new BadRequestException('Tên danh mục không được để trống');
    }

    const name = dto.name.trim();
    const existing = await this.categoryRepository.findOneBy({ name });
    if (existing) {
      throw new ConflictException(`Danh mục "${name}" đã tồn tại trên hệ thống`);
    }

    const slug = dto.slug && dto.slug.trim() ? slugify(dto.slug) : slugify(name);
    const category = this.categoryRepository.create({
      ...dto,
      name,
      slug,
      isActive: dto.isActive !== undefined ? dto.isActive : true,
    });

    return this.categoryRepository.save(category);
  }

  async update(id: string, dto: Partial<Category>): Promise<Category> {
    const category = await this.findOne(id);
    const oldName = category.name;

    if (dto.name && dto.name.trim() && dto.name.trim() !== oldName) {
      const existing = await this.categoryRepository.findOneBy({ name: dto.name.trim() });
      if (existing && existing.id !== id) {
        throw new ConflictException(`Tên danh mục "${dto.name}" đã được sử dụng`);
      }
      category.name = dto.name.trim();
      if (!dto.slug) {
        category.slug = slugify(category.name);
      }
    }

    if (dto.slug !== undefined) category.slug = slugify(dto.slug);
    if (dto.description !== undefined) category.description = dto.description;
    if (dto.imageUrl !== undefined) category.imageUrl = dto.imageUrl;
    if (dto.isActive !== undefined) category.isActive = dto.isActive;

    const saved = await this.categoryRepository.save(category);

    // Nếu đổi tên danh mục, cập nhật đồng bộ các sản phẩm cũ sang tên mới
    if (dto.name && dto.name.trim() !== oldName) {
      await this.productRepository
        .createQueryBuilder()
        .update(Product)
        .set({ category: saved.name })
        .where('category = :oldName', { oldName })
        .execute();
    }

    return saved;
  }

  async remove(id: string): Promise<void> {
    const category = await this.findOne(id);
    const productCount = await this.productRepository.count({ where: { category: category.name } });
    if (productCount > 0) {
      throw new BadRequestException(`Không thể xóa danh mục "${category.name}" vì hiện đang có ${productCount} sản phẩm liên kết.`);
    }

    await this.categoryRepository.remove(category);
  }
}
