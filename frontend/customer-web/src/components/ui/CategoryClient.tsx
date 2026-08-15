"use client";

import { useState, useMemo } from 'react';
import ProductCard from '@/components/ui/ProductCard';
import FilterSidebar from '@/components/ui/FilterSidebar';
import { ChevronDown } from 'lucide-react';

const KNOWN_BRANDS = [
  'Co.op', 'Nam Ngư', 'Chinsu', 'Vissan', 'CP', 'Vina', 'TH ', 'TH true', 'Cholimex', 
  'Maggi', 'Knorr', 'Neptune', 'Simply', 'Meizan', 'Oishi', 'Kinh Đô', 'Lay\'s', 
  'Vifon', 'Hảo Hảo', 'Omachi', 'Kokomi', 'Gấu Đỏ', 'Coca', 'Pepsi', '7Up', 'Mirinda', 
  'Aquafina', 'Dasani', 'Lavie', 'Vĩnh Hảo', 'Thanh Hà', 'Hồng Hạnh', 'Liên Thành', 
  'Vua Gạo', 'Hạt Ngọc Trời', 'Omo', 'Ariel', 'Surf', 'Clear', 'Sunsilk', 'Dove',
  'Lifebuoy', 'P/S', 'CloseUp', 'Tường An', 'Happy Soya', 'An Lạc', 'An Nguyên'
];

interface CategoryClientProps {
  initialProducts: any[];
  categoryName: string;
  slug: string;
  categories: any[];
}

export default function CategoryClient({ initialProducts, categoryName, slug, categories }: CategoryClientProps) {
  const [maxPrice, setMaxPrice] = useState<number>(1000000);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<string>('Khuyến mãi tốt nhất');

  // Extract brands from products based on known list
  const availableBrands = useMemo(() => {
    const brandsSet = new Set<string>();
    initialProducts.forEach(p => {
      let found = false;
      for (const kb of KNOWN_BRANDS) {
        if (p.name.toLowerCase().includes(kb.toLowerCase())) {
          brandsSet.add(kb);
          found = true;
          break;
        }
      }
      if (!found) {
        // Fallback: Use the first word if it looks like a brand, otherwise 'Khác'
        const words = p.name.split(' ');
        if (words.length > 0 && words[0].length > 2) {
           // We'll just group unknowns into 'Khác' to avoid too many random words
           brandsSet.add('Khác');
        } else {
           brandsSet.add('Khác');
        }
      }
    });
    return Array.from(brandsSet).sort();
  }, [initialProducts]);

  const handleBrandChange = (brand: string) => {
    setSelectedBrands(prev => 
      prev.includes(brand) ? prev.filter(b => b !== brand) : [...prev, brand]
    );
  };

  // Filter products
  const filteredProducts = useMemo(() => {
    let result = initialProducts.filter(p => p.price <= maxPrice);
    
    if (selectedBrands.length > 0) {
      result = result.filter(p => {
        for (const brand of selectedBrands) {
          if (brand === 'Khác') {
            // It's 'Khác' if it doesn't match any known brand
            const matchesKnown = KNOWN_BRANDS.some(kb => p.name.toLowerCase().includes(kb.toLowerCase()));
            if (!matchesKnown) return true;
          } else {
            if (p.name.toLowerCase().includes(brand.toLowerCase())) return true;
          }
        }
        return false;
      });
    }

    // Sort products
    switch (sortBy) {
      case 'Giá tăng dần':
        result.sort((a, b) => a.price - b.price);
        break;
      case 'Giá giảm dần':
        result.sort((a, b) => b.price - a.price);
        break;
      case 'Sản phẩm mới nhất':
        result.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        break;
      case 'Bán chạy nhất':
        result.sort((a, b) => (b.soldCount || 0) - (a.soldCount || 0));
        break;
      case 'Khuyến mãi tốt nhất':
      default:
        result.sort((a, b) => (b.discountPercent || 0) - (a.discountPercent || 0));
        break;
    }

    return result;
  }, [initialProducts, maxPrice, selectedBrands, sortBy]);

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Sidebar (Approx 20-25%) */}
      <div className="w-full lg:w-1/4 xl:w-1/5 shrink-0">
        <FilterSidebar 
          categories={categories} 
          currentCategory={slug}
          brands={availableBrands}
          selectedBrands={selectedBrands}
          onBrandChange={handleBrandChange}
          maxPrice={maxPrice}
          onPriceChange={setMaxPrice}
        />
      </div>

      {/* Main Content (Approx 75-80%) */}
      <div className="w-full lg:w-3/4 xl:w-4/5">
        {/* Page Header & Sorting Bar */}
        <div className="bg-white rounded-xl shadow-sm border border-border p-4 mb-6">
          <h1 className="text-2xl font-bold text-foreground mb-4">{categoryName}</h1>

          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border pt-4">
            <div className="flex items-center gap-4 text-sm font-medium overflow-x-auto custom-scrollbar pb-1">
              <span className="text-gray-500 whitespace-nowrap">Sắp xếp theo:</span>
              {['Khuyến mãi tốt nhất', 'Giá tăng dần', 'Giá giảm dần', 'Sản phẩm mới nhất', 'Bán chạy nhất'].map(sortOpt => (
                <button 
                  key={sortOpt}
                  onClick={() => setSortBy(sortOpt)}
                  className={`whitespace-nowrap transition-colors ${sortBy === sortOpt ? 'bg-primary/10 text-primary px-4 py-1.5 rounded-full' : 'text-gray-600 hover:text-primary px-4 py-1.5'}`}
                >
                  {sortOpt}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-600 shrink-0">
              <span>Hiển thị</span>
              <div className="border border-border rounded px-3 py-1 flex items-center gap-2 cursor-pointer bg-gray-50">
                20 <ChevronDown size={14} />
              </div>
            </div>
          </div>
        </div>

        {/* Product Grid */}
        {filteredProducts.length > 0 ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredProducts.map((product: any) => (
                <ProductCard key={product.id} {...product} />
              ))}
            </div>

            {/* Pagination */}
            <div className="mt-10 flex justify-center">
              <button className="border-2 border-primary text-primary hover:bg-primary hover:text-white px-10 py-2.5 rounded-full font-bold transition-all w-full md:w-auto text-sm">
                Xem thêm sản phẩm
              </button>
            </div>
          </>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-border p-12 text-center">
            <p className="text-gray-500 mb-4">Không tìm thấy sản phẩm nào phù hợp với bộ lọc.</p>
            <button 
              onClick={() => { setSelectedBrands([]); setMaxPrice(1000000); }} 
              className="inline-block bg-primary text-white font-bold py-2 px-6 rounded-full hover:bg-green-700 transition-colors"
            >
              Xóa bộ lọc
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
