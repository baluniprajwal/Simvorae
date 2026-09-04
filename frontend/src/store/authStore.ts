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
  token?: string;
  user?: Customer;
  message?: string;
};

type AuthState = {
  user: Customer | null;
  token: string;
  isLoading: boolean;
  hydrate: () => void;
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
  logout: () => void;
};

const customerTokenKey = 'simvorae_customer_token';
const customerUserKey = 'simvorae_customer_user';

function storeSession(token: string, user: Customer) {
  window.localStorage.setItem(customerTokenKey, token);
  window.localStorage.setItem(customerUserKey, JSON.stringify(user));
}

function clearSession() {
  window.localStorage.removeItem(customerTokenKey);
  window.localStorage.removeItem(customerUserKey);
}

function getStoredUser() {
  try {
    const rawUser = window.localStorage.getItem(customerUserKey);
    return rawUser ? JSON.parse(rawUser) as Customer : null;
  } catch {
    clearSession();
    return null;
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  user: getStoredUser(),
  token: window.localStorage.getItem(customerTokenKey) || '',
  isLoading: false,

  hydrate: () => {
    set({
      user: getStoredUser(),
      token: window.localStorage.getItem(customerTokenKey) || '',
    });
  },

  login: async (payload) => {
    set({ isLoading: true });

    try {
      const { data } = await api.post<AuthResponse>('/api/auth/login', payload);

      if (data.token && data.user) {
        storeSession(data.token, data.user);
        set({ token: data.token, user: data.user });
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
    const currentToken = window.localStorage.getItem(customerTokenKey);

    if (!currentToken) {
      return null;
    }

    try {
      const { data } = await api.get<AuthResponse>('/api/auth/me');

      if (data.user) {
        window.localStorage.setItem(customerUserKey, JSON.stringify(data.user));
        set({ user: data.user, token: currentToken });
        return data.user;
      }

      return null;
    } catch {
      clearSession();
      set({ token: '', user: null });
      return null;
    }
  },

  updateProfile: async (payload) => {
    set({ isLoading: true });

    try {
      const { data } = await api.put<AuthResponse>('/api/auth/me', payload);

      if (data.user) {
        window.localStorage.setItem(customerUserKey, JSON.stringify(data.user));
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

  logout: () => {
    clearSession();
    set({ token: '', user: null });
  },
}));
