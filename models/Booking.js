'use strict';

const mongoose = require('mongoose');
const {
  BOOKING_STATUSES,
  MS_PER_DAY,
  nightsBetween
} = require('../utils/validation');

const bookingSchema = new mongoose.Schema(
  {
    // Relationships
    guest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Guest',
      required: [true, 'Guest is required']
    },
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: [true, 'Room is required']
    },

    // Denormalised snapshots make searching and history reliable even if a
    // guest changes their email or a room is renamed later.
    guestName: { type: String, required: true, trim: true },
    guestEmail: { type: String, required: true, trim: true, lowercase: true },
    guestPhone: { type: String, required: true, trim: true },
    roomNumber: { type: String, required: true, trim: true, uppercase: true },
    roomType: { type: String, required: true, trim: true },

    // Stay details
    checkInDate: { type: Date, required: [true, 'Check-in date is required'] },
    checkOutDate: { type: Date, required: [true, 'Check-out date is required'] },
    numberOfGuests: {
      type: Number,
      required: [true, 'Number of guests is required'],
      min: [1, 'At least one guest is required'],
      max: [20, 'A booking cannot exceed 20 guests']
    },

    // Money is snapshotted at booking time so old bookings keep their price.
    nightlyRate: { type: Number, required: true, min: 0 },
    totalPrice: { type: Number, required: true, min: 0 },

    status: {
      type: String,
      enum: { values: BOOKING_STATUSES, message: '{VALUE} is not a valid status' },
      default: 'Confirmed'
    },
    specialRequests: { type: String, trim: true, default: '', maxlength: 500 }
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

bookingSchema.virtual('nights').get(function nightsVirtual() {
  if (!this.checkInDate || !this.checkOutDate) return 0;
  return Math.round((this.checkOutDate - this.checkInDate) / MS_PER_DAY);
});

// Indexes support the searches and overlap checks performed by the service layer.
bookingSchema.index({ checkInDate: 1, checkOutDate: 1 });
bookingSchema.index({ room: 1, checkInDate: 1, checkOutDate: 1 });
bookingSchema.index({ guest: 1, createdAt: -1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ guestName: 'text', guestEmail: 'text', roomNumber: 'text' });

// Guard rails at the schema level: they complement service validation.
bookingSchema.pre('validate', function rejectInvalidStay(next) {
  if (this.checkInDate && this.checkOutDate && this.checkOutDate <= this.checkInDate) {
    return next(new Error('Check-out date must be after check-in date'));
  }
  if (
    this.checkInDate &&
    this.checkOutDate &&
    nightsBetween(this.checkInDate, this.checkOutDate) > 365
  ) {
    return next(new Error('A stay cannot be longer than 365 nights'));
  }
  next();
});

module.exports = mongoose.model('Booking', bookingSchema);
