import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { OutboundOrderItem } from './outbound-order-item.entity';

/**
 * OutboundOrder Entity — Đơn xuất kho
 * Workflow: PENDING → PICKING → PACKED → SHIPPED → CONFIRMED | CANCELLED
 */
@Entity('outbound_orders')
export class OutboundOrder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'order_code', unique: true })
  orderCode: string; // e.g., "OB-20260623-001"

  @Column({ type: 'varchar', default: 'PENDING' })
  status: string; // PENDING | PICKING | PACKED | SHIPPED | CONFIRMED | CANCELLED

  @Column({ name: 'requested_by' })
  requestedBy: string; // User ID of sales staff

  @Column({ name: 'requester_name', nullable: true })
  requesterName: string;

  @Column({ type: 'text', nullable: true })
  destination: string; // Quầy bán / chi nhánh / khách hàng

  @Column({ name: 'total_items', type: 'int', default: 0 })
  totalItems: number;

  @Column({ name: 'total_quantity', type: 'int', default: 0 })
  totalQuantity: number;

  @Column({ name: 'warehouse_id', nullable: true })
  warehouseId: string;

  @Column({ name: 'warehouse_code', nullable: true })
  warehouseCode: string;

  @Column({ type: 'float', nullable: true })
  latitude: number;

  @Column({ type: 'float', nullable: true })
  longitude: number;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ name: 'confirmed_by', nullable: true })
  confirmedBy: string;

  @Column({ name: 'confirmed_at', type: 'timestamp', nullable: true })
  confirmedAt: Date;

  @OneToMany(() => OutboundOrderItem, (item) => item.outboundOrder)
  items: OutboundOrderItem[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
