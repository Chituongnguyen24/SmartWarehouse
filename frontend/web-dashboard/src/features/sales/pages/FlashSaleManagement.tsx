import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Zap, 
  Search, 
  Plus, 
  Trash2, 
  Edit3, 
  RefreshCw, 
  AlertCircle, 
  AlertTriangle,
  CheckCircle2, 
  Tag, 
  TrendingDown, 
  Layers, 
  Clock,
  X, 
  PackageCheck, 
  ChevronLeft, 
  ChevronRight, 
  Check,
  Building2,
  DollarSign,
  ShieldAlert,
  Percent,
  SlidersHorizontal,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '@/features/auth';
import { useWarehouse } from '@/shared';
import { getApiHost } from '@/shared/utils/apiConfig';

const PRODUCT_API = getApiHost(3010);
const INVENTORY_API = getApiHost(3011);

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  storageType: string;
  unit: string;
  price: number;
  originalPrice?: number;
  imageUrl?: string;
  isFlashSale?: boolean;
  discountPercent?: number;
  soldCount?: number;
  stock?: number;
}

export interface FlashSaleSuggestion {
  productId: string;
  sku: string;
  productName: string;
  category: string;
  imageUrl?: string;
  unit: string;
  originalPrice: number;
  currentPrice: number;
  isAlreadyFlashSale: boolean;
  currentDiscountPercent: number;
  warehouseCode: string;

  totalStock: number;
  nearExpiryStock: number;
  lotCode: string;
  earliestExpiryDate: string;
  daysRemaining: number;
  spoilageRiskScore: number;

  urgencyTier: 'CRITICAL' | 'HIGH_RISK' | 'OVERSTOCK' | 'MONITOR';
  suggestedDiscountPercent: number;
  suggestedFlashSalePrice: number;
  suggestedQuota: number;
  estimatedRevenueSaved: number;
  recommendationReason: string;
}

interface SuggestionStats {
  totalSuggestions: number;
  criticalCount: number;
  highRiskCount: number;
  overstockCount: number;
  totalPotentialLossAtRisk: number;
}

