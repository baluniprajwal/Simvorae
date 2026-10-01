import axios from 'axios';

// Turns a failed sign-in into a message the customer can act on. The server's own messages for
// unverified emails, disabled accounts, admin accounts and rate limits are written for customers.
export function getLoginErrorMessage(error: unknown) {
  if (!axios.isAxiosError(error)) {
    return 'Could not sign in right now. Please try again.';
  }

  const status = error.response?.status;
  const serverMessage = error.response?.data?.message;

  if (status === 401) {
    return 'Invalid credentials. Please check your email and password.';
  }

  if ((status === 400 || status === 403 || status === 429) && typeof serverMessage === 'string' && serverMessage) {
    return serverMessage;
  }

  if (!error.response) {
    return 'Could not reach Simvorae. Please check your connection and try again.';
  }

  return 'Could not sign in right now. Please try again.';
}

// Where to go after signing in: back to the page that asked for it, but only within this site.
export function getPostLoginPath(state: unknown, fallback = '/') {
  const from = (state as { from?: { pathname?: unknown; search?: unknown } } | null)?.from;
  const pathname = typeof from?.pathname === 'string' ? from.pathname : '';
  const search = typeof from?.search === 'string' ? from.search : '';

  if (!pathname.startsWith('/') || pathname.startsWith('//') || pathname.startsWith('/login')) {
    return fallback;
  }

  return `${pathname}${search}`;
}
