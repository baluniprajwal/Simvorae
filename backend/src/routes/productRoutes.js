import { Router } from 'express';
import {
  createProduct,
  deleteProduct,
  getAdminProducts,
  getProductById,
  getProductFilters,
  getProducts,
  updateProduct,
} from '../controllers/productController.js';
import { createProductImageUploadUrl } from '../controllers/uploadController.js';
import { protect, requireAdmin } from '../middlewares/authMiddleware.js';
import {
  validateAdminProductBody,
  validateProductIdentifier,
  validateProductQuery,
} from '../middlewares/validateProductRequest.js';

const router = Router();

router.get('/', validateProductQuery, getProducts);
router.get('/admin', protect, requireAdmin, getAdminProducts);
router.post('/admin', protect, requireAdmin, validateAdminProductBody, createProduct);
router.patch('/admin/:id', protect, requireAdmin, validateAdminProductBody, updateProduct);
router.delete('/admin/:id', protect, requireAdmin, deleteProduct);
router.post('/image-upload', protect, requireAdmin, createProductImageUploadUrl);
router.get('/filters', getProductFilters);
router.get('/:id', validateProductIdentifier, getProductById);

export default router;
