import { Router } from 'express';
import {
  forgotPassword,
  getMe,
  login,
  logout,
  register,
  resetPassword,
  updateMe,
  verifyEmail,
} from '../controllers/authController.js';
import { protect, protectAdmin, requireAdmin, verifyCsrf } from '../middlewares/authMiddleware.js';
import { createRateLimiter } from '../middlewares/rateLimit.js';

const router = Router();

const loginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many sign-in attempts. Please wait 15 minutes and try again.',
});
const registrationLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: 'Too many account requests. Please wait before trying again.',
});
const emailActionLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: 'Too many email requests. Please wait before trying again.',
});
const tokenActionLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many verification attempts. Please wait 15 minutes and try again.',
});

router.post('/register', registrationLimiter, register);
router.post('/login', loginLimiter, login);
router.get('/verify-email', tokenActionLimiter, verifyEmail);
router.post('/forgot-password', emailActionLimiter, forgotPassword);
router.post('/reset-password', tokenActionLimiter, resetPassword);
router.get('/me', protect, getMe);
router.put('/me', protect, verifyCsrf, updateMe);
router.post('/logout', protect, verifyCsrf, logout);
router.get('/admin/me', protectAdmin, requireAdmin, getMe);
router.post('/admin/logout', protectAdmin, requireAdmin, verifyCsrf, logout);

export default router;
