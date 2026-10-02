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

// Applies updateOne to one stored document the way MongoDB does: only when the filter matches the
// stored state at that moment, including a 'payment.status' $in condition.
function mockConditionalUpdate(t, Model, stored) {
  return t.mock.method(Model, 'updateOne', async (filter, update) => {
    const allowedStatuses = filter['payment.status']?.$in;
    const matches = filter._id === stored._id
      && (!allowedStatuses || allowedStatuses.includes(stored.payment.status));

    if (!matches) return { matchedCount: 0, modifiedCount: 0 };

    for (const [path, value] of Object.entries(update.$set)) {
      const [parent, key] = path.split('.');
      stored[parent][key] = value;
    }
    return { matchedCount: 1, modifiedCount: 1 };
  });
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
  const attemptUpdate = mockConditionalUpdate(t, CheckoutAttempt, attempt);

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
  assert.equal(attemptUpdate.mock.callCount(), 1);
  assert.equal(attempt.payment.status, 'failed');
  assert.equal(attempt.payment.razorpayPaymentId, 'pay_failed');
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
  assert.equal(refundedOrder.payment.razorpayPaymentId, 'pay_1');
  assert.equal(refundedOrder.save.mock.callCount(), 0);
});

test('late failed or authorized webhooks cannot reopen a refunded order', async (t) => {
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
  mockConditionalUpdate(t, Order, refundedOrder);

  for (const [event, entity] of [
    ['payment.failed', capturedPayment({ id: 'pay_old', status: 'failed', captured: false })],
    ['payment.authorized', capturedPayment({ id: 'pay_old', status: 'authorized', captured: false })],
    ['payment.captured', capturedPayment()],
  ]) {
    const result = await sendWebhook(t, { event, payload: { payment: { entity } } });
    assert.equal(result.error, null, event);
    assert.equal(refundedOrder.payment.status, 'refunded', `${event} must not change a refunded order`);
  }

  assert.equal(refundedOrder.orderStatus, 'cancelled');
  assert.equal(refundedOrder.save.mock.callCount(), 0);
});

test('an older failed webhook overlapping a successful capture cannot overwrite the paid order', async (t) => {
  // The order as stored in the database.
  const stored = {
    _id: 'order-1',
    orderNumber: 'SIM-TEST-1',
    stockDebited: true,
    totals: { total: 1000, currency: 'INR' },
    payment: { status: 'pending', razorpayOrderId: 'order_rzp_1', razorpayPaymentId: '' },
    orderStatus: 'pending',
  };
  // Each webhook request works on its own copy loaded from the database, like Mongoose documents.
  const loadCopy = () => {
    const copy = structuredClone(stored);
    copy.save = async () => {
      stored.payment = { ...copy.payment };
      stored.orderStatus = copy.orderStatus;
    };
    return copy;
  };
  // Both requests load the order while it is still pending; the capture then finishes first.
  const copies = [loadCopy(), loadCopy()];
  t.mock.method(Order, 'findOne', () => query(copies.shift()));
  t.mock.method(Order, 'findOneAndUpdate', async () => null);
  mockConditionalUpdate(t, Order, stored);

  const captured = await sendWebhook(t, {
    event: 'payment.captured',
    payload: { payment: { entity: capturedPayment({ id: 'pay_success' }) } },
  });
  const failed = await sendWebhook(t, {
    event: 'payment.failed',
    payload: { payment: { entity: capturedPayment({ id: 'pay_declined', status: 'failed', captured: false }) } },
  });

  assert.equal(captured.error, null);
  assert.equal(failed.error, null);
  assert.equal(stored.payment.status, 'paid', 'the successful payment must survive the older failure');
  assert.equal(stored.payment.razorpayPaymentId, 'pay_success');
  assert.equal(stored.orderStatus, 'confirmed');
});
