"use client";

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
  ChevronRight, Tag, Percent, Gift, Check, Copy, 
  Sparkles, SlidersHorizontal, ArrowUpDown, Clock, 
  ShoppingBag, ShieldCheck, Flame, RefreshCw 
} from 'lucide-react';
import { ProductCard, FilterSidebar } from '@/features/catalog';
import { PaginationControls } from '@/shared';
import { getProducts, getCategories, getVouchers, Product, VoucherItem } from '@/lib/api';

const VOUCHERS = [
  {
    code: 'FREESHIP',
    title: 'Miễn phí vận chuyển 15.000đ',
    desc: 'Áp dụng cho đơn hàng từ 200.000đ tại TP.HCM',
    minSpend: 200000,
    discountAmount: 15000,
    expiry: 'HSD: 30/11/2026',
    tag: 'Freeship',
    color: 'border-emerald-200 bg-emerald-50/60 text-emerald-800'
  },
  {
    code: 'FRESH20',
    title: 'Giảm ngay 20.000đ thực phẩm tươi',
    desc: 'Áp dụng cho giỏ hàng có rau củ quả hoặc thịt tươi',
    minSpend: 250000,
    discountAmount: 20000,
    expiry: 'HSD: 25/11/2026',
    tag: 'Tươi ngon',
    color: 'border-sky-200 bg-sky-50/60 text-sky-800'
  },
  {
    code: 'TIETKIEM50',
    title: 'Giảm 50.000đ đơn hàng lớn',
    desc: 'Áp dụng cho đơn hàng bách hóa từ 600.000đ',
    minSpend: 600000,
    discountAmount: 50000,
    expiry: 'HSD: 30/11/2026',
    tag: 'Siêu tiết kiệm',
    color: 'border-amber-200 bg-amber-50/60 text-amber-800'
  },
  {
    code: 'VIPMEMBER',
    title: 'Ưu đãi Hội viên 10%',
    desc: 'Tối đa 100.000đ cho khách hàng thân thiết C.T Mart',
    minSpend: 500000,
    discountAmount: 100000,
    expiry: 'HSD: 31/12/2026',
    tag: 'Đặc quyền',
    color: 'border-indigo-200 bg-indigo-50/60 text-indigo-800'
  }
];

const PROMO_TAGS = [
  { id: 'all', label: 'Tất cả ưu đãi' },
  { id: 'deep-discount', label: 'Giảm sốc > 20%' },
  { id: 'fresh', label: 'Thực phẩm tươi sống' },
  { id: 'drink-dairy', label: 'Sữa & Thức uống' },
  { id: 'dry-food', label: 'Gia vị & Thực phẩm khô' },
  { id: 'household', label: 'Hàng tiêu dùng & Gia đình' },
];

