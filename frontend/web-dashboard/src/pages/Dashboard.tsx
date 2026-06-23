import React from 'react';
import { Package, Boxes, ShieldAlert, TrendingDown, ArrowDownToLine, ArrowUpFromLine, AlertTriangle, Thermometer, Truck } from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';

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
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-6)' }}>
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.25rem' }}>Tổng quan vận hành</h2>
          <p className="text-muted" style={{ fontSize: '0.875rem' }}>Theo dõi tồn kho, điều kiện bảo quản và cảnh báo AI theo thời gian thực — siêu thị FreshKeep.</p>
        </div>
        <div className="flex items-center" style={{ gap: 'var(--spacing-3)' }}>
          <button className="btn btn-outline">
            <ArrowDownToLine size={16} /> Nhập kho
          </button>
          <button className="btn btn-primary">
            <ArrowUpFromLine size={16} /> Xuất kho
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--spacing-4)' }}>
        <div className="card">
          <div className="card-header">
            <div className="card-title">Tổng SKU đang quản lý</div>
            <div className="card-icon primary"><Package size={18} /></div>
          </div>
          <div className="card-value">
            1.284 <span className="card-trend up" style={{ fontSize: '0.875rem' }}><ArrowUpFromLine size={14}/> +32</span>
          </div>
          <div className="card-desc">so với tháng trước</div>
        </div>
        
        <div className="card">
          <div className="card-header">
            <div className="card-title">Lô hàng trong kho</div>
            <div className="card-icon primary"><Boxes size={18} /></div>
          </div>
          <div className="card-value">
            3.892 <span className="card-trend up" style={{ fontSize: '0.875rem' }}><ArrowUpFromLine size={14}/> +118</span>
          </div>
          <div className="card-desc">đang lưu trữ</div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">Cảnh báo đang mở</div>
            <div className="card-icon danger"><ShieldAlert size={18} /></div>
          </div>
          <div className="card-value">
            7 <span className="card-trend down" style={{ fontSize: '0.875rem' }}><TrendingDown size={14}/> +3</span>
          </div>
          <div className="card-desc">cần xử lý</div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">Tỷ lệ thất thoát</div>
            <div className="card-icon primary"><TrendingDown size={18} /></div>
          </div>
          <div className="card-value">
            1,8% <span className="card-trend up" style={{ fontSize: '0.875rem' }}><TrendingDown size={14}/> -0,6%</span>
          </div>
          <div className="card-desc">30 ngày qua</div>
        </div>
      </div>

      {/* Zone Capacities */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--spacing-4)' }}>
        {/* Cold Zone */}
        <div className="card" style={{ padding: 'var(--spacing-5)' }}>
          <div className="flex items-center justify-between" style={{ marginBottom: '0.5rem' }}>
            <h3 className="font-semibold text-lg">Kho lạnh</h3>
            <span className="badge badge-success">Bình thường</span>
          </div>
          <p className="text-muted" style={{ fontSize: '0.75rem', marginBottom: '1rem' }}>Rau củ, sữa, thực phẩm tươi sống</p>
          
          <div className="flex" style={{ gap: 'var(--spacing-2)', marginBottom: '1.5rem' }}>
            <div style={{ flex: 1, backgroundColor: 'var(--color-neutral-50)', padding: '0.5rem', borderRadius: 'var(--radius-md)' }}>
              <div className="text-muted" style={{ fontSize: '0.65rem', display: 'flex', alignItems: 'center', gap: '4px' }}><Thermometer size={12}/> Nhiệt độ</div>
              <div className="font-semibold" style={{ fontSize: '1.125rem' }}>4.2°C</div>
              <div className="text-muted" style={{ fontSize: '0.65rem' }}>Ngưỡng 2-6°C</div>
            </div>
            <div style={{ flex: 1, backgroundColor: 'var(--color-neutral-50)', padding: '0.5rem', borderRadius: 'var(--radius-md)' }}>
              <div className="text-muted" style={{ fontSize: '0.65rem', display: 'flex', alignItems: 'center', gap: '4px' }}> Độ ẩm</div>
              <div className="font-semibold" style={{ fontSize: '1.125rem' }}>82%</div>
              <div className="text-muted" style={{ fontSize: '0.65rem' }}>Ngưỡng 80-90%</div>
            </div>
          </div>
          
          <div className="progress-container">
            <div className="progress-stats">
              <span>Sức chứa đã dùng</span>
              <span className="font-semibold">864/1200 (72%)</span>
            </div>
            <div className="progress-bar-bg">
              <div className="progress-bar-fill success" style={{ width: '72%' }}></div>
            </div>
          </div>
        </div>

        {/* Frozen Zone */}
        <div className="card" style={{ padding: 'var(--spacing-5)' }}>
          <div className="flex items-center justify-between" style={{ marginBottom: '0.5rem' }}>
            <h3 className="font-semibold text-lg">Kho đông lạnh</h3>
            <span className="badge badge-warning">Cảnh báo</span>
          </div>
          <p className="text-muted" style={{ fontSize: '0.75rem', marginBottom: '1rem' }}>Thịt, cá, hải sản đông lạnh</p>
          
          <div className="flex" style={{ gap: 'var(--spacing-2)', marginBottom: '1.5rem' }}>
            <div style={{ flex: 1, backgroundColor: 'var(--color-danger-50)', padding: '0.5rem', borderRadius: 'var(--radius-md)' }}>
              <div className="text-muted" style={{ fontSize: '0.65rem', display: 'flex', alignItems: 'center', gap: '4px' }}><Thermometer size={12}/> Nhiệt độ</div>
              <div className="font-semibold text-danger" style={{ fontSize: '1.125rem' }}>-18.6°C</div>
              <div className="text-muted" style={{ fontSize: '0.65rem' }}>Ngưỡng -22~-16°C</div>
            </div>
            <div style={{ flex: 1, backgroundColor: 'var(--color-neutral-50)', padding: '0.5rem', borderRadius: 'var(--radius-md)' }}>
              <div className="text-muted" style={{ fontSize: '0.65rem', display: 'flex', alignItems: 'center', gap: '4px' }}> Độ ẩm</div>
              <div className="font-semibold" style={{ fontSize: '1.125rem' }}>65%</div>
              <div className="text-muted" style={{ fontSize: '0.65rem' }}>Ngưỡng 55-70%</div>
            </div>
          </div>
          
          <div className="progress-container">
            <div className="progress-stats">
              <span>Sức chứa đã dùng</span>
              <span className="font-semibold">712/800 (89%)</span>
            </div>
            <div className="progress-bar-bg">
              <div className="progress-bar-fill warning" style={{ width: '89%' }}></div>
            </div>
          </div>
        </div>

        {/* Dry Zone */}
        <div className="card" style={{ padding: 'var(--spacing-5)' }}>
          <div className="flex items-center justify-between" style={{ marginBottom: '0.5rem' }}>
            <h3 className="font-semibold text-lg">Kho khô</h3>
            <span className="badge badge-success">Bình thường</span>
          </div>
          <p className="text-muted" style={{ fontSize: '0.75rem', marginBottom: '1rem' }}>Đồ hộp, mì gói, nước uống, gia vị</p>
          
          <div className="flex" style={{ gap: 'var(--spacing-2)', marginBottom: '1.5rem' }}>
            <div style={{ flex: 1, backgroundColor: 'var(--color-neutral-50)', padding: '0.5rem', borderRadius: 'var(--radius-md)' }}>
              <div className="text-muted" style={{ fontSize: '0.65rem', display: 'flex', alignItems: 'center', gap: '4px' }}><Thermometer size={12}/> Nhiệt độ</div>
              <div className="font-semibold" style={{ fontSize: '1.125rem' }}>24.1°C</div>
              <div className="text-muted" style={{ fontSize: '0.65rem' }}>Ngưỡng 18-28°C</div>
            </div>
            <div style={{ flex: 1, backgroundColor: 'var(--color-neutral-50)', padding: '0.5rem', borderRadius: 'var(--radius-md)' }}>
              <div className="text-muted" style={{ fontSize: '0.65rem', display: 'flex', alignItems: 'center', gap: '4px' }}> Độ ẩm</div>
              <div className="font-semibold" style={{ fontSize: '1.125rem' }}>48%</div>
              <div className="text-muted" style={{ fontSize: '0.65rem' }}>Ngưỡng 40-60%</div>
            </div>
          </div>
          
          <div className="progress-container">
            <div className="progress-stats">
              <span>Sức chứa đã dùng</span>
              <span className="font-semibold">1320/2400 (55%)</span>
            </div>
            <div className="progress-bar-bg">
              <div className="progress-bar-fill success" style={{ width: '55%' }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--spacing-4)' }}>
        <div className="card">
          <div className="card-header" style={{ marginBottom: 'var(--spacing-6)' }}>
            <h3 className="font-semibold" style={{ fontSize: '1rem' }}>Biến động nhập / xuất / tồn kho</h3>
            <div className="flex" style={{ gap: '1rem', fontSize: '0.75rem' }}>
              <span className="flex items-center" style={{ gap: '4px' }}><div style={{width: 8, height: 8, borderRadius: '50%', backgroundColor: '#10b981'}}></div> Nhập</span>
              <span className="flex items-center" style={{ gap: '4px' }}><div style={{width: 8, height: 8, borderRadius: '50%', backgroundColor: '#0ea5e9'}}></div> Xuất</span>
              <span className="flex items-center" style={{ gap: '4px' }}><div style={{width: 8, height: 8, borderRadius: '50%', backgroundColor: '#f59e0b'}}></div> Tồn</span>
            </div>
          </div>
          <div style={{ height: 300, width: '100%' }}>
            <ResponsiveContainer>
              <AreaChart data={mockTrendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorNhap" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorXuat" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dx={-10} />
                <RechartsTooltip />
                <Area type="monotone" dataKey="nhap" stroke="#10b981" fillOpacity={1} fill="url(#colorNhap)" strokeWidth={2} />
                <Area type="monotone" dataKey="xuat" stroke="#0ea5e9" fillOpacity={1} fill="url(#colorXuat)" strokeWidth={2} />
                <Area type="monotone" dataKey="ton" stroke="#f59e0b" fill="none" strokeWidth={2} strokeDasharray="5 5" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold" style={{ fontSize: '1rem' }}>Cơ cấu nhóm hàng</h3>
          </div>
          <div style={{ height: 200, width: '100%' }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={mockCategoryData} innerRadius={60} outerRadius={80} paddingAngle={2} dataKey="value">
                  {mockCategoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ marginTop: 'auto' }}>
            {mockCategoryData.map((item, index) => (
              <div key={index} className="flex items-center justify-between" style={{ padding: '0.25rem 0', fontSize: '0.75rem' }}>
                <span className="flex items-center" style={{ gap: '0.5rem' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: item.color }}></div>
                  {item.name}
                </span>
                <span className="font-medium">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Action lists */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--spacing-4)' }}>
        <div className="card" style={{ padding: '0' }}>
          <div className="flex items-center justify-between" style={{ padding: 'var(--spacing-5) var(--spacing-5) var(--spacing-4)' }}>
            <div>
              <h3 className="font-semibold" style={{ fontSize: '1rem' }}>Ưu tiên xuất kho (FEFO thông minh)</h3>
              <p className="text-muted" style={{ fontSize: '0.75rem' }}>Xếp hạng theo HSD và nguy cơ hư hỏng do AI tính toán</p>
            </div>
            <button className="text-success font-semibold" style={{ fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: 4 }}>Tất cả <ArrowUpFromLine size={14} style={{transform: 'rotate(90deg)'}}/></button>
          </div>
          
          <div style={{ padding: '0 var(--spacing-5) var(--spacing-5)' }}>
            {[
              { rank: '#1', name: 'Cải thìa hữu cơ', badge: 'Kho lạnh', desc: 'LOT-24051 - 80 kg - vị trí C-A1-03 - hết hạn hôm nay', danger: '86% - Cao' },
              { rank: '#2', name: 'Xà lách Romaine', badge: 'Kho lạnh', desc: 'LOT-24058 - 35 kg - vị trí C-A2-01 - còn 1 ngày', danger: '72% - Cao' },
              { rank: '#3', name: 'Cà chua bi', badge: 'Kho lạnh', desc: 'LOT-24033 - 46 kg - vị trí C-A3-05 - còn 2 ngày', danger: '58% - Trung bình', warning: true },
            ].map((item, i) => (
              <div key={i} className="flex items-center" style={{ padding: 'var(--spacing-3)', border: '1px solid var(--color-danger-100)', borderRadius: 'var(--radius-md)', marginBottom: '0.5rem', backgroundColor: item.warning ? '#fffbeb' : '#fef2f2' }}>
                <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-sm)', backgroundColor: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-danger-500)', fontWeight: 600, marginRight: '1rem' }}>
                  {item.rank}
                </div>
                <div>
                  <div className="font-semibold flex items-center" style={{ gap: '0.5rem', fontSize: '0.875rem' }}>
                    {item.name} <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>{item.badge}</span>
                  </div>
                  <div className="text-muted" style={{ fontSize: '0.75rem' }}>{item.desc}</div>
                </div>
                <div style={{ marginLeft: 'auto' }}>
                  <span className={`badge ${item.warning ? 'badge-warning' : 'badge-danger'}`}>{item.danger}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold" style={{ fontSize: '1rem' }}>Hoạt động gần đây</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[
              { icon: <AlertTriangle size={16}/>, color: 'danger', text: 'Cảnh báo nhiệt độ kho lạnh (S-CL-02)', time: '08:42' },
              { icon: <ArrowDownToLine size={16}/>, color: 'success', text: 'Nhập kho LOT-24070 - Mì gói (220 thùng)', time: '08:30' },
              { icon: <ArrowUpFromLine size={16}/>, color: 'success', text: 'Xuất kho FEFO LOT-24061 - Cải thìa (80 kg)', time: '08:05' },
              { icon: <Truck size={16}/>, color: 'success', text: 'Xe TR-12 hoàn tất tuyến B, đang về kho', time: '07:50' },
              { icon: <Thermometer size={16}/>, color: 'success', text: 'AI cập nhật dự báo nhu cầu 30 ngày', time: '07:20' },
            ].map((activity, i) => (
              <div key={i} className="flex" style={{ gap: '0.75rem' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: `var(--color-${activity.color}-50)`, color: `var(--color-${activity.color}-600)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {activity.icon}
                </div>
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{activity.text}</div>
                  <div className="text-muted" style={{ fontSize: '0.75rem' }}>{activity.time}</div>
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
