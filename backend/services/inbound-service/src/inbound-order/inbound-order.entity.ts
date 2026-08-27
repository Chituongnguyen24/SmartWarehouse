import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { InboundOrderItem } from './inbound-order-item.entity';

/**
 * InboundOrder Entity — Đơn nhập kho từ nhà cung cấp
 * Workflow: PENDING → RECEIVING → QUALITY_CHECK → STORING → COMPLETED | REJECTED
 */
@Entity('inbound_orders')
export class InboundOrder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'order_code', unique: true })
  orderCode: string; // e.g., "IB-20260623-001"

  @Column({ name: 'supplier_id' })
  supplierId: string;

  @Column({ name: 'supplier_name' })
  supplierName: string;

  @Column({ type: 'varchar', default: 'PENDING' })
  status: string; // PENDING | RECEIVING | QUALITY_CHECK | STORING | COMPLETED | REJECTED

  @Column({ name: 'expected_date', type: 'timestamp', nullable: true })
  expectedDate: Date;

  @Column({ name: 'received_date', type: 'timestamp', nullable: true })
  receivedDate: Date;

  @Column({ name: 'total_items', type: 'int', default: 0 })
  totalItems: number;

  @Column({ name: 'total_quantity', type: 'int', default: 0 })
  totalQuantity: number;

  @Column({ name: 'quality_check_passed', default: false })
  qualityCheckPassed: boolean;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ name: 'created_by' })
  createdBy: string;

  @Column({ name: 'transport_id', nullable: true })
  transportId: string; // Reference to transport service

  @OneToMany(() => InboundOrderItem, (item) => item.inboundOrder)
  items: InboundOrderItem[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
