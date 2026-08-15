"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { User, MapPin, ShoppingBag, ShieldCheck, LogOut } from "lucide-react";
import { useAuthStore } from "@/lib/store";
import { useEffect } from "react";

const SIDEBAR_LINKS = [
  { href: "/tai-khoan", label: "Hồ sơ của tôi", icon: User },
  { href: "/tai-khoan/don-hang", label: "Đơn hàng của tôi", icon: ShoppingBag },
  { href: "#", label: "Chính sách bảo mật", icon: ShieldCheck },
];

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();

  useEffect(() => {
    // If not authenticated, kick them back to login page
    // Note: in a real app, this might be handled via middleware
    if (!isAuthenticated) {
      router.push("/dang-nhap");
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) return null; // Avoid flashing content before redirect

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="container mx-auto px-4">
        
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link href="/" className="hover:text-primary">Trang chủ</Link>
          <span>/</span>
          <span className="text-gray-900 font-medium">Tài khoản của tôi</span>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar */}
          <div className="w-full lg:w-1/4 shrink-0">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-14 h-14 bg-green-50 text-primary rounded-full flex items-center justify-center border border-green-100 shrink-0">
                  <User size={28} />
                </div>
                <div>
                  <div className="text-sm text-gray-500">Tài khoản của</div>
                  <div className="font-bold text-lg text-gray-800">{user?.name || "Khách hàng"}</div>
                </div>
              </div>

              <div className="space-y-2">
                {SIDEBAR_LINKS.map((link) => {
                  const isActive = pathname === link.href;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors font-medium ${
                        isActive 
                          ? "bg-primary/10 text-primary" 
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      }`}
                    >
                      <link.icon size={20} className={isActive ? "text-primary" : "text-gray-400"} />
                      {link.label}
                    </Link>
                  );
                })}

                <button 
                  onClick={() => {
                    logout();
                    router.push("/");
                  }}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl transition-colors font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 w-full text-left mt-4"
                >
                  <LogOut size={20} className="text-gray-400 group-hover:text-red-600" />
                  Đăng xuất
                </button>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 h-full min-h-[500px]">
              {children}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
