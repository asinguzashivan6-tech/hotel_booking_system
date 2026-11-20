'use strict';

const { badRequest } = require('./AppError');

// ---------------------------------------------------------------------------
// Domain constants (Marriott Hotel Management System - MHMS)
// ---------------------------------------------------------------------------

const USER_ROLES = ['admin', 'frontdesk', 'housekeeping'];
const ROOM_STATUSES = ['available', 'occupied', 'dirty', 'maintenance'];
const RESERVATION_STATUSES = ['booked', 'checked-in', 'checked-out', 'cancelled'];
const NON_CANCELLED_RESERVATION_STATUSES = ['booked', 'checked-in', 'checked-out'];
const ACTIVE_ROOM_RESERVATION_STATUSES = ['booked', 'checked-in']; // blocks availability edits in some cases
const PAYMENT_METHODS = ['cash', 'card', 'transfer'];
const PAYMENT_STATUSES = ['pending', 'paid', 'void'];
const TASK_TYPES = ['cleaning', 'inspection', 'maintenance'];
const TASK_STATUSES = ['pending', 'in-progress', 'done'];

const ALLOWED_RESERVATION_TRANSITIONS = Object.freeze({
  booked: ['checked-in', 'cancelled'],
  'checked-in': ['checked-out'],
  'checked-out': [],
  cancelled: []
});

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function has(payload, key) {
  return Object.prototype.hasOwnProperty.call(payload, key);
}

function requiredString(value, field, { min = 1, max = 500 } = {}) {
  if (typeof value !== 'string') {
    throw badRequest(`${field} must be a string`, 'INVALID_TYPE', { field });
  }
  const trimmed = value.trim();
  if (trimmed.length < min || trimmed.length > max) {
    throw badRequest(`${field} must be between ${min} and ${max} characters`, 'INVALID_LENGTH', { field });
  }
  return trimmed;
}

function optionalString(value, field, { max = 1000 } = {}) {
  if (value === undefined || value === null || value === '') return '';
  return requiredString(String(value), field, { min: 0, max });
}

function optionalNullableString(value, field, { max = 200 } = {}) {
  if (value === undefined || value === null || value === '') return '';
  return requiredString(String(value), field, { min: 1, max });
}

function validateId(value, field = 'id') {
  const id = requiredString(String(value ?? ''), field, { min: 1, max: 100 });
  if (!/^[A-Za-z0-9_-]+$/.test(id)) {
    throw badRequest(`${field} contains invalid characters`, 'INVALID_ID', { field });
  }
  return id;
}

function toNumber(value, field) {
  if (value === '' || value === null || value === undefined) return NaN;
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num)) {
    throw badRequest(`${field} must be a valid number`, 'INVALID_NUMBER', { field });
  }
  return num;
}

function positiveInteger(value, field, { min = 1, max = Number.MAX_SAFE_INTEGER } = {}) {
  const num = toNumber(value, field);
  if (!Number.isInteger(num) || num < min || num > max) {
    throw badRequest(`${field} must be a whole number between ${min} and ${max}`, 'INVALID_NUMBER', { field });
  }
  return num;
}

function nonNegativeInteger(value, field, { max = 100000000 } = {}) {
  return positiveInteger(value, field, { min: 0, max });
}

function positiveMoney(value, field, { min = 0, max = 100000000 } = {}) {
  const num = toNumber(value, field);
  if (num < min || num > max) {
    throw badRequest(`${field} must be between ${min} and ${max}`, 'INVALID_NUMBER', { field });
  }
  return Math.round(num * 100) / 100;
}

function oneOf(value, allowed, field) {
  if (!allowed.includes(value)) {
    throw badRequest(`${field} must be one of: ${allowed.join(', ')}`, 'INVALID_ENUM', { field, allowed });
  }
  return value;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function isValidEmail(value) {
  return typeof value === 'string' && EMAIL_PATTERN.test(value.trim());
}

function validateEmail(value, field = 'email') {
  const email = requiredString(value, field, { min: 5, max: 254 }).toLowerCase();
  if (!isValidEmail(email)) {
    throw badRequest(`${field} must be a valid email address`, 'INVALID_EMAIL', { field });
  }
  return email;
}

function maybeEmail(value, field = 'email') {
  if (value === undefined || value === null || value === '') return '';
  return validateEmail(value, field);
}

function validatePhone(value, field = 'phone') {
  const phone = requiredString(value, field, { min: 7, max: 30 });
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length < 7 || digits.length > 15) {
    throw badRequest(`${field} must contain between 7 and 15 digits`, 'INVALID_PHONE', { field });
  }
  return phone;
}

