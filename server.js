require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const bookingRoutes = require('./routes/bookings');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/studentsdb';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/api/bookings', bookingRoutes);
app.use((req, res) => res.status(404).json({ message: 'Route not found.' }));

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB.');
    app.listen(PORT, () => console.log(`Marriot Hotel booking system running at http://localhost:${PORT}`));
  })
  .catch(error => {
    console.error('Could not connect to MongoDB:', error.message);
    process.exit(1);
  });
