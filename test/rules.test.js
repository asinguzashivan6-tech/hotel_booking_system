'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const rules = require('../utils/validation');
const { day, dateAt } = require('./helpers');

test('email validation accepts valid addresses and rejects malformed ones', () => {
  assert.equal(rules.isValidEmail('guest@example.com'), true);
  assert.equal(rules.isValidEmail('guest.name+tag@university.ac.ke'), true);
  assert.equal(rules.isValidEmail('guest@example'), false);
  assert.equal(rules.isValidEmail('guest at example.com'), false);
  assert.throws(() => rules.validateEmail('bad-email'), /valid email/);
});

test('phone validation requires 7 to 15 digits', () => {
  assert.equal(rules.validatePhone('+254 712 345 678'), '+254 712 345 678');
  assert.throws(() => rules.validatePhone('12345'), /7 and 15 digits/);
  assert.throws(() => rules.validatePhone('1234567890123456'), /7 and 15 digits/);
});

test('date parsing rejects impossible calendar dates', () => {
  assert.throws(() => rules.parseDateOnly('2026-02-30', 'checkInDate'), /real calendar date/);
  assert.throws(() => rules.parseDateOnly('not-a-date', 'checkInDate'), /valid date/);
  assert.equal(rules.parseDateOnly('2026-12-24').toISOString().slice(0, 10), '2026-12-24');
});

test('nightsBetween counts whole UTC days', () => {
  assert.equal(rules.nightsBetween(dateAt(2), dateAt(5)), 3);
  assert.equal(rules.nightsBetween(dateAt(0), dateAt(1)), 1);
});

test('stay validation rejects reversed, past and excessively long stays', () => {
  assert.throws(() => rules.validateStayDates(day(10), day(8)), /after check-in/);
  assert.throws(() => rules.validateStayDates(day(10), day(10)), /after check-in/);
  assert.throws(() => rules.validateStayDates(day(-2), day(2)), /cannot be in the past/);
  assert.throws(() => rules.validateStayDates(day(1), day(400)), /365 nights/);
});

test('validateStayDates allows past dates when explicitly permitted', () => {
  const stay = rules.validateStayDates(day(-4), day(-1), { allowPast: true });
  assert.equal(stay.nights, 3);
});

test('calculateTotal multiplies nights by nightly rate and rounds to cents', () => {
  assert.equal(rules.calculateTotal(3, 70), 210);
  assert.equal(rules.calculateTotal(2, 33.33), 66.66);
});

test('rangesOverlap implements half-open date intervals', () => {
  const a = [dateAt(1), dateAt(4)];
  assert.equal(rules.rangesOverlap(a[0], a[1], dateAt(3), dateAt(6)), true);
  assert.equal(rules.rangesOverlap(a[0], a[1], dateAt(4), dateAt(6)), false);
  assert.equal(rules.rangesOverlap(a[0], a[1], dateAt(-2), dateAt(1)), false);
});

test('status transitions follow the booking lifecycle', () => {
  assert.doesNotThrow(() => rules.assertStatusTransition('Confirmed', 'CheckedIn'));
  assert.doesNotThrow(() => rules.assertStatusTransition('CheckedIn', 'CheckedOut'));
  assert.doesNotThrow(() => rules.assertStatusTransition('Confirmed', 'Cancelled'));
  assert.throws(() => rules.assertStatusTransition('CheckedOut', 'Confirmed'), /Cannot change status/);
  assert.throws(() => rules.assertStatusTransition('Cancelled', 'CheckedIn'), /Cannot change status/);
  assert.doesNotThrow(() => rules.assertStatusTransition('Confirmed', 'Confirmed'));
});

test('room input is normalised and validated', () => {
  const data = rules.validateRoomInput({
    roomNumber: ' d-201 ',
    type: 'Double',
    pricePerNight: '70.5',
    capacity: '2',
    status: 'Available',
    floor: '2',
    description: '  Corner room  '
  });
  assert.equal(data.roomNumber, 'D-201');
  assert.equal(data.pricePerNight, 70.5);
  assert.equal(data.capacity, 2);
  assert.equal(data.description, 'Corner room');
  assert.throws(() => rules.validateRoomInput({ roomNumber: 'X', type: 'Tent' }), /valid room type/);
});

test('guest input lowercases email and validates required fields', () => {
  const data = rules.validateGuestInput({
    fullName: '  Grace Mutua ',
    email: ' GRACE@EXAMPLE.COM ',
    phone: '0712345678'
  });
  assert.equal(data.fullName, 'Grace Mutua');
  assert.equal(data.email, 'grace@example.com');
  assert.throws(() => rules.validateGuestInput({ fullName: 'A', email: 'a@b.co' }), /valid email/);
});

test('booking input ignores client-supplied prices', () => {
  const data = rules.validateBookingInput({
    guestId: 'g1',
    roomId: 'r1',
    checkInDate: day(4),
    checkOutDate: day(6),
    numberOfGuests: 2,
    nightlyRate: 1,
    totalPrice: 2
  });
  assert.equal(data.nightlyRate, undefined);
  assert.equal(data.totalPrice, undefined);
  assert.equal(data.guest, 'g1');
  assert.equal(data.room, 'r1');
});

test('partial booking validation only includes supplied fields', () => {
  const data = rules.validateBookingInput({ status: 'Cancelled' }, { partial: true });
  assert.deepEqual(data, { status: 'Cancelled' });
});

test('escapeRegex neutralises regex metacharacters used in search', () => {
  assert.equal(rules.escapeRegex('D-201 (deluxe)'), 'D-201 \\(deluxe\\)');
});
