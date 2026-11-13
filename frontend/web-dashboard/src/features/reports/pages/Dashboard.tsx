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

  // Shelf Hardware Interaction APIs
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
  const pickingPercent = totalPickingUnits > 0 ? Math.round((pickedUnits / totalPickingUnits) * 100) : 100;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '32px' }}>
      
      {/* 1. OVERHEAT EMERGENCY BANNER */}
      {isOverheatBreached && (
        <div
          style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            padding: '14px 18px',
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
                width: '36px',
                height: '36px',
                borderRadius: '6px',
                backgroundColor: '#fee2e2',
                color: '#991b1b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <AlertTriangle size={18} />
            </div>
            <div>
              <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#991b1b' }}>
                Cảnh Báo: Nhiệt Độ Kho Mát Vượt Ngưỡng Cho Phép ({coolTemp.toFixed(1)}°C / Giới hạn: 0.0°C ~ 4.0°C)
              </div>
              <div style={{ fontSize: '12px', color: '#b91c1c', marginTop: '2px' }}>
                Hệ thống chuông cảnh báo đang phát. Cần kiểm tra cửa kho và máy làm lạnh ngay để bảo quản thực phẩm luôn tươi ngon.
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
                fontWeight: 500,
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
              }}
            >
              {isSirenMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
              <span>{isSirenMuted ? 'Đã tắt chuông' : 'Tắt chuông báo'}</span>
            </button>
            <button
              onClick={handleRestoreSafeTemp}
              style={{
                backgroundColor: '#0f766e',
                color: '#ffffff',
                border: 'none',
                padding: '6px 14px',
                borderRadius: '6px',
                fontWeight: 500,
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <CheckCircle2 size={14} />
              <span>Khôi Phục Nhiệt Độ (2.6°C)</span>
            </button>
          </div>
        </div>
      )}

      {/* 2. HEADER */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          padding: '16px 20px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
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
                backgroundColor: '#f1f5f9',
                border: '1px solid #e2e8f0',
                color: '#475569',
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <Building2 size={12} color="#0f766e" />
              <span>Hệ Thống Quản Lý Kho • Siêu Thị C.T Mart</span>
            </span>

            <span
              style={{
                backgroundColor: isWsConnected ? '#f0fdf4' : '#fef2f2',
                border: `1px solid ${isWsConnected ? '#bbf7d0' : '#fecaca'}`,
                color: isWsConnected ? '#166534' : '#991b1b',
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: isWsConnected ? '#16a34a' : '#dc2626',
                }}
              />
              <span>{isWsConnected ? 'Hệ thống đang kết nối' : 'Mất kết nối'}</span>
            </span>
          </div>

          <h1
            style={{
              margin: '2px 0 0 0',
              fontSize: '18px',
              fontWeight: 700,
              color: '#0f172a',
              letterSpacing: '-0.01em',
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
          <p style={{ margin: 0, fontSize: '12.5px', color: '#64748b' }}>
            Theo dõi nhiệt độ bảo quản thực phẩm, tiến độ xử lý đơn hàng và hạn sử dụng sản phẩm trong ngày.
          </p>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Warehouse Selector */}
          {isAdmin ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: '#f8fafc',
                borderRadius: '6px',
                padding: '5px 10px',
                border: '1px solid #cbd5e1',
              }}
            >
              <Building2 size={14} color="#475569" />
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#475569' }}>KHO:</span>
              <select
                value={selectedWarehouseCode}
                onChange={(e) => setSelectedWarehouseCode(e.target.value)}
                style={{
                  backgroundColor: 'transparent',
                  color: '#0f172a',
                  border: 'none',
                  fontWeight: 600,
                  fontSize: '12.5px',
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
              <span style={{ fontSize: '10px', backgroundColor: '#0f766e', color: '#ffffff', padding: '1px 5px', borderRadius: '4px', fontWeight: 600 }}>
                Quản trị viên
              </span>
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: '#f8fafc',
                borderRadius: '6px',
                padding: '5px 10px',
                border: '1px solid #e2e8f0',
              }}
            >
              <Building2 size={14} color="#64748b" />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#0f172a' }}>
                  {selectedWarehouse?.name || `Kho ${effectiveWhCode}`} ({effectiveWhCode})
                </span>
                <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 400, display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <Lock size={9} color="#64748b" />
                  <span>Kho phụ trách</span>
                </span>
              </div>
            </div>
          )}

          {/* Quick Outbound Link */}
          <button
            onClick={() => navigate('/orders')}
            style={{
              backgroundColor: '#0284c7',
              color: '#ffffff',
              border: 'none',
              padding: '6px 12px',
              borderRadius: '6px',
              fontWeight: 500,
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
            }}
          >
            <Compass size={14} />
            <span>Xem Đơn Xuất Kho</span>
          </button>

          {/* Simulate Overheat Button */}
          {!isSimulatedOverheat ? (
            <button
              onClick={handleSimulateOverheat}
              style={{
                backgroundColor: '#fef2f2',
                color: '#991b1b',
                border: '1px solid #fecaca',
                padding: '6px 12px',
                borderRadius: '6px',
                fontWeight: 500,
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
              }}
              title="Kiểm tra hệ thống còi và đèn cảnh báo khi nhiệt độ kho tăng cao"
            >
              <Sliders size={14} />
              <span>Kiểm Tra Báo Động</span>
            </button>
          ) : (
            <button
              onClick={handleRestoreSafeTemp}
              style={{
                backgroundColor: '#f0fdf4',
                color: '#166534',
                border: '1px solid #bbf7d0',
                padding: '6px 12px',
                borderRadius: '6px',
                fontWeight: 500,
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
              }}
            >
              <CheckCircle2 size={14} />
              <span>Khôi Phục Bình Thường</span>
            </button>
          )}

          {/* Refresh Data */}
          <button
            onClick={() => fetchDashboardData()}
            disabled={isRefreshing}
            style={{
              backgroundColor: '#ffffff',
              color: '#334155',
              border: '1px solid #cbd5e1',
              padding: '6px 12px',
              borderRadius: '6px',
              fontWeight: 500,
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={13} className={isRefreshing ? 'spin' : ''} />
            <span>Cập nhật</span>
          </button>
        </div>
      </div>

      {/* 3. BẢNG 4 CHỈ SỐ HOẠT ĐỘNG */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
        
        {/* KPI 1: Đang Soạn Hàng */}
        <div style={kpiCardStyle('#0284c7')}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#0369a1', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Đơn Hàng Đang Soạn
            </span>
            <div style={kpiIconStyle('#f0f9ff', '#0284c7')}><Compass size={16} /></div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '8px' }}>
            <span style={{ fontSize: '26px', fontWeight: 700, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
              {pickingOrders.length}
            </span>
            <span style={{ fontSize: '12px', fontWeight: 500, color: '#0284c7' }}>đơn đang lấy hàng</span>
          </div>
          <div style={{ marginTop: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 500, color: '#64748b', marginBottom: '4px', fontVariantNumeric: 'tabular-nums' }}>
              <span>Tiến độ soạn: {pickedUnits}/{totalPickingUnits} sản phẩm</span>
              <span>{pickingPercent}%</span>
            </div>
            <div style={{ width: '100%', height: '5px', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ width: `${pickingPercent}%`, height: '100%', backgroundColor: '#0284c7', borderRadius: '3px', transition: 'width 0.4s ease' }} />
            </div>
          </div>
        </div>

        {/* KPI 2: Đóng Gói & Xuất Hàng */}
        <div style={kpiCardStyle('#0f766e')}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#0f766e', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Đóng Gói & Xuất Hàng
            </span>
            <div style={kpiIconStyle('#f0fdfa', '#0f766e')}><Boxes size={16} /></div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '8px' }}>
            <span style={{ fontSize: '26px', fontWeight: 700, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
              {packingOrders.length}
            </span>
            <span style={{ fontSize: '12px', fontWeight: 500, color: '#0f766e' }}>đơn chờ bàn giao</span>
          </div>
          <div style={{ fontSize: '11.5px', color: '#475569', marginTop: '10px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
            <Truck size={13} color="#0f766e" />
            <span>Đang trên đường giao: <b>{shippedOrders.length} đơn</b></span>
          </div>
        </div>

        {/* KPI 3: Nhiệt Độ Kho Mát */}
        <div style={kpiCardStyle(isOverheatBreached ? '#ef4444' : '#166534')}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: isOverheatBreached ? '#991b1b' : '#166534', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Nhiệt Độ Phòng Mát (Thực Phẩm)
            </span>
            <div style={kpiIconStyle(isOverheatBreached ? '#fef2f2' : '#f0fdf4', isOverheatBreached ? '#991b1b' : '#166534')}>
              <Thermometer size={16} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '8px' }}>
            <span style={{ fontSize: '26px', fontWeight: 700, color: isOverheatBreached ? '#991b1b' : '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
              {coolTemp.toFixed(1)}°C
            </span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                padding: '1px 6px',
                borderRadius: '4px',
                backgroundColor: isOverheatBreached ? '#fef2f2' : '#f0fdf4',
                color: isOverheatBreached ? '#991b1b' : '#166534',
                border: `1px solid ${isOverheatBreached ? '#fecaca' : '#bbf7d0'}`,
              }}
            >
              {isOverheatBreached ? 'Cảnh Báo Nhiệt' : 'Nhiệt Độ Lý Tưởng (Tươi Ngon)'}
            </span>
          </div>
          <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '10px', display: 'flex', justifyContent: 'space-between', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
            <span>Độ ẩm: <b>{coolHum.toFixed(1)}%</b></span>
            <span>Còi báo: <b>{isOverheatBreached ? (isSirenMuted ? 'Đã tắt âm' : 'Đang phát') : 'Bình thường'}</b></span>
          </div>
        </div>

        {/* KPI 4: Hàng Sắp Hết Hạn */}
        <div style={kpiCardStyle(alertCount > 0 ? '#d97706' : '#475569')}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: alertCount > 0 ? '#92400e' : '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Hàng Sắp Hết Hạn (Cần Bán Trước)
            </span>
            <div style={kpiIconStyle(alertCount > 0 ? '#fffbeb' : '#f8fafc', alertCount > 0 ? '#92400e' : '#475569')}>
              <CalendarCheck size={16} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '8px' }}>
            <span style={{ fontSize: '26px', fontWeight: 700, color: alertCount > 0 ? '#92400e' : '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
              {alertCount}
            </span>
            <span style={{ fontSize: '12px', fontWeight: 500, color: '#64748b' }}>lô hàng cần ưu tiên bán</span>
          </div>
          <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '10px', display: 'flex', justifyContent: 'space-between', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
            <span>Tổng tồn: <b>{totalLots} lô</b></span>
            <span>Danh mục: <b>{totalProducts} mặt hàng</b></span>
          </div>
        </div>

      </div>

      {/* 4. GIÁM SÁT NHIỆT ĐỘ CÁC KHU VỰC LƯU TRỮ */}
      <div style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Thermometer size={16} color="#0f766e" />
              <span>Nhiệt Độ Các Khu Vực Lưu Trữ Thực Phẩm</span>
            </h2>
            <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>
              Phân chia khu vực lưu trữ theo từng loại hàng: Phòng Mát (rau củ, sữa, thịt tươi), Phòng Đông (hải sản, kem) và Phòng Khô.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '11.5px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#166534' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#16a34a' }} /> Đạt chuẩn
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#991b1b' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#dc2626' }} /> Cần chú ý
            </span>
          </div>
        </div>

        {/* 3 Rooms Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))', gap: '14px' }}>
          
          {/* ROOM 1: PHÒNG KHO MÁT (0°C ~ 4°C) */}
          <div
            style={{
              borderRadius: '8px',
              border: `1px solid ${isOverheatBreached ? '#fecaca' : '#bbf7d0'}`,
              backgroundColor: isOverheatBreached ? '#fef2f2' : '#f0fdf4',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            {/* Room Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '30px', height: '30px', borderRadius: '6px', backgroundColor: isOverheatBreached ? '#fee2e2' : '#dcfce7', color: isOverheatBreached ? '#991b1b' : '#166534', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Snowflake size={16} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>1. Phòng Kho Mát</h3>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>Thịt tươi sống, sữa thanh trùng, rau củ quả</span>
                </div>
              </div>

              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: '4px',
                  backgroundColor: isOverheatBreached ? '#fef2f2' : '#f0fdf4',
                  color: isOverheatBreached ? '#991b1b' : '#166534',
                  border: `1px solid ${isOverheatBreached ? '#fecaca' : '#bbf7d0'}`,
                }}
              >
                {isOverheatBreached ? 'Cảnh Báo Nhiệt' : '0°C ~ 4°C Rất Tươi Ngon'}
              </span>
            </div>

            {/* Live Reading */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', backgroundColor: '#ffffff', padding: '10px 12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <div>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>Nhiệt độ hiện tại:</div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: isOverheatBreached ? '#991b1b' : '#166534', fontVariantNumeric: 'tabular-nums' }}>
                  {coolTemp.toFixed(1)}°C
                </div>
                <div style={{ fontSize: '10.5px', color: '#94a3b8' }}>Mức chuẩn: 0.0°C ~ 4.0°C</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>Độ ẩm không khí:</div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: '#0284c7', fontVariantNumeric: 'tabular-nums' }}>
                  {coolHum.toFixed(1)}%
                </div>
                <div style={{ fontSize: '10.5px', color: '#94a3b8' }}>Mức chuẩn: 70% ~ 85%</div>
              </div>
            </div>

            {/* Master Door Siren Status */}
            <div style={{ backgroundColor: '#ffffff', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Volume2 size={15} color={isOverheatBreached ? '#991b1b' : '#166534'} />
                <span style={{ fontSize: '11.5px', fontWeight: 500, color: '#0f172a' }}>Chuông báo cửa phòng kho</span>
              </div>
              <span style={{ fontSize: '11px', fontWeight: 600, color: isOverheatBreached ? '#991b1b' : '#166534' }}>
                {isOverheatBreached ? (isSirenMuted ? 'Đã tắt âm' : 'Đang phát chuông') : 'Bình thường'}
              </span>
            </div>

            {/* Shelves with Pick-to-Light buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ fontSize: '10.5px', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                Hỗ trợ nhân viên tìm kệ hàng:
              </div>

              {[
                { code: 'Ke A1', name: 'Kệ A1: Thịt tươi CP', tempSafe: '0°C ~ 4°C' },
                { code: 'Ke A2', name: 'Kệ A2: Sữa Đà Lạt Milk', tempSafe: '2°C ~ 6°C' },
                { code: 'Ke A3', name: 'Kệ A3: Rau củ VietGAP', tempSafe: '2°C ~ 8°C' },
              ].map(shelf => {
                const isLocating = activeLocatingShelf === shelf.code;
                const isChirping = chirpingShelf === shelf.code;

                return (
                  <div
                    key={shelf.code}
                    style={{
                      backgroundColor: '#ffffff',
                      borderRadius: '6px',
                      border: '1px solid #e2e8f0',
                      padding: '7px 10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '6px',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: '#0f172a' }}>{shelf.name}</div>
                      <div style={{ fontSize: '10.5px', color: '#64748b' }}>Bảo quản: {shelf.tempSafe}</div>
                    </div>

                    <div style={{ display: 'flex', gap: '5px' }}>
                      <button
                        onClick={() => handleLocateShelf(shelf.code, shelf.name)}
                        style={{
                          backgroundColor: isLocating ? '#0284c7' : '#f8fafc',
                          color: isLocating ? '#ffffff' : '#0369a1',
                          border: '1px solid #cbd5e1',
                          padding: '3px 7px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 500,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          cursor: 'pointer',
                        }}
                      >
                        <Radio size={12} />
                        <span>{isLocating ? 'Đang bật đèn' : 'Bật đèn kệ'}</span>
                      </button>

                      <button
                        onClick={() => handleChirpShelf(shelf.code)}
                        style={{
                          backgroundColor: isChirping ? '#fffbeb' : '#ffffff',
                          color: isChirping ? '#92400e' : '#475569',
                          border: `1px solid ${isChirping ? '#fde68a' : '#cbd5e1'}`,
                          padding: '3px 7px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 500,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          cursor: 'pointer',
                        }}
                      >
                        <Volume2 size={12} />
                        <span>{isChirping ? 'Đang chuông...' : 'Chuông'}</span>
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
              borderRadius: '8px',
              border: '1px solid #bae6fd',
              backgroundColor: '#f0f9ff',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '30px', height: '30px', borderRadius: '6px', backgroundColor: '#e0f2fe', color: '#0369a1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Snowflake size={16} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>2. Phòng Kho Đông</h3>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>Thịt bò Úc, Thủy hải sản Na Uy, Kem</span>
                </div>
              </div>

              <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px', backgroundColor: '#f0f9ff', color: '#0369a1', border: '1px solid #bae6fd' }}>
                -18°C ~ -22°C Đạt Chuẩn
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', backgroundColor: '#ffffff', padding: '10px 12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <div>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>Nhiệt độ hiện tại:</div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: '#0284c7', fontVariantNumeric: 'tabular-nums' }}>-19.4°C</div>
                <div style={{ fontSize: '10.5px', color: '#94a3b8' }}>Mức chuẩn: -22°C ~ -18°C</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>Độ ẩm không khí:</div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: '#0284c7', fontVariantNumeric: 'tabular-nums' }}>62.0%</div>
                <div style={{ fontSize: '10.5px', color: '#94a3b8' }}>Mức chuẩn: 60% ~ 75%</div>
              </div>
            </div>

            <div style={{ backgroundColor: '#ffffff', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '11.5px', color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldCheck size={15} color="#0284c7" />
              <span>Tiêu chuẩn bảo quản: <b>Đảm bảo vệ sinh an toàn thực phẩm</b></span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ fontSize: '10.5px', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                Danh sách 8 kệ hàng đông lạnh (B1 đến B8):
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                {['Kệ B1 (Bò Úc)', 'Kệ B2 (Hải sản Na Uy)', 'Kệ B3 (Viên thả lẩu)', 'Kệ B4 (Sườn bò Mỹ)', 'Kệ B5 (Cua tuyết)', 'Kệ B8 (Kem cao cấp)'].map((k, i) => (
                  <span key={i} style={{ fontSize: '11px', fontWeight: 500, backgroundColor: '#ffffff', border: '1px solid #e2e8f0', padding: '2px 7px', borderRadius: '4px', color: '#334155' }}>
                    {k}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* ROOM 3: PHÒNG KHO KHÔ (20°C ~ 25°C) */}
          <div
            style={{
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              backgroundColor: '#f8fafc',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '30px', height: '30px', borderRadius: '6px', backgroundColor: '#fffbeb', color: '#92400e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Wind size={16} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>3. Phòng Kho Khô</h3>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>Gạo ST25, Mì Hảo Hảo, Dầu ăn, Gia vị</span>
                </div>
              </div>

              <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px', backgroundColor: '#f8fafc', color: '#334155', border: '1px solid #e2e8f0' }}>
                20°C ~ 25°C Khô Thoáng
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', backgroundColor: '#ffffff', padding: '10px 12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <div>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>Nhiệt độ hiện tại:</div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>24.2°C</div>
                <div style={{ fontSize: '10.5px', color: '#94a3b8' }}>Nhiệt độ phòng mát mẻ</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>Độ ẩm không khí:</div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: '#0284c7', fontVariantNumeric: 'tabular-nums' }}>56.0%</div>
                <div style={{ fontSize: '10.5px', color: '#94a3b8' }}>Mức chuẩn: 50% ~ 65%</div>
              </div>
            </div>

            <div style={{ backgroundColor: '#ffffff', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '11.5px', color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldCheck size={15} color="#0f766e" />
              <span>Chất lượng bảo quản: <b>Khô ráo, sạch sẽ & chống ẩm mốc</b></span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ fontSize: '10.5px', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                Danh sách 10 kệ hàng khô (C1 đến C10):
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                {['Kệ C1 (Gạo ST25)', 'Kệ C2 (Mì gói)', 'Kệ C3 (Dầu Simply)', 'Kệ C4 (Knorr)', 'Kệ C7 (Cà phê G7)', 'Kệ C10 (Gia dụng)'].map((k, i) => (
                  <span key={i} style={{ fontSize: '11px', fontWeight: 500, backgroundColor: '#ffffff', border: '1px solid #e2e8f0', padding: '2px 7px', borderRadius: '4px', color: '#334155' }}>
                    {k}
                  </span>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* 5. BIỂU ĐỒ LỊCH SỬ NHIỆT ĐỘ PHÒNG MÁT 24H */}
      <div style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Activity size={16} color="#0f766e" />
              <span>Lịch Sử Nhiệt Độ Phòng Kho Mát (24 Giờ Qua)</span>
            </h2>
            <span style={{ fontSize: '11.5px', color: '#64748b' }}>
              Biểu đồ theo dõi nhiệt độ liên tục, đảm bảo luôn giữ trong khoảng an toàn từ 0.0°C đến 4.0°C.
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '11px', color: '#475569' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '8px', height: '2px', backgroundColor: '#ef4444' }} /> Mức tối đa: 4.0°C
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '8px', height: '2px', backgroundColor: '#0284c7' }} /> Mức tối thiểu: 0.0°C
            </span>
          </div>
        </div>

        <div style={{ width: '100%', height: '220px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={telemetryHistory} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="time" stroke="#94a3b8" fontSize={11} tickLine={false} />
              <YAxis domain={[-1, 7]} stroke="#94a3b8" fontSize={11} tickLine={false} unit="°C" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                  fontSize: '11.5px',
                }}
                formatter={(val: any) => [`${Number(val).toFixed(1)}°C`, 'Nhiệt độ']}
              />
              <ReferenceLine y={4.0} stroke="#ef4444" strokeDasharray="4 4" />
              <ReferenceLine y={0.0} stroke="#0284c7" strokeDasharray="4 4" />
              <Area
                type="monotone"
                dataKey="temp"
                stroke={isOverheatBreached ? '#dc2626' : '#0f766e'}
                strokeWidth={2}
                fill={isOverheatBreached ? '#fee2e2' : '#f0fdfa'}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 6. BÀN LÀM VIỆC ĐIỀU HÀNH (Đơn Hàng + Hàng Cận Date) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '14px' }}>
        
        {/* Left Column: Đơn Hàng Xuất Kho Cần Giao */}
        <div style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Compass size={16} color="#0284c7" />
                <span>Đơn Hàng Cần Giao Trong Ngày</span>
              </h2>
              <span style={{ fontSize: '11.5px', color: '#64748b' }}>Cập nhật trực tiếp theo tiến độ nhân viên tại kho</span>
            </div>
            <Link
              to="/orders"
              style={{
                fontSize: '11.5px',
                fontWeight: 600,
                color: '#0284c7',
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                textDecoration: 'none',
              }}
            >
              <span>Xem tất cả</span>
              <ChevronRight size={13} />
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
            {outboundOrders.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '12px', padding: '24px 0' }}>
                Hiện không có đơn hàng nào đang chờ xử lý.
              </div>
            ) : (
              outboundOrders.slice(0, 5).map(ord => {
                const status = (ord.status || 'PENDING').toUpperCase();
                const isPicking = status === 'PICKING';
                const isPacked = status === 'PACKED' || status === 'CONFIRMED';
                const isPicked = status === 'PICKED' || status === 'PACKING';

                return (
                  <div
                    key={ord.id}
                    style={{
                      borderRadius: '6px',
                      border: '1px solid #e2e8f0',
                      padding: '10px 12px',
                      backgroundColor: isPicking ? '#f0fdf4' : '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '10px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '4px',
                          backgroundColor: isPacked ? '#eff6ff' : isPicked ? '#faf5ff' : isPicking ? '#f0fdf4' : '#f8fafc',
                          color: isPacked ? '#1d4ed8' : isPicked ? '#7c3aed' : isPicking ? '#15803d' : '#64748b',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 600,
                          fontSize: '10.5px',
                        }}
                      >
                        {isPacked ? 'XONG' : isPicked ? 'GÓI' : isPicking ? 'LẤY' : 'CHỜ'}
                      </div>

                      <div>
                        <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#0f172a' }}>
                          {ord.orderCode}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '1px', fontVariantNumeric: 'tabular-nums' }}>
                          {ord.destination || ord.customerName || 'Giao tận nơi TP.HCM'} • {ord.totalItems || ord.items?.length || 1} món ({ord.totalQuantity || 1} sản phẩm)
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          fontSize: '10.5px',
                          fontWeight: 500,
                          padding: '2px 7px',
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
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 500,
                          color: '#334155',
                          cursor: 'pointer',
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

        {/* Right Column: Hàng Sắp Hết Hạn */}
        <div style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CalendarCheck size={16} color="#d97706" />
                <span>Hàng Hóa Cần Bán Trước (Sắp Hết Hạn)</span>
              </h2>
              <span style={{ fontSize: '11.5px', color: '#64748b' }}>Ưu tiên xuất bán trước để tránh tồn đọng cận date</span>
            </div>
            <Link
              to="/inventory"
              style={{
                fontSize: '11.5px',
                fontWeight: 600,
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

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
            {urgentFefo.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#64748b', fontSize: '12px', padding: '24px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <CheckCircle2 size={15} color="#16a34a" />
                <span>Toàn bộ hàng hóa tại kho đều có hạn sử dụng an toàn và còn dài.</span>
              </div>
            ) : (
              urgentFefo.map((item, i) => {
                const isCritical = item.fefoScore >= 75 || item.daysLeft <= 3;
                return (
                  <div
                    key={item.id || i}
                    style={{
                      borderRadius: '6px',
                      border: `1px solid ${isCritical ? '#fecaca' : '#fde68a'}`,
                      backgroundColor: isCritical ? '#fef2f2' : '#fffbeb',
                      padding: '10px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '10px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div
                        style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: '4px',
                          backgroundColor: isCritical ? '#fee2e2' : '#fef3c7',
                          color: isCritical ? '#991b1b' : '#92400e',
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
                          <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#0f172a' }}>
                            {item.lotCode}
                          </span>
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 500,
                              padding: '1px 5px',
                              borderRadius: '3px',
                              backgroundColor: item.zone === 'COLD' ? '#f0fdf4' : item.zone === 'FROZEN' ? '#eff6ff' : '#fffbeb',
                              color: item.zone === 'COLD' ? '#166534' : item.zone === 'FROZEN' ? '#1e40af' : '#92400e',
                              border: `1px solid ${item.zone === 'COLD' ? '#bbf7d0' : item.zone === 'FROZEN' ? '#bfdbfe' : '#fde68a'}`,
                            }}
                          >
                            {item.zone === 'COLD' ? 'Kho Mát' : item.zone === 'FROZEN' ? 'Kho Đông' : 'Kho Khô'}
                          </span>
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '1px', fontVariantNumeric: 'tabular-nums' }}>
                          Kệ: <b>{item.location}</b> • Tồn: <b>{item.remainingQty} {item.unit || 'Kg'}</b>
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '11.5px', fontWeight: 600, color: isCritical ? '#991b1b' : '#92400e', fontVariantNumeric: 'tabular-nums' }}>
                        Còn {item.daysLeft} ngày
                      </div>
                      <div style={{ fontSize: '10.5px', color: '#64748b', fontVariantNumeric: 'tabular-nums' }}>
                        Ưu tiên bán: <b>{item.fefoScore} điểm</b>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* 7. ĐỘI XE GIAO HÀNG TẬN NƠI */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          padding: '12px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              backgroundColor: '#f0f9ff',
              color: '#0284c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Truck size={16} />
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>
              Đội Xe Giao Hàng Tận Nơi Cho Khách
            </div>
            <div style={{ fontSize: '11px', color: '#64748b' }}>
              Theo dõi vị trí tài xế và nhiệt độ thùng xe để thực phẩm luôn tươi ngon khi tới tay khách hàng.
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px', fontVariantNumeric: 'tabular-nums' }}>
          <span style={{ color: '#475569' }}>
            Xe đang giao: <b style={{ color: '#0f172a' }}>8 xe</b>
          </span>
          <span style={{ color: '#475569' }}>
            Thùng xe giữ lạnh: <b style={{ color: '#166534' }}>3.2°C (Rất tốt)</b>
          </span>
          <span style={{ color: '#475569' }}>
            Giao đúng giờ: <b style={{ color: '#0f766e' }}>98.6%</b>
          </span>
          <button
            onClick={() => navigate('/transport')}
            style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #cbd5e1',
              color: '#334155',
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '11.5px',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <span>Bản đồ đội xe</span>
            <ChevronRight size={13} />
          </button>
        </div>
      </div>

    </div>
  );
};

// Styling Helpers
const kpiCardStyle = (accentColor: string): React.CSSProperties => ({
  backgroundColor: '#ffffff',
  borderRadius: '8px',
  padding: '14px 16px',
  border: '1px solid #e2e8f0',
  borderLeft: `3px solid ${accentColor}`,
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
  display: 'flex',
  flexDirection: 'column',
});

const kpiIconStyle = (bgColor: string, color: string): React.CSSProperties => ({
  width: '32px',
  height: '32px',
  borderRadius: '6px',
  backgroundColor: bgColor,
  color,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
});

export default Dashboard;
