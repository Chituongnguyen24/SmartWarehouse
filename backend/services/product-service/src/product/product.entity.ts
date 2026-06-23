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

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
