import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  ShoppingBag,
  Plus,
  Search,
  Filter,
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Send,
  Zap,
  Tag,
  DollarSign,
  FileText,
  Building2,
  Calendar,
  Layers,
  ChevronRight,
  Sparkles,
  ArrowUpRight,
  Percent,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const OUTBOUND_API = 'http://localhost:3007/outbound-orders';
const PRODUCT_API = 'http://localhost:3010/products';

export interface B2BCustomer {
  id: string;
  code: string;
  name: string;
  type: 'Nhà hàng' | 'Siêu thị' | 'Đại lý sỉ' | 'Khách lẻ VIP';
  phone: string;
  email: string;
  address: string;
  discountRate: number; // % Chiết khấu
  creditLimit: number;
}

export interface ProductInventoryItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  price: number;
  unit: string;
  stock: number;
  zone: string;
  expiryDaysLeft?: number;
  isFefoPriority?: boolean;
}

export interface SalesOrder {
  id: string;
  orderCode: string;
  customerName: string;
  customerPhone: string;
  customerType: string;
  address: string;
  totalAmount: number;
  discountAmount: number;
  finalAmount: number;
  status: 'PENDING' | 'PICKING' | 'PACKED' | 'SHIPPED' | 'CONFIRMED' | 'CANCELLED';
  createdAt: string;
  itemsCount: number;
  salesPerson: string;
}

const MOCK_B2B_CUSTOMERS: B2BCustomer[] = [
  {
    id: 'cst-01',
    code: 'B2B-NH-001',
    name: 'Chuỗi Nhà Hàng Hải Sản Biển Đông',
    type: 'Nhà hàng',
    phone: '0903 111 222',
    email: 'purchasing@biendong.vn',
    address: '150 Trần Hưng Đạo, Quận 1, TP.HCM',
    discountRate: 8,
    creditLimit: 50000000,
  },
  {
    id: 'cst-02',
    code: 'B2B-ST-002',
    name: 'Hệ Thống Minimart FreshMarket Q3',
    type: 'Siêu thị',
    phone: '0918 444 555',
    email: 'contact@freshmarket.vn',
    address: '88 Nguyễn Đình Chiểu, Quận 3, TP.HCM',
    discountRate: 10,
    creditLimit: 100000000,
  },
  {
    id: 'cst-03',
    code: 'B2B-DL-003',
    name: 'Đại Lý Thực Phẩm Tươi Sống Nam Sài Gòn',
    type: 'Đại lý sỉ',
    phone: '0977 888 999',
    email: 'namsaigon@fooddist.com',
    address: '45 Nguyễn Hữu Thọ, Quận 7, TP.HCM',
    discountRate: 12,
    creditLimit: 150000000,
  },
];

const MOCK_SALES_PRODUCTS: ProductInventoryItem[] = [
  {
    id: 'RAU-001',
    sku: 'RAU-001',
    name: 'Cà chua VietGAP Đà Lạt',
    category: 'Rau củ quả',
    price: 18000,
    unit: '500g',
    stock: 240,
    zone: 'Kho Lạnh (0-4°C)',
    expiryDaysLeft: 6,
    isFefoPriority: false,
  },
  {
    id: 'THIT-003',
    sku: 'THIT-003',
    name: 'Thịt ba chỉ heo C.P tươi sạch',
    category: 'Thịt cá',
    price: 69000,
    unit: 'Khay 500g',
    stock: 85,
    zone: 'Kho Lạnh (0-4°C)',
    expiryDaysLeft: 3,
    isFefoPriority: true,
  },
  {
    id: 'HAISAN-004',
    sku: 'HAISAN-004',
    name: 'Cá hồi Na-uy phi lê tươi',
    category: 'Thịt cá',
    price: 155000,
    unit: 'Khay 300g',
    stock: 42,
    zone: 'Kho Lạnh (0-4°C)',
    expiryDaysLeft: 2,
    isFefoPriority: true,
  },
  {
    id: 'TOM-005',
    sku: 'TOM-005',
    name: 'Tôm thẻ chân trắng đông lạnh',
    category: 'Đông lạnh',
    price: 89000,
    unit: 'Hộp 500g',
    stock: 120,
    zone: 'Kho Đông (-18°C)',
    expiryDaysLeft: 120,
    isFefoPriority: false,
  },
  {
    id: 'SUA-006',
    sku: 'SUA-006',
    name: 'Sữa tươi tiệt trùng TH True Milk 1L',
    category: 'Sữa & đồ uống',
    price: 35000,
    unit: 'Hộp 1L',
    stock: 500,
    zone: 'Kho Khô',
    expiryDaysLeft: 90,
    isFefoPriority: false,
  },
];

