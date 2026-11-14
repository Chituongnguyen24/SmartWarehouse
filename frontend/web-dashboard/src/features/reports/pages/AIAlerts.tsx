import React, { useState, useEffect } from 'react';
import { ShieldAlert, Clock, AlertTriangle, Activity, RefreshCw, CheckCircle2, BrainCircuit } from 'lucide-react';
import { useAuth } from '@/features/auth';
import { getApiHost } from '@/shared/utils/apiConfig';

interface Anomaly {
  zone: string;
  sensor: string;
  temperature: number;
  humidity: number;
  threshold: string;
  durationMinutes: number;
  severity: 'CRITICAL' | 'WARNING';
  message: string;
}

interface ExpiryLot {
  lotCode: string;
  productName: string;
  sku: string;
  daysLeft: number;
  quantity: number;
  zone: string;
}

interface AiPrediction {
  lotCode: string;
  productName: string;
  riskPercent: number;
  riskLevel: 'Cao' | 'Trung bình' | 'Thấp';
  recommendation: string;
  details: string;
}

const IOT_API = getApiHost(3002);
const INVENTORY_API = getApiHost(3011);
const AI_API = getApiHost(3003);

const AIAlerts = () => {
  const { token } = useAuth();
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [expiryLots, setExpiryLots] = useState<ExpiryLot[]>([]);
  const [predictions, setPredictions] = useState<AiPrediction[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      // 1. Fetch IoT anomalies
      const anomalyRes = await fetch(`${IOT_API}/sensor/anomalies`);
      const anomalyData = anomalyRes.ok ? await anomalyRes.json() : [];
      setAnomalies(Array.isArray(anomalyData) ? anomalyData : []);

      // 2. Fetch expiry alerts
      const expiryRes = await fetch(`${INVENTORY_API}/inventory/expiry-alert`, { headers });
      const expiryData = expiryRes.ok ? await expiryRes.json() : [];
      const lots: ExpiryLot[] = (Array.isArray(expiryData) ? expiryData : []).map((l: any) => ({
        lotCode: l.lotCode || l.code || '',
        productName: l.productName || l.sku || '',
        sku: l.sku || '',
        daysLeft: l.daysLeft ?? l.daysUntilExpiry ?? 0,
        quantity: l.quantity || 0,
        zone: l.zone || 'COLD',
      }));
      setExpiryLots(lots);

      // 3. AI predict spoilage for each anomaly zone
      const aiPredictions: AiPrediction[] = [];
      const zonesToPredict = Array.isArray(anomalyData) ? anomalyData : [];
      for (const anomaly of zonesToPredict.slice(0, 5)) {
        try {
          const aiRes = await fetch(`${AI_API}/ai/predict-spoilage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...headers },
            body: JSON.stringify({
              zoneId: anomaly.zone || 'COLD',
              temperature: anomaly.temperature || 5.0,
              humidity: anomaly.humidity || 80,
              durationMinutes: anomaly.durationMinutes || 30,
            }),
          });
          if (aiRes.ok) {
            const aiData = await aiRes.json();
            if (aiData.affectedLots) {
              aiData.affectedLots.forEach((lot: any) => {
                aiPredictions.push({
                  lotCode: lot.lotCode || '',
                  productName: lot.productName || lot.sku || '',
                  riskPercent: Math.round((lot.riskScore || lot.spoilageRisk || 0) * 100),
                  riskLevel: (lot.riskScore || 0) > 0.7 ? 'Cao' : (lot.riskScore || 0) > 0.4 ? 'Trung bình' : 'Thấp',
                  recommendation: lot.recommendation || 'Theo dõi sát',
                  details: lot.details || `${anomaly.zone} - ${anomaly.durationMinutes} phút vượt ngưỡng`,
                });
              });
            }
          }
        } catch {
          // Skip individual prediction errors
        }
      }

      // Also add expiry lots as low-risk predictions if not already in AI results
      for (const lot of lots.slice(0, 5)) {
        if (!aiPredictions.find(p => p.lotCode === lot.lotCode)) {
          const risk = lot.daysLeft <= 1 ? 85 : lot.daysLeft <= 3 ? 60 : lot.daysLeft <= 5 ? 35 : 20;
          aiPredictions.push({
            lotCode: lot.lotCode,
            productName: lot.productName,
            riskPercent: risk,
            riskLevel: risk > 70 ? 'Cao' : risk > 40 ? 'Trung bình' : 'Thấp',
            recommendation: lot.daysLeft <= 1 ? 'Xuất ngay hôm nay' : lot.daysLeft <= 3 ? 'Ưu tiên lên kệ' : 'Theo dõi sát',
            details: `HSD còn ${lot.daysLeft} ngày`,
          });
        }
      }
      setPredictions(aiPredictions);
    } catch (err) {
      console.error('Error fetching AI alerts data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const criticalCount = anomalies.filter(a => a.severity === 'CRITICAL').length;
  const warningCount = anomalies.filter(a => a.severity === 'WARNING').length;
  const highRiskCount = predictions.filter(p => p.riskLevel === 'Cao').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-6)' }}>
      <div className="flex items-center justify-between">
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.25rem' }}>Kiểm Soát & Cảnh Báo Chất Lượng Hàng Hóa</h2>
          <p className="text-muted" style={{ fontSize: '0.875rem' }}>Phát hiện bất thường trong bảo quản và đánh giá nguy cơ giảm chất lượng của từng lô hàng theo thời gian thực.</p>
        </div>
        <button className="btn btn-outline" style={{ fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: 6 }} onClick={fetchData}>
          <RefreshCw size={14} /> Làm mới
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-secondary)' }}>Đang tải dữ liệu cảnh báo chất lượng kho hàng...</div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--spacing-4)' }}>
            <div className="card">
              <div className="card-header">
                <div className="card-title">Cảnh báo nghiêm trọng</div>
                <div className="card-icon danger"><ShieldAlert size={18} /></div>
              </div>
              <div className="card-value text-danger">{criticalCount}</div>
              <div className="card-desc">{criticalCount > 0 ? 'cần xử lý ngay' : 'không có'}</div>
            </div>

            <div className="card">
              <div className="card-header">
                <div className="card-title">Cảnh báo thường</div>
                <div className="card-icon warning" style={{ backgroundColor: 'var(--color-warning-100)', color: 'var(--color-warning-500)' }}><Clock size={18} /></div>
              </div>
              <div className="card-value text-warning">{warningCount}</div>
              <div className="card-desc">{warningCount > 0 ? 'đang theo dõi' : 'không có'}</div>
            </div>

            <div className="card">
              <div className="card-header">
                <div className="card-title">Lô nguy cơ cao</div>
                <div className="card-icon primary"><AlertTriangle size={18} /></div>
              </div>
              <div className="card-value">{highRiskCount}</div>
              <div className="card-desc">Cần ưu tiên xử lý</div>
            </div>

            <div className="card">
              <div className="card-header">
                <div className="card-title">Lô sắp hết hạn</div>
                <div className="card-icon primary"><Activity size={18} /></div>
              </div>
              <div className="card-value">{expiryLots.length}</div>
              <div className="card-desc">trong 7 ngày tới</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 'var(--spacing-6)' }}>
            <div>
              <h3 className="font-semibold" style={{ fontSize: '1rem', marginBottom: 'var(--spacing-4)' }}>Danh sách cảnh báo</h3>

              {anomalies.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-secondary)' }}>
                  <CheckCircle2 size={20} color="#16a34a" style={{ margin: '0 auto 8px', display: 'block' }} />
                  <div>Không có cảnh báo bất thường nào. Hệ thống vận hành ổn định.</div>
                </div>
              ) : (
                anomalies.map((anomaly, idx) => (
                  <div key={idx} className="card" style={{ marginBottom: '1rem', borderLeft: `4px solid ${anomaly.severity === 'CRITICAL' ? 'var(--color-danger-500)' : 'var(--color-warning-500)'}` }}>
                    <div className="flex items-center" style={{ gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: anomaly.severity === 'CRITICAL' ? 'var(--color-danger-500)' : 'var(--color-warning-500)' }}></div>
                      <h4 className={`font-semibold ${anomaly.severity === 'CRITICAL' ? 'text-danger' : 'text-warning'}`}>
                        {anomaly.message || `Bất thường ${anomaly.zone}`}
                      </h4>
                      <span className={`badge ${anomaly.severity === 'CRITICAL' ? 'badge-danger' : 'badge-warning'}`} style={{ padding: '0.125rem 0.5rem' }}>
                        {anomaly.severity === 'CRITICAL' ? 'Nghiêm trọng' : 'Cảnh báo'}
                      </span>
                      <span className="badge badge-neutral" style={{ backgroundColor: '#e0f2fe', color: '#0369a1', border: 'none' }}>
                        {anomaly.zone}
                      </span>
                    </div>
                    <p className="text-muted" style={{ fontSize: '0.875rem', marginBottom: '1rem' }}>
                      Cảm biến {anomaly.sensor || 'N/A'} đo {anomaly.temperature}°C, độ ẩm {anomaly.humidity}% trong {anomaly.durationMinutes} phút.
                    </p>

                    <div style={{ backgroundColor: 'var(--color-primary-50)', padding: '0.75rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem', display: 'flex', gap: '0.5rem' }}>
                      <BrainCircuit size={18} className="text-success" style={{ flexShrink: 0 }} />
                      <p style={{ fontSize: '0.875rem', color: 'var(--color-primary-800)' }}>
                        <strong>Phân tích AI:</strong> Nguy cơ hư hỏng do nhiệt độ vượt ngưỡng {anomaly.durationMinutes} phút. Khuyến nghị kiểm tra và ưu tiên xuất kho lô hàng gần hết hạn.
                      </p>
                    </div>

                    <div className="flex justify-between items-center text-muted" style={{ fontSize: '0.75rem' }}>
                      <span>Zone {anomaly.zone} • {anomaly.durationMinutes} phút</span>
                      <button className="font-semibold" style={{ color: 'var(--color-neutral-900)' }}>Xử lý</button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div>
              <div className="card" style={{ padding: '0' }}>
                <div style={{ padding: 'var(--spacing-5)', borderBottom: '1px solid var(--color-neutral-200)' }}>
                  <h3 className="font-semibold flex items-center" style={{ gap: '0.5rem', fontSize: '1rem', marginBottom: '0.5rem' }}>
                    <BrainCircuit size={18} className="text-success" />
                    Đánh giá nguy cơ chất lượng hàng hóa
                  </h3>
                  <p className="text-muted" style={{ fontSize: '0.75rem' }}>Hệ thống tự động phân tích đa chiều dựa trên nhiệt độ, độ ẩm, số lần vượt ngưỡng và hạn sử dụng của từng lô hàng.</p>
                </div>
                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Lô hàng</th>
                        <th>Nguy cơ</th>
                        <th>Đề xuất</th>
                      </tr>
                    </thead>
                    <tbody>
                      {predictions.length === 0 ? (
                        <tr>
                          <td colSpan={3} style={{ textAlign: 'center', color: 'var(--color-text-secondary)', padding: '1.5rem' }}>
                            Không có cảnh báo rủi ro. Kho hàng đang được bảo quản trong điều kiện lý tưởng.
                          </td>
                        </tr>
                      ) : (
                        predictions.map((pred, idx) => (
                          <tr key={idx}>
                            <td>
                              <div className="font-semibold">{pred.productName}</div>
                              <div className="text-muted" style={{ fontSize: '0.75rem' }}>{pred.lotCode}</div>
                              <div className="text-muted" style={{ fontSize: '0.75rem' }}>{pred.details}</div>
                            </td>
                            <td>
                              <span className={`badge ${pred.riskLevel === 'Cao' ? 'badge-danger' : pred.riskLevel === 'Trung bình' ? 'badge-warning' : 'badge-success'}`}>
                                {pred.riskPercent}% - {pred.riskLevel}
                              </span>
                            </td>
                            <td className="font-medium" style={{ fontSize: '0.875rem' }}>{pred.recommendation}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AIAlerts;
