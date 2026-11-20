'use strict';

const asyncHandler = require('../utils/asyncHandler');
const { send } = require('../utils/response');

function createAuthController(service) {
  return {
    login: asyncHandler(async (req, res) => {
      const result = await service.login(req.body);
      send(res, { message: 'Login successful', data: result });
    }),
    me: asyncHandler(async (req, res) => {
      const user = await service.getUser(req.user.sub);
      send(res, { data: user });
    }),
    listUsers: asyncHandler(async (req, res) => {
      const users = await service.listUsers(req.query);
      send(res, { data: users });
    }),
    getUser: asyncHandler(async (req, res) => {
      const user = await service.getUser(req.params.id);
      send(res, { data: user });
    }),
    createUser: asyncHandler(async (req, res) => {
      const user = await service.createUser(req.body);
      send(res, { status: 201, message: 'User created successfully', data: user });
    }),
    updateUser: asyncHandler(async (req, res) => {
      const user = await service.updateUser(req.params.id, req.body);
      send(res, { message: 'User updated successfully', data: user });
    }),
    removeUser: asyncHandler(async (req, res) => {
      const user = await service.removeUser(req.params.id);
      send(res, { message: 'User deactivated successfully', data: user });
    })
  };
}

module.exports = createAuthController;
