"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronRight, Trash2, Plus, Minus, Ticket, ShoppingBag } from 'lucide-react';
import { useCartStore } from '@/lib/store';

export default function CartPage() {
  const { items, updateQuantity, removeFromCart } = useCartStore();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  const cartItems = mounted ? items : [];

  const formatPrice = (p: number) => p.toLocaleString('vi-VN') + 'đ';

  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  // Example discount logic if applicable
  const discount = 0; 
  const total = subtotal - discount;

  return (
    <div className="bg-gray-50 min-h-screen pb-20">
      {/* Breadcrumbs */}
      <div className="bg-white border-b border-border">
        <div className="container mx-auto px-4 max-w-6xl py-3 flex items-center gap-2 text-sm text-gray-500">
          <Link href="/" className="hover:text-primary transition-colors">Trang chủ</Link>
          <ChevronRight size={14} className="text-gray-400" />
          <span className="text-foreground font-medium">Giỏ hàng ({totalItems})</span>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-6xl mt-6">
        <h1 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-3">
          <ShoppingBag className="text-primary" size={24} />
          Giỏ hàng của bạn
        </h1>

        {cartItems.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-border p-12 flex flex-col items-center justify-center text-center">
            <img src="/empty-cart.png" alt="Empty Cart" className="w-48 mb-6 opacity-50" onError={(e) => { e.currentTarget.style.display = 'none' }} />
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
              <ShoppingBag size={48} className="text-gray-300" />
            </div>
            <h2 className="text-xl font-bold text-gray-700 mb-2">Giỏ hàng trống</h2>
            <p className="text-gray-500 mb-6 max-w-md">Bạn chưa có sản phẩm nào trong giỏ hàng. Hãy tham quan và mua sắm các sản phẩm tuyệt vời của chúng tôi nhé!</p>
            <Link href="/" className="bg-primary text-white font-bold py-3 px-8 rounded-lg hover:bg-primary/90 transition-colors shadow-md">
              Tiếp tục mua sắm
            </Link>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-6">
            
            {/* Left Column: Cart Items */}
            <div className="w-full lg:w-2/3">
              <div className="bg-white rounded-xl shadow-sm border border-border overflow-hidden">
                {/* Header row (Desktop only) */}
                <div className="hidden md:flex items-center p-4 bg-gray-50/50 border-b border-border text-sm font-bold text-gray-600">
                  <div className="w-1/2">Sản phẩm</div>
                  <div className="w-1/6 text-center">Đơn giá</div>
                  <div className="w-1/6 text-center">Số lượng</div>
                  <div className="w-1/6 text-right">Thành tiền</div>
                </div>

                {/* Items */}
                <div className="divide-y divide-gray-100">
                  {cartItems.map((item) => (
                    <div key={item.id} className="p-4 md:p-6 flex flex-col md:flex-row items-start md:items-center gap-4 group">
                      
                      {/* Product Info */}
                      <div className="flex gap-4 w-full md:w-1/2">
                        <Link href={`/san-pham/${item.productId}`} className="shrink-0 relative">
                          <img src={item.image} alt={item.name} className="w-20 h-20 md:w-24 md:h-24 object-contain rounded border border-gray-100 bg-white" />
                        </Link>
                        <div className="flex flex-col flex-1">
                          <Link href={`/san-pham/${item.productId}`} className="font-medium text-foreground hover:text-primary transition-colors line-clamp-2 mb-1">
                            {item.name}
                          </Link>
                          {item.variant && (
                            <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded inline-flex w-fit mb-2">
                              Loại: {item.variant}
                            </div>
                          )}
                          <button 
                            onClick={() => removeFromCart(item.id)}
                            className="text-sm text-red-500 font-medium flex items-center gap-1 w-fit mt-auto md:hidden"
                          >
                            <Trash2 size={14} /> Xóa
                          </button>
                        </div>
                      </div>

                      {/* Pricing & Quantity (Mobile layout adjusts) */}
                      <div className="flex w-full md:w-1/2 items-center justify-between md:justify-start mt-4 md:mt-0">
                        {/* Price */}
                        <div className="w-1/3 text-left md:text-center flex flex-col">
                          <span className="font-bold text-gray-800">{formatPrice(item.price)}</span>
                          {item.oldPrice && <span className="text-xs text-gray-400 line-through">{formatPrice(item.oldPrice)}</span>}
                        </div>

                        {/* Quantity */}
                        <div className="w-1/3 flex justify-center">
                          <div className="flex items-center border border-gray-300 rounded overflow-hidden">
                            <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="w-8 h-8 flex items-center justify-center bg-gray-50 hover:bg-gray-100 text-gray-600 transition-colors"><Minus size={14} /></button>
                            <input type="number" value={item.quantity} readOnly className="w-10 h-8 text-center text-sm font-medium border-x border-gray-300 focus:outline-none" />
                            <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="w-8 h-8 flex items-center justify-center bg-gray-50 hover:bg-gray-100 text-gray-600 transition-colors"><Plus size={14} /></button>
                          </div>
                        </div>

                        {/* Total Price */}
                        <div className="w-1/3 text-right flex flex-col items-end gap-2">
                          <span className="font-bold text-orange-500">{formatPrice(item.price * item.quantity)}</span>
                          <button 
                            onClick={() => removeFromCart(item.id)}
                            className="text-gray-400 hover:text-red-500 transition-colors hidden md:block"
                            title="Xóa sản phẩm"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>

                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Order Summary */}
            <div className="w-full lg:w-1/3">
              <div className="bg-white rounded-xl shadow-sm border border-border p-5 sticky top-24">
                <h3 className="font-bold text-lg text-foreground mb-4 border-b border-gray-100 pb-4">Tóm tắt đơn hàng</h3>
                
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-gray-600">
                    <span>Tạm tính ({totalItems} sản phẩm)</span>
                    <span className="font-medium">{formatPrice(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Phí giao hàng</span>
                    <span className="text-sm">Được tính ở bước sau</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Khuyến mãi</span>
                    <span className="font-medium text-primary">-{formatPrice(discount)}</span>
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-4 mb-6">
                  <div className="flex justify-between items-end mb-1">
                    <span className="font-bold text-foreground">Tổng cộng</span>
                    <span className="text-2xl font-bold text-orange-500">{formatPrice(total)}</span>
                  </div>
                  <p className="text-xs text-gray-500 text-right">(Đã bao gồm VAT nếu có)</p>
                </div>

                <div className="bg-orange-50 border border-orange-100 rounded-lg p-3 mb-6 flex items-start gap-3">
                  <Ticket className="text-orange-500 shrink-0 mt-0.5" size={18} />
                  <div className="text-sm text-orange-800">
                    Bạn có <strong>Mã giảm giá / Voucher</strong>? Đừng lo, bạn sẽ được nhập ở bước Thanh toán nhé!
                  </div>
                </div>

                <Link href="/thanh-toan" className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3.5 px-4 rounded-lg flex justify-center items-center gap-2 transition-all shadow-md">
                  Tiến hành thanh toán <ChevronRight size={18} />
                </Link>
                
                <Link href="/" className="w-full text-center block mt-4 text-sm font-medium text-primary hover:underline">
                  Tiếp tục mua sắm
                </Link>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
