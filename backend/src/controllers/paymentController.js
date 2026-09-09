import { CheckoutAttempt } from '../models/CheckoutAttempt.js';
import { Order } from '../models/Order.js';
import { sendPaymentConfirmedEmails } from '../services/emailService.js';
import { createOrderFromCheckoutAttempt, debitOrderStock } from '../services/orderService.js';
import { verifyRazorpaySignature, verifyRazorpayWebhookSignature } from '../services/razorpayService.js';
import { createHttpError } from '../utils/createHttpError.js';

async function confirmPaidOrder({ order, razorpayPaymentId, razorpaySignature = '' }) {
  if (order.payment.status === 'paid') {
    return { order, alreadyPaid: true };
  }

  await debitOrderStock(order);

  order.payment.status = 'paid';
  order.payment.razorpayPaymentId = razorpayPaymentId || order.payment.razorpayPaymentId;
  order.payment.razorpaySignature = razorpaySignature || order.payment.razorpaySignature;
  order.payment.paidAt = order.payment.paidAt || new Date();
  order.orderStatus = 'confirmed';
  await order.save();

  await sendPaymentConfirmedEmails(order);

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

async function promoteAttemptToPaidOrder({ attempt, razorpayPaymentId, razorpaySignature = '' }) {
  const order = await createOrderFromCheckoutAttempt({
    attempt,
    razorpayPaymentId,
    razorpaySignature,
  });

  await confirmPaidOrder({ order, razorpayPaymentId, razorpaySignature });
  await CheckoutAttempt.deleteOne({ _id: attempt._id });

  return order;
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

    const paidOrder = await Order.findOne({ orderNumber });

    if (paidOrder?.payment.status === 'paid') {
      return res.status(200).json({
        success: true,
        message: 'Payment verified successfully.',
        order: paidOrder,
      });
    }

    const attempt = await CheckoutAttempt.findOne({ orderNumber });

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
      await CheckoutAttempt.deleteOne({ _id: attempt._id });
      return next(createHttpError(400, 'Invalid payment signature.'));
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
      await promoteAttemptToPaidOrder({
        attempt,
        razorpayPaymentId: payment.id,
      });
    }

    if (event === 'payment.authorized') {
      attempt.payment.status = 'authorized';
      attempt.payment.razorpayPaymentId = payment.id || attempt.payment.razorpayPaymentId;
      await attempt.save();
    }

    if (event === 'payment.failed') {
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
