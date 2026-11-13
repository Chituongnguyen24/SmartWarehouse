import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  X,
  WifiOff,
  RefreshCw,
  PackageCheck,
  PackagePlus,
  Download,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useStaffWebSocket, ShiftHandoverModal, IncidentReportModal } from '@/features/dashboard';
import { useAuth } from '@/features/auth';
import { offlineSync, SyncTask } from '../services/offlineSync';
import { voiceAssistant } from '@/features/picking';

interface NotificationData {
  orderId?: string;
  orderCode?: string;
  destination?: string;
  totalItems?: number;
  title: string;
  message: string;
  type: 'PICKING' | 'PACKING' | 'INBOUND' | 'ALERT';
  actionLabel: string;
  actionRoute: string;
}

export const GlobalNotificationBanner: React.FC = () => {
  const { lastEvent } = useStaffWebSocket();
  const { user, activeWarehouse } = useAuth();
  const effectiveWhCode = user?.warehouseCode || activeWarehouse || 'WH-006';
  const navigate = useNavigate();
  const location = useLocation();

  // Voice toggle state
  const [isVoiceOn, setIsVoiceOn] = useState<boolean>(voiceAssistant.isEnabled());

  // Order Notification
  const [notification, setNotification] = useState<NotificationData | null>(null);

  // Debounce sets to prevent spamming notifications for the same order
  const recentNotifiedPackingRef = useRef<Set<string>>(new Set());
  const recentNotifiedPickingRef = useRef<Set<string>>(new Set());

  // Offline Sync State
  const [isOnline, setIsOnline] = useState<boolean>(offlineSync.isOnline());
  const [pendingTasks, setPendingTasks] = useState<SyncTask[]>(offlineSync.getQueue());

  // Modal triggers
  const [isShiftModalOpen, setIsShiftModalOpen] = useState<boolean>(false);
  const [isIncidentModalOpen, setIsIncidentModalOpen] = useState<boolean>(false);

  useEffect(() => {
    const unsubSync = offlineSync.subscribe((tasks, online) => {
      setIsOnline(online);
      setPendingTasks(tasks);
    });
    const unsubVoice = voiceAssistant.subscribe(enabled => {
      setIsVoiceOn(enabled);
    });
    return () => {
      unsubSync();
      unsubVoice();
    };
  }, []);

  const isSameWarehouse = (a?: string, b?: string) => {
    if (!a || !b || a === 'ALL' || b === 'ALL') return true;
    const na = a.toUpperCase().trim();
    const nb = b.toUpperCase().trim();
    if (na === nb) return true;
    const isGoVapA = na === 'GV' || na === 'WH-006' || na.includes('GÒ VẤP') || na.includes('GO VAP');
    const isGoVapB = nb === 'GV' || nb === 'WH-006' || nb.includes('GÒ VẤP') || nb.includes('GO VAP');
    if (isGoVapA && isGoVapB) return true;
    return false;
  };

  useEffect(() => {
    if (!lastEvent) return;

    const rawData = lastEvent.data;
    const data = rawData?.order || rawData?.payload || rawData;
    const orderWh = data?.warehouseCode || data?.assignedWarehouseCode || data?.warehouseId || data?.assignedWarehouseId || rawData?.warehouseCode || rawData?.assignedWarehouseCode;

    if (orderWh && effectiveWhCode && !isSameWarehouse(orderWh, effectiveWhCode)) {
      return; // Ignore orders belonging to other warehouses
    }

    const orderCode = data?.orderCode || data?.code || (data?.id ? `#${String(data.id).slice(0, 8)}` : 'Đơn hàng mới');
    const destination = data?.destination || data?.customerName || data?.shippingAddress || 'Khu vực giao hàng';
    const totalItems = data?.totalItems || data?.items?.length || (Array.isArray(data?.items) ? data.items.reduce((s: number, i: any) => s + (Number(i.quantity || i.requestedQuantity) || 1), 0) : 1);
    const orderId = data?.orderId || data?.id;
    const status = (data?.status || '').toUpperCase();

    // ──────────────────────────────────────────────────────────────────────────
    // 1. NOTIFICATION FOR NEW PICKING ORDER (Only on genuine creation events)
    // ──────────────────────────────────────────────────────────────────────────
    if (['outbound_order_created', 'new_order', 'order_created'].includes(lastEvent.type)) {
      // TUYỆT ĐỐI BỎ QUA nếu đơn này đã được gán tài xế hoặc đã qua khâu soạn hàng
      const hasDriverAssigned = Boolean(
        data?.assignedDriverId || data?.driverId || data?.assignedDriverName || data?.driverName ||
        rawData?.assignedDriverId || rawData?.driverId || rawData?.assignedDriverName || rawData?.driverName
      );
      const isPastPicking = ['PICKED', 'PACKING', 'PACKED', 'READY_FOR_DELIVERY', 'CONFIRMED', 'SHIPPED', 'DELIVERING', 'DELIVERED', 'COMPLETED', 'CANCELLED'].includes(status);
      const isAlreadyHandledLocally = (
        (orderId && localStorage.getItem(`citymart_order_packed_${orderId}`) === 'true') ||
        (orderCode && localStorage.getItem(`citymart_order_packed_${orderCode}`) === 'true') ||
        (orderId && localStorage.getItem(`citymart_order_ready_pack_${orderId}`) === 'true') ||
        (orderCode && localStorage.getItem(`citymart_order_ready_pack_${orderCode}`) === 'true')
      );

      if (hasDriverAssigned || isPastPicking || isAlreadyHandledLocally) {
        return;
      }

      // Debounce check
      if (recentNotifiedPickingRef.current.has(orderCode)) return;
      recentNotifiedPickingRef.current.add(orderCode);
      setTimeout(() => recentNotifiedPickingRef.current.delete(orderCode), 60000);

      voiceAssistant.announceNewPickingOrder();

      setNotification({
        orderId,
        orderCode,
        destination,
        totalItems,
        type: 'PICKING',
        title: 'Đơn lấy hàng mới',
        message: `${orderCode} • ${totalItems} món`,
        actionLabel: 'Soạn hàng',
        actionRoute: orderId ? `/picking?orderId=${orderId}` : '/picking',
      });

      const timer = setTimeout(() => {
        setNotification(null);
      }, 3500);
      return () => clearTimeout(timer);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 2. NOTIFICATION FOR READY FOR PACKING (Only when status is strictly PICKED)
    // ──────────────────────────────────────────────────────────────────────────
    if (lastEvent.type === 'order_status_updated' || lastEvent.type === 'outbound_order_updated') {
      // TUYỆT ĐỐI BỎ QUA nếu đơn này đã được đóng gói hoặc đang đóng gói hoặc đã hoàn tất
      const isAlreadyPackedOrDone = (
        ['PACKED', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'COMPLETED', 'CANCELLED', 'PACKING'].includes(status) ||
        (orderId && localStorage.getItem(`citymart_order_packed_${orderId}`) === 'true') ||
        (orderCode && localStorage.getItem(`citymart_order_packed_${orderCode}`) === 'true')
      );
      if (isAlreadyPackedOrDone) {
        return;
      }

      // TUYỆT ĐỐI BỎ QUA nếu nhân viên đang đứng ở trang Đóng gói (/packing)
      if (location.pathname.startsWith('/packing')) {
        return;
      }

      // TUYỆT ĐỐI BỎ QUA nếu đơn vừa được thao tác từ trang soạn hàng của máy này
      if (orderId && localStorage.getItem(`citymart_order_just_transferred_${orderId}`) === 'true') {
        return;
      }

      // Chỉ thông báo DUY NHẤT khi status là PICKED (hoàn tất gom hàng)
      if (status === 'PICKED') {
        if (recentNotifiedPackingRef.current.has(orderCode)) return;
        recentNotifiedPackingRef.current.add(orderCode);
        setTimeout(() => recentNotifiedPackingRef.current.delete(orderCode), 60000);

        voiceAssistant.announceNewPackingOrder();

        setNotification({
          orderId,
          orderCode,
          destination,
          totalItems,
          type: 'PACKING',
          title: 'Đơn cần đóng gói',
          message: `${orderCode}`,
          actionLabel: 'Đóng gói',
          actionRoute: orderId ? `/packing?orderId=${orderId}` : '/packing',
        });

        const timer = setTimeout(() => {
          setNotification(null);
        }, 3000);
        return () => clearTimeout(timer);
      }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 3. NOTIFICATION FOR INBOUND RECEIPT
    // ──────────────────────────────────────────────────────────────────────────
    if (lastEvent.type === 'inbound_order_created' || lastEvent.type === 'lot_imported') {
      voiceAssistant.announceNewInboundOrder();

      setNotification({
        orderId,
        orderCode: data?.receiptCode || orderCode,
        destination: data?.supplierName || 'Nhà cung cấp',
        totalItems,
        type: 'INBOUND',
        title: 'Chuyến hàng nhập mới',
        message: `${data?.receiptCode || orderCode} • Cần kiểm nhận`,
        actionLabel: 'Nhập kho',
        actionRoute: '/inbound',
      });

      const timer = setTimeout(() => {
        setNotification(null);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [lastEvent, location.pathname, effectiveWhCode]);

  return (
    <>
      {/* Offline / Sync Status Pill Banner */}
      {(!isOnline || pendingTasks.length > 0) && (
        <div
          style={{
            position: 'fixed',
            top: '8px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 99998,
            backgroundColor: !isOnline ? '#fef2f2' : '#f0f9ff',
            border: `1px solid ${!isOnline ? '#fecaca' : '#bae6fd'}`,
            color: !isOnline ? '#991b1b' : '#075985',
            borderRadius: '9999px',
            padding: '5px 12px',
            fontSize: '11px',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
          }}
        >
          {!isOnline ? (
            <>
              <WifiOff size={13} color="#991b1b" />
              <span>Ngoại tuyến ({pendingTasks.length} tác vụ chờ đồng bộ)</span>
            </>
          ) : (
            <>
              <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} color="#075985" />
              <span>Đang đồng bộ {pendingTasks.length} tác vụ...</span>
            </>
          )}
        </div>
      )}

      {/* Floating Real-time Order Notification Banner (Flat B2B Design per GEMINI.md) */}
      {notification && (
        <div
          style={{
            position: 'fixed',
            top: 'max(10px, env(safe-area-inset-top, 14px))',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 'calc(100% - 24px)',
            maxWidth: '390px',
            zIndex: 99999,
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '10px 12px',
            boxShadow: '0 4px 12px rgba(15, 23, 42, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                backgroundColor:
                  notification.type === 'PACKING'
                    ? '#f0f9ff'
                    : notification.type === 'INBOUND'
                    ? '#f0fdf4'
                    : '#f0fdf4',
                border: `1px solid ${
                  notification.type === 'PACKING'
                    ? '#bae6fd'
                    : '#bbf7d0'
                }`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {notification.type === 'PACKING' ? (
                <PackageCheck size={16} color="#0284c7" />
              ) : notification.type === 'INBOUND' ? (
                <Download size={16} color="#0f766e" />
              ) : (
                <PackagePlus size={16} color="#0f766e" />
              )}
            </div>

            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                {notification.title}
              </div>
              <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {notification.message}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            <button
              onClick={() => {
                const route = notification.actionRoute;
                setNotification(null);
                navigate(route);
              }}
              style={{
                backgroundColor: notification.type === 'PACKING' ? '#0284c7' : '#0f766e',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 10px',
                fontSize: '11.5px',
                fontWeight: 500,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {notification.actionLabel}
            </button>

            <button
              onClick={() => setNotification(null)}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="Đóng"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      <ShiftHandoverModal
        isOpen={isShiftModalOpen}
        onClose={() => setIsShiftModalOpen(false)}
      />

      <IncidentReportModal
        isOpen={isIncidentModalOpen}
        onClose={() => setIsIncidentModalOpen(false)}
      />
    </>
  );
};
