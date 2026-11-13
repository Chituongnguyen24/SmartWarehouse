import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatSession } from './entities/chat-session.entity';
import { ChatMessage } from './entities/chat-message.entity';
import { Order } from '../order/entities/order.entity';
import { ChatService } from './chat.service';
import { GeminiChatService } from './gemini-chat.service';
import { VectorStoreService } from './vector-store.service';
import { ChatController } from './chat.controller';
import { S3StorageService } from '../storage/s3-storage.service';

@Module({
  imports: [TypeOrmModule.forFeature([ChatSession, ChatMessage, Order])],
  controllers: [ChatController],
  providers: [ChatService, GeminiChatService, VectorStoreService, S3StorageService],
  exports: [ChatService, GeminiChatService, VectorStoreService, S3StorageService, TypeOrmModule],
})
export class ChatModule {}
