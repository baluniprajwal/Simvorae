import { Order } from '../models/Order.js';
import { finalizeRefundedOrder } from '../services/orderService.js';
import { createRazorpayRefund } from '../services/razorpayService.js';
import {
  cancelShiprocketOrder,
  cancelShiprocketShipmentByAwb,
  createShiprocketOrder,
} from '../services/shiprocketService.js';
import {
  sendShipmentTrackingBestEffort,
  syncShiprocketOrder,
} from '../services/shipmentSyncService.js';
import { createHttpError } from '../utils/createHttpError.js';

const ADMIN_ORDER_STATUSES = ['processing', 'cancelled'];
const VISIBLE_ORDER_PAYMENT_STATUSES = ['paid', 'refund_pending', 'refunded'];

export async function getOrders(req, res, next) {
  try {
    const orders = await Order.find({
      'payment.status': { $in: VISIBLE_ORDER_PAYMENT_STATUSES },
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

      const refundRequestedAt = new Date();
      const claimedOrder = await Order.findOneAndUpdate(
        {
          _id: order._id,
          'payment.status': 'paid',
          'payment.razorpayPaymentId': order.payment.razorpayPaymentId,
        },
        {
          $set: {
            'payment.status': 'refund_pending',
            'payment.refundId': '',
            'payment.refundStatus': 'pending',
            'payment.refundAmount': 0,
            'payment.refundRequestedAt': refundRequestedAt,
          },
        },
        { new: true },
      );

      if (!claimedOrder) {
        return next(createHttpError(409, 'A refund is already being processed for this order.'));
      }

      let refund;
      try {
        refund = await createRazorpayRefund({
          paymentId: claimedOrder.payment.razorpayPaymentId,
          orderNumber: claimedOrder.orderNumber,
        });
      } catch (error) {
        await Order.updateOne(
          {
            _id: claimedOrder._id,
            'payment.status': 'refund_pending',
            'payment.refundId': '',
          },
          {
            $set: {
              'payment.status': 'paid',
              'payment.refundStatus': 'failed',
            },
          },
        );
        throw error;
      }

      if (refund.status === 'failed') {
        await Order.updateOne(
          { _id: claimedOrder._id, 'payment.status': 'refund_pending' },
          {
            $set: {
              'payment.status': 'paid',
              'payment.refundId': refund.id || '',
              'payment.refundStatus': 'failed',
              'payment.refundAmount': Number(refund.amount || 0),
            },
          },
        );
        return next(createHttpError(502, 'Razorpay could not process the refund. No stock was restored; please try again.'));
      }

      if (refund.status === 'processed') {
        const refundedOrder = await finalizeRefundedOrder({ orderId: claimedOrder._id, refund });

        return res.status(200).json({
          success: true,
          message: 'Order cancelled, refund processed, and stock restored.',
          order: refundedOrder,
        });
      }

      await Order.updateOne(
        { _id: claimedOrder._id, 'payment.status': 'refund_pending' },
        {
          $set: {
            'payment.refundId': refund.id || '',
            'payment.refundStatus': refund.status || 'pending',
            'payment.refundAmount': Number(refund.amount || 0),
          },
        },
      );
      const pendingRefundOrder = await Order.findById(claimedOrder._id);

      if (pendingRefundOrder?.payment.status === 'refunded') {
        return res.status(200).json({
          success: true,
          message: 'Order cancelled, refund processed, and stock restored.',
          order: pendingRefundOrder,
        });
      }

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
      await sendShipmentTrackingBestEffort(order);
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

    const syncResult = await syncShiprocketOrder(order);

    if (syncResult.skipped) {
      return next(createHttpError(503, 'Shiprocket credentials are not configured.'));
    }

    return res.status(200).json({
      success: true,
      message: 'Shipment synced successfully.',
      order: syncResult.order,
      tracking: syncResult.tracking,
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
      'payment.status': { $in: VISIBLE_ORDER_PAYMENT_STATUSES },
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
      'payment.status': { $in: VISIBLE_ORDER_PAYMENT_STATUSES },
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
