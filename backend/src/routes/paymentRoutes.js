import { Router } from 'express';
import { verifyPayment } from '../controllers/paymentController.js';

const router = Router();

router.post('/razorpay/verify', verifyPayment);

export default router;
