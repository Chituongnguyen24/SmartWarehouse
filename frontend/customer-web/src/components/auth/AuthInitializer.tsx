"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/lib/store";

export function AuthInitializer({ children }: { children: React.ReactNode }) {
  const { token, login, logout } = useAuthStore();

  useEffect(() => {
    // If we have a token, verify it with the backend on initial load
    const verifyToken = async () => {
      if (!token) return;
      
      try {
        const res = await fetch("http://localhost:3012/auth/me", {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (res.ok) {
          const userData = await res.json();
          // Silently refresh user data
          login({
            id: userData.id,
            name: userData.name,
            phone: userData.phone,
            tier: userData.tier || 'Thành viên mới',
            points: userData.points || 0
          }, token);
        } else {
          // Token invalid or expired
          logout();
        }
      } catch (error) {
        console.error("Failed to verify session", error);
      }
    };

    verifyToken();
  }, [token, login, logout]);

  return <>{children}</>;
}
