import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Star, Zap, Search } from 'lucide-react';
import { useWebCart, type Product } from '../contexts/WebCartContext';
import { useAuth } from '../contexts/AuthContext';

const CustomerStorefront: React.FC = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Tất cả');
  const { addToCart } = useWebCart();
  const { token } = useAuth();

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await fetch('http://localhost:3010/products', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
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
          setProducts(mapped);
        }
      } catch (error) {
        console.error('Lỗi khi tải sản phẩm:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  const formatPrice = (price: number) => price.toLocaleString('vi-VN') + 'đ';

  const categories = ['Tất cả', 'Rau củ quả', 'Trái cây', 'Thịt tươi', 'Hải sản', 'Sữa & Đồ uống', 'Bánh kẹo & Đồ khô'];

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'Tất cả' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#1e293b' }}>
          Sản phẩm <span style={{ color: '#10b981' }}>CityMart</span>
        </h2>
        
        <div style={{ position: 'relative', width: '300px' }}>
          <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Tìm kiếm sản phẩm..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px 10px 38px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              outline: 'none',
              fontSize: '0.95rem'
            }}
          />
        </div>
      </div>

      {/* CATEGORY FILTER PILLS */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '2rem' }}>
        {categories.map(cat => {
          const isActive = selectedCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
                backgroundColor: isActive ? '#10b981' : '#ffffff',
                color: isActive ? '#ffffff' : '#64748b',
                border: isActive ? '1px solid #10b981' : '1px solid #cbd5e1',
                padding: '8px 16px',
                borderRadius: '20px',
                fontSize: '0.9rem',
                fontWeight: isActive ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>Đang tải danh sách sản phẩm...</div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: '1.5rem'
        }}>
          {filteredProducts.map(product => (
            <div
              key={product.id}
              onClick={() => navigate('/product/' + product.id)}
              style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                overflow: 'hidden',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)',
                border: '1px solid #f1f5f9',
                display: 'flex',
                flexDirection: 'column',
                transition: 'transform 0.2s',
                cursor: 'pointer'
              }}
            >
              <div style={{ position: 'relative', height: '180px' }}>
                <img src={product.imageUrl} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                {product.isFlashSale && (
                  <div style={{
                    position: 'absolute',
                    top: '10px',
                    left: '10px',
                    backgroundColor: '#ef4444',
                    color: 'white',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <Zap size={14} /> Flash Sale
                  </div>
                )}
                {product.discountPercent > 0 && (
                  <div style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    backgroundColor: '#f59e0b',
                    color: 'white',
                    padding: '4px 6px',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    fontWeight: 800
                  }}>
                    -{product.discountPercent}%
                  </div>
                )}
              </div>
              
              <div style={{ padding: '1rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, marginBottom: '4px' }}>
                  {product.category}
                </div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e293b', marginBottom: '8px', lineHeight: '1.4' }}>
                  {product.name}
                </h3>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '2px', color: '#f59e0b' }}>
                    <Star size={14} fill="#f59e0b" />
                    <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{product.rating}</span>
                  </div>
                  <span style={{ color: '#cbd5e1' }}>|</span>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Đã bán {product.soldCount}</span>
                </div>

                <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#10b981' }}>
                      {formatPrice(product.price)}
                      <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 500 }}>/{product.unit}</span>
                    </div>
                    {product.originalPrice > product.price && (
                      <div style={{ fontSize: '0.85rem', color: '#94a3b8', textDecoration: 'line-through' }}>
                        {formatPrice(product.originalPrice)}
                      </div>
                    )}
                  </div>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      addToCart(product);
                    }}
                    style={{
                      backgroundColor: '#10b981',
                      border: 'none',
                      borderRadius: '8px',
                      width: '36px',
                      height: '36px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s'
                    }}
                    title="Thêm vào giỏ"
                  >
                    <ShoppingCart size={18} color="white" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomerStorefront;
