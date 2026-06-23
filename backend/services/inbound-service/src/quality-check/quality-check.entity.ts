import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

/**
 * QualityCheck Entity — Kiểm tra chất lượng lô hàng nhập kho
 */
@Entity('quality_checks')
export class QualityCheck {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'inbound_order_id' })
  inboundOrderId: string;

  @Column({ name: 'item_id', nullable: true })
  itemId: string;

  @Column()
  sku: string;

  @Column({ name: 'product_name' })
  productName: string;

  @Column({ type: 'varchar', default: 'PENDING' })
  result: string; // PASSED | FAILED | PARTIAL

  // Kiểm tra nhiệt độ khi nhận hàng
  @Column({ name: 'received_temp', type: 'float', nullable: true })
  receivedTemp: number;

  @Column({ name: 'temp_acceptable', default: true })
  tempAcceptable: boolean;

  // Kiểm tra ngoại quan
  @Column({ name: 'visual_check_passed', default: true })
  visualCheckPassed: boolean;

  // Kiểm tra bao bì
  @Column({ name: 'packaging_intact', default: true })
  packagingIntact: boolean;

  // Kiểm tra HSD
  @Column({ name: 'expiry_valid', default: true })
  expiryValid: boolean;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ name: 'checked_by' })
  checkedBy: string;

  @CreateDateColumn({ name: 'checked_at' })
  checkedAt: Date;
}
