import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  document.cookie = 'simvorae_customer_csrf=; Max-Age=0; path=/';
  document.cookie = 'simvorae_admin_csrf=; Max-Age=0; path=/';
});
