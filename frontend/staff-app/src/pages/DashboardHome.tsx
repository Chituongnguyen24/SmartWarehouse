import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Boxes,
  Download,
  PackageCheck,
  Search,
  ScanBarcode,
  MapPin,
  ChevronRight,
  Snowflake,
  LogOut,
  ShieldCheck,
  User,
  Clock,
  FileSpreadsheet,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { fetchOutboundOrders, fetchInboundOrdersApi } from '../services/api';
import { useStaffWebSocket } from '../context/WebSocketContext';
import { ShiftHandoverModal } from '../components/ShiftHandoverModal';
import { IncidentReportModal } from '../components/IncidentReportModal';

export const DashboardHome: React.FC = () => {
  const { user, activeWarehouse, logout } = useAuth();
  const navigate = useNavigate();
  const { lastEvent } = useStaffWebSocket();

  const effectiveWhCode = user?.warehouseCode || activeWarehouse || 'WH-006';

  const [pickingCount, setPickingCount] = useState<number>(0);
  const [packingCount, setPackingCount] = useState<number>(0);
  const [inboundCount, setInboundCount] = useState<number>(0);

  // Modals state
  const [isShiftModalOpen, setIsShiftModalOpen] = useState<boolean>(false);
  const [isIncidentModalOpen, setIsIncidentModalOpen] = useState<boolean>(false);

  const loadCounts = useCallback(async () => {
    try {
      const [outbounds, inbounds] = await Promise.all([
        fetchOutboundOrders(effectiveWhCode),
        fetchInboundOrdersApi(effectiveWhCode),
      ]);

      if (Array.isArray(outbounds)) {
        const isReadyOrDonePacking = (ord: any) => {
          const s = (ord.status || '').toUpperCase();
          if (['PICKED', 'PACKING', 'PACKED', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'COMPLETED', 'CANCELLED'].includes(s)) return true;
          if (localStorage.getItem(`citymart_order_ready_pack_${ord.id}`) === 'true') return true;
          if (localStorage.getItem(`citymart_order_ready_pack_${ord.orderCode}`) === 'true') return true;
          if (Array.isArray(ord.items) && ord.items.length > 0) {
            const allPicked = ord.items.every((it: any) => {
              const cachedPicked = localStorage.getItem(`citymart_picked_qty_${it.id}`) || localStorage.getItem(`citymart_picked_qty_${ord.orderCode}_${it.sku}`);
              const cur = Number(it.pickedQuantity > 0 ? it.pickedQuantity : (cachedPicked ? Number(cachedPicked) : 0));
              const exactQty = Number((it as any).requestedQuantity !== undefined ? (it as any).requestedQuantity : it.quantity || 1);
              return cur >= exactQty && exactQty > 0;
            });
            if (allPicked) return true;
          }
          return false;
        };

        const isPackingCompleted = (ord: any) => {
          const s = (ord.status || '').toUpperCase();
          if (['PACKED', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'COMPLETED', 'CANCELLED'].includes(s)) return true;
          if (localStorage.getItem(`citymart_order_packed_${ord.id}`) === 'true') return true;
          if (localStorage.getItem(`citymart_order_packed_${ord.orderCode}`) === 'true') return true;
          return false;
        };

        const pCount = outbounds.filter(o => 
          (o.status === 'PENDING' || o.status === 'PICKING') && !isReadyOrDonePacking(o)
        ).length;

        const pkCount = outbounds.filter(o => 
          isReadyOrDonePacking(o) && !isPackingCompleted(o)
        ).length;

        setPickingCount(pCount);
        setPackingCount(pkCount);
      }

      if (Array.isArray(inbounds)) {
        const inbPending = inbounds.filter((i: any) => i.status !== 'STORED' && i.status !== 'COMPLETED' && i.status !== 'CANCELLED').length;
        setInboundCount(inbPending);
      }
    } catch (e) {
      console.warn('Failed to load dashboard counts:', e);
    }
  }, [effectiveWhCode]);

  useEffect(() => {
    loadCounts();
    const interval = setInterval(loadCounts, 2500);
    const onRefreshEvent = () => loadCounts();
    window.addEventListener('staff_badge_refresh', onRefreshEvent);
    window.addEventListener('storage', onRefreshEvent);
    return () => {
      clearInterval(interval);
      window.removeEventListener('staff_badge_refresh', onRefreshEvent);
      window.removeEventListener('storage', onRefreshEvent);
    };
  }, [loadCounts]);

  useEffect(() => {
    if (lastEvent) {
      loadCounts();
    }
  }, [lastEvent, loadCounts]);

  // Generate initials
  const cleanName = (user?.name || '').replace(/\([^)]*\)/g, '').trim();
  const initials = cleanName
    ? cleanName
        .split(/\s+/)
        .filter(Boolean)
        .map(w => w[0])
        .slice(-2)
        .join('')
        .toUpperCase()
    : 'NV';

  const rawWhName = user?.warehouseName || 'Kho Gò Vấp';
  const cleanWhName = rawWhName.replace(/\s*\([^)]*\)\s*$/, '');

  return (
    <div style={{ padding: '16px', paddingBottom: '90px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* Header Profile Bar - Light Theme */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          backgroundColor: '#ffffff',
          padding: '18px 20px',
          borderRadius: '20px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '8px',
                backgroundColor: '#008848',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '15px',
                color: '#ffffff',
              }}
            >
              {initials}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 900, color: '#0f172a' }}>
                  {user?.name || 'Nhân Viên Trực Kho'}
                </h2>
                {user?.code && (
                  <span style={{ fontSize: '10px', backgroundColor: '#f0fdf4', color: '#008848', padding: '2px 7px', borderRadius: '6px', fontWeight: 800, border: '1px solid #bbf7d0' }}>
                    {user.code}
                  </span>
                )}
              </div>
              <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                <span style={{ color: '#059669', fontWeight: 700 }}>
                  {user?.role === 'WAREHOUSE_STAFF' ? 'Nhân Viên Vận Hành Kho' : user?.role || 'Nhân Viên Kho'}
                </span>
                {user?.assignedZone && ` • ${user.assignedZone}`}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              if (window.confirm('Bạn có chắc muốn đăng xuất khỏi ca làm việc?')) {
                logout();
              }
            }}
            title="Đăng xuất"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '38px',
              height: '38px',
              backgroundColor: '#fee2e2',
              border: '1px solid #fecaca',
              borderRadius: '12px',
              color: '#dc2626',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <LogOut size={17} />
          </button>
        </div>

        {/* Warehouse Locking & Shift Info Sub-bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#f8fafc',
            padding: '10px 14px',
            borderRadius: '14px',
            border: '1px solid #e2e8f0',
            fontSize: '11.5px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#0369a1', fontWeight: 600 }}>
            <MapPin size={14} color="#0284c7" />
            <span>Kho trực thuộc: <b>{cleanWhName} ({user?.warehouseCode || 'WH-006'})</b></span>
          </div>

          <button
            onClick={() => setIsShiftModalOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              backgroundColor: '#ecfdf5',
              border: '1px solid #a7f3d0',
              borderRadius: '8px',
              padding: '4px 8px',
              color: '#059669',
              fontWeight: 600,
              fontSize: '11px',
              cursor: 'pointer',
            }}
          >
            <Clock size={12} color="#059669" />
            <span>{user?.shift || 'Ca 1 (06:00 - 14:00)'}</span>
            <ChevronRight size={12} />
          </button>
        </div>
      </div>

      {/* Quick Action Large Barcode Scanner & 3D Twin Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
        <div
          onClick={() => navigate('/lookup')}
          style={{
            backgroundColor: '#008848',
            borderRadius: '8px',
            padding: '16px 14px',
            color: '#ffffff',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            cursor: 'pointer',
            minHeight: '110px',
          }}
        >
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '6px',
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ScanBarcode size={22} color="#ffffff" />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700 }}>Quét mã tra cứu</h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '11px', opacity: 0.9 }}>
              Kiểm tra tồn kho & vị trí kệ
            </p>
          </div>
        </div>

        <div
          onClick={() => navigate('/lookup?view=3d')}
          style={{
            backgroundColor: '#0284c7',
            borderRadius: '8px',
            padding: '16px 14px',
            color: '#ffffff',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            cursor: 'pointer',
            minHeight: '110px',
          }}
        >
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '6px',
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Boxes size={22} color="#ffffff" />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700 }}>Sơ Đồ Kho 3D</h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '11px', opacity: 0.9 }}>
              Xem vị trí kệ & hàng hóa
            </p>
          </div>
        </div>
      </div>

      {/* Daily Shift Task Overview Grid */}
      <div>
        <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
          CHỨC NĂNG VẬN HÀNH KHO:
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
          
          {/* Card 1: Soạn hàng */}
          <div
            onClick={() => navigate('/picking')}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '18px',
              padding: '18px 16px',
              border: '1.5px solid #e2e8f0',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: '100px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
              transition: 'all 0.15s ease',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '12px', backgroundColor: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Boxes size={24} color="#0284c7" />
              </div>
              {pickingCount > 0 && (
                <span style={{ fontSize: '11px', backgroundColor: '#0284c7', color: '#fff', padding: '3px 9px', borderRadius: '999px', fontWeight: 900 }}>
                  {pickingCount} đơn
                </span>
              )}
            </div>
            <div>
              <div style={{ fontSize: '16px', fontWeight: 900, color: '#0f172a', marginTop: '12px' }}>Soạn hàng</div>
              <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>Theo lộ trình kệ tối ưu</div>
            </div>
          </div>

          {/* Card 2: Đóng gói */}
          <div
            onClick={() => navigate('/packing')}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '18px',
              padding: '18px 16px',
              border: '1.5px solid #e2e8f0',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: '100px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
              transition: 'all 0.15s ease',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '12px', backgroundColor: '#f3e8ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <PackageCheck size={24} color="#9333ea" />
              </div>
              {packingCount > 0 && (
                <span style={{ fontSize: '11px', backgroundColor: '#9333ea', color: '#fff', padding: '3px 9px', borderRadius: '999px', fontWeight: 900 }}>
                  {packingCount} đơn
                </span>
              )}
            </div>
            <div>
              <div style={{ fontSize: '16px', fontWeight: 900, color: '#0f172a', marginTop: '12px' }}>Đóng gói</div>
              <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>Niêm phong & dán tem</div>
            </div>
          </div>

          {/* Card 3: Kiểm kê */}
          <div
            onClick={() => navigate('/lookup')}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '18px',
              padding: '18px 16px',
              border: '1.5px solid #e2e8f0',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: '100px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
              transition: 'all 0.15s ease',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '12px', backgroundColor: '#ffedd5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Search size={24} color="#ea580c" />
              </div>
            </div>
            <div>
              <div style={{ fontSize: '16px', fontWeight: 900, color: '#0f172a', marginTop: '12px' }}>Kiểm kê</div>
              <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>Tra cứu tồn kho & hạn dùng</div>
            </div>
          </div>

          {/* Card 4: Nhập kho */}
          <div
            onClick={() => navigate('/inbound')}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '18px',
              padding: '18px 16px',
              border: '1.5px solid #e2e8f0',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: '100px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
              transition: 'all 0.15s ease',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '12px', backgroundColor: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Download size={24} color="#16a34a" />
              </div>
              {inboundCount > 0 && (
                <span style={{ fontSize: '11px', backgroundColor: '#16a34a', color: '#fff', padding: '3px 9px', borderRadius: '999px', fontWeight: 900 }}>
                  {inboundCount} phiếu
                </span>
              )}
            </div>
            <div>
              <div style={{ fontSize: '16px', fontWeight: 900, color: '#0f172a', marginTop: '12px' }}>Nhập kho</div>
              <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>Kiểm tra & xếp kệ mới</div>
            </div>
          </div>

        </div>
      </div>

      {/* Shift Handover & Incident Management Section */}
      <div>
        <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
          QUẢN LÝ CA TRỰC & AN TOÀN KHO:
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
          {/* Action 1: Giao Ca Trực */}
          <div
            onClick={() => setIsShiftModalOpen(true)}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              padding: '16px 14px',
              border: '1px solid #a7f3d0',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '8px',
                backgroundColor: '#008848',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                flexShrink: 0,
              }}
            >
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>Giao ca trực</div>
              <div style={{ fontSize: '11px', color: '#059669', fontWeight: 600, marginTop: '2px' }}>Tổng kết KPI ca</div>
            </div>
          </div>

          {/* Action 2: Báo Cáo Sự Cố */}
          <div
            onClick={() => setIsIncidentModalOpen(true)}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              padding: '16px 14px',
              border: '1px solid #fed7aa',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '8px',
                backgroundColor: '#ea580c',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                flexShrink: 0,
              }}
            >
              <AlertTriangle size={20} />
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>Báo sự cố</div>
              <div style={{ fontSize: '11px', color: '#ea580c', fontWeight: 700, marginTop: '2px' }}>Nhiệt độ / Rách hỏng</div>
            </div>
          </div>
        </div>
      </div>

      {/* Real-time Cold Chain Warning Card */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '18px',
          padding: '16px 18px',
          border: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.03)',
        }}
      >
        <div
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            backgroundColor: '#e0f2fe',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Snowflake size={22} color="#0284c7" />
        </div>
        <div>
          <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
            Nhiệt Độ Kho Lạnh: <b style={{ color: '#059669' }}>+2.4°C (Đạt chuẩn)</b>
          </div>
          <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
            Hầm đông: <b>-19.1°C</b> • Cảm biến nhiệt độ kết nối ổn định
          </div>
        </div>
      </div>

      {/* Modals */}
      <ShiftHandoverModal
        isOpen={isShiftModalOpen}
        onClose={() => setIsShiftModalOpen(false)}
        onSuccess={() => loadCounts()}
      />

      <IncidentReportModal
        isOpen={isIncidentModalOpen}
        onClose={() => setIsIncidentModalOpen(false)}
      />

    </div>
  );
};
