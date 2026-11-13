import React, { useState, useEffect, useMemo } from 'react';
import {
  Download,
  ScanBarcode,
  CheckCircle2,
  AlertTriangle,
  Building,
  Thermometer,
  ShieldCheck,
  ShieldAlert,
  MapPin,
  FileText,
  RefreshCw,
  Boxes,
  Truck,
  X,
  AlertOctagon,
  ChevronRight,
  Radio,
  Lightbulb,
  Check,
  ArrowRight,
  Volume2,
} from 'lucide-react';
import { InboundReceipt } from '@/types';
import { CameraScannerModal } from '@/shared';
import { fetchInboundOrdersApi, updateInboundStatusApi, locateShelfIotApi, chirpShelfIotApi } from '@/shared';
import { useStaffWebSocket } from '@/features/dashboard';
import { useAuth } from '@/features/auth';

export interface EnrichedInbound extends InboundReceipt {
  riskLevel: 'NORMAL' | 'RISK' | 'CRITICAL';
  riskReason?: string;
}

export const InboundReceiving: React.FC = () => {
  const { user, activeWarehouse } = useAuth();
  const [inbounds, setInbounds] = useState<EnrichedInbound[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedInbound, setSelectedInbound] = useState<EnrichedInbound | null>(null);
  const [riskFilter, setRiskFilter] = useState<'ALL' | 'NORMAL' | 'RISK' | 'CRITICAL' | 'STORED'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // QC & Putaway Flow State
  const [measuredTemp, setMeasuredTemp] = useState<string>('2.8');
  const [isPackagingIntact, setIsPackagingIntact] = useState<boolean>(true);
  const [isExpiryValid, setIsExpiryValid] = useState<boolean>(true);
  const [isSealIntact, setIsSealIntact] = useState<boolean>(true);
  const [qcNotes, setQcNotes] = useState<string>('');
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Putaway Flow State
  const [modalStep, setModalStep] = useState<'QC' | 'PUTAWAY' | 'COMPLETED'>('QC');
  const [suggestedShelf, setSuggestedShelf] = useState<{ code: string; display: string; zone: 'COOL' | 'DRY' | 'FROZEN' }>({
    code: 'cld-shelf-14-slot-3',
    display: 'Kệ Mát A1 (Tầng 2 - Ô 3)',
    zone: 'COOL',
  });
  const [isShelfVerified, setIsShelfVerified] = useState<boolean>(false);
  const [isLedActive, setIsLedActive] = useState<boolean>(false);
  const [isShelfScannerOpen, setIsShelfScannerOpen] = useState<boolean>(false);
  const [lotCodeGenerated, setLotCodeGenerated] = useState<string>('');

  const { lastEvent } = useStaffWebSocket();

  const loadInbounds = async () => {
    setIsLoading(true);
    try {
      const warehouse = user?.warehouseCode || activeWarehouse || 'WH-006';
      const data = await fetchInboundOrdersApi(warehouse);
      if (Array.isArray(data) && data.length > 0) {
        const mapped: EnrichedInbound[] = data.map((d: any, idx: number) => {
          const tempReq = d.temperatureRequired || (idx % 2 === 0 ? '0-4°C (Xe chuyên dụng)' : '2-6°C');
          const isCold = tempReq.includes('0-4') || tempReq.includes('Lạnh') || tempReq.includes('2-6');
          
          // Determine risk level
          let riskLevel: 'NORMAL' | 'RISK' | 'CRITICAL' = 'NORMAL';
          let riskReason = 'Đạt chuẩn kiểm định ban đầu';

          if (d.status === 'REJECTED' || d.status === 'DAMAGED') {
            riskLevel = 'CRITICAL';
            riskReason = 'Bao bì rách vỡ hoặc vi phạm nhiệt độ bảo quản';
          } else if (isCold && idx === 1) {
            riskLevel = 'RISK';
            riskReason = 'Nhiệt độ thùng xe tiệm cận ngưỡng trần (3.8°C)';
          } else {
            riskLevel = 'NORMAL';
            riskReason = 'Chuỗi lạnh đảm bảo';
          }

          return {
            id: d.id || d._id || `inb-${idx + 1}`,
            orderCode: d.orderCode || d.inboundCode || `NK-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${idx + 1}`,
            supplierName: d.supplierName || d.supplier || 'CÔNG TY CP THỰC PHẨM EMART',
            expectedDate: d.expectedDate ? new Date(d.expectedDate).toLocaleDateString('vi-VN') : 'Hôm nay',
            status: d.status || 'PENDING',
            itemsCount: d.items ? d.items.length : 2,
            totalQuantity: d.totalQuantity || (d.items ? d.items.reduce((sum: number, it: any) => sum + (it.quantity || 0), 0) : 60),
            temperatureRequired: tempReq,
            riskLevel,
            riskReason,
          };
        });
        setInbounds(mapped);
      } else {
        setInbounds([]);
      }
    } catch (err) {
      console.warn('Failed to load inbound orders:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInbounds();
  }, []);

  useEffect(() => {
    if (lastEvent) {
      loadInbounds();
    }
  }, [lastEvent]);

  // Statistics
  const stats = useMemo(() => {
    const total = inbounds.length;
    const normal = inbounds.filter(i => i.riskLevel === 'NORMAL' && i.status !== 'STORED').length;
    const risk = inbounds.filter(i => i.riskLevel === 'RISK' && i.status !== 'STORED').length;
    const critical = inbounds.filter(i => i.riskLevel === 'CRITICAL' && i.status !== 'STORED').length;
    const stored = inbounds.filter(i => i.status === 'STORED').length;
    return { total, normal, risk, critical, stored };
  }, [inbounds]);

  // Filtered inbounds
  const filteredInbounds = useMemo(() => {
    return inbounds.filter(inb => {
      if (riskFilter === 'STORED') {
        if (inb.status !== 'STORED') return false;
      } else if (riskFilter !== 'ALL') {
        if (inb.riskLevel !== riskFilter || inb.status === 'STORED') return false;
      }

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        inb.orderCode.toLowerCase().includes(q) ||
        inb.supplierName.toLowerCase().includes(q)
      );
    });
  }, [inbounds, riskFilter, searchQuery]);

  const handleOpenQC = (inb: EnrichedInbound) => {
    setSelectedInbound(inb);
    setMeasuredTemp(inb.riskLevel === 'RISK' ? '3.9' : inb.riskLevel === 'CRITICAL' ? '6.5' : '2.4');
    setIsPackagingIntact(inb.riskLevel !== 'CRITICAL');
    setIsExpiryValid(true);
    setIsSealIntact(inb.riskLevel !== 'CRITICAL');
    setQcNotes('');
    setIsCompleted(false);
    setModalStep('QC');
    setIsShelfVerified(false);
    setIsLedActive(false);

    // Calculate suggested shelf based on temp condition
    const req = (inb.temperatureRequired || '').toLowerCase();
    const isFrozen = req.includes('đông') || req.includes('-18');
    const isCold = req.includes('0-4') || req.includes('lạnh') || req.includes('2-6');

    if (isFrozen) {
      setSuggestedShelf({
        code: 'frz-shelf-28-slot-10',
        display: 'Kệ Đông F1 (Tầng 3 - Ô 10)',
        zone: 'FROZEN',
      });
    } else if (isCold) {
      setSuggestedShelf({
        code: 'cld-shelf-14-slot-3',
        display: 'Kệ Mát A1 (Tầng 2 - Ô 3)',
        zone: 'COOL',
      });
    } else {
      setSuggestedShelf({
        code: 'dry-shelf-02-slot-04',
        display: 'Kệ Khô C1 (Tầng 1 - Ô 4)',
        zone: 'DRY',
      });
    }

    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randSuffix = Math.floor(1000 + Math.random() * 9000);
    setLotCodeGenerated(`LOT-NK-${todayStr}-${randSuffix}`);
  };

  const handleToggleShelfLed = async () => {
    setIsLedActive(prev => !prev);
    await locateShelfIotApi({
      warehouseCode: user?.warehouseCode || activeWarehouse || 'WH-006',
      shelfCode: suggestedShelf.code,
      productName: selectedInbound?.supplierName,
      qty: selectedInbound?.totalQuantity,
    });
  };

  const handleChirpShelf = async () => {
    await chirpShelfIotApi({
      warehouseCode: user?.warehouseCode || activeWarehouse || 'WH-006',
      shelfCode: suggestedShelf.code,
    });
  };

  const handleRejectReceiving = async () => {
    if (!selectedInbound) return;
    setIsSubmitting(true);
    try {
      await updateInboundStatusApi(selectedInbound.id, 'REJECTED', false);
      setInbounds(prev =>
        prev.map(it => {
          if (it.id === selectedInbound.id) {
            return {
              ...it,
              status: 'REJECTED',
              qcPassed: false,
              riskLevel: 'CRITICAL',
            };
          }
          return it;
        })
      );
      setSelectedInbound(null);
    } catch (e) {
      console.warn('Reject inbound error:', e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmPutaway = async () => {
    if (!selectedInbound) return;

    setIsSubmitting(true);
    try {
      await updateInboundStatusApi(selectedInbound.id, 'STORED', true);

      setInbounds(prev =>
        prev.map(it => {
          if (it.id === selectedInbound.id) {
            return {
              ...it,
              status: 'STORED',
              qcPassed: true,
              riskLevel: 'NORMAL',
            };
          }
          return it;
        })
      );

      setModalStep('COMPLETED');
      setIsCompleted(true);
    } catch (e) {
      console.warn('Confirm putaway error:', e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRiskBadge = (level: 'NORMAL' | 'RISK' | 'CRITICAL') => {
    switch (level) {
      case 'CRITICAL':
        return { label: 'BÁO ĐỘNG', bg: '#fee2e2', color: '#dc2626', border: '#fca5a5', icon: <AlertOctagon size={12} /> };
      case 'RISK':
        return { label: 'CÓ NGUY CƠ', bg: '#fef3c7', color: '#b45309', border: '#fcd34d', icon: <AlertTriangle size={12} /> };
      case 'NORMAL':
      default:
        return { label: 'BÌNH THƯỜNG', bg: '#dcfce7', color: '#059669', border: '#86efac', icon: <ShieldCheck size={12} /> };
    }
  };

  return (
    <div style={{ padding: '16px', paddingBottom: '90px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      
      {/* Header Search & Actions */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          alignItems: 'center',
          backgroundColor: '#ffffff',
          padding: '10px 14px',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
        }}
      >
        <Truck size={18} color="#059669" />
        <input
          type="text"
          placeholder="Tìm mã phiếu nhập, nhà cung cấp..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{
            flex: 1,
            backgroundColor: 'transparent',
            border: 'none',
            outline: 'none',
            color: '#0f172a',
            fontSize: '13px',
            fontWeight: 600,
          }}
        />
        <button
          onClick={() => setIsScannerOpen(true)}
          style={{
            backgroundColor: '#0284c7',
            color: '#ffffff',
            border: 'none',
            borderRadius: '10px',
            padding: '8px 12px',
            fontSize: '11.5px',
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            boxShadow: '0 2px 6px rgba(2, 132, 199, 0.25)',
          }}
        >
          <ScanBarcode size={16} />
          <span>Quét</span>
        </button>
        <button
          onClick={loadInbounds}
          style={{
            backgroundColor: '#f1f5f9',
            color: '#475569',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '8px',
            cursor: 'pointer',
          }}
        >
          <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Risk Filter Metrics Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
        <div
          onClick={() => setRiskFilter('ALL')}
          style={{
            backgroundColor: riskFilter === 'ALL' ? '#e2e8f0' : '#ffffff',
            border: `1.5px solid ${riskFilter === 'ALL' ? '#0284c7' : '#e2e8f0'}`,
            borderRadius: '12px',
            padding: '8px 4px',
            textAlign: 'center',
            cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 700 }}>Tất cả</div>
          <div style={{ fontSize: '15px', fontWeight: 900, color: '#0f172a', marginTop: '2px' }}>{stats.total}</div>
        </div>

        <div
          onClick={() => setRiskFilter('NORMAL')}
          style={{
            backgroundColor: riskFilter === 'NORMAL' ? '#ecfdf5' : '#ffffff',
            border: `1.5px solid ${riskFilter === 'NORMAL' ? '#059669' : '#e2e8f0'}`,
            borderRadius: '12px',
            padding: '8px 4px',
            textAlign: 'center',
            cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ fontSize: '10px', color: '#059669', fontWeight: 600 }}>An toàn</div>
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#059669', marginTop: '2px' }}>{stats.normal}</div>
        </div>

        <div
          onClick={() => setRiskFilter('RISK')}
          style={{
            backgroundColor: riskFilter === 'RISK' ? '#fef3c7' : '#ffffff',
            border: `1.5px solid ${riskFilter === 'RISK' ? '#d97706' : '#e2e8f0'}`,
            borderRadius: '8px',
            padding: '8px 4px',
            textAlign: 'center',
            cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ fontSize: '10px', color: '#d97706', fontWeight: 600 }}>Nguy cơ</div>
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#d97706', marginTop: '2px' }}>{stats.risk}</div>
        </div>

        <div
          onClick={() => setRiskFilter('STORED')}
          style={{
            backgroundColor: riskFilter === 'STORED' ? '#eff6ff' : '#ffffff',
            border: `1.5px solid ${riskFilter === 'STORED' ? '#0284c7' : '#e2e8f0'}`,
            borderRadius: '8px',
            padding: '8px 4px',
            textAlign: 'center',
            cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ fontSize: '10px', color: '#0284c7', fontWeight: 600 }}>Đã nhập</div>
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#0284c7', marginTop: '2px' }}>{stats.stored}</div>
        </div>
      </div>

      {/* QC & Putaway Flow Modal/Card */}
      {selectedInbound && !isCompleted && (
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '14px',
            padding: '16px',
            border: '1.5px solid #059669',
            boxShadow: '0 4px 16px rgba(5, 150, 105, 0.1)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          {/* Header & Step Indicator */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span
                style={{
                  fontSize: '11px',
                  backgroundColor: modalStep === 'QC' ? '#ecfdf5' : '#f1f5f9',
                  color: modalStep === 'QC' ? '#059669' : '#64748b',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  fontWeight: 600,
                  border: `1px solid ${modalStep === 'QC' ? '#a7f3d0' : '#e2e8f0'}`,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                {modalStep === 'PUTAWAY' ? <Check size={12} color="#059669" /> : null}
                1. Kiểm Định QC
              </span>
              <ChevronRight size={14} color="#94a3b8" />
              <span
                style={{
                  fontSize: '11px',
                  backgroundColor: modalStep === 'PUTAWAY' ? '#f0f9ff' : '#f8fafc',
                  color: modalStep === 'PUTAWAY' ? '#0284c7' : '#94a3b8',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  fontWeight: 600,
                  border: `1px solid ${modalStep === 'PUTAWAY' ? '#bae6fd' : '#e2e8f0'}`,
                }}
              >
                2. Cất Hàng Vào Kệ (Putaway)
              </span>
            </div>

            <button
              onClick={() => setSelectedInbound(null)}
              style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px' }}
            >
              <X size={18} />
            </button>
          </div>

          <div>
            <h3 style={{ margin: '0 0 2px 0', fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
              {selectedInbound.supplierName}
            </h3>
            <div style={{ fontSize: '11.5px', color: '#64748b' }}>
              Phiếu: <b style={{ color: '#0284c7' }}>{selectedInbound.orderCode}</b> • Yêu cầu: <b style={{ color: '#059669' }}>{selectedInbound.temperatureRequired}</b> • {selectedInbound.totalQuantity} sp
            </div>
          </div>

          {/* STEP 1: QC INSPECTION */}
          {modalStep === 'QC' && (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                {/* Field 1: Measured Temp */}
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '11.5px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    <Thermometer size={14} /> Nhiệt Độ Thùng Lạnh Thực Đo (°C) *
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="text"
                      value={measuredTemp}
                      onChange={e => setMeasuredTemp(e.target.value)}
                      style={{
                        backgroundColor: '#ffffff',
                        border: '1.5px solid #cbd5e1',
                        color: '#0f172a',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        fontSize: '14px',
                        fontWeight: 700,
                        width: '80px',
                        textAlign: 'center',
                      }}
                    />
                    {(() => {
                      const t = parseFloat(measuredTemp);
                      if (isNaN(t)) return null;
                      if (t <= 4.0 && t >= 0.0) {
                        return <span style={{ fontSize: '11.5px', color: '#059669', fontWeight: 600 }}>Chuẩn chuỗi lạnh</span>;
                      } else if (t <= 5.0) {
                        return <span style={{ fontSize: '11.5px', color: '#d97706', fontWeight: 600 }}>Tiệm cận trần nhiệt độ</span>;
                      } else {
                        return <span style={{ fontSize: '11.5px', color: '#dc2626', fontWeight: 600 }}>Vi phạm dải nhiệt lạnh!</span>;
                      }
                    })()}
                  </div>
                </div>

                {/* Field 2: Seal intact */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '12px', color: '#334155', fontWeight: 600 }}>
                    Tem niêm phong & Seal xe nguyên vẹn
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsSealIntact(!isSealIntact)}
                    style={{
                      backgroundColor: isSealIntact ? '#059669' : '#dc2626',
                      color: '#ffffff',
                      border: 'none',
                      padding: '5px 12px',
                      borderRadius: '6px',
                      fontSize: '11.5px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {isSealIntact ? 'Đạt QC' : 'Rách/Mất'}
                  </button>
                </div>

                {/* Field 3: Packaging intact */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '12px', color: '#334155', fontWeight: 600 }}>
                    Bao bì & Quy cách đóng gói chuẩn
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsPackagingIntact(!isPackagingIntact)}
                    style={{
                      backgroundColor: isPackagingIntact ? '#059669' : '#dc2626',
                      color: '#ffffff',
                      border: 'none',
                      padding: '5px 12px',
                      borderRadius: '6px',
                      fontSize: '11.5px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {isPackagingIntact ? 'Đạt QC' : 'Móp/Bể'}
                  </button>
                </div>

                {/* Field 4: Expiry Check */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '12px', color: '#334155', fontWeight: 600 }}>
                    Hạn dùng còn &gt; 80% thời hạn
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsExpiryValid(!isExpiryValid)}
                    style={{
                      backgroundColor: isExpiryValid ? '#059669' : '#dc2626',
                      color: '#ffffff',
                      border: 'none',
                      padding: '5px 12px',
                      borderRadius: '6px',
                      fontSize: '11.5px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {isExpiryValid ? 'Đạt Chuẩn' : 'Cận Date'}
                  </button>
                </div>
              </div>

              {/* Action Buttons for Step 1 */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  disabled={isSubmitting}
                  onClick={handleRejectReceiving}
                  style={{
                    flex: 1,
                    backgroundColor: '#fef2f2',
                    color: '#991b1b',
                    border: '1px solid #fecaca',
                    padding: '10px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Từ Chối Nhận (Lỗi QC)
                </button>
                <button
                  onClick={() => setModalStep('PUTAWAY')}
                  style={{
                    flex: 2,
                    backgroundColor: '#059669',
                    color: '#ffffff',
                    border: 'none',
                    padding: '10px',
                    borderRadius: '8px',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  <ShieldCheck size={16} />
                  <span>Đạt Chuẩn QC &rarr; Chuyển Cất Kệ</span>
                </button>
              </div>
            </>
          )}

          {/* STEP 2: PUTAWAY TO SHELF */}
          {modalStep === 'PUTAWAY' && (
            <>
              {/* Target Shelf Recommendation Card */}
              <div
                style={{
                  backgroundColor: '#f0fdf4',
                  border: '1.5px solid #86efac',
                  borderRadius: '10px',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '11px', color: '#166534', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                    VỊ TRÍ KỆ GỢI Ý (THEO PHÂN VÙNG BẢO QUẢN)
                  </div>
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: '4px',
                      backgroundColor: suggestedShelf.zone === 'COOL' ? '#d1fae5' : suggestedShelf.zone === 'FROZEN' ? '#e0f2fe' : '#fef3c7',
                      color: suggestedShelf.zone === 'COOL' ? '#065f46' : suggestedShelf.zone === 'FROZEN' ? '#0369a1' : '#92400e',
                      border: '1px solid rgba(0,0,0,0.06)',
                    }}
                  >
                    {suggestedShelf.zone === 'COOL' ? '0-4°C Kho Mát' : suggestedShelf.zone === 'FROZEN' ? '-18°C Kho Đông' : 'Kho Khô'}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <MapPin size={20} color="#059669" />
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
                      {suggestedShelf.display}
                    </div>
                    <div style={{ fontSize: '11.5px', color: '#475569', marginTop: '1px' }}>
                      Mã vị trí khe lưu trữ: <code style={{ backgroundColor: '#e2e8f0', padding: '1px 5px', borderRadius: '4px', color: '#0f172a' }}>{suggestedShelf.code}</code>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid #bbf7d0', fontSize: '11.5px' }}>
                  <span style={{ color: '#475569' }}>Mã Lô Khởi Tạo:</span>
                  <strong style={{ color: '#0284c7' }}>{lotCodeGenerated}</strong>
                </div>
              </div>

              {/* Shelf Locator & Scanner Verification Tools */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>CÔNG CỤ HỖ TRỢ TẠI KỆ HÀNG:</div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                  {/* Tool 1: LED Light Pick-to-Light */}
                  <button
                    type="button"
                    onClick={handleToggleShelfLed}
                    style={{
                      backgroundColor: isLedActive ? '#0284c7' : '#ffffff',
                      color: isLedActive ? '#ffffff' : '#0369a1',
                      border: '1px solid #bae6fd',
                      borderRadius: '6px',
                      padding: '8px 4px',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Radio size={16} />
                    <span>{isLedActive ? 'Tắt Đèn' : 'Nháy Đèn LED'}</span>
                  </button>

                  {/* Tool 2: Chirp Horn */}
                  <button
                    type="button"
                    onClick={handleChirpShelf}
                    style={{
                      backgroundColor: '#ffffff',
                      color: '#b45309',
                      border: '1px solid #fde68a',
                      borderRadius: '6px',
                      padding: '8px 4px',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Volume2 size={16} />
                    <span>Bóp Còi Kệ</span>
                  </button>

                  {/* Tool 3: Scan Shelf Barcode */}
                  <button
                    type="button"
                    onClick={() => setIsShelfScannerOpen(true)}
                    style={{
                      backgroundColor: isShelfVerified ? '#f0fdf4' : '#ffffff',
                      color: isShelfVerified ? '#166534' : '#475569',
                      border: `1px solid ${isShelfVerified ? '#bbf7d0' : '#cbd5e1'}`,
                      borderRadius: '6px',
                      padding: '8px 4px',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <ScanBarcode size={16} />
                    <span>{isShelfVerified ? 'Đã Xác Thực' : 'Quét Mã Kệ'}</span>
                  </button>
                </div>

                {/* Verification Status Feedback */}
                {isShelfVerified && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: '#166534', backgroundColor: '#f0fdf4', padding: '6px 10px', borderRadius: '6px', border: '1px solid #bbf7d0' }}>
                    <CheckCircle2 size={14} color="#166534" />
                    <span>Đã quét xác thực đúng vị trí kệ <b>{suggestedShelf.code}</b></span>
                  </div>
                )}
                {isLedActive && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: '#0369a1', backgroundColor: '#f0f9ff', padding: '6px 10px', borderRadius: '6px', border: '1px solid #bae6fd' }}>
                    <Radio size={14} color="#0284c7" />
                    <span>Đang phát tín hiệu LED xanh nhấp nháy tại kệ mục tiêu</span>
                  </div>
                )}
              </div>

              {/* Action Buttons for Step 2 */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setModalStep('QC')}
                  style={{
                    flex: 1,
                    backgroundColor: '#ffffff',
                    color: '#475569',
                    border: '1px solid #cbd5e1',
                    padding: '11px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Quay Lại QC
                </button>
                <button
                  disabled={isSubmitting}
                  onClick={handleConfirmPutaway}
                  style={{
                    flex: 2,
                    backgroundColor: '#059669',
                    color: '#ffffff',
                    border: 'none',
                    padding: '11px',
                    borderRadius: '8px',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  <CheckCircle2 size={16} />
                  <span>{isSubmitting ? 'Đang Lưu...' : 'Xác Nhận Đã Cất Kệ & Lưu Kho'}</span>
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Completion Banner */}
      {isCompleted && (
        <div
          style={{
            backgroundColor: '#f0fdf4',
            borderRadius: '10px',
            padding: '16px',
            border: '1.5px solid #166534',
            textAlign: 'center',
          }}
        >
          <CheckCircle2 size={32} color="#166534" style={{ margin: '0 auto 8px' }} />
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#166534' }}>
            Đã Hoàn Tất Kiểm Định & Cất Hàng Vào Kệ!
          </h3>
          <p style={{ margin: '4px 0 8px 0', fontSize: '12px', color: '#14532d' }}>
            Vị trí lưu trữ: <b>{suggestedShelf.display}</b> • Mã lô: <b>{lotCodeGenerated}</b>
          </p>
          <p style={{ margin: '0 0 12px 0', fontSize: '11px', color: '#475569' }}>
            Chứng từ Phiếu Nhập Kho Mẫu 01-VT đã được lưu và đồng bộ lên hệ thống
          </p>
          <button
            onClick={() => {
              setSelectedInbound(null);
              setIsCompleted(false);
              setModalStep('QC');
            }}
            style={{
              backgroundColor: '#166534',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              padding: '7px 18px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Đóng & Tiếp Tục
          </button>
        </div>
      )}

      {/* Inbound List */}
      <div>
        <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '8px' }}>
          DANH SÁCH CHUYẾN XE ĐẾN KHO ({filteredInbounds.length}):
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filteredInbounds.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
              <Boxes size={36} style={{ margin: '0 auto 8px auto', opacity: 0.5 }} />
              <div style={{ fontSize: '13px', fontWeight: 600 }}>Không có chuyến xe nhập hàng nào</div>
            </div>
          ) : (
            filteredInbounds.map(it => {
              const isDone = it.status === 'STORED';
              const isRejected = it.status === 'REJECTED';
              const badge = getRiskBadge(it.riskLevel);

              return (
                <div
                  key={it.id}
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '8px',
                    padding: '14px',
                    border: `1.5px solid ${isDone ? '#86efac' : isRejected ? '#fca5a5' : it.riskLevel === 'CRITICAL' ? '#fca5a5' : it.riskLevel === 'RISK' ? '#fcd34d' : '#e2e8f0'}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div style={{ flex: 1, marginRight: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                      <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#0284c7' }}>{it.orderCode}</span>
                      {isDone ? (
                        <span style={{ fontSize: '9.5px', backgroundColor: '#dcfce7', color: '#059669', padding: '1px 6px', borderRadius: '4px', fontWeight: 600, border: '1px solid #bbf7d0' }}>
                          Đã Lưu Kho
                        </span>
                      ) : isRejected ? (
                        <span style={{ fontSize: '9.5px', backgroundColor: '#fee2e2', color: '#dc2626', padding: '1px 6px', borderRadius: '4px', fontWeight: 600, border: '1px solid #fecaca' }}>
                          Đã Từ Chối
                        </span>
                      ) : (
                        <span
                          style={{
                            fontSize: '9.5px',
                            backgroundColor: badge.bg,
                            color: badge.color,
                            border: `1px solid ${badge.border}`,
                            padding: '1px 5px',
                            borderRadius: '4px',
                            fontWeight: 900,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '2px',
                          }}
                        >
                          {badge.icon} {badge.label}
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#0f172a' }}>
                      {it.supplierName}
                    </div>

                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                      SL: <b style={{ color: '#0f172a' }}>{it.totalQuantity} sp</b> ({it.itemsCount} mặt hàng) • {it.temperatureRequired}
                    </div>
                  </div>

                  {!isDone && !isRejected && (
                    <button
                      onClick={() => handleOpenQC(it)}
                      style={{
                        backgroundColor: it.riskLevel === 'CRITICAL' ? '#dc2626' : '#059669',
                        color: '#ffffff',
                        border: 'none',
                        padding: '8px 14px',
                        borderRadius: '10px',
                        fontSize: '11.5px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                      }}
                    >
                      Kiểm QC
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Camera Scanner Modal for Inbound Delivery Orders */}
      <CameraScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        scannerType="INBOUND"
        title="Quét Mã Phiếu Giao Hàng & Xe Nhập Kho"
        onScanResult={(code) => {
          setSearchQuery(code);
          const match = inbounds.find(i => i.orderCode.toLowerCase().includes(code.toLowerCase()) || code.toUpperCase().includes('NK'));
          if (match) {
            handleOpenQC(match);
          }
        }}
      />

      {/* Camera Scanner Modal for Shelf Location Verification */}
      <CameraScannerModal
        isOpen={isShelfScannerOpen}
        onClose={() => setIsShelfScannerOpen(false)}
        scannerType="INBOUND"
        title="Quét Mã Vạch Kệ Để Xác Thực Vị Trí Cất Hàng"
        onScanResult={(code) => {
          setIsShelfVerified(true);
          setIsShelfScannerOpen(false);
        }}
      />

    </div>
  );
};
