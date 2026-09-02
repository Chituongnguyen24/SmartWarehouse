import React, { useState } from 'react';
import { X, Building2, Search, Plus, Edit2, Trash2, CheckCircle2, AlertCircle, MapPin, Eye, Settings, RefreshCw } from 'lucide-react';
import { useWarehouse, type Warehouse } from '../contexts/WarehouseContext';

export const WarehouseManageModal: React.FC = () => {
  const {
    isManageModalOpen,
    closeManageModal,
    warehouses,
    selectedWarehouseCode,
    setSelectedWarehouseCode,
    openConfigModal,
    deleteWarehouse,
    toggleWarehouseActive,
    fetchWarehouses,
  } = useWarehouse();

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [isRefreshing, setIsRefreshing] = useState(false);

  if (!isManageModalOpen) return null;

  const filtered = warehouses.filter(w => {
    const matchSearch =
      w.name.toLowerCase().includes(search.toLowerCase()) ||
      w.code.toLowerCase().includes(search.toLowerCase()) ||
      w.address.toLowerCase().includes(search.toLowerCase());

    const matchStatus =
      filterStatus === 'ALL' ||
      (filterStatus === 'ACTIVE' && w.isActive) ||
      (filterStatus === 'INACTIVE' && !w.isActive);

    return matchSearch && matchStatus;
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchWarehouses();
    setIsRefreshing(false);
  };

  const handleDelete = async (w: Warehouse) => {
    const ok = window.confirm(
      `⚠️ BẠN CÓ CHẮC CHẮN MUỐN XÓA KHO:\n\n"${w.name} (${w.code})"\n\nHành động này không thể hoàn tác!`
    );
    if (!ok) return;

    const success = await deleteWarehouse(w.id);
    if (success) {
      alert(`✅ Đã xóa kho ${w.name} thành công!`);
    } else {
      alert('❌ Xóa kho thất bại. Vui lòng kiểm tra lại liên kết dữ liệu tồn kho.');
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(5px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 3400,
    }}>
      <div style={{
        backgroundColor: '#ffffff',
        width: '950px',
        maxWidth: '96vw',
        maxHeight: '90vh',
        borderRadius: '20px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.75rem',
          background: '#0f172a',
          color: '#ffffff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: '#0f766e', padding: '9px', borderRadius: '12px' }}>
              <Building2 size={22} color="#ffffff" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>
                🏢 Trung Tâm Quản Lý & Cấu Hình Kho Hàng Toàn Hệ Thống
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
                Danh sách 16 chi nhánh vệ tinh • Quản trị quyền hạn Admin (Thêm - Sửa - Xóa - Cấu hình)
              </p>
            </div>
          </div>
          <button
            onClick={closeManageModal}
            style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '8px', padding: '6px' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Action Bar */}
        <div style={{
          padding: '1rem 1.5rem',
          borderBottom: '1px solid #e2e8f0',
          background: '#f8fafc',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px',
        }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flex: 1, maxWidth: '500px' }}>
            <div style={{
              position: 'relative',
              flex: 1,
              display: 'flex',
              alignItems: 'center',
            }}>
              <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px' }} />
              <input
                type="text"
                placeholder="Tìm mã kho, tên kho, địa chỉ..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 36px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.85rem',
                  backgroundColor: '#ffffff',
                }}
              />
            </div>

            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value as any)}
              style={{
                padding: '8px 12px',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                fontSize: '0.85rem',
                backgroundColor: '#ffffff',
                fontWeight: 600,
                color: '#334155',
              }}
            >
              <option value="ALL">Tất cả ({warehouses.length})</option>
              <option value="ACTIVE">🟢 Đang chạy ({warehouses.filter(w => w.isActive).length})</option>
              <option value="INACTIVE">🔴 Tạm dừng ({warehouses.filter(w => !w.isActive).length})</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleRefresh}
              style={{
                padding: '8px 12px',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                color: '#475569',
              }}
            >
              <RefreshCw size={15} className={isRefreshing ? 'animate-spin' : ''} />
              Làm mới
            </button>

            <button
              onClick={() => {
                openConfigModal(null);
              }}
              style={{
                padding: '8px 16px',
                borderRadius: '10px',
                border: 'none',
                background: '#0f766e',
                color: '#ffffff',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 8px rgba(15,118,110,0.25)',
              }}
            >
              <Plus size={16} /> Thêm Kho Mới
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.5rem' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: '#f1f5f9', color: '#475569', textAlign: 'left', borderBottom: '2px solid #cbd5e1' }}>
                <th style={{ padding: '10px 12px' }}>Mã Kho</th>
                <th style={{ padding: '10px 12px' }}>Tên Kho Hàng</th>
                <th style={{ padding: '10px 12px' }}>Địa Chỉ Vệ Tinh</th>
                <th style={{ padding: '10px 12px', textAlign: 'center' }}>Trạng Thái</th>
                <th style={{ padding: '10px 12px', textAlign: 'center' }}>Đang Chọn</th>
                <th style={{ padding: '10px 12px', textAlign: 'center' }}>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                    Không tìm thấy kho hàng phù hợp.
                  </td>
                </tr>
              ) : (
                filtered.map(w => {
                  const isCurrent = w.code === selectedWarehouseCode;
                  return (
                    <tr
                      key={w.id}
                      style={{
                        borderBottom: '1px solid #e2e8f0',
                        backgroundColor: isCurrent ? '#f0fdfa' : 'transparent',
                        transition: 'background-color 0.15s ease',
                      }}
                    >
                      <td style={{ padding: '12px', fontWeight: 800, color: '#0f766e' }}>
                        {w.code}
                      </td>
                      <td style={{ padding: '12px', fontWeight: 700, color: '#1e293b' }}>
                        {w.name}
                      </td>
                      <td style={{ padding: '12px', color: '#64748b', maxWidth: '300px' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '4px' }}>
                          <MapPin size={14} color="#0f766e" style={{ flexShrink: 0, marginTop: '2px' }} />
                          <span style={{ fontSize: '0.8rem' }}>{w.address}</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => toggleWarehouseActive(w)}
                          title="Bấm để đổi trạng thái"
                          style={{
                            border: 'none',
                            background: w.isActive ? '#dcfce7' : '#fee2e2',
                            color: w.isActive ? '#15803d' : '#b91c1c',
                            padding: '3px 8px',
                            borderRadius: '12px',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                          }}
                        >
                          {w.isActive ? '🟢 Đang chạy' : '🔴 Tạm dừng'}
                        </button>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        {isCurrent ? (
                          <span style={{
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            backgroundColor: '#0f766e',
                            color: '#ffffff',
                            padding: '3px 8px',
                            borderRadius: '6px',
                          }}>
                            ✓ ĐANG ĐIỀU HÀNH
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedWarehouseCode(w.code);
                              alert(`✅ Đã chuyển đổi góc nhìn điều hành sang: ${w.name} (${w.code})`);
                            }}
                            style={{
                              border: '1px solid #cbd5e1',
                              background: '#ffffff',
                              color: '#334155',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            Chọn kho này
                          </button>
                        )}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => {
                              openConfigModal(w);
                            }}
                            title="Sửa & Cấu hình kho này"
                            style={{
                              border: '1px solid #cbd5e1',
                              background: '#ffffff',
                              color: '#0f766e',
                              width: '28px',
                              height: '28px',
                              borderRadius: '6px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                            }}
                          >
                            <Settings size={14} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(w)}
                            title="Xóa kho hàng này"
                            style={{
                              border: '1px solid #fee2e2',
                              background: '#fff',
                              color: '#ef4444',
                              width: '28px',
                              height: '28px',
                              borderRadius: '6px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div style={{
          padding: '1rem 1.5rem',
          borderTop: '1px solid #e2e8f0',
          background: '#f8fafc',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
            Tổng số kho: <strong>{warehouses.length}</strong> chi nhánh • Đang hoạt động: <strong style={{ color: '#16a34a' }}>{warehouses.filter(w => w.isActive).length}</strong>
          </div>
          <button
            onClick={closeManageModal}
            style={{
              padding: '8px 20px',
              borderRadius: '8px',
              border: 'none',
              background: '#0f766e',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
            }}
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
