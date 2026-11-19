require('dotenv').config();
const mongoose = require('mongoose');
const Booking = require('./models/Booking');
const samples = require('./models/samples');

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/marriothoteldb');
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
