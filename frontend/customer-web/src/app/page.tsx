"use client";

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Zap, ChevronRight, Apple, Beef, Milk, Carrot, Coffee, ShoppingBag, Clock, Phone } from 'lucide-react';
import { motion, Variants } from 'framer-motion';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import ProductCard from '@/components/ui/ProductCard';

const MOCK_PRODUCTS = [
  { id: '1', name: 'Nước Mắm Nam Ngư Chai 500ml', price: 35000, oldPrice: 42000, discount: 16, soldCount: 1500, totalStock: 2000, imageUrl: 'https://fakestoreapi.com/img/81fPKd-2AYL._AC_SL1500_.jpg' },
  { id: '2', name: 'Sữa tươi tiệt trùng Vinamilk 100% không đường hộp 1L', price: 35000, oldPrice: 40000, discount: 12, soldCount: 820, totalStock: 1000, imageUrl: 'https://fakestoreapi.com/img/71-3HjGNDUL._AC_SY879._SX._UX._SY._UY_.jpg' },
  { id: '3', name: 'Dầu đậu nành Simply chai 1 lít', price: 52000, oldPrice: 60000, discount: 13, soldCount: 450, totalStock: 500, imageUrl: 'https://fakestoreapi.com/img/71li-ujtl-L._AC_UX679_.jpg' },
  { id: '4', name: 'Cá hồi Na Uy phi lê tươi 250g', price: 145000, oldPrice: 160000, discount: 9, soldCount: 120, totalStock: 300, imageUrl: 'https://fakestoreapi.com/img/71YXzeOuslL._AC_UY879_.jpg' },
  { id: '5', name: 'Nho mẫu đơn Hàn Quốc hộp 500g', price: 199000, oldPrice: 250000, discount: 20, soldCount: 45, totalStock: 50, imageUrl: 'https://fakestoreapi.com/img/71pWzhdJNwL._AC_UL640_QL65_ML3_.jpg' },
  { id: '6', name: 'Bánh Quy Bơ Danisa Hộp 454G', price: 135000, oldPrice: 155000, discount: 12, soldCount: 500, totalStock: 600, imageUrl: 'https://fakestoreapi.com/img/61sbMiUnoGL._AC_UL640_QL65_ML3_.jpg' },
  { id: '7', name: 'Gạo ST25 Ông Cua Túi 5Kg', price: 180000, oldPrice: 200000, discount: 10, soldCount: 340, totalStock: 400, imageUrl: 'https://fakestoreapi.com/img/71YAIFU48IL._AC_UL640_QL65_ML3_.jpg' },
  { id: '8', name: 'Thùng 24 lon bia Heineken 330ml', price: 440000, oldPrice: 460000, discount: 4, soldCount: 2000, totalStock: 5000, imageUrl: 'https://fakestoreapi.com/img/51UDEzMJVpL._AC_UL640_QL65_ML3_.jpg' },
  { id: '9', name: 'Sữa tắm Lifebuoy Bảo vệ Vượt trội 800g', price: 150000, oldPrice: 185000, discount: 18, soldCount: 900, totalStock: 1200, imageUrl: '/categories/ca_nhan.png' },
  { id: '10', name: 'Nước giặt OMO Matic Cửa trên 3.1kg', price: 195000, oldPrice: 245000, discount: 20, soldCount: 780, totalStock: 1000, imageUrl: '/categories/nha_cua.png' }
];

const PROMO_BANNERS = [
  { img: "https://images.unsplash.com/photo-1607083206869-4c7672e72a8a?auto=format&fit=crop&w=600&q=80", title: "Siêu hội Sale" },
  { img: "https://images.unsplash.com/photo-1574484284002-952d92456975?auto=format&fit=crop&w=600&q=80", title: "Lễ hội trái cây" },
  { img: "https://images.unsplash.com/photo-1601598851547-4302969d0614?auto=format&fit=crop&w=600&q=80", title: "Đại tiệc hàng tươi sống" }
];