export default function FlashSaleManagement() {
  const { token, user } = useAuth();
  const { warehouses } = useWarehouse();
  const isSaler = user?.role === 'SALES_STAFF';

  // Navigation tab
  const [activeTab, setActiveTab] = useState<'SUGGESTIONS' | 'ACTIVE_FLASH_SALES'>('SUGGESTIONS');

  // Active Flash Sales State
  const [products, setProducts] = useState<Product[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loadingActive, setLoadingActive] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  // Suggestions State
  const [suggestions, setSuggestions] = useState<FlashSaleSuggestion[]>([]);
  const [suggestionStats, setSuggestionStats] = useState<SuggestionStats>({
    totalSuggestions: 0,
    criticalCount: 0,
    highRiskCount: 0,
    overstockCount: 0,
    totalPotentialLossAtRisk: 0,
  });
  const [loadingSuggestions, setLoadingSuggestions] = useState<boolean>(false);
  const [tierFilter, setTierFilter] = useState<'ALL' | 'CRITICAL' | 'HIGH_RISK' | 'OVERSTOCK'>('ALL');
  const [warehouseFilter, setWarehouseFilter] = useState<string>('ALL');
  const [suggestionSearch, setSuggestionSearch] = useState<string>('');

  // Batch Selection State
  const [selectedSuggestionSkus, setSelectedSuggestionSkus] = useState<Set<string>>(new Set());
  const [batchLoading, setBatchLoading] = useState<boolean>(false);

  // Modals state
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Quick Apply Modal from Suggestions
  const [quickApplyModalSuggestion, setQuickApplyModalSuggestion] = useState<FlashSaleSuggestion | null>(null);
  const [applyForm, setApplyForm] = useState({
    discountPercent: 30,
    flashSalePrice: 0,
    quota: 50,
  });

  // Manual Form state
  const [formData, setFormData] = useState({
    productId: '',
    discountPercent: 20,
    flashSalePrice: 0,
    quota: 50,
  });
  const [modalSearchTerm, setModalSearchTerm] = useState<string>('');
  const [isChangingProduct, setIsChangingProduct] = useState<boolean>(false);

  // Notification Toast
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showNotify = useCallback((type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  }, []);

  // Pagination State for Active Flash Sales
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10;

  // Pagination State for Suggestions
  const [suggestionPage, setSuggestionPage] = useState<number>(1);
  const suggestionItemsPerPage = 10;

  // ── 1. Fetch Suggestions from inventory-service ──
  const fetchSuggestions = useCallback(async (whCode: string = warehouseFilter) => {
    setLoadingSuggestions(true);
    try {
      const url = `${INVENTORY_API}/inventory/flashsale-suggestions${whCode && whCode !== 'ALL' ? `?warehouseCode=${encodeURIComponent(whCode)}` : ''}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setSuggestions(data.suggestions || []);
        setSuggestionStats({
          totalSuggestions: data.totalSuggestions || 0,
          criticalCount: data.criticalCount || 0,
          highRiskCount: data.highRiskCount || 0,
          overstockCount: data.overstockCount || 0,
          totalPotentialLossAtRisk: data.totalPotentialLossAtRisk || 0,
        });
      } else {
        console.warn('Không thể nạp gợi ý Flash Sale từ inventory-service');
      }
    } catch (err) {
      console.error('Lỗi kết nối gợi ý xả kho:', err);
    } finally {
      setLoadingSuggestions(false);
    }
  }, [warehouseFilter]);

  // ── 2. Fetch Active Flash Sales from product-service ──
  const loadActiveProducts = useCallback(async () => {
    setLoadingActive(true);
    try {
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${PRODUCT_API}/products?limit=500`, { headers });
      if (res.ok) {
        const data = await res.json();
        const list: Product[] = data.items || data.data || (Array.isArray(data) ? data : []);
        setAllProducts(list);
        const flashList = list.filter((p: Product) => p.isFlashSale);
        setProducts(flashList);
      }
    } catch (err) {
      console.error('Lỗi nạp dữ liệu Flash Sale:', err);
      showNotify('error', 'Không thể kết nối đến máy chủ quản lý sản phẩm.');
    } finally {
      setLoadingActive(false);
    }
  }, [token, showNotify]);

  useEffect(() => {
    fetchSuggestions(warehouseFilter);
    loadActiveProducts();
  }, [fetchSuggestions, loadActiveProducts, warehouseFilter]);

  // Filter Active Flash Sale Products
  const filteredActiveProducts = useMemo(() => {
    return products.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.sku.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCat = categoryFilter === 'ALL' || p.category === categoryFilter;
      return matchSearch && matchCat;
    });
  }, [products, searchTerm, categoryFilter]);

  // Filter Suggestions
  const filteredSuggestions = useMemo(() => {
    return suggestions.filter(s => {
      // Mặc định: Loại bỏ các sản phẩm đã và đang mở Flash Sale khỏi danh sách gợi ý để tránh trùng lặp
      if (s.isAlreadyFlashSale) return false;
      const matchSearch = s.productName.toLowerCase().includes(suggestionSearch.toLowerCase()) ||
                          s.sku.toLowerCase().includes(suggestionSearch.toLowerCase()) ||
                          s.lotCode.toLowerCase().includes(suggestionSearch.toLowerCase());
      const matchTier = tierFilter === 'ALL' || s.urgencyTier === tierFilter;
      return matchSearch && matchTier;
    });
  }, [suggestions, suggestionSearch, tierFilter]);

  // Pagination for Active
  const totalActivePages = Math.max(1, Math.ceil(filteredActiveProducts.length / itemsPerPage));
  const paginatedActiveProducts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredActiveProducts.slice(start, start + itemsPerPage);
  }, [filteredActiveProducts, currentPage, itemsPerPage]);

  // Pagination for Suggestions
  const totalSuggestionPages = Math.max(1, Math.ceil(filteredSuggestions.length / suggestionItemsPerPage));
  const paginatedSuggestions = useMemo(() => {
    const start = (suggestionPage - 1) * suggestionItemsPerPage;
    return filteredSuggestions.slice(start, start + suggestionItemsPerPage);
  }, [filteredSuggestions, suggestionPage, suggestionItemsPerPage]);

  // Unique categories
  const categories = useMemo(() => {
    return Array.from(new Set(allProducts.map(p => p.category).filter(Boolean)));
  }, [allProducts]);

  // ── 3. Quick Apply Flash Sale from Suggestion ──
  const handleOpenQuickApply = (suggestion: FlashSaleSuggestion) => {
    setQuickApplyModalSuggestion(suggestion);
    setApplyForm({
      discountPercent: suggestion.suggestedDiscountPercent,
      flashSalePrice: suggestion.suggestedFlashSalePrice,
      quota: suggestion.suggestedQuota,
    });
  };

  const handleApplyFormDiscountChange = (disc: number) => {
    if (!quickApplyModalSuggestion) return;
    const orig = quickApplyModalSuggestion.originalPrice;
    const price = Math.round(orig * (1 - disc / 100));
    setApplyForm(prev => ({
      ...prev,
      discountPercent: disc,
      flashSalePrice: price,
    }));
  };

  const handleApplyFormPriceChange = (price: number) => {
    if (!quickApplyModalSuggestion) return;
    const orig = quickApplyModalSuggestion.originalPrice;
    const disc = orig > 0 ? Math.round(((orig - price) / orig) * 100) : 0;
    setApplyForm(prev => ({
      ...prev,
      discountPercent: disc,
      flashSalePrice: price,
    }));
  };

  const handleConfirmQuickApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickApplyModalSuggestion) return;

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const targetId = quickApplyModalSuggestion.productId || quickApplyModalSuggestion.sku;
      const payload = {
        sku: quickApplyModalSuggestion.sku,
        name: quickApplyModalSuggestion.productName,
        category: quickApplyModalSuggestion.category,
        isFlashSale: true,
        originalPrice: quickApplyModalSuggestion.originalPrice,
        price: applyForm.flashSalePrice,
        discountPercent: applyForm.discountPercent,
      };

      const res = await fetch(`${PRODUCT_API}/products/${targetId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        showNotify('success', `Đã kích hoạt Flash Sale cho "${quickApplyModalSuggestion.productName}" (-${applyForm.discountPercent}%) thành công!`);
        
        const appliedSku = quickApplyModalSuggestion.sku;
        const appliedPid = quickApplyModalSuggestion.productId;

        // 1. Cập nhật tức thì: Loại bỏ ngay khỏi danh sách Gợi ý
        setSuggestions(prev => prev.filter(s => s.sku !== appliedSku && s.productId !== appliedPid));
        
        // 2. Thêm ngay vào danh sách Sản phẩm đang sale
        const newActiveItem: Product = {
          id: quickApplyModalSuggestion.productId,
          sku: quickApplyModalSuggestion.sku,
          name: quickApplyModalSuggestion.productName,
          category: quickApplyModalSuggestion.category,
          price: applyForm.flashSalePrice,
          originalPrice: quickApplyModalSuggestion.originalPrice,
          isFlashSale: true,
          discountPercent: applyForm.discountPercent,
          unit: quickApplyModalSuggestion.unit,
          stock: quickApplyModalSuggestion.totalStock,
          imageUrl: quickApplyModalSuggestion.imageUrl,
        } as any;

        setProducts(prev => {
          const filtered = prev.filter(p => p.sku !== appliedSku && p.id !== appliedPid);
          return [newActiveItem, ...filtered];
        });

        // 3. Đóng modal (giữ nguyên tab Gợi ý để người dùng tiếp tục thao tác)
        setQuickApplyModalSuggestion(null);

        // 4. Đồng bộ nền với máy chủ
        loadActiveProducts();
        fetchSuggestions(warehouseFilter);
      } else {
        const err = await res.json().catch(() => ({}));
        showNotify('error', err.message || 'Không thể kích hoạt Flash Sale.');
      }
    } catch (err: any) {
      console.error('[FlashSaleManagement] Apply error:', err);
      showNotify('error', err?.message ? `Lỗi kết nối (${err.message}). Vui lòng thử lại.` : 'Lỗi kết nối khi gửi yêu cầu kích hoạt Flash Sale.');
    }
  };

  // ── 4. Batch Apply Selected Suggestions ──
  const toggleSelectAllSuggestions = () => {
    const selectable = paginatedSuggestions.filter(s => !s.isAlreadyFlashSale);
    if (selectable.length > 0 && selectedSuggestionSkus.size === selectable.length) {
      setSelectedSuggestionSkus(new Set());
    } else {
      const next = new Set<string>();
      selectable.forEach(s => next.add(s.sku));
      setSelectedSuggestionSkus(next);
    }
  };

  const toggleSelectSuggestion = (sku: string) => {
    setSelectedSuggestionSkus(prev => {
      const next = new Set(prev);
      if (next.has(sku)) next.delete(sku);
      else next.add(sku);
      return next;
    });
  };

  const handleBatchActivate = async () => {
    if (selectedSuggestionSkus.size === 0) return;
    const confirmed = window.confirm(
      `Xác nhận kích hoạt Flash Sale đồng loạt cho ${selectedSuggestionSkus.size} sản phẩm theo mức chiết khấu khuyến nghị? Giá mới sẽ được áp dụng trực tiếp lên ứng dụng khách hàng.`
    );
    if (!confirmed) return;

    setBatchLoading(true);
    try {
      const selectedItems = suggestions
        .filter(s => selectedSuggestionSkus.has(s.sku))
        .map(s => ({
          productId: s.productId,
          price: s.suggestedFlashSalePrice,
          originalPrice: s.originalPrice,
          discountPercent: s.suggestedDiscountPercent,
          isFlashSale: true,
        }));

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${PRODUCT_API}/products/batch-flash-sale`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ items: selectedItems }),
      });

      if (res.ok) {
        const data = await res.json();
        showNotify('success', `Đã kích hoạt Flash Sale đồng loạt cho ${data.successCount || selectedItems.length} sản phẩm thành công!`);
        
        // 1. Cập nhật tức thì: Loại bỏ các SKU đã chọn khỏi gợi ý (giữ nguyên tab Gợi ý)
        setSuggestions(prev => prev.filter(s => !selectedSuggestionSkus.has(s.sku)));
        setSelectedSuggestionSkus(new Set());

        // 2. Đồng bộ nền
        loadActiveProducts();
        fetchSuggestions(warehouseFilter);
      } else {
        showNotify('error', 'Không thể kích hoạt Flash Sale hàng loạt.');
      }
    } catch (err) {
      showNotify('error', 'Lỗi kết nối khi kích hoạt Flash Sale hàng loạt.');
    } finally {
      setBatchLoading(false);
    }
  };

  // ── 5. Remove Product from Flash Sale ──
  const handleRemoveFlashSale = async (product: Product) => {
    if (!window.confirm(`Xác nhận dừng Flash Sale cho "${product.name}"? Giá bán sẽ được phục hồi về giá gốc tiêu chuẩn.`)) {
      return;
    }

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const origPrice = product.originalPrice || product.price;
      const payload = {
        isFlashSale: false,
        price: origPrice,
        discountPercent: 0,
      };

      const res = await fetch(`${PRODUCT_API}/products/${product.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        showNotify('success', `Đã kết thúc Flash Sale cho "${product.name}". Giá đã phục hồi về giá niêm yết.`);
        // Cập nhật tức thì: Loại bỏ ngay khỏi danh sách đang sale
        setProducts(prev => prev.filter(p => p.id !== product.id && p.sku !== product.sku));
        loadActiveProducts();
        fetchSuggestions(warehouseFilter);
      } else {
        showNotify('error', 'Không thể cập nhật trạng thái sản phẩm.');
      }
    } catch (err) {
      showNotify('error', 'Lỗi kết nối khi gỡ Flash Sale.');
    }
  };

  // ── 6. Manual Add / Edit Flash Sale ──
  const handleSelectProductToSale = (prodId: string) => {
    const prod = allProducts.find(p => p.id === prodId);
    if (prod) {
      const orig = prod.originalPrice || prod.price;
      const disc = 20;
      const salePrice = Math.round(orig * (1 - disc / 100));
      setFormData({
        productId: prod.id,
        discountPercent: disc,
        flashSalePrice: salePrice,
        quota: 50,
      });
    }
  };

  const handleManualDiscountChange = (disc: number) => {
    const prod = allProducts.find(p => p.id === formData.productId) || selectedProduct;
    if (prod) {
      const orig = prod.originalPrice || prod.price;
      const salePrice = Math.round(orig * (1 - disc / 100));
      setFormData(prev => ({
        ...prev,
        discountPercent: disc,
        flashSalePrice: salePrice,
      }));
    }
  };

  const handleManualPriceChange = (price: number) => {
    const prod = allProducts.find(p => p.id === formData.productId) || selectedProduct;
    if (prod) {
      const orig = prod.originalPrice || prod.price;
      const disc = orig > 0 ? Math.round(((orig - price) / orig) * 100) : 0;
      setFormData(prev => ({
        ...prev,
        discountPercent: disc,
        flashSalePrice: price,
      }));
    }
  };

  const handleSaveManualFlashSale = async (e: React.FormEvent) => {
    e.preventDefault();
    const prod = allProducts.find(p => p.id === formData.productId) || selectedProduct;
    if (!prod) {
      showNotify('error', 'Vui lòng chọn sản phẩm áp dụng Flash Sale!');
      return;
    }

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const origPrice = prod.originalPrice || prod.price;
      const payload = {
        isFlashSale: true,
        originalPrice: origPrice,
        price: formData.flashSalePrice,
        discountPercent: formData.discountPercent,
      };

      const res = await fetch(`${PRODUCT_API}/products/${prod.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        showNotify('success', `Đã lưu Flash Sale cho sản phẩm "${prod.name}" thành công!`);
        setShowAddModal(false);
        setShowEditModal(false);

        // Cập nhật tức thì
        setSuggestions(prev => prev.filter(s => s.sku !== prod.sku && s.productId !== prod.id));
        setActiveTab('ACTIVE_FLASH_SALES');

        loadActiveProducts();
        fetchSuggestions(warehouseFilter);
      } else {
        const err = await res.json().catch(() => ({}));
        showNotify('error', err.message || 'Không thể lưu Flash Sale.');
      }
    } catch (err) {
      showNotify('error', 'Lỗi khi gửi yêu cầu lên máy chủ.');
    }
  };

  const handleOpenEdit = (prod: Product) => {
    setSelectedProduct(prod);
    setFormData({
      productId: prod.id,
      discountPercent: prod.discountPercent || 0,
      flashSalePrice: prod.price,
      quota: 50,
    });
    setShowEditModal(true);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', color: '#0f172a', paddingBottom: '30px' }}>
      
      {/* Toast Notification */}
      {notification && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          zIndex: 9999,
          padding: '12px 18px',
          borderRadius: '8px',
          boxShadow: '0 4px 14px rgba(0,0,0,0.1)',
          fontSize: '13px',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: notification.type === 'success' ? '#f0fdf4' : '#fef2f2',
          color: notification.type === 'success' ? '#166534' : '#991b1b',
          border: `1px solid ${notification.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
        }}>
          {notification.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{notification.message}</span>
          <button onClick={() => setNotification(null)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', marginLeft: '6px', color: '#64748b' }}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Executive Header ── */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '10px',
        padding: '18px 24px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '8px',
            backgroundColor: '#fffbeb',
            border: '1px solid #fde68a',
            color: '#b45309',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Zap size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                fontSize: '10px',
                fontWeight: 700,
                textTransform: 'uppercase',
                padding: '2px 8px',
                borderRadius: '999px',
                backgroundColor: '#fef3c7',
                color: '#92400e',
                letterSpacing: '0.4px',
              }}>
                QUẢN LÝ KHUYẾN MÃI XẢ KHO
              </span>
              <span style={{ fontSize: '11px', color: '#0369a1', fontWeight: 600, backgroundColor: '#f0f9ff', padding: '2px 8px', borderRadius: '6px', border: '1px solid #bae6fd' }}>
                {isSaler ? 'Toàn Mạng Lưới Kho' : (warehouseFilter === 'ALL' ? 'Tất Cả Các Kho' : `Kho ${warehouseFilter}`)}
              </span>
            </div>
            <h1 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: '3px 0 0 0' }}>
              Flash Sale & Thanh Lý Hàng Tồn
            </h1>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={() => {
              fetchSuggestions(warehouseFilter);
              loadActiveProducts();
            }}
            disabled={loadingSuggestions || loadingActive}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 500,
              backgroundColor: '#ffffff',
              border: '1px solid #cbd5e1',
              color: '#334155',
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={14} className={(loadingSuggestions || loadingActive) ? 'animate-spin' : ''} />
            <span>Làm mới</span>
          </button>

          <button
            onClick={() => {
              setFormData({ productId: '', discountPercent: 20, flashSalePrice: 0, quota: 50 });
              setModalSearchTerm('');
              setIsChangingProduct(false);
              setShowAddModal(true);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 600,
              backgroundColor: '#0f766e',
              border: 'none',
              color: '#ffffff',
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            }}
          >
            <Plus size={15} />
            <span>Thêm Sản Phẩm Flash Sale</span>
          </button>
        </div>
      </div>

      {/* ── KPI Metrics Strip ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
        
        {/* Metric 1: Capital at Risk */}
        <div style={{ backgroundColor: '#ffffff', padding: '14px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Giá Trị Hàng Cận Hạn</span>
            <span style={{ padding: '4px', borderRadius: '6px', backgroundColor: '#fef2f2', color: '#dc2626' }}>
              <ShieldAlert size={16} />
            </span>
          </div>
          <div style={{ marginTop: '6px', fontSize: '18px', fontWeight: 700, color: '#991b1b', fontVariantNumeric: 'tabular-nums' }}>
            {suggestionStats.totalPotentialLossAtRisk.toLocaleString('vi-VN')}đ
          </div>
        </div>

        {/* Metric 2: Critical Expiring Lots */}
        <div style={{ backgroundColor: '#ffffff', padding: '14px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Cận Hạn (&le; 5 Ngày)</span>
            <span style={{ padding: '4px', borderRadius: '6px', backgroundColor: '#fef2f2', color: '#dc2626' }}>
              <AlertTriangle size={16} />
            </span>
          </div>
          <div style={{ marginTop: '6px', fontSize: '18px', fontWeight: 700, color: '#dc2626', fontVariantNumeric: 'tabular-nums' }}>
            {suggestionStats.criticalCount} <span style={{ fontSize: '12px', fontWeight: 500, color: '#64748b' }}>mặt hàng</span>
          </div>
        </div>

        {/* Metric 3: Early Warning (6-12 Days) */}
        <div style={{ backgroundColor: '#ffffff', padding: '14px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Theo Dõi (6 - 12 Ngày)</span>
            <span style={{ padding: '4px', borderRadius: '6px', backgroundColor: '#fffbeb', color: '#d97706' }}>
              <Clock size={16} />
            </span>
          </div>
          <div style={{ marginTop: '6px', fontSize: '18px', fontWeight: 700, color: '#b45309', fontVariantNumeric: 'tabular-nums' }}>
            {suggestionStats.highRiskCount} <span style={{ fontSize: '12px', fontWeight: 500, color: '#64748b' }}>mặt hàng</span>
          </div>
        </div>

        {/* Metric 4: Overstock & Slow-moving */}
        <div style={{ backgroundColor: '#ffffff', padding: '14px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Tồn Ứ Đọng (&gt; 150 SP)</span>
            <span style={{ padding: '4px', borderRadius: '6px', backgroundColor: '#f0f9ff', color: '#0284c7' }}>
              <Layers size={16} />
            </span>
          </div>
          <div style={{ marginTop: '6px', fontSize: '18px', fontWeight: 700, color: '#0369a1', fontVariantNumeric: 'tabular-nums' }}>
            {suggestionStats.overstockCount} <span style={{ fontSize: '12px', fontWeight: 500, color: '#64748b' }}>mặt hàng</span>
          </div>
        </div>

        {/* Metric 5: Active Flash Sale Products */}
        <div style={{ backgroundColor: '#ffffff', padding: '14px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Đang Mở Bán</span>
            <span style={{ padding: '4px', borderRadius: '6px', backgroundColor: '#f0fdf4', color: '#166534' }}>
              <Zap size={16} />
            </span>
          </div>
          <div style={{ marginTop: '6px', fontSize: '18px', fontWeight: 700, color: '#15803d', fontVariantNumeric: 'tabular-nums' }}>
            {products.length} <span style={{ fontSize: '12px', fontWeight: 500, color: '#64748b' }}>sản phẩm</span>
          </div>
        </div>
      </div>

      {/* ── Main Tab Navigation Strip ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #cbd5e1', paddingBottom: '1px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          
          <button
            onClick={() => setActiveTab('SUGGESTIONS')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              borderRadius: '8px 8px 0 0',
              fontSize: '13px',
              fontWeight: activeTab === 'SUGGESTIONS' ? 700 : 500,
              backgroundColor: activeTab === 'SUGGESTIONS' ? '#ffffff' : 'transparent',
              color: activeTab === 'SUGGESTIONS' ? '#0f766e' : '#64748b',
              borderTop: activeTab === 'SUGGESTIONS' ? '2px solid #0f766e' : '2px solid transparent',
              borderLeft: activeTab === 'SUGGESTIONS' ? '1px solid #cbd5e1' : 'none',
              borderRight: activeTab === 'SUGGESTIONS' ? '1px solid #cbd5e1' : 'none',
              borderBottom: activeTab === 'SUGGESTIONS' ? '1px solid #ffffff' : 'none',
              marginBottom: activeTab === 'SUGGESTIONS' ? '-1px' : '0',
              cursor: 'pointer',
            }}
          >
            <SlidersHorizontal size={15} />
            <span>Gợi Ý Thanh Lý</span>
            <span style={{
              fontSize: '10px',
              padding: '1px 6px',
              borderRadius: '999px',
              backgroundColor: '#fef3c7',
              color: '#92400e',
              fontWeight: 700,
            }}>
              {suggestionStats.totalSuggestions}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('ACTIVE_FLASH_SALES')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              borderRadius: '8px 8px 0 0',
              fontSize: '13px',
              fontWeight: activeTab === 'ACTIVE_FLASH_SALES' ? 700 : 500,
              backgroundColor: activeTab === 'ACTIVE_FLASH_SALES' ? '#ffffff' : 'transparent',
              color: activeTab === 'ACTIVE_FLASH_SALES' ? '#0f766e' : '#64748b',
              borderTop: activeTab === 'ACTIVE_FLASH_SALES' ? '2px solid #0f766e' : '2px solid transparent',
              borderLeft: activeTab === 'ACTIVE_FLASH_SALES' ? '1px solid #cbd5e1' : 'none',
              borderRight: activeTab === 'ACTIVE_FLASH_SALES' ? '1px solid #cbd5e1' : 'none',
              borderBottom: activeTab === 'ACTIVE_FLASH_SALES' ? '1px solid #ffffff' : 'none',
              marginBottom: activeTab === 'ACTIVE_FLASH_SALES' ? '-1px' : '0',
              cursor: 'pointer',
            }}
          >
            <Zap size={15} />
            <span>Đang Flash Sale</span>
            <span style={{
              fontSize: '10px',
              padding: '1px 6px',
              borderRadius: '999px',
              backgroundColor: '#dcfce7',
              color: '#15803d',
              fontWeight: 700,
            }}>
              {products.length}
            </span>
          </button>
        </div>

        {/* Warehouse Filter on Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Building2 size={15} color="#64748b" />
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Kho kiểm tra:</span>
          <select
            value={warehouseFilter}
            onChange={e => setWarehouseFilter(e.target.value)}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              fontSize: '12px',
              fontWeight: 600,
              color: '#0f766e',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="ALL">Toàn bộ các kho ({warehouses.length} kho)</option>
            {warehouses.map(w => (
              <option key={w.code} value={w.code}>
                {w.name} ({w.code})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* TAB 1: GỢI Ý XẢ KHO THÔNG MINH (RECOMMENDATIONS)                      */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'SUGGESTIONS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Controls Bar: Tier Tabs & Search & Batch Action */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}>
            {/* Urgency Tier Pills */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', marginRight: '4px' }}>Mức độ:</span>
              {[
                { key: 'ALL', label: `Tất cả (${suggestions.length})`, bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' },
                { key: 'CRITICAL', label: `Cận hạn ≤ 5 ngày (${suggestionStats.criticalCount})`, bg: '#fef2f2', color: '#991b1b', border: '#fecaca' },
                { key: 'HIGH_RISK', label: `Theo dõi 6-12 ngày (${suggestionStats.highRiskCount})`, bg: '#fffbeb', color: '#92400e', border: '#fde68a' },
                { key: 'OVERSTOCK', label: `Tồn ứ đọng (${suggestionStats.overstockCount})`, bg: '#f0f9ff', color: '#075985', border: '#bae6fd' },
              ].map(t => {
                const isSelected = tierFilter === t.key;
                return (
                  <button
                    key={t.key}
                    onClick={() => {
                      setTierFilter(t.key as any);
                      setSuggestionPage(1);
                    }}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '6px',
                      border: isSelected ? '1px solid #0f766e' : `1px solid ${t.border}`,
                      backgroundColor: isSelected ? '#0f766e' : t.bg,
                      color: isSelected ? '#ffffff' : t.color,
                      fontSize: '11.5px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>

            {/* Search and Batch Activate */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 12px',
                backgroundColor: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                width: '260px',
              }}>
                <Search size={14} color="#64748b" />
                <input
                  type="text"
                  placeholder="Tìm tên, SKU, mã lô..."
                  value={suggestionSearch}
                  onChange={e => {
                    setSuggestionSearch(e.target.value);
                    setSuggestionPage(1);
                  }}
                  style={{
                    border: 'none',
                    outline: 'none',
                    backgroundColor: 'transparent',
                    fontSize: '12px',
                    width: '100%',
                    color: '#0f172a',
                  }}
                />
              </div>

              {selectedSuggestionSkus.size > 0 && (
                <button
                  onClick={handleBatchActivate}
                  disabled={batchLoading}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '7px 14px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    backgroundColor: '#d97706',
                    color: '#ffffff',
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                  }}
                >
                  <Zap size={14} />
                  <span>Kích hoạt ({selectedSuggestionSkus.size}) đã chọn</span>
                </button>
              )}
            </div>
          </div>

          {/* Table Container */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            overflowX: 'auto',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            width: '100%',
          }}>
            <table style={{
              width: '100%',
              minWidth: '1280px',
              borderCollapse: 'collapse',
              textAlign: 'left',
              fontSize: '12px',
            }}>
              <thead>
                <tr style={{
                  backgroundColor: '#f8fafc',
                  borderBottom: '1px solid #e2e8f0',
                  color: '#64748b',
                  fontWeight: 600,
                  fontSize: '11px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.03em',
                }}>
                  <th style={{ padding: '12px 14px', width: '40px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={paginatedSuggestions.length > 0 && selectedSuggestionSkus.size === paginatedSuggestions.filter(s => !s.isAlreadyFlashSale).length}
                      onChange={toggleSelectAllSuggestions}
                      style={{ cursor: 'pointer' }}
                    />
                  </th>
                  <th style={{ padding: '12px 16px', minWidth: '260px' }}>Sản Phẩm & SKU</th>
                  <th style={{ padding: '12px 16px', minWidth: '210px', width: '210px' }}>Kho & Lô Hàng Cận Hạn</th>
                  <th style={{ padding: '12px 16px', width: '130px', textAlign: 'right' }}>Tồn Cận / Tổng Tồn</th>
                  <th style={{ padding: '12px 16px', width: '130px', textAlign: 'right' }}>Giá Gốc Tiêu Chuẩn</th>
                  <th style={{ padding: '12px 16px', width: '180px', textAlign: 'center' }}>Khuyến Nghị Giảm Giá</th>
                  <th style={{ padding: '12px 16px', width: '140px', textAlign: 'right' }}>Doanh Thu Dự Kiến</th>
                  <th style={{
                    padding: '12px 18px',
                    textAlign: 'right',
                    minWidth: '180px',
                    position: 'sticky',
                    right: 0,
                    backgroundColor: '#f8fafc',
                    zIndex: 2,
                    boxShadow: '-4px 0 8px rgba(0,0,0,0.03)',
                  }}>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {loadingSuggestions ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '40px 16px', textAlign: 'center', color: '#64748b' }}>
                      <RefreshCw size={20} className="animate-spin" style={{ margin: '0 auto 8px auto' }} />
                      <div>Đang tải danh sách gợi ý thanh lý...</div>
                    </td>
                  </tr>
                ) : filteredSuggestions.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '40px 16px', textAlign: 'center', color: '#64748b' }}>
                      <CheckCircle2 size={28} color="#16a34a" style={{ margin: '0 auto 8px auto' }} />
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>Không có sản phẩm nào cần xử lý</div>
                    </td>
                  </tr>
                ) : (
                  paginatedSuggestions.map((item, idx) => {
                    const isSelected = selectedSuggestionSkus.has(item.sku);
                    const isCritical = item.urgencyTier === 'CRITICAL';
                    const isHighRisk = item.urgencyTier === 'HIGH_RISK';
                    const isOverstock = item.urgencyTier === 'OVERSTOCK';

                    return (
                      <tr
                        key={item.sku}
                        style={{
                          borderBottom: idx !== paginatedSuggestions.length - 1 ? '1px solid #f1f5f9' : 'none',
                          backgroundColor: isSelected ? '#f0fdfa' : '#ffffff',
                          transition: 'background-color 0.15s ease',
                        }}
                        onMouseEnter={e => {
                          if (!isSelected) e.currentTarget.style.backgroundColor = '#f8fafc';
                          const stickyTd = e.currentTarget.querySelector('.sticky-action-cell') as HTMLElement;
                          if (stickyTd) stickyTd.style.backgroundColor = isSelected ? '#f0fdfa' : '#f8fafc';
                        }}
                        onMouseLeave={e => {
                          if (!isSelected) e.currentTarget.style.backgroundColor = '#ffffff';
                          const stickyTd = e.currentTarget.querySelector('.sticky-action-cell') as HTMLElement;
                          if (stickyTd) stickyTd.style.backgroundColor = isSelected ? '#f0fdfa' : '#ffffff';
                        }}
                      >
                        {/* Checkbox */}
                        <td style={{ padding: '12px 14px', textAlign: 'center', verticalAlign: 'middle' }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={item.isAlreadyFlashSale}
                            onChange={() => !item.isAlreadyFlashSale && toggleSelectSuggestion(item.sku)}
                            style={{ cursor: item.isAlreadyFlashSale ? 'not-allowed' : 'pointer' }}
                            title={item.isAlreadyFlashSale ? 'Sản phẩm đã đang áp dụng Flash Sale' : undefined}
                          />
                        </td>

                        {/* Product Info */}
                        <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <img
                              src={item.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=120'}
                              alt={item.productName}
                              style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #e2e8f0', flexShrink: 0 }}
                            />
                            <div>
                              <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '13px' }}>
                                {item.productName}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                                <span style={{ fontFamily: 'monospace', fontSize: '11px', color: '#64748b' }}>
                                  {item.sku}
                                </span>
                                <span style={{ fontSize: '10px', backgroundColor: '#f1f5f9', color: '#475569', padding: '1px 5px', borderRadius: '4px' }}>
                                  {item.category}
                                </span>
                                {item.isAlreadyFlashSale && (
                                  <span style={{ fontSize: '10px', backgroundColor: '#fef3c7', color: '#b45309', padding: '1px 5px', borderRadius: '4px', fontWeight: 600 }}>
                                    Đang Sale (-{item.currentDiscountPercent}%)
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Warehouse & Lot & Expiry */}
                        <td style={{ padding: '12px 16px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <span style={{ fontSize: '10.5px', fontWeight: 600, backgroundColor: '#f0fdfa', color: '#0f766e', border: '1px solid #ccfbf1', padding: '1px 6px', borderRadius: '4px' }}>
                                {item.warehouseCode}
                              </span>
                              <span style={{ fontFamily: 'monospace', fontSize: '11px', color: '#475569', fontWeight: 600 }}>
                                {item.lotCode}
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{
                                fontSize: '11px',
                                fontWeight: 700,
                                padding: '2px 6px',
                                borderRadius: '4px',
                                whiteSpace: 'nowrap',
                                display: 'inline-flex',
                                alignItems: 'center',
                                backgroundColor: isCritical ? '#fef2f2' : isHighRisk ? '#fffbeb' : '#f0f9ff',
                                color: isCritical ? '#991b1b' : isHighRisk ? '#92400e' : '#075985',
                                border: `1px solid ${isCritical ? '#fecaca' : isHighRisk ? '#fde68a' : '#bae6fd'}`,
                              }}>
                                {item.daysRemaining <= 0 ? 'Hết hạn hôm nay' : `Còn ${item.daysRemaining} ngày`}
                              </span>
                              <span style={{ fontSize: '10.5px', color: '#64748b', whiteSpace: 'nowrap' }}>
                                ({new Date(item.earliestExpiryDate).toLocaleDateString('vi-VN')})
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Stock */}
                        <td style={{ padding: '12px 16px', textAlign: 'right', verticalAlign: 'middle' }}>
                          <div style={{ fontWeight: 700, color: '#0f172a', fontVariantNumeric: 'tabular-nums', fontSize: '13px' }}>
                            <span style={{ color: isCritical ? '#dc2626' : isHighRisk ? '#d97706' : '#0f172a' }}>
                              {item.nearExpiryStock}
                            </span>
                            <span style={{ color: '#94a3b8', fontWeight: 500, fontSize: '11px' }}> / {item.totalStock} {item.unit}</span>
                          </div>
                          <div style={{ fontSize: '10px', color: '#64748b' }}>
                            {item.nearExpiryStock > 0 ? 'Lô cần xả trước' : 'Tổng tồn kho'}
                          </div>
                        </td>

                        {/* Standard Original Price */}
                        <td style={{ padding: '12px 16px', textAlign: 'right', verticalAlign: 'middle' }}>
                          <div style={{ fontWeight: 600, color: '#64748b', fontVariantNumeric: 'tabular-nums' }}>
                            {item.originalPrice.toLocaleString('vi-VN')}đ
                          </div>
                          <div style={{ fontSize: '10px', color: '#94a3b8' }}>/{item.unit}</div>
                        </td>

                        {/* Recommendation */}
                        <td style={{ padding: '12px 16px', textAlign: 'center', verticalAlign: 'middle' }}>
                          <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '2px',
                                padding: '2px 8px',
                                borderRadius: '999px',
                                fontSize: '11.5px',
                                fontWeight: 700,
                                backgroundColor: isCritical ? '#dc2626' : isHighRisk ? '#d97706' : '#0284c7',
                                color: '#ffffff',
                              }}>
                                -{item.suggestedDiscountPercent}%
                              </span>
                              <span style={{ fontWeight: 700, color: '#0f766e', fontSize: '13px', fontVariantNumeric: 'tabular-nums' }}>
                                {item.suggestedFlashSalePrice.toLocaleString('vi-VN')}đ
                              </span>
                            </div>
                            <span style={{ fontSize: '10.5px', color: '#64748b' }}>
                              Hạn mức: <strong>{item.suggestedQuota} {item.unit}</strong>
                            </span>
                          </div>
                        </td>

                        {/* Estimated Revenue Recovered */}
                        <td style={{ padding: '12px 16px', textAlign: 'right', verticalAlign: 'middle' }}>
                          <div style={{ fontWeight: 700, color: '#15803d', fontVariantNumeric: 'tabular-nums', fontSize: '13px' }}>
                            {item.estimatedRevenueSaved.toLocaleString('vi-VN')}đ
                          </div>
                          <div style={{ fontSize: '10px', color: '#64748b' }}>Thu hồi vốn</div>
                        </td>

                        {/* Actions */}
                        <td
                          className="sticky-action-cell"
                          style={{
                            padding: '12px 18px',
                            textAlign: 'right',
                            whiteSpace: 'nowrap',
                            verticalAlign: 'middle',
                            position: 'sticky',
                            right: 0,
                            backgroundColor: isSelected ? '#f0fdfa' : '#ffffff',
                            zIndex: 1,
                            boxShadow: '-4px 0 8px rgba(0,0,0,0.03)',
                            transition: 'background-color 0.15s ease',
                          }}
                          onClick={e => e.stopPropagation()}
                        >
                          {item.isAlreadyFlashSale ? (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '5px 10px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: 600,
                              backgroundColor: '#f1f5f9',
                              color: '#475569',
                              border: '1px solid #cbd5e1',
                            }}>
                              <CheckCircle2 size={12} color="#16a34a" />
                              Đang Áp Dụng
                            </span>
                          ) : (
                            <button
                              onClick={() => handleOpenQuickApply(item)}
                              title="Xem chi tiết và kích hoạt Flash Sale ngay"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                backgroundColor: '#0f766e',
                                color: '#ffffff',
                                padding: '6px 12px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: 600,
                                border: 'none',
                                cursor: 'pointer',
                              }}
                            >
                              <Zap size={13} />
                              <span>Kích Hoạt Flash Sale</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Suggestions Pagination */}
          {totalSuggestionPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 4px' }}>
              <span style={{ fontSize: '12px', color: '#64748b' }}>
                Hiển thị trang {suggestionPage} / {totalSuggestionPages} ({filteredSuggestions.length} mặt hàng đề xuất)
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  onClick={() => setSuggestionPage(p => Math.max(1, p - 1))}
                  disabled={suggestionPage === 1}
                  style={{
                    padding: '5px 10px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: suggestionPage === 1 ? '#f8fafc' : '#ffffff',
                    color: suggestionPage === 1 ? '#94a3b8' : '#334155',
                    cursor: suggestionPage === 1 ? 'not-allowed' : 'pointer',
                  }}
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  onClick={() => setSuggestionPage(p => Math.min(totalSuggestionPages, p + 1))}
                  disabled={suggestionPage === totalSuggestionPages}
                  style={{
                    padding: '5px 10px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: suggestionPage === totalSuggestionPages ? '#f8fafc' : '#ffffff',
                    color: suggestionPage === totalSuggestionPages ? '#94a3b8' : '#334155',
                    cursor: suggestionPage === totalSuggestionPages ? 'not-allowed' : 'pointer',
                  }}
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* TAB 2: CHIẾN DỊCH FLASH SALE ĐANG HOẠT ĐỘNG (ACTIVE FLASH SALES)      */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'ACTIVE_FLASH_SALES' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Filter Bar */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 12px',
              backgroundColor: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              width: '280px',
            }}>
              <Search size={14} color="#64748b" />
              <input
                type="text"
                placeholder="Tìm tên hoặc SKU đang sale..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{
                  border: 'none',
                  outline: 'none',
                  backgroundColor: 'transparent',
                  fontSize: '12px',
                  width: '100%',
                  color: '#0f172a',
                }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>Ngành hàng:</span>
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#334155',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value="ALL">Tất cả ngành hàng</option>
                {categories.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Active Table */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            overflowX: 'auto',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            width: '100%',
          }}>
            <table style={{
              width: '100%',
              minWidth: '1050px',
              borderCollapse: 'collapse',
              textAlign: 'left',
              fontSize: '12px',
            }}>
              <thead>
                <tr style={{
                  backgroundColor: '#f8fafc',
                  borderBottom: '1px solid #e2e8f0',
                  color: '#64748b',
                  fontWeight: 600,
                  fontSize: '11px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.03em',
                }}>
                  <th style={{ padding: '12px 16px' }}>Sản Phẩm & Mã SKU</th>
                  <th style={{ padding: '12px 16px', width: '150px' }}>Ngành Hàng</th>
                  <th style={{ padding: '12px 16px', width: '130px', textAlign: 'right' }}>Giá Gốc</th>
                  <th style={{ padding: '12px 16px', width: '130px', textAlign: 'right' }}>Giá Flash Sale</th>
                  <th style={{ padding: '12px 16px', width: '100px', textAlign: 'center' }}>% Giảm</th>
                  <th style={{ padding: '12px 16px', width: '120px', textAlign: 'center' }}>Trạng Thái</th>
                  <th style={{
                    padding: '12px 18px',
                    textAlign: 'right',
                    width: '140px',
                    position: 'sticky',
                    right: 0,
                    backgroundColor: '#f8fafc',
                    zIndex: 2,
                    boxShadow: '-4px 0 8px rgba(0,0,0,0.03)',
                  }}>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {loadingActive ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '40px 16px', textAlign: 'center', color: '#64748b' }}>
                      <RefreshCw size={20} className="animate-spin" style={{ margin: '0 auto 8px auto' }} />
                      <div>Đang tải danh sách...</div>
                    </td>
                  </tr>
                ) : filteredActiveProducts.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '40px 16px', textAlign: 'center', color: '#64748b' }}>
                      <Zap size={28} color="#cbd5e1" style={{ margin: '0 auto 8px auto' }} />
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>Chưa có sản phẩm nào đang chạy Flash Sale</div>
                    </td>
                  </tr>
                ) : (
                  paginatedActiveProducts.map((product, idx) => {
                    const origPrice = product.originalPrice || (product.discountPercent ? Math.round(product.price / (1 - product.discountPercent / 100)) : product.price);
                    const salePrice = product.price;

                    return (
                      <tr
                        key={product.id}
                        style={{
                          borderBottom: idx !== paginatedActiveProducts.length - 1 ? '1px solid #f1f5f9' : 'none',
                          backgroundColor: '#ffffff',
                          transition: 'background-color 0.15s ease',
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.backgroundColor = '#f8fafc';
                          const stickyTd = e.currentTarget.querySelector('.sticky-active-cell') as HTMLElement;
                          if (stickyTd) stickyTd.style.backgroundColor = '#f8fafc';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.backgroundColor = '#ffffff';
                          const stickyTd = e.currentTarget.querySelector('.sticky-active-cell') as HTMLElement;
                          if (stickyTd) stickyTd.style.backgroundColor = '#ffffff';
                        }}
                      >
                        {/* Product SKU */}
                        <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <img
                              src={product.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=120'}
                              alt={product.name}
                              style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #e2e8f0', flexShrink: 0 }}
                            />
                            <div>
                              <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '13px' }}>
                                {product.name}
                              </div>
                              <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#64748b' }}>
                                SKU: {product.sku}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Category */}
                        <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                          <span style={{ fontSize: '11px', backgroundColor: '#f1f5f9', color: '#475569', padding: '2px 6px', borderRadius: '4px' }}>
                            {product.category}
                          </span>
                        </td>

                        {/* Orig Price */}
                        <td style={{ padding: '12px 16px', textAlign: 'right', verticalAlign: 'middle', textDecoration: 'line-through', color: '#94a3b8', fontVariantNumeric: 'tabular-nums' }}>
                          {origPrice.toLocaleString('vi-VN')}đ
                        </td>

                        {/* Sale Price */}
                        <td style={{ padding: '12px 16px', textAlign: 'right', verticalAlign: 'middle', fontWeight: 700, color: '#b45309', fontSize: '13px', fontVariantNumeric: 'tabular-nums' }}>
                          {salePrice.toLocaleString('vi-VN')}đ
                        </td>

                        {/* % Discount */}
                        <td style={{ padding: '12px 16px', textAlign: 'center', verticalAlign: 'middle' }}>
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: '999px',
                            fontSize: '11px',
                            fontWeight: 700,
                            backgroundColor: '#fef3c7',
                            color: '#92400e',
                            border: '1px solid #fde68a',
                          }}>
                            -{product.discountPercent || 0}%
                          </span>
                        </td>

                        {/* Status */}
                        <td style={{ padding: '12px 16px', textAlign: 'center', verticalAlign: 'middle' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 8px',
                            borderRadius: '999px',
                            fontSize: '11px',
                            fontWeight: 600,
                            backgroundColor: '#f0fdf4',
                            color: '#166534',
                            border: '1px solid #bbf7d0',
                          }}>
                            <CheckCircle2 size={12} />
                            <span>Đang Mở Bán</span>
                          </span>
                        </td>

                        {/* Actions */}
                        <td
                          className="sticky-active-cell"
                          style={{
                            padding: '12px 18px',
                            textAlign: 'right',
                            whiteSpace: 'nowrap',
                            verticalAlign: 'middle',
                            position: 'sticky',
                            right: 0,
                            backgroundColor: '#ffffff',
                            zIndex: 1,
                            boxShadow: '-4px 0 8px rgba(0,0,0,0.03)',
                            transition: 'background-color 0.15s ease',
                          }}
                          onClick={e => e.stopPropagation()}
                        >
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <button
                              onClick={() => handleOpenEdit(product)}
                              title="Điều chỉnh giá / % giảm"
                              style={{
                                padding: '5px 8px',
                                borderRadius: '6px',
                                border: '1px solid #cbd5e1',
                                backgroundColor: '#f8fafc',
                                color: '#334155',
                                cursor: 'pointer',
                              }}
                            >
                              <Edit3 size={13} />
                            </button>
                            <button
                              onClick={() => handleRemoveFlashSale(product)}
                              title="Dừng Flash Sale & Phục hồi giá gốc"
                              style={{
                                padding: '5px 8px',
                                borderRadius: '6px',
                                border: '1px solid #fecaca',
                                backgroundColor: '#fef2f2',
                                color: '#dc2626',
                                cursor: 'pointer',
                              }}
                            >
                              <Trash2 size={13} />
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

          {/* Active Pagination */}
          {totalActivePages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 4px' }}>
              <span style={{ fontSize: '12px', color: '#64748b' }}>
                Hiển thị trang {currentPage} / {totalActivePages} ({filteredActiveProducts.length} sản phẩm đang mở bán)
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  style={{
                    padding: '5px 10px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: currentPage === 1 ? '#f8fafc' : '#ffffff',
                    color: currentPage === 1 ? '#94a3b8' : '#334155',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  }}
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalActivePages, p + 1))}
                  disabled={currentPage === totalActivePages}
                  style={{
                    padding: '5px 10px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: currentPage === totalActivePages ? '#f8fafc' : '#ffffff',
                    color: currentPage === totalActivePages ? '#94a3b8' : '#334155',
                    cursor: currentPage === totalActivePages ? 'not-allowed' : 'pointer',
                  }}
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* MODAL 1: KÍCH HOẠT FLASH SALE 1-CHẠM TỪ GỢI Ý                         */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {quickApplyModalSuggestion && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.5)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px',
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '560px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#f8fafc',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  padding: '6px',
                  borderRadius: '6px',
                  backgroundColor: '#f0fdfa',
                  color: '#0f766e',
                }}>
                  <Zap size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                    Kích Hoạt Flash Sale Xả Kho
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setQuickApplyModalSuggestion(null)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleConfirmQuickApply} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Product Summary Card */}
              <div style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '12px',
                display: 'flex',
                gap: '12px',
                alignItems: 'center',
              }}>
                <img
                  src={quickApplyModalSuggestion.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=120'}
                  alt={quickApplyModalSuggestion.productName}
                  style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '13.5px' }}>
                    {quickApplyModalSuggestion.productName}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px', fontSize: '11px', color: '#64748b' }}>
                    <span>SKU: <strong style={{ color: '#0f172a' }}>{quickApplyModalSuggestion.sku}</strong></span>
                    <span>|</span>
                    <span>Kho: <strong style={{ color: '#0f766e' }}>{quickApplyModalSuggestion.warehouseCode}</strong></span>
                    <span>|</span>
                    <span>Lô: <strong style={{ color: '#0f172a' }}>{quickApplyModalSuggestion.lotCode}</strong></span>
                  </div>
                  <div style={{ marginTop: '4px', fontSize: '11.5px', color: '#b45309', fontWeight: 600 }}>
                    Hạn dùng: {new Date(quickApplyModalSuggestion.earliestExpiryDate).toLocaleDateString('vi-VN')} ({quickApplyModalSuggestion.daysRemaining <= 0 ? 'Hết hạn hôm nay' : `Còn ${quickApplyModalSuggestion.daysRemaining} ngày`})
                  </div>
                </div>
              </div>

              {/* Recommendation Reason Alert */}
              <div style={{
                padding: '10px 14px',
                borderRadius: '6px',
                backgroundColor: quickApplyModalSuggestion.urgencyTier === 'CRITICAL' ? '#fef2f2' : '#fffbeb',
                border: `1px solid ${quickApplyModalSuggestion.urgencyTier === 'CRITICAL' ? '#fecaca' : '#fde68a'}`,
                fontSize: '11.5px',
                color: quickApplyModalSuggestion.urgencyTier === 'CRITICAL' ? '#991b1b' : '#92400e',
                lineHeight: 1.4,
              }}>
                <strong>Lý do gợi ý:</strong> {quickApplyModalSuggestion.recommendationReason}
              </div>

              {/* Discount and Price Inputs */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                    Mức Chiết Khấu (% Giảm)
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="number"
                      min="5"
                      max="90"
                      value={applyForm.discountPercent}
                      onChange={e => handleApplyFormDiscountChange(Number(e.target.value))}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        paddingRight: '32px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        fontSize: '13px',
                        fontWeight: 700,
                        color: '#0f172a',
                        outline: 'none',
                      }}
                    />
                    <Percent size={14} style={{ position: 'absolute', right: '10px', top: '10px', color: '#94a3b8' }} />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                    Giá Flash Sale Mở Bán
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="number"
                      step="500"
                      value={applyForm.flashSalePrice}
                      onChange={e => handleApplyFormPriceChange(Number(e.target.value))}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid #0f766e',
                        backgroundColor: '#f0fdfa',
                        fontSize: '13px',
                        fontWeight: 700,
                        color: '#0f766e',
                        outline: 'none',
                      }}
                    />
                  </div>
                  <span style={{ fontSize: '10.5px', color: '#64748b', marginTop: '3px', display: 'block' }}>
                    Giá gốc: <del>{quickApplyModalSuggestion.originalPrice.toLocaleString('vi-VN')}đ</del>
                  </span>
                </div>
              </div>

              {/* Financial Impact Comparison */}
              <div style={{
                backgroundColor: '#f8fafc',
                padding: '12px 14px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
              }}>
                <div>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>Hạn mức suất bán (Quota):</span>
                  <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '13px', marginTop: '2px' }}>
                    {applyForm.quota} {quickApplyModalSuggestion.unit} (khớp lô cận hạn)
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>Doanh thu dự kiến thu hồi:</span>
                  <div style={{ fontWeight: 700, color: '#15803d', fontSize: '13px', marginTop: '2px', fontVariantNumeric: 'tabular-nums' }}>
                    {(applyForm.flashSalePrice * applyForm.quota).toLocaleString('vi-VN')}đ
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setQuickApplyModalSuggestion(null)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#475569',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 18px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: '#0f766e',
                    color: '#ffffff',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  }}
                >
                  <Zap size={14} />
                  <span>Xác Nhận Kích Hoạt Giờ Vàng</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* MODAL 2: THÊM / SỬA THỦ CÔNG FLASH SALE (MANUAL MODAL)                */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {(showAddModal || showEditModal) && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.5)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px',
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '540px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
          }}>
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#f8fafc',
            }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                {showAddModal ? 'Thêm Sản Phẩm Mở Bán Flash Sale' : `Chỉnh Sửa Flash Sale: ${selectedProduct?.name}`}
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setShowEditModal(false);
                }}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveManualFlashSale} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {showAddModal && (
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                    Chọn sản phẩm áp dụng Flash Sale:
                  </label>
                  <select
                    value={formData.productId}
                    onChange={e => handleSelectProductToSale(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '12.5px',
                      outline: 'none',
                    }}
                  >
                    <option value="">-- Chọn sản phẩm trong kho --</option>
                    {allProducts.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.sku}) - {p.price?.toLocaleString('vi-VN')}đ
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                    Tỷ lệ giảm giá (%)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="90"
                    value={formData.discountPercent}
                    onChange={e => handleManualDiscountChange(Number(e.target.value))}
                    required
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      fontWeight: 700,
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                    Giá bán Flash Sale (VNĐ)
                  </label>
                  <input
                    type="number"
                    step="500"
                    value={formData.flashSalePrice}
                    onChange={e => handleManualPriceChange(Number(e.target.value))}
                    required
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid #0f766e',
                      backgroundColor: '#f0fdfa',
                      fontSize: '13px',
                      fontWeight: 700,
                      color: '#0f766e',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setShowEditModal(false);
                  }}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#475569',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '8px 18px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: '#0f766e',
                    color: '#ffffff',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Lưu Chương Trình
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
