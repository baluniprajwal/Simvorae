import { Router } from 'express';
import {
  forgotPassword,
  getMe,
  login,
  register,
  resetPassword,
  updateMe,
  verifyEmail,
} from '../controllers/authController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/verify-email', verifyEmail);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/me', protect, getMe);
router.put('/me', protect, updateMe);

export default router;
