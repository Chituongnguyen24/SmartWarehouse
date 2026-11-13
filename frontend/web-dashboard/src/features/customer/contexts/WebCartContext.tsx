import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  originalPrice: number;
  unit: string;
  imageUrl: string;
  rating: number;
  soldCount: number;
  isFlashSale: boolean;
  discountPercent: number;
  origin: string;
  preservation: string;
  description: string;
  stock: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
  selected: boolean;
}

export interface CustomerAddress {
  id: string;
  name: string;
  phone: string;
  address: string;
  isDefault: boolean;
}

interface WebCartContextType {
  cartItems: CartItem[];
  addToCart: (product: Product, qty?: number) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, delta: number) => void;
  toggleSelect: (productId: string) => void;
  toggleSelectAll: (selected: boolean) => void;
  clearCart: () => void;
  totalItemsCount: number;
  subtotalAmount: number;

  // Address management
  addresses: CustomerAddress[];
  selectedAddress: CustomerAddress | null;
  setSelectedAddress: (address: CustomerAddress) => void;
  addAddress: (newAddr: Omit<CustomerAddress, 'id'>) => void;
}

const WebCartContext = createContext<WebCartContextType | undefined>(undefined);

export const WebCartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('web-cart');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('web-cart', JSON.stringify(cartItems));
  }, [cartItems]);

  const addToCart = (product: Product, qty = 1) => {
    setCartItems(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + qty }
            : item
        );
      }
      return [...prev, { product, quantity: qty, selected: true }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCartItems(prev => prev.filter(item => item.product.id !== productId));
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCartItems(prev =>
      prev
        .map(item => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const toggleSelect = (productId: string) => {
    setCartItems(prev =>
      prev.map(item =>
        item.product.id === productId ? { ...item, selected: !item.selected } : item
      )
    );
  };

  const toggleSelectAll = (selected: boolean) => {
    setCartItems(prev => prev.map(item => ({ ...item, selected })));
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const totalItemsCount = useMemo(() => {
    return cartItems.reduce((acc, item) => acc + item.quantity, 0);
  }, [cartItems]);

  const subtotalAmount = useMemo(() => {
    return cartItems
      .filter(item => item.selected)
      .reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  }, [cartItems]);

  const DEFAULT_ADDRESSES: CustomerAddress[] = [
    {
      id: 'addr-1',
      name: 'Khách hàng Test',
      phone: '0909 888 999',
      address: '227 Nguyễn Văn Cừ, Phường 4, Quận 5, TP. Hồ Chí Minh',
      isDefault: true,
    },
    {
      id: 'addr-2',
      name: 'Khách hàng Test (Văn phòng)',
      phone: '0909 888 999',
      address: '135 Nam Kỳ Khởi Nghĩa, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh',
      isDefault: false,
    }
  ];

  const [addresses, setAddresses] = useState<CustomerAddress[]>(() => {
    const saved = localStorage.getItem('web-addresses');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return DEFAULT_ADDRESSES; }
    }
    return DEFAULT_ADDRESSES;
  });

  const [selectedAddress, setSelectedAddress] = useState<CustomerAddress | null>(() => {
    return addresses.find(a => a.isDefault) || addresses[0] || null;
  });

  useEffect(() => {
    localStorage.setItem('web-addresses', JSON.stringify(addresses));
  }, [addresses]);

  const addAddress = (newAddr: Omit<CustomerAddress, 'id'>) => {
    const created: CustomerAddress = {
      ...newAddr,
      id: `addr-${Date.now()}`
    };
    setAddresses(prev => {
      const updated = newAddr.isDefault ? prev.map(a => ({ ...a, isDefault: false })) : [...prev];
      return [...updated, created];
    });
    setSelectedAddress(created);
  };

  return (
    <WebCartContext.Provider
      value={{
        cartItems,
        addToCart,
        removeFromCart,
        updateQuantity,
        toggleSelect,
        toggleSelectAll,
        clearCart,
        totalItemsCount,
        subtotalAmount,
        addresses,
        selectedAddress,
        setSelectedAddress,
        addAddress,
      }}
    >
      {children}
    </WebCartContext.Provider>
  );
};

export const useWebCart = () => {
  const context = useContext(WebCartContext);
  if (!context) {
    throw new Error('useWebCart must be used within a WebCartProvider');
  }
  return context;
};
