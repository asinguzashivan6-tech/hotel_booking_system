'use strict';

const { MS_PER_DAY, startOfToday } = require('../utils/validation');

function day(offset) {
  return new Date(startOfToday().getTime() + offset * MS_PER_DAY).toISOString().slice(0, 10);
}

function dateAt(offset) {
  return new Date(day(offset));
}

async function resetAndSeed(repositories) {
  repositories.rooms.reset();
  repositories.guests.reset();
  repositories.bookings.reset();

  const roomA = await repositories.rooms.create({
    roomNumber: 'D-201',
    type: 'Double',
    pricePerNight: 70,
    capacity: 2,
    status: 'Available',
    floor: 2,
    description: 'Test double room'
  });

  const roomB = await repositories.rooms.create({
    roomNumber: 'SU-401',
    type: 'Suite',
    pricePerNight: 300,
    capacity: 4,
    status: 'Available',
    floor: 4,
    description: 'Test suite'
  });

  const maintenanceRoom = await repositories.rooms.create({
    roomNumber: 'DL-302',
    type: 'Deluxe',
    pricePerNight: 120,
    capacity: 3,
    status: 'Maintenance',
    floor: 3,
    description: 'Under repair'
  });

  const guestA = await repositories.guests.create({
    fullName: 'Ada Lovelace',
    email: 'ada@example.com',
    phone: '+254712345678',
    address: 'Nairobi',
    loyaltyPoints: 20
  });

  const guestB = await repositories.guests.create({
    fullName: 'Alan Turing',
    email: 'alan@example.com',
    phone: '+254723456789',
    address: 'Kisumu',
    loyaltyPoints: 0
  });

  const bookingA = await repositories.bookings.create({
    guest: guestA._id,
    room: roomA._id,
    guestName: guestA.fullName,
    guestEmail: guestA.email,
    guestPhone: guestA.phone,
    roomNumber: roomA.roomNumber,
    roomType: roomA.type,
    checkInDate: dateAt(5),
    checkOutDate: dateAt(8),
    numberOfGuests: 2,
    nightlyRate: 70,
    totalPrice: 210,
    status: 'Confirmed',
    specialRequests: ''
  });

  return { roomA, roomB, maintenanceRoom, guestA, guestB, bookingA };
}

function bookingPayload(overrides = {}) {
  return {
    guestId: 'g1',
    roomId: 'r2',
    checkInDate: day(10),
    checkOutDate: day(13),
    numberOfGuests: 2,
    status: 'Confirmed',
    specialRequests: 'Window seat',
    ...overrides
  };
}

module.exports = { day, dateAt, resetAndSeed, bookingPayload };
