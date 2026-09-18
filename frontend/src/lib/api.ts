import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

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
  const csrfToken = document.cookie
    .split('; ')
    .find((cookie) => cookie.startsWith(`${csrfCookie}=`))
    ?.split('=')
    .slice(1)
    .join('=');

  if (csrfToken && !['get', 'head', 'options'].includes(String(config.method).toLowerCase())) {
    config.headers['X-CSRF-Token'] = decodeURIComponent(csrfToken);
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
