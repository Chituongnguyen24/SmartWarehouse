import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Layers, Thermometer, Wind, Zap, AlertTriangle, Search, X, Package, Box, Wrench, ChevronRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import '../styles/warehouse-layout.css';

// ─── Types ───────────────────────────────────────────────
interface Slot {
  id: string;
  code: string;
  status: 'EMPTY' | 'OCCUPIED' | 'FULL' | 'MAINTENANCE';
  lotCode: string | null;
  productSku: string | null;
}

interface Shelf {
  shelfCode: string;
  shelfName: string;
  floor: number;
  maxSlots: number;
  usedSlots: number;
  slots: Slot[];
}

type ZoneKey = 'COLD' | 'FROZEN' | 'DRY';
type ViewMode = 'CAPACITY' | 'TEMPERATURE';

// ─── Constants ───────────────────────────────────────────
const API_BASE = 'http://localhost:3005'; // warehouse-service

const ZONE_CONFIG: Record<ZoneKey, { name: string; temp: string; color: string; iconColor: string }> = {
  COLD:   { name: 'Kho Mát',         temp: '2°C – 8°C',       color: '#0ea5e9', iconColor: 'text-info'    },
  FROZEN: { name: 'Kho Đông Lạnh',   temp: '-18°C – -25°C',   color: '#6366f1', iconColor: 'text-primary' },
  DRY:    { name: 'Kho Khô',         temp: '15°C – 25°C',     color: '#f59e0b', iconColor: 'text-warning' },
};

const ZONE_ICONS: Record<ZoneKey, React.ReactNode> = {
  COLD:   <Wind size={16} />,
  FROZEN: <Thermometer size={16} />,
  DRY:    <Zap size={16} />,
};

// ─── Helper: get slot CSS class based on view mode ───────
function getSlotClass(slot: Slot, viewMode: ViewMode, slotIndex: number): string {
  if (viewMode === 'CAPACITY') {
    switch (slot.status) {
      case 'EMPTY':       return 'wh-slot--empty';
      case 'OCCUPIED':    return 'wh-slot--occupied';
      case 'FULL':        return 'wh-slot--full';
      case 'MAINTENANCE': return 'wh-slot--maintenance';
      default:            return '';
    }
  }
  // Temperature heatmap (simulated)
  if (slot.status === 'EMPTY') return 'wh-slot--temp-empty';
  const tempFactor = (slotIndex % 4) / 3;
  if (tempFactor < 0.3) return 'wh-slot--temp-cold';
  if (tempFactor < 0.7) return 'wh-slot--temp-optimal';
  if (tempFactor < 0.9) return 'wh-slot--temp-warm';
  return 'wh-slot--temp-hot';
}

function getSlotTooltip(slot: Slot, viewMode: ViewMode): string {
  let tip = slot.code;
  if (viewMode === 'CAPACITY') {
    if (slot.status === 'EMPTY')       tip += ' (Trống)';
    else if (slot.status === 'OCCUPIED') tip += ` – Lô: ${slot.lotCode}`;
    else if (slot.status === 'FULL')   tip += ` – Lô: ${slot.lotCode} (Đầy)`;
    else if (slot.status === 'MAINTENANCE') tip += ' (Bảo trì)';
  } else {
    if (slot.status !== 'EMPTY') tip += ' – Nhiệt độ mô phỏng';
  }
  return tip;
}

// ─── Sub-components ──────────────────────────────────────

/** Single slot cell on the 2D map */
const SlotCell: React.FC<{
  slot: Slot;
  index: number;
  viewMode: ViewMode;
  isHighlighted: boolean;
  canManage: boolean;
  onClick: (slot: Slot) => void;
}> = React.memo(({ slot, index, viewMode, isHighlighted, canManage, onClick }) => {
  const cls = [
    'wh-slot',
    getSlotClass(slot, viewMode, index),
    isHighlighted ? 'wh-slot--highlighted' : '',
    !canManage ? 'wh-slot--readonly' : '',
  ].filter(Boolean).join(' ');

  return (
    <div
      className={cls}
      title={getSlotTooltip(slot, viewMode)}
      onClick={() => canManage && onClick(slot)}
    >
      {slot.code.split('-').pop()}
    </div>
  );
});

