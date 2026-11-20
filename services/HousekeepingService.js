'use strict';

const { notFound } = require('../utils/AppError');
const { validateHousekeepingInput, validateId } = require('../utils/validation');

class HousekeepingService {
  constructor({ housekeepingTasks, rooms, users }) {
    this.housekeepingTasks = housekeepingTasks;
    this.rooms = rooms;
    this.users = users;
  }

  async list(query = {}) {
    const items = await this.housekeepingTasks.list({
      search: query.search,
      status: query.status,
      room: query.roomId,
      assignedTo: query.assignedTo,
      sort: { createdAt: -1 }
    });
    return items;
  }

  async get(id) {
    const task = await this.housekeepingTasks.findById(id);
    if (!task) throw notFound('Housekeeping task not found', 'TASK_NOT_FOUND');
    return task;
  }

  async create(payload) {
    const data = validateHousekeepingInput(payload, { partial: false });
    const room = await this.rooms.findById(data.room, [{ path: 'roomType' }]);
    if (!room || room.isDeleted) throw notFound('Room not found', 'ROOM_NOT_FOUND');
    if (data.assignedTo) {
      const u = await this.users.findById(data.assignedTo);
      if (!u) throw notFound('Assigned staff user not found', 'USER_NOT_FOUND');
    }
    return this.housekeepingTasks.create({
      room: data.room,
      assignedTo: data.assignedTo || null,
      taskType: data.taskType || 'cleaning',
      status: data.status || 'pending',
      notes: data.notes || '',
      completedAt: data.status === 'done' ? new Date() : null
    });
  }

  async update(id, payload) {
    validateId(id, 'id');
    const existing = await this.get(id);
    const data = validateHousekeepingInput(payload, { partial: true });
    if (data.room) {
      const room = await this.rooms.findById(data.room, [{ path: 'roomType' }]);
      if (!room || room.isDeleted) throw notFound('Room not found', 'ROOM_NOT_FOUND');
    }
    if (data.assignedTo) {
      const u = await this.users.findById(data.assignedTo);
      if (!u) throw notFound('Assigned staff user not found', 'USER_NOT_FOUND');
    }
    const update = { ...data };
    if (data.status === 'done') update.completedAt = new Date();
    else if (data.status) update.completedAt = null;

    const updated = await this.housekeepingTasks.update(id, update);

    // If a cleaning/inspection task is done, mark room clean/available (business flow support)
    const roomId = String((data.room || existing.room?._id || existing.room));
    const status = data.status || existing.status;
    const type = data.taskType || existing.taskType;
    if (status === 'done' && ['cleaning', 'inspection'].includes(type) && roomId) {
      await this.rooms.update(roomId, { status: 'available' }, [{ path: 'roomType' }]).catch(() => null);
    }
    if (status === 'in-progress' && roomId) {
      // keep room dirty/maintenance context; no forced change
    }
    return updated;
  }

  async remove(id) {
    validateId(id, 'id');
    await this.get(id);
    return this.housekeepingTasks.remove(id);
  }
}

module.exports = HousekeepingService;
