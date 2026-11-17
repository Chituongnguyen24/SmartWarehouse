import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { getApiHost } from '../utils/apiConfig';
import { useAuth } from '@/features/auth';
import { useWarehouse } from './WarehouseContext';

// Chuyên biệt cho 3 nhóm công việc cốt lõi của menu: Đơn hàng, Xuất kho, Tư vấn chat
export type NotificationType = 'ORDER' | 'OUTBOUND' | 'CHAT';
export type NotificationLevel = 'info' | 'success' | 'warning' | 'danger';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  level: NotificationLevel;
  link?: string;
  createdAt: string;
  isRead: boolean;
  metadata?: any;
}

export interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  pendingOrdersCount: number;
  pendingOutboundsCount: number;
  pendingChatsCount: number;
  recentToast: AppNotification | null;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
  dismissToast: () => void;
  refreshPendingCounts: () => Promise<void>;
  markChatSessionAsRead: (sessionId?: string) => void;
  markAllChatsAsRead: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const NOTIF_STORAGE_KEY = 'sfwms_menu_notifications_v2';
const READ_CHATS_STORAGE_KEY = 'sfwms_read_chat_sessions_v1';

// Seed initial notifications focused exclusively on menu actionable tasks
const DEFAULT_INITIAL_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'init-notif-order',
    title: 'Đơn hàng trực tuyến chờ tiếp nhận',
    message: 'Có đơn hàng mới từ khách hàng đang chờ điều phối và phân tuyến.',
    type: 'ORDER',
    level: 'info',
    link: '/orders',
    createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    isRead: false,
  },
  {
    id: 'init-notif-outbound',
    title: 'Phiếu xuất kho chờ tiếp nhận',
    message: 'Phiếu xuất kho mới đang chờ bộ phận kho mở lệnh và soạn hàng từ kệ.',
    type: 'OUTBOUND',
    level: 'info',
    link: '/outbound',
    createdAt: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
    isRead: false,
  },
  {
    id: 'init-notif-chat',
    title: 'Khách hàng cần tư vấn',
    message: 'Có yêu cầu hỗ trợ và tư vấn sản phẩm đang chờ nhân viên bán hàng phản hồi.',
    type: 'CHAT',
    level: 'info',
    link: '/sales?tab=chat',
    createdAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
    isRead: false,
  },
];

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { selectedWarehouseCode } = useWarehouse();

  // Notifications List State (Filtered strictly to ORDER, OUTBOUND, CHAT)
  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    try {
      const saved = localStorage.getItem(NOTIF_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const filtered = parsed.filter(n => n.type === 'ORDER' || n.type === 'OUTBOUND' || n.type === 'CHAT');
          if (filtered.length > 0) return filtered;
        }
      }
    } catch (e) {
      console.warn('Failed to load notifications from localStorage:', e);
    }
    return DEFAULT_INITIAL_NOTIFICATIONS;
  });

  // Track Chat sessions that staff have already opened and read
  const [readChatSessionIds, setReadChatSessionIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(READ_CHATS_STORAGE_KEY);
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch (e) {
      return new Set();
    }
  });

  // Save notifications to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(notifications.slice(0, 50)));
    } catch (e) {
      console.warn('Failed to save notifications to localStorage:', e);
    }
  }, [notifications]);

  // Operational Pending Counts State for Menu Badges
  const [pendingOrdersCount, setPendingOrdersCount] = useState<number>(0);
  const [pendingOutboundsCount, setPendingOutboundsCount] = useState<number>(0);
  const [pendingChatsCount, setPendingChatsCount] = useState<number>(0);

  // Floating Toast Alert State
  const [recentToast, setRecentToast] = useState<AppNotification | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const triggerToast = useCallback((notif: AppNotification) => {
    setRecentToast(notif);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => {
      setRecentToast(null);
    }, 4500);
  }, []);

  const dismissToast = useCallback(() => {
    setRecentToast(null);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
  }, []);

  const addNotification = useCallback((newNotif: Omit<AppNotification, 'id' | 'createdAt' | 'isRead'> & { id?: string; createdAt?: string }) => {
    // Only accept notification types matching menu operations
    if (newNotif.type !== 'ORDER' && newNotif.type !== 'OUTBOUND' && newNotif.type !== 'CHAT') {
      return;
    }

    const completeNotif: AppNotification = {
      id: newNotif.id || `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      title: newNotif.title,
      message: newNotif.message,
      type: newNotif.type,
      level: newNotif.level,
      link: newNotif.link,
      createdAt: newNotif.createdAt || new Date().toISOString(),
      isRead: false,
      metadata: newNotif.metadata,
    };

    setNotifications(prev => [completeNotif, ...prev.slice(0, 49)]);
    triggerToast(completeNotif);
  }, [triggerToast]);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, isRead: true } : n)));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  // When staff opens and views a chat session -> mark as read & immediately decrement pending badge!
  const markChatSessionAsRead = useCallback((sessionId?: string) => {
    if (!sessionId) return;
    setReadChatSessionIds(prev => {
      const next = new Set(prev);
      next.add(sessionId);
      try {
        localStorage.setItem(READ_CHATS_STORAGE_KEY, JSON.stringify(Array.from(next)));
      } catch (e) {}
      return next;
    });

    // Notify backend DB to persist unreadCount = 0
    fetch(`${getApiHost(3004)}/chat/sessions/${sessionId}/mark-read`, {
      method: 'PATCH',
    }).catch(err => console.warn('Failed to mark chat session as read on server:', err));

    // Mark matching chat notifications as read
    setNotifications(prev =>
      prev.map(n => {
        if (n.type === 'CHAT' && (n.metadata?.sessionId === sessionId || n.metadata?.id === sessionId || n.metadata?.convId === sessionId)) {
          return { ...n, isRead: true };
        }
        return n;
      })
    );

    // Immediately decrement pendingChatsCount
    setPendingChatsCount(prev => Math.max(0, prev - 1));
  }, []);

  const markAllChatsAsRead = useCallback(() => {
    setPendingChatsCount(0);
    setNotifications(prev =>
      prev.map(n => (n.type === 'CHAT' ? { ...n, isRead: true } : n))
    );

    // Notify backend DB
    fetch(`${getApiHost(3004)}/chat/sessions/mark-all-read`, {
      method: 'PATCH',
    }).catch(err => console.warn('Failed to mark all chat sessions as read on server:', err));
  }, []);

  const unreadCount = useMemo(() => {
    return notifications.filter(n => !n.isRead).length;
  }, [notifications]);

  // Determine active warehouse scope for API queries
  const activeWh = useMemo(() => {
    if (!user) return 'WH-006';
    if (user.role === 'ADMIN') return selectedWarehouseCode || 'ALL';
    if (user.role === 'SALES_STAFF') return 'ALL';
    return user.warehouseCode || 'WH-006';
  }, [user, selectedWarehouseCode]);

  // Fetch real counts across order-service, outbound-service, and chat-sessions
  // readChatSessionIds must be in deps so the closure always has the LATEST read set
  const refreshPendingCounts = useCallback(async () => {
    try {
      // 1. Pending Orders (Đơn hàng chưa tiếp nhận - status = PENDING, WAITING_TRANSFER)
      const orderWhParam = activeWh && activeWh !== 'ALL' ? `?warehouseCode=${encodeURIComponent(activeWh)}` : '';
      const ordersRes = await fetch(`${getApiHost(3004)}/orders${orderWhParam}`);
      if (ordersRes.ok) {
        const orderData = await ordersRes.json();
        const ordersList = Array.isArray(orderData) ? orderData : (orderData.items || orderData.data || []);
        const pendingOrders = ordersList.filter((o: any) => {
          const s = String(o.status || '').toUpperCase();
          return s === 'PENDING' || s === 'WAITING_TRANSFER' || s === 'WAITING_ACCEPT';
        });
        setPendingOrdersCount(pendingOrders.length);
      }

      // 2. Pending Outbound Orders (Đơn xuất kho chưa tiếp nhận - status = PENDING, CREATED, DRAFT)
      const obWhParam = activeWh && activeWh !== 'ALL' ? `?warehouseCode=${encodeURIComponent(activeWh)}&limit=100` : '?limit=100';
      const outboundRes = await fetch(`${getApiHost(3007)}/outbound-orders${obWhParam}`);
      if (outboundRes.ok) {
        const obData = await outboundRes.json();
        const obList = Array.isArray(obData) ? obData : (obData.items || obData.data || []);
        const pendingObs = obList.filter((ob: any) => {
          const s = String(ob.status || '').toUpperCase();
          return s === 'PENDING' || s === 'CREATED' || s === 'DRAFT' || s === 'WAITING_TRANSFER';
        });
        setPendingOutboundsCount(pendingObs.length);
      }

      // 3. Pending Chat & Customer Inquiries (Khách hàng cần tư vấn / chưa được trả lời)
      // Uses React state `readChatSessionIds` from closure (always fresh) instead of re-reading localStorage
      try {
        const chatRes = await fetch(`${getApiHost(3004)}/chat/sessions?status=ALL`);
        if (chatRes.ok) {
          const sessions = await chatRes.json();
          if (Array.isArray(sessions)) {
            const unanswered = sessions.filter((s: any) => {
              // Skip sessions staff have already opened and read
              if (readChatSessionIds.has(s.id)) return false;
              const status = String(s.status || '').toUpperCase();
              const hasUnread = Number(s.unreadCount || 0) > 0;
              const isWaiting = status === 'WAITING_FOR_STAFF' || status === 'PENDING';
              const isStaffConnectedWithUnread = status === 'STAFF_CONNECTED' && hasUnread;
              return isWaiting || isStaffConnectedWithUnread;
            });
            setPendingChatsCount(unanswered.length);
          }
        }
      } catch (chatErr) {
        // Chat endpoint fallback — do not reset count on transient errors
      }
    } catch (err) {
      console.warn('[NOTIF CONTEXT] Error refreshing pending counts:', err);
    }
  }, [activeWh, readChatSessionIds]);

  // Periodic Polling Fallback (every 8 seconds for real-time badge accuracy)
  useEffect(() => {
    refreshPendingCounts();
    const interval = setInterval(() => {
      refreshPendingCounts();
    }, 8000);
    return () => clearInterval(interval);
  }, [refreshPendingCounts]);

  // Real-time WebSocket Gateway Integration
  useEffect(() => {
    const socket: Socket = io(getApiHost(3004), {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 20,
      reconnectionDelay: 1500,
    });

    // 1. New Order Event
    socket.on('new_order', (data: any) => {
      console.log('[NOTIF WS] new_order:', data);
      const code = data.orderCode || (data.id ? `ORD-${String(data.id).slice(0, 8)}` : 'Đơn mới');
      const amount = Number(data.totalAmount || 0);
      addNotification({
        title: 'Đơn hàng trực tuyến mới',
        message: `Đơn hàng #${code} vừa được đặt thành công (${amount > 0 ? amount.toLocaleString('vi-VN') + ' đ' : 'Chờ tiếp nhận'}).`,
        type: 'ORDER',
        level: 'info',
        link: '/orders',
        metadata: data,
      });
      refreshPendingCounts();
    });

    // 2. Order Status Updated Event
    socket.on('order_status_updated', (data: any) => {
      console.log('[NOTIF WS] order_status_updated:', data);
      const code = data.orderCode || (data.id ? `ORD-${String(data.id).slice(0, 8)}` : 'Đơn hàng');
      const status = String(data.status || '').toUpperCase();

      if (status === 'COMPLETED' || status === 'DELIVERED') {
        addNotification({
          title: 'Giao hàng thành công',
          message: `Đơn hàng #${code} đã được giao tận tay khách hàng thành công.`,
          type: 'ORDER',
          level: 'success',
          link: '/orders',
          metadata: data,
        });
      } else if (status === 'CANCELLED' || status === 'FAILED_DELIVERY') {
        addNotification({
          title: 'Đơn hàng gặp sự cố / Đã hủy',
          message: `Đơn hàng #${code} đã bị hủy hoặc giao thất bại.`,
          type: 'ORDER',
          level: 'danger',
          link: '/orders',
          metadata: data,
        });
      }
      refreshPendingCounts();
    });

    // 3. Outbound Order Created Event
    socket.on('outbound_order_created', (data: any) => {
      console.log('[NOTIF WS] outbound_order_created:', data);
      const code = data.orderCode || data.slipCode || (data.id ? `OB-${String(data.id).slice(0, 8)}` : 'Phiếu xuất');
      addNotification({
        title: 'Phiếu xuất kho mới',
        message: `Phiếu xuất #${code} đã được lập và đang chờ bộ phận kho tiếp nhận soạn hàng.`,
        type: 'OUTBOUND',
        level: 'info',
        link: '/outbound',
        metadata: data,
      });
      refreshPendingCounts();
    });

    // 4. Outbound Order Updated Event
    socket.on('outbound_order_updated', () => {
      refreshPendingCounts();
    });

    // 5. Customer Chat Message Event
    socket.on('chat_message', (data: any) => {
      console.log('[NOTIF WS] chat_message:', data);
      if (data.senderRole === 'CUSTOMER' || !data.senderRole) {
        // Customer sent a new message -> unmark from read list so badge triggers!
        if (data.sessionId) {
          setReadChatSessionIds(prev => {
            const next = new Set(prev);
            next.delete(data.sessionId);
            try {
              localStorage.setItem(READ_CHATS_STORAGE_KEY, JSON.stringify(Array.from(next)));
            } catch (e) {}
            return next;
          });
        }

        addNotification({
          title: 'Khách hàng gửi tin nhắn tư vấn',
          message: `${data.senderName || 'Khách hàng'}: "${data.text?.slice(0, 50) || 'Đã gửi một tin nhắn mới'}"`,
          type: 'CHAT',
          level: 'info',
          link: '/sales?tab=chat',
          metadata: data,
        });
        refreshPendingCounts();
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [addNotification, refreshPendingCounts]);

  const value = useMemo(() => ({
    notifications,
    unreadCount,
    pendingOrdersCount,
    pendingOutboundsCount,
    pendingChatsCount,
    recentToast,
    markAsRead,
    markAllAsRead,
    clearAll,
    dismissToast,
    refreshPendingCounts,
    markChatSessionAsRead,
    markAllChatsAsRead,
  }), [
    notifications,
    unreadCount,
    pendingOrdersCount,
    pendingOutboundsCount,
    pendingChatsCount,
    recentToast,
    markAsRead,
    markAllAsRead,
    clearAll,
    dismissToast,
    refreshPendingCounts,
    markChatSessionAsRead,
    markAllChatsAsRead,
  ]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
