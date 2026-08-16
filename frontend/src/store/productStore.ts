import { create } from 'zustand';
import { products as seedProducts, type Product } from '../data';

type ProductInput = Omit<Product, 'id'> & {
  images?: string[];
  stockQuantity?: number;
  lowStockThreshold?: number;
  isActive?: boolean;
};

export interface ProductStoreItem extends Product {
  images: string[];
  stockQuantity: number;
  lowStockThreshold: number;
  isActive: boolean;
}

interface ProductStore {
  products: ProductStoreItem[];
  addProduct: (product: ProductInput) => void;
  updateProduct: (id: number, product: ProductInput) => void;
  deleteProduct: (id: number) => void;
  resetProducts: () => void;
}

const buildSeedProducts = (): ProductStoreItem[] =>
  seedProducts.map((product) => ({
    ...product,
    images: [product.image],
    stockQuantity: 12,
    lowStockThreshold: 3,
    isActive: true,
  }));

const normalizeProduct = (product: ProductInput): Omit<ProductStoreItem, 'id'> => {
  const images = product.images?.filter(Boolean) ?? [];
  const image = product.image || images[0] || '';

  return {
    ...product,
    image,
    images: images.length > 0 ? images : image ? [image] : [],
    stockQuantity: Math.max(0, Number(product.stockQuantity ?? 0)),
    lowStockThreshold: Math.max(0, Number(product.lowStockThreshold ?? 3)),
    isActive: product.isActive ?? true,
  };
};

export const useProductStore = create<ProductStore>((set) => ({
  products: buildSeedProducts(),
  addProduct: (product) =>
    set((state) => ({
      products: [
        {
          id: state.products.reduce((maxId, item) => Math.max(maxId, item.id), 0) + 1,
          ...normalizeProduct(product),
        },
        ...state.products,
      ],
    })),
  updateProduct: (id, product) =>
    set((state) => ({
      products: state.products.map((item) =>
        item.id === id
          ? {
              id,
              ...normalizeProduct(product),
            }
          : item,
      ),
    })),
  deleteProduct: (id) =>
    set((state) => ({
      products: state.products.filter((item) => item.id !== id),
    })),
  resetProducts: () => set({ products: buildSeedProducts() }),
}));
