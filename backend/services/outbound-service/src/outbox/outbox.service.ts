import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { OutboxEvent, OutboxStatus } from './outbox.entity';
import * as amqp from 'amqp-connection-manager';
import Redis from 'ioredis';

@Injectable()
export class OutboxService implements OnModuleInit, OnModuleDestroy {
  private rmqConnection: any;
  private rmqChannel: any;
  private redisClient: Redis;
  private workerInterval: NodeJS.Timeout | null = null;
  private isProcessing = false;

  constructor(
    @InjectRepository(OutboxEvent)
    private outboxRepository: Repository<OutboxEvent>,
  ) {
    this.redisClient = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: Number(process.env.REDIS_PORT) || 6379,
      maxRetriesPerRequest: null,
      enableOfflineQueue: false,
      retryStrategy: (times) => Math.min(times * 100, 3000),
    });

    this.redisClient.on('error', (err) => {
      console.warn(`[OutboxService] Redis warning: ${err.message}`);
    });
  }

  onModuleInit() {
    const rabbitUrl = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
    this.rmqConnection = amqp.connect([rabbitUrl]);
    this.rmqChannel = this.rmqConnection.createChannel({
      json: true,
      setup: (channel) => {
        return channel.assertExchange('outbound.events', 'topic', { durable: true });
      },
    });

    // Start background Outbox publisher polling loop every 2.5 seconds
    this.workerInterval = setInterval(() => {
      this.publishPendingEvents().catch((err) => {
        console.warn('[OutboxService] Outbox worker execution warning:', err.message);
      });
    }, 2500);

    console.log('[OutboxService] 📦 Transactional Outbox Publisher initialized.');
  }

  onModuleDestroy() {
    if (this.workerInterval) {
      clearInterval(this.workerInterval);
    }
    if (this.rmqConnection) {
      this.rmqConnection.close();
    }
  }

  /**
   * Save an Outbox event within an existing database transaction
   */
  async recordEvent(
    aggregateType: string,
    aggregateId: string,
    eventType: string,
    payload: any,
    manager?: EntityManager,
  ): Promise<OutboxEvent> {
    const repo = manager ? manager.getRepository(OutboxEvent) : this.outboxRepository;
    const event = repo.create({
      aggregateType,
      aggregateId,
      eventType,
      payload,
      status: OutboxStatus.PENDING,
      retryCount: 0,
    });
    return repo.save(event);
  }

  /**
   * Poll and reliably dispatch pending events to RabbitMQ and Redis
   */
  async publishPendingEvents(): Promise<number> {
    if (this.isProcessing) return 0;
    this.isProcessing = true;

    try {
      const pendingEvents = await this.outboxRepository.find({
        where: { status: OutboxStatus.PENDING },
        order: { createdAt: 'ASC' },
        take: 50,
      });

      if (pendingEvents.length === 0) {
        return 0;
      }

      let publishedCount = 0;

      for (const event of pendingEvents) {
        try {
          // 1. Publish to Redis Pub/Sub for Real-Time UI sync
          if (this.redisClient && this.redisClient.status === 'ready') {
            await this.redisClient.publish(event.eventType, JSON.stringify(event.payload));
          }

          // 2. Publish to RabbitMQ topic exchange
          if (this.rmqChannel) {
            await this.rmqChannel.publish('outbound.events', event.eventType, event.payload);
          }

          // 3. Mark as PROCESSED
          event.status = OutboxStatus.PROCESSED;
          event.processedAt = new Date();
          await this.outboxRepository.save(event);
          publishedCount++;
        } catch (dispatchError) {
          event.retryCount += 1;
          event.errorReason = dispatchError.message;
          if (event.retryCount >= 5) {
            event.status = OutboxStatus.FAILED;
          }
          await this.outboxRepository.save(event);
          console.error(`[OutboxService] Failed to dispatch event ${event.id}:`, dispatchError.message);
        }
      }

      if (publishedCount > 0) {
        console.log(`[OutboxService] 🚀 Dispatched ${publishedCount} outbox events reliably to Message Broker.`);
      }

      return publishedCount;
    } finally {
      this.isProcessing = false;
    }
  }

  async getOutboxStats(): Promise<{ pending: number; processed: number; failed: number }> {
    const [pending, processed, failed] = await Promise.all([
      this.outboxRepository.count({ where: { status: OutboxStatus.PENDING } }),
      this.outboxRepository.count({ where: { status: OutboxStatus.PROCESSED } }),
      this.outboxRepository.count({ where: { status: OutboxStatus.FAILED } }),
    ]);
    return { pending, processed, failed };
  }
}
