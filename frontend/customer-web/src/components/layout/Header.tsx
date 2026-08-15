"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Search, User, ShoppingCart, Menu, MapPin, Phone, Ticket, Sparkles, MapPin as MapPinIcon, ShoppingBag, ShieldCheck, Headphones, AlertCircle, Store, Tag, HelpCircle, LogOut, ChevronRight, CheckCircle2 } from 'lucide-react';
import { useCartStore, useAuthStore } from '@/lib/store';

export default function Header() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [isScrolled, setIsScrolled] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const cartItems = useCartStore(state => state.items);
  const { user, isAuthenticated, logout } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const totalItems = mounted ? cartItems.reduce((sum, item) => sum + item.quantity, 0) : 0;
  const recentItems = cartItems.slice(-3).reverse();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled((prev) => {
        if (window.scrollY > 150) return true;
        if (window.scrollY < 50) return false;
        return prev;
      });
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setShowSuggestions(false);
      router.push(`/tim-kiem?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setSearchQuery(suggestion);
    setShowSuggestions(false);
    router.push(`/tim-kiem?q=${encodeURIComponent(suggestion)}`);
  };

  const SMART_SUGGESTIONS = [
    'gạo', 'gạo lứt', 'gạo thơm', 'gạo lức', 'gạo st25', 'gạo rang', 'gạo tẻ', 'gạo nếp',
    'mì', 'mì gói', 'mì tôm', 'mì ly', 'mì trộn', 'mì ý', 'mì xào', 'mì hảo hảo', 'mì omachi',
    'nước', 'nước mắm', 'nước tương', 'nước giải khát', 'nước ngọt', 'nước suối', 'nước rửa chén', 'nước khoáng',
    'thịt', 'thịt heo', 'thịt bò', 'thịt gà', 'thịt ba rọi', 'thịt xay',
    'rau', 'rau muống', 'rau cải', 'rau mồng tơi', 'cà chua', 'cà rốt',
    'trái cây', 'táo', 'nho', 'cam', 'chuối', 'dưa hấu',
    'sữa', 'sữa tươi', 'sữa chua', 'sữa đặc', 'sữa hạt',
    'dầu ăn', 'dầu hào', 'tương ớt', 'đường', 'muối', 'bột ngọt', 'hạt nêm',
    'bánh', 'bánh kẹo', 'bánh quy', 'kẹo', 'snack'
  ];

  const filteredSuggestions = SMART_SUGGESTIONS.filter(s => 
    s.toLowerCase().includes(searchQuery.toLowerCase().trim())
  ).slice(0, 7); // Show max 7 suggestions

  const CategoryDropdown = () => (
    <div className="absolute top-full left-0 mt-2 w-72 bg-white border border-border rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50 overflow-hidden transform origin-top-left scale-95 group-hover:scale-100">
      <div className="flex flex-col py-2 font-medium">
        <Link href="/danh-muc/rau-cu" className="px-4 py-2.5 hover:bg-green-50 hover:text-primary transition-colors flex items-center gap-3">
          <span className="text-xl">🥬</span> Rau củ
        </Link>
        <Link href="/danh-muc/trai-cay" className="px-4 py-2.5 hover:bg-green-50 hover:text-primary transition-colors flex items-center gap-3">
          <span className="text-xl">🍎</span> Trái cây
        </Link>
        <Link href="/danh-muc/thit-heo" className="px-4 py-2.5 hover:bg-green-50 hover:text-primary transition-colors flex items-center gap-3">
          <span className="text-xl">🥩</span> Thịt heo
        </Link>
        <Link href="/danh-muc/gao" className="px-4 py-2.5 hover:bg-green-50 hover:text-primary transition-colors flex items-center gap-3">
          <span className="text-xl">🍚</span> Gạo
        </Link>
        <Link href="/danh-muc/nuoc-mam" className="px-4 py-2.5 hover:bg-green-50 hover:text-primary transition-colors flex items-center gap-3">
          <span className="text-xl">🧂</span> Nước mắm
        </Link>
        <Link href="/danh-muc/banh-keo" className="px-4 py-2.5 hover:bg-green-50 hover:text-primary transition-colors flex items-center gap-3">
          <span className="text-xl">🍪</span> Bánh kẹo & Đồ khô
        </Link>
        <div className="border-t border-gray-100 my-1"></div>
        <Link href="/tat-ca-danh-muc" className="px-4 py-2.5 text-primary font-bold hover:bg-green-50 transition-colors text-center flex items-center justify-center gap-1">
          Xem tất cả danh mục <span className="text-lg leading-none">&rsaquo;</span>
        </Link>
      </div>
    </div>
  );

  return (
    <>
      {/* Topbar (Static) */}
      <div className="bg-primary text-white text-sm py-2">
        <div className="container mx-auto px-4 flex justify-between items-center max-w-6xl">
          <div className="flex gap-6">
            <Link href="/" className="opacity-90 hover:opacity-100 flex items-center gap-1">
              <MapPin size={14} /> Giao đến: Vui lòng chọn địa chỉ
            </Link>
          </div>
          <div className="flex gap-6">
            <Link href="/khuyen-mai" className="opacity-90 hover:opacity-100 font-medium">Khuyến mãi</Link>
            <Link href="/he-thong-sieu-thi" className="opacity-90 hover:opacity-100 font-medium">Hệ thống siêu thị</Link>
            <Link href="tel:1900555568" className="opacity-90 hover:opacity-100 flex items-center gap-1 font-bold text-orange-300">
              <Phone size={14} /> Hotline: 1900 5555 68
            </Link>
          </div>
        </div>
      </div>

      {/* Main Header (Sticky) */}
      <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-md shadow-sm border-b border-border py-3 md:py-4 transition-all duration-300">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="flex items-center justify-between gap-4 md:gap-8">
            <Link href="/" className="shrink-0">
              <img src="/logos/logo_full.png" alt="C.T Mart" className={`w-auto object-contain ${isScrolled ? 'h-10' : 'h-14 md:h-16'}`} />
            </Link>

            {/* Dynamic Category Button */}
            <div className={`relative group shrink-0 hidden md:block z-50 ${isScrolled ? 'mr-2' : 'w-0 opacity-0 overflow-hidden'}`}>
              <button className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-lg transition-all hover:bg-primary/90 w-full whitespace-nowrap">
                <Menu size={18} />
                <span>Danh mục</span>
              </button>
              <CategoryDropdown />
            </div>

            <form onSubmit={handleSearch} className="flex-1 max-w-lg relative flex group">
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSuggestions(e.target.value.trim().length > 0);
                }}
                onFocus={(e) => {
                  if (e.target.value.trim().length > 0) setShowSuggestions(true);
                }}
                onBlur={() => {
                  // Delay hiding so click event on suggestion can fire
                  setTimeout(() => setShowSuggestions(false), 200);
                }}
                className="w-full py-2 md:py-2.5 px-5 pr-14 border border-border rounded-full outline-none text-sm md:text-base transition-all duration-300 focus:border-primary focus:ring-2 focus:ring-primary/20 bg-white/50" 
                placeholder="Bạn ăn gì hôm nay?" 
              />
              <button type="submit" className="absolute right-1 top-1/2 -translate-y-1/2 bg-secondary text-white w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center font-medium transition-all hover:bg-secondary/90 hover:scale-105 shadow-md">
                <Search size={16} />
              </button>

              {/* Suggestions Dropdown */}
              {showSuggestions && filteredSuggestions.length > 0 && (
                <div className="absolute top-full mt-2 w-full bg-white border border-gray-100 rounded-xl shadow-[0_10px_40px_-15px_rgba(0,0,0,0.15)] overflow-hidden z-50">
                  <ul className="py-2">
                    {filteredSuggestions.map((suggestion, idx) => (
                      <li key={idx}>
                        <button
                          type="button"
                          onClick={() => handleSuggestionClick(suggestion)}
                          className="w-full text-left px-5 py-2.5 hover:bg-gray-50 flex items-center gap-3 transition-colors text-gray-700"
                        >
                          <Search size={16} className="text-gray-400 shrink-0" />
                          <span className="text-[15px]">{suggestion}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </form>

            <div className="flex items-center gap-4 md:gap-6 shrink-0 relative">
              
              {/* Account Dropdown Wrapper */}
              <div className="relative group/account">
                <Link href={isAuthenticated ? "/tai-khoan" : "/dang-nhap"} className="flex flex-col items-center text-xs md:text-sm text-gray-700 font-medium hover:text-primary transition-colors py-2">
                  <div className="text-primary mb-1 p-1.5 md:p-2 rounded-full bg-green-50 group-hover/account:bg-green-100 transition-colors">
                    <User size={20} />
                  </div>
                  <span className="hidden md:inline">{mounted && isAuthenticated ? "Tài khoản" : "Đăng nhập"}</span>
                </Link>

                {/* Account Popup */}
                {mounted && isAuthenticated && (
                  <div className="absolute top-full right-0 mt-0 w-[340px] bg-white text-gray-800 border border-border rounded-lg shadow-[0_10px_40px_-15px_rgba(0,0,0,0.1)] opacity-0 invisible group-hover/account:opacity-100 group-hover/account:visible transition-all duration-300 z-50 overflow-hidden transform origin-top-right scale-95 group-hover/account:scale-100 text-sm">
                    {/* Header Box */}
                    <div className="p-4 border-b border-border bg-gray-50/50">
                      <div className="flex justify-between items-center mb-3">
                        <div className="font-bold text-base text-gray-800">{user?.name || 'Khách hàng'}</div>
                        <div className="text-xs font-bold text-orange-500 bg-orange-50 px-2 py-1 rounded">HẠNG VÀNG <span className="text-gray-600 font-normal">{user?.points || 0} điểm</span></div>
                      </div>
                    <div className="space-y-0.5">
                      <Link href="#" className="flex items-center justify-between py-2 hover:text-primary transition-colors group/item">
                        <div className="flex items-center gap-3"><Ticket size={16} className="text-gray-500 group-hover/item:text-primary" /> Phiếu mua hàng <span className="bg-yellow-400 text-yellow-900 text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-1">13</span></div>
                        <ChevronRight size={14} className="text-gray-400" />
                      </Link>
                      <Link href="#" className="flex items-center justify-between py-2 hover:text-primary transition-colors group/item">
                        <div className="flex items-center gap-3"><Sparkles size={16} className="text-gray-500 group-hover/item:text-primary" /> Ưu đãi đặc biệt</div>
                        <ChevronRight size={14} className="text-gray-400" />
                      </Link>
                    </div>
                  </div>

                  {/* Personal Info Box */}
                  <div className="p-4 border-b border-border">
                    <div className="font-bold mb-2">Thông tin cá nhân</div>
                    <div className="space-y-0.5">
                      <Link href="/tai-khoan" className="flex items-center justify-between py-2 hover:text-primary transition-colors group/item">
                        <div className="flex items-center gap-3"><User size={16} className="text-gray-500 group-hover/item:text-primary" /> Sửa thông tin cá nhân</div>
                        <ChevronRight size={14} className="text-gray-400" />
                      </Link>
                      <Link href="/tai-khoan/dia-chi" className="flex items-center justify-between py-2 hover:text-primary transition-colors group/item">
                        <div className="flex items-center gap-3"><MapPinIcon size={16} className="text-gray-500 group-hover/item:text-primary" /> Địa chỉ nhận hàng (1)</div>
                        <ChevronRight size={14} className="text-gray-400" />
                      </Link>
                      <Link href="/tai-khoan/don-hang" className="flex items-center justify-between py-2 hover:text-primary transition-colors group/item">
                        <div className="flex items-center gap-3"><ShoppingBag size={16} className="text-gray-500 group-hover/item:text-primary" /> Đơn hàng từng mua</div>
                        <ChevronRight size={14} className="text-gray-400" />
                      </Link>
                      <Link href="#" className="flex items-center justify-between py-2 hover:text-primary transition-colors group/item">
                        <div className="flex items-center gap-3"><ShieldCheck size={16} className="text-gray-500 group-hover/item:text-primary" /> Thay đổi chính sách xử lý dữ liệu...</div>
                        <ChevronRight size={14} className="text-gray-400" />
                      </Link>
                    </div>
                  </div>

                  {/* Customer Support */}
                  <div className="p-4 border-b border-border">
                    <div className="font-bold mb-2">Hỗ trợ khách hàng</div>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-3 py-2">
                        <Headphones size={16} className="text-gray-500" /> 
                        <span>Tư vấn: <strong className="text-primary">1900.1908</strong> <span className="text-gray-400 text-xs">(7:30 - 21:00)</span></span>
                      </div>
                      <div className="flex items-center gap-3 py-2">
                        <AlertCircle size={16} className="text-gray-500" /> 
                        <span>Khiếu nại: <strong className="text-primary">1800.1067</strong> <span className="text-gray-400 text-xs">Miễn phí</span></span>
                      </div>
                      <Link href="#" className="flex items-center justify-between py-2 hover:text-primary transition-colors group/item">
                        <div className="flex items-center gap-3"><Store size={16} className="text-gray-500 group-hover/item:text-primary" /> Tìm kiếm cửa hàng</div>
                        <ChevronRight size={14} className="text-gray-400" />
                      </Link>
                      <Link href="#" className="flex items-center justify-between py-2 hover:text-primary transition-colors group/item">
                        <div className="flex items-center gap-3"><Tag size={16} className="text-gray-500 group-hover/item:text-primary" /> Mua phiếu mua hàng</div>
                        <ChevronRight size={14} className="text-gray-400" />
                      </Link>
                      <Link href="#" className="flex items-center justify-between py-2 hover:text-primary transition-colors group/item">
                        <div className="flex items-center gap-3"><HelpCircle size={16} className="text-gray-500 group-hover/item:text-primary" /> Hướng dẫn mua hàng</div>
                        <ChevronRight size={14} className="text-gray-400" />
                      </Link>
                    </div>
                  </div>
                  
                  {/* Logout */}
                  <div className="p-2 bg-gray-50/50">
                    <button 
                      onClick={() => logout()}
                      className="flex items-center gap-3 py-2 px-3 w-full hover:bg-gray-100 rounded text-gray-700 transition-colors"
                    >
                      <LogOut size={16} className="text-gray-500" /> Đăng xuất
                    </button>
                  </div>
                </div>
                )}
              </div>
              
              {/* Cart Dropdown Wrapper */}
              <div className="relative group/cart">
                <Link href="/gio-hang" className="flex flex-col items-center text-xs md:text-sm text-gray-700 font-medium hover:text-primary transition-colors py-2">
                  <div className="text-primary mb-1 p-1.5 md:p-2 rounded-full bg-green-50 group-hover/cart:bg-green-100 transition-colors relative">
                    <ShoppingCart size={20} />
                    {totalItems > 0 && (
                      <span className="absolute -top-1 -right-1 bg-secondary text-white text-[9px] md:text-[10px] font-bold w-4 h-4 md:w-5 md:h-5 flex items-center justify-center rounded-full shadow-md animate-pulse">
                        {totalItems}
                      </span>
                    )}
                  </div>
                  <span className="hidden md:inline">Giỏ hàng</span>
                </Link>
                
                {/* Mini Cart Popup */}
                <div className="absolute top-full right-0 mt-0 w-[320px] bg-white text-gray-800 border border-border rounded-lg shadow-[0_10px_40px_-15px_rgba(0,0,0,0.1)] opacity-0 invisible group-hover/cart:opacity-100 group-hover/cart:visible transition-all duration-300 z-50 overflow-hidden transform origin-top-right scale-95 group-hover/cart:scale-100">
                  <div className="p-3 border-b border-border font-bold text-sm text-gray-500">Sản phẩm mới thêm</div>
                  
                  <div className="max-h-[300px] overflow-y-auto">
                    {mounted && recentItems.length > 0 ? (
                      recentItems.map(item => (
                        <Link key={item.id} href={`/san-pham/${item.productId}`} className="flex gap-3 p-3 hover:bg-gray-50 border-b border-gray-100 transition-colors">
                          <img src={item.image} alt={item.name} className="w-12 h-12 object-cover rounded border border-gray-200" />
                          <div className="flex-1">
                            <div className="text-sm font-medium line-clamp-2 text-gray-800 leading-tight">{item.name}</div>
                            <div className="text-primary font-bold mt-1">{(item.price * item.quantity).toLocaleString('vi-VN')}đ <span className="text-gray-500 font-normal text-xs">x{item.quantity}</span></div>
                          </div>
                        </Link>
                      ))
                    ) : (
                      <div className="p-6 text-center text-gray-500 text-sm">Chưa có sản phẩm nào</div>
                    )}
                  </div>
                  
                  <div className="p-3 bg-gray-50 border-t border-border flex items-center justify-between">
                    <div className="text-sm text-gray-500">{totalItems} sản phẩm</div>
                    <Link href="/gio-hang" className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 rounded text-sm transition-colors shadow-sm">
                      Xem giỏ hàng
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navbar (Static - Scrolls under Main Header) */}
      <div className="bg-white border-b border-border/50">
          <div className="container mx-auto px-4 max-w-6xl flex gap-6 font-semibold text-foreground items-center py-2 text-sm whitespace-nowrap">
              <div className="relative group shrink-0">
                <button className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-lg transition-all hover:bg-primary/90 hover:shadow-md h-full">
                  <Menu size={18} />
                  <span>Tất cả danh mục</span>
                </button>
                <CategoryDropdown />
              </div>
              <Link href="/danh-muc/rau-cu" className="hover:text-primary transition-colors py-2">Rau củ</Link>
              <Link href="/danh-muc/trai-cay" className="hover:text-primary transition-colors py-2">Trái cây</Link>
              <Link href="/danh-muc/thit-heo" className="hover:text-primary transition-colors py-2">Thịt heo</Link>
              <Link href="/danh-muc/gao" className="hover:text-primary transition-colors py-2">Gạo</Link>
              <Link href="/danh-muc/nuoc-mam" className="hover:text-primary transition-colors py-2">Nước mắm</Link>
              <Link href="/danh-muc/banh-keo" className="hover:text-primary transition-colors py-2">Bánh kẹo & Đồ khô</Link>
              <Link href="/danh-muc/sua-do-uong" className="hover:text-primary transition-colors py-2">Sữa & Đồ uống</Link>
            </div>
        </div>
    </>
  );
}
