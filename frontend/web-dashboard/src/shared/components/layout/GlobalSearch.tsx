import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  X,
  Package,
  FileText,
  Compass,
  ArrowRight,
  Layers,
  ArrowDownLeft,
  ArrowUpRight,
  Send,
  BarChart3,
  Receipt,
  Users,
  Settings,
  Tag,
  Zap,
  MessageSquare,
  Building2,
  Loader2,
} from 'lucide-react';
import { getApiHost } from '../../utils/apiConfig';

// Quick system navigation targets
interface NavShortcut {
  title: string;
  keywords: string[];
  path: string;
  category: string;
  icon: React.ReactNode;
}

const NAV_SHORTCUTS: NavShortcut[] = [
  { title: 'Dashboard Tổng quan', keywords: ['dashboard', 'tong quan', 'overview', 'trang chu'], path: '/', category: 'QUẢN LÝ KHO', icon: <Compass size={15} /> },
  { title: 'Sản phẩm & Tồn kho', keywords: ['ton kho', 'san pham', 'inventory', 'kho', 'hang hoa'], path: '/inventory', category: 'QUẢN LÝ KHO', icon: <Layers size={15} /> },
  { title: 'Nhập kho thực phẩm', keywords: ['nhap kho', 'inbound', 'phieu nhap', 'lo hang'], path: '/inbound', category: 'QUẢN LÝ KHO', icon: <ArrowDownLeft size={15} /> },
  { title: 'Xuất kho', keywords: ['xuat kho', 'outbound', 'phieu xuat', 'soan hang'], path: '/outbound', category: 'QUẢN LÝ KHO', icon: <ArrowUpRight size={15} /> },
  { title: 'Tiếp nhận & Điều phối Đơn', keywords: ['dieu phoi', 'tiep nhan', 'don hang', 'dispatch', 'orders'], path: '/orders', category: 'QUẢN LÝ KHO', icon: <Send size={15} /> },
  { title: 'Đề xuất nhập kho', keywords: ['de xuat', 'du bao', 'demand forecast', 'nhap hang'], path: '/demand-forecast', category: 'QUẢN LÝ KHO', icon: <Package size={15} /> },
  { title: 'Báo cáo Thống kê', keywords: ['bao cao', 'thong ke', 'doanh thu', 'reports'], path: '/reports', category: 'BÁO CÁO', icon: <BarChart3 size={15} /> },
  { title: 'Đối soát Quỹ COD', keywords: ['doi soat', 'cod', 'tien mat', 'reconciliation'], path: '/cod-reconciliation', category: 'BÁO CÁO', icon: <Receipt size={15} /> },
  { title: 'Đơn hàng Online & Bán hàng', keywords: ['ban hang', 'sales', 'don online', 'b2b'], path: '/sales', category: 'QUẢN LÝ BÁN HÀNG', icon: <Package size={15} /> },
  { title: 'Hỗ trợ & Chat Khách hàng', keywords: ['chat', 'ho tro', 'tu van', 'tin nhan', 'khach hang'], path: '/sales?tab=chat', category: 'QUẢN LÝ BÁN HÀNG', icon: <MessageSquare size={15} /> },
  { title: 'Danh mục Sản phẩm', keywords: ['danh muc', 'san pham', 'products', 'gia'], path: '/products', category: 'QUẢN LÝ BÁN HÀNG', icon: <Package size={15} /> },
  { title: 'Chương trình Flash Sale', keywords: ['flash sale', 'giam gia', 'khuyen mai'], path: '/flash-sale', category: 'QUẢN LÝ BÁN HÀNG', icon: <Zap size={15} /> },
  { title: 'Mã Giảm Giá & Voucher', keywords: ['voucher', 'ma giam gia', 'coupon'], path: '/vouchers', category: 'QUẢN LÝ BÁN HÀNG', icon: <Tag size={15} /> },
  { title: 'Nhân viên Trực kho', keywords: ['nhan vien', 'truc kho', 'staff'], path: '/staff', category: 'QUẢN TRỊ HỆ THỐNG', icon: <Users size={15} /> },
  { title: 'Quản lý Người dùng', keywords: ['nguoi dung', 'users', 'tai khoan', 'phan quyen'], path: '/users', category: 'QUẢN TRỊ HỆ THỐNG', icon: <Users size={15} /> },
  { title: 'Nhà cung cấp', keywords: ['nha cung cap', 'suppliers', 'ncc'], path: '/suppliers', category: 'QUẢN TRỊ HỆ THỐNG', icon: <Building2 size={15} /> },
  { title: 'Cài đặt Hệ thống', keywords: ['cai dat', 'he thong', 'settings', 'cau hinh'], path: '/settings', category: 'QUẢN TRỊ HỆ THỐNG', icon: <Settings size={15} /> },
];

