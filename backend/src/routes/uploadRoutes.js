import { Router } from 'express';
import { createProductImageUploadUrl, streamImage } from '../controllers/uploadController.js';
import { protectAdmin, requireAdmin, verifyCsrf } from '../middlewares/authMiddleware.js';

const router = Router();

router.post('/product-image', protectAdmin, requireAdmin, verifyCsrf, createProductImageUploadUrl);
router.get('/images/*', streamImage);

export default router;
