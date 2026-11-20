'use strict';

const express = require('express');
const { requireAuth, requireRoles } = require('../middleware/auth');

function createGuestsRouter(controller) {
  const router = express.Router();
  router.use(requireAuth);
  router.get('/', requireRoles('admin', 'frontdesk'), controller.list);
  router.get('/:id', requireRoles('admin', 'frontdesk'), controller.get);
  router.post('/', requireRoles('admin', 'frontdesk'), controller.create);
  router.put('/:id', requireRoles('admin', 'frontdesk'), controller.update);
  router.delete('/:id', requireRoles('admin'), controller.remove);
  return router;
}

module.exports = createGuestsRouter;
