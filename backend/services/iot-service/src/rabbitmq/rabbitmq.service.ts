import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import * as amqp from 'amqplib';

@Injectable()
export class RabbitMqService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMqService.name);
  private connection: any = null;
  private channel: any = null;
  private isConnected = false;
  private readonly EXCHANGE = 'sfwms.events';
  private readonly RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  private async connect() {
    try {
      this.connection = await amqp.connect(this.RABBITMQ_URL);
      this.channel = await this.connection.createChannel();
      await this.channel.assertExchange(this.EXCHANGE, 'topic', { durable: true });
      this.isConnected = true;
      this.logger.log(`RabbitMQ connected successfully to ${this.RABBITMQ_URL} (Exchange: ${this.EXCHANGE})`);

      this.connection.on('error', (err: any) => {
        this.logger.warn(`RabbitMQ connection error: ${err.message}`);
        this.isConnected = false;
      });

      this.connection.on('close', () => {
        this.logger.warn('RabbitMQ connection closed.');
        this.isConnected = false;
        setTimeout(() => this.connect(), 5000);
      });
    } catch (err: any) {
      this.logger.warn(`RabbitMQ connection skipped or unavailable (${err.message}). Event publishing will continue with fallback.`);
      this.isConnected = false;
    }
  }

  async publishEvent(routingKey: string, message: any): Promise<boolean> {
    const payload = {
      event: routingKey,
      timestamp: new Date().toISOString(),
      source: 'iot-service',
      data: message,
    };

    if (this.channel && this.isConnected) {
      try {
        const published = this.channel.publish(
          this.EXCHANGE,
          routingKey,
          Buffer.from(JSON.stringify(payload)),
          { persistent: true, contentType: 'application/json' },
        );
        this.logger.log(`[RabbitMQ EDA] Published event [${routingKey}]`);
        return published;
      } catch (err: any) {
        this.logger.warn(`Failed to publish RabbitMQ event [${routingKey}]: ${err.message}`);
      }
    }
    return false;
  }

  getStatus() {
    return {
      connected: this.isConnected,
      exchange: this.EXCHANGE,
      url: this.RABBITMQ_URL,
    };
  }

  private async disconnect() {
    try {
      if (this.channel) await this.channel.close();
      if (this.connection) await this.connection.close();
    } catch {}
  }
}
