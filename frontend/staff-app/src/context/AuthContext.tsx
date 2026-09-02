import React, { createContext, useContext, useState } from 'react';
import { StaffUser } from '../types';
import { setAuthToken } from '../services/api';

interface AuthContextType {
  user: StaffUser | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: StaffUser, token: string) => void;
  logout: () => void;
  activeWarehouse: string;
  setActiveWarehouse: (code: string) => void;
  switchWarehouse: (code: string) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isAuthenticated: false,
  login: () => {},
  logout: () => {},
  activeWarehouse: 'WH-006',
  setActiveWarehouse: () => {},
  switchWarehouse: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<StaffUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [activeWarehouse, setActiveWarehouse] = useState<string>('WH-006');

  const login = (userData: StaffUser, authToken: string) => {
    setUser(userData);
    setToken(authToken);
    setActiveWarehouse(userData.warehouseCode || 'WH-006');
    setAuthToken(authToken);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setAuthToken(null);
  };

  const switchWarehouse = (code: string) => {
    setActiveWarehouse(code);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user && !!token,
        login,
        logout,
        activeWarehouse,
        setActiveWarehouse,
        switchWarehouse,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
