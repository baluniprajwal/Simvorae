import { User } from '../models/User.js';
import { createHttpError } from '../utils/createHttpError.js';
import { verifyToken } from '../utils/token.js';

export async function protect(req, _res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const [scheme, token] = authHeader.split(' ');

    if (scheme !== 'Bearer' || !token) {
      return next(createHttpError(401, 'Authentication token is required.'));
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
    return next();
  } catch (error) {
    return next(createHttpError(401, 'Invalid or expired authentication token.'));
  }
}

export function requireAdmin(req, _res, next) {
  if (req.user?.role !== 'admin') {
    return next(createHttpError(403, 'Admin access is required.'));
  }

  return next();
}
