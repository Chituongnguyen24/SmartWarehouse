import React, { useState, useEffect } from 'react';
import { Truck, Route, ArrowUpRight, Clock, MapPin, CheckCircle2, RefreshCw, Play, User, Calendar, Phone, Navigation, ShieldCheck, Thermometer, AlertTriangle, Cpu, Circle, CheckSquare, Square, X, Camera } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export interface DriverInfo {
  id: string;
  name: string;
  licensePlate: string;
  vehicleType: 'REFRIGERATED' | 'FROZEN' | 'NORMAL';
  capacityKg: number;
  status: 'AVAILABLE' | 'IN_TRANSIT' | 'MAINTENANCE';
  currentTemp?: string;
  phone: string;
}

export interface VrpResponse {
  depot: {
    id: string;
    name: string;
    lat: number;
    lng: number;
  };
  totalRoutes: number;
  truckCapacity: number;
  routes: any[];
  totalDistance: number;
}

const OUTBOUND_API = 'http://localhost:3007';
const TRANSPORT_API = 'http://localhost:3013';

const EXTENDED_MOCK_DRIVERS: DriverInfo[] = [
  { id: 'drv-01', name: 'Nguyễn Văn Hùng', licensePlate: '59-X1 884.92', vehicleType: 'REFRIGERATED', capacityKg: 150, status: 'AVAILABLE', currentTemp: '2.5°C', phone: '0909 888 111' },
  { id: 'drv-02', name: 'Trần Quốc Bảo', licensePlate: '59-T2 123.45', vehicleType: 'FROZEN', capacityKg: 300, status: 'AVAILABLE', currentTemp: '-19.2°C', phone: '0918 333 444' },
  { id: 'drv-03', name: 'Lê Minh Tuấn', licensePlate: '59-K3 999.88', vehicleType: 'NORMAL', capacityKg: 100, status: 'AVAILABLE', currentTemp: 'Thường', phone: '0977 555 666' },
  { id: 'drv-04', name: 'Võ Thanh Sơn', licensePlate: '59-P1 554.32', vehicleType: 'REFRIGERATED', capacityKg: 200, status: 'IN_TRANSIT', currentTemp: '3.1°C', phone: '0938 222 999' },
  { id: 'drv-05', name: 'Phạm Quốc Anh', licensePlate: '59-F3 445.67', vehicleType: 'NORMAL', capacityKg: 500, status: 'AVAILABLE', currentTemp: 'Thường', phone: '0902 444 555' },
  { id: 'drv-06', name: 'Hoàng Văn Nam', licensePlate: '59-D2 778.89', vehicleType: 'REFRIGERATED', capacityKg: 250, status: 'AVAILABLE', currentTemp: '1.8°C', phone: '0988 777 666' },
  { id: 'drv-07', name: 'Đặng Quốc Huy', licensePlate: '59-S1 889.01', vehicleType: 'FROZEN', capacityKg: 400, status: 'AVAILABLE', currentTemp: '-18.5°C', phone: '0919 222 333' },
  { id: 'drv-08', name: 'Bùi Minh Đức', licensePlate: '59-L2 667.12', vehicleType: 'NORMAL', capacityKg: 150, status: 'MAINTENANCE', currentTemp: 'Thường', phone: '0908 999 000' }
];

