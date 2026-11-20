'use strict';

const express = require('express');
const { requireAuth, requireRoles } = require('../middleware/auth');

function createReservationsRouter(controller) {
  const router = express.Router();
  router.use(requireAuth);
  router.get('/', requireRoles('admin', 'frontdesk'), controller.list);
  router.post('/', requireRoles('admin', 'frontdesk'), controller.create);
  router.get('/:id', requireRoles('admin', 'frontdesk'), controller.get);
  router.put('/:id', requireRoles('admin', 'frontdesk'), controller.update);
  router.delete('/:id', requireRoles('admin', 'frontdesk'), controller.remove);
  router.patch('/:id/check-in', requireRoles('admin', 'frontdesk'), controller.checkIn);
  router.patch('/:id/check-out', requireRoles('admin', 'frontdesk'), controller.checkOut);
  router.post('/:id/services', requireRoles('admin', 'frontdesk'), controller.addService);
  router.delete('/:id/services/:serviceId', requireRoles('admin', 'frontdesk'), controller.removeService);
  return router;
}

module.exports = createReservationsRouter;
