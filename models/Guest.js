'use strict';

const mongoose = require('mongoose');

const guestSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
      minlength: [1, 'First name is required'],
      maxlength: [80, 'First name is too long']
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
      minlength: [1, 'Last name is required'],
      maxlength: [80, 'Last name is too long']
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
      maxlength: [254, 'Email is too long']
    },
    phone: {
      type: String,
      trim: true,
      default: '',
      maxlength: [30, 'Phone is too long']
    },
    address: {
      type: String,
      trim: true,
      default: '',
      maxlength: [250, 'Address is too long']
    },
    idType: {
      type: String,
      trim: true,
      default: '',
      maxlength: [50, 'ID type is too long']
    },
    idNumber: {
      type: String,
      trim: true,
      default: '',
      maxlength: [80, 'ID number is too long']
    },
    nationality: {
      type: String,
      trim: true,
      default: '',
      maxlength: [80, 'Nationality is too long']
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true
    }
  },
  { timestamps: true }
);

guestSchema.virtual('fullName').get(function fullName() {
  return `${this.firstName || ''} ${this.lastName || ''}`.trim();
});

guestSchema.index({ firstName: 'text', lastName: 'text', email: 'text', phone: 'text' });

guestSchema.set('toJSON', { virtuals: true });
guestSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Guest', guestSchema);
