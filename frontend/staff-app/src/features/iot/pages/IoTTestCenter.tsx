import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Cpu,
  Layers,
  Wifi,
  WifiOff,
  Thermometer,
  Droplets,
  AlertTriangle,
  Volume2,
  VolumeX,
  ShieldCheck,
  RotateCcw,
  Sliders,
  Clock,
  Radio,
  CheckCircle2,
  RefreshCw,
  Bell,
  Play,
  Square,
} from 'lucide-react';
import {
  getIotShelvesStatusApi,
  locateShelfIotApi,
  chirpShelfIotApi,
  stopShelfIotApi,
  completeShelfIotApi,
  resetAllShelvesIotApi,
  getIotClimateStatusApi,
  simulateIotClimateApi,
  testIotAlarmApi,
  silenceIotAlarmApi,
  clearIotAlarmApi,
  getIotLogsApi,
  fetchOutboundOrders,
  updatePickedItemsApi,
  extractDemoIotShelf,
  DemoIotShelfCode,
  ApiOutboundOrder,
} from '@/shared';

export const IoTTestCenter: React.FC = () => {
  const navigate = useNavigate();

  // Shelf state
  const [shelvesData, setShelvesData] = useState<any>(null);
  const [climateData, setClimateData] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Simulation controls
  const [simEnabled, setSimEnabled] = useState<boolean>(false);
  const [simTemp, setSimTemp] = useState<number>(2.8);
  const [simHum, setSimHum] = useState<number>(65.0);

  // Outbound Orders & Products Sequential Pick-to-Light on IoT Test Center
  const [iotOrders, setIotOrders] = useState<ApiOutboundOrder[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [guidedStep, setGuidedStep] = useState<{
    orderId: string;
    orderCode: string;
    itemId: string;
    shelfCode: DemoIotShelfCode;
    slotId: string;
    productName: string;
    qty: number;
    step: number;
    totalSteps: number;
    baselineStopSeq: number;
    startedAt: number;
  } | null>(null);
  const guidedStepRef = React.useRef<typeof guidedStep>(null);
  guidedStepRef.current = guidedStep;
  const iotOrdersRef = React.useRef<ApiOutboundOrder[]>([]);
  iotOrdersRef.current = iotOrders;
  const isAdvancingRef = React.useRef<boolean>(false);

  // Status message / toast
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const showFeedback = (type: 'success' | 'error' | 'info', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  // Fetch all IoT telemetry and shelf state
  const refreshAll = useCallback(async () => {
    try {
      const [shelvesRes, climateRes, logsRes, ordersRes] = await Promise.all([
        getIotShelvesStatusApi(),
        getIotClimateStatusApi(),
        getIotLogsApi(30),
        fetchOutboundOrders('WH-006'),
      ]);

      if (shelvesRes) setShelvesData(shelvesRes);
      if (Array.isArray(ordersRes)) setIotOrders(ordersRes);
      if (climateRes) {
        setClimateData(climateRes);
        setSimEnabled(climateRes.isSimulated || false);
        if (climateRes.isSimulated) {
          setSimTemp(climateRes.temperature);
          setSimHum(climateRes.humidity);
        }
      }
      if (Array.isArray(logsRes)) setLogs(logsRes);
    } catch (e) {
      console.warn('Refresh IoT Center error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshAll();
    const interval = setInterval(refreshAll, 2000);
    return () => clearInterval(interval);
  }, [refreshAll]);

  // Shelf actions
  const triggerProductShelfIot = useCallback(
    async (order: ApiOutboundOrder, item: any, step: number, totalSteps: number) => {
      const shelfCode = extractDemoIotShelf(item.slotId || item.location);
      if (!shelfCode) {
        showFeedback('info', `Sản phẩm "${item.productName}" nằm ở ${item.slotId || 'kệ thường'} (ngoài 3 kệ demo IoT A1, A2, A3).`);
        return;
      }
      isAdvancingRef.current = true;
      try {
        const res = await locateShelfIotApi({
          warehouseCode: order.warehouseCode || 'WH-006',
          shelfCode,
          slotCode: item.slotId || `${shelfCode}-01`,
          productName: item.productName,
          qty: (item as any).requestedQuantity || item.quantity || 1,
          step,
          totalSteps,
          orderId: order.orderCode || order.id,
        });
        let baselineStopSeq = 0;
        if (typeof res?.stopSeq === 'number') baselineStopSeq = res.stopSeq;
        else if (typeof res?.shelf?.stopSeq === 'number') baselineStopSeq = res.shelf.stopSeq;
        else if (typeof shelvesData?.shelves?.[shelfCode]?.stopSeq === 'number') {
          baselineStopSeq = shelvesData.shelves[shelfCode].stopSeq;
        }
        const nextSession = {
          orderId: order.id,
          orderCode: order.orderCode,
          itemId: item.id || `${order.id}-${step}`,
          shelfCode,
          slotId: item.slotId || shelfCode,
          productName: item.productName || 'Sản phẩm xuất kho',
          qty: (item as any).requestedQuantity || item.quantity || 1,
          step,
          totalSteps,
          baselineStopSeq,
          startedAt: Date.now(),
        };
        guidedStepRef.current = nextSession;
        setGuidedStep(nextSession);
        showFeedback('success', `Bước ${step}/${totalSteps}: Đã bật LED & Còi tại Kệ ${shelfCode} cho "${nextSession.productName}". Bấm STOP tại kệ để qua món tiếp theo.`);
        await refreshAll();
      } finally {
        isAdvancingRef.current = false;
      }
    },
    [shelvesData, refreshAll]
  );

  const handleClickOrderIot = async (order: ApiOutboundOrder) => {
    setSelectedOrderId(order.id);
    const iotItems = (order.items || []).filter(it => extractDemoIotShelf(it.slotId || it.location) !== null);
    const pendingIot = iotItems.filter(
      it => (it as any).status !== 'PICKED' && (it.pickedQuantity || 0) < ((it as any).requestedQuantity || it.quantity || 1)
    );
    const first = pendingIot[0] || iotItems[0];
    if (!first) {
      showFeedback('info', `Đơn ${order.orderCode} không có sản phẩm thuộc 3 kệ demo IoT (A1, A2, A3).`);
      return;
    }
    const stepIdx = iotItems.findIndex(it => it.id === first.id);
    await triggerProductShelfIot(order, first, stepIdx >= 0 ? stepIdx + 1 : 1, iotItems.length);
  };

  const advanceOrderIotStep = useCallback(
    async (manualStop = false) => {
      const session = guidedStepRef.current;
      if (!session || isAdvancingRef.current) return;
      isAdvancingRef.current = true;
      guidedStepRef.current = null;
      setGuidedStep(null);

      try {
        if (manualStop) {
          await stopShelfIotApi({ warehouseCode: 'WH-006', shelfCode: session.shelfCode }).catch(() => {});
        }
        const currentOrd = iotOrdersRef.current.find(o => o.id === session.orderId);
        if (!currentOrd) {
          isAdvancingRef.current = false;
          return;
        }
        const updatedItems = (currentOrd.items || []).map(it =>
          it.id === session.itemId
            ? { ...it, status: 'PICKED', pickedQuantity: (it as any).requestedQuantity || it.quantity || 1 }
            : it
        );
        const updatedOrd: ApiOutboundOrder = {
          ...currentOrd,
          items: updatedItems,
        };
        setIotOrders(prev => prev.map(o => (o.id === currentOrd.id ? updatedOrd : o)));
        await updatePickedItemsApi(currentOrd.id, [
          { id: session.itemId, pickedQuantity: session.qty, status: 'PICKED' },
        ]).catch(() => {});

        const iotItems = updatedItems.filter(it => extractDemoIotShelf(it.slotId || it.location) !== null);
        const remainingIot = iotItems.filter(
          it => (it as any).status !== 'PICKED' && (it.pickedQuantity || 0) < ((it as any).requestedQuantity || it.quantity || 1)
        );
        if (remainingIot.length > 0) {
          const nextItem = remainingIot[0];
          const nextStep = iotItems.length - remainingIot.length + 1;
          setTimeout(() => {
            isAdvancingRef.current = false;
            triggerProductShelfIot(updatedOrd, nextItem, nextStep, iotItems.length);
          }, 650);
        } else {
          isAdvancingRef.current = false;
          showFeedback('success', `Đã hoàn thành lấy toàn bộ sản phẩm trong đơn ${session.orderCode}!`);
          await refreshAll();
        }
      } catch {
        isAdvancingRef.current = false;
      }
    },
    [triggerProductShelfIot, refreshAll]
  );

  useEffect(() => {
    if (!guidedStep) return;
    const poll = setInterval(async () => {
      const session = guidedStepRef.current;
      if (!session || isAdvancingRef.current) return;
      try {
        const res = await getIotShelvesStatusApi();
        const sh = res?.shelves?.[session.shelfCode];
        if (!sh) return;
        const stopPressed =
          (typeof sh.stopSeq === 'number' && sh.stopSeq > session.baselineStopSeq) ||
          (sh.status === 'ARRIVED' && sh.arrivedAt && new Date(sh.arrivedAt).getTime() >= session.startedAt - 1500);
        if (stopPressed) {
          await advanceOrderIotStep(false);
        }
      } catch {}
    }, 800);
    return () => clearInterval(poll);
  }, [guidedStep, advanceOrderIotStep]);
  const handleLocateShelf = async (code: string) => {
    setActionLoading(`locate-${code}`);
    try {
      const res = await locateShelfIotApi({
        shelfCode: code,
        orderId: `ORD-${code}-DEMO`,
        productName: shelvesData?.shelves?.[code]?.label || `Hàng tại kệ ${code}`,
        qty: 1,
      });
      if (res?.success) {
        showFeedback(
          'success',
          res?.buzzerEnabled === false
            ? `Đã bật đèn định vị kệ ${code} (chế độ chỉ sáng đèn).`
            : `Đã kích hoạt đèn và còi định vị kệ ${code}.`,
        );
      } else {
        showFeedback('error', res?.message || `Không thể kích hoạt kệ ${code}`);
      }
      await refreshAll();
    } finally {
      setActionLoading(null);
    }
  };

  const handleChirpShelf = async (code: string) => {
    setActionLoading(`chirp-${code}`);
    try {
      const res = await chirpShelfIotApi({ shelfCode: code });
      if (res?.success) {
        showFeedback('info', `Đã bóp còi Smartkey định vị kệ ${code}.`);
      }
      await refreshAll();
    } finally {
      setActionLoading(null);
    }
  };

  const handleStopShelf = async (code: string) => {
    setActionLoading(`stop-${code}`);
    try {
      const res = await stopShelfIotApi({ shelfCode: code });
      if (res?.success) {
        showFeedback('info', `Đã tắt tín hiệu kệ ${code}. Trạng thái: Đã đến kệ (ARRIVED).`);
      }
      await refreshAll();
    } finally {
      setActionLoading(null);
    }
  };

  const handleResetAllShelves = async () => {
    setActionLoading('reset-all');
    try {
      await resetAllShelvesIotApi();
      showFeedback('success', 'Đã đặt lại toàn bộ 3 kệ A1, A2, A3 về trạng thái Sẵn sàng.');
      await refreshAll();
    } finally {
      setActionLoading(null);
    }
  };

  // Simulation handlers
  const handleApplySimulation = async (temp: number, hum: number, enabled: boolean) => {
    setActionLoading('simulate');
    try {
      const res = await simulateIotClimateApi({
        temperature: temp,
        humidity: hum,
        enabled,
      });
      if (res) {
        setClimateData(res);
        setSimEnabled(enabled);
        setSimTemp(temp);
        setSimHum(hum);
        showFeedback(
          'info',
          enabled
            ? `Đã áp dụng giả lập: ${temp}°C, ${hum}% độ ẩm.`
            : 'Đã tắt giả lập. Chuyển về đọc cảm biến thực tế SHT30.',
        );
      }
      await refreshAll();
    } finally {
      setActionLoading(null);
    }
  };

  // Alarm handlers
  const handleTestAlarm = async () => {
    setActionLoading('test-alarm');
    try {
      await testIotAlarmApi();
      showFeedback('warning', 'Đã phát tín hiệu thử nghiệm báo động đồng loạt 3 kệ!');
      await refreshAll();
    } finally {
      setActionLoading(null);
    }
  };

  const handleSilenceAlarm = async () => {
    setActionLoading('silence-alarm');
    try {
      await silenceIotAlarmApi(60);
      showFeedback('info', 'Đã tạm tắt còi trong 60 giây. Đèn cảnh báo vẫn duy trì.');
      await refreshAll();
    } finally {
      setActionLoading(null);
    }
  };

  const handleClearAlarm = async () => {
    setActionLoading('clear-alarm');
    try {
      const res = await clearIotAlarmApi();
      if (res.success) {
        showFeedback('success', res.data?.message || 'Đã khôi phục an toàn thành công!');
      } else {
        showFeedback('error', res.message || 'Không thể gỡ cảnh báo!');
      }
      await refreshAll();
    } finally {
      setActionLoading(null);
    }
  };

  const esp32Online = shelvesData?.mqtt?.esp32Online ?? false;
  const isAlarmActive = climateData?.isAlarmActive ?? false;
  const isSilenced = climateData?.isSilenced ?? false;

  const shelvesList = ['A1', 'A2', 'A3'];

  return (
    <div style={{ paddingBottom: '90px' }}>
      {/* Top Header Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px',
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          position: 'sticky',
          top: 0,
          zIndex: 40,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => navigate('/')}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              backgroundColor: '#f8fafc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#0f172a',
            }}
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
              Trung Tâm Kiểm Thử IoT
            </h1>
          </div>
        </div>

        <button
          onClick={refreshAll}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            padding: '6px 10px',
            backgroundColor: '#f1f5f9',
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            fontSize: '11px',
            fontWeight: 600,
            color: '#334155',
            cursor: 'pointer',
          }}
        >
          <RefreshCw size={13} />
          <span>Làm mới</span>
        </button>
      </div>

      {/* Floating Feedback Toast */}
      {feedback && (
        <div
          style={{
            margin: '12px 16px 0 16px',
            padding: '10px 14px',
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor:
              feedback.type === 'success'
                ? '#f0fdf4'
                : feedback.type === 'error'
                ? '#fef2f2'
                : '#f0f9ff',
            color:
              feedback.type === 'success'
                ? '#166534'
                : feedback.type === 'error'
                ? '#991b1b'
                : '#075985',
            border:
              feedback.type === 'success'
                ? '1px solid #bbf7d0'
                : feedback.type === 'error'
                ? '1px solid #fecaca'
                : '1px solid #bae6fd',
          }}
        >
          {feedback.type === 'success' && <CheckCircle2 size={16} />}
          {feedback.type === 'error' && <AlertTriangle size={16} />}
          {feedback.type === 'info' && <Radio size={16} />}
          <span style={{ flex: 1 }}>{feedback.message}</span>
        </div>
      )}

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Hardware & Gateway Connection Bar */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            padding: '12px 14px',
            border: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '6px',
                backgroundColor: esp32Online ? '#f0fdf4' : '#fef2f2',
                color: esp32Online ? '#166534' : '#991b1b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Cpu size={18} />
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>
                Bộ điều khiển ESP32 (Kho Gò Vấp)
              </div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>
                MQTT: {shelvesData?.mqtt?.brokerUrl || 'broker.emqx.io:1883'}
              </div>
            </div>
          </div>

          <div
            style={{
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              backgroundColor: esp32Online ? '#f0fdf4' : '#fef2f2',
              color: esp32Online ? '#166534' : '#991b1b',
              border: esp32Online ? '1px solid #bbf7d0' : '1px solid #fecaca',
            }}
          >
            {esp32Online ? <Wifi size={13} /> : <WifiOff size={13} />}
            <span>{esp32Online ? 'ĐANG KẾT NỐI' : 'MẤT TÍN HIỆU'}</span>
          </div>
        </div>

        {/* SECTION 0: INTERACTIVE ORDERS & PRODUCTS PICK-TO-LIGHT (KỆ A1, A2, A3) */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            padding: '14px',
            border: '1px solid #cbd5e1',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
              <Layers size={16} color="#0f766e" />
              <span>Đơn Hàng &amp; Sản Phẩm (Kệ A1–A3)</span>
            </div>
          </div>

          {guidedStep && (
            <div
              style={{
                backgroundColor: '#fffbeb',
                border: '1px solid #fde68a',
                borderRadius: '8px',
                padding: '10px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#92400e', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Radio size={14} color="#92400e" />
                  {guidedStep.orderCode} • Bước {guidedStep.step}/{guidedStep.totalSteps} • Kệ {guidedStep.shelfCode}
                </span>
                <button
                  type="button"
                  onClick={() => advanceOrderIotStep(true)}
                  style={{
                    backgroundColor: '#0f766e',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '5px 10px',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Xác nhận STOP &amp; Qua món kế
                </button>
              </div>
              <div style={{ fontSize: '12px', color: '#0f172a', fontWeight: 600 }}>
                <b>{guidedStep.productName}</b> (x{guidedStep.qty})
              </div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {iotOrders
              .filter(o => Array.isArray(o.items) && o.items.length > 0 && o.status !== 'CANCELLED')
              .slice(0, 5)
              .map(ord => {
                const isSelected = selectedOrderId === ord.id || guidedStep?.orderId === ord.id;
                const iotItems = (ord.items || []).filter(it => extractDemoIotShelf(it.slotId || it.location) !== null);
                const pendingIot = iotItems.filter(
                  it => (it as any).status !== 'PICKED' && (it.pickedQuantity || 0) < ((it as any).requestedQuantity || it.quantity || 1)
                );

                return (
                  <div
                    key={ord.id}
                    style={{
                      border: `1px solid ${isSelected ? '#0f766e' : '#e2e8f0'}`,
                      borderRadius: '8px',
                      backgroundColor: '#f8fafc',
                      padding: '10px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                    }}
                  >
                    <div
                      onClick={() => handleClickOrderIot(ord)}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        cursor: 'pointer',
                      }}
                    >
                      <span
                        style={{
                          backgroundColor: '#0f766e',
                          color: '#ffffff',
                          fontSize: '11.5px',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <Play size={11} />
                        {ord.orderCode}
                      </span>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: '#075985' }}>
                        {pendingIot.length > 0 ? `Bấm đơn để chạy (${pendingIot.length} kệ IoT)` : 'Đã hoàn tất'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {(ord.items || []).map((it, idx) => {
                        const shelfCode = extractDemoIotShelf(it.slotId || it.location);
                        const isPicked = (it as any).status === 'PICKED' || (it.pickedQuantity || 0) >= ((it as any).requestedQuantity || it.quantity || 1);
                        const isGuidedThis = guidedStep?.itemId === it.id;
                        const stepIdx = iotItems.findIndex(x => x.id === it.id);

                        return (
                          <div
                            key={it.id || `${ord.id}-${idx}`}
                            onClick={() => {
                              setSelectedOrderId(ord.id);
                              triggerProductShelfIot(
                                ord,
                                it,
                                stepIdx >= 0 ? stepIdx + 1 : 1,
                                Math.max(1, iotItems.length)
                              );
                            }}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              gap: '8px',
                              padding: '6px 8px',
                              borderRadius: '6px',
                              backgroundColor: isGuidedThis ? '#fffbeb' : isPicked ? '#f0fdf4' : '#ffffff',
                              border: `1px solid ${isGuidedThis ? '#d97706' : isPicked ? '#bbf7d0' : '#e2e8f0'}`,
                              cursor: 'pointer',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                              <span
                                style={{
                                  fontSize: '10.5px',
                                  fontWeight: 700,
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  backgroundColor: isGuidedThis ? '#d97706' : shelfCode ? '#0f766e' : '#64748b',
                                  color: '#ffffff',
                                }}
                              >
                                {shelfCode ? `Kệ ${shelfCode}` : it.slotId}
                              </span>
                              <span style={{ fontSize: '12px', fontWeight: 600, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {idx + 1}. {it.productName}
                              </span>
                            </div>
                            <span style={{ fontSize: '10.5px', fontWeight: 600, color: isGuidedThis ? '#92400e' : isPicked ? '#166534' : '#0f766e' }}>
                              {isGuidedThis ? 'Đang sáng đèn' : isPicked ? 'Đã lấy' : shelfCode ? 'Bấm bật đèn' : 'Ngoài IoT'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* SECTION 1: 3-SHELF PICK-TO-LIGHT CONTROLS */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            padding: '16px',
            border: '1px solid #e2e8f0',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '14px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={18} color="#0f766e" />
              <h2 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>
                Quản Lý 3 Kệ Hàng Pick-to-Light
              </h2>
            </div>

            <button
              onClick={handleResetAllShelves}
              disabled={actionLoading === 'reset-all'}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '5px 10px',
                backgroundColor: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 600,
                color: '#475569',
                cursor: 'pointer',
              }}
            >
              <RotateCcw size={12} />
              <span>Đặt lại cả 3 kệ</span>
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {shelvesList.map((code) => {
              const shelf = shelvesData?.shelves?.[code] || {
                code,
                label: code === 'A1' ? 'Thịt tươi CP' : code === 'A2' ? 'Sữa tươi Đà Lạt' : 'Rau củ VietGAP',
                status: 'IDLE',
                ledOn: false,
                buzzerOn: false,
                pinInfo: {
                  ledPin: code === 'A1' ? 25 : code === 'A2' ? 26 : 32,
                  buzzerPin: code === 'A1' ? 18 : code === 'A2' ? 19 : 23,
                  buttonPin: code === 'A1' ? 27 : code === 'A2' ? 14 : 33,
                },
              };

              const isLocating = shelf.status === 'LOCATING';
              const isArrived = shelf.status === 'ARRIVED';
              const isCompleted = shelf.status === 'COMPLETED';

              return (
                <div
                  key={code}
                  style={{
                    backgroundColor: isLocating ? '#fffbeb' : '#f8fafc',
                    borderRadius: '8px',
                    padding: '12px 14px',
                    border: isLocating ? '1px solid #fde68a' : '1px solid #e2e8f0',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      marginBottom: '10px',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                          style={{
                            fontSize: '15px',
                            fontWeight: 700,
                            color: '#0f172a',
                            backgroundColor: '#e2e8f0',
                            padding: '2px 8px',
                            borderRadius: '4px',
                          }}
                        >
                          Kệ {code}
                        </span>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                          {shelf.label}
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                        LED: GPIO {shelf.pinInfo.ledPin} | Còi: GPIO {shelf.pinInfo.buzzerPin} | STOP: GPIO {shelf.pinInfo.buttonPin}
                      </div>
                    </div>

                    <div
                      style={{
                        padding: '4px 8px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 600,
                        backgroundColor: isLocating
                          ? '#fffbeb'
                          : isArrived
                          ? '#f0f9ff'
                          : isCompleted
                          ? '#f0fdf4'
                          : '#f1f5f9',
                        color: isLocating
                          ? '#92400e'
                          : isArrived
                          ? '#075985'
                          : isCompleted
                          ? '#166534'
                          : '#475569',
                        border: isLocating
                          ? '1px solid #fde68a'
                          : isArrived
                          ? '1px solid #bae6fd'
                          : isCompleted
                          ? '1px solid #bbf7d0'
                          : '1px solid #e2e8f0',
                      }}
                    >
                      {isLocating
                        ? 'ĐANG ĐỊNH VỊ'
                        : isArrived
                        ? 'ĐÃ ĐẾN KỆ (BẤM STOP)'
                        : isCompleted
                        ? 'HOÀN TẤT LẤY HÀNG'
                        : 'SẴN SÀNG (IDLE)'}
                    </div>
                  </div>

                  {/* Actions for this shelf */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                    <button
                      onClick={() => handleLocateShelf(code)}
                      disabled={actionLoading === `locate-${code}`}
                      style={{
                        padding: '8px 6px',
                        backgroundColor: '#0f766e',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '5px',
                        cursor: 'pointer',
                      }}
                    >
                      <Play size={12} />
                      <span>Nháy đèn</span>
                    </button>

                    <button
                      onClick={() => handleChirpShelf(code)}
                      disabled={actionLoading === `chirp-${code}`}
                      style={{
                        padding: '8px 6px',
                        backgroundColor: '#0284c7',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '5px',
                        cursor: 'pointer',
                      }}
                    >
                      <Volume2 size={12} />
                      <span>Bóp còi</span>
                    </button>

                    <button
                      onClick={() => handleStopShelf(code)}
                      disabled={actionLoading === `stop-${code}`}
                      style={{
                        padding: '8px 6px',
                        backgroundColor: '#ffffff',
                        color: '#dc2626',
                        border: '1px solid #fecaca',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '5px',
                        cursor: 'pointer',
                      }}
                    >
                      <Square size={12} />
                      <span>Tắt tín hiệu</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* SECTION 2: ENVIRONMENTAL MONITORING & SIMULATION SLIDER */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            padding: '16px',
            border: '1px solid #e2e8f0',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '14px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Thermometer size={18} color="#0284c7" />
              <h2 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>
                Giám Sát Môi Trường & Giả Lập
              </h2>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '11px',
                fontWeight: 600,
                padding: '4px 8px',
                borderRadius: '6px',
                backgroundColor: simEnabled ? '#fffbeb' : '#f0fdf4',
                color: simEnabled ? '#92400e' : '#166534',
                border: simEnabled ? '1px solid #fde68a' : '1px solid #bbf7d0',
              }}
            >
              <span>{simEnabled ? 'CHẾ ĐỘ GIẢ LẬP' : 'CẢM BIẾN THỰC TẾ SHT30'}</span>
            </div>
          </div>

          {/* Current Readings Card */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '14px' }}>
            <div
              style={{
                backgroundColor: '#f8fafc',
                borderRadius: '8px',
                padding: '12px 14px',
                border: '1px solid #e2e8f0',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '11px', fontWeight: 500 }}>
                <Thermometer size={14} color="#0284c7" />
                <span>Nhiệt độ hiện tại</span>
              </div>
              <div
                style={{
                  fontSize: '22px',
                  fontWeight: 700,
                  color: (climateData?.temperature ?? 30) > (climateData?.safeEnvelope?.maxTemp ?? 35) || (climateData?.temperature ?? 30) < (climateData?.safeEnvelope?.minTemp ?? 10)
                    ? '#dc2626'
                    : '#0f172a',
                  marginTop: '4px',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {climateData?.temperature ?? 30}°C
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                Ngưỡng an toàn: {climateData?.safeEnvelope?.minTemp ?? 10.0}°C - {climateData?.safeEnvelope?.maxTemp ?? 35.0}°C
              </div>
            </div>

            <div
              style={{
                backgroundColor: '#f8fafc',
                borderRadius: '8px',
                padding: '12px 14px',
                border: '1px solid #e2e8f0',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '11px', fontWeight: 500 }}>
                <Droplets size={14} color="#0284c7" />
                <span>Độ ẩm hiện tại</span>
              </div>
              <div
                style={{
                  fontSize: '22px',
                  fontWeight: 700,
                  color: (climateData?.humidity ?? 60) > (climateData?.safeEnvelope?.maxHumidity ?? 80) || (climateData?.humidity ?? 60) < (climateData?.safeEnvelope?.minHumidity ?? 30)
                    ? '#dc2626'
                    : '#0f172a',
                  marginTop: '4px',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {climateData?.humidity ?? 60}%
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                Ngưỡng an toàn: {climateData?.safeEnvelope?.minHumidity ?? 30}% - {climateData?.safeEnvelope?.maxHumidity ?? 80}%
              </div>
            </div>
          </div>

          {/* Quick Scenario Buttons */}
          <div style={{ marginBottom: '14px' }}>
            <div style={{ fontSize: '11.5px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>
              Kịch bản kiểm thử nhanh:
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
              <button
                onClick={() => handleApplySimulation(28.0, 65.0, true)}
                style={{
                  padding: '8px',
                  backgroundColor: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: '6px',
                  color: '#166534',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div>Môi trường chuẩn</div>
                <div style={{ fontSize: '10px', color: '#15803d', fontWeight: 400 }}>28.0°C / 65% (An toàn)</div>
              </button>

              <button
                onClick={() => handleApplySimulation(38.5, 70.0, true)}
                style={{
                  padding: '8px',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '6px',
                  color: '#991b1b',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div>Quá nhiệt cảnh báo</div>
                <div style={{ fontSize: '10px', color: '#b91c1c', fontWeight: 400 }}>38.5°C &gt; 35.0°C (Vi phạm)</div>
              </button>

              <button
                onClick={() => handleApplySimulation(30.0, 88.0, true)}
                style={{
                  padding: '8px',
                  backgroundColor: '#fffbeb',
                  border: '1px solid #fde68a',
                  borderRadius: '6px',
                  color: '#92400e',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div>Ẩm ướt cao</div>
                <div style={{ fontSize: '10px', color: '#b45309', fontWeight: 400 }}>88% &gt; 80% (Ẩm ướt)</div>
              </button>

              <button
                onClick={() => handleApplySimulation(8.0, 50.0, true)}
                style={{
                  padding: '8px',
                  backgroundColor: '#f0f9ff',
                  border: '1px solid #bae6fd',
                  borderRadius: '6px',
                  color: '#075985',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div>Nhiệt độ quá thấp</div>
                <div style={{ fontSize: '10px', color: '#0369a1', fontWeight: 400 }}>8.0°C &lt; 10.0°C (Lạnh sâu)</div>
              </button>
            </div>
          </div>

          {/* Interactive Simulation Sliders */}
          <div
            style={{
              backgroundColor: '#f8fafc',
              borderRadius: '8px',
              padding: '12px 14px',
              border: '1px solid #e2e8f0',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                <Sliders size={14} />
                <span>Điều chỉnh giả lập thủ công</span>
              </div>

              {simEnabled && (
                <button
                  onClick={() => handleApplySimulation(0, 0, false)}
                  style={{
                    fontSize: '11px',
                    color: '#dc2626',
                    backgroundColor: '#fee2e2',
                    border: '1px solid #fecaca',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Tắt giả lập
                </button>
              )}
            </div>

            {/* Temp Slider */}
            <div style={{ marginBottom: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: '#475569', marginBottom: '4px' }}>
                <span>Nhiệt độ giả lập:</span>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>{simTemp.toFixed(1)}°C</span>
              </div>
              <input
                type="range"
                min="-10.0"
                max="40.0"
                step="0.5"
                value={simTemp}
                onChange={(e) => setSimTemp(parseFloat(e.target.value))}
                onMouseUp={() => handleApplySimulation(simTemp, simHum, true)}
                onTouchEnd={() => handleApplySimulation(simTemp, simHum, true)}
                style={{ width: '100%', accentColor: '#0f766e', cursor: 'pointer' }}
              />
            </div>

            {/* Humidity Slider */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: '#475569', marginBottom: '4px' }}>
                <span>Độ ẩm giả lập:</span>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>{simHum.toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="20"
                max="100"
                step="1"
                value={simHum}
                onChange={(e) => setSimHum(parseFloat(e.target.value))}
                onMouseUp={() => handleApplySimulation(simTemp, simHum, true)}
                onTouchEnd={() => handleApplySimulation(simTemp, simHum, true)}
                style={{ width: '100%', accentColor: '#0284c7', cursor: 'pointer' }}
              />
            </div>
          </div>
        </div>

        {/* SECTION 3: EMERGENCY ALARM CONTROLLER */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            padding: '16px',
            border: isAlarmActive ? '1.5px solid #dc2626' : '1px solid #e2e8f0',
            boxShadow: isAlarmActive ? '0 0 12px rgba(220, 38, 38, 0.15)' : 'none',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Bell size={18} color={isAlarmActive ? '#dc2626' : '#0f766e'} />
              <h2 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>
                Điều Phối Báo Động Khẩn Cấp
              </h2>
            </div>

            <div
              style={{
                padding: '4px 8px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 600,
                backgroundColor: isAlarmActive ? '#fef2f2' : '#f0fdf4',
                color: isAlarmActive ? '#991b1b' : '#166534',
                border: isAlarmActive ? '1px solid #fecaca' : '1px solid #bbf7d0',
              }}
            >
              {isAlarmActive ? 'ĐANG BÁO ĐỘNG' : 'TRẠNG THÁI AN TOÀN'}
            </div>
          </div>

          {/* Alarm status banner */}
          <div
            style={{
              backgroundColor: isAlarmActive ? '#fef2f2' : '#f8fafc',
              borderRadius: '6px',
              padding: '10px 12px',
              border: isAlarmActive ? '1px solid #fecaca' : '1px solid #e2e8f0',
              marginBottom: '12px',
              fontSize: '12px',
            }}
          >
            {isAlarmActive ? (
              <div style={{ color: '#991b1b' }}>
                <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertTriangle size={15} />
                  <span>SỰ CỐ KHẨN CẤP ĐANG KÍCH HOẠT</span>
                </div>
                <div style={{ marginTop: '4px', fontSize: '11.5px' }}>
                  {climateData?.alarmReason || 'Vi phạm ngưỡng an toàn bảo quản hàng hóa kho mát.'}
                </div>
                {isSilenced && (
                  <div style={{ marginTop: '6px', color: '#075985', fontWeight: 600, fontSize: '11px' }}>
                    Còi đã tạm tắt. Còn lại {climateData?.silencedRemainingSeconds ?? 60}s trước khi còi tiếp tục reo.
                  </div>
                )}
              </div>
            ) : (
              <div style={{ color: '#334155' }}>
                <div style={{ fontWeight: 600, color: '#166534', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShieldCheck size={15} />
                  <span>Hệ thống vận hành bình thường</span>
                </div>
              </div>
            )}
          </div>

          {/* 3 Alarm Control Action Buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            {/* Test Alarm */}
            <button
              onClick={handleTestAlarm}
              disabled={actionLoading === 'test-alarm'}
              style={{
                padding: '9px 6px',
                backgroundColor: '#dc2626',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 600,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                cursor: 'pointer',
              }}
            >
              <AlertTriangle size={15} />
              <span>Báo động 3 kệ</span>
            </button>

            {/* Silence Alarm */}
            <button
              onClick={handleSilenceAlarm}
              disabled={actionLoading === 'silence-alarm' || !isAlarmActive}
              style={{
                padding: '9px 6px',
                backgroundColor: isAlarmActive ? '#fef3c7' : '#f1f5f9',
                color: isAlarmActive ? '#92400e' : '#94a3b8',
                border: isAlarmActive ? '1px solid #fde68a' : '1px solid #e2e8f0',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 600,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                cursor: isAlarmActive ? 'pointer' : 'not-allowed',
              }}
            >
              <VolumeX size={15} />
              <span>Tạm tắt còi (60s)</span>
            </button>

            {/* Clear Alarm */}
            <button
              onClick={handleClearAlarm}
              disabled={actionLoading === 'clear-alarm' || !isAlarmActive}
              style={{
                padding: '9px 6px',
                backgroundColor: isAlarmActive ? '#166534' : '#f1f5f9',
                color: isAlarmActive ? '#ffffff' : '#94a3b8',
                border: 'none',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 600,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                cursor: isAlarmActive ? 'pointer' : 'not-allowed',
              }}
            >
              <ShieldCheck size={15} />
              <span>Gỡ báo động</span>
            </button>
          </div>
        </div>

        {/* SECTION 4: HARDWARE EVENT LOGS */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            padding: '16px',
            border: '1px solid #e2e8f0',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={16} color="#475569" />
              <h2 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>
                Nhật Ký Sự Kiện Phần Cứng
              </h2>
            </div>
            <span style={{ fontSize: '11px', color: '#64748b' }}>
              {logs.length} sự kiện gần nhất
            </span>
          </div>

          <div
            style={{
              maxHeight: '220px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            {logs.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>
                Chưa có sự kiện phần cứng nào được ghi nhận.
              </div>
            ) : (
              logs.map((log: any) => {
                const isStop = log.eventType === 'STOP_PRESSED';
                const isAlarm = log.eventType === 'ALARM_TRIGGERED';
                const isLocate = log.eventType === 'COMMAND_DISPATCHED';

                return (
                  <div
                    key={log.id}
                    style={{
                      padding: '8px 10px',
                      borderRadius: '6px',
                      backgroundColor: isStop ? '#f0fdf4' : isAlarm ? '#fef2f2' : '#f8fafc',
                      border: isStop ? '1px solid #bbf7d0' : isAlarm ? '1px solid #fecaca' : '1px solid #e2e8f0',
                      fontSize: '11.5px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span
                        style={{
                          fontWeight: 700,
                          color: isStop ? '#166534' : isAlarm ? '#991b1b' : '#0369a1',
                        }}
                      >
                        {log.shelfCode !== 'ALL' ? `Kệ ${log.shelfCode}` : 'Toàn bộ 3 kệ'}
                      </span>
                      <span style={{ color: '#94a3b8', fontSize: '10px' }}>
                        {new Date(log.timestamp).toLocaleTimeString('vi-VN')}
                      </span>
                    </div>
                    <div style={{ color: '#334155', marginTop: '2px' }}>{log.message}</div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
