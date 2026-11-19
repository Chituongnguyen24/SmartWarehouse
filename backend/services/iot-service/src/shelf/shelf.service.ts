import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { MqttGatewayService } from '../mqtt/mqtt-gateway.service';
import { RabbitMqService } from '../rabbitmq/rabbitmq.service';
import Redis from 'ioredis';
import { LocateShelfDto, ChirpShelfDto, StopShelfDto, CompleteShelfDto } from './shelf.dto';

export type ShelfCode = 'A1' | 'A2' | 'A3';
export type ShelfStatus = 'IDLE' | 'LOCATING' | 'ARRIVED' | 'COMPLETED';

export interface ShelfState {
  code: ShelfCode;
  label: string;
  zone: string;
  pinInfo: {
    ledPin: number;
    buzzerPin: number;
    buttonPin: number;
  };
  status: ShelfStatus;
  ledOn: boolean;
  buzzerOn: boolean;
  waitingCheckin: boolean;
  orderId: string | null;
  productName: string | null;
  qty: number;
  activatedAt: string | null;
  arrivedAt: string | null;
  completedAt: string | null;
  lastAckAt: string | null;
}

export interface HardwareEventLog {
  id: string;
  timestamp: string;
  shelfCode: ShelfCode | 'ALL';
  eventType: 'COMMAND_DISPATCHED' | 'STOP_PRESSED' | 'SMARTKEY_CHIRP' | 'ORDER_COMPLETED' | 'RESET' | 'ALARM_TRIGGERED';
  message: string;
  data?: any;
}

interface PendingCommand {
  shelfCode: ShelfCode;
  action: string;
  dispatchedAt: number;
  retries: number;
  payload: any;
  timer?: NodeJS.Timeout;
}

