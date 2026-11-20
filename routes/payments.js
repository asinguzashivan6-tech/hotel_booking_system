'use strict';

const express = require('express');
const { requireAuth, requireRoles } = require('../middleware/auth');

function createPaymentsRouter(controller) {
  const router = express.Router();
  router.use(requireAuth, requireRoles('admin', 'frontdesk'));
  router.get('/', controller.list);
  router.post('/', controller.create);
  router.get('/:id', controller.get);
  router.put('/:id', controller.update);
  router.delete('/:id', requireRoles('admin'), controller.remove); // void admin only
  return router;
}

module.exports = createPaymentsRouter;
