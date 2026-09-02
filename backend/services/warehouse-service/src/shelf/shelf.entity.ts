import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Zone } from '../zone/zone.entity';

@Entity('shelves')
export class Shelf {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  code: string;

  @Column()
  name: string;

  @Column({ name: 'max_slots', type: 'int', default: 20 })
  maxSlots: number;

  @Column({ type: 'int', default: 1 })
  floor: number;

  @Column({ name: 'current_slots_used', type: 'int', default: 0 })
  currentSlotsUsed: number;

  @Column({ name: 'zone_id' })
  zoneId: string;

  @ManyToOne(() => Zone, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'zone_id' })
  zone: Zone;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
