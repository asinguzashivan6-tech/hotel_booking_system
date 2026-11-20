'use strict';

const { createMongoRepository } = require('./createMongoRepository');
const User = require('../models/User');
const RoomType = require('../models/RoomType');
const Room = require('../models/Room');
const Guest = require('../models/Guest');
const Reservation = require('../models/Reservation');
const Payment = require('../models/Payment');
const HousekeepingTask = require('../models/HousekeepingTask');
const Feedback = require('../models/Feedback');
const { NON_CANCELLED_RESERVATION_STATUSES } = require('../utils/validation');

const users = createMongoRepository(User, {
  searchFields: ['fullName', 'email', 'phone', 'role'],
  defaultSort: { createdAt: -1 }
});

const roomTypes = createMongoRepository(RoomType, {
  searchFields: ['name', 'description', 'bedType'],
  defaultSort: { name: 1 }
});

const rooms = createMongoRepository(Room, {
  searchFields: ['roomNumber', 'notes', 'status'],
  defaultPopulate: [{ path: 'roomType' }],
  defaultSort: { roomNumber: 1 },
  defaultFilter: { isDeleted: { $ne: true } }
});

const guests = createMongoRepository(Guest, {
  searchFields: ['firstName', 'lastName', 'email', 'phone', 'address', 'idNumber', 'nationality'],
  defaultSort: { createdAt: -1 },
  defaultFilter: { isDeleted: { $ne: true } }
});

const reservationsBase = createMongoRepository(Reservation, {
  searchFields: ['reservationCode', 'status', 'notes'],
  defaultPopulate: [
    { path: 'guest' },
    { path: 'room', populate: { path: 'roomType' } },
    { path: 'createdBy', select: 'fullName email role' }
  ],
  defaultSort: { createdAt: -1 },
  defaultFilter: { isDeleted: { $ne: true } }
});

const reservations = {
  ...reservationsBase,
  async hasOverlap({ roomId, checkInDate, checkOutDate, excludeId = null }) {
    const filter = {
      room: reservationsBase.validateId(roomId),
      isDeleted: { $ne: true },
      status: { $in: NON_CANCELLED_RESERVATION_STATUSES },
      checkInDate: { $lt: new Date(checkOutDate) },
      checkOutDate: { $gt: new Date(checkInDate) }
    };
    if (excludeId) filter._id = { $ne: reservationsBase.validateId(excludeId) };
    return (await reservationsBase.count(filter)) > 0;
  },
  async countActiveForRoom(roomId) {
    return reservationsBase.count({
      room: reservationsBase.validateId(roomId),
      isDeleted: { $ne: true },
      status: { $in: NON_CANCELLED_RESERVATION_STATUSES }
    });
  },
  async countForGuest(guestId) {
    return reservationsBase.count({ guest: reservationsBase.validateId(guestId), isDeleted: { $ne: true } });
  }
};

const payments = createMongoRepository(Payment, {
  searchFields: ['invoiceNumber', 'status', 'method', 'notes'],
  defaultPopulate: [
    { path: 'reservation', populate: [{ path: 'guest' }, { path: 'room', populate: { path: 'roomType' } }] },
    { path: 'receivedBy', select: 'fullName email role' }
  ],
  defaultSort: { createdAt: -1 }
});

const housekeepingTasks = createMongoRepository(HousekeepingTask, {
  searchFields: ['taskType', 'status', 'notes'],
  defaultPopulate: [
    { path: 'room', populate: { path: 'roomType' } },
    { path: 'assignedTo', select: 'fullName email role' }
  ],
  defaultSort: { createdAt: -1 }
});

const feedback = createMongoRepository(Feedback, {
  searchFields: ['comment'],
  defaultPopulate: [{ path: 'guest' }, { path: 'reservation' }],
  defaultSort: { createdAt: -1 }
});

module.exports = {
  users,
  roomTypes,
  rooms,
  guests,
  reservations,
  payments,
  housekeepingTasks,
  feedback
};
