"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronRight, MapPin, Truck, Store, CreditCard, Banknote, ShieldCheck, Ticket, ChevronLeft } from 'lucide-react';
import { useCartStore } from '@/lib/store';

export default function CheckoutPage() {
  const router = useRouter();
  const { items, clearCart } = useCartStore();
  const [mounted, setMounted] = useState(false);
  const [deliveryMethod, setDeliveryMethod] = useState<'home' | 'store'>('home');
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'vnpay' | 'momo' | 'card'>('cod');
  const [voucherCode, setVoucherCode] = useState('');
  const [isVoucherApplied, setIsVoucherApplied] = useState(false);

  // Form State
  const [customerName, setCustomerName] = useState('Anh Chung');
  const [customerPhone, setCustomerPhone] = useState('0912345678');
  const [customerAddress, setCustomerAddress] = useState('128 Trần Quang Khải, Phường Tân Định, Quận 1');
  const [customerNote, setCustomerNote] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  const formatPrice = (p: number) => p.toLocaleString('vi-VN') + 'đ';

  const cartItems = mounted ? items : [];

  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const shippingFee = deliveryMethod === 'home' ? 15000 : 0;
  const discount = isVoucherApplied ? 20000 : 0; 
  const total = subtotal + shippingFee - discount;

  const handleApplyVoucher = (e: React.FormEvent) => {
    e.preventDefault();
    if (voucherCode.trim() !== '') {
      setIsVoucherApplied(true);
    }
  };

  const handlePlaceOrder = () => {
    if (cartItems.length === 0) {
      setErrorMsg("Giỏ hàng của bạn đang trống!");
      return;
    }
    
    if (deliveryMethod === 'home') {
      if (!customerName.trim() || !customerPhone.trim() || !customerAddress.trim()) {
        setErrorMsg("Vui lòng điền đầy đủ thông tin giao hàng!");
        return;
      }
    }
    
    setErrorMsg('');
    setIsSubmitting(true);
    
    // Simulate API call delay
    setTimeout(() => {
      clearCart();
      router.push('/thanh-toan/thanh-cong');
    }, 1500);
  };

  return (
    <div className="bg-gray-50 min-h-screen pb-20">
      {/* Breadcrumbs */}
      <div className="bg-white border-b border-border">
        <div className="container mx-auto px-4 max-w-6xl py-3 flex items-center gap-2 text-sm text-gray-500">
          <Link href="/gio-hang" className="hover:text-primary transition-colors flex items-center gap-1">
            <ChevronLeft size={16} /> Quay lại Giỏ hàng
          </Link>
          <ChevronRight size={14} className="text-gray-400 ml-2" />
          <span className="text-foreground font-medium">Thanh toán</span>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-6xl mt-6">
        <h1 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-3">
          <ShieldCheck className="text-primary" size={26} />
          Tiến hành thanh toán
        </h1>

        <div className="flex flex-col lg:flex-row gap-6">
          
          {/* Left Column: Forms */}
          <div className="w-full lg:w-2/3 space-y-6">
            
            {/* 1. Delivery Method */}
            <div className="bg-white rounded-xl shadow-sm border border-border p-5 md:p-6">
              <h2 className="text-lg font-bold text-foreground mb-4">1. Phương thức nhận hàng</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label 
                  className={`border rounded-lg p-4 cursor-pointer transition-all flex gap-3 ${deliveryMethod === 'home' ? 'border-primary bg-green-50 ring-1 ring-primary/20' : 'border-border hover:border-gray-300 bg-white'}`}
                >
                  <input 
                    type="radio" 
                    name="delivery" 
                    className="mt-1 accent-primary w-4 h-4" 
                    checked={deliveryMethod === 'home'} 
                    onChange={() => setDeliveryMethod('home')}
                  />
                  <div>
                    <div className="font-bold text-gray-800 flex items-center gap-2"><Truck size={18} className="text-primary" /> Giao tận nơi</div>
                    <div className="text-sm text-gray-500 mt-1">Giao hàng nhanh chóng trong 2H</div>
                  </div>
                </label>

                <label 
                  className={`border rounded-lg p-4 cursor-pointer transition-all flex gap-3 ${deliveryMethod === 'store' ? 'border-primary bg-green-50 ring-1 ring-primary/20' : 'border-border hover:border-gray-300 bg-white'}`}
                >
                  <input 
                    type="radio" 
                    name="delivery" 
                    className="mt-1 accent-primary w-4 h-4" 
                    checked={deliveryMethod === 'store'} 
                    onChange={() => setDeliveryMethod('store')}
                  />
                  <div>
                    <div className="font-bold text-gray-800 flex items-center gap-2"><Store size={18} className="text-primary" /> Nhận tại siêu thị</div>
                    <div className="text-sm text-gray-500 mt-1">Đến lấy hàng tiện lợi, miễn phí vận chuyển</div>
                  </div>
                </label>
              </div>

              {/* Shipping Address Form (if home delivery) */}
              {deliveryMethod === 'home' && (
                <div className="mt-6 pt-6 border-t border-gray-100">
                  <div className="flex items-center gap-2 mb-4">
                    <MapPin size={18} className="text-gray-500" />
                    <h3 className="font-semibold text-gray-800">Thông tin giao hàng</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Họ và tên *</label>
                      <input 
                        type="text" 
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Nhập họ và tên"
                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20" 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại *</label>
                      <input 
                        type="tel" 
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="Nhập số điện thoại"
                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20" 
                      />
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Địa chỉ nhận hàng *</label>
                    <input 
                      type="text" 
                      value={customerAddress}
                      onChange={(e) => setCustomerAddress(e.target.value)}
                      placeholder="Số nhà, Tên đường, Phường/Xã, Quận/Huyện"
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20" 
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú thêm (Không bắt buộc)</label>
                    <textarea 
                      rows={2} 
                      value={customerNote}
                      onChange={(e) => setCustomerNote(e.target.value)}
                      placeholder="Ví dụ: Giao giờ hành chính, gọi trước khi giao..." 
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                    ></textarea>
                  </div>
                </div>
              )}
            </div>

            {/* 2. Payment Method */}
            <div className="bg-white rounded-xl shadow-sm border border-border p-5 md:p-6">
              <h2 className="text-lg font-bold text-foreground mb-4">2. Phương thức thanh toán</h2>
              
              <div className="space-y-3">
                <label className={`block border rounded-lg p-4 cursor-pointer transition-all ${paymentMethod === 'cod' ? 'border-primary bg-green-50' : 'border-border hover:border-gray-300 bg-white'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <input type="radio" name="payment" className="accent-primary w-4 h-4" checked={paymentMethod === 'cod'} onChange={() => setPaymentMethod('cod')} />
                      <div className="flex items-center gap-2">
                        <Banknote className="text-green-600" size={24} />
                        <span className="font-medium text-gray-800">Thanh toán tiền mặt khi nhận hàng (COD)</span>
                      </div>
                    </div>
                  </div>
                </label>

                <label className={`block border rounded-lg p-4 cursor-pointer transition-all ${paymentMethod === 'vnpay' ? 'border-primary bg-green-50' : 'border-border hover:border-gray-300 bg-white'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <input type="radio" name="payment" className="accent-primary w-4 h-4" checked={paymentMethod === 'vnpay'} onChange={() => setPaymentMethod('vnpay')} />
                      <div className="flex items-center gap-2">
                        <img src="https://vnpay.vn/s1/statics.vnpay.vn/2023/9/06ncktiwd6dc1694418189687.png" alt="VNPay" className="h-6 w-auto object-contain" />
                        <span className="font-medium text-gray-800">Thanh toán qua VNPAY-QR</span>
                      </div>
                    </div>
                  </div>
                </label>

                <label className={`block border rounded-lg p-4 cursor-pointer transition-all ${paymentMethod === 'card' ? 'border-primary bg-green-50' : 'border-border hover:border-gray-300 bg-white'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <input type="radio" name="payment" className="accent-primary w-4 h-4" checked={paymentMethod === 'card'} onChange={() => setPaymentMethod('card')} />
                      <div className="flex items-center gap-2">
                        <CreditCard className="text-blue-600" size={24} />
                        <span className="font-medium text-gray-800">Thẻ ATM / Thẻ tín dụng (Visa, MasterCard)</span>
                      </div>
                    </div>
                  </div>
                </label>
              </div>
            </div>

          </div>

          {/* Right Column: Order Summary */}
          <div className="w-full lg:w-1/3">
            <div className="bg-white rounded-xl shadow-sm border border-border sticky top-24 overflow-hidden">
              <div className="p-5 border-b border-gray-100 bg-gray-50/50">
                <h3 className="font-bold text-lg text-foreground">Đơn hàng ({cartItems.length} sản phẩm)</h3>
              </div>

              {/* Small Items List */}
              <div className="max-h-60 overflow-y-auto p-5 border-b border-gray-100 space-y-4">
                {cartItems.map(item => (
                  <div key={item.id} className="flex gap-3">
                    <img src={item.image} alt={item.name} className="w-16 h-16 object-contain rounded border border-gray-100" />
                    <div className="flex-1 text-sm">
                      <div className="font-medium text-gray-800 line-clamp-2">{item.name}</div>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-gray-500">SL: {item.quantity}</span>
                        <span className="font-bold text-gray-800">{formatPrice(item.price * item.quantity)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Voucher Area */}
              <div className="p-5 border-b border-gray-100">
                <div className="flex items-center gap-2 font-semibold text-gray-800 mb-3">
                  <Ticket size={18} className="text-primary" /> Mã giảm giá / Voucher
                </div>
                <form onSubmit={handleApplyVoucher} className="flex gap-2">
                  <input 
                    type="text" 
                    value={voucherCode}
                    onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                    placeholder="Nhập mã tại đây" 
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm uppercase focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                    disabled={isVoucherApplied}
                  />
                  <button 
                    type="submit"
                    disabled={isVoucherApplied || voucherCode.trim() === ''}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                      isVoucherApplied 
                        ? 'bg-gray-200 text-gray-500' 
                        : voucherCode.trim() !== '' 
                          ? 'bg-primary text-white hover:bg-primary/90' 
                          : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {isVoucherApplied ? 'Đã áp dụng' : 'Áp dụng'}
                  </button>
                </form>
                {isVoucherApplied && (
                  <div className="mt-2 text-sm text-green-600 font-medium">
                    ✓ Đã áp dụng mã giảm giá thành công!
                  </div>
                )}
              </div>
              
              {/* Totals */}
              <div className="p-5">
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-gray-600 text-sm">
                    <span>Tạm tính</span>
                    <span className="font-medium">{formatPrice(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600 text-sm">
                    <span>Phí giao hàng</span>
                    <span className="font-medium">{shippingFee === 0 ? 'Miễn phí' : formatPrice(shippingFee)}</span>
                  </div>
                  {isVoucherApplied && (
                    <div className="flex justify-between text-primary text-sm">
                      <span>Giảm giá Voucher</span>
                      <span className="font-medium">-{formatPrice(discount)}</span>
                    </div>
                  )}
                </div>

                <div className="border-t border-gray-100 pt-4 mb-6">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-foreground">Tổng cộng</span>
                    <span className="text-2xl font-bold text-orange-500">{formatPrice(Math.max(total, 0))}</span>
                  </div>
                  <p className="text-xs text-gray-500 text-right">(Đã bao gồm VAT nếu có)</p>
                </div>

                {errorMsg && (
                  <div className="mb-4 p-3 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm text-center font-medium">
                    {errorMsg}
                  </div>
                )}
                
                <button 
                  onClick={handlePlaceOrder}
                  disabled={isSubmitting}
                  className={`w-full text-white font-bold py-3.5 px-4 rounded-lg transition-all shadow-md text-lg flex items-center justify-center gap-2 ${
                    isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-orange-500 hover:bg-orange-600'
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ĐANG XỬ LÝ...
                    </>
                  ) : (
                    'ĐẶT HÀNG'
                  )}
                </button>
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
