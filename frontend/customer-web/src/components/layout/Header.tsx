import Link from 'next/link';
import { Search, User, ShoppingCart, Menu, MapPin, Phone } from 'lucide-react';

export default function Header() {
  return (
    <header className="sticky top-0 z-50 w-full transition-all duration-300">
      {/* Topbar */}
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
            <Link href="tel:1900555568" className="opacity-90 hover:opacity-100 flex items-center gap-1 font-bold text-yellow-300">
              <Phone size={14} /> Hotline: 1900 5555 68
            </Link>
          </div>
        </div>
      </div>

      {/* Main Header with Glassmorphism */}
      <div className="bg-white/85 backdrop-blur-md border-b border-border shadow-sm">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="py-4 flex items-center justify-between gap-8">
            <Link href="/" className="text-3xl font-extrabold text-primary flex items-center gap-1 tracking-tight">
              C.T<span className="text-secondary">Mart</span>
            </Link>

            <div className="flex-1 max-w-xl relative flex group">
              <input 
                type="text" 
                className="w-full py-3 px-5 pr-14 border border-border rounded-full outline-none text-base transition-all duration-300 focus:border-primary focus:ring-2 focus:ring-primary/20 bg-white/50" 
                placeholder="Bạn tìm gì hôm nay?" 
              />
              <button className="absolute right-1 top-1/2 -translate-y-1/2 bg-secondary text-white w-10 h-10 rounded-full flex items-center justify-center font-medium transition-all hover:bg-red-700 hover:scale-105 shadow-md">
                <Search size={18} />
              </button>
            </div>

            <div className="flex items-center gap-6">
              <button className="flex flex-col items-center text-sm text-foreground font-medium hover:text-primary transition-colors group">
                <div className="text-primary mb-1 p-2 rounded-full bg-blue-50 group-hover:bg-blue-100 transition-colors">
                  <User size={22} />
                </div>
                <span>Đăng nhập</span>
              </button>
              
              <button className="flex flex-col items-center text-sm text-foreground font-medium hover:text-primary transition-colors group relative">
                <div className="text-primary mb-1 p-2 rounded-full bg-blue-50 group-hover:bg-blue-100 transition-colors relative">
                  <ShoppingCart size={22} />
                  <span className="absolute -top-1 -right-1 bg-secondary text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full shadow-md animate-pulse">
                    0
                  </span>
                </div>
                <span>Giỏ hàng</span>
              </button>
            </div>
          </div>
        </div>

        {/* Navbar */}
        <div className="border-t border-border/50">
          <div className="container mx-auto px-4 max-w-6xl flex gap-6 font-semibold text-foreground items-center py-2 text-sm overflow-x-auto whitespace-nowrap">
            <button className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-lg transition-all hover:bg-green-700 hover:shadow-md shrink-0">
              <Menu size={18} />
              <span>Tất cả danh mục</span>
            </button>
            <Link href="/thuc-pham-tuoi-song" className="hover:text-primary transition-colors py-2">Thực phẩm tươi sống</Link>
            <Link href="/thuc-pham-cong-nghe" className="hover:text-primary transition-colors py-2">Thực phẩm công nghệ</Link>
            <Link href="/hoa-my-pham" className="hover:text-primary transition-colors py-2">Hóa mỹ phẩm</Link>
            <Link href="/do-dung-gia-dinh" className="hover:text-primary transition-colors py-2">Đồ dùng gia đình</Link>
            <Link href="/thoi-trang-may-mac" className="hover:text-primary transition-colors py-2">Thời trang may mặc</Link>
            <Link href="/me-va-be" className="hover:text-primary transition-colors py-2">Mẹ & Bé</Link>
          </div>
        </div>
      </div>
    </header>
  );
}
