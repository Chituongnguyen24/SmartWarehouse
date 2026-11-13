import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ChatSession } from './chat-session.entity';

export type ChatSenderType = 'CUSTOMER' | 'AI_BOT' | 'STAFF' | 'SYSTEM';

@Entity('chat_messages')
export class ChatMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'session_id', type: 'uuid' })
  sessionId: string;

  @Column({ name: 'sender', type: 'varchar' })
  sender: ChatSenderType;

  @Column({ name: 'sender_name', type: 'varchar', default: 'Trợ lý AI' })
  senderName: string;

  @Column({ name: 'text', type: 'text' })
  text: string;

  @Column({ name: 'image_url', type: 'text', nullable: true })
  imageUrl?: string;

  @Column({ name: 'product_card', type: 'jsonb', nullable: true })
  productCard?: {
    id?: string;
    sku: string;
    name: string;
    price: number;
    originalPrice?: number;
    unit?: string;
    imageUrl?: string;
    category?: string;
    stock?: number;
  };

  @Column({ name: 'quick_options', type: 'jsonb', nullable: true })
  quickOptions?: string[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => ChatSession, (session) => session.messages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'session_id' })
  session: ChatSession;
}

