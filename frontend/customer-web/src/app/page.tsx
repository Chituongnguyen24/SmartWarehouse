"use client";

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { 
  Zap, 
  ChevronRight, 
  ChevronLeft,
  Apple, 
  Beef, 
  Milk, 
  Carrot, 
  Coffee, 
  ShoppingBag, 
  Clock, 
  Phone,
  Flame,
  Trophy,
  Sparkles,
  Percent,
  ArrowRight
} from 'lucide-react';
import { motion, Variants } from 'framer-motion';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { ProductCard, getCategoryVisual } from '@/features/catalog';

import { 
  PROMO_BANNERS, 
  BRANDS, 
  QUICK_LINKS, 
  MOCK_RECIPES, 
  ARTICLES, 
  CATEGORIES, 
  BANNERS, 
  SUB_BANNERS 
} from '@/lib/mockData';
import { getProducts, getCategories, getVouchers, Product, CategoryData, VoucherItem } from '@/lib/api';

// Tách riêng Countdown Timer thành component độc lập để không gây re-render toàn bộ trang mỗi giây
function FlashSaleCountdown() {
  const [timeLeft, setTimeLeft] = useState({ hours: 2, minutes: 15, seconds: 45 });
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        if (prev.hours > 0) return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        return { hours: 2, minutes: 15, seconds: 45 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);
  const formatTime = (v: number) => v.toString().padStart(2, '0');

  return (
    <div className="flex items-center gap-1.5 text-white font-mono font-bold">
      <div className="bg-foreground rounded md px-2 py-1 shadow-inner">{formatTime(timeLeft.hours)}</div>
      <span className="text-foreground font-bold">:</span>
      <div className="bg-foreground rounded md px-2 py-1 shadow-inner">{formatTime(timeLeft.minutes)}</div>
      <span className="text-foreground font-bold">:</span>
      <div className="bg-secondary rounded md px-2 py-1 shadow-inner animate-pulse">{formatTime(timeLeft.seconds)}</div>
    </div>
  );
}

