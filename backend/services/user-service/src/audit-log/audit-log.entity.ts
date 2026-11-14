import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export enum AuditSeverity {
  INFO = 'INFO',
  WARN = 'WARN',
  CRITICAL = 'CRITICAL',
}

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ name: 'created_at' })
  timestamp: Date;

  @Column({ name: 'actor_id', nullable: true })
  actorId: string;

  @Column({ name: 'actor_name' })
  actorName: string;

  @Column({ name: 'actor_role', nullable: true })
  actorRole: string;

  @Column()
  action: string;

  @Column({ name: 'action_code', nullable: true })
  actionCode: string;

  @Column({ nullable: true })
  target: string;

  @Column({ name: 'target_id', nullable: true })
  targetId: string;

  @Column({ name: 'client_app', default: 'WEB_DASHBOARD' })
  clientApp: string;

  @Column({ name: 'service_name', nullable: true })
  serviceName: string;

  @Column({ name: 'ip_address', nullable: true })
  ipAddress: string;

  @Column({
    type: 'varchar',
    default: AuditSeverity.INFO,
  })
  severity: AuditSeverity;

  @Column({ type: 'text', nullable: true })
  details: string;

  @Column({ name: 'payload_before', type: 'jsonb', nullable: true })
  payloadBefore: any;

  @Column({ name: 'payload_after', type: 'jsonb', nullable: true })
  payloadAfter: any;
}
