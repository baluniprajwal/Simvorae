import { create } from 'zustand';

interface CartItem {
  id: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
}

interface CartStore {
  items: CartItem[];
  isOpen: boolean;
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  toggleCart: () => void;
  clearCart: () => void;
  getCartTotal: () => number;
  getCartCount: () => number;
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  isOpen: false,
  addItem: (item) => set((state) => {
    const existingItem = state.items.find(i => i.id === item.id);
    if (existingItem) {
      return {
        items: state.items.map(i => 
          i.id === item.id ? { ...i, quantity: i.quantity + item.quantity } : i
        ),
        isOpen: true
      };
    }
    return { items: [...state.items, item], isOpen: true };
  }),
  removeItem: (id) => set((state) => ({
    items: state.items.filter(i => i.id !== id)
  })),
  updateQuantity: (id, quantity) => set((state) => {
    if (quantity <= 0) {
      return { items: state.items.filter(i => i.id !== id) };
    }
    return {
      items: state.items.map(i => i.id === id ? { ...i, quantity } : i)
    };
  }),
  toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),
  clearCart: () => set({ items: [] }),
  getCartTotal: () => {
    return get().items.reduce((total, item) => total + (item.price * item.quantity), 0);
  },
  getCartCount: () => {
    return get().items.reduce((count, item) => count + item.quantity, 0);
  }
}));
