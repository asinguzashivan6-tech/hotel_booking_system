'use strict';

const { conflict, notFound } = require('../utils/AppError');
const { validateRoomTypeInput, validateId } = require('../utils/validation');

class RoomTypeService {
  constructor({ roomTypes, rooms }) {
    this.roomTypes = roomTypes;
    this.rooms = rooms;
  }

  async list(query = {}) {
    return this.roomTypes.list({ search: query.search, sort: { name: 1 } });
  }

  async get(id) {
    const item = await this.roomTypes.findById(id);
    if (!item) throw notFound('Room type not found', 'ROOM_TYPE_NOT_FOUND');
    return item;
  }

  async create(payload) {
    const data = validateRoomTypeInput(payload, { partial: false });
    const dup = await this.roomTypes.model.findOne({ name: data.name }).lean();
    if (dup) throw conflict('Room type name must be unique', 'DUPLICATE_ROOM_TYPE');
    return this.roomTypes.create(data);
  }

  async update(id, payload) {
    validateId(id, 'id');
    const existing = await this.get(id);
    const data = validateRoomTypeInput(payload, { partial: true });
    if (data.name && data.name !== existing.name) {
      const dup = await this.roomTypes.model.findOne({ name: data.name, _id: { $ne: id } }).lean();
      if (dup) throw conflict('Room type name must be unique', 'DUPLICATE_ROOM_TYPE');
    }
    return this.roomTypes.update(id, data);
  }

  async remove(id) {
    validateId(id, 'id');
    await this.get(id);
    const inUse = await this.rooms.count({ roomType: id, isDeleted: { $ne: true } });
    if (inUse > 0) {
      throw conflict('Cannot delete a room type that is assigned to existing rooms', 'ROOM_TYPE_IN_USE');
    }
    return this.roomTypes.remove(id);
  }
}

module.exports = RoomTypeService;
