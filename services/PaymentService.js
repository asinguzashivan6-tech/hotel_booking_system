'use strict';

const { conflict, notFound } = require('../utils/AppError');
const { generateInvoiceNumber, validateId, validatePaymentInput } = require('../utils/validation');

class PaymentService {
  constructor({ payments, reservations }) {
    this.payments = payments;
    this.reservations = reservations;
  }

  async list(query = {}) {
    const items = await this.payments.list({ search: query.search, status: query.status, sort: { createdAt: -1 } });
    if (query.reservationId) {
      return items.filter((p) => String(p.reservation?._id || p.reservation) === String(query.reservationId));
    }
    return items;
  }

  async get(id) {
    const payment = await this.payments.findById(id);
    if (!payment) throw notFound('Payment not found', 'PAYMENT_NOT_FOUND');
    return payment;
  }

  async create(payload, user) {
    const data = validatePaymentInput(payload, { partial: false });
    const reservation = await this.reservations.findById(data.reservation);
    if (!reservation || reservation.isDeleted) throw notFound('Reservation not found', 'RESERVATION_NOT_FOUND');

    let invoiceNumber = payload.invoiceNumber;
    if (!invoiceNumber) {
      invoiceNumber = generateInvoiceNumber();
      for (let i = 0; i < 5; i++) {
        const dup = await this.payments.model.findOne({ invoiceNumber }).lean();
        if (!dup) break;
        invoiceNumber = generateInvoiceNumber();
      }
    }
    const status = data.status || 'pending';
    return this.payments.create({
      reservation: data.reservation,
      invoiceNumber,
      amount: data.amount != null ? data.amount : (reservation.totalAmount || 0),
      method: data.method || 'cash',
      status,
      paidAt: status === 'paid' ? new Date() : null,
      receivedBy: user?.sub || null,
      notes: data.notes || ''
    });
  }

  async update(id, payload, user) {
    validateId(id, 'id');
    const existing = await this.get(id);
    if (existing.status === 'void') throw conflict('Voided invoice cannot be modified', 'PAYMENT_VOIDED');
    const data = validatePaymentInput(payload, { partial: true });
    const update = { ...data };
    if (data.status === 'paid' && existing.status !== 'paid') {
      update.paidAt = new Date();
      update.receivedBy = user?.sub || existing.receivedBy || null;
    }
    if (data.status && data.status !== 'paid') update.paidAt = existing.paidAt || null;
    if (data.status === 'void') update.paidAt = existing.paidAt || null;
    return this.payments.update(id, update);
  }

  async remove(id, user) {
    validateId(id, 'id');
    const existing = await this.get(id);
    // admin-only void semantics handled at route; here perform soft-void
    return this.payments.update(id, { status: 'void', notes: (existing.notes || '') + ' [voided]' });
  }
}

module.exports = PaymentService;
