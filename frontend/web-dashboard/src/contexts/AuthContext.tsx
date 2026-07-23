import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type UserRole = 'ADMIN' | 'WAREHOUSE_MANAGER' | 'WAREHOUSE_STAFF' | 'SALES_STAFF' | 'DRIVER' | 'CUSTOMER';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
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

const API_BASE = 'http://localhost:3012';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // Restore session from localStorage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('auth-token');
    const savedUser = localStorage.getItem('auth-user');
    if (savedToken && savedUser) {
      try {
        const parsed = JSON.parse(savedUser) as AuthUser;
        setToken(savedToken);
        setUser(parsed);
        applyTheme(parsed.role);
      } catch {
        localStorage.removeItem('auth-token');
        localStorage.removeItem('auth-user');
      }
    }
  }, []);

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
    };

    setToken(data.access_token);
    setUser(authUser);
    localStorage.setItem('auth-token', data.access_token);
    localStorage.setItem('auth-user', JSON.stringify(authUser));
    applyTheme(authUser.role);
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('auth-token');
    localStorage.removeItem('auth-user');
    localStorage.removeItem('user-role');
    document.body.classList.remove('theme-blue', 'theme-teal', 'theme-amber', 'theme-violet');
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated: !!user, login, logout }}>
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
