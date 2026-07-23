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
  MessageSquare,
  Paperclip,
  CheckCheck,
  User as UserIcon,
  Phone,
  MapPin,
  Smile,
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

export interface ChatMessage {
  id: string;
  sender: 'CUSTOMER' | 'SALES_STAFF' | 'SYSTEM';
  text: string;
  timestamp: string;
}

export interface ChatConversation {
  id: string;
  customerName: string;
  customerPhone: string;
  customerType: string;
  orderCode: string;
  orderStatus: string;
  orderTotal: number;
  destination: string;
  unreadCount: number;
  isOnline: boolean;
  messages: ChatMessage[];
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
    id: 'THIT-002',
    sku: 'THIT-002',
    name: 'Thăn bò Úc nhập khẩu tươi',
    category: 'Thịt tươi',
    price: 185000,
    unit: '500g',
    stock: 85,
    zone: 'Kho Đông (-18°C)',
    expiryDaysLeft: 3,
    isFefoPriority: true,
  },
  {
    id: 'HAI-003',
    sku: 'HAI-003',
    name: 'Cá hồi Na Uy phi lê tươi',
    category: 'Hải sản',
    price: 245000,
    unit: '300g',
    stock: 40,
    zone: 'Kho Đông (-18°C)',
    expiryDaysLeft: 2,
    isFefoPriority: true,
  },
  {
    id: 'QUA-004',
    sku: 'QUA-004',
    name: 'Táo Envy Mỹ nhập khẩu',
    category: 'Trái cây',
    price: 89000,
    unit: 'Kg',
    stock: 150,
    zone: 'Kho Mát (4-8°C)',
    expiryDaysLeft: 12,
    isFefoPriority: false,
  },
];

