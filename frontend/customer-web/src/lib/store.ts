import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  id: string; // unique ID for the cart item (could be productId + variant)
  productId: string;
  sku?: string;
  name: string;
  price: number;
  oldPrice?: number;
  quantity: number;
  image: string;
  variant?: string | null;
}

interface CartState {
  items: CartItem[];
  addToCart: (item: Omit<CartItem, 'id'>) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  
  // Computed (these can be calculated on the fly in components, but we define types here)
  // We can't persist computed values easily with Zustand persist, so it's better to compute them in components.
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      
      addToCart: (newItem) => set((state) => {
        // Generate a unique ID based on product ID and variant
        const cartItemId = newItem.variant ? `${newItem.productId}-${newItem.variant}` : newItem.productId;
        
        // Check if item already exists in cart
        const existingItemIndex = state.items.findIndex(item => item.id === cartItemId);
        
        if (existingItemIndex >= 0) {
          // If exists, just increase quantity
          const updatedItems = [...state.items];
          updatedItems[existingItemIndex].quantity += newItem.quantity;
          return { items: updatedItems };
        } else {
          // If not exists, add new item
          return { items: [...state.items, { ...newItem, id: cartItemId }] };
        }
      }),
      
      removeFromCart: (id) => set((state) => ({
        items: state.items.filter(item => item.id !== id)
      })),
      
      updateQuantity: (id, quantity) => set((state) => ({
        items: state.items.map(item => 
          item.id === id ? { ...item, quantity: Math.max(1, quantity) } : item
        )
      })),
      
      clearCart: () => set({ items: [] }),
    }),
    {
      name: 'ct-mart-cart-storage', // name of the item in the storage (must be unique)
    }
  )
);

export interface UserProfile {
  id: string;
  name: string;
  phone: string;
  email?: string;
  gender?: string;
  dob?: string;
  addresses?: any[];
  tier: string;
  points: number;
}

interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  token: string | null;
  login: (user: UserProfile, token: string) => void;
  logout: () => void;
  updateUser: (user: Partial<UserProfile>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      token: null,
      login: (user, token) => set({ user, isAuthenticated: true, token }),
      logout: () => set({ user: null, isAuthenticated: false, token: null }),
      updateUser: (updatedFields) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updatedFields } : null,
        })),
    }),
    {
      name: 'auth-storage',
    }
  )
);
