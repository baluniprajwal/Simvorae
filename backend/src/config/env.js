// Settings without which a core flow (login, checkout, payment, email, product images) breaks.
// Shiprocket is optional: shipment actions report "not configured" instead of failing silently.
const REQUIRED_IN_PRODUCTION = [
  'MONGODB_URI',
  'JWT_SECRET',
  'FRONTEND_URL',
  'PUBLIC_API_URL',
  'RAZORPAY_KEY_ID',
  'RAZORPAY_KEY_SECRET',
  'RAZORPAY_WEBHOOK_SECRET',
  'RESEND_API_KEY',
  'EMAIL_FROM',
  'AWS_REGION',
  'AWS_S3_BUCKET',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
];

export function getProductionConfigProblems(env = process.env) {
  const problems = REQUIRED_IN_PRODUCTION
    .filter((name) => !String(env[name] || '').trim())
    .map((name) => `${name} is not set`);

  if (env.JWT_SECRET && env.JWT_SECRET.length < 32) {
    problems.push('JWT_SECRET must be at least 32 characters');
  }

  for (const name of ['FRONTEND_URL', 'PUBLIC_API_URL']) {
    if (env[name] && /localhost|127\.0\.0\.1/.test(env[name])) {
      problems.push(`${name} points at localhost`);
    }
  }

  return problems;
}
