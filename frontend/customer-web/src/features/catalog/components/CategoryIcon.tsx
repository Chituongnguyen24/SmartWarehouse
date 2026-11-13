import React from 'react';
import { 
  Beef, 
  Apple, 
  Fish, 
  Milk, 
  Carrot, 
  Heart, 
  Home, 
  Cookie, 
  Droplets, 
  Flame, 
  Package, 
  Snowflake, 
  UtensilsCrossed, 
  Tag, 
  ShoppingBag,
  Salad,
  Wine,
  Egg,
  Coffee,
  Baby,
  Sparkles,
  LucideIcon
} from 'lucide-react';
import { getCategoryIconUrl } from '@/lib/api';

export interface CategoryVisual {
  Icon: LucideIcon;
  iconUrl: string;
  color: string;
  bgGradient: string;
  borderColor: string;
}

export function getCategoryVisual(name: string): CategoryVisual {
  const lower = (name || '').toLowerCase();
  const iconUrl = getCategoryIconUrl(name);
  
  if (lower.includes('bé') || lower.includes('be')) {
    return { Icon: Baby, iconUrl, color: 'text-amber-500', bgGradient: 'from-amber-50 to-orange-100/60', borderColor: 'border-amber-200' };
  }
  if (lower.includes('cá nhân') || lower.includes('chăm sóc')) {
    return { Icon: Heart, iconUrl, color: 'text-pink-600', bgGradient: 'from-pink-50 to-rose-100/60', borderColor: 'border-pink-200' };
  }
  if (lower.includes('nhà cửa') || lower.includes('đời sống')) {
    return { Icon: Home, iconUrl, color: 'text-indigo-600', bgGradient: 'from-indigo-50 to-purple-100/60', borderColor: 'border-indigo-200' };
  }
  if (lower.includes('thịt tươi') || lower.includes('thịt, trứng') || lower.includes('thịt heo') || lower.includes('sản phẩm từ thịt')) {
    return { Icon: Beef, iconUrl, color: 'text-red-600', bgGradient: 'from-red-50 to-red-100/60', borderColor: 'border-red-200' };
  }
  if (lower.includes('trứng')) {
    return { Icon: Egg, iconUrl, color: 'text-amber-500', bgGradient: 'from-amber-50 to-yellow-100/60', borderColor: 'border-amber-200' };
  }
  if (lower.includes('rau') || lower.includes('nấm') || lower.includes('củ') || lower.includes('trái cây')) {
    return { Icon: Carrot, iconUrl, color: 'text-emerald-600', bgGradient: 'from-emerald-50 to-green-100/60', borderColor: 'border-emerald-200' };
  }
  if (lower.includes('hải sản') || lower.includes('cá') || lower.includes('tôm') || lower.includes('mực')) {
    return { Icon: Fish, iconUrl, color: 'text-cyan-600', bgGradient: 'from-cyan-50 to-sky-100/60', borderColor: 'border-cyan-200' };
  }
  if (lower.includes('đông lạnh') || lower.includes('đông, mát') || lower.includes('đông')) {
    return { Icon: Snowflake, iconUrl, color: 'text-sky-600', bgGradient: 'from-sky-50 to-blue-100/60', borderColor: 'border-sky-200' };
  }
  if (lower.includes('sữa') || lower.includes('bơ') || lower.includes('phô mai')) {
    return { Icon: Milk, iconUrl, color: 'text-blue-600', bgGradient: 'from-blue-50 to-indigo-100/60', borderColor: 'border-blue-200' };
  }
  if (lower.includes('uống') || lower.includes('nước') || lower.includes('giải khát')) {
    return { Icon: Droplets, iconUrl, color: 'text-teal-600', bgGradient: 'from-teal-50 to-cyan-100/60', borderColor: 'border-teal-200' };
  }
  if (lower.includes('bánh') || lower.includes('kẹo') || lower.includes('snack')) {
    return { Icon: Cookie, iconUrl, color: 'text-amber-700', bgGradient: 'from-amber-50 to-orange-100/60', borderColor: 'border-amber-200' };
  }
  if (lower.includes('chế biến') || lower.includes('bún tươi') || lower.includes('mì')) {
    return { Icon: UtensilsCrossed, iconUrl, color: 'text-orange-600', bgGradient: 'from-orange-50 to-amber-100/60', borderColor: 'border-orange-200' };
  }
  if (lower.includes('đóng hộp')) {
    return { Icon: Package, iconUrl, color: 'text-rose-600', bgGradient: 'from-rose-50 to-red-100/60', borderColor: 'border-rose-200' };
  }
  if (lower.includes('gia vị') || lower.includes('gạo') || lower.includes('thực phẩm khô')) {
    return { Icon: Flame, iconUrl, color: 'text-yellow-700', bgGradient: 'from-yellow-50 to-amber-100/60', borderColor: 'border-yellow-200' };
  }

  return { Icon: ShoppingBag, iconUrl, color: 'text-emerald-700', bgGradient: 'from-emerald-50 to-teal-100/60', borderColor: 'border-emerald-200' };
}

export function CategoryIcon({ 
  name, 
  size = 32, 
  className = '',
  useImage = true
}: { 
  name: string; 
  size?: number; 
  className?: string;
  useImage?: boolean;
}) {
  const visual = getCategoryVisual(name);

  if (useImage && visual.iconUrl) {
    return (
      <img
        src={visual.iconUrl}
        alt={name}
        width={size}
        height={size}
        className={`object-contain transition-transform ${className}`}
        loading="lazy"
      />
    );
  }

  const Icon = visual.Icon;
  return <Icon size={size} className={`${visual.color} ${className}`} />;
}
