"use client";

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface FilterSidebarProps {
  categories?: { name: string, slug: string }[];
  currentCategory?: string;
  brands: string[];
  selectedBrands: string[];
  onBrandChange: (brand: string) => void;
  maxPrice: number;
  onPriceChange: (price: number) => void;
}

export default function FilterSidebar({ 
  categories, 
  currentCategory,
  brands,
  selectedBrands,
  onBrandChange,
  maxPrice,
  onPriceChange
}: FilterSidebarProps) {
  const [selectedCategories, setSelectedCategories] = useState<string[]>(currentCategory ? [currentCategory] : []);
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({ 'rau-cu-trai-cay': true });

  // Mock subcategories for demonstration
  const SUBCATEGORIES: Record<string, string[]> = {
    'rau-cu-trai-cay': ['Củ', 'Rau nêm, rau thơm', 'Rau xào, nấu canh', 'Xà lách', 'Cam, bưởi, quýt', 'Dưa', 'Nho, kiwi'],
    'thit-trung-hai-san': ['Thịt heo', 'Thịt bò', 'Gia cầm', 'Hải sản đông lạnh', 'Trứng các loại'],
  };

  const handleCategoryChange = (slug: string) => {
    setSelectedCategories(prev => 
      prev.includes(slug) ? prev.filter(c => c !== slug) : [...prev, slug]
    );
  };

  const toggleCatExpand = (slug: string, e: React.MouseEvent) => {
    e.preventDefault();
    setExpandedCats(prev => ({ ...prev, [slug]: !prev[slug] }));
  };

  const formatPrice = (p: number) => {
    return p.toLocaleString('vi-VN') + 'đ';
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-border p-5 space-y-6 sticky top-24">
      {/* KHOẢNG GIÁ */}
      <div>
        <h3 className="font-bold text-foreground mb-4 uppercase text-sm tracking-wider">Khoảng giá</h3>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-gray-50 border border-border rounded-md px-3 py-1.5 text-sm">
              0đ
            </div>
            <span className="text-gray-400">-</span>
            <div className="flex-1 bg-gray-50 border border-border rounded-md px-3 py-1.5 text-sm text-right">
              {formatPrice(maxPrice)}
            </div>
          </div>
          <input 
            type="range" 
            min="0" 
            max="1000000" 
            step="10000"
            value={maxPrice}
            onChange={(e) => onPriceChange(Number(e.target.value))}
            className="w-full accent-primary h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
        </div>
      </div>

      {/* THƯƠNG HIỆU */}
      <div className="border-t border-border pt-4">
        <h3 className="font-bold text-foreground mb-4 uppercase text-sm tracking-wider">Thương hiệu</h3>
        <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
          {brands.map((brand, idx) => (
            <label key={idx} className="flex items-center gap-3 cursor-pointer group">
              <input 
                type="checkbox" 
                checked={selectedBrands.includes(brand)}
                onChange={() => onBrandChange(brand)}
                className="w-4 h-4 text-primary rounded focus:ring-primary border-gray-300"
              />
              <span className="text-sm text-gray-600 group-hover:text-primary transition-colors">{brand}</span>
            </label>
          ))}
        </div>
      </div>

      {/* DANH MỤC */}
      <div className="border-t border-border pt-4">
        <h3 className="font-bold text-foreground mb-4 uppercase text-sm tracking-wider">Danh mục</h3>
        <ul className="space-y-2">
          {categories?.map(cat => (
            <li key={cat.slug} className="flex flex-col">
              <div className="flex items-center justify-between group cursor-pointer">
                <label className="flex items-center gap-3 cursor-pointer flex-1">
                  <input 
                    type="checkbox" 
                    checked={selectedCategories.includes(cat.slug)}
                    onChange={() => handleCategoryChange(cat.slug)}
                    className="w-4 h-4 text-primary rounded focus:ring-primary border-gray-300"
                  />
                  <span className={`text-sm transition-colors ${selectedCategories.includes(cat.slug) ? 'text-primary font-bold' : 'text-gray-600 group-hover:text-primary'}`}>
                    {cat.name}
                  </span>
                </label>
                {SUBCATEGORIES[cat.slug] && (
                  <button onClick={(e) => toggleCatExpand(cat.slug, e)} className="p-1 text-gray-400 hover:text-primary">
                    {expandedCats[cat.slug] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                )}
              </div>
              
              {/* Subcategories Dropdown */}
              {SUBCATEGORIES[cat.slug] && expandedCats[cat.slug] && (
                <div className="ml-7 mt-2 space-y-2 border-l-2 border-gray-100 pl-3">
                  {SUBCATEGORIES[cat.slug].map((sub, idx) => (
                    <label key={idx} className="flex items-center gap-3 cursor-pointer group">
                      <input 
                        type="checkbox" 
                        className="w-3.5 h-3.5 text-primary rounded focus:ring-primary border-gray-300"
                      />
                      <span className="text-sm text-gray-500 group-hover:text-primary transition-colors">{sub}</span>
                    </label>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>

    </div>
  );
}
