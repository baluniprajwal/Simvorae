import { Router } from 'express';
import {
  getProductById,
  getProductFilters,
  getProducts,
} from '../controllers/productController.js';
import {
  validateProductIdentifier,
  validateProductQuery,
} from '../middlewares/validateProductRequest.js';

const router = Router();

router.get('/', validateProductQuery, getProducts);
router.get('/filters', getProductFilters);
router.get('/:id', validateProductIdentifier, getProductById);

export default router;
