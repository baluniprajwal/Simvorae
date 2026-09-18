import { create } from 'zustand';
import api from '../lib/api';

type CustomerAddress = {
  label?: string;
  fullName?: string;
  phone?: string;
  addressLine1: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault?: boolean;
};

type Customer = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'customer' | 'admin';
  addresses?: CustomerAddress[];
  emailVerified: boolean;
};

type AuthResponse = {
  success: boolean;
  user?: Customer;
  message?: string;
};

type AuthState = {
  user: Customer | null;
  isLoading: boolean;
  isInitialized: boolean;
  hydrate: () => Promise<void>;
  login: (payload: { email: string; password: string }) => Promise<AuthResponse>;
  register: (payload: { name: string; email: string; password: string }) => Promise<AuthResponse>;
  verifyEmail: (token: string) => Promise<AuthResponse>;
  refreshMe: () => Promise<Customer | null>;
  updateProfile: (payload: {
    phone: string;
    address: {
      addressLine1: string;
      city: string;
      state: string;
      postalCode: string;
      country?: string;
    };
  }) => Promise<AuthResponse>;
  forgotPassword: (email: string) => Promise<AuthResponse>;
  resetPassword: (payload: { token: string; password: string }) => Promise<AuthResponse>;
  logout: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: false,
  isInitialized: false,

  hydrate: async () => {
    try {
      const { data } = await api.get<AuthResponse>('/api/auth/me');
      set({ user: data.user || null, isInitialized: true });
    } catch {
      set({ user: null, isInitialized: true });
    }
  },

  login: async (payload) => {
    set({ isLoading: true });

    try {
      const { data } = await api.post<AuthResponse>('/api/auth/login', { ...payload, portal: 'customer' });

      if (data.user) {
        set({ user: data.user, isInitialized: true });
      }

      return data;
    } finally {
      set({ isLoading: false });
    }
  },

  register: async (payload) => {
    set({ isLoading: true });

    try {
      const { data } = await api.post<AuthResponse>('/api/auth/register', payload);
      return data;
    } finally {
      set({ isLoading: false });
    }
  },

  verifyEmail: async (token) => {
    set({ isLoading: true });

    try {
      const { data } = await api.get<AuthResponse>(`/api/auth/verify-email?token=${encodeURIComponent(token)}`);
      return data;
    } finally {
      set({ isLoading: false });
    }
  },

  refreshMe: async () => {
    try {
      const { data } = await api.get<AuthResponse>('/api/auth/me');

      if (data.user) {
        set({ user: data.user, isInitialized: true });
        return data.user;
      }

      return null;
    } catch {
      set({ user: null, isInitialized: true });
      return null;
    }
  },

  updateProfile: async (payload) => {
    set({ isLoading: true });

    try {
      const { data } = await api.put<AuthResponse>('/api/auth/me', payload);

      if (data.user) {
        set({ user: data.user });
      }

      return data;
    } finally {
      set({ isLoading: false });
    }
  },

  forgotPassword: async (email) => {
    const { data } = await api.post<AuthResponse>('/api/auth/forgot-password', { email });
    return data;
  },

  resetPassword: async (payload) => {
    const { data } = await api.post<AuthResponse>('/api/auth/reset-password', payload);
    return data;
  },

  logout: async () => {
    try {
      await api.post('/api/auth/logout');
    } finally {
      set({ user: null, isInitialized: true });
    }
  },
}));