const TransportOptimization = () => {
  const { token, user } = useAuth();
  const isDriver = user?.role === 'DRIVER';

  const [drivers] = useState<DriverInfo[]>(EXTENDED_MOCK_DRIVERS);
  const [orders, setOrders] = useState<any[]>([]);
  const [vrpResult, setVrpResult] = useState<VrpResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Driver IoT & Sim State
  const [driverTemp, setDriverTemp] = useState(2.8); // 2.8°C
  const [isOnline, setIsOnline] = useState(true);
  const [selectedPodOrder, setSelectedPodOrder] = useState<any | null>(null);
  
  // POD Checklist state
  const [chkTemp, setChkTemp] = useState(true);
  const [chkPack, setChkPack] = useState(true);
  const [chkSign, setChkSign] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await fetch(`${OUTBOUND_API}/outbound-orders`);
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (err) {
      console.error('Lỗi lấy đơn hàng từ Outbound API:', err);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Run VRP routing solver (For Manager)
  const handleOptimizeVrp = async () => {
    const activeOrders = orders.filter(o => o.status === 'PENDING' || o.status === 'PICKING');
    if (activeOrders.length === 0) {
      showToast('⚠️ Không có đơn hàng hoạt động (PENDING/PICKING) nào để tối ưu!');
      return;
    }
    setLoading(true);
    showToast('Đang chạy thuật toán tối ưu tuyến đường VRP...');

    const stops = activeOrders.map(o => {
      let requiredVehicleType = 'NORMAL';
      if (Array.isArray(o.items)) {
        if (o.items.some((it: any) => it.sku === 'BEEF-STEAK-US')) {
          requiredVehicleType = 'FROZEN';
        } else if (o.items.some((it: any) => it.sku === 'MILK-DALAT-1L' || it.sku === 'TOMATO-DALAT')) {
          requiredVehicleType = 'REFRIGERATED';
        }
      }
      return {
        id: o.id,
        name: `${o.requesterName || o.customerName || 'Khách hàng'} (#${o.orderCode})`,
        lat: o.latitude || 10.8286,
        lng: o.longitude || 106.6802,
        demand: o.totalQuantity || o.items?.reduce((acc: number, it: any) => acc + it.requestedQuantity, 0) || 10,
        requiredVehicleType
      };
    });

    try {
      const response = await fetch(`${TRANSPORT_API}/transport/vrp-solve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          stops: stops,
          capacity: 250,
          drivers: drivers
        })
      });

      if (response.ok) {
        const data = await response.json();
        setVrpResult(data);
        showToast('✅ Đã giải thuật toán VRP & ghép đơn tài xế tối ưu!');
      } else {
        throw new Error('Failed to solve VRP');
      }
    } catch (err) {
      console.error(err);
      showToast('❌ Lỗi khi chạy giải thuật VRP');
    } finally {
      setLoading(false);
    }
  };

  // Confirm delivery (POD) - For Driver
  const handleConfirmDeliverySubmit = async () => {
    if (!chkTemp || !chkPack || !chkSign) {
      showToast('⚠️ Bạn phải xác nhận tất cả điều kiện chất lượng & ký nhận!');
      return;
    }
    
    setLoading(true);
    showToast('Đang gửi xác nhận hoàn tất giao hàng (POD)...');
    try {
      const res = await fetch(`${OUTBOUND_API}/outbound-orders/${selectedPodOrder.id}/confirm`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ confirmedBy: user?.name || 'Tài xế Võ Thanh Tùng' })
      });

      if (res.ok) {
        showToast('🎉 Giao hàng thành công! Đã cập nhật tồn kho & ví thu nhập.');
        setSelectedPodOrder(null);
        fetchOrders();
      } else {
        throw new Error('POD confirmation failed');
      }
    } catch (err) {
      console.error(err);
      showToast('❌ Lỗi khi xác nhận giao hàng');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPodModal = (order: any) => {
    setSelectedPodOrder(order);
    setChkTemp(true);
    setChkPack(true);
    setChkSign(true);
  };

  // -------------------------------------------------------------
  // RENDER FOR DRIVER
  // -------------------------------------------------------------
  if (isDriver) {
    const driverActiveOrders = orders.filter(o => o.status === 'SHIPPED');
    const driverHistoryOrders = orders.filter(o => o.status === 'CONFIRMED');
    const isTempStandard = driverTemp <= 4.0;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '1.5rem', background: '#f5f3ff', minHeight: '100vh' }}>
        {toastMessage && (
          <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, backgroundColor: '#7c3aed', color: '#fff', padding: '12px 20px', borderRadius: '10px', fontWeight: 600, boxShadow: '0 4px 12px rgba(124,58,237,0.25)' }}>
            {toastMessage}
          </div>
        )}

        {/* Welcome Banner */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff', padding: '1.25rem 1.5rem', borderRadius: '16px', border: '1px solid #e9d5ff', boxShadow: '0 4px 20px -2px rgba(124, 58, 237, 0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', backgroundColor: '#f3e8ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7c3aed' }}>
              <User size={24} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#1e1b4b' }}>
                Chào mừng trở lại, {user?.name || 'Tài xế Võ Thanh Tùng'}! 🚚
              </h2>
              <p style={{ color: '#6b21a8', fontSize: '0.85rem', marginTop: '2px', fontWeight: 600 }}>
                Nhân viên vận chuyển • Xe lạnh **TR-08 (59-P1 554.32)** • Tải trọng: **150 Kg**
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '10px', backgroundColor: isOnline ? '#ecfdf5' : '#fef2f2', border: `1px solid ${isOnline ? '#a7f3d0' : '#fecaca'}` }}>
              <Circle size={10} fill={isOnline ? '#10b981' : '#ef4444'} color={isOnline ? '#10b981' : '#ef4444'} />
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: isOnline ? '#065f46' : '#991b1b' }}>
                {isOnline ? 'ONLINE (Đang nhận đơn)' : 'OFFLINE'}
              </span>
            </div>
            <button
              onClick={() => setIsOnline(!isOnline)}
              className="btn btn-outline"
              style={{ borderRadius: '10px', fontWeight: 600, padding: '8px 14px', fontSize: '0.78rem', border: '1px solid #cbd5e1', cursor: 'pointer', backgroundColor: '#fff' }}
            >
              Đổi trạng thái
            </button>
            <button
              onClick={fetchOrders}
              className="btn btn-outline"
              style={{ borderRadius: '10px', fontWeight: 600, padding: '8px 14px', fontSize: '0.78rem', border: '1px solid #e9d5ff', cursor: 'pointer', backgroundColor: '#fff', color: '#7c3aed' }}
            >
              <RefreshCw size={14} /> Làm mới
            </button>
          </div>
        </div>

        {/* 2-Column Dashboard Header: IoT monitor & VRP horizontal route */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', gap: '1.5rem' }}>
          
          {/* IoT Container Temperature Monitor */}
          <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #cbd5e1', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.03)', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Cpu size={16} color="#7c3aed" /> Giám sát IoT Thùng Lạnh
              </span>
              <span style={{ fontSize: '#0.7rem', fontWeight: 700, color: '#94a3b8' }}>ID: #BLE-TR08</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', backgroundColor: isTempStandard ? '#f0fdf4' : '#fef2f2', padding: '12px', borderRadius: '12px', border: `1px solid ${isTempStandard ? '#bbf7d0' : '#fecaca'}` }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', backgroundColor: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                <Thermometer size={24} color={isTempStandard ? '#10b981' : '#ef4444'} />
              </div>
              <div>
                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: isTempStandard ? '#14532d' : '#7f1d1d' }}>
                  {driverTemp.toFixed(1)}°C
                </div>
                <div style={{ fontSize: '0.72rem', color: isTempStandard ? '#16a34a' : '#ef4444', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px' }}>
                  {isTempStandard ? <ShieldCheck size={12} /> : <AlertTriangle size={12} />}
                  {isTempStandard ? 'Đạt chuẩn bảo quản chuỗi lạnh' : 'Nhiệt độ cảnh báo vượt ngưỡng!'}
                </div>
              </div>
            </div>

            {/* Temp Simulator buttons */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => { setDriverTemp(2.3); showToast('❄️ Đã mô phỏng: Nhiệt độ kho mát chuẩn 2.3°C'); }}
                style={{ flex: 1, border: 'none', padding: '6px', fontSize: '0.7rem', fontWeight: 700, borderRadius: '6px', backgroundColor: '#e2e8f0', cursor: 'pointer', color: '#334155' }}
              >
                Simulate 2.3°C
              </button>
              <button
                onClick={() => { setDriverTemp(5.2); showToast('⚠️ Cảnh báo: Nhiệt độ tăng lên 5.2°C!'); }}
                style={{ flex: 1, border: 'none', padding: '6px', fontSize: '0.7rem', fontWeight: 700, borderRadius: '6px', backgroundColor: '#fef3c7', cursor: 'pointer', color: '#b45309' }}
              >
                Simulate 5.2°C
              </button>
            </div>
          </div>

          {/* VRP Horizontal Route map */}
          <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #cbd5e1', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.03)', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Route size={16} color="#7c3aed" /> Lộ trình giao hàng tối ưu (VRP)
            </span>

            {driverActiveOrders.length === 0 ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '0.8rem' }}>
                Chưa có lộ trình được phân công. Đang ở chế độ chờ.
              </div>
            ) : (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px', overflowX: 'auto', padding: '8px 0' }}>
                {/* Depot */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '90px' }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', backgroundColor: '#ef4444', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 900 }}>
                    DEP
                  </div>
                  <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#ef4444', marginTop: '4px', textAlign: 'center' }}>Kho Gò Vấp</span>
                </div>

                <div style={{ width: '40px', height: '2px', backgroundColor: '#e2e8f0' }}></div>

                {driverActiveOrders.map((ord, oIdx) => (
                  <React.Fragment key={ord.id}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '100px' }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', backgroundColor: '#7c3aed', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 900 }}>
                        {oIdx + 1}
                      </div>
                      <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#1e293b', marginTop: '4px', textAlign: 'center' }}>{ord.requesterName}</span>
                      <span style={{ fontSize: '0.58rem', color: '#64748b' }}>({ord.totalQuantity} Kg)</span>
                    </div>
                    <div style={{ width: '40px', height: '2px', backgroundColor: '#e2e8f0' }}></div>
                  </React.Fragment>
                ))}

                {/* Depot Return */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '90px' }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', backgroundColor: '#64748b', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 900 }}>
                    DEP
                  </div>
                  <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b', marginTop: '4px', textAlign: 'center' }}>Về Kho</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Dynamic VRP stats & history cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '1.5rem' }}>
          
          {/* Left Column: Active orders slips */}
          <div style={panelCardStyle()}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1e1b4b', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              📦 Đơn hàng cần giao ({driverActiveOrders.length})
            </h3>

            {driverActiveOrders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '5rem 1rem', color: '#94a3b8', fontSize: '0.85rem' }}>
                Không có đơn hàng nào cần giao lúc này. Chờ phân phối từ quản trị viên.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {driverActiveOrders.map((order, oIdx) => (
                  <div key={order.id} style={{ border: '1px solid #e2e8f0', borderRadius: '16px', padding: '1.25rem', background: '#fff', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                    
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px', marginBottom: '12px' }}>
                      <div>
                        <span style={{ fontSize: '0.68rem', fontWeight: 800, backgroundColor: '#f3e8ff', color: '#7c3aed', padding: '3px 8px', borderRadius: '6px', marginRight: '6px' }}>
                          Điểm dừng #{oIdx + 1}
                        </span>
                        <strong style={{ fontSize: '0.9rem', color: '#1e293b' }}>#{order.orderCode}</strong>
                      </div>
                      <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#ef4444' }}>
                        ⚖️ {order.totalQuantity} Kg (Hàng mát)
                      </span>
                    </div>

                    {/* Customer Info Card & Call / Navigate Actions */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <div>
                        <div style={{ fontSize: '0.95rem', fontWeight: 850, color: '#1e293b' }}>
                          {order.requesterName}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Phone size={12} /> {order.customerPhone || '0909 888 111'}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px', display: 'flex', alignItems: 'flex-start', gap: '4px' }}>
                          <MapPin size={14} style={{ color: '#7c3aed', flexShrink: 0, marginTop: '2px' }} />
                          <span>{order.destination}</span>
                        </div>
                      </div>

                      {/* Call and map quick actions */}
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <a href={`tel:${order.customerPhone || '0909888111'}`} style={{ width: 36, height: 36, borderRadius: '50%', backgroundColor: '#f3e8ff', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
                          <Phone size={16} />
                        </a>
                        <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.destination)}`} target="_blank" rel="noreferrer" style={{ width: 36, height: 36, borderRadius: '50%', backgroundColor: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
                          <Navigation size={16} />
                        </a>
                      </div>
                    </div>

                    {/* Items table */}
                    <div style={{ backgroundColor: '#f8fafc', padding: '10px 14px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '14px' }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Chi tiết giỏ hàng</div>
                      {order.items?.map((it: any, sIdx: number) => (
                        <div key={sIdx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#475569', paddingTop: '4px', paddingBottom: '4px', borderBottom: sIdx === order.items.length - 1 ? 'none' : '1px solid #f1f5f9' }}>
                          <span>📦 {it.productName || it.sku}</span>
                          <strong style={{ color: '#1e293b' }}>x{it.requestedQuantity}</strong>
                        </div>
                      ))}
                    </div>

                    {/* COD Info Badge */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: '10px', backgroundColor: order.totalQuantity % 2 === 0 ? '#fef2f2' : '#f0fdf4', border: `1px solid ${order.totalQuantity % 2 === 0 ? '#fee2e2' : '#d1fae5'}`, marginBottom: '14px' }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: order.totalQuantity % 2 === 0 ? '#991b1b' : '#065f46' }}>
                        {order.totalQuantity % 2 === 0 ? '💵 Thu hộ tiền mặt COD' : '💳 Đã thanh toán Online trước'}
                      </span>
                      <strong style={{ fontSize: '0.9rem', color: order.totalQuantity % 2 === 0 ? '#ef4444' : '#10b981' }}>
                        {order.totalQuantity % 2 === 0 ? '150.000 đ' : '0 đ'}
                      </strong>
                    </div>

                    {/* POD confirmation button */}
                    <button
                      onClick={() => handleOpenPodModal(order)}
                      className="btn btn-primary"
                      style={{ width: '100%', borderRadius: '10px', fontWeight: 800, padding: '12px', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', backgroundColor: '#7c3aed', color: '#fff', border: 'none', cursor: 'pointer', boxShadow: '0 4px 12px rgba(124,58,237,0.15)' }}
                    >
                      <CheckCircle2 size={16} /> Giao hàng thành công (Xác nhận POD)
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Completed history */}
          <div style={panelCardStyle()}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1e1b4b', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              📜 Lịch sử đơn đã giao ({driverHistoryOrders.length})
            </h3>

            {driverHistoryOrders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '4rem 1rem', color: '#94a3b8', fontSize: '0.82rem' }}>
                Chưa có đơn hoàn tất trong ca làm việc hôm nay.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '550px', overflowY: 'auto' }}>
                {driverHistoryOrders.map(order => (
                  <div key={order.id} style={{ padding: '12px', border: '1px solid #e9d5ff', borderRadius: '12px', background: '#fcfaff' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 850, fontSize: '0.78rem', color: '#7c3aed' }}>#{order.orderCode}</span>
                      <span style={{ fontSize: '0.68rem', fontWeight: 800, backgroundColor: '#d1fae5', color: '#065f46', padding: '2px 8px', borderRadius: '12px' }}>
                        Hoàn thành
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 750, color: '#1e293b' }}>
                      Khách: {order.requesterName}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
                      📍 {order.destination}
                    </div>
                    <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar size={12} /> Giao lúc: {new Date(order.confirmedAt || order.updatedAt).toLocaleTimeString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* POD Modal overlay popup */}
        {selectedPodOrder && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
            <div style={{ backgroundColor: '#fff', borderRadius: '20px', width: '90%', maxWidth: '480px', padding: '1.5rem', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', gap: '14px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
                <span style={{ fontWeight: 900, fontSize: '1.1rem', color: '#1e1b4b' }}>Xác nhận biên bản POD</span>
                <button onClick={() => setSelectedPodOrder(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={20} /></button>
              </div>

              <div>Đơn hàng: <strong style={{ color: '#7c3aed' }}>#{selectedPodOrder.orderCode}</strong></div>

              {/* POD Checklist */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Danh mục kiểm tra chất lượng</div>
                
                <div
                  onClick={() => setChkTemp(!chkTemp)}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                >
                  {chkTemp ? <CheckSquare size={20} color="#7c3aed" /> : <Square size={20} color="#cbd5e1" />}
                  <span style={{ fontSize: '0.8rem', color: '#334155' }}>Nhiệt độ thùng lạnh an toàn chuẩn 2.8°C</span>
                </div>

                <div
                  onClick={() => setChkPack(!chkPack)}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                >
                  {chkPack ? <CheckSquare size={20} color="#7c3aed" /> : <Square size={20} color="#cbd5e1" />}
                  <span style={{ fontSize: '0.8rem', color: '#334155' }}>Đóng gói nguyên vẹn, không dập nát thực phẩm</span>
                </div>

                <div
                  onClick={() => setChkSign(!chkSign)}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                >
                  {chkSign ? <CheckSquare size={20} color="#7c3aed" /> : <Square size={20} color="#cbd5e1" />}
                  <span style={{ fontSize: '0.8rem', color: '#334155' }}>Khách hàng ký nhận biên bản bàn giao</span>
                </div>
              </div>

              {/* Photo Evidence upload preview */}
              <div style={{ border: '1px dashed #cbd5e1', borderRadius: '12px', padding: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', backgroundColor: '#f8fafc' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#475569', fontSize: '0.78rem', fontWeight: 700 }}>
                  <Camera size={16} /> Ảnh bằng chứng giao hàng thành công
                </div>
                <img
                  src="https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&q=80"
                  alt="Grocery delivery POD proof"
                  style={{ width: '100%', height: '120px', borderRadius: '8px', objectFit: 'cover' }}
                />
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button
                  onClick={() => setSelectedPodOrder(null)}
                  style={{ flex: 1, border: '1px solid #cbd5e1', backgroundColor: '#fff', color: '#475569', padding: '10px', borderRadius: '10px', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}
                >
                  Hủy bỏ
                </button>
                <button
                  onClick={handleConfirmDeliverySubmit}
                  style={{ flex: 2, border: 'none', backgroundColor: '#7c3aed', color: '#fff', padding: '10px', borderRadius: '10px', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(124,58,237,0.2)' }}
                >
                  Xác nhận hoàn tất
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER FOR MANAGER (VRP SOLVER)
  // -------------------------------------------------------------
  const activeOrders = orders.filter(o => o.status === 'PENDING' || o.status === 'PICKING');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '1.5rem', background: '#f8fafc', minHeight: '100vh' }}>
      {toastMessage && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, backgroundColor: '#0f766e', color: '#fff', padding: '12px 20px', borderRadius: '10px', fontWeight: 600, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
          {toastMessage}
        </div>
      )}

      {/* Header section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff', padding: '1.25rem 1.5rem', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.04)' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
            🚚 Tối Ưu Tuyến Đường Đội Xe (VRP Solver)
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '4px' }}>
            Sử dụng thuật toán láng giềng gần nhất (Nearest-Neighbor VRP) phân phối tự động đơn hàng dựa trên tải trọng.
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={handleOptimizeVrp}
            disabled={loading || activeOrders.length === 0}
            className="btn btn-primary"
            style={{ borderRadius: '10px', fontWeight: 600, padding: '10px 16px', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: '#0f766e', color: '#fff', border: 'none', cursor: 'pointer', boxShadow: '0 4px 12px rgba(15,118,110,0.25)' }}
          >
            <Play size={16} /> Tối ưu tuyến (VRP)
          </button>
        </div>
      </div>

      {/* KPI Cards Section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem' }}>
        <div style={kpiCardStyle('#f0fdf4', '#16a34a')}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#16a34a', textTransform: 'uppercase' }}>Đơn hàng hoạt động</div>
          <div style={{ fontSize: '2rem', fontWeight: 900, color: '#0f172a', marginTop: '6px' }}>{activeOrders.length} đơn</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>Chờ gom và xếp tuyến</div>
        </div>

        <div style={kpiCardStyle('#eff6ff', '#2563eb')}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase' }}>Đội xe sẵn sàng</div>
          <div style={{ fontSize: '2rem', fontWeight: 900, color: '#0f172a', marginTop: '6px' }}>{drivers.filter(d => d.status === 'AVAILABLE').length}/{drivers.length} xe</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>Xe lạnh & thường</div>
        </div>

        <div style={kpiCardStyle('#fff7ed', '#ea580c')}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ea580c', textTransform: 'uppercase' }}>Tuyến tối ưu hóa</div>
          <div style={{ fontSize: '2rem', fontWeight: 900, color: '#0f172a', marginTop: '6px' }}>{vrpResult ? vrpResult.totalRoutes : 0} tuyến</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>Sau khi giải VRP</div>
        </div>

        <div style={kpiCardStyle('#faf5ff', '#7c3aed')}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase' }}>Tổng quãng đường</div>
          <div style={{ fontSize: '2rem', fontWeight: 900, color: '#0f172a', marginTop: '6px' }}>{vrpResult ? `${vrpResult.totalDistance} km` : '0 km'}</div>
          <div style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 600, marginTop: '4px' }}>{vrpResult ? '🔥 Tiết kiệm ~15% xăng' : 'Chưa tối ưu'}</div>
        </div>
      </div>

      {/* Main Contents layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1.2fr', gap: '1.5rem' }}>
        {/* Column 1: Drivers Fleet */}
        <div style={panelCardStyle()}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1e293b', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            👥 Đội Xe Vận Chuyển ({drivers.length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {drivers.map(drv => (
              <div key={drv.id} style={{ padding: '12px', border: '1px solid #e2e8f0', borderRadius: '10px', background: '#f8fafc' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#1e293b' }}>{drv.name}</span>
                  <span style={driverStatusBadgeStyle(drv.status)}>{drv.status}</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  Biển số: <strong>{drv.licensePlate}</strong> • Tải trọng: <strong>{drv.capacityKg} Kg</strong>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#0f766e', marginTop: '4px', fontWeight: 600 }}>
                  Loại xe: {drv.vehicleType === 'REFRIGERATED' ? '❄️ Lạnh (0-4°C)' : drv.vehicleType === 'FROZEN' ? '🧊 Đông (-18°C)' : '📦 Thường'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Column 2: Active Orders / Stops */}
        <div style={panelCardStyle()}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1e293b', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            📍 Điểm dừng chờ giao ({activeOrders.length})
          </h3>
          {activeOrders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#94a3b8', fontSize: '0.85rem' }}>
              Không có đơn hàng hoạt động nào.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '550px', overflowY: 'auto' }}>
              {activeOrders.map(o => (
                <div key={o.id} style={{ padding: '12px', border: '1px solid #e2e8f0', borderRadius: '10px', background: '#fff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 800, fontSize: '0.85rem', color: '#0f766e' }}>#{o.orderCode}</span>
                    <span style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 800 }}>
                      {o.totalQuantity || o.items?.reduce((acc: number, it: any) => acc + it.requestedQuantity, 0)} Kg
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>
                    {o.requesterName || o.customerName} - {o.customerPhone || '0909 888 999'}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
                    📍 {o.destination}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '4px' }}>
                    Tọa độ: {o.latitude?.toFixed(4)}, {o.longitude?.toFixed(4)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Column 3: VRP Routes Results */}
        <div style={panelCardStyle()}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1e293b', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            🗺️ Tuyến gom hàng VRP tối ưu
          </h3>
          {!vrpResult ? (
            <div style={{ textAlign: 'center', padding: '4rem 1rem', color: '#94a3b8', fontSize: '0.85rem' }}>
              Chưa chạy tối ưu hóa. Bấm "Tối ưu tuyến (VRP)" để hệ thống tính toán đường đi.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {vrpResult.routes.map((route, idx) => {
                const driver = route.assignedDriver;
                return (
                  <div key={route.routeId} style={{ border: '2px solid #0f766e', borderRadius: '12px', padding: '12px', background: '#f0fdfa', position: 'relative' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', borderBottom: '1px solid #ccfbf1', paddingBottom: '6px' }}>
                      <strong style={{ color: '#0f766e', fontSize: '0.9rem' }}>Tuyến #{idx + 1} ({route.routeId})</strong>
                      {driver ? (
                        <span style={{ fontSize: '0.75rem', fontWeight: 800, backgroundColor: '#ccfbf1', color: '#0f766e', padding: '2px 8px', borderRadius: '12px' }}>
                          🚚 Tài xế: {driver.name}
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.72rem', fontWeight: 800, backgroundColor: '#fee2e2', color: '#b91c1c', padding: '2px 8px', borderRadius: '12px' }}>
                          ⚠️ Chưa có tài xế phù hợp
                        </span>
                      )}
                    </div>

                    {driver && (
                      <div style={{ fontSize: '0.72rem', color: '#475569', marginBottom: '8px', backgroundColor: '#e6fffa', padding: '6px 10px', borderRadius: '8px', border: '1px dashed #7cd1c4' }}>
                        <div>Biển số: <strong>{driver.licensePlate}</strong> • Loại xe: <strong>{driver.vehicleType === 'REFRIGERATED' ? '❄️ Lạnh' : driver.vehicleType === 'FROZEN' ? '🧊 Đông' : '📦 Thường'}</strong></div>
                        <div style={{ marginTop: '2px' }}>Tải trọng xe: <strong>{driver.capacityKg} Kg</strong> • Hiệu suất: <strong style={{ color: '#0f766e' }}>{Math.round((route.totalDemand / driver.capacityKg) * 100)}%</strong></div>
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#475569', marginBottom: '10px' }}>
                      <span>Tổng hàng: <strong>{route.totalDemand} Kg</strong></span>
                      <span>Cự ly: <strong>{route.totalDistance.toFixed(1)} km</strong></span>
                    </div>

                    {/* Timeline stops */}
                    <div style={{ display: 'flex', flexDirection: 'column', position: 'relative', paddingLeft: '15px' }}>
                      <div style={{ position: 'absolute', left: '5px', top: '5px', bottom: '5px', width: '2px', backgroundColor: '#cbd5e1' }}></div>
                      {route.stops.map((stop: any, sIdx: number) => (
                        <div key={sIdx} style={{ fontSize: '0.75rem', marginBottom: sIdx === route.stops.length - 1 ? '0' : '6px', position: 'relative' }}>
                          <span style={{ position: 'absolute', left: '-14px', top: '3px', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: stop.id === 'depot' ? '#ef4444' : '#10b981', zIndex: 1 }}></span>
                          <span style={{ color: stop.id === 'depot' ? '#ef4444' : '#1e293b', fontWeight: stop.id === 'depot' ? '800' : '500' }}>
                            {stop.name} {stop.demand > 0 ? `(${stop.demand} Kg)` : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Styling helper functions
const kpiCardStyle = (bgColor: string, borderColor: string): React.CSSProperties => ({
  backgroundColor: bgColor,
  borderRadius: '16px',
  padding: '1.25rem',
  border: '1px solid #cbd5e1',
  borderTop: `4px solid ${borderColor}`,
  boxShadow: '0 4px 10px rgba(0,0,0,0.02)',
  display: 'flex',
  flexDirection: 'column'
});

const panelCardStyle = (): React.CSSProperties => ({
  background: '#ffffff',
  borderRadius: '16px',
  border: '1px solid #cbd5e1',
  boxShadow: '0 4px 20px -2px rgba(0,0,0,0.03)',
  padding: '1.25rem'
});

const driverStatusBadgeStyle = (status: DriverInfo['status']): React.CSSProperties => {
  const isAvail = status === 'AVAILABLE';
  const isTransit = status === 'IN_TRANSIT';
  return {
    fontSize: '0.65rem',
    fontWeight: 800,
    backgroundColor: isAvail ? '#d1fae5' : isTransit ? '#e0f2fe' : '#fee2e2',
    color: isAvail ? '#065f46' : isTransit ? '#0369a1' : '#991b1b',
    padding: '2px 8px',
    borderRadius: '12px'
  };
};

export default TransportOptimization;
