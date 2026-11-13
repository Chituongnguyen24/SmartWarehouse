import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('cod_settlements')
export class CodSettlement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  settlementCode: string; // e.g. SETTLE-20261109-001

  @Column()
  driverId: string; // e.g. NV-TK01

  @Column({ nullable: true })
  driverName: string;

  @Column({ nullable: true })
  warehouseCode: string; // e.g. WH-006

  @Column({ type: 'date' })
  shiftDate: string; // e.g. 2026-11-09

  @Column({ type: 'int', default: 0 })
  totalOrders: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalCodAmount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  settledAmount: number;

  @Column({ default: 'VIETQR_TRANSFER' }) // VIETQR_TRANSFER or CASH_TO_TREASURER
  paymentMethod: string;

  @Column({ default: 'CONFIRMED' }) // CONFIRMED or PENDING_CONFIRMATION
  status: string;

  @Column({ nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;
}

