import { Truck, Route, ArrowUpRight, TrendingDown, Clock, MapPin, CheckCircle2 } from 'lucide-react';

const TransportOptimization = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-6)' }}>
      <div className="flex items-center justify-between">
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.25rem' }}>Tối ưu vận chuyển</h2>
          <p className="text-muted" style={{ fontSize: '0.875rem' }}>Lập tuyến gom hàng (milk-run) tối ưu, giám sát chuỗi lạnh trên đường vận chuyển theo thời gian thực.</p>
        </div>
        <button className="btn btn-primary">
          <Route size={18} /> Tối ưu tuyến (VRP)
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--spacing-4)' }}>
        <div className="card">
          <div className="card-header">
            <div className="card-title">Xe đang hoạt động</div>
            <div className="card-icon primary"><Truck size={18} /></div>
          </div>
          <div className="card-value">3/5</div>
          <div className="card-desc">2 xe lạnh đang chạy</div>
        </div>
        
        <div className="card">
          <div className="card-header">
            <div className="card-title">Tuyến tối ưu hôm nay</div>
            <div className="card-icon primary"><Route size={18} /></div>
          </div>
          <div className="card-value">3</div>
          <div className="card-desc">13 điểm gom hàng</div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">Tiết kiệm quãng đường</div>
            <div className="card-icon primary"><ArrowUpRight size={18} /></div>
          </div>
          <div className="card-value">18% <span className="card-trend up" style={{ fontSize: '0.875rem' }}><TrendingDown size={14}/> 4%</span></div>
          <div className="card-desc">so với tuyến cũ</div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">Tuân thủ chuỗi lạnh</div>
            <div className="card-icon primary"><CheckCircle2 size={18} /></div>
          </div>
          <div className="card-value">99,2% <span className="card-trend up" style={{ fontSize: '0.875rem' }}><ArrowUpRight size={14}/> 0,3%</span></div>
          <div className="card-desc">nhiệt độ trong ngưỡng</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 'var(--spacing-6)' }}>
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: 'var(--spacing-5)', borderBottom: '1px solid var(--color-neutral-200)' }}>
            <h3 className="font-semibold" style={{ fontSize: '1rem' }}>Đội xe & trạng thái</h3>
          </div>
          <div style={{ padding: 'var(--spacing-5)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            
            <div style={{ border: '1px solid var(--color-neutral-200)', borderRadius: 'var(--radius-md)', padding: '1rem' }}>
              <div className="flex justify-between items-center" style={{ marginBottom: '1rem' }}>
                <div className="flex items-center gap-3">
                  <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--color-primary-50)', color: 'var(--color-primary-600)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Truck size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold flex items-center gap-2">TR-08 <span className="badge badge-neutral" style={{fontSize: '0.65rem'}}>Xe lạnh - 3.5 tấn</span></h4>
                    <p className="text-muted" style={{ fontSize: '0.75rem' }}>Tuyến Milk-run A (4 NCC)</p>
                  </div>
                </div>
                <span className="badge badge-neutral" style={{ backgroundColor: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd' }}>Đang lấy hàng</span>
              </div>
              <div className="progress-container" style={{ marginBottom: '0.75rem' }}>
                <div className="progress-bar-bg">
                  <div className="progress-bar-fill success" style={{ width: '40%' }}></div>
                </div>
              </div>
              <div className="flex justify-between items-center text-muted" style={{ fontSize: '0.75rem' }}>
                <span className="flex items-center gap-1">👤 Trần Văn Hùng</span>
                <span className="flex items-center gap-1"><MapPin size={12}/> 4 điểm</span>
                <span className="flex items-center gap-1 text-success font-medium"><CheckCircle2 size={12}/> 3.8°C</span>
                <span className="flex items-center gap-1"><Clock size={12}/> ETA 10:25</span>
              </div>
            </div>

            <div style={{ border: '1px solid var(--color-neutral-200)', borderRadius: 'var(--radius-md)', padding: '1rem' }}>
              <div className="flex justify-between items-center" style={{ marginBottom: '1rem' }}>
                <div className="flex items-center gap-3">
                  <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--color-primary-50)', color: 'var(--color-primary-600)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Truck size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold flex items-center gap-2">TR-12 <span className="badge badge-neutral" style={{fontSize: '0.65rem'}}>Xe lạnh - 5 tấn</span></h4>
                    <p className="text-muted" style={{ fontSize: '0.75rem' }}>Tuyến B (Thịt cá đông)</p>
                  </div>
                </div>
                <span className="badge badge-neutral" style={{ backgroundColor: '#ecfccb', color: '#4d7c0f', border: '1px solid #d9f99d' }}>Về kho</span>
              </div>
              <div className="progress-container" style={{ marginBottom: '0.75rem' }}>
                <div className="progress-bar-bg">
                  <div className="progress-bar-fill success" style={{ width: '90%' }}></div>
                </div>
              </div>
              <div className="flex justify-between items-center text-muted" style={{ fontSize: '0.75rem' }}>
                <span className="flex items-center gap-1">👤 Lê Minh Tuấn</span>
                <span className="flex items-center gap-1"><MapPin size={12}/> 3 điểm</span>
                <span className="flex items-center gap-1 text-success font-medium"><CheckCircle2 size={12}/> -17.5°C</span>
                <span className="flex items-center gap-1"><Clock size={12}/> ETA 09:50</span>
              </div>
            </div>

            <div style={{ border: '1px solid var(--color-neutral-200)', borderRadius: 'var(--radius-md)', padding: '1rem' }}>
              <div className="flex justify-between items-center" style={{ marginBottom: '1rem' }}>
                <div className="flex items-center gap-3">
                  <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--color-neutral-100)', color: 'var(--color-neutral-600)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Truck size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold flex items-center gap-2">TR-03 <span className="badge badge-neutral" style={{fontSize: '0.65rem'}}>Xe thường - 8 tấn</span></h4>
                    <p className="text-muted" style={{ fontSize: '0.75rem' }}>Tuyến C (Đồ khô)</p>
                  </div>
                </div>
                <span className="badge badge-neutral" style={{ backgroundColor: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd' }}>Đang lấy hàng</span>
              </div>
              <div className="progress-container" style={{ marginBottom: '0.75rem' }}>
                <div className="progress-bar-bg">
                  <div className="progress-bar-fill success" style={{ width: '60%' }}></div>
                </div>
              </div>
              <div className="flex justify-between items-center text-muted" style={{ fontSize: '0.75rem' }}>
                <span className="flex items-center gap-1">👤 Phạm Quốc Anh</span>
                <span className="flex items-center gap-1"><MapPin size={12}/> 6 điểm</span>
                <span className="flex items-center gap-1"><Clock size={12}/> ETA 11:40</span>
              </div>
            </div>

            <div className="flex items-center justify-between" style={{ padding: '0.75rem 1rem', border: '1px solid var(--color-neutral-200)', borderRadius: 'var(--radius-md)' }}>
              <div className="flex items-center gap-2">
                <Truck size={16} className="text-muted" /> <span className="font-semibold" style={{ fontSize: '0.875rem' }}>TR-15</span> <span className="text-muted" style={{ fontSize: '0.75rem' }}>Xe lạnh - 3.5 tấn</span>
              </div>
              <span className="badge badge-neutral">Sẵn sàng</span>
            </div>

            <div className="flex items-center justify-between" style={{ padding: '0.75rem 1rem', border: '1px solid var(--color-neutral-200)', borderRadius: 'var(--radius-md)' }}>
              <div className="flex items-center gap-2">
                <Truck size={16} className="text-muted" /> <span className="font-semibold" style={{ fontSize: '0.875rem' }}>TR-05</span> <span className="text-muted" style={{ fontSize: '0.75rem' }}>Xe thường - 8 tấn</span>
              </div>
              <span className="badge badge-warning">Bảo trì</span>
            </div>

          </div>
        </div>

        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: 'var(--spacing-5)', borderBottom: '1px solid var(--color-neutral-200)' }}>
            <h3 className="font-semibold flex items-center gap-2" style={{ fontSize: '1rem' }}><Route size={18} className="text-success" /> Tuyến đề xuất hôm nay</h3>
          </div>
          
          <div style={{ padding: 'var(--spacing-5)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            
            <div style={{ backgroundColor: 'var(--color-primary-50)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
              <h4 className="font-bold flex items-center justify-between" style={{ marginBottom: '0.25rem' }}>
                Milk-run A — Khu Đông Bắc
                <span className="text-success"><Route size={16} /></span>
              </h4>
              <p className="text-muted" style={{ fontSize: '0.75rem', marginBottom: '1rem' }}>TR-08 (Xe lạnh)</p>
              
              <div className="flex justify-between text-center" style={{ marginBottom: '1rem' }}>
                <div style={{ backgroundColor: 'white', padding: '0.5rem', borderRadius: 'var(--radius-sm)', flex: 1, marginRight: '0.5rem' }}>
                  <div className="font-bold">4</div>
                  <div className="text-muted" style={{ fontSize: '0.65rem' }}>điểm gom</div>
                </div>
                <div style={{ backgroundColor: 'white', padding: '0.5rem', borderRadius: 'var(--radius-sm)', flex: 1, marginRight: '0.5rem' }}>
                  <div className="font-bold">62 km</div>
                  <div className="text-muted" style={{ fontSize: '0.65rem' }}>quãng đường</div>
                </div>
                <div style={{ backgroundColor: 'white', padding: '0.5rem', borderRadius: 'var(--radius-sm)', flex: 1 }}>
                  <div className="font-bold">2g 40p</div>
                  <div className="text-muted" style={{ fontSize: '0.65rem' }}>thời gian</div>
                </div>
              </div>
              <span className="badge badge-success" style={{ backgroundColor: '#d1fae5', color: '#047857', border: 'none' }}>-18% quãng đường</span>
            </div>

            <div style={{ border: '1px solid var(--color-neutral-200)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
              <h4 className="font-bold flex items-center justify-between" style={{ marginBottom: '0.25rem' }}>
                Tuyến B — Thịt cá đông lạnh
                <span className="text-success"><Route size={16} /></span>
              </h4>
              <p className="text-muted" style={{ fontSize: '0.75rem', marginBottom: '1rem' }}>TR-12 (Xe lạnh)</p>
              
              <div className="flex justify-between text-center" style={{ marginBottom: '1rem' }}>
                <div style={{ backgroundColor: 'var(--color-neutral-50)', padding: '0.5rem', borderRadius: 'var(--radius-sm)', flex: 1, marginRight: '0.5rem' }}>
                  <div className="font-bold">3</div>
                  <div className="text-muted" style={{ fontSize: '0.65rem' }}>điểm gom</div>
                </div>
                <div style={{ backgroundColor: 'var(--color-neutral-50)', padding: '0.5rem', borderRadius: 'var(--radius-sm)', flex: 1, marginRight: '0.5rem' }}>
                  <div className="font-bold">48 km</div>
                  <div className="text-muted" style={{ fontSize: '0.65rem' }}>quãng đường</div>
                </div>
                <div style={{ backgroundColor: 'var(--color-neutral-50)', padding: '0.5rem', borderRadius: 'var(--radius-sm)', flex: 1 }}>
                  <div className="font-bold">2g 05p</div>
                  <div className="text-muted" style={{ fontSize: '0.65rem' }}>thời gian</div>
                </div>
              </div>
              <span className="badge badge-success" style={{ backgroundColor: '#d1fae5', color: '#047857', border: 'none' }}>-12% nhiên liệu</span>
            </div>

            <div style={{ border: '1px solid var(--color-neutral-200)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
              <h4 className="font-bold flex items-center justify-between" style={{ marginBottom: '0.25rem' }}>
                Tuyến C — Đồ khô & nước
              </h4>
              <p className="text-muted" style={{ fontSize: '0.75rem', marginBottom: '1rem' }}>TR-03 (Xe thường)</p>
              
              <div className="flex justify-between text-center" style={{ marginBottom: '1rem' }}>
                <div style={{ backgroundColor: 'var(--color-neutral-50)', padding: '0.5rem', borderRadius: 'var(--radius-sm)', flex: 1, marginRight: '0.5rem' }}>
                  <div className="font-bold">6</div>
                  <div className="text-muted" style={{ fontSize: '0.65rem' }}>điểm gom</div>
                </div>
                <div style={{ backgroundColor: 'var(--color-neutral-50)', padding: '0.5rem', borderRadius: 'var(--radius-sm)', flex: 1, marginRight: '0.5rem' }}>
                  <div className="font-bold">85 km</div>
                  <div className="text-muted" style={{ fontSize: '0.65rem' }}>quãng đường</div>
                </div>
                <div style={{ backgroundColor: 'var(--color-neutral-50)', padding: '0.5rem', borderRadius: 'var(--radius-sm)', flex: 1 }}>
                  <div className="font-bold">3g 30p</div>
                  <div className="text-muted" style={{ fontSize: '0.65rem' }}>thời gian</div>
                </div>
              </div>
              <span className="badge badge-success" style={{ backgroundColor: '#d1fae5', color: '#047857', border: 'none' }}>-22% thời gian chờ</span>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default TransportOptimization;
