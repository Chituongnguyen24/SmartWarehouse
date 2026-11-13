import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search,
  ScanBarcode,
  Boxes,
  MapPin,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Snowflake,
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  ClipboardList,
  Edit3,
  X,
  TrendingDown,
  TrendingUp,
  AlertOctagon,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Filter,
  ArrowUpDown,
  Building2,
  Package,
  Eye,
  Layers,
  ThermometerSnowflake,
  QrCode,
  Check,
  Info,
  Compass,
  Radio,
} from 'lucide-react';
import { CameraScannerModal } from '@/shared';
import { Mobile3DWarehouseView } from '@/features/picking';
import {
  fetchInventoryLots,
  fetchProducts,
  adjustStockAuditApi,
  locateShelfIotApi,
  ApiLot,
  ApiProduct,
} from '@/shared';
import { useAuth } from '@/features/auth';
import { useStaffWebSocket } from '@/features/dashboard';

export interface AuditRecord {
  lotId: string;
  lotCode: string;
  actualQty: number;
  diff: number;
  reason: string;
  auditedAt: string;
  auditorName: string;
}

export interface EnrichedLot extends ApiLot {
  productName: string;
  category: string;
  categoryIcon: string;
  unit: string;
  price: number;
  imageUrl?: string;
  barcode?: string;
  temperatureCondition?: string;
  daysRemaining: number;
  riskLevel: 'SAFE' | 'WARNING' | 'DANGER';
  aiScore: number;
  riskReason: string;
  riskRecommendation: string;
  formattedLocation: string;
  lastAuditedAt?: string;
  lastAuditedBy?: string;
  lastAuditActualQty?: number;
  lastAuditDiff?: number;
  lastAuditReason?: string;
  isAudited?: boolean;
}

const WAREHOUSE_OPTIONS = [
  { code: 'ALL', name: 'Tất Cả 16 Kho Hàng (Toàn Hệ Thống)' },
  { code: 'WH-006', name: 'Kho Gò Vấp (WH-006 / GV) [Mặc định]' },
  { code: 'WH-001', name: 'Kho Quận 12 (WH-001 / Q12)' },
  { code: 'WH-002', name: 'Kho Thủ Đức (WH-002 / TD)' },
  { code: 'WH-003', name: 'Kho Bình Chánh (WH-003 / BC)' },
  { code: 'WH-004', name: 'Kho Quận 7 (WH-004 / Q7)' },
  { code: 'WH-005', name: 'Kho Bình Thạnh (WH-005 / BThanh)' },
  { code: 'WH-007', name: 'Kho Quận 1 (WH-007 / Q1)' },
  { code: 'WH-008', name: 'Kho Quận 5 (WH-008 / Q5)' },
  { code: 'WH-009', name: 'Kho Tân Bình (WH-009 / TB)' },
  { code: 'WH-010', name: 'Kho Bình Tân (WH-010 / BTan)' },
  { code: 'WH-011', name: 'Kho Hóc Môn (WH-011 / HM)' },
  { code: 'WH-012', name: 'Kho Nhà Bè (WH-012 / NB)' },
  { code: 'WH-013', name: 'Kho Phú Nhuận (WH-013 / PN)' },
  { code: 'WH-014', name: 'Kho Quận 8 (WH-014 / Q8)' },
  { code: 'WH-015', name: 'Kho Củ Chi (WH-015 / CC)' },
  { code: 'WH-016', name: 'Kho Quận 10 (WH-016 / Q10)' },
];

import { formatStandardShelfLocation } from '@/features/picking';

const formatShelfLocation = (rawLoc?: string, zone?: string, fallbackIdx: number = 1): string => {
  return formatStandardShelfLocation(rawLoc, zone, fallbackIdx);
};

