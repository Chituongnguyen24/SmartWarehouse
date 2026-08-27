import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SensorReading } from './sensor.entity';
import * as aedes from 'aedes';
import * as net from 'net';
import * as mqtt from 'mqtt';
import Redis from 'ioredis';

@Injectable()
export class SensorService implements OnModuleInit, OnModuleDestroy {
  private mqttBroker: any;
  private tcpServer: net.Server;
  private mqttClient: mqtt.MqttClient;
  private redisClient: Redis;

  // Cache to combine temperature and humidity messages
  private lastMetrics: Record<string, { temperature?: number; humidity?: number; timestamp?: Date }> = {};
  
  // Track violation start times: zone_id -> Date
  private activeViolations: Record<string, Date> = {};
  
  // Anomaly threshold: 15 minutes by default, but customizable for demo/testing
  private readonly ANOMALY_TIME_LIMIT_MS = process.env.ANOMALY_TIME_LIMIT_MS 
    ? parseInt(process.env.ANOMALY_TIME_LIMIT_MS) 
    : 1 * 60 * 1000; // Default to 1 minute for easy demonstration (production: 15 * 60 * 1000)

  // Safety envelopes per zone
  private readonly SAFETY_ENVELOPE = {
    COLD: { minTemp: 0, maxTemp: 4, maxHumidity: 80 },
    FROZEN: { minTemp: -30, maxTemp: -18, maxHumidity: 65 },
    DRY: { minTemp: 15, maxTemp: 35, maxHumidity: 70 },
  };

  constructor(
    @InjectRepository(SensorReading)
    private readingRepository: Repository<SensorReading>,
  ) {
    this.redisClient = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: Number(process.env.REDIS_PORT) || 6379,
    });
  }

  async onModuleInit() {
    await this.startMqttBroker();
    this.connectMqttClient();
  }

  onModuleDestroy() {
    if (this.mqttClient) this.mqttClient.end();
    if (this.tcpServer) this.tcpServer.close();
    if (this.mqttBroker) this.mqttBroker.close();
  }

  // 1. Start the embedded Aedes MQTT Broker
  private async startMqttBroker() {
    const brokerInstance = (aedes as any).default || aedes;
    this.mqttBroker = new brokerInstance();
    
    this.tcpServer = net.createServer(this.mqttBroker.handle);
    const mqttPort = 1883;

    return new Promise<void>((resolve) => {
      this.tcpServer.listen(mqttPort, '0.0.0.0', () => {
        console.log(`Self-contained MQTT Broker is running on port ${mqttPort}`);
        resolve();
      });
    });
  }

  // 2. Connect client and subscribe to warehouse topics
  private connectMqttClient() {
    this.mqttClient = mqtt.connect('mqtt://localhost:1883');

    this.mqttClient.on('connect', () => {
      console.log('IoT Service internal MQTT Client connected to broker');
      // Subscribe to all temperature and humidity topics
      this.mqttClient.subscribe('warehouse/+/temperature');
      this.mqttClient.subscribe('warehouse/+/humidity');
    });

    this.mqttClient.on('message', async (topic, message) => {
      await this.handleMqttMessage(topic, message.toString());
    });
  }

  // 3. Process incoming environmental data streams
  private async handleMqttMessage(topic: string, payload: string) {
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

      // Save reading to database
      const reading = this.readingRepository.create({
        zoneId,
        temperature: temp,
        humidity: hum,
      });
      const savedReading = await this.readingRepository.save(reading);
      
      // Perform anomaly detection
      await this.checkAnomaly(zoneId, temp, hum);
    }
  }

  // 4. Anomaly detection algorithm using safety envelopes and sliding window duration
  private async checkAnomaly(zoneId: string, temp: number, humidity: number) {
    const envelope = this.SAFETY_ENVELOPE[zoneId];
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
        console.warn(`[VIOLATION DETECTED] Zone: ${zoneId} is outside safe limits! Temp: ${temp}°C, Humidity: ${humidity}%`);
      } else {
        const violationStart = this.activeViolations[zoneId];
        const elapsedMs = now.getTime() - violationStart.getTime();

        console.warn(`[VIOLATION ONGOING] Zone: ${zoneId} for ${Math.round(elapsedMs / 1000)}s. Temp: ${temp}°C, Humidity: ${humidity}%`);

        // If elapsed time exceeds threshold, fire anomaly event
        if (elapsedMs >= this.ANOMALY_TIME_LIMIT_MS) {
          const durationMinutes = Math.round((elapsedMs / (1000 * 60)) * 10) / 10;
          
          console.error(`[ANOMALY CRITICAL] Zone: ${zoneId} has violated safe limits for ${durationMinutes} minutes! Emitting SensorAnomaly event.`);
          
          const eventPayload = {
            eventId: Math.random().toString(36).substring(7),
            zoneId,
            temperature: temp,
            humidity,
            durationMinutes,
            timestamp: now.toISOString(),
          };

          // Publish event to Redis
          await this.redisClient.publish('sensor_anomaly', JSON.stringify(eventPayload));
          
          // Reset violation timer to avoid duplicate spam alerts
          // It will check again in the next cycle if the violation remains
          this.activeViolations[zoneId] = now;
        }
      }
    } else {
      // If within safe limits, clear active violation
      if (this.activeViolations[zoneId]) {
        console.log(`[VIOLATION RESOLVED] Zone: ${zoneId} returned to safe limits. Temp: ${temp}°C, Humidity: ${humidity}%`);
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
