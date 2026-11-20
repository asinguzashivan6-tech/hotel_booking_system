'use strict';

const express = require('express');
const { send } = require('../utils/response');

const createAuthController = require('../controllers/authController');
const createUsersController = createAuthController; // same module exports users handlers too
const createRoomTypesController = require('../controllers/roomTypesController');
const createRoomsController = require('../controllers/roomsController');
const createGuestsController = require('../controllers/guestsController');
const createReservationsController = require('../controllers/reservationsController');
const createPaymentsController = require('../controllers/paymentsController');
const createHousekeepingController = require('../controllers/housekeepingController');
const createFeedbackController = require('../controllers/feedbackController');
const createDashboardController = require('../controllers/dashboardController');

const createAuthRouter = require('./auth');
const createUsersRouter = require('./users');
const createRoomTypesRouter = require('./roomTypes');
const createRoomsRouter = require('./rooms');
const createGuestsRouter = require('./guests');
const createReservationsRouter = require('./reservations');
const createPaymentsRouter = require('./payments');
const createHousekeepingRouter = require('./housekeeping');
const createFeedbackRouter = require('./feedback');
const createDashboardRouter = require('./dashboard');

function createApiRouter(services) {
  const router = express.Router();

  router.get('/health', (req, res) => {
    send(res, {
      data: {
        status: 'ok',
        service: 'Marriott Hotel Management System API (MHMS)',
        version: '3.0.0',
        timestamp: new Date().toISOString()
      }
    });
  });

  const authController = createAuthController(services.auth);

  router.use('/auth', createAuthRouter(authController));
  router.use('/users', createUsersRouter(authController));
  router.use('/room-types', createRoomTypesRouter(createRoomTypesController(services.roomTypes)));
  router.use('/rooms', createRoomsRouter(createRoomsController(services.rooms)));
  router.use('/guests', createGuestsRouter(createGuestsController(services.guests)));
  router.use('/reservations', createReservationsRouter(createReservationsController(services.reservations)));
  router.use('/payments', createPaymentsRouter(createPaymentsController(services.payments)));
  router.use('/housekeeping', createHousekeepingRouter(createHousekeepingController(services.housekeeping)));
  router.use('/feedback', createFeedbackRouter(createFeedbackController(services.feedback)));
  router.use('/dashboard', createDashboardRouter(createDashboardController(services.dashboard)));

  // compatibility alias
  router.use('/reports', createDashboardRouter(createDashboardController(services.dashboard)));

  return router;
}

module.exports = createApiRouter;