@Injectable()
export class ShelfService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ShelfService.name);
  private redisClient: Redis;

  private shelves: Record<ShelfCode, ShelfState> = {
    A1: {
      code: 'A1',
      label: 'Thịt tươi CP',
      zone: 'KHO GÒ VẤP (Tiêu chuẩn ≤ 35°C, ≤ 80%)',
      pinInfo: { ledPin: 25, buzzerPin: 18, buttonPin: 27 },
      status: 'IDLE',
      ledOn: false,
      buzzerOn: false,
      waitingCheckin: false,
      orderId: null,
      productName: null,
      qty: 0,
      activatedAt: null,
      arrivedAt: null,
      completedAt: null,
      lastAckAt: null,
    },
    A2: {
      code: 'A2',
      label: 'Sữa tươi Đà Lạt',
      zone: 'KHO GÒ VẤP (Tiêu chuẩn ≤ 35°C, ≤ 80%)',
      pinInfo: { ledPin: 26, buzzerPin: 19, buttonPin: 14 },
      status: 'IDLE',
      ledOn: false,
      buzzerOn: false,
      waitingCheckin: false,
      orderId: null,
      productName: null,
      qty: 0,
      activatedAt: null,
      arrivedAt: null,
      completedAt: null,
      lastAckAt: null,
    },
    A3: {
      code: 'A3',
      label: 'Rau củ VietGAP',
      zone: 'KHO GÒ VẤP (Tiêu chuẩn ≤ 35°C, ≤ 80%)',
      pinInfo: { ledPin: 32, buzzerPin: 23, buttonPin: 33 },
      status: 'IDLE',
      ledOn: false,
      buzzerOn: false,
      waitingCheckin: false,
      orderId: null,
      productName: null,
      qty: 0,
      activatedAt: null,
      arrivedAt: null,
      completedAt: null,
      lastAckAt: null,
    },
  };

  private eventLogs: HardwareEventLog[] = [];
  private readonly MAX_LOGS = 60;
  private pendingCommands = new Map<string, PendingCommand>();
  private lastSeenEventKeys = new Set<string>();

  constructor(
    private readonly mqttGateway: MqttGatewayService,
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
        this.logger.warn(`Redis connection warning in ShelfService: ${err.message}`);
      });
      this.redisClient.connect().catch(() => {});
    } catch (e: any) {
      this.logger.warn(`Redis initialization skipped in ShelfService: ${e.message}`);
    }
  }

  async onModuleInit() {
    // Restore cached state from Redis
    await this.restoreShelvesFromRedis();

    // Listen for shelf events from ESP32
    this.mqttGateway.on('shelf_event', (event: any) => {
      this.handleIncomingShelfEvent(event);
    });
  }

  onModuleDestroy() {
    if (this.redisClient) {
      this.redisClient.disconnect();
    }
  }

  private async restoreShelvesFromRedis() {
    try {
      if (this.redisClient?.status === 'ready') {
        const cached = await this.redisClient.get('iot:shelves:wh006');
        if (cached) {
          const parsed = JSON.parse(cached);
          this.shelves = { ...this.shelves, ...parsed };
          this.logger.log('Restored shelf state from Redis cache (iot:shelves:wh006).');
        }
      }
    } catch (err: any) {
      this.logger.warn(`Could not restore shelves from Redis: ${err.message}`);
    }
  }

  private async syncStateAndPublish(eventType: string, shelfCode: ShelfCode | 'ALL', extraData?: any) {
    // 1. Sync to Redis cache & pub/sub
    try {
      if (this.redisClient?.status === 'ready') {
        await this.redisClient.set('iot:shelves:wh006', JSON.stringify(this.shelves));
        await this.redisClient.publish('iot:shelf_events', JSON.stringify({
          event: eventType,
          shelfCode,
          state: shelfCode === 'ALL' ? this.shelves : this.shelves[shelfCode],
          extra: extraData,
          timestamp: new Date().toISOString(),
        }));
      }
    } catch (err: any) {
      this.logger.warn(`Failed to sync shelf state to Redis: ${err.message}`);
    }

    // 2. Publish to RabbitMQ topic exchange sfwms.events
    try {
      await this.rabbitMqService.publishEvent(`iot.shelf.${eventType.toLowerCase()}`, {
        shelfCode,
        state: shelfCode === 'ALL' ? this.shelves : this.shelves[shelfCode],
        extra: extraData,
      });
    } catch (err: any) {
      this.logger.warn(`Failed to publish event to RabbitMQ: ${err.message}`);
    }
  }

  // Normalize shelf code from "A1", "01", "1", "a1", "KE A1"
  normalizeShelfCode(input: string): ShelfCode | null {
    if (!input) return null;
    const clean = input.toUpperCase().trim();
    if (clean.includes('A1') || clean.includes('01') || clean === '1') return 'A1';
    if (clean.includes('A2') || clean.includes('02') || clean === '2') return 'A2';
    if (clean.includes('A3') || clean.includes('03') || clean === '3') return 'A3';
    return null;
  }

  private addLog(
    shelfCode: ShelfCode | 'ALL',
    eventType: HardwareEventLog['eventType'],
    message: string,
    data?: any,
  ) {
    const entry: HardwareEventLog = {
      id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      shelfCode,
      eventType,
      message,
      data,
    };
    this.eventLogs.unshift(entry);
    if (this.eventLogs.length > this.MAX_LOGS) {
      this.eventLogs.pop();
    }
  }

  /**
   * Handle incoming MQTT event from ESP32 (CONFIRMED when STOP pressed, LOCATING, etc.)
   */
  private handleIncomingShelfEvent(event: any) {
    const rawCode = event.shelfCode || event.shelf || '';
    const code = this.normalizeShelfCode(rawCode);
    const eventName = (event.event || '').toUpperCase();

    this.logger.log(`Received Shelf Event [${eventName}] for shelf [${rawCode}]: ${JSON.stringify(event)}`);

    if (!code) {
      this.logger.warn(`Unknown shelf code in event: ${rawCode}`);
      return;
    }

    // Deduplicate mirror topic events within same second
    const dedupKey = `${code}:${eventName}:${event.timestamp || Math.floor(Date.now() / 1000)}`;
    if (this.lastSeenEventKeys.has(dedupKey)) {
      return;
    }
    this.lastSeenEventKeys.add(dedupKey);
    if (this.lastSeenEventKeys.size > 200) {
      this.lastSeenEventKeys.clear();
    }

    const shelf = this.shelves[code];
    const nowIso = new Date().toISOString();
    shelf.lastAckAt = nowIso;

    // Clear pending retry if exists
    const pendingKey = `${code}:LOCATE`;
    if (this.pendingCommands.has(pendingKey)) {
      const pending = this.pendingCommands.get(pendingKey);
      if (pending?.timer) clearTimeout(pending.timer);
      this.pendingCommands.delete(pendingKey);
    }

    if (eventName === 'CONFIRMED') {
      // Physical STOP button was pressed at shelf!
      // Transitions to ARRIVED (NOT COMPLETED - barcode scan / staff app completes it)
      shelf.status = 'ARRIVED';
      shelf.ledOn = false;
      shelf.buzzerOn = false;
      shelf.waitingCheckin = false;
      shelf.arrivedAt = nowIso;

      this.addLog(
        code,
        'STOP_PRESSED',
        `Nhân viên đã đến kệ ${code} và bấm nút STOP vật lý. Đèn và còi đã tắt.`,
        event,
      );
      this.syncStateAndPublish('arrived', code, event);
    } else if (eventName === 'LOCATING') {
      shelf.status = 'LOCATING';
      shelf.ledOn = true;
      shelf.buzzerOn = true;
      shelf.waitingCheckin = true;
      if (!shelf.activatedAt) shelf.activatedAt = nowIso;

      this.addLog(
        code,
        'COMMAND_DISPATCHED',
        `ESP32 đã nhận lệnh định vị kệ ${code}. Đèn và còi đang nhấp nháy.`,
        event,
      );
      this.syncStateAndPublish('locating', code, event);
    }
  }

  /**
   * Dispatch LOCATE command to shelf
   */
  async locateShelf(dto: LocateShelfDto) {
    const code = this.normalizeShelfCode(dto.shelfCode);
    if (!code) {
      return { success: false, message: `Mã kệ không hợp lệ (${dto.shelfCode}). Chỉ hỗ trợ kệ A1, A2, A3.` };
    }

    const shelf = this.shelves[code];
    const nowIso = new Date().toISOString();

    shelf.status = 'LOCATING';
    shelf.ledOn = true;
    shelf.buzzerOn = true;
    shelf.waitingCheckin = true;
    shelf.orderId = dto.orderId || shelf.orderId || 'ORD-STAFF';
    shelf.productName = dto.productName || shelf.productName || shelf.label;
    shelf.qty = dto.qty || shelf.qty || 1;
    shelf.activatedAt = nowIso;
    shelf.arrivedAt = null;

    const payload = {
      action: 'LOCATE',
      shelfCode: code,
      orderId: shelf.orderId,
      productName: shelf.productName,
      qty: shelf.qty,
      slotCode: dto.slotCode || `${code}-01`,
      warehouseCode: dto.warehouseCode || 'WH-006',
      timestamp: Date.now(),
    };

    const published = await this.mqttGateway.publishShelfCommand(payload);

    this.addLog(
      code,
      'COMMAND_DISPATCHED',
      `Phát lệnh định vị kệ ${code} (${shelf.label}). Bật đèn và còi.`,
      payload,
    );
    this.syncStateAndPublish('located', code, payload);

    // Setup retry mechanism (5s timeout, max 2 retries)
    this.setupCommandRetry(code, 'LOCATE', payload);

    return {
      success: published,
      shelfCode: code,
      status: shelf.status,
      message: `Đã phát lệnh định vị kệ ${code}. Đèn và còi trên kệ đang hoạt động.`,
      shelf,
    };
  }

  /**
   * Setup command retry with exponential backoff / timeout
   */
  private setupCommandRetry(code: ShelfCode, action: string, payload: any) {
    const key = `${code}:${action}`;
    const existing = this.pendingCommands.get(key);
    if (existing?.timer) clearTimeout(existing.timer);

    const pending: PendingCommand = {
      shelfCode: code,
      action,
      dispatchedAt: Date.now(),
      retries: 0,
      payload,
    };

    const scheduleTimeout = (attempt: number) => {
      pending.timer = setTimeout(async () => {
        if (attempt >= 2) {
          this.logger.warn(`Command [${action}] for shelf [${code}] timed out after 2 retries.`);
          this.pendingCommands.delete(key);
          return;
        }

        this.logger.log(`Retrying command [${action}] for shelf [${code}] (attempt ${attempt + 1})...`);
        pending.retries = attempt + 1;
        await this.mqttGateway.publishShelfCommand(payload);
        scheduleTimeout(attempt + 1);
      }, 5000);
    };

    scheduleTimeout(0);
    this.pendingCommands.set(key, pending);
  }

  /**
   * Smartkey horn chirp (bóp còi tìm kệ)
   */
  async chirpShelf(dto: ChirpShelfDto) {
    const code = this.normalizeShelfCode(dto.shelfCode);
    if (!code) {
      return { success: false, message: `Mã kệ không hợp lệ (${dto.shelfCode}). Chỉ hỗ trợ kệ A1, A2, A3.` };
    }

    const payload = {
      action: 'SMARTKEY_CHIRP',
      shelfCode: code,
      warehouseCode: dto.warehouseCode || 'WH-006',
      timestamp: Date.now(),
    };

    const published = await this.mqttGateway.publishShelfCommand(payload);

    this.addLog(
      code,
      'SMARTKEY_CHIRP',
      `Bóp còi Smartkey định vị kệ ${code}.`,
      payload,
    );
    this.syncStateAndPublish('chirped', code, payload);

    return {
      success: published,
      shelfCode: code,
      message: `Đã phát tín hiệu còi Smartkey tìm kệ ${code}.`,
    };
  }

  /**
   * Stop shelf (turn off LED & buzzer, set ARRIVED)
   */
  async stopShelf(dto: StopShelfDto) {
    const code = this.normalizeShelfCode(dto.shelfCode);
    if (!code) {
      return { success: false, message: `Mã kệ không hợp lệ (${dto.shelfCode}).` };
    }

    const shelf = this.shelves[code];
    shelf.status = 'ARRIVED';
    shelf.ledOn = false;
    shelf.buzzerOn = false;
    shelf.waitingCheckin = false;
    shelf.arrivedAt = new Date().toISOString();

    const payload = {
      action: 'OFF',
      shelfCode: code,
      warehouseCode: dto.warehouseCode || 'WH-006',
      timestamp: Date.now(),
    };

    const published = await this.mqttGateway.publishShelfCommand(payload);

    this.addLog(
      code,
      'STOP_PRESSED',
      `Tắt đèn và còi kệ ${code} qua thao tác App.`,
      payload,
    );
    this.syncStateAndPublish('stopped', code, payload);

    return {
      success: published,
      shelfCode: code,
      status: shelf.status,
      message: `Đã tắt tín hiệu kệ ${code}.`,
      shelf,
    };
  }

  /**
   * Complete shelf (called after barcode scan / staff completes picking item)
   */
  async completeShelf(dto: CompleteShelfDto) {
    const code = this.normalizeShelfCode(dto.shelfCode);
    if (!code) {
      return { success: false, message: `Mã kệ không hợp lệ (${dto.shelfCode}).` };
    }

    const shelf = this.shelves[code];
    shelf.status = 'COMPLETED';
    shelf.ledOn = false;
    shelf.buzzerOn = false;
    shelf.waitingCheckin = false;
    shelf.completedAt = new Date().toISOString();

    const payload = {
      action: 'OFF',
      shelfCode: code,
      warehouseCode: dto.warehouseCode || 'WH-006',
      timestamp: Date.now(),
    };

    const published = await this.mqttGateway.publishShelfCommand(payload);

    this.addLog(
      code,
      'ORDER_COMPLETED',
      `Hoàn thành lấy hàng tại kệ ${code}. Đơn hàng: ${shelf.orderId || dto.orderId || 'N/A'}.`,
      payload,
    );
    this.syncStateAndPublish('completed', code, payload);

    return {
      success: published,
      shelfCode: code,
      status: shelf.status,
      message: `Hoàn tất lấy hàng tại kệ ${code}.`,
      shelf,
    };
  }

  /**
   * Reset all 3 shelves to IDLE
   */
  async resetAllShelves() {
    for (const code of ['A1', 'A2', 'A3'] as ShelfCode[]) {
      this.shelves[code].status = 'IDLE';
      this.shelves[code].ledOn = false;
      this.shelves[code].buzzerOn = false;
      this.shelves[code].waitingCheckin = false;
      this.shelves[code].orderId = null;
      this.shelves[code].productName = null;
      this.shelves[code].qty = 0;
      this.shelves[code].activatedAt = null;
      this.shelves[code].arrivedAt = null;
      this.shelves[code].completedAt = null;
    }

    const payload = {
      action: 'RESET',
      timestamp: Date.now(),
    };

    const published = await this.mqttGateway.publishSystemCommand(payload);

    this.addLog(
      'ALL',
      'RESET',
      'Đặt lại toàn bộ 3 kệ A1, A2, A3 về trạng thái Sẵn sàng (IDLE).',
      payload,
    );
    this.syncStateAndPublish('reset', 'ALL', payload);

    return {
      success: published,
      message: 'Đã đặt lại toàn bộ 3 kệ hàng.',
      shelves: this.shelves,
    };
  }

  /**
   * Trigger simultaneous alarm on all 3 shelves (Blink & Beep)
   */
  async triggerAllShelvesAlarm(reason: string) {
    for (const code of ['A1', 'A2', 'A3'] as ShelfCode[]) {
      this.shelves[code].ledOn = true;
      this.shelves[code].buzzerOn = true;
    }

    const payload = {
      action: 'TEST',
      reason,
      timestamp: Date.now(),
    };

    const published = await this.mqttGateway.publishSystemCommand(payload);

    this.addLog(
      'ALL',
      'ALARM_TRIGGERED',
      `Báo động đồng loạt 3 kệ hàng! Lý do: ${reason}`,
      payload,
    );
    this.syncStateAndPublish('alarm', 'ALL', payload);

    return {
      success: published,
      message: 'Đã phát tín hiệu báo động đồng loạt 3 kệ.',
    };
  }

  /**
   * Silence all buzzers while keeping LEDs active
   */
  async silenceAllBuzzers() {
    for (const code of ['A1', 'A2', 'A3'] as ShelfCode[]) {
      this.shelves[code].buzzerOn = false;
    }

    // ESP32 turns off buzzers when action is OFF or silence command
    this.addLog(
      'ALL',
      'RESET',
      'Tạm tắt còi báo động trong 60 giây. Đèn cảnh báo vẫn duy trì.',
    );

    return { success: true, message: 'Đã tạm tắt còi báo động.' };
  }

  /**
   * Get current state of all shelves + connection info
   */
  getAllStatus() {
    const conn = this.mqttGateway.getConnectionStatus();
    return {
      shelves: this.shelves,
      mqtt: conn,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get recent hardware event logs
   */
  getEventLogs(limit = 30) {
    return this.eventLogs.slice(0, limit);
  }
}
