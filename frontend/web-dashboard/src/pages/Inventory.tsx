import React from 'react';
import { Boxes, Clock, PackageCheck, MapPin } from 'lucide-react';

const Inventory = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-6)' }}>
      <div className="flex items-center justify-between">
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.25rem' }}>Kho hàng & lô hàng</h2>
          <p className="text-muted" style={{ fontSize: '0.875rem' }}>Theo dõi từng lô hàng theo vị trí lưu trữ, ngày nhập, hạn sử dụng và tình trạng bảo quản.</p>
        </div>
        <div className="flex items-center" style={{ gap: 'var(--spacing-3)' }}>
          <button className="btn btn-outline">Nhập kho</button>
          <button className="btn btn-primary">Xuất kho</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--spacing-4)' }}>
        <div className="card">
          <div className="card-header">
            <div className="card-title">Tổng lô hàng</div>
            <div className="card-icon primary"><Boxes size={18} /></div>
          </div>
          <div className="card-value">8</div>
          <div className="card-desc">đang lưu trữ</div>
        </div>
        
        <div className="card">
          <div className="card-header">
            <div className="card-title">Sắp hết hạn (≤3 ngày)</div>
            <div className="card-icon warning" style={{ backgroundColor: 'var(--color-warning-100)', color: 'var(--color-warning-500)' }}><Clock size={18} /></div>
          </div>
          <div className="card-value">3</div>
          <div className="card-desc">cần xử lý</div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">Tổng đơn vị hàng</div>
            <div className="card-icon primary"><PackageCheck size={18} /></div>
          </div>
          <div className="card-value">1.117</div>
          <div className="card-desc">kg / hộp / thùng</div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">Khu vực kho</div>
            <div className="card-icon primary"><MapPin size={18} /></div>
          </div>
          <div className="card-value">3</div>
          <div className="card-desc">lạnh - đông - khô</div>
        </div>
      </div>

      {/* Tóm tắt kho mock */}
      <div className="card">
        <h3 className="font-semibold" style={{ marginBottom: '1rem' }}>Tình trạng lấp đầy khu vực</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem' }}>
          <div>
            <div className="flex items-center justify-between" style={{ marginBottom: '0.5rem' }}>
              <span className="badge badge-neutral" style={{backgroundColor: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0'}}>Kho lạnh</span>
              <span className="font-bold">72%</span>
            </div>
            <div className="progress-bar-bg" style={{ height: '8px' }}>
              <div className="progress-bar-fill success" style={{ width: '72%' }}></div>
            </div>
            <div className="text-muted mt-2" style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>864 / 1.200 vị trí đã sử dụng</div>
          </div>

          <div>
            <div className="flex items-center justify-between" style={{ marginBottom: '0.5rem' }}>
              <span className="badge badge-neutral" style={{backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe'}}>Kho đông lạnh</span>
              <span className="font-bold">89%</span>
            </div>
            <div className="progress-bar-bg" style={{ height: '8px' }}>
              <div className="progress-bar-fill warning" style={{ width: '89%' }}></div>
            </div>
            <div className="text-muted mt-2" style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>712 / 800 vị trí đã sử dụng</div>
          </div>

          <div>
            <div className="flex items-center justify-between" style={{ marginBottom: '0.5rem' }}>
              <span className="badge badge-neutral" style={{backgroundColor: '#fffbeb', color: '#b45309', border: '1px solid #fde68a'}}>Kho khô</span>
              <span className="font-bold">55%</span>
            </div>
            <div className="progress-bar-bg" style={{ height: '8px' }}>
              <div className="progress-bar-fill success" style={{ width: '55%' }}></div>
            </div>
            <div className="text-muted mt-2" style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>1.320 / 2.400 vị trí đã sử dụng</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Inventory;
