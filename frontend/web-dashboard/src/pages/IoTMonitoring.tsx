import React from 'react';
import { Wifi, Radio, AlertTriangle, WifiOff } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';

const mockTempData = [
  { time: '00:00', cold: 4.1, frozen: -18.2 },
  { time: '04:00', cold: 4.2, frozen: -18.5 },
  { time: '08:00', cold: 4.5, frozen: -17.8 },
  { time: '12:00', cold: 5.8, frozen: -18.1 }, // Spike
  { time: '16:00', cold: 4.3, frozen: -18.6 },
  { time: '20:00', cold: 4.1, frozen: -18.4 },
  { time: '24:00', cold: 4.0, frozen: -18.5 },
];

const IoTMonitoring = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-6)' }}>
      <div className="flex items-center justify-between">
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.25rem' }}>Giám sát IoT thời gian thực</h2>
          <p className="text-muted" style={{ fontSize: '0.875rem' }}>Dữ liệu nhiệt độ, độ ẩm từ cảm biến DHT22 / ESP32 truyền qua giao thức MQTT.</p>
        </div>
        <span className="badge badge-success" style={{ padding: '0.5rem 1rem' }}>
          <Radio size={14} style={{ marginRight: '0.5rem' }} className="animate-pulse" /> Đang truyền dữ liệu
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--spacing-4)' }}>
        <div className="card">
          <div className="card-header">
            <div className="card-title">Tổng cảm biến</div>
            <div className="card-icon primary"><Wifi size={18} /></div>
          </div>
          <div className="card-value">6</div>
          <div className="card-desc">trên 3 khu vực</div>
        </div>
        
        <div className="card">
          <div className="card-header">
            <div className="card-title">Trực tuyến</div>
            <div className="card-icon primary" style={{ backgroundColor: 'var(--color-primary-100)', color: 'var(--color-primary-600)' }}><Radio size={18} /></div>
          </div>
          <div className="card-value">4</div>
          <div className="card-desc">hoạt động bình thường</div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">Bất thường</div>
            <div className="card-icon warning" style={{ backgroundColor: 'var(--color-warning-100)', color: 'var(--color-warning-500)' }}><AlertTriangle size={18} /></div>
          </div>
          <div className="card-value">1</div>
          <div className="card-desc">vượt ngưỡng</div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">Mất kết nối</div>
            <div className="card-icon danger"><WifiOff size={18} /></div>
          </div>
          <div className="card-value">1</div>
          <div className="card-desc">cần kiểm tra</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="font-semibold" style={{ fontSize: '1rem' }}>Diễn biến nhiệt độ 24 giờ</h3>
          <p className="text-muted" style={{ fontSize: '0.75rem' }}>Vùng màu xanh là dải nhiệt an toàn của kho lạnh (2-6°C)</p>
        </div>
        <div style={{ height: 300, width: '100%' }}>
          <ResponsiveContainer>
            <LineChart data={mockTempData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dx={-10} />
              <RechartsTooltip />
              <Legend verticalAlign="top" height={36}/>
              <Line type="monotone" dataKey="cold" name="Kho lạnh" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              <Line type="monotone" dataKey="frozen" name="Kho đông" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default IoTMonitoring;
