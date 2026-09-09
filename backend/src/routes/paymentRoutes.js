import { Router } from 'express';
import { handleRazorpayWebhook, verifyPayment } from '../controllers/paymentController.js';

const router = Router();

router.post('/razorpay/verify', verifyPayment);
router.post('/razorpay/webhook', handleRazorpayWebhook);

export default router;
