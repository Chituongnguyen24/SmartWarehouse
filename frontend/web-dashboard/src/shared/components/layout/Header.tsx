import React, { useState, useRef, useEffect } from 'react';
import { 
  Search, 
  Bell, 
  Building2, 
  ChevronDown, 
  Check, 
  Settings, 
  Plus, 
  CheckCheck, 
  Trash2, 
  ShoppingBag, 
  Truck, 
  MessageSquare, 
  AlertTriangle, 
  Info,
  Menu
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, ROLE_LABELS } from '@/features/auth';
import { useWarehouse } from '../../contexts/WarehouseContext';
import { useNotifications } from '@/shared';
import { WarehouseConfigModal, WarehouseManageModal } from '@/features/warehouse';
import { GlobalSearch } from './GlobalSearch';

interface HeaderProps {
  title: string;
  onToggleMobileMenu?: () => void;
}

const Header: React.FC<HeaderProps> = ({ title, onToggleMobileMenu }) => {
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
  const isSaler = user?.role === 'SALES_STAFF';

  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll } = useNotifications();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [whSearch, setWhSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Notification Popover State
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifTab, setNotifTab] = useState<'ALL' | 'ORDER' | 'OUTBOUND' | 'CHAT'>('ALL');
  const notifDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (notifDropdownRef.current && !notifDropdownRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatRelativeTime = (isoString?: string) => {
    if (!isoString) return 'Vừa xong';
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return 'Vừa xong';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} phút trước`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour} giờ trước`;
    const diffDay = Math.floor(diffHour / 24);
    return `${diffDay} ngày trước`;
  };

  const filteredNotifications = notifications.filter(n => {
    if (notifTab === 'ALL') return true;
    return n.type === notifTab;
  });

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
          <button
            type="button"
            className="mobile-menu-btn"
            onClick={onToggleMobileMenu}
            title="Mở menu điều hướng"
          >
            <Menu size={20} />
          </button>
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
              borderRadius: '8px',
              color: '#0f766e',
              fontSize: '0.82rem',
              fontWeight: 600,
            }}>
              <Building2 size={15} />
              <span>Kho Trực Thuộc: <strong>{selectedWarehouse?.name || user?.warehouseCode}</strong></span>
            </div>
          )}

          {/* Business Scope Badge for Sales Staff */}
          {isSaler && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#f0f9ff',
              border: '1px solid #bae6fd',
              padding: '6px 12px',
              borderRadius: '8px',
              color: '#0369a1',
              fontSize: '0.82rem',
              fontWeight: 600,
            }}>
              <Building2 size={15} />
              <span>Phạm Vi Kinh Doanh: <strong>Toàn Mạng Lưới Kho (Tất Cả Đơn Hàng)</strong></span>
            </div>
          )}
        </div>

        <div className="header-actions">
          {/* Universal Global Search */}
          <GlobalSearch />

          {/* Notification Center Popover */}
          <div ref={notifDropdownRef} style={{ position: 'relative' }}>
            <button
              type="button"
              className="icon-btn"
              title="Thông báo hệ thống"
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              style={{
                position: 'relative',
                cursor: 'pointer',
                backgroundColor: isNotifOpen ? '#f0fdfa' : 'transparent',
                borderColor: isNotifOpen ? '#0f766e' : undefined,
              }}
            >
              <Bell size={20} color={isNotifOpen ? '#0f766e' : '#475569'} />
              {unreadCount > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: '-4px',
                    right: '-4px',
                    backgroundColor: '#dc2626',
                    color: '#ffffff',
                    fontSize: '10px',
                    fontWeight: 700,
                    minWidth: '17px',
                    height: '17px',
                    borderRadius: '9999px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 4px',
                    border: '1.5px solid #ffffff',
                    fontVariantNumeric: 'tabular-nums',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  }}
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown Panel */}
            {isNotifOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 10px)',
                  right: 0,
                  width: '390px',
                  backgroundColor: '#ffffff',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
                  zIndex: 1000,
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {/* Popover Header */}
                <div
                  style={{
                    padding: '12px 14px',
                    borderBottom: '1px solid #f1f5f9',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    backgroundColor: '#f8fafc',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                      Thông Báo Hệ Thống
                    </span>
                    {unreadCount > 0 && (
                      <span
                        style={{
                          fontSize: '10.5px',
                          fontWeight: 600,
                          backgroundColor: '#fef2f2',
                          color: '#dc2626',
                          border: '1px solid #fecaca',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {unreadCount} mới
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={markAllAsRead}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          border: 'none',
                          background: 'transparent',
                          color: '#0f766e',
                          fontSize: '11px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          padding: '3px 6px',
                          borderRadius: '4px',
                        }}
                        title="Đánh dấu tất cả là đã đọc"
                      >
                        <CheckCheck size={13} />
                        <span>Đã đọc</span>
                      </button>
                    )}
                    {notifications.length > 0 && (
                      <button
                        type="button"
                        onClick={clearAll}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px',
                          border: 'none',
                          background: 'transparent',
                          color: '#94a3b8',
                          fontSize: '11px',
                          cursor: 'pointer',
                          padding: '3px 5px',
                          borderRadius: '4px',
                        }}
                        title="Xóa toàn bộ danh sách"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Filter Tabs */}
                <div
                  style={{
                    display: 'flex',
                    gap: '4px',
                    padding: '8px 12px',
                    borderBottom: '1px solid #f1f5f9',
                    backgroundColor: '#ffffff',
                    overflowX: 'auto',
                  }}
                >
                  {[
                    { key: 'ALL', label: 'Tất Cả' },
                    { key: 'ORDER', label: 'Đơn Hàng' },
                    { key: 'OUTBOUND', label: 'Xuất Kho' },
                    { key: 'CHAT', label: 'Tư Vấn & Chat' },
                  ].map(tab => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setNotifTab(tab.key as any)}
                      style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: notifTab === tab.key ? 600 : 500,
                        border: notifTab === tab.key ? '1px solid #0f766e' : '1px solid transparent',
                        backgroundColor: notifTab === tab.key ? '#f0fdfa' : '#f8fafc',
                        color: notifTab === tab.key ? '#0f766e' : '#64748b',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Notifications Scrollable List */}
                <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
                  {filteredNotifications.length === 0 ? (
                    <div style={{ padding: '32px 16px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>
                      <Bell size={24} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
                      <div>Không có thông báo nào trong mục này</div>
                    </div>
                  ) : (
                    filteredNotifications.map(n => {
                      const isUnread = !n.isRead;
                      return (
                        <div
                          key={n.id}
                          onClick={() => {
                            markAsRead(n.id);
                            if (n.link) {
                              navigate(n.link);
                              setIsNotifOpen(false);
                            }
                          }}
                          style={{
                            padding: '10px 14px',
                            borderBottom: '1px solid #f8fafc',
                            display: 'flex',
                            gap: '10px',
                            alignItems: 'flex-start',
                            backgroundColor: isUnread ? '#f0fdfa40' : '#ffffff',
                            cursor: 'pointer',
                            transition: 'background-color 150ms',
                          }}
                          onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                          onMouseLeave={e => (e.currentTarget.style.backgroundColor = isUnread ? '#f0fdfa40' : '#ffffff')}
                        >
                          {/* Type Icon */}
                          <div
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '6px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              backgroundColor:
                                n.type === 'ORDER' ? '#eff6ff'
                                : n.type === 'OUTBOUND' ? '#f0fdfa'
                                : n.type === 'CHAT' ? '#faf5ff'
                                : n.type === 'IOT_ALERT' ? '#fef2f2'
                                : '#f8fafc',
                              border: `1px solid ${
                                n.type === 'ORDER' ? '#bfdbfe'
                                : n.type === 'OUTBOUND' ? '#ccfbf1'
                                : n.type === 'CHAT' ? '#e9d5ff'
                                : n.type === 'IOT_ALERT' ? '#fecaca'
                                : '#e2e8f0'
                              }`,
                            }}
                          >
                            {n.type === 'ORDER' ? <ShoppingBag size={14} color="#2563eb" />
                              : n.type === 'OUTBOUND' ? <Truck size={14} color="#0f766e" />
                              : n.type === 'CHAT' ? <MessageSquare size={14} color="#9333ea" />
                              : n.type === 'IOT_ALERT' ? <AlertTriangle size={14} color="#dc2626" />
                              : <Info size={14} color="#64748b" />}
                          </div>

                          {/* Content */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
                              <span style={{ fontSize: '12px', fontWeight: isUnread ? 700 : 600, color: isUnread ? '#0f172a' : '#334155' }}>
                                {n.title}
                              </span>
                              {isUnread && (
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#0f766e', flexShrink: 0 }} />
                              )}
                            </div>
                            <p style={{ margin: '2px 0 0', fontSize: '11.5px', color: '#64748b', lineHeight: 1.35, wordBreak: 'break-word' }}>
                              {n.message}
                            </p>
                            <span style={{ display: 'inline-block', marginTop: '4px', fontSize: '10.5px', color: '#94a3b8', fontVariantNumeric: 'tabular-nums' }}>
                              {formatRelativeTime(n.createdAt)}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Popover Footer */}
                <div
                  style={{
                    padding: '8px 14px',
                    borderTop: '1px solid #f1f5f9',
                    backgroundColor: '#f8fafc',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <span style={{ fontSize: '11px', color: '#0f766e', fontWeight: 600 }}>
                    Hệ thống thông báo thời gian thực (Realtime Sync)
                  </span>
                </div>
              </div>
            )}
          </div>

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

