"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronRight, MapPin, Truck, Store, CreditCard, Banknote, ShieldCheck, Ticket, ChevronLeft, Loader2, Sparkles, Navigation } from 'lucide-react';
import { useCartStore, useAuthStore } from '@/lib/store';

interface AddressSuggestion {
  displayName: string;
  lat: number;
  lng: number;
  highlightName?: string;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { items, clearCart } = useCartStore();
  const { user } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [deliveryMethod, setDeliveryMethod] = useState<'home' | 'store'>('home');
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'vnpay' | 'momo' | 'card'>('cod');
  const [voucherCode, setVoucherCode] = useState('');
  const [isVoucherApplied, setIsVoucherApplied] = useState(false);

  // Form State
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerCoordinates, setCustomerCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [customerNote, setCustomerNote] = useState('');

  // Address Autocomplete State (OpenStreetMap Nominatim / Photon)
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchTimerRef = useRef<any>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Update state when user is loaded
  useEffect(() => {
    if (user) {
      if (!customerName) setCustomerName(user.name || '');
      if (!customerPhone) setCustomerPhone(user.phone || '');
      if (!customerAddress && user.addresses && user.addresses.length > 0) {
        setCustomerAddress(user.addresses[0].streetAddress || '');
      }
    }
  }, [user]);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    setMounted(true);

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // OpenStreetMap Nominatim Address Search with Debounce
  const handleAddressChange = (text: string) => {
    setCustomerAddress(text);

    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }

