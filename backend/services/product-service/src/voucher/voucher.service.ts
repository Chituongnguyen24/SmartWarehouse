import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Voucher, DiscountType, ApplicableScope } from './voucher.entity';

export interface CartItemCheck {
  productId?: string;
  id?: string;
  sku?: string;
  name?: string;
  category?: string;
  price: number;
  quantity: number;
}

@Injectable()
export class VoucherService {
  constructor(
    @InjectRepository(Voucher)
    private readonly voucherRepo: Repository<Voucher>,
  ) {}

  async findAll(): Promise<Voucher[]> {
    return this.voucherRepo.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findActive(): Promise<Voucher[]> {
    const now = new Date();
    return this.voucherRepo.find({
      where: { isActive: true },
      order: { discountValue: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Voucher> {
    const voucher = await this.voucherRepo.findOneBy({ id });
    if (!voucher) throw new NotFoundException(`Voucher #${id} không tồn tại`);
    return voucher;
  }

  async findByCode(code: string): Promise<Voucher | null> {
    return this.voucherRepo.findOneBy({ code: code.trim().toUpperCase() });
  }

  async validateCode(
    code: string,
    orderAmount: number = 0,
    items: CartItemCheck[] = [],
    customerId?: string,
  ): Promise<{ valid: boolean; discountAmount: number; voucher: Voucher; message?: string }> {
    const voucher = await this.findByCode(code);
    if (!voucher) {
      throw new BadRequestException(`Mã giảm giá "${code}" không tồn tại hoặc đã hết hạn.`);
    }

    if (!voucher.isActive) {
      throw new BadRequestException(`Mã giảm giá "${voucher.code}" hiện đang tạm ngừng áp dụng.`);
    }

    if (voucher.usageLimit > 0 && voucher.usedCount >= voucher.usageLimit) {
      throw new BadRequestException(`Mã giảm giá "${voucher.code}" đã hết lượt sử dụng.`);
    }

    const now = new Date();
    if (voucher.startDate && new Date(voucher.startDate) > now) {
      throw new BadRequestException(`Mã giảm giá "${voucher.code}" chưa đến thời gian áp dụng (Bắt đầu từ ${new Date(voucher.startDate).toLocaleDateString('vi-VN')}).`);
    }

    if (voucher.endDate && new Date(voucher.endDate) < now) {
      throw new BadRequestException(`Mã giảm giá "${voucher.code}" đã hết hạn sử dụng (Hết hạn ngày ${new Date(voucher.endDate).toLocaleDateString('vi-VN')}).`);
    }

    if (orderAmount < voucher.minOrderValue) {
      throw new BadRequestException(
        `Đơn hàng cần tối thiểu ${voucher.minOrderValue.toLocaleString('vi-VN')}đ để sử dụng mã "${voucher.code}".`
      );
    }

    // Kiểm tra phạm vi áp dụng (Target Scope: ALL | CATEGORY | PRODUCT)
    let eligibleAmount = orderAmount;
    if (voucher.applicableScope === ApplicableScope.CATEGORY && voucher.applicableCategories && voucher.applicableCategories.length > 0) {
      if (items && items.length > 0) {
        const matchingItems = items.filter(item => {
          const itemCat = (item.category || '').toLowerCase().trim();
          return voucher.applicableCategories.some(cat => {
            const targetCat = cat.toLowerCase().trim();
            return targetCat === itemCat || itemCat.includes(targetCat) || targetCat.includes(itemCat);
          });
        });

        if (matchingItems.length === 0) {
          throw new BadRequestException(
            `Mã "${voucher.code}" chỉ áp dụng cho sản phẩm thuộc danh mục: ${voucher.applicableCategories.join(', ')}.`
          );
        }
        eligibleAmount = matchingItems.reduce((sum, item) => sum + (Number(item.price || 0) * Number(item.quantity || 1)), 0);
      }
    } else if (voucher.applicableScope === ApplicableScope.PRODUCT && voucher.applicableProductIds && voucher.applicableProductIds.length > 0) {
      if (items && items.length > 0) {
        const matchingItems = items.filter(item => {
          const candidates = [item.productId, item.id, item.sku, item.name].filter(Boolean).map(x => String(x).toLowerCase().trim());
          return voucher.applicableProductIds.some(target => {
            const t = String(target).toLowerCase().trim();
            return candidates.includes(t) || candidates.some(c => c.includes(t));
          });
        });

        if (matchingItems.length === 0) {
          throw new BadRequestException(
            `Mã "${voucher.code}" chỉ áp dụng khi giỏ hàng có các sản phẩm khuyến mãi chỉ định (${voucher.applicableProductIds.length} mặt hàng).`
          );
        }
        eligibleAmount = matchingItems.reduce((sum, item) => sum + (Number(item.price || 0) * Number(item.quantity || 1)), 0);
      }
    }

    let calculatedDiscount = 0;
    if (voucher.discountType === DiscountType.PERCENT) {
      calculatedDiscount = (eligibleAmount * voucher.discountValue) / 100;
      if (voucher.maxDiscount && calculatedDiscount > voucher.maxDiscount) {
        calculatedDiscount = voucher.maxDiscount;
      }
    } else {
      calculatedDiscount = voucher.discountValue;
    }

    calculatedDiscount = Math.min(calculatedDiscount, orderAmount);

    return {
      valid: true,
      discountAmount: Math.round(calculatedDiscount),
      voucher,
      message: `Áp dụng thành công mã "${voucher.code}"! Giảm ${calculatedDiscount.toLocaleString('vi-VN')}đ.`,
    };
  }

  async create(dto: Partial<Voucher>): Promise<Voucher> {
    const code = (dto.code || '').trim().toUpperCase();
    const existing = await this.findByCode(code);
    if (existing) {
      throw new BadRequestException(`Mã voucher "${code}" đã tồn tại trên hệ thống.`);
    }

    const newVoucher = this.voucherRepo.create({
      ...dto,
      code,
      discountValue: Number(dto.discountValue || 20000),
      minOrderValue: Number(dto.minOrderValue || 0),
      maxDiscount: dto.maxDiscount ? Number(dto.maxDiscount) : null,
      usageLimit: Number(dto.usageLimit || 1000),
      limitPerUser: Number(dto.limitPerUser || 1),
      applicableScope: dto.applicableScope || ApplicableScope.ALL,
      applicableCategories: Array.isArray(dto.applicableCategories) ? dto.applicableCategories : [],
      applicableProductIds: Array.isArray(dto.applicableProductIds) ? dto.applicableProductIds : [],
    });

    return this.voucherRepo.save(newVoucher);
  }

  async update(id: string, dto: Partial<Voucher>): Promise<Voucher> {
    const voucher = await this.findOne(id);
    if (dto.code) {
      dto.code = dto.code.trim().toUpperCase();
    }
    if (dto.discountValue !== undefined) dto.discountValue = Number(dto.discountValue);
    if (dto.minOrderValue !== undefined) dto.minOrderValue = Number(dto.minOrderValue);
    if (dto.maxDiscount !== undefined) dto.maxDiscount = dto.maxDiscount ? Number(dto.maxDiscount) : null;
    if (dto.usageLimit !== undefined) dto.usageLimit = Number(dto.usageLimit);
    if (dto.limitPerUser !== undefined) dto.limitPerUser = Number(dto.limitPerUser);

    Object.assign(voucher, dto);
    return this.voucherRepo.save(voucher);
  }

  async remove(id: string): Promise<void> {
    const voucher = await this.findOne(id);
    await this.voucherRepo.remove(voucher);
  }

  async incrementUsage(code: string): Promise<void> {
    const voucher = await this.findByCode(code);
    if (voucher) {
      voucher.usedCount += 1;
      await this.voucherRepo.save(voucher);
    }
  }
}

