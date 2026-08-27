import React, { useState, useEffect } from 'react';
import { Activity, Search, Filter, AlertTriangle, Info, AlertOctagon, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const API_BASE = 'http://localhost:3012';

interface AuditLogEntry {
  id: string;
  timestamp: string;
  actorName: string;
  actorRole: string;
  action: string;
  target: string;
  details: string;
  ipAddress: string;
  serviceName: string;
  severity: 'INFO' | 'WARN' | 'CRITICAL';
}

const SEVERITY_CONFIG = {
  INFO: { label: 'Info', color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', icon: <Info size={14} /> },
  WARN: { label: 'Cảnh báo', color: '#d97706', bg: '#fffbeb', border: '#fde68a', icon: <AlertTriangle size={14} /> },
  CRITICAL: { label: 'Nghiêm trọng', color: '#dc2626', bg: '#fef2f2', border: '#fecaca', icon: <AlertOctagon size={14} /> },
};

const PAGE_SIZE = 15;

const AuditLog = () => {
  const { token } = useAuth();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('');
  const [page, setPage] = useState(0);

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (severityFilter) params.set('severity', severityFilter);
      if (search) params.set('search', search);
      params.set('limit', String(PAGE_SIZE));
      params.set('offset', String(page * PAGE_SIZE));

      const res = await fetch(`${API_BASE}/audit-logs?${params.toString()}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setLogs(data.data);
        setTotal(data.total);
      }
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [severityFilter, page]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    fetchLogs();
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-6)' }}>
      <div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.25rem' }}>Nhật ký Hệ thống (Audit Log)</h2>
        <p className="text-muted" style={{ fontSize: '0.875rem' }}>
          Ghi nhận tất cả hoạt động quan trọng trong hệ thống: đăng nhập, thao tác dữ liệu, cảnh báo AI và sự cố IoT.
        </p>
      </div>

      {/* KPI Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--spacing-4)' }}>
        <div className="card">
          <div className="card-header">
            <div className="card-title">Tổng sự kiện</div>
            <div className="card-icon primary"><Activity size={18} /></div>
          </div>
          <div className="card-value">{total}</div>
          <div className="card-desc">log đã ghi nhận</div>
        </div>
        {(['INFO', 'WARN', 'CRITICAL'] as const).map(sev => {
          const cfg = SEVERITY_CONFIG[sev];
          return (
            <div className="card" key={sev}>
              <div className="card-header">
                <div className="card-title">{cfg.label}</div>
                <div className="card-icon primary" style={{ backgroundColor: cfg.bg, color: cfg.color }}>{cfg.icon}</div>
              </div>
              <div className="card-value" style={{ color: cfg.color }}>
                {logs.filter(l => l.severity === sev).length}
              </div>
              <div className="card-desc">trong trang hiện tại</div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="card" style={{ padding: 'var(--spacing-4)' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.5rem', flex: 1, minWidth: '250px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={16} style={{ position: 'absolute', left: '0.5rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm kiếm theo hành động, tài khoản..."
                style={{
                  width: '100%', padding: '0.5rem 0.5rem 0.5rem 2rem',
                  border: '1px solid var(--border)', borderRadius: '6px',
                  fontSize: '0.875rem',
                }}
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', whiteSpace: 'nowrap' }}>
              <Search size={14} /> Tìm
            </button>
          </form>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter size={16} style={{ color: 'var(--text-muted)' }} />
            <select
              value={severityFilter}
              onChange={(e) => { setSeverityFilter(e.target.value); setPage(0); }}
              style={{ padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '0.875rem' }}
            >
              <option value="">Tất cả mức độ</option>
              <option value="INFO">Info</option>
              <option value="WARN">Cảnh báo</option>
              <option value="CRITICAL">Nghiêm trọng</option>
            </select>
          </div>

          <button onClick={() => { setSearch(''); setSeverityFilter(''); setPage(0); fetchLogs(); }} className="btn btn-outline"
            style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', whiteSpace: 'nowrap' }}>
            <RefreshCw size={14} /> Làm mới
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: '0' }}>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: '160px' }}>Thời gian</th>
                <th>Người thực hiện</th>
                <th>Hành động / Thao tác</th>
                <th>Dịch vụ</th>
                <th>IP</th>
                <th style={{ width: '110px' }}>Mức độ</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>Đang tải dữ liệu...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>Không có log nào.</td></tr>
              ) : (
                logs.map((log) => {
                  const cfg = SEVERITY_CONFIG[log.severity] || SEVERITY_CONFIG.INFO;
                  return (
                    <tr key={log.id}>
                      <td className="text-muted" style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                        {new Date(log.timestamp).toLocaleString('vi-VN')}
                      </td>
                      <td>
                        <div className="font-semibold" style={{ fontSize: '0.85rem' }}>{log.actorName}</div>
                        {log.actorRole && (
                          <div className="text-muted" style={{ fontSize: '0.7rem' }}>{log.actorRole}</div>
                        )}
                      </td>
                      <td style={{ fontSize: '0.85rem', fontWeight: 500 }}>{log.action}</td>
                      <td>
                        <span style={{
                          padding: '0.15rem 0.4rem', borderRadius: '4px', fontSize: '0.7rem',
                          backgroundColor: '#eff6ff', color: '#2563eb', fontWeight: 600,
                        }}>
                          {log.serviceName || log.target}
                        </span>
                      </td>
                      <td className="text-muted" style={{ fontSize: '0.8rem', fontFamily: 'monospace' }}>
                        {log.ipAddress || '—'}
                      </td>
                      <td>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                          padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem',
                          fontWeight: 600, backgroundColor: cfg.bg, color: cfg.color,
                          border: `1px solid ${cfg.border}`,
                        }}>
                          {cfg.icon} {cfg.label}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0.75rem 1rem', borderTop: '1px solid var(--border)',
            fontSize: '0.825rem', color: 'var(--text-muted)',
          }}>
            <span>Hiển thị {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} / {total} kết quả</span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="btn btn-outline"
                style={{ padding: '0.25rem 0.5rem', display: 'flex', alignItems: 'center' }}
              >
                <ChevronLeft size={16} /> Trước
              </button>
              <span style={{ display: 'flex', alignItems: 'center', padding: '0 0.5rem', fontWeight: 600 }}>
                {page + 1} / {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                disabled={page >= totalPages - 1}
                className="btn btn-outline"
                style={{ padding: '0.25rem 0.5rem', display: 'flex', alignItems: 'center' }}
              >
                Sau <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLog;
