'use strict';

const asyncHandler = require('../utils/asyncHandler');
const { send } = require('../utils/response');

function createReservationsController(service) {
  return {
    list: asyncHandler(async (req, res) => { send(res, { data: await service.list(req.query) }); }),
    get: asyncHandler(async (req, res) => { send(res, { data: await service.get(req.params.id) }); }),
    create: asyncHandler(async (req, res) => { send(res, { status: 201, message: 'Reservation created successfully', data: await service.create(req.body, req.user) }); }),
    update: asyncHandler(async (req, res) => { send(res, { message: 'Reservation updated successfully', data: await service.update(req.params.id, req.body, req.user) }); }),
    remove: asyncHandler(async (req, res) => { send(res, { message: 'Reservation deleted/cancelled successfully', data: await service.remove(req.params.id) }); }),
    checkIn: asyncHandler(async (req, res) => { send(res, { message: 'Guest checked in successfully', data: await service.checkIn(req.params.id, req.user) }); }),
    checkOut: asyncHandler(async (req, res) => { send(res, { message: 'Guest checked out successfully', data: await service.checkOut(req.params.id, req.user) }); }),
    addService: asyncHandler(async (req, res) => { send(res, { message: 'Service charge added', data: await service.addService(req.params.id, req.body) }); }),
    removeService: asyncHandler(async (req, res) => { send(res, { message: 'Service charge removed', data: await service.removeService(req.params.id, req.params.serviceId) }); })
  };
}

module.exports = createReservationsController;
