import axios from 'axios';
import { create } from 'zustand';
import api from '../lib/api';
import type { PackageDetails, Product as BackendProduct, ProductsResponse } from '../types/product';

export type ProductInput = {
  name: string;
  price: number;
  category: string;
  material: string;
  color: string;
  image: string;
  images: string[];
  description?: string;
  keyFeatures: string[];
  whyLoveIt?: string;
  dimensions?: string;
  shippingReturns?: string;
  moreInformation?: string;
  packageDetails: PackageDetails;
  stockQuantity: number;
  lowStockThreshold: number;
  isActive: boolean;
};

export interface ProductStoreItem {
  id: number;
  mongoId: string;
  name: string;
  price: number;
  category: string;
  material: string;
  color: string;
  image: string;
  images: string[];
  description?: string;
  keyFeatures: string[];
  whyLoveIt?: string;
  dimensions?: string;
  shippingReturns?: string;
  moreInformation?: string;
  packageDetails: PackageDetails;
  stockQuantity: number;
  lowStockThreshold: number;
  isActive: boolean;
}

type UploadResponse = {
  success: boolean;
  key: string;
  uploadUrl: string;
  fields: Record<string, string>;
  url: string;
};

type ProductResponse = {
  success: boolean;
  product: BackendProduct;
};

interface ProductStore {
  products: ProductStoreItem[];
  isLoading: boolean;
  isUploading: boolean;
  error: string;
  fetchProducts: () => Promise<void>;
  uploadProductImage: (file: File) => Promise<string>;
  addProduct: (product: ProductInput) => Promise<void>;
  updateProduct: (id: number, product: ProductInput) => Promise<void>;
  deleteProduct: (id: number) => Promise<void>;
  resetProducts: () => void;
}

const mapBackendProduct = (product: BackendProduct): ProductStoreItem => ({
  id: product.legacyId,
  mongoId: product._id,
  name: product.name,
  price: product.price,
  category: product.category,
  material: product.material,
  color: product.color,
  image: product.image,
  images: product.images.map((image) => image.url),
  description: product.description,
  keyFeatures: product.keyFeatures ?? [],
  whyLoveIt: product.whyLoveIt,
  dimensions: product.dimensions,
  shippingReturns: product.shippingReturns,
  moreInformation: product.moreInformation,
  packageDetails: product.packageDetails ?? {
    lengthCm: 20,
    breadthCm: 15,
    heightCm: 8,
    weightKg: 0.5,
  },
  stockQuantity: product.stock,
  lowStockThreshold: product.lowStockThreshold ?? 3,
  isActive: product.isActive,
});

const toProductPayload = (product: ProductInput) => ({
  name: product.name,
  price: product.price,
  category: product.category,
  material: product.material,
  color: product.color,
  images: product.images.length > 0 ? product.images : [product.image].filter(Boolean),
  description: product.description ?? '',
  keyFeatures: product.keyFeatures,
  whyLoveIt: product.whyLoveIt ?? '',
  dimensions: product.dimensions ?? '',
  shippingReturns: product.shippingReturns ?? '',
  moreInformation: product.moreInformation ?? '',
  packageDetails: product.packageDetails,
  stock: product.stockQuantity,
  lowStockThreshold: product.lowStockThreshold,
  isActive: product.isActive,
});

const getErrorMessage = (error: unknown, fallback: string) => (
  axios.isAxiosError(error)
    ? error.response?.data?.message || error.message
    : fallback
);

export const useProductStore = create<ProductStore>((set) => ({
  products: [],
  isLoading: false,
  isUploading: false,
  error: '',
  fetchProducts: async () => {
    try {
      set({ isLoading: true, error: '' });
      const response = await api.get<ProductsResponse>('/api/products/admin');
      set({
        products: response.data.products.map(mapBackendProduct),
        isLoading: false,
      });
    } catch (error) {
      set({
        error: getErrorMessage(error, 'Failed to load products.'),
        isLoading: false,
      });
    }
  },
  uploadProductImage: async (file) => {
    try {
      set({ isUploading: true, error: '' });
      const response = await api.post<UploadResponse>('/api/products/image-upload', {
        contentType: file.type,
        size: file.size,
      });

      const formData = new FormData();
      Object.entries(response.data.fields).forEach(([key, value]) => {
        formData.append(key, String(value));
      });
      formData.append('file', file);

      const uploadResponse = await fetch(response.data.uploadUrl, {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        const s3Error = await uploadResponse.text();
        console.error('S3 image upload error:', s3Error);
        throw new Error(s3Error || 'Image upload failed.');
      }

      set({ isUploading: false });
      return response.data.url;
    } catch (error) {
      const message = getErrorMessage(error, 'Failed to upload product image.');
      set({ error: message, isUploading: false });
      throw new Error(message);
    }
  },
  addProduct: async (product) => {
    try {
      set({ error: '' });
      const response = await api.post<ProductResponse>('/api/products/admin', toProductPayload(product));
      const createdProduct = mapBackendProduct(response.data.product);
      set((state) => ({
        products: [createdProduct, ...state.products],
      }));
    } catch (error) {
      const message = getErrorMessage(error, 'Failed to create product.');
      set({ error: message });
      throw new Error(message);
    }
  },
  updateProduct: async (id, product) => {
    try {
      set({ error: '' });
      const response = await api.patch<ProductResponse>(`/api/products/admin/${id}`, toProductPayload(product));
      const updatedProduct = mapBackendProduct(response.data.product);
      set((state) => ({
        products: state.products.map((item) => (item.id === id ? updatedProduct : item)),
      }));
    } catch (error) {
      const message = getErrorMessage(error, 'Failed to update product.');
      set({ error: message });
      throw new Error(message);
    }
  },
  deleteProduct: async (id) => {
    try {
      set({ error: '' });
      await api.delete(`/api/products/admin/${id}`);
      set((state) => ({
        products: state.products.filter((item) => item.id !== id),
      }));
    } catch (error) {
      const message = getErrorMessage(error, 'Failed to delete product.');
      set({ error: message });
      throw new Error(message);
    }
  },
  resetProducts: () => set({ products: [] }),
}));
