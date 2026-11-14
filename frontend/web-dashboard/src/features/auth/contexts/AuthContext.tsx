import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getApiHost } from '@/shared';

export type UserRole = 'ADMIN' | 'WAREHOUSE_MANAGER' | 'WAREHOUSE_STAFF' | 'SALES_STAFF' | 'DRIVER' | 'CUSTOMER';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  warehouseCode?: string;
  code?: string;
  department?: string;
  shift?: string;
  address?: string;
  gender?: string;
  dob?: string;
  bio?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updateProfile: (data: { name?: string; email?: string; phone?: string; address?: string; bio?: string }) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ROLE_THEME_MAP: Record<UserRole, string> = {
  ADMIN: '',
  WAREHOUSE_MANAGER: 'theme-teal',
  WAREHOUSE_STAFF: 'theme-blue',
  SALES_STAFF: 'theme-amber',
  DRIVER: 'theme-violet',
  CUSTOMER: 'theme-rose',
};

function applyTheme(role: UserRole) {
  // Remove all theme classes
  document.body.classList.remove('theme-blue', 'theme-teal', 'theme-amber', 'theme-violet');
  const themeClass = ROLE_THEME_MAP[role];
  if (themeClass) {
    document.body.classList.add(themeClass);
  }
}

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'Quản trị viên',
  WAREHOUSE_MANAGER: 'Quản lý kho',
  WAREHOUSE_STAFF: 'Nhân viên kho',
  SALES_STAFF: 'Nhân viên bán hàng',
  DRIVER: 'Tài xế',
  CUSTOMER: 'Khách hàng',
};

export const ROLE_COLORS: Record<UserRole, string> = {
  ADMIN: '#10b981',
  WAREHOUSE_MANAGER: '#14b8a6',
  WAREHOUSE_STAFF: '#00b0ff',
  SALES_STAFF: '#f59e0b',
  DRIVER: '#8b5cf6',
  CUSTOMER: '#f43f5e',
};

const API_BASE = getApiHost(3012);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Synchronously initialize auth from localStorage to eliminate 401 race conditions on page load
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const savedUser = localStorage.getItem('auth-user');
      if (savedUser) {
        const parsed = JSON.parse(savedUser) as AuthUser;
        applyTheme(parsed.role);
        return parsed;
      }
    } catch {
      localStorage.removeItem('auth-user');
    }
    return null;
  });

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('auth-token') || null;
  });

  // Keep theme synced if role changes
  useEffect(() => {
    if (user?.role) {
      applyTheme(user.role);
    }
  }, [user?.role]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Đăng nhập thất bại');
    }

    const data = await res.json();
    const authUser: AuthUser = {
      id: data.user.id,
      name: data.user.name,
      email: data.user.email,
      role: data.user.role as UserRole,
      phone: data.user.phone,
      warehouseCode: data.user.warehouseCode,
      code: data.user.code,
      department: data.user.department,
      shift: data.user.shift,
      address: data.user.address,
      gender: data.user.gender,
      dob: data.user.dob,
      bio: data.user.bio,
    };

    setToken(data.access_token);
    setUser(authUser);
    localStorage.setItem('auth-token', data.access_token);
    localStorage.setItem('auth-user', JSON.stringify(authUser));
    applyTheme(authUser.role);
  }, []);

  const refreshProfile = useCallback(async () => {
    const savedToken = localStorage.getItem('auth-token') || token;
    if (!savedToken) return;
    try {
      const res = await fetch(`${API_BASE}/auth/profile`, {
        headers: { Authorization: `Bearer ${savedToken}` },
      });
      if (res.ok) {
        const updatedUser = await res.json();
        const authUser: AuthUser = {
          id: updatedUser.id,
          name: updatedUser.name,
          email: updatedUser.email,
          role: updatedUser.role as UserRole,
          phone: updatedUser.phone,
          warehouseCode: updatedUser.warehouseCode,
          code: updatedUser.code,
          department: updatedUser.department,
          shift: updatedUser.shift,
          address: updatedUser.address,
          gender: updatedUser.gender,
          dob: updatedUser.dob,
          bio: updatedUser.bio,
        };
        setUser(authUser);
        localStorage.setItem('auth-user', JSON.stringify(authUser));
      }
    } catch (e) {}
  }, [token]);

  const updateProfile = useCallback(async (data: { name?: string; email?: string; phone?: string; address?: string; bio?: string }) => {
    const savedToken = localStorage.getItem('auth-token') || token;
    if (!savedToken) {
      throw new Error('Not authenticated');
    }
    const res = await fetch(`${API_BASE}/auth/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${savedToken}`,
      },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Cập nhật thông tin thất bại');
    }

    const updatedUser = await res.json();
    const authUser: AuthUser = {
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role as UserRole,
      phone: updatedUser.phone,
      warehouseCode: updatedUser.warehouseCode,
      code: updatedUser.code,
      department: updatedUser.department,
      shift: updatedUser.shift,
      address: updatedUser.address,
      gender: updatedUser.gender,
      dob: updatedUser.dob,
      bio: updatedUser.bio,
    };

    setUser(authUser);
    localStorage.setItem('auth-user', JSON.stringify(authUser));
  }, [token]);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('auth-token');
    localStorage.removeItem('auth-user');
    localStorage.removeItem('user-role');
    document.body.classList.remove('theme-blue', 'theme-teal', 'theme-amber', 'theme-violet');
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated: !!user, login, logout, updateProfile, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export default AuthContext;
