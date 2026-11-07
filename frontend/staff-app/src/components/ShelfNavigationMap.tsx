import React from 'react';
import {
  Compass,
  MapPin,
  CheckCircle2,
  Layers,
  ArrowRight,
  Flame,
  Snowflake,
} from 'lucide-react';

interface Props {
  currentShelf: string;
  nextShelves: string[];
}

export const ShelfNavigationMap: React.FC<Props> = ({
  currentShelf,
  nextShelves,
}) => {
  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '20px',
        padding: '16px',
        border: '1.5px solid #e2e8f0',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Compass size={18} color="#0284c7" />
          <span style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
            Lộ Trình Di Chuyển Ngắn Nhất
          </span>
        </div>
        <span style={{ fontSize: '10.5px', color: '#059669', backgroundColor: '#dcfce7', border: '1px solid #bbf7d0', padding: '2px 8px', borderRadius: '999px', fontWeight: 800 }}>
          Tiết kiệm 65% quãng đường
        </span>
      </div>

      {/* Warehouse Layout Grid Visualization */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '8px',
          backgroundColor: '#f8fafc',
          padding: '12px',
          borderRadius: '14px',
          border: '1px solid #e2e8f0',
        }}
      >
        {/* Zone 1: Dry Goods */}
        <div
          style={{
            backgroundColor: currentShelf.includes('A') ? '#eff6ff' : '#ffffff',
            border: `2px solid ${currentShelf.includes('A') ? '#0284c7' : '#e2e8f0'}`,
            borderRadius: '10px',
            padding: '10px 8px',
            textAlign: 'center',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 700 }}>KỆ A1 - A4</div>
          <div style={{ fontSize: '12px', fontWeight: 900, color: '#0f172a', marginTop: '2px' }}>KHO KHÔ</div>
          {currentShelf.includes('A') && (
            <div style={{ fontSize: '9.5px', color: '#0284c7', marginTop: '4px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
              <MapPin size={10} /> Đang ở đây
            </div>
          )}
        </div>

        {/* Zone 2: Cool Storage */}
        <div
          style={{
            backgroundColor: currentShelf.includes('B') ? '#ecfdf5' : '#ffffff',
            border: `2px solid ${currentShelf.includes('B') ? '#059669' : '#e2e8f0'}`,
            borderRadius: '8px',
            padding: '10px 8px',
            textAlign: 'center',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px', fontSize: '10px', color: '#059669', fontWeight: 600 }}>
            <Snowflake size={10} /> 0-4°C
          </div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>KHO LẠNH B</div>
          {currentShelf.includes('B') && (
            <div style={{ fontSize: '9.5px', color: '#059669', marginTop: '4px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
              <MapPin size={10} /> Đang ở đây
            </div>
          )}
        </div>

        {/* Zone 3: Deep Freeze */}
        <div
          style={{
            backgroundColor: currentShelf.includes('C') ? '#eef2ff' : '#ffffff',
            border: `2px solid ${currentShelf.includes('C') ? '#6366f1' : '#e2e8f0'}`,
            borderRadius: '8px',
            padding: '10px 8px',
            textAlign: 'center',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px', fontSize: '10px', color: '#4f46e5', fontWeight: 600 }}>
            <Snowflake size={10} /> -18°C
          </div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>ĐÔNG LẠNH C</div>
          {currentShelf.includes('C') && (
            <div style={{ fontSize: '9.5px', color: '#6366f1', marginTop: '4px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
              <MapPin size={10} /> Đang ở đây
            </div>
          )}
        </div>
      </div>

      {/* Step Sequence Pills */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '12px', overflowX: 'auto', paddingBottom: '4px' }}>
        <span style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 700, whiteSpace: 'nowrap' }}>Lộ trình:</span>
        <span style={{ fontSize: '11px', backgroundColor: '#0284c7', color: '#ffffff', padding: '3px 9px', borderRadius: '6px', fontWeight: 800, whiteSpace: 'nowrap' }}>
          1. {currentShelf}
        </span>
        {nextShelves.map((sh, idx) => (
          <React.Fragment key={idx}>
            <ArrowRight size={12} color="#94a3b8" />
            <span style={{ fontSize: '11px', backgroundColor: '#f1f5f9', color: '#334155', border: '1px solid #e2e8f0', padding: '3px 9px', borderRadius: '6px', fontWeight: 700, whiteSpace: 'nowrap' }}>
              {idx + 2}. {sh}
            </span>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};
