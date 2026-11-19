import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import * as mqtt from 'mqtt';
import { EventEmitter } from 'events';

export interface MqttMessageEvent {
  topic: string;
  payload: any;
  rawPayload: string;
}

@Injectable()
export class MqttGatewayService extends EventEmitter implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MqttGatewayService.name);
  private client: mqtt.MqttClient;
  private isConnected = false;
  private brokerUrl: string;
  private lastMessageAt: Date | null = null;
  private lastEsp32SeenAt: Date | null = null;

  // Topics subscribed
  readonly TOPIC_CMD_SHELF = 'citymart/wh006/shelf/command';
  readonly TOPIC_CMD_SYSTEM = 'citymart/wh006/system/command';
  readonly TOPIC_EVT_SHELF = 'citymart/wh006/shelf/event';
  readonly TOPIC_ENV = 'citymart/wh006/environment';

  // Legacy topics for backward compatibility
  readonly TOPIC_CMD_LEGACY = 'citymart/warehouse/WH-006/picking/command';
  readonly TOPIC_CMD_GV = 'citymart/warehouse/GV/picking/command';
  readonly TOPIC_EVT_LEGACY = 'citymart/warehouse/WH-006/picking/event';
  readonly TOPIC_EVT_GV = 'citymart/warehouse/GV/picking/event';
  readonly TOPIC_ENV_LEGACY = 'citymart/warehouse/GV/environment/telemetry';

  constructor() {
    super();
    // Default to EMQX public broker for real ESP32 testing, or use local Mosquitto / private broker via env
    this.brokerUrl = process.env.MQTT_BROKER_URL || 'mqtt://broker.emqx.io:1883';
  }

  async onModuleInit() {
    this.connect();
  }

  onModuleDestroy() {
    if (this.client) {
      this.logger.log('Disconnecting MQTT client...');
      this.client.end(true);
    }
  }

  private connect() {
    const clientId = `SFWMS-IoTGateway-${Math.random().toString(16).substring(2, 10)}`;
    const options: mqtt.IClientOptions = {
      clientId,
      clean: true,
      connectTimeout: 10000,
      reconnectPeriod: 3000,
    };

    if (process.env.MQTT_USERNAME) {
      options.username = process.env.MQTT_USERNAME;
      options.password = process.env.MQTT_PASSWORD;
    }

    this.logger.log(`Connecting to MQTT Broker at ${this.brokerUrl} (client: ${clientId})...`);
    this.client = mqtt.connect(this.brokerUrl, options);

    this.client.on('connect', () => {
      this.isConnected = true;
      this.logger.log(`MQTT Gateway successfully connected to ${this.brokerUrl}`);

      // Subscribe to events and telemetry from ESP32
      const topics = [
        this.TOPIC_EVT_SHELF,
        this.TOPIC_EVT_LEGACY,
        this.TOPIC_EVT_GV,
        this.TOPIC_ENV,
        this.TOPIC_ENV_LEGACY,
      ];

      this.client.subscribe(topics, (err) => {
        if (err) {
          this.logger.error(`Failed to subscribe to topics: ${err.message}`);
        } else {
          this.logger.log(`Subscribed to IoT topics: ${topics.join(', ')}`);
        }
      });

      this.emit('mqtt_connected');
    });

    this.client.on('message', (topic: string, messageBuffer: Buffer) => {
      const raw = messageBuffer.toString();
      this.lastMessageAt = new Date();
      this.lastEsp32SeenAt = new Date();

      let parsed: any = null;
      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = { raw };
      }

      // Dispatch to internal listeners
      this.emit('message', { topic, payload: parsed, rawPayload: raw } as MqttMessageEvent);

      if (
        topic === this.TOPIC_EVT_SHELF ||
        topic === this.TOPIC_EVT_LEGACY ||
        topic === this.TOPIC_EVT_GV
      ) {
        this.emit('shelf_event', parsed);
      } else if (
        topic === this.TOPIC_ENV ||
        topic === this.TOPIC_ENV_LEGACY
      ) {
        this.emit('climate_telemetry', parsed);
      }
    });

    this.client.on('error', (err) => {
      this.logger.warn(`MQTT Gateway error: ${err.message}`);
      this.emit('mqtt_error', err);
    });

    this.client.on('offline', () => {
      this.isConnected = false;
      this.logger.warn('MQTT Gateway connection is OFFLINE. Attempting reconnect...');
      this.emit('mqtt_offline');
    });

    this.client.on('reconnect', () => {
      this.logger.log('MQTT Gateway reconnecting...');
    });
  }

  /**
   * Publish payload to topic with both primary and backward-compatible mirrors
   */
  async publish(topic: string, payload: any): Promise<boolean> {
    if (!this.client || !this.isConnected) {
      this.logger.warn(`Cannot publish to ${topic}: MQTT client not connected.`);
      return false;
    }

    return new Promise((resolve) => {
      const message = typeof payload === 'string' ? payload : JSON.stringify(payload);
      this.client.publish(topic, message, { qos: 1 }, (err) => {
        if (err) {
          this.logger.error(`Publish failed for ${topic}: ${err.message}`);
          resolve(false);
        } else {
          this.logger.debug(`Published to ${topic}: ${message}`);
          resolve(true);
        }
      });
    });
  }

  /**
   * Publish shelf command across standard and legacy topics
   */
  async publishShelfCommand(payload: any): Promise<boolean> {
    const res1 = await this.publish(this.TOPIC_CMD_SHELF, payload);
    const res2 = await this.publish(this.TOPIC_CMD_LEGACY, payload);
    await this.publish(this.TOPIC_CMD_GV, payload);
    return res1 || res2;
  }

  /**
   * Publish system command (all-off, test, alarm)
   */
  async publishSystemCommand(payload: any): Promise<boolean> {
    const res1 = await this.publish(this.TOPIC_CMD_SYSTEM, payload);
    const res2 = await this.publish(this.TOPIC_CMD_SHELF, payload);
    await this.publish(this.TOPIC_CMD_LEGACY, payload);
    return res1 || res2;
  }

  getConnectionStatus() {
    const now = Date.now();
    const esp32Online = this.lastEsp32SeenAt
      ? now - this.lastEsp32SeenAt.getTime() < 30000
      : false;

    return {
      connected: this.isConnected,
      brokerUrl: this.brokerUrl,
      lastMessageAt: this.lastMessageAt,
      lastEsp32SeenAt: this.lastEsp32SeenAt,
      esp32Online,
    };
  }
}
