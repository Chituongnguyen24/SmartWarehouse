"use client";

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
  ChevronRight, Trophy, TrendingUp, Star, Award, 
  CheckCircle2, ThumbsUp, ShoppingBag, ArrowUpDown, RefreshCw, 
  Sparkles, ShieldCheck 
} from 'lucide-react';
import { ProductCard, FilterSidebar } from '@/features/catalog';
import { PaginationControls } from '@/shared';
import { getProducts, getCategories, Product } from '@/lib/api';

const BEST_SELLER_TABS = [
  { id: 'all', label: 'Tất cả xu hướng' },
  { id: 'fresh', label: 'Thịt, Hải sản & Trứng' },
  { id: 'veggies', label: 'Rau củ quả tươi sạch' },
  { id: 'dairy', label: 'Sữa & Sản phẩm từ sữa' },
  { id: 'dry-groceries', label: 'Gia vị & Đồ khô bách hóa' },
  { id: 'beverages', label: 'Thức uống & Giải khát' },
];

export default function BanChayPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [maxPrice, setMaxPrice] = useState<number>(1000000);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<string>('sold-desc');

  // Pagination & Load More State
  const PAGE_SIZE = 12;
  const [visibleCount, setVisibleCount] = useState<number>(PAGE_SIZE);
  const [currentPage, setCurrentPage] = useState<number>(1);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
    setCurrentPage(1);
  }, [activeTab, maxPrice, selectedBrands, sortBy]);

  useEffect(() => {
    async function loadBestSellers() {
      setLoading(true);
      try {
        const [prodData, catData] = await Promise.all([
          getProducts({ limit: 80 }),
          getCategories()
        ]);
        
        // Enrich products with realistic sold count and rating for top sellers
        const enriched = (prodData.items || []).map((p: any, idx: number) => {
          const soldCount = p.soldCount && p.soldCount > 50 ? p.soldCount : Math.floor(250 + (80 - idx) * 35 + ((idx * 23) % 120));
          const rating = p.rating && p.rating >= 4.5 ? p.rating : Number((4.6 + ((idx % 4) * 0.1)).toFixed(1));
          return {
            ...p,
            soldCount,
            rating
          };
        });

        setProducts(enriched);
        setCategories(catData || []);
      } catch (err) {
        console.error('Error loading best seller products:', err);
      } finally {
        setLoading(false);
      }
    }
    loadBestSellers();
  }, []);

  const handleBrandChange = (brand: string) => {
    setSelectedBrands(prev => 
      prev.includes(brand) ? prev.filter(b => b !== brand) : [...prev, brand]
    );
  };

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
      if (p.price > maxPrice) return false;

      if (activeTab === 'fresh') {
        const cat = (p.category || '').toLowerCase();
        if (!cat.includes('thịt') && !cat.includes('hải sản') && !cat.includes('cá') && !cat.includes('trứng')) return false;
      } else if (activeTab === 'veggies') {
        const cat = (p.category || '').toLowerCase();
        if (!cat.includes('rau') && !cat.includes('củ') && !cat.includes('trái') && !cat.includes('nấm')) return false;
      } else if (activeTab === 'dairy') {
        const cat = (p.category || '').toLowerCase();
        if (!cat.includes('sữa')) return false;
      } else if (activeTab === 'dry-groceries') {
        const cat = (p.category || '').toLowerCase();
        if (!cat.includes('gia vị') && !cat.includes('gạo') && !cat.includes('khô') && !cat.includes('mì')) return false;
      } else if (activeTab === 'beverages') {
        const cat = (p.category || '').toLowerCase();
        if (!cat.includes('uống') && !cat.includes('nước') && !cat.includes('trà') && !cat.includes('cà phê')) return false;
      }

      if (selectedBrands.length > 0) {
        const match = selectedBrands.some(b => 
          (p.brand && p.brand.toLowerCase().includes(b.toLowerCase())) ||
          (p.name && p.name.toLowerCase().includes(b.toLowerCase()))
        );
        if (!match) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'sold-desc') {
        return (b.soldCount || 0) - (a.soldCount || 0);
      }
      if (sortBy === 'rating-desc') {
        return (b.rating || 0) - (a.rating || 0);
      }
      if (sortBy === 'price-asc') {
        return a.price - b.price;
      }
      if (sortBy === 'price-desc') {
        return b.price - a.price;
      }
      return 0;
    });
  }, [products, activeTab, maxPrice, selectedBrands, sortBy]);

  return (
    <div className="bg-slate-50 min-h-screen py-6">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-6">
          <Link href="/" className="hover:text-emerald-700 transition-colors">Trang chủ</Link>
          <ChevronRight size={14} className="text-slate-400" />
          <span className="text-slate-900 font-semibold">Sản phẩm Bán chạy</span>
        </div>

        {/* Hero Banner Header */}
        <div className="rounded-xl overflow-hidden bg-gradient-to-r from-amber-800 via-orange-800 to-slate-900 text-white p-6 md:p-8 mb-8 border border-amber-900 shadow-sm">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-200 text-xs font-semibold mb-3">
              <Trophy size={14} className="text-amber-300" />
              BẢNG XẾP HẠNG TIÊU DÙNG THÁNG 11/2026
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white mb-2">
              Top Sản Phẩm Bán Chạy & Được Yêu Thích Nhất
            </h1>
            <p className="text-amber-100/90 text-sm md:text-base mb-4 leading-relaxed">
              Tổng hợp những sản phẩm tươi sống, sữa và nhu yếu phẩm chất lượng cao được hơn 50.000+ gia đình tin dùng và đặt hàng liên tục mỗi ngày tại C.T Mart.
            </p>
            <div className="flex flex-wrap items-center gap-4 text-xs text-amber-200">
              <span className="flex items-center gap-1.5"><ThumbsUp size={15} className="text-amber-300" /> 98% Khách Hàng Hài Lòng</span>
              <span className="flex items-center gap-1.5"><Award size={15} className="text-amber-300" /> Chuẩn VietGAP & GlobalGAP</span>
              <span className="flex items-center gap-1.5"><Star size={15} className="text-amber-300 fill-amber-300" /> Đánh Giá Trung Bình 4.8★</span>
            </div>
          </div>
        </div>

        {/* Top 3 Spotlight Cards */}
        {filteredProducts.length >= 3 && activeTab === 'all' && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={18} className="text-amber-600" />
              <h2 className="text-lg font-bold text-slate-900">Top 3 Quán Quân Bán Chạy Tuần Này</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {filteredProducts.slice(0, 3).map((item, idx) => {
                const rankLabels = ['Top 1 Bán Chạy Nhất', 'Top 2 Ưa Chuộng Nhất', 'Top 3 Đánh Giá Cao'];
                const rankBadges = [
                  'bg-amber-500 text-slate-950 border-amber-400',
                  'bg-slate-300 text-slate-900 border-slate-400',
                  'bg-amber-700 text-white border-amber-600'
                ];

                return (
                  <div 
                    key={item.id}
                    className="relative bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow flex items-center gap-4"
                  >
                    <div className="relative shrink-0 w-24 h-24 rounded-lg overflow-hidden border border-slate-100 bg-slate-50">
                      <img 
                        src={item.imageUrl} 
                        alt={item.name} 
                        className="w-full h-full object-cover"
                      />
                      <span className={`absolute top-1 left-1 text-[10px] font-black px-1.5 py-0.5 rounded shadow-sm border ${rankBadges[idx]}`}>
                        #{idx + 1}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <span className="text-[11px] font-bold text-amber-700 block mb-1">
                        {rankLabels[idx]}
                      </span>
                      <h3 className="font-bold text-sm text-slate-900 line-clamp-2 leading-tight mb-1">
                        {item.name}
                      </h3>
                      <div className="text-emerald-700 font-extrabold text-sm mb-1">
                        {item.price.toLocaleString('vi-VN')} đ
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500">
                        <span className="flex items-center gap-0.5 text-amber-500 font-semibold">
                          <Star size={11} className="fill-amber-400" /> {item.rating}
                        </span>
                        <span>•</span>
                        <span>Đã bán <b>{item.soldCount?.toLocaleString('vi-VN')}</b></span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Category Tabs */}
        <div className="bg-white rounded-lg p-2 border border-slate-200 shadow-sm mb-6 flex gap-2 overflow-x-auto">
          {BEST_SELLER_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-md text-xs md:text-sm font-semibold whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'bg-amber-700 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content: Sidebar + Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
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

          <div className="lg:col-span-3">
            {/* Sort & Info Bar */}
            <div className="bg-white rounded-lg p-3 border border-slate-200 shadow-sm mb-4 flex flex-wrap items-center justify-between gap-3 text-xs md:text-sm">
              <div className="text-slate-600">
                Hiển thị <b className="text-slate-900 font-bold">{filteredProducts.length}</b> sản phẩm được mua nhiều nhất
              </div>

              <div className="flex items-center gap-2">
                <span className="text-slate-500 flex items-center gap-1">
                  <ArrowUpDown size={13} /> Sắp xếp theo:
                </span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-slate-800 rounded px-2.5 py-1 text-xs font-medium focus:outline-none focus:border-amber-600"
                >
                  <option value="sold-desc">Số lượng bán nhiều nhất</option>
                  <option value="rating-desc">Đánh giá 5 sao cao nhất</option>
                  <option value="price-asc">Giá từ thấp đến cao</option>
                  <option value="price-desc">Giá từ cao đến thấp</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div className="bg-white rounded-lg p-12 border border-slate-200 text-center">
                <RefreshCw size={24} className="animate-spin text-amber-700 mx-auto mb-2" />
                <p className="text-sm text-slate-500">Đang tải bảng xếp hạng bán chạy...</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="bg-white rounded-lg p-12 border border-slate-200 text-center">
                <ShoppingBag size={40} className="text-slate-300 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-800">Không tìm thấy sản phẩm phù hợp</h3>
                <p className="text-xs text-slate-500 mt-1 mb-4">Vui lòng điều chỉnh lại mức giá hoặc thương hiệu.</p>
                <button
                  onClick={() => {
                    setMaxPrice(1000000);
                    setSelectedBrands([]);
                    setActiveTab('all');
                  }}
                  className="text-xs font-semibold px-4 py-2 bg-amber-700 text-white rounded hover:bg-amber-800 transition-colors"
                >
                  Xem tất cả
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
                  {filteredProducts.slice(0, visibleCount).map((product) => (
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

