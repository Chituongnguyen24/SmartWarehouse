import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Package,
  Boxes,
  ShieldAlert,
  ArrowDownToLine,
  ArrowUpFromLine,
  Thermometer,
  Volume2,
  VolumeX,
  AlertTriangle,
  CheckCircle2,
  Snowflake,
  Wind,
  Activity,
  RefreshCw,
  Send,
  Truck,
  Clock,
  Compass,
  Layers,
  Zap,
  Building2,
  Lock,
  BellRing,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Radio,
  Sliders,
  Check,
  MapPin,
  TrendingUp,
  ShoppingCart,
  CalendarCheck,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { io, Socket } from 'socket.io-client';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth';
import { useWarehouse } from '@/shared';
import { getApiHost } from '@/shared/utils/apiConfig';

// Standard Safe Thresholds for Gò Vấp Cold Chain
const COOL_SAFE_MIN = 0.0;
const COOL_SAFE_MAX = 4.0;
const FROZEN_SAFE_MIN = -22.0;
const FROZEN_SAFE_MAX = -18.0;

export const Dashboard: React.FC = () => {
  const { token, user } = useAuth();
  const { selectedWarehouse, selectedWarehouseCode, setSelectedWarehouseCode, warehouses } = useWarehouse();
  const navigate = useNavigate();

  const isAdmin = user?.role === 'ADMIN';
  const myWarehouseCode = user?.warehouseCode || (
    user?.email?.includes('001') || user?.email?.includes('q12') ? 'WH-001' :
    user?.email?.includes('002') ? 'WH-002' :
    user?.email?.includes('005') ? 'WH-005' :
    'WH-006'
  );
  // Admin is allowed to choose any warehouse. Warehouse accounts are strictly locked to their warehouse.
  const effectiveWhCode = isAdmin ? (selectedWarehouseCode || 'WH-006') : (user?.warehouseCode || myWarehouseCode || 'WH-006');

  // Role Routing: Staff & Drivers are redirected, Managers & Admins view the Dashboard
  useEffect(() => {
    if (user) {
      if (user.role === 'WAREHOUSE_STAFF') {
        navigate('/orders', { replace: true });
      } else if (user.role === 'SALES_STAFF') {
        navigate('/sales', { replace: true });
      } else if (user.role === 'DRIVER') {
        navigate('/transport', { replace: true });
      }
    }
  }, [user, navigate]);

  // Real Stats from Backend Microservices
  const [totalProducts, setTotalProducts] = useState<number>(0);
  const [totalLots, setTotalLots] = useState<number>(0);
  const [alertCount, setAlertCount] = useState<number>(0);
  const [urgentFefo, setUrgentFefo] = useState<any[]>([]);
  const [outboundOrders, setOutboundOrders] = useState<any[]>([]);
  const [inboundCount, setInboundCount] = useState<number>(0);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isWsConnected, setIsWsConnected] = useState<boolean>(false);

  // IoT Sensor Telemetry & Simulation States
  const [coolTemp, setCoolTemp] = useState<number>(2.6);
  const [coolHum, setCoolHum] = useState<number>(76.5);
  const [isSimulatedOverheat, setIsSimulatedOverheat] = useState<boolean>(false);
  const [isSirenMuted, setIsSirenMuted] = useState<boolean>(false);
  const [activeLocatingShelf, setActiveLocatingShelf] = useState<string | null>(null);
  const [chirpingShelf, setChirpingShelf] = useState<string | null>(null);

  // Active Cold Room Tab in Command Center
  const [activeColdRoom, setActiveColdRoom] = useState<'COOL' | 'FROZEN' | 'DRY'>('COOL');

  // Audio Context Ref for Continuous Warning Siren
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sirenOscRef = useRef<OscillatorNode | null>(null);
  const sirenGainRef = useRef<GainNode | null>(null);
  const sirenTimerRef = useRef<any>(null);

  // 24-Hour Temperature Telemetry Datasets
  const [telemetryHistory, setTelemetryHistory] = useState([
    { time: '00:00', temp: 2.2, safeMax: 4.0, safeMin: 0.0 },
    { time: '02:00', temp: 2.3, safeMax: 4.0, safeMin: 0.0 },
    { time: '04:00', temp: 2.1, safeMax: 4.0, safeMin: 0.0 },
    { time: '06:00', temp: 2.4, safeMax: 4.0, safeMin: 0.0 },
    { time: '08:00', temp: 2.8, safeMax: 4.0, safeMin: 0.0 },
    { time: '10:00', temp: 3.2, safeMax: 4.0, safeMin: 0.0 },
    { time: '12:00', temp: 3.4, safeMax: 4.0, safeMin: 0.0 },
    { time: '14:00', temp: 3.1, safeMax: 4.0, safeMin: 0.0 },
    { time: '16:00', temp: 2.6, safeMax: 4.0, safeMin: 0.0 },
  ]);

  const frozenTelemetryHistory = useMemo(() => [
    { time: '00:00', temp: -19.2, safeMax: -18.0, safeMin: -22.0 },
    { time: '04:00', temp: -19.5, safeMax: -18.0, safeMin: -22.0 },
    { time: '08:00', temp: -19.1, safeMax: -18.0, safeMin: -22.0 },
    { time: '12:00', temp: -19.4, safeMax: -18.0, safeMin: -22.0 },
    { time: '16:00', temp: -19.6, safeMax: -18.0, safeMin: -22.0 },
    { time: 'Hiện tại', temp: -19.4, safeMax: -18.0, safeMin: -22.0 },
  ], []);

  const dryTelemetryHistory = useMemo(() => [
    { time: '00:00', temp: 23.8, safeMax: 25.0, safeMin: 20.0 },
    { time: '04:00', temp: 23.5, safeMax: 25.0, safeMin: 20.0 },
    { time: '08:00', temp: 24.1, safeMax: 25.0, safeMin: 20.0 },
    { time: '12:00', temp: 24.6, safeMax: 25.0, safeMin: 20.0 },
    { time: '16:00', temp: 24.4, safeMax: 25.0, safeMin: 20.0 },
    { time: 'Hiện tại', temp: 24.2, safeMax: 25.0, safeMin: 20.0 },
  ], []);

  // Audio Siren Player (Hú còi cảnh báo quá nhiệt)
  const startSiren = useCallback(() => {
    if (isSirenMuted) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
      }

      if (sirenOscRef.current) return; // Already running

      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(650, ctx.currentTime);
      gain.gain.setValueAtTime(0.18, ctx.currentTime);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();

      sirenOscRef.current = osc;
      sirenGainRef.current = gain;

      // European two-tone siren modulation (Hi-Lo alarm)
      let highTone = true;
      sirenTimerRef.current = setInterval(() => {
        if (!sirenOscRef.current || !audioCtxRef.current) return;
        const now = audioCtxRef.current.currentTime;
        sirenOscRef.current.frequency.setValueAtTime(highTone ? 920 : 650, now);
        highTone = !highTone;
      }, 450);
    } catch (e) {
      console.warn('Audio siren failed:', e);
    }
  }, [isSirenMuted]);

  const stopSiren = useCallback(() => {
    if (sirenTimerRef.current) {
      clearInterval(sirenTimerRef.current);
      sirenTimerRef.current = null;
    }
    if (sirenOscRef.current) {
      try {
        sirenOscRef.current.stop();
        sirenOscRef.current.disconnect();
      } catch (e) {}
      sirenOscRef.current = null;
    }
    if (sirenGainRef.current) {
      try {
        sirenGainRef.current.disconnect();
      } catch (e) {}
      sirenGainRef.current = null;
    }
  }, []);

  // Monitor Temperature Breach & Trigger Continuous Audio Siren
  const isOverheatBreached = coolTemp > COOL_SAFE_MAX;
  useEffect(() => {
    if (isOverheatBreached && !isSirenMuted) {
      startSiren();
    } else {
      stopSiren();
    }
    return () => stopSiren();
  }, [isOverheatBreached, isSirenMuted, startSiren, stopSiren]);

  // Fetch Live Operational Data
  const fetchDashboardData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const whCode = effectiveWhCode;

      // 1. Fetch Products
      const pRes = await fetch(`${getApiHost(3010)}/products`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (pRes.ok) {
        const pData = await pRes.json();
        const count = pData.total !== undefined ? Number(pData.total) : (Array.isArray(pData) ? pData.length : (Array.isArray(pData.items) ? pData.items.length : 0));
        setTotalProducts(count);
      }

      // 2. Fetch Inventory Lots
      const lRes = await fetch(`${getApiHost(3011)}/inventory/lots?warehouseCode=${whCode}&limit=1000`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      let lots = [];
      if (lRes.ok) {
        lots = await lRes.json();
        setTotalLots(Array.isArray(lots) ? lots.length : 0);
      }

      // 3. Compute FEFO & Early Warning
      const today = new Date().getTime();
      let alerts = 0;
      const fefoList = [];

      for (const lot of lots) {
        if (lot.remainingQty <= 0) continue;
        if (lot.riskScore > 70) alerts++;

        const expTime = new Date(lot.expiryDate).getTime();
        const daysLeft = Math.max(0, (expTime - today) / (1000 * 3600 * 24));
        if (daysLeft <= 7) alerts++;

        let expiryScore = 0;
        if (daysLeft <= 0) expiryScore = 100;
        else if (daysLeft <= 3) expiryScore = 90;
        else if (daysLeft <= 7) expiryScore = 70;
        else expiryScore = 30;

        const fefoScore = Math.round((lot.riskScore * 0.6) + (expiryScore * 0.4));
        if (fefoScore >= 50) {
          fefoList.push({ ...lot, fefoScore, daysLeft: Math.round(daysLeft) });
        }
      }

      setAlertCount(alerts);
      setUrgentFefo(fefoList.sort((a, b) => b.fefoScore - a.fefoScore).slice(0, 5));

      // 4. Fetch Outbound Orders (Live Wave Picking)
      const obRes = await fetch(`${getApiHost(3007)}/outbound-orders?warehouseCode=${whCode}&limit=30`);
      if (obRes.ok) {
        const obData = await obRes.json();
        setOutboundOrders(Array.isArray(obData) ? obData : []);
      }

      // 5. Fetch Inbound Orders
      const inRes = await fetch(`${getApiHost(3006)}/inbound-orders?warehouseCode=${whCode}&limit=30`);
      if (inRes.ok) {
        const inData = await inRes.json();
        const pendingInbound = Array.isArray(inData)
          ? inData.filter((i: any) => i.status !== 'STORED' && i.status !== 'COMPLETED' && i.status !== 'CANCELLED')
          : [];
        setInboundCount(pendingInbound.length);
      }
    } catch (e) {
      console.warn('Dashboard fetch error:', e);
    } finally {
      setIsRefreshing(false);
    }
  }, [effectiveWhCode, token]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Real-time WebSocket connection to Gateway on Port 3004
  useEffect(() => {
    const socket: Socket = io(getApiHost(3004), {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
    });

    socket.on('connect', () => {
      setIsWsConnected(true);
    });

    socket.on('disconnect', () => {
      setIsWsConnected(false);
    });

    socket.on('outbound_order_created', () => fetchDashboardData());
    socket.on('new_order', () => fetchDashboardData());
    socket.on('outbound_order_updated', () => fetchDashboardData());
    socket.on('order_status_updated', () => fetchDashboardData());
    socket.on('order_cancelled', () => fetchDashboardData());
    socket.on('inbound_order_created', () => fetchDashboardData());

    return () => {
      socket.disconnect();
    };
  }, [fetchDashboardData]);

  // Shelf Hardware Interaction APIs
  const handleLocateShelf = async (shelfCode: string, productName: string) => {
    try {
      if (activeLocatingShelf === shelfCode) {
        setActiveLocatingShelf(null);
        await fetch(`${getApiHost(3007)}/outbound-orders/iot/complete-shelf`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            warehouseCode: effectiveWhCode || 'WH-006',
            shelfCode,
          }),
        });
      } else {
        setActiveLocatingShelf(shelfCode);
        await fetch(`${getApiHost(3007)}/outbound-orders/iot/locate-shelf`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            warehouseCode: effectiveWhCode || 'WH-006',
            shelfCode,
            productName,
            qty: 1,
          }),
        });
      }
    } catch (e) {
      console.warn('Locate shelf error:', e);
    }
  };

  const handleChirpShelf = async (shelfCode: string) => {
    try {
      setChirpingShelf(shelfCode);
      await fetch('http://localhost:3007/outbound-orders/iot/chirp-shelf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          warehouseCode: effectiveWhCode || 'WH-006',
          shelfCode,
        }),
      });
      setTimeout(() => setChirpingShelf(null), 1200);
    } catch (e) {
      console.warn('Chirp shelf error:', e);
      setChirpingShelf(null);
    }
  };

  // Temperature Simulation Actions
  const handleSimulateOverheat = () => {
    setIsSimulatedOverheat(true);
    setCoolTemp(5.8);
    setCoolHum(88.0);
    setIsSirenMuted(false);
    setTelemetryHistory(prev => [
      ...prev,
      { time: 'Hiện tại', temp: 5.8, safeMax: 4.0, safeMin: 0.0 },
    ]);
  };

  const handleRestoreSafeTemp = () => {
    setIsSimulatedOverheat(false);
    setCoolTemp(2.6);
    setCoolHum(76.5);
    stopSiren();
    setTelemetryHistory(prev => [
      ...prev,
      { time: 'Đã hạ nhiệt', temp: 2.6, safeMax: 4.0, safeMin: 0.0 },
    ]);
  };

  // Operational Metrics Computations
  const pendingOrders = useMemo(() => {
    return outboundOrders.filter(o => o.status === 'PENDING');
  }, [outboundOrders]);

  const pickingOrders = useMemo(() => {
    return outboundOrders.filter(o => o.status === 'PICKING');
  }, [outboundOrders]);

  const packingOrders = useMemo(() => {
    return outboundOrders.filter(o => ['PICKED', 'PACKING', 'PACKED', 'CONFIRMED'].includes(o.status));
  }, [outboundOrders]);

  const shippedOrders = useMemo(() => {
    return outboundOrders.filter(o => ['SHIPPED', 'IN_TRANSIT', 'DELIVERING'].includes(o.status));
  }, [outboundOrders]);

  const completedOrders = useMemo(() => {
    return outboundOrders.filter(o => ['DELIVERED', 'COMPLETED'].includes(o.status));
  }, [outboundOrders]);

  const totalPickingUnits = pickingOrders.reduce((sum, o) => sum + (o.totalQuantity || o.items?.length || 1), 0);
  const pickedUnits = pickingOrders.reduce((sum, o) => {
    if (!Array.isArray(o.items)) return sum;
    return sum + o.items.reduce((s: number, i: any) => s + (Number(i.pickedQuantity) || 0), 0);
  }, 0);
  const pickingPercent = totalPickingUnits > 0 ? Math.round((pickedUnits / totalPickingUnits) * 100) : 100;

  // Active room settings for IoT Telemetry
  const activeRoomData = useMemo(() => {
    if (activeColdRoom === 'FROZEN') {
      return {
        name: 'Phòng Kho Đông',
        subtitle: 'Thịt bò Úc, hải sản Na Uy, kem',
        temp: -19.4,
        hum: 62.0,
        tempStandard: '-22.0°C ~ -18.0°C',
        humStandard: '60% ~ 75%',
        statusText: '-18°C ~ -22°C Đạt Chuẩn',
        statusColor: '#0284c7',
        statusBg: '#f0f9ff',
        statusBorder: '#7dd3fc',
        safeMax: -18.0,
        safeMin: -22.0,
        yDomain: [-25, -15],
        telemetry: frozenTelemetryHistory,
        strokeColor: '#0284c7',
        fillGradId: 'frozenGrad',
        shelves: [
          { code: 'Ke B1', name: 'Kệ B1: Bò Úc nhập khẩu', tempSafe: '-18°C ~ -22°C' },
          { code: 'Ke B2', name: 'Kệ B2: Hải sản Na Uy', tempSafe: '-18°C ~ -22°C' },
          { code: 'Ke B3', name: 'Kệ B3: Viên thả lẩu & kem', tempSafe: '-18°C ~ -20°C' },
        ]
      };
    }
    if (activeColdRoom === 'DRY') {
      return {
        name: 'Phòng Kho Khô',
        subtitle: 'Gạo ST25, mì gói, dầu ăn, gia vị',
        temp: 24.2,
        hum: 56.0,
        tempStandard: '20.0°C ~ 25.0°C',
        humStandard: '50% ~ 65%',
        statusText: '20°C ~ 25°C Khô Thoáng',
        statusColor: '#d97706',
        statusBg: '#fffbeb',
        statusBorder: '#fde68a',
        safeMax: 25.0,
        safeMin: 20.0,
        yDomain: [15, 30],
        telemetry: dryTelemetryHistory,
        strokeColor: '#d97706',
        fillGradId: 'dryGrad',
        shelves: [
          { code: 'Ke C1', name: 'Kệ C1: Gạo ST25 Sóc Trăng', tempSafe: '20°C ~ 25°C' },
          { code: 'Ke C2', name: 'Kệ C2: Mì Hảo Hảo & đồ hộp', tempSafe: '20°C ~ 25°C' },
          { code: 'Ke C3', name: 'Kệ C3: Dầu Simply & Knorr', tempSafe: '20°C ~ 25°C' },
        ]
      };
    }
    return {
      name: 'Phòng Kho Mát',
      subtitle: 'Thịt tươi CP, sữa thanh trùng, rau củ VietGAP',
      temp: coolTemp,
      hum: coolHum,
      tempStandard: '0.0°C ~ 4.0°C',
      humStandard: '70% ~ 85%',
      statusText: isOverheatBreached ? 'Cảnh Báo Vượt Ngưỡng' : '0°C ~ 4°C Tươi Ngon',
      statusColor: isOverheatBreached ? '#dc2626' : '#059669',
      statusBg: isOverheatBreached ? '#fef2f2' : '#ecfdf5',
      statusBorder: isOverheatBreached ? '#fca5a5' : '#86efac',
      safeMax: 4.0,
      safeMin: 0.0,
      yDomain: [-1, 7],
      telemetry: telemetryHistory,
      strokeColor: isOverheatBreached ? '#dc2626' : '#059669',
      fillGradId: 'coolGrad',
      shelves: [
        { code: 'Ke A1', name: 'Kệ A1: Thịt tươi CP', tempSafe: '0°C ~ 4°C' },
        { code: 'Ke A2', name: 'Kệ A2: Sữa Đà Lạt Milk', tempSafe: '2°C ~ 6°C' },
        { code: 'Ke A3', name: 'Kệ A3: Rau củ VietGAP', tempSafe: '2°C ~ 8°C' },
      ]
    };
  }, [activeColdRoom, coolTemp, coolHum, isOverheatBreached, telemetryHistory, frozenTelemetryHistory, dryTelemetryHistory]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '32px' }}>
      
      {/* 1. OVERHEAT EMERGENCY BANNER */}
      {isOverheatBreached && (
        <div
          style={{
            backgroundColor: '#fef2f2',
            backgroundImage: 'linear-gradient(90deg, #fef2f2 0%, #fee2e2 100%)',
            border: '1.5px solid #f87171',
            borderRadius: '10px',
            padding: '14px 18px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            boxShadow: '0 4px 12px rgba(239, 68, 68, 0.15)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: '#ef4444',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: '0 2px 6px rgba(239, 68, 68, 0.35)',
              }}
            >
              <AlertTriangle size={20} />
            </div>
            <div>
              <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#991b1b', letterSpacing: '-0.01em' }}>
                CẢNH BÁO: Nhiệt Độ Kho Mát Vượt Ngưỡng Cho Phép ({coolTemp.toFixed(1)}°C / Giới hạn: 4.0°C)
              </div>
              <div style={{ fontSize: '12px', color: '#b91c1c', marginTop: '2px', fontWeight: 500 }}>
                Còi báo động đang phát tín hiệu. Yêu cầu kiểm tra kín cửa kho và cụm dàn lạnh ngay lập tức.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={() => setIsSirenMuted(!isSirenMuted)}
              style={{
                backgroundColor: '#ffffff',
                color: '#334155',
                border: '1.5px solid #cbd5e1',
                padding: '6px 14px',
                borderRadius: '6px',
                fontWeight: 600,
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              }}
            >
              {isSirenMuted ? <VolumeX size={15} color="#64748b" /> : <Volume2 size={15} color="#ef4444" />}
              <span>{isSirenMuted ? 'Đã tắt chuông' : 'Tắt còi báo'}</span>
            </button>
            <button
              onClick={handleRestoreSafeTemp}
              style={{
                backgroundColor: '#0f766e',
                backgroundImage: 'linear-gradient(180deg, #0f766e 0%, #115e59 100%)',
                color: '#ffffff',
                border: 'none',
                padding: '6px 16px',
                borderRadius: '6px',
                fontWeight: 600,
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 6px rgba(15, 118, 110, 0.3)',
              }}
            >
              <CheckCircle2 size={15} />
              <span>Khôi Phục Nhiệt Độ Chuẩn (2.6°C)</span>
            </button>
          </div>
        </div>
      )}

      {/* 2. EXECUTIVE HEADER */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '10px',
          padding: '16px 20px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 6px rgba(15, 23, 42, 0.04)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '14px',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                backgroundColor: '#f0fdfa',
                border: '1px solid #99f6e4',
                color: '#0f766e',
                padding: '3px 9px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                letterSpacing: '0.02em',
              }}
            >
              <Building2 size={13} color="#0f766e" />
              <span>TRUNG TÂM ĐIỀU HÀNH WMS • C.T MART</span>
            </span>

            <span
              style={{
                backgroundColor: isWsConnected ? '#ecfdf5' : '#fef2f2',
                border: `1px solid ${isWsConnected ? '#86efac' : '#fca5a5'}`,
                color: isWsConnected ? '#15803d' : '#991b1b',
                padding: '3px 9px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  backgroundColor: isWsConnected ? '#16a34a' : '#dc2626',
                  boxShadow: isWsConnected ? '0 0 0 2px rgba(34, 197, 94, 0.3)' : 'none',
                }}
              />
              <span>{isWsConnected ? 'Thời gian thực' : 'Mất kết nối'}</span>
            </span>
          </div>

          <h1
            style={{
              margin: '3px 0 0 0',
              fontSize: '19px',
              fontWeight: 700,
              color: '#0f172a',
              letterSpacing: '-0.02em',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span>Tổng Quan Tình Hình Kho Hàng</span>
            <span style={{ fontSize: '13.5px', fontWeight: 500, color: '#64748b' }}>
              — {selectedWarehouse?.name || `Kho ${effectiveWhCode}`}
            </span>
          </h1>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Warehouse Selector */}
          {isAdmin ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
                backgroundColor: '#f8fafc',
                borderRadius: '7px',
                padding: '6px 12px',
                border: '1.5px solid #cbd5e1',
              }}
            >
              <Building2 size={15} color="#0f766e" />
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>KHO:</span>
              <select
                value={selectedWarehouseCode}
                onChange={(e) => setSelectedWarehouseCode(e.target.value)}
                style={{
                  backgroundColor: 'transparent',
                  color: '#0f172a',
                  border: 'none',
                  fontWeight: 600,
                  fontSize: '12px',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                {warehouses.map(w => (
                  <option key={w.code} value={w.code} style={{ color: '#0f172a' }}>
                    {w.name} ({w.code})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
                backgroundColor: '#f8fafc',
                borderRadius: '7px',
                padding: '6px 12px',
                border: '1px solid #e2e8f0',
              }}
            >
              <Building2 size={15} color="#64748b" />
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#0f172a' }}>
                {selectedWarehouse?.name || `Kho ${effectiveWhCode}`} ({effectiveWhCode})
              </span>
            </div>
          )}

          {/* Quick Outbound Link */}
          <button
            onClick={() => navigate('/orders')}
            style={{
              backgroundColor: '#0284c7',
              backgroundImage: 'linear-gradient(180deg, #0284c7 0%, #0369a1 100%)',
              color: '#ffffff',
              border: 'none',
              padding: '7px 14px',
              borderRadius: '6px',
              fontWeight: 600,
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(2, 132, 199, 0.28)',
            }}
          >
            <Compass size={15} />
            <span>Xem Đơn Xuất Kho</span>
          </button>

          {/* Refresh Data */}
          <button
            onClick={() => fetchDashboardData()}
            disabled={isRefreshing}
            style={{
              backgroundColor: '#ffffff',
              color: '#334155',
              border: '1.5px solid #cbd5e1',
              padding: '6px 12px',
              borderRadius: '6px',
              fontWeight: 600,
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
            }}
          >
            <RefreshCw size={14} className={isRefreshing ? 'spin' : ''} color="#475569" />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* 3. EXECUTIVE KPI STRIP (4 VIBRANT CARDS) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
        
        {/* KPI 1: Đang Soạn Hàng */}
        <div style={kpiCardStyle('#0284c7', 'linear-gradient(180deg, #f0f9ff 0%, #ffffff 55%)')}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#0369a1', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Đơn Đang Lấy Hàng
            </span>
            <div style={kpiIconStyle('#e0f2fe', '#0284c7', 'rgba(2, 132, 199, 0.25)')}>
              <Compass size={17} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '8px' }}>
            <span style={{ fontSize: '26px', fontWeight: 700, color: '#0369a1', fontVariantNumeric: 'tabular-nums' }}>
              {pickingOrders.length}
            </span>
            <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#0284c7' }}>đơn đang lấy</span>
          </div>
          <div style={{ marginTop: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '4px', fontVariantNumeric: 'tabular-nums' }}>
              <span>Tiến độ: {pickedUnits}/{totalPickingUnits} SP</span>
              <span style={{ color: '#0369a1' }}>{pickingPercent}%</span>
            </div>
            <div style={{ width: '100%', height: '5px', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ width: `${pickingPercent}%`, height: '100%', backgroundColor: '#0284c7', borderRadius: '3px', transition: 'width 0.4s ease' }} />
            </div>
          </div>
        </div>

        {/* KPI 2: Đóng Gói & Xuất Hàng */}
        <div style={kpiCardStyle('#0f766e', 'linear-gradient(180deg, #f0fdfa 0%, #ffffff 55%)')}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#0f766e', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Chờ Bàn Giao & Xuất
            </span>
            <div style={kpiIconStyle('#ccfbf1', '#0f766e', 'rgba(15, 118, 110, 0.25)')}>
              <Boxes size={17} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '8px' }}>
            <span style={{ fontSize: '26px', fontWeight: 700, color: '#0f766e', fontVariantNumeric: 'tabular-nums' }}>
              {packingOrders.length}
            </span>
            <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#0f766e' }}>đơn đã đóng gói</span>
          </div>
          <div style={{ fontSize: '11.5px', color: '#334155', marginTop: '12px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
            <Truck size={14} color="#0f766e" />
            <span>Đang trên xe giao: <b style={{ color: '#0f766e', fontWeight: 700 }}>{shippedOrders.length} đơn</b></span>
          </div>
        </div>

        {/* KPI 3: Nhiệt Độ Kho Mát */}
        <div style={kpiCardStyle(
          isOverheatBreached ? '#dc2626' : '#16a34a',
          isOverheatBreached ? 'linear-gradient(180deg, #fef2f2 0%, #ffffff 55%)' : 'linear-gradient(180deg, #f0fdf4 0%, #ffffff 55%)'
        )}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: isOverheatBreached ? '#991b1b' : '#15803d', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Nhiệt Độ Kho Mát (IoT)
            </span>
            <div style={kpiIconStyle(
              isOverheatBreached ? '#fee2e2' : '#dcfce7',
              isOverheatBreached ? '#dc2626' : '#16a34a',
              isOverheatBreached ? 'rgba(220, 38, 38, 0.25)' : 'rgba(22, 163, 74, 0.25)'
            )}>
              <Thermometer size={17} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '8px' }}>
            <span style={{ fontSize: '26px', fontWeight: 700, color: isOverheatBreached ? '#991b1b' : '#15803d', fontVariantNumeric: 'tabular-nums' }}>
              {coolTemp.toFixed(1)}°C
            </span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '5px',
                backgroundColor: isOverheatBreached ? '#fee2e2' : '#dcfce7',
                color: isOverheatBreached ? '#991b1b' : '#166534',
                border: `1px solid ${isOverheatBreached ? '#fca5a5' : '#86efac'}`,
              }}
            >
              {isOverheatBreached ? 'Cảnh Báo Nhiệt' : '0°C ~ 4°C Chuẩn'}
            </span>
          </div>
          <div style={{ fontSize: '11.5px', color: '#475569', marginTop: '12px', display: 'flex', justifyContent: 'space-between', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
            <span>Độ ẩm: <b style={{ color: '#0284c7' }}>{coolHum.toFixed(1)}%</b></span>
            <span>Trạng thái: <b style={{ color: isOverheatBreached ? '#dc2626' : '#16a34a' }}>{isOverheatBreached ? (isSirenMuted ? 'Đã tắt âm' : 'Còi đang hú') : 'An toàn'}</b></span>
          </div>
        </div>

        {/* KPI 4: Hàng Sắp Hết Hạn */}
        <div style={kpiCardStyle(
          alertCount > 0 ? '#d97706' : '#475569',
          alertCount > 0 ? 'linear-gradient(180deg, #fffbeb 0%, #ffffff 55%)' : 'linear-gradient(180deg, #f8fafc 0%, #ffffff 55%)'
        )}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: alertCount > 0 ? '#92400e' : '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Cảnh Báo Hạn Dùng (FEFO)
            </span>
            <div style={kpiIconStyle(alertCount > 0 ? '#fef3c7' : '#f1f5f9', alertCount > 0 ? '#d97706' : '#475569', alertCount > 0 ? 'rgba(217, 119, 6, 0.25)' : undefined)}>
              <CalendarCheck size={17} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '8px' }}>
            <span style={{ fontSize: '26px', fontWeight: 700, color: alertCount > 0 ? '#b45309' : '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
              {alertCount}
            </span>
            <span style={{ fontSize: '12.5px', fontWeight: 600, color: alertCount > 0 ? '#d97706' : '#64748b' }}>lô cần xuất trước</span>
          </div>
          <div style={{ fontSize: '11.5px', color: '#475569', marginTop: '12px', display: 'flex', justifyContent: 'space-between', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
            <span>Tổng tồn: <b>{totalLots} lô</b></span>
            <span>Danh mục: <b>{totalProducts} SKU</b></span>
          </div>
        </div>

      </div>

      {/* 4. MAIN BENTO GRID (2 COLUMNS: LEFT 60%, RIGHT 40%) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: '16px', alignItems: 'start' }}>
        
        {/* ── LEFT COLUMN: FULFILLMENT PIPELINE & IOT COMMAND ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Card A: Fulfillment Pipeline (Dòng Chảy Xuất Kho) */}
          <div style={{ backgroundColor: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '16px 18px', boxShadow: '0 2px 6px rgba(15, 23, 42, 0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: '#f0fdfa', color: '#0f766e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Activity size={16} />
                </div>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                  Tiến Độ Dòng Chảy Xuất Kho (Wave Fulfillment)
                </span>
              </div>
              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                Tổng {outboundOrders.length} đơn xuất trong wave
              </span>
            </div>

            {/* 4-Step Visual Process Pipeline */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
              
              {/* Step 1: Chờ Lấy Hàng */}
              <div style={{
                backgroundColor: '#fffbeb',
                backgroundImage: 'linear-gradient(180deg, #fffbeb 0%, #fef3c7 100%)',
                border: '1.5px solid #fde68a',
                borderRadius: '8px',
                padding: '12px 10px',
                textAlign: 'center',
                boxShadow: '0 1px 3px rgba(217, 119, 6, 0.06)',
              }}>
                <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.03em' }}>1. Chờ Lấy Hàng</span>
                <div style={{ fontSize: '20px', fontWeight: 700, color: '#b45309', marginTop: '4px', fontVariantNumeric: 'tabular-nums' }}>
                  {pendingOrders.length}
                </div>
                <span style={{ fontSize: '11px', color: '#b45309', fontWeight: 600 }}>
                  {outboundOrders.length ? Math.round((pendingOrders.length / outboundOrders.length) * 100) : 0}% wave
                </span>
              </div>

              {/* Step 2: Đang Lấy */}
              <div style={{
                backgroundColor: '#f0f9ff',
                backgroundImage: 'linear-gradient(180deg, #f0f9ff 0%, #e0f2fe 100%)',
                border: '1.5px solid #7dd3fc',
                borderRadius: '8px',
                padding: '12px 10px',
                textAlign: 'center',
                boxShadow: '0 2px 6px rgba(2, 132, 199, 0.1)',
              }}>
                <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#0369a1', textTransform: 'uppercase', letterSpacing: '0.03em' }}>2. Đang Soạn</span>
                <div style={{ fontSize: '20px', fontWeight: 700, color: '#0284c7', marginTop: '4px', fontVariantNumeric: 'tabular-nums' }}>
                  {pickingOrders.length}
                </div>
                <span style={{ fontSize: '11px', color: '#0284c7', fontWeight: 600 }}>
                  {outboundOrders.length ? Math.round((pickingOrders.length / outboundOrders.length) * 100) : 0}% wave
                </span>
              </div>

              {/* Step 3: Đã Đóng Gói */}
              <div style={{
                backgroundColor: '#faf5ff',
                backgroundImage: 'linear-gradient(180deg, #faf5ff 0%, #f3e8ff 100%)',
                border: '1.5px solid #d8b4fe',
                borderRadius: '8px',
                padding: '12px 10px',
                textAlign: 'center',
                boxShadow: '0 1px 3px rgba(124, 58, 237, 0.08)',
              }}>
                <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#6b21a8', textTransform: 'uppercase', letterSpacing: '0.03em' }}>3. Đã Đóng Gói</span>
                <div style={{ fontSize: '20px', fontWeight: 700, color: '#7c3aed', marginTop: '4px', fontVariantNumeric: 'tabular-nums' }}>
                  {packingOrders.length}
                </div>
                <span style={{ fontSize: '11px', color: '#7c3aed', fontWeight: 600 }}>
                  Chờ bàn giao
                </span>
              </div>

              {/* Step 4: Đang Giao Vận */}
              <div style={{
                backgroundColor: '#ecfdf5',
                backgroundImage: 'linear-gradient(180deg, #ecfdf5 0%, #d1fae5 100%)',
                border: '1.5px solid #6ee7b7',
                borderRadius: '8px',
                padding: '12px 10px',
                textAlign: 'center',
                boxShadow: '0 1px 3px rgba(16, 185, 129, 0.08)',
              }}>
                <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#065f46', textTransform: 'uppercase', letterSpacing: '0.03em' }}>4. Đang Giao</span>
                <div style={{ fontSize: '20px', fontWeight: 700, color: '#059669', marginTop: '4px', fontVariantNumeric: 'tabular-nums' }}>
                  {shippedOrders.length}
                </div>
                <span style={{ fontSize: '11px', color: '#059669', fontWeight: 600 }}>
                  Trên đường đi
                </span>
              </div>

            </div>
          </div>

          {/* Card B: Integrated IoT Cold Chain Command */}
          <div style={{ backgroundColor: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '16px 18px', boxShadow: '0 2px 6px rgba(15, 23, 42, 0.04)' }}>
            
            {/* Header with Room Tabs and Alert Test */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: '#f0fdfa', color: '#0f766e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Thermometer size={16} />
                </div>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                  Giám Sát Chuỗi Lạnh & Cảm Biến IoT
                </span>
              </div>

              {/* Subtle Test Simulation Button */}
              {!isSimulatedOverheat ? (
                <button
                  onClick={handleSimulateOverheat}
                  style={{
                    backgroundColor: '#ffffff',
                    color: '#64748b',
                    border: '1.5px solid #cbd5e1',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    cursor: 'pointer',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                  }}
                  title="Kiểm tra phản hồi của còi báo và ngưỡng nhiệt"
                >
                  <Sliders size={13} color="#475569" />
                  <span>Thử còi báo</span>
                </button>
              ) : (
                <button
                  onClick={handleRestoreSafeTemp}
                  style={{
                    backgroundColor: '#f0fdf4',
                    color: '#166534',
                    border: '1.5px solid #86efac',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    cursor: 'pointer',
                  }}
                >
                  <CheckCircle2 size={13} />
                  <span>Khôi phục (2.6°C)</span>
                </button>
              )}
            </div>

            {/* Room Tabs with Distinct Vibrant Colors */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px', flexWrap: 'wrap' }}>
              {[
                { key: 'COOL', label: 'Kho Mát (0°C ~ 4°C)', value: `${coolTemp.toFixed(1)}°C`, icon: Snowflake, activeBg: '#0f766e', activeBadgeBg: '#ccfbf1', activeBadgeText: '#0f766e' },
                { key: 'FROZEN', label: 'Kho Đông (-18°C)', value: '-19.4°C', icon: Snowflake, activeBg: '#0284c7', activeBadgeBg: '#e0f2fe', activeBadgeText: '#0369a1' },
                { key: 'DRY', label: 'Kho Khô (20°C ~ 25°C)', value: '24.2°C', icon: Wind, activeBg: '#d97706', activeBadgeBg: '#fef3c7', activeBadgeText: '#92400e' },
              ].map(tab => {
                const isSelected = activeColdRoom === tab.key;
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveColdRoom(tab.key as any)}
                    style={{
                      padding: '7px 14px',
                      borderRadius: '7px',
                      border: isSelected ? `1.5px solid ${tab.activeBg}` : '1.5px solid #e2e8f0',
                      backgroundColor: isSelected ? tab.activeBg : '#f8fafc',
                      color: isSelected ? '#ffffff' : '#475569',
                      fontSize: '12px',
                      fontWeight: isSelected ? 700 : 500,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '7px',
                      transition: 'all 0.15s ease',
                      boxShadow: isSelected ? '0 2px 6px rgba(0,0,0,0.12)' : 'none',
                    }}
                  >
                    <Icon size={14} />
                    <span>{tab.label}</span>
                    <span style={{
                      fontSize: '11px',
                      padding: '2px 7px',
                      borderRadius: '5px',
                      backgroundColor: isSelected ? tab.activeBadgeBg : '#e2e8f0',
                      color: isSelected ? tab.activeBadgeText : '#334155',
                      fontVariantNumeric: 'tabular-nums',
                      fontWeight: 700,
                    }}>
                      {tab.value}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Sub-grid: Sensor Telemetry Left + 24h AreaChart Right */}
            <div style={{ display: 'grid', gridTemplateColumns: '175px 1fr', gap: '14px', alignItems: 'stretch' }}>
              
              {/* Left Sub-panel: Live Readings & Shelf Triggers */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ backgroundColor: activeRoomData.statusBg, border: `1.5px solid ${activeRoomData.statusBorder}`, borderRadius: '8px', padding: '12px 10px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Nhiệt độ hiện tại:</div>
                  <div style={{ fontSize: '22px', fontWeight: 700, color: activeRoomData.statusColor, marginTop: '2px', fontVariantNumeric: 'tabular-nums' }}>
                    {activeRoomData.temp > 0 ? `+${activeRoomData.temp.toFixed(1)}°C` : `${activeRoomData.temp.toFixed(1)}°C`}
                  </div>
                  <div style={{ fontSize: '10.5px', color: '#64748b', marginTop: '3px', fontWeight: 500 }}>
                    Chuẩn: <b>{activeRoomData.tempStandard}</b>
                  </div>
                </div>

                <div style={{ backgroundColor: '#f0f9ff', border: '1.5px solid #bae6fd', borderRadius: '8px', padding: '12px 10px', boxShadow: '0 1px 3px rgba(2, 132, 199, 0.05)' }}>
                  <div style={{ fontSize: '11px', color: '#0369a1', fontWeight: 600 }}>Độ ẩm không khí:</div>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: '#0284c7', marginTop: '2px', fontVariantNumeric: 'tabular-nums' }}>
                    {activeRoomData.hum.toFixed(1)}%
                  </div>
                  <div style={{ fontSize: '10.5px', color: '#0369a1', marginTop: '3px', fontWeight: 500 }}>
                    Chuẩn: <b>{activeRoomData.humStandard}</b>
                  </div>
                </div>

                {/* Shelf Pick-to-Light Quick Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginTop: '2px' }}>
                  <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                    Hỗ trợ tìm kệ:
                  </div>
                  {activeRoomData.shelves.slice(0, 2).map(shelf => {
                    const isLocating = activeLocatingShelf === shelf.code;
                    const isChirping = chirpingShelf === shelf.code;
                    return (
                      <div key={shelf.code} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f8fafc', padding: '6px 8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#0f172a' }}>{shelf.code}</span>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button
                            onClick={() => handleLocateShelf(shelf.code, shelf.name)}
                            style={{
                              backgroundColor: isLocating ? '#0284c7' : '#ffffff',
                              color: isLocating ? '#ffffff' : '#0284c7',
                              border: '1px solid #cbd5e1',
                              padding: '3px 6px',
                              borderRadius: '4px',
                              fontSize: '10.5px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                            }}
                            title="Bật đèn nhấp nháy kệ hàng"
                          >
                            <Radio size={11} />
                          </button>
                          <button
                            onClick={() => handleChirpShelf(shelf.code)}
                            style={{
                              backgroundColor: isChirping ? '#fffbeb' : '#ffffff',
                              color: isChirping ? '#92400e' : '#64748b',
                              border: '1px solid #cbd5e1',
                              padding: '3px 6px',
                              borderRadius: '4px',
                              fontSize: '10.5px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                            }}
                            title="Phát tiếng chuông định vị kệ"
                          >
                            <Volume2 size={11} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Sub-panel: 24h Telemetry Wave Chart with SVG Linear Gradient */}
              <div style={{ backgroundColor: '#ffffff', border: '1.5px solid #e2e8f0', borderRadius: '8px', padding: '12px 14px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>
                    Biểu Đồ Nhiệt Độ 24H ({activeRoomData.name})
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '10.5px', color: '#475569', fontWeight: 600 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ width: '8px', height: '3px', backgroundColor: '#ef4444', borderRadius: '1px' }} /> Trần: {activeRoomData.safeMax}°C
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ width: '8px', height: '3px', backgroundColor: '#0284c7', borderRadius: '1px' }} /> Sàn: {activeRoomData.safeMin}°C
                    </span>
                  </div>
                </div>

                <div style={{ width: '100%', height: '185px', flex: 1 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={activeRoomData.telemetry} margin={{ top: 8, right: 10, left: -25, bottom: 0 }}>
                      <defs>
                        <linearGradient id="coolGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0f766e" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#0f766e" stopOpacity={0.02} />
                        </linearGradient>
                        <linearGradient id="frozenGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0284c7" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#0284c7" stopOpacity={0.02} />
                        </linearGradient>
                        <linearGradient id="dryGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#d97706" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#d97706" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="time" stroke="#94a3b8" fontSize={10} tickLine={false} />
                      <YAxis domain={activeRoomData.yDomain as any} stroke="#94a3b8" fontSize={10} tickLine={false} unit="°" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#ffffff',
                          border: '1.5px solid #cbd5e1',
                          borderRadius: '8px',
                          boxShadow: '0 4px 12px rgba(15, 23, 42, 0.08)',
                          fontSize: '11.5px',
                          fontWeight: 600,
                        }}
                        formatter={(val: any) => [`${Number(val).toFixed(1)}°C`, 'Nhiệt độ']}
                      />
                      <ReferenceLine y={activeRoomData.safeMax} stroke="#ef4444" strokeDasharray="3 3" />
                      <ReferenceLine y={activeRoomData.safeMin} stroke="#0284c7" strokeDasharray="3 3" />
                      <Area
                        type="monotone"
                        dataKey="temp"
                        stroke={activeRoomData.strokeColor}
                        strokeWidth={2.5}
                        fill={`url(#${activeRoomData.fillGradId})`}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* ── RIGHT COLUMN: FEFO RISK RADAR & FLEET STATUS ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Card C: Radar Hàng Cận Hạn FEFO */}
          <div style={{ backgroundColor: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '16px 18px', boxShadow: '0 2px 6px rgba(15, 23, 42, 0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: '#fffbeb', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CalendarCheck size={16} />
                </div>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                  Hàng Cận Hạn Cần Bán Trước (FEFO)
                </span>
              </div>
              <Link
                to="/inventory"
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#d97706',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                  textDecoration: 'none',
                }}
              >
                <span>Kho hàng</span>
                <ChevronRight size={13} />
              </Link>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {urgentFefo.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#166534', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', fontSize: '12px', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 600 }}>
                  <CheckCircle2 size={16} color="#16a34a" />
                  <span>Toàn bộ hàng tồn kho đều đạt chuẩn an toàn hạn sử dụng.</span>
                </div>
              ) : (
                urgentFefo.slice(0, 4).map((item, i) => {
                  const isCritical = item.fefoScore >= 75 || item.daysLeft <= 3;
                  const rankColors = [
                    { bg: '#dc2626', color: '#ffffff' }, // #1
                    { bg: '#ea580c', color: '#ffffff' }, // #2
                    { bg: '#d97706', color: '#ffffff' }, // #3
                    { bg: '#475569', color: '#ffffff' }, // #4
                  ];
                  const rankStyle = rankColors[i] || rankColors[3];

                  return (
                    <div
                      key={item.id || i}
                      style={{
                        borderRadius: '8px',
                        border: `1.5px solid ${isCritical ? '#fca5a5' : '#fde68a'}`,
                        backgroundColor: isCritical ? '#fff1f2' : '#fffbeb',
                        padding: '10px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '10px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '5px',
                            backgroundColor: rankStyle.bg,
                            color: rankStyle.color,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '11px',
                            flexShrink: 0,
                          }}
                        >
                          #{i + 1}
                        </div>

                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#0f172a' }}>
                              {item.lotCode}
                            </span>
                            <span
                              style={{
                                fontSize: '10px',
                                fontWeight: 700,
                                padding: '1px 6px',
                                borderRadius: '4px',
                                backgroundColor: item.zone === 'COLD' ? '#dcfce7' : item.zone === 'FROZEN' ? '#e0f2fe' : '#fef3c7',
                                color: item.zone === 'COLD' ? '#166534' : item.zone === 'FROZEN' ? '#0369a1' : '#92400e',
                                border: `1px solid ${item.zone === 'COLD' ? '#86efac' : item.zone === 'FROZEN' ? '#7dd3fc' : '#fde68a'}`,
                              }}
                            >
                              {item.zone === 'COLD' ? 'Kho Mát' : item.zone === 'FROZEN' ? 'Kho Đông' : 'Kho Khô'}
                            </span>
                          </div>
                          <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px', fontVariantNumeric: 'tabular-nums' }}>
                            Kệ: <b style={{ color: '#0f172a' }}>{item.location}</b> • Tồn: <b style={{ color: '#0f172a' }}>{item.remainingQty} {item.unit || 'Kg'}</b>
                          </div>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div
                          style={{
                            fontSize: '11.5px',
                            fontWeight: 700,
                            color: isCritical ? '#991b1b' : '#92400e',
                            backgroundColor: isCritical ? '#fee2e2' : '#fef3c7',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            border: `1px solid ${isCritical ? '#fca5a5' : '#fde68a'}`,
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          Còn {item.daysLeft} ngày
                        </div>
                        <div style={{ fontSize: '10.5px', color: '#64748b', marginTop: '3px', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                          Ưu tiên: <b style={{ color: isCritical ? '#991b1b' : '#92400e' }}>{item.fefoScore}đ</b>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Card D: Trạm Giám Sát Đội Xe & Giao Vận */}
          <div style={{ backgroundColor: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '16px 18px', boxShadow: '0 2px 6px rgba(15, 23, 42, 0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: '#f0f9ff', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Truck size={16} />
                </div>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                  Đội Xe Giao Hàng Thời Gian Thực
                </span>
              </div>
              <Link
                to="/transport"
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#0284c7',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                  textDecoration: 'none',
                }}
              >
                <span>Bản đồ</span>
                <ChevronRight size={13} />
              </Link>
            </div>

            {/* Fleet Mini Metrics with Vibrant Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', textAlign: 'center' }}>
              <div style={{ backgroundColor: '#f0f9ff', border: '1.5px solid #7dd3fc', borderRadius: '8px', padding: '10px 4px', boxShadow: '0 1px 3px rgba(2, 132, 199, 0.08)' }}>
                <div style={{ fontSize: '10px', color: '#0369a1', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Đang Giao</div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#0284c7', marginTop: '2px', fontVariantNumeric: 'tabular-nums' }}>8 xe</div>
              </div>

              <div style={{ backgroundColor: '#ecfdf5', border: '1.5px solid #6ee7b7', borderRadius: '8px', padding: '10px 4px', boxShadow: '0 1px 3px rgba(16, 185, 129, 0.08)' }}>
                <div style={{ fontSize: '10px', color: '#065f46', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Thùng Lạnh</div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#059669', marginTop: '2px', fontVariantNumeric: 'tabular-nums' }}>3.2°C</div>
              </div>

              <div style={{ backgroundColor: '#faf5ff', border: '1.5px solid #d8b4fe', borderRadius: '8px', padding: '10px 4px', boxShadow: '0 1px 3px rgba(124, 58, 237, 0.08)' }}>
                <div style={{ fontSize: '10px', color: '#6b21a8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Đúng Hẹn</div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#7c3aed', marginTop: '2px', fontVariantNumeric: 'tabular-nums' }}>98.6%</div>
              </div>
            </div>

            <div style={{ marginTop: '12px', fontSize: '11.5px', color: '#166534', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 500 }}>
              <ShieldCheck size={15} color="#16a34a" />
              <span>Đội xe đang vận hành ổn định, nhiệt độ thùng lạnh đạt chuẩn.</span>
            </div>
          </div>

        </div>

      </div>

      {/* 5. BOTTOM SECTION: RECENT OUTBOUND DISPATCH ORDERS */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '16px 20px', boxShadow: '0 2px 6px rgba(15, 23, 42, 0.04)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '14.5px', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '7px' }}>
              <div style={{ width: '26px', height: '26px', borderRadius: '6px', backgroundColor: '#f0f9ff', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Compass size={15} />
              </div>
              <span>Đơn Hàng Xuất Kho Cần Xử Lý Trong Ngày</span>
            </h2>
          </div>
          <Link
            to="/orders"
            style={{
              fontSize: '12px',
              fontWeight: 700,
              color: '#0284c7',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              textDecoration: 'none',
            }}
          >
            <span>Xem tất cả ({outboundOrders.length})</span>
            <ChevronRight size={14} />
          </Link>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {outboundOrders.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '12.5px', padding: '24px 0' }}>
              Hiện không có đơn hàng nào đang chờ xử lý.
            </div>
          ) : (
            outboundOrders.slice(0, 5).map(ord => {
              const status = (ord.status || 'PENDING').toUpperCase();
              const isPicking = status === 'PICKING';
              const isPacked = status === 'PACKED' || status === 'CONFIRMED';
              const isPicked = status === 'PICKED' || status === 'PACKING';
              const isShipped = status === 'SHIPPED' || status === 'DELIVERING' || status === 'IN_TRANSIT';

              return (
                <div
                  key={ord.id}
                  style={{
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    padding: '10px 14px',
                    backgroundColor: isPicking ? '#f0fdf4' : '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = isPicking ? '#e6fced' : '#f8fafc'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = isPicking ? '#f0fdf4' : '#ffffff'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '6px',
                        backgroundColor: isShipped ? '#dcfce7' : isPacked ? '#e0f2fe' : isPicked ? '#f3e8ff' : isPicking ? '#dcfce7' : '#fef3c7',
                        color: isShipped ? '#059669' : isPacked ? '#0284c7' : isPicked ? '#7c3aed' : isPicking ? '#15803d' : '#b45309',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '10.5px',
                        border: `1px solid ${isShipped ? '#86efac' : isPacked ? '#7dd3fc' : isPicked ? '#d8b4fe' : isPicking ? '#86efac' : '#fde68a'}`,
                        flexShrink: 0,
                      }}
                    >
                      {isShipped ? 'XE' : isPacked ? 'XONG' : isPicked ? 'GÓI' : isPicking ? 'LẤY' : 'CHỜ'}
                    </div>

                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                        {ord.orderCode}
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#475569', fontVariantNumeric: 'tabular-nums', marginTop: '1px' }}>
                        {ord.destination || ord.customerName || 'Giao tận nơi TP.HCM'} • <b style={{ color: '#0f172a' }}>{ord.totalItems || ord.items?.length || 1}</b> mặt hàng (<b style={{ color: '#0f172a' }}>{ord.totalQuantity || 1}</b> sản phẩm)
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '3px 9px',
                        borderRadius: '5px',
                        backgroundColor: isShipped ? '#ecfdf5' : isPacked ? '#eff6ff' : isPicked ? '#faf5ff' : isPicking ? '#f0fdf4' : '#fffbeb',
                        color: isShipped ? '#059669' : isPacked ? '#1d4ed8' : isPicked ? '#7c3aed' : isPicking ? '#15803d' : '#b45309',
                        border: `1.5px solid ${isShipped ? '#6ee7b7' : isPacked ? '#93c5fd' : isPicked ? '#d8b4fe' : isPicking ? '#86efac' : '#fde68a'}`,
                      }}
                    >
                      {isShipped ? 'ĐANG GIAO' : isPacked ? 'ĐÃ ĐÓNG GÓI' : isPicked ? 'CHỜ ĐÓNG GÓI' : isPicking ? 'ĐANG LẤY HÀNG' : 'CHỜ SOẠN'}
                    </span>

                    <button
                      onClick={() => navigate(`/orders?orderId=${ord.id}`)}
                      style={{
                        backgroundColor: '#ffffff',
                        border: '1.5px solid #cbd5e1',
                        padding: '4px 10px',
                        borderRadius: '5px',
                        fontSize: '11.5px',
                        fontWeight: 600,
                        color: '#334155',
                        cursor: 'pointer',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                      }}
                    >
                      Chi tiết
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

    </div>
  );
};

// Styling Helpers
const kpiCardStyle = (accentColor: string, bgGradient?: string): React.CSSProperties => ({
  backgroundColor: '#ffffff',
  backgroundImage: bgGradient || 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
  borderRadius: '10px',
  padding: '14px 16px',
  border: '1px solid #e2e8f0',
  borderTop: `3px solid ${accentColor}`,
  boxShadow: '0 2px 6px rgba(15, 23, 42, 0.04)',
  display: 'flex',
  flexDirection: 'column',
});

const kpiIconStyle = (bgColor: string, color: string, shadowColor?: string): React.CSSProperties => ({
  width: '34px',
  height: '34px',
  borderRadius: '8px',
  backgroundColor: bgColor,
  color,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  boxShadow: shadowColor ? `0 2px 6px ${shadowColor}` : 'none',
});

export default Dashboard;