export const StockLookup: React.FC = () => {
  const { user, activeWarehouse, switchWarehouse, isWarehouseLocked } = useAuth();

  const [lots, setLots] = useState<ApiLot[]>([]);
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [searchParams, setSearchParams] = useSearchParams();
  const [displayMode, setDisplayMode] = useState<'TABLE' | 'RACK_AUDIT' | '3D_SCENE'>(() => {
    return searchParams.get('view') === '3d' ? '3D_SCENE' : searchParams.get('view') === 'audit' ? 'RACK_AUDIT' : 'TABLE';
  });

  const [selectedAuditRack, setSelectedAuditRack] = useState<string>('');
  const [isRackLedActive, setIsRackLedActive] = useState<boolean>(false);
  const [rackSearchQuery, setRackSearchQuery] = useState<string>('');
  const [rackZoneFilter, setRackZoneFilter] = useState<'ALL' | 'COOL' | 'FROZEN' | 'DRY'>('ALL');
  const [rackAuditStatusFilter, setRackAuditStatusFilter] = useState<'ALL' | 'PENDING' | 'DONE'>('ALL');
  const [isRackScannerOpen, setIsRackScannerOpen] = useState<boolean>(false);

  // Search & Filters (Enforce user's warehouse when locked)
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>(() => {
    return user?.warehouseCode || activeWarehouse || 'WH-006';
  });

  useEffect(() => {
    if (isWarehouseLocked && user?.warehouseCode) {
      setSelectedWarehouse(user.warehouseCode);
    }
  }, [isWarehouseLocked, user?.warehouseCode]);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedZone, setSelectedZone] = useState<'ALL' | 'DRY' | 'COOL' | 'FROZEN'>('ALL');
  const [selectedRiskFilter, setSelectedRiskFilter] = useState<'ALL' | 'SAFE' | 'WARNING' | 'DANGER' | 'AUDITED'>('ALL');
  const [sortBy, setSortBy] = useState<'EXPIRY_ASC' | 'EXPIRY_DESC' | 'QTY_DESC' | 'QTY_ASC' | 'NAME_ASC'>('EXPIRY_ASC');

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);

  // Modals & Camera Scanner
  const [selectedLot, setSelectedLot] = useState<EnrichedLot | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);

  // Audit (Kiểm kê) Persistence & State
  const [auditedRecords, setAuditedRecords] = useState<Record<string, AuditRecord>>(() => {
    try {
      const saved = localStorage.getItem('citymart_staff_audited_lots');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  // Audit (Kiểm kê) Modal State
  const [auditModalLot, setAuditModalLot] = useState<EnrichedLot | null>(null);
  const [actualCount, setActualCount] = useState<string>('');
  const [auditReason, setAuditReason] = useState<string>('Kiểm kê định kỳ hàng tháng');
  const [isSubmittingAudit, setIsSubmittingAudit] = useState<boolean>(false);
  const [auditSuccessMsg, setAuditSuccessMsg] = useState<string | null>(null);

  const handleOpenAuditModal = (lot: any) => {
    setAuditModalLot(lot as any);
    const qty = lot.remainingQty ?? lot.quantity ?? 0;
    setActualCount(String(qty));
    setAuditReason('Kiểm kê định kỳ nhân viên');
  };

  // Extract unique racks from inventory lots
  const availableRacks = useMemo(() => {
    const rackMap = new Map<string, { rackName: string; zone: string; lots: ApiLot[]; rawPrefix: string }>();
    lots.forEach((l, idx) => {
      const locDisplay = formatShelfLocation(l.location, l.zone, idx + 1);
      const rackName = locDisplay.split('(')[0].trim() || 'Kệ Tiêu Chuẩn';
      if (!rackMap.has(rackName)) {
        rackMap.set(rackName, {
          rackName,
          zone: (l.zone || 'DRY').toUpperCase(),
          lots: [l],
          rawPrefix: l.location || 'rack-01',
        });
      } else {
        rackMap.get(rackName)!.lots.push(l);
      }
    });
    return Array.from(rackMap.values()).sort((a, b) => a.rackName.localeCompare(b.rackName));
  }, [lots]);

  // Filter racks according to search query, zone, and audit completion
  const filteredRacks = useMemo(() => {
    return availableRacks.filter(r => {
      // Zone filter
      if (rackZoneFilter !== 'ALL') {
        const rz = r.zone.toUpperCase();
        if (rackZoneFilter === 'COOL' && !['COOL', 'COLD'].includes(rz)) return false;
        if (rackZoneFilter === 'FROZEN' && rz !== 'FROZEN') return false;
        if (rackZoneFilter === 'DRY' && rz !== 'DRY') return false;
      }

      // Status filter
      const auditedCount = r.lots.filter(l => auditedRecords[l.id] || auditedRecords[l.lotCode]).length;
      const isDone = auditedCount === r.lots.length && r.lots.length > 0;
      if (rackAuditStatusFilter === 'PENDING' && isDone) return false;
      if (rackAuditStatusFilter === 'DONE' && !isDone) return false;

      // Search query filter with accent-insensitive fuzzy matching
      if (!rackSearchQuery.trim()) return true;
      const rawQ = rackSearchQuery.toLowerCase().trim();
      const normQ = (rawQ || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D');

      const checkMatch = (target: string) => {
        if (!target) return false;
        const low = target.toLowerCase();
        if (low.includes(rawQ)) return true;
        const norm = low
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/đ/g, 'd')
          .replace(/Đ/g, 'D');
        return norm.includes(normQ);
      };

      const matchName = checkMatch(r.rackName);
      const matchPrefix = checkMatch(r.rawPrefix || '');
      const matchLotOrProd = r.lots.some(l =>
        checkMatch(l.lotCode || '') ||
        checkMatch(l.productName || '') ||
        checkMatch(l.sku || '') ||
        checkMatch(l.location || '')
      );
      return matchName || matchPrefix || matchLotOrProd;
    });
  }, [availableRacks, rackZoneFilter, rackAuditStatusFilter, rackSearchQuery, auditedRecords]);

  useEffect(() => {
    if (filteredRacks.length > 0) {
      if (!filteredRacks.some(r => r.rackName === selectedAuditRack)) {
        setSelectedAuditRack(filteredRacks[0].rackName);
      }
    }
  }, [filteredRacks, selectedAuditRack]);

  const handleToggleRackLed = async (shelfCode: string) => {
    setIsRackLedActive(prev => !prev);
    await locateShelfIotApi({
      warehouseCode: selectedWarehouse || 'WH-006',
      shelfCode: shelfCode || 'cld-shelf-14',
    });
  };

  const { lastEvent } = useStaffWebSocket();

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [lotsData, prodsData] = await Promise.all([
        fetchInventoryLots({
          warehouseCode: selectedWarehouse === 'ALL' ? undefined : selectedWarehouse,
          limit: 10000,
        }),
        fetchProducts(),
      ]);
      const prodsList = Array.isArray(prodsData)
        ? prodsData
        : (prodsData as any)?.items || (prodsData as any)?.data || [];
      const lotsList = Array.isArray(lotsData)
        ? lotsData
        : (lotsData as any)?.items || (lotsData as any)?.data || [];
      setLots(lotsList);
      setProducts(prodsList);
    } catch (err) {
      console.warn('Failed to load inventory data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedWarehouse]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Realtime Socket Trigger
  useEffect(() => {
    if (lastEvent) {
      if (['outbound_order_created', 'outbound_order_updated', 'order_status_updated', 'inventory_updated'].includes(lastEvent.type)) {
        loadData();
      }
    }
  }, [lastEvent, loadData]);

  // AI Smart Risk Engine — Matched 100% with Web Dashboard's Inventory.tsx
  const getAIRiskAnalysis = useCallback((lot: any): {
    level: 'SAFE' | 'WARNING' | 'DANGER';
    reason: string;
    recommendation: string;
    aiScore: number;
    category: string;
    categoryIcon: string;
    shelfLifePct: number;
  } => {
    const today = new Date();
    const expiry = lot.expiryDate ? new Date(lot.expiryDate) : null;
    const imported = lot.importDate ? new Date(lot.importDate) : null;
    const daysLeft = expiry ? Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 3600 * 24)) : null;

    const name = (lot.displayName || '').toLowerCase();
    const code = (lot.lotCode || '').toUpperCase();

    let catKey = 'DRY';
    let catLabel = 'Hàng khô';
    let decayRate = 1.0;

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

    let shelfLifePct = 0;
    if (expiry && imported) {
      const total = expiry.getTime() - imported.getTime();
      const used = today.getTime() - imported.getTime();
      shelfLifePct = total > 0 ? Math.min(100, Math.max(0, (used / total) * 100)) : 50;
    } else if (daysLeft !== null && daysLeft >= 0) {
      shelfLifePct = Math.max(0, 100 - Math.min(100, (daysLeft / 365) * 100));
    }

    const backendScore = Number(lot.riskScore) || 0;
    const aiScore = Math.min(100, Math.round(shelfLifePct * decayRate * 0.45 + backendScore * 0.35));
    const dangerDays = catKey === 'SEAFOOD' ? 3 : catKey === 'MEAT' ? 3 : catKey === 'DAIRY' ? 5 : catKey === 'VEGETABLE' ? 4 : catKey === 'FRUIT' ? 5 : 7;
    const warningDays = catKey === 'SEAFOOD' ? 7 : catKey === 'MEAT' ? 7 : catKey === 'DAIRY' ? 14 : catKey === 'VEGETABLE' ? 10 : catKey === 'FRUIT' ? 10 : 30;

    const category = catLabel;

    if (lot.status === 'EXPIRED' || (daysLeft !== null && daysLeft <= 0)) {
      return { level: 'DANGER', aiScore: 100, shelfLifePct, category, categoryIcon: '',
        reason: `Đã hết hạn sử dụng`,
        recommendation: 'Cần xử lý tiêu hủy hoặc trả hàng ngay lập tức' };
    }
    if (lot.status === 'DAMAGED') {
      return { level: 'DANGER', aiScore: 95, shelfLifePct, category, categoryIcon: '',
        reason: `Hư hỏng trong bảo quản`,
        recommendation: 'Cách ly khỏi lô lành, kiểm tra toàn bộ lô hàng' };
    }
    if (daysLeft !== null && daysLeft <= dangerDays) {
      return { level: 'DANGER', aiScore, shelfLifePct, category, categoryIcon: '',
        reason: `Còn ${daysLeft} ngày — Ngưỡng rủi ro cao (${catLabel})`,
        recommendation: `Xuất kho ngay hoặc kiểm kê / thanh lý` };
    }
    if (daysLeft !== null && daysLeft <= warningDays) {
      return { level: 'WARNING', aiScore, shelfLifePct, category, categoryIcon: '',
        reason: `Còn ${daysLeft} ngày — Cận hạn (${catLabel})`,
        recommendation: `Lên kế hoạch xuất kho trong ${daysLeft} ngày tới` };
    }
    if (aiScore >= 65 || lot.status === 'EXPIRED') {
      return { level: 'DANGER', aiScore, shelfLifePct, category, categoryIcon: '',
        reason: `Rủi ro bảo quản cao — ${catLabel} (${aiScore}/100)`,
        recommendation: 'Kiểm tra nhiệt độ, độ ẩm và chất lượng hàng' };
    }
    if (aiScore >= 40 || lot.status === 'AT_RISK') {
      return { level: 'WARNING', aiScore, shelfLifePct, category, categoryIcon: '',
        reason: `Cần theo dõi chất lượng — ${catLabel} (${aiScore}/100)`,
        recommendation: 'Tăng tần suất kiểm tra, cân nhắc xuất kho sớm' };
    }

    return { level: 'SAFE', aiScore, shelfLifePct, category, categoryIcon: '',
      reason: daysLeft !== null ? `Còn ${daysLeft} ngày — Đạt chuẩn an toàn` : `Đạt chuẩn bảo quản`,
      recommendation: 'Tiếp tục bảo quản theo quy trình tiêu chuẩn' };
  }, []);

  // Map products and calculate risk levels for each lot (100% matched with Web Dashboard)
  const enrichedLots = useMemo((): EnrichedLot[] => {
    const prodMap = new Map<string, ApiProduct>();
    products.forEach(p => {
      if (p.id) prodMap.set(p.id, p);
      if (p.sku) prodMap.set(p.sku, p);
      if (p.sku) prodMap.set(p.sku.toLowerCase(), p);
    });

    const now = Date.now();

    return lots.map(lot => {
      const cleanSku = (lot.sku || '').replace(/^LOT-/, '').trim();
      const lotMatch = (lot.lotCode || '').match(/LOT-(EM-\d+)/i) || (lot.lotCode || '').match(/LOT-([A-Z0-9_-]+)-WH/i);
      const extractedSku = lotMatch ? lotMatch[1] : null;

      const p =
        (lot.productId ? prodMap.get(lot.productId) : null) ||
        (extractedSku ? prodMap.get(extractedSku) : null) ||
        (extractedSku ? prodMap.get(extractedSku.toUpperCase()) : null) ||
        (cleanSku ? prodMap.get(cleanSku) : null) ||
        (cleanSku ? prodMap.get(cleanSku.toLowerCase()) : null) ||
        (lot.lotCode ? prodMap.get(lot.lotCode) : null);

      let daysRemaining = 999;
      if (lot.expiryDate) {
        const exp = new Date(lot.expiryDate).getTime();
        daysRemaining = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
      }

      // Friendly Name & SKU
      const getFriendlyName = (productId: string, lotCode: string, p?: any) => {
        if (p?.name) return p.name;
        const str = `${productId || ''} ${lotCode || ''}`.toUpperCase();
        if (str.includes('BROCCOLI')) return 'Súp lơ xanh Đà Lạt';
        if (str.includes('MILK')) return 'Sữa tươi tiệt trùng Dalat Milk';
        if (str.includes('NOODLE') || str.includes('HAOHAO')) return 'Mì Hảo Hảo Tôm Chua Cay';
        if (str.includes('BEEF')) return 'Thịt bò Mỹ nhập khẩu';
        if (str.includes('TOMATO')) return 'Cà chua sạch Đà Lạt';
        if (str.includes('VEG')) return 'Rau củ quả tươi nông sản';
        if (str.includes('FRUIT')) return 'Trái cây nhiệt đới tươi';
        if (str.includes('MEAT')) return 'Thịt tươi bảo quản lạnh';
        return 'Sản phẩm Thực phẩm CityMart';
      };

      const finalSku = p?.sku || extractedSku || (lot.sku && !lot.sku.startsWith('LOT-') ? lot.sku : null) || 'EM-SKU';
      const finalName = p?.name || getFriendlyName(lot.productId || lot.sku, lot.lotCode, p);

      const riskAnalysis = getAIRiskAnalysis({
        ...lot,
        displayName: finalName,
      });

      const z = (lot.zone || 'DRY').toUpperCase();
      const defaultTemp = z === 'COOL' || z === 'COLD' ? '0-4°C' : z === 'FROZEN' ? '-18°C' : '+25°C';

      const auditRec = auditedRecords[lot.id] || auditedRecords[lot.lotCode];
      const lastAuditedAt = auditRec ? auditRec.auditedAt : (lot as any).lastAuditedAt;
      const lastAuditedBy = auditRec ? auditRec.auditorName : (lot as any).lastAuditedBy;
      const lastAuditActualQty = auditRec ? auditRec.actualQty : (lot as any).lastAuditActualQty;
      const lastAuditDiff = auditRec ? auditRec.diff : (lot as any).lastAuditDiff;
      const lastAuditReason = auditRec ? auditRec.reason : (lot as any).lastAuditReason;

      return {
        ...lot,
        remainingQty: auditRec ? auditRec.actualQty : (lot.remainingQty ?? lot.quantity ?? 0),
        lastAuditedAt,
        lastAuditedBy,
        lastAuditActualQty,
        lastAuditDiff,
        lastAuditReason,
        isAudited: Boolean(lastAuditedAt),
        sku: finalSku,
        productName: finalName,
        category: p?.category || riskAnalysis.category,
        categoryIcon: riskAnalysis.categoryIcon,
        unit: p?.unit || 'Khay',
        price: p?.price || 45000,
        imageUrl: p?.imageUrl,
        barcode: p?.barcode || lot.sku || lot.lotCode,
        temperatureCondition: p?.temperatureCondition || defaultTemp,
        daysRemaining,
        riskLevel: riskAnalysis.level,
        aiScore: riskAnalysis.aiScore,
        riskReason: riskAnalysis.reason,
        riskRecommendation: riskAnalysis.recommendation,
        formattedLocation: formatShelfLocation(lot.location),
      };
    });
  }, [lots, products, getAIRiskAnalysis, auditedRecords]);

  // Overall Warehouse Inventory Statistics (Exact match with Web Dashboard)
  const warehouseStats = useMemo(() => {
    const totalLots = enrichedLots.length;
    let dryCount = 0;
    let coldCount = 0;
    let frozenCount = 0;
    let dangerCount = 0;
    let warningCount = 0;
    let safeCount = 0;
    let auditedCount = 0;
    const skuMap = new Set<string>();

    enrichedLots.forEach(lot => {
      skuMap.add(lot.sku);
      const z = (lot.zone || 'DRY').toUpperCase();
      if (z === 'FROZEN') frozenCount++;
      else if (z === 'COLD' || z === 'COOL') coldCount++;
      else dryCount++;

      if (lot.isAudited) auditedCount++;
      if (lot.riskLevel === 'DANGER') dangerCount++;
      else if (lot.riskLevel === 'WARNING') warningCount++;
      else safeCount++;
    });

    return {
      totalSkus: skuMap.size,
      totalLots,
      dangerCount,
      warningCount,
      safeCount,
      auditedCount,
      frozenCount,
      coldCount,
      dryCount,
    };
  }, [enrichedLots]);

  // Filtered & Sorted lots
  const filteredLots = useMemo(() => {
    let result = enrichedLots.filter(lot => {
      // Risk filter
      if (selectedRiskFilter === 'AUDITED' && !lot.isAudited) return false;
      if (selectedRiskFilter !== 'ALL' && selectedRiskFilter !== 'AUDITED' && lot.riskLevel !== selectedRiskFilter) return false;
      // Zone filter
      if (selectedZone !== 'ALL') {
        const z = (lot.zone || 'DRY').toUpperCase();
        if (selectedZone === 'COOL' && z !== 'COOL' && z !== 'COLD') return false;
        if (selectedZone === 'FROZEN' && z !== 'FROZEN') return false;
        if (selectedZone === 'DRY' && z !== 'DRY') return false;
      }

      // Search Query
      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase().trim();
      return (
        lot.lotCode.toLowerCase().includes(q) ||
        (lot.sku && lot.sku.toLowerCase().includes(q)) ||
        lot.productName.toLowerCase().includes(q) ||
        (lot.location && lot.location.toLowerCase().includes(q)) ||
        (lot.formattedLocation && lot.formattedLocation.toLowerCase().includes(q)) ||
        (lot.barcode && lot.barcode.toLowerCase().includes(q)) ||
        (lot.category && lot.category.toLowerCase().includes(q))
      );
    });

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'EXPIRY_ASC') return a.daysRemaining - b.daysRemaining;
      if (sortBy === 'EXPIRY_DESC') return b.daysRemaining - a.daysRemaining;
      if (sortBy === 'QTY_DESC') return (b.remainingQty ?? b.quantity ?? 0) - (a.remainingQty ?? a.quantity ?? 0);
      if (sortBy === 'QTY_ASC') return (a.remainingQty ?? a.quantity ?? 0) - (b.remainingQty ?? b.quantity ?? 0);
      if (sortBy === 'NAME_ASC') return a.productName.localeCompare(b.productName);
      return 0;
    });

    return result;
  }, [enrichedLots, selectedRiskFilter, selectedZone, searchQuery, sortBy]);

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedRiskFilter, selectedZone, selectedWarehouse, sortBy, pageSize]);

  // Pagination Slice
  const totalPages = Math.max(1, Math.ceil(filteredLots.length / pageSize));
  const paginatedLots = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLots.slice(start, start + pageSize);
  }, [filteredLots, currentPage, pageSize]);

  // Handle Quick Audit Submit
  const handleConfirmAudit = async () => {
    if (!auditModalLot) return;
    const countNum = parseInt(actualCount, 10);
    if (isNaN(countNum) || countNum < 0) {
      alert('Vui lòng nhập số lượng thực tế hợp lệ (≥ 0)!');
      return;
    }

    const prevQty = auditModalLot.remainingQty ?? auditModalLot.quantity ?? 0;
    const diff = countNum - prevQty;
    const auditor = user?.name || user?.email || 'Nhân viên trực ca';
    const auditTime = new Date().toISOString();

    setIsSubmittingAudit(true);
    try {
      await adjustStockAuditApi(
        auditModalLot.id || auditModalLot.lotCode,
        countNum,
        auditReason || 'Kiểm kê định kỳ nhân viên',
        auditor,
        user?.token
      );

      const record: AuditRecord = {
        lotId: auditModalLot.id,
        lotCode: auditModalLot.lotCode,
        actualQty: countNum,
        diff,
        reason: auditReason || 'Kiểm kê định kỳ nhân viên',
        auditedAt: auditTime,
        auditorName: auditor,
      };

      setAuditedRecords(prev => {
        const next = {
          ...prev,
          [auditModalLot.id]: record,
          [auditModalLot.lotCode]: record,
        };
        try {
          localStorage.setItem('citymart_staff_audited_lots', JSON.stringify(next));
        } catch (e) {}
        return next;
      });

      const diffMsg = diff === 0 ? 'Khớp 100%' : diff > 0 ? `Lệch thừa +${diff}` : `Lệch thiếu ${diff}`;
      setAuditSuccessMsg(`Đã lưu kết quả kiểm kê: Lô ${auditModalLot.lotCode} (${countNum} ${auditModalLot.unit} — ${diffMsg})`);

      setTimeout(() => {
        setAuditSuccessMsg(null);
        setAuditModalLot(null);
        loadData();
      }, 1400);
    } catch (err: any) {
      alert(`Lỗi kiểm kê: ${err.message || 'Không thể cập nhật'}`);
    } finally {
      setIsSubmittingAudit(false);
    }
  };

  const handleBarcodeScanned = (code: string) => {
    setSearchQuery(code);
    setIsScannerOpen(false);
  };

  const managerNumber = selectedWarehouse.startsWith('WH-') ? selectedWarehouse.split('-')[1] : '06';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '90px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
      {/* ───────────────────────────────────────────────────────── */}
      {/*  HEADER & WAREHOUSE SELECTOR                              */}
      {/* ───────────────────────────────────────────────────────── */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '18px', padding: '16px 20px', border: '1px solid #e2e8f0', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '12px', backgroundColor: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', boxShadow: '0 4px 12px rgba(5,150,105,0.25)' }}>
              <Boxes size={22} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '17px', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.2px' }}>Sổ Tồn Kho & Tra Cứu Hàng Hóa</h1>
              <p style={{ margin: 0, fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Đồng bộ trực tiếp 100% cơ sở dữ liệu kho CityMart</p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 auto', justifyContent: 'flex-end' }}>
            {/* Warehouse Select Dropdown OR Locked Badge */}
            {isWarehouseLocked ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 14px',
                  backgroundColor: '#f0f9ff',
                  border: '1.5px solid #0284c7',
                  borderRadius: '12px',
                  color: '#0369a1',
                  fontSize: '11.5px',
                  fontWeight: 800,
                  boxShadow: '0 2px 6px rgba(2, 132, 199, 0.1)',
                }}
              >
                <Building2 size={15} color="#0284c7" />
                <span>Kho trực thuộc: <b>{(user?.warehouseName || 'Kho Gò Vấp').replace(/\s*\([^)]*\)\s*$/, '')} ({user?.warehouseCode || 'WH-006'})</b></span>
              </div>
            ) : (
              <div style={{ position: 'relative', minWidth: '220px', flex: '0 1 300px' }}>
                <Building2 style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} size={15} />
                <select
                  value={selectedWarehouse}
                  onChange={(e) => {
                    const code = e.target.value;
                    setSelectedWarehouse(code);
                    if (code !== 'ALL') switchWarehouse(code);
                  }}
                  style={{
                    width: '100%',
                    padding: '9px 12px 9px 32px',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    borderRadius: '12px',
                    color: '#0f172a',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {WAREHOUSE_OPTIONS.map(opt => (
                    <option key={opt.code} value={opt.code} style={{ backgroundColor: '#ffffff', color: '#0f172a' }}>
                      {opt.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              onClick={() => loadData()}
              disabled={isLoading}
              title="Làm mới dữ liệu"
              style={{
                padding: '9px 12px',
                backgroundColor: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: '12px',
                color: '#64748b',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <RefreshCw size={16} style={{ animation: isLoading ? 'spin 1s linear infinite' : 'none', color: isLoading ? '#059669' : '#64748b' }} />
            </button>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────── */}
      {/*  VIEW MODE TOGGLE: TABLE vs RACK AUDIT vs 3D TWIN          */}
      {/* ───────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '6px', backgroundColor: '#ffffff', padding: '6px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <button
          onClick={() => {
            setDisplayMode('TABLE');
            setSearchParams({});
          }}
          style={{
            flex: 1,
            padding: '8px 10px',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: displayMode === 'TABLE' ? '#0f172a' : 'transparent',
            color: displayMode === 'TABLE' ? '#ffffff' : '#64748b',
            fontSize: '11.5px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            transition: 'all 0.15s ease',
          }}
        >
          <ClipboardList size={14} color={displayMode === 'TABLE' ? '#38bdf8' : '#64748b'} />
          <span>Sổ Tồn Kho</span>
        </button>

        <button
          onClick={() => {
            setDisplayMode('RACK_AUDIT');
            setSearchParams({ view: 'audit' });
          }}
          style={{
            flex: 1,
            padding: '8px 10px',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: displayMode === 'RACK_AUDIT' ? '#0284c7' : 'transparent',
            color: displayMode === 'RACK_AUDIT' ? '#ffffff' : '#64748b',
            fontSize: '11.5px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            transition: 'all 0.15s ease',
          }}
        >
          <Boxes size={14} color={displayMode === 'RACK_AUDIT' ? '#ffffff' : '#64748b'} />
          <span>Kiểm Kê Theo Kệ</span>
        </button>

        <button
          onClick={() => {
            setDisplayMode('3D_SCENE');
            setSearchParams({ view: '3d' });
          }}
          style={{
            flex: 1,
            padding: '8px 10px',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: displayMode === '3D_SCENE' ? '#0f766e' : 'transparent',
            color: displayMode === '3D_SCENE' ? '#ffffff' : '#64748b',
            fontSize: '11.5px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            transition: 'all 0.15s ease',
          }}
        >
          <Compass size={14} color={displayMode === '3D_SCENE' ? '#ffffff' : '#64748b'} />
          <span>Sơ Đồ Kho 3D</span>
        </button>
      </div>

      {/* 3D SCENE DIGITAL TWIN VIEW */}
      {displayMode === '3D_SCENE' && (
        <Mobile3DWarehouseView
          height={460}
          targetSku={searchQuery}
          lots={lots}
          products={products}
          warehouseCode={selectedWarehouse || 'WH-006'}
        />
      )}

      {/* AISLE / RACK CYCLE COUNTING AUDIT VIEW */}
      {displayMode === 'RACK_AUDIT' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Rack Search & Selector Bar */}
          <div style={{ backgroundColor: '#ffffff', borderRadius: '10px', padding: '14px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
            {/* Search Input & Scan Barcode Row */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  padding: '8px 12px',
                }}
              >
                <Search size={16} color="#64748b" />
                <input
                  type="text"
                  placeholder="Tìm tên kệ (VD: A1, C-02, Kệ Mát...), mã ô hoặc sản phẩm..."
                  value={rackSearchQuery}
                  onChange={e => setRackSearchQuery(e.target.value)}
                  style={{
                    flex: 1,
                    backgroundColor: 'transparent',
                    border: 'none',
                    outline: 'none',
                    fontSize: '12px',
                    fontWeight: 500,
                    color: '#0f172a',
                  }}
                />
                {rackSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setRackSearchQuery('')}
                    style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '2px' }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Barcode Scanner Button */}
              <button
                type="button"
                onClick={() => setIsRackScannerOpen(true)}
                style={{
                  backgroundColor: '#0284c7',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  whiteSpace: 'nowrap',
                }}
                title="Quét mã vạch dán trên kệ hàng"
              >
                <ScanBarcode size={15} />
                <span>Quét Kệ</span>
              </button>
            </div>

            {/* Quick Filter Chips: Zone & Audit Status */}
            <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
              {[
                { id: 'ALL', label: `Tất cả (${availableRacks.length})` },
                { id: 'COOL', label: 'Kho Mát' },
                { id: 'FROZEN', label: 'Kho Đông' },
                { id: 'DRY', label: 'Kho Khô' },
              ].map(z => (
                <button
                  key={z.id}
                  type="button"
                  onClick={() => setRackZoneFilter(z.id as any)}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '10.5px',
                    fontWeight: 600,
                    border: `1px solid ${rackZoneFilter === z.id ? '#0f172a' : '#e2e8f0'}`,
                    backgroundColor: rackZoneFilter === z.id ? '#0f172a' : '#f8fafc',
                    color: rackZoneFilter === z.id ? '#ffffff' : '#475569',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {z.label}
                </button>
              ))}

              <div style={{ width: '1px', backgroundColor: '#e2e8f0', margin: '0 2px' }} />

              <button
                type="button"
                onClick={() => setRackAuditStatusFilter(prev => prev === 'PENDING' ? 'ALL' : 'PENDING')}
                style={{
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '10.5px',
                  fontWeight: 600,
                  border: `1px solid ${rackAuditStatusFilter === 'PENDING' ? '#92400e' : '#e2e8f0'}`,
                  backgroundColor: rackAuditStatusFilter === 'PENDING' ? '#fffbeb' : '#f8fafc',
                  color: rackAuditStatusFilter === 'PENDING' ? '#92400e' : '#475569',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                Chưa xong
              </button>
              <button
                type="button"
                onClick={() => setRackAuditStatusFilter(prev => prev === 'DONE' ? 'ALL' : 'DONE')}
                style={{
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '10.5px',
                  fontWeight: 600,
                  border: `1px solid ${rackAuditStatusFilter === 'DONE' ? '#166534' : '#e2e8f0'}`,
                  backgroundColor: rackAuditStatusFilter === 'DONE' ? '#f0fdf4' : '#f8fafc',
                  color: rackAuditStatusFilter === 'DONE' ? '#166534' : '#475569',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                Đã xong 100%
              </button>
            </div>

            {/* Direct Rack Dropdown (Instant selection from 251 racks) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#64748b' }}>
                <span>DANH SÁCH KỆ PHÙ HỢP ({filteredRacks.length}/{availableRacks.length}):</span>
                {filteredRacks.length > 0 && (
                  <span style={{ color: '#0284c7', fontWeight: 600 }}>Chọn trực tiếp kệ bên dưới</span>
                )}
              </div>

              {filteredRacks.length === 0 ? (
                <div style={{ padding: '10px', backgroundColor: '#f8fafc', borderRadius: '6px', textAlign: 'center', fontSize: '11.5px', color: '#94a3b8' }}>
                  Không tìm thấy kệ nào khớp với từ khóa "{rackSearchQuery}".
                </div>
              ) : (
                <>
                  {/* Select Dropdown */}
                  <select
                    value={selectedAuditRack}
                    onChange={e => setSelectedAuditRack(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      backgroundColor: '#ffffff',
                      border: '1px solid #0284c7',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#0f172a',
                      outline: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    {filteredRacks.map(r => {
                      const auditedInRack = r.lots.filter(l => auditedRecords[l.id] || auditedRecords[l.lotCode]).length;
                      return (
                        <option key={r.rackName} value={r.rackName}>
                          {r.rackName} ({r.zone}) — Đã kiểm {auditedInRack}/{r.lots.length} lô ({Math.round(auditedInRack / r.lots.length * 100)}%)
                        </option>
                      );
                    })}
                  </select>

                  {/* Horizontal Quick Pills of matching racks (at most 15 for fast tap) */}
                  <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px', paddingTop: '4px' }}>
                    {filteredRacks.slice(0, 15).map(r => {
                      const isSelected = selectedAuditRack === r.rackName;
                      const auditedInRack = r.lots.filter(l => auditedRecords[l.id] || auditedRecords[l.lotCode]).length;
                      return (
                        <button
                          key={r.rackName}
                          type="button"
                          onClick={() => setSelectedAuditRack(r.rackName)}
                          style={{
                            padding: '6px 10px',
                            borderRadius: '6px',
                            border: `1px solid ${isSelected ? '#0284c7' : '#cbd5e1'}`,
                            backgroundColor: isSelected ? '#f0f9ff' : '#ffffff',
                            color: isSelected ? '#0369a1' : '#334155',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'flex-start',
                            gap: '1px',
                          }}
                        >
                          <span>{r.rackName}</span>
                          <span style={{ fontSize: '9.5px', color: isSelected ? '#0284c7' : '#64748b' }}>
                            {auditedInRack}/{r.lots.length} lô ({Math.round(auditedInRack / r.lots.length * 100)}%)
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Active Rack Header & Actions */}
          {(() => {
            const currentRack = availableRacks.find(r => r.rackName === selectedAuditRack) || availableRacks[0];
            if (!currentRack) return null;

            const rackLots = currentRack.lots;
            const auditedCount = rackLots.filter(l => auditedRecords[l.id] || auditedRecords[l.lotCode]).length;
            const progressPercent = rackLots.length > 0 ? Math.round((auditedCount / rackLots.length) * 100) : 0;

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {/* Rack Status Card */}
                <div style={{ backgroundColor: '#ffffff', borderRadius: '10px', padding: '14px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
                        {currentRack.rackName}
                      </h3>
                      <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
                        Phân vùng: <b style={{ color: currentRack.zone === 'COOL' ? '#047857' : currentRack.zone === 'FROZEN' ? '#0369a1' : '#b45309' }}>{currentRack.zone}</b> • {rackLots.length} mặt hàng
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={() => handleToggleRackLed(currentRack.rawPrefix)}
                        style={{
                          backgroundColor: isRackLedActive ? '#0284c7' : '#f0f9ff',
                          color: isRackLedActive ? '#ffffff' : '#0369a1',
                          border: '1px solid #bae6fd',
                          borderRadius: '6px',
                          padding: '6px 10px',
                          fontSize: '11px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <Radio size={14} />
                        <span>{isRackLedActive ? 'Tắt Đèn' : 'Nháy Đèn Kệ'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Audit Progress Bar */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>
                      <span>Tiến độ kiểm đếm đối chiếu:</span>
                      <strong>{auditedCount}/{rackLots.length} lô ({progressPercent}%)</strong>
                    </div>
                    <div style={{ height: '6px', backgroundColor: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
                      <div style={{ width: `${progressPercent}%`, height: '100%', backgroundColor: progressPercent === 100 ? '#166534' : '#0284c7', transition: 'width 0.3s ease' }} />
                    </div>
                  </div>
                </div>

                {/* Lots on this Rack Checklist */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {rackLots.map((lot, idx) => {
                    const auditRecord = auditedRecords[lot.id] || auditedRecords[lot.lotCode];
                    const isAudited = !!auditRecord;
                    const diff = auditRecord ? auditRecord.diff : 0;

                    return (
                      <div
                        key={lot.id || lot.lotCode}
                        style={{
                          backgroundColor: isAudited ? '#f0fdf4' : '#ffffff',
                          borderRadius: '8px',
                          border: `1px solid ${isAudited ? '#bbf7d0' : '#e2e8f0'}`,
                          padding: '12px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '10px',
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                            <span style={{ fontSize: '10px', backgroundColor: '#f1f5f9', color: '#475569', padding: '1px 5px', borderRadius: '4px', fontWeight: 600 }}>
                              Ô #{idx + 1}
                            </span>
                            <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#0284c7' }}>
                              {lot.lotCode}
                            </span>
                            {isAudited && (
                              <span
                                style={{
                                  fontSize: '10px',
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  fontWeight: 600,
                                  backgroundColor: diff === 0 ? '#dcfce7' : '#fee2e2',
                                  color: diff === 0 ? '#166534' : '#991b1b',
                                  border: `1px solid ${diff === 0 ? '#bbf7d0' : '#fecaca'}`,
                                }}
                              >
                                {diff === 0 ? 'Khớp 100%' : `Lệch ${diff > 0 ? `+${diff}` : diff}`}
                              </span>
                            )}
                          </div>

                          <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {lot.productName}
                          </div>

                          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                            Sổ sách: <b style={{ color: '#0f172a' }}>{lot.quantity} {lot.unit || 'hộp'}</b> • HSD: <b>{new Date(lot.expiryDate).toLocaleDateString('vi-VN')}</b>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleOpenAuditModal(lot)}
                          style={{
                            backgroundColor: isAudited ? '#ffffff' : '#0f766e',
                            color: isAudited ? '#166534' : '#ffffff',
                            border: `1px solid ${isAudited ? '#bbf7d0' : '#0f766e'}`,
                            borderRadius: '6px',
                            padding: '7px 12px',
                            fontSize: '11.5px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          {isAudited ? <CheckCircle2 size={13} color="#166534" /> : <Edit3 size={13} />}
                          <span>{isAudited ? 'Kiểm Lại' : 'Kiểm Đếm'}</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────── */}
      {/*  KPI CARDS & TABLE VIEW (TABLE MODE ONLY)                 */}
      {/* ───────────────────────────────────────────────────────── */}
      {displayMode === 'TABLE' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
        {/* Card 1: Tổng Mặt Hàng */}
        <div style={{ backgroundColor: '#ffffff', padding: '16px 18px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>TỔNG SỐ MẶT HÀNG</div>
          <div style={{ fontSize: '24px', fontWeight: 900, color: '#0f172a', marginTop: '6px' }}>
            {isLoading ? '...' : `${warehouseStats.totalSkus.toLocaleString()} mặt hàng`}
          </div>
        </div>

        {/* Card 2: Tổng Hàng Lưu Trữ (Clickable to reset) */}
        <div
          onClick={() => {
            setSelectedRiskFilter('ALL');
            setSelectedZone('ALL');
          }}
          style={{
            backgroundColor: (selectedRiskFilter === 'ALL' && selectedZone === 'ALL') ? '#ecfdf5' : '#ffffff',
            padding: '16px 18px',
            borderRadius: '16px',
            border: `1.5px solid ${(selectedRiskFilter === 'ALL' && selectedZone === 'ALL') ? '#059669' : '#e2e8f0'}`,
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            transition: 'all 0.2s ease',
          }}
          title="Bấm để xem tất cả lô hàng"
        >
          <div style={{ fontSize: '11px', color: '#059669', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>TỔNG HÀNG LƯU TRỮ</div>
          <div style={{ fontSize: '24px', fontWeight: 900, color: '#047857', marginTop: '6px' }}>
            {isLoading ? '...' : `${warehouseStats.totalLots.toLocaleString()} Lô`}
          </div>
        </div>

        {/* Card 3: Cảnh Báo Hết Hạn / Hỏng (Clickable with Lọc ngay toggle) */}
        <div
          onClick={() => setSelectedRiskFilter(prev => (prev === 'DANGER' ? 'ALL' : 'DANGER'))}
          style={{
            backgroundColor: selectedRiskFilter === 'DANGER' ? '#fef2f2' : '#ffffff',
            padding: '16px 18px',
            borderRadius: '16px',
            border: `1.5px solid ${selectedRiskFilter === 'DANGER' ? '#ef4444' : '#fecaca'}`,
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            transition: 'all 0.2s ease',
          }}
          title="Bấm để lọc nhanh các lô hàng cảnh báo hết hạn"
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '11px', color: '#dc2626', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>CẢNH BÁO HẾT HẠN / HỎNG</div>
            {selectedRiskFilter === 'DANGER' && (
              <span style={{ fontSize: '9px', backgroundColor: '#dc2626', color: '#ffffff', padding: '2px 6px', borderRadius: '4px', fontWeight: 900 }}>ĐANG LỌC</span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: '6px' }}>
            <div style={{ fontSize: '24px', fontWeight: 900, color: '#b91c1c' }}>
              {isLoading ? '...' : `${warehouseStats.dangerCount.toLocaleString()} Lô`}
            </div>
            <span style={{ fontSize: '11px', color: '#dc2626', fontWeight: 800, textDecoration: 'underline' }}>
              {selectedRiskFilter === 'DANGER' ? 'Bỏ lọc' : 'Lọc ngay →'}
            </span>
          </div>
        </div>

        {/* Card 4: Quản Lý Kho */}
        <div style={{ backgroundColor: '#ffffff', padding: '16px 18px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ fontSize: '11px', color: '#d97706', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>QUẢN LÝ KHO</div>
          <div style={{ fontSize: '20px', fontWeight: 900, color: '#b45309', marginTop: '6px' }}>
            Manager {managerNumber}
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────── */}
      {/*  PHÂN BỔ SỨC CHỨA (KHU VỰC) — LIGHT THEME                 */}
      {/* ───────────────────────────────────────────────────────── */}
      <div style={{ backgroundColor: '#ffffff', padding: '16px 20px', borderRadius: '18px', border: '1px solid #e2e8f0', boxShadow: '0 2px 10px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0, fontSize: '12px', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Phân bổ sức chứa (Khu vực)</h2>
          {selectedZone !== 'ALL' && (
            <button
              onClick={() => setSelectedZone('ALL')}
              style={{ border: 'none', background: 'none', color: '#059669', fontSize: '11.5px', fontWeight: 800, cursor: 'pointer', textDecoration: 'underline' }}
            >
              Xem tất cả khu vực
            </button>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
          {/* Kho Đông */}
          <div
            onClick={() => setSelectedZone(prev => (prev === 'FROZEN' ? 'ALL' : 'FROZEN'))}
            style={{
              padding: '12px 14px',
              borderRadius: '12px',
              backgroundColor: selectedZone === 'FROZEN' ? '#e0f2fe' : '#f0f9ff',
              border: `1.5px solid ${selectedZone === 'FROZEN' ? '#0284c7' : '#bae6fd'}`,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              transition: 'all 0.2s ease',
            }}
            title="Bấm để lọc lô hàng Kho Đông"
          >
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#0369a1', display: 'flex', alignItems: 'center', gap: '6px' }}>
              Kho Đông (-18°C)
            </span>
            <span style={{ fontSize: '14px', fontWeight: 900, color: '#0c4a6e' }}>
              {warehouseStats.frozenCount.toLocaleString()} lô
            </span>
          </div>

          {/* Kho Mát */}
          <div
            onClick={() => setSelectedZone(prev => (prev === 'COOL' ? 'ALL' : 'COOL'))}
            style={{
              padding: '12px 14px',
              borderRadius: '12px',
              backgroundColor: selectedZone === 'COOL' ? '#d1fae5' : '#ecfdf5',
              border: `1.5px solid ${selectedZone === 'COOL' ? '#059669' : '#a7f3d0'}`,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              transition: 'all 0.2s ease',
            }}
            title="Bấm để lọc lô hàng Kho Mát"
          >
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#047857', display: 'flex', alignItems: 'center', gap: '6px' }}>
              Kho Mát (0-4°C)
            </span>
            <span style={{ fontSize: '14px', fontWeight: 900, color: '#065f46' }}>
              {warehouseStats.coldCount.toLocaleString()} lô
            </span>
          </div>

          {/* Kho Khô */}
          <div
            onClick={() => setSelectedZone(prev => (prev === 'DRY' ? 'ALL' : 'DRY'))}
            style={{
              padding: '12px 14px',
              borderRadius: '12px',
              backgroundColor: selectedZone === 'DRY' ? '#e2e8f0' : '#f8fafc',
              border: `1.5px solid ${selectedZone === 'DRY' ? '#64748b' : '#cbd5e1'}`,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              transition: 'all 0.2s ease',
            }}
            title="Bấm để lọc lô hàng Kho Khô"
          >
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
              Kho Khô
            </span>
            <span style={{ fontSize: '14px', fontWeight: 900, color: '#0f172a' }}>
              {warehouseStats.dryCount.toLocaleString()} lô
            </span>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────── */}
      {/*  SEARCH & MULTI-FILTER TOOLBAR                            */}
      {/* ───────────────────────────────────────────────────────── */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '18px', padding: '16px 20px', border: '1px solid #e2e8f0', boxShadow: '0 2px 10px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Search Bar + Barcode Scanner Trigger */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} size={16} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo Tên SP, Mã SP, Lô hàng, Vị trí kệ, Barcode..."
              style={{
                width: '100%',
                padding: '10px 36px 10px 36px',
                backgroundColor: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: '12px',
                color: '#0f172a',
                fontSize: '12px',
                fontWeight: 600,
                outline: 'none',
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
              >
                <X size={15} />
              </button>
            )}
          </div>

          <button
            onClick={() => setIsScannerOpen(true)}
            style={{
              padding: '10px 16px',
              backgroundColor: '#059669',
              border: 'none',
              borderRadius: '12px',
              color: '#ffffff',
              fontSize: '12px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              whiteSpace: 'nowrap',
              boxShadow: '0 2px 8px rgba(5,150,105,0.25)',
            }}
          >
            <ScanBarcode size={16} />
            <span>Quét Mã</span>
          </button>
        </div>

        {/* Filter Badges & Sorter */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '10px', paddingTop: '8px', borderTop: '1px solid #f1f5f9' }}>
          {/* FEFO Risk Filter Badges */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', marginRight: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Filter size={12} /> Lọc:
            </span>
            {[
              { id: 'ALL', label: 'Tất cả' },
              { id: 'DANGER', label: `Nguy cơ cao (${warehouseStats.dangerCount})`, activeBg: '#dc2626', activeBorder: '#b91c1c' },
              { id: 'WARNING', label: `Cận date (${warehouseStats.warningCount})`, activeBg: '#d97706', activeBorder: '#b45309' },
              { id: 'SAFE', label: `An toàn (${warehouseStats.safeCount})`, activeBg: '#059669', activeBorder: '#047857' },
              { id: 'AUDITED', label: `Đã kiểm kê (${warehouseStats.auditedCount})`, activeBg: '#2563eb', activeBorder: '#1d4ed8' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSelectedRiskFilter(tab.id as any)}
                style={{
                  padding: '5px 12px',
                  borderRadius: '10px',
                  fontSize: '11.5px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  border: `1.5px solid ${selectedRiskFilter === tab.id ? (tab.activeBorder || '#059669') : '#e2e8f0'}`,
                  backgroundColor: selectedRiskFilter === tab.id ? (tab.activeBg || '#059669') : '#f8fafc',
                  color: selectedRiskFilter === tab.id ? '#ffffff' : '#334155',
                  transition: 'all 0.15s ease',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Sorter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <ArrowUpDown size={12} /> Xếp:
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              style={{
                padding: '5px 10px',
                backgroundColor: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: '10px',
                color: '#0f172a',
                fontSize: '11.5px',
                fontWeight: 700,
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="EXPIRY_ASC" style={{ backgroundColor: '#ffffff', color: '#0f172a' }}>Hạn SD Gần Nhất (Ưu tiên xuất)</option>
              <option value="EXPIRY_DESC" style={{ backgroundColor: '#ffffff', color: '#0f172a' }}>Hạn SD Xa Nhất</option>
              <option value="QTY_DESC" style={{ backgroundColor: '#ffffff', color: '#0f172a' }}>Tồn Kho Nhiều Nhất</option>
              <option value="QTY_ASC" style={{ backgroundColor: '#ffffff', color: '#0f172a' }}>Tồn Kho Ít Nhất</option>
              <option value="NAME_ASC" style={{ backgroundColor: '#ffffff', color: '#0f172a' }}>Tên Sản Phẩm A-Z</option>
            </select>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────── */}
      {/*  LOT ITEMS LIST & PAGINATION                              */}
      {/* ───────────────────────────────────────────────────────── */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '18px', border: '1px solid #e2e8f0', boxShadow: '0 2px 10px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
        {/* Results Count Header */}
        <div style={{ padding: '12px 20px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
          <div style={{ fontSize: '12px', fontWeight: 800, color: '#334155', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>Danh sách Lô Hàng:</span>
            <span style={{ padding: '2px 8px', backgroundColor: '#059669', color: '#ffffff', borderRadius: '12px', fontWeight: 900, fontSize: '11px' }}>
              {filteredLots.length.toLocaleString()} lô phù hợp
            </span>
          </div>

          {/* Page size selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: '#64748b', fontWeight: 700 }}>
            <span>Hiển thị:</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              style={{
                padding: '3px 8px',
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                color: '#0f172a',
                fontSize: '11.5px',
                fontWeight: 800,
                outline: 'none',
              }}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite', color: '#059669' }} />
            <p style={{ fontSize: '12px', fontWeight: 800, color: '#334155', margin: 0 }}>Đang tải và đồng bộ danh sách lô hàng...</p>
          </div>
        ) : paginatedLots.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
            <Boxes size={48} color="#94a3b8" />
            <p style={{ fontSize: '14px', fontWeight: 800, color: '#334155', margin: 0 }}>Không tìm thấy lô hàng nào phù hợp</p>
            <p style={{ fontSize: '11.5px', color: '#64748b', margin: 0 }}>Thử thay đổi từ khóa tìm kiếm hoặc điều chỉnh bộ lọc phân khu/rủi ro.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {paginatedLots.map((lot, idx) => {
              const qty = lot.remainingQty ?? lot.quantity ?? 0;
              const isDanger = lot.riskLevel === 'DANGER';
              const isWarning = lot.riskLevel === 'WARNING';
              const isCold = lot.zone === 'COOL' || lot.zone === 'COLD' || lot.zone === 'FROZEN';

              return (
                <div
                  key={lot.id || lot.lotCode}
                  style={{
                    padding: '14px 20px',
                    borderBottom: idx === paginatedLots.length - 1 ? 'none' : '1px solid #f1f5f9',
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    transition: 'background-color 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  {/* Left: Product Info & Badges */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flex: '1 1 300px', minWidth: '0' }}>
                    <div style={{ width: '46px', height: '46px', borderRadius: '12px', backgroundColor: '#f1f5f9', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                      {lot.imageUrl ? (
                        <img
                          src={lot.imageUrl}
                          alt={lot.productName}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <Package size={20} color="#64748b" />
                      )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 900, color: '#0f172a', lineHeight: 1.3 }}>
                          {lot.productName}
                        </span>
                        <span style={{ padding: '1px 6px', borderRadius: '6px', backgroundColor: '#f1f5f9', color: '#64748b', fontFamily: 'monospace', fontSize: '10px', fontWeight: 800 }}>
                          {lot.sku}
                        </span>
                      </div>

                      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px', fontSize: '11px', color: '#64748b' }}>
                        <span style={{ fontFamily: 'monospace', color: '#334155', fontWeight: 700 }}>
                          Lô: <strong style={{ color: '#0f172a' }}>{lot.lotCode}</strong>
                        </span>
                        <span>•</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#047857', fontWeight: 800, backgroundColor: '#ecfdf5', padding: '2px 8px', borderRadius: '6px', border: '1px solid #a7f3d0' }}>
                          <MapPin size={11} />
                          {lot.formattedLocation}
                        </span>
                      </div>

                      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px', paddingTop: '2px' }}>
                        {/* Expiry Badge */}
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '2px 8px',
                            borderRadius: '20px',
                            fontSize: '10px',
                            fontWeight: 800,
                            backgroundColor: isDanger ? '#fef2f2' : isWarning ? '#fffbeb' : '#ecfdf5',
                            color: isDanger ? '#dc2626' : isWarning ? '#d97706' : '#059669',
                            border: `1px solid ${isDanger ? '#fecaca' : isWarning ? '#fde68a' : '#a7f3d0'}`,
                          }}
                        >
                          <Clock size={10} />
                          HSD: {lot.expiryDate ? new Date(lot.expiryDate).toLocaleDateString('vi-VN') : 'N/A'}
                          {lot.daysRemaining <= 0 ? ' (Hết hạn)' : ` (Còn ${lot.daysRemaining} ngày)`}
                        </span>

                        {/* Zone Condition Badge */}
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 600, backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0' }}>
                          {lot.zone === 'FROZEN' ? 'Hầm Đông' : isCold ? 'Kho Mát' : 'Kho Khô'} ({lot.temperatureCondition})
                        </span>

                        {/* Audit Status Badge */}
                        {lot.isAudited && (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '2px 8px',
                              borderRadius: '20px',
                              fontSize: '10px',
                              fontWeight: 800,
                              backgroundColor: '#eff6ff',
                              color: '#1d4ed8',
                              border: '1px solid #bfdbfe',
                            }}
                          >
                            <ClipboardList size={10} />
                            Đã kiểm kê: {new Date(lot.lastAuditedAt!).toLocaleDateString('vi-VN')} ({lot.lastAuditedBy || 'Nhân viên'})
                            {lot.lastAuditDiff !== undefined && (
                              <b style={{ color: lot.lastAuditDiff === 0 ? '#059669' : lot.lastAuditDiff > 0 ? '#0284c7' : '#dc2626' }}>
                                {lot.lastAuditDiff === 0 ? ' [Khớp]' : lot.lastAuditDiff > 0 ? ` [+${lot.lastAuditDiff}]` : ` [${lot.lastAuditDiff}]`}
                              </b>
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Quantity & Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px', flex: '0 0 auto' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '18px', fontWeight: 900, color: '#0f172a' }}>
                        {qty.toLocaleString()} <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b' }}>{lot.unit}</span>
                      </div>
                      <div style={{ fontSize: '10.5px', color: '#64748b', fontWeight: 600 }}>
                        {lot.price.toLocaleString('vi-VN')} đ/khay
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button
                        onClick={() => setSelectedLot(lot)}
                        style={{ padding: '8px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '10px', color: '#334155', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        title="Xem chi tiết"
                      >
                        <Eye size={15} />
                      </button>

                      <button
                        onClick={() => {
                          setAuditModalLot(lot);
                          setActualCount(String(qty));
                          setAuditReason('Kiểm kê định kỳ nhân viên');
                        }}
                        style={{ padding: '8px 12px', backgroundColor: '#059669', border: 'none', borderRadius: '10px', color: '#ffffff', fontSize: '11.5px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', boxShadow: '0 2px 6px rgba(5,150,105,0.25)' }}
                        title="Kiểm kê điều chỉnh tồn kho"
                      >
                        <ClipboardList size={14} />
                        <span>Kiểm Kê</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ───────────────────────────────────────────────────────── */}
        {/*  PAGINATION CONTROLS                                      */}
        {/* ───────────────────────────────────────────────────────── */}
        {totalPages > 1 && (
          <div style={{ padding: '12px 20px', backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
            <div style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 700 }}>
              Hiển thị <strong style={{ color: '#0f172a' }}>{(currentPage - 1) * pageSize + 1}</strong> -{' '}
              <strong style={{ color: '#0f172a' }}>
                {Math.min(currentPage * pageSize, filteredLots.length)}
              </strong>{' '}
              trên tổng <strong style={{ color: '#0f172a' }}>{filteredLots.length.toLocaleString()}</strong> lô
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                style={{ padding: '6px 8px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: currentPage === 1 ? '#94a3b8' : '#334155', cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
                title="Trang đầu"
              >
                <ChevronsLeft size={14} />
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                style={{ padding: '6px 8px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: currentPage === 1 ? '#94a3b8' : '#334155', cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
                title="Trang trước"
              >
                <ChevronLeft size={14} />
              </button>

              {/* Page Number Badges */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '0 2px' }}>
                {Array.from({ length: Math.min(5, totalPages) }, (_, idx) => {
                  let pageNum = currentPage - 2 + idx;
                  if (currentPage < 3) pageNum = idx + 1;
                  else if (currentPage > totalPages - 2) pageNum = totalPages - 4 + idx;
                  if (pageNum < 1 || pageNum > totalPages) return null;

                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '8px',
                        fontSize: '11.5px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        border: `1px solid ${currentPage === pageNum ? '#059669' : '#cbd5e1'}`,
                        backgroundColor: currentPage === pageNum ? '#059669' : '#ffffff',
                        color: currentPage === pageNum ? '#ffffff' : '#334155',
                      }}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                style={{ padding: '6px 8px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: currentPage === totalPages ? '#94a3b8' : '#334155', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
                title="Trang sau"
              >
                <ChevronRight size={14} />
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                style={{ padding: '6px 8px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: currentPage === totalPages ? '#94a3b8' : '#334155', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
                title="Trang cuối"
              >
                <ChevronsRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
      </>
      )}

      {/* ───────────────────────────────────────────────────────── */}
      {/*  MODAL: LOT DETAIL                                        */}
      {/* ───────────────────────────────────────────────────────── */}
      {selectedLot && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '20px', maxWidth: '520px', width: '100%', padding: '20px', border: '1px solid #e2e8f0', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: 36, height: 36, borderRadius: 6, backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Package size={20} color="#64748b" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 900, color: '#0f172a' }}>{selectedLot.productName}</h3>
                  <p style={{ margin: 0, fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>Mã SP: {selectedLot.sku}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedLot(null)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '10px', textTransform: 'uppercase', fontWeight: 800 }}>Mã Lô Hàng</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#0f172a' }}>{selectedLot.lotCode}</span>
                </div>
                <div>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '10px', textTransform: 'uppercase', fontWeight: 800 }}>Vị Trí Kệ Hàng</span>
                  <span style={{ fontWeight: 800, color: '#059669' }}>{selectedLot.formattedLocation}</span>
                </div>
                <div>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '10px', textTransform: 'uppercase', fontWeight: 800 }}>Số Lượng Tồn</span>
                  <span style={{ fontWeight: 900, color: '#047857', fontSize: '14px' }}>
                    {(selectedLot.remainingQty ?? selectedLot.quantity ?? 0).toLocaleString()} {selectedLot.unit}
                  </span>
                </div>
                <div>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '10px', textTransform: 'uppercase', fontWeight: 800 }}>Điều Kiện Bảo Quản</span>
                  <span style={{ fontWeight: 800, color: '#334155' }}>{selectedLot.temperatureCondition}</span>
                </div>
              </div>

              {/* AI Risk Assessment Card */}
              <div
                style={{
                  padding: '12px',
                  borderRadius: '12px',
                  border: `1px solid ${selectedLot.riskLevel === 'DANGER' ? '#fecaca' : selectedLot.riskLevel === 'WARNING' ? '#fde68a' : '#a7f3d0'}`,
                  backgroundColor: selectedLot.riskLevel === 'DANGER' ? '#fef2f2' : selectedLot.riskLevel === 'WARNING' ? '#fffbeb' : '#ecfdf5',
                  color: selectedLot.riskLevel === 'DANGER' ? '#dc2626' : selectedLot.riskLevel === 'WARNING' ? '#d97706' : '#059669',
                }}
              >
                <div style={{ fontWeight: 800, fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>Đánh giá hạn dùng (Điểm chất lượng: {selectedLot.aiScore}/100)</span>
                  <span style={{ padding: '1px 6px', borderRadius: '6px', fontWeight: 900, fontSize: '10px', textTransform: 'uppercase', backgroundColor: '#ffffff', border: '1px solid currentColor' }}>
                    {selectedLot.riskLevel}
                  </span>
                </div>
                <p style={{ margin: '6px 0 0 0', fontSize: '11.5px', fontWeight: 700 }}>{selectedLot.riskReason}</p>
                <p style={{ margin: '4px 0 0 0', fontSize: '11px', opacity: 0.85 }}>Đề xuất: {selectedLot.riskRecommendation}</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', color: '#64748b' }}>
                <div>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '10px' }}>Ngày Nhập Kho:</span>
                  <span style={{ fontWeight: 700, color: '#0f172a' }}>
                    {selectedLot.importDate ? new Date(selectedLot.importDate).toLocaleDateString('vi-VN') : 'N/A'}
                  </span>
                </div>
                <div>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '10px' }}>Hạn Sử Dụng (Expiry):</span>
                  <span style={{ fontWeight: 700, color: '#0f172a' }}>
                    {selectedLot.expiryDate ? new Date(selectedLot.expiryDate).toLocaleDateString('vi-VN') : 'N/A'}
                  </span>
                </div>
                <div>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '10px' }}>Mã Barcode:</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0f172a' }}>{selectedLot.barcode || 'N/A'}</span>
                </div>
                <div>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '10px' }}>Kho Quản Lý:</span>
                  <span style={{ fontWeight: 700, color: '#0f172a' }}>{selectedLot.warehouseCode || 'WH-006'}</span>
                </div>
              </div>

              {/* Last Audit History Card */}
              {selectedLot.isAudited && (
                <div style={{ backgroundColor: '#eff6ff', borderRadius: '12px', padding: '12px', border: '1.5px solid #bfdbfe', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', fontWeight: 900, color: '#1d4ed8' }}>
                      <ClipboardList size={14} />
                      <span>Lịch Sử Kiểm Kê Gần Nhất</span>
                    </div>
                    <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#2563eb' }}>
                      {new Date(selectedLot.lastAuditedAt!).toLocaleString('vi-VN')}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px', fontSize: '11px', marginTop: '2px' }}>
                    <div>
                      <span style={{ color: '#64748b' }}>Người kiểm kê: </span>
                      <strong style={{ color: '#0f172a' }}>{selectedLot.lastAuditedBy || 'Nhân viên'}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748b' }}>Số lượng đếm: </span>
                      <strong style={{ color: '#0f172a' }}>{selectedLot.lastAuditActualQty ?? selectedLot.remainingQty} {selectedLot.unit}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748b' }}>Chênh lệch: </span>
                      <strong style={{ color: selectedLot.lastAuditDiff === 0 ? '#059669' : selectedLot.lastAuditDiff! > 0 ? '#0284c7' : '#dc2626' }}>
                        {selectedLot.lastAuditDiff === 0 ? 'Khớp 100%' : selectedLot.lastAuditDiff! > 0 ? `+${selectedLot.lastAuditDiff}` : selectedLot.lastAuditDiff} {selectedLot.unit}
                      </strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748b' }}>Lý do: </span>
                      <strong style={{ color: '#0f172a' }}>{selectedLot.lastAuditReason || 'Kiểm kê định kỳ'}</strong>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div style={{ paddingTop: '12px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                onClick={() => setSelectedLot(null)}
                style={{ padding: '8px 16px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', color: '#334155', borderRadius: '10px', fontSize: '12px', fontWeight: 800, cursor: 'pointer' }}
              >
                Đóng
              </button>
              <button
                onClick={() => {
                  const target = selectedLot;
                  setSelectedLot(null);
                  setAuditModalLot(target);
                  setActualCount(String(target.remainingQty ?? target.quantity ?? 0));
                }}
                style={{ padding: '8px 16px', backgroundColor: '#059669', border: 'none', color: '#ffffff', borderRadius: '10px', fontSize: '12px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 8px rgba(5,150,105,0.25)' }}
              >
                <ClipboardList size={14} />
                <span>Kiểm Kê Lô Này</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────── */}
      {/*  MODAL: CYCLE COUNT AUDIT                                 */}
      {/* ───────────────────────────────────────────────────────── */}
      {auditModalLot && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '20px', maxWidth: '440px', width: '100%', padding: '20px', border: '1px solid #e2e8f0', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#059669', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ClipboardList size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 900, color: '#0f172a' }}>Kiểm Kê & Điều Chỉnh Tồn Kho</h3>
                  <p style={{ margin: 0, fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>{auditModalLot.lotCode}</p>
                </div>
              </div>
              <button
                onClick={() => setAuditModalLot(null)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {auditSuccessMsg ? (
              <div style={{ padding: '16px', backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', color: '#059669', borderRadius: '12px', fontSize: '12px', fontWeight: 800, textAlign: 'center' }}>
                {auditSuccessMsg}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '12px' }}>
                <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ color: '#0f172a', fontWeight: 800 }}>{auditModalLot.productName}</div>
                  <div style={{ color: '#64748b' }}>
                    Vị trí: <strong style={{ color: '#059669' }}>{auditModalLot.formattedLocation}</strong>
                  </div>
                  <div style={{ color: '#64748b' }}>
                    Tồn trên hệ thống:{' '}
                    <strong style={{ color: '#0f172a' }}>
                      {(auditModalLot.remainingQty ?? auditModalLot.quantity ?? 0).toLocaleString()} {auditModalLot.unit}
                    </strong>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', color: '#334155', fontWeight: 800, marginBottom: '6px' }}>
                    Số lượng thực tế đếm được ({auditModalLot.unit}):
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={actualCount}
                    onChange={(e) => setActualCount(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      backgroundColor: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '10px',
                      fontSize: '14px',
                      fontWeight: 800,
                      color: '#0f172a',
                      outline: 'none',
                    }}
                    placeholder="Nhập số lượng thực tế..."
                  />
                  {/* Difference Badge */}
                  {actualCount !== '' && !isNaN(Number(actualCount)) && (
                    <div style={{ marginTop: '6px', fontSize: '11px', fontWeight: 800 }}>
                      {Number(actualCount) === (auditModalLot.remainingQty ?? auditModalLot.quantity ?? 0) ? (
                        <span style={{ color: '#059669' }}>Khớp 100% với hệ thống</span>
                      ) : Number(actualCount) > (auditModalLot.remainingQty ?? auditModalLot.quantity ?? 0) ? (
                        <span style={{ color: '#0284c7' }}>
                          Lệch thừa:{' '}
                          {Number(actualCount) - (auditModalLot.remainingQty ?? auditModalLot.quantity ?? 0)}{' '}
                          {auditModalLot.unit}
                        </span>
                      ) : (
                        <span style={{ color: '#dc2626' }}>
                          Lệch thiếu (Hao hụt):{' '}
                          {(auditModalLot.remainingQty ?? auditModalLot.quantity ?? 0) - Number(actualCount)}{' '}
                          {auditModalLot.unit}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', color: '#334155', fontWeight: 800, marginBottom: '6px' }}>Lý do điều chỉnh / Ghi chú:</label>
                  <select
                    value={auditReason}
                    onChange={(e) => setAuditReason(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      backgroundColor: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '10px',
                      fontSize: '11.5px',
                      fontWeight: 700,
                      color: '#0f172a',
                      outline: 'none',
                    }}
                  >
                    <option value="Kiểm kê định kỳ hàng tháng" style={{ backgroundColor: '#ffffff', color: '#0f172a' }}>Kiểm kê định kỳ hàng tháng</option>
                    <option value="Hao hụt / Rơi vỡ / Hư hỏng" style={{ backgroundColor: '#ffffff', color: '#0f172a' }}>Hao hụt / Rơi vỡ / Hư hỏng</option>
                    <option value="Phát hiện hàng dư sau xuất kho" style={{ backgroundColor: '#ffffff', color: '#0f172a' }}>Phát hiện hàng dư sau xuất kho</option>
                    <option value="Điều chỉnh sai sót nhập liệu ban đầu" style={{ backgroundColor: '#ffffff', color: '#0f172a' }}>Điều chỉnh sai sót nhập liệu ban đầu</option>
                    <option value="Khác" style={{ backgroundColor: '#ffffff', color: '#0f172a' }}>Lý do khác...</option>
                  </select>
                </div>
              </div>
            )}

            <div style={{ paddingTop: '10px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                onClick={() => setAuditModalLot(null)}
                disabled={isSubmittingAudit}
                style={{ padding: '8px 14px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', color: '#334155', borderRadius: '10px', fontSize: '11.5px', fontWeight: 800, cursor: 'pointer' }}
              >
                Hủy
              </button>
              <button
                onClick={handleConfirmAudit}
                disabled={isSubmittingAudit || actualCount === ''}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#059669',
                  border: 'none',
                  color: '#ffffff',
                  borderRadius: '10px',
                  fontSize: '11.5px',
                  fontWeight: 800,
                  cursor: isSubmittingAudit || actualCount === '' ? 'not-allowed' : 'pointer',
                  opacity: isSubmittingAudit || actualCount === '' ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 8px rgba(5,150,105,0.25)',
                }}
              >
                {isSubmittingAudit ? (
                  <>
                    <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />
                    <span>Đang lưu...</span>
                  </>
                ) : (
                  <>
                    <Check size={14} />
                    <span>Lưu Kết Quả Kiểm Kê</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────── */}
      {/*  MODAL: CAMERA BARCODE SCANNER                            */}
      {/* ───────────────────────────────────────────────────────── */}
      <CameraScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        scannerType="LOOKUP"
        title="Quét Mã Tra Cứu Tồn Kho & Kệ Hàng"
        onScanResult={(code) => {
          const clean = code.trim();
          setSearchQuery(clean);
          const found = enrichedLots.find(l =>
            l.lotCode.toLowerCase().includes(clean.toLowerCase()) ||
            l.sku?.toLowerCase().includes(clean.toLowerCase()) ||
            l.barcode === clean ||
            l.location?.toLowerCase().includes(clean.toLowerCase())
          );
          if (found) {
            setSelectedLot(found);
          }
        }}
      />

      {/* ───────────────────────────────────────────────────────── */}
      {/*  MODAL: RACK BARCODE SCANNER (CHỌN KỆ KIỂM KÊ)            */}
      {/* ───────────────────────────────────────────────────────── */}
      <CameraScannerModal
        isOpen={isRackScannerOpen}
        onClose={() => setIsRackScannerOpen(false)}
        scannerType="LOOKUP"
        title="Quét Mã Vạch Kệ Để Chọn Kệ Kiểm Kê"
        onScanResult={(code) => {
          const clean = code.trim().toLowerCase();
          setRackSearchQuery(code.trim());
          const match = availableRacks.find(r =>
            r.rackName.toLowerCase().includes(clean) ||
            r.rawPrefix.toLowerCase().includes(clean) ||
            r.lots.some(l => (l.location || '').toLowerCase().includes(clean))
          );
          if (match) {
            setSelectedAuditRack(match.rackName);
          }
          setIsRackScannerOpen(false);
        }}
      />
    </div>
  );
};
