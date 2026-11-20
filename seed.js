'use strict';

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

const User = require('./models/User');
const RoomType = require('./models/RoomType');
const Room = require('./models/Room');
const Guest = require('./models/Guest');
const Reservation = require('./models/Reservation');
const Payment = require('./models/Payment');
const HousekeepingTask = require('./models/HousekeepingTask');
const Feedback = require('./models/Feedback');
const { startOfToday, MS_PER_DAY, calculateReservationTotals } = require('./utils/validation');

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/marriott_hms';

function day(offset) {
  return new Date(startOfToday().getTime() + offset * MS_PER_DAY);
}

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB:', mongoose.connection.name);

  await Promise.all([
    Feedback.deleteMany({}),
    Payment.deleteMany({}),
    HousekeepingTask.deleteMany({}),
    Reservation.deleteMany({}),
    Room.deleteMany({}),
    RoomType.deleteMany({}),
    Guest.deleteMany({}),
    User.deleteMany({})
  ]);
  console.log('Cleared existing MHMS collections.');

  const password = async (plain) => bcrypt.hash(plain, 10);
  const users = await User.insertMany([
    { fullName: 'System Administrator', email: 'admin@marriott.test', passwordHash: await password('Admin@123'), role: 'admin', phone: '+1-555-0100', isActive: true },
    { fullName: 'Front Desk Agent', email: 'frontdesk@marriott.test', passwordHash: await password('Front@123'), role: 'frontdesk', phone: '+1-555-0101', isActive: true },
    { fullName: 'Housekeeping Staff', email: 'housekeeping@marriott.test', passwordHash: await password('House@123'), role: 'housekeeping', phone: '+1-555-0102', isActive: true }
  ]);

  const roomTypes = await RoomType.insertMany([
    { name: 'Standard Room', description: 'Comfortable room for business and leisure stays.', pricePerNight: 120, capacity: 2, amenities: ['Wi-Fi', 'TV', 'Air Conditioning'], bedType: 'Queen' },
    { name: 'Deluxe Room', description: 'Spacious room with premium amenities.', pricePerNight: 180, capacity: 3, amenities: ['Wi-Fi', 'TV', 'Mini Bar', 'City View'], bedType: 'King' },
    { name: 'Suite', description: 'Luxury suite with separate living area.', pricePerNight: 320, capacity: 4, amenities: ['Wi-Fi', 'TV', 'Mini Bar', 'Living Room', 'Balcony'], bedType: 'King + Sofa Bed' }
  ]);
  const rt = (name) => roomTypes.find((r) => r.name === name)._id;

  const rooms = await Room.insertMany([
    { roomNumber: '101', floor: 1, roomType: rt('Standard Room'), status: 'available', notes: 'Near lobby' },
    { roomNumber: '102', floor: 1, roomType: rt('Standard Room'), status: 'available', notes: '' },
    { roomNumber: '201', floor: 2, roomType: rt('Deluxe Room'), status: 'available', notes: 'City view' },
    { roomNumber: '202', floor: 2, roomType: rt('Deluxe Room'), status: 'dirty', notes: 'Awaiting cleaning' },
    { roomNumber: '301', floor: 3, roomType: rt('Suite'), status: 'available', notes: 'Balcony suite' },
    { roomNumber: '302', floor: 3, roomType: rt('Suite'), status: 'maintenance', notes: 'AC servicing' }
  ]);

  const guests = await Guest.insertMany([
    { firstName: 'John', lastName: 'Kamau', email: 'john.kamau@example.com', phone: '+254712345678', address: 'Nairobi, Kenya', idType: 'Passport', idNumber: 'A1234567', nationality: 'Kenyan' },
    { firstName: 'Sarah', lastName: 'Ochieng', email: 'sarah.ochieng@example.com', phone: '+254723456789', address: 'Kisumu, Kenya', idType: 'National ID', idNumber: 'ID998877', nationality: 'Kenyan' },
    { firstName: 'Michael', lastName: 'Otieno', email: 'michael.otieno@example.com', phone: '+254756789012', address: 'Mombasa, Kenya', idType: 'Passport', idNumber: 'B7654321', nationality: 'Kenyan' },
    { firstName: 'Grace', lastName: 'Mutua', email: 'grace.mutua@example.com', phone: '+254745678901', address: 'Machakos, Kenya', idType: 'National ID', idNumber: 'ID445566', nationality: 'Kenyan' }
  ]);

  const byRoom = (num) => rooms.find((r) => r.roomNumber === num);
  const byGuest = (email) => guests.find((g) => g.email === email);
  const typeForRoom = (room) => roomTypes.find((t) => String(t._id) === String(room.roomType));
  const admin = users.find((u) => u.role === 'admin');
  const frontdesk = users.find((u) => u.role === 'frontdesk');
  const housekeeper = users.find((u) => u.role === 'housekeeping');

  function makeReservation({ code, guest, room, inOff, outOff, adults = 2, children = 0, status, services = [], notes = '', createdBy }) {
    const checkInDate = day(inOff);
    const checkOutDate = day(outOff);
    const nights = Math.max(1, Math.round((checkOutDate - checkInDate) / MS_PER_DAY));
    const roomType = typeForRoom(room);
    const totals = calculateReservationTotals({ nights, pricePerNight: roomType.pricePerNight, services });
    return {
      reservationCode: code,
      guest: guest._id,
      room: room._id,
      checkInDate,
      checkOutDate,
      adults,
      children,
      status,
      services,
      subtotal: totals.subtotal,
      tax: totals.tax,
      totalAmount: totals.totalAmount,
      notes,
      createdBy: createdBy?._id || null,
      isDeleted: false
    };
  }

  const reservations = await Reservation.insertMany([
    makeReservation({ code: 'MRT-2026-0001', guest: byGuest('john.kamau@example.com'), room: byRoom('201'), inOff: 1, outOff: 4, adults: 2, children: 0, status: 'booked', services: [{ name: 'Laundry', qty: 2, unitPrice: 8, date: day(2) }], notes: 'Late check-in requested', createdBy: frontdesk }),
    makeReservation({ code: 'MRT-2026-0002', guest: byGuest('sarah.ochieng@example.com'), room: byRoom('301'), inOff: -1, outOff: 2, adults: 2, children: 1, status: 'checked-in', services: [{ name: 'Room Service', qty: 1, unitPrice: 25, date: day(0) }], notes: 'Extra towels', createdBy: frontdesk }),
    makeReservation({ code: 'MRT-2026-0003', guest: byGuest('michael.otieno@example.com'), room: byRoom('101'), inOff: -5, outOff: -2, adults: 1, children: 0, status: 'checked-out', services: [], notes: '', createdBy: admin }),
    makeReservation({ code: 'MRT-2026-0004', guest: byGuest('grace.mutua@example.com'), room: byRoom('102'), inOff: 5, outOff: 7, adults: 2, children: 0, status: 'booked', services: [], notes: 'Quiet room preferred', createdBy: frontdesk }),
    makeReservation({ code: 'MRT-2026-0005', guest: byGuest('john.kamau@example.com'), room: byRoom('201'), inOff: -20, outOff: -18, adults: 2, children: 0, status: 'cancelled', services: [], notes: 'Change of plans', createdBy: frontdesk })
  ]);

  // reflect checked-in occupancy
  await Room.updateOne({ roomNumber: '301' }, { $set: { status: 'occupied' } });

  const checkedOut = reservations.find((r) => r.reservationCode === 'MRT-2026-0003');
  await Payment.insertMany([
    { reservation: checkedOut._id, invoiceNumber: 'INV-2026-0001', amount: checkedOut.totalAmount, method: 'card', status: 'paid', paidAt: day(-2), receivedBy: frontdesk._id, notes: 'Paid at checkout' },
    { reservation: reservations.find((r) => r.reservationCode === 'MRT-2026-0002')._id, invoiceNumber: 'INV-2026-0002', amount: reservations.find((r) => r.reservationCode === 'MRT-2026-0002').totalAmount, method: 'cash', status: 'pending', paidAt: null, receivedBy: frontdesk._id, notes: 'To be settled on checkout' }
  ]);

  await HousekeepingTask.insertMany([
    { room: byRoom('202')._id, assignedTo: housekeeper._id, taskType: 'cleaning', status: 'pending', notes: 'Room marked dirty - needs full cleaning' },
    { room: byRoom('101')._id, assignedTo: housekeeper._id, taskType: 'inspection', status: 'done', notes: 'Post-checkout inspection completed', completedAt: day(-2) },
    { room: byRoom('302')._id, assignedTo: null, taskType: 'maintenance', status: 'in-progress', notes: 'AC servicing in progress' }
  ]);

  await Feedback.insertMany([
    { reservation: checkedOut._id, guest: byGuest('michael.otieno@example.com')._id, rating: 5, comment: 'Excellent stay and smooth checkout process.' }
  ]);

  console.log('Seed complete:');
  console.log(`- Users: ${users.length} (admin@marriott.test/Admin@123, frontdesk@marriott.test/Front@123, housekeeping@marriott.test/House@123)`);
  console.log(`- Room types: ${roomTypes.length}, Rooms: ${rooms.length}, Guests: ${guests.length}`);
  console.log(`- Reservations: ${reservations.length}, Payments: 2, Housekeeping tasks: 3, Feedback: 1`);

  await mongoose.connection.close();
}

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  });
