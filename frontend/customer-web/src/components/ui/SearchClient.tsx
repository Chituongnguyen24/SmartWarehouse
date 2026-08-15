"use client";

import { useState, useMemo } from 'react';
import ProductCard from '@/components/ui/ProductCard';
import FilterSidebar from '@/components/ui/FilterSidebar';
import { ChevronDown, SearchX } from 'lucide-react';
import Link from 'next/link';

const KNOWN_BRANDS = [
  'Co.op', 'Nam Ngư', 'Chinsu', 'Vissan', 'CP', 'Vina', 'TH ', 'TH true', 'Cholimex', 
  'Maggi', 'Knorr', 'Neptune', 'Simply', 'Meizan', 'Oishi', 'Kinh Đô', 'Lay\'s', 
  'Vifon', 'Hảo Hảo', 'Omachi', 'Kokomi', 'Gấu Đỏ', 'Coca', 'Pepsi', '7Up', 'Mirinda', 
  'Aquafina', 'Dasani', 'Lavie', 'Vĩnh Hảo', 'Thanh Hà', 'Hồng Hạnh', 'Liên Thành', 
  'Vua Gạo', 'Hạt Ngọc Trời', 'Omo', 'Ariel', 'Surf', 'Clear', 'Sunsilk', 'Dove',
  'Lifebuoy', 'P/S', 'CloseUp', 'Tường An', 'Happy Soya', 'An Lạc', 'An Nguyên'
];

interface SearchClientProps {
  initialProducts: any[];
  query: string;
}

export default function SearchClient({ initialProducts, query }: SearchClientProps) {
  const [maxPrice, setMaxPrice] = useState<number>(1000000);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<string>('Phổ biến');

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
        const words = p.name.split(' ');
        if (words.length > 0 && words[0].length > 2) {
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
      case 'Giá thấp đến cao':
        result.sort((a, b) => a.price - b.price);
        break;
      case 'Giá cao đến thấp':
        result.sort((a, b) => b.price - a.price);
        break;
      case 'Hàng mới':
        result.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        break;
      case 'Bán chạy':
        result.sort((a, b) => (b.soldCount || 0) - (a.soldCount || 0));
        break;
      case 'Phổ biến':
      default:
        // Default sort by relevance (we keep original order from backend)
        break;
    }

    return result;
  }, [initialProducts, maxPrice, selectedBrands, sortBy]);

  const SORT_OPTIONS = ['Phổ biến', 'Bán chạy', 'Hàng mới', 'Giá thấp đến cao', 'Giá cao đến thấp'];

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      {/* Left Sidebar (Filters) */}
      <div className="w-full lg:w-1/4 shrink-0">
        <FilterSidebar 
          brands={availableBrands}
          selectedBrands={selectedBrands}
          onBrandChange={handleBrandChange}
          maxPrice={maxPrice}
          onPriceChange={setMaxPrice}
        />
      </div>

      {/* Main Content Area */}
      <div className="w-full lg:w-3/4">
        {/* Page Header & Sorting Bar */}
        <div className="bg-white rounded-xl shadow-sm border border-border p-4 mb-6">
          <h1 className="text-2xl font-bold text-foreground mb-4">
            Tìm kiếm: "{query}" <span className="text-gray-500 text-lg font-normal">({filteredProducts.length} kết quả)</span>
          </h1>
          
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border pt-4">
            <div className="flex items-center gap-4 text-sm font-medium overflow-x-auto custom-scrollbar pb-1">
              <span className="text-gray-500 whitespace-nowrap">Sắp xếp theo:</span>
              {SORT_OPTIONS.map(option => (
                <button 
                  key={option}
                  onClick={() => setSortBy(option)}
                  className={`whitespace-nowrap transition-colors ${sortBy === option ? 'text-primary border-b-2 border-primary pb-1' : 'text-gray-600 hover:text-primary'}`}
                >
                  {option}
                </button>
              ))}
            </div>
            
            <div className="flex items-center gap-2 text-sm text-gray-600 shrink-0">
              <span>Hiển thị</span>
              <div className="border border-border rounded px-3 py-1 flex items-center gap-2 cursor-pointer bg-gray-50">
                40 <ChevronDown size={14} />
              </div>
            </div>
          </div>
        </div>

        {/* Product Grid or Empty State */}
        {filteredProducts.length > 0 ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
              {filteredProducts.map((product: any) => (
                <ProductCard key={product.id} {...product} />
              ))}
            </div>
            
            {/* Pagination (Mock) */}
            {filteredProducts.length >= 40 && (
              <div className="mt-10 flex justify-center">
                <button className="border-2 border-primary text-primary hover:bg-primary hover:text-white px-10 py-2.5 rounded-full font-bold transition-all w-full md:w-auto text-sm">
                  Xem thêm sản phẩm
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-border p-12 flex flex-col items-center justify-center text-center">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
              <SearchX size={48} className="text-gray-300" />
            </div>
            <h2 className="text-xl font-bold text-gray-700 mb-2">Không tìm thấy kết quả nào</h2>
            <p className="text-gray-500 mb-6 max-w-md">
              Rất tiếc, chúng tôi không tìm thấy sản phẩm nào phù hợp với từ khóa "<strong>{query}</strong>" hoặc bộ lọc hiện tại.
            </p>
            <button 
              onClick={() => { setMaxPrice(1000000); setSelectedBrands([]); setSortBy('Phổ biến'); }}
              className="bg-primary text-white font-bold py-3 px-8 rounded-lg hover:bg-primary/90 transition-colors shadow-md"
            >
              Xóa bộ lọc
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
