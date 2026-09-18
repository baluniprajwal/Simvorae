import { Router } from 'express';
import {
  cancelOrderShipment,
  createOrderShipment,
  getMyOrderByNumber,
  getMyOrders,
  getOrders,
  syncOrderShipment,
  updateOrderStatus,
} from '../controllers/orderController.js';
import { protect, protectAdmin, requireAdmin, verifyCsrf } from '../middlewares/authMiddleware.js';

const router = Router();

router.get('/', protectAdmin, requireAdmin, getOrders);
router.patch('/:orderNumber/status', protectAdmin, requireAdmin, verifyCsrf, updateOrderStatus);
router.post('/:orderNumber/shipment', protectAdmin, requireAdmin, verifyCsrf, createOrderShipment);
router.post('/:orderNumber/shipment/sync', protectAdmin, requireAdmin, verifyCsrf, syncOrderShipment);
router.post('/:orderNumber/shipment/cancel', protectAdmin, requireAdmin, verifyCsrf, cancelOrderShipment);
router.get('/my-orders', protect, getMyOrders);
router.get('/my-orders/:orderNumber', protect, getMyOrderByNumber);

export default router;