const BRANDS = [
  { name: 'Vinamilk', color: 'bg-blue-100 text-blue-600' },
  { name: 'Unilever', color: 'bg-blue-900 text-white' },
  { name: 'Coca Cola', color: 'bg-red-600 text-white' },
  { name: 'Nestle', color: 'bg-amber-800 text-white' },
  { name: 'Suntory Pepsico', color: 'bg-blue-500 text-white' },
  { name: 'Acecook', color: 'bg-red-500 text-white' },
  { name: 'Masan', color: 'bg-orange-500 text-white' }
];

const QUICK_LINKS = [
  { imageUrl: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=400&q=80', title: 'Giỏ quà Trái Cây' },
  { imageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80', title: 'Thực phẩm Tươi ngon' },
  { imageUrl: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=400&q=80', title: 'E-voucher Siêu Hot' },
  { imageUrl: 'https://images.unsplash.com/photo-1607082349566-187342175e2f?auto=format&fit=crop&w=400&q=80', title: 'Ưu đãi Thành viên' },
  { imageUrl: 'https://images.unsplash.com/photo-1607083206968-13611e3d76ba?auto=format&fit=crop&w=400&q=80', title: 'Thương hiệu Uy tín' }
];

const VOUCHERS = [
  { title: 'Giảm 10K - CHAOHE10', desc: 'Giảm 10K khi mua các sản phẩm thuộc nhóm "Kem, gel..."', date: '22/07/2026', type: 'CT' },
  { title: 'Chào bạn mới - C.T Mart', desc: 'Tặng mã 30K cho KH đăng ký tài khoản mới', date: '10 ngày', type: 'CT' },
  { title: 'Giảm 10K - Unilever', desc: 'Nhập mã COMBO1 SP nhóm Giặt Xả của Unilever từ 379k', date: '22/07/2026', type: 'Unilever' },
  { title: 'Giảm 10K - Unilever', desc: 'Nhập mã COMBO2 SP nhóm Dọn dẹp nhà của Unilever từ...', date: '22/07/2026', type: 'Unilever' },
  { title: 'Giảm 5K - Unilever', desc: 'Nhập mã COMBO3 SP nhóm dọn dẹp nhà của U...', date: '22/07/2026', type: 'Unilever' }
];

const MOCK_RECIPES = [
  { id: '1', title: 'Salad đảo ức gà và đậu đỏ', imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80' },
  { id: '2', title: 'Bánh tráng gạo lứt cuốn ức gà', imageUrl: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80' },
  { id: '3', title: 'Súp ức gà rau củ', imageUrl: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=600&q=80' },
  { id: '4', title: 'Bắp cải bọc đậu hũ ức gà', imageUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=600&q=80' },
  { id: '5', title: 'Gỏi tôm xoài chua ngọt', imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=600&q=80' },
  { id: '6', title: 'Cháo yến mạch bông cải xanh', imageUrl: 'https://images.unsplash.com/photo-1511690743698-d9d85f2fbf38?auto=format&fit=crop&w=600&q=80' },
];

const ARTICLES = [
  { id: 1, title: 'Bí quyết chọn trái cây tươi ngon cho gia đình', desc: 'Những mẹo nhỏ giúp bạn luôn chọn được trái cây tươi, ngọt và an toàn...', imageUrl: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=400&q=80', date: '21/07/2026' },
  { id: 2, title: 'Cách bảo quản thịt cá trong tủ lạnh đúng cách', desc: 'Bảo quản thực phẩm đúng cách không chỉ giúp giữ được dinh dưỡng mà còn...', imageUrl: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=400&q=80', date: '20/07/2026' },
  { id: 3, title: 'Top 5 món ăn thanh mát giải nhiệt mùa hè', desc: 'Mùa hè nắng nóng, hãy trổ tài làm ngay 5 món ăn giải nhiệt cực đỉnh này...', imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80', date: '19/07/2026' },
  { id: 4, title: 'Chương trình Tích điểm đổi quà siêu hấp dẫn', desc: 'Từ tháng 8 này, C.T Mart tung ra chương trình tích điểm hoàn toàn mới...', imageUrl: 'https://images.unsplash.com/photo-1574484284002-952d92456975?auto=format&fit=crop&w=400&q=80', date: '18/07/2026' },
];

const CATEGORIES = [
  { name: 'Rau củ, trái cây', imageUrl: 'https://fakestoreapi.com/img/81fPKd-2AYL._AC_SL1500_.jpg' },
  { name: 'Thịt, trứng, hải sản', imageUrl: 'https://fakestoreapi.com/img/71-3HjGNDUL._AC_SY879._SX._UX._SY._UY_.jpg' },
  { name: 'Thức ăn chế biến, bún tươi', imageUrl: 'https://fakestoreapi.com/img/71li-ujtl-L._AC_UX679_.jpg' },
  { name: 'Thực phẩm đông, mát', imageUrl: 'https://fakestoreapi.com/img/71YXzeOuslL._AC_UY879_.jpg' },
  { name: 'Sữa, sản phẩm từ sữa', imageUrl: 'https://fakestoreapi.com/img/71pWzhdJNwL._AC_UL640_QL65_ML3_.jpg' },
  { name: 'Thức uống', imageUrl: 'https://fakestoreapi.com/img/61sbMiUnoGL._AC_UL640_QL65_ML3_.jpg' },
  { name: 'Bánh, kẹo, snack', imageUrl: 'https://fakestoreapi.com/img/71YAIFU48IL._AC_UL640_QL65_ML3_.jpg' },
  { name: 'Gia vị, gạo, thực phẩm khô', imageUrl: 'https://fakestoreapi.com/img/51UDEzMJVpL._AC_UL640_QL65_ML3_.jpg' },
  { name: 'Sản phẩm cho bé', imageUrl: '/categories/cho_be.png' },
  { name: 'Chăm sóc cá nhân', imageUrl: '/categories/ca_nhan.png' },
  { name: 'Nhà cửa và đời sống', imageUrl: '/categories/nha_cua.png' },
  { name: 'Shop nổi bật', imageUrl: '/categories/shop.png' },
];

const BANNERS = [
  { imageUrl: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80" },
  { imageUrl: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=1200&q=80" },
];

const SUB_BANNERS = [
  { imageUrl: "https://images.unsplash.com/photo-1607082349566-187342175e2f?auto=format&fit=crop&w=600&q=80" },
  { imageUrl: "https://images.unsplash.com/photo-1607083206968-13611e3d76ba?auto=format&fit=crop&w=600&q=80" },
];

export default function Home() {
  const [emblaRef] = useEmblaCarousel({ loop: true }, [Autoplay({ delay: 4000 })]);
  
  // Countdown Timer Logic
  const [timeLeft, setTimeLeft] = useState({ hours: 2, minutes: 15, seconds: 45 });
  
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        if (prev.hours > 0) return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        return { hours: 2, minutes: 15, seconds: 45 }; // reset for demo
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (v: number) => v.toString().padStart(2, '0');

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
        <div className="w-full relative mb-6" ref={emblaRef}>
          <div className="flex">
            {BANNERS.map((banner, idx) => (
              <div key={idx} className="flex-[0_0_100%] min-w-0 cursor-pointer">
                <div className="w-full h-[250px] md:h-[400px] relative overflow-hidden bg-gray-200 group">
                  <img src={banner.imageUrl} alt={`Banner ${idx + 1}`} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.01]" />
                </div>
              </div>
            ))}
          </div>
          
          {/* Simple Dots Placeholder */}
          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
            {BANNERS.map((_, i) => (
              <div key={i} className={`w-2.5 h-2.5 rounded-full ${i === 0 ? 'bg-primary' : 'bg-white/50'}`}></div>
            ))}
          </div>
        </div>

        {/* Sub Banners - 80% Width Content Area */}
        <div className="w-[95%] md:w-[80%] mx-auto">
          <div className="grid grid-cols-2 gap-4">
            {SUB_BANNERS.map((sub, idx) => (
              <div key={idx} className="rounded-2xl overflow-hidden shadow-sm h-[120px] md:h-[180px] bg-gray-200 cursor-pointer group relative">
                <img src={sub.imageUrl} alt={`Sub Banner ${idx + 1}`} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors"></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Main Content Area - 80% Width */}
      <div className="w-[95%] md:w-[80%] mx-auto">
        
        {/* Categories Bento Grid */}
        <section className="mb-12 bg-white rounded-2xl shadow-sm p-6 border border-border">
          <div className="flex justify-between items-end mb-8">
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2 uppercase tracking-wide">
              Danh mục
            </h2>
          </div>
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-100px" }}
            className="grid grid-cols-3 md:grid-cols-6 gap-y-10 gap-x-4"
          >
            {CATEGORIES.map((cat, idx) => (
              <motion.div 
                variants={itemVariants}
                key={idx} 
                className="flex flex-col items-center gap-4 cursor-pointer group"
              >
                <div className="relative w-20 h-20 flex items-center justify-center">
                  {/* Background shape imitating the leaf/blob from image */}
                  <div className="absolute inset-0 bg-[#eef7ec] rounded-[30%] rotate-[15deg] transition-all duration-300 group-hover:rotate-0 group-hover:scale-110 group-hover:bg-[#e0f0df] shadow-sm"></div>
                  
                  {/* Category Image with multiply blend to remove white bg */}
                  <img 
                    src={cat.imageUrl} 
                    alt={cat.name} 
                    className="relative w-16 h-16 object-contain mix-blend-multiply drop-shadow-sm group-hover:-translate-y-2 transition-transform duration-300"
                  />
                </div>
                
                {/* Category Name */}
                <span className="text-[13px] text-center font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2 w-28 leading-snug">
                  {cat.name}
                </span>
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* Quick Links (5 Banners) */}
        <section className="mb-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {QUICK_LINKS.map((link, idx) => (
              <div key={idx} className="rounded-xl overflow-hidden shadow-sm h-[130px] md:h-[150px] relative group cursor-pointer border border-border">
                <img src={link.imageUrl} alt={link.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex flex-col justify-end p-3">
                  <span className="text-white font-extrabold text-sm md:text-base leading-tight drop-shadow-md">{link.title}</span>
                  <span className="text-white/80 text-[10px] md:text-xs mt-1 flex items-center gap-1">◀ Mua ngay</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* E-Vouchers */}
        <section className="mb-12 bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-border">
          <h2 className="text-lg font-bold text-foreground mb-4">E-voucher khuyến mãi</h2>
          <div className="flex gap-4 overflow-x-auto pb-2 snap-x [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {VOUCHERS.map((voucher, idx) => (
              <div key={idx} className="flex-[0_0_280px] md:flex-[0_0_320px] snap-start border border-border rounded-xl p-3 flex gap-3 shadow-sm hover:shadow-md transition-shadow bg-white cursor-pointer group">
                <div className="w-16 h-16 md:w-20 md:h-20 bg-blue-700 rounded-lg flex items-center justify-center shrink-0 border border-blue-800 overflow-hidden relative">
                  <div className="text-white font-bold text-2xl z-10">{voucher.type === 'CT' ? 'C' : 'U'}</div>
                  {/* Decorative circle for logo */}
                  <div className="absolute inset-2 border border-white/30 rounded-full"></div>
                </div>
                <div className="flex flex-col justify-between flex-1">
                  <div>
                    <h3 className="font-bold text-[13px] md:text-sm text-foreground line-clamp-1 group-hover:text-primary transition-colors">{voucher.title}</h3>
                    <p className="text-[11px] md:text-xs text-muted-foreground mt-1 line-clamp-2">{voucher.desc}</p>
                  </div>
                  <div className="flex justify-between items-end mt-2">
                    <span className="text-[10px] md:text-[11px] text-gray-400">HSD: {voucher.date}</span>
                    <span className="text-[10px] md:text-[11px] text-blue-600 font-medium">Điều kiện áp dụng</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Khuyen Mai Hot Section */}
        <section className="mb-12 rounded-[28px] border-[5px] border-blue-700 bg-white overflow-hidden shadow-lg">
          {/* Header */}
          <div className="text-center relative overflow-hidden h-[80px] md:h-[110px] flex items-center justify-center bg-blue-800">
            {/* AI Generated Background */}
            <img src="/khuyen_mai_hot_bg.png" alt="Khuyến mãi hot background" className="absolute inset-0 w-full h-full object-cover opacity-90 mix-blend-luminosity hover:mix-blend-normal transition-all duration-500" />
            
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-black text-white uppercase italic tracking-wider drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)] relative z-10 font-sans">
              KHUYẾN MÃI HOT
            </h2>
          </div>
          
          {/* Tabs */}
          <div className="flex border-b border-gray-200 overflow-x-auto [&::-webkit-scrollbar]:hidden bg-white">
            <div className="flex-1 min-w-[130px] flex flex-col justify-center items-center text-center py-3 px-2 bg-blue-50 text-blue-700 border-b-[3px] border-blue-700 cursor-pointer">
              <span className="text-xs md:text-sm font-bold uppercase">Đại tiệc giảm giá</span>
              <span className="text-[10px] md:text-xs font-semibold uppercase">Mua nhiều ưu đãi lớn</span>
            </div>
            <div className="flex-1 min-w-[130px] flex flex-col justify-center items-center text-center py-3 px-2 text-gray-600 hover:bg-gray-50 cursor-pointer border-b-[3px] border-transparent hover:border-gray-300">
              <span className="text-xs md:text-sm font-bold uppercase">Mua kèm giảm thêm</span>
            </div>
            <div className="flex-1 min-w-[130px] flex flex-col justify-center items-center text-center py-3 px-2 text-gray-600 hover:bg-gray-50 cursor-pointer border-b-[3px] border-transparent hover:border-gray-300">
              <span className="text-xs md:text-sm font-bold uppercase">Lễ hội việt</span>
              <span className="text-[10px] md:text-xs font-semibold uppercase">Thỏa sức mua sắm</span>
            </div>
            <div className="flex-1 min-w-[130px] flex flex-col justify-center items-center text-center py-3 px-2 text-gray-600 hover:bg-gray-50 cursor-pointer border-b-[3px] border-transparent hover:border-gray-300">
              <span className="text-xs md:text-sm font-bold uppercase">Dấu ấn tuổi 30</span>
            </div>
            <div className="flex-1 min-w-[130px] flex flex-col justify-center items-center text-center py-3 px-2 text-gray-600 hover:bg-gray-50 cursor-pointer border-b-[3px] border-transparent hover:border-gray-300">
              <span className="text-xs md:text-sm font-bold uppercase">Vietnam</span>
              <span className="text-[10px] md:text-xs font-semibold uppercase">Grandsale 2026</span>
            </div>
          </div>
          
          {/* Link Xem tất cả */}
          <div className="flex justify-end pt-3 pr-4 bg-white">
             <a href="#" className="text-sm text-blue-600 hover:underline font-medium">Xem tất cả &gt;</a>
          </div>

          {/* Product Row */}
          <div className="flex gap-4 overflow-x-auto px-4 pb-6 pt-2 snap-x [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] bg-white">
            {MOCK_PRODUCTS.map((product) => (
              <div key={product.id} className="flex-[0_0_200px] md:flex-[0_0_220px] snap-start">
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
              {/* Countdown Timer */}
              <div className="flex items-center gap-1.5 text-white font-mono font-bold">
                <div className="bg-foreground rounded md px-2 py-1 shadow-inner">{formatTime(timeLeft.hours)}</div>
                <span className="text-foreground font-bold">:</span>
                <div className="bg-foreground rounded md px-2 py-1 shadow-inner">{formatTime(timeLeft.minutes)}</div>
                <span className="text-foreground font-bold">:</span>
                <div className="bg-secondary rounded md px-2 py-1 shadow-inner animate-pulse">{formatTime(timeLeft.seconds)}</div>
              </div>
            </div>
            
            <Link href="/flash-sale" className="text-primary font-semibold text-sm hover:underline flex items-center bg-blue-50 px-3 py-1.5 rounded-full transition-colors hover:bg-blue-100">
              Xem tất cả <ChevronRight size={16} />
            </Link>
          </div>
          
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-50px" }}
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4"
          >
            {MOCK_PRODUCTS.map((product) => (
              <motion.div variants={itemVariants} key={product.id}>
                <ProductCard {...product} />
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* Promotional Banners */}
        <section className="mb-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PROMO_BANNERS.map((promo, idx) => (
              <div key={idx} className="relative rounded-2xl overflow-hidden group cursor-pointer h-[200px] shadow-sm">
                <img src={promo.img} alt={promo.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-6">
                  <h3 className="text-white font-bold text-xl drop-shadow-md">{promo.title}</h3>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Featured Products / Best Sellers */}
        <section className="mb-12 rounded-[28px] border-[5px] border-red-600 bg-white overflow-hidden shadow-lg">
          {/* Header */}
          <div className="text-center relative overflow-hidden h-[80px] md:h-[110px] flex items-center justify-center bg-red-800">
            {/* AI Generated Background */}
            <img src="/top_ban_chay_bg.png" alt="Top bán chạy background" className="absolute inset-0 w-full h-full object-cover opacity-90 mix-blend-luminosity hover:mix-blend-normal transition-all duration-500" />
            
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-black text-white uppercase italic tracking-wider drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)] relative z-10 font-sans">
              TOP BÁN CHẠY
            </h2>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200 overflow-x-auto [&::-webkit-scrollbar]:hidden bg-white">
            <div className="flex-1 min-w-[130px] flex flex-col justify-center items-center text-center py-3 px-2 bg-red-50 text-red-600 border-b-[3px] border-red-600 cursor-pointer">
              <span className="text-xs md:text-sm font-bold uppercase">Tất cả</span>
              <span className="text-[10px] md:text-xs font-semibold uppercase">Hot nhất tuần</span>
            </div>
            <div className="flex-1 min-w-[130px] flex flex-col justify-center items-center text-center py-3 px-2 text-gray-600 hover:bg-gray-50 cursor-pointer border-b-[3px] border-transparent hover:border-gray-300">
              <span className="text-xs md:text-sm font-bold uppercase">Thực phẩm</span>
            </div>
            <div className="flex-1 min-w-[130px] flex flex-col justify-center items-center text-center py-3 px-2 text-gray-600 hover:bg-gray-50 cursor-pointer border-b-[3px] border-transparent hover:border-gray-300">
              <span className="text-xs md:text-sm font-bold uppercase">Đồ uống</span>
            </div>
            <div className="flex-1 min-w-[130px] flex flex-col justify-center items-center text-center py-3 px-2 text-gray-600 hover:bg-gray-50 cursor-pointer border-b-[3px] border-transparent hover:border-gray-300">
              <span className="text-xs md:text-sm font-bold uppercase">Chăm sóc nhà cửa</span>
            </div>
          </div>

          {/* Link Xem tất cả */}
          <div className="flex justify-end pt-3 pr-4 bg-white">
             <Link href="/ban-chay" className="text-sm text-red-600 hover:underline font-medium">Xem tất cả &gt;</Link>
          </div>

          {/* Product Row */}
          <div className="flex gap-4 overflow-x-auto px-4 pb-6 pt-2 snap-x [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] bg-white">
            {[...MOCK_PRODUCTS].reverse().map((product) => (
              <div key={product.id} className="flex-[0_0_200px] md:flex-[0_0_220px] snap-start">
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
            <span className="text-blue-600 border-b-2 border-blue-600 pb-2 font-semibold text-sm whitespace-nowrap cursor-pointer">Khai vị</span>
            <span className="text-gray-500 hover:text-blue-600 pb-2 font-medium text-sm whitespace-nowrap cursor-pointer transition-colors">Món canh - hầm</span>
            <span className="text-gray-500 hover:text-blue-600 pb-2 font-medium text-sm whitespace-nowrap cursor-pointer transition-colors">Đặc sản vùng miền</span>
            <span className="text-gray-500 hover:text-blue-600 pb-2 font-medium text-sm whitespace-nowrap cursor-pointer transition-colors">Ẩm thực nước ngoài</span>
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
                <button className="w-full bg-[#0000d6] hover:bg-blue-800 text-white font-bold py-2 rounded-full text-xs md:text-sm transition-colors mt-auto">
                  Mua nguyên liệu
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Featured Brands */}
        <section className="mb-12 bg-white rounded-2xl p-6 shadow-sm border border-border">
          <h2 className="text-xl font-bold text-center mb-8 uppercase tracking-wider text-gray-500">Thương hiệu đồng hành</h2>
          <div className="flex flex-wrap justify-center gap-4">
            {BRANDS.map((brand, idx) => (
              <div key={idx} className={`w-32 h-16 rounded-xl flex items-center justify-center font-bold text-sm uppercase shadow-sm opacity-80 hover:opacity-100 cursor-pointer transition-opacity ${brand.color}`}>
                {brand.name}
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
            {MOCK_PRODUCTS.map((product) => (
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
        <section className="mb-12 rounded-2xl bg-gradient-to-r from-[#0000d6] to-[#0055ff] overflow-hidden shadow-lg flex flex-col md:flex-row items-center justify-between p-6 md:p-10 relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4"></div>
          <div className="relative z-10 text-white md:w-2/3 mb-6 md:mb-0">
            <h2 className="text-3xl md:text-4xl font-black mb-3 text-yellow-300">TẢI ỨNG DỤNG C.T MART</h2>
            <p className="text-blue-50 mb-6 text-sm md:text-base leading-relaxed">
              Mua sắm tiện lợi mọi lúc mọi nơi! Nhận ngay <strong>E-Voucher 50K</strong> cho khách hàng mới cài đặt app và đặc quyền tích điểm thưởng thành viên VIP.
            </p>
            <div className="flex gap-4">
              <a href="#" className="bg-black hover:bg-gray-800 border border-gray-700 text-white px-4 py-2 rounded-xl flex items-center gap-3 transition-colors shadow-lg">
                <div className="text-2xl">🍎</div>
                <div className="text-left">
                  <div className="text-[10px] leading-tight text-gray-300">Download on the</div>
                  <div className="font-semibold text-sm leading-tight">App Store</div>
                </div>
              </a>
              <a href="#" className="bg-black hover:bg-gray-800 border border-gray-700 text-white px-4 py-2 rounded-xl flex items-center gap-3 transition-colors shadow-lg">
                <div className="text-2xl">▶️</div>
                <div className="text-left">
                  <div className="text-[10px] leading-tight text-gray-300">GET IT ON</div>
                  <div className="font-semibold text-sm leading-tight">Google Play</div>
                </div>
              </a>
            </div>
          </div>
          <div className="relative z-10 w-48 hidden md:block">
            {/* Fake Phone mockup */}
            <div className="w-full h-72 bg-white rounded-[2rem] border-[8px] border-gray-900 shadow-2xl relative overflow-hidden flex flex-col items-center justify-center p-4">
               <div className="w-1/3 h-4 bg-gray-900 absolute top-0 rounded-b-2xl"></div>
               <span className="font-black text-[#0000d6] text-3xl tracking-tighter">C.T Mart</span>
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

      {/* Floating Action Buttons */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
        <a href="tel:1900555568" className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-red-600/30 hover:scale-110 transition-transform group relative">
          <Phone size={22} className="animate-pulse" />
          <span className="absolute right-full mr-3 bg-white text-gray-800 text-xs px-3 py-1.5 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity shadow-md pointer-events-none font-semibold border border-gray-100">Hotline: 1900 5555 68</span>
        </a>
        <a href="#" className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-blue-500/30 hover:scale-110 transition-transform group relative">
          {/* Zalo Icon fake */}
          <span className="font-black text-xl italic">Z</span>
          <span className="absolute right-full mr-3 bg-white text-gray-800 text-xs px-3 py-1.5 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity shadow-md pointer-events-none font-semibold border border-gray-100">Chat Zalo</span>
        </a>
      </div>
    </div>
  );
}
