import assert from 'node:assert/strict';
import test from 'node:test';
import mongoose from 'mongoose';
import { CheckoutAttempt } from '../src/models/CheckoutAttempt.js';
import { Order } from '../src/models/Order.js';
import { PendingUser } from '../src/models/PendingUser.js';
import { Product } from '../src/models/Product.js';
import { HomepageConfig } from '../src/models/HomepageConfig.js';
import { User } from '../src/models/User.js';

const objectId = () => new mongoose.Types.ObjectId();

function validSnapshot() {
  return {
    slug: 'the-drape-tote',
    name: 'The Drape Tote',
    category: 'Classic Tote',
    color: 'Black',
    material: 'Calfskin',
    image: 'products/bag.jpg',
    unitPrice: 15000,
  };
}

function validItem() {
  return {
    product: objectId(),
    productSnapshot: validSnapshot(),
    quantity: 1,
    packageSnapshot: { lengthCm: 40, breadthCm: 14, heightCm: 32, weightKg: 0.8 },
    lineTotal: 15000,
  };
}

function customerData() {
  return {
    customer: { name: 'Customer', phone: '9876543210', email: 'CUSTOMER@EXAMPLE.COM' },
    shippingAddress: {
      addressLine1: '1 Test Street', city: 'Noida', state: 'Uttar Pradesh', postalCode: '201318', country: 'India',
    },
  };
}

test('product validation chooses and sorts a primary image', async () => {
  const product = new Product({
    name: 'The Drape Tote', slug: 'the-drape-tote', price: 15000,
    category: 'Classic Tote', material: 'Calfskin', color: 'Black',
    images: [
      { url: 'second.jpg', order: 2 },
      { url: 'first.jpg', order: 1 },
    ],
    packageDetails: { lengthCm: 40, breadthCm: 14, heightCm: 32, weightKg: 0.8 },
  });
  await product.validate();
  assert.equal(product.images[0].url, 'first.jpg');
  assert.equal(product.images.some((image) => image.isPrimary), true);
  assert.equal(product.image.length > 0, true);
});

test('product schema rejects missing images and invalid package dimensions', async () => {
  const product = new Product({
    name: 'Bag', slug: 'bag', price: 100, category: 'Tote', material: 'Leather', color: 'Black',
    images: [], packageDetails: { lengthCm: 0, breadthCm: 10, heightCm: 10, weightKg: 0.5 },
  });
  await assert.rejects(product.validate(), (error) => {
    assert.ok(error.errors.images);
    assert.ok(error.errors['packageDetails.lengthCm']);
    return true;
  });
});

test('homepage configuration supplies storefront copy defaults and validates text limits', async () => {
  const config = new HomepageConfig({
    signatureSilhouettes: Array.from({ length: 5 }, objectId),
    artisanCrafted: Array.from({ length: 3 }, objectId),
    everydayCarry: Array.from({ length: 4 }, objectId),
  });
  await config.validate();
  assert.equal(config.key, 'homepage');
  assert.equal(config.sectionSettings.signatureSilhouettes.enabled, true);
  assert.equal(config.sectionSettings.signatureSilhouettes.title, 'Signature');
  assert.equal(config.sectionSettings.everydayCarry.subtitle, 'Carry.');

  config.sectionSettings.artisanCrafted.description = 'x'.repeat(241);
  await assert.rejects(config.validate(), (error) => {
    assert.ok(error.errors['sectionSettings.artisanCrafted.description']);
    return true;
  });
});

test('user schema normalizes email and enforces roles and saved address fields', async () => {
  const user = new User({ email: ' Customer@Example.COM ', passwordHash: 'hash' });
  await user.validate();
  assert.equal(user.email, 'customer@example.com');
  assert.equal(user.role, 'customer');
  assert.equal(user.isPortalEnabled, true);

  const invalid = new User({
    email: 'admin@example.com', passwordHash: 'hash', role: 'owner',
    addresses: [{ addressLine1: 'Street' }],
  });
  await assert.rejects(invalid.validate(), (error) => {
    assert.ok(error.errors.role);
    assert.ok(error.errors['addresses.0.city']);
    return true;
  });
});

test('pending users require verification data and expire through a TTL index', async () => {
  const pending = new PendingUser({ name: 'Customer', email: 'customer@example.com' });
  await assert.rejects(pending.validate(), (error) => {
    assert.ok(error.errors.passwordHash);
    assert.ok(error.errors.verificationTokenHash);
    assert.ok(error.errors.expiresAt);
    return true;
  });
  const expiresIndex = PendingUser.schema.indexes().find(([fields]) => fields.expiresAt === 1);
  assert.equal(expiresIndex[1].expireAfterSeconds, 0);
});

test('checkout attempts preserve snapshots and reject invalid payment states', async () => {
  const attempt = new CheckoutAttempt({
    orderNumber: 'SIM-TEST-1', user: objectId(), ...customerData(), items: [validItem()],
    totals: { subtotal: 15000, shipping: 0, total: 15000, currency: 'inr' },
    payment: { status: 'pending', razorpayOrderId: 'order_1' }, stockReserved: true,
  });
  await attempt.validate();
  assert.equal(attempt.totals.currency, 'INR');
  assert.equal(attempt.customer.email, 'customer@example.com');

  attempt.payment.status = 'paid';
  await assert.rejects(attempt.validate(), /not a valid enum value/);
});

test('checkout attempts have a TTL cleanup index for personal checkout data', () => {
  const purgeIndex = CheckoutAttempt.schema.indexes().find(([fields]) => fields.purgeAt === 1);
  assert.equal(purgeIndex[1].expireAfterSeconds, 0);
});

test('orders require items and enforce payment and shipping state machines', async () => {
  const order = new Order({
    orderNumber: 'SIM-TEST-2', user: objectId(), ...customerData(), items: [validItem()],
    totals: { subtotal: 15000, shipping: 0, total: 15000, currency: 'INR' },
    orderStatus: 'confirmed', payment: { status: 'paid' }, shipping: { status: 'not_created' },
  });
  await order.validate();
  assert.equal(order.stockDebited, false);
  assert.equal(order.shipping.provider, 'shiprocket');

  order.payment.status = 'chargeback';
  order.shipping.status = 'unknown';
  await assert.rejects(order.validate(), (error) => {
    assert.ok(error.errors['payment.status']);
    assert.ok(error.errors['shipping.status']);
    return true;
  });
});

test('orders reject an empty item list', async () => {
  const order = new Order({
    orderNumber: 'SIM-TEST-3', ...customerData(), items: [],
    totals: { subtotal: 0, shipping: 0, total: 0, currency: 'INR' },
  });
  await assert.rejects(order.validate(), (error) => {
    assert.ok(error.errors.items);
    return true;
  });
});