export default function Home() {
  const [emblaRef] = useEmblaCarousel({ loop: true }, [Autoplay({ delay: 4000 })]);
  
  // Fetch real data
  const [flashSaleProducts, setFlashSaleProducts] = useState<Product[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [categoriesList, setCategoriesList] = useState<CategoryData[]>([]);
  const [vouchersList, setVouchersList] = useState<VoucherItem[]>([]);

  // Promo and Best Seller tabs & slider refs
  const [activePromoTab, setActivePromoTab] = useState(0);
  const [activeBestSellerTab, setActiveBestSellerTab] = useState(0);

  const promoScrollRef = useRef<HTMLDivElement>(null);
  const bestSellerScrollRef = useRef<HTMLDivElement>(null);

  const scrollHorizontally = (ref: React.RefObject<HTMLDivElement | null>, direction: 'left' | 'right') => {
    if (ref.current) {
      const scrollAmount = direction === 'left' ? -420 : 420;
      ref.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const PROMO_TABS = [
    { title: "Đại tiệc giảm giá", sub: "Mua nhiều ưu đãi lớn" },
    { title: "Mua kèm giảm thêm", sub: "Tiết kiệm đến 40%" },
    { title: "Lễ hội ẩm thực", sub: "Thỏa sức mua sắm" },
    { title: "Thương hiệu tuyển chọn", sub: "Hàng chuẩn chính hãng" },
    { title: "Nông sản tươi xanh", sub: "Thu hoạch trong ngày" }
  ];

  const BEST_SELLER_TABS = [
    { title: "Tất cả", sub: "Hot nhất tuần" },
    { title: "Thực phẩm tươi", sub: "Bán chạy nhất" },
    { title: "Đồ uống & Sữa", sub: "Được yêu thích" },
    { title: "Chăm sóc gia đình", sub: "Nhu yếu phẩm" }
  ];

  useEffect(() => {
    async function loadData() {
      // Fetch dynamic categories
      const cats = await getCategories();
      setCategoriesList(cats);

      // Fetch flash sale and featured products from real DB
      const flashSaleData = await getProducts({ isFlashSale: true, limit: 12 });
      const newProductsData = await getProducts({ limit: 20 });

      // Fetch dynamic active vouchers from product-service (:3010)
      const vList = await getVouchers();
      setVouchersList(vList);
      
      setFlashSaleProducts(flashSaleData.items.length > 0 ? flashSaleData.items : newProductsData.items.slice(0, 10));
      setFeaturedProducts(newProductsData.items);
    }
    loadData();

    // Lắng nghe cập nhật giá thời gian thực từ Saler/Admin qua WebSocket (<1s)
    const handleProductUpdated = (e: any) => {
      const updated = e.detail;
      if (!updated) return;
      const updateList = (prev: Product[]) =>
        prev.map(p => {
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
              isFlashSale: updated.isFlashSale !== undefined ? updated.isFlashSale : (p as any).isFlashSale,
            };
          }
          return p;
        });

      setFlashSaleProducts(updateList);
      setFeaturedProducts(updateList);
    };

    window.addEventListener('sfwms:product_updated', handleProductUpdated);
    return () => window.removeEventListener('sfwms:product_updated', handleProductUpdated);
  }, []);

  // Animation variants
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <div className="pb-16 bg-gray-50 min-h-screen">
      {/* Hero Carousel (100% Width) & Sub Banners (80% Width) */}
      <section className="mb-10 bg-white shadow-sm pb-6">
        {/* Main Carousel - 100% Viewport Width */}
        <div className="w-full relative" ref={emblaRef}>
          <div className="flex">
            {BANNERS.map((banner, idx) => (
              <div key={idx} className="flex-[0_0_100%] min-w-0 cursor-pointer">
                <div className="w-full relative overflow-hidden bg-gray-200 group">
                  <img src={banner.imageUrl} alt={`Banner ${idx + 1}`} className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-[1.01]" />
                </div>
              </div>
            ))}
          </div>
          
          {/* Bottom Gradient Overlay for all banners */}
          <div className="absolute bottom-0 left-0 right-0 h-24 md:h-40 bg-gradient-to-t from-white to-transparent pointer-events-none z-10"></div>
        </div>

        {/* Sub Banners - 80% Width Content Area */}
        <div className="w-[95%] md:w-[80%] mx-auto relative z-30 -mt-8 md:-mt-16">
          <div className="grid grid-cols-2 gap-4">
            {SUB_BANNERS.map((sub, idx) => (
              <div key={idx} className="rounded-2xl overflow-hidden shadow-sm bg-gray-200 cursor-pointer group relative">
                <img src={sub.imageUrl} alt={`Sub Banner ${idx + 1}`} className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-105" />
                <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors"></div>
              </div>
            ))}
          </div>
          
          {/* Carousel Dots placed below sub banners */}
          <div className="flex justify-center gap-2 mt-6 z-40 relative">
            {BANNERS.map((_, i) => (
              <div key={i} className={`w-2.5 h-2.5 rounded-full ${i === 0 ? 'bg-primary' : 'bg-gray-300'}`}></div>
            ))}
          </div>
        </div>
      </section>

      {/* Main Content Area - 80% Width */}
      <div className="w-[95%] md:w-[80%] mx-auto">
        
        {/* Categories Bento Grid */}
        <section className="mb-12 bg-white rounded-2xl shadow-sm p-6 border border-border">
          <div className="flex justify-between items-end mb-6">
            <div>
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2 uppercase tracking-wide">
                Danh mục thực phẩm
              </h2>
              <p className="text-xs text-muted-foreground mt-1">Đầy đủ các loại thực phẩm tươi sạch đạt chuẩn</p>
            </div>
            <Link 
              href="/tat-ca-danh-muc" 
              className="text-sm font-semibold text-primary hover:underline flex items-center gap-1"
            >
              Xem tất cả ({categoriesList.length}) &gt;
            </Link>
          </div>
          <div 
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4"
          >
            {categoriesList.slice(0, 12).map((cat) => {
              const visual = getCategoryVisual(cat.name);
              const iconSrc = cat.imageUrl || visual.iconUrl;
              return (
                <div 
                  key={cat.slug} 
                  className="flex flex-col items-center cursor-pointer group"
                >
                  <Link 
                    href={`/danh-muc/${cat.slug}`} 
                    className="flex flex-col items-center justify-between p-4 w-full h-full rounded-2xl bg-white border border-gray-100 hover:border-primary/40 shadow-xs hover:shadow-md transition-all group-hover:-translate-y-1"
                  >
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-emerald-50/60 border border-emerald-100/70 p-2 mb-3 group-hover:scale-110 transition-transform">
                      <img 
                        src={iconSrc} 
                        alt={cat.name} 
                        className="w-12 h-12 object-contain"
                        loading="lazy"
                      />
                    </div>
                    
                    <span className="text-[13px] text-center font-bold text-gray-800 group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                      {cat.name}
                    </span>
                    {cat.count > 0 && (
                      <span className="text-[11px] text-gray-500 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-full font-medium mt-2 group-hover:bg-green-50 group-hover:text-primary transition-colors">
                        {cat.count} sản phẩm
                      </span>
                    )}
                  </Link>
                </div>
              );
            })}
          </div>
        </section>

        {/* Quick Links (5 Banners) */}
        <section className="mb-8">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
            {QUICK_LINKS.map((link, idx) => (
              <Link 
                key={idx} 
                href={link.href || '#'}
                className="rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all duration-300 group cursor-pointer border border-gray-150 hover:border-primary/40 block hover:-translate-y-1 bg-white"
              >
                <img 
                  src={link.imageUrl} 
                  alt={link.title} 
                  className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-[1.03]" 
                  loading="lazy"
                />
              </Link>
            ))}
          </div>
        </section>

        {/* E-Vouchers */}
        <section className="mb-12 bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-border">
          <h2 className="text-lg font-bold text-foreground mb-4">E-voucher khuyến mãi</h2>
          <div className="flex gap-4 overflow-x-auto pb-2 snap-x [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {vouchersList.map((voucher) => (
              <div key={voucher.id || voucher.code} className="flex-[0_0_280px] md:flex-[0_0_320px] snap-start border border-border rounded-xl p-3 flex gap-3 shadow-sm hover:shadow-md transition-shadow bg-white cursor-pointer group">
                <div className="w-16 h-16 md:w-20 md:h-20 bg-emerald-600 rounded-lg flex items-center justify-center shrink-0 border border-emerald-700 overflow-hidden relative text-white font-bold text-lg">
                  {voucher.discountType === 'PERCENT' ? `${voucher.discountValue}%` : `${(voucher.discountValue / 1000).toLocaleString('vi-VN')}k`}
                </div>
                <div className="flex flex-col justify-between flex-1">
                  <div>
                    <div className="flex items-center justify-between gap-1">
                      <h3 className="font-bold text-[13px] md:text-sm text-foreground line-clamp-1 group-hover:text-primary transition-colors">{voucher.title || voucher.code}</h3>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">{voucher.code}</span>
                    </div>
                    <p className="text-[11px] md:text-xs text-muted-foreground mt-1 line-clamp-2">{voucher.description || `Đơn từ ${voucher.minOrderValue?.toLocaleString('vi-VN')}đ`}</p>
                  </div>
                  <div className="flex justify-between items-end mt-2">
                    <span className="text-[10px] md:text-[11px] text-gray-400">HSD: {voucher.endDate ? new Date(voucher.endDate).toLocaleDateString('vi-VN') : 'Vô thời hạn'}</span>
                    <span className="text-[10px] md:text-[11px] text-emerald-600 font-medium">Sao chép mã</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Khuyen Mai Hot Section */}
        <section className="mb-12 bg-white rounded-2xl border border-emerald-100 shadow-[0_4px_24px_-4px_rgba(16,185,129,0.12)] overflow-hidden">
          {/* Header Banner Cao Cấp */}
          <div className="relative bg-gradient-to-r from-emerald-800 via-teal-700 to-emerald-900 text-white px-6 py-6 md:py-7 overflow-hidden">
            {/* Họa tiết trang trí chìm tinh tế */}
            <div className="absolute inset-0 opacity-10 pointer-events-none">
              <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none">
                <path d="M0,0 L100,0 L100,100 Z" fill="white" />
              </svg>
            </div>
            <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-white/5 rounded-full blur-2xl pointer-events-none"></div>

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/15 backdrop-blur-md text-emerald-100 mb-2.5 border border-white/20">
                  <Flame size={14} className="text-amber-300" />
                  <span>ƯU ĐÃI NỔI BẬT TRONG TUẦN</span>
                </div>
                <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
                  Khuyến Mãi Hot
                  <span className="text-xs bg-amber-400 text-amber-950 font-black px-2.5 py-0.5 rounded-full uppercase tracking-normal">
                    Lên đến 50%
                  </span>
                </h2>
                <p className="text-emerald-100/80 text-xs md:text-sm mt-1 max-w-xl leading-relaxed">
                  Tuyển chọn hàng trăm sản phẩm thực phẩm tươi sạch, bách hóa gia đình với mức giá ưu đãi hấp dẫn nhất hôm nay.
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <Link 
                  href="/khuyen-mai" 
                  className="bg-white hover:bg-emerald-50 text-emerald-800 font-bold px-4 py-2.5 rounded-xl transition-all shadow-sm hover:shadow-md flex items-center gap-2 text-xs md:text-sm group"
                >
                  <span>Xem tất cả ưu đãi</span>
                  <ChevronRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>
            </div>
          </div>
          
          {/* Segmented Pill Tabs */}
          <div className="bg-slate-50/80 border-b border-gray-200/80 px-4 md:px-6 py-3 flex items-center justify-between gap-3 overflow-x-auto custom-scrollbar">
            <div className="flex items-center gap-2 shrink-0">
              {PROMO_TABS.map((tab, idx) => {
                const isActive = activePromoTab === idx;
                return (
                  <button
                    key={idx}
                    onClick={() => setActivePromoTab(idx)}
                    className={`px-4 py-2 rounded-xl text-left transition-all duration-200 flex flex-col cursor-pointer shrink-0 border ${
                      isActive 
                        ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm' 
                        : 'bg-white text-gray-700 border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/50'
                    }`}
                  >
                    <span className="text-xs md:text-[13px] font-bold leading-tight">{tab.title}</span>
                    <span className={`text-[10px] md:text-[11px] mt-0.5 leading-none ${isActive ? 'text-emerald-100' : 'text-gray-400'}`}>
                      {tab.sub}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Slider navigation buttons */}
            <div className="hidden md:flex items-center gap-1.5 shrink-0 pl-2">
              <button 
                onClick={() => scrollHorizontally(promoScrollRef, 'left')}
                className="w-8 h-8 rounded-lg bg-white border border-gray-200 hover:border-emerald-500 hover:text-emerald-700 flex items-center justify-center text-gray-600 transition-colors shadow-2xs"
                aria-label="Xem sản phẩm trước"
              >
                <ChevronLeft size={18} />
              </button>
              <button 
                onClick={() => scrollHorizontally(promoScrollRef, 'right')}
                className="w-8 h-8 rounded-lg bg-white border border-gray-200 hover:border-emerald-500 hover:text-emerald-700 flex items-center justify-center text-gray-600 transition-colors shadow-2xs"
                aria-label="Xem sản phẩm tiếp theo"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          {/* Product Row */}
          <div 
            ref={promoScrollRef}
            className="flex gap-4 overflow-x-auto p-4 md:p-6 snap-x scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] bg-white"
          >
            {featuredProducts.slice(0, 10).map((product) => (
              <div key={product.id} className="flex-[0_0_210px] md:flex-[0_0_230px] snap-start">
                <ProductCard {...product} />
              </div>
            ))}
          </div>
        </section>

        {/* Flash Sale */}
        <section className="mb-12 bg-white p-6 rounded-2xl shadow-sm border border-border">
          <div className="flex justify-between items-center mb-6 pb-4 border-b border-border/50">
            <div className="flex items-center gap-4">
              <h2 className="text-2xl font-extrabold text-secondary flex items-center gap-2 uppercase italic tracking-tight">
                <Zap size={32} fill="currentColor" className="animate-pulse" />
                Flash Sale
              </h2>
              {/* Countdown Timer độc lập - không gây re-render cả trang */}
              <FlashSaleCountdown />
            </div>
            
            <Link href="/flash-sale" className="text-primary font-semibold text-sm hover:underline flex items-center bg-green-50 px-3 py-1.5 rounded-full transition-colors hover:bg-blue-100">
              Xem tất cả <ChevronRight size={16} />
            </Link>
          </div>
          
          <div 
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4"
          >
            {flashSaleProducts.slice(0, 10).map((product) => (
              <div key={product.id}>
                <ProductCard {...product} />
              </div>
            ))}
          </div>
        </section>

        {/* Promotional Banners (3 Large Banners) */}
        <section className="mb-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
            {PROMO_BANNERS.map((promo, idx) => (
              <Link 
                key={idx} 
                href={(promo as any).href || '#'}
                className="relative rounded-2xl overflow-hidden group cursor-pointer border border-gray-150 hover:border-primary/40 shadow-xs hover:shadow-md transition-all duration-300 hover:-translate-y-1 bg-white block aspect-square"
              >
                <img 
                  src={promo.img} 
                  alt={promo.title} 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" 
                  loading="lazy"
                />
              </Link>
            ))}
          </div>
        </section>

        {/* Featured Products / Best Sellers */}
        <section className="mb-12 bg-white rounded-2xl border border-orange-100 shadow-[0_4px_24px_-4px_rgba(249,115,22,0.12)] overflow-hidden">
          {/* Header Banner Cao Cấp */}
          <div className="relative bg-gradient-to-r from-amber-700 via-orange-600 to-amber-800 text-white px-6 py-6 md:py-7 overflow-hidden">
            <div className="absolute inset-0 opacity-10 pointer-events-none">
              <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none">
                <circle cx="90" cy="10" r="40" fill="white" />
              </svg>
            </div>
            <div className="absolute -right-8 -bottom-8 w-44 h-44 bg-white/5 rounded-full blur-xl pointer-events-none"></div>

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/15 backdrop-blur-md text-amber-100 mb-2.5 border border-white/20">
                  <Trophy size={14} className="text-amber-200" />
                  <span>XU HƯỚNG MUA SẮM</span>
                </div>
                <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
                  Top Bán Chạy Trong Tuần
                  <span className="text-xs bg-white text-orange-700 font-black px-2.5 py-0.5 rounded-full uppercase tracking-normal">
                    Hot Trend
                  </span>
                </h2>
                <p className="text-orange-100/80 text-xs md:text-sm mt-1 max-w-xl leading-relaxed">
                  Những sản phẩm được hàng nghìn khách hàng tin chọn và đặt mua nhiều nhất trong 7 ngày qua.
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <Link 
                  href="/ban-chay" 
                  className="bg-white hover:bg-orange-50 text-orange-700 font-bold px-4 py-2.5 rounded-xl transition-all shadow-sm hover:shadow-md flex items-center gap-2 text-xs md:text-sm group"
                >
                  <span>Xem bảng xếp hạng</span>
                  <ChevronRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>
            </div>
          </div>

          {/* Segmented Pill Tabs */}
          <div className="bg-slate-50/80 border-b border-gray-200/80 px-4 md:px-6 py-3 flex items-center justify-between gap-3 overflow-x-auto custom-scrollbar">
            <div className="flex items-center gap-2 shrink-0">
              {BEST_SELLER_TABS.map((tab, idx) => {
                const isActive = activeBestSellerTab === idx;
                return (
                  <button
                    key={idx}
                    onClick={() => setActiveBestSellerTab(idx)}
                    className={`px-4 py-2 rounded-xl text-left transition-all duration-200 flex flex-col cursor-pointer shrink-0 border ${
                      isActive 
                        ? 'bg-orange-600 text-white border-orange-600 shadow-sm' 
                        : 'bg-white text-gray-700 border-gray-200 hover:border-orange-300 hover:bg-orange-50/50'
                    }`}
                  >
                    <span className="text-xs md:text-[13px] font-bold leading-tight">{tab.title}</span>
                    <span className={`text-[10px] md:text-[11px] mt-0.5 leading-none ${isActive ? 'text-orange-100' : 'text-gray-400'}`}>
                      {tab.sub}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Slider navigation buttons */}
            <div className="hidden md:flex items-center gap-1.5 shrink-0 pl-2">
              <button 
                onClick={() => scrollHorizontally(bestSellerScrollRef, 'left')}
                className="w-8 h-8 rounded-lg bg-white border border-gray-200 hover:border-orange-500 hover:text-orange-600 flex items-center justify-center text-gray-600 transition-colors shadow-2xs"
                aria-label="Xem sản phẩm trước"
              >
                <ChevronLeft size={18} />
              </button>
              <button 
                onClick={() => scrollHorizontally(bestSellerScrollRef, 'right')}
                className="w-8 h-8 rounded-lg bg-white border border-gray-200 hover:border-orange-500 hover:text-orange-600 flex items-center justify-center text-gray-600 transition-colors shadow-2xs"
                aria-label="Xem sản phẩm tiếp theo"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          {/* Product Row */}
          <div 
            ref={bestSellerScrollRef}
            className="flex gap-4 overflow-x-auto p-4 md:p-6 snap-x scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] bg-white"
          >
            {featuredProducts.slice().reverse().map((product) => (
              <div key={product.id} className="flex-[0_0_210px] md:flex-[0_0_230px] snap-start">
                <ProductCard {...product} />
              </div>
            ))}
          </div>
        </section>

        {/* Cơm nhà trọn vị */}
        <section className="mb-12 bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-border">
          <h2 className="text-xl md:text-2xl font-black text-foreground uppercase mb-4 tracking-wide">
            Cơm nhà trọn vị
          </h2>
          
          {/* Tabs */}
          <div className="flex gap-6 border-b border-border mb-6 overflow-x-auto [&::-webkit-scrollbar]:hidden">
            <span className="text-green-600 border-b-2 border-green-600 pb-2 font-semibold text-sm whitespace-nowrap cursor-pointer">Khai vị</span>
            <span className="text-gray-500 hover:text-green-600 pb-2 font-medium text-sm whitespace-nowrap cursor-pointer transition-colors">Món canh - hầm</span>
            <span className="text-gray-500 hover:text-green-600 pb-2 font-medium text-sm whitespace-nowrap cursor-pointer transition-colors">Đặc sản vùng miền</span>
            <span className="text-gray-500 hover:text-green-600 pb-2 font-medium text-sm whitespace-nowrap cursor-pointer transition-colors">Ẩm thực nước ngoài</span>
          </div>
          
          {/* Recipe Cards */}
          <div className="flex gap-3 overflow-x-auto pb-4 snap-x [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {MOCK_RECIPES.map((recipe) => (
              <div key={recipe.id} className="flex-[0_0_180px] md:flex-[0_0_210px] snap-start border border-gray-200 rounded-xl p-2 md:p-2 flex flex-col gap-3 hover:shadow-md transition-shadow group">
                <div className="relative w-full aspect-[4/5] rounded-lg overflow-hidden">
                  <img src={recipe.imageUrl} alt={recipe.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  <div className="absolute bottom-2 left-2 right-2 bg-black/80 backdrop-blur-sm rounded-md p-1.5 md:p-2">
                    <span className="text-white text-[11px] md:text-[13px] font-medium line-clamp-2 leading-tight">
                      {recipe.title}
                    </span>
                  </div>
                </div>
                <button className="w-full bg-green-700 hover:bg-green-700 text-white font-bold py-2 rounded-full text-xs md:text-sm transition-colors mt-auto">
                  Mua nguyên liệu
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Featured Brands */}
        <section className="mb-12 bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-border">
          <div className="text-center max-w-xl mx-auto mb-8">
            <span className="text-xs uppercase font-bold tracking-widest text-primary">Đối Tác Uy Tín</span>
            <h2 className="text-xl md:text-2xl font-bold text-foreground mt-1">
              Thương Hiệu Đồng Hành Chính Hãng
            </h2>
            <p className="text-xs md:text-sm text-muted-foreground mt-1.5">
              Cam kết 100% sản phẩm chính hãng, đạt tiêu chuẩn an toàn vệ sinh thực phẩm từ các tập đoàn hàng đầu
            </p>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-3 md:gap-4 items-center">
            {BRANDS.map((brand, idx) => (
              <div 
                key={idx} 
                className="bg-white border border-gray-150 hover:border-primary/50 rounded-xl p-3 h-20 md:h-24 flex flex-col items-center justify-center shadow-2xs hover:shadow-md transition-all duration-300 hover:-translate-y-1 group cursor-pointer"
                title={brand.name}
              >
                <img 
                  src={brand.logo} 
                  alt={brand.name} 
                  className="max-h-10 md:max-h-12 max-w-[85%] object-contain filter group-hover:scale-105 transition-transform" 
                  loading="lazy"
                />
                <span className="text-[10px] md:text-[11px] text-gray-500 font-medium mt-1.5 line-clamp-1 group-hover:text-primary transition-colors text-center">
                  {brand.name}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Just For You (Infinite Grid) */}
        <section className="mb-12">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">Gợi ý cho bạn</h2>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
            {featuredProducts.map((product) => (
              <ProductCard key={product.id} {...product} />
            ))}
          </div>
          <div className="flex justify-center">
            <button className="border-2 border-primary text-primary hover:bg-primary hover:text-white px-10 py-3 rounded-full font-bold transition-colors shadow-sm">
              Xem thêm 24 sản phẩm
            </button>
          </div>
        </section>

        {/* Cẩm nang / Tin tức */}
        <section className="mb-12">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-foreground">Cẩm nang mua sắm & Tin tức</h2>
            <Link href="/tin-tuc" className="text-primary font-semibold text-sm hover:underline">
              Xem tất cả &gt;
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {ARTICLES.map(article => (
              <div key={article.id} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-border hover:shadow-md transition-shadow group cursor-pointer flex flex-col h-full">
                <div className="relative w-full aspect-[4/3] overflow-hidden">
                  <img src={article.imageUrl} alt={article.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                </div>
                <div className="p-4 flex flex-col flex-1">
                  <span className="text-[11px] text-muted-foreground mb-2">{article.date}</span>
                  <h3 className="font-bold text-sm md:text-base text-foreground mb-2 group-hover:text-primary transition-colors line-clamp-2">{article.title}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-3 mb-4">{article.desc}</p>
                  <span className="text-primary text-xs font-semibold mt-auto flex items-center gap-1">Đọc tiếp <ChevronRight size={14}/></span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* App Download Banner */}
        <section className="mb-12 rounded-2xl bg-gradient-to-r from-green-700 to-green-500 overflow-hidden shadow-lg flex flex-col md:flex-row items-center justify-between p-6 md:p-10 relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4"></div>
          <div className="relative z-10 text-white md:w-2/3 mb-6 md:mb-0">
            <h2 className="text-3xl md:text-4xl font-black mb-3 text-orange-400">TẢI ỨNG DỤNG C.T MART</h2>
            <p className="text-blue-50 mb-6 text-sm md:text-base leading-relaxed">
              Mua sắm tiện lợi mọi lúc mọi nơi! Nhận ngay <strong>E-Voucher 50K</strong> cho khách hàng mới cài đặt app và đặc quyền tích điểm thưởng thành viên VIP.
            </p>
            <div className="flex flex-wrap gap-4">
              <a href="#" className="bg-black hover:bg-gray-900 border border-gray-800 text-white px-4 py-2 rounded-xl flex items-center gap-3 transition-colors shadow-md group">
                <div className="w-6 h-6 flex items-center justify-center shrink-0">
                  <img src="/app-store/apple-store.jpg" alt="Apple App Store" className="w-full h-full object-contain filter invert contrast-200 brightness-200" />
                </div>
                <div className="text-left">
                  <div className="text-[9px] uppercase tracking-wider leading-tight text-gray-400 font-medium">Download on the</div>
                  <div className="font-semibold text-sm leading-tight text-white">App Store</div>
                </div>
              </a>
              <a href="#" className="bg-black hover:bg-gray-900 border border-gray-800 text-white px-4 py-2 rounded-xl flex items-center gap-3 transition-colors shadow-md group">
                <div className="w-6 h-6 flex items-center justify-center shrink-0">
                  <img src="/app-store/google-play.jpg" alt="Google Play" className="w-full h-full object-contain rounded-xs" />
                </div>
                <div className="text-left">
                  <div className="text-[9px] uppercase tracking-wider leading-tight text-gray-400 font-medium">GET IT ON</div>
                  <div className="font-semibold text-sm leading-tight text-white">Google Play</div>
                </div>
              </a>
            </div>
          </div>
          <div className="relative z-10 w-48 hidden md:block">
            {/* Fake Phone mockup */}
            <div className="w-full h-72 bg-white rounded-[2rem] border-[8px] border-gray-900 shadow-2xl relative overflow-hidden flex flex-col items-center justify-center p-4">
               <div className="w-1/3 h-4 bg-gray-900 absolute top-0 rounded-b-2xl"></div>
               <img src="/logos/logo_full.png" alt="C.T Mart App" className="h-10 w-auto object-contain mt-2" />
               <div className="mt-4 grid grid-cols-2 gap-2 w-full">
                 <div className="w-full h-12 bg-gray-100 rounded-lg"></div>
                 <div className="w-full h-12 bg-gray-100 rounded-lg"></div>
                 <div className="w-full h-12 bg-gray-100 rounded-lg"></div>
                 <div className="w-full h-12 bg-blue-100 rounded-lg"></div>
               </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
