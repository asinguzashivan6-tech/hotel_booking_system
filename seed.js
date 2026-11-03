require('dotenv').config();
const mongoose = require('mongoose');
const Booking = require('./models/Booking');

const samples = [
  { guestName: 'Amina Nansubuga', bookingRef: 'MH-2026-001', roomType: 'Deluxe', email: 'amina.nansubuga@example.com', checkIn: '2026-11-12', checkOut: '2026-11-15', guests: 2, status: 'Confirmed' },
  { guestName: 'Brian Okello', bookingRef: 'MH-2026-002', roomType: 'Standard', email: 'brian.okello@example.com', checkIn: '2026-11-14', checkOut: '2026-11-17', guests: 1, status: 'Pending' },
  { guestName: 'Carol Atim', bookingRef: 'MH-2026-003', roomType: 'Suite', email: 'carol.atim@example.com', checkIn: '2026-11-16', checkOut: '2026-11-20', guests: 3, status: 'Confirmed' },
  { guestName: 'Daniel Mugisha', bookingRef: 'MH-2026-004', roomType: 'Executive', email: 'daniel.mugisha@example.com', checkIn: '2026-11-18', checkOut: '2026-11-21', guests: 2, status: 'Checked in' },
  { guestName: 'Esther Namusoke', bookingRef: 'MH-2026-005', roomType: 'Deluxe', email: 'esther.namusoke@example.com', checkIn: '2026-11-21', checkOut: '2026-11-24', guests: 2, status: 'Confirmed' },
  { guestName: 'Farid Kato', bookingRef: 'MH-2026-006', roomType: 'Standard', email: 'farid.kato@example.com', checkIn: '2026-11-22', checkOut: '2026-11-23', guests: 1, status: 'Cancelled' },
  { guestName: 'Grace Akello', bookingRef: 'MH-2026-007', roomType: 'Suite', email: 'grace.akello@example.com', checkIn: '2026-11-25', checkOut: '2026-11-29', guests: 4, status: 'Pending' },
  { guestName: 'Henry Ssemanda', bookingRef: 'MH-2026-008', roomType: 'Executive', email: 'henry.ssemanda@example.com', checkIn: '2026-11-28', checkOut: '2026-12-01', guests: 2, status: 'Confirmed' }
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/studentsdb');
    // Replace the demo booking set so every seed run creates the same eight examples.
    await Booking.deleteMany({});
    const inserted = await Booking.insertMany(samples);
    console.log(`Seeded ${inserted.length} hotel bookings.`);
  } catch (error) {
    console.error('Seed failed:', error.message);
    process.exitCode = 1;
  } finally { await mongoose.disconnect(); }
}

seed();
