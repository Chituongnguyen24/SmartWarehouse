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
  Sparkles, 
  ShoppingBag,
  Salad,
  Wine,
  Egg,
  Coffee,
  LucideIcon
} from 'lucide-react';

interface CategoryVisual {
  Icon: LucideIcon;
  color: string;
  bgGradient: string;
  borderColor: string;
}

export function getCategoryVisual(name: string): CategoryVisual {
  const lower = (name || '').toLowerCase();
  
  if (lower.includes('thịt tươi') || lower.includes('thịt heo') || lower.includes('thịt bò') || lower.includes('thịt gà') || lower.includes('sản phẩm từ thịt')) {
    return { Icon: Beef, color: 'text-red-600', bgGradient: 'from-red-50 to-red-100/60', borderColor: 'border-red-200' };
  }
  if (lower.includes('trứng')) {
    return { Icon: Egg, color: 'text-amber-500', bgGradient: 'from-amber-50 to-yellow-100/60', borderColor: 'border-amber-200' };
  }
  if (lower.includes('rau') || lower.includes('nấm') || lower.includes('củ')) {
    return { Icon: Carrot, color: 'text-emerald-600', bgGradient: 'from-emerald-50 to-green-100/60', borderColor: 'border-emerald-200' };
  }
  if (lower.includes('trái cây') || lower.includes('táo') || lower.includes('cam') || lower.includes('dưa')) {
    return { Icon: Apple, color: 'text-rose-500', bgGradient: 'from-rose-50 to-pink-100/60', borderColor: 'border-rose-200' };
  }
  if (lower.includes('thủy') || lower.includes('hải sản') || lower.includes('cá') || lower.includes('tôm') || lower.includes('mực')) {
    return { Icon: Fish, color: 'text-cyan-600', bgGradient: 'from-cyan-50 to-sky-100/60', borderColor: 'border-cyan-200' };
  }
  if (lower.includes('đông lạnh') || lower.includes('mát - đông')) {
    return { Icon: Snowflake, color: 'text-sky-600', bgGradient: 'from-sky-50 to-blue-100/60', borderColor: 'border-sky-200' };
  }
  if (lower.includes('sữa') || lower.includes('bơ') || lower.includes('phô mai')) {
    return { Icon: Milk, color: 'text-blue-600', bgGradient: 'from-blue-50 to-indigo-100/60', borderColor: 'border-blue-200' };
  }
  if (lower.includes('trà') || lower.includes('cà phê')) {
    return { Icon: Coffee, color: 'text-amber-800', bgGradient: 'from-amber-50 to-yellow-100/60', borderColor: 'border-amber-200' };
  }
  if (lower.includes('uống có cồn') || lower.includes('bia') || lower.includes('rượu')) {
    return { Icon: Wine, color: 'text-purple-600', bgGradient: 'from-purple-50 to-pink-100/60', borderColor: 'border-purple-200' };
  }
  if (lower.includes('nước') || lower.includes('uống') || lower.includes('giải khát') || lower.includes('suối')) {
    return { Icon: Droplets, color: 'text-teal-600', bgGradient: 'from-teal-50 to-cyan-100/60', borderColor: 'border-teal-200' };
  }
  if (lower.includes('ăn liền') || lower.includes('mì')) {
    return { Icon: UtensilsCrossed, color: 'text-orange-600', bgGradient: 'from-orange-50 to-amber-100/60', borderColor: 'border-orange-200' };
  }
  if (lower.includes('bánh') || lower.includes('kẹo') || lower.includes('mứt') || lower.includes('sấy khô')) {
    return { Icon: Cookie, color: 'text-amber-700', bgGradient: 'from-amber-50 to-orange-100/60', borderColor: 'border-amber-200' };
  }
  if (lower.includes('gia vị') || lower.includes('dầu') || lower.includes('chấm') || lower.includes('xốt') || lower.includes('mắm')) {
    return { Icon: Flame, color: 'text-amber-600', bgGradient: 'from-yellow-50 to-orange-100/60', borderColor: 'border-yellow-200' };
  }
  if (lower.includes('cá nhân') || lower.includes('chăm sóc')) {
    return { Icon: Heart, color: 'text-pink-600', bgGradient: 'from-pink-50 to-rose-100/60', borderColor: 'border-pink-200' };
  }
  if (lower.includes('nhà cửa') || lower.includes('đời sống')) {
    return { Icon: Home, color: 'text-indigo-600', bgGradient: 'from-indigo-50 to-purple-100/60', borderColor: 'border-indigo-200' };
  }
  if (lower.includes('hàn quốc') || lower.includes('no brand') || lower.includes('dinh dưỡng')) {
    return { Icon: Sparkles, color: 'text-violet-600', bgGradient: 'from-violet-50 to-purple-100/60', borderColor: 'border-violet-200' };
  }
  if (lower.includes('gạo') || lower.includes('bột') || lower.includes('hạt') || lower.includes('đậu') || lower.includes('khô')) {
    return { Icon: Package, color: 'text-yellow-700', bgGradient: 'from-yellow-50 to-amber-100/60', borderColor: 'border-yellow-200' };
  }
  return { Icon: ShoppingBag, color: 'text-emerald-700', bgGradient: 'from-emerald-50 to-teal-100/60', borderColor: 'border-emerald-200' };
}

export function CategoryIcon({ name, size = 20, className = '' }: { name: string; size?: number; className?: string }) {
  const visual = getCategoryVisual(name);
  const Icon = visual.Icon;
  return <Icon size={size} className={`${visual.color} ${className}`} />;
}
