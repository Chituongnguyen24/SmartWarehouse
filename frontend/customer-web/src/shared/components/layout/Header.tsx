"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  User, 
  ShoppingCart, 
  Menu, 
  MapPin, 
  Phone, 
  Ticket, 
  ShoppingBag, 
  ShieldCheck, 
  Headphones,
  AlertCircle,
  Store, 
  Tag, 
  HelpCircle, 
  LogOut, 
  ChevronRight, 
  Beef, 
  Apple, 
  Fish, 
  Milk, 
  Carrot, 
  Heart, 
  Home, 
  Cookie, 
  Droplets, 
  Flame, 
  Package, 
  Snowflake, 
  UtensilsCrossed,
  Baby,
  Sparkles,
  Zap,
  Loader2,
  X
} from 'lucide-react';
import { useCartStore, useAuthStore } from '@/lib/store';
import { getCategories, CategoryData, getProducts, Product, slugify, encodeProductSlug } from '@/lib/api';

function getCategoryIconConfig(name: string) {
  const lower = (name || '').toLowerCase();
  
  if (lower.includes('bé') || lower.includes('be')) {
    return { Icon: Baby, color: 'text-amber-500', bg: 'bg-amber-50 border-amber-100' };
  }
  if (lower.includes('cá nhân') || lower.includes('chăm sóc')) {
    return { Icon: Heart, color: 'text-pink-600', bg: 'bg-pink-50 border-pink-100' };
  }
  if (lower.includes('nhà cửa') || lower.includes('đời sống')) {
    return { Icon: Home, color: 'text-indigo-600', bg: 'bg-indigo-50 border-indigo-100' };
  }
  if (lower.includes('shop') || lower.includes('nổi bật')) {
    return { Icon: Sparkles, color: 'text-amber-500', bg: 'bg-amber-50 border-amber-100' };
  }
  if (lower.includes('thịt') || lower.includes('trứng') || lower.includes('hải sản') || lower.includes('heo') || lower.includes('bò') || lower.includes('gà')) {
    return { Icon: Beef, color: 'text-red-600', bg: 'bg-red-50 border-red-100' };
  }
  if (lower.includes('rau') || lower.includes('củ') || lower.includes('trái cây') || lower.includes('nấm')) {
    return { Icon: Carrot, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100' };
  }
  if (lower.includes('đông, mát') || lower.includes('đông lạnh') || lower.includes('đông')) {
    return { Icon: Snowflake, color: 'text-sky-600', bg: 'bg-sky-50 border-sky-100' };
  }
  if (lower.includes('sữa')) {
    return { Icon: Milk, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-100' };
  }
  if (lower.includes('uống') || lower.includes('nước') || lower.includes('giải khát')) {
    return { Icon: Droplets, color: 'text-teal-600', bg: 'bg-teal-50 border-teal-100' };
  }
  if (lower.includes('chế biến') || lower.includes('bún tươi') || lower.includes('mì')) {
    return { Icon: UtensilsCrossed, color: 'text-orange-600', bg: 'bg-orange-50 border-orange-100' };
  }
  if (lower.includes('bánh') || lower.includes('kẹo') || lower.includes('snack')) {
    return { Icon: Cookie, color: 'text-amber-700', bg: 'bg-amber-50 border-amber-100' };
  }
  if (lower.includes('gia vị') || lower.includes('gạo') || lower.includes('thực phẩm khô')) {
    return { Icon: Flame, color: 'text-orange-600', bg: 'bg-orange-50 border-orange-100' };
  }
  return { Icon: ShoppingBag, color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-100' };
}

export default function Header() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [isScrolled, setIsScrolled] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestedProducts, setSuggestedProducts] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  const cartItems = useCartStore(state => state.items);
  const { user, isAuthenticated, logout } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const totalItems = mounted ? cartItems.reduce((sum, item) => sum + item.quantity, 0) : 0;
  const recentItems = cartItems.slice(-3).reverse();

  // Debounce tìm kiếm sản phẩm: Đợi người dùng dừng gõ 350ms mới gửi request để tránh lag
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) {
      setSuggestedProducts([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const res = await getProducts({ keyword: q, limit: 6 });
        setSuggestedProducts(res?.items || []);
      } catch (err) {
        console.warn('Debounced search failed:', err);
      } finally {
        setIsSearching(false);
      }
    }, 350);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [searchQuery]);

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
    'thực phẩm tươi sống', 'thực phẩm ăn liền', 'sữa', 'thịt', 'rau củ',
    'bánh kẹo', 'gia vị', 'nước giải khát', 'gạo', 'trái cây', 'đông lạnh'
  ];

  const filteredSuggestions = SMART_SUGGESTIONS.filter(s => 
    s.toLowerCase().includes(searchQuery.toLowerCase().trim())
  ).slice(0, 7);

  const [categoriesList, setCategoriesList] = useState<CategoryData[]>([]);

  useEffect(() => {
    async function loadCats() {
      const cats = await getCategories();
      setCategoriesList(cats);
    }
    loadCats();
  }, []);

  const CategoryDropdown = () => (
    <div className="absolute top-full left-0 mt-2 w-80 bg-white border border-border rounded-2xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50 overflow-hidden transform origin-top-left scale-95 group-hover:scale-100 max-h-[420px] overflow-y-auto custom-scrollbar">
      <div className="p-2 border-b border-gray-100 bg-gray-50/70">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider px-2">Danh mục hàng hóa ({categoriesList.length})</span>
      </div>
      <div className="flex flex-col py-1.5 font-medium">
        {categoriesList.slice(0, 10).map((cat) => {
          const visual = getCategoryIconConfig(cat.name);
          const IconComponent = visual.Icon;
          return (
            <Link 
              key={cat.slug} 
              href={`/danh-muc/${cat.slug}`} 
              className="px-3.5 py-2 hover:bg-green-50/80 hover:text-primary transition-all flex items-center justify-between group/item"
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${visual.bg} ${visual.color} shadow-xs group-hover/item:scale-110 transition-transform`}>
                  <IconComponent size={17} />
                </div>
                <span className="text-[13px] font-semibold text-gray-700 group-hover/item:text-primary line-clamp-1">{cat.name}</span>
              </div>
              {cat.count > 0 && (
                <span className="text-[11px] bg-gray-100 text-gray-500 group-hover/item:bg-green-100 group-hover/item:text-primary px-2 py-0.5 rounded-full font-bold transition-colors">
                  {cat.count}
                </span>
              )}
            </Link>
          );
        })}
        <div className="border-t border-gray-100 my-1"></div>
        <Link href="/tat-ca-danh-muc" className="px-4 py-2.5 text-primary font-bold hover:bg-green-50 transition-colors text-center flex items-center justify-center gap-1 text-xs uppercase tracking-wide">
          Xem tất cả {categoriesList.length} danh mục <span className="text-base leading-none">&rsaquo;</span>
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
            <Link href="/store" className="opacity-90 hover:opacity-100 flex items-center gap-1">
              <MapPin size={14} /> Giao đến: Vui lòng chọn địa chỉ
            </Link>
          </div>
          <div className="flex gap-6">
            <Link href="/khuyen-mai" className="opacity-90 hover:opacity-100 font-medium">Khuyến mãi</Link>
            <Link href="/flash-sale" className="opacity-90 hover:opacity-100 font-medium text-amber-200 hover:text-white flex items-center gap-1">
              <Zap size={13} className="fill-amber-300 text-amber-300" /> Flash Sale
            </Link>
            <Link href="/ban-chay" className="opacity-90 hover:opacity-100 font-medium">Bán chạy</Link>
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
            <Link href="/store" className="shrink-0">
              <img src="/logos/logo_full.png" alt="C.T Mart" className={`w-auto object-contain ${isScrolled ? 'h-10' : 'h-14 md:h-16'}`} />
            </Link>

            {/* Dynamic Category Button */}
            <div className={`relative group shrink-0 hidden md:block z-50 ${isScrolled ? 'mr-2' : 'w-0 opacity-0 overflow-hidden'}`}>
              <Link href="/tat-ca-danh-muc" className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-lg transition-all hover:bg-primary/90 w-full whitespace-nowrap">
                <Menu size={18} />
                <span>Danh mục</span>
              </Link>
              <CategoryDropdown />
            </div>

            <form onSubmit={handleSearch} className="flex-1 max-w-lg relative flex group">
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => {
                  if (searchQuery.trim().length > 0) setShowSuggestions(true);
                }}
                onBlur={() => {
                  // Delay hiding so click event on suggestion can fire
                  setTimeout(() => setShowSuggestions(false), 250);
                }}
                className="w-full py-2 md:py-2.5 px-5 pr-20 border border-border rounded-full outline-none text-sm md:text-base transition-all duration-300 focus:border-primary focus:ring-2 focus:ring-primary/20 bg-white/50" 
                placeholder="Bạn ăn gì hôm nay? (Tìm tên hoặc mã sản phẩm...)" 
              />

              {/* Nút Xóa nhanh khi có từ khóa */}
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSuggestedProducts([]);
                    setShowSuggestions(false);
                  }}
                  className="absolute right-11 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                  title="Xóa tìm kiếm"
                >
                  <X size={15} />
                </button>
              )}

              <button 
                type="submit" 
                className="absolute right-1 top-1/2 -translate-y-1/2 bg-secondary text-white w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center font-medium transition-all hover:bg-secondary/90 hover:scale-105 shadow-md"
              >
                {isSearching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              </button>

              {/* Dropdown Gợi ý & Kết quả tức thì */}
              {showSuggestions && searchQuery.trim().length > 0 && (
                <div 
                  className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150"
                  onMouseDown={(e) => e.preventDefault()}
                >
                  {/* Tiêu đề popup */}
                  <div className="px-4 py-2 bg-slate-50 border-b border-gray-100 flex items-center justify-between text-xs text-slate-500 font-medium">
                    <span>Gợi ý tìm kiếm cho "{searchQuery.trim()}"</span>
                    {isSearching ? (
                      <span className="flex items-center gap-1 text-primary">
                        <Loader2 size={12} className="animate-spin" />
                        <span>Đang tìm...</span>
                      </span>
                    ) : suggestedProducts.length > 0 ? (
                      <span>{suggestedProducts.length} sản phẩm phù hợp</span>
                    ) : null}
                  </div>

                  {/* Đang tìm kiếm */}
                  {isSearching && suggestedProducts.length === 0 ? (
                    <div className="p-6 text-center text-sm text-slate-500 flex flex-col items-center justify-center gap-2">
                      <Loader2 size={20} className="animate-spin text-primary" />
                      <span>Đang tìm sản phẩm phù hợp...</span>
                    </div>
                  ) : !isSearching && suggestedProducts.length === 0 ? (
                    /* Không tìm thấy sản phẩm */
                    <div className="p-5 text-center text-sm text-slate-500">
                      <Package size={28} className="mx-auto text-slate-300 mb-1" />
                      <p className="font-medium text-slate-700">Không tìm thấy sản phẩm phù hợp</p>
                      <p className="text-xs text-slate-400 mt-0.5">Vui lòng thử lại với từ khóa khác (rau củ, dưa hấu, thịt cá, sữa...)</p>
                    </div>
                  ) : (
                    /* Danh sách sản phẩm gợi ý tức thì */
                    <ul className="divide-y divide-gray-100 max-h-[360px] overflow-y-auto">
                      {suggestedProducts.map((p) => {
                        const detailUrl = `/san-pham/${encodeProductSlug(p.sku || p.id)}`;
                        const isAvailable = (p.totalStock ?? 0) > 0;
                        return (
                          <li key={p.id || p.sku}>
                            <Link
                              href={detailUrl}
                              onClick={() => {
                                setShowSuggestions(false);
                              }}
                              className="p-3 hover:bg-slate-50 flex items-center gap-3 transition-colors group/item"
                            >
                              {/* Ảnh Thumbnail */}
                              <div className="w-11 h-11 rounded-lg border border-gray-100 bg-gray-50 overflow-hidden shrink-0 flex items-center justify-center">
                                {p.imageUrl ? (
                                  <img 
                                    src={p.imageUrl} 
                                    alt={p.name} 
                                    className="w-full h-full object-cover group-hover/item:scale-105 transition-transform"
                                    onError={(e) => {
                                      (e.target as HTMLElement).style.display = 'none';
                                    }}
                                  />
                                ) : (
                                  <Package size={20} className="text-slate-300" />
                                )}
                              </div>

                              {/* Thông tin */}
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-slate-800 line-clamp-1 group-hover/item:text-primary transition-colors">
                                  {p.name}
                                </div>
                                <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                                  <span>{p.category}</span>
                                  {p.unit && <span>• {p.unit}</span>}
                                  <span className="font-mono text-[11px] text-slate-400">({p.sku})</span>
                                </div>
                              </div>

                              {/* Giá & Tồn kho */}
                              <div className="text-right shrink-0">
                                <div className="text-sm font-bold text-emerald-700 font-mono">
                                  {p.price.toLocaleString('vi-VN')} đ
                                </div>
                                {isAvailable ? (
                                  <span className="inline-block text-[11px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 font-mono">
                                    Còn {p.totalStock} {p.unit || ''}
                                  </span>
                                ) : (
                                  <span className="inline-block text-[11px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                    Tạm hết
                                  </span>
                                )}
                              </div>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}

                  {/* Nút Xem tất cả kết quả */}
                  <div className="p-2.5 bg-slate-50/80 border-t border-gray-100 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setShowSuggestions(false);
                        router.push(`/tim-kiem?q=${encodeURIComponent(searchQuery.trim())}`);
                      }}
                      className="text-xs font-semibold text-primary hover:text-emerald-800 flex items-center justify-center gap-1.5 mx-auto py-1 px-3 rounded-lg hover:bg-white transition-all shadow-xs"
                    >
                      <span>Xem tất cả kết quả cho "{searchQuery.trim()}"</span>
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </form>

            <div className="flex items-center gap-4 md:gap-6 shrink-0 relative">
              
              {/* Account Dropdown Wrapper */}
              <div className="relative group/account">
                <Link href={mounted && isAuthenticated ? "/tai-khoan" : "/dang-nhap"} className="flex flex-col items-center text-xs md:text-sm text-gray-700 font-medium hover:text-primary transition-colors py-2">
                  <div className="text-primary mb-1 p-1.5 md:p-2 rounded-full bg-green-50 group-hover/account:bg-green-100 transition-colors">
                    <User size={20} />
                  </div>
                  <span className="hidden md:inline">{mounted && isAuthenticated ? (user?.name || "Tài khoản") : "Đăng nhập"}</span>
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
                        <div className="flex items-center gap-3"><Tag size={16} className="text-gray-500 group-hover/item:text-primary" /> Ưu đãi đặc biệt</div>
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
                        <div className="flex items-center gap-3"><MapPin size={16} className="text-gray-500 group-hover/item:text-primary" /> Địa chỉ nhận hàng (1)</div>
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
                        <Link key={item.id} href={`/san-pham/${encodeProductSlug(item.productId || item.id)}`} className="flex gap-3 p-3 hover:bg-gray-50 border-b border-gray-100 transition-colors">
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
        <div className="container mx-auto px-4 max-w-6xl flex gap-2 md:gap-4 font-semibold text-foreground items-center py-1.5 text-sm whitespace-nowrap overflow-x-auto custom-scrollbar">
          <div className="relative group shrink-0">
            <Link href="/tat-ca-danh-muc" className="flex items-center gap-2 bg-primary text-white px-5 py-2 rounded-lg transition-all hover:bg-primary/90 hover:shadow-md h-full">
              <Menu size={18} />
              <span>Tất cả danh mục</span>
            </Link>
            <CategoryDropdown />
          </div>

          {/* Dynamic Top Categories from real DB */}
          {categoriesList.slice(0, 7).map((cat) => {
            const visual = getCategoryIconConfig(cat.name);
            const IconComponent = visual.Icon;
            return (
              <Link 
                key={cat.slug} 
                href={`/danh-muc/${cat.slug}`} 
                className="hover:text-primary transition-all py-1.5 px-3 rounded-lg hover:bg-green-50/80 flex items-center gap-2 text-gray-700 font-semibold group shrink-0 border border-transparent hover:border-green-200"
              >
                <div className={`w-6 h-6 rounded-md flex items-center justify-center border ${visual.bg} ${visual.color} group-hover:scale-110 transition-transform`}>
                  <IconComponent size={14} />
                </div>
                <span className="group-hover:text-primary transition-colors text-[13px]">{cat.name}</span>
              </Link>
            );
          })}

          <Link 
            href="/tat-ca-danh-muc"
            className="hover:text-primary transition-all py-1.5 px-3 rounded-lg hover:bg-gray-100 flex items-center text-primary font-bold text-xs shrink-0"
          >
            + Xem thêm ({categoriesList.length - 7 > 0 ? categoriesList.length - 7 : ''})
          </Link>
        </div>
      </div>
    </>
  );
}
