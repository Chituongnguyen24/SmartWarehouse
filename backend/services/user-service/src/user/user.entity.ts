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

  @Column({ unique: true })
  email: string;

  @Column({ name: 'password_hash' })
  passwordHash: string;

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

  @Column({ nullable: true })
  dob: string;

  @OneToMany(() => Address, (address) => address.user, { cascade: true })
  addresses: Address[];

  @Column({ name: 'locked_at', type: 'timestamp', nullable: true })
  lockedAt: Date;

  @Column({ name: 'firebase_uid', nullable: true })
  firebaseUid: string;

  @Column({ nullable: true, default: 'Thành viên mới' })
  tier: string;

  @Column({ type: 'int', default: 0 })
  points: number;

  @Column({ name: 'license_plate', nullable: true })
  licensePlate: string;

  @Column({ name: 'vehicle_type', nullable: true })
  vehicleType: string;

  @Column({ name: 'current_temp', type: 'float', nullable: true, default: 3.2 })
  currentTemp: number;

  @Column({ name: 'target_temp_min', type: 'float', nullable: true, default: 0.0 })
  targetTempMin: number;

  @Column({ name: 'target_temp_max', type: 'float', nullable: true, default: 4.0 })
  targetTempMax: number;

  @Column({ name: 'total_earnings_today', type: 'int', default: 0 })
  totalEarningsToday: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
