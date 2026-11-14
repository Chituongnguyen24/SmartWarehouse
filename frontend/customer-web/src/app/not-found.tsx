import React from 'react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white rounded-xl border border-slate-200 p-8 text-center shadow-sm">
        <div className="text-3xl font-bold text-slate-800 mb-2">404</div>
        <h2 className="text-base font-semibold text-slate-900 mb-2">
          Không tìm thấy trang yêu cầu
        </h2>
        <p className="text-xs text-slate-500 mb-6 leading-relaxed">
          Đường dẫn quý khách truy cập không tồn tại hoặc đã được thay đổi cấu trúc.
        </p>
        <Link
          href="/"
          className="inline-block px-5 py-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-medium rounded-md transition-colors"
        >
          Quay lại trang chủ
        </Link>
      </div>
    </div>
  );
}

