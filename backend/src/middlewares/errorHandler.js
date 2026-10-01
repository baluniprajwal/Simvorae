const GENERIC_ERROR_MESSAGE = 'Something went wrong. Please try again.';

export function errorHandler(err, req, res, _next) {
  // Mongoose validation messages describe the submitted data and are useful to the admin.
  const isValidationError = err.name === 'ValidationError';
  const statusCode = err.statusCode || (isValidationError ? 400 : 500);
  const isProduction = process.env.NODE_ENV === 'production';
  // Unexpected errors (database, SDK, programming errors) can carry internal details.
  const isSafeToShow = err.expose === true || statusCode < 500;
  const message = isSafeToShow || !isProduction
    ? err.message || GENERIC_ERROR_MESSAGE
    : GENERIC_ERROR_MESSAGE;

  if (!isSafeToShow) {
    console.error(`Unhandled error on ${req?.method || ''} ${req?.originalUrl || ''}:`, err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(!isProduction && { error: err.stack }),
  });
}
