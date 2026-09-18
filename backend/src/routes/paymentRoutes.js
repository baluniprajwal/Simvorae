import { Router } from 'express';
import { handleRazorpayWebhook, verifyPayment } from '../controllers/paymentController.js';
import { protect, verifyCsrf } from '../middlewares/authMiddleware.js';

const router = Router();

router.post('/razorpay/verify', protect, verifyCsrf, verifyPayment);
router.post('/razorpay/webhook', handleRazorpayWebhook);

export default router;
