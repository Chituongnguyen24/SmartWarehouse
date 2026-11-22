import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Thermometer,
  Droplets,
  AlertTriangle,
  ShieldCheck,
  Cpu,
  Wifi,
  WifiOff,
  RefreshCw,
  Power,
  Volume2,
  VolumeX,
  Sliders,
  CheckCircle2,
  Clock,
  Radio,
  Layers,
  Activity,
  FileText,
  RotateCcw,
  Bell,
  Info,
  Building2,
  Play,
  SkipForward,
  Square,
  Lightbulb,
  MapPin,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import { API_HOSTS, getApiHost } from '@/shared/utils/apiConfig';

type DemoIotShelf = 'A1' | 'A2' | 'A3';
const cleanIotProductName = (name?: string) =>
  String(name || '').replace(/\s*\[[A-C][123]?-\d+\]/gi, '').trim();

const formatIotShelfTierLabel = (slotId?: string | null, productName?: string, idx = 0): {
  hwCode: DemoIotShelf;
  rackLabel: string;
  tierLabel: string;
  fullLabel: string;
} => {
  const raw = `${slotId || ''} ${productName || ''}`.toUpperCase();
  let rack: 'A' | 'B' | 'C' = (['A', 'B', 'C'] as const)[idx % 3];
  let tier: 1 | 2 = ((idx % 2) + 1) as 1 | 2;

  const tierMatch = raw.match(/(?:^|[^A-Z0-9])([ABC])[-_ ]*T([12])(?=$|[^0-9])/);
  if (tierMatch) {
    rack = tierMatch[1] as 'A' | 'B' | 'C';
    tier = Number(tierMatch[2]) as 1 | 2;
  } else {
    const legacyHyphen = raw.match(/(?:^|[^A-Z0-9])(A1|A2|A3)[-_ ]+0?([123])(?=$|[^0-9])/);
    if (legacyHyphen) {
      const token = legacyHyphen[1];
      const sub = Number(legacyHyphen[2]);
      if (token === 'A1') rack = 'A';
      else if (token === 'A2') rack = 'B';
      else rack = 'C';
      tier = sub === 2 ? 2 : 1;
    } else {
      const directMatch = raw.match(/(?:^|[^A-Z0-9])([ABC])([12])(?=$|[^0-9])/);
      if (directMatch) {
        rack = directMatch[1] as 'A' | 'B' | 'C';
        tier = Number(directMatch[2]) as 1 | 2;
      }
    }
  }

  const hwMap: Record<'A' | 'B' | 'C', DemoIotShelf> = { A: 'A1', B: 'A2', C: 'A3' };
  return {
    hwCode: hwMap[rack],
    rackLabel: `Kệ ${rack}`,
    tierLabel: `${rack}${tier}`,
    fullLabel: `${rack}${tier}`,
  };
};

const extractDemoShelf = (slotId?: string | null, productName?: string, idx = 0): DemoIotShelf => {
  return formatIotShelfTierLabel(slotId, productName, idx).hwCode;
};
import { useAuth } from '@/features/auth';
import { useWarehouse } from '@/shared';
import { WarehouseClimateThresholdModal } from '@/features/warehouse';
import { getWarehouseThresholds, type WarehouseThresholds } from '@/shared/utils/thresholdStorage';

interface TelemetryPoint {
  time: string;
  timestamp: number;
  temp: number;
  hum: number;
}

interface ClimateStatus {
  zoneId: string;
  zoneName: string;
  temperature: number;
  humidity: number;
  safeEnvelope: {
    minTemp: number;
    maxTemp: number;
    minHumidity: number;
    maxHumidity: number;
  };
  sensorStatus: 'NORMAL' | 'VIOLATION' | 'DISCONNECTED';
  isSimulated: boolean;
  isAlarmActive: boolean;
  isSilenced: boolean;
  silencedRemainingSeconds: number;
  alarmReason: string | null;
  violationDurationSeconds: number;
  lastTelemetryAt: string | null;
  telemetryAgeSeconds: number;
}

interface ShelfDetail {
  code: string;
  label: string;
  zone: string;
  pinInfo: {
    ledPin: number;
    buzzerPin: number;
    buttonPin: number;
  };
  status: 'IDLE' | 'LOCATING' | 'ARRIVED' | 'COMPLETED';
  ledOn: boolean;
  buzzerOn: boolean;
  waitingCheckin: boolean;
  orderId?: string | null;
  productName?: string | null;
  qty?: number;
  activatedAt?: string | null;
  arrivedAt?: string | null;
  completedAt?: string | null;
  lastAckAt?: string | null;
}

interface ShelfStatusResponse {
  shelves: Record<string, ShelfDetail>;
  mqtt: {
    connected: boolean;
    brokerUrl: string;
    lastMessageAt: string | null;
    lastEsp32SeenAt: string | null;
    esp32Online: boolean;
  };
  timestamp: string;
}

interface IotLogItem {
  id: string;
  shelfCode: string;
  eventType: string;
  details: string;
  timestamp: string;
}

