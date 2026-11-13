"use client";

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
  ChevronRight, Zap, Clock, Timer, Flame, 
  TrendingUp, ShoppingCart, RefreshCw, AlertCircle, CheckCircle2 
} from 'lucide-react';
import { ProductCard } from '@/features/catalog';
import { PaginationControls } from '@/shared';
import { getProducts, Product } from '@/lib/api';

const TIME_SLOTS = [
  { id: 'slot-1', time: '09:00 - 11:00', label: 'Đã kết thúc', status: 'ENDED' },
  { id: 'slot-2', time: '12:00 - 14:00', label: 'Đã kết thúc', status: 'ENDED' },
  { id: 'slot-3', time: '18:00 - 21:00', label: 'Đang diễn ra', status: 'ACTIVE' },
  { id: 'slot-4', time: '21:00 - 23:59', label: 'Sắp diễn ra', status: 'UPCOMING' },
];

const CATEGORY_TABS = [
  { id: 'all', label: 'Tất cả' },
  { id: 'meat-seafood', label: 'Thịt & Hải sản tươi' },
  { id: 'veggies', label: 'Rau củ quả tươi' },
  { id: 'dairy', label: 'Sữa & Đồ uống' },
  { id: 'dry', label: 'Bách hóa & Gia vị' },
];

// Countdown Timer tách riêng để không re-render toàn bộ danh sách sản phẩm mỗi 1 giây
function FlashSaleCountdownBanner() {
  const [timeLeft, setTimeLeft] = useState({ hours: 1, minutes: 45, seconds: 20 });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        if (prev.hours > 0) return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        return { hours: 2, minutes: 59, seconds: 59 };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const padZero = (n: number) => n.toString().padStart(2, '0');

  return (
    <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4 md:p-5 flex flex-col items-center shrink-0">
      <span className="text-xs uppercase tracking-wider font-semibold text-rose-100 mb-2 flex items-center gap-1.5">
        <Timer size={14} /> Kết thúc trong
      </span>
      <div className="flex items-center gap-2">
        <div className="bg-slate-900 text-white font-mono font-bold text-lg md:text-xl px-2.5 py-1.5 rounded-md min-w-[42px] text-center shadow-inner">
          {padZero(timeLeft.hours)}
        </div>
        <span className="font-bold text-lg">:</span>
        <div className="bg-slate-900 text-white font-mono font-bold text-lg md:text-xl px-2.5 py-1.5 rounded-md min-w-[42px] text-center shadow-inner">
          {padZero(timeLeft.minutes)}
        </div>
        <span className="font-bold text-lg">:</span>
        <div className="bg-slate-900 text-white font-mono font-bold text-lg md:text-xl px-2.5 py-1.5 rounded-md min-w-[42px] text-center shadow-inner">
          {padZero(timeLeft.seconds)}
        </div>
      </div>
    </div>
  );
}