/** Rack grid on the 2D floor plan */
const RackView: React.FC<{
  shelf: Shelf;
  viewMode: ViewMode;
  searchQuery: string;
  canManage: boolean;
  onSlotClick: (slot: Slot) => void;
  onRackClick: (shelf: Shelf) => void;
}> = React.memo(({ shelf, viewMode, searchQuery, canManage, onSlotClick, onRackClick }) => {
  const q = searchQuery.toLowerCase();

  return (
    <div className="wh-rack" onClick={() => onRackClick(shelf)}>
      <div className="wh-rack__label">{shelf.shelfName}</div>
      <div className="wh-rack__grid" onClick={(e) => e.stopPropagation()}>
        {shelf.slots.map((slot, idx) => {
          const isHighlighted = q !== '' && (
            slot.code.toLowerCase().includes(q) ||
            (slot.lotCode && slot.lotCode.toLowerCase().includes(q)) ||
            (slot.productSku && slot.productSku.toLowerCase().includes(q))
          );
          return (
            <SlotCell
              key={slot.id}
              slot={slot}
              index={idx}
              viewMode={viewMode}
              isHighlighted={!!isHighlighted}
              canManage={canManage}
              onClick={onSlotClick}
            />
          );
        })}
      </div>
    </div>
  );
});

