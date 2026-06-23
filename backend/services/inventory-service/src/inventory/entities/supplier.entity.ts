import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('suppliers')
export class Supplier {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  contact: string;

  @Column()
  address: string;
}
