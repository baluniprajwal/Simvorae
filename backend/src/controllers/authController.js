import { User } from '../models/User.js';
import { createHttpError } from '../utils/createHttpError.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { signToken } from '../utils/token.js';
import { isValidEmail } from '../utils/validators.js';

function sanitizeUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    addresses: user.addresses,
  };
}

function validateRegisterPayload({ name, email, password }) {
  if (!name?.trim()) {
    return 'Name is required.';
  }

  if (!isValidEmail(email)) {
    return 'A valid email is required.';
  }

  if (!password || password.length < 8) {
    return 'Password must be at least 8 characters.';
  }

  return '';
}

export async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;
    const validationError = validateRegisterPayload({ name, email, password });

    if (validationError) {
      return next(createHttpError(400, validationError));
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return next(createHttpError(409, 'An account already exists with this email.'));
    }

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash: await hashPassword(password),
      source: 'direct',
    });

    const token = signToken({
      userId: user._id.toString(),
      role: user.role,
    });

    return res.status(201).json({
      success: true,
      token,
      user: sanitizeUser(user),
    });
  } catch (error) {
    if (error.code === 11000) {
      return next(createHttpError(409, 'An account already exists with this email.'));
    }

    return next(error);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!isValidEmail(email) || !password) {
      return next(createHttpError(400, 'Email and password are required.'));
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() }).select('+passwordHash');

    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return next(createHttpError(401, 'Invalid email or password.'));
    }

    if (!user.isPortalEnabled) {
      return next(createHttpError(403, 'This account is disabled.'));
    }

    user.lastLoginAt = new Date();
    await user.save();

    const token = signToken({
      userId: user._id.toString(),
      role: user.role,
    });

    return res.status(200).json({
      success: true,
      token,
      user: sanitizeUser(user),
    });
  } catch (error) {
    return next(error);
  }
}

export function getMe(req, res) {
  return res.status(200).json({
    success: true,
    user: sanitizeUser(req.user),
  });
}
