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
  step: number | null;
  totalSteps: number | null;
  stopSeq: number;
  lastStopEventId: string | null;
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
      label: 'Kệ A (Tầng 1 & Tầng 2)',
      zone: 'KHO GÒ VẤP (Kệ A - Thực phẩm tươi)',
      pinInfo: { ledPin: 25, buzzerPin: 18, buttonPin: 27 },
      status: 'IDLE',
      ledOn: false,
      buzzerOn: false,
      waitingCheckin: false,
      orderId: null,
      productName: null,
      qty: 0,
      step: null,
      totalSteps: null,
      stopSeq: 0,
      lastStopEventId: null,
      activatedAt: null,
      arrivedAt: null,
      completedAt: null,
      lastAckAt: null,
    },
    A2: {
      code: 'A2',
      label: 'Kệ B (Tầng 1 & Tầng 2)',
      zone: 'KHO GÒ VẤP (Kệ B - Sữa & Chế phẩm)',
      pinInfo: { ledPin: 26, buzzerPin: 19, buttonPin: 14 },
      status: 'IDLE',
      ledOn: false,
      buzzerOn: false,
      waitingCheckin: false,
      orderId: null,
      productName: null,
      qty: 0,
      step: null,
      totalSteps: null,
      stopSeq: 0,
      lastStopEventId: null,
      activatedAt: null,
      arrivedAt: null,
      completedAt: null,
      lastAckAt: null,
    },
    A3: {
      code: 'A3',
      label: 'Kệ C (Tầng 1 & Tầng 2)',
      zone: 'KHO GÒ VẤP (Kệ C - Rau củ & Trái cây)',
      pinInfo: { ledPin: 32, buzzerPin: 23, buttonPin: 33 },
      status: 'IDLE',
      ledOn: false,
      buzzerOn: false,
      waitingCheckin: false,
      orderId: null,
      productName: null,
      qty: 0,
      step: null,
      totalSteps: null,
      stopSeq: 0,
      lastStopEventId: null,
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
  private buzzerEnabled = true;

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

    // Re-sync current buzzer mode whenever ESP32 connects or boots
    this.mqttGateway.on('esp32_ready', () => {
      this.mqttGateway
        .publishSystemCommand({
          action: 'SET_BUZZER',
          enabled: this.buzzerEnabled,
          muted: !this.buzzerEnabled,
          timestamp: Date.now(),
        })
        .catch(() => {});
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
          for (const code of ['A1', 'A2', 'A3'] as ShelfCode[]) {
            if (parsed?.[code]) {
              this.shelves[code] = {
                ...this.shelves[code],
                ...parsed[code],
                stopSeq: typeof parsed[code].stopSeq === 'number' ? parsed[code].stopSeq : 0,
                lastStopEventId: parsed[code].lastStopEventId ?? null,
                step: parsed[code].step ?? null,
                totalSteps: parsed[code].totalSteps ?? null,
              };
            }
          }
          this.logger.log('Restored shelf state from Redis cache (iot:shelves:wh006).');
        }
        const cachedBuzzer = await this.redisClient.get('iot:shelves:wh006:buzzer_enabled');
        if (cachedBuzzer !== null) {
          this.buzzerEnabled = cachedBuzzer !== 'false';
          this.logger.log(`Restored buzzerEnabled=${this.buzzerEnabled} from Redis.`);
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

  // Normalize shelf code strictly for 3 IoT Shelves: Kệ A (-> A1), Kệ B (-> A2), Kệ C (-> A3)
  normalizeShelfCode(input: string): ShelfCode | null {
    if (!input) return null;
    const clean = input.toUpperCase().trim();
    if (clean === 'A1' || clean === '1' || clean === 'A' || clean === 'A-T1' || clean === 'A-T2') return 'A1';
    if (clean === 'A2' || clean === '2' || clean === 'B' || clean === 'B1' || clean === 'B2' || clean === 'B-T1' || clean === 'B-T2') return 'A2';
    if (clean === 'A3' || clean === '3' || clean === 'C' || clean === 'C1' || clean === 'C2' || clean === 'C-T1' || clean === 'C-T2') return 'A3';

    if (/(?:^|[^A-Z0-9])B[-_ ]*T?[12](?:$|[^0-9])/.test(clean) || /(?:KỆ|KE)[-_ ]*B/.test(clean)) return 'A2';
    if (/(?:^|[^A-Z0-9])C[-_ ]*T?[12](?:$|[^0-9])/.test(clean) || /(?:KỆ|KE)[-_ ]*C/.test(clean)) return 'A3';
    if (/(?:^|[^A-Z0-9])A[-_ ]*T[12](?:$|[^0-9])/.test(clean)) return 'A1';

    const directA = clean.match(/(?:^|[^A-Z0-9])A([123])(?:$|[^0-9])/);
    if (directA) return `A${directA[1]}` as ShelfCode;

    // Match RACK-COOL, COLD-SHELF, COOL, KỆ A, KE A followed strictly by 1, 2, 3
    const match = clean.match(/(?:RACK[-_ ]*COOL|COLD[-_ ]*SHELF|COOL|(?:KỆ|KE)[-_ ]*A)[-_ ]*0?([123])(?:$|[^0-9])/);
    if (match) {
      const num = match[1];
      if (num === '1') return 'A1';
      if (num === '2') return 'A2';
      if (num === '3') return 'A3';
    }

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

    if (
      eventName === 'CONFIRMED' ||
      eventName === 'STAFF_ARRIVED' ||
      eventName === 'STOP_PRESSED' ||
      eventName === 'STOP' ||
      eventName === 'ARRIVED'
    ) {
      // Physical STOP button was pressed at shelf!
      // Increment monotonic stopSeq so sequential guided picking detects every press reliably
      shelf.stopSeq = (shelf.stopSeq || 0) + 1;
      shelf.lastStopEventId = `stop-${code}-${shelf.stopSeq}-${Date.now()}`;
      shelf.status = 'ARRIVED';
      shelf.ledOn = false;
      shelf.buzzerOn = false;
      shelf.waitingCheckin = false;
      shelf.arrivedAt = nowIso;

      this.addLog(
        code,
        'STOP_PRESSED',
        `Nhân viên đã đến kệ ${code} và bấm nút STOP vật lý (#${shelf.stopSeq}). Đèn và còi đã tắt.`,
        { ...event, stopSeq: shelf.stopSeq, lastStopEventId: shelf.lastStopEventId },
      );
      this.syncStateAndPublish('arrived', code, { ...event, stopSeq: shelf.stopSeq, lastStopEventId: shelf.lastStopEventId });
    } else if (eventName === 'LOCATING') {
      // If shelf was already stopped, arrived or completed, ignore lagging LOCATING ack
      if (shelf.status === 'ARRIVED' || shelf.status === 'COMPLETED' || shelf.status === 'IDLE') {
        this.logger.log(`Ignoring delayed LOCATING event for shelf ${code} because current status is ${shelf.status}.`);
        return;
      }

      shelf.status = 'LOCATING';
      shelf.ledOn = true;
      shelf.buzzerOn = this.buzzerEnabled;
      shelf.waitingCheckin = true;
      if (!shelf.activatedAt) shelf.activatedAt = nowIso;

      this.addLog(
        code,
        'COMMAND_DISPATCHED',
        this.buzzerEnabled
          ? `ESP32 đã nhận lệnh định vị kệ ${code}. Đèn và còi đang hoạt động.`
          : `ESP32 đã nhận lệnh định vị kệ ${code}. Đang bật chỉ sáng đèn.`,
        event,
      );
      this.syncStateAndPublish('locating', code, event);
    }
  }

  /**
   * Dispatch LOCATE command to shelf (exclusively 1 active shelf at a time among A1, A2, A3)
   */
  async locateShelf(dto: LocateShelfDto) {
    const code = this.normalizeShelfCode(dto.shelfCode);
    if (!code) {
      return { success: false, message: `Mã kệ không hợp lệ (${dto.shelfCode}). Chỉ hỗ trợ 3 kệ demo IoT: A1, A2, A3.` };
    }

    // Clear pending retry timers & turn off locating state on the other 2 shelves to match ESP32 single-shelf mode
    for (const otherCode of ['A1', 'A2', 'A3'] as ShelfCode[]) {
      if (otherCode !== code) {
        const otherKey = `${otherCode}:LOCATE`;
        const otherPending = this.pendingCommands.get(otherKey);
        if (otherPending?.timer) clearTimeout(otherPending.timer);
        this.pendingCommands.delete(otherKey);

        if (this.shelves[otherCode].status === 'LOCATING' || this.shelves[otherCode].ledOn || this.shelves[otherCode].buzzerOn) {
          this.shelves[otherCode].status = 'IDLE';
          this.shelves[otherCode].ledOn = false;
          this.shelves[otherCode].buzzerOn = false;
          this.shelves[otherCode].waitingCheckin = false;
        }
      }
    }

    const shelf = this.shelves[code];
    const nowIso = new Date().toISOString();
    const effectiveBuzzer =
      typeof dto.buzzerEnabled === 'boolean' ? dto.buzzerEnabled : this.buzzerEnabled;

    shelf.status = 'LOCATING';
    shelf.ledOn = true;
    shelf.buzzerOn = effectiveBuzzer;
    shelf.waitingCheckin = true;
    shelf.orderId = dto.orderId || shelf.orderId || 'ORD-STAFF';
    shelf.productName = dto.productName || shelf.productName || shelf.label;
    shelf.qty = dto.qty || shelf.qty || 1;
    shelf.step = dto.step ?? null;
    shelf.totalSteps = dto.totalSteps ?? null;
    shelf.activatedAt = nowIso;
    shelf.arrivedAt = null;

    const payload = {
      action: 'LOCATE',
      shelfCode: code,
      orderId: shelf.orderId,
      productName: shelf.productName,
      qty: shelf.qty,
      step: shelf.step || 1,
      totalSteps: shelf.totalSteps || 1,
      slotCode: dto.slotCode || `${code}-01`,
      warehouseCode: dto.warehouseCode || 'WH-006',
      buzzerEnabled: effectiveBuzzer,
      muteBuzzer: !effectiveBuzzer,
      timestamp: Date.now(),
    };

    // Clear any existing retry timer for this shelf before dispatching
    const existingPending = this.pendingCommands.get(`${code}:LOCATE`);
    if (existingPending?.timer) clearTimeout(existingPending.timer);
    this.pendingCommands.delete(`${code}:LOCATE`);

    const published = await this.mqttGateway.publishShelfCommand(payload);

    this.addLog(
      code,
      'COMMAND_DISPATCHED',
      `Phát lệnh định vị kệ ${code} (${shelf.productName || shelf.label})${shelf.step && shelf.totalSteps ? ` — Bước ${shelf.step}/${shelf.totalSteps}` : ''}. ${effectiveBuzzer ? 'Bật đèn và còi.' : 'Chỉ sáng đèn.'}`,
      payload,
    );
    this.syncStateAndPublish('located', code, payload);

    return {
      success: published,
      shelfCode: code,
      status: shelf.status,
      buzzerEnabled: effectiveBuzzer,
      stopSeq: shelf.stopSeq || 0,
      message: effectiveBuzzer
        ? `Đã phát lệnh định vị kệ ${code}. Đèn và còi trên kệ đang hoạt động.`
        : `Đã phát lệnh định vị kệ ${code}. Chỉ bật đèn dẫn hướng trên kệ.`,
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
      buzzerEnabled: this.buzzerEnabled,
      muteBuzzer: !this.buzzerEnabled,
      timestamp: Date.now(),
    };

    const published = await this.mqttGateway.publishShelfCommand(payload);

    this.addLog(
      code,
      'SMARTKEY_CHIRP',
      this.buzzerEnabled
        ? `Phát tín hiệu đèn và còi định vị kệ ${code}.`
        : `Nháy đèn định vị kệ ${code} (đang tắt còi).`,
      payload,
    );
    this.syncStateAndPublish('chirped', code, payload);

    return {
      success: published,
      shelfCode: code,
      buzzerEnabled: this.buzzerEnabled,
      message: this.buzzerEnabled
        ? `Đã phát tín hiệu đèn và còi tìm kệ ${code}.`
        : `Đã nháy đèn tìm kệ ${code} (chế độ chỉ sáng đèn).`,
    };
  }

  /**
   * Stop shelf (turn off LED & buzzer, set ARRIVED)
   */
  async stopShelf(dto: StopShelfDto) {
    if (!dto.shelfCode || dto.shelfCode.toUpperCase().includes('ALL')) {
      return this.resetAllShelves();
    }

    const code = this.normalizeShelfCode(dto.shelfCode);
    if (!code) {
      return { success: false, message: `Mã kệ không hợp lệ (${dto.shelfCode}).` };
    }

    // Clear pending retry timer so it won't re-activate shelf after user stopped it
    const pendingKey = `${code}:LOCATE`;
    if (this.pendingCommands.has(pendingKey)) {
      const pending = this.pendingCommands.get(pendingKey);
      if (pending?.timer) clearTimeout(pending.timer);
      this.pendingCommands.delete(pendingKey);
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

    // Parallel dispatch for instant zero-latency turn-off
    const [published] = await Promise.all([
      this.mqttGateway.publishShelfCommand(payload),
      this.mqttGateway.publishShelfCommand({
        action: 'SCAN_COMPLETED',
        shelfCode: code,
        warehouseCode: dto.warehouseCode || 'WH-006',
        timestamp: Date.now(),
      }),
    ]);

    this.addLog(
      code,
      'STOP_PRESSED',
      `Tắt đèn và còi kệ ${code} qua thao tác App.`,
      payload,
    );
    this.syncStateAndPublish('stopped', code, payload).catch(() => {});

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

    // Clear pending retry if exists
    const pendingKey = `${code}:LOCATE`;
    if (this.pendingCommands.has(pendingKey)) {
      const pending = this.pendingCommands.get(pendingKey);
      if (pending?.timer) clearTimeout(pending.timer);
      this.pendingCommands.delete(pendingKey);
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

    // Also dispatch SCAN_COMPLETED so firmware running currently on ESP32 instantly turns off
    await this.mqttGateway.publishShelfCommand({
      action: 'SCAN_COMPLETED',
      shelfCode: code,
      warehouseCode: dto.warehouseCode || 'WH-006',
      timestamp: Date.now(),
    });

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
    // Clear all pending command timers
    for (const [key, pending] of this.pendingCommands.entries()) {
      if (pending?.timer) clearTimeout(pending.timer);
    }
    this.pendingCommands.clear();

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
      forceBuzzer: true,
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
   * Toggle buzzer mode during picking (true = LED + Buzzer, false = LED only)
   */
  async setBuzzerMode(enabled: boolean) {
    this.buzzerEnabled = !!enabled;

    for (const code of ['A1', 'A2', 'A3'] as ShelfCode[]) {
      if (this.shelves[code].ledOn || this.shelves[code].status === 'LOCATING') {
        this.shelves[code].buzzerOn = this.buzzerEnabled;
      } else {
        this.shelves[code].buzzerOn = false;
      }
    }

    try {
      if (this.redisClient?.status === 'ready') {
        await this.redisClient.set('iot:shelves:wh006:buzzer_enabled', String(this.buzzerEnabled));
      }
    } catch (err: any) {
      this.logger.warn(`Failed to persist buzzerEnabled to Redis: ${err.message}`);
    }

    const payload = {
      action: 'SET_BUZZER',
      enabled: this.buzzerEnabled,
      muted: !this.buzzerEnabled,
      timestamp: Date.now(),
    };

    const published = await this.mqttGateway.publishSystemCommand(payload);

    this.addLog(
      'ALL',
      'COMMAND_DISPATCHED',
      this.buzzerEnabled
        ? 'Đã bật còi báo khi định vị lấy hàng.'
        : 'Đã tắt còi báo — Chế độ chỉ sáng đèn khi lấy hàng.',
      payload,
    );
    this.syncStateAndPublish('buzzer_mode', 'ALL', { buzzerEnabled: this.buzzerEnabled }).catch(() => {});

    return {
      success: published,
      buzzerEnabled: this.buzzerEnabled,
      message: this.buzzerEnabled
        ? 'Đã bật chế độ Đèn và Còi khi lấy hàng.'
        : 'Đã bật chế độ Chỉ sáng đèn khi lấy hàng.',
      shelves: this.shelves,
    };
  }

  /**
   * Silence all buzzers while keeping LEDs active
   */
  async silenceAllBuzzers() {
    for (const code of ['A1', 'A2', 'A3'] as ShelfCode[]) {
      this.shelves[code].buzzerOn = false;
    }

    await this.mqttGateway.publishSystemCommand({
      action: 'SET_BUZZER',
      enabled: false,
      muted: true,
      timestamp: Date.now(),
    });

    this.addLog(
      'ALL',
      'RESET',
      'Tạm tắt còi báo động. Đèn cảnh báo vẫn duy trì.',
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
      buzzerEnabled: this.buzzerEnabled,
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
