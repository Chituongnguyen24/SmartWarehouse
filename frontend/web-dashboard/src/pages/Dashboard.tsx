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
  Sparkles,
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
import { useAuth } from '../contexts/AuthContext';
import { useWarehouse } from '../contexts/WarehouseContext';

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

  // Audio Context Ref for Continuous Warning Siren
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sirenOscRef = useRef<OscillatorNode | null>(null);
  const sirenGainRef = useRef<GainNode | null>(null);
  const sirenTimerRef = useRef<any>(null);

  // 24-Hour Temperature Telemetry Dataset
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

  // Audio Siren Player (Hú còi cảnh báo quá nhiệt liên tục chuẩn công nghiệp)
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
      const pRes = await fetch('http://localhost:3010/products', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (pRes.ok) {
        const pData = await pRes.json();
        const count = pData.total !== undefined ? Number(pData.total) : (Array.isArray(pData) ? pData.length : (Array.isArray(pData.items) ? pData.items.length : 0));
        setTotalProducts(count);
      }

      // 2. Fetch Inventory Lots
      const lRes = await fetch(`http://localhost:3011/inventory/lots?warehouseCode=${whCode}&limit=1000`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      let lots = [];
      if (lRes.ok) {
        lots = await lRes.json();
        setTotalLots(Array.isArray(lots) ? lots.length : 0);
      }

      // 3. Compute FEFO & AI Early Warning
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
      const obRes = await fetch(`http://localhost:3007/outbound-orders?warehouseCode=${whCode}&limit=30`);
      if (obRes.ok) {
        const obData = await obRes.json();
        setOutboundOrders(Array.isArray(obData) ? obData : []);
      }

      // 5. Fetch Inbound Orders
      const inRes = await fetch(`http://localhost:3006/inbound-orders?warehouseCode=${whCode}&limit=30`);
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
    const socket: Socket = io('http://localhost:3004', {
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
    socket.on('inbound_order_created', () => fetchDashboardData());

    return () => {
      socket.disconnect();
    };
  }, [fetchDashboardData]);

  // Pick-to-Light Shelf Hardware Interaction APIs
  const handleLocateShelf = async (shelfCode: string, productName: string) => {
    try {
      if (activeLocatingShelf === shelfCode) {
        setActiveLocatingShelf(null);
        await fetch('http://localhost:3007/outbound-orders/iot/complete-shelf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            warehouseCode: effectiveWhCode || 'WH-006',
            shelfCode,
          }),
        });
      } else {
        setActiveLocatingShelf(shelfCode);
        await fetch('http://localhost:3007/outbound-orders/iot/locate-shelf', {
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
  const pickingOrders = useMemo(() => {
    return outboundOrders.filter(o => o.status === 'PENDING' || o.status === 'PICKING');
  }, [outboundOrders]);

  const packingOrders = useMemo(() => {
    return outboundOrders.filter(o => o.status === 'PICKED' || o.status === 'PACKING');
  }, [outboundOrders]);

  const shippedOrders = useMemo(() => {
    return outboundOrders.filter(o => ['PACKED', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'COMPLETED'].includes(o.status));
  }, [outboundOrders]);

  const totalPickingUnits = pickingOrders.reduce((sum, o) => sum + (o.totalQuantity || o.items?.length || 1), 0);
  const pickedUnits = pickingOrders.reduce((sum, o) => {
    if (!Array.isArray(o.items)) return sum;
    return sum + o.items.reduce((s: number, i: any) => s + (Number(i.pickedQuantity) || 0), 0);
  }, 0);
  const wavePickingPercent = totalPickingUnits > 0 ? Math.round((pickedUnits / totalPickingUnits) * 100) : 100;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '40px' }}>
      
      {/* 🚨 CRITICAL OVERHEAT WARNING BANNER */}
      {isOverheatBreached && (
        <div
          style={{
            backgroundColor: '#ef4444',
            color: '#ffffff',
            borderRadius: '16px',
            padding: '14px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 8px 30px rgba(239, 68, 68, 0.4)',
            animation: 'pulse 1.2s infinite',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                backgroundColor: 'rgba(255, 255, 255, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <BellRing size={24} color="#ffffff" />
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 900, letterSpacing: '-0.01em' }}>
                🚨 BÁO ĐỘNG KHẨN CẤP: PHÒNG KHO LẠNH VƯỢT NGƯỠNG AN TOÀN ({coolTemp}°C / Ngưỡng max 4.0°C)!
              </div>
              <div style={{ fontSize: '12.5px', color: '#fee2e2', marginTop: '2px' }}>
                Hệ thống còi & đèn cảnh báo kho mát đang phát tín hiệu cảnh báo. Nhiệt độ vượt ngưỡng an toàn, nguy cơ ảnh hưởng trực tiếp tới chất lượng hàng hóa!
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={() => setIsSirenMuted(!isSirenMuted)}
              style={{
                backgroundColor: isSirenMuted ? '#ffffff' : 'rgba(0, 0, 0, 0.2)',
                color: isSirenMuted ? '#ef4444' : '#ffffff',
                border: '1px solid rgba(255,255,255,0.4)',
                padding: '8px 14px',
                borderRadius: '10px',
                fontWeight: 800,
                fontSize: '12.5px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
              }}
            >
              {isSirenMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
              <span>{isSirenMuted ? 'Đã tắt tiếng' : 'Tắt còi báo'}</span>
            </button>
            <button
              onClick={handleRestoreSafeTemp}
              style={{
                backgroundColor: '#ffffff',
                color: '#15803d',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '10px',
                fontWeight: 900,
                fontSize: '12.5px',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
              }}
            >
              ✅ Khôi Phục Nhiệt Độ (2.5°C)
            </button>
          </div>
        </div>
      )}

      {/* 🏢 COMMAND CENTER EXECUTIVE HEADER */}
      <div
        style={{
          background: 'linear-gradient(135deg, #042f2e 0%, #0f766e 60%, #115e59 100%)',
          borderRadius: '20px',
          padding: '24px 28px',
          color: '#ffffff',
          boxShadow: '0 10px 30px rgba(15, 118, 110, 0.2)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                backdropFilter: 'blur(8px)',
                padding: '4px 10px',
                borderRadius: '8px',
                fontSize: '11px',
                fontWeight: 800,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Radio size={12} color="#4ade80" />
              SFWMS COMMAND CENTER • CITYMART
            </span>
            <span
              style={{
                backgroundColor: isWsConnected ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                border: `1px solid ${isWsConnected ? '#22c55e' : '#ef4444'}`,
                color: isWsConnected ? '#86efac' : '#fca5a5',
                padding: '3px 8px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 700,
              }}
            >
              {isWsConnected ? '● Đồng bộ thời gian thực' : '○ Ngoại tuyến'}
            </span>
          </div>

          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 900, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>Trung Tâm Điều Hành Kho Hàng</span>
            <span style={{ fontSize: '15px', fontWeight: 600, color: '#99f6e4' }}>
              ({selectedWarehouse?.name || `Kho Hàng ${effectiveWhCode}`})
            </span>
          </h1>
          <p style={{ margin: 0, fontSize: '13px', color: '#ccfbf1', opacity: 0.9 }}>
            Giám sát điều kiện kho hàng, điều phối nhặt hàng xuất kho và kiểm soát hạn sử dụng sản phẩm theo thời gian thực.
          </p>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Warehouse Selector (Admin) vs Fixed Warehouse Indicator (Warehouse Accounts) */}
          {isAdmin ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: '12px', padding: '5px 12px', border: '1px solid rgba(255,255,255,0.22)' }}>
              <Building2 size={16} color="#99f6e4" />
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#99f6e4', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Kho:</span>
              <select
                value={selectedWarehouseCode}
                onChange={(e) => setSelectedWarehouseCode(e.target.value)}
                style={{
                  backgroundColor: 'transparent',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 800,
                  fontSize: '13px',
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
              <span style={{ fontSize: '10px', backgroundColor: '#10b981', color: '#ffffff', padding: '2px 7px', borderRadius: '6px', fontWeight: 800 }}>
                Admin
              </span>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: '12px', padding: '6px 14px', border: '1px solid rgba(255,255,255,0.18)' }}>
              <Building2 size={16} color="#99f6e4" />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '13px', fontWeight: 800, color: '#ffffff' }}>
                  {selectedWarehouse?.name || `Kho ${effectiveWhCode}`} ({effectiveWhCode})
                </span>
                <span style={{ fontSize: '10px', color: '#99f6e4', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Lock size={10} color="#99f6e4" />
                  <span>Cố định theo tài khoản kho</span>
                </span>
              </div>
            </div>
          )}

          {/* Simulate Overheat Button */}
          {!isSimulatedOverheat ? (
            <button
              onClick={handleSimulateOverheat}
              style={{
                backgroundColor: '#dc2626',
                color: '#ffffff',
                border: 'none',
                padding: '9px 15px',
                borderRadius: '12px',
                fontWeight: 800,
                fontSize: '12.5px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)',
              }}
              title="Kích hoạt kịch bản thử nghiệm cảnh báo khi nhiệt độ kho vượt ngưỡng an toàn"
            >
              <AlertTriangle size={15} />
              <span>Kiểm Tra Cảnh Báo Nhiệt Độ</span>
            </button>
          ) : (
            <button
              onClick={handleRestoreSafeTemp}
              style={{
                backgroundColor: '#16a34a',
                color: '#ffffff',
                border: 'none',
                padding: '9px 15px',
                borderRadius: '12px',
                fontWeight: 800,
                fontSize: '12.5px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
              }}
            >
              <CheckCircle2 size={15} />
              <span>Khôi Phục An Toàn</span>
            </button>
          )}

          {/* Refresh Data */}
          <button
            onClick={() => fetchDashboardData()}
            disabled={isRefreshing}
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              color: '#ffffff',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              padding: '9px 14px',
              borderRadius: '12px',
              fontWeight: 700,
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={15} className={isRefreshing ? 'spin' : ''} />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* 📊 4 EXECUTIVE OPERATIONAL KPI CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
        
        {/* KPI 1: Live Wave Picking */}
        <div style={kpiCardStyle('#0284c7', 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)')}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#0369a1', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Đang Gom Hàng (Picking Wave)
            </span>
            <div style={kpiIconStyle('#bae6fd', '#0284c7')}><Compass size={18} /></div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '10px' }}>
            <span style={{ fontSize: '30px', fontWeight: 900, color: '#0f172a' }}>{pickingOrders.length}</span>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#0284c7' }}>đơn hàng chờ lấy</span>
          </div>
          <div style={{ marginTop: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>
              <span>Tiến độ đợt sóng: {pickedUnits}/{totalPickingUnits} món</span>
              <span>{wavePickingPercent}%</span>
            </div>
            <div style={{ width: '100%', height: '6px', backgroundColor: '#cbd5e1', borderRadius: '999px', overflow: 'hidden' }}>
              <div style={{ width: `${wavePickingPercent}%`, height: '100%', background: 'linear-gradient(90deg, #0284c7, #38bdf8)', borderRadius: '999px', transition: 'width 0.4s ease' }} />
            </div>
          </div>
        </div>

        {/* KPI 2: Packing Station Queue */}
        <div style={kpiCardStyle('#9333ea', 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)')}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#7e22ce', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Bàn Đóng Gói & Xuất Kho
            </span>
            <div style={kpiIconStyle('#e9d5ff', '#9333ea')}><Boxes size={18} /></div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '10px' }}>
            <span style={{ fontSize: '30px', fontWeight: 900, color: '#0f172a' }}>{packingOrders.length}</span>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#9333ea' }}>đơn chờ dán tem</span>
          </div>
          <div style={{ fontSize: '12px', color: '#6b21a8', marginTop: '12px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}>
            <Truck size={14} />
            <span>Đã giao vận chuyển: {shippedOrders.length} đơn</span>
          </div>
        </div>

        {/* KPI 3: Cold Storage Temp Status */}
        <div style={kpiCardStyle(isOverheatBreached ? '#ef4444' : '#059669', isOverheatBreached ? 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)' : 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)')}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: isOverheatBreached ? '#b91c1c' : '#047857', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Kiểm Soát Nhiệt Độ Kho Mát
            </span>
            <div style={kpiIconStyle(isOverheatBreached ? '#fecaca' : '#a7f3d0', isOverheatBreached ? '#dc2626' : '#059669')}>
              <Thermometer size={18} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '10px' }}>
            <span style={{ fontSize: '30px', fontWeight: 900, color: isOverheatBreached ? '#dc2626' : '#0f172a' }}>
              {coolTemp.toFixed(1)}°C
            </span>
            <span style={{ fontSize: '13px', fontWeight: 800, color: isOverheatBreached ? '#b91c1c' : '#059669' }}>
              {isOverheatBreached ? '⚠️ CẢNH BÁO NHIỆT' : '🟢 ĐẠT CHUẨN BẢO QUẢN'}
            </span>
          </div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '12px', display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
            <span>Độ ẩm: <b>{coolHum.toFixed(1)}%</b></span>
            <span>Hệ thống chuông: <b>{isOverheatBreached ? (isSirenMuted ? 'Đã tắt tiếng' : 'ĐANG CẢNH BÁO') : 'Ổn định'}</b></span>
          </div>
        </div>

        {/* KPI 4: FEFO Risk Alerts */}
        <div style={kpiCardStyle(alertCount > 0 ? '#d97706' : '#0f766e', alertCount > 0 ? 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)' : 'linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%)')}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: alertCount > 0 ? '#b45309' : '#0f766e', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Lô Cận Hạn Sử Dụng Cần Xuất Gấp
            </span>
            <div style={kpiIconStyle(alertCount > 0 ? '#fde68a' : '#99f6e4', alertCount > 0 ? '#d97706' : '#0f766e')}><ShieldAlert size={18} /></div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '10px' }}>
            <span style={{ fontSize: '30px', fontWeight: 900, color: alertCount > 0 ? '#b45309' : '#0f172a' }}>{alertCount}</span>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#64748b' }}>lô cần ưu tiên xuất</span>
          </div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '12px', display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
            <span>Tổng tồn: <b>{totalLots} lô</b></span>
            <span>Danh mục: <b>{totalProducts} mặt hàng</b></span>
          </div>
        </div>

      </div>

      {/* 🏢 TRUNG TÂM GIÁM SÁT 3 PHÒNG KHO ĐỘC LẬP & IOT HARDWARE */}
      <div style={{ background: '#ffffff', borderRadius: '18px', border: '1px solid #e2e8f0', padding: '22px 24px', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🧊 Giám Sát Điều Kiện Bảo Quản 3 Phân Khu Kho</span>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#059669', backgroundColor: '#ecfdf5', padding: '2px 8px', borderRadius: '6px', border: '1px solid #a7f3d0' }}>
                Định Vị Kệ & Kiểm Soát Nhiệt Độ
              </span>
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: '#64748b' }}>
              Phân vùng lưu trữ bảo quản chuyên biệt: Kho Mát (0°C ~ 4°C), Kho Đông (-18°C ~ -22°C) và Kho Khô tiêu chuẩn.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#059669' }} /> Đạt chuẩn
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#dc2626' }} /> Cảnh báo
            </span>
          </div>
        </div>

        {/* 3 Rooms Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '18px' }}>
          
          {/* ROOM 1: PHÒNG KHO LẠNH (Cool Room 0°C ~ 4°C) */}
          <div
            style={{
              borderRadius: '16px',
              border: `2px solid ${isOverheatBreached ? '#ef4444' : '#059669'}`,
              backgroundColor: isOverheatBreached ? '#fff5f5' : '#f0fdf4',
              padding: '18px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              boxShadow: isOverheatBreached ? '0 0 20px rgba(239, 68, 68, 0.2)' : 'none',
              transition: 'all 0.3s ease',
            }}
          >
            {/* Room Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: isOverheatBreached ? '#fee2e2' : '#dcfce7', color: isOverheatBreached ? '#dc2626' : '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Snowflake size={18} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 900, color: '#0f172a' }}>1. PHÒNG KHO MÁT</h4>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>Thịt tươi sống, sữa thanh trùng, rau củ quả</span>
                </div>
              </div>

              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 900,
                  padding: '3px 8px',
                  borderRadius: '6px',
                  backgroundColor: isOverheatBreached ? '#dc2626' : '#16a34a',
                  color: '#ffffff',
                }}
              >
                {isOverheatBreached ? '🚨 CẢNH BÁO NHIỆT' : '🟢 0°C ~ 4°C ĐẠT CHUẨN'}
              </span>
            </div>

            {/* Live Reading */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', backgroundColor: '#ffffff', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>Nhiệt độ hiện tại:</div>
                <div style={{ fontSize: '24px', fontWeight: 900, color: isOverheatBreached ? '#dc2626' : '#059669' }}>
                  {coolTemp.toFixed(1)}°C
                </div>
                <div style={{ fontSize: '10.5px', color: '#94a3b8' }}>Ngưỡng an toàn: 0.0°C ~ 4.0°C</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>Độ ẩm không khí:</div>
                <div style={{ fontSize: '24px', fontWeight: 900, color: '#0284c7' }}>
                  {coolHum.toFixed(1)}%
                </div>
                <div style={{ fontSize: '10.5px', color: '#94a3b8' }}>Ngưỡng tiêu chuẩn: 70% ~ 85%</div>
              </div>
            </div>

            {/* Master Door Horn Siren Status */}
            <div style={{ backgroundColor: '#ffffff', padding: '10px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Volume2 size={16} color={isOverheatBreached ? '#dc2626' : '#059669'} />
                <div>
                  <div style={{ fontSize: '11.5px', fontWeight: 800, color: '#0f172a' }}>HỆ THỐNG CẢNH BÁO CỬA KHO</div>
                  <div style={{ fontSize: '10.5px', color: '#64748b' }}>Phát chuông báo động tự động khi nhiệt độ vượt ngưỡng an toàn</div>
                </div>
              </div>
              <span style={{ fontSize: '11px', fontWeight: 800, color: isOverheatBreached ? '#dc2626' : '#059669' }}>
                {isOverheatBreached ? 'ĐANG BÁO ĐỘNG' : 'Hoạt động bình thường'}
              </span>
            </div>

            {/* 3 Shelves with Pick-to-Light buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>
                DANH SÁCH KỆ HÀNG TRỌNG ĐIỂM (PHÒNG MÁT):
              </div>

              {[
                { code: 'Ke A1', name: 'Kệ A1: Thịt tươi CP', tempSafe: '0°C ~ 4°C' },
                { code: 'Ke A2', name: 'Kệ A2: Sữa tươi Đà Lạt Milk', tempSafe: '2°C ~ 6°C' },
                { code: 'Ke A3', name: 'Kệ A3: Rau củ VietGAP', tempSafe: '2°C ~ 8°C' },
              ].map(shelf => {
                const isLocating = activeLocatingShelf === shelf.code;
                const isChirping = chirpingShelf === shelf.code;

                return (
                  <div
                    key={shelf.code}
                    style={{
                      backgroundColor: '#ffffff',
                      borderRadius: '10px',
                      border: '1px solid #e2e8f0',
                      padding: '8px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#0f172a' }}>{shelf.name}</div>
                      <div style={{ fontSize: '10.5px', color: '#64748b' }}>
                        Tiêu chuẩn bảo quản: {shelf.tempSafe}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        onClick={() => handleLocateShelf(shelf.code, shelf.name)}
                        style={{
                          backgroundColor: isLocating ? '#0284c7' : '#f0f9ff',
                          color: isLocating ? '#ffffff' : '#0369a1',
                          border: '1px solid #bae6fd',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 800,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          cursor: 'pointer',
                        }}
                      >
                        <Sparkles size={12} />
                        <span>{isLocating ? 'Đang định vị' : 'Bật đèn vị trí'}</span>
                      </button>

                      <button
                        onClick={() => handleChirpShelf(shelf.code)}
                        style={{
                          backgroundColor: isChirping ? '#d97706' : '#fffbeb',
                          color: isChirping ? '#ffffff' : '#b45309',
                          border: '1px solid #fde68a',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 800,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          cursor: 'pointer',
                        }}
                      >
                        <Volume2 size={12} />
                        <span>{isChirping ? 'Đang báo chuông...' : 'Chuông tìm kệ'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ROOM 2: PHÒNG KHO ĐÔNG (-18°C ~ -22°C) */}
          <div
            style={{
              borderRadius: '16px',
              border: '1px solid #bfdbfe',
              backgroundColor: '#f0f9ff',
              padding: '18px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#dbeafe', color: '#1d4ed8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Snowflake size={18} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 900, color: '#0f172a' }}>2. PHÒNG KHO ĐÔNG</h4>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>Thịt bò Úc, Thủy hải sản Na Uy, Kem</span>
                </div>
              </div>

              <span style={{ fontSize: '11px', fontWeight: 900, padding: '3px 8px', borderRadius: '6px', backgroundColor: '#2563eb', color: '#ffffff' }}>
                -18°C ~ -22°C ĐẠT CHUẨN
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', backgroundColor: '#ffffff', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>Nhiệt độ hiện tại:</div>
                <div style={{ fontSize: '24px', fontWeight: 900, color: '#2563eb' }}>-19.4°C</div>
                <div style={{ fontSize: '10.5px', color: '#94a3b8' }}>Ngưỡng: -22°C ~ -18°C</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>Độ ẩm không khí:</div>
                <div style={{ fontSize: '24px', fontWeight: 900, color: '#0284c7' }}>62.0%</div>
                <div style={{ fontSize: '10.5px', color: '#94a3b8' }}>Ngưỡng chuẩn: 60% ~ 75%</div>
              </div>
            </div>

            <div style={{ backgroundColor: '#ffffff', padding: '10px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '12px', color: '#334155', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={16} color="#2563eb" />
              <span>Tiêu chuẩn bảo quản sâu: <b>ISO 22000 & HACCP Cold Chain</b></span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>
                DANH MỤC 8 KỆ HÀNG ĐÔNG LẠNH (B1 ĐẾN B8):
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {['Kệ B1 (Thịt bò Úc)', 'Kệ B2 (Hải sản Na Uy)', 'Kệ B3 (Viên thả lẩu)', 'Kệ B4 (Sườn bò Mỹ)', 'Kệ B5 (Cua tuyết)', 'Kệ B8 (Kem cao cấp)'].map((k, i) => (
                  <span key={i} style={{ fontSize: '11px', fontWeight: 700, backgroundColor: '#ffffff', border: '1px solid #cbd5e1', padding: '3px 8px', borderRadius: '6px', color: '#1e293b' }}>
                    🧊 {k}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* ROOM 3: PHÒNG KHO KHÔ (Dry Storage Room 20°C ~ 25°C) */}
          <div
            style={{
              borderRadius: '16px',
              border: '1px solid #fde68a',
              backgroundColor: '#fffbeb',
              padding: '18px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#fef3c7', color: '#b45309', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Wind size={18} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 900, color: '#0f172a' }}>3. PHÒNG KHO KHÔ</h4>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>Gạo ST25, Mì Hảo Hảo, Dầu ăn Simply, Gia vị</span>
                </div>
              </div>

              <span style={{ fontSize: '11px', fontWeight: 900, padding: '3px 8px', borderRadius: '6px', backgroundColor: '#d97706', color: '#ffffff' }}>
                20°C ~ 25°C BÌNH THƯỜNG
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', backgroundColor: '#ffffff', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>Nhiệt độ hiện tại:</div>
                <div style={{ fontSize: '24px', fontWeight: 900, color: '#d97706' }}>24.2°C</div>
                <div style={{ fontSize: '10.5px', color: '#94a3b8' }}>Nhiệt độ phòng tự nhiên</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>Độ ẩm không khí:</div>
                <div style={{ fontSize: '24px', fontWeight: 900, color: '#0284c7' }}>56.0%</div>
                <div style={{ fontSize: '10.5px', color: '#94a3b8' }}>Ngưỡng thoáng: 50% ~ 65%</div>
              </div>
            </div>

            <div style={{ backgroundColor: '#ffffff', padding: '10px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '12px', color: '#334155', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={16} color="#d97706" />
              <span>Kiểm soát độ ẩm: <b>Thông gió tự nhiên & Chống ẩm mốc</b></span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>
                DANH MỤC 10 KỆ HÀNG KHO KHÔ (C1 ĐẾN C10):
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {['Kệ C1 (Gạo ST25)', 'Kệ C2 (Mì gói)', 'Kệ C3 (Dầu ăn Simply)', 'Kệ C4 (Gia vị Knorr)', 'Kệ C7 (Cà phê G7)', 'Kệ C10 (Gia dụng)'].map((k, i) => (
                  <span key={i} style={{ fontSize: '11px', fontWeight: 700, backgroundColor: '#ffffff', border: '1px solid #cbd5e1', padding: '3px 8px', borderRadius: '6px', color: '#1e293b' }}>
                    🌾 {k}
                  </span>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* 📈 24-HOUR COLD-CHAIN TELEMETRY CHART */}
      <div style={{ background: '#ffffff', borderRadius: '18px', border: '1px solid #e2e8f0', padding: '22px 24px', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 900, color: '#0f172a' }}>
              📈 Biểu Đồ Giám Sát Nhiệt Độ Kho Lạnh 24 Giờ (Kho WH-006)
            </h3>
            <span style={{ fontSize: '12px', color: '#64748b' }}>
              Đường giới hạn an toàn tối đa (4.0°C). Nhiệt độ bảo quản thực phẩm luôn được kiểm soát chặt chẽ.
            </span>
          </div>
          <span style={{ fontSize: '12px', fontWeight: 800, color: '#0f766e', backgroundColor: '#f0fdfa', padding: '4px 10px', borderRadius: '8px', border: '1px solid #ccfbf1' }}>
            ● Cập nhật liên tục 24/7
          </span>
        </div>

        <div style={{ height: '220px', width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={telemetryHistory} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={isOverheatBreached ? '#ef4444' : '#0d9488'} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={isOverheatBreached ? '#ef4444' : '#0d9488'} stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#64748b' }} stroke="#cbd5e1" />
              <YAxis domain={[0, 7]} tick={{ fontSize: 11, fill: '#64748b' }} stroke="#cbd5e1" />
              <Tooltip
                formatter={(val: any) => [`${val}°C`, 'Nhiệt độ']}
                contentStyle={{ borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
              />
              <ReferenceLine y={4.0} stroke="#ef4444" strokeDasharray="4 4" label={{ value: 'Ngưỡng Max: 4.0°C', fill: '#ef4444', fontSize: 11, position: 'top' }} />
              <ReferenceLine y={0.0} stroke="#0284c7" strokeDasharray="4 4" label={{ value: 'Ngưỡng Min: 0.0°C', fill: '#0284c7', fontSize: 11, position: 'bottom' }} />
              <Area
                type="monotone"
                dataKey="temp"
                stroke={isOverheatBreached ? '#ef4444' : '#0d9488'}
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#tempGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 📦 2-COLUMN SECTION: LIVE WAVE ORDERS FEED & FEFO PRIORITY RADAR */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '20px' }}>
        
        {/* Left Column: Live Picking & Packing Orders */}
        <div style={{ background: '#ffffff', borderRadius: '18px', border: '1px solid #e2e8f0', padding: '22px 24px', boxShadow: '0 4px 20px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Compass size={18} color="#0284c7" />
                <span>Đợt Sóng Gom Hàng Trực Tiếp (Realtime Picking Wave)</span>
              </h3>
              <span style={{ fontSize: '12px', color: '#64748b' }}>Đồng bộ thời gian thực với App Điện thoại của Nhân viên</span>
            </div>
            <Link
              to="/orders"
              style={{
                fontSize: '12px',
                fontWeight: 800,
                color: '#0284c7',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                textDecoration: 'none',
              }}
            >
              <span>Xem chi tiết</span>
              <ChevronRight size={14} />
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
            {outboundOrders.slice(0, 5).map(ord => {
              const status = (ord.status || 'PENDING').toUpperCase();
              const isPicking = status === 'PICKING';
              const isPacked = status === 'PACKED' || status === 'CONFIRMED';
              const isPicked = status === 'PICKED' || status === 'PACKING';

              return (
                <div
                  key={ord.id}
                  style={{
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    padding: '12px 14px',
                    backgroundColor: isPicking ? '#f0fdf4' : '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        backgroundColor: isPacked ? '#dbeafe' : isPicked ? '#f3e8ff' : isPicking ? '#dcfce7' : '#f1f5f9',
                        color: isPacked ? '#1d4ed8' : isPicked ? '#7e22ce' : isPicking ? '#15803d' : '#64748b',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 900,
                        fontSize: '12px',
                      }}
                    >
                      {isPacked ? '📦' : isPicked ? '🏷️' : isPicking ? '⚡' : '⏳'}
                    </div>

                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 900, color: '#0f172a' }}>
                        {ord.orderCode}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                        {ord.destination || ord.customerName || 'Giao nội thành HCM'} • {ord.totalItems || ord.items?.length || 1} món ({ord.totalQuantity || 1} đơn vị)
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 900,
                        padding: '3px 8px',
                        borderRadius: '6px',
                        backgroundColor: isPacked ? '#dbeafe' : isPicked ? '#f3e8ff' : isPicking ? '#dcfce7' : '#f1f5f9',
                        color: isPacked ? '#1d4ed8' : isPicked ? '#7e22ce' : isPicking ? '#15803d' : '#475569',
                      }}
                    >
                      {isPacked ? 'ĐÃ ĐÓNG GÓI' : isPicked ? 'CHỜ ĐÓNG GÓI' : isPicking ? 'ĐANG LẤY HÀNG' : 'CHỜ SOẠN'}
                    </span>

                    <button
                      onClick={() => navigate(`/orders?orderId=${ord.id}`)}
                      style={{
                        backgroundColor: '#f1f5f9',
                        border: 'none',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        color: '#334155',
                        cursor: 'pointer',
                      }}
                    >
                      Điều phối
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: AI Intelligent FEFO Priority Radar */}
        <div style={{ background: '#ffffff', borderRadius: '18px', border: '1px solid #e2e8f0', padding: '22px 24px', boxShadow: '0 4px 20px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldAlert size={18} color="#d97706" />
                <span>Cảnh Báo Lô Hàng Cận Hạn Sử Dụng</span>
              </h3>
              <span style={{ fontSize: '12px', color: '#64748b' }}>Ưu tiên xuất trước để bảo vệ lợi nhuận & giảm hủy hàng</span>
            </div>
            <Link
              to="/inventory"
              style={{
                fontSize: '12px',
                fontWeight: 800,
                color: '#d97706',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                textDecoration: 'none',
              }}
            >
              <span>Kho hàng</span>
              <ChevronRight size={14} />
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
            {urgentFefo.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '13px', padding: '30px 0' }}>
                🟢 Tất cả các lô hàng tại kho đều an toàn, không có lô cận date khẩn cấp.
              </div>
            ) : (
              urgentFefo.map((item, i) => {
                const isCritical = item.fefoScore >= 75 || item.daysLeft <= 3;
                return (
                  <div
                    key={item.id || i}
                    style={{
                      borderRadius: '12px',
                      border: `1px solid ${isCritical ? '#fecaca' : '#fef3c7'}`,
                      backgroundColor: isCritical ? '#fff5f5' : '#fffbeb',
                      padding: '12px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          width: '30px',
                          height: '30px',
                          borderRadius: '8px',
                          backgroundColor: isCritical ? '#fee2e2' : '#fde68a',
                          color: isCritical ? '#b91c1c' : '#b45309',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 900,
                          fontSize: '11px',
                        }}
                      >
                        #{i + 1}
                      </div>

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 900, color: '#0f172a' }}>
                            {item.lotCode}
                          </span>
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 800,
                              padding: '1px 6px',
                              borderRadius: '4px',
                              backgroundColor: item.zone === 'COLD' ? '#ecfdf5' : item.zone === 'FROZEN' ? '#eff6ff' : '#fef3c7',
                              color: item.zone === 'COLD' ? '#047857' : item.zone === 'FROZEN' ? '#1d4ed8' : '#b45309',
                            }}
                          >
                            {item.zone === 'COLD' ? '❄️ Kho Lạnh' : item.zone === 'FROZEN' ? '🧊 Kho Đông' : '📦 Kho Khô'}
                          </span>
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                          Vị trí kệ: <b>{item.location}</b> • Tồn: <b>{item.remainingQty} {item.unit || 'Kg'}</b>
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '12px', fontWeight: 900, color: isCritical ? '#dc2626' : '#d97706' }}>
                        Còn {item.daysLeft} ngày
                      </div>
                      <div style={{ fontSize: '10.5px', color: '#64748b' }}>
                        Ưu tiên: <b>{item.fefoScore} điểm</b>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

    </div>
  );
};

// Styling Helpers
const kpiCardStyle = (borderColor: string, background: string): React.CSSProperties => ({
  background,
  borderRadius: '16px',
  padding: '18px 20px',
  border: '1px solid rgba(0, 0, 0, 0.06)',
  borderTop: `4px solid ${borderColor}`,
  boxShadow: '0 4px 18px rgba(0, 0, 0, 0.04)',
  display: 'flex',
  flexDirection: 'column',
  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
});

const kpiIconStyle = (bgColor: string, color: string): React.CSSProperties => ({
  width: '36px',
  height: '36px',
  borderRadius: '10px',
  backgroundColor: bgColor,
  color,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
});

export default Dashboard;
