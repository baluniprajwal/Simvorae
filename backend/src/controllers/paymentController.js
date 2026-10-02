import crypto from 'node:crypto';
import { CheckoutAttempt } from '../models/CheckoutAttempt.js';
import { Order } from '../models/Order.js';
import { sendExpiredCheckoutRefundEmail, sendPaymentConfirmedEmails } from '../services/emailService.js';
import { sendRefundConfirmationBestEffort } from '../services/refundNotificationService.js';
import {
  createOrderFromCheckoutAttempt,
  debitOrderStock,
  finalizeRefundedOrder,
} from '../services/orderService.js';
import {
  createRazorpayRefund,
  fetchRazorpayPayment,
  verifyRazorpaySignature,
  verifyRazorpayWebhookSignature,
} from '../services/razorpayService.js';
import { createHttpError } from '../utils/createHttpError.js';

async function sendPaymentConfirmationBestEffort(order) {
  if (order.confirmationEmailSentAt) {
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
        confirmationEmailSentAt: null,
        $or: [
          { confirmationEmailClaimToken: '' },
          { confirmationEmailClaimToken: { $exists: false } },
          { confirmationEmailClaimedAt: { $lte: staleClaimBefore } },
        ],
      },
      {
        $set: {
          confirmationEmailClaimToken: claimToken,
          confirmationEmailClaimedAt: claimedAt,
          confirmationEmailLastAttemptAt: claimedAt,
        },
      },
      { new: true },
    );

    if (!claimedOrder) {
      return;
    }

    const results = await sendPaymentConfirmedEmails(claimedOrder);
    const customerResult = results[0];
    const customerEmailSent = customerResult?.status === 'fulfilled' && customerResult.value;
    const update = {
      confirmationEmailClaimToken: '',
      confirmationEmailClaimedAt: null,
    };

    if (customerEmailSent) {
      update.confirmationEmailSentAt = new Date();
      update.confirmationEmailLastError = '';
    } else {
      const reason = customerResult?.status === 'rejected'
        ? customerResult.reason?.message || String(customerResult.reason)
        : 'Email provider is not configured.';
      update.confirmationEmailLastError = reason;
      console.error(`Order confirmation email failed for ${claimedOrder.orderNumber}: ${reason}`);
    }

    for (const result of results.slice(1)) {
      if (result.status === 'rejected') {
        console.error(`Admin order email failed for ${claimedOrder.orderNumber}: ${result.reason?.message || result.reason}`);
      }
    }

    await Order.updateOne(
      { _id: claimedOrder._id, confirmationEmailClaimToken: claimToken },
      { $set: update },
    );

    Object.assign(order, update);
  } catch (error) {
    console.error(`Order confirmation email failed for ${claimedOrder?.orderNumber || order.orderNumber}: ${error.message}`);

    if (!claimedOrder) {
      return;
    }

    try {
      await Order.updateOne(
        { _id: claimedOrder._id, confirmationEmailClaimToken: claimToken },
        {
          $set: {
            confirmationEmailClaimToken: '',
            confirmationEmailClaimedAt: null,
            confirmationEmailLastError: error.message || 'Order confirmation email failed.',
          },
        },
      );
    } catch (updateError) {
      console.error(`Could not release confirmation email claim for ${claimedOrder.orderNumber}: ${updateError.message}`);
    }
  }
}

const REFUND_PAYMENT_STATUSES = ['refund_pending', 'refunded'];
const OPEN_PAYMENT_STATUSES = ['pending', 'authorized', 'failed'];

async function confirmPaidOrder({ order, razorpayPaymentId, razorpaySignature = '' }) {
  if (order.payment.status === 'paid') {
    await sendPaymentConfirmationBestEffort(order);
    return { order, alreadyPaid: true };
  }

  // A replayed verify request or a late/retried captured webhook must never revive an order
  // that has already been cancelled and refunded.
  if (REFUND_PAYMENT_STATUSES.includes(order.payment.status)) {
    return { order, alreadyPaid: false, refunded: true };
  }

  await debitOrderStock(order);

  order.payment.status = 'paid';
  order.payment.razorpayPaymentId = razorpayPaymentId || order.payment.razorpayPaymentId;
  order.payment.razorpaySignature = razorpaySignature || order.payment.razorpaySignature;
  order.payment.paidAt = order.payment.paidAt || new Date();
  order.orderStatus = 'confirmed';
  await order.save();

  await sendPaymentConfirmationBestEffort(order);

  return { order, alreadyPaid: false };
}

function assertWebhookPaymentMatchesCheckout({ checkout, payment }) {
  const expectedAmount = Math.round(checkout.totals.total * 100);
  const receivedAmount = Number(payment?.amount);
  const receivedCurrency = String(payment?.currency || '').toUpperCase();
  const expectedCurrency = String(checkout.totals.currency || 'INR').toUpperCase();

  if (receivedAmount !== expectedAmount || receivedCurrency !== expectedCurrency) {
    throw createHttpError(400, 'Webhook payment amount does not match order total.');
  }
}

