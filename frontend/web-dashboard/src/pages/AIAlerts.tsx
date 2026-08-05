import { ShieldAlert, Clock, BrainCircuit, Activity } from 'lucide-react';

const AIAlerts = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-6)' }}>
      <div className="flex items-center justify-between">
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.25rem' }}>Cảnh báo & AI dự đoán hư hỏng</h2>
          <p className="text-muted" style={{ fontSize: '0.875rem' }}>Phát hiện bất thường trong bảo quản và đánh giá nguy cơ giảm chất lượng từng lô hàng bằng mô hình AI.</p>
        </div>
        <button className="btn btn-outline" style={{ fontSize: '0.875rem' }}>
          Đánh dấu đã xử lý
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--spacing-4)' }}>
        <div className="card">
          <div className="card-header">
            <div className="card-title">Cảnh báo nghiêm trọng</div>
            <div className="card-icon danger"><ShieldAlert size={18} /></div>
          </div>
          <div className="card-value text-danger">2</div>
          <div className="card-desc">cần xử lý ngay</div>
        </div>
        
        <div className="card">
          <div className="card-header">
            <div className="card-title">Cảnh báo thường</div>
            <div className="card-icon warning" style={{ backgroundColor: 'var(--color-warning-100)', color: 'var(--color-warning-500)' }}><Clock size={18} /></div>
          </div>
          <div className="card-value text-warning">2</div>
          <div className="card-desc">đang theo dõi</div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">Lô nguy cơ cao</div>
            <div className="card-icon primary"><BrainCircuit size={18} /></div>
          </div>
          <div className="card-value">2</div>
          <div className="card-desc">AI dự đoán hư hỏng</div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">Độ chính xác AI</div>
            <div className="card-icon primary"><Activity size={18} /></div>
          </div>
          <div className="card-value">92%</div>
          <div className="card-desc">mô hình Spoilage</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 'var(--spacing-6)' }}>
        <div>
          <h3 className="font-semibold" style={{ fontSize: '1rem', marginBottom: 'var(--spacing-4)' }}>Danh sách cảnh báo</h3>
          
          <div className="card" style={{ marginBottom: '1rem', borderLeft: '4px solid var(--color-danger-500)' }}>
            <div className="flex items-center" style={{ gap: '0.5rem', marginBottom: '0.5rem' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--color-danger-500)' }}></div>
              <h4 className="font-semibold text-danger">Nhiệt độ kho lạnh vượt ngưỡng</h4>
              <span className="badge badge-danger" style={{ padding: '0.125rem 0.5rem' }}>Nghiêm trọng</span>
              <span className="badge badge-neutral" style={{ backgroundColor: '#e0f2fe', color: '#0369a1', border: 'none' }}>Kho lạnh</span>
            </div>
            <p className="text-muted" style={{ fontSize: '0.875rem', marginBottom: '1rem' }}>Cảm biến S-CL-02 đo 5,8°C trong 42 phút (ngưỡng 2-6°C, cửa mở lâu).</p>
            
            <div style={{ backgroundColor: 'var(--color-primary-50)', padding: '0.75rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem', display: 'flex', gap: '0.5rem' }}>
              <BrainCircuit size={18} className="text-success" style={{ flexShrink: 0 }} />
              <p style={{ fontSize: '0.875rem', color: 'var(--color-primary-800)' }}>
                <strong>Phân tích AI:</strong> AI dự đoán lô LOT-24061 (cải thìa) giảm chất lượng trong 1-2 ngày. Đề xuất ưu tiên xuất kho.
              </p>
            </div>
            
            <div className="flex justify-between items-center text-muted" style={{ fontSize: '0.75rem' }}>
              <span>AL-7781 • 08:42 hôm nay</span>
              <button className="font-semibold" style={{ color: 'var(--color-neutral-900)' }}>Xử lý</button>
            </div>
          </div>

          <div className="card" style={{ borderLeft: '4px solid var(--color-danger-500)' }}>
            <div className="flex items-center" style={{ gap: '0.5rem', marginBottom: '0.5rem' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--color-danger-500)' }}></div>
              <h4 className="font-semibold text-danger">Sự cố làm lạnh kho đông</h4>
              <span className="badge badge-danger" style={{ padding: '0.125rem 0.5rem' }}>Nghiêm trọng</span>
              <span className="badge badge-neutral" style={{ backgroundColor: '#e0e7ff', color: '#4338ca', border: 'none' }}>Kho đông lạnh</span>
            </div>
            <p className="text-muted" style={{ fontSize: '0.875rem', marginBottom: '1rem' }}>Cảm biến S-FZ-01 đo -15,2°C, cao hơn ngưỡng -16°C.</p>
            
            <div style={{ backgroundColor: 'var(--color-primary-50)', padding: '0.75rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem', display: 'flex', gap: '0.5rem' }}>
              <BrainCircuit size={18} className="text-success" style={{ flexShrink: 0 }} />
              <p style={{ fontSize: '0.875rem', color: 'var(--color-primary-800)' }}>
                <strong>Phân tích AI:</strong> Nguy cơ rã đông cục bộ. Kiểm tra dàn lạnh và ưu tiên kiểm tra lô cá/thịt gần cửa.
              </p>
            </div>
            
            <div className="flex justify-between items-center text-muted" style={{ fontSize: '0.75rem' }}>
              <span>AL-7780 • 08:15 hôm nay</span>
              <button className="font-semibold" style={{ color: 'var(--color-neutral-900)' }}>Xử lý</button>
            </div>
          </div>
        </div>

        <div>
          <div className="card" style={{ padding: '0' }}>
            <div style={{ padding: 'var(--spacing-5)', borderBottom: '1px solid var(--color-neutral-200)' }}>
              <h3 className="font-semibold flex items-center" style={{ gap: '0.5rem', fontSize: '1rem', marginBottom: '0.5rem' }}>
                <BrainCircuit size={18} className="text-success" />
                Dự đoán hư hỏng (AI)
              </h3>
              <p className="text-muted" style={{ fontSize: '0.75rem' }}>Random Forest + Isolation Forest dựa trên nhiệt độ, độ ẩm, số lần vượt ngưỡng và HSD.</p>
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
                  <tr>
                    <td>
                      <div className="font-semibold">Cải thìa hữu cơ</div>
                      <div className="text-muted" style={{ fontSize: '0.75rem' }}>LOT-24061</div>
                      <div className="text-muted" style={{ fontSize: '0.75rem' }}>Vượt nhiệt 42 phút, HSD còn 0 ngày</div>
                    </td>
                    <td><span className="badge badge-danger">86% - Cao</span></td>
                    <td className="font-medium" style={{ fontSize: '0.875rem' }}>Xuất ngay hôm nay</td>
                  </tr>
                  <tr>
                    <td>
                      <div className="font-semibold">Xà lách Romaine</div>
                      <div className="text-muted" style={{ fontSize: '0.75rem' }}>LOT-24058</div>
                      <div className="text-muted" style={{ fontSize: '0.75rem' }}>Độ ẩm cao, sản phẩm dễ úng</div>
                    </td>
                    <td><span className="badge badge-danger">72% - Cao</span></td>
                    <td className="font-medium" style={{ fontSize: '0.875rem' }}>Ưu tiên lên kệ</td>
                  </tr>
                  <tr>
                    <td>
                      <div className="font-semibold">Cà chua bi</div>
                      <div className="text-muted" style={{ fontSize: '0.75rem' }}>LOT-24033</div>
                      <div className="text-muted" style={{ fontSize: '0.75rem' }}>HSD ngắn, nhiệt độ dao động</div>
                    </td>
                    <td><span className="badge badge-warning">58% - Trung bình</span></td>
                    <td className="font-medium" style={{ fontSize: '0.875rem' }}>Theo dõi sát</td>
                  </tr>
                  <tr>
                    <td>
                      <div className="font-semibold">Cá hồi phi lê</div>
                      <div className="text-muted" style={{ fontSize: '0.75rem' }}>LOT-24001</div>
                      <div className="text-muted" style={{ fontSize: '0.75rem' }}>Số lần vượt ngưỡng tăng</div>
                    </td>
                    <td><span className="badge badge-success">34% - Thấp</span></td>
                    <td className="font-medium" style={{ fontSize: '0.875rem' }}>Kiểm tra dàn lạnh</td>
                  </tr>
                  <tr>
                    <td>
                      <div className="font-semibold">Sữa tươi tiệt trùng</div>
                      <div className="text-muted" style={{ fontSize: '0.75rem' }}>LOT-23990</div>
                    </td>
                    <td><span className="badge badge-success">21% - Thấp</span></td>
                    <td className="font-medium" style={{ fontSize: '0.875rem' }}>Bình thường</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIAlerts;