export const IoTClimateDashboard: React.FC = () => {
  const { token } = useAuth();
  const { selectedWarehouseCode, setSelectedWarehouseCode } = useWarehouse();
  const iotBaseUrl = API_HOSTS.IOT;

  // Selected warehouse for climate thresholds
  const [currentWhCode, setCurrentWhCode] = useState<string>(selectedWarehouseCode || 'WH-006');
  const [activeThresholds, setActiveThresholds] = useState<WarehouseThresholds>(() =>
    getWarehouseThresholds(selectedWarehouseCode || 'WH-006')
  );
  const [isThresholdModalOpen, setIsThresholdModalOpen] = useState(false);

  useEffect(() => {
    setActiveThresholds(getWarehouseThresholds(currentWhCode));
  }, [currentWhCode]);

  useEffect(() => {
    const handler = (e: any) => {
      if (e.detail?.thresholds && (!e.detail.warehouseCode || e.detail.warehouseCode === currentWhCode)) {
        setActiveThresholds(e.detail.thresholds);
      }
    };
    window.addEventListener('sfwms_thresholds_updated', handler);
    return () => window.removeEventListener('sfwms_thresholds_updated', handler);
  }, [currentWhCode]);

  // Real-time states
  const [climate, setClimate] = useState<ClimateStatus | null>(null);
  const [shelvesData, setShelvesData] = useState<ShelfStatusResponse | null>(null);
  const [logs, setLogs] = useState<IotLogItem[]>([]);
  const [chartData, setChartData] = useState<TelemetryPoint[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAutoRefresh, setIsAutoRefresh] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Simulation controls state
  const [simEnabled, setSimEnabled] = useState<boolean>(false);
  const [simTemp, setSimTemp] = useState<number>(30.5);
  const [simHum, setSimHum] = useState<number>(55.0);

  // Outbound Orders & Sequential Pick-to-Light on IoT Dashboard
  const outboundBaseUrl = getApiHost(3007);
  const [iotOrders, setIotOrders] = useState<any[]>([]);
  const [selectedIotOrderId, setSelectedIotOrderId] = useState<string | null>(null);
  const [guidedIotStep, setGuidedIotStep] = useState<{
    orderId: string;
    orderCode: string;
    itemId: string;
    shelfCode: DemoIotShelf;
    slotId: string;
    productName: string;
    qty: number;
    step: number;
    totalSteps: number;
    baselineStopSeq: number;
    startedAt: number;
  } | null>(null);
  const guidedIotStepRef = useRef<typeof guidedIotStep>(null);
  guidedIotStepRef.current = guidedIotStep;
  const iotOrdersRef = useRef<any[]>([]);
  iotOrdersRef.current = iotOrders;
  const isAdvancingIotRef = useRef<boolean>(false);

  const loadIotOrders = useCallback(async () => {
    try {
      const res = await fetch(`${outboundBaseUrl}/outbound-orders?limit=50`);
      if (!res.ok) return;
      const data = await res.json();
      const list = Array.isArray(data) ? data : data.data || [];
      setIotOrders(list);
    } catch {}
  }, [outboundBaseUrl]);

  useEffect(() => {
    loadIotOrders();
    const t = setInterval(loadIotOrders, 4000);
    return () => clearInterval(t);
  }, [loadIotOrders]);

  const triggerOrderProductIot = useCallback(
    async (order: any, item: any, step: number, totalSteps: number) => {
      const shelfCode = extractDemoShelf(item.slotId || item.location);
      if (!shelfCode) {
        showNotice('info', `Sản phẩm "${item.productName}" nằm tại ${item.slotId || 'kệ thường'} (ngoài 3 kệ demo IoT A1, A2, A3).`);
        return;
      }

      isAdvancingIotRef.current = true;
      try {
        const res = await fetch(`${iotBaseUrl}/shelf/locate`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({
            shelfCode,
            slotCode: item.slotId || `${shelfCode}-01`,
            orderId: order.orderCode || order.id,
            productName: item.productName,
            qty: item.requestedQuantity || item.quantity || 1,
            step,
            totalSteps,
            warehouseCode: order.warehouseCode || 'WH-006',
          }),
        });
        const data = res.ok ? await res.json().catch(() => ({})) : {};
        let baselineStopSeq = 0;
        if (typeof data?.stopSeq === 'number') baselineStopSeq = data.stopSeq;
        else if (typeof data?.shelf?.stopSeq === 'number') baselineStopSeq = data.shelf.stopSeq;
        else if (typeof (shelvesData?.shelves?.[shelfCode] as any)?.stopSeq === 'number') {
          baselineStopSeq = (shelvesData?.shelves?.[shelfCode] as any).stopSeq;
        }

        const nextSession = {
          orderId: order.id,
          orderCode: order.orderCode,
          itemId: item.id,
          shelfCode,
          slotId: item.slotId || shelfCode,
          productName: item.productName,
          qty: item.requestedQuantity || item.quantity || 1,
          step,
          totalSteps,
          baselineStopSeq,
          startedAt: Date.now(),
        };
        guidedIotStepRef.current = nextSession;
        setGuidedIotStep(nextSession);
        showNotice(
          'success',
          `Bước ${step}/${totalSteps}: Đã bật LED & Còi tại Kệ ${shelfCode} cho "${item.productName}". Bấm STOP tại kệ để qua món tiếp theo.`
        );
        await fetchTelemetry();
      } finally {
        isAdvancingIotRef.current = false;
      }
    },
    [iotBaseUrl, getHeaders, shelvesData, fetchTelemetry]
  );

  const handleSelectOrderOnIotPage = useCallback(
    async (order: any) => {
      setSelectedIotOrderId(order.id);
      const iotItems = (order.items || []).filter((it: any) => extractDemoShelf(it.slotId || it.location) !== null);
      const pendingIot = iotItems.filter(
        (it: any) => it.status !== 'PICKED' && (it.pickedQuantity || 0) < (it.requestedQuantity || it.quantity || 1)
      );
      const targetItem = pendingIot[0] || iotItems[0];
      if (!targetItem) {
        showNotice('info', `Đơn ${order.orderCode} không có sản phẩm nào nằm trên 3 kệ demo IoT (A1, A2, A3).`);
        return;
      }
      const stepIdx = iotItems.findIndex((it: any) => it.id === targetItem.id);
      await triggerOrderProductIot(order, targetItem, stepIdx >= 0 ? stepIdx + 1 : 1, iotItems.length);
    },
    [triggerOrderProductIot]
  );

  const advanceIotPageOrderStep = useCallback(
    async (manualStop = false) => {
      const session = guidedIotStepRef.current;
      if (!session || isAdvancingIotRef.current) return;
      isAdvancingIotRef.current = true;
      guidedIotStepRef.current = null;
      setGuidedIotStep(null);

      try {
        if (manualStop) {
          await fetch(`${iotBaseUrl}/shelf/stop`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ shelfCode: session.shelfCode, warehouseCode: 'WH-006' }),
          }).catch(() => {});
        }

        const currentOrd = iotOrdersRef.current.find((o: any) => o.id === session.orderId);
        if (!currentOrd) {
          isAdvancingIotRef.current = false;
          return;
        }

        const updatedItems = (currentOrd.items || []).map((it: any) =>
          it.id === session.itemId
            ? { ...it, status: 'PICKED', pickedQuantity: it.requestedQuantity || it.quantity || 1 }
            : it
        );
        const allPicked =
          updatedItems.length > 0 &&
          updatedItems.every((it: any) => it.status === 'PICKED' || (it.pickedQuantity || 0) >= (it.requestedQuantity || 1));

        const updatedOrd = {
          ...currentOrd,
          status: allPicked ? 'PACKED' : 'PICKING',
          items: updatedItems,
        };
        setIotOrders((prev) => prev.map((o) => (o.id === currentOrd.id ? updatedOrd : o)));

        await fetch(`${outboundBaseUrl}/outbound-orders/${currentOrd.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: [{ id: session.itemId, pickedQuantity: session.qty, status: 'PICKED' }],
            status: allPicked ? 'PACKED' : 'PICKING',
          }),
        }).catch(() => {});

        const iotItems = updatedItems.filter((it: any) => extractDemoShelf(it.slotId || it.location) !== null);
        const remainingIot = iotItems.filter(
          (it: any) => it.status !== 'PICKED' && (it.pickedQuantity || 0) < (it.requestedQuantity || 1)
        );

        if (remainingIot.length > 0) {
          const nextItem = remainingIot[0];
          const nextStep = iotItems.length - remainingIot.length + 1;
          setTimeout(() => {
            isAdvancingIotRef.current = false;
            triggerOrderProductIot(updatedOrd, nextItem, nextStep, iotItems.length);
          }, 650);
        } else {
          isAdvancingIotRef.current = false;
          showNotice('success', `Đã hoàn thành lấy toàn bộ sản phẩm trong đơn ${session.orderCode}!`);
          await fetchTelemetry();
        }
      } catch {
        isAdvancingIotRef.current = false;
      }
    },
    [iotBaseUrl, outboundBaseUrl, getHeaders, triggerOrderProductIot, fetchTelemetry]
  );

  // Poll physical STOP button every 800ms when an order step is active on IoT Dashboard
  useEffect(() => {
    if (!guidedIotStep) return;
    const poll = setInterval(async () => {
      const session = guidedIotStepRef.current;
      if (!session || isAdvancingIotRef.current) return;
      try {
        const res = await fetch(`${iotBaseUrl}/shelf/status`, { headers: getHeaders() });
        if (!res.ok) return;
        const data = await res.json();
        const sh = data?.shelves?.[session.shelfCode];
        if (!sh) return;
        const stopPressed =
          (typeof sh.stopSeq === 'number' && sh.stopSeq > session.baselineStopSeq) ||
          (sh.status === 'ARRIVED' && sh.arrivedAt && new Date(sh.arrivedAt).getTime() >= session.startedAt - 1500);
        if (stopPressed) {
          await advanceIotPageOrderStep(false);
        }
      } catch {}
    }, 800);
    return () => clearInterval(poll);
  }, [guidedIotStep, iotBaseUrl, getHeaders, advanceIotPageOrderStep]);

  // Min / Max session stats
  const minTempRef = useRef<number>(999);
  const maxTempRef = useRef<number>(-999);
  const minHumRef = useRef<number>(999);
  const maxHumRef = useRef<number>(-999);

  const showNotice = (type: 'success' | 'error' | 'info', message: string) => {
    setActionNotice({ type, message });
    setTimeout(() => setActionNotice(null), 4000);
  };

  const getHeaders = useCallback(() => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }, [token]);

  // Fetch climate and shelf status
  const fetchTelemetry = useCallback(async () => {
    try {
      const [climateRes, shelfRes, logsRes] = await Promise.all([
        fetch(`${iotBaseUrl}/climate/status`, { headers: getHeaders() }).then((r) => (r.ok ? r.json() : null)),
        fetch(`${iotBaseUrl}/shelf/status`, { headers: getHeaders() }).then((r) => (r.ok ? r.json() : null)),
        fetch(`${iotBaseUrl}/shelf/logs?limit=20`, { headers: getHeaders() }).then((r) => (r.ok ? r.json() : [])),
      ]);

      if (climateRes) {
        setClimate(climateRes);
        setSimEnabled(climateRes.isSimulated || false);

        // Update min/max records
        if (climateRes.temperature < minTempRef.current) minTempRef.current = climateRes.temperature;
        if (climateRes.temperature > maxTempRef.current) maxTempRef.current = climateRes.temperature;
        if (climateRes.humidity < minHumRef.current) minHumRef.current = climateRes.humidity;
        if (climateRes.humidity > maxHumRef.current) maxHumRef.current = climateRes.humidity;

        // Append to real-time chart points
        const now = new Date();
        const timeLabel = now.toLocaleTimeString('vi-VN', { hour12: false });
        setChartData((prev) => {
          const next = [
            ...prev,
            {
              time: timeLabel,
              timestamp: now.getTime(),
              temp: Number(climateRes.temperature.toFixed(1)),
              hum: Number(climateRes.humidity.toFixed(1)),
            },
          ];
          // Keep at most 25 points for crisp readable chart
          return next.slice(-25);
        });
      }

      if (shelfRes) {
        setShelvesData(shelfRes);
      }

      if (Array.isArray(logsRes)) {
        setLogs(logsRes);
      }
    } catch (err: any) {
      console.warn('Telemetry fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [iotBaseUrl, getHeaders]);

  useEffect(() => {
    fetchTelemetry();
    if (!isAutoRefresh) return;
    const interval = setInterval(fetchTelemetry, 2500);
    return () => clearInterval(interval);
  }, [fetchTelemetry, isAutoRefresh]);

  // Actions for Shelves
  const handleLocateShelf = async (shelfCode: string) => {
    setActionLoading(`locate-${shelfCode}`);
    try {
      const res = await fetch(`${iotBaseUrl}/shelf/locate`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          shelfCode,
          warehouseCode: 'WH-006',
          productName: `Kiểm thử định vị Kệ ${shelfCode}`,
          qty: 1,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success !== false) {
        showNotice('success', `Đã phát lệnh định vị đến Kệ ${shelfCode}. Còi và đèn LED đang nháy.`);
        await fetchTelemetry();
      } else {
        showNotice('error', data.message || `Không thể định vị Kệ ${shelfCode}.`);
      }
    } catch (err: any) {
      showNotice('error', `Lỗi mạng khi định vị: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleStopShelf = async (shelfCode: string) => {
    setActionLoading(`stop-${shelfCode}`);
    try {
      const res = await fetch(`${iotBaseUrl}/shelf/stop`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ shelfCode, warehouseCode: 'WH-006' }),
      });
      if (res.ok) {
        showNotice('info', `Đã tắt còi và đèn của Kệ ${shelfCode}.`);
        await fetchTelemetry();
      }
    } catch (err: any) {
      showNotice('error', `Lỗi khi tắt kệ: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleResetAllShelves = async () => {
    setActionLoading('reset-all');
    try {
      const res = await fetch(`${iotBaseUrl}/shelf/reset`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ warehouseCode: 'WH-006' }),
      });
      if (res.ok) {
        showNotice('info', 'Đã đặt lại trạng thái và tắt đèn còi toàn bộ 3 giàn kệ.');
        await fetchTelemetry();
      }
    } catch (err: any) {
      showNotice('error', `Lỗi đặt lại: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  // Actions for Climate Alarm
  const handleTestAlarm = async () => {
    setActionLoading('test-alarm');
    try {
      const res = await fetch(`${iotBaseUrl}/climate/alarm/test`, {
        method: 'POST',
        headers: getHeaders(),
      });
      if (res.ok) {
        showNotice('error', 'Đã kích hoạt còi báo động khẩn cấp thử nghiệm trên 3 kệ A1, A2, A3!');
        await fetchTelemetry();
      }
    } catch (err: any) {
      showNotice('error', `Lỗi kích hoạt báo động: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleSilenceAlarm = async () => {
    setActionLoading('silence-alarm');
    try {
      const res = await fetch(`${iotBaseUrl}/climate/alarm/silence`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ silenceDurationSeconds: 60 }),
      });
      if (res.ok) {
        showNotice('info', 'Đã tạm tắt còi báo động trong 60 giây (duy trì đèn cảnh báo).');
        await fetchTelemetry();
      }
    } catch (err: any) {
      showNotice('error', `Lỗi tắt còi: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleClearAlarm = async () => {
    setActionLoading('clear-alarm');
    try {
      const res = await fetch(`${iotBaseUrl}/climate/alarm/clear`, {
        method: 'POST',
        headers: getHeaders(),
      });
      const data = await res.json();
      if (res.ok) {
        showNotice('success', 'Đã khôi phục trạng thái an toàn hệ thống.');
        await fetchTelemetry();
      } else {
        showNotice('error', data.message || 'Chưa thể khôi phục do môi trường vẫn vượt ngưỡng.');
      }
    } catch (err: any) {
      showNotice('error', `Lỗi khôi phục: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  // Actions for Simulation
  const handleApplySimulation = async (enable: boolean, tempVal?: number, humVal?: number) => {
    setActionLoading('apply-sim');
    const targetTemp = tempVal !== undefined ? tempVal : simTemp;
    const targetHum = humVal !== undefined ? humVal : simHum;

    try {
      const res = await fetch(`${iotBaseUrl}/climate/simulate`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          enabled: enable,
          temperature: targetTemp,
          humidity: targetHum,
        }),
      });
      if (res.ok) {
        setSimEnabled(enable);
        showNotice(
          'info',
          enable
            ? `Đã áp dụng chế độ giả lập: ${targetTemp.toFixed(1)}°C, ${targetHum.toFixed(1)}% RH.`
            : 'Đã tắt chế độ giả lập, chuyển về đọc dữ liệu thực tế từ cảm biến SHT30.'
        );
        await fetchTelemetry();
      }
    } catch (err: any) {
      showNotice('error', `Lỗi cập nhật giả lập: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  // Safe limits from warehouse configuration
  const safeEnv = activeThresholds?.coolZone || climate?.safeEnvelope || { minTemp: 0, maxTemp: 4, minHumidity: 60, maxHumidity: 85 };
  const currentTemp = climate?.temperature ?? 0;
  const currentHum = climate?.humidity ?? 0;
  const isTempViolated = currentTemp > safeEnv.maxTemp || currentTemp < safeEnv.minTemp;
  const isHumViolated = currentHum > safeEnv.maxHumidity || currentHum < safeEnv.minHumidity;

  const shelvesList = ['A1', 'A2', 'A3'].map((code) => {
    const defaultLabels: Record<string, string> = {
      A1: 'Kệ A (Tầng 1 & Tầng 2)',
      A2: 'Kệ B (Tầng 1 & Tầng 2)',
      A3: 'Kệ C (Tầng 1 & Tầng 2)',
    };
    const displayCodeMap: Record<string, string> = {
      A1: 'Kệ A',
      A2: 'Kệ B',
      A3: 'Kệ C',
    };
    const s = shelvesData?.shelves?.[code];
    return {
      code,
      displayCode: displayCodeMap[code] || code,
      label: defaultLabels[code] || s?.label || `Kệ ${code}`,
      status: s?.status || 'IDLE',
      ledOn: !!s?.ledOn,
      buzzerOn: !!s?.buzzerOn,
      waitingCheckin: !!s?.waitingCheckin,
      orderId: s?.orderId,
      productName: s?.productName,
      qty: s?.qty,
    };
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '40px' }}>
      {/* 1. Header Bar */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          padding: '18px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '14px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '3px 8px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 600,
                backgroundColor: '#f0fdf4',
                color: '#166534',
                border: '1px solid #bbf7d0',
              }}
            >
              HỆ THỐNG IOT: {currentWhCode}
            </span>
            <span style={{ fontSize: '12px', color: '#64748b' }}>•</span>
            <span style={{ fontSize: '12px', color: '#64748b' }}>{activeThresholds.warehouseName}</span>
          </div>

          <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', margin: '4px 0 2px' }}>
            Giám Sát Nhiệt Ẩm Thời Gian Thực & Điều Khiển IoT
          </h1>
          <p style={{ fontSize: '13px', color: '#475569', margin: 0 }}>
            Hệ thống hỗ trợ lấy hàng Pick-to-Light (Kệ A1, A2, A3) & Cấu hình Ngưỡng An Toàn Theo Kho
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Warehouse Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Building2 size={16} color="#0f766e" />
            <select
              value={currentWhCode}
              onChange={(e) => {
                setCurrentWhCode(e.target.value);
                setSelectedWarehouseCode(e.target.value);
              }}
              style={{
                padding: '5px 10px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '12px',
                fontWeight: 600,
                color: '#0f172a',
                backgroundColor: '#ffffff',
                cursor: 'pointer',
              }}
            >
              <option value="WH-006">WH-006: Kho Gò Vấp (IoT)</option>
              <option value="WH-001">WH-001: Kho Tân Bình</option>
              <option value="WH-002">WH-002: Kho Quận 12</option>
              <option value="WH-005">WH-005: Kho Thủ Đức</option>
            </select>
          </div>

          {/* Threshold Config Button */}
          <button
            type="button"
            onClick={() => setIsThresholdModalOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '6px',
              backgroundColor: '#ffffff',
              color: '#0f766e',
              border: '1.5px solid #0f766e',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
            }}
          >
            <Sliders size={14} color="#0f766e" />
            <span>Cấu Hình Ngưỡng Kho</span>
          </button>

          {/* MQTT Status Badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '6px',
              backgroundColor: shelvesData?.mqtt?.connected ? '#f0fdf4' : '#fef2f2',
              color: shelvesData?.mqtt?.connected ? '#166534' : '#991b1b',
              border: `1px solid ${shelvesData?.mqtt?.connected ? '#bbf7d0' : '#fecaca'}`,
              fontSize: '12px',
              fontWeight: 500,
            }}
          >
            {shelvesData?.mqtt?.connected ? <Wifi size={14} /> : <WifiOff size={14} />}
            <span>MQTT: {shelvesData?.mqtt?.connected ? 'Đang kết nối' : 'Mất kết nối'}</span>
          </div>

          {/* SHT30 Sensor Badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '6px',
              backgroundColor:
                climate?.sensorStatus === 'NORMAL'
                  ? '#f0fdf4'
                  : climate?.sensorStatus === 'VIOLATION'
                  ? '#fef2f2'
                  : '#fffbeb',
              color:
                climate?.sensorStatus === 'NORMAL'
                  ? '#166534'
                  : climate?.sensorStatus === 'VIOLATION'
                  ? '#991b1b'
                  : '#92400e',
              border: `1px solid ${
                climate?.sensorStatus === 'NORMAL'
                  ? '#bbf7d0'
                  : climate?.sensorStatus === 'VIOLATION'
                  ? '#fecaca'
                  : '#fde68a'
              }`,
              fontSize: '12px',
              fontWeight: 500,
            }}
          >
            <Activity size={14} />
            <span>
              SHT30: {climate?.sensorStatus === 'NORMAL' ? 'Hoạt động tốt' : climate?.sensorStatus || 'Đang nạp...'}
            </span>
          </div>

          {/* Auto Refresh Toggle */}
          <button
            type="button"
            onClick={() => setIsAutoRefresh(!isAutoRefresh)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '6px',
              backgroundColor: isAutoRefresh ? '#f0f9ff' : '#f8fafc',
              color: isAutoRefresh ? '#075985' : '#475569',
              border: `1px solid ${isAutoRefresh ? '#bae6fd' : '#cbd5e1'}`,
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            <Clock size={14} />
            <span>{isAutoRefresh ? 'Tự động cập nhật (2.5s)' : 'Tạm dừng cập nhật'}</span>
          </button>

          {/* Manual Refresh */}
          <button
            type="button"
            onClick={fetchTelemetry}
            disabled={isLoading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '6px',
              backgroundColor: '#0f766e',
              color: '#ffffff',
              border: 'none',
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* Action Notification Banner */}
      {actionNotice && (
        <div
          style={{
            padding: '10px 16px',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor:
              actionNotice.type === 'success' ? '#f0fdf4' : actionNotice.type === 'error' ? '#fef2f2' : '#f0f9ff',
            color:
              actionNotice.type === 'success' ? '#166534' : actionNotice.type === 'error' ? '#991b1b' : '#075985',
            border: `1px solid ${
              actionNotice.type === 'success' ? '#bbf7d0' : actionNotice.type === 'error' ? '#fecaca' : '#bae6fd'
            }`,
          }}
        >
          {actionNotice.type === 'success' ? (
            <CheckCircle2 size={16} />
          ) : actionNotice.type === 'error' ? (
            <AlertTriangle size={16} />
          ) : (
            <Info size={16} />
          )}
          <span>{actionNotice.message}</span>
        </div>
      )}

      {/* 2. Top Metric KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '16px',
        }}
      >
        {/* KPI 1: Temperature */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            border: `1px solid ${isTempViolated ? '#fecaca' : '#e2e8f0'}`,
            padding: '18px 20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 500, color: '#64748b', textTransform: 'uppercase' }}>
                Nhiệt độ hiện tại
              </div>
              <div
                style={{
                  fontSize: '28px',
                  fontWeight: 700,
                  color: isTempViolated ? '#dc2626' : '#0f172a',
                  fontVariantNumeric: 'tabular-nums',
                  marginTop: '4px',
                }}
              >
                {currentTemp.toFixed(1)}°C
              </div>
            </div>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: isTempViolated ? '#fee2e2' : '#f0f9ff',
                color: isTempViolated ? '#dc2626' : '#0284c7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Thermometer size={20} />
            </div>
          </div>

          <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid #f1f5f9' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#475569' }}>
              <span>Ngưỡng chuẩn an toàn:</span>
              <span style={{ fontWeight: 600, color: '#0f172a' }}>
                {safeEnv.minTemp}°C ~ {safeEnv.maxTemp}°C
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
              <span>Phiên làm việc:</span>
              <span>
                Thấp nhất: {minTempRef.current === 999 ? '--' : `${minTempRef.current.toFixed(1)}°C`} | Cao nhất:{' '}
                {maxTempRef.current === -999 ? '--' : `${maxTempRef.current.toFixed(1)}°C`}
              </span>
            </div>
          </div>
        </div>

        {/* KPI 2: Humidity */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            border: `1px solid ${isHumViolated ? '#fecaca' : '#e2e8f0'}`,
            padding: '18px 20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 500, color: '#64748b', textTransform: 'uppercase' }}>
                Độ ẩm không khí
              </div>
              <div
                style={{
                  fontSize: '28px',
                  fontWeight: 700,
                  color: isHumViolated ? '#dc2626' : '#0f172a',
                  fontVariantNumeric: 'tabular-nums',
                  marginTop: '4px',
                }}
              >
                {currentHum.toFixed(1)}% RH
              </div>
            </div>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: isHumViolated ? '#fee2e2' : '#f0fdf4',
                color: isHumViolated ? '#dc2626' : '#166534',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Droplets size={20} />
            </div>
          </div>

          <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid #f1f5f9' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#475569' }}>
              <span>Ngưỡng chuẩn an toàn:</span>
              <span style={{ fontWeight: 600, color: '#0f172a' }}>
                {safeEnv.minHumidity}% ~ {safeEnv.maxHumidity}% RH
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
              <span>Phiên làm việc:</span>
              <span>
                Thấp nhất: {minHumRef.current === 999 ? '--' : `${minHumRef.current.toFixed(1)}%`} | Cao nhất:{' '}
                {maxHumRef.current === -999 ? '--' : `${maxHumRef.current.toFixed(1)}%`}
              </span>
            </div>
          </div>
        </div>

        {/* KPI 3: Safety Alarm Status & Actions */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            border: `1px solid ${climate?.isAlarmActive ? '#fecaca' : '#e2e8f0'}`,
            padding: '18px 20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 500, color: '#64748b', textTransform: 'uppercase' }}>
                  Hệ thống Cảnh báo
                </div>
                <div
                  style={{
                    fontSize: '18px',
                    fontWeight: 700,
                    color: climate?.isAlarmActive ? '#b91c1c' : '#166534',
                    marginTop: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  {climate?.isAlarmActive ? (
                    <>
                      <AlertTriangle size={18} /> Cảnh Báo Nguy Hiểm!
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={18} /> Hệ thống An toàn
                    </>
                  )}
                </div>
              </div>

              <div
                style={{
                  padding: '3px 8px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: 600,
                  backgroundColor: climate?.isSilenced ? '#fffbeb' : climate?.isAlarmActive ? '#fee2e2' : '#f0fdf4',
                  color: climate?.isSilenced ? '#92400e' : climate?.isAlarmActive ? '#991b1b' : '#166534',
                  border: `1px solid ${
                    climate?.isSilenced ? '#fde68a' : climate?.isAlarmActive ? '#fecaca' : '#bbf7d0'
                  }`,
                }}
              >
                {climate?.isSilenced
                  ? `Còi Tạm Tắt (${climate.silencedRemainingSeconds}s)`
                  : climate?.isAlarmActive
                  ? 'Còi Đang Kêu'
                  : 'Còi Tắt'}
              </div>
            </div>

            <div style={{ fontSize: '12px', color: '#475569', marginTop: '6px' }}>
              {climate?.alarmReason || 'Nhiệt độ và độ ẩm trong giới hạn cho phép.'}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
            {climate?.isAlarmActive ? (
              <>
                <button
                  type="button"
                  onClick={handleSilenceAlarm}
                  disabled={actionLoading === 'silence-alarm'}
                  style={{
                    flex: 1,
                    padding: '6px 10px',
                    borderRadius: '6px',
                    backgroundColor: '#f59e0b',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                  }}
                >
                  <VolumeX size={13} />
                  <span>Tắt Còi 60s</span>
                </button>
                <button
                  type="button"
                  onClick={handleClearAlarm}
                  disabled={actionLoading === 'clear-alarm'}
                  style={{
                    flex: 1,
                    padding: '6px 10px',
                    borderRadius: '6px',
                    backgroundColor: '#0f766e',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                  }}
                >
                  <RotateCcw size={13} />
                  <span>Khôi Phục</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleTestAlarm}
                disabled={actionLoading === 'test-alarm'}
                style={{
                  width: '100%',
                  padding: '7px 12px',
                  borderRadius: '6px',
                  backgroundColor: '#fee2e2',
                  color: '#991b1b',
                  border: '1px solid #fecaca',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <Bell size={14} />
                <span>Thử Nghiệm Báo Động (Còi 3 Kệ)</span>
              </button>
            )}
          </div>
        </div>

        {/* KPI 4: Hardware Gateway Overview */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            padding: '18px 20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 500, color: '#64748b', textTransform: 'uppercase' }}>
                Phần cứng IoT Trạm Kho
              </div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>
                ESP32 Dev Module (COM8)
              </div>
            </div>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: '#f1f5f9',
                color: '#475569',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Cpu size={20} />
            </div>
          </div>

          <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #f1f5f9', fontSize: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569', marginBottom: '3px' }}>
              <span>Broker MQTT:</span>
              <span style={{ fontWeight: 600, color: '#0f172a' }}>broker.emqx.io:1883</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569', marginBottom: '3px' }}>
              <span>Pick-to-Light:</span>
              <span style={{ fontWeight: 600, color: '#0f766e' }}>3 Giàn (A1, A2, A3)</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
              <span>Độ trễ dữ liệu:</span>
              <span style={{ fontWeight: 600, color: '#0f172a' }}>
                {climate?.telemetryAgeSeconds !== undefined ? `${climate.telemetryAgeSeconds} giây trước` : 'N/A'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Real-time Environmental Trend Chart */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          padding: '20px 24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <div>
            <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#0f172a', margin: 0 }}>
              Đồ Thị Biến Thiên Nhiệt Độ & Độ Ẩm Thời Gian Thực
            </h2>
            <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0' }}>
              Dữ liệu truyền từ cảm biến SHT30 I2C qua ESP32 (Ngưỡng an toàn: Tối đa {safeEnv.maxTemp}°C và {safeEnv.maxHumidity}% RH)
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '12px', height: '3px', backgroundColor: '#dc2626', borderRadius: '2px' }} />
              <span style={{ color: '#475569' }}>Nhiệt độ (°C)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '12px', height: '3px', backgroundColor: '#0284c7', borderRadius: '2px' }} />
              <span style={{ color: '#475569' }}>Độ ẩm (% RH)</span>
            </div>
          </div>
        </div>

        <div style={{ width: '100%', height: '260px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="time" stroke="#94a3b8" fontSize={11} tickLine={false} />
              <YAxis
                yAxisId="left"
                domain={[0, 45]}
                stroke="#dc2626"
                fontSize={11}
                tickLine={false}
                unit="°C"
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                domain={[0, 100]}
                stroke="#0284c7"
                fontSize={11}
                tickLine={false}
                unit="%"
              />
              <RechartsTooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  borderRadius: '6px',
                  border: '1px solid #e2e8f0',
                  fontSize: '12px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                }}
              />
              <ReferenceLine
                yAxisId="left"
                y={safeEnv.maxTemp}
                stroke="#dc2626"
                strokeDasharray="4 4"
                label={{ value: `Ngưỡng max ${safeEnv.maxTemp}°C`, fill: '#dc2626', fontSize: 11, position: 'insideTopLeft' }}
              />
              <ReferenceLine
                yAxisId="right"
                y={safeEnv.maxHumidity}
                stroke="#0284c7"
                strokeDasharray="4 4"
                label={{ value: `Ngưỡng max ${safeEnv.maxHumidity}%`, fill: '#0284c7', fontSize: 11, position: 'insideTopRight' }}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="temp"
                name="Nhiệt độ"
                stroke="#dc2626"
                strokeWidth={2}
                dot={{ r: 2 }}
                activeDot={{ r: 4 }}
                isAnimationActive={false}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="hum"
                name="Độ ẩm"
                stroke="#0284c7"
                strokeWidth={2}
                dot={{ r: 2 }}
                activeDot={{ r: 4 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 4. Pick-to-Light Shelves Control Panel (Only A1, A2, A3) */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          padding: '20px 24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        }}
      >
        {/* Interactive Orders & Products Sequential Pick-to-Light Panel */}
        <div
          style={{
            marginBottom: '20px',
            padding: '16px',
            borderRadius: '8px',
            border: '1px solid #cbd5e1',
            backgroundColor: '#f8fafc',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Lightbulb size={18} color="#0f766e" />
              <h3 style={{ margin: 0, fontSize: '14.5px', fontWeight: 700, color: '#0f172a' }}>
                Đơn Hàng Xuất Kho Cần Lấy — Bấm Vào Đơn Hoặc Sản Phẩm Trong Đơn Để Bật Đèn &amp; Còi Kệ (A1, A2, A3)
              </h3>
            </div>
            <span style={{ fontSize: '12px', color: '#475569', fontWeight: 500 }}>
              Khi bấm STOP vật lý tại kệ đang sáng, hệ thống tự động tắt đèn/còi và chuyển sang sản phẩm kế tiếp
            </span>
          </div>

          {guidedIotStep && (
            <div
              style={{
                backgroundColor: '#fffbeb',
                border: '1px solid #fde68a',
                borderRadius: '8px',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', fontWeight: 700, color: '#92400e' }}>
                  <Radio size={15} color="#92400e" />
                  <span>
                    Đơn {guidedIotStep.orderCode} • Bước {guidedIotStep.step}/{guidedIotStep.totalSteps} • Đang bật LED &amp; Còi tại Kệ {guidedIotStep.shelfCode} ({guidedIotStep.slotId})
                  </span>
                </div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>
                  Sản phẩm đang gọi lấy: <b>{guidedIotStep.productName}</b> (SL: x{guidedIotStep.qty}) — Nhấn nút STOP tại kệ để xác nhận và tự qua sản phẩm tiếp theo.
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => advanceIotPageOrderStep(true)}
                  style={{
                    backgroundColor: '#0f766e',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '7px 12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                  }}
                >
                  <SkipForward size={14} />
                  <span>Xác nhận STOP &amp; Qua món kế</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const active = guidedIotStepRef.current;
                    guidedIotStepRef.current = null;
                    setGuidedIotStep(null);
                    if (active) handleStopShelf(active.shelfCode);
                  }}
                  style={{
                    backgroundColor: '#ffffff',
                    color: '#334155',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    padding: '7px 12px',
                    fontSize: '12px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                  }}
                >
                  <Square size={12} />
                  <span>Dừng</span>
                </button>
              </div>
            </div>
          )}

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '12px',
            }}
          >
            {iotOrders
              .filter((o: any) => Array.isArray(o.items) && o.items.length > 0 && o.status !== 'CANCELLED')
              .slice(0, 6)
              .map((ord: any) => {
                const isSelectedOrd = selectedIotOrderId === ord.id || guidedIotStep?.orderId === ord.id;
                const iotItemsInOrd = (ord.items || []).filter((it: any) => extractDemoShelf(it.slotId || it.location) !== null);
                const pendingIotInOrd = iotItemsInOrd.filter(
                  (it: any) => it.status !== 'PICKED' && (it.pickedQuantity || 0) < (it.requestedQuantity || it.quantity || 1)
                );

                return (
                  <div
                    key={ord.id}
                    style={{
                      backgroundColor: '#ffffff',
                      border: `1px solid ${isSelectedOrd ? '#0f766e' : '#e2e8f0'}`,
                      borderRadius: '8px',
                      padding: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                    }}
                  >
                    {/* Clickable Order Header */}
                    <div
                      onClick={() => handleSelectOrderOnIotPage(ord)}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '8px',
                        cursor: 'pointer',
                        paddingBottom: '8px',
                        borderBottom: '1px dashed #e2e8f0',
                      }}
                      title="Bấm vào đơn hàng để tự động bật đèn & còi kệ đầu tiên"
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                          style={{
                            backgroundColor: isSelectedOrd ? '#0f766e' : '#0f172a',
                            color: '#ffffff',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <Play size={11} />
                          {ord.orderCode}
                        </span>
                        <span style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 500 }}>
                          {ord.warehouseCode || 'WH-006'}
                        </span>
                      </div>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: '6px',
                          backgroundColor: pendingIotInOrd.length > 0 ? '#f0f9ff' : '#f0fdf4',
                          color: pendingIotInOrd.length > 0 ? '#075985' : '#166534',
                          border: `1px solid ${pendingIotInOrd.length > 0 ? '#bae6fd' : '#bbf7d0'}`,
                        }}
                      >
                        {pendingIotInOrd.length > 0 ? `Bấm đơn để lấy (${pendingIotInOrd.length} kệ IoT)` : 'Đã hoàn tất'}
                      </span>
                    </div>

                      {/* Clickable Products inside this Order */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {(ord.items || []).map((it: any, idx: number) => {
                        const locInfo = formatIotShelfTierLabel(it.slotId || it.location, it.productName, idx);
                        const shelfCode = locInfo.hwCode;
                        const isPicked = it.status === 'PICKED' || (it.pickedQuantity || 0) >= (it.requestedQuantity || it.quantity || 1);
                        const isGuidedThis = guidedIotStep?.itemId === it.id;
                        const stepIdx = iotItemsInOrd.findIndex((x: any) => x.id === it.id);

                        return (
                          <div
                            key={it.id || `${ord.id}-${idx}`}
                            onClick={() => {
                              setSelectedIotOrderId(ord.id);
                              triggerOrderProductIot(
                                ord,
                                it,
                                stepIdx >= 0 ? stepIdx + 1 : 1,
                                Math.max(1, iotItemsInOrd.length)
                              );
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '8px',
                              padding: '7px 10px',
                              borderRadius: '6px',
                              backgroundColor: isGuidedThis ? '#fffbeb' : isPicked ? '#f0fdf4' : '#f8fafc',
                              border: `1px solid ${isGuidedThis ? '#d97706' : isPicked ? '#bbf7d0' : '#e2e8f0'}`,
                              cursor: 'pointer',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                              <span
                                style={{
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  padding: '2px 7px',
                                  borderRadius: '4px',
                                  backgroundColor: isGuidedThis ? '#d97706' : '#0f766e',
                                  color: '#ffffff',
                                  flexShrink: 0,
                                }}
                              >
                                {locInfo.fullLabel}
                              </span>
                              <span
                                style={{
                                  fontSize: '12.5px',
                                  fontWeight: 600,
                                  color: isPicked ? '#166534' : '#0f172a',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {cleanIotProductName(it.productName)}
                              </span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                              <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#334155', fontVariantNumeric: 'tabular-nums' }}>
                                ×{it.requestedQuantity || it.quantity || 1}
                              </span>
                              <span
                                style={{
                                  fontSize: '10.5px',
                                  fontWeight: 600,
                                  padding: '2px 7px',
                                  borderRadius: '4px',
                                  backgroundColor: isGuidedThis
                                    ? '#fef3c7'
                                    : isPicked
                                    ? '#dcfce7'
                                    : '#ffffff',
                                  color: isGuidedThis
                                    ? '#92400e'
                                    : isPicked
                                    ? '#166534'
                                    : '#0f766e',
                                  border: `1px solid ${
                                    isGuidedThis ? '#fde68a' : isPicked ? '#bbf7d0' : '#99f6e4'
                                  }`,
                                }}
                              >
                                {isGuidedThis ? 'Đang sáng' : isPicked ? 'Đã lấy' : 'Lấy hàng'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
            flexWrap: 'wrap',
            gap: '10px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#0f172a', margin: 0 }}>
                Hệ Thống Lấy Hàng Pick-to-Light (Chỉ hỗ trợ Kệ A1, A2, A3)
              </h2>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  backgroundColor: '#f0fdf4',
                  color: '#166534',
                  border: '1px solid #bbf7d0',
                  padding: '1px 6px',
                  borderRadius: '4px',
                }}
              >
                Phần Cứng Độc Quyền
              </span>
            </div>
            <p style={{ fontSize: '12px', color: '#64748b', margin: '3px 0 0' }}>
              Chỉ các lô hàng thuộc 3 giàn kệ này mới kích hoạt đèn LED và còi Buzzer. Các kệ khác (B1, C1, C2...) không hỗ trợ đèn còi IoT.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={handleResetAllShelves}
              disabled={actionLoading === 'reset-all'}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '6px',
                backgroundColor: '#ffffff',
                color: '#475569',
                border: '1px solid #cbd5e1',
                fontSize: '12px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              <RotateCcw size={13} />
              <span>Tắt Hết 3 Giàn (Reset)</span>
            </button>
          </div>
        </div>

        {/* 3 Shelf Cards Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '16px',
          }}
        >
          {shelvesList.map((shelf) => {
            const isLocating = shelf.status === 'LOCATING' || shelf.ledOn || shelf.buzzerOn;
            return (
              <div
                key={shelf.code}
                style={{
                  borderRadius: '8px',
                  border: `1px solid ${isLocating ? '#0284c7' : '#e2e8f0'}`,
                  backgroundColor: isLocating ? '#f0f9ff' : '#f8fafc',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: isLocating ? '0 0 0 1px #0284c7' : 'none',
                  transition: 'all 0.2s ease',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          fontSize: '14px',
                          fontWeight: 700,
                          color: '#ffffff',
                          backgroundColor: '#0f766e',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontFamily: 'monospace',
                        }}
                      >
                        {shelf.code}
                      </span>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>{shelf.label}</span>
                    </div>

                    <span
                      style={{
                        fontSize: '11px',
                        padding: '2px 7px',
                        borderRadius: '4px',
                        fontWeight: 600,
                        backgroundColor:
                          shelf.status === 'LOCATING'
                            ? '#0284c7'
                            : shelf.status === 'ARRIVED'
                            ? '#dcfce7'
                            : shelf.status === 'COMPLETED'
                            ? '#f0fdf4'
                            : '#ffffff',
                        color:
                          shelf.status === 'LOCATING'
                            ? '#ffffff'
                            : shelf.status === 'ARRIVED'
                            ? '#15803d'
                            : shelf.status === 'COMPLETED'
                            ? '#166534'
                            : '#64748b',
                        border: `1px solid ${
                          shelf.status === 'LOCATING'
                            ? '#0284c7'
                            : shelf.status === 'ARRIVED'
                            ? '#bbf7d0'
                            : '#cbd5e1'
                        }`,
                      }}
                    >
                      {shelf.status === 'LOCATING'
                        ? 'Đang Nháy Đèn / Còi'
                        : shelf.status === 'ARRIVED'
                        ? 'Đã Đến Kệ'
                        : shelf.status === 'COMPLETED'
                        ? 'Đã Hoàn Tất'
                        : 'Sẵn Sàng'}
                    </span>
                  </div>

                  {/* Hardware pin indicators */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: '8px',
                      marginTop: '12px',
                      padding: '8px 10px',
                      backgroundColor: '#ffffff',
                      borderRadius: '6px',
                      border: '1px solid #e2e8f0',
                      fontSize: '11px',
                    }}
                  >
                    <div>
                      <div style={{ color: '#64748b' }}>Đèn LED:</div>
                      <div
                        style={{
                          fontWeight: 600,
                          color: shelf.ledOn ? '#0284c7' : '#94a3b8',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <span
                          style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            backgroundColor: shelf.ledOn ? '#0284c7' : '#cbd5e1',
                          }}
                        />
                        {shelf.ledOn ? 'SÁNG' : 'TẮT'}
                      </div>
                    </div>

                    <div>
                      <div style={{ color: '#64748b' }}>Còi Buzzer:</div>
                      <div
                        style={{
                          fontWeight: 600,
                          color: shelf.buzzerOn ? '#dc2626' : '#94a3b8',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <span
                          style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            backgroundColor: shelf.buzzerOn ? '#dc2626' : '#cbd5e1',
                          }}
                        />
                        {shelf.buzzerOn ? 'KÊU' : 'TẮT'}
                      </div>
                    </div>

                    <div>
                      <div style={{ color: '#64748b' }}>Nút STOP:</div>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>
                        {shelf.waitingCheckin ? 'CHỜ BẤM' : 'SẴN SÀNG'}
                      </div>
                    </div>
                  </div>

                  {/* Order info if present */}
                  {shelf.orderId && (
                    <div
                      style={{
                        marginTop: '8px',
                        fontSize: '11.5px',
                        color: '#334155',
                        backgroundColor: '#ffffff',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: '1px solid #e2e8f0',
                      }}
                    >
                      <div>
                        Đơn hàng: <b style={{ color: '#0284c7' }}>{shelf.orderId}</b>
                      </div>
                      {shelf.productName && (
                        <div style={{ color: '#64748b', marginTop: '2px' }}>
                          {shelf.productName} (SL: {shelf.qty || 1})
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Shelf Actions */}
                <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
                  <button
                    type="button"
                    onClick={() => handleLocateShelf(shelf.code)}
                    disabled={actionLoading === `locate-${shelf.code}`}
                    style={{
                      flex: 1,
                      padding: '7px 10px',
                      borderRadius: '6px',
                      backgroundColor: '#0284c7',
                      color: '#ffffff',
                      border: 'none',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                    }}
                  >
                    <Radio size={13} />
                    <span>Định Vị</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleStopShelf(shelf.code)}
                    disabled={actionLoading === `stop-${shelf.code}`}
                    style={{
                      padding: '7px 12px',
                      borderRadius: '6px',
                      backgroundColor: '#ffffff',
                      color: '#475569',
                      border: '1px solid #cbd5e1',
                      fontSize: '12px',
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}
                  >
                    Tắt Kệ
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Web Controller & Environmental Simulation Studio */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          padding: '20px 24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#0f172a', margin: 0 }}>
              Bộ Điều Khiển Giả Lập Môi Trường (Simulation Studio)
            </h2>
            <p style={{ fontSize: '12px', color: '#64748b', margin: '3px 0 0' }}>
              Kiểm thử quy trình kích hoạt còi báo động khẩn cấp và xử lý sự cố biến đổi nhiệt ẩm tại kho
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '12.5px', fontWeight: 500, color: simEnabled ? '#0284c7' : '#64748b' }}>
              Chế độ giả lập: <b>{simEnabled ? 'ĐANG BẬT' : 'ĐANG TẮT'}</b>
            </span>
            <button
              type="button"
              onClick={() => handleApplySimulation(!simEnabled)}
              disabled={actionLoading === 'apply-sim'}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                backgroundColor: simEnabled ? '#fee2e2' : '#0f766e',
                color: simEnabled ? '#991b1b' : '#ffffff',
                border: simEnabled ? '1px solid #fecaca' : 'none',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Power size={13} />
              <span>{simEnabled ? 'Tắt Giả Lập' : 'Bật Giả Lập'}</span>
            </button>
          </div>
        </div>

        {/* Sliders & Preset Buttons */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '20px',
            padding: '16px',
            backgroundColor: '#f8fafc',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
          }}
        >
          {/* Temperature Slider */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#0f172a' }}>
                Nhiệt độ mô phỏng (°C):
              </label>
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: 700,
                  color: simTemp > safeEnv.maxTemp ? '#dc2626' : '#0f766e',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {simTemp.toFixed(1)}°C
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="45"
              step="0.5"
              value={simTemp}
              onChange={(e) => setSimTemp(parseFloat(e.target.value))}
              disabled={!simEnabled}
              style={{ width: '100%', accentColor: '#0f766e' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
              <span>0°C</span>
              <span>An toàn: 10°C - 35°C</span>
              <span>45°C</span>
            </div>
          </div>

          {/* Humidity Slider */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#0f172a' }}>
                Độ ẩm mô phỏng (% RH):
              </label>
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: 700,
                  color: simHum > safeEnv.maxHumidity ? '#dc2626' : '#0284c7',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {simHum.toFixed(1)}%
              </span>
            </div>
            <input
              type="range"
              min="10"
              max="99"
              step="1"
              value={simHum}
              onChange={(e) => setSimHum(parseFloat(e.target.value))}
              disabled={!simEnabled}
              style={{ width: '100%', accentColor: '#0284c7' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
              <span>10%</span>
              <span>An toàn: 30% - 80%</span>
              <span>99%</span>
            </div>
          </div>
        </div>

        {/* Quick Simulation Presets */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Kịch bản kiểm thử nhanh:</span>

          <button
            type="button"
            onClick={() => {
              setSimTemp(36.5);
              setSimHum(65.0);
              handleApplySimulation(true, 36.5, 65.0);
            }}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              backgroundColor: '#fee2e2',
              color: '#991b1b',
              border: '1px solid #fecaca',
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Quá Nhiệt (36.5°C)
          </button>

          <button
            type="button"
            onClick={() => {
              setSimTemp(28.0);
              setSimHum(84.0);
              handleApplySimulation(true, 28.0, 84.0);
            }}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              backgroundColor: '#fee2e2',
              color: '#991b1b',
              border: '1px solid #fecaca',
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Quá Ẩm (84.0% RH)
          </button>

          <button
            type="button"
            onClick={() => {
              setSimTemp(24.0);
              setSimHum(55.0);
              handleApplySimulation(true, 24.0, 55.0);
            }}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              backgroundColor: '#f0fdf4',
              color: '#166534',
              border: '1px solid #bbf7d0',
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Đạt Chuẩn An Toàn (24°C, 55%)
          </button>

          {simEnabled && (
            <button
              type="button"
              onClick={() => handleApplySimulation(true)}
              disabled={actionLoading === 'apply-sim'}
              style={{
                marginLeft: 'auto',
                padding: '6px 14px',
                borderRadius: '6px',
                backgroundColor: '#0f766e',
                color: '#ffffff',
                border: 'none',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Áp Dụng Thông Số Slider
            </button>
          )}
        </div>
      </div>

      {/* 6. Activity & Audit Logs */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          padding: '20px 24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div>
            <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#0f172a', margin: 0 }}>
              Nhật Ký Tác Vụ Phần Cứng IoT
            </h2>
            <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0' }}>
              Ghi nhận các sự kiện nút bấm STOP tại kệ, tín hiệu MQTT và biến đổi khí hậu
            </p>
          </div>
          <span style={{ fontSize: '12px', color: '#64748b' }}>{logs.length} bản ghi gần nhất</span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc', textAlign: 'left' }}>
                <th style={{ padding: '8px 12px', color: '#475569', fontWeight: 600 }}>Thời gian</th>
                <th style={{ padding: '8px 12px', color: '#475569', fontWeight: 600 }}>Kệ / Vị trí</th>
                <th style={{ padding: '8px 12px', color: '#475569', fontWeight: 600 }}>Sự kiện</th>
                <th style={{ padding: '8px 12px', color: '#475569', fontWeight: 600 }}>Nội dung chi tiết</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
                    Chưa có sự kiện nào được ghi nhận.
                  </td>
                </tr>
              ) : (
                logs.map((log, i) => (
                  <tr
                    key={log.id || i}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      backgroundColor: i % 2 === 0 ? '#ffffff' : '#fafafa',
                    }}
                  >
                    <td style={{ padding: '8px 12px', color: '#64748b', fontVariantNumeric: 'tabular-nums' }}>
                      {new Date(log.timestamp).toLocaleTimeString('vi-VN')}
                    </td>
                    <td style={{ padding: '8px 12px', fontWeight: 600, color: '#0f172a' }}>
                      {log.shelfCode || 'HỆ THỐNG'}
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      <span
                        style={{
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 600,
                          backgroundColor:
                            log.eventType.includes('CONFIRM') || log.eventType.includes('COMPLETED')
                              ? '#f0fdf4'
                              : log.eventType.includes('ALARM')
                              ? '#fef2f2'
                              : '#f0f9ff',
                          color:
                            log.eventType.includes('CONFIRM') || log.eventType.includes('COMPLETED')
                              ? '#166534'
                              : log.eventType.includes('ALARM')
                              ? '#991b1b'
                              : '#075985',
                          border: `1px solid ${
                            log.eventType.includes('CONFIRM') || log.eventType.includes('COMPLETED')
                              ? '#bbf7d0'
                              : log.eventType.includes('ALARM')
                              ? '#fecaca'
                              : '#bae6fd'
                          }`,
                        }}
                      >
                        {log.eventType}
                      </span>
                    </td>
                    <td style={{ padding: '8px 12px', color: '#334155' }}>{log.details}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Cấu hình Ngưỡng An toàn Môi trường theo Từng Kho */}
      <WarehouseClimateThresholdModal
        isOpen={isThresholdModalOpen}
        onClose={() => setIsThresholdModalOpen(false)}
        initialWarehouseCode={currentWhCode}
        onSaved={(newTh) => setActiveThresholds(newTh)}
      />
    </div>
  );
};

export default IoTClimateDashboard;
