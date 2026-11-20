'use strict';

const mongoose = require('mongoose');

const RESERVATION_STATUSES = ['booked', 'checked-in', 'checked-out', 'cancelled'];

const serviceChargeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    qty: { type: Number, required: true, min: 1, max: 10000 },
    unitPrice: { type: Number, required: true, min: 0 },
    date: { type: Date, default: Date.now }
  },
  { _id: true }
);

const reservationSchema = new mongoose.Schema(
  {
    reservationCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true
    },
    guest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Guest',
      required: [true, 'Guest is required'],
      index: true
    },
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: [true, 'Room is required'],
      index: true
    },
    checkInDate: { type: Date, required: [true, 'Check-in date is required'] },
    checkOutDate: { type: Date, required: [true, 'Check-out date is required'] },
    adults: { type: Number, required: true, min: 1, max: 20, default: 1 },
    children: { type: Number, required: true, min: 0, max: 20, default: 0 },
    status: {
      type: String,
      enum: { values: RESERVATION_STATUSES, message: '{VALUE} is not a valid status' },
      default: 'booked',
      index: true
    },
    services: { type: [serviceChargeSchema], default: [] },
    subtotal: { type: Number, default: 0, min: 0 },
    tax: { type: Number, default: 0, min: 0 },
    totalAmount: { type: Number, default: 0, min: 0 },
    notes: { type: String, trim: true, default: '', maxlength: 1000 },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    isDeleted: { type: Boolean, default: false, index: true }
  },
  { timestamps: true }
);

reservationSchema.index({ room: 1, checkInDate: 1, checkOutDate: 1 });
reservationSchema.index({ guest: 1, createdAt: -1 });

module.exports = mongoose.model('Reservation', reservationSchema);
module.exports.RESERVATION_STATUSES = RESERVATION_STATUSES;
