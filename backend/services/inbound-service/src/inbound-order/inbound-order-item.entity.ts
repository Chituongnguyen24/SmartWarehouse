import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { InboundOrder } from './inbound-order.entity';

@Entity('inbound_order_items')
export class InboundOrderItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => InboundOrder, order => order.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'inbound_order_id' })
  inboundOrder: InboundOrder;

  @Column({ name: 'sku' })
  sku: string;

  @Column({ name: 'product_name' })
  productName: string;

  @Column({ name: 'expected_quantity' })
  expectedQuantity: number;

  @Column({ nullable: true })
  unit: string;

  @Column({ name: 'unit_price', type: 'numeric', nullable: true })
  unitPrice: number;

  @Column({ name: 'received_quantity', default: 0 })
  receivedQuantity: number;

  @Column({ name: 'expiry_date', type: 'timestamp', nullable: true })
  expiryDate: Date;

  @Column({ default: 'PENDING' }) // PENDING, RECEIVED, STORED
  status: string;

  @Column({ name: 'lot_code', nullable: true })
  lotCode: string;

  @Column({ name: 'assigned_zone', nullable: true })
  assignedZone: string;

  @Column({ name: 'assigned_slot_id', nullable: true })
  assignedSlotId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
