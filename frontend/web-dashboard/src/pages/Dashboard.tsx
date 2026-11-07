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
      
      {/* CRITICAL OVERHEAT WARNING BANNER */}
      {isOverheatBreached && (
        <div
          style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '10px',
            padding: '14px 18px',
            color: '#991b1b',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '8px',
                backgroundColor: '#fee2e2',
                color: '#dc2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <AlertTriangle size={20} />
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#991b1b' }}>
                Cảnh Báo Khẩn Cấp: Nhiệt Độ Kho Lạnh Vượt Ngưỡng An Toàn ({coolTemp}°C / Tối Đa 4.0°C)
              </div>
              <div style={{ fontSize: '12px', color: '#b91c1c', marginTop: '2px' }}>
                Hệ thống chuông và đèn cảnh báo kho mát đang hoạt động. Cần kiểm tra hệ thống làm lạnh ngay lập tức để bảo vệ chất lượng hàng hóa.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => setIsSirenMuted(!isSirenMuted)}
              style={{
                backgroundColor: '#ffffff',
                color: '#334155',
                border: '1px solid #cbd5e1',
                padding: '6px 12px',
                borderRadius: '6px',
                fontWeight: 600,
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
              }}
            >
              {isSirenMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
              <span>{isSirenMuted ? 'Đã tắt tiếng' : 'Tắt còi báo'}</span>
            </button>
            <button
              onClick={handleRestoreSafeTemp}
              style={{
                backgroundColor: '#16a34a',
                color: '#ffffff',
                border: 'none',
                padding: '6px 14px',
                borderRadius: '6px',
                fontWeight: 600,
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <CheckCircle2 size={15} />
              <span>Khôi Phục Nhiệt Độ (2.5°C)</span>
            </button>
          </div>
        </div>
      )}

      {/* COMMAND CENTER HEADER */}
      <div
        style={{
          backgroundColor: '#0f172a',
          borderRadius: '10px',
          padding: '20px 24px',
          color: '#ffffff',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          border: '1px solid #1e293b',
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
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                color: '#94a3b8',
                padding: '3px 8px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 600,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Activity size={12} color="#10b981" />
              Hệ thống Điều hành Kho • CityMart
            </span>
            <span
              style={{
                backgroundColor: isWsConnected ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                border: `1px solid ${isWsConnected ? '#059669' : '#dc2626'}`,
                color: isWsConnected ? '#34d399' : '#f87171',
                padding: '2px 8px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 600,
              }}
            >
              {isWsConnected ? 'Đồng bộ thời gian thực' : 'Ngoại tuyến'}
            </span>
          </div>

          <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700, letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>Trung Tâm Điều Hành Kho Hàng</span>
            <span style={{ fontSize: '14px', fontWeight: 500, color: '#94a3b8' }}>
              ({selectedWarehouse?.name || `Kho Hàng ${effectiveWhCode}`})
            </span>
          </h1>
          <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>
            Giám sát điều kiện kho hàng, điều phối nhặt hàng xuất kho và kiểm soát hạn sử dụng sản phẩm theo thời gian thực.
          </p>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Warehouse Selector (Admin) vs Fixed Warehouse Indicator (Warehouse Accounts) */}
          {isAdmin ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#1e293b', borderRadius: '8px', padding: '6px 12px', border: '1px solid #334155' }}>
              <Building2 size={15} color="#94a3b8" />
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Kho:</span>
              <select
                value={selectedWarehouseCode}
                onChange={(e) => setSelectedWarehouseCode(e.target.value)}
                style={{
                  backgroundColor: 'transparent',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 600,
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
              <span style={{ fontSize: '10px', backgroundColor: '#0f766e', color: '#ffffff', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                Admin
              </span>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#1e293b', borderRadius: '8px', padding: '6px 12px', border: '1px solid #334155' }}>
              <Building2 size={15} color="#94a3b8" />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#ffffff' }}>
                  {selectedWarehouse?.name || `Kho ${effectiveWhCode}`} ({effectiveWhCode})
                </span>
                <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Lock size={10} color="#94a3b8" />
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
                padding: '8px 14px',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '12.5px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
              }}
              title="Kích hoạt kịch bản thử nghiệm cảnh báo khi nhiệt độ kho vượt ngưỡng an toàn"
            >
              <AlertTriangle size={14} />
              <span>Kiểm Tra Cảnh Báo Nhiệt</span>
            </button>
          ) : (
            <button
              onClick={handleRestoreSafeTemp}
              style={{
                backgroundColor: '#16a34a',
                color: '#ffffff',
                border: 'none',
                padding: '8px 14px',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '12.5px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
              }}
            >
              <CheckCircle2 size={14} />
              <span>Khôi Phục An Toàn</span>
            </button>
          )}

          {/* Refresh Data */}
          <button
            onClick={() => fetchDashboardData()}
            disabled={isRefreshing}
            style={{
              backgroundColor: '#1e293b',
              color: '#ffffff',
              border: '1px solid #334155',
              padding: '8px 14px',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '12.5px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={14} className={isRefreshing ? 'spin' : ''} />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* OPERATIONAL KPI CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
        
        {/* KPI 1: Live Wave Picking */}
        <div style={kpiCardStyle('#0284c7')}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#0369a1', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Đang Gom Hàng (Picking Wave)
            </span>
            <div style={kpiIconStyle('#f0f9ff', '#0284c7')}><Compass size={18} /></div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '10px' }}>
            <span style={{ fontSize: '28px', fontWeight: 700, color: '#0f172a' }}>{pickingOrders.length}</span>
            <span style={{ fontSize: '13px', fontWeight: 500, color: '#0284c7' }}>đơn hàng chờ lấy</span>
          </div>
          <div style={{ marginTop: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 500, color: '#64748b', marginBottom: '4px' }}>
              <span>Tiến độ đợt sóng: {pickedUnits}/{totalPickingUnits} món</span>
              <span>{wavePickingPercent}%</span>
            </div>
            <div style={{ width: '100%', height: '6px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ width: `${wavePickingPercent}%`, height: '100%', backgroundColor: '#0284c7', borderRadius: '4px', transition: 'width 0.4s ease' }} />
            </div>
          </div>
        </div>

        {/* KPI 2: Packing Station Queue */}
        <div style={kpiCardStyle('#7c3aed')}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#6d28d9', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Bàn Đóng Gói & Xuất Kho
            </span>
            <div style={kpiIconStyle('#faf5ff', '#7c3aed')}><Boxes size={18} /></div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '10px' }}>
            <span style={{ fontSize: '28px', fontWeight: 700, color: '#0f172a' }}>{packingOrders.length}</span>
            <span style={{ fontSize: '13px', fontWeight: 500, color: '#7c3aed' }}>đơn chờ dán tem</span>
          </div>
          <div style={{ fontSize: '12px', color: '#6b21a8', marginTop: '12px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 500 }}>
            <Truck size={14} />
            <span>Đã giao vận chuyển: {shippedOrders.length} đơn</span>
          </div>
        </div>

        {/* KPI 3: Cold Storage Temp Status */}
        <div style={kpiCardStyle(isOverheatBreached ? '#ef4444' : '#059669')}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: isOverheatBreached ? '#b91c1c' : '#047857', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Kiểm Soát Nhiệt Độ Kho Mát
            </span>
            <div style={kpiIconStyle(isOverheatBreached ? '#fef2f2' : '#f0fdf4', isOverheatBreached ? '#dc2626' : '#059669')}>
              <Thermometer size={18} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '10px' }}>
            <span style={{ fontSize: '28px', fontWeight: 700, color: isOverheatBreached ? '#dc2626' : '#0f172a' }}>
              {coolTemp.toFixed(1)}°C
            </span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: '4px',
                backgroundColor: isOverheatBreached ? '#fef2f2' : '#f0fdf4',
                color: isOverheatBreached ? '#b91c1c' : '#15803d',
                border: `1px solid ${isOverheatBreached ? '#fecaca' : '#bbf7d0'}`,
              }}
            >
              {isOverheatBreached ? 'Cảnh Báo Nhiệt' : 'Đạt Chuẩn Bảo Quản'}
            </span>
          </div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '12px', display: 'flex', justifyContent: 'space-between', fontWeight: 500 }}>
            <span>Độ ẩm: <b>{coolHum.toFixed(1)}%</b></span>
            <span>Hệ thống chuông: <b>{isOverheatBreached ? (isSirenMuted ? 'Đã tắt tiếng' : 'Đang báo động') : 'Ổn định'}</b></span>
          </div>
        </div>

        {/* KPI 4: FEFO Risk Alerts */}
        <div style={kpiCardStyle(alertCount > 0 ? '#d97706' : '#0f766e')}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: alertCount > 0 ? '#b45309' : '#0f766e', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Lô Cận Hạn Sử Dụng Cần Xuất Gấp
            </span>
            <div style={kpiIconStyle(alertCount > 0 ? '#fffbeb' : '#f0fdfa', alertCount > 0 ? '#d97706' : '#0f766e')}><ShieldAlert size={18} /></div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '10px' }}>
            <span style={{ fontSize: '28px', fontWeight: 700, color: alertCount > 0 ? '#b45309' : '#0f172a' }}>{alertCount}</span>
            <span style={{ fontSize: '13px', fontWeight: 500, color: '#64748b' }}>lô cần ưu tiên xuất</span>
          </div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '12px', display: 'flex', justifyContent: 'space-between', fontWeight: 500 }}>
            <span>Tổng tồn: <b>{totalLots} lô</b></span>
            <span>Danh mục: <b>{totalProducts} mặt hàng</b></span>
          </div>
        </div>

      </div>

      {/* TRUNG TÂM GIÁM SÁT 3 PHÒNG KHO & IOT */}
      <div style={{ background: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '20px 22px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Thermometer size={18} color="#0f766e" />
              <span>Giám Sát Điều Kiện Bảo Quản 3 Phân Khu Kho</span>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#0f766e', backgroundColor: '#f0fdfa', padding: '2px 8px', borderRadius: '4px', border: '1px solid #ccfbf1' }}>
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
                  fontWeight: 600,
                  padding: '3px 8px',
                  borderRadius: '4px',
                  backgroundColor: isOverheatBreached ? '#fef2f2' : '#f0fdf4',
                  color: isOverheatBreached ? '#b91c1c' : '#15803d',
                  border: `1px solid ${isOverheatBreached ? '#fecaca' : '#bbf7d0'}`,
                }}
              >
                {isOverheatBreached ? 'Cảnh báo nhiệt' : '0°C ~ 4°C Đạt chuẩn'}
              </span>
            </div>

            {/* Live Reading */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', backgroundColor: '#ffffff', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Nhiệt độ hiện tại:</div>
                <div style={{ fontSize: '22px', fontWeight: 700, color: isOverheatBreached ? '#dc2626' : '#059669' }}>
                  {coolTemp.toFixed(1)}°C
                </div>
                <div style={{ fontSize: '10.5px', color: '#94a3b8' }}>Ngưỡng an toàn: 0.0°C ~ 4.0°C</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Độ ẩm không khí:</div>
                <div style={{ fontSize: '22px', fontWeight: 700, color: '#0284c7' }}>
                  {coolHum.toFixed(1)}%
                </div>
                <div style={{ fontSize: '10.5px', color: '#94a3b8' }}>Ngưỡng tiêu chuẩn: 70% ~ 85%</div>
              </div>
            </div>

            {/* Master Door Horn Siren Status */}
            <div style={{ backgroundColor: '#ffffff', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Volume2 size={16} color={isOverheatBreached ? '#dc2626' : '#059669'} />
                <div>
                  <div style={{ fontSize: '11.5px', fontWeight: 600, color: '#0f172a' }}>HỆ THỐNG CẢNH BÁO CỬA KHO</div>
                  <div style={{ fontSize: '10.5px', color: '#64748b' }}>Phát chuông báo động tự động khi nhiệt độ vượt ngưỡng an toàn</div>
                </div>
              </div>
              <span style={{ fontSize: '11px', fontWeight: 600, color: isOverheatBreached ? '#dc2626' : '#059669' }}>
                {isOverheatBreached ? 'Đang báo động' : 'Hoạt động bình thường'}
              </span>
            </div>

            {/* 3 Shelves with Pick-to-Light buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#475569', textTransform: 'uppercase' }}>
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
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      padding: '8px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#0f172a' }}>{shelf.name}</div>
                      <div style={{ fontSize: '10.5px', color: '#64748b' }}>
                        Tiêu chuẩn bảo quản: {shelf.tempSafe}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        onClick={() => handleLocateShelf(shelf.code, shelf.name)}
                        style={{
                          backgroundColor: isLocating ? '#0284c7' : '#f8fafc',
                          color: isLocating ? '#ffffff' : '#0369a1',
                          border: '1px solid #cbd5e1',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          cursor: 'pointer',
                        }}
                      >
                        <Radio size={12} />
                        <span>{isLocating ? 'Đang định vị' : 'Bật đèn kệ (PTL)'}</span>
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
                          fontWeight: 600,
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
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#475569', textTransform: 'uppercase' }}>
                DANH MỤC 8 KỆ HÀNG ĐÔNG LẠNH (B1 ĐẾN B8):
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {['Kệ B1 (Thịt bò Úc)', 'Kệ B2 (Hải sản Na Uy)', 'Kệ B3 (Viên thả lẩu)', 'Kệ B4 (Sườn bò Mỹ)', 'Kệ B5 (Cua tuyết)', 'Kệ B8 (Kem cao cấp)'].map((k, i) => (
                  <span key={i} style={{ fontSize: '11px', fontWeight: 500, backgroundColor: '#ffffff', border: '1px solid #cbd5e1', padding: '3px 8px', borderRadius: '4px', color: '#1e293b' }}>
                    {k}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* ROOM 3: PHÒNG KHO KHÔ (Dry Storage Room 20°C ~ 25°C) */}
          <div
            style={{
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              backgroundColor: '#f8fafc',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '6px', backgroundColor: '#fffbeb', color: '#b45309', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Wind size={18} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>3. PHÒNG KHO KHÔ</h4>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>Gạo ST25, Mì Hảo Hảo, Dầu ăn Simply, Gia vị</span>
                </div>
              </div>

              <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: '4px', backgroundColor: '#fffbeb', color: '#b45309', border: '1px solid #fde68a' }}>
                20°C ~ 25°C Bình thường
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', backgroundColor: '#ffffff', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Nhiệt độ hiện tại:</div>
                <div style={{ fontSize: '22px', fontWeight: 700, color: '#b45309' }}>24.2°C</div>
                <div style={{ fontSize: '10.5px', color: '#94a3b8' }}>Nhiệt độ phòng tự nhiên</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Độ ẩm không khí:</div>
                <div style={{ fontSize: '22px', fontWeight: 700, color: '#0284c7' }}>56.0%</div>
                <div style={{ fontSize: '10.5px', color: '#94a3b8' }}>Ngưỡng thoáng: 50% ~ 65%</div>
              </div>
            </div>

            <div style={{ backgroundColor: '#ffffff', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px', color: '#334155', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={16} color="#b45309" />
              <span>Kiểm soát độ ẩm: <b>Thông gió tự nhiên & Chống ẩm mốc</b></span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#475569', textTransform: 'uppercase' }}>
                DANH MỤC 10 KỆ HÀNG KHO KHÔ (C1 ĐẾN C10):
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {['Kệ C1 (Gạo ST25)', 'Kệ C2 (Mì gói)', 'Kệ C3 (Dầu ăn Simply)', 'Kệ C4 (Gia vị Knorr)', 'Kệ C7 (Cà phê G7)', 'Kệ C10 (Gia dụng)'].map((k, i) => (
                  <span key={i} style={{ fontSize: '11px', fontWeight: 500, backgroundColor: '#ffffff', border: '1px solid #cbd5e1', padding: '3px 8px', borderRadius: '4px', color: '#1e293b' }}>
                    {k}
                  </span>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* 24-HOUR COLD-CHAIN TELEMETRY CHART */}
      <div style={{ background: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '20px 22px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={18} color="#0f766e" />
              <span>Biểu Đồ Giám Sát Nhiệt Độ Kho Lạnh 24 Giờ (Kho WH-006)</span>
            </h3>
            <span style={{ fontSize: '12px', color: '#64748b' }}>
              Đường giới hạn an toàn tối đa (4.0°C). Nhiệt độ bảo quản thực phẩm luôn được kiểm soát chặt chẽ.
            </span>
          </div>
          <span style={{ fontSize: '11px', fontWeight: 600, color: '#0f766e', backgroundColor: '#f0fdfa', padding: '4px 10px', borderRadius: '6px', border: '1px solid #ccfbf1' }}>
            Cập nhật liên tục 24/7
          </span>
        </div>

        <div style={{ height: '220px', width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={telemetryHistory} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={isOverheatBreached ? '#ef4444' : '#0d9488'} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={isOverheatBreached ? '#ef4444' : '#0d9488'} stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#64748b' }} stroke="#cbd5e1" />
              <YAxis domain={[0, 7]} tick={{ fontSize: 11, fill: '#64748b' }} stroke="#cbd5e1" />
              <Tooltip
                formatter={(val: any) => [`${val}°C`, 'Nhiệt độ']}
                contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
              />
              <ReferenceLine y={4.0} stroke="#ef4444" strokeDasharray="4 4" label={{ value: 'Ngưỡng Max: 4.0°C', fill: '#ef4444', fontSize: 11, position: 'top' }} />
              <ReferenceLine y={0.0} stroke="#0284c7" strokeDasharray="4 4" label={{ value: 'Ngưỡng Min: 0.0°C', fill: '#0284c7', fontSize: 11, position: 'bottom' }} />
              <Area
                type="monotone"
                dataKey="temp"
                stroke={isOverheatBreached ? '#ef4444' : '#0d9488'}
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#tempGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 2-COLUMN SECTION: LIVE WAVE ORDERS FEED & FEFO PRIORITY RADAR */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '20px' }}>
        
        {/* Left Column: Live Picking & Packing Orders */}
        <div style={{ background: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '20px 22px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Compass size={18} color="#0284c7" />
                <span>Đợt Sóng Gom Hàng Trực Tiếp (Realtime Picking Wave)</span>
              </h3>
              <span style={{ fontSize: '12px', color: '#64748b' }}>Đồng bộ thời gian thực với App Nhân viên kho</span>
            </div>
            <Link
              to="/orders"
              style={{
                fontSize: '12px',
                fontWeight: 600,
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
                    borderRadius: '8px',
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
                        width: '32px',
                        height: '32px',
                        borderRadius: '6px',
                        backgroundColor: isPacked ? '#eff6ff' : isPicked ? '#faf5ff' : isPicking ? '#f0fdf4' : '#f8fafc',
                        color: isPacked ? '#1d4ed8' : isPicked ? '#7c3aed' : isPicking ? '#15803d' : '#64748b',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 600,
                        fontSize: '11px',
                      }}
                    >
                      {isPacked ? 'GÓI' : isPicked ? 'TEM' : isPicking ? 'LẤY' : 'CHỜ'}
                    </div>

                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>
                        {ord.orderCode}
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
                        {ord.destination || ord.customerName || 'Giao nội thành HCM'} • {ord.totalItems || ord.items?.length || 1} món ({ord.totalQuantity || 1} đơn vị)
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        padding: '3px 8px',
                        borderRadius: '4px',
                        backgroundColor: isPacked ? '#eff6ff' : isPicked ? '#faf5ff' : isPicking ? '#f0fdf4' : '#f8fafc',
                        color: isPacked ? '#1d4ed8' : isPicked ? '#7c3aed' : isPicking ? '#15803d' : '#475569',
                        border: `1px solid ${isPacked ? '#bfdbfe' : isPicked ? '#e9d5ff' : isPicking ? '#bbf7d0' : '#e2e8f0'}`,
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
                        fontWeight: 600,
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

        {/* Right Column: FEFO Priority Radar */}
        <div style={{ background: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '20px 22px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldAlert size={18} color="#d97706" />
                <span>Cảnh Báo Lô Hàng Cận Hạn Sử Dụng</span>
              </h3>
              <span style={{ fontSize: '12px', color: '#64748b' }}>Ưu tiên xuất trước để bảo vệ chất lượng & giảm hao hụt</span>
            </div>
            <Link
              to="/inventory"
              style={{
                fontSize: '12px',
                fontWeight: 600,
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
              <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '13px', padding: '30px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <CheckCircle2 size={16} color="#16a34a" />
                <span>Tất cả các lô hàng tại kho đều an toàn, không có lô cận date khẩn cấp.</span>
              </div>
            ) : (
              urgentFefo.map((item, i) => {
                const isCritical = item.fefoScore >= 75 || item.daysLeft <= 3;
                return (
                  <div
                    key={item.id || i}
                    style={{
                      borderRadius: '8px',
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
                          width: '28px',
                          height: '28px',
                          borderRadius: '6px',
                          backgroundColor: isCritical ? '#fee2e2' : '#fde68a',
                          color: isCritical ? '#b91c1c' : '#b45309',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '11px',
                        }}
                      >
                        #{i + 1}
                      </div>

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>
                            {item.lotCode}
                          </span>
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 600,
                              padding: '1px 6px',
                              borderRadius: '4px',
                              backgroundColor: item.zone === 'COLD' ? '#f0fdf4' : item.zone === 'FROZEN' ? '#eff6ff' : '#fffbeb',
                              color: item.zone === 'COLD' ? '#166534' : item.zone === 'FROZEN' ? '#1e40af' : '#92400e',
                              border: `1px solid ${item.zone === 'COLD' ? '#bbf7d0' : item.zone === 'FROZEN' ? '#bfdbfe' : '#fde68a'}`,
                            }}
                          >
                            {item.zone === 'COLD' ? 'Kho Mát' : item.zone === 'FROZEN' ? 'Kho Đông' : 'Kho Khô'}
                          </span>
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                          Vị trí kệ: <b>{item.location}</b> • Tồn: <b>{item.remainingQty} {item.unit || 'Kg'}</b>
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: isCritical ? '#dc2626' : '#d97706' }}>
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
const kpiCardStyle = (accentColor: string): React.CSSProperties => ({
  backgroundColor: '#ffffff',
  borderRadius: '8px',
  padding: '16px 18px',
  border: '1px solid #e2e8f0',
  borderLeft: `4px solid ${accentColor}`,
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
  display: 'flex',
  flexDirection: 'column',
});

const kpiIconStyle = (bgColor: string, color: string): React.CSSProperties => ({
  width: '34px',
  height: '34px',
  borderRadius: '6px',
  backgroundColor: bgColor,
  color,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
});

export default Dashboard;
