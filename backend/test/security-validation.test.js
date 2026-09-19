import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';
import { protect, protectAdmin, requireAdmin, verifyCsrf } from '../src/middlewares/authMiddleware.js';
import { errorHandler } from '../src/middlewares/errorHandler.js';
import { notFound } from '../src/middlewares/notFound.js';
import { createRateLimiter } from '../src/middlewares/rateLimit.js';
import {
  validateAdminProductBody,
  validateProductIdentifier,
  validateProductQuery,
} from '../src/middlewares/validateProductRequest.js';
import {
  ADMIN_CSRF_COOKIE,
  ADMIN_SESSION_COOKIE,
  clearAuthCookies,
  parseCookies,
  setAuthCookies,
} from '../src/utils/authCookies.js';
import { hashPassword, verifyPassword } from '../src/utils/password.js';
import { signToken, verifyToken } from '../src/utils/token.js';
import {
  isValidEmail,
  isValidIndianPhone,
  isValidIndianPostalCode,
  normalizePhone,
} from '../src/utils/validators.js';
import { validateImageUploadRequest } from '../src/services/s3Service.js';
import { User } from '../src/models/User.js';
import {
  verifyRazorpaySignature,
  verifyRazorpayWebhookSignature,
} from '../src/services/razorpayService.js';

function runMiddleware(middleware, req = {}) {
  return new Promise((resolve) => {
    middleware(req, {}, (error) => resolve(error));
  });
}

function validProductBody() {
  return {
    name: 'The Drape Tote',
    price: 15000,
    category: 'Classic Tote',
    material: 'Calfskin',
    color: 'Black',
    images: ['products/bag.jpg'],
    stock: 8,
    lowStockThreshold: 3,
    isActive: true,
    packageDetails: { lengthCm: 40, breadthCm: 14, heightCm: 32, weightKg: 0.8 },
  };
}

test('customer input validators normalize and validate common Indian details', () => {
  assert.equal(normalizePhone('+91 98765-43210'), '919876543210');
  assert.equal(isValidIndianPhone('98765 43210'), true);
  assert.equal(isValidIndianPhone('12345'), false);
  assert.equal(isValidEmail(' customer@example.com '), true);
  assert.equal(isValidEmail('customer-at-example.com'), false);
  assert.equal(isValidIndianPostalCode('201318'), true);
  assert.equal(isValidIndianPostalCode('20131'), false);
});

test('password hashes verify only the original password', async () => {
  const hash = await hashPassword('StrongPassword123!');
  assert.notEqual(hash, 'StrongPassword123!');
  assert.equal(await verifyPassword('StrongPassword123!', hash), true);
  assert.equal(await verifyPassword('wrong-password', hash), false);
});

test('signed tokens round-trip and reject tampering and expiration', () => {
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'unit-test-secret';
  try {
    const token = signToken({ userId: 'user-1', role: 'customer' }, 60);
    assert.equal(verifyToken(token).userId, 'user-1');
    assert.throws(() => verifyToken(`${token.slice(0, -1)}x`), /signature/i);
    assert.throws(() => verifyToken(signToken({ userId: 'user-1' }, -1)), /expired/i);
  } finally {
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  }
});

test('cookie parsing handles encoded values and malformed encoding safely', () => {
  const parsed = parseCookies({ headers: { cookie: 'one=hello%20world; broken=%E0%A4%A; flag=value=two' } });
  assert.equal(parsed.one, 'hello world');
  assert.equal(parsed.broken, '%E0%A4%A');
  assert.equal(parsed.flag, 'value=two');
});

test('admin auth cookies use isolated names and can be cleared', () => {
  const written = [];
  const cleared = [];
  const response = {
    cookie: (name, value, options) => written.push({ name, value, options }),
    clearCookie: (name, options) => cleared.push({ name, options }),
  };
  setAuthCookies(response, { role: 'admin', token: 'jwt', expiresIn: 300 });
  clearAuthCookies(response, 'admin');

  assert.deepEqual(written.map(({ name }) => name), [ADMIN_SESSION_COOKIE, ADMIN_CSRF_COOKIE]);
  assert.equal(written[0].options.httpOnly, true);
  assert.equal(written[1].options.httpOnly, false);
  assert.deepEqual(cleared.map(({ name }) => name), [ADMIN_SESSION_COOKIE, ADMIN_CSRF_COOKIE]);
  assert.equal('maxAge' in cleared[0].options, false);
});

