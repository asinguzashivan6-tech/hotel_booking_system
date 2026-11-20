'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { createServices } = require('../services');
const { createFakeRepositories } = require('./fakes');
const { day, resetAndSeed, bookingPayload } = require('./helpers');

function setup() {
  const repositories = createFakeRepositories();
  return { repositories, services: createServices(repositories) };
}

test('booking creation derives price from the room and stores guest/room snapshots', async () => {
  const { repositories, services } = setup();
  await resetAndSeed(repositories);

  const booking = await services.bookings.create(bookingPayload());

  assert.equal(booking.nightlyRate, 300);
  assert.equal(booking.totalPrice, 900);
  assert.equal(booking.guestName, 'Alan Turing');
  assert.equal(booking.roomNumber, 'SU-401');
  assert.equal(booking.status, 'Confirmed');
  assert.equal(booking.nights, 3);
});

test('booking creation rejects a room under maintenance', async () => {
  const { repositories, services } = setup();
  const seeded = await resetAndSeed(repositories);

  await assert.rejects(
    services.bookings.create(bookingPayload({ roomId: seeded.maintenanceRoom._id })),
    /under maintenance/
  );
});

test('booking creation rejects more guests than the room capacity', async () => {
  const { repositories, services } = setup();
  await resetAndSeed(repositories);

  await assert.rejects(
    services.bookings.create(bookingPayload({ numberOfGuests: 5 })),
    /at most 4 guest/
  );
});

test('booking creation rejects overlapping active bookings for the same room', async () => {
  const { repositories, services } = setup();
  const seeded = await resetAndSeed(repositories);

  await assert.rejects(
    services.bookings.create(bookingPayload({
      roomId: seeded.roomA._id,
      checkInDate: day(6),
      checkOutDate: day(7)
    })),
    /already booked/
  );
});

test('booking creation rejects a past check-in date', async () => {
  const { repositories, services } = setup();
  await resetAndSeed(repositories);

  await assert.rejects(
    services.bookings.create(bookingPayload({ checkInDate: day(-1), checkOutDate: day(2) })),
    /cannot be in the past/
  );
});

test('updating dates recalculates the booking total from the current room price', async () => {
  const { repositories, services } = setup();
  const seeded = await resetAndSeed(repositories);

  const updated = await services.bookings.update(seeded.bookingA._id, {
    checkInDate: day(6),
    checkOutDate: day(10)
  });

  assert.equal(updated.totalPrice, 280);
  assert.equal(updated.nights, 4);
});

test('a checked-in booking cannot have its room or dates changed', async () => {
  const { repositories, services } = setup();
  const seeded = await resetAndSeed(repositories);
  await repositories.bookings.update(seeded.bookingA._id, { status: 'CheckedIn' });

  await assert.rejects(
    services.bookings.update(seeded.bookingA._id, { numberOfGuests: 1 }),
    /Only a confirmed booking/
  );
});

test('status lifecycle awards loyalty points at check-out', async () => {
  const { repositories, services } = setup();
  await resetAndSeed(repositories);

  const created = await services.bookings.create(bookingPayload({ guestId: 'g2' }));
  const checkedIn = await services.bookings.changeStatus(created._id, 'CheckedIn');
  const checkedOut = await services.bookings.changeStatus(created._id, 'CheckedOut');

  assert.equal(checkedIn.status, 'CheckedIn');
  assert.equal(checkedOut.status, 'CheckedOut');

  const guest = await services.guests.get('g2');
  assert.equal(guest.loyaltyPoints, 30);
});

test('status cannot skip from Confirmed to CheckedOut', async () => {
  const { repositories, services } = setup();
  const seeded = await resetAndSeed(repositories);

  await assert.rejects(
    services.bookings.changeStatus(seeded.bookingA._id, 'CheckedOut'),
    /Cannot change status/
  );
});

test('a checked-in booking cannot be deleted', async () => {
  const { repositories, services } = setup();
  const seeded = await resetAndSeed(repositories);
  await repositories.bookings.update(seeded.bookingA._id, { status: 'CheckedIn' });

  await assert.rejects(services.bookings.remove(seeded.bookingA._id), /checked out/);
});

test('rooms enforce unique numbers and cannot be deleted with active bookings', async () => {
  const { repositories, services } = setup();
  const seeded = await resetAndSeed(repositories);

  await assert.rejects(
    services.rooms.create({
      roomNumber: 'd-201',
      type: 'Single',
      pricePerNight: 50,
      capacity: 1,
      status: 'Available'
    }),
    /already exists/
  );

  await assert.rejects(services.rooms.remove(seeded.roomA._id), /active bookings/);

  const freshRoom = await services.rooms.create({
    roomNumber: 'S-777',
    type: 'Single',
    pricePerNight: 50,
    capacity: 1,
    status: 'Available'
  });
  assert.equal(freshRoom.roomNumber, 'S-777');
});

test('guests enforce unique email and cannot be deleted with booking history', async () => {
  const { repositories, services } = setup();
  const seeded = await resetAndSeed(repositories);

  await assert.rejects(
    services.guests.create({
      fullName: 'Another Ada',
      email: 'ADA@example.com',
      phone: '0700000000'
    }),
    /already exists/
  );

  await assert.rejects(services.guests.remove(seeded.guestA._id), /booking history/);
});

test('report summary returns totals, status counts and revenue by room type', async () => {
  const { repositories, services } = setup();
  await resetAndSeed(repositories);

  const report = await services.reports.summary();

  assert.equal(report.totals.bookings, 1);
  assert.equal(report.totals.rooms, 3);
  assert.equal(report.totals.guests, 2);
  assert.equal(report.totals.revenue, 210);
  assert.equal(report.statusCounts.Confirmed, 1);
  assert.equal(report.revenueByType.Double, 210);
});
