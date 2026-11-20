'use strict';

const express = require('express');
const { requireAuth, requireRoles } = require('../middleware/auth');

function createHousekeepingRouter(controller) {
  const router = express.Router();
  router.use(requireAuth);
  router.get('/', requireRoles('admin', 'frontdesk', 'housekeeping'), controller.list);
  router.post('/', requireRoles('admin', 'frontdesk'), controller.create);
  router.get('/:id', requireRoles('admin', 'frontdesk', 'housekeeping'), controller.get);
  router.put('/:id', requireRoles('admin', 'frontdesk', 'housekeeping'), controller.update);
  router.delete('/:id', requireRoles('admin'), controller.remove);
  return router;
}

module.exports = createHousekeepingRouter;
