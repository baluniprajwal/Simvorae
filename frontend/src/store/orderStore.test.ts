import axios from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiMock = vi.hoisted(() => ({
  get: vi.fn(),
  patch: vi.fn(),
  post: vi.fn(),
}));

vi.mock('../lib/api', () => ({ default: apiMock }));

import { useOrderStore } from './orderStore';

const backendOrder = {
  orderNumber: 'SIM-1001',
  customer: { name: 'Prajwal', email: 'customer@example.com', phone: '9876543210' },
  shippingAddress: {
    addressLine1: '1 Test Street', city: 'Noida', state: 'Uttar Pradesh', postalCode: '201318', country: 'India',
  },
  items: [{
    product: 'product-1', quantity: 2,
    productSnapshot: { name: 'The Drape Tote', image: '/bag.jpg', unitPrice: 15000 },
  }],
  totals: { subtotal: 30000, shipping: 0, total: 30000 },
  orderStatus: 'confirmed' as const,
  payment: { status: 'paid' as const, razorpayOrderId: 'order_1', razorpayPaymentId: 'pay_1' },
  shipping: { status: 'not_created' as const },
  createdAt: '2026-09-20T10:00:00.000Z',
};

describe('order store', () => {
  beforeEach(() => {
    apiMock.get.mockReset();
    apiMock.patch.mockReset();
    apiMock.post.mockReset();
    useOrderStore.setState({ orders: [], isLoading: false, error: '' });
  });

  it('maps backend orders into the admin/customer display model', async () => {
    apiMock.get.mockResolvedValue({ data: { orders: [backendOrder] } });
    await useOrderStore.getState().fetchOrders();

    const order = useOrderStore.getState().orders[0];
    expect(order.id).toBe('SIM-1001');
    expect(order.status).toBe('Confirmed');
    expect(order.customer.address).toBe('1 Test Street, Noida, Uttar Pradesh, 201318, India');
    expect(order.items[0]).toMatchObject({ id: 'product-1', quantity: 2, price: 15000 });
    expect(useOrderStore.getState().isLoading).toBe(false);
  });

  it('optimistically marks an order packed and applies the server response', async () => {
    apiMock.get.mockResolvedValue({ data: { orders: [backendOrder] } });
    await useOrderStore.getState().fetchOrders();
    apiMock.patch.mockResolvedValue({
      data: { order: { ...backendOrder, orderStatus: 'processing' } },
    });

    const result = await useOrderStore.getState().markPacked('SIM-1001');
    expect(apiMock.patch).toHaveBeenCalledWith('/api/orders/SIM-1001/status', { status: 'processing' });
    expect(result.status).toBe('Packed');
    expect(useOrderStore.getState().orders[0].status).toBe('Packed');
  });

  it('rolls an optimistic status update back when the API rejects it', async () => {
    apiMock.get.mockResolvedValue({ data: { orders: [backendOrder] } });
    await useOrderStore.getState().fetchOrders();
    const error = new axios.AxiosError('Request failed', '400', undefined, undefined, {
      data: { message: 'This order cannot be packed.' }, status: 400, statusText: 'Bad Request', headers: {}, config: {} as never,
    });
    apiMock.patch.mockRejectedValue(error);

    await expect(useOrderStore.getState().markPacked('SIM-1001')).rejects.toThrow('This order cannot be packed.');
    expect(useOrderStore.getState().orders[0].status).toBe('Confirmed');
    expect(useOrderStore.getState().error).toBe('This order cannot be packed.');
  });

  it('replaces existing order details instead of duplicating them', async () => {
    apiMock.get.mockResolvedValueOnce({ data: { orders: [backendOrder] } });
    await useOrderStore.getState().fetchMyOrders();
    apiMock.get.mockResolvedValueOnce({ data: { order: { ...backendOrder, orderStatus: 'shipped' } } });
    await useOrderStore.getState().fetchMyOrder('SIM-1001');

    expect(useOrderStore.getState().orders).toHaveLength(1);
    expect(useOrderStore.getState().orders[0].status).toBe('Shipped');
  });
});
