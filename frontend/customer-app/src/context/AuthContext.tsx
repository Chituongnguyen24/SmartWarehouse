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
  user: UserProfile;
  addresses: Address[];
  selectedAddress: Address;
  setSelectedAddress: (addr: Address) => void;
  addAddress: (addr: Address) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user] = useState<UserProfile>({
    id: 'usr_1001',
    name: 'Nguyễn Văn Tường',
    phone: '0908 123 456',
    email: 'tuong.nguyen@freshkeep.vn',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&q=80',
    memberTier: 'VÀNG',
    points: 1250,
  });

  const [addresses, setAddresses] = useState<Address[]>(MOCK_ADDRESSES);
  const [selectedAddress, setSelectedAddress] = useState<Address>(
    MOCK_ADDRESSES.find(a => a.isDefault) || MOCK_ADDRESSES[0]
  );

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
