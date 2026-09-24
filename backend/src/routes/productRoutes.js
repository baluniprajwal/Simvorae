import { Router } from 'express';
import {
  createProduct,
  deleteProduct,
  getAdminHomepageConfig,
  getAdminProductCategoryStats,
  getAdminProducts,
  getHomepageProducts,
  getProductById,
  getProductFilters,
  getProducts,
  updateAdminHomepageConfig,
  updateProduct,
} from '../controllers/productController.js';
import { createProductImageUploadUrl } from '../controllers/uploadController.js';
import { protectAdmin, requireAdmin, verifyCsrf } from '../middlewares/authMiddleware.js';
import {
  validateAdminProductBody,
  validateProductIdentifier,
  validateProductQuery,
} from '../middlewares/validateProductRequest.js';

const router = Router();

router.get('/', validateProductQuery, getProducts);
router.get('/homepage', getHomepageProducts);
router.get('/admin/category-stats', protectAdmin, requireAdmin, getAdminProductCategoryStats);
router.get('/admin/homepage', protectAdmin, requireAdmin, getAdminHomepageConfig);
router.put('/admin/homepage', protectAdmin, requireAdmin, verifyCsrf, updateAdminHomepageConfig);
router.get('/admin', protectAdmin, requireAdmin, getAdminProducts);
router.post('/admin', protectAdmin, requireAdmin, verifyCsrf, validateAdminProductBody, createProduct);
router.patch('/admin/:id', protectAdmin, requireAdmin, verifyCsrf, validateAdminProductBody, updateProduct);
router.delete('/admin/:id', protectAdmin, requireAdmin, verifyCsrf, deleteProduct);
router.post('/image-upload', protectAdmin, requireAdmin, verifyCsrf, createProductImageUploadUrl);
router.get('/filters', getProductFilters);
router.get('/:id', validateProductIdentifier, getProductById);

export default router;
