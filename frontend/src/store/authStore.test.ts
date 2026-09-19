import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiMock = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
}));

vi.mock('../lib/api', () => ({ default: apiMock }));

import { useAuthStore } from './authStore';
import { useAdminAuthStore } from '../lib/adminAuth';

const customer = {
  id: 'customer-1',
  name: 'Prajwal',
  email: 'customer@example.com',
  role: 'customer' as const,
  emailVerified: true,
};

const admin = {
  id: 'admin-1',
  name: 'Admin User',
  email: 'admin@simvorae.com',
  role: 'admin' as const,
};

describe('authentication stores', () => {
  beforeEach(() => {
    apiMock.get.mockReset();
    apiMock.post.mockReset();
    apiMock.put.mockReset();
    useAuthStore.setState({ user: null, isLoading: false, isInitialized: false });
    useAdminAuthStore.setState({ user: null, isInitialized: false });
  });

  it('hydrates an existing customer session', async () => {
    apiMock.get.mockResolvedValue({ data: { success: true, user: customer } });
    await useAuthStore.getState().hydrate();
    expect(apiMock.get).toHaveBeenCalledWith('/api/auth/me');
    expect(useAuthStore.getState().user).toEqual(customer);
    expect(useAuthStore.getState().isInitialized).toBe(true);
  });

  it('finishes hydration as signed out when the session request fails', async () => {
    apiMock.get.mockRejectedValue(new Error('Unauthorized'));
    await useAuthStore.getState().hydrate();
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().isInitialized).toBe(true);
  });

  it('logs customers in through the customer portal and always resets loading', async () => {
    apiMock.post.mockResolvedValue({ data: { success: true, user: customer } });
    await expect(useAuthStore.getState().login({ email: customer.email, password: 'password123' }))
      .resolves.toEqual({ success: true, user: customer });
    expect(apiMock.post).toHaveBeenCalledWith('/api/auth/login', {
      email: customer.email,
      password: 'password123',
      portal: 'customer',
    });
    expect(useAuthStore.getState().user).toEqual(customer);
    expect(useAuthStore.getState().isLoading).toBe(false);
  });

  it('clears customer state even when logout API fails', async () => {
    useAuthStore.setState({ user: customer, isInitialized: true });
    apiMock.post.mockRejectedValue(new Error('Network error'));
    await expect(useAuthStore.getState().logout()).rejects.toThrow('Network error');
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('bootstraps and logs out the isolated admin session', async () => {
    apiMock.get.mockResolvedValue({ data: { user: admin } });
    await useAdminAuthStore.getState().bootstrap();
    expect(apiMock.get).toHaveBeenCalledWith('/api/auth/admin/me');
    expect(useAdminAuthStore.getState().user).toEqual(admin);

    apiMock.post.mockResolvedValue({ data: { success: true } });
    await useAdminAuthStore.getState().logout();
    expect(apiMock.post).toHaveBeenCalledWith('/api/auth/admin/logout');
    expect(useAdminAuthStore.getState().user).toBeNull();
  });
});
