import React, { useState, useEffect } from 'react';
import { Target, TrendingUp, TrendingDown, ShoppingCart, Percent, BrainCircuit, RefreshCw } from 'lucide-react';
import { Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart } from 'recharts';
import { useAuth } from '../contexts/AuthContext';

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
  const { token } = useAuth();
  const [forecasts, setForecasts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [chartData, setChartData] = useState(mockDemandData);

  const runAiModel = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      // 1. Fetch products
      const prodRes = await fetch('http://localhost:3010/products', { headers });
      if (!prodRes.ok) throw new Error('Failed to fetch products');
      const products = await prodRes.json();
      
      // 2. Take top 5 products (or first 5) to forecast
      const topProducts = products.slice(0, 5);
      
      // 3. Fetch AI forecast for each
      const forecastPromises = topProducts.map((p: any) => 
        fetch(`http://localhost:3003/ai/forecast/${p.sku}`, { headers }).then(r => r.json())
      );
      const results = await Promise.all(forecastPromises);
      setForecasts(results);

      // Randomize chart a bit for effect
      const newChart = mockDemandData.map(d => ({
        ...d,
        duBao: d.duBao ? d.duBao + Math.floor(Math.random() * 40 - 20) : undefined,
      }));
      setChartData(newChart);

    } catch (err) {
      console.error('Error running AI forecast:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runAiModel();
  }, [token]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-6)' }}>
      <div className="flex items-center justify-between">
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.25rem' }}>Dự báo nhu cầu</h2>
          <p className="text-muted" style={{ fontSize: '0.875rem' }}>Mô hình AI dự báo lượng tiêu thụ 30 ngày tới, hỗ trợ đặt hàng đúng lúc và tránh tồn kho.</p>
        </div>
        <button 
          className="btn btn-outline text-success" 
          style={{ borderColor: 'var(--color-primary-500)', display: 'flex', alignItems: 'center', gap: 6 }}
          onClick={runAiModel}
          disabled={loading}
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> {loading ? 'Đang chạy mô hình...' : 'Chạy lại mô hình'}
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
            <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
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
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>Đang dự báo AI...</td></tr>
              ) : forecasts.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>Không có dữ liệu.</td></tr>
              ) : (
                forecasts.map((f, i) => {
                  const isUrgent = f.replenishmentRecommendation.status === 'RESTOCK_RECOMMENDED';
                  return (
                    <tr key={i}>
                      <td>
                        <div className="font-semibold">{f.productName}</div>
                        <div className="text-muted" style={{ fontSize: '0.75rem' }}>{f.sku}</div>
                      </td>
                      <td className={`font-medium ${f.currentInventory === 0 ? 'text-danger' : ''}`}>{f.currentInventory}</td>
                      <td className="font-medium text-muted">{f.weeklyDemandForecast} / tuần</td>
                      <td className="font-bold">{f.replenishmentRecommendation.suggestedQuantity > 0 ? f.replenishmentRecommendation.suggestedQuantity : '-'}</td>
                      <td>
                        {isUrgent ? (
                          <span className="badge badge-warning">Cần nhập sớm ({f.replenishmentRecommendation.suggestedOrderDate})</span>
                        ) : (
                          <span className="badge badge-neutral">Chưa cần</span>
                        )}
                      </td>
                      <td className="text-muted">{f.confidenceInterval}</td>
                      <td>
                        <button className={`btn ${isUrgent ? 'btn-primary' : 'btn-outline'}`} style={{ padding: '0.25rem 0.75rem' }} disabled={!isUrgent}>
                          Tạo đơn
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DemandForecast;
