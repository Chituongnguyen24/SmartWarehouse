import React, { useState } from 'react';
import {
  Search,
  ScanBarcode,
  Boxes,
  MapPin,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Snowflake,
  ShieldAlert,
  Zap,
} from 'lucide-react';
import { StockInfo } from '../types';
import { CameraScannerModal } from '../components/CameraScannerModal';

const MOCK_STOCK_DB: Record<string, StockInfo> = {
  'SKU-PORK-01': {
    sku: 'SKU-PORK-01',
    productName: 'Thịt heo xay sạch CP 400g (Lạnh 0-4°C)',
    unit: 'Khay',
    totalStock: 85,
    availableStock: 80,
    shelfLocation: 'Kệ B2-01 (Kho Lạnh B)',
    zone: 'Kho Lạnh (+2°C)',
    lots: [
      { lotCode: 'LOT-0828-C', quantity: 15, expiryDate: '02/09/2026', daysRemaining: 2, status: 'NEAR_EXPIRY' },
      { lotCode: 'LOT-0830-A', quantity: 70, expiryDate: '06/09/2026', daysRemaining: 6, status: 'FRESH' },
    ],
  },
  'SKU-MILK-02': {
    sku: 'SKU-MILK-02',
    productName: 'Sữa tươi Đà Lạt Milk 1L Thanh Trùng',
    unit: 'Chai',
    totalStock: 42,
    availableStock: 40,
    shelfLocation: 'Kệ B2-04 (Kho Lạnh B)',
    zone: 'Kho Lạnh (+4°C)',
    lots: [
      { lotCode: 'LOT-0820-A', quantity: 12, expiryDate: '03/09/2026', daysRemaining: 3, status: 'NEAR_EXPIRY' },
      { lotCode: 'LOT-0825-B', quantity: 30, expiryDate: '10/09/2026', daysRemaining: 10, status: 'FRESH' },
    ],
  },
  'SKU-RICE-03': {
    sku: 'SKU-RICE-03',
    productName: 'Gạo ST25 Ông Cua Túi 5kg',
    unit: 'Túi',
    totalStock: 120,
    availableStock: 115,
    shelfLocation: 'Kệ A1-03 (Kho Khô)',
    zone: 'Kho Khô Thường',
    lots: [
      { lotCode: 'LOT-0810-R', quantity: 120, expiryDate: '15/12/2026', daysRemaining: 106, status: 'FRESH' },
    ],
  },
};

