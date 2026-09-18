import { create } from 'zustand';
import api from './api';

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: 'admin';
};

type AdminAuthState = {
  user: AdminUser | null;
  isInitialized: boolean;
  bootstrap: () => Promise<void>;
  setUser: (user: AdminUser) => void;
  logout: () => Promise<void>;
};

export const useAdminAuthStore = create<AdminAuthState>((set, get) => ({
  user: null,
  isInitialized: false,
  bootstrap: async () => {
    if (get().isInitialized) return;
    try {
      const { data } = await api.get<{ user: AdminUser }>('/api/auth/admin/me');
      set({ user: data.user, isInitialized: true });
    } catch {
      set({ user: null, isInitialized: true });
    }
  },
  setUser: (user) => set({ user, isInitialized: true }),
  logout: async () => {
    try {
      await api.post('/api/auth/admin/logout');
    } finally {
      set({ user: null, isInitialized: true });
    }
  },
}));
