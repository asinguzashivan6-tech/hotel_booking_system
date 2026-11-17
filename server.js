require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const bookingRoutes = require('./routes/bookings');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/marriothoteldb';

app.use(cors());
app.use(express.json());

// Render health check endpoint. The server only listens after MongoDB connects,
// so a 200 here means both the app and its database connection are ready.
app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));

app.use(express.static(path.join(__dirname, 'public')));
app.use('/api/bookings', bookingRoutes);
app.use((req, res) => res.status(404).json({ message: 'Route not found.' }));

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB.');
    app.listen(PORT, '0.0.0.0', () => console.log(`Marriot Hotel booking system running on port ${PORT}`));
  })
  .catch(error => {
    console.error('Could not connect to MongoDB:', error.message);
    process.exit(1);
  });
