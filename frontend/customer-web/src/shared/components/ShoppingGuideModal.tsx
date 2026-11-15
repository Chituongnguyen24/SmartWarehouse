"use client";

import React from 'react';
import { X, ShoppingBag, Tag, CreditCard, Truck, CheckCircle2, ChevronRight } from 'lucide-react';
import Link from 'next/link';

interface ShoppingGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ShoppingGuideModal({ isOpen, onClose }: ShoppingGuideModalProps) {
  if (!isOpen) return null;

  const steps = [
    {
      step: 1,
      title: "Khám phá & Chọn thực phẩm tươi sạch",
      desc: "Duyệt qua hơn 14 danh mục nông sản tươi ngon, thịt cá tươi sống hoặc gõ tên sản phẩm vào thanh tìm kiếm. Chọn số lượng và nhấn 'Thêm vào giỏ hàng'.",
      icon: ShoppingBag,
      tag: "Bước 1"
    },
    {
      step: 2,
      title: "Kiểm tra giỏ hàng & Nhập mã ưu đãi",
      desc: "Vào giỏ hàng kiểm tra danh sách sản phẩm, hạn sử dụng và số lượng. Chọn mã voucher giảm giá (E-Voucher) áp dụng trực tiếp cho đơn hàng.",
      icon: Tag,
      tag: "Bước 2"
    },
    {
      step: 3,
      title: "Xác nhận địa chỉ & Phương thức thanh toán",
      desc: "Xác nhận địa chỉ giao nhận (hệ thống tự động đồng bộ vị trí vệ tinh chuẩn xác). Chọn hình thức thanh toán thuận tiện: Tiền mặt COD, Ví MoMo, VNPAY-QR.",
      icon: CreditCard,
      tag: "Bước 3"
    },
    {
      step: 4,
      title: "Kho thông minh điều phối & Giao hàng tận nơi",
      desc: "Hệ thống WMS tự động điều phối soạn hàng theo quy tắc FEFO (First-Expired, First-Out), đóng gói chuyên nghiệp và tài xế C.T Mart giao siêu tốc đến tận tay bạn.",
      icon: Truck,
      tag: "Bước 4"
    }
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 font-bold">
              <ShoppingBag size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Hướng Dẫn Mua Hàng Trực Tuyến</h2>
              <p className="text-xs text-slate-500">4 bước đặt thực phẩm tươi sạch siêu tốc tại C.T Mart</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            title="Đóng"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Steps */}
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {steps.map((s) => (
            <div 
              key={s.step} 
              className="flex items-start gap-4 p-4 rounded-xl border border-slate-100 bg-white hover:border-emerald-200 hover:bg-emerald-50/30 transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 font-bold shadow-xs">
                <s.icon size={20} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full uppercase tracking-wider">
                    {s.tag}
                  </span>
                  <h3 className="text-sm font-bold text-slate-800">{s.title}</h3>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}

          {/* Membership bonus notice */}
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
            <div className="text-amber-600 font-bold mt-0.5">
              <CheckCircle2 size={18} />
            </div>
            <div className="text-xs text-amber-900 leading-relaxed">
              <strong className="font-bold">Đặc quyền tích điểm thành viên C.T Mart:</strong> Mỗi 10.000đ thanh toán đơn hàng hoàn tất sẽ tích lũy 1 điểm thưởng để nâng hạng (Hạng Đồng &rarr; Hạng Bạc &rarr; Hạng Vàng &rarr; Kim Cương) và nhận hàng loạt ưu đãi độc quyền!
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Đóng
          </button>
          <Link
            href="/tat-ca-danh-muc"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-sm transition-colors"
          >
            <span>Mua sắm ngay</span>
            <ChevronRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}
