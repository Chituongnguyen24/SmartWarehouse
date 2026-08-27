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

  // New states for 2D Map
  const [viewMode, setViewMode] = useState<'CAPACITY' | 'TEMPERATURE'>('CAPACITY');
  const [searchQuery, setSearchQuery] = useState('');

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
      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
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

      {/* TOOLBAR: Search & View Mode */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ position: 'relative', width: '300px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            placeholder="Tìm kiếm mã lô, SKU hoặc vị trí..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '100%', padding: '0.6rem 1rem 0.6rem 2.5rem', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.875rem' }}
          />
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', backgroundColor: 'var(--bg-light)', padding: '0.25rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
          <button 
            onClick={() => setViewMode('CAPACITY')}
            style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500, backgroundColor: viewMode === 'CAPACITY' ? '#fff' : 'transparent', boxShadow: viewMode === 'CAPACITY' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', color: viewMode === 'CAPACITY' ? 'var(--text)' : 'var(--text-muted)' }}
          >
            Sức chứa (Capacity)
          </button>
          <button 
            onClick={() => setViewMode('TEMPERATURE')}
            style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500, backgroundColor: viewMode === 'TEMPERATURE' ? '#fff' : 'transparent', boxShadow: viewMode === 'TEMPERATURE' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', color: viewMode === 'TEMPERATURE' ? 'var(--text)' : 'var(--text-muted)' }}
          >
            Bản đồ nhiệt (Heatmap)
          </button>
        </div>
      </div>

      {/* Legend & Stats */}
      <div className="card" style={{ padding: 'var(--spacing-4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          {viewMode === 'CAPACITY' ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.825rem' }}>
                <div style={{ width: 16, height: 16, border: '2px solid #10b981', borderRadius: 4, backgroundColor: 'rgba(16, 185, 129, 0.1)' }}></div>
                <span>Trống</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.825rem' }}>
                <div style={{ width: 16, height: 16, border: '1px solid #3b82f6', borderRadius: 4, backgroundColor: 'rgba(59, 130, 246, 0.4)' }}></div>
                <span>Đang dùng</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.825rem' }}>
                <div style={{ width: 16, height: 16, border: '1px solid #2563eb', borderRadius: 4, backgroundColor: '#2563eb' }}></div>
                <span>Đầy</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.825rem' }}>
                <div style={{ width: 16, height: 16, border: '1px solid #f59e0b', borderRadius: 4, backgroundColor: 'rgba(245, 158, 11, 0.2)', backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(245, 158, 11, 0.5) 3px, rgba(245, 158, 11, 0.5) 6px)' }}></div>
                <span>Bảo trì</span>
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.825rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Lạnh</span>
              <div style={{ width: '150px', height: '12px', borderRadius: '6px', background: 'linear-gradient(90deg, #3b82f6, #10b981, #f59e0b, #ef4444)' }}></div>
              <span style={{ color: 'var(--text-muted)' }}>Nóng (Cảnh báo)</span>
            </div>
          )}
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

      {/* 2D Floor Plan Grid */}
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
          backgroundColor: '#e2e8f0', // Warehouse floor color
          border: '4px solid #cbd5e1', // Wall
          borderRadius: '12px',
          padding: '3rem',
          position: 'relative',
          overflowX: 'auto',
          minHeight: '600px',
          boxShadow: 'inset 0 4px 12px rgba(0,0,0,0.05)'
        }}>
          {/* Warehouse Entry Doors Visual */}
          <div style={{ position: 'absolute', bottom: -4, left: '50%', transform: 'translateX(-50%)', width: '120px', height: '8px', backgroundColor: '#3b82f6', borderRadius: '4px' }}></div>
          <div style={{ position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', letterSpacing: '2px' }}>CỬA XUẤT NHẬP HÀNG</div>

          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '4rem',
            justifyContent: 'center',
            alignItems: 'flex-start'
          }}>
            {/* Group shelves by pairs to form aisles */}
            {Array.from({ length: Math.ceil(shelves.length / 2) }).map((_, rowIndex) => {
              const shelfA = shelves[rowIndex * 2];
              const shelfB = shelves[rowIndex * 2 + 1];
              return (
                <div key={rowIndex} style={{ display: 'flex', gap: '2rem', backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px dashed #cbd5e1', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
                  
                  {/* Rack A */}
                  {shelfA && (
                    <div style={{ display: 'flex', flexDirection: 'column', width: '220px' }}>
                      <div style={{ textAlign: 'center', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.85rem', color: '#475569' }}>{shelfA.shelfName}</div>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(4, 1fr)',
                        gap: '4px',
                        backgroundColor: '#64748b', // Steel rack color
                        padding: '6px',
                        borderRadius: '4px'
                      }}>
                        {shelfA.slots.map((slot, index) => {
                          const isHighlighted = searchQuery && (slot.code.toLowerCase().includes(searchQuery.toLowerCase()) || (slot.lotCode && slot.lotCode.toLowerCase().includes(searchQuery.toLowerCase())) || (slot.productSku && slot.productSku.toLowerCase().includes(searchQuery.toLowerCase())));
                          
                          let bg = '';
                          let border = '';
                          let title = slot.code;

                          if (viewMode === 'CAPACITY') {
                            if (slot.status === 'EMPTY') {
                              bg = '#f8fafc'; border = '1px solid #10b981'; title += ' (Trống)';
                            } else if (slot.status === 'OCCUPIED') {
                              bg = 'rgba(59, 130, 246, 0.4)'; border = '1px solid #3b82f6'; title += ` - Lô: ${slot.lotCode}`;
                            } else if (slot.status === 'FULL') {
                              bg = '#2563eb'; border = '1px solid #1d4ed8'; title += ` - Lô: ${slot.lotCode} (Đầy)`;
                            } else if (slot.status === 'MAINTENANCE') {
                              bg = '#f59e0b'; border = '1px solid #d97706'; title += ' (Bảo trì)';
                            }
                          } else {
                            // FAKE TEMPERATURE HEATMAP BASED ON INDEX
                            const tempFactor = (index % 4) / 3; // 0 to 1
                            if (slot.status === 'EMPTY') {
                                bg = '#f8fafc'; border = '1px solid #cbd5e1';
                            } else {
                                if (tempFactor < 0.3) bg = '#3b82f6'; // Cold
                                else if (tempFactor < 0.7) bg = '#10b981'; // Optimal
                                else if (tempFactor < 0.9) bg = '#f59e0b'; // Warm
                                else bg = '#ef4444'; // Hot warning
                                border = 'none';
                                title += ' - Nhiệt độ mô phỏng';
                            }
                          }

                          return (
                            <div
                              key={slot.id}
                              title={title}
                              onClick={() => handleSlotClick(slot)}
                              style={{
                                aspectRatio: '1',
                                borderRadius: '2px',
                                backgroundColor: bg,
                                border: border,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.55rem',
                                fontWeight: 700,
                                color: (slot.status === 'FULL' || viewMode === 'TEMPERATURE') && slot.status !== 'EMPTY' ? '#fff' : '#334155',
                                cursor: canManage ? 'pointer' : 'default',
                                position: 'relative',
                                boxShadow: isHighlighted ? '0 0 0 4px rgba(234, 179, 8, 0.5), 0 0 15px rgba(234, 179, 8, 0.8)' : 'none',
                                zIndex: isHighlighted ? 10 : 1,
                                transform: isHighlighted ? 'scale(1.1)' : 'scale(1)',
                                transition: 'all 0.2s',
                              }}
                            >
                              {slot.code.split('-').pop()}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Aisle (Lối đi) */}
                  <div style={{ width: '60px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ height: '100%', borderLeft: '2px dashed #94a3b8' }}></div>
                    <span style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', fontSize: '0.7rem', color: '#94a3b8', margin: '1rem 0', fontWeight: 600, letterSpacing: '2px' }}>LỐI ĐI</span>
                    <div style={{ height: '100%', borderLeft: '2px dashed #94a3b8' }}></div>
                  </div>

                  {/* Rack B */}
                  {shelfB && (
                    <div style={{ display: 'flex', flexDirection: 'column', width: '220px' }}>
                      <div style={{ textAlign: 'center', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.85rem', color: '#475569' }}>{shelfB.shelfName}</div>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(4, 1fr)',
                        gap: '4px',
                        backgroundColor: '#64748b',
                        padding: '6px',
                        borderRadius: '4px'
                      }}>
                        {shelfB.slots.map((slot, index) => {
                          const isHighlighted = searchQuery && (slot.code.toLowerCase().includes(searchQuery.toLowerCase()) || (slot.lotCode && slot.lotCode.toLowerCase().includes(searchQuery.toLowerCase())) || (slot.productSku && slot.productSku.toLowerCase().includes(searchQuery.toLowerCase())));
                          
                          let bg = '';
                          let border = '';
                          let title = slot.code;

                          if (viewMode === 'CAPACITY') {
                            if (slot.status === 'EMPTY') {
                              bg = '#f8fafc'; border = '1px solid #10b981'; title += ' (Trống)';
                            } else if (slot.status === 'OCCUPIED') {
                              bg = 'rgba(59, 130, 246, 0.4)'; border = '1px solid #3b82f6'; title += ` - Lô: ${slot.lotCode}`;
                            } else if (slot.status === 'FULL') {
                              bg = '#2563eb'; border = '1px solid #1d4ed8'; title += ` - Lô: ${slot.lotCode} (Đầy)`;
                            } else if (slot.status === 'MAINTENANCE') {
                              bg = '#f59e0b'; border = '1px solid #d97706'; title += ' (Bảo trì)';
                            }
                          } else {
                            const tempFactor = (index % 4) / 3;
                            if (slot.status === 'EMPTY') {
                                bg = '#f8fafc'; border = '1px solid #cbd5e1';
                            } else {
                                if (tempFactor < 0.3) bg = '#3b82f6';
                                else if (tempFactor < 0.7) bg = '#10b981';
                                else if (tempFactor < 0.9) bg = '#f59e0b';
                                else bg = '#ef4444';
                                border = 'none';
                                title += ' - Nhiệt độ mô phỏng';
                            }
                          }

                          return (
                            <div
                              key={slot.id}
                              title={title}
                              onClick={() => handleSlotClick(slot)}
                              style={{
                                aspectRatio: '1',
                                borderRadius: '2px',
                                backgroundColor: bg,
                                border: border,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.55rem',
                                fontWeight: 700,
                                color: (slot.status === 'FULL' || viewMode === 'TEMPERATURE') && slot.status !== 'EMPTY' ? '#fff' : '#334155',
                                cursor: canManage ? 'pointer' : 'default',
                                position: 'relative',
                                boxShadow: isHighlighted ? '0 0 0 4px rgba(234, 179, 8, 0.5), 0 0 15px rgba(234, 179, 8, 0.8)' : 'none',
                                zIndex: isHighlighted ? 10 : 1,
                                transform: isHighlighted ? 'scale(1.1)' : 'scale(1)',
                                transition: 'all 0.2s',
                              }}
                            >
                              {slot.code.split('-').pop()}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
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
