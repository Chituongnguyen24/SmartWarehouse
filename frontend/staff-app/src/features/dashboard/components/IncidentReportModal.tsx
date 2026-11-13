import React, { useState } from 'react';
import {
  X,
  AlertTriangle,
  ShieldAlert,
  Camera,
  Send,
  CheckCircle2,
  ThermometerSnowflake,
  Package,
  Layers,
} from 'lucide-react';
import { useAuth } from '@/features/auth';
import { useStaffWebSocket } from '@/features/dashboard';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  defaultLocation?: string;
  defaultSku?: string;
}

export const IncidentReportModal: React.FC<Props> = ({
  isOpen,
  onClose,
  defaultLocation = 'Kệ Khô D-02',
  defaultSku = '',
}) => {
  const { user } = useAuth();
  const { sendMessage } = useStaffWebSocket();

  const [incidentType, setIncidentType] = useState<
    'DAMAGED_PACKAGE' | 'TEMPERATURE_LEAK' | 'BROKEN_SHELF' | 'BARCODE_UNREADABLE' | 'OTHER'
  >('DAMAGED_PACKAGE');
  const [severity, setSeverity] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('HIGH');
  const [location, setLocation] = useState<string>(defaultLocation);
  const [skuOrLot, setSkuOrLot] = useState<string>(defaultSku);
  const [description, setDescription] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);

  // Handle ESC key to dismiss modal
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const reportPayload = {
      type: 'INCIDENT_REPORTED',
      reportedBy: user?.name || 'Nhân viên trực ca',
      warehouseCode: user?.warehouseCode || 'WH-006',
      incidentType,
      severity,
      location,
      skuOrLot,
      description: description || 'Báo cáo sự cố từ thiết bị PDA nhân viên',
      reportedAt: new Date().toISOString(),
    };

    // Send realtime alert via WebSocket
    sendMessage('INCIDENT_ALERT', reportPayload);

    setTimeout(() => {
      setIsSubmitting(false);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1500);
    }, 600);
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '14px',
          maxWidth: '460px',
          width: '100%',
          padding: '20px',
          border: '1px solid #fecaca',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid #fee2e2' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                backgroundColor: '#dc2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
              }}
            >
              <AlertTriangle size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 900, color: '#991b1b' }}>Báo Cáo Sự Cố Kho Khẩn Cấp</h3>
              <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>
                Gửi cảnh báo tức thì đến Quản lý kho CityMart
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px' }}
          >
            <X size={18} />
          </button>
        </div>

        {success ? (
          <div
            style={{
              padding: '30px 20px',
              backgroundColor: '#ecfdf5',
              borderRadius: '14px',
              border: '1.5px solid #059669',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <CheckCircle2 size={40} color="#059669" />
            <div style={{ fontSize: '14px', fontWeight: 900, color: '#065f46' }}>
              Đã Gửi Cảnh Báo Sự Cố Thành Công!
            </div>
            <div style={{ fontSize: '11.5px', color: '#047857' }}>
              Trưởng ca & Quản lý kho đã nhận được thông báo thời gian thực trên Web Dashboard.
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Incident Type */}
            <div>
              <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 800, color: '#334155', marginBottom: '4px' }}>
                Loại sự cố phát hiện:
              </label>
              <select
                value={incidentType}
                onChange={(e) => setIncidentType(e.target.value as any)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '10px',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#0f172a',
                  outline: 'none',
                }}
              >
                <option value="DAMAGED_PACKAGE">Hàng rách bao bì / Bể vỡ / Móp méo</option>
                <option value="TEMPERATURE_LEAK">Rò rỉ nhiệt độ / Buồng lạnh mất nhiệt</option>
                <option value="BROKEN_SHELF">Kệ hàng bị lún / Xô lệch kết cấu</option>
                <option value="BARCODE_UNREADABLE">Mã vạch bị mờ / Rách không thể quét</option>
                <option value="OTHER">Sự cố khác...</option>
              </select>
            </div>

            {/* Severity Level */}
            <div>
              <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 800, color: '#334155', marginBottom: '4px' }}>
                Mức độ khẩn cấp:
              </label>
              <div style={{ display: 'flex', gap: '6px' }}>
                {[
                  { key: 'LOW', label: 'Thấp', bg: '#f1f5f9', border: '#cbd5e1', activeBg: '#64748b' },
                  { key: 'MEDIUM', label: 'Vừa', bg: '#fffbeb', border: '#fde68a', activeBg: '#d97706' },
                  { key: 'HIGH', label: 'Khẩn cấp', bg: '#fef2f2', border: '#fecaca', activeBg: '#dc2626' },
                ].map(s => (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => setSeverity(s.key as any)}
                    style={{
                      flex: 1,
                      padding: '7px 4px',
                      borderRadius: '8px',
                      fontSize: '11.5px',
                      fontWeight: 800,
                      border: `1.5px solid ${severity === s.key ? s.activeBg : s.border}`,
                      backgroundColor: severity === s.key ? s.activeBg : s.bg,
                      color: severity === s.key ? '#ffffff' : '#334155',
                      cursor: 'pointer',
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Location & SKU */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#334155', marginBottom: '3px' }}>
                  Vị trí kệ / Khu vực:
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Vị trí kệ..."
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    fontSize: '11.5px',
                    color: '#0f172a',
                    fontWeight: 700,
                  }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#334155', marginBottom: '3px' }}>
                  Mã Lô / Mã Sản Phẩm (nếu có):
                </label>
                <input
                  type="text"
                  value={skuOrLot}
                  onChange={(e) => setSkuOrLot(e.target.value)}
                  placeholder="Mã lô hoặc mã sản phẩm..."
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    fontSize: '11.5px',
                    color: '#0f172a',
                    fontWeight: 700,
                  }}
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#334155', marginBottom: '3px' }}>
                Mô tả chi tiết sự cố:
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Nhập mô tả tình trạng thực tế để quản lý xử lý ngay..."
                rows={2}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  fontSize: '11.5px',
                  color: '#0f172a',
                  outline: 'none',
                  resize: 'none',
                }}
                required
              />
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '8px', paddingTop: '4px' }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  flex: 1,
                  padding: '9px',
                  backgroundColor: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  borderRadius: '10px',
                  color: '#334155',
                  fontSize: '12px',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                Hủy
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  flex: 2,
                  padding: '9px',
                  backgroundColor: '#dc2626',
                  border: 'none',
                  borderRadius: '10px',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: 900,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 8px rgba(220, 38, 38, 0.25)',
                }}
              >
                <Send size={14} />
                <span>{isSubmitting ? 'Đang gửi...' : 'Phát Lệnh Cảnh Báo'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
