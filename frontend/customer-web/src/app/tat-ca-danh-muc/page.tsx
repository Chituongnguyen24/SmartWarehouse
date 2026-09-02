import { getCategories } from '@/lib/api';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { getCategoryVisual } from '@/components/ui/CategoryIcon';

export default async function AllCategoriesPage() {
  const categories = await getCategories();

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link href="/" className="hover:text-primary transition-colors">Trang chủ</Link>
          <ChevronRight size={14} className="text-gray-400" />
          <span className="text-foreground font-bold">Tất cả danh mục ({categories.length})</span>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-border p-6 md:p-8">
          <div className="mb-8">
            <h1 className="text-2xl font-black text-foreground uppercase tracking-wide">
              Tất Cả Danh Mục Sản Phẩm
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Khám phá toàn bộ {categories.length} nhóm ngành hàng thực phẩm & bách hóa tại CityMart
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-6">
            {categories.map((cat) => {
              const visual = getCategoryVisual(cat.name);
              const IconComponent = visual.Icon;
              return (
                <Link 
                  key={cat.slug} 
                  href={`/danh-muc/${cat.slug}`}
                  className="flex flex-col items-center justify-between p-4 rounded-2xl border border-gray-100 hover:border-primary/50 shadow-xs hover:shadow-md transition-all group bg-gradient-to-b from-white to-gray-50/50 hover:to-green-50/20 group-hover:-translate-y-1"
                >
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center bg-gradient-to-br ${visual.bgGradient} border ${visual.borderColor} shadow-inner mb-3 group-hover:scale-110 transition-transform`}>
                    <IconComponent size={28} className={visual.color} />
                  </div>
                  <span className="text-sm font-bold text-gray-800 text-center line-clamp-2 group-hover:text-primary transition-colors leading-snug">
                    {cat.name}
                  </span>
                  {cat.count > 0 && (
                    <span className="text-xs text-muted-foreground mt-2 font-medium bg-gray-100 px-2.5 py-0.5 rounded-full group-hover:bg-green-100 group-hover:text-primary transition-colors">
                      {cat.count} sản phẩm
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
