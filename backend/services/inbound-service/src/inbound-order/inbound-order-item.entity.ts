import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { InboundOrder } from './inbound-order.entity';

/**
 * InboundOrderItem — Từng dòng sản phẩm trong đơn nhập kho
 */
@Entity('inbound_order_items')
export class InboundOrderItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'inbound_order_id' })
  inboundOrderId: string;

  @ManyToOne(() => InboundOrder, (order) => order.items)
  @JoinColumn({ name: 'inbound_order_id' })
  inboundOrder: InboundOrder;

  @Column()
  sku: string;

  @Column({ name: 'product_name' })
  productName: string;

  @Column({ name: 'expected_quantity', type: 'int' })
  expectedQuantity: number;

  @Column({ name: 'received_quantity', type: 'int', default: 0 })
  receivedQuantity: number;

  @Column({ name: 'production_date', type: 'timestamp', nullable: true })
  productionDate: Date;

  @Column({ name: 'expiry_date', type: 'timestamp' })
  expiryDate: Date;

  @Column({ name: 'lot_code', nullable: true })
  lotCode: string; // Assigned after batch creation

  @Column({ name: 'assigned_zone', nullable: true })
  assignedZone: string; // COLD/FROZEN/DRY

  @Column({ name: 'assigned_slot_id', nullable: true })
  assignedSlotId: string;

  @Column({ type: 'varchar', default: 'PENDING' })
  status: string; // PENDING | CHECKED | STORED | REJECTED

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
