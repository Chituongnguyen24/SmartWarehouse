import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Activity,
  Search,
  Filter,
  AlertTriangle,
  Info,
  AlertOctagon,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Download,
  Calendar,
  Eye,
  X,
  Copy,
  Check,
  ShieldAlert,
  CheckCircle2,
  Server,
  Smartphone,
  Cpu,
  Monitor,
  Truck,
  Layers,
  ArrowRight,
  Clock,
} from 'lucide-react';
import { useAuth } from '@/features/auth';

const API_BASE = 'http://localhost:3012';

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actorId?: string;
  actorName: string;
  actorRole?: string;
  action: string;
  actionCode?: string;
  target?: string;
  targetId?: string;
  clientApp?: string;
  serviceName?: string;
  ipAddress?: string;
  severity: 'INFO' | 'WARN' | 'CRITICAL';
  details?: string;
  payloadBefore?: any;
  payloadAfter?: any;
}

interface AuditStats {
  total: number;
  infoCount: number;
  warnCount: number;
  criticalCount: number;
  todayCount: number;
}

const SEVERITY_CONFIG = {
  INFO: {
    label: 'Thông Tin',
    color: '#166534',
    bg: '#f0fdf4',
    border: '#bbf7d0',
    icon: Info,
  },
  WARN: {
    label: 'Cảnh Báo',
    color: '#92400e',
    bg: '#fffbeb',
    border: '#fde68a',
    icon: AlertTriangle,
  },
  CRITICAL: {
    label: 'Nghiêm Trọng',
    color: '#991b1b',
    bg: '#fef2f2',
    border: '#fecaca',
    icon: AlertOctagon,
  },
};

const SERVICE_OPTIONS = [
  { value: 'ALL', label: 'Tất cả dịch vụ' },
  { value: 'user-service', label: 'user-service (Quản trị & Phân quyền)' },
  { value: 'inbound-service', label: 'inbound-service (Nhập kho & NCC)' },
  { value: 'inventory-service', label: 'inventory-service (Tồn kho & Kiểm kê)' },
  { value: 'outbound-service', label: 'outbound-service (Xuất kho & Đơn hàng)' },
  { value: 'transport-service', label: 'transport-service (Vận chuyển & Giao nhận)' },
  { value: 'iot-service', label: 'iot-service (Giám sát IoT Kho Lạnh)' },
  { value: 'warehouse-service', label: 'warehouse-service (Kệ kho & Pick-to-Light)' },
];

const CLIENT_APP_OPTIONS = [
  { value: 'ALL', label: 'Tất cả ứng dụng' },
  { value: 'WEB_DASHBOARD', label: 'Web Dashboard Điều Hành' },
  { value: 'STAFF_APP', label: 'Ứng Dụng Nhân Viên Kho' },
  { value: 'DRIVER_APP', label: 'Ứng Dụng Tài Xế Giao Hàng' },
  { value: 'IOT_GATEWAY', label: 'Cổng Cảm Biến IoT' },
  { value: 'AI_DAEMON', label: 'Hệ Thống Trí Tuệ Nhân Tạo AI' },
];

