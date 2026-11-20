'use strict';

const asyncHandler = require('../utils/asyncHandler');
const { send } = require('../utils/response');

function createReportsController(service) {
  return {
    summary: asyncHandler(async (req, res) => {
      send(res, { data: await service.summary() });
    })
  };
}

module.exports = createReportsController;
