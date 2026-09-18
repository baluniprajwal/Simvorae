import { Router } from 'express';
import { handleShipmentStatusWebhook } from '../controllers/webhookController.js';

const router = Router();

router.post('/shipment-status', handleShipmentStatusWebhook);

export default router;
