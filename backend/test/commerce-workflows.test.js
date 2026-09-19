import assert from 'node:assert/strict';
import test from 'node:test';
import mongoose from 'mongoose';
import { CheckoutAttempt } from '../src/models/CheckoutAttempt.js';
import { Order } from '../src/models/Order.js';
import { Product } from '../src/models/Product.js';
import { User } from '../src/models/User.js';
import {
  createOrderFromCheckoutAttempt,
  finalizeRefundedOrder,
  releaseCheckoutReservation,
  releaseExpiredCheckoutReservations,
} from '../src/services/orderService.js';
import {
  extractShiprocketWebhookTracking,
  extractTrackingData,
  getShiprocketChannelOrderId,
} from '../src/services/shiprocketService.js';
import {
  applyShiprocketTrackingUpdate,
  sendShipmentTrackingBestEffort,
} from '../src/services/shipmentSyncService.js';
import { sendRefundConfirmationBestEffort } from '../src/services/refundNotificationService.js';
import { verifyCsrf } from '../src/middlewares/authMiddleware.js';
import { setAuthCookies } from '../src/utils/authCookies.js';
import {
  getMyOrderByNumber,
  getMyOrders,
  getOrders,
  updateOrderStatus,
} from '../src/controllers/orderController.js';

function mockSession(t) {
  const session = {
    withTransaction: async (callback) => callback(),
    endSession: async () => {},
  };
  t.mock.method(mongoose, 'startSession', async () => session);
  return session;
}

function queryResult(value) {
  return {
    session: async () => value,
  };
}

function createItem(quantity = 2) {
  return {
    product: { toString: () => 'product-1' },
    productSnapshot: { name: 'Test Bag' },
    quantity,
  };
}

test('authentication cookies hide the JWT and expose only the CSRF token', () => {
  const cookies = [];
  const response = {
    cookie: (name, value, options) => cookies.push({ name, value, options }),
  };

  setAuthCookies(response, {
    role: 'customer',
    token: 'signed-jwt',
    expiresIn: 3600,
  });

  assert.equal(cookies[0].name, 'simvorae_customer_session');
  assert.equal(cookies[0].value, 'signed-jwt');
  assert.equal(cookies[0].options.httpOnly, true);
  assert.equal(cookies[0].options.sameSite, 'lax');
  assert.equal(cookies[1].name, 'simvorae_customer_csrf');
  assert.equal(cookies[1].options.httpOnly, false);
});

test('CSRF middleware accepts matching tokens and rejects missing tokens', () => {
  let accepted = false;
  verifyCsrf(
    {
      authRole: 'customer',
      headers: {
        cookie: 'simvorae_customer_csrf=secure-token',
        'x-csrf-token': 'secure-token',
      },
    },
    {},
    (error) => {
      assert.equal(error, undefined);
      accepted = true;
    },
  );
  assert.equal(accepted, true);

  verifyCsrf(
    { authRole: 'customer', headers: {} },
    {},
    (error) => {
      assert.equal(error.statusCode, 403);
    },
  );
});

test('concurrent order cancellation must win an atomic refund claim', async (t) => {
  const order = {
    _id: 'order-1',
    orderNumber: 'SIM-TEST-1',
    orderStatus: 'confirmed',
    payment: {
      status: 'paid',
      razorpayPaymentId: 'pay-1',
    },
    shipping: {
      status: 'not_created',
      shiprocketOrderId: '',
      shipmentId: '',
      awbCode: '',
    },
  };
  let claimFilter;

  t.mock.method(Order, 'findOne', async () => order);
  t.mock.method(Order, 'findOneAndUpdate', async (filter) => {
    claimFilter = filter;
    return null;
  });

  let responseError;
  await updateOrderStatus(
    { body: { status: 'cancelled' }, params: { orderNumber: order.orderNumber } },
    {},
    (error) => {
      responseError = error;
    },
  );

  assert.equal(claimFilter['payment.status'], 'paid');
  assert.equal(claimFilter['payment.razorpayPaymentId'], 'pay-1');
  assert.equal(responseError.statusCode, 409);
  assert.match(responseError.message, /already being processed/i);
});

test('admin and customer order queries retain refund states', async (t) => {
  const capturedFilters = [];
  const response = {
    statusCode: 0,
    payload: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.payload = payload;
      return this;
    },
  };

  t.mock.method(Order, 'find', (filter) => {
    capturedFilters.push(filter);
    return { sort: async () => [] };
  });
  t.mock.method(Order, 'findOne', async (filter) => {
    capturedFilters.push(filter);
    return { orderNumber: 'SIM-TEST-1' };
  });

  await getOrders({}, response, (error) => assert.fail(error));
  await getMyOrders({ user: { _id: 'user-1' } }, response, (error) => assert.fail(error));
  await getMyOrderByNumber(
    { user: { _id: 'user-1' }, params: { orderNumber: 'SIM-TEST-1' } },
    response,
    (error) => assert.fail(error),
  );

  for (const filter of capturedFilters) {
    assert.deepEqual(filter['payment.status'].$in, ['paid', 'refund_pending', 'refunded']);
  }
  assert.equal(capturedFilters[1].user, 'user-1');
  assert.equal(capturedFilters[2].user, 'user-1');
  assert.equal(capturedFilters[2].orderNumber, 'SIM-TEST-1');
});

