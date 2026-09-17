import { Router } from 'express';
import { handleRazorpayWebhook, verifyPayment } from '../controllers/paymentController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = Router();

router.post('/razorpay/verify', protect, verifyPayment);
router.post('/razorpay/webhook', handleRazorpayWebhook);

export default router;