export default function KhuyenMaiPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTag, setActiveTag] = useState('all');
  const [maxPrice, setMaxPrice] = useState<number>(1000000);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<string>('discount-desc');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Pagination & Load More State
  const PAGE_SIZE = 12;
  const [visibleCount, setVisibleCount] = useState<number>(PAGE_SIZE);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [dynamicVouchers, setDynamicVouchers] = useState<VoucherItem[]>([]);

  // Reset pagination when filters change
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
    setCurrentPage(1);
  }, [activeTag, maxPrice, selectedBrands, sortBy]);

  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        const [prodData, catData, voucherData] = await Promise.all([
          getProducts({ limit: 100 }),
          getCategories(),
          getVouchers()
        ]);
        setProducts(prodData.items || []);
        setCategories(catData || []);
        if (voucherData && voucherData.length > 0) {
          setDynamicVouchers(voucherData);
        }
      } catch (err) {
        console.error('Error loading promotion products:', err);
      } finally {
        setLoading(false);
      }
    }
    init();

    // Lắng nghe cập nhật giá khuyến mãi thời gian thực (<1s)
    const handleProductUpdated = (e: any) => {
      const updated = e.detail;
      if (!updated) return;
      setProducts(prev => prev.map(p => {
        if (p.id === updated.id || p.sku === updated.sku) {
          const price = Number(updated.price);
          const discount = updated.discountPercent !== undefined ? updated.discountPercent : p.discount;
          const oldPrice = updated.originalPrice 
            ? Number(updated.originalPrice) 
            : (discount ? Math.round(price / (1 - discount / 100)) : p.oldPrice);
          return {
            ...p,
            ...updated,
            price,
            oldPrice,
            discount,
          };
        }
        return p;
      }));
    };

    window.addEventListener('sfwms:product_updated', handleProductUpdated);
    return () => window.removeEventListener('sfwms:product_updated', handleProductUpdated);
  }, []);

  const handleCopyVoucher = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const handleBrandChange = (brand: string) => {
    setSelectedBrands(prev => 
      prev.includes(brand) ? prev.filter(b => b !== brand) : [...prev, brand]
    );
  };

  // Extract brands from products
  const availableBrands = useMemo(() => {
    const set = new Set<string>();
    products.forEach(p => {
      if (p.brand && p.brand !== 'Khác' && p.brand !== 'Việt Nam') {
        set.add(p.brand);
      }
      const firstWord = (p.name || '').split(' ')[0];
      if (firstWord && firstWord.length > 2) {
        set.add(firstWord);
      }
    });
    return Array.from(set).slice(0, 15);
  }, [products]);

  // Filter & Sort
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      // Must be under maxPrice
      if (p.price > maxPrice) return false;

      // Filter by tag
      if (activeTag === 'deep-discount') {
        if ((p.discount || 0) < 20) return false;
      } else if (activeTag === 'fresh') {
        const cat = (p.category || '').toLowerCase();
        if (!cat.includes('rau') && !cat.includes('thịt') && !cat.includes('hải sản') && !cat.includes('trái')) {
          return false;
        }
      } else if (activeTag === 'drink-dairy') {
        const cat = (p.category || '').toLowerCase();
        if (!cat.includes('sữa') && !cat.includes('uống') && !cat.includes('nước')) {
          return false;
        }
      } else if (activeTag === 'dry-food') {
        const cat = (p.category || '').toLowerCase();
        if (!cat.includes('gia vị') && !cat.includes('gạo') && !cat.includes('khô') && !cat.includes('chế biến')) {
          return false;
        }
      } else if (activeTag === 'household') {
        const cat = (p.category || '').toLowerCase();
        if (!cat.includes('nhà') && !cat.includes('cá nhân') && !cat.includes('gia đình')) {
          return false;
        }
      }

      // Filter by brands
      if (selectedBrands.length > 0) {
        const matchesBrand = selectedBrands.some(b => 
          (p.brand && p.brand.toLowerCase().includes(b.toLowerCase())) ||
          (p.name && p.name.toLowerCase().includes(b.toLowerCase()))
        );
        if (!matchesBrand) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'discount-desc') {
        return (b.discount || 0) - (a.discount || 0);
      }
      if (sortBy === 'price-asc') {
        return a.price - b.price;
      }
      if (sortBy === 'price-desc') {
        return b.price - a.price;
      }
      if (sortBy === 'popular') {
        return (b.soldCount || 0) - (a.soldCount || 0);
      }
      return 0;
    });
  }, [products, activeTag, maxPrice, selectedBrands, sortBy]);

  return (
    <div className="bg-slate-50 min-h-screen py-6">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-6">
          <Link href="/" className="hover:text-emerald-700 transition-colors">Trang chủ</Link>
          <ChevronRight size={14} className="text-slate-400" />
          <span className="text-slate-900 font-semibold">Khuyến mãi & Ưu đãi</span>
        </div>

        {/* Hero Banner Header */}
        <div className="relative rounded-xl overflow-hidden bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 text-white p-6 md:p-8 mb-8 border border-emerald-900 shadow-sm">
          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 text-xs font-semibold mb-3">
              <Tag size={13} />
              Chương trình khuyến mãi tháng 11/2026
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white mb-2">
              Khuyến Mãi & Ưu Đãi Đặc Quyền C.T Mart
            </h1>
            <p className="text-emerald-100/90 text-sm md:text-base mb-4 leading-relaxed">
              Trải nghiệm thực phẩm tươi sạch an toàn chuẩn VietGAP, nông sản thu hoạch trong ngày cùng hàng trăm ưu đãi giảm giá sâu lên đến 50%.
            </p>
            <div className="flex flex-wrap items-center gap-4 text-xs text-emerald-200">
              <span className="flex items-center gap-1.5"><ShieldCheck size={15} className="text-emerald-400" /> 100% Chính Hãng</span>
              <span className="flex items-center gap-1.5"><Clock size={15} className="text-emerald-400" /> Giao Siêu Tốc 1-2h</span>
              <span className="flex items-center gap-1.5"><Percent size={15} className="text-emerald-400" /> Hoàn Tiền Khi Không Hài Lòng</span>
            </div>
          </div>
        </div>

        {/* Exclusive Voucher Wall */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Gift size={20} className="text-emerald-700" />
              <h2 className="text-lg font-bold text-slate-900">Mã Giảm Giá Độc Quyền</h2>
            </div>
            <span className="text-xs text-slate-500">Thu thập mã để áp dụng tại bước thanh toán</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {(dynamicVouchers.length > 0 ? dynamicVouchers.map(dv => ({
              code: dv.code,
              title: dv.title,
              desc: dv.description || (dv.minOrderValue > 0 ? `Đơn hàng tối thiểu từ ${dv.minOrderValue.toLocaleString('vi-VN')}đ` : 'Áp dụng cho mọi giá trị giỏ hàng'),
              minSpend: dv.minOrderValue,
              discountAmount: dv.discountValue,
              expiry: 'Đang mở áp dụng',
              tag: dv.discountType === 'PERCENT' ? `Giảm ${dv.discountValue}%` : (dv.code.includes('SHIP') ? 'Freeship' : `Giảm ${dv.discountValue.toLocaleString('vi-VN')}đ`),
              color: dv.discountType === 'PERCENT' ? 'border-purple-200 bg-purple-50/60 text-purple-800' : (dv.code.includes('SHIP') ? 'border-emerald-200 bg-emerald-50/60 text-emerald-800' : 'border-sky-200 bg-sky-50/60 text-sky-800'),
            })) : VOUCHERS).map((v) => {
              const isCopied = copiedCode === v.code;
              return (
                <div 
                  key={v.code}
                  className={`border rounded-lg p-4 bg-white shadow-sm flex flex-col justify-between transition-all hover:shadow-md ${v.color}`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-white/80 border border-current">
                        {v.tag}
                      </span>
                      <span className="text-[11px] text-slate-500">{v.expiry}</span>
                    </div>
                    <div className="font-bold text-slate-900 text-sm mb-1">{v.title}</div>
                    <div className="text-xs text-slate-600 mb-3 leading-snug">{v.desc}</div>
                  </div>

                  <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between">
                    <span className="font-mono font-bold text-xs text-slate-800 bg-slate-100 px-2 py-1 rounded border border-slate-200">
                      {v.code}
                    </span>
                    <button
                      onClick={() => handleCopyVoucher(v.code)}
                      className={`text-xs font-semibold px-3 py-1 rounded transition-colors flex items-center gap-1 ${
                        isCopied 
                          ? 'bg-emerald-700 text-white' 
                          : 'bg-slate-900 hover:bg-slate-800 text-white'
                      }`}
                    >
                      {isCopied ? (
                        <>
                          <Check size={12} /> Đã chép
                        </>
                      ) : (
                        <>
                          <Copy size={12} /> Sao chép
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Promotion Category Tabs */}
        <div className="bg-white rounded-lg p-2 border border-slate-200 shadow-sm mb-6 flex gap-2 overflow-x-auto">
          {PROMO_TAGS.map(tag => (
            <button
              key={tag.id}
              onClick={() => setActiveTag(tag.id)}
              className={`px-4 py-2 rounded-md text-xs md:text-sm font-semibold whitespace-nowrap transition-colors ${
                activeTag === tag.id
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {tag.label}
            </button>
          ))}
        </div>

        {/* Main Content: Filter + Product Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar Filters */}
          <div className="lg:col-span-1">
            <FilterSidebar
              categories={categories}
              brands={availableBrands}
              selectedBrands={selectedBrands}
              onBrandChange={handleBrandChange}
              maxPrice={maxPrice}
              onPriceChange={setMaxPrice}
            />
          </div>

          {/* Product Grid Area */}
          <div className="lg:col-span-3">
            {/* Sort & Stats Bar */}
            <div className="bg-white rounded-lg p-3 border border-slate-200 shadow-sm mb-4 flex flex-wrap items-center justify-between gap-3 text-xs md:text-sm">
              <div className="text-slate-600">
                Tìm thấy <b className="text-slate-900 font-bold">{filteredProducts.length}</b> sản phẩm ưu đãi
              </div>

              <div className="flex items-center gap-2">
                <span className="text-slate-500 flex items-center gap-1">
                  <ArrowUpDown size={13} /> Sắp xếp:
                </span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-slate-800 rounded px-2.5 py-1 text-xs font-medium focus:outline-none focus:border-emerald-600"
                >
                  <option value="discount-desc">Giảm giá nhiều nhất</option>
                  <option value="price-asc">Giá từ thấp đến cao</option>
                  <option value="price-desc">Giá từ cao đến thấp</option>
                  <option value="popular">Bán chạy nhất</option>
                </select>
              </div>
            </div>

            {/* Grid */}
            {loading ? (
              <div className="bg-white rounded-lg p-12 border border-slate-200 text-center">
                <RefreshCw size={24} className="animate-spin text-emerald-700 mx-auto mb-2" />
                <p className="text-sm text-slate-500">Đang tải danh sách sản phẩm khuyến mãi...</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="bg-white rounded-lg p-12 border border-slate-200 text-center">
                <ShoppingBag size={40} className="text-slate-300 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-800 mb-1">Không có sản phẩm nào phù hợp</h3>
                <p className="text-xs text-slate-500 mb-4">Vui lòng thử điều chỉnh lại mức giá hoặc bộ lọc thương hiệu.</p>
                <button
                  onClick={() => {
                    setMaxPrice(1000000);
                    setSelectedBrands([]);
                    setActiveTag('all');
                  }}
                  className="text-xs font-semibold px-4 py-2 bg-emerald-700 text-white rounded hover:bg-emerald-800 transition-colors"
                >
                  Đặt lại bộ lọc
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
                  {filteredProducts.slice(0, visibleCount).map(product => (
                    <ProductCard
                      key={product.id}
                      id={product.id}
                      name={product.name}
                      price={product.price}
                      oldPrice={product.oldPrice}
                      discount={product.discount}
                      imageUrl={product.imageUrl}
                      rating={product.rating}
                      soldCount={product.soldCount}
                      totalStock={product.totalStock}
                      unit={product.unit}
                      sku={product.sku}
                    />
                  ))}
                </div>

                {/* Pagination & Load More */}
                <PaginationControls
                  totalItems={filteredProducts.length}
                  itemsPerPage={PAGE_SIZE}
                  currentPage={currentPage}
                  visibleCount={visibleCount}
                  onPageChange={(p) => {
                    setCurrentPage(p);
                    setVisibleCount(p * PAGE_SIZE);
                    window.scrollTo({ top: 380, behavior: 'smooth' });
                  }}
                  onLoadMore={() => {
                    setVisibleCount(prev => prev + PAGE_SIZE);
                  }}
                  mode="BOTH"
                />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

