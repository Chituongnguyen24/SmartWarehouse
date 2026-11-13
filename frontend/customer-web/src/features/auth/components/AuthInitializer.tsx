"use client";

import { useEffect, useRef } from "react";
import { useAuthStore } from "@/lib/store";

export function AuthInitializer({ children }: { children: React.ReactNode }) {
  const { token, login, logout } = useAuthStore();
  const hasVerifiedRef = useRef(false);

  useEffect(() => {
    // Chỉ xác thực token 1 lần duy nhất khi khởi tạo, tránh loop fetch liên tục
    if (!token || hasVerifiedRef.current) return;
    hasVerifiedRef.current = true;

    const verifyToken = async () => {
      try {
        const res = await fetch("http://localhost:3012/auth/me", {
          headers: {
            Authorization: `Bearer ${token}`
          },
          signal: AbortSignal.timeout(3000)
        });

        if (res.ok) {
          const userData = await res.json();
          login({
            id: userData.id,
            name: userData.name,
            phone: userData.phone,
            email: userData.email,
            gender: userData.gender,
            dob: userData.dob,
            addresses: userData.addresses || [],
            tier: userData.tier || 'Thành viên mới',
            points: userData.points || 0
          }, token);
        } else if (res.status === 401) {
          logout();
        }
      } catch (error) {
        // Khi backend offline hoặc lỗi mạng, giữ nguyên phiên offline thay vì spam request
      }
    };

    verifyToken();
  }, [token, login, logout]);

  return <>{children}</>;
}
