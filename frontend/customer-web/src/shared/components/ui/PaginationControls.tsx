"use client";

import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';

interface PaginationControlsProps {
  totalItems: number;
  itemsPerPage: number;
  currentPage: number;
  visibleCount?: number;
  onPageChange: (page: number) => void;
  onLoadMore?: () => void;
  mode?: 'PAGINATION' | 'LOAD_MORE' | 'BOTH';
}

export default function PaginationControls({
  totalItems,
  itemsPerPage,
  currentPage,
  visibleCount,
  onPageChange,
  onLoadMore,
  mode = 'BOTH'
}: PaginationControlsProps) {
  if (totalItems <= itemsPerPage && (!visibleCount || visibleCount >= totalItems)) {
    return null;
  }

  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const currentDisplayed = visibleCount 
    ? Math.min(visibleCount, totalItems) 
    : Math.min(currentPage * itemsPerPage, totalItems);

  const remaining = Math.max(0, totalItems - currentDisplayed);
  const progressPercent = Math.min(100, Math.round((currentDisplayed / totalItems) * 100));

  // Generate page numbers
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="mt-8 flex flex-col items-center gap-4">
      {/* Progress Counter */}
      <div className="w-full max-w-xs text-center">
        <p className="text-xs text-slate-500 mb-1.5 font-medium">
          Đang hiển thị <b className="text-slate-900">{currentDisplayed}</b> trên <b className="text-slate-900">{totalItems}</b> sản phẩm
        </p>
        <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
          <div 
            className="bg-emerald-600 h-full rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Load More Button */}
      {(mode === 'LOAD_MORE' || mode === 'BOTH') && onLoadMore && remaining > 0 && (
        <button
          onClick={onLoadMore}
          className="group flex items-center justify-center gap-2 border border-emerald-600 text-emerald-700 hover:bg-emerald-700 hover:text-white px-8 py-2.5 rounded-lg text-sm font-semibold transition-all duration-150 shadow-xs hover:shadow-sm"
        >
          <span>Xem thêm sản phẩm ({remaining} còn lại)</span>
          <ChevronDown size={16} className="group-hover:translate-y-0.5 transition-transform" />
        </button>
      )}

      {/* Numbered Pagination */}
      {(mode === 'PAGINATION' || mode === 'BOTH') && totalPages > 1 && (
        <div className="flex items-center gap-1.5 pt-2">
          <button
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Trang trước"
          >
            <ChevronLeft size={16} />
          </button>

          {getPageNumbers().map((p, idx) => {
            if (p === '...') {
              return (
                <span key={`dots-${idx}`} className="px-2 text-xs text-slate-400 select-none">
                  •••
                </span>
              );
            }
            const pageNum = Number(p);
            const isActive = pageNum === currentPage;
            return (
              <button
                key={pageNum}
                onClick={() => onPageChange(pageNum)}
                className={`min-w-[36px] h-9 px-2 text-xs font-semibold rounded-lg border transition-colors ${
                  isActive
                    ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                }`}
              >
                {pageNum}
              </button>
            );
          })}

          <button
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Trang tiếp"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

