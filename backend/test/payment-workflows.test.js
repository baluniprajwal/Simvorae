import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';
import mongoose from 'mongoose';
import { CheckoutAttempt } from '../src/models/CheckoutAttempt.js';
import { Order } from '../src/models/Order.js';
import { Product } from '../src/models/Product.js';
import { User } from '../src/models/User.js';
import { handleRazorpayWebhook } from '../src/controllers/paymentController.js';

const WEBHOOK_SECRET = 'test-webhook-secret';

function mockSession(t) {
  t.mock.method(mongoose, 'startSession', async () => ({
    withTransaction: async (callback) => callback(),
    endSession: async () => {},
  }));
}

// Mongoose queries are awaited directly in controllers and chained with .session() in services.
function query(value) {
  return {
    session: async () => value,
    then: (resolve, reject) => Promise.resolve(value).then(resolve, reject),
  };
}

function createAttempt(overrides = {}) {
  return {
    _id: 'attempt-1',
    orderNumber: 'SIM-TEST-1',
    user: 'user-1',
    customer: { name: 'Customer', email: 'customer@example.com' },
    shippingAddress: { addressLine1: 'Address' },
    items: [{ product: { toString: () => 'product-1' }, productSnapshot: { name: 'Test Bag' }, quantity: 1 }],
    totals: { total: 1000, currency: 'INR' },
    payment: { status: 'pending', razorpayOrderId: 'order_rzp_1', razorpayPaymentId: '' },
    notes: '',
    stockReserved: true,
    save: async () => {},
    ...overrides,
  };
}

async function sendWebhook(t, body) {
  process.env.RAZORPAY_WEBHOOK_SECRET = WEBHOOK_SECRET;
  t.after(() => {
    delete process.env.RAZORPAY_WEBHOOK_SECRET;
  });

  const rawBody = Buffer.from(JSON.stringify(body));
  const signature = crypto.createHmac('sha256', WEBHOOK_SECRET).update(rawBody).digest('hex');
  const req = { headers: { 'x-razorpay-signature': signature }, rawBody, body };
  const result = { statusCode: null, body: null, error: null };
  const res = {
    status(code) {
      result.statusCode = code;
      return this;
    },
    json(payload) {
      result.body = payload;
      return this;
    },
  };

  await handleRazorpayWebhook(req, res, (error) => {
    result.error = error;
  });

  return result;
}

function capturedPayment(overrides = {}) {
  return {
    id: 'pay_1',
    order_id: 'order_rzp_1',
    amount: 100000,
    currency: 'INR',
    status: 'captured',
    captured: true,
    ...overrides,
  };
}

test('failed payment webhook keeps the attempt so a retry on the same Razorpay order can succeed', async (t) => {
  const attempt = createAttempt();
  const saveCalls = [];
  attempt.save = async () => saveCalls.push({ ...attempt.payment });

  t.mock.method(Order, 'findOne', () => query(null));
  t.mock.method(CheckoutAttempt, 'findOne', () => query(attempt));
  const deleteAttempt = t.mock.method(CheckoutAttempt, 'deleteOne', async () => ({ deletedCount: 1 }));
  const restock = t.mock.method(Product, 'bulkWrite', async () => ({ modifiedCount: 1 }));

  const result = await sendWebhook(t, {
    event: 'payment.failed',
    payload: { payment: { entity: capturedPayment({ id: 'pay_failed', status: 'failed', captured: false }) } },
  });

  assert.equal(result.error, null);
  assert.equal(result.statusCode, 200);
  assert.equal(deleteAttempt.mock.callCount(), 0, 'the attempt must survive a failed payment');
  assert.equal(restock.mock.callCount(), 0, 'the stock reservation must stay in place');
  assert.equal(attempt.stockReserved, true);
  assert.equal(saveCalls.length, 1);
  assert.equal(saveCalls[0].status, 'failed');
});