test('admin authorization rejects customers and accepts admins', async () => {
  const denied = await runMiddleware(requireAdmin, { user: { role: 'customer' } });
  const allowed = await runMiddleware(requireAdmin, { user: { role: 'admin' } });
  assert.equal(denied.statusCode, 403);
  assert.equal(allowed, undefined);
});

test('protected routes reject requests without the correct session cookie', async () => {
  const customerError = await runMiddleware(protect, { headers: {} });
  const adminError = await runMiddleware(protectAdmin, { headers: {} });
  assert.equal(customerError.statusCode, 401);
  assert.equal(adminError.statusCode, 401);
});

test('customer authentication loads a verified portal user from a signed cookie', async (t) => {
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'middleware-test-secret';
  const user = { _id: 'user-1', role: 'customer', isPortalEnabled: true, emailVerifiedAt: new Date() };
  t.mock.method(User, 'findById', async (id) => {
    assert.equal(id, 'user-1');
    return user;
  });
  try {
    const token = signToken({ userId: 'user-1' }, 60);
    const request = { headers: { cookie: `simvorae_customer_session=${token}` } };
    assert.equal(await runMiddleware(protect, request), undefined);
    assert.equal(request.user, user);
    assert.equal(request.authRole, 'customer');
  } finally {
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  }
});

test('authentication blocks disabled or unverified customer accounts', async (t) => {
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'middleware-test-secret';
  const token = signToken({ userId: 'user-2' }, 60);
  const request = { headers: { cookie: `simvorae_customer_session=${token}` } };
  let currentUser = { role: 'customer', isPortalEnabled: false, emailVerifiedAt: new Date() };
  t.mock.method(User, 'findById', async () => currentUser);
  try {
    assert.equal((await runMiddleware(protect, request)).statusCode, 401);
    currentUser = { role: 'customer', isPortalEnabled: true, emailVerifiedAt: null };
    assert.equal((await runMiddleware(protect, request)).statusCode, 403);
  } finally {
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  }
});

test('CSRF validation uses the separate admin token', async () => {
  const error = await runMiddleware(verifyCsrf, {
    authRole: 'admin',
    headers: {
      cookie: `${ADMIN_CSRF_COOKIE}=admin-token`,
      'x-csrf-token': 'admin-token',
    },
  });
  assert.equal(error, undefined);

  const mismatch = await runMiddleware(verifyCsrf, {
    authRole: 'admin',
    headers: {
      cookie: `${ADMIN_CSRF_COOKIE}=admin-token`,
      'x-csrf-token': 'customer-token',
    },
  });
  assert.equal(mismatch.statusCode, 403);
});

test('product query validation accepts supported filters and rejects unsafe values', async () => {
  assert.equal(await runMiddleware(validateProductQuery, {
    query: { search: 'tote', sort: 'price_asc', minPrice: '10', maxPrice: '20000' },
  }), undefined);
  assert.equal((await runMiddleware(validateProductQuery, { query: { sort: 'random' } })).statusCode, 400);
  assert.equal((await runMiddleware(validateProductQuery, {
    query: { minPrice: '200', maxPrice: '100' },
  })).statusCode, 400);
});

test('product identifier validation accepts ids and slugs but rejects malformed paths', async () => {
  assert.equal(await runMiddleware(validateProductIdentifier, { params: { id: '123' } }), undefined);
  assert.equal(await runMiddleware(validateProductIdentifier, { params: { id: 'the-drape-tote' } }), undefined);
  assert.equal((await runMiddleware(validateProductIdentifier, { params: { id: '../bag' } })).statusCode, 400);
});

