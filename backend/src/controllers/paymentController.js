import crypto from 'node:crypto';
import { CheckoutAttempt } from '../models/CheckoutAttempt.js';
import { Order } from '../models/Order.js';
import { sendPaymentConfirmedEmails } from '../services/emailService.js';
import {
  createOrderFromCheckoutAttempt,
  debitOrderStock,
  finalizeRefundedOrder,
  releaseCheckoutReservation,
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

async function confirmPaidOrder({ order, razorpayPaymentId, razorpaySignature = '' }) {
  if (order.payment.status === 'paid') {
    await sendPaymentConfirmationBestEffort(order);
    return { order, alreadyPaid: true };
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

async function refundLateCheckoutPayment({ attempt, razorpayPaymentId }) {
  const refund = await createRazorpayRefund({
    paymentId: razorpayPaymentId,
    orderNumber: attempt.orderNumber,
    receiptType: 'expired',
    reason: 'Checkout stock reservation expired',
  });

  await CheckoutAttempt.deleteOne({ _id: attempt._id });
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

    const paidOrder = await Order.findOne({ orderNumber, user: req.user._id });

    if (paidOrder?.payment.status === 'paid') {
      await sendPaymentConfirmationBestEffort(paidOrder);
      return res.status(200).json({
        success: true,
        message: 'Payment verified successfully.',
        order: paidOrder,
      });
    }

    const attempt = await CheckoutAttempt.findOne({ orderNumber, user: req.user._id });

    if (!attempt) {
      return next(createHttpError(404, 'Checkout attempt not found.'));
    }

    if (!attempt.payment.razorpayOrderId) {
      return next(createHttpError(400, 'Razorpay order has not been created for this order.'));
    }

    const isValidSignature = verifyRazorpaySignature({
      razorpayOrderId: attempt.payment.razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    });

    if (!isValidSignature) {
      return next(createHttpError(400, 'Invalid payment signature.'));
    }

    const razorpayPayment = await fetchRazorpayPayment(razorpayPaymentId);
    assertCapturedPaymentMatchesCheckout({
      checkout: attempt,
      payment: razorpayPayment,
    });

    if (!attempt.stockReserved) {
      await refundLateCheckoutPayment({ attempt, razorpayPaymentId });
      return next(createHttpError(409, 'Your stock reservation expired. The payment has been refunded; please try again.'));
    }

    const order = await promoteAttemptToPaidOrder({
      attempt,
      razorpayPaymentId,
      razorpaySignature,
    });

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
        await finalizeRefundedOrder({ orderId: refundedOrder._id, refund });
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

    if (order && event === 'payment.authorized' && order.payment.status !== 'paid') {
      order.payment.status = 'authorized';
      order.payment.razorpayPaymentId = payment.id || order.payment.razorpayPaymentId;
      await order.save();
    }

    if (order && event === 'payment.failed' && order.payment.status !== 'paid') {
      order.payment.status = 'failed';
      order.payment.razorpayPaymentId = payment.id || order.payment.razorpayPaymentId;
      await order.save();
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
      if (attempt.stockReserved) {
        await promoteAttemptToPaidOrder({
          attempt,
          razorpayPaymentId: payment.id,
        });
      } else {
        await refundLateCheckoutPayment({ attempt, razorpayPaymentId: payment.id });
      }
    }

    if (event === 'payment.authorized') {
      attempt.payment.status = 'authorized';
      attempt.payment.razorpayPaymentId = payment.id || attempt.payment.razorpayPaymentId;
      await attempt.save();
    }

    if (event === 'payment.failed') {
      await releaseCheckoutReservation(attempt._id);
      await CheckoutAttempt.deleteOne({ _id: attempt._id });
    }

    return res.status(200).json({
      success: true,
      message: 'Webhook processed.',
    });
  } catch (error) {
    return next(error);
  }
}
