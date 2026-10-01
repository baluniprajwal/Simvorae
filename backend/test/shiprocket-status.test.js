import assert from 'node:assert/strict';
import test from 'node:test';
import { extractShiprocketWebhookTracking } from '../src/services/shiprocketService.js';
import { applyShiprocketTrackingUpdate } from '../src/services/shipmentSyncService.js';

const statusOf = (current_status, shipment_status_id) =>
  extractShiprocketWebhookTracking({ awb: 'AWB-1', current_status, shipment_status_id });

test('undelivered and returned shipments are never marked delivered', () => {
  for (const [text, code] of [
    ['UNDELIVERED', 21],
    ['RTO DELIVERED', 10],
    ['RTO INITIATED', 9],
    ['RTO IN TRANSIT', 46],
    ['PARTIAL DELIVERED', 23],
  ]) {
    const tracking = statusOf(text, code);
    assert.equal(tracking.shippingStatus, 'failed', `${text} must not count as delivered`);
    assert.equal(tracking.orderStatus, null, `${text} must not change the order status`);
  }
});

test('a real delivery is still marked delivered', () => {
  const tracking = statusOf('DELIVERED', 7);
  assert.equal(tracking.shippingStatus, 'delivered');
  assert.equal(tracking.orderStatus, 'delivered');
  assert.ok(tracking.deliveredAt instanceof Date);
});

test('a cancellation request is pending, not cancelled', () => {
  assert.equal(statusOf('CANCELLATION REQUESTED', 16).shippingStatus, 'cancellation_pending');
  assert.equal(statusOf('CANCELED', 8).shippingStatus, 'cancelled');
});

test('"not picked" is not treated as shipped', () => {
  assert.equal(statusOf('NOT PICKED', null).shippingStatus, 'created');
  assert.equal(statusOf('PICKED UP', 42).shippingStatus, 'in_transit');
});

test('a late in-transit webhook does not move a delivered order backwards', async (t) => {
  const order = {
    orderStatus: 'delivered',
    shipmentAttempts: [],
    shipping: { status: 'delivered', awbCode: 'AWB-1', currentStatus: 'DELIVERED' },
    save: t.mock.fn(async () => {}),
  };

  await applyShiprocketTrackingUpdate(order, statusOf('IN TRANSIT', 18));

  assert.equal(order.shipping.status, 'delivered');
  assert.equal(order.orderStatus, 'delivered');
  assert.equal(order.save.mock.callCount(), 0);
});