/** Elevation (front) view panel for a rack */
const ElevationPanel: React.FC<{
  shelf: Shelf;
  canManage: boolean;
  onSlotClick: (slot: Slot) => void;
  onClose: () => void;
}> = ({ shelf, canManage, onSlotClick, onClose }) => {
  // Group slots by virtual floors (4 slots per floor row)
  const floors: Slot[][] = [];
  for (let i = 0; i < shelf.slots.length; i += 4) {
    floors.push(shelf.slots.slice(i, i + 4));
  }
  // Reverse so highest floor is at top (like a real rack viewed from front)
  floors.reverse();

  const emptyCnt = shelf.slots.filter(s => s.status === 'EMPTY').length;
  const occCnt = shelf.slots.filter(s => s.status === 'OCCUPIED').length;
  const fullCnt = shelf.slots.filter(s => s.status === 'FULL').length;
  const maintCnt = shelf.slots.filter(s => s.status === 'MAINTENANCE').length;

  const getElevSlotClass = (slot: Slot) => {
    switch (slot.status) {
      case 'EMPTY':       return 'wh-elevation__slot--empty';
      case 'OCCUPIED':    return 'wh-elevation__slot--occupied';
      case 'FULL':        return 'wh-elevation__slot--full';
      case 'MAINTENANCE': return 'wh-elevation__slot--maintenance';
      default: return '';
    }
  };

  return (
    <>
      <div className="wh-elevation-overlay" onClick={onClose} />
      <div className="wh-elevation">
        <div className="wh-elevation__header">
          <h3 className="wh-elevation__title">
            <Layers size={20} />
            {shelf.shelfName} – Mặt đứng (Elevation)
          </h3>
          <button className="wh-elevation__close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Stats */}
        <div className="wh-elevation__stats">
          <div className="wh-elevation__stat wh-elevation__stat--success">
            <span className="wh-elevation__stat-value">{emptyCnt}</span>
            <span className="wh-elevation__stat-label">Trống</span>
          </div>
          <div className="wh-elevation__stat wh-elevation__stat--primary">
            <span className="wh-elevation__stat-value">{occCnt + fullCnt}</span>
            <span className="wh-elevation__stat-label">Đang dùng</span>
          </div>
          <div className="wh-elevation__stat wh-elevation__stat--warning">
            <span className="wh-elevation__stat-value">{maintCnt}</span>
            <span className="wh-elevation__stat-label">Bảo trì</span>
          </div>
        </div>

        {/* Floor rows */}
        <div className="wh-elevation__body">
          {floors.map((floorSlots, fi) => (
            <div key={fi} className="wh-elevation__floor">
              <div className="wh-elevation__floor-label">
                Tầng {floors.length - fi}
              </div>
              <div className="wh-elevation__slots">
                {floorSlots.map(slot => (
                  <div
                    key={slot.id}
                    className={`wh-elevation__slot ${getElevSlotClass(slot)}`}
                    title={getSlotTooltip(slot, 'CAPACITY')}
                    onClick={() => canManage && onSlotClick(slot)}
                  >
                    <span className="wh-elevation__slot-code">{slot.code.split('-').pop()}</span>
                    <span className="wh-elevation__slot-info">
                      {slot.status === 'EMPTY' && 'Trống'}
                      {slot.status === 'OCCUPIED' && (slot.lotCode || 'Có hàng')}
                      {slot.status === 'FULL' && 'Đầy'}
                      {slot.status === 'MAINTENANCE' && 'Bảo trì'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

// ═══════════════════════════════════════════════════════════
//  Main Component
// ═══════════════════════════════════════════════════════════
const ShelfArrangement: React.FC = () => {
  const { token, user } = useAuth();
  const [activeZone, setActiveZone] = useState<ZoneKey>('COLD');
  const [shelves, setShelves] = useState<Shelf[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal & panel states
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [elevationShelf, setElevationShelf] = useState<Shelf | null>(null);
  const [assignForm, setAssignForm] = useState({ lotId: '', lotCode: '', productSku: '', weightKg: 0 });

  // View controls
  const [viewMode, setViewMode] = useState<ViewMode>('CAPACITY');
  const [searchQuery, setSearchQuery] = useState('');

  const canManage = user?.role === 'ADMIN' || user?.role === 'WAREHOUSE_MANAGER' || user?.role === 'WAREHOUSE_STAFF';

  // ── Data fetching ──
  const fetchShelves = useCallback(async (zone: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/storage-slots/map/${zone}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Lỗi khi tải dữ liệu sơ đồ kho');
      const data = await res.json();
      setShelves(data.shelves || []);
    } catch (err: any) {
      setError(err.message || 'Lỗi không xác định');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchShelves(activeZone);
  }, [activeZone, fetchShelves]);

  // ── Computed stats ──
  const stats = useMemo(() => {
    const totalSlots = shelves.reduce((sum, s) => sum + s.maxSlots, 0);
    const usedSlots = shelves.reduce((sum, s) => sum + s.usedSlots, 0);
    const fillRate = totalSlots > 0 ? Math.round((usedSlots / totalSlots) * 100) : 0;
    return { totalSlots, usedSlots, fillRate };
  }, [shelves]);

  // ── Search match count ──
  const matchCount = useMemo(() => {
    if (!searchQuery) return 0;
    const q = searchQuery.toLowerCase();
    return shelves.reduce((count, shelf) =>
      count + shelf.slots.filter(slot =>
        slot.code.toLowerCase().includes(q) ||
        (slot.lotCode && slot.lotCode.toLowerCase().includes(q)) ||
        (slot.productSku && slot.productSku.toLowerCase().includes(q))
      ).length
    , 0);
  }, [shelves, searchQuery]);

  // ── Handlers ──
  const handleSlotClick = useCallback((slot: Slot) => {
    if (!canManage) return;
    setSelectedSlot(slot);
    setAssignForm({ lotId: '', lotCode: '', productSku: '', weightKg: 0 });
  }, [canManage]);

  const handleRackClick = useCallback((shelf: Shelf) => {
    setElevationShelf(shelf);
  }, []);

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot) return;
    try {
      const res = await fetch(`${API_BASE}/storage-slots/${selectedSlot.id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(assignForm)
      });
      if (res.ok) {
        setSelectedSlot(null);
        fetchShelves(activeZone);
      } else {
        const err = await res.json();
        alert(`Lỗi: ${err.message}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRelease = async () => {
    if (!selectedSlot) return;
    try {
      const res = await fetch(`${API_BASE}/storage-slots/${selectedSlot.id}/release`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setSelectedSlot(null);
        fetchShelves(activeZone);
      } else {
        const err = await res.json();
        alert(`Lỗi: ${err.message}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleMaintenance = async () => {
    if (!selectedSlot) return;
    try {
      const res = await fetch(`${API_BASE}/storage-slots/${selectedSlot.id}/maintenance`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setSelectedSlot(null);
        fetchShelves(activeZone);
      } else {
        const err = await res.json();
        alert(`Lỗi: ${err.message}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // ── Group shelves into aisle pairs ──
  const aislePairs = useMemo(() => {
    const pairs: { a: Shelf; b: Shelf | null }[] = [];
    for (let i = 0; i < shelves.length; i += 2) {
      pairs.push({ a: shelves[i], b: shelves[i + 1] || null });
    }
    return pairs;
  }, [shelves]);

  // ═══════════════════════════════════════════════════
  //  Render
  // ═══════════════════════════════════════════════════
  return (
    <div className="wh-layout">

      {/* ── Header ── */}
      <div className="wh-header">
        <div>
          <h2 className="wh-header__title">
            <Layers size={22} />
            Sơ đồ Kho hàng
          </h2>
          <p className="wh-header__subtitle">
            Bản đồ 2D thời gian thực — Click vào kệ để xem mặt đứng, click vào ô để thao tác gán/rút hàng.
          </p>
        </div>
      </div>

      {/* ── Zone Tabs ── */}
      <div className="wh-zone-tabs">
        {(Object.keys(ZONE_CONFIG) as ZoneKey[]).map(zoneKey => (
          <button
            key={zoneKey}
            className={`wh-zone-tab ${activeZone === zoneKey ? 'wh-zone-tab--active' : ''}`}
            onClick={() => setActiveZone(zoneKey)}
          >
            <span className={`wh-zone-tab__indicator wh-zone-tab__indicator--${zoneKey.toLowerCase()}`} />
            {ZONE_ICONS[zoneKey]}
            {ZONE_CONFIG[zoneKey].name}
          </button>
        ))}
      </div>

      {/* ── Smart Toolbar ── */}
      <div className="wh-toolbar">
        <div className="wh-search">
          <Search size={18} className="wh-search__icon" />
          <input
            type="text"
            className="wh-search__input"
            placeholder="Tìm kiếm mã lô, SKU hoặc vị trí..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && matchCount > 0 && (
            <span className="wh-search__badge">{matchCount} kết quả</span>
          )}
          {searchQuery && (
            <button className="wh-search__clear" onClick={() => setSearchQuery('')}>
              <X size={14} />
            </button>
          )}
        </div>

        <div className="wh-view-toggle">
          <button
            className={`wh-view-toggle__btn ${viewMode === 'CAPACITY' ? 'wh-view-toggle__btn--active' : ''}`}
            onClick={() => setViewMode('CAPACITY')}
          >
            <Package size={15} />
            Sức chứa
          </button>
          <button
            className={`wh-view-toggle__btn ${viewMode === 'TEMPERATURE' ? 'wh-view-toggle__btn--active' : ''}`}
            onClick={() => setViewMode('TEMPERATURE')}
          >
            <Thermometer size={15} />
            Bản đồ nhiệt
          </button>
        </div>
      </div>

      {/* ── Legend & Stats Bar ── */}
      <div className="wh-stats-bar">
        <div className="wh-legend">
          {viewMode === 'CAPACITY' ? (
            <>
              <div className="wh-legend__item">
                <span className="wh-legend__swatch wh-legend__swatch--empty" />
                Trống
              </div>
              <div className="wh-legend__item">
                <span className="wh-legend__swatch wh-legend__swatch--occupied" />
                Đang dùng
              </div>
              <div className="wh-legend__item">
                <span className="wh-legend__swatch wh-legend__swatch--full" />
                Đầy
              </div>
              <div className="wh-legend__item">
                <span className="wh-legend__swatch wh-legend__swatch--maintenance" />
                Bảo trì
              </div>
            </>
          ) : (
            <div className="wh-legend__gradient">
              <span>Lạnh</span>
              <span className="wh-legend__gradient-bar" />
              <span>Nóng (Cảnh báo)</span>
            </div>
          )}
        </div>

        <div className="wh-stats-info">
          <div className="wh-stats-info__item">
            <span className="wh-stats-info__label">Môi trường</span>
            <span className="wh-stats-info__value">{ZONE_CONFIG[activeZone].temp}</span>
          </div>
          <span className="wh-stats-info__divider" />
          <div className="wh-stats-info__item">
            <span className="wh-stats-info__label">Lấp đầy</span>
            <span className="wh-stats-info__value wh-stats-info__value--primary">{stats.fillRate}%</span>
          </div>
          <span className="wh-stats-info__divider" />
          <div className="wh-stats-info__item">
            <span className="wh-stats-info__label">Tổng ô</span>
            <span className="wh-stats-info__value">{stats.usedSlots}/{stats.totalSlots}</span>
          </div>
        </div>
      </div>

      {/* ── 2D Floor Plan ── */}
      {loading ? (
        <div className="wh-loading">
          <div className="wh-loading__spinner" />
          <span>Đang tải sơ đồ kho...</span>
        </div>
      ) : error && shelves.length === 0 ? (
        <div className="wh-error">
          <AlertTriangle size={32} />
          {error}
        </div>
      ) : (
        <div className="wh-floor">
          {/* Entry door decoration */}
          <div className="wh-floor__door">
            <span className="wh-floor__door-bar" />
            <span className="wh-floor__door-label">Cửa xuất nhập hàng</span>
          </div>

          {/* Aisles: pairs of racks with walkway separator */}
          <div className="wh-aisles">
            {aislePairs.map((pair, idx) => (
              <div key={idx} className="wh-aisle">
                {/* Rack A */}
                <RackView
                  shelf={pair.a}
                  viewMode={viewMode}
                  searchQuery={searchQuery}
                  canManage={canManage}
                  onSlotClick={handleSlotClick}
                  onRackClick={handleRackClick}
                />

                {/* Aisle separator */}
                <div className="wh-aisle__sep">
                  <span className="wh-aisle__sep-text">Lối đi</span>
                </div>

                {/* Rack B (if exists) */}
                {pair.b ? (
                  <RackView
                    shelf={pair.b}
                    viewMode={viewMode}
                    searchQuery={searchQuery}
                    canManage={canManage}
                    onSlotClick={handleSlotClick}
                    onRackClick={handleRackClick}
                  />
                ) : (
                  <div style={{ width: 200 }} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Elevation View Panel ── */}
      {elevationShelf && (
        <ElevationPanel
          shelf={elevationShelf}
          canManage={canManage}
          onSlotClick={handleSlotClick}
          onClose={() => setElevationShelf(null)}
        />
      )}

      {/* ── Slot Action Modal ── */}
      {selectedSlot && (
        <div className="wh-modal-overlay" onClick={() => setSelectedSlot(null)}>
          <div className="wh-modal" onClick={(e) => e.stopPropagation()}>
            <div className="wh-modal__header">
              <h3 className="wh-modal__title">Thao tác ô chứa {selectedSlot.code}</h3>
              <button className="wh-modal__close" onClick={() => setSelectedSlot(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="wh-modal__body">
              {selectedSlot.status === 'EMPTY' ? (
                <form onSubmit={handleAssign}>
                  <div className="wh-modal__alert wh-modal__alert--success">
                    <Box size={16} />
                    <span>Ô chứa này đang <strong>Trống</strong>. Bạn có thể gán lô hàng vào đây.</span>
                  </div>

                  <div className="wh-form-group">
                    <label>ID Lô Hàng (Lot ID)</label>
                    <input
                      required
                      type="text"
                      placeholder="UUID của lô"
                      value={assignForm.lotId}
                      onChange={e => setAssignForm({ ...assignForm, lotId: e.target.value })}
                    />
                  </div>
                  <div className="wh-form-group">
                    <label>Mã Lô Hàng (Lot Code)</label>
                    <input
                      required
                      type="text"
                      placeholder="VD: LOT-001"
                      value={assignForm.lotCode}
                      onChange={e => setAssignForm({ ...assignForm, lotCode: e.target.value })}
                    />
                  </div>
                  <div className="wh-form-group">
                    <label>Mã SKU (Tùy chọn)</label>
                    <input
                      type="text"
                      placeholder="VD: MILK-001"
                      value={assignForm.productSku}
                      onChange={e => setAssignForm({ ...assignForm, productSku: e.target.value })}
                    />
                  </div>

                  <div className="wh-modal__actions">
                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={handleMaintenance}
                      style={{ borderColor: '#f59e0b', color: '#b45309' }}
                    >
                      <Wrench size={15} />
                      Khóa Bảo Trì
                    </button>
                    <button type="submit" className="btn btn-primary" style={{ border: 'none', cursor: 'pointer' }}>
                      <Package size={15} />
                      Gán Lô Hàng
                    </button>
                  </div>
                </form>
              ) : selectedSlot.status === 'MAINTENANCE' ? (
                <>
                  <div className="wh-modal__alert wh-modal__alert--warning">
                    <Wrench size={16} />
                    <span>Ô chứa này đang được <strong>Bảo Trì</strong>.</span>
                  </div>
                  <button className="btn btn-primary" onClick={handleRelease} style={{ width: '100%' }}>
                    Mở Khóa (Hoàn Tất Bảo Trì)
                  </button>
                </>
              ) : (
                <>
                  <div className="wh-modal__alert wh-modal__alert--info">
                    <Package size={16} />
                    <span>
                      Đang lưu trữ Lô: <strong>{selectedSlot.lotCode}</strong>
                      {selectedSlot.productSku && ` (SKU: ${selectedSlot.productSku})`}
                    </span>
                  </div>
                  <div className="wh-modal__actions">
                    <button className="btn btn-outline" onClick={() => setSelectedSlot(null)}>
                      Đóng
                    </button>
                    <button
                      className="btn btn-primary"
                      onClick={handleRelease}
                      style={{ backgroundColor: 'var(--color-danger-500)', borderColor: 'var(--color-danger-500)' }}
                    >
                      Giải Phóng (Lấy Hàng)
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShelfArrangement;
