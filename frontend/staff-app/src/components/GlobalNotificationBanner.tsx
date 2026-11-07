import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  ArrowRight,
  X,
  WifiOff,
  RefreshCw,
  PackageCheck,
  Download,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useStaffWebSocket } from '../context/WebSocketContext';
import { useAuth } from '../context/AuthContext';
import { offlineSync, SyncTask } from '../services/offlineSync';
import { voiceAssistant } from '../utils/voiceAssistant';
import { ShiftHandoverModal } from './ShiftHandoverModal';
import { IncidentReportModal } from './IncidentReportModal';

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

  // Voice toggle state
  const [isVoiceOn, setIsVoiceOn] = useState<boolean>(voiceAssistant.isEnabled());

  // Order Notification
  const [notification, setNotification] = useState<NotificationData | null>(null);

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

    if (['outbound_order_created', 'new_order', 'order_created'].includes(lastEvent.type)) {
      // Audio cue for new picking wave/order
      voiceAssistant.announceNewPickingOrder();

      setNotification({
        orderId,
        orderCode,
        destination,
        totalItems,
        type: 'PICKING',
        title: 'BẠN CÓ ĐƠN SOẠN HÀNG MỚI',
        message: `${orderCode} • ${destination} (${totalItems} món)`,
        actionLabel: 'Soạn Hàng Ngay',
        actionRoute: orderId ? `/picking?orderId=${orderId}` : '/picking',
      });

      const timer = setTimeout(() => {
        setNotification(null);
      }, 9000);
      return () => clearTimeout(timer);
    }

    if (lastEvent.type === 'order_status_updated' || lastEvent.type === 'outbound_order_updated') {
      const status = (data?.status || '').toUpperCase();
      // If status indicates order is picked and ready for packing
      if (status === 'PICKED' || status === 'PACKING' || data?.isReadyForPacking) {
        voiceAssistant.announceNewPackingOrder();

        setNotification({
          orderId,
          orderCode,
          destination,
          totalItems,
          type: 'PACKING',
          title: 'BẠN CÓ ĐƠN ĐÓNG GÓI MỚI',
          message: `${orderCode} đã soạn xong • Cần đóng gói & dán tem`,
          actionLabel: 'Đóng Gói Ngay',
          actionRoute: orderId ? `/packing?orderId=${orderId}` : '/packing',
        });

        const timer = setTimeout(() => {
          setNotification(null);
        }, 9000);
        return () => clearTimeout(timer);
      } else if (status === 'PENDING' || status === 'NEW' || status === 'ASSIGNED') {
        voiceAssistant.announceNewPickingOrder();

        setNotification({
          orderId,
          orderCode,
          destination,
          totalItems,
          type: 'PICKING',
          title: 'ĐƠN SOẠN HÀNG MỚI ĐÃ GÁN VÀO KHO',
          message: `${orderCode} • ${destination} (${totalItems} món)`,
          actionLabel: 'Soạn Hàng Ngay',
          actionRoute: orderId ? `/picking?orderId=${orderId}` : '/picking',
        });

        const timer = setTimeout(() => {
          setNotification(null);
        }, 9000);
        return () => clearTimeout(timer);
      }
    }

    if (lastEvent.type === 'inbound_order_created' || lastEvent.type === 'lot_imported') {
      voiceAssistant.announceNewInboundOrder();

      setNotification({
        orderId,
        orderCode: data?.receiptCode || orderCode,
        destination: data?.supplierName || 'Nhà cung cấp',
        totalItems,
        type: 'INBOUND',
        title: 'BẠN CÓ ĐƠN NHẬP KHO MỚI',
        message: `Chuyến hàng mới cần tiếp nhận & xếp kệ lưu trữ`,
        actionLabel: 'Nhập Kho Ngay',
        actionRoute: '/inbound',
      });

      const timer = setTimeout(() => {
        setNotification(null);
      }, 9000);
      return () => clearTimeout(timer);
    }
  }, [lastEvent]);

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
            backgroundColor: !isOnline ? '#fef2f2' : '#eff6ff',
            border: `1.5px solid ${!isOnline ? '#ef4444' : '#3b82f6'}`,
            color: !isOnline ? '#991b1b' : '#1e40af',
            borderRadius: '20px',
            padding: '6px 14px',
            fontSize: '11px',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            animation: 'slideDown 0.3s ease-out',
          }}
        >
          {!isOnline ? (
            <>
              <WifiOff size={14} color="#ef4444" />
              <span>Chế độ Ngoại Tuyến (Đã lưu {pendingTasks.length} tác vụ chờ gửi)</span>
            </>
          ) : (
            <>
              <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} color="#3b82f6" />
              <span>Đang đồng bộ {pendingTasks.length} tác vụ lên máy chủ...</span>
            </>
          )}
        </div>
      )}

      {/* Floating Real-time Order Notification Banner */}
      {notification && (
        <div
          style={{
            position: 'fixed',
            top: '12px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 'calc(100% - 24px)',
            maxWidth: '516px',
            zIndex: 99999,
            backgroundColor: '#ffffff',
            border: `2px solid ${
              notification.type === 'PACKING' ? '#9333ea' : notification.type === 'INBOUND' ? '#059669' : '#008848'
            }`,
            borderRadius: '18px',
            padding: '14px 16px',
            boxShadow: '0 12px 35px rgba(0, 0, 0, 0.15), 0 4px 12px rgba(0,0,0,0.06)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            animation: 'slideDown 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  backgroundColor:
                    notification.type === 'PACKING'
                      ? '#f3e8ff'
                      : notification.type === 'INBOUND'
                      ? '#d1fae5'
                      : '#dcfce7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {notification.type === 'PACKING' ? (
                  <PackageCheck size={20} color="#9333ea" />
                ) : notification.type === 'INBOUND' ? (
                  <Download size={20} color="#059669" />
                ) : (
                  <Bell size={20} color="#008848" />
                )}
              </div>
              <div>
                <div
                  style={{
                    fontSize: '12px',
                    fontWeight: 900,
                    color:
                      notification.type === 'PACKING'
                        ? '#9333ea'
                        : notification.type === 'INBOUND'
                        ? '#059669'
                        : '#008848',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Bell size={12} color="#059669" />
                  <span>{notification.title}</span>
                </div>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                  {notification.message}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {/* Quick Voice Toggle Button */}
              <button
                onClick={() => voiceAssistant.toggle()}
                title={isVoiceOn ? 'Âm thanh thông báo: Đang BẬT' : 'Âm thanh thông báo: Đang TẮT'}
                style={{
                  backgroundColor: isVoiceOn ? '#f0fdf4' : '#f8fafc',
                  border: `1px solid ${isVoiceOn ? '#86efac' : '#e2e8f0'}`,
                  borderRadius: '8px',
                  color: isVoiceOn ? '#16a34a' : '#94a3b8',
                  cursor: 'pointer',
                  padding: '5px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {isVoiceOn ? <Volume2 size={15} /> : <VolumeX size={15} />}
              </button>

              <button
                onClick={() => setNotification(null)}
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', marginTop: '2px' }}>
            <button
              onClick={() => {
                const route = notification.actionRoute;
                setNotification(null);
                navigate(route);
              }}
              style={{
                flex: 1,
                background:
                  notification.type === 'PACKING'
                    ? 'linear-gradient(135deg, #9333ea 0%, #7e22ce 100%)'
                    : notification.type === 'INBOUND'
                    ? 'linear-gradient(135deg, #059669 0%, #047857 100%)'
                    : 'linear-gradient(135deg, #008848 0%, #059669 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                padding: '9px 14px',
                fontSize: '12.5px',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              }}
            >
              <span>{notification.actionLabel}</span>
              <ArrowRight size={14} />
            </button>

            <button
              onClick={() => setNotification(null)}
              style={{
                backgroundColor: '#f1f5f9',
                color: '#64748b',
                border: '1px solid #cbd5e1',
                borderRadius: '10px',
                padding: '9px 14px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Đóng
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
