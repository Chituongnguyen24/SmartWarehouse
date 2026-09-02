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
        backgroundColor: '#0f172a',
        borderRadius: '20px',
        padding: '16px',
        border: '1px solid #1e293b',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Compass size={18} color="#38bdf8" />
          <span style={{ fontSize: '12.5px', fontWeight: 800, color: '#ffffff' }}>
            Lộ Trình Đi Bộ Ngắn Nhất (FEFO Route)
          </span>
        </div>
        <span style={{ fontSize: '10px', color: '#10b981', backgroundColor: '#064e3b', padding: '2px 8px', borderRadius: '999px', fontWeight: 800 }}>
          Tiết kiệm 65% quãng đường
        </span>
      </div>

      {/* Warehouse Layout Grid Visualization */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '8px',
          backgroundColor: '#020617',
          padding: '12px',
          borderRadius: '14px',
          border: '1px solid #1e293b',
        }}
      >
        {/* Zone 1: Dry Goods */}
        <div
          style={{
            backgroundColor: currentShelf.includes('A') ? 'rgba(56, 189, 248, 0.2)' : '#0f172a',
            border: `2px solid ${currentShelf.includes('A') ? '#38bdf8' : '#334155'}`,
            borderRadius: '10px',
            padding: '10px 8px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 700 }}>KỆ A1 - A4</div>
          <div style={{ fontSize: '12px', fontWeight: 900, color: '#ffffff', marginTop: '2px' }}>KHO KHÔ</div>
          {currentShelf.includes('A') && (
            <div style={{ fontSize: '9px', color: '#38bdf8', marginTop: '4px', fontWeight: 800 }}>
              📍 Đang ở đây
            </div>
          )}
        </div>

        {/* Zone 2: Cool Storage */}
        <div
          style={{
            backgroundColor: currentShelf.includes('B') ? 'rgba(52, 211, 153, 0.2)' : '#0f172a',
            border: `2px solid ${currentShelf.includes('B') ? '#34d399' : '#334155'}`,
            borderRadius: '10px',
            padding: '10px 8px',
            textAlign: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px', fontSize: '10px', color: '#6ee7b7' }}>
            <Snowflake size={10} /> 0-4°C
          </div>
          <div style={{ fontSize: '12px', fontWeight: 900, color: '#ffffff', marginTop: '2px' }}>KHO LẠNH B</div>
          {currentShelf.includes('B') && (
            <div style={{ fontSize: '9px', color: '#34d399', marginTop: '4px', fontWeight: 800 }}>
              📍 Đang ở đây
            </div>
          )}
        </div>

        {/* Zone 3: Deep Freeze */}
        <div
          style={{
            backgroundColor: currentShelf.includes('C') ? 'rgba(129, 140, 248, 0.2)' : '#0f172a',
            border: `2px solid ${currentShelf.includes('C') ? '#818cf8' : '#334155'}`,
            borderRadius: '10px',
            padding: '10px 8px',
            textAlign: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px', fontSize: '10px', color: '#a5b4fc' }}>
            <Snowflake size={10} /> -18°C
          </div>
          <div style={{ fontSize: '12px', fontWeight: 900, color: '#ffffff', marginTop: '2px' }}>ĐÔNG LẠNH C</div>
          {currentShelf.includes('C') && (
            <div style={{ fontSize: '9px', color: '#818cf8', marginTop: '4px', fontWeight: 800 }}>
              📍 Đang ở đây
            </div>
          )}
        </div>
      </div>

      {/* Step Sequence Pills */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '12px', overflowX: 'auto', paddingBottom: '4px' }}>
        <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, whiteSpace: 'nowrap' }}>Lộ trình:</span>
        <span style={{ fontSize: '11px', backgroundColor: '#0284c7', color: '#ffffff', padding: '3px 8px', borderRadius: '6px', fontWeight: 800, whiteSpace: 'nowrap' }}>
          1. {currentShelf}
        </span>
        {nextShelves.map((sh, idx) => (
          <React.Fragment key={idx}>
            <ArrowRight size={12} color="#64748b" />
            <span style={{ fontSize: '11px', backgroundColor: '#1e293b', color: '#cbd5e1', padding: '3px 8px', borderRadius: '6px', fontWeight: 700, whiteSpace: 'nowrap' }}>
              {idx + 2}. {sh}
            </span>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};