export const StockLookup: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStock, setSelectedStock] = useState<StockInfo | null>(MOCK_STOCK_DB['SKU-PORK-01']);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const handleSearch = (q: string) => {
    setSearchQuery(q);
    const upper = q.toUpperCase().trim();
    if (MOCK_STOCK_DB[upper]) {
      setSelectedStock(MOCK_STOCK_DB[upper]);
    } else {
      const found = Object.values(MOCK_STOCK_DB).find(
        s => s.productName.toLowerCase().includes(q.toLowerCase()) || s.sku.includes(upper)
      );
      if (found) setSelectedStock(found);
    }
  };

  return (
    <div style={{ padding: '16px', paddingBottom: '90px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* Header Search & Barcode Trigger */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          alignItems: 'center',
          backgroundColor: '#0f172a',
          padding: '10px 14px',
          borderRadius: '16px',
          border: '1px solid #1e293b',
        }}
      >
        <Search size={18} color="#94a3b8" />
        <input
          type="text"
          placeholder="Nhập SKU, tên SP, hoặc quét mã..."
          value={searchQuery}
          onChange={e => handleSearch(e.target.value)}
          style={{
            flex: 1,
            backgroundColor: 'transparent',
            border: 'none',
            outline: 'none',
            color: '#ffffff',
            fontSize: '13px',
          }}
        />
        <button
          onClick={() => setIsScannerOpen(true)}
          style={{
            backgroundColor: '#0284c7',
            color: '#ffffff',
            border: 'none',
            borderRadius: '10px',
            padding: '8px 12px',
            fontSize: '11.5px',
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <ScanBarcode size={16} />
          <span>Quét</span>
        </button>
      </div>

      {/* Quick Filter Chips */}
      <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
        {['SKU-PORK-01', 'SKU-MILK-02', 'SKU-RICE-03'].map(sku => (
          <button
            key={sku}
            onClick={() => handleSearch(sku)}
            style={{
              backgroundColor: selectedStock?.sku === sku ? '#0284c7' : '#0f172a',
              color: '#ffffff',
              border: '1px solid #334155',
              borderRadius: '999px',
              padding: '5px 12px',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {sku}
          </button>
        ))}
      </div>

      {/* Stock Information Card */}
      {selectedStock ? (
        <div
          style={{
            backgroundColor: '#0f172a',
            borderRadius: '20px',
            padding: '18px',
            border: '1px solid #1e293b',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', backgroundColor: '#0369a1', color: '#ffffff', padding: '3px 8px', borderRadius: '6px', fontWeight: 900 }}>
              {selectedStock.sku}
            </span>
            <span style={{ fontSize: '11px', color: '#38bdf8', fontWeight: 700 }}>
              📍 {selectedStock.shelfLocation}
            </span>
          </div>

          <h2 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: 900, color: '#ffffff' }}>
            {selectedStock.productName}
          </h2>

          {/* Stock Metrics */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '10px',
              backgroundColor: '#020617',
              padding: '14px',
              borderRadius: '14px',
              border: '1px solid #1e293b',
              marginBottom: '16px',
            }}
          >
            <div>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>Tồn Kho Thực Tế</div>
              <div style={{ fontSize: '20px', fontWeight: 900, color: '#ffffff', marginTop: '2px' }}>
                {selectedStock.totalStock} <span style={{ fontSize: '13px', color: '#94a3b8' }}>{selectedStock.unit}</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>Khả Dụng (Sẵn Sàng)</div>
              <div style={{ fontSize: '20px', fontWeight: 900, color: '#34d399', marginTop: '2px' }}>
                {selectedStock.availableStock} <span style={{ fontSize: '13px', color: '#94a3b8' }}>{selectedStock.unit}</span>
              </div>
            </div>
          </div>

          {/* FEFO Batches List */}
          <div>
            <div style={{ fontSize: '12px', fontWeight: 800, color: '#cbd5e1', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={14} color="#f59e0b" />
              <span>DANH SÁCH LÔ HÀNG (CHIẾN LƯỢC FEFO XUẤT TRƯỚC):</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {selectedStock.lots.map(lot => {
                const isNearExpiry = lot.status === 'NEAR_EXPIRY';

                return (
                  <div
                    key={lot.lotCode}
                    style={{
                      backgroundColor: isNearExpiry ? 'rgba(239, 68, 68, 0.1)' : '#020617',
                      border: `1px solid ${isNearExpiry ? '#ef4444' : '#1e293b'}`,
                      borderRadius: '12px',
                      padding: '12px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 900, color: '#ffffff' }}>{lot.lotCode}</span>
                        {isNearExpiry && (
                          <span style={{ fontSize: '9px', backgroundColor: '#ef4444', color: '#fff', padding: '1px 5px', borderRadius: '4px', fontWeight: 900 }}>
                            Ưu Tiên Xuất Trước
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '11px', color: isNearExpiry ? '#fca5a5' : '#94a3b8', marginTop: '2px' }}>
                        Hạn: <b>{lot.expiryDate}</b> (Còn {lot.daysRemaining} ngày)
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '14px', fontWeight: 900, color: '#ffffff' }}>
                        {lot.quantity} {selectedStock.unit}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
          <Boxes size={40} style={{ margin: '0 auto 10px' }} />
          <p style={{ fontSize: '13px', fontWeight: 700 }}>Không tìm thấy sản phẩm</p>
        </div>
      )}

      {/* Camera Scanner Modal */}
      <CameraScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        title="Quét Mã Vạch Tra Cứu Tồn Kho"
        onScanResult={(code) => {
          handleSearch(code);
        }}
        mockCodes={['SKU-PORK-01', 'SKU-MILK-02', 'SKU-RICE-03']}
      />

    </div>
  );
};
