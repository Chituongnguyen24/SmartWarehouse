import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { ChatMessage } from './chat-message.entity';

export type ChatSessionStatus = 'AI_ACTIVE' | 'WAITING_FOR_STAFF' | 'STAFF_CONNECTED' | 'RESOLVED';

@Entity('chat_sessions')
export class ChatSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'customer_id', type: 'varchar', nullable: true })
  customerId?: string;

  @Column({ name: 'customer_name', type: 'varchar', default: 'Khách hàng Trực tuyến' })
  customerName: string;

  @Column({ name: 'customer_phone', type: 'varchar', default: '0909000111' })
  customerPhone: string;

  @Column({
    name: 'status',
    type: 'varchar',
    default: 'AI_ACTIVE',
  })
  status: ChatSessionStatus;

  @Column({ name: 'assigned_staff_id', type: 'varchar', nullable: true })
  assignedStaffId?: string;

  @Column({ name: 'assigned_staff_name', type: 'varchar', nullable: true })
  assignedStaffName?: string;

  @Column({ name: 'ai_summary', type: 'text', nullable: true })
  aiSummary?: string;

  @Column({ name: 'unread_count', type: 'int', default: 0 })
  unreadCount: number;

  @Column({ name: 'last_message', type: 'text', nullable: true })
  lastMessage?: string;

  @Column({ name: 'last_message_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  lastMessageAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => ChatMessage, (msg) => msg.session)
  messages: ChatMessage[];
}
