"use client";

import { use, useState, useEffect, useRef } from 'react';
import { notFound } from 'next/navigation';
import { CATEGORIES } from '@/lib/mockData';
import { getProductById, Product } from '@/lib/api';
import { ChevronRight, Heart, Share2, Plus, Minus, CheckCircle2, ChevronDown, Store, Star, ShoppingCart } from 'lucide-react';
import Link from 'next/link';
import { useCartStore } from '@/lib/store';

export default function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = use(params);
  const slug = resolvedParams.slug;

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function loadProduct() {
      const data = await getProductById(slug);
      setProduct(data);
      if (data) {
        setActiveImage(data.imageUrl);
      }
      setLoading(false);
    }
    loadProduct();
  }, [slug]);

  // State for interactivity
  const [activeImage, setActiveImage] = useState('');
  const [activeVariant, setActiveVariant] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState('info');
  const [showStickyBar, setShowStickyBar] = useState(false);
  
  const mainBuySectionRef = useRef<HTMLDivElement>(null);

  // Format currency
  const formatPrice = (p: number) => p.toLocaleString('vi-VN') + 'đ';

  const addToCart = useCartStore(state => state.addToCart);
  
  const handleAddToCart = () => {
    if (!product) return;
    
    addToCart({
      productId: product.id,
      sku: (product as any).sku || product.id,
      name: product.name,
      price: product.price,
      oldPrice: product.oldPrice,
      quantity,
      image: activeImage,
      variant: currentVariant?.name || null
    });
    // Visual feedback
    alert('Đã thêm sản phẩm vào giỏ hàng!');
  };

  // Scroll listener for sticky bar
  useEffect(() => {
    const handleScroll = () => {
      if (mainBuySectionRef.current) {
        const rect = mainBuySectionRef.current.getBoundingClientRect();
        // Show sticky bar when the buy section is scrolled out of view (above viewport)
        setShowStickyBar(rect.bottom < 0);
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleVariantChange = (variantId: string, image?: string) => {
    setActiveVariant(variantId);
    if (image) setActiveImage(image);
  };

  const currentVariant = (product as any)?.variants?.find((v: any) => v.id === activeVariant);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Đang tải sản phẩm...</div>;
  }

  if (!product) {
    notFound();
  }

  const category = CATEGORIES.find(c => c.slug === product.category) || { name: product.category, slug: product.category };

  return (
    <div className="bg-gray-50 min-h-screen pb-32">
      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-100">
        <div className="container mx-auto px-4 max-w-7xl py-3 flex flex-wrap items-center gap-2 text-sm text-gray-500">
          <Link href="/" className="hover:text-primary transition-colors">Trang chủ</Link>
          <ChevronRight size={14} className="text-gray-400" />
          {category && (
            <>
              <Link href={`/danh-muc/${category.slug}`} className="hover:text-primary transition-colors">{category.name}</Link>
              <ChevronRight size={14} className="text-gray-400" />
            </>
          )}
          <span className="text-foreground font-medium">{product.name}</span>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-7xl mt-6">
        {/* Main 2-Column Layout */}
        <div className="flex flex-col lg:flex-row gap-6">
          
          {/* LEFT COLUMN: Images & Trust Info */}
          <div className="w-full lg:w-5/12 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-border p-4">
              {/* Main Image */}
              <div className="relative aspect-square rounded-lg overflow-hidden border border-gray-100 mb-4 bg-white flex items-center justify-center p-4">
                <img src={activeImage} alt={product.name} className="w-full h-full object-contain" />
              </div>

              {/* Action Row */}
              <div className="flex items-center justify-center gap-8 mt-6 pt-6 border-t border-gray-100 text-sm font-medium text-gray-600">
                <button className="flex items-center gap-2 hover:text-primary transition-colors">
                  <Share2 size={18} /> Chia sẻ
                </button>
                <button className="flex items-center gap-2 hover:text-red-500 transition-colors">
                  <Heart size={18} /> Yêu thích
                </button>
              </div>
            </div>

            {/* Sales Policy */}
            <div className="bg-white rounded-xl shadow-sm border border-border p-5">
              <h3 className="font-bold text-foreground mb-4 uppercase text-sm tracking-wider">Chính sách bán hàng</h3>
              <ul className="space-y-3">
                <li className="flex gap-3 items-start">
                  <CheckCircle2 size={18} className="text-primary shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-600">Miễn phí giao hàng trong bán kính 6km với đơn hàng từ 200.000 VNĐ</span>
                </li>
                <li className="flex gap-3 items-start">
                  <CheckCircle2 size={18} className="text-primary shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-600">Hàng hoá chính hãng, nguồn gốc xuất xứ rõ ràng</span>
                </li>
                <li className="flex gap-3 items-start">
                  <CheckCircle2 size={18} className="text-primary shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-600">Tích điểm thẻ thành viên C.T Mart</span>
                </li>
              </ul>
            </div>
          </div>

          {/* RIGHT COLUMN: Product Info & Actions */}
          <div className="w-full lg:w-7/12">
            <div className="bg-white rounded-xl shadow-sm border border-border p-6 md:p-8" ref={mainBuySectionRef}>
              
              {/* Title & Brand */}
              <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-3 leading-tight">{product.name}</h1>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm mb-6">
                <div className="text-gray-500">
                  Thương hiệu: <a href="#" className="text-primary hover:underline font-medium">{product.brand || 'Đang cập nhật'}</a>
                </div>
                {product.sku && <div className="text-gray-400">SKU: {product.sku}</div>}
                <div className="flex items-center gap-1">
                  <Star size={16} className="text-yellow-400 fill-yellow-400" />
                  <span className="font-bold">{product.rating}</span>
                  <span className="text-gray-400">({product.soldCount} đã bán)</span>
                </div>
              </div>

              {/* Price */}
              <div className="flex items-end gap-3 mb-8 bg-gray-50 p-4 rounded-lg">
                <span className="text-3xl font-bold text-orange-500">{formatPrice(product.price)}</span>
                {product.oldPrice && (
                  <span className="text-base text-gray-400 line-through mb-1">{formatPrice(product.oldPrice)}</span>
                )}
                {product.discount !== undefined && product.discount > 0 && (
                  <span className="bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded-md mb-1.5 ml-2">
                    -{product.discount}%
                  </span>
                )}
              </div>

              {/* Specifications snippet */}
              <div className="mb-8">
                <h3 className="font-medium text-foreground mb-3">Thông tin cơ bản:</h3>
                <div className="text-sm text-gray-600 space-y-2">
                  <div><span className="text-gray-500 mr-2">Đơn vị tính:</span> {product.unit || 'Sản phẩm'}</div>
                  <div><span className="text-gray-500 mr-2">Xuất xứ:</span> {product.origin || 'Việt Nam'}</div>
                </div>
              </div>

              {/* Quantity */}
              <div className="mb-8 flex flex-wrap items-center gap-6">
                <h3 className="font-medium text-foreground w-16">Số lượng:</h3>
                <div className="flex items-center border border-gray-300 rounded-md overflow-hidden bg-white">
                  <button 
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-10 h-10 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors"
                  >
                    <Minus size={16} />
                  </button>
                  <input 
                    type="number" 
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-14 h-10 text-center border-x border-gray-300 font-medium focus:outline-none"
                  />
                  <button 
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-10 h-10 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors"
                  >
                    <Plus size={16} />
                  </button>
                </div>
                <div className="text-sm text-gray-500">
                  {product.totalStock} sản phẩm có sẵn
                </div>
              </div>

              <div ref={mainBuySectionRef} className="flex flex-col sm:flex-row gap-4 mb-8">
                <button 
                  onClick={handleAddToCart}
                  className="flex-1 border-2 border-primary text-primary hover:bg-primary/5 bg-white font-bold py-3.5 px-6 rounded-lg transition-all flex items-center justify-center gap-2"
                >
                  <ShoppingCart size={20} />
                  Thêm vào giỏ hàng
                </button>
                <button className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold py-3.5 px-6 rounded-lg transition-all shadow-md hover:shadow-lg">
                  Mua ngay
                </button>
              </div>

              {/* Promo Box */}
              <div className="border border-orange-200 bg-orange-50/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <img src="https://vnpay.vn/s1/statics.vnpay.vn/2023/9/06ncktiwd6dc1694418196384.png" alt="VNPAY" className="h-5" />
                  <span className="font-bold text-sm text-foreground">Ưu đãi thanh toán</span>
                </div>
                <ul className="text-sm text-gray-600 space-y-1 ml-6 list-disc">
                  <li>Nhập mã <strong>VNPAYCTMART</strong> giảm 10% tối đa 50K cho đơn từ 300K.</li>
                  <li>Nhập mã <strong>MOMO50</strong> giảm 50K khi thanh toán qua ví MoMo.</li>
                </ul>
              </div>

            </div>
          </div>
        </div>

        {/* Tabs Section */}
        <div className="mt-8 bg-white rounded-xl shadow-sm border border-border overflow-hidden">
          {/* Tab Headers */}
          <div className="flex border-b border-border bg-gray-50/50">
            <button 
              onClick={() => setActiveTab('info')}
              className={`px-8 py-4 font-bold text-sm md:text-base uppercase tracking-wide transition-all ${activeTab === 'info' ? 'text-primary border-b-2 border-primary bg-white' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Thông tin sản phẩm
            </button>
            <button 
              onClick={() => setActiveTab('desc')}
              className={`px-8 py-4 font-bold text-sm md:text-base uppercase tracking-wide transition-all ${activeTab === 'desc' ? 'text-primary border-b-2 border-primary bg-white' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Mô tả chi tiết
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-6 md:p-8">
            {activeTab === 'info' && (
              <div className="max-w-4xl">
                <div className="border border-border rounded-lg overflow-hidden">
                  <div className="flex flex-col sm:flex-row border-b border-border bg-gray-50/50">
                    <div className="w-full sm:w-1/3 p-3 text-sm font-medium text-gray-500 border-r border-border bg-gray-50">
                      Mã sản phẩm (SKU)
                    </div>
                    <div className="w-full sm:w-2/3 p-3 text-sm text-foreground">
                      {product.sku}
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row border-b border-border bg-white">
                    <div className="w-full sm:w-1/3 p-3 text-sm font-medium text-gray-500 border-r border-border bg-gray-50">
                      Thương hiệu
                    </div>
                    <div className="w-full sm:w-2/3 p-3 text-sm text-foreground">
                      {product.brand}
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row border-b border-border bg-gray-50/50">
                    <div className="w-full sm:w-1/3 p-3 text-sm font-medium text-gray-500 border-r border-border bg-gray-50">
                      Xuất xứ
                    </div>
                    <div className="w-full sm:w-2/3 p-3 text-sm text-foreground">
                      {product.origin || 'Đang cập nhật'}
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row border-b border-border bg-white">
                    <div className="w-full sm:w-1/3 p-3 text-sm font-medium text-gray-500 border-r border-border bg-gray-50">
                      Đơn vị tính
                    </div>
                    <div className="w-full sm:w-2/3 p-3 text-sm text-foreground">
                      {product.unit || 'Sản phẩm'}
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row bg-gray-50/50">
                    <div className="w-full sm:w-1/3 p-3 text-sm font-medium text-gray-500 border-r border-border bg-gray-50">
                      Hướng dẫn bảo quản
                    </div>
                    <div className="w-full sm:w-2/3 p-3 text-sm text-foreground">
                      {product.preservation || 'Đang cập nhật'}
                    </div>
                  </div>
                </div>
              </div>
            )}
            {activeTab === 'desc' && (
              <div className="prose max-w-none text-sm text-gray-700 leading-relaxed">
                {product.description ? (
                  <div dangerouslySetInnerHTML={{ __html: product.description }} />
                ) : (
                  <p>Chưa có mô tả cho sản phẩm này.</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sticky Bottom Bar */}
      <div className={`fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] transition-all duration-300 z-40 transform ${showStickyBar ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`}>
        <div className="container mx-auto px-4 max-w-6xl py-3 flex items-center justify-between gap-4">
          <div className="hidden md:flex items-center gap-4 flex-1">
            <img src={activeImage} alt="" className="w-12 h-12 object-contain rounded border border-gray-100" />
            <div>
              <div className="font-bold text-sm text-foreground line-clamp-1">{product.name}</div>
              <div className="text-orange-500 font-bold">{formatPrice(product.price)}</div>
            </div>
            {currentVariant && (
              <div className="ml-4 px-3 py-1 bg-gray-100 rounded text-sm text-gray-600">
                Loại: <strong>{currentVariant.name}</strong>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-4 w-full md:w-auto justify-end">
            {/* Quantity Mobile Hidden */}
            <div className="hidden lg:flex items-center border border-gray-300 rounded-md overflow-hidden bg-white shrink-0">
              <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors"><Minus size={14} /></button>
              <input type="number" value={quantity} onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))} className="w-10 h-8 text-center text-sm border-x border-gray-300 font-medium focus:outline-none" />
              <button onClick={() => setQuantity(quantity + 1)} className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors"><Plus size={14} /></button>
            </div>
            
            <button 
              onClick={handleAddToCart}
              className="flex-1 md:flex-none border-2 border-primary text-primary hover:bg-primary/5 bg-white font-bold py-2 px-4 rounded-lg transition-all text-sm whitespace-nowrap flex justify-center items-center gap-2"
            >
              <ShoppingCart size={16} /> Thêm vào giỏ
            </button>
            <button className="flex-1 md:flex-none bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-6 rounded-lg transition-all text-sm whitespace-nowrap shadow-md">
              Mua ngay
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
