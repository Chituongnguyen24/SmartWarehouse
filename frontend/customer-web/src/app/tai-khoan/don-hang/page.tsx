"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Search, Store, Truck, CheckCircle2, Clock, Package, 
  AlertCircle, XCircle, ChevronRight, RefreshCw, ShoppingCart, 
  MapPin, Phone, User, Calendar, CreditCard, ExternalLink, X,
  ShieldCheck, ArrowRight, CornerDownRight, RotateCcw
} from "lucide-react";
import { useAuthStore, useCartStore } from "@/lib/store";
import { CustomerLiveTrackingMap } from "@/components/ui/CustomerLiveTrackingMap";
import { io } from "socket.io-client";

interface OrderItem {
  id?: string;
  productId: string;
  sku?: string;
  productName: string;
  quantity: number;
  price: string | number;
  imageUrl?: string;
}

interface CustomerOrder {
  id: string;
  customerId?: string;
  status: string; // PENDING, PICKING, PACKING, DELIVERING, COMPLETED, CANCELLED, etc.
  totalAmount: string | number;
  shippingFee: string | number;
  discount: string | number;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  note?: string;
  deliveryMethod?: string;
  paymentMethod?: string;
  assignedWarehouseName?: string;
  assignedWarehouseId?: string;
  assignedDriverId?: string;
  assignedDriverName?: string;
  assignedDriverPhone?: string;
  assignedDriverPlate?: string;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
}

const STATUS_TABS = [
  { id: "all", label: "Tất cả", icon: null },
  { id: "pending", label: "Chờ xác nhận", icon: Clock },
  { id: "processing", label: "Kho đang xử lý", icon: Package },
  { id: "delivering", label: "Đang giao hàng", icon: Truck },
  { id: "completed", label: "Đã giao", icon: CheckCircle2 },
  { id: "cancelled", label: "Đã hủy", icon: XCircle },
];

