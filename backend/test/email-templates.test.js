import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildEmailVerificationHtml,
  buildOrderEmailHtml,
  buildPasswordResetHtml,
  buildRefundEmailHtml,
  buildShipmentEmailHtml,
} from '../src/services/emailService.js';

function createOrder() {
  return {
    orderNumber: 'SIM-TEST-1',
    customer: { name: 'Customer <Name>', email: 'customer@example.com', phone: '9876543210' },
    shippingAddress: {
      addressLine1: '1 Test Street', city: 'Noida', state: 'Uttar Pradesh', postalCode: '201318', country: 'India',
    },
    items: [{
      quantity: 1,
      lineTotal: 15000,
      productSnapshot: {
        name: 'The Drape Tote', color: 'Black', material: 'Calfskin',
        image: 'http://localhost:5000/api/uploads/images/products/bag.jpg',
      },
    }],
    totals: { subtotal: 15000, shipping: 0, total: 15000 },
    payment: {
      status: 'refunded', refundAmount: 1500000, refundId: 'rfnd_1', razorpayPaymentId: 'pay_1',
    },
    shipping: {
      awbCode: 'AWB123', courierName: 'Courier', shipmentId: 'shipment-1', trackingUrl: 'https://tracking.example.com/AWB123',
    },
  };
}

test('order email uses email-safe layout, escapes customer data, and includes product imagery', () => {
  const previousUrl = process.env.PUBLIC_API_URL;
  process.env.PUBLIC_API_URL = 'https://api.simvorae.com';
  try {
    const html = buildOrderEmailHtml(createOrder(), 'Your order is confirmed', 'Payment confirmed.');
    assert.match(html, /role="presentation"/);
    assert.match(html, /https:\/\/api\.simvorae\.com\/api\/uploads\/images\/products\/bag\.jpg/);
    assert.match(html, /Customer &lt;Name&gt;/);
    assert.match(html, /The Drape Tote/);
    assert.doesNotMatch(html, /display:grid/);
  } finally {
    if (previousUrl === undefined) delete process.env.PUBLIC_API_URL;
    else process.env.PUBLIC_API_URL = previousUrl;
  }
});

test('shipment and refund emails include ordered products and customer-safe references', () => {
  const shipmentHtml = buildShipmentEmailHtml(createOrder());
  const refundHtml = buildRefundEmailHtml(createOrder());
  assert.match(shipmentHtml, /Track My Order/);
  assert.match(shipmentHtml, /The Drape Tote/);
  assert.match(refundHtml, /Refunded Amount/);
  assert.match(refundHtml, /rfnd_1/);
  assert.match(refundHtml, /The Drape Tote/);
  assert.match(refundHtml, /₹15,000/);
});

test('verification and reset emails use the complete atelier security styling', () => {
  const verificationHtml = buildEmailVerificationHtml({
    name: 'Customer <Name>',
    verificationUrl: 'https://simvorae.com/verify?token=one&next=account',
  });
  const resetHtml = buildPasswordResetHtml({
    name: 'Customer',
    resetUrl: 'https://simvorae.com/reset?token=two',
  });

  assert.match(verificationHtml, /CLIENT ADMISSION \/ IDENTITY VERIFICATION/i);
  assert.match(verificationHtml, /WELCOME TO THE CIRCLE/i);
  assert.match(verificationHtml, /Security protocol/i);
  assert.match(verificationHtml, /Customer &lt;Name&gt;/);
  assert.match(verificationHtml, /token=one&amp;next=account/);
  assert.match(resetHtml, /CLIENT SECURITY \/ ACCESS RECOVERY/i);
  assert.match(resetHtml, /30 minutes/i);
  assert.match(resetHtml, /Security notice/i);
});
