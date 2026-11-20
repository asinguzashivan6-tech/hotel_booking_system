'use strict';

const AuthService = require('./AuthService');
const RoomTypeService = require('./RoomTypeService');
const RoomService = require('./RoomService');
const GuestService = require('./GuestService');
const ReservationService = require('./ReservationService');
const PaymentService = require('./PaymentService');
const HousekeepingService = require('./HousekeepingService');
const FeedbackService = require('./FeedbackService');
const DashboardService = require('./DashboardService');

function createServices(repositories) {
  const { users, roomTypes, rooms, guests, reservations, payments, housekeepingTasks, feedback } = repositories;
  return {
    auth: new AuthService({ users }),
    roomTypes: new RoomTypeService({ roomTypes, rooms }),
    rooms: new RoomService({ rooms, roomTypes, reservations }),
    guests: new GuestService({ guests, reservations }),
    reservations: new ReservationService({ reservations, rooms, guests, roomTypes, payments, housekeepingTasks, users }),
    payments: new PaymentService({ payments, reservations }),
    housekeeping: new HousekeepingService({ housekeepingTasks, rooms, users }),
    feedback: new FeedbackService({ feedback, reservations, guests }),
    dashboard: new DashboardService({ reservations, rooms, guests, payments, housekeepingTasks })
  };
}

module.exports = {
  createServices,
  AuthService,
  RoomTypeService,
  RoomService,
  GuestService,
  ReservationService,
  PaymentService,
  HousekeepingService,
  FeedbackService,
  DashboardService
};
