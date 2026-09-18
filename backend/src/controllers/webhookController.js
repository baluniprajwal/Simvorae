import crypto from 'node:crypto';
import { Order } from '../models/Order.js';
import { extractShiprocketWebhookTracking } from '../services/shiprocketService.js';
import { applyShiprocketTrackingUpdate } from '../services/shipmentSyncService.js';
import { createHttpError } from '../utils/createHttpError.js';

function isValidWebhookKey(receivedKey) {
  const expectedKey = process.env.SHIPROCKET_WEBHOOK_SECRET;

  if (!expectedKey || !receivedKey) {
    return false;
  }

  const received = Buffer.from(String(receivedKey));
  const expected = Buffer.from(expectedKey);

  return received.length === expected.length && crypto.timingSafeEqual(received, expected);
}

export async function handleShipmentStatusWebhook(req, res, next) {
  try {
    const apiKey = Array.isArray(req.headers['x-api-key'])
      ? req.headers['x-api-key'][0]
      : req.headers['x-api-key'];

    if (!isValidWebhookKey(apiKey)) {
      return next(createHttpError(401, 'Invalid shipment webhook key.'));
    }

    const awbCode = String(req.body?.awb || '').trim();
    if (!awbCode) {
      return res.sendStatus(200);
    }

    const order = await Order.findOne({ 'shipping.awbCode': awbCode });
    if (!order) {
      return res.sendStatus(200);
    }

    const tracking = extractShiprocketWebhookTracking(req.body);
    await applyShiprocketTrackingUpdate(order, tracking, { notifyTracking: 'background' });
    return res.sendStatus(200);
  } catch (error) {
    return next(error);
  }
}
