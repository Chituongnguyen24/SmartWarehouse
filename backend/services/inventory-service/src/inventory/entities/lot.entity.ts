import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export enum LotStatus {
  NORMAL = 'NORMAL',
  AT_RISK = 'AT_RISK',
  EXPIRED = 'EXPIRED',
}

@Entity('lots')
@Index(['warehouseCode', 'expiryDate'])
@Index(['productId'])
export class Lot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'lot_code', unique: true })
  lotCode: string;

  @Column({ name: 'product_id' })
  productId: string;

  @Column({ name: 'supplier_id' })
  supplierId: string;

  @Column({ name: 'import_date', type: 'timestamp' })
  importDate: Date;

  @Column({ name: 'expiry_date', type: 'timestamp' })
  expiryDate: Date;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ name: 'remaining_qty', type: 'int' })
  remainingQty: number;

  @Column()
  zone: string; // COLD, FROZEN, DRY

  @Column()
  location: string; // E.g., shelf-A1, shelf-B2

  @Column({ name: 'warehouse_id', nullable: true })
  warehouseId: string;

  @Column({ name: 'warehouse_code', nullable: true })
  warehouseCode: string;

  @Column({ name: 'risk_score', type: 'float', default: 0 })
  riskScore: number; // 0-100

  @Column({
    type: 'varchar',
    default: LotStatus.NORMAL,
  })
  status: LotStatus;

  @Column({ name: 'created_by' })
  createdBy: string; // User ID

  @Column({ name: 'last_audited_at', type: 'timestamp', nullable: true })
  lastAuditedAt?: Date;

  @Column({ name: 'last_audited_by', nullable: true })
  lastAuditedBy?: string;

  @Column({ name: 'last_audit_diff', type: 'int', nullable: true })
  lastAuditDiff?: number;

  @Column({ name: 'last_audit_reason', nullable: true })
  lastAuditReason?: string;

  @Column({ name: 'last_audit_actual_qty', type: 'int', nullable: true })
  lastAuditActualQty?: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
