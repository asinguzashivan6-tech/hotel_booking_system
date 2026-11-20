'use strict';

const { badRequest } = require('../utils/AppError');
const { ACTIVE_BOOKING_STATUSES } = require('../utils/validation');

function clone(value) {
  return value === undefined ? undefined : structuredClone(value);
}

function idOf(value) {
  return value && typeof value === 'object' ? String(value._id) : String(value);
}

/**
 * Minimal in-memory repository implementing the same contract as the Mongo
 * repository. It lets the service and HTTP tests run without MongoDB.
 */
class FakeRepository {
  constructor({ prefix, searchFields = [], defaultSort = { createdAt: -1 } }) {
    this.prefix = prefix;
    this.searchFields = searchFields;
    this.defaultSort = defaultSort;
    this.items = [];
    this.counter = 0;
  }

  reset() {
    this.items = [];
    this.counter = 0;
  }

  validateId(id) {
    const value = String(id ?? '');
    if (!new RegExp(`^${this.prefix}\\d+$`).test(value)) {
      throw badRequest(`Invalid ${this.prefix} ID format`, 'INVALID_ID');
    }
    return value;
  }

  matches(item, query = {}) {
    if (query.status && item.status !== query.status) return false;
    if (query.type && item.type !== query.type) return false;
    if (query.roomType && item.roomType !== query.roomType) return false;
    if (query.guest && idOf(item.guest) !== idOf(query.guest)) return false;
    if (query.room && idOf(item.room) !== idOf(query.room)) return false;
    if (query.guestId && idOf(item.guest) !== idOf(query.guestId)) return false;
    if (query.roomId && idOf(item.room) !== idOf(query.roomId)) return false;
    if (query.from && new Date(item.checkOutDate) < new Date(query.from)) return false;
    if (query.to && new Date(item.checkInDate) > new Date(query.to)) return false;
    return true;
  }

  matchesSearch(item, search) {
    if (!search) return true;
    const needle = String(search).toLowerCase();
    return this.searchFields.some((field) =>
      String(item[field] ?? '').toLowerCase().includes(needle)
    );
  }

  sortItems(items, sort) {
    const criteria = Object.entries(sort || this.defaultSort);
    return [...items].sort((a, b) => {
      for (const [key, direction] of criteria) {
        const left = a[key] ?? '';
        const right = b[key] ?? '';
        if (left < right) return -1 * direction;
        if (left > right) return 1 * direction;
      }
      return 0;
    });
  }

  async list(query = {}) {
    const filtered = this.items
      .filter((item) => this.matches(item, query))
      .filter((item) => this.matchesSearch(item, query.search));
    return clone(this.sortItems(filtered, query.sort));
  }

  async findById(id) {
    const value = this.validateId(id);
    const item = this.rawFindById(value);
    return item ? clone(item) : null;
  }

  rawFindById(id) {
    const value = idOf(id);
    return this.items.find((entry) => String(entry._id) === value) || null;
  }

  async findOne(filter = {}) {
    const item = this.items.find((entry) => this.matches(entry, filter));
    return item ? clone(item) : null;
  }

  async create(data) {
    const now = new Date().toISOString();
    const item = {
      ...clone(data),
      _id: `${this.prefix}${++this.counter}`,
      createdAt: now,
      updatedAt: now
    };
    this.items.push(item);
    return clone(item);
  }

  async update(id, data) {
    const value = this.validateId(id);
    const item = this.items.find((entry) => String(entry._id) === value);
    if (!item) return null;
    Object.assign(item, clone(data), { updatedAt: new Date().toISOString() });
    return clone(item);
  }

  async remove(id) {
    const value = this.validateId(id);
    const index = this.items.findIndex((entry) => String(entry._id) === value);
    if (index === -1) return null;
    const [removed] = this.items.splice(index, 1);
    return clone(removed);
  }

  async count(filter = {}) {
    return this.items.filter((item) => this.matches(item, filter)).length;
  }
}

class FakeBookingRepository extends FakeRepository {
  constructor() {
    super({
      prefix: 'b',
      searchFields: ['guestName', 'guestEmail', 'guestPhone', 'roomNumber', 'roomType'],
      defaultSort: { createdAt: -1 }
    });
    this.related = {};
  }

  rawFindById(id) {
    const value = idOf(id);
    return this.items.find((item) => String(item._id) === value) || null;
  }

  async decorate(item) {
    if (!item) return null;
    const guest = this.related.guests?.rawFindById(item.guest);
    const room = this.related.rooms?.rawFindById(item.room);
    return {
      ...clone(item),
      guest: guest ? clone(guest) : item.guest,
      room: room ? clone(room) : item.room,
      nights: Math.round((new Date(item.checkOutDate) - new Date(item.checkInDate)) / 86400000)
    };
  }

  async list(query = {}) {
    const items = await super.list(query);
    return Promise.all(items.map((item) => this.decorate(item)));
  }

  async findById(id) {
    return this.decorate(await super.findById(id));
  }

  async create(data) {
    return this.decorate(await super.create(data));
  }

  async update(id, data) {
    return this.decorate(await super.update(id, data));
  }

  async remove(id) {
    return this.decorate(await super.remove(id));
  }

  async hasOverlap({ roomId, checkInDate, checkOutDate, excludeId = null }) {
    const start = new Date(checkInDate);
    const end = new Date(checkOutDate);
    return this.items.some((item) => {
      if (idOf(item.room) !== idOf(roomId)) return false;
      if (!ACTIVE_BOOKING_STATUSES.includes(item.status)) return false;
      if (excludeId && String(item._id) === idOf(excludeId)) return false;
      return start < new Date(item.checkOutDate) && new Date(item.checkInDate) < end;
    });
  }

  async countActiveForRoom(roomId) {
    return this.items.filter(
      (item) => idOf(item.room) === idOf(roomId) && ACTIVE_BOOKING_STATUSES.includes(item.status)
    ).length;
  }

  async countForGuest(guestId) {
    return this.items.filter((item) => idOf(item.guest) === idOf(guestId)).length;
  }
}

function createFakeRepositories() {
  const rooms = new FakeRepository({
    prefix: 'r',
    searchFields: ['roomNumber', 'type', 'description'],
    defaultSort: { roomNumber: 1 }
  });
  const guests = new FakeRepository({
    prefix: 'g',
    searchFields: ['fullName', 'email', 'phone', 'address'],
    defaultSort: { fullName: 1 }
  });
  const bookings = new FakeBookingRepository();
  bookings.related = { rooms, guests };

  return { rooms, guests, bookings };
}

module.exports = { createFakeRepositories, FakeRepository, FakeBookingRepository, idOf };
