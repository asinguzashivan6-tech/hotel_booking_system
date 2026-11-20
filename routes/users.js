'use strict';

const express = require('express');
const { requireAuth, requireRoles } = require('../middleware/auth');

function createUsersRouter(controller) {
  const router = express.Router();
  router.use(requireAuth, requireRoles('admin'));
  router.get('/', controller.listUsers);
  router.post('/', controller.createUser);
  router.get('/:id', controller.getUser);
  router.put('/:id', controller.updateUser);
  router.delete('/:id', controller.removeUser);
  return router;
}

module.exports = createUsersRouter;
