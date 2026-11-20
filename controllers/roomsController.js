'use strict';

const asyncHandler = require('../utils/asyncHandler');
const { send } = require('../utils/response');

function createRoomsController(service) {
  return {
    list: asyncHandler(async (req, res) => { send(res, { data: await service.list(req.query) }); }),
    get: asyncHandler(async (req, res) => { send(res, { data: await service.get(req.params.id) }); }),
    create: asyncHandler(async (req, res) => { send(res, { status: 201, message: 'Room created successfully', data: await service.create(req.body) }); }),
    update: asyncHandler(async (req, res) => { send(res, { message: 'Room updated successfully', data: await service.update(req.params.id, req.body) }); }),
    remove: asyncHandler(async (req, res) => { send(res, { message: 'Room deleted successfully', data: await service.remove(req.params.id) }); })
  };
}

module.exports = createRoomsController;
