'use strict';

const express = require('express');
const { requireAuth, requireRoles } = require('../middleware/auth');

function createDashboardRouter(controller) {
  const router = express.Router();
  router.get('/summary', requireAuth, requireRoles('admin', 'frontdesk', 'housekeeping'), controller.summary);
  return router;
}

module.exports = createDashboardRouter;