export const GlobalSearch: React.FC = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [outbounds, setOutbounds] = useState<any[]>([]);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dataFetchedRef = useRef(false);

  // Shortcut Ctrl + K or Cmd + K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen(true);
        inputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Pre-fetch search corpus once user interacts or focuses
  const prefetchData = useCallback(async () => {
    if (dataFetchedRef.current) return;
    dataFetchedRef.current = true;
    setIsLoading(true);

    try {
      const [prodRes, orderRes, obRes] = await Promise.allSettled([
        fetch(`${getApiHost(3010)}/products?limit=500`).then(r => r.ok ? r.json() : null),
        fetch(`${getApiHost(3004)}/orders?limit=300`).then(r => r.ok ? r.json() : null),
        fetch(`${getApiHost(3007)}/outbound-orders?limit=300`).then(r => r.ok ? r.json() : null),
      ]);

      if (prodRes.status === 'fulfilled' && prodRes.value) {
        const pList = prodRes.value.items || prodRes.value.data || prodRes.value;
        if (Array.isArray(pList)) setProducts(pList);
      }
      if (orderRes.status === 'fulfilled' && orderRes.value) {
        const oList = orderRes.value.items || orderRes.value.data || orderRes.value;
        if (Array.isArray(oList)) setOrders(oList);
      }
      if (obRes.status === 'fulfilled' && obRes.value) {
        const obList = obRes.value.items || obRes.value.data || obRes.value;
        if (Array.isArray(obList)) setOutbounds(obList);
      }
    } catch (err) {
      console.warn('Error loading global search cache:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleFocus = () => {
    setIsOpen(true);
    prefetchData();
  };

  const removeAccents = (str: string) => {
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  };

  const normalizedQuery = useMemo(() => removeAccents(query.trim()), [query]);

  // Filter 1: Quick Navigation matches
  const matchedNavs = useMemo(() => {
    if (!normalizedQuery || normalizedQuery.length < 2) return [];
    return NAV_SHORTCUTS.filter(s => {
      const titleMatch = removeAccents(s.title).includes(normalizedQuery);
      const keywordMatch = s.keywords.some(k => removeAccents(k).includes(normalizedQuery));
      return titleMatch || keywordMatch;
    }).slice(0, 4);
  }, [normalizedQuery]);

  // Filter 2: Products & Inventory matches
  const matchedProducts = useMemo(() => {
    if (!normalizedQuery || normalizedQuery.length < 2) return [];
    return products.filter(p => {
      const nameMatch = removeAccents(p.name || '').includes(normalizedQuery);
      const skuMatch = removeAccents(p.sku || '').includes(normalizedQuery);
      const barcodeMatch = p.barcode ? String(p.barcode).includes(normalizedQuery) : false;
      const catMatch = removeAccents(p.category || '').includes(normalizedQuery);
      return nameMatch || skuMatch || barcodeMatch || catMatch;
    }).slice(0, 5);
  }, [normalizedQuery, products]);

  // Filter 3: Orders & Outbound slips matches
  const matchedOrders = useMemo(() => {
    if (!normalizedQuery || normalizedQuery.length < 2) return [];

    const orderMatches = orders.filter(o => {
      const codeMatch = removeAccents(o.orderCode || o.id || '').includes(normalizedQuery);
      const nameMatch = removeAccents(o.customerName || '').includes(normalizedQuery);
      const phoneMatch = o.customerPhone ? String(o.customerPhone).includes(normalizedQuery) : false;
      return codeMatch || nameMatch || phoneMatch;
    }).map(o => ({
      type: 'ORDER',
      id: o.id,
      code: o.orderCode || (o.id ? `ORD-${String(o.id).slice(0, 8).toUpperCase()}` : 'Đơn hàng'),
      name: o.customerName || 'Khách hàng trực tuyến',
      phone: o.customerPhone,
      amount: Number(o.totalAmount || 0),
      status: String(o.status || 'PENDING').toUpperCase(),
      link: `/orders?search=${encodeURIComponent(o.orderCode || o.id)}`,
    }));

    const outboundMatches = outbounds.filter(ob => {
      const codeMatch = removeAccents(ob.orderCode || ob.slipCode || ob.id || '').includes(normalizedQuery);
      const reqMatch = removeAccents(ob.requesterName || '').includes(normalizedQuery);
      const destMatch = removeAccents(ob.destination || '').includes(normalizedQuery);
      return codeMatch || reqMatch || destMatch;
    }).map(ob => ({
      type: 'OUTBOUND',
      id: ob.id,
      code: ob.orderCode || ob.slipCode || (ob.id ? `OB-${String(ob.id).slice(0, 8).toUpperCase()}` : 'Phiếu xuất'),
      name: ob.requesterName || ob.destination || 'Phiếu xuất kho',
      phone: ob.customerPhone,
      amount: Number(ob.totalQuantity || 0),
      status: String(ob.status || 'PENDING').toUpperCase(),
      link: `/outbound?search=${encodeURIComponent(ob.orderCode || ob.slipCode || ob.id)}`,
    }));

    return [...orderMatches, ...outboundMatches].slice(0, 5);
  }, [normalizedQuery, orders, outbounds]);

  const hasAnyResults = matchedNavs.length > 0 || matchedProducts.length > 0 || matchedOrders.length > 0;

  const handleSelectNav = (path: string) => {
    setIsOpen(false);
    setQuery('');
    navigate(path);
  };

  const handleSelectProduct = (p: any) => {
    setIsOpen(false);
    setQuery('');
    navigate(`/inventory?search=${encodeURIComponent(p.sku || p.name)}`);
  };

  const handleSelectOrder = (link: string) => {
    setIsOpen(false);
    setQuery('');
    navigate(link);
  };

  const getOrderStatusBadge = (status: string) => {
    switch (status) {
      case 'DELIVERED':
      case 'COMPLETED':
      case 'CONFIRMED':
        return { label: 'Đã hoàn thành', bg: '#f0fdf4', color: '#166534', border: '#bbf7d0' };
      case 'DELIVERING':
      case 'PICKING':
      case 'PACKING':
      case 'PROCESSING':
        return { label: 'Đang xử lý', bg: '#f0f9ff', color: '#075985', border: '#bae6fd' };
      case 'PENDING':
      case 'WAITING_TRANSFER':
      case 'WAITING_ACCEPT':
        return { label: 'Chờ tiếp nhận', bg: '#fffbeb', color: '#92400e', border: '#fde68a' };
      case 'CANCELLED':
      case 'FAILED_DELIVERY':
        return { label: 'Sự cố / Hủy', bg: '#fef2f2', color: '#991b1b', border: '#fecaca' };
      default:
        return { label: status, bg: '#f8fafc', color: '#334155', border: '#e2e8f0' };
    }
  };

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      {/* Search Input Bar */}
      <div
        className="search-bar"
        style={{
          display: 'flex',
          alignItems: 'center',
          backgroundColor: isOpen ? '#ffffff' : '#f1f5f9',
          border: isOpen ? '1.5px solid #0f766e' : '1px solid #e2e8f0',
          borderRadius: '24px',
          padding: '6px 14px',
          width: '320px',
          boxShadow: isOpen ? '0 0 0 3px rgba(15, 118, 110, 0.1)' : 'none',
          transition: 'all 0.2s ease',
        }}
      >
        {isLoading ? (
          <Loader2 size={16} className="animate-spin text-muted" style={{ flexShrink: 0, color: '#0f766e' }} />
        ) : (
          <Search size={16} className="text-muted" style={{ flexShrink: 0, color: isOpen ? '#0f766e' : '#64748b' }} />
        )}

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={handleFocus}
          placeholder="Tìm sản phẩm, SKU, đơn hàng..."
          style={{
            border: 'none',
            outline: 'none',
            background: 'transparent',
            marginLeft: '8px',
            width: '100%',
            fontSize: '0.84rem',
            color: '#0f172a',
            fontWeight: 500,
          }}
        />

        {query ? (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              inputRef.current?.focus();
            }}
            style={{
              background: 'transparent',
              border: 'none',
              padding: '2px',
              cursor: 'pointer',
              color: '#94a3b8',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <X size={14} />
          </button>
        ) : (
          <kbd
            style={{
              fontSize: '10px',
              fontWeight: 700,
              color: '#64748b',
              backgroundColor: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '5px',
              padding: '2px 5px',
              flexShrink: 0,
              boxShadow: '0 1px 1px rgba(0,0,0,0.05)',
            }}
          >
            Ctrl K
          </kbd>
        )}
      </div>

      {/* Floating Universal Search Dropdown */}
      {isOpen && query.trim().length >= 2 && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            left: 0,
            width: '460px',
            maxHeight: '440px',
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            boxShadow: '0 12px 30px -4px rgba(0, 0, 0, 0.12), 0 4px 6px -2px rgba(0, 0, 0, 0.04)',
            overflowY: 'auto',
            zIndex: 1000,
          }}
        >
          {/* 1. Quick Navigation Shortcuts */}
          {matchedNavs.length > 0 && (
            <div style={{ borderBottom: '1px solid #f1f5f9' }}>
              <div
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  color: '#64748b',
                  backgroundColor: '#f8fafc',
                  padding: '6px 14px',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                }}
              >
                Chức năng hệ thống ({matchedNavs.length})
              </div>
              {matchedNavs.map(nav => (
                <div
                  key={nav.path}
                  onClick={() => handleSelectNav(nav.path)}
                  style={{
                    padding: '9px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    transition: 'background-color 0.12s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '6px',
                        backgroundColor: '#f0fdfa',
                        color: '#0f766e',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1px solid #ccfbf1',
                      }}
                    >
                      {nav.icon}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.84rem', fontWeight: 600, color: '#0f172a' }}>
                        {nav.title}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                        {nav.category}
                      </div>
                    </div>
                  </div>
                  <ArrowRight size={14} color="#94a3b8" />
                </div>
              ))}
            </div>
          )}

          {/* 2. Products & Inventory Matches */}
          {matchedProducts.length > 0 && (
            <div style={{ borderBottom: '1px solid #f1f5f9' }}>
              <div
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  color: '#64748b',
                  backgroundColor: '#f8fafc',
                  padding: '6px 14px',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                }}
              >
                Sản phẩm & Tồn kho ({matchedProducts.length})
              </div>
              {matchedProducts.map(p => (
                <div
                  key={p.id}
                  onClick={() => handleSelectProduct(p)}
                  style={{
                    padding: '9px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    transition: 'background-color 0.12s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '6px',
                        backgroundColor: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        overflow: 'hidden',
                      }}
                    >
                      {p.imageUrl ? (
                        <img src={p.imageUrl} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <Package size={16} color="#0f766e" />
                      )}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          fontSize: '0.84rem',
                          fontWeight: 600,
                          color: '#0f172a',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {p.name}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontWeight: 600, color: '#0f766e' }}>{p.sku}</span>
                        <span>•</span>
                        <span>{p.category || 'Mặt hàng kho'}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '12px' }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                      {Number(p.stock || 0).toLocaleString('vi-VN')} {p.unit || 'món'}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#16a34a', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                      {Number(p.price || 0).toLocaleString('vi-VN')} đ
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 3. Orders & Outbound Slips Matches */}
          {matchedOrders.length > 0 && (
            <div>
              <div
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  color: '#64748b',
                  backgroundColor: '#f8fafc',
                  padding: '6px 14px',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                }}
              >
                Đơn hàng & Phiếu xuất kho ({matchedOrders.length})
              </div>
              {matchedOrders.map(o => {
                const badge = getOrderStatusBadge(o.status);
                return (
                  <div
                    key={`${o.type}-${o.id}`}
                    onClick={() => handleSelectOrder(o.link)}
                    style={{
                      padding: '9px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      transition: 'background-color 0.12s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '6px',
                          backgroundColor: o.type === 'ORDER' ? '#eff6ff' : '#faf5ff',
                          color: o.type === 'ORDER' ? '#2563eb' : '#9333ea',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: o.type === 'ORDER' ? '1px solid #bfdbfe' : '1px solid #e9d5ff',
                          flexShrink: 0,
                        }}
                      >
                        {o.type === 'ORDER' ? <FileText size={15} /> : <ArrowUpRight size={15} />}
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#0f172a' }}>
                            #{o.code}
                          </span>
                          <span
                            style={{
                              fontSize: '0.65rem',
                              fontWeight: 600,
                              padding: '1px 6px',
                              borderRadius: '4px',
                              backgroundColor: badge.bg,
                              color: badge.color,
                              border: `1px solid ${badge.border}`,
                            }}
                          >
                            {badge.label}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {o.name} {o.phone ? `(${o.phone})` : ''}
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '12px' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                        {o.type === 'ORDER' ? `${o.amount.toLocaleString('vi-VN')} đ` : `${o.amount} đơn vị`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Empty State */}
          {!hasAnyResults && (
            <div style={{ padding: '24px 16px', textAlign: 'center', color: '#64748b' }}>
              <div style={{ marginBottom: '6px', color: '#94a3b8' }}>
                <Search size={24} style={{ margin: '0 auto' }} />
              </div>
              <div style={{ fontSize: '0.84rem', fontWeight: 600, color: '#1e293b' }}>
                Không tìm thấy kết quả phù hợp
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>
                Thử tìm theo tên sản phẩm, mã SKU, mã đơn hàng hoặc từ khóa nghiệp vụ
              </div>
            </div>
          )}

          {/* Quick Shortcuts Footer */}
          <div
            style={{
              padding: '6px 14px',
              backgroundColor: '#f8fafc',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.68rem',
              color: '#94a3b8',
            }}
          >
            <span>Nhấn <strong>ESC</strong> để đóng</span>
            <span>Bấm vào kết quả để chuyển trang</span>
          </div>
        </div>
      )}
    </div>
  );
};
