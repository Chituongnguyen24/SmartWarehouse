import React, { useState, useEffect, useRef } from 'react';
import { 
  Package, 
  AlertCircle, 
  Plus, 
  Edit, 
  Trash2, 
  X, 
  Eye, 
  MapPin, 
  Upload, 
  Download, 
  Barcode, 
  CheckCircle2, 
  Image as ImageIcon, 
  Percent, 
  Zap, 
  Check, 
  Tag, 
  RefreshCw,
  Search,
  Loader2
} from 'lucide-react';
import { io } from 'socket.io-client';
import { useAuth } from '@/features/auth';
import { globalDataCache } from '@/shared';

export const STANDARD_12_CATEGORIES = [
  'Rau củ, trái cây',
  'Thịt, trứng, hải sản',
  'Thức ăn chế biến, bún tươi',
  'Thực phẩm đông, mát',
  'Sữa, sản phẩm từ sữa',
  'Thức uống',
  'Bánh, kẹo, snack',
  'Gia vị, gạo, thực phẩm khô',
  'Sản phẩm cho bé',
  'Chăm sóc cá nhân',
  'Nhà cửa và đời sống',
  'Shop nổi bật'
];

const API_BASE = 'http://localhost:3010';
const WAREHOUSE_API = 'http://localhost:3005';
const INVENTORY_API = 'http://localhost:3011';

interface Warehouse {
  code: string;
  name: string;
}

interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  storageType: string;
  minTemp: number;
  maxTemp: number;
  maxHumidity: number;
  unit: string;
  price?: number;
  originalPrice?: number;
  imageUrl?: string;
  isFlashSale?: boolean;
  discountPercent?: number;
  description?: string;
  stock?: number;
}

