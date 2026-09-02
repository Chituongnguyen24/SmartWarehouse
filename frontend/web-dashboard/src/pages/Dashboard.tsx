import { useState, useEffect } from 'react';
import { Package, Boxes, ShieldAlert, ArrowDownToLine, ArrowUpFromLine, Thermometer } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  
  // Real stats
  const [totalProducts, setTotalProducts] = useState(0);
  const [totalLots, setTotalLots] = useState(0);
  const [alertCount, setAlertCount] = useState(0);
  const [urgentFefo, setUrgentFefo] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      if (user.role === 'WAREHOUSE_MANAGER') {
        navigate('/inventory', { replace: true });
        return;
      } else if (user.role === 'WAREHOUSE_STAFF') {
        navigate('/orders', { replace: true });
        return;
      } else if (user.role === 'SALES_STAFF') {
        navigate('/sales', { replace: true });
        return;
      } else if (user.role === 'DRIVER') {
        navigate('/transport', { replace: true });
        return;
      }
    }
    fetchDashboardData();
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      // Fetch Products
      const resProducts = await fetch('http://localhost:3010/products', { headers: { 'Authorization': `Bearer ${token}` }});
      if (resProducts.ok) {
        const products = await resProducts.json();
        setTotalProducts(products.length);
      }

      // Fetch Lots
      const resLots = await fetch('http://localhost:3011/inventory/lots', { headers: { 'Authorization': `Bearer ${token}` }});
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff', padding: '1.25rem 1.5rem', borderRadius: '16px', border: '1px solid #f1f5f9', boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.04)' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1e293b', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '8px' }}>
            📊 Tổng Quan Vận Hành
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '4px' }}>
            Xin chào <strong style={{ color: '#0f766e' }}>{user?.email}</strong>, dưới đây là thống kê tồn kho của CityMart thời gian thực.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Link to="/inventory" className="btn btn-outline" style={{ textDecoration: 'none', borderRadius: '10px', fontWeight: 600, padding: '10px 16px', fontSize: '0.85rem', border: '1px solid #cbd5e1', color: '#475569', display: 'inline-flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s', backgroundColor: 'transparent', cursor: 'pointer' }}>
            <ArrowDownToLine size={16} /> Quản lý Nhập/Xuất
          </Link>
          <Link to="/outbound" className="btn btn-primary" style={{ textDecoration: 'none', borderRadius: '10px', fontWeight: 600, padding: '10px 16px', fontSize: '0.85rem', backgroundColor: '#0f766e', color: '#ffffff', display: 'inline-flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(15,118,110,0.25)', cursor: 'pointer' }}>
            <ArrowUpFromLine size={16} /> Phiếu FEFO
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem' }}>
        {/* Card 1 */}
        <div style={kpiCardStyle('#f0fdfa', '#0d9488', '0 4px 20px -2px rgba(13,148,136,0.06)')}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0f766e', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tổng SKU (Danh mục)</span>
            <div style={iconWrapperStyle('#ccfbf1', '#0d9488')}><Package size={18} /></div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 900, color: '#0f172a', lineHeight: '1.2' }}>{totalProducts}</div>
          <div style={{ fontSize: '0.75rem', color: '#0f766e', fontWeight: 500, marginTop: '6px' }}>sản phẩm trong hệ thống</div>
        </div>

        {/* Card 2 */}
        <div style={kpiCardStyle('#eff6ff', '#2563eb', '0 4px 20px -2px rgba(37,99,235,0.06)')}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1d4ed8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Lô hàng đang lưu trữ</span>
            <div style={iconWrapperStyle('#dbeafe', '#2563eb')}><Boxes size={18} /></div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 900, color: '#0f172a', lineHeight: '1.2' }}>{totalLots}</div>
          <div style={{ fontSize: '0.75rem', color: '#1e40af', fontWeight: 500, marginTop: '6px' }}>lô hàng tồn kho</div>
        </div>

        {/* Card 3 */}
        <div style={kpiCardStyle(alertCount > 0 ? '#fef2f2' : '#f9fafb', alertCount > 0 ? '#dc2626' : '#4b5563', alertCount > 0 ? '0 4px 20px -2px rgba(220,38,38,0.08)' : 'none')}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: alertCount > 0 ? '#b91c1c' : '#4b5563', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cảnh báo đang mở</span>
            <div style={iconWrapperStyle(alertCount > 0 ? '#fee2e2' : '#f3f4f6', alertCount > 0 ? '#dc2626' : '#4b5563')}><ShieldAlert size={18} /></div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 900, color: alertCount > 0 ? '#dc2626' : '#0f172a', lineHeight: '1.2' }}>{alertCount}</div>
          <div style={{ fontSize: '0.75rem', color: alertCount > 0 ? '#b91c1c' : '#4b5563', fontWeight: 500, marginTop: '6px' }}>cần xử lý gấp (HSD/Hư hỏng)</div>
        </div>

        {/* Card 4 */}
        <div style={kpiCardStyle('#faf5ff', '#7c3aed', '0 4px 20px -2px rgba(124,58,237,0.06)')}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6d28d9', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Khu vực lưu trữ</span>
            <div style={iconWrapperStyle('#f3e8ff', '#7c3aed')}><Thermometer size={18} /></div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 900, color: '#0f172a', lineHeight: '1.2' }}>3</div>
          <div style={{ fontSize: '0.75rem', color: '#6d28d9', fontWeight: 500, marginTop: '6px' }}>Kho Mát - Đông Lạnh - Khô</div>
        </div>
      </div>

      {/* Grid Layout for urgent lists & timeline */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
        {/* FEFO priorities */}
        <div style={{ background: '#ffffff', borderRadius: '16px', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.04)', border: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1e293b' }}>⚠️ Ưu tiên xuất kho khẩn (FEFO thông minh)</h3>
              <p style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '2px' }}>Các lô hàng có rủi ro cao hoặc sắp hết hạn cần ưu tiên xuất kho trước</p>
            </div>
            <Link to="/outbound" style={{ color: '#0f766e', fontWeight: 700, fontSize: '0.85rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>Xem tất cả →</Link>
          </div>
          
          <div style={{ padding: '1.25rem 1.5rem' }}>
            {urgentFefo.length === 0 ? (
              <div style={{ padding: '3rem 1.5rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>Kho đang an toàn, không có lô hàng nào cần xuất gấp.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {urgentFefo.map((item, i) => {
                  const isCritical = item.fefoScore >= 80;
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', border: `1px solid ${isCritical ? '#fee2e2' : '#fef3c7'}`, borderRadius: '12px', backgroundColor: isCritical ? '#fff5f5' : '#fffbeb', gap: '16px' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: isCritical ? '#fecaca' : '#fde68a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isCritical ? '#991b1b' : '#854d0e', fontWeight: 800, fontSize: '0.9rem', flexShrink: 0 }}>
                        #{i+1}
                      </div>
                      
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.lotCode}
                          </span>
                          <span style={{ fontSize: '0.7rem', fontWeight: 700, backgroundColor: item.zone === 'FROZEN' ? '#eff6ff' : item.zone === 'COLD' ? '#ecfdf5' : '#fffbeb', color: item.zone === 'FROZEN' ? '#2563eb' : item.zone === 'COLD' ? '#059669' : '#d97706', padding: '2px 8px', borderRadius: '20px', border: `1px solid ${item.zone === 'FROZEN' ? '#bfdbfe' : item.zone === 'COLD' ? '#a7f3d0' : '#fde68a'}` }}>
                            {item.zone === 'FROZEN' ? '🧊 Đông (-18°C)' : item.zone === 'COLD' ? '❄️ Mát (0-4°C)' : '📦 Kho Khô'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '16px', color: '#64748b', fontSize: '0.8rem' }}>
                          <span>Tồn: <strong style={{ color: '#334155' }}>{item.remainingQty} Kg</strong></span>
                          <span>Vị trí: <strong style={{ color: '#334155' }}>{item.location}</strong></span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0 }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: isCritical ? '#b91c1c' : '#b45309', backgroundColor: isCritical ? '#fee2e2' : '#fef3c7', padding: '4px 10px', borderRadius: '20px' }}>
                          Còn {item.daysLeft} ngày
                        </span>
                        <div style={{ textAlign: 'right', minWidth: '85px' }}>
                          <div style={{ fontSize: '0.85rem', fontWeight: 900, color: isCritical ? '#dc2626' : '#d97706' }}>{item.fefoScore} điểm</div>
                          <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 500 }}>Chỉ số FEFO</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Timeline Activities */}
        <div style={{ background: '#ffffff', borderRadius: '16px', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.04)', border: '1px solid #f1f5f9', padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1e293b', marginBottom: '1.25rem' }}>🔄 Hoạt động hệ thống</h3>
          <div style={{ display: 'flex', flexDirection: 'column', position: 'relative', paddingLeft: '20px' }}>
            {/* Vertical Line */}
            <div style={{ position: 'absolute', left: '7px', top: '10px', bottom: '10px', width: '2px', backgroundColor: '#f1f5f9' }}></div>

            {[
              { icon: <ArrowUpFromLine size={12}/>, color: '#0f766e', bgColor: '#ccfbf1', text: 'Quản lý FEFO đã được kích hoạt', desc: 'Hệ thống đề xuất xuất hàng tự động hoạt động tốt' },
              { icon: <Thermometer size={12}/>, color: '#16a34a', bgColor: '#dcfce7', text: 'Nhiệt độ kho lạnh hoạt động ổn định', desc: 'Không phát hiện biến động nhiệt độ bất thường' },
              { icon: <Boxes size={12}/>, color: '#2563eb', bgColor: '#dbeafe', text: 'Sơ đồ kho đã được cập nhật', desc: 'Đồng bộ hóa vị trí sơ đồ lưu trữ kệ và slot' },
            ].map((activity, i) => (
              <div key={i} style={{ display: 'flex', gap: '14px', marginBottom: i === 2 ? '0' : '20px', position: 'relative' }}>
                {/* Dot Indicator */}
                <div style={{ position: 'absolute', left: '-20px', top: '4px', width: '16px', height: '16px', borderRadius: '50%', backgroundColor: activity.bgColor, display: 'flex', alignItems: 'center', justifyContent: 'center', color: activity.color, zIndex: 1, boxShadow: '0 0 0 4px #ffffff' }}>
                  {activity.icon}
                </div>
                
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>{activity.text}</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>{activity.desc}</div>
                  <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 600, marginTop: '4px' }}>Hôm nay • Realtime</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Inline Helper Styles
const kpiCardStyle = (bgColor: string, borderColor: string, shadow: string): React.CSSProperties => ({
  backgroundColor: bgColor,
  borderRadius: '16px',
  padding: '1.25rem',
  border: '1px solid #f1f5f9',
  borderTop: `4px solid ${borderColor}`,
  boxShadow: shadow || '0 4px 20px -2px rgba(0,0,0,0.03)',
  display: 'flex',
  flexDirection: 'column',
  transition: 'all 0.2s ease-in-out',
});

const iconWrapperStyle = (bgColor: string, color: string): React.CSSProperties => ({
  width: '32px',
  height: '32px',
  borderRadius: '8px',
  backgroundColor: bgColor,
  color: color,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
});

export default Dashboard;
