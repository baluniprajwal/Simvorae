export function createHttpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  // Messages created here are written for customers and safe to show them.
  error.expose = true;
  return error;
}
