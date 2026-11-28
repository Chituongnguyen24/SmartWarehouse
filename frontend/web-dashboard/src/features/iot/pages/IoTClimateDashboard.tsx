import React, { useState, useEffect, useCallback } from 'react';
import {
  Thermometer,
  Droplets,
  Wifi,
  WifiOff,
  RefreshCw,
  Volume2,
  VolumeX,
  Lightbulb,
  Radio,
  AlertTriangle,
  Sliders,
  RotateCcw,
  X,
  ShieldCheck,
} from 'lucide-react';
import { API_HOSTS } from '@/shared/utils/apiConfig';
import { useAuth } from '@/features/auth';

type HwShelfCode = 'A1' | 'A2' | 'A3';

interface ClimateStatus {
  temperature: number;
  humidity: number;
  realTemperature?: number;
  realHumidity?: number;
  safeEnvelope?: {
    minTemp: number;
    maxTemp: number;
    minHumidity: number;
    maxHumidity: number;
  };
  sensorStatus: 'NORMAL' | 'VIOLATION' | 'DISCONNECTED';
  isSimulated?: boolean;
  isAlarmActive?: boolean;
  alarmReason?: string | null;
}

interface ShelfDetail {
  code: string;
  status: 'IDLE' | 'LOCATING' | 'ARRIVED' | 'COMPLETED';
  ledOn: boolean;
  buzzerOn: boolean;
  waitingCheckin: boolean;
  orderId?: string | null;
  productName?: string | null;
}

interface ShelfStatusResponse {
  shelves: Record<string, ShelfDetail>;
  buzzerEnabled?: boolean;
  mqtt: {
    connected: boolean;
  };
}

interface RackRowSpec {
  hwCode: HwShelfCode;
  rackName: string;
  tiers: [string, string];
  zoneName: string;
  btnColor: string;
  activeRowBg: string;
  activeText: string;
  activeBorder: string;
}

const RACK_LIST: RackRowSpec[] = [
  {
    hwCode: 'A1',
    rackName: 'Kệ A',
    tiers: ['A1', 'A2'],
    zoneName: 'Khu Mát — Sữa & Chế phẩm',
    btnColor: '#dc2626',
    activeRowBg: '#fef2f2',
    activeText: '#991b1b',
    activeBorder: '#fecaca',
  },
  {
    hwCode: 'A2',
    rackName: 'Kệ B',
    tiers: ['B1', 'B2'],
    zoneName: 'Khu Thịt Tươi & Thủy Sản',
    btnColor: '#0284c7',
    activeRowBg: '#f0f9ff',
    activeText: '#075985',
    activeBorder: '#bae6fd',
  },
  {
    hwCode: 'A3',
    rackName: 'Kệ C',
    tiers: ['C1', 'C2'],
    zoneName: 'Khu Rau Củ & Trái Cây',
    btnColor: '#16a34a',
    activeRowBg: '#f0fdf4',
    activeText: '#166534',
    activeBorder: '#bbf7d0',
  },
];

