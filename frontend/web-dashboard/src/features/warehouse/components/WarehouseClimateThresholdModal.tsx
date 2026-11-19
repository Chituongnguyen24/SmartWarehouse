import React, { useState, useEffect } from 'react';
import {
  X,
  Sliders,
  Thermometer,
  Droplets,
  ShieldAlert,
  ShieldCheck,
  RotateCcw,
  Save,
  CheckCircle2,
  Building2,
  Info,
  Clock,
} from 'lucide-react';
import { useWarehouse } from '@/shared';
import {
  getWarehouseThresholds,
  saveWarehouseThresholds,
  resetWarehouseThresholds,
  type WarehouseThresholds,
} from '@/shared/utils/thresholdStorage';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialWarehouseCode?: string;
  onSaved?: (thresholds: WarehouseThresholds) => void;
}

export const WarehouseClimateThresholdModal: React.FC<Props> = ({
  isOpen,
  onClose,
  initialWarehouseCode = 'WH-006',
  onSaved,
}) => {
  const { warehouses, selectedWarehouseCode, setSelectedWarehouseCode } = useWarehouse();

  const [targetWhCode, setTargetWhCode] = useState<string>(initialWarehouseCode);
  const [formData, setFormData] = useState<WarehouseThresholds>(() => getWarehouseThresholds(initialWarehouseCode));
  const [activeTab, setActiveTab] = useState<'COOL' | 'FROZEN' | 'DRY' | 'POLICY'>('COOL');
  const [isSavedNotice, setIsSavedNotice] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const code = initialWarehouseCode || selectedWarehouseCode || 'WH-006';
      setTargetWhCode(code);
      setFormData(getWarehouseThresholds(code));
      setIsSavedNotice(false);
    }
  }, [isOpen, initialWarehouseCode, selectedWarehouseCode]);

  const handleWarehouseChange = (code: string) => {
    setTargetWhCode(code);
    setFormData(getWarehouseThresholds(code));
    setIsSavedNotice(false);
  };

  const handleCoolChange = (key: string, val: number) => {
    setFormData((prev) => ({
      ...prev,
      coolZone: { ...prev.coolZone, [key]: val },
    }));
  };

  const handleFrozenChange = (key: string, val: number) => {
    setFormData((prev) => ({
      ...prev,
      frozenZone: { ...prev.frozenZone, [key]: val },
    }));
  };

  const handleDryChange = (key: string, val: number) => {
    setFormData((prev) => ({
      ...prev,
      dryZone: { ...prev.dryZone, [key]: val },
    }));
  };

  const handleSave = () => {
    saveWarehouseThresholds(formData);
    setIsSavedNotice(true);
    if (onSaved) onSaved(formData);
    setTimeout(() => {
      setIsSavedNotice(false);
      onClose();
    }, 800);
  };

  const handleReset = () => {
    if (window.confirm(`Khôi phục cài đặt ngưỡng an toàn chuẩn ISO cho ${targetWhCode}?`)) {
      const standard = resetWarehouseThresholds(targetWhCode);
      setFormData(standard);
      setIsSavedNotice(true);
      if (onSaved) onSaved(standard);
      setTimeout(() => setIsSavedNotice(false), 2000);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(3px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '680px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#f8fafc',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: '#0f766e',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Sliders size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                Cấu Hình Ngưỡng An Toàn Nhiệt Ẩm Theo Kho
              </h2>
              <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0' }}>
                Thiết lập dải giới hạn an toàn, thời gian trễ và chính sách kích hoạt chuông còi báo động IoT
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#64748b',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Warehouse Selector */}
          <div
            style={{
              padding: '12px 14px',
              backgroundColor: '#f1f5f9',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Building2 size={18} color="#0f766e" />
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>
                Chọn kho hàng áp dụng:
              </label>
            </div>

            <select
              value={targetWhCode}
              onChange={(e) => handleWarehouseChange(e.target.value)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                fontSize: '13px',
                fontWeight: 600,
                color: '#0f172a',
                cursor: 'pointer',
                minWidth: '240px',
              }}
            >
              <option value="WH-006">WH-006: Kho Gò Vấp (Trạm IoT Chính)</option>
              <option value="WH-001">WH-001: Kho Tân Bình (Trung Chuyển)</option>
              <option value="WH-002">WH-002: Kho Quận 12 (Đông Lạnh)</option>
              <option value="WH-005">WH-005: Kho Thủ Đức (Bán Buôn)</option>
            </select>
          </div>

          {/* Room Category Tabs */}
          <div style={{ display: 'flex', gap: '6px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
            {[
              { key: 'COOL', label: 'Kho Mát (Chilled)', color: '#0f766e', desc: 'Thịt CP, Sữa, Rau VietGAP' },
              { key: 'FROZEN', label: 'Kho Đông (Frozen)', color: '#0284c7', desc: 'Hải sản, Thịt bò Úc, Kem' },
              { key: 'DRY', label: 'Kho Khô (Ambient)', color: '#d97706', desc: 'Gạo ST25, Mì gói, Dầu ăn' },
              { key: 'POLICY', label: 'Còi & Cảnh Báo', color: '#dc2626', desc: 'Thời gian trễ & Báo động' },
            ].map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key as any)}
                  style={{
                    flex: 1,
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: isActive ? `1.5px solid ${tab.color}` : '1px solid #e2e8f0',
                    backgroundColor: isActive ? '#ffffff' : '#f8fafc',
                    color: isActive ? tab.color : '#475569',
                    fontSize: '12px',
                    fontWeight: isActive ? 700 : 500,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '2px',
                    transition: 'all 0.15s ease',
                    boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                  }}
                >
                  <span>{tab.label}</span>
                  <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 400 }}>{tab.desc}</span>
                </button>
              );
            })}
          </div>

          {/* Tab 1: Kho Mát (Cool Zone) */}
          {activeTab === 'COOL' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div
                style={{
                  padding: '10px 14px',
                  backgroundColor: '#f0fdfa',
                  borderRadius: '6px',
                  border: '1px solid #ccfbf1',
                  fontSize: '12px',
                  color: '#0f766e',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <Info size={16} />
                <span>Kho Mát lưu trữ các sản phẩm tươi sống, bơ sữa, rau củ quả. Chuẩn khuyến nghị: 0.0°C ~ 4.0°C và độ ẩm 60% ~ 85%.</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Thermometer size={14} color="#0f766e" /> Nhiệt độ tối thiểu (°C):
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={formData.coolZone.minTemp}
                    onChange={(e) => handleCoolChange('minTemp', parseFloat(e.target.value) || 0)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      marginTop: '4px',
                      fontSize: '13px',
                      fontWeight: 600,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Thermometer size={14} color="#dc2626" /> Nhiệt độ tối đa an toàn (°C):
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={formData.coolZone.maxTemp}
                    onChange={(e) => handleCoolChange('maxTemp', parseFloat(e.target.value) || 0)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      marginTop: '4px',
                      fontSize: '13px',
                      fontWeight: 600,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Droplets size={14} color="#0284c7" /> Độ ẩm tối thiểu (% RH):
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="10"
                    max="99"
                    value={formData.coolZone.minHumidity}
                    onChange={(e) => handleCoolChange('minHumidity', parseFloat(e.target.value) || 0)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      marginTop: '4px',
                      fontSize: '13px',
                      fontWeight: 600,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Droplets size={14} color="#0284c7" /> Độ ẩm tối đa cho phép (% RH):
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="10"
                    max="99"
                    value={formData.coolZone.maxHumidity}
                    onChange={(e) => handleCoolChange('maxHumidity', parseFloat(e.target.value) || 0)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      marginTop: '4px',
                      fontSize: '13px',
                      fontWeight: 600,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Kho Đông (Frozen Zone) */}
          {activeTab === 'FROZEN' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div
                style={{
                  padding: '10px 14px',
                  backgroundColor: '#f0f9ff',
                  borderRadius: '6px',
                  border: '1px solid #bae6fd',
                  fontSize: '12px',
                  color: '#0369a1',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <Info size={16} />
                <span>Kho Đông bảo quản thịt nhập khẩu, cá đông lạnh và kem. Chuẩn: -22.0°C ~ -18.0°C và độ ẩm 50% ~ 75%.</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                    Nhiệt độ tối thiểu (°C):
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={formData.frozenZone.minTemp}
                    onChange={(e) => handleFrozenChange('minTemp', parseFloat(e.target.value) || 0)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      marginTop: '4px',
                      fontSize: '13px',
                      fontWeight: 600,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                    Nhiệt độ tối đa an toàn (°C):
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={formData.frozenZone.maxTemp}
                    onChange={(e) => handleFrozenChange('maxTemp', parseFloat(e.target.value) || 0)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      marginTop: '4px',
                      fontSize: '13px',
                      fontWeight: 600,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                    Độ ẩm tối thiểu (% RH):
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={formData.frozenZone.minHumidity}
                    onChange={(e) => handleFrozenChange('minHumidity', parseFloat(e.target.value) || 0)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      marginTop: '4px',
                      fontSize: '13px',
                      fontWeight: 600,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                    Độ ẩm tối đa (% RH):
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={formData.frozenZone.maxHumidity}
                    onChange={(e) => handleFrozenChange('maxHumidity', parseFloat(e.target.value) || 0)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      marginTop: '4px',
                      fontSize: '13px',
                      fontWeight: 600,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Kho Khô (Dry Zone) */}
          {activeTab === 'DRY' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div
                style={{
                  padding: '10px 14px',
                  backgroundColor: '#fffbeb',
                  borderRadius: '6px',
                  border: '1px solid #fde68a',
                  fontSize: '12px',
                  color: '#92400e',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <Info size={16} />
                <span>Kho Khô lưu trữ gạo, ngũ cốc, đồ hộp, gia vị, bánh kẹo. Chuẩn: 18.0°C ~ 26.0°C và độ ẩm 40% ~ 65%.</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                    Nhiệt độ tối thiểu (°C):
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={formData.dryZone.minTemp}
                    onChange={(e) => handleDryChange('minTemp', parseFloat(e.target.value) || 0)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      marginTop: '4px',
                      fontSize: '13px',
                      fontWeight: 600,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                    Nhiệt độ tối đa an toàn (°C):
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={formData.dryZone.maxTemp}
                    onChange={(e) => handleDryChange('maxTemp', parseFloat(e.target.value) || 0)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      marginTop: '4px',
                      fontSize: '13px',
                      fontWeight: 600,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                    Độ ẩm tối thiểu (% RH):
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={formData.dryZone.minHumidity}
                    onChange={(e) => handleDryChange('minHumidity', parseFloat(e.target.value) || 0)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      marginTop: '4px',
                      fontSize: '13px',
                      fontWeight: 600,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                    Độ ẩm tối đa (% RH):
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={formData.dryZone.maxHumidity}
                    onChange={(e) => handleDryChange('maxHumidity', parseFloat(e.target.value) || 0)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      marginTop: '4px',
                      fontSize: '13px',
                      fontWeight: 600,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Tab 4: Chính sách Kích hoạt Còi & Báo Động (Policy) */}
          {activeTab === 'POLICY' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div
                style={{
                  padding: '10px 14px',
                  backgroundColor: '#fef2f2',
                  borderRadius: '6px',
                  border: '1px solid #fecaca',
                  fontSize: '12px',
                  color: '#991b1b',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <ShieldAlert size={16} />
                <span>Cấu hình thời gian trễ và dung sai nhằm loại bỏ báo động giả do nhân viên mở cửa kho chớp nhoáng hoặc luồng gió quạt đối lưu.</span>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Clock size={14} color="#0f172a" /> Thời gian vi phạm liên tục trước khi phát còi (giây):
                </label>
                <select
                  value={formData.violationWindowSeconds}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      violationWindowSeconds: parseInt(e.target.value) || 30,
                    }))
                  }
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    marginTop: '4px',
                    fontSize: '13px',
                    fontWeight: 600,
                    backgroundColor: '#ffffff',
                    cursor: 'pointer',
                  }}
                >
                  <option value={15}>15 giây (Phản ứng siêu nhanh - Kho y tế / vắc-xin)</option>
                  <option value={30}>30 giây (Tiêu chuẩn đề xuất WMS kho thực phẩm)</option>
                  <option value={60}>60 giây (Kho diện tích lớn, lưu lượng bốc dỡ cao)</option>
                  <option value={120}>120 giây (2 phút - Tránh báo động khi xuất nhập hàng loạt)</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                    Dung sai nhiệt độ Deadband (±°C):
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="2.0"
                    value={formData.tempDeadband}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        tempDeadband: parseFloat(e.target.value) || 0.5,
                      }))
                    }
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      marginTop: '4px',
                      fontSize: '13px',
                      fontWeight: 600,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  />
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>Khuyên dùng: 0.5°C</div>
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                    Dung sai độ ẩm Deadband (±% RH):
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="5.0"
                    value={formData.humDeadband}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        humDeadband: parseFloat(e.target.value) || 2.0,
                      }))
                    }
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      marginTop: '4px',
                      fontSize: '13px',
                      fontWeight: 600,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  />
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>Khuyên dùng: 2.0%</div>
                </div>
              </div>
            </div>
          )}

          {isSavedNotice && (
            <div
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                backgroundColor: '#f0fdf4',
                color: '#166534',
                border: '1px solid #bbf7d0',
                fontSize: '12.5px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <CheckCircle2 size={16} />
              <span>Đã lưu thành công cấu hình ngưỡng an toàn cho {formData.warehouseName || targetWhCode}!</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '14px 24px',
            borderTop: '1px solid #e2e8f0',
            backgroundColor: '#f8fafc',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <button
            type="button"
            onClick={handleReset}
            style={{
              padding: '8px 14px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#475569',
              fontSize: '12.5px',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <RotateCcw size={14} />
            <span>Khôi Phục Mặc Định ISO</span>
          </button>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#334155',
                fontSize: '12.5px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Đóng
            </button>
            <button
              type="button"
              onClick={handleSave}
              style={{
                padding: '8px 20px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: '#0f766e',
                color: '#ffffff',
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 1px 2px rgba(15, 118, 110, 0.2)',
              }}
            >
              <Save size={14} />
              <span>Lưu Cấu Hình Kho</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WarehouseClimateThresholdModal;