test('captured webhook after a failed first try still promotes the attempt to a paid order', async (t) => {
  mockSession(t);
  const attempt = createAttempt({ payment: { status: 'failed', razorpayOrderId: 'order_rzp_1', razorpayPaymentId: 'pay_failed' } });
  let createdOrder;

  t.mock.method(CheckoutAttempt, 'findOne', () => query(attempt));
  t.mock.method(Order, 'findOne', () => query(null));
  t.mock.method(Order, 'create', async ([payload]) => {
    createdOrder = {
      ...payload,
      payment: { ...payload.payment },
      $session: () => {},
      save: async () => {},
    };
    return [createdOrder];
  });
  t.mock.method(Order, 'findOneAndUpdate', async () => null);
  t.mock.method(User, 'updateOne', async () => ({ modifiedCount: 1 }));
  const deleteAttempt = t.mock.method(CheckoutAttempt, 'deleteOne', async () => ({ deletedCount: 1 }));

  const result = await sendWebhook(t, {
    event: 'payment.captured',
    payload: { payment: { entity: capturedPayment({ id: 'pay_retry' }) } },
  });

  assert.equal(result.error, null);
  assert.equal(result.statusCode, 200);
  assert.equal(createdOrder.payment.status, 'paid');
  assert.equal(createdOrder.payment.razorpayPaymentId, 'pay_retry');
  assert.equal(deleteAttempt.mock.callCount(), 1);
});

test('captured webhook that loses the race to verify confirms the existing order instead of refunding', async (t) => {
  // Verify already created the order and cleared stockReserved, but has not marked it paid yet.
  const attempt = createAttempt({ stockReserved: false });
  const existingOrder = {
    _id: 'order-1',
    orderNumber: 'SIM-TEST-1',
    stockDebited: true,
    totals: { total: 1000, currency: 'INR' },
    payment: { status: 'pending', razorpayOrderId: 'order_rzp_1', razorpayPaymentId: 'pay_1' },
    orderStatus: 'pending',
    save: async () => {},
  };

  t.mock.method(Order, 'findOne', (filter) => {
    // The webhook's first lookup by Razorpay order ID ran before verify committed.
    if (filter['payment.razorpayOrderId']) return query(null);
    return query(filter.orderNumber === 'SIM-TEST-1' ? existingOrder : null);
  });
  t.mock.method(CheckoutAttempt, 'findOne', () => query(attempt));
  t.mock.method(CheckoutAttempt, 'deleteOne', async () => ({ deletedCount: 1 }));
  t.mock.method(Order, 'findOneAndUpdate', async () => null);

  const result = await sendWebhook(t, {
    event: 'payment.captured',
    payload: { payment: { entity: capturedPayment() } },
  });

  // A refund attempt would surface as an error here (Razorpay credentials are not configured in tests).
  assert.equal(result.error, null);
  assert.equal(result.statusCode, 200);
  assert.equal(existingOrder.payment.status, 'paid');
  assert.equal(existingOrder.orderStatus, 'confirmed');
});

test('captured webhook for a truly expired reservation with no order still takes the refund path', async (t) => {
  const attempt = createAttempt({ stockReserved: false });

  t.mock.method(Order, 'findOne', () => query(null));
  t.mock.method(CheckoutAttempt, 'findOne', () => query(attempt));
  const createOrder = t.mock.method(Order, 'create', async () => {
    throw new Error('An expired reservation must not become an order.');
  });

  const result = await sendWebhook(t, {
    event: 'payment.captured',
    payload: { payment: { entity: capturedPayment() } },
  });

  assert.equal(createOrder.mock.callCount(), 0);
  // Reaching Razorpay's refund API is the expected outcome; it fails here only because tests have no credentials.
  assert.match(result.error?.message || '', /Razorpay credentials are not configured/);
});

test('a late or retried captured webhook does not revive a cancelled and refunded order', async (t) => {
  const refundedOrder = {
    _id: 'order-1',
    orderNumber: 'SIM-TEST-1',
    stockDebited: true,
    stockRestored: true,
    totals: { total: 1000, currency: 'INR' },
    payment: { status: 'refunded', razorpayOrderId: 'order_rzp_1', razorpayPaymentId: 'pay_1' },
    orderStatus: 'cancelled',
    save: t.mock.fn(async () => {}),
  };

  t.mock.method(Order, 'findOne', () => query(refundedOrder));
  t.mock.method(Order, 'findOneAndUpdate', async () => null);

  const result = await sendWebhook(t, {
    event: 'payment.captured',
    payload: { payment: { entity: capturedPayment() } },
  });

  assert.equal(result.error, null);
  assert.equal(result.statusCode, 200);
  assert.equal(refundedOrder.payment.status, 'refunded');
  assert.equal(refundedOrder.orderStatus, 'cancelled');
  assert.equal(refundedOrder.save.mock.callCount(), 0);
});
