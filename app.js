require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const bookingRoutes = require('./routes/bookings');

const app = express();

app.use(cors());
app.use(express.json());

// Render health check endpoint. The server only listens after MongoDB connects,
// so a 200 here means both the app and its database connection are ready.
app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));

app.use(express.static(path.join(__dirname, 'public')));
app.use('/api/bookings', bookingRoutes);
app.use((req, res) => res.status(404).json({ message: 'Route not found.' }));

module.exports = app;
