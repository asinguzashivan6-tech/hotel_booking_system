const express = require('express');
const mongoose = require('mongoose');
const Booking = require('../models/Booking');

const router = express.Router();

function handleError(error, res) {
  if (error.code === 11000) return res.status(409).json({ message: 'A booking with this reference already exists.' });
  if (error.name === 'ValidationError' || error.name === 'CastError') return res.status(400).json({ message: error.message });
  console.error(error);
  return res.status(500).json({ message: 'Server error. Please try again.' });
}

// CREATE: validate booking details and save a new reservation in MongoDB.
router.post('/', async (req, res) => {
  try { return res.status(201).json(await Booking.create(req.body)); }
  catch (error) { return handleError(error, res); }
});

// READ ALL: list reservations, with optional case-insensitive search fields.
router.get('/', async (req, res) => {
  try {
    const search = String(req.query.search || '').trim();
    const safeSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const filter = search ? { $or: ['guestName', 'bookingRef', 'roomType'].map(field => ({ [field]: { $regex: safeSearch, $options: 'i' } })) } : {};
    return res.json(await Booking.find(filter).sort({ createdAt: -1 }));
  } catch (error) { return handleError(error, res); }
});

// READ ONE: fetch a reservation by MongoDB ID or return a clear 404.
router.get('/:id', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid booking ID.' });
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found.' });
    return res.json(booking);
  } catch (error) { return handleError(error, res); }
});

// UPDATE: validate changed fields and return the updated reservation.
router.put('/:id', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid booking ID.' });
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found.' });
    Object.assign(booking, req.body);
    return res.json(await booking.save());
  } catch (error) { return handleError(error, res); }
});

// DELETE: remove the selected reservation and confirm the deleted reference.
router.delete('/:id', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid booking ID.' });
  try {
    const booking = await Booking.findByIdAndDelete(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found.' });
    return res.json({ message: 'Booking deleted successfully.', id: booking._id });
  } catch (error) { return handleError(error, res); }
});

module.exports = router;
