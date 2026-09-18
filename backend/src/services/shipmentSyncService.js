import crypto from 'node:crypto';
import { Order } from '../models/Order.js';
import { sendShipmentTrackingEmail } from './emailService.js';
import { getShiprocketTracking } from './shiprocketService.js';

export async function sendShipmentTrackingBestEffort(order) {
  if (order.shipping.trackingNotifiedAt) {
    return;
  }

  const claimToken = crypto.randomUUID();
  const claimedAt = new Date();
  const staleClaimBefore = new Date(claimedAt.getTime() - 10 * 60 * 1000);
  let claimedOrder;

  try {
    claimedOrder = await Order.findOneAndUpdate(
      {
        _id: order._id,
        'shipping.trackingNotifiedAt': null,
        $or: [
          { 'shipping.trackingEmailClaimToken': '' },
          { 'shipping.trackingEmailClaimToken': { $exists: false } },
          { 'shipping.trackingEmailClaimedAt': { $lte: staleClaimBefore } },
        ],
      },
      {
        $set: {
          'shipping.trackingEmailClaimToken': claimToken,
          'shipping.trackingEmailClaimedAt': claimedAt,
          'shipping.trackingEmailLastAttemptAt': claimedAt,
        },
      },
      { new: true },
    );

    if (!claimedOrder) {
      return;
    }

    const result = await sendShipmentTrackingEmail(claimedOrder);
    const update = {
      'shipping.trackingEmailClaimToken': '',
      'shipping.trackingEmailClaimedAt': null,
    };

    if (result) {
      update['shipping.trackingNotifiedAt'] = new Date();
      update['shipping.trackingEmailLastError'] = '';
    } else {
      update['shipping.trackingEmailLastError'] = 'Email provider is not configured.';
      console.error(`Shipment email was skipped for ${claimedOrder.orderNumber}: email provider is not configured.`);
    }

    await Order.updateOne(
      { _id: claimedOrder._id, 'shipping.trackingEmailClaimToken': claimToken },
      { $set: update },
    );

    order.shipping.trackingEmailClaimToken = '';
    order.shipping.trackingEmailClaimedAt = null;
    if (result) {
      order.shipping.trackingNotifiedAt = update['shipping.trackingNotifiedAt'];
      order.shipping.trackingEmailLastError = '';
    } else {
      order.shipping.trackingEmailLastError = update['shipping.trackingEmailLastError'];
    }
  } catch (error) {
    const orderNumber = claimedOrder?.orderNumber || order.orderNumber;
    const errorMessage = error.message || 'Shipment email failed.';
    console.error(`Shipment email failed for ${orderNumber}: ${errorMessage}`);

    if (!claimedOrder) {
      return;
    }

    try {
      await Order.updateOne(
        { _id: claimedOrder._id, 'shipping.trackingEmailClaimToken': claimToken },
        {
          $set: {
            'shipping.trackingEmailClaimToken': '',
            'shipping.trackingEmailClaimedAt': null,
            'shipping.trackingEmailLastError': errorMessage,
          },
        },
      );
    } catch (updateError) {
      console.error(`Could not release shipment email claim for ${orderNumber}: ${updateError.message}`);
    }
  }
}

export async function syncShiprocketOrder(order) {
  const tracking = await getShiprocketTracking(order);

  if (tracking.skipped) {
    return { skipped: true, order, tracking };
  }

  await applyShiprocketTrackingUpdate(order, tracking, { notifyTracking: true });
  return { skipped: false, order, tracking };
}

export async function applyShiprocketTrackingUpdate(order, tracking, { notifyTracking = false } = {}) {
  const wasCancellationPending = order.shipping.status === 'cancellation_pending';
  const pendingCancellationStatus = order.shipping.currentStatus;

  order.shipping.awbCode = tracking.awbCode || order.shipping.awbCode;
  order.shipping.trackingUrl = tracking.trackingUrl || order.shipping.trackingUrl;
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
      trackingEmailClaimedAt: null,
      trackingEmailClaimToken: '',
      trackingEmailLastAttemptAt: null,
      trackingEmailLastError: '',
      shippedAt: null,
      deliveredAt: null,
    };
  } else if (
    wasCancellationPending &&
    !tracking.cancellationRejected &&
    !['in_transit', 'delivered'].includes(tracking.shippingStatus)
  ) {
    order.shipping.status = 'cancellation_pending';
    order.shipping.currentStatus = pendingCancellationStatus || 'Cancellation requested; awaiting Shiprocket confirmation';
  } else {
    order.shipping.status = tracking.shippingStatus || order.shipping.status;
    order.shipping.currentStatus = tracking.currentStatus || order.shipping.currentStatus;
    order.shipping.cancellationRequestedAt = null;
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

  const hasTrackingInfo = Boolean(order.shipping.awbCode || order.shipping.trackingUrl);
  if (notifyTracking && hasTrackingInfo && !order.shipping.trackingNotifiedAt) {
    if (notifyTracking === 'background') {
      void sendShipmentTrackingBestEffort(order);
    } else {
      await sendShipmentTrackingBestEffort(order);
    }
  }

  return order;
}
