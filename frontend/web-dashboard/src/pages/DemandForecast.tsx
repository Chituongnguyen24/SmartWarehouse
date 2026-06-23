import React from 'react';
import { Target, TrendingUp, ShoppingCart, Percent, BrainCircuit } from 'lucide-react';
import { LineChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ComposedChart } from 'recharts';

const mockDemandData = [
  { day: 1, thucTe: 400, duBao: 410, confidenceRange: [380, 440] },
  { day: 5, thucTe: 420, duBao: 430, confidenceRange: [390, 460] },
  { day: 9, thucTe: 410, duBao: 405, confidenceRange: [370, 440] },
  { day: 13, thucTe: 400, duBao: 420, confidenceRange: [380, 450] },
  { day: 17, thucTe: 380, duBao: 375, confidenceRange: [355, 400] }, // Current day
  { day: 21, duBao: 390, confidenceRange: [360, 420] },
  { day: 25, duBao: 430, confidenceRange: [390, 470] },
  { day: 29, duBao: 470, confidenceRange: [420, 520] },
];

const DemandForecast = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-6)' }}>
      <div className="flex items-center justify-between">
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.25rem' }}>Dự báo nhu cầu</h2>
          <p className="text-muted" style={{ fontSize: '0.875rem' }}>Mô hình AI dự báo lượng tiêu thụ 30 ngày tới, hỗ trợ đặt hàng đúng lúc và tránh tồn kho.</p>
        </div>
        <button className="btn btn-outline text-success" style={{ borderColor: 'var(--color-primary-500)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <BrainCircuit size={16} /> Chạy lại mô hình
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--spacing-4)' }}>
        <div className="card">
          <div className="card-header">
            <div className="card-title">Độ chính xác (MAPE)</div>
            <div className="card-icon primary"><Target size={18} /></div>
          </div>
          <div className="card-value">92,4% <span className="card-trend up" style={{ fontSize: '0.875rem' }}><TrendingUp size={14}/> +1,8%</span></div>
          <div className="card-desc">14 ngày gần nhất</div>
        </div>
        
        <div className="card">
          <div className="card-header">
            <div className="card-title">Nhu cầu dự kiến 7 ngày</div>
            <div className="card-icon primary"><TrendingUp size={18} /></div>
          </div>
          <div className="card-value">9.840</div>
          <div className="card-desc">đơn vị sản phẩm</div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">SKU cần đặt thêm</div>
            <div className="card-icon primary"><ShoppingCart size={18} /></div>
          </div>
          <div className="card-value">4 <span className="card-trend down" style={{ fontSize: '0.875rem' }}><TrendingDown size={14}/> +1</span></div>
          <div className="card-desc">theo ngưỡng tồn</div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">Khoảng tin cậy</div>
            <div className="card-icon primary"><Percent size={18} /></div>
          </div>
          <div className="card-value">±15%</div>
          <div className="card-desc">dải dự báo</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header" style={{ marginBottom: 'var(--spacing-2)' }}>
          <h3 className="font-semibold" style={{ fontSize: '1rem' }}>Tiêu thụ thực tế và dự báo (đơn vị/ngày)</h3>
        </div>
        <div className="flex" style={{ gap: '1.5rem', marginBottom: '1rem', fontSize: '0.75rem' }}>
          <div className="flex items-center" style={{ gap: '0.5rem' }}>
            <div style={{ width: 12, height: 3, backgroundColor: '#10b981' }}></div>
            <span className="text-muted">Thực tế</span>
          </div>
          <div className="flex items-center" style={{ gap: '0.5rem' }}>
            <div style={{ width: 12, height: 3, backgroundColor: '#0ea5e9', borderStyle: 'dashed', borderWidth: '1px' }}></div>
            <span className="text-muted">Dự báo AI</span>
          </div>
          <div className="flex items-center" style={{ gap: '0.5rem' }}>
            <div style={{ width: 12, height: 12, backgroundColor: '#e0f2fe', borderRadius: 2 }}></div>
            <span className="text-muted">Khoảng tin cậy 85-115%</span>
          </div>
        </div>
        <div style={{ height: 300, width: '100%' }}>
          <ResponsiveContainer>
            <ComposedChart data={mockDemandData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dx={-10} domain={[0, 600]} />
              <Tooltip />
              <Area type="monotone" dataKey="confidenceRange" stroke="none" fill="#e0f2fe" fillOpacity={0.6} />
              <Line type="monotone" dataKey="thucTe" stroke="#10b981" strokeWidth={3} dot={false} />
              <Line type="monotone" dataKey="duBao" stroke="#0ea5e9" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 4 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card" style={{ padding: '0' }}>
        <div style={{ padding: 'var(--spacing-5)', borderBottom: '1px solid var(--color-neutral-200)' }}>
          <h3 className="font-semibold" style={{ fontSize: '1rem' }}>Đề xuất đặt hàng tự động</h3>
        </div>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Sản phẩm</th>
                <th>Tồn hiện tại</th>
                <th>Dự báo 7 ngày</th>
                <th>Đề xuất đặt</th>
                <th>Thời điểm</th>
                <th>Độ tin cậy</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <div className="font-semibold">Cà chua bi</div>
                  <div className="text-muted" style={{ fontSize: '0.75rem' }}>VEG-0044 - Rau củ quả</div>
                </td>
                <td className="font-medium">48</td>
                <td className="font-medium text-muted">210</td>
                <td className="font-bold">180</td>
                <td><span className="badge badge-warning">Trong 2 ngày</span></td>
                <td className="text-muted">91%</td>
                <td><button className="btn btn-primary" style={{ padding: '0.25rem 0.75rem' }}>Tạo đơn</button></td>
              </tr>
              <tr>
                <td>
                  <div className="font-semibold">Cá hồi phi lê</div>
                  <div className="text-muted" style={{ fontSize: '0.75rem' }}>FSH-0210 - Thịt cá</div>
                </td>
                <td className="font-medium">76</td>
                <td className="font-medium text-muted">160</td>
                <td className="font-bold">120</td>
                <td><span className="badge badge-warning">Trong 3 ngày</span></td>
                <td className="text-muted">84%</td>
                <td><button className="btn btn-primary" style={{ padding: '0.25rem 0.75rem' }}>Tạo đơn</button></td>
              </tr>
              <tr>
                <td>
                  <div className="font-semibold">Tôm sú đông lạnh</div>
                  <div className="text-muted" style={{ fontSize: '0.75rem' }}>FRZ-0301 - Đông lạnh</div>
                </td>
                <td className="font-medium text-danger">0</td>
                <td className="font-medium text-muted">140</td>
                <td className="font-bold">200</td>
                <td><span className="badge badge-danger">Hôm nay</span></td>
                <td className="text-muted">95%</td>
                <td><button className="btn btn-primary" style={{ padding: '0.25rem 0.75rem' }}>Tạo đơn</button></td>
              </tr>
              <tr>
                <td>
                  <div className="font-semibold">Sữa tươi tiệt trùng</div>
                  <div className="text-muted" style={{ fontSize: '0.75rem' }}>MLK-0428 - Sữa & đồ uống</div>
                </td>
                <td className="font-medium text-success">980</td>
                <td className="font-medium text-muted">720</td>
                <td className="font-bold">-</td>
                <td><span className="badge badge-neutral">Chưa cần</span></td>
                <td className="text-muted">78%</td>
                <td><button className="btn btn-outline" style={{ padding: '0.25rem 0.75rem' }} disabled>Tạo đơn</button></td>
              </tr>
              <tr>
                <td>
                  <div className="font-semibold">Xà lách Romaine</div>
                  <div className="text-muted" style={{ fontSize: '0.75rem' }}>VEG-0077 - Rau củ quả</div>
                </td>
                <td className="font-medium">35</td>
                <td className="font-medium text-muted">120</td>
                <td className="font-bold">100</td>
                <td><span className="badge badge-warning">Trong 1 ngày</span></td>
                <td className="text-muted">88%</td>
                <td><button className="btn btn-primary" style={{ padding: '0.25rem 0.75rem' }}>Tạo đơn</button></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DemandForecast;
