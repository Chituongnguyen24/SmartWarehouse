import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export enum SupplierStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

@Entity('suppliers')
export class Supplier {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  contact: string;

  @Column()
  address: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  email: string;

  @Column({ name: 'tax_code', nullable: true })
  taxCode: string;

  @Column({
    type: 'varchar',
    default: SupplierStatus.ACTIVE,
  })
  status: SupplierStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
