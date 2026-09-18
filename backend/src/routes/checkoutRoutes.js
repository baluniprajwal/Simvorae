import { Router } from 'express';
import { createCheckout } from '../controllers/checkoutController.js';
import { protect, verifyCsrf } from '../middlewares/authMiddleware.js';

const router = Router();

router.post('/', protect, verifyCsrf, createCheckout);

export default router;
