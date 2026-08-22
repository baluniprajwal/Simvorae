import crypto from 'crypto';
import { PendingUser } from '../models/PendingUser.js';
import { User } from '../models/User.js';
import { createHttpError } from '../utils/createHttpError.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { signToken } from '../utils/token.js';
import { isValidEmail, isValidIndianPhone, isValidIndianPostalCode, normalizePhone } from '../utils/validators.js';
import { sendEmailVerification, sendPasswordResetEmail } from '../services/emailService.js';

const verificationTokenExpiresInMs = 1000 * 60 * 60 * 24;
const passwordResetExpiresInMs = 1000 * 60 * 30;

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function createSecureToken(expiresInMs) {
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(token);

  return {
    token,
    tokenHash,
    expiresAt: new Date(Date.now() + expiresInMs),
  };
}

function createVerificationToken() {
  return createSecureToken(verificationTokenExpiresInMs);
}

function createPasswordResetToken() {
  return createSecureToken(passwordResetExpiresInMs);
}

function buildVerificationUrl(token) {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  return `${frontendUrl.replace(/\/$/, '')}/verify-email?token=${encodeURIComponent(token)}`;
}

function buildPasswordResetUrl(token) {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  return `${frontendUrl.replace(/\/$/, '')}/reset-password?token=${encodeURIComponent(token)}`;
}

function sanitizeUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    addresses: user.addresses,
    emailVerified: Boolean(user.emailVerifiedAt),
  };
}

function buildDefaultAddress({ user, address, phone }) {
  return {
    label: 'Default',
    fullName: user.name,
    phone,
    addressLine1: address.addressLine1.trim(),
    city: address.city.trim(),
    state: address.state.trim(),
    postalCode: address.postalCode.trim(),
    country: address.country?.trim() || 'India',
    isDefault: true,
  };
}

function validateDefaultAddressPayload({ phone, address }) {
  const normalizedPhone = normalizePhone(phone);

  if (!isValidIndianPhone(normalizedPhone)) {
    return { error: 'A valid 10-digit Indian phone number is required.' };
  }

  const requiredFields = ['addressLine1', 'city', 'state', 'postalCode'];

  for (const field of requiredFields) {
    if (!address?.[field]?.trim()) {
      return { error: `${field} is required.` };
    }
  }

  if (!isValidIndianPostalCode(address.postalCode)) {
    return { error: 'A valid 6-digit PIN code is required.' };
  }

  return { normalizedPhone };
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

    const verification = createVerificationToken();
    const passwordHash = await hashPassword(password);
    const pendingUser = await PendingUser.findOneAndUpdate(
      { email: normalizedEmail },
      {
        name: name.trim(),
        email: normalizedEmail,
        passwordHash,
        verificationTokenHash: verification.tokenHash,
        expiresAt: verification.expiresAt,
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      },
    ).select('+verificationTokenHash');

    await sendEmailVerification({
      to: pendingUser.email,
      name: pendingUser.name,
      verificationUrl: buildVerificationUrl(verification.token),
    });

    return res.status(201).json({
      success: true,
      message: 'Check your email and click Verify Email to create your account.',
    });
  } catch (error) {
    if (error.code === 11000) {
      return next(createHttpError(409, 'A signup request already exists for this email. Check your email or try again later.'));
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

    if (!user.emailVerifiedAt) {
      return next(createHttpError(403, 'Please verify your email before logging in.'));
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

export async function verifyEmail(req, res, next) {
  try {
    const token = String(req.query.token || '');

    if (!token) {
      return next(createHttpError(400, 'Verification token is required.'));
    }

    const tokenHash = hashToken(token);
    const pendingUser = await PendingUser.findOne({
      verificationTokenHash: tokenHash,
      expiresAt: { $gt: new Date() },
    }).select('+passwordHash +verificationTokenHash');

    if (!pendingUser) {
      return next(createHttpError(400, 'Verification link is invalid or expired.'));
    }

    const existingUser = await User.findOne({ email: pendingUser.email });

    if (existingUser) {
      await PendingUser.deleteOne({ _id: pendingUser._id });
      return next(createHttpError(409, 'An account already exists with this email.'));
    }

    const user = await User.create({
      name: pendingUser.name,
      email: pendingUser.email,
      passwordHash: pendingUser.passwordHash,
      source: 'direct',
      emailVerifiedAt: new Date(),
    });

    await PendingUser.deleteOne({ _id: pendingUser._id });

    const authToken = signToken({
      userId: user._id.toString(),
      role: user.role,
    });

    return res.status(200).json({
      success: true,
      token: authToken,
      user: sanitizeUser(user),
      message: 'Email verified and account created successfully.',
    });
  } catch (error) {
    if (error.code === 11000) {
      return next(createHttpError(409, 'An account already exists with this email.'));
    }

    return next(error);
  }
}

export async function updateMe(req, res, next) {
  try {
    const { phone, address } = req.body;
    const validation = validateDefaultAddressPayload({ phone, address });

    if (validation.error) {
      return next(createHttpError(400, validation.error));
    }

    req.user.phone = validation.normalizedPhone;
    req.user.addresses = [
      buildDefaultAddress({
        user: req.user,
        address,
        phone: validation.normalizedPhone,
      }),
    ];

    await req.user.save();

    return res.status(200).json({
      success: true,
      user: sanitizeUser(req.user),
      message: 'Account details updated.',
    });
  } catch (error) {
    if (error.code === 11000) {
      return next(createHttpError(409, 'This phone number is already linked to another account.'));
    }

    return next(error);
  }
}

export async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;

    if (!isValidEmail(email)) {
      return next(createHttpError(400, 'A valid email is required.'));
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() }).select(
      '+passwordResetTokenHash +passwordResetExpiresAt',
    );

    if (user) {
      const reset = createPasswordResetToken();
      user.passwordResetTokenHash = reset.tokenHash;
      user.passwordResetExpiresAt = reset.expiresAt;
      await user.save();

      await sendPasswordResetEmail({
        to: user.email,
        name: user.name,
        resetUrl: buildPasswordResetUrl(reset.token),
      });
    }

    return res.status(200).json({
      success: true,
      message: 'If an account exists with this email, a password reset link has been sent.',
    });
  } catch (error) {
    return next(error);
  }
}

export async function resetPassword(req, res, next) {
  try {
    const { token, password } = req.body;

    if (!token) {
      return next(createHttpError(400, 'Reset token is required.'));
    }

    if (!password || password.length < 8) {
      return next(createHttpError(400, 'Password must be at least 8 characters.'));
    }

    const user = await User.findOne({
      passwordResetTokenHash: hashToken(token),
      passwordResetExpiresAt: { $gt: new Date() },
    }).select('+passwordHash +passwordResetTokenHash +passwordResetExpiresAt');

    if (!user) {
      return next(createHttpError(400, 'Reset link is invalid or expired.'));
    }

    user.passwordHash = await hashPassword(password);
    user.passwordResetTokenHash = '';
    user.passwordResetExpiresAt = null;
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Password updated. You can sign in now.',
    });
  } catch (error) {
    return next(error);
  }
}
