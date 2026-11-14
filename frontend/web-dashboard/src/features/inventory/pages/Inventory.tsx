import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Boxes, MapPin, RefreshCw, X, Layers, Settings, Building2, Edit2, Send, ExternalLink, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/features/auth';
import { useWarehouse, type Warehouse } from '@/shared';
import { getApiHost } from '@/shared/utils/apiConfig';
import { Warehouse3DDigitalTwin } from '@/features/warehouse';

const INVENTORY_API = getApiHost(3011); // inventory-service

interface WhStats {
  alerts: number;
  safeCount: number;
  warningCount: number;
  dangerCount: number;
  auditedCount?: number;
  pendingAuditCount?: number;
  depletedCount?: number;
  activeLotsCount?: number;
  dryCount: number;
  coldCount: number;
  frozenCount: number;
  totalLots: number;
}

const Inventory = () => {
  const { user, token } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const isManager = user?.role === 'WAREHOUSE_MANAGER';
  const myWarehouseCode = user?.warehouseCode;

  const {
    warehouses,
    selectedWarehouseCode,
    selectedWarehouse,
    openConfigModal,
    openManageModal,
  } = useWarehouse();

  const navigate = useNavigate();

  // Tab State: Sổ tồn kho vs Bản đồ 3D Digital Twin
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<'STOCK' | '3D_MAP'>(tabParam === '3d' ? '3D_MAP' : 'STOCK');

  // Outbound Creation State & Feedback Modal
  const [isCreatingOutbound, setIsCreatingOutbound] = useState<boolean>(false);
  const [confirmExportModal, setConfirmExportModal] = useState<{
    isOpen: boolean;
    lot: any;
    isDanger: boolean;
    expiryStr: string;
    quantity: number;
    destination: string;
    requesterName: string;
    notes: string;
    existingRetailOrder?: { orderCode: string; status: string; orderedQty: number; id: string } | null;
    disposalMode?: 'REMAINING_ONLY' | 'RECALL_ALL';
  } | null>(null);

  const [outboundSuccessModal, setOutboundSuccessModal] = useState<{
    isOpen: boolean;
    order?: any;
    lot?: any;
    isDanger?: boolean;
  } | null>(null);

  useEffect(() => {
    if (tabParam === '3d') {
      setActiveTab('3D_MAP');
    } else if (tabParam === 'stock' || !tabParam) {
      setActiveTab('STOCK');
    }
  }, [tabParam]);

  // Stock View State with Caching & Pagination
  const [viewingWh, setViewingWh] = useState<Warehouse | null>(null);
  const [whStock, setWhStock] = useState<{sku: string, productName: string, qty: number}[]>([]);
  const [whLots, setWhLots] = useState<any[]>([]);
  const [whStats, setWhStats] = useState<WhStats>({
    alerts: 0,
    safeCount: 0,
    warningCount: 0,
    dangerCount: 0,
    auditedCount: 0,
    pendingAuditCount: 0,
    depletedCount: 0,
    activeLotsCount: 0,
    dryCount: 0,
    coldCount: 0,
    frozenCount: 0,
    totalLots: 0
  });
  const [loadingStock, setLoadingStock] = useState(false);
  const [adjustModal, setAdjustModal] = useState<{ 
    isOpen: boolean; 
    lot: any; 
    newQty: number; 
    reason: string;
    qualityStatus: string;
    note: string;
  }>({ 
    isOpen: false, 
    lot: null, 
    newQty: 0, 
    reason: 'Kiểm kê định kỳ hàng tháng',
    qualityStatus: 'GOOD',
    note: ''
  });

  // Pagination & Filtering state (Default 8 cards to fill 2 full rows of 4 columns)
  const [stockSearch, setStockSearch] = useState('');
  const [stockPage, setStockPage] = useState(1);
  const [stockPageSize, setStockPageSize] = useState(8);

  const [lotsSearch, setLotsSearch] = useState('');
  const [lotsPage, setLotsPage] = useState(1);
  const [lotsPageSize, setLotsPageSize] = useState(8);

  const [selectedRiskFilter, setSelectedRiskFilter] = useState<'ALL' | 'SAFE' | 'WARNING' | 'DANGER' | 'AUDITED' | 'PENDING_AUDIT' | 'DEPLETED'>('ALL');
  const [hideDepletedLots, setHideDepletedLots] = useState(true);
  const [selectedZoneFilter, setSelectedZoneFilter] = useState<'ALL' | 'COLD' | 'FROZEN' | 'DRY'>('ALL');

  // Map of lotCode -> existing Outbound Order (To prevent duplicate disposal / outbound orders)
  const [outboundLotMap, setOutboundLotMap] = useState<Record<string, { orderCode: string; status: string; isDisposal: boolean; id: string; orderedQty: number }>>({});

  useEffect(() => {
    const targetCode = isManager ? myWarehouseCode : selectedWarehouseCode;
    if (targetCode && warehouses.length > 0) {
      const wh = warehouses.find(w => w.code === targetCode) || warehouses[0];
      if (wh) {
        handleViewStock(wh);
      }
    }
  }, [warehouses, isManager, myWarehouseCode, selectedWarehouseCode]);

  const handleViewStock = async (wh: Warehouse, forceRefresh = false) => {
    setViewingWh(wh);
    setLoadingStock(true);

    try {
      const [resLots, resProducts, resOutbounds] = await Promise.all([
        fetch(`${INVENTORY_API}/inventory/lots?limit=5000&warehouseCode=${wh.code}`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${getApiHost(3010)}/products?limit=3000`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${getApiHost(3007)}/outbound-orders?limit=1000`, { headers: { 'Authorization': `Bearer ${token}` } }).catch(() => null)
      ]);

      // Parse existing outbound orders map
      const outMap: Record<string, { orderCode: string; status: string; isDisposal: boolean; id: string; orderedQty: number }> = {};
      if (resOutbounds && resOutbounds.ok) {
        try {
          const outData = await resOutbounds.json();
          const outList = Array.isArray(outData) ? outData : outData.data || [];
          outList.forEach((ord: any) => {
            if (ord.status !== 'CANCELLED') {
              const isDisposal = (ord.destination && ord.destination.toLowerCase().includes('tiêu hủy')) ||
                                 (ord.notes && ord.notes.toLowerCase().includes('tiêu hủy'));
              if (Array.isArray(ord.items)) {
                ord.items.forEach((it: any) => {
                  const itQty = Number(it.pickedQuantity || it.quantity || it.requestedQuantity || 0);
                  const entry = { orderCode: ord.orderCode, status: ord.status, isDisposal, id: ord.id, orderedQty: itQty || Number(ord.totalQuantity || 1) };
                  if (it.lotCode) {
                    outMap[it.lotCode] = entry;
                  }
                  if (it.lotId) {
                    outMap[it.lotId] = entry;
                  }
                });
              }

              // Also map lot codes embedded in notes
              if (ord.notes && ord.notes.includes('Lô:')) {
                const match = ord.notes.match(/Lô:\s*([A-Za-z0-9-_]+)/);
                if (match && match[1]) {
                  const noteLot = match[1].trim();
                  if (!outMap[noteLot]) {
                    outMap[noteLot] = { orderCode: ord.orderCode, status: ord.status, isDisposal, id: ord.id, orderedQty: Number(ord.totalQuantity || 1) };
                  }
                }
              }
            }
          });
        } catch (e) {}
      }
      setOutboundLotMap(outMap);

      if (resLots.ok && resProducts.ok) {
        const lots = await resLots.json();
        const productsData = await resProducts.json();
        const products = Array.isArray(productsData) ? productsData : (productsData.items || []);
        
        const productMap: Record<string, any> = {};
        products.forEach((p: any) => {
          productMap[p.id] = p;
          productMap[p.sku] = p;
        });

        const filtered = lots.filter((l: any) => {
          const isCorrectWh = !l.warehouseCode || l.warehouseCode === wh.code;
          const remQty = l.remainingQty !== undefined ? l.remainingQty : l.quantity;
          const existingOutbound = outMap[l.lotCode] || outMap[l.id];
          const isAlreadyDelivered = existingOutbound && (existingOutbound.status === 'DELIVERED' || existingOutbound.status === 'COMPLETED');
          return isCorrectWh && remQty > 0 && !isAlreadyDelivered;
        });
        
        let dryCount = 0;
        let coldCount = 0;
        let frozenCount = 0;
        const grouped: Record<string, {sku: string, productName: string, qty: number}> = {};
        
        const isUuid = (val?: string) => !val || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val) || val.length > 30;

        const getFriendlyName = (productId: string, lotCode: string, p?: any, zone?: string, location?: string) => {
          if (p?.name && !isUuid(p.name) && !p.name.includes('Emart') && !p.name.startsWith('Thực phẩm tươi sống') && !p.name.startsWith('Thực phẩm đông lạnh')) return p.name;
          const str = `${productId || ''} ${lotCode || ''} ${location || ''} ${p?.sku || ''}`.toUpperCase();
          
          // 1. Specific SKU / Lot patterns
          if (str.includes('TOMATO') || str.includes('CA-CHUA')) return 'Cà chua bi Cherry Đà Lạt VietGAP 500g';
          if (str.includes('MILK') || str.includes('SUA') || str.includes('BUTTER') || str.includes('DALATMILK')) return 'Sữa tươi thanh trùng Dalat Milk 1L';
          if (str.includes('54293')) return 'Kem Đặc Có Đường Vinamilk Tài Lộc Hộp Giấy 380G';
          if (str.includes('EM-10') || str.includes('BEEF') || str.includes('PORK') || str.includes('THIT')) return 'Thịt bò Úc phi lê 500g';
          if (str.includes('EM-20')) return 'Sữa tươi Dalat Milk 1L';
          if (str.includes('EM-30') || str.includes('BROCCOLI') || str.includes('SUP-LO')) return 'Bông cải xanh Baby VietGAP 400g';
          if (str.includes('EM-40') || str.includes('FRUIT') || str.includes('TRAICAY') || str.includes('APPLE') || str.includes('ORANGE')) return 'Táo Envy New Zealand Size 70';
          if (str.includes('EM-45') || str.includes('EGG') || str.includes('TRUNG') || str.includes('PROBI')) return 'Trứng gà Ta Ba Huân hộp 10 quả';
          if (str.includes('EM-46') || str.includes('SEAFOOD') || str.includes('CAHOI') || str.includes('TOM') || str.includes('MUC')) return 'Cá hồi Na Uy phi lê tươi sống 300g';
          if (str.includes('EM-47') || str.includes('GIO') || str.includes('VIEN') || str.includes('SAUSAGE') || str.includes('XUCXICH')) return 'Giò lụa Vissan thượng hạng 500g';
          if (str.includes('EM-48') || str.includes('DAUHU') || str.includes('TOFU') || str.includes('NAM')) return 'Nấm đùi gà baby VietGAP 200g';
          if (str.includes('EM-50') || str.includes('FROZEN_FISH') || str.includes('OCTOPUS') || str.includes('CRAB')) return 'File cá hồi Nauy tươi đông lạnh 500g';
          if (str.includes('EM-60') || str.includes('ICE_CREAM') || str.includes('KEM') || str.includes('MAGNUM') || str.includes('CELANO')) return 'Kem Häagen-Dazs Vani 473ml';
          if (str.includes('EM-70') || str.includes('DIMSUM') || str.includes('HACAO') || str.includes('PIZZA') || str.includes('MANDU')) return 'Há cảo tôm thịt Cầu Tre 500g';
          if (str.includes('EM-85') || str.includes('HOTATE') || str.includes('SCALLOP') || str.includes('SNOWCRAB')) return 'Sò điệp Nhật Hotate đông lạnh 500g';
          if (str.includes('EM-86') || str.includes('POTATO') || str.includes('KHOAITAY') || str.includes('FASTFOOD')) return 'Khoai tây cọng Bỉ Lutosa đông lạnh 1kg';
          if (str.includes('EM-87') || str.includes('BANHBAO') || str.includes('THOPHAT')) return 'Bánh bao xá xíu Thọ Phát gói 4 cái';
          if (str.includes('EM-88') || str.includes('CHICKEN') || str.includes('DUIGA') || str.includes('CANHGA')) return 'Đùi gà góc tư nhập khẩu Mỹ 10kg';
          if (str.includes('EM-90') || str.includes('RICE') || str.includes('GAO') || str.includes('ST25') || str.includes('NOODLE') || str.includes('HAOHAO')) return 'Gạo ST25 Ông Cua Túi 5kg';
          if (str.includes('EM-91') || str.includes('EM-92') || str.includes('EM-93') || str.includes('OIL') || str.includes('DAUAN') || str.includes('SPICE') || str.includes('GIAVI')) return 'Dầu ăn đậu nành Simply nguyên chất 1L';
          if (str.includes('EM-95') || str.includes('COFFEE') || str.includes('CAPHE') || str.includes('G7') || str.includes('TEA') || str.includes('TRA')) return 'Cà phê hòa tan G7 3in1 hộp 50 gói';
          if (str.includes('EM-96') || str.includes('WATER') || str.includes('LAVIE') || str.includes('REDBULL')) return 'Nước khoáng thiên nhiên La Vie 500ml';
          if (str.includes('EM-97') || str.includes('OAT') || str.includes('YENMACH') || str.includes('NUT') || str.includes('HATDIEU')) return 'Yến mạch Quaker Oats Quick 1kg';
          if (str.includes('EM-98') || str.includes('CHINSU') || str.includes('CHOLIMEX') || str.includes('TUONGOT') || str.includes('SAUCE')) return 'Tương ớt Chin-su chai 250g';
          if (str.includes('EM-99') || str.includes('SNACK') || str.includes('RONG BIEN') || str.includes('CHOCOPIE')) return 'Bánh Chocopie Orion hộp 12 cái';

          // 2. Zone-based fallback
          const z = (zone || '').toUpperCase();
          if (z === 'FROZEN' || str.includes('FROZEN') || str.includes('DONG-LANH')) return 'Thực phẩm đông lạnh tiêu chuẩn xuất khẩu';
          if (z === 'COLD' || str.includes('COLD') || str.includes('MAT')) return 'Nông sản rau củ quả VietGAP';
          if (z === 'DRY' || str.includes('DRY') || str.includes('KHO')) return 'Lương thực thực phẩm khô đóng gói';

          return (p?.sku && !isUuid(p.sku)) ? p.sku : 'Thực phẩm dinh dưỡng đóng gói';
        };

        const getFriendlySku = (productId: string, lotCode: string, p?: any) => {
          if (p?.sku && !isUuid(p.sku)) return p.sku;
          const skuMatch = lotCode ? lotCode.match(/LOT-([A-Za-z0-9-]+?)-WH/)?.[1] : null;
          if (skuMatch) return skuMatch;
          const str = `${productId || ''} ${lotCode || ''}`.toUpperCase();
          if (str.includes('BROCCOLI')) return 'VEG-BROCCOLI-01';
          if (str.includes('MILK')) return 'MILK-DALAT-1L';
          if (str.includes('NOODLE')) return 'NOODLE-HAOHAO';
          if (str.includes('BEEF')) return 'BEEF-STEAK-US';
          if (str.includes('TOMATO')) return 'TOMATO-DALAT';
          if (lotCode && lotCode.startsWith('LOT-')) {
            return lotCode.split('-WH')[0].replace(/^LOT-/, '');
          }
          return (!isUuid(productId) && productId) ? productId : (lotCode ? lotCode.split('-')[0] + '-' + lotCode.split('-')[1] : 'SKU-GENERAL');
        };

        // ─────────────────────────────────────────────────────────
        // Product-Aware Spoilage Analysis & Expiry Engine
        // ─────────────────────────────────────────────────────────
        const getAIRiskAnalysis = (lot: any): {
          level: 'SAFE' | 'WARNING' | 'DANGER';
          reason: string;
          recommendation: string;
          aiScore: number;         // 0–100 composite AI risk score
          category: string;        // product category label
          categoryIcon: string;
          shelfLifePct: number;    // % of total shelf life consumed
        } => {
          const backendScore = Number(lot.riskScore) || 0;
          const today = new Date();
          const expiry = lot.expiryDate ? new Date(lot.expiryDate) : null;
          const imported = lot.importDate ? new Date(lot.importDate) : null;
          const daysLeft = expiry ? Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 3600 * 24)) : null;

          // ① Detect product category from name & lot code
          const name = (lot.displayName || '').toLowerCase();
          const code = (lot.lotCode || '').toUpperCase();

          let catKey = 'DRY';
          let catLabel = 'Hàng khô';
          let decayRate = 1.0;  // Sensitivity multiplier (higher = spoils faster)

          if (/cá|tôm|mực|hải sản|cua|ghẹ|sò|ốc/.test(name) || /SEAFOOD|FISH|SHRIMP|SQUID/.test(code)) {
            catKey = 'SEAFOOD'; catLabel = 'Hải sản'; decayRate = 2.8;
          } else if (/thịt|bò|heo|gà|vịt|trứng/.test(name) || /BEEF|PORK|CHICKEN|MEAT|DUCK|EGG/.test(code)) {
            catKey = 'MEAT'; catLabel = 'Thịt & Trứng'; decayRate = 2.2;
          } else if (/sữa|phô mai|yaourt|yogurt|kem|bơ/.test(name) || /MILK|DAIRY|CHEESE|YOGURT/.test(code)) {
            catKey = 'DAIRY'; catLabel = 'Sữa & Dairy'; decayRate = 1.6;
          } else if (/rau|cải|súp lơ|dưa|cà|đậu|hành|ngò|cần/.test(name) || /VEG|BROCCOLI|TOMATO|LETTUCE|SPINACH/.test(code)) {
            catKey = 'VEGETABLE'; catLabel = 'Rau củ quả'; decayRate = 2.0;
          } else if (/táo|cam|xoài|dứa|ổi|chuối|trái cây/.test(name) || /FRUIT|APPLE|MANGO|ORANGE/.test(code)) {
            catKey = 'FRUIT'; catLabel = 'Trái cây'; decayRate = 1.7;
          }

          // ② Shelf life % consumed
          let shelfLifePct = 0;
          if (expiry && imported) {
            const totalDays = (expiry.getTime() - imported.getTime()) / 86400000;
            const usedDays  = (today.getTime() - imported.getTime()) / 86400000;
            shelfLifePct = Math.min(100, Math.max(0, (usedDays / totalDays) * 100));
          } else if (daysLeft !== null && daysLeft >= 0) {
            shelfLifePct = Math.max(0, 100 - Math.min(100, (daysLeft / 365) * 100));
          }

          // ③ Zone appropriateness penalty
          let zonePenalty = 0;
          if ((catKey === 'SEAFOOD' || catKey === 'MEAT') && lot.zone === 'DRY') zonePenalty = 35;
          else if (catKey === 'DAIRY' && lot.zone === 'DRY') zonePenalty = 20;
          else if (catKey === 'VEGETABLE' && lot.zone === 'FROZEN') zonePenalty = 15;

          // ④ Composite Score: shelf life decay (weighted by category) + backend score + zone penalty
          const aiScore = Math.min(100, Math.round(
            shelfLifePct * decayRate * 0.45 +
            backendScore * 0.35 +
            zonePenalty  * 0.20
          ));

          // ⑤ Category-specific day thresholds
          const dangerDays  = catKey === 'SEAFOOD' ? 3 : catKey === 'MEAT' ? 3 : catKey === 'DAIRY' ? 5 : catKey === 'VEGETABLE' ? 4 : catKey === 'FRUIT' ? 5 : 7;
          const warningDays = catKey === 'SEAFOOD' ? 7 : catKey === 'MEAT' ? 7 : catKey === 'DAIRY' ? 14 : catKey === 'VEGETABLE' ? 10 : catKey === 'FRUIT' ? 10 : 30;
          const dangerScore  = catKey === 'SEAFOOD' ? 50 : catKey === 'MEAT' ? 55 : catKey === 'DAIRY' ? 60 : catKey === 'VEGETABLE' ? 60 : 70;
          const warningScore = catKey === 'SEAFOOD' ? 28 : catKey === 'MEAT' ? 32 : catKey === 'DAIRY' ? 38 : catKey === 'VEGETABLE' ? 38 : 45;

          const category = catLabel;

          // ⑥ Absolute hard rules (expiry/damage override everything)
          if (lot.status === 'EXPIRED' || (daysLeft !== null && daysLeft <= 0)) {
            return { level: 'DANGER', aiScore: 100, shelfLifePct, category, categoryIcon: '',
              reason: 'Đã hết hạn sử dụng',
              recommendation: 'Cần xử lý tiêu hủy hoặc trả hàng ngay lập tức' };
          }
          if (lot.status === 'DAMAGED') {
            return { level: 'DANGER', aiScore: 95, shelfLifePct, category, categoryIcon: '',
              reason: 'Hư hỏng trong bảo quản',
              recommendation: 'Cách ly khỏi lô lành, kiểm tra toàn bộ lô hàng' };
          }
          if (zonePenalty > 0 && (daysLeft === null || daysLeft <= dangerDays * 2)) {
            return { level: 'DANGER', aiScore, shelfLifePct, category, categoryIcon: '',
              reason: 'Bảo quản sai nhiệt độ + cận hạn',
              recommendation: `Chuyển ${catLabel} sang khu phù hợp ngay và xuất kho ưu tiên` };
          }

          // ⑦ Day-based rules (product-specific)
          if (daysLeft !== null && daysLeft <= dangerDays) {
            return { level: 'DANGER', aiScore, shelfLifePct, category, categoryIcon: '',
              reason: `Còn ${daysLeft} ngày — ngưỡng nguy hiểm của ${catLabel}`,
              recommendation: `Xuất kho ngay hoặc kiểm kê / thanh lý` };
          }
          if (daysLeft !== null && daysLeft <= warningDays) {
            return { level: 'WARNING', aiScore, shelfLifePct, category, categoryIcon: '',
              reason: `Còn ${daysLeft} ngày — cận hạn với ${catLabel}`,
              recommendation: `Lên kế hoạch xuất kho trong ${daysLeft} ngày tới` };
          }

          // ⑧ AI score-based (product-specific thresholds)
          if (aiScore >= dangerScore || lot.status === 'EXPIRED') {
            return { level: 'DANGER', aiScore, shelfLifePct, category, categoryIcon: '',
              reason: `Rủi ro hư hỏng cao: ${catLabel} (${aiScore}/100)`,
              recommendation: 'Kiểm tra nhiệt độ, độ ẩm và chất lượng hàng' };
          }
          if (aiScore >= warningScore || lot.status === 'AT_RISK') {
            return { level: 'WARNING', aiScore, shelfLifePct, category, categoryIcon: '',
              reason: `Cần theo dõi: ${catLabel} (${aiScore}/100)`,
              recommendation: 'Tăng tần suất kiểm tra, cân nhắc xuất kho sớm' };
          }

          return { level: 'SAFE', aiScore, shelfLifePct, category, categoryIcon: '',
            reason: daysLeft !== null ? `Còn ${daysLeft} ngày — An toàn` : 'Đạt chuẩn bảo quản',
            recommendation: 'Tiếp tục bảo quản theo quy trình tiêu chuẩn' };
        };

        let safeCount = 0;
        let warningCount = 0;
        let dangerCount = 0;
        let auditedCount = 0;

        filtered.forEach((lot: any) => {
          const { level } = getAIRiskAnalysis(lot);
          if (level === 'DANGER') dangerCount++;
          else if (level === 'WARNING') warningCount++;
          else safeCount++;

          if (lot.lastAuditedAt) auditedCount++;

          if (lot.zone === 'DRY') dryCount++;
          if (lot.zone === 'COLD') coldCount++;
          if (lot.zone === 'FROZEN') frozenCount++;

          const skuMatch = lot.lotCode ? lot.lotCode.match(/LOT-([A-Za-z0-9-]+?)-WH/)?.[1] : null;
          const p = productMap[lot.productId] || productMap[lot.sku] || (skuMatch ? productMap[skuMatch] : null);
          const sku = getFriendlySku(lot.productId, lot.lotCode, p);
          const name = getFriendlyName(lot.productId, lot.lotCode, p, lot.zone, lot.location);
          
          if (!grouped[sku]) {
            grouped[sku] = { sku: sku, productName: name, qty: 0 };
          }
          grouped[sku].qty += lot.remainingQty;
        });
        
        const sortedStock = Object.values(grouped).sort((a, b) => b.qty - a.qty);
        const depletedCount = filtered.filter((l: any) => (l.remainingQty || 0) <= 0).length;
        const activeLotsCount = filtered.length - depletedCount;
        const stats = { 
          alerts: dangerCount + warningCount, 
          safeCount, 
          warningCount, 
          dangerCount, 
          auditedCount,
          pendingAuditCount: filtered.length - auditedCount,
          depletedCount,
          activeLotsCount,
          dryCount, 
          coldCount, 
          frozenCount, 
          totalLots: filtered.length 
        };

        const lotMapped = filtered.map((lot: any) => {
          const skuMatch = lot.lotCode ? lot.lotCode.match(/LOT-([A-Za-z0-9-]+?)-WH/)?.[1] : null;
          const p = productMap[lot.productId] || productMap[lot.sku] || (skuMatch ? productMap[skuMatch] : null);
          const displaySku = getFriendlySku(lot.productId, lot.lotCode, p);
          const displayName = getFriendlyName(lot.productId, lot.lotCode, p, lot.zone, lot.location);
          const ai = getAIRiskAnalysis({ ...lot, displayName, displaySku });
          return {
            ...lot,
            displaySku,
            displayName,
            riskLevel: ai.level,
            riskReason: ai.reason,
            riskRecommendation: ai.recommendation,
            aiScore: ai.aiScore,
            riskCategory: ai.category,
            shelfLifePct: ai.shelfLifePct
          };
        });

        setWhStock(sortedStock);
        setWhLots(lotMapped);
        setWhStats(stats);
      }
    } catch (err) {
      console.error('Failed to fetch stock for warehouse:', err);
    } finally {
      setLoadingStock(false);
    }
  };

  // Filtered & Paginated Products Stock
  const filteredWhStock = React.useMemo(() => {
    if (!stockSearch.trim()) return whStock;
    const q = stockSearch.toLowerCase();
    return whStock.filter(item => item.sku.toLowerCase().includes(q) || item.productName.toLowerCase().includes(q));
  }, [whStock, stockSearch]);

  const paginatedStock = React.useMemo(() => {
    const start = (stockPage - 1) * stockPageSize;
    return filteredWhStock.slice(start, start + stockPageSize);
  }, [filteredWhStock, stockPage, stockPageSize]);

  const totalStockPages = Math.ceil(filteredWhStock.length / stockPageSize) || 1;

  // Filtered & Paginated Lots
  const filteredWhLots = React.useMemo(() => {
    let result = whLots;
    if (selectedRiskFilter === 'DEPLETED') {
      result = result.filter(lot => (lot.remainingQty || 0) <= 0);
    } else {
      if (hideDepletedLots) {
        result = result.filter(lot => (lot.remainingQty || 0) > 0);
      }
      if (selectedRiskFilter === 'AUDITED') {
        result = result.filter(lot => !!lot.lastAuditedAt);
      } else if (selectedRiskFilter === 'PENDING_AUDIT') {
        result = result.filter(lot => !lot.lastAuditedAt);
      } else if (selectedRiskFilter !== 'ALL') {
        result = result.filter(lot => lot.riskLevel === selectedRiskFilter);
      }
    }
    if (selectedZoneFilter !== 'ALL') {
      result = result.filter(lot => lot.zone === selectedZoneFilter);
    }
    if (lotsSearch.trim()) {
      const q = lotsSearch.toLowerCase();
      result = result.filter(lot => 
        (lot.lotCode || '').toLowerCase().includes(q) || 
        (lot.displayName || '').toLowerCase().includes(q) || 
        (lot.displaySku || '').toLowerCase().includes(q) || 
        (lot.productId || '').toLowerCase().includes(q) || 
        (lot.location || '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [whLots, lotsSearch, selectedRiskFilter, selectedZoneFilter, hideDepletedLots]);

  const paginatedLots = React.useMemo(() => {
    const start = (lotsPage - 1) * lotsPageSize;
    return filteredWhLots.slice(start, start + lotsPageSize);
  }, [filteredWhLots, lotsPage, lotsPageSize]);

  const totalLotsPages = Math.ceil(filteredWhLots.length / lotsPageSize) || 1;


  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustModal.lot) return;
    
    try {
      const res = await fetch(`${INVENTORY_API}/inventory/lots/${adjustModal.lot.id}/adjust`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          actualQuantity: adjustModal.newQty,
          reason: `${adjustModal.reason}${adjustModal.note ? ` - ${adjustModal.note}` : ''}`,
          performedBy: user?.name || user?.email || 'Quản lý kho (Web Dashboard)'
        })
      });
      if (res.ok) {
        const auditedLotId = adjustModal.lot.id;
        const newQuantity = adjustModal.newQty;
        const fullReason = `${adjustModal.reason}${adjustModal.note ? ` - ${adjustModal.note}` : ''}`;
        const auditor = user?.name || user?.email || 'Quản lý kho (Web Dashboard)';
        const now = new Date().toISOString();
        const prevQty = adjustModal.lot.remainingQty;

        // Nếu số lượng về 0: Xóa bỏ hoàn toàn lô hàng khỏi danh sách và giải phóng vị trí kệ kho
        if (newQuantity <= 0) {
          setWhLots(prev => prev.filter(l => l.id !== auditedLotId));
          alert(`Đã xóa lô hàng ${adjustModal.lot.lotCode} (0 SP) và giải phóng vị trí kệ ${adjustModal.lot.location || ''} để nhập hàng mới.`);
        } else {
          setWhLots(prev => prev.map(l => (l.id === auditedLotId) ? {
            ...l,
            remainingQty: newQuantity,
            lastAuditedAt: now,
            lastAuditedBy: auditor,
            lastAuditActualQty: newQuantity,
            lastAuditDiff: newQuantity - prevQty,
            lastAuditReason: fullReason,
          } : l));
          alert('Cập nhật kết quả kiểm kê lô hàng thành công.');
        }

        setAdjustModal({ isOpen: false, lot: null, newQty: 0, reason: 'Kiểm kê định kỳ hàng tháng', qualityStatus: 'GOOD', note: '' });
      } else {
        alert('Có lỗi xảy ra khi cập nhật tồn kho.');
      }
    } catch (err) {
      console.error(err);
      alert('Không thể kết nối đến server.');
    }
  };

  const renderAdjustModal = () => {
    if (!adjustModal.isOpen || !adjustModal.lot) return null;

    return (
      <div 
        onClick={() => setAdjustModal({ ...adjustModal, isOpen: false })}
        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}
      >
        <div 
          onClick={e => e.stopPropagation()}
          className="card" style={{ width: '560px', maxWidth: '92%', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', backgroundColor: '#fff', maxHeight: '90vh', overflowY: 'auto' }}
        >
          
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px', marginBottom: '14px' }}>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                Phiếu Đối Soát & Kiểm Kê Lô Hàng
              </h3>
              <p style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px', margin: 0 }}>
                Kho {viewingWh?.name || myWarehouseCode} • Kệ: <strong>{adjustModal.lot.location}</strong>
              </p>
            </div>
            <button onClick={() => setAdjustModal({ ...adjustModal, isOpen: false })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
              <X size={20} />
            </button>
          </div>
          
          <form onSubmit={handleAdjustSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            
            {/* Context info box */}
            <div style={{ backgroundColor: '#f0fdfa', border: '1px solid #ccfbf1', borderRadius: '12px', padding: '12px 14px' }}>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f766e' }}>
                {adjustModal.lot.displayName || 'Sản phẩm'}
              </div>
              <div style={{ display: 'flex', gap: '12px', fontSize: '0.75rem', color: '#475569', marginTop: '4px' }}>
                <span>Mã SP: <strong>{adjustModal.lot.displaySku || adjustModal.lot.productId}</strong></span>
                <span>• Mã Lô: <strong>{adjustModal.lot.lotCode}</strong></span>
                <span>• Khu: <strong>{adjustModal.lot.zone}</strong></span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed #99f6e4' }}>
                <span style={{ fontSize: '0.8rem', color: '#0f766e', fontWeight: 600 }}>Tồn sổ sách hệ thống:</span>
                <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f766e' }}>{adjustModal.lot.remainingQty} SP</span>
              </div>
            </div>

            {/* Physical count & Variance */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', alignItems: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155' }}>
                  Số lượng thực đếm tại kệ *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={adjustModal.newQty}
                  onChange={e => setAdjustModal({ ...adjustModal, newQty: parseInt(e.target.value) || 0 })}
                  style={{ padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1.5px solid #0f766e', fontSize: '1.15rem', fontWeight: 900, color: '#1e293b' }}
                />
              </div>

              {/* Variance result */}
              {(() => {
                const delta = adjustModal.newQty - adjustModal.lot.remainingQty;
                return (
                  <div style={{
                    backgroundColor: delta === 0 ? '#f0fdf4' : delta < 0 ? '#fef2f2' : '#eff6ff',
                    border: `1px solid ${delta === 0 ? '#bbf7d0' : delta < 0 ? '#fecaca' : '#bfdbfe'}`,
                    borderRadius: '10px',
                    padding: '10px 12px',
                    height: 'fit-content'
                  }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b' }}>Chênh lệch kiểm kê:</div>
                    <div style={{
                      fontSize: '1rem',
                      fontWeight: 600,
                      marginTop: '2px',
                      color: delta === 0 ? '#16a34a' : delta < 0 ? '#dc2626' : '#2563eb'
                    }}>
                      {delta === 0 ? 'Khớp 100% (0 SP)' : delta < 0 ? `Thiếu hụt: ${delta} SP` : `Thừa hàng: +${delta} SP`}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Quality inspection */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155' }}>
                Đánh giá chất lượng thực phẩm tại kệ *
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {[
                  { key: 'GOOD', label: 'Đạt chuẩn (Tươi)', bg: '#f0fdf4', border: '#86efac' },
                  { key: 'DAMAGED', label: 'Dập nát / Rách', bg: '#fefce8', border: '#fde047' },
                  { key: 'EXPIRED', label: 'Hỏng / Hết hạn', bg: '#fef2f2', border: '#fca5a5' },
                ].map(q => (
                  <button
                    type="button"
                    key={q.key}
                    onClick={() => setAdjustModal({ ...adjustModal, qualityStatus: q.key })}
                    style={{
                      padding: '8px 6px',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      backgroundColor: adjustModal.qualityStatus === q.key ? q.bg : '#fff',
                      border: adjustModal.qualityStatus === q.key ? `2px solid ${q.border}` : '1px solid #cbd5e1',
                      color: '#1e293b'
                    }}
                  >
                    {q.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Adjustment Reason */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155' }}>
                Lý do kiểm kê / điều chỉnh *
              </label>
              <select
                required
                value={adjustModal.reason}
                onChange={e => setAdjustModal({ ...adjustModal, reason: e.target.value })}
                style={{ padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', backgroundColor: '#fff' }}
              >
                <option value="Kiểm kê định kỳ hàng tháng">Kiểm kê định kỳ hàng tháng (Cycle Count)</option>
                <option value="Hao hụt tự nhiên / Giảm trọng lượng rã đông">Hao hụt tự nhiên / Giảm trọng lượng rã đông</option>
                <option value="Hàng dập nát / Hư hỏng trong bảo quản">Hàng dập nát / Hư hỏng trong bảo quản</option>
                <option value="Hết hạn sử dụng">Hết hạn sử dụng (Tiêu hủy theo quy định)</option>
                <option value="Sai lệch khi nhập kho ban đầu">Sai lệch số lượng khi nhập kho ban đầu</option>
                <option value="Khác">Khác (Có ghi chú)</option>
              </select>
            </div>

            {/* Note input */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Ghi chú kiểm kê (Optional)</label>
              <input
                type="text"
                placeholder="Ghi chú chi tiết thêm..."
                value={adjustModal.note}
                onChange={e => setAdjustModal({ ...adjustModal, note: e.target.value })}
                style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
              />
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', borderTop: '1px solid #f1f5f9', paddingTop: '14px' }}>
              <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                Người kiểm: <strong>Manager {myWarehouseCode || 'WH-005'}</strong>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="button" onClick={() => setAdjustModal({ ...adjustModal, isOpen: false })} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: 'transparent', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600 }}>Huỷ</button>
                <button type="submit" className="btn btn-primary" style={{ border: 'none', cursor: 'pointer', borderRadius: '6px', padding: '8px 18px', fontSize: '0.82rem', fontWeight: 600, backgroundColor: '#0f766e', color: '#fff' }}>
                  Xác nhận cập nhật kiểm kê
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // Open pre-export confirmation modal
  const handleCreateOutboundFromLot = (lot: any, isDanger: boolean, expiryStr: string) => {
    const existing = outboundLotMap[lot.lotCode] || outboundLotMap[lot.id];
    
    // If it already has a DISPOSAL order, alert that a disposal order is already in progress
    if (existing && existing.isDisposal) {
      const confirmView = window.confirm(
        `THÔNG BÁO LÔ HÀNG ĐÃ CÓ LỆNH TIÊU HỦY:\n\nLô hàng "${lot.lotCode}" (${lot.displayName || 'Sản phẩm'}) đã được lập phiếu xuất tiêu hủy mã: "${existing.orderCode}" (Trạng thái: ${existing.status}).\n\nBạn có muốn chuyển sang màn hình "Quản Lý Xuất Kho" để xem chi tiết phiếu xuất ${existing.orderCode} không?`
      );
      if (confirmView) {
        navigate(`/outbound-orders?orderCode=${existing.orderCode}`);
      }
      return;
    }

    const hasRetailOrder = existing && !existing.isDisposal;
    const retailOrderedQty = hasRetailOrder ? (existing.orderedQty || 4) : 0;
    const remainingAfterRetail = Math.max(1, (lot.remainingQty || 0) - retailOrderedQty);
    const defaultQty = hasRetailOrder ? remainingAfterRetail : ((lot.remainingQty && lot.remainingQty > 0) ? lot.remainingQty : 1);

    setConfirmExportModal({
      isOpen: true,
      lot,
      isDanger: hasRetailOrder ? true : isDanger,
      expiryStr,
      quantity: defaultQty,
      destination: hasRetailOrder
        ? `Xuất tiêu hủy phần còn lại trên kệ (${defaultQty} SP) - ${lot.lotCode}`
        : (isDanger
          ? `Xuất tiêu hủy / Xử lý lô hết hạn - ${lot.lotCode}`
          : `Xuất bán ưu tiên hạn dùng lô ${lot.lotCode}`),
      requesterName: user?.name || 'Quản lý kho',
      notes: hasRetailOrder
        ? `[TIÊU HỦY PHẦN DƯ] Lô: ${lot.lotCode} | Vị trí: ${lot.location || 'N/A'}. Lô đang có đơn bán lẻ ${existing.orderCode} (${retailOrderedQty} SP) vẫn giao bình thường.`
        : `[${isDanger ? 'XUẤT TIÊU HỦY / TRẢ NCC' : 'XUẤT BÁN ƯU TIÊN'}] Lô: ${lot.lotCode} | Vị trí: ${lot.location || 'N/A'} | HSD: ${expiryStr} | ${lot.riskReason ? `Lý do: ${lot.riskReason}` : ''}`,
      existingRetailOrder: hasRetailOrder ? existing : null,
      disposalMode: hasRetailOrder ? 'REMAINING_ONLY' : undefined,
    });
  };

  // Submit confirmed export order to API
  const handleConfirmExportSubmit = async () => {
    if (!confirmExportModal) return;
    const { lot, isDanger, expiryStr, quantity, destination, requesterName, notes } = confirmExportModal;

    try {
      setIsCreatingOutbound(true);
      const effectiveWh = viewingWh?.code || selectedWarehouseCode || lot.warehouseCode || 'WH-006';
      const exportQty = quantity > 0 ? quantity : 1;

      // 1. Tạo đơn xuất kho bên outbound-service (:3007) ở trạng thái Tạo Yêu Cầu (PENDING)
      const payload = {
        requestedBy: user?.name || user?.email || 'Quản lý kho (Sổ Tồn Kho)',
        requesterName: requesterName || 'Quản lý kho',
        destination: destination || (isDanger ? `Xuất tiêu hủy - ${lot.lotCode}` : `Xuất bán FEFO - ${lot.lotCode}`),
        warehouseCode: effectiveWh,
        notes: notes || `[${isDanger ? 'XUẤT TIÊU HỦY' : 'XUẤT FEFO'}] Lô: ${lot.lotCode}`,
        items: [
          {
            sku: lot.displaySku || lot.productId || lot.sku,
            productName: lot.displayName || 'Sản phẩm',
            requestedQuantity: exportQty,
            lotCode: lot.lotCode,
            lotId: lot.id,
          }
        ]
      };

      const res = await fetch('http://localhost:3007/outbound-orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const order = await res.json();
        
        // Update local outboundLotMap immediately
        setOutboundLotMap(prev => ({
          ...prev,
          [lot.lotCode]: { orderCode: order.orderCode, status: order.status || 'PENDING', isDisposal: isDanger, id: order.id },
          [lot.id]: { orderCode: order.orderCode, status: order.status || 'PENDING', isDisposal: isDanger, id: order.id }
        }));

        // Deduct lot quantity in local state immediately so all inventory views reflect the disposal order
        setWhLots(prev => prev.map(l => {
          if (l.id === lot.id || l.lotCode === lot.lotCode) {
            const newQty = Math.max(0, (l.remainingQty || 0) - exportQty);
            return { ...l, remainingQty: newQty };
          }
          return l;
        }));

        // Sync product-service stock immediately
        fetch('http://localhost:3010/products/sync-stock', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sku: lot.displaySku || lot.productId || lot.sku })
        }).catch(() => {});

        window.dispatchEvent(new CustomEvent('sfwms:product_refresh'));

        setConfirmExportModal(null);
        setOutboundSuccessModal({
          isOpen: true,
          order,
          lot,
          isDanger
        });
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`Lỗi tạo phiếu xuất kho: ${err.message || 'Thất bại'}`);
      }
    } catch (err: any) {
      console.error(err);
      alert(`Lỗi kết nối máy chủ xuất kho: ${err.message}`);
    } finally {
      setIsCreatingOutbound(false);
    }
  };

  const renderConfirmExportModal = () => {
    if (!confirmExportModal || !confirmExportModal.isOpen) return null;
    const { lot, isDanger, expiryStr } = confirmExportModal;

    return (
      <div 
        onClick={() => setConfirmExportModal(null)}
        style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}
      >
        <div 
          onClick={e => e.stopPropagation()}
          style={{
          background: '#ffffff',
          borderRadius: '12px',
          width: '560px',
          maxWidth: '95%',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e2e8f0',
        }}>
          {/* Header */}
          <div style={{
            background: isDanger ? '#dc2626' : '#0f172a',
            padding: '16px 20px', color: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Send size={18} color="#ffffff" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>
                  {isDanger ? 'Xác Nhận Xuất Tiêu Hủy / Trả NCC' : 'Xác Nhận Lập Phiếu Xuất Kho'}
                </h3>
                <p style={{ margin: 0, fontSize: '11.5px', opacity: 0.85 }}>Lô hàng: <b>{lot.lotCode}</b></p>
              </div>
            </div>
            <button
              onClick={() => setConfirmExportModal(null)}
              style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer', opacity: 0.8 }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Body */}
          <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Info Box */}
            <div style={{ background: isDanger ? '#fef2f2' : '#f0fdf4', border: `1px solid ${isDanger ? '#fecaca' : '#bbf7d0'}`, borderRadius: '8px', padding: '12px 14px' }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>
                {lot.displayName || 'Sản phẩm'}
              </div>
              <div style={{ display: 'flex', gap: '10px', fontSize: '12px', color: '#475569', marginTop: '4px', flexWrap: 'wrap' }}>
                <span>SKU: <b>{lot.displaySku || lot.productId}</b></span>
                <span>• Vị trí: <b style={{ color: '#0f766e' }}>{lot.location}</b></span>
                <span>• HSD: <b style={{ color: isDanger ? '#dc2626' : '#0284c7' }}>{expiryStr}</b></span>
                <span>• Tồn thực tế: <b>{lot.remainingQty} SP</b></span>
              </div>
              {lot.riskReason && (
                <div style={{ fontSize: '11.5px', color: isDanger ? '#991b1b' : '#15803d', marginTop: '6px', fontStyle: 'italic' }}>
                  {lot.riskReason}
                </div>
              )}
            </div>

            {/* Conflict Resolution Box when lot has existing retail order */}
            {confirmExportModal.existingRetailOrder && (
              <div style={{
                background: '#fffbeb',
                border: '1.5px solid #fde68a',
                borderRadius: '8px',
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#92400e', fontSize: '12.5px', fontWeight: 700 }}>
                  <AlertTriangle size={16} color="#d97706" />
                  <span>Xung đột: Lô này đang có đơn bán lẻ {confirmExportModal.existingRetailOrder.orderCode} ({confirmExportModal.existingRetailOrder.orderedQty || 4} SP)!</span>
                </div>
                <div style={{ fontSize: '11.5px', color: '#78350f', lineHeight: '1.4' }}>
                  Hệ thống hỗ trợ 2 hướng xử lý nghiệp vụ khi muốn tiêu hủy:
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '2px' }}>
                  <label style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    backgroundColor: confirmExportModal.disposalMode === 'REMAINING_ONLY' ? '#fef3c7' : '#ffffff',
                    border: `1.5px solid ${confirmExportModal.disposalMode === 'REMAINING_ONLY' ? '#f59e0b' : '#e2e8f0'}`,
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}>
                    <input
                      type="radio"
                      name="disposalMode"
                      checked={confirmExportModal.disposalMode === 'REMAINING_ONLY'}
                      onChange={() => {
                        const ordered = confirmExportModal.existingRetailOrder?.orderedQty || 4;
                        const rem = Math.max(1, (lot.remainingQty || 0) - ordered);
                        setConfirmExportModal({
                          ...confirmExportModal,
                          disposalMode: 'REMAINING_ONLY',
                          quantity: rem,
                          destination: `Xuất tiêu hủy phần còn lại trên kệ (${rem} SP) - ${lot.lotCode}`,
                          notes: `[TIÊU HỦY PHẦN DƯ] Lô: ${lot.lotCode}. Đơn bán lẻ ${confirmExportModal.existingRetailOrder?.orderCode} (${ordered} SP) vẫn giao bình thường.`
                        });
                      }}
                      style={{ marginTop: '2px', cursor: 'pointer' }}
                    />
                    <div>
                      <div style={{ fontWeight: 700, color: '#92400e' }}>
                        Phương án 1: Chỉ xuất tiêu hủy {Math.max(1, (lot.remainingQty || 0) - (confirmExportModal.existingRetailOrder.orderedQty || 4))} SP còn lại trên kệ
                      </div>
                      <div style={{ fontSize: '11px', color: '#78350f', marginTop: '1px' }}>
                        Áp dụng khi 4 SP giao trước đó đạt chuẩn, chỉ tiêu hủy số còn lại trên kệ. Đơn khách vẫn tiếp tục giao.
                      </div>
                    </div>
                  </label>

                  <label style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    backgroundColor: confirmExportModal.disposalMode === 'RECALL_ALL' ? '#fee2e2' : '#ffffff',
                    border: `1.5px solid ${confirmExportModal.disposalMode === 'RECALL_ALL' ? '#ef4444' : '#e2e8f0'}`,
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}>
                    <input
                      type="radio"
                      name="disposalMode"
                      checked={confirmExportModal.disposalMode === 'RECALL_ALL'}
                      onChange={() => {
                        setConfirmExportModal({
                          ...confirmExportModal,
                          disposalMode: 'RECALL_ALL',
                          quantity: lot.remainingQty,
                          destination: `Thu hồi & tiêu hủy toàn bộ lô (${lot.remainingQty} SP) - ${lot.lotCode}`,
                          notes: `[THU HỒI TOÀN BỘ LÔ] Lô: ${lot.lotCode} biến chất. Yêu cầu điều phối viên đổi nguồn hàng thay thế an toàn cho đơn ${confirmExportModal.existingRetailOrder?.orderCode}.`
                        });
                      }}
                      style={{ marginTop: '2px', cursor: 'pointer' }}
                    />
                    <div>
                      <div style={{ fontWeight: 700, color: '#b91c1c' }}>
                        Phương án 2 (Khẩn cấp): Thu hồi & Tiêu hủy toàn bộ {lot.remainingQty} SP
                      </div>
                      <div style={{ fontSize: '11px', color: '#991b1b', marginTop: '1px' }}>
                        Áp dụng khi phát hiện cả lô bị ôi thiu/biến chất. Điều phối viên sẽ đổi nguồn hàng sang lô an toàn khác cho đơn {confirmExportModal.existingRetailOrder.orderCode}.
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* Inputs */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                Số lượng xuất kho:
              </label>
              <input
                type="number"
                min={1}
                max={lot.remainingQty || 99999}
                value={confirmExportModal.quantity}
                onChange={e => setConfirmExportModal({ ...confirmExportModal, quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: 700, color: '#0f172a' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                Điểm đến / Mục đích xuất:
              </label>
              <input
                type="text"
                value={confirmExportModal.destination}
                onChange={e => setConfirmExportModal({ ...confirmExportModal, destination: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', color: '#0f172a' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                Người lập yêu cầu xuất:
              </label>
              <input
                type="text"
                value={confirmExportModal.requesterName}
                onChange={e => setConfirmExportModal({ ...confirmExportModal, requesterName: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', color: '#0f172a' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                Ghi chú nghiệp vụ:
              </label>
              <textarea
                rows={2}
                value={confirmExportModal.notes}
                onChange={e => setConfirmExportModal({ ...confirmExportModal, notes: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', color: '#0f172a' }}
              />
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button
                disabled={isCreatingOutbound}
                onClick={handleConfirmExportSubmit}
                style={{
                  flex: 1.5,
                  padding: '11px 16px',
                  borderRadius: '10px',
                  backgroundColor: isDanger ? '#dc2626' : '#0284c7',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 800,
                  fontSize: '13px',
                  cursor: isCreatingOutbound ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  boxShadow: isDanger ? '0 4px 12px rgba(220, 38, 38, 0.3)' : '0 4px 12px rgba(2, 132, 199, 0.3)'
                }}
              >
                {isCreatingOutbound ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={16} />}
                Xác Nhận Tạo Phiếu Xuất
              </button>

              <button
                onClick={() => setConfirmExportModal(null)}
                style={{
                  flex: 1,
                  padding: '11px 16px',
                  borderRadius: '10px',
                  backgroundColor: '#f1f5f9',
                  color: '#475569',
                  border: '1px solid #cbd5e1',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                Huỷ Bỏ
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderOutboundSuccessModal = () => {
    if (!outboundSuccessModal || !outboundSuccessModal.isOpen || !outboundSuccessModal.order) return null;
    const { order, lot, isDanger } = outboundSuccessModal;

    return (
      <div 
        onClick={() => setOutboundSuccessModal({ isOpen: false, order: null, lot: null, isDanger: false })}
        style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.7)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}
      >
        <div 
          onClick={e => e.stopPropagation()}
          style={{
          background: '#ffffff',
          borderRadius: '20px',
          width: '560px',
          maxWidth: '95%',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid #e2e8f0',
          overflow: 'hidden'
        }}>
          {/* Header */}
          <div style={{ background: isDanger ? 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)' : 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', padding: '20px 24px', color: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle2 size={22} color="#ffffff" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 900 }}>
                  {isDanger ? 'Đã Tạo Đơn Xuất Hủy / Xử Lý Hết Hạn' : 'Đã Tạo Đơn Xuất Kho Ưu Tiên Hạn Dùng'}
                </h3>
                <p style={{ margin: 0, fontSize: '12px', opacity: 0.9 }}>Mã phiếu xuất: <b>{order.orderCode}</b></p>
              </div>
            </div>
            <button
              onClick={() => setOutboundSuccessModal(null)}
              style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer', opacity: 0.8 }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div style={{ padding: '24px' }}>
            <div style={{ backgroundColor: isDanger ? '#fef2f2' : '#f0fdf4', border: `1px solid ${isDanger ? '#fecaca' : '#bbf7d0'}`, borderRadius: '8px', padding: '14px', marginBottom: '16px' }}>
              <div style={{ fontSize: '13.5px', fontWeight: 600, color: isDanger ? '#991b1b' : '#166534', marginBottom: '4px' }}>
                Đơn xuất kho <b>{order.orderCode}</b> đã được tạo thành công
              </div>
              <div style={{ fontSize: '12.5px', color: isDanger ? '#b91c1c' : '#15803d', lineHeight: '1.4' }}>
                Lô hàng <b>{lot?.lotCode}</b> ({lot?.displayName}) đã được đưa vào quy trình xuất kho. Bạn có thể mở đơn ngay để tiếp nhận, soạn hàng, đóng gói hoặc chỉnh sửa thông tin.
              </div>
            </div>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px', fontSize: '12.5px', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Trạng thái đơn:</span>
                <span style={{ fontWeight: 600, color: '#b45309', backgroundColor: '#fef3c7', padding: '2px 8px', borderRadius: '4px' }}>
                  Tạo yêu cầu (PENDING)
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Sản phẩm / Mã Lô:</span>
                <b style={{ color: '#0f172a' }}>{lot?.displayName} ({lot?.lotCode})</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Vị trí kệ lưu kho:</span>
                <b style={{ color: '#0f766e' }}>{lot?.location || 'Chưa định vị'}</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Số lượng xuất:</span>
                <b style={{ color: '#0284c7' }}>{order.totalQuantity || lot?.remainingQty} sản phẩm</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Điểm đến / Mục đích:</span>
                <b style={{ color: '#334155' }}>{order.destination}</b>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => {
                  const orderId = order.id;
                  setOutboundSuccessModal(null);
                  navigate(orderId ? `/outbound-orders?selectedId=${orderId}` : '/outbound-orders');
                }}
                style={{
                  flex: 1.5,
                  padding: '12px 18px',
                  borderRadius: '12px',
                  backgroundColor: isDanger ? '#dc2626' : '#0284c7',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 800,
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: isDanger ? '0 4px 12px rgba(220, 38, 38, 0.3)' : '0 4px 12px rgba(2, 132, 199, 0.3)'
                }}
              >
                <ExternalLink size={16} /> Mở Đơn Xuất Kho & Chỉnh Sửa
              </button>

              <button
                onClick={() => setOutboundSuccessModal(null)}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  borderRadius: '12px',
                  backgroundColor: '#f1f5f9',
                  color: '#475569',
                  border: '1px solid #cbd5e1',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                Ở lại Sổ Tồn Kho
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderStockDashboard = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', flex: 1 }}>
      {renderAdjustModal()}
      {renderConfirmExportModal()}
      {renderOutboundSuccessModal()}
      {/* 4 KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
        <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Tổng số mặt hàng</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>{whStock.length} mặt hàng</div>
        </div>
        <div 
          onClick={() => { setSelectedRiskFilter('ALL'); setSelectedZoneFilter('ALL'); setLotsPage(1); }}
          style={{ backgroundColor: (selectedRiskFilter === 'ALL' && selectedZoneFilter === 'ALL') ? '#ccfbf1' : '#f0fdfa', padding: '1rem', borderRadius: '12px', border: (selectedRiskFilter === 'ALL' && selectedZoneFilter === 'ALL') ? '2px solid #0f766e' : '1px solid #ccfbf1', cursor: 'pointer', transition: 'all 0.2s ease' }}
          title="Bấm để xem tất cả lô hàng"
        >
          <div style={{ fontSize: '0.8rem', color: '#0d9488', fontWeight: 600, textTransform: 'uppercase' }}>Tổng hàng lưu trữ</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f766e', marginTop: '4px' }}>{whStats?.totalLots} Lô</div>
        </div>

        {/* Clickable Cảnh báo Hết Hạn / Hỏng Card */}
        <div 
          onClick={() => {
            setSelectedRiskFilter(prev => prev === 'DANGER' ? 'ALL' : 'DANGER');
            setLotsPage(1);
          }}
          style={{ 
            backgroundColor: selectedRiskFilter === 'DANGER' ? '#fee2e2' : '#fef2f2', 
            padding: '1rem', 
            borderRadius: '12px', 
            border: selectedRiskFilter === 'DANGER' ? '2px solid #ef4444' : '1px solid #fecaca',
            cursor: 'pointer',
            boxShadow: selectedRiskFilter === 'DANGER' ? '0 0 0 3px rgba(239, 68, 68, 0.2)' : 'none',
            transition: 'all 0.2s ease',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
          title="Bấm để lọc nhanh các lô hàng cảnh báo hết hạn hoặc hư hỏng"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '0.8rem', color: '#dc2626', fontWeight: 700, textTransform: 'uppercase' }}>
              Cảnh báo Hết Hạn / Hư Hỏng
            </div>
            {selectedRiskFilter === 'DANGER' && (
              <span style={{ fontSize: '0.65rem', backgroundColor: '#ef4444', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontWeight: 800 }}>
                ĐANG LỌC
              </span>
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '4px' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#b91c1c' }}>{whStats?.dangerCount || 0} Lô</div>
            <span style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 700, textDecoration: 'underline' }}>
              {selectedRiskFilter === 'DANGER' ? 'Bỏ lọc' : 'Lọc ngay →'}
            </span>
          </div>
        </div>

        <div style={{ backgroundColor: '#fffbeb', padding: '1rem', borderRadius: '12px', border: '1px solid #fde68a' }}>
          <div style={{ fontSize: '0.8rem', color: '#d97706', fontWeight: 600, textTransform: 'uppercase' }}>Quản lý kho</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#b45309', marginTop: '8px' }}>Manager {viewingWh?.code.split('-')[1] || '01'}</div>
        </div>
      </div>

      {/* Storage Types (Clickable Zone Filters) */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>Phân bổ sức chứa (Khu vực)</h4>
          {selectedZoneFilter !== 'ALL' && (
            <button 
              onClick={() => { setSelectedZoneFilter('ALL'); setLotsPage(1); }}
              style={{ border: 'none', background: 'none', color: '#0f766e', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}
            >
              Xem tất cả khu vực
            </button>
          )}
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div 
            onClick={() => { setSelectedZoneFilter(prev => prev === 'FROZEN' ? 'ALL' : 'FROZEN'); setLotsPage(1); }}
            style={{ flex: 1, backgroundColor: selectedZoneFilter === 'FROZEN' ? '#dbeafe' : '#eff6ff', padding: '1rem', borderRadius: '8px', border: selectedZoneFilter === 'FROZEN' ? '2px solid #2563eb' : '1px solid transparent', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.2s ease' }}
            title="Bấm để lọc lô hàng Kho Đông"
          >
            <span style={{ color: '#1d4ed8', fontWeight: 600 }}>Kho Đông (-18°C)</span>
            <span style={{ fontSize: '1.2rem', fontWeight: 700, color: '#1e40af' }}>{whStats?.frozenCount} lô</span>
          </div>
          <div 
            onClick={() => { setSelectedZoneFilter(prev => prev === 'COLD' ? 'ALL' : 'COLD'); setLotsPage(1); }}
            style={{ flex: 1, backgroundColor: selectedZoneFilter === 'COLD' ? '#ccfbf1' : '#ecfdf5', padding: '1rem', borderRadius: '8px', border: selectedZoneFilter === 'COLD' ? '2px solid #059669' : '1px solid transparent', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.2s ease' }}
            title="Bấm để lọc lô hàng Kho Mát"
          >
            <span style={{ color: '#047857', fontWeight: 600 }}>Kho Mát (0-4°C)</span>
            <span style={{ fontSize: '1.2rem', fontWeight: 700, color: '#065f46' }}>{whStats?.coldCount} lô</span>
          </div>
          <div 
            onClick={() => { setSelectedZoneFilter(prev => prev === 'DRY' ? 'ALL' : 'DRY'); setLotsPage(1); }}
            style={{ flex: 1, backgroundColor: selectedZoneFilter === 'DRY' ? '#e2e8f0' : '#f8fafc', padding: '1rem', borderRadius: '8px', border: selectedZoneFilter === 'DRY' ? '2px solid #475569' : '1px solid transparent', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.2s ease' }}
            title="Bấm để lọc lô hàng Kho Khô"
          >
            <span style={{ color: '#475569', fontWeight: 600 }}>Kho Khô</span>
            <span style={{ fontSize: '1.2rem', fontWeight: 700, color: '#334155' }}>{whStats?.dryCount} lô</span>
          </div>
        </div>
      </div>

      {/* Table of Products Stock */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
            Danh sách Sản phẩm tồn kho ({filteredWhStock.length})
          </h4>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="text"
              placeholder="Tìm theo mã sản phẩm hoặc tên..."
              value={stockSearch}
              onChange={e => { setStockSearch(e.target.value); setStockPage(1); }}
              style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.8rem', width: '220px' }}
            />
          </div>
        </div>

        {filteredWhStock.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b', backgroundColor: '#f8fafc', borderRadius: '12px' }}>
            Không tìm thấy sản phẩm nào phù hợp.
          </div>
        ) : (
          <div style={{ flex: 1, borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: '#fff', overflow: 'hidden' }}>
            <table className="table" style={{ fontSize: '0.85rem', margin: 0, width: '100%' }}>
              <thead style={{ backgroundColor: '#f8fafc' }}>
                <tr>
                  <th style={{ backgroundColor: '#f1f5f9', padding: '10px 14px' }}>Mã Sản Phẩm</th>
                  <th style={{ backgroundColor: '#f1f5f9', padding: '10px 14px' }}>Tên Sản Phẩm</th>
                  <th style={{ textAlign: 'right', backgroundColor: '#f1f5f9', padding: '10px 14px' }}>Số lượng tồn (Kg/Thùng)</th>
                </tr>
              </thead>
              <tbody>
                {paginatedStock.map((item) => (
                  <tr key={item.sku} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td className="font-semibold" style={{ color: '#0f766e', padding: '10px 14px' }}>{item.sku}</td>
                    <td className="font-medium" style={{ padding: '10px 14px' }}>{item.productName}</td>
                    <td style={{ textAlign: 'right', fontWeight: 800, color: '#1e293b', fontSize: '0.95rem', padding: '10px 14px' }}>{item.qty?.toLocaleString('vi-VN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination for Products Stock */}
            {totalStockPages > 1 && (
              <div style={{ padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e2e8f0', background: '#f8fafc' }}>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  Trang <strong>{stockPage}</strong> / <strong>{totalStockPages}</strong> (Tổng: {filteredWhStock.length} SKU)
                </span>
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                  <button
                    disabled={stockPage <= 1}
                    onClick={() => setStockPage(p => Math.max(1, p - 1))}
                    style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.75rem', cursor: stockPage <= 1 ? 'not-allowed' : 'pointer' }}
                  >
                    &lt;
                  </button>

                  {Array.from({ length: totalStockPages }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === totalStockPages || Math.abs(p - stockPage) <= 2)
                    .map((p, i, arr) => (
                      <React.Fragment key={p}>
                        {i > 0 && arr[i - 1] !== p - 1 && <span style={{ padding: '0 3px', color: '#94a3b8', fontSize: '0.75rem' }}>...</span>}
                        <button
                          onClick={() => setStockPage(p)}
                          style={{
                            padding: '4px 8px',
                            borderRadius: '6px',
                            border: '1px solid',
                            borderColor: stockPage === p ? '#0f766e' : '#cbd5e1',
                            backgroundColor: stockPage === p ? '#0f766e' : '#fff',
                            color: stockPage === p ? '#fff' : '#334155',
                            fontSize: '0.75rem',
                            fontWeight: stockPage === p ? 800 : 500,
                            cursor: 'pointer',
                            minWidth: '28px'
                          }}
                        >
                          {p}
                        </button>
                      </React.Fragment>
                    ))}

                  <button
                    disabled={stockPage >= totalStockPages}
                    onClick={() => setStockPage(p => Math.min(totalStockPages, p + 1))}
                    style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.75rem', cursor: stockPage >= totalStockPages ? 'not-allowed' : 'pointer' }}
                  >
                    &gt;
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {isManager && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', marginTop: '1.25rem' }}>
          
          {/* Section Header & Filter Controls */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <Boxes size={20} color="#0f766e" /> Chi tiết Lô hàng & Kiểm kê ({filteredWhLots.length})
              </h4>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ backgroundColor: '#f0fdf4', color: '#16a34a', padding: '2px 6px', borderRadius: '4px', fontWeight: 600, border: '1px solid #bbf7d0' }}>
                  Giám sát chất lượng tự động
                </span>
                <span>Tiêu chuẩn bảo quản kho lạnh 24/7 • Đảm bảo hạn sử dụng đạt chuẩn</span>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                onClick={async () => {
                  if (viewingWh) {
                    await handleViewStock(viewingWh, true);
                    alert('Đã cập nhật đánh giá rủi ro chất lượng cho toàn bộ lô hàng.');
                  }
                }}
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  border: '1px solid #0f766e',
                  backgroundColor: '#f0fdfa',
                  color: '#0f766e',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
                title="Cập nhật đánh giá chất lượng và hạn sử dụng cho toàn bộ lô hàng"
              >
                <RefreshCw size={12} />
                <span>Cập nhật đánh giá</span>
              </button>

              {/* Search Input */}
              <input
                type="text"
                placeholder="Tìm mã lô, vị trí kệ, mã sản phẩm..."
                value={lotsSearch}
                onChange={e => { setLotsSearch(e.target.value); setLotsPage(1); }}
                style={{ padding: '6px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', width: '210px' }}
              />
            </div>
          </div>

          {/* 4 Interactive Risk Level Filter Tabs */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '12px' }}>
            <button
              onClick={() => { setSelectedRiskFilter('ALL'); setLotsPage(1); }}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid',
                borderColor: selectedRiskFilter === 'ALL' ? '#0f766e' : '#cbd5e1',
                backgroundColor: selectedRiskFilter === 'ALL' ? '#0f766e' : '#fff',
                color: selectedRiskFilter === 'ALL' ? '#fff' : '#334155',
                fontWeight: 600,
                fontSize: '0.78rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              Tất cả ({whLots.length})
            </button>

            <button
              onClick={() => { setSelectedRiskFilter('SAFE'); setLotsPage(1); }}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid',
                borderColor: selectedRiskFilter === 'SAFE' ? '#16a34a' : '#bbf7d0',
                backgroundColor: selectedRiskFilter === 'SAFE' ? '#16a34a' : '#f0fdf4',
                color: selectedRiskFilter === 'SAFE' ? '#fff' : '#15803d',
                fontWeight: 600,
                fontSize: '0.78rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              Bình thường ({whStats?.safeCount || 0})
            </button>

            <button
              onClick={() => { setSelectedRiskFilter('WARNING'); setLotsPage(1); }}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid',
                borderColor: selectedRiskFilter === 'WARNING' ? '#d97706' : '#fde68a',
                backgroundColor: selectedRiskFilter === 'WARNING' ? '#d97706' : '#fffbeb',
                color: selectedRiskFilter === 'WARNING' ? '#fff' : '#b45309',
                fontWeight: 600,
                fontSize: '0.78rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              Có nguy cơ ({whStats?.warningCount || 0})
            </button>

            <button
              onClick={() => { setSelectedRiskFilter('DANGER'); setLotsPage(1); }}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid',
                borderColor: selectedRiskFilter === 'DANGER' ? '#dc2626' : '#fecaca',
                backgroundColor: selectedRiskFilter === 'DANGER' ? '#dc2626' : '#fef2f2',
                color: selectedRiskFilter === 'DANGER' ? '#fff' : '#b91c1c',
                fontWeight: 600,
                fontSize: '0.78rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              Báo động đỏ ({whStats?.dangerCount || 0})
            </button>

            <button
              onClick={() => { setSelectedRiskFilter('AUDITED'); setLotsPage(1); }}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid',
                borderColor: selectedRiskFilter === 'AUDITED' ? '#0f766e' : '#99f6e4',
                backgroundColor: selectedRiskFilter === 'AUDITED' ? '#0f766e' : '#f0fdfa',
                color: selectedRiskFilter === 'AUDITED' ? '#fff' : '#0f766e',
                fontWeight: 600,
                fontSize: '0.78rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              Đã kiểm kê ({whStats?.auditedCount || 0})
            </button>

            <button
              onClick={() => { setSelectedRiskFilter('PENDING_AUDIT'); setLotsPage(1); }}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid',
                borderColor: selectedRiskFilter === 'PENDING_AUDIT' ? '#64748b' : '#e2e8f0',
                backgroundColor: selectedRiskFilter === 'PENDING_AUDIT' ? '#64748b' : '#f8fafc',
                color: selectedRiskFilter === 'PENDING_AUDIT' ? '#fff' : '#475569',
                fontWeight: 600,
                fontSize: '0.78rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              Chưa kiểm kê ({whStats?.pendingAuditCount || 0})
            </button>

            <button
              onClick={() => { setSelectedRiskFilter('DEPLETED'); setLotsPage(1); }}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid',
                borderColor: selectedRiskFilter === 'DEPLETED' ? '#475569' : '#e2e8f0',
                backgroundColor: selectedRiskFilter === 'DEPLETED' ? '#475569' : '#f8fafc',
                color: selectedRiskFilter === 'DEPLETED' ? '#fff' : '#64748b',
                fontWeight: 600,
                fontSize: '0.78rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              Đã hết (0 SP: {whStats?.depletedCount || 0})
            </button>

            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.76rem', color: '#334155', fontWeight: 600, cursor: 'pointer', marginLeft: 'auto', backgroundColor: '#f8fafc', padding: '5px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <input
                type="checkbox"
                checked={hideDepletedLots}
                onChange={e => { setHideDepletedLots(e.target.checked); setLotsPage(1); }}
                style={{ cursor: 'pointer' }}
              />
              Tự động ẩn lô 0 tồn kho
            </label>
          </div>

          {/* Active Filter Banner */}
          {(selectedRiskFilter !== 'ALL' || selectedZoneFilter !== 'ALL') && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: selectedRiskFilter === 'DANGER' ? '#fee2e2' : selectedRiskFilter === 'WARNING' ? '#fffbeb' : '#f0fdfa', border: `1px solid ${selectedRiskFilter === 'DANGER' ? '#fca5a5' : selectedRiskFilter === 'WARNING' ? '#fde68a' : '#99f6e4'}`, padding: '8px 14px', borderRadius: '6px', marginBottom: '12px', fontSize: '0.8rem' }}>
              <div style={{ fontWeight: 600, color: selectedRiskFilter === 'DANGER' ? '#991b1b' : selectedRiskFilter === 'WARNING' ? '#b45309' : '#0f766e', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>
                  Đang lọc: {selectedRiskFilter === 'DANGER' ? 'Lô hàng Báo Động Đỏ / Hư hỏng' : selectedRiskFilter === 'WARNING' ? 'Lô hàng Có Nguy Cơ (Cận hạn sử dụng)' : selectedRiskFilter === 'SAFE' ? 'Lô hàng Đạt Chuẩn Bình Thường' : ''} 
                  {selectedZoneFilter !== 'ALL' ? ` • Khu vực: ${selectedZoneFilter}` : ''} ({filteredWhLots.length} Lô)
                </span>
              </div>
              <button 
                onClick={() => { setSelectedRiskFilter('ALL'); setSelectedZoneFilter('ALL'); setLotsPage(1); }}
                style={{ background: 'none', border: 'none', color: '#dc2626', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline', fontSize: '0.78rem' }}
              >
                Xóa bộ lọc (Xem tất cả)
              </button>
            </div>
          )}

          {filteredWhLots.length === 0 ? (
            <div style={{ padding: '2.5rem', textAlign: 'center', color: '#64748b', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
              Không tìm thấy lô hàng nào phù hợp với bộ lọc đã chọn.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: '1rem' }}>
                {paginatedLots.map((lot) => {
                  const isDanger = lot.riskLevel === 'DANGER';
                  const isWarning = lot.riskLevel === 'WARNING';

                  const cardBg = isDanger ? '#fff8f8' : isWarning ? '#fffdf7' : '#ffffff';
                  const cardBorder = isDanger ? '2px solid #f87171' : isWarning ? '1.5px solid #fde047' : '1px solid #e2e8f0';
                  const shadow = isDanger ? '0 4px 12px rgba(239, 68, 68, 0.12)' : isWarning ? '0 4px 10px rgba(234, 179, 8, 0.08)' : '0 2px 4px rgba(0,0,0,0.02)';

                  const badgeBg = isDanger ? '#fee2e2' : isWarning ? '#fefce8' : '#f0fdf4';
                  const badgeColor = isDanger ? '#b91c1c' : isWarning ? '#b45309' : '#15803d';
                  // Use the specific reason computed during data load (expiryDate-aware)
                  const badgeText = lot.riskReason || (isDanger ? 'Báo động đỏ' : isWarning ? 'Có nguy cơ' : 'An toàn');

                  // Expiry calculation (for display only)
                  const today = new Date();
                  const expiryDate = lot.expiryDate ? new Date(lot.expiryDate) : null;
                  const importDate = lot.importDate ? new Date(lot.importDate) : null;
                  const daysLeft = expiryDate ? Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 3600 * 24)) : null;
                  const expiryStr = expiryDate ? expiryDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'N/A';
                  const importStr = importDate ? importDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'N/A';

                  // Days left display
                  const daysLeftColor = daysLeft === null ? '#64748b' : daysLeft <= 0 ? '#dc2626' : daysLeft <= 7 ? '#dc2626' : daysLeft <= 30 ? '#d97706' : '#15803d';
                  const daysLeftText = daysLeft === null ? 'N/A' : daysLeft <= 0 ? `HẾT HẠN ${Math.abs(daysLeft)} ngày trước` : `Còn ${daysLeft} ngày`;

                  // Zone temperature info
                  const zoneInfo: Record<string, { label: string; temp: string; color: string }> = {
                    FROZEN: { label: 'Kho Đông', temp: '-18°C', color: '#1d4ed8' },
                    COLD:   { label: 'Kho Mát',  temp: '0–4°C',  color: '#059669' },
                    DRY:    { label: 'Kho Khô',  temp: '25°C',   color: '#475569' },
                  };
                  const zone = zoneInfo[lot.zone] || { label: lot.zone, temp: 'N/A', color: '#64748b' };

                  return (
                    <div 
                      key={lot.id} 
                      style={{ 
                        backgroundColor: cardBg, 
                        border: cardBorder, 
                        borderRadius: '10px', 
                        padding: '1.1rem', 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: '10px', 
                        boxShadow: shadow,
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {/* Row 1: Status Badge (reason-specific) + Zone+Temp chip */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.68rem', fontWeight: 600, color: badgeColor, backgroundColor: badgeBg, padding: '3px 8px', borderRadius: '4px', border: `1px solid ${isDanger ? '#fca5a5' : isWarning ? '#fef08a' : '#bbf7d0'}`, whiteSpace: 'nowrap' }}>
                          {badgeText}
                        </span>
                        <span style={{ 
                          fontSize: '0.7rem', fontWeight: 600, color: zone.color, 
                          backgroundColor: `${zone.color}15`, padding: '3px 8px', borderRadius: '4px',
                          border: `1px solid ${zone.color}30`, display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap'
                        }}>
                          {zone.label} • {zone.temp}
                        </span>
                      </div>

                      {/* Row 2: Lot Code + Product Name */}
                      <div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#0f766e', letterSpacing: '0.3px' }}>
                          Mã lô: {lot.lotCode}
                        </div>
                        <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1e293b', marginTop: '3px', lineHeight: 1.3 }}>
                          {lot.displayName || 'Sản phẩm'}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
                          SKU: <strong>{lot.displaySku || lot.productId}</strong> &nbsp;•&nbsp; Vị trí: <strong>{lot.location}</strong>
                        </div>
                      </div>

                      {/* Row 3: Expiry + Import dates (2-col grid) */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', backgroundColor: isDanger ? '#fef2f2' : isWarning ? '#fffbeb' : '#f8fafc', borderRadius: '6px', padding: '8px 10px' }}>
                        <div>
                          <div style={{ fontSize: '0.64rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', marginBottom: '2px' }}>Ngày nhập</div>
                          <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#475569' }}>{importStr}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.64rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', marginBottom: '2px' }}>Hạn sử dụng</div>
                          <div style={{ fontSize: '0.78rem', fontWeight: 600, color: daysLeftColor }}>{expiryStr}</div>
                        </div>
                      </div>

                      {/* Row 4: ML Risk Score + Degradation + XAI Explainability */}
                      <div style={{ backgroundColor: isDanger ? '#fef2f2' : isWarning ? '#fffbeb' : '#f8fafc', borderRadius: '8px', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '8px', border: `1px solid ${isDanger ? '#fed7d7' : isWarning ? '#fef08a' : '#e2e8f0'}` }}>
                        {/* ML Score & Confidence */}
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <span style={{ fontSize: '0.66rem', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                                Rủi ro chất lượng
                              </span>
                              <span style={{ fontSize: '0.62rem', backgroundColor: '#e2e8f0', color: '#334155', padding: '1px 5px', borderRadius: '4px', fontWeight: 600 }}>
                                Chuẩn 97%
                              </span>
                            </div>
                            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: isDanger ? '#dc2626' : isWarning ? '#d97706' : '#15803d' }}>
                              {lot.aiScore ?? '—'}/100
                            </span>
                          </div>
                          <div style={{ height: '6px', borderRadius: '99px', backgroundColor: '#e2e8f0', overflow: 'hidden' }}>
                            <div style={{
                              height: '100%', borderRadius: '99px',
                              width: `${Math.min(100, lot.aiScore ?? 0)}%`,
                              backgroundColor: (lot.aiScore ?? 0) >= 70 ? '#ef4444' : (lot.aiScore ?? 0) >= 40 ? '#f59e0b' : '#22c55e',
                              transition: 'width 0.6s ease',
                              boxShadow: isDanger ? '0 0 6px rgba(239,68,68,0.5)' : isWarning ? '0 0 4px rgba(245,158,11,0.4)' : 'none'
                            }} />
                          </div>
                        </div>

                        {/* Shelf Life % */}
                        {lot.shelfLifePct !== undefined && (
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                              <span style={{ fontSize: '0.62rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                                {daysLeft !== null && daysLeft <= 0 ? 'ĐÃ HẾT HẠN' : `Vòng đời: ${daysLeft !== null ? `Còn ${daysLeft} ngày` : 'N/A'}`}
                              </span>
                              <span style={{ fontSize: '0.72rem', fontWeight: 600, color: daysLeftColor }}>{daysLeftText}</span>
                            </div>
                            <div style={{ height: '5px', borderRadius: '99px', backgroundColor: '#e2e8f0', overflow: 'hidden' }}>
                              <div style={{
                                height: '100%', borderRadius: '99px',
                                width: `${Math.min(100, lot.shelfLifePct)}%`,
                                backgroundColor: lot.shelfLifePct >= 90 ? '#ef4444' : lot.shelfLifePct >= 70 ? '#f59e0b' : '#22c55e',
                                transition: 'width 0.6s ease'
                              }} />
                            </div>
                          </div>
                        )}

                        {/* XAI: Feature Contributions Pills */}
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', paddingTop: '4px', borderTop: '1px dashed #cbd5e1' }}>
                          <span style={{ fontSize: '0.6rem', color: '#64748b', backgroundColor: '#fff', padding: '2px 5px', borderRadius: '4px', border: '1px solid #e2e8f0' }} title="Ảnh hưởng nhiệt độ bảo quản">
                            Nhiệt: <strong>{lot.zone === 'FROZEN' ? 'Chuẩn -18°C' : lot.zone === 'COLD' ? 'Chuẩn 3°C' : 'Khô 25°C'}</strong>
                          </span>
                          <span style={{ fontSize: '0.6rem', color: '#64748b', backgroundColor: '#fff', padding: '2px 5px', borderRadius: '4px', border: '1px solid #e2e8f0' }} title="Tỷ lệ vòng đời đã trôi qua">
                            Đã dùng: <strong>{Math.round(lot.shelfLifePct || 0)}%</strong>
                          </span>
                          <span style={{ fontSize: '0.6rem', color: '#64748b', backgroundColor: '#fff', padding: '2px 5px', borderRadius: '4px', border: '1px solid #e2e8f0' }} title="Đặc tính phân nhóm sinh hóa thực phẩm">
                            Nhóm: <strong>{lot.riskCategory || 'Thực phẩm'}</strong>
                          </span>
                        </div>
                      </div>

                      {/* Row 5: AI Recommendation */}
                      {lot.riskRecommendation && (
                        <div style={{
                          backgroundColor: isDanger ? '#fee2e2' : isWarning ? '#fefce8' : '#ecfdf5',
                          border: `1px solid ${isDanger ? '#fca5a5' : isWarning ? '#fde68a' : '#bbf7d0'}`,
                          borderRadius: '6px',
                          padding: '6px 10px',
                          fontSize: '0.7rem',
                          color: isDanger ? '#7f1d1d' : isWarning ? '#78350f' : '#14532d',
                          fontWeight: 500,
                        }}>
                          <span>{lot.riskRecommendation}</span>
                        </div>
                      )}

                      {/* Row 5.5: Audit History & Status Record */}
                      {lot.lastAuditedAt ? (
                        <div style={{ backgroundColor: '#f0fdfa', border: '1px solid #99f6e4', borderRadius: '6px', padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#0f766e', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              ĐÃ KIỂM KÊ
                            </span>
                            <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 500 }}>
                              {new Date(lot.lastAuditedAt).toLocaleDateString('vi-VN')} {new Date(lot.lastAuditedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#334155' }}>
                            Người kiểm: <strong>{lot.lastAuditedBy || 'Nhân viên trực ca'}</strong>
                          </div>
                          <div style={{ fontSize: '0.72rem', display: 'flex', justifyContent: 'space-between', color: '#334155' }}>
                            <span>Thực đếm: <strong>{lot.lastAuditActualQty ?? lot.remainingQty} SP</strong></span>
                            <span style={{ fontWeight: 600, color: (lot.lastAuditDiff ?? 0) > 0 ? '#16a34a' : (lot.lastAuditDiff ?? 0) < 0 ? '#dc2626' : '#0f766e' }}>
                              {(lot.lastAuditDiff ?? 0) > 0 ? `Lệch: +${lot.lastAuditDiff} (Thừa)` : (lot.lastAuditDiff ?? 0) < 0 ? `Lệch: ${lot.lastAuditDiff} (Thiếu)` : 'Khớp 100%'}
                            </span>
                          </div>
                          {lot.lastAuditReason && (
                            <div style={{ fontSize: '0.68rem', color: '#64748b', fontStyle: 'italic' }}>
                              Lý do: {lot.lastAuditReason}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div style={{ backgroundColor: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '6px', padding: '6px 10px', fontSize: '0.7rem', color: '#64748b' }}>
                          <span>Chưa đối soát kiểm kê trong kỳ</span>
                        </div>
                      )}

                      {/* Row 5.8: Outbound / Disposal Order Badge */}
                      {(() => {
                        const existing = outboundLotMap[lot.lotCode] || outboundLotMap[lot.id];
                        if (!existing) return null;
                        const isDisposal = existing.isDisposal;
                        const orderedQty = existing.orderedQty || 4;
                        return (
                          <div
                            onClick={() => navigate(`/outbound-orders?orderCode=${existing.orderCode}`)}
                            style={{
                              backgroundColor: isDisposal ? '#fef2f2' : '#f0fdf4',
                              border: `1px solid ${isDisposal ? '#fecaca' : '#bbf7d0'}`,
                              color: isDisposal ? '#b91c1c' : '#166534',
                              borderRadius: '6px',
                              padding: '6px 10px',
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              cursor: 'pointer',
                            }}
                            title="Bấm để xem chi tiết phiếu xuất kho này"
                          >
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              {isDisposal ? 'ĐÃ CÓ ĐƠN TIÊU HỦY' : 'ĐANG XUẤT BÁN LẺ'}: <b>{existing.orderCode}</b>
                              {!isDisposal && (
                                <span style={{ color: '#475569', fontWeight: 500, fontSize: '0.68rem' }}>
                                  ({orderedQty} SP)
                                </span>
                              )}
                            </span>
                            <span style={{ fontSize: '0.68rem', backgroundColor: isDisposal ? '#fee2e2' : '#dcfce7', padding: '1px 5px', borderRadius: '4px' }}>
                              {existing.status}
                            </span>
                          </div>
                        );
                      })()}

                      {/* Row 6: Stock Qty + Audit Button */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: `1px solid ${isDanger ? '#fed7d7' : isWarning ? '#fef3c7' : '#f1f5f9'}` }}>
                        <div>
                          <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 600 }}>Tồn kho thực tế:</div>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                            <div style={{ fontSize: '1.2rem', fontWeight: 900, color: isDanger ? '#dc2626' : '#1e293b' }}>
                              {lot.remainingQty} <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>SP</span>
                            </div>
                            {(() => {
                              const existing = outboundLotMap[lot.lotCode] || outboundLotMap[lot.id];
                              if (existing && !existing.isDisposal) {
                                const ordered = existing.orderedQty || 4;
                                const rem = Math.max(0, lot.remainingQty - ordered);
                                return (
                                  <span style={{ fontSize: '0.65rem', color: '#0f766e', fontWeight: 600 }}>
                                    (Giao: {ordered} • Còn lại: {rem})
                                  </span>
                                );
                              }
                              return null;
                            })()}
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          {(() => {
                            const existing = outboundLotMap[lot.lotCode] || outboundLotMap[lot.id];
                            const hasDisposal = existing && existing.isDisposal;
                            const hasRetailOnly = existing && !existing.isDisposal;

                            return (
                              <button
                                type="button"
                                disabled={isCreatingOutbound || hasDisposal}
                                onClick={() => handleCreateOutboundFromLot(lot, isDanger, expiryStr)}
                                style={{
                                  padding: '7px 12px',
                                  borderRadius: '8px',
                                  backgroundColor: hasDisposal ? '#475569' : (hasRetailOnly ? '#dc2626' : (isDanger ? '#dc2626' : isWarning ? '#d97706' : '#0284c7')),
                                  color: '#ffffff',
                                  border: 'none',
                                  fontSize: '0.78rem',
                                  fontWeight: 800,
                                  cursor: (isCreatingOutbound || hasDisposal) ? 'not-allowed' : 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                  boxShadow: hasDisposal ? 'none' : '0 2px 8px rgba(0,0,0,0.15)',
                                  opacity: (isCreatingOutbound || hasDisposal) ? 0.7 : 1
                                }}
                                title={hasDisposal ? `Lô này đã lập phiếu tiêu hủy ${existing.orderCode}` : hasRetailOnly ? `Lô đang có đơn bán lẻ ${existing.orderCode}. Bấm để chọn giải quyết xung đột & tiêu hủy.` : isDanger ? 'Tự động tạo đơn xuất tiêu hủy / trả hàng' : 'Tự động tạo đơn xuất kho ưu tiên hạn dùng'}
                              >
                                <Send size={12} /> {hasDisposal ? `Đã Lập Tiêu Hủy (${existing.orderCode})` : hasRetailOnly ? 'Xuất Tiêu Hủy' : isDanger ? 'Xuất Tiêu Hủy' : isWarning ? 'Xuất Hạn Gần' : 'Xuất Kho'}
                              </button>
                            );
                          })()}

                          <button 
                            type="button"
                            onClick={() => setAdjustModal({
                              isOpen: true,
                              lot,
                              newQty: lot.remainingQty,
                              reason: isDanger ? 'Hàng hư hỏng / Quá hạn sử dụng (Tiêu hủy)' : isWarning ? 'Hàng dập nát / Hư hỏng trong bảo quản' : 'Kiểm kê định kỳ hàng tháng',
                              qualityStatus: isDanger ? 'EXPIRED' : isWarning ? 'DAMAGED' : 'GOOD',
                              note: ''
                            })}
                            style={{ 
                              padding: '7px 12px', 
                              borderRadius: '8px', 
                              backgroundColor: lot.lastAuditedAt ? '#0f766e' : '#f8fafc', 
                              border: lot.lastAuditedAt ? 'none' : '1px solid #cbd5e1', 
                              color: lot.lastAuditedAt ? '#fff' : '#1e293b', 
                              fontSize: '0.78rem', 
                              fontWeight: 800, 
                              cursor: 'pointer', 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '4px',
                              boxShadow: lot.lastAuditedAt ? '0 2px 6px rgba(15, 118, 110, 0.25)' : 'none'
                            }}
                          >
                            <Edit2 size={12} /> {lot.lastAuditedAt ? 'Kiểm kê lại' : isDanger ? 'Kiểm kê ngay' : 'Kiểm kê'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>


              {/* Pagination for Lots */}
              {totalLotsPages > 1 && (
                <div style={{ padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '10px', background: '#fff', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                      Trang <strong>{lotsPage}</strong> / <strong>{totalLotsPages}</strong> (Tổng: {filteredWhLots.length} Lô)
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#64748b' }}>
                      <span>Hiển thị:</span>
                      {[8, 12, 16, 24].map(sz => (
                        <button
                          key={sz}
                          type="button"
                          onClick={() => { setLotsPageSize(sz); setLotsPage(1); }}
                          style={{
                            padding: '2px 8px',
                            borderRadius: '4px',
                            border: '1px solid',
                            borderColor: lotsPageSize === sz ? '#0f766e' : '#cbd5e1',
                            background: lotsPageSize === sz ? '#0f766e' : '#f8fafc',
                            color: lotsPageSize === sz ? '#fff' : '#475569',
                            fontWeight: lotsPageSize === sz ? 800 : 500,
                            fontSize: '0.75rem',
                            cursor: 'pointer'
                          }}
                        >
                          {sz}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    <button
                      disabled={lotsPage <= 1}
                      onClick={() => setLotsPage(p => Math.max(1, p - 1))}
                      style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.75rem', cursor: lotsPage <= 1 ? 'not-allowed' : 'pointer' }}
                    >
                      &lt;
                    </button>

                    {Array.from({ length: totalLotsPages }, (_, i) => i + 1)
                      .filter(p => p === 1 || p === totalLotsPages || Math.abs(p - lotsPage) <= 2)
                      .map((p, i, arr) => (
                        <React.Fragment key={p}>
                          {i > 0 && arr[i - 1] !== p - 1 && <span style={{ padding: '0 3px', color: '#94a3b8', fontSize: '0.75rem' }}>...</span>}
                          <button
                            onClick={() => setLotsPage(p)}
                            style={{
                              padding: '4px 8px',
                              borderRadius: '6px',
                              border: '1px solid',
                              borderColor: lotsPage === p ? '#0f766e' : '#cbd5e1',
                              backgroundColor: lotsPage === p ? '#0f766e' : '#fff',
                              color: lotsPage === p ? '#fff' : '#334155',
                              fontSize: '0.75rem',
                              fontWeight: lotsPage === p ? 800 : 500,
                              cursor: 'pointer',
                              minWidth: '28px'
                            }}
                          >
                            {p}
                          </button>
                        </React.Fragment>
                      ))}

                    <button
                      disabled={lotsPage >= totalLotsPages}
                      onClick={() => setLotsPage(p => Math.min(totalLotsPages, p + 1))}
                      style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.75rem', cursor: lotsPage >= totalLotsPages ? 'not-allowed' : 'pointer' }}
                    >
                      &gt;
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderTabBar = () => (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: '12px',
      background: '#ffffff',
      padding: '8px 14px',
      borderRadius: '16px',
      border: '1px solid #e2e8f0',
      boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
    }}>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <button
          type="button"
          onClick={() => {
            setActiveTab('STOCK');
            setSearchParams({ tab: 'stock' });
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '9px 18px',
            borderRadius: '10px',
            border: 'none',
            cursor: 'pointer',
            fontSize: '0.88rem',
            fontWeight: activeTab === 'STOCK' ? 800 : 600,
            backgroundColor: activeTab === 'STOCK' ? '#0f766e' : 'transparent',
            color: activeTab === 'STOCK' ? '#ffffff' : '#64748b',
            boxShadow: activeTab === 'STOCK' ? '0 4px 12px rgba(15,118,110,0.25)' : 'none',
            transition: 'all 0.2s ease'
          }}
        >
          <Layers size={17} />
          <span>Sổ Tồn Kho & Lô Hàng</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('3D_MAP');
            setSearchParams({ tab: '3d' });
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '9px 18px',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            fontSize: '0.88rem',
            fontWeight: activeTab === '3D_MAP' ? 600 : 500,
            backgroundColor: activeTab === '3D_MAP' ? '#0284c7' : 'transparent',
            color: activeTab === '3D_MAP' ? '#ffffff' : '#64748b',
            boxShadow: activeTab === '3D_MAP' ? '0 2px 8px rgba(2,132,199,0.2)' : 'none',
            transition: 'all 0.2s ease'
          }}
        >
          <Boxes size={17} />
          <span>Bản Đồ 3D Kệ Hàng & Digital Twin</span>
          <span style={{
            fontSize: '0.65rem',
            backgroundColor: activeTab === '3D_MAP' ? '#e0f2fe' : '#f0fdf4',
            color: activeTab === '3D_MAP' ? '#0369a1' : '#15803d',
            padding: '2px 6px',
            borderRadius: '4px',
            fontWeight: 600
          }}>
            3D LIVE
          </span>
        </button>
      </div>

      <div style={{ fontSize: '0.78rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span>Kho trực tuyến:</span>
        <strong style={{ color: '#0f766e' }}>{viewingWh?.name || (isManager ? `Kho ${myWarehouseCode}` : 'Toàn bộ 16 chi nhánh')}</strong>
      </div>
    </div>
  );

  // Tab 2: Render 3D Digital Twin Map
  if (activeTab === '3D_MAP') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', background: '#f8fafc', padding: '1.5rem', minHeight: '100vh' }}>
        {renderTabBar()}
        <Warehouse3DDigitalTwin />
      </div>
    );
  }

  // Unified View for both Admin and Manager (Admin operates on selectedWarehouse, Manager operates on assigned warehouse)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', background: '#f8fafc', padding: '1.5rem', minHeight: '100vh' }}>
      {renderTabBar()}
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff', padding: '1.25rem 1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.04)', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              Quản Lý Tồn Kho: {viewingWh?.name || selectedWarehouse?.name || myWarehouseCode}
            </h2>
            <span style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              padding: '3px 8px',
              borderRadius: '6px',
              backgroundColor: (viewingWh?.isActive ?? selectedWarehouse?.isActive) ? '#dcfce7' : '#fee2e2',
              color: (viewingWh?.isActive ?? selectedWarehouse?.isActive) ? '#166534' : '#991b1b',
            }}>
              {(viewingWh?.isActive ?? selectedWarehouse?.isActive) ? 'Đang hoạt động' : 'Tạm dừng'}
            </span>
          </div>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px', margin: '4px 0 0' }}>
            <MapPin size={14} color="#0f766e" /> {viewingWh?.address || selectedWarehouse?.address || 'Đang tải địa chỉ...'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Admin Specific Action Buttons */}
          {isAdmin && (
            <>
              <button
                type="button"
                onClick={() => openConfigModal(viewingWh || selectedWarehouse)}
                className="btn btn-outline"
                style={{ borderRadius: '8px', fontWeight: 600, padding: '9px 16px', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '6px', border: '1px solid #0f766e', color: '#0f766e', cursor: 'pointer', backgroundColor: '#f0fdfa' }}
                title="Cấu hình dải nhiệt độ, sức chứa kệ và quản lý kho này"
              >
                <Settings size={16} /> Cấu hình kho này
              </button>

              <button
                type="button"
                onClick={openManageModal}
                className="btn btn-outline"
                style={{ borderRadius: '8px', fontWeight: 600, padding: '9px 16px', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '6px', border: '1px solid #cbd5e1', cursor: 'pointer', backgroundColor: '#fff' }}
                title="Xem danh sách toàn bộ 16 kho hàng, thêm mới hoặc xóa kho"
              >
                <Building2 size={16} /> Quản lý 16 kho
              </button>
            </>
          )}

          <button
            onClick={() => { if (viewingWh || selectedWarehouse) handleViewStock((viewingWh || selectedWarehouse)!, true); }}
            className="btn btn-outline"
            style={{ borderRadius: '10px', fontWeight: 600, padding: '9px 16px', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '6px', border: '1px solid #cbd5e1', cursor: 'pointer', backgroundColor: '#fff' }}
          >
            <RefreshCw size={16} /> Làm mới
          </button>
        </div>
      </div>

      {loadingStock ? (
         <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b', fontSize: '1.1rem' }}>Đang tổng hợp dữ liệu tồn kho...</div>
      ) : (
         renderStockDashboard()
      )}
    </div>
  );
};

export default Inventory;

