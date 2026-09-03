import React, { useState, useMemo } from 'react';
import {
  Boxes,
  Layers,
  Thermometer,
  Snowflake,
  Package,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Printer,
  ChevronRight,
  Sparkles,
  Search,
  Maximize2,
  X,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Box,
} from 'lucide-react';
import { Supermarket3DScene } from './Supermarket3DScene';
import type { Rack3DData } from './Supermarket3DScene';

export interface ShelfItem {
  sku: string;
  name: string;
  category: string;
  qty: number;
  unit: string;
  lotCode: string;
  expiryDate: string;
  daysRemaining: number;
  price: number;
  imageUrl?: string;
}

export interface ShelfRack {
  id: string;
  name: string;
  zone: 'COOL' | 'FROZEN' | 'DRY';
  zoneLabel: string;
  temperature: string;
  humidity: string;
  maxCapacity: number;
  currentCapacity: number;
  items: ShelfItem[];
  hasAlert?: boolean;
  alertMsg?: string;
}

const DEFAULT_RACKS: ShelfRack[] = [
  // 1. COOL ZONE (Kho Mát 0-4°C)
  {
    id: 'RACK-COOL-01',
    name: 'Kệ A1 (Thịt Tươi Sống & Gia Cầm)',
    zone: 'COOL',
    zoneLabel: 'Kho Mát (0°C ~ +4°C)',
    temperature: '+2.4°C',
    humidity: '78%',
    maxCapacity: 300,
    currentCapacity: 240,
    hasAlert: true,
    alertMsg: 'Lô thịt CP cận date 48h (Ưu tiên xuất FEFO)',
    items: [
      { sku: 'SKU-PORK-01', name: 'Thịt heo xay CP 400g', category: 'Thịt tươi', qty: 85, unit: 'Khay', lotCode: 'LOT-0828-C', expiryDate: '02/09/2026', daysRemaining: 2, price: 56000 },
      { sku: 'SKU-BEEF-02', name: 'Thịt bò Úc phi lê 500g', category: 'Thịt tươi', qty: 95, unit: 'Khay', lotCode: 'LOT-0829-B', expiryDate: '05/09/2026', daysRemaining: 5, price: 185000 },
      { sku: 'SKU-CHICKEN-03', name: 'Đùi gà tươi CP 1kg', category: 'Gia cầm', qty: 60, unit: 'Túi', lotCode: 'LOT-0830-A', expiryDate: '06/09/2026', daysRemaining: 6, price: 72000 },
    ],
  },
  {
    id: 'RACK-COOL-02',
    name: 'Kệ A2 (Sữa Tươi & Bơ Sữa Thanh Trùng)',
    zone: 'COOL',
    zoneLabel: 'Kho Mát (0°C ~ +4°C)',
    temperature: '+3.1°C',
    humidity: '75%',
    maxCapacity: 250,
    currentCapacity: 175,
    items: [
      { sku: 'SKU-MILK-01', name: 'Sữa tươi Đà Lạt Milk 1L', category: 'Sữa & Bơ', qty: 42, unit: 'Chai', lotCode: 'LOT-0820-A', expiryDate: '03/09/2026', daysRemaining: 3, price: 38000 },
      { sku: 'SKU-YOGURT-02', name: 'Sữa chua TH True Yogurt lốc 4', category: 'Sữa & Bơ', qty: 80, unit: 'Lốc', lotCode: 'LOT-0826-Y', expiryDate: '15/09/2026', daysRemaining: 15, price: 29000 },
      { sku: 'SKU-BUTTER-03', name: 'Bơ nhạt Anchor New Zealand 227g', category: 'Sữa & Bơ', qty: 53, unit: 'Hộp', lotCode: 'LOT-0815-B', expiryDate: '28/11/2026', daysRemaining: 89, price: 78000 },
    ],
  },
  {
    id: 'RACK-COOL-03',
    name: 'Kệ A3 (Rau Củ Quả Hữu Cơ & Thủy Canh)',
    zone: 'COOL',
    zoneLabel: 'Kho Mát (0°C ~ +4°C)',
    temperature: '+4.0°C',
    humidity: '82%',
    maxCapacity: 200,
    currentCapacity: 150,
    items: [
      { sku: 'SKU-SALAD-01', name: 'Rau xà lách Romaine thủy canh 300g', category: 'Rau củ', qty: 50, unit: 'Gói', lotCode: 'LOT-0830-R', expiryDate: '03/09/2026', daysRemaining: 3, price: 24000 },
      { sku: 'SKU-TOMATO-02', name: 'Cà chua bi Cherry Đà Lạt 500g', category: 'Rau củ', qty: 60, unit: 'Hộp', lotCode: 'LOT-0829-T', expiryDate: '07/09/2026', daysRemaining: 7, price: 35000 },
      { sku: 'SKU-MUSH-03', name: 'Nấm đùi gà baby VietGAP 200g', category: 'Rau củ', qty: 40, unit: 'Gói', lotCode: 'LOT-0828-M', expiryDate: '04/09/2026', daysRemaining: 4, price: 28000 },
    ],
  },
  {
    id: 'RACK-COOL-04',
    name: 'Kệ A4 (Trái Cây Tươi & Nước Ép Mát)',
    zone: 'COOL',
    zoneLabel: 'Kho Mát (0°C ~ +4°C)',
    temperature: '+3.5°C',
    humidity: '76%',
    maxCapacity: 280,
    currentCapacity: 210,
    items: [
      { sku: 'SKU-APPLE-ENVY', name: 'Táo Envy New Zealand Size 70', category: 'Trái cây', qty: 90, unit: 'Kg', lotCode: 'LOT-0822-AP', expiryDate: '18/09/2026', daysRemaining: 14, price: 149000 },
      { sku: 'SKU-ORANGE-VAL', name: 'Cam vàng Úc Navel mọng nước', category: 'Trái cây', qty: 70, unit: 'Kg', lotCode: 'LOT-0825-OR', expiryDate: '22/09/2026', daysRemaining: 18, price: 89000 },
      { sku: 'SKU-JUICE-ORANGE', name: 'Nước ép cam tươi nguyên chất Teppy 1L', category: 'Nước ép', qty: 50, unit: 'Chai', lotCode: 'LOT-0820-TP', expiryDate: '25/09/2026', daysRemaining: 21, price: 32000 },
    ],
  },

  // 2. FROZEN ZONE (Kho Đông -18°C)
  {
    id: 'RACK-FROZEN-01',
    name: 'Kệ B1 (Thủy Hải Sản Đông Lạnh)',
    zone: 'FROZEN',
    zoneLabel: 'Hầm Đông Lạnh (-18°C ~ -22°C)',
    temperature: '-19.2°C',
    humidity: '60%',
    maxCapacity: 350,
    currentCapacity: 290,
    items: [
      { sku: 'SKU-SALMON-01', name: 'File cá hồi Nauy tươi đông lạnh 500g', category: 'Thủy hải sản', qty: 110, unit: 'Gói', lotCode: 'LOT-0810-S', expiryDate: '20/12/2026', daysRemaining: 111, price: 235000 },
      { sku: 'SKU-SHRIMP-02', name: 'Tôm sú lột nõn Cà Mau size 20 500g', category: 'Thủy hải sản', qty: 120, unit: 'Hộp', lotCode: 'LOT-0812-SH', expiryDate: '15/01/2027', daysRemaining: 137, price: 165000 },
      { sku: 'SKU-SQUID-03', name: 'Mực ống Phú Quốc tươi đông 500g', category: 'Thủy hải sản', qty: 60, unit: 'Khay', lotCode: 'LOT-0818-SQ', expiryDate: '10/02/2027', daysRemaining: 163, price: 145000 },
    ],
  },
  {
    id: 'RACK-FROZEN-02',
    name: 'Kệ B2 (Kem & Bánh Tráng Miệng Đông Lạnh)',
    zone: 'FROZEN',
    zoneLabel: 'Hầm Đông Lạnh (-18°C ~ -22°C)',
    temperature: '-20.5°C',
    humidity: '58%',
    maxCapacity: 300,
    currentCapacity: 210,
    items: [
      { sku: 'SKU-ICECREAM-01', name: 'Kem Häagen-Dazs Vani 473ml', category: 'Kem & Tráng miệng', qty: 70, unit: 'Hộp', lotCode: 'LOT-0720-HD', expiryDate: '30/06/2027', daysRemaining: 303, price: 245000 },
      { sku: 'SKU-CORNETTO-02', name: 'Kem cây Cornetto Dâu Socola lốc 5', category: 'Kem & Tráng miệng', qty: 80, unit: 'Hộp', lotCode: 'LOT-0725-CN', expiryDate: '15/07/2027', daysRemaining: 318, price: 65000 },
      { sku: 'SKU-MOCHI-ICE', name: 'Bánh Mochi kem trà xanh Nhật 6 cái', category: 'Kem & Tráng miệng', qty: 60, unit: 'Hộp', lotCode: 'LOT-0801-MC', expiryDate: '01/05/2027', daysRemaining: 243, price: 82000 },
    ],
  },
  {
    id: 'RACK-FROZEN-03',
    name: 'Kệ B3 (Thực Phẩm Sơ Chế & Viên Lẩu)',
    zone: 'FROZEN',
    zoneLabel: 'Hầm Đông Lạnh (-18°C ~ -22°C)',
    temperature: '-19.8°C',
    humidity: '59%',
    maxCapacity: 320,
    currentCapacity: 240,
    items: [
      { sku: 'SKU-DIMSUM-02', name: 'Há cảo tôm thịt Cầu Tre 500g', category: 'Chế biến sẵn', qty: 90, unit: 'Gói', lotCode: 'LOT-0805-CT', expiryDate: '12/04/2027', daysRemaining: 224, price: 58000 },
      { sku: 'SKU-PIZZA-03', name: 'Pizza phô mai bò bằm Dr.Oetker', category: 'Chế biến sẵn', qty: 70, unit: 'Hộp', lotCode: 'LOT-0801-PZ', expiryDate: '01/05/2027', daysRemaining: 243, price: 92000 },
      { sku: 'SKU-HOTPOT-BALLS', name: 'Viên thả lẩu tôm trứng cá EB 500g', category: 'Chế biến sẵn', qty: 80, unit: 'Gói', lotCode: 'LOT-0808-EB', expiryDate: '20/05/2027', daysRemaining: 262, price: 115000 },
    ],
  },
  {
    id: 'RACK-FROZEN-04',
    name: 'Kệ B4 (Thịt Nhập Khẩu Đông Lạnh)',
    zone: 'FROZEN',
    zoneLabel: 'Hầm Đông Lạnh (-18°C ~ -22°C)',
    temperature: '-21.0°C',
    humidity: '57%',
    maxCapacity: 360,
    currentCapacity: 280,
    items: [
      { sku: 'SKU-BEEF-SHORTRIB', name: 'Dẻ sườn bò Mỹ đông lạnh Black Angus 1kg', category: 'Thịt đông lạnh', qty: 95, unit: 'Khay', lotCode: 'LOT-0810-BA', expiryDate: '28/08/2027', daysRemaining: 362, price: 340000 },
      { sku: 'SKU-PORK-BELLY-CA', name: 'Ba chỉ heo rút sườn Canada đông lạnh 1kg', category: 'Thịt đông lạnh', qty: 110, unit: 'Khay', lotCode: 'LOT-0812-CA', expiryDate: '15/09/2027', daysRemaining: 380, price: 165000 },
      { sku: 'SKU-LAMB-CHOP', name: 'Sườn cừu Úc cắt khúc đông lạnh 500g', category: 'Thịt đông lạnh', qty: 75, unit: 'Gói', lotCode: 'LOT-0815-LB', expiryDate: '10/10/2027', daysRemaining: 405, price: 210000 },
    ],
  },

  // 3. DRY ZONE (Kho Khô Thường)
  {
    id: 'RACK-DRY-01',
    name: 'Kệ C1 (Lương Thực & Gạo Cao Cấp)',
    zone: 'DRY',
    zoneLabel: 'Kho Khô Thường (+25°C)',
    temperature: '+26.2°C',
    humidity: '65%',
    maxCapacity: 400,
    currentCapacity: 320,
    items: [
      { sku: 'SKU-RICE-ST25', name: 'Gạo ST25 Ông Cua Túi 5kg', category: 'Lương thực', qty: 180, unit: 'Túi', lotCode: 'LOT-0810-R', expiryDate: '15/12/2026', daysRemaining: 106, price: 195000 },
      { sku: 'SKU-RICE-JAS', name: 'Gạo thơm Jasmine thượng hạng 5kg', category: 'Lương thực', qty: 140, unit: 'Túi', lotCode: 'LOT-0815-J', expiryDate: '20/01/2027', daysRemaining: 142, price: 125000 },
    ],
  },
  {
    id: 'RACK-DRY-02',
    name: 'Kệ C2 (Gia Vị & Dầu Ăn Nguyên Chất)',
    zone: 'DRY',
    zoneLabel: 'Kho Khô Thường (+25°C)',
    temperature: '+26.0°C',
    humidity: '64%',
    maxCapacity: 350,
    currentCapacity: 260,
    items: [
      { sku: 'SKU-OIL-SIMPLY', name: 'Dầu ăn Simply nguyên chất 1L', category: 'Gia vị', qty: 120, unit: 'Chai', lotCode: 'LOT-0710-SP', expiryDate: '10/07/2028', daysRemaining: 678, price: 62000 },
      { sku: 'SKU-FISHSAUCE', name: 'Nước mắm Knorr thượng hạng 500ml', category: 'Gia vị', qty: 140, unit: 'Chai', lotCode: 'LOT-0725-KN', expiryDate: '25/08/2028', daysRemaining: 724, price: 27500 },
    ],
  },
  {
    id: 'RACK-DRY-03',
    name: 'Kệ C3 (Đồ Hộp & Thực Phẩm Đóng Gói)',
    zone: 'DRY',
    zoneLabel: 'Kho Khô Thường (+25°C)',
    temperature: '+25.8°C',
    humidity: '63%',
    maxCapacity: 300,
    currentCapacity: 190,
    items: [
      { sku: 'SKU-TULIP-340G', name: 'Thịt heo hộp Tulip Less Sodium 340g', category: 'Đồ hộp', qty: 110, unit: 'Hộp', lotCode: 'LOT-0601-TL', expiryDate: '01/06/2029', daysRemaining: 1004, price: 115200 },
      { sku: 'SKU-TUNA-185G', name: 'Cá ngừ ngâm dầu Hạ Long 185g', category: 'Đồ hộp', qty: 80, unit: 'Hộp', lotCode: 'LOT-0615-HL', expiryDate: '15/06/2029', daysRemaining: 1018, price: 34000 },
    ],
  },
  {
    id: 'RACK-DRY-04',
    name: 'Kệ C4 (Bánh Kẹo, Snack & Nước Ngọt)',
    zone: 'DRY',
    zoneLabel: 'Kho Khô Thường (+25°C)',
    temperature: '+25.5°C',
    humidity: '62%',
    maxCapacity: 380,
    currentCapacity: 295,
    items: [
      { sku: 'SKU-SNACK-LAYS', name: 'Snack khoai tây Lay\'s vị tảo biển 150g', category: 'Bánh kẹo', qty: 150, unit: 'Gói', lotCode: 'LOT-0715-LY', expiryDate: '15/03/2027', daysRemaining: 196, price: 28000 },
      { sku: 'SKU-COCA-CAN', name: 'Nước ngọt Coca-Cola lon 320ml lốc 6', category: 'Đồ uống', qty: 145, unit: 'Lốc', lotCode: 'LOT-0801-CC', expiryDate: '01/08/2027', daysRemaining: 335, price: 54000 },
    ],
  },
];

