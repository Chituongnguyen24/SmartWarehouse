import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Star, ShoppingCart, ShieldCheck, Truck, RefreshCw, Zap, Plus, Minus, Check } from 'lucide-react';
import { useWebCart, type Product } from '../contexts/WebCartContext';
import { useAuth } from '../contexts/AuthContext';

const CustomerProductDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToCart } = useWebCart();
  const { token } = useAuth();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [addedSuccess, setAddedSuccess] = useState(false);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);

  useEffect(() => {
    const fetchProductDetail = async () => {
      setLoading(true);
      try {
        const res = await fetch('http://localhost:3010/products', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          const mapped: Product[] = data.map((item: any) => ({
            id: item.id || item.sku,
            name: item.name || item.productName,
            category: item.category || 'Thực phẩm',
            price: Number(item.price) || 25000,
            originalPrice: item.originalPrice ? Number(item.originalPrice) : Number(item.price || 25000) * 1.25,
            unit: item.unit || '500g',
            imageUrl: item.imageUrl || 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=500&q=80',
            rating: item.rating ? Number(item.rating) : 4.8,
            soldCount: item.soldCount ? Number(item.soldCount) : 150,
            isFlashSale: item.isFlashSale ?? false,
            discountPercent: item.discountPercent || 0,
            origin: item.origin || 'Việt Nam',
            preservation: item.preservation || 'Kho lạnh',
            description: item.description || '',
            stock: item.stock ? Number(item.stock) : 100,
          }));

          const target = mapped.find(p => p.id === id);
          if (target) {
            setProduct(target);
            const related = mapped.filter(p => p.category === target.category && p.id !== target.id).slice(0, 4);
            setRelatedProducts(related);
          }
        }
      } catch (error) {
        console.error('Lỗi khi tải chi tiết sản phẩm:', error);
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchProductDetail();
  }, [id, token]);

  const formatPrice = (price: number) => price.toLocaleString('vi-VN') + 'đ';

  const handleAddToCart = () => {
    if (product) {
      addToCart(product, quantity);
      setAddedSuccess(true);
      setTimeout(() => setAddedSuccess(false), 2000);
    }
  };

  const handleBuyNow = () => {
    if (product) {
      addToCart(product, quantity);
      navigate('/cart');
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '4rem', color: '#64748b' }}>Đang tải chi tiết sản phẩm...</div>;
  }

  if (!product) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem' }}>
        <h2>Không tìm thấy sản phẩm</h2>
        <button
          onClick={() => navigate('/store')}
          style={{ marginTop: '1rem', padding: '10px 20px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
        >
          Quay lại cửa hàng
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* BUTTON BACK */}
      <button
        onClick={() => navigate('/store')}
        style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          background: 'none', border: 'none', color: '#64748b',
          fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer', marginBottom: '1.5rem'
        }}
      >
        <ArrowLeft size={20} /> Quay lại danh sách sản phẩm
      </button>

      {/* MAIN DETAIL GRID */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
        gap: '2.5rem', backgroundColor: 'white', padding: '2rem',
        borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)'
      }}>
        {/* LEFT: IMAGE */}
        <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', height: '400px' }}>
          <img src={product.imageUrl} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          {product.isFlashSale && (
            <div style={{
              position: 'absolute', top: '12px', left: '12px',
              backgroundColor: '#ef4444', color: 'white', padding: '6px 12px',
              borderRadius: '6px', fontSize: '0.85rem', fontWeight: 800,
              display: 'flex', alignItems: 'center', gap: '6px'
            }}>
              <Zap size={16} /> Flash Sale
            </div>
          )}
          {product.discountPercent > 0 && (
            <div style={{
              position: 'absolute', top: '12px', right: '12px',
              backgroundColor: '#f59e0b', color: 'white', padding: '6px 10px',
              borderRadius: '6px', fontSize: '0.85rem', fontWeight: 800
            }}>
              -{product.discountPercent}%
            </div>
          )}
        </div>

        {/* RIGHT: DETAILS */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: '0.85rem', color: '#10b981', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px' }}>
            {product.category}
          </div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#1e293b', marginBottom: '12px', lineHeight: '1.3' }}>
            {product.name}
          </h1>

          {/* RATING & SOLD */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#f59e0b' }}>
              <Star size={18} fill="#f59e0b" />
              <span style={{ fontWeight: 700, fontSize: '1rem' }}>{product.rating}</span>
            </div>
            <span style={{ color: '#cbd5e1' }}>|</span>
            <span style={{ fontSize: '0.9rem', color: '#64748b' }}>Đã bán {product.soldCount} sản phẩm</span>
            <span style={{ color: '#cbd5e1' }}>|</span>
            <span style={{ fontSize: '0.9rem', color: product.stock > 0 ? '#10b981' : '#ef4444', fontWeight: 600 }}>
              {product.stock > 0 ? `Còn hàng (${product.stock} ${product.unit})` : 'Hết hàng'}
            </span>
          </div>

          {/* PRICE SECTION */}
          <div style={{
            backgroundColor: '#f8fafc', padding: '1.25rem', borderRadius: '12px',
            display: 'flex', alignItems: 'baseline', gap: '1rem', marginBottom: '1.5rem'
          }}>
            <span style={{ fontSize: '2.2rem', fontWeight: 900, color: '#10b981' }}>
              {formatPrice(product.price)}
            </span>
            <span style={{ fontSize: '1rem', color: '#64748b', fontWeight: 600 }}>/{product.unit}</span>
            {product.originalPrice > product.price && (
              <span style={{ fontSize: '1.1rem', color: '#94a3b8', textDecoration: 'line-through' }}>
                {formatPrice(product.originalPrice)}
              </span>
            )}
          </div>

          {/* ATTRIBUTES */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            <div style={{ backgroundColor: '#f1f5f9', padding: '10px 14px', borderRadius: '8px' }}>
              <span style={{ color: '#64748b' }}>Xuất xứ: </span>
              <strong style={{ color: '#1e293b' }}>{product.origin}</strong>
            </div>
            <div style={{ backgroundColor: '#f1f5f9', padding: '10px 14px', borderRadius: '8px' }}>
              <span style={{ color: '#64748b' }}>Bảo quản: </span>
              <strong style={{ color: '#1e293b' }}>{product.preservation}</strong>
            </div>
          </div>

          {/* DESCRIPTION */}
          <div style={{ marginBottom: '2rem' }}>
            <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b', marginBottom: '8px' }}>Mô tả sản phẩm</h4>
            <p style={{ color: '#475569', fontSize: '0.95rem', lineHeight: '1.6', margin: 0 }}>
              {product.description || 'Thực phẩm tươi sạch chất lượng cao được kiểm duyệt khắt khe theo tiêu chuẩn CityMart FEFO kho lạnh.'}
            </p>
          </div>

          {/* QUANTITY SELECTOR & BUTTONS */}
          <div style={{ marginTop: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.95rem' }}>Số lượng:</span>
              <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #cbd5e1', borderRadius: '8px', overflow: 'hidden' }}>
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  style={{ background: '#f1f5f9', border: 'none', padding: '8px 12px', cursor: 'pointer' }}
                ><Minus size={16} /></button>
                <span style={{ padding: '0 16px', fontWeight: 700, fontSize: '1rem' }}>{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  style={{ background: '#f1f5f9', border: 'none', padding: '8px 12px', cursor: 'pointer' }}
                ><Plus size={16} /></button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={handleAddToCart}
                style={{
                  flex: 1, backgroundColor: addedSuccess ? '#059669' : '#10b981', color: 'white',
                  border: 'none', padding: '14px', borderRadius: '10px', fontSize: '1rem',
                  fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', gap: '8px', transition: 'background-color 0.2s'
                }}
              >
                {addedSuccess ? <Check size={20} /> : <ShoppingCart size={20} />}
                {addedSuccess ? 'Đã thêm vào giỏ!' : 'Thêm vào giỏ hàng'}
              </button>

              <button
                onClick={handleBuyNow}
                style={{
                  flex: 1, backgroundColor: '#0f172a', color: 'white',
                  border: 'none', padding: '14px', borderRadius: '10px', fontSize: '1rem',
                  fontWeight: 700, cursor: 'pointer'
                }}
              >
                Mua ngay
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* REASSURANCE BADGES */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem',
        marginTop: '2rem', marginBottom: '3rem'
      }}>
        <div style={{ backgroundColor: 'white', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <ShieldCheck size={32} color="#10b981" />
          <div>
            <h5 style={{ margin: '0 0 4px 0', fontSize: '0.95rem', fontWeight: 700 }}>100% Thực Phẩm Sạch</h5>
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>Đạt chuẩn VietGAP & Kiểm định FEFO</p>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Truck size={32} color="#10b981" />
          <div>
            <h5 style={{ margin: '0 0 4px 0', fontSize: '0.95rem', fontWeight: 700 }}>Giao Hàng Siêu Tốc 2H</h5>
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>Đóng gói thùng giữ nhiệt cẩn thận</p>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <RefreshCw size={32} color="#10b981" />
          <div>
            <h5 style={{ margin: '0 0 4px 0', fontSize: '0.95rem', fontWeight: 700 }}>Đổi Trả Dễ Dàng</h5>
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>Đổi mới nếu sản phẩm hư hỏng</p>
          </div>
        </div>
      </div>

      {/* RELATED PRODUCTS */}
      {relatedProducts.length > 0 && (
        <div>
          <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1e293b', marginBottom: '1.5rem' }}>
            Sản phẩm cùng danh mục
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.5rem' }}>
            {relatedProducts.map(rel => (
              <div
                key={rel.id}
                onClick={() => navigate(`/product/${rel.id}`)}
                style={{
                  backgroundColor: 'white', borderRadius: '12px', overflow: 'hidden',
                  border: '1px solid #e2e8f0', cursor: 'pointer', transition: 'transform 0.2s'
                }}
              >
                <img src={rel.imageUrl} alt={rel.name} style={{ width: '100%', height: '150px', objectFit: 'cover' }} />
                <div style={{ padding: '1rem' }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b', margin: '0 0 8px 0' }}>{rel.name}</h4>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#10b981' }}>{formatPrice(rel.price)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerProductDetail;
