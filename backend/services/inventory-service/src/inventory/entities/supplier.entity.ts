import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum SupplierStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export enum SupplierCategory {
  RAU_CU_QUA = 'RAU_CU_QUA',
  THIT_CA_TUOI = 'THIT_CA_TUOI',
  DO_DONG_LANH = 'DO_DONG_LANH',
  SUA_BO_TRUNG = 'SUA_BO_TRUNG',
  KHO_GIA_VI = 'KHO_GIA_VI',
  DONG_GOI_BAO_BI = 'DONG_GOI_BAO_BI',
}

@Entity('suppliers')
export class Supplier {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, nullable: true })
  code: string;

  @Column()
  name: string;

  @Column({ name: 'short_name', nullable: true })
  shortName: string;

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

  @Column({
    type: 'varchar',
    default: SupplierCategory.RAU_CU_QUA,
  })
  category: string;

  @Column({ name: 'payment_terms', nullable: true, default: 'Công nợ 30 ngày (Net 30)' })
  paymentTerms: string;

  @Column({ type: 'numeric', precision: 3, scale: 1, default: 4.8 })
  rating: number;

  @Column({ name: 'lead_time_days', type: 'int', default: 2 })
  leadTimeDays: number;

  @Column({ nullable: true, default: 'HACCP, ISO 22000' })
  certifications: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
