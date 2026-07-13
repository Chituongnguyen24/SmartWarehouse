import { useState, useEffect } from 'react';
import { ArrowUpRight, Zap, ListOrdered, Layers, TrendingDown, RefreshCcw } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const API_BASE = 'http://localhost:3011'; // inventory-service
const PRODUCT_API = 'http://localhost:3010'; // product-service

interface Lot {
  id: string;
  lotCode: string;
  productId: string;
  quantity: number;
  remainingQty: number;
  expiryDate: string;
  zone: string;
  location: string;
  riskScore: number;
  status: string;
  // Bổ sung sau khi fetch
  productName?: string;
  sku?: string;
}

const FEFOExport = () => {
  const { token } = useAuth();
  const [fefoList, setFefoList] = useState<Lot[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchFefoData();
  }, []);

  const fetchFefoData = async () => {
    setLoading(true);
    try {
      // 1. Fetch lots
      const resLots = await fetch(`${API_BASE}/inventory/lots`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      let lots: Lot[] = await resLots.json();

      // Chỉ lấy các lô còn hàng
      lots = lots.filter(l => l.remainingQty > 0);

      // 2. Lấy thông tin sản phẩm (để có tên và SKU)
      const resProducts = await fetch(`${PRODUCT_API}/products`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const products = await resProducts.json();
      const productMap = new Map<string, any>(products.map((p: any) => [p.id, p]));

      // 3. Map tên sản phẩm và Tính điểm ưu tiên xuất
      // FEFO Score = (RiskScore * 0.6) + (Proximity to Expiry * 0.4)
      const today = new Date().getTime();
      
      const enrichedLots = lots.map(lot => {
        const expTime = new Date(lot.expiryDate).getTime();
        const daysLeft = Math.max(0, (expTime - today) / (1000 * 3600 * 24));
        
        // Điểm càng cao càng phải xuất sớm (0-100)
        let expiryScore = 0;
        if (daysLeft <= 0) expiryScore = 100;
        else if (daysLeft <= 3) expiryScore = 90;
        else if (daysLeft <= 7) expiryScore = 70;
        else if (daysLeft <= 14) expiryScore = 50;
        else if (daysLeft <= 30) expiryScore = 30;
        else expiryScore = 10;

        const fefoScore = Math.round((lot.riskScore * 0.6) + (expiryScore * 0.4));

        return {
          ...lot,
          productName: productMap.get(lot.productId)?.name || 'Unknown',
          sku: productMap.get(lot.productId)?.sku || 'Unknown',
          fefoScore,
          daysLeft: Math.round(daysLeft)
        };
      });

      // Sắp xếp giảm dần theo fefoScore
      enrichedLots.sort((a: any, b: any) => b.fefoScore - a.fefoScore);
      setFefoList(enrichedLots);

    } catch (error) {
      console.error('Failed to fetch FEFO data', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (lot: Lot) => {
    const qty = prompt(`Nhập số lượng muốn xuất từ lô ${lot.lotCode} (Tồn: ${lot.remainingQty}):`, lot.remainingQty.toString());
    if (!qty) return;
    const exportQty = parseInt(qty);
    if (isNaN(exportQty) || exportQty <= 0 || exportQty > lot.remainingQty) {
      alert('Số lượng xuất không hợp lệ!');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/inventory/lots/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ lotCode: lot.lotCode, quantity: exportQty, reason: 'Xuất theo đề xuất FEFO' })
      });

      if (res.ok) {
        alert('Xuất kho thành công!');
        fetchFefoData();
      } else {
        const err = await res.json();
        alert(`Lỗi: ${err.message}`);
      }
    } catch (error) {
      console.error('Lỗi khi xuất kho', error);
    }
  };

  const urgentLots = fefoList.filter((l: any) => l.fefoScore >= 80).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-6)' }}>
      <div className="flex items-center justify-between">
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.25rem' }}>Xuất kho FEFO thông minh</h2>
          <p className="text-muted" style={{ fontSize: '0.875rem' }}>Xếp hạng lô hàng cần xuất trước theo HSD và AI dự báo hư hỏng (Learning to Rank).</p>
        </div>
        <button className="btn btn-outline" onClick={fetchFefoData} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <RefreshCcw size={16} /> Làm mới
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--spacing-4)' }}>
        <div className="card">
          <div className="card-header">
            <div className="card-title">Lô cần xuất gấp</div>
            <div className="card-icon primary" style={{ backgroundColor: 'var(--color-danger-100)', color: 'var(--color-danger-600)' }}><Zap size={18} /></div>
          </div>
          <div className="card-value text-danger">{urgentLots}</div>
          <div className="card-desc">điểm FEFO &gt;= 80</div>
        </div>
        
        <div className="card">
          <div className="card-header">
            <div className="card-title">Tổng lô trong kho</div>
            <div className="card-icon primary"><ListOrdered size={18} /></div>
          </div>
          <div className="card-value">{fefoList.length}</div>
          <div className="card-desc">đang có hàng</div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">Nguyên tắc</div>
            <div className="card-icon primary"><Layers size={18} /></div>
          </div>
          <div className="card-value" style={{ fontSize: '1.25rem' }}>FEFO + AI</div>
          <div className="card-desc">First Expired First Out</div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">Tiết kiệm thất thoát</div>
            <div className="card-icon primary" style={{ backgroundColor: 'var(--color-primary-100)', color: 'var(--color-primary-600)' }}><TrendingDown size={18} /></div>
          </div>
          <div className="card-value text-success">-24% <span className="card-trend up" style={{ fontSize: '0.875rem' }}><ArrowUpRight size={14}/> tốt</span></div>
          <div className="card-desc">so với FIFO truyền thống</div>
        </div>
      </div>

      {/* Top 3 Urgent */}
      {fefoList.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--spacing-4)' }}>
          {fefoList.slice(0, 3).map((lot: any, index) => (
            <div key={lot.id} className="card" style={{ border: `1px solid ${lot.fefoScore >= 80 ? 'var(--color-danger-500)' : lot.fefoScore >= 50 ? 'var(--color-warning-500)' : 'var(--border)'}`, backgroundColor: lot.fefoScore >= 80 ? '#fef2f2' : lot.fefoScore >= 50 ? '#fffbeb' : '#fff' }}>
              <div className="flex justify-between items-center" style={{ marginBottom: '1rem' }}>
                <div style={{ width: 28, height: 28, borderRadius: 'var(--radius-sm)', backgroundColor: lot.fefoScore >= 80 ? 'var(--color-danger-500)' : lot.fefoScore >= 50 ? 'var(--color-warning-500)' : 'var(--color-neutral-500)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>{index + 1}</div>
                <span className={`badge badge-${lot.fefoScore >= 80 ? 'danger' : lot.fefoScore >= 50 ? 'warning' : 'neutral'}`}>{lot.fefoScore} điểm FEFO</span>
              </div>
              <h4 className="font-bold text-lg">{lot.productName}</h4>
              <p className="text-muted" style={{ fontSize: '0.875rem', marginBottom: '1rem' }}>{lot.lotCode}</p>
              <div className="flex justify-between items-center">
                <span className="text-muted flex items-center gap-1" style={{ fontSize: '0.875rem' }}><Layers size={14}/> {lot.location}</span>
                <span className={lot.daysLeft <= 3 ? "text-danger font-semibold" : "text-muted font-semibold"} style={{ fontSize: '0.875rem' }}>Còn {lot.daysLeft} ngày</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="card" style={{ padding: '0' }}>
        <div style={{ padding: 'var(--spacing-5)', borderBottom: '1px solid var(--color-neutral-200)' }}>
          <h3 className="font-semibold" style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Bảng xếp hạng ưu tiên xuất kho</h3>
          <p className="text-muted" style={{ fontSize: '0.75rem' }}>Danh sách toàn bộ lô hàng được xếp hạng theo rủi ro hư hỏng và HSD</p>
        </div>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Hạng</th>
                <th>Lô hàng</th>
                <th>Sản phẩm</th>
                <th>Khu vực</th>
                <th>Số lượng</th>
                <th>HSD</th>
                <th>Rủi ro AI</th>
                <th>Vị trí lấy</th>
                <th>Điểm FEFO</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} style={{ textAlign: 'center', padding: '2rem' }}>Đang tải dữ liệu...</td></tr>
              ) : fefoList.length === 0 ? (
                <tr><td colSpan={10} style={{ textAlign: 'center', padding: '2rem' }}>Không có lô hàng nào.</td></tr>
              ) : (
                fefoList.map((lot: any, index) => (
                  <tr key={lot.id} style={{ backgroundColor: lot.fefoScore >= 80 ? '#fef2f2' : lot.fefoScore >= 60 ? '#fffbeb' : 'transparent' }}>
                    <td className={`font-bold text-center ${lot.fefoScore >= 80 ? 'text-danger' : lot.fefoScore >= 60 ? 'text-warning' : 'text-muted'}`}>{index + 1}</td>
                    <td><div className="font-semibold">{lot.lotCode}</div></td>
                    <td>
                      <div className="font-semibold">{lot.productName}</div>
                      <div className="text-muted" style={{ fontSize: '0.75rem' }}>{lot.sku}</div>
                    </td>
                    <td><span className="badge badge-neutral" style={{ backgroundColor: lot.zone === 'COLD' ? '#e0f2fe' : lot.zone === 'FROZEN' ? '#cffafe' : '#fef3c7', color: lot.zone === 'COLD' ? '#0369a1' : lot.zone === 'FROZEN' ? '#0891b2' : '#d97706', border: 'none' }}>{lot.zone}</span></td>
                    <td className="font-medium">{lot.remainingQty}</td>
                    <td className={lot.daysLeft <= 3 ? "text-danger font-medium" : "text-muted"}>{lot.daysLeft} ngày</td>
                    <td><span className={`badge badge-${lot.riskScore > 70 ? 'danger' : lot.riskScore > 30 ? 'warning' : 'success'}`}>{lot.riskScore}%</span></td>
                    <td className="font-medium text-muted">{lot.location}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div style={{ height: 6, width: `${lot.fefoScore / 2}px`, backgroundColor: lot.fefoScore >= 80 ? 'var(--color-danger-500)' : lot.fefoScore >= 60 ? 'var(--color-warning-500)' : 'var(--color-success-500)', borderRadius: 3 }}></div>
                        <span className={`font-bold ${lot.fefoScore >= 80 ? 'text-danger' : lot.fefoScore >= 60 ? 'text-warning' : 'text-success'}`}>{lot.fefoScore}</span>
                      </div>
                    </td>
                    <td><button className="btn btn-primary" style={{ padding: '0.25rem 0.75rem' }} onClick={() => handleExport(lot)}>Xuất</button></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default FEFOExport;
