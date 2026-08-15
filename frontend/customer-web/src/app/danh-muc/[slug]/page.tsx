import { CATEGORIES } from '@/lib/mockData';
import { getProducts } from '@/lib/api';
import CategoryClient from '@/components/ui/CategoryClient';
import { notFound } from 'next/navigation';
import { ChevronRight } from 'lucide-react';

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  const slug = resolvedParams.slug;

  const category = CATEGORIES.find(c => c.slug === slug);

  if (!category && slug !== 'tat-ca-danh-muc') {
    notFound();
  }

  const categoryName = category ? category.name : 'Tất cả danh mục';
  let dbCategory = categoryName;
  if (slug === 'tat-ca-danh-muc') dbCategory = '';

  const productsData = await getProducts({ 
    category: dbCategory || undefined,
    limit: 40 
  });
  
  const products = productsData.items;

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <a href="/" className="hover:text-primary transition-colors">Trang chủ</a>
          <ChevronRight size={14} className="text-gray-400" />
          <span className="text-foreground font-bold">{categoryName}</span>
        </div>

        <CategoryClient 
          initialProducts={products}
          categoryName={categoryName}
          slug={slug}
          categories={CATEGORIES}
        />
      </div>
    </div>
  );
}
