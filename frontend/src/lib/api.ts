import axios from 'axios';
import { clearAdminToken, getAdminToken } from './adminAuth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const adminToken = getAdminToken();
  const customerToken = window.localStorage.getItem('simvorae_customer_token');
  const isAdminPage = window.location.pathname.startsWith('/admin') && window.location.pathname !== '/admin/login';
  const token = isAdminPage ? adminToken : customerToken;

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else {
    delete config.headers.Authorization;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      axios.isAxiosError(error) &&
      [401, 403].includes(error.response?.status || 0) &&
      window.location.pathname.startsWith('/admin') &&
      window.location.pathname !== '/admin/login'
    ) {
      clearAdminToken();
      window.location.replace('/admin/login');
    }

    return Promise.reject(error);
  },
);

export function buildApiUrl(path: string) {
  return `${API_BASE_URL}${path}`;
}

export async function fetchJson<T>(path: string): Promise<T> {
  try {
    const response = await api.get<T>(path);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.message || error.message || 'Request failed.');
    }

    if (error instanceof Error) {
      throw error;
    }

    throw new Error('Request failed.');
  }
}

export default api;