export default function OrderHistoryPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { addToCart } = useCartStore();

  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [productsMap, setProductsMap] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Selected Order for Detail / Timeline Modal
  const [selectedOrder, setSelectedOrder] = useState<CustomerOrder | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Fetch Product Catalog to enrich images
  const fetchProducts = async () => {
    try {
      const res = await fetch("http://localhost:3010/products?limit=500");
      if (res.ok) {
        const data = await res.json();
        const map: Record<string, any> = {};
        (data.items || []).forEach((p: any) => {
          map[p.id] = p;
          if (p.sku) map[p.sku] = p;
        });
        setProductsMap(map);
      }
    } catch (e) {
      console.error("Failed to load products catalog for order images:", e);
    }
  };

  // Fetch Customer Orders
  const fetchOrders = async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await fetch("http://localhost:3004/orders");
      if (res.ok) {
        const data: CustomerOrder[] = await res.json();
        
        // Filter orders for the logged-in customer if available, or sort newest first
        const sorted = data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setOrders(sorted);
      }
    } catch (e) {
      console.error("Failed to fetch customer orders from order-service:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchOrders();

    // ⚡ Enterprise WebSocket Connection (Socket.io) - Event-Driven Push (0% Polling Overhead)
    const socket = io("http://localhost:3004");

    socket.on("order_status_updated", (updatedOrder: any) => {
      setOrders((prev) =>
        prev.map((o) => (o.id === updatedOrder.id ? { ...o, ...updatedOrder } : o))
      );
      setSelectedOrder((prev) => (prev && prev.id === updatedOrder.id ? { ...prev, ...updatedOrder } : prev));
    });

    socket.on("new_order", (newOrder: any) => {
      setOrders((prev) => {
        if (prev.some((o) => o.id === newOrder.id)) return prev;
        return [newOrder, ...prev];
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [user]);

  // Map backend status to standard UI status group
  const getStatusGroup = (status: string) => {
    const s = (status || "").toUpperCase();
    if (s === "PENDING" || s === "ORDERED" || s === "CONFIRMED") return "pending";
    if (s === "PICKING" || s === "PACKING" || s === "PACKED") return "processing";
    if (s === "DELIVERING" || s === "SHIPPED") return "delivering";
    if (s === "COMPLETED" || s === "DELIVERED") return "completed";
    if (s === "CANCELLED") return "cancelled";
    return "pending";
  };

  // Status visual badge configuration
  const getStatusBadge = (status: string) => {
    const s = (status || "").toUpperCase();
    switch (s) {
      case "COMPLETED":
      case "DELIVERED":
        return {
          label: "Giao hàng thành công",
          bg: "bg-emerald-50 border-emerald-200 text-emerald-700",
          icon: CheckCircle2,
          color: "#059669"
        };
      case "DELIVERING":
      case "SHIPPED":
        return {
          label: "Đang giao hàng",
          bg: "bg-blue-50 border-blue-200 text-blue-700 animate-pulse",
          icon: Truck,
          color: "#0284c7"
        };
      case "PICKING":
      case "PACKING":
      case "PACKED":
        return {
          label: "Kho đang xử lý & đóng gói",
          bg: "bg-amber-50 border-amber-200 text-amber-700",
          icon: Package,
          color: "#d97706"
        };
      case "CANCELLED":
        return {
          label: "Đã hủy đơn",
          bg: "bg-rose-50 border-rose-200 text-rose-700",
          icon: XCircle,
          color: "#e11d48"
        };
      case "PENDING":
      default:
        return {
          label: "Chờ xác nhận & phân kho",
          bg: "bg-slate-100 border-slate-200 text-slate-700",
          icon: Clock,
          color: "#475569"
        };
    }
  };

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const group = getStatusGroup(order.status);
      const matchTab = activeTab === "all" || group === activeTab;
      
      const q = searchQuery.trim().toLowerCase();
      const matchSearch = q === "" || 
        order.id.toLowerCase().includes(q) ||
        (order.customerName || "").toLowerCase().includes(q) ||
        (order.customerAddress || "").toLowerCase().includes(q) ||
        order.items?.some(i => (i.productName || "").toLowerCase().includes(q) || (i.sku || "").toLowerCase().includes(q));

      return matchTab && matchSearch;
    });
  }, [orders, activeTab, searchQuery]);

  // Tab counts
  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = { all: orders.length, pending: 0, processing: 0, delivering: 0, completed: 0, cancelled: 0 };
    orders.forEach(o => {
      const g = getStatusGroup(o.status);
      if (counts[g] !== undefined) counts[g]++;
    });
    return counts;
  }, [orders]);

  // Action: Buy Again (Re-order)
  const handleReorder = (order: CustomerOrder) => {
    if (!order.items || order.items.length === 0) return;
    let addedCount = 0;

    order.items.forEach(item => {
      const prodInfo = productsMap[item.productId] || (item.sku ? productsMap[item.sku] : null);
      const img = prodInfo?.imageUrl || item.imageUrl || "https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&auto=format&fit=crop&q=60";
      const price = typeof item.price === "string" ? parseFloat(item.price) : item.price;

      addToCart({
        productId: item.productId,
        name: item.productName,
        price: isNaN(price) ? 50000 : price,
        quantity: item.quantity || 1,
        image: img,
        sku: item.sku
      });
      addedCount += (item.quantity || 1);
    });

    showToast(`🛒 Đã thêm ${addedCount} sản phẩm vào giỏ hàng! Đang chuyển đến giỏ hàng...`);
    setTimeout(() => {
      router.push("/gio-hang");
    }, 1200);
  };

  // Action: Cancel Order (Only if PENDING)
  const handleCancelOrder = async (orderId: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn hủy đơn hàng này?")) return;
    try {
      const res = await fetch(`http://localhost:3004/orders/sync-status/${orderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CANCELLED" })
      });
      if (res.ok) {
        showToast("❌ Đã hủy đơn hàng thành công!");
        fetchOrders(true);
        if (selectedOrder?.id === orderId) {
          setSelectedOrder(prev => prev ? { ...prev, status: "CANCELLED" } : null);
        }
      } else {
        alert("Không thể hủy đơn hàng vào lúc này. Vui lòng liên hệ hotline 1900 5555 68!");
      }
    } catch (e) {
      console.error("Failed to cancel order:", e);
    }
  };

  // Format Helpers
  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')} • ${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
    } catch {
      return isoStr;
    }
  };

  const formatPrice = (val: string | number) => {
    const num = typeof val === "string" ? parseFloat(val) : val;
    return isNaN(num) ? "0 ₫" : `${num.toLocaleString("vi-VN")} ₫`;
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 bg-slate-900 text-white px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-3 border border-slate-700 animate-in slide-in-from-top duration-300">
          <CheckCircle2 size={20} className="text-emerald-400 shrink-0" />
          <span className="text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
            <span>📦</span> Đơn Hàng Của Tôi
            <span className="text-xs bg-emerald-100 text-emerald-800 font-extrabold px-3 py-1 rounded-full">
              {orders.length} đơn hàng
            </span>
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Theo dõi hành trình xử lý, xuất kho và lịch sử mua sắm thực phẩm tươi sạch C.T Mart.
          </p>
        </div>

        <button
          onClick={() => fetchOrders(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer disabled:opacity-50"
        >
          <RefreshCw size={15} className={refreshing ? "animate-spin text-emerald-600" : "text-slate-600"} />
          {refreshing ? "Đang đồng bộ..." : "Làm mới đơn"}
        </button>
      </div>

      {/* Status Tabs */}
      <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-hide border-b border-slate-200">
        {STATUS_TABS.map(tab => {
          const count = tabCounts[tab.id] || 0;
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? "bg-emerald-700 text-white shadow-md shadow-emerald-700/20"
                  : "bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50"
              }`}
            >
              {Icon && <Icon size={16} />}
              <span>{tab.label}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-extrabold ${
                isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search Input */}
      <div className="relative">
        <input 
          type="text" 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Tìm theo Mã đơn hàng (#DH...), Tên món thực phẩm, hoặc Địa chỉ..." 
          className="w-full bg-white border border-slate-200 rounded-xl py-3 pl-11 pr-4 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10 transition-all shadow-sm"
        />
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
      </div>

      {/* Orders List */}
      {loading ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm">
          <RefreshCw size={32} className="animate-spin text-emerald-600 mx-auto mb-3" />
          <p className="text-slate-600 font-semibold text-sm">Đang tải dữ liệu đơn hàng từ C.T Mart...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm space-y-4">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
            <Package size={32} />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">Không có đơn hàng nào</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto mt-1">
              {searchQuery ? "Không tìm thấy đơn hàng nào khớp với từ khóa tìm kiếm." : "Bạn chưa có đơn hàng nào trong danh mục này."}
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm px-6 py-2.5 rounded-xl transition-all shadow-md shadow-emerald-700/20"
          >
            <ShoppingCart size={16} /> Mua sắm thực phẩm ngay
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map(order => {
            const badge = getStatusBadge(order.status);
            const BadgeIcon = badge.icon;
            const itemsCount = order.items?.reduce((sum, i) => sum + (i.quantity || 1), 0) || 0;
            const canCancel = getStatusGroup(order.status) === "pending";

            return (
              <div 
                key={order.id} 
                className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden hover:border-emerald-500/50 hover:shadow-lg hover:shadow-slate-100 transition-all"
              >
                {/* Order Top Bar */}
                <div className="bg-slate-50/80 px-5 py-3.5 border-b border-slate-200/80 flex flex-wrap justify-between items-center gap-3">
                  <div className="flex items-center gap-3">
                    <div className="bg-white border border-slate-200 p-1.5 rounded-lg shadow-2xl">
                      <Image src="/logos/logo_icon.png" alt="C.T Mart" width={22} height={22} className="object-contain" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-900 text-sm">C.T Mart Official</span>
                        <span className="text-xs bg-slate-200/80 text-slate-700 font-mono font-bold px-2 py-0.5 rounded">
                          #{order.id.slice(0, 8).toUpperCase()}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                        <MapPin size={11} className="text-emerald-700" />
                        <span>{order.assignedWarehouseName || "Kho Hàng Gò Vấp (WH-006)"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${badge.bg}`}>
                    <BadgeIcon size={14} />
                    <span>{badge.label}</span>
                  </div>
                </div>

                {/* Items List Preview */}
                <div className="p-5 divide-y divide-slate-100">
                  {order.items?.map((item, idx) => {
                    const prodInfo = productsMap[item.productId] || (item.sku ? productsMap[item.sku] : null);
                    const imgUrl = prodInfo?.imageUrl || item.imageUrl || "https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&auto=format&fit=crop&q=60";

                    return (
                      <div key={idx} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-xl overflow-hidden shrink-0 flex items-center justify-center p-1">
                            <img 
                              src={imgUrl} 
                              alt={item.productName} 
                              className="w-full h-full object-contain p-1 rounded-lg"
                              onError={(e: any) => {
                                e.currentTarget.src = "https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&auto=format&fit=crop&q=60";
                              }}
                            />
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-bold text-slate-900 text-sm truncate">{item.productName}</h4>
                            <div className="text-xs text-slate-500 mt-1 flex items-center gap-3">
                              <span>Số lượng: <strong className="text-slate-800">x{item.quantity}</strong></span>
                              {item.sku && <span className="font-mono text-slate-400">SKU: {item.sku}</span>}
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="font-extrabold text-slate-900 text-sm">
                            {formatPrice(item.price)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Order Bottom Card */}
                <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/50 flex flex-wrap justify-between items-center gap-4">
                  <div className="text-xs text-slate-500 flex items-center gap-2">
                    <Calendar size={13} className="text-slate-400" />
                    <span>Đặt lúc: {formatDate(order.createdAt)}</span>
                    <span className="text-slate-300">•</span>
                    <span>{itemsCount} sản phẩm</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-4">
                    <div className="text-right">
                      <span className="text-xs text-slate-500 mr-2">Tổng thanh toán:</span>
                      <strong className="text-emerald-800 font-black text-lg">
                        {formatPrice(order.totalAmount)}
                      </strong>
                    </div>

                    <div className="flex items-center gap-2">
                      {canCancel && (
                        <button
                          onClick={() => handleCancelOrder(order.id)}
                          className="px-3.5 py-2 border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold rounded-xl transition-all cursor-pointer"
                        >
                          Hủy đơn
                        </button>
                      )}

                      <button
                        onClick={() => handleReorder(order)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-slate-300 hover:border-emerald-600 text-slate-700 hover:text-emerald-700 text-xs font-bold rounded-xl transition-all cursor-pointer bg-white shadow-sm"
                      >
                        <RotateCcw size={13} /> Mua lại
                      </button>

                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="inline-flex items-center gap-1 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-extrabold rounded-xl transition-all shadow-md shadow-emerald-700/20 cursor-pointer"
                      >
                        Chi tiết & Hành trình <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* DETAIL & 5-STEP TRACKING TIMELINE MODAL */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-emerald-800 to-teal-900 text-white p-6 rounded-t-3xl flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-white/20 text-white font-bold px-2.5 py-0.5 rounded-full">
                    Mã đơn: #{selectedOrder.id.slice(0, 10).toUpperCase()}
                  </span>
                  <span className="text-xs text-emerald-200">
                    {formatDate(selectedOrder.createdAt)}
                  </span>
                </div>
                <h3 className="text-xl font-black mt-2 flex items-center gap-2">
                  <span>🏢</span> Hành Trình & Chi Tiết Đơn Hàng
                </h3>
                <p className="text-xs text-emerald-100/80 mt-0.5">
                  Đang xử lý tại: <strong>{selectedOrder.assignedWarehouseName || "Kho Gò Vấp (WH-006)"}</strong>
                </p>
              </div>

              <button
                onClick={() => setSelectedOrder(null)}
                className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-full transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">

              {/* LIVE GPS DRIVER TRACKING INTERACTIVE MAP (ONLY WHEN IN TRANSIT / DELIVERING) */}
              {getStatusGroup(selectedOrder.status) === "delivering" && (
                <CustomerLiveTrackingMap order={selectedOrder} />
              )}

              {/* COMPLETED POD BANNER & DELIVERY RECEIPT (WHEN COMPLETED) */}
              {getStatusGroup(selectedOrder.status) === "completed" && (
                <div className="bg-gradient-to-br from-emerald-900/90 via-slate-900 to-slate-950 text-white p-5 rounded-2xl border border-emerald-500/30 shadow-xl space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-emerald-500/20">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center font-bold text-lg">
                        ✓
                      </div>
                      <div>
                        <h4 className="text-base font-extrabold text-emerald-300">
                          Giao Hàng Thành Công!
                        </h4>
                        <p className="text-xs text-slate-300">
                          Kiện hàng đã được bàn giao an toàn và kiểm tra độ tươi đạt chuẩn
                        </p>
                      </div>
                    </div>
                    <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-black rounded-full">
                      ĐÃ HOÀN TẤT POD
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                      <div className="text-slate-400 text-[11px] mb-1">Tài xế bàn giao:</div>
                      <div className="font-bold text-white flex items-center gap-1.5">
                        <span>🛵</span> {selectedOrder.assignedDriverName || "Võ Minh Trí"}
                      </div>
                      <div className="text-slate-400 text-[10px] font-mono mt-0.5">
                        {selectedOrder.assignedDriverPlate || "59-V1 888.99"}
                      </div>
                    </div>

                    <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                      <div className="text-slate-400 text-[11px] mb-1">Nhiệt độ thùng lạnh:</div>
                      <div className="font-extrabold text-emerald-400 flex items-center gap-1">
                        <span>❄️</span> 3.2°C (Chuẩn rau củ/thịt tươi)
                      </div>
                      <div className="text-slate-400 text-[10px] mt-0.5">
                        Cảm biến IoT kiểm định
                      </div>
                    </div>

                    <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                      <div className="text-slate-400 text-[11px] mb-1">Thời gian hoàn tất:</div>
                      <div className="font-bold text-white flex items-center gap-1">
                        <span>🕒</span> {formatDate(selectedOrder.updatedAt || selectedOrder.createdAt)}
                      </div>
                      <div className="text-emerald-400 text-[10px] font-semibold mt-0.5">
                        ✓ Đúng hẹn hỏa tốc
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2.5 pt-2">
                    <button
                      onClick={() => alert("Cảm ơn bạn đã đánh giá 5 sao cho dịch vụ giao hàng!")}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-md"
                    >
                      ⭐ Đánh Giá Shipper 5 Sao
                    </button>
                  </div>
                </div>
              )}

              {/* 5-STEP VISUAL TIMELINE */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80">
                <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Truck size={14} className="text-emerald-700" /> Trạng thái vận đơn thực tế
                </h4>

                <div className="relative">
                  {/* Step Progress Line */}
                  <div className="space-y-4 relative before:absolute before:left-3.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
                    {/* Step 1 */}
                    <div className="flex items-start gap-3 relative z-10">
                      <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 text-xs font-bold shadow-md shadow-emerald-600/30">
                        ✓
                      </div>
                      <div>
                        <div className="text-xs font-extrabold text-slate-900">1. Đặt hàng thành công</div>
                        <div className="text-[11px] text-slate-500">Đơn hàng đã được ghi nhận trên hệ thống C.T Mart</div>
                      </div>
                    </div>

                    {/* Step 2 */}
                    <div className="flex items-start gap-3 relative z-10">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold shadow-sm ${
                        ["processing", "delivering", "completed"].includes(getStatusGroup(selectedOrder.status))
                          ? "bg-emerald-600 text-white shadow-emerald-600/30"
                          : "bg-slate-200 text-slate-500"
                      }`}>
                        {["processing", "delivering", "completed"].includes(getStatusGroup(selectedOrder.status)) ? "✓" : "2"}
                      </div>
                      <div>
                        <div className="text-xs font-extrabold text-slate-900">2. Kho tiếp nhận & Soạn hàng (FEFO)</div>
                        <div className="text-[11px] text-slate-500">
                          {selectedOrder.assignedWarehouseName || "Kho Hàng Gò Vấp"} đang kiểm duyệt date và đóng thùng
                        </div>
                      </div>
                    </div>

                    {/* Step 3 */}
                    <div className="flex items-start gap-3 relative z-10">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold shadow-sm ${
                        ["delivering", "completed"].includes(getStatusGroup(selectedOrder.status))
                          ? "bg-emerald-600 text-white shadow-emerald-600/30"
                          : "bg-slate-200 text-slate-500"
                      }`}>
                        {["delivering", "completed"].includes(getStatusGroup(selectedOrder.status)) ? "✓" : "3"}
                      </div>
                      <div>
                        <div className="text-xs font-extrabold text-slate-900">3. Xuất kho & Bàn giao tài xế</div>
                        <div className="text-[11px] text-slate-500">Đơn hàng đã rời kho và được bàn giao cho đối tác vận chuyển</div>
                      </div>
                    </div>

                    {/* Step 4 */}
                    <div className="flex items-start gap-3 relative z-10">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold shadow-sm ${
                        ["delivering", "completed"].includes(getStatusGroup(selectedOrder.status))
                          ? "bg-blue-600 text-white animate-pulse"
                          : "bg-slate-200 text-slate-500"
                      }`}>
                        {getStatusGroup(selectedOrder.status) === "completed" ? "✓" : "4"}
                      </div>
                      <div>
                        <div className="text-xs font-extrabold text-slate-900">4. Đang trên đường giao đến bạn</div>
                        <div className="text-[11px] text-slate-500">Tài xế đang vận chuyển bằng xe chuyên dụng giữ lạnh</div>
                      </div>
                    </div>

                    {/* Step 5 */}
                    <div className="flex items-start gap-3 relative z-10">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold shadow-sm ${
                        getStatusGroup(selectedOrder.status) === "completed"
                          ? "bg-emerald-600 text-white shadow-emerald-600/30"
                          : "bg-slate-200 text-slate-500"
                      }`}>
                        {getStatusGroup(selectedOrder.status) === "completed" ? "✓" : "5"}
                      </div>
                      <div>
                        <div className="text-xs font-extrabold text-slate-900">5. Giao hàng thành công</div>
                        <div className="text-[11px] text-slate-500">Khách hàng đã nhận hàng và hoàn tất thanh toán</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Delivery & Receiver Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                  <div className="text-xs font-bold text-slate-500 flex items-center gap-1.5 mb-2">
                    <User size={14} className="text-emerald-700" /> Thông tin người nhận
                  </div>
                  <div className="font-extrabold text-sm text-slate-900">{selectedOrder.customerName || "Khách hàng C.T Mart"}</div>
                  <div className="text-xs text-slate-600 flex items-center gap-1.5 mt-1 font-mono">
                    <Phone size={12} className="text-slate-400" />
                    <span>{selectedOrder.customerPhone || "Chưa cập nhật"}</span>
                  </div>
                  <div className="text-xs text-slate-600 flex items-start gap-1.5 mt-2">
                    <MapPin size={13} className="text-emerald-700 shrink-0 mt-0.5" />
                    <span>{selectedOrder.customerAddress || "Địa chỉ nhận hàng tại TP.HCM"}</span>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                  <div className="text-xs font-bold text-slate-500 flex items-center gap-1.5 mb-2">
                    <CreditCard size={14} className="text-emerald-700" /> Thanh toán & Giao hàng
                  </div>
                  <div className="text-xs text-slate-700 space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Phương thức:</span>
                      <strong className="text-slate-800 uppercase font-mono">{selectedOrder.paymentMethod === 'cod' ? 'Thanh toán khi nhận (COD)' : selectedOrder.paymentMethod || 'COD'}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Hình thức giao:</span>
                      <strong className="text-slate-800">Giao hàng tận nơi siêu tốc</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Kho xuất phát:</span>
                      <strong className="text-emerald-700">{selectedOrder.assignedWarehouseName || "Kho Gò Vấp (WH-006)"}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Items Table in Modal */}
              <div>
                <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-3">
                  Danh sách sản phẩm trong đơn ({selectedOrder.items?.length || 0})
                </h4>
                <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100">
                  {selectedOrder.items?.map((it, idx) => {
                    const prodInfo = productsMap[it.productId] || (it.sku ? productsMap[it.sku] : null);
                    const imgUrl = prodInfo?.imageUrl || it.imageUrl || "https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&auto=format&fit=crop&q=60";

                    return (
                      <div key={idx} className="p-3.5 flex items-center justify-between gap-4 bg-white">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-lg overflow-hidden shrink-0 flex items-center justify-center p-1">
                            <img src={imgUrl} alt={it.productName} className="w-full h-full object-contain p-1" onError={(e: any) => { e.currentTarget.src = "https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&auto=format&fit=crop&q=60"; }} />
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-xs text-slate-900 truncate">{it.productName}</div>
                            <div className="text-[11px] text-slate-500 mt-0.5">Số lượng: x{it.quantity}</div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="font-bold text-xs text-slate-900">{formatPrice(it.price)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Order Cost Breakdown */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Tạm tính tiền hàng:</span>
                  <span className="font-bold text-slate-800">{formatPrice(selectedOrder.totalAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Phí vận chuyển giao hàng:</span>
                  <span className="font-bold text-slate-800">{formatPrice(selectedOrder.shippingFee || 15000)}</span>
                </div>
                {selectedOrder.discount && Number(selectedOrder.discount) > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Giảm giá khuyến mãi:</span>
                    <span className="font-bold">-{formatPrice(selectedOrder.discount)}</span>
                  </div>
                )}
                <div className="border-t border-slate-200 pt-2.5 flex justify-between items-center text-sm">
                  <strong className="text-slate-900">Tổng cộng thanh toán:</strong>
                  <strong className="text-emerald-800 text-base font-black">
                    {formatPrice(selectedOrder.totalAmount)}
                  </strong>
                </div>
              </div>

              {/* Modal Footer Actions */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  onClick={() => {
                    handleReorder(selectedOrder);
                    setSelectedOrder(null);
                  }}
                  className="px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-extrabold transition-all shadow-md shadow-emerald-700/20 flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw size={14} /> Mua lại đơn này
                </button>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
