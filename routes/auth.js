'use strict';

const express = require('express');
const { requireAuth } = require('../middleware/auth');

function createAuthRouter(controller) {
  const router = express.Router();
  router.post('/login', controller.login);
  router.get('/me', requireAuth, controller.me);
  return router;
}

module.exports = createAuthRouter;