export const IoTClimateDashboard: React.FC = () => {
  const { token } = useAuth();
  const iotBaseUrl = API_HOSTS.IOT;

  const [climate, setClimate] = useState<ClimateStatus | null>(null);
  const [shelvesData, setShelvesData] = useState<ShelfStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Simulation Pop-up Modal State
  const [isSimModalOpen, setIsSimModalOpen] = useState<boolean>(false);
  const [customTemp, setCustomTemp] = useState<string>('38.0');
  const [customHum, setCustomHum] = useState<string>('65');

  const getHeaders = useCallback(() => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  }, [token]);

  const fetchStatus = useCallback(async () => {
    try {
      const [climateRes, shelfRes] = await Promise.all([
        fetch(`${iotBaseUrl}/climate/status`, { headers: getHeaders() }).then((r) => (r.ok ? r.json() : null)),
        fetch(`${iotBaseUrl}/shelf/status`, { headers: getHeaders() }).then((r) => (r.ok ? r.json() : null)),
      ]);
      if (climateRes) setClimate(climateRes);
      if (shelfRes) setShelvesData(shelfRes);
    } catch {
      // silent
    } finally {
      setIsLoading(false);
    }
  }, [iotBaseUrl, getHeaders]);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 2000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const handleTurnOnShelf = async (spec: RackRowSpec) => {
    setActionLoading(`on-${spec.hwCode}`);
    try {
      await fetch(`${iotBaseUrl}/shelf/locate`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          shelfCode: spec.hwCode,
          slotCode: spec.hwCode,
          warehouseCode: 'WH-006',
          orderId: `LOCATE-${spec.rackName}`,
          productName: spec.rackName,
          qty: 1,
        }),
      });
      await fetchStatus();
    } finally {
      setActionLoading(null);
    }
  };

  const handleTurnOffShelf = async (spec: RackRowSpec) => {
    setActionLoading(`off-${spec.hwCode}`);
    try {
      await fetch(`${iotBaseUrl}/shelf/stop`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ shelfCode: spec.hwCode, warehouseCode: 'WH-006' }),
      });
      await fetchStatus();
    } finally {
      setActionLoading(null);
    }
  };

  const handleResetAll = async () => {
    setActionLoading('reset-all');
    try {
      await fetch(`${iotBaseUrl}/climate/simulate`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ enabled: false, temperature: 25, humidity: 60 }),
      }).catch(() => {});

      await fetch(`${iotBaseUrl}/shelf/reset`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ warehouseCode: 'WH-006' }),
      });
      await fetchStatus();
    } finally {
      setActionLoading(null);
    }
  };

  const handleSetBuzzerMode = async (enabled: boolean) => {
    if ((shelvesData?.buzzerEnabled ?? true) === enabled) return;
    setActionLoading('buzzer-mode');
    try {
      const res = await fetch(`${iotBaseUrl}/shelf/buzzer`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ enabled }),
      });
      if (res.ok) {
        await fetchStatus();
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleSimulateClimate = async (enabled: boolean, tempVal: number, humVal: number) => {
    setActionLoading('sim');
    try {
      const res = await fetch(`${iotBaseUrl}/climate/simulate`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          enabled,
          temperature: tempVal,
          humidity: humVal,
        }),
      });
      if (res.ok) {
        setCustomTemp(String(tempVal));
        setCustomHum(String(humVal));
        await fetchStatus();
      }
    } finally {
      setActionLoading(null);
    }
  };

  // Real SHT30 temperature & humidity from ESP32
  const realTemp = climate?.realTemperature ?? climate?.temperature ?? 0;
  const realHum = climate?.realHumidity ?? climate?.humidity ?? 0;

  // Active/Simulated values for Pop-up Modal
  const activeTemp = climate?.temperature ?? realTemp;
  const activeHum = climate?.humidity ?? realHum;
  const safeEnv = climate?.safeEnvelope || { minTemp: 10, maxTemp: 35, minHumidity: 30, maxHumidity: 80 };
  const isSimulated = !!climate?.isSimulated;
  const isSimViolated =
    isSimulated &&
    (activeTemp > safeEnv.maxTemp ||
      activeTemp < safeEnv.minTemp ||
      activeHum > safeEnv.maxHumidity ||
      activeHum < safeEnv.minHumidity);

  const isConnected = !!shelvesData?.mqtt?.connected;
  const buzzerEnabled = shelvesData?.buzzerEnabled ?? true;
  const activeCount = RACK_LIST.filter((r) => {
    const s = shelvesData?.shelves?.[r.hwCode];
    return !!(s?.ledOn || s?.buzzerOn || s?.status === 'LOCATING');
  }).length;
  const anyActive = activeCount > 0 || !!climate?.isAlarmActive;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '24px' }}>
      {/* 1. Top Telemetry & Control Summary Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '14px',
        }}
      >
        {/* Card 1: Real Temperature */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              Nhiệt độ thực tế
            </div>
            <div
              style={{
                fontSize: '28px',
                fontWeight: 700,
                color: '#0f172a',
                fontVariantNumeric: 'tabular-nums',
                marginTop: '4px',
                lineHeight: 1.1,
              }}
            >
              {realTemp.toFixed(1)} °C
            </div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>
              Ngưỡng chuẩn: {safeEnv.minTemp} – {safeEnv.maxTemp} °C
            </div>
          </div>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '10px',
              backgroundColor: '#f0f9ff',
              color: '#0284c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Thermometer size={22} />
          </div>
        </div>

        {/* Card 2: Real Humidity */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              Độ ẩm thực tế
            </div>
            <div
              style={{
                fontSize: '28px',
                fontWeight: 700,
                color: '#0f172a',
                fontVariantNumeric: 'tabular-nums',
                marginTop: '4px',
                lineHeight: 1.1,
              }}
            >
              {realHum.toFixed(1)} %
            </div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>
              Ngưỡng chuẩn: {safeEnv.minHumidity} – {safeEnv.maxHumidity} %
            </div>
          </div>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '10px',
              backgroundColor: '#f0fdf4',
              color: '#0f766e',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Droplets size={22} />
          </div>
        </div>

        {/* Card 3: System Status & Quick Controls */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            padding: '16px 20px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              Trạm điều khiển
            </span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '3px 9px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                backgroundColor: isConnected ? '#f0fdf4' : '#fef2f2',
                color: isConnected ? '#166534' : '#991b1b',
                border: `1px solid ${isConnected ? '#bbf7d0' : '#fecaca'}`,
              }}
            >
              {isConnected ? <Wifi size={12} /> : <WifiOff size={12} />}
              {isConnected ? 'Trực tuyến' : 'Mất kết nối'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setIsSimModalOpen(true)}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '8px 12px',
                borderRadius: '6px',
                backgroundColor: isSimulated ? '#fffbeb' : '#f8fafc',
                color: isSimulated ? '#92400e' : '#334155',
                border: `1px solid ${isSimulated ? '#fde68a' : '#cbd5e1'}`,
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Sliders size={14} />
              <span>{isSimulated ? `Mô phỏng: ${activeTemp.toFixed(1)}°C` : 'Mô phỏng'}</span>
            </button>

            <button
              type="button"
              onClick={handleResetAll}
              disabled={actionLoading === 'reset-all'}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '8px 12px',
                borderRadius: '6px',
                backgroundColor: anyActive ? '#dc2626' : '#0f172a',
                color: '#ffffff',
                border: 'none',
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <VolumeX size={14} />
              <span>Ngắt toàn bộ</span>
            </button>

            <button
              type="button"
              onClick={fetchStatus}
              disabled={isLoading}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '8px 10px',
                borderRadius: '6px',
                backgroundColor: '#ffffff',
                color: '#475569',
                border: '1px solid #cbd5e1',
                cursor: 'pointer',
              }}
              title="Làm mới"
            >
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Enterprise Data Table: 3 Physical Shelves (Kệ A, Kệ B, Kệ C) */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '10px',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '12px 20px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>
              Danh sách Kệ lưu trữ Pick-to-Light
            </span>
            <span
              style={{
                fontSize: '12px',
                color: '#64748b',
                fontWeight: 500,
                paddingLeft: '12px',
                borderLeft: '1px solid #e2e8f0',
              }}
            >
              {activeCount > 0 ? `${activeCount} kệ đang phát tín hiệu` : 'Tất cả kệ ở trạng thái chờ'}
            </span>
          </div>

          {/* Chế độ tín hiệu khi lấy hàng: Đèn và còi / Chỉ sáng đèn */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '12px', fontWeight: 500, color: '#475569' }}>
              Tín hiệu lấy hàng:
            </span>
            <div
              role="group"
              aria-label="Chế độ tín hiệu lấy hàng"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                backgroundColor: '#f1f5f9',
                border: '1px solid #e2e8f0',
                borderRadius: '7px',
                padding: '2px',
                gap: '2px',
              }}
            >
              <button
                type="button"
                onClick={() => handleSetBuzzerMode(true)}
                disabled={actionLoading === 'buzzer-mode'}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '5px 11px',
                  borderRadius: '5px',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: actionLoading === 'buzzer-mode' ? 'wait' : 'pointer',
                  backgroundColor: buzzerEnabled ? '#0f172a' : 'transparent',
                  color: buzzerEnabled ? '#ffffff' : '#475569',
                  transition: 'all 0.15s ease',
                }}
              >
                <Volume2 size={13} />
                <span>Đèn và còi</span>
              </button>

              <button
                type="button"
                onClick={() => handleSetBuzzerMode(false)}
                disabled={actionLoading === 'buzzer-mode'}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '5px 11px',
                  borderRadius: '5px',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: actionLoading === 'buzzer-mode' ? 'wait' : 'pointer',
                  backgroundColor: !buzzerEnabled ? '#0284c7' : 'transparent',
                  color: !buzzerEnabled ? '#ffffff' : '#475569',
                  transition: 'all 0.15s ease',
                }}
              >
                <Lightbulb size={13} />
                <span>Chỉ sáng đèn</span>
              </button>
            </div>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '11px 20px', fontSize: '12px', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  Kệ hàng
                </th>
                <th style={{ padding: '11px 20px', fontSize: '12px', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  Vị trí tầng
                </th>
                <th style={{ padding: '11px 20px', fontSize: '12px', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  Phân khu bảo quản
                </th>
                <th style={{ padding: '11px 20px', fontSize: '12px', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  Trạng thái
                </th>
                <th style={{ padding: '11px 20px', fontSize: '12px', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.03em', textAlign: 'right' }}>
                  Điều khiển
                </th>
              </tr>
            </thead>
            <tbody>
              {RACK_LIST.map((spec, index) => {
                const s = shelvesData?.shelves?.[spec.hwCode];
                const isActive = !!(s?.status === 'LOCATING' || s?.ledOn || s?.buzzerOn);

                return (
                  <tr
                    key={spec.hwCode}
                    style={{
                      borderBottom: index < RACK_LIST.length - 1 ? '1px solid #f1f5f9' : 'none',
                      backgroundColor: isActive ? spec.activeRowBg : '#ffffff',
                      transition: 'background-color 0.15s ease',
                    }}
                  >
                    {/* Column 1: Rack Name */}
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span
                          style={{
                            width: '10px',
                            height: '10px',
                            borderRadius: '50%',
                            backgroundColor: spec.btnColor,
                            flexShrink: 0,
                          }}
                        />
                        <span style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
                          {spec.rackName}
                        </span>
                      </div>
                    </td>

                    {/* Column 2: Tier Codes */}
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {spec.tiers.map((tier) => (
                          <span
                            key={tier}
                            style={{
                              padding: '3px 9px',
                              borderRadius: '5px',
                              fontSize: '12.5px',
                              fontWeight: 600,
                              backgroundColor: '#f8fafc',
                              color: '#0f172a',
                              border: '1px solid #cbd5e1',
                            }}
                          >
                            {tier}
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* Column 3: Zone */}
                    <td style={{ padding: '16px 20px', fontSize: '13px', color: '#475569', fontWeight: 500 }}>
                      {spec.zoneName}
                    </td>

                    {/* Column 4: Clean Status Indicator */}
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '7px' }}>
                        <span
                          style={{
                            width: '7px',
                            height: '7px',
                            borderRadius: '50%',
                            backgroundColor: isActive ? spec.btnColor : '#94a3b8',
                          }}
                        />
                        <span
                          style={{
                            fontSize: '13px',
                            fontWeight: 600,
                            color: isActive ? spec.activeText : '#64748b',
                          }}
                        >
                          {isActive
                            ? s?.buzzerOn
                              ? 'Đang bật đèn & còi'
                              : 'Chỉ sáng đèn'
                            : 'Sẵn sàng'}
                        </span>
                      </div>
                    </td>

                    {/* Column 5: Color-Coded Action Button */}
                    <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                      {isActive ? (
                        <button
                          type="button"
                          onClick={() => handleTurnOffShelf(spec)}
                          disabled={actionLoading === `off-${spec.hwCode}`}
                          style={{
                            minWidth: '146px',
                            padding: '8px 14px',
                            borderRadius: '6px',
                            backgroundColor: '#0f172a',
                            color: '#ffffff',
                            border: 'none',
                            fontSize: '12.5px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                          }}
                        >
                          <VolumeX size={14} />
                          <span>Ngắt tín hiệu</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleTurnOnShelf(spec)}
                          disabled={actionLoading === `on-${spec.hwCode}`}
                          style={{
                            minWidth: '146px',
                            padding: '8px 14px',
                            borderRadius: '6px',
                            backgroundColor: spec.btnColor,
                            color: '#ffffff',
                            border: 'none',
                            fontSize: '12.5px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                          }}
                        >
                          <Radio size={14} />
                          <span>Kích hoạt định vị</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Pop-up Modal Mô phỏng Nhiệt độ & Độ ẩm */}
      {isSimModalOpen && (
        <div
          onClick={() => setIsSimModalOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '420px',
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.12)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                padding: '14px 18px',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span style={{ fontSize: '15px', fontWeight: 600, color: '#0f172a' }}>
                Mô phỏng Nhiệt độ & Độ ẩm
              </span>
              <button
                type="button"
                onClick={() => setIsSimModalOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Status indicator */}
              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: '8px',
                  backgroundColor: isSimViolated ? '#fef2f2' : '#f8fafc',
                  border: `1px solid ${isSimViolated ? '#fecaca' : '#e2e8f0'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '12.5px',
                }}
              >
                <span style={{ fontWeight: 600, color: isSimViolated ? '#991b1b' : '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {isSimViolated ? <AlertTriangle size={15} color="#dc2626" /> : <ShieldCheck size={15} color="#0f766e" />}
                  {isSimulated ? (isSimViolated ? 'Vượt ngưỡng — Đang báo động' : 'Đang mô phỏng') : 'Đang đọc cảm biến thật'}
                </span>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>
                  {activeTemp.toFixed(1)}°C • {activeHum.toFixed(1)}%
                </span>
              </div>

              {/* 2 Inputs */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#475569', marginBottom: '4px' }}>
                    Nhiệt độ °C
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={customTemp}
                    onChange={(e) => setCustomTemp(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '14px',
                      fontWeight: 600,
                      color: '#0f172a',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#475569', marginBottom: '4px' }}>
                    Độ ẩm %
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={customHum}
                    onChange={(e) => setCustomHum(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '14px',
                      fontWeight: 600,
                      color: '#0f172a',
                    }}
                  />
                </div>
              </div>

              {/* 2 Quick Presets */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => handleSimulateClimate(true, 38.0, 65.0)}
                  disabled={actionLoading === 'sim'}
                  style={{
                    padding: '8px 10px',
                    borderRadius: '6px',
                    backgroundColor: '#fef2f2',
                    color: '#991b1b',
                    border: '1px solid #fecaca',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Quá nhiệt 38.0 °C
                </button>

                <button
                  type="button"
                  onClick={() => handleSimulateClimate(true, 28.0, 88.0)}
                  disabled={actionLoading === 'sim'}
                  style={{
                    padding: '8px 10px',
                    borderRadius: '6px',
                    backgroundColor: '#fef2f2',
                    color: '#991b1b',
                    border: '1px solid #fecaca',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Quá ẩm 88.0 %
                </button>
              </div>
            </div>

            <div
              style={{
                padding: '12px 18px',
                backgroundColor: '#f8fafc',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              {isSimulated ? (
                <button
                  type="button"
                  onClick={() => handleSimulateClimate(false, realTemp, realHum)}
                  disabled={actionLoading === 'sim'}
                  style={{
                    padding: '7px 12px',
                    borderRadius: '6px',
                    backgroundColor: '#ffffff',
                    color: '#166534',
                    border: '1px solid #bbf7d0',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                  }}
                >
                  <RotateCcw size={13} />
                  <span>Tắt mô phỏng</span>
                </button>
              ) : (
                <div />
              )}

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setIsSimModalOpen(false)}
                  style={{
                    padding: '7px 14px',
                    borderRadius: '6px',
                    backgroundColor: '#ffffff',
                    color: '#475569',
                    border: '1px solid #cbd5e1',
                    fontSize: '12.5px',
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  Đóng
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const t = parseFloat(customTemp);
                    const h = parseFloat(customHum);
                    if (!isNaN(t) && !isNaN(h)) {
                      handleSimulateClimate(true, t, h);
                    }
                  }}
                  disabled={actionLoading === 'sim'}
                  style={{
                    padding: '7px 14px',
                    borderRadius: '6px',
                    backgroundColor: '#0f766e',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Áp dụng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IoTClimateDashboard;
