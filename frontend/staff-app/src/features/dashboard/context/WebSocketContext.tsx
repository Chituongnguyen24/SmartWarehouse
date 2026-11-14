import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

import { getBackendHost, getServiceBaseUrl } from '@/shared';

const getSocketUrl = () => getServiceBaseUrl(3004);

export interface OrderLockInfo {
  userId: string;
  userName: string;
  role: string;
  lockedAt: string;
}

interface WebSocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  activeLocks: Record<string, OrderLockInfo>;
  lockOrder: (orderId: string, user: { userId: string; userName: string; role?: string }) => Promise<boolean>;
  unlockOrder: (orderId: string, userId?: string) => Promise<boolean>;
  isLockedByOther: (orderId: string, currentUserId?: string) => OrderLockInfo | null;
  lastEvent: { type: string; data: any; timestamp: string } | null;
  refreshLocks: () => Promise<void>;
  sendMessage: (event: string, data: any) => void;
}

const WebSocketContext = createContext<WebSocketContextType>({
  socket: null,
  isConnected: false,
  activeLocks: {},
  lockOrder: async () => false,
  unlockOrder: async () => false,
  isLockedByOther: () => null,
  lastEvent: null,
  refreshLocks: async () => {},
  sendMessage: () => {},
});

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [activeLocks, setActiveLocks] = useState<Record<string, OrderLockInfo>>({});
  const [lastEvent, setLastEvent] = useState<{ type: string; data: any; timestamp: string } | null>(null);

  // Fetch initial active locks from backend
  const refreshLocks = useCallback(async () => {
    try {
      const res = await fetch(`${getServiceBaseUrl(3007)}/outbound-orders/locks`);
      if (res.ok) {
        const data = await res.json();
        setActiveLocks(data || {});
      }
    } catch (e) {
      console.warn('Failed to fetch initial order locks:', e);
    }
  }, []);

  useEffect(() => {
    refreshLocks();

    const s = io(getSocketUrl(), {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 20,
      reconnectionDelay: 2000,
    });

    s.on('connect', () => {
      console.log('[MOBILE WS] Connected to Real-time Gateway:', s.id);
      setIsConnected(true);
    });

    s.on('connect_error', (err) => {
      console.warn('[MOBILE WS] Connection error:', err?.message || err);
    });

    s.on('disconnect', (reason) => {
      console.log('[MOBILE WS] Disconnected from Gateway:', reason);
      setIsConnected(false);
    });

    // Real-time Event Listeners
    const handleEvent = (type: string, data: any) => {
      console.log(`[MOBILE WS EVENT] ${type}:`, data);
      setLastEvent({ type, data, timestamp: new Date().toISOString() });

      if (type === 'order_locked' && data?.orderId && data?.lock) {
        setActiveLocks(prev => ({ ...prev, [data.orderId]: data.lock }));
      } else if (type === 'order_unlocked' && data?.orderId) {
        setActiveLocks(prev => {
          const next = { ...prev };
          delete next[data.orderId];
          return next;
        });
      }
    };

    s.on('order_locked', data => handleEvent('order_locked', data));
    s.on('order_unlocked', data => handleEvent('order_unlocked', data));
    s.on('outbound_order_created', data => handleEvent('outbound_order_created', data));
    s.on('new_order', data => handleEvent('outbound_order_created', data));
    s.on('order_created', data => handleEvent('outbound_order_created', data));
    s.on('outbound_order_updated', data => handleEvent('outbound_order_updated', data));
    s.on('order_status_updated', data => handleEvent('order_status_updated', data));
    s.on('order_cancelled', data => handleEvent('order_cancelled', data));
    s.on('outbound_confirmed', data => handleEvent('order_status_updated', data));
    s.on('inbound_order_created', data => handleEvent('inbound_order_created', data));
    s.on('lot_imported', data => handleEvent('lot_imported', data));
    s.on('all_alerts', data => {
      if (data?.channel) {
        handleEvent(data.channel, data.data || data);
      } else {
        handleEvent('all_alerts', data);
      }
    });

    setSocket(s);

    // Periodic poll locks fallback every 10 seconds
    const interval = setInterval(refreshLocks, 10000);

    return () => {
      clearInterval(interval);
      s.disconnect();
    };
  }, [refreshLocks]);

  // Acquire Lock on an Order
  const lockOrder = async (orderId: string, user: { userId: string; userName: string; role?: string }): Promise<boolean> => {
    try {
      const res = await fetch(`${getServiceBaseUrl(3007)}/outbound-orders/${orderId}/lock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user),
      });

      if (res.ok) {
        const data = await res.json();
        if (data?.lock) {
          setActiveLocks(prev => ({ ...prev, [orderId]: data.lock }));
        }
        return true;
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.message || 'Đơn hàng đang được thao tác bởi người khác!');
        return false;
      }
    } catch (e) {
      console.warn('lockOrder error:', e);
      return true; // Allow offline/optimistic pass
    }
  };

  // Release Lock on an Order
  const unlockOrder = async (orderId: string, userId?: string): Promise<boolean> => {
    try {
      await fetch(`${getServiceBaseUrl(3007)}/outbound-orders/${orderId}/unlock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      setActiveLocks(prev => {
        const next = { ...prev };
        delete next[orderId];
        return next;
      });

      return true;
    } catch (e) {
      return false;
    }
  };

  // Check if an order is locked by someone else
  const isLockedByOther = useCallback(
    (orderId: string, currentUserId?: string): OrderLockInfo | null => {
      const lock = activeLocks[orderId];
      if (!lock) return null;
      if (currentUserId && lock.userId === currentUserId) return null;
      return lock;
    },
    [activeLocks]
  );

  const sendMessage = useCallback((event: string, data: any) => {
    if (socket && socket.connected) {
      socket.emit(event, data);
    }
  }, [socket]);

  return (
    <WebSocketContext.Provider
      value={{
        socket,
        isConnected,
        activeLocks,
        lockOrder,
        unlockOrder,
        isLockedByOther,
        lastEvent,
        refreshLocks,
        sendMessage,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
};

export const useStaffWebSocket = () => useContext(WebSocketContext);
export const useWebSocketContext = useStaffWebSocket;
