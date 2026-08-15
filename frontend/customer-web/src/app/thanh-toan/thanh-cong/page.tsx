import Link from 'next/link';
import { CheckCircle2, Package, ArrowRight, Home } from 'lucide-react';

export default function OrderSuccessPage() {
  // Simulate a random order ID
  const orderId = 'ORD-' + Math.random().toString(36).substring(2, 8).toUpperCase();

  return (
    <div className="bg-gray-50 min-h-screen py-12 px-4 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 md:p-12 max-w-lg w-full text-center relative overflow-hidden">
        
        {/* Decorative background circle */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-green-50 rounded-full blur-3xl opacity-50 pointer-events-none"></div>

        <div className="relative z-10">
          {/* Success Icon */}
          <div className="w-24 h-24 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
            <CheckCircle2 size={56} strokeWidth={2.5} />
          </div>

          <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Đặt Hàng Thành Công!</h1>
          <p className="text-gray-500 text-base mb-8">
            Cảm ơn bạn đã tin tưởng và mua sắm tại C.T Mart. Đơn hàng của bạn đang được chúng tôi xử lý.
          </p>

          <div className="bg-gray-50 border border-gray-100 rounded-xl p-5 mb-8 text-left">
            <div className="flex items-center gap-3 mb-4">
              <Package className="text-primary" size={24} />
              <h2 className="font-bold text-gray-800 text-lg">Thông tin đơn hàng</h2>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Mã đơn hàng:</span>
                <span className="font-bold text-gray-900">{orderId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Trạng thái:</span>
                <span className="font-medium text-orange-600 bg-orange-50 px-2 py-0.5 rounded">Chờ xác nhận</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Dự kiến giao:</span>
                <span className="font-medium text-gray-900">Trong vòng 2 giờ tới</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link 
              href="/" 
              className="flex-1 bg-white border-2 border-gray-200 text-gray-700 font-bold py-3 px-6 rounded-xl hover:border-gray-300 hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
            >
              <Home size={18} /> Về trang chủ
            </Link>
            <Link 
              href="#" 
              className="flex-1 bg-primary text-white font-bold py-3 px-6 rounded-xl hover:bg-primary/90 shadow-md transition-all flex items-center justify-center gap-2"
            >
              Xem đơn hàng <ArrowRight size={18} />
            </Link>
          </div>
        </div>
        
      </div>
    </div>
  );
}