    if (!text || text.trim().length < 3) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    setIsSearchingAddress(true);
    searchTimerRef.current = setTimeout(async () => {
      try {
        const query = text.trim();
        // 1. Fetch from OpenStreetMap Nominatim
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query + ' TP.HCM')}&format=json&limit=5&countrycodes=vn&addressdetails=1`;
        const res = await fetch(url, {
          headers: { 'User-Agent': 'CityMartSmartWarehouse/1.0' },
        });

        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            const mapped: AddressSuggestion[] = data.map((item: any) => ({
              displayName: item.display_name,
              lat: Number(item.lat),
              lng: Number(item.lon),
              highlightName: item.name || item.display_name.split(',')[0],
            }));
            setSuggestions(mapped);
            setShowDropdown(true);
            setIsSearchingAddress(false);
            return;
          }
        }

        // 2. Local Fallback dictionary for Ho Chi Minh City key roads
        const lower = query.toLowerCase();
        const localMatches: AddressSuggestion[] = [];
        if (lower.includes('quang trung')) {
          localMatches.push({ displayName: '350 Quang Trung, Phường 10, Quận Gò Vấp, TP.HCM', lat: 10.8398, lng: 106.6582 });
        }
        if (lower.includes('phạm văn chiêu') || lower.includes('pham van chieu')) {
          localMatches.push({ displayName: '215 Phạm Văn Chiêu, Phường 14, Quận Gò Vấp, TP.HCM', lat: 10.8492, lng: 106.6543 });
        }
        if (lower.includes('phan huy ích') || lower.includes('phan huy ich')) {
          localMatches.push({ displayName: '88 Phan Huy Ích, Phường 12, Quận Gò Vấp, TP.HCM', lat: 10.8315, lng: 106.6345 });
        }
        if (lower.includes('lê văn thọ') || lower.includes('le van tho')) {
          localMatches.push({ displayName: '540 Lê Văn Thọ, Phường 16, Quận Gò Vấp, TP.HCM', lat: 10.8465, lng: 106.6521 });
        }
        if (lower.includes('cây trâm') || lower.includes('nguyễn văn khối')) {
          localMatches.push({ displayName: '32/5 Nguyễn Văn Khối, Phường 9, Quận Gò Vấp, TP.HCM', lat: 10.8432, lng: 106.6567 });
        }
        if (lower.includes('nguyễn oanh')) {
          localMatches.push({ displayName: '450 Nguyễn Oanh, Phường 6, Quận Gò Vấp, TP.HCM', lat: 10.8420, lng: 106.6780 });
        }
        if (lower.includes('lại hùng cường') || lower.includes('bình chánh')) {
          localMatches.push({ displayName: '145 Lại Hùng Cường, Vĩnh Lộc B, Bình Chánh, TP.HCM', lat: 10.6868, lng: 106.5932 });
        }

        setSuggestions(localMatches);
        setShowDropdown(localMatches.length > 0);
      } catch (e) {
        setSuggestions([]);
      } finally {
        setIsSearchingAddress(false);
      }
    }, 350);
  };

  const handleSelectSuggestion = (s: AddressSuggestion) => {
    setCustomerAddress(s.displayName);
    setCustomerCoordinates({ lat: s.lat, lng: s.lng });
    setShowDropdown(false);
  };

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

  const handlePlaceOrder = async () => {
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
    
    try {
      // Chuẩn bị payload dữ liệu gửi sang order-service kèm toạ độ vệ tinh chính xác
      const orderPayload = {
        customerId: user?.id || null,
        customerName: deliveryMethod === 'home' ? customerName : 'Khách nhận tại siêu thị',
        customerPhone,
        customerAddress: deliveryMethod === 'home' ? customerAddress : 'Nhận tại cửa hàng',
        shippingLat: customerCoordinates?.lat || null,
        shippingLng: customerCoordinates?.lng || null,
        note: customerNote,
        deliveryMethod,
        paymentMethod,
        voucherCode: isVoucherApplied ? voucherCode : null,
        subtotal,
        shippingFee,
        discount,
        totalAmount: total,
        items: cartItems.map(item => ({
          productId: item.productId || item.id,
          sku: item.sku || item.productId || item.id,
          productName: item.name,
          quantity: item.quantity,
          price: item.price
        }))
      };

      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      
      const response = await fetch('http://localhost:3004/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(orderPayload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.warn("Backend error (Order Service):", errorData);
        setErrorMsg(errorData.message || "Có lỗi xảy ra khi đặt hàng. Vui lòng thử lại.");
        setIsSubmitting(false);
        return;
      }
      
      const createdOrder = await response.json();
      
      clearCart();
      router.push(`/tai-khoan/don-hang?success=1&orderId=${createdOrder.id || ''}`);
      
    } catch (err: any) {
      console.error("Order submit failed:", err);
      setErrorMsg("Không thể kết nối đến máy chủ xử lý đơn hàng. Vui lòng kiểm tra lại kết nối.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link href="/" className="hover:text-primary transition-colors">Trang chủ</Link>
          <ChevronRight size={16} />
          <Link href="/gio-hang" className="hover:text-primary transition-colors">Giỏ hàng</Link>
          <ChevronRight size={16} />
          <span className="text-gray-900 font-medium">Thanh toán</span>
        </div>

        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8">Thanh toán đơn hàng</h1>

        {errorMsg && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-medium animate-shake">
            {errorMsg}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Main Form (Left 7/12) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* 1. Delivery Information */}
            <div className="bg-white rounded-xl shadow-sm border border-border p-5 md:p-6">
              <h2 className="text-lg font-bold text-foreground mb-4">1. Hình thức nhận hàng</h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <label className={`border rounded-lg p-4 cursor-pointer flex items-start gap-3 transition-all ${deliveryMethod === 'home' ? 'border-primary bg-green-50/50' : 'border-border hover:border-gray-300'}`}>
                  <input 
                    type="radio" 
                    name="delivery" 
                    className="mt-1 accent-primary w-4 h-4" 
                    checked={deliveryMethod === 'home'} 
                    onChange={() => setDeliveryMethod('home')}
                  />
                  <div>
                    <div className="font-bold text-gray-800 flex items-center gap-2"><Truck size={18} className="text-primary" /> Giao tận nơi</div>
                    <div className="text-sm text-gray-500 mt-1">Giao hàng tươi sống siêu tốc trong 1-2h</div>
                  </div>
                </label>

                <label className={`border rounded-lg p-4 cursor-pointer flex items-start gap-3 transition-all ${deliveryMethod === 'store' ? 'border-primary bg-green-50/50' : 'border-border hover:border-gray-300'}`}>
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

              {/* Shipping Address Form with Nominatim Autocomplete */}
              {deliveryMethod === 'home' && (
                <div className="mt-6 pt-6 border-t border-gray-100">
                  <div className="flex items-center gap-2 mb-4">
                    <MapPin size={18} className="text-emerald-600" />
                    <h3 className="font-semibold text-gray-800">Thông tin nhận hàng (Định vị OpenStreetMap)</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Họ và tên *</label>
                      <input 
                        type="text" 
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Nhập họ và tên"
                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 text-sm" 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại *</label>
                      <input 
                        type="tel" 
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="Nhập số điện thoại"
                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 text-sm" 
                      />
                    </div>
                  </div>
                  
                  {/* Address Input with OpenStreetMap Suggestions Dropdown */}
                  <div className="mb-4 relative" ref={dropdownRef}>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center justify-between">
                      <span>Địa chỉ nhận hàng *</span>
                      <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                        <Sparkles size={12} /> Tự động gợi ý địa chỉ OpenStreetMap
                      </span>
                    </label>
                    
                    <div className="relative">
                      <input 
                        type="text" 
                        value={customerAddress}
                        onChange={(e) => handleAddressChange(e.target.value)}
                        onFocus={() => { if (suggestions.length > 0) setShowDropdown(true); }}
                        placeholder="Nhập số nhà, tên đường (Ví dụ: 350 Quang Trung, Gò Vấp)..."
                        className="w-full border border-gray-300 rounded-lg pl-4 pr-10 py-2.5 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-sm" 
                      />
                      <div className="absolute right-3 top-3 text-gray-400">
                        {isSearchingAddress ? (
                          <Loader2 size={16} className="animate-spin text-emerald-600" />
                        ) : (
                          <Navigation size={16} className="text-gray-400" />
                        )}
                      </div>
                    </div>

                    {/* Suggestions Dropdown */}
                    {showDropdown && suggestions.length > 0 && (
                      <div className="absolute z-50 left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden max-h-60 overflow-y-auto animate-fadeIn">
                        <div className="p-2 text-[11px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                          <span>Địa chỉ khớp tại TP. Hồ Chí Minh</span>
                          <span className="text-emerald-600">OpenStreetMap</span>
                        </div>
                        {suggestions.map((s, idx) => (
                          <div
                            key={idx}
                            onClick={() => handleSelectSuggestion(s)}
                            className="p-3 hover:bg-emerald-50 cursor-pointer border-b border-gray-100 last:border-0 transition-colors flex items-start gap-2.5"
                          >
                            <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg shrink-0 mt-0.5">
                              <MapPin size={14} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-semibold text-gray-800 truncate">
                                {s.highlightName || s.displayName.split(',')[0]}
                              </div>
                              <div className="text-xs text-gray-500 line-clamp-1">
                                {s.displayName}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú thêm (Không bắt buộc)</label>
                    <textarea 
                      rows={2} 
                      value={customerNote}
                      onChange={(e) => setCustomerNote(e.target.value)}
                      placeholder="Ví dụ: Giao giờ hành chính, gọi trước khi giao..." 
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 text-sm"
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
                        <div>
                          <div className="font-bold text-gray-800">Thanh toán khi nhận hàng (COD)</div>
                          <div className="text-sm text-gray-500">Thanh toán tiền mặt trực tiếp cho nhân viên giao hàng</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </label>

                <label className={`block border rounded-lg p-4 cursor-pointer transition-all ${paymentMethod === 'vnpay' ? 'border-primary bg-green-50' : 'border-border hover:border-gray-300 bg-white'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <input type="radio" name="payment" className="accent-primary w-4 h-4" checked={paymentMethod === 'vnpay'} onChange={() => setPaymentMethod('vnpay')} />
                      <div className="flex items-center gap-2">
                        <CreditCard className="text-blue-600" size={24} />
                        <div>
                          <div className="font-bold text-gray-800">Cổng thanh toán VNPAY</div>
                          <div className="text-sm text-gray-500">Quét mã QR qua ứng dụng ngân hàng hoặc thẻ ATM nội địa</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </label>

                <label className={`block border rounded-lg p-4 cursor-pointer transition-all ${paymentMethod === 'momo' ? 'border-primary bg-green-50' : 'border-border hover:border-gray-300 bg-white'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <input type="radio" name="payment" className="accent-primary w-4 h-4" checked={paymentMethod === 'momo'} onChange={() => setPaymentMethod('momo')} />
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-[#A50064] text-white flex items-center justify-center font-black text-xs">M</div>
                        <div>
                          <div className="font-bold text-gray-800">Ví MoMo</div>
                          <div className="text-sm text-gray-500">Thanh toán qua ví điện tử MoMo siêu tiện lợi</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </label>
              </div>
            </div>

          </div>

          {/* Sidebar Order Summary (Right 5/12) */}
          <div className="lg:col-span-5">
            <div className="bg-white rounded-xl shadow-sm border border-border p-5 md:p-6 sticky top-24">
              <h2 className="text-lg font-bold text-foreground mb-4 pb-3 border-b border-border flex items-center justify-between">
                <span>Tóm tắt đơn hàng</span>
                <span className="text-sm font-normal text-muted-foreground">({cartItems.length} sản phẩm)</span>
              </h2>

              {/* Items List Mini */}
              <div className="max-h-60 overflow-y-auto space-y-3 mb-4 pr-1 divide-y divide-gray-100">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex gap-3 pt-3 first:pt-0">
                    <div className="w-12 h-12 bg-gray-50 rounded-lg overflow-hidden border border-border flex items-center justify-center shrink-0">
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <Store size={20} className="text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-foreground truncate">{item.name}</h4>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {item.quantity} x <span className="text-foreground font-semibold">{formatPrice(item.price)}</span>
                      </div>
                    </div>
                    <div className="text-sm font-bold text-foreground text-right shrink-0">
                      {formatPrice(item.price * item.quantity)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Voucher Form */}
              <form onSubmit={handleApplyVoucher} className="flex gap-2 mb-6 pt-3 border-t border-border">
                <div className="relative flex-1">
                  <Ticket className="absolute left-3 top-2.5 text-gray-400" size={18} />
                  <input
                    type="text"
                    value={voucherCode}
                    onChange={(e) => setVoucherCode(e.target.value)}
                    placeholder="Mã giảm giá (ví dụ: FRESH20)"
                    disabled={isVoucherApplied}
                    className="w-full border border-border rounded-lg pl-10 pr-3 py-2 text-sm focus:outline-none focus:border-primary disabled:bg-gray-100"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isVoucherApplied || !voucherCode}
                  className="bg-gray-900 hover:bg-black text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isVoucherApplied ? 'Đã dùng' : 'Áp dụng'}
                </button>
              </form>

              {/* Price Calculation Table */}
              <div className="space-y-2.5 text-sm mb-6 border-t border-border pt-4">
                <div className="flex justify-between text-muted-foreground">
                  <span>Tạm tính</span>
                  <span className="text-foreground font-medium">{formatPrice(subtotal)}</span>
                </div>
                
                <div className="flex justify-between text-muted-foreground">
                  <span>Phí vận chuyển</span>
                  <span className="text-foreground font-medium">
                    {deliveryMethod === 'home' ? formatPrice(shippingFee) : 'Miễn phí'}
                  </span>
                </div>

                {isVoucherApplied && (
                  <div className="flex justify-between text-primary font-medium">
                    <span>Mã giảm giá (FRESH20)</span>
                    <span>-{formatPrice(discount)}</span>
                  </div>
                )}

                <div className="border-t border-border pt-3 flex justify-between items-baseline">
                  <span className="font-bold text-base text-foreground">Tổng cộng</span>
                  <span className="font-extrabold text-2xl text-primary">{formatPrice(total)}</span>
                </div>
              </div>

              {/* Submit CTA Button */}
              <button
                onClick={handlePlaceOrder}
                disabled={isSubmitting || cartItems.length === 0}
                className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Đang xử lý đơn hàng...</span>
                  </>
                ) : (
                  <>
                    <span>Đặt hàng ngay</span>
                    <ChevronRight size={18} />
                  </>
                )}
              </button>

              {/* Safe Checkout Badges */}
              <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <ShieldCheck size={16} className="text-primary" />
                <span>Bảo mật thanh toán & Cam kết thực phẩm tươi 100%</span>
              </div>

            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
