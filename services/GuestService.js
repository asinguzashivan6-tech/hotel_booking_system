'use strict';

const { conflict, notFound } = require('../utils/AppError');
const { validateGuestInput, validateId } = require('../utils/validation');

class GuestService {
  constructor({ guests, reservations }) {
    this.guests = guests;
    this.reservations = reservations;
  }

  async list(query = {}) {
    return this.guests.list({ search: query.search, sort: { createdAt: -1 } });
  }

  async get(id) {
    const guest = await this.guests.findById(id);
    if (!guest || guest.isDeleted) throw notFound('Guest not found', 'GUEST_NOT_FOUND');
    return guest;
  }

  async create(payload) {
    const data = validateGuestInput(payload, { partial: false });
    return this.guests.create({ ...data, isDeleted: false });
  }

  async update(id, payload) {
    validateId(id, 'id');
    await this.get(id);
    const data = validateGuestInput(payload, { partial: true });
    return this.guests.update(id, data);
  }

  async remove(id) {
    validateId(id, 'id');
    await this.get(id);
    if (this.reservations) {
      const count = await this.reservations.countForGuest(id);
      if (count > 0) {
        throw conflict('Cannot delete a guest with reservation history (soft-delete policy)', 'GUEST_HAS_RESERVATIONS');
      }
    }
    return this.guests.update(id, { isDeleted: true });
  }
}

module.exports = GuestService;
