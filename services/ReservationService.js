'use strict';

const { badRequest, conflict, notFound } = require('../utils/AppError');
const {
  assertReservationStatusTransition,
  calculateReservationTotals,
  generateInvoiceNumber,
  generateReservationCode,
  validateId,
  validateReservationInput,
  validateServices
} = require('../utils/validation');

function idOf(value) {
  if (!value) return '';
  if (typeof value === 'object') return String(value._id || value.id || '');
  return String(value);
}

class ReservationService {
  constructor({ reservations, rooms, guests, roomTypes, payments, housekeepingTasks, users }) {
    this.reservations = reservations;
    this.rooms = rooms;
    this.guests = guests;
    this.roomTypes = roomTypes;
    this.payments = payments;
    this.housekeepingTasks = housekeepingTasks;
    this.users = users;
  }

  async #getRoomAndType(roomId) {
    const room = await this.rooms.findById(roomId, [{ path: 'roomType' }]);
    if (!room || room.isDeleted) throw notFound('Room not found', 'ROOM_NOT_FOUND');
    const roomType = room.roomType && room.roomType._id ? room.roomType : (room.roomType ? await this.roomTypes.findById(room.roomType) : null);
    if (!roomType) throw notFound('Room type not found for selected room', 'ROOM_TYPE_NOT_FOUND');
    return { room, roomType };
  }

  async #computeTotals({ roomType, checkInDate, checkOutDate, services }) {
    const nights = Math.max(1, Math.round((new Date(checkOutDate) - new Date(checkInDate)) / (24 * 60 * 60 * 1000)));
    const totals = calculateReservationTotals({ nights, pricePerNight: roomType.pricePerNight, services: services || [] });
    return { nights, ...totals };
  }

  async list(query = {}) {
    // basic search by reservationCode/status via repo; guest name search handled client-side or via limited fields
    const items = await this.reservations.list({
      search: query.search,
      status: query.status,
      room: query.roomId,
      guest: query.guestId,
      sort: { createdAt: -1 }
    });
    // optional text-like filtering
    if (query.q) {
      const q = String(query.q).toLowerCase();
      return items.filter((r) => {
        const g = r.guest || {};
        const guestName = `${g.firstName || ''} ${g.lastName || ''}`.toLowerCase();
        return (
          String(r.reservationCode || '').toLowerCase().includes(q) ||
          guestName.includes(q) ||
          String(g.email || '').toLowerCase().includes(q) ||
          String(g.phone || '').toLowerCase().includes(q) ||
          String(r.room?.roomNumber || '').toLowerCase().includes(q)
        );
      });
    }
    return items;
  }

  async get(id) {
    const reservation = await this.reservations.findById(id);
    if (!reservation || reservation.isDeleted) throw notFound('Reservation not found', 'RESERVATION_NOT_FOUND');
    return reservation;
  }

  async create(payload, user) {
    const data = validateReservationInput(payload, { partial: false });
    const guest = await this.guests.findById(data.guest);
    if (!guest || guest.isDeleted) throw notFound('Guest not found', 'GUEST_NOT_FOUND');

    const { room, roomType } = await this.#getRoomAndType(data.room);
    if (room.status === 'maintenance') {
      throw conflict('Selected room is under maintenance', 'ROOM_UNAVAILABLE');
    }

    const people = (data.adults || 1) + (data.children || 0);
    if (people > roomType.capacity) {
      throw badRequest(`Room type capacity exceeded (max ${roomType.capacity})`, 'CAPACITY_EXCEEDED');
    }

    const overlap = await this.reservations.hasOverlap({
      roomId: data.room,
      checkInDate: data.checkInDate,
      checkOutDate: data.checkOutDate
    });
    if (overlap) throw conflict('Room is already booked for the selected dates', 'ROOM_NOT_AVAILABLE');

    const { subtotal, tax, totalAmount } = await this.#computeTotals({
      roomType,
      checkInDate: data.checkInDate,
      checkOutDate: data.checkOutDate,
      services: data.services || []
    });

    let reservationCode = generateReservationCode();
    // best-effort uniqueness
    for (let i = 0; i < 5; i++) {
      const exists = await this.reservations.model.findOne({ reservationCode }).lean();
      if (!exists) break;
      reservationCode = generateReservationCode();
    }

    const created = await this.reservations.create({
      reservationCode,
      guest: data.guest,
      room: data.room,
      checkInDate: data.checkInDate,
      checkOutDate: data.checkOutDate,
      adults: data.adults || 1,
      children: data.children || 0,
      status: data.status || 'booked',
      services: data.services || [],
      subtotal,
      tax,
      totalAmount,
      notes: data.notes || '',
      createdBy: user?.sub || null,
      isDeleted: false
    });

    // If created as checked-in (edge case), reflect room occupancy
    if ((data.status || 'booked') === 'checked-in') {
      await this.rooms.update(data.room, { status: 'occupied' }, [{ path: 'roomType' }]);
    }

    return this.get(created._id);
  }

  async update(id, payload, user) {
    const existing = await this.get(id);
    if (['checked-out', 'cancelled'].includes(existing.status)) {
      throw conflict('Checked-out or cancelled reservations cannot be modified', 'RESERVATION_NOT_EDITABLE');
    }
    const data = validateReservationInput(payload, { partial: true });
    if (hasStatus(data.status) && data.status && data.status !== existing.status) {
      // prefer dedicated endpoints for main flow, but allow valid transitions
      assertReservationStatusTransition(existing.status, data.status);
    }

    const guestId = data.guest || idOf(existing.guest);
    const roomId = data.room || idOf(existing.room);
    const checkInDate = data.checkInDate || existing.checkInDate;
    const checkOutDate = data.checkOutDate || existing.checkOutDate;
    const adults = data.adults != null ? data.adults : existing.adults;
    const children = data.children != null ? data.children : existing.children;
    const services = data.services != null ? data.services : (existing.services || []);

    const guest = await this.guests.findById(guestId);
    if (!guest || guest.isDeleted) throw notFound('Guest not found', 'GUEST_NOT_FOUND');
    const { room, roomType } = await this.#getRoomAndType(roomId);
    if (room.status === 'maintenance' && existing.status !== 'checked-in') {
      throw conflict('Selected room is under maintenance', 'ROOM_UNAVAILABLE');
    }

    const people = (adults || 1) + (children || 0);
    if (people > roomType.capacity) {
      throw badRequest(`Room type capacity exceeded (max ${roomType.capacity})`, 'CAPACITY_EXCEEDED');
    }

    const overlap = await this.reservations.hasOverlap({
      roomId,
      checkInDate,
      checkOutDate,
      excludeId: id
    });
    if (overlap) throw conflict('Room is already booked for the selected dates', 'ROOM_NOT_AVAILABLE');

    const { subtotal, tax, totalAmount } = await this.#computeTotals({ roomType, checkInDate, checkOutDate, services });

    // handle room status adjustments if room/status changed
    const prevRoomId = idOf(existing.room);
    const nextStatus = data.status || existing.status;
    if (prevRoomId !== String(roomId) && existing.status === 'checked-in') {
      await this.rooms.update(prevRoomId, { status: 'dirty' }, [{ path: 'roomType' }]).catch(() => null);
      await this.rooms.update(roomId, { status: 'occupied' }, [{ path: 'roomType' }]);
    }
    if (data.status && data.status !== existing.status) {
      if (nextStatus === 'checked-in') await this.rooms.update(roomId, { status: 'occupied' }, [{ path: 'roomType' }]);
      if (nextStatus === 'cancelled' && existing.status === 'booked') {
        // if no other active checked-in reservation occupies it now, make available (best effort)
        await this.rooms.update(roomId, { status: 'available' }, [{ path: 'roomType' }]).catch(() => null);
      }
    }

    await this.reservations.update(id, {
      guest: guestId,
      room: roomId,
      checkInDate,
      checkOutDate,
      adults,
      children,
      status: nextStatus,
      services,
      subtotal,
      tax,
      totalAmount,
      notes: data.notes != null ? data.notes : existing.notes
    });

    return this.get(id);
  }

  async checkIn(id, user) {
    const existing = await this.get(id);
    assertReservationStatusTransition(existing.status, 'checked-in');
    const roomId = idOf(existing.room);
    await this.reservations.update(id, { status: 'checked-in' });
    await this.rooms.update(roomId, { status: 'occupied' }, [{ path: 'roomType' }]).catch(() => null);
    return this.get(id);
  }

  async checkOut(id, user) {
    const existing = await this.get(id);
    assertReservationStatusTransition(existing.status, 'checked-out');
    const roomId = idOf(existing.room);

    await this.reservations.update(id, { status: 'checked-out' });
    await this.rooms.update(roomId, { status: 'dirty' }, [{ path: 'roomType' }]).catch(() => null);

    // Create housekeeping cleaning task automatically
    if (this.housekeepingTasks) {
      await this.housekeepingTasks.create({
        room: roomId,
        assignedTo: null,
        taskType: 'cleaning',
        status: 'pending',
        notes: `Auto-created after checkout for reservation ${existing.reservationCode}`
      }).catch(() => null);
    }

    // Generate invoice/payment record if not present
    if (this.payments) {
      const existingPayment = await this.payments.model.findOne({ reservation: existing._id }).lean();
      if (!existingPayment) {
        let invoiceNumber = generateInvoiceNumber();
        for (let i = 0; i < 5; i++) {
          const dup = await this.payments.model.findOne({ invoiceNumber }).lean();
          if (!dup) break;
          invoiceNumber = generateInvoiceNumber();
        }
        await this.payments.create({
          reservation: existing._id,
          invoiceNumber,
          amount: existing.totalAmount || 0,
          method: 'cash',
          status: 'pending',
          paidAt: null,
          receivedBy: user?.sub || null,
          notes: 'Auto-generated on checkout'
        }).catch(() => null);
      }
    }

    return this.get(id);
  }

  async cancel(id) {
    return this.update(id, { status: 'cancelled' });
  }

  async remove(id) {
    const existing = await this.get(id);
    if (existing.status === 'checked-in') {
      throw conflict('Checked-in reservation must be checked out before deletion/cancellation', 'RESERVATION_CHECKED_IN');
    }
    // soft delete/cancel preference: mark cancelled if booked, else soft delete
    if (existing.status === 'booked') {
      await this.reservations.update(id, { status: 'cancelled' });
    }
    return this.reservations.update(id, { isDeleted: true });
  }

  async addService(id, servicePayload) {
    const existing = await this.get(id);
    if (['checked-out', 'cancelled'].includes(existing.status)) {
      throw conflict('Cannot add charges to a checked-out or cancelled reservation', 'RESERVATION_NOT_EDITABLE');
    }
    const [service] = validateServices([servicePayload]);
    const services = [...(existing.services || []), service];
    const { room, roomType } = await this.#getRoomAndType(idOf(existing.room));
    const { subtotal, tax, totalAmount } = await this.#computeTotals({
      roomType,
      checkInDate: existing.checkInDate,
      checkOutDate: existing.checkOutDate,
      services
    });
    await this.reservations.update(id, { services, subtotal, tax, totalAmount });
    return this.get(id);
  }

  async removeService(id, serviceId) {
    const existing = await this.get(id);
    if (['checked-out', 'cancelled'].includes(existing.status)) {
      throw conflict('Cannot remove charges from a checked-out or cancelled reservation', 'RESERVATION_NOT_EDITABLE');
    }
    const services = (existing.services || []).filter((s) => String(s._id) !== String(serviceId));
    const { roomType } = await this.#getRoomAndType(idOf(existing.room));
    const { subtotal, tax, totalAmount } = await this.#computeTotals({
      roomType,
      checkInDate: existing.checkInDate,
      checkOutDate: existing.checkOutDate,
      services
    });
    await this.reservations.update(id, { services, subtotal, tax, totalAmount });
    return this.get(id);
  }
}

function hasStatus(v) { return v !== undefined; }

module.exports = ReservationService;
