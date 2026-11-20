'use strict';

const { notFound } = require('../utils/AppError');
const { validateFeedbackInput, validateId } = require('../utils/validation');

class FeedbackService {
  constructor({ feedback, reservations, guests }) {
    this.feedback = feedback;
    this.reservations = reservations;
    this.guests = guests;
  }

  async list(query = {}) {
    return this.feedback.list({ search: query.search, sort: { createdAt: -1 } });
  }

  async get(id) {
    const item = await this.feedback.findById(id);
    if (!item) throw notFound('Feedback not found', 'FEEDBACK_NOT_FOUND');
    return item;
  }

  async create(payload) {
    const data = validateFeedbackInput(payload, { partial: false });
    const reservation = await this.reservations.findById(data.reservation);
    if (!reservation) throw notFound('Reservation not found', 'RESERVATION_NOT_FOUND');
    const guest = await this.guests.findById(data.guest);
    if (!guest) throw notFound('Guest not found', 'GUEST_NOT_FOUND');
    return this.feedback.create(data);
  }

  async update(id, payload) {
    validateId(id, 'id');
    await this.get(id);
    const data = validateFeedbackInput(payload, { partial: true });
    return this.feedback.update(id, data);
  }

  async remove(id) {
    validateId(id, 'id');
    await this.get(id);
    return this.feedback.remove(id);
  }
}

module.exports = FeedbackService;
