import SearchClient from '@/components/ui/SearchClient';
import { getProducts } from '@/lib/api';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q: string }> }) {
  const resolvedParams = await searchParams;
  const query = resolvedParams.q || '';
  
  // Fetch products from API based on query
  const productsData = await getProducts({ 
    keyword: query, 
    limit: 40 
  });
  const searchResults = productsData.items;

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link href="/" className="hover:text-primary transition-colors">Trang chủ</Link>
          <ChevronRight size={14} className="text-gray-400" />
          <span className="text-foreground">Kết quả tìm kiếm</span>
        </div>

          <SearchClient initialProducts={searchResults} query={query} />
      </div>
    </div>
  );
}