function maybePhone(value, field = 'phone') {
  if (value === undefined || value === null || value === '') return '';
  return validatePhone(value, field);
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseDateOnly(value, field) {
  let date;
  if (value instanceof Date) {
    date = new Date(value.getTime());
  } else if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    const [y, m, d] = value.trim().split('-').map(Number);
    date = new Date(Date.UTC(y, m - 1, d));
    if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) {
      throw badRequest(`${field} is not a real calendar date`, 'INVALID_DATE', { field });
    }
  } else {
    date = new Date(value);
  }
  if (Number.isNaN(date.getTime())) {
    throw badRequest(`${field} must be a valid date`, 'INVALID_DATE', { field });
  }
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function startOfToday(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function nightsBetween(checkIn, checkOut) {
  return Math.max(0, Math.round((checkOut.getTime() - checkIn.getTime()) / MS_PER_DAY));
}

function validateStayDates(checkInRaw, checkOutRaw, { allowPast = false, now = new Date() } = {}) {
  const checkInDate = parseDateOnly(checkInRaw, 'checkInDate');
  const checkOutDate = parseDateOnly(checkOutRaw, 'checkOutDate');
  if (checkOutDate <= checkInDate) {
    throw badRequest('Check-out date must be after check-in date', 'INVALID_DATE_RANGE');
  }
  if (!allowPast && checkInDate < startOfToday(now)) {
    throw badRequest('Check-in date cannot be in the past', 'PAST_CHECK_IN');
  }
  const nights = nightsBetween(checkInDate, checkOutDate);
  return { checkInDate, checkOutDate, nights };
}

function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

function assertReservationStatusTransition(from, to) {
  if (from === to) return;
  const allowed = ALLOWED_RESERVATION_TRANSITIONS[from] || [];
  if (!allowed.includes(to)) {
    throw badRequest(`Cannot change reservation status from ${from} to ${to}`, 'INVALID_STATUS_TRANSITION', { from, to, allowed });
  }
}

function getTaxRate() {
  const raw = process.env.TAX_RATE;
  const n = raw === undefined || raw === '' ? 0.1 : Number(raw);
  return Number.isFinite(n) && n >= 0 && n < 1 ? n : 0.1;
}

function roundMoney(amount) {
  return Math.round((Number(amount) + Number.EPSILON) * 100) / 100;
}

function calculateReservationTotals({ nights, pricePerNight, services = [], taxRate = getTaxRate() }) {
  const roomAmount = roundMoney(nights * pricePerNight);
  const servicesAmount = roundMoney(
    (services || []).reduce((sum, s) => sum + (Number(s.qty) || 0) * (Number(s.unitPrice) || 0), 0)
  );
  const subtotal = roundMoney(roomAmount + servicesAmount);
  const tax = roundMoney(subtotal * taxRate);
  const totalAmount = roundMoney(subtotal + tax);
  return { roomAmount, servicesAmount, subtotal, tax, totalAmount };
}

function generateReservationCode() {
  const year = new Date().getUTCFullYear();
  const rand = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  return `MRT-${year}-${rand}`;
}

function generateInvoiceNumber() {
  const year = new Date().getUTCFullYear();
  const rand = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  return `INV-${year}-${rand}`;
}

// ---------------------------------------------------------------------------
// Input validators
// ---------------------------------------------------------------------------

function validateLoginInput(payload = {}) {
  if (!isPlainObject(payload)) throw badRequest('Request body must be an object', 'INVALID_BODY');
  const email = validateEmail(payload.email, 'email');
  const password = requiredString(payload.password, 'password', { min: 4, max: 200 });
  return { email, password };
}

function validateUserInput(payload = {}, { partial = false } = {}) {
  if (!isPlainObject(payload)) throw badRequest('Request body must be an object', 'INVALID_BODY');
  const need = (k) => !partial || has(payload, k);
  const data = {};
  if (need('fullName')) data.fullName = requiredString(payload.fullName, 'fullName', { min: 2, max: 120 });
  if (need('email')) data.email = validateEmail(payload.email, 'email');
  if (!partial || has(payload, 'password')) {
    if (!partial || payload.password) data.password = requiredString(payload.password, 'password', { min: 6, max: 200 });
  }
  if (need('role')) data.role = oneOf(payload.role, USER_ROLES, 'role');
  if (need('phone')) data.phone = maybePhone(payload.phone, 'phone');
  if (need('isActive')) data.isActive = Boolean(payload.isActive);
  return data;
}

function validateRoomTypeInput(payload = {}, { partial = false } = {}) {
  if (!isPlainObject(payload)) throw badRequest('Request body must be an object', 'INVALID_BODY');
  const need = (k) => !partial || has(payload, k);
  const data = {};
  if (need('name')) data.name = requiredString(payload.name, 'name', { min: 2, max: 80 });
  if (need('description')) data.description = optionalString(payload.description, 'description', { max: 1000 });
  if (need('pricePerNight')) data.pricePerNight = positiveMoney(payload.pricePerNight, 'pricePerNight', { min: 0.01 });
  if (need('capacity')) data.capacity = positiveInteger(payload.capacity, 'capacity', { min: 1, max: 20 });
  if (need('amenities')) {
    if (Array.isArray(payload.amenities)) data.amenities = payload.amenities.map((a, i) => requiredString(String(a), `amenities[${i}]`, { min: 1, max: 60 }));
    else if (typeof payload.amenities === 'string') data.amenities = payload.amenities.split(',').map((s) => s.trim()).filter(Boolean);
    else data.amenities = [];
  }
  if (need('bedType')) data.bedType = optionalString(payload.bedType, 'bedType', { max: 80 });
  if (need('isActive')) data.isActive = Boolean(payload.isActive);
  return data;
}

function validateRoomInput(payload = {}, { partial = false } = {}) {
  if (!isPlainObject(payload)) throw badRequest('Request body must be an object', 'INVALID_BODY');
  const need = (k) => !partial || has(payload, k);
  const data = {};
  if (need('roomNumber')) data.roomNumber = requiredString(payload.roomNumber, 'roomNumber', { min: 1, max: 30 }).toUpperCase();
  if (need('floor')) data.floor = payload.floor === '' || payload.floor === null || payload.floor === undefined ? 0 : nonNegativeInteger(payload.floor, 'floor', { max: 500 });
  if (need('roomType')) data.roomType = validateId(payload.roomType ?? payload.roomTypeId, 'roomType');
  if (need('status')) data.status = oneOf(payload.status, ROOM_STATUSES, 'status');
  if (need('notes')) data.notes = optionalString(payload.notes, 'notes', { max: 1000 });
  return data;
}

function validateGuestInput(payload = {}, { partial = false } = {}) {
  if (!isPlainObject(payload)) throw badRequest('Request body must be an object', 'INVALID_BODY');
  const need = (k) => !partial || has(payload, k);
  const data = {};
  // support legacy fullName for compatibility
  if (!partial && payload.fullName && !payload.firstName && !payload.lastName) {
    const parts = requiredString(payload.fullName, 'fullName', { min: 2, max: 160 }).split(/\s+/);
    data.firstName = parts.shift();
    data.lastName = parts.join(' ') || data.firstName;
  } else {
    if (need('firstName')) data.firstName = requiredString(payload.firstName, 'firstName', { min: 1, max: 80 });
    if (need('lastName')) data.lastName = requiredString(payload.lastName, 'lastName', { min: 1, max: 80 });
  }
  if (need('email')) data.email = maybeEmail(payload.email, 'email');
  if (need('phone')) data.phone = maybePhone(payload.phone, 'phone');
  if (need('address')) data.address = optionalString(payload.address, 'address', { max: 250 });
  if (need('idType')) data.idType = optionalString(payload.idType, 'idType', { max: 50 });
  if (need('idNumber')) data.idNumber = optionalString(payload.idNumber, 'idNumber', { max: 80 });
  if (need('nationality')) data.nationality = optionalString(payload.nationality, 'nationality', { max: 80 });
  return data;
}

function validateServices(services) {
  if (services === undefined || services === null) return [];
  if (!Array.isArray(services)) throw badRequest('services must be an array', 'INVALID_TYPE', { field: 'services' });
  return services.map((s, i) => {
    if (!isPlainObject(s)) throw badRequest(`services[${i}] must be an object`, 'INVALID_TYPE');
    return {
      name: requiredString(s.name, `services[${i}].name`, { min: 1, max: 120 }),
      qty: positiveInteger(s.qty, `services[${i}].qty`, { min: 1, max: 10000 }),
      unitPrice: positiveMoney(s.unitPrice, `services[${i}].unitPrice`, { min: 0, max: 10000000 }),
      date: s.date ? parseDateOnly(s.date, `services[${i}].date`) : undefined
    };
  });
}

function validateReservationInput(payload = {}, { partial = false, now = new Date() } = {}) {
  if (!isPlainObject(payload)) throw badRequest('Request body must be an object', 'INVALID_BODY');
  const need = (k) => !partial || has(payload, k);
  const data = {};
  if (need('guestId') || need('guest')) data.guest = validateId(payload.guestId ?? payload.guest, 'guestId');
  if (need('roomId') || need('room')) data.room = validateId(payload.roomId ?? payload.room, 'roomId');
  if (!partial || has(payload, 'checkInDate') || has(payload, 'checkOutDate')) {
    const stay = validateStayDates(payload.checkInDate, payload.checkOutDate, { allowPast: false, now });
    data.checkInDate = stay.checkInDate;
    data.checkOutDate = stay.checkOutDate;
  }
  if (need('adults')) data.adults = positiveInteger(payload.adults ?? 1, 'adults', { min: 1, max: 20 });
  if (need('children')) data.children = nonNegativeInteger(payload.children ?? 0, 'children', { max: 20 });
  if (need('status')) data.status = oneOf(payload.status, RESERVATION_STATUSES, 'status');
  if (need('services')) data.services = validateServices(payload.services);
  if (need('notes')) data.notes = optionalString(payload.notes ?? payload.specialRequests, 'notes', { max: 1000 });
  // support legacy numberOfGuests
  if (!partial && !has(payload, 'adults') && has(payload, 'numberOfGuests')) {
    data.adults = positiveInteger(payload.numberOfGuests, 'numberOfGuests', { min: 1, max: 20 });
    data.children = 0;
  }
  return data;
}

function validatePaymentInput(payload = {}, { partial = false } = {}) {
  if (!isPlainObject(payload)) throw badRequest('Request body must be an object', 'INVALID_BODY');
  const need = (k) => !partial || has(payload, k);
  const data = {};
  if (need('reservationId') || need('reservation')) data.reservation = validateId(payload.reservationId ?? payload.reservation, 'reservationId');
  if (need('amount')) data.amount = positiveMoney(payload.amount, 'amount', { min: 0 });
  if (need('method')) data.method = oneOf(payload.method || 'cash', PAYMENT_METHODS, 'method');
  if (need('status')) data.status = oneOf(payload.status || 'pending', PAYMENT_STATUSES, 'status');
  if (need('notes')) data.notes = optionalString(payload.notes, 'notes', { max: 500 });
  return data;
}

function validateHousekeepingInput(payload = {}, { partial = false } = {}) {
  if (!isPlainObject(payload)) throw badRequest('Request body must be an object', 'INVALID_BODY');
  const need = (k) => !partial || has(payload, k);
  const data = {};
  if (need('roomId') || need('room')) data.room = validateId(payload.roomId ?? payload.room, 'roomId');
  if (has(payload, 'assignedTo') || (!partial && payload.assignedTo)) data.assignedTo = payload.assignedTo ? validateId(payload.assignedTo, 'assignedTo') : null;
  if (need('taskType')) data.taskType = oneOf(payload.taskType || 'cleaning', TASK_TYPES, 'taskType');
  if (need('status')) data.status = oneOf(payload.status || 'pending', TASK_STATUSES, 'status');
  if (need('notes')) data.notes = optionalString(payload.notes, 'notes', { max: 500 });
  return data;
}

function validateFeedbackInput(payload = {}, { partial = false } = {}) {
  if (!isPlainObject(payload)) throw badRequest('Request body must be an object', 'INVALID_BODY');
  const need = (k) => !partial || has(payload, k);
  const data = {};
  if (need('reservationId') || need('reservation')) data.reservation = validateId(payload.reservationId ?? payload.reservation, 'reservationId');
  if (need('guestId') || need('guest')) data.guest = validateId(payload.guestId ?? payload.guest, 'guestId');
  if (need('rating')) data.rating = positiveInteger(payload.rating, 'rating', { min: 1, max: 5 });
  if (need('comment')) data.comment = optionalString(payload.comment, 'comment', { max: 1000 });
  return data;
}

module.exports = {
  USER_ROLES,
  ROOM_STATUSES,
  RESERVATION_STATUSES,
  NON_CANCELLED_RESERVATION_STATUSES,
  ACTIVE_ROOM_RESERVATION_STATUSES,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  TASK_TYPES,
  TASK_STATUSES,
  ALLOWED_RESERVATION_TRANSITIONS,
  MS_PER_DAY,
  isPlainObject,
  has,
  requiredString,
  optionalString,
  validateId,
  positiveInteger,
  nonNegativeInteger,
  positiveMoney,
  oneOf,
  isValidEmail,
  validateEmail,
  maybeEmail,
  validatePhone,
  maybePhone,
  escapeRegex,
  parseDateOnly,
  startOfToday,
  nightsBetween,
  validateStayDates,
  rangesOverlap,
  assertReservationStatusTransition,
  getTaxRate,
  roundMoney,
  calculateReservationTotals,
  generateReservationCode,
  generateInvoiceNumber,
  validateLoginInput,
  validateUserInput,
  validateRoomTypeInput,
  validateRoomInput,
  validateGuestInput,
  validateServices,
  validateReservationInput,
  validatePaymentInput,
  validateHousekeepingInput,
  validateFeedbackInput
};
