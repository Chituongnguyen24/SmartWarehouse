import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import { Address } from './address.entity';

export enum UserRole {
  ADMIN = 'ADMIN',
  WAREHOUSE_MANAGER = 'WAREHOUSE_MANAGER',
  WAREHOUSE_STAFF = 'WAREHOUSE_STAFF',
  SALES_STAFF = 'SALES_STAFF',
  DRIVER = 'DRIVER',
  CUSTOMER = 'CUSTOMER',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true, nullable: true })
  email: string;

  @Column({ name: 'password_hash', nullable: true })
  passwordHash: string;

  @Column({ name: 'firebase_uid', unique: true, nullable: true })
  firebaseUid: string;

  @Column({ default: 0 })
  points: number;

  @Column({ default: 'Thành viên mới' })
  tier: string;

  @Column({
    type: 'varchar',
    default: UserRole.WAREHOUSE_STAFF,
  })
  role: UserRole;

  @Column({ nullable: true })
  phone: string;

  @Column({ name: 'warehouse_code', nullable: true })
  warehouseCode: string;

  @Column({ nullable: true })
  code: string; // NV-GV01

  @Column({ name: 'assigned_zone', nullable: true })
  assignedZone: string; // Khu Mát A, Khu Đông B, Khu Khô C, Toàn kho...

  @Column({ default: 'HANH_CHINH' })
  shift: string; // CA_SANG, CA_CHIEU, CA_DEM, HANH_CHINH

  @Column({ default: 'ACTIVE' })
  status: string; // ACTIVE, INACTIVE, ON_LEAVE

  @Column({ nullable: true })
  department: string; // Vận hành kho, Vận chuyển (Fleet), Quản trị kho...

  @Column({ name: 'tasks_completed', default: 0 })
  tasksCompleted: number;

  @Column({ type: 'float', default: 5.0 })
  rating: number;

  @Column({ nullable: true })
  gender: string;

  @Column({ type: 'date', nullable: true })
  dob: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @OneToMany(() => Address, address => address.user)
  addresses: Address[];
}
