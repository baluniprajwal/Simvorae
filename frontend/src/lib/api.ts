import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
const CUSTOMER_CSRF_STORAGE = 'simvorae_customer_csrf';
const ADMIN_CSRF_STORAGE = 'simvorae_admin_csrf';

window.localStorage.removeItem('simvorae_customer_token');
window.localStorage.removeItem('simvorae_admin_token');
window.localStorage.removeItem('simvorae_customer_user');

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const isAdminPage = window.location.pathname.startsWith('/admin');
  const csrfCookie = isAdminPage ? 'simvorae_admin_csrf' : 'simvorae_customer_csrf';
  const cookieToken = document.cookie
    .split('; ')
    .find((cookie) => cookie.startsWith(`${csrfCookie}=`))
    ?.split('=')
    .slice(1)
    .join('=');
  const csrfToken = cookieToken
    ? decodeURIComponent(cookieToken)
    : window.sessionStorage.getItem(isAdminPage ? ADMIN_CSRF_STORAGE : CUSTOMER_CSRF_STORAGE);

  if (csrfToken && !['get', 'head', 'options'].includes(String(config.method).toLowerCase())) {
    config.headers['X-CSRF-Token'] = csrfToken;
  }

  return config;
});

api.interceptors.response.use(
  (response) => {
    const csrfToken = response.data?.csrfToken;
    const role = response.data?.user?.role;
    if (typeof csrfToken === 'string' && (role === 'admin' || role === 'customer')) {
      window.sessionStorage.setItem(role === 'admin' ? ADMIN_CSRF_STORAGE : CUSTOMER_CSRF_STORAGE, csrfToken);
    }

    return response;
  },
  (error) => {
    if (
      axios.isAxiosError(error) &&
      error.response?.status === 401 &&
      window.location.pathname.startsWith('/admin') &&
      window.location.pathname !== '/admin/login'
    ) {
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