const Products = () => {
  const { token, user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Pagination & Filters State
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState('');
  const [showLiveSuggestions, setShowLiveSuggestions] = useState(false);
  const [liveSuggestions, setLiveSuggestions] = useState<Product[]>([]);
  const [isDebouncing, setIsDebouncing] = useState(false);
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Stock View State
  const [showStockModal, setShowStockModal] = useState(false);
  const [viewingProduct, setViewingProduct] = useState<{sku: string, name: string, unit?: string} | null>(null);
  const [stockData, setStockData] = useState<Record<string, number>>({});
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);

  // Import State
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);

  // Barcode Modal
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const [viewingBarcodeProduct, setViewingBarcodeProduct] = useState<{sku: string, name: string} | null>(null);

  // Upload ảnh State
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageUploadSuccess, setImageUploadSuccess] = useState(false);

  // Form state
  const [formData, setFormData] = useState<{
    sku: string;
    name: string;
    category: string;
    storageType: string;
    minTemp: number;
    maxTemp: number;
    maxHumidity: number;
    unit: string;
    price: number;
    originalPrice: number;
    imageUrl: string;
    isFlashSale: boolean;
    discountPercent: number;
    description: string;
  }>({
    sku: '',
    name: '',
    category: 'Rau củ, trái cây',
    storageType: 'COOL',
    minTemp: 2,
    maxTemp: 8,
    maxHumidity: 85,
    unit: 'Kg',
    price: 0,
    originalPrice: 0,
    imageUrl: '',
    isFlashSale: false,
    discountPercent: 0,
    description: '',
  });

  // Admin và Sales Staff đều có quyền quản lý danh mục sản phẩm
  const canManage = user?.role === 'ADMIN' || user?.role === 'SALES_STAFF';

  // Debounce tìm kiếm cho Saler: Chờ 350ms sau khi người dùng dừng gõ mới thực hiện truy vấn để tránh lag
  useEffect(() => {
    const trimmed = searchInput.trim();
    if (!trimmed) {
      if (keyword) {
        setKeyword('');
        setPage(1);
      }
      setLiveSuggestions([]);
      setIsDebouncing(false);
      return;
    }

    setIsDebouncing(true);
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    searchDebounceRef.current = setTimeout(async () => {
      setKeyword(trimmed);
      setPage(1);
      setIsDebouncing(false);

      // Tải nhanh gợi ý tức thì cho dropdown
      try {
        const res = await fetch(`${API_BASE}/products?keyword=${encodeURIComponent(trimmed)}&limit=5`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setLiveSuggestions(data.items || []);
        }
      } catch (e) {
        console.warn('Gợi ý tìm kiếm thất bại:', e);
      }
    }, 350);

    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchInput]);

  useEffect(() => {
    fetchProducts();
  }, [page, keyword, category]);

  useEffect(() => {
    fetchWarehouses();

    // Lắng nghe cập nhật tồn kho và giá sản phẩm qua socket thời gian thực (<1s)
    const socket = io('http://localhost:3004', {
      transports: ['websocket', 'polling']
    });

    socket.on('product_updated', (data: any) => {
      globalDataCache.invalidate('products');
      if (data?.sku || data?.id) {
        setProducts(prev => prev.map(p => {
          if (p.sku === data.sku || p.id === data.id) {
            return {
              ...p,
              stock: data.stock !== undefined ? data.stock : p.stock,
              price: data.price !== undefined ? data.price : p.price
            };
          }
          return p;
        }));
      } else {
        fetchProducts(true);
      }
    });

    socket.on('stock_sync', () => {
      globalDataCache.invalidate('products');
      fetchProducts(true);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const fetchWarehouses = async () => {
    try {
      const res = await fetch(`${WAREHOUSE_API}/warehouses`);
      if (res.ok) {
        const data = await res.json();
        setWarehouses(data);
      }
    } catch (e) { console.error(e); }
  };

  // Warehouse stock cache for filtering
  const [warehouseSkus, setWarehouseSkus] = useState<Set<string> | null>(null);

  useEffect(() => {
    if (user?.role === 'WAREHOUSE_MANAGER' && user?.warehouseCode) {
      fetchWarehouseSkus(user.warehouseCode);
    }
  }, [user]);

  const fetchWarehouseSkus = async (whCode: string) => {
    try {
      const res = await fetch(`${INVENTORY_API}/inventory/lots`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const lots = await res.json();
        const skusInWh = new Set<string>(
          lots
            .filter((l: any) => l.warehouseCode === whCode && ((l.remainingQty ?? l.quantity ?? 1) > 0))
            .map((l: any) => l.productId || l.sku)
            .filter(Boolean)
        );
        setWarehouseSkus(skusInWh);
      }
    } catch (e) {
      console.error('Failed to fetch warehouse SKUs:', e);
    }
  };

  const fetchProducts = async (forceRefresh: boolean = false) => {
    const cacheKey = `products:list:${page}:${keyword || ''}:${category || ''}`;
    // Chỉ đọc cache khi không tìm kiếm theo từ khóa để kết quả tìm kiếm luôn mới nhất
    if (!forceRefresh && !keyword) {
      const cached = globalDataCache.get<{ items: Product[], totalPages: number, total: number }>(cacheKey);
      if (cached) {
        setProducts(cached.items);
        setTotalPages(cached.totalPages);
        setTotalItems(cached.total);
        setLoading(false);
        return;
      }
    }

    setLoading(true);
    try {
      const url = new URL(`${API_BASE}/products`);
      url.searchParams.append('page', String(page));
      url.searchParams.append('limit', '50');
      if (keyword) url.searchParams.append('keyword', keyword);
      if (category) url.searchParams.append('category', category);

      const res = await fetch(url.toString(), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const items = data.items || [];
        const totalPages = data.totalPages || 1;
        const total = data.total || 0;
        setProducts(items);
        setTotalPages(totalPages);
        setTotalItems(total);
        globalDataCache.set(cacheKey, { items, totalPages, total }, 5 * 60 * 1000);
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setLoading(false);
    }
  };

  const displayedProducts = React.useMemo(() => {
    if (user?.role === 'WAREHOUSE_MANAGER' && user?.warehouseCode) {
      if (!warehouseSkus) return [];
      return products.filter(p => warehouseSkus.has(p.sku));
    }
    return products;
  }, [products, warehouseSkus, user]);

  const handleOpenModal = (product?: Product) => {
    setImageUploadSuccess(false);
    if (product) {
      setFormData({
        sku: product.sku || '',
        name: product.name || '',
        category: product.category || 'Trái cây',
        storageType: product.storageType || 'DRY',
        minTemp: product.minTemp ?? 15,
        maxTemp: product.maxTemp ?? 30,
        maxHumidity: product.maxHumidity ?? 70,
        unit: product.unit || 'Kg',
        price: product.price || 0,
        originalPrice: product.originalPrice || product.price || 0,
        imageUrl: product.imageUrl || '',
        isFlashSale: !!product.isFlashSale,
        discountPercent: product.discountPercent || 0,
        description: product.description || '',
      });
      setEditingId(product.id);
    } else {
      setFormData({
        sku: '',
        name: '',
        category: 'Rau củ, trái cây',
        storageType: 'COOL',
        minTemp: 2,
        maxTemp: 8,
        maxHumidity: 85,
        unit: 'Kg',
        price: 0,
        originalPrice: 0,
        imageUrl: '',
        isFlashSale: false,
        discountPercent: 0,
        description: '',
      });
      setEditingId(null);
      // Tự động lấy mã SKU mới nhất theo định dạng CT-MMYYxxxx
      fetch(`${API_BASE}/products/next-sku`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          if (data?.sku) {
            setFormData(prev => ({ ...prev, sku: data.sku }));
          }
        })
        .catch(() => {});
    }
    setShowModal(true);
  };

  const handleAutoGenerateSku = async () => {
    try {
      const res = await fetch(`${API_BASE}/products/next-sku`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.sku) {
          setFormData(prev => ({ ...prev, sku: data.sku }));
          return;
        }
      }
    } catch (e) {}

    // Dự phòng cục bộ nếu không gọi được API
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yy = String(now.getFullYear()).slice(-2);
    const randomSeq = String(Math.floor(1 + Math.random() * 9999)).padStart(4, '0');
    setFormData(prev => ({ ...prev, sku: `CT-${mm}${yy}${randomSeq}` }));
  };

  // Upload ảnh sản phẩm
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Vui lòng chọn file hình ảnh hợp lệ (JPG, PNG, WEBP)!');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Kích thước ảnh tối đa là 5MB!');
      return;
    }

    setUploadingImage(true);
    setImageUploadSuccess(false);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = reader.result as string;
        const uploadRes = await fetch(`${API_BASE}/products/upload-image`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            imageBase64: base64Data,
            sku: formData.sku || 'PRODUCT',
            mimeType: file.type
          })
        });

        if (uploadRes.ok) {
          const resData = await uploadRes.json();
          if (resData.url) {
            setFormData(prev => ({ ...prev, imageUrl: resData.url }));
            setImageUploadSuccess(true);
          }
        } else {
          const err = await uploadRes.json();
          alert(`Tải ảnh thất bại: ${err.message || 'Lỗi xử lý file'}`);
        }
        setUploadingImage(false);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      console.error('Lỗi khi tải ảnh:', err);
      alert('Đã xảy ra lỗi khi tải ảnh sản phẩm lên hệ thống');
      setUploadingImage(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingId ? `${API_BASE}/products/${editingId}` : `${API_BASE}/products`;
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      
      if (res.ok) {
        setShowModal(false);
        globalDataCache.invalidate('products');
        globalDataCache.invalidate('categories');
        fetchProducts(true);
      } else {
        const err = await res.json();
        alert(`Lỗi: ${err.message || 'Không thể lưu sản phẩm'}`);
      }
    } catch (error) {
      console.error('Failed to save product:', error);
    }
  };

  const downloadTemplate = () => {
    const csvContent = "data:text/csv;charset=utf-8,sku,name,category,storageType,unit,price\nBEEF-AUS,Thit bo Uc,Thit tuoi,FROZEN,Kg,250000\nAPPLE-NZ,Tao New Zealand,Trai cay,COOL,Kg,150000";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "product_template.csv");
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleImport = async () => {
    if (!importFile) return;
    setImporting(true);
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter(l => l.trim().length > 0);
        let successCount = 0;
        
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',');
          if (cols.length >= 6) {
            const storageType = cols[3].trim().toUpperCase();
            let minTemp = 15, maxTemp = 35;
            if (storageType === 'FROZEN') { minTemp = -20; maxTemp = -5; }
            else if (storageType === 'COOL') { minTemp = 2; maxTemp = 8; }

            const payload = {
              sku: cols[0].trim(),
              name: cols[1].trim(),
              category: cols[2].trim(),
              storageType: storageType,
              unit: cols[4].trim(),
              price: parseFloat(cols[5].trim()) || 0,
              minTemp,
              maxTemp,
              maxHumidity: 70
            };
            
            await fetch(`${API_BASE}/products`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify(payload)
            });
            successCount++;
          }
        }
        alert(`Đã nhập thành công ${successCount} sản phẩm vào danh mục bán hàng!`);
        setShowImportModal(false);
        setImportFile(null);
        globalDataCache.invalidate('products');
        globalDataCache.invalidate('categories');
        fetchProducts(true);
      } catch (err) {
        console.error(err);
        alert('Có lỗi xảy ra khi nhập file!');
      } finally {
        setImporting(false);
      }
    };
    reader.readAsText(importFile);
  };

  const handleViewStock = async (product: Product) => {
    setViewingProduct({ sku: product.sku, name: product.name, unit: product.unit });
    setShowStockModal(true);
    setStockData({});
    try {
      const searchKey = product.sku || product.id;
      const res = await fetch(`${INVENTORY_API}/inventory/warehouse-stock?skus=${encodeURIComponent(searchKey)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const parsedStock: Record<string, number> = {};
        Object.keys(data).forEach(whCode => {
          parsedStock[whCode] = (data[whCode]?.[product.sku] ?? data[whCode]?.[product.id]) || 0;
        });
        setStockData(parsedStock);
      }
    } catch (error) {
      console.error('Failed to fetch stock:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Quý khách hoặc Quản lý có chắc muốn ngừng bán sản phẩm này? Sản phẩm sẽ được gỡ khỏi gian hàng trực tuyến.')) return;
    try {
      const res = await fetch(`${API_BASE}/products/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        globalDataCache.invalidate('products');
        globalDataCache.invalidate('categories');
        fetchProducts(true);
      } else {
        const err = await res.json();
        alert(`Lỗi: ${err.message || 'Không thể gỡ sản phẩm'}`);
      }
    } catch (error) {
      console.error('Failed to delete product:', error);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-6)' }}>
      {/* Tiêu đề trang */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title" style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0f172a' }}>
            {user?.role === 'WAREHOUSE_MANAGER' && user?.warehouseCode 
              ? `Danh mục Sản phẩm (Kho ${user.warehouseCode})` 
              : 'Quản lý Danh mục Sản phẩm & Giá bán'}
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '4px' }}>
            Kiểm soát thông tin mặt hàng, giá bán lẻ, chương trình ưu đãi và hình ảnh đại diện hiển thị cho khách hàng.
          </p>
        </div>
        {canManage && (
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button 
              className="btn btn-outline" 
              onClick={() => fetchProducts(true)} 
              title="Làm mới danh sách và cập nhật số lượng tồn kho mới nhất"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#fff', border: '1px solid #cbd5e1', fontSize: '0.875rem', color: '#334155', fontWeight: 500, padding: '0.5rem 0.875rem', borderRadius: '6px', cursor: 'pointer' }}
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              Làm mới
            </button>
            <button 
              className="btn btn-outline" 
              onClick={() => setShowImportModal(true)} 
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#fff', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
            >
              <Upload size={16} />
              Nhập danh sách Excel / CSV
            </button>
            <button 
              className="btn btn-primary" 
              onClick={() => handleOpenModal()} 
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#0f766e', border: 'none', color: '#fff', padding: '0.5rem 1rem', borderRadius: '6px', fontWeight: 600, fontSize: '0.875rem' }}
            >
              <Plus size={18} />
              Thêm sản phẩm mới
            </button>
          </div>
        )}
      </div>

      {/* Thẻ chỉ số tổng quan */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
        <div className="card" style={{ padding: '1.25rem', backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 500 }}>Tổng số mặt hàng</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '6px', backgroundColor: '#f0fdf4', color: '#166534', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Package size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>{totalItems}</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>Đang mở bán trên cửa hàng</div>
        </div>

        <div className="card" style={{ padding: '1.25rem', backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 500 }}>Hình ảnh đạt chuẩn</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '6px', backgroundColor: '#eff6ff', color: '#1d4ed8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ImageIcon size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>
            {products.filter(p => !!p.imageUrl).length}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#0284c7', marginTop: '4px' }}>Hiển thị sắc nét trên website</div>
        </div>

        <div className="card" style={{ padding: '1.25rem', backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 500 }}>Chương trình Flash Sale</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '6px', backgroundColor: '#fef2f2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>
            {products.filter(p => p.isFlashSale).length}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#dc2626', marginTop: '4px' }}>Giá sốc thu hút người mua</div>
        </div>

        <div className="card" style={{ padding: '1.25rem', backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 500 }}>Quyền Quản Trị</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '6px', backgroundColor: '#f8fafc', color: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
            {user?.role === 'ADMIN' ? 'Ban Quản Trị' : 'Phụ Trách Bán Hàng'}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#16a34a', marginTop: '4px' }}>Toàn quyền định giá & đăng bán</div>
        </div>
      </div>

      {/* Bộ lọc & Tìm kiếm tự động (Debounced Search) */}
      <div className="card" style={{ padding: '1rem', backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Search size={16} color="#64748b" style={{ position: 'absolute', left: '12px', pointerEvents: 'none' }} />
              <input 
                type="text" 
                placeholder="Tìm kiếm theo mã SKU hoặc tên sản phẩm (tự động gợi ý sau khi dừng gõ)..." 
                value={searchInput}
                onChange={e => {
                  setSearchInput(e.target.value);
                  setShowLiveSuggestions(true);
                }}
                onFocus={() => {
                  if (searchInput.trim().length > 0) setShowLiveSuggestions(true);
                }}
                onBlur={() => {
                  setTimeout(() => setShowLiveSuggestions(false), 250);
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    setKeyword(searchInput.trim());
                    setPage(1);
                    setShowLiveSuggestions(false);
                  }
                }}
                style={{ 
                  width: '100%', 
                  padding: '0.55rem 2.5rem 0.55rem 2.3rem', 
                  borderRadius: '6px', 
                  border: '1px solid #cbd5e1', 
                  fontSize: '0.875rem',
                  outline: 'none',
                  backgroundColor: '#fff'
                }}
              />

              {/* Trạng thái Debounce hoặc Nút Xóa */}
              <div style={{ position: 'absolute', right: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                {isDebouncing && (
                  <Loader2 size={16} className="animate-spin" color="#0f766e" />
                )}
                {searchInput && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchInput('');
                      setKeyword('');
                      setLiveSuggestions([]);
                      setShowLiveSuggestions(false);
                      setPage(1);
                    }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '2px', display: 'flex', alignItems: 'center' }}
                    title="Xóa tìm kiếm"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>
            </div>

            {/* Dropdown Gợi ý tức thì cho Saler */}
            {showLiveSuggestions && searchInput.trim().length > 0 && (
              <div 
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  marginTop: '6px',
                  backgroundColor: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
                  zIndex: 100,
                  overflow: 'hidden'
                }}
                onMouseDown={e => e.preventDefault()}
              >
                <div style={{ padding: '8px 14px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
                  <span>GỢI Ý TỨC THÌ CHO SALER</span>
                  {isDebouncing ? (
                    <span style={{ color: '#0f766e', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Loader2 size={12} className="animate-spin" /> Đang tra cứu...
                    </span>
                  ) : (
                    <span>{liveSuggestions.length} kết quả phù hợp</span>
                  )}
                </div>

                {liveSuggestions.length === 0 && !isDebouncing ? (
                  <div style={{ padding: '1.25rem', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
                    Không tìm thấy sản phẩm nào khớp với từ khóa <strong>"{searchInput.trim()}"</strong>
                  </div>
                ) : (
                  <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
                    {liveSuggestions.map(item => (
                      <div 
                        key={item.id || item.sku}
                        onClick={() => {
                          setSearchInput(item.sku);
                          setKeyword(item.sku);
                          setPage(1);
                          setShowLiveSuggestions(false);
                        }}
                        style={{
                          padding: '10px 14px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          cursor: 'pointer',
                          borderBottom: '1px solid #f1f5f9',
                          transition: 'background-color 0.15s ease'
                        }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        {/* Ảnh thu nhỏ */}
                        <div style={{ width: '36px', height: '36px', borderRadius: '4px', overflow: 'hidden', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <Package size={18} color="#94a3b8" />
                          )}
                        </div>

                        {/* Tên & SKU */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {item.name}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', gap: '8px', marginTop: '2px' }}>
                            <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0f766e' }}>{item.sku}</span>
                            <span>•</span>
                            <span>{item.category}</span>
                          </div>
                        </div>

                        {/* Giá & Tồn kho */}
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                            {item.price?.toLocaleString('vi-VN')} đ
                          </div>
                          <span style={{
                            display: 'inline-block',
                            marginTop: '2px',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            backgroundColor: (item.stock ?? 0) > 0 ? '#f0fdf4' : '#fef2f2',
                            color: (item.stock ?? 0) > 0 ? '#166534' : '#991b1b',
                            border: `1px solid ${(item.stock ?? 0) > 0 ? '#bbf7d0' : '#fecaca'}`,
                            fontVariantNumeric: 'tabular-nums'
                          }}>
                            {(item.stock ?? 0) > 0 ? `Còn ${item.stock} ${item.unit || ''}` : 'Chờ nhập'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Footer xem bảng kết quả */}
                {searchInput.trim() && (
                  <div 
                    onClick={() => {
                      setKeyword(searchInput.trim());
                      setPage(1);
                      setShowLiveSuggestions(false);
                    }}
                    style={{
                      padding: '8px 14px',
                      backgroundColor: '#f1f5f9',
                      textAlign: 'center',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: '#0f766e',
                      cursor: 'pointer',
                      borderTop: '1px solid #e2e8f0'
                    }}
                  >
                    Xem toàn bộ danh sách kết quả cho "{searchInput.trim()}" →
                  </div>
                )}
              </div>
            )}
          </div>
          <select 
            value={category} 
            onChange={e => { setCategory(e.target.value); setPage(1); }}
            style={{ padding: '0.5rem 0.85rem', borderRadius: '6px', border: '1px solid #cbd5e1', minWidth: '220px', cursor: 'pointer', fontSize: '0.875rem' }}
          >
            <option value="">Tất cả 12 ngành hàng</option>
            {STANDARD_12_CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Bảng danh sách sản phẩm */}
      <div className="card" style={{ padding: '0', backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
        <div className="table-container">
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#475569' }}>
                <th style={{ width: '70px', padding: '10px 14px', textAlign: 'center' }}>Ảnh</th>
                <th style={{ padding: '10px 14px' }}>Mã sản phẩm</th>
                <th style={{ padding: '10px 14px' }}>Tên Sản phẩm</th>
                <th style={{ padding: '10px 14px' }}>Ngành hàng</th>
                <th style={{ padding: '10px 14px' }}>Bảo quản</th>
                <th style={{ padding: '10px 14px', textAlign: 'right' }}>Giá bán</th>
                <th style={{ padding: '10px 14px', textAlign: 'right' }}>Tồn kho</th>
                <th style={{ padding: '10px 14px' }}>Đơn vị</th>
                <th style={{ padding: '10px 14px', textAlign: 'center' }}>Chương trình</th>
                {canManage && <th style={{ padding: '10px 14px', textAlign: 'right' }}>Thao tác</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>Đang tải danh sách sản phẩm...</td></tr>
              ) : displayedProducts.length === 0 ? (
                <tr><td colSpan={10} style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>Không tìm thấy sản phẩm nào phù hợp.</td></tr>
              ) : (
                displayedProducts.map((p) => {
                  return (
                    <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ textAlign: 'center', padding: '8px' }}>
                        <div style={{ position: 'relative', width: '48px', height: '48px', borderRadius: '6px', overflow: 'hidden', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {p.imageUrl ? (
                            <img src={p.imageUrl} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <Package size={22} color="#cbd5e1" />
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontWeight: 600, color: '#334155' }}>{p.sku}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>{p.name}</div>
                      </td>
                      <td style={{ padding: '10px 14px', color: '#475569' }}>{p.category}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: 500,
                          backgroundColor: p.storageType === 'COOL' || p.storageType === 'COLD' ? '#f0f9ff' : p.storageType === 'FROZEN' ? '#f0fdfa' : '#fefce8',
                          color: p.storageType === 'COOL' || p.storageType === 'COLD' ? '#0369a1' : p.storageType === 'FROZEN' ? '#0f766e' : '#a16207',
                          border: `1px solid ${p.storageType === 'COOL' || p.storageType === 'COLD' ? '#bae6fd' : p.storageType === 'FROZEN' ? '#99f6e4' : '#fef08a'}`
                        }}>
                          {p.storageType === 'COOL' || p.storageType === 'COLD' ? 'Kho Mát (2-8°C)' : p.storageType === 'FROZEN' ? 'Kho Đông (-18°C)' : 'Kho Khô (15-30°C)'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                        {p.price ? p.price.toLocaleString('vi-VN') + ' đ' : 'Chưa định giá'}
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                        {(p.stock ?? 0) > 0 ? (
                          <span style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            backgroundColor: '#f0fdf4',
                            color: '#166534',
                            border: '1px solid #bbf7d0',
                            fontVariantNumeric: 'tabular-nums'
                          }}>
                            {(p.stock ?? 0).toLocaleString('vi-VN')} {p.unit || ''}
                          </span>
                        ) : (
                          <span style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            backgroundColor: '#fef2f2',
                            color: '#991b1b',
                            border: '1px solid #fecaca'
                          }}>
                            0 (Chờ nhập kho)
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '10px 14px', color: '#475569' }}>{p.unit}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        {p.isFlashSale ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '4px', backgroundColor: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', fontSize: '0.72rem', fontWeight: 600 }}>
                            <Zap size={11} /> Flash Sale {p.discountPercent ? `-${p.discountPercent}%` : ''}
                          </span>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Giá tiêu chuẩn</span>
                        )}
                      </td>
                      {canManage && (
                        <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                            <button 
                              onClick={() => { setViewingBarcodeProduct({sku: p.sku, name: p.name}); setShowBarcodeModal(true); }} 
                              style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '4px 6px', cursor: 'pointer', color: '#475569' }} 
                              title="In tem mã vạch"
                            >
                              <Barcode size={15} />
                            </button>
                            <button 
                              onClick={() => handleViewStock(p)} 
                              style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '4px 6px', cursor: 'pointer', color: '#0284c7' }} 
                              title="Xem tồn kho chi tiết"
                            >
                              <Eye size={15} />
                            </button>
                            <button 
                              onClick={() => handleOpenModal(p)} 
                              style={{ background: '#f0fdfa', border: '1px solid #99f6e4', borderRadius: '4px', padding: '4px 6px', cursor: 'pointer', color: '#0f766e' }} 
                              title="Chỉnh sửa thông tin & hình ảnh"
                            >
                              <Edit size={15} />
                            </button>
                            <button 
                              onClick={() => handleDelete(p.id)} 
                              style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '4px', padding: '4px 6px', cursor: 'pointer', color: '#991b1b' }} 
                              title="Ngừng bán sản phẩm"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Phân trang */}
        <div style={{ padding: '0.85rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
          <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Hiển thị trang {page} / {totalPages} (Tổng: {totalItems} sản phẩm)
          </span>
          <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
            <button 
              className="btn btn-outline" 
              disabled={page <= 1} 
              onClick={() => setPage(p => Math.max(1, p - 1))}
              style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', backgroundColor: '#fff', border: '1px solid #cbd5e1' }}
            >
              Trang trước
            </button>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0f172a', padding: '0 0.5rem' }}>{page}</span>
            <button 
              className="btn btn-outline" 
              disabled={page >= totalPages} 
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', backgroundColor: '#fff', border: '1px solid #cbd5e1' }}
            >
              Trang sau
            </button>
          </div>
        </div>
      </div>

      {/* Modal: Thêm / Sửa Sản Phẩm */}
      {showModal && (
        <div 
          onClick={() => setShowModal(false)}
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
        >
          <div 
            onClick={e => e.stopPropagation()}
            className="card" 
            style={{ width: '680px', maxWidth: '95%', padding: '1.75rem', maxHeight: '92vh', overflowY: 'auto', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #cbd5e1', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                  {editingId ? 'Chỉnh sửa Sản phẩm & Cập nhật Hình ảnh' : 'Thêm Sản phẩm Mới vào Gian hàng'}
                </h3>
                <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '3px 0 0 0' }}>
                  Thông tin sẽ được cập nhật trực tiếp trên trang chủ và danh mục cho khách hàng mua sắm.
                </p>
              </div>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={20} />
              </button>
            </div>

            {!editingId && (
              <div style={{ padding: '0.75rem 1rem', backgroundColor: '#f0fdfa', border: '1px solid #99f6e4', borderRadius: '8px', fontSize: '0.8rem', color: '#0f766e', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                <Package size={16} color="#0f766e" style={{ flexShrink: 0 }} />
                <span>
                  <strong>Quy chuẩn tồn kho:</strong> Sản phẩm mới đăng ký danh mục sẽ có <strong>Tồn kho = 0</strong> và tự động hiển thị <em>"Tạm hết hàng"</em> trên website bán hàng cho đến khi hoàn tất tạo <strong>Phiếu nhập kho</strong> và phân bổ lô hàng vào kho vật lý.
                </span>
              </div>
            )}
            
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Vùng chọn ảnh sản phẩm */}
              <div style={{ padding: '1rem', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ImageIcon size={16} color="#0f766e" />
                    Hình ảnh sản phẩm (Hiển thị cho khách hàng)
                  </label>
                  {imageUploadSuccess && (
                    <span style={{ fontSize: '0.75rem', color: '#166534', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', padding: '2px 8px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Check size={12} /> Ảnh đã tải lên thành công
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <div style={{ width: '90px', height: '90px', borderRadius: '8px', border: '2px dashed #cbd5e1', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', position: 'relative' }}>
                    {uploadingImage ? (
                      <span style={{ fontSize: '0.75rem', color: '#0f766e', textAlign: 'center', padding: '4px' }}>Đang tải ảnh...</span>
                    ) : formData.imageUrl ? (
                      <img src={formData.imageUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <ImageIcon size={32} color="#94a3b8" />
                    )}
                  </div>

                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ display: 'inline-block' }}>
                      <input 
                        type="file" 
                        accept="image/png,image/jpeg,image/webp" 
                        onChange={handleImageFileChange}
                        disabled={uploadingImage}
                        style={{ display: 'none' }}
                      />
                      <span className="btn" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: '#fff', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer', color: '#0f172a' }}>
                        <Upload size={14} />
                        {uploadingImage ? 'Đang xử lý ảnh...' : 'Chọn ảnh từ máy tính (PNG/JPG)'}
                      </span>
                    </label>
                    <input 
                      type="text" 
                      placeholder="Hoặc nhập đường dẫn ảnh sản phẩm trực tiếp..." 
                      value={formData.imageUrl} 
                      onChange={e => setFormData({ ...formData, imageUrl: e.target.value })} 
                      style={{ padding: '0.45rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.78rem', width: '100%' }}
                    />
                  </div>
                </div>
              </div>

              {/* Thông tin định danh cơ bản */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155' }}>
                      Mã sản phẩm (SKU) *
                      {editingId && (
                        <span style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 400, marginLeft: '6px' }}>
                          (Cố định)
                        </span>
                      )}
                    </label>
                    {!editingId && (
                      <button
                        type="button"
                        onClick={handleAutoGenerateSku}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#0284c7',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                          fontWeight: 600,
                          padding: 0
                        }}
                        title="Tự động lấy mã tiếp theo chuẩn CT-MMYYxxxx"
                      >
                        Tạo tự động
                      </button>
                    )}
                  </div>
                  <input 
                    type="text" 
                    disabled={!!editingId}
                    readOnly={!!editingId}
                    placeholder="VD: CT-11260001 hoặc bấm Tạo tự động"
                    value={formData.sku} 
                    onChange={e => !editingId && setFormData({...formData, sku: e.target.value.toUpperCase()})} 
                    style={{ 
                      padding: '0.5rem', 
                      borderRadius: '6px', 
                      border: '1px solid #cbd5e1', 
                      fontSize: '0.85rem',
                      backgroundColor: editingId ? '#f1f5f9' : '#fff',
                      cursor: editingId ? 'not-allowed' : 'text',
                      color: editingId ? '#64748b' : '#0f172a'
                    }} 
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155' }}>Đơn vị tính *</label>
                  <input 
                    required 
                    type="text" 
                    placeholder="Kg, Gói, Hộp, Chai..." 
                    value={formData.unit} 
                    onChange={e => setFormData({...formData, unit: e.target.value})} 
                    style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }} 
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155' }}>Ngành hàng *</label>
                  <select 
                    value={formData.category} 
                    onChange={e => setFormData({...formData, category: e.target.value})}
                    style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', backgroundColor: '#fff' }}
                  >
                    {STANDARD_12_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Tên sản phẩm */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155' }}>Tên sản phẩm hiển thị trên Website *</label>
                <input 
                  required 
                  type="text" 
                  placeholder="Nhập tên thương mại rõ ràng của sản phẩm..." 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }} 
                />
              </div>

              {/* Giá cả & Khuyến mãi */}
              <div style={{ padding: '0.85rem', backgroundColor: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#92400e', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Percent size={14} /> Chính sách Giá & Khuyến mãi Bán hàng
                  </span>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 600, color: '#b45309', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={formData.isFlashSale} 
                      onChange={e => setFormData({ ...formData, isFlashSale: e.target.checked })} 
                    />
                    Bật tham gia Flash Sale Giờ Vàng
                  </label>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#78350f' }}>Giá bán thực tế (VNĐ) *</label>
                    <input 
                      required 
                      type="number" 
                      min="0" 
                      value={formData.price} 
                      onChange={e => setFormData({...formData, price: parseFloat(e.target.value) || 0})} 
                      style={{ padding: '0.45rem', borderRadius: '6px', border: '1px solid #fde68a', fontSize: '0.85rem' }} 
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#78350f' }}>Giá niêm yết cũ (nếu có)</label>
                    <input 
                      type="number" 
                      min="0" 
                      value={formData.originalPrice} 
                      onChange={e => setFormData({...formData, originalPrice: parseFloat(e.target.value) || 0})} 
                      style={{ padding: '0.45rem', borderRadius: '6px', border: '1px solid #fde68a', fontSize: '0.85rem' }} 
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#78350f' }}>% Giảm giá hiển thị</label>
                    <input 
                      type="number" 
                      min="0" 
                      max="99" 
                      value={formData.discountPercent} 
                      onChange={e => setFormData({...formData, discountPercent: parseInt(e.target.value) || 0})} 
                      style={{ padding: '0.45rem', borderRadius: '6px', border: '1px solid #fde68a', fontSize: '0.85rem' }} 
                    />
                  </div>
                </div>
              </div>

              {/* Điều kiện bảo quản & Nhiệt độ */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#334155' }}>Vùng bảo quản *</label>
                  <select 
                    value={formData.storageType} 
                    onChange={e => {
                      const type = e.target.value;
                      let minTemp = 15, maxTemp = 30, maxHum = 70;
                      if (type === 'COOL') { minTemp = 2; maxTemp = 8; maxHum = 85; }
                      else if (type === 'FROZEN') { minTemp = -22; maxTemp = -16; maxHum = 90; }
                      setFormData({ ...formData, storageType: type, minTemp, maxTemp, maxHumidity: maxHum });
                    }} 
                    style={{ padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem', backgroundColor: '#fff' }}
                  >
                    <option value="COOL">Kho Mát</option>
                    <option value="FROZEN">Kho Đông Lạnh</option>
                    <option value="DRY">Kho Khô</option>
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#334155' }}>Nhiệt độ tối thiểu</label>
                  <input 
                    required 
                    type="number" 
                    step="0.5" 
                    value={formData.minTemp} 
                    onChange={e => setFormData({...formData, minTemp: parseFloat(e.target.value)})} 
                    style={{ padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }} 
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#334155' }}>Nhiệt độ tối đa</label>
                  <input 
                    required 
                    type="number" 
                    step="0.5" 
                    value={formData.maxTemp} 
                    onChange={e => setFormData({...formData, maxTemp: parseFloat(e.target.value)})} 
                    style={{ padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }} 
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#334155' }}>Độ ẩm tối đa (%)</label>
                  <input 
                    required 
                    type="number" 
                    step="1" 
                    value={formData.maxHumidity} 
                    onChange={e => setFormData({...formData, maxHumidity: parseFloat(e.target.value)})} 
                    style={{ padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }} 
                  />
                </div>
              </div>

              {/* Nút thao tác */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.75rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)} 
                  style={{ padding: '0.5rem 1.25rem', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#fff', cursor: 'pointer', fontSize: '0.875rem', color: '#475569' }}
                >
                  Hủy bỏ
                </button>
                <button 
                  type="submit" 
                  disabled={uploadingImage}
                  style={{ padding: '0.5rem 1.5rem', borderRadius: '6px', border: 'none', backgroundColor: '#0f766e', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem' }}
                >
                  {editingId ? 'Cập nhật Sản phẩm' : 'Lưu & Đăng bán ngay'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Xem tồn kho chi tiết */}
      {showStockModal && viewingProduct && (
        <div 
          onClick={() => setShowStockModal(false)}
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
        >
          <div 
            onClick={e => e.stopPropagation()}
            className="card" style={{ width: '700px', maxWidth: '90%', padding: '1.5rem', maxHeight: '90vh', overflowY: 'auto', backgroundColor: '#fff', borderRadius: '8px' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.25rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#0f172a' }}>Kiểm soát tồn kho: {viewingProduct.name}</h3>
                <p style={{ fontSize: '0.875rem', marginTop: '0.25rem', color: '#64748b' }}>Mã sản phẩm: <strong style={{ color: '#0f766e' }}>{viewingProduct.sku}</strong></p>
              </div>
              <button onClick={() => setShowStockModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={20} /></button>
            </div>

            {/* Thẻ Tổng Tồn Kho Khả Dụng */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.85rem 1.25rem', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', marginBottom: '1.25rem' }}>
              <div>
                <div style={{ fontSize: '0.85rem', color: '#166534', fontWeight: 600 }}>Tổng tồn khả dụng trên toàn hệ thống:</div>
                <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: '2px' }}>Đồng bộ thời gian thực từ các lô hàng thực tế tại tất cả các kho</div>
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#166534', fontVariantNumeric: 'tabular-nums' }}>
                {Object.values(stockData).reduce((a, b) => a + b, 0)} <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{viewingProduct.unit || 'sản phẩm'}</span>
              </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
              {warehouses.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b', gridColumn: '1 / -1' }}>Đang tải danh sách kho...</div>
              ) : (
                warehouses.map(wh => {
                  const qty = stockData[wh.code] || 0;
                  return (
                    <div key={wh.code} style={{ padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '0.5rem', backgroundColor: qty > 0 ? '#f0fdf4' : '#f8fafc' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 600, color: '#0f172a' }}>{wh.name}</span>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', backgroundColor: qty > 0 ? '#166534' : '#94a3b8', color: '#fff' }}>
                          {wh.code}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '0.5rem' }}>
                        <span style={{ fontSize: '0.875rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <MapPin size={14} /> Tồn kho thực tế:
                        </span>
                        <span style={{ fontSize: '1.25rem', fontWeight: 800, color: qty > 0 ? '#166534' : '#dc2626', fontVariantNumeric: 'tabular-nums' }}>
                          {qty} {viewingProduct.unit || ''}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
              <button className="btn btn-primary" onClick={() => setShowStockModal(false)} style={{ backgroundColor: '#0f766e', border: 'none', color: '#fff', padding: '0.5rem 1.25rem', borderRadius: '6px' }}>Đóng</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nhập Excel / CSV */}
      {showImportModal && (
        <div 
          onClick={() => setShowImportModal(false)}
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
        >
          <div 
            onClick={e => e.stopPropagation()}
            className="card" style={{ width: '500px', maxWidth: '90%', padding: '1.5rem', backgroundColor: '#fff', borderRadius: '8px' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#0f172a' }}>Nhập Sản phẩm từ Excel / CSV</h3>
              <button onClick={() => setShowImportModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={20} /></button>
            </div>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1rem' }}>
                Vui lòng chuẩn bị file danh sách sản phẩm định dạng .CSV theo đúng cấu trúc mẫu.
              </p>
              
              <button 
                type="button" 
                onClick={downloadTemplate}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#0f766e', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 600, marginBottom: '1.5rem', fontSize: '0.875rem' }}
              >
                <Download size={16} />
                Tải file mẫu (Template.csv)
              </button>

              <div style={{ border: '2px dashed #cbd5e1', padding: '2rem', textAlign: 'center', borderRadius: '8px', backgroundColor: '#f8fafc' }}>
                <input 
                  type="file" 
                  accept=".csv" 
                  onChange={(e) => setImportFile(e.target.files ? e.target.files[0] : null)}
                  style={{ display: 'block', width: '100%' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
              <button type="button" onClick={() => setShowImportModal(false)} className="btn btn-outline" disabled={importing} style={{ backgroundColor: '#fff', border: '1px solid #cbd5e1' }}>Huỷ</button>
              <button type="button" onClick={handleImport} className="btn btn-primary" disabled={!importFile || importing} style={{ backgroundColor: '#0f766e', border: 'none', color: '#fff' }}>
                {importing ? 'Đang xử lý...' : 'Xác nhận Nhập'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Mã vạch */}
      {showBarcodeModal && viewingBarcodeProduct && (
        <div 
          onClick={() => setShowBarcodeModal(false)}
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
        >
          <div 
            onClick={e => e.stopPropagation()}
            className="card" style={{ width: '400px', maxWidth: '90%', padding: '2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', backgroundColor: '#fff', borderRadius: '8px' }}
          >
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem', color: '#0f172a' }}>Mã vạch Sản phẩm</h3>
            <div style={{ border: '1px solid #cbd5e1', padding: '1.5rem', borderRadius: '8px', backgroundColor: '#fff', width: '100%' }}>
              <img 
                src={`https://barcode.tec-it.com/barcode.ashx?data=${viewingBarcodeProduct.sku}&code=Code128`} 
                alt={`Barcode for ${viewingBarcodeProduct.sku}`}
                style={{ maxWidth: '100%', height: '80px' }}
              />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontWeight: 700, fontSize: '1.2rem', color: '#0f172a' }}>{viewingBarcodeProduct.sku}</div>
              <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '4px' }}>{viewingBarcodeProduct.name}</div>
            </div>
            
            <div style={{ display: 'flex', gap: '1rem', width: '100%', marginTop: '0.5rem' }}>
              <button type="button" onClick={() => setShowBarcodeModal(false)} className="btn btn-outline" style={{ flex: 1, backgroundColor: '#fff', border: '1px solid #cbd5e1' }}>Đóng</button>
              <button type="button" onClick={() => { alert('Đã gửi lệnh in đến máy in mã vạch!'); setShowBarcodeModal(false); }} className="btn btn-primary" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', backgroundColor: '#0f766e', border: 'none', color: '#fff' }}>
                <Barcode size={16} /> In mã vạch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;