test('admin product validation enforces shipping dimensions, images, and inventory types', async () => {
  assert.equal(await runMiddleware(validateAdminProductBody, { body: validProductBody() }), undefined);

  const noPackage = validProductBody();
  delete noPackage.packageDetails;
  assert.match((await runMiddleware(validateAdminProductBody, { body: noPackage })).message, /package details/i);

  const noImages = { ...validProductBody(), images: [] };
  assert.match((await runMiddleware(validateAdminProductBody, { body: noImages })).message, /image/i);

  const fractionalStock = { ...validProductBody(), stock: 1.5 };
  assert.match((await runMiddleware(validateAdminProductBody, { body: fractionalStock })).message, /stock/i);
});

test('image upload validation permits supported files under 5 MB only', () => {
  assert.doesNotThrow(() => validateImageUploadRequest({ contentType: 'image/webp', size: 1024 }));
  assert.throws(
    () => validateImageUploadRequest({ contentType: 'image/svg+xml', size: 1024 }),
    /JPEG, PNG, and WebP/,
  );
  assert.throws(
    () => validateImageUploadRequest({ contentType: 'image/png', size: 6 * 1024 * 1024 }),
    /5 MB/,
  );
});

test('Razorpay payment and webhook signatures are verified cryptographically', () => {
  const previousKey = process.env.RAZORPAY_KEY_ID;
  const previousSecret = process.env.RAZORPAY_KEY_SECRET;
  const previousWebhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  process.env.RAZORPAY_KEY_ID = 'rzp_test';
  process.env.RAZORPAY_KEY_SECRET = 'payment-secret';
  process.env.RAZORPAY_WEBHOOK_SECRET = 'webhook-secret';
  try {
    const orderId = 'order_1';
    const paymentId = 'pay_1';
    const signature = crypto.createHmac('sha256', 'payment-secret')
      .update(`${orderId}|${paymentId}`)
      .digest('hex');
    assert.equal(verifyRazorpaySignature({ razorpayOrderId: orderId, razorpayPaymentId: paymentId, razorpaySignature: signature }), true);
    assert.equal(verifyRazorpaySignature({ razorpayOrderId: orderId, razorpayPaymentId: paymentId, razorpaySignature: 'bad' }), false);

    const rawBody = Buffer.from('{"event":"payment.captured"}');
    const webhookSignature = crypto.createHmac('sha256', 'webhook-secret').update(rawBody).digest('hex');
    assert.equal(verifyRazorpayWebhookSignature({ rawBody, razorpaySignature: webhookSignature }), true);
    assert.equal(verifyRazorpayWebhookSignature({ rawBody, razorpaySignature: 'bad' }), false);
  } finally {
    if (previousKey === undefined) delete process.env.RAZORPAY_KEY_ID; else process.env.RAZORPAY_KEY_ID = previousKey;
    if (previousSecret === undefined) delete process.env.RAZORPAY_KEY_SECRET; else process.env.RAZORPAY_KEY_SECRET = previousSecret;
    if (previousWebhookSecret === undefined) delete process.env.RAZORPAY_WEBHOOK_SECRET; else process.env.RAZORPAY_WEBHOOK_SECRET = previousWebhookSecret;
  }
});

test('rate limiting emits standard headers and blocks excess requests per client', () => {
  const limiter = createRateLimiter({ windowMs: 60_000, max: 2, message: 'Please wait.' });
  const headers = {};
  const response = {
    setHeader: (name, value) => { headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
  let accepted = 0;
  const request = { ip: '127.0.0.77' };
  limiter(request, response, () => { accepted += 1; });
  limiter(request, response, () => { accepted += 1; });
  limiter(request, response, () => { accepted += 1; });
  assert.equal(accepted, 2);
  assert.equal(response.statusCode, 429);
  assert.equal(response.body.message, 'Please wait.');
  assert.equal(headers['RateLimit-Remaining'], '0');
});

test('not-found and error middleware return consistent API errors', () => {
  let missingError;
  notFound({ method: 'GET', originalUrl: '/missing' }, {}, (error) => { missingError = error; });
  assert.equal(missingError.statusCode, 404);

  const previousEnvironment = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  const response = {
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
  errorHandler(missingError, {}, response, () => {});
  assert.equal(response.statusCode, 404);
  assert.equal(response.body.message, 'Route not found: GET /missing');
  assert.equal('error' in response.body, false);
  if (previousEnvironment === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = previousEnvironment;
});
