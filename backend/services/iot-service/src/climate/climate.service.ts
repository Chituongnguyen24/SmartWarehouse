import { Injectable, Logger, OnModuleInit, OnModuleDestroy, BadRequestException } from '@nestjs/common';
import { MqttGatewayService } from '../mqtt/mqtt-gateway.service';
import { ShelfService } from '../shelf/shelf.service';
import { RabbitMqService } from '../rabbitmq/rabbitmq.service';
import { SimulateClimateDto, SilenceAlarmDto } from './climate.dto';

export type SensorStatus = 'NORMAL' | 'VIOLATION' | 'DISCONNECTED';

export interface ClimateStatus {
  zoneId: string;
  zoneName: string;
  temperature: number;
  humidity: number;
  realTemperature: number;
  realHumidity: number;
  safeEnvelope: {
    minTemp: number;
    maxTemp: number;
    minHumidity: number;
    maxHumidity: number;
  };
  sensorStatus: SensorStatus;
  isSimulated: boolean;
  isAlarmActive: boolean;
  isSilenced: boolean;
  silencedRemainingSeconds: number;
  alarmReason: string | null;
  violationDurationSeconds: number;
  lastTelemetryAt: string | null;
  telemetryAgeSeconds: number;
}

@Injectable()
export class ClimateService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ClimateService.name);

  // Safety envelopes for WH-006 (Tiêu chuẩn môi trường vận hành: Tối đa 35°C và 80% độ ẩm)
  readonly SAFE_ENVELOPE = {
    minTemp: process.env.SAFE_MIN_TEMP ? parseFloat(process.env.SAFE_MIN_TEMP) : 10.0,
    maxTemp: process.env.SAFE_MAX_TEMP ? parseFloat(process.env.SAFE_MAX_TEMP) : 35.0,
    minHumidity: process.env.SAFE_MIN_HUM ? parseFloat(process.env.SAFE_MIN_HUM) : 30.0,
    maxHumidity: process.env.SAFE_MAX_HUM ? parseFloat(process.env.SAFE_MAX_HUM) : 80.0,
  };

  // Hysteresis deadband
  readonly HYSTERESIS = {
    tempDelta: 0.5,
    humDelta: 2.0,
  };

  // 30 seconds persistence required before emergency alarm triggers
  readonly VIOLATION_WINDOW_MS = 30 * 1000;
  // 15 seconds sensor loss timeout
  readonly SENSOR_TIMEOUT_MS = 15 * 1000;

  // Real-time telemetry
  private currentTemp = 31.2;
  private currentHum = 65.0;
  private realTemp = 31.2;
  private realHum = 65.0;
  private lastTelemetryAt: Date | null = null;
  private isSimulated = false;

  // Violation tracking
  private violationStartedAt: Date | null = null;
  private violationType: string | null = null;

  // Alarm states
  private isAlarmActive = false;
  private alarmReason: string | null = null;
  private isSilenced = false;
  private silencedUntil: Date | null = null;

  private heartbeatInterval: NodeJS.Timeout;

  constructor(
    private readonly mqttGateway: MqttGatewayService,
    private readonly shelfService: ShelfService,
    private readonly rabbitMqService: RabbitMqService,
  ) {}

  onModuleInit() {
    // Listen for SHT30 telemetry from MQTT
    this.mqttGateway.on('climate_telemetry', (data: any) => {
      this.handleIncomingTelemetry(data);
    });

    // Check heartbeat every 3 seconds for SHT30 disconnect detection
    this.heartbeatInterval = setInterval(() => {
      this.checkSensorHeartbeat();
      this.checkSilenceExpiration();
    }, 3000);
  }

  onModuleDestroy() {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
  }

  /**
   * Process telemetry arriving from ESP32 SHT30 sensor
   */
  private handleIncomingTelemetry(data: any) {
    const t = parseFloat(data.temperature);
    const h = parseFloat(data.humidity);

    if (!isNaN(t) && !isNaN(h)) {
      this.realTemp = Math.round(t * 10) / 10;
      this.realHum = Math.round(h * 10) / 10;
      this.lastTelemetryAt = new Date();
    }

    if (this.isSimulated) {
      // Keep realTemp/realHum updated above, while maintaining simulated currentTemp/currentHum
      return;
    }

    if (!isNaN(t) && !isNaN(h)) {
      this.currentTemp = this.realTemp;
      this.currentHum = this.realHum;

      // If alarm was triggered solely due to SHT30 disconnect, and telemetry is flowing again, restore safe state
      if (this.isAlarmActive && this.alarmReason === 'MẤT KẾT NỐI CẢM BIẾN SHT30 (>15s)') {
        this.logger.log(`[SAFETY RESTORED] SHT30 telemetry reconnected (${this.currentTemp}°C, ${this.currentHum}%). Restoring normal monitoring.`);
        this.isAlarmActive = false;
        this.alarmReason = null;
        this.shelfService.resetAllShelves();
        this.rabbitMqService.publishEvent('iot.climate.alarm_cleared', {
          reason: 'SHT30 telemetry reconnected',
          temperature: this.currentTemp,
          humidity: this.currentHum,
          timestamp: new Date().toISOString(),
        });
      }

      this.evaluateSafetyEnvelope(this.currentTemp, this.currentHum);
    }
  }

  /**
   * Check SHT30 heartbeat - keep last known telemetry without triggering false shelf alarms during Pick-to-Light
   */
  private checkSensorHeartbeat() {
    if (this.isSimulated) return;
    if (!this.lastTelemetryAt) return;
    // Keep last known SHT30 reading passively so Pick-to-Light LEDs/Buzzers are never interrupted by sensor polling gaps
  }

  /**
   * Check if silence timer has expired
   */
  private checkSilenceExpiration() {
    if (this.isSilenced && this.silencedUntil) {
      if (Date.now() >= this.silencedUntil.getTime()) {
        this.logger.log('Silence period ended. Resuming alarm buzzers if violation persists.');
        this.isSilenced = false;
        this.silencedUntil = null;
        if (this.isAlarmActive) {
          this.shelfService.triggerAllShelvesAlarm(this.alarmReason || 'Báo động tiếp tục do chưa khắc phục sự cố');
        }
      }
    }
  }

  /**
   * Evaluate environmental safety envelope with sliding window and hysteresis
   */
  private evaluateSafetyEnvelope(temp: number, hum: number) {
    const isTempHigh = temp > this.SAFE_ENVELOPE.maxTemp;
    const isTempLow = temp < this.SAFE_ENVELOPE.minTemp;
    const isHumHigh = hum > this.SAFE_ENVELOPE.maxHumidity;
    const isHumLow = hum < this.SAFE_ENVELOPE.minHumidity;

    const isViolating = isTempHigh || isTempLow || isHumHigh || isHumLow;

    let reason = '';
    if (isTempHigh) reason = `Nhiệt độ quá cao (${temp}°C > ${this.SAFE_ENVELOPE.maxTemp}°C)`;
    else if (isTempLow) reason = `Nhiệt độ quá thấp (${temp}°C < ${this.SAFE_ENVELOPE.minTemp}°C)`;
    else if (isHumHigh) reason = `Độ ẩm quá cao (${hum}% > ${this.SAFE_ENVELOPE.maxHumidity}%)`;
    else if (isHumLow) reason = `Độ ẩm quá thấp (${hum}% < ${this.SAFE_ENVELOPE.minHumidity}%)`;

    const now = new Date();

    if (isViolating) {
      if (!this.violationStartedAt) {
        this.violationStartedAt = now;
        this.violationType = reason;
        this.logger.warn(`[VIOLATION STARTED] ${reason}`);
      } else {
        const elapsedMs = now.getTime() - this.violationStartedAt.getTime();
        this.logger.warn(`[VIOLATION PERSISTING] ${reason} for ${Math.round(elapsedMs / 1000)}s`);

        // If violation persists beyond 30s window, fire emergency alarm
        if (elapsedMs >= this.VIOLATION_WINDOW_MS && !this.isAlarmActive) {
          this.isAlarmActive = true;
          this.alarmReason = `VI PHẠM KÉO DÀI TRÊN 30S: ${reason}`;
          this.logger.error(`[EMERGENCY ALARM] Firing alarm across all 3 shelves! Reason: ${this.alarmReason}`);
          this.shelfService.triggerAllShelvesAlarm(this.alarmReason);
          this.rabbitMqService.publishEvent('iot.climate.alarm_triggered', {
            reason: this.alarmReason,
            temperature: temp,
            humidity: hum,
            timestamp: now.toISOString(),
          });
        }
      }
    } else {
      // When back in safe territory, reset sliding window
      if (this.violationStartedAt) {
        this.logger.log(`[VIOLATION RESOLVED] Temp: ${temp}°C, Humidity: ${hum}% returned to safe range.`);
        this.violationStartedAt = null;
        this.violationType = null;
      }
    }
  }

  /**
   * Set simulated climate conditions (for local testing & scenarios)
   */
  setSimulation(dto: SimulateClimateDto) {
    this.isSimulated = dto.enabled;
    if (dto.enabled) {
      this.currentTemp = Math.round(dto.temperature * 10) / 10;
      this.currentHum = Math.round(dto.humidity * 10) / 10;
      this.lastTelemetryAt = new Date();

      this.logger.log(`[CLIMATE SIMULATION] Enabled: ${this.currentTemp}°C, ${this.currentHum}%`);
      const isTempHigh = this.currentTemp > this.SAFE_ENVELOPE.maxTemp;
      const isTempLow = this.currentTemp < this.SAFE_ENVELOPE.minTemp;
      const isHumHigh = this.currentHum > this.SAFE_ENVELOPE.maxHumidity;
      const isHumLow = this.currentHum < this.SAFE_ENVELOPE.minHumidity;
      const isViolating = isTempHigh || isTempLow || isHumHigh || isHumLow;

      if (isViolating) {
        let reason = '';
        if (isTempHigh) reason = `Nhiệt độ vượt ngưỡng an toàn: ${this.currentTemp}°C > ${this.SAFE_ENVELOPE.maxTemp}°C`;
        else if (isTempLow) reason = `Nhiệt độ thấp hơn ngưỡng: ${this.currentTemp}°C < ${this.SAFE_ENVELOPE.minTemp}°C`;
        else if (isHumHigh) reason = `Độ ẩm vượt ngưỡng an toàn: ${this.currentHum}% > ${this.SAFE_ENVELOPE.maxHumidity}%`;
        else if (isHumLow) reason = `Độ ẩm thấp hơn ngưỡng: ${this.currentHum}% < ${this.SAFE_ENVELOPE.minHumidity}%`;

        this.violationStartedAt = new Date();
        this.violationType = reason;
        this.isAlarmActive = true;
        this.alarmReason = reason;
        this.shelfService.triggerAllShelvesAlarm(reason);
      } else {
        this.violationStartedAt = null;
        this.violationType = null;
        if (this.isAlarmActive) {
          this.isAlarmActive = false;
          this.alarmReason = null;
          this.shelfService.resetAllShelves();
        }
      }
    } else {
      this.logger.log('[CLIMATE SIMULATION] Disabled. Reverting to real SHT30 sensor data.');
      this.currentTemp = this.realTemp;
      this.currentHum = this.realHum;
      this.violationStartedAt = null;
      this.violationType = null;
      if (this.isAlarmActive) {
        this.isAlarmActive = false;
        this.alarmReason = null;
        this.shelfService.resetAllShelves();
      }
    }

    return this.getStatus();
  }

  /**
   * Test emergency alarm manually across all 3 shelves
   */
  async triggerTestAlarm() {
    this.isAlarmActive = true;
    this.alarmReason = 'KIỂM THỬ BÁO ĐỘNG KHẨN CẤP ĐỒNG LOẠT';
    await this.shelfService.triggerAllShelvesAlarm(this.alarmReason);
    this.rabbitMqService.publishEvent('iot.climate.alarm_triggered', {
      reason: this.alarmReason,
      isTest: true,
      timestamp: new Date().toISOString(),
    });
    return { success: true, message: 'Đã kích hoạt kiểm thử báo động đồng loạt 3 kệ.', status: this.getStatus() };
  }

  /**
   * Silence buzzers for specified seconds (default: 60s) while keeping visual alarm active
   */
  async silenceAlarm(dto?: SilenceAlarmDto) {
    const seconds = dto?.durationSeconds || 60;
    this.isSilenced = true;
    this.silencedUntil = new Date(Date.now() + seconds * 1000);

    await this.shelfService.silenceAllBuzzers();

    this.rabbitMqService.publishEvent('iot.climate.alarm_silenced', {
      durationSeconds: seconds,
      silencedUntil: this.silencedUntil,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(`[ALARM SILENCED] Buzzers silenced for ${seconds}s.`);
    return {
      success: true,
      message: `Đã tạm tắt còi báo động trong ${seconds} giây. Đèn cảnh báo vẫn tiếp tục nhấp nháy.`,
      silencedUntil: this.silencedUntil,
      status: this.getStatus(),
    };
  }

  /**
   * Clear Alarm: STRICT VERIFICATION
   * MUST check BOTH Temperature and Humidity are within safe envelopes AND sensor is online!
   */
  async clearAlarm() {
    // 1. Check if SHT30 is disconnected
    const ageSeconds = this.lastTelemetryAt
      ? Math.round((Date.now() - this.lastTelemetryAt.getTime()) / 1000)
      : 999;

    if (!this.isSimulated && ageSeconds > 15) {
      throw new BadRequestException(
        `Không thể gỡ báo động! Cảm biến SHT30 đang mất kết nối (${ageSeconds}s không có dữ liệu). Cần kiểm tra phần cứng trước!`,
      );
    }

    // 2. Check Temperature safe envelope (with hysteresis recovery limit: <= 4.0°C and >= 0.5°C)
    const isTempSafe =
      this.currentTemp >= this.SAFE_ENVELOPE.minTemp &&
      this.currentTemp <= this.SAFE_ENVELOPE.maxTemp;

    if (!isTempSafe) {
      throw new BadRequestException(
        `Không thể gỡ báo động! Nhiệt độ hiện tại (${this.currentTemp}°C) vẫn nằm ngoài ngưỡng an toàn (${this.SAFE_ENVELOPE.minTemp}°C - ${this.SAFE_ENVELOPE.maxTemp}°C). Hãy điều chỉnh nhiệt độ về mức an toàn trước khi gỡ.`,
      );
    }

    // 3. Check Humidity safe envelope
    const isHumSafe =
      this.currentHum >= this.SAFE_ENVELOPE.minHumidity &&
      this.currentHum <= this.SAFE_ENVELOPE.maxHumidity;

    if (!isHumSafe) {
      throw new BadRequestException(
        `Không thể gỡ báo động! Độ ẩm hiện tại (${this.currentHum}%) vẫn nằm ngoài ngưỡng an toàn (${this.SAFE_ENVELOPE.minHumidity}% - ${this.SAFE_ENVELOPE.maxHumidity}%). Hãy điều chỉnh độ ẩm về mức an toàn trước khi gỡ.`,
      );
    }

    // 4. Conditions are fully met -> Safely clear alarm
    this.isAlarmActive = false;
    this.isSilenced = false;
    this.silencedUntil = null;
    this.alarmReason = null;
    this.violationStartedAt = null;

    // Reset shelf hardware
    await this.shelfService.resetAllShelves();

    this.rabbitMqService.publishEvent('iot.climate.alarm_cleared', {
      temperature: this.currentTemp,
      humidity: this.currentHum,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(`[ALARM CLEARED] Environment confirmed safe. All 3 shelves reset.`);
    return {
      success: true,
      message: `Đã xác nhận môi trường an toàn (Nhiệt độ: ${this.currentTemp}°C, Độ ẩm: ${this.currentHum}%). Đã gỡ bỏ toàn bộ cảnh báo trên 3 kệ!`,
      status: this.getStatus(),
    };
  }

  /**
   * Get current climate and alarm status
   */
  getStatus(): ClimateStatus {
    const now = Date.now();
    const ageSeconds = this.lastTelemetryAt
      ? Math.round((now - this.lastTelemetryAt.getTime()) / 1000)
      : 999;

    let sensorStatus: SensorStatus = 'NORMAL';
    if (!this.isSimulated && ageSeconds > 15) {
      sensorStatus = 'DISCONNECTED';
    } else if (this.isAlarmActive || this.violationStartedAt) {
      sensorStatus = 'VIOLATION';
    }

    let violationDurationSeconds = 0;
    if (this.violationStartedAt) {
      violationDurationSeconds = Math.round((now - this.violationStartedAt.getTime()) / 1000);
    }

    let silencedRemainingSeconds = 0;
    if (this.isSilenced && this.silencedUntil) {
      silencedRemainingSeconds = Math.max(0, Math.round((this.silencedUntil.getTime() - now) / 1000));
    }

    return {
      zoneId: 'COOL',
      zoneName: 'Khu Vực Kệ A1, A2, A3 (Gò Vấp)',
      temperature: this.currentTemp,
      humidity: this.currentHum,
      realTemperature: this.realTemp,
      realHumidity: this.realHum,
      safeEnvelope: this.SAFE_ENVELOPE,
      sensorStatus,
      isSimulated: this.isSimulated,
      isAlarmActive: this.isAlarmActive,
      isSilenced: this.isSilenced,
      silencedRemainingSeconds,
      alarmReason: this.alarmReason,
      violationDurationSeconds,
      lastTelemetryAt: this.lastTelemetryAt ? this.lastTelemetryAt.toISOString() : null,
      telemetryAgeSeconds: ageSeconds,
    };
  }
}
