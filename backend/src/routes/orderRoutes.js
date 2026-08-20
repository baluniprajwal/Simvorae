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
import { protect, requireAdmin } from '../middlewares/authMiddleware.js';

const router = Router();

router.get('/', protect, requireAdmin, getOrders);
router.patch('/:orderNumber/status', protect, requireAdmin, updateOrderStatus);
router.post('/:orderNumber/shipment', protect, requireAdmin, createOrderShipment);
router.post('/:orderNumber/shipment/sync', protect, requireAdmin, syncOrderShipment);
router.post('/:orderNumber/shipment/cancel', protect, requireAdmin, cancelOrderShipment);
router.get('/my-orders', protect, getMyOrders);
router.get('/my-orders/:orderNumber', protect, getMyOrderByNumber);

export default router;