const MOCK_SALES_ORDERS: SalesOrder[] = [
  {
    id: 'so-101',
    orderCode: 'ORD-884921',
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
];

const INITIAL_CONVERSATIONS: ChatConversation[] = [
  {
    id: 'conv-1',
    customerName: 'Khách hàng Test',
    customerPhone: '0909 888 999',
    customerType: 'Khách lẻ Web',
    orderCode: 'ORD-WEB-4921',
    orderStatus: 'PENDING',
    orderTotal: 102000,
    destination: '227 Nguyễn Văn Cừ, Phường 4, Quận 5, TP.HCM',
    unreadCount: 1,
    isOnline: true,
    messages: [
      { id: 'm1', sender: 'CUSTOMER', text: 'Chào shop, mình vừa đặt đơn hàng #ORD-WEB-4921, không biết khoảng bao lâu nữa giao tới Quận 5 vậy ạ?', timestamp: '10:15' },
      { id: 'm2', sender: 'SALES_STAFF', text: 'Dạ em chào anh Test! Đơn hàng của anh đã được ghi nhận trên hệ thống. Nhân viên kho đang tiến hành soạn hàng theo tiêu chuẩn FEFO và sẽ giao trong vòng 2h tới ạ!', timestamp: '10:16' },
      { id: 'm3', sender: 'CUSTOMER', text: 'Dạ cảm ơn shop, nhớ đóng gói cẩn thận hàng rau củ giúp mình nhé!', timestamp: '10:18' }
    ]
  },
  {
    id: 'conv-2',
    customerName: 'Chuỗi Nhà Hàng Biển Đông',
    customerPhone: '0903 111 222',
    customerType: 'Nhà hàng B2B',
    orderCode: 'ORD-884921',
    orderStatus: 'PICKING',
    orderTotal: 1334000,
    destination: '150 Trần Hưng Đạo, Quận 1, TP.HCM',
    unreadCount: 2,
    isOnline: true,
    messages: [
      { id: 'm201', sender: 'CUSTOMER', text: 'Bên em duyệt giúp anh chiết khấu 8% cho đơn hải sản hôm nay với nhé.', timestamp: '09:40' },
      { id: 'm202', sender: 'SALES_STAFF', text: 'Dạ anh, em đã áp mã chiết khấu B2B 8% và gửi đơn sang kho soạn FEFO rồi ạ!', timestamp: '09:45' },
      { id: 'm203', sender: 'CUSTOMER', text: 'OK em, chuyển sớm trước 11h30 để nhà hàng chuẩn bị bữa trưa nha.', timestamp: '09:50' }
    ]
  },
  {
    id: 'conv-3',
    customerName: 'Hệ Thống Minimart FreshMarket Q3',
    customerPhone: '0918 444 555',
    customerType: 'Siêu thị B2B',
    orderCode: 'ORD-884925',
    orderStatus: 'CONFIRMED',
    orderTotal: 2880000,
    destination: '88 Nguyễn Đình Chiểu, Quận 3, TP.HCM',
    unreadCount: 0,
    isOnline: false,
    messages: [
      { id: 'm301', sender: 'CUSTOMER', text: 'Shop ơi đợt thịt heo C.P đợt này HSD còn dài không?', timestamp: 'Hôm qua' },
      { id: 'm302', sender: 'SALES_STAFF', text: 'Dạ lô thịt heo C.P đợt này còn hạn trên 6 ngày, bảo quản kho lạnh 0-4°C đạt chuẩn CityMart ạ!', timestamp: 'Hôm qua' }
    ]
  }
];

export const SalesManagement = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'CREATE_ORDER' | 'ORDER_LIST' | 'FEFO_INSIGHTS' | 'CUSTOMERS' | 'LIVE_CHAT'>('LIVE_CHAT');
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [products, setProducts] = useState<ProductInventoryItem[]>(MOCK_SALES_PRODUCTS);
  const [customers] = useState<B2BCustomer[]>(MOCK_B2B_CUSTOMERS);

  // Form State for Order Entry
  const [selectedCustomer, setSelectedCustomer] = useState<B2BCustomer>(MOCK_B2B_CUSTOMERS[0]);
  const [cartItems, setCartItems] = useState<Array<{ product: ProductInventoryItem; quantity: number }>>([]);
  const [customDiscountRate, setCustomDiscountRate] = useState<number>(MOCK_B2B_CUSTOMERS[0].discountRate);
  const [orderNotes, setOrderNotes] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Live Chat State
  const [conversations, setConversations] = useState<ChatConversation[]>(INITIAL_CONVERSATIONS);
  const [selectedConvId, setSelectedConvId] = useState<string>('conv-1');
  const [chatInputText, setChatInputText] = useState('');

  useEffect(() => {
    fetchLiveOrders();
  }, []);

  const fetchLiveOrders = async () => {
    try {
      const res = await fetch(OUTBOUND_API);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          const mapped: SalesOrder[] = data.map((o: any) => ({
            id: o.id,
            orderCode: o.orderCode,
            customerName: o.requesterName || o.customerName || 'Khách hàng Web/App',
            customerPhone: o.customerPhone || '0909 888 999',
            customerType: o.orderCode?.includes('ORD-WEB') ? 'Khách lẻ Web' : 'Khách B2B',
            address: o.destination || '227 Nguyễn Văn Cừ, Q.5, TP.HCM',
            totalAmount: o.totalAmount || (o.items || []).reduce((acc: number, item: any) => acc + (item.price || 35000) * (item.requestedQuantity || 1), 0),
            discountAmount: 0,
            finalAmount: o.totalAmount || (o.items || []).reduce((acc: number, item: any) => acc + (item.price || 35000) * (item.requestedQuantity || 1), 0),
            status: o.status || 'PENDING',
            createdAt: new Date(o.createdAt).toISOString().replace('T', ' ').substring(0, 16),
            itemsCount: (o.items || []).length || 1,
            salesPerson: 'Hệ thống tự động'
          }));

          setSalesOrders(mapped);
        }
      }
    } catch (e) {
      console.error('Error fetching live sales orders:', e);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Chat Actions
  const activeConversation = conversations.find(c => c.id === selectedConvId) || conversations[0];

  const handleSendMessage = (customText?: string) => {
    const textToSend = customText || chatInputText;
    if (!textToSend.trim()) return;

    const timeNow = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'SALES_STAFF',
      text: textToSend,
      timestamp: timeNow
    };

    setConversations(prev =>
      prev.map(c => {
        if (c.id === selectedConvId) {
          return {
            ...c,
            messages: [...c.messages, newMsg],
            unreadCount: 0
          };
        }
        return c;
      })
    );

    if (!customText) setChatInputText('');
  };

  const handleQuickReply = (template: string) => {
    handleSendMessage(template);
  };

  const totalUnreadCount = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

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
            category: i.product.category,
            requestedQuantity: i.quantity,
            unit: i.product.unit,
            price: i.product.price,
          })),
        }),
      });
    } catch (e) {
      console.warn('Cannot reach outbound API:', e);
    }

    setSalesOrders([newSalesOrder, ...salesOrders]);
    showToast(`🎉 Tạo thành công Đơn Hàng Sales B2B #${newOrderCode}! Đã gửi yêu cầu sang Kho FEFO.`);
    setCartItems([]);
    setActiveTab('ORDER_LIST');
  };

  return (
    <div style={{ padding: '1.5rem', backgroundColor: 'var(--color-bg)', minHeight: '100vh' }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: 20,
            right: 20,
            zIndex: 9999,
            backgroundColor: '#1E293B',
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
            <TrendingUp size={28} color="#008848" /> Trung Tâm Quản Lý Kinh Doanh & Chat Hỗ Trợ Khách Hàng
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginTop: 4 }}>
            Giao tiếp trực tiếp với khách hàng mua sắm, theo dõi tiến độ đơn hàng kho FEFO và tư vấn bán hàng
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

      {/* Realtime Sales KPI Cards - Hide on Live Chat for cleaner UI */}
      {activeTab !== 'LIVE_CHAT' && (
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
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1E40AF' }}>TỔNG ĐƠN KHÁCH HÀNG</span>
              <ShoppingBag size={20} color="#2563EB" />
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, marginTop: 6, color: '#1E3A8A' }}>{totalOrdersCount} đơn</div>
            <div style={{ fontSize: '0.75rem', color: '#3B82F6', marginTop: 2 }}>Kết nối liên thông kho xuất hàng</div>
          </div>

          <div style={kpiCardStyle('#FEFCE8', '#CA8A04')}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#854D0E' }}>CHAT HỖ TRỢ TRỰC TUYẾN</span>
              <MessageSquare size={20} color="#CA8A04" />
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, marginTop: 6, color: '#713F12' }}>{totalUnreadCount} tin chưa đọc</div>
            <div style={{ fontSize: '0.75rem', color: '#D97706', marginTop: 2 }}>Hỗ trợ khách hàng siêu tốc</div>
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
      )}

      {/* Main Navigation Tabs */}
      <div style={{ display: 'flex', borderBottom: '2px solid #e2e8f0', marginBottom: '1.25rem', gap: 8, overflowX: 'auto' }}>
        <button onClick={() => setActiveTab('LIVE_CHAT')} style={tabButtonStyle(activeTab === 'LIVE_CHAT')}>
          <MessageSquare size={18} /> 💬 1. Chat Hỗ Trợ {totalUnreadCount > 0 && `(${totalUnreadCount})`}
        </button>
        <button onClick={() => setActiveTab('CREATE_ORDER')} style={tabButtonStyle(activeTab === 'CREATE_ORDER')}>
          <Plus size={18} /> 2. Tạo Đơn B2B
        </button>
        <button onClick={() => setActiveTab('ORDER_LIST')} style={tabButtonStyle(activeTab === 'ORDER_LIST')}>
          <FileText size={18} /> 3. Đơn Hàng ({salesOrders.length})
        </button>
        <button onClick={() => setActiveTab('FEFO_INSIGHTS')} style={tabButtonStyle(activeTab === 'FEFO_INSIGHTS')}>
          <Sparkles size={18} /> 4. Đẩy Hàng FEFO ({fefoItemsCount})
        </button>
        <button onClick={() => setActiveTab('CUSTOMERS')} style={tabButtonStyle(activeTab === 'CUSTOMERS')}>
          <Building2 size={18} /> 5. Khách Hàng B2B
        </button>
      </div>

      {/* TAB: LIVE CHAT SUPPORT */}
      {activeTab === 'LIVE_CHAT' && (
        <div style={{
          display: 'grid', gridTemplateColumns: '300px 1fr 320px', gap: '1rem',
          height: 'calc(100vh - 210px)', minHeight: '520px', backgroundColor: 'white', borderRadius: '16px',
          border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
        }}>
          {/* ZONE 1: CONVERSATION LIST SIDEBAR */}
          <div style={{ borderRight: '2px solid #e2e8f0', display: 'flex', flexDirection: 'column', backgroundColor: '#f8fafc' }}>
            <div style={{ padding: '0.85rem 1rem', borderBottom: '2px solid #cbd5e1', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', letterSpacing: '0.05em' }}>
                💬 DANH SÁCH KHÁCH HÀNG ({conversations.length})
              </span>
              <span style={{ fontSize: '0.7rem', backgroundColor: '#e2e8f0', color: '#334155', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>VÙNG 1</span>
            </div>

            <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #e2e8f0' }}>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="Tìm khách hàng, mã đơn..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%', padding: '8px 12px 8px 32px', borderRadius: '8px',
                    border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', backgroundColor: 'white'
                  }}
                />
                <Search size={16} color="#64748b" style={{ position: 'absolute', left: '10px', top: '10px' }} />
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
              {conversations
                .filter(c => c.customerName.toLowerCase().includes(searchQuery.toLowerCase()) || c.orderCode.toLowerCase().includes(searchQuery.toLowerCase()))
                .map(conv => {
                  const isSelected = selectedConvId === conv.id;
                  const lastMsg = conv.messages[conv.messages.length - 1];
                  return (
                    <div
                      key={conv.id}
                      onClick={() => {
                        setSelectedConvId(conv.id);
                        setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, unreadCount: 0 } : c));
                      }}
                      style={{
                        padding: '1rem', borderBottom: '1px solid #e2e8f0', cursor: 'pointer',
                        backgroundColor: isSelected ? '#ecfdf5' : 'white',
                        borderLeft: isSelected ? '4px solid #008848' : '4px solid transparent',
                        transition: 'background-color 0.2s'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1e293b' }}>{conv.customerName}</span>
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{lastMsg?.timestamp || 'Mới'}</span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontSize: '0.75rem', color: '#008848', fontWeight: 700, backgroundColor: '#dcfce7', padding: '2px 6px', borderRadius: '4px' }}>
                          #{conv.orderCode}
                        </span>
                        {conv.unreadCount > 0 && (
                          <span style={{ backgroundColor: '#ef4444', color: 'white', borderRadius: '10px', padding: '2px 6px', fontSize: '0.7rem', fontWeight: 800 }}>
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>

                      <div style={{
                        fontSize: '0.8rem', color: '#64748b', overflow: 'hidden',
                        textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                      }}>
                        {lastMsg?.text || 'Bắt đầu cuộc trò chuyện'}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* ACTIVE CHAT ROOM */}
          <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: '#ffffff' }}>
            {/* CHAT HEADER */}
            <div style={{
              padding: '1rem', borderBottom: '1px solid #e2e8f0', display: 'flex',
              justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ffffff'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#008848',
                  color: 'white', fontWeight: 800, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: '1.1rem'
                }}>
                  {activeConversation.customerName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '1rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {activeConversation.customerName}
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: activeConversation.isOnline ? '#10b981' : '#cbd5e1' }}></span>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 400 }}>
                      {activeConversation.isOnline ? 'Đang online' : 'Ngoại tuyến'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    SĐT: {activeConversation.customerPhone} • {activeConversation.customerType}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <span style={{ backgroundColor: '#f1f5f9', color: '#475569', padding: '6px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700 }}>
                  Đơn hàng #{activeConversation.orderCode}
                </span>
              </div>
            </div>

            {/* MESSAGES CONTAINER */}
            <div style={{ flex: 1, padding: '1.5rem', overflowY: 'auto', backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {activeConversation.messages.map(msg => {
                const isStaff = msg.sender === 'SALES_STAFF';
                const isSystem = msg.sender === 'SYSTEM';

                if (isSystem) {
                  return (
                    <div key={msg.id} style={{ textAlign: 'center', margin: '8px 0' }}>
                      <span style={{ backgroundColor: '#e0f2fe', color: '#0369a1', padding: '4px 12px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}>
                        {msg.text}
                      </span>
                    </div>
                  );
                }

                return (
                  <div
                    key={msg.id}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: isStaff ? 'flex-end' : 'flex-start',
                    }}
                  >
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '4px', padding: '0 4px' }}>
                      {isStaff ? 'Bạn (Sales Staff)' : activeConversation.customerName} • {msg.timestamp}
                    </div>
                    <div style={{
                      maxWidth: '75%',
                      padding: '12px 16px',
                      borderRadius: isStaff ? '16px 16px 2px 16px' : '16px 16px 16px 2px',
                      backgroundColor: isStaff ? '#008848' : '#ffffff',
                      color: isStaff ? 'white' : '#1e293b',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                      border: isStaff ? 'none' : '1px solid #e2e8f0',
                      lineHeight: '1.5',
                      fontSize: '0.92rem'
                    }}>
                      {msg.text}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* QUICK REPLY TEMPLATE CHIPS */}
            <div style={{ padding: '8px 12px', backgroundColor: '#ffffff', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '8px', overflowX: 'auto' }}>
              <button
                onClick={() => handleQuickReply(`Dạ chào anh/chị, đơn hàng #${activeConversation.orderCode} đã được duyệt và đang được kho soạn hàng FEFO nhé ạ!`)}
                style={{ backgroundColor: '#f0fdf4', color: '#008848', border: '1px solid #bbf7d0', padding: '6px 12px', borderRadius: '16px', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
              >
                🚀 Báo đang soạn kho FEFO
              </button>
              <button
                onClick={() => handleQuickReply('Sản phẩm CityMart cam kết 100% tươi sạch, vận chuyển bằng xe lạnh chuyên dụng ạ!')}
                style={{ backgroundColor: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', padding: '6px 12px', borderRadius: '16px', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
              >
                ❄️ Báo cam kết xe lạnh
              </button>
              <button
                onClick={() => handleQuickReply('Bên em hỗ trợ giao hàng siêu tốc trong 2h tới địa chỉ của mình nhé ạ.')}
                style={{ backgroundColor: '#fefce8', color: '#ca8a04', border: '1px solid #fef08a', padding: '6px 12px', borderRadius: '16px', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
              >
                ⚡ Báo giao siêu tốc 2H
              </button>
            </div>

            {/* INPUT BAR */}
            <div style={{ padding: '1rem', borderTop: '1px solid #e2e8f0', backgroundColor: '#ffffff', display: 'flex', gap: '10px', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="Nhập tin nhắn trả lời khách hàng..."
                value={chatInputText}
                onChange={e => setChatInputText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSendMessage(); }}
                style={{
                  flex: 1, padding: '12px 16px', borderRadius: '24px', border: '1px solid #cbd5e1',
                  fontSize: '0.9rem', outline: 'none'
                }}
              />
              <button
                onClick={() => handleSendMessage()}
                style={{
                  backgroundColor: '#008848', color: 'white', border: 'none',
                  width: '42px', height: '42px', borderRadius: '50%', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                }}
              >
                <Send size={18} />
              </button>
            </div>
          </div>

          {/* ZONE 3: CUSTOMER & ORDER DETAILS SIDEBAR */}
          <div style={{ borderLeft: '2px solid #e2e8f0', backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '0.85rem 1rem', borderBottom: '2px solid #bbf7d0', backgroundColor: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#065f46', letterSpacing: '0.05em' }}>
                📦 CHI TIẾT ĐƠN HÀNG
              </span>
              <span style={{ fontSize: '0.7rem', backgroundColor: '#dcfce7', color: '#166534', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>VÙNG 3</span>
            </div>

            <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem', overflowY: 'auto' }}>

            {/* ORDER STATUS CARD */}
            <div style={{ backgroundColor: 'white', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '4px' }}>Mã đơn hàng liên kết</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#008848', marginBottom: '8px' }}>
                #{activeConversation.orderCode}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                <span style={{ color: '#64748b' }}>Trạng thái:</span>
                {renderStatusBadge(activeConversation.orderStatus as any)}
              </div>
            </div>

            {/* CUSTOMER INFO CARD */}
            <div style={{ backgroundColor: 'white', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
              <div style={{ fontWeight: 700, color: '#1e293b', marginBottom: '4px' }}>Khách hàng</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#475569' }}>
                <UserIcon size={16} color="#008848" /> {activeConversation.customerName}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#475569' }}>
                <Phone size={16} color="#008848" /> {activeConversation.customerPhone}
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', color: '#475569' }}>
                <MapPin size={16} color="#008848" style={{ marginTop: '2px', flexShrink: 0 }} />
                <span>{activeConversation.destination}</span>
              </div>
            </div>

            {/* ORDER TOTAL CARD */}
            <div style={{ backgroundColor: 'white', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '4px' }}>Giá trị đơn hàng</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#10b981' }}>
                {activeConversation.orderTotal.toLocaleString('vi-VN')}đ
              </div>
            </div>

            {/* QUICK ORDER ACTIONS */}
            <button
              onClick={() => {
                showToast(`✅ Đã xác nhận duyệt đơn hàng #${activeConversation.orderCode} và chuyển yêu cầu soạn kho FEFO!`);
              }}
              style={{
                width: '100%', padding: '12px', borderRadius: '8px', border: 'none',
                backgroundColor: '#008848', color: 'white', fontWeight: 700,
                fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center',
                justifyContent: 'center', gap: '8px', marginTop: 'auto'
              }}
            >
              <CheckCheck size={18} /> Duyệt Đơn & Gửi Kho FEFO
            </button>
          </div>
        </div>
        </div>
      )}

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

                  <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--color-text)' }}>{prod.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: 2 }}>
                    Mã SKU: <strong>{prod.sku}</strong> | ĐVT: <strong>{prod.unit}</strong>
                  </div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#008848', marginTop: 6 }}>
                    {prod.price.toLocaleString('vi-VN')}đ / {prod.unit}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: 4 }}>
                    Tồn kho: <strong>{prod.stock} {prod.unit}</strong> ({prod.zone})
                  </div>

                  <button
                    onClick={() => handleAddItemToCart(prod)}
                    className="btn btn-primary"
                    style={{ width: '100%', marginTop: 10, backgroundColor: '#008848', color: '#fff', fontSize: '0.8rem', fontWeight: 700, padding: '6px' }}
                  >
                    + Thêm 5 {prod.unit}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Right Order Summary & Customer Details */}
          <div style={{ background: 'var(--color-surface)', borderRadius: 12, padding: '1.25rem', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--color-text)' }}>Thông Tin Khách Hàng & Đơn Hàng B2B</h3>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: 4 }}>Chọn Đối Tác B2B</label>
              <select
                value={selectedCustomer.id}
                onChange={e => {
                  const cust = customers.find(c => c.id === e.target.value);
                  if (cust) {
                    setSelectedCustomer(cust);
                    setCustomDiscountRate(cust.discountRate);
                  }
                }}
                style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid var(--color-border)' }}
              >
                {customers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.type} - Chiết khấu {c.discountRate}%)
                  </option>
                ))}
              </select>
            </div>

            {/* Cart Items List */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: 6 }}>
                Danh Sách Sản Phẩm Đã Chọn ({cartItems.length})
              </label>
              {cartItems.length === 0 ? (
                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', padding: '1rem', textAlign: 'center', border: '1px dashed var(--color-border)', borderRadius: 8 }}>
                  Chưa chọn sản phẩm nào vào đơn
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 220, overflowY: 'auto' }}>
                  {cartItems.map(item => (
                    <div key={item.product.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 8, backgroundColor: 'var(--color-bg)', borderRadius: 6, fontSize: '0.85rem' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700 }}>{item.product.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                          {item.product.price.toLocaleString('vi-VN')}đ x {item.quantity} {item.product.unit}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <button onClick={() => handleUpdateQty(item.product.id, -1)} style={qtyBtnStyle}>-</button>
                        <span style={{ fontWeight: 800 }}>{item.quantity}</span>
                        <button onClick={() => handleUpdateQty(item.product.id, 1)} style={qtyBtnStyle}>+</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Discount Adjustment */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: 4 }}>Chiết Khấu B2B Áp Dụng (%)</label>
              <input
                type="number"
                value={customDiscountRate}
                onChange={e => setCustomDiscountRate(Number(e.target.value))}
                style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid var(--color-border)' }}
              />
            </div>

            {/* Calculations */}
            <div style={{ borderTop: '1px dashed var(--color-border)', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Tổng giá trị hàng:</span>
                <span>{rawTotalAmount.toLocaleString('vi-VN')}đ</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#008848', fontWeight: 700 }}>
                <span>Chiết khấu ({customDiscountRate}%):</span>
                <span>-{calculatedDiscount.toLocaleString('vi-VN')}đ</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: '1.1rem', color: '#2563EB', marginTop: 4 }}>
                <span>THÀNH TIỀN:</span>
                <span>{finalOrderAmount.toLocaleString('vi-VN')}đ</span>
              </div>
            </div>

            <button
              onClick={handleCreateSalesOrder}
              className="btn btn-primary"
              style={{ width: '100%', backgroundColor: '#008848', color: '#fff', fontWeight: 900, padding: 12, fontSize: '0.95rem' }}
            >
              🚀 Duyệt & Gửi Đơn Sang Kho FEFO
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: ORDER LIST */}
      {activeTab === 'ORDER_LIST' && (
        <div style={{ background: 'var(--color-surface)', borderRadius: 12, padding: '1.25rem', border: '1px solid var(--color-border)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '1rem', color: 'var(--color-text)' }}>
            Danh Sách Đơn Hàng Bán & Khách Hàng (Kết Nối Liên Thông Kho)
          </h3>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--color-bg)', borderBottom: '2px solid var(--color-border)' }}>
                  <th style={{ padding: 10, textAlign: 'left' }}>Mã Đơn Hàng</th>
                  <th style={{ padding: 10, textAlign: 'left' }}>Khách Hàng</th>
                  <th style={{ padding: 10, textAlign: 'left' }}>Loại KH</th>
                  <th style={{ padding: 10, textAlign: 'left' }}>Tổng Số Tiền</th>
                  <th style={{ padding: 10, textAlign: 'left' }}>Trạng Thái Kho FEFO</th>
                  <th style={{ padding: 10, textAlign: 'left' }}>Thời Gian</th>
                </tr>
              </thead>
              <tbody>
                {salesOrders.map(order => (
                  <tr key={order.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: 10, fontWeight: 800, color: '#008848' }}>{order.orderCode}</td>
                    <td style={{ padding: 10 }}>
                      <div style={{ fontWeight: 700 }}>{order.customerName}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>SĐT: {order.customerPhone}</div>
                    </td>
                    <td style={{ padding: 10 }}>{order.customerType}</td>
                    <td style={{ padding: 10, fontWeight: 800, color: '#2563EB' }}>
                      {order.finalAmount.toLocaleString('vi-VN')}đ
                    </td>
                    <td style={{ padding: 10 }}>{renderStatusBadge(order.status)}</td>
                    <td style={{ padding: 10, color: 'var(--color-text-secondary)' }}>{order.createdAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: FEFO INSIGHTS */}
      {activeTab === 'FEFO_INSIGHTS' && (
        <div style={{ background: 'var(--color-surface)', borderRadius: 12, padding: '1.25rem', border: '1px solid var(--color-border)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '1rem', color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sparkles size={20} color="#F59E0B" /> Đề Xuất Đẩy Hàng Cận Ngày (FEFO Intelligence)
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
            {products.filter(p => p.isFefoPriority).map(p => (
              <div key={p.id} style={{ border: '2px solid #F59E0B', borderRadius: 10, padding: 14, backgroundColor: '#FEFCE8' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800 }}>
                  <span>{p.name}</span>
                  <span style={{ color: '#D97706', fontSize: '0.8rem' }}>⚠️ Cận ngày ({p.expiryDaysLeft} ngày nữa)</span>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: 4 }}>
                  SKU: <strong>{p.sku}</strong> | Tồn kho: <strong>{p.stock} {p.unit}</strong>
                </div>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#008848', marginTop: 6 }}>
                  Giá gốc: {p.price.toLocaleString('vi-VN')}đ
                </div>

                <button
                  onClick={() => {
                    handleAddItemToCart(p);
                    setActiveTab('CREATE_ORDER');
                    showToast(`🎯 Đã đưa ${p.name} vào đơn khuyến mãi B2B!`);
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
  padding: '8px 16px',
  fontWeight: isActive ? 800 : 600,
  fontSize: '0.85rem',
  color: isActive ? '#ffffff' : '#64748b',
  backgroundColor: isActive ? '#008848' : '#f1f5f9',
  border: 'none',
  borderRadius: '20px',
  cursor: 'pointer',
  transition: 'all 0.2s',
  whiteSpace: 'nowrap',
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
