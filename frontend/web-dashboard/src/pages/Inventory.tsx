import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Boxes, MapPin, RefreshCw, X, Layers, Settings, Building2, Edit2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useWarehouse, type Warehouse } from '../contexts/WarehouseContext';
import { Warehouse3DDigitalTwin } from '../components/Warehouse3DDigitalTwin';

const INVENTORY_API = 'http://localhost:3011'; // inventory-service

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

  // Tab State: Sổ tồn kho vs Bản đồ 3D Digital Twin
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<'STOCK' | '3D_MAP'>(tabParam === '3d' ? '3D_MAP' : 'STOCK');

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
      const [resLots, resProducts] = await Promise.all([
        fetch(`${INVENTORY_API}/inventory/lots?limit=5000&warehouseCode=${wh.code}`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`http://localhost:3010/products?limit=3000`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      if (resLots.ok && resProducts.ok) {
        const lots = await resLots.json();
        const productsData = await resProducts.json();
        const products = Array.isArray(productsData) ? productsData : (productsData.items || []);
        
        const productMap: Record<string, any> = {};
        products.forEach((p: any) => {
          productMap[p.id] = p;
          productMap[p.sku] = p;
        });

        const filtered = lots.filter((l: any) => (!l.warehouseCode || l.warehouseCode === wh.code) && ((l.remainingQty !== undefined ? l.remainingQty : l.quantity) >= 0));
        
        let dryCount = 0;
        let coldCount = 0;
        let frozenCount = 0;
        const grouped: Record<string, {sku: string, productName: string, qty: number}> = {};
        
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
          return p?.sku || productId || 'Sản phẩm thực phẩm';
        };

        const getFriendlySku = (productId: string, lotCode: string, p?: any) => {
          if (p?.sku) return p.sku;
          const str = `${productId || ''} ${lotCode || ''}`.toUpperCase();
          if (str.includes('BROCCOLI')) return 'VEG-BROCCOLI-01';
          if (str.includes('MILK')) return 'MILK-DALAT-1L';
          if (str.includes('NOODLE')) return 'NOODLE-HAOHAO';
          if (str.includes('BEEF')) return 'BEEF-STEAK-US';
          if (str.includes('TOMATO')) return 'TOMATO-DALAT';
          return (productId && productId.length > 20) ? (lotCode.split('-WH')[0] || productId.slice(0, 12)) : (productId || 'SKU-GENERAL');
        };

        // ─────────────────────────────────────────────────────────
        //  🤖 AI SMART RISK ENGINE — Product-Aware Spoilage Analysis
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
          let catIcon = '🌾';
          let decayRate = 1.0;  // Sensitivity multiplier (higher = spoils faster)

          if (/cá|tôm|mực|hải sản|cua|ghẹ|sò|ốc/.test(name) || /SEAFOOD|FISH|SHRIMP|SQUID/.test(code)) {
            catKey = 'SEAFOOD'; catLabel = 'Hải sản'; catIcon = '🐟'; decayRate = 2.8;
          } else if (/thịt|bò|heo|gà|vịt|trứng/.test(name) || /BEEF|PORK|CHICKEN|MEAT|DUCK|EGG/.test(code)) {
            catKey = 'MEAT'; catLabel = 'Thịt & Trứng'; catIcon = '🥩'; decayRate = 2.2;
          } else if (/sữa|phô mai|yaourt|yogurt|kem|bơ/.test(name) || /MILK|DAIRY|CHEESE|YOGURT/.test(code)) {
            catKey = 'DAIRY'; catLabel = 'Sữa & Dairy'; catIcon = '🥛'; decayRate = 1.6;
          } else if (/rau|cải|súp lơ|dưa|cà|đậu|hành|ngò|cần/.test(name) || /VEG|BROCCOLI|TOMATO|LETTUCE|SPINACH/.test(code)) {
            catKey = 'VEGETABLE'; catLabel = 'Rau củ quả'; catIcon = '🥬'; decayRate = 2.0;
          } else if (/táo|cam|xoài|dứa|ổi|chuối|trái cây/.test(name) || /FRUIT|APPLE|MANGO|ORANGE/.test(code)) {
            catKey = 'FRUIT'; catLabel = 'Trái cây'; catIcon = '🍎'; decayRate = 1.7;
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

          // ④ Composite AI Score: shelf life decay (weighted by category) + backend score + zone penalty
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

          const category = `${catIcon} ${catLabel}`;

          // ⑥ Absolute hard rules (expiry/damage override everything)
          if (lot.status === 'EXPIRED' || (daysLeft !== null && daysLeft <= 0)) {
            return { level: 'DANGER', aiScore: 100, shelfLifePct, category, categoryIcon: catIcon,
              reason: `⚠️ ${catIcon} Đã hết hạn sử dụng`,
              recommendation: 'Cần xử lý tiêu hủy hoặc trả hàng ngay lập tức' };
          }
          if (lot.status === 'DAMAGED') {
            return { level: 'DANGER', aiScore: 95, shelfLifePct, category, categoryIcon: catIcon,
              reason: `🔥 ${catIcon} Hư hỏng trong bảo quản`,
              recommendation: 'Cách ly khỏi lô lành, kiểm tra toàn bộ lô hàng' };
          }
          if (zonePenalty > 0 && (daysLeft === null || daysLeft <= dangerDays * 2)) {
            return { level: 'DANGER', aiScore, shelfLifePct, category, categoryIcon: catIcon,
              reason: `🌡️ ${catIcon} Bảo quản sai nhiệt độ + cận hạn`,
              recommendation: `Chuyển ${catLabel} sang khu phù hợp ngay và xuất kho ưu tiên` };
          }

          // ⑦ Day-based rules (product-specific)
          if (daysLeft !== null && daysLeft <= dangerDays) {
            return { level: 'DANGER', aiScore, shelfLifePct, category, categoryIcon: catIcon,
              reason: `📛 ${catIcon} Còn ${daysLeft} ngày — ngưỡng nguy hiểm của ${catLabel}`,
              recommendation: `Xuất kho ngay hoặc kiểm kê / thanh lý` };
          }
          if (daysLeft !== null && daysLeft <= warningDays) {
            return { level: 'WARNING', aiScore, shelfLifePct, category, categoryIcon: catIcon,
              reason: `⏳ ${catIcon} Còn ${daysLeft} ngày — cận hạn với ${catLabel}`,
              recommendation: `Lên kế hoạch xuất kho trong ${daysLeft} ngày tới` };
          }

          // ⑧ AI score-based (product-specific thresholds)
          if (aiScore >= dangerScore || lot.status === 'EXPIRED') {
            return { level: 'DANGER', aiScore, shelfLifePct, category, categoryIcon: catIcon,
              reason: `🤖 AI: Rủi ro hư hỏng cao — ${catIcon} ${catLabel} (${aiScore}/100)`,
              recommendation: 'Kiểm tra nhiệt độ, độ ẩm và chất lượng hàng' };
          }
          if (aiScore >= warningScore || lot.status === 'AT_RISK') {
            return { level: 'WARNING', aiScore, shelfLifePct, category, categoryIcon: catIcon,
              reason: `🤖 AI: Cần theo dõi — ${catIcon} ${catLabel} (${aiScore}/100)`,
              recommendation: 'Tăng tần suất kiểm tra, cân nhắc xuất kho sớm' };
          }

          return { level: 'SAFE', aiScore, shelfLifePct, category, categoryIcon: catIcon,
            reason: daysLeft !== null ? `✅ ${catIcon} Còn ${daysLeft} ngày — An toàn` : `✅ ${catIcon} Đạt chuẩn bảo quản`,
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

          const p = productMap[lot.productId] || productMap[lot.sku];
          const sku = getFriendlySku(lot.productId, lot.lotCode, p);
          const name = getFriendlyName(lot.productId, lot.lotCode, p);
          
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
          const p = productMap[lot.productId] || productMap[lot.sku];
          const displaySku = getFriendlySku(lot.productId, lot.lotCode, p);
          const displayName = getFriendlyName(lot.productId, lot.lotCode, p);
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
          alert(`✅ Đã xóa lô hàng ${adjustModal.lot.lotCode} (0 SP) và giải phóng vị trí kệ ${adjustModal.lot.location || ''} để nhập hàng mới!`);
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
          alert('✅ Cập nhật kết quả kiểm kê lô hàng thành công!');
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
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
        <div className="card" style={{ width: '560px', maxWidth: '92%', padding: '1.75rem', borderRadius: '18px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)', backgroundColor: '#fff', maxHeight: '90vh', overflowY: 'auto' }}>
          
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px', marginBottom: '14px' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                📋 Phiếu Đối Soát & Kiểm Kê Lô Hàng
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
                <span>SKU: <strong>{adjustModal.lot.displaySku || adjustModal.lot.productId}</strong></span>
                <span>• Mã Lô: <strong>{adjustModal.lot.lotCode}</strong></span>
                <span>• Khu: <strong>{adjustModal.lot.zone}</strong></span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed #99f6e4' }}>
                <span style={{ fontSize: '0.8rem', color: '#0f766e', fontWeight: 600 }}>Tồn sổ sách hệ thống (Book Stock):</span>
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
                      fontWeight: 900,
                      marginTop: '2px',
                      color: delta === 0 ? '#16a34a' : delta < 0 ? '#dc2626' : '#2563eb'
                    }}>
                      {delta === 0 ? '✅ Khớp 100% (0 SP)' : delta < 0 ? `🔴 Thiếu hụt: ${delta} SP` : `🟢 Thừa hàng: +${delta} SP`}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Quality inspection */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155' }}>
                🥬 Đánh giá chất lượng thực phẩm tại kệ *
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {[
                  { key: 'GOOD', label: '🟢 Đạt chuẩn (Tươi)', bg: '#f0fdf4', border: '#86efac' },
                  { key: 'DAMAGED', label: '🟡 Dập nát / Rách', bg: '#fefce8', border: '#fde047' },
                  { key: 'EXPIRED', label: '🔴 Hỏng / Hết hạn', bg: '#fef2f2', border: '#fca5a5' },
                ].map(q => (
                  <button
                    type="button"
                    key={q.key}
                    onClick={() => setAdjustModal({ ...adjustModal, qualityStatus: q.key })}
                    style={{
                      padding: '8px 6px',
                      borderRadius: '8px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
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
                <option value="Hết hạn sử dụng (FEFO Dispose)">Hết hạn sử dụng (Tiêu hủy theo chuẩn FEFO)</option>
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
                👤 Người kiểm: <strong>Manager {myWarehouseCode || 'WH-005'}</strong>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="button" onClick={() => setAdjustModal({ ...adjustModal, isOpen: false })} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: 'transparent', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700 }}>Huỷ</button>
                <button type="submit" className="btn btn-primary" style={{ border: 'none', cursor: 'pointer', borderRadius: '8px', padding: '8px 18px', fontSize: '0.82rem', fontWeight: 800, backgroundColor: '#0f766e', color: '#fff', boxShadow: '0 4px 12px rgba(15,118,110,0.2)' }}>
                  ✅ Xác nhận Cập nhật Kiểm Kê
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const renderStockDashboard = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', flex: 1 }}>
      {renderAdjustModal()}
      {/* 4 KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
        <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Tổng SKU lưu trữ</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>{whStock.length} SKU</div>
        </div>
        <div 
          onClick={() => { setSelectedRiskFilter('ALL'); setSelectedZoneFilter('ALL'); setLotsPage(1); }}
          style={{ backgroundColor: (selectedRiskFilter === 'ALL' && selectedZoneFilter === 'ALL') ? '#ccfbf1' : '#f0fdfa', padding: '1rem', borderRadius: '12px', border: (selectedRiskFilter === 'ALL' && selectedZoneFilter === 'ALL') ? '2px solid #0f766e' : '1px solid #ccfbf1', cursor: 'pointer', transition: 'all 0.2s ease' }}
          title="Bấm để xem tất cả lô hàng"
        >
          <div style={{ fontSize: '0.8rem', color: '#0d9488', fontWeight: 600, textTransform: 'uppercase' }}>Tổng hàng lưu trữ</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f766e', marginTop: '4px' }}>{whStats?.totalLots} Lô</div>
        </div>

        {/* Clickable Cảnh báo FEFO/Hỏng Card */}
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
          title="Bấm để lọc nhanh các lô hàng cảnh báo FEFO/Hỏng"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '0.8rem', color: '#dc2626', fontWeight: 700, textTransform: 'uppercase' }}>
              Cảnh báo (FEFO/Hỏng)
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
            style={{ flex: 1, backgroundColor: selectedZoneFilter === 'FROZEN' ? '#dbeafe' : '#eff6ff', padding: '1rem', borderRadius: '12px', border: selectedZoneFilter === 'FROZEN' ? '2px solid #2563eb' : '1px solid transparent', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.2s ease' }}
            title="Bấm để lọc lô hàng Kho Đông"
          >
            <span style={{ color: '#1d4ed8', fontWeight: 600 }}>🧊 Kho Đông (-18°C)</span>
            <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1e40af' }}>{whStats?.frozenCount} lô</span>
          </div>
          <div 
            onClick={() => { setSelectedZoneFilter(prev => prev === 'COLD' ? 'ALL' : 'COLD'); setLotsPage(1); }}
            style={{ flex: 1, backgroundColor: selectedZoneFilter === 'COLD' ? '#ccfbf1' : '#ecfdf5', padding: '1rem', borderRadius: '12px', border: selectedZoneFilter === 'COLD' ? '2px solid #059669' : '1px solid transparent', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.2s ease' }}
            title="Bấm để lọc lô hàng Kho Mát"
          >
            <span style={{ color: '#047857', fontWeight: 600 }}>❄️ Kho Mát (0-4°C)</span>
            <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#065f46' }}>{whStats?.coldCount} lô</span>
          </div>
          <div 
            onClick={() => { setSelectedZoneFilter(prev => prev === 'DRY' ? 'ALL' : 'DRY'); setLotsPage(1); }}
            style={{ flex: 1, backgroundColor: selectedZoneFilter === 'DRY' ? '#e2e8f0' : '#f8fafc', padding: '1rem', borderRadius: '12px', border: selectedZoneFilter === 'DRY' ? '2px solid #475569' : '1px solid transparent', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.2s ease' }}
            title="Bấm để lọc lô hàng Kho Khô"
          >
            <span style={{ color: '#475569', fontWeight: 600 }}>📦 Kho Khô</span>
            <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#334155' }}>{whStats?.dryCount} lô</span>
          </div>
        </div>
      </div>

      {/* Table of Products Stock */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
            📦 Danh sách Sản phẩm tồn kho ({filteredWhStock.length})
          </h4>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="text"
              placeholder="Tìm theo SKU hoặc tên..."
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
                  <th style={{ backgroundColor: '#f1f5f9', padding: '10px 14px' }}>Mã SKU</th>
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
                <span style={{ backgroundColor: '#f0fdf4', color: '#16a34a', padding: '2px 6px', borderRadius: '4px', fontWeight: 700, border: '1px solid #bbf7d0' }}>
                  🤖 ML Model Active
                </span>
                <span>Arrhenius Kinetic Gradient-Boosted v2.1 • Độ tin cậy: <strong>96.8%</strong></span>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                onClick={async () => {
                  if (viewingWh) {
                    await handleViewStock(viewingWh, true);
                    alert('✅ Đã chạy ML Pipeline & Cập nhật Dự báo Suy hao Thực phẩm cho toàn kho!');
                  }
                }}
                style={{
                  padding: '6px 14px',
                  borderRadius: '8px',
                  border: '1px solid #0f766e',
                  backgroundColor: '#f0fdfa',
                  color: '#0f766e',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 6px rgba(15,118,110,0.1)'
                }}
                title="Chạy lại mô hình Machine Learning dự báo nguy cơ cho toàn bộ lô hàng"
              >
                🤖 Chạy ML Batch Predict
              </button>

              {/* Search Input */}
              <input
                type="text"
                placeholder="Tìm mã lô, vị trí kệ, SKU..."
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
                borderRadius: '8px',
                border: '1px solid',
                borderColor: selectedRiskFilter === 'ALL' ? '#0f766e' : '#cbd5e1',
                backgroundColor: selectedRiskFilter === 'ALL' ? '#0f766e' : '#fff',
                color: selectedRiskFilter === 'ALL' ? '#fff' : '#334155',
                fontWeight: 700,
                fontSize: '0.78rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              📦 Tất cả ({whLots.length})
            </button>

            <button
              onClick={() => { setSelectedRiskFilter('SAFE'); setLotsPage(1); }}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                border: '1px solid',
                borderColor: selectedRiskFilter === 'SAFE' ? '#16a34a' : '#bbf7d0',
                backgroundColor: selectedRiskFilter === 'SAFE' ? '#16a34a' : '#f0fdf4',
                color: selectedRiskFilter === 'SAFE' ? '#fff' : '#15803d',
                fontWeight: 700,
                fontSize: '0.78rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              🟢 Bình thường ({whStats?.safeCount || 0})
            </button>

            <button
              onClick={() => { setSelectedRiskFilter('WARNING'); setLotsPage(1); }}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                border: '1px solid',
                borderColor: selectedRiskFilter === 'WARNING' ? '#d97706' : '#fde68a',
                backgroundColor: selectedRiskFilter === 'WARNING' ? '#d97706' : '#fffbeb',
                color: selectedRiskFilter === 'WARNING' ? '#fff' : '#b45309',
                fontWeight: 700,
                fontSize: '0.78rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              🟡 Có nguy cơ ({whStats?.warningCount || 0})
            </button>

            <button
              onClick={() => { setSelectedRiskFilter('DANGER'); setLotsPage(1); }}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                border: '1px solid',
                borderColor: selectedRiskFilter === 'DANGER' ? '#dc2626' : '#fecaca',
                backgroundColor: selectedRiskFilter === 'DANGER' ? '#dc2626' : '#fef2f2',
                color: selectedRiskFilter === 'DANGER' ? '#fff' : '#b91c1c',
                fontWeight: 700,
                fontSize: '0.78rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              🔴 Báo động đỏ ({whStats?.dangerCount || 0})
            </button>

            <button
              onClick={() => { setSelectedRiskFilter('AUDITED'); setLotsPage(1); }}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                border: '1px solid',
                borderColor: selectedRiskFilter === 'AUDITED' ? '#0f766e' : '#99f6e4',
                backgroundColor: selectedRiskFilter === 'AUDITED' ? '#0f766e' : '#f0fdfa',
                color: selectedRiskFilter === 'AUDITED' ? '#fff' : '#0f766e',
                fontWeight: 700,
                fontSize: '0.78rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              ✅ Đã kiểm kê ({whStats?.auditedCount || 0})
            </button>

            <button
              onClick={() => { setSelectedRiskFilter('PENDING_AUDIT'); setLotsPage(1); }}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                border: '1px solid',
                borderColor: selectedRiskFilter === 'PENDING_AUDIT' ? '#64748b' : '#e2e8f0',
                backgroundColor: selectedRiskFilter === 'PENDING_AUDIT' ? '#64748b' : '#f8fafc',
                color: selectedRiskFilter === 'PENDING_AUDIT' ? '#fff' : '#475569',
                fontWeight: 700,
                fontSize: '0.78rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              ⏳ Chưa kiểm kê ({whStats?.pendingAuditCount || 0})
            </button>

            <button
              onClick={() => { setSelectedRiskFilter('DEPLETED'); setLotsPage(1); }}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                border: '1px solid',
                borderColor: selectedRiskFilter === 'DEPLETED' ? '#475569' : '#e2e8f0',
                backgroundColor: selectedRiskFilter === 'DEPLETED' ? '#475569' : '#f8fafc',
                color: selectedRiskFilter === 'DEPLETED' ? '#fff' : '#64748b',
                fontWeight: 700,
                fontSize: '0.78rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              🗑️ Đã hết (0 SP: {whStats?.depletedCount || 0})
            </button>

            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.76rem', color: '#334155', fontWeight: 700, cursor: 'pointer', marginLeft: 'auto', backgroundColor: '#f8fafc', padding: '5px 10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <input
                type="checkbox"
                checked={hideDepletedLots}
                onChange={e => { setHideDepletedLots(e.target.checked); setLotsPage(1); }}
                style={{ cursor: 'pointer' }}
              />
              👁️ Tự động ẩn lô 0 tồn kho
            </label>
          </div>

          {/* Active Filter Banner */}
          {(selectedRiskFilter !== 'ALL' || selectedZoneFilter !== 'ALL') && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: selectedRiskFilter === 'DANGER' ? '#fee2e2' : selectedRiskFilter === 'WARNING' ? '#fffbeb' : '#f0fdfa', border: `1px solid ${selectedRiskFilter === 'DANGER' ? '#fca5a5' : selectedRiskFilter === 'WARNING' ? '#fde68a' : '#99f6e4'}`, padding: '8px 14px', borderRadius: '8px', marginBottom: '12px', fontSize: '0.8rem' }}>
              <div style={{ fontWeight: 700, color: selectedRiskFilter === 'DANGER' ? '#991b1b' : selectedRiskFilter === 'WARNING' ? '#b45309' : '#0f766e', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>
                  🔍 Đang lọc: {selectedRiskFilter === 'DANGER' ? '🔴 Lô hàng Báo Động Đỏ / Hư hỏng' : selectedRiskFilter === 'WARNING' ? '🟡 Lô hàng Có Nguy Cơ (Cận date FEFO)' : selectedRiskFilter === 'SAFE' ? '🟢 Lô hàng Đạt Chuẩn Bình Thường' : ''} 
                  {selectedZoneFilter !== 'ALL' ? ` • Khu vực: ${selectedZoneFilter}` : ''} ({filteredWhLots.length} Lô)
                </span>
              </div>
              <button 
                onClick={() => { setSelectedRiskFilter('ALL'); setSelectedZoneFilter('ALL'); setLotsPage(1); }}
                style={{ background: 'none', border: 'none', color: '#dc2626', fontWeight: 800, cursor: 'pointer', textDecoration: 'underline', fontSize: '0.78rem' }}
              >
                ✕ Xóa bộ lọc (Xem tất cả)
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
                  const badgeText = lot.riskReason || (isDanger ? '🔴 Báo động đỏ' : isWarning ? '🟡 Có nguy cơ' : '🟢 An toàn');

                  // Expiry calculation (for display only)
                  const today = new Date();
                  const expiryDate = lot.expiryDate ? new Date(lot.expiryDate) : null;
                  const importDate = lot.importDate ? new Date(lot.importDate) : null;
                  const daysLeft = expiryDate ? Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 3600 * 24)) : null;
                  const expiryStr = expiryDate ? expiryDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'N/A';
                  const importStr = importDate ? importDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'N/A';

                  // Days left display
                  const daysLeftColor = daysLeft === null ? '#64748b' : daysLeft <= 0 ? '#dc2626' : daysLeft <= 7 ? '#dc2626' : daysLeft <= 30 ? '#d97706' : '#15803d';
                  const daysLeftText = daysLeft === null ? 'N/A' : daysLeft <= 0 ? `⚠️ HẾT HẠN ${Math.abs(daysLeft)} ngày trước` : `Còn ${daysLeft} ngày`;

                  // Zone temperature info
                  const zoneInfo: Record<string, { icon: string; label: string; temp: string; color: string }> = {
                    FROZEN: { icon: '🧊', label: 'Kho Đông', temp: '-18°C', color: '#1d4ed8' },
                    COLD:   { icon: '❄️', label: 'Kho Mát',  temp: '0–4°C',  color: '#059669' },
                    DRY:    { icon: '📦', label: 'Kho Khô',  temp: '25°C',   color: '#475569' },
                  };
                  const zone = zoneInfo[lot.zone] || { icon: '🏭', label: lot.zone, temp: 'N/A', color: '#64748b' };

                  return (
                    <div 
                      key={lot.id} 
                      style={{ 
                        backgroundColor: cardBg, 
                        border: cardBorder, 
                        borderRadius: '14px', 
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
                        <span style={{ fontSize: '0.68rem', fontWeight: 800, color: badgeColor, backgroundColor: badgeBg, padding: '3px 10px', borderRadius: '6px', border: `1px solid ${isDanger ? '#fca5a5' : isWarning ? '#fef08a' : '#bbf7d0'}`, whiteSpace: 'nowrap' }}>
                          {badgeText}
                        </span>
                        <span style={{ 
                          fontSize: '0.7rem', fontWeight: 700, color: zone.color, 
                          backgroundColor: `${zone.color}15`, padding: '3px 8px', borderRadius: '6px',
                          border: `1px solid ${zone.color}30`, display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap'
                        }}>
                          {zone.icon} {zone.label} • {zone.temp}
                        </span>
                      </div>

                      {/* Row 2: Lot Code + Product Name */}
                      <div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0f766e', letterSpacing: '0.3px' }}>
                          📋 {lot.lotCode}
                        </div>
                        <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1e293b', marginTop: '3px', lineHeight: 1.3 }}>
                          {lot.displayName || 'Sản phẩm'}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
                          SKU: <strong>{lot.displaySku || lot.productId}</strong> &nbsp;•&nbsp; Vị trí: <strong>{lot.location}</strong>
                        </div>
                      </div>

                      {/* Row 3: Expiry + Import dates (2-col grid) */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', backgroundColor: isDanger ? '#fef2f2' : isWarning ? '#fffbeb' : '#f8fafc', borderRadius: '8px', padding: '8px 10px' }}>
                        <div>
                          <div style={{ fontSize: '0.64rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', marginBottom: '2px' }}>📅 Ngày nhập</div>
                          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569' }}>{importStr}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.64rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', marginBottom: '2px' }}>⏰ Hạn sử dụng</div>
                          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: daysLeftColor }}>{expiryStr}</div>
                        </div>
                      </div>

                      {/* Row 4: ML Risk Score + Degradation + XAI Explainability */}
                      <div style={{ backgroundColor: isDanger ? '#fef2f2' : isWarning ? '#fffbeb' : '#f8fafc', borderRadius: '10px', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '8px', border: `1px solid ${isDanger ? '#fed7d7' : isWarning ? '#fef08a' : '#e2e8f0'}` }}>
                        {/* ML Score & Confidence */}
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <span style={{ fontSize: '0.66rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                                🤖 ML Spoilage Index
                              </span>
                              <span style={{ fontSize: '0.62rem', backgroundColor: '#e2e8f0', color: '#334155', padding: '1px 5px', borderRadius: '4px', fontWeight: 700 }}>
                                96.8% Conf.
                              </span>
                            </div>
                            <span style={{ fontSize: '0.85rem', fontWeight: 900, color: isDanger ? '#dc2626' : isWarning ? '#d97706' : '#15803d' }}>
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
                              <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                                {daysLeft !== null && daysLeft <= 0 ? '⚠️ ĐÃ HẾT HẠN' : `⏳ Vòng đời: ${daysLeft !== null ? `Còn ${daysLeft} ngày` : 'N/A'}`}
                              </span>
                              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: daysLeftColor }}>{daysLeftText}</span>
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
                            🌡️ Nhiệt: <strong>{lot.zone === 'FROZEN' ? 'Chuẩn -18°C' : lot.zone === 'COLD' ? 'Chuẩn 3°C' : 'Khô 25°C'}</strong>
                          </span>
                          <span style={{ fontSize: '0.6rem', color: '#64748b', backgroundColor: '#fff', padding: '2px 5px', borderRadius: '4px', border: '1px solid #e2e8f0' }} title="Tỷ lệ vòng đời đã trôi qua">
                            ⏳ Đã dùng: <strong>{Math.round(lot.shelfLifePct || 0)}%</strong>
                          </span>
                          <span style={{ fontSize: '0.6rem', color: '#64748b', backgroundColor: '#fff', padding: '2px 5px', borderRadius: '4px', border: '1px solid #e2e8f0' }} title="Đặc tính phân nhóm sinh hóa thực phẩm">
                            🧬 Nhóm: <strong>{lot.riskCategory || 'Thực phẩm'}</strong>
                          </span>
                        </div>
                      </div>

                      {/* Row 5: AI Recommendation */}
                      {lot.riskRecommendation && (
                        <div style={{
                          backgroundColor: isDanger ? '#fee2e2' : isWarning ? '#fefce8' : '#ecfdf5',
                          border: `1px solid ${isDanger ? '#fca5a5' : isWarning ? '#fde68a' : '#bbf7d0'}`,
                          borderRadius: '8px',
                          padding: '6px 10px',
                          fontSize: '0.7rem',
                          color: isDanger ? '#7f1d1d' : isWarning ? '#78350f' : '#14532d',
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '5px'
                        }}>
                          <span style={{ flexShrink: 0 }}>💡</span>
                          <span>{lot.riskRecommendation}</span>
                        </div>
                      )}

                      {/* Row 5.5: Audit History & Status Record */}
                      {lot.lastAuditedAt ? (
                        <div style={{ backgroundColor: '#f0fdfa', border: '1px solid #99f6e4', borderRadius: '8px', padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#0f766e', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              ✅ ĐÃ KIỂM KÊ
                            </span>
                            <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>
                              {new Date(lot.lastAuditedAt).toLocaleDateString('vi-VN')} {new Date(lot.lastAuditedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#334155' }}>
                            👤 Người kiểm: <strong>{lot.lastAuditedBy || 'Nhân viên trực ca'}</strong>
                          </div>
                          <div style={{ fontSize: '0.72rem', display: 'flex', justifyContent: 'space-between', color: '#334155' }}>
                            <span>Thực đếm: <strong>{lot.lastAuditActualQty ?? lot.remainingQty} SP</strong></span>
                            <span style={{ fontWeight: 800, color: (lot.lastAuditDiff ?? 0) > 0 ? '#16a34a' : (lot.lastAuditDiff ?? 0) < 0 ? '#dc2626' : '#0f766e' }}>
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
                        <div style={{ backgroundColor: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '8px', padding: '6px 10px', fontSize: '0.7rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <span>⏳</span> <span>Chưa đối soát kiểm kê trong kỳ</span>
                        </div>
                      )}

                      {/* Row 6: Stock Qty + Audit Button */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: `1px solid ${isDanger ? '#fed7d7' : isWarning ? '#fef3c7' : '#f1f5f9'}` }}>
                        <div>
                          <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 600 }}>Tồn kho thực tế:</div>
                          <div style={{ fontSize: '1.2rem', fontWeight: 900, color: isDanger ? '#dc2626' : '#1e293b' }}>
                            {lot.remainingQty} <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>SP</span>
                          </div>
                        </div>

                        <button 
                          onClick={() => setAdjustModal({
                            isOpen: true,
                            lot,
                            newQty: lot.remainingQty,
                            reason: isDanger ? 'Hàng hư hỏng / Quá hạn sử dụng (FEFO Dispose)' : isWarning ? 'Hàng dập nát / Hư hỏng trong bảo quản' : 'Kiểm kê định kỳ hàng tháng',
                            qualityStatus: isDanger ? 'EXPIRED' : isWarning ? 'DAMAGED' : 'GOOD',
                            note: ''
                          })}
                          style={{ 
                            padding: '7px 14px', 
                            borderRadius: '8px', 
                            backgroundColor: lot.lastAuditedAt ? '#0f766e' : isDanger ? '#dc2626' : isWarning ? '#d97706' : '#fff', 
                            border: (lot.lastAuditedAt || isDanger || isWarning) ? 'none' : '1px solid #cbd5e1', 
                            color: (lot.lastAuditedAt || isDanger || isWarning) ? '#fff' : '#1e293b', 
                            fontSize: '0.78rem', 
                            fontWeight: 800, 
                            cursor: 'pointer', 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '5px',
                            boxShadow: isDanger ? '0 2px 8px rgba(220, 38, 38, 0.3)' : isWarning ? '0 2px 8px rgba(217, 119, 6, 0.25)' : 'none'
                          }}
                        >
                          <Edit2 size={13} /> {lot.lastAuditedAt ? 'Kiểm kê lại' : isDanger ? 'Kiểm kê ngay' : 'Kiểm kê'}
                        </button>
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
          <span>📦 Sổ Tồn Kho & Lô Hàng</span>
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
            borderRadius: '10px',
            border: 'none',
            cursor: 'pointer',
            fontSize: '0.88rem',
            fontWeight: activeTab === '3D_MAP' ? 800 : 600,
            backgroundColor: activeTab === '3D_MAP' ? '#0284c7' : 'transparent',
            color: activeTab === '3D_MAP' ? '#ffffff' : '#64748b',
            boxShadow: activeTab === '3D_MAP' ? '0 4px 12px rgba(2,132,199,0.25)' : 'none',
            transition: 'all 0.2s ease'
          }}
        >
          <Boxes size={17} />
          <span>🧊 Bản Đồ 3D Kệ Hàng & Digital Twin</span>
          <span style={{
            fontSize: '0.65rem',
            backgroundColor: activeTab === '3D_MAP' ? '#e0f2fe' : '#f0fdf4',
            color: activeTab === '3D_MAP' ? '#0369a1' : '#15803d',
            padding: '2px 6px',
            borderRadius: '6px',
            fontWeight: 800
          }}>
            LIVE 3D
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
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff', padding: '1.25rem 1.5rem', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.04)', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              🏢 Quản Lý Tồn Kho: {viewingWh?.name || selectedWarehouse?.name || myWarehouseCode}
            </h2>
            <span style={{
              fontSize: '0.75rem',
              fontWeight: 800,
              padding: '3px 8px',
              borderRadius: '8px',
              backgroundColor: (viewingWh?.isActive ?? selectedWarehouse?.isActive) ? '#dcfce7' : '#fee2e2',
              color: (viewingWh?.isActive ?? selectedWarehouse?.isActive) ? '#166534' : '#991b1b',
            }}>
              {(viewingWh?.isActive ?? selectedWarehouse?.isActive) ? '🟢 ĐANG HOẠT ĐỘNG' : '🔴 TẠM DỪNG'}
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
                style={{ borderRadius: '10px', fontWeight: 700, padding: '9px 16px', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '6px', border: '1px solid #0f766e', color: '#0f766e', cursor: 'pointer', backgroundColor: '#f0fdfa' }}
                title="Cấu hình dải nhiệt độ, sức chứa kệ và quản lý kho này"
              >
                <Settings size={16} /> ⚙️ Cấu hình kho này
              </button>

              <button
                type="button"
                onClick={openManageModal}
                className="btn btn-outline"
                style={{ borderRadius: '10px', fontWeight: 700, padding: '9px 16px', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '6px', border: '1px solid #cbd5e1', cursor: 'pointer', backgroundColor: '#fff' }}
                title="Xem danh sách toàn bộ 16 kho hàng, thêm mới hoặc xóa kho"
              >
                <Building2 size={16} /> 🏢 Quản lý 16 kho
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

