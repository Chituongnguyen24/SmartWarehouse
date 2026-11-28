/**
 * WarehouseFloorMap.tsx
 * Sơ đồ 2D sa bàn kho lạnh WH-006 (CityMart)
 * Mô phỏng đúng bố cục thực tế sa bàn:
 *   ┌─────────────────────────────────────────────────┐
 *   │  [CỬA PHÒNG]  [KỆ A1-Thịt]  [KỆ A2-Sữa]  [KỆ A3-Rau]  │
 *   └─────────────────────────────────────────────────┘
 *
 * Kết nối MQTT real-time để:
 *   - Nhận trạng thái kệ từ ESP32 (đèn sáng = đang active)
 *   - Gửi lệnh LOCATE tới ESP32 khi click kệ
 *   - Hiển thị nhiệt độ/độ ẩm live từ sensor SHT30
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Wifi,
  WifiOff,
  Thermometer,
  Droplets,
  AlertTriangle,
  CheckCircle2,
  Zap,
  RotateCcw,
  Send,
  Bell,
  BellOff,
  Info,
  Package,
  Clock,
  Activity,
} from 'lucide-react';
import { useMqtt } from '../hooks/useMqtt';

// ─── MQTT Topics (phải khớp với firmware ESP32) ─────────────────────────────
const MQTT_TOPICS = {
  CMD_SHELF:  'citymart/wh006/shelf/command',
  CMD_SYSTEM: 'citymart/wh006/system/command',
  EVT_SHELF:  'citymart/wh006/shelf/event',
  ENV:        'citymart/wh006/environment',
};

// ─── Dữ liệu tĩnh của từng kệ (khớp với ITEM_NAMES trong firmware) ──────────
interface ShelfInfo {
  code: string;      // "A1" | "A2" | "A3" | "DOOR"
  label: string;
  category: string;
  color: string;     // màu đèn LED thực tế trên sa bàn
  colorBg: string;   // màu nền card
  colorBorder: string;
  colorGlow: string; // màu glow khi active
  emoji: string;
  products: Array<{ sku: string; name: string; qty: number; unit: string; expiry: string }>;
  tempRange: string;
  humidity: string;
  position: { row: number; col: number };
}

const SHELVES: ShelfInfo[] = [
  {
    code: 'DOOR',
    label: 'Cửa Kho',
    category: 'Check-In Cửa',
    color: '#22c55e',
    colorBg: 'bg-green-950',
    colorBorder: 'border-green-500',
    colorGlow: '#22c55e',
    emoji: '🚪',
    products: [],
    tempRange: '--',
    humidity: '--',
    position: { row: 0, col: 0 },
  },
  {
    code: 'A1',
    label: 'Kệ A1 — Thịt CP',
    category: 'Thịt tươi & Gia cầm',
    color: '#ef4444',
    colorBg: 'bg-red-950',
    colorBorder: 'border-red-500',
    colorGlow: '#ef4444',
    emoji: '🥩',
    products: [
      { sku: 'EM-102544', name: 'Thịt heo xay CP 400g',   qty: 85, unit: 'Khay', expiry: '02/09/2026' },
      { sku: 'EM-103829', name: 'Thịt bò Úc phi lê 500g', qty: 95, unit: 'Khay', expiry: '05/09/2026' },
      { sku: 'EM-104921', name: 'Đùi gà tươi CP 1kg',     qty: 60, unit: 'Túi',  expiry: '06/09/2026' },
    ],
    tempRange: '0°C ~ +2°C',
    humidity: '75-80%',
    position: { row: 0, col: 1 },
  },
  {
    code: 'A2',
    label: 'Kệ A2 — Sữa',
    category: 'Sữa tươi & Bơ sữa',
    color: '#3b82f6',
    colorBg: 'bg-blue-950',
    colorBorder: 'border-blue-500',
    colorGlow: '#3b82f6',
    emoji: '🥛',
    products: [
      { sku: 'EM-201102', name: 'Sữa tươi Đà Lạt Milk 1L',       qty: 42, unit: 'Chai', expiry: '03/09/2026' },
      { sku: 'EM-202334', name: 'Sữa chua TH True Yogurt lốc 4',  qty: 80, unit: 'Lốc',  expiry: '15/09/2026' },
      { sku: 'EM-203551', name: 'Bơ nhạt Anchor 227g',            qty: 53, unit: 'Hộp',  expiry: '28/11/2026' },
    ],
    tempRange: '+2°C ~ +4°C',
    humidity: '70-78%',
    position: { row: 0, col: 2 },
  },
  {
    code: 'A3',
    label: 'Kệ A3 — Rau',
    category: 'Rau củ quả VietGAP',
    color: '#22c55e',
    colorBg: 'bg-green-950',
    colorBorder: 'border-green-500',
    colorGlow: '#22c55e',
    emoji: '🥦',
    products: [
      { sku: 'EM-301124', name: 'Rau xà lách Romaine 300g',   qty: 50, unit: 'Gói', expiry: '03/09/2026' },
      { sku: 'EM-302551', name: 'Cà chua bi Cherry 500g',     qty: 60, unit: 'Hộp', expiry: '07/09/2026' },
      { sku: 'EM-303998', name: 'Nấm đùi gà VietGAP 200g',   qty: 40, unit: 'Gói', expiry: '04/09/2026' },
    ],
    tempRange: '+2°C ~ +5°C',
    humidity: '80-88%',
    position: { row: 0, col: 3 },
  },
];

// ─── Trạng thái kệ nhận từ MQTT ─────────────────────────────────────────────
interface ShelfMqttState {
  isActive: boolean;        // Đèn đang sáng (picking light on)
  orderId?: string;
  qty?: number;
  lastEvent?: string;       // CONFIRMED | LOCATING | MANUAL_BTN
  lastEventTime?: number;
}

// ─── Dữ liệu môi trường từ MQTT ─────────────────────────────────────────────
interface EnvData {
  temperature: number;
  humidity: number;
  status: 'NORMAL' | 'VIOLATION';
  timestamp: number;
}

// ─── Component chính ─────────────────────────────────────────────────────────
export const WarehouseFloorMap: React.FC = () => {
  // Trạng thái kệ từ MQTT (index = vị trí trong SHELVES array)
  const [shelfStates, setShelfStates] = useState<Record<string, ShelfMqttState>>(
    Object.fromEntries(SHELVES.map((s) => [s.code, { isActive: false }]))
  );
  const [envData, setEnvData] = useState<EnvData | null>(null);
  const [selectedShelf, setSelectedShelf] = useState<ShelfInfo | null>(null);
  const [orderIdInput, setOrderIdInput] = useState('');
  const [qtyInput, setQtyInput] = useState(1);
  const [eventLog, setEventLog] = useState<Array<{time: string; msg: string; type: 'info'|'success'|'warn'}>>([]);
  const [buzzerEnabled, setBuzzerEnabled] = useState(true);

  // Blinking state cho animation
  const [blinkTick, setBlinkTick] = useState(false);
  useEffect(() => {
    const timer = setInterval(() => setBlinkTick((v) => !v), 500);
    return () => clearInterval(timer);
  }, []);

  // Log helper
  const addLog = useCallback((msg: string, type: 'info'|'success'|'warn' = 'info') => {
    const time = new Date().toLocaleTimeString('vi-VN');
    setEventLog((prev) => [{ time, msg, type }, ...prev].slice(0, 50));
  }, []);

  // ── MQTT: xử lý message nhận về ──
  const handleMqttMessage = useCallback((topic: string, payload: string) => {
    try {
      const data = JSON.parse(payload);

      if (topic === MQTT_TOPICS.ENV) {
        setEnvData({
          temperature: data.temperature ?? 0,
          humidity: data.humidity ?? 0,
          status: data.status ?? 'NORMAL',
          timestamp: data.timestamp ?? Date.now(),
        });
        return;
      }

      if (topic === MQTT_TOPICS.EVT_SHELF) {
        const { event, shelfCode, orderId, qty } = data;

        if (event === 'LOCATING' || event === 'LOCATING_MULTI') {
          if (shelfCode) {
            setShelfStates((prev) => ({
              ...prev,
              [shelfCode]: { isActive: true, orderId, qty, lastEvent: 'LOCATING', lastEventTime: Date.now() },
            }));
            addLog(`💡 Kệ ${shelfCode} đang sáng — Order: ${orderId}`, 'info');
          }
        }

        if (event === 'CONFIRMED') {
          setShelfStates((prev) => ({
            ...prev,
            [shelfCode]: { isActive: false, orderId, qty, lastEvent: 'CONFIRMED', lastEventTime: Date.now() },
          }));
          addLog(`✅ Kệ ${shelfCode} đã check-in xong — Order: ${orderId}`, 'success');
        }

        if (event === 'MANUAL_BTN') {
          addLog(`👆 Kệ ${shelfCode} được bấm nút (không có lệnh pick)`, 'warn');
        }

        if (event === 'DEVICE_ONLINE') {
          addLog(`🔌 ESP32 WH-006 vừa online (IP: ${data.ip ?? '?'})`, 'info');
        }
      }
    } catch (e) {
      // Bỏ qua message không phải JSON
    }
  }, [addLog]);

  const { isConnected, isConnecting, publish } = useMqtt({
    topics: [MQTT_TOPICS.EVT_SHELF, MQTT_TOPICS.ENV],
    clientIdPrefix: 'citymart-dashboard',
    onMessage: handleMqttMessage,
  });

  // ── Gửi lệnh LOCATE ──
  const sendLocate = useCallback((shelfCode: string, orderId: string, qty: number) => {
    if (!isConnected) {
      addLog('❌ Chưa kết nối MQTT!', 'warn');
      return;
    }
    publish(MQTT_TOPICS.CMD_SHELF, {
      action: 'LOCATE',
      shelfCode,
      orderId: orderId || `ORD-WEB-${Date.now()}`,
      qty,
      buzzer: buzzerEnabled,
    });
    addLog(`📡 Gửi LOCATE → Kệ ${shelfCode} (${orderId})`, 'info');
    // Optimistic update
    setShelfStates((prev) => ({
      ...prev,
      [shelfCode]: { isActive: true, orderId, qty, lastEvent: 'LOCATING', lastEventTime: Date.now() },
    }));
  }, [isConnected, publish, buzzerEnabled, addLog]);

  // ── Gửi lệnh tắt kệ ──
  const sendOff = useCallback((shelfCode: string) => {
    publish(MQTT_TOPICS.CMD_SHELF, { action: 'OFF', shelfCode });
    setShelfStates((prev) => ({
      ...prev,
      [shelfCode]: { ...prev[shelfCode], isActive: false },
    }));
    addLog(`🔕 Tắt kệ ${shelfCode}`, 'warn');
  }, [publish, addLog]);

  // ── Reset tất cả ──
  const sendResetAll = useCallback(() => {
    publish(MQTT_TOPICS.CMD_SYSTEM, { action: 'RESET' });
    setShelfStates(Object.fromEntries(SHELVES.map((s) => [s.code, { isActive: false }])));
    addLog('🔄 Đã tắt tất cả kệ (RESET)', 'warn');
  }, [publish, addLog]);

  // ── Test đèn tất cả ──
  const sendTestAll = useCallback(() => {
    publish(MQTT_TOPICS.CMD_SHELF, { action: 'TEST', shelfCode: '' });
    addLog('🧪 Gửi lệnh TEST tất cả đèn/còi', 'info');
  }, [publish, addLog]);

  // ── Click vào kệ trên sơ đồ ──
  const handleShelfClick = (shelf: ShelfInfo) => {
    setSelectedShelf(shelf);
    setOrderIdInput('');
    setQtyInput(1);
  };

  const isAlarm = envData?.status === 'VIOLATION';
  const activeCount = Object.values(shelfStates).filter((s) => s.isActive).length;

  // ─── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 font-sans">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <span className="text-3xl">🏭</span>
            CityMart — Kho Lạnh WH-006
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">
            Sa bàn thực tế · Picking Light System · ESP32 MQTT
          </p>
        </div>

        {/* MQTT Status + Sensor */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Nhiệt độ */}
          {envData ? (
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${
              isAlarm ? 'bg-red-950 border-red-500 text-red-300' : 'bg-gray-800 border-gray-600 text-gray-300'
            }`}>
              <Thermometer size={16} className={isAlarm ? 'text-red-400' : 'text-blue-400'} />
              <span className="font-mono text-sm font-semibold">{envData.temperature.toFixed(1)}°C</span>
              <Droplets size={14} className="text-blue-300 ml-1" />
              <span className="font-mono text-sm">{envData.humidity.toFixed(0)}%</span>
              {isAlarm && <AlertTriangle size={14} className="text-red-400 ml-1" />}
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-gray-500 text-sm">
              <Thermometer size={16} /> Chờ cảm biến...
            </div>
          )}

          {/* MQTT conn */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm ${
            isConnected
              ? 'bg-green-950 border-green-600 text-green-300'
              : isConnecting
              ? 'bg-yellow-950 border-yellow-600 text-yellow-300'
              : 'bg-red-950 border-red-600 text-red-300'
          }`}>
            {isConnected ? <Wifi size={15} /> : <WifiOff size={15} />}
            <span className="font-medium">
              {isConnected ? 'MQTT Online' : isConnecting ? 'Đang kết nối...' : 'MQTT Offline'}
            </span>
            {isConnected && <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />}
          </div>
        </div>
      </div>

      {/* ── Active picking alert ── */}
      {activeCount > 0 && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border mb-4 ${
          blinkTick ? 'bg-yellow-900/50 border-yellow-400' : 'bg-yellow-950/80 border-yellow-600'
        } transition-colors`}>
          <Zap size={18} className="text-yellow-400" />
          <span className="text-yellow-200 font-semibold">
            {activeCount} kệ đang sáng — Nhân viên hãy đến check-in!
          </span>
          <button
            onClick={sendResetAll}
            className="ml-auto flex items-center gap-1.5 px-3 py-1 bg-yellow-700 hover:bg-yellow-600 rounded-lg text-sm transition-colors"
          >
            <RotateCcw size={13} /> Tắt tất cả
          </button>
        </div>
      )}

      {/* ── Main layout: Sơ đồ + Panel ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

        {/* ── CỘT TRÁI: Sơ đồ sa bàn ── */}
        <div className="xl:col-span-2 space-y-4">

          {/* Sa bàn title */}
          <div className="bg-gray-900 rounded-2xl border border-gray-700 p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-200 flex items-center gap-2">
                <Activity size={18} className="text-cyan-400" />
                Sơ đồ Sa Bàn Kho Lạnh
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const next = !buzzerEnabled;
                    setBuzzerEnabled(next);
                    publish(MQTT_TOPICS.CMD_SYSTEM, { action: 'SET_BUZZER', enabled: next, muted: !next });
                    fetch('http://localhost:3002/api/iot/shelf/buzzer', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ enabled: next }),
                    }).catch(() => {});
                  }}
                  title={buzzerEnabled ? 'Tắt còi (Chỉ sáng đèn)' : 'Bật còi báo'}
                  className={`p-2 rounded-lg border transition-colors ${
                    buzzerEnabled
                      ? 'bg-indigo-900 border-indigo-500 text-indigo-300'
                      : 'bg-gray-800 border-gray-600 text-gray-500'
                  }`}
                >
                  {buzzerEnabled ? <Bell size={15} /> : <BellOff size={15} />}
                </button>
                <button
                  onClick={sendTestAll}
                  disabled={!isConnected}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-40 rounded-lg text-sm transition-colors"
                >
                  🧪 Test đèn
                </button>
                <button
                  onClick={sendResetAll}
                  disabled={!isConnected}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-40 rounded-lg text-sm transition-colors"
                >
                  <RotateCcw size={13} /> Reset
                </button>
              </div>
            </div>

            {/* Phòng kho — viền tường */}
            <div
              className="relative rounded-2xl border-4 border-gray-500 bg-gray-800/50 p-6"
              style={{ minHeight: '300px' }}
            >
              {/* Nhãn kho */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-white text-gray-900 font-bold text-xs px-4 py-1 rounded-b-lg shadow">
                CityMart · Hệ thống Giám sát Kho Lạnh (WH-006)
              </div>

              {/* Lưới kệ — layout ngang giống sa bàn thực */}
              <div className="mt-6 flex flex-wrap gap-4 justify-center items-stretch">
                {SHELVES.map((shelf) => {
                  const st = shelfStates[shelf.code];
                  const isActive = st?.isActive ?? false;
                  const isDoor = shelf.code === 'DOOR';

                  return (
                    <div
                      key={shelf.code}
                      onClick={() => handleShelfClick(shelf)}
                      className={`
                        relative cursor-pointer rounded-xl border-2 p-4 flex flex-col items-center gap-2
                        transition-all duration-300 select-none
                        ${isDoor ? 'w-28' : 'flex-1 min-w-36 max-w-48'}
                        ${isActive
                          ? `${shelf.colorBorder} ${shelf.colorBg} shadow-2xl scale-105`
                          : 'border-gray-600 bg-gray-800/60 hover:border-gray-400 hover:bg-gray-700/80'
                        }
                      `}
                      style={isActive ? {
                        boxShadow: `0 0 24px 6px ${shelf.colorGlow}55, 0 0 8px 2px ${shelf.colorGlow}99`,
                      } : undefined}
                    >
                      {/* Đèn LED indicator */}
                      <div
                        className="w-5 h-5 rounded-full border-2 transition-all duration-150"
                        style={{
                          backgroundColor: isActive
                            ? (blinkTick ? shelf.color : `${shelf.color}66`)
                            : '#374151',
                          borderColor: isActive ? shelf.color : '#4b5563',
                          boxShadow: isActive ? `0 0 8px ${shelf.color}` : 'none',
                        }}
                      />

                      {/* Emoji + label */}
                      <div className="text-3xl">{shelf.emoji}</div>
                      <div className="text-center">
                        <div className={`font-bold text-sm ${isActive ? 'text-white' : 'text-gray-300'}`}>
                          {isDoor ? 'Cửa Kho' : shelf.code}
                        </div>
                        <div className={`text-xs mt-0.5 ${isActive ? 'text-gray-200' : 'text-gray-500'}`}>
                          {isDoor ? 'Check-In' : shelf.category.split('&')[0].trim()}
                        </div>
                      </div>

                      {/* Badge trạng thái */}
                      {isActive && (
                        <div
                          className={`absolute -top-2 -right-2 px-2 py-0.5 rounded-full text-xs font-bold text-white ${
                            blinkTick ? 'opacity-100' : 'opacity-70'
                          }`}
                          style={{ backgroundColor: shelf.color }}
                        >
                          ACTIVE
                        </div>
                      )}

                      {/* Hiện order ID nếu active */}
                      {isActive && st?.orderId && (
                        <div className="text-xs text-gray-300 bg-black/40 rounded px-2 py-0.5 w-full text-center truncate">
                          {st.orderId}
                        </div>
                      )}

                      {/* Nút tắt nhanh */}
                      {isActive && (
                        <button
                          onClick={(e) => { e.stopPropagation(); sendOff(shelf.code); }}
                          className="text-xs px-2 py-0.5 bg-black/40 hover:bg-black/60 rounded border border-gray-600 transition-colors"
                        >
                          Tắt
                        </button>
                      )}

                      {/* Check-in confirmed indicator */}
                      {!isActive && st?.lastEvent === 'CONFIRMED' && (
                        <CheckCircle2 size={16} className="text-green-400 absolute top-2 right-2" />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Chú thích cửa ra vào */}
              <div className="mt-4 flex justify-start">
                <div className="flex items-center gap-2 text-xs text-gray-500 border border-dashed border-gray-600 rounded px-3 py-1">
                  <span>←</span>
                  <span>Lối vào kho</span>
                </div>
              </div>
            </div>

            {/* Chú thích màu */}
            <div className="flex flex-wrap gap-4 mt-3 justify-center">
              {[
                { color: '#ef4444', label: 'Kệ A1 — Thịt (Đỏ)' },
                { color: '#3b82f6', label: 'Kệ A2 — Sữa (Xanh)' },
                { color: '#22c55e', label: 'Kệ A3 — Rau (Xanh lá)' },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-1.5 text-xs text-gray-400">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span>{item.label}</span>
                </div>
              ))}
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <div className="w-3 h-3 rounded-full bg-gray-600 border border-gray-500" />
                <span>Kệ chưa active</span>
              </div>
            </div>
          </div>

          {/* Event log */}
          <div className="bg-gray-900 rounded-2xl border border-gray-700 p-4">
            <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
              <Clock size={15} className="text-gray-500" />
              Nhật ký sự kiện MQTT
            </h3>
            <div className="max-h-40 overflow-y-auto space-y-1 font-mono text-xs">
              {eventLog.length === 0 ? (
                <div className="text-gray-600 italic py-2 text-center">Chưa có sự kiện...</div>
              ) : (
                eventLog.map((log, i) => (
                  <div
                    key={i}
                    className={`flex gap-2 py-0.5 px-2 rounded ${
                      log.type === 'success' ? 'text-green-400 bg-green-950/40' :
                      log.type === 'warn'    ? 'text-yellow-400 bg-yellow-950/40' :
                                              'text-gray-400 bg-gray-800/30'
                    }`}
                  >
                    <span className="text-gray-600 shrink-0">[{log.time}]</span>
                    <span>{log.msg}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* ── CỘT PHẢI: Panel điều khiển ── */}
        <div className="space-y-4">

          {/* Panel gửi lệnh picking */}
          <div className="bg-gray-900 rounded-2xl border border-gray-700 p-4">
            <h3 className="text-base font-bold text-gray-200 mb-4 flex items-center gap-2">
              <Send size={16} className="text-indigo-400" />
              Gửi lệnh Picking
            </h3>

            {/* Chọn kệ */}
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Chọn kệ</label>
                <div className="grid grid-cols-2 gap-2">
                  {SHELVES.filter((s) => s.code !== 'DOOR').map((shelf) => {
                    const isActive = shelfStates[shelf.code]?.isActive;
                    const isSelected = selectedShelf?.code === shelf.code;
                    return (
                      <button
                        key={shelf.code}
                        onClick={() => setSelectedShelf(shelf)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${
                          isSelected
                            ? `${shelf.colorBorder} ${shelf.colorBg} text-white`
                            : 'border-gray-600 bg-gray-800 hover:border-gray-500 text-gray-300'
                        }`}
                      >
                        <span>{shelf.emoji}</span>
                        <span className="font-medium">{shelf.code}</span>
                        {isActive && <span className="ml-auto w-2 h-2 rounded-full" style={{ backgroundColor: shelf.color }} />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Order ID */}
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Mã đơn hàng</label>
                <input
                  type="text"
                  value={orderIdInput}
                  onChange={(e) => setOrderIdInput(e.target.value)}
                  placeholder="VD: ORD-2026-001"
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Số lượng */}
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Số lượng cần lấy</label>
                <input
                  type="number"
                  min={1}
                  value={qtyInput}
                  onChange={(e) => setQtyInput(Number(e.target.value))}
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Nút gửi */}
              <button
                onClick={() => {
                  if (selectedShelf) {
                    sendLocate(
                      selectedShelf.code,
                      orderIdInput || `ORD-WEB-${Date.now()}`,
                      qtyInput
                    );
                  }
                }}
                disabled={!isConnected || !selectedShelf}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:text-gray-500 rounded-xl font-semibold text-sm transition-colors"
              >
                <Zap size={16} />
                Bật đèn kệ {selectedShelf?.code ?? '---'}
              </button>
            </div>
          </div>

          {/* Chi tiết kệ được chọn */}
          {selectedShelf && selectedShelf.code !== 'DOOR' && (
            <div className={`rounded-2xl border-2 p-4 ${selectedShelf.colorBorder} ${selectedShelf.colorBg}`}>
              <h3 className="font-bold text-white mb-3 flex items-center gap-2">
                <span className="text-xl">{selectedShelf.emoji}</span>
                {selectedShelf.label}
              </h3>
              <div className="text-xs text-gray-300 space-y-1 mb-3">
                <div className="flex justify-between">
                  <span className="text-gray-500">Danh mục:</span>
                  <span>{selectedShelf.category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Nhiệt độ:</span>
                  <span>{selectedShelf.tempRange}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Độ ẩm:</span>
                  <span>{selectedShelf.humidity}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Trạng thái:</span>
                  <span className={shelfStates[selectedShelf.code]?.isActive ? 'text-yellow-300 font-bold' : 'text-green-400'}>
                    {shelfStates[selectedShelf.code]?.isActive ? '⚡ ĐANG ACTIVE' : '✅ Idle'}
                  </span>
                </div>
              </div>
              <div className="border-t border-gray-700 pt-3">
                <div className="text-xs text-gray-400 mb-2 flex items-center gap-1">
                  <Package size={12} /> Hàng trong kệ:
                </div>
                {selectedShelf.products.map((p) => (
                  <div key={p.sku} className="text-xs flex justify-between py-1 border-b border-gray-800 last:border-0">
                    <span className="text-gray-300 truncate mr-2">{p.name}</span>
                    <span className="text-gray-500 shrink-0">{p.qty} {p.unit}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sensor info */}
          {envData && (
            <div className={`rounded-2xl border p-4 ${
              isAlarm ? 'bg-red-950 border-red-500' : 'bg-gray-900 border-gray-700'
            }`}>
              <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                {isAlarm
                  ? <><AlertTriangle size={15} className="text-red-400" /> <span className="text-red-300">⚠️ Cảnh báo nhiệt độ!</span></>
                  : <><Info size={15} className="text-cyan-400" /> <span className="text-gray-300">Môi trường kho</span></>
                }
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-black/30 rounded-xl p-3 text-center">
                  <Thermometer size={20} className={`mx-auto mb-1 ${isAlarm ? 'text-red-400' : 'text-blue-400'}`} />
                  <div className={`text-2xl font-mono font-bold ${isAlarm ? 'text-red-300' : 'text-white'}`}>
                    {envData.temperature.toFixed(1)}
                    <span className="text-sm font-normal">°C</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">Nhiệt độ</div>
                </div>
                <div className="bg-black/30 rounded-xl p-3 text-center">
                  <Droplets size={20} className="mx-auto mb-1 text-blue-400" />
                  <div className="text-2xl font-mono font-bold text-white">
                    {envData.humidity.toFixed(0)}
                    <span className="text-sm font-normal">%</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">Độ ẩm</div>
                </div>
              </div>
              <div className={`mt-2 text-center text-xs rounded-lg py-1 ${
                isAlarm ? 'bg-red-900 text-red-200' : 'bg-green-950 text-green-400'
              }`}>
                {isAlarm ? '🚨 VIOLATION — Kiểm tra ngay!' : '✅ Môi trường ổn định'}
              </div>
            </div>
          )}

          {/* Quick commands */}
          <div className="bg-gray-900 rounded-2xl border border-gray-700 p-4">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">Lệnh nhanh</h3>
            <div className="space-y-2">
              <button
                onClick={sendTestAll}
                disabled={!isConnected}
                className="w-full text-sm py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-40 rounded-xl border border-gray-600 transition-colors"
              >
                🧪 Test tất cả đèn & còi
              </button>
              <button
                onClick={sendResetAll}
                disabled={!isConnected}
                className="w-full text-sm py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-40 rounded-xl border border-gray-600 transition-colors"
              >
                <RotateCcw size={13} className="inline mr-1" />
                Tắt tất cả kệ (RESET)
              </button>
              {/* Locate tất cả để demo */}
              <button
                onClick={() => {
                  SHELVES.filter(s => s.code !== 'DOOR').forEach((s) =>
                    sendLocate(s.code, `DEMO-${Date.now()}`, 1)
                  );
                }}
                disabled={!isConnected}
                className="w-full text-sm py-2 bg-indigo-900 hover:bg-indigo-800 disabled:opacity-40 rounded-xl border border-indigo-700 transition-colors text-indigo-200"
              >
                ⚡ Demo: Bật tất cả kệ
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WarehouseFloorMap;

