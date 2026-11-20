'use strict';

const express = require('express');
const { requireAuth, requireRoles } = require('../middleware/auth');

function createFeedbackRouter(controller) {
  const router = express.Router();
  router.use(requireAuth);
  router.get('/', requireRoles('admin', 'frontdesk'), controller.list);
  router.post('/', requireRoles('admin', 'frontdesk'), controller.create);
  router.get('/:id', requireRoles('admin', 'frontdesk'), controller.get);
  router.put('/:id', requireRoles('admin', 'frontdesk'), controller.update);
  router.delete('/:id', requireRoles('admin'), controller.remove);
  return router;
}

module.exports = createFeedbackRouter;
