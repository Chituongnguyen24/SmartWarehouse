import React, { createContext, useContext, useState, useEffect } from 'react';
import { StaffUser } from '@/types';
import { setAuthToken } from '@/shared';

import { getBackendHost, setBackendHost, DEFAULT_LAN_IP, getServiceBaseUrl } from '@/shared';

const getUserApi = () => getServiceBaseUrl(3012);

const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // Exactly 24 hours
const ALLOWED_STAFF_APP_ROLES = ['WAREHOUSE_STAFF'];
const STAFF_ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Quản trị viên',
  WAREHOUSE_MANAGER: 'Quản lý kho',
  WAREHOUSE_STAFF: 'Nhân viên vận hành kho',
  SALES_STAFF: 'Nhân viên kinh doanh',
  DRIVER: 'Tài xế giao nhận',
  CUSTOMER: 'Khách hàng',
};

interface AuthContextType {
  user: StaffUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  isLoading: boolean;
  isWarehouseLocked: boolean;
  login: (emailOrUser: string | any, passwordOrToken?: string, rememberMe?: boolean) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  activeWarehouse: string;
  setActiveWarehouse: (code: string) => void;
  switchWarehouse: (code: string) => void;
  rememberedAccount: string;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isAuthenticated: false,
  isInitializing: true,
  isLoading: true,
  isWarehouseLocked: true,
  login: async () => ({ success: false }),
  logout: () => {},
  activeWarehouse: 'WH-006',
  setActiveWarehouse: () => {},
  switchWarehouse: () => {},
  rememberedAccount: '',
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<StaffUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [activeWarehouse, setActiveWarehouse] = useState<string>('WH-006');
  const [rememberedAccount, setRememberedAccount] = useState<string>(() => {
    try {
      return localStorage.getItem('sfwms_staff_remembered_account') || '';
    } catch (e) {
      return '';
    }
  });

  // Load saved session on initial app mount with 24-hour expiration check
  useEffect(() => {
    try {
      const savedAcc = localStorage.getItem('sfwms_staff_remembered_account');
      if (savedAcc) setRememberedAccount(savedAcc);

      const savedUserStr = localStorage.getItem('sfwms_staff_user');
      const savedToken = localStorage.getItem('sfwms_staff_token');
      const expiresAtStr = localStorage.getItem('sfwms_staff_expires_at');

      if (savedUserStr && savedToken && savedToken !== 'undefined' && savedToken !== 'null') {
        const expiresAt = expiresAtStr ? Number(expiresAtStr) : 0;
        const isExpired = expiresAt > 0 && Date.now() > expiresAt;

        if (isExpired) {
          console.warn('Staff session expired (24h limit reached). Logging out.');
          logout();
        } else {
          const parsedUser: StaffUser = JSON.parse(savedUserStr);
          const savedRole = String(parsedUser?.role || '').toUpperCase();
          if (!ALLOWED_STAFF_APP_ROLES.includes(savedRole)) {
            console.warn(`Invalid role "${savedRole}" in Staff App session. Logging out.`);
            logout();
          } else {
            setUser(parsedUser);
            setToken(savedToken);
            setActiveWarehouse(parsedUser.warehouseCode || 'WH-006');
            setAuthToken(savedToken);
          }
        }
      } else {
        setUser(null);
        setToken(null);
        setAuthToken(null);
      }
    } catch (e) {
      console.warn('Failed to load saved staff session:', e);
      setUser(null);
      setToken(null);
      setAuthToken(null);
    } finally {
      setIsInitializing(false);
    }
  }, []);

