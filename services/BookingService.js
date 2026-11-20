'use strict';

const { badRequest, conflict, notFound } = require('../utils/AppError');
const {
  assertStatusTransition,
  calculateTotal,
  has,
  nightsBetween,
  validateBookingInput,
  validateStatus
} = require('../utils/validation');

function idOf(value) {
  if (value && typeof value === 'object') return String(value._id);
  return String(value);
}

class BookingService {
  constructor({ bookings, rooms, guests }) {
    this.bookings = bookings;
    this.rooms = rooms;
    this.guests = guests;
  }

  async list(query = {}) {
    if (query.status) validateStatus(query.status, 'status');
    return this.bookings.list({
      search: query.search,
      status: query.status,
      roomType: query.roomType,
      from: query.from,
      to: query.to,
      guestId: query.guestId,
      roomId: query.roomId,
      sort: { createdAt: -1 }
    });
  }

  async get(id) {
    const booking = await this.bookings.findById(id);
    if (!booking) throw notFound('Booking not found', 'BOOKING_NOT_FOUND');
    return booking;
  }

  /**
   * Resolve and validate every dependency of a booking before writing it.
   * Prices are always taken from the current room record, never from the client.
   */
  async #resolveStay({ roomId, guestId, checkInDate, checkOutDate, numberOfGuests, excludeId }) {
    const [room, guest] = await Promise.all([
      this.rooms.findById(roomId),
      this.guests.findById(guestId)
    ]);

    if (!guest) throw notFound('Guest not found', 'GUEST_NOT_FOUND');
    if (!room) throw notFound('Room not found', 'ROOM_NOT_FOUND');
    if (room.status === 'Maintenance') {
      throw conflict(`Room ${room.roomNumber} is under maintenance`, 'ROOM_UNAVAILABLE');
    }
    if (numberOfGuests > room.capacity) {
      throw badRequest(
        `Room ${room.roomNumber} can accommodate at most ${room.capacity} guest(s)`,
        'CAPACITY_EXCEEDED'
      );
    }

    const stay = validateStayDates(checkInDate, checkOutDate, { allowPast: false });

    const overlaps = await this.bookings.hasOverlap({
      roomId,
      checkInDate: stay.checkInDate,
      checkOutDate: stay.checkOutDate,
      excludeId
    });
    if (overlaps) {
      throw conflict(
        `Room ${room.roomNumber} is already booked for the selected dates`,
        'ROOM_NOT_AVAILABLE'
      );
    }

    const nightlyRate = room.pricePerNight;
    const totalPrice = calculateTotal(stay.nights, nightlyRate);

    return {
      room,
      guest,
      stay,
      nightlyRate,
      totalPrice,
      snapshot: {
        guestName: guest.fullName,
        guestEmail: guest.email,
        guestPhone: guest.phone,
        roomNumber: room.roomNumber,
        roomType: room.type
      }
    };
  }

  async create(payload) {
    const data = validateBookingInput(payload);
    const resolved = await this.#resolveStay({
      roomId: data.room,
      guestId: data.guest,
      checkInDate: data.checkInDate,
      checkOutDate: data.checkOutDate,
      numberOfGuests: data.numberOfGuests
    });

    return this.bookings.create({
      guest: data.guest,
      room: data.room,
      ...resolved.snapshot,
      checkInDate: resolved.stay.checkInDate,
      checkOutDate: resolved.stay.checkOutDate,
      numberOfGuests: data.numberOfGuests,
      nightlyRate: resolved.nightlyRate,
      totalPrice: resolved.totalPrice,
      status: data.status || 'Confirmed',
      specialRequests: data.specialRequests || ''
    });
  }

  async update(id, payload) {
    const existing = await this.get(id);
    const data = validateBookingInput(payload, { partial: true });

    const statusChangeOnly = Object.keys(data).length === 1 && has(data, 'status');

    if (existing.status !== 'Confirmed' && !statusChangeOnly) {
      throw conflict(
        'Only a confirmed booking can have its guest, room or dates changed',
        'BOOKING_NOT_EDITABLE'
      );
    }
    if (has(data, 'status')) {
      assertStatusTransition(existing.status, data.status);
    }

    const guestId = idOf(data.guest ?? existing.guest);
    const roomId = idOf(data.room ?? existing.room);
    const checkInRaw = has(data, 'checkInDate') ? data.checkInDate : existing.checkInDate;
    const checkOutRaw = has(data, 'checkOutDate') ? data.checkOutDate : existing.checkOutDate;
    const numberOfGuests = data.numberOfGuests ?? existing.numberOfGuests;

    const resolved = await this.#resolveStay({
      roomId,
      guestId,
      checkInDate: checkInRaw,
      checkOutDate: checkOutRaw,
      numberOfGuests,
      excludeId: id
    });

    // #resolveStay revalidates the stay whenever dates were supplied.

    return this.bookings.update(id, {
      guest: guestId,
      room: roomId,
      ...resolved.snapshot,
      checkInDate: resolved.stay.checkInDate,
      checkOutDate: resolved.stay.checkOutDate,
      numberOfGuests,
      nightlyRate: resolved.nightlyRate,
      totalPrice: resolved.totalPrice,
      status: has(data, 'status') ? data.status : existing.status,
      specialRequests: has(data, 'specialRequests')
        ? data.specialRequests
        : existing.specialRequests || ''
    });
  }

  /** Move a booking through its lifecycle: Confirmed -> CheckedIn -> CheckedOut. */
  async changeStatus(id, status) {
    const target = validateStatus(status);
    const existing = await this.get(id);
    assertStatusTransition(existing.status, target);

    const updated = await this.bookings.update(id, { status: target });

    if (existing.status === 'CheckedIn' && target === 'CheckedOut') {
      const nights = existing.nights ?? nightsBetween(
        new Date(existing.checkInDate),
        new Date(existing.checkOutDate)
      );
      const earned = Math.max(10, nights * 10);
      const guestId = idOf(existing.guest);
      const guest = await this.guests.findById(guestId);
      if (guest) {
        await this.guests.update(guestId, {
          loyaltyPoints: (guest.loyaltyPoints || 0) + earned
        });
      }
    }

    return updated;
  }

  async remove(id) {
    const existing = await this.get(id);
    if (existing.status === 'CheckedIn') {
      throw conflict(
        'A checked-in booking must be checked out before it can be deleted',
        'BOOKING_CHECKED_IN'
      );
    }
    return this.bookings.remove(id);
  }
}

module.exports = BookingService;
