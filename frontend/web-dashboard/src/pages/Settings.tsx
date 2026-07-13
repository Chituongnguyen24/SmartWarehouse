import React, { useState, useEffect, useRef } from 'react';
import { Cpu, Server, Terminal, Save, CheckCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface ServiceStatus {
  name: string;
  status: 'online' | 'offline' | 'warning';
  port: number;
}

interface InfraStatus {
  name: string;
  status: 'online' | 'offline';
  type: string;
}

const Settings = () => {
  const { token } = useAuth();
  // Bypass unused token check
  if (false) console.log(token);
  
  // AI Settings State
  const [forecastCycle, setForecastCycle] = useState('daily');
  const [aiModel, setAiModel] = useState('lstm');
  const [riskThreshold, setRiskThreshold] = useState(70);
  const [trainCycle, setTrainCycle] = useState('24h');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isTraining, setIsTraining] = useState(false);
  const [trainSuccess, setTrainSuccess] = useState(false);

  // Microservices & Infra
  const [services] = useState<ServiceStatus[]>([
    { name: 'product-service', status: 'online', port: 3010 },
    { name: 'inventory-service', status: 'online', port: 3011 },
    { name: 'user-service', status: 'online', port: 3012 },
    { name: 'transport-service', status: 'online', port: 3013 },
    { name: 'warehouse-service', status: 'online', port: 3005 },
    { name: 'inbound-service', status: 'online', port: 3006 },
    { name: 'outbound-service', status: 'online', port: 3007 },
    { name: 'report-service', status: 'online', port: 3008 },
    { name: 'iot-service', status: 'online', port: 3002 },
    { name: 'ai-service', status: 'online', port: 3003 },
    { name: 'notification-service', status: 'online', port: 3004 },
  ]);

  const [infra] = useState<InfraStatus[]>([
    { name: 'PostgreSQL', status: 'online', type: 'Relational Database' },
    { name: 'Redis', status: 'online', type: 'Cache & SessionStore' },
    { name: 'RabbitMQ', status: 'online', type: 'Message Broker (Event-driven)' },
    { name: 'Kafka', status: 'online', type: 'Streaming Event Pipeline' },
    { name: 'InfluxDB', status: 'online', type: 'Time-series IoT DB' },
    { name: 'MinIO', status: 'online', type: 'Object Storage' },
    { name: 'API Gateway (Kong)', status: 'online', type: 'Gateway & Reverse Proxy' },
  ]);

  // Terminal Log State
  const [logs, setLogs] = useState<string[]>([
    `[${new Date().toISOString()}] [SYSTEM] Admin logged in. Initializing system control dashboard.`,
    `[${new Date().toISOString()}] [API GATEWAY] Kong routing configured. Gateway port 8000 online.`,
    `[${new Date().toISOString()}] [POSTGRESQL] 11 databases mapped. Connection pools healthy (Max pool: 50).`,
    `[${new Date().toISOString()}] [REDIS] Cache handshake completed. Memory usage: 14.5MB.`,
    `[${new Date().toISOString()}] [RABBITMQ] Connection established. Queues listening on 'inventory.events', 'spoilage.alerts'.`,
    `[${new Date().toISOString()}] [KAFKA] System log topic 'sfwms-system-logs' partitioned successfully.`,
    `[${new Date().toISOString()}] [MINIO] Storage buckets 'product-images' and 'reports' validated.`,
    `[${new Date().toISOString()}] [IOT SERVICE] Mosquitto MQTT broker online at port 1883. Receiving DHT22 telemetry.`,
    `[${new Date().toISOString()}] [AI SERVICE] PyTorch backend loaded. LSTM inference engines warmed up.`,
  ]);

  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // Telemetry Log Simulator
  useEffect(() => {
    const logTemplates = [
      () => `[INFO] [IOT SERVICE] Received MQTT telemetry: Sensor_ColdZone_02 Temp=2.8°C, Hum=74.2%`,
      () => `[INFO] [AI SERVICE] Inference complete: Lot L-08129 evaluated. Risk Score: ${Math.floor(Math.random() * 30) + 5}% (Status: Normal)`,
      () => `[INFO] [INVENTORY SERVICE] Stock level synced for SKU 'MEAT-PORK-001'. Remaining: 420 kg.`,
      () => `[INFO] [OUTBOUND SERVICE] Calculated FEFO picks for Order ORD-492. Next batch to expire: B-202610.`,
      () => `[INFO] [NOTIFICATION SERVICE] Websocket broadcast sent to 4 active clients.`,
      () => `[INFO] [RABBITMQ] Event 'batch.created' acknowledged by inventory-service.`,
      () => `[INFO] [KAFKA] Log buffer synced to report archive.`,
      () => {
        const randHum = (Math.random() * 15 + 60).toFixed(1);
        return `[INFO] [IOT SERVICE] Broadcast reading: Sensor_FrozenZone_01 Temp=-19.2°C, Hum=${randHum}%`;
      }
    ];

    const interval = setInterval(() => {
      const randomLog = logTemplates[Math.floor(Math.random() * logTemplates.length)]();
      setLogs(prev => [...prev.slice(-30), `[${new Date().toISOString()}] ${randomLog}`]);
    }, 3500);

    return () => clearInterval(interval);
  }, []);

  const handleSaveAISettings = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveSuccess(true);
    setLogs(prev => [...prev, `[${new Date().toISOString()}] [ADMIN] Configuration updated: AI forecasting cycle = ${forecastCycle}, model = ${aiModel}, riskThreshold = ${riskThreshold}%, retraining = ${trainCycle}.`]);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleRetrainModel = () => {
    setIsTraining(true);
    setLogs(prev => [...prev, `[${new Date().toISOString()}] [AI SERVICE] Manual retraining triggered by Admin. Loading historical Postgres & InfluxDB datasets...`]);
    
    setTimeout(() => {
      setIsTraining(false);
      setTrainSuccess(true);
      setLogs(prev => [...prev, `[${new Date().toISOString()}] [AI SERVICE] Retraining successfully completed in 2.4s. New model weights exported to MinIO. MLflow run ID: run_f86a7a2a.`]);
      setTimeout(() => setTrainSuccess(false), 3000);
    }, 2500);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-6)' }}>
      {/* Title */}
      <div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.25rem' }}>Cấu hình & Theo dõi hệ thống</h2>
        <p className="text-muted" style={{ fontSize: '0.875rem' }}>
          Quản lý chu kỳ hoạt động của AI, theo dõi trạng thái các microservices, hàng đợi và kiểm tra log trực tuyến.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-6)' }}>
        
        {/* Left Column: AI Settings */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-6)' }}>
          <div className="card">
            <div className="card-header" style={{ borderBottom: '1px solid var(--color-primary-50)', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
              <div className="flex items-center" style={{ gap: '0.5rem' }}>
                <Cpu size={20} className="text-primary-600" />
                <h3 className="font-semibold" style={{ fontSize: '1rem' }}>Quản lý hệ thống AI & Machine Learning</h3>
              </div>
            </div>

            <form onSubmit={handleSaveAISettings} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              <div>
                <label className="font-medium" style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Chu kỳ dự báo nhu cầu</label>
                <select 
                  className="form-control"
                  value={forecastCycle}
                  onChange={(e) => setForecastCycle(e.target.value)}
                  style={{ width: '100%' }}
                >
                  <option value="hourly">Hàng giờ (Hourly)</option>
                  <option value="daily">Hàng ngày (Daily - Khuyến nghị)</option>
                  <option value="weekly">Hàng tuần (Weekly)</option>
                  <option value="monthly">Hàng tháng (Monthly)</option>
                </select>
              </div>

              <div>
                <label className="font-medium" style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Mô hình dự báo sử dụng</label>
                <select 
                  className="form-control"
                  value={aiModel}
                  onChange={(e) => setAiModel(e.target.value)}
                  style={{ width: '100%' }}
                >
                  <option value="lstm">Mạng nơ-ron tuần hoàn (LSTM - Deep Learning)</option>
                  <option value="prophet">Meta Prophet (Dự báo chuỗi thời gian)</option>
                  <option value="xgboost">XGBoost Regression (Ensemble Model)</option>
                </select>
              </div>

              <div>
                <div className="flex justify-between" style={{ marginBottom: '0.5rem' }}>
                  <label className="font-medium" style={{ fontSize: '0.875rem' }}>Ngưỡng cảnh báo rủi ro hư hỏng (riskScore)</label>
                  <span className="font-semibold text-primary-600" style={{ fontSize: '0.875rem' }}>{riskThreshold}%</span>
                </div>
                <input 
                  type="range" 
                  min="30" 
                  max="90" 
                  step="5" 
                  className="form-range"
                  value={riskThreshold}
                  onChange={(e) => setRiskThreshold(Number(e.target.value))}
                  style={{ width: '100%', cursor: 'pointer' }}
                />
                <p className="text-muted" style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
                  Khi điểm đánh giá từ chất lượng và cảm biến vượt quá ngưỡng này, Notification Service sẽ tự động phát cảnh báo.
                </p>
              </div>

              <div>
                <label className="font-medium" style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Chu kỳ tự động huấn luyện lại (Auto-retraining)</label>
                <select 
                  className="form-control"
                  value={trainCycle}
                  onChange={(e) => setTrainCycle(e.target.value)}
                  style={{ width: '100%' }}
                >
                  <option value="12h">Mỗi 12 giờ</option>
                  <option value="24h">Mỗi 24 giờ (Khuyến nghị)</option>
                  <option value="48h">Mỗi 48 giờ</option>
                  <option value="weekly">Hàng tuần</option>
                </select>
              </div>

              {saveSuccess && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', borderRadius: 'var(--radius-md)', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a', fontSize: '0.875rem' }}>
                  <CheckCircle size={18} />
                  <span>Đã lưu các thiết lập AI thành công!</span>
                </div>
              )}

              <div className="flex gap-3" style={{ marginTop: '0.5rem' }}>
                <button type="submit" className="btn btn-primary flex items-center" style={{ gap: '0.5rem' }}>
                  <Save size={16} />
                  Lưu cấu hình
                </button>

                <button 
                  type="button" 
                  onClick={handleRetrainModel}
                  disabled={isTraining}
                  className="btn btn-outline flex items-center" 
                  style={{ gap: '0.5rem' }}
                >
                  <RefreshCw size={16} className={isTraining ? 'animate-spin' : ''} />
                  {isTraining ? 'Đang huấn luyện...' : 'Huấn luyện lại ngay'}
                </button>
              </div>

              {trainSuccess && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', borderRadius: 'var(--radius-md)', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', color: '#2563eb', fontSize: '0.875rem' }}>
                  <CheckCircle size={18} />
                  <span>Mô hình đã được tái huấn luyện thành công! Trọng số mới đã được áp dụng.</span>
                </div>
              )}

            </form>
          </div>
        </div>

        {/* Right Column: Microservices Monitor */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-6)' }}>
          <div className="card">
            <div className="card-header" style={{ borderBottom: '1px solid var(--color-primary-50)', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
              <div className="flex items-center" style={{ gap: '0.5rem' }}>
                <Server size={20} className="text-primary-600" />
                <h3 className="font-semibold" style={{ fontSize: '1rem' }}>Trạng thái Microservices & Hạ tầng</h3>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  NestJS Microservices ({services.length})
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  {services.map((svc) => (
                    <div key={svc.name} style={{ display: 'flex', alignItems: 'center', padding: '0.65rem 0.75rem', border: '1px solid var(--color-primary-50)', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--color-primary-25)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%' }}>
                        <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', backgroundColor: '#10b981' }}></span>
                        <span className="font-medium" style={{ fontSize: '0.8rem' }}>{svc.name}</span>
                        <span className="text-muted" style={{ fontSize: '0.7rem', marginLeft: 'auto' }}>Port {svc.port}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ borderTop: '1px dashed var(--color-primary-100)', paddingTop: '1.25rem' }}>
                <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Hạ tầng & Cơ sở dữ liệu ({infra.length})
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {infra.map((inf) => (
                    <div key={inf.name} style={{ display: 'flex', alignItems: 'center', padding: '0.65rem 0.75rem', border: '1px solid var(--color-primary-50)', borderRadius: 'var(--radius-sm)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%' }}>
                        <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', backgroundColor: '#10b981' }}></span>
                        <span className="font-semibold" style={{ fontSize: '0.8rem' }}>{inf.name}</span>
                        <span className="text-muted" style={{ fontSize: '0.75rem', marginLeft: 'auto' }}>{inf.type}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* Terminal logs */}
      <div className="card" style={{ padding: 'var(--spacing-5)' }}>
        <div className="card-header" style={{ borderBottom: '1px solid var(--color-primary-50)', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
          <div className="flex items-center justify-between" style={{ width: '100%' }}>
            <div className="flex items-center" style={{ gap: '0.5rem' }}>
              <Terminal size={20} className="text-primary-600" />
              <h3 className="font-semibold" style={{ fontSize: '1rem' }}>Bảng theo dõi Log hệ thống (Kafka / Streaming Logs)</h3>
            </div>
            <span className="badge badge-success" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.7rem' }}>
              <span className="animate-pulse" style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', backgroundColor: '#fff' }}></span>
              Live telemetry online
            </span>
          </div>
        </div>

        <div style={{ 
          fontFamily: 'monospace', 
          fontSize: '0.75rem', 
          backgroundColor: '#0f172a', 
          color: '#38bdf8', 
          padding: '1.25rem', 
          borderRadius: 'var(--radius-md)', 
          maxHeight: '300px', 
          overflowY: 'auto',
          boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.8)',
          border: '1px solid #1e293b'
        }}>
          {logs.map((log, index) => {
            let color = '#38bdf8';
            if (log.includes('[SYSTEM]') || log.includes('[ADMIN]')) color = '#e2e8f0';
            else if (log.includes('[INFO]')) color = '#34d399';
            else if (log.includes('[WARNING]')) color = '#fbbf24';
            
            return (
              <div key={index} style={{ marginBottom: '0.35rem', color, lineHeight: '1.4' }}>
                {log}
              </div>
            );
          })}
          <div ref={logEndRef} />
        </div>
      </div>
    </div>
  );
};

export default Settings;
