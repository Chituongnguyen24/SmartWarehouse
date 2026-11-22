import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Boxes, MapPin, RefreshCw, X, Layers, Settings, Building2, Edit2, Send, ExternalLink, CheckCircle2, AlertTriangle, ArrowRight, Search, Loader2 } from 'lucide-react';
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
  const isSaler = user?.role === 'SALES_STAFF';
  const isWarehouseBound = !isAdmin && !isSaler;
  const isManager = user?.role === 'WAREHOUSE_MANAGER' || user?.role === 'ADMIN' || user?.role === 'WAREHOUSE_STAFF';
  const myWarehouseCode = user?.warehouseCode || (
    user?.email?.includes('001') || user?.email?.includes('q12') ? 'WH-001' :
    user?.email?.includes('002') ? 'WH-002' :
    user?.email?.includes('005') ? 'WH-005' :
    (user?.email?.includes('govap') || user?.email?.includes('006')) ? 'WH-006' :
    undefined
  );

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

  // Cross-warehouse lot search state when lot is not in current warehouse
  const [crossWhLots, setCrossWhLots] = useState<any[]>([]);
  const [isSearchingCrossWh, setIsSearchingCrossWh] = useState(false);

  // URL Search & Highlight synchronization from GlobalSearch
  const urlSearch = searchParams.get('search') || '';
  const urlHighlight = searchParams.get('highlight') || '';
  const urlType = searchParams.get('type') || '';
  const urlWarehouseCode = searchParams.get('warehouseCode') || '';
  const detectedWhCode = urlWarehouseCode || (urlType === 'lot' ? (urlSearch.match(/WH-\d{3}/i)?.[0]?.toUpperCase() ?? '') : '');

  const [highlightCode, setHighlightCode] = useState<string>(urlHighlight);

  useEffect(() => {
    if (urlHighlight) {
      setHighlightCode(urlHighlight);
      const timer = setTimeout(() => setHighlightCode(''), 7000);
      return () => clearTimeout(timer);
    }
  }, [urlHighlight]);

  // Cross-warehouse lot discovery when 0 results found in current warehouse (Admin only)
  useEffect(() => {
    // Only search cross-warehouse if user is ADMIN (Admins have permissions to view and switch between all warehouses)
    if (!isAdmin) {
      setCrossWhLots([]);
      setIsSearchingCrossWh(false);
      return;
    }

    const q = lotsSearch.trim();
    if (!q || q.length < 2) {
      setCrossWhLots([]);
      setIsSearchingCrossWh(false);
      return;
    }

    const timer = setTimeout(async () => {
      // Check if current warehouse has matches
      const currentHasMatch = whLots.some(l => 
        (l.lotCode || '').toLowerCase().includes(q.toLowerCase()) ||
        (l.displayName || '').toLowerCase().includes(q.toLowerCase()) ||
        (l.displaySku || '').toLowerCase().includes(q.toLowerCase())
      );

      if (currentHasMatch) {
        setCrossWhLots([]);
        return;
      }

      setIsSearchingCrossWh(true);
      try {
        const res = await fetch(`${INVENTORY_API}/inventory/lots?limit=100&search=${encodeURIComponent(q)}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data) ? data : (data.items || []);
          // Filter to lots that are in other warehouses
          const otherLots = list.filter((l: any) => l.warehouseCode && l.warehouseCode !== viewingWh?.code);
          setCrossWhLots(otherLots);
        }
      } catch (err) {
        console.warn('Cross warehouse search error:', err);
      } finally {
        setIsSearchingCrossWh(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [lotsSearch, whLots, viewingWh, token]);

  useEffect(() => {
    if (urlSearch) {
      if (urlType === 'lot') {
        setLotsSearch(urlSearch);
        setLotsPage(1);
        setSelectedRiskFilter('ALL');
        setSelectedZoneFilter('ALL');
        setHideDepletedLots(false);
        // Scroll smoothly to the Lot section
        setTimeout(() => {
          const lotSec = document.getElementById('lot-inventory-section');
          if (lotSec) {
            lotSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 350);
      } else {
        setStockSearch(urlSearch);
        setStockPage(1);
        // Scroll smoothly to the Product Stock section
        setTimeout(() => {
          const prodSec = document.getElementById('product-stock-section');
          if (prodSec) {
            prodSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 200);
      }
    }
  }, [urlSearch, urlType]);

  // Map of lotCode -> existing Outbound Order (To prevent duplicate disposal / outbound orders)
  const [outboundLotMap, setOutboundLotMap] = useState<Record<string, { orderCode: string; status: string; isDisposal: boolean; id: string; orderedQty: number }>>({});

  useEffect(() => {
    const targetCode = isWarehouseBound
      ? (myWarehouseCode || 'WH-006')
      : ((urlType === 'lot' && detectedWhCode) ? detectedWhCode : selectedWarehouseCode);

    if (targetCode && warehouses.length > 0) {
      const wh = warehouses.find(w => w.code.toUpperCase() === targetCode.toUpperCase()) || warehouses[0];
      if (wh) {
        handleViewStock(wh);
      }
    }
  }, [warehouses, isWarehouseBound, myWarehouseCode, selectedWarehouseCode, detectedWhCode, urlType]);

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

        // Fallback: If searching for a lot and it wasn't found in the current warehouse, find which warehouse has it
        if (urlType === 'lot' && urlSearch) {
          const matchFound = lotMapped.some((l: any) => 
            (l.lotCode || '').toLowerCase().includes(urlSearch.toLowerCase())
          );
          if (!matchFound && warehouses.length > 1) {
            fetch(`${INVENTORY_API}/inventory/lots?limit=300`, { headers: { 'Authorization': `Bearer ${token}` } })
              .then(r => r.ok ? r.json() : null)
              .then(allLotsData => {
                if (!allLotsData) return;
                const allLotsList = Array.isArray(allLotsData) ? allLotsData : (allLotsData.items || []);
                const found = allLotsList.find((l: any) => (l.lotCode || '').toLowerCase().includes(urlSearch.toLowerCase()));
                if (found && found.warehouseCode && found.warehouseCode !== wh.code) {
                  const targetWarehouse = warehouses.find(w => w.code.toUpperCase() === found.warehouseCode.toUpperCase());
                  if (targetWarehouse) {
                    handleViewStock(targetWarehouse);
                  }
                }
              })
              .catch(e => console.warn('Cross-warehouse lot fallback failed:', e));
          }
        }
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

      const res = await fetch(`${getApiHost(3007)}/outbound-orders`, {
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
        fetch(`${getApiHost(3010)}/products/sync-stock`, {
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

  const normalizeShelfCode = (rawLoc?: string, idx = 0): { code: string; rack: 'A' | 'B' | 'C'; color: string; bg: string; border: string } => {
    const raw = String(rawLoc || '').toUpperCase();
    let rack: 'A' | 'B' | 'C' = (['A', 'B', 'C'] as const)[idx % 3];
    let tier: 1 | 2 = ((idx % 2) + 1) as 1 | 2;

    const direct = raw.match(/(?:^|[^A-Z0-9])([ABC])[-_ ]*T?0?([12])(?=$|[^0-9])/);
    if (direct) {
      rack = direct[1] as 'A' | 'B' | 'C';
      tier = Number(direct[2]) as 1 | 2;
    } else if (raw.includes('A1')) {
      rack = 'A';
      tier = raw.includes('-02') ? 2 : 1;
    } else if (raw.includes('A2')) {
      rack = 'B';
      tier = raw.includes('-02') ? 2 : 1;
    } else if (raw.includes('A3')) {
      rack = 'C';
      tier = raw.includes('-02') ? 2 : 1;
    }

    const palette: Record<'A' | 'B' | 'C', { color: string; bg: string; border: string }> = {
      A: { color: '#991b1b', bg: '#fef2f2', border: '#fecaca' },
      B: { color: '#075985', bg: '#f0f9ff', border: '#bae6fd' },
      C: { color: '#166534', bg: '#f0fdf4', border: '#bbf7d0' },
    };

    return {
      code: `${rack}${tier}`,
      rack,
      ...palette[rack],
    };
  };

  const renderStockDashboard = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
      {renderAdjustModal()}
      {renderConfirmExportModal()}
      {renderOutboundSuccessModal()}

      {/* 1. Compact 3-Card Summary Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
        <div style={{ backgroundColor: '#ffffff', padding: '14px 18px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Tổng mặt hàng</div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', marginTop: '4px', fontVariantNumeric: 'tabular-nums' }}>
            {whStock.length} sản phẩm
          </div>
        </div>

        <div
          onClick={() => { setSelectedRiskFilter('ALL'); setSelectedZoneFilter('ALL'); setLotsPage(1); }}
          style={{
            backgroundColor: selectedRiskFilter === 'ALL' ? '#f0fdf4' : '#ffffff',
            padding: '14px 18px',
            borderRadius: '10px',
            border: `1px solid ${selectedRiskFilter === 'ALL' ? '#86efac' : '#e2e8f0'}`,
            cursor: 'pointer',
          }}
        >
          <div style={{ fontSize: '12px', color: '#0f766e', fontWeight: 600, textTransform: 'uppercase' }}>Lô hàng đang lưu trữ</div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#0f766e', marginTop: '4px', fontVariantNumeric: 'tabular-nums' }}>
            {whStats?.totalLots || 0} lô
          </div>
        </div>

        <div
          onClick={() => {
            setSelectedRiskFilter(prev => prev === 'DANGER' ? 'ALL' : 'DANGER');
            setLotsPage(1);
          }}
          style={{
            backgroundColor: selectedRiskFilter === 'DANGER' ? '#fef2f2' : '#ffffff',
            padding: '14px 18px',
            borderRadius: '10px',
            border: `1px solid ${selectedRiskFilter === 'DANGER' ? '#fca5a5' : '#e2e8f0'}`,
            cursor: 'pointer',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <div style={{ fontSize: '12px', color: '#dc2626', fontWeight: 600, textTransform: 'uppercase' }}>
              Cận hạn / Cần xử lý
            </div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#dc2626', marginTop: '4px', fontVariantNumeric: 'tabular-nums' }}>
              {whStats?.dangerCount || 0} lô
            </div>
          </div>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#dc2626' }}>
            {selectedRiskFilter === 'DANGER' ? 'Bỏ lọc' : 'Lọc xem →'}
          </span>
        </div>
      </div>

      {/* 2. Unified Enterprise Inventory & Shelf Table */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '10px',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
        }}
      >
        {/* Filter & Search Toolbar */}
        <div
          style={{
            padding: '14px 18px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
            {[
              { key: 'ALL', label: `Tất cả (${whLots.length})` },
              { key: 'SAFE', label: `Đạt chuẩn (${whStats?.safeCount || 0})` },
              { key: 'WARNING', label: `Cận hạn (${whStats?.warningCount || 0})` },
              { key: 'DANGER', label: `Cần xử lý (${whStats?.dangerCount || 0})` },
            ].map((f) => {
              const active = selectedRiskFilter === f.key;
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => { setSelectedRiskFilter(f.key as any); setLotsPage(1); }}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    backgroundColor: active ? '#0f172a' : '#f8fafc',
                    color: active ? '#ffffff' : '#475569',
                    border: `1px solid ${active ? '#0f172a' : '#e2e8f0'}`,
                  }}
                >
                  {f.label}
                </button>
              );
            })}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="text"
              placeholder="Tìm tên sản phẩm, mã lô, vị trí kệ..."
              value={lotsSearch}
              onChange={(e) => { setLotsSearch(e.target.value); setLotsPage(1); }}
              style={{
                padding: '7px 12px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '12.5px',
                width: '250px',
                color: '#0f172a',
              }}
            />
          </div>
        </div>

        {/* High-Density Data Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                <th style={{ padding: '11px 16px', fontWeight: 600 }}>Vị trí kệ</th>
                <th style={{ padding: '11px 16px', fontWeight: 600 }}>Sản phẩm</th>
                <th style={{ padding: '11px 16px', fontWeight: 600 }}>Mã lô</th>
                <th style={{ padding: '11px 16px', fontWeight: 600 }}>Hạn sử dụng</th>
                <th style={{ padding: '11px 16px', fontWeight: 600, textAlign: 'right' }}>Tồn kho</th>
                <th style={{ padding: '11px 16px', fontWeight: 600 }}>Trạng thái</th>
                <th style={{ padding: '11px 16px', fontWeight: 600, textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {paginatedLots.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
                    Không tìm thấy lô hàng nào phù hợp.
                  </td>
                </tr>
              ) : (
                paginatedLots.map((lot, idx) => {
                  const isDanger = lot.riskLevel === 'DANGER';
                  const isWarning = lot.riskLevel === 'WARNING';
                  const shelfInfo = normalizeShelfCode(lot.location, idx);

                  const today = new Date();
                  const expiryDate = lot.expiryDate ? new Date(lot.expiryDate) : null;
                  const daysLeft = expiryDate ? Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 3600 * 24)) : null;
                  const expiryStr = expiryDate ? expiryDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'N/A';

                  return (
                    <tr
                      key={lot.id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        backgroundColor: isDanger ? '#fffafa' : '#ffffff',
                      }}
                    >
                      {/* Shelf Code (A1, A2, B1, B2, C1, C2) */}
                      <td style={{ padding: '12px 16px' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '3px 10px',
                            borderRadius: '6px',
                            fontSize: '12.5px',
                            fontWeight: 700,
                            backgroundColor: shelfInfo.bg,
                            color: shelfInfo.color,
                            border: `1px solid ${shelfInfo.border}`,
                          }}
                        >
                          {shelfInfo.code}
                        </span>
                      </td>

                      {/* Product Name + SKU */}
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>{lot.displayName || 'Sản phẩm'}</div>
                        <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
                          {lot.displaySku || lot.productId}
                        </div>
                      </td>

                      {/* Lot Code */}
                      <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                        {lot.lotCode}
                      </td>

                      {/* Expiry Date */}
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 600, color: isDanger ? '#dc2626' : isWarning ? '#d97706' : '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                          {expiryStr}
                        </div>
                        {daysLeft !== null && (
                          <div style={{ fontSize: '11.5px', color: isDanger ? '#dc2626' : '#64748b', marginTop: '1px' }}>
                            {daysLeft <= 0 ? `Quá hạn ${Math.abs(daysLeft)} ngày` : `Còn ${daysLeft} ngày`}
                          </div>
                        )}
                      </td>

                      {/* Remaining Qty */}
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                        {lot.remainingQty} SP
                      </td>

                      {/* Status Badge */}
                      <td style={{ padding: '12px 16px' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '11.5px',
                            fontWeight: 600,
                            backgroundColor: isDanger ? '#fef2f2' : isWarning ? '#fffbeb' : '#f0fdf4',
                            color: isDanger ? '#991b1b' : isWarning ? '#92400e' : '#166534',
                            border: `1px solid ${isDanger ? '#fecaca' : isWarning ? '#fde68a' : '#bbf7d0'}`,
                          }}
                        >
                          {isDanger ? 'Cần xử lý' : isWarning ? 'Cận hạn' : 'Đạt chuẩn'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() =>
                              setAdjustModal({
                                isOpen: true,
                                lot,
                                newQty: lot.remainingQty,
                                reason: 'Kiểm kê định kỳ hàng tháng',
                                qualityStatus: isDanger ? 'EXPIRED' : isWarning ? 'DAMAGED' : 'GOOD',
                                note: '',
                              })
                            }
                            style={{
                              padding: '6px 10px',
                              borderRadius: '6px',
                              backgroundColor: '#f8fafc',
                              color: '#334155',
                              border: '1px solid #cbd5e1',
                              fontSize: '12px',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            Kiểm kê
                          </button>

                          <button
                            type="button"
                            onClick={() => handleCreateOutboundFromLot(lot, isDanger, expiryStr)}
                            style={{
                              padding: '6px 10px',
                              borderRadius: '6px',
                              backgroundColor: isDanger ? '#dc2626' : '#0f766e',
                              color: '#ffffff',
                              border: 'none',
                              fontSize: '12px',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            {isDanger ? 'Tiêu hủy' : 'Xuất kho'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalLotsPages > 1 && (
          <div
            style={{
              padding: '10px 18px',
              borderTop: '1px solid #e2e8f0',
              backgroundColor: '#f8fafc',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '12.5px',
              color: '#64748b',
            }}
          >
            <span>
              Trang <strong>{lotsPage}</strong> / <strong>{totalLotsPages}</strong>
            </span>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                disabled={lotsPage <= 1}
                onClick={() => setLotsPage((p) => Math.max(1, p - 1))}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  cursor: lotsPage <= 1 ? 'not-allowed' : 'pointer',
                }}
              >
                Trước
              </button>
              <button
                type="button"
                disabled={lotsPage >= totalLotsPages}
                onClick={() => setLotsPage((p) => Math.min(totalLotsPages, p + 1))}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  cursor: lotsPage >= totalLotsPages ? 'not-allowed' : 'pointer',
                }}
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderHeaderBar = () => (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        backgroundColor: '#ffffff',
        padding: '12px 18px',
        borderRadius: '10px',
        border: '1px solid #e2e8f0',
      }}
    >
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => {
            setActiveTab('STOCK');
            setSearchParams({ tab: 'stock' });
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '7px 14px',
            borderRadius: '6px',
            border: 'none',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 600,
            backgroundColor: activeTab === 'STOCK' ? '#0f172a' : '#f8fafc',
            color: activeTab === 'STOCK' ? '#ffffff' : '#475569',
          }}
        >
          <Layers size={15} />
          <span>Danh sách Tồn kho</span>
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
            gap: '6px',
            padding: '7px 14px',
            borderRadius: '6px',
            border: 'none',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 600,
            backgroundColor: activeTab === '3D_MAP' ? '#0f172a' : '#f8fafc',
            color: activeTab === '3D_MAP' ? '#ffffff' : '#475569',
          }}
        >
          <Boxes size={15} />
          <span>Sơ đồ Kệ 3D</span>
        </button>
      </div>

      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
        {isAdmin && (
          <>
            <button
              type="button"
              onClick={() => openConfigModal(viewingWh || selectedWarehouse)}
              style={{
                borderRadius: '6px',
                fontWeight: 600,
                padding: '7px 12px',
                fontSize: '12.5px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                border: '1px solid #0f766e',
                color: '#0f766e',
                cursor: 'pointer',
                backgroundColor: '#f0fdfa',
              }}
            >
              <Settings size={14} /> Cấu hình kho
            </button>

            <button
              type="button"
              onClick={openManageModal}
              style={{
                borderRadius: '6px',
                fontWeight: 600,
                padding: '7px 12px',
                fontSize: '12.5px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                border: '1px solid #cbd5e1',
                cursor: 'pointer',
                backgroundColor: '#ffffff',
                color: '#334155',
              }}
            >
              <Building2 size={14} /> Quản lý kho
            </button>
          </>
        )}

        <button
          type="button"
          onClick={() => {
            if (viewingWh || selectedWarehouse) handleViewStock((viewingWh || selectedWarehouse)!, true);
          }}
          style={{
            borderRadius: '6px',
            fontWeight: 500,
            padding: '7px 12px',
            fontSize: '12.5px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            border: '1px solid #cbd5e1',
            cursor: 'pointer',
            backgroundColor: '#ffffff',
            color: '#334155',
          }}
        >
          <RefreshCw size={14} /> Làm mới
        </button>
      </div>
    </div>
  );

  if (activeTab === '3D_MAP') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', paddingBottom: '24px' }}>
        {renderHeaderBar()}
        <Warehouse3DDigitalTwin />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '24px' }}>
      {renderHeaderBar()}
      {loadingStock ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: '14px' }}>
          Đang tải dữ liệu tồn kho...
        </div>
      ) : (
        renderStockDashboard()
      )}
    </div>
  );
};

export default Inventory;

