'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { createApp } = require('../app');
const { createFakeRepositories } = require('./fakes');
const { day, resetAndSeed, bookingPayload } = require('./helpers');

const repositories = createFakeRepositories();
const app = createApp({ repositories });

let server;
let baseUrl;
let fixtures;

test.before(async () => {
  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

test.beforeEach(async () => {
  fixtures = await resetAndSeed(repositories);
});

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch (_) {
    body = text;
  }
  return { status: response.status, body };
}

test('GET /api/health reports service status', async () => {
  const { status, body } = await request('/api/health');
  assert.equal(status, 200);
  assert.equal(body.success, true);
  assert.equal(body.data.status, 'ok');
  assert.equal(body.data.version, '2.0.0');
});

test('GET / serves the dashboard HTML', async () => {
  const response = await fetch(baseUrl);
  const html = await response.text();
  assert.equal(response.status, 200);
  assert.match(html, /StayEase Hotel Booking System/);
  assert.match(html, /id="bookingForm"/);
});

test('rooms support full CRUD with a consistent response envelope', async () => {
  const created = await request('/api/rooms', {
    method: 'POST',
    body: JSON.stringify({
      roomNumber: 's-777',
      type: 'Single',
      pricePerNight: 55,
      capacity: 1,
      status: 'Available',
      floor: 1,
      description: 'Test room'
    })
  });
  assert.equal(created.status, 201);
  assert.equal(created.body.success, true);
  assert.equal(created.body.data.roomNumber, 'S-777');
  const id = created.body.data._id;

  const listed = await request('/api/rooms');
  assert.equal(listed.status, 200);
  assert.equal(listed.body.data.length, 4);

  const fetched = await request(`/api/rooms/${id}`);
  assert.equal(fetched.body.data.type, 'Single');

  const updated = await request(`/api/rooms/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ pricePerNight: 60 })
  });
  assert.equal(updated.status, 200);
  assert.equal(updated.body.data.pricePerNight, 60);

  const deleted = await request(`/api/rooms/${id}`, { method: 'DELETE' });
  assert.equal(deleted.status, 200);
  assert.equal(deleted.body.success, true);

  const afterDelete = await request(`/api/rooms/${id}`);
  assert.equal(afterDelete.status, 404);
});

test('guests support full CRUD', async () => {
  const created = await request('/api/guests', {
    method: 'POST',
    body: JSON.stringify({
      fullName: 'Grace Hopper',
      email: 'GRACE@EXAMPLE.COM',
      phone: '+254700111222',
      address: 'Mombasa'
    })
  });
  assert.equal(created.status, 201);
  assert.equal(created.body.data.email, 'grace@example.com');
  const id = created.body.data._id;

  const updated = await request(`/api/guests/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ loyaltyPoints: 75 })
  });
  assert.equal(updated.body.data.loyaltyPoints, 75);

  const deleted = await request(`/api/guests/${id}`, { method: 'DELETE' });
  assert.equal(deleted.status, 200);
});

test('bookings support full CRUD and server-side price calculation', async () => {
  const payload = bookingPayload({ guestId: fixtures.guestB._id, roomId: fixtures.roomB._id });
  const created = await request('/api/bookings', {
    method: 'POST',
    body: JSON.stringify({ ...payload, nightlyRate: 1, totalPrice: 1 })
  });
  assert.equal(created.status, 201);
  assert.equal(created.body.data.totalPrice, 900);
  const id = created.body.data._id;

  const fetched = await request(`/api/bookings/${id}`);
  assert.equal(fetched.body.data.guestName, 'Alan Turing');

  const updated = await request(`/api/bookings/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ ...payload, checkOutDate: day(15) })
  });
  assert.equal(updated.status, 200);
  assert.equal(updated.body.data.totalPrice, 1500);

  const deleted = await request(`/api/bookings/${id}`, { method: 'DELETE' });
  assert.equal(deleted.status, 200);
});

test('bookings can be searched and filtered through query parameters', async () => {
  await request('/api/bookings', {
    method: 'POST',
    body: JSON.stringify(bookingPayload({ guestId: fixtures.guestB._id, roomId: fixtures.roomB._id }))
  });

  const search = await request('/api/bookings?search=alan');
  assert.equal(search.body.data.length, 1);
  assert.equal(search.body.data[0].guestName, 'Alan Turing');

  const status = await request('/api/bookings?status=Confirmed');
  assert.equal(status.body.data.length, 2);

  const type = await request('/api/bookings?roomType=Suite');
  assert.equal(type.body.data.length, 1);
});

test('booking status can be advanced with PATCH /:id/status', async () => {
  const id = fixtures.bookingA._id;
  const checkedIn = await request(`/api/bookings/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'CheckedIn' })
  });
  assert.equal(checkedIn.status, 200);
  assert.equal(checkedIn.body.data.status, 'CheckedIn');

  const checkedOut = await request(`/api/bookings/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'CheckedOut' })
  });
  assert.equal(checkedOut.status, 200);
  assert.equal(checkedOut.body.data.status, 'CheckedOut');
});

test('invalid IDs, missing records and bad input use correct status codes', async () => {
  const invalid = await request('/api/bookings/not-an-id');
  assert.equal(invalid.status, 400);
  assert.equal(invalid.body.code, 'INVALID_ID');

  const missing = await request('/api/bookings/b999');
  assert.equal(missing.status, 404);
  assert.equal(missing.body.code, 'BOOKING_NOT_FOUND');

  const invalidBody = await request('/api/bookings', {
    method: 'POST',
    body: JSON.stringify({ guestId: 'g1' })
  });
  assert.equal(invalidBody.status, 400);
  assert.equal(invalidBody.body.success, false);
  assert.ok(invalidBody.body.message);
});

test('overlapping bookings return a 409 conflict', async () => {
  const response = await request('/api/bookings', {
    method: 'POST',
    body: JSON.stringify(bookingPayload({
      guestId: fixtures.guestB._id,
      roomId: fixtures.roomA._id,
      checkInDate: day(6),
      checkOutDate: day(7)
    }))
  });
  assert.equal(response.status, 409);
  assert.equal(response.body.code, 'ROOM_NOT_AVAILABLE');
});

test('a checked-in booking cannot be deleted', async () => {
  await request(`/api/bookings/${fixtures.bookingA._id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'CheckedIn' })
  });
  const response = await request(`/api/bookings/${fixtures.bookingA._id}`, { method: 'DELETE' });
  assert.equal(response.status, 409);
  assert.equal(response.body.code, 'BOOKING_CHECKED_IN');
});

test('report summary endpoint returns dashboard figures', async () => {
  const { status, body } = await request('/api/reports/summary');
  assert.equal(status, 200);
  assert.equal(body.data.totals.bookings, 1);
  assert.equal(body.data.totals.revenue, 210);
  assert.equal(body.data.statusCounts.Confirmed, 1);
});

test('unknown API routes return a JSON 404', async () => {
  const { status, body } = await request('/api/does-not-exist');
  assert.equal(status, 404);
  assert.equal(body.success, false);
  assert.equal(body.code, 'ROUTE_NOT_FOUND');
});
