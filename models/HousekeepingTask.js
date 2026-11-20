'use strict';

const mongoose = require('mongoose');

const TASK_TYPES = ['cleaning', 'inspection', 'maintenance'];
const TASK_STATUSES = ['pending', 'in-progress', 'done'];

const housekeepingTaskSchema = new mongoose.Schema(
  {
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: [true, 'Room is required'],
      index: true
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true
    },
    taskType: {
      type: String,
      enum: { values: TASK_TYPES, message: '{VALUE} is not a valid task type' },
      default: 'cleaning'
    },
    status: {
      type: String,
      enum: { values: TASK_STATUSES, message: '{VALUE} is not a valid task status' },
      default: 'pending',
      index: true
    },
    notes: { type: String, trim: true, default: '', maxlength: 500 },
    completedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

module.exports = mongoose.model('HousekeepingTask', housekeepingTaskSchema);
module.exports.TASK_TYPES = TASK_TYPES;
module.exports.TASK_STATUSES = TASK_STATUSES;
