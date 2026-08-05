import { Download, Boxes, TrendingDown, Percent, FileText, ArrowUpRight } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const mockTrendData = [
  { name: 'T1', nhap: 4000, xuat: 2400, ton: 5000 },
  { name: 'T2', nhap: 3000, xuat: 1398, ton: 4000 },
  { name: 'T3', nhap: 2000, xuat: 3800, ton: 6000 },
  { name: 'T4', nhap: 2780, xuat: 3908, ton: 5500 },
  { name: 'T5', nhap: 1890, xuat: 4800, ton: 4500 },
  { name: 'T6', nhap: 2390, xuat: 3800, ton: 6500 },
  { name: 'T7', nhap: 3490, xuat: 4300, ton: 7000 },
  { name: 'T8', nhap: 4000, xuat: 5300, ton: 8000 },
];

const mockCategoryData = [
  { name: 'Rau củ quả', value: 35, color: '#10b981' },
  { name: 'Thịt cá', value: 25, color: '#f59e0b' },
  { name: 'Đông lạnh', value: 20, color: '#3b82f6' },
  { name: 'Sữa & đồ uống', value: 10, color: '#ef4444' },
  { name: 'Đồ khô', value: 10, color: '#064e3b' },
];

const Reports = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-6)' }}>
      <div className="flex items-center justify-between">
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.25rem' }}>Báo cáo & phân tích</h2>
          <p className="text-muted" style={{ fontSize: '0.875rem' }}>Tổng hợp hiệu quả vận hành kho: thất thoát, quay vòng tồn kho, hiệu suất chuỗi lạnh.</p>
        </div>
        <button className="btn btn-outline">
          <Download size={18} /> Xuất Excel
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--spacing-4)' }}>
        <div className="card">
          <div className="card-header">
            <div className="card-title">Giá trị tồn kho</div>
            <div className="card-icon primary"><Boxes size={18} /></div>
          </div>
          <div className="card-value">8,4 tỷ <span className="card-trend up" style={{ fontSize: '0.875rem' }}><ArrowUpRight size={14}/> +5,2%</span></div>
          <div className="card-desc">VNĐ</div>
        </div>
        
        <div className="card">
          <div className="card-header">
            <div className="card-title">Thất thoát do hư hỏng</div>
            <div className="card-icon danger" style={{ backgroundColor: 'var(--color-primary-100)', color: 'var(--color-primary-600)' }}><TrendingDown size={18} /></div>
          </div>
          <div className="card-value">152 tr <span className="card-trend up" style={{ fontSize: '0.875rem' }}><ArrowUpRight size={14}/> -18%</span></div>
          <div className="card-desc">30 ngày qua</div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">Tỷ lệ thất thoát</div>
            <div className="card-icon primary" style={{ backgroundColor: 'var(--color-primary-100)', color: 'var(--color-primary-600)' }}><Percent size={18} /></div>
          </div>
          <div className="card-value">1,8% <span className="card-trend up" style={{ fontSize: '0.875rem' }}><TrendingDown size={14}/> -0,6%</span></div>
          <div className="card-desc">so với tháng trước</div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">Báo cáo đã tạo</div>
            <div className="card-icon primary"><FileText size={18} /></div>
          </div>
          <div className="card-value">24</div>
          <div className="card-desc">tháng này</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--spacing-4)' }}>
        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold" style={{ fontSize: '1rem' }}>Biến động nhập - xuất - tồn (8 tháng)</h3>
          </div>
          <div style={{ height: 300, width: '100%' }}>
            <ResponsiveContainer>
              <AreaChart data={mockTrendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorNhapRep" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorXuatRep" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#064e3b" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#064e3b" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dx={-10} />
                <RechartsTooltip />
                <Area type="monotone" dataKey="nhap" stroke="#10b981" fillOpacity={1} fill="url(#colorNhapRep)" strokeWidth={2} />
                <Area type="monotone" dataKey="xuat" stroke="#064e3b" fillOpacity={1} fill="url(#colorXuatRep)" strokeWidth={2} />
                <Area type="monotone" dataKey="ton" stroke="#f59e0b" fill="none" strokeWidth={2} strokeDasharray="5 5" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold" style={{ fontSize: '1rem' }}>Cơ cấu tồn kho theo nhóm</h3>
          </div>
          <div style={{ height: 300, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={mockCategoryData} innerRadius={60} outerRadius={90} paddingAngle={2} dataKey="value">
                  {mockCategoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header" style={{ marginBottom: '1.5rem' }}>
          <h3 className="font-semibold" style={{ fontSize: '1rem' }}>Chỉ số hiệu quả vận hành (KPI)</h3>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem' }}>
          <div>
            <div className="flex justify-between items-center" style={{ marginBottom: '0.5rem' }}>
              <span className="font-semibold" style={{ fontSize: '0.875rem' }}>Tỷ lệ quay vòng tồn kho</span>
              <span className="text-muted" style={{ fontSize: '0.875rem' }}>78%</span>
            </div>
            <div className="progress-container" style={{ marginBottom: '0.5rem' }}>
              <div className="progress-bar-bg" style={{ height: '4px' }}>
                <div className="progress-bar-fill success" style={{ width: '78%' }}></div>
              </div>
            </div>
            <div className="text-muted" style={{ fontSize: '0.75rem' }}>Mục tiêu 80%</div>

            <div className="flex justify-between items-center" style={{ marginBottom: '0.5rem', marginTop: '1.5rem' }}>
              <span className="font-semibold" style={{ fontSize: '0.875rem' }}>Độ chính xác kiểm kê</span>
              <span className="text-muted" style={{ fontSize: '0.875rem' }}>99%</span>
            </div>
            <div className="progress-container" style={{ marginBottom: '0.5rem' }}>
              <div className="progress-bar-bg" style={{ height: '4px' }}>
                <div className="progress-bar-fill success" style={{ width: '99%' }}></div>
              </div>
            </div>
            <div className="text-muted" style={{ fontSize: '0.75rem' }}>Mục tiêu 98%</div>
          </div>

          <div>
            <div className="flex justify-between items-center" style={{ marginBottom: '0.5rem' }}>
              <span className="font-semibold" style={{ fontSize: '0.875rem' }}>Tỷ lệ lấp đầy đơn hàng</span>
              <span className="text-muted" style={{ fontSize: '0.875rem' }}>96%</span>
            </div>
            <div className="progress-container" style={{ marginBottom: '0.5rem' }}>
              <div className="progress-bar-bg" style={{ height: '4px' }}>
                <div className="progress-bar-fill success" style={{ width: '96%' }}></div>
              </div>
            </div>
            <div className="text-muted" style={{ fontSize: '0.75rem' }}>Mục tiêu 95%</div>

            <div className="flex justify-between items-center" style={{ marginBottom: '0.5rem', marginTop: '1.5rem' }}>
              <span className="font-semibold" style={{ fontSize: '0.875rem' }}>Tỷ lệ hàng hết hạn</span>
              <span className="text-muted" style={{ fontSize: '0.875rem' }}>12%</span>
            </div>
            <div className="progress-container" style={{ marginBottom: '0.5rem' }}>
              <div className="progress-bar-bg" style={{ height: '4px' }}>
                <div className="progress-bar-fill warning" style={{ width: '12%' }}></div>
              </div>
            </div>
            <div className="text-muted" style={{ fontSize: '0.75rem' }}>Giới hạn 15%</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