test('concurrent shipment email sender must win an atomic claim', async (t) => {
  const order = {
    _id: 'order-1',
    orderNumber: 'SIM-TEST-1',
    shipping: {
      awbCode: 'AWB-1',
      trackingNotifiedAt: null,
    },
  };
  let claimFilter;

  t.mock.method(Order, 'findOneAndUpdate', async (filter) => {
    claimFilter = filter;
    return null;
  });

  await sendShipmentTrackingBestEffort(order);

  assert.equal(claimFilter._id, 'order-1');
  assert.equal(claimFilter['shipping.trackingNotifiedAt'], null);
  assert.equal(claimFilter.$or.length, 3);
});

test('concurrent refund email sender must win an atomic claim', async (t) => {
  const order = {
    _id: 'order-1',
    orderNumber: 'SIM-TEST-1',
    payment: { status: 'refunded' },
    refundEmailSentAt: null,
  };
  let claims = 0;

  t.mock.method(Order, 'findOneAndUpdate', async () => {
    claims += 1;
    return null;
  });

  const sent = await sendRefundConfirmationBestEffort(order);

  assert.equal(sent, false);
  assert.equal(claims, 1);
});

test('Shiprocket webhook payload maps directly without a tracking API request', () => {
  const tracking = extractShiprocketWebhookTracking({
    awb: 'AWB-123',
    courier_name: 'Test Courier',
    current_status: 'IN TRANSIT',
    shipment_status_id: 18,
    track_url: 'https://example.com/track/AWB-123',
  });

  assert.deepEqual(tracking, {
    awbCode: 'AWB-123',
    trackingUrl: 'https://example.com/track/AWB-123',
    currentStatus: 'IN TRANSIT',
    statusCode: 18,
    courierName: 'Test Courier',
    shippingStatus: 'in_transit',
    orderStatus: 'shipped',
    deliveredAt: null,
    shippedAt: tracking.shippedAt,
  });
  assert.ok(tracking.shippedAt instanceof Date);
});

test('Shiprocket cancelled-AWB error maps to a cancelled shipment', () => {
  const tracking = extractTrackingData({
    tracking_data: {
      shipment_status: 0,
      shipment_track: [{ current_status: '', awb_code: '' }],
      track_url: '',
      error: 'Ohh! This AWB has been cancelled.',
    },
  });

  assert.equal(tracking.currentStatus, 'Ohh! This AWB has been cancelled.');
  assert.equal(tracking.shippingStatus, 'cancelled');
});

test('replacement shipment uses a unique Shiprocket channel order ID', () => {
  assert.equal(
    getShiprocketChannelOrderId({ orderNumber: 'SIM-TEST-1', shipmentAttempts: [] }),
    'SIM-TEST-1',
  );
  assert.equal(
    getShiprocketChannelOrderId({ orderNumber: 'SIM-TEST-1', shipmentAttempts: [{}] }),
    'SIM-TEST-1-R2',
  );
});

test('reservation release restores stock exactly once', async (t) => {
  mockSession(t);
  const attempt = {
    stockReserved: true,
    items: [createItem()],
    save: t.mock.fn(async () => {}),
  };
  let bulkWrites = 0;

  t.mock.method(CheckoutAttempt, 'findById', () => queryResult(attempt));
  t.mock.method(Product, 'bulkWrite', async (operations) => {
    bulkWrites += 1;
    assert.equal(operations[0].updateOne.update.$inc.stock, 2);
  });

  await releaseCheckoutReservation('attempt-1');
  await releaseCheckoutReservation('attempt-1');

  assert.equal(bulkWrites, 1);
  assert.equal(attempt.stockReserved, false);
  assert.ok(attempt.stockReleasedAt instanceof Date);
  assert.ok(attempt.purgeAt instanceof Date);
  assert.ok(attempt.purgeAt > attempt.stockReleasedAt);
});

test('expired checkout cleanup removes only old released attempts', async (t) => {
  const limit = t.mock.fn(async () => []);
  const select = t.mock.fn(() => ({ limit }));
  let deleteFilter;

  t.mock.method(CheckoutAttempt, 'find', () => ({ select }));
  t.mock.method(CheckoutAttempt, 'deleteMany', async (filter) => {
    deleteFilter = filter;
    return { deletedCount: 2 };
  });

  await releaseExpiredCheckoutReservations();

  assert.equal(deleteFilter.stockReserved, false);
  assert.ok(deleteFilter.stockReleasedAt.$lte instanceof Date);
});

