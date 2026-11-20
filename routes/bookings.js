'use strict';

const express = require('express');

function createBookingsRouter(controller) {
  const router = express.Router();

  router.get('/', controller.list);
  router.post('/', controller.create);
  router.get('/:id', controller.get);
  router.put('/:id', controller.update);
  router.patch('/:id/status', controller.changeStatus);
  router.delete('/:id', controller.remove);

  return router;
}

module.exports = createBookingsRouter;
