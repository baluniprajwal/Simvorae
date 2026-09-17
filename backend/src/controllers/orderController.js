import { CheckoutAttempt } from '../models/CheckoutAttempt.js';
import { Order } from '../models/Order.js';
import { sendShipmentTrackingEmail } from '../services/emailService.js';
import { finalizeRefundedOrder, releaseCheckoutReservation } from '../services/orderService.js';
import { createRazorpayRefund } from '../services/razorpayService.js';
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
    const orders = await Order.find({ 'payment.status': 'paid' }).sort({ createdAt: -1 });

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

    if (status === 'cancelled') {
      if (order.payment.status === 'refund_pending') {
        return next(createHttpError(409, 'A refund is already being processed for this order.'));
      }

      if (order.payment.status === 'refunded' && order.orderStatus === 'cancelled') {
        return res.status(200).json({
          success: true,
          message: 'Order is already cancelled and refunded.',
          order,
        });
      }

      if (order.payment.status !== 'paid' || !order.payment.razorpayPaymentId) {
        return next(createHttpError(409, 'Only a captured Razorpay payment can be refunded.'));
      }

      const refund = await createRazorpayRefund({
        paymentId: order.payment.razorpayPaymentId,
        orderNumber: order.orderNumber,
      });

      order.payment.refundId = refund.id || '';
      order.payment.refundStatus = refund.status || 'pending';
      order.payment.refundAmount = Number(refund.amount || 0);
      order.payment.refundRequestedAt = new Date();

      if (refund.status === 'failed') {
        order.payment.refundStatus = 'failed';
        await order.save();
        return next(createHttpError(502, 'Razorpay could not process the refund. No stock was restored; please try again.'));
      }

      if (refund.status === 'processed') {
        const refundedOrder = await finalizeRefundedOrder({ orderId: order._id, refund });

        return res.status(200).json({
          success: true,
          message: 'Order cancelled, refund processed, and stock restored.',
          order: refundedOrder,
        });
      }

      await Order.updateOne(
        { _id: order._id, 'payment.status': 'paid' },
        {
          $set: {
            'payment.status': 'refund_pending',
            'payment.refundId': refund.id || '',
            'payment.refundStatus': refund.status || 'pending',
            'payment.refundAmount': Number(refund.amount || 0),
            'payment.refundRequestedAt': new Date(),
          },
        },
      );
      const pendingRefundOrder = await Order.findById(order._id);

      return res.status(200).json({
        success: true,
        message: 'Refund initiated. Stock will be restored after Razorpay confirms it.',
        order: pendingRefundOrder,
      });
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

    if (order.shipping.awbCode) {
      return next(createHttpError(409, 'Shipment is already created for this order.'));
    }

    if (order.shipping.shiprocketOrderId && !order.shipping.shipmentId) {
      return next(createHttpError(409, 'The Shiprocket order exists but has no shipment ID. Check it in Shiprocket before retrying.'));
    }

    const isAwbRetry = Boolean(order.shipping.shipmentId && !order.shipping.awbCode);
    const shipment = await createShiprocketOrder(order, {
      onOrderCreated: async ({ shiprocketOrderId, shipmentId }) => {
        if (!shiprocketOrderId && !shipmentId) {
          throw createHttpError(502, 'Shiprocket did not return an order or shipment ID.');
        }

        order.shipping.status = 'created';
        order.shipping.shiprocketOrderId = shiprocketOrderId;
        order.shipping.shipmentId = shipmentId;
        order.shipping.currentStatus = 'Shiprocket order created; AWB assignment pending';
        await order.save();
      },
    });

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

    return res.status(isAwbRetry ? 200 : 201).json({
      success: true,
      message: shipment.awbCode
        ? 'Shipment created and AWB assigned successfully.'
        : 'Shiprocket order saved. AWB assignment is pending and can be retried safely.',
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

    if (tracking.shippingStatus === 'cancelled') {
      order.shipmentAttempts.push({
        provider: order.shipping.provider,
        status: 'cancelled',
        shipmentId: order.shipping.shipmentId,
        shiprocketOrderId: order.shipping.shiprocketOrderId,
        awbCode: order.shipping.awbCode,
        courierName: order.shipping.courierName,
        trackingUrl: order.shipping.trackingUrl,
        pickupStatus: order.shipping.pickupStatus || 'Cancelled before pickup',
        currentStatus: tracking.currentStatus || 'Cancelled by Shiprocket',
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
        cancellationRequestedAt: null,
        currentStatus: 'Ready to create shipment again',
        statusCode: null,
        trackingNotifiedAt: null,
        shippedAt: null,
        deliveredAt: null,
      };
    } else {
      order.shipping.status = tracking.shippingStatus || order.shipping.status;
      if (order.shipping.status !== 'cancellation_pending') {
        order.shipping.cancellationRequestedAt = null;
      }
    }

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

    if (order.shipping.status === 'cancellation_pending' || order.shipping.status === 'cancelled') {
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

    order.shipping.status = 'cancellation_pending';
    order.shipping.currentStatus = 'Cancellation requested; awaiting Shiprocket confirmation';
    order.shipping.cancellationRequestedAt = new Date();
    await order.save();

    return res.status(200).json({
      success: true,
      message: 'Shiprocket cancellation requested. Sync the shipment to confirm it before creating another.',
      order,
      cancellation,
    });
  } catch (error) {
    return next(error);
  }
}

export async function getMyOrders(req, res, next) {
  try {
    const orders = await Order.find({
      user: req.user._id,
      'payment.status': 'paid',
    }).sort({ createdAt: -1 });

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
      'payment.status': 'paid',
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

export async function markMyOrderPaymentFailed(req, res, next) {
  try {
    const attempt = await CheckoutAttempt.findOne({
      user: req.user._id,
      orderNumber: req.params.orderNumber,
    });

    if (!attempt) {
      return res.status(200).json({
        success: true,
        message: 'Checkout attempt already closed.',
      });
    }

    await releaseCheckoutReservation(attempt._id);
    await CheckoutAttempt.deleteOne({ _id: attempt._id });

    return res.status(200).json({
      success: true,
      message: 'Unpaid checkout was removed.',
    });
  } catch (error) {
    return next(error);
  }
}
