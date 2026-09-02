import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { OutboundOrder } from './outbound-order.entity';

@Entity('outbound_order_items')
export class OutboundOrderItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'outbound_order_id' })
  outboundOrderId: string;

  @ManyToOne(() => OutboundOrder, (order) => order.items)
  @JoinColumn({ name: 'outbound_order_id' })
  outboundOrder: OutboundOrder;

  @Column()
  sku: string;

  @Column({ name: 'product_name', nullable: true })
  productName: string;

  @Column({ name: 'requested_quantity', type: 'int', default: 0 })
  requestedQuantity: number;

  @Column({ name: 'picked_quantity', type: 'int', default: 0 })
  pickedQuantity: number;

  @Column({ type: 'varchar', default: 'PENDING' })
  status: string;

  @Column({ name: 'lot_id', nullable: true })
  lotId: string;

  @Column({ name: 'lot_code', nullable: true })
  lotCode: string;

  @Column({ name: 'slot_id', nullable: true })
  slotId: string;

  @Column({ name: 'expiry_date', type: 'timestamp', nullable: true })
  expiryDate: Date;

  @Column({ name: 'risk_score', type: 'float', nullable: true })
  riskScore: number;

  @Column({ name: 'priority_score', type: 'float', nullable: true })
  priorityScore: number;
}