  const login = async (
    emailOrUser: string | any,
    passwordOrToken?: string,
    rememberMe: boolean = true
  ): Promise<{ success: boolean; message?: string }> => {
    try {
      const warehouseNames: Record<string, string> = {
        'WH-006': 'Kho Hàng Gò Vấp (WH-006)',
        'WH-001': 'Kho Hàng Quận 12 (WH-001)',
        'WH-002': 'Kho Hàng Thủ Đức (WH-002)',
        'WH-003': 'Kho Hàng Bình Chánh (WH-003)',
        'WH-004': 'Kho Hàng Quận 7 (WH-004)',
        'WH-005': 'Kho Hàng Bình Thạnh (WH-005)',
        'WH-007': 'Kho Hàng Quận 1 (WH-007)',
        'WH-008': 'Kho Hàng Quận 5 (WH-008)',
      };

      // Case A: Direct user object passed (e.g. login(user, token))
      if (typeof emailOrUser === 'object' && emailOrUser !== null) {
        const apiUser = emailOrUser;
        const directRole = String(apiUser.role || '').toUpperCase();
        if (!ALLOWED_STAFF_APP_ROLES.includes(directRole)) {
          const roleLabel = STAFF_ROLE_LABELS[directRole] || directRole || 'Khác';
          return {
            success: false,
            message: `Tài khoản thuộc vai trò "${roleLabel}" không được phép đăng nhập vào Ứng dụng Nhân viên kho. Vui lòng sử dụng tài khoản Nhân viên vận hành kho!`,
          };
        }
        const authToken = passwordOrToken || apiUser.token || apiUser.access_token;
        if (!authToken) {
          return { success: false, message: 'Không tìm thấy phiên xác thực hợp lệ!' };
        }
        const staffUser: StaffUser = {
          id: apiUser.id || 'usr-staff',
          code: apiUser.code || (apiUser.warehouseCode ? `NV-${apiUser.warehouseCode.replace('WH-', '')}01` : 'NV-01'),
          name: apiUser.name || 'Nhân viên trực kho',
          email: apiUser.email || 'staff@sfwms.vn',
          role: 'WAREHOUSE_STAFF',
          warehouseCode: apiUser.warehouseCode || 'WH-006',
          warehouseName: warehouseNames[apiUser.warehouseCode || 'WH-006'] || `Kho ${apiUser.warehouseCode || 'WH-006'}`,
          shift: apiUser.shift || 'CA_SANG',
          assignedZone: apiUser.assignedZone || 'Toàn bộ kho',
          status: apiUser.status || 'ACTIVE',
        };

        const expiresAt = Date.now() + SESSION_DURATION_MS;
        setUser(staffUser);
        setToken(authToken);
        setActiveWarehouse(staffUser.warehouseCode);
        setAuthToken(authToken);

        if (typeof window !== 'undefined' && window.localStorage) {
          localStorage.setItem('sfwms_staff_user', JSON.stringify(staffUser));
          localStorage.setItem('sfwms_staff_token', authToken);
          localStorage.setItem('sfwms_staff_expires_at', String(expiresAt));
        }
        return { success: true };
      }

      // Case B: Account/Email and password strings
      const accountInput = String(emailOrUser || '').trim();
      const cleanDigits = accountInput.replace(/\D/g, '');
      const isPhoneLike = !accountInput.includes('@') && cleanDigits.length >= 9 && /^[+\d\s.()-]+$/.test(accountInput);
      const normalizedAccount = isPhoneLike ? cleanDigits : accountInput;
      const password = String(passwordOrToken || '').trim();

      let res: Response;
      const primaryUrl = `${getServiceBaseUrl(3012)}/auth/login`;

      try {
        res = await fetch(primaryUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: normalizedAccount,
            phone: isPhoneLike ? cleanDigits : undefined,
            account: accountInput,
            password,
            clientApp: 'STAFF_APP',
          }),
        });
      } catch (primaryErr: any) {
        console.error('Login network error:', primaryUrl, primaryErr);
        return {
          success: false,
          message: `Không thể kết nối đến máy chủ xác thực (${primaryUrl}). Vui lòng kiểm tra kết nối mạng và thử lại!`,
        };
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        if (res.status === 401) {
          return {
            success: false,
            message: err.message || 'Tài khoản hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại!',
          };
        }
        if (res.status === 403) {
          return {
            success: false,
            message: err.message || 'Tài khoản không có quyền truy cập Ứng dụng Nhân viên kho!',
          };
        }
        return {
          success: false,
          message: err.message || 'Đăng nhập không thành công. Vui lòng kiểm tra lại thông tin!',
        };
      }

      const data = await res.json();
      const authToken = data.access_token || data.accessToken || data.token;
      const apiUser = data.user || {};

      if (!authToken) {
        return { success: false, message: 'Máy chủ không trả về JWT Token hợp lệ!' };
      }

      const statusUpper = String(apiUser.status || 'ACTIVE').toUpperCase();
      if (statusUpper === 'INACTIVE' || statusUpper === 'LOCKED' || apiUser.lockedAt) {
        return {
          success: false,
          message: 'Tài khoản nhân viên này đã bị khóa hoặc tạm ngừng hoạt động. Vui lòng liên hệ Quản lý kho!',
        };
      }

      const apiRole = String(apiUser.role || '').toUpperCase();
      if (!ALLOWED_STAFF_APP_ROLES.includes(apiRole)) {
        const roleLabel = STAFF_ROLE_LABELS[apiRole] || apiRole || 'Khác';
        return {
          success: false,
          message: `Tài khoản thuộc vai trò "${roleLabel}" không được phép đăng nhập vào Ứng dụng Nhân viên kho (C.T Mart Staff). Vui lòng sử dụng tài khoản Nhân viên vận hành kho!`,
        };
      }

      // Only remember valid staff accounts after role verification succeeds
      if (typeof window !== 'undefined' && window.localStorage) {
        if (rememberMe) {
          localStorage.setItem('sfwms_staff_remembered_account', accountInput);
          setRememberedAccount(accountInput);
        } else {
          localStorage.removeItem('sfwms_staff_remembered_account');
          setRememberedAccount('');
        }
      }

      const staffUser: StaffUser = {
        id: apiUser.id || 'usr-staff',
        code: apiUser.code || (apiUser.warehouseCode ? `NV-${apiUser.warehouseCode.replace('WH-', '')}01` : 'NV-01'),
        name: apiUser.name || 'Nhân viên trực kho',
        email: apiUser.email || accountInput,
        role: apiUser.role || 'WAREHOUSE_STAFF',
        warehouseCode: apiUser.warehouseCode || 'WH-006',
        warehouseName: warehouseNames[apiUser.warehouseCode || 'WH-006'] || `Kho ${apiUser.warehouseCode || 'WH-006'}`,
        shift: apiUser.shift || 'CA_SANG',
        assignedZone: apiUser.assignedZone || 'Toàn bộ kho',
        status: apiUser.status || 'ACTIVE',
      };

      const expiresAt = Date.now() + SESSION_DURATION_MS;

      setUser(staffUser);
      setToken(authToken);
      setActiveWarehouse(staffUser.warehouseCode);
      setAuthToken(authToken);

      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('sfwms_staff_user', JSON.stringify(staffUser));
        localStorage.setItem('sfwms_staff_token', authToken);
        localStorage.setItem('sfwms_staff_expires_at', String(expiresAt));
      }

      return { success: true };
    } catch (err: any) {
      console.error('Login network error:', err);
      return {
        success: false,
        message: 'Không thể kết nối đến máy chủ xác thực (Port 3012). Vui lòng kiểm tra lại mạng!',
      };
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setAuthToken(null);
    localStorage.removeItem('sfwms_staff_user');
    localStorage.removeItem('sfwms_staff_token');
    localStorage.removeItem('sfwms_staff_expires_at');
  };

  // Enforce warehouse scope: Staff can only access the warehouse assigned to their account
  const isWarehouseLocked = user?.role !== 'SUPER_ADMIN';

  const switchWarehouse = (code: string) => {
    if (isWarehouseLocked && user?.warehouseCode) {
      setActiveWarehouse(user.warehouseCode);
      return;
    }
    setActiveWarehouse(code || 'WH-006');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isInitializing,
        isLoading: isInitializing,
        isWarehouseLocked,
        login,
        logout,
        activeWarehouse,
        setActiveWarehouse,
        switchWarehouse,
        rememberedAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

