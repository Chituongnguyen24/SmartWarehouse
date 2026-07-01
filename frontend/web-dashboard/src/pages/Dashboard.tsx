import React, { useState, useEffect } from 'react';
import { Package, Boxes, ShieldAlert, TrendingDown, ArrowDownToLine, ArrowUpFromLine, AlertTriangle, Thermometer, Truck } from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';

const mockTrendData = [
  { name: 'T1', nhap: 4000, xuat: 2400, ton: 5000 },
  { name: 'T2', nhap: 3000, xuat: 1398, ton: 4000 },
  { name: 'T3', nhap: 2000, xuat: 3800, ton: 6000 },
  { name: 'T4', nhap: 2780, xuat: 3908, ton: 5500 },
  { name: 'T5', nhap: 1890, xuat: 4800, ton: 4500 },
  { name: 'T6', nhap: 2390, xuat: 3800, ton: 6500 },
  { name: 'T7', nhap: 3490, xuat: 4300, ton: 7000 },
];

const mockCategoryData = [
  { name: 'Rau củ quả', value: 28, color: '#10b981' },
  { name: 'Thịt cá', value: 22, color: '#3b82f6' },
  { name: 'Đông lạnh', value: 18, color: '#f59e0b' },
  { name: 'Sữa & đồ uống', value: 17, color: '#8b5cf6' },
  { name: 'Đồ khô', value: 15, color: '#ef4444' },
];

const Dashboard = () => {
  const { token, user } = useAuth();
  
  // Real stats
  const [totalProducts, setTotalProducts] = useState(0);
  const [totalLots, setTotalLots] = useState(0);
  const [alertCount, setAlertCount] = useState(0);
  const [urgentFefo, setUrgentFefo] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch Products
      const resProducts = await fetch('http://localhost:3004/products', { headers: { 'Authorization': `Bearer ${token}` }});
      if (resProducts.ok) {
        const products = await resProducts.json();
        setTotalProducts(products.length);
      }

      // Fetch Lots
      const resLots = await fetch('http://localhost:3008/inventory/lots', { headers: { 'Authorization': `Bearer ${token}` }});
      let lots = [];
      if (resLots.ok) {
        lots = await resLots.json();
        setTotalLots(lots.length);
      }

      // Compute Alerts & FEFO from lots
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
        if (fefoScore >= 60) {
          fefoList.push({ ...lot, fefoScore, daysLeft: Math.round(daysLeft) });
        }
      }
      
      setAlertCount(alerts);
      setUrgentFefo(fefoList.sort((a, b) => b.fefoScore - a.fefoScore).slice(0, 4));

    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-6)' }}>
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.25rem' }}>Tổng quan vận hành</h2>
          <p className="text-muted" style={{ fontSize: '0.875rem' }}>Xin chào {user?.email}, dưới đây là tổng quan tồn kho thời gian thực.</p>
        </div>
        <div className="flex items-center" style={{ gap: 'var(--spacing-3)' }}>
          <Link to="/inventory" className="btn btn-outline" style={{ textDecoration: 'none' }}>
            <ArrowDownToLine size={16} /> Quản lý Nhập/Xuất
          </Link>
          <Link to="/fefo" className="btn btn-primary" style={{ textDecoration: 'none' }}>
            <ArrowUpFromLine size={16} /> Phiếu FEFO
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--spacing-4)' }}>
        <div className="card">
          <div className="card-header">
            <div className="card-title">Tổng SKU (Danh mục)</div>
            <div className="card-icon primary"><Package size={18} /></div>
          </div>
          <div className="card-value">{totalProducts}</div>
          <div className="card-desc">sản phẩm trong hệ thống</div>
        </div>
        
        <div className="card">
          <div className="card-header">
            <div className="card-title">Lô hàng đang lưu trữ</div>
            <div className="card-icon primary"><Boxes size={18} /></div>
          </div>
          <div className="card-value">{totalLots}</div>
          <div className="card-desc">lô hàng tồn kho</div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">Cảnh báo đang mở</div>
            <div className="card-icon danger"><ShieldAlert size={18} /></div>
          </div>
          <div className="card-value text-danger">{alertCount}</div>
          <div className="card-desc">cần xử lý gấp (HSD/Hư hỏng)</div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">Khu vực lưu trữ</div>
            <div className="card-icon primary"><Thermometer size={18} /></div>
          </div>
          <div className="card-value">3</div>
          <div className="card-desc">Kho Mát - Đông Lạnh - Khô</div>
        </div>
      </div>

      {/* Action lists */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--spacing-4)' }}>
        <div className="card" style={{ padding: '0' }}>
          <div className="flex items-center justify-between" style={{ padding: 'var(--spacing-5) var(--spacing-5) var(--spacing-4)' }}>
            <div>
              <h3 className="font-semibold" style={{ fontSize: '1rem' }}>Ưu tiên xuất kho khẩn (FEFO thông minh)</h3>
              <p className="text-muted" style={{ fontSize: '0.75rem' }}>Các lô hàng có rủi ro cao hoặc sắp hết hạn cần xuất ngay</p>
            </div>
            <Link to="/fefo" className="text-primary font-semibold" style={{ fontSize: '0.875rem', textDecoration: 'none' }}>Xem tất cả →</Link>
          </div>
          
          <div style={{ padding: '0 var(--spacing-5) var(--spacing-5)' }}>
            {urgentFefo.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Kho đang an toàn, không có lô hàng nào sắp hết hạn.</div>
            ) : (
              urgentFefo.map((item, i) => (
                <div key={i} className="flex items-center" style={{ padding: 'var(--spacing-3)', border: '1px solid var(--color-danger-100)', borderRadius: 'var(--radius-md)', marginBottom: '0.5rem', backgroundColor: item.fefoScore >= 80 ? '#fef2f2' : '#fffbeb' }}>
                  <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-sm)', backgroundColor: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', color: item.fefoScore >= 80 ? 'var(--color-danger-500)' : 'var(--color-warning-500)', fontWeight: 600, marginRight: '1rem' }}>
                    #{i+1}
                  </div>
                  <div>
                    <div className="font-semibold flex items-center" style={{ gap: '0.5rem', fontSize: '0.875rem' }}>
                      {item.lotCode} <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>{item.zone}</span>
                    </div>
                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>Tồn: {item.remainingQty} - Vị trí: {item.location} - Còn {item.daysLeft} ngày</div>
                  </div>
                  <div style={{ marginLeft: 'auto' }}>
                    <span className={`badge ${item.fefoScore >= 80 ? 'badge-danger' : 'badge-warning'}`}>{item.fefoScore} điểm FEFO</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold" style={{ fontSize: '1rem' }}>Hoạt động hệ thống</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[
              { icon: <ArrowUpFromLine size={16}/>, color: 'primary', text: 'Quản lý FEFO đã được kích hoạt' },
              { icon: <Thermometer size={16}/>, color: 'success', text: 'Cảm biến kho lạnh hoạt động ổn định' },
              { icon: <Boxes size={16}/>, color: 'success', text: 'Sơ đồ kho đã được cập nhật' },
            ].map((activity, i) => (
              <div key={i} className="flex" style={{ gap: '0.75rem' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: `var(--color-${activity.color}-50)`, color: `var(--color-${activity.color}-600)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {activity.icon}
                </div>
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{activity.text}</div>
                  <div className="text-muted" style={{ fontSize: '0.75rem' }}>Hôm nay</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
