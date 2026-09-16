import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Shelf } from '../shelf/shelf.entity';

/**
 * StorageSlot Entity — Ô chứa hàng (vị trí lưu trữ cụ thể)
 * Trạng thái: EMPTY → OCCUPIED → FULL | MAINTENANCE
 */
@Entity('storage_slots')
export class StorageSlot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  code: string; // e.g., "CL-A1-01", "FR-B2-05"

  @Column({ name: 'shelf_id' })
  shelfId: string;

  @ManyToOne(() => Shelf, (shelf) => shelf.slots)
  @JoinColumn({ name: 'shelf_id' })
  shelf: Shelf;

  @Column({ type: 'varchar', default: 'EMPTY' })
  status: string; // EMPTY | OCCUPIED | FULL | MAINTENANCE

  @Column({ name: 'lot_id', nullable: true })
  lotId: string; // Reference to lot in inventory service

  @Column({ name: 'lot_code', nullable: true })
  lotCode: string;

  @Column({ name: 'product_sku', nullable: true })
  productSku: string;

  @Column({ name: 'max_weight_kg', type: 'float', default: 500 })
  maxWeightKg: number;

  @Column({ name: 'current_weight_kg', type: 'float', default: 0 })
  currentWeightKg: number;

  @Column({ type: 'int', default: 1 })
  row: number; // Hàng

  @Column({ type: 'int', default: 1 })
  position: number; // Vị trí trong hàng

  @Column({ name: 'is_priority', default: false })
  isPriority: boolean; // Vị trí dễ lấy - ưu tiên cho hàng HSD ngắn

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