const MOCK_SALES_ORDERS: SalesOrder[] = [
  {
    id: 'so-101',
    orderCode: 'ORD-884920',
    customerName: 'Chuỗi Nhà Hàng Hải Sản Biển Đông',
    customerPhone: '0903 111 222',
    customerType: 'Nhà hàng B2B',
    address: '150 Trần Hưng Đạo, Quận 1, TP.HCM',
    totalAmount: 1450000,
    discountAmount: 116000,
    finalAmount: 1334000,
    status: 'PICKING',
    createdAt: '2026-07-20 15:30',
    itemsCount: 4,
    salesPerson: 'Nguyễn Văn Tường (Sales)',
  },
  {
    id: 'so-102',
    orderCode: 'ORD-884925',
    customerName: 'Hệ Thống Minimart FreshMarket Q3',
    customerPhone: '0918 444 555',
    customerType: 'Siêu thị B2B',
    address: '88 Nguyễn Đình Chiểu, Quận 3, TP.HCM',
    totalAmount: 3200000,
    discountAmount: 320000,
    finalAmount: 2880000,
    status: 'PENDING',
    createdAt: '2026-07-20 16:10',
    itemsCount: 8,
    salesPerson: 'Nguyễn Văn Tường (Sales)',
  },
  {
    id: 'so-103',
    orderCode: 'ORD-884890',
    customerName: 'Đại Lý Thực Phẩm Tươi Sống Nam Sài Gòn',
    customerPhone: '0977 888 999',
    customerType: 'Đại lý sỉ',
    address: '45 Nguyễn Hữu Thọ, Quận 7, TP.HCM',
    totalAmount: 5800000,
    discountAmount: 696000,
    finalAmount: 5104000,
    status: 'CONFIRMED',
    createdAt: '2026-07-19 10:15',
    itemsCount: 12,
    salesPerson: 'Nguyễn Văn Tường (Sales)',
  },
];

