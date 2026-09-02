import { getProducts, getCategories, slugify } from '@/lib/api';
import CategoryClient from '@/components/ui/CategoryClient';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  const rawSlug = resolvedParams.slug;
  const decodedSlug = decodeURIComponent(rawSlug);

  const allCategories = await getCategories();

  let categoryName = 'Tất cả danh mục';
  let dbCategory: string | undefined = undefined;

  if (rawSlug === 'tat-ca-danh-muc' || decodedSlug === 'tat-ca-danh-muc') {
    categoryName = 'Tất cả danh mục';
    dbCategory = undefined;
  } else {
    // Tìm trong danh mục theo slug hoặc tên
    const matched = allCategories.find(
      c => c.slug === rawSlug || c.slug === decodedSlug || slugify(c.name) === rawSlug || c.name.toLowerCase() === decodedSlug.toLowerCase()
    );

    if (matched) {
      categoryName = matched.name;
      dbCategory = matched.name;
    } else {
      // Fallback nếu người dùng truyền trực tiếp tên tiếng Việt
      categoryName = decodedSlug;
      dbCategory = decodedSlug;
    }
  }

  // Lấy danh sách sản phẩm theo danh mục từ backend với limit lớn
  const productsData = await getProducts({ 
    category: dbCategory,
    limit: 100 
  });
  
  const products = productsData.items;

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link href="/" className="hover:text-primary transition-colors">Trang chủ</Link>
          <ChevronRight size={14} className="text-gray-400" />
          <Link href="/danh-muc/tat-ca-danh-muc" className="hover:text-primary transition-colors">Danh mục</Link>
          <ChevronRight size={14} className="text-gray-400" />
          <span className="text-foreground font-bold">{categoryName}</span>
        </div>

        <CategoryClient 
          initialProducts={products}
          categoryName={categoryName}
          slug={rawSlug}
          categories={allCategories}
        />
      </div>
    </div>
  );
}
