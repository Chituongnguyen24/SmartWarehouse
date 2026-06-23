import React from 'react';
import { Package, AlertCircle, XCircle, Grid } from 'lucide-react';

const mockProducts = [
  { sku: 'VEG-0012', name: 'Cải thìa hữu cơ', category: 'Rau củ quả', zone: 'Kho lạnh', stock: '142 kg', hsd: 5, supplier: 'Nông trại Đà Lạt', status: 'Đủ hàng', statusType: 'success' },
  { sku: 'VEG-0044', name: 'Cà chua bi', category: 'Rau củ quả', zone: 'Kho lạnh', stock: '48 kg', hsd: 8, supplier: 'Nông trại Đà Lạt', status: 'Sắp hết', statusType: 'warning' },
  { sku: 'MEA-0183', name: 'Thịt ba chỉ heo', category: 'Thịt cá', zone: 'Kho đông lạnh', stock: '310 kg', hsd: 90, supplier: 'Vissan', status: 'Đủ hàng', statusType: 'success' },
  { sku: 'FSH-0210', name: 'Cá hồi phi lê', category: 'Thịt cá', zone: 'Kho đông lạnh', stock: '76 kg', hsd: 120, supplier: 'Seafood Co.', status: 'Sắp hết', statusType: 'warning' },
  { sku: 'FRZ-0301', name: 'Tôm sú đông lạnh', category: 'Đông lạnh', zone: 'Kho đông lạnh', stock: '0 kg', hsd: 180, supplier: 'Minh Phú', status: 'Hết hàng', statusType: 'danger' },
  { sku: 'MLK-0428', name: 'Sữa tươi tiệt trùng', category: 'Sữa & đồ uống', zone: 'Kho lạnh', stock: '980 hộp', hsd: 21, supplier: 'Vinamilk', status: 'Đủ hàng', statusType: 'success' },
  { sku: 'DRY-0581', name: 'Mì gói tôm chua cay', category: 'Đồ khô', zone: 'Kho khô', stock: '220 thùng', hsd: 365, supplier: 'Acecook', status: 'Đủ hàng', statusType: 'success' },
  { sku: 'DRY-0633', name: 'Nước khoáng 500ml', category: 'Sữa & đồ uống', zone: 'Kho khô', stock: '540 thùng', hsd: 540, supplier: 'Lavie', status: 'Đủ hàng', statusType: 'success' },
  { sku: 'VEG-0077', name: 'Xà lách Romaine', category: 'Rau củ quả', zone: 'Kho lạnh', stock: '35 kg', hsd: 4, supplier: 'Nông trại Mộc Châu', status: 'Sắp hết', statusType: 'warning' },
  { sku: 'DRY-0612', name: 'Cá hộp sốt cà', category: 'Đồ khô', zone: 'Kho khô', stock: '188 thùng', hsd: 720, supplier: 'Hạ Long Canfoco', status: 'Đủ hàng', statusType: 'success' },
];

const Products = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-6)' }}>
      <div className="flex items-center justify-between">
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.25rem' }}>Sản phẩm & SKU</h2>
          <p className="text-muted" style={{ fontSize: '0.875rem' }}>Quản lý danh mục sản phẩm, mã SKU, điều kiện bảo quản và hạn sử dụng.</p>
        </div>
        <div>
          <button className="btn btn-primary">
            + Thêm sản phẩm
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--spacing-4)' }}>
        <div className="card">
          <div className="card-header">
            <div className="card-title">Tổng SKU</div>
            <div className="card-icon primary"><Package size={18} /></div>
          </div>
          <div className="card-value">10</div>
          <div className="card-desc">đang hoạt động</div>
        </div>
        
        <div className="card">
          <div className="card-header">
            <div className="card-title">Sắp hết hàng</div>
            <div className="card-icon warning" style={{ backgroundColor: 'var(--color-warning-100)', color: 'var(--color-warning-500)' }}><AlertCircle size={18} /></div>
          </div>
          <div className="card-value">3</div>
          <div className="card-desc">cần đặt lại</div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">Hết hàng</div>
            <div className="card-icon danger"><XCircle size={18} /></div>
          </div>
          <div className="card-value">1</div>
          <div className="card-desc">cần nhập gấp</div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">Nhóm hàng</div>
            <div className="card-icon primary"><Grid size={18} /></div>
          </div>
          <div className="card-value">5</div>
          <div className="card-desc">danh mục</div>
        </div>
      </div>

      {/* Table Section */}
      <div className="card" style={{ padding: '0' }}>
        <div style={{ padding: 'var(--spacing-5)', borderBottom: '1px solid var(--color-neutral-200)', display: 'flex', justifyContent: 'space-between' }}>
          <div className="search-bar" style={{ width: '300px', backgroundColor: 'white', border: '1px solid var(--color-neutral-300)' }}>
            <input type="text" placeholder="Tìm theo tên hoặc mã SKU..." />
          </div>
          <div className="flex" style={{ gap: 'var(--spacing-3)' }}>
            <select style={{ padding: '0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-neutral-300)' }}>
              <option>Tất cả nhóm hàng</option>
            </select>
            <select style={{ padding: '0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-neutral-300)' }}>
              <option>Tất cả trạng thái</option>
            </select>
          </div>
        </div>
        
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Mã SKU</th>
                <th>Sản phẩm</th>
                <th>Nhóm hàng</th>
                <th>Khu bảo quản</th>
                <th>Tồn kho</th>
                <th>HSD (ngày)</th>
                <th>Nhà cung cấp</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {mockProducts.map((p, i) => (
                <tr key={i}>
                  <td className="font-medium text-muted">{p.sku}</td>
                  <td className="font-semibold">{p.name}</td>
                  <td>{p.category}</td>
                  <td><span className="badge badge-neutral" style={{backgroundColor: '#e0f2fe', color: '#0369a1', border: 'none'}}>{p.zone}</span></td>
                  <td className="font-medium">{p.stock}</td>
                  <td>{p.hsd}</td>
                  <td>{p.supplier}</td>
                  <td><span className={`badge badge-${p.statusType}`}>{p.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Products;