test('captured payment recovery promotes a reserved attempt to one order', async (t) => {
  mockSession(t);
  const reservedAttempt = {
    _id: 'attempt-1',
    orderNumber: 'SIM-TEST-1',
    user: 'user-1',
    customer: { name: 'Customer' },
    shippingAddress: { addressLine1: 'Address' },
    items: [createItem(1)],
    totals: { total: 1000, currency: 'INR' },
    payment: { razorpayOrderId: 'order_rzp_1' },
    notes: '',
    stockReserved: true,
    save: t.mock.fn(async () => {}),
  };
  let createdPayload;

  t.mock.method(Order, 'findOne', () => queryResult(null));
  t.mock.method(CheckoutAttempt, 'findOne', () => queryResult(reservedAttempt));
  t.mock.method(Order, 'create', async (documents) => {
    [createdPayload] = documents;
    return [{ ...createdPayload, $session: () => {} }];
  });
  t.mock.method(User, 'updateOne', async () => ({ modifiedCount: 1 }));

  const order = await createOrderFromCheckoutAttempt({
    attempt: reservedAttempt,
    razorpayPaymentId: 'pay_1',
    razorpaySignature: 'signature',
  });

  assert.equal(order.orderNumber, 'SIM-TEST-1');
  assert.equal(createdPayload.payment.razorpayPaymentId, 'pay_1');
  assert.equal(createdPayload.stockDebited, true);
  assert.equal(reservedAttempt.stockReserved, false);
});

test('duplicate captured webhook promotion reuses the existing order', async (t) => {
  mockSession(t);
  const existingOrder = { orderNumber: 'SIM-TEST-1', $session: () => {} };
  const attempt = { orderNumber: 'SIM-TEST-1', user: 'user-1' };
  let createCalls = 0;

  t.mock.method(Order, 'findOne', () => queryResult(existingOrder));
  t.mock.method(Order, 'create', async () => {
    createCalls += 1;
    throw new Error('A duplicate order must not be created.');
  });
  t.mock.method(User, 'updateOne', async () => ({ modifiedCount: 1 }));

  const order = await createOrderFromCheckoutAttempt({
    attempt,
    razorpayPaymentId: 'pay_1',
  });

  assert.equal(order, existingOrder);
  assert.equal(createCalls, 0);
});

test('processed refund restores stock and marks the order once', async (t) => {
  mockSession(t);
  const order = {
    _id: 'order-1',
    items: [createItem(2)],
    payment: { status: 'paid', refundId: '', refundAmount: 0 },
    orderStatus: 'confirmed',
    stockDebited: true,
    stockRestored: false,
    save: t.mock.fn(async () => {}),
  };
  let findCalls = 0;
  let bulkWrites = 0;

  t.mock.method(Order, 'findById', () => {
    findCalls += 1;
    return findCalls % 2 === 1 ? queryResult(order) : Promise.resolve(order);
  });
  t.mock.method(Product, 'bulkWrite', async () => {
    bulkWrites += 1;
  });

  const result = await finalizeRefundedOrder({
    orderId: order._id,
    refund: { id: 'refund-1', amount: 100000 },
  });
  await finalizeRefundedOrder({
    orderId: order._id,
    refund: { id: 'refund-1', amount: 100000 },
  });

  assert.equal(bulkWrites, 1);
  assert.equal(result.payment.status, 'refunded');
  assert.equal(result.orderStatus, 'cancelled');
  assert.equal(result.stockRestored, true);
});

test('shipment cancellation remains pending until Shiprocket confirms it', async (t) => {
  const order = {
    orderNumber: 'SIM-TEST-1',
    orderStatus: 'processing',
    shipmentAttempts: [],
    shipping: {
      provider: 'shiprocket',
      status: 'cancellation_pending',
      shipmentId: 'shipment-1',
      shiprocketOrderId: 'sr-order-1',
      awbCode: 'AWB-1',
      courierName: 'Courier',
      trackingUrl: 'https://example.com/track',
      currentStatus: 'Cancellation requested; awaiting Shiprocket confirmation',
      cancellationRequestedAt: new Date(),
    },
    save: t.mock.fn(async () => {}),
  };

  await applyShiprocketTrackingUpdate(order, {
    awbCode: 'AWB-1',
    trackingUrl: order.shipping.trackingUrl,
    currentStatus: 'NEW',
    statusCode: 1,
    courierName: 'Courier',
    shippingStatus: 'created',
    orderStatus: null,
    cancellationRejected: false,
  });

  assert.equal(order.shipping.status, 'cancellation_pending');
  assert.equal(order.shipping.shipmentId, 'shipment-1');

  await applyShiprocketTrackingUpdate(order, {
    awbCode: 'AWB-1',
    trackingUrl: order.shipping.trackingUrl,
    currentStatus: 'CANCELLED',
    statusCode: 8,
    courierName: 'Courier',
    shippingStatus: 'cancelled',
    orderStatus: null,
    cancellationRejected: false,
  });

  assert.equal(order.shipping.status, 'not_created');
  assert.equal(order.shipping.awbCode, '');
  assert.equal(order.shipmentAttempts.length, 1);
});