function assertCapturedPaymentMatchesCheckout({ checkout, payment }) {
  assertWebhookPaymentMatchesCheckout({ checkout, payment });

  if (String(payment?.order_id || '') !== String(checkout.payment.razorpayOrderId || '')) {
    throw createHttpError(400, 'Payment does not belong to this checkout.');
  }

  if (payment?.status !== 'captured' || payment?.captured !== true) {
    throw createHttpError(409, 'Payment is not captured yet. Please wait while Razorpay confirms it.');
  }
}

async function promoteAttemptToPaidOrder({ attempt, razorpayPaymentId, razorpaySignature = '' }) {
  let order;

  try {
    order = await createOrderFromCheckoutAttempt({
      attempt,
      razorpayPaymentId,
      razorpaySignature,
    });
  } catch (error) {
    if (error.statusCode === 409 && razorpayPaymentId) {
      await refundLateCheckoutPayment({ attempt, razorpayPaymentId });
      throw createHttpError(409, 'Your stock reservation expired. The payment has been refunded; please try again.');
    }

    throw error;
  }

  await confirmPaidOrder({ order, razorpayPaymentId, razorpaySignature });
  await CheckoutAttempt.deleteOne({ _id: attempt._id });

  return order;
}

// Verify and the payment.captured webhook can race. Whichever runs second must reuse the
// order the first one created; refunding is only correct when no order exists and the
// reservation has truly lapsed. The attempt must be loaded before calling this, because
// order creation and clearing stockReserved commit in the same transaction.
async function settleCapturedPayment({ attempt, razorpayPaymentId, razorpaySignature = '' }) {
  const existingOrder = await Order.findOne({ orderNumber: attempt.orderNumber });

  if (existingOrder) {
    await confirmPaidOrder({ order: existingOrder, razorpayPaymentId, razorpaySignature });
    await CheckoutAttempt.deleteOne({ _id: attempt._id });
    return existingOrder;
  }

  if (!attempt.stockReserved) {
    await refundLateCheckoutPayment({ attempt, razorpayPaymentId });
    throw createHttpError(409, 'Your stock reservation expired. The payment has been refunded; please try again.');
  }

  return promoteAttemptToPaidOrder({ attempt, razorpayPaymentId, razorpaySignature });
}

async function refundLateCheckoutPayment({ attempt, razorpayPaymentId }) {
  const refund = await createRazorpayRefund({
    paymentId: razorpayPaymentId,
    orderNumber: attempt.orderNumber,
    receiptType: 'expired',
    reason: 'Checkout stock reservation expired',
  });

  await CheckoutAttempt.deleteOne({ _id: attempt._id });

  // Without this the customer only sees a debit and a later credit with no explanation.
  try {
    await sendExpiredCheckoutRefundEmail(attempt, refund);
  } catch (error) {
    console.error(`Expired checkout refund email failed for ${attempt.orderNumber}: ${error.message}`);
  }

  return refund;
}

