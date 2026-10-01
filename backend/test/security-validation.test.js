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
import { createHttpError } from '../src/utils/createHttpError.js';
import { forgotPassword, resetPassword } from '../src/controllers/authController.js';
import { getProductionConfigProblems } from '../src/config/env.js';
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
  assert.equal(normalizePhone('+91 98765-43210'), '9876543210');
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

test('a password reset signs out sessions created with the old password', async (t) => {
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'middleware-test-secret';
  const user = { _id: 'user-1', role: 'customer', isPortalEnabled: true, emailVerifiedAt: new Date(), sessionVersion: 0 };
  t.mock.method(User, 'findById', async () => user);
  try {
    const oldToken = signToken({ userId: 'user-1', sessionVersion: 0 }, 60);
    const legacyToken = signToken({ userId: 'user-1' }, 60);
    const oldRequest = () => ({ headers: { cookie: `simvorae_customer_session=${oldToken}` } });

    assert.equal(await runMiddleware(protect, oldRequest()), undefined);
    assert.equal(
      await runMiddleware(protect, { headers: { cookie: `simvorae_customer_session=${legacyToken}` } }),
      undefined,
      'tokens issued before session versioning must keep working until the first reset',
    );

    user.sessionVersion = 1;
    assert.equal((await runMiddleware(protect, oldRequest())).statusCode, 401);

    const newToken = signToken({ userId: 'user-1', sessionVersion: 1 }, 60);
    assert.equal(await runMiddleware(protect, { headers: { cookie: `simvorae_customer_session=${newToken}` } }), undefined);
  } finally {
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  }
});

test('resetting a password bumps the session version and clears the reset token', async (t) => {
  const user = {
    sessionVersion: 2,
    passwordHash: 'old-hash',
    passwordResetTokenHash: 'hash',
    passwordResetExpiresAt: new Date(Date.now() + 60_000),
    save: t.mock.fn(async () => {}),
  };
  t.mock.method(User, 'findOne', () => ({ select: async () => user }));
  let statusCode;
  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json() {
      return this;
    },
  };
  let error;

  await resetPassword({ body: { token: 'reset-token', password: 'new-password-123' } }, res, (err) => {
    error = err;
  });

  assert.equal(error, undefined);
  assert.equal(statusCode, 200);
  assert.equal(user.sessionVersion, 3);
  assert.equal(user.passwordResetTokenHash, '');
  assert.notEqual(user.passwordHash, 'old-hash');
  assert.equal(user.save.mock.callCount(), 1);
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

test('production errors hide unexpected internal details but keep intended messages', (t) => {
  const previousEnvironment = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  t.mock.method(console, 'error', () => {});
  const send = (error) => {
    const response = {
      status(code) { this.statusCode = code; return this; },
      json(body) { this.body = body; return this; },
    };
    errorHandler(error, { method: 'POST', originalUrl: '/api/checkout' }, response, () => {});
    return response;
  };

  try {
    const internal = send(new Error('E11000 duplicate key error collection: simvorae.orders index: orderNumber_1'));
    assert.equal(internal.statusCode, 500);
    assert.equal(internal.body.message, 'Something went wrong. Please try again.');
    assert.equal('error' in internal.body, false);

    const intended = send(createHttpError(500, 'Razorpay credentials are not configured.'));
    assert.equal(intended.body.message, 'Razorpay credentials are not configured.');

    const validation = new Error('Product validation failed: price: Path `price` (-5) is less than minimum allowed value (0).');
    validation.name = 'ValidationError';
    const validationResponse = send(validation);
    assert.equal(validationResponse.statusCode, 400);
    assert.match(validationResponse.body.message, /price/);

    const clientError = send(createHttpError(409, 'Your stock reservation expired.'));
    assert.equal(clientError.statusCode, 409);
    assert.equal(clientError.body.message, 'Your stock reservation expired.');
  } finally {
    if (previousEnvironment === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousEnvironment;
  }
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

test('production refuses to start with missing or unsafe settings and names each one', () => {
  const complete = {
    MONGODB_URI: 'mongodb+srv://db', JWT_SECRET: 'x'.repeat(48), FRONTEND_URL: 'https://simvorae.com',
    PUBLIC_API_URL: 'https://api.simvorae.com', RAZORPAY_KEY_ID: 'rzp', RAZORPAY_KEY_SECRET: 's',
    RAZORPAY_WEBHOOK_SECRET: 'w', RESEND_API_KEY: 're', EMAIL_FROM: 'Simvorae <orders@simvorae.com>',
    AWS_REGION: 'ap-south-1', AWS_S3_BUCKET: 'b', AWS_ACCESS_KEY_ID: 'a', AWS_SECRET_ACCESS_KEY: 'k',
  };
  assert.deepEqual(getProductionConfigProblems(complete), []);

  const problems = getProductionConfigProblems({
    ...complete,
    RESEND_API_KEY: '',
    JWT_SECRET: 'short',
    FRONTEND_URL: 'http://localhost:3000',
  });
  assert.deepEqual(problems, [
    'RESEND_API_KEY is not set',
    'JWT_SECRET must be at least 32 characters',
    'FRONTEND_URL points at localhost',
  ]);
});

test('forgot password answers the same way when sending the email fails', async (t) => {
  t.mock.method(console, 'error', () => {});
  // Simulate the email provider being unreachable without calling it.
  const emailRequest = t.mock.method(globalThis, 'fetch', async () => {
    throw new Error('network down');
  });
  const previousKey = process.env.RESEND_API_KEY;
  process.env.RESEND_API_KEY = 're_test_invalid';
  const user = { email: 'real@example.com', name: 'Real', save: async () => {} };
  t.mock.method(User, 'findOne', () => ({ select: async () => user }));
  let body;
  let error;

  try {
    await forgotPassword(
      { body: { email: 'real@example.com' } },
      { status() { return this; }, json(payload) { body = payload; return this; } },
      (err) => { error = err; },
    );
  } finally {
    if (previousKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = previousKey;
  }

  assert.ok(emailRequest.mock.callCount() > 0, 'the reset email send must have been attempted');
  assert.equal(error, undefined);
  assert.match(body.message, /If an account exists/);
});

test('phone numbers with +91 or a leading 0 normalise to the same 10 digits', () => {
  assert.equal(normalizePhone('+91 98765 43210'), '9876543210');
  assert.equal(normalizePhone('09876543210'), '9876543210');
  assert.equal(normalizePhone('98765-43210'), '9876543210');
  assert.equal(isValidIndianPhone('+91 98765 43210'), true);
  assert.equal(isValidIndianPhone('9198765432'), true, 'a genuine 10-digit number starting 91 stays valid');
});
