import React, { useState, useEffect } from 'react';
import { getApiHost } from '@/shared/utils/apiConfig';
import {
  TrendingUp,
  AlertTriangle,
  Clock,
  Tag,
  ShoppingBag,
  Zap,
  Filter,
  Search,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowRight,
  Flame,
} from 'lucide-react';

export interface FefoLotItem {
  id: string;
  lotCode: string;
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  remainingQty: number;
  zone: string;
  location: string;
  warehouseCode: string;
  expiryDate: string;
  importDate?: string;
  riskScore: number;
  status: string;
  price?: number;
  unit?: string;
  daysLeft: number;
  suggestedDiscountRate: number;
  discountedPrice: number;
}

interface FefoClearancePanelProps {
  onAddFefoToOrder: (item: {
    id: string;
    sku: string;
    name: string;
    category?: string;
    price: number;
    originalPrice: number;
    unit: string;
    stock: number;
    zone: string;
    discountRate: number;
    lotCode: string;
    expiryDate: string;
  }) => void;
  showToast: (msg: string) => void;
  productsMap: Record<string, { price: number; unit: string; category?: string }>;
}

export const FefoClearancePanel: React.FC<FefoClearancePanelProps> = ({
  onAddFefoToOrder,
  showToast,
  productsMap,
}) => {
  const [fefoLots, setFefoLots] = useState<FefoLotItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterWarehouse, setFilterWarehouse] = useState('ALL');
  const [filterUrgency, setFilterUrgency] = useState<'ALL' | 'CRITICAL' | 'URGENT' | 'MONITOR'>('ALL');
  const [search, setSearch] = useState('');

  const fetchFefoLots = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${getApiHost(3011)}/inventory/expiry-alert?days=45`);
      if (res.ok) {
        const rawLots: any[] = await res.json();
        const now = Date.now();

        const mapped: FefoLotItem[] = rawLots.map(lot => {
          const expTime = new Date(lot.expiryDate).getTime();
          const daysLeft = Math.max(0, Math.ceil((expTime - now) / (1000 * 60 * 60 * 24)));

          // Gợi ý mức giảm giá tự động dựa theo số ngày cận hạn
          let discountRate = 15;
          if (daysLeft <= 3) discountRate = 60;
          else if (daysLeft <= 7) discountRate = 40;
          else if (daysLeft <= 15) discountRate = 25;

          const prodInfo = productsMap[lot.sku] || productsMap[lot.productId] || { price: 45000, unit: 'Kg' };
          const originalPrice = prodInfo.price || 45000;
          const discountedPrice = Math.round(originalPrice * (1 - discountRate / 100));

          return {
            id: lot.id,
            lotCode: lot.lotCode || `LOT-${lot.id.substring(0, 6)}`,
            productId: lot.productId,
            productName: lot.productName && lot.productName !== 'Unknown' ? lot.productName : `Sản phẩm ${lot.sku || lot.productId}`,
            sku: lot.sku && lot.sku !== 'Unknown' ? lot.sku : lot.productId,
            quantity: Number(lot.quantity) || 0,
            remainingQty: Number(lot.remainingQty) || Number(lot.quantity) || 0,
            zone: lot.zone || 'COLD',
            location: lot.location || 'Kệ kho lạnh',
            warehouseCode: lot.warehouseCode || 'WH-006',
            expiryDate: lot.expiryDate,
            importDate: lot.importDate,
            riskScore: Number(lot.riskScore) || 0,
            status: lot.status || 'NORMAL',
            price: originalPrice,
            unit: prodInfo.unit || 'Kg',
            daysLeft,
            suggestedDiscountRate: discountRate,
            discountedPrice,
          };
        });

        // Sắp xếp ưu tiên các lô còn ít ngày nhất lên trước
        mapped.sort((a, b) => a.daysLeft - b.daysLeft);
        setFefoLots(mapped);
      }
    } catch (err) {
      console.error('Error fetching FEFO lots:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFefoLots();
  }, [productsMap]);

  const filteredLots = fefoLots.filter(lot => {
    const q = search.trim().toLowerCase();
    const matchSearch =
      !q ||
      lot.productName.toLowerCase().includes(q) ||
      lot.sku.toLowerCase().includes(q) ||
      lot.lotCode.toLowerCase().includes(q) ||
      lot.location.toLowerCase().includes(q);

    const matchWh = filterWarehouse === 'ALL' || lot.warehouseCode === filterWarehouse;

    let matchUrgency = true;
    if (filterUrgency === 'CRITICAL') matchUrgency = lot.daysLeft <= 3;
    else if (filterUrgency === 'URGENT') matchUrgency = lot.daysLeft > 3 && lot.daysLeft <= 7;
    else if (filterUrgency === 'MONITOR') matchUrgency = lot.daysLeft > 7;

    return matchSearch && matchWh && matchUrgency;
  });

  const criticalCount = fefoLots.filter(l => l.daysLeft <= 3).length;
  const urgentCount = fefoLots.filter(l => l.daysLeft > 3 && l.daysLeft <= 7).length;
  const totalStockAtRisk = fefoLots.reduce((acc, l) => acc + l.remainingQty, 0);
  const totalRiskValue = fefoLots.reduce((acc, l) => acc + (l.price || 0) * l.remainingQty, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* KPI Báo Cáo Hạn Dùng */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <div style={kpiCardStyle}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>TỔNG LÔ CẬN HẠN CẦN GIẢI PHÓNG</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', marginTop: 4 }}>
            {fefoLots.length} <span style={{ fontSize: '0.85rem', fontWeight: 400, color: '#64748b' }}>lô hàng</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 4 }}>
            Thời hạn dùng $\le 45$ ngày
          </div>
        </div>

        <div style={{ ...kpiCardStyle, borderLeft: '4px solid #dc2626' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#991b1b' }}>LÔ NGUY CƠ CAO (DƯỚI 3 NGÀY)</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#dc2626', marginTop: 4 }}>
            {criticalCount} <span style={{ fontSize: '0.85rem', fontWeight: 400, color: '#64748b' }}>lô khẩn cấp</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#991b1b', marginTop: 4 }}>
            Cần xả thanh lý ngay hôm nay
          </div>
        </div>

        <div style={{ ...kpiCardStyle, borderLeft: '4px solid #d97706' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#92400e' }}>LÔ CẬN HẠN TUẦN (4 - 7 NGÀY)</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#d97706', marginTop: 4 }}>
            {urgentCount} <span style={{ fontSize: '0.85rem', fontWeight: 400, color: '#64748b' }}>lô ưu tiên</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#92400e', marginTop: 4 }}>
            Ưu tiên chiết khấu 40% cho chuỗi F&B
          </div>
        </div>

        <div style={kpiCardStyle}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>GIÁ TRỊ VỐN BẢO TOÀN DỰ KIẾN</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#059669', marginTop: 4 }}>
            {(totalRiskValue / 1000000).toFixed(1)} <span style={{ fontSize: '0.85rem', fontWeight: 400, color: '#64748b' }}>triệu</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#166534', marginTop: 4 }}>
            Tương đương {totalStockAtRisk.toLocaleString('vi-VN')} đơn vị tồn
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
          backgroundColor: '#ffffff',
          padding: '12px 16px',
          borderRadius: 8,
          border: '1px solid #e2e8f0',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 280 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Tìm theo tên sản phẩm, mã SKU, mã lô, vị trí kệ..."
              style={{
                width: '100%',
                padding: '7px 12px 7px 32px',
                borderRadius: 6,
                border: '1px solid #cbd5e1',
                fontSize: '0.85rem',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <select
            value={filterWarehouse}
            onChange={e => setFilterWarehouse(e.target.value)}
            style={selectStyle}
          >
            <option value="ALL">Tất Cả Kho Hàng</option>
            <option value="WH-006">Tổng Kho Gò Vấp (WH-006)</option>
            <option value="WH-001">Kho Bình Thạnh (WH-001)</option>
            <option value="WH-002">Kho Tân Bình (WH-002)</option>
          </select>

          <select
            value={filterUrgency}
            onChange={e => setFilterUrgency(e.target.value as any)}
            style={selectStyle}
          >
            <option value="ALL">Mức Độ Cận Hạn: Tất Cả</option>
            <option value="CRITICAL">Khẩn cấp (≤ 3 ngày)</option>
            <option value="URGENT">Cận hạn tuần (4 - 7 ngày)</option>
            <option value="MONITOR">Theo dõi (8 - 45 ngày)</option>
          </select>
        </div>

        <button
          onClick={fetchFefoLots}
          style={{
            padding: '7px 14px',
            borderRadius: 6,
            border: '1px solid #cbd5e1',
            backgroundColor: '#ffffff',
            color: '#334155',
            fontSize: '0.85rem',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Làm Mới Lô Hàng
        </button>
      </div>

      {/* FEFO Lot Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1rem' }}>
        {filteredLots.map(lot => {
          const isCritical = lot.daysLeft <= 3;
          const isUrgent = lot.daysLeft > 3 && lot.daysLeft <= 7;

          const urgencyBg = isCritical ? '#fef2f2' : isUrgent ? '#fffbeb' : '#f0fdf4';
          const urgencyColor = isCritical ? '#991b1b' : isUrgent ? '#92400e' : '#166534';
          const urgencyBorder = isCritical ? '#fecaca' : isUrgent ? '#fde68a' : '#bbf7d0';

          return (
            <div
              key={lot.id}
              style={{
                backgroundColor: '#ffffff',
                borderRadius: 8,
                border: isCritical ? '1px solid #f87171' : '1px solid #e2e8f0',
                padding: '14px 16px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: 10,
                boxShadow: isCritical ? '0 2px 4px rgba(220, 38, 38, 0.06)' : '0 1px 2px rgba(0,0,0,0.03)',
              }}
            >
              <div>
                {/* Header row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <div>
                    <span
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: 4,
                        fontFamily: 'monospace',
                        backgroundColor: '#f1f5f9',
                        color: '#475569',
                        border: '1px solid #e2e8f0',
                      }}
                    >
                      {lot.lotCode}
                    </span>
                    <h4 style={{ fontSize: '0.925rem', fontWeight: 700, color: '#0f172a', margin: '6px 0 2px 0', lineClamp: 2 }}>
                      {lot.productName}
                    </h4>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      SKU: <strong style={{ color: '#334155' }}>{lot.sku}</strong> | Vị trí: <strong style={{ color: '#0284c7' }}>{lot.location}</strong> ({lot.warehouseCode})
                    </div>
                  </div>

                  <div
                    style={{
                      padding: '4px 8px',
                      borderRadius: 6,
                      backgroundColor: urgencyBg,
                      color: urgencyColor,
                      border: `1px solid ${urgencyBorder}`,
                      textAlign: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <div style={{ fontSize: '0.65rem', fontWeight: 600 }}>CÒN LẠI</div>
                    <div style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'monospace' }}>
                      {lot.daysLeft} ngày
                    </div>
                  </div>
                </div>

                {/* Expiry & Stock info */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, padding: '8px 10px', backgroundColor: '#f8fafc', borderRadius: 6, fontSize: '0.78rem' }}>
                  <div>
                    <span style={{ color: '#64748b' }}>Hạn dùng: </span>
                    <strong style={{ color: urgencyColor }}>{new Date(lot.expiryDate).toLocaleDateString('vi-VN')}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Tồn lô: </span>
                    <strong style={{ color: '#0f172a' }}>{lot.remainingQty} {lot.unit}</strong>
                  </div>
                </div>

                {/* Pricing comparison */}
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 10 }}>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: '#94a3b8', textDecoration: 'line-through' }}>
                      {(lot.price || 0).toLocaleString('vi-VN')}đ
                    </span>
                    <span style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f766e', marginLeft: 8 }}>
                      {lot.discountedPrice.toLocaleString('vi-VN')}đ / {lot.unit}
                    </span>
                  </div>

                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 4,
                      backgroundColor: '#fef2f2',
                      color: '#dc2626',
                      border: '1px solid #fecaca',
                    }}
                  >
                    -{lot.suggestedDiscountRate}% FEFO
                  </span>
                </div>
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: 8, borderTop: '1px solid #f1f5f9', paddingTop: 10 }}>
                <button
                  onClick={() => {
                    onAddFefoToOrder({
                      id: lot.productId,
                      sku: lot.sku,
                      name: lot.productName,
                      price: lot.discountedPrice,
                      originalPrice: lot.price || 45000,
                      unit: lot.unit || 'Kg',
                      stock: lot.remainingQty,
                      zone: lot.zone,
                      discountRate: lot.suggestedDiscountRate,
                      lotCode: lot.lotCode,
                      expiryDate: lot.expiryDate,
                    });
                    showToast(`Đã thêm ${lot.productName} (Lô ${lot.lotCode}) vào đơn hàng B2B.`);
                  }}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: 'none',
                    backgroundColor: '#0f766e',
                    color: '#ffffff',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  <ShoppingBag size={14} /> Đưa Vào Đơn B2B
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredLots.length === 0 && !loading && (
        <div style={{ textAlign: 'center', padding: '3rem', backgroundColor: '#ffffff', borderRadius: 8, border: '1px dashed #cbd5e1' }}>
          <CheckCircle2 size={36} color="#059669" style={{ margin: '0 auto 8px auto' }} />
          <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#334155', margin: 0 }}>
            Tồn kho an toàn, không có lô hàng nào cận hạn
          </h4>
          <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 4 }}>
            Toàn bộ các lô hàng trong kho đều có hạn sử dụng trên 45 ngày đạt tiêu chuẩn xuất khẩu & phân phối
          </p>
        </div>
      )}
    </div>
  );
};

const kpiCardStyle: React.CSSProperties = {
  backgroundColor: '#ffffff',
  borderRadius: 8,
  padding: '14px 16px',
  border: '1px solid #e2e8f0',
  boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
};

const selectStyle: React.CSSProperties = {
  padding: '7px 12px',
  borderRadius: 6,
  border: '1px solid #cbd5e1',
  fontSize: '0.85rem',
  color: '#334155',
  backgroundColor: '#ffffff',
  outline: 'none',
};
