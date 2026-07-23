import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { Product } from '../types/product';
import { CartItem, DeliverySlot, Voucher, Order, Address, PaymentMethod } from '../types/cart';
import { MOCK_DELIVERY_SLOTS } from '../data/mockData';
import { fetchProductsApi, createOrderApi, fetchOrdersApi } from '../services/api';

interface CartContextType {
  products: Product[];
  isLoadingProducts: boolean;
  cartItems: CartItem[];
  addToCart: (product: Product, qty?: number) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, delta: number) => void;
  toggleSelect: (productId: string) => void;
  toggleSelectAll: (selected: boolean) => void;
  selectedVoucher: Voucher | null;
  applyVoucher: (voucher: Voucher | null) => void;
  selectedSlot: DeliverySlot;
  setDeliverySlot: (slot: DeliverySlot) => void;
  totalItemsCount: number;
  subtotalAmount: number;
  discountAmount: number;
  shippingFee: number;
  finalAmount: number;
  ordersList: Order[];
  refreshOrders: () => Promise<void>;
  placeOrder: (paymentMethod: PaymentMethod, address: Address) => Promise<Order>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);

  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  const [selectedVoucher, setSelectedVoucher] = useState<Voucher | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<DeliverySlot>(MOCK_DELIVERY_SLOTS[0]);
  const [ordersList, setOrdersList] = useState<Order[]>([]);

  // Load Real Data on Mount
  useEffect(() => {
    async function loadInitialData() {
      setIsLoadingProducts(true);
      const realProds = await fetchProductsApi();
      setProducts(realProds);
      setIsLoadingProducts(false);

      const realOrders = await fetchOrdersApi();
      if (realOrders.length > 0) {
        setOrdersList(realOrders);
      }
    }
    loadInitialData();
  }, []);

  const refreshOrders = async () => {
    const realOrders = await fetchOrdersApi();
    if (realOrders.length > 0) {
      setOrdersList(realOrders);
    }
  };

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

  const applyVoucher = (voucher: Voucher | null) => {
    setSelectedVoucher(voucher);
  };

  const totalItemsCount = useMemo(() => {
    return cartItems.reduce((acc, item) => acc + item.quantity, 0);
  }, [cartItems]);

  const subtotalAmount = useMemo(() => {
    return cartItems
      .filter(item => item.selected)
      .reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  }, [cartItems]);

  const discountAmount = useMemo(() => {
    if (!selectedVoucher) return 0;
    if (subtotalAmount >= selectedVoucher.minOrderValue) {
      return selectedVoucher.discountAmount;
    }
    return 0;
  }, [selectedVoucher, subtotalAmount]);

  const shippingFee = useMemo(() => {
    if (subtotalAmount === 0) return 0;
    if (subtotalAmount >= 299000) return 0;
    return selectedSlot.fee;
  }, [subtotalAmount, selectedSlot]);

  const finalAmount = useMemo(() => {
    const total = subtotalAmount - discountAmount + shippingFee;
    return total > 0 ? total : 0;
  }, [subtotalAmount, discountAmount, shippingFee]);

  const placeOrder = async (paymentMethod: PaymentMethod, address: Address): Promise<Order> => {
    const selectedItems = cartItems.filter(item => item.selected);

    // Call Real Outbound Service API
    const newOrder = await createOrderApi({
      items: selectedItems,
      subtotalAmount,
      discountAmount,
      shippingFee,
      finalAmount,
      deliverySlot: selectedSlot,
      address,
      paymentMethod,
    });

    setOrdersList(prev => [newOrder, ...prev]);
    // Clear selected items from cart
    setCartItems(prev => prev.filter(item => !item.selected));
    setSelectedVoucher(null);
    return newOrder;
  };

  return (
    <CartContext.Provider
      value={{
        products,
        isLoadingProducts,
        cartItems,
        addToCart,
        removeFromCart,
        updateQuantity,
        toggleSelect,
        toggleSelectAll,
        selectedVoucher,
        applyVoucher,
        selectedSlot,
        setDeliverySlot: setSelectedSlot,
        totalItemsCount,
        subtotalAmount,
        discountAmount,
        shippingFee,
        finalAmount,
        ordersList,
        refreshOrders,
        placeOrder,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
