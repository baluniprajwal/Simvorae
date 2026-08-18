import { Router } from 'express';
import { createProductImageUploadUrl, streamImage } from '../controllers/uploadController.js';
import { protect, requireAdmin } from '../middlewares/authMiddleware.js';

const router = Router();

router.post('/product-image', protect, requireAdmin, createProductImageUploadUrl);
router.get('/images/*', streamImage);

export default router;
