import React, { useState, useEffect } from 'react';
import { X, Building2, MapPin, Thermometer, Snowflake, Boxes, ShieldCheck, Save, Plus } from 'lucide-react';
import { useWarehouse, type Warehouse } from '../contexts/WarehouseContext';
import { AddressPicker } from './AddressPicker';

export const WarehouseConfigModal: React.FC = () => {
  const { isConfigModalOpen, closeConfigModal, targetWarehouseForConfig, createWarehouse, updateWarehouse } = useWarehouse();
  
  const isEditing = !!targetWarehouseForConfig;
  const [activeTab, setActiveTab] = useState<'INFO' | 'TEMP' | 'CAPACITY' | 'MANAGER'>('INFO');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [form, setForm] = useState({
    code: '',
    name: '',
    address: '',
    latitude: 10.8282,
    longitude: 106.6802,
    isActive: true,
    phone: '028 3822 9999',
    managerName: 'Trần Văn Bình',
    managerEmail: 'manager@sfwms.vn',
    coolZoneMinTemp: 0,
    coolZoneMaxTemp: 4,
    frozenZoneMinTemp: -22,
    frozenZoneMaxTemp: -18,
    dryZoneMinTemp: 18,
    dryZoneMaxTemp: 28,
    maxRackCapacity: 350,
    totalRacks: 6,
    serviceRadiusKm: 12,
  });

  useEffect(() => {
    if (targetWarehouseForConfig) {
      setForm({
        code: targetWarehouseForConfig.code || '',
        name: targetWarehouseForConfig.name || '',
        address: targetWarehouseForConfig.address || '',
        latitude: targetWarehouseForConfig.latitude || 10.8282,
        longitude: targetWarehouseForConfig.longitude || 106.6802,
        isActive: targetWarehouseForConfig.isActive ?? true,
        phone: targetWarehouseForConfig.phone || '028 3822 9999',
        managerName: targetWarehouseForConfig.managerName || 'Trần Văn Bình',
        managerEmail: targetWarehouseForConfig.managerEmail || 'manager@sfwms.vn',
        coolZoneMinTemp: targetWarehouseForConfig.coolZoneMinTemp ?? 0,
        coolZoneMaxTemp: targetWarehouseForConfig.coolZoneMaxTemp ?? 4,
        frozenZoneMinTemp: targetWarehouseForConfig.frozenZoneMinTemp ?? -22,
        frozenZoneMaxTemp: targetWarehouseForConfig.frozenZoneMaxTemp ?? -18,
        dryZoneMinTemp: targetWarehouseForConfig.dryZoneMinTemp ?? 18,
        dryZoneMaxTemp: targetWarehouseForConfig.dryZoneMaxTemp ?? 28,
        maxRackCapacity: targetWarehouseForConfig.maxRackCapacity ?? 350,
        totalRacks: targetWarehouseForConfig.totalRacks ?? 6,
        serviceRadiusKm: targetWarehouseForConfig.serviceRadiusKm ?? 12,
      });
    } else {
      setForm({
        code: `WH-0${Math.floor(Math.random() * 80 + 17)}`,
        name: '',
        address: '',
        latitude: 10.8282,
        longitude: 106.6802,
        isActive: true,
        phone: '028 3822 9999',
        managerName: 'Nguyễn Hoàng Nam',
        managerEmail: 'govap@sfwms.vn',
        coolZoneMinTemp: 0,
        coolZoneMaxTemp: 4,
        frozenZoneMinTemp: -22,
        frozenZoneMaxTemp: -18,
        dryZoneMinTemp: 18,
        dryZoneMaxTemp: 28,
        maxRackCapacity: 350,
        totalRacks: 6,
        serviceRadiusKm: 12,
      });
    }
  }, [targetWarehouseForConfig, isConfigModalOpen]);

  if (!isConfigModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (isEditing && targetWarehouseForConfig) {
        const res = await updateWarehouse(targetWarehouseForConfig.id, form);
        if (res) {
          alert(`✅ Cập nhật cấu hình kho ${form.name} (${form.code}) thành công!`);
          closeConfigModal();
        } else {
          alert('❌ Có lỗi xảy ra khi lưu cấu hình kho.');
        }
      } else {
        const res = await createWarehouse(form);
        if (res) {
          alert(`✅ Đã thêm mới kho ${form.name} (${form.code}) vào hệ thống chuỗi lạnh thành công!`);
          closeConfigModal();
        } else {
          alert('❌ Có lỗi xảy ra khi tạo kho mới.');
        }
      }
    } catch (err) {
      console.error(err);
      alert('Không thể kết nối đến server.');
    } finally {
      setIsSubmitting(false);
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
      zIndex: 3500,
    }}>
      <div style={{
        backgroundColor: '#ffffff',
        width: '750px',
        maxWidth: '95vw',
        maxHeight: '90vh',
        borderRadius: '20px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '1.25rem 1.75rem',
          background: 'linear-gradient(135deg, #0f766e 0%, #0d9488 100%)',
          color: '#ffffff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: 'rgba(255,255,255,0.2)', padding: '8px', borderRadius: '10px' }}>
              <Building2 size={22} color="#ffffff" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>
                {isEditing ? `⚙️ Cấu Hình Kho Hàng: ${targetWarehouseForConfig.name}` : '➕ Đăng Ký & Thiết Lập Kho Hàng Mới'}
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.8rem', opacity: 0.9 }}>
                {isEditing ? `Mã kho: ${targetWarehouseForConfig.code} • Chuỗi cung ứng SFWMS TP.HCM` : 'Thêm chi nhánh vệ tinh mới vào mạng lưới kho thông minh'}
              </p>
            </div>
          </div>
          <button
            onClick={closeConfigModal}
            style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '8px', padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid #e2e8f0',
          background: '#f8fafc',
          padding: '0 1.5rem',
          gap: '12px',
        }}>
          <button
            type="button"
            onClick={() => setActiveTab('INFO')}
            style={{
              padding: '12px 14px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontSize: '0.86rem',
              fontWeight: activeTab === 'INFO' ? 800 : 600,
              color: activeTab === 'INFO' ? '#0f766e' : '#64748b',
              borderBottom: activeTab === 'INFO' ? '2.5px solid #0f766e' : '2.5px solid transparent',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <MapPin size={16} /> 1. Định Danh & Tọa Độ GPS
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('TEMP')}
            style={{
              padding: '12px 14px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontSize: '0.86rem',
              fontWeight: activeTab === 'TEMP' ? 800 : 600,
              color: activeTab === 'TEMP' ? '#0f766e' : '#64748b',
              borderBottom: activeTab === 'TEMP' ? '2.5px solid #0f766e' : '2.5px solid transparent',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Thermometer size={16} /> 2. Chuỗi Lạnh (Cold Chain)
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('CAPACITY')}
            style={{
              padding: '12px 14px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontSize: '0.86rem',
              fontWeight: activeTab === 'CAPACITY' ? 800 : 600,
              color: activeTab === 'CAPACITY' ? '#0f766e' : '#64748b',
              borderBottom: activeTab === 'CAPACITY' ? '2.5px solid #0f766e' : '2.5px solid transparent',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Boxes size={16} /> 3. Kệ Kho & Sức Chứa
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('MANAGER')}
            style={{
              padding: '12px 14px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontSize: '0.86rem',
              fontWeight: activeTab === 'MANAGER' ? 800 : 600,
              color: activeTab === 'MANAGER' ? '#0f766e' : '#64748b',
              borderBottom: activeTab === 'MANAGER' ? '2.5px solid #0f766e' : '2.5px solid transparent',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <ShieldCheck size={16} /> 4. Phân Quyền Quản Lý
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto' }}>
          <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

            {/* TAB 1: INFO & GPS */}
            {activeTab === 'INFO' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>Mã Kho Hàng *</label>
                    <input
                      required
                      type="text"
                      disabled={isEditing}
                      placeholder="VD: WH-017"
                      value={form.code}
                      onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })}
                      style={{ padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem', fontWeight: 700, backgroundColor: isEditing ? '#f1f5f9' : '#fff' }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>Tên Kho Hàng *</label>
                    <input
                      required
                      type="text"
                      placeholder="VD: Kho Hàng Tân Phú (HCM West-Central)"
                      value={form.name}
                      onChange={e => setForm({ ...form, name: e.target.value })}
                      style={{ padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>Địa Chỉ Kho Hàng (Hành chính chuẩn) *</label>
                  <AddressPicker
                    initialAddress={form.address}
                    onAddressChange={(address, coords) => {
                      if (coords) {
                        setForm(prev => ({
                          ...prev,
                          address,
                          latitude: Number(coords.lat.toFixed(6)),
                          longitude: Number(coords.lng.toFixed(6)),
                        }));
                      } else {
                        setForm(prev => ({ ...prev, address }));
                      }
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569' }}>Vĩ độ (Latitude) *</label>
                    <input
                      required
                      type="number"
                      step="0.000001"
                      placeholder="10.8282"
                      value={form.latitude}
                      onChange={e => setForm({ ...form, latitude: parseFloat(e.target.value) || 0 })}
                      style={{ padding: '0.55rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569' }}>Kinh độ (Longitude) *</label>
                    <input
                      required
                      type="number"
                      step="0.000001"
                      placeholder="106.6802"
                      value={form.longitude}
                      onChange={e => setForm({ ...form, longitude: parseFloat(e.target.value) || 0 })}
                      style={{ padding: '0.55rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569' }}>Bán kính giao hàng (km)</label>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={form.serviceRadiusKm}
                      onChange={e => setForm({ ...form, serviceRadiusKm: parseInt(e.target.value) || 10 })}
                      style={{ padding: '0.55rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f0fdf4', padding: '12px 14px', borderRadius: '10px', border: '1px solid #bbf7d0', marginTop: '4px' }}>
                  <div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#166534' }}>Trạng Thái Hoạt Động</div>
                    <div style={{ fontSize: '0.75rem', color: '#15803d' }}>Kho hoạt động sẽ tự động tham gia thuật toán Auto-Routing đơn hàng TMĐT</div>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      onChange={e => setForm({ ...form, isActive: e.target.checked })}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: '0.85rem', fontWeight: 800, color: form.isActive ? '#166534' : '#991b1b' }}>
                      {form.isActive ? '🟢 ĐANG HOẠT ĐỘNG' : '🔴 TẠM DỪNG BẢO TRÌ'}
                    </span>
                  </label>
                </div>
              </div>
            )}

            {/* TAB 2: TEMPERATURE */}
            {activeTab === 'TEMP' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ backgroundColor: '#eff6ff', padding: '10px 14px', borderRadius: '10px', border: '1px solid #bfdbfe', fontSize: '0.8rem', color: '#1e40af' }}>
                  ℹ️ Cấu hình dải nhiệt độ chuẩn cho các phân khu chuỗi lạnh. Cảm biến IoT sẽ phát chuông cảnh báo đỏ khi nhiệt độ lệch khỏi ngưỡng này quá 5 phút.
                </div>

                {/* Cool Zone */}
                <div style={{ backgroundColor: '#f0fdfa', border: '1.5px solid #99f6e4', borderRadius: '12px', padding: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <Thermometer size={18} color="#0f766e" />
                    <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f766e' }}>Phân Khu Hàng Mát (Cool Zone - Rau củ, Thịt tươi sống, Sữa)</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 700 }}>Nhiệt độ tối thiểu (°C)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={form.coolZoneMinTemp}
                        onChange={e => setForm({ ...form, coolZoneMinTemp: parseFloat(e.target.value) || 0 })}
                        style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px', fontSize: '0.85rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 700 }}>Nhiệt độ tối đa (°C)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={form.coolZoneMaxTemp}
                        onChange={e => setForm({ ...form, coolZoneMaxTemp: parseFloat(e.target.value) || 4 })}
                        style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px', fontSize: '0.85rem' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Frozen Zone */}
                <div style={{ backgroundColor: '#f0f9ff', border: '1.5px solid #bae6fd', borderRadius: '12px', padding: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <Snowflake size={18} color="#0284c7" />
                    <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0284c7' }}>Phân Khu Hàng Đông (Frozen Zone - Hải sản, Kem, Thịt bò đông lạnh)</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 700 }}>Nhiệt độ tối thiểu (°C)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={form.frozenZoneMinTemp}
                        onChange={e => setForm({ ...form, frozenZoneMinTemp: parseFloat(e.target.value) || -22 })}
                        style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px', fontSize: '0.85rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 700 }}>Nhiệt độ tối đa (°C)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={form.frozenZoneMaxTemp}
                        onChange={e => setForm({ ...form, frozenZoneMaxTemp: parseFloat(e.target.value) || -18 })}
                        style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px', fontSize: '0.85rem' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Dry Zone */}
                <div style={{ backgroundColor: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: '12px', padding: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <Boxes size={18} color="#d97706" />
                    <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#d97706' }}>Phân Khu Hàng Khô (Dry Zone - Gạo, Đồ hộp, Gia vị, Nước mắm)</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 700 }}>Nhiệt độ tối thiểu (°C)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={form.dryZoneMinTemp}
                        onChange={e => setForm({ ...form, dryZoneMinTemp: parseFloat(e.target.value) || 18 })}
                        style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px', fontSize: '0.85rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 700 }}>Nhiệt độ tối đa (°C)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={form.dryZoneMaxTemp}
                        onChange={e => setForm({ ...form, dryZoneMaxTemp: parseFloat(e.target.value) || 28 })}
                        style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px', fontSize: '0.85rem' }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: CAPACITY & RACKS */}
            {activeTab === 'CAPACITY' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ backgroundColor: '#f8fafc', padding: '12px 14px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#1e293b' }}>📐 Cấu hình layout kệ kho & Sức chứa Digital Twin</div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px' }}>
                    Thiết lập số lượng kệ kho và tải trọng tối đa để mô phỏng không gian 3D và thuật toán gợi ý vị trí sắp xếp hàng hóa.
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>Sức chứa tối đa mỗi kệ (SP/Thùng)</label>
                    <input
                      type="number"
                      min="50"
                      max="1000"
                      value={form.maxRackCapacity}
                      onChange={e => setForm({ ...form, maxRackCapacity: parseInt(e.target.value) || 350 })}
                      style={{ padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem', fontWeight: 700 }}
                    />
                    <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Hệ thống tự đổi màu kệ 3D (Xanh ➔ Vàng ➔ Đỏ) khi đầy tải</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>Tổng số dãy kệ hoạt động</label>
                    <input
                      type="number"
                      min="2"
                      max="20"
                      value={form.totalRacks}
                      onChange={e => setForm({ ...form, totalRacks: parseInt(e.target.value) || 6 })}
                      style={{ padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem', fontWeight: 700 }}
                    />
                    <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Bao gồm Kệ A1-A2 (Mát), B1-B2 (Đông), C1-C2 (Khô)</span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: MANAGER */}
            {activeTab === 'MANAGER' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ backgroundColor: '#f0fdf4', padding: '12px 14px', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#166534' }}>👤 Phân Bổ Quản Lý Kho (Warehouse Manager)</div>
                  <div style={{ fontSize: '0.78rem', color: '#15803d', marginTop: '4px' }}>
                    Tài khoản được phân công sẽ toàn quyền phụ trách ca trực, điều phối đơn và kiểm kê tồn kho tại chi nhánh này.
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>Tên Quản Lý Kho</label>
                    <input
                      type="text"
                      placeholder="VD: Nguyễn Hoàng Nam"
                      value={form.managerName}
                      onChange={e => setForm({ ...form, managerName: e.target.value })}
                      style={{ padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem' }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>Email Đăng Nhập Quản Lý</label>
                    <input
                      type="email"
                      placeholder="VD: govap@sfwms.vn"
                      value={form.managerEmail}
                      onChange={e => setForm({ ...form, managerEmail: e.target.value })}
                      style={{ padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>Số Điện Thoại Trực Kho</label>
                  <input
                    type="text"
                    placeholder="VD: 028 3822 9999"
                    value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                    style={{ padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem' }}
                  />
                </div>
              </div>
            )}

          </div>

          {/* Modal Footer */}
          <div style={{
            padding: '1rem 1.5rem',
            borderTop: '1px solid #e2e8f0',
            background: '#f8fafc',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <button
              type="button"
              onClick={closeConfigModal}
              style={{
                padding: '9px 18px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#475569',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '0.85rem',
              }}
            >
              Đóng
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                padding: '10px 22px',
                borderRadius: '8px',
                border: 'none',
                background: '#0f766e',
                color: '#ffffff',
                cursor: 'pointer',
                fontWeight: 800,
                fontSize: '0.88rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 4px 12px rgba(15,118,110,0.25)',
              }}
            >
              <Save size={16} />
              <span>{isSubmitting ? 'Đang lưu...' : isEditing ? 'Lưu Cấu Hình Kho' : 'Tạo Kho Hàng Mới'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
