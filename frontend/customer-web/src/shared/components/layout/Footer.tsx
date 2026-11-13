import Link from 'next/link';
import { MapPin, Mail, Phone, ShieldCheck } from 'lucide-react';

export default function Footer() {
  const socialLinks = [
    { name: 'Facebook', icon: '/social/facebook.png', href: '#' },
    { name: 'Zalo', icon: '/social/zalo.png', href: '#' },
    { name: 'YouTube', icon: '/social/youtube.png', href: '#' },
    { name: 'TikTok', icon: '/social/tiktok.png', href: '#' },
  ];

  const paymentMethods = [
    { name: 'VNPAY-QR', logo: '/payments/vnpay.png' },
    { name: 'Ví MoMo', logo: '/payments/momo.png' },
    { name: 'Visa', logo: '/payments/visa.png' },
    { name: 'Mastercard', logo: '/payments/mastercard.svg' },
    { name: 'Napas', logo: '/payments/napas.png' },
    { name: 'Tiền mặt COD', logo: '/payments/cod.png' },
  ];

  return (
    <footer className="bg-white pt-12 pb-6 mt-12 border-t border-border text-foreground">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
          
          {/* Cột 1: Về C.T Mart */}
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-4">
              <img src="/logos/logo_icon.png" alt="C.T Mart Icon" className="w-8 h-8 object-contain" />
              <h3 className="text-lg font-bold text-primary">Về C.T Mart</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed mb-4">
              Hệ thống bán lẻ & siêu thị thông minh hàng đầu, cung cấp thực phẩm tươi sạch và hàng bách hóa chính hãng mỗi ngày.
            </p>
            <ul className="flex flex-col gap-2.5 text-sm">
              <li><Link href="/ve-chung-toi" className="text-muted-foreground hover:text-primary transition-colors">Giới thiệu C.T Mart</Link></li>
              <li><Link href="/he-thong-sieu-thi" className="text-muted-foreground hover:text-primary transition-colors">Hệ thống siêu thị</Link></li>
              <li><Link href="/tuyen-dung" className="text-muted-foreground hover:text-primary transition-colors">Tuyển dụng nhân tài</Link></li>
              <li><Link href="/tin-tuc" className="text-muted-foreground hover:text-primary transition-colors">Tin tức & Sự kiện</Link></li>
            </ul>
          </div>

          {/* Cột 2: Hỗ trợ khách hàng */}
          <div className="flex flex-col">
            <h3 className="text-base font-bold mb-4 text-gray-900 uppercase tracking-wide">Hỗ trợ khách hàng</h3>
            <ul className="flex flex-col gap-2.5 text-sm">
              <li><Link href="/hd-mua-hang" className="text-muted-foreground hover:text-primary transition-colors">Hướng dẫn đặt hàng online</Link></li>
              <li><Link href="/chinh-sach-giao-hang" className="text-muted-foreground hover:text-primary transition-colors">Chính sách giao hàng nhanh</Link></li>
              <li><Link href="/chinh-sach-doi-tra" className="text-muted-foreground hover:text-primary transition-colors">Quy định đổi trả & hoàn tiền</Link></li>
              <li><Link href="/chinh-sach-bao-mat" className="text-muted-foreground hover:text-primary transition-colors">Chính sách bảo mật dữ liệu</Link></li>
              <li><Link href="/dieu-khoan-su-dung" className="text-muted-foreground hover:text-primary transition-colors">Điều khoản dịch vụ</Link></li>
            </ul>
          </div>

          {/* Cột 3: Liên hệ */}
          <div className="flex flex-col">
            <h3 className="text-base font-bold mb-4 text-gray-900 uppercase tracking-wide">Tổng đài hỗ trợ</h3>
            <ul className="flex flex-col gap-3.5 text-sm">
              <li>
                <div className="flex items-start gap-2.5 text-muted-foreground">
                  <MapPin size={18} className="mt-0.5 shrink-0 text-primary"/> 
                  <span className="leading-snug">199-205 Nguyễn Thái Học, P. Bến Thành, Q.1, TP.HCM</span>
                </div>
              </li>
              <li>
                <div className="flex items-center gap-2.5 text-muted-foreground">
                  <Phone size={18} className="shrink-0 text-primary"/> 
                  <span className="font-bold text-gray-900">Hotline: 1900 5555 68</span> (8h00 - 21h00)
                </div>
              </li>
              <li>
                <div className="flex items-center gap-2.5 text-muted-foreground">
                  <Mail size={18} className="shrink-0 text-primary"/> 
                  <span>chamsockhachhang@ctmart.vn</span>
                </div>
              </li>
            </ul>
          </div>

          {/* Cột 4: Kết nối & Chứng nhận */}
          <div className="flex flex-col">
            <h3 className="text-base font-bold mb-3.5 text-gray-900 uppercase tracking-wide">Kết nối với chúng tôi</h3>
            <div className="flex gap-2.5 mb-6">
              {socialLinks.map((social) => (
                <a 
                  key={social.name}
                  href={social.href} 
                  title={social.name}
                  className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center transition-all hover:scale-110 hover:border-primary hover:shadow-xs p-2"
                >
                  <img src={social.icon} alt={social.name} className="w-full h-full object-contain" />
                </a>
              ))}
            </div>

            <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-2.5">Chứng nhận uy tín</h4>
            <div className="flex items-center gap-3">
              <img 
                src="/certs/bo-cong-thuong.png" 
                alt="Đã thông báo Bộ Công Thương" 
                className="h-10 object-contain"
                title="Đã thông báo Bộ Công Thương"
              />
              <img 
                src="/certs/pci-dss.jpg" 
                alt="Chứng chỉ bảo mật thanh toán PCI DSS" 
                className="h-9 object-contain rounded border border-gray-100"
                title="Chứng chỉ PCI DSS Compliance"
              />
            </div>
          </div>

        </div>

        {/* Thanh phương thức thanh toán */}
        <div className="border-t border-gray-150 pt-6 pb-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Phương thức thanh toán hỗ trợ:</span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {paymentMethods.map((pm) => (
                <div 
                  key={pm.name}
                  className="h-8 px-3 rounded-lg bg-white border border-gray-200 flex items-center justify-center shadow-2xs hover:border-primary transition-colors"
                  title={pm.name}
                >
                  <img src={pm.logo} alt={pm.name} className="h-4 md:h-5 max-w-[55px] object-contain" />
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Bản quyền */}
        <div className="border-t border-gray-100 pt-5 text-center text-xs text-muted-foreground leading-relaxed">
          <p>© 2026 C.T Mart - Hệ thống Phân phối & Quản lý Kho Thông Minh SmartWarehouse. Tất cả các quyền được bảo lưu.</p>
          <p className="mt-1">Giấy chứng nhận ĐKKD số: 0300680650 do Sở Kế hoạch & Đầu tư TP.HCM cấp ngày 14/08/1999.</p>
        </div>
      </div>
    </footer>
  );
}
