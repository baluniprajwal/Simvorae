import crypto from 'node:crypto';
import { User } from '../models/User.js';
import { createHttpError } from '../utils/createHttpError.js';
import { verifyToken } from '../utils/token.js';
import {
  ADMIN_CSRF_COOKIE,
  ADMIN_SESSION_COOKIE,
  CUSTOMER_CSRF_COOKIE,
  CUSTOMER_SESSION_COOKIE,
  parseCookies,
} from '../utils/authCookies.js';

async function authenticate(req, next, { admin = false } = {}) {
  try {
    const cookies = parseCookies(req);
    const token = cookies[admin ? ADMIN_SESSION_COOKIE : CUSTOMER_SESSION_COOKIE];

    if (!token) {
      return next(createHttpError(401, 'Please sign in to continue.'));
    }

    const payload = verifyToken(token);
    const user = await User.findById(payload.userId);

    if (!user || !user.isPortalEnabled) {
      return next(createHttpError(401, 'User account is not available.'));
    }

    if (user.role === 'customer' && !user.emailVerifiedAt) {
      return next(createHttpError(403, 'Please verify your email before continuing.'));
    }

    req.user = user;
    req.authRole = admin ? 'admin' : 'customer';
    return next();
  } catch (error) {
    return next(createHttpError(401, 'Invalid or expired authentication token.'));
  }
}

export async function protect(req, _res, next) {
  return authenticate(req, next);
}

export async function protectAdmin(req, _res, next) {
  return authenticate(req, next, { admin: true });
}

export function verifyCsrf(req, _res, next) {
  const cookies = parseCookies(req);
  const cookieName = req.authRole === 'admin' ? ADMIN_CSRF_COOKIE : CUSTOMER_CSRF_COOKIE;
  const cookieToken = cookies[cookieName];
  const headerToken = req.headers['x-csrf-token'];

  if (!cookieToken || typeof headerToken !== 'string') {
    return next(createHttpError(403, 'Your session security check failed. Please refresh and try again.'));
  }

  const expected = Buffer.from(cookieToken);
  const received = Buffer.from(headerToken);
  if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) {
    return next(createHttpError(403, 'Your session security check failed. Please refresh and try again.'));
  }

  return next();
}

export function requireAdmin(req, _res, next) {
  if (req.user?.role !== 'admin') {
    return next(createHttpError(403, 'Admin access is required.'));
  }

  return next();
}
