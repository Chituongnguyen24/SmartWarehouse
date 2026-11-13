"use client";

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { LogIn, UserPlus, X, ShoppingCart, ShieldCheck, ArrowRight } from 'lucide-react';

interface AuthPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  productName?: string;
  redirectUrl?: string;
}

export default function AuthPromptModal({
  isOpen,
  onClose,
  productName,
  redirectUrl = '/'
}: AuthPromptModalProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Khóa cuộn body khi modal mở
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Đóng modal khi bấm Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  const handleGoToLogin = () => {
    onClose();
    router.push(`/dang-nhap?redirect=${encodeURIComponent(redirectUrl)}`);
  };

  const modalContent = (
    <div 
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-lg w-full p-6 sm:p-8 relative overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Nút đóng */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-gray-400 hover:text-gray-700 transition-colors p-1.5 rounded-lg hover:bg-gray-100"
          aria-label="Đóng"
        >
          <X size={20} />
        </button>

        {/* Biểu tượng chính */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 text-primary flex items-center justify-center shrink-0 shadow-xs">
            <ShoppingCart size={28} />
          </div>
          <div>
            <span className="text-xs uppercase font-bold tracking-wider text-primary">Yêu cầu xác thực</span>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight">
              Đăng nhập để mua hàng
            </h2>
          </div>
        </div>

        {/* Nội dung thông báo */}
        <p className="text-sm sm:text-base text-gray-600 mb-5 leading-relaxed">
          {productName ? (
            <>
              Để thêm <strong className="text-gray-900 font-semibold">"{productName}"</strong> vào giỏ hàng và tiến hành thanh toán, bạn cần đăng nhập tài khoản khách hàng.
            </>
          ) : (
            'Để thêm sản phẩm vào giỏ hàng và thanh toán đơn hàng, bạn cần đăng nhập tài khoản khách hàng.'
          )}
        </p>

        {/* Thông tin dành cho người dùng chưa có tài khoản */}
        <div className="bg-amber-50/90 border border-amber-200 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5 font-bold">
              <UserPlus size={18} />
            </div>
            <div className="text-xs sm:text-sm text-amber-900 leading-relaxed">
              <strong className="font-semibold block mb-0.5 text-amber-950">Chưa có tài khoản CityMart?</strong>
              Không cần thủ tục phức tạp. Chỉ cần nhập số điện thoại, hệ thống sẽ tự động đăng ký tài khoản mới miễn phí cho bạn qua mã OTP trong 30 giây.
            </div>
          </div>
        </div>

        {/* Nút hành động */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleGoToLogin}
            className="flex-1 bg-primary hover:bg-primary/90 text-white font-semibold py-3 px-5 rounded-xl transition-all flex items-center justify-center gap-2 text-sm sm:text-base shadow-sm hover:shadow-md cursor-pointer"
          >
            <LogIn size={18} />
            <span>Đăng nhập / Đăng ký ngay</span>
            <ArrowRight size={16} className="ml-1 opacity-80" />
          </button>
          
          <button
            onClick={onClose}
            className="sm:w-auto px-5 py-3 border border-gray-300 text-gray-700 hover:bg-gray-100 font-medium rounded-xl transition-colors text-sm sm:text-base cursor-pointer"
          >
            Để sau
          </button>
        </div>

        {/* Cam kết bảo mật chân trang */}
        <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-center gap-2 text-xs text-gray-400">
          <ShieldCheck size={15} className="text-emerald-600" />
          Bảo mật an toàn tuyệt đối qua mã OTP xác thực
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
