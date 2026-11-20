'use strict';

const { AppError, normalizeError } = require('../utils/AppError');

function apiNotFound(req, res, next) {
  if (req.path.startsWith('/api')) {
    return next(
      new AppError(404, `API endpoint ${req.method} ${req.path} does not exist`, 'ROUTE_NOT_FOUND')
    );
  }
  return next();
}

function errorHandler(error, req, res, next) {
  const normalized = normalizeError(error);

  if (normalized.statusCode >= 500 && process.env.NODE_ENV !== 'test') {
    console.error('[error]', error);
  }

  return res.status(normalized.statusCode).json({
    success: false,
    message: normalized.message,
    code: normalized.code,
    ...(normalized.details ? { details: normalized.details } : {}),
    ...(process.env.NODE_ENV === 'development' ? { path: req.originalUrl } : {})
  });
}

module.exports = { apiNotFound, errorHandler };
