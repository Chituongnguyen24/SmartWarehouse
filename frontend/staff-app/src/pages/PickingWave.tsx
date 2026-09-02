import React, { useState } from 'react';
import {
  Boxes,
  ScanBarcode,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  Snowflake,
  Clock,
  ArrowRight,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { PickingItem } from '../types';
import { CameraScannerModal } from '../components/CameraScannerModal';
import { ShelfNavigationMap } from '../components/ShelfNavigationMap';

const MOCK_PICKING_ITEMS: PickingItem[] = [
  {
    id: 'pk-1',
    orderId: 'ord-101',
    orderCode: 'DH-20260831-01',
    sku: 'SKU-PORK-01',
    productName: 'Thịt heo xay sạch CP 400g (Lạnh 0-4°C)',
    quantity: 2,
    pickedQuantity: 0,
    unit: 'Khay',
    lotCode: 'LOT-0828-C',
    expiryDate: '02/09/2026',
    shelfLocation: 'Kệ B2-01 (Kho Lạnh B)',
    zone: 'COOL',
    barcode: '8934567890001',
    status: 'PENDING',
    temperatureRequired: '0-4°C',
  },
  {
    id: 'pk-2',
    orderId: 'ord-101',
    orderCode: 'DH-20260831-01',
    sku: 'SKU-MILK-02',
    productName: 'Sữa tươi Đà Lạt Milk 1L Thanh Trùng',
    quantity: 1,
    pickedQuantity: 0,
    unit: 'Chai',
    lotCode: 'LOT-0820-A',
    expiryDate: '03/09/2026',
    shelfLocation: 'Kệ B2-04 (Kho Lạnh B)',
    zone: 'COOL',
    barcode: '8934567890002',
    status: 'PENDING',
    temperatureRequired: '2-6°C',
  },
  {
    id: 'pk-3',
    orderId: 'ord-102',
    orderCode: 'DH-20260831-02',
    sku: 'SKU-RICE-03',
    productName: 'Gạo ST25 Ông Cua Túi 5kg',
    quantity: 1,
    pickedQuantity: 0,
    unit: 'Túi',
    lotCode: 'LOT-0810-R',
    expiryDate: '15/12/2026',
    shelfLocation: 'Kệ A1-03 (Kho Khô)',
    zone: 'DRY',
    barcode: '8934567890003',
    status: 'PENDING',
  },
];

export const PickingWave: React.FC = () => {
  const [items, setItems] = useState<PickingItem[]>(MOCK_PICKING_ITEMS);
  const [activeItem, setActiveItem] = useState<PickingItem | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const pendingItems = items.filter(it => it.status === 'PENDING');
  const completedItems = items.filter(it => it.status === 'PICKED');

  const currentItem = pendingItems[0] || null;

  const handleStartScan = (item: PickingItem) => {
    setActiveItem(item);
    setIsScannerOpen(true);
  };

  const handleScanSuccess = (scannedCode: string, isSuccess: boolean) => {
    if (!activeItem || !isSuccess) return;

    setItems(prev =>
      prev.map(it => {
        if (it.id === activeItem.id) {
          return { ...it, pickedQuantity: it.quantity, status: 'PICKED' };
        }
        return it;
      })
    );

    setToastMessage(`Đã gom thành công: ${activeItem.productName}`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  return (
    <div style={{ padding: '16px', paddingBottom: '90px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* Wave Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#0f172a',
          padding: '16px 18px',
          borderRadius: '20px',
          border: '1px solid #1e293b',
        }}
      >
        <div>
          <div style={{ fontSize: '11px', color: '#38bdf8', fontWeight: 800 }}>ĐỢT SÓNG GOM HÀNG #WAVE-0831</div>
          <h2 style={{ margin: '2px 0 0 0', fontSize: '16px', fontWeight: 900, color: '#ffffff' }}>
            Soạn Hàng FEFO (3 Mặt Hàng)
          </h2>
        </div>

        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: '13px', fontWeight: 900, color: '#34d399' }}>
            {completedItems.length}/{items.length}
          </span>
          <div style={{ fontSize: '10px', color: '#94a3b8' }}>Đã gom</div>
        </div>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            backgroundColor: '#064e3b',
            color: '#ffffff',
            padding: '12px 16px',
            borderRadius: '12px',
            border: '1px solid #10b981',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12px',
            fontWeight: 800,
          }}
        >
          <CheckCircle2 size={16} color="#34d399" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Shelf Navigation Optimal Route Map */}
      <ShelfNavigationMap
        currentShelf={currentItem?.shelfLocation || 'Khu vực gom hàng'}
        nextShelves={pendingItems.slice(1).map(it => it.shelfLocation)}
      />

      {/* Current Active Item Card (Large & Actionable) */}
      {currentItem && (
        <div
          style={{
            backgroundColor: '#0f172a',
            borderRadius: '20px',
            padding: '18px',
            border: '2px solid #0284c7',
            boxShadow: '0 10px 25px -5px rgba(2, 132, 199, 0.25)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '10px', backgroundColor: '#0284c7', color: '#ffffff', padding: '2px 8px', borderRadius: '6px', fontWeight: 900 }}>
              📍 VỊ TRÍ: {currentItem.shelfLocation}
            </span>
            {currentItem.temperatureRequired && (
              <span style={{ fontSize: '10px', backgroundColor: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8', padding: '2px 8px', borderRadius: '6px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '3px' }}>
                <Snowflake size={10} /> {currentItem.temperatureRequired}
              </span>
            )}
          </div>

          <h3 style={{ margin: '0 0 6px 0', fontSize: '15px', fontWeight: 900, color: '#ffffff' }}>
            {currentItem.productName}
          </h3>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '8px',
              backgroundColor: '#020617',
              padding: '10px',
              borderRadius: '12px',
              margin: '12px 0',
              textAlign: 'center',
            }}
          >
            <div>
              <div style={{ fontSize: '10px', color: '#94a3b8' }}>Lô FEFO</div>
              <div style={{ fontSize: '12px', fontWeight: 900, color: '#f59e0b' }}>{currentItem.lotCode}</div>
            </div>
            <div>
              <div style={{ fontSize: '10px', color: '#94a3b8' }}>Hạn Dùng</div>
              <div style={{ fontSize: '12px', fontWeight: 900, color: '#34d399' }}>{currentItem.expiryDate}</div>
            </div>
            <div>
              <div style={{ fontSize: '10px', color: '#94a3b8' }}>Số Lượng</div>
              <div style={{ fontSize: '13px', fontWeight: 900, color: '#ffffff' }}>
                {currentItem.quantity} {currentItem.unit}
              </div>
            </div>
          </div>

          <button
            onClick={() => handleStartScan(currentItem)}
            style={{
              width: '100%',
              backgroundColor: '#0284c7',
              color: '#ffffff',
              border: 'none',
              borderRadius: '14px',
              padding: '14px',
              fontSize: '14px',
              fontWeight: 900,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 14px rgba(2, 132, 199, 0.4)',
            }}
          >
            <ScanBarcode size={20} />
            <span>Quét Mã Vạch Xác Thực Lô FEFO</span>
          </button>
        </div>
      )}

      {/* Picking Items Queue List */}
      <div>
        <div style={{ fontSize: '12px', fontWeight: 800, color: '#94a3b8', marginBottom: '8px' }}>
          DANH SÁCH MẶT HÀNG TRONG ĐỢT GOM:
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {items.map(it => {
            const isPicked = it.status === 'PICKED';

            return (
              <div
                key={it.id}
                style={{
                  backgroundColor: isPicked ? '#064e3b' : '#0f172a',
                  border: `1px solid ${isPicked ? '#059669' : '#1e293b'}`,
                  borderRadius: '14px',
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  opacity: isPicked ? 0.85 : 1,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {isPicked ? (
                    <CheckCircle2 size={22} color="#34d399" />
                  ) : (
                    <div style={{ width: '22px', height: '22px', borderRadius: '50%', border: '2px solid #64748b' }} />
                  )}
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#ffffff' }}>
                      {it.productName}
                    </div>
                    <div style={{ fontSize: '11px', color: isPicked ? '#a7f3d0' : '#94a3b8' }}>
                      {it.shelfLocation} • Lô: <b>{it.lotCode}</b> • SL: {it.quantity} {it.unit}
                    </div>
                  </div>
                </div>

                {!isPicked && (
                  <button
                    onClick={() => handleStartScan(it)}
                    style={{
                      backgroundColor: '#1e293b',
                      color: '#38bdf8',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      padding: '6px 10px',
                      fontSize: '11px',
                      fontWeight: 800,
                      cursor: 'pointer',
                    }}
                  >
                    Quét
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Camera Scanner Modal */}
      {activeItem && (
        <CameraScannerModal
          isOpen={isScannerOpen}
          onClose={() => setIsScannerOpen(false)}
          expectedSku={activeItem.sku}
          expectedName={activeItem.productName}
          onScanResult={handleScanSuccess}
          mockCodes={[activeItem.sku, '8934567890001', 'SKU-WRONG-99']}
        />
      )}

    </div>
  );
};
