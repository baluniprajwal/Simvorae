import crypto from 'crypto';
import Razorpay from 'razorpay';
import { createHttpError } from '../utils/createHttpError.js';

function getRazorpayCredentials() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw createHttpError(500, 'Razorpay credentials are not configured.');
  }

  return { keyId, keySecret };
}

function getClient() {
  const { keyId, keySecret } = getRazorpayCredentials();

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
}

export async function createRazorpayOrder(order) {
  const razorpay = getClient();

  return razorpay.orders.create({
    amount: Math.round(order.totals.total * 100),
    currency: order.totals.currency || 'INR',
    receipt: order.orderNumber.slice(0, 40),
    notes: {
      orderNumber: order.orderNumber,
      customerEmail: order.customer.email,
    },
  });
}

export async function createRazorpayRefund({
  paymentId,
  orderNumber,
  receiptType = 'cancel',
  reason = 'Order cancelled by merchant',
}) {
  if (!paymentId) {
    throw createHttpError(400, 'Razorpay payment ID is required to issue a refund.');
  }

  const razorpay = getClient();
  const receiptPrefix = `${receiptType}-${orderNumber}`.slice(0, 32);
  const previousRefunds = await razorpay.payments.fetchMultipleRefund(paymentId);
  const matchingRefunds = (previousRefunds.items || []).filter((refund) =>
    String(refund.receipt || '').startsWith(receiptPrefix),
  );
  const activeRefund = matchingRefunds.find((refund) => ['pending', 'processed'].includes(refund.status));

  if (activeRefund) {
    return activeRefund;
  }

  const receipt = matchingRefunds.length > 0
    ? `${receiptPrefix}-${matchingRefunds.length + 1}`.slice(0, 40)
    : receiptPrefix;

  try {
    return await razorpay.payments.refund(paymentId, {
      speed: 'normal',
      receipt,
      notes: {
        orderNumber,
        reason,
      },
    });
  } catch (error) {
    // Recover a refund accepted by Razorpay when the original response was lost.
    const refunds = await razorpay.payments.fetchMultipleRefund(paymentId);
    const existingRefund = refunds.items?.find((refund) => refund.receipt === receipt);

    if (existingRefund) {
      return existingRefund;
    }

    throw error;
  }
}

export function verifyRazorpaySignature({ razorpayOrderId, razorpayPaymentId, razorpaySignature }) {
  const { keySecret } = getRazorpayCredentials();
  const body = `${razorpayOrderId}|${razorpayPaymentId}`;
  const expectedSignature = crypto.createHmac('sha256', keySecret).update(body).digest('hex');
  const expectedBuffer = Buffer.from(expectedSignature, 'hex');
  const receivedBuffer = Buffer.from(razorpaySignature, 'hex');

  if (expectedBuffer.length !== receivedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
}

export function verifyRazorpayWebhookSignature({ rawBody, razorpaySignature }) {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw createHttpError(500, 'Razorpay webhook secret is not configured.');
  }

  if (!rawBody || !razorpaySignature) {
    return false;
  }

  const expectedSignature = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
  const expectedBuffer = Buffer.from(expectedSignature, 'hex');
  const receivedBuffer = Buffer.from(razorpaySignature, 'hex');

  if (expectedBuffer.length !== receivedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
}
