import React, { useState, useEffect } from 'react';
import {
  Inbox,
  PackageCheck,
  Truck,
  CheckCircle2,
  Clock,
  UserCheck,
  MapPin,
  QrCode,
  Printer,
  ChevronRight,
  AlertTriangle,
  Search,
  Filter,
  RefreshCw,
  Layers,
  Thermometer,
  ShieldCheck,
  CheckSquare,
  Send,
  Zap,
  Phone,
  FileText,
  X,
  Play
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

// API Endpoints
const OUTBOUND_API = 'http://localhost:3007';
const TRANSPORT_API = 'http://localhost:3013';
const INVENTORY_API = 'http://localhost:3011';

export interface DispatchOrderItem {
  sku: string;
  productName: string;
  category: string;
  requestedQuantity: number;
  unit: string;
  suggestedLotCode?: string;
  suggestedSlotCode?: string;
  expiryDate?: string;
  zone: 'COLD' | 'FROZEN' | 'DRY';
  picked: boolean;
}

export interface DispatchOrder {
  id: string;
  orderCode: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  deliverySlotText: string;
  paymentMethod: string;
  totalAmount: number;
  status: 'PENDING' | 'PICKING' | 'PACKED' | 'READY_FOR_DELIVERY' | 'SHIPPED' | 'CONFIRMED';
  createdAt: string;
  items: DispatchOrderItem[];
  assignedDriverId?: string;
  assignedDriverName?: string;
  assignedDriverPhone?: string;
  vehicleType?: 'NORMAL' | 'REFRIGERATED' | 'FROZEN';
  packageType?: string;
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  licensePlate: string;
  vehicleType: 'NORMAL' | 'REFRIGERATED' | 'FROZEN';
  status: 'AVAILABLE' | 'IN_TRANSIT' | 'LOADING' | 'OFFLINE';
  assignedOrdersCount: number;
  capacityKg: number;
  currentTemp?: string;
}

const MOCK_DISPATCH_ORDERS: DispatchOrder[] = [
  {
    id: 'ord-101',
    orderCode: 'ORD-884920',
    customerName: 'Nguyễn Văn Tường',
    customerPhone: '0908 123 456',
    deliveryAddress: '227 Nguyễn Văn Cừ, Phường 4, Quận 5, TP.HCM',
    deliverySlotText: 'Giao siêu tốc 2 giờ (Hôm nay)',
    paymentMethod: 'COD - Tiền mặt',
    totalAmount: 105000,
    status: 'PENDING',
    createdAt: '2026-07-20 16:30',
    items: [
      {
        sku: 'RAU-001',
        productName: 'Cà chua VietGAP Đà Lạt',
        category: 'Rau củ quả',
        requestedQuantity: 2,
        unit: '500g',
        suggestedLotCode: 'LOT-CC-20260718',
        suggestedSlotCode: 'K-01-A2 (Kho Lạnh)',
        expiryDate: '2026-07-28',
        zone: 'COLD',
        picked: false,
      },
      {
        sku: 'THIT-003',
        productName: 'Thịt ba chỉ heo C.P tươi sạch',
        category: 'Thịt cá',
        requestedQuantity: 1,
        unit: 'Khay 500g',
        suggestedLotCode: 'LOT-TB-20260719',
        suggestedSlotCode: 'K-02-B1 (Kho Lợi Lạnh)',
        expiryDate: '2026-07-24',
        zone: 'COLD',
        picked: false,
      },
    ],
  },
  {
    id: 'ord-102',
    orderCode: 'ORD-884925',
    customerName: 'Trần Thị Mai',
    customerPhone: '0912 345 678',
    deliveryAddress: '135 Nam Kỳ Khởi Nghĩa, Quận 1, TP.HCM',
    deliverySlotText: '14:00 - 16:00 Hôm nay',
    paymentMethod: 'Ví MoMo',
    totalAmount: 244000,
    status: 'PICKING',
    createdAt: '2026-07-20 16:10',
    items: [
      {
        sku: 'HAISAN-004',
        productName: 'Cá hồi Na-uy phi lê tươi',
        category: 'Thịt cá',
        requestedQuantity: 1,
        unit: 'Khay 300g',
        suggestedLotCode: 'LOT-CH-20260717',
        suggestedSlotCode: 'K-02-C3 (Kho Lạnh)',
        expiryDate: '2026-07-23',
        zone: 'COLD',
        picked: true,
      },
      {
        sku: 'TOM-005',
        productName: 'Tôm thẻ chân trắng đông lạnh',
        category: 'Đông lạnh',
        requestedQuantity: 1,
        unit: 'Hộp 500g',
        suggestedLotCode: 'LOT-TOM-20260710',
        suggestedSlotCode: 'D-01-A1 (Kho Đông)',
        expiryDate: '2026-12-30',
        zone: 'FROZEN',
        picked: false,
      },
    ],
  },
  {
    id: 'ord-103',
    orderCode: 'ORD-884910',
    customerName: 'Lê Hoàng Nam',
    customerPhone: '0988 777 666',
    deliveryAddress: '45 Nguyễn Thị Minh Khai, Quận 3, TP.HCM',
    deliverySlotText: '18:00 - 20:00 Hôm nay',
    paymentMethod: 'VNPay QR',
    totalAmount: 185000,
    status: 'PACKED',
    createdAt: '2026-07-20 15:45',
    packageType: 'Thùng xốp bảo quản lạnh (0-4°C) + Gel đá',
    items: [
      {
        sku: 'SUA-006',
        productName: 'Sữa tươi tiệt trùng TH True Milk 1L',
        category: 'Sữa & đồ uống',
        requestedQuantity: 2,
        unit: 'Hộp 1L',
        suggestedLotCode: 'LOT-TH-20260601',
        suggestedSlotCode: 'K-05-D2 (Kho Khô)',
        expiryDate: '2026-11-15',
        zone: 'DRY',
        picked: true,
      },
      {
        sku: 'MI-007',
        productName: 'Mì Acecook Hảo Hảo tôm chua cay',
        category: 'Đồ khô',
        requestedQuantity: 1,
        unit: 'Thùng 30 gói',
        suggestedLotCode: 'LOT-HH-20260510',
        suggestedSlotCode: 'K-06-A1 (Kho Khô)',
        expiryDate: '2027-01-20',
        zone: 'DRY',
        picked: true,
      },
    ],
  },
  {
    id: 'ord-104',
    orderCode: 'ORD-884890',
    customerName: 'Phạm Bảo An',
    customerPhone: '0933 112 233',
    deliveryAddress: '78 Lê Văn Sỹ, Phường 13, Quận 3, TP.HCM',
    deliverySlotText: 'Giao siêu tốc 2 giờ',
    paymentMethod: 'COD - Tiền mặt',
    totalAmount: 310000,
    status: 'SHIPPED',
    createdAt: '2026-07-20 14:20',
    assignedDriverId: 'drv-01',
    assignedDriverName: 'Nguyễn Văn Hùng',
    assignedDriverPhone: '0909 888 111',
    vehicleType: 'REFRIGERATED',
    packageType: 'Thùng xốp bảo quản lạnh 0-4°C',
    items: [
      {
        sku: 'THIT-003',
        productName: 'Thịt ba chỉ heo C.P tươi sạch',
        category: 'Thịt cá',
        requestedQuantity: 2,
        unit: 'Khay 500g',
        suggestedLotCode: 'LOT-TB-20260719',
        suggestedSlotCode: 'K-02-B1',
        expiryDate: '2026-07-24',
        zone: 'COLD',
        picked: true,
      },
    ],
  },
];

const MOCK_DRIVERS: Driver[] = [
  {
    id: 'drv-01',
    name: 'Nguyễn Văn Hùng',
    phone: '0909 888 111',
    licensePlate: '59-X1 884.92',
    vehicleType: 'REFRIGERATED',
    status: 'AVAILABLE',
    assignedOrdersCount: 1,
    capacityKg: 150,
    currentTemp: '2.5°C (Kho Lạnh)',
  },
  {
    id: 'drv-02',
    name: 'Trần Quốc Bảo',
    phone: '0918 333 444',
    licensePlate: '59-T2 123.45',
    vehicleType: 'FROZEN',
    status: 'AVAILABLE',
    assignedOrdersCount: 0,
    capacityKg: 300,
    currentTemp: '-19.2°C (Đông Lạnh)',
  },
  {
    id: 'drv-03',
    name: 'Lê Minh Tuấn',
    phone: '0977 555 666',
    licensePlate: '59-K3 999.88',
    vehicleType: 'NORMAL',
    status: 'AVAILABLE',
    assignedOrdersCount: 0,
    capacityKg: 100,
    currentTemp: 'Thường (Giao khô)',
  },
  {
    id: 'drv-04',
    name: 'Vũ Thanh Sơn',
    phone: '0938 222 999',
    licensePlate: '59-P1 554.32',
    vehicleType: 'REFRIGERATED',
    status: 'IN_TRANSIT',
    assignedOrdersCount: 3,
    capacityKg: 200,
    currentTemp: '3.1°C',
  },
];

export const WarehouseDispatch = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<DispatchOrder[]>(MOCK_DISPATCH_ORDERS);
  const [drivers, setDrivers] = useState<Driver[]>(MOCK_DRIVERS);
  const [activeTab, setActiveTab] = useState<'RECEIVE_PICK' | 'PACKING_QC' | 'DISPATCH' | 'FLEET'>('RECEIVE_PICK');
  const [selectedOrder, setSelectedOrder] = useState<DispatchOrder | null>(MOCK_DISPATCH_ORDERS[0]);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(MOCK_DRIVERS[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showManifestModal, setShowManifestModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Stats calculation
  const pendingCount = orders.filter(o => o.status === 'PENDING').length;
  const pickingCount = orders.filter(o => o.status === 'PICKING').length;
  const packedCount = orders.filter(o => o.status === 'PACKED' || o.status === 'READY_FOR_DELIVERY').length;
  const shippedCount = orders.filter(o => o.status === 'SHIPPED').length;
  const availableDriversCount = drivers.filter(d => d.status === 'AVAILABLE').length;

  // Filter orders
  const filteredOrders = orders.filter(o => {
    const matchesSearch = o.orderCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          o.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          o.customerPhone.includes(searchQuery);
    if (activeTab === 'RECEIVE_PICK') return matchesSearch && (o.status === 'PENDING' || o.status === 'PICKING');
    if (activeTab === 'PACKING_QC') return matchesSearch && (o.status === 'PICKING' || o.status === 'PACKED');
    if (activeTab === 'DISPATCH') return matchesSearch && (o.status === 'PACKED' || o.status === 'READY_FOR_DELIVERY' || o.status === 'SHIPPED');
    return matchesSearch;
  });

  // Action: Accept Pending Order to Start Picking
  const handleAcceptOrder = (orderId: string) => {
    setOrders(prev =>
      prev.map(o => (o.id === orderId ? { ...o, status: 'PICKING' } : o))
    );
    if (selectedOrder?.id === orderId) {
      setSelectedOrder(prev => (prev ? { ...prev, status: 'PICKING' } : null));
    }
    showToast(`✅ Đã tiếp nhận đơn #${orders.find(o => o.id === orderId)?.orderCode}. Đã khởi tạo danh mục soạn FEFO!`);
  };

  // Action: Toggle item pick state
  const handleToggleItemPicked = (orderId: string, sku: string) => {
    setOrders(prev =>
      prev.map(o => {
        if (o.id === orderId) {
          const updatedItems = o.items.map(it => (it.sku === sku ? { ...it, picked: !it.picked } : it));
          return { ...o, items: updatedItems };
        }
        return o;
      })
    );
    if (selectedOrder?.id === orderId) {
      setSelectedOrder(prev => {
        if (!prev) return null;
        const updatedItems = prev.items.map(it => (it.sku === sku ? { ...it, picked: !it.picked } : it));
        return { ...prev, items: updatedItems };
      });
    }
  };

  // Action: Complete Picking
  const handleCompletePicking = (orderId: string) => {
    setOrders(prev =>
      prev.map(o => (o.id === orderId ? { ...o, status: 'PACKED', packageType: 'Thùng xốp bảo quản lạnh 0-4°C + Gel đá' } : o))
    );
    if (selectedOrder?.id === orderId) {
      setSelectedOrder(prev => (prev ? { ...prev, status: 'PACKED', packageType: 'Thùng xốp bảo quản lạnh 0-4°C + Gel đá' } : null));
    }
    showToast(`📦 Hoàn tất soạn hàng đơn #${selectedOrder?.orderCode}. Chuyển sang khu vực Đóng gói QC!`);
  };

  // Action: Complete Packing
  const handleCompletePacking = (orderId: string, packageTypeStr: string) => {
    setOrders(prev =>
      prev.map(o => (o.id === orderId ? { ...o, status: 'READY_FOR_DELIVERY', packageType: packageTypeStr } : o))
    );
    if (selectedOrder?.id === orderId) {
      setSelectedOrder(prev => (prev ? { ...prev, status: 'READY_FOR_DELIVERY', packageType: packageTypeStr } : null));
    }
    showToast(`🏷️ Đã dán nhãn đóng gói thành công đơn #${selectedOrder?.orderCode}! Sẵn sàng bàn giao tài xế.`);
  };

  // Action: Assign Driver & Dispatch
  const handleAssignDriver = (orderId: string, driver: Driver) => {
    setOrders(prev =>
      prev.map(o =>
        o.id === orderId
          ? {
              ...o,
              status: 'SHIPPED',
              assignedDriverId: driver.id,
              assignedDriverName: driver.name,
              assignedDriverPhone: driver.phone,
              vehicleType: driver.vehicleType,
            }
          : o
      )
    );
    setDrivers(prev =>
      prev.map(d =>
        d.id === driver.id
          ? { ...d, assignedOrdersCount: d.assignedOrdersCount + 1, status: 'IN_TRANSIT' }
          : d
      )
    );
    if (selectedOrder?.id === orderId) {
      setSelectedOrder(prev =>
        prev
          ? {
              ...prev,
              status: 'SHIPPED',
              assignedDriverId: driver.id,
              assignedDriverName: driver.name,
              assignedDriverPhone: driver.phone,
              vehicleType: driver.vehicleType,
            }
          : null
      );
    }
    showToast(`🚚 Đã phân công tài xế ${driver.name} giao đơn #${selectedOrder?.orderCode}!`);
  };

  return (
    <div className="warehouse-dispatch-page" style={{ padding: '1.5rem', background: 'var(--color-bg)', minHeight: '100vh' }}>
      {/* Toast Alert */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: 20,
            right: 20,
            zIndex: 9999,
            backgroundColor: '#008848',
            color: '#fff',
            padding: '12px 20px',
            borderRadius: 8,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Zap size={18} color="#FFB800" />
          {toastMessage}
        </div>
      )}

      {/* Header Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Inbox size={28} color="#008848" /> Trung Tâm Tiếp Nhận & Phân Phối Đơn Hàng Kho (Dispatch Hub)
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginTop: 4 }}>
            Quản lý tiếp nhận đơn hàng khách, phân bổ vị trí lô FEFO, đóng gói QC và bàn giao cho nhân viên giao hàng
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => showToast('Đang đồng bộ dữ liệu thời gian thực từ Outbound & Transport Service...')}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <RefreshCw size={16} /> Làm mới dữ liệu
          </button>
        </div>
      </div>

      {/* Realtime KPI Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={kpiCardStyle('#EFF6FF', '#1D4ED8')}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1E40AF' }}>MỚI TIẾP NHẬN</span>
            <Inbox size={20} color="#1D4ED8" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, marginTop: 6, color: '#1E3A8A' }}>{pendingCount} đơn</div>
          <div style={{ fontSize: '0.75rem', color: '#3B82F6', marginTop: 2 }}>Chờ xác nhận soạn hàng</div>
        </div>

        <div style={kpiCardStyle('#FFF7ED', '#C2410C')}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#9A3412' }}>ĐANG SOẠN FEFO</span>
            <Layers size={20} color="#C2410C" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, marginTop: 6, color: '#7C2D12' }}>{pickingCount} đơn</div>
          <div style={{ fontSize: '0.75rem', color: '#EA580C', marginTop: 2 }}>Gợi ý vị trí kệ & lô hết hạn trước</div>
        </div>

        <div style={kpiCardStyle('#F0FDF4', '#15803D')}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#166534' }}>ĐÃ ĐÓNG GÓI</span>
            <PackageCheck size={20} color="#15803D" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, marginTop: 6, color: '#14532D' }}>{packedCount} đơn</div>
          <div style={{ fontSize: '0.75rem', color="#16A34A" marginTop: 2 }}>Đã dán nhãn & dán tem niêm phong</div>
        </div>

        <div style={kpiCardStyle('#F5F3FF', '#6D28D9')}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#5B21B6' }}>ĐANG GIAO HÀNG</span>
            <Truck size={20} color="#6D28D9" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, marginTop: 6, color: '#4C1D95' }}>{shippedCount} đơn</div>
          <div style={{ fontSize: '0.75rem', color: '#7C3AED', marginTop: 2 }}>Tài xế đang vận chuyển tận nhà</div>
        </div>

        <div style={kpiCardStyle('#FEFCE8', '#A16207')}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#854D0E' }}>TÀI XẾ SẴN SÀNG</span>
            <UserCheck size={20} color="#A16207" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, marginTop: 6, color: '#713F12' }}>{availableDriversCount} tài xế</div>
          <div style={{ fontSize: '0.75rem', color: '#CA8A04', marginTop: 2 }}>Xe máy & Xe thùng lạnh 0-4°C</div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div style={{ display: 'flex', borderBottom: '2px solid var(--color-border)', marginBottom: '1.5rem', gap: 8 }}>
        <button
          onClick={() => setActiveTab('RECEIVE_PICK')}
          style={tabButtonStyle(activeTab === 'RECEIVE_PICK')}
        >
          <Inbox size={18} /> 1. Tiếp Nhận & Soạn Hàng FEFO ({pendingCount + pickingCount})
        </button>

        <button
          onClick={() => setActiveTab('PACKING_QC')}
          style={tabButtonStyle(activeTab === 'PACKING_QC')}
        >
          <PackageCheck size={18} /> 2. Kiểm Tra QC & Đóng Gói ({pickingCount + packedCount})
        </button>

        <button
          onClick={() => setActiveTab('DISPATCH')}
          style={tabButtonStyle(activeTab === 'DISPATCH')}
        >
          <Send size={18} /> 3. Phân Phối & Bàn Giao Tài Xế ({packedCount})
        </button>

        <button
          onClick={() => setActiveTab('FLEET')}
          style={tabButtonStyle(activeTab === 'FLEET')}
        >
          <Truck size={18} /> 4. Giám Sát Đội Xe & Tài Xế ({drivers.length})
        </button>
      </div>

      {/* Search Bar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: '1.25rem' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={18} color="var(--color-text-muted)" style={{ position: 'absolute', left: 12, top: 12 }} />
          <input
            type="text"
            placeholder="Tìm theo mã đơn (e.g. ORD-884920), tên khách hàng, số điện thoại..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="input"
            style={{ paddingLeft: 38 }}
          />
        </div>
      </div>

      {/* TAB CONTENT AREAS */}
      {activeTab !== 'FLEET' && (
        <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: '1.5rem' }}>
          {/* Left Order List Panel */}
          <div style={{ background: 'var(--color-surface)', borderRadius: 12, padding: '1rem', border: '1px solid var(--color-border)', maxHeight: '750px', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '1rem', color: 'var(--color-text)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Danh Sách Đơn Hàng</span>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, background: '#E6F4ED', color: '#008848', padding: '2px 8px', borderRadius: 12 }}>
                {filteredOrders.length} đơn
              </span>
            </h3>

            {filteredOrders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--color-text-muted)' }}>
                Không có đơn hàng nào trong mục này.
              </div>
            ) : (
              filteredOrders.map(order => {
                const isSelected = selectedOrder?.id === order.id;
                return (
                  <div
                    key={order.id}
                    onClick={() => setSelectedOrder(order)}
                    style={{
                      padding: '12px',
                      borderRadius: 8,
                      border: isSelected ? '2px solid #008848' : '1px solid var(--color-border)',
                      backgroundColor: isSelected ? 'rgba(0, 136, 72, 0.05)' : 'var(--color-surface)',
                      marginBottom: 10,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#008848' }}>#{order.orderCode}</span>
                      {renderStatusBadge(order.status)}
                    </div>

                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text)', marginBottom: 2 }}>
                      {order.customerName} - {order.customerPhone}
                    </div>

                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>
                      <MapPin size={12} /> {order.deliveryAddress}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed var(--color-border)', paddingTop: 6, marginTop: 4 }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{order.items.length} món</span>
                      <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#E53935' }}>
                        {order.totalAmount.toLocaleString('vi-VN')}đ
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Right Order Details & Action Panel */}
          {selectedOrder ? (
            <div style={{ background: 'var(--color-surface)', borderRadius: 12, padding: '1.25rem', border: '1px solid var(--color-border)' }}>
              {/* Top Order Title Bar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--color-border)', paddingBottom: '1rem', marginBottom: '1rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <h2 style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--color-text)' }}>Đơn Hàng #{selectedOrder.orderCode}</h2>
                    {renderStatusBadge(selectedOrder.status)}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: 4 }}>
                    Thời gian đặt: <strong>{selectedOrder.createdAt}</strong> • Khung giờ giao: <strong style={{ color: '#008848' }}>{selectedOrder.deliverySlotText}</strong>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Phương thức thanh toán</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--color-text)' }}>{selectedOrder.paymentMethod}</div>
                </div>
              </div>

              {/* Customer Info Box */}
              <div style={{ backgroundColor: 'var(--color-bg)', padding: '12px 16px', borderRadius: 8, marginBottom: '1.25rem', display: 'flex', gap: 20 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>KHÁCH HÀNG NHẬN HÀNG</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--color-text)', marginTop: 2 }}>
                    {selectedOrder.customerName} ({selectedOrder.customerPhone})
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <MapPin size={14} color="#008848" /> {selectedOrder.deliveryAddress}
                  </div>
                </div>

                {selectedOrder.assignedDriverName && (
                  <div style={{ borderLeft: '1px solid var(--color-border)', paddingLeft: 20 }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>TÀI XẾ GIAO HÀNG</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#008848', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Truck size={16} /> {selectedOrder.assignedDriverName} ({selectedOrder.assignedDriverPhone})
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: 2 }}>
                      Loại xe: <strong>{selectedOrder.vehicleType === 'REFRIGERATED' ? 'Xe Lạnh 0-4°C' : selectedOrder.vehicleType === 'FROZEN' ? 'Xe Đông Lạnh -18°C' : 'Xe Thường'}</strong>
                    </div>
                  </div>
                )}
              </div>

              {/* TAB SPECIFIC ACTIONS & TABLES */}
              {activeTab === 'RECEIVE_PICK' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Layers size={18} color="#008848" /> Danh Sách Mặt Hàng & Gợi Ý Lô Hàng Soạn FEFO
                    </h3>

                    {selectedOrder.status === 'PENDING' && (
                      <button
                        onClick={() => handleAcceptOrder(selectedOrder.id)}
                        className="btn btn-primary"
                        style={{ backgroundColor: '#008848', color: '#fff', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}
                      >
                        <Play size={16} /> Tiếp Nhận Đơn & Bắt Đầu Soạn FEFO
                      </button>
                    )}

                    {selectedOrder.status === 'PICKING' && (
                      <button
                        onClick={() => handleCompletePicking(selectedOrder.id)}
                        className="btn btn-success"
                        style={{ backgroundColor: '#16A34A', color: '#fff', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}
                      >
                        <CheckCircle2 size={16} /> Hoàn Tất Soạn Hàng
                      </button>
                    )}
                  </div>

                  {/* Item FEFO Table */}
                  <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ backgroundColor: 'var(--color-bg)', textAlign: 'left', fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                        <th style={{ padding: 10 }}>Trạng thái</th>
                        <th style={{ padding: 10 }}>Sản phẩm</th>
                        <th style={{ padding: 10 }}>Số lượng</th>
                        <th style={{ padding: 10 }}>Lô gợi ý (FEFO)</th>
                        <th style={{ padding: 10 }}>Vị trí kệ kho</th>
                        <th style={{ padding: 10 }}>Khu vực bảo quản</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedOrder.items.map((item, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid var(--color-border)', fontSize: '0.85rem' }}>
                          <td style={{ padding: 10 }}>
                            <input
                              type="checkbox"
                              checked={item.picked}
                              onChange={() => handleToggleItemPicked(selectedOrder.id, item.sku)}
                              style={{ width: 18, height: 18, cursor: 'pointer', accentColor: '#008848' }}
                            />
                          </td>
                          <td style={{ padding: 10, fontWeight: 700, color: 'var(--color-text)' }}>
                            {item.productName}
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 400 }}>SKU: {item.sku}</div>
                          </td>
                          <td style={{ padding: 10, fontWeight: 800 }}>{item.requestedQuantity} {item.unit}</td>
                          <td style={{ padding: 10 }}>
                            <span style={{ backgroundColor: '#FEF3C7', color: '#92400E', padding: '3px 8px', borderRadius: 6, fontWeight: 700, fontSize: '0.8rem' }}>
                              {item.suggestedLotCode}
                            </span>
                            <div style={{ fontSize: '0.75rem', color: '#D97706', marginTop: 2 }}>HSD: {item.expiryDate}</div>
                          </td>
                          <td style={{ padding: 10, fontWeight: 700, color: '#008848' }}>{item.suggestedSlotCode}</td>
                          <td style={{ padding: 10 }}>
                            {item.zone === 'COLD' && <span style={{ color: '#0284C7', fontWeight: 700 }}>❄️ Kho Lạnh (0-4°C)</span>}
                            {item.zone === 'FROZEN' && <span style={{ color: '#2563EB', fontWeight: 700 }}>🧊 Đông Lạnh (-18°C)</span>}
                            {item.zone === 'DRY' && <span style={{ color: '#D97706', fontWeight: 700 }}>📦 Kho Khô</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === 'PACKING_QC' && (
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--color-text)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <PackageCheck size={18} color="#008848" /> Đóng Gói & Quy Cách Bảo Quản Nhiệt Độ
                  </h3>

                  <div style={{ backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', padding: 14, borderRadius: 8, marginBottom: '1.25rem' }}>
                    <div style={{ fontWeight: 800, color: '#166534', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <ShieldCheck size={18} /> Quy trình Kiểm duyệt Chất lượng QC Thực phẩm CityMart
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#15803D' }}>
                      • Đảm bảo thực phẩm tươi sống được đóng thùng xốp chuyên dụng.<br />
                      • Dán đá khô / Gel giữ nhiệt đối với đơn thuộc nhóm Kho Lạnh (0-4°C) & Đông Lạnh (-18°C).
                    </div>
                  </div>

                  <div style={{ marginBottom: '1.25rem' }}>
                    <label style={{ fontWeight: 700, fontSize: '0.85rem', display: 'block', marginBottom: 6 }}>Chọn Loại Bao Bì & Niêm Phong:</label>
                    <select
                      className="input"
                      value={selectedOrder.packageType || 'Thùng xốp bảo quản lạnh (0-4°C) + Gel đá'}
                      onChange={e => {
                        const val = e.target.value;
                        setSelectedOrder(prev => (prev ? { ...prev, packageType: val } : null));
                      }}
                      style={{ width: '100%', padding: '10px', fontWeight: 600 }}
                    >
                      <option value="Thùng xốp bảo quản lạnh (0-4°C) + Gel đá">Thùng xốp bảo quản lạnh (0-4°C) + Gel đá giữ nhiệt</option>
                      <option value="Thùng xốp cách nhiệt Đông Lạnh (-18°C) + CO2 khô">Thùng xốp cách nhiệt Đông Lạnh (-18°C) + Đá CO2 khô</option>
                      <option value="Thùng Carton Tiêu Chuẩn (Đồ khô/Nhu yếu phẩm)">Thùng Carton Tiêu Chuẩn (Đồ khô/Nhu yếu phẩm)</option>
                    </select>
                  </div>

                  <button
                    onClick={() => handleCompletePacking(selectedOrder.id, selectedOrder.packageType || 'Thùng xốp bảo quản lạnh')}
                    className="btn btn-primary"
                    style={{ backgroundColor: '#008848', color: '#fff', fontWeight: 800, padding: '12px 24px', fontSize: '0.95rem' }}
                  >
                    🏷️ Hoàn Tất Đóng Gói & Dán Nhãn Bàn Giao
                  </button>
                </div>
              )}

              {activeTab === 'DISPATCH' && (
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--color-text)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Send size={18} color="#008848" /> Điều Phối & Phân Công Tài Xế Giao Hàng
                  </h3>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
                    <div>
                      <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--color-text-secondary)', marginBottom: 8 }}>
                        Chọn Tài Xế Giao Hàng Phù Hợp:
                      </h4>

                      {drivers.map(drv => (
                        <div
                          key={drv.id}
                          onClick={() => setSelectedDriver(drv)}
                          style={{
                            padding: 12,
                            borderRadius: 8,
                            border: selectedDriver?.id === drv.id ? '2px solid #008848' : '1px solid var(--color-border)',
                            backgroundColor: selectedDriver?.id === drv.id ? 'rgba(0, 136, 72, 0.05)' : 'var(--color-surface)',
                            marginBottom: 8,
                            cursor: 'pointer',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '0.9rem' }}>
                            <span>{drv.name} ({drv.phone})</span>
                            <span style={{ color: drv.status === 'AVAILABLE' ? '#16A34A' : '#D97706' }}>
                              {drv.status === 'AVAILABLE' ? '🟢 Sẵn sàng' : '🚚 Đang giao'}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: 4 }}>
                            Biển số: <strong>{drv.licensePlate}</strong> • Loại xe: <strong>{drv.vehicleType === 'REFRIGERATED' ? 'Xe Lạnh 0-4°C' : drv.vehicleType === 'FROZEN' ? 'Xe Đông Lạnh' : 'Xe Thường'}</strong>
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#008848', marginTop: 2 }}>
                            Nhiệt độ thùng xe hiện tại: {drv.currentTemp}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div style={{ backgroundColor: 'var(--color-bg)', padding: 14, borderRadius: 8 }}>
                      <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--color-text)', marginBottom: 8 }}>
                        Xác Nhận Phân Công & Bàn Giao
                      </h4>

                      {selectedDriver ? (
                        <div>
                          <div style={{ fontSize: '0.85rem', marginBottom: 6 }}>Tài xế chọn: <strong>{selectedDriver.name}</strong></div>
                          <div style={{ fontSize: '0.85rem', marginBottom: 6 }}>Biển số xe: <strong>{selectedDriver.licensePlate}</strong></div>
                          <div style={{ fontSize: '0.85rem', marginBottom: 12 }}>Đơn hàng bàn giao: <strong>#{selectedOrder.orderCode}</strong></div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <button
                              onClick={() => handleAssignDriver(selectedOrder.id, selectedDriver)}
                              className="btn btn-primary"
                              style={{ backgroundColor: '#008848', color: '#fff', fontWeight: 800, padding: 12 }}
                            >
                              🚚 Phân Công Tài Xế & Bắt Đầu Vận Chuyển
                            </button>

                            <button
                              onClick={() => setShowManifestModal(true)}
                              className="btn btn-secondary"
                              style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6 }}
                            >
                              <Printer size={16} /> In Phiếu Bàn Giao Hàng & Xuất Kho
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Vui lòng chọn tài xế bên trái</div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ background: 'var(--color-surface)', borderRadius: 12, padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
              Vui lòng chọn một đơn hàng bên trái để xem chi tiết và thực hiện thao tác.
            </div>
          )}
        </div>
      )}

      {/* TAB 4: FLEET MONITOR */}
      {activeTab === 'FLEET' && (
        <div style={{ background: 'var(--color-surface)', borderRadius: 12, padding: '1.5rem', border: '1px solid var(--color-border)' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--color-text)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Truck size={24} color="#008848" /> Giám Sát Đội Xe & Tài Xế Vận Chuyển Realtime
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            {drivers.map(drv => (
              <div key={drv.id} style={{ border: '1px solid var(--color-border)', borderRadius: 10, padding: 16, backgroundColor: 'var(--color-bg)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--color-text)' }}>{drv.name}</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, backgroundColor: drv.status === 'AVAILABLE' ? '#DCFCE7' : '#FEF3C7', color: drv.status === 'AVAILABLE' ? '#166534' : '#92400E', padding: '3px 8px', borderRadius: 12 }}>
                    {drv.status === 'AVAILABLE' ? 'SẴN SÀNG' : 'ĐANG GIAO HÀNG'}
                  </span>
                </div>

                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: 4 }}>
                  📱 Số điện thoại: <strong>{drv.phone}</strong>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: 4 }}>
                  🚘 Biển số xe: <strong>{drv.licensePlate}</strong>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: 4 }}>
                  🌡️ Cảm biến nhiệt thùng xe: <strong style={{ color: '#008848' }}>{drv.currentTemp}</strong>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                  📦 Số đơn phụ trách: <strong>{drv.assignedOrdersCount} đơn</strong>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PRINT MANIFEST MODAL */}
      {showManifestModal && selectedOrder && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <div style={{ backgroundColor: '#fff', width: 650, borderRadius: 12, padding: 24, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #008848', paddingBottom: 12, marginBottom: 16 }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#008848' }}>PHIẾU BÀN GIAO & XUẤT KHO THỰC PHẨM</h2>
                <div style={{ fontSize: '0.8rem', color: '#666' }}>Hệ thống kho thông minh CityMart (SFWMS)</div>
              </div>
              <button onClick={() => setShowManifestModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={24} color="#666" />
              </button>
            </div>

            <div style={{ fontSize: '0.85rem', marginBottom: 16, lineHeight: 1.6 }}>
              <div>Mã đơn hàng: <strong>#{selectedOrder.orderCode}</strong></div>
              <div>Khách hàng: <strong>{selectedOrder.customerName}</strong> ({selectedOrder.customerPhone})</div>
              <div>Địa chỉ giao: <strong>{selectedOrder.deliveryAddress}</strong></div>
              <div>Tài xế vận chuyển: <strong>{selectedOrder.assignedDriverName || 'Nguyễn Văn Hùng'}</strong> (SĐT: {selectedOrder.assignedDriverPhone || '0909 888 111'})</div>
              <div>Quy cách đóng gói: <strong>{selectedOrder.packageType || 'Thùng xốp bảo quản lạnh (0-4°C)'}</strong></div>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20, fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#F3F4F6', textTransform: 'uppercase', fontSize: '0.75rem' }}>
                  <th style={{ padding: 8, textAlign: 'left', border: '1px solid #E5E7EB' }}>Sản phẩm</th>
                  <th style={{ padding: 8, textAlign: 'center', border: '1px solid #E5E7EB' }}>Số lượng</th>
                  <th style={{ padding: 8, textAlign: 'left', border: '1px solid #E5E7EB' }}>Lô xuất kho (FEFO)</th>
                </tr>
              </thead>
              <tbody>
                {selectedOrder.items.map((it, i) => (
                  <tr key={i}>
                    <td style={{ padding: 8, border: '1px solid #E5E7EB', fontWeight: 600 }}>{it.productName}</td>
                    <td style={{ padding: 8, border: '1px solid #E5E7EB', textAlign: 'center' }}>{it.requestedQuantity} {it.unit}</td>
                    <td style={{ padding: 8, border: '1px solid #E5E7EB' }}>{it.suggestedLotCode}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 30, textAlign: 'center', fontSize: '0.85rem' }}>
              <div>
                <div style={{ fontWeight: 700 }}>Xác nhận Nhân viên Kho</div>
                <div style={{ height: 50 }}></div>
                <div style={{ color: '#888' }}>(Ký & ghi rõ họ tên)</div>
              </div>
              <div>
                <div style={{ fontWeight: 700 }}>Xác nhận Tài xế Giao hàng</div>
                <div style={{ height: 50 }}></div>
                <div style={{ color: '#888' }}>(Ký & ghi rõ họ tên)</div>
              </div>
            </div>

            <div style={{ marginTop: 24, textAlign: 'center' }}>
              <button
                onClick={() => {
                  window.print();
                  setShowManifestModal(false);
                }}
                className="btn btn-primary"
                style={{ backgroundColor: '#008848', color: '#fff', fontWeight: 800, padding: '10px 24px', display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <Printer size={18} /> In Phiếu Bàn Giao Ngay
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const kpiCardStyle = (bgColor: string, borderColor: string): React.CSSProperties => ({
  backgroundColor: bgColor,
  borderRadius: 12,
  padding: '1rem',
  borderLeft: `4px solid ${borderColor}`,
  boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
});

const tabButtonStyle = (isActive: boolean): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '10px 16px',
  fontWeight: isActive ? 800 : 600,
  fontSize: '0.875rem',
  color: isActive ? '#008848' : 'var(--color-text-secondary)',
  backgroundColor: isActive ? 'var(--color-surface)' : 'transparent',
  border: 'none',
  borderBottom: isActive ? '3px solid #008848' : '3px solid transparent',
  cursor: 'pointer',
  transition: 'all 0.2s',
});

const renderStatusBadge = (status: DispatchOrder['status']) => {
  switch (status) {
    case 'PENDING':
      return <span style={{ backgroundColor: '#DBEAFE', color: '#1E40AF', padding: '3px 8px', borderRadius: 12, fontSize: '0.75rem', fontWeight: 800 }}>Chờ tiếp nhận</span>;
    case 'PICKING':
      return <span style={{ backgroundColor: '#FFEDD5', color: '#C2410C', padding: '3px 8px', borderRadius: 12, fontSize: '0.75rem', fontWeight: 800 }}>Đang soạn FEFO</span>;
    case 'PACKED':
      return <span style={{ backgroundColor: '#DCFCE7', color: '#166534', padding: '3px 8px', borderRadius: 12, fontSize: '0.75rem', fontWeight: 800 }}>Đã đóng gói</span>;
    case 'READY_FOR_DELIVERY':
      return <span style={{ backgroundColor: '#F3E8FF', color: '#6B21A8', padding: '3px 8px', borderRadius: 12, fontSize: '0.75rem', fontWeight: 800 }}>Sẵn sàng giao</span>;
    case 'SHIPPED':
      return <span style={{ backgroundColor: '#CFFAFE', color: '#0E7490', padding: '3px 8px', borderRadius: 12, fontSize: '0.75rem', fontWeight: 800 }}>Đang giao hàng</span>;
    case 'CONFIRMED':
      return <span style={{ backgroundColor: '#D1FAE5', color: '#065F46', padding: '3px 8px', borderRadius: 12, fontSize: '0.75rem', fontWeight: 800 }}>Hoàn tất</span>;
    default:
      return null;
  }
};

export default WarehouseDispatch;
