'use strict';

const asyncHandler = require('../utils/asyncHandler');
const { send } = require('../utils/response');

function createBookingsController(service) {
  return {
    list: asyncHandler(async (req, res) => {
      send(res, { data: await service.list(req.query) });
    }),

    get: asyncHandler(async (req, res) => {
      send(res, { data: await service.get(req.params.id) });
    }),

    create: asyncHandler(async (req, res) => {
      const booking = await service.create(req.body);
      send(res, { status: 201, message: 'Booking created successfully', data: booking });
    }),

    update: asyncHandler(async (req, res) => {
      const booking = await service.update(req.params.id, req.body);
      send(res, { message: 'Booking updated successfully', data: booking });
    }),

    changeStatus: asyncHandler(async (req, res) => {
      const booking = await service.changeStatus(req.params.id, req.body.status);
      send(res, { message: `Booking status changed to ${booking.status}`, data: booking });
    }),

    remove: asyncHandler(async (req, res) => {
      const booking = await service.remove(req.params.id);
      send(res, { message: 'Booking deleted successfully', data: booking });
    })
  };
}

module.exports = createBookingsController;