export default function FlashSalePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState('slot-3');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Pagination & Load More State
  const PAGE_SIZE = 15;
  const [visibleCount, setVisibleCount] = useState<number>(PAGE_SIZE);
  const [currentPage, setCurrentPage] = useState<number>(1);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
    setCurrentPage(1);
  }, [selectedSlot, selectedCategory]);

  useEffect(() => {
    async function loadFlashSaleData() {
      setLoading(true);
      try {
        const res = await getProducts({ limit: 60 });
        const items = res.items || [];
        // Đồng bộ ưu tiên các sản phẩm thực tế được kích hoạt Flash Sale từ Web Quản Trị
        const flashSaleList = items.map((p: any, idx: number) => {
          const discount = p.discount > 0 ? p.discount : (idx % 3 === 0 ? 35 : idx % 2 === 0 ? 25 : 15);
          const price = p.price;
          const oldPrice = p.oldPrice || Math.round(price / (1 - (discount || 20) / 100));
          const soldCount = p.soldCount || ((idx * 17) % 85) + 12;
          const totalStock = p.totalStock !== undefined ? Number(p.totalStock) : 0;
          return {
            ...p,
            discount,
            price,
            oldPrice,
            soldCount,
            totalStock
          };
        }).sort((a: any, b: any) => {
          if (a.isFlashSale && !b.isFlashSale) return -1;
          if (!a.isFlashSale && b.isFlashSale) return 1;
          return (b.discount || 0) - (a.discount || 0);
        });
        setProducts(flashSaleList);
      } catch (err) {
        console.error('Failed to load flash sale products:', err);
      } finally {
        setLoading(false);
      }
    }
    loadFlashSaleData();

    // Lắng nghe cập nhật giá Flash Sale tức thời (<1s) qua WebSocket
    const handleProductUpdated = (e: any) => {
      const updated = e.detail;
      if (!updated) return;
      setProducts(prev => {
        const index = prev.findIndex(p => p.id === updated.id || p.sku === updated.sku);
        const price = Number(updated.price);
        const discount = updated.discountPercent !== undefined ? updated.discountPercent : 20;
        const oldPrice = updated.originalPrice 
          ? Number(updated.originalPrice) 
          : Math.round(price / (1 - (discount || 20) / 100));

        if (index >= 0) {
          // Nếu gỡ khỏi Flash Sale
          if (updated.isFlashSale === false) {
            return prev.filter((_, i) => i !== index);
          }
          const next = [...prev];
          next[index] = {
            ...next[index],
            ...updated,
            price,
            oldPrice,
            discount,
            isFlashSale: true,
          };
          return next;
        } else if (updated.isFlashSale) {
          // Nếu vừa mới thêm vào Flash Sale, đưa ngay lên đầu
          return [{
            id: updated.id,
            sku: updated.sku,
            name: updated.name || 'Sản phẩm Flash Sale mới',
            price,
            oldPrice,
            discount,
            soldCount: updated.soldCount || 1,
            totalStock: updated.stock !== undefined ? Number(updated.stock) : 0,
            imageUrl: updated.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=120',
            category: updated.category || 'Bách hóa',
            rating: updated.rating || 5,
            brand: 'C.T Mart',
            isFlashSale: true,
          } as Product, ...prev];
        }
        return prev;
      });
    };

    window.addEventListener('sfwms:product_updated', handleProductUpdated);
    return () => window.removeEventListener('sfwms:product_updated', handleProductUpdated);
  }, []);

  // Filter products by selected Category
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      if (selectedCategory === 'all') return true;
      const cat = (p.category || '').toLowerCase();
      if (selectedCategory === 'meat-seafood') {
        return cat.includes('thịt') || cat.includes('hải sản') || cat.includes('cá') || cat.includes('tôm');
      }
      if (selectedCategory === 'veggies') {
        return cat.includes('rau') || cat.includes('củ') || cat.includes('trái') || cat.includes('nấm');
      }
      if (selectedCategory === 'dairy') {
        return cat.includes('sữa') || cat.includes('uống') || cat.includes('nước') || cat.includes('trà');
      }
      if (selectedCategory === 'dry') {
        return cat.includes('gia vị') || cat.includes('gạo') || cat.includes('khô') || cat.includes('bánh');
      }
      return true;
    });
  }, [products, selectedCategory]);

  const padZero = (n: number) => String(n).padStart(2, '0');

  return (
    <div className="bg-slate-50 min-h-screen py-6">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-6">
          <Link href="/" className="hover:text-emerald-700 transition-colors">Trang chủ</Link>
          <ChevronRight size={14} className="text-slate-400" />
          <span className="text-slate-900 font-semibold">Flash Sale Giờ Vàng</span>
        </div>

        {/* Hero Banner with Countdown Header */}
        <div className="rounded-xl overflow-hidden bg-gradient-to-r from-red-700 via-rose-700 to-amber-700 text-white p-6 md:p-8 mb-8 border border-red-800 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-bold mb-3">
                <Zap size={14} className="fill-white" />
                SIÊU GIỜ VÀNG - SỐ LƯỢNG CÓ HẠN
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-2">
                Flash Sale Hôm Nay - Giảm Sốc Đến 50%
              </h1>
              <p className="text-rose-100 text-xs md:text-sm max-w-2xl leading-relaxed">
                Đợt giảm giá đặc biệt áp dụng cho sản phẩm thực phẩm tươi trong ngày và nhu yếu phẩm cao cấp. Mua ngay trước khi hết suất!
              </p>
            </div>

            {/* Countdown Box độc lập */}
            <FlashSaleCountdownBanner />
          </div>
        </div>

        {/* Time Slots Selector */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {TIME_SLOTS.map((slot) => {
            const isSelected = selectedSlot === slot.id;
            const isActive = slot.status === 'ACTIVE';
            const isUpcoming = slot.status === 'UPCOMING';
            return (
              <button
                key={slot.id}
                onClick={() => setSelectedSlot(slot.id)}
                className={`p-3 rounded-lg border text-left transition-all ${
                  isSelected
                    ? 'bg-rose-700 text-white border-rose-800 shadow-sm'
                    : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className={`font-mono font-bold text-sm md:text-base ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                  {slot.time}
                </div>
                <div className="flex items-center gap-1.5 mt-1 text-xs">
                  {isActive && <span className={`inline-block w-2 h-2 rounded-full ${isSelected ? 'bg-amber-300' : 'bg-rose-600'} animate-ping`} />}
                  <span className={isSelected ? 'text-rose-100 font-semibold' : isActive ? 'text-rose-600 font-bold' : isUpcoming ? 'text-emerald-700 font-medium' : 'text-slate-400'}>
                    {slot.label}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Category Pills */}
        <div className="bg-white rounded-lg p-2 border border-slate-200 shadow-sm mb-6 flex gap-2 overflow-x-auto">
          {CATEGORY_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setSelectedCategory(tab.id)}
              className={`px-4 py-2 rounded-md text-xs md:text-sm font-semibold whitespace-nowrap transition-colors ${
                selectedCategory === tab.id
                  ? 'bg-rose-700 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Notice Bar */}
        <div className="bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 rounded-lg mb-6 flex items-center justify-between text-xs md:text-sm">
          <div className="flex items-center gap-2">
            <Flame size={16} className="text-amber-600 shrink-0" />
            <span>Mỗi tài khoản được áp dụng giá Flash Sale tối đa <b>3 sản phẩm</b> cùng loại.</span>
          </div>
          <span className="text-xs text-amber-700 hidden sm:inline">Cam kết giao siêu tốc 1-2h từ kho gần nhất</span>
        </div>

        {/* Product Grid */}
        {loading ? (
          <div className="bg-white rounded-lg p-12 border border-slate-200 text-center">
            <RefreshCw size={24} className="animate-spin text-rose-600 mx-auto mb-2" />
            <p className="text-sm text-slate-500">Đang cập nhật sản phẩm Flash Sale giờ vàng...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="bg-white rounded-lg p-12 border border-slate-200 text-center">
            <AlertCircle size={36} className="text-slate-300 mx-auto mb-2" />
            <h3 className="text-base font-bold text-slate-800">Không có sản phẩm trong danh mục này</h3>
            <p className="text-xs text-slate-500 mt-1">Vui lòng chọn danh mục khác hoặc theo dõi khung giờ tiếp theo.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
              {filteredProducts.slice(0, visibleCount).map(product => {
                const soldPercent = Math.min(100, Math.round(((product.soldCount || 10) / (product.totalStock || 100)) * 100));
                return (
                  <div key={product.id} className="flex flex-col bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                    <div className="relative">
                      <ProductCard
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
                    </div>

                    {/* Flash Sale Progress Bar in footer */}
                    <div className="p-2.5 pt-0 mt-auto bg-white border-t border-slate-100">
                      <div className="flex items-center justify-between text-[11px] text-slate-600 font-medium mb-1">
                        <span className="flex items-center gap-1 text-rose-600 font-bold">
                          <Flame size={12} className="fill-rose-600 text-rose-600" /> Đã bán {product.soldCount || 12}
                        </span>
                        <span>Còn lại {Math.max(0, (product.totalStock ?? 0) - (product.soldCount || 0))}</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-rose-500 to-amber-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${soldPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
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
  );
}

