import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Zone } from '../zone/zone.entity';
import { StorageSlot } from '../storage-slot/storage-slot.entity';

/**
 * Shelf Entity — Kệ hàng trong zone
 */
@Entity('shelves')
export class Shelf {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  code: string; // e.g., "CL-A", "CL-B", "FR-A", "DR-A"

  @Column()
  name: string; // "Kệ A - Kho lạnh"

  @Column({ name: 'zone_id' })
  zoneId: string;

  @ManyToOne(() => Zone, (zone) => zone.shelves)
  @JoinColumn({ name: 'zone_id' })
  zone: Zone;

  @Column({ name: 'max_slots', type: 'int' })
  maxSlots: number;

  @Column({ name: 'current_slots_used', type: 'int', default: 0 })
  currentSlotsUsed: number;

  @Column({ type: 'int', default: 1 })
  floor: number; // Tầng kệ

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @OneToMany(() => StorageSlot, (slot) => slot.shelf)
  slots: StorageSlot[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
