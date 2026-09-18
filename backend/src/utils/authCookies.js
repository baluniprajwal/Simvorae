import crypto from 'node:crypto';

export const CUSTOMER_SESSION_COOKIE = 'simvorae_customer_session';
export const ADMIN_SESSION_COOKIE = 'simvorae_admin_session';
export const CUSTOMER_CSRF_COOKIE = 'simvorae_customer_csrf';
export const ADMIN_CSRF_COOKIE = 'simvorae_admin_csrf';

function cookieOptions(maxAge, httpOnly) {
  return {
    httpOnly,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: httpOnly ? '/api' : '/',
    maxAge: maxAge * 1000,
  };
}

export function parseCookies(req) {
  return String(req.headers.cookie || '')
    .split(';')
    .reduce((cookies, item) => {
      const separator = item.indexOf('=');
      if (separator === -1) return cookies;
      const name = item.slice(0, separator).trim();
      const value = item.slice(separator + 1).trim();
      if (name) {
        try {
          cookies[name] = decodeURIComponent(value);
        } catch {
          cookies[name] = value;
        }
      }
      return cookies;
    }, {});
}

export function setAuthCookies(res, { role, token, expiresIn }) {
  const isAdmin = role === 'admin';
  const sessionName = isAdmin ? ADMIN_SESSION_COOKIE : CUSTOMER_SESSION_COOKIE;
  const csrfName = isAdmin ? ADMIN_CSRF_COOKIE : CUSTOMER_CSRF_COOKIE;
  const csrfToken = crypto.randomBytes(32).toString('hex');

  res.cookie(sessionName, token, cookieOptions(expiresIn, true));
  res.cookie(csrfName, csrfToken, cookieOptions(expiresIn, false));
}

export function clearAuthCookies(res, role) {
  const isAdmin = role === 'admin';
  const sessionName = isAdmin ? ADMIN_SESSION_COOKIE : CUSTOMER_SESSION_COOKIE;
  const csrfName = isAdmin ? ADMIN_CSRF_COOKIE : CUSTOMER_CSRF_COOKIE;
  const sessionOptions = cookieOptions(0, true);
  const csrfOptions = cookieOptions(0, false);

  delete sessionOptions.maxAge;
  delete csrfOptions.maxAge;
  res.clearCookie(sessionName, sessionOptions);
  res.clearCookie(csrfName, csrfOptions);
}
