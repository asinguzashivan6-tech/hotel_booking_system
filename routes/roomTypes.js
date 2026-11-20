'use strict';

const express = require('express');
const { requireAuth, requireRoles } = require('../middleware/auth');

function createRoomTypesRouter(controller) {
  const router = express.Router();
  router.use(requireAuth);
  router.get('/', requireRoles('admin', 'frontdesk', 'housekeeping'), controller.list);
  router.get('/:id', requireRoles('admin', 'frontdesk', 'housekeeping'), controller.get);
  router.post('/', requireRoles('admin'), controller.create);
  router.put('/:id', requireRoles('admin'), controller.update);
  router.delete('/:id', requireRoles('admin'), controller.remove);
  return router;
}

module.exports = createRoomTypesRouter;
