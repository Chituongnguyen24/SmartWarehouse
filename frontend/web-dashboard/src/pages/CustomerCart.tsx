import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, Plus, Minus, ArrowLeft, MapPin, PlusCircle, Check, X } from 'lucide-react';
import { useWebCart, type CustomerAddress } from '../contexts/WebCartContext';
import { useAuth } from '../contexts/AuthContext';

const CustomerCart: React.FC = () => {
  const {
    cartItems,
    updateQuantity,
    removeFromCart,
    subtotalAmount,
    clearCart,
    addresses,
    selectedAddress,
    setSelectedAddress,
    addAddress,
  } = useWebCart();

  const { user } = useAuth();
  const navigate = useNavigate();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'MOMO'>('COD');

  // Address Modal state
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  // New Address Form State
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newAddressText, setNewAddressText] = useState('');
  const [isDefaultNew, setIsDefaultNew] = useState(false);

  const formatPrice = (price: number) => price.toLocaleString('vi-VN') + 'đ';

  const handleCreateAddress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newPhone || !newAddressText) {
      alert('Vui lòng nhập đầy đủ thông tin địa chỉ!');
      return;
    }

    addAddress({
      name: newName,
      phone: newPhone,
      address: newAddressText,
      isDefault: isDefaultNew,
    });

    setNewName('');
    setNewPhone('');
    setNewAddressText('');
    setIsDefaultNew(false);
    setShowAddForm(false);
  };

  const handleCheckout = async () => {
    if (cartItems.length === 0) return;

    const currentAddr = selectedAddress || {
      name: user?.name || 'Khách hàng',
      phone: '0909000111',
      address: '227 Nguyễn Văn Cừ, Phường 4, Quận 5, TP.HCM',
    };

    setIsSubmitting(true);
    try {
      const generatedId = `ORD-WEB-${Math.floor(1000 + Math.random() * 9000)}`;
      const shippingFee = subtotalAmount > 299000 ? 0 : 15000;
      const finalPrice = subtotalAmount + shippingFee;

      const payload = {
        orderCode: generatedId,
        requestedBy: user?.id || 'customer-web-id',
        requesterName: currentAddr.name,
        customerName: currentAddr.name,
        customerPhone: currentAddr.phone,
        destination: currentAddr.address,
        deliverySlotText: 'Giao siêu tốc 2H',
        paymentMethod: paymentMethod === 'COD' ? 'COD - Tiền mặt' : 'Thanh toán Online (MoMo)',
        totalItems: cartItems.length,
        totalQuantity: cartItems.reduce((acc, i) => acc + i.quantity, 0),
        totalAmount: finalPrice,
        items: cartItems.map(i => ({
          sku: i.product.id,
          productName: i.product.name,
          category: i.product.category,
          requestedQuantity: i.quantity,
          unit: i.product.unit,
          price: i.product.price,
        })),
      };

      const res = await fetch('http://localhost:3007/outbound-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        clearCart();
        alert(`🎉 Đặt hàng thành công! Mã đơn hàng: ${generatedId}`);
        navigate('/my-orders');
      } else {
        alert('Có lỗi xảy ra từ máy chủ, vui lòng thử lại.');
      }
    } catch (error) {
      console.error(error);
      alert('Không thể kết nối đến máy chủ đặt hàng.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (cartItems.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
        <h2 style={{ fontSize: '1.5rem', color: '#1e293b', marginBottom: '1rem' }}>Giỏ hàng của bạn đang trống</h2>
        <p style={{ color: '#64748b', marginBottom: '2rem' }}>Hãy quay lại cửa hàng để chọn mua những sản phẩm tươi ngon nhất.</p>
        <button
          onClick={() => navigate('/store')}
          style={{
            backgroundColor: '#10b981',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '8px',
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          Khám phá cửa hàng
        </button>
      </div>
    );
  }

  const shippingFee = subtotalAmount > 299000 ? 0 : 15000;
  const finalTotal = subtotalAmount + shippingFee;

  return (
    <div>
      <button
        onClick={() => navigate('/store')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'none',
          border: 'none',
          color: '#64748b',
          fontSize: '0.95rem',
          fontWeight: 600,
          cursor: 'pointer',
          marginBottom: '1.5rem'
        }}
      >
        <ArrowLeft size={20} /> Tiếp tục mua sắm
      </button>

      <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#1e293b', marginBottom: '2rem' }}>
        Giỏ hàng ({cartItems.length} sản phẩm)
      </h2>

      <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
        {/* CART ITEMS LIST */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {cartItems.map(item => (
            <div
              key={item.product.id}
              style={{
                backgroundColor: 'white',
                padding: '1.25rem',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                gap: '1.25rem'
              }}
            >
              <img
                src={item.product.imageUrl}
                alt={item.product.name}
                style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px' }}
              />

              <div style={{ flex: 1 }}>
                <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#1e293b', margin: '0 0 4px 0' }}>
                  {item.product.name}
                </h4>
                <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '8px' }}>
                  {item.product.category} • {item.product.unit}
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#10b981' }}>
                  {formatPrice(item.product.price)}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #cbd5e1', borderRadius: '8px', overflow: 'hidden' }}>
                  <button
                    onClick={() => updateQuantity(item.product.id, -1)}
                    style={{ background: '#f1f5f9', border: 'none', padding: '8px', cursor: 'pointer' }}
                  ><Minus size={16} /></button>
                  <span style={{ padding: '0 12px', fontWeight: 600, fontSize: '0.95rem' }}>{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.product.id, 1)}
                    style={{ background: '#f1f5f9', border: 'none', padding: '8px', cursor: 'pointer' }}
                  ><Plus size={16} /></button>
                </div>
                <button
                  onClick={() => removeFromCart(item.product.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', color: '#ef4444' }}
                >
                  <Trash2 size={20} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* ORDER SUMMARY SIDEBAR */}
        <div style={{
          width: '380px',
          backgroundColor: 'white',
          padding: '1.5rem',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          position: 'sticky',
          top: '90px'
        }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1e293b', marginBottom: '1.5rem' }}>Tổng quan đơn hàng</h3>

          {/* DELIVERY ADDRESS SECTION */}
          <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '0.9rem', color: '#1e293b' }}>
                <MapPin size={18} color="#10b981" /> Địa chỉ nhận hàng
              </div>
              <button
                onClick={() => setShowAddressModal(true)}
                style={{ background: 'none', border: 'none', color: '#10b981', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}
              >
                Thay đổi
              </button>
            </div>

            {selectedAddress ? (
              <div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#334155' }}>
                  {selectedAddress.name} <span style={{ fontWeight: 400, color: '#64748b' }}>({selectedAddress.phone})</span>
                </div>
                <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '4px', lineHeight: '1.4' }}>
                  {selectedAddress.address}
                </div>
              </div>
            ) : (
              <div style={{ fontSize: '0.85rem', color: '#ef4444' }}>Chưa chọn địa chỉ giao hàng</div>
            )}
          </div>

          {/* PAYMENT METHOD */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '8px', color: '#1e293b' }}>Phương thức thanh toán</div>
            <select
              value={paymentMethod}
              onChange={e => setPaymentMethod(e.target.value as any)}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.95rem',
                outline: 'none',
                backgroundColor: 'white'
              }}
            >
              <option value="COD">Thanh toán tiền mặt (COD)</option>
              <option value="MOMO">Ví MoMo</option>
            </select>
          </div>

          {/* SUMMARY PRICES */}
          <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: '#64748b' }}>Tạm tính</span>
              <span style={{ fontWeight: 600 }}>{formatPrice(subtotalAmount)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: '#64748b' }}>Phí giao hàng</span>
              <span style={{ fontWeight: 600 }}>{shippingFee === 0 ? 'Miễn phí' : formatPrice(shippingFee)}</span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e293b' }}>Tổng cộng</span>
            <span style={{ fontSize: '1.5rem', fontWeight: 900, color: '#10b981' }}>
              {formatPrice(finalTotal)}
            </span>
          </div>

          <button
            onClick={handleCheckout}
            disabled={isSubmitting}
            style={{
              width: '100%',
              backgroundColor: '#10b981',
              color: 'white',
              border: 'none',
              padding: '14px',
              borderRadius: '8px',
              fontSize: '1.05rem',
              fontWeight: 700,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              opacity: isSubmitting ? 0.7 : 1
            }}
          >
            {isSubmitting ? 'Đang xử lý...' : 'Xác nhận đặt hàng'}
          </button>
        </div>
      </div>

      {/* ADDRESS MODAL */}
      {showAddressModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white', borderRadius: '16px', padding: '2rem',
            width: '500px', maxWidth: '90%', maxHeight: '85vh', overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#1e293b' }}>Địa chỉ nhận hàng</h3>
              <button onClick={() => { setShowAddressModal(false); setShowAddForm(false); }} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} color="#64748b" />
              </button>
            </div>

            {!showAddForm ? (
              <div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                  {addresses.map(addr => {
                    const isSelected = selectedAddress?.id === addr.id;
                    return (
                      <div
                        key={addr.id}
                        onClick={() => setSelectedAddress(addr)}
                        style={{
                          padding: '1rem', borderRadius: '12px',
                          border: isSelected ? '2px solid #10b981' : '1px solid #cbd5e1',
                          backgroundColor: isSelected ? '#f0fdf4' : 'white',
                          cursor: 'pointer', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between'
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1e293b' }}>
                            {addr.name} <span style={{ fontWeight: 400, color: '#64748b' }}>({addr.phone})</span>
                          </div>
                          <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '4px' }}>
                            {addr.address}
                          </div>
                        </div>
                        {isSelected && <Check size={20} color="#10b981" />}
                      </div>
                    );
                  })}
                </div>

                <button
                  onClick={() => setShowAddForm(true)}
                  style={{
                    width: '100%', padding: '12px', borderRadius: '8px',
                    border: '1px dashed #10b981', color: '#10b981', backgroundColor: '#f0fdf4',
                    fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', gap: '8px'
                  }}
                >
                  <PlusCircle size={18} /> Thêm địa chỉ mới
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreateAddress}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Họ và tên người nhận</label>
                    <input
                      type="text"
                      placeholder="Ví dụ: Nguyễn Văn A"
                      value={newName}
                      onChange={e => setNewName(e.target.value)}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
                      required
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Số điện thoại</label>
                    <input
                      type="tel"
                      placeholder="Ví dụ: 0908 123 456"
                      value={newPhone}
                      onChange={e => setNewPhone(e.target.value)}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
                      required
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Địa chỉ chi tiết</label>
                    <textarea
                      placeholder="Ví dụ: 227 Nguyễn Văn Cừ, Phường 4, Quận 5, TP.HCM"
                      value={newAddressText}
                      onChange={e => setNewAddressText(e.target.value)}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', height: '80px', resize: 'vertical' }}
                      required
                    />
                  </div>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem', color: '#475569' }}>
                    <input
                      type="checkbox"
                      checked={isDefaultNew}
                      onChange={e => setIsDefaultNew(e.target.checked)}
                    />
                    Đặt làm địa chỉ mặc định
                  </label>
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    style={{ flex: 1, padding: '12px', border: '1px solid #cbd5e1', background: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    style={{ flex: 1, padding: '12px', border: 'none', backgroundColor: '#10b981', color: 'white', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Lưu địa chỉ
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerCart;
