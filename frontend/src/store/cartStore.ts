import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export const CART_STORAGE_KEY = 'simvorae_cart';

interface CartItem {
  id: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  stockQuantity?: number;
}

export interface CatalogProduct {
  _id: string;
  name: string;
  price: number;
  image: string;
  stock: number;
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
  syncWithCatalog: (products: CatalogProduct[]) => string[];
}

export const useCartStore = create<CartStore>()(persist((set, get) => ({
  items: [],
  isOpen: false,
  addItem: (item) => set((state) => {
    const existingItem = state.items.find(i => i.id === item.id);
    if (existingItem) {
      const stockQuantity = item.stockQuantity ?? existingItem.stockQuantity;
      const nextQuantity = stockQuantity ? Math.min(existingItem.quantity + item.quantity, stockQuantity) : existingItem.quantity + item.quantity;

      return {
        items: state.items.map(i =>
          i.id === item.id ? { ...i, quantity: nextQuantity, stockQuantity } : i
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
      items: state.items.map(i => {
        if (i.id !== id) {
          return i;
        }

        return { ...i, quantity: i.stockQuantity ? Math.min(quantity, i.stockQuantity) : quantity };
      })
    };
  }),
  toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),
  clearCart: () => set({ items: [] }),
  getCartTotal: () => {
    return get().items.reduce((total, item) => total + (item.price * item.quantity), 0);
  },
  getCartCount: () => {
    return get().items.reduce((count, item) => count + item.quantity, 0);
  },
  // A saved bag can be days old. Bring prices, stock and availability in line with the live
  // catalog so the bag and checkout show what Razorpay will actually charge.
  // Returns a customer-facing note for every change worth mentioning.
  syncWithCatalog: (products) => {
    const productsById = new Map(products.map((product) => [product._id, product]));
    const notes: string[] = [];
    const nextItems: CartItem[] = [];

    for (const item of get().items) {
      const product = productsById.get(item.id);

      if (!product) {
        notes.push(`${item.name} is no longer available and was removed from your bag.`);
        continue;
      }

      if (product.stock <= 0) {
        notes.push(`${product.name} has sold out and was removed from your bag.`);
        continue;
      }

      const quantity = Math.min(item.quantity, product.stock);

      if (quantity < item.quantity) {
        notes.push(`Only ${product.stock} of ${product.name} available; your bag was updated.`);
      }

      if (product.price !== item.price) {
        notes.push(`The price of ${product.name} has changed.`);
      }

      nextItems.push({
        ...item,
        name: product.name,
        price: product.price,
        image: product.image || item.image,
        quantity,
        stockQuantity: product.stock,
      });
    }

    set({ items: nextItems });
    return notes;
  }
}), {
  // Keep the bag across refreshes, new tabs (e.g. the email-verification link) and return visits.
  // Only items are saved so the drawer does not reopen on page load.
  name: CART_STORAGE_KEY,
  storage: createJSONStorage(() => localStorage),
  partialize: (state) => ({ items: state.items }),
}));
