const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  guestName: { type: String, required: [true, 'Guest name is required'], trim: true },
  bookingRef: { type: String, required: [true, 'Booking reference is required'], unique: true, trim: true, uppercase: true },
  roomType: { type: String, required: [true, 'Room type is required'], enum: ['Standard', 'Deluxe', 'Suite', 'Executive'] },
  email: { type: String, required: [true, 'Email is required'], trim: true, lowercase: true, match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email address'] },
  checkIn: { type: Date, required: [true, 'Check-in date is required'] },
  checkOut: { type: Date, required: [true, 'Check-out date is required'] },
  guests: { type: Number, required: [true, 'Guest count is required'], min: [1, 'At least one guest is required'], max: [10, 'A booking can have at most 10 guests'], validate: { validator: Number.isInteger, message: 'Guest count must be a whole number.' } },
  status: { type: String, enum: ['Confirmed', 'Pending', 'Checked in', 'Checked out', 'Cancelled'], default: 'Confirmed', required: true }
}, { timestamps: true });

bookingSchema.pre('validate', function validateStay(next) {
  if (this.checkIn && this.checkOut && this.checkOut <= this.checkIn) {
    this.invalidate('checkOut', 'Check-out must be after check-in.');
  }
  next();
});

module.exports = mongoose.model('Booking', bookingSchema);
