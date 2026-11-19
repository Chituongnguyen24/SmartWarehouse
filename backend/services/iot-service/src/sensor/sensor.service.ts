import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SensorReading } from './sensor.entity';
import * as aedes from 'aedes';
import * as net from 'net';
import * as mqtt from 'mqtt';
import Redis from 'ioredis';
import { InfluxDB, Point, WriteApi } from '@influxdata/influxdb-client';
import { RabbitMqService } from '../rabbitmq/rabbitmq.service';

@Injectable()
export class SensorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SensorService.name);
  private mqttBroker: any;
  private tcpServer: net.Server;
  private mqttClient: mqtt.MqttClient;
  private redisClient: Redis;
  private influxClient: InfluxDB | null = null;
  private influxWriteApi: WriteApi | null = null;

  // Cache to combine temperature and humidity messages
  private lastMetrics: Record<string, { temperature?: number; humidity?: number; timestamp?: Date }> = {};
  
  // Track violation start times: zone_id -> Date
  private activeViolations: Record<string, Date> = {};
  
  // Anomaly threshold: 15 minutes by default, but customizable for demo/testing
  private readonly ANOMALY_TIME_LIMIT_MS = process.env.ANOMALY_TIME_LIMIT_MS 
    ? parseInt(process.env.ANOMALY_TIME_LIMIT_MS) 
    : 1 * 60 * 1000; // Default to 1 minute for easy demonstration (production: 15 * 60 * 1000)

  // Safety envelopes per zone (Tiêu chuẩn môi trường: Tối đa 35°C và 80% độ ẩm)
  private readonly SAFETY_ENVELOPE = {
    COLD: { minTemp: 0, maxTemp: 35, maxHumidity: 80 },
    COOL: { minTemp: 10, maxTemp: 35, maxHumidity: 80 },
    FROZEN: { minTemp: -30, maxTemp: -18, maxHumidity: 65 },
    DRY: { minTemp: 15, maxTemp: 35, maxHumidity: 80 },
  };

  constructor(
    @InjectRepository(SensorReading)
    private readingRepository: Repository<SensorReading>,
    private readonly rabbitMqService: RabbitMqService,
  ) {
    try {
      this.redisClient = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: Number(process.env.REDIS_PORT) || 6379,
        lazyConnect: true,
        maxRetriesPerRequest: 1,
      });
      this.redisClient.on('error', (err) => {
        this.logger.warn(`Redis connection warning in SensorService: ${err.message}`);
      });
      this.redisClient.connect().catch(() => {});
    } catch (e: any) {
      this.logger.warn(`Redis initialization skipped: ${e.message}`);
    }

    // InfluxDB client initialization
    const influxUrl = process.env.INFLUX_URL || 'http://localhost:8086';
    const influxToken = process.env.INFLUX_TOKEN || 'sfwms-influx-token-demo';
    const influxOrg = process.env.INFLUX_ORG || 'sfwms';
    const influxBucket = process.env.INFLUX_BUCKET || 'sensor_data';

    try {
      this.influxClient = new InfluxDB({ url: influxUrl, token: influxToken });
      this.influxWriteApi = this.influxClient.getWriteApi(influxOrg, influxBucket, 'ms');
      this.logger.log(`InfluxDB client ready (Bucket: ${influxBucket}, Org: ${influxOrg})`);
    } catch (e: any) {
      this.logger.warn(`InfluxDB initialization skipped: ${e.message}`);
    }
  }

  async onModuleInit() {
    await this.startMqttBroker();
    this.connectMqttClient();
  }

  onModuleDestroy() {
    if (this.mqttClient) this.mqttClient.end();
    if (this.tcpServer) this.tcpServer.close();
    if (this.mqttBroker) this.mqttBroker.close();
    if (this.redisClient) this.redisClient.disconnect();
    if (this.influxWriteApi) {
      try {
        this.influxWriteApi.close();
      } catch {}
    }
  }

  // 1. Start the embedded Aedes MQTT Broker only if port 1883 is free
  private async startMqttBroker() {
    if (process.env.DISABLE_EMBEDDED_BROKER === 'true') {
      this.logger.log('Embedded Aedes broker disabled by env.');
      return;
    }

    const brokerInstance = (aedes as any).default || aedes;
    this.mqttBroker = new brokerInstance();
    
    this.tcpServer = net.createServer(this.mqttBroker.handle);
    const mqttPort = 1883;

    return new Promise<void>((resolve) => {
      this.tcpServer.on('error', (err: any) => {
        this.logger.warn(`Embedded Aedes broker port 1883 in use or unavailable (${err.message}). Using external broker.`);
        resolve();
      });

      this.tcpServer.listen(mqttPort, '0.0.0.0', () => {
        this.logger.log(`Self-contained MQTT Broker is running on port ${mqttPort}`);
        resolve();
      });
    });
  }

  // 2. Connect client and subscribe to warehouse topics
  private connectMqttClient() {
    const brokerUrl = process.env.MQTT_BROKER_URL || 'mqtt://broker.emqx.io:1883';
    this.mqttClient = mqtt.connect(brokerUrl);

    this.mqttClient.on('connect', () => {
      this.logger.log(`SensorService MQTT Client connected to ${brokerUrl}`);
      // Subscribe to all temperature and humidity topics
      this.mqttClient.subscribe('warehouse/+/temperature');
      this.mqttClient.subscribe('warehouse/+/humidity');
      this.mqttClient.subscribe('citymart/wh006/environment');
      this.mqttClient.subscribe('citymart/warehouse/GV/environment/telemetry');
    });

    this.mqttClient.on('message', async (topic, message) => {
      await this.handleMqttMessage(topic, message.toString());
    });

    this.mqttClient.on('error', (err) => {
      this.logger.warn(`SensorService MQTT Client error: ${err.message}`);
    });
  }

  // Helper to record telemetry to InfluxDB, Redis cache, SQLite, and trigger anomaly check
  private async recordTelemetry(zoneId: string, temp: number, hum: number) {
    // 1. InfluxDB Time-Series write
    if (this.influxWriteApi) {
      try {
        const point = new Point('climate_telemetry')
          .tag('warehouse', 'WH-006')
          .tag('zone', zoneId)
          .floatField('temperature', temp)
          .floatField('humidity', hum)
          .timestamp(new Date());
        this.influxWriteApi.writePoint(point);
        this.influxWriteApi.flush().catch(() => {});
      } catch (err: any) {
        this.logger.warn(`InfluxDB writePoint error: ${err.message}`);
      }
    }

    // 2. Redis telemetry cache (TTL 300s)
    if (this.redisClient?.status === 'ready') {
      try {
        await this.redisClient.set(
          `iot:telemetry:${zoneId}`,
          JSON.stringify({ zoneId, temperature: temp, humidity: hum, timestamp: new Date().toISOString() }),
          'EX',
          300,
        );
      } catch {}
    }

    // 3. SQLite persistent repository
    const reading = this.readingRepository.create({
      zoneId,
      temperature: temp,
      humidity: hum,
    });
    await this.readingRepository.save(reading).catch(() => {});

    // 4. Perform anomaly detection
    await this.checkAnomaly(zoneId, temp, hum);
  }

  // 3. Process incoming environmental data streams
  private async handleMqttMessage(topic: string, payload: string) {
    if (topic.includes('environment')) {
      // Handles JSON payload from ESP32: { warehouseCode: "WH-006", zone: "COOL", temperature: 2.5, humidity: 65 }
      try {
        const data = JSON.parse(payload);
        const zoneId = data.zone || 'COOL';
        const temp = parseFloat(data.temperature);
        const hum = parseFloat(data.humidity);

        if (!isNaN(temp) && !isNaN(hum)) {
          await this.recordTelemetry(zoneId, temp, hum);
        }
      } catch {
        // Not a JSON payload, ignore
      }
      return;
    }

    const parts = topic.split('/');
    if (parts.length < 3) return;

    const zoneId = parts[1]; // COLD, FROZEN, DRY
    const metricType = parts[2]; // temperature, humidity
    const value = parseFloat(payload);

    if (isNaN(value)) return;

    if (!this.lastMetrics[zoneId]) {
      this.lastMetrics[zoneId] = { timestamp: new Date() };
    }

    const currentZoneData = this.lastMetrics[zoneId];
    currentZoneData.timestamp = new Date();

    if (metricType === 'temperature') {
      currentZoneData.temperature = value;
    } else if (metricType === 'humidity') {
      currentZoneData.humidity = value;
    }

    // When we have both metrics, store them in the DB and perform anomaly checks
    if (currentZoneData.temperature !== undefined && currentZoneData.humidity !== undefined) {
      const temp = currentZoneData.temperature;
      const hum = currentZoneData.humidity;

      // Clear cache for next cycle
      currentZoneData.temperature = undefined;
      currentZoneData.humidity = undefined;

      await this.recordTelemetry(zoneId, temp, hum);
    }
  }

  // 4. Anomaly detection algorithm using safety envelopes and sliding window duration
  private async checkAnomaly(zoneId: string, temp: number, humidity: number) {
    const envelope = this.SAFETY_ENVELOPE[zoneId.toUpperCase()] || this.SAFETY_ENVELOPE.COLD;
    if (!envelope) return;

    const isViolating = 
      temp < envelope.minTemp || 
      temp > envelope.maxTemp || 
      humidity > envelope.maxHumidity;

    const now = new Date();

    if (isViolating) {
      // If first violation, log the start time
      if (!this.activeViolations[zoneId]) {
        this.activeViolations[zoneId] = now;
        this.logger.warn(`[VIOLATION DETECTED] Zone: ${zoneId} is outside safe limits! Temp: ${temp}°C, Humidity: ${humidity}%`);
      } else {
        const violationStart = this.activeViolations[zoneId];
        const elapsedMs = now.getTime() - violationStart.getTime();

        this.logger.warn(`[VIOLATION ONGOING] Zone: ${zoneId} for ${Math.round(elapsedMs / 1000)}s. Temp: ${temp}°C, Humidity: ${humidity}%`);

        // If elapsed time exceeds threshold, fire anomaly event
        if (elapsedMs >= this.ANOMALY_TIME_LIMIT_MS) {
          const durationMinutes = Math.round((elapsedMs / (1000 * 60)) * 10) / 10;
          
          this.logger.error(`[ANOMALY CRITICAL] Zone: ${zoneId} has violated safe limits for ${durationMinutes} minutes! Emitting SensorAnomaly event.`);
          
          const eventPayload = {
            eventId: Math.random().toString(36).substring(7),
            zoneId,
            temperature: temp,
            humidity,
            durationMinutes,
            timestamp: now.toISOString(),
          };

          // 1. Publish event to Redis Pub/Sub
          if (this.redisClient?.status === 'ready') {
            await this.redisClient.publish('sensor_anomaly', JSON.stringify(eventPayload)).catch(() => {});
          }

          // 2. Publish event to RabbitMQ topic exchange sfwms.events
          try {
            await this.rabbitMqService.publishEvent('iot.climate.anomaly', eventPayload);
          } catch (err: any) {
            this.logger.warn(`Failed to publish climate anomaly to RabbitMQ: ${err.message}`);
          }
          
          // Reset violation timer to avoid duplicate spam alerts
          this.activeViolations[zoneId] = now;
        }
      }
    } else {
      // If within safe limits, clear active violation
      if (this.activeViolations[zoneId]) {
        this.logger.log(`[VIOLATION RESOLVED] Zone: ${zoneId} returned to safe limits. Temp: ${temp}°C, Humidity: ${humidity}%`);
        delete this.activeViolations[zoneId];
      }
    }
  }

  // Fetch recent history
  async getHistory(zoneId?: string, limit = 50): Promise<SensorReading[]> {
    return this.readingRepository.find({
      where: zoneId ? { zoneId } : {},
      order: { timestamp: 'DESC' },
      take: limit,
    });
  }

  // Fetch current active violations
  getActiveViolations(): any[] {
    const list = [];
    const now = new Date();
    for (const zoneId in this.activeViolations) {
      const start = this.activeViolations[zoneId];
      const elapsedSeconds = Math.round((now.getTime() - start.getTime()) / 1000);
      list.push({
        zoneId,
        violatedAt: start,
        elapsedSeconds,
        thresholdSeconds: this.ANOMALY_TIME_LIMIT_MS / 1000,
      });
    }
    return list;
  }
}
