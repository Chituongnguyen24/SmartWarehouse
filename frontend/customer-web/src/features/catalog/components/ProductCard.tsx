"use client";

import { useState, useEffect } from 'react';
import { ShoppingCart, Star, Eye, Package } from 'lucide-react';
import { Button } from '@/shared';
import Link from 'next/link';
import { useCartStore, useAuthStore } from '@/lib/store';
import { AuthPromptModal } from '@/features/auth';
import { encodeProductSlug } from '@/lib/api';

interface ProductCardProps {
  id: string;
  name: string;
  price: number;
  oldPrice?: number;
  discount?: number;
  imageUrl: string;
  rating?: number;
  soldCount?: number;
  totalStock?: number;
  slug?: string;
  unit?: string;
  sku?: string;
}

export default function ProductCard({ 
  id,
  name, 
  price, 
  oldPrice, 
  discount, 
  imageUrl,
  rating = 4.5,
  soldCount = 0,
  totalStock = 0,
  slug,
  unit = 'Sản phẩm',
  sku
}: ProductCardProps) {
  const formatPrice = (p: number) => {
    return p.toLocaleString('vi-VN') + ' đ';
  };

  const isOutOfStock = totalStock <= 0;

  const [imgSrc, setImgSrc] = useState(imageUrl || '');
  const [hasImgError, setHasImgError] = useState(false);

  useEffect(() => {
    setImgSrc(imageUrl || '');
    setHasImgError(false);
  }, [imageUrl]);

  const soldPercentage = Math.min(Math.max((soldCount / Math.max(totalStock, 1)) * 100, 0), 100);
  const isFlashSale = discount !== undefined && discount > 0 && soldCount > 0;
  const productUrl = `/san-pham/${encodeProductSlug(sku || id)}`;
  
  const { isAuthenticated } = useAuthStore();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const addToCart = useCartStore(state => state.addToCart);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault(); // prevent triggering the link wrapping the card if any
    if (isOutOfStock) return;

    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }
    addToCart({
      productId: id,
      sku: sku || id,
      name,
      price,
      oldPrice,
      quantity: 1,
      image: imageUrl,
      variant: null
    });
    // Add visual feedback here if needed (toast)
  };

  return (
    <div className={`bg-white border rounded-xl p-3 md:p-4 transition-all duration-300 relative flex flex-col h-full group ${
      isOutOfStock 
        ? 'border-border opacity-85' 
        : 'border-border hover:shadow-lg hover:-translate-y-1 hover:border-primary'
    }`}>
      
      {/* Badges */}
      <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
        {isOutOfStock ? (
          <span className="bg-slate-700 text-white text-[11px] font-semibold px-2 py-0.5 rounded shadow-sm pointer-events-none">
            Hết hàng
          </span>
        ) : (
          discount !== undefined && discount > 0 && (
            <span className="bg-secondary text-white text-xs font-bold px-2.5 py-1 rounded-md shadow-sm pointer-events-none">
              Giảm {discount}%
            </span>
          )
        )}
      </div>

      {/* Image with Quick View */}
      <Link href={productUrl} className="relative w-full aspect-square mb-4 overflow-hidden rounded-lg bg-gray-50 flex items-center justify-center block">
        {imgSrc && !hasImgError ? (
          <img 
            src={imgSrc} 
            alt={name} 
            onError={() => setHasImgError(true)}
            className={`w-full h-full object-cover transition-transform duration-500 ${isOutOfStock ? 'grayscale-[40%]' : 'group-hover:scale-110'}`} 
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 bg-gray-100 p-4">
            <Package size={36} className="text-gray-300 mb-1" />
            <span className="text-[11px] text-gray-400 text-center line-clamp-1">{name}</span>
          </div>
        )}

        {/* Out of Stock Overlay */}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-[0.5px] flex items-center justify-center pointer-events-none z-10">
            <span className="bg-slate-800/90 text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm tracking-wide uppercase">
              Tạm hết hàng
            </span>
          </div>
        )}
        
        {/* Quick View Button (Shows on hover) */}
        {!isOutOfStock && (
          <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
            <button 
              className="bg-white/90 text-primary p-2 rounded-full shadow-lg translate-y-4 group-hover:translate-y-0 transition-all duration-300 hover:bg-primary hover:text-white"
              onClick={(e) => e.preventDefault()}
            >
              <Eye size={20} />
            </button>
          </div>
        )}
      </Link>

      {/* Info */}
      <div className="flex flex-col flex-1">
        <Link href={productUrl}>
          <h4 className="text-sm font-medium mb-1.5 text-foreground leading-snug group-hover:text-primary transition-colors" title={name}>
            {name}
          </h4>
        </Link>
        <div className="text-[10px] text-muted-foreground mb-1">Đơn vị tính: {unit}</div>
        
        {/* Rating */}
        <div className="flex items-center gap-1 mb-2">
          <div className="flex text-yellow-400">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star key={star} size={12} fill={star <= Math.floor(rating) ? "currentColor" : "none"} className={star <= Math.floor(rating) ? "" : "text-gray-300"} />
            ))}
          </div>
          <span className="text-[10px] text-muted-foreground">({soldCount > 0 ? soldCount * 3 : 12})</span>
        </div>

        {/* Pricing */}
        <div className="mt-auto mb-3">
          <div className="flex items-end gap-2 flex-wrap">
            <span className="text-[1.15rem] font-bold text-secondary">{formatPrice(price)}</span>
            {oldPrice && (
              <span className="text-xs text-muted-foreground line-through mb-1">
                {formatPrice(oldPrice)}
              </span>
            )}
          </div>
        </div>

        {/* Flash Sale Progress Bar */}
        {isFlashSale && (
          <div className="w-full bg-red-100 rounded-full h-4 mb-4 relative overflow-hidden flex items-center">
            <div 
              className="bg-gradient-to-r from-red-400 to-secondary h-full rounded-full absolute left-0 top-0 transition-all duration-1000"
              style={{ width: `${Math.max(soldPercentage, 10)}%` }}
            ></div>
            <span className="text-[9px] font-bold text-white z-10 w-full text-center drop-shadow-md">
              {soldPercentage > 90 ? "Sắp cháy hàng" : `Đã bán ${soldCount}`}
            </span>
          </div>
        )}

        {/* Add to Cart */}
        <Button 
          onClick={handleAddToCart}
          disabled={isOutOfStock}
          variant="outline" 
          className={`w-full font-semibold transition-all duration-300 ${isFlashSale ? '' : 'mt-auto'} ${
            isOutOfStock 
              ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed hover:bg-slate-100 hover:text-slate-400 shadow-none' 
              : 'border-primary text-primary hover:bg-primary hover:text-white group-hover:bg-primary group-hover:text-white group-hover:shadow-md'
          } rounded-md`}
        >
          <ShoppingCart size={18} className="mr-2" />
          {isOutOfStock ? 'Hết hàng' : 'Thêm vào giỏ'}
        </Button>
      </div>

      <AuthPromptModal 
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        productName={name}
        redirectUrl={typeof window !== 'undefined' ? window.location.pathname : productUrl}
      />
    </div>
  );
}
