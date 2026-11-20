'use strict';

const mongoose = require('mongoose');

const roomTypeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Room type name is required'],
      trim: true,
      unique: true,
      maxlength: [80, 'Room type name is too long']
    },
    description: {
      type: String,
      trim: true,
      default: '',
      maxlength: [1000, 'Description is too long']
    },
    pricePerNight: {
      type: Number,
      required: [true, 'Price per night is required'],
      min: [0.01, 'Price per night must be greater than zero']
    },
    capacity: {
      type: Number,
      required: [true, 'Capacity is required'],
      min: [1, 'Capacity must be at least 1'],
      max: [20, 'Capacity cannot exceed 20']
    },
    amenities: {
      type: [String],
      default: []
    },
    bedType: {
      type: String,
      trim: true,
      default: '',
      maxlength: [80, 'Bed type is too long']
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('RoomType', roomTypeSchema);
