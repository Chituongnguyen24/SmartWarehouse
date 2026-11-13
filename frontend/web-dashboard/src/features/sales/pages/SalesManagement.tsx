import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
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
  ArrowUpRight,
  Percent,
  MessageSquare,
  Paperclip,
  CheckCheck,
  User as UserIcon,
  Phone,
  MapPin,
  Smile,
  Bot,
  Headset,
  RefreshCw,
  X,
  Eye,
  Trash2,
} from 'lucide-react';
import { useAuth } from '@/features/auth';
import {
  B2BCustomersPanel,
  CreateB2BCustomerModal,
  FefoClearancePanel,
  CreateB2BOrderPanel,
  B2BOrderDetailModal,
} from '../index';
import type { B2BCustomer, OrderCartItem } from '../index';

const OUTBOUND_API = 'http://localhost:3007/outbound-orders';
const PRODUCT_API = 'http://localhost:3010/products';

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
  sender: 'CUSTOMER' | 'SALES_STAFF' | 'STAFF' | 'AI_BOT' | 'SYSTEM' | string;
  senderName?: string;
  text: string;
  timestamp?: string;
  imageUrl?: string | null;
  productCard?: any;
  quickOptions?: string[];
}

export interface ChatConversation {
  id: string;
  customerName: string;
  customerPhone: string;
  customerType?: string;
  status?: 'AI_ACTIVE' | 'WAITING_FOR_STAFF' | 'STAFF_CONNECTED' | 'RESOLVED' | string;
  assignedStaffId?: string | null;
  assignedStaffName?: string | null;
  aiSummary?: string;
  orderCode?: string;
  orderStatus?: string;
  orderTotal?: number;
  destination?: string;
  unreadCount: number;
  isOnline?: boolean;
  lastMessage?: string;
  lastMessageAt?: string;
  messages: ChatMessage[];
}





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
      { id: 'm2', sender: 'SALES_STAFF', text: 'Dạ em chào anh Test! Đơn hàng của anh đã được ghi nhận trên hệ thống. Nhân viên kho đang tiến hành soạn hàng và sẽ giao trong vòng 2h tới ạ!', timestamp: '10:16' },
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
      { id: 'm202', sender: 'SALES_STAFF', text: 'Dạ anh, em đã áp mã chiết khấu B2B 8% và gửi đơn sang kho chuẩn bị hàng rồi ạ!', timestamp: '09:45' },
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
  const { user, token } = useAuth();
  const [activeTab, setActiveTab] = useState<'CREATE_ORDER' | 'ORDER_LIST' | 'FEFO_INSIGHTS' | 'CUSTOMERS' | 'LIVE_CHAT'>('LIVE_CHAT');
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [products, setProducts] = useState<ProductInventoryItem[]>([]);
  const [customers, setCustomers] = useState<B2BCustomer[]>([]);

  // Form State for Order Entry
  const [selectedCustomer, setSelectedCustomer] = useState<B2BCustomer | null>(null);
  const [cartItems, setCartItems] = useState<OrderCartItem[]>([]);
  const [fefoLotsCount, setFefoLotsCount] = useState<number>(0);
  const [selectedOrderDetail, setSelectedOrderDetail] = useState<any | null>(null);
  const [orderSearchQuery, setOrderSearchQuery] = useState<string>('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('ALL');
  const [customDiscountRate, setCustomDiscountRate] = useState<number>(0);
  const [orderNotes, setOrderNotes] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Live Chat State & Realtime
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [conversations, setConversations] = useState<ChatConversation[]>(INITIAL_CONVERSATIONS);
  const [selectedConvId, setSelectedConvId] = useState<string>('conv-1');
  const [chatInputText, setChatInputText] = useState('');
  const [selectedMediaPreview, setSelectedMediaPreview] = useState<{ url: string; file: File; isVideo: boolean } | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<ChatConversation | null>(null);
  const [isDeletingSession, setIsDeletingSession] = useState(false);

  // Fetch products from API
  const fetchProducts = async () => {
    try {
      const res = await fetch(PRODUCT_API);
      if (res.ok) {
        const data = await res.json();
        const productsList = Array.isArray(data) ? data : (data.items || data.data || []);
        const mapped: ProductInventoryItem[] = productsList.map((p: any) => ({
          id: p.id,
          sku: p.sku,
          name: p.name,
          category: p.category?.name || p.categoryName || 'Thực phẩm',
          price: p.price || 0,
          unit: p.unit || 'Kg',
          stock: p.stock ?? p.quantity ?? 0,
          zone: p.storageZone || 'Kho Lạnh',
          expiryDaysLeft: p.expiryDaysLeft,
          isFefoPriority: p.expiryDaysLeft !== undefined && p.expiryDaysLeft <= 3,
        }));
        setProducts(mapped);
      }
    } catch (err) {
      console.error('Error fetching products:', err);
    }
  };

  // Fetch real B2B enterprise customers from user-service (:3012)
  const fetchCustomers = async () => {
    try {
      if (!token) return;
      const res = await fetch('http://localhost:3012/users/b2b-customers', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const usersList = Array.isArray(data) ? data : (data.items || data.data || []);
        const mapped: B2BCustomer[] = usersList.map((u: any) => ({
          id: u.id,
          code: u.code || `B2B-${u.id.substring(0, 4)}`,
          name: u.name,
          companyName: u.companyName || u.name,
          type: u.b2bType || 'DAILY',
          phone: u.phone || '',
          email: u.email || '',
          taxCode: u.taxCode || '',
          address: u.billingAddress || (u.addresses && u.addresses[0]?.address) || 'Hồ Chí Minh',
          billingAddress: u.billingAddress || '',
          discountRate: u.discountRate !== undefined ? Number(u.discountRate) : 5,
          creditLimit: u.creditLimit ? Number(u.creditLimit) : 50000000,
          debtBalance: u.debtBalance ? Number(u.debtBalance) : 0,
        }));
        setCustomers(mapped);
        if (mapped.length > 0 && !selectedCustomer) {
          setSelectedCustomer(mapped[0]);
          setCustomDiscountRate(mapped[0].discountRate);
        }
      }
    } catch (err) {
      console.error('Error fetching B2B customers:', err);
    }
  };

  const fetchFefoLotsCount = async () => {
    try {
      const res = await fetch('http://localhost:3011/inventory/expiry-alert?days=45');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setFefoLotsCount(data.length);
        }
      }
    } catch (e) {
      console.error('Error fetching FEFO count:', e);
    }
  };

  useEffect(() => {
    fetchLiveOrders();
    fetchProducts();
    fetchCustomers();
    fetchFefoLotsCount();
  }, [token]);

  const fetchLiveOrders = async () => {
    try {
      const queryParams = user?.role === 'WAREHOUSE_MANAGER' && user?.warehouseCode 
        ? `?warehouseCode=${user.warehouseCode}` 
        : '';
      const res = await fetch(`${OUTBOUND_API}${queryParams}`);
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

  // Realtime Live Chat Socket & Sessions Fetch
  const fetchLiveChatSessions = async () => {
    try {
      const res = await fetch('http://localhost:3004/chat/sessions');
      if (res.ok) {
        const data = await res.json();
        const sessionsList: any[] = Array.isArray(data) ? data : (data.sessions || []);
        if (sessionsList.length > 0) {
          const mapped: ChatConversation[] = sessionsList.map((s: any) => {
            const msgs: ChatMessage[] = (s.messages || []).map((m: any) => ({
              id: m.id,
              sender: m.sender,
              senderName: m.senderName,
              text: m.text || '',
              timestamp: m.createdAt ? new Date(m.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : 'Vừa xong',
              imageUrl: m.imageUrl || null,
              productCard: m.productCard || null,
              quickOptions: m.quickOptions || null,
            }));
            return {
              id: s.id,
              customerName: s.customerName || 'Khách hàng',
              customerPhone: s.customerPhone || '',
              customerType: 'Khách lẻ Web',
              status: s.status || 'AI_ACTIVE',
              assignedStaffId: s.assignedStaffId,
              assignedStaffName: s.assignedStaffName,
              aiSummary: s.aiSummary,
              orderCode: s.id.slice(0, 8).toUpperCase(),
              orderStatus: 'PENDING',
              orderTotal: 0,
              destination: 'TP. Hồ Chí Minh',
              unreadCount: s.status === 'WAITING_FOR_STAFF' ? (s.unreadCount || 1) : 0,
              isOnline: true,
              lastMessage: s.lastMessage || (msgs[msgs.length - 1]?.text ?? ''),
              lastMessageAt: s.lastMessageAt || s.updatedAt,
              messages: msgs,
            };
          });
          setConversations(mapped);
          setSelectedConvId(prev => {
            if (prev && mapped.some(c => c.id === prev)) return prev;
            return mapped[0]?.id || '';
          });
        }
      }
    } catch (err) {
      console.error('Error fetching live chat sessions:', err);
    }
  };

  useEffect(() => {
    fetchLiveChatSessions();

    const socket = io('http://localhost:3004', {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
    });
    socketRef.current = socket;

    socket.on('customer_chat_message', () => {
      fetchLiveChatSessions();
    });

    socket.on('staff_chat_incoming', () => {
      fetchLiveChatSessions();
    });

    socket.on('bot_chat_reply', (data: any) => {
      if (!data?.sessionId) return;
      const timeNow = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      const newMsg: ChatMessage = {
        id: data.message?.id || `bot-${Date.now()}`,
        sender: 'AI_BOT',
        senderName: 'Trợ lý AI C.T Mart',
        text: data.text || data.message?.text || '',
        timestamp: timeNow,
        productCard: data.productCard || data.message?.productCard,
        quickOptions: data.quickOptions || data.message?.quickOptions,
      };

      setConversations(prev =>
        prev.map(c => {
          if (c.id === data.sessionId) {
            return {
              ...c,
              lastMessage: newMsg.text,
              messages: [...c.messages, newMsg],
            };
          }
          return c;
        })
      );
    });

    socket.on('staff_chat_reply', (data: any) => {
      if (!data?.sessionId) return;
      const timeNow = data.time || new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      const newMsg: ChatMessage = {
        id: data.message?.id || `staff-${Date.now()}`,
        sender: 'STAFF',
        senderName: data.staffName || 'Bạn (Tư vấn viên)',
        text: data.text || data.message?.text || '',
        imageUrl: data.imageUrl || data.message?.imageUrl,
        timestamp: timeNow,
      };

      setConversations(prev =>
        prev.map(c => {
          if (c.id === data.sessionId) {
            const exists = c.messages.some(m => m.id === newMsg.id || (m.text === newMsg.text && m.sender === 'STAFF'));
            return {
              ...c,
              status: 'STAFF_CONNECTED',
              lastMessage: newMsg.text,
              messages: exists ? c.messages : [...c.messages, newMsg],
            };
          }
          return c;
        })
      );
    });

    socket.on('staff_handoff_alert', () => {
      fetchLiveChatSessions();
    });

    socket.on('staff_connected', () => {
      fetchLiveChatSessions();
    });

    socket.on('chat_session_updated', (session: any) => {
      setConversations(prev =>
        prev.map(c => {
          if (c.id === session.id) {
            return {
              ...c,
              status: session.status || c.status,
              assignedStaffId: session.assignedStaffId ?? c.assignedStaffId,
              assignedStaffName: session.assignedStaffName ?? c.assignedStaffName,
              lastMessage: session.lastMessage ?? c.lastMessage,
            };
          }
          return c;
        })
      );
    });

    socket.on('hand_back_to_ai', () => {
      fetchLiveChatSessions();
    });

    socket.on('chat_session_deleted', (data: any) => {
      if (!data?.sessionId) return;
      setConversations(prev => prev.filter(c => c.id !== data.sessionId));
      setSelectedConvId(prev => (prev === data.sessionId ? '' : prev));
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Tự động cuộn xuống cuối khi có tin nhắn mới
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversations, selectedConvId]);

  // Tiếp nhận phiên chat (Takeover)
  const handleTakeOverSession = async (sessionId: string) => {
    const staffId = user?.id || 'staff-1';
    const staffName = user?.name || 'Nguyễn Chi Tường (Saler)';
    try {
      if (socketRef.current) {
        socketRef.current.emit('staff_takeover_session', { sessionId, staffId, staffName });
      }
      await fetch(`http://localhost:3004/chat/sessions/${sessionId}/takeover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staffId, staffName }),
      });
      setConversations(prev =>
        prev.map(c =>
          c.id === sessionId
            ? { ...c, status: 'STAFF_CONNECTED', assignedStaffId: staffId, assignedStaffName: staffName, unreadCount: 0 }
            : c
        )
      );
      showToast('Đã tiếp nhận phiên chat. AI Gemini đã được tắt để bạn trực tiếp hỗ trợ khách hàng!');
    } catch (err) {
      console.error('Lỗi tiếp nhận phiên:', err);
    }
  };

  // Bàn giao lại quyền cho AI (Không xoá khỏi danh sách để Saler vẫn theo dõi được)
  const handleHandBackToAi = async (sessionId: string) => {
    try {
      if (socketRef.current) {
        socketRef.current.emit('hand_back_to_ai', { sessionId });
      }
      await fetch(`http://localhost:3004/chat/sessions/${sessionId}/handback`, {
        method: 'POST',
      });
      setConversations(prev =>
        prev.map(c =>
          c.id === sessionId
            ? { ...c, status: 'AI_ACTIVE' }
            : c
        )
      );
      showToast('Đã chuyển quyền hỗ trợ cho Trợ lý AI C.T Mart. Bạn vẫn có thể theo dõi cuộc trò chuyện!');
    } catch (err) {
      console.error('Lỗi bàn giao lại cho AI:', err);
    }
  };

  // Xóa vĩnh viễn cuộc trò chuyện để giải phóng dung lượng bộ nhớ
  const handleConfirmDeleteSession = async () => {
    if (!sessionToDelete) return;
    const sessionId = sessionToDelete.id;
    try {
      setIsDeletingSession(true);
      if (socketRef.current) {
        socketRef.current.emit('delete_chat_session', { sessionId });
      }
      await fetch(`http://localhost:3004/chat/sessions/${sessionId}`, {
        method: 'DELETE',
      });

      setConversations(prev => {
        const remaining = prev.filter(c => c.id !== sessionId);
        if (selectedConvId === sessionId) {
          setSelectedConvId(remaining[0]?.id || '');
        }
        return remaining;
      });

      showToast(`Đã xóa vĩnh viễn cuộc trò chuyện của "${sessionToDelete.customerName}" và giải phóng bộ nhớ.`);
      setSessionToDelete(null);
    } catch (err) {
      console.error('Lỗi khi xóa phiên chat:', err);
      showToast('Có lỗi xảy ra khi xóa cuộc trò chuyện. Vui lòng thử lại.');
    } finally {
      setIsDeletingSession(false);
    }
  };

  // Nén ảnh trên trình duyệt trước khi upload
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxDim = 1280;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) return resolve(e.target?.result as string);
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
          resolve(dataUrl);
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleSelectFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isVideo = file.type.startsWith('video/');
    if (isVideo) {
      const reader = new FileReader();
      reader.onload = () => {
        setSelectedMediaPreview({ url: reader.result as string, file, isVideo: true });
      };
      reader.readAsDataURL(file);
    } else {
      try {
        const compressed = await compressImage(file);
        setSelectedMediaPreview({ url: compressed, file, isVideo: false });
      } catch (err) {
        console.error('Lỗi nén ảnh:', err);
      }
    }
  };

  // Chat Actions
  const activeConversation = conversations.find(c => c.id === selectedConvId) || conversations[0];

  const handleSendReply = async (customText?: string) => {
    const textToSend = customText !== undefined ? customText : chatInputText;
    if (!textToSend.trim() && !selectedMediaPreview) return;
    if (!activeConversation) return;

    let mediaUrl: string | null = null;
    if (selectedMediaPreview) {
      try {
        setIsUploadingMedia(true);
        const res = await fetch('http://localhost:3004/chat/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            data: selectedMediaPreview.url,
            filename: selectedMediaPreview.file.name,
            mimeType: selectedMediaPreview.file.type,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          mediaUrl = data.url;
        }
      } catch (err) {
        console.error('Lỗi upload media:', err);
      } finally {
        setIsUploadingMedia(false);
      }
    }

    const timeNow = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const staffId = user?.id || 'staff-1';
    const staffName = user?.name || 'Nguyễn Chi Tường (Saler)';

    const newMsg: ChatMessage = {
      id: `staff-${Date.now()}`,
      sender: 'STAFF',
      senderName: staffName,
      text: textToSend.trim(),
      imageUrl: mediaUrl,
      timestamp: timeNow,
    };

    if (socketRef.current) {
      socketRef.current.emit('staff_chat_reply', {
        sessionId: activeConversation.id,
        staffId,
        staffName,
        text: textToSend.trim(),
        imageUrl: mediaUrl,
      });
    }

    // Tự động chuyển session sang STAFF_CONNECTED ngay khi Saler gửi tin nhắn để AI không can thiệp
    setConversations(prev =>
      prev.map(c => {
        if (c.id === activeConversation.id) {
          return {
            ...c,
            status: 'STAFF_CONNECTED',
            assignedStaffId: staffId,
            assignedStaffName: staffName,
            unreadCount: 0,
            lastMessage: textToSend.trim() || (mediaUrl ? '[Hình ảnh]' : ''),
            messages: [...c.messages, newMsg],
          };
        }
        return c;
      })
    );

    if (customText === undefined) setChatInputText('');
    setSelectedMediaPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSendMessage = (customText?: string) => {
    handleSendReply(customText);
  };

  const handleQuickReply = (template: string) => {
    handleSendReply(template);
  };

  const totalUnreadCount = conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);

  // Calculations
  const rawTotalAmount = cartItems.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  const calculatedDiscount = (rawTotalAmount * customDiscountRate) / 100;
  const finalOrderAmount = rawTotalAmount - calculatedDiscount;

  const totalMonthlySales = 145800000;
  const totalOrdersCount = salesOrders.length;
  const fefoItemsCount = products.filter(p => p.isFefoPriority).length;

  const productsMap = React.useMemo(() => {
    const map: Record<string, { price: number; unit: string; category?: string }> = {};
    products.forEach(p => {
      map[p.sku] = { price: p.price, unit: p.unit, category: p.category };
      map[p.id] = { price: p.price, unit: p.unit, category: p.category };
    });
    return map;
  }, [products]);

  const handleAddToCart = (prod: ProductInventoryItem, quantity: number = 1) => {
    setCartItems(prev => {
      const existing = prev.find(i => i.product.id === prod.id || i.product.sku === prod.sku);
      if (existing) {
        return prev.map(i =>
          (i.product.id === prod.id || i.product.sku === prod.sku)
            ? { ...i, quantity: i.quantity + quantity }
            : i
        );
      }
      return [...prev, { product: prod, quantity, unitPrice: prod.price }];
    });
  };

  const handleUpdateCartQty = (productId: string, delta: number) => {
    setCartItems(prev =>
      prev
        .map(i => {
          if (i.product.id === productId || i.product.sku === productId) {
            const next = i.quantity + delta;
            return next > 0 ? { ...i, quantity: next } : null;
          }
          return i;
        })
        .filter(Boolean) as OrderCartItem[]
    );
  };

  const handleSetCartQty = (productId: string, qty: number) => {
    if (qty <= 0) {
      setCartItems(prev => prev.filter(i => i.product.id !== productId && i.product.sku !== productId));
      return;
    }
    setCartItems(prev =>
      prev.map(i => (i.product.id === productId || i.product.sku === productId ? { ...i, quantity: qty } : i))
    );
  };

  const handleRemoveCartItem = (productId: string) => {
    setCartItems(prev => prev.filter(i => i.product.id !== productId && i.product.sku !== productId));
  };

  const handleAddFefoToOrder = (fefoItem: any) => {
    const matching = products.find(p => p.sku === fefoItem.sku || p.id === fefoItem.id) || {
      id: fefoItem.id,
      sku: fefoItem.sku,
      name: fefoItem.name,
      category: fefoItem.category || 'Hàng Cận Hạn',
      price: fefoItem.price,
      unit: fefoItem.unit || 'Kg',
      stock: fefoItem.stock,
      zone: fefoItem.zone,
      isFefoPriority: true,
    };

    setCartItems(prev => {
      const existing = prev.find(i => i.product.id === matching.id || i.product.sku === matching.sku);
      if (existing) {
        return prev.map(i =>
          (i.product.id === matching.id || i.product.sku === matching.sku)
            ? { ...i, quantity: i.quantity + 5, unitPrice: fefoItem.price, lotCode: fefoItem.lotCode, discountRate: fefoItem.discountRate }
            : i
        );
      }
      return [...prev, {
        product: matching,
        quantity: 5,
        unitPrice: fefoItem.price,
        lotCode: fefoItem.lotCode,
        discountRate: fefoItem.discountRate,
      }];
    });

    setActiveTab('CREATE_ORDER');
    showToast(`Đã đưa ${fefoItem.name} (Lô ${fefoItem.lotCode}) vào đơn hàng B2B với giá giảm FEFO.`);
  };

  const handleSelectCustomerForOrder = (cust: B2BCustomer) => {
    setSelectedCustomer(cust);
    setActiveTab('CREATE_ORDER');
    showToast(`Đã chọn đối tác ${cust.name}. Bạn có thể lên đơn B2B.`);
  };

  const handleSubmitB2BOrder = async (orderDetails: {
    warehouseCode: string;
    paymentTerms: string;
    deliveryDate: string;
    deliveryNotes: string;
    vatRate: number;
    shippingFee: number;
  }) => {
    if (!selectedCustomer) {
      showToast('Vui lòng chọn đối tác B2B trước khi tạo đơn');
      return;
    }
    if (cartItems.length === 0) {
      showToast('Vui lòng chọn ít nhất 1 sản phẩm vào đơn hàng');
      return;
    }

    const newOrderCode = `SO-B2B-${Date.now().toString().slice(-6)}`;
    const rawSub = cartItems.reduce((acc, i) => acc + i.unitPrice * i.quantity, 0);
    const disc = Math.round(rawSub * ((selectedCustomer.discountRate || 0) / 100));
    const vat = Math.round((rawSub - disc) * (orderDetails.vatRate / 100));
    const finalAmount = rawSub - disc + vat + orderDetails.shippingFee;

    const payload = {
      orderCode: newOrderCode,
      type: 'NORMAL',
      warehouseCode: orderDetails.warehouseCode,
      requesterName: selectedCustomer.companyName || selectedCustomer.name,
      customerPhone: selectedCustomer.phone,
      destination: selectedCustomer.address || selectedCustomer.billingAddress || 'Hồ Chí Minh',
      notes: `[B2B - ${orderDetails.paymentTerms}] ${orderDetails.deliveryNotes} (Hẹn giao: ${orderDetails.deliveryDate})`,
      totalAmount: finalAmount,
      items: cartItems.map(item => ({
        productId: item.product.id,
        sku: item.product.sku,
        productName: item.product.name,
        requestedQuantity: item.quantity,
        unitPrice: item.unitPrice,
        unit: item.product.unit,
        lotCode: item.lotCode,
      })),
    };

    const res = await fetch(OUTBOUND_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Lỗi khi gửi yêu cầu xuất kho');
    }

    showToast(`Tạo thành công Đơn Sales B2B #${newOrderCode}. Đã đẩy sang Kho ${orderDetails.warehouseCode}!`);
    setCartItems([]);
    await fetchLiveOrders();
    setActiveTab('ORDER_LIST');
  };

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
    
    if (!selectedCustomer) {
      alert('Vui lòng chọn khách hàng!');
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
    showToast(`Tạo thành công Đơn Hàng Sales B2B #${newOrderCode}. Đã gửi yêu cầu sang Kho.`);
    setCartItems([]);
    setActiveTab('ORDER_LIST');
  };

  // Phân loại danh sách khách hàng chat
  const filteredConversations = conversations.filter(c =>
    (c.customerName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.customerPhone || '').includes(searchQuery) ||
    (c.id || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const waitingList = filteredConversations.filter(c => c.status === 'WAITING_FOR_STAFF');
  const otherList = filteredConversations.filter(c => c.status !== 'WAITING_FOR_STAFF');
  const waitingCount = conversations.filter(c => c.status === 'WAITING_FOR_STAFF').length;

  const renderConversationItem = (conv: ChatConversation, isUrgent = false) => {
    const isSelected = selectedConvId === conv.id;
    const lastMsg = conv.messages && conv.messages.length > 0 ? conv.messages[conv.messages.length - 1] : null;
    const timeDisplay = conv.lastMessageAt
      ? new Date(conv.lastMessageAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
      : (lastMsg?.timestamp || 'Mới');

    return (
      <div
        key={conv.id}
        onClick={() => {
          setSelectedConvId(conv.id);
          setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, unreadCount: 0 } : c));
        }}
        style={{
          padding: '10px 12px',
          borderBottom: '1px solid #f1f5f9',
          cursor: 'pointer',
          backgroundColor: isSelected ? (isUrgent ? '#fff1f2' : '#f0fdf4') : '#ffffff',
          borderLeft: isSelected
            ? (isUrgent ? '3px solid #ef4444' : '3px solid #008848')
            : '3px solid transparent',
          transition: 'all 0.15s ease',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
          <span style={{ fontWeight: 700, fontSize: '0.86rem', color: '#0f172a' }}>
            {conv.customerName}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{timeDisplay}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSessionToDelete(conv);
              }}
              title="Xóa cuộc trò chuyện này để giải phóng bộ nhớ"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#94a3b8',
                padding: '2px',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                transition: 'color 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
          {isUrgent || conv.status === 'WAITING_FOR_STAFF' ? (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 3,
              fontSize: '0.7rem',
              fontWeight: 700,
              color: '#991b1b',
              backgroundColor: '#fee2e2',
              padding: '1px 6px',
              borderRadius: '4px',
              border: '1px solid #fecaca',
            }}>
              <AlertTriangle size={10} /> Cần Saler hỗ trợ
            </span>
          ) : conv.status === 'STAFF_CONNECTED' ? (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 3,
              fontSize: '0.7rem',
              fontWeight: 700,
              color: '#166534',
              backgroundColor: '#f0fdf4',
              padding: '1px 6px',
              borderRadius: '4px',
              border: '1px solid #bbf7d0',
            }}>
              <Headset size={10} /> Đang tư vấn
            </span>
          ) : (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 3,
              fontSize: '0.7rem',
              fontWeight: 700,
              color: '#4338ca',
              backgroundColor: '#eef2ff',
              padding: '1px 6px',
              borderRadius: '4px',
              border: '1px solid #c7d2fe',
            }}>
              <Bot size={10} /> AI đang hỗ trợ
            </span>
          )}

          {conv.unreadCount > 0 && (
            <span style={{
              backgroundColor: '#ef4444',
              color: '#ffffff',
              borderRadius: '9999px',
              padding: '1px 6px',
              fontSize: '0.68rem',
              fontWeight: 700,
            }}>
              {conv.unreadCount}
            </span>
          )}
        </div>

        <div style={{
          fontSize: '0.78rem',
          color: '#64748b',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {conv.lastMessage || lastMsg?.text || 'Nhấn để xem tin nhắn'}
        </div>
      </div>
    );
  };

  const cleanChatMessageText = (text?: string): string => {
    if (!text) return '';
    return text
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/__(.*?)__/g, '$1')
      .replace(/#{1,6}\s+/g, '')
      .replace(/\*\*/g, '')
      .trim();
  };

  const renderChatMessageBubble = (msg: ChatMessage) => {
    const isStaff = msg.sender === 'STAFF' || msg.sender === 'SALES_STAFF';
    const isBot = msg.sender === 'AI_BOT' || msg.sender === 'BOT';
    const isSystem = msg.sender === 'SYSTEM';

    if (isSystem) {
      return (
        <div key={msg.id} style={{ textAlign: 'center', margin: '4px 0' }}>
          <span style={{
            backgroundColor: '#f1f5f9',
            color: '#475569',
            padding: '3px 12px',
            borderRadius: '12px',
            fontSize: '0.72rem',
            fontWeight: 500,
            border: '1px solid #e2e8f0',
          }}>
            {cleanChatMessageText(msg.text)}
          </span>
        </div>
      );
    }

    if (isBot) {
      return (
        <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', maxWidth: '85%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.74rem', color: '#6366f1', marginBottom: '3px', fontWeight: 600 }}>
            <Bot size={13} />
            <span>Trợ lý AI C.T Mart • {msg.timestamp || 'Vừa xong'}</span>
          </div>

          <div style={{
            padding: '10px 14px',
            borderRadius: '10px',
            backgroundColor: '#f8fafc',
            border: '1px solid #e0e7ff',
            color: '#1e293b',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
            lineHeight: 1.5,
            fontSize: '0.86rem',
          }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: '0.7rem',
              fontWeight: 700,
              color: '#4f46e5',
              backgroundColor: '#eef2ff',
              padding: '2px 6px',
              borderRadius: '4px',
              marginBottom: '6px',
              border: '1px solid #c7d2fe',
            }}>
              <Bot size={11} /> Phản hồi tự động từ AI Gemini:
            </div>
            <div style={{ whiteSpace: 'pre-wrap' }}>{cleanChatMessageText(msg.text)}</div>

            {msg.imageUrl && (
              <div style={{ marginTop: '8px' }}>
                {msg.imageUrl.match(/\.(mp4|webm|mov)(\?|$)/i) ? (
                  <video src={msg.imageUrl} controls style={{ maxWidth: '100%', maxHeight: 220, borderRadius: 6 }} />
                ) : (
                  <img
                    src={msg.imageUrl}
                    alt="attachment"
                    onClick={() => setLightboxUrl(msg.imageUrl || null)}
                    style={{ maxWidth: '100%', maxHeight: 220, borderRadius: 6, cursor: 'pointer', border: '1px solid #cbd5e1' }}
                  />
                )}
              </div>
            )}
          </div>
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
          maxWidth: '80%',
          alignSelf: isStaff ? 'flex-end' : 'flex-start',
        }}
      >
        <div style={{ fontSize: '0.73rem', color: '#94a3b8', marginBottom: '3px', padding: '0 4px' }}>
          {isStaff ? (msg.senderName || 'Bạn (Tư vấn viên)') : (activeConversation.customerName || 'Khách hàng')} • {msg.timestamp || 'Vừa xong'}
        </div>

        <div style={{
          padding: '10px 14px',
          borderRadius: isStaff ? '10px 10px 2px 10px' : '10px 10px 10px 2px',
          backgroundColor: isStaff ? '#008848' : '#ffffff',
          color: isStaff ? '#ffffff' : '#0f172a',
          boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
          border: isStaff ? 'none' : '1px solid #e2e8f0',
          lineHeight: 1.5,
          fontSize: '0.86rem',
        }}>
          {msg.text && <div style={{ whiteSpace: 'pre-wrap' }}>{cleanChatMessageText(msg.text)}</div>}

          {msg.imageUrl && (
            <div style={{ marginTop: msg.text ? '8px' : '0' }}>
              {msg.imageUrl.match(/\.(mp4|webm|mov)(\?|$)/i) ? (
                <video src={msg.imageUrl} controls style={{ maxWidth: '100%', maxHeight: 220, borderRadius: 6 }} />
              ) : (
                <img
                  src={msg.imageUrl}
                  alt="attachment"
                  onClick={() => setLightboxUrl(msg.imageUrl || null)}
                  style={{ maxWidth: '100%', maxHeight: 220, borderRadius: 6, cursor: 'pointer', border: '1px solid rgba(0,0,0,0.1)' }}
                />
              )}
            </div>
          )}
        </div>
      </div>
    );
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
            Giao tiếp trực tiếp với khách hàng mua sắm, theo dõi tiến độ đơn hàng và tư vấn bán hàng
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
          <MessageSquare size={18} /> 1. Chat Hỗ Trợ {totalUnreadCount > 0 && `(${totalUnreadCount})`}
        </button>
        <button onClick={() => setActiveTab('CREATE_ORDER')} style={tabButtonStyle(activeTab === 'CREATE_ORDER')}>
          <Plus size={18} /> 2. Tạo Đơn B2B
        </button>
        <button onClick={() => setActiveTab('ORDER_LIST')} style={tabButtonStyle(activeTab === 'ORDER_LIST')}>
          <FileText size={18} /> 3. Đơn Hàng ({salesOrders.length})
        </button>
        <button onClick={() => setActiveTab('FEFO_INSIGHTS')} style={tabButtonStyle(activeTab === 'FEFO_INSIGHTS')}>
          <TrendingUp size={18} /> 4. Đẩy Bán Cận Hạn ({fefoLotsCount})
        </button>
        <button onClick={() => setActiveTab('CUSTOMERS')} style={tabButtonStyle(activeTab === 'CUSTOMERS')}>
          <Building2 size={18} /> 5. Khách Hàng B2B
        </button>
      </div>

      {/* TAB: LIVE CHAT SUPPORT */}
      {activeTab === 'LIVE_CHAT' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: '320px 1fr',
          gap: '1rem',
          height: 'calc(100vh - 210px)',
          minHeight: '600px',
          backgroundColor: '#ffffff',
          borderRadius: '10px',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}>
          {/* CỘT TRÁI: DANH SÁCH KHÁCH HÀNG (CỐ ĐỊNH, KHÔNG BỊ MẤT KHI CHỌN) */}
          <div style={{
            borderRight: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#f8fafc',
            height: '100%',
            overflow: 'hidden',
          }}>
            {/* Header Danh sách */}
            <div style={{
              padding: '12px 14px',
              borderBottom: '1px solid #e2e8f0',
              backgroundColor: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0f172a' }}>
                  Khách Hàng ({conversations.length})
                </span>
                {waitingCount > 0 && (
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '2px 7px',
                    borderRadius: '12px',
                    backgroundColor: '#fee2e2',
                    color: '#991b1b',
                    border: '1px solid #fecaca',
                  }}>
                    {waitingCount} cần trả lời
                  </span>
                )}
              </div>
              <button
                onClick={fetchLiveChatSessions}
                title="Làm mới danh sách"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '4px',
                  borderRadius: '4px',
                }}
              >
                <RefreshCw size={14} />
              </button>
            </div>

            {/* Ô tìm kiếm */}
            <div style={{ padding: '8px 12px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#ffffff' }}>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="Tìm khách hàng hoặc SĐT..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '7px 10px 7px 30px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.82rem',
                    outline: 'none',
                    backgroundColor: '#f8fafc',
                  }}
                />
                <Search size={14} color="#64748b" style={{ position: 'absolute', left: '9px', top: '9px' }} />
              </div>
            </div>

            {/* Danh sách cuộn */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {/* NHÓM 1: CẦN PHẢN HỒI NGAY */}
              <div style={{
                padding: '6px 12px',
                fontSize: '0.72rem',
                fontWeight: 700,
                color: '#b91c1c',
                backgroundColor: '#fef2f2',
                borderBottom: '1px solid #fee2e2',
                letterSpacing: '0.04em',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}>
                <AlertTriangle size={12} /> CẦN PHẢN HỒI NGAY ({waitingList.length})
              </div>

              {waitingList.length === 0 ? (
                <div style={{ padding: '12px', textAlign: 'center', fontSize: '0.78rem', color: '#94a3b8' }}>
                  Không có khách hàng chờ phản hồi
                </div>
              ) : (
                waitingList.map(conv => renderConversationItem(conv, true))
              )}

              {/* NHÓM 2: ĐANG TỰ ĐỘNG & ĐÃ XỬ LÝ (BAO GỒM PHIÊN BÀN GIAO LẠI CHO AI) */}
              <div style={{
                padding: '6px 12px',
                fontSize: '0.72rem',
                fontWeight: 700,
                color: '#334155',
                backgroundColor: '#f1f5f9',
                borderTop: '1px solid #e2e8f0',
                borderBottom: '1px solid #e2e8f0',
                letterSpacing: '0.04em',
              }}>
                ĐANG TỰ ĐỘNG & ĐÃ XỬ LÝ ({otherList.length})
              </div>

              {otherList.length === 0 ? (
                <div style={{ padding: '12px', textAlign: 'center', fontSize: '0.78rem', color: '#94a3b8' }}>
                  Chưa có hội thoại nào khác
                </div>
              ) : (
                otherList.map(conv => renderConversationItem(conv, false))
              )}
            </div>
          </div>

          {/* CỘT PHẢI: KHUNG CHAT CHI TIẾT */}
          {activeConversation ? (
            <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: '#ffffff', height: '100%', overflow: 'hidden' }}>
              {/* Chat Header */}
              <div style={{
                padding: '12px 18px',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: '#ffffff',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    backgroundColor: '#008848',
                    color: '#ffffff',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1rem',
                  }}>
                    {activeConversation.customerName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a' }}>
                      {activeConversation.customerName}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                      SĐT: {activeConversation.customerPhone || '0909000111'} • Phiên #{activeConversation.id.slice(0, 8)}
                    </div>
                  </div>
                </div>

                {/* Handoff & Takeover Action Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {activeConversation.status === 'WAITING_FOR_STAFF' && (
                    <button
                      onClick={() => handleTakeOverSession(activeConversation.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        backgroundColor: '#008848',
                        color: '#ffffff',
                        border: 'none',
                        padding: '7px 14px',
                        borderRadius: '6px',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      <Headset size={14} /> Tiếp nhận tư vấn ngay
                    </button>
                  )}

                  {activeConversation.status === 'STAFF_CONNECTED' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        backgroundColor: '#f0fdf4',
                        color: '#166534',
                        border: '1px solid #bbf7d0',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                      }}>
                        Tư vấn viên: {activeConversation.assignedStaffName || user?.name || 'Nguyễn Chi Tường'}
                      </span>
                      <button
                        onClick={() => handleHandBackToAi(activeConversation.id)}
                        title="Bàn giao lại cho AI Gemini tiếp tục chăm sóc khách"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 5,
                          backgroundColor: '#f8fafc',
                          color: '#475569',
                          border: '1px solid #cbd5e1',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        <Bot size={13} /> Chuyển lại cho AI
                      </button>
                    </div>
                  )}

                  {activeConversation.status === 'AI_ACTIVE' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        backgroundColor: '#eef2ff',
                        color: '#4338ca',
                        border: '1px solid #c7d2fe',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                      }}>
                        <Bot size={13} /> Trợ lý AI đang hỗ trợ
                      </span>
                      <button
                        onClick={() => handleTakeOverSession(activeConversation.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 5,
                          backgroundColor: '#008848',
                          color: '#ffffff',
                          border: 'none',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        <Headset size={13} /> Can thiệp trực tiếp
                      </button>
                    </div>
                  )}

                  {/* Nút Xóa phiên chat để giải phóng bộ nhớ */}
                  <button
                    onClick={() => setSessionToDelete(activeConversation)}
                    title="Xóa vĩnh viễn cuộc trò chuyện này để giải phóng bộ nhớ"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                      backgroundColor: '#fef2f2',
                      color: '#991b1b',
                      border: '1px solid #fecaca',
                      padding: '6px 11px',
                      borderRadius: '6px',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    <Trash2 size={13} /> Xóa chat
                  </button>
                </div>
              </div>

              {/* Chat Message List Container (scrollable) */}
              <div style={{
                flex: 1,
                padding: '1.25rem',
                overflowY: 'auto',
                backgroundColor: '#f8fafc',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.9rem',
              }}>
                {activeConversation.messages.map(msg => renderChatMessageBubble(msg))}
                <div ref={messagesEndRef} />
              </div>

              {/* Media Preview before send */}
              {selectedMediaPreview && (
                <div style={{
                  padding: '8px 16px',
                  backgroundColor: '#f1f5f9',
                  borderTop: '1px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}>
                  <div style={{ position: 'relative', width: 48, height: 48, borderRadius: 6, overflow: 'hidden', border: '1px solid #cbd5e1' }}>
                    {selectedMediaPreview.isVideo ? (
                      <video src={selectedMediaPreview.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <img src={selectedMediaPreview.url} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    )}
                  </div>
                  <div style={{ flex: 1, fontSize: '0.8rem', color: '#475569' }}>
                    {selectedMediaPreview.file.name} ({Math.round(selectedMediaPreview.file.size / 1024)} KB)
                  </div>
                  <button
                    onClick={() => { setSelectedMediaPreview(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
                  >
                    <X size={16} />
                  </button>
                </div>
              )}

              {/* Quick Reply Pills */}
              <div style={{
                padding: '6px 12px',
                backgroundColor: '#ffffff',
                borderTop: '1px solid #f1f5f9',
                display: 'flex',
                gap: '6px',
                overflowX: 'auto',
              }}>
                <button
                  onClick={() => handleSendReply('Dạ C.T Mart xin chào! Em có thể hỗ trợ gì cho anh/chị ạ?')}
                  style={quickReplyPillStyle}
                >
                  Dạ C.T Mart xin chào! Em có thể ...
                </button>
                <button
                  onClick={() => handleSendReply('Đơn hàng của mình đang được đóng gói và giao ngay nhé ạ!')}
                  style={quickReplyPillStyle}
                >
                  Đơn hàng của mình đang được đóng...
                </button>
                <button
                  onClick={() => handleSendReply('Sản phẩm luôn được bảo quản kho lạnh đạt chuẩn trước khi giao ạ.')}
                  style={quickReplyPillStyle}
                >
                  Sản phẩm luôn được bảo quản kho ...
                </button>
                <button
                  onClick={() => handleSendReply('Cảm ơn quý khách đã tin dùng dịch vụ của C.T Mart!')}
                  style={quickReplyPillStyle}
                >
                  Cảm ơn quý khách đã tin dùng dịc...
                </button>
              </div>

              {/* Input Bar */}
              <div style={{
                padding: '10px 14px',
                borderTop: '1px solid #e2e8f0',
                backgroundColor: '#ffffff',
                display: 'flex',
                gap: '8px',
                alignItems: 'center',
              }}>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleSelectFile}
                  accept="image/*,video/*"
                  style={{ display: 'none' }}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  title="Gửi hình ảnh hoặc video"
                  style={{
                    backgroundColor: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    width: '36px',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#475569',
                  }}
                >
                  <Paperclip size={16} />
                </button>

                <input
                  type="text"
                  placeholder="Nhắn tin để can thiệp / trả lời trực tiếp..."
                  value={chatInputText}
                  onChange={e => setChatInputText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSendReply(); }}
                  style={{
                    flex: 1,
                    padding: '8px 14px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.88rem',
                    outline: 'none',
                  }}
                />

                <button
                  onClick={() => handleSendReply()}
                  disabled={isUploadingMedia}
                  style={{
                    backgroundColor: '#008848',
                    color: '#ffffff',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    cursor: 'pointer',
                  }}
                >
                  <Send size={15} /> {isUploadingMedia ? 'Đang gửi...' : 'Gửi'}
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
              Chọn một khách hàng ở danh sách bên trái để bắt đầu cuộc trò chuyện
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CREATE B2B SALES ORDER */}
      {activeTab === 'CREATE_ORDER' && (
        <CreateB2BOrderPanel
          products={products}
          customers={customers}
          selectedCustomer={selectedCustomer}
          onSelectCustomer={setSelectedCustomer}
          cartItems={cartItems}
          onUpdateQty={handleUpdateCartQty}
          onSetQty={handleSetCartQty}
          onRemoveItem={handleRemoveCartItem}
          onAddToCart={handleAddToCart}
          onSubmitOrder={handleSubmitB2BOrder}
          onPreviewQuote={() => window.print()}
          showToast={showToast}
        />
      )}

      {/* TAB 3: ENTERPRISE B2B ORDER LIST */}
      {activeTab === 'ORDER_LIST' && (
        <div style={{ background: '#ffffff', borderRadius: 10, padding: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                Quản Lý Đơn Hàng B2B & Điều Phối Xuất Kho
              </h3>
              <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0, marginTop: 2 }}>
                Đồng bộ liên thông trực tiếp với hệ thống Outbound (:3007) và Pick-to-Light của nhân viên kho
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ position: 'relative', width: 260 }}>
                <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  value={orderSearchQuery}
                  onChange={e => setOrderSearchQuery(e.target.value)}
                  placeholder="Tìm theo mã đơn, khách hàng, SĐT..."
                  style={{
                    width: '100%',
                    padding: '6px 10px 6px 30px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    fontSize: '0.825rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <select
                value={orderStatusFilter}
                onChange={e => setOrderStatusFilter(e.target.value)}
                style={{
                  padding: '6px 10px',
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  fontSize: '0.825rem',
                  color: '#334155',
                  backgroundColor: '#ffffff',
                  outline: 'none',
                }}
              >
                <option value="ALL">Tất Cả Trạng Thái</option>
                <option value="PENDING">Chờ xử lý (Pending)</option>
                <option value="PICKING">Đang nhặt hàng (Picking)</option>
                <option value="PACKED">Đã đóng gói (Packed)</option>
                <option value="SHIPPED">Đang giao hàng (Shipped)</option>
                <option value="DELIVERED">Đã hoàn tất (Delivered)</option>
              </select>
            </div>
          </div>

          <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 8 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', textAlign: 'left' }}>
                  <th style={{ padding: '10px 12px' }}>Mã Đơn B2B</th>
                  <th style={{ padding: '10px 12px' }}>Đối Tác / Khách Hàng</th>
                  <th style={{ padding: '10px 12px' }}>Phân Loại</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>Tổng Giá Trị</th>
                  <th style={{ padding: '10px 12px' }}>Trạng Thái Xuất Kho</th>
                  <th style={{ padding: '10px 12px' }}>Thời Gian</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center' }}>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {salesOrders
                  .filter(o => {
                    const q = orderSearchQuery.trim().toLowerCase();
                    const matchQ =
                      !q ||
                      (o.orderCode || '').toLowerCase().includes(q) ||
                      (o.customerName || '').toLowerCase().includes(q) ||
                      (o.customerPhone || '').includes(q);
                    const matchStatus = orderStatusFilter === 'ALL' || o.status === orderStatusFilter;
                    return matchQ && matchStatus;
                  })
                  .map(order => (
                    <tr key={order.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 700, color: '#0f766e', fontFamily: 'monospace' }}>
                        {order.orderCode}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>{order.customerName}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>SĐT: {order.customerPhone}</div>
                      </td>
                      <td style={{ padding: '10px 12px', color: '#475569' }}>
                        <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: 4, backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                          {order.customerType}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#0284c7' }}>
                        {order.finalAmount.toLocaleString('vi-VN')}đ
                      </td>
                      <td style={{ padding: '10px 12px' }}>{renderStatusBadge(order.status)}</td>
                      <td style={{ padding: '10px 12px', color: '#64748b', fontSize: '0.8rem' }}>{order.createdAt}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <button
                          onClick={() => setSelectedOrderDetail(order)}
                          style={{
                            padding: '4px 10px',
                            borderRadius: 6,
                            border: '1px solid #cbd5e1',
                            backgroundColor: '#ffffff',
                            color: '#0f766e',
                            fontSize: '0.775rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Chi Tiết
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {/* Modal xem chi tiết đơn hàng B2B */}
          <B2BOrderDetailModal
            order={selectedOrderDetail}
            onClose={() => setSelectedOrderDetail(null)}
          />
        </div>
      )}

      {/* TAB 4: SMART FEFO CLEARANCE ENGINE */}
      {activeTab === 'FEFO_INSIGHTS' && (
        <FefoClearancePanel
          onAddFefoToOrder={handleAddFefoToOrder}
          showToast={showToast}
          productsMap={productsMap}
        />
      )}

      {/* TAB 5: B2B CUSTOMER MANAGEMENT */}
      {activeTab === 'CUSTOMERS' && (
        <B2BCustomersPanel
          customers={customers}
          onSelectCustomerForOrder={handleSelectCustomerForOrder}
          onRefreshCustomers={fetchCustomers}
          token={token}
          showToast={showToast}
        />
      )}

      {/* Lightbox Preview Modal for Chat Media */}
      {lightboxUrl && (
        <div
          onClick={() => setLightboxUrl(null)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              position: 'relative',
              maxWidth: '90vw',
              maxHeight: '90vh',
              backgroundColor: '#000000',
              borderRadius: '8px',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <button
              onClick={() => setLightboxUrl(null)}
              style={{
                position: 'absolute',
                top: 10,
                right: 10,
                backgroundColor: 'rgba(255, 255, 255, 0.25)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '50%',
                width: 32,
                height: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <X size={18} />
            </button>
            {lightboxUrl.match(/\.(mp4|webm|mov)(\?|$)/i) ? (
              <video src={lightboxUrl} controls autoPlay style={{ maxWidth: '100%', maxHeight: '85vh' }} />
            ) : (
              <img src={lightboxUrl} alt="enlarged" style={{ maxWidth: '100%', maxHeight: '85vh', objectFit: 'contain' }} />
            )}
          </div>
        </div>
      )}

      {/* Modal Xác Nhận Xóa Cuộc Trò Chuyện */}
      {sessionToDelete && (
        <div
          onClick={() => { if (!isDeletingSession) setSessionToDelete(null); }}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '10px',
              maxWidth: '460px',
              width: '100%',
              padding: '1.5rem',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
              border: '1px solid #e2e8f0',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '12px' }}>
              <div style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                backgroundColor: '#fee2e2',
                color: '#b91c1c',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Trash2 size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                  Xác nhận xóa cuộc trò chuyện
                </h3>
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                  Giải phóng dung lượng bộ nhớ hệ thống
                </span>
              </div>
            </div>

            <p style={{ fontSize: '0.85rem', color: '#334155', lineHeight: 1.5, margin: '0 0 1.25rem 0' }}>
              Bạn có chắc chắn muốn xóa vĩnh viễn đoạn chat của khách hàng{' '}
              <strong>{sessionToDelete.customerName}</strong> (SĐT: {sessionToDelete.customerPhone})?
              <br /><br />
              <span style={{ color: '#b91c1c', fontWeight: 600 }}>Lưu ý:</span> Toàn bộ lịch sử tin nhắn, hình ảnh và video liên quan sẽ bị xóa sạch khỏi cơ sở dữ liệu và không thể khôi phục.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                disabled={isDeletingSession}
                onClick={() => setSessionToDelete(null)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#f8fafc',
                  color: '#475569',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: isDeletingSession ? 'not-allowed' : 'pointer',
                }}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={isDeletingSession}
                onClick={handleConfirmDeleteSession}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: isDeletingSession ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Trash2 size={14} />
                {isDeletingSession ? 'Đang xóa...' : 'Xóa vĩnh viễn'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const quickReplyPillStyle: React.CSSProperties = {
  backgroundColor: '#f8fafc',
  color: '#475569',
  border: '1px solid #cbd5e1',
  padding: '5px 10px',
  borderRadius: '14px',
  fontSize: '0.75rem',
  fontWeight: 500,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
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
      return <span style={{ backgroundColor: '#FFEDD5', color: '#C2410C', padding: '3px 8px', borderRadius: 12, fontSize: '0.75rem', fontWeight: 800 }}>Kho đang soạn hàng</span>;
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
