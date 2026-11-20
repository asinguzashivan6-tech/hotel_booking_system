'use strict';

const jwt = require('jsonwebtoken');
const { unauthorized, forbidden } = require('../utils/AppError');

function getToken(req) {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7).trim();
  return null;
}

function requireAuth(req, res, next) {
  try {
    const token = getToken(req);
    if (!token) return next(unauthorized('Authentication token is required', 'AUTH_REQUIRED'));
    const secret = process.env.JWT_SECRET;
    if (!secret) return next(unauthorized('Server auth is not configured (JWT_SECRET missing)', 'AUTH_CONFIG'));
    const payload = jwt.verify(token, secret);
    req.user = payload;
    return next();
  } catch (err) {
    return next(unauthorized('Invalid or expired token', 'INVALID_TOKEN'));
  }
}

function optionalAuth(req, res, next) {
  const token = getToken(req);
  if (!token) return next();
  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) return next();
    req.user = jwt.verify(token, secret);
  } catch (_err) {
    // ignore invalid optional token
  }
  return next();
}

function requireRoles(...roles) {
  const allowed = roles.flat();
  return (req, res, next) => {
    if (!req.user) return next(unauthorized('Authentication required', 'AUTH_REQUIRED'));
    if (allowed.length === 0 || allowed.includes(req.user.role)) return next();
    return next(forbidden('You do not have permission to perform this action', 'FORBIDDEN_ROLE'));
  };
}

function signToken(user) {
  const secret = process.env.JWT_SECRET || 'dev-insecure-secret';
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  return jwt.sign(
    { sub: String(user._id), role: user.role, email: user.email, name: user.fullName },
    secret,
    { expiresIn }
  );
}

module.exports = { requireAuth, optionalAuth, requireRoles, signToken };
