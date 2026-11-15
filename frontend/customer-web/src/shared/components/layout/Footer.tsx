"use client";

import { useState } from 'react';
import Link from 'next/link';
import { MapPin, Mail, Phone, ShoppingBag, HelpCircle, FileText } from 'lucide-react';
import ShoppingGuideModal from '../ShoppingGuideModal';

export default function Footer() {
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  const socialLinks = [
    { name: 'Facebook', icon: '/social/facebook.png', href: 'https://facebook.com' },
    { name: 'Zalo', icon: '/social/zalo.png', href: 'https://zalo.me' },
    { name: 'YouTube', icon: '/social/youtube.png', href: 'https://youtube.com' },
    { name: 'TikTok', icon: '/social/tiktok.png', href: 'https://tiktok.com' },
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
    <>
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
                Hệ thống bán lẻ & phân phối nông sản, thực phẩm tươi sống thông minh trực thuộc SmartWarehouse, kiểm soát chất lượng chuẩn ISO và hạn sử dụng FEFO.
              </p>
              <ul className="flex flex-col gap-2.5 text-sm">
                <li><Link href="/tat-ca-danh-muc" className="text-muted-foreground hover:text-primary transition-colors">Tất cả danh mục thực phẩm</Link></li>
                <li><Link href="/ban-chay" className="text-muted-foreground hover:text-primary transition-colors">Sản phẩm bán chạy nhất</Link></li>
                <li><Link href="/flash-sale" className="text-muted-foreground hover:text-primary transition-colors">Khuyến mãi Flash Sale</Link></li>
                <li><Link href="/khuyen-mai" className="text-muted-foreground hover:text-primary transition-colors">E-Voucher & Mã giảm giá</Link></li>
              </ul>
            </div>

            {/* Cột 2: Hỗ trợ khách hàng */}
            <div className="flex flex-col">
              <h3 className="text-base font-bold mb-4 text-gray-900 uppercase tracking-wide">Hỗ trợ khách hàng</h3>
              <ul className="flex flex-col gap-2.5 text-sm">
                <li>
                  <button 
                    onClick={() => setIsGuideOpen(true)}
                    className="text-left text-muted-foreground hover:text-primary transition-colors font-medium flex items-center gap-1.5"
                  >
                    <span>Hướng dẫn mua hàng online</span>
                  </button>
                </li>
                <li><Link href="/tai-khoan/don-hang" className="text-muted-foreground hover:text-primary transition-colors">Tra cứu tiến độ đơn hàng</Link></li>
                <li><Link href="/tai-khoan" className="text-muted-foreground hover:text-primary transition-colors">Tài khoản & Điểm tích lũy</Link></li>
                <li><Link href="/gio-hang" className="text-muted-foreground hover:text-primary transition-colors">Giỏ hàng của bạn</Link></li>
              </ul>
            </div>

            {/* Cột 3: Liên hệ */}
            <div className="flex flex-col">
              <h3 className="text-base font-bold mb-4 text-gray-900 uppercase tracking-wide">Tổng đài hỗ trợ</h3>
              <ul className="flex flex-col gap-3.5 text-sm">
                <li>
                  <div className="flex items-start gap-2.5 text-muted-foreground">
                    <MapPin size={18} className="mt-0.5 shrink-0 text-primary"/> 
                    <span className="leading-snug">12, Nguyễn Văn Bảo, P. Hạnh Thông, Thành Phố Hồ Chí Minh</span>
                  </div>
                </li>
                <li>
                  <div className="flex items-center gap-2.5 text-muted-foreground">
                    <Phone size={18} className="shrink-0 text-primary"/> 
                    <a href="tel:1900555568" className="hover:text-primary transition-colors">
                      <span className="font-bold text-gray-900">Hotline: 1900 5555 68</span> (8h00 - 21h00)
                    </a>
                  </div>
                </li>
                <li>
                  <div className="flex items-center gap-2.5 text-muted-foreground">
                    <Mail size={18} className="shrink-0 text-primary"/> 
                    <a href="mailto:chamsockhachhang@ctmart.vn" className="hover:text-primary transition-colors">
                      <span>chamsockhachhang@ctmart.vn</span>
                    </a>
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
                    target="_blank"
                    rel="noreferrer"
                    title={social.name}
                    className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center transition-all hover:scale-110 hover:border-primary hover:shadow-xs p-2"
                  >
                    <img src={social.icon} alt={social.name} className="w-full h-full object-contain" />
                  </a>
                ))}
              </div>

              <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-2.5">Chứng nhận uy tín</h4>
              <div className="flex items-center gap-3 mb-4">
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

              <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">Tải ứng dụng C.T Mart</h4>
              <div className="flex flex-col gap-2">
                <a href="#" className="inline-flex items-center gap-2.5 bg-black hover:bg-gray-800 text-white px-3 py-1.5 rounded-lg border border-gray-700 transition-colors shadow-2xs">
                  <svg className="w-5 h-5 fill-white shrink-0" viewBox="0 0 24 24">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.62-.75 1.04-1.8 1.01-2.87-.96.04-2.13.64-2.79 1.41-.58.68-1.1 1.76-.96 2.8 1.07.08 2.12-.59 2.74-1.34z"/>
                  </svg>
                  <div className="text-left">
                    <div className="text-[8px] uppercase tracking-wider text-gray-400 font-medium leading-none">Download on the</div>
                    <div className="font-semibold text-xs text-white leading-tight">App Store</div>
                  </div>
                </a>
                <a href="#" className="inline-flex items-center gap-2.5 bg-black hover:bg-gray-800 text-white px-3 py-1.5 rounded-lg border border-gray-700 transition-colors shadow-2xs">
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M3.6 2.3l10.9 10.9-3.3 3.3L3.6 2.3z" />
                    <path fill="#34A853" d="M14.5 13.2l3.4 3.4-3.4 1.9-3.3-2 3.3-3.3z" />
                    <path fill="#EA4335" d="M3.6 21.7l7.6-7.6 3.3 3.3-10.9 4.3z" />
                    <path fill="#FBBC05" d="M17.9 16.6l3-1.7c.9-.5.9-1.3 0-1.8l-3-1.7-3.4 1.8 3.4 3.4z" />
                  </svg>
                  <div className="text-left">
                    <div className="text-[8px] uppercase tracking-wider text-gray-400 font-medium leading-none">GET IT ON</div>
                    <div className="font-semibold text-xs text-white leading-tight">Google Play</div>
                  </div>
                </a>
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
            <p className="font-semibold text-gray-800">
              Khóa luận tốt nghiệp Khoa Công nghệ Thông tin IUH bởi Lê Công Chung và Nguyễn Lâm Chí Tường
            </p>
            <p className="mt-1">
              Hệ thống Phân phối & Quản lý Kho Thông Minh C.T Mart SmartWarehouse © 2026.
            </p>
          </div>
        </div>
      </footer>

      {/* Shopping Guide Modal */}
      <ShoppingGuideModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />
    </>
  );
}
