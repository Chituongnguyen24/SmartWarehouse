"use client";

import { useState } from "react";
import Image from "next/image";
import { Search, Store, Truck, CheckCircle2 } from "lucide-react";

export default function OrderHistoryPage() {
  const [activeTab, setActiveTab] = useState("all");
  
  const tabs = [
    { id: "all", label: "Tất cả" },
    { id: "pending", label: "Chờ xác nhận" },
    { id: "shipping", label: "Đang giao" },
    { id: "completed", label: "Đã giao" },
    { id: "cancelled", label: "Đã hủy" },
  ];

  const MOCK_ORDERS = [
    {
      id: "DH12345678",
      status: "completed",
      statusText: "Đã giao hàng",
      date: "12-08-2026 14:30",
      total: 125000,
      items: [
        { name: "Cà chua Cherry Đà Lạt", qty: 2, price: 35000, img: "https://minhcaumart.vn/media/product/250-1340-ca-chua-cherry-do-minh-cau-mart.jpg" },
        { name: "Sữa tươi Vinamilk 1L", qty: 1, price: 32000, img: "https://minhcaumart.vn/media/product/250-3277-5052955-sua-tuoi-tiet-trung-vinamilk-100-co-duong-1l.jpg" }
      ]
    },
    {
      id: "DH98765432",
      status: "shipping",
      statusText: "Đang giao hàng",
      date: "10-08-2026 09:15",
      total: 89000,
      items: [
        { name: "Nước Mắm Nam Ngư Đệ Nhị", qty: 1, price: 45000, img: "https://minhcaumart.vn/media/product/250-5972-nuoc-mam-de-nhi.png" },
      ]
    }
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-gray-100 pb-4 mb-4">
        <h1 className="text-2xl font-bold text-gray-800 mb-1">Đơn hàng của tôi</h1>
        <p className="text-gray-500 text-sm">Theo dõi trạng thái đơn hàng</p>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto border-b border-gray-200 mb-6 pb-0 scrollbar-hide">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`whitespace-nowrap px-6 py-3 font-medium transition-colors border-b-2 ${
              activeTab === tab.id 
                ? "border-primary text-primary" 
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <input 
          type="text" 
          placeholder="Tìm kiếm theo Tên Sản phẩm hoặc Mã Đơn hàng" 
          className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
        />
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
      </div>

      {/* Order List */}
      <div className="space-y-4">
        {MOCK_ORDERS.filter(o => activeTab === "all" || o.status === activeTab).map(order => (
          <div key={order.id} className="border border-gray-200 rounded-xl overflow-hidden hover:border-gray-300 transition-colors">
            {/* Header */}
            <div className="bg-gray-50 px-5 py-3 border-b border-gray-200 flex flex-wrap justify-between items-center gap-2">
              <div className="flex items-center gap-3">
                <Store size={18} className="text-gray-600" />
                <span className="font-bold text-gray-800">C.T Mart Official</span>
                <span className="text-sm text-gray-500">Mã: {order.id}</span>
              </div>
              <div className="flex items-center gap-2 text-sm font-medium">
                {order.status === 'shipping' && <Truck size={16} className="text-blue-500" />}
                {order.status === 'completed' && <CheckCircle2 size={16} className="text-green-500" />}
                <span className={order.status === 'completed' ? 'text-green-600' : 'text-blue-600'}>
                  {order.statusText.toUpperCase()}
                </span>
              </div>
            </div>

            {/* Items */}
            <div className="p-5 space-y-4">
              {order.items.map((item, idx) => (
                <div key={idx} className="flex gap-4">
                  <div className="w-20 h-20 bg-gray-50 border border-gray-100 rounded-lg overflow-hidden shrink-0 relative">
                    <Image src={item.img} alt={item.name} fill className="object-cover" />
                  </div>
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-medium text-gray-800 line-clamp-2">{item.name}</h3>
                      <div className="text-sm text-gray-500 mt-1">x{item.qty}</div>
                    </div>
                    <div className="text-right font-bold text-gray-800">
                      {item.price.toLocaleString("vi-VN")}đ
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-gray-100 flex flex-wrap justify-between items-center gap-4 bg-gray-50/50">
              <div className="text-sm text-gray-500">
                Ngày đặt: {order.date}
              </div>
              <div className="flex items-center gap-6">
                <div className="text-gray-700">
                  Thành tiền: <strong className="text-primary text-xl ml-2">{order.total.toLocaleString("vi-VN")}đ</strong>
                </div>
                <div className="flex gap-2">
                  <button className="px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors">
                    Mua lại
                  </button>
                  <button className="px-4 py-2 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 transition-colors">
                    Chi tiết
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
