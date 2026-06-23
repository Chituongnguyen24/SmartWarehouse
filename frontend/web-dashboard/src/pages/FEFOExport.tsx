import React from 'react';
import { ArrowUpRight, Zap, ListOrdered, Layers, TrendingDown } from 'lucide-react';

const FEFOExport = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-6)' }}>
      <div className="flex items-center justify-between">
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.25rem' }}>Xuất kho FEFO thông minh</h2>
          <p className="text-muted" style={{ fontSize: '0.875rem' }}>Xếp hạng lô hàng cần xuất trước theo HSD, nguy cơ hư hỏng, vị trí và tần suất xuất — Weighted scoring / Learning to Rank.</p>
        </div>
        <button className="btn btn-primary">
          <ArrowUpRight size={18} /> Tạo phiếu xuất
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--spacing-4)' }}>
        <div className="card">
          <div className="card-header">
            <div className="card-title">Lô cần xuất gấp</div>
            <div className="card-icon primary" style={{ backgroundColor: 'var(--color-primary-100)', color: 'var(--color-primary-600)' }}><Zap size={18} /></div>
          </div>
          <div className="card-value">3</div>
          <div className="card-desc">ưu tiên cao nhất</div>
        </div>
        
        <div className="card">
          <div className="card-header">
            <div className="card-title">Tổng lô xếp hạng</div>
            <div className="card-icon primary"><ListOrdered size={18} /></div>
          </div>
          <div className="card-value">6</div>
          <div className="card-desc">đang theo dõi</div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">Nguyên tắc</div>
            <div className="card-icon primary"><Layers size={18} /></div>
          </div>
          <div className="card-value" style={{ fontSize: '1.5rem' }}>FEFO</div>
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--spacing-4)' }}>
        <div className="card" style={{ border: '1px solid var(--color-danger-500)', backgroundColor: '#fef2f2' }}>
          <div className="flex justify-between items-center" style={{ marginBottom: '1rem' }}>
            <div style={{ width: 28, height: 28, borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--color-danger-500)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>1</div>
            <span className="badge badge-danger">86% - Cao</span>
          </div>
          <h4 className="font-bold text-lg">Cải thìa hữu cơ</h4>
          <p className="text-muted" style={{ fontSize: '0.875rem', marginBottom: '1rem' }}>LOT-24061</p>
          <div className="flex justify-between items-center">
            <span className="text-muted flex items-center gap-1" style={{ fontSize: '0.875rem' }}><Layers size={14}/> C-A1-03</span>
            <span className="text-danger font-semibold" style={{ fontSize: '0.875rem' }}>Hết hạn hôm nay</span>
          </div>
        </div>

        <div className="card" style={{ border: '1px solid var(--color-danger-300)', backgroundColor: '#fef2f2' }}>
          <div className="flex justify-between items-center" style={{ marginBottom: '1rem' }}>
            <div style={{ width: 28, height: 28, borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--color-danger-500)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>2</div>
            <span className="badge badge-danger">72% - Cao</span>
          </div>
          <h4 className="font-bold text-lg">Xà lách Romaine</h4>
          <p className="text-muted" style={{ fontSize: '0.875rem', marginBottom: '1rem' }}>LOT-24058</p>
          <div className="flex justify-between items-center">
            <span className="text-muted flex items-center gap-1" style={{ fontSize: '0.875rem' }}><Layers size={14}/> C-A2-01</span>
            <span className="text-danger font-semibold" style={{ fontSize: '0.875rem' }}>Còn 1 ngày</span>
          </div>
        </div>

        <div className="card" style={{ border: '1px solid var(--color-warning-300)', backgroundColor: '#fffbeb' }}>
          <div className="flex justify-between items-center" style={{ marginBottom: '1rem' }}>
            <div style={{ width: 28, height: 28, borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--color-danger-500)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>3</div>
            <span className="badge badge-warning">58% - Trung bình</span>
          </div>
          <h4 className="font-bold text-lg">Cà chua bi</h4>
          <p className="text-muted" style={{ fontSize: '0.875rem', marginBottom: '1rem' }}>LOT-24033</p>
          <div className="flex justify-between items-center">
            <span className="text-muted flex items-center gap-1" style={{ fontSize: '0.875rem' }}><Layers size={14}/> C-A3-06</span>
            <span className="text-danger font-semibold" style={{ fontSize: '0.875rem' }}>Còn 2 ngày</span>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: '0' }}>
        <div style={{ padding: 'var(--spacing-5)', borderBottom: '1px solid var(--color-neutral-200)' }}>
          <h3 className="font-semibold" style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Bảng xếp hạng ưu tiên xuất kho</h3>
          <p className="text-muted" style={{ fontSize: '0.75rem' }}>Điểm số tổng hợp càng cao càng nên xuất trước</p>
        </div>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Hạng</th>
                <th>Lô hàng</th>
                <th>Khu</th>
                <th>Số lượng</th>
                <th>HSD</th>
                <th>Nguy cơ</th>
                <th>Vị trí lấy</th>
                <th>Điểm FEFO</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ backgroundColor: '#fef2f2' }}>
                <td className="font-bold text-danger text-center">1</td>
                <td>
                  <div className="font-semibold">Cải thìa hữu cơ</div>
                  <div className="text-muted" style={{ fontSize: '0.75rem' }}>LOT-24061</div>
                </td>
                <td><span className="badge badge-neutral" style={{ backgroundColor: '#e0f2fe', color: '#0369a1', border: 'none' }}>Kho lạnh</span></td>
                <td className="font-medium">80 kg</td>
                <td className="text-danger font-medium">Hôm nay</td>
                <td><span className="badge badge-danger">86% - Cao</span></td>
                <td className="font-medium text-muted">C-A1-03</td>
                <td>
                  <div className="flex items-center gap-2">
                    <div style={{ height: 6, width: 40, backgroundColor: 'var(--color-danger-500)', borderRadius: 3 }}></div>
                    <span className="font-bold text-danger">98</span>
                  </div>
                </td>
                <td><button className="btn btn-primary" style={{ padding: '0.25rem 0.75rem' }}>Xuất</button></td>
              </tr>
              <tr style={{ backgroundColor: '#fef2f2' }}>
                <td className="font-bold text-danger text-center">2</td>
                <td>
                  <div className="font-semibold">Xà lách Romaine</div>
                  <div className="text-muted" style={{ fontSize: '0.75rem' }}>LOT-24058</div>
                </td>
                <td><span className="badge badge-neutral" style={{ backgroundColor: '#e0f2fe', color: '#0369a1', border: 'none' }}>Kho lạnh</span></td>
                <td className="font-medium">35 kg</td>
                <td className="text-muted">1 ngày</td>
                <td><span className="badge badge-danger">72% - Cao</span></td>
                <td className="font-medium text-muted">C-A2-01</td>
                <td>
                  <div className="flex items-center gap-2">
                    <div style={{ height: 6, width: 35, backgroundColor: 'var(--color-danger-500)', borderRadius: 3 }}></div>
                    <span className="font-bold text-danger">91</span>
                  </div>
                </td>
                <td><button className="btn btn-primary" style={{ padding: '0.25rem 0.75rem' }}>Xuất</button></td>
              </tr>
              <tr style={{ backgroundColor: '#fffbeb' }}>
                <td className="font-bold text-danger text-center">3</td>
                <td>
                  <div className="font-semibold">Cà chua bi</div>
                  <div className="text-muted" style={{ fontSize: '0.75rem' }}>LOT-24033</div>
                </td>
                <td><span className="badge badge-neutral" style={{ backgroundColor: '#e0f2fe', color: '#0369a1', border: 'none' }}>Kho lạnh</span></td>
                <td className="font-medium">48 kg</td>
                <td className="text-muted">2 ngày</td>
                <td><span className="badge badge-warning">58% - Trung bình</span></td>
                <td className="font-medium text-muted">C-A3-06</td>
                <td>
                  <div className="flex items-center gap-2">
                    <div style={{ height: 6, width: 30, backgroundColor: 'var(--color-warning-500)', borderRadius: 3 }}></div>
                    <span className="font-bold text-warning">83</span>
                  </div>
                </td>
                <td><button className="btn btn-primary" style={{ padding: '0.25rem 0.75rem' }}>Xuất</button></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default FEFOExport;
