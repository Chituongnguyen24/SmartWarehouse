import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import * as mqtt from 'mqtt';
import { EventEmitter } from 'events';
import { spawn, ChildProcessWithoutNullStreams } from 'child_process';

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
  private serialBridgeProc: ChildProcessWithoutNullStreams | null = null;
  private serialConnected = false;
  private serialPortName: string = process.env.ESP32_SERIAL_PORT || 'COM11';
  private serialReconnectTimer: NodeJS.Timeout | null = null;
  private isDestroying = false;

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
    this.startSerialBridge();
  }

  onModuleDestroy() {
    this.isDestroying = true;
    if (this.serialReconnectTimer) {
      clearTimeout(this.serialReconnectTimer);
    }
    if (this.serialBridgeProc) {
      try {
        this.serialBridgeProc.kill();
      } catch {}
    }
    if (this.client) {
      this.logger.log('Disconnecting MQTT client...');
      this.client.end(true);
    }
  }

  /**
   * Direct USB Serial Bridge (COM11, 115200 baud) for zero-latency Pick-to-Light & STOP events
   * Works even when Wi-Fi is 5GHz-only or offline.
   */
  private startSerialBridge() {
    if (this.isDestroying || process.platform !== 'win32') return;
    if (this.serialBridgeProc) {
      try {
        this.serialBridgeProc.kill();
      } catch {}
      this.serialBridgeProc = null;
    }

    const psScript = `
[Console]::InputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$portName = '${this.serialPortName}'
$avail = [System.IO.Ports.SerialPort]::GetPortNames()
if ($avail -notcontains $portName -and $avail.Count -gt 0) {
  $portName = $avail[0]
}
$port = New-Object System.IO.Ports.SerialPort $portName, 115200, 'None', 8, 'One'
$port.Encoding = [System.Text.Encoding]::UTF8
$port.DtrEnable = $false
$port.RtsEnable = $false
$port.Open()
[Console]::Out.WriteLine("[SERIAL_CONNECTED]$portName")
[Console]::Out.Flush()
$stdin = [Console]::In
$readTask = $stdin.ReadLineAsync()
while ($port.IsOpen) {
  while ($port.BytesToRead -gt 0) {
    try {
      $line = $port.ReadLine()
      if ($line) {
        [Console]::Out.WriteLine($line.Trim())
        [Console]::Out.Flush()
      }
    } catch {}
  }
  if ($readTask.IsCompleted) {
    $cmd = $readTask.Result
    if ($null -eq $cmd) { break }
    $cmdTrim = $cmd.Trim()
    if ($cmdTrim.Length -gt 0) {
      $port.WriteLine($cmdTrim)
      $port.BaseStream.Flush()
    }
    $readTask = $stdin.ReadLineAsync()
  }
  Start-Sleep -Milliseconds 10
}
$port.Close()
`;

    try {
      const proc = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', psScript], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      this.serialBridgeProc = proc;

      let stdoutBuf = '';
      proc.stdout.on('data', (chunk: Buffer) => {
        stdoutBuf += chunk.toString('utf8');
        let nlIdx: number;
        while ((nlIdx = stdoutBuf.indexOf('\n')) >= 0) {
          const line = stdoutBuf.slice(0, nlIdx).trim();
          stdoutBuf = stdoutBuf.slice(nlIdx + 1);
          if (line) this.handleSerialLine(line);
        }
      });

      proc.on('exit', () => {
        this.serialConnected = false;
        this.serialBridgeProc = null;
        if (!this.isDestroying) {
          this.serialReconnectTimer = setTimeout(() => this.startSerialBridge(), 3000);
        }
      });
    } catch (err: any) {
      this.logger.warn(`Failed to start USB Serial bridge: ${err.message}`);
    }
  }

  private handleSerialLine(line: string) {
    if (line.startsWith('[SERIAL_CONNECTED]')) {
      const port = line.replace('[SERIAL_CONNECTED]', '').trim();
      this.serialConnected = true;
      this.lastEsp32SeenAt = new Date();
      this.logger.log(`USB Serial Bridge connected directly to ESP32 on ${port} (115200 baud)`);
      this.emit('esp32_ready');
      return;
    }

    if (line.includes('[READY]')) {
      this.serialConnected = true;
      this.lastEsp32SeenAt = new Date();
      this.logger.log(`ESP32 Serial Ready: ${line}`);
      this.emit('esp32_ready');
      return;
    }

    const evtIdx = line.indexOf('[IOT_EVENT]');
    if (evtIdx >= 0) {
      const jsonPart = line.slice(evtIdx + '[IOT_EVENT]'.length).trim();
      try {
        const parsed = JSON.parse(jsonPart);
        this.lastMessageAt = new Date();
        this.lastEsp32SeenAt = new Date();
        this.logger.log(`[ESP32 Serial Event] ${jsonPart}`);
        this.emit('shelf_event', parsed);
      } catch (e) {}
      return;
    }

    const envIdx = line.indexOf('[IOT_ENV]');
    if (envIdx >= 0) {
      const jsonPart = line.slice(envIdx + '[IOT_ENV]'.length).trim();
      try {
        const parsed = JSON.parse(jsonPart);
        this.lastMessageAt = new Date();
        this.lastEsp32SeenAt = new Date();
        this.emit('climate_telemetry', parsed);
      } catch (e) {}
      return;
    }

    if (
      line.startsWith('[ACTIVATE]') ||
      line.startsWith('[STOP CONFIRMED]') ||
      line.startsWith('[REMOTE OFF]') ||
      line.startsWith('[BUZZER_MODE]')
    ) {
      this.lastEsp32SeenAt = new Date();
      this.logger.log(`[ESP32 Serial] ${line}`);
    }
  }

  private writeToSerial(payload: any): boolean {
    if (!this.serialBridgeProc || !this.serialBridgeProc.stdin.writable) {
      return false;
    }
    try {
      const json = typeof payload === 'string' ? payload : JSON.stringify(payload);
      this.serialBridgeProc.stdin.write(json + '\n');
      return true;
    } catch {
      return false;
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
      // QoS 0 ensures sub-millisecond dispatch without blocking on remote broker PUBACK
      this.client.publish(topic, message, { qos: 0 }, (err) => {
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
   * Publish shelf command across USB Serial (COM11) and MQTT topics in parallel
   */
  async publishShelfCommand(payload: any): Promise<boolean> {
    const serialSent = this.writeToSerial(payload);
    const results = await Promise.all([
      this.publish(this.TOPIC_CMD_SHELF, payload),
      this.publish(this.TOPIC_CMD_LEGACY, payload),
      this.publish(this.TOPIC_CMD_GV, payload),
    ]);
    return serialSent || results.some(Boolean);
  }

  /**
   * Publish system command (all-off, test, alarm) in parallel across USB Serial and MQTT
   */
  async publishSystemCommand(payload: any): Promise<boolean> {
    const serialSent = this.writeToSerial(payload);
    const results = await Promise.all([
      this.publish(this.TOPIC_CMD_SYSTEM, payload),
      this.publish(this.TOPIC_CMD_SHELF, payload),
      this.publish(this.TOPIC_CMD_LEGACY, payload),
    ]);
    return serialSent || results.some(Boolean);
  }

  getConnectionStatus() {
    const now = Date.now();
    const esp32Online =
      this.serialConnected ||
      (this.lastEsp32SeenAt ? now - this.lastEsp32SeenAt.getTime() < 30000 : false);

    return {
      connected: this.isConnected || this.serialConnected,
      serialConnected: this.serialConnected,
      serialPort: this.serialPortName,
      brokerUrl: this.brokerUrl,
      lastMessageAt: this.lastMessageAt,
      lastEsp32SeenAt: this.lastEsp32SeenAt,
      esp32Online,
    };
  }
}
