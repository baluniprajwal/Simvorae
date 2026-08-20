import { Order } from '../models/Order.js';
import { sendShipmentTrackingEmail } from '../services/emailService.js';
import {
  cancelShiprocketOrder,
  cancelShiprocketShipmentByAwb,
  createShiprocketOrder,
  getShiprocketTracking,
} from '../services/shiprocketService.js';
import { createHttpError } from '../utils/createHttpError.js';

const ADMIN_ORDER_STATUSES = ['processing', 'cancelled'];

export async function getOrders(req, res, next) {
  try {
    const orders = await Order.find({}).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (error) {
    return next(error);
  }
}

export async function updateOrderStatus(req, res, next) {
  try {
    const { status } = req.body;

    if (!ADMIN_ORDER_STATUSES.includes(status)) {
      return next(createHttpError(400, 'Invalid order status.'));
    }

    const order = await Order.findOne({ orderNumber: req.params.orderNumber });

    if (!order) {
      return next(createHttpError(404, 'Order not found.'));
    }

    const hasShippingProcessStarted = order.shipping.status !== 'not_created';
    const hasShiprocketIdentifiers = Boolean(
      order.shipping.shiprocketOrderId ||
        order.shipping.shipmentId ||
        order.shipping.awbCode,
    );
    const hasActiveShipment = (hasShippingProcessStarted || hasShiprocketIdentifiers) && order.shipping.status !== 'cancelled';

    if (status === 'cancelled' && hasActiveShipment) {
      return next(createHttpError(409, 'Cancel the Shiprocket shipment before cancelling this order.'));
    }

    order.orderStatus = status;
    await order.save();

    return res.status(200).json({
      success: true,
      message: 'Order status updated successfully.',
      order,
    });
  } catch (error) {
    return next(error);
  }
}

export async function createOrderShipment(req, res, next) {
  try {
    const order = await Order.findOne({ orderNumber: req.params.orderNumber });

    if (!order) {
      return next(createHttpError(404, 'Order not found.'));
    }

    if (order.payment.status !== 'paid') {
      return next(createHttpError(400, 'Shipment can only be created after payment is paid.'));
    }

    if (order.orderStatus !== 'processing') {
      return next(createHttpError(400, 'Mark order as packed before creating shipment.'));
    }

    if (order.shipping.status === 'created' || order.shipping.shiprocketOrderId || order.shipping.shipmentId) {
      return next(createHttpError(409, 'Shipment is already created for this order.'));
    }

    const shipment = await createShiprocketOrder(order);

    if (shipment.skipped) {
      return next(createHttpError(503, 'Shiprocket credentials are not configured.'));
    }

    order.shipping.status = 'created';
    order.shipping.shiprocketOrderId = shipment.shiprocketOrderId;
    order.shipping.shipmentId = shipment.shipmentId;
    order.shipping.awbCode = shipment.awbCode;
    order.shipping.courierName = shipment.courierName;
    order.shipping.trackingUrl = shipment.trackingUrl;
    order.shipping.pickupStatus = shipment.pickupStatus;
    order.shipping.pickupTokenNumber = shipment.pickupTokenNumber;
    order.shipping.pickupScheduledAt = shipment.pickupScheduledAt;
    order.shipping.currentStatus = shipment.awbCode
      ? 'AWB assigned'
      : shipment.awbAssignmentMessage || 'AWB assignment pending in Shiprocket';
    await order.save();

    if ((shipment.awbCode || shipment.trackingUrl) && !order.shipping.trackingNotifiedAt) {
      await sendShipmentTrackingEmail(order);
      order.shipping.trackingNotifiedAt = new Date();
      await order.save();
    }

    return res.status(201).json({
      success: true,
      message: 'Shipment created successfully.',
      order,
      shipment,
    });
  } catch (error) {
    return next(error);
  }
}

export async function syncOrderShipment(req, res, next) {
  try {
    const order = await Order.findOne({ orderNumber: req.params.orderNumber });

    if (!order) {
      return next(createHttpError(404, 'Order not found.'));
    }

    if (!order.shipping.shipmentId && !order.shipping.awbCode) {
      return next(createHttpError(400, 'Shipment has not been created for this order.'));
    }

    if (order.shipping.status === 'cancelled') {
      return res.status(200).json({
        success: true,
        message: 'Shipment is already cancelled. Tracking sync skipped.',
        order,
      });
    }

    const tracking = await getShiprocketTracking(order);

    if (tracking.skipped) {
      return next(createHttpError(503, 'Shiprocket credentials are not configured.'));
    }

    const hadTrackingInfo = Boolean(order.shipping.awbCode || order.shipping.trackingUrl);

    order.shipping.awbCode = tracking.awbCode || order.shipping.awbCode;
    order.shipping.trackingUrl = tracking.trackingUrl || order.shipping.trackingUrl;
    order.shipping.currentStatus = tracking.currentStatus || order.shipping.currentStatus;
    order.shipping.statusCode = tracking.statusCode ?? order.shipping.statusCode;
    order.shipping.courierName = tracking.courierName || order.shipping.courierName;
    order.shipping.status = tracking.shippingStatus || order.shipping.status;

    if (tracking.orderStatus) {
      order.orderStatus = tracking.orderStatus;
    }

    if (tracking.shippedAt && !order.shipping.shippedAt) {
      order.shipping.shippedAt = tracking.shippedAt;
    }

    if (tracking.deliveredAt && !order.shipping.deliveredAt) {
      order.shipping.deliveredAt = tracking.deliveredAt;
    }

    await order.save();

    const hasNewTrackingInfo = Boolean(order.shipping.awbCode || order.shipping.trackingUrl);
    if (!hadTrackingInfo && hasNewTrackingInfo && !order.shipping.trackingNotifiedAt) {
      await sendShipmentTrackingEmail(order);
      order.shipping.trackingNotifiedAt = new Date();
      await order.save();
    }

    return res.status(200).json({
      success: true,
      message: 'Shipment synced successfully.',
      order,
      tracking,
    });
  } catch (error) {
    return next(error);
  }
}

export async function cancelOrderShipment(req, res, next) {
  try {
    const order = await Order.findOne({ orderNumber: req.params.orderNumber });

    if (!order) {
      return next(createHttpError(404, 'Order not found.'));
    }

    if (!order.shipping.awbCode && !order.shipping.shiprocketOrderId) {
      return next(createHttpError(400, 'No Shiprocket shipment/order exists for this order.'));
    }

    if (order.shipping.status === 'cancelled') {
      return next(createHttpError(409, 'Shipment cancellation has already been requested.'));
    }

    if (order.shipping.status === 'in_transit' || order.shipping.status === 'delivered') {
      return next(createHttpError(409, 'Shipment cannot be cancelled after pickup/in-transit/delivery has started.'));
    }

    const cancellation = order.shipping.awbCode
      ? await cancelShiprocketShipmentByAwb(order.shipping.awbCode)
      : await cancelShiprocketOrder(order.shipping.shiprocketOrderId);

    if (cancellation.skipped) {
      return next(createHttpError(503, 'Shiprocket credentials are not configured.'));
    }

    order.shipmentAttempts.push({
      provider: order.shipping.provider,
      status: 'cancelled',
      shipmentId: order.shipping.shipmentId,
      shiprocketOrderId: order.shipping.shiprocketOrderId,
      awbCode: order.shipping.awbCode,
      courierName: order.shipping.courierName,
      trackingUrl: order.shipping.trackingUrl,
      pickupStatus: order.shipping.pickupStatus || 'Cancelled before pickup',
      currentStatus: 'Cancellation requested',
      cancelledAt: new Date(),
    });

    order.shipping = {
      provider: 'shiprocket',
      status: 'not_created',
      shipmentId: '',
      shiprocketOrderId: '',
      awbCode: '',
      courierName: '',
      trackingUrl: '',
      pickupStatus: 'Previous shipment cancelled',
      pickupTokenNumber: '',
      pickupScheduledAt: null,
      currentStatus: 'Ready to create shipment again',
      statusCode: null,
      trackingNotifiedAt: null,
      shippedAt: null,
      deliveredAt: null,
    };
    await order.save();

    return res.status(200).json({
      success: true,
      message: 'Shiprocket cancellation requested successfully.',
      order,
      cancellation,
    });
  } catch (error) {
    return next(error);
  }
}

export async function getMyOrders(req, res, next) {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (error) {
    return next(error);
  }
}

export async function getMyOrderByNumber(req, res, next) {
  try {
    const order = await Order.findOne({
      user: req.user._id,
      orderNumber: req.params.orderNumber,
    });

    if (!order) {
      return next(createHttpError(404, 'Order not found.'));
    }

    return res.status(200).json({
      success: true,
      order,
    });
  } catch (error) {
    return next(error);
  }
}
