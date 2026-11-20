'use strict';

const { conflict, notFound } = require('../utils/AppError');
const { validateRoomInput, validateId } = require('../utils/validation');

class RoomService {
  constructor({ rooms, roomTypes, reservations }) {
    this.rooms = rooms;
    this.roomTypes = roomTypes;
    this.reservations = reservations;
  }

  async list(query = {}) {
    const filterQuery = {
      search: query.search,
      status: query.status,
      roomType: query.roomType || query.type,
      sort: { roomNumber: 1 },
      populate: [{ path: 'roomType' }]
    };
    return this.rooms.list(filterQuery);
  }

  async get(id) {
    const room = await this.rooms.findById(id, [{ path: 'roomType' }]);
    if (!room || room.isDeleted) throw notFound('Room not found', 'ROOM_NOT_FOUND');
    return room;
  }

  async create(payload) {
    const data = validateRoomInput(payload, { partial: false });
    const type = await this.roomTypes.findById(data.roomType);
    if (!type) throw notFound('Room type not found', 'ROOM_TYPE_NOT_FOUND');
    const dup = await this.rooms.model.findOne({ roomNumber: data.roomNumber, isDeleted: { $ne: true } }).lean();
    if (dup) throw conflict('Room number must be unique', 'DUPLICATE_ROOM_NUMBER');
    return this.rooms.create({ ...data, isDeleted: false }, [{ path: 'roomType' }]);
  }

  async update(id, payload) {
    validateId(id, 'id');
    const existing = await this.get(id);
    const data = validateRoomInput(payload, { partial: true });
    if (data.roomType) {
      const type = await this.roomTypes.findById(data.roomType);
      if (!type) throw notFound('Room type not found', 'ROOM_TYPE_NOT_FOUND');
    }
    if (data.roomNumber && data.roomNumber !== existing.roomNumber) {
      const dup = await this.rooms.model.findOne({ roomNumber: data.roomNumber, _id: { $ne: id }, isDeleted: { $ne: true } }).lean();
      if (dup) throw conflict('Room number must be unique', 'DUPLICATE_ROOM_NUMBER');
    }
    return this.rooms.update(id, data, [{ path: 'roomType' }]);
  }

  async remove(id) {
    validateId(id, 'id');
    await this.get(id);
    if (this.reservations) {
      const active = await this.reservations.countActiveForRoom(id);
      if (active > 0) {
        throw conflict('Cannot delete a room that has active or historical reservations (use maintenance or keep for records)', 'ROOM_HAS_RESERVATIONS');
      }
    }
    // Soft delete
    return this.rooms.update(id, { isDeleted: true }, [{ path: 'roomType' }]);
  }
}

module.exports = RoomService;
