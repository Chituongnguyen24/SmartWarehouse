import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { InventoryOutboxEvent, OutboxStatus } from './outbox.entity';
import Redis from 'ioredis';

@Injectable()
export class InventoryOutboxService implements OnModuleInit, OnModuleDestroy {
  private redisClient: Redis;
  private workerInterval: NodeJS.Timeout | null = null;
  private isProcessing = false;

  constructor(
    @InjectRepository(InventoryOutboxEvent)
    private outboxRepository: Repository<InventoryOutboxEvent>,
  ) {
    this.redisClient = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: Number(process.env.REDIS_PORT) || 6379,
      maxRetriesPerRequest: null,
      enableOfflineQueue: false,
      retryStrategy: (times) => Math.min(times * 100, 3000),
    });

    this.redisClient.on('error', (err) => {
      console.warn(`[InventoryOutboxService] Redis warning: ${err.message}`);
    });
  }

  onModuleInit() {
    this.workerInterval = setInterval(() => {
      this.publishPendingEvents().catch((err) => {
        console.warn('[InventoryOutboxService] Worker error:', err.message);
      });
    }, 2500);

    console.log('[InventoryOutboxService] 📦 Inventory Transactional Outbox Worker initialized.');
  }

  onModuleDestroy() {
    if (this.workerInterval) clearInterval(this.workerInterval);
  }

  async recordEvent(
    aggregateType: string,
    aggregateId: string,
    eventType: string,
    payload: any,
    manager?: EntityManager,
  ): Promise<InventoryOutboxEvent> {
    const repo = manager ? manager.getRepository(InventoryOutboxEvent) : this.outboxRepository;
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

  async publishPendingEvents(): Promise<number> {
    if (this.isProcessing) return 0;
    this.isProcessing = true;

    try {
      const pendingEvents = await this.outboxRepository.find({
        where: { status: OutboxStatus.PENDING },
        order: { createdAt: 'ASC' },
        take: 50,
      });

      if (pendingEvents.length === 0) return 0;

      let publishedCount = 0;

      for (const event of pendingEvents) {
        try {
          if (this.redisClient && this.redisClient.status === 'ready') {
            await this.redisClient.publish(event.eventType, JSON.stringify(event.payload));
          }
          event.status = OutboxStatus.PROCESSED;
          event.processedAt = new Date();
          await this.outboxRepository.save(event);
          publishedCount++;
        } catch (err) {
          event.retryCount += 1;
          event.errorReason = err.message;
          if (event.retryCount >= 5) event.status = OutboxStatus.FAILED;
          await this.outboxRepository.save(event);
        }
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
