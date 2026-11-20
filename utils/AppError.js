'use strict';

/**
 * Application error used for expected failures (validation, not found, conflict).
 * It carries an HTTP status code and a stable machine-readable code so the API
 * can return consistent error responses.
 */
class AppError extends Error {
  constructor(statusCode, message, code = 'ERROR', details = undefined) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace?.(this, AppError);
  }
}

const badRequest = (message, code = 'BAD_REQUEST', details) =>
  new AppError(400, message, code, details);

const unauthorized = (message = 'Unauthorized', code = 'UNAUTHORIZED') =>
  new AppError(401, message, code);

const forbidden = (message = 'Forbidden', code = 'FORBIDDEN') =>
  new AppError(403, message, code);

const notFound = (message = 'Resource not found', code = 'NOT_FOUND') =>
  new AppError(404, message, code);

const conflict = (message, code = 'CONFLICT') =>
  new AppError(409, message, code);

const tooManyRequests = (message = 'Too many requests', code = 'TOO_MANY_REQUESTS') =>
  new AppError(429, message, code);

const internal = (message = 'Internal server error', code = 'INTERNAL_ERROR') =>
  new AppError(500, message, code);

/**
 * Normalise errors from Mongoose / MongoDB into AppError instances so that
 * controllers never leak raw database messages to the client.
 */
function normalizeError(error) {
  if (error instanceof AppError) return error;

  if (error?.name === 'ValidationError') {
    const details = Object.values(error.errors || {}).map((item) => ({
      field: item.path,
      message: item.message
    }));
    return badRequest('Validation failed', 'VALIDATION_ERROR', details);
  }

  if (error?.name === 'CastError') {
    return badRequest(`Invalid value for ${error.path || 'id'}`, 'INVALID_VALUE');
  }

  if (error?.code === 11000) {
    const fields = Object.keys(error.keyPattern || error.keyValue || {});
    return conflict(
      fields.length ? `${fields.join(', ')} must be unique` : 'Duplicate record',
      'DUPLICATE_KEY'
    );
  }

  if (error?.name === 'JsonWebTokenError' || error?.name === 'TokenExpiredError') {
    return unauthorized('Invalid or expired token', 'INVALID_TOKEN');
  }

  return internal('Internal server error', 'INTERNAL_ERROR');
}

module.exports = {
  AppError,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  tooManyRequests,
  internal,
  normalizeError
};
