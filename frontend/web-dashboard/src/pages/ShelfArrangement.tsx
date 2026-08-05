import React, { useState, useEffect } from 'react';
import { Layers, Thermometer, Wind, Zap, AlertTriangle, Search, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

// Types from API
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

const API_BASE = 'http://localhost:3005'; // warehouse-service

const ShelfArrangement: React.FC = () => {
  const { token, user } = useAuth();
  const [activeZone, setActiveZone] = useState<'COLD' | 'FROZEN' | 'DRY'>('COLD');
  const [shelves, setShelves] = useState<Shelf[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [assignForm, setAssignForm] = useState({ lotId: '', lotCode: '', productSku: '', weightKg: 0 });

  const canManage = user?.role === 'ADMIN' || user?.role === 'WAREHOUSE_MANAGER' || user?.role === 'WAREHOUSE_STAFF';

  const fetchShelves = async (zone: string) => {
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
  };

  useEffect(() => {
    fetchShelves(activeZone);
  }, [activeZone]);

  const handleSlotClick = (slot: Slot) => {
    if (!canManage) return;
    setSelectedSlot(slot);
    setAssignForm({ lotId: '', lotCode: '', productSku: '', weightKg: 0 });
  };

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

  const zoneInfo = {
    'COLD': { name: 'Kho Mát', temp: '2°C - 8°C', icon: <Wind size={18} className="text-info" /> },
    'FROZEN': { name: 'Kho Đông Lạnh', temp: '-18°C - -25°C', icon: <Thermometer size={18} className="text-primary" /> },
    'DRY': { name: 'Kho Khô', temp: '15°C - 25°C', icon: <Zap size={18} className="text-warning" /> }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-6)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.25rem' }}>Sơ đồ Sắp xếp Kệ</h2>
          <p className="text-muted" style={{ fontSize: '0.875rem' }}>
            Giám sát thời gian thực vị trí lưu trữ và click vào các ô chứa để cập nhật trạng thái.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <div className="search-bar" style={{ backgroundColor: 'var(--bg-light)', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.4rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Search size={16} className="text-muted" />
            <input type="text" placeholder="Tìm vị trí, lot..." style={{ background: 'none', border: 'none', color: 'var(--text)', outline: 'none', fontSize: '0.825rem' }} />
          </div>
        </div>
      </div>

      {/* Zone Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
        {(Object.keys(zoneInfo) as Array<keyof typeof zoneInfo>).map(zoneKey => (
          <button
            key={zoneKey}
            onClick={() => setActiveZone(zoneKey)}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom: activeZone === zoneKey ? '2px solid var(--primary)' : '2px solid transparent',
              color: activeZone === zoneKey ? 'var(--primary)' : 'var(--text-muted)',
              fontWeight: activeZone === zoneKey ? 600 : 500,
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s'
            }}
          >
            {zoneInfo[zoneKey].icon}
            {zoneInfo[zoneKey].name}
          </button>
        ))}
      </div>

      {/* Legend & Stats */}
      <div className="card" style={{ padding: 'var(--spacing-4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.825rem' }}>
            <div style={{ width: 16, height: 16, border: '2px solid #10b981', borderRadius: 4, backgroundColor: 'rgba(16, 185, 129, 0.1)' }}></div>
            <span>Trống (EMPTY)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.825rem' }}>
            <div style={{ width: 16, height: 16, border: '1px solid #3b82f6', borderRadius: 4, backgroundColor: 'rgba(59, 130, 246, 0.4)' }}></div>
            <span>Đang lưu trữ (OCCUPIED)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.825rem' }}>
            <div style={{ width: 16, height: 16, border: '1px solid #2563eb', borderRadius: 4, backgroundColor: '#2563eb' }}></div>
            <span>Đầy (FULL)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.825rem' }}>
            <div style={{ width: 16, height: 16, border: '1px solid #f59e0b', borderRadius: 4, backgroundColor: 'rgba(245, 158, 11, 0.2)', backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(245, 158, 11, 0.5) 3px, rgba(245, 158, 11, 0.5) 6px)' }}></div>
            <span>Bảo trì (MAINTENANCE)</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.5rem 1rem', backgroundColor: 'var(--bg-light)', borderRadius: '8px', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Môi trường yêu cầu</span>
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{zoneInfo[activeZone].temp}</span>
          </div>
          <div style={{ width: 1, height: 24, backgroundColor: 'var(--border)' }}></div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Tỷ lệ lấp đầy</span>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary)' }}>
              {shelves.length > 0
                ? Math.round((shelves.reduce((sum, s) => sum + s.usedSlots, 0) / shelves.reduce((sum, s) => sum + s.maxSlots, 0)) * 100)
                : 0}%
            </span>
          </div>
        </div>
      </div>

      {/* Shelves Grid */}
      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          Đang tải dữ liệu sơ đồ...
        </div>
      ) : error && shelves.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-danger-500)' }}>
          <AlertTriangle size={32} style={{ margin: '0 auto 1rem' }} />
          {error}
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 'var(--spacing-6)'
        }}>
          {shelves.map(shelf => (
            <div key={shelf.shelfCode} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Layers size={18} className="text-primary" />
                  <span style={{ fontWeight: 600 }}>{shelf.shelfName}</span>
                </div>
                <span className="badge" style={{ backgroundColor: 'var(--bg-light)', color: 'var(--text)', border: '1px solid var(--border)' }}>
                  {shelf.usedSlots} / {shelf.maxSlots}
                </span>
              </div>
              
              <div style={{ padding: '1rem', flexGrow: 1 }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '0.5rem',
                  alignContent: 'start'
                }}>
                  {shelf.slots.map(slot => {
                    let bg = '';
                    let border = '';
                    let title = slot.code;

                    if (slot.status === 'EMPTY') {
                      bg = 'rgba(16, 185, 129, 0.05)';
                      border = '1px solid rgba(16, 185, 129, 0.3)';
                      title += ' (Trống)';
                    } else if (slot.status === 'OCCUPIED') {
                      bg = 'rgba(59, 130, 246, 0.2)';
                      border = '1px solid rgba(59, 130, 246, 0.4)';
                      title += ` - Lô: ${slot.lotCode}`;
                    } else if (slot.status === 'FULL') {
                      bg = 'rgba(59, 130, 246, 0.8)';
                      border = '1px solid #2563eb';
                      title += ` - Lô: ${slot.lotCode} (Đầy)`;
                    } else if (slot.status === 'MAINTENANCE') {
                      bg = 'rgba(245, 158, 11, 0.1)';
                      border = '1px dashed #f59e0b';
                      title += ' (Bảo trì)';
                    }

                    return (
                      <div
                        key={slot.id}
                        title={title}
                        onClick={() => handleSlotClick(slot)}
                        style={{
                          aspectRatio: '1',
                          borderRadius: '4px',
                          backgroundColor: bg,
                          border: border,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.65rem',
                          fontWeight: 500,
                          color: slot.status === 'FULL' ? '#fff' : 'var(--text-muted)',
                          cursor: canManage ? 'pointer' : 'default',
                          position: 'relative',
                          overflow: 'hidden',
                          transition: 'transform 0.1s, box-shadow 0.1s',
                          ...(slot.status === 'MAINTENANCE' ? { backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(245, 158, 11, 0.3) 5px, rgba(245, 158, 11, 0.3) 10px)' } : {})
                        }}
                        onMouseEnter={(e) => {
                          if (!canManage) return;
                          e.currentTarget.style.transform = 'scale(1.05)';
                          e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
                        }}
                        onMouseLeave={(e) => {
                          if (!canManage) return;
                          e.currentTarget.style.transform = 'scale(1)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        {slot.code.split('-').pop()}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Action Modal */}
      {selectedSlot && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '400px', maxWidth: '90%', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Thao tác ô chứa {selectedSlot.code}</h3>
              <button onClick={() => setSelectedSlot(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            
            {selectedSlot.status === 'EMPTY' ? (
              <form onSubmit={handleAssign} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ padding: '0.75rem', backgroundColor: 'var(--color-success-50)', borderRadius: '4px', fontSize: '0.875rem' }}>
                  Ô chứa này đang <strong>Trống</strong>. Bạn có thể gán lô hàng vào đây.
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>ID Lô Hàng (Lot ID)</label>
                  <input required type="text" placeholder="UUID của lô" value={assignForm.lotId} onChange={e => setAssignForm({...assignForm, lotId: e.target.value})} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Mã Lô Hàng (Lot Code)</label>
                  <input required type="text" placeholder="VD: LOT-001" value={assignForm.lotCode} onChange={e => setAssignForm({...assignForm, lotCode: e.target.value})} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Mã SKU (Tùy chọn)</label>
                  <input type="text" placeholder="VD: MILK-001" value={assignForm.productSku} onChange={e => setAssignForm({...assignForm, productSku: e.target.value})} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)' }} />
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                  <button type="button" className="btn btn-outline" onClick={handleMaintenance} style={{ borderColor: 'var(--color-warning-500)', color: 'var(--color-warning-500)' }}>Khóa Bảo Trì</button>
                  <button type="submit" className="btn btn-primary" style={{ border: 'none', cursor: 'pointer' }}>Gán Lô Hàng</button>
                </div>
              </form>
            ) : selectedSlot.status === 'MAINTENANCE' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ padding: '0.75rem', backgroundColor: 'var(--color-warning-50)', borderRadius: '4px', fontSize: '0.875rem' }}>
                  Ô chứa này đang được <strong>Bảo Trì</strong>.
                </div>
                <button className="btn btn-primary" onClick={handleRelease} style={{ width: '100%' }}>Mở Khóa (Hoàn Tất Bảo Trì)</button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ padding: '0.75rem', backgroundColor: 'var(--color-primary-50)', borderRadius: '4px', fontSize: '0.875rem' }}>
                  Đang lưu trữ Lô: <strong>{selectedSlot.lotCode}</strong> {selectedSlot.productSku && `(SKU: ${selectedSlot.productSku})`}
                </div>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                  <button className="btn btn-outline" onClick={() => setSelectedSlot(null)} style={{ flex: 1 }}>Đóng</button>
                  <button className="btn btn-primary" onClick={handleRelease} style={{ flex: 1, backgroundColor: 'var(--color-danger-500)' }}>Giải Phóng (Lấy Hàng)</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ShelfArrangement;
