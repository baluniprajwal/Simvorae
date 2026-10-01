import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AxiosError, AxiosHeaders } from 'axios';

const apiMock = vi.hoisted(() => ({
  get: vi.fn(),
  patch: vi.fn(),
  post: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('../lib/api', () => ({ default: apiMock }));

import { type ProductInput, useProductStore } from './productStore';

const input: ProductInput = {
  name: 'The Drape Tote',
  price: 25000,
  category: 'Tote',
  material: 'Calfskin',
  color: 'Black',
  image: '/a.jpg',
  images: ['/a.jpg'],
  keyFeatures: [],
  packageDetails: { lengthCm: 30, breadthCm: 20, heightCm: 10, weightKg: 1 },
  stockQuantity: 5,
  lowStockThreshold: 3,
  isActive: true,
};

const backendProduct = {
  _id: 'p1', name: 'The Drape Tote', slug: 'the-drape-tote', price: 25000, category: 'Tote',
  material: 'Calfskin', color: 'Black', image: '/a.jpg', images: [{ url: '/a.jpg', alt: '', isPrimary: true, order: 0 }],
  keyFeatures: [], packageDetails: input.packageDetails, featured: false, stock: 5, lowStockThreshold: 3, isActive: true,
};

describe('admin product store', () => {
  beforeEach(() => {
    Object.values(apiMock).forEach((mock) => mock.mockReset());
    useProductStore.setState({ products: [], isUploading: false, uploadsInFlight: 0, error: '' });
  });

  it('sends the stock the form was opened with so the server can detect checkout changes', async () => {
    apiMock.patch.mockResolvedValue({ data: { product: backendProduct } });
    apiMock.get.mockResolvedValue({ data: { categories: [], total: 1 } });

    await useProductStore.getState().updateProduct('p1', input, 4);

    expect(apiMock.patch).toHaveBeenCalledWith('/api/products/admin/p1', expect.objectContaining({ stock: 5, stockBaseline: 4 }));
  });

  it('reloads the catalog after a stock conflict so reopening shows current stock', async () => {
    const conflict = new AxiosError('conflict', '409', undefined, undefined, {
      status: 409, statusText: 'Conflict', headers: {}, config: { headers: new AxiosHeaders() },
      data: { message: 'Stock changed while you were editing (now 3).' },
    });
    apiMock.patch.mockRejectedValue(conflict);
    apiMock.get.mockImplementation((url: string) => Promise.resolve(
      url.includes('category-stats') ? { data: { categories: [], total: 1 } } : { data: { products: [{ ...backendProduct, stock: 3 }] } },
    ));

    await expect(useProductStore.getState().updateProduct('p1', input, 5)).rejects.toThrow(/now 3/);
    await vi.waitFor(() => expect(useProductStore.getState().products[0]?.stockQuantity).toBe(3));
  });

  it('stays in the uploading state until every parallel image upload has finished', async () => {
    const finishers: Array<() => void> = [];
    apiMock.post.mockResolvedValue({ data: { uploadUrl: 'https://s3.example.com', fields: {}, url: '/img.jpg' } });
    vi.stubGlobal('fetch', vi.fn(() => new Promise((resolve) => {
      finishers.push(() => resolve({ ok: true, text: async () => '' }));
    })));
    const file = new File(['x'], 'a.jpg', { type: 'image/jpeg' });

    const first = useProductStore.getState().uploadProductImage(file);
    const second = useProductStore.getState().uploadProductImage(file);
    await vi.waitFor(() => expect(finishers).toHaveLength(2));

    finishers[0]();
    await first;
    expect(useProductStore.getState().isUploading).toBe(true);

    finishers[1]();
    await second;
    expect(useProductStore.getState().isUploading).toBe(false);
  });
});
