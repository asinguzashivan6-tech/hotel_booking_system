'use strict';

const express = require('express');

function createReportsRouter(controller) {
  const router = express.Router();
  router.get('/summary', controller.summary);
  return router;
}

module.exports = createReportsRouter;
