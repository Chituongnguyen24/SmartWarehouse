import React, { useState } from 'react';
import {
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Calendar,
  DollarSign,
  FileText,
  Printer,
  Truck,
  Layers,
  Thermometer,
} from 'lucide-react';
import type { B2BCustomer } from './B2BCustomersPanel';

export interface ProductInventoryItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  price: number;
  unit: string;
  stock: number;
  zone: string;
  expiryDaysLeft?: number;
  isFefoPriority?: boolean;
}

export interface OrderCartItem {
  product: ProductInventoryItem;
  quantity: number;
  discountRate?: number;
  unitPrice: number;
  lotCode?: string;
}

interface CreateB2BOrderPanelProps {
  products: ProductInventoryItem[];
  customers: B2BCustomer[];
  selectedCustomer: B2BCustomer | null;
  onSelectCustomer: (customer: B2BCustomer) => void;
  cartItems: OrderCartItem[];
  onUpdateQty: (productId: string, delta: number) => void;
  onSetQty: (productId: string, qty: number) => void;
  onRemoveItem: (productId: string) => void;
  onAddToCart: (product: ProductInventoryItem, quantity?: number) => void;
  onSubmitOrder: (orderDetails: {
    warehouseCode: string;
    paymentTerms: string;
    deliveryDate: string;
    deliveryNotes: string;
    vatRate: number;
    shippingFee: number;
  }) => Promise<void>;
  onPreviewQuote: () => void;
  showToast: (msg: string) => void;
}

const WAREHOUSES = [
  { code: 'WH-006', name: 'Tổng Kho Gò Vấp (350 Quang Trung)' },
  { code: 'WH-001', name: 'Kho Bình Thạnh (123 Lê Quang Định)' },
  { code: 'WH-002', name: 'Kho Tân Bình (45 Cộng Hòa)' },
];

const PAYMENT_TERMS = [
  { value: 'NET_30', label: 'Công Nợ 30 Ngày (Net 30)' },
  { value: 'NET_15', label: 'Công Nợ 15 Ngày (Net 15)' },
  { value: 'BANK_TRANSFER', label: 'Chuyển Khoản Ngân Hàng' },
  { value: 'COD', label: 'Thanh Toán Tiền Mặt Khi Nhận Hàng (COD)' },
];

