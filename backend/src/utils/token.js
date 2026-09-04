import crypto from 'crypto';

const defaultExpiresInSeconds = 60 * 60 * 24 * 7;

function getExpiresInSeconds(envName, fallbackSeconds) {
  const rawValue = process.env[envName];

  if (!rawValue) {
    return fallbackSeconds;
  }

  const seconds = Number(rawValue);

  if (!Number.isFinite(seconds) || seconds <= 0) {
    throw new Error(`${envName} must be a positive number of seconds.`);
  }

  return seconds;
}

function base64UrlEncode(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function base64UrlDecode(value) {
  return JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
}

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error('JWT_SECRET is not defined in the environment.');
  }

  return secret;
}

export function signToken(payload, expiresInSeconds = defaultExpiresInSeconds) {
  const header = {
    alg: 'HS256',
    typ: 'JWT',
  };

  const body = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + expiresInSeconds,
  };

  const encodedHeader = base64UrlEncode(header);
  const encodedBody = base64UrlEncode(body);
  const data = `${encodedHeader}.${encodedBody}`;
  const signature = crypto.createHmac('sha256', getJwtSecret()).update(data).digest('base64url');

  return `${data}.${signature}`;
}

export function getCustomerTokenExpirySeconds() {
  return getExpiresInSeconds('JWT_EXPIRES_IN_SECONDS', defaultExpiresInSeconds);
}

export function getAdminTokenExpirySeconds() {
  return getExpiresInSeconds('JWT_ADMIN_EXPIRES_IN_SECONDS', 60 * 60 * 12);
}

export function verifyToken(token) {
  const [encodedHeader, encodedBody, signature] = token.split('.');

  if (!encodedHeader || !encodedBody || !signature) {
    throw new Error('Invalid token.');
  }

  const data = `${encodedHeader}.${encodedBody}`;
  const expectedSignature = crypto.createHmac('sha256', getJwtSecret()).update(data).digest('base64url');
  const signatureBuffer = Buffer.from(signature);
  const expectedSignatureBuffer = Buffer.from(expectedSignature);

  if (
    signatureBuffer.length !== expectedSignatureBuffer.length ||
    !crypto.timingSafeEqual(signatureBuffer, expectedSignatureBuffer)
  ) {
    throw new Error('Invalid token signature.');
  }

  const payload = base64UrlDecode(encodedBody);

  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error('Token has expired.');
  }

  return payload;
}