export const SalesManagement = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'CREATE_ORDER' | 'ORDER_LIST' | 'FEFO_INSIGHTS' | 'CUSTOMERS'>('CREATE_ORDER');
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>(MOCK_SALES_ORDERS);
  const [products, setProducts] = useState<ProductInventoryItem[]>(MOCK_SALES_PRODUCTS);
  const [customers] = useState<B2BCustomer[]>(MOCK_B2B_CUSTOMERS);

  // Form State for Order Entry
  const [selectedCustomer, setSelectedCustomer] = useState<B2BCustomer>(MOCK_B2B_CUSTOMERS[0]);
  const [cartItems, setCartItems] = useState<Array<{ product: ProductInventoryItem; quantity: number }>>([
    { product: MOCK_SALES_PRODUCTS[1], quantity: 10 },
    { product: MOCK_SALES_PRODUCTS[2], quantity: 5 },
  ]);
  const [customDiscountRate, setCustomDiscountRate] = useState<number>(MOCK_B2B_CUSTOMERS[0].discountRate);
  const [orderNotes, setOrderNotes] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Calculations
  const rawTotalAmount = cartItems.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  const calculatedDiscount = (rawTotalAmount * customDiscountRate) / 100;
  const finalOrderAmount = rawTotalAmount - calculatedDiscount;

  const totalMonthlySales = 145800000;
  const totalOrdersCount = salesOrders.length;
  const fefoItemsCount = products.filter(p => p.isFefoPriority).length;

  const handleAddItemToCart = (prod: ProductInventoryItem) => {
    setCartItems(prev => {
      const existing = prev.find(i => i.product.id === prod.id);
      if (existing) {
        return prev.map(i => (i.product.id === prod.id ? { ...i, quantity: i.quantity + 5 } : i));
      }
      return [...prev, { product: prod, quantity: 5 }];
    });
  };

  const handleUpdateQty = (productId: string, delta: number) => {
    setCartItems(prev =>
      prev
        .map(i => {
          if (i.product.id === productId) {
            const newQty = i.quantity + delta;
            return newQty > 0 ? { ...i, quantity: newQty } : null;
          }
          return i;
        })
        .filter(Boolean) as Array<{ product: ProductInventoryItem; quantity: number }>
    );
  };

  const handleCreateSalesOrder = async () => {
    if (cartItems.length === 0) {
      alert('Vui lòng chọn ít nhất một sản phẩm vào đơn hàng kinh doanh!');
      return;
    }

    const newOrderCode = `ORD-${Math.floor(100000 + Math.random() * 900000)}`;
    const timeNow = new Date().toISOString().replace('T', ' ').substring(0, 16);

    const newSalesOrder: SalesOrder = {
      id: `so-${Date.now()}`,
      orderCode: newOrderCode,
      customerName: selectedCustomer.name,
      customerPhone: selectedCustomer.phone,
      customerType: selectedCustomer.type,
      address: selectedCustomer.address,
      totalAmount: rawTotalAmount,
      discountAmount: calculatedDiscount,
      finalAmount: finalOrderAmount,
      status: 'PENDING',
      createdAt: timeNow,
      itemsCount: cartItems.length,
      salesPerson: `${user?.name || 'Sales Staff'} (Sales)`,
    };

    // Try posting to Outbound API
    try {
      await fetch(OUTBOUND_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderCode: newOrderCode,
          customerName: selectedCustomer.name,
          customerPhone: selectedCustomer.phone,
          destination: selectedCustomer.address,
          totalAmount: finalOrderAmount,
          items: cartItems.map(i => ({
            sku: i.product.sku,
            productName: i.product.name,
            requestedQuantity: i.quantity,
            price: i.product.price,
          })),
        }),
      });
    } catch (err) {
      console.warn('Backend API connection warning:', err);
    }

    setSalesOrders(prev => [newSalesOrder, ...prev]);
    setCartItems([]);
    showToast(`🎉 Tạo đơn hàng Sales #${newOrderCode} thành công! Đã tự động gửi sang Kho soạn hàng FEFO.`);
    setActiveTab('ORDER_LIST');
  };

  return (
    <div className="sales-management-page" style={{ padding: '1.5rem', background: 'var(--color-bg)', minHeight: '100vh' }}>
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
            <TrendingUp size={28} color="#008848" /> Trung Tâm Quản Lý Kinh Doanh & Bán Hàng (Sales Hub)
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginTop: 4 }}>
            Tạo đơn bán hàng B2B / Khách sỉ, theo dõi tiến độ soạn kho FEFO và gợi ý ưu đãi thực phẩm tươi sống
          </p>
        </div>

        <button
          onClick={() => setActiveTab('CREATE_ORDER')}
          className="btn btn-primary"
          style={{ backgroundColor: '#008848', color: '#fff', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px' }}
        >
          <Plus size={18} /> Tạo Đơn Hàng B2B Nhanh
        </button>
      </div>

      {/* Realtime Sales KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={kpiCardStyle('#F0FDF4', '#16A34A')}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#166534' }}>DOANH SỐ THÁNG NÀY</span>
            <DollarSign size={20} color="#16A34A" />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, marginTop: 6, color: '#14532D' }}>
            {totalMonthlySales.toLocaleString('vi-VN')}đ
          </div>
          <div style={{ fontSize: '0.75rem', color: '#15803D', marginTop: 2 }}>Đạt 85% chỉ tiêu chỉ số KPI</div>
        </div>

        <div style={kpiCardStyle('#EFF6FF', '#2563EB')}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1E40AF' }}>TỔNG ĐƠN ĐÃ KHỞI TẠO</span>
            <ShoppingBag size={20} color="#2563EB" />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, marginTop: 6, color: '#1E3A8A' }}>{totalOrdersCount} đơn</div>
          <div style={{ fontSize: '0.75rem', color: '#3B82F6', marginTop: 2 }}>Kết nối liên thông kho xuất hàng</div>
        </div>

        <div style={kpiCardStyle('#FEFCE8', '#CA8A04')}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#854D0E' }}>CẦN ĐẨY BÁN GẤP (FEFO)</span>
            <Sparkles size={20} color="#CA8A04" />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, marginTop: 6, color: '#713F12' }}>{fefoItemsCount} mặt hàng</div>
          <div style={{ fontSize: '0.75rem', color: '#D97706', marginTop: 2 }}>Đề xuất chiết khấu thêm 5-15%</div>
        </div>

        <div style={kpiCardStyle('#F5F3FF', '#7C3AED')}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#5B21B6' }}>KHÁCH HÀNG B2B DỰ VỤ</span>
            <Building2 size={20} color="#7C3AED" />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, marginTop: 6, color: '#4C1D95' }}>{customers.length} đối tác</div>
          <div style={{ fontSize: '0.75rem', color: '#8B5CF6', marginTop: 2 }}>Chuỗi nhà hàng & Siêu thị sỉ</div>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div style={{ display: 'flex', borderBottom: '2px solid var(--color-border)', marginBottom: '1.5rem', gap: 8 }}>
        <button onClick={() => setActiveTab('CREATE_ORDER')} style={tabButtonStyle(activeTab === 'CREATE_ORDER')}>
          <Plus size={18} /> 1. Tạo Đơn Bán Hàng B2B
        </button>
        <button onClick={() => setActiveTab('ORDER_LIST')} style={tabButtonStyle(activeTab === 'ORDER_LIST')}>
          <FileText size={18} /> 2. Quản Lý Đơn Hàng Sales ({salesOrders.length})
        </button>
        <button onClick={() => setActiveTab('FEFO_INSIGHTS')} style={tabButtonStyle(activeTab === 'FEFO_INSIGHTS')}>
          <Sparkles size={18} /> 3. Đẩy Hàng Hạn Dùng FEFO ({fefoItemsCount})
        </button>
        <button onClick={() => setActiveTab('CUSTOMERS')} style={tabButtonStyle(activeTab === 'CUSTOMERS')}>
          <Building2 size={18} /> 4. Danh Sách Đối Tác B2B
        </button>
      </div>

      {/* TAB 1: CREATE SALES ORDER */}
      {activeTab === 'CREATE_ORDER' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 420px', gap: '1.5rem' }}>
          {/* Left Product Catalog Selector */}
          <div style={{ background: 'var(--color-surface)', borderRadius: 12, padding: '1.25rem', border: '1px solid var(--color-border)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '1rem', color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShoppingBag size={20} color="#008848" /> Chọn Thực Phẩm Từ Kho CityMart (Tồn Kho Thực Tế)
            </h3>

            {/* Product Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
              {products.map(prod => (
                <div
                  key={prod.id}
                  style={{
                    backgroundColor: 'var(--color-bg)',
                    borderRadius: 10,
                    padding: 12,
                    border: prod.isFefoPriority ? '2px solid #F59E0B' : '1px solid var(--color-border)',
                    position: 'relative',
                  }}
                >
                  {prod.isFefoPriority && (
                    <span style={{ position: 'absolute', top: 6, right: 6, backgroundColor: '#F59E0B', color: '#fff', fontSize: '0.65rem', fontWeight: 800, padding: '2px 6px', borderRadius: 4 }}>
                      ⚡ Ưu tiên FEFO
                    </span>
                  )}
                  <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--color-text)', marginBottom: 2 }}>
                    {prod.name}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginBottom: 4 }}>
                    Quy cách: <strong>{prod.unit}</strong> • Kho: <strong>{prod.zone}</strong>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#008848', fontWeight: 700, marginBottom: 8 }}>
                    Tồn kho khả dụng: <strong>{prod.stock} {prod.unit}</strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '1rem', fontWeight: 900, color: '#E53935' }}>
                      {prod.price.toLocaleString('vi-VN')}đ
                    </span>
                    <button
                      onClick={() => handleAddItemToCart(prod)}
                      className="btn btn-secondary"
                      style={{ padding: '4px 10px', fontSize: '0.8rem', fontWeight: 800, backgroundColor: '#008848', color: '#fff' }}
                    >
                      + Chọn bán
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Order Summary & B2B Customer Selection */}
          <div style={{ background: 'var(--color-surface)', borderRadius: 12, padding: '1.25rem', border: '1px solid var(--color-border)', height: 'fit-content' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '1rem', color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <FileText size={20} color="#008848" /> Thông Tin Đơn Hàng Sales
            </h3>

            {/* B2B Customer Picker */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, display: 'block', marginBottom: 4 }}>Khách Hàng Đối Tác B2B:</label>
              <select
                className="input"
                value={selectedCustomer.id}
                onChange={e => {
                  const target = customers.find(c => c.id === e.target.value);
                  if (target) {
                    setSelectedCustomer(target);
                    setCustomDiscountRate(target.discountRate);
                  }
                }}
                style={{ width: '100%', padding: '10px', fontWeight: 700 }}
              >
                {customers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.type} - Chiết khấu {c.discountRate}%)
                  </option>
                ))}
              </select>
            </div>

            {/* Selected Items Table */}
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, marginBottom: 8 }}>Mặt hàng đã chọn ({cartItems.length}):</div>
              {cartItems.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--color-text-muted)', fontSize: '0.85rem', backgroundColor: 'var(--color-bg)', borderRadius: 8 }}>
                  Chưa có sản phẩm nào. Bấm nút "+ Chọn bán" bên trái.
                </div>
              ) : (
                cartItems.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--color-border)' }}>
                    <div style={{ flex: 1, paddingRight: 8 }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text)' }}>{item.product.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{item.product.price.toLocaleString('vi-VN')}đ / {item.product.unit}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <button onClick={() => handleUpdateQty(item.product.id, -5)} style={qtyBtnStyle}>-</button>
                      <span style={{ fontSize: '0.85rem', fontWeight: 800, width: 24, textAlign: 'center' }}>{item.quantity}</span>
                      <button onClick={() => handleUpdateQty(item.product.id, 5)} style={qtyBtnStyle}>+</button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Discount Rate Input */}
            <div style={{ backgroundColor: 'var(--color-bg)', padding: 12, borderRadius: 8, marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>Tỷ lệ chiết khấu B2B:</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <input
                    type="number"
                    value={customDiscountRate}
                    onChange={e => setCustomDiscountRate(Number(e.target.value))}
                    className="input"
                    style={{ width: 60, padding: 4, textAlign: 'center', fontWeight: 800 }}
                  />
                  <Percent size={14} />
                </div>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Tạm tính: {rawTotalAmount.toLocaleString('vi-VN')}đ</div>
              <div style={{ fontSize: '0.75rem', color: '#E53935', fontWeight: 700 }}>Giảm trừ chiết khấu: -{calculatedDiscount.toLocaleString('vi-VN')}đ</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#008848', marginTop: 6, borderTop: '1px solid var(--color-border)', paddingTop: 6 }}>
                Tổng thanh toán: {finalOrderAmount.toLocaleString('vi-VN')}đ
              </div>
            </div>

            <button
              onClick={handleCreateSalesOrder}
              className="btn btn-primary"
              style={{ width: '100%', backgroundColor: '#008848', color: '#fff', fontWeight: 800, padding: 12, fontSize: '0.95rem' }}
            >
              🚀 Tạo Đơn & Gửi Sang Kho Soạn Hàng FEFO
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: SALES ORDER LIST */}
      {activeTab === 'ORDER_LIST' && (
        <div style={{ background: 'var(--color-surface)', borderRadius: 12, padding: '1.25rem', border: '1px solid var(--color-border)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '1rem', color: 'var(--color-text)' }}>
            Danh Sách Đơn Hàng Do Nhân Viên Sales Quản Lý
          </h3>

          <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--color-bg)', textAlign: 'left', fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                <th style={{ padding: 10 }}>Mã đơn</th>
                <th style={{ padding: 10 }}>Khách hàng B2B</th>
                <th style={{ padding: 10 }}>Loại đối tác</th>
                <th style={{ padding: 10 }}>Ngày tạo</th>
                <th style={{ padding: 10 }}>Số món</th>
                <th style={{ padding: 10 }}>Tổng tiền</th>
                <th style={{ padding: 10 }}>Trạng thái Kho & Giao</th>
              </tr>
            </thead>
            <tbody>
              {salesOrders.map(so => (
                <tr key={so.id} style={{ borderBottom: '1px solid var(--color-border)', fontSize: '0.85rem' }}>
                  <td style={{ padding: 10, fontWeight: 800, color: '#008848' }}>#{so.orderCode}</td>
                  <td style={{ padding: 10, fontWeight: 700 }}>
                    {so.customerName}
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{so.customerPhone}</div>
                  </td>
                  <td style={{ padding: 10 }}>
                    <span style={{ backgroundColor: '#EFF6FF', color: '#1D4ED8', padding: '2px 8px', borderRadius: 12, fontSize: '0.75rem', fontWeight: 700 }}>
                      {so.customerType}
                    </span>
                  </td>
                  <td style={{ padding: 10, color: 'var(--color-text-secondary)' }}>{so.createdAt}</td>
                  <td style={{ padding: 10, fontWeight: 700 }}>{so.itemsCount} mặt hàng</td>
                  <td style={{ padding: 10, fontWeight: 900, color: '#E53935' }}>{so.finalAmount.toLocaleString('vi-VN')}đ</td>
                  <td style={{ padding: 10 }}>{renderStatusBadge(so.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 3: FEFO INSIGHTS */}
      {activeTab === 'FEFO_INSIGHTS' && (
        <div style={{ background: 'var(--color-surface)', borderRadius: 12, padding: '1.25rem', border: '1px solid var(--color-border)' }}>
          <div style={{ backgroundColor: '#FEFCE8', border: '1px solid #FEF08A', padding: 14, borderRadius: 8, marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#854D0E', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Sparkles size={20} color="#D97706" /> AI Đề Xuất Đẩy Hàng FEFO (Thực Phẩm Hạn Dùng Ngắn)
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#B45309', marginTop: 4 }}>
              Các lô hàng dưới đây cần được Nhân viên Sale ưu tiên chào bán cho đối tác B2B kèm mức giảm giá đặc biệt để tránh hao hụt kho.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
            {products.filter(p => p.isFefoPriority).map(p => (
              <div key={p.id} style={{ border: '1px solid #F59E0B', borderRadius: 10, padding: 14, backgroundColor: '#FFFBEB' }}>
                <div style={{ fontWeight: 800, fontSize: '1rem', color: '#78350F' }}>{p.name}</div>
                <div style={{ fontSize: '0.8rem', color: '#92400E', marginTop: 2 }}>Vị trí: <strong>{p.zone}</strong></div>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#E53935', marginTop: 6 }}>
                  Hạn sử dụng còn: {p.expiryDaysLeft} ngày!
                </div>
                <div style={{ fontSize: '0.8rem', color: '#B45309', marginTop: 4 }}>
                  Tồn kho cần bán nhanh: <strong>{p.stock} {p.unit}</strong>
                </div>

                <button
                  onClick={() => {
                    handleAddItemToCart(p);
                    setActiveTab('CREATE_ORDER');
                  }}
                  className="btn btn-primary"
                  style={{ width: '100%', marginTop: 12, backgroundColor: '#D97706', color: '#fff', fontWeight: 800 }}
                >
                  🎯 Đưa Vào Đơn Khuyến Mãi B2B
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: B2B CUSTOMERS */}
      {activeTab === 'CUSTOMERS' && (
        <div style={{ background: 'var(--color-surface)', borderRadius: 12, padding: '1.25rem', border: '1px solid var(--color-border)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '1rem', color: 'var(--color-text)' }}>
            Danh Sách Đối Tác B2B & Khách Hàng Sỉ
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
            {customers.map(c => (
              <div key={c.id} style={{ border: '1px solid var(--color-border)', borderRadius: 10, padding: 14, backgroundColor: 'var(--color-bg)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '0.95rem' }}>
                  <span>{c.name}</span>
                  <span style={{ color: '#008848' }}>-{c.discountRate}%</span>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: 4 }}>Mã KH: <strong>{c.code}</strong> • Phân loại: <strong>{c.type}</strong></div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: 2 }}>📱 SĐT: {c.phone} | ✉️ {c.email}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: 2 }}>📍 Địa chỉ: {c.address}</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#2563EB', marginTop: 6 }}>
                  Hạn mức tín dụng B2B: {c.creditLimit.toLocaleString('vi-VN')}đ
                </div>
              </div>
            ))}
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

const qtyBtnStyle: React.CSSProperties = {
  width: 24,
  height: 24,
  borderRadius: 4,
  border: '1px solid var(--color-border)',
  backgroundColor: 'var(--color-surface)',
  fontWeight: 800,
  cursor: 'pointer',
};

const renderStatusBadge = (status: SalesOrder['status']) => {
  switch (status) {
    case 'PENDING':
      return <span style={{ backgroundColor: '#DBEAFE', color: '#1E40AF', padding: '3px 8px', borderRadius: 12, fontSize: '0.75rem', fontWeight: 800 }}>Chờ kho nhận</span>;
    case 'PICKING':
      return <span style={{ backgroundColor: '#FFEDD5', color: '#C2410C', padding: '3px 8px', borderRadius: 12, fontSize: '0.75rem', fontWeight: 800 }}>Kho đang soạn FEFO</span>;
    case 'PACKED':
      return <span style={{ backgroundColor: '#DCFCE7', color: '#166534', padding: '3px 8px', borderRadius: 12, fontSize: '0.75rem', fontWeight: 800 }}>Đã đóng gói</span>;
    case 'SHIPPED':
      return <span style={{ backgroundColor: '#CFFAFE', color: '#0E7490', padding: '3px 8px', borderRadius: 12, fontSize: '0.75rem', fontWeight: 800 }}>Đang giao hàng</span>;
    case 'CONFIRMED':
      return <span style={{ backgroundColor: '#D1FAE5', color: '#065F46', padding: '3px 8px', borderRadius: 12, fontSize: '0.75rem', fontWeight: 800 }}>Hoàn tất</span>;
    default:
      return null;
  }
};

export default SalesManagement;