export const CreateB2BOrderPanel: React.FC<CreateB2BOrderPanelProps> = ({
  products,
  customers,
  selectedCustomer,
  onSelectCustomer,
  cartItems,
  onUpdateQty,
  onSetQty,
  onRemoveItem,
  onAddToCart,
  onSubmitOrder,
  onPreviewQuote,
  showToast,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedZone, setSelectedZone] = useState('ALL');
  const [fefoOnly, setFefoOnly] = useState(false);

  // Order Details Form State
  const [warehouseCode, setWarehouseCode] = useState('WH-006');
  const [paymentTerms, setPaymentTerms] = useState('NET_30');
  const [deliveryDate, setDeliveryDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [deliveryNotes, setDeliveryNotes] = useState('Vận chuyển xe tải lạnh, giao trước 10:00 sáng');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Direct qty inputs per product: { [productId]: number }
  const [qtyInputs, setQtyInputs] = useState<Record<string, number>>({});

  // Filter products
  const categories = Array.from(new Set(products.map(p => p.category).filter(Boolean)));

  const filteredProducts = products.filter(p => {
    const q = search.trim().toLowerCase();
    const matchSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q);

    const matchCategory = selectedCategory === 'ALL' || p.category === selectedCategory;
    const matchZone = selectedZone === 'ALL' || p.zone.toLowerCase().includes(selectedZone.toLowerCase());
    const matchFefo = !fefoOnly || p.isFefoPriority;

    return matchSearch && matchCategory && matchZone && matchFefo;
  });

  // Calculate totals
  const rawSubtotal = cartItems.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0);
  const discountRate = selectedCustomer?.discountRate || 0;
  const discountAmount = Math.round(rawSubtotal * (discountRate / 100));
  const afterDiscount = rawSubtotal - discountAmount;
  const vatRate = 8; // 8% VAT
  const vatAmount = Math.round(afterDiscount * (vatRate / 100));
  const shippingFee = rawSubtotal >= 5000000 ? 0 : 150000;
  const finalTotal = afterDiscount + vatAmount + shippingFee;

  // Credit limit checks
  const creditLimit = selectedCustomer?.creditLimit || 50000000;
  const debtBalance = selectedCustomer?.debtBalance || 0;
  const creditAvailable = Math.max(0, creditLimit - debtBalance);
  const isCreditExceeded = paymentTerms.startsWith('NET_') && finalTotal > creditAvailable;

  const handleQtyInputChange = (prodId: string, val: string) => {
    const parsed = parseInt(val, 10);
    setQtyInputs(prev => ({ ...prev, [prodId]: isNaN(parsed) ? 1 : Math.max(1, parsed) }));
  };

  const handleAddProduct = (prod: ProductInventoryItem) => {
    const count = qtyInputs[prod.id] || 1;
    if (count > prod.stock) {
      showToast(`Số lượng yêu cầu (${count}) vượt quá tồn kho khả dụng (${prod.stock} ${prod.unit})`);
      return;
    }
    onAddToCart(prod, count);
    showToast(`Đã thêm ${count} ${prod.unit} ${prod.name} vào đơn hàng`);
  };

  const handleFormSubmit = async () => {
    if (!selectedCustomer) {
      showToast('Vui lòng chọn đối tác B2B trước khi tạo đơn');
      return;
    }
    if (cartItems.length === 0) {
      showToast('Vui lòng chọn ít nhất 1 sản phẩm vào đơn hàng');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmitOrder({
        warehouseCode,
        paymentTerms,
        deliveryDate,
        deliveryNotes,
        vatRate,
        shippingFee,
      });
    } catch (e: any) {
      showToast(e?.message || 'Lỗi khi gửi đơn hàng sang kho');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 430px', gap: '1.25rem', alignItems: 'start' }}>
      {/* LEFT COLUMN: PRODUCT CATALOG */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: 10,
          padding: '16px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShoppingBag size={18} color="#0f766e" />
            Danh Mục Thực Phẩm Xuất Kho B2B (Tồn Kho Thực Tế)
          </h3>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
            Hiển thị <strong>{filteredProducts.length}</strong> sản phẩm khả dụng
          </span>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Tìm theo tên sản phẩm hoặc mã SKU..."
              style={{
                width: '100%',
                padding: '7px 10px 7px 32px',
                borderRadius: 6,
                border: '1px solid #cbd5e1',
                fontSize: '0.85rem',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            style={selectStyle}
          >
            <option value="ALL">Tất Cả Danh Mục</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <select
            value={selectedZone}
            onChange={e => setSelectedZone(e.target.value)}
            style={selectStyle}
          >
            <option value="ALL">Tất Cả Vùng Nhiệt Độ</option>
            <option value="Lạnh">Kho Lạnh (-18°C ~ 0°C)</option>
            <option value="Mát">Kho Mát (2°C ~ 6°C)</option>
            <option value="Khô">Kho Khô (20°C ~ 25°C)</option>
          </select>

          <button
            type="button"
            onClick={() => setFefoOnly(!fefoOnly)}
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              border: fefoOnly ? '1px solid #f59e0b' : '1px solid #cbd5e1',
              backgroundColor: fefoOnly ? '#fffbeb' : '#ffffff',
              color: fefoOnly ? '#92400e' : '#475569',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Ưu tiên FEFO / Cận hạn
          </button>
        </div>

        {/* Product Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: '10px', maxHeight: 'calc(100vh - 290px)', overflowY: 'auto', paddingRight: 4 }}>
          {filteredProducts.map(prod => {
            const currentQty = qtyInputs[prod.id] || 1;
            const inCart = cartItems.find(i => i.product.id === prod.id);

            return (
              <div
                key={prod.id}
                style={{
                  border: prod.isFefoPriority ? '1px solid #fde68a' : '1px solid #e2e8f0',
                  borderRadius: 8,
                  padding: 12,
                  backgroundColor: prod.isFefoPriority ? '#fefce8' : '#ffffff',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: 8,
                  position: 'relative',
                }}
              >
                {prod.isFefoPriority && (
                  <span
                    style={{
                      position: 'absolute',
                      top: 6,
                      right: 6,
                      backgroundColor: '#fffbeb',
                      color: '#92400e',
                      border: '1px solid #fde68a',
                      fontSize: '0.65rem',
                      fontWeight: 600,
                      padding: '1px 6px',
                      borderRadius: 4,
                    }}
                  >
                    FEFO Cận Hạn
                  </span>
                )}

                <div>
                  <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0f172a', margin: '0 0 2px 0', lineClamp: 2 }}>
                    {prod.name}
                  </h4>
                  <div style={{ fontSize: '0.725rem', color: '#64748b' }}>
                    SKU: <strong>{prod.sku}</strong> | {prod.category}
                  </div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f766e', marginTop: 4 }}>
                    {prod.price.toLocaleString('vi-VN')}đ <span style={{ fontSize: '0.75rem', fontWeight: 400, color: '#64748b' }}>/ {prod.unit}</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: 2, display: 'flex', justifyContent: 'space-between' }}>
                    <span>Tồn kho: <strong style={{ color: prod.stock > 10 ? '#166534' : '#dc2626' }}>{prod.stock} {prod.unit}</strong></span>
                    <span style={{ color: '#0284c7' }}>{prod.zone}</span>
                  </div>
                </div>

                {/* Add to order row */}
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 4 }}>
                  <input
                    type="number"
                    min="1"
                    max={prod.stock}
                    value={currentQty}
                    onChange={e => handleQtyInputChange(prod.id, e.target.value)}
                    style={{
                      width: 55,
                      padding: '5px',
                      borderRadius: 6,
                      border: '1px solid #cbd5e1',
                      fontSize: '0.8rem',
                      textAlign: 'center',
                      outline: 'none',
                    }}
                  />
                  <button
                    onClick={() => handleAddProduct(prod)}
                    style={{
                      flex: 1,
                      padding: '6px 10px',
                      borderRadius: 6,
                      border: 'none',
                      backgroundColor: inCart ? '#0284c7' : '#0f766e',
                      color: '#ffffff',
                      fontSize: '0.775rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4,
                    }}
                  >
                    <Plus size={13} /> {inCart ? `Đã có (${inCart.quantity})` : 'Thêm Vào Đơn'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* RIGHT COLUMN: ORDER SUMMARY & B2B CHECKOUT */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: 10,
          padding: '16px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Building2 size={18} color="#0f766e" />
          Hồ Sơ Đơn Hàng Doanh Nghiệp B2B
        </h3>

        {/* Select Customer */}
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: 4 }}>
            Khách Hàng Doanh Nghiệp / Đối Tác *
          </label>
          <select
            value={selectedCustomer?.id || ''}
            onChange={e => {
              const cust = customers.find(c => c.id === e.target.value);
              if (cust) onSelectCustomer(cust);
            }}
            style={{ ...selectStyle, width: '100%', boxSizing: 'border-box' }}
          >
            {customers.map(c => (
              <option key={c.id} value={c.id}>
                {c.code} - {c.name} (-{c.discountRate}%)
              </option>
            ))}
          </select>
        </div>

        {/* Customer Badge & Credit Info */}
        {selectedCustomer && (
          <div style={{ backgroundColor: '#f8fafc', borderRadius: 8, padding: 10, border: '1px solid #e2e8f0', fontSize: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, color: '#0f172a' }}>
              <span>{selectedCustomer.companyName || selectedCustomer.name}</span>
              <span style={{ color: '#166534' }}>Chiết khấu: -{selectedCustomer.discountRate}%</span>
            </div>
            <div style={{ color: '#64748b', marginTop: 2 }}>
              MST: {selectedCustomer.taxCode || 'Chưa đăng ký'} | SĐT: {selectedCustomer.phone}
            </div>
            <div style={{ color: '#64748b', marginTop: 2, lineClamp: 1 }}>
              Địa chỉ: {selectedCustomer.address || selectedCustomer.billingAddress || 'Hồ Chí Minh'}
            </div>

            <div style={{ marginTop: 8, paddingTop: 6, borderTop: '1px dashed #cbd5e1', display: 'flex', justifyContent: 'space-between' }}>
              <span>Hạn mức công nợ khả dụng:</span>
              <strong style={{ color: creditAvailable > 0 ? '#166534' : '#dc2626' }}>
                {(creditAvailable / 1000000).toFixed(1)} triệu VNĐ
              </strong>
            </div>

            {isCreditExceeded && (
              <div style={{ marginTop: 6, padding: '4px 8px', borderRadius: 4, backgroundColor: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', display: 'flex', alignItems: 'center', gap: 4 }}>
                <AlertTriangle size={13} />
                <span>Giá trị đơn vượt quá hạn mức công nợ còn lại!</span>
              </div>
            )}
          </div>
        )}

        {/* Logistics Parameters */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: 4 }}>
              Kho Xuất Hàng *
            </label>
            <select
              value={warehouseCode}
              onChange={e => setWarehouseCode(e.target.value)}
              style={{ ...selectStyle, width: '100%', boxSizing: 'border-box' }}
            >
              {WAREHOUSES.map(w => (
                <option key={w.code} value={w.code}>{w.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: 4 }}>
              Điều Khoản Thanh Toán
            </label>
            <select
              value={paymentTerms}
              onChange={e => setPaymentTerms(e.target.value)}
              style={{ ...selectStyle, width: '100%', boxSizing: 'border-box' }}
            >
              {PAYMENT_TERMS.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 10 }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: 4 }}>
              Hẹn Ngày Giao Hàng
            </label>
            <input
              type="date"
              value={deliveryDate}
              onChange={e => setDeliveryDate(e.target.value)}
              style={{ ...selectStyle, width: '100%', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: 4 }}>
              Yêu Cầu Vận Chuyển / Ghi Chú
            </label>
            <input
              type="text"
              value={deliveryNotes}
              onChange={e => setDeliveryNotes(e.target.value)}
              placeholder="VD: Xe tải lạnh, giao trước 10h"
              style={{ ...selectStyle, width: '100%', boxSizing: 'border-box' }}
            />
          </div>
        </div>

        {/* Cart items list */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#334155' }}>
              Mặt Hàng Trong Đơn ({cartItems.length})
            </span>
            {cartItems.length > 0 && (
              <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                Tổng {cartItems.reduce((s, i) => s + i.quantity, 0)} đơn vị
              </span>
            )}
          </div>

          <div
            style={{
              maxHeight: 180,
              overflowY: 'auto',
              border: '1px solid #e2e8f0',
              borderRadius: 6,
              backgroundColor: '#f8fafc',
              padding: '6px',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            {cartItems.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '1.5rem', color: '#94a3b8', fontSize: '0.8rem' }}>
                Chưa chọn sản phẩm nào từ bảng danh mục bên trái
              </div>
            ) : (
              cartItems.map(item => (
                <div
                  key={item.product.id}
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: 6,
                    padding: '8px 10px',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.product.name}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                      {item.unitPrice.toLocaleString('vi-VN')}đ x {item.quantity} {item.product.unit} = <strong style={{ color: '#0f766e' }}>{(item.unitPrice * item.quantity).toLocaleString('vi-VN')}đ</strong>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <button
                      type="button"
                      onClick={() => onUpdateQty(item.product.id, -1)}
                      style={qtyActionBtnStyle}
                    >
                      <Minus size={12} />
                    </button>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, minWidth: 24, textAlign: 'center' }}>
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => onUpdateQty(item.product.id, 1)}
                      style={qtyActionBtnStyle}
                    >
                      <Plus size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemoveItem(item.product.id)}
                      style={{ ...qtyActionBtnStyle, color: '#dc2626', marginLeft: 4 }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Financial calculations */}
        <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.8rem', color: '#334155' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Tiền hàng thô:</span>
            <span>{rawSubtotal.toLocaleString('vi-VN')}đ</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#166534', fontWeight: 600 }}>
            <span>Chiết khấu đối tác ({discountRate}%):</span>
            <span>-{discountAmount.toLocaleString('vi-VN')}đ</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Thuế VAT ({vatRate}%):</span>
            <span>+{vatAmount.toLocaleString('vi-VN')}đ</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Phí vận chuyển đông lạnh:</span>
            <span>{shippingFee === 0 ? <strong style={{ color: '#166534' }}>Miễn phí (≥ 5tr)</strong> : `${shippingFee.toLocaleString('vi-VN')}đ`}</span>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              borderTop: '1px solid #e2e8f0',
              paddingTop: 8,
              marginTop: 4,
              fontSize: '1.05rem',
              fontWeight: 700,
              color: '#0f766e',
            }}
          >
            <span>TỔNG THANH TOÁN:</span>
            <span style={{ fontSize: '1.25rem' }}>{finalTotal.toLocaleString('vi-VN')}đ</span>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <button
            type="button"
            onClick={onPreviewQuote}
            disabled={cartItems.length === 0}
            style={{
              padding: '9px 14px',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#334155',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: cartItems.length === 0 ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Printer size={15} /> In Báo Giá
          </button>

          <button
            type="button"
            onClick={handleFormSubmit}
            disabled={isSubmitting || cartItems.length === 0}
            style={{
              flex: 1,
              padding: '9px 16px',
              borderRadius: 6,
              border: 'none',
              backgroundColor: isCreditExceeded ? '#d97706' : '#0f766e',
              color: '#ffffff',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: isSubmitting || cartItems.length === 0 ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              opacity: isSubmitting || cartItems.length === 0 ? 0.6 : 1,
            }}
          >
            {isSubmitting ? (
              <>Đang gửi sang kho...</>
            ) : (
              <>
                <CheckCircle2 size={16} /> Duyệt & Gửi Sang Kho Xuất Hàng
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

const selectStyle: React.CSSProperties = {
  padding: '7px 10px',
  borderRadius: 6,
  border: '1px solid #cbd5e1',
  fontSize: '0.85rem',
  color: '#0f172a',
  backgroundColor: '#ffffff',
  outline: 'none',
};

const qtyActionBtnStyle: React.CSSProperties = {
  width: 24,
  height: 24,
  borderRadius: 4,
  border: '1px solid #cbd5e1',
  backgroundColor: '#f8fafc',
  color: '#334155',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  padding: 0,
};