export const Warehouse3DDigitalTwin: React.FC = () => {
  const [racks, setRacks] = useState<ShelfRack[]>(DEFAULT_RACKS);
  const [selectedRackId, setSelectedRackId] = useState<string>('RACK-COOL-01');
  const [zoneFilter, setZoneFilter] = useState<'ALL' | 'COOL' | 'FROZEN' | 'DRY'>('ALL');
  const [displayMode, setDisplayMode] = useState<'3D_SCENE' | 'ISOMETRIC'>('3D_SCENE');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showEditCapacityModal, setShowEditCapacityModal] = useState<boolean>(false);
  const [isLoadingLive, setIsLoadingLive] = useState<boolean>(false);
  const [liveLotCount, setLiveLotCount] = useState<number>(0);

  // Convert racks to 3D matrix coordinates for WebGL Digital Twin
  const racks3D: Rack3DData[] = useMemo(() => {
    const coolRacks = racks.filter(x => x.zone === 'COOL');
    const frozenRacks = racks.filter(x => x.zone === 'FROZEN');
    const dryRacks = racks.filter(x => x.zone === 'DRY');

    return racks.map(r => {
      let posX = 0;
      let posZ = 0;

      if (r.zone === 'COOL') {
        const idx = Math.max(0, coolRacks.findIndex(x => x.id === r.id));
        const col = idx % 2;
        const row = Math.floor(idx / 2);
        posX = -13 + col * 4.2;
        posZ = -8 + row * 5.8;
      } else if (r.zone === 'FROZEN') {
        const idx = Math.max(0, frozenRacks.findIndex(x => x.id === r.id));
        const col = idx % 2;
        const row = Math.floor(idx / 2);
        posX = -2.1 + col * 4.2;
        posZ = -8 + row * 5.8;
      } else {
        const idx = Math.max(0, dryRacks.findIndex(x => x.id === r.id));
        const col = idx % 2;
        const row = Math.floor(idx / 2);
        posX = 8.8 + col * 4.2;
        posZ = -8 + row * 5.8;
      }

      return {
        id: r.id,
        name: r.name,
        zone: r.zone,
        zoneLabel: r.zoneLabel,
        temperature: r.temperature,
        humidity: r.humidity,
        maxCapacity: r.maxCapacity,
        currentCapacity: r.currentCapacity,
        hasAlert: r.hasAlert,
        alertMsg: r.alertMsg,
        position: [posX, 0, posZ],
        color: r.zone === 'COOL' ? '#0284c7' : r.zone === 'FROZEN' ? '#06b6d4' : '#f59e0b',
        items: r.items,
      };
    });
  }, [racks]);

  // New Rack Form State
  const [newRackName, setNewRackName] = useState('');
  const [newRackZone, setNewRackZone] = useState<'COOL' | 'FROZEN' | 'DRY'>('COOL');
  const [newRackCapacity, setNewRackCapacity] = useState('300');

  // Edit Capacity State
  const [editCapacityVal, setEditCapacityVal] = useState('300');

  // Fetch Live Real Data from Backend (:3011 & :3010)
  const fetchLiveWarehouseData = async () => {
    setIsLoadingLive(true);
    try {
      const [resLots, resProducts] = await Promise.all([
        fetch('http://localhost:3011/inventory/lots').catch(() => null),
        fetch('http://localhost:3010/products?limit=1000').catch(() => null),
      ]);

      if (resLots && resLots.ok) {
        const lots = await resLots.json();
        let products: any[] = [];
        if (resProducts && resProducts.ok) {
          const prodData = await resProducts.json();
          products = Array.isArray(prodData) ? prodData : prodData.items || prodData.products || [];
        }

        const productMap: Record<string, any> = {};
        products.forEach((p: any) => {
          if (p.id) productMap[p.id] = p;
          if (p.sku) productMap[p.sku] = p;
        });

        if (Array.isArray(lots) && lots.length > 0) {
          setLiveLotCount(lots.length);

          // Group live lots into Racks
          setRacks(prevRacks => {
            return prevRacks.map((rack, rIdx) => {
              // Match lots by zone or location
              const matchingLots = lots.filter((lot: any) => {
                const lZone = (lot.zone || '').toUpperCase();
                const lLoc = (lot.location || '').toUpperCase();
                const rZone = rack.zone;

                if (lZone === rZone) return true;
                if (rZone === 'COOL' && (lLoc.includes('A') || lZone === 'COLD' || lZone === 'COOL')) return true;
                if (rZone === 'FROZEN' && (lLoc.includes('B') || lZone === 'FROZEN')) return true;
                if (rZone === 'DRY' && (lLoc.includes('C') || lZone === 'DRY')) return true;
                return false;
              });

              // Divide matching lots across racks in this zone
              const zoneRacks = prevRacks.filter(r => r.zone === rack.zone);
              const rackSubIdx = zoneRacks.findIndex(r => r.id === rack.id);
              const assignedLots = matchingLots.filter((_, idx) => idx % Math.max(1, zoneRacks.length) === rackSubIdx);

              if (assignedLots.length > 0) {
                const mappedItems: ShelfItem[] = assignedLots.map((l: any) => {
                  const p = productMap[l.productId] || productMap[l.sku];
                  const expDate = l.expiryDate ? new Date(l.expiryDate) : new Date(Date.now() + 86400000 * 10);
                  const now = new Date();
                  const daysLeft = Math.max(0, Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

                  return {
                    sku: l.sku || p?.sku || `SKU-${l.productId || l.id}`,
                    name: p?.name || l.productName || 'Thực phẩm CityMart',
                    category: p?.category || (rack.zone === 'COOL' ? 'Thịt & Sữa' : rack.zone === 'FROZEN' ? 'Đông Lạnh' : 'Khô'),
                    qty: Number(l.remainingQty || l.quantity || 20),
                    unit: p?.unit || 'Khay',
                    lotCode: l.lotCode || `LOT-${l.id}`,
                    expiryDate: expDate.toLocaleDateString('vi-VN'),
                    daysRemaining: daysLeft,
                    price: Number(p?.price || 45000),
                  };
                });

                const totalQty = mappedItems.reduce((s, i) => s + i.qty, 0);
                const hasNearExpiry = mappedItems.some(i => i.daysRemaining <= 3);

                return {
                  ...rack,
                  currentCapacity: Math.min(rack.maxCapacity, totalQty),
                  items: mappedItems,
                  hasAlert: hasNearExpiry,
                  alertMsg: hasNearExpiry ? 'Có lô hàng cận date 48h (Ưu tiên xuất FEFO)' : undefined,
                };
              }

              return rack;
            });
          });
        }
      }
    } catch (e) {
      console.warn('Live backend fetch in 3D digital twin:', e);
    } finally {
      setIsLoadingLive(false);
    }
  };

  React.useEffect(() => {
    fetchLiveWarehouseData();
  }, []);

  const selectedRack = useMemo(() => {
    return racks.find(r => r.id === selectedRackId) || racks[0];
  }, [racks, selectedRackId]);

  const filteredRacks = useMemo(() => {
    return racks.filter(r => {
      const matchZone = zoneFilter === 'ALL' || r.zone === zoneFilter;
      const matchQuery =
        !searchQuery ||
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.items.some(it => it.name.toLowerCase().includes(searchQuery.toLowerCase()) || it.sku.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchZone && matchQuery;
    });
  }, [racks, zoneFilter, searchQuery]);

  const handleAddRack = () => {
    if (!newRackName.trim()) return;

    const newId = `RACK-${newRackZone}-${Date.now().toString().slice(-4)}`;
    const zoneLabels = {
      COOL: 'Kho Mát (0°C ~ +4°C)',
      FROZEN: 'Hầm Đông Lạnh (-18°C ~ -22°C)',
      DRY: 'Kho Khô Thường (+25°C)',
    };
    const temps = { COOL: '+2.5°C', FROZEN: '-19.5°C', DRY: '+26.0°C' };

    const created: ShelfRack = {
      id: newId,
      name: newRackName,
      zone: newRackZone,
      zoneLabel: zoneLabels[newRackZone],
      temperature: temps[newRackZone],
      humidity: '70%',
      maxCapacity: Number(newRackCapacity) || 300,
      currentCapacity: 0,
      items: [],
    };

    setRacks(prev => [...prev, created]);
    setSelectedRackId(newId);
    setShowAddModal(false);
    setNewRackName('');
  };

  const handleUpdateCapacity = () => {
    if (!selectedRack) return;
    const newCap = Number(editCapacityVal) || selectedRack.maxCapacity;
    setRacks(prev =>
      prev.map(r => (r.id === selectedRack.id ? { ...r, maxCapacity: newCap } : r))
    );
    setShowEditCapacityModal(false);
  };

  const getCapacityColor = (current: number, max: number) => {
    const pct = (current / max) * 100;
    if (pct >= 90) return '#ef4444'; // Red
    if (pct >= 75) return '#f59e0b'; // Amber
    return '#10b981'; // Green
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', background: '#f8fafc', minHeight: '100vh', padding: '24px' }}>
      
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '20px 24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: '#f0fdfa', padding: '10px', borderRadius: '12px', color: '#0f766e' }}>
              <Layers size={26} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>
                Bản Đồ 3D Kệ Hàng & Digital Twin Kho Lạnh
              </h2>
              <p style={{ margin: '3px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                Quản lý trực quan sức chứa từng kệ hàng, vị trí mặt hàng, cảm biến nhiệt độ IoT và cảnh báo FEFO
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#f0fdf4', border: '1px solid #86efac', padding: '6px 12px', borderRadius: '10px', fontSize: '11.5px', fontWeight: 800, color: '#166534' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22c55e', display: 'inline-block' }}></span>
            <span>Real Data: {liveLotCount > 0 ? `${liveLotCount} Lô Live (:3011)` : 'Sẵn Sàng'}</span>
          </div>

          <button
            onClick={fetchLiveWarehouseData}
            disabled={isLoadingLive}
            style={{
              padding: '10px 14px',
              backgroundColor: '#f1f5f9',
              color: '#334155',
              border: '1px solid #cbd5e1',
              borderRadius: '12px',
              fontWeight: 800,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <RefreshCw size={15} /> {isLoadingLive ? 'Đang đồng bộ...' : 'Đồng Bộ Kho'}
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            style={{
              padding: '10px 18px',
              backgroundColor: '#0f766e',
              color: '#ffffff',
              border: 'none',
              borderRadius: '12px',
              fontWeight: 800,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 12px rgba(15, 118, 110, 0.3)',
            }}
          >
            <Plus size={16} /> Thêm Dãy Kệ Mới
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '14px 20px', borderRadius: '14px', border: '1px solid #e2e8f0', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto' }}>
          {[
            { key: 'ALL', label: '🏬 Tất Cả Phân Khu' },
            { key: 'COOL', label: '🧊 Kho Mát (0-4°C)' },
            { key: 'FROZEN', label: '❄️ Hầm Đông (-18°C)' },
            { key: 'DRY', label: '🌾 Kho Khô Thường' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setZoneFilter(tab.key as any)}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                border: 'none',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                background: zoneFilter === tab.key ? '#0f766e' : '#f1f5f9',
                color: zoneFilter === tab.key ? '#fff' : '#64748b',
                transition: 'all 0.15s ease',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f1f5f9', padding: '6px 12px', borderRadius: '10px', minWidth: '280px' }}>
          <Search size={15} color="#64748b" />
          <input
            type="text"
            placeholder="Tìm tên kệ, sản phẩm, SKU..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '0.85rem' }}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Main Digital Twin Grid Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.8fr) minmax(360px, 1.2fr)', gap: '20px' }}>
        
        {/* Left Column: 3D Scene / Isometric View */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ background: '#0f172a', borderRadius: '20px', padding: '20px', border: '1px solid #1e293b', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)' }}>
            
            {/* Header with Switcher */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={18} color="#38bdf8" />
                <span style={{ fontSize: '14px', fontWeight: 900, color: '#ffffff' }}>
                  BẢN SAO SỐ 3D KHÔNG GIAN SIÊU THỊ (DIGITAL TWIN)
                </span>
              </div>

              {/* Toggle 3D WebGL vs Isometric */}
              <div style={{ display: 'flex', gap: '6px', backgroundColor: '#020617', padding: '4px', borderRadius: '12px', border: '1px solid #334155' }}>
                <button
                  onClick={() => setDisplayMode('3D_SCENE')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    backgroundColor: displayMode === '3D_SCENE' ? '#0284c7' : 'transparent',
                    color: displayMode === '3D_SCENE' ? '#ffffff' : '#94a3b8',
                    transition: 'all 0.2s',
                  }}
                >
                  <Box size={14} />
                  <span>3D WebGL Siêu Thị</span>
                </button>
                <button
                  onClick={() => setDisplayMode('ISOMETRIC')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    backgroundColor: displayMode === 'ISOMETRIC' ? '#0284c7' : 'transparent',
                    color: displayMode === 'ISOMETRIC' ? '#ffffff' : '#94a3b8',
                    transition: 'all 0.2s',
                  }}
                >
                  <Layers size={14} />
                  <span>Sơ Đồ Kệ Mặt Bằng</span>
                </button>
              </div>
            </div>

            {/* Display Mode: Pure 3D WebGL Scene */}
            {displayMode === '3D_SCENE' ? (
              <Supermarket3DScene
                racks={racks3D}
                selectedRackId={selectedRackId}
                onSelectRack={id => setSelectedRackId(id)}
                zoneFilter={zoneFilter}
              />
            ) : (
              /* Display Mode: Isometric 2.5D Grid */
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '14px' }}>
                {filteredRacks.map(rack => {
                  const isSelected = rack.id === selectedRackId;
                  const pct = Math.round((rack.currentCapacity / rack.maxCapacity) * 100);
                  const capColor = getCapacityColor(rack.currentCapacity, rack.maxCapacity);

                  const zoneBorder =
                    rack.zone === 'COOL' ? '#0284c7' : rack.zone === 'FROZEN' ? '#06b6d4' : '#f59e0b';

                  return (
                    <div
                      key={rack.id}
                      onClick={() => setSelectedRackId(rack.id)}
                      style={{
                        backgroundColor: isSelected ? '#1e293b' : '#020617',
                        border: `2px solid ${isSelected ? '#38bdf8' : rack.hasAlert ? '#ef4444' : zoneBorder}`,
                        borderRadius: '16px',
                        padding: '16px',
                        cursor: 'pointer',
                        position: 'relative',
                        boxShadow: isSelected ? '0 0 20px rgba(56, 189, 248, 0.35)' : 'none',
                        transform: isSelected ? 'translateY(-4px)' : 'none',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {/* Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '10px', fontWeight: 900, backgroundColor: 'rgba(255,255,255,0.1)', color: '#ffffff', padding: '2px 6px', borderRadius: '4px' }}>
                          {rack.id}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 800, color: rack.zone === 'FROZEN' ? '#38bdf8' : rack.zone === 'COOL' ? '#34d399' : '#fbbf24' }}>
                          <Thermometer size={12} />
                          <span>{rack.temperature}</span>
                        </div>
                      </div>

                      <h4 style={{ margin: '0 0 6px 0', fontSize: '13px', fontWeight: 900, color: '#ffffff' }}>
                        {rack.name}
                      </h4>

                      <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '10px' }}>
                        Chứa: <b style={{ color: '#ffffff' }}>{rack.items.length} mặt hàng</b> ({rack.items.reduce((s, i) => s + i.qty, 0)} sản phẩm)
                      </div>

                      {/* Capacity Progress Bar */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', color: '#cbd5e1', marginBottom: '4px' }}>
                          <span>Sức chứa:</span>
                          <b style={{ color: capColor }}>{rack.currentCapacity} / {rack.maxCapacity} ({pct}%)</b>
                        </div>
                        <div style={{ height: '6px', width: '100%', backgroundColor: '#334155', borderRadius: '999px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, backgroundColor: capColor, borderRadius: '999px' }} />
                        </div>
                      </div>

                      {/* Alert Badge if near-expiry */}
                      {rack.hasAlert && (
                        <div style={{ marginTop: '10px', backgroundColor: '#7f1d1d', border: '1px solid #dc2626', padding: '4px 8px', borderRadius: '6px', fontSize: '10px', color: '#fca5a5', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <AlertTriangle size={12} color="#f87171" />
                          <span>{rack.alertMsg}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Selected Shelf Inspector & Product List */}
        {selectedRack && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ background: '#fff', borderRadius: '20px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
              
              {/* Shelf Details Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px', marginBottom: '16px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 900, backgroundColor: '#0f766e', color: '#ffffff', padding: '2px 8px', borderRadius: '6px' }}>
                      {selectedRack.id}
                    </span>
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>
                      {selectedRack.zoneLabel}
                    </span>
                  </div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#0f172a' }}>
                    {selectedRack.name}
                  </h3>
                </div>

                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    onClick={() => {
                      setEditCapacityVal(selectedRack.maxCapacity.toString());
                      setShowEditCapacityModal(true);
                    }}
                    title="Tùy chỉnh sức chứa & giới hạn kệ"
                    style={{ padding: '6px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', color: '#475569' }}
                  >
                    <Edit2 size={15} />
                  </button>
                </div>
              </div>

              {/* Environmental Metrics */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '16px' }}>
                <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>CẢM BIẾN NHIỆT ĐỘ</div>
                  <div style={{ fontSize: '16px', fontWeight: 900, color: '#0369a1', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Thermometer size={16} /> {selectedRack.temperature}
                  </div>
                </div>
                <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>ĐỘ ẨM KHÔNG KHÍ</div>
                  <div style={{ fontSize: '16px', fontWeight: 900, color: '#0f766e', marginTop: '2px' }}>
                    {selectedRack.humidity} (Đạt chuẩn)
                  </div>
                </div>
              </div>

              {/* Products on Shelf */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: '#334155' }}>
                    📦 MẶT HÀNG ĐANG LƯU TRÊN KỆ ({selectedRack.items.length}):
                  </span>
                </div>

                {selectedRack.items.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                    <Package size={32} style={{ margin: '0 auto 8px' }} />
                    <p style={{ margin: 0, fontSize: '12px', fontWeight: 700 }}>Kệ này hiện đang trống, chưa có mặt hàng nào</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {selectedRack.items.map(it => {
                      const isNear = it.daysRemaining <= 3;

                      return (
                        <div
                          key={it.sku}
                          style={{
                            backgroundColor: isNear ? '#fff1f2' : '#f8fafc',
                            border: `1px solid ${isNear ? '#fecdd3' : '#e2e8f0'}`,
                            borderRadius: '12px',
                            padding: '12px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontSize: '10px', fontWeight: 800, backgroundColor: '#0f172a', color: '#ffffff', padding: '1px 6px', borderRadius: '4px' }}>
                                {it.sku}
                              </span>
                              <span style={{ fontSize: '11px', color: '#64748b' }}>
                                {it.category}
                              </span>
                              {isNear && (
                                <span style={{ fontSize: '9px', fontWeight: 900, backgroundColor: '#ef4444', color: '#ffffff', padding: '1px 5px', borderRadius: '4px' }}>
                                  CẬN DATE
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', marginTop: '3px' }}>
                              {it.name}
                            </div>
                            <div style={{ fontSize: '11px', color: isNear ? '#be123c' : '#64748b', marginTop: '2px' }}>
                              Lô: <b>{it.lotCode}</b> • Hạn: <b>{it.expiryDate}</b> (Còn {it.daysRemaining} ngày)
                            </div>
                          </div>

                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '15px', fontWeight: 900, color: '#0f766e' }}>
                              {it.qty} <span style={{ fontSize: '11px', color: '#64748b' }}>{it.unit}</span>
                            </div>
                            <div style={{ fontSize: '10.5px', color: '#64748b', marginTop: '2px' }}>
                              {(it.price * it.qty).toLocaleString('vi-VN')} đ
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

      </div>

      {/* Add Rack Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '20px', maxWidth: '480px', width: '100%', padding: '24px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#0f172a' }}>Thêm Dãy Kệ Mới</h3>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={20} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Tên Dãy Kệ *</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Kệ A4 (Hàng Tươi Sống)"
                  value={newRackName}
                  onChange={e => setNewRackName(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Phân Vùng Nhiệt Độ *</label>
                <select
                  value={newRackZone}
                  onChange={e => setNewRackZone(e.target.value as any)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                >
                  <option value="COOL">🧊 Kho Mát (0°C ~ +4°C)</option>
                  <option value="FROZEN">❄️ Hầm Đông Lạnh (-18°C ~ -22°C)</option>
                  <option value="DRY">🌾 Kho Khô Thường (+25°C)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Sức Chứa Tối Đa (Slots/SP) *</label>
                <input
                  type="number"
                  value={newRackCapacity}
                  onChange={e => setNewRackCapacity(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button onClick={() => setShowAddModal(false)} style={{ flex: 1, padding: '10px', backgroundColor: '#f1f5f9', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: 'pointer' }}>Hủy</button>
                <button onClick={handleAddRack} style={{ flex: 2, padding: '10px', backgroundColor: '#0f766e', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 900, cursor: 'pointer' }}>Tạo Kệ Hàng</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Capacity Modal */}
      {showEditCapacityModal && selectedRack && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '20px', maxWidth: '400px', width: '100%', padding: '24px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#0f172a' }}>Tùy Chỉnh Sức Chứa Kệ</h3>
              <button onClick={() => setShowEditCapacityModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={20} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                Kệ: <b>{selectedRack.name}</b> ({selectedRack.id})
              </p>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Sức Chứa Tối Đa Mới *</label>
                <input
                  type="number"
                  value={editCapacityVal}
                  onChange={e => setEditCapacityVal(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button onClick={() => setShowEditCapacityModal(false)} style={{ flex: 1, padding: '10px', backgroundColor: '#f1f5f9', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: 'pointer' }}>Hủy</button>
                <button onClick={handleUpdateCapacity} style={{ flex: 2, padding: '10px', backgroundColor: '#0f766e', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 900, cursor: 'pointer' }}>Lưu Cập Nhật</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
