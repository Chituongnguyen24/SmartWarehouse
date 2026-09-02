import React, { createContext, useContext, useState } from 'react';
import { Address } from '../types/cart';
import { MOCK_ADDRESSES } from '../data/mockData';

export interface UserProfile {
  id: string;
  name: string;
  phone: string;
  email: string;
  avatar: string;
  memberTier: 'VÀNG' | 'BẠC' | 'KIM CƯƠNG';
  points: number;
}

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, pass: string) => Promise<boolean>;
  logout: () => void;
  addresses: Address[];
  selectedAddress: Address;
  setSelectedAddress: (addr: Address) => void;
  addAddress: (addr: Address) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEFAULT_CUSTOMER: UserProfile = {
  id: 'usr_1001',
  name: 'Khách Hàng Test',
  phone: '0908 123 456',
  email: 'customer@sfwms.vn',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&q=80',
  memberTier: 'VÀNG',
  points: 1250,
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(DEFAULT_CUSTOMER);
  const [token, setToken] = useState<string | null>('customer-jwt-token');
  const [addresses, setAddresses] = useState<Address[]>(MOCK_ADDRESSES);
  const [selectedAddress, setSelectedAddress] = useState<Address>(
    MOCK_ADDRESSES.find(a => a.isDefault) || MOCK_ADDRESSES[0]
  );

  const login = async (email: string, pass: string): Promise<boolean> => {
    try {
      const res = await fetch('http://localhost:3012/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass }),
      });

      if (res.ok) {
        const data = await res.json();
        const u = data.user;
        setUser({
          id: u.id || 'cust-01',
          name: u.name || 'Khách Hàng CityMart',
          email: u.email || email,
          phone: u.phone || '0908 123 456',
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&q=80',
          memberTier: 'VÀNG',
          points: 1250,
        });
        setToken(data.access_token);
        return true;
      }
    } catch (e) {
      console.warn('[Customer Auth] User Service offline, using local fallback:', e);
    }

    if (email === 'customer@sfwms.vn' || email.includes('@')) {
      setUser(DEFAULT_CUSTOMER);
      setToken('mock-jwt-customer');
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    setToken(null);
  };

  const addAddress = (newAddr: Address) => {
    setAddresses(prev => [newAddr, ...prev]);
    if (newAddr.isDefault) {
      setSelectedAddress(newAddr);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        login,
        logout,
        addresses,
        selectedAddress,
        setSelectedAddress,
        addAddress,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
