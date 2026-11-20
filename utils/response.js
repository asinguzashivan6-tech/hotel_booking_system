'use strict';

/** Consistent success envelope for every API response. */
function send(res, { status = 200, data, message, meta } = {}) {
  const body = { success: true };
  if (message) body.message = message;
  if (data !== undefined) body.data = data;
  if (meta !== undefined) body.meta = meta;
  return res.status(status).json(body);
}

module.exports = { send };
