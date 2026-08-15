"use client";

import { ShoppingCart, Star, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useCartStore } from '@/lib/store';

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
  totalStock = 100,
  slug,
  unit = 'Sản phẩm'
}: ProductCardProps) {
  const formatPrice = (p: number) => {
    return p.toLocaleString('vi-VN') + ' đ';
  };

  const soldPercentage = Math.min(Math.max((soldCount / totalStock) * 100, 0), 100);
  const isFlashSale = discount !== undefined && discount > 0 && soldCount > 0;
  const productUrl = `/san-pham/${slug || id}`;
  
  const addToCart = useCartStore(state => state.addToCart);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault(); // prevent triggering the link wrapping the card if any
    addToCart({
      productId: id,
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
    <div className="bg-white border border-border rounded-xl p-3 md:p-4 transition-all duration-300 relative flex flex-col h-full hover:shadow-lg hover:-translate-y-1 hover:border-primary group">
      
      {/* Badges */}
      <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
        {discount !== undefined && discount > 0 && (
          <span className="bg-secondary text-white text-xs font-bold px-2.5 py-1 rounded-md shadow-sm pointer-events-none">
            Giảm {discount}%
          </span>
        )}
      </div>

      {/* Image with Quick View */}
      <Link href={productUrl} className="relative w-full aspect-square mb-4 overflow-hidden rounded-lg bg-gray-50 block">
        <img 
          src={imageUrl} 
          alt={name} 
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
        />
        
        {/* Quick View Button (Shows on hover) */}
        <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <button 
            className="bg-white/90 text-primary p-2 rounded-full shadow-lg translate-y-4 group-hover:translate-y-0 transition-all duration-300 hover:bg-primary hover:text-white"
            onClick={(e) => e.preventDefault()}
          >
            <Eye size={20} />
          </button>
        </div>
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
          variant="outline" 
          className={`w-full font-semibold transition-all duration-300 ${isFlashSale ? '' : 'mt-auto'} border-primary text-primary hover:bg-primary hover:text-white group-hover:bg-primary group-hover:text-white group-hover:shadow-md rounded-md`}
        >
          <ShoppingCart size={18} className="mr-2" />
          Thêm vào giỏ
        </Button>
      </div>
    </div>
  );
}
