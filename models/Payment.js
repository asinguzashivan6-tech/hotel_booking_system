'use strict';

const mongoose = require('mongoose');

const PAYMENT_METHODS = ['cash', 'card', 'transfer'];
const PAYMENT_STATUSES = ['pending', 'paid', 'void'];

const paymentSchema = new mongoose.Schema(
  {
    reservation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Reservation',
      required: [true, 'Reservation is required'],
      index: true
    },
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0, 'Amount cannot be negative']
    },
    method: {
      type: String,
      enum: { values: PAYMENT_METHODS, message: '{VALUE} is not a valid payment method' },
      default: 'cash'
    },
    status: {
      type: String,
      enum: { values: PAYMENT_STATUSES, message: '{VALUE} is not a valid payment status' },
      default: 'pending',
      index: true
    },
    paidAt: { type: Date, default: null },
    receivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    notes: { type: String, trim: true, default: '', maxlength: 500 }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Payment', paymentSchema);
module.exports.PAYMENT_METHODS = PAYMENT_METHODS;
module.exports.PAYMENT_STATUSES = PAYMENT_STATUSES;
