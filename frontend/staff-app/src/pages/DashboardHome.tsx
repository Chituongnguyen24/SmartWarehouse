import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Boxes,
  Download,
  PackageCheck,
  Search,
  ScanBarcode,
  Sparkles,
  MapPin,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Snowflake,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const DashboardHome: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div style={{ padding: '16px', paddingBottom: '90px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* Header Profile Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#0f172a',
          padding: '16px 18px',
          borderRadius: '20px',
          border: '1px solid #1e293b',
          boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              backgroundColor: '#0369a1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 900,
              fontSize: '16px',
              color: '#ffffff',
              border: '2px solid #38bdf8',
            }}
          >
            VK
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 900, color: '#ffffff' }}>
              {user?.name || 'Nhân Viên Kho Trực Ca'}
            </h2>
            <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <MapPin size={11} color="#38bdf8" /> {user?.warehouseName || 'Kho Siêu Thị Gò Vấp'}
            </p>
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: '10px', backgroundColor: '#064e3b', color: '#34d399', padding: '3px 8px', borderRadius: '999px', fontWeight: 800 }}>
            🟢 Ca 1
          </span>
          <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '3px' }}>06:00 - 14:00</div>
        </div>
      </div>

      {/* Quick Action Large Barcode Scanner Card */}
      <div
        onClick={() => navigate('/lookup')}
        style={{
          background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
          borderRadius: '20px',
          padding: '18px 20px',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          boxShadow: '0 10px 25px -5px rgba(2, 132, 199, 0.4)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '14px',
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ScanBarcode size={28} color="#ffffff" />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 900 }}>Quét Mã Vạch Tra Cứu Kho</h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '11.5px', opacity: 0.9 }}>
              Kiểm tra tồn thực tế & hạn dùng Lô FEFO &lt;100ms
            </p>
          </div>
        </div>
        <ChevronRight size={22} />
      </div>

      {/* Daily Shift Task Overview Grid */}
      <div>
        <div style={{ fontSize: '13px', fontWeight: 800, color: '#94a3b8', marginBottom: '10px' }}>
          ⚡ NHIỆM VỤ CA LÀM VIỆC HÔM NAY:
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
          
          {/* Card 1: Soạn hàng FEFO */}
          <div
            onClick={() => navigate('/picking')}
            style={{
              backgroundColor: '#0f172a',
              borderRadius: '16px',
              padding: '16px',
              border: '1px solid #1e293b',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: 'rgba(56, 189, 248, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Boxes size={20} color="#38bdf8" />
              </div>
              <span style={{ fontSize: '11px', backgroundColor: '#ef4444', color: '#fff', padding: '2px 8px', borderRadius: '999px', fontWeight: 900 }}>
                5 Đơn Gấp
              </span>
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 900, color: '#ffffff' }}>Soạn Hàng FEFO</div>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>Đợt sóng gom đơn TMĐT</div>
            </div>
          </div>

          {/* Card 2: Nhập kho QC */}
          <div
            onClick={() => navigate('/inbound')}
            style={{
              backgroundColor: '#0f172a',
              borderRadius: '16px',
              padding: '16px',
              border: '1px solid #1e293b',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: 'rgba(52, 211, 153, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Download size={20} color="#34d399" />
              </div>
              <span style={{ fontSize: '11px', backgroundColor: '#f59e0b', color: '#fff', padding: '2px 8px', borderRadius: '999px', fontWeight: 900 }}>
                2 Xe Đến
              </span>
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 900, color: '#ffffff' }}>Nhập Kho & QC</div>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>Kiểm định nhiệt độ lạnh</div>
            </div>
          </div>

          {/* Card 3: Đóng gói */}
          <div
            onClick={() => navigate('/packing')}
            style={{
              backgroundColor: '#0f172a',
              borderRadius: '16px',
              padding: '16px',
              border: '1px solid #1e293b',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: 'rgba(168, 85, 247, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <PackageCheck size={20} color="#c084fc" />
              </div>
              <span style={{ fontSize: '11px', backgroundColor: '#1e293b', color: '#cbd5e1', padding: '2px 8px', borderRadius: '999px', fontWeight: 800 }}>
                3 Kiện
              </span>
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 900, color: '#ffffff' }}>Đóng Gói Chuỗi Lạnh</div>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>Dán nhãn Shipping QR</div>
            </div>
          </div>

          {/* Card 4: Kiểm kê kệ */}
          <div
            onClick={() => navigate('/lookup')}
            style={{
              backgroundColor: '#0f172a',
              borderRadius: '16px',
              padding: '16px',
              border: '1px solid #1e293b',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: 'rgba(251, 146, 60, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Search size={20} color="#fb923c" />
              </div>
              <span style={{ fontSize: '11px', backgroundColor: '#064e3b', color: '#34d399', padding: '2px 8px', borderRadius: '999px', fontWeight: 800 }}>
                Kệ A1
              </span>
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 900, color: '#ffffff' }}>Kiểm Kê 1-Chạm</div>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>Đối soát thừa thiếu</div>
            </div>
          </div>

        </div>
      </div>

      {/* Real-time Cold Chain Warning Card */}
      <div
        style={{
          backgroundColor: '#0f172a',
          borderRadius: '18px',
          padding: '16px',
          border: '1px solid #334155',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            backgroundColor: 'rgba(56, 189, 248, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Snowflake size={22} color="#38bdf8" />
        </div>
        <div>
          <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#ffffff' }}>
            Nhiệt Độ Kho Lạnh Gò Vấp: <b style={{ color: '#34d399' }}>+2.4°C</b> (Chuẩn)
          </div>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
            Hầm đông: <b>-19.1°C</b> • Cảm biến IoT kết nối 100%
          </div>
        </div>
      </div>

    </div>
  );
};
