import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export enum StorageType {
  COLD = 'COLD',
  FROZEN = 'FROZEN',
  DRY = 'DRY',
}

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  sku: string;

  @Column()
  name: string;

  @Column()
  category: string;

  @Column({
    type: 'varchar',
    name: 'storage_type',
    default: StorageType.DRY,
  })
  storageType: StorageType;

  @Column({ type: 'float', name: 'min_temp', nullable: true })
  minTemp: number;

  @Column({ type: 'float', name: 'max_temp', nullable: true })
  maxTemp: number;

  @Column({ type: 'float', name: 'max_humidity', nullable: true })
  maxHumidity: number;

  @Column()
  unit: string;

  // --- E-commerce fields ---
  @Column({ type: 'float', default: 25000 })
  price: number;

  @Column({ name: 'image_url', type: 'text', nullable: true })
  imageUrl: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ nullable: true })
  origin: string;

  @Column({ nullable: true })
  preservation: string;

  @Column({ name: 'is_flash_sale', default: false })
  isFlashSale: boolean;

  @Column({ name: 'discount_percent', default: 0 })
  discountPercent: number;

  @Column({ type: 'float', default: 4.8 })
  rating: number;

  @Column({ name: 'sold_count', default: 0 })
  soldCount: number;

  @Column({ default: 100 })
  stock: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
