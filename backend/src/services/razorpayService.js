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
