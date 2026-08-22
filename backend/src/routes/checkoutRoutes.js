import { Router } from 'express';
import { createCheckout } from '../controllers/checkoutController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = Router();

router.post('/', protect, createCheckout);

export default router;
