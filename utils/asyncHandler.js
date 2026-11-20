'use strict';

/**
 * Wrap an async Express handler so rejected promises are forwarded to the
 * central error-handling middleware instead of hanging the request.
 */
function asyncHandler(handler) {
  return function wrappedHandler(req, res, next) {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

module.exports = asyncHandler;
