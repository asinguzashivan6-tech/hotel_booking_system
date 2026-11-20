'use strict';

const mongoose = require('mongoose');

const ROOM_STATUSES = ['available', 'occupied', 'dirty', 'maintenance'];

const roomSchema = new mongoose.Schema(
  {
    roomNumber: {
      type: String,
      required: [true, 'Room number is required'],
      trim: true,
      uppercase: true,
      unique: true,
      maxlength: [30, 'Room number is too long']
    },
    floor: {
      type: Number,
      default: 0,
      min: [0, 'Floor cannot be negative'],
      max: [500, 'Floor is too large']
    },
    roomType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RoomType',
      required: [true, 'Room type is required']
    },
    status: {
      type: String,
      enum: { values: ROOM_STATUSES, message: '{VALUE} is not a valid room status' },
      default: 'available',
      index: true
    },
    notes: {
      type: String,
      trim: true,
      default: '',
      maxlength: [1000, 'Notes are too long']
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true
    }
  },
  { timestamps: true }
);

roomSchema.index({ roomType: 1, status: 1 });

module.exports = mongoose.model('Room', roomSchema);
module.exports.ROOM_STATUSES = ROOM_STATUSES;
