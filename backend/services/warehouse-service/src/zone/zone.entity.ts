import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { Shelf } from '../shelf/shelf.entity';
import { Warehouse } from '../warehouse/warehouse.entity';

/**
 * Zone Entity — Khu vực kho (Kho lạnh, Kho đông lạnh, Kho khô)
 */
@Entity('zones')
export class Zone {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'warehouse_id', nullable: true })
  warehouseId: string;

  @ManyToOne(() => Warehouse, (warehouse) => warehouse.zones, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'warehouse_id' })
  warehouse: Warehouse;

  @Column({ unique: true })
  code: string; // COLD, FROZEN, DRY

  @Column()
  name: string; // "Kho lạnh", "Kho đông lạnh", "Kho khô"

  @Column({ type: 'varchar' })
  type: string; // COLD | FROZEN | DRY

  @Column({ type: 'text', nullable: true })
  description: string;

  // Temperature range (°C)
  @Column({ name: 'min_temp', type: 'float' })
  minTemp: number;

  @Column({ name: 'max_temp', type: 'float' })
  maxTemp: number;

  // Humidity range (%)
  @Column({ name: 'min_humidity', type: 'float', default: 30 })
  minHumidity: number;

  @Column({ name: 'max_humidity', type: 'float' })
  maxHumidity: number;

  // Capacity
  @Column({ name: 'max_capacity', type: 'int' })
  maxCapacity: number;

  @Column({ name: 'current_occupancy', type: 'int', default: 0 })
  currentOccupancy: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @OneToMany(() => Shelf, (shelf) => shelf.zone)
  shelves: Shelf[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
