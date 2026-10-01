import assert from 'node:assert/strict';
import test from 'node:test';
import { CheckoutAttempt } from '../src/models/CheckoutAttempt.js';
import { HomepageConfig } from '../src/models/HomepageConfig.js';
import { Order } from '../src/models/Order.js';
import { Product } from '../src/models/Product.js';
import {
  deleteUnreferencedProductImages,
  updateAdminHomepageConfig,
  updateProduct,
} from '../src/controllers/productController.js';
import { createOrderShipment } from '../src/controllers/orderController.js';

function productBody(overrides = {}) {
  return {
    name: 'The Drape Tote',
    price: 25000,
    category: 'Tote',
    material: 'Calfskin',
    color: 'Black',
    images: ['https://api.example.com/api/uploads/images/products/a.jpg'],
    packageDetails: { lengthCm: 30, breadthCm: 20, heightCm: 10, weightKg: 1 },
    stock: 5,
    stockBaseline: 5,
    isActive: true,
    ...overrides,
  };
}

function existingProduct(overrides = {}) {
  return {
    _id: '64b000000000000000000001',
    slug: 'the-drape-tote',
    stock: 4,
    images: [{ url: 'https://api.example.com/api/uploads/images/products/a.jpg' }],
    ...overrides,
  };
}

async function callUpdate(t, body, { existing = existingProduct(), updated = existing } = {}) {
  let updateFilter;
  let updatePayload;

  t.mock.method(Product, 'findOne', () => {
    const result = Promise.resolve(existing);
    result.select = async () => existing;
    return result;
  });
  t.mock.method(Product, 'findOneAndUpdate', async (filter, payload) => {
    updateFilter = filter;
    updatePayload = payload;
    if (filter.stock !== undefined && filter.stock !== existing.stock) return null;
    return { ...updated, images: payload.images ?? updated.images };
  });
  t.mock.method(Order, 'distinct', async () => []);
  t.mock.method(CheckoutAttempt, 'distinct', async () => []);

  const result = { statusCode: null, error: null };
  const res = {
    status(code) {
      result.statusCode = code;
      return this;
    },
    json() {
      return this;
    },
  };

  await updateProduct({ params: { id: 'the-drape-tote' }, body }, res, (error) => {
    result.error = error;
  });

  return { ...result, updateFilter, updatePayload };
}

test('editing a product without touching stock does not overwrite stock reserved by checkouts', async (t) => {
  // The form loaded stock 5; a customer checkout has since reserved one unit (stock is now 4).
  const result = await callUpdate(t, productBody({ description: 'New copy', stock: 5, stockBaseline: 5 }));

  assert.equal(result.error, null);
  assert.equal(result.statusCode, 200);
  assert.equal('stock' in result.updatePayload, false, 'stock must be left as the database has it');
  assert.equal(result.updateFilter.stock, undefined);
});

test('changing stock from a stale form is rejected instead of overwriting newer stock', async (t) => {
  const result = await callUpdate(t, productBody({ stock: 8, stockBaseline: 5 }));

  assert.equal(result.updateFilter.stock, 5, 'the update only applies if stock is still what the admin saw');
  assert.equal(result.error.statusCode, 409);
  assert.match(result.error.message, /now 4/);
});

test('changing stock applies when nobody else changed it meanwhile', async (t) => {
  const result = await callUpdate(t, productBody({ stock: 9, stockBaseline: 4 }));

  assert.equal(result.error, null);
  assert.equal(result.updatePayload.stock, 9);
  assert.equal(result.updateFilter.stock, 4);
});

test('renaming a product keeps its existing URL slug', async (t) => {
  const result = await callUpdate(t, productBody({ name: 'The Drape Tote II' }));

  assert.equal(result.error, null);
  assert.equal(result.updatePayload.slug, 'the-drape-tote');
});

test('image cleanup keeps files that past orders or open checkouts still show', async (t) => {
  t.mock.method(console, 'error', () => {});
  const orderImage = 'https://api.example.com/api/uploads/images/products/ordered.jpg';
  const checkoutImage = 'https://api.example.com/api/uploads/images/products/in-checkout.jpg';
  const unusedImage = 'https://api.example.com/api/uploads/images/products/unused.jpg';
  t.mock.method(Order, 'distinct', async () => [orderImage]);
  t.mock.method(CheckoutAttempt, 'distinct', async () => [checkoutImage]);

  // S3 is not configured in tests, so every attempted delete is reported back as failed.
  const attempted = await deleteUnreferencedProductImages([
    { url: orderImage },
    { url: checkoutImage },
    { url: unusedImage },
  ]);

  assert.deepEqual(attempted, ['products/unused.jpg']);
});

test('the homepage can be saved with empty slots', async (t) => {
  const savedIds = ['64b000000000000000000001', '64b000000000000000000002'];
  t.mock.method(Product, 'countDocuments', async () => savedIds.length);
  let savedUpdate;
  t.mock.method(HomepageConfig, 'findOneAndUpdate', async (_filter, update) => {
    savedUpdate = update;
    return { ...update.$set };
  });
  let statusCode;
  let error;

  await updateAdminHomepageConfig(
    {
      body: {
        sections: { signatureSilhouettes: savedIds, artisanCrafted: [], everydayCarry: [] },
        settings: { artisanCrafted: { enabled: false } },
      },
    },
    { status(code) { statusCode = code; return this; }, json() { return this; } },
    (err) => { error = err; },
  );

  assert.equal(error, undefined);
  assert.equal(statusCode, 200);
  assert.deepEqual(savedUpdate.$set.signatureSilhouettes, savedIds);
  assert.equal(savedUpdate.$set.sectionSettings.artisanCrafted.enabled, false);
});

test('the homepage still rejects more products than a section has slots', async (t) => {
  const tooMany = Array.from({ length: 4 }, (_, index) => `64b00000000000000000000${index + 1}`);
  let error;

  await updateAdminHomepageConfig(
    { body: { sections: { signatureSilhouettes: [], artisanCrafted: tooMany, everydayCarry: [] } } },
    {},
    (err) => { error = err; },
  );

  assert.equal(error.statusCode, 400);
  assert.match(error.message, /at most 3/);
});

test('only one shipment creation runs at a time for the same order', async (t) => {
  let releaseLookup;
  const unpaidOrder = { payment: { status: 'pending' } };
  t.mock.method(Order, 'findOne', () => new Promise((resolve) => {
    releaseLookup = () => resolve(unpaidOrder);
  }));
  const errors = [];
  const req = { params: { orderNumber: 'SIM-TEST-1' } };

  const first = createOrderShipment(req, {}, (err) => errors.push(['first', err.statusCode]));
  await createOrderShipment(req, {}, (err) => errors.push(['second', err.statusCode]));
  releaseLookup();
  await first;

  assert.deepEqual(errors, [['second', 409], ['first', 400]]);

  // Once the first request finishes, the order can be tried again.
  t.mock.method(Order, 'findOne', async () => unpaidOrder);
  await createOrderShipment(req, {}, (err) => errors.push(['third', err.statusCode]));
  assert.deepEqual(errors.at(-1), ['third', 400]);
});
