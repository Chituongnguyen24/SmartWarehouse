import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { InboundOrderItem } from './inbound-order-item.entity';

@Entity('inbound_orders')
export class InboundOrder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'order_code', unique: true })
  orderCode: string;

  @Column({ name: 'supplier_id' })
  supplierId: string;

  @Column({ name: 'supplier_name' })
  supplierName: string;

  @Column({ name: 'invoice_number', nullable: true })
  invoiceNumber: string;

  @Column({ name: 'deliverer_name', nullable: true })
  delivererName: string;

  @Column({ name: 'total_amount', type: 'numeric', default: 0 })
  totalAmount: number;

  @Column({ default: 'PENDING' }) // PENDING, RECEIVING, QUALITY_CHECK, STORING, COMPLETED
  status: string;

  @Column({ name: 'expected_date', type: 'timestamp', nullable: true })
  expectedDate: Date;

  @Column({ name: 'received_date', type: 'timestamp', nullable: true })
  receivedDate: Date;

  @Column({ name: 'total_items', default: 0 })
  totalItems: number;

  @Column({ name: 'total_quantity', default: 0 })
  totalQuantity: number;

  @Column({ name: 'quality_check_passed', default: false })
  qualityCheckPassed: boolean;

  @Column({ name: 'package_condition', nullable: true }) // PACKED_OK, NEEDS_PACKING
  packageCondition: string;

  @Column({ name: 'destination_station', nullable: true, default: 'STORAGE_SHELF' }) // STORAGE_SHELF, PACKING_STATION
  destinationStation: string;

  @Column({ name: 'packing_note', nullable: true })
  packingNote: string;

  @Column({ name: 'rejection_reason', nullable: true })
  rejectionReason: string;

  @Column({ name: 'rejection_liability', nullable: true })
  rejectionLiability: string; // CUSTOMER, DRIVER, WAREHOUSE, SUPPLIER

  @Column({ name: 'rejection_action', nullable: true })
  rejectionAction: string; // RETURN_TO_SUPPLIER_AT_DOCK, QUARANTINE_FOR_RTV, DISPOSAL

  @Column({ name: 'measured_temperature', type: 'numeric', nullable: true })
  measuredTemperature: number;

  @Column({ name: 'evidence_photo_url', nullable: true })
  evidencePhotoUrl: string;

  @Column({ name: 'disposal_order_code', nullable: true })
  disposalOrderCode: string;

  @Column({ name: 'warehouse_id', nullable: true })
  warehouseId: string;

  @Column({ name: 'warehouse_code', nullable: true })
  warehouseCode: string;

  @OneToMany(() => InboundOrderItem, item => item.inboundOrder, { cascade: true, eager: true })
  items: InboundOrderItem[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