const AuditLog: React.FC = () => {
  const { token } = useAuth();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [countdown, setCountdown] = useState(15);

  // Stats
  const [stats, setStats] = useState<AuditStats>({
    total: 0,
    infoCount: 0,
    warnCount: 0,
    criticalCount: 0,
    todayCount: 0,
  });

  // Filters
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [serviceFilter, setServiceFilter] = useState<string>('ALL');
  const [clientAppFilter, setClientAppFilter] = useState<string>('ALL');
  const [timeRange, setTimeRange] = useState<'ALL' | 'TODAY' | 'WEEK' | 'MONTH'>('ALL');

  // Pagination
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(15);

  // Detail Modal
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);
  const [copiedPayload, setCopiedPayload] = useState(false);

  const headers = useMemo(() => ({
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }), [token]);

  // Fetch KPI Stats
  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_BASE}/audit-logs/stats`, { headers });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (e) {
      console.warn('Could not fetch audit stats:', e);
    }
  };

  // Fetch Logs
  const fetchLogs = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const params = new URLSearchParams();
      if (severityFilter && severityFilter !== 'ALL') params.set('severity', severityFilter);
      if (serviceFilter && serviceFilter !== 'ALL') params.set('serviceName', serviceFilter);
      if (clientAppFilter && clientAppFilter !== 'ALL') params.set('clientApp', clientAppFilter);
      if (search.trim()) params.set('search', search.trim());

      // Date range filtering
      if (timeRange === 'TODAY') {
        const todayStr = new Date().toISOString().split('T')[0];
        params.set('dateFrom', todayStr);
        params.set('dateTo', todayStr);
      } else if (timeRange === 'WEEK') {
        const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
        params.set('dateFrom', weekAgo);
      } else if (timeRange === 'MONTH') {
        const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
        params.set('dateFrom', monthAgo);
      }

      params.set('limit', String(pageSize));
      params.set('offset', String(page * pageSize));

      const res = await fetch(`${API_BASE}/audit-logs?${params.toString()}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setLogs(Array.isArray(data.data) ? data.data : []);
        setTotal(typeof data.total === 'number' ? data.total : 0);
      }
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [severityFilter, serviceFilter, clientAppFilter, search, timeRange, pageSize, page, headers]);

  useEffect(() => {
    fetchLogs();
    fetchStats();
  }, [fetchLogs]);

  // Auto-refresh interval
  useEffect(() => {
    if (!autoRefresh) return;
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          fetchLogs(true);
          fetchStats();
          return 15;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [autoRefresh, fetchLogs]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    fetchLogs();
  };

  const handleResetFilters = () => {
    setSearch('');
    setSeverityFilter('ALL');
    setServiceFilter('ALL');
    setClientAppFilter('ALL');
    setTimeRange('ALL');
    setPage(0);
  };

  // Export CSV
  const handleExportCSV = () => {
    if (logs.length === 0) {
      alert('Không có dữ liệu nhật ký để xuất.');
      return;
    }

    const headersList = [
      'ID',
      'Thời Gian',
      'Người Thực Hiện',
      'Vai Trò',
      'Hành Động',
      'Mã Nghiệp Vụ',
      'Đối Tượng',
      'Mã Đối Tượng',
      'Dịch Vụ',
      'Ứng Dụng',
      'IP',
      'Mức Độ',
      'Chi Tiết',
    ];

    const rows = logs.map(l => [
      l.id,
      new Date(l.timestamp).toLocaleString('vi-VN'),
      `"${(l.actorName || '').replace(/"/g, '""')}"`,
      l.actorRole || '',
      `"${(l.action || '').replace(/"/g, '""')}"`,
      l.actionCode || '',
      l.target || '',
      l.targetId || '',
      l.serviceName || '',
      l.clientApp || '',
      l.ipAddress || '',
      l.severity,
      `"${(l.details || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      '\uFEFF' +
      [headersList.join(','), ...rows.map(r => r.join(','))].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `Audit_Log_Export_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Copy JSON Payload
  const handleCopyPayload = (data: any) => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopiedPayload(true);
    setTimeout(() => setCopiedPayload(false), 2500);
  };

  const totalPages = Math.ceil(total / pageSize);

  const getClientAppIcon = (app?: string) => {
    switch (app) {
      case 'STAFF_APP':
        return <Smartphone size={13} color="#0284c7" />;
      case 'DRIVER_APP':
        return <Truck size={13} color="#0f766e" />;
      case 'IOT_GATEWAY':
        return <Cpu size={13} color="#d97706" />;
      case 'AI_DAEMON':
        return <Activity size={13} color="#7c3aed" />;
      case 'WEB_DASHBOARD':
      default:
        return <Monitor size={13} color="#475569" />;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', paddingBottom: '2rem' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Activity size={24} color="#0f766e" />
            <h1 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
              Nhật Ký Hoạt Động & Kiểm Toán Hệ Thống
            </h1>
          </div>
          <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '4px 0 0 0' }}>
            Truy vết toàn diện 5W1H mọi giao dịch xuất nhập kho, thay đổi phân quyền, biến động kiểm kê tồn kho và cảnh báo IoT (Audit Trail).
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {/* Auto Refresh Toggle */}
          <button
            type="button"
            onClick={() => setAutoRefresh(!autoRefresh)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 12px',
              borderRadius: 6,
              border: autoRefresh ? '1px solid #bbf7d0' : '1px solid #cbd5e1',
              backgroundColor: autoRefresh ? '#f0fdf4' : '#ffffff',
              color: autoRefresh ? '#166534' : '#475569',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Clock size={14} className={autoRefresh ? 'animate-spin' : ''} />
            {autoRefresh ? `Tự động làm mới (${countdown}s)` : 'Tự động làm mới: Tắt'}
          </button>

          {/* Refresh Manual */}
          <button
            type="button"
            onClick={() => { fetchLogs(); fetchStats(); }}
            disabled={refreshing}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 12px',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#334155',
              fontSize: '0.85rem',
              fontWeight: 500,
              cursor: refreshing ? 'not-allowed' : 'pointer',
            }}
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            Làm mới
          </button>

          {/* Export CSV */}
          <button
            type="button"
            onClick={handleExportCSV}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 14px',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#0f766e',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Download size={15} /> Xuất CSV
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem' }}>
        <div style={kpiCardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
              Tổng Sự Kiện Đã Ghi
            </span>
            <div style={kpiIconStyle('#f1f5f9', '#0f766e')}>
              <Activity size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 700, color: '#0f172a', marginTop: 8, fontVariantNumeric: 'tabular-nums' }}>
            {stats.total.toLocaleString('vi-VN')}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 4 }}>
            Hôm nay: <strong>+{stats.todayCount}</strong> sự kiện mới
          </div>
        </div>

        <div style={kpiCardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
              Hoạt Động Bình Thường (INFO)
            </span>
            <div style={kpiIconStyle('#f0fdf4', '#166534')}>
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 700, color: '#166534', marginTop: 8, fontVariantNumeric: 'tabular-nums' }}>
            {stats.infoCount.toLocaleString('vi-VN')}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 4 }}>
            {stats.total > 0 ? Math.round((stats.infoCount / stats.total) * 100) : 0}% tổng lưu lượng hệ thống
          </div>
        </div>

        <div style={kpiCardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
              Cảnh Báo Vận Hành (WARN)
            </span>
            <div style={kpiIconStyle('#fffbeb', '#b45309')}>
              <AlertTriangle size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 700, color: '#b45309', marginTop: 8, fontVariantNumeric: 'tabular-nums' }}>
            {stats.warnCount.toLocaleString('vi-VN')}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 4 }}>
            Lệch kiểm kê, cận hạn, sửa cấu hình
          </div>
        </div>

        <div style={kpiCardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
              Sự Cố Nghiêm Trọng (CRITICAL)
            </span>
            <div style={kpiIconStyle('#fef2f2', '#b91c1c')}>
              <ShieldAlert size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 700, color: '#b91c1c', marginTop: 8, fontVariantNumeric: 'tabular-nums' }}>
            {stats.criticalCount.toLocaleString('vi-VN')}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 4 }}>
            Quá nhiệt kho lạnh, khóa tài khoản
          </div>
        </div>
      </div>

      {/* Multi-Filter Controls */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          backgroundColor: '#ffffff',
          padding: '14px 16px',
          borderRadius: 8,
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
        }}
      >
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {/* Search Box */}
          <div style={{ flex: '1 1 320px', position: 'relative' }}>
            <Search
              size={16}
              color="#94a3b8"
              style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}
            />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Tìm kiếm theo hành động, người thực hiện, mã đối tượng, IP..."
              style={{
                width: '100%',
                padding: '8px 10px 8px 34px',
                borderRadius: 6,
                border: '1px solid #cbd5e1',
                fontSize: '0.85rem',
                color: '#0f172a',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                style={{
                  position: 'absolute',
                  right: 8,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#94a3b8',
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          <button
            type="submit"
            style={{
              padding: '8px 16px',
              borderRadius: 6,
              border: 'none',
              backgroundColor: '#0f766e',
              color: '#ffffff',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Search size={14} /> Tìm Kiếm
          </button>
        </form>

        {/* Dropdown Filters Row */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          {/* Severity */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 500 }}>Mức độ:</span>
            <select
              value={severityFilter}
              onChange={e => { setSeverityFilter(e.target.value); setPage(0); }}
              style={filterSelectStyle}
            >
              <option value="ALL">Tất cả mức độ</option>
              <option value="INFO">Thông tin (INFO)</option>
              <option value="WARN">Cảnh báo (WARN)</option>
              <option value="CRITICAL">Nghiêm trọng (CRITICAL)</option>
            </select>
          </div>

          {/* Service */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 500 }}>Dịch vụ:</span>
            <select
              value={serviceFilter}
              onChange={e => { setServiceFilter(e.target.value); setPage(0); }}
              style={filterSelectStyle}
            >
              {SERVICE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Client App */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 500 }}>Nguồn app:</span>
            <select
              value={clientAppFilter}
              onChange={e => { setClientAppFilter(e.target.value); setPage(0); }}
              style={filterSelectStyle}
            >
              {CLIENT_APP_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Time Range */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 500 }}>Thời gian:</span>
            <select
              value={timeRange}
              onChange={e => { setTimeRange(e.target.value as any); setPage(0); }}
              style={filterSelectStyle}
            >
              <option value="ALL">Toàn thời gian</option>
              <option value="TODAY">Hôm nay</option>
              <option value="WEEK">7 ngày qua</option>
              <option value="MONTH">30 ngày qua</option>
            </select>
          </div>

          {/* Reset Filters */}
          {(severityFilter !== 'ALL' || serviceFilter !== 'ALL' || clientAppFilter !== 'ALL' || timeRange !== 'ALL' || search) && (
            <button
              type="button"
              onClick={handleResetFilters}
              style={{
                background: 'none',
                border: 'none',
                color: '#dc2626',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
                padding: '4px 8px',
                marginLeft: 'auto',
              }}
            >
              Xóa bộ lọc
            </button>
          )}
        </div>
      </div>

      {/* Main Table */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: 8,
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
          overflow: 'hidden',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 600, fontSize: '0.78rem', textTransform: 'uppercase' }}>
                <th style={{ padding: '10px 14px', width: '150px' }}>Thời Gian</th>
                <th style={{ padding: '10px 14px', width: '200px' }}>Người Thực Hiện</th>
                <th style={{ padding: '10px 14px' }}>Hành Động / Sự Kiện</th>
                <th style={{ padding: '10px 14px', width: '180px' }}>Đối Tượng Tác Động</th>
                <th style={{ padding: '10px 14px', width: '160px' }}>Nguồn & Dịch Vụ</th>
                <th style={{ padding: '10px 14px', width: '120px' }}>Địa Chỉ IP</th>
                <th style={{ padding: '10px 14px', width: '110px' }}>Mức Độ</th>
                <th style={{ padding: '10px 14px', width: '70px', textAlign: 'center' }}>Chi Tiết</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                      <RefreshCw size={24} className="animate-spin" color="#0f766e" />
                      <span>Đang tải nhật ký kiểm toán...</span>
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                    <Activity size={36} color="#cbd5e1" style={{ margin: '0 auto 8px' }} />
                    <p style={{ margin: 0, fontWeight: 500 }}>Không tìm thấy bản ghi nhật ký nào.</p>
                    <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Thử thay đổi điều kiện tìm kiếm hoặc khoảng thời gian.</span>
                  </td>
                </tr>
              ) : (
                logs.map((log, idx) => {
                  const cfg = SEVERITY_CONFIG[log.severity] || SEVERITY_CONFIG.INFO;
                  const IconComponent = cfg.icon;
                  const logDate = new Date(log.timestamp);
                  const isToday = new Date().toDateString() === logDate.toDateString();

                  return (
                    <tr
                      key={log.id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fafafa',
                        transition: 'background-color 0.15s ease',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = idx % 2 === 0 ? '#ffffff' : '#fafafa')}
                    >
                      {/* Timestamp */}
                      <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#0f172a', fontFamily: 'monospace' }}>
                          {logDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </div>
                        <div style={{ fontSize: '0.725rem', color: '#64748b', marginTop: 2 }}>
                          {isToday ? 'Hôm nay' : logDate.toLocaleDateString('vi-VN')}
                        </div>
                      </td>

                      {/* Actor */}
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ fontWeight: 600, color: '#0f172a', lineHeight: '1.3' }}>
                          {log.actorName}
                        </div>
                        {log.actorRole && (
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '1px 6px',
                              borderRadius: 4,
                              fontSize: '0.675rem',
                              fontWeight: 700,
                              backgroundColor: '#f1f5f9',
                              color: '#475569',
                              marginTop: 3,
                              border: '1px solid #e2e8f0',
                            }}
                          >
                            {log.actorRole}
                          </span>
                        )}
                      </td>

                      {/* Action & Code */}
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ fontWeight: 500, color: '#0f172a', lineHeight: '1.35' }}>
                          {log.action}
                        </div>
                        {log.actionCode && (
                          <div style={{ fontSize: '0.7rem', color: '#64748b', fontFamily: 'monospace', marginTop: 3 }}>
                            {log.actionCode}
                          </div>
                        )}
                        {log.details && (
                          <div
                            style={{
                              fontSize: '0.75rem',
                              color: '#64748b',
                              marginTop: 4,
                              display: '-webkit-box',
                              WebkitLineClamp: 1,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                            }}
                            title={log.details}
                          >
                            {log.details}
                          </div>
                        )}
                      </td>

                      {/* Target */}
                      <td style={{ padding: '10px 14px' }}>
                        {log.target && (
                          <span
                            style={{
                              padding: '2px 7px',
                              borderRadius: 4,
                              backgroundColor: '#f8fafc',
                              color: '#334155',
                              fontWeight: 600,
                              fontSize: '0.725rem',
                              border: '1px solid #e2e8f0',
                              display: 'inline-block',
                            }}
                          >
                            {log.target}
                          </span>
                        )}
                        {log.targetId && (
                          <div
                            style={{
                              fontSize: '0.75rem',
                              color: '#0284c7',
                              fontWeight: 600,
                              fontFamily: 'monospace',
                              marginTop: 3,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              maxWidth: '160px',
                            }}
                            title={log.targetId}
                          >
                            {log.targetId}
                          </div>
                        )}
                      </td>

                      {/* Source & Service */}
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.75rem', color: '#334155', fontWeight: 500 }}>
                          {getClientAppIcon(log.clientApp)}
                          <span>{log.clientApp ? log.clientApp.replace('_', ' ') : 'WEB'}</span>
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: 2, fontFamily: 'monospace' }}>
                          {log.serviceName || 'internal'}
                        </div>
                      </td>

                      {/* IP */}
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: '#475569' }}>
                          {log.ipAddress || '—'}
                        </span>
                      </td>

                      {/* Severity */}
                      <td style={{ padding: '10px 14px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '3px 8px',
                            borderRadius: 4,
                            fontSize: '0.725rem',
                            fontWeight: 600,
                            backgroundColor: cfg.bg,
                            color: cfg.color,
                            border: `1px solid ${cfg.border}`,
                          }}
                        >
                          <IconComponent size={12} />
                          {cfg.label}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => setSelectedLog(log)}
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 5,
                            border: '1px solid #e2e8f0',
                            backgroundColor: '#ffffff',
                            color: '#0f766e',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 0,
                          }}
                          title="Xem chi tiết sự kiện & Payload diff"
                        >
                          <Eye size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer with Pagination */}
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.8rem',
            color: '#64748b',
            flexWrap: 'wrap',
            gap: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span>
              Hiển thị <strong>{total > 0 ? page * pageSize + 1 : 0}</strong>–
              <strong>{Math.min((page + 1) * pageSize, total)}</strong> / <strong>{total}</strong> bản ghi
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: '0.75rem' }}>Số dòng:</span>
              <select
                value={pageSize}
                onChange={e => { setPageSize(Number(e.target.value)); setPage(0); }}
                style={{ padding: '3px 6px', borderRadius: 4, border: '1px solid #cbd5e1', fontSize: '0.75rem' }}
              >
                <option value={15}>15</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>

          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button
                type="button"
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                style={{
                  padding: '4px 8px',
                  borderRadius: 4,
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: page === 0 ? '#94a3b8' : '#334155',
                  cursor: page === 0 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  fontSize: '0.78rem',
                }}
              >
                <ChevronLeft size={14} /> Trước
              </button>

              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#0f172a', padding: '0 4px' }}>
                {page + 1} / {totalPages}
              </span>

              <button
                type="button"
                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                disabled={page >= totalPages - 1}
                style={{
                  padding: '4px 8px',
                  borderRadius: 4,
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: page >= totalPages - 1 ? '#94a3b8' : '#334155',
                  cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  fontSize: '0.78rem',
                }}
              >
                Sau <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          MODAL: CHI TIẾT SỰ KIỆN & PAYLOAD INSPECTOR (EVENT INSPECTOR)
      ───────────────────────────────────────────────────────────── */}
      {selectedLog && (
        <div
          onClick={() => setSelectedLog(null)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9998,
            padding: '1rem',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 12,
              width: '780px',
              maxWidth: '95%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              border: '1px solid #cbd5e1',
            }}
          >
            {/* Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                padding: '16px 20px',
                borderBottom: '1px solid #e2e8f0',
                backgroundColor: '#f8fafc',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: 4,
                      fontSize: '0.725rem',
                      fontWeight: 700,
                      backgroundColor: SEVERITY_CONFIG[selectedLog.severity].bg,
                      color: SEVERITY_CONFIG[selectedLog.severity].color,
                      border: `1px solid ${SEVERITY_CONFIG[selectedLog.severity].border}`,
                    }}
                  >
                    {SEVERITY_CONFIG[selectedLog.severity].label}
                  </span>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                    {selectedLog.action}
                  </h3>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 4, fontFamily: 'monospace' }}>
                  ID Sự Kiện: {selectedLog.id} • {new Date(selectedLog.timestamp).toLocaleString('vi-VN')}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Meta Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 12,
                  backgroundColor: '#f8fafc',
                  padding: 12,
                  borderRadius: 8,
                  border: '1px solid #e2e8f0',
                  fontSize: '0.8rem',
                }}
              >
                <div>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '0.725rem' }}>Người Thực Hiện</span>
                  <strong style={{ color: '#0f172a' }}>{selectedLog.actorName}</strong>
                  {selectedLog.actorRole && (
                    <span style={{ color: '#0f766e', display: 'block', fontSize: '0.7rem' }}>
                      ({selectedLog.actorRole})
                    </span>
                  )}
                </div>

                <div>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '0.725rem' }}>Dịch Vụ Phát Sinh</span>
                  <strong style={{ color: '#0284c7', fontFamily: 'monospace' }}>{selectedLog.serviceName || 'user-service'}</strong>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '0.7rem' }}>
                    Nguồn: {selectedLog.clientApp || 'WEB_DASHBOARD'}
                  </span>
                </div>

                <div>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '0.725rem' }}>Địa Chỉ IP & Mã Action</span>
                  <strong style={{ color: '#0f172a', fontFamily: 'monospace' }}>{selectedLog.ipAddress || '127.0.0.1'}</strong>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '0.7rem', fontFamily: 'monospace' }}>
                    {selectedLog.actionCode || 'N/A'}
                  </span>
                </div>
              </div>

              {/* Details Text */}
              {selectedLog.details && (
                <div style={{ backgroundColor: '#ffffff', padding: 12, borderRadius: 6, border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '0.725rem', fontWeight: 600, color: '#475569', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                    Diễn Giải Chi Tiết Nghiệp Vụ
                  </span>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#0f172a', lineHeight: '1.45' }}>
                    {selectedLog.details}
                  </p>
                </div>
              )}

              {/* Target & Entity */}
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', fontSize: '0.8rem' }}>
                <span style={{ color: '#64748b' }}>Đối tượng bị tác động:</span>
                <span style={{ padding: '2px 8px', borderRadius: 4, backgroundColor: '#f1f5f9', color: '#0f172a', fontWeight: 600, border: '1px solid #e2e8f0' }}>
                  {selectedLog.target || 'Hệ thống'}
                </span>
                {selectedLog.targetId && (
                  <span style={{ fontFamily: 'monospace', color: '#0f766e', fontWeight: 700 }}>
                    {selectedLog.targetId}
                  </span>
                )}
              </div>

              {/* Payload Diff Section */}
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a' }}>
                    Dữ Liệu Snapshot (Payload Inspector)
                  </span>
                  {(selectedLog.payloadBefore || selectedLog.payloadAfter) && (
                    <button
                      type="button"
                      onClick={() => handleCopyPayload({ before: selectedLog.payloadBefore, after: selectedLog.payloadAfter })}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '3px 8px',
                        borderRadius: 4,
                        border: '1px solid #cbd5e1',
                        backgroundColor: '#ffffff',
                        color: copiedPayload ? '#166534' : '#64748b',
                        fontSize: '0.725rem',
                        cursor: 'pointer',
                      }}
                    >
                      {copiedPayload ? <Check size={12} /> : <Copy size={12} />}
                      {copiedPayload ? 'Đã sao chép' : 'Sao chép JSON'}
                    </button>
                  )}
                </div>

                {selectedLog.payloadBefore || selectedLog.payloadAfter ? (
                  <div style={{ display: 'grid', gridTemplateColumns: selectedLog.payloadBefore ? '1fr 1fr' : '1fr', gap: 10 }}>
                    {selectedLog.payloadBefore && (
                      <div>
                        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#991b1b', marginBottom: 4, textTransform: 'uppercase' }}>
                          Trạng Thái Trước (Payload Before)
                        </div>
                        <pre style={codeBlockStyle('#fff5f5', '#7f1d1d', '#fecdd3')}>
                          {JSON.stringify(selectedLog.payloadBefore, null, 2)}
                        </pre>
                      </div>
                    )}

                    {selectedLog.payloadAfter && (
                      <div>
                        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#166534', marginBottom: 4, textTransform: 'uppercase' }}>
                          Trạng Thái Sau (Payload After)
                        </div>
                        <pre style={codeBlockStyle('#f0fdf4', '#14532d', '#bbf7d0')}>
                          {JSON.stringify(selectedLog.payloadAfter, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: 6, textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem' }}>
                    Không có snapshot dữ liệu thô (Raw payload không phát sinh thay đổi cấu trúc).
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                padding: '12px 20px',
                borderTop: '1px solid #e2e8f0',
                backgroundColor: '#f8fafc',
              }}
            >
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                style={{
                  padding: '7px 16px',
                  borderRadius: 6,
                  border: 'none',
                  backgroundColor: '#0f172a',
                  color: '#ffffff',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Styles
const kpiCardStyle: React.CSSProperties = {
  backgroundColor: '#ffffff',
  borderRadius: 8,
  padding: '14px 16px',
  border: '1px solid #e2e8f0',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.03)',
};

const kpiIconStyle = (bg: string, color: string): React.CSSProperties => ({
  width: 32,
  height: 32,
  borderRadius: 6,
  backgroundColor: bg,
  color: color,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
});

const filterSelectStyle: React.CSSProperties = {
  padding: '6px 10px',
  borderRadius: 6,
  border: '1px solid #cbd5e1',
  fontSize: '0.8rem',
  color: '#0f172a',
  backgroundColor: '#ffffff',
  outline: 'none',
  cursor: 'pointer',
};

const codeBlockStyle = (bg: string, color: string, border: string): React.CSSProperties => ({
  backgroundColor: bg,
  color: color,
  border: `1px solid ${border}`,
  borderRadius: 6,
  padding: '10px 12px',
  fontSize: '0.75rem',
  fontFamily: 'Consolas, Monaco, monospace',
  margin: 0,
  maxHeight: '260px',
  overflowY: 'auto',
  lineHeight: '1.4',
});

export default AuditLog;
