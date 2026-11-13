import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export enum DiscountType {
  FIXED = 'FIXED',
  PERCENT = 'PERCENT',
  FREESHIP = 'FREESHIP',
}

export enum ApplicableScope {
  ALL = 'ALL',
  CATEGORY = 'CATEGORY',
  PRODUCT = 'PRODUCT',
}

@Entity('vouchers')
export class Voucher {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  code: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'discount_type', default: DiscountType.FIXED })
  discountType: DiscountType;

  @Column({ name: 'discount_value', type: 'float', default: 20000 })
  discountValue: number;

  @Column({ name: 'min_order_value', type: 'float', default: 0 })
  minOrderValue: number;

  @Column({ name: 'max_discount', type: 'float', nullable: true })
  maxDiscount: number;

  @Column({ name: 'usage_limit', default: 1000 })
  usageLimit: number;

  @Column({ name: 'used_count', default: 0 })
  usedCount: number;

  @Column({ name: 'limit_per_user', type: 'int', default: 1 })
  limitPerUser: number;

  @Column({ name: 'applicable_scope', default: ApplicableScope.ALL })
  applicableScope: ApplicableScope;

  @Column({ name: 'applicable_categories', type: 'jsonb', default: () => "'[]'" })
  applicableCategories: string[];

  @Column({ name: 'applicable_product_ids', type: 'jsonb', default: () => "'[]'" })
  applicableProductIds: string[];

  @Column({ name: 'start_date', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  startDate: Date;

  @Column({ name: 'end_date', type: 'timestamp', nullable: true })
  endDate: Date;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

