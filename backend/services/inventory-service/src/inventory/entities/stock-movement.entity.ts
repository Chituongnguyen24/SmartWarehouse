import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export enum MovementType {
  IN = 'IN',
  OUT = 'OUT',
}

@Entity('stock_movements')
export class StockMovement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'lot_id' })
  lotId: string;

  @Column({
    type: 'varchar',
    name: 'movement_type',
  })
  movementType: MovementType;

  @Column({ type: 'int' })
  quantity: number;

  @Column()
  reason: string; // E.g., 'IMPORT', 'SALES_EXPORT', 'SPOILAGE_DISCARD'

  @Column({ name: 'performed_by' })
  performedBy: string; // User ID

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
