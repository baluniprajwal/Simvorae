import { AxiosError, AxiosHeaders } from 'axios';
import { describe, expect, it } from 'vitest';
import { getLoginErrorMessage, getPostLoginPath } from './authFlow';

function httpError(status: number, message: string) {
  return new AxiosError(message, String(status), undefined, undefined, {
    status, statusText: '', headers: {}, config: { headers: new AxiosHeaders() }, data: { message },
  });
}

describe('login error messages', () => {
  it('tells unverified, disabled and rate-limited customers what is actually wrong', () => {
    expect(getLoginErrorMessage(httpError(403, 'Please verify your email before logging in.')))
      .toBe('Please verify your email before logging in.');
    expect(getLoginErrorMessage(httpError(429, 'Too many sign-in attempts. Please wait 15 minutes and try again.')))
      .toMatch(/wait 15 minutes/);
  });

  it('keeps wrong passwords generic and handles network and server failures', () => {
    expect(getLoginErrorMessage(httpError(401, 'Invalid email or password.'))).toMatch(/Invalid credentials/);
    expect(getLoginErrorMessage(new AxiosError('Network Error'))).toMatch(/check your connection/);
    expect(getLoginErrorMessage(httpError(500, 'Something went wrong.'))).toMatch(/Could not sign in/);
  });
});

describe('post-login redirect', () => {
  it('returns to the protected page that sent the customer to sign in', () => {
    expect(getPostLoginPath({ from: { pathname: '/account/orders/SIM-1', search: '?tab=items' } }))
      .toBe('/account/orders/SIM-1?tab=items');
  });

  it('never redirects off-site or back to the login page', () => {
    expect(getPostLoginPath({ from: { pathname: '//evil.example.com' } })).toBe('/');
    expect(getPostLoginPath({ from: { pathname: 'https://evil.example.com' } })).toBe('/');
    expect(getPostLoginPath({ from: { pathname: '/login' } })).toBe('/');
    expect(getPostLoginPath(null)).toBe('/');
  });
});
