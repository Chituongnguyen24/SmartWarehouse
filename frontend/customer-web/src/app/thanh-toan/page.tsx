"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronRight, MapPin, Truck, Store, CreditCard, Banknote, ShieldCheck, Ticket, ChevronLeft, Loader2, Navigation, Edit2, CheckCircle2, Info, Tag, AlertCircle, X } from 'lucide-react';
import { useCartStore, useAuthStore } from '@/lib/store';
import { getVouchers, validateVoucherCode, VoucherItem, getApiHost } from '@/lib/api';
import { PaymentSimulatorModal } from '@/features/checkout';

interface AddressSuggestion {
  displayName: string;
  lat: number;
  lng: number;
  highlightName?: string;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { items, clearCart } = useCartStore();
  const { user, isAuthenticated, token } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (mounted && (!isAuthenticated || !token)) {
      router.push('/dang-nhap?redirect=/thanh-toan');
    }
  }, [mounted, isAuthenticated, token, router]);
  const [deliveryMethod, setDeliveryMethod] = useState<'home' | 'store'>('home');
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'vnpay' | 'momo' | 'card'>('cod');
  const [voucherCode, setVoucherCode] = useState('');
  const [isVoucherApplied, setIsVoucherApplied] = useState(false);
  const [appliedVoucher, setAppliedVoucher] = useState<VoucherItem | null>(null);
  const [voucherDiscountAmount, setVoucherDiscountAmount] = useState<number>(0);
  const [voucherMessage, setVoucherMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [availableVouchers, setAvailableVouchers] = useState<VoucherItem[]>([]);
  const [isValidatingVoucher, setIsValidatingVoucher] = useState(false);
  const idempotencyKeyRef = useRef<string>('');

  useEffect(() => {
    if (!idempotencyKeyRef.current) {
      idempotencyKeyRef.current = 'IDEM-' + Date.now() + '-' + Math.random().toString(36).slice(2, 9);
    }
  }, []);

  useEffect(() => {
    getVouchers().then(list => {
      if (Array.isArray(list)) setAvailableVouchers(list);
    }).catch(() => {});
  }, []);

  // Form State
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerCoordinates, setCustomerCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [customerNote, setCustomerNote] = useState('');
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [savedAddress, setSavedAddress] = useState('');

  // Address Autocomplete State (OpenStreetMap Nominatim / Photon)
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchTimerRef = useRef<any>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Tự động đồng bộ và nạp địa chỉ đã lưu trong hồ sơ tài khoản
  useEffect(() => {
    const fetchLatestUser = async () => {
      let activeToken = token;
      if (!activeToken && typeof window !== 'undefined') {
        try {
          const authStorage = JSON.parse(localStorage.getItem('auth-storage') || '{}');
          activeToken = authStorage?.state?.token;
        } catch (e) {}
      }
      if (!activeToken) return;
      try {
        const res = await fetch(`${getApiHost(3012)}/auth/me`, {
          headers: { Authorization: `Bearer ${activeToken}` },
          signal: AbortSignal.timeout(3000)
        });
        if (res.ok) {
          const fresh = await res.json();
          if (fresh.name && !customerName) setCustomerName(fresh.name);
          if (fresh.phone && !customerPhone) setCustomerPhone(fresh.phone);
          const primaryAddr = fresh.addresses?.find((a: any) => a.isDefault) || fresh.addresses?.[0];
          if (primaryAddr?.streetAddress) {
            setSavedAddress(primaryAddr.streetAddress);
            setCustomerAddress(primaryAddr.streetAddress);
            if (primaryAddr.latitude && primaryAddr.longitude) {
              setCustomerCoordinates({
                lat: Number(primaryAddr.latitude),
                lng: Number(primaryAddr.longitude)
              });
            }
          }
        }
      } catch (e) {
        console.warn('Lỗi khi nạp hồ sơ mới nhất:', e);
      }
    };

    if (user) {
      if (!customerName) setCustomerName(user.name || '');
      if (!customerPhone) setCustomerPhone(user.phone || '');
      const addr = user.addresses?.find((a: any) => a.isDefault) || user.addresses?.[0];
      if (addr?.streetAddress) {
        setSavedAddress(addr.streetAddress);
        if (!customerAddress) setCustomerAddress(addr.streetAddress);
        if (addr.latitude && addr.longitude && !customerCoordinates) {
          setCustomerCoordinates({
            lat: Number(addr.latitude),
            lng: Number(addr.longitude)
          });
        }
      }
    }

    fetchLatestUser();
  }, [user, token]);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
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
        const goongKey = process.env.NEXT_PUBLIC_GOONG_API_KEY || '9ZLtEkemS6YgqbCVlt5yfFCl0VdvJIN57mCXRge6';
        
        // 1. Fetch from Goong.io Place AutoComplete API
        const url = `https://rsapi.goong.io/Place/AutoComplete?api_key=${goongKey}&input=${encodeURIComponent(query)}&location=10.8231,106.6297&limit=6`;
        const res = await fetch(url);

        if (res.ok) {
          const data = await res.json();
          if (data.status === 'OK' && Array.isArray(data.predictions) && data.predictions.length > 0) {
            const mapped: AddressSuggestion[] = data.predictions.map((item: any) => ({
              displayName: item.description,
              lat: 10.8354, // will be resolved precisely on select
              lng: 106.6668,
              highlightName: item.structured_formatting?.main_text || item.description.split(',')[0],
              placeId: item.place_id,
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
        if (lower.includes('nguyễn oanh')) {
          localMatches.push({ displayName: '450 Nguyễn Oanh, Phường 6, Quận Gò Vấp, TP.HCM', lat: 10.8420, lng: 106.6780 });
        }

        setSuggestions(localMatches);
        setShowDropdown(localMatches.length > 0);
      } catch (e) {
        setSuggestions([]);
      } finally {
        setIsSearchingAddress(false);
      }
    }, 300);
  };

  const handleSelectSuggestion = async (s: AddressSuggestion & { placeId?: string }) => {
    setCustomerAddress(s.displayName);
    setShowDropdown(false);

    if (s.placeId) {
      try {
        const goongKey = process.env.NEXT_PUBLIC_GOONG_API_KEY || '9ZLtEkemS6YgqbCVlt5yfFCl0VdvJIN57mCXRge6';
        const detailRes = await fetch(`https://rsapi.goong.io/Place/Detail?place_id=${s.placeId}&api_key=${goongKey}`);
        if (detailRes.ok) {
          const detailData = await detailRes.json();
          if (detailData.status === 'OK' && detailData.result?.geometry?.location) {
            const loc = detailData.result.geometry.location;
            setCustomerCoordinates({ lat: Number(loc.lat), lng: Number(loc.lng) });
            if (detailData.result.formatted_address) {
              setCustomerAddress(detailData.result.formatted_address);
            }
            return;
          }
        }
      } catch (err) {
        console.warn('Failed to fetch Goong place detail:', err);
      }
    }

    setCustomerCoordinates({ lat: s.lat, lng: s.lng });
  };

  const formatPrice = (p: number) => p.toLocaleString('vi-VN') + 'đ';

  const cartItems = mounted ? items : [];

  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  // Cơ chế tính phí giao hàng thông minh chuẩn Logistics CityMart:
  // - Nhận tại siêu thị: Miễn phí (0đ).
  // - Đơn hàng từ 300.000đ trở lên: Miễn phí vận chuyển (Freeship chính sách khách hàng).
  // - Đơn hàng dưới 300.000đ:
  //   + Có tọa độ vệ tinh (khoảng cách <= 5km từ Hub Gò Vấp 10.8354, 106.6668): 15.000đ (Nội quận).
  //   + Khoảng cách > 5km: 22.000đ.
  //   + Chưa định vị tọa độ: 15.000đ mặc định.
  const calculateDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const deliveryDistance = customerCoordinates
    ? calculateDistanceKm(10.8354, 106.6668, customerCoordinates.lat, customerCoordinates.lng)
    : null;

  const rawShippingFee = deliveryMethod === 'home'
    ? (subtotal >= 300000 
        ? 0 
        : (deliveryDistance && deliveryDistance > 5 ? 22000 : 15000))
    : 0;

  const isFreeShip = deliveryMethod === 'home' && subtotal >= 300000;
  
  // Tính toán giảm giá đồng bộ chính xác
  const isVoucherFreeship = isVoucherApplied && appliedVoucher && (appliedVoucher.discountType === 'FREESHIP' || appliedVoucher.code.includes('SHIP'));
  const effectiveShippingDiscount = isVoucherFreeship ? rawShippingFee : 0;
  const shippingFee = Math.max(0, rawShippingFee - effectiveShippingDiscount);

  const effectiveProductDiscount = isVoucherFreeship ? 0 : (isVoucherApplied ? voucherDiscountAmount : 0);
  const discount = effectiveProductDiscount + effectiveShippingDiscount;
  const total = Math.max(0, subtotal + rawShippingFee - discount);

  const handleApplyVoucher = async (e?: React.FormEvent, customCode?: string) => {
    if (e) e.preventDefault();
    const codeToApply = (customCode || voucherCode).trim().toUpperCase();
    if (!codeToApply) return;

    setIsValidatingVoucher(true);
    setVoucherMessage(null);

    const itemsPayload = cartItems.map(item => ({
      productId: item.productId || item.id,
      sku: item.sku,
      name: item.name,
      category: item.category,
      price: item.price,
      quantity: item.quantity
    }));

    const result = await validateVoucherCode(codeToApply, subtotal, itemsPayload, user?.id);
    setIsValidatingVoucher(false);

    if (result.valid && result.voucher) {
      setVoucherCode(codeToApply);
      setAppliedVoucher(result.voucher);
      let disc = Number(result.discountAmount || 0);
      if (result.voucher.discountType === 'FREESHIP' || codeToApply.includes('SHIP')) {
        disc = rawShippingFee;
      }
      setVoucherDiscountAmount(disc);
      setIsVoucherApplied(true);
      setVoucherMessage({ type: 'success', text: result.message || `Đã áp dụng mã "${codeToApply}" thành công!` });
    } else {
      setIsVoucherApplied(false);
      setAppliedVoucher(null);
      setVoucherDiscountAmount(0);
      setVoucherMessage({ type: 'error', text: result.message || 'Mã giảm giá không hợp lệ hoặc không đủ điều kiện.' });
    }
  };

  const handleRemoveVoucher = () => {
    setIsVoucherApplied(false);
    setAppliedVoucher(null);
    setVoucherDiscountAmount(0);
    setVoucherCode('');
    setVoucherMessage(null);
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

    // Nếu chọn cổng thanh toán online (VNPAY, MoMo, Thẻ Quốc Tế), bật Modal giả lập thanh toán
    if (paymentMethod !== 'cod') {
      setShowPaymentModal(true);
      return;
    }

    // Nếu là COD, tiến hành gửi đơn trực tiếp
    await submitOrderToServer('cod');
  };

  const submitOrderToServer = async (activePaymentMethod: string, extraNote?: string, transactionId?: string) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const orderPayload = {
        idempotencyKey: idempotencyKeyRef.current,
        transactionId: transactionId || null,
        customerId: user?.id || null,
        customerName: deliveryMethod === 'home' ? customerName : 'Khách nhận tại siêu thị',
        customerPhone,
        customerAddress: deliveryMethod === 'home' ? customerAddress : 'Nhận tại cửa hàng',
        shippingLat: customerCoordinates?.lat || null,
        shippingLng: customerCoordinates?.lng || null,
        note: extraNote ? `${customerNote ? customerNote + ' | ' : ''}${extraNote}` : customerNote,
        deliveryMethod,
        paymentMethod: activePaymentMethod,
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

      let activeAuthToken = token;
      if (!activeAuthToken && typeof window !== 'undefined') {
        try {
          const authStorage = JSON.parse(localStorage.getItem('auth-storage') || '{}');
          activeAuthToken = authStorage?.state?.token;
        } catch (e) {}
      }
      
      const response = await fetch(`${getApiHost(3004)}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(activeAuthToken ? { 'Authorization': `Bearer ${activeAuthToken}` } : {})
        },
        body: JSON.stringify(orderPayload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.warn("Backend error (Order Service):", errorData);
        setShowPaymentModal(false);
        setErrorMsg(errorData.message || "Rất tiếc! Sản phẩm hoặc suất ưu đãi Flash Sale này vừa có khách hàng khác đặt mua trước. Quý khách vui lòng kiểm tra lại số lượng giỏ hàng!");
        setIsSubmitting(false);
        return;
      }
      
      const createdOrder = await response.json();

      // Tự động lưu địa chỉ và tọa độ vào hồ sơ khách hàng để dùng vĩnh viễn cho các lần mua sau
      if (activeAuthToken && customerAddress) {
        fetch(`${getApiHost(3012)}/users/profile`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${activeAuthToken}`
          },
          body: JSON.stringify({
            name: customerName,
            phone: customerPhone,
            addressStr: customerAddress,
            lat: customerCoordinates?.lat,
            lng: customerCoordinates?.lng
          })
        }).catch(() => {});
      }

      setShowPaymentModal(false);
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
                    <h3 className="font-semibold text-gray-800">Thông tin nhận hàng (Định vị Goong Maps)</h3>
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
                  
                  {/* Address Selector / Input with Goong Suggestions */}
                  <div className="mb-4 relative" ref={dropdownRef}>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-sm font-medium text-gray-700">
                        Địa chỉ nhận hàng *
                      </label>
                      {savedAddress && !isEditingAddress && (
                        <button
                          type="button"
                          onClick={() => setIsEditingAddress(true)}
                          className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1 hover:underline cursor-pointer"
                        >
                          <Edit2 size={13} /> Thay đổi địa chỉ khác
                        </button>
                      )}
                      {isEditingAddress && savedAddress && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsEditingAddress(false);
                            setCustomerAddress(savedAddress);
                          }}
                          className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1 hover:underline cursor-pointer"
                        >
                          Dùng lại địa chỉ mặc định
                        </button>
                      )}
                    </div>

                    {/* Hiển thị địa chỉ mặc định đã lưu của tài khoản */}
                    {savedAddress && !isEditingAddress ? (
                      <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-start justify-between gap-3 shadow-2xs">
                        <div className="flex items-start gap-2.5">
                          <div className="p-1.5 bg-emerald-600 text-white rounded-lg mt-0.5 shrink-0">
                            <MapPin size={15} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                                Địa chỉ mặc định trong tài khoản
                              </span>
                              <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                                <CheckCircle2 size={10} /> Đã chọn
                              </span>
                            </div>
                            <p className="text-sm font-semibold text-slate-900 mt-1 leading-snug">
                              {customerAddress || savedAddress}
                            </p>
                            {customerCoordinates && (
                              <p className="text-[11px] text-slate-500 mt-0.5 font-normal">
                                Tọa độ giao nhận: {customerCoordinates.lat.toFixed(5)}, {customerCoordinates.lng.toFixed(5)}
                              </p>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsEditingAddress(true)}
                          className="px-2.5 py-1 text-xs font-medium text-emerald-700 hover:text-emerald-800 hover:bg-emerald-100/60 rounded-lg transition-colors border border-emerald-300 shrink-0"
                        >
                          Đổi
                        </button>
                      </div>
                    ) : (
                      /* Khung nhập tìm kiếm địa chỉ mới qua Goong Maps */
                      <div className="relative">
                        <input 
                          type="text" 
                          value={customerAddress}
                          onChange={(e) => handleAddressChange(e.target.value)}
                          onFocus={() => { if (suggestions.length > 0) setShowDropdown(true); }}
                          placeholder="Nhập số nhà, tên đường (Ví dụ: 350 Quang Trung, Gò Vấp)..."
                          className="w-full border border-gray-300 rounded-lg pl-4 pr-10 py-2.5 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-sm bg-white" 
                        />
                        <div className="absolute right-3 top-3 text-gray-400">
                          {isSearchingAddress ? (
                            <Loader2 size={16} className="animate-spin text-emerald-600" />
                          ) : (
                            <Navigation size={16} className="text-gray-400" />
                          )}
                        </div>
                      </div>
                    )}

                    {/* Suggestions Dropdown */}
                    {showDropdown && suggestions.length > 0 && (
                      <div className="absolute z-50 left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden max-h-60 overflow-y-auto animate-fadeIn">
                        <div className="p-2 text-[11px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                          <span>Địa chỉ khớp tại TP. Hồ Chí Minh</span>
                          <span className="text-emerald-600">Goong Maps</span>
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
                <label className={`block border rounded-xl p-4 cursor-pointer transition-all ${paymentMethod === 'cod' ? 'border-primary bg-emerald-50/60 shadow-2xs' : 'border-border hover:border-gray-300 bg-white'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <input type="radio" name="payment" className="accent-primary w-4 h-4" checked={paymentMethod === 'cod'} onChange={() => setPaymentMethod('cod')} />
                      <div className="flex items-center gap-3">
                        <img src="/payments/cod.png" alt="COD" className="w-8 h-8 object-contain" />
                        <div>
                          <div className="font-bold text-gray-800 text-sm">Thanh toán khi nhận hàng (COD)</div>
                          <div className="text-xs text-gray-500">Thanh toán tiền mặt trực tiếp cho nhân viên giao hàng khi nhận kiện hàng</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </label>

                <label className={`block border rounded-xl p-4 cursor-pointer transition-all ${paymentMethod === 'vnpay' ? 'border-primary bg-emerald-50/60 shadow-2xs' : 'border-border hover:border-gray-300 bg-white'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <input type="radio" name="payment" className="accent-primary w-4 h-4" checked={paymentMethod === 'vnpay'} onChange={() => setPaymentMethod('vnpay')} />
                      <div className="flex items-center gap-3">
                        <img src="/payments/vnpay.png" alt="VNPAY" className="w-8 h-8 object-contain rounded" />
                        <div>
                          <div className="font-bold text-gray-800 text-sm">Cổng thanh toán VNPAY-QR</div>
                          <div className="text-xs text-gray-500">Quét mã VNPAY-QR qua 35+ ứng dụng ngân hàng hoặc thẻ ATM nội địa Napas</div>
                        </div>
                      </div>
                    </div>
                    <img src="/payments/napas.png" alt="Napas" className="h-4 object-contain opacity-70 hidden sm:block" />
                  </div>
                </label>

                <label className={`block border rounded-xl p-4 cursor-pointer transition-all ${paymentMethod === 'momo' ? 'border-primary bg-emerald-50/60 shadow-2xs' : 'border-border hover:border-gray-300 bg-white'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <input type="radio" name="payment" className="accent-primary w-4 h-4" checked={paymentMethod === 'momo'} onChange={() => setPaymentMethod('momo')} />
                      <div className="flex items-center gap-3">
                        <img src="/payments/momo.png" alt="Ví MoMo" className="w-8 h-8 object-contain rounded-lg" />
                        <div>
                          <div className="font-bold text-gray-800 text-sm">Ví điện tử MoMo</div>
                          <div className="text-xs text-gray-500">Thanh toán tức thì qua ứng dụng ví điện tử MoMo bảo mật cao</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </label>

                <label className={`block border rounded-xl p-4 cursor-pointer transition-all ${paymentMethod === 'card' ? 'border-primary bg-emerald-50/60 shadow-2xs' : 'border-border hover:border-gray-300 bg-white'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <input type="radio" name="payment" className="accent-primary w-4 h-4" checked={paymentMethod === 'card'} onChange={() => setPaymentMethod('card')} />
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded">
                          <img src="/payments/visa.png" alt="Visa" className="h-4 object-contain" />
                          <img src="/payments/mastercard.svg" alt="Mastercard" className="h-4 object-contain" />
                        </div>
                        <div>
                          <div className="font-bold text-gray-800 text-sm">Thẻ Quốc Tế (Visa, Mastercard, JCB)</div>
                          <div className="text-xs text-gray-500">Hỗ trợ tất cả thẻ tín dụng và ghi nợ quốc tế bảo mật 3D-Secure</div>
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
                        <img 
                          src={item.image} 
                          alt={item.name} 
                          className="w-full h-full object-cover" 
                        />
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

              {/* Voucher Form & Quick Select */}
              <div className="mb-6 pt-3 border-t border-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Ticket size={14} className="text-emerald-700" />
                    Mã Giảm Giá / Voucher
                  </span>
                  {isVoucherApplied && (
                    <button
                      type="button"
                      onClick={handleRemoveVoucher}
                      className="text-xs text-rose-600 hover:text-rose-800 font-medium flex items-center gap-1"
                    >
                      <X size={12} /> Gỡ mã
                    </button>
                  )}
                </div>

                <form onSubmit={handleApplyVoucher} className="flex gap-2">
                  <div className="relative flex-1">
                    <Ticket className="absolute left-3 top-2.5 text-gray-400" size={18} />
                    <input
                      type="text"
                      value={voucherCode}
                      onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                      placeholder="Nhập mã voucher (VD: CTMART20, FREESHIP)"
                      disabled={isVoucherApplied}
                      className="w-full border border-border rounded-lg pl-10 pr-3 py-2 text-sm focus:outline-none focus:border-emerald-700 disabled:bg-gray-100 uppercase font-mono font-bold"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isVoucherApplied || !voucherCode.trim() || isValidatingVoucher}
                    className="bg-emerald-800 hover:bg-emerald-900 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 shrink-0"
                  >
                    {isValidatingVoucher ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        Kiểm tra...
                      </>
                    ) : isVoucherApplied ? (
                      <>
                        <CheckCircle2 size={14} />
                        Đã áp dụng
                      </>
                    ) : (
                      'Áp dụng'
                    )}
                  </button>
                </form>

                {/* Voucher Feedback Message */}
                {voucherMessage && (
                  <div className={`mt-2 p-2 rounded text-xs flex items-center gap-1.5 border ${
                    voucherMessage.type === 'success' 
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200 font-medium' 
                      : 'bg-rose-50 text-rose-800 border-rose-200'
                  }`}>
                    {voucherMessage.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                    <span>{voucherMessage.text}</span>
                  </div>
                )}

                {/* Quick Voucher Suggestions */}
                {availableVouchers.length > 0 && !isVoucherApplied && (
                  <div className="mt-3">
                    <div className="text-[11px] text-slate-500 mb-1.5 font-medium">Mã ưu đãi dành cho bạn:</div>
                    <div className="flex flex-wrap gap-1.5">
                      {availableVouchers.slice(0, 4).map(v => (
                        <button
                          key={v.code}
                          type="button"
                          onClick={() => handleApplyVoucher(undefined, v.code)}
                          className="px-2 py-1 text-xs rounded bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 border border-slate-200 font-medium transition-all flex items-center gap-1.5 group"
                          title={v.description || v.title}
                        >
                          <Tag size={11} className="text-emerald-600 group-hover:scale-110 transition-transform" />
                          <span className="font-mono font-bold">{v.code}</span>
                          {v.applicableScope === 'CATEGORY' ? (
                            <span className="text-[10px] text-purple-700 bg-purple-50 px-1 py-0.2 rounded font-normal">
                              Theo ngành
                            </span>
                          ) : v.applicableScope === 'PRODUCT' ? (
                            <span className="text-[10px] text-amber-800 bg-amber-50 px-1 py-0.2 rounded font-normal">
                              Mặt hàng chỉ định
                            </span>
                          ) : (
                            <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded font-normal">
                              {v.discountType === 'FREESHIP' ? 'Freeship' : `-${v.discountType === 'PERCENT' ? `${v.discountValue}%` : `${Math.round(v.discountValue / 1000)}k`}`}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Price Calculation Table */}
              <div className="space-y-2.5 text-sm mb-6 border-t border-border pt-4">
                <div className="flex justify-between text-muted-foreground">
                  <span>Tạm tính tiền hàng ({cartItems.reduce((acc, i) => acc + i.quantity, 0)} món)</span>
                  <span className="text-foreground font-medium">{formatPrice(subtotal)}</span>
                </div>
                
                <div className="flex justify-between items-start text-muted-foreground">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span>Phí vận chuyển</span>
                      {deliveryDistance !== null && (
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">
                          ~{deliveryDistance.toFixed(1)} km
                        </span>
                      )}
                    </div>
                    {deliveryMethod === 'home' && (
                      <span className="text-[11px] text-slate-400 block mt-0.5">
                        {isFreeShip 
                          ? 'Đạt điều kiện Freeship đơn từ 300K' 
                          : isVoucherFreeship
                          ? 'Đã áp dụng mã Miễn phí vận chuyển'
                          : (deliveryDistance && deliveryDistance > 5 ? 'Giao ngoại cự ly (>5km): 22.000đ' : 'Giao nội cự ly (≤5km): 15.000đ')}
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    {isFreeShip || isVoucherFreeship ? (
                      <div className="flex items-center gap-1.5">
                        <span className="line-through text-xs text-slate-400">{formatPrice(rawShippingFee || 15000)}</span>
                        <span className="text-emerald-700 font-bold">Miễn phí</span>
                      </div>
                    ) : (
                      <span className="text-foreground font-semibold">
                        {deliveryMethod === 'home' ? formatPrice(shippingFee) : '0 đ (Tại siêu thị)'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Thanh thông báo điều kiện Freeship */}
                {deliveryMethod === 'home' && !isFreeShip && !isVoucherFreeship && (
                  <div className="p-2.5 bg-amber-50/80 border border-amber-200/80 rounded-xl flex items-center gap-2 text-xs text-amber-800">
                    <Info size={14} className="text-amber-600 shrink-0" />
                    <span>
                      Mua thêm <strong>{formatPrice(300000 - subtotal)}</strong> để được <strong>Miễn phí vận chuyển</strong> toàn bộ đơn hàng!
                    </span>
                  </div>
                )}

                {isVoucherApplied && (
                  <div className="text-emerald-800 font-semibold bg-emerald-50/70 p-2.5 rounded-lg border border-emerald-200/80 space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="flex items-center gap-1.5 text-xs">
                        <Tag size={14} className="text-emerald-700" />
                        Mã giảm giá ({voucherCode})
                      </span>
                      <span className="text-sm font-bold">-{formatPrice(discount)}</span>
                    </div>
                    {appliedVoucher && (
                      <div className="text-[11px] font-normal text-emerald-700 flex items-center justify-between">
                        <span>{appliedVoucher.title}</span>
                        {appliedVoucher.applicableScope === 'CATEGORY' && appliedVoucher.applicableCategories && (
                          <span className="bg-purple-100/70 text-purple-800 px-1.5 py-0.2 rounded text-[10px]">
                            Áp dụng cho {appliedVoucher.applicableCategories.join(', ')}
                          </span>
                        )}
                        {appliedVoucher.applicableScope === 'PRODUCT' && appliedVoucher.applicableProductIds && (
                          <span className="bg-amber-100/70 text-amber-800 px-1.5 py-0.2 rounded text-[10px]">
                            Áp dụng {appliedVoucher.applicableProductIds.length} sản phẩm chỉ định
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="border-t border-border pt-3 flex justify-between items-baseline">
                  <div>
                    <span className="font-bold text-base text-foreground block">Tổng cộng thanh toán</span>
                    <span className="text-[11px] text-slate-400 font-normal">Đã bao gồm tiền hàng, phí ship & khấu trừ voucher</span>
                  </div>
                  <span className="font-extrabold text-2xl text-emerald-800">{formatPrice(total)}</span>
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

      {/* Payment Gateway Simulator Modal */}
      <PaymentSimulatorModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        method={paymentMethod}
        totalAmount={total}
        orderInfo={{
          customerName: customerName || 'Khách hàng',
          customerPhone: customerPhone || '',
          address: customerAddress || ''
        }}
        onPaymentSuccess={(details) => {
          submitOrderToServer(paymentMethod, `Đã TT Online qua ${details.method} (Mã GD: ${details.transactionId})`, details.transactionId);
        }}
      />
    </div>
  );
}