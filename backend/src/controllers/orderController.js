import { Order } from '../models/Order.js';
import { sendShipmentTrackingEmail } from '../services/emailService.js';
import { createShiprocketOrder } from '../services/shiprocketService.js';
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
    order.shipping.trackingUrl = shipment.trackingUrl;
    await order.save();

    if (shipment.awbCode || shipment.trackingUrl) {
      await sendShipmentTrackingEmail(order);
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
