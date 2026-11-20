'use strict';

const asyncHandler = require('../utils/asyncHandler');
const { send } = require('../utils/response');

function createPaymentsController(service) {
  return {
    list: asyncHandler(async (req, res) => { send(res, { data: await service.list(req.query) }); }),
    get: asyncHandler(async (req, res) => { send(res, { data: await service.get(req.params.id) }); }),
    create: asyncHandler(async (req, res) => { send(res, { status: 201, message: 'Invoice/payment created successfully', data: await service.create(req.body, req.user) }); }),
    update: asyncHandler(async (req, res) => { send(res, { message: 'Payment updated successfully', data: await service.update(req.params.id, req.body, req.user) }); }),
    remove: asyncHandler(async (req, res) => { send(res, { message: 'Invoice voided successfully', data: await service.remove(req.params.id, req.user) }); })
  };
}

module.exports = createPaymentsController;
