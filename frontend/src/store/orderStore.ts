import axios from 'axios';
import { create } from 'zustand';
import api from '../lib/api';

export type OrderStatus = 'Pending' | 'Confirmed' | 'Packed' | 'Shipped' | 'Delivered' | 'Cancelled';

export interface CustomerQuery {
  name: string;
  email: string;
  phone: string;
  city: string;
  address: string;
}

export interface OrderItem {
  id: number;
  name: string;
  quantity: number;
  price: number;
  image: string;
}

export interface Order {
  id: string;
  customer: CustomerQuery;
  status: OrderStatus;
  paymentStatus: 'pending' | 'authorized' | 'paid' | 'failed' | 'refunded';
  shippingStatus: 'not_created' | 'created' | 'in_transit' | 'delivered' | 'cancelled' | 'failed';
  razorpayOrderId: string;
  razorpayPaymentId: string;
  shiprocketOrderId: string;
  shipmentId: string;
  awbCode: string;
  courierName: string;
  trackingUrl: string;
  pickupStatus: string;
  currentShippingStatus: string;
  total: number;
  createdAt: string;
  paymentMethod: 'Prepaid' | 'COD';
  items: OrderItem[];
}

interface OrderStore {
  orders: Order[];
  isLoading: boolean;
  error: string;
  fetchOrders: () => Promise<void>;
  markPacked: (id: string) => Promise<Order>;
  cancelOrder: (id: string) => Promise<Order>;
  createShipment: (id: string) => Promise<Order>;
  syncShipment: (id: string) => Promise<Order>;
}

type BackendOrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

type BackendOrder = {
  orderNumber: string;
  customer: {
    name: string;
    email?: string;
    phone: string;
  };
  shippingAddress: {
    addressLine1: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  items: Array<{
    productSnapshot: {
      legacyId: number;
      name: string;
      image: string;
      unitPrice: number;
    };
    quantity: number;
  }>;
  totals: {
    total: number;
  };
  orderStatus: BackendOrderStatus;
  payment: {
    status: Order['paymentStatus'];
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
  };
  shipping: {
    status: Order['shippingStatus'];
    shiprocketOrderId?: string;
    shipmentId?: string;
    awbCode?: string;
    courierName?: string;
    trackingUrl?: string;
    pickupStatus?: string;
    currentStatus?: string;
  };
  createdAt: string;
};

type OrdersResponse = {
  orders: BackendOrder[];
};

type OrderResponse = {
  order: BackendOrder;
};

const toAdminStatus = (status: BackendOrderStatus): OrderStatus => {
  const statusMap: Record<BackendOrderStatus, OrderStatus> = {
    pending: 'Pending',
    confirmed: 'Confirmed',
    processing: 'Packed',
    shipped: 'Shipped',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
  };

  return statusMap[status];
};

const mapBackendOrder = (order: BackendOrder): Order => ({
  id: order.orderNumber,
  customer: {
    name: order.customer.name,
    email: order.customer.email ?? '',
    phone: order.customer.phone,
    city: order.shippingAddress.city,
    address: [
      order.shippingAddress.addressLine1,
      order.shippingAddress.city,
      order.shippingAddress.state,
      order.shippingAddress.postalCode,
      order.shippingAddress.country,
    ]
      .filter(Boolean)
      .join(', '),
  },
  status: toAdminStatus(order.orderStatus),
  paymentStatus: order.payment?.status ?? 'pending',
  shippingStatus: order.shipping?.status ?? 'not_created',
  razorpayOrderId: order.payment?.razorpayOrderId ?? '',
  razorpayPaymentId: order.payment?.razorpayPaymentId ?? '',
  shiprocketOrderId: order.shipping?.shiprocketOrderId ?? '',
  shipmentId: order.shipping?.shipmentId ?? '',
  awbCode: order.shipping?.awbCode ?? '',
  courierName: order.shipping?.courierName ?? '',
  trackingUrl: order.shipping?.trackingUrl ?? '',
  pickupStatus: order.shipping?.pickupStatus ?? '',
  currentShippingStatus: order.shipping?.currentStatus ?? '',
  total: order.totals.total,
  createdAt: order.createdAt,
  paymentMethod: 'Prepaid',
  items: order.items.map((item) => ({
    id: item.productSnapshot.legacyId,
    name: item.productSnapshot.name,
    quantity: item.quantity,
    price: item.productSnapshot.unitPrice,
    image: item.productSnapshot.image,
  })),
});

export const useOrderStore = create<OrderStore>((set) => ({
  orders: [],
  isLoading: false,
  error: '',
  fetchOrders: async () => {
    try {
      set({ isLoading: true, error: '' });
      const response = await api.get<OrdersResponse>('/api/orders');
      set({ orders: response.data.orders.map(mapBackendOrder), isLoading: false });
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.message || error.message
        : 'Failed to load orders.';
      set({ error: message, isLoading: false });
    }
  },
  markPacked: async (id) => {
    let previousStatus: OrderStatus | undefined;

    set((state) => ({
      orders: state.orders.map((order) => {
        if (order.id !== id) {
          return order;
        }

        previousStatus = order.status;
        return { ...order, status: 'Packed' };
      }),
    }));

    try {
      const response = await api.patch<OrderResponse>(`/api/orders/${id}/status`, {
        status: 'processing',
      });

      const updatedOrder = mapBackendOrder(response.data.order);

      set((state) => ({
        orders: state.orders.map((order) => (order.id === id ? updatedOrder : order)),
      }));

      return updatedOrder;
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.message || error.message
        : 'Failed to update order status.';

      set((state) => ({
        error: message,
        orders: state.orders.map((order) => (
          order.id === id ? { ...order, status: previousStatus ?? order.status } : order
        )),
      }));

      throw new Error(message);
    }
  },
  cancelOrder: async (id) => {
    let previousStatus: OrderStatus | undefined;

    set((state) => ({
      orders: state.orders.map((order) => {
        if (order.id !== id) {
          return order;
        }

        previousStatus = order.status;
        return { ...order, status: 'Cancelled' };
      }),
    }));

    try {
      const response = await api.patch<OrderResponse>(`/api/orders/${id}/status`, {
        status: 'cancelled',
      });

      const updatedOrder = mapBackendOrder(response.data.order);

      set((state) => ({
        orders: state.orders.map((order) => (order.id === id ? updatedOrder : order)),
      }));

      return updatedOrder;
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.message || error.message
        : 'Failed to cancel order.';

      set((state) => ({
        error: message,
        orders: state.orders.map((order) => (
          order.id === id ? { ...order, status: previousStatus ?? order.status } : order
        )),
      }));

      throw new Error(message);
    }
  },
  createShipment: async (id) => {
    try {
      set({ error: '' });
      const response = await api.post<OrderResponse>(`/api/orders/${id}/shipment`);

      const updatedOrder = mapBackendOrder(response.data.order);

      set((state) => ({
        orders: state.orders.map((order) => (order.id === id ? updatedOrder : order)),
      }));

      return updatedOrder;
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.message || error.message
        : 'Failed to create shipment.';

      set({ error: message });
      throw new Error(message);
    }
  },
  syncShipment: async (id) => {
    try {
      set({ error: '' });
      const response = await api.post<OrderResponse>(`/api/orders/${id}/shipment/sync`);

      const updatedOrder = mapBackendOrder(response.data.order);

      set((state) => ({
        orders: state.orders.map((order) => (order.id === id ? updatedOrder : order)),
      }));

      return updatedOrder;
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.message || error.message
        : 'Failed to sync shipment.';

      set({ error: message });
      throw new Error(message);
    }
  },
}));