export async function verifyPayment(req, res, next) {
  try {
    const {
      orderNumber,
      razorpayPaymentId,
      razorpaySignature,
    } = req.body;

    if (!orderNumber || !razorpayPaymentId || !razorpaySignature) {
      return next(createHttpError(400, 'Payment verification details are required.'));
    }

    // Load the attempt before the order: see settleCapturedPayment.
    const attempt = await CheckoutAttempt.findOne({ orderNumber, user: req.user._id });
    const existingOrder = await Order.findOne({ orderNumber, user: req.user._id });

    if (existingOrder && REFUND_PAYMENT_STATUSES.includes(existingOrder.payment.status)) {
      return next(createHttpError(409, 'This order has been cancelled and refunded.'));
    }

    if (existingOrder?.payment.status === 'paid') {
      await sendPaymentConfirmationBestEffort(existingOrder);
      return res.status(200).json({
        success: true,
        message: 'Payment verified successfully.',
        order: existingOrder,
      });
    }

    const checkout = existingOrder || attempt;

    if (!checkout) {
      return next(createHttpError(404, 'Checkout attempt not found.'));
    }

    if (!checkout.payment.razorpayOrderId) {
      return next(createHttpError(400, 'Razorpay order has not been created for this order.'));
    }

    const isValidSignature = verifyRazorpaySignature({
      razorpayOrderId: checkout.payment.razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    });

    if (!isValidSignature) {
      return next(createHttpError(400, 'Invalid payment signature.'));
    }

    const razorpayPayment = await fetchRazorpayPayment(razorpayPaymentId);
    assertCapturedPaymentMatchesCheckout({
      checkout,
      payment: razorpayPayment,
    });

    let order;

    if (existingOrder) {
      await confirmPaidOrder({ order: existingOrder, razorpayPaymentId, razorpaySignature });
      if (attempt) await CheckoutAttempt.deleteOne({ _id: attempt._id });
      order = existingOrder;
    } else {
      order = await settleCapturedPayment({
        attempt,
        razorpayPaymentId,
        razorpaySignature,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Payment verified successfully.',
      order,
    });
  } catch (error) {
    return next(error);
  }
}

export async function handleRazorpayWebhook(req, res, next) {
  try {
    const razorpaySignature = req.headers['x-razorpay-signature'];
    const isValidSignature = verifyRazorpayWebhookSignature({
      rawBody: req.rawBody,
      razorpaySignature: Array.isArray(razorpaySignature) ? razorpaySignature[0] : razorpaySignature,
    });

    if (!isValidSignature) {
      return next(createHttpError(400, 'Invalid Razorpay webhook signature.'));
    }

    const event = req.body?.event;
    const payment = req.body?.payload?.payment?.entity;
    const refund = req.body?.payload?.refund?.entity;

    if (event === 'refund.processed' || event === 'refund.failed') {
      if (!refund?.id || !refund?.payment_id) {
        return res.status(200).json({
          success: true,
          message: 'Refund webhook ignored.',
        });
      }

      const refundedOrder = await Order.findOne({
        $or: [
          { 'payment.refundId': refund.id },
          { 'payment.razorpayPaymentId': refund.payment_id },
        ],
      });

      if (!refundedOrder) {
        return res.status(200).json({
          success: true,
          message: 'Refund order not found locally.',
        });
      }

      if (event === 'refund.processed') {
        const completedOrder = await finalizeRefundedOrder({ orderId: refundedOrder._id, refund });
        await sendRefundConfirmationBestEffort(completedOrder);
      } else if (refundedOrder.payment.status !== 'refunded') {
        refundedOrder.payment.status = 'paid';
        refundedOrder.payment.refundId = refund.id;
        refundedOrder.payment.refundStatus = 'failed';
        refundedOrder.payment.refundAmount = Number(refund.amount || 0);
        await refundedOrder.save();
      }

      return res.status(200).json({
        success: true,
        message: 'Refund webhook processed.',
      });
    }

    if (!payment?.order_id) {
      return res.status(200).json({
        success: true,
        message: 'Webhook ignored.',
      });
    }

    const order = await Order.findOne({ 'payment.razorpayOrderId': payment.order_id });

    if (order && event === 'payment.captured') {
      assertWebhookPaymentMatchesCheckout({ checkout: order, payment });
      await confirmPaidOrder({
        order,
        razorpayPaymentId: payment.id,
      });
    }

    // Only orders still waiting for payment may move to authorized/failed. The status condition is
    // part of the update itself: checking a loaded copy and then saving lets an overlapping
    // captured webhook mark the order paid in between, and the save would overwrite it. A late
    // "failed" must also never touch a refunded order, or a later capture could revive it.
    if (order && (event === 'payment.authorized' || event === 'payment.failed')) {
      await Order.updateOne(
        { _id: order._id, 'payment.status': { $in: OPEN_PAYMENT_STATUSES } },
        {
          $set: {
            'payment.status': event === 'payment.authorized' ? 'authorized' : 'failed',
            'payment.razorpayPaymentId': payment.id || order.payment.razorpayPaymentId,
          },
        },
      );
    }

    if (order) {
      return res.status(200).json({
        success: true,
        message: 'Webhook processed.',
      });
    }

    const attempt = await CheckoutAttempt.findOne({ 'payment.razorpayOrderId': payment.order_id });

    if (!attempt) {
      return res.status(200).json({
        success: true,
        message: 'Webhook checkout attempt not found locally.',
      });
    }

    if (event === 'payment.captured') {
      assertWebhookPaymentMatchesCheckout({ checkout: attempt, payment });
      try {
        await settleCapturedPayment({
          attempt,
          razorpayPaymentId: payment.id,
        });
      } catch (error) {
        // An expired reservation has already been refunded; acknowledge so Razorpay stops retrying.
        if (error.statusCode !== 409) throw error;
      }
    }

    // Razorpay Checkout lets the customer retry on the same Razorpay order after a failure, so keep
    // the attempt and its reservation; the expiry sweep releases it if nothing succeeds. Update in
    // place: an overlapping capture may already have turned the attempt into an order and deleted it.
    if (event === 'payment.authorized' || event === 'payment.failed') {
      await CheckoutAttempt.updateOne(
        { _id: attempt._id },
        {
          $set: {
            'payment.status': event === 'payment.authorized' ? 'authorized' : 'failed',
            'payment.razorpayPaymentId': payment.id || attempt.payment.razorpayPaymentId,
          },
        },
      );
    }

    return res.status(200).json({
      success: true,
      message: 'Webhook processed.',
    });
  } catch (error) {
    return next(error);
  }
}
