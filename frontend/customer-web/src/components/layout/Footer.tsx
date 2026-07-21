import Link from 'next/link';
import { MapPin, Mail, Phone } from 'lucide-react';
import { FaFacebook, FaYoutube, FaInstagram } from 'react-icons/fa';

export default function Footer() {
  return (
    <footer className="bg-white pt-12 pb-4 mt-8 border-t border-border text-foreground">
      <div className="container mx-auto px-4 max-w-6xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
        
        <div className="flex flex-col">
          <h3 className="text-lg font-bold mb-5 text-primary">Về C.T Mart</h3>
          <ul className="flex flex-col gap-3">
            <li><Link href="/ve-chung-toi" className="text-muted-foreground hover:text-primary transition-colors">Giới thiệu C.T Mart</Link></li>
            <li><Link href="/he-thong" className="text-muted-foreground hover:text-primary transition-colors">Hệ thống siêu thị</Link></li>
            <li><Link href="/tuyen-dung" className="text-muted-foreground hover:text-primary transition-colors">Tuyển dụng</Link></li>
            <li><Link href="/tin-tuc" className="text-muted-foreground hover:text-primary transition-colors">Tin tức - Sự kiện</Link></li>
          </ul>
        </div>

        <div className="flex flex-col">
          <h3 className="text-lg font-bold mb-5 text-primary">Hỗ trợ khách hàng</h3>
          <ul className="flex flex-col gap-3">
            <li><Link href="/hd-mua-hang" className="text-muted-foreground hover:text-primary transition-colors">Hướng dẫn mua hàng</Link></li>
            <li><Link href="/chinh-sach-giao-hang" className="text-muted-foreground hover:text-primary transition-colors">Chính sách giao hàng</Link></li>
            <li><Link href="/chinh-sach-doi-tra" className="text-muted-foreground hover:text-primary transition-colors">Chính sách đổi trả</Link></li>
            <li><Link href="/chinh-sach-bao-mat" className="text-muted-foreground hover:text-primary transition-colors">Chính sách bảo mật</Link></li>
          </ul>
        </div>

        <div className="flex flex-col">
          <h3 className="text-lg font-bold mb-5 text-primary">Liên hệ</h3>
          <ul className="flex flex-col gap-4">
            <li>
              <span className="flex items-start gap-2 text-muted-foreground">
                <MapPin size={18} className="mt-0.5 shrink-0"/> 199-205 Nguyễn Thái Học, P. Bến Thành, Q.1, TP.HCM
              </span>
            </li>
            <li>
              <span className="flex items-center gap-2 text-muted-foreground">
                <Phone size={18} className="shrink-0"/> 1900 5555 68
              </span>
            </li>
            <li>
              <span className="flex items-center gap-2 text-muted-foreground break-all">
                <Mail size={18} className="shrink-0"/> chamsockhachhang@ctmart.vn
              </span>
            </li>
          </ul>
        </div>

        <div className="flex flex-col">
          <h3 className="text-lg font-bold mb-5 text-primary">Kết nối với chúng tôi</h3>
          <div className="flex gap-4">
            <a href="#" className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-primary transition-colors hover:bg-primary hover:text-white">
              <FaFacebook size={20} />
            </a>
            <a href="#" className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-primary transition-colors hover:bg-primary hover:text-white">
              <FaYoutube size={20} />
            </a>
            <a href="#" className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-primary transition-colors hover:bg-primary hover:text-white">
              <FaInstagram size={20} />
            </a>
          </div>
        </div>

      </div>
      
      <div className="border-t border-border pt-6 text-center text-sm text-muted-foreground">
        <div className="container mx-auto px-4 max-w-6xl">
          <p>© 2024 C.T Mart. Bản quyền thuộc về C.T Mart.</p>
          <p>Giấy chứng nhận ĐKKD số: 0300680650, cấp ngày 14/08/1999 tại Sở Kế hoạch và Đầu tư TP.HCM.</p>
        </div>
      </div>
    </footer>
  );
}
