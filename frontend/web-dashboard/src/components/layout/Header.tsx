import React, { useState, useRef, useEffect } from 'react';
import { Search, Bell, Building2, ChevronDown, Check, Settings, Plus, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth, ROLE_LABELS } from '../../contexts/AuthContext';
import { useWarehouse } from '../../contexts/WarehouseContext';
import { WarehouseConfigModal } from '../WarehouseConfigModal';
import { WarehouseManageModal } from '../WarehouseManageModal';

interface HeaderProps {
  title: string;
}

const Header: React.FC<HeaderProps> = ({ title }) => {
  const { user } = useAuth();
  const {
    warehouses,
    selectedWarehouseCode,
    selectedWarehouse,
    setSelectedWarehouseCode,
    openConfigModal,
    openManageModal,
  } = useWarehouse();

  const isAdmin = user?.role === 'ADMIN';
  const isManager = user?.role === 'WAREHOUSE_MANAGER';

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [whSearch, setWhSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const initials = user?.name
    ? user.name.split(' ').map(w => w.charAt(0)).slice(-2).join('')
    : 'U';

  const filteredWarehouses = warehouses.filter(w =>
    w.name.toLowerCase().includes(whSearch.toLowerCase()) ||
    w.code.toLowerCase().includes(whSearch.toLowerCase()) ||
    w.address.toLowerCase().includes(whSearch.toLowerCase())
  );

  return (
    <>
      <header className="top-header" style={{ position: 'relative', zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div className="page-title">{title}</div>

          {/* Warehouse Selector for ADMIN */}
          {isAdmin && (
            <div ref={dropdownRef} style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: '#f0fdfa',
                  border: '1.5px solid #0f766e',
                  padding: '6px 14px',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  color: '#0f766e',
                  fontWeight: 700,
                  fontSize: '0.86rem',
                  boxShadow: '0 2px 8px rgba(15, 118, 110, 0.12)',
                  transition: 'all 0.2s ease',
                }}
                title="Bấm để chuyển đổi góc nhìn điều hành kho hoặc cấu hình"
              >
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: selectedWarehouse?.isActive ? '#16a34a' : '#dc2626',
                }} />
                <Building2 size={16} />
                <span>
                  Kho: <strong style={{ color: '#134e4a' }}>{selectedWarehouse?.name || selectedWarehouseCode}</strong> ({selectedWarehouseCode})
                </span>
                <ChevronDown size={15} style={{ transform: isDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }} />
              </button>

              {/* Warehouse Dropdown */}
              {isDropdownOpen && (
                <div style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  left: 0,
                  width: '380px',
                  backgroundColor: '#ffffff',
                  borderRadius: '16px',
                  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                  border: '1px solid #cbd5e1',
                  overflow: 'hidden',
                  zIndex: 2000,
                }}>
                  {/* Search inside dropdown */}
                  <div style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '10px' }} />
                      <input
                        type="text"
                        placeholder="Tìm 16 kho hàng theo tên, quận..."
                        value={whSearch}
                        onChange={e => setWhSearch(e.target.value)}
                        autoFocus
                        style={{
                          width: '100%',
                          padding: '6px 10px 6px 30px',
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          fontSize: '0.8rem',
                        }}
                      />
                    </div>
                  </div>

                  {/* Warehouses list */}
                  <div style={{ maxHeight: '260px', overflowY: 'auto' }}>
                    {filteredWarehouses.length === 0 ? (
                      <div style={{ padding: '1.5rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem' }}>
                        Không có kho hàng phù hợp
                      </div>
                    ) : (
                      filteredWarehouses.map(w => {
                        const isSelected = w.code === selectedWarehouseCode;
                        return (
                          <div
                            key={w.id}
                            onClick={() => {
                              setSelectedWarehouseCode(w.code);
                              setIsDropdownOpen(false);
                            }}
                            style={{
                              padding: '10px 14px',
                              borderBottom: '1px solid #f8fafc',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              backgroundColor: isSelected ? '#f0fdfa' : 'transparent',
                              transition: 'background-color 0.15s ease',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                              <div style={{
                                width: '7px',
                                height: '7px',
                                borderRadius: '50%',
                                backgroundColor: w.isActive ? '#16a34a' : '#ef4444',
                                flexShrink: 0,
                              }} />
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <div style={{ fontSize: '0.84rem', fontWeight: isSelected ? 800 : 600, color: isSelected ? '#0f766e' : '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {w.name}
                                </div>
                                <div style={{ fontSize: '0.72rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <span>{w.code}</span>
                                  <span>•</span>
                                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{w.address.split(',')[1] || w.address}</span>
                                </div>
                              </div>
                            </div>
                            {isSelected && <Check size={16} color="#0f766e" style={{ flexShrink: 0, marginLeft: '8px' }} />}
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Actions Footer inside dropdown */}
                  <div style={{
                    padding: '8px 12px',
                    borderTop: '1px solid #e2e8f0',
                    background: '#f8fafc',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}>
                    <button
                      type="button"
                      onClick={() => {
                        setIsDropdownOpen(false);
                        openManageModal();
                      }}
                      style={{
                        border: 'none',
                        background: 'transparent',
                        color: '#0f766e',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 6px',
                        borderRadius: '6px',
                      }}
                    >
                      <Settings size={14} /> Quản lý 16 kho
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsDropdownOpen(false);
                        openConfigModal(null);
                      }}
                      style={{
                        border: 'none',
                        background: '#0f766e',
                        color: '#ffffff',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '5px 10px',
                        borderRadius: '6px',
                      }}
                    >
                      <Plus size={14} /> Thêm kho mới
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Locked Badge for Warehouse Manager */}
          {isManager && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#f0fdfa',
              border: '1px solid #ccfbf1',
              padding: '6px 12px',
              borderRadius: '10px',
              color: '#0f766e',
              fontSize: '0.82rem',
              fontWeight: 700,
            }}>
              <Building2 size={15} />
              <span>Kho Trực Thuộc: <strong>{selectedWarehouse?.name || user?.warehouseCode}</strong></span>
            </div>
          )}
        </div>

        <div className="header-actions">
          <div className="search-bar">
            <Search size={18} className="text-muted" />
            <input type="text" placeholder="Tìm SKU, lô hàng..." />
          </div>

          <button className="icon-btn" title="Thông báo hệ thống">
            <Bell size={20} />
            <span className="notification-badge"></span>
          </button>

          <Link to="/profile" className="user-profile" style={{ textDecoration: 'none', color: 'inherit', cursor: 'pointer' }}>
            <div className="avatar">{initials}</div>
            <div className="user-info">
              <span className="user-name">{user?.name || 'User'}</span>
              <span className="user-role">{user ? ROLE_LABELS[user.role] : ''}</span>
            </div>
          </Link>
        </div>
      </header>

      {/* Global Modals for Admin */}
      <WarehouseConfigModal />
      <WarehouseManageModal />
    </>
  );
};

export default Header;

